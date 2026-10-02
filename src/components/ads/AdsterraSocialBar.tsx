import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ExternalLink, BellRing, Settings2 } from 'lucide-react';
import { useAdsterra } from '../../context/AdsterraContext';
import { useLanguage } from '../../context/LanguageContext';

export const AdsterraSocialBar: React.FC = () => {
  const { config, shouldShowAds, trackEvent, setIsAdsterraModalOpen } = useAdsterra();
  const { language, dir } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const isEnabled = shouldShowAds('socialBar');

  // Trigger social bar after a short natural delay
  useEffect(() => {
    if (isEnabled && !hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShown(true);
        trackEvent('impression', 'social_bar_zone');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isEnabled, hasShown, trackEvent]);

  // Inject external Adsterra Social Bar script if configured
  useEffect(() => {
    if (isEnabled && config?.socialBarScriptUrl && !config.testMode) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = config.socialBarScriptUrl;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isEnabled, config?.socialBarScriptUrl, config?.testMode]);

  if (!isEnabled) return null;

  // Resolve social bar smartlink (prefers Smartlink_3 / 30657127 / assignedPlacement: 'socialBar')
  const getSocialSmartlink = () => {
    if (!config?.smartlinks || config.smartlinks.length === 0) return null;
    const activeLinks = config.smartlinks.filter(s => s.active !== false);
    if (activeLinks.length === 0) return null;
    const matched = activeLinks.find(s => s.assignedPlacement === 'socialBar' || s.placementId === '30657127');
    return matched || activeLinks[0];
  };

  const socialSmartlink = getSocialSmartlink();

  const handleClick = () => {
    trackEvent('click', 'social_bar_zone', socialSmartlink?.placementId);
    const targetUrl = socialSmartlink?.url || config?.directLinkUrl || 'https://www.profitableratecpmnetwork.com/bypi27ikj?key=ec6a4a8f69cba510c8d38b835c8b0378';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed bottom-5 z-40 max-w-sm w-[92vw] sm:w-96 shadow-2xl rounded-2xl bg-white border border-slate-200/90 overflow-hidden ${
            dir === 'rtl' ? 'left-5' : 'right-5'
          }`}
          dir={dir}
        >
          {/* Header pill */}
          <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-emerald-400">Adsterra Social Bar</span>
              <span className="text-slate-400 text-[9px]">• {language === 'ar' ? 'إعلان مميز' : 'Sponsored'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdsterraModalOpen(true)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Adsterra Settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Social Bar Body */}
          <div
            onClick={handleClick}
            className="p-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h5 className="text-xs font-bold text-slate-900 truncate">
                  {language === 'ar' ? 'عرض خاص لأساطيل خيبر اللوجستية' : 'Special Fleet Partner Offer'}
                </h5>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {language === 'ar'
                  ? 'وفّر حتى ۲۵٪ على إطارات الشاحنات وزيوت المحركات الثقيلة مع تركيب معتمد في الرياض وجدة والدمام.'
                  : 'Get up to 25% corporate discount on commercial tire sets and diesel fleet oils across KSA.'}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span>{language === 'ar' ? 'اطلع على العرض الآن' : 'View Details'}</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Adsterra Native</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
