/**
 * Utility for calculating taxes and discounts across the application.
 * Ensures GST is calculated on the discounted subtotal.
 */

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

export const calculateDiscountedTaxes = (
    items: any[],
    discountEnabled: boolean,
    discountPercentage: number
): TaxTotals => {
    let subTotal = 0;
    let totalSgstTemp = 0;
    let totalCgstTemp = 0;
    let totalIgstTemp = 0;

    items.forEach(item => {
        subTotal += (item.taxableAmount || 0);
        totalSgstTemp += (item.sgstAmount || 0);
        totalCgstTemp += (item.cgstAmount || 0);
        totalIgstTemp += (item.igstAmount || 0);
    });

    const discountAmount = discountEnabled ? (subTotal * (discountPercentage || 0)) / 100 : 0;
    const totalTaxableValue = subTotal - discountAmount;

    // Recalculate tax based on the ratio if subtotal changed due to discount
    let totalSgst = 0;
    let totalCgst = 0;
    let totalIgst = 0;
    const ratio = subTotal > 0 ? totalTaxableValue / subTotal : 1;

    if (subTotal > 0) {
        totalSgst = totalSgstTemp * ratio;
        totalCgst = totalCgstTemp * ratio;
        totalIgst = totalIgstTemp * ratio;
    }

    // Proportional scaling for each item to ensure table rows match totals
    const discountedItems = items.map(item => ({
        ...item,
        sgstAmount: (item.sgstAmount || 0) * ratio,
        cgstAmount: (item.cgstAmount || 0) * ratio,
        igstAmount: (item.igstAmount || 0) * ratio
    }));

    let grandTotal = totalTaxableValue + totalSgst + totalCgst + totalIgst;

    // Standard rounding for grand total
    const decimalPart = grandTotal % 1;
    if (decimalPart >= 0.50) grandTotal = Math.ceil(grandTotal);
    else grandTotal = Math.floor(grandTotal);

    return {
        subTotal,
        discountAmount,
        totalTaxableValue,
        totalSgst,
        totalCgst,
        totalIgst,
        grandTotal,
        discountedItems
    };
};
