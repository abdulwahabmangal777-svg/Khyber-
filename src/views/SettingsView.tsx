import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Database,
  Globe,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useAdsterra } from '../context/AdsterraContext';
import { getAuthHeaders } from '../utils/api';
import { CompanySettings } from '../types';
import { BrandLogo } from '../components/common/BrandLogo';
import { BrandReportPreview } from '../components/BrandReportPreview';

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage, hijriMode, setHijriMode, formatCurrency } = useLanguage();
  const { token, hasRole } = useAuth();
  const { config: adsterraConfig, setIsAdsterraModalOpen } = useAdsterra();
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Khyber Logistics services',
    companyNameAr: 'خدمات خيبر اللوجستية',
    crNumber: '1010748291',
    vatNumber: '310492817200003',
    logoUrl: '/khyber_luxury_logo.jpg',
    address: 'King Abdulaziz Road, Al-Murabba District, P.O. Box 48291, Riyadh 11513, Kingdom of Saudi Arabia',
    phone: '+966 11 489 7700',
    email: 'info@khyber-logistics.com.sa',
    generalManager: 'Abdul Wahab Mangal',
    fleetManager: 'Hamza Khan',
    currency: 'SAR',
    dateFormat: 'YYYY-MM-DD',
    enableHijri: true,
    alertThresholdDays: 30,
    reportTheme: 'SAUDI_GREEN'
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          companyName: data.name || data.companyName || prev.companyName,
          companyNameAr: data.nameAr || data.companyNameAr || prev.companyNameAr,
          crNumber: data.crNumber || prev.crNumber,
          vatNumber: data.vatNumber || prev.vatNumber,
          logoUrl: data.logo || data.logoUrl || prev.logoUrl,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          generalManager: data.managerName || data.generalManager || prev.generalManager,
          currency: data.currency || prev.currency,
          enableHijri: data.hijriEnabled !== undefined ? data.hijriEnabled : prev.enableHijri,
          reportTheme: data.reportTheme || prev.reportTheme || 'SAUDI_GREEN'
        }));
      }
    } catch (err) {
      console.warn('Notice: Settings fetch fallback:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      const payload = {
        ...settings,
        name: settings.companyName,
        nameAr: settings.companyNameAr,
        logo: settings.logoUrl || '/khyber_luxury_logo.jpg',
        managerName: settings.generalManager,
        hijriEnabled: settings.enableHijri,
        reportTheme: settings.reportTheme || 'SAUDI_GREEN'
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const res = await fetch('/api/backup/export', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Saudi_Fleet_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting backup:', err);
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('Are you sure you want to reset demo data back to default Saudi sample fleet?')) return;
    try {
      const res = await fetch('/api/system/reset-demo', {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        alert('Database successfully reset to standard Saudi demo fleet.');
        window.location.reload();
      }
    } catch (err) {
      console.error('Error resetting demo data:', err);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-800" />
            <span>{t.settings} & Corporate Identity</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial Registration (CR), ZATCA 15-Digit VAT #, Hijri Calendar & System Backups
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Card 1: Saudi Corporate Identity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-800" />
              <span>1. Saudi Commercial Registration & ZATCA Tax Identity</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Corporate Logo Status:</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Vector Emblem
              </span>
            </div>
          </div>

          {/* Luxurious Logo Showcase Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border border-amber-500/40 rounded-2xl shadow-md text-white">
            <div className="p-1 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-200 to-amber-600 shadow-lg shrink-0">
              <BrandLogo size="xl" showText={false} variant="luxury" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white tracking-wide">
                  Khyber Logistics Services • Official Corporate Crest
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs uppercase tracking-wider">
                  Verified Royal Emblem
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 font-arabic">
                الشعار الرسمي المعتمد لخدمات خيبر اللوجستية والفواتير والملفات التعريفية
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-1">
                Active on all system profiles, official tax invoices, work orders, dispatch labels, and management reports.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Company Name (English)</label>
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1 font-arabic">اسم الشركة (عربي)</label>
              <input
                type="text"
                required
                dir="rtl"
                value={settings.companyNameAr}
                onChange={e => setSettings({ ...settings, companyNameAr: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-arabic font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">10-Digit Commercial Registration (CR #)</label>
              <input
                type="text"
                required
                maxLength={10}
                value={settings.crNumber}
                onChange={e => setSettings({ ...settings, crNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">15-Digit ZATCA VAT # (الرقم الضريبي)</label>
              <input
                type="text"
                required
                maxLength={15}
                value={settings.vatNumber}
                onChange={e => setSettings({ ...settings, vatNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">General Manager Name</label>
              <input
                type="text"
                value={settings.generalManager}
                onChange={e => setSettings({ ...settings, generalManager: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fleet Operations Manager</label>
              <input
                type="text"
                value={settings.fleetManager}
                onChange={e => setSettings({ ...settings, fleetManager: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Headquarters Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Corporate Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Brand Preview: Live-updating preview of header logo, chosen theme, and company details on PDF invoice */}
        <BrandReportPreview
          companyName={settings.companyName}
          companyNameAr={settings.companyNameAr}
          crNumber={settings.crNumber}
          vatNumber={settings.vatNumber}
          address={settings.address}
          phone={settings.phone}
          email={settings.email}
          generalManager={settings.generalManager}
          selectedTheme={settings.reportTheme || 'SAUDI_GREEN'}
          onThemeChange={theme => setSettings(prev => ({ ...prev, reportTheme: theme }))}
        />

        {/* Card 3: Localization & Calendar Preference */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-800" />
            <span>3. Localization & Saudi Hijri (أم القرى) Calendar Support</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">System Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              >
                <option value="en">English (Default)</option>
                <option value="ar">العربية (Arabic - RTL)</option>
                <option value="ps">پښتو (Pashto - RTL)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Hijri Date Display (أم القرى)</label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hijriToggle"
                  checked={hijriMode}
                  onChange={e => setHijriMode(e.target.checked)}
                  className="rounded text-emerald-800 focus:ring-emerald-700"
                />
                <label htmlFor="hijriToggle" className="text-slate-800 font-bold cursor-pointer">
                  Display dates in Saudi Hijri (1446 AH)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Default Warning Threshold (Days)</label>
              <input
                type="number"
                value={settings.alertThresholdDays}
                onChange={e => setSettings({ ...settings, alertThresholdDays: parseInt(e.target.value, 10) || 30 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        {hasRole('ADMIN') && (
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Corporate Profile'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Adsterra Ad Network Monetization Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>{language === 'ar' ? 'شبكة إعلانات أدستيرا (Adsterra Monetization & Ads Engine)' : 'Adsterra Ad Network & Monetization Engine'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'إدارة تشغيل الإعلانات عبر شبكة أدستيرا، معرف الناشر، أكواد الوحدات الإعلانية (Zone Keys) وتتبع الأرباح.'
                : 'Manage Adsterra ad network run, Publisher ID, zone keys (728x90, 300x250, Social Bar), and live earnings.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              adsterraConfig?.enabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${adsterraConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{adsterraConfig?.enabled ? (language === 'ar' ? 'الإعلانات نشطة ومفعلة' : 'Adsterra Running') : (language === 'ar' ? 'متوقفة' : 'Paused')}</span>
            </span>

            <button
              type="button"
              onClick={() => setIsAdsterraModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إدارة أكواد أدستيرا' : 'Configure Adsterra'}</span>
            </button>
          </div>
        </div>

        {/* Adsterra Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-400 text-[11px] mb-0.5">{language === 'ar' ? 'معرف الناشر' : 'Publisher ID'}</div>
            <div className="font-bold text-slate-800 font-mono">{adsterraConfig?.publisherId || 'ADST-849102'}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-400 text-[11px] mb-0.5">{language === 'ar' ? 'مرات الظهور' : 'Total Impressions'}</div>
            <div className="font-bold text-slate-800 font-mono">{adsterraConfig?.stats?.impressions.toLocaleString() || '0'}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-slate-400 text-[11px] mb-0.5">{language === 'ar' ? 'النقرات المسجلة' : 'Tracked Clicks'}</div>
            <div className="font-bold text-slate-800 font-mono">{adsterraConfig?.stats?.clicks.toLocaleString() || '0'}</div>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <div className="text-emerald-800 text-[11px] mb-0.5 font-semibold">{language === 'ar' ? 'الأرباح المقدرة' : 'Est. Ad Earnings'}</div>
            <div className="font-bold text-emerald-800 font-mono">{formatCurrency(adsterraConfig?.stats?.estimatedRevenueSar || 0)}</div>
          </div>
        </div>

        {/* Ads.txt & Google AdMob Live Verification Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-800">Google AdMob:</span>
              <span className="text-[11px] text-slate-500">Package:</span>
              <code className="text-[11px] font-mono text-purple-900 font-semibold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                com.khyber.logistics
              </code>
              <span className="text-[11px] text-slate-500">App ID:</span>
              <code className="text-[11px] font-mono text-blue-800 font-semibold bg-white px-2 py-0.5 rounded-md border border-blue-200">
                ca-app-pub-1036802722878553~9890117209
              </code>
              <span className="text-[11px] text-slate-500">Ad Unit ID:</span>
              <code className="text-[11px] font-mono text-emerald-800 font-semibold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                ca-app-pub-1036802722878553/8632875853
              </code>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/app-ads.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px] shrink-0"
              >
                <span>/app-ads.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="/ads.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px] shrink-0"
              >
                <span>/ads.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-700">Authorized Seller:</span>
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-700">
              google.com, pub-1036802722878553, DIRECT, f08c47fec0942fa0
            </code>
          </div>
        </div>
      </div>

      {/* Card 4: Database Backup & Maintenance Tools */}
      {hasRole('ADMIN') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-800" />
            <span>4. Database Backup & Disaster Recovery</span>
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={handleBackupDatabase}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Database Backup (.JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-red-50 text-red-900 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <RefreshCcw className="w-4 h-4 text-red-600" />
              <span>Reset to Default Saudi Demo Fleet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
