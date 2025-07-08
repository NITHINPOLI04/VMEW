import { toWords } from 'number-to-words';

export const convertToWords = (amount: number): string => {
  try {
    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Math.round(amount * 100) / 100;
    
    // Split the amount into whole number and decimal parts
    const [wholeNumber, decimal] = roundedAmount.toFixed(2).split('.');
    
    // Convert the whole number to words (default English)
    let words = toWords(parseInt(wholeNumber, 10));
    
    // Capitalize the first letter
    words = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
    
    // Custom Indian numbering (if needed, though number-to-words with en-IN should handle this)
    // For now, rely on default and add currency
    const decimalValue = parseInt(decimal, 10);
    if (decimalValue > 0) {
      const decimalWords = toWords(decimalValue);
      return `${words} Rupees and ${decimalWords} Paise only`;
    } else {
      return `${words} Rupees only`;
    }
  } catch (error) {
    console.error('Error converting number to words:', error);
    return 'Amount conversion error';
  }
};