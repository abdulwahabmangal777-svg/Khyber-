import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  FileText,
  Clock,
  Printer,
  X,
  Calendar,
  Building2,
  Sparkles,
  RefreshCw,
  Plus,
  ExternalLink,
  ChevronRight,
  Info,
  BadgePercent,
  CheckCircle2,
  Download,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useAdsterra } from '../context/AdsterraContext';
import { safeFetch, getAuthHeaders } from '../utils/api';
import {
  SubscriptionState,
  SubscriptionPlan,
  SubscriptionAddon,
  BillingInvoice,
  PlanTier,
  BillingCycle,
  PaymentMethodType
} from '../types';

export const BillingView: React.FC = () => {
  const { language, dir, formatCurrency, formatDate } = useLanguage();
  const { user, hasRole } = useAuth();
  const { config: adsterraConfig, setIsAdsterraModalOpen } = useAdsterra();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  // Selected Billing Cycle for Plan switcher
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('MADA');
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);
  const [upgradeSuccessMessage, setUpgradeSuccessMessage] = useState<string | null>(null);

  // Selected Invoice for ZATCA Modal
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);

  // Add-on toggle loading states
  const [togglingAddonId, setTogglingAddonId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingOverview();
  }, []);

  const fetchBillingOverview = async () => {
    try {
      setLoading(true);
      const res = await safeFetch('/api/billing/overview', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubscription(data.subscription);
          setPlans(data.plans || []);
          setAddons(data.addons || []);
          setInvoices(data.invoices || []);
          if (data.subscription?.billingCycle) {
            setBillingCycle(data.subscription.billingCycle);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load billing overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpgradeModal = (plan: SubscriptionPlan) => {
    setTargetPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!targetPlan) return;
    try {
      setIsProcessingUpgrade(true);
      const res = await safeFetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: targetPlan.id,
          billingCycle,
          paymentMethod: selectedPaymentMethod
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubscription(data.subscription);
        if (data.newInvoice) {
          setInvoices(prev => [data.newInvoice, ...prev]);
        }
        setUpgradeSuccessMessage(
          language === 'ar'
            ? `تم ترقية وتفعيل باقة ${targetPlan.nameAr} بنجاح!`
            : (language === 'ps' ? `د ${targetPlan.namePs} پلان په بریالیتوب سره فعال شو!` : `Successfully upgraded to ${targetPlan.nameEn}!`)
        );
        setTimeout(() => {
          setIsUpgradeModalOpen(false);
          setUpgradeSuccessMessage(null);
        }, 2000);
      } else {
        alert(data.error || 'Failed to update plan');
      }
    } catch (err: any) {
      alert(err?.message || 'Error communicating with billing server');
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  const handleToggleAddon = async (addon: SubscriptionAddon) => {
    if (!subscription) return;
    const isCurrentlyActive = subscription.activeAddons.includes(addon.id);
    const newStatus = !isCurrentlyActive;

    try {
      setTogglingAddonId(addon.id);
      const res = await safeFetch('/api/billing/addons/toggle', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addonId: addon.id,
          enabled: newStatus
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubscription(data.subscription);
      } else {
        alert(data.error || 'Failed to toggle add-on');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating add-on');
    } finally {
      setTogglingAddonId(null);
    }
  };

  const currentPlan = plans.find(p => p.id === subscription?.planId) || plans[1];

  const calculateTargetPrice = (plan: SubscriptionPlan) => {
    const base = billingCycle === 'YEARLY' ? plan.yearlyPriceSar : plan.monthlyPriceSar;
    return base;
  };

  return (
    <div className="space-y-8 pb-16" dir={dir}>
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -z-10 pointer-events-none opacity-60" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {language === 'ar' ? 'الاشتراك نشط ومعتمد' : (language === 'ps' ? 'فعال او تایید شوی ګډون' : 'Active ZATCA Verified')}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {subscription?.billingCycle === 'YEARLY'
                  ? (language === 'ar' ? 'فوترة سنوية' : (language === 'ps' ? 'کلنۍ بیلینګ' : 'Annual Billing'))
                  : (language === 'ar' ? 'فوترة شهرية' : (language === 'ps' ? 'میاشتنۍ بیلینګ' : 'Monthly Billing'))}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'إدارة الاشتراك والفوترة والخدمات' : (language === 'ps' ? 'د ګډون، فکتورونو او پلانونو مدیریت' : 'Subscription Plans & ZATCA Billing')}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
              {language === 'ar'
                ? 'إدارة باقات الأسطول، الخدمات الإضافية الذكية، وسائل الدفع المعتمدة (مدى، سداد، فيزا)، والفواتير الضريبية المبسطة المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).'
                : (language === 'ps'
                  ? 'د بیړۍ پلانونو تنظیم، د تادیاتو طریقې (Mada، Sadad)، او د زکات او عایداتو ادارې (ZATCA) لخوا تایید شوي مالیاتي فکتورونه.'
                  : 'Manage fleet capacity tiers, AI telematics add-ons, Saudi payment rails (Mada, Sadad, Apple Pay), and official ZATCA Phase-2 tax invoices.')}
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? 'الخطة الحالية' : (language === 'ps' ? 'اوسنی پلان' : 'Current Tier')}
              </div>
              <div className="text-base font-bold text-slate-900">
                {language === 'ar' ? currentPlan?.nameAr : (language === 'ps' ? currentPlan?.namePs : currentPlan?.nameEn)}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                {formatCurrency(currentPlan?.monthlyPriceSar || 0)} / {language === 'ar' ? 'شهر' : 'mo'}
              </div>
            </div>
          </div>
        </div>

        {/* Capacity & Usage Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          {/* Vehicle Capacity Meter */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium text-slate-700">
                {language === 'ar' ? 'استيعاب المركبات التجارية' : (language === 'ps' ? 'د فعالو موټرو ظرفیت' : 'Vehicle Fleet Quota')}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {subscription?.vehicleUsage.current || 0} / {subscription?.vehicleUsage.limit === -1 ? '∞' : subscription?.vehicleUsage.limit} {language === 'ar' ? 'مركبة' : 'Vehicles'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    subscription?.vehicleUsage.limit === -1
                      ? 15
                      : Math.round(((subscription?.vehicleUsage.current || 0) / (subscription?.vehicleUsage.limit || 50)) * 100)
                  )}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {subscription?.vehicleUsage.limit === -1
                ? (language === 'ar' ? 'عدد غير محدود من المركبات مشمول في خطة المؤسسات.' : 'Unlimited vehicles included in Enterprise Plan.')
                : (language === 'ar' ? `متبقي ${(subscription?.vehicleUsage.limit || 50) - (subscription?.vehicleUsage.current || 0)} مركبة شاغرة في باقتك الحالية.` : `${(subscription?.vehicleUsage.limit || 50) - (subscription?.vehicleUsage.current || 0)} vehicle slots available in your active plan.`)}
            </p>
          </div>

          {/* Workforce / Drivers Capacity Meter */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium text-slate-700">
                {language === 'ar' ? 'استيعاب السائقين والكوادر' : (language === 'ps' ? 'د کارکوونکو او ډرایورانو شمېر' : 'Workforce & Driver Quota')}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {subscription?.workerUsage.current || 0} / {subscription?.workerUsage.limit === -1 ? '∞' : subscription?.workerUsage.limit} {language === 'ar' ? 'موظف' : 'Staff'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    subscription?.workerUsage.limit === -1
                      ? 10
                      : Math.round(((subscription?.workerUsage.current || 0) / (subscription?.workerUsage.limit || 75)) * 100)
                  )}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {subscription?.workerUsage.limit === -1
                ? (language === 'ar' ? 'عدد غير محدود من السائقين مشمول في خطة المؤسسات.' : 'Unlimited drivers included in Enterprise Plan.')
                : (language === 'ar' ? `متبقي ${(subscription?.workerUsage.limit || 75) - (subscription?.workerUsage.current || 0)} مقعداً شاغراً للسائقين والمشرفين.` : `${(subscription?.workerUsage.limit || 75) - (subscription?.workerUsage.current || 0)} seats available for active drivers & dispatchers.`)}
            </p>
          </div>
        </div>
      </div>

      {/* Adsterra Monetization & Ad Network Callout Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/90 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-6 h-6 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {language === 'ar' ? 'شبكة إعلانات أدستيرا (Adsterra Monetization)' : 'Adsterra Ad Network Monetization'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {adsterraConfig?.enabled ? (language === 'ar' ? 'مفعلة ونشطة' : 'Active & Running') : (language === 'ar' ? 'متوقفة' : 'Paused')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
              {language === 'ar'
                ? 'تحقيق الدخل الإضافي عبر إعلانات أدستيرا (Leaderboard 728x90، Medium Rectangle، و Social Bar) مع دعم مفاتيح المناطق (Zone Keys).'
                : 'Monetize free & starter fleet users with Adsterra banner formats & Social Bar while keeping enterprise accounts ad-free.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setIsAdsterraModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'إدارة تشغيل أدستيرا' : 'Manage Adsterra Run'}</span>
          </button>
        </div>
      </div>

      {/* Plans Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'خطط وباقات الاشتراك المتاحة' : (language === 'ps' ? 'د ګډون موجود پلانونه' : 'Available Subscription Tiers')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'اختر الخطة المناسبة لحجم أسطولك التجاري. يمكنك الترقية أو التبديل في أي وقت.'
                : 'Select the optimal plan for your commercial operations. Upgrade or switch at any time.'}
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'شهري' : (language === 'ps' ? 'میاشتنی' : 'Monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                billingCycle === 'YEARLY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{language === 'ar' ? 'سنوي' : (language === 'ps' ? 'کلنی' : 'Annual')}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${billingCycle === 'YEARLY' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {language === 'ar' ? 'وفر ۱۷٪' : 'Save 17%'}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = subscription?.planId === plan.id;
            const price = billingCycle === 'YEARLY' ? plan.yearlyPriceSar : plan.monthlyPriceSar;
            const displayPeriod = billingCycle === 'YEARLY'
              ? (language === 'ar' ? '/ سنة' : (language === 'ps' ? '/ کال' : '/ yr'))
              : (language === 'ar' ? '/ شهر' : (language === 'ps' ? '/ میاشت' : '/ mo'));

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${
                  plan.isPopular
                    ? 'bg-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/10'
                    : 'bg-white border border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                    {language === 'ar' ? 'الأكثر اختياراً' : (language === 'ps' ? 'تر ټولو مشهور' : 'Most Popular')}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {language === 'ar' ? plan.nameAr : (language === 'ps' ? plan.namePs : plan.nameEn)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {language === 'ar' ? plan.descriptionAr : (language === 'ps' ? plan.descriptionPs : plan.descriptionEn)}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="my-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {displayPeriod}
                      </span>
                    </div>
                    {billingCycle === 'YEARLY' && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        {language === 'ar' ? 'يشمل شهرين مجاناً عند الدفع السنوي' : 'Includes 2 months free with annual payment'}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'ar' ? '+ ضريبة القيمة المضافة ۱۵٪ (VAT)' : '+ 15% Saudi VAT (ZATCA compliant)'}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {language === 'ar' ? 'المزايا المشمولة:' : 'Included Features:'}
                    </div>
                    <ul className="space-y-2.5 text-xs">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {feat.included ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <span className={feat.included ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
                            {language === 'ar' ? feat.textAr : (language === 'ps' ? feat.textPs : feat.textEn)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-4 border-t border-slate-100">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {language === 'ar' ? 'خطتك الحالية المفعلة' : (language === 'ps' ? 'ستاسو اوسنی فعال پلان' : 'Your Current Active Plan')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenUpgradeModal(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 ${
                        plan.isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>
                        {language === 'ar' ? `ترقية إلى ${plan.nameAr}` : `Switch to ${plan.nameEn}`}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise & Telematics Add-ons Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'ar' ? 'الخدمات الإضافية والترقيات المعيارية' : (language === 'ps' ? 'اضافي خدمتونه او ځانګړتیاوې' : 'Enterprise Modules & Telematics Add-ons')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {language === 'ar'
              ? 'قم بتفعيل ميزات إضافية لدعم أسطولك بأحدث أجهزة التتبع وشرائح البيانات M2M، أو الربط المباشر مع منصة وصل وهيئة النقل العام.'
              : 'Empower your fleet with M2M hardware SIMs, Gemini voice packs, or direct TGA Wasl regulatory compliance.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addons.map(addon => {
            const isActive = subscription?.activeAddons.includes(addon.id) || false;
            const isToggling = togglingAddonId === addon.id;
            const price = billingCycle === 'YEARLY' ? addon.pricePerYearSar : addon.pricePerMonthSar;
            const unit = addon.billingType === 'PER_VEHICLE'
              ? (language === 'ar' ? '/ مركبة / شهر' : '/ vehicle / mo')
              : (language === 'ar' ? '/ شهر' : '/ mo');

            return (
              <div
                key={addon.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {language === 'ar' ? addon.nameAr : (language === 'ps' ? addon.namePs : addon.nameEn)}
                        </h4>
                        {addon.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {addon.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {language === 'ar' ? addon.descriptionAr : (language === 'ps' ? addon.descriptionPs : addon.descriptionEn)}
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleAddon(addon)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isActive ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      aria-label="Toggle add-on"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isActive ? (dir === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-900">
                    {formatCurrency(price)} <span className="text-slate-400 font-normal">{unit}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isActive
                      ? (language === 'ar' ? 'مفعل في الفاتورة' : 'Active on Subscription')
                      : (language === 'ar' ? 'غير مفعل' : 'Inactive')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Rails & Payment Methods Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {language === 'ar' ? 'طرق الدفع وقنوات السداد المعتمدة بالمملكة' : (language === 'ps' ? 'د تادیاتو رسمي طریقې او حسابونه' : 'Accepted Saudi Payment Rails')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'الدفع الإلكتروني المباشر عبر شبكة مدى الوطنية، نظام سداد للمدفوعات، فيزا وماستركارد، وأبل باي.'
                : 'Direct digital billing via Mada National Network, Sadad Biller, Apple Pay, and Corporate Wire Transfer.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Mada مدى
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Sadad سداد
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Apple Pay
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Visa / MC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Card / Mada Method */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-4">
            <div className="w-12 h-8 rounded-md bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              mada
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {subscription?.paymentMethod.cardBrand || 'Mada Debit Card'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    •••• •••• •••• {subscription?.paymentMethod.lastFour || '4821'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {language === 'ar' ? 'الافتراضية' : 'Default'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {language === 'ar' ? 'تاريخ الانتهاء:' : 'Expires:'} {subscription?.paymentMethod.expiry || '09/28'}
              </p>
            </div>
          </div>

          {/* Sadad Biller Account */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-4">
            <div className="w-12 h-8 rounded-md bg-indigo-900 text-white flex items-center justify-center font-bold text-[10px] shadow-xs tracking-tight">
              SADAD
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {language === 'ar' ? 'نظام سداد الإلكتروني (SADAD)' : 'Sadad Electronic Biller'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {language === 'ar' ? 'رمز المفوتر:' : 'Biller Code:'} <strong className="text-slate-900">144 (Khyber Logistics)</strong>
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                  {language === 'ar' ? 'سداد فوري' : 'Instant Sadad'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {language === 'ar' ? 'رقم حساب السداد المخصص:' : 'Biller Account #:'} <span className="font-mono font-bold text-slate-800">{subscription?.sadadBillNumber || '820491823'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Official ZATCA Tax Invoices Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'ar' ? 'الفواتير الضريبية المعتمدة (ZATCA)' : (language === 'ps' ? 'رسمي مالیاتي فکتورونه' : 'ZATCA Tax Invoices & Receipts')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {language === 'ar'
                ? 'فواتير ضريبية مبسطة معتمدة تشمل رمز الاستجابة السريعة (QR Code) المتوافق مع المرحلة الثانية لهيئة الزكاة والضريبة والجمارك.'
                : 'ZATCA Phase-2 certified simplified tax invoices with cryptographic QR codes and VAT breakdowns.'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBillingOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تحديث الفواتير' : 'Refresh'}</span>
          </button>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-y border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'الباقة والوصف' : 'Description'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'المبلغ الأساسي' : 'Subtotal'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'الضريبة ۱۵٪' : 'VAT (15%)'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'الإجمالي' : 'Total (SAR)'}</th>
                <th className="py-3 px-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {language === 'ar' ? 'لا توجد فواتير سابقة حتى الآن.' : 'No invoices found.'}
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {inv.planName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {formatCurrency(inv.subtotalSar)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatCurrency(inv.vatAmountSar)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-800">
                      {formatCurrency(inv.totalSar)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3 text-emerald-600" />
                        {language === 'ar' ? 'مدفوعة ومعتمدة' : 'Paid & Verified'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'عرض الفاتورة الضريبية' : 'View Tax Invoice'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade / Switch Plan Modal */}
      <AnimatePresence>
        {isUpgradeModalOpen && targetPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden"
              dir={dir}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {language === 'ar' ? 'ترقية وتفعيل خطة الاشتراك' : 'Confirm Plan Upgrade'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === 'ar' ? 'تفعيل فوري مع إصدار فاتورة ضريبية معتمدة' : 'Instant activation with official ZATCA tax invoice'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {upgradeSuccessMessage ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    <p className="font-bold text-sm">{upgradeSuccessMessage}</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'الخطة المختارة:' : 'Selected Plan:'}</span>
                        <span className="font-bold text-slate-900">
                          {language === 'ar' ? targetPlan.nameAr : targetPlan.nameEn}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'دورة الفوترة:' : 'Billing Cycle:'}</span>
                        <span className="font-semibold text-slate-700">
                          {billingCycle === 'YEARLY'
                            ? (language === 'ar' ? 'سنوية (خصم ۱۷٪)' : 'Annual (17% Discount)')
                            : (language === 'ar' ? 'شهرية' : 'Monthly')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'المبلغ الأساسي:' : 'Base Subtotal:'}</span>
                        <span className="font-mono text-slate-800">{formatCurrency(calculateTargetPrice(targetPlan))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === 'ar' ? 'ضريبة القيمة المضافة (۱۵٪):' : 'VAT (15%):'}</span>
                        <span className="font-mono text-slate-800">
                          {formatCurrency(calculateTargetPrice(targetPlan) * 0.15)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                        <span className="text-slate-900">{language === 'ar' ? 'الإجمالي المستحق:' : 'Total Due (SAR):'}</span>
                        <span className="text-emerald-700 font-mono">
                          {formatCurrency(calculateTargetPrice(targetPlan) * 1.15)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        {language === 'ar' ? 'طريقة الدفع المعتمدة:' : 'Payment Method:'}
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { id: 'MADA' as PaymentMethodType, label: 'بطاقة مدى (Mada)' },
                          { id: 'APPLE_PAY' as PaymentMethodType, label: 'Apple Pay' },
                          { id: 'VISA_MASTER' as PaymentMethodType, label: 'Visa / Mastercard' },
                          { id: 'SADAD' as PaymentMethodType, label: 'نظام سداد (Sadad)' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(m.id)}
                            className={`p-3 rounded-xl border text-left font-medium transition-all ${
                              selectedPaymentMethod === m.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!upgradeSuccessMessage && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingUpgrade}
                    onClick={handleConfirmUpgrade}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-2"
                  >
                    {isProcessingUpgrade ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'ar' ? 'جاري التفعيل والإصدار...' : 'Processing...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{language === 'ar' ? 'تأكيد السداد والترقية الفورية' : 'Confirm & Activate Plan'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Saudi ZATCA Tax Invoice Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
              dir={dir}
            >
              {/* Modal Top Actions */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold tracking-wide">
                    {language === 'ar' ? 'فاتورة ضريبية مبسطة (معتمدة ZATCA)' : 'ZATCA Simplified Tax Invoice'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Body */}
              <div className="p-6 md:p-8 space-y-6 text-slate-800 text-xs">
                {/* Header: Company Profile & QR Code */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedInvoice.customerName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'ar' ? 'المملكة العربية السعودية - الرياض' : 'Riyadh, Kingdom of Saudi Arabia'}
                    </p>
                    <div className="mt-3 space-y-1 text-slate-600 font-mono text-[11px]">
                      <div>
                        <strong>{language === 'ar' ? 'الرقم الضريبي (VAT):' : 'VAT ID:'}</strong> {selectedInvoice.customerVat}
                      </div>
                      <div>
                        <strong>{language === 'ar' ? 'السجل التجاري (CR):' : 'CR #:'}</strong> {selectedInvoice.customerCr}
                      </div>
                    </div>
                  </div>

                  {/* Official ZATCA Phase 2 QR Code */}
                  <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                    <QRCodeSVG
                      value={selectedInvoice.zatcaQrCodeData}
                      size={110}
                      level="M"
                      includeMargin={false}
                    />
                    <span className="text-[9px] font-mono text-slate-500 mt-1.5 text-center">
                      ZATCA E-Invoicing Phase 2
                    </span>
                  </div>
                </div>

                {/* Invoice Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</span>
                    <p className="font-bold text-slate-900">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</span>
                    <p className="font-medium text-slate-800">{formatDate(selectedInvoice.issueDate)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{language === 'ar' ? 'طريقة السداد' : 'Payment Method'}</span>
                    <p className="font-bold text-emerald-800">{selectedInvoice.paymentMethod}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{language === 'ar' ? 'المرجع البنكي' : 'Reference'}</span>
                    <p className="font-medium text-slate-700">{selectedInvoice.paymentReference || 'N/A'}</p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{language === 'ar' ? 'البند / الخدمة' : 'Item Description'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'ar' ? 'الإجمالي (SAR)' : 'Total (SAR)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {language === 'ar' && item.descriptionAr ? item.descriptionAr : item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{item.qty}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPriceSar)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalSar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">{language === 'ar' ? 'المجموع الخاضع للضريبة:' : 'Subtotal (Excl. VAT):'}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(selectedInvoice.subtotalSar)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">{language === 'ar' ? 'ضريبة القيمة المضافة (۱۵٪):' : 'VAT Amount (15%):'}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(selectedInvoice.vatAmountSar)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm font-bold text-emerald-800 border-t border-slate-300">
                      <span>{language === 'ar' ? 'الإجمالي الكلي شامل الضريبة:' : 'Total Amount (Incl. VAT):'}</span>
                      <span>{formatCurrency(selectedInvoice.totalSar)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Legal Note */}
                <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
                  {language === 'ar'
                    ? 'فاتورة إلكترونية صادرة وموثقة بموجب أحكام لائحة الفوترة الإلكترونية الصادرة عن هيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية.'
                    : 'Electronic tax invoice generated and authenticated in accordance with the ZATCA E-Invoicing Regulations in the Kingdom of Saudi Arabia.'}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
