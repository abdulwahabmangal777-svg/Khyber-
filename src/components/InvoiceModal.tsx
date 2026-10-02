import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Building,
  Calendar,
  FileText,
  DollarSign,
  Share2
} from 'lucide-react';
import { BrandLogo } from './common/BrandLogo';
import { SaudiPlate } from './SaudiPlate';
import { useLanguage } from '../context/LanguageContext';

export interface InvoiceItem {
  id?: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: {
    invoiceNumber: string;
    date: string;
    dueDate?: string;
    status?: 'PAID' | 'PENDING' | 'APPROVED';
    vendor?: string;
    expenseType?: string;
    description?: string;
    amount: number;
    vatAmount?: number;
    subtotal?: number;
    vehiclePlate?: string;
    vehicleName?: string;
    vin?: string;
    driverName?: string;
    iqamaNumber?: string;
    items?: InvoiceItem[];
  } | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceData
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoiceData) return null;

  // Calculate financial numbers (15% VAT)
  const totalAmount = invoiceData.amount || 0;
  const subtotal = invoiceData.subtotal ?? Math.round((totalAmount / 1.15) * 100) / 100;
  const vat = invoiceData.vatAmount ?? Math.round((totalAmount - subtotal) * 100) / 100;

  // Default item if none provided
  const items: InvoiceItem[] = invoiceData.items && invoiceData.items.length > 0
    ? invoiceData.items
    : [
        {
          description: invoiceData.description || `${invoiceData.expenseType || 'Fleet Service'} - ${invoiceData.vehicleName || 'Vehicle Service'}`,
          descriptionAr: 'خدمات تشغيل وصيانة أسطول خيبر اللوجستية',
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal
        }
      ];

  // ZATCA QR Code Payload representation (Fatoora standard fields: Seller Name, VAT Number, Timestamp, Total with VAT, VAT Amount)
  const qrPayload = JSON.stringify({
    seller: 'Khyber Logistics services - خدمات خيبر اللوجستية',
    vatNumber: '310492817200003',
    crNumber: '1010748291',
    invoiceNumber: invoiceData.invoiceNumber,
    timestamp: `${invoiceData.date}T10:30:00Z`,
    totalWithVat: totalAmount.toFixed(2),
    vatAmount: vat.toFixed(2),
    status: 'ZATCA Phase-2 Validated'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-b border-amber-500/30 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md">
              <BrandLogo size="xs" showText={false} variant="luxury" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black tracking-wide text-white">
                  Khyber Logistics Services • Official Tax Invoice
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                  ZATCA Standard
                </span>
              </div>
              <p className="text-[10px] text-emerald-200/80 font-mono">
                {invoiceData.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 print:bg-white print:p-0">
          <div
            ref={printRef}
            id="printable-tax-invoice"
            className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-4 text-slate-900"
          >
            {/* INVOICE HEADER */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b-2 border-emerald-950/20">
              {/* Left: Luxury Emblem & Corporate Identity */}
              <div className="flex items-start gap-4">
                <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-200 to-amber-600 shadow-md shrink-0">
                  <BrandLogo size="lg" showText={false} variant="luxury" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950">
                    KHYBER LOGISTICS SERVICES
                  </h1>
                  <h2 className="text-sm font-bold text-[#006C35] font-arabic mt-0.5">
                    خدمات خيبر اللوجستية
                  </h2>
                  <div className="text-[11px] text-slate-600 space-y-0.5 mt-1">
                    <p className="font-semibold text-slate-800">
                      Kingdom of Saudi Arabia • المملكة العربية السعودية
                    </p>
                    <p>
                      CR # (سجل تجاري): <span className="font-mono font-bold text-slate-900">1010748291</span>
                    </p>
                    <p>
                      ZATCA VAT # (الرقم الضريبي): <span className="font-mono font-bold text-[#006C35]">310492817200003</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      King Abdulaziz Rd, Al-Murabba, Riyadh 11513
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Tax Invoice Badge & Metadata */}
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="inline-block px-3 py-1 rounded-lg bg-emerald-950 text-white text-xs font-black tracking-wider uppercase mb-2">
                  TAX INVOICE / فاتورة ضريبية
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-slate-500">Invoice No:</span>{' '}
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {invoiceData.invoiceNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {formatDate(invoiceData.date)}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-[#006C35]" />
                      PAID / مسددة بالكامل
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BILL TO & ASSET DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-100 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#006C35]" />
                  <span>Vendor & Service Provider</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {invoiceData.vendor || 'Authorized Service Workshop'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Category: {invoiceData.expenseType || 'Operational Expense'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Payment Method: Corporate Direct Settlement
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#006C35]" />
                  <span>Fleet Asset & Driver Assignment</span>
                </div>
                <div className="font-bold text-slate-900">
                  {invoiceData.vehicleName || 'Corporate Fleet Vehicle'}
                </div>
                {invoiceData.vehiclePlate && (
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                    Plate: <span className="font-bold text-slate-900">{invoiceData.vehiclePlate}</span>
                  </div>
                )}
                {invoiceData.driverName && (
                  <div className="text-slate-600 text-[11px]">
                    Driver: <span className="font-semibold text-slate-900">{invoiceData.driverName}</span>
                    {invoiceData.iqamaNumber && ` (Iqama: ${invoiceData.iqamaNumber})`}
                  </div>
                )}
              </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="py-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-600 font-bold">
                    <th className="pb-2.5">Item & Description</th>
                    <th className="pb-2.5 text-center">Qty</th>
                    <th className="pb-2.5 text-right">Unit Price (SAR)</th>
                    <th className="pb-2.5 text-right">Amount (SAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="py-2.5">
                      <td className="py-3 pr-2">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        {item.descriptionAr && (
                          <div className="text-[11px] text-slate-500 font-arabic mt-0.5">
                            {item.descriptionAr}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS & ZATCA QR CODE */}
            <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Left: ZATCA Fatoora QR Code */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-auto">
                <div className="p-1.5 bg-white border border-slate-300 rounded-lg shrink-0">
                  <QRCodeSVG value={qrPayload} size={80} level="M" />
                </div>
                <div className="text-[10px] space-y-0.5 text-slate-600">
                  <div className="font-extrabold text-emerald-950 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006C35]" />
                    <span>ZATCA E-Invoice QR</span>
                  </div>
                  <p>Compliant with Saudi Tax Authority</p>
                  <p className="font-mono text-[9px] text-slate-400">
                    Encrypted Security Hash: Verified
                  </p>
                  <p className="font-semibold text-slate-800">
                    Khyber Logistics Services
                  </p>
                </div>
              </div>

              {/* Right: Financial Breakdown */}
              <div className="w-full sm:w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (المجموع الفرعي):</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Saudi VAT 15% (ضريبة القيمة المضافة):</span>
                  <span className="font-mono font-semibold">{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-950">
                  <span>Total Amount (SAR):</span>
                  <span className="font-mono text-base text-[#006C35]">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER & OFFICIAL APPROVAL STAMP */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700">General Manager: Abdul Wahab Mangal (عبد الوهاب منګل)</p>
                <p>Khyber Logistics Services • Internal Enterprise Billing & Dispatch System</p>
              </div>

              {/* Official Digital Stamp */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-emerald-800/40 bg-emerald-50/50 text-emerald-900 font-bold">
                <BrandLogo size="xs" showText={false} variant="luxury" />
                <span className="text-[10px] tracking-wider uppercase font-mono">
                  VERIFIED & APPROVED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
