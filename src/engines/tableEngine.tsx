/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { ChevronUp, ChevronDown, Trash } from 'lucide-react';

// ─── Column Definitions ───────────────────────────────────────────────────────

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnDef<T = any> {
  /** Header label */
  header: string;
  /** How to get display value from an item */
  render: (item: T, index: number) => React.ReactNode;
  align?: ColumnAlign;
  /** Extra className for <th> and <td> */
  className?: string;
}

// ─── Document Column Configs ──────────────────────────────────────────────────

export const buildInvoiceColumns = (taxType: string): ColumnDef[] => {
  const base: ColumnDef[] = [
    { header: 'S. No.', render: (_, i) => i + 1 },
    { header: 'Description of Goods', render: item => item.description, className: 'description-cell' },
    { header: 'HSN/SAC Code', render: item => item.hsnSacCode },
    { header: 'Qty', render: item => item.quantity, align: 'center' },
    { header: 'Unit', render: item => item.unit, align: 'center' },
    { header: 'Rate', render: item => `₹${item.rate.toFixed(2)}`, align: 'right' },
    { header: 'Taxable Amount', render: item => `₹${item.taxableAmount.toFixed(2)}`, align: 'right' },
  ];

  if (taxType === 'igst') {
    return [
      ...base,
      { header: 'IGST %', render: item => `${item.igstPercentage}%`, align: 'center' },
      { header: 'IGST Amount', render: item => `₹${item.igstAmount.toFixed(2)}`, align: 'right' },
    ];
  }
  return [
    ...base,
    { header: 'SGST %', render: item => `${item.sgstPercentage}%`, align: 'center' },
    { header: 'SGST Amount', render: item => `₹${item.sgstAmount.toFixed(2)}`, align: 'right' },
    { header: 'CGST %', render: item => `${item.cgstPercentage}%`, align: 'center' },
    { header: 'CGST Amount', render: item => `₹${item.cgstAmount.toFixed(2)}`, align: 'right' },
  ];
};

export const buildQuotationColumns = (taxType: string): ColumnDef[] =>
  buildInvoiceColumns(taxType);

export const buildDCColumns = (): ColumnDef[] => [
  { header: 'S. No.', render: (_, i) => i + 1 },
  { header: 'Description of Goods', render: item => item.description, className: 'description-cell' },
  { header: 'HSN/SAC Code', render: item => item.hsnSacCode },
  { header: 'Qty', render: item => item.quantity, align: 'center' },
  { header: 'Unit', render: item => item.unit, align: 'center' },
];

export interface TaxableItem {
  id: string;
  description: string;
  hsnSacCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  sgstPercentage?: number;
  sgstAmount?: number;
  cgstPercentage?: number;
  cgstAmount?: number;
  igstPercentage?: number;
  igstAmount?: number;
}

export const buildPOColumns = (taxType: string): ColumnDef<TaxableItem>[] => {
  const base: ColumnDef<TaxableItem>[] = [
    { header: 'S. No.', render: (_, i) => i + 1 },
    { header: 'Description', render: item => item.description, className: 'description-cell' },
    { header: 'HSN/SAC', render: item => item.hsnSacCode || '-', align: 'center' },
    { header: 'Qty', render: item => item.quantity, align: 'center' },
    { header: 'Unit', render: item => item.unit, align: 'center' },
    { header: 'Rate (₹)', render: item => `₹${item.rate.toFixed(2)}`, align: 'right' },
    { header: 'Taxable Amt', render: item => `₹${(item.taxableAmount || 0).toFixed(2)}`, align: 'right' },
  ];

  if (taxType === 'igst') {
    return [
      ...base,
      { header: 'IGST %', render: item => `${item.igstPercentage || 0}%`, align: 'center' },
      { header: 'IGST Amt', render: item => `₹${(item.igstAmount || 0).toFixed(2)}`, align: 'right' },
    ];
  }
  return [
    ...base,
    { header: 'SGST %', render: item => `${item.sgstPercentage || 0}%`, align: 'center' },
    { header: 'SGST Amt', render: item => `₹${(item.sgstAmount || 0).toFixed(2)}`, align: 'right' },
    { header: 'CGST %', render: item => `${item.cgstPercentage || 0}%`, align: 'center' },
    { header: 'CGST Amt', render: item => `₹${(item.cgstAmount || 0).toFixed(2)}`, align: 'right' },
  ];
};

