import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ViewPdfOptions {
  filename?: string;
  reportTitle?: string;
  viewName?: string;
  orientation?: 'p' | 'portrait' | 'l' | 'landscape';
  unit?: 'mm' | 'pt' | 'px';
  companyName?: string;
  crNumber?: string;
  vatNumber?: string;
  includeTimestamp?: boolean;
}

/**
 * Generates a downloadable PDF report for the current view or specified element
 * using the existing print-friendly styles defined in index.css.
 */
export async function generateCurrentViewPdf(
  elementId: string = 'current-view-content',
  options?: ViewPdfOptions
): Promise<{ success: boolean; filename: string; blob?: Blob }> {
  try {
    // 1. Locate the target view element or fallback to main
    let targetElement = document.getElementById(elementId);
    if (!targetElement) {
      targetElement = document.querySelector('main');
    }
    if (!targetElement) {
      targetElement = document.body;
    }

    const viewTitle = options?.reportTitle || options?.viewName || 'Fleet Operations Report';
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const safeFilename = `${(options?.filename || `Khyber_${viewTitle.replace(/\s+/g, '_')}_${dateStr}`)}.pdf`;

    // 2. Temporarily inject a print-preparation container with official header if desired
    const originalOverflow = targetElement.style.overflow;
    targetElement.style.overflow = 'visible';

    // 3. Render using html2canvas with print color fidelity
    const canvas = await html2canvas(targetElement, {
      scale: 2, // High resolution for crisp printing
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1280, // Consistent desktop report layout
      ignoreElements: (element) => {
        // Obey existing print-friendly rules from index.css
        if (
          element.classList.contains('no-print') ||
          element.classList.contains('print-hide') ||
          element.classList.contains('print-hide-tabs')
        ) {
          return true;
        }
        // Don't render floating overlays, audio testing menus, or fixed modals
        if (
          element.tagName === 'HEADER' &&
          element.classList.contains('sticky')
        ) {
          return true;
        }
        return false;
      }
    });

    targetElement.style.overflow = originalOverflow;

    // 4. Calculate dimensions for A4 PDF
    const orientation = options?.orientation || (canvas.width > canvas.height * 1.2 ? 'landscape' : 'portrait');
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Top banner margin for official header branding
    const headerHeight = 16;
    const footerHeight = 10;
    const marginX = 8;
    const contentWidth = pageWidth - (marginX * 2);

    // Calculate scaled image dimensions
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    const availableHeightPerPage = pageHeight - headerHeight - footerHeight;

    const totalPages = Math.ceil(imgHeight / availableHeightPerPage) || 1;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Draw Top Header Banner (Authentic Saudi Logistics Green #006C35 & Gold)
      pdf.setFillColor(0, 108, 53); // Emerald #006C35
      pdf.rect(0, 0, pageWidth, 12, 'F');

      pdf.setFillColor(217, 119, 6); // Gold stripe
      pdf.rect(0, 12, pageWidth, 1.2, 'F');

      // Company Title in Header
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KHYBER LOGISTICS SERVICES • خيبر لخدمات النقل والخدمات اللوجستية', marginX, 8);

      // Report Title & Timestamp
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(220, 252, 231);
      pdf.text(
        `${viewTitle} • ${dateStr} ${timeStr} • KSA ZATCA Compliant`,
        pageWidth - marginX,
        8,
        { align: 'right' }
      );

      // Slice and render canvas portion for this page
      const srcY = (page * availableHeightPerPage * canvas.width) / contentWidth;
      const srcHeight = Math.min(
        canvas.height - srcY,
        (availableHeightPerPage * canvas.width) / contentWidth
      );
      const destHeight = (srcHeight * contentWidth) / canvas.width;

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, srcY, canvas.width, srcHeight,
          0, 0, canvas.width, srcHeight
        );
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImgData, 'JPEG', marginX, headerHeight, contentWidth, destHeight);
      }

      // Bottom Footer with CR and Page Number
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, pageHeight - footerHeight, pageWidth, pageHeight - footerHeight);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        'Khyber Logistics services • Kingdom of Saudi Arabia • CR: 1010789452 • VAT: 310458920100003',
        marginX,
        pageHeight - 4
      );

      pdf.text(
        `Page ${page + 1} of ${totalPages}`,
        pageWidth - marginX,
        pageHeight - 4,
        { align: 'right' }
      );
    }

    // 5. Trigger download
    pdf.save(safeFilename);
    const blob = pdf.output('blob');

    return { success: true, filename: safeFilename, blob };
  } catch (error) {
    console.error('Failed to generate current view PDF report:', error);
    // Fallback to native window.print() if canvas rendering is blocked
    window.print();
    return { success: false, filename: 'print_fallback' };
  }
}
