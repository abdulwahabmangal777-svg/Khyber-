import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Send,
  Building2,
  FileCode,
  Info
} from 'lucide-react';
import { ErpWebhookConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ErpWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhook: Partial<ErpWebhookConfig>) => Promise<void>;
  webhook?: ErpWebhookConfig | null;
}

export const ErpWebhookModal: React.FC<ErpWebhookModalProps> = ({
  isOpen,
  onClose,
  onSave,
  webhook
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const isEditing = !!webhook;

  const [name, setName] = useState('');
  const [erpType, setErpType] = useState<ErpWebhookConfig['erpType']>('SAP');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState<'POST' | 'PUT'>('POST');
  const [authHeader, setAuthHeader] = useState('');
  const [customHeaderKey, setCustomHeaderKey] = useState('');
  const [customHeaderValue, setCustomHeaderValue] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [payloadFormat, setPayloadFormat] = useState<ErpWebhookConfig['payloadFormat']>('SAP_COMPLIANCE');
  const [customNotes, setCustomNotes] = useState('');
  
  // Event triggers
  const [stage30Days, setStage30Days] = useState(true);
  const [stage7Days, setStage7Days] = useState(true);
  const [stage1Day, setStage1Day] = useState(true);
  const [expired, setExpired] = useState(true);
  const [allIqamaExpiries, setAllIqamaExpiries] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webhook) {
      setName(webhook.name || '');
      setErpType(webhook.erpType || 'SAP');
      setWebhookUrl(webhook.webhookUrl || '');
      setHttpMethod(webhook.httpMethod || 'POST');
      setSecretToken(webhook.secretToken || '');
      setPayloadFormat(webhook.payloadFormat || 'STANDARD_JSON');
      setCustomNotes(webhook.customNotes || '');
      
      const auth = webhook.headers?.['Authorization'] || '';
      setAuthHeader(auth);

      // Find any other custom header
      const otherKeys = Object.keys(webhook.headers || {}).filter(k => k !== 'Authorization' && k !== 'Content-Type');
      if (otherKeys.length > 0) {
        setCustomHeaderKey(otherKeys[0]);
        setCustomHeaderValue(webhook.headers?.[otherKeys[0]] || '');
      } else {
        setCustomHeaderKey('');
        setCustomHeaderValue('');
      }

      setStage30Days(webhook.events?.stage30Days ?? true);
      setStage7Days(webhook.events?.stage7Days ?? true);
      setStage1Day(webhook.events?.stage1Day ?? true);
      setExpired(webhook.events?.expired ?? true);
      setAllIqamaExpiries(webhook.events?.allIqamaExpiries ?? true);
    } else {
      setName('');
      setErpType('SAP');
      setWebhookUrl('');
      setHttpMethod('POST');
      setAuthHeader('Bearer sap_oauth_token_placeholder');
      setCustomHeaderKey('X-Enterprise-Client-ID');
      setCustomHeaderValue('SAP-KSA-FLEET');
      setSecretToken('whsec_' + Math.random().toString(36).slice(2, 10));
      setPayloadFormat('SAP_COMPLIANCE');
      setCustomNotes('');
      setStage30Days(true);
      setStage7Days(true);
      setStage1Day(true);
      setExpired(true);
      setAllIqamaExpiries(true);
    }
    setError(null);
  }, [webhook, isOpen]);

  // Adjust default payload format when ERP type changes
  const handleErpTypeChange = (type: ErpWebhookConfig['erpType']) => {
    setErpType(type);
    if (type === 'SAP') setPayloadFormat('SAP_COMPLIANCE');
    else if (type === 'ORACLE') setPayloadFormat('ORACLE_HCM');
    else if (type === 'ODOO') setPayloadFormat('ODOO_HR');
    else setPayloadFormat('STANDARD_JSON');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a descriptive name for this ERP webhook.');
      return;
    }
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      setError('Please provide a valid HTTP or HTTPS webhook destination URL.');
      return;
    }

    const headers: Record<string, string> = {};
    if (authHeader.trim()) {
      headers['Authorization'] = authHeader.trim();
    }
    if (customHeaderKey.trim() && customHeaderValue.trim()) {
      headers[customHeaderKey.trim()] = customHeaderValue.trim();
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        erpType,
        webhookUrl: webhookUrl.trim(),
        httpMethod,
        headers,
        secretToken: secretToken.trim(),
        payloadFormat,
        customNotes: customNotes.trim(),
        events: {
          stage30Days,
          stage7Days,
          stage1Day,
          expired,
          allIqamaExpiries
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save ERP webhook.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/30 border border-emerald-500/40 rounded-xl">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isEditing ? (isArabic ? 'تعديل رابط تكامل ERP' : 'Edit Enterprise ERP Webhook') : (isArabic ? 'إضافة تكامل مع نظام ERP' : 'Connect Enterprise ERP Webhook')}
              </h3>
              <p className="text-xs text-slate-300">
                {isArabic ? 'إرسال تنبيهات انتهاء الإقامات آلياً إلى أنظمة SAP، Oracle، Odoo، وDynamics' : 'Real-time HTTP webhook triggers for Iqama expiry alerts to SAP, Oracle, Odoo & Custom ERPs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ERP System Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isArabic ? 'نظام ERP المستهدف' : 'Target ERP Platform'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['SAP', 'ORACLE', 'ODOO', 'DYNAMICS', 'CUSTOM', 'GENERIC'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleErpTypeChange(type)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    erpType === type
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type === 'GENERIC' ? 'REST API' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Integration Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isArabic ? 'اسم التكامل / التوصيف' : 'Integration Endpoint Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. SAP S/4HANA HR & Muqeem Compliance Connector"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-medium"
              required
            />
          </div>

          {/* Webhook URL & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'رابط Webhook (HTTP / HTTPS Endpoint)' : 'Webhook Target URL'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://erp.company.com/api/v1/workforce/iqama-expiry"
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-mono"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'طريقة الطلب' : 'HTTP Method'}
              </label>
              <select
                value={httpMethod}
                onChange={e => setHttpMethod(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-bold text-slate-800"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>

          {/* Authentication & Headers */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isArabic ? 'المصادقة وترويسات الأمان (Headers & Auth)' : 'Security Headers & Authentication'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Authorization Header (Bearer / Basic / API Key)
                </label>
                <input
                  type="text"
                  value={authHeader}
                  onChange={e => setAuthHeader(e.target.value)}
                  placeholder="Bearer eyJhbGciOi..."
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  HMAC Secret Token (X-Fleet-Signature)
                </label>
                <input
                  type="text"
                  value={secretToken}
                  onChange={e => setSecretToken(e.target.value)}
                  placeholder="whsec_enterprise_key_99..."
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={customHeaderKey}
                onChange={e => setCustomHeaderKey(e.target.value)}
                placeholder="Custom Header Key (e.g. X-Tenant-Id)"
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
              <input
                type="text"
                value={customHeaderValue}
                onChange={e => setCustomHeaderValue(e.target.value)}
                placeholder="Custom Header Value"
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Trigger Stages */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {isArabic ? 'مراحل التنبيه المفعلة (Three-Stage Expiry Triggers)' : 'Active Three-Stage Alert Triggers'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={stage30Days}
                  onChange={e => setStage30Days(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-700"
                />
                <div className="text-xs">
                  <div className="font-bold text-blue-700">30 Days</div>
                  <div className="text-[10px] text-slate-500">Advance Notice</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={stage7Days}
                  onChange={e => setStage7Days(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-700"
                />
                <div className="text-xs">
                  <div className="font-bold text-amber-700">7 Days</div>
                  <div className="text-[10px] text-slate-500">Critical Warning</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={stage1Day}
                  onChange={e => setStage1Day(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-700"
                />
                <div className="text-xs">
                  <div className="font-bold text-red-700">1 Day</div>
                  <div className="text-[10px] text-slate-500">Emergency Alert</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={expired}
                  onChange={e => setExpired(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-700"
                />
                <div className="text-xs">
                  <div className="font-bold text-red-900">Expired (0d)</div>
                  <div className="text-[10px] text-slate-500">Violation Block</div>
                </div>
              </label>
            </div>
          </div>

          {/* Payload Format & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'تنسيق الحمولة (JSON Payload Format)' : 'JSON Payload Schema'}
              </label>
              <select
                value={payloadFormat}
                onChange={e => setPayloadFormat(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-800"
              >
                <option value="STANDARD_JSON">Standard REST JSON (Enterprise Default)</option>
                <option value="SAP_COMPLIANCE">SAP S/4HANA OData Workforce Schema</option>
                <option value="ORACLE_HCM">Oracle HCM Cloud Rest Payload</option>
                <option value="ODOO_HR">Odoo JSON-RPC Employee Hook</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'ملاحظات إدارية' : 'Integration Notes'}
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="e.g. Syncs with Jawazat auto-renewal ledger"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-700"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isEditing ? (isArabic ? 'تحديث الرابط' : 'Update Webhook') : (isArabic ? 'حفظ وتفعيل' : 'Save & Activate')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
