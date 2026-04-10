import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawLetterhead } from '../utils/pdfHelpers';
import { Letterhead, DefaultInfo } from '../types';

// ─── Image Loader ────────────────────────────────────────────────────────────

/**
 * Loads one or more images in parallel and returns them as HTMLImageElements.
 * Replaces the repeated img.onload boilerplate in each preview file.
 */
export const loadImages = (srcs: string[]): Promise<HTMLImageElement[]> => {
  return Promise.all(
    srcs.map(
      src =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = reject;
        })
    )
  );
};

// ─── Safe Text Renderer ──────────────────────────────────────────────────────

/**
 * Renders text safely using splitTextToSize to prevent jsPDF character-spacing bugs.
 * Always use this instead of pdf.text(text, x, y, { maxWidth }) to avoid
 * letters being spaced out like "L E D F l o o d L i g h t".
 * Returns the Y position after the last line.
 */
export const drawWrappedText = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 5
): number => {
  if (!text) return y;
  const lines = pdf.splitTextToSize(String(text), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
};

// ─── PDF Constants ────────────────────────────────────────────────────────────

export const PDF_MARGIN = 15;
export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

// ─── Header Components ────────────────────────────────────────────────────────

/**
 * Draws the letterhead and then a centered rounded-rect document title box
 * (e.g. "INVOICE", "QUOTATION", "DELIVERY CHALLAN", "PURCHASE ORDER").
 * Returns the Y position immediately after the title box.
 */
export const drawDocTitle = (
  pdf: jsPDF,
  pageWidth: number,
  letterhead: Letterhead | null | undefined,
  img: HTMLImageElement,
  docTitle: string,
  currentY: number
): number => {
  const margin = PDF_MARGIN;
  let y = drawLetterhead(pdf, margin, pageWidth, currentY, letterhead, img);

  const titleSpacingBottom = 5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const titleWidth = pdf.getTextWidth(docTitle);
  const boxHeight = 5.5;

  y += 2;

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(
    pageWidth / 2 - titleWidth / 2 - 6,
    y - 4,
    titleWidth + 12,
    boxHeight,
    1.5,
    1.5,
    'FD'
  );

  pdf.setTextColor(0, 0, 0);
  pdf.text(docTitle, pageWidth / 2, y, { align: 'center' });

  const boxBottom = y - 4 + boxHeight;
  y = boxBottom + titleSpacingBottom + 3;

  return y;
};

/**
 * Draws the document metadata row:
 *   Left side : primary label (e.g. "Invoice No: ") + value, then "Date: " + date below
 *   Right side: PAN No + MSME No
 * Returns the Y position 12mm below (ready for buyer/supplier section).
 */
export const drawDocMetaRow = (
  pdf: jsPDF,
  margin: number,
  pageWidth: number,
  y: number,
  primaryLabel: string,
  primaryValue: string,
  dateValue: string,
  panValue: string,
  msmeValue: string
): number => {
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);

  pdf.setFont('helvetica', 'bold');
  pdf.text(primaryLabel, margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(primaryValue, margin + pdf.getTextWidth(primaryLabel), y);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Date: ', margin, y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateValue, margin + pdf.getTextWidth('Date: '), y + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.text(panValue, pageWidth - margin, y, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text('PAN No: ', pageWidth - margin - pdf.getTextWidth(panValue), y, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.text(msmeValue, pageWidth - margin, y + 5, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.text('MSME No: ', pageWidth - margin - pdf.getTextWidth(msmeValue), y + 5, {
    align: 'right'
  });

  return y + 12;
};

/**
 * Draws the two-column detail section:
 *   Left  : e.g. "Buyer Details" or "To (Supplier Details)" with address lines
 *   Right : e.g. vessel, PO no, or subject/reference
 * Returns the Y position after both columns (+ small gap).
 */
