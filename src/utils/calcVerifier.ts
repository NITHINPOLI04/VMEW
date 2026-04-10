/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CalcVerifier — Financial Calculation Verification Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Compares stored/displayed values against the canonical CalcEngine output.
 * Detects mismatches, classifies severity, and optionally auto-corrects.
 *
 * Usage:
 *   import { verifyDocument, autoCorrectDocument } from './calcVerifier';
 *
 *   const result = verifyDocument(invoiceData);
 *   if (!result.isValid) {
 *     console.warn('Mismatches found:', result.mismatches);
 *   }
 */

import {
  computeDocumentTotals,
  makeDiscountConfig,
  round2,
  type CalcItem,
  type DocumentTotals,
  type TaxType,
} from './calcEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Mismatch {
  field: string;
  stored: number;
  computed: number;
  difference: number;
}

export type MismatchSeverity = 'none' | 'rounding' | 'material';

export interface VerificationResult<TItem extends CalcItem = CalcItem> {
  isValid: boolean;
  mismatches: Mismatch[];
  correctedTotals: DocumentTotals<TItem>;
  severity: MismatchSeverity;
  totalDrift: number; // Absolute sum of all differences
}

/** The shape of a stored document that can be verified */
export interface VerifiableDocument<TItem extends CalcItem = CalcItem> {
  items: TItem[];
  taxType: string;
  grandTotal: number;
  subTotal?: number;
  discountEnabled?: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  discountType?: string;
  discountFixedAmount?: number;
  totalSgst?: number;
  totalCgst?: number;
  totalIgst?: number;
  [key: string]: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Mismatches ≤ this amount (in ₹) are classified as 'rounding' */
const ROUNDING_THRESHOLD = 1.0;

/** Tolerance for individual field comparison (in ₹) */
const FIELD_TOLERANCE = 0.01;

// ─── Core Verification ───────────────────────────────────────────────────────

/**
 * Compares a stored document's totals against freshly computed values.
 * Returns a detailed report with mismatches, severity, and corrected totals.
 */
export const verifyDocument = <TItem extends CalcItem = CalcItem>(
  doc: VerifiableDocument<TItem>,
  toleranceOverride?: number
): VerificationResult<TItem> => {
  const tolerance = toleranceOverride ?? FIELD_TOLERANCE;

  // Recompute from items using the canonical engine
  const discountConfig = makeDiscountConfig(
    doc.discountEnabled || false,
    doc.discountPercentage || 0,
    (doc.discountType as 'percentage' | 'fixed') || 'percentage',
    doc.discountFixedAmount || 0
  );

  const computed = computeDocumentTotals(
    doc.items,
    discountConfig,
    (doc.taxType || 'sgstcgst') as TaxType
  );

  // Compare each field
  const mismatches: Mismatch[] = [];

  const compare = (field: string, stored: number | undefined, computedVal: number) => {
    const storedVal = stored ?? 0;
    const diff = round2(Math.abs(storedVal - computedVal));
    if (diff > tolerance) {
      mismatches.push({
        field,
        stored: storedVal,
        computed: computedVal,
        difference: diff,
      });
    }
  };

  compare('subTotal', doc.subTotal, computed.subTotal);
  compare('discountAmount', doc.discountAmount, computed.discountAmount);
  compare('grandTotal', doc.grandTotal, computed.grandTotal);

  if ((doc.taxType || 'sgstcgst') === 'sgstcgst') {
    compare('totalSgst', doc.totalSgst, computed.totalSgst);
    compare('totalCgst', doc.totalCgst, computed.totalCgst);
  } else {
    compare('totalIgst', doc.totalIgst, computed.totalIgst);
  }

  // Compute severity
  const totalDrift = round2(
    mismatches.reduce((sum, m) => sum + m.difference, 0)
  );

  let severity: MismatchSeverity = 'none';
  if (mismatches.length > 0) {
    severity = totalDrift <= ROUNDING_THRESHOLD ? 'rounding' : 'material';
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    correctedTotals: computed,
    severity,
    totalDrift,
  };
};

// ─── Auto-Correction ─────────────────────────────────────────────────────────

/**
 * Returns a copy of the document with all financial fields corrected
 * to match the canonical computation. Non-financial fields are preserved.
 *
 * This is the "Option A" behavior: silent auto-correct.
 */
export const autoCorrectDocument = <T extends VerifiableDocument<any>>(
  doc: T
): T & { _verificationApplied: boolean } => {
  const discountConfig = makeDiscountConfig(
    doc.discountEnabled || false,
    doc.discountPercentage || 0,
    (doc.discountType as 'percentage' | 'fixed') || 'percentage',
    doc.discountFixedAmount || 0
  );

  const computed = computeDocumentTotals(
    doc.items,
    discountConfig,
    (doc.taxType || 'sgstcgst') as TaxType
  );

  return {
    ...doc,
    subTotal: computed.subTotal,
    discountAmount: computed.discountAmount,
    totalSgst: computed.totalSgst,
    totalCgst: computed.totalCgst,
    totalIgst: computed.totalIgst,
    grandTotal: computed.grandTotal,
    _verificationApplied: true,
  };
};

// ─── Convenience: Verify & Compute for Preview/PDF ───────────────────────────

/**
 * All-in-one function for preview pages and PDF generation.
 * Verifies the document, logs warnings for material mismatches,
 * and returns the corrected totals + discountedItems to use for display.
 *
 * This replaces the scattered `calculateDiscountedTaxes()` calls in preview pages.
 */
export const getVerifiedTotals = <TItem extends CalcItem = CalcItem>(
  doc: VerifiableDocument<TItem>
): DocumentTotals<TItem> & { verification: VerificationResult<TItem> } => {
  const result = verifyDocument(doc);

  // Return the corrected (canonical) values regardless
  return {
    ...result.correctedTotals,
    verification: result,
  };
};
