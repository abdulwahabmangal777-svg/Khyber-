import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  FileText,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Briefcase,
  QrCode,
  Camera,
  UploadCloud
} from 'lucide-react';
import { AssetQRLabelModal } from '../components/AssetQRLabelModal';
import { WorkerPhotoUploadModal } from '../components/common/WorkerPhotoUploadModal';
import { BulkImportModal } from '../components/common/BulkImportModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf, exportToCsv } from '../utils/export';
import { Worker, Department, Vehicle } from '../types';

interface WorkersViewProps {
  onOpenWorker: (id: string) => void;
  onOpenVehicle: (id: string) => void;
  onAddWorker: () => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
  departments: Department[];
  vehicles: Vehicle[];
}

export const WorkersView: React.FC<WorkersViewProps> = ({
  onOpenWorker,
  onOpenVehicle,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  departments,
  vehicles
}) => {
  const { t, formatCurrency, formatDate, formatDaysRemainingText } = useLanguage();
  const { token, hasRole } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [selectedQRWorker, setSelectedQRWorker] = useState<Worker | null>(null);
  const [photoUploadWorker, setPhotoUploadWorker] = useState<Worker | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workers', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.data || []);
        setWorkers(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Workers fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeWorkers = Array.isArray(workers) ? workers : [];

  const filteredWorkers = safeWorkers.filter(w => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = (w.fullName || '').toLowerCase().includes(q) || (w.fullNameAr || '').includes(q);
      const matchIqama = (w.iqamaNumber || '').includes(q);
      const matchEmpId = (w.employeeId || '').toLowerCase().includes(q);
      const matchJob = (w.jobTitle || '').toLowerCase().includes(q);
      const matchNat = (w.nationality || '').toLowerCase().includes(q);
      if (!matchName && !matchIqama && !matchEmpId && !matchJob && !matchNat) {
        return false;
      }
    }

    if (departmentFilter !== 'ALL' && w.departmentId !== departmentFilter) {
      return false;
    }

    if (statusFilter !== 'ALL' && w.status !== statusFilter) {
      return false;
    }

    if (complianceFilter === 'EXPIRED' && !w.hasExpiredDocs) return false;
    if (complianceFilter === 'URGENT' && !w.hasUrgentDocs) return false;

    return true;
  });

  const handleDownloadReport = () => {
    if (filteredWorkers.length === 0) return;
    const data = filteredWorkers.map(w => ({
      'Employee ID': w.employeeId,
      'Full Name': w.fullName,
      'Arabic Name': w.fullNameAr || '',
      'Nationality': w.nationality,
      'Job Title': w.jobTitle,
      'Department': w.departmentName || '',
      'Saudi Iqama #': w.iqamaNumber,
      'Iqama Expiry': w.iqamaExpiry || '',
      'Passport #': w.passportNumber || '',
      'Passport Expiry': w.passportExpiry || '',
      'Work Permit #': w.workPermitNumber || '',
      'Work Permit Expiry': w.workPermitExpiry || '',
      'Medical Insurance #': w.medicalInsuranceNumber || '',
      'Medical Insurance Expiry': w.medicalInsuranceExpiry || '',
      'Driver License #': w.driverLicenseNumber || '—',
      'Driver License Expiry': w.driverLicenseExpiry || '—',
      'Assigned Vehicle': w.assignedVehicle ? `${w.assignedVehicle.internalVehicleId} (${w.assignedVehicle.plateNumber})` : 'Unassigned',
      'Mobile Phone': w.mobileNumber || '',
      'Email': w.email || '',
      'Basic Salary (SAR)': w.salary || 0,
      'Status': w.status
    }));
    exportToCsv(data, 'Saudi_Workforce_Administrative_Report');
  };

  const handleExportExcel = () => {
    const data = filteredWorkers.map(w => ({
      'Employee ID': w.employeeId,
      'Full Name': w.fullName,
      'Arabic Name': w.fullNameAr,
      'Nationality': w.nationality,
      'Job Title': w.jobTitle,
      'Department': w.departmentName,
      'Saudi Iqama #': w.iqamaNumber,
      'Iqama Expiry': w.iqamaExpiry,
      'Passport #': w.passportNumber,
      'Passport Expiry': w.passportExpiry,
      'Driver License #': w.driverLicenseNumber || '—',
      'Assigned Vehicle': w.assignedVehicle ? `${w.assignedVehicle.internalVehicleId} (${w.assignedVehicle.plateNumber})` : 'Unassigned',
      'Mobile Phone': w.mobileNumber,
      'Basic Salary (SAR)': w.salary,
      'Status': w.status
    }));
    exportToExcel(data, 'Saudi_Workforce_Compliance_Registry', 'Workforce');
  };

  const handleExportPdf = () => {
    const headers = ['Emp ID', 'Full Name', 'Nationality', 'Job Title', 'Iqama #', 'Iqama Expiry', 'Vehicle', 'Salary', 'Status'];
    const rows = filteredWorkers.map(w => [
      w.employeeId,
      w.fullName,
      w.nationality,
      w.jobTitle,
      w.iqamaNumber,
      w.iqamaExpiry,
      w.assignedVehicle ? w.assignedVehicle.internalVehicleId : '—',
      `${w.salary?.toLocaleString()} SAR`,
      w.status
    ]);
    exportToPdf('Saudi Enterprise Workforce & Driver Register', headers, rows, 'Workforce_Report');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-800" />
            <span>{t.workers} ({workers.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Workforce Management, 10-Digit Saudi Iqamas, Qiwa Work Permits, Passports & Driver Allocations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="download-workers-report-btn"
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

          {hasRole('ADMIN', 'HR', 'MANAGER') && (
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
              title="Bulk Import Workers via Excel or CSV"
            >
              <UploadCloud className="w-4 h-4 text-emerald-700" />
              <span>Bulk Import</span>
            </button>
          )}

          {hasRole('ADMIN', 'HR', 'MANAGER') && (
            <button
              type="button"
              onClick={onAddWorker}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addWorker}</span>
            </button>
          )}
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
            placeholder="Search by 10-digit Iqama (e.g. 2491028475), name, employee ID, job..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE (على رأس العمل)</option>
            <option value="VACATION">ON VACATION (إجازة)</option>
            <option value="INACTIVE">INACTIVE (متوقف)</option>
          </select>

          <select
            value={complianceFilter}
            onChange={e => setComplianceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Compliance</option>
            <option value="EXPIRED">🔴 Expired Iqama / Docs</option>
            <option value="URGENT">🟠 Expiring ≤ 7 Days</option>
          </select>
        </div>
      </div>

      {/* Main Workforce Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading workforce registry...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Job & Department</th>
                  <th className="py-3 px-4">10-Digit Saudi Iqama</th>
                  <th className="py-3 px-4">Iqama Expiry</th>
                  <th className="py-3 px-4">Assigned Vehicle</th>
                  <th className="py-3 px-4">Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative group shrink-0">
                          <img
                            src={w.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                            alt={w.fullName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                          {hasRole('ADMIN', 'HR', 'MANAGER') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoUploadWorker(w);
                              }}
                              className="absolute inset-0 bg-slate-950/70 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer shadow-xs"
                              title="Upload / Change Worker Photo"
                            >
                              <Camera className="w-4 h-4 text-emerald-300" />
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{w.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-arabic">{w.fullNameAr}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            <span className="font-bold text-emerald-950">{w.employeeId}</span> • {w.nationality}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Job & Dept */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{w.jobTitle}</div>
                      <div className="text-[11px] text-emerald-800 font-medium mt-0.5">{w.departmentName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{w.mobileNumber}</span>
                      </div>
                    </td>

                    {/* Iqama Number */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block">
                        {w.iqamaNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Passport: {w.passportNumber}</div>
                    </td>

                    {/* Iqama Expiry Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{formatDate(w.iqamaExpiry)}</div>
                      <div className="mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            (w.iqamaDaysRemaining || 0) < 0
                              ? 'bg-red-100 text-red-800'
                              : ((w.iqamaDaysRemaining || 0) <= 7 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800')
                          }`}
                        >
                          {formatDaysRemainingText(w.iqamaDaysRemaining || 0)}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Vehicle */}
                    <td className="py-3 px-4">
                      {w.assignedVehicle ? (
                        <div
                          onClick={() => onOpenVehicle(w.assignedVehicle!.id)}
                          className="cursor-pointer hover:opacity-80 group"
                        >
                          <div className="font-bold text-slate-900 group-hover:text-emerald-950 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-emerald-800" />
                            <span>{w.assignedVehicle.internalVehicleId}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            {w.assignedVehicle.plateNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(w.salary)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          w.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (w.status === 'VACATION' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800')
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedQRWorker(w)}
                          title="Print / View Saudi QR Worker Tag"
                          className="p-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 transition-colors border border-emerald-200"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {hasRole('ADMIN', 'HR', 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => setPhotoUploadWorker(w)}
                            title="Upload Worker Identification Photo"
                            className="p-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 transition-colors border border-emerald-200"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenWorker(w.id)}
                          title="Open 360° Worker Profile"
                          className="p-1.5 rounded-lg bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {hasRole('ADMIN', 'HR', 'MANAGER') && (
                          <button
                            type="button"
                            onClick={() => onEditWorker(w)}
                            title="Edit Worker"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasRole('ADMIN') && (
                          <button
                            type="button"
                            onClick={() => onDeleteWorker(w)}
                            title="Delete Worker"
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

      {/* QR Worker Tag Modal */}
      {selectedQRWorker && (
        <AssetQRLabelModal
          isOpen={!!selectedQRWorker}
          onClose={() => setSelectedQRWorker(null)}
          type="WORKER"
          data={selectedQRWorker}
        />
      )}

      {/* Worker Photo Upload Modal */}
      {photoUploadWorker && (
        <WorkerPhotoUploadModal
          isOpen={!!photoUploadWorker}
          worker={photoUploadWorker}
          onClose={() => setPhotoUploadWorker(null)}
          onSuccess={(updatedWorker) => {
            setWorkers(prev => prev.map(item => item.id === updatedWorker.id ? { ...item, photoUrl: updatedWorker.photoUrl } : item));
            setPhotoUploadWorker(null);
          }}
        />
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onImportSuccess={() => {
            setIsBulkImportOpen(false);
            fetchWorkers();
          }}
          type="WORKERS"
        />
      )}
    </div>
  );
};
