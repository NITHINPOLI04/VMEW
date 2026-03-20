import { Invoice, InvoiceFormData, InventoryItem, Letterhead, DefaultInfo, Supplier, Customer, PurchaseOrder, PurchaseOrderFormData } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Generic API fetch function
const apiRequest = async <T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `API request failed: ${response.statusText}`);
    }
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Network error occurred');
  }
};

// Authentication APIs
export const signup = (email: string, password: string) =>
  apiRequest<{ token: string; userId: string; email: string }>(
    '/api/auth/signup',
    'POST',
    { email, password }
  );

export const login = (email: string, password: string) =>
  apiRequest<{ token: string; userId: string; email: string }>(
    '/api/auth/login',
    'POST',
    { email, password }
  );

// Invoice APIs
export const getInvoices = (year: string, token: string) =>
  apiRequest<Invoice[]>('/api/invoices/' + year, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const getInvoiceById = (id: string, token: string) =>
  apiRequest<Invoice>('/api/invoices/id/' + id, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const createInvoice = (invoiceData: InvoiceFormData, token: string) =>
  apiRequest<Invoice>('/api/invoices', 'POST', invoiceData, {
    Authorization: `Bearer ${token}`,
  });

export const updateInvoice = (id: string, invoiceData: InvoiceFormData, token: string) =>
  apiRequest<Invoice>('/api/invoices/' + id, 'PUT', invoiceData, {
    Authorization: `Bearer ${token}`,
  });

export const updatePaymentStatus = (id: string, status: string, token: string) =>
  apiRequest<Invoice>('/api/invoices/' + id + '/payment-status', 'PATCH', { status }, {
    Authorization: `Bearer ${token}`,
  });

export const deleteInvoice = (id: string, token: string) =>
  apiRequest<void>('/api/invoices/' + id, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });

// Template APIs
export const getTemplate = (type: string, token: string) =>
  apiRequest<Letterhead | DefaultInfo | null>('/api/templates/' + type, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const updateTemplate = (type: string, data: Letterhead | DefaultInfo, token: string) =>
  apiRequest<Letterhead | DefaultInfo>('/api/templates/' + type, 'PUT', data, {
    Authorization: `Bearer ${token}`,
  });

// Inventory APIs
export const getInventory = (year: string, token: string) =>
  apiRequest<InventoryItem[]>('/api/inventory/' + year, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  }).then((items) =>
    items.map((item: any) => ({
      ...item,
      id: item._id,
    }))
  );

export const createInventoryItem = (
  itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
  token: string
) =>
  apiRequest<InventoryItem>('/api/inventory', 'POST', itemData, {
    Authorization: `Bearer ${token}`,
  }).then((item: any) => ({
    ...item,
    id: item._id,
  }));

export const updateInventoryItem = (
  id: string,
  itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
  token: string
) =>
  apiRequest<InventoryItem>('/api/inventory/' + id, 'PUT', itemData, {
    Authorization: `Bearer ${token}`,
  }).then((item: any) => ({
    ...item,
    id: item._id,
  }));

export const deleteInventoryItem = (id: string, token: string) =>
  apiRequest<void>('/api/inventory/' + id, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });

// Utility API
export const convertNumberToWords = (number: number) =>
  apiRequest<{ words: string }>('/api/utils/number-to-words', 'POST', { number });

// Supplier APIs
export const getSuppliers = (token: string) =>
  apiRequest<Supplier[]>('/api/suppliers', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const createSupplier = (supplierData: Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>, token: string) =>
  apiRequest<Supplier>('/api/suppliers', 'POST', supplierData, {
    Authorization: `Bearer ${token}`,
  });

export const updateSupplier = (id: string, supplierData: Partial<Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>>, token: string) =>
  apiRequest<Supplier>('/api/suppliers/' + id, 'PUT', supplierData, {
    Authorization: `Bearer ${token}`,
  });

export const deleteSupplier = (id: string, token: string) =>
  apiRequest<{ message: string }>('/api/suppliers/' + id, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });

// Customer APIs
export const getCustomers = (token: string) =>
  apiRequest<Customer[]>('/api/customers', 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const createCustomer = (customerData: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>, token: string) =>
  apiRequest<Customer>('/api/customers', 'POST', customerData, {
    Authorization: `Bearer ${token}`,
  });

export const updateCustomer = (id: string, customerData: Partial<Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>>, token: string) =>
  apiRequest<Customer>('/api/customers/' + id, 'PUT', customerData, {
    Authorization: `Bearer ${token}`,
  });

export const deleteCustomer = (id: string, token: string) =>
  apiRequest<{ message: string }>('/api/customers/' + id, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });

// Purchase Order APIs
export const getPurchaseOrders = (year: string, token: string) =>
  apiRequest<PurchaseOrder[]>('/api/po/' + year, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const getPurchaseOrderById = (id: string, token: string) =>
  apiRequest<PurchaseOrder>('/api/po/id/' + id, 'GET', undefined, {
    Authorization: `Bearer ${token}`,
  });

export const createPurchaseOrder = (poData: PurchaseOrderFormData, token: string) =>
  apiRequest<PurchaseOrder>('/api/po', 'POST', poData, {
    Authorization: `Bearer ${token}`,
  });

export const updatePurchaseOrder = (id: string, poData: PurchaseOrderFormData, token: string) =>
  apiRequest<PurchaseOrder>('/api/po/' + id, 'PUT', poData, {
    Authorization: `Bearer ${token}`,
  });

export const deletePurchaseOrder = (id: string, token: string) =>
  apiRequest<void>('/api/po/' + id, 'DELETE', undefined, {
    Authorization: `Bearer ${token}`,
  });