export const drawTwoColumnDetails = (
  pdf: jsPDF,
  margin: number,
  contentWidth: number,
  y: number,
  leftTitle: string,
  leftLines: { label: string; value: string; isAddressLine?: boolean }[],
  rightLines: { label: string; value: string; wrap?: boolean }[],
  leftLabelOffset: number = 15,
  rightLabelOffset: number = 22
): number => {
  const leftBoxWidth = contentWidth * 0.48;
  const boxGap = contentWidth * 0.04;
  const rightBoxX = margin + leftBoxWidth + boxGap;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(leftTitle, margin, y);

  let buyerY = y + 6;
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);

  leftLines.forEach(({ label, value, isAddressLine }) => {
    const labelX = margin;
    const valueX = labelX + leftLabelOffset;
    if (!isAddressLine && label) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, labelX, buyerY);
    }
    if (value) {
      pdf.setFont('helvetica', 'normal');
      const maxW = leftBoxWidth - leftLabelOffset - 2;
      const lines = pdf.splitTextToSize(String(value), maxW);
      lines.forEach((line: string) => {
        pdf.text(line, valueX, buyerY);
        buyerY += 5;
      });
    } else {
      buyerY += 5;
    }
  });

  let rightY = y + 6;
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);

  rightLines.forEach(({ label, value, wrap }) => {
    const labelX = rightBoxX;
    const valueX = labelX + rightLabelOffset;
    const maxW = contentWidth * 0.48 - rightLabelOffset;
    if (label) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, labelX, rightY);
    }
    if (value) {
      pdf.setFont('helvetica', 'normal');
      if (wrap || String(value).length > 30) {
        const splitText = pdf.splitTextToSize(String(value), maxW);
        splitText.forEach((line: string) => {
          pdf.text(line, valueX, rightY);
          rightY += 5;
        });
      } else {
        pdf.text(String(value), valueX, rightY);
        rightY += 5;
      }
    } else {
      rightY += 5;
    }
  });

  return Math.max(buyerY, rightY) + 2;
};

// ─── Table ────────────────────────────────────────────────────────────────────

/**
 * Renders the items table using jspdf-autotable with identical style settings
 * used by all 4 document types. Each caller provides its own columnStyles.
 */
export const drawItemsTable = (
  pdf: jsPDF,
  tableHeaders: string[],
  tableData: string[][],
  columnStyles: Record<number, object>,
  startY: number,
  margin: number,
  headerEndY: number,
  onRedrawHeader: (currentY: number) => void,
  customStyles?: any
): void => {
  autoTable(pdf, {
    head: [tableHeaders],
    body: tableData,
    startY,
    margin: { top: headerEndY, left: margin, right: margin, bottom: 20 },
    didDrawPage: (data: any) => {
      if (data.pageNumber > 1) {
        onRedrawHeader(10);
        data.settings.margin.top = headerEndY;
      }
    },
    tableWidth: 'auto',
    styles: {
      fontSize: 8,
      cellPadding: 0.8,
      textColor: [15, 23, 42],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      font: 'helvetica',
      overflow: 'linebreak',
      halign: 'left',
      ...customStyles
    },
    headStyles: {
      fillColor: [69, 130, 181],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [247, 248, 250]
    },
    columnStyles,
    didParseCell: (data: any) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 245, 255];
      }
    },
    theme: 'grid'
  });
};

// ─── Totals Section ───────────────────────────────────────────────────────────

/**
 * Draws the totals box (Total Taxable Amount, SGST/CGST or IGST, Grand Total).
 * Identical across Invoice, Quotation, and Purchase Order.
 * Returns the Y position directly below the box.
 */
