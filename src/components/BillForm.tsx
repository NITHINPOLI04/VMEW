import React, { useState, useEffect, useRef } from 'react';
import { FileText, PlusCircle, Eye, Zap, RefreshCw } from 'lucide-react';
import { useContactStore } from '../stores/contactStore';
import CustomSelect from './CustomSelect';
import {
    FormSections,
    invoiceSections,
    quotationSections,
    dcSections,
} from '../engines/formEngine';
import {
    ItemRowControls,
    TaxFieldsRow,
    ItemTotalsSummary,
} from '../engines/tableEngine';
import { calculateDiscountedTaxes } from '../utils/taxCalculator';

interface BillFormProps {
    billType: 'invoice' | 'dc' | 'quotation';
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    onSubmit: (e: React.FormEvent) => void;
    onPreview: () => void;
    isEditing: boolean;
    loading: boolean;
}

const BillForm: React.FC<BillFormProps> = ({
    billType,
    formData,
    setFormData,
    selectedDate,
    setSelectedDate,
    onSubmit,
    onPreview,
    isEditing,
    loading
}) => {
    const { customers } = useContactStore();
    const [entitySearchOptions, setEntitySearchOptions] = useState<any[]>([]);
    const [showEntityDropdown, setShowEntityDropdown] = useState(false);
    const entityDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (entityDropdownRef.current && !entityDropdownRef.current.contains(event.target as Node)) {
                setShowEntityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name: prefixedName, value } = e.target;
        const name = prefixedName.replace('field_v_', '');
        setFormData((prev: any) => ({ ...prev, [name]: value }));

        if (name === 'buyerName') {
            setShowEntityDropdown(true);
            const filtered = customers.filter((c: any) => c.name.toLowerCase().includes(value.toLowerCase()));
            setEntitySearchOptions(filtered);
        }
    };

    const handleEntitySelect = (customer: any) => {
        setFormData((prev: any) => ({
            ...prev,
            buyerName: customer.name,
            buyerAddress: customer.address || '',
            buyerGst: customer.gstNo || '',
            buyerPan: customer.pan || prev.buyerPan,
            buyerMsme: customer.msme || prev.buyerMsme
        }));
        setShowEntityDropdown(false);
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
        setFormData((prev: any) => ({ ...prev, date: date.toISOString() }));
    };

    const calculateTaxTotals = (items: any[], taxType: string, discountEnabled: boolean = formData.discountEnabled, discountPercentage: number = formData.discountPercentage || 0) => {
        const {
            subTotal,
            discountAmount,
            totalTaxableValue,
            totalSgst,
            totalCgst,
            totalIgst,
            grandTotal
        } = calculateDiscountedTaxes(items, discountEnabled, discountPercentage, taxType);

        setFormData((prev: any) => ({ ...prev, items, grandTotal, subTotal, discountAmount, discountEnabled, discountPercentage, taxableAmount: totalTaxableValue, totalSgst, totalCgst, totalIgst, taxType }));
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const updatedItems = [...formData.items];

        if (billType === 'invoice' || billType === 'quotation') {
            if (field === 'quantity' || field === 'rate') {
                const qty = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
                const rate = field === 'rate' ? Number(value) : updatedItems[index].rate;
                const taxableAmount = qty * rate;
                const sgstAmount = (taxableAmount * updatedItems[index].sgstPercentage) / 100;
                const cgstAmount = (taxableAmount * updatedItems[index].cgstPercentage) / 100;
                const igstAmount = (taxableAmount * updatedItems[index].igstPercentage) / 100;
                updatedItems[index] = { ...updatedItems[index], [field]: Number(value), taxableAmount, sgstAmount, cgstAmount, igstAmount };
            } else if (['sgstPercentage', 'cgstPercentage', 'igstPercentage'].includes(field)) {
                const percentage = Number(value);
                const taxField = field === 'sgstPercentage' ? 'sgstAmount' : field === 'cgstPercentage' ? 'cgstAmount' : 'igstAmount';
                const taxAmount = (updatedItems[index].taxableAmount * percentage) / 100;
                updatedItems[index] = { ...updatedItems[index], [field]: percentage, [taxField]: taxAmount };
            } else {
                updatedItems[index] = { ...updatedItems[index], [field]: value };
            }
            // Removed redundant setFormData to avoid race condition
            calculateTaxTotals(updatedItems, formData.taxType, formData.discountEnabled, formData.discountPercentage);
        } else if (billType === 'dc') {
            if (field === 'quantity') {
                updatedItems[index] = { ...updatedItems[index], [field]: Number(value) };
            } else {
                updatedItems[index] = { ...updatedItems[index], [field]: value };
            }
            setFormData((prev: any) => ({ ...prev, items: updatedItems }));
        }
    };

    const handleAddItem = () => {
        let newItem: any = { id: Date.now().toString(), description: '', quantity: 1 };

        if (billType === 'invoice' || billType === 'quotation') {
            newItem = { ...newItem, hsnSacCode: '', unit: 'Nos', rate: 0, taxableAmount: 0, sgstPercentage: 9, sgstAmount: 0, cgstPercentage: 9, cgstAmount: 0, igstPercentage: 18, igstAmount: 0 };
        } else if (billType === 'dc') {
            newItem = { ...newItem, hsnSacCode: '', unit: 'Nos' };
        }

        setFormData((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const handleRemoveItem = (index: number) => {
        if (formData.items.length === 1) return;
        const updatedItems = formData.items.filter((_: any, i: number) => i !== index);
        if (billType === 'invoice' || billType === 'quotation') {
            calculateTaxTotals(updatedItems, formData.taxType, formData.discountEnabled, formData.discountPercentage);
        } else {
            setFormData((prev: any) => ({ ...prev, items: updatedItems }));
        }
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === formData.items.length - 1)) return;
        const updatedItems = [...formData.items];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [updatedItems[index], updatedItems[newIndex]] = [updatedItems[newIndex], updatedItems[index]];
        setFormData((prev: any) => ({ ...prev, items: updatedItems }));
    };

    // Pick sections based on document type
    const sections = billType === 'invoice'
        ? invoiceSections()
        : billType === 'quotation'
            ? quotationSections()
            : dcSections();

    const hasTax = billType === 'invoice' || billType === 'quotation';

    return (
        <form onSubmit={onSubmit} className="relative">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Side: Form Sections */}
                <div className="flex-1 w-full space-y-8">
                    <FormSections
                        sections={sections}
                        formData={formData}
                        selectedDate={selectedDate}
                        onChange={handleInputChange}
                        onDateChange={handleDateChange}
                        entitySearchOptions={entitySearchOptions}
                        showEntityDropdown={showEntityDropdown}
                        onEntitySelect={handleEntitySelect}
                        entityDropdownRef={entityDropdownRef}
                        onEntityInputFocus={() => {
                            setShowEntityDropdown(true);
                            setEntitySearchOptions(customers);
                        }}
                    />

                    {/* Items Section - Inline Table Style */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <PlusCircle className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
                            </div>

                            {hasTax && (
                                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData((prev: any) => ({ ...prev, taxType: 'sgstcgst' }));
                                            calculateTaxTotals(formData.items, 'sgstcgst', formData.discountEnabled, formData.discountPercentage);
                                        }}
                                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${formData.taxType === 'sgstcgst'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        SGST + CGST
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData((prev: any) => ({ ...prev, taxType: 'igst' }));
                                            calculateTaxTotals(formData.items, 'igst', formData.discountEnabled, formData.discountPercentage);
                                        }}
                                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${formData.taxType === 'igst'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        IGST
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 space-y-4">
                            {formData.items.map((item: any, index: number) => (
                                <div key={item.id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 transition-all">
                                    {/* Row 1: Description + Controls */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-1">
                                            <label htmlFor={`item_desc_${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                                            <textarea
                                                id={`item_desc_${index}`}
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                required
                                                rows={2}
                                                autoComplete="off"
                                                name={`field_v_item_desc_${index}`}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 bg-white resize-none"
                                            />
                                        </div>
                                        <div className="pt-5 flex-shrink-0">
                                            <ItemRowControls
                                                index={index}
                                                total={formData.items.length}
                                                onMoveUp={() => handleMoveItem(index, 'up')}
                                                onMoveDown={() => handleMoveItem(index, 'down')}
                                                onRemove={() => handleRemoveItem(index)}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: HSN/SAC + Qty & Unit */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label htmlFor={`hsn_${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">HSN / SAC</label>
                                            <input
                                                id={`hsn_${index}`}
                                                type="text"
                                                value={item.hsnSacCode}
                                                onChange={(e) => handleItemChange(index, 'hsnSacCode', e.target.value)}
                                                required={billType === 'invoice'}
                                                autoComplete="off"
                                                name={`field_v_hsn_${index}`}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`qty_${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Qty & Unit</label>
                                            <div className="flex gap-2">
                                                <input
                                                    id={`qty_${index}`}
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    min="1"
                                                    required
                                                    autoComplete="off"
                                                    name={`field_v_qty_${index}`}
                                                    className="w-24 px-3 py-2 text-sm rounded-lg border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                                />
                                                <CustomSelect
                                                    value={item.unit || 'Nos'}
                                                    options={[
                                                        { value: 'Nos', label: 'Nos' },
                                                        { value: 'Mts', label: 'Mts' },
                                                        { value: 'Lts', label: 'Lts' },
                                                        { value: 'Pkt', label: 'Pkt' },
                                                        { value: 'Kgs', label: 'Kgs' },
                                                    ]}
                                                    onChange={(val) => handleItemChange(index, 'unit', val)}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 3: Rate + Amount (invoice/quotation only) */}
                                    {hasTax && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label htmlFor={`rate_${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rate (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                                                    <input
                                                        id={`rate_${index}`}
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                        autoComplete="off"
                                                        name={`field_v_rate_${index}`}
                                                        className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white font-medium"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Taxable Amount</label>
                                                <div className="px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-100 text-slate-700 font-bold h-[38px] flex items-center">
                                                    ₹{item.taxableAmount?.toFixed(2) || '0.00'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tax Adjustments - Sub-panel style */}
                                    {hasTax && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                <span>Tax Adjustments</span>
                                                <div className="h-px flex-1 bg-slate-200/50"></div>
                                            </div>
                                            <TaxFieldsRow
                                                taxType={formData.taxType}
                                                item={item}
                                                onChange={(field, value) => handleItemChange(index, field, value)}
                                                compact
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-white hover:border-blue-200 border-2 border-dashed border-slate-200 rounded-xl transition-all bg-transparent"
                            >
                                <PlusCircle className="w-5 h-5" />
                                Add Line Item
                            </button>
                        </div>
                    </div>

                    {/* Form Actions - placed right after line items */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 pb-0">
                        <button
                            type="button"
                            onClick={onPreview}
                            className="flex items-center justify-center gap-2 px-7 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all text-sm shadow-sm w-full sm:w-auto"
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-9 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50 w-full sm:w-auto"
                        >
                            {loading
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                                : <><Zap className="w-4 h-4" />{isEditing ? 'Update Document' : 'Generate Bill'}</>
                            }
                        </button>
                    </div>
                </div>

                {/* Right Side: Floating Summary Panel */}
                <div className="w-full lg:w-96 lg:sticky lg:top-24 space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="bg-slate-900 p-6 text-white">
                            <h3 className="text-lg font-bold">Summary</h3>
                            <p className="text-slate-400 text-xs mt-1">Snapshot of your document</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {hasTax && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
                                        <label className="flex items-center space-x-3 cursor-pointer select-none">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={formData.discountEnabled || false}
                                                    onChange={(e) => {
                                                        const isEnabled = e.target.checked;
                                                        const pct = isEnabled ? formData.discountPercentage : 0;
                                                        calculateTaxTotals(formData.items, formData.taxType, isEnabled, pct);
                                                    }}
                                                />
                                                <div className={`w-10 h-6 rounded-full transition-all duration-300 ${formData.discountEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-all duration-300 transform ${formData.discountEnabled ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">Apply Discount</span>
                                        </label>

                                        {formData.discountEnabled && (
                                            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <label htmlFor="discount_pct" className="sr-only">Discount Percentage</label>
                                                <input
                                                    id="discount_pct"
                                                    type="number"
                                                    value={formData.discountPercentage || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        calculateTaxTotals(formData.items, formData.taxType, formData.discountEnabled, val);
                                                    }}
                                                    autoComplete="off"
                                                    name="field_v_discount"
                                                    className="w-14 px-2 py-1 text-center font-bold text-sm rounded-lg border-2 border-emerald-100 bg-white focus:border-emerald-500 outline-none focus:ring-4 focus:ring-emerald-500/10"
                                                />
                                                <span className="text-xs font-bold text-emerald-600">%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-100 mx-2"></div>
                                </div>
                            )}

                            {hasTax && (
                                <ItemTotalsSummary
                                    items={formData.items}
                                    taxType={formData.taxType}
                                    grandTotal={formData.grandTotal}
                                    discountEnabled={formData.discountEnabled}
                                    discountPercentage={formData.discountPercentage}
                                    discountAmount={formData.discountAmount}
                                    subTotal={formData.subTotal}
                                    totalSgst={formData.totalSgst}
                                    totalCgst={formData.totalCgst}
                                    totalIgst={formData.totalIgst}
                                />
                            )}

                            {!hasTax && (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium italic">
                                        Delivery Challan doesn't include tax calculations.
                                    </p>
                                </div>
                            )}

                            {formData.totalInWords && (
                                <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1">Total in Words</p>
                                    <p className="text-xs font-medium text-blue-700 italic leading-relaxed">
                                        {formData.totalInWords}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


        </form>
    );
};

export default BillForm;
