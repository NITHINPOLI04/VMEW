import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Eye, Zap, RefreshCw, ShoppingBag } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { usePOStore } from '../stores/poStore';
import { useContactStore } from '../stores/contactStore';
import { convertToWords } from '../utils/numberToWords';
import { getInitialPO } from '../config/documentConfigs';
import { FormSections, poSections } from '../engines/formEngine';
import {
    ItemRowControls,
    TaxFieldsRow,
    ItemTotalsSummary,
} from '../engines/tableEngine';
import { calculateDiscountedTaxes } from '../utils/taxCalculator';
import CustomSelect from './CustomSelect';

interface PurchaseOrderFormProps {
    onSaveSuccess?: () => void;
    editId?: string;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ onSaveSuccess, editId }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const effectiveEditId = editId || searchParams.get('edit');
    const { createPO, updatePO, fetchPO } = usePOStore();
    const { suppliers, fetchSuppliers, addSupplier } = useContactStore();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Autocomplete state
    const [entitySearchOptions, setEntitySearchOptions] = useState<any[]>([]);
    const [showEntityDropdown, setShowEntityDropdown] = useState(false);
    const entityDropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<any>(getInitialPO());

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        const loadPOForEdit = async () => {
            if (effectiveEditId) {
                setLoading(true);
                try {
                    const data = await fetchPO(effectiveEditId);
                    if (data) {
                        setFormData({
                            poNumber: data.poNumber,
                            date: data.date,
                            supplierName: data.supplierName,
                            supplierAddress: data.supplierAddress || '',
                            supplierGst: data.supplierGst || '', // Changed from supplierGstin to supplierGst to match existing code
                            subject: data.subject || '',
                            reference: data.reference || '',
                            items: data.items.map((item: any) => ({
                                id: item.id || Math.random().toString(36).substr(2, 9),
                                description: item.description,
                                hsnSacCode: item.hsnSacCode || '',
                                quantity: item.quantity,
                                unit: item.unit,
                                rate: item.rate,
                                taxableAmount: item.taxableAmount || (item.quantity * item.rate),
                                sgstPercentage: item.sgstPercentage || 0,
                                sgstAmount: item.sgstAmount || 0,
                                cgstPercentage: item.cgstPercentage || 0,
                                cgstAmount: item.cgstAmount || 0,
                                igstPercentage: item.igstPercentage || 0,
                                igstAmount: item.igstAmount || 0
                            })),
                            discountEnabled: data.discountEnabled || false,
                            discountPercentage: data.discountPercentage || 0,
                            discountAmount: data.discountAmount || 0,
                            taxType: data.taxType || 'sgstcgst',
                            grandTotal: data.grandTotal,
                            totalInWords: data.totalInWords || '',
                            notes: data.notes || ''
                        });
                        setSelectedDate(new Date(data.date));
                        setIsEditing(true);
                    }
                } catch (error) {
                    toast.error('Failed to load PO for editing');
                    console.error("Error fetching PO for edit:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadPOForEdit();
    }, [effectiveEditId, fetchPO]);

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

    const calculateTaxTotals = (items: any[] = formData.items, taxType: string = formData.taxType, discountEnabled: boolean = formData.discountEnabled, discountPercentage: any = formData.discountPercentage) => {
        const {
            subTotal,
            discountAmount,
            totalTaxableValue,
            totalSgst,
            totalCgst,
            totalIgst,
            grandTotal
        } = calculateDiscountedTaxes(items, discountEnabled, parseFloat(discountPercentage) || 0, taxType);

        setFormData((prev: any) => ({
            ...prev,
            grandTotal,
            subTotal,
            discountAmount,
            taxableAmount: totalTaxableValue,
            totalSgst,
            totalCgst,
            totalIgst,
            discountEnabled,
            discountPercentage,
            taxType
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name: prefixedName, value } = e.target;
        const name = prefixedName.replace('field_v_', '');
        setFormData((prev: any) => ({
            ...prev,
            [name]: value
        }));

        if (name === 'supplierName') {
            setShowEntityDropdown(true);
            const filtered = suppliers.filter((s: any) => s.name.toLowerCase().includes(value.toLowerCase()));
            setEntitySearchOptions(filtered);
        }
    };

    const handleEntitySelect = (supplier: any) => {
        setFormData((prev: any) => ({
            ...prev,
            supplierName: supplier.name,
            supplierAddress: supplier.address || '',
            supplierGst: supplier.gstNo || '',
        }));
        setShowEntityDropdown(false);
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const updatedItems = [...formData.items];

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

        setFormData((prev: any) => ({ ...prev, items: updatedItems }));
        calculateTaxTotals(updatedItems, formData.taxType, formData.discountEnabled, formData.discountPercentage);
    };

    const handleAddItem = () => {
        const newItem = {
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
        setFormData((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const handleRemoveItem = (index: number) => {
        if (formData.items.length === 1) return;
        const updatedItems = formData.items.filter((_: any, i: number) => i !== index);
        setFormData((prev: any) => ({ ...prev, items: updatedItems }));
        calculateTaxTotals(updatedItems, formData.taxType, formData.discountEnabled, formData.discountPercentage);
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === formData.items.length - 1)) return;
        const updatedItems = [...formData.items];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [updatedItems[index], updatedItems[newIndex]] = [updatedItems[newIndex], updatedItems[index]];
        setFormData((prev: any) => ({ ...prev, items: updatedItems }));
    };

    const validateForm = () => {
        if (!formData.poNumber.trim()) {
            toast.error('PO Number is required');
            return false;
        }
        if (!formData.supplierName.trim()) {
            toast.error('Supplier Name is required');
            return false;
        }
        if (formData.items.some((item: any) => !item.description.trim())) {
            toast.error('Please fill in all item descriptions');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const finalData = { ...formData, date: selectedDate.toISOString() };
            finalData.totalInWords = convertToWords(finalData.grandTotal);

            const existingSupplier = suppliers.find(s => s.name.toLowerCase() === finalData.supplierName.toLowerCase());
            if (!existingSupplier) {
                await addSupplier({
                    name: finalData.supplierName,
                    address: finalData.supplierAddress,
                    gstNo: finalData.supplierGst
                });
            }

            if (isEditing && effectiveEditId) {
                await updatePO(effectiveEditId, finalData);
                toast.success('PO updated successfully!');
                navigate(`/po-preview/${effectiveEditId}`);
            } else {
                const result: any = await createPO(finalData);
                if (result && result._id) {
                    toast.success('PO created successfully!');
                    if (onSaveSuccess) {
                        onSaveSuccess();
                    } else {
                        navigate(`/po-preview/${result._id}`);
                    }
                }
            }
        } catch (error) {
            toast.error('Failed to save Purchase Order');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = () => {
        if (!validateForm()) return;

        const finalData = { ...formData, date: selectedDate.toISOString() };
        finalData.totalInWords = convertToWords(finalData.grandTotal);

        localStorage.setItem('poPreviewData', JSON.stringify(finalData));
        navigate(`/po-preview/temp`);
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* ── Left Side: Form Sections ── */}
                <div className="flex-1 w-full space-y-8">
                    <FormSections
                        sections={poSections()}
                        formData={formData}
                        selectedDate={selectedDate}
                        onChange={handleInputChange}
                        onDateChange={(date) => setSelectedDate(date)}
                        entitySearchOptions={entitySearchOptions}
                        showEntityDropdown={showEntityDropdown}
                        onEntitySelect={handleEntitySelect}
                        entityDropdownRef={entityDropdownRef}
                        onEntityInputFocus={() => {
                            setShowEntityDropdown(true);
                            setEntitySearchOptions(suppliers);
                        }}
                    />

                    {/* ── Line Items Section ── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <PlusCircle className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
                            </div>

                            {/* Tax Type Toggle - pill style like BillForm */}
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
                        </div>

                        <div className="p-4 bg-slate-50 space-y-4">
                            {formData.items.map((item: any, index: number) => (
                                <div key={item.id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 transition-all">
                                    {/* Row 1: Description + Controls */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                                            <textarea
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
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">HSN / SAC</label>
                                            <input
                                                type="text"
                                                value={item.hsnSacCode || ''}
                                                onChange={(e) => handleItemChange(index, 'hsnSacCode', e.target.value)}
                                                autoComplete="off"
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Qty & Unit</label>
                                            <div className="flex gap-2">
                                                <input
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

                                    {/* Row 3: Rate + Taxable Amount */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rate (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                                                <input
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

                                    {/* Tax Adjustments */}
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

                    {/* ── Form Actions ── */}
                    <div className="flex items-center justify-end gap-3 pt-2 pb-0">
                        <button
                            type="button"
                            onClick={handlePreview}
                            className="flex items-center gap-2 px-7 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-all text-sm shadow-sm"
                        >
                            <Eye className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-9 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            {loading
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                                : <><Zap className="w-4 h-4" />{isEditing ? 'Update Order' : 'Save Order'}</>
                            }
                        </button>
                    </div>
                </div>

                {/* ── Right Side: Floating Summary Panel ── */}
                <div className="w-full lg:w-96 lg:sticky lg:top-24 space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="bg-slate-900 p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Order Summary</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">Snapshot of your purchase order</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Discount Toggle */}
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
                                    <div className="flex items-center gap-1.5">
                                        <input
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

                            {formData.grandTotal > 0 && (
                                <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1">Total in Words</p>
                                    <p className="text-xs font-medium text-blue-700 italic leading-relaxed">
                                        {convertToWords(formData.grandTotal)}
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

export default PurchaseOrderForm;
