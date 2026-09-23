import { jsPDF } from 'jspdf';
import { Invoice, Letterhead, DefaultInfo } from '../types';
import { convertToWords } from '../utils/numberToWords';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-Rs. ${abs}` : `Rs. ${abs}`;
};

const dateFmt = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Colors (matching reference HTML) ─────────────────────────────────────────

const NAVY: [number, number, number] = [27, 45, 79];
const TEAL: [number, number, number] = [29, 158, 117];
const BLUE: [number, number, number] = [24, 95, 165];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MID: [number, number, number] = [51, 65, 85];
const TEXT_SOFT: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];
const BG: [number, number, number] = [248, 250, 252];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [133, 100, 4];
const LIGHT_TEAL_BG: [number, number, number] = [225, 245, 238];
const LIGHT_BLUE_BG: [number, number, number] = [230, 241, 251];
const RED_BG: [number, number, number] = [255, 245, 245];

// ─── Constants ────────────────────────────────────────────────────────────────

const BODY_MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - BODY_MARGIN * 2;

// ─── Drawing Utilities ────────────────────────────────────────────────────────

const setLabel = (pdf: jsPDF, text: string, x: number, y: number, size: number, color: [number, number, number], style: 'normal' | 'bold' = 'normal') => {
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
  pdf.setFont('helvetica', style);
  pdf.text(text, x, y);
};

const borderedBox = (pdf: jsPDF, x: number, y: number, w: number, h: number, r: number = 2, fill?: [number, number, number]) => {
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.3);
  if (fill) {
    pdf.setFillColor(...fill);
    pdf.roundedRect(x, y, w, h, r, r, 'FD');
  } else {
    pdf.roundedRect(x, y, w, h, r, r, 'S');
  }
};

const pageBreakCheck = (pdf: jsPDF, y: number, needed: number): number => {
  if (y + needed > PAGE_H - 20) {
    pdf.addPage();
    return 15;
  }
  return y;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export const generatePaymentReceiptPDF = async (
  invoice: Invoice,
  letterhead?: Letterhead | null,
  defaultInfo?: DefaultInfo | null
): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica');

  const payments = invoice.payments || [];
  const grossReceived = payments.reduce((s, p) => s + p.grossAmount, 0);
  const totalPermanent = payments.reduce((s, p) => s + p.totalPermanentDeductions, 0);
  const totalRecoverable = payments.reduce((s, p) => s + p.totalRecoverableDeductions, 0);
  const netReceived = payments.reduce((s, p) => s + p.netAmount, 0);
  const balanceDue = invoice.grandTotal - netReceived;
  const isComplete = invoice.paymentStatus === 'Payment Complete';
  const receiptNo = `PR-${invoice.invoiceNumber.replace(/[/\\]/g, '-')}`;

  const companyName = letterhead?.companyName || 'Venkateswara Marine Electrical Works';
  const gstNo = letterhead?.gstNo || '37AGIPP2674H2Z0';
  const address = letterhead?.address || 'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03';
  const workshop = letterhead?.workshop || '';
  const email = letterhead?.email || 'vmew10n@gmail.com';
  const cell = letterhead?.cell || '9848523264';
  const panNo = defaultInfo?.panNo || 'AGIPP2674H';
  const msmeNo = defaultInfo?.msmeNo || 'UDYAM-AP-10-000719';

  let y = 0;

  // ─── Watermark ──────────────────────────────────────────────────────
  pdf.saveGraphicsState();
  pdf.setFontSize(72);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...TEAL);
  (pdf as any).setGState(new (pdf as any).GState({ opacity: 0.04 }));
  const cx = PAGE_W / 2;
  const cy = PAGE_H / 2;
  const angle = -35 * (Math.PI / 180);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  (pdf as any).internal.write(
    `${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${(cx - cx * cos + cy * sin).toFixed(2)} ${(cy - cx * sin - cy * cos).toFixed(2)} cm`
  );
  const watermarkText = 'RECEIVED';
  const wmW = pdf.getTextWidth(watermarkText);
  pdf.text(watermarkText, cx - wmW / 2, cy + 10);
  pdf.restoreGraphicsState();

  // ─── Header (Navy Background) ───────────────────────────────────────
  const headerH = 38;
  pdf.setFillColor(...NAVY);
  pdf.rect(0, y, PAGE_W, headerH, 'F');

  const hPad = 20;
  let hY = y + 10;

  // Left — Company name
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(companyName, hPad, hY);
  hY += 4.5;

  // GST + PAN
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(180, 190, 210);
  pdf.text(`GST No: ${gstNo}  ·  PAN: ${panNo}`, hPad, hY);
  hY += 4;

  // Address
  pdf.setFontSize(7.5);
  pdf.setTextColor(160, 170, 190);
  const addrLines = pdf.splitTextToSize(address, 100);
  addrLines.forEach((line: string) => {
    pdf.text(line, hPad, hY);
    hY += 3.2;
  });
  if (workshop) {
    pdf.text(`Workshop: ${workshop}`, hPad, hY);
    hY += 3.2;
  }
  pdf.text(`Email: ${email}  ·  Cell: ${cell}`, hPad, hY);

  // Right — PAYMENT RECEIPT
  const rX = PAGE_W - hPad;
  let rY = y + 10;
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('PAYMENT RECEIPT', rX, rY, { align: 'right' });
  rY += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(180, 190, 210);
  pdf.text(`Receipt No: ${receiptNo}`, rX, rY, { align: 'right' });
  rY += 3.8;
  pdf.text(`Generated: ${dateFmt(new Date())}`, rX, rY, { align: 'right' });
  rY += 5;

  // Status stamp
  const stampText = isComplete ? 'PAYMENT COMPLETE' : 'PARTIALLY PAID';
  const stampColor: [number, number, number] = isComplete ? TEAL : [186, 117, 23];
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  const stampW = pdf.getTextWidth(stampText) + 10;
  const stampH = 5.5;
  const stampX = rX - stampW;
  const stampY = rY - 3.5;

  (pdf as any).setGState(new (pdf as any).GState({ opacity: 0.2 }));
  pdf.setFillColor(...stampColor);
  pdf.roundedRect(stampX, stampY, stampW, stampH, 2.5, 2.5, 'F');
  (pdf as any).setGState(new (pdf as any).GState({ opacity: 1 }));
  pdf.setDrawColor(...stampColor);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(stampX, stampY, stampW, stampH, 2.5, 2.5, 'S');
  pdf.setTextColor(...stampColor);
  pdf.text(stampText, stampX + stampW / 2, stampY + 3.8, { align: 'center' });

  y += headerH;

  // ─── Accent Bar ─────────────────────────────────────────────────────
  const barH = 1.5;
  pdf.setFillColor(...TEAL);
  pdf.rect(0, y, PAGE_W / 2, barH, 'F');
  pdf.setFillColor(...BLUE);
  pdf.rect(PAGE_W / 2, y, PAGE_W / 2, barH, 'F');
  y += barH + 8;

  // ─── Ref Grid (Two Columns) ─────────────────────────────────────────
  const refH = 42;
  const colW = CONTENT_W * 0.5;
  const leftX = BODY_MARGIN;
  const rightColX = BODY_MARGIN + colW;

  borderedBox(pdf, leftX, y, CONTENT_W, refH);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.3);
  pdf.line(rightColX, y, rightColX, y + refH);

  // Left — Invoice Reference
  let refY = y + 6;
  setLabel(pdf, 'INVOICE REFERENCE', leftX + 5, refY, 7, TEXT_SOFT, 'bold');
  refY += 3;
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.15);
  pdf.line(leftX + 5, refY, leftX + colW - 5, refY);
  refY += 5;
  setLabel(pdf, 'Invoice Number', leftX + 5, refY, 7, TEXT_SOFT);
  refY += 3.5;
  setLabel(pdf, invoice.invoiceNumber, leftX + 5, refY, 9, TEXT_DARK, 'bold');
  refY += 5;
  setLabel(pdf, 'Invoice Date', leftX + 5, refY, 7, TEXT_SOFT);
  refY += 3.5;
  setLabel(pdf, dateFmt(invoice.date), leftX + 5, refY, 9, TEXT_DARK, 'bold');
  refY += 5;
  setLabel(pdf, 'Invoice Total', leftX + 5, refY, 7, TEXT_SOFT);
  refY += 3.5;
  setLabel(pdf, fmt(invoice.grandTotal), leftX + 5, refY, 9, TEXT_DARK, 'bold');

  // Right — Buyer Details
  let buyY = y + 6;
  setLabel(pdf, 'BUYER DETAILS', rightColX + 5, buyY, 7, TEXT_SOFT, 'bold');
  buyY += 3;
  pdf.setDrawColor(...BORDER);
  pdf.line(rightColX + 5, buyY, rightColX + colW - 5, buyY);
  buyY += 5;
  setLabel(pdf, 'Company', rightColX + 5, buyY, 7, TEXT_SOFT);
  buyY += 3.5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...TEXT_DARK);
  const buyerNameLines = pdf.splitTextToSize(invoice.buyerName, colW - 12);
  buyerNameLines.forEach((line: string) => {
    pdf.text(line, rightColX + 5, buyY);
    buyY += 3.5;
  });
  buyY += 1.5;
  setLabel(pdf, 'GST Number', rightColX + 5, buyY, 7, TEXT_SOFT);
  buyY += 3.5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(invoice.buyerGst || '—', rightColX + 5, buyY);
  buyY += 5;
  setLabel(pdf, 'Receipt Date', rightColX + 5, buyY, 7, TEXT_SOFT);
  buyY += 3.5;
  setLabel(pdf, dateFmt(new Date()), rightColX + 5, buyY, 9, TEXT_DARK, 'bold');

  y += refH + 8;

  // ─── Payment Summary ────────────────────────────────────────────────
  y = pageBreakCheck(pdf, y, 60);

  setLabel(pdf, 'PAYMENT SUMMARY', BODY_MARGIN, y, 8, NAVY, 'bold');
  y += 2;
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.5);
  pdf.line(BODY_MARGIN, y, BODY_MARGIN + 38, y);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.15);
  pdf.line(BODY_MARGIN + 38, y, BODY_MARGIN + CONTENT_W, y);
  y += 5;

  type SumRow = { label: string; value: string; color?: [number, number, number]; bg?: [number, number, number]; bold?: boolean; badge?: string; badgeColor?: [number, number, number]; badgeBg?: [number, number, number] };
  const summaryRows: SumRow[] = [
    { label: 'Invoice Total', value: fmt(invoice.grandTotal) },
    { label: 'Gross Amount Received', value: fmt(grossReceived) },
  ];

  // Permanent deductions breakdown
  if (totalPermanent > 0) {
    const permAgg: Record<string, number> = {};
    payments.forEach(p => {
      if (p.ldRecovery > 0) permAgg['LD Recovery'] = (permAgg['LD Recovery'] || 0) + p.ldRecovery;
      if (p.itTds > 0) permAgg['IT-TDS Deduction'] = (permAgg['IT-TDS Deduction'] || 0) + p.itTds;
      if (p.otherPermanent > 0) {
        const key = `Other${p.otherPermanentNote ? ` (${p.otherPermanentNote})` : ''}`;
        permAgg[key] = (permAgg[key] || 0) + p.otherPermanent;
      }
    });
    Object.entries(permAgg).forEach(([name, amount]) => {
      summaryRows.push({ label: name, value: `-${fmt(amount)}`, color: RED, bg: RED_BG, badge: 'Permanent', badgeColor: RED, badgeBg: [252, 235, 235] });
    });
  }

  // Recoverable deductions breakdown
  if (totalRecoverable > 0) {
    const recAgg: Record<string, number> = {};
    payments.forEach(p => {
      if (p.gstTds > 0) recAgg['GST-TDS'] = (recAgg['GST-TDS'] || 0) + p.gstTds;
      if (p.gstRetention > 0) recAgg['GST Retention'] = (recAgg['GST Retention'] || 0) + p.gstRetention;
      if (p.securityDeposit > 0) recAgg['Security Deposit'] = (recAgg['Security Deposit'] || 0) + p.securityDeposit;
      if (p.bankGuarantee > 0) recAgg['Bank Guarantee'] = (recAgg['Bank Guarantee'] || 0) + p.bankGuarantee;
      if (p.otherRecoverable > 0) {
        const key = `Other${p.otherRecoverableNote ? ` (${p.otherRecoverableNote})` : ''}`;
        recAgg[key] = (recAgg[key] || 0) + p.otherRecoverable;
      }
    });
    Object.entries(recAgg).forEach(([name, amount]) => {
      summaryRows.push({ label: name, value: `-${fmt(amount)}`, color: AMBER, bg: [255, 252, 240], badge: 'Recoverable', badgeColor: AMBER, badgeBg: [255, 243, 205] });
    });
  }

  const totalDeductions = totalPermanent + totalRecoverable;
  if (totalDeductions > 0) {
    summaryRows.push({ label: 'Total Deductions', value: `-${fmt(totalDeductions)}`, color: RED });
  }

  summaryRows.push({ label: 'Net Amount Received', value: fmt(netReceived), color: TEAL, bg: LIGHT_TEAL_BG, bold: true });

  if (balanceDue > 0.01) {
    summaryRows.push({ label: 'Balance Due', value: fmt(balanceDue), color: [186, 117, 23], bold: true });
  }

  // Draw summary box
  const rowH = 7;
  const summaryBoxH = summaryRows.length * rowH + 1;
  borderedBox(pdf, BODY_MARGIN, y, CONTENT_W, summaryBoxH, 2, BG);

  summaryRows.forEach((row, idx) => {
    const rowY = y + idx * rowH;
    if (row.bg) {
      pdf.setFillColor(...row.bg);
      pdf.rect(BODY_MARGIN + 0.3, rowY + 0.3, CONTENT_W - 0.6, rowH - 0.3, 'F');
    }
    if (idx < summaryRows.length - 1) {
      pdf.setDrawColor(...BORDER);
      pdf.setLineWidth(0.15);
      pdf.line(BODY_MARGIN, rowY + rowH, BODY_MARGIN + CONTENT_W, rowY + rowH);
    }

    const textY = rowY + 5;
    const fontSize = row.bold ? 10 : 9;
    const fontStyle = row.bold ? 'bold' as const : 'normal' as const;

    // Label text
    setLabel(pdf, row.label, BODY_MARGIN + 5, textY, fontSize, row.bold ? (row.color || TEXT_DARK) : TEXT_MID, fontStyle);

    // Badge
    if (row.badge && row.badgeBg && row.badgeColor) {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      const lblW = pdf.getTextWidth(row.label);
      const badgeX = BODY_MARGIN + 5 + lblW + 3;
      pdf.setFontSize(6);
      const badgeTextW = pdf.getTextWidth(row.badge);
      pdf.setFillColor(...row.badgeBg);
      pdf.roundedRect(badgeX, textY - 3, badgeTextW + 5, 4, 1.5, 1.5, 'F');
      setLabel(pdf, row.badge, badgeX + 2.5, textY - 0.5, 6, row.badgeColor, 'bold');
    }

    // Value (right-aligned)
    const valColor = row.color || TEXT_DARK;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...valColor);
    pdf.text(row.value, BODY_MARGIN + CONTENT_W - 5, textY, { align: 'right' });
  });

  y += summaryBoxH + 8;

  // ─── Payment Entries ────────────────────────────────────────────────
  y = pageBreakCheck(pdf, y, 20);

  setLabel(pdf, `PAYMENT ENTRIES (${payments.length})`, BODY_MARGIN, y, 8, NAVY, 'bold');
  y += 2;
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.5);
  pdf.line(BODY_MARGIN, y, BODY_MARGIN + 40, y);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.15);
  pdf.line(BODY_MARGIN + 40, y, BODY_MARGIN + CONTENT_W, y);
  y += 5;

  payments.forEach((p, idx) => {
    // Build fields
    const deductions: { label: string; value: string; type: string }[] = [];
    if (p.ldRecovery > 0) deductions.push({ label: 'LD Recovery', value: `-${fmt(p.ldRecovery)}`, type: 'permanent' });
    if (p.itTds > 0) deductions.push({ label: 'IT-TDS Deducted', value: `-${fmt(p.itTds)}`, type: 'permanent' });
    if (p.otherPermanent > 0) deductions.push({ label: `Other Perm.${p.otherPermanentNote ? ` (${p.otherPermanentNote})` : ''}`, value: `-${fmt(p.otherPermanent)}`, type: 'permanent' });
    if (p.gstTds > 0) deductions.push({ label: 'GST-TDS', value: `-${fmt(p.gstTds)}`, type: 'recoverable' });
    if (p.gstRetention > 0) deductions.push({ label: 'GST Retention', value: `-${fmt(p.gstRetention)}`, type: 'recoverable' });
    if (p.securityDeposit > 0) deductions.push({ label: 'Security Deposit', value: `-${fmt(p.securityDeposit)}`, type: 'recoverable' });
    if (p.bankGuarantee > 0) deductions.push({ label: 'Bank Guarantee', value: `-${fmt(p.bankGuarantee)}`, type: 'recoverable' });
    if (p.otherRecoverable > 0) deductions.push({ label: `Other Recov.${p.otherRecoverableNote ? ` (${p.otherRecoverableNote})` : ''}`, value: `-${fmt(p.otherRecoverable)}`, type: 'recoverable' });

    type EntryField = { label: string; value: string; style?: string; sub?: string };
    const fields: EntryField[] = [
      { label: 'Gross Amount', value: fmt(p.grossAmount) },
    ];

    if (deductions.length > 0) {
      fields.push({
        label: deductions[0].label,
        value: deductions[0].value,
        style: 'red',
        sub: deductions[0].type === 'permanent' ? 'Permanent deduction' : 'Recoverable deduction',
      });
    } else {
      fields.push({ label: 'Deductions', value: fmt(0) });
    }

    fields.push({ label: 'Net Received', value: fmt(p.netAmount), style: 'green' });

    for (let i = 1; i < deductions.length; i++) {
      fields.push({
        label: deductions[i].label,
        value: deductions[i].value,
        style: 'red',
        sub: deductions[i].type === 'permanent' ? 'Permanent deduction' : 'Recoverable deduction',
      });
    }

    fields.push({ label: 'UTR Number', value: p.utrNumber || '-', style: 'mono' });
    fields.push({ label: 'Payment Mode', value: p.mode });
    fields.push({ label: 'Payment Date', value: shortDate(p.paymentDate) });

    if (p.notes) {
      fields.push({ label: 'Notes', value: p.notes });
    }

    const gridRows = Math.ceil(fields.length / 3);
    const headerBarH = 7;
    const fieldH = 10;
    const cardH = headerBarH + gridRows * fieldH + 1;

    y = pageBreakCheck(pdf, y, cardH + 5);

    // Card border
    borderedBox(pdf, BODY_MARGIN, y, CONTENT_W, cardH);

    // Navy header bar
    pdf.setFillColor(...NAVY);
    pdf.rect(BODY_MARGIN + 0.15, y + 0.15, CONTENT_W - 0.3, headerBarH, 'F');

    setLabel(pdf, `Payment Entry ${idx + 1} of ${payments.length}`, BODY_MARGIN + 5, y + 4.8, 8, [255, 255, 255], 'bold');

    const metaText = `${shortDate(p.paymentDate)}  ·  ${p.mode}`;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 210, 225);
    pdf.text(metaText, BODY_MARGIN + CONTENT_W - 5, y + 4.8, { align: 'right' });

    // Grid fields
    const gridY = y + headerBarH;
    const colWidth = CONTENT_W / 3;

    fields.forEach((field, fi) => {
      const col = fi % 3;
      const frow = Math.floor(fi / 3);
      const fX = BODY_MARGIN + col * colWidth;
      const fY = gridY + frow * fieldH;

      // Cell right border
      if (col < 2) {
        pdf.setDrawColor(...BORDER);
        pdf.setLineWidth(0.15);
        pdf.line(fX + colWidth, fY, fX + colWidth, fY + fieldH);
      }
      // Cell bottom border
      if (frow < gridRows - 1) {
        pdf.setDrawColor(...BORDER);
        pdf.setLineWidth(0.15);
        const lineEndX = col === 2 ? fX + colWidth : fX + colWidth;
        pdf.line(BODY_MARGIN, fY + fieldH, BODY_MARGIN + CONTENT_W, fY + fieldH);
      }

      // Field label
      setLabel(pdf, field.label.toUpperCase(), fX + 4, fY + 4, 6.5, TEXT_SOFT, 'normal');

      // Field value
      if (field.style === 'green') {
        setLabel(pdf, field.value, fX + 4, fY + 8, 9, TEAL, 'bold');
      } else if (field.style === 'red') {
        setLabel(pdf, field.value, fX + 4, fY + 8, 9, RED, 'bold');
      } else if (field.style === 'mono') {
        pdf.setFontSize(8);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(...BLUE);
        pdf.text(field.value, fX + 4, fY + 8);
      } else {
        setLabel(pdf, field.value, fX + 4, fY + 8, 9, TEXT_DARK, 'bold');
      }

      if (field.sub) {
        setLabel(pdf, field.sub, fX + 4, fY + fieldH - 1.5, 6, TEXT_SOFT);
      }
    });

    y += cardH + 5;
  });

  // ─── Note Section ───────────────────────────────────────────────────
  y = pageBreakCheck(pdf, y, 20);

  const noteText = isComplete
    ? `This receipt confirms full payment of ${fmt(netReceived)} against Invoice ${invoice.invoiceNumber}.${totalPermanent > 0 ? ` ${fmt(totalPermanent)} has been written off as permanent deductions.` : ''} This is a system-generated document - no physical signature is required for validity.`
    : `This receipt confirms partial payment of ${fmt(netReceived)} against Invoice ${invoice.invoiceNumber}. A balance of ${fmt(balanceDue)} remains due.${totalPermanent > 0 ? ` This includes ${fmt(totalPermanent)} in permanent deductions.` : ''} This is a system-generated document - no physical signature is required for validity.`;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  const noteLines = pdf.splitTextToSize(noteText, CONTENT_W - 14);
  const noteBoxH = Math.max(noteLines.length * 3.5 + 5, 10);

  borderedBox(pdf, BODY_MARGIN, y, CONTENT_W, noteBoxH, 2, LIGHT_BLUE_BG);
  pdf.setDrawColor(191, 219, 254);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(BODY_MARGIN, y, CONTENT_W, noteBoxH, 2, 2, 'S');

  let noteY = y + 4.5;
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BLUE);
  noteLines.forEach((line: string) => {
    pdf.text(line, BODY_MARGIN + 5, noteY);
    noteY += 3.5;
  });

  y += noteBoxH + 6;

  // ─── Divider ────────────────────────────────────────────────────────
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(BODY_MARGIN, y, BODY_MARGIN + CONTENT_W, y);
  y += 6;

  // ─── Signature Row ──────────────────────────────────────────────────
  y = pageBreakCheck(pdf, y, 35);

  const sigStartY = y;

  // Left — Received by
  setLabel(pdf, 'RECEIVED BY', BODY_MARGIN, y, 7, TEXT_SOFT, 'bold');
  y += 16;

  // Signature line
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.4);
  pdf.line(BODY_MARGIN, y, BODY_MARGIN + 55, y);
  y += 3;
  setLabel(pdf, 'AUTHORISED SIGNATORY', BODY_MARGIN, y, 7, TEXT_SOFT, 'normal');
  y += 4;
  setLabel(pdf, companyName, BODY_MARGIN, y, 8.5, TEXT_DARK, 'bold');
  y += 4;
  const initials = companyName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('');
  setLabel(pdf, `For ${initials}`, BODY_MARGIN, y, 8, BLUE, 'bold');

  // Right — Revenue recognised
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...TEXT_SOFT);
  pdf.text('REVENUE RECOGNISED', BODY_MARGIN + CONTENT_W, sigStartY, { align: 'right' });
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...TEAL);
  pdf.text(fmt(netReceived), BODY_MARGIN + CONTENT_W, sigStartY + 8, { align: 'right' });

  const wordsText = convertToWords(netReceived);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...TEXT_SOFT);
  const wordLines = pdf.splitTextToSize(wordsText, 70);
  let wordY = sigStartY + 13;
  wordLines.forEach((line: string) => {
    pdf.text(line, BODY_MARGIN + CONTENT_W, wordY, { align: 'right' });
    wordY += 3.5;
  });

  y += 8;

  // ─── Footer ─────────────────────────────────────────────────────────
  const footerH = 10;
  const footerY = PAGE_H - footerH;

  pdf.setFillColor(...BG);
  pdf.rect(0, footerY, PAGE_W, footerH, 'F');
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(0, footerY, PAGE_W, footerY);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...NAVY);
  pdf.text('VMEW Billing', BODY_MARGIN, footerY + 4);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...TEXT_SOFT);
  pdf.text('This is a computer-generated receipt', BODY_MARGIN, footerY + 7.5);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...TEXT_SOFT);
  pdf.text(`Receipt: ${receiptNo}`, PAGE_W - BODY_MARGIN, footerY + 4, { align: 'right' });
  pdf.text(`MSME No: ${msmeNo}`, PAGE_W - BODY_MARGIN, footerY + 7.5, { align: 'right' });

  // ─── Save ───────────────────────────────────────────────────────────
  const filename = `Payment_Receipt_${invoice.invoiceNumber.replace(/[/\\]/g, '_')}.pdf`;
  pdf.save(filename);
};
