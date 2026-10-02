import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  DollarSign,
  TrendingUp,
  MapPin,
  Users
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { FuelLog, Vehicle, Worker } from '../types';

interface FuelViewProps {
  onOpenFuelModal: (vehicleId?: string) => void;
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
  vehicles: Vehicle[];
  workers: Worker[];
}

export const FuelView: React.FC<FuelViewProps> = ({
  onOpenFuelModal,
  onOpenVehicle,
  onOpenWorker,
  vehicles,
  workers
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();
  const { token, hasRole } = useAuth();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fuel', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.records || data?.data || []);
        setLogs(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Fuel fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];
  const totalCost = safeLogs.reduce((acc, l) => acc + (l.totalCost || 0), 0);
  const totalLiters = safeLogs.reduce((acc, l) => acc + (l.liters || 0), 0);

  const filteredLogs = safeLogs.filter(log => {
    if (fuelTypeFilter !== 'ALL' && log.fuelType !== fuelTypeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlate = (log.plateNumber || '').toLowerCase().includes(q);
      const matchDriver = (log.driverName || '').toLowerCase().includes(q);
      const matchStation = (log.fuelStation || '').toLowerCase().includes(q);
      if (!matchPlate && !matchDriver && !matchStation) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map(l => ({
      'Date': l.date,
      'Vehicle': l.vehicleName,
      'Saudi Plate': l.plateNumber,
      'Driver': l.driverName || '—',
      'Fuel Type': l.fuelType,
      'Liters (L)': l.liters,
      'Price / Liter (SAR)': l.pricePerLiter,
      'Total Cost (SAR)': l.totalCost,
      'Odometer (KM)': l.mileage,
      'Station': l.fuelStation,
      'Notes': l.notes || '—'
    }));
    exportToExcel(data, 'Saudi_Fleet_Fuel_Refills', 'Fuel Logs');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Fuel className="w-6 h-6 text-emerald-800" />
            <span>{t.fuel} ({logs.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet Fuel Consumption Telemetry, Petrol Stations (SASCO, Aldrees), Liters & SAR Allocations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950">
            Total Spend: <span className="font-black">{formatCurrency(totalCost)}</span> ({totalLiters.toLocaleString()} L)
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenFuelModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addFuelRecord}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by plate, driver name, fuel station..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
          />
        </div>

        <select
          value={fuelTypeFilter}
          onChange={e => setFuelTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Fuel Grades</option>
          <option value="GASOLINE_91">Gasoline 91 (بنزين ٩١)</option>
          <option value="GASOLINE_95">Gasoline 95 (بنزين ٩٥)</option>
          <option value="DIESEL">Diesel (ديزل)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading fuel transaction records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Fuel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">No fuel refill logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle & Plate</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Fuel Grade</th>
                  <th className="py-3 px-4">Quantity & Rate</th>
                  <th className="py-3 px-4">Total (SAR)</th>
                  <th className="py-3 px-4">Station & Odometer</th>
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

                    {/* Driver */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.driverWorkerId ? (
                        <div
                          onClick={() => onOpenWorker(log.driverWorkerId!)}
                          className="cursor-pointer hover:underline font-semibold text-slate-800"
                        >
                          {log.driverName}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Anonymous</span>
                      )}
                    </td>

                    {/* Grade */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {log.fuelType}
                      </span>
                    </td>

                    {/* Quantity & Rate */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{log.liters} Liters</div>
                      <div className="text-[10px] text-slate-400">{log.pricePerLiter} SAR / L</div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 whitespace-nowrap font-black text-sm text-emerald-950">
                      {formatCurrency(log.totalCost)}
                    </td>

                    {/* Station & Odometer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{log.fuelStation}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.mileage?.toLocaleString()} KM</div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <button
                        type="button"
                        onClick={() => onOpenVehicle(log.vehicleId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-950 hover:text-white transition-colors"
                      >
                        <span>Vehicle 360°</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
