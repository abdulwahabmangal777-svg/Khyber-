import React, { useState } from 'react';
import {
  Server,
  PhoneCall,
  Globe,
  MessageSquare,
  Radio,
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Phone,
  PhoneForwarded,
  Shield,
  Zap,
  Clock,
  User,
  ArrowRight,
  ArrowDown,
  Volume2,
  Mic,
  Copy,
  ExternalLink,
  X,
  AlertTriangle,
  Send,
  Sliders
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { generateCurrentViewPdf } from '../utils/printPdfReport';
import { audioService } from '../services/audioService';
import { KhyberFullArchitectureView } from './KhyberFullArchitectureView';

interface KhyberCoreHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentViewName?: string;
}

export const KhyberCoreHubModal: React.FC<KhyberCoreHubModalProps> = ({
  isOpen,
  onClose,
  currentViewName = 'Fleet Dashboard'
}) => {
  const { language, t, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'architecture' | 'tel_agent' | 'web' | 'whatsapp'>('architecture');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Tel-Agent / SIP state
  const [phoneNumber, setPhoneNumber] = useState('+966 54 892 1045');
  const [callScenario, setCallScenario] = useState<'iqama' | 'dispatch' | 'emergency' | 'status'>('dispatch');
  const [sipCallActive, setSipCallActive] = useState(false);
  const [sipCallDuration, setSipCallDuration] = useState(0);
  const [callTranscript, setCallTranscript] = useState<Array<{ sender: 'agent' | 'driver'; text: string; time: string }>>([]);

  // WhatsApp state
  const [waRecipient, setWaRecipient] = useState('+966548921045');
  const [waTemplate, setWaTemplate] = useState<'waybill' | 'iqama' | 'maintenance' | 'pdf_report'>('waybill');
  const [waCopied, setWaCopied] = useState(false);

  // PDF Report Handler
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      audioService.playChime('click');
      const res = await generateCurrentViewPdf('current-view-content', {
        reportTitle: currentViewName,
        viewName: currentViewName,
        orientation: 'landscape'
      });
      if (res.success) {
        setPdfSuccessMessage(
          language === 'ar'
            ? `تم إنشاء وتنزيل تقرير PDF بنجاح (${res.filename})`
            : `PDF Report downloaded successfully (${res.filename})`
        );
        audioService.playChime('confirm');
      }
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleNativePrint = () => {
    audioService.playChime('click');
    window.print();
  };

  // SIP Call Simulation
  const handleStartSipCall = () => {
    audioService.playChime('radio');
    setSipCallActive(true);
    setSipCallDuration(0);

    const initialText =
      callScenario === 'dispatch'
        ? (language === 'ar'
            ? 'مرحباً كابتن محمد، معك المساعد الصوتي لخيبر. تم تعيين بوليصة نقل جديدة رقم #KB-904 من مستودع السلي إلى جدة.'
            : 'Hello Captain Mohammed, this is the Khyber AI Tel-Agent. A new dispatch order #KB-904 from Riyadh Sulay Hub to Jeddah has been assigned.')
        : callScenario === 'iqama'
        ? (language === 'ar'
            ? 'تنبيه امتثال: كابتن محمد، نود تذكيرك بأن إقامتك ورخصة القيادة تنتهي خلال 14 يوماً. يرجى مراجعة قسم الموارد البشرية.'
            : 'Compliance Alert: Captain Mohammed, your Iqama & heavy transport permit expire in 14 days. Please coordinate with HR.')
        : callScenario === 'emergency'
        ? (language === 'ar'
            ? 'نداء طوارئ: تم رصد انحراف أو حرارة مرتفعة في الشاحنة لوحة (أ ب ج 1024). هل تحتاج مساعدة على الطريق فوراً؟'
            : 'Emergency Telematics: High engine temperature detected on Truck Plate (ABC 1024). Do you require roadside dispatch?')
        : (language === 'ar'
            ? 'مرحباً كابتن، نتحقق من حالتك التشغيلية الحالية وسلامة الشحنة. هل أنت في المسار المحدد؟'
            : 'Captain, checking your operational status and cargo temperature integrity. Are you on the designated corridor?');

    setCallTranscript([
      { sender: 'agent', text: initialText, time: '00:01' }
    ]);

    // Timer
    const timer = setInterval(() => {
      setSipCallDuration(prev => {
        if (prev >= 18) {
          clearInterval(timer);
          setSipCallActive(false);
          return prev;
        }
        if (prev === 4) {
          setCallTranscript(t => [
            ...t,
            {
              sender: 'driver',
              text: language === 'ar' ? 'أهلاً يا فندم، استلمت التنبيه وجاري التأكيد في التطبيق حالاً.' : 'Hello, loud and clear. Acknowledging dispatch and proceeding now.',
              time: '00:05'
            }
          ]);
        }
        if (prev === 8) {
          setCallTranscript(t => [
            ...t,
            {
              sender: 'agent',
              text: language === 'ar' ? 'تم توثيق الاستلام وربط البيانات مع منصة وصل المركزية. رافقتكم السلامة.' : 'Acknowledgment logged into Wasl central telematics. Have a safe transit.',
              time: '00:09'
            }
          ]);
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleEndSipCall = () => {
    audioService.playChime('confirm');
    setSipCallActive(false);
  };

  // WhatsApp template text
  const getWhatsAppMessage = () => {
    switch (waTemplate) {
      case 'waybill':
        return language === 'ar'
          ? `*خيبر لخدمات النقل والخدمات اللوجستية*\n📋 أمر نقل جديد: #KB-904\n📍 مسار الرحلة: الرياض (مستودع السلي) ➔ جدة\n🚛 الشاحنة: مرسيدس أكتروس (أ ب ج 1024)\n👤 السائق: محمد أحمد العتيبي\n🔗 رابط التتبع والمسار: https://khyber.sa/track/KB-904`
          : `*Khyber Logistics Services*\n📋 New Dispatch Order: #KB-904\n📍 Corridor: Riyadh Sulay Hub ➔ Jeddah Depot\n🚛 Vehicle: Mercedes Actros (Plate ABC 1024)\n👤 Driver: Mohammed Al-Otaibi\n🔗 Live Telematics: https://khyber.sa/track/KB-904`;
      case 'iqama':
        return language === 'ar'
          ? `*تنبيه امتثال رسمي - خيber Logistics*\nعزيزي السائق، نود إشعارك بضرورة تجديد الإقامة وتأمين المركبة قبل تاريخ الانتهاء لتفادي إيقاف الحساب على منصة وصل.\n📅 متبقي: 14 يوماً`
          : `*Official Compliance Notice - Khyber Logistics*\nDear Driver, please renew your Iqama and vehicle insurance before expiration to avoid suspension on TGA Wasl portal.\n📅 Remaining: 14 Days`;
      case 'maintenance':
        return language === 'ar'
          ? `*إشعار موعد صيانة دورية - خيبر*\nمركبتك مجدولة لتغيير الزيت وفحص الإطارات لدى فرع بترومين المعتمد.\n🔧 موعد الحجز: اليوم الساعة 4:00 عصراً`
          : `*Periodic Maintenance Notice - Khyber Fleet*\nYour vehicle is booked for oil service and brake inspection at Petromin Partner Center.\n🔧 Scheduled: Today 4:00 PM`;
      case 'pdf_report':
        return language === 'ar'
          ? `*تقرير العمليات والأسطول - خيبر لخدمات النقل*\nمرفق ملخص التقرير التشغيلي (${currentViewName}) الصادر بتاريخ ${new Date().toLocaleDateString('ar-SA')}.\n✅ معتمد وموثق بنظام ZATCA الضريبي`
          : `*Fleet Operations Report - Khyber Logistics*\nSummary report (${currentViewName}) generated on ${new Date().toLocaleDateString('en-GB')}.\n✅ Certified ZATCA & TGA Compliant`;
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanNumber = waRecipient.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(getWhatsAppMessage());
    window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    setWaCopied(true);
    audioService.playChime('click');
    setTimeout(() => setWaCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
              <Server className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">KHYBER CORE</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold">
                  MULTI-CHANNEL GATEWAY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'بوابة الاتصالات الموحدة: الوكيل الصوتي (SIP Phone) • بوابة الويب (PDF) • رسائل واتساب'
                  : 'Unified Communications: AI Tel-Agent (SIP Phone) • Web Portal (PDF) • WhatsApp Gateway'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'architecture'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>{language === 'ar' ? 'المخطط الهيكلي للنظام' : 'Architecture Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tel_agent')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'tel_agent'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Tel-Agent (SIP Phone)</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('web')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'web'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Web (PDF Reports)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Dispatch</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: ARCHITECTURE OVERVIEW */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Full Interactive End-to-End Diagram */}
              <KhyberFullArchitectureView
                onOpenTelAgent={() => setActiveTab('tel_agent')}
                onOpenIntegrationHub={() => setActiveTab('whatsapp')}
                onOpenAiEngine={() => setActiveTab('tel_agent')}
              />

              {/* Channel Quick Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <PhoneCall className="w-4 h-4 text-purple-600" /> Tel-Agent Voice
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      SIP: ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Automated outbound phone calling to Saudi drivers for urgent Iqama reminders, dispatch updates, and voice reporting.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tel_agent')}
                    className="w-full py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Open Tel-Agent Softphone →
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" /> Current View PDF
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      A4 PRINT READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    One-click downloadable PDF report for current view ({currentViewName}) formatted with print-friendly styles.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isGeneratingPdf ? (
                      <span>Generating PDF...</span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Current View PDF</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Cloud
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Dispatch official waybills, Iqama alerts, and operational PDF links directly to WhatsApp with pre-formatted Saudi templates.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp')}
                    className="w-full py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Open WhatsApp Dispatcher →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEL-AGENT & SIP PHONE GATEWAY */}
          {activeTab === 'tel_agent' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: Softphone & Call Controls */}
                <div className="md:col-span-6 space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-purple-600" />
                        <span>Khyber AI Tel-Agent Dialer</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                        SIP Trunk: Connected
                      </span>
                    </div>

                    {/* Phone Number Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'ar' ? 'رقم هاتف السائق / العميل:' : 'Recipient Phone Number (Saudi Mobile):'}
                      </label>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          placeholder="+966 5X XXX XXXX"
                          className="w-full text-xs font-mono bg-transparent outline-hidden text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Call Scenario Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'ar' ? 'سيناريو المكالمة الذكية:' : 'AI Automated Voice Scenario:'}
                      </label>
                      <select
                        value={callScenario}
                        onChange={e => setCallScenario(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                      >
                        <option value="dispatch">Route Waybill & Dispatch Assignment (#KB-904)</option>
                        <option value="iqama">Urgent Iqama & Permit Expiration Reminder</option>
                        <option value="emergency">Emergency Breakdown & High-Temp Telematics Alert</option>
                        <option value="status">Periodic Driver Status & Safety Corridor Check</option>
                      </select>
                    </div>

                    {/* Quick Dial Action */}
                    {!sipCallActive ? (
                      <button
                        type="button"
                        onClick={handleStartSipCall}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>{language === 'ar' ? 'بدء مكالمة SIP عبر Tel-Agent' : 'Initiate Outbound SIP Call'}</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="font-bold">Call Connected ({phoneNumber})</span>
                          </div>
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                            00:{sipCallDuration < 10 ? `0${sipCallDuration}` : sipCallDuration}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleEndSipCall}
                          className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <PhoneForwarded className="w-4 h-4" />
                          <span>{language === 'ar' ? 'إنهاء المكالمة' : 'Terminate Call'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SIP Technical Details */}
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] space-y-1 font-mono text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>SIP Gateway:</span>
                      <strong className="text-slate-800 dark:text-slate-200">sip.khyber.sa:5060</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Audio Codec:</span>
                      <strong className="text-slate-800 dark:text-slate-200">G.711u / Opus (24kHz HD)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>PSTN Provider:</span>
                      <strong className="text-slate-800 dark:text-slate-200">Saudi Telecom STC SIP Trunk</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Live Transcript & Waveform */}
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-600" />
                      <span>Live Call Audio & Speech Transcript</span>
                    </h5>
                    {sipCallActive && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Transcribing...
                      </span>
                    )}
                  </div>

                  <div className="h-64 overflow-y-auto p-4 rounded-2xl bg-slate-900 text-white font-sans text-xs space-y-3 border border-slate-800">
                    {callTranscript.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                        <Radio className="w-6 h-6 text-slate-600" />
                        <p className="text-[11px]">No active call in progress. Press "Initiate Outbound SIP Call" to simulate.</p>
                      </div>
                    ) : (
                      callTranscript.map((t, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${
                            t.sender === 'agent' ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                            <span>{t.sender === 'agent' ? '🤖 Khyber Tel-Agent' : '👤 Driver (Phone)'}</span>
                            <span>• {t.time}</span>
                          </div>
                          <div
                            className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                              t.sender === 'agent'
                                ? 'bg-purple-900/60 border border-purple-500/40 text-purple-100 rounded-tl-xs'
                                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tr-xs'
                            }`}
                          >
                            {t.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEB & CURRENT VIEW PDF EXPORT */}
          {activeTab === 'web' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-linear-to-r from-blue-900/10 via-slate-50 to-emerald-900/10 dark:from-slate-800 dark:to-slate-800/80 border border-blue-200 dark:border-blue-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span>{language === 'ar' ? 'توليد تقرير PDF فوري للعرض الحالي' : 'Instant Current View PDF Report Generator'}</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {language === 'ar'
                        ? `يتم توليد ملف PDF قابل للتنزيل فوراً لشاشة (${currentViewName}) مع تطبيق التنسيقات المخصصة للطباعة في index.css.`
                        : `Generates a downloadable PDF of the active screen (${currentViewName}) applying the print-friendly styles defined in index.css.`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNativePrint}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Trigger browser print preview"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>{language === 'ar' ? 'طباعة المتصفح (A4)' : 'Browser Print'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isGeneratingPdf ? (
                        <span>Generating PDF...</span>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تحميل تقرير PDF' : 'Download PDF Report'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {pdfSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pdfSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* PDF Specifications & Print Styles Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" /> Saudi Compliance Header
                  </span>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Includes Commercial Registration (CR: 1010789452), VAT ID, Hijri/Gregorian date stamps, and ZATCA compliance badge.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-blue-600" /> Print-Friendly Media Filter
                  </span>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Automatically strips navigation chrome, search bars, interactive buttons, and floating ads using CSS <code>@media print</code> rules.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> High-Resolution Vector Scale
                  </span>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Rendered at 2x pixel ratio for crisp typography and barcode scanning when printed on physical paper.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WHATSAPP BUSINESS DISPATCH */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: Message Configuration */}
                <div className="md:col-span-6 space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>WhatsApp Dispatch Composer</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                        Cloud API: Ready
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'ar' ? 'رقم واتساب السائق (مع مفتاح الدولة):' : 'Driver WhatsApp Number:'}
                      </label>
                      <input
                        type="text"
                        value={waRecipient}
                        onChange={e => setWaRecipient(e.target.value)}
                        placeholder="+966548921045"
                        className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'ar' ? 'نوع الإشعار اللوجستي:' : 'Logistics Message Template:'}
                      </label>
                      <select
                        value={waTemplate}
                        onChange={e => setWaTemplate(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                      >
                        <option value="waybill">Official Dispatch Waybill (#KB-904)</option>
                        <option value="iqama">Urgent Iqama Expiry Reminder Notice</option>
                        <option value="maintenance">Fleet Maintenance & Oil Service Booking</option>
                        <option value="pdf_report">Current View PDF Report Link Summary</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إرسال عبر تطبيق واتساب' : 'Open in WhatsApp'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {waCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                        <span>{waCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Message Preview Bubble */}
                <div className="md:col-span-6 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Encrypted Message Preview</span>
                  </h5>

                  <div className="p-4 rounded-2xl bg-[#ECE5DD] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 min-h-[220px] flex flex-col justify-end">
                    <div className="max-w-[90%] bg-white dark:bg-[#005C4B] dark:text-white p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs space-y-2 whitespace-pre-wrap leading-relaxed">
                      {getWhatsAppMessage()}
                      <div className="text-[10px] text-slate-400 dark:text-emerald-200 text-right">
                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-emerald-600" /> KHYBER CORE v3.8
            </span>
            <span>•</span>
            <span>Kingdom of Saudi Arabia</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Exporting...' : 'PDF Report'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
