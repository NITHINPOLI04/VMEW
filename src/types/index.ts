// Invoice Types
export interface InvoiceItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string; // 'Nos' | 'Mts' | 'Lts' | 'Pkt' | 'Kgs'
  rate: number;
  taxableAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  cgstPercentage: number;
  cgstAmount: number;
  igstPercentage: number;
  igstAmount: number;
}

export interface InvoiceFormData {
  _id?: string;
  invoiceNumber: string;
  date: string;
  buyerName: string;
  buyerAddress: string;
  buyerGst: string;
  buyerPan: string;
  buyerMsme: string;
  vessel: string;
  poNumber: string;
  dcNumber: string;
  ewayBillNo: string;
  items: InvoiceItem[];
  taxType: string; // 'sgstcgst' | 'igst'
  grandTotal: number;
  totalInWords: string;
  paymentStatus: string; // 'Payment Complete' | 'Partially Paid' | 'Unpaid'
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice extends InvoiceFormData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string; // 'Nos' | 'Mts' | 'Lts' | 'Pkt' | 'Kgs'
  rate: number;
  transactionType: 'Sales' | 'Purchase';
  financialYear: string; // e.g., '2024-2025'
  createdAt: string;
  updatedAt: string;
  partyGstNo: string;
  partyName: string;
  basicAmt: number;
  igst: number;
  cgst: number;
  sgst: number;
  total: number;
  transport: number;
  gstPercentage: number;
  taxType: 'sgstcgst' | 'igst';
}

// Template Types
export interface Letterhead {
  companyName: string;
  gstNo: string;
  address: string;
  workshop: string;
  email: string;
  cell: string;
}

export interface DefaultInfo {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
  panNo: string;
  msmeNo: string;
  terms: string[];
}