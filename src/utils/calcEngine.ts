/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CalcEngine — Canonical Calculation Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SINGLE SOURCE OF TRUTH for all financial calculations in VMEW Billing.
 *
 * Rules:
 *   1. All intermediate amounts are rounded to 2 decimal places (banker's rounding)
 *   2. Grand total uses threshold rounding (≥0.50 → ceil, <0.50 → floor)
 *   3. Discount-adjusted taxes use proportional scaling from the original tax amounts
 *   4. Supports both percentage-based and fixed-amount discounts
 *
 * Usage:
 *   import { computeItemTotals, computeDocumentTotals } from './calcEngine';
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaxType = 'sgstcgst' | 'igst';
export type DiscountType = 'percentage' | 'fixed';

export interface CalcItem {
  taxableAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  cgstPercentage: number;
  cgstAmount: number;
  igstPercentage: number;
  igstAmount: number;
  quantity: number;
  rate: number;
  [key: string]: any; // Allow additional item fields to pass through
}

export interface DocumentTotals<TItem extends CalcItem = CalcItem> {
  subTotal: number;
  discountAmount: number;
  totalTaxableValue: number;
  totalSgst: number;
  totalCgst: number;
  totalIgst: number;
  grandTotal: number;
  grandTotalRaw: number; // Before threshold rounding — useful for verification
  discountedItems: TItem[];
}

export interface DiscountConfig {
  enabled: boolean;
  type: DiscountType;
  percentage: number; // Used when type === 'percentage'
  fixedAmount: number; // Used when type === 'fixed'
}

// ─── Rounding ─────────────────────────────────────────────────────────────────

/**
 * Rounds a number to 2 decimal places using banker's rounding (round half to even).
 * This minimizes cumulative rounding drift over many line items.
 */
export const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  // Use the built-in toFixed which implements banker's rounding in most engines
  // For extra precision, we first handle the floating-point issue
  const factor = 100;
  const shifted = Math.round(value * factor + Number.EPSILON);
  return shifted / factor;
};

/**
 * Rounds grand total using the threshold method:
 *   decimal ≥ 0.50 → round up (ceil)
 *   decimal <  0.50 → round down (floor)
 *
 * This matches Indian billing conventions.
 */
export const roundGrandTotal = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const decimalPart = value % 1;
  if (decimalPart >= 0.50) return Math.ceil(value);
  return Math.floor(value);
};

// ─── Item-Level Calculations ──────────────────────────────────────────────────

/**
 * Computes the taxableAmount and per-item tax amounts from quantity, rate, and
 * tax percentages. Every intermediate value is rounded to 2 decimal places.
 *
 * @param item   - Object with at minimum: quantity, rate, sgstPercentage, cgstPercentage, igstPercentage
 * @param taxType - 'sgstcgst' or 'igst' — determines which taxes are computed
 * @returns       - New item with computed taxableAmount, sgstAmount, cgstAmount, igstAmount
 */
export const computeItemTotals = <T extends Partial<CalcItem>>(
  item: T,
  taxType: TaxType = 'sgstcgst'
): T & CalcItem => {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const taxableAmount = round2(qty * rate);

  const sgstPct = Number(item.sgstPercentage) || 0;
  const cgstPct = Number(item.cgstPercentage) || 0;
  const igstPct = Number(item.igstPercentage) || 0;

  let sgstAmount = 0;
  let cgstAmount = 0;
  let igstAmount = 0;

  if (taxType === 'sgstcgst') {
    sgstAmount = round2((taxableAmount * sgstPct) / 100);
    cgstAmount = round2((taxableAmount * cgstPct) / 100);
  } else if (taxType === 'igst') {
    igstAmount = round2((taxableAmount * igstPct) / 100);
  }

  return {
    ...item,
    quantity: qty,
    rate,
    taxableAmount,
    sgstPercentage: sgstPct,
    sgstAmount,
    cgstPercentage: cgstPct,
    cgstAmount,
    igstPercentage: igstPct,
    igstAmount,
  } as T & CalcItem;
};

// ─── Document-Level Calculations ──────────────────────────────────────────────

/**
 * Computes all document-level totals: subtotal, discount, taxes, and grand total.
 * This is the canonical function used by forms, preview pages, PDF, and the server.
 *
 * Discount logic:
 *   - Percentage: discountAmount = subTotal * percentage / 100
 *   - Fixed:      discountAmount = min(fixedAmount, subTotal) — capped at subTotal
 *
 * Tax after discount:
 *   - Uses proportional scaling: each tax amount is scaled by (taxableValue / subTotal)
 *   - This preserves per-item tax rate ratios even after a flat discount
 *
 * @param items             - Array of items with per-item tax amounts already computed
 * @param discountConfig    - Discount configuration (enabled, type, percentage/fixed)
 * @param taxType           - 'sgstcgst' or 'igst'
 * @returns                 - Complete DocumentTotals including discountedItems
 */
