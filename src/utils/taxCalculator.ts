/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPRECATED — Use calcEngine.ts instead
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file is kept for backward compatibility only.
 * All calculation logic has been consolidated into `calcEngine.ts`.
 *
 * @deprecated Use `computeDocumentTotals` from './calcEngine' for new code.
 */

import { computeFromLegacyParams, type DocumentTotals } from './calcEngine';

export interface TaxTotals {
    subTotal: number;
    discountAmount: number;
    totalTaxableValue: number;
    totalSgst: number;
    totalCgst: number;
    totalIgst: number;
    grandTotal: number;
    discountedItems: any[];
}

/**
 * @deprecated Use `computeDocumentTotals` from `./calcEngine` instead.
 *
 * This wrapper delegates to the canonical CalcEngine but preserves the
 * original function signature so existing imports don't break.
 */
export const calculateDiscountedTaxes = (
    items: any[],
    discountEnabled: boolean,
    discountPercentage: number,
    taxType: string = 'sgstcgst'
): TaxTotals => {
    const result: DocumentTotals = computeFromLegacyParams(
        items,
        discountEnabled,
        discountPercentage,
        taxType
    );

    return {
        subTotal: result.subTotal,
        discountAmount: result.discountAmount,
        totalTaxableValue: result.totalTaxableValue,
        totalSgst: result.totalSgst,
        totalCgst: result.totalCgst,
        totalIgst: result.totalIgst,
        grandTotal: result.grandTotal,
        discountedItems: result.discountedItems,
    };
};
