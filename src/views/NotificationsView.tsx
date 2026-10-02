import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Play,
  RefreshCw,
  ShieldAlert,
  Wrench,
  Radio,
  Layers,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  Server,
  Building2,
  Calendar,
  Users,
  Eye,
  Sliders,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import {
  ExpiryAlertItem,
  ChatWebhookConfig,
  WebhookDispatchLog,
  ErpWebhookConfig,
  ErpWebhookDispatchLog,
  IqamaEmailReminderLog,
  Worker
} from '../types';
import { GoogleChatWebhookModal } from '../components/GoogleChatWebhookModal';
import { ErpWebhookModal } from '../components/ErpWebhookModal';
import { IqamaReminderEmailModal } from '../components/IqamaReminderEmailModal';
import {
  fetchChatWebhooks,
  createChatWebhook,
  updateChatWebhook,
  deleteChatWebhook,
  toggleChatWebhook,
  testChatWebhook,
  dispatchEventToGoogleChat,
  triggerAutoPushCritical,
  fetchWebhookDispatchLogs,
  clearWebhookDispatchLogs,
  fetchErpWebhooks,
  createErpWebhook,
  updateErpWebhook,
  deleteErpWebhook,
  toggleErpWebhook,
  testErpWebhook,
  dispatchIqamaToErp,
  fetchErpWebhookLogs,
  clearErpWebhookLogs,
  fetchIqamaReminders,
  runIqamaReminderScan,
  clearIqamaReminderLogs,
  IqamaRemindersResponse
} from '../services/webhookApi';

