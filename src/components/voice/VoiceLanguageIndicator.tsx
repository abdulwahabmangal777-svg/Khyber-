import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, Sparkles } from 'lucide-react';

export type VoiceLanguageCode = 'ar' | 'ps' | 'ur' | 'en';

export interface VoiceLanguageMeta {
  code: VoiceLanguageCode;
  label: string;
  nativeName: string;
  flag: string;
  country: string;
  direction: 'rtl' | 'ltr';
  badgeClass: string;
  bgGlowClass: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
}

export const VOICE_LANGUAGES: Record<VoiceLanguageCode, VoiceLanguageMeta> = {
  ar: {
    code: 'ar',
    label: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    country: 'Saudi Arabia',
    direction: 'rtl',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    bgGlowClass: 'from-emerald-500/20 to-emerald-950/40',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    accentColor: '#10b981'
  },
  ps: {
    code: 'ps',
    label: 'Pashto',
    nativeName: 'پښتو',
    flag: '🇦🇫',
    country: 'Afghanistan',
    direction: 'rtl',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    bgGlowClass: 'from-amber-500/20 to-amber-950/40',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    accentColor: '#f59e0b'
  },
  ur: {
    code: 'ur',
    label: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    country: 'Pakistan',
    direction: 'rtl',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    bgGlowClass: 'from-cyan-500/20 to-cyan-950/40',
    borderColor: 'border-cyan-500/40',
    textColor: 'text-cyan-400',
    accentColor: '#06b6d4'
  },
  en: {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    country: 'International / Fleet',
    direction: 'ltr',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bgGlowClass: 'from-blue-500/20 to-blue-950/40',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    accentColor: '#3b82f6'
  }
};

/**
 * Intelligent client-side language detector for Arabic, Pashto, Urdu, and English
 */
export function detectLanguageFromText(text: string): { lang: VoiceLanguageCode; confidence: number } {
  if (!text || !text.trim()) {
    return { lang: 'ar', confidence: 0.9 }; // Default to Arabic in Saudi Fleet context
  }

  const clean = text.trim();

  // 1. Pashto specific characters & common words
  // Pashto unique letters: ښ څ ځ ږ ڼ ډ ړ ټ ۍ ې
  const pashtoUniqueChars = /[\u069A\u0681\u0685\u0696\u06BC\u0689\u0693\u067C\u06CD\u06D0]/;
  const pashtoWords = /\b(زه|ډیزل|خرڅ|بندر|ته|بار|یو|دی|نه|او|کې|سوه|زما|وړم|ریاله|اسلامي)\b/i;

  if (pashtoUniqueChars.test(clean) || pashtoWords.test(clean)) {
    return { lang: 'ps', confidence: 0.98 };
  }

  // 2. Urdu specific characters & common words
  // Urdu unique letters: ٹ ڈ ڑ ں ے ہ ھ
  const urduUniqueChars = /[\u0679\u0688\u0691\u06BA\u06D2\u06C1\u06BE]/;
  const urduWords = /\b(میں|ہے|ہیں|اور|روپے|گاڑی|مرمت|خرچ|سے|کو|کا|کی|کے|تھا|رہا|ہوں|پر)\b/i;

  if (urduUniqueChars.test(clean) || urduWords.test(clean)) {
    return { lang: 'ur', confidence: 0.98 };
  }

  // 3. Arabic letters & words
  const arabicRegex = /[\u0600-\u06FF]/;
  const arabicWords = /\b(أنا|متجه|إلى|الرياض|جدة|الدمام|ريال|ديزل|شحنة|تحميل|نزول|محطة|تقرير|مصاريف|بضائع|الآن|صرفت)\b/i;

  if (arabicWords.test(clean)) {
    return { lang: 'ar', confidence: 0.98 };
  }

  // If general Arabic script without Pashto/Urdu markers
  if (arabicRegex.test(clean)) {
    return { lang: 'ar', confidence: 0.94 };
  }

  // 4. English / Latin alphabet
  const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
  if (latinCount > clean.length * 0.3) {
    return { lang: 'en', confidence: 0.97 };
  }

  return { lang: 'ar', confidence: 0.85 };
}

