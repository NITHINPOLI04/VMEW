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
  discountEnabled?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  subTotal?: number;
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

// Delivery Challan Types
export interface DeliveryChallanItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
}

export interface DeliveryChallanFormData {
  _id?: string;
  dcNumber: string;
  date: string;
  buyerName: string;
  buyerAddress: string;
  buyerGst?: string;
  poNumber: string;
  prqNumber?: string;
  vehicleName: string;
  vehicleNumber: string;

  items: DeliveryChallanItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryChallan extends DeliveryChallanFormData {
  _id: string;
  financialYear: string;
  createdAt: string;
  updatedAt: string;
}

// Quotation Types
export interface QuotationItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  cgstPercentage: number;
  cgstAmount: number;
  igstPercentage: number;
  igstAmount: number;
}

export interface QuotationFormData {
  _id?: string;
  quotationNumber: string;
  date: string;
  buyerName: string;
  buyerAddress: string;
  buyerGst?: string;
  refNumber?: string;
  enqNumber?: string;
  items: QuotationItem[];
  discountEnabled?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  subTotal?: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  guarantee?: string;
  validity?: string;
  taxType: string; // 'sgstcgst' | 'igst'
  grandTotal: number;
  totalInWords: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quotation extends QuotationFormData {
  _id: string;
  financialYear: string;
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
  status: string; // 'In Stock' | 'Low Stock' | 'Out of Stock'
  financialYear: string; // e.g., '2024-2025'
  createdAt: string;
  updatedAt: string;
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

// Supplier Types
export interface Supplier {
  _id: string;
  name: string;
  address?: string;
  gstNo?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  _id: string;
  name: string;
  address?: string;
  gstNo?: string;
  pan?: string;
  msme?: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Order Types
export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  cgstPercentage: number;
  cgstAmount: number;
  igstPercentage: number;
  igstAmount: number;
}

export interface PurchaseOrderFormData {
  _id?: string;
  poNumber: string;
  date: string;
  supplierName: string;
  supplierAddress: string;
  supplierGst?: string;
  subject?: string;
  reference?: string;
  items: PurchaseOrderItem[];
  discountEnabled?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  subTotal?: number;
  taxType: string; // 'sgstcgst' | 'igst'
  grandTotal: number;
  totalInWords: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrder extends PurchaseOrderFormData {
  _id: string;
  financialYear: string;
  createdAt: string;
  updatedAt: string;
}