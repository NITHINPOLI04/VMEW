// ─── Document Type Config ──────────────────────────────────────────────────────
// Single source of truth for all document type metadata.
// Add new document types here — zero other changes required for labels/colors.
export type BillingDocumentType = 'invoice' | 'credit_note' | 'debit_note';

export interface DocumentTypeConfig {
  label: string;
  numberLabel: string;   // Label shown next to the document number
  docTitle: string;      // Title printed in PDF and Preview header
  color: 'blue' | 'rose' | 'amber' | 'emerald';
  pdfPrefix: string;     // PDF filename prefix (e.g. INV_, CN_, DN_)
  tabActiveColor: string; // Tailwind classes for active tab
}

export const DOCUMENT_TYPE_CONFIG: Record<BillingDocumentType, DocumentTypeConfig> = {
  invoice: {
    label: 'Tax Invoice',
    numberLabel: 'Invoice No',
    docTitle: 'INVOICE',
    color: 'blue',
    pdfPrefix: 'INV_',
    tabActiveColor: 'border-blue-600 text-blue-700 bg-blue-50/60',
  },
  credit_note: {
    label: 'Credit Note',
    numberLabel: 'Credit Note No',
    docTitle: 'CREDIT NOTE',
    color: 'rose',
    pdfPrefix: 'CN_',
    tabActiveColor: 'border-rose-500 text-rose-700 bg-rose-50/60',
  },
  debit_note: {
    label: 'Debit Note',
    numberLabel: 'Debit Note No',
    docTitle: 'DEBIT NOTE',
    color: 'amber',
    pdfPrefix: 'DN_',
    tabActiveColor: 'border-amber-500 text-amber-700 bg-amber-50/60',
  },
};

// ─── Invoice Initial State ─────────────────────────────────────────────────────
export const getInitialInvoice = (defaultInfo: any = null) => ({
    invoiceNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    buyerPan: defaultInfo?.panNo || '',
    buyerMsme: defaultInfo?.msmeNo || '',
    ewayBillNo: '',
    vessel: '',
    poNumber: '',
    dcNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    grandTotal: 0,
    totalInWords: '',
    paymentStatus: 'Unpaid',
    discountEnabled: false,
    discountPercentage: 0,
    discountAmount: 0,
    discountType: 'percentage' as const,
    discountFixedAmount: 0,
    invoiceType: 'Product' as 'Product' | 'Service',
    documentType: 'invoice' as BillingDocumentType,
});

// Credit Note: identical structure to Invoice — only documentType differs.
export const getInitialCreditNote = (defaultInfo: any = null) => ({
    ...getInitialInvoice(defaultInfo),
    invoiceNumber: '',
    documentType: 'credit_note' as BillingDocumentType,
});

// Debit Note: identical structure to Invoice — only documentType differs.
export const getInitialDebitNote = (defaultInfo: any = null) => ({
    ...getInitialInvoice(defaultInfo),
    invoiceNumber: '',
    documentType: 'debit_note' as BillingDocumentType,
});

export const getInitialDC = () => ({
    dcNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    poNumber: '',
    prqNumber: '',
    vehicleName: '',
    vehicleNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos'
    }]
});

export const getInitialQuotation = () => ({
    quotationNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    refNumber: '',
    enqNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    deliveryTerms: '',
    paymentTerms: '',
    guarantee: '',
    validity: '',
    grandTotal: 0,
    totalInWords: '',
    discountEnabled: false,
    discountPercentage: 0,
    discountAmount: 0,
    discountType: 'percentage' as const,
    discountFixedAmount: 0
});

export const getInitialPO = () => ({
    poNumber: '',
    date: new Date().toISOString(),
    supplierName: '',
    supplierAddress: '',
    supplierGst: '',
    subject: '',
    reference: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    grandTotal: 0,
    totalInWords: '',
    notes: 'With reference to the above subject we have pleasure in placing our confirmatory order to supply of the below in accordance with the terms given in the quotation.',
    discountEnabled: false,
    discountPercentage: 0,
    discountAmount: 0,
    discountType: 'percentage' as const,
    discountFixedAmount: 0
});