interface ActiveCallLanguageBadgeProps {
  language: VoiceLanguageCode | string;
  isLiveProcessing?: boolean;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

/**
 * Compact pill/badge giving users clear visual confirmation of detected language
 */
export const ActiveCallLanguageBadge: React.FC<ActiveCallLanguageBadgeProps> = ({
  language,
  isLiveProcessing = true,
  confidence = 0.95,
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const code = (language in VOICE_LANGUAGES ? language : 'ar') as VoiceLanguageCode;
  const meta = VOICE_LANGUAGES[code] || VOICE_LANGUAGES.ar;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2.5'
  };

  return (
    <div
      className={`inline-flex items-center rounded-xl border backdrop-blur-md shadow-sm transition-all duration-300 ${meta.badgeClass} ${sizeClasses[size]} ${className}`}
      dir="ltr"
    >
      {/* Live processing pulse dot */}
      {isLiveProcessing && (
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: meta.accentColor }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: meta.accentColor }}
          />
        </span>
      )}

      {/* Flag icon */}
      <span className={size === 'lg' ? 'text-lg' : 'text-base'}>{meta.flag}</span>

      {/* Language label & native script */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className="font-bold tracking-tight">{meta.label}</span>
        <span className="opacity-80 font-normal">({meta.nativeName})</span>
      </div>

      {showSubtitle && (
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/20 opacity-90">
          {Math.round(confidence * 100)}% Confirmed
        </span>
      )}
    </div>
  );
};

interface ActiveCallLanguageConfirmationCardProps {
  detectedLanguage: VoiceLanguageCode;
  selectedLanguage: string; // 'auto' | 'ar' | 'ps' | 'ur' | 'en'
  onSelectLanguage?: (lang: string) => void;
  isProcessing?: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

/**
 * Dedicated visual confirmation card for active voice calls showing detected language flag & label
 */
export const ActiveCallLanguageConfirmationCard: React.FC<ActiveCallLanguageConfirmationCardProps> = ({
  detectedLanguage,
  selectedLanguage,
  onSelectLanguage,
  isProcessing = true,
  title = 'Active Voice Call Language Processing',
  subtitle = 'Gemini AI is processing your live voice report in',
  compact = false
}) => {
  const meta = VOICE_LANGUAGES[detectedLanguage] || VOICE_LANGUAGES.ar;

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-r ${meta.bgGlowClass} ${meta.borderColor} p-3.5 transition-all duration-300 shadow-lg`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-black/30 text-white">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              {title}
            </span>
            <p className="text-xs text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Current Active Processing Confirmation Pill */}
        <motion.div
          key={detectedLanguage}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700 shadow-md"
        >
          <span className="text-lg">{meta.flag}</span>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>{meta.label}</span>
              <span className="text-[10px] text-slate-400 font-normal">({meta.nativeName})</span>
            </div>
            <div className="text-[9px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Active in Report
            </div>
          </div>
        </motion.div>
      </div>

      {/* Language switcher pills giving user control to lock or auto-detect */}
      {onSelectLanguage && !compact && (
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-1.5">
          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Detection Mode:</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectLanguage('auto')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedLanguage === 'auto'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Auto-Detect
            </button>

            {(Object.keys(VOICE_LANGUAGES) as VoiceLanguageCode[]).map(code => {
              const item = VOICE_LANGUAGES[code];
              const isSelected = selectedLanguage === code;
              const isCurrentlyDetected = detectedLanguage === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelectLanguage(code)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-white text-slate-950 font-bold shadow-md'
                      : isCurrentlyDetected && selectedLanguage === 'auto'
                      ? `${item.badgeClass} ring-1 ring-white/30 font-semibold`
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${item.label} (${item.nativeName})`}
                >
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
