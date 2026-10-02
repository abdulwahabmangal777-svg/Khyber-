import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  FileText,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Wrench,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ShieldAlert,
  QrCode,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Clock,
  UploadCloud
} from 'lucide-react';
import { SaudiPlate } from '../components/SaudiPlate';
import { AssetQRLabelModal } from '../components/AssetQRLabelModal';
import { BulkImportModal } from '../components/common/BulkImportModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf, exportToCsv } from '../utils/export';
import { Vehicle, Department, Worker } from '../types';

interface VehiclesViewProps {
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicle: Vehicle) => void;
  onAddMaintenance: (vehicleId: string) => void;
  onAddFuel: (vehicleId: string) => void;
  departments: Department[];
  workers: Worker[];
  onRefresh?: () => void;
}

type SortField =
  | 'nearestExpiry'
  | 'lastMaintenanceDate'
  | 'istimaraExpiry'
  | 'insuranceExpiry'
  | 'inspectionExpiry'
  | 'currentMileage'
  | 'plateNumber'
  | 'make'
  | 'department'
  | 'status'
  | 'year';

type SortDirection = 'asc' | 'desc';

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  onOpenVehicle,
  onOpenWorker,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onAddMaintenance,
  onAddFuel,
  departments,
  workers,
  onRefresh
}) => {
  const { t, language, formatDate, formatDaysRemainingText } = useLanguage();
  const { token, hasRole } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('nearestExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedQRVehicle, setSelectedQRVehicle] = useState<Vehicle | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.data || []);
        setVehicles(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Vehicles fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeVehicles = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);

  // Compute live vehicle count for each department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: safeVehicles.length };
    for (const v of safeVehicles) {
      if (v.departmentId) {
        counts[v.departmentId] = (counts[v.departmentId] || 0) + 1;
      }
    }
    return counts;
  }, [safeVehicles]);

  // Helper to calculate days remaining from date string if not precalculated
  const getDaysRemaining = (dateStr?: string): number => {
    if (!dateStr) return 99999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper to compute min expiry days for sorting
  const getMinExpiryDays = (v: Vehicle): number => {
    if (typeof v.nearestExpiryDaysRemaining === 'number') {
      return v.nearestExpiryDaysRemaining;
    }
    const ist = v.istimaraExpiry ? getDaysRemaining(v.istimaraExpiry) : 99999;
    const ins = v.insuranceExpiry ? getDaysRemaining(v.insuranceExpiry) : 99999;
    const insp = v.inspectionExpiry ? getDaysRemaining(v.inspectionExpiry) : 99999;
    return Math.min(ist, ins, insp);
  };

  // Filtered & Sorted Vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    // 1. Filter
    const filtered = safeVehicles.filter(v => {
      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchPlate = (v.plateNumber || '').toLowerCase().includes(q) ||
          (v.plateDigits || '').includes(q) ||
          (v.plateLettersEn || '').toLowerCase().includes(q) ||
          (v.plateDigitsAr || '').includes(q) ||
          (v.plateLettersAr || '').includes(q);
        const matchMake = (v.make || '').toLowerCase().includes(q) || (v.model || '').toLowerCase().includes(q);
        const matchVin = (v.vin || '').toLowerCase().includes(q);
        const matchId = (v.internalVehicleId || '').toLowerCase().includes(q);
        const matchDriver = (v.driver?.fullName || v.driverName || '').toLowerCase().includes(q);
        const matchDept = (v.departmentName || '').toLowerCase().includes(q);
        if (!matchPlate && !matchMake && !matchVin && !matchId && !matchDriver && !matchDept) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter !== 'ALL' && v.departmentId !== departmentFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // Compliance filter
      if (complianceFilter === 'EXPIRED' && !v.hasExpiredDocs) {
        const minDays = getMinExpiryDays(v);
        if (minDays >= 0) return false;
      }
      if (complianceFilter === 'URGENT' && !v.hasUrgentDocs) {
        const minDays = getMinExpiryDays(v);
        if (minDays < 0 || minDays > 7) return false;
      }

      return true;
    });

    // 2. Automated Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'nearestExpiry': {
          const daysA = getMinExpiryDays(a);
          const daysB = getMinExpiryDays(b);
          comparison = daysA - daysB;
          break;
        }

        case 'lastMaintenanceDate': {
          const timeA = a.lastMaintenanceDate ? new Date(a.lastMaintenanceDate).getTime() : 0;
          const timeB = b.lastMaintenanceDate ? new Date(b.lastMaintenanceDate).getTime() : 0;
          // If sorting ascending, place null/no-records at the end
          if (!timeA && timeB) comparison = 1;
          else if (timeA && !timeB) comparison = -1;
          else comparison = timeA - timeB;
          break;
        }

        case 'istimaraExpiry': {
          const timeA = a.istimaraExpiry ? new Date(a.istimaraExpiry).getTime() : 9999999999999;
          const timeB = b.istimaraExpiry ? new Date(b.istimaraExpiry).getTime() : 9999999999999;
          comparison = timeA - timeB;
          break;
        }

        case 'insuranceExpiry': {
          const timeA = a.insuranceExpiry ? new Date(a.insuranceExpiry).getTime() : 9999999999999;
          const timeB = b.insuranceExpiry ? new Date(b.insuranceExpiry).getTime() : 9999999999999;
          comparison = timeA - timeB;
          break;
        }

        case 'inspectionExpiry': {
          const timeA = a.inspectionExpiry ? new Date(a.inspectionExpiry).getTime() : 9999999999999;
          const timeB = b.inspectionExpiry ? new Date(b.inspectionExpiry).getTime() : 9999999999999;
          comparison = timeA - timeB;
          break;
        }

        case 'currentMileage': {
          const m1 = a.currentMileage || 0;
          const m2 = b.currentMileage || 0;
          comparison = m1 - m2;
          break;
        }

        case 'plateNumber': {
          const p1 = `${a.plateDigits || ''} ${a.plateLettersEn || ''}`;
          const p2 = `${b.plateDigits || ''} ${b.plateLettersEn || ''}`;
          comparison = p1.localeCompare(p2);
          break;
        }

        case 'make': {
          const nameA = `${a.make || ''} ${a.model || ''}`;
          const nameB = `${b.make || ''} ${b.model || ''}`;
          comparison = nameA.localeCompare(nameB);
          break;
        }

        case 'department': {
          const deptA = a.departmentName || '';
          const deptB = b.departmentName || '';
          comparison = deptA.localeCompare(deptB);
          break;
        }

        case 'status': {
          const statusOrder: Record<string, number> = { ACTIVE: 1, MAINTENANCE: 2, INACTIVE: 3, SOLD: 4 };
          comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;
        }

        case 'year': {
          comparison = (a.year || 0) - (b.year || 0);
          break;
        }

        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [safeVehicles, searchQuery, departmentFilter, statusFilter, complianceFilter, sortField, sortDirection]);

  // Handle header click to toggle or switch sort
  const handleSortToggle = (field: SortField, defaultDirection: SortDirection = 'asc') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(defaultDirection);
    }
  };

  // Reset all active filters and sorting
  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setComplianceFilter('ALL');
    setSortField('nearestExpiry');
    setSortDirection('asc');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    departmentFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    complianceFilter !== 'ALL' ||
    sortField !== 'nearestExpiry' ||
    sortDirection !== 'asc';

  const handleDownloadReport = () => {
    if (filteredAndSortedVehicles.length === 0) return;
    const data = filteredAndSortedVehicles.map(v => ({
      'Vehicle ID': v.internalVehicleId,
      'Saudi Plate': v.plateNumber,
      'Plate Digits (EN)': v.plateDigits || '',
      'Plate Letters (EN)': v.plateLettersEn || '',
      'Plate Digits (AR)': v.plateDigitsAr || '',
      'Plate Letters (AR)': v.plateLettersAr || '',
      'Make': v.make,
      'Model': v.model,
      'Year': v.year,
      'Vehicle Type': v.vehicleType,
      'Color': v.color || '',
      'VIN / Chassis #': v.vin || '',
      'Ownership Type': v.ownershipType || 'OWNED',
      'Department': v.departmentName || '',
      'Current Location': v.currentLocation || '',
      'Assigned Driver': v.driver ? `${v.driver.fullName} (${v.driver.employeeId})` : (v.driverName || 'Unassigned'),
      'Driver Mobile': v.driver?.mobileNumber || '',
      'Last Maintenance Date': v.lastMaintenanceDate || 'No Records',
      'Last Service Type': v.lastMaintenanceType || '—',
      'Istimara Expiry': v.istimaraExpiry || '',
      'Insurance Expiry': v.insuranceExpiry || '',
      'Insurance Company': v.insuranceCompany || '',
      'Insurance Policy #': v.insurancePolicyNumber || '',
      'MVPI Fahs Expiry': v.inspectionExpiry || '',
      'Mileage (KM)': v.currentMileage || 0,
      'Fuel Type': v.fuelType || '',
      'Status': v.status
    }));
    exportToCsv(data, 'Saudi_Fleet_Vehicles_Report');
  };

  const handleExportExcel = () => {
    const data = filteredAndSortedVehicles.map(v => ({
      'Vehicle ID': v.internalVehicleId,
      'Saudi Plate': v.plateNumber,
      'Make & Model': `${v.make} ${v.model} (${v.year})`,
      'Type': v.vehicleType,
      'Chassis / VIN': v.vin,
      'Department': v.departmentName,
      'Assigned Driver': v.driver ? `${v.driver.fullName} (${v.driver.employeeId})` : (v.driverName || 'Unassigned'),
      'Last Maintenance Date': v.lastMaintenanceDate || 'No Records',
      'Last Service Type': v.lastMaintenanceType || '—',
      'Istimara Expiry': v.istimaraExpiry,
      'Insurance Expiry': v.insuranceExpiry,
      'Insurance Company': v.insuranceCompany,
      'MVPI Fahs Expiry': v.inspectionExpiry,
      'Mileage (KM)': v.currentMileage,
      'Status': v.status
    }));
    exportToExcel(data, 'Saudi_Fleet_Vehicles_Registry', 'Fleet Registry');
  };

  const handleExportPdf = () => {
    const headers = ['ID', 'Plate #', 'Make / Model', 'Department', 'Assigned Driver', 'Last Service', 'Istimara Expiry', 'Insurance Expiry', 'Mileage', 'Status'];
    const rows = filteredAndSortedVehicles.map(v => [
      v.internalVehicleId,
      v.plateNumber,
      `${v.make} ${v.model}`,
      v.departmentName || '',
      v.driver ? v.driver.fullName : (v.driverName || '—'),
      v.lastMaintenanceDate || '—',
      v.istimaraExpiry,
      v.insuranceExpiry,
      `${v.currentMileage?.toLocaleString()} KM`,
      v.status
    ]);
    exportToPdf('Saudi Enterprise Fleet Vehicles Register', headers, rows, 'Fleet_Vehicles_Report');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-800" />
            <span>{t.vehicles} ({safeVehicles.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet Asset Tracking, Saudi License Plates, Morour Istimara, Insurance & Scheduled Maintenance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="download-vehicles-report-btn"
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download CSV Report of current filtered list"
            aria-label="Download Report"
          >
            <Download className="w-4 h-4 text-emerald-800" />
            <span>{t.downloadReport || 'Download Report'}</span>
          </button>

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
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>{t.exportPdf}</span>
          </button>

          {hasRole('ADMIN', 'MANAGER') && (
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
              title={language === 'ar' ? 'استيراد مركبات جماعياً عبر Excel أو CSV' : 'Bulk Import Vehicles via Excel or CSV'}
            >
              <UploadCloud className="w-4 h-4 text-emerald-700" />
              <span>{language === 'ar' ? 'استيراد جماعي' : (language === 'ps' ? 'ډله ایز واردول' : 'Bulk Import')}</span>
            </button>
          )}

          {hasRole('ADMIN', 'MANAGER') && (
            <button
              type="button"
              onClick={onAddVehicle}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addVehicle}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Dedicated Department Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Building2 className="w-4 h-4 text-emerald-800" />
            <span>{t.filterByDepartment || 'Filter by Department'}</span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredAndSortedVehicles.length}</strong> of {safeVehicles.length} vehicles
          </span>
        </div>

        {/* Horizontal Department Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {/* ALL DEPARTMENTS PILL */}
          <button
            type="button"
            onClick={() => setDepartmentFilter('ALL')}
            className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              departmentFilter === 'ALL'
                ? 'bg-emerald-950 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.allDepartments || 'All Departments'}</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                departmentFilter === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {departmentCounts['ALL'] || safeVehicles.length}
            </span>
          </button>

          {/* INDIVIDUAL DEPARTMENT PILLS */}
          {departments.map(dept => {
            const isSelected = departmentFilter === dept.id;
            const count = departmentCounts[dept.id] || 0;
            const deptLabel = language === 'ar' ? (dept.nameAr || dept.name) : dept.name;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setDepartmentFilter(dept.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-emerald-950 text-white border-emerald-950 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{deptLabel}</span>
                {dept.code && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                      isSelected ? 'bg-white/20 text-emerald-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {dept.code}
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0 ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter & Automated Sort Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by plate number (e.g. 7845 XYZ), VIN, driver, make, model, department..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
            >
              <option value="ALL">All Statuses (الحالة)</option>
              <option value="ACTIVE">ACTIVE (جاهزة)</option>
              <option value="MAINTENANCE">IN MAINTENANCE (صيانة)</option>
              <option value="INACTIVE">INACTIVE (متوقفة)</option>
              <option value="SOLD">SOLD (مباعة)</option>
            </select>

            {/* Compliance Filter */}
            <select
              value={complianceFilter}
              onChange={e => setComplianceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
            >
              <option value="ALL">All Compliance (الالتزام)</option>
              <option value="EXPIRED">🔴 Expired Docs Only</option>
              <option value="URGENT">🟠 Expiring ≤ 7 Days</option>
            </select>

            {/* Automated Sort-By Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <label htmlFor="vehicle-sort-select" className="text-[11px] font-bold text-slate-600 shrink-0">
                {t.sortBy || 'Sort'}:
              </label>
              <select
                id="vehicle-sort-select"
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="bg-transparent text-xs font-bold text-slate-800 border-0 p-0 pr-5 focus:ring-0 cursor-pointer"
              >
                <option value="nearestExpiry">⚡ Nearest Expiry Date (الأقرب انتهاءً)</option>
                <option value="lastMaintenanceDate">🛠️ Last Maintenance Date (تاريخ آخر صيانة)</option>
                <option value="istimaraExpiry">📄 Istimara Expiry (انتهاء الاستمارة)</option>
                <option value="insuranceExpiry">🛡️ Insurance Expiry (انتهاء التأمين)</option>
                <option value="inspectionExpiry">🔍 MVPI Inspection Expiry (الفحص الدوري)</option>
                <option value="currentMileage">🚗 Mileage / Odometer (قراءة العداد)</option>
                <option value="plateNumber">🔢 Saudi Plate Number (رقم اللوحة)</option>
                <option value="make">🏷️ Make & Model (الشركة والموديل)</option>
                <option value="department">🏢 Department (الإدارة / القسم)</option>
                <option value="status">🚦 Status (حالة التشغيل)</option>
                <option value="year">📅 Model Year (سنة الصنع)</option>
              </select>

              {/* Ascending / Descending Direction Toggle */}
              <button
                type="button"
                onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                title={sortDirection === 'asc' ? (t.sortAscending || 'Ascending (Click for Descending)') : (t.sortDescending || 'Descending (Click for Ascending)')}
                className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-emerald-800 transition-colors shadow-2xs flex items-center gap-0.5"
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span className="text-[10px] font-mono font-bold uppercase">{sortDirection}</span>
              </button>
            </div>

            {/* Clear / Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all filters and sorting to defaults"
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicles Table with Clickable Sort Headers */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading fleet registry...
          </div>
        ) : filteredAndSortedVehicles.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your department filter, sort options, or search terms</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Filters & Reset Sort</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  {/* Plate Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('plateNumber', 'asc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'plateNumber' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Saudi License Plate</span>
                      {sortField === 'plateNumber' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Vehicle Details Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('make', 'asc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'make' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Vehicle & Department</span>
                      {sortField === 'make' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Driver Column */}
                  <th className="py-3 px-4">Assigned Driver</th>

                  {/* Last Maintenance Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('lastMaintenanceDate', 'desc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'lastMaintenanceDate' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.lastMaintenanceDate || 'Last Maintenance'}</span>
                      {sortField === 'lastMaintenanceDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Istimara Expiry Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('istimaraExpiry', 'asc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'istimaraExpiry' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Istimara Expiry</span>
                      {sortField === 'istimaraExpiry' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Insurance Expiry Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('insuranceExpiry', 'asc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'insuranceExpiry' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Insurance Expiry</span>
                      {sortField === 'insuranceExpiry' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Mileage Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('currentMileage', 'desc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'currentMileage' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Odometer</span>
                      {sortField === 'currentMileage' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* Status Column Header */}
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSortToggle('status', 'asc')}
                      className={`inline-flex items-center gap-1 hover:text-emerald-950 font-bold text-left rtl:text-right ${
                        sortField === 'status' ? 'text-emerald-900 font-black' : ''
                      }`}
                    >
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-800" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Plate Column */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <SaudiPlate
                        plateDigits={v.plateDigits}
                        plateLettersEn={v.plateLettersEn}
                        plateDigitsAr={v.plateDigitsAr}
                        plateLettersAr={v.plateLettersAr}
                        size="sm"
                      />
                    </td>

                    {/* Make / Model / VIN / ID / Department */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {v.make} {v.model} <span className="text-xs font-normal text-slate-500">({v.year})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-mono font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">{v.internalVehicleId}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">VIN: {v.vin?.slice(-6)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                          <Building2 className="w-2.5 h-2.5" />
                          {v.departmentName || 'Fleet'}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Driver */}
                    <td className="py-3 px-4">
                      {v.driver ? (
                        <div
                          onClick={() => onOpenWorker(v.driver!.id)}
                          className="cursor-pointer hover:opacity-80 group"
                        >
                          <div className="font-bold text-slate-900 group-hover:text-emerald-950 flex items-center gap-1">
                            <span>{v.driver.fullName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">Iqama: {v.driver.iqamaNumber}</div>
                          <div className="text-[10px] text-emerald-800 font-semibold">{v.driver.mobileNumber}</div>
                        </div>
                      ) : v.driverName && v.driverName !== 'Unassigned' ? (
                        <div>
                          <div className="font-bold text-slate-900">{v.driverName}</div>
                          {v.driverIqama && <div className="text-[11px] text-slate-500 font-mono">Iqama: {v.driverIqama}</div>}
                          {v.driverPhone && <div className="text-[10px] text-emerald-800 font-semibold">{v.driverPhone}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Last Maintenance Date Column */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {v.lastMaintenanceDate ? (
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(v.lastMaintenanceDate)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {v.lastMaintenanceType && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                {v.lastMaintenanceType.replace(/_/g, ' ')}
                              </span>
                            )}
                            {v.lastMaintenanceMileage ? (
                              <span className="font-mono text-slate-600">{v.lastMaintenanceMileage.toLocaleString()} KM</span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">No Service Logs</div>
                      )}
                    </td>

                    {/* Istimara Expiry */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatDate(v.istimaraExpiry)}</div>
                      <div className="mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            (v.istimaraDaysRemaining !== undefined ? v.istimaraDaysRemaining : getDaysRemaining(v.istimaraExpiry)) < 0
                              ? 'bg-red-100 text-red-800'
                              : ((v.istimaraDaysRemaining !== undefined ? v.istimaraDaysRemaining : getDaysRemaining(v.istimaraExpiry)) <= 7
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-50 text-emerald-800')
                          }`}
                        >
                          {formatDaysRemainingText(v.istimaraDaysRemaining !== undefined ? v.istimaraDaysRemaining : getDaysRemaining(v.istimaraExpiry))}
                        </span>
                      </div>
                    </td>

                    {/* Insurance Expiry */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatDate(v.insuranceExpiry)}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{v.insuranceCompany || 'Standard Policy'}</div>
                    </td>

                    {/* Mileage */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {v.currentMileage?.toLocaleString()} KM
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (v.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700')
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedQRVehicle(v)}
                          title="Print / View Saudi QR Asset Tag"
                          className="p-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 transition-colors border border-emerald-200"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenVehicle(v.id)}
                          title="Open 360° Vehicle Profile"
                          className="p-1.5 rounded-lg bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {hasRole('ADMIN', 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => onAddMaintenance(v.id)}
                            title="Log Maintenance"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-950 transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onAddFuel(v.id)}
                          title="Log Fuel Refill"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-950 transition-colors"
                        >
                          <Fuel className="w-3.5 h-3.5" />
                        </button>

                        {hasRole('ADMIN', 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => onEditVehicle(v)}
                            title="Edit Vehicle"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            onClick={() => onDeleteVehicle(v)}
                            title="Delete Vehicle"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Asset Tag Modal */}
      {selectedQRVehicle && (
        <AssetQRLabelModal
          isOpen={!!selectedQRVehicle}
          onClose={() => setSelectedQRVehicle(null)}
          type="VEHICLE"
          data={selectedQRVehicle}
        />
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onImportSuccess={() => {
            setIsBulkImportOpen(false);
            fetchVehicles();
            onRefresh?.();
          }}
          type="VEHICLES"
        />
      )}
    </div>
  );
};

