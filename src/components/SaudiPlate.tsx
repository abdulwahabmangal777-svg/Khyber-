import React from 'react';
import { motion } from 'motion/react';

interface SaudiPlateProps {
  plateDigits: string;
  plateLettersEn: string;
  plateDigitsAr?: string;
  plateLettersAr?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SaudiPlate: React.FC<SaudiPlateProps> = ({
  plateDigits = '',
  plateLettersEn = '',
  plateDigitsAr,
  plateLettersAr,
  size = 'md',
  className = ''
}) => {
  // Helper to fallback Arabic digits if not provided
  const getArDigits = (digits?: string) => {
    if (!digits) return '';
    const arMap = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(digits).split('').map(d => {
      const n = parseInt(d, 10);
      return isNaN(n) ? d : arMap[n];
    }).join(' ');
  };

  // Helper to fallback Arabic letters if not provided
  const getArLetters = (letters?: string) => {
    if (!letters) return '';
    const map: Record<string, string> = {
      'A': 'أ', 'B': 'ب', 'J': 'ح', 'D': 'د', 'R': 'ر',
      'S': 'س', 'X': 'ص', 'T': 'ط', 'E': 'ع', 'G': 'ق',
      'K': 'ك', 'L': 'ل', 'Z': 'م', 'N': 'ن', 'H': 'هـ',
      'U': 'و', 'V': 'ى', 'Y': 'ي'
    };
    return String(letters).toUpperCase().split('').map(c => map[c] || c).join(' ');
  };

  const formattedDigitsAr = plateDigitsAr || getArDigits(plateDigits);
  const formattedLettersAr = plateLettersAr || getArLetters(plateLettersEn);

  const sizeClasses = {
    sm: 'h-8 text-xs px-1.5 min-w-[130px]',
    md: 'h-11 text-sm px-2 min-w-[170px]',
    lg: 'h-14 text-base px-3 min-w-[210px]'
  };

  const fontDigits = size === 'lg' ? 'text-lg font-bold tracking-widest' : (size === 'sm' ? 'text-xs font-bold' : 'text-sm font-bold tracking-wider');
  const fontLetters = size === 'lg' ? 'text-base font-semibold tracking-wider' : (size === 'sm' ? 'text-[10px] font-semibold' : 'text-xs font-semibold');

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden inline-flex items-center justify-between bg-gradient-to-b from-white to-slate-50 text-slate-900 border-2 border-slate-800 rounded shadow-xs hover:shadow-md select-none font-mono group cursor-default ${sizeClasses[size]} ${className}`}
      style={{ direction: 'ltr' }}
      title={`Saudi License Plate: ${plateDigits} ${plateLettersEn} | ${formattedDigitsAr} ${formattedLettersAr}`}
    >
      {/* Subtle luxury light sweep on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform pointer-events-none" />

      {/* KSA Crest / Green Band */}
      <div className="relative z-10 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-800 text-white rounded-xs px-1 py-0.5 mr-1 h-[85%] self-center shadow-xs">
        <span className="text-[7px] font-bold uppercase tracking-tighter leading-none">KSA</span>
        <div className="w-2.5 h-0.5 bg-white/80 my-0.5"></div>
        <span className="text-[7px] font-arabic font-bold leading-none">السعودية</span>
      </div>

      {/* English Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-1 flex-1 text-center border-r border-slate-300">
        <span className={`${fontDigits} text-slate-900 leading-tight drop-shadow-xs`}>{plateDigits}</span>
        <span className={`${fontLetters} text-slate-700 uppercase leading-none mt-0.5`}>{plateLettersEn}</span>
      </div>

      {/* Arabic Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-1 flex-1 text-center font-arabic" style={{ direction: 'rtl' }}>
        <span className={`${fontDigits} text-slate-900 leading-tight drop-shadow-xs`}>{formattedDigitsAr}</span>
        <span className={`${fontLetters} text-emerald-950 font-bold leading-none mt-0.5`}>{formattedLettersAr}</span>
      </div>
    </motion.div>
  );
};