export const drawTotalsBox = (
  pdf: jsPDF,
  pageWidth: number,
  y: number,
  taxType: string,
  totalTaxableAmount: number,
  totalSgst: number,
  totalCgst: number,
  totalIgst: number,
  grandTotal: number,
  discountEnabled?: boolean,
  discountPercentage?: number,
  discountAmount?: number,
  discountType?: string
): number => {
  const margin = PDF_MARGIN;
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsBoxHeight = (taxType === 'igst' ? 23 : 28) + (discountEnabled ? 5 : 0);

  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(totalsBoxX, y, totalsBoxWidth, totalsBoxHeight, 3, 3, 'FD');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);

  let lineY = y + 5;
  const labelX = totalsBoxX + 4;
  const valueX = totalsBoxX + totalsBoxWidth - 4;

  pdf.text('Subtotal:', labelX, lineY);
  pdf.text(`${totalTaxableAmount.toFixed(2)}`, valueX, lineY, { align: 'right' });
  lineY += 5;

  if (discountEnabled && discountAmount !== undefined) {
    pdf.setTextColor(220, 38, 38); // text-red-600 logic
    const effectiveType = discountType || 'percentage';
    const discountLabel = effectiveType === 'fixed'
      ? 'Discount (Fixed):'
      : `Discount (${discountPercentage || 0}%):`;
    pdf.text(discountLabel, labelX, lineY);
    pdf.text(`-${discountAmount.toFixed(2)}`, valueX, lineY, { align: 'right' });
    pdf.setTextColor(15, 23, 42); // reset text color
    lineY += 5;
  }

  if (taxType === 'igst') {
    pdf.text('Total IGST:', labelX, lineY);
    pdf.text(`${totalIgst.toFixed(2)}`, valueX, lineY, { align: 'right' });
    lineY += 5;
  } else {
    pdf.text('Total SGST:', labelX, lineY);
    pdf.text(`${totalSgst.toFixed(2)}`, valueX, lineY, { align: 'right' });
    lineY += 5;

    pdf.text('Total CGST:', labelX, lineY);
    pdf.text(`${totalCgst.toFixed(2)}`, valueX, lineY, { align: 'right' });
    lineY += 5;
  }

  // Grand Total
  const grandTotalY = lineY + 0.5;
  const grandTotalHeight = 6.5;

  pdf.setDrawColor(150, 200, 255);
  pdf.setFillColor(240, 248, 255);
  (pdf as any).setLineDash([1, 1], 0);
  pdf.roundedRect(totalsBoxX + 2, grandTotalY - 1.5, totalsBoxWidth - 4, grandTotalHeight, 2, 2, 'FD');
  (pdf as any).setLineDash([], 0);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Grand Total:', labelX + 2, grandTotalY + 2.8);
  pdf.text(`${grandTotal.toFixed(2)}`, valueX - 2, grandTotalY + 2.8, { align: 'right' });

  pdf.setFont('helvetica', 'normal');

  return y + totalsBoxHeight;
};

// ─── Amount in Words ──────────────────────────────────────────────────────────

/**
 * Draws the "Amount in Words:" separator line + text.
 * Returns the Y position immediately after the last line of text.
 */
export const drawAmountInWords = (
  pdf: jsPDF,
  margin: number,
  pageWidth: number,
  contentWidth: number,
  totalsEndY: number,
  amountWordsValue: string
): number => {
  const amountWordsLabel = 'Amount in Words:';
  const fullText = `${amountWordsLabel} ${amountWordsValue}`;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const amountWordsLines = pdf.splitTextToSize(fullText, contentWidth);

  const amountWordsY = totalsEndY + 8;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, amountWordsY, pageWidth - margin, amountWordsY);

  let wordsY = amountWordsY + 6;
  const lblWidth = pdf.getTextWidth(amountWordsLabel) + 4;

  amountWordsLines.forEach((line: string, index: number) => {
    if (index === 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(amountWordsLabel, margin, wordsY);
      pdf.setFont('helvetica', 'italic');
      const valuePart = line.startsWith(amountWordsLabel)
        ? line.substring(amountWordsLabel.length).trim()
        : line;
      pdf.text(valuePart, margin + lblWidth, wordsY);
    } else {
      pdf.setFont('helvetica', 'italic');
      pdf.text(line, margin, wordsY);
    }
    wordsY += 5;
  });

  return wordsY + 2;
};

// ─── Bank Details + Terms & Conditions ───────────────────────────────────────

/**
 * Draws the two-column bottom section:
 *   Left  : Bank Details box (+ optional QR code)
 *   Right : Terms & Conditions box
 * Returns the required height so callers can check for page overflow.
 */
