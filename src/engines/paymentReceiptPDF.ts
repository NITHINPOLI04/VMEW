import { jsPDF } from 'jspdf';
import { Invoice } from '../types';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MARGIN = 15;
const PAGE_W = 210 - MARGIN * 2;

/**
 * Generates a simple payment receipt PDF for an invoice with
 * all payment entries, deduction breakdowns, and revenue summary.
 */
export const generatePaymentReceiptPDF = async (invoice: Invoice): Promise<void> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica');

  const payments = invoice.payments || [];
  let y = MARGIN;

  // ─── Title ─────────────────────────────────────────────────────────
  pdf.setFontSize(18);
  pdf.setTextColor(30, 30, 30);
  pdf.text('PAYMENT RECEIPT', MARGIN, y);
  y += 8;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, MARGIN, y);
  y += 10;

  // ─── Invoice Details ────────────────────────────────────────────────
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, y, MARGIN + PAGE_W, y);
  y += 6;

  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const details = [
    ['Invoice No.', invoice.invoiceNumber],
    ['Buyer', invoice.buyerName],
    ['Buyer GST', invoice.buyerGst || '—'],
    ['Invoice Date', new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
    ['Invoice Total', fmt(invoice.grandTotal)],
    ['Payment Status', invoice.paymentStatus],
  ];

  details.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.text(label + ':', MARGIN, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(value), MARGIN + 45, y);
    y += 5.5;
  });

  y += 4;
  pdf.line(MARGIN, y, MARGIN + PAGE_W, y);
  y += 8;

  // ─── Payment Summary ────────────────────────────────────────────────
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('PAYMENT SUMMARY', MARGIN, y);
  y += 8;

  const grossReceived = payments.reduce((s, p) => s + p.grossAmount, 0);
  const totalPermanent = payments.reduce((s, p) => s + p.totalPermanentDeductions, 0);
  const totalRecoverable = payments.reduce((s, p) => s + p.totalRecoverableDeductions, 0);
  const netReceived = payments.reduce((s, p) => s + p.netAmount, 0);

  const summaryRows: [string, string, string?][] = [
    ['Invoice Total', fmt(invoice.grandTotal)],
    ['Gross Received', fmt(grossReceived)],
  ];
  if (totalPermanent > 0) summaryRows.push(['Permanent Deductions', `−${fmt(totalPermanent)}`, 'rose']);
  if (totalRecoverable > 0) summaryRows.push(['Recoverable Deductions', `−${fmt(totalRecoverable)}`, 'amber']);
  summaryRows.push(['Net Received', fmt(netReceived)]);
  summaryRows.push(['Revenue Recognised', fmt(netReceived)]);

  pdf.setFontSize(9);
  summaryRows.forEach(([label, value, color]) => {
    const isRevenue = label === 'Revenue Recognised';
    const isNet = label === 'Net Received';

    if (isRevenue) {
      pdf.setFillColor(236, 253, 245);
      pdf.rect(MARGIN, y - 4, PAGE_W, 6.5, 'F');
    }

    pdf.setFont('helvetica', isNet || isRevenue ? 'bold' : 'normal');

    if (color === 'rose') pdf.setTextColor(190, 50, 50);
    else if (color === 'amber') pdf.setTextColor(180, 120, 30);
    else if (isRevenue) pdf.setTextColor(20, 130, 80);
    else pdf.setTextColor(60, 60, 60);

    pdf.text(label, MARGIN + 2, y);
    pdf.text(value, MARGIN + PAGE_W - 2, y, { align: 'right' });
    y += 6;
  });

  y += 6;
  pdf.line(MARGIN, y, MARGIN + PAGE_W, y);
  y += 8;

  // ─── Payment Entries ────────────────────────────────────────────────
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(`PAYMENT ENTRIES (${payments.length})`, MARGIN, y);
  y += 8;

  payments.forEach((p, idx) => {
    // Check for page break
    if (y > 260) {
      pdf.addPage();
      y = MARGIN;
    }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50, 50, 50);
    pdf.text(`Payment ${idx + 1}`, MARGIN, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    const dateStr = new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    pdf.text(`${dateStr}  ·  ${p.mode}`, MARGIN + 30, y);
    y += 5;

    const entryRows: [string, string][] = [
      ['Gross Amount', fmt(p.grossAmount)],
    ];
    if (p.ldRecovery > 0) entryRows.push(['  LD Recovery', `−${fmt(p.ldRecovery)}`]);
    if (p.itTds > 0) entryRows.push(['  IT-TDS', `−${fmt(p.itTds)}`]);
    if (p.otherPermanent > 0) entryRows.push([`  Other Permanent${p.otherPermanentNote ? ` (${p.otherPermanentNote})` : ''}`, `−${fmt(p.otherPermanent)}`]);
    if (p.gstTds > 0) entryRows.push(['  GST-TDS', `−${fmt(p.gstTds)}`]);
    if (p.gstRetention > 0) entryRows.push(['  GST Retention', `−${fmt(p.gstRetention)}`]);
    if (p.securityDeposit > 0) entryRows.push(['  Security Deposit', `−${fmt(p.securityDeposit)}`]);
    if (p.bankGuarantee > 0) entryRows.push(['  Bank Guarantee', `−${fmt(p.bankGuarantee)}`]);
    if (p.otherRecoverable > 0) entryRows.push([`  Other Recoverable${p.otherRecoverableNote ? ` (${p.otherRecoverableNote})` : ''}`, `−${fmt(p.otherRecoverable)}`]);
    entryRows.push(['Net Received', fmt(p.netAmount)]);
    if (p.utrNumber) entryRows.push(['UTR', p.utrNumber]);

    pdf.setFontSize(8);
    entryRows.forEach(([label, value]) => {
      const isNet = label === 'Net Received';
      pdf.setFont('helvetica', isNet ? 'bold' : 'normal');
      pdf.setTextColor(isNet ? 20 : 80, isNet ? 100 : 80, isNet ? 60 : 80);
      pdf.text(label, MARGIN + 4, y);
      pdf.text(value, MARGIN + PAGE_W - 4, y, { align: 'right' });
      y += 4.5;
    });

    y += 3;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(MARGIN + 4, y, MARGIN + PAGE_W - 4, y);
    y += 5;
  });

  // ─── Save ───────────────────────────────────────────────────────────
  const filename = `Payment_Receipt_${invoice.invoiceNumber.replace(/[/\\]/g, '_')}.pdf`;
  pdf.save(filename);
};
