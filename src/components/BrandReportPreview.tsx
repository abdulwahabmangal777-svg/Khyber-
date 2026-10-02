import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  Building,
  ShieldCheck,
  Eye,
  Sliders,
  Palette
} from 'lucide-react';
import { BrandLogo } from './common/BrandLogo';
import { exportToPdf } from '../utils/export';
import { useLanguage } from '../context/LanguageContext';

export interface BrandReportPreviewProps {
  companyName: string;
  companyNameAr: string;
  crNumber: string;
  vatNumber: string;
  address: string;
  phone: string;
  email?: string;
  generalManager: string;
  selectedTheme: 'SAUDI_GREEN' | 'ENTERPRISE_BLUE';
  onThemeChange: (theme: 'SAUDI_GREEN' | 'ENTERPRISE_BLUE') => void;
}

export const BrandReportPreview: React.FC<BrandReportPreviewProps> = ({
  companyName,
  companyNameAr,
  crNumber,
  vatNumber,
  address,
  phone,
  email,
  generalManager,
  selectedTheme,
  onThemeChange
}) => {
  const { formatCurrency, formatDate } = useLanguage();
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isExporting, setIsExporting] = useState(false);

  const isBlue = selectedTheme === 'ENTERPRISE_BLUE';

  // Sample items for realistic invoice simulation
  const sampleItems = [
    {
      code: 'SRV-8821',
      desc: 'Mercedes-Benz Actros 3340 — 50,000 KM Scheduled Major Overhaul & Diagnostics',
      descAr: 'صيانة وقائية دورية شاملة وتغيير زيوت وفلاتر للشاحنة',
      qty: 1,
      unitPrice: 4200.0,
      total: 4200.0
    },
    {
      code: 'PARTS-992',
      desc: 'Heavy Transport Steering Tires (Michelin 315/80 R22.5 - Set of 4)',
      descAr: 'إطارات نقل ثقيل ميشلان أصلية مع الترصيص والتركيب',
      qty: 4,
      unitPrice: 1350.0,
      total: 5400.0
    },
    {
      code: 'FUEL-4109',
      desc: 'Bulk Highway Fleet Diesel Refueling Dispatch Voucher (Riyadh - Dammam Corridor)',
      descAr: 'قسيمة تزويد وقود ديزل للشاحنات - مسار الرياض الدمام',
      qty: 1,
      unitPrice: 1850.0,
      total: 1850.0
    }
  ];

  const subtotal = sampleItems.reduce((acc, item) => acc + item.total, 0);
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const grandTotal = subtotal + vat;

  // Real-time ZATCA QR Payload
  const qrPayload = JSON.stringify({
    seller: `${companyName} • ${companyNameAr}`,
    vatNumber: vatNumber || '310492817200003',
    crNumber: crNumber || '1010748291',
    invoiceNumber: 'INV-KL-2026-9041',
    timestamp: `${new Date().toISOString().slice(0, 10)}T11:00:00Z`,
    total: grandTotal.toFixed(2),
    vat: vat.toFixed(2),
    theme: selectedTheme
  });

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      const headers = ['Item Code', 'Description & Service Details', 'Qty', 'Unit Price (SAR)', 'Total (SAR)'];
      const rows = sampleItems.map(item => [
        item.code,
        item.desc,
        item.qty.toString(),
        item.unitPrice.toFixed(2),
        item.total.toFixed(2)
      ]);

      // Add Subtotal, VAT, and Grand Total rows
      rows.push(['', 'Subtotal (المجموع الفرعي)', '', '', subtotal.toFixed(2)]);
      rows.push(['', 'Saudi VAT 15% (ضريبة القيمة المضافة)', '', '', vat.toFixed(2)]);
      rows.push(['', 'Grand Total with VAT (المجموع الكلي)', '', '', grandTotal.toFixed(2)]);

      exportToPdf(
        'Standardized Tax Invoice & Fleet Expense Report',
        headers,
        rows,
        `Khyber_Invoice_Preview_${selectedTheme.toLowerCase()}`,
        companyName || 'Khyber Logistics services',
        {
          theme: selectedTheme,
          crNumber: crNumber || '1010748291',
          vatNumber: vatNumber || '310492817200003',
          address,
          phone,
          orientation: previewOrientation
        }
      );
    } catch (err) {
      console.error('Error exporting PDF preview:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-800" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Brand Preview & PDF Report Styling
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-arabic">
            معاينة حية ومباشرة لشعار الشركة والألوان المعتمدة (الأخضر السعودي / الأزرق المؤسسي) على نموذج تقرير الفواتير
          </p>
        </div>

        {/* Download & View Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                previewOrientation === 'landscape'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Landscape
            </button>
            <button
              type="button"
              onClick={() => setPreviewOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                previewOrientation === 'portrait'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Portrait
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExporting ? 'Generating...' : 'Download Test PDF'}</span>
          </button>
        </div>
      </div>

      {/* Theme Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Theme 1: Saudi Green */}
        <button
          type="button"
          onClick={() => onThemeChange('SAUDI_GREEN')}
          className={`p-3.5 rounded-xl text-left transition-all border-2 flex items-start justify-between gap-3 ${
            selectedTheme === 'SAUDI_GREEN'
              ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-600/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-950 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-xs">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">Saudi Green</span>
                <span className="text-[10px] font-arabic font-bold text-emerald-800">الأخضر السعودي الملكي</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Deep emerald `#006C35` with royal gold trims. Ideal for Saudi governmental & ZATCA tax filings.
              </p>
            </div>
          </div>
          {selectedTheme === 'SAUDI_GREEN' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          )}
        </button>

        {/* Theme 2: Enterprise Blue */}
        <button
          type="button"
          onClick={() => onThemeChange('ENTERPRISE_BLUE')}
          className={`p-3.5 rounded-xl text-left transition-all border-2 flex items-start justify-between gap-3 ${
            selectedTheme === 'ENTERPRISE_BLUE'
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-950 to-blue-950 border border-sky-400/50 flex items-center justify-center shrink-0 shadow-xs">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">Enterprise Blue</span>
                <span className="text-[10px] font-arabic font-bold text-blue-800">الأزرق المؤسسي الماسي</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Deep navy `#0f172a` with electric azure accents. Premium multinational corporate transport style.
              </p>
            </div>
          </div>
          {selectedTheme === 'ENTERPRISE_BLUE' && (
            <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          )}
        </button>
      </div>

      {/* LIVE SIMULATED PDF INVOICE REPORT CANVAS */}
      <div className="p-3 sm:p-5 bg-slate-100/80 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between pb-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-bold text-slate-700">PDF Report Canvas (A4 Standard Format)</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Preview Mode: {isBlue ? 'Enterprise Blue Palette' : 'Saudi Green Palette'} • Scale: 100%
          </span>
        </div>

        {/* Paper Sheet Simulator */}
        <div
          id="pdf-live-preview-sheet"
          className="bg-white rounded-xl shadow-lg border border-slate-300/80 overflow-hidden transition-all text-slate-900"
          style={{ minHeight: '480px' }}
        >
          {/* HEADER BANNER WITH SELECTED THEME PALETTE */}
          <div
            className={`p-5 text-white transition-colors duration-200 relative overflow-hidden ${
              isBlue
                ? 'bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 border-b-2 border-sky-400'
                : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 border-b-2 border-amber-500'
            }`}
          >
            {/* Top decorative accent ribbon */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                isBlue ? 'bg-gradient-to-r from-sky-400 via-blue-400 to-sky-300' : 'bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500'
              }`}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Luxury Emblem + Company Details */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-1 rounded-2xl shadow-md shrink-0 ${
                    isBlue
                      ? 'bg-gradient-to-br from-sky-400 via-blue-300 to-sky-600'
                      : 'bg-gradient-to-br from-amber-400 via-amber-200 to-amber-600'
                  }`}
                >
                  <BrandLogo size="lg" showText={false} variant="luxury" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                      {companyName || 'Khyber Logistics services'}
                    </h1>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isBlue
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-amber-400 text-slate-950'
                      }`}
                    >
                      Official Registry
                    </span>
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold text-amber-300 font-arabic mt-0.5">
                    {companyNameAr || 'خدمات خيبر اللوجستية'}
                  </h2>
                  <p className="text-[11px] text-slate-300/90 mt-1">
                    Kingdom of Saudi Arabia • Commercial Heavy Fleet Logistics
                  </p>
                </div>
              </div>

              {/* Right: Tax Credentials & Header Metadata */}
              <div className="text-left md:text-right text-xs space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/10 md:bg-transparent md:p-0 md:border-none">
                <div className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  Standard Tax Invoice / فاتورة ضريبية
                </div>
                <div className="text-[11px] text-slate-200 font-mono">
                  CR #: <span className="font-bold text-white">{crNumber || '1010748291'}</span>
                </div>
                <div className="text-[11px] text-slate-200 font-mono">
                  ZATCA VAT #: <span className={`font-bold ${isBlue ? 'text-sky-300' : 'text-amber-300'}`}>{vatNumber || '310492817200003'}</span>
                </div>
                <div className="text-[10px] text-slate-300 truncate max-w-xs">
                  {address || 'King Abdulaziz Road, Riyadh 11513, KSA'}
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENT SUB-HEADER & REFERENCE BAR */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Doc Reference:</span>
              <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                KL-INV-2026-9041
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">Date: {new Date().toISOString().slice(0, 10)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Verification:</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isBlue
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>APPROVED & VALIDATED</span>
              </span>
            </div>
          </div>

          {/* DOCUMENT TABLE PREVIEW */}
          <div className="p-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr
                  className={`text-white font-bold transition-colors ${
                    isBlue ? 'bg-blue-950' : 'bg-emerald-950'
                  }`}
                >
                  <th className="py-2.5 px-3 rounded-l-lg">Item Code</th>
                  <th className="py-2.5 px-3">Service / Expense Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price (SAR)</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Total (SAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {sampleItems.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? (isBlue ? 'bg-blue-50/40' : 'bg-slate-50/60') : 'bg-white'}>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-500">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.desc}</div>
                      <div className="text-[10px] text-slate-500 font-arabic mt-0.5">{item.descAr}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS & ZATCA QR CODE SECTION */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Left: ZATCA Phase-2 QR Code Simulator */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-auto">
                <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                  <QRCodeSVG value={qrPayload} size={70} level="M" />
                </div>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-extrabold text-slate-900 uppercase flex items-center gap-1">
                    <ShieldCheck className={`w-3.5 h-3.5 ${isBlue ? 'text-blue-600' : 'text-emerald-700'}`} />
                    <span>ZATCA Phase-2 Security Hash</span>
                  </div>
                  <p>Encrypted Digital Tax Stamp</p>
                  <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {companyName || 'Khyber Logistics services'}
                  </p>
                  <p className="font-mono text-[9px] text-slate-400">VAT: {vatNumber || '310492817200003'}</p>
                </div>
              </div>

              {/* Right: Calculated Financial Totals */}
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (المجموع قبل الضريبة):</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT 15% (ضريبة القيمة المضافة):</span>
                  <span className="font-mono font-semibold">{formatCurrency(vat)}</span>
                </div>
                <div
                  className={`flex justify-between items-center pt-2 border-t-2 border-slate-900 text-sm font-black ${
                    isBlue ? 'text-blue-950' : 'text-emerald-950'
                  }`}
                >
                  <span>Grand Total (SAR):</span>
                  <span
                    className={`font-mono text-base ${
                      isBlue ? 'text-blue-700' : 'text-[#006C35]'
                    }`}
                  >
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER & OFFICIAL SEAL */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700">
                  Approved by General Manager: {generalManager || 'Abdul Wahab Mangal (عبد الوهاب منګل)'}
                </p>
                <p className="text-[10px]">
                  {companyName} • Official Enterprise Telematics & Reporting Standard
                </p>
              </div>

              {/* Verification Stamp */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full border-2 font-bold ${
                  isBlue
                    ? 'border-blue-700/40 bg-blue-50 text-blue-900'
                    : 'border-emerald-700/40 bg-emerald-50 text-emerald-900'
                }`}
              >
                <BrandLogo size="xs" showText={false} variant="luxury" />
                <span className="text-[9px] tracking-wider uppercase font-mono">
                  SEALED & AUDITED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandReportPreview;