export const calcBankTermsHeight = (
  pdf: jsPDF,
  bankDetails: { label: string; value: string }[],
  terms: string[],
  contentWidth: number
): number => {
  const rightBoxBottomWidth = contentWidth * 0.48;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  let totalTermsLines = 0;
  terms.forEach(term => {
    const lines = pdf.splitTextToSize(term, rightBoxBottomWidth - 8);
    totalTermsLines += lines.length;
  });
  const bankBoxHeight = bankDetails.length * 4 + 6;
  const termsBoxHeight = (totalTermsLines + terms.length) * 3 + 6;
  return Math.max(bankBoxHeight, termsBoxHeight, 20);
};

export const drawBankAndTerms = (
  pdf: jsPDF,
  margin: number,
  contentWidth: number,
  bottomY: number,
  maxBoxHeight: number,
  bankDetails: { label: string; value: string }[],
  terms: string[],
  qrImg?: HTMLImageElement
): void => {
  const leftBoxBottomWidth = contentWidth * 0.48;
  const rightBoxBottomWidth = contentWidth * 0.48;
  const boxGap = contentWidth * 0.04;

  // Bank Details box
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin, bottomY, leftBoxBottomWidth, maxBoxHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Bank Details', margin + 4, bottomY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  let bankY = bottomY + 12;
  bankDetails.forEach(({ label, value }) => {
    if (bankY < bottomY + maxBoxHeight - 2) {
      const lX = margin + 4;
      const vX = lX + pdf.getTextWidth(label) + 1;
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, lX, bankY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, vX, bankY);
      bankY += 5;
    }
  });

  // QR code (optional)
  if (qrImg) {
    const qrCodeWidth = 19;
    const qrCodeHeight = 19;
    const qrCodeX = margin + leftBoxBottomWidth - qrCodeWidth - 3;
    const qrCodeY = bottomY + 5;
    pdf.addImage(qrImg, 'PNG', qrCodeX, qrCodeY, qrCodeWidth, qrCodeHeight);
  }

  // Terms & Conditions box
  const rightBoxBottomX = margin + leftBoxBottomWidth + boxGap;
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(rightBoxBottomX, bottomY, rightBoxBottomWidth, maxBoxHeight, 3, 3, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Terms & Conditions', rightBoxBottomX + 4, bottomY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  let termY = bottomY + 12;
  terms.forEach((term, index) => {
    const termText = `${index + 1}. ${term}`;
    const termLines = pdf.splitTextToSize(termText, rightBoxBottomWidth - 8);
    termLines.forEach((line: string) => {
      if (termY < bottomY + maxBoxHeight - 2) {
        pdf.text(line, rightBoxBottomX + 4, termY);
        termY += 4;
      }
    });
  });
};

// ─── Page Numbers ─────────────────────────────────────────────────────────────

/**
 * Adds "Page N of M" footer to every page in the document.
 */
export const drawPageNumbers = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void => {
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right'
    });
  }
};

// ─── Bank Details Builder ─────────────────────────────────────────────────────

/**
 * Returns the standard bank details array from a DefaultInfo object.
 */
export const buildBankDetails = (
  defaultInfo: DefaultInfo | null | undefined
): { label: string; value: string }[] => [
    { label: 'Bank Name:', value: defaultInfo?.bankName || 'SBI' },
    { label: 'A/C No:', value: defaultInfo?.accountNo || '30379757750' },
    { label: 'IFSC Code:', value: defaultInfo?.ifscCode || 'SBIN0015580' },
    { label: 'Branch:', value: defaultInfo?.branch || 'ASILMETTA' }
  ];

/**
 * Draws the "Authorized Signatory" box with proper text wrapping for long company names.
 * Ensures "For [Company Name]" is at the top and "Authorized Signatory" is at the bottom right.
 */
export const drawSignatoryBox = (
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  companyName: string
): void => {
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(x, y, width, height, 3, 3, 'FD');

  const padding = 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(30, 64, 175);

  const fullText = `For ${companyName}`;
  const lines = pdf.splitTextToSize(fullText, width - padding * 2);
  
  let currentY = y + 6;
  lines.forEach((line: string) => {
    pdf.text(line, x + padding, currentY);
    currentY += 4;
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Authorized Signatory', x + width - padding, y + height - 4, { align: 'right' });
};
