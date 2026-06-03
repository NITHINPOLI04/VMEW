/**
 * Converts a financial year string like "2026-2027" to short format like "26-27"
 */
export const formatFY = (fy: string): string => {
  const parts = fy.split('-');
  if (parts.length === 2) {
    const y1 = parts[0].slice(-2);
    const y2 = parts[1].slice(-2);
    return `${y1}-${y2}`;
  }
  return fy;
};

/**
 * Calculates the next document number by incrementing the max sequence number found
 * in existing documents for the specified financial year.
 */
export const getNextDocumentNumber = (documents: any[], numberKey: string, fy: string): string => {
  const formattedFY = formatFY(fy);
  const pattern = `/VMEW/${formattedFY}`;
  let maxNo = 0;

  if (Array.isArray(documents)) {
    documents.forEach((doc) => {
      const docNum = doc[numberKey];
      if (docNum && typeof docNum === 'string') {
        if (docNum.endsWith(pattern)) {
          const prefix = docNum.split('/VMEW/')[0];
          const num = parseInt(prefix, 10);
          if (!isNaN(num) && num > maxNo) {
            maxNo = num;
          }
        }
      }
    });
  }

  const nextNo = maxNo + 1;
  const formattedNo = nextNo < 10 ? `0${nextNo}` : `${nextNo}`;
  return `${formattedNo}/VMEW/${formattedFY}`;
};
