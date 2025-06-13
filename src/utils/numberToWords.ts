import { toWords } from 'number-to-words';

export const convertToWords = (amount: number): string => {
  try {
    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Math.round(amount * 100) / 100;
    
    // Split the amount into whole number and decimal parts
    const [wholeNumber, decimal] = roundedAmount.toFixed(2).split('.');
    
    // Convert the whole number to words
    let words = toWords(parseInt(wholeNumber, 10));
    
    // Capitalize the first letter
    words = words.charAt(0).toUpperCase() + words.slice(1);
    
    // Handle decimal part
    const decimalValue = parseInt(decimal, 10);
    
    if (decimalValue > 0) {
      // Convert decimal part to words as well
      const decimalWords = toWords(decimalValue);
      return `${words} and ${decimalWords} paise only`;
    } else {
      return `${words} only`;
    }
  } catch (error) {
    console.error('Error converting number to words:', error);
    return 'Amount conversion error';
  }
};