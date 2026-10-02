import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  CheckCircle2,
  TrendingUp,
  Settings,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  MousePointerClick,
  DollarSign,
  Copy,
  Info,
  Check,
  Link2,
  UploadCloud,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAdsterra } from '../../context/AdsterraContext';
import { useLanguage } from '../../context/LanguageContext';
import { AdsterraConfig, AdsterraSmartlink } from '../../types';

export const AdsterraManagerModal: React.FC = () => {
  const { config, isAdsterraModalOpen, setIsAdsterraModalOpen, updateConfig, resetDemo, importCsv } = useAdsterra();
  const { language, dir, formatCurrency } = useLanguage();

  const [formData, setFormData] = useState<Partial<AdsterraConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // CSV Import state
  const [showCsvBox, setShowCsvBox] = useState(false);
  const [csvInput, setCsvInput] = useState(`"zone name","placement name","placement id","codes & smartlinks"
smart-link-3407564,Smartlink_1,30540142,https://www.profitableratecpmnetwork.com/j7wgqh59f?key=69444c91d5d13033ecdff540cfe3d66f
smart-link-3407564,Smartlink_2,30540365,https://www.profitableratecpmnetwork.com/cbqpesmwq?key=a69fa71068bccbf3e31f6fe09fe45462
smart-link-3407564,Smartlink_3,30657127,https://www.profitableratecpmnetwork.com/bypi27ikj?key=ec6a4a8f69cba510c8d38b835c8b0378
smart-link-3407564,Smartlink_4,31301807,https://www.profitableratecpmnetwork.com/ax4a4j35x?key=dec77029f348fef5b611a8b6c042eeeb`);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        enabled: config.enabled,
        publisherId: config.publisherId,
        zoneName: config.zoneName || 'smart-link-3407564',
        admobAppId: config.admobAppId || 'ca-app-pub-1036802722878553~9890117209',
        admobPublisherId: config.admobPublisherId || 'pub-1036802722878553',
        admobAdUnitId: config.admobAdUnitId || 'ca-app-pub-1036802722878553/8632875853',
        banner728x90ZoneKey: config.banner728x90ZoneKey,
        banner300x250ZoneKey: config.banner300x250ZoneKey,
        banner468x60ZoneKey: config.banner468x60ZoneKey,
        socialBarScriptUrl: config.socialBarScriptUrl,
        popunderScriptUrl: config.popunderScriptUrl,
        directLinkUrl: config.directLinkUrl,
        smartlinks: config.smartlinks || [],
        smartlinkRotation: config.smartlinkRotation || 'placement-mapped',
        hideForPaidTiers: config.hideForPaidTiers,
        testMode: config.testMode,
        placements: { ...config.placements }
      });
    }
  }, [config]);

  if (!isAdsterraModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const success = await updateConfig(formData);
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من استعادة بيانات وأكواد أدستيرا التجريبية؟' : 'Reset to verified Adsterra demo zones?')) {
      await resetDemo();
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSmartlinkToggle = (placementId: string) => {
    setFormData(prev => {
      const existing = prev.smartlinks || [];
      const updated = existing.map(s =>
        s.placementId === placementId ? { ...s, active: !s.active } : s
      );
      return { ...prev, smartlinks: updated };
    });
  };

  const handleImportCsv = async () => {
    setIsImporting(true);
    setImportStatus(null);
    const success = await importCsv(csvInput);
    setIsImporting(false);
    if (success) {
      setImportStatus(language === 'ar' ? 'تم استيراد الروابط بنجاح!' : 'Smartlinks imported successfully!');
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      setImportStatus(language === 'ar' ? 'فشل استيراد الروابط، تحقق من النص' : 'Failed to import CSV, please check format');
    }
  };

  const smartlinksList = formData.smartlinks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
        dir={dir}
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {language === 'ar' ? 'لوحة تحكم أدستيرا والروابط الذكية (Smartlinks)' : 'Adsterra Ads & Smartlinks Portal'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {formData.enabled ? (language === 'ar' ? 'الشبكة مفعلة' : 'Active') : (language === 'ar' ? 'متوقفة' : 'Paused')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar'
                  ? `المنطقة النشطة: ${formData.zoneName || 'smart-link-3407564'} • 4 روابط ذكية متصلة وموزعة على الشاشات`
                  : `Zone: ${formData.zoneName || 'smart-link-3407564'} • 4 High-CPM Smartlinks mapped across fleet views`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdsterraModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Telemetry Bar */}
        {config?.stats && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>{language === 'ar' ? 'مرات الظهور' : 'Impressions'}</span>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {config.stats.impressions.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {language === 'ar' ? 'متصل ومحدث' : 'Live Adsterra Tracker'}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>{language === 'ar' ? 'النقرات (Clicks)' : 'Clicks'}</span>
                  <MousePointerClick className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {config.stats.clicks.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  CTR: {config.stats.impressions > 0 ? ((config.stats.clicks / config.stats.impressions) * 100).toFixed(1) : '0'}%
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="text-emerald-800 font-semibold">{language === 'ar' ? 'الأرباح المقدرة' : 'Est. Earnings'}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-bold text-emerald-800 font-mono">
                  {formatCurrency(config.stats.estimatedRevenueSar)}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  eCPM: ~0.85 SAR
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Main Switches */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {language === 'ar' ? 'تشغيل إعلانات أدستيرا (Adsterra Ads Network)' : 'Run Adsterra Ads Network'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === 'ar' ? 'تفعيل أو إيقاف عرض الإعلانات والروابط الذكية في التطبيق' : 'Enable or pause ad delivery across all designated positions'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled ?? true}
                  onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* Test Mode Switch */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'الوضع التجريبي (Test / Demo Mode)' : 'Test / Demo Ad Units'}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {language === 'ar' ? 'موصى به أثناء التجربة' : 'Recommended for preview'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === 'ar'
                    ? 'يعرض وحدات إعلانية تفاعلية آمنة لتجربة التنسيقات وتوجيه الروابط الذكية بدون حجب'
                    : 'Renders verified interactive preview creatives that trigger your active smartlinks'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.testMode ?? true}
                  onChange={e => setFormData(prev => ({ ...prev, testMode: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
              </label>
            </div>

            {/* Hide for Paid Tiers Switch */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {language === 'ar' ? 'إخفاء الإعلانات لمشتركي باقات VIP / المؤسسات' : 'Ad-free for Enterprise Subscribers'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === 'ar'
                    ? 'إزالة الإعلانات تلقائياً عند ترقية الحساب إلى الباقة الاحترافية أو باقة المؤسسات'
                    : 'Automatically hide all ads for accounts subscribed to Professional or Enterprise tier'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hideForPaidTiers ?? true}
                  onChange={e => setFormData(prev => ({ ...prev, hideForPaidTiers: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>

          {/* ACTIVE SMARTLINKS & ZONE SECTION */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {language === 'ar' ? 'الروابط الذكية والأماكن (Smartlinks & Placements)' : 'Connected Smartlinks & Placements'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Zone: {formData.zoneName || 'smart-link-3407564'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {language === 'ar'
                    ? 'روابط CPM عالية العائد موجهة تلقائياً حسب أماكن العرض (اللوحة العلوية، الشريط الجانبي، السوشيال بار، والتقارير).'
                    : 'High-yield profitableratecpmnetwork Smartlinks routed to dedicated placements with click counters.'}
                </p>
              </div>

              {/* Rotation Strategy Selector */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] font-semibold text-slate-500 px-1">
                  {language === 'ar' ? 'التوزيع:' : 'Routing:'}
                </span>
                <select
                  value={formData.smartlinkRotation || 'placement-mapped'}
                  onChange={e => setFormData(prev => ({ ...prev, smartlinkRotation: e.target.value as any }))}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                >
                  <option value="placement-mapped">
                    {language === 'ar' ? 'توجيه مخصص لكل موقع (موصى به)' : 'Mapped by Placement (Recommended)'}
                  </option>
                  <option value="round-robin">
                    {language === 'ar' ? 'تدوير متتالي (Round Robin)' : 'Round Robin'}
                  </option>
                  <option value="random">
                    {language === 'ar' ? 'توزيع عشوائي (Random)' : 'Random Split'}
                  </option>
                </select>
              </div>
            </div>

            {/* Smartlink Cards Grid */}
            <div className="space-y-2.5">
              {smartlinksList.map((smartlink, index) => {
                const placementBadge = {
                  dashboardTop: { label: language === 'ar' ? 'أعلى لوحة التحكم (728x90)' : 'Top Dashboard Banner', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                  dashboardSidebar: { label: language === 'ar' ? 'القائمة الجانبية (300x250)' : 'Sidebar & Widgets', color: 'bg-purple-50 text-purple-800 border-purple-200' },
                  socialBar: { label: language === 'ar' ? 'إشعار السوشيال بار' : 'Floating Social Bar', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  reportsTop: { label: language === 'ar' ? 'صفحة التقارير' : 'Reports Page Banner', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                  all: { label: language === 'ar' ? 'جميع الأماكن' : 'All Placements', color: 'bg-slate-100 text-slate-800 border-slate-200' }
                }[smartlink.assignedPlacement || (index === 0 ? 'dashboardTop' : index === 1 ? 'dashboardSidebar' : index === 2 ? 'socialBar' : 'reportsTop')] || { label: 'Active Placement', color: 'bg-slate-100 text-slate-800 border-slate-200' };

                return (
                  <div
                    key={smartlink.placementId}
                    className={`p-3 rounded-xl border transition-all ${
                      smartlink.active !== false
                        ? 'bg-white border-slate-200/90 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">
                            {index + 1}
                          </span>
                          <span>{smartlink.placementName}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          ID: {smartlink.placementId}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${placementBadge.color}`}>
                          {placementBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {smartlink.clicks || 0} {language === 'ar' ? 'نقرة' : 'clicks'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSmartlinkToggle(smartlink.placementId)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            smartlink.active !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {smartlink.active !== false ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطل' : 'Disabled')}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                      <span className="text-[11px] font-mono text-slate-700 truncate flex-1 dir-ltr select-all">
                        {smartlink.url}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(smartlink.url, `smartlink-${smartlink.placementId}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy URL"
                        >
                          {copiedField === `smartlink-${smartlink.placementId}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>{language === 'ar' ? 'نسخ' : 'Copy'}</span>
                            </>
                          )}
                        </button>

                        <a
                          href={smartlink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          title="Open and test smartlink in new tab"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-700" />
                          <span>{language === 'ar' ? 'تجربة الرابط' : 'Test'}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable CSV Import / Raw Table */}
            <div className="pt-2 border-t border-emerald-200/60">
              <button
                type="button"
                onClick={() => setShowCsvBox(!showCsvBox)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {showCsvBox
                    ? (language === 'ar' ? 'إخفاء أداة استيراد الـ CSV' : 'Hide CSV Import Tool')
                    : (language === 'ar' ? 'استيراد أو لصق كود CSV مخصص للروابط' : 'Import or Paste Raw CSV Smartlinks')}
                </span>
                {showCsvBox ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showCsvBox && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <textarea
                      value={csvInput}
                      onChange={e => setCsvInput(e.target.value)}
                      rows={5}
                      className="w-full p-2.5 text-[11px] font-mono bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
                      placeholder={`"zone name","placement name","placement id","codes & smartlinks"`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {importStatus && (
                          <span className="font-bold text-emerald-700">{importStatus}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleImportCsv}
                        disabled={isImporting}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isImporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                        <span>{language === 'ar' ? 'تطبيق واستيراد الـ CSV' : 'Parse & Update Smartlinks'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Primary Direct Link URL */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              {language === 'ar' ? 'الرابط المباشر الأساسي (Primary Direct Link URL):' : 'Primary Direct Link URL:'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.directLinkUrl || ''}
                onChange={e => setFormData(prev => ({ ...prev, directLinkUrl: e.target.value }))}
                placeholder="https://www.profitableratecpmnetwork.com/..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 pr-16"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(formData.directLinkUrl || '', 'primary-direct')}
                className="absolute end-2 top-1.5 px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'primary-direct' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'primary-direct' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Publisher ID & Banner Zone Keys */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {language === 'ar' ? 'بيانات الناشر وأكواد البنرات التقليدية (Optional Banners)' : 'Publisher Account & Traditional Banner Keys'}
              </h4>
              <a
                href="https://publishers.adsterra.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                <span>{language === 'ar' ? 'لوحة أدستيرا الرسمية' : 'Adsterra Publisher Portal'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {language === 'ar' ? 'معرف الناشر (Publisher ID):' : 'Publisher ID:'}
                </label>
                <input
                  type="text"
                  value={formData.publisherId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, publisherId: e.target.value }))}
                  placeholder="e.g. ADST-948102"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {language === 'ar' ? 'مفتاح بنر 728x90 (Leaderboard):' : '728x90 Banner Zone Key:'}
                </label>
                <input
                  type="text"
                  value={formData.banner728x90ZoneKey || ''}
                  onChange={e => setFormData(prev => ({ ...prev, banner728x90ZoneKey: e.target.value }))}
                  placeholder="e.g. 0123456789abcdef0123456789abcdef"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {language === 'ar' ? 'مفتاح بنر 300x250 (Medium Rectangle):' : '300x250 Rectangle Zone Key:'}
                </label>
                <input
                  type="text"
                  value={formData.banner300x250ZoneKey || ''}
                  onChange={e => setFormData(prev => ({ ...prev, banner300x250ZoneKey: e.target.value }))}
                  placeholder="e.g. abcdef0123456789abcdef0123456789"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {language === 'ar' ? 'رابط كود السوشيال بار (Social Bar URL):' : 'Social Bar Script URL:'}
                </label>
                <input
                  type="text"
                  value={formData.socialBarScriptUrl || ''}
                  onChange={e => setFormData(prev => ({ ...prev, socialBarScriptUrl: e.target.value }))}
                  placeholder="//pl25091823.topcreativeformat.com/.../inv.js"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>
          </div>

          {/* Active Placements Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              {language === 'ar' ? 'أماكن الظهور النشطة في النظام' : 'Active Ad Placements'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'dashboardTop' as const, label: language === 'ar' ? 'أعلى لوحة التحكم (728x90)' : 'Top of Dashboard (728x90)' },
                { key: 'dashboardSidebar' as const, label: language === 'ar' ? 'القائمة الجانبية (300x250)' : 'Sidebar & Widgets (300x250)' },
                { key: 'reportsTop' as const, label: language === 'ar' ? 'صفحة التقارير والتحليلات' : 'Reports & Analytics Banner' },
                { key: 'socialBar' as const, label: language === 'ar' ? 'إشعار السوشيال بار العائم' : 'Floating Social Bar Unit' }
              ].map(p => (
                <label
                  key={p.key}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.placements?.[p.key] ?? true}
                    onChange={e => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        placements: {
                          ...(prev.placements || {
                            dashboardTop: true,
                            dashboardSidebar: true,
                            reportsTop: true,
                            fleetMapBanner: false,
                            socialBar: true
                          }),
                          [p.key]: checked
                        }
                      }));
                    }}
                    className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-slate-800">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Google AdMob & AdSense Authorized Digital Sellers (ads.txt & app-ads.txt) Verification */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-xs">
                  G
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>{language === 'ar' ? 'معرف تطبيق جوجل آدموب (Google AdMob App ID)' : 'Google AdMob & AdSense Integration'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {language === 'ar' ? 'تطبيق معتمد ومربوط' : 'Linked & Verified'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {language === 'ar'
                      ? 'معرف تطبيق AdMob الرسمي للتطبيقات المحمولة و PWA مع ملفات التحقق ads.txt و app-ads.txt النشطة.'
                      : 'Official Google AdMob Mobile App ID with verified root ads.txt & app-ads.txt authorization.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <a
                  href="/app-ads.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <span>/app-ads.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="/ads.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <span>/ads.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* AdMob App ID Field */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold mb-1">
                <span>{language === 'ar' ? 'معرف تطبيق AdMob (Application ID):' : 'Google AdMob Application ID:'}</span>
                <span className="text-[10px] font-mono text-blue-700">ca-app-pub-1036802722878553~9890117209</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-blue-200 shadow-xs">
                <span className="text-xs font-mono text-slate-900 select-all flex-1 dir-ltr font-bold">
                  {formData.admobAppId || 'ca-app-pub-1036802722878553~9890117209'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.admobAppId || 'ca-app-pub-1036802722878553~9890117209', 'admob-app-id')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedField === 'admob-app-id' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'ar' ? 'نسخ معرف التطبيق' : 'Copy App ID'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AdMob Ad Unit ID Field */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold mb-1">
                <div className="flex items-center gap-1.5">
                  <span>{language === 'ar' ? 'معرف الوحدة الإعلانية (Ad Unit ID):' : 'AdMob Ad Unit ID (Banner / Interstitial):'}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                    {language === 'ar' ? 'وحدة نشطة' : 'Active Unit'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Unit: 8632875853</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-blue-200 shadow-xs">
                <span className="text-xs font-mono text-slate-900 select-all flex-1 dir-ltr font-bold">
                  {formData.admobAdUnitId || 'ca-app-pub-1036802722878553/8632875853'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.admobAdUnitId || 'ca-app-pub-1036802722878553/8632875853', 'admob-ad-unit-id')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedField === 'admob-ad-unit-id' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{language === 'ar' ? 'نسخ معرف الوحدة' : 'Copy Ad Unit ID'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Ads.txt Line Field */}
            <div>
              <div className="text-[11px] text-slate-700 font-semibold mb-1">
                <span>{language === 'ar' ? 'سطر تفويض البائع الرقمي (Authorized Digital Seller Record):' : 'Authorized Digital Seller Record (ads.txt / app-ads.txt):'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-200/80 shadow-xs">
                <span className="text-[11px] font-mono text-slate-700 select-all flex-1 dir-ltr">
                  google.com, pub-1036802722878553, DIRECT, f08c47fec0942fa0
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('google.com, pub-1036802722878553, DIRECT, f08c47fec0942fa0', 'ads-txt-record')}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedField === 'ads-txt-record' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>{language === 'ar' ? 'نسخ السطر' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Metadata badges & Mobile snippet info */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1 border-t border-blue-200/60">
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-300 font-mono text-blue-900 font-semibold flex items-center gap-1.5">
                <span>Package: <strong>com.khyber.logistics</strong></span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('com.khyber.logistics', 'pkg-name')}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer text-[10px] font-sans font-bold underline"
                >
                  {copiedField === 'pkg-name' ? 'Copied' : 'Copy'}
                </button>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                Publisher: <strong className="text-slate-900">pub-1036802722878553</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                App Code: <strong className="text-slate-900">9890117209</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                Android: <code className="text-slate-800">com.khyber.logistics</code>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                iOS Bundle ID: <code className="text-slate-800">com.khyber.logistics</code>
              </span>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <Info className="w-4 h-4 text-emerald-700" />
              <span>{language === 'ar' ? 'كيف تعمل الروابط الذكية في خيبر؟' : 'How Smartlinks monetize your fleet:'}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed text-[11px]">
              <li>
                <strong>Smartlink_1 (30540142)</strong>: {language === 'ar' ? 'يتم فتحه عند النقر على إعلان أعلى لوحة التحكم' : 'Triggers from Dashboard Top Leaderboard'}
              </li>
              <li>
                <strong>Smartlink_2 (30540365)</strong>: {language === 'ar' ? 'يتم فتحه عند النقر على إعلانات الشريط الجانبي' : 'Triggers from Sidebar & Widget cards'}
              </li>
              <li>
                <strong>Smartlink_3 (30657127)</strong>: {language === 'ar' ? 'يتم فتحه عند النقر على إشعار السوشيال بار العائم' : 'Triggers from the Floating Social Bar unit'}
              </li>
              <li>
                <strong>Smartlink_4 (31301807)</strong>: {language === 'ar' ? 'يتم فتحه عند النقر على إعلان صفحة التقارير والمحاسبة' : 'Triggers from Financial & Fleet Reports view'}
              </li>
            </ul>
          </div>

          {/* Actions Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDemo}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استعادة الإعدادات الافتراضية' : 'Reset to Default'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdsterraModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{language === 'ar' ? 'تم الحفظ وتحديث الإعلانات!' : 'Saved & Running!'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حفظ وتفعيل الروابط الذكية' : 'Save & Activate Smartlinks'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
