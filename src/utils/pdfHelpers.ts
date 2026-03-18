import { jsPDF } from 'jspdf';
import { Letterhead } from '../types';

export const drawLetterhead = (
    pdf: jsPDF,
    margin: number,
    pageWidth: number,
    currentY: number,
    letterhead: Letterhead | null | undefined,
    logoImg: HTMLImageElement
): number => {

    let y = currentY;

    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 55, 'F');

    // Proper top margin so header doesn't touch edge
    const topMargin = Math.max(currentY, margin) + 1;

    // 3. Place the logo on the left using the page margin. Move upward.
    const logoSize = 27;
    const logoWidth = logoSize;
    const logoX = margin;
    const logoY = topMargin - 6;

    pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoSize);

    // Data
    const companyName = letterhead?.companyName || 'Venkateswara Marine Electrical Works';
    const gstNo = letterhead?.gstNo || '37AGIPP2674H2Z0';
    const address = letterhead?.address || 'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03';
    const workshop = letterhead?.workshop || 'Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11 CD NAVY NO 239126';
    const email = letterhead?.email || 'vmew10n@gmail.com';
    const cell = letterhead?.cell || '9848523264';

    interface RenderLine {
        size: number;
        color: [number, number, number];
        parts: { text: string; font: 'bold' | 'normal' }[];
        isGst?: boolean;
    }

    const lines: RenderLine[] = [];

    const addLines = (
        size: number,
        color: [number, number, number],
        label: string,
        value: string,
        isGst: boolean = false
    ) => {
        if (!value) return;

        const singleLineValue = value.replace(/\r?\n/g, ', ').trim();

        const parts: { text: string; font: 'bold' | 'normal' }[] = [];

        if (label) parts.push({ text: label, font: 'bold' });

        parts.push({ text: singleLineValue, font: 'normal' });

        lines.push({ size, color, parts, isGst });
    };

    // Company name
    if (companyName) {
        companyName
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .forEach(part => {
                lines.push({
                    size: 19,
                    color: [30, 64, 175],
                    parts: [{ text: part, font: 'bold' }]
                });
            });
    }

    // Other lines
    // Add true for the isGst flag
    addLines(11, [15, 23, 42], 'GST No: ', gstNo, true);
    addLines(9, [15, 23, 42], 'Address: ', address);
    addLines(9, [15, 23, 42], 'Workshop: ', workshop);

    if (email || cell) {
        lines.push({
            size: 9,
            color: [15, 23, 42],
            parts: [
                { text: 'Email: ', font: 'bold' },
                { text: email, font: 'normal' },
                { text: ' | ', font: 'normal' },
                { text: 'Cell: ', font: 'bold' },
                { text: cell, font: 'normal' }
            ]
        });
    }

    // Compact line spacing
    const lineSpacing = 5;

    // 3. The top of the logo should align visually with the company title line
    // The company name size is 15. The baseline offset of approx 5 aligns the tops.
    let textY = logoY + 8;

    // Limit width strictly to page margins
    const maxTextWidth = pageWidth - (margin * 2);

    lines.forEach(line => {

        pdf.setFontSize(line.size);
        pdf.setTextColor(line.color[0], line.color[1], line.color[2]);

        let totalWidth = 0;

        line.parts.forEach(p => {
            pdf.setFont('helvetica', p.font);
            totalWidth += pdf.getTextWidth(p.text);
        });

        if (totalWidth > maxTextWidth) {
            const scaleFactor = maxTextWidth / totalWidth;
            line.size = line.size * scaleFactor * 0.98;
            pdf.setFontSize(line.size);
            totalWidth = 0;
            line.parts.forEach(p => {
                pdf.setFont('helvetica', p.font);
                totalWidth += pdf.getTextWidth(p.text);
            });
        }

        const leftBoundary = logoX + logoWidth + 10;
        const rightBoundary = pageWidth - margin;
        const availableWidth = rightBoundary - leftBoundary;

        let currentX = leftBoundary + (availableWidth - totalWidth) / 2;

        if (line.isGst) {
            // Draw a rounded rectangle for GST
            const paddingX = 4;
            const boxWidth = totalWidth + (paddingX * 2);
            // Given font size is roughly 11, line height is ~4
            const boxHeight = 6.5;

            // Add spacing before GST box
            textY += 1.5;

            const boxX = currentX - paddingX;
            const boxY = textY - 4.5;

            // Lighter green
            pdf.setFillColor(220, 252, 231);
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2); // Thinner border
            pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

            // Draw text
            line.parts.forEach(p => {
                pdf.setFont('helvetica', p.font);
                pdf.text(p.text, currentX, textY);
                currentX += pdf.getTextWidth(p.text);
            });

            // Add spacing after GST box
            textY += lineSpacing + 2;
        } else {
            line.parts.forEach(p => {
                pdf.setFont('helvetica', p.font);
                pdf.text(p.text, currentX, textY);
                currentX += pdf.getTextWidth(p.text);
            });
            textY += lineSpacing;
        }

    });

    // 4. Header Height Limit: must not exceed 50 units.
    const logoBottom = logoY + logoSize;
    const textBottom = textY;
    const maxHeaderHeight = 50;
    const headerBottom = Math.min(Math.max(logoBottom, textBottom), maxHeaderHeight);

    // 5. Separator Line immediately below letterhead
    const spacingBeforeSeparator = 3; // small gap
    const separatorY = headerBottom + spacingBeforeSeparator;

    pdf.setDrawColor(30, 80, 150);
    pdf.setLineWidth(0.6);

    pdf.line(margin, separatorY, pageWidth - margin, separatorY);

    const spacingAfterSeparator = 6;
    y = separatorY + spacingAfterSeparator;

    return y;
};