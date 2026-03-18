import { jsPDF } from 'jspdf';
import { drawLetterhead } from '../utils/pdfHelpers';
import { loadImages, PDF_MARGIN, PDF_PAGE_WIDTH } from './pdfEngine';
import { Letterhead } from '../types';

/**
 * Generates a full A4 PDF with ONLY the letterhead at the top,
 * reusing the exact same rendering logic as invoice PDF generation.
 *
 * Matches the invoice PDF precisely:
 * - Same jsPDF config (portrait, mm, a4)
 * - Same font initialisation (helvetica)
 * - Same starting Y (10) used in InvoicePreview.handleGeneratePDF
 * - Identical call to drawLetterhead() from pdfHelpers.ts
 */
const createPDF = async (letterhead: Letterhead) => {
  const [logoImg] = await loadImages(['/logo.png']);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica');

  drawLetterhead(pdf, PDF_MARGIN, PDF_PAGE_WIDTH, 10, letterhead, logoImg);
  return pdf;
};

export const generateLetterheadPDF = async (letterhead: Letterhead): Promise<void> => {
  const pdf = await createPDF(letterhead);
  pdf.save('LetterHead_VMEW.pdf');
};

export const generateLetterheadPDFBlob = async (letterhead: Letterhead): Promise<string> => {
  const pdf = await createPDF(letterhead);
  return pdf.output('bloburl').toString();
};
