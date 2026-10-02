import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  Calendar,
  Truck,
  Users,
  MessageSquare,
  Radio
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { ExpiryAlertItem, Department } from '../types';
import { dispatchEventToGoogleChat, triggerAutoPushCritical } from '../services/webhookApi';

interface ExpiryAlertsViewProps {
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
  departments: Department[];
}

export const ExpiryAlertsView: React.FC<ExpiryAlertsViewProps> = ({
  onOpenVehicle,
  onOpenWorker,
  departments
}) => {
  const { t, formatDate, formatDaysRemainingText } = useLanguage();
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframeTab, setTimeframeTab] = useState<'ALL' | 'EXPIRED' | '7_DAYS' | '15_DAYS' | '30_DAYS' | '60_DAYS'>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pushingItemId, setPushingItemId] = useState<string | null>(null);
  const [runningPushAll, setRunningPushAll] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePushItemToGoogleChat = async (item: ExpiryAlertItem) => {
    setPushingItemId(item.id);
    const res = await dispatchEventToGoogleChat(
      {
        category: item.entityType === 'VEHICLE' ? 'VEHICLE_EXPIRY' : 'DRIVER_COMPLIANCE',
        entityId: item.entityId,
        entityName: item.entityName,
        plateOrId: item.entitySubtext,
        department: item.department,
        daysRemaining: item.daysRemaining,
        expiryDate: item.expiryDate,
        documentType: item.documentTypeName,
        severity: item.daysRemaining < 0 ? 'CRITICAL' : item.daysRemaining <= 7 ? 'CRITICAL' : 'WARNING',
        notes: `Manual dispatch from Regulatory Expiry Table. Expiry Date: ${item.expiryDate}.`
      },
      token
    );
    setPushingItemId(null);

    if (res.success) {
      showToast(`Pushed ${item.documentTypeName} alert for "${item.entityName}" to ${res.dispatchedCount ?? 0} Google Chat spaces.`);
    } else {
      showToast(res.error || 'Failed to dispatch to Google Chat.');
    }
  };

  const handlePushUrgentToGoogleChat = async () => {
    setRunningPushAll(true);
    const res = await triggerAutoPushCritical(token);
    setRunningPushAll(false);

    if (res.success) {
      showToast(
        `Google Chat: Dispatched ${res.scannedExpiries ?? 0} critical vehicle expiries across ${res.activeWebhooksCount ?? 0} active spaces!`
      );
    } else {
      showToast(res.error || 'Failed to trigger automated push.');
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expiry/alerts', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.alerts || data?.data || []);
        setAlerts(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Expiry alerts fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Filter alerts
  const filteredAlerts = safeAlerts.filter(item => {
    // Timeframe
    if (timeframeTab === 'EXPIRED' && item.daysRemaining >= 0) return false;
    if (timeframeTab === '7_DAYS' && (item.daysRemaining < 0 || item.daysRemaining > 7)) return false;
    if (timeframeTab === '15_DAYS' && (item.daysRemaining < 0 || item.daysRemaining > 15)) return false;
    if (timeframeTab === '30_DAYS' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;
    if (timeframeTab === '60_DAYS' && (item.daysRemaining < 0 || item.daysRemaining > 60)) return false;

    // Doc Type
    if (docTypeFilter !== 'ALL' && item.documentType !== docTypeFilter) return false;

    // Department
    if (departmentFilter !== 'ALL' && item.departmentId !== departmentFilter) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.entityName.toLowerCase().includes(q);
      const matchDocNum = item.documentNumber.toLowerCase().includes(q);
      const matchDocType = item.documentTypeName.toLowerCase().includes(q);
      if (!matchName && !matchDocNum && !matchDocType) return false;
    }

    return true;
  });

  const counts = {
    expired: alerts.filter(a => a.daysRemaining < 0).length,
    in7Days: alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 7).length,
    in15Days: alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 15).length,
    in30Days: alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 30).length,
    in60Days: alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 60).length,
    valid: alerts.filter(a => a.daysRemaining > 60).length
  };

  const handleExportExcel = () => {
    const data = filteredAlerts.map(a => ({
      'Asset / Worker': a.entityName,
      'Type': a.entityType,
      'Department': a.department,
      'Document': a.documentTypeName,
      'Document #': a.documentNumber,
      'Expiry Date': a.expiryDate,
      'Days Remaining': a.daysRemaining,
      'Compliance Status': a.status
    }));
    exportToExcel(data, 'Saudi_Compliance_Expiry_Alerts', 'Expiry Registry');
  };

  const handleExportPdf = () => {
    const headers = ['Entity Name', 'Type', 'Document Category', 'Document #', 'Expiry Date', 'Days Left', 'Status'];
    const rows = filteredAlerts.map(a => [
      a.entityName,
      a.entityType,
      a.documentTypeName,
      a.documentNumber,
      a.expiryDate,
      `${a.daysRemaining} days`,
      a.status
    ]);
    exportToPdf('Saudi Regulatory Document Compliance & Expiry Alert Report', headers, rows, 'Compliance_Alerts_Report');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span>{t.expiryAlerts} ({alerts.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saudi Regulatory Expiry Tracking Engine: Istimara, Morour, CCHI, Qiwa, Iqamas, Passports & MVPI Fahs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePushUrgentToGoogleChat}
            disabled={runningPushAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-2xs disabled:opacity-50"
            title="Automatically dispatch all critical & urgent expiries to active Google Chat spaces"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>{runningPushAll ? 'Pushing...' : 'Push Urgent to Google Chat'}</span>
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

          <button
            type="button"
            onClick={fetchAlerts}
            title={t.refresh}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-800' : ''}`} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Timeframe Pill Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => setTimeframeTab('ALL')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80 uppercase tracking-wider">All Documents</div>
          <div className="text-xl font-black mt-0.5">{alerts.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setTimeframeTab('EXPIRED')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === 'EXPIRED'
              ? 'bg-red-600 text-white border-red-600 shadow-md font-bold'
              : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>Expired</span>
          </div>
          <div className="text-xl font-black mt-0.5">{counts.expired}</div>
        </button>

        <button
          type="button"
          onClick={() => setTimeframeTab('7_DAYS')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === '7_DAYS'
              ? 'bg-orange-600 text-white border-orange-600 shadow-md font-bold'
              : 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>≤ 7 Days</span>
          </div>
          <div className="text-xl font-black mt-0.5">{counts.in7Days}</div>
        </button>

        <button
          type="button"
          onClick={() => setTimeframeTab('15_DAYS')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === '15_DAYS'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md font-bold'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>≤ 15 Days</span>
          </div>
          <div className="text-xl font-black mt-0.5">{counts.in15Days}</div>
        </button>

        <button
          type="button"
          onClick={() => setTimeframeTab('30_DAYS')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === '30_DAYS'
              ? 'bg-yellow-600 text-white border-yellow-600 shadow-md font-bold'
              : 'bg-yellow-50 text-yellow-900 border-yellow-200 hover:bg-yellow-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>≤ 30 Days</span>
          </div>
          <div className="text-xl font-black mt-0.5">{counts.in30Days}</div>
        </button>

        <button
          type="button"
          onClick={() => setTimeframeTab('60_DAYS')}
          className={`p-3 rounded-xl border text-left rtl:text-right transition-all ${
            timeframeTab === '60_DAYS'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md font-bold'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-90 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>≤ 60 Days</span>
          </div>
          <div className="text-xl font-black mt-0.5">{counts.in60Days}</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by plate, employee name, document #..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Document Type Filter */}
          <select
            value={docTypeFilter}
            onChange={e => setDocTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Document Types</option>
            <option value="IQAMA">Iqama (إقامة)</option>
            <option value="ISTIMARA">Istimara Registration (استمارة)</option>
            <option value="INSURANCE">Insurance Policy (تأمين)</option>
            <option value="INSPECTION">MVPI Fahs Inspection (فحص دوري)</option>
            <option value="PASSPORT">Passport (جواز سفر)</option>
            <option value="DRIVER_LICENSE">Driver License (رخصة قيادة)</option>
            <option value="WORK_PERMIT">Qiwa Work Permit (رخصة عمل)</option>
            <option value="MEDICAL_INSURANCE">Medical Insurance (تأمين طبي)</option>
          </select>

          {/* Department Filter */}
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
        </div>
      </div>

      {/* Main Expiry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Analyzing expiry countdowns...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No matching expiry records in this filter</p>
            <p className="text-xs text-slate-400 mt-1">All selected documents are compliant and up-to-date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asset / Employee</th>
                  <th className="py-3 px-4">Document Category</th>
                  <th className="py-3 px-4">Document Number</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Remaining</th>
                  <th className="py-3 px-4 text-right rtl:text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Entity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {item.entityType === 'VEHICLE' ? (
                          <Truck className="w-4 h-4 text-emerald-800 shrink-0" />
                        ) : (
                          <Users className="w-4 h-4 text-emerald-800 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{item.entityName}</div>
                          <div className="text-[11px] text-slate-500">{item.entitySubtext}</div>
                        </div>
                      </div>
                    </td>

                    {/* Doc Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-950">{item.documentTypeName}</span>
                      <div className="text-[10px] text-slate-400 font-arabic">{item.documentTypeNameAr}</div>
                    </td>

                    {/* Doc Number */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {item.documentNumber}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {item.department}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {formatDate(item.expiryDate)}
                    </td>

                    {/* Days Remaining Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          item.daysRemaining < 0
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : (item.daysRemaining <= 7
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : (item.daysRemaining <= 15
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : (item.daysRemaining <= 30
                                        ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200')))
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDaysRemainingText(item.daysRemaining)}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePushItemToGoogleChat(item)}
                          disabled={pushingItemId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-50"
                          title="Push immediate card alert to connected Google Chat spaces"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{pushingItemId === item.id ? 'Pushing...' : 'Chat Push'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (item.entityType === 'VEHICLE') onOpenVehicle(item.entityId);
                            else onOpenWorker(item.entityId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-2xs"
                        >
                          <span>360° Profile</span>
                          <ExternalLink className="w-3.5 h-3.5" />
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
