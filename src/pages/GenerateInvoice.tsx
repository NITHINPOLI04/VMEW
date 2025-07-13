import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PlusCircle, Trash, ChevronUp, ChevronDown } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useTemplateStore } from '../stores/templateStore';
import { InvoiceItem, InvoiceFormData } from '../types';
import { toast } from 'react-hot-toast';
import { convertToWords } from '../utils/numberToWords';

const GenerateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { createInvoice, fetchInvoice, updateInvoice } = useInvoiceStore();
  const { defaultInfo } = useTemplateStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<InvoiceFormData>({
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
    items: [createNewItem()],
    taxType: 'sgstcgst',
    grandTotal: 0,
    totalInWords: '',
    paymentStatus: 'Unpaid'
  });

  useEffect(() => {
    const loadInvoiceForEdit = async () => {
      if (editId) {
        setLoading(true);
        try {
          const invoiceData = await fetchInvoice(editId);
          setFormData(invoiceData);
          setSelectedDate(new Date(invoiceData.date));
          setIsEditing(true);
          toast.success('Invoice loaded for editing');
        } catch (error) {
          toast.error('Failed to load invoice for editing');
          navigate('/generate-invoice');
        } finally {
          setLoading(false);
        }
      }
    };

    loadInvoiceForEdit();
  }, [editId, fetchInvoice, navigate]);

  useEffect(() => {
    if (defaultInfo && !isEditing) {
      setFormData(prev => ({
        ...prev,
        buyerPan: defaultInfo.panNo || '',
        buyerMsme: defaultInfo.msmeNo || ''
      }));
    }
  }, [defaultInfo, isEditing]);

  function createNewItem(): InvoiceItem {
    return {
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
    };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev) => ({
        ...prev,
        date: date.toISOString()
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...formData.items];
    
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const rate = field === 'rate' ? Number(value) : updatedItems[index].rate;
      const taxableAmount = qty * rate;
      let sgstAmount = (taxableAmount * updatedItems[index].sgstPercentage) / 100;
      let cgstAmount = (taxableAmount * updatedItems[index].cgstPercentage) / 100;
      let igstAmount = (taxableAmount * updatedItems[index].igstPercentage) / 100;

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: Number(value),
        taxableAmount,
        sgstAmount,
        cgstAmount,
        igstAmount
      };
    } else if (field === 'sgstPercentage' || field === 'cgstPercentage' || field === 'igstPercentage') {
      const percentage = Number(value);
      const taxField = field === 'sgstPercentage' 
        ? 'sgstAmount' 
        : field === 'cgstPercentage' 
          ? 'cgstAmount' 
          : 'igstAmount';
      const taxAmount = (updatedItems[index].taxableAmount * percentage) / 100;

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: percentage,
        [taxField]: taxAmount
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }
    
    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));
    
    calculateTotals(updatedItems, formData.taxType);
  };

  const calculateTotals = (items: InvoiceItem[], taxType: string) => {
    let totalTaxableAmount = 0;
    let totalSgst = 0;
    let totalCgst = 0;
    let totalIgst = 0;
    
    items.forEach(item => {
      totalTaxableAmount += item.taxableAmount;
      totalSgst += item.sgstAmount;
      totalCgst += item.cgstAmount;
      totalIgst += item.igstAmount;
    });
    
    const totalTax = taxType === 'sgstcgst' ? (totalSgst + totalCgst) : totalIgst;
    let grandTotal = totalTaxableAmount + totalTax;
    // Apply rounding logic only to grandTotal
    const decimalPartGrand = grandTotal % 1;
    if (decimalPartGrand >= 0.50) {
      grandTotal = Math.ceil(grandTotal);
    }
    const totalInWords = convertToWords(grandTotal);
    
    setFormData(prev => ({
      ...prev,
      grandTotal,
      totalInWords
    }));
  };

  const handleAddItem = () => {
    const updatedItems = [...formData.items, createNewItem()];
    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));
    
    calculateTotals(updatedItems, formData.taxType);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.items.length - 1)
    ) {
      return;
    }
    
    const updatedItems = [...formData.items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [updatedItems[index], updatedItems[newIndex]] = [updatedItems[newIndex], updatedItems[index]];
    
    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleTaxTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taxType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      taxType
    }));
    
    calculateTotals(formData.items, taxType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.some(item => !item.description)) {
      toast.error('Please fill in all item descriptions');
      return;
    }
    
    setLoading(true);
    try {
      const formattedDate = selectedDate.toISOString();
      
      const invoiceData = {
        ...formData,
        date: formattedDate
      };
      
      if (isEditing && editId) {
        await updateInvoice(editId, invoiceData);
        toast.success('Invoice updated successfully!');
        navigate(`/invoice-preview/${editId}`);
      } else {
        const result = await createInvoice(invoiceData);
        toast.success('Invoice created successfully!');
        navigate(`/invoice-preview/${result._id}`);
      }
    } catch (error) {
      toast.error(isEditing ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (formData.items.some(item => !item.description)) {
      toast.error('Please fill in all item descriptions');
      return;
    }
    
    localStorage.setItem('invoicePreviewData', JSON.stringify({
      ...formData,
      date: selectedDate.toISOString()
    }));
    
    navigate('/invoice-preview/temp');
  };

  const totalTaxableAmount = formData.items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalSgst = formData.items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalCgst = formData.items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalIgst = formData.items.reduce((sum, item) => sum + item.igstAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        {isEditing ? 'Edit Invoice' : 'Generate New Invoice'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-slate-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                id="invoiceNumber"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd-MM-yyyy"
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Buyer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="buyerName" className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="buyerName"
                name="buyerName"
                value={formData.buyerName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="buyerAddress" className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <textarea
                id="buyerAddress"
                name="buyerAddress"
                value={formData.buyerAddress}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="buyerGst" className="block text-sm font-medium text-slate-700 mb-1">
                GST No.
              </label>
              <input
                type="text"
                id="buyerGst"
                name="buyerGst"
                value={formData.buyerGst}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="ewayBillNo" className="block text-sm font-medium text-slate-700 mb-1">
                E-way Bill No.
              </label>
              <input
                type="text"
                id="ewayBillNo"
                name="ewayBillNo"
                value={formData.ewayBillNo}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="vessel" className="block text-sm font-medium text-slate-700 mb-1">
                Vessel
              </label>
              <input
                type="text"
                id="vessel"
                name="vessel"
                value={formData.vessel}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-slate-700 mb-1">
                P.O. No.
              </label>
              <input
                type="text"
                id="poNumber"
                name="poNumber"
                value={formData.poNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="dcNumber" className="block text-sm font-medium text-slate-700 mb-1">
                DC No.
              </label>
              <input
                type="text"
                id="dcNumber"
                name="dcNumber"
                value={formData.dcNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Item Details</h2>
            <div>
              <label htmlFor="taxType" className="mr-2 text-sm font-medium text-slate-700">
                Tax Type:
              </label>
              <select
                id="taxType"
                name="taxType"
                value={formData.taxType}
                onChange={handleTaxTypeChange}
                className="px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sgstcgst">SGST & CGST</option>
                <option value="igst">IGST</option>
              </select>
            </div>
          </div>
          
          {formData.items.map((item, index) => (
            <div key={item.id} className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-slate-800">Item {index + 1}</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded ${
                      index === 0 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, 'down')}
                    disabled={index === formData.items.length - 1}
                    className={`p-1 rounded ${
                      index === formData.items.length - 1 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description of Goods
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={item.hsnSacCode}
                    onChange={(e) => handleItemChange(index, 'hsnSacCode', e.target.value)}
                    className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="1"
                      className="w-2/3 px-4 py-2 rounded-l-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-1/3 px-2 py-2 rounded-r-md border border-slate-300 border-l-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Nos">Nos</option>
                      <option value="Mts">Mts</option>
                      <option value="Lts">Lts</option>
                      <option value="Pkt">Pkt</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-8 px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Taxable Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      value={item.taxableAmount.toFixed(2)}
                      readOnly
                      className="w-full pl-8 px-4 py-2 rounded-md bg-slate-100 border border-slate-300"
                    />
                  </div>
                </div>
              </div>
              
              {formData.taxType === 'sgstcgst' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SGST %
                    </label>
                    <input
                      type="number"
                      value={item.sgstPercentage}
                      onChange={(e) => handleItemChange(index, 'sgstPercentage', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SGST Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={item.sgstAmount.toFixed(2)}
                        readOnly
                        className="w-full pl-8 px-4 py-2 rounded-md bg-slate-100 border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CGST %
                    </label>
                    <input
                      type="number"
                      value={item.cgstPercentage}
                      onChange={(e) => handleItemChange(index, 'cgstPercentage', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CGST Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={item.cgstAmount.toFixed(2)}
                        readOnly
                        className="w-full pl-8 px-4 py-2 rounded-md bg-slate-100 border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IGST %
                    </label>
                    <input
                      type="number"
                      value={item.igstPercentage}
                      onChange={(e) => handleItemChange(index, 'igstPercentage', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IGST Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={item.igstAmount.toFixed(2)}
                        readOnly
                        className="w-full pl-8 px-4 py-2 rounded-md bg-slate-100 border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center px-4 py-2 border border-blue-900 text-blue-900 rounded-md hover:bg-blue-50 transition-colors duration-200"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Another Item
          </button>
          
          <div className="mt-8 border-t border-slate-200 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Total Taxable Amount:</span>
                  <span className="font-medium">₹ {totalTaxableAmount.toFixed(2)}</span>
                </div>
                
                {formData.taxType === 'sgstcgst' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Total SGST:</span>
                      <span className="font-medium">₹ {totalSgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Total CGST:</span>
                      <span className="font-medium">₹ {totalCgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Total IGST:</span>
                    <span className="font-medium">₹ {totalIgst.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-800">Grand Total:</span>
                  <span className="text-blue-900">₹ {formData.grandTotal.toFixed(2)}</span>
                </div>
                
                <div className="text-sm text-slate-500">
                  <span className="italic">{formData.totalInWords}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handlePreview}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors duration-200"
          >
            Preview Invoice
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></span>
                {isEditing ? 'Updating...' : 'Saving...'}
              </span>
            ) : (
              <span>{isEditing ? 'Update Invoice' : 'Save Invoice'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateInvoice;