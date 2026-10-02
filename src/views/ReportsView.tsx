import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingUp,
  Truck,
  Users,
  ShieldCheck,
  Fuel,
  Wrench,
  DollarSign,
  Clock,
  Mail,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { Department } from '../types';
import { RecurringReportSchedulerModal } from '../components/reports/RecurringReportSchedulerModal';
import { AdsterraBanner } from '../components/ads/AdsterraBanner';

interface ReportsViewProps {
  departments: Department[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ departments }) => {
  const { t, formatCurrency, formatDate } = useLanguage();
  const { token } = useAuth();
  const [selectedReport, setSelectedReport] = useState<string>('EXECUTIVE_SUMMARY');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

  const reportPresets = [
    { id: 'EXECUTIVE_SUMMARY', title: '1. Executive Fleet Summary Report', desc: 'KPI aggregates, active vehicles, workforce size, and total spend' },
    { id: 'REGULATORY_COMPLIANCE', title: '2. Saudi Regulatory Expiry & Compliance Audit', desc: 'Istimara, Iqama, Insurance, Qiwa, Passport, and MVPI compliance' },
    { id: 'WORKFORCE_IQAMA', title: '3. 10-Digit Saudi Iqama & Qiwa Workforce Register', desc: 'Complete workforce roster with job titles, salaries, and Iqama validity' },
    { id: 'FLEET_ALLOCATION', title: '4. Fleet Vehicle Status & Driver Allocation', desc: 'Vehicle plates, VINs, makes, models, and assigned drivers' },
    { id: 'FUEL_CONSUMPTION', title: '5. Monthly Fuel Consumption & Cost Breakdown', desc: 'Liters consumed, SAR/Liter, stations, and vehicle efficiency' },
    { id: 'MAINTENANCE_ANALYSIS', title: '6. Preventive & Corrective Maintenance Analysis', desc: 'Workshop work orders, labor, parts replaced, and upcoming service schedules' },
    { id: 'TCO_LEDGER', title: '7. Vehicle Total Cost of Ownership (TCO)', desc: 'Combined Fuel + Maintenance + Insurance + Operational cost per vehicle' },
    { id: 'DEPT_COST_ALLOCATION', title: '8. Department Operational Cost Allocation', desc: 'Operating spend grouped by Operations, Logistics, Sales, Project Sites' },
    { id: 'INSURANCE_COVERAGE', title: '9. Insurance Policies & Coverage Tracker', desc: 'Policy numbers, insurance providers (Tawuniya, Bupa, etc.), and expiry schedules' },
    { id: 'MVPI_INSPECTION', title: '10. MVPI Periodic Inspection (Fahs) Status', desc: 'Saudi Morour periodic technical inspection readiness' },
    { id: 'URGENT_ACTION_CHECKLIST', title: '11. Expired Assets & Immediate Action Checklist', desc: 'Prioritized list of all expired and expiring regulatory items' }
  ];

  useEffect(() => {
    generateReport();
  }, [selectedReport, departmentFilter]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders(token);
      const [vehRes, workRes, maintRes, fuelRes, expRes, expiryRes] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        fetch('/api/workers', { headers }),
        fetch('/api/maintenance', { headers }),
        fetch('/api/fuel', { headers }),
        fetch('/api/expenses', { headers }),
        fetch('/api/expiry/alerts', { headers })
      ]);

      const vehicles = vehRes.ok ? await vehRes.json() : [];
      const workers = workRes.ok ? await workRes.json() : [];
      const maintenance = maintRes.ok ? await maintRes.json() : [];
      const fuel = fuelRes.ok ? await fuelRes.json() : [];
      const expenses = expRes.ok ? await expRes.json() : [];
      const expiry = expiryRes.ok ? await expiryRes.json() : { alerts: [] };

      setReportData({
        vehicles: Array.isArray(vehicles) ? vehicles : (vehicles?.data || []),
        workers: Array.isArray(workers) ? workers : (workers?.data || []),
        maintenance: Array.isArray(maintenance) ? maintenance : (maintenance?.records || maintenance?.data || []),
        fuel: Array.isArray(fuel) ? fuel : (fuel?.records || fuel?.data || []),
        expenses: Array.isArray(expenses) ? expenses : (expenses?.expenses || expenses?.data || []),
        expiry: Array.isArray(expiry) ? expiry : (expiry?.alerts || expiry?.data || [])
      });
    } catch (err) {
      console.warn('Notice: Reports generation fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;

    if (selectedReport === 'REGULATORY_COMPLIANCE' || selectedReport === 'URGENT_ACTION_CHECKLIST') {
      const data = reportData.expiry.map((a: any) => ({
        'Asset / Worker': a.entityName,
        'Type': a.entityType,
        'Department': a.department,
        'Document Type': a.documentTypeName,
        'Document #': a.documentNumber,
        'Expiry Date': a.expiryDate,
        'Days Remaining': a.daysRemaining,
        'Status': a.status
      }));
      exportToExcel(data, `Saudi_Compliance_Report_${new Date().toISOString().slice(0, 10)}`, 'Compliance');
    } else if (selectedReport === 'WORKFORCE_IQAMA') {
      const data = reportData.workers.map((w: any) => ({
        'Emp ID': w.employeeId,
        'Full Name': w.fullName,
        'Arabic Name': w.fullNameAr,
        'Nationality': w.nationality,
        'Job Title': w.jobTitle,
        'Department': w.departmentName,
        'Saudi Iqama #': w.iqamaNumber,
        'Iqama Expiry': w.iqamaExpiry,
        'Passport #': w.passportNumber,
        'Salary (SAR)': w.salary,
        'Status': w.status
      }));
      exportToExcel(data, `Saudi_Workforce_Register_${new Date().toISOString().slice(0, 10)}`, 'Workforce');
    } else if (selectedReport === 'FUEL_CONSUMPTION') {
      const data = reportData.fuel.map((f: any) => ({
        'Date': f.date,
        'Vehicle': f.vehicleName,
        'Plate': f.plateNumber,
        'Driver': f.driverName || '—',
        'Fuel Grade': f.fuelType,
        'Liters': f.liters,
        'Price/L': f.pricePerLiter,
        'Total (SAR)': f.totalCost,
        'Odometer': f.mileage,
        'Station': f.fuelStation
      }));
      exportToExcel(data, `Saudi_Fuel_Report_${new Date().toISOString().slice(0, 10)}`, 'Fuel Logs');
    } else {
      const data = reportData.vehicles.map((v: any) => ({
        'Vehicle ID': v.internalVehicleId,
        'Plate Number': v.plateNumber,
        'Make & Model': `${v.make} ${v.model}`,
        'Year': v.year,
        'Department': v.departmentName,
        'Driver': v.driver?.fullName || 'Unassigned',
        'Istimara Expiry': v.istimaraExpiry,
        'Insurance Expiry': v.insuranceExpiry,
        'Mileage (KM)': v.currentMileage,
        'Status': v.status
      }));
      exportToExcel(data, `Saudi_Fleet_Report_${new Date().toISOString().slice(0, 10)}`, 'Fleet');
    }
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;
    const reportTitle = reportPresets.find(r => r.id === selectedReport)?.title || 'Fleet Report';

    if (selectedReport === 'WORKFORCE_IQAMA') {
      const headers = ['Emp ID', 'Name', 'Nationality', 'Job Title', 'Iqama #', 'Iqama Expiry', 'Salary', 'Status'];
      const rows = reportData.workers.map((w: any) => [
        w.employeeId,
        w.fullName,
        w.nationality,
        w.jobTitle,
        w.iqamaNumber,
        w.iqamaExpiry,
        `${w.salary} SAR`,
        w.status
      ]);
      exportToPdf(reportTitle, headers, rows, 'Workforce_Report');
    } else if (selectedReport === 'FUEL_CONSUMPTION') {
      const headers = ['Date', 'Vehicle', 'Plate', 'Grade', 'Liters', 'Price/L', 'Total Cost', 'Station'];
      const rows = reportData.fuel.map((f: any) => [
        f.date,
        f.vehicleName,
        f.plateNumber,
        f.fuelType,
        `${f.liters} L`,
        `${f.pricePerLiter} SAR`,
        `${f.totalCost} SAR`,
        f.fuelStation
      ]);
      exportToPdf(reportTitle, headers, rows, 'Fuel_Report');
    } else {
      const headers = ['Vehicle ID', 'Plate #', 'Make / Model', 'Department', 'Driver', 'Istimara Expiry', 'Insurance Expiry', 'Status'];
      const rows = reportData.vehicles.map((v: any) => [
        v.internalVehicleId,
        v.plateNumber,
        `${v.make} ${v.model}`,
        v.departmentName,
        v.driver ? v.driver.fullName : '—',
        v.istimaraExpiry,
        v.insuranceExpiry,
        v.status
      ]);
      exportToPdf(reportTitle, headers, rows, 'Fleet_Report');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
            <span>{t.reports} & Audit Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saudi Enterprise Regulatory Reporting Suite • 1-Click Excel & PDF Exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="open-report-scheduler-btn"
            type="button"
            onClick={() => setIsSchedulerOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <Clock className="w-4 h-4 text-emerald-800" />
            <span>Recurring Report Scheduler</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-800 text-white">
              Automated
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{t.exportPdf}</span>
          </button>
        </div>
      </div>

      {/* Adsterra Leaderboard Banner (Reports & Analytics) */}
      <AdsterraBanner format="728x90" placement="reportsTop" />

      {/* Main Layout: Preset selector on left, live preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Report Catalog */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 px-1">
            Standard Enterprise Report Catalog
          </h2>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {reportPresets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedReport(preset.id)}
                className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all text-xs ${
                  selectedReport === preset.id
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-700 ring-2 ring-emerald-200 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-slate-900">{preset.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Live Report Preview & Filters */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-slate-500 font-semibold mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {reportPresets.find(r => r.id === selectedReport)?.title}
                </h3>
                <p className="text-[11px] text-slate-500">Live Preview & Tabular Snapshot</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                Verified Data
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
                Compiling report dataset...
              </div>
            ) : !reportData ? (
              <div className="py-12 text-center text-slate-400 text-xs">No data available</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                {selectedReport === 'WORKFORCE_IQAMA' ? (
                  <table className="w-full text-left rtl:text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Emp ID</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3">Iqama #</th>
                        <th className="py-2 px-3">Iqama Expiry</th>
                        <th className="py-2 px-3">Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.workers.slice(0, 8).map((w: any) => (
                        <tr key={w.id}>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-950">{w.employeeId}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{w.fullName}</td>
                          <td className="py-2 px-3 font-mono">{w.iqamaNumber}</td>
                          <td className="py-2 px-3 font-semibold">{w.iqamaExpiry}</td>
                          <td className="py-2 px-3 font-bold">{w.salary} SAR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedReport === 'FUEL_CONSUMPTION' ? (
                  <table className="w-full text-left rtl:text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Vehicle</th>
                        <th className="py-2 px-3">Liters</th>
                        <th className="py-2 px-3">Total (SAR)</th>
                        <th className="py-2 px-3">Station</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.fuel.slice(0, 8).map((f: any) => (
                        <tr key={f.id}>
                          <td className="py-2 px-3">{f.date}</td>
                          <td className="py-2 px-3 font-bold">{f.vehicleName}</td>
                          <td className="py-2 px-3 font-bold">{f.liters} L</td>
                          <td className="py-2 px-3 font-black text-emerald-950">{f.totalCost} SAR</td>
                          <td className="py-2 px-3">{f.fuelStation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left rtl:text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Vehicle ID</th>
                        <th className="py-2 px-3">Plate #</th>
                        <th className="py-2 px-3">Model</th>
                        <th className="py-2 px-3">Istimara Expiry</th>
                        <th className="py-2 px-3">Insurance Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.vehicles.slice(0, 8).map((v: any) => (
                        <tr key={v.id}>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-950">{v.internalVehicleId}</td>
                          <td className="py-2 px-3 font-mono font-bold">{v.plateNumber}</td>
                          <td className="py-2 px-3">{v.make} {v.model}</td>
                          <td className="py-2 px-3 font-semibold">{v.istimaraExpiry}</td>
                          <td className="py-2 px-3 font-semibold">{v.insuranceExpiry}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recurring Report Scheduler Modal */}
      <RecurringReportSchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        departments={departments}
      />
    </div>
  );
};