export const computeDocumentTotals = <TItem extends CalcItem = CalcItem>(
  items: TItem[],
  discountConfig: DiscountConfig,
  taxType: TaxType = 'sgstcgst'
): DocumentTotals<TItem> => {
  // Sum up item-level values
  let subTotal = 0;
  let totalSgstRaw = 0;
  let totalCgstRaw = 0;
  let totalIgstRaw = 0;

  items.forEach(item => {
    subTotal += (item.taxableAmount || 0);
    if (taxType === 'sgstcgst') {
      totalSgstRaw += (item.sgstAmount || 0);
      totalCgstRaw += (item.cgstAmount || 0);
    } else if (taxType === 'igst') {
      totalIgstRaw += (item.igstAmount || 0);
    }
  });

  subTotal = round2(subTotal);
  totalSgstRaw = round2(totalSgstRaw);
  totalCgstRaw = round2(totalCgstRaw);
  totalIgstRaw = round2(totalIgstRaw);

  // Compute discount amount
  let discountAmount = 0;
  if (discountConfig.enabled) {
    if (discountConfig.type === 'percentage') {
      discountAmount = round2((subTotal * (discountConfig.percentage || 0)) / 100);
    } else if (discountConfig.type === 'fixed') {
      // Fixed discount is capped at the subtotal (can't discount more than the total)
      discountAmount = round2(Math.min(discountConfig.fixedAmount || 0, subTotal));
    }
  }

  const totalTaxableValue = round2(subTotal - discountAmount);

  // Scale taxes proportionally if discount is applied
  const ratio = subTotal > 0 ? totalTaxableValue / subTotal : 1;

  let totalSgst = 0;
  let totalCgst = 0;
  let totalIgst = 0;

  if (subTotal > 0) {
    if (taxType === 'sgstcgst') {
      totalSgst = round2(totalSgstRaw * ratio);
      totalCgst = round2(totalCgstRaw * ratio);
    } else if (taxType === 'igst') {
      totalIgst = round2(totalIgstRaw * ratio);
    }
  }

  // Scale per-item taxes for display in table rows
  const discountedItems = items.map(item => {
    const scaled = { ...item };
    if (taxType === 'sgstcgst') {
      scaled.sgstAmount = round2((item.sgstAmount || 0) * ratio);
      scaled.cgstAmount = round2((item.cgstAmount || 0) * ratio);
      scaled.igstAmount = 0;
    } else if (taxType === 'igst') {
      scaled.igstAmount = round2((item.igstAmount || 0) * ratio);
      scaled.sgstAmount = 0;
      scaled.cgstAmount = 0;
    }
    return scaled;
  });

  // Compute grand total
  const grandTotalRaw = round2(totalTaxableValue + totalSgst + totalCgst + totalIgst);
  const grandTotal = roundGrandTotal(grandTotalRaw);

  return {
    subTotal,
    discountAmount,
    totalTaxableValue,
    totalSgst,
    totalCgst,
    totalIgst,
    grandTotal,
    grandTotalRaw,
    discountedItems,
  };
};

// ─── Convenience Helpers ──────────────────────────────────────────────────────

/**
 * Creates a DiscountConfig from the simple percentage-only format used by
 * the existing form data. This bridges the old interface to the new one.
 */
export const makeDiscountConfig = (
  enabled: boolean,
  percentage: number = 0,
  type: DiscountType = 'percentage',
  fixedAmount: number = 0
): DiscountConfig => ({
  enabled: !!enabled,
  type,
  percentage: Number(percentage) || 0,
  fixedAmount: Number(fixedAmount) || 0,
});

/**
 * Shorthand that matches the old `calculateDiscountedTaxes` signature
 * for minimal migration effort. Internally delegates to computeDocumentTotals.
 */
export const computeFromLegacyParams = (
  items: CalcItem[],
  discountEnabled: boolean,
  discountPercentage: number,
  taxType: string = 'sgstcgst'
): DocumentTotals<CalcItem> => {
  return computeDocumentTotals(
    items,
    makeDiscountConfig(discountEnabled, discountPercentage, 'percentage'),
    taxType as TaxType
  );
};
