import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, Settings2, ShieldCheck, Zap, Info } from 'lucide-react';
import { useAdsterra } from '../../context/AdsterraContext';
import { useLanguage } from '../../context/LanguageContext';
import { AdsterraBannerFormat, AdsterraPlacements } from '../../types';

interface AdsterraBannerProps {
  format: AdsterraBannerFormat;
  placement?: keyof AdsterraPlacements;
  className?: string;
  showBadge?: boolean;
}

export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({
  format,
  placement,
  className = '',
  showBadge = true
}) => {
  const { config, shouldShowAds, trackEvent, setIsAdsterraModalOpen } = useAdsterra();
  const { language } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [hasRecordedImpression, setHasRecordedImpression] = useState(false);
  const [adError, setAdError] = useState(false);

  // Dimensions based on Adsterra banner standards
  const dimensions = {
    '728x90': { width: 728, height: 90, name: 'Leaderboard' },
    '300x250': { width: 300, height: 250, name: 'Medium Rectangle' },
    '468x60': { width: 468, height: 60, name: 'Classic Banner' },
    '160x600': { width: 160, height: 600, name: 'Skyscraper' },
    'responsive': { width: '100%', height: 90, name: 'Responsive Banner' }
  }[format] || { width: 728, height: 90, name: 'Banner' };

  // Determine active zone key from config
  const getZoneKey = () => {
    if (!config) return '';
    if (format === '728x90' || format === 'responsive') return config.banner728x90ZoneKey;
    if (format === '300x250') return config.banner300x250ZoneKey;
    if (format === '468x60') return config.banner468x60ZoneKey;
    return config.banner728x90ZoneKey;
  };

  const zoneKey = getZoneKey();
  const isEnabled = shouldShowAds(placement);

  // Resolve active smartlink for this banner placement
  const getActiveSmartlink = () => {
    if (!config?.smartlinks || config.smartlinks.length === 0) return null;
    const activeLinks = config.smartlinks.filter(s => s.active !== false);
    if (activeLinks.length === 0) return null;

    if (config.smartlinkRotation === 'placement-mapped') {
      if (placement) {
        const matched = activeLinks.find(s => s.assignedPlacement === placement);
        if (matched) return matched;
      }
      if (format === '300x250') {
        const sidebarLink = activeLinks.find(s => s.assignedPlacement === 'dashboardSidebar');
        if (sidebarLink) return sidebarLink;
      }
      if (format === '728x90' || format === 'responsive') {
        const topLink = activeLinks.find(s => s.assignedPlacement === 'dashboardTop');
        if (topLink) return topLink;
      }
    } else if (config.smartlinkRotation === 'random') {
      const idx = Math.floor(Math.random() * activeLinks.length);
      return activeLinks[idx];
    }
    return activeLinks[0];
  };

  const activeSmartlink = getActiveSmartlink();

  // Record impression once on mount
  useEffect(() => {
    if (isEnabled && !hasRecordedImpression) {
      trackEvent('impression', zoneKey, activeSmartlink?.placementId);
      setHasRecordedImpression(true);
    }
  }, [isEnabled, zoneKey, hasRecordedImpression, trackEvent, activeSmartlink?.placementId]);

  if (!isEnabled) {
    return null;
  }

  // Handle direct link / ad click
  const handleAdClick = () => {
    const targetUrl = activeSmartlink?.url || config?.directLinkUrl || 'https://www.profitableratecpmnetwork.com/j7wgqh59f?key=69444c91d5d13033ecdff540cfe3d66f';
    trackEvent('click', zoneKey, activeSmartlink?.placementId);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Determine if we should show live Adsterra script or interactive test creative
  const isDemoOrTest = config?.testMode || !zoneKey || zoneKey.startsWith('adst_');

  // Interactive sample campaigns for preview/test mode
  const sampleCampaigns = [
    {
      title: language === 'ar' ? 'بترومين للزيوت وحلول أساطيل النقل' : 'Petromin Fleet Care & Heavy Oils',
      desc: language === 'ar' ? 'خصومات حصرية على الصيانة الدورية وتغيير الزيوت للشاحنات وسيارات الديزل' : 'Exclusive corporate discounts on periodic diesel maintenance & Mobil lubricants',
      cta: language === 'ar' ? 'اطلب عرض الأسعار' : 'Request Quote',
      badge: 'B2B Saudi Partner',
      tag: 'Petromin Pro'
    },
    {
      title: language === 'ar' ? 'أجهزة تتبع وحلول شريحة بيانات M2M' : 'M2M GPS Trackers & 4G Fleet SIMs',
      desc: language === 'ar' ? 'ربط مباشر مع منصة وصل وهيئة النقل العام بأسعار تفضيلية' : 'Direct TGA Wasl approved telematics with STC & Mobily M2M data packages',
      cta: language === 'ar' ? 'اكتشف الباقات' : 'Explore Packages',
      badge: 'TGA Approved',
      tag: 'IoT Telematics'
    },
    {
      title: language === 'ar' ? 'شركة التعاونية للتأمين الشامل على الأساطيل' : 'Tawuniya Commercial Fleet Insurance',
      desc: language === 'ar' ? 'تغطية شاملة ضد الحوادث ومساندة على الطريق ۲۴/۷ لشركات النقل' : '24/7 Najm roadside response and heavy transport cargo coverage across KSA',
      cta: language === 'ar' ? 'احسب قسط التأمين' : 'Calculate Premium',
      badge: 'ZATCA Certified',
      tag: 'Tawuniya'
    }
  ];

  const campaign = sampleCampaigns[format === '300x250' ? 1 : 0];

  return (
    <div className={`w-full flex flex-col items-center justify-center my-3 ${className}`}>
      {/* Top micro-header */}
      {showBadge && (
        <div className="w-full max-w-4xl flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              {language === 'ar' ? 'إعلان دعائي • شبكة أدستيرا Adsterra' : 'Advertisement • Adsterra Ad Network'}
            </span>
            {config?.testMode && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                {language === 'ar' ? 'تشغيل تجريبي' : 'Test Run Active'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsAdsterraModalOpen(true)}
            className="flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer"
            title="Configure Adsterra Zone Keys"
          >
            <Settings2 className="w-3 h-3" />
            <span>{language === 'ar' ? 'إعدادات الإعلانات' : 'Ad Settings'}</span>
          </button>
        </div>
      )}

      {/* Adsterra Creative Slot Container */}
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-linear-to-r from-slate-50 via-white to-slate-50 shadow-xs transition-all hover:border-slate-300 group"
        style={{
          width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
          minHeight: `${dimensions.height}px`,
          maxWidth: '100%'
        }}
      >
        {isDemoOrTest ? (
          /* High-converting interactive demo/test creative */
          <div
            onClick={handleAdClick}
            className={`w-full h-full p-3 md:p-4 flex cursor-pointer select-none transition-all ${
              format === '300x250'
                ? 'flex-col justify-between'
                : 'flex-col md:flex-row items-start md:items-center justify-between gap-3'
            }`}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    {campaign.badge}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">{campaign.tag}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {campaign.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                  {campaign.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center mt-2 md:mt-0">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs">
                <span>{campaign.cta}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : (
          /* Live Adsterra Script / iframe integration */
          <div className="w-full flex items-center justify-center bg-white" style={{ minHeight: `${dimensions.height}px` }}>
            <iframe
              ref={iframeRef}
              title={`Adsterra Ad ${format}`}
              width={dimensions.width}
              height={dimensions.height}
              frameBorder={0}
              scrolling="no"
              className="border-0 overflow-hidden"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { margin: 0; padding: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; background: transparent; font-family: sans-serif; }
                  </style>
                </head>
                <body>
                  <script type="text/javascript">
                    atOptions = {
                      'key' : '${zoneKey}',
                      'format' : 'iframe',
                      'height' : ${dimensions.height},
                      'width' : ${typeof dimensions.width === 'number' ? dimensions.width : 728},
                      'params' : {}
                    };
                  </script>
                  <script type="text/javascript" src="//www.topcreativeformat.com/${zoneKey}/invoke.js"></script>
                </body>
                </html>
              `}
              onError={() => setAdError(true)}
            />
          </div>
        )}

        {/* Small corner tag for Adsterra branding */}
        <div className="absolute bottom-1 right-1.5 text-[9px] text-slate-400 font-mono pointer-events-none opacity-60">
          Adsterra Ads
        </div>
      </div>
    </div>
  );
};
