import * as XLSX from 'xlsx-js-style';

/**
 * Common formatting function for all Excel exports.
 * Applies bold headers, numeric/text alignments, and auto-adjusts column widths.
 */
const formatAndExportSheet = (exportData: any[], sheetName: string, fileName: string) => {
  // If no data, return early
  if (!exportData || exportData.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(exportData);

  // 1. Auto-adjust column widths
  const colWidths: Record<string, number> = {};
  
  // Initialize with header lengths
  const headers = Object.keys(exportData[0] || {});
  headers.forEach((header, i) => {
    colWidths[i] = Math.max(10, header.length + 2); // Minimum width 10
  });

  // Check content lengths
  exportData.forEach((row) => {
    headers.forEach((header, i) => {
      const value = row[header];
      if (value !== null && value !== undefined && value !== '') {
        const valueLength = value.toString().length;
        if (valueLength + 2 > colWidths[i]) {
          colWidths[i] = Math.min(valueLength + 2, 50); // Cap width at 50 chars to avoid absurdly wide columns
        }
      }
    });
  });

  ws['!cols'] = Object.keys(colWidths).map((i) => ({ wch: colWidths[i as any] }));

  // 2. Apply Styles to Cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Pre-calculate which rows are empty to avoid adding borders to separator rows
  const rowIsEmpty: boolean[] = [];
  for (let R = range.s.r; R <= range.e.r; ++R) {
    let isEmpty = true;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr] && ws[addr].v !== '' && ws[addr].v !== null && ws[addr].v !== undefined) {
        isEmpty = false;
        break;
      }
    }
    rowIsEmpty[R] = isEmpty;
  }

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;

      const isHeader = R === 0;
      const cellValue = ws[addr].v;
      const isNumeric = typeof cellValue === 'number' && !isNaN(cellValue);
      const isLabelRow = !isHeader && typeof cellValue === 'string' && cellValue.startsWith('HSN:');

      ws[addr].s = {
        font: {
          bold: isHeader || isLabelRow,
          sz: isHeader ? 12 : 11,
          color: isLabelRow ? { rgb: "1E40AF" } : undefined // highlight the HSN group label softly
        },
        alignment: {
          vertical: 'center',
          horizontal: isHeader ? 'center' : (isNumeric ? 'right' : 'left'),
          wrapText: true,
        },
      };

      // Add borders everywhere where the row actually has data (not an empty separator row)
      if (!rowIsEmpty[R]) {
         ws[addr].s.border = {
           top: { style: 'thin', color: { rgb: "E2E8F0" } },
           bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
           left: { style: 'thin', color: { rgb: "E2E8F0" } },
           right: { style: 'thin', color: { rgb: "E2E8F0" } }
         };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};

/**
 * Standard Export formatting
 */
export const exportStandardExcel = (exportData: any[], sheetName: string, fileName: string) => {
  formatAndExportSheet(exportData, sheetName, fileName);
};

/**
 * Grouped by HSN Export
 * Takes an array of flattened items, groups them by HSN code, adds an empty row between groups,
 * and then exports utilizing standard formatting logic.
 */
export const exportGroupedExcel = (flattenedItems: any[], sheetName: string, fileName: string) => {
  // 1. Group by HSN
  const groupedData: Record<string, any[]> = {};
  
  flattenedItems.forEach(item => {
    // Treat undefined/null/empty as 'No HSN'
    const hsn = item['HSN/SAC Code'] || 'No HSN';
    if (!groupedData[hsn]) {
      groupedData[hsn] = [];
    }
    groupedData[hsn].push(item);
  });

  // 2. Sort groups by HSN key
  const sortedHsnKeys = Object.keys(groupedData).sort((a, b) => {
    if (a === 'No HSN') return 1;
    if (b === 'No HSN') return -1;
    return a.localeCompare(b);
  });

  // 3. Flatten group into an array, inserting an empty row between each group
  let finalExportData: any[] = [];
  const emptyRow: Record<string, any> = {}; 
  
  // create template for empty row using keys from the first available item
  if (flattenedItems.length > 0) {
    Object.keys(flattenedItems[0]).forEach(key => {
      emptyRow[key] = '';
    });
  }

  sortedHsnKeys.forEach((hsn, index) => {
    // Label Row for HSN group
    const labelRow = { ...emptyRow };
    if (flattenedItems.length > 0) {
      const firstColumnKey = Object.keys(flattenedItems[0])[0];
      labelRow[firstColumnKey] = `HSN: ${hsn}`;
    }
    
    // Push the label row, then the items
    finalExportData.push(labelRow);
    finalExportData = [...finalExportData, ...groupedData[hsn]];
    
    // Add an empty row after each group to firmly separate them
    if (index < sortedHsnKeys.length - 1) {
      finalExportData.push({ ...emptyRow });
    }
  });

  formatAndExportSheet(finalExportData, sheetName, fileName);
};
