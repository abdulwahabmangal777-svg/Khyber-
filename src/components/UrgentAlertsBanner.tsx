import React from 'react';
import { AlertTriangle, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface UrgentAlertsBannerProps {
  expiredCount: number;
  expiring7DaysCount: number;
  expiring30DaysCount: number;
  validCount: number;
  onSelectFilter: (filter: 'EXPIRED' | '7_DAYS' | '30_DAYS' | 'ALL') => void;
  activeFilter?: string;
}

export const UrgentAlertsBanner: React.FC<UrgentAlertsBannerProps> = ({
  expiredCount,
  expiring7DaysCount,
  expiring30DaysCount,
  validCount,
  onSelectFilter,
  activeFilter
}) => {
  const { t, dir } = useLanguage();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {t.urgentExpiryAlerts}
            </h2>
            <p className="text-xs text-slate-500">
              {t.urgentAlertsBadge}: Istimara, Insurance, MVPI Inspection, Iqama & Passports
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectFilter('ALL')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
        >
          <span>{t.viewAllAlerts}</span>
          <ChevronRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Interactive KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Expired */}
        <button
          type="button"
          onClick={() => onSelectFilter('EXPIRED')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left rtl:text-right ${
            activeFilter === 'EXPIRED'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-200 shadow-sm'
              : 'bg-red-50/60 hover:bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <div>
              <div className="text-lg font-black text-red-700 leading-none">{expiredCount}</div>
              <div className="text-xs font-semibold text-red-900 mt-0.5">{t.expiredDocs}</div>
            </div>
          </div>
          <AlertCircle className="w-5 h-5 text-red-500 opacity-60" />
        </button>

        {/* 7 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('7_DAYS')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left rtl:text-right ${
            activeFilter === '7_DAYS'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 shadow-sm'
              : 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <div>
              <div className="text-lg font-black text-amber-700 leading-none">{expiring7DaysCount}</div>
              <div className="text-xs font-semibold text-amber-900 mt-0.5">{t.expiring7Days}</div>
            </div>
          </div>
          <Clock className="w-5 h-5 text-amber-500 opacity-60" />
        </button>

        {/* 30 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('30_DAYS')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left rtl:text-right ${
            activeFilter === '30_DAYS'
              ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-200 shadow-sm'
              : 'bg-yellow-50/60 hover:bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <div>
              <div className="text-lg font-black text-yellow-800 leading-none">{expiring30DaysCount}</div>
              <div className="text-xs font-semibold text-yellow-900 mt-0.5">{t.expiring30Days}</div>
            </div>
          </div>
          <Clock className="w-5 h-5 text-yellow-600 opacity-60" />
        </button>

        {/* Valid */}
        <button
          type="button"
          onClick={() => onSelectFilter('ALL')}
          className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left rtl:text-right ${
            activeFilter === 'VALID'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
              : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <div>
              <div className="text-lg font-black text-emerald-800 leading-none">{validCount}</div>
              <div className="text-xs font-semibold text-emerald-900 mt-0.5">{t.validDocs}</div>
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 opacity-60" />
        </button>
      </div>
    </div>
  );
};
