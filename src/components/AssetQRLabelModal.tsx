import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Truck,
  User,
  QrCode,
  Building2,
  Calendar,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SaudiPlate } from './SaudiPlate';
import { BrandLogo } from './common/BrandLogo';

interface AssetQRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'VEHICLE' | 'WORKER';
  data: any;
}

export const AssetQRLabelModal: React.FC<AssetQRLabelModalProps> = ({
  isOpen,
  onClose,
  type,
  data
}) => {
  const { t, formatDate } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  // Build QR payload
  const qrPayload = JSON.stringify({
    type,
    id: data.id,
    code: type === 'VEHICLE' ? data.internalVehicleId || data.plateEn : data.employeeId || data.iqamaNumber,
    system: 'SaudiFleetEnterprise'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSVG = () => {
    const svgElement = printRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_Asset_Tag_${type}_${data.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="asset-qr-label-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="asset-qr-dialog"
        role="dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Saudi Asset QR Label
              </h3>
              <p className="text-[11px] text-slate-500">
                {type === 'VEHICLE' ? 'Fleet Vehicle Windshield & Key Tag' : 'Employee ID Card & Safety Helmet Badge'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-slate-100">
          <div
            ref={printRef}
            id="printable-qr-asset-label"
            className="w-full max-w-md bg-white border-2 border-emerald-900/30 rounded-2xl p-5 shadow-md flex flex-col gap-4 text-slate-900 print:shadow-none print:border-2 print:border-black print:m-0"
          >
            {/* Tag Header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-900/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-0.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-xs">
                  <BrandLogo size="xs" showText={false} variant="luxury" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-emerald-950 uppercase tracking-wide">
                    KHYBER LOGISTICS SERVICES
                  </div>
                  <div className="text-[9px] font-semibold text-slate-500">
                    خدمات خيبر اللوجستية • Saudi Asset Compliance
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900">
                {type}
              </span>
            </div>

            {/* Middle: QR Code + Asset Details */}
            <div className="flex items-center gap-5">
              {/* QR Code Container */}
              <div className="p-2.5 bg-white border-2 border-slate-900 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                <QRCodeSVG
                  value={qrPayload}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Asset Metadata */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {type === 'VEHICLE' ? (
                  <>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {data.make} {data.model} ({data.year})
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      VIN: <span className="font-bold text-slate-900">{data.vin}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Dept: <span className="font-semibold text-slate-900">{data.departmentName || data.department?.name || 'Operations'}</span>
                    </div>
                    <div className="pt-1">
                      <SaudiPlate
                        plateEn={data.plateEn}
                        plateAr={data.plateAr}
                        size="sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {data.nameEn}
                    </div>
                    <div className="text-xs font-arabic text-emerald-900 truncate">
                      {data.nameAr}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      Iqama: <span className="font-bold text-slate-900">{data.iqamaNumber}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Role: <span className="font-semibold text-slate-900">{data.jobTitle}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Emp ID: {data.employeeId || data.id?.slice(0, 8)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Scan with Saudi Fleet App</span>
              <span>Ref: {data.id?.slice(0, 12)}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={handleDownloadSVG}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download Vector SVG</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker Tag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
