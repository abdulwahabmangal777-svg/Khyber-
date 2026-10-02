import React from 'react';
import luxuryLogo from '../../assets/images/khyber_luxury_logo.jpg';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  textSubtitle?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'luxury' | 'gold';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  textSubtitle,
  className = '',
  variant = 'light'
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-2xl',
    '2xl': 'w-28 h-28 rounded-3xl'
  };

  const isDark = variant === 'dark';
  const isLuxury = variant === 'luxury' || variant === 'gold';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* High-Resolution Professional & Luxurious Fleet Logo Emblem */}
      <div
        className={`relative ${sizeClasses[size]} overflow-hidden shrink-0 border border-amber-500/30 shadow-md bg-white ring-2 ${
          isLuxury ? 'ring-amber-400/70 shadow-amber-900/20' : 'ring-emerald-700/20'
        } group rounded-xl transition-all duration-300 hover:shadow-lg hover:ring-amber-400`}
      >
        <img
          src={luxuryLogo}
          alt="Khyber Logistics Services Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            // Graceful fallback if image fails to load
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.classList.add('bg-gradient-to-br', 'from-[#006C35]', 'to-[#004d25]', 'text-white', 'font-black', 'flex', 'items-center', 'justify-center');
              parent.innerText = 'KL';
            }
          }}
        />
        {/* Subtle decorative gold badge accent */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 opacity-90" />
      </div>

      {showText && (
        <div className="overflow-hidden text-left rtl:text-right">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-base font-black tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              KHYBER <span className="text-[#006C35]">LOGISTICS</span>
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 shadow-2xs uppercase tracking-wider font-mono">
              KSA
            </span>
          </div>
          <span
            className={`text-[10px] block font-semibold tracking-wide uppercase truncate ${
              isDark ? 'text-emerald-300' : 'text-slate-500'
            }`}
          >
            {textSubtitle || 'Logistics Services'}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
