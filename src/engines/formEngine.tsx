/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { ChevronsUpDown, FileText, FileSpreadsheet, Truck, PlusCircle } from 'lucide-react';
import CustomDatePicker from '../components/CustomDatePicker';

// ─── Field & Section Types ─────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'date'
  | 'readonly';

export type SelectOption = { value: string; label: string };

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];        // for 'select'
  colSpan?: 1 | 2;                 // grid col-span (default 1)
  rows?: number;                   // for 'textarea'
  min?: number;                    // for 'number'
  step?: string;                   // for 'number'
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
}

// ─── Document section configs ──────────────────────────────────────────────────

export const invoiceSections = (): SectionDef[] => [
  {
    title: 'Document Details',
    fields: [
      { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    title: 'Buyer Details',
    fields: [
      { name: 'buyerName', label: 'Name', type: 'text', required: true },
      { name: 'buyerAddress', label: 'Address', type: 'textarea', required: true, rows: 2 },
      { name: 'buyerGst', label: 'GST No.', type: 'text' },
      { name: 'ewayBillNo', label: 'E-way Bill No.', type: 'text' },
      { name: 'vessel', label: 'Vessel', type: 'text' },
      { name: 'poNumber', label: 'P.O. No.', type: 'text' },
      { name: 'dcNumber', label: 'DC No.', type: 'text' },
    ],
  },
];

export const quotationSections = (): SectionDef[] => [
  {
    title: 'Document Details',
    fields: [
      { name: 'quotationNumber', label: 'Quotation Number', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    title: 'Buyer Details',
    fields: [
      { name: 'buyerName', label: 'Name', type: 'text', required: true },
      { name: 'buyerAddress', label: 'Address', type: 'textarea', required: true, rows: 2 },
      { name: 'buyerGst', label: 'GST No.', type: 'text' },
      { name: 'refNumber', label: 'Ref No.', type: 'text' },
      { name: 'enqNumber', label: 'Enq No.', type: 'text' },
    ],
  },
  {
    title: 'Terms & Conditions',
    fields: [
      { name: 'deliveryTerms', label: 'Delivery', type: 'text', placeholder: 'e.g. Ex-Works / FOR Destination' },
      { name: 'paymentTerms', label: 'Payment', type: 'text', placeholder: 'e.g. 100% Advance / 30 Days Credit' },
      { name: 'guarantee', label: 'Guarantee', type: 'text', placeholder: 'e.g. 12 Months from date of supply' },
      { name: 'validity', label: 'Validity', type: 'text', placeholder: 'e.g. 30 Days' },
    ],
  },
];

export const dcSections = (): SectionDef[] => [
  {
    title: 'Document Details',
    fields: [
      { name: 'dcNumber', label: 'DC Number', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    title: 'Buyer Details',
    fields: [
      { name: 'buyerName', label: 'Name', type: 'text', required: true },
      { name: 'buyerAddress', label: 'Address', type: 'textarea', required: true, rows: 2 },
      { name: 'buyerGst', label: 'GST No.', type: 'text' },
      { name: 'poNumber', label: 'P.O. No.', type: 'text', required: true },
      { name: 'prqNumber', label: 'PRQ No.', type: 'text' },
      { name: 'vehicleName', label: 'Vehicle Name', type: 'text', required: true },
      { name: 'vehicleNumber', label: 'Vehicle No.', type: 'text', required: true },
    ],
  },
];

export const poSections = (): SectionDef[] => [
  {
    title: 'PO Details',
    fields: [
      { name: 'poNumber', label: 'PO Number', type: 'text', required: true, placeholder: 'Manually enter PO number' },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    title: 'Supplier Details',
    fields: [
      { name: 'supplierName', label: 'Name', type: 'text', required: true },
      { name: 'supplierAddress', label: 'Address', type: 'textarea', required: true, rows: 2 },
      { name: 'supplierGst', label: 'GST No.', type: 'text' },
    ],
  },
  {
    title: 'Order Context',
    fields: [
      { name: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Purchase order for hardware materials' },
      { name: 'reference', label: 'Reference', type: 'text', placeholder: 'e.g. Your Quotation No. 123 dated 01-Jan' },
    ],
  },
  {
    title: 'General Notes',
    fields: [
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, rows: 3 },
    ],
  },
];

// ─── FormSection Component ─────────────────────────────────────────────────────

interface FormSectionProps {
  section: SectionDef;
  formData: any;
  selectedDate?: Date;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onDateChange?: (date: Date) => void;
  entitySearchOptions?: any[];
  showEntityDropdown?: boolean;
  onEntitySelect?: (entity: any) => void;
  entityDropdownRef?: React.RefObject<HTMLDivElement>;
  onEntityInputFocus?: () => void;
}

/**
 * Renders a single configuration-driven form section (card).
 * Each section renders its fields from the FieldDef array.
 */
export const FormSection: React.FC<FormSectionProps> = ({
  section,
  formData,
  selectedDate,
  onChange,
  onDateChange,
  entitySearchOptions,
  showEntityDropdown,
  onEntitySelect,
  entityDropdownRef,
  onEntityInputFocus,
}) => {
  const inputClass =
    'w-full px-4 py-2 text-sm rounded-xl border border-slate-200 bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400';

  const getSectionIcon = (title: string) => {
    if (title.includes('Document')) return <FileText className="w-5 h-5" />;
    if (title.includes('Buyer') || title.includes('Supplier')) return <FileSpreadsheet className="w-5 h-5" />;
    if (title.includes('Dispatch') || title.includes('Vehicle')) return <Truck className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const renderField = (field: FieldDef) => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'date':
        return (
          <div className="relative group">
            <CustomDatePicker
              id={field.name}
              selected={selectedDate || null}
              onChange={(date: Date | null) => date && onDateChange?.(date)}
              dateFormat="dd-MM-yyyy"
              className={inputClass}
            />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            name={`field_v_${field.name}`}
            value={value}
            onChange={onChange}
            required={field.required}
            rows={field.rows ?? 2}
            placeholder={field.placeholder}
            autoComplete="off"
            className={`${inputClass} resize-none`}
          />
        );

      case 'select':
        return (
          <select
            name={`field_v_${field.name}`}
            value={value}
            onChange={onChange}
            required={field.required}
            autoComplete="off"
            className={inputClass}
          >
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'readonly':
        return (
          <input
            type="text"
            value={value}
            readOnly
            className="w-full px-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-medium"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            name={`field_v_${field.name}`}
            value={value}
            onChange={onChange}
            required={field.required}
            placeholder={field.placeholder}
            min={field.min}
            step={field.step}
            autoComplete="off"
            className={inputClass}
          />
        );

      default: // 'text'
        if (field.name === 'buyerName' || field.name === 'supplierName') {
          return (
            <div className="relative" ref={entityDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  name={`field_v_${field.name}`}
                  value={value}
                  onChange={onChange}
                  onFocus={onEntityInputFocus}
                  required={field.required}
                  placeholder={field.placeholder || `Search or add ${field.name === 'supplierName' ? 'supplier' : 'buyer'}...`}
                  autoComplete="off"
                  className={`pr-10 ${inputClass}`}
                />
                <ChevronsUpDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              
              {showEntityDropdown && entitySearchOptions && entitySearchOptions.length > 0 && (
                  <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="max-h-60 overflow-auto py-2">
                        <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Existing</div>
                        {entitySearchOptions.map((entity) => (
                            <div
                                key={entity._id || entity.id}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group border-l-4 border-transparent hover:border-blue-500"
                                onClick={() => {
                                  if (onEntitySelect) onEntitySelect(entity);
                                }}
                            >
                                <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{entity.name}</div>
                                {entity.gstNo && <div className="text-xs text-slate-400 font-medium">GST: {entity.gstNo}</div>}
                            </div>
                        ))}
                      </div>
                  </div>
              )}
              {showEntityDropdown && value && entitySearchOptions && entitySearchOptions.length === 0 && (
                  <div className="absolute z-[100] w-full mt-2 bg-blue-900 border border-blue-800 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-800 text-blue-300 flex items-center justify-center">
                          <PlusCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Add as new {field.name === 'supplierName' ? 'supplier' : 'buyer'}?</p>
                          <p className="text-[10px] text-blue-400 font-medium">We'll save this info for next time.</p>
                        </div>
                      </div>
                  </div>
              )}
            </div>
          );
        }

        return (
          <input
            type="text"
            name={`field_v_${field.name}`}
            value={value}
            onChange={onChange}
            required={field.required}
            placeholder={field.placeholder}
            autoComplete="off"
            className={inputClass}
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-200">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
        <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 flex items-center justify-center">
          {getSectionIcon(section.title)}
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{section.title}</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {section.fields.map(field => (
            <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : ''}>
              <label 
                htmlFor={`field_v_${field.name}`}
                className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField({ ...field, name: `field_v_${field.name}` })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── FormSections (multiple sections at once) ─────────────────────────────────

interface FormSectionsProps {
  sections: SectionDef[];
  formData: any;
  selectedDate?: Date;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onDateChange?: (date: Date) => void;
  entitySearchOptions?: any[];
  showEntityDropdown?: boolean;
  onEntitySelect?: (entity: any) => void;
  entityDropdownRef?: React.RefObject<HTMLDivElement>;
  onEntityInputFocus?: () => void;
}

/**
 * Renders all sections for a document form from configuration.
 * Drop-in replacement for the manually written section JSX in each form.
 */
export const FormSections: React.FC<FormSectionsProps> = ({
  sections,
  formData,
  selectedDate,
  onChange,
  onDateChange,
  entitySearchOptions,
  showEntityDropdown,
  onEntitySelect,
  entityDropdownRef,
  onEntityInputFocus,
}) => (
  <>
    {sections.map((section, i) => (
      <FormSection
        key={i}
        section={section}
        formData={formData}
        selectedDate={selectedDate}
        onChange={onChange}
        onDateChange={onDateChange}
        entitySearchOptions={entitySearchOptions}
        showEntityDropdown={showEntityDropdown}
        onEntitySelect={onEntitySelect}
        entityDropdownRef={entityDropdownRef}
        onEntityInputFocus={onEntityInputFocus}
      />
    ))}
  </>
);

export default FormSections;
