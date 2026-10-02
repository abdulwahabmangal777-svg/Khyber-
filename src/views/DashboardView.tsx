import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Truck,
  Users,
  AlertTriangle,
  Wrench,
  DollarSign,
  Fuel,
  TrendingUp,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Clock,
  ArrowUpRight,
  MapPin
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { SaudiPlate } from '../components/SaudiPlate';
import { UrgentAlertsBanner } from '../components/UrgentAlertsBanner';
import { DashboardLiveGpsMapCard } from '../components/dashboard/DashboardLiveGpsMapCard';
import { PredictiveMaintenanceWidget } from '../components/dashboard/PredictiveMaintenanceWidget';
import { AdsterraBanner } from '../components/ads/AdsterraBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { DashboardStats, Vehicle, Worker } from '../types';

interface DashboardViewProps {
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
  onNavigate: (view: any) => void;
  onAddVehicle: () => void;
  onAddWorker: () => void;
  onAddMaintenance: (vehicleId?: string) => void;
  onAddFuel: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenVehicle,
  onOpenWorker,
  onNavigate,
  onAddVehicle,
  onAddWorker,
  onAddMaintenance,
  onAddFuel
}) => {
  const { t, formatCurrency, formatDate, formatDaysRemainingText, dir } = useLanguage();
  const { token, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAlertFilter, setActiveAlertFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Notice: Dashboard fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#dc2626', '#f59e0b', '#eab308', '#059669'];

  const compliancePieData = stats?.expiry ? [
    { name: t.expiredDocs, value: stats.expiry.expiredCount, color: '#dc2626' },
    { name: t.expiring7Days, value: stats.expiry.expiring7DaysCount, color: '#f97316' },
    { name: t.expiring30Days, value: stats.expiry.expiring30DaysCount, color: '#eab308' },
    { name: t.validDocs, value: stats.expiry.validCount, color: '#059669' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#006C35] rounded-full inline-block"></span>
            {t.dashboard}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kingdom of Saudi Arabia • Real-time Fleet Telemetry & Government Compliance Control Center
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasRole('ADMIN', 'MANAGER') && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onAddVehicle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#006C35] to-[#005a2c] text-white hover:from-[#005a2c] hover:to-[#004723] transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addVehicle}</span>
            </motion.button>
          )}

          {hasRole('ADMIN', 'HR', 'MANAGER') && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onAddWorker}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addWorker}</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onNavigate('MAP')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Live Fleet Map</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={fetchDashboardData}
            title={t.refresh}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#006C35]' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Prominent Urgent Alerts Compliance Banner */}
      <UrgentAlertsBanner
        expiredCount={stats?.expiry?.expiredCount || 0}
        expiring7DaysCount={stats?.expiry?.expiring7DaysCount || 0}
        expiring30DaysCount={stats?.expiry?.expiring30DaysCount || 0}
        validCount={stats?.expiry?.validCount || 0}
        onSelectFilter={filter => {
          setActiveAlertFilter(filter);
          onNavigate('EXPIRY_ALERTS');
        }}
        activeFilter={activeAlertFilter}
      />

      {/* Adsterra Leaderboard Ad Unit (Top of Dashboard) */}
      <AdsterraBanner format="728x90" placement="dashboardTop" />

      {/* Clean Minimalism Featured Top 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fleet Status (Saudi Emerald Highlight) */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onNavigate('VEHICLES')}
          className="relative overflow-hidden bg-gradient-to-br from-[#006C35] to-[#004f26] p-5 rounded-2xl text-white shadow-xs hover:shadow-lg cursor-pointer transition-shadow group"
        >
          {/* Subtle luxury light sweep */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform pointer-events-none" />

          <div className="text-xs font-medium opacity-85 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Fleet Status</span>
            <Truck className="w-4 h-4 opacity-85 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold">
            {stats?.kpis?.totalVehicles ?? 0} <span className="text-sm font-normal opacity-70">Vehicles</span>
          </div>
          <div className="mt-2.5 flex gap-2">
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium backdrop-blur-xs">
              {stats?.kpis?.activeVehicles ?? 0} Active
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium backdrop-blur-xs">
              {stats?.kpis?.maintenanceDueCount ?? 0} Maint.
            </span>
          </div>
        </motion.div>

        {/* Card 2: Workforce */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onNavigate('WORKERS')}
          className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-[#006C35]/60 cursor-pointer transition-all group"
        >
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Workforce</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-[#006C35] transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats?.kpis?.totalWorkers ?? 0} <span className="text-sm font-normal text-slate-400">Total</span>
          </div>
          <div className="mt-2.5 flex gap-2">
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-semibold border border-green-200/50">
              {stats?.kpis?.activeWorkers ?? 0} Active Personnel
            </span>
          </div>
        </motion.div>

        {/* Card 3: Urgent Alerts */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onNavigate('EXPIRY_ALERTS')}
          className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-red-400 cursor-pointer transition-all group"
        >
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Urgent Expiries</span>
            <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {(stats?.expiry?.expiredCount || 0) + (stats?.expiry?.expiring7DaysCount || 0)}{' '}
            <span className="text-sm font-normal text-slate-400">Docs</span>
          </div>
          <div className="mt-2.5 flex gap-2">
            <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-red-200/60">
              {stats?.expiry?.expiredCount ?? 0} EXPIRED
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold border border-amber-200/60">
              {stats?.expiry?.expiring7DaysCount ?? 0} 7-Day Alert
            </span>
          </div>
        </motion.div>

        {/* Card 4: Monthly Operational Spend */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onNavigate('EXPENSES')}
          className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-[#006C35]/60 cursor-pointer transition-all group"
        >
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Monthly Cost</span>
            <DollarSign className="w-4 h-4 text-[#006C35] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-[#006C35]">
            {formatCurrency(stats?.kpis?.currentMonthExpenses || 0)}
          </div>
          <div className="mt-2.5 flex gap-2">
            <span className="text-[10px] bg-emerald-50 text-[#006C35] px-2 py-0.5 rounded font-semibold border border-emerald-200/50">
              Fuel: {formatCurrency(stats?.kpis?.currentMonthFuelExpenses || 0)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* LIVE GPS SATELLITE RADAR & FLEET MAP WIDGET */}
      <DashboardLiveGpsMapCard
        onOpenVehicle={onOpenVehicle}
        onNavigateToFleetMap={() => onNavigate('FLEET_MAP')}
      />

      {/* PREDICTIVE MAINTENANCE RADAR & HEURISTIC SERVICE FORECAST */}
      <PredictiveMaintenanceWidget
        onOpenVehicle={onOpenVehicle}
        onScheduleMaintenance={vehicleId => onAddMaintenance(vehicleId)}
        onNavigateToMaintenance={() => onNavigate('MAINTENANCE')}
      />

      {/* Two Column Charts: Monthly Spend Trends & Compliance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Expense Trends (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <span className="w-2 h-4 bg-[#006C35] rounded-full"></span>
                Monthly Operational Spend Trends (SAR)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Breakdown of Fuel, Maintenance, and General Fleet Operations</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('EXPENSES')}
              className="text-xs font-semibold text-[#006C35] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {stats?.monthlyTrends && stats.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip
                    formatter={(val: number) => [`${val?.toLocaleString()} SAR`, '']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="fuel" name="Fuel (الوقود)" fill="#006C35" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maintenance" name="Maintenance (الصيانة)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="other" name="Other (أخرى)" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading spend statistics...
              </div>
            )}
          </div>
        </div>

        {/* Compliance Distribution Pie (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-wide mb-1 flex items-center gap-2">
              <span className="w-2 h-4 bg-[#006C35] rounded-full"></span>
              Document Compliance Status
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Total {stats?.expiry?.totalDocumentsTracked || 0} Saudi regulatory documents tracked
            </p>

            <div className="h-44 w-full relative flex items-center justify-center">
              {compliancePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compliancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {compliancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span className="text-slate-600 font-medium">Expired: <strong>{stats?.expiry?.expiredCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="text-slate-600 font-medium">7 Days: <strong>{stats?.expiry?.expiring7DaysCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="text-slate-600 font-medium">30 Days: <strong>{stats?.expiry?.expiring30DaysCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006C35]"></span>
              <span className="text-slate-600 font-medium">Valid: <strong>{stats?.expiry?.validCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Attention Table: Immediate Action Alerts */}
      {stats?.expiry?.urgentAlerts && stats.expiry.urgentAlerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Critical Compliance Items Requiring Action
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_ALERTS')}
              className="text-xs font-bold text-emerald-900 hover:underline flex items-center gap-1"
            >
              <span>{t.viewAllAlerts}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Asset / Worker</th>
                  <th className="py-2.5 px-3">Document</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right rtl:text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.expiry.urgentAlerts.slice(0, 5).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.entityName}</div>
                      <div className="text-[11px] text-slate-500">{item.entitySubtext} • {item.department}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-emerald-950">{item.documentTypeName}</span>
                      <div className="text-[10px] text-slate-400 font-mono">#{item.documentNumber}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {formatDate(item.expiryDate)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.daysRemaining < 0
                            ? 'bg-red-100 text-red-800'
                            : (item.daysRemaining <= 7 ? 'bg-amber-100 text-amber-900' : 'bg-yellow-100 text-yellow-900')
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatDaysRemainingText(item.daysRemaining)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right rtl:text-left">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.entityType === 'VEHICLE') onOpenVehicle(item.entityId);
                          else onOpenWorker(item.entityId);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-950 hover:text-white transition-colors"
                      >
                        <span>360° Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adsterra Footer/Responsive Ad Unit */}
      <AdsterraBanner format="responsive" placement="dashboardSidebar" className="mt-4" />
    </div>
  );
};