interface NotificationsViewProps {
  onOpenVehicle: (id: string) => void;
  onOpenWorker: (id: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onOpenVehicle,
  onOpenWorker
}) => {
  const { t, formatDate } = useLanguage();
  const { token, user } = useAuth();

  // State
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [webhooks, setWebhooks] = useState<ChatWebhookConfig[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [dispatchLogs, setDispatchLogs] = useState<WebhookDispatchLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // ERP Webhooks State
  const [erpWebhooks, setErpWebhooks] = useState<ErpWebhookConfig[]>([]);
  const [loadingErpWebhooks, setLoadingErpWebhooks] = useState(true);
  const [erpLogs, setErpLogs] = useState<ErpWebhookDispatchLog[]>([]);
  const [loadingErpLogs, setLoadingErpLogs] = useState(true);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [editingErpWebhook, setEditingErpWebhook] = useState<ErpWebhookConfig | null>(null);
  const [testingErpId, setTestingErpId] = useState<string | null>(null);

  // Three-Stage Iqama Email Reminders State
  const [iqamaData, setIqamaData] = useState<IqamaRemindersResponse>({
    logs: [],
    workersDue: [],
    summary: { totalDispatched: 0, stage30Count: 0, stage7Count: 0, stage1Count: 0, pendingCount: 0 }
  });
  const [loadingIqama, setLoadingIqama] = useState(true);
  const [runningIqamaScan, setRunningIqamaScan] = useState(false);
  const [isIqamaEmailModalOpen, setIsIqamaEmailModalOpen] = useState(false);
  const [selectedWorkerForEmail, setSelectedWorkerForEmail] = useState<Worker | null>(null);
  const [initialEmailStage, setInitialEmailStage] = useState<30 | 7 | 1>(30);

  const [activeTab, setActiveTab] = useState<'IQAMA_REMINDERS' | 'ERP_WEBHOOKS' | 'WEBHOOKS' | 'QUEUE' | 'LOGS'>('IQAMA_REMINDERS');
  const [selectedChannel, setSelectedChannel] = useState<'GOOGLE_CHAT' | 'WHATSAPP' | 'SMS' | 'EMAIL'>('GOOGLE_CHAT');
  const [toastMessage, setToastMessage] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ChatWebhookConfig | null>(null);

  // Automated Push Loading
  const [runningAutoPush, setRunningAutoPush] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [dispatchingItemId, setDispatchingItemId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadAlerts(), loadWebhooks(), loadLogs(), loadErpData(), loadIqamaData()]);
  };

  const loadErpData = async () => {
    setLoadingErpWebhooks(true);
    setLoadingErpLogs(true);
    try {
      const [hooks, logs] = await Promise.all([fetchErpWebhooks(token), fetchErpWebhookLogs(token)]);
      setErpWebhooks(hooks);
      setErpLogs(logs);
    } finally {
      setLoadingErpWebhooks(false);
      setLoadingErpLogs(false);
    }
  };

  const loadIqamaData = async () => {
    setLoadingIqama(true);
    try {
      const data = await fetchIqamaReminders(token);
      setIqamaData(data);
    } finally {
      setLoadingIqama(false);
    }
  };

  const loadAlerts = async () => {
    setLoadingAlerts(true);
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
      setLoadingAlerts(false);
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const data = await fetchChatWebhooks(token);
      setWebhooks(data);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchWebhookDispatchLogs(token);
      setDispatchLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  };

  const showToast = (text: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Webhook CRUD handlers
  const handleSaveWebhook = async (data: Partial<ChatWebhookConfig>): Promise<boolean> => {
    if (editingWebhook) {
      const res = await updateChatWebhook(editingWebhook.id, data, token);
      if (res.success) {
        showToast(`Google Chat webhook "${res.data?.name || data.name}" updated successfully.`);
        await loadWebhooks();
        return true;
      }
      showToast(res.error || 'Failed to update webhook.', 'ERROR');
      return false;
    } else {
      const res = await createChatWebhook(data, token);
      if (res.success) {
        showToast(`Connected Google Chat space "${res.data?.name || data.name}"!`);
        await loadWebhooks();
        return true;
      }
      showToast(res.error || 'Failed to create webhook.', 'ERROR');
      return false;
    }
  };

  const handleDeleteWebhook = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove Google Chat Webhook "${name}"?`)) return;
    const res = await deleteChatWebhook(id, token);
    if (res.success) {
      showToast(`Removed webhook "${name}".`);
      await loadWebhooks();
    } else {
      showToast(res.error || 'Failed to delete webhook.', 'ERROR');
    }
  };

  const handleToggleWebhook = async (id: string) => {
    const res = await toggleChatWebhook(id, token);
    if (res.success) {
      setWebhooks(prev =>
        prev.map(w => (w.id === id ? { ...w, isActive: res.isActive ?? !w.isActive } : w))
      );
      showToast(`Webhook status updated to ${res.isActive ? 'Active' : 'Disabled'}.`);
    } else {
      showToast(res.error || 'Failed to toggle webhook.', 'ERROR');
    }
  };

  const handleTestWebhook = async (webhook: ChatWebhookConfig) => {
    setTestingWebhookId(webhook.id);
    const res = await testChatWebhook(
      {
        webhookId: webhook.id,
        webhookUrl: webhook.webhookUrl,
        webhookName: webhook.name
      },
      token
    );
    setTestingWebhookId(null);

    if (res.success) {
      showToast(
        res.simulated
          ? `Verified! Simulated Google Chat card delivered to "${webhook.name}".`
          : `Success! Live notification card posted to "${webhook.spaceName || webhook.name}".`
      );
      await Promise.all([loadWebhooks(), loadLogs()]);
    } else {
      showToast(`Test failed for "${webhook.name}": ${res.error}`, 'ERROR');
      await loadLogs();
    }
  };

  // Run automated push to Google Chat
  const handleTriggerAutoPush = async () => {
    setRunningAutoPush(true);
    const res = await triggerAutoPushCritical(token);
    setRunningAutoPush(false);

    if (res.success) {
      showToast(
        `Automated Push Complete: Processed ${res.scannedExpiries ?? 0} urgent vehicle expiries & ${res.scannedMaintenance ?? 0} maintenance events across ${res.activeWebhooksCount ?? 0} Google Chat spaces (${res.totalPushesDelivered ?? 0} dispatches delivered)!`
      );
      await Promise.all([loadWebhooks(), loadLogs()]);
    } else {
      showToast(res.error || 'Automated push failed to complete.', 'ERROR');
    }
  };

  // Dispatch single item
  const handleDispatchItem = async (item: ExpiryAlertItem) => {
    setDispatchingItemId(item.id);

    if (selectedChannel === 'GOOGLE_CHAT') {
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
          notes: `Immediate compliance action needed. Document expires on ${item.expiryDate}.`
        },
        token
      );

      setDispatchingItemId(null);
      if (res.success) {
        showToast(
          `Dispatched ${item.documentTypeName} alert for "${item.entityName}" to ${res.dispatchedCount ?? 0} Google Chat spaces.`
        );
        await Promise.all([loadWebhooks(), loadLogs()]);
      } else {
        showToast(res.error || 'Failed to dispatch to Google Chat webhooks.', 'ERROR');
      }
    } else {
      // SMS / WhatsApp / Email simulation
      const newLog: WebhookDispatchLog = {
        id: `sim-${Date.now()}`,
        webhookId: 'simulated-channel',
        webhookName: selectedChannel,
        spaceName: `${selectedChannel} Fleet Broadcast`,
        eventCategory: item.entityType === 'VEHICLE' ? 'VEHICLE_EXPIRY' : 'DRIVER_COMPLIANCE',
        entityName: item.entityName,
        entityId: item.entityId,
        severity: item.daysRemaining < 0 ? 'CRITICAL' : 'WARNING',
        summary: `Dispatched ${item.documentTypeName} alert via ${selectedChannel} to operators and compliance managers.`,
        status: 'SUCCESS',
        responseCode: 200,
        dispatchedAt: new Date().toISOString(),
        payloadPreview: `[${selectedChannel}] ${item.documentTypeName} expiry for ${item.entityName}`
      };

      setDispatchLogs(prev => [newLog, ...prev]);
      setDispatchingItemId(null);
      showToast(`Alert dispatched via ${selectedChannel} for ${item.entityName}`);
    }
  };

  // Broadcast all urgent
  const handleBroadcastAllUrgent = async () => {
    const urgentItems = alerts.filter(a => a.daysRemaining <= 15);
    if (urgentItems.length === 0) {
      showToast('No urgent alerts (≤ 15 days) currently requiring dispatch.', 'INFO');
      return;
    }

    if (selectedChannel === 'GOOGLE_CHAT') {
      await handleTriggerAutoPush();
    } else {
      const newSimLogs: WebhookDispatchLog[] = urgentItems.map((item, idx) => ({
        id: `sim-${Date.now()}-${idx}`,
        webhookId: 'simulated-channel',
        webhookName: selectedChannel,
        spaceName: `${selectedChannel} Urgent Broadcast`,
        eventCategory: item.entityType === 'VEHICLE' ? 'VEHICLE_EXPIRY' : 'DRIVER_COMPLIANCE',
        entityName: item.entityName,
        entityId: item.entityId,
        severity: item.daysRemaining < 0 ? 'CRITICAL' : 'WARNING',
        summary: `Broadcast ${item.documentTypeName} urgent warning via ${selectedChannel}`,
        status: 'SUCCESS',
        responseCode: 200,
        dispatchedAt: new Date().toISOString(),
        payloadPreview: `[${selectedChannel}] ${item.documentTypeName} expiry for ${item.entityName}`
      }));

      setDispatchLogs(prev => [...newSimLogs, ...prev]);
      showToast(`Broadcasted ${urgentItems.length} alerts via ${selectedChannel} successfully.`);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all Google Chat webhook dispatch logs?')) return;
    const ok = await clearWebhookDispatchLogs(token);
    if (ok) {
      setDispatchLogs([]);
      showToast('Dispatch audit logs cleared.');
    }
  };

  // ERP Handlers
  const handleSaveErpWebhook = async (data: Partial<ErpWebhookConfig>) => {
    if (editingErpWebhook) {
      const res = await updateErpWebhook(editingErpWebhook.id, data, token);
      if (res.success) {
        showToast(`ERP Webhook "${data.name}" updated successfully.`);
        await loadErpData();
      } else {
        throw new Error(res.error || 'Failed to update ERP webhook.');
      }
    } else {
      const res = await createErpWebhook(data, token);
      if (res.success) {
        showToast(`Connected ERP Webhook "${data.name}"!`);
        await loadErpData();
      } else {
        throw new Error(res.error || 'Failed to create ERP webhook.');
      }
    }
  };

  const handleDeleteErpWebhook = async (id: string, name: string) => {
    if (!window.confirm(`Delete ERP Webhook "${name}"?`)) return;
    const ok = await deleteErpWebhook(id, token);
    if (ok) {
      showToast(`Removed ERP Webhook "${name}".`);
      await loadErpData();
    } else {
      showToast('Failed to delete ERP webhook.', 'ERROR');
    }
  };

  const handleToggleErpWebhook = async (id: string) => {
    const res = await toggleErpWebhook(id, token);
    if (res.success) {
      setErpWebhooks(prev => prev.map(w => w.id === id ? { ...w, isActive: res.isActive ?? !w.isActive } : w));
      showToast(`ERP Webhook ${res.isActive ? 'activated' : 'deactivated'}.`);
    } else {
      showToast(res.error || 'Failed to toggle ERP webhook.', 'ERROR');
    }
  };

  const handleTestErpWebhook = async (wh: ErpWebhookConfig) => {
    setTestingErpId(wh.id);
    const res = await testErpWebhook(wh.id, token);
    setTestingErpId(null);
    if (res.success) {
      showToast(`Success! Test payload dispatched to ${wh.name} (HTTP ${res.results?.responseCode || 200}).`);
      await loadErpData();
    } else {
      showToast(`Test failed for ${wh.name}: ${res.error}`, 'ERROR');
      await loadErpData();
    }
  };

  const handleClearErpLogs = async () => {
    if (!window.confirm('Clear all ERP webhook dispatch logs?')) return;
    const ok = await clearErpWebhookLogs(token);
    if (ok) {
      setErpLogs([]);
      showToast('ERP webhook dispatch logs cleared.');
    }
  };

  // Iqama Reminder Handlers
  const handleRunIqamaScan = async () => {
    setRunningIqamaScan(true);
    const res = await runIqamaReminderScan(token);
    setRunningIqamaScan(false);
    if (res.success) {
      showToast(
        `Iqama scan complete: Scanned ${res.result?.totalEvaluated ?? 0} workers. Sent ${res.result?.totalRemindersSent ?? 0} email reminders & triggered ${res.result?.totalErpDispatches ?? 0} ERP webhooks.`
      );
      await Promise.all([loadIqamaData(), loadErpData()]);
    } else {
      showToast(res.error || 'Failed to execute Iqama reminder scan.', 'ERROR');
    }
  };

  const handleClearIqamaLogs = async () => {
    if (!window.confirm('Clear all sent Iqama email reminder logs?')) return;
    const ok = await clearIqamaReminderLogs(token);
    if (ok) {
      setIqamaData(prev => ({ ...prev, logs: [] }));
      showToast('Iqama email reminder logs cleared.');
    }
  };

  const openIqamaEmailModal = (worker: Worker, stage: 30 | 7 | 1 = 30) => {
    setSelectedWorkerForEmail(worker);
    setInitialEmailStage(stage);
    setIsIqamaEmailModalOpen(true);
  };

  const activeWebhooksCount = webhooks.filter(w => w.isActive).length;
  const urgentAlertsCount = alerts.filter(a => a.daysRemaining <= 15).length;
  const expiredAlertsCount = alerts.filter(a => a.daysRemaining < 0).length;

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Enterprise Notifications & Automated Webhooks</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Automated Engine
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                3-stage Iqama email reminders (30d, 7d, 1d) • Enterprise ERP connectors (SAP, Oracle, Odoo) • Google Chat spaces
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunIqamaScan}
            disabled={runningIqamaScan}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50"
            title="Scan workers and dispatch automated 3-stage email reminders and ERP alerts"
          >
            <Mail className={`w-4 h-4 ${runningIqamaScan ? 'animate-bounce text-amber-300' : 'text-blue-300'}`} />
            <span>{runningIqamaScan ? 'Running 3-Stage Scan...' : 'Scan Iqama Expiries Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingErpWebhook(null);
              setIsErpModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Add ERP Webhook</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerAutoPush}
            disabled={runningAutoPush || activeWebhooksCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs disabled:opacity-50"
            title="Scan and push all critical expiries and maintenance events to Google Chat spaces"
          >
            <Radio className={`w-4 h-4 text-emerald-400 ${runningAutoPush ? 'animate-pulse text-amber-400' : ''}`} />
            <span>{runningAutoPush ? 'Pushing...' : 'Push to Google Chat'}</span>
          </button>

          <button
            type="button"
            onClick={loadAllData}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
            toastMessage.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : toastMessage.type === 'ERROR'
              ? 'bg-red-50 border-red-300 text-red-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          {toastMessage.type === 'SUCCESS' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : toastMessage.type === 'ERROR' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span className="flex-1">{toastMessage.text}</span>
        </div>
      )}

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-700" />
            <span>3-Stage Iqama Reminders</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {iqamaData.summary.totalDispatched} <span className="text-xs text-slate-400 font-normal">dispatched</span>
          </div>
          <div className="text-[10px] text-blue-800 font-semibold mt-0.5">
            30d ({iqamaData.summary.stage30Count}) • 7d ({iqamaData.summary.stage7Count}) • 1d ({iqamaData.summary.stage1Count})
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-700" />
            <span>ERP Integrations</span>
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-1">
            {erpWebhooks.filter(w => w.isActive).length} <span className="text-xs text-slate-400 font-normal">/ {erpWebhooks.length} Active</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            SAP, Oracle, Odoo & REST
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-700" />
            <span>Google Chat Spaces</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {activeWebhooksCount} <span className="text-xs text-slate-400 font-normal">/ {webhooks.length} Active</span>
          </div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">
            Incoming Webhooks
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Urgent Expiries (≤15d)</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {urgentAlertsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Including {expiredAlertsCount} expired
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('IQAMA_REMINDERS')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'IQAMA_REMINDERS'
              ? 'bg-blue-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Iqama 3-Stage Reminders ({iqamaData.workersDue.length} Due)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ERP_WEBHOOKS')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'ERP_WEBHOOKS'
              ? 'bg-indigo-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Enterprise ERP Webhooks ({erpWebhooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WEBHOOKS')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'WEBHOOKS'
              ? 'bg-emerald-950 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Google Chat Spaces ({webhooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUEUE')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'QUEUE'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts Queue ({alerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOGS')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'LOGS'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Google Chat Logs ({dispatchLogs.length})</span>
        </button>
      </div>

      {/* Tab: Three-Stage Iqama Email Reminders */}
      {activeTab === 'IQAMA_REMINDERS' && (
        <div className="space-y-5">
          {/* Jawazat Regulatory Overview Card */}
          <div className="bg-linear-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-blue-800/40 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Saudi Labor & Jawazat Compliance
                  </span>
                  <span className="text-[11px] text-blue-200/80 font-medium">
                    Automated 3-Stage Reminder Protocol
                  </span>
                </div>
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Three-Stage Automated Iqama Expiry Email Reminders</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Automated background scanner monitors workforce residency cards daily and dispatches bilingual reminders (Arabic & English) at 30 days, 7 days, and 1 day before expiration to prevent Jawazat penalties and Qiwa platform locks.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleRunIqamaScan}
                  disabled={runningIqamaScan}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors disabled:opacity-50"
                >
                  <Mail className={`w-4 h-4 ${runningIqamaScan ? 'animate-bounce text-amber-300' : ''}`} />
                  <span>{runningIqamaScan ? 'Scanning Workforce...' : 'Execute Daily Scan Now'}</span>
                </button>
              </div>
            </div>

            {/* 3 Stages Visual Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Stage 1: 30 Days Notice
                  </span>
                  <span className="text-xs font-bold text-white bg-amber-400/20 px-2 py-0.5 rounded-full">
                    {iqamaData.summary.stage30Count} Sent
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Budgeting & administrative window. HR initiates SADAD fee payment, medical insurance verification, and Qiwa work permit renewal.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                    Stage 2: 7 Days Warning
                  </span>
                  <span className="text-xs font-bold text-white bg-orange-400/20 px-2 py-0.5 rounded-full">
                    {iqamaData.summary.stage7Count} Sent
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Critical urgency notice. Explicitly reminds management of the SAR 500 late fine per worker imposed by Saudi Jawazat for tardy renewals.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    Stage 3: 1 Day Emergency
                  </span>
                  <span className="text-xs font-bold text-white bg-red-400/20 px-2 py-0.5 rounded-full">
                    {iqamaData.summary.stage1Count} Sent
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Immediate emergency escalation. Driver field permits suspended, Muqeem access freeze imminent, and operational dispatch restricted.
                </p>
              </div>
            </div>
          </div>

          {/* Workers Approaching Iqama Expiry */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Workforce Iqama Expiry Queue ({iqamaData.workersDue.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Workers currently in active reminder brackets (30 days, 7 days, 1 day, or already expired)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadIqamaData}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Refresh Iqama List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingIqama ? (
              <div className="py-12 text-center text-slate-400 text-xs">Scanning Iqama database...</div>
            ) : iqamaData.workersDue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">All Workforce Iqamas Up-to-Date</p>
                <p className="text-slate-500 mt-1">
                  No workers currently have residency permits expiring within the next 30 days.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-3 px-3">Worker / Employee</th>
                      <th className="py-3 px-3">Iqama & Passport</th>
                      <th className="py-3 px-3">Profession / Role</th>
                      <th className="py-3 px-3">Expiry Date</th>
                      <th className="py-3 px-3">Days Left</th>
                      <th className="py-3 px-3">Stage Due</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {iqamaData.workersDue.map(item => {
                      const worker = item.worker;
                      const isExpired = item.daysRemaining < 0;
                      const isUrgent = item.daysRemaining <= 7;
                      return (
                        <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{worker.name}</span>
                                {worker.nameArabic && (
                                  <span className="text-[11px] text-slate-500 font-normal font-sans" dir="rtl">
                                    ({worker.nameArabic})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                ID: {worker.employeeId || worker.id}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-700">
                            <div>{worker.iqamaNumber || '—'}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Pass: {worker.passportNumber || '—'}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            <div>{worker.role || 'Driver / Staff'}</div>
                            <div className="text-[10px] text-slate-400">{worker.nationality || 'Saudi Arabia'}</div>
                          </td>

                          <td className="py-3 px-3 font-medium text-slate-800">
                            {formatDate(worker.iqamaExpiry || '')}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                                isExpired
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : isUrgent
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {isExpired ? (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Expired ({Math.abs(item.daysRemaining)}d ago)</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>{item.daysRemaining} days left</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                item.stageDue === 1
                                  ? 'bg-red-950 text-white'
                                  : item.stageDue === 7
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-blue-700 text-white'
                              }`}
                            >
                              {item.stageDue}-Day Reminder
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openIqamaEmailModal(worker, item.stageDue)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                title="Preview & dispatch bilingual Iqama reminder email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Preview Email</span>
                              </button>

                              {erpWebhooks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    showToast(`Dispatching Iqama alert for ${worker.name} to active ERPs...`, 'INFO');
                                    const res = await dispatchIqamaToErp(
                                      worker.id,
                                      (item.stageDue as 30 | 7 | 1) || 30,
                                      token
                                    );
                                    if (res.success) {
                                      showToast(res.message || 'Dispatched to ERP webhooks successfully.');
                                      await loadErpData();
                                    } else {
                                      showToast(res.error || 'Failed to dispatch to ERPs', 'ERROR');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                  title="Push to configured ERP Webhooks (SAP/Oracle/Odoo)"
                                >
                                  <Server className="w-3.5 h-3.5" />
                                  <span>Push ERP</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sent Iqama Email Reminders Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Iqama Email Reminder Audit Log ({iqamaData.logs.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent audit record of automated and manually dispatched reminder notifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadIqamaData}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Reload audit log"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {iqamaData.logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearIqamaLogs}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {iqamaData.logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No reminder emails sent yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "Execute Daily Scan Now" or preview and send an individual email reminder above.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {iqamaData.logs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-bold text-slate-900">{log.workerName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                            log.stage === 1
                              ? 'bg-red-700'
                              : log.stage === 7
                              ? 'bg-orange-600'
                              : 'bg-blue-700'
                          }`}
                        >
                          {log.stage}-Day Reminder
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Iqama: {log.iqamaNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                          {log.status}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.sentAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700">
                      <strong>To:</strong> {log.recipientEmail} • <strong>Subject:</strong> {log.subject}
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-0.5">
                      <span>Days Remaining: <strong>{log.daysRemaining}d</strong></span>
                      <span>•</span>
                      <span>Trigger: <strong>{log.triggeredBy}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Enterprise ERP Webhooks */}
      {activeTab === 'ERP_WEBHOOKS' && (
        <div className="space-y-5">
          {/* Top ERP Integration Banner */}
          <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/50 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Enterprise ERP & HRIS Connectors
                  </span>
                  <span className="text-[11px] text-indigo-200/80 font-medium">
                    SAP S/4HANA • Oracle HCM • Odoo • REST
                  </span>
                </div>
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Automated ERP Webhook Integration for Iqama Compliance</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Connect your central enterprise systems. When any worker reaches an Iqama expiry milestone (30d, 7d, 1d, expired), secure authenticated webhooks dispatch standardized JSON payloads with HMAC-SHA256 signatures to trigger downstream HR actions and payroll checks.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingErpWebhook(null);
                    setIsErpModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Connect New ERP Endpoint</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configured ERP Endpoints List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Configured ERP Webhooks ({erpWebhooks.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Webhooks that automatically receive alerts when Iqama cards approach expiration dates
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadErpData}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Reload ERP webhooks"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingErpWebhooks ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading ERP Webhook endpoints...</div>
            ) : erpWebhooks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Server className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">No Enterprise ERP Webhooks Configured</p>
                <p className="text-slate-500 mt-1 max-w-md mx-auto">
                  Click "Connect New ERP Endpoint" above to integrate your SAP, Oracle, Odoo, or internal enterprise notification systems.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {erpWebhooks.map(wh => {
                  const isTesting = testingErpId === wh.id;
                  const erpColor =
                    wh.erpType === 'SAP'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : wh.erpType === 'ORACLE'
                      ? 'bg-red-100 text-red-900 border-red-300'
                      : wh.erpType === 'ODOO'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300';

                  return (
                    <div
                      key={wh.id}
                      className={`p-4 rounded-xl border transition-all ${
                        wh.isActive
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200/80 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${erpColor}`}>
                              {wh.erpType}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{wh.name}</h4>
                          </div>
                          {wh.description && (
                            <p className="text-xs text-slate-500 mt-1">{wh.description}</p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {wh.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg font-mono text-slate-600 break-all border border-slate-200">
                        {wh.url}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Events:</span>
                        {wh.events.map(ev => (
                          <span
                            key={ev}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {ev === 'IQAMA_30_DAYS'
                              ? '30d Reminder'
                              : ev === 'IQAMA_7_DAYS'
                              ? '7d Warning'
                              : ev === 'IQAMA_1_DAY'
                              ? '1d Emergency'
                              : 'Expired'}
                          </span>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-[11px] text-slate-400">
                          {wh.lastTriggeredAt ? (
                            <span>
                              Last trigger: {new Date(wh.lastTriggeredAt).toLocaleTimeString()} ({wh.lastTriggerStatus})
                            </span>
                          ) : (
                            <span>Never triggered</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestErpWebhook(wh)}
                            disabled={isTesting}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                            <span>{isTesting ? 'Sending...' : 'Test'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleErpWebhook(wh.id)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                            title={wh.isActive ? 'Deactivate Webhook' : 'Activate Webhook'}
                          >
                            {wh.isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingErpWebhook(wh);
                              setIsErpModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteErpWebhook(wh.id, wh.name)}
                            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ERP Webhook Dispatch Audit Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>ERP Webhook Dispatch Audit Log ({erpLogs.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full delivery reports, HTTP response codes, and payloads sent to enterprise ERP endpoints
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadErpData}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Reload ERP Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {erpLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearErpLogs}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear ERP Logs</span>
                  </button>
                )}
              </div>
            </div>

            {erpLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Server className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No ERP webhook dispatches logged yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "Test" on any configured ERP webhook or trigger an Iqama scan to generate live delivery logs.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {erpLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="font-black text-slate-900">{log.webhookName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                          {log.event}
                        </span>
                        {log.workerName && (
                          <span className="text-[11px] text-slate-600">
                            Worker: <strong>{log.workerName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status} {log.responseCode ? `(${log.responseCode})` : ''}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.dispatchedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono break-all">
                      {log.url}
                    </div>

                    {log.errorMessage && (
                      <div className="text-[10px] text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">
                        Error: {log.errorMessage}
                      </div>
                    )}

                    {log.payloadPreview && (
                      <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200 line-clamp-2">
                        {log.payloadPreview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Configured Google Chat Spaces */}
      {activeTab === 'WEBHOOKS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Google Chat Webhook Spaces for Fleet Events</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Incoming webhooks connect directly to your Google Chat spaces for immediate operational alerting.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingWebhook(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Google Chat Space</span>
              </button>
            </div>

            {loadingWebhooks ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading webhook configurations...</div>
            ) : webhooks.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-xs">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <p className="font-bold text-slate-800">No Google Chat Webhook Spaces configured yet.</p>
                <p className="text-slate-400 mt-1 max-w-md mx-auto">
                  Add an incoming webhook from any Google Chat space to enable automated push notifications for critical vehicle expiry and maintenance.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWebhook(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Configure First Webhook Space</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {webhooks.map(wh => (
                  <div
                    key={wh.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      wh.isActive
                        ? 'bg-slate-50/50 border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                        : 'bg-slate-100/60 border-slate-200 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Card Header & Status */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{wh.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Space: <strong className="text-slate-800">{wh.spaceName || wh.name}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleWebhook(wh.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                              wh.isActive
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                            }`}
                            title="Toggle active status"
                          >
                            {wh.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </div>
                      </div>

                      {/* Header tag */}
                      <div className="text-[10px] font-mono font-semibold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block mb-3">
                        {wh.customHeader || '🇸🇦 [SAUDI FLEET OPS]'}
                      </div>

                      {/* Event Subscriptions */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 mb-3">
                        <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                          Subscribed Events:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {wh.events.vehicleExpiry && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-900 text-[10px] font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-emerald-700" />
                              <span>Vehicle Expiry</span>
                            </span>
                          )}
                          {wh.events.maintenanceUrgent && (
                            <span className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 text-[10px] font-semibold flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-amber-700" />
                              <span>Maintenance Urgent</span>
                            </span>
                          )}
                          {wh.events.driverCompliance && (
                            <span className="px-2 py-0.5 rounded bg-blue-100/80 text-blue-900 text-[10px] font-semibold">
                              Driver Iqama
                            </span>
                          )}
                          {wh.events.systemAlerts && (
                            <span className="px-2 py-0.5 rounded bg-purple-100/80 text-purple-900 text-[10px] font-semibold">
                              System
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Threshold info */}
                      <div className="text-[11px] text-slate-500 mb-3">
                        Urgency Filter:{' '}
                        <strong className="text-slate-800">
                          {wh.urgencyThreshold === 'URGENT_15_DAYS'
                            ? '≤ 15 Days & Expired'
                            : wh.urgencyThreshold === 'CRITICAL_7_DAYS'
                            ? '≤ 7 Days & Expired'
                            : wh.urgencyThreshold === 'EXPIRED_ONLY'
                            ? 'Expired Only'
                            : 'All Notifications'}
                        </strong>
                      </div>

                      {/* Trigger stats */}
                      <div className="p-2 bg-slate-100/80 rounded-xl text-[10px] text-slate-600 flex items-center justify-between">
                        <span>
                          Triggers: <strong className="text-slate-900">{wh.triggerCount || 0}</strong>
                        </span>
                        {wh.lastTriggeredAt ? (
                          <span className="text-slate-500">
                            Last: {new Date(wh.lastTriggeredAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">Never triggered</span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleTestWebhook(wh)}
                        disabled={testingWebhookId === wh.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 text-emerald-700" />
                        <span>{testingWebhookId === wh.id ? 'Sending...' : 'Test Card'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWebhook(wh);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Edit Webhook"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWebhook(wh.id, wh.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Pending Alerts & Manual Push Queue */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pending Regulatory Alerts Queue ({alerts.length})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a dispatch channel below. Send single items or broadcast urgent alerts.
                </p>
              </div>

              {/* Channel Selector */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('GOOGLE_CHAT')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedChannel === 'GOOGLE_CHAT'
                      ? 'bg-emerald-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Chat Webhooks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('WHATSAPP')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedChannel === 'WHATSAPP'
                      ? 'bg-emerald-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('SMS')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedChannel === 'SMS'
                      ? 'bg-emerald-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Saudi SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('EMAIL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedChannel === 'EMAIL'
                      ? 'bg-emerald-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
              </div>
            </div>

            {/* Broadcast action button */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl mb-4 text-xs">
              <div className="text-emerald-950 font-medium">
                <strong>{urgentAlertsCount} urgent regulatory documents</strong> are expiring within 15 days or already expired.
              </div>
              <button
                type="button"
                onClick={handleBroadcastAllUrgent}
                disabled={urgentAlertsCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Broadcast All Urgent via {selectedChannel === 'GOOGLE_CHAT' ? 'Google Chat' : selectedChannel}</span>
              </button>
            </div>

            {loadingAlerts ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading queue...</div>
            ) : alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                All regulatory documents are compliant. No pending dispatches.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {alerts.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.daysRemaining < 0
                            ? 'bg-red-100 text-red-700'
                            : item.daysRemaining <= 7
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{item.entityName}</span>
                          <span className="text-[10px] font-normal text-slate-500">({item.entitySubtext})</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          <span className="font-semibold text-emerald-950">{item.documentTypeName}</span> • Expiry:{' '}
                          <strong>{formatDate(item.expiryDate)}</strong> • Dept: {item.department}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.daysRemaining < 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.daysRemaining < 0
                          ? `Expired (${Math.abs(item.daysRemaining)}d ago)`
                          : `${item.daysRemaining} days remaining`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDispatchItem(item)}
                        disabled={dispatchingItemId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3 h-3 text-emerald-400" />
                        <span>
                          {dispatchingItemId === item.id
                            ? 'Pushing...'
                            : selectedChannel === 'GOOGLE_CHAT'
                            ? 'Push to Google Chat'
                            : `Send ${selectedChannel}`}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Webhook Dispatch Audit Logs */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Google Chat Webhook Dispatch Audit Log ({dispatchLogs.length})</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed delivery reports for automated scans and manual event notifications.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadLogs}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Reload logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {dispatchLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading dispatch logs...</div>
            ) : dispatchLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No webhook notifications logged yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Test a webhook space or click "Run Automated Push to Google Chat" to populate live dispatch logs.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {dispatchLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="font-black">{log.entityName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {log.eventCategory}
                        </span>
                        {log.spaceName && (
                          <span className="text-[10px] font-normal text-slate-500">
                            Space: <strong>{log.spaceName}</strong>
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status} {log.responseCode ? `(${log.responseCode})` : ''}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.dispatchedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700 font-medium">
                      {log.summary}
                    </div>

                    {log.errorMessage && (
                      <div className="text-[10px] text-red-600 font-semibold bg-red-50 p-1.5 rounded border border-red-200">
                        Error: {log.errorMessage}
                      </div>
                    )}

                    {log.payloadPreview && (
                      <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200 line-clamp-2">
                        {log.payloadPreview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Chat Webhook Configuration Modal */}
      <GoogleChatWebhookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWebhook(null);
        }}
        onSave={handleSaveWebhook}
        editingWebhook={editingWebhook}
        authToken={token}
      />

      {/* Enterprise ERP Webhook Configuration Modal */}
      <ErpWebhookModal
        isOpen={isErpModalOpen}
        onClose={() => {
          setIsErpModalOpen(false);
          setEditingErpWebhook(null);
        }}
        onSave={handleSaveErpWebhook}
        editingWebhook={editingErpWebhook}
        authToken={token}
      />

      {/* Iqama Reminder Bilingual Email & Dispatch Modal */}
      <IqamaReminderEmailModal
        isOpen={isIqamaEmailModalOpen}
        onClose={() => {
          setIsIqamaEmailModalOpen(false);
          setSelectedWorkerForEmail(null);
        }}
        worker={selectedWorkerForEmail}
        initialStage={initialEmailStage}
        authToken={token}
        onDispatched={async () => {
          await Promise.all([loadIqamaData(), loadErpData()]);
        }}
      />
    </div>
  );
};
