import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  ShieldAlert,
  Wrench,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { ChatWebhookConfig } from '../types';
import { testChatWebhook } from '../services/webhookApi';

interface GoogleChatWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhookData: Partial<ChatWebhookConfig>) => Promise<boolean>;
  editingWebhook?: ChatWebhookConfig | null;
  authToken?: string | null;
}

export const GoogleChatWebhookModal: React.FC<GoogleChatWebhookModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingWebhook,
  authToken
}) => {
  const [name, setName] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [vehicleExpiry, setVehicleExpiry] = useState(true);
  const [maintenanceUrgent, setMaintenanceUrgent] = useState(true);
  const [driverCompliance, setDriverCompliance] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(false);
  const [urgencyThreshold, setUrgencyThreshold] = useState<'ALL' | 'URGENT_15_DAYS' | 'CRITICAL_7_DAYS' | 'EXPIRED_ONLY'>('URGENT_15_DAYS');
  const [customHeader, setCustomHeader] = useState('🇸🇦 [SAUDI FLEET OPS]');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingWebhook) {
      setName(editingWebhook.name || '');
      setSpaceName(editingWebhook.spaceName || '');
      setWebhookUrl(editingWebhook.webhookUrl || '');
      setVehicleExpiry(editingWebhook.events?.vehicleExpiry ?? true);
      setMaintenanceUrgent(editingWebhook.events?.maintenanceUrgent ?? true);
      setDriverCompliance(editingWebhook.events?.driverCompliance ?? true);
      setSystemAlerts(editingWebhook.events?.systemAlerts ?? false);
      setUrgencyThreshold(editingWebhook.urgencyThreshold || 'URGENT_15_DAYS');
      setCustomHeader(editingWebhook.customHeader || '🇸🇦 [SAUDI FLEET OPS]');
      setIsActive(editingWebhook.isActive ?? true);
    } else {
      setName('');
      setSpaceName('');
      setWebhookUrl('');
      setVehicleExpiry(true);
      setMaintenanceUrgent(true);
      setDriverCompliance(true);
      setSystemAlerts(false);
      setUrgencyThreshold('URGENT_15_DAYS');
      setCustomHeader('🇸🇦 [SAUDI FLEET OPS]');
      setIsActive(true);
    }
    setTestResult(null);
    setValidationError(null);
  }, [editingWebhook, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setValidationError('Please enter a Google Chat Webhook URL first.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setValidationError(null);

    const res = await testChatWebhook(
      {
        webhookId: editingWebhook?.id,
        webhookUrl: webhookUrl.trim(),
        webhookName: name.trim() || 'Google Chat Test Space'
      },
      authToken
    );

    setTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: res.simulated
          ? 'Connection verified! (Simulated Google Chat delivery for demo endpoint).'
          : 'Success! Test notification card posted to your Google Chat space.'
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Failed to dispatch test card. Check the URL and token.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Please specify a configuration name.');
      return;
    }
    if (!webhookUrl.trim()) {
      setValidationError('Google Chat Webhook URL is required.');
      return;
    }

    setSaving(true);
    setValidationError(null);

    const success = await onSave({
      name: name.trim(),
      spaceName: spaceName.trim() || name.trim(),
      webhookUrl: webhookUrl.trim(),
      isActive,
      events: {
        vehicleExpiry,
        maintenanceUrgent,
        driverCompliance,
        systemAlerts
      },
      urgencyThreshold,
      customHeader: customHeader.trim()
    });

    setSaving(false);
    if (success) {
      onClose();
    } else {
      setValidationError('Failed to save webhook configuration. Please check your inputs.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {editingWebhook ? 'Edit Google Chat Webhook Space' : 'Connect Google Chat Webhook Space'}
              </h2>
              <p className="text-xs text-slate-500">
                Automate real-time push notifications for vehicle document expiry & urgent maintenance events
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 font-medium border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="flex-1">{testResult.message}</span>
            </div>
          )}

          {/* Webhook Info Callout */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong>How to obtain Google Chat Webhook URL:</strong> In Google Chat, navigate to your desired space &rarr; click space title &rarr; <em>Apps & Integrations</em> &rarr; <em>Webhooks</em> &rarr; <em>Add Webhook</em> &rarr; Copy the generated incoming webhook URL and paste below.
            </div>
          </div>

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Webhook Integration Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Riyadh Central Logistics Dispatch"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Google Chat Space Name
              </label>
              <input
                type="text"
                value={spaceName}
                onChange={e => setSpaceName(e.target.value)}
                placeholder="e.g. Fleet Logistics HQ"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-800">
                Incoming Webhook URL <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !webhookUrl.trim()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-emerald-700" />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 font-mono text-[11px]"
            />
          </div>

          {/* Custom Header Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Custom Tag Header in Messages
              </label>
              <input
                type="text"
                value={customHeader}
                onChange={e => setCustomHeader(e.target.value)}
                placeholder="e.g. 🇸🇦 [SAUDI FLEET OPS]"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Urgency Threshold for Dispatch
              </label>
              <select
                value={urgencyThreshold}
                onChange={e => setUrgencyThreshold(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 text-xs font-semibold"
              >
                <option value="URGENT_15_DAYS">Urgent (≤ 15 Days Remaining & Expired)</option>
                <option value="CRITICAL_7_DAYS">Critical Only (≤ 7 Days & Expired)</option>
                <option value="EXPIRED_ONLY">Expired Regulatory Documents Only</option>
                <option value="ALL">All Documents (Regardless of Days)</option>
              </select>
            </div>
          </div>

          {/* Event Subscriptions */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Automated Push Event Subscriptions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                vehicleExpiry ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={vehicleExpiry}
                  onChange={e => setVehicleExpiry(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-800"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Vehicle Regulatory Expiries</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Istimara, Periodic Inspection (MVPI), Comprehensive Insurance, Operating Cards
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                maintenanceUrgent ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={maintenanceUrgent}
                  onChange={e => setMaintenanceUrgent(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-800"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" />
                    <span>Urgent Maintenance Events</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Engine Overhauls, Brake Servicing, High-Value Work Orders, Scheduled Services
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                driverCompliance ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={driverCompliance}
                  onChange={e => setDriverCompliance(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-800"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Driver Compliance & Iqama</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Saudi Iqama, Heavy Driving Licenses, Health Cards, Qiwa Contracts
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                systemAlerts ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={systemAlerts}
                  onChange={e => setSystemAlerts(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-800"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-purple-700" />
                    <span>System & Security Warnings</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Failed logins, security audits, database backups & integrity checks
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="font-bold text-slate-900">Webhook Enabled & Active</div>
              <div className="text-[11px] text-slate-500">
                When enabled, automated scanning will push events directly to this space
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saving ? 'Saving...' : editingWebhook ? 'Update Webhook Space' : 'Save & Enable Webhook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
