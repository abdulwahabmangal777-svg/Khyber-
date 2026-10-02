import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, TranslationDict } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  t: TranslationDict;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  formatDaysRemainingText: (days: number) => string;
  hijriEnabled: boolean;
  hijriMode: boolean;
  setHijriMode: (enabled: boolean) => void;
  toggleHijri: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('fleet_app_lang');
    return (saved === 'ar' || saved === 'ps' || saved === 'en') ? saved : 'en';
  });

  const [hijriEnabled, setHijriEnabled] = useState<boolean>(() => {
    return localStorage.getItem('fleet_hijri_enabled') === 'true';
  });

  const dir: 'ltr' | 'rtl' = (language === 'ar' || language === 'ps') ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('fleet_app_lang', language);
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleHijri = () => {
    setHijriEnabled(prev => {
      const next = !prev;
      localStorage.setItem('fleet_hijri_enabled', String(next));
      return next;
    });
  };

  const formatCurrency = (amount: number): string => {
    try {
      const loc = language === 'ar' ? 'ar-SA' : 'en-US';
      const formatted = (amount || 0).toLocaleString(loc);
      const symbol = language === 'ar' ? 'ر.س' : (language === 'ps' ? 'ريال' : 'SAR');
      return `${formatted} ${symbol}`;
    } catch {
      return `${amount || 0} SAR`;
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      if (hijriEnabled) {
        // Format with Saudi Islamic Hijri calendar
        try {
          const hijriLocale = language === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura';
          const hijriFormatter = new Intl.DateTimeFormat(hijriLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          return `${dateStr} (${hijriFormatter.format(date)} H)`;
        } catch {
          // Fallback if islamic calendar locale unsupported
        }
      }

      try {
        const standardLocale = language === 'ar' ? 'ar-SA' : (language === 'ps' ? 'ps' : 'en-GB');
        return date.toLocaleDateString(standardLocale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return date.toISOString().slice(0, 10);
      }
    } catch {
      return dateStr;
    }
  };

  const formatDaysRemainingText = (days: number): string => {
    if (days < 0) {
      const absDays = Math.abs(days);
      if (language === 'ar') return `منتهي منذ ${absDays} يوم`;
      if (language === 'ps') return `${absDays} ورځې مخکې ختم شوی`;
      return `Expired ${absDays} days ago`;
    }
    if (days === 0) {
      if (language === 'ar') return 'ينتهي اليوم!';
      if (language === 'ps') return 'نن ختمیږي!';
      return 'Expires Today!';
    }
    if (language === 'ar') return `متبقي ${days} يوم`;
    if (language === 'ps') return `${days} ورځې پاتې دي`;
    return `${days} days remaining`;
  };

  const setHijriMode = (enabled: boolean) => {
    setHijriEnabled(enabled);
    localStorage.setItem('fleet_hijri_enabled', String(enabled));
  };

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        t,
        formatCurrency,
        formatDate,
        formatDaysRemainingText,
        hijriEnabled,
        hijriMode: hijriEnabled,
        setHijriMode,
        toggleHijri
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
