import React, { useState, useEffect } from 'react';
import {
  Clock,
  Mail,
  Calendar,
  Send,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Fuel,
  Wrench,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';
import { ReportSchedule, ReportExecutionLog, Department } from '../../types';

interface RecurringReportSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
}

interface ReportMetrics {
  totalExpensesSar: number;
  fuelExpensesSar: number;
  maintenanceExpensesSar: number;
  otherExpensesSar: number;
  totalWorkers: number;
  activeIqamas: number;
  expiringIqamas30d: number;
  expiredIqamas: number;
  overallComplianceRate: number;
  totalVehicles: number;
  activeVehicles: number;
  upcomingIstimaraExpiries: number;
  upcomingInsuranceExpiries: number;
}

export const RecurringReportSchedulerModal: React.FC<RecurringReportSchedulerModalProps> = ({
  isOpen,
  onClose,
  departments
}) => {
  const { t, formatCurrency } = useLanguage();
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'SCHEDULES' | 'LOGS' | 'PREVIEW'>('SCHEDULES');
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [logs, setLogs] = useState<ReportExecutionLog[]>([]);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State for creating/editing a schedule
  const [showForm, setShowForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(0); // 0 = Sunday
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);
  const [formTimeOfDay, setFormTimeOfDay] = useState('08:00');
  const [formEmailInput, setFormEmailInput] = useState('');
  const [formRecipientEmails, setFormRecipientEmails] = useState<string[]>([]);
  const [formDeptId, setFormDeptId] = useState('ALL');
  const [formReportTypes, setFormReportTypes] = useState<string[]>(['FLEET_EXPENSES', 'WORKFORCE_COMPLIANCE']);
  const [formIncludeKpis, setFormIncludeKpis] = useState(true);
  const [formIncludeDetailed, setFormIncludeDetailed] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  // Email Preview Modal inside
  const [previewingLog, setPreviewingLog] = useState<ReportExecutionLog | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      fetchLogs();
      fetchMetrics();
    }
  }, [isOpen]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/schedules', { headers: getAuthHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.warn('Failed to load report schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/reports/execution-logs', { headers: getAuthHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Failed to load execution logs:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/reports/metrics?departmentId=ALL', { headers: getAuthHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.warn('Failed to load report metrics:', err);
    }
  };

  const openNewScheduleForm = () => {
    setEditingScheduleId(null);
    setFormName('Weekly Fleet Expenses & Workforce Compliance Digest');
    setFormFrequency('WEEKLY');
    setFormDayOfWeek(0); // Sunday
    setFormDayOfMonth(1);
    setFormTimeOfDay('08:00');
    const defaultEmail = user?.email || 'abdulwahabmangal777@gmail.com';
    setFormRecipientEmails([defaultEmail]);
    setFormEmailInput('');
    setFormDeptId('ALL');
    setFormReportTypes(['FLEET_EXPENSES', 'WORKFORCE_COMPLIANCE']);
    setFormIncludeKpis(true);
    setFormIncludeDetailed(true);
    setFormIsActive(true);
    setShowForm(true);
  };

  const openEditScheduleForm = (sched: ReportSchedule) => {
    setEditingScheduleId(sched.id);
    setFormName(sched.name);
    setFormFrequency(sched.frequency);
    setFormDayOfWeek(sched.dayOfWeek ?? 0);
    setFormDayOfMonth(sched.dayOfMonth ?? 1);
    setFormTimeOfDay(sched.timeOfDay || '08:00');
    setFormRecipientEmails([...sched.recipientEmails]);
    setFormEmailInput('');
    setFormDeptId(sched.departmentId || 'ALL');
    setFormReportTypes([...sched.reportTypes]);
    setFormIncludeKpis(sched.includeSummaryKpis);
    setFormIncludeDetailed(sched.includeDetailedTables);
    setFormIsActive(sched.isActive);
    setShowForm(true);
  };

  const handleAddEmail = () => {
    const trimmed = formEmailInput.trim();
    if (!trimmed) return;
    if (!formRecipientEmails.includes(trimmed)) {
      setFormRecipientEmails([...formRecipientEmails, trimmed]);
    }
    setFormEmailInput('');
  };

  const handleRemoveEmail = (email: string) => {
    setFormRecipientEmails(formRecipientEmails.filter(e => e !== email));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorBanner('Please provide a name for this report schedule.');
      return;
    }
    if (formRecipientEmails.length === 0 && !formEmailInput.trim()) {
      setErrorBanner('Please specify at least one recipient email address.');
      return;
    }

    const finalEmails = [...formRecipientEmails];
    if (formEmailInput.trim() && !finalEmails.includes(formEmailInput.trim())) {
      finalEmails.push(formEmailInput.trim());
    }

    const payload = {
      name: formName.trim(),
      frequency: formFrequency,
      dayOfWeek: formFrequency === 'WEEKLY' ? formDayOfWeek : undefined,
      dayOfMonth: formFrequency === 'MONTHLY' ? formDayOfMonth : undefined,
      timeOfDay: formTimeOfDay,
      recipientEmails: finalEmails,
      reportTypes: formReportTypes,
      departmentId: formDeptId,
      includeSummaryKpis: formIncludeKpis,
      includeDetailedTables: formIncludeDetailed,
      isActive: formIsActive
    };

    try {
      const url = editingScheduleId
        ? `/api/reports/schedules/${editingScheduleId}`
        : '/api/reports/schedules';
      const method = editingScheduleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save schedule');
      }

      setSuccessBanner(editingScheduleId ? 'Report schedule updated successfully!' : 'New recurring report schedule created!');
      setTimeout(() => setSuccessBanner(null), 4000);
      setShowForm(false);
      fetchSchedules();
    } catch (err: any) {
      setErrorBanner(err.message || 'Error saving report schedule');
      setTimeout(() => setErrorBanner(null), 4000);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring report schedule?')) return;
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        setSuccessBanner('Report schedule deleted.');
        setTimeout(() => setSuccessBanner(null), 3000);
        fetchSchedules();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleTriggerNow = async (id: string, name: string) => {
    setTriggeringId(id);
    try {
      const res = await fetch(`/api/reports/schedules/${id}/run`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessBanner(`Successfully triggered '${name}'! Summary email dispatched.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        fetchSchedules();
        fetchLogs();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Trigger failed');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Trigger execution failed');
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setTriggeringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="recurring-reports-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Automated Recurring Report Scheduler</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Weekly & Monthly Summaries
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure scheduled email digests for fleet expenses, fuel spend, and Saudi workforce compliance
              </p>
            </div>
          </div>

          <button
            id="close-scheduler-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banners */}
        {successBanner && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">×</button>
          </div>
        )}

        {errorBanner && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <button
              id="tab-schedules-btn"
              type="button"
              onClick={() => { setActiveTab('SCHEDULES'); setShowForm(false); }}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'SCHEDULES'
                  ? 'border-emerald-700 text-emerald-950 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Active Schedules ({schedules.length})</span>
            </button>

            <button
              id="tab-logs-btn"
              type="button"
              onClick={() => { setActiveTab('LOGS'); setShowForm(false); }}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'border-emerald-700 text-emerald-950 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Execution & Dispatch Logs ({logs.length})</span>
            </button>

            <button
              id="tab-preview-btn"
              type="button"
              onClick={() => { setActiveTab('PREVIEW'); setShowForm(false); }}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'PREVIEW'
                  ? 'border-emerald-700 text-emerald-950 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Real-Time Summary Preview</span>
            </button>
          </div>

          {!showForm && activeTab === 'SCHEDULES' && (
            <button
              id="create-schedule-btn"
              type="button"
              onClick={openNewScheduleForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Schedule</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SCHEDULES LIST / FORM */}
          {activeTab === 'SCHEDULES' && (
            <>
              {showForm ? (
                /* Create / Edit Schedule Form */
                <form onSubmit={handleSaveSchedule} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingScheduleId ? 'Edit Recurring Schedule' : 'New Recurring Report Schedule'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Schedule Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Schedule Title / Description *
                      </label>
                      <input
                        id="schedule-name-input"
                        type="text"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Weekly Executive Fleet & Workforce Audit"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                        required
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cadence / Frequency *
                      </label>
                      <select
                        id="schedule-frequency-select"
                        value={formFrequency}
                        onChange={e => setFormFrequency(e.target.value as 'WEEKLY' | 'MONTHLY')}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                      >
                        <option value="WEEKLY">Weekly (Scheduled by Day of Week)</option>
                        <option value="MONTHLY">Monthly (Scheduled by Day of Month)</option>
                      </select>
                    </div>

                    {/* Weekly day of week or Monthly day of month */}
                    {formFrequency === 'WEEKLY' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Delivery Day (Saudi Business Week)
                        </label>
                        <select
                          id="schedule-day-of-week-select"
                          value={formDayOfWeek}
                          onChange={e => setFormDayOfWeek(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                        >
                          <option value={0}>Sunday (الأحد - Saudi Week Start)</option>
                          <option value={1}>Monday (الإثنين)</option>
                          <option value={2}>Tuesday (الثلاثاء)</option>
                          <option value={3}>Wednesday (الأربعاء)</option>
                          <option value={4}>Thursday (الخميس - Saudi Weekend Eve)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Calendar Day of Month
                        </label>
                        <select
                          id="schedule-day-of-month-select"
                          value={formDayOfMonth}
                          onChange={e => setFormDayOfMonth(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                        >
                          <option value={1}>1st of each calendar month</option>
                          <option value={15}>15th of each calendar month (Mid-month)</option>
                          <option value={28}>28th of each calendar month (Pre-payroll)</option>
                        </select>
                      </div>
                    )}

                    {/* Time of Day */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dispatch Time (Riyadh GMT+3)
                      </label>
                      <input
                        id="schedule-time-input"
                        type="time"
                        value={formTimeOfDay}
                        onChange={e => setFormTimeOfDay(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                      />
                    </div>

                    {/* Department Scope */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Department Scope
                      </label>
                      <select
                        id="schedule-dept-select"
                        value={formDeptId}
                        onChange={e => setFormDeptId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                      >
                        <option value="ALL">All Enterprise Departments (Consolidated)</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.nameAr})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Recipient Emails */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Recipient Email Addresses *
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          id="recipient-email-input"
                          type="email"
                          value={formEmailInput}
                          onChange={e => setFormEmailInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEmail();
                            }
                          }}
                          placeholder="e.g. cfo@saudifleet.com.sa or abdulwahabmangal777@gmail.com"
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 outline-none bg-white font-medium"
                        />
                        <button
                          id="add-recipient-email-btn"
                          type="button"
                          onClick={handleAddEmail}
                          className="px-3 py-2 text-xs font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                        >
                          Add Email
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {formRecipientEmails.map(email => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-emerald-100 text-emerald-950 font-medium border border-emerald-300"
                          >
                            <Mail className="w-3.5 h-3.5 text-emerald-800" />
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              className="text-emerald-800 hover:text-red-700 ml-1 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {formRecipientEmails.length === 0 && (
                          <span className="text-xs text-amber-700 italic">
                            No emails specified yet. Please add at least one recipient above.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Report Types Included */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Modules to Include in Summary Email
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={formReportTypes.includes('FLEET_EXPENSES') || formReportTypes.includes('ALL')}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormReportTypes(Array.from(new Set([...formReportTypes, 'FLEET_EXPENSES'])));
                              } else {
                                setFormReportTypes(formReportTypes.filter(t => t !== 'FLEET_EXPENSES' && t !== 'ALL'));
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <div>
                            <div className="font-bold text-slate-800">Fleet Operating Expenses</div>
                            <div className="text-[11px] text-slate-500">Fuel ledger, maintenance repairs & driver incidentals</div>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={formReportTypes.includes('WORKFORCE_COMPLIANCE') || formReportTypes.includes('ALL')}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormReportTypes(Array.from(new Set([...formReportTypes, 'WORKFORCE_COMPLIANCE'])));
                              } else {
                                setFormReportTypes(formReportTypes.filter(t => t !== 'WORKFORCE_COMPLIANCE' && t !== 'ALL'));
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-700"
                          />
                          <div>
                            <div className="font-bold text-slate-800">Workforce & Iqama Compliance</div>
                            <div className="text-[11px] text-slate-500">Iqama expirations, Muqeem status & Jawazat penalties</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Active Checkbox */}
                    <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                      <input
                        id="schedule-is-active-checkbox"
                        type="checkbox"
                        checked={formIsActive}
                        onChange={e => setFormIsActive(e.target.checked)}
                        className="rounded text-emerald-700 focus:ring-emerald-700"
                      />
                      <label htmlFor="schedule-is-active-checkbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Enable this recurring schedule immediately (automated background triggers)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="save-schedule-submit-btn"
                      type="submit"
                      className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
                    >
                      {editingScheduleId ? 'Save Changes' : 'Create Recurring Schedule'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Schedules Cards */
                <div className="space-y-4">
                  {schedules.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-800">No Recurring Schedules Configured</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                        Set up automated weekly or monthly email summaries of fleet expenses, fuel consumption, and Saudi workforce compliance.
                      </p>
                      <button
                        onClick={openNewScheduleForm}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-900 text-white hover:bg-emerald-800 shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Schedule</span>
                      </button>
                    </div>
                  ) : (
                    schedules.map(sched => (
                      <div
                        key={sched.id}
                        className={`bg-white border rounded-xl p-4.5 shadow-2xs transition-all ${
                          sched.isActive ? 'border-slate-200 hover:border-emerald-500/50' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-slate-900">{sched.name}</h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sched.frequency === 'WEEKLY'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}
                              >
                                {sched.frequency}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sched.isActive
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {sched.isActive ? 'Active' : 'Paused'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              Cadence:{' '}
                              <strong className="text-slate-700">
                                {sched.frequency === 'WEEKLY'
                                  ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][sched.dayOfWeek ?? 0] || 'Sunday'}`
                                  : `1st of each month`}
                              </strong>{' '}
                              at <strong>{sched.timeOfDay} (Riyadh Time)</strong>
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <span className="text-[11px] text-slate-500 font-medium">Recipients:</span>
                              {sched.recipientEmails.map(email => (
                                <span
                                  key={email}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span>{email}</span>
                                </span>
                              ))}
                            </div>

                            {sched.lastRunSummary && (
                              <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 mt-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Last run: {sched.lastRunSummary}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-start">
                            <button
                              id={`trigger-schedule-${sched.id}-btn`}
                              type="button"
                              disabled={triggeringId === sched.id}
                              onClick={() => handleTriggerNow(sched.id, sched.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs disabled:opacity-50"
                              title="Trigger summary dispatch right now"
                            >
                              {triggeringId === sched.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-800" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-emerald-800" />
                              )}
                              <span>Send Now</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditScheduleForm(sched)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Edit schedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(sched.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Delete schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: EXECUTION & DISPATCH LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Automated Dispatch History</h3>
                  <p className="text-xs text-slate-500">Record of email summaries generated and delivered to executive inboxes</p>
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Refresh</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No automated dispatches have been executed yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{log.scheduleName}</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {log.status}
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                              {log.frequency}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>Dispatched: <strong>{new Date(log.dispatchedAt).toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>To: <strong>{log.recipients.join(', ')}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <div className="font-bold text-slate-800">
                              SAR {log.totalExpensesSar?.toLocaleString() || 0}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              {log.overallComplianceRate}% Compliance
                            </div>
                          </div>

                          {log.emailPreviewHtml && (
                            <button
                              type="button"
                              onClick={() => setPreviewingLog(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                            >
                              <span>View Email</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REAL-TIME SUMMARY PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-5">
              <div className="bg-emerald-950 text-white rounded-xl p-5 border border-emerald-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800 text-emerald-200 uppercase tracking-wider">
                      Live Dashboard Snapshot
                    </span>
                    <h3 className="text-base font-black mt-1">Live Executive Summary Metrics</h3>
                    <p className="text-xs text-emerald-200/80">
                      This is the real-time financial ledger and regulatory data packaged into the automated email digest.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchMetrics}
                    className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white text-xs"
                    title="Refresh snapshot"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {metrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase">Total Fleet Spend</div>
                      <div className="text-lg font-black mt-0.5">{metrics.totalExpensesSar.toLocaleString()} SAR</div>
                      <div className="text-[10px] text-emerald-200/70 mt-0.5">Fuel + Maint + Incidentals</div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase">Fuel Spend</div>
                      <div className="text-lg font-black mt-0.5">{metrics.fuelExpensesSar.toLocaleString()} SAR</div>
                      <div className="text-[10px] text-emerald-200/70 mt-0.5">Petromin / Aramco Stations</div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase">Compliance Rate</div>
                      <div className="text-lg font-black mt-0.5">{metrics.overallComplianceRate}%</div>
                      <div className="text-[10px] text-emerald-200/70 mt-0.5">{metrics.activeIqamas} / {metrics.totalWorkers} Active Iqamas</div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase">Urgent Expiries (30d)</div>
                      <div className="text-lg font-black mt-0.5">{metrics.expiringIqamas30d + metrics.upcomingIstimaraExpiries}</div>
                      <div className="text-[10px] text-emerald-200/70 mt-0.5">Iqama & Istimara action</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Email Template Preview Frame */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Sample Generated Executive Email Body</span>
                  <span className="text-[11px] text-slate-500 font-normal">HTML Email Client Compatible</span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto bg-slate-50/50">
                  <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="border-b border-emerald-700 pb-3">
                      <h4 className="text-base font-black text-emerald-950">Khyber Logistics services</h4>
                      <p className="text-xs text-slate-500">Weekly Executive Digest • التقرير التنفيذي الأسبوعي</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Total Fleet Spend</div>
                        <div className="text-lg font-black text-emerald-900 mt-1">
                          {metrics?.totalExpensesSar.toLocaleString() || '142,580'} SAR
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Workforce Compliance</div>
                        <div className="text-lg font-black text-emerald-700 mt-1">
                          {metrics?.overallComplianceRate || 96.8}%
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1.5 pt-2">
                      <div className="font-bold text-slate-900">Executive Summary Points:</div>
                      <div>• Fleet maintenance and diesel fuel accounting reconciled with 0 unverified claims.</div>
                      <div>• {metrics?.expiringIqamas30d || 2} employee Iqamas expire within the next 30 days and have been scheduled for SADAD payment.</div>
                      <div>• All active commercial vehicles possess valid MVPI inspection stickers and Tawuniya coverage.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Automated engine runs automatically in background every 10 minutes.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-2xs"
          >
            Close Scheduler
          </button>
        </div>
      </div>

      {/* HTML Email Full View Modal */}
      {previewingLog && previewingLog.emailPreviewHtml && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div>
                <h4 className="text-xs font-bold">{previewingLog.emailSubject}</h4>
                <p className="text-[11px] text-slate-400">Delivered to: {previewingLog.recipients.join(', ')}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div
                className="bg-white rounded-xl shadow-xs overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewingLog.emailPreviewHtml }}
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setPreviewingLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
