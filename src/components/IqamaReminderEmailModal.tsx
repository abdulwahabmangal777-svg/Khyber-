import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Server,
  Sparkles
} from 'lucide-react';
import { Worker } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { previewIqamaReminder, sendTestIqamaReminder, dispatchIqamaToErp } from '../services/webhookApi';

interface IqamaReminderEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  initialStage?: 30 | 7 | 1;
  onSentSuccess?: () => void;
  authToken?: string | null;
  onDispatched?: () => void;
}

export const IqamaReminderEmailModal: React.FC<IqamaReminderEmailModalProps> = ({
  isOpen,
  onClose,
  worker,
  initialStage = 30,
  onSentSuccess,
  authToken,
  onDispatched
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const validStage: 30 | 7 | 1 = initialStage === 1 ? 1 : initialStage === 7 ? 7 : 30;
  const [selectedStage, setSelectedStage] = useState<30 | 7 | 1>(validStage);
  const [customEmail, setCustomEmail] = useState('');
  const [viewMode, setViewMode] = useState<'HTML' | 'TEXT'>('HTML');
  const [previewData, setPreviewData] = useState<{ subject: string; subjectAr: string; html: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [triggeringErp, setTriggeringErp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (worker && isOpen) {
      const stage: 30 | 7 | 1 = initialStage === 1 ? 1 : initialStage === 7 ? 7 : 30;
      setSelectedStage(stage);
      setCustomEmail(worker.email || '');
      loadPreview(stage);
      setStatusMessage(null);
    }
  }, [worker, isOpen, initialStage]);

  const loadPreview = async (stage: 30 | 7 | 1) => {
    if (!worker) return;
    setLoading(true);
    try {
      const data = await previewIqamaReminder(worker.id, stage);
      setPreviewData(data);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = (stage: 30 | 7 | 1) => {
    setSelectedStage(stage);
    loadPreview(stage);
  };

  const handleSendEmail = async () => {
    if (!worker) return;
    setSending(true);
    setStatusMessage(null);
    try {
      const res = await sendTestIqamaReminder(worker.id, selectedStage, customEmail);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Stage ${selectedStage} reminder email successfully sent to ${customEmail || worker.email || 'HR'}.` });
        onSentSuccess?.();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to dispatch email reminder.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error dispatching email.' });
    } finally {
      setSending(false);
    }
  };

  const handleTriggerErp = async () => {
    if (!worker) return;
    setTriggeringErp(true);
    setStatusMessage(null);
    try {
      const res = await dispatchIqamaToErp(worker.id, selectedStage);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `ERP Webhook trigger dispatched to active endpoints (${res.results?.dispatchedCount ?? 'all'} systems notified).` });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to trigger ERP webhook.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error triggering ERP.' });
    } finally {
      setTriggeringErp(false);
    }
  };

  if (!isOpen || !worker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/30 border border-emerald-500/40 rounded-xl">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isArabic ? 'تذكير انتهاء الإقامة (نظام المراحل الثلاث: 30، 7، 1 يوم)' : 'Three-Stage Iqama Expiry Email Notification'}
              </h3>
              <p className="text-xs text-slate-300">
                {worker.fullName} ({worker.employeeId}) • {worker.iqamaNumber} • Expiry: {worker.iqamaExpiry}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Stage Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-800 block mb-1">
                {isArabic ? 'اختر مرحلة الإشعار:' : 'Select Reminder Stage:'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStageChange(30)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedStage === 30
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  30 Days (Advance)
                </button>
                <button
                  type="button"
                  onClick={() => handleStageChange(7)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedStage === 7
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  7 Days (Critical)
                </button>
                <button
                  type="button"
                  onClick={() => handleStageChange(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedStage === 1
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1 Day (Emergency)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('HTML')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                  viewMode === 'HTML' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>HTML Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TEXT')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                  viewMode === 'TEXT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plain Text</span>
              </button>
            </div>
          </div>

          {/* Recipient Email Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'البريد الإلكتروني للمستلم' : 'Recipient Email Address'}
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                placeholder="driver.email@saudifleet.com"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isArabic ? 'عنوان الرسالة المقترح' : 'Generated Subject'}
              </label>
              <input
                type="text"
                readOnly
                value={previewData?.subject || 'Loading subject...'}
                className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono text-ellipsis overflow-hidden"
              />
            </div>
          </div>

          {/* Email Preview Frame */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Generating bilingual email preview...
              </div>
            ) : viewMode === 'HTML' ? (
              <div className="p-4 bg-slate-100 overflow-x-auto max-h-96">
                <div
                  dangerouslySetInnerHTML={{ __html: previewData?.html || '<p>No preview generated</p>' }}
                />
              </div>
            ) : (
              <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                {previewData?.text || 'No text template'}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTriggerErp}
            disabled={triggeringErp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
            title="Trigger external ERP Webhook (SAP, Oracle, Odoo) with this Iqama alert"
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>{triggeringErp ? 'Pushing to ERP...' : 'Trigger ERP Webhooks'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? (isArabic ? 'جاري الإرسال...' : 'Sending Email...') : (isArabic ? 'إرسال التذكير الآن' : `Dispatch Stage ${selectedStage} Email`)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
