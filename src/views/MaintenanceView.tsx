import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Calendar,
  DollarSign,
  AlertCircle,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { MaintenanceLog, Vehicle } from '../types';
import { dispatchEventToGoogleChat } from '../services/webhookApi';

interface MaintenanceViewProps {
  onOpenMaintenanceModal: (vehicleId?: string) => void;
  onOpenVehicle: (id: string) => void;
  vehicles: Vehicle[];
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  onOpenMaintenanceModal,
  onOpenVehicle,
  vehicles
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();
  const { token, hasRole } = useAuth();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pushingLogId, setPushingLogId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePushLogToGoogleChat = async (log: MaintenanceLog) => {
    setPushingLogId(log.id);
    const res = await dispatchEventToGoogleChat(
      {
        category: 'MAINTENANCE_EVENT',
        entityId: log.vehicleId,
        entityName: log.vehicleName || `Vehicle #${log.plateNumber}`,
        plateOrId: log.plateNumber,
        maintenanceType: log.maintenanceType,
        workshop: log.workshop,
        cost: log.totalCost,
        odometer: log.mileage,
        severity: log.totalCost > 2000 || log.maintenanceType === 'CORRECTIVE' ? 'CRITICAL' : 'WARNING',
        notes: log.description || `Maintenance record logged for ${log.vehicleName}.`
      },
      token
    );
    setPushingLogId(null);

    if (res.success) {
      showToast(`Pushed maintenance record for "${log.vehicleName || log.plateNumber}" to ${res.dispatchedCount ?? 0} Google Chat spaces.`);
    } else {
      showToast(res.error || 'Failed to dispatch to Google Chat.');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.records || data?.data || []);
        setLogs(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Maintenance fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];
  const totalSpend = safeLogs.reduce((acc, log) => acc + (log.totalCost || 0), 0);

  const filteredLogs = safeLogs.filter(log => {
    if (typeFilter !== 'ALL' && log.maintenanceType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlate = (log.plateNumber || '').toLowerCase().includes(q);
      const matchVehicle = (log.vehicleName || '').toLowerCase().includes(q);
      const matchWorkshop = (log.workshop || '').toLowerCase().includes(q);
      const matchDesc = (log.description || '').toLowerCase().includes(q);
      if (!matchPlate && !matchVehicle && !matchWorkshop && !matchDesc) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map(l => ({
      'Date': l.date,
      'Vehicle': l.vehicleName,
      'Saudi Plate': l.plateNumber,
      'Type': l.maintenanceType,
      'Workshop': l.workshop,
      'Odometer (KM)': l.mileage,
      'Labor Cost (SAR)': l.laborCost,
      'Parts Cost (SAR)': l.partsCost,
      'Total Cost (SAR)': l.totalCost,
      'Parts Replaced': l.parts || '—',
      'Next Service KM': l.nextMaintenanceMileage || '—',
      'Next Service Date': l.nextMaintenanceDate || '—',
      'Status': l.status
    }));
    exportToExcel(data, 'Saudi_Fleet_Maintenance_Logs', 'Maintenance');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-emerald-800" />
            <span>{t.maintenance} ({logs.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Service Work Orders, Preventive Schedules, Spare Parts, Oil Changes & Workshop Costs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950">
            Total Spend: <span className="font-black">{formatCurrency(totalSpend)}</span>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          {hasRole('ADMIN', 'MANAGER') && (
            <button
              type="button"
              onClick={() => onOpenMaintenanceModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addMaintenance}</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by plate, workshop, description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Maintenance Types</option>
          <option value="PREVENTIVE">Preventive Maintenance (دورية)</option>
          <option value="OIL_CHANGE">Oil & Filter Change (زيوت وفلاتر)</option>
          <option value="TIRE_REPLACEMENT">Tires (إطارات)</option>
          <option value="BRAKE_SERVICE">Brakes (فرامل)</option>
          <option value="CORRECTIVE">Corrective Repair (طارئة)</option>
          <option value="ENGINE_OVERHAUL">Engine Overhaul (توضيب)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading maintenance logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">No maintenance work orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle & Plate</th>
                  <th className="py-3 px-4">Type & Workshop</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Cost Breakdown</th>
                  <th className="py-3 px-4">Total (SAR)</th>
                  <th className="py-3 px-4">Next Due Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rtl:text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {formatDate(log.date)}
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div
                        onClick={() => onOpenVehicle(log.vehicleId)}
                        className="cursor-pointer hover:underline font-bold text-slate-900 flex items-center gap-1"
                      >
                        <span>{log.vehicleName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono font-bold">{log.plateNumber}</div>
                    </td>

                    {/* Type & Workshop */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {log.maintenanceType}
                      </span>
                      <div className="text-[11px] text-slate-600 mt-1">{log.workshop}</div>
                      {log.description && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{log.description}</div>
                      )}
                    </td>

                    {/* Odometer */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {log.mileage?.toLocaleString()} KM
                    </td>

                    {/* Cost breakdown */}
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                      <div>Labor: {formatCurrency(log.laborCost || 0)}</div>
                      <div>Parts: {formatCurrency(log.partsCost || 0)}</div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 whitespace-nowrap font-black text-sm text-slate-900">
                      {formatCurrency(log.totalCost)}
                    </td>

                    {/* Next Schedule */}
                    <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                      {log.nextMaintenanceMileage && (
                        <div className="font-mono font-bold text-slate-800">
                          {log.nextMaintenanceMileage.toLocaleString()} KM
                        </div>
                      )}
                      {log.nextMaintenanceDate && (
                        <div className="text-slate-500 text-[10px]">{formatDate(log.nextMaintenanceDate)}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (log.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800')
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePushLogToGoogleChat(log)}
                          disabled={pushingLogId === log.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-50"
                          title="Push maintenance update card to Google Chat spaces"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-700" />
                          <span>{pushingLogId === log.id ? 'Pushing...' : 'Chat Push'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenVehicle(log.vehicleId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-950 hover:text-white transition-colors"
                        >
                          <span>Vehicle 360°</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
