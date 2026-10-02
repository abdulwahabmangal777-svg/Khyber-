import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Truck,
  Users,
  FileText,
  AlertTriangle,
  Wrench,
  Fuel,
  Receipt,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  History,
  LogOut,
  X,
  Building2,
  QrCode,
  Mic,
  Navigation,
  MapPin,
  Mail,
  ListTodo,
  MessageSquare,
  Contact,
  Sparkles,
  Radio,
  Globe,
  GitFork,
  CreditCard,
  Server,
  Workflow
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './common/BrandLogo';

export type NavView =
  | 'DASHBOARD'
  | 'KHYBER_ARCHITECTURE'
  | 'AI_INTELLIGENCE'
  | 'VOICE_REPORTS'
  | 'TRIPS'
  | 'MAP'
  | 'VEHICLES'
  | 'WORKERS'
  | 'DOCUMENTS'
  | 'EXPIRY_ALERTS'
  | 'MAINTENANCE'
  | 'FUEL'
  | 'EXPENSES'
  | 'GMAIL'
  | 'GOOGLE_TASKS'
  | 'GOOGLE_CHAT'
  | 'GOOGLE_CONTACTS'
  | 'REPORTS'
  | 'ORG_STRUCTURE'
  | 'NOTIFICATIONS'
  | 'USERS'
  | 'BILLING'
  | 'SETTINGS'
  | 'AUDIT_LOGS';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isOpen: boolean;
  onClose: () => void;
  urgentAlertsCount?: number;
  unreadNotifsCount?: number;
  pendingVoiceReportsCount?: number;
  companyName?: string;
  onOpenQRScanner?: () => void;
  onOpenLiveVoice?: () => void;
  onOpenKhyberCore?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpen,
  onClose,
  urgentAlertsCount = 0,
  unreadNotifsCount = 0,
  pendingVoiceReportsCount = 0,
  companyName = 'Khyber Logistics services',
  onOpenQRScanner,
  onOpenLiveVoice,
  onOpenKhyberCore
}) => {
  const { t, language, dir } = useLanguage();
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    {
      id: 'DASHBOARD' as NavView,
      label: t.dashboard,
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER']
    },
    {
      id: 'KHYBER_ARCHITECTURE' as NavView,
      label: language === 'ar' ? 'هيكل نظام KHYBER.AI' : (language === 'ps' ? 'د KHYBER.AI بشپړ جوړښت' : 'Khyber.ai Architecture'),
      icon: Workflow,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER'],
      badge: 'Core',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold'
    },
    {
      id: 'AI_INTELLIGENCE' as NavView,
      label: language === 'ar' ? 'وكيل بحث جوجل والذكاء' : (language === 'ps' ? 'د ګوګل لټون او استخبارات' : 'Google Search & AI Hub'),
      icon: Sparkles,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'Live Search',
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    },
    {
      id: 'VOICE_REPORTS' as NavView,
      label: language === 'ar' ? 'تقارير السائقين الصوتية' : (language === 'ps' ? 'د ډرایورانو غږیز راپورونه' : 'AI Voice Reports'),
      icon: Mic,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: pendingVoiceReportsCount > 0 ? pendingVoiceReportsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    {
      id: 'TRIPS' as NavView,
      label: language === 'ar' ? 'الرحلات والتوصيل' : (language === 'ps' ? 'سفرونه او لېږد' : 'Trips & Routes'),
      icon: Navigation,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER', 'DRIVER']
    },
    {
      id: 'MAP' as NavView,
      label: language === 'ar' ? 'خريطة الأسطول' : (language === 'ps' ? 'د بیړۍ نقشه' : 'Fleet Map'),
      icon: MapPin,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    },
    {
      id: 'VEHICLES' as NavView,
      label: t.vehicles,
      icon: Truck,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER']
    },
    {
      id: 'WORKERS' as NavView,
      label: t.workers,
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT', 'VIEWER']
    },
    {
      id: 'EXPIRY_ALERTS' as NavView,
      label: t.expiryAlerts,
      icon: AlertTriangle,
      roles: ['ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT', 'VIEWER'],
      badge: urgentAlertsCount > 0 ? urgentAlertsCount : undefined,
      badgeColor: 'bg-red-600 text-white'
    },
    {
      id: 'DOCUMENTS' as NavView,
      label: t.documents,
      icon: FileText,
      roles: ['ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT', 'VIEWER']
    },
    {
      id: 'MAINTENANCE' as NavView,
      label: t.maintenance,
      icon: Wrench,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']
    },
    {
      id: 'FUEL' as NavView,
      label: t.fuel,
      icon: Fuel,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']
    },
    {
      id: 'EXPENSES' as NavView,
      label: t.expenses,
      icon: Receipt,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER']
    },
    {
      id: 'GMAIL' as NavView,
      label: t.gmail,
      icon: Mail,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'Google',
      badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200'
    },
    {
      id: 'GOOGLE_TASKS' as NavView,
      label: t.googleTasks,
      icon: ListTodo,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'Google',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    },
    {
      id: 'GOOGLE_CHAT' as NavView,
      label: t.googleChat,
      icon: MessageSquare,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'Live',
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    },
    {
      id: 'GOOGLE_CONTACTS' as NavView,
      label: t.googleContacts,
      icon: Contact,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'],
      badge: 'People',
      badgeColor: 'bg-amber-50 text-amber-800 border border-amber-200'
    },
    {
      id: 'REPORTS' as NavView,
      label: t.reports,
      icon: BarChart3,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER']
    },
    {
      id: 'ORG_STRUCTURE' as NavView,
      label: t.orgStructure,
      icon: GitFork,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER'],
      badge: 'TGA',
      badgeColor: 'bg-emerald-800 text-white font-bold'
    },
    {
      id: 'NOTIFICATIONS' as NavView,
      label: t.notifications,
      icon: Bell,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER'],
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950'
    },
    {
      id: 'USERS' as NavView,
      label: t.users,
      icon: ShieldCheck,
      roles: ['ADMIN']
    },
    {
      id: 'BILLING' as NavView,
      label: t.billing,
      icon: CreditCard,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      badge: 'ZATCA',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    },
    {
      id: 'AUDIT_LOGS' as NavView,
      label: t.auditLogs,
      icon: History,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      id: 'SETTINGS' as NavView,
      label: t.settings,
      icon: Settings,
      roles: ['ADMIN', 'MANAGER']
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 ${
          dir === 'rtl' ? 'right-0' : 'left-0'
        } z-50 w-64 bg-white text-slate-800 flex flex-col h-full shrink-0 transition-transform duration-300 ease-out ${
          isOpen
            ? 'translate-x-0'
            : `${dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`
        } border-r rtl:border-r-0 rtl:border-l border-slate-200 shadow-xs lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
          <BrandLogo
            size="md"
            showText={true}
            textSubtitle={language === 'ar' ? 'خدمات خيبر اللوجستية' : (language === 'ps' ? 'د خيبر لوژستیکي خدمتونه' : 'Logistics Services')}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'ar' ? 'القائمة الرئيسية' : (language === 'ps' ? 'اصلي مینو' : 'Main Menu')}
          </div>

          {navItems.map(item => {
            if (!hasRole(...(item.roles as any))) return null;
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ x: dir === 'rtl' ? -2 : 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors group ${
                  isActive
                    ? 'text-[#006C35] font-semibold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {/* Active Sliding Pill Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-emerald-50/80 rounded-lg border border-emerald-200/60 shadow-2xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#006C35]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`relative z-10 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-transform ${
                      isActive ? 'bg-[#006C35]/15 text-[#006C35]' : 'bg-red-50 text-red-600 group-hover:scale-105'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}

          {onOpenKhyberCore && (
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  onOpenKhyberCore();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-linear-to-r from-emerald-950 via-slate-900 to-emerald-950 hover:from-emerald-900 hover:to-slate-850 text-white border border-emerald-500/50 text-xs font-bold transition-all shadow-md shadow-emerald-950/40 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xs group-hover:rotate-12 transition-transform">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left rtl:text-right">
                    <div className="truncate text-xs font-extrabold text-white">KHYBER CORE</div>
                    <div className="text-[9px] text-emerald-300/80 font-normal">Tel-Agent • Web • WhatsApp</div>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </motion.button>
            </div>
          )}

          {onOpenLiveVoice && (
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  onOpenLiveVoice();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 hover:from-emerald-800 hover:to-slate-850 text-white border border-emerald-500/40 text-xs font-bold transition-all shadow-md shadow-emerald-950/30 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <span className="truncate">{language === 'ar' ? 'مكالمة صوتية حية' : 'Live Voice Call'}</span>
                </div>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  Live API
                </span>
              </motion.button>
            </div>
          )}

          {onOpenQRScanner && (
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  onOpenQRScanner();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/70 hover:from-emerald-100 hover:to-emerald-100 text-emerald-950 border border-emerald-300/80 text-xs font-bold transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs group-hover:rotate-6 transition-transform">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{t.scanQrCode || 'Scan QR Tag'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                  Camera
                </span>
              </motion.button>
            </div>
          )}
        </nav>

        {/* Urgent Tasks Quick Alert / Pill */}
        {urgentAlertsCount > 0 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                onSelectView('EXPIRY_ALERTS');
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100/80 rounded-lg text-xs font-semibold transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                <span>{urgentAlertsCount} {language === 'ar' ? 'تنبيهات عاجلة' : 'Urgent Alerts'}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 px-1.5 py-0.5 rounded">Action</span>
            </button>
          </div>
        )}

        {/* User Card & Logout Bottom */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 truncate">{user?.fullName}</div>
                <div className="text-[10px] text-slate-400 font-medium">{user?.role}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title={t.logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
