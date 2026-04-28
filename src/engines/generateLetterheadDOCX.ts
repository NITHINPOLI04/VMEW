import {
    Document,
    Header,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    VerticalAlign,
    ShadingType,
    convertInchesToTwip,
    HeightRule,
} from 'docx';
import { Letterhead } from '../types';

/** Fetch logo from public folder and return as ArrayBuffer */
const fetchLogoBuffer = async (): Promise<ArrayBuffer> => {
    const res = await fetch('/logo.png');
    return res.arrayBuffer();
};

/**
 * Generates a Word (.docx) letterhead template.
 * The letterhead (logo + company details) lives in the Word Header
 * so it repeats on every page — the standard for letterhead templates.
 *
 * Layout mirrors the PDF:
 *  [LOGO]  |  Company Name (large blue bold)
 *          |  GST No (green badge)
 *          |  Address / Workshop (small)
 *          |  Email | Cell (small)
 *  ─────────────────── (blue divider line) ───────────────────
 */
export const generateLetterheadDOCX = async (letterhead: Letterhead): Promise<void> => {
    const logoBuffer = await fetchLogoBuffer();

    // ── Data (mirrors pdfHelpers.ts defaults) ──────────────────────────────
    const companyName   = letterhead.companyName || 'Venkateswara Marine Electrical Works';
    const gstNo         = letterhead.gstNo       || '37AGIPP2674H2Z0';
    const address       = letterhead.address     || 'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03';
    const workshop      = letterhead.workshop    || 'Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11';
    const email         = letterhead.email       || 'vmew10n@gmail.com';
    const cell          = letterhead.cell        || '9848523264';

    // ── Shared style values ────────────────────────────────────────────────
    // Colour constants (matching PDF: blue = [30,64,175], dark = [15,23,42])
    const BLUE_DARK  = '1E40AF'; // company name
    const SLATE_DARK = '0F1726'; // regular text
    const GREEN_TEXT = '166534'; // GST text colour
    const GREEN_BG   = 'DCFCE7'; // GST badge background

    // Convert mm → twip helpers (1 inch = 1440 twip, 1 inch ≈ 25.4 mm)
    const mmToTwip = (mm: number) => Math.round((mm / 25.4) * 1440);

    // Logo column: 27 mm wide (matches pdf logoSize=27)
    const LOGO_COL_WIDTH = mmToTwip(28);
    // Text column fills the rest of A4 content width (210mm - 20mm margins - 28mm logo = ~162mm)
    const TEXT_COL_WIDTH = mmToTwip(162);

    // ── Logo Image ─────────────────────────────────────────────────────────
    const logoImage = new ImageRun({
        data: logoBuffer,
        transformation: { width: 102, height: 102 }, // px, exactly 27mm at 96 DPI
        type: 'png',
    });

    // ── Text column paragraphs ─────────────────────────────────────────────

    // 1. Company name — large blue bold (mirrors fontSize:19 in PDF)
    const companyNamePara = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
            new TextRun({
                text: companyName,
                bold: true,
                size: 38,          // half-points → 19pt matches PDF exactly
                color: BLUE_DARK,
                font: 'Arial',
            }),
        ],
    });

    // 2. GST badge — tight auto-width table with black border and green shading
    const gstTable = new Table({
        width: { size: 100, type: WidthType.AUTO },
        alignment: AlignmentType.CENTER,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: GREEN_BG, type: ShadingType.CLEAR, color: 'auto' },
                        margins: { top: 60, bottom: 60, left: 180, right: 180 },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 0, after: 0 },
                                children: [
                                    new TextRun({ text: 'GST No: ', bold: true, size: 22, color: '000000', font: 'Arial' }),
                                    new TextRun({ text: gstNo,       bold: false, size: 22, color: '000000', font: 'Arial' }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });

    const gstSpacerPara = new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: '' })],
    });

    // 3. Address
    const addressPara = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 16 },
        children: [
            new TextRun({ text: 'Address: ', bold: true,  size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: address,     bold: false, size: 18, color: SLATE_DARK, font: 'Arial' }),
        ],
    });

    // 4. Workshop
    const workshopPara = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 16 },
        children: [
            new TextRun({ text: 'Workshop: ', bold: true,  size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: workshop,     bold: false, size: 18, color: SLATE_DARK, font: 'Arial' }),
        ],
    });

    // 5. Email | Cell
    const contactPara = new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
            new TextRun({ text: 'Email: ',   bold: true,  size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: email,       bold: false, size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: '  |  ',     bold: false, size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: 'Cell: ',    bold: true,  size: 18, color: SLATE_DARK, font: 'Arial' }),
            new TextRun({ text: cell,        bold: false, size: 18, color: SLATE_DARK, font: 'Arial' }),
        ],
    });

    // ── No borders on table cells ──────────────────────────────────────────
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    // ── Two-column table: [Logo] | [Text block] ────────────────────────────
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
        rows: [
            new TableRow({
                height: { value: mmToTwip(30), rule: HeightRule.ATLEAST },
                children: [
                    // Logo cell
                    new TableCell({
                        width: { size: LOGO_COL_WIDTH, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        borders: cellBorders,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [logoImage],
                            }),
                        ],
                    }),
                    // Text cell
                    new TableCell({
                        width: { size: TEXT_COL_WIDTH, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER,
                        borders: cellBorders,
                        children: [
                            companyNamePara,
                            gstTable,
                            gstSpacerPara,
                            addressPara,
                            workshopPara,
                            contactPara,
                        ],
                    }),
                ],
            }),
        ],
    });

    // ── Blue divider line (mirrors pdf.line in pdfHelpers) ─────────────────
    const dividerPara = new Paragraph({
        spacing: { before: 60, after: 60 },
        border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '1E5096', space: 4 },
        },
        children: [],
    });

    // ── Assemble Header ────────────────────────────────────────────────────
    const docHeader = new Header({
        children: [headerTable, dividerPara],
    });

    // ── Body: single empty paragraph so user can start typing ─────────────
    const bodyParagraph = new Paragraph({
        spacing: { before: convertInchesToTwip(0.2) },
        children: [new TextRun({ text: '' })],
    });

    // ── Build Document ─────────────────────────────────────────────────────
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top:    mmToTwip(20),
                            bottom: mmToTwip(20),
                            left:   mmToTwip(20),
                            right:  mmToTwip(20),
                        },
                    },
                },
                headers: { default: docHeader },
                children: [bodyParagraph],
            },
        ],
    });

    // ── Trigger download ───────────────────────────────────────────────────
    const blob = await Packer.toBlob(doc);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'LetterHead_VMEW.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
