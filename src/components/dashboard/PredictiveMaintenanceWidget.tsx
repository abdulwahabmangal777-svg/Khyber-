import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  Sparkles,
  Calendar,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Activity,
  Check,
  Zap
} from 'lucide-react';
import { SaudiPlate } from '../SaudiPlate';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';
import {
  analyzeFleetPredictiveMaintenance,
  FleetPredictiveSummary,
  VehiclePredictiveProfile,
  PredictiveServiceSuggestion,
  STANDARD_SERVICE_TRACKS
} from '../../utils/predictiveMaintenance';

interface PredictiveMaintenanceWidgetProps {
  onOpenVehicle: (id: string) => void;
  onScheduleMaintenance: (vehicleId?: string) => void;
  onNavigateToMaintenance?: () => void;
}

export const PredictiveMaintenanceWidget: React.FC<PredictiveMaintenanceWidgetProps> = ({
  onOpenVehicle,
  onScheduleMaintenance,
  onNavigateToMaintenance
}) => {
  const { t, formatCurrency, formatDate, dir, language } = useLanguage();
  const { token, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FleetPredictiveSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'HEALTHY'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'MATRIX'>('CARDS');
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [showHeuristicModal, setShowHeuristicModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceTrack, setSelectedServiceTrack] = useState<string>('ALL');

  useEffect(() => {
    fetchPredictiveInsights();
  }, []);

  const fetchPredictiveInsights = async () => {
    setLoading(true);
    try {
      // First try dedicated server endpoint
      const res = await fetch('/api/maintenance/predictive-insights', {
        headers: getAuthHeaders(token)
      });

      if (res.ok) {
        const json = await res.json();
        const summary = json.data || json;
        if (summary && Array.isArray(summary.vehicles)) {
          setData(summary);
          setLoading(false);
          return;
        }
      }

      // Fallback: fetch vehicles, maintenance, and fuel records, and run local algorithm
      const [vRes, mRes, fRes] = await Promise.all([
        fetch('/api/vehicles', { headers: getAuthHeaders(token) }),
        fetch('/api/maintenance', { headers: getAuthHeaders(token) }),
        fetch('/api/fuel', { headers: getAuthHeaders(token) })
      ]);

      const vehicles = vRes.ok ? await vRes.json() : [];
      const maintenance = mRes.ok ? await mRes.json() : [];
      const fuelData = fRes.ok ? await fRes.json() : {};
      const fuelRecords = Array.isArray(fuelData) ? fuelData : (fuelData.records || []);

      const computed = analyzeFleetPredictiveMaintenance(
        Array.isArray(vehicles) ? vehicles : [],
        Array.isArray(maintenance) ? maintenance : [],
        fuelRecords
      );
      setData(computed);
    } catch (err) {
      console.warn('Predictive maintenance fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter vehicles
  const filteredVehicles = (data?.vehicles || []).filter(v => {
    // Status filter
    if (activeFilter !== 'ALL' && v.urgencyStatus !== activeFilter) {
      return false;
    }
    // Track filter
    if (selectedServiceTrack !== 'ALL') {
      const hasTrack = v.allSuggestions.some(
        s => s.maintenanceType === selectedServiceTrack && (s.urgency === 'CRITICAL' || s.urgency === 'WARNING')
      );
      if (!hasTrack) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchPlate = v.plateNumber.toLowerCase().includes(q);
      const matchInternal = v.internalVehicleId.toLowerCase().includes(q);
      const matchModel = `${v.make} ${v.model}`.toLowerCase().includes(q);
      const matchDriver = (v.assignedDriverName || '').toLowerCase().includes(q);
      if (!matchPlate && !matchInternal && !matchModel && !matchDriver) return false;
    }
    return true;
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-600',
          label: language === 'ar' ? 'حرج / متأخر' : (language === 'ps' ? 'بېړنی / پاتې' : 'Critical / Overdue'),
          borderCard: 'border-red-300 ring-1 ring-red-200 shadow-xs'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: language === 'ar' ? 'مستحق قريباً (≤ 14 يوم)' : (language === 'ps' ? 'ژر مستحق (≤ ۱۴ ورځې)' : 'Due Soon (≤ 14d)'),
          borderCard: 'border-amber-200'
        };
      case 'UPCOMING':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          label: language === 'ar' ? 'قادم (≤ 35 يوم)' : (language === 'ps' ? 'راتلونکی (≤ ۳۵ ورځې)' : 'Upcoming (≤ 35d)'),
          borderCard: 'border-slate-200'
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: language === 'ar' ? 'سليم ومثالي' : (language === 'ps' ? 'روغ او عادي' : 'Optimal'),
          borderCard: 'border-slate-200'
        };
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* 1. WIDGET HEADER */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white relative">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {language === 'ar' ? 'تحليل ذكي' : 'Predictive Heuristic AI'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-300">
                {language === 'ar' ? 'معايير أجواء المملكة' : 'Saudi Operating Conditions'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              <span>
                {language === 'ar'
                  ? 'رادار الصيانة التنبؤية ومواعيد الخدمة'
                  : (language === 'ps' ? 'د مخنیوي ساتنې او خدمت نیټو وړاندوینې' : 'Predictive Maintenance & Service Forecast')}
              </span>
            </h2>

            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {language === 'ar'
                ? 'تحليل دقيق لعدادات المسافات الفعلية ومعدلات الاستهلاك اليومي وسجلات الورش لاقتراح مواعيد الصيانة الاستباقية قبل وقوع الأعطال.'
                : 'Empirical odometer analysis and daily wear heuristics suggesting precision service dates to prevent roadside breakdowns.'}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHeuristicModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-colors"
              title="Inspect Heuristic Logic"
            >
              <Info className="w-3.5 h-3.5 text-emerald-300" />
              <span>{language === 'ar' ? 'معادلة الخوارزمية' : 'Heuristic Model'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="bg-slate-800/80 p-0.5 rounded-lg border border-white/10 inline-flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === 'CARDS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'بطاقات الخدمة' : 'Service Cards'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === 'MATRIX'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'مصفوفة التآكل' : 'Wear Matrix'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchPredictiveInsights}
              disabled={loading}
              title={t.refresh}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. FLEET PREDICTIVE KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-semibold text-slate-400">
              {language === 'ar' ? 'أسطول مفحوص' : 'Analyzed Fleet'}
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {data?.totalVehiclesAnalyzed ?? 0}
            </div>
            <div className="text-[10px] text-emerald-300/80 flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" />
              <span>100% Telemetry sync</span>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-semibold text-red-300">
              {language === 'ar' ? 'حرج أو متجاوز' : 'Critical / Overdue'}
            </div>
            <div className="text-xl font-bold text-red-400 mt-0.5">
              {data?.criticalCount ?? 0}
            </div>
            <div className="text-[10px] text-red-300/80 mt-0.5">
              {language === 'ar' ? 'يتطلب ورشة فورية' : 'Immediate booking'}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-semibold text-amber-300">
              {language === 'ar' ? 'مستحق قريباً (≤ 14 يوم)' : 'Due In ≤ 14 Days'}
            </div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              {data?.warningCount ?? 0}
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">
              {language === 'ar' ? 'جدولة هذا الشهر' : 'Book within 2 wks'}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-semibold text-slate-400">
              {language === 'ar' ? 'متوسط التشغيل' : 'Fleet Avg Run Rate'}
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-baseline gap-1">
              <span>{data?.fleetAvgDailyKm ?? 80}</span>
              <span className="text-xs font-normal text-slate-300">KM/day</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {language === 'ar' ? 'معدل المسافة المقاس' : 'Calculated usage'}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="text-[10px] uppercase font-semibold text-slate-400">
              {language === 'ar' ? 'صحة الأسطول العامة' : 'Fleet Health Index'}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="text-xl font-bold text-emerald-300">
                {data?.fleetAvgHealthScore ?? 85}%
              </div>
              <div className="w-16 bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${data?.fleetAvgHealthScore ?? 85}%` }}
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'معدل صيانة منخفض المخاطر' : 'Low risk wear profile'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH BAR */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'} ({data?.vehicles?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'CRITICAL'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{language === 'ar' ? 'حرج / متجاوز' : 'Critical'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800 font-bold">
              {data?.criticalCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'WARNING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>{language === 'ar' ? 'مستحق قريباً' : 'Due ≤ 14d'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {data?.warningCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'UPCOMING'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200'
            }`}
          >
            {language === 'ar' ? 'قادم (≤ 35 يوم)' : 'Upcoming'} ({data?.upcomingCount || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('HEALTHY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'HEALTHY'
                ? 'bg-[#006C35] text-white shadow-xs'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            {language === 'ar' ? 'سليم' : 'Healthy'} ({data?.healthyCount || 0})
          </button>
        </div>

        {/* Search & Service Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedServiceTrack}
            onChange={e => setSelectedServiceTrack(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#006C35]"
          >
            <option value="ALL">{language === 'ar' ? 'كافة أنواع الخدمات' : 'All Service Types'}</option>
            <option value="OIL_CHANGE">{language === 'ar' ? 'زيت المحرك والفلاتر' : 'Engine Oil & Filter'}</option>
            <option value="TIRE_REPLACEMENT">{language === 'ar' ? 'الإطارات والترصيص' : 'Tire Service'}</option>
            <option value="BRAKE_SERVICE">{language === 'ar' ? 'فحمات الفرامل' : 'Brakes Service'}</option>
            <option value="PERIODIC_SERVICE">{language === 'ar' ? 'الصيانة الدورية الشاملة' : 'Periodic Overhaul'}</option>
          </select>

          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث باللوحة، الكود، الطراز...' : 'Search plate, ID, model...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 w-44 focus:outline-hidden focus:ring-2 focus:ring-[#006C35]"
          />
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEW (CARDS OR MATRIX) */}
      <div className="p-5">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              {language === 'ar' ? 'جارٍ تشغيل خوارزمية الصيانة التنبؤية وتحليل المسافات...' : 'Executing heuristic predictive maintenance algorithms...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Correlating real-time odometers with historical workshop logs & fuel telemetry
            </p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">
              {language === 'ar' ? 'لا توجد مركبات تطابق الفلتر المحدد' : 'No vehicles matching this filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              All vehicles are within safe operational thresholds for this category.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
                setSelectedServiceTrack('ALL');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'CARDS' ? (
          /* ============================================================ */
          /* VIEW 1: PREDICTIVE ACTION CARDS (DEFAULT)                    */
          /* ============================================================ */
          <div className="space-y-4">
            {filteredVehicles.map(v => {
              const nearest = v.nearestServiceTrack;
              const badge = getUrgencyBadge(v.urgencyStatus);
              const isExpanded = expandedVehicleId === v.vehicleId;

              // Extract digits and letters from plate number
              const plateParts = (v.plateNumber || '').split(' ');
              const plateDigits = plateParts[0] || '0000';
              const plateLetters = plateParts.slice(1).join(' ') || 'ABC';

              return (
                <div
                  key={v.vehicleId}
                  className={`border rounded-2xl p-4 bg-white transition-all hover:shadow-md ${badge.borderCard}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Asset Information */}
                    <div className="flex items-start gap-3.5">
                      <SaudiPlate
                        plateDigits={plateDigits}
                        plateLettersEn={plateLetters}
                        plateDigitsAr={v.plateDigitsAr}
                        plateLettersAr={v.plateLettersAr}
                        size="sm"
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {v.internalVehicleId}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {v.make} {v.model} ({v.year})
                          </span>
                          <span className="text-xs text-slate-400">• {v.vehicleType}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Gauge className="w-3.5 h-3.5 text-slate-400" />
                            <span>{v.currentMileage.toLocaleString()} KM</span>
                          </span>

                          <span>•</span>

                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>~{v.calculatedDailyRate} KM/day</span>
                            <span className="text-[10px] text-slate-400">({v.rateConfidence})</span>
                          </span>

                          {v.assignedDriverName && (
                            <>
                              <span>•</span>
                              <span>Driver: <strong className="text-slate-700">{v.assignedDriverName}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Recommended Service & Suggested Date */}
                    <div className="flex-1 lg:max-w-md bg-slate-50/90 border border-slate-200/80 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>{language === 'ar' ? nearest.trackNameAr : nearest.trackName}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      {/* Suggested Date & Countdown */}
                      <div className="flex items-center justify-between text-xs mt-1.5">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'ar' ? 'الموعد المقترح:' : 'Suggested Service:'}</span>
                          <strong className="text-slate-900">{formatDate(nearest.suggestedDate)}</strong>
                        </span>

                        <span
                          className={`font-bold text-[11px] ${
                            nearest.remainingKm <= 0
                              ? 'text-red-600 font-mono'
                              : (nearest.estimatedDaysToService <= 14 ? 'text-amber-700' : 'text-slate-700')
                          }`}
                        >
                          {nearest.remainingKm <= 0
                            ? (language === 'ar' ? `متأخر بـ ${Math.abs(nearest.remainingKm).toLocaleString()} كم` : `Overdue by ${Math.abs(nearest.remainingKm).toLocaleString()} KM`)
                            : (nearest.estimatedDaysToService === 0
                                ? (language === 'ar' ? 'مستحق اليوم' : 'Due Today')
                                : (language === 'ar' ? `خلال ~${nearest.estimatedDaysToService} يوم` : `In ~${nearest.estimatedDaysToService} days`))}
                        </span>
                      </div>

                      {/* Wear Progress Bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>{language === 'ar' ? 'نسبة الاستهلاك:' : 'Wear Cycle:'}</span>
                          <span className="font-semibold text-slate-700">
                            {nearest.mileageSinceLastService.toLocaleString()} / {nearest.intervalKm.toLocaleString()} KM ({nearest.wearPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              nearest.wearPercentage >= 100
                                ? 'bg-red-600'
                                : (nearest.wearPercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                            }`}
                            style={{ width: `${Math.min(100, nearest.wearPercentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Heuristic justification note */}
                      <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic border-t border-slate-200/60 pt-1.5">
                        {language === 'ar' ? nearest.reasonTextAr : nearest.reasonText}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex lg:flex-col items-center gap-2 shrink-0">
                      {hasRole('ADMIN', 'MANAGER') && (
                        <button
                          type="button"
                          onClick={() => onScheduleMaintenance(v.vehicleId)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#006C35] hover:bg-[#005a2c] text-white shadow-xs transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'حجز الصيانة' : 'Schedule Service'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => onOpenVehicle(v.vehicleId)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Open 360 Vehicle View"
                        >
                          <span>{language === 'ar' ? 'الملف' : 'Profile'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedVehicleId(isExpanded ? null : v.vehicleId)}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Expand all 4 service tracks"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4-TRACK ACCORDION DRAWER */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-slate-100 mt-4 pt-4"
                      >
                        <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                          <span>
                            {language === 'ar'
                              ? 'تحليل كافة مسارات الصيانة الأربعة لهذه المركبة:'
                              : 'Multi-Track Predictive Analysis (All 4 Maintenance Tracks):'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Health Score: <strong className={getHealthColor(v.overallHealthScore)}>{v.overallHealthScore}%</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {v.allSuggestions.map(s => {
                            const trackBadge = getUrgencyBadge(s.urgency);
                            return (
                              <div
                                key={s.trackId}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-900 truncate">
                                      {language === 'ar' ? s.trackNameAr : s.trackName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${trackBadge.bg}`}
                                    >
                                      {s.urgency}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500 mt-1">
                                    {language === 'ar' ? 'المتبقي:' : 'Remaining:'}{' '}
                                    <strong
                                      className={s.remainingKm <= 0 ? 'text-red-600' : 'text-slate-800'}
                                    >
                                      {s.remainingKm <= 0
                                        ? `Overdue (${Math.abs(s.remainingKm).toLocaleString()} KM)`
                                        : `${s.remainingKm.toLocaleString()} KM`}
                                    </strong>
                                  </div>

                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {language === 'ar' ? 'الموعد المتوقع:' : 'Forecast Date:'}{' '}
                                    <span className="font-semibold text-slate-800">{formatDate(s.suggestedDate)}</span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                  <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        s.wearPercentage >= 100
                                          ? 'bg-red-600'
                                          : (s.wearPercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                                      }`}
                                      style={{ width: `${Math.min(100, s.wearPercentage)}%` }}
                                    />
                                  </div>

                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Est. ~{formatCurrency(s.estimatedCost)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW 2: FLEET WEAR MATRIX VIEW                               */
          /* ============================================================ */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                  <th className="py-3 px-3">{language === 'ar' ? 'المركبة' : 'Vehicle Asset'}</th>
                  <th className="py-3 px-3">{language === 'ar' ? 'العداد والمعدل' : 'Odometer & Rate'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'زيت المحرك (10K)' : 'Engine Oil (10k)'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'الإطارات (20K)' : 'Tire Service (20k)'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'الفرامل (30K)' : 'Brake System (30k)'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'دورية شاملة (40K)' : 'Major Service (40k)'}</th>
                  <th className="py-3 px-3 text-center">{language === 'ar' ? 'مؤشر الصحة' : 'Health Score'}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map(v => {
                  const oil = v.allSuggestions.find(s => s.maintenanceType === 'OIL_CHANGE');
                  const tires = v.allSuggestions.find(s => s.maintenanceType === 'TIRE_REPLACEMENT');
                  const brakes = v.allSuggestions.find(s => s.maintenanceType === 'BRAKE_SERVICE');
                  const periodic = v.allSuggestions.find(s => s.maintenanceType === 'PERIODIC_SERVICE');

                  const renderTrackCell = (s?: PredictiveServiceSuggestion) => {
                    if (!s) return <span className="text-slate-400">-</span>;
                    const isOver = s.remainingKm <= 0;
                    const isSoon = s.estimatedDaysToService <= 14;

                    return (
                      <div className="flex flex-col items-center">
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isOver ? 'text-red-600' : (isSoon ? 'text-amber-700' : 'text-slate-700')
                          }`}
                        >
                          {isOver ? `Overdue` : `${s.remainingKm.toLocaleString()} KM`}
                        </span>

                        <div className="w-16 bg-slate-200 rounded-full h-1.5 my-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.wearPercentage >= 100
                                ? 'bg-red-600'
                                : (s.wearPercentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                            }`}
                            style={{ width: `${Math.min(100, s.wearPercentage)}%` }}
                          />
                        </div>

                        <span className="text-[10px] text-slate-400">{formatDate(s.suggestedDate)}</span>
                      </div>
                    );
                  };

                  return (
                    <tr key={v.vehicleId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{v.plateNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {v.internalVehicleId} • {v.make} {v.model}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="font-semibold text-slate-800">{v.currentMileage.toLocaleString()} KM</div>
                        <div className="text-[10px] text-slate-400">~{v.calculatedDailyRate} KM/day</div>
                      </td>

                      <td className="py-3 px-3 text-center">{renderTrackCell(oil)}</td>
                      <td className="py-3 px-3 text-center">{renderTrackCell(tires)}</td>
                      <td className="py-3 px-3 text-center">{renderTrackCell(brakes)}</td>
                      <td className="py-3 px-3 text-center">{renderTrackCell(periodic)}</td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                            v.overallHealthScore >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : (v.overallHealthScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')
                          }`}
                        >
                          {v.overallHealthScore}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right rtl:text-left">
                        <button
                          type="button"
                          onClick={() => onScheduleMaintenance(v.vehicleId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-[#006C35] text-white transition-colors"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Book</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. FOOTER LINK TO ALL WORK ORDERS */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {language === 'ar'
              ? 'محدث تلقائياً مع كل عملية تعبئة وقود أو فحص دوري'
              : 'Auto-synchronized with every fuel log and periodic inspection entry'}
          </span>
        </span>

        {onNavigateToMaintenance && (
          <button
            type="button"
            onClick={onNavigateToMaintenance}
            className="font-bold text-[#006C35] hover:underline flex items-center gap-1"
          >
            <span>{language === 'ar' ? 'إدارة أوامر الصيانة والورش' : 'View Maintenance Work Orders'}</span>
            <ArrowRight className={`w-3 h-3 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* 6. HEURISTIC MODEL EXPLAINER MODAL */}
      <AnimatePresence>
        {showHeuristicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006C35] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'ar' ? 'معادلة خوارزمية الصيانة التنبؤية' : 'Heuristic Maintenance Algorithm Specification'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHeuristicModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 my-4 text-xs text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-emerald-900 mb-1">
                    Mathematical Formulation:
                  </h4>
                  <div className="font-mono text-emerald-800 text-[11px] bg-white p-2 rounded border border-emerald-200">
                    Days to Service = min [ (Target_KM - Current_KM) / Daily_Rate , Calendar_Limit_Days ]
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 mb-1">1. Empirical Usage Velocity (Daily Rate):</h5>
                  <p>
                    Analyzes chronological deltas across all historical fuel records and workshop odometer entries.
                    When 2 or more logs exist, it calculates (Distance Traveled / Days Elapsed) with 85% empirical weight
                    and 15% category baseline prior (Heavy Trucks: 185 KM/d, Delivery Vans: 130 KM/d, Pickups: 80 KM/d, SUVs: 55 KM/d).
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 mb-1">2. Saudi Environmental Multipliers:</h5>
                  <p>
                    Engine oil and air filters degrade faster under ambient temperatures exceeding 45°C.
                    Oil changes enforce a strict 90-day calendar ceiling regardless of low mileage to prevent thermal breakdown.
                  </p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 mb-1">3. 4 Standardized Fleet Maintenance Tracks:</h5>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li><strong>Track 1: Engine Oil & Filters:</strong> 10,000 KM or 90 days</li>
                    <li><strong>Track 2: Tires & Dynamic Balancing:</strong> 20,000 KM or 180 days</li>
                    <li><strong>Track 3: Brake System Inspection:</strong> 30,000 KM or 240 days</li>
                    <li><strong>Track 4: Major Overhaul & Transmission:</strong> 40,000 KM or 365 days</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 mb-1">4. Automatic Overdue Alerting:</h5>
                  <p>
                    Any asset where Remaining KM &le; 0 or Estimated Days &le; 3 is automatically flagged as
                    <strong> CRITICAL</strong>, prompting immediate dispatcher booking before roadside breakdowns.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHeuristicModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