// ─── Footer row builders ──────────────────────────────────────────────────────

export interface FooterCell {
  colSpan?: number;
  content: React.ReactNode;
  align?: ColumnAlign;
}

const buildTaxFooter = (
  items: TaxableItem[],
  colCount: number,
  taxType: string,
  hasTaxable: boolean
): FooterCell[] => {
  const totalTaxable = items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalSgst = items.reduce((s, i) => s + (i.sgstAmount || 0), 0);
  const totalCgst = items.reduce((s, i) => s + (i.cgstAmount || 0), 0);
  const totalIgst = items.reduce((s, i) => s + (i.igstAmount || 0), 0);

  if (!hasTaxable) return [];

  if (taxType === 'igst') {
    // Base cols before taxable: Sl, Description, HSN, Qty, Unit, Rate = 6 → label in col 6
    return [
      { colSpan: colCount - 3, content: 'Total:', align: 'right' },
      { content: `₹${totalTaxable.toFixed(2)}`, align: 'right' },
      { content: '' },
      { content: `₹${totalIgst.toFixed(2)}`, align: 'right' },
    ];
  }
  return [
    { colSpan: colCount - 5, content: 'Total:', align: 'right' },
    { content: `₹${totalTaxable.toFixed(2)}`, align: 'right' },
    { content: '' },
    { content: `₹${totalSgst.toFixed(2)}`, align: 'right' },
    { content: '' },
    { content: `₹${totalCgst.toFixed(2)}`, align: 'right' },
  ];
};

// ─── DocumentItemsTable Component ─────────────────────────────────────────────

interface DocumentItemsTableProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  taxType?: string;
  /** Pass false to hide the totals footer row (e.g. DC) */
  showFooter?: boolean;
}

