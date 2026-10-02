import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  Lock,
  User,
  Key,
  Globe,
  ArrowRight,
  Mail,
  UserPlus,
  Briefcase,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { UserRole } from '../types';

export const LoginView: React.FC = () => {
  const { login, signup } = useAuth();
  const { t, language, setLanguage, dir } = useLanguage();

  // Mode: 'LOGIN' or 'SIGNUP'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Sign In States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up States
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('VIEWER');
  const [signupDepartment, setSignupDepartment] = useState('Logistics & Fleet Operations');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        fullName: signupFullName.trim() || signupEmail.split('@')[0],
        role: signupRole,
        department: signupDepartment
      });
      setSuccessMsg('Account created successfully! Logging you in...');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" dir={dir}>
      {/* Language Switcher in Top Corner */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 flex items-center gap-2 z-10">
        <Globe className="w-4 h-4 text-slate-400" />
        <select
          value={language}
          onChange={e => setLanguage(e.target.value as any)}
          className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-[#006C35]"
        >
          <option value="en">English</option>
          <option value="ar">العربية (Arabic)</option>
          <option value="ps">پښتو (Pashto)</option>
        </select>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Emblem & Logo */}
        <div className="flex justify-center">
          <BrandLogo size="xl" showText={false} />
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900 tracking-tight">
          {t.systemTitle}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Kingdom of Saudi Arabia &bull; Enterprise Fleet & Workforce Telemetry Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm rounded-2xl border border-slate-200">
          {/* Segmented Tab: Log In vs Sign Up with Email */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'LOGIN'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#006C35]" />
              <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In with Email'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGNUP');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'SIGNUP'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#006C35]" />
              <span>{language === 'ar' ? 'إنشاء حساب جديد' : 'Sign Up (New User)'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'LOGIN' ? (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {language === 'ar' ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email Address or Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="admin@khyber.sa or abdulwahabmangal777@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#006C35] text-white hover:bg-[#005a2c] transition-colors shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : t.login}</span>
                <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </button>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form className="space-y-3.5" onSubmit={handleSignupSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signupFullName}
                    onChange={e => setSignupFullName(e.target.value)}
                    placeholder="e.g. Abdulwahab Mangal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="user@khyber.sa or gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'ar' ? 'الدور الوظيفي' : 'Role'}
                  </label>
                  <select
                    value={signupRole}
                    onChange={e => setSignupRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                  >
                    <option value="VIEWER">Fleet Viewer (مستعرض)</option>
                    <option value="DRIVER">Fleet Driver (سائق)</option>
                    <option value="MANAGER">Logistics Manager (مدير)</option>
                    <option value="ACCOUNTANT">Accountant (محاسب)</option>
                    <option value="HR">HR Officer (الموارد)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'ar' ? 'القسم' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={signupDepartment}
                    onChange={e => setSignupDepartment(e.target.value)}
                    placeholder="Operations"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'} *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 rtl:pl-2 rtl:pr-8 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'ar' ? 'تأكيد المرور' : 'Confirm'} *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={signupConfirmPassword}
                      onChange={e => setSignupConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 rtl:pl-2 rtl:pr-8 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#006C35] outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#006C35] text-white hover:bg-[#005a2c] transition-colors shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : (language === 'ar' ? 'إنشاء الحساب والدخول' : 'Sign Up with Email')}</span>
                <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </button>
            </form>
          )}

          {/* Production Administrator Login Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setLoginIdentifier('admin');
                setLoginPassword('admin123');
                setError(null);
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-xs flex items-center justify-between text-slate-600 font-medium cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006C35]" />
                <span>Default Admin Login: <strong className="text-slate-900 font-semibold">admin</strong></span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">admin123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
