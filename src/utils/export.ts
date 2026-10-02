import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

// Ensure plugin is applied to jsPDF if needed
try {
  if (typeof applyPlugin === 'function') {
    applyPlugin(jsPDF);
  }
} catch {
  // Ignore fallback
}

export function exportToExcel(data: any[], filename: string = 'export', sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Format column widths
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(item => (item[key] ? String(item[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCsv(data: any[], filename: string = 'export') {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel & spreadsheet tools correctly display Arabic & special characters
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface PdfExportOptions {
  theme?: 'SAUDI_GREEN' | 'ENTERPRISE_BLUE';
  crNumber?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  orientation?: 'landscape' | 'portrait';
}

export function exportToPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string = 'report',
  companyName: string = 'Khyber Logistics services',
  options?: PdfExportOptions
) {
  const orientation = options?.orientation || 'landscape';
  const doc = new jsPDF({ orientation });
  const isBlue = options?.theme === 'ENTERPRISE_BLUE';

  // Palette definition
  // Saudi Green: Emerald [6, 78, 59] + Gold accent [217, 119, 6]
  // Enterprise Blue: Navy [15, 23, 42] / Sapphire [30, 58, 138] + Sky Blue accent [56, 189, 248]
  const headerBgColor: [number, number, number] = isBlue ? [15, 30, 65] : [6, 78, 59];
  const accentColor: [number, number, number] = isBlue ? [56, 189, 248] : [217, 119, 6];
  const tableHeaderColor: [number, number, number] = isBlue ? [30, 58, 138] : [6, 78, 59];

  // Top header banner
  doc.setFillColor(...headerBgColor);
  doc.rect(0, 0, doc.internal.pageSize.width, 26, 'F');

  // Decorative accent strip
  doc.setFillColor(...accentColor);
  doc.rect(0, 26, doc.internal.pageSize.width, 1.8, 'F');

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 11);

  // Subtitle / Report info
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isBlue ? 224 : 209, isBlue ? 242 : 250, isBlue ? 254 : 229);
  doc.text(
    `${title} — Generated on ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`,
    14,
    18
  );

  // Tax & CR credentials on right side if provided
  if (options?.crNumber || options?.vatNumber) {
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const crText = options.crNumber ? `CR: ${options.crNumber}` : '';
    const vatText = options.vatNumber ? `VAT: ${options.vatNumber}` : '';
    const metaText = [crText, vatText].filter(Boolean).join(' | ');
    doc.text(metaText, doc.internal.pageSize.width - 14, 11, { align: 'right' });
    
    doc.setFontSize(7.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('Kingdom of Saudi Arabia • ZATCA Compliant', doc.internal.pageSize.width - 14, 18, { align: 'right' });
  }

  // Table options
  const tableConfig: any = {
    startY: 33,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: tableHeaderColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: isBlue ? [240, 249, 255] : [248, 250, 252]
    },
    margin: { top: 33, left: 14, right: 14, bottom: 20 }
  };

  if (typeof autoTable === 'function') {
    autoTable(doc, tableConfig);
  } else if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(tableConfig);
  }

  // Footer page number
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Khyber Logistics Services • Kingdom of Saudi Arabia • Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export { generateCurrentViewPdf, type ViewPdfOptions } from './printPdfReport';