export const DocumentItemsTable = <T,>({
  items,
  columns,
  taxType,
  showFooter = true,
}: DocumentItemsTableProps<T>): JSX.Element => {
  const thClass = (col: ColumnDef) =>
    `py-2 px-3 border-b border-r border-slate-200 text-${col.align || 'left'} text-xs font-medium text-slate-600 uppercase tracking-wider last:border-r-0 ${col.className || ''}`;

  const tdClass = (col: ColumnDef) =>
    `py-2 px-3 border-b border-r border-slate-200 text-sm text-${col.align || 'left'} text-slate-800 last:border-r-0 ${col.className || ''}`;

  const footerCells =
    showFooter && taxType
      ? buildTaxFooter((items as unknown) as TaxableItem[], columns.length, taxType, true)
      : [];

  return (
    <div className="mb-6 overflow-x-auto">
      <table className="min-w-full border border-slate-200">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((col, ci) => (
              <th key={ci} className={thClass(col)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {columns.map((col, ci) => (
                <td key={ci} className={tdClass(col)}>
                  {col.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerCells.length > 0 && (
          <tfoot>
            <tr className="bg-slate-100">
              {footerCells.map((cell, ci) => (
                <td
                  key={ci}
                  colSpan={cell.colSpan}
                  className={`py-2 px-3 border-b border-r border-slate-200 font-medium last:border-r-0 text-${cell.align || 'left'}`}
                >
                  {cell.content}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

// ─── ItemRow Engine ───────────────────────────────────────────────────────────

/** Shared item-row controls (move up/down, delete) */
interface ItemRowControlsProps {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export const ItemRowControls: React.FC<ItemRowControlsProps> = ({
  index, total, onMoveUp, onMoveDown, onRemove,
}) => (
  <div className="flex space-x-2">
    <button type="button" onClick={onMoveUp} disabled={index === 0}
      className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors"
      aria-label="Move item up">
      <ChevronUp className="h-5 w-5" />
    </button>
    <button type="button" onClick={onMoveDown} disabled={index === total - 1}
      className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors"
      aria-label="Move item down">
      <ChevronDown className="h-5 w-5" />
    </button>
    <button type="button" onClick={onRemove}
      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
      aria-label="Remove item">
      <Trash className="h-5 w-5" />
    </button>
  </div>
);

/**
 * Shared unit selector used across all document item rows.
 */
export const UnitSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-1/3 px-2 py-2 rounded-r-md border border-slate-300 border-l-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
    aria-label="Select unit of measurement"
  >
    <option value="Nos">Nos</option>
    <option value="Mts">Mts</option>
    <option value="Lts">Lts</option>
    <option value="Pkt">Pkt</option>
    <option value="Kgs">Kgs</option>
  </select>
);

/**
 * Shared tax fields row (SGST/CGST or IGST).
 * Used by Invoice, Quotation, and Purchase Order items.
 */
export const TaxFieldsRow: React.FC<{
  taxType: string;
  item: any;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}> = ({ taxType, item, onChange, compact }) => {
  const inputClass = `w-full px-3 py-1.5 text-sm rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500`;
  const readonlyClass = `w-full px-3 py-1.5 text-sm rounded bg-slate-50 border border-slate-200 text-slate-600`;
  const containerClass = compact
    ? 'p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4'
    : 'grid grid-cols-1 md:grid-cols-4 gap-4';

  return (
    <div className={containerClass}>
      {taxType === 'sgstcgst' ? (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">SGST %</label>
            <input type="number" value={item.sgstPercentage}
              onChange={e => onChange('sgstPercentage', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">SGST Amt</label>
            <input type="number" value={item.sgstAmount?.toFixed(2)} readOnly className={readonlyClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">CGST %</label>
            <input type="number" value={item.cgstPercentage}
              onChange={e => onChange('cgstPercentage', e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">CGST Amt</label>
            <input type="number" value={item.cgstAmount?.toFixed(2)} readOnly className={readonlyClass} />
          </div>
        </>
      ) : (
        <>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">IGST %</label>
            <input type="number" value={item.igstPercentage}
              onChange={e => onChange('igstPercentage', e.target.value)}
              className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">IGST Amt</label>
            <input type="number" value={item.igstAmount?.toFixed(2)} readOnly className={readonlyClass} />
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Shared form totals summary panel.
 * Used by Invoice, Quotation, and Purchase Order item sections.
 */
export const ItemTotalsSummary: React.FC<{
  items: any[];
  taxType: string;
  grandTotal: number;
  discountEnabled?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  subTotal?: number;
  totalSgst?: number;
  totalCgst?: number;
  totalIgst?: number;
}> = ({ items, taxType, grandTotal, discountEnabled, discountPercentage, discountAmount, subTotal, totalSgst, totalCgst, totalIgst }) => {
  const computedSubTotal = subTotal !== undefined ? subTotal : items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const compDiscountAmount = discountAmount !== undefined ? discountAmount : 0;
  const compDiscountPercentage = discountPercentage !== undefined ? discountPercentage : 0;
  
  const compTotalSgst = totalSgst !== undefined ? totalSgst : items.reduce((s, i) => s + (i.sgstAmount || 0), 0);
  const compTotalCgst = totalCgst !== undefined ? totalCgst : items.reduce((s, i) => s + (i.cgstAmount || 0), 0);
  const compTotalIgst = totalIgst !== undefined ? totalIgst : items.reduce((s, i) => s + (i.igstAmount || 0), 0);

  const rowClass = "flex justify-between items-center py-1";
  const labelClass = "text-xs font-bold text-slate-400 uppercase tracking-widest";
  const valueClass = "text-sm font-bold text-slate-700";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className={rowClass}>
          <span className={labelClass}>Subtotal</span>
          <span className={valueClass}>₹{computedSubTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {discountEnabled && (
          <div className={rowClass}>
            <span className={`${labelClass} text-emerald-500`}>Discount ({compDiscountPercentage}%)</span>
            <span className="text-sm font-bold text-emerald-600">-₹{compDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        <div className="h-px bg-slate-100 my-2"></div>

        {taxType === 'sgstcgst' ? (
          <>
            <div className={rowClass}>
              <span className={labelClass}>SGST</span>
              <span className={valueClass}>₹{compTotalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={rowClass}>
              <span className={labelClass}>CGST</span>
              <span className={valueClass}>₹{compTotalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        ) : (
          <div className={rowClass}>
            <span className={labelClass}>IGST</span>
            <span className={valueClass}>₹{compTotalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t-2 border-slate-100">
        <div className="flex justify-between items-end">
          <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Grand Total</span>
          <div className="text-right">
            <span className="text-2xl font-black text-blue-900 tracking-tight">
              ₹{Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentItemsTable;
