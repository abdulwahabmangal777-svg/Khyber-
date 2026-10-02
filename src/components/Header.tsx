import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Globe,
  LogOut,
  User,
  Shield,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Calendar,
  QrCode,
  Camera,
  Mic,
  Sparkles,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Check,
  ChevronDown,
  Radio,
  Sliders,
  Server,
  FileDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { useAdsterra } from '../context/AdsterraContext';
import { Language } from '../i18n/translations';
import { BrandLogo } from './common/BrandLogo';
import { audioService } from '../services/audioService';

interface HeaderProps {
  onOpenSearch: (initialQuery?: string) => void;
  onToggleSidebar: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications: () => void;
  onOpenQRScanner?: () => void;
  onOpenVoiceReportModal?: () => void;
  onOpenLiveVoiceConversation?: () => void;
  onOpenFleetIntelligence?: () => void;
  onOpenKhyberCore?: () => void;
  onDownloadViewPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onToggleSidebar,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenQRScanner,
  onOpenVoiceReportModal,
  onOpenLiveVoiceConversation,
  onOpenFleetIntelligence,
  onOpenKhyberCore,
  onDownloadViewPdf,
  isGeneratingPdf = false
}) => {
  const { language, setLanguage, t, dir, hijriEnabled, toggleHijri } = useLanguage();
  const { user, logout } = useAuth();
  const { user: googleUser, isAuthenticated: isGoogleAuth, signIn: googleSignIn } = useGoogleWorkspace();
  const { config: adsterraConfig, setIsAdsterraModalOpen } = useAdsterra();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [soundActive, setSoundActive] = useState(audioService.isSoundEnabled());
  const [voiceActive, setVoiceActive] = useState(audioService.isVoiceEnabled());
  const [selectedHumanVoice, setSelectedHumanVoice] = useState(audioService.getActiveHumanVoice());
  const [volumeLevel, setVolumeLevel] = useState(100);
  const [isAudioTesting, setIsAudioTesting] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [testingType, setTestingType] = useState<string>('');
  const audioMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleSoundEffects = () => {
    const newState = !soundActive;
    audioService.setSoundEnabled(newState);
    setSoundActive(newState);
    if (newState) {
      audioService.playChime('confirm');
    }
  };

  const toggleVoiceTTS = () => {
    const newState = !voiceActive;
    audioService.setVoiceEnabled(newState);
    setVoiceActive(newState);
    if (newState) {
      audioService.playHumanSample('sample_system_ready');
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setSelectedHumanVoice(voiceId);
    audioService.setActiveHumanVoice(voiceId);
    audioService.playChime('click');
  };

  const handleVolumeChange = (newVal: number) => {
    setVolumeLevel(newVal);
    audioService.setVolume(newVal / 100);
    audioService.playChime('click');
  };

  const handlePlayRealHumanSample = async (sampleId: string, typeKey: string) => {
    setIsAudioTesting(true);
    setTestingType(typeKey);
    try {
      await audioService.playHumanSample(sampleId, {
        onEnd: () => {
          setIsAudioTesting(false);
          setTestingType('');
        },
        onError: () => {
          setIsAudioTesting(false);
          setTestingType('');
        }
      });
    } catch (e) {
      setIsAudioTesting(false);
      setTestingType('');
    }
  };

  const handleTestAudio = async () => {
    setIsAudioTesting(true);
    setTestingType('all');
    try {
      await handlePlayRealHumanSample('sample_system_ready', 'all');
    } finally {
      setTimeout(() => {
        setIsAudioTesting(false);
        setTestingType('');
      }, 2500);
    }
  };

  const handleTestRadioStream = async () => {
    setIsAudioTesting(true);
    setTestingType('radio');
    try {
      const audio = new Audio('/api/voice/test-audio');
      await audio.play();
      audio.onended = () => {
        setIsAudioTesting(false);
        setTestingType('');
      };
    } catch (e) {
      // Fallback in-memory
      audioService.playChime('radio');
      setTimeout(() => {
        setIsAudioTesting(false);
        setTestingType('');
      }, 1500);
    }
  };

  // Close audio dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setAudioMenuOpen(false);
      }
    };
    if (audioMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [audioMenuOpen]);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchInput.trim()) {
      onOpenSearch(quickSearchInput.trim());
      setQuickSearchInput('');
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'MANAGER': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'ACCOUNTANT': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'HR': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Sidebar Trigger, Mobile Logo & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo */}
        <BrandLogo size="sm" showText={false} className="lg:hidden shrink-0" />

        {/* Global Search Bar */}
        <form onSubmit={handleQuickSubmit} className="relative flex-1 max-w-lg">
          <div
            onClick={() => onOpenSearch()}
            className="w-full flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-300/80 rounded-xl px-3.5 py-2 text-sm text-slate-500 cursor-pointer transition-all shadow-2xs group"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-900 transition-colors shrink-0" />
            <span className="flex-1 truncate text-xs sm:text-sm">
              {t.globalSearchPlaceholder}
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              Ctrl+K
            </kbd>
          </div>
        </form>

        {/* Instant QR Code Camera Scanner Button */}
        {onOpenQRScanner && (
          <button
            type="button"
            onClick={onOpenQRScanner}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0"
            title="Open Camera QR Scanner to scan vehicle/driver labels"
          >
            <QrCode className="w-4 h-4 text-emerald-700 group-hover:rotate-6 transition-transform" />
            <span className="hidden md:inline">{t.scanQrCode || 'Scan QR'}</span>
          </button>
        )}

        {/* Live Voice Call Trigger Button (Live API gemini-3.1-flash-live-preview) */}
        {onOpenLiveVoiceConversation && (
          <button
            type="button"
            onClick={onOpenLiveVoiceConversation}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/20 group active:scale-95 shrink-0 cursor-pointer"
            title="Launch Real-Time Voice Conversation (Live API gemini-3.1-flash-live-preview)"
          >
            <Radio className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span className="hidden lg:inline">{language === 'ar' ? 'مكالمة ذكية حية' : 'Live Voice AI'}</span>
          </button>
        )}

        {/* Google Search Intelligence & Grounding Trigger Button */}
        {onOpenFleetIntelligence && (
          <button
            type="button"
            onClick={onOpenFleetIntelligence}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-900 dark:text-indigo-300 text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0 cursor-pointer"
            title="Google Search Grounded Agent (Current Events, News Citation & Fact-Checking)"
          >
            <Globe className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform animate-pulse" />
            <span className="hidden lg:inline">{language === 'ar' ? 'وكيل بحث جوجل' : 'Google Search Agent'}</span>
          </button>
        )}

        {/* AI Voice Assistant Trigger Button */}
        {onOpenVoiceReportModal && (
          <button
            type="button"
            onClick={onOpenVoiceReportModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0"
            title="Open AI Driver Voice Assistant (Multilingual Speech-to-Text)"
          >
            <Mic className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="hidden md:inline">Voice Report</span>
          </button>
        )}

        {/* KHYBER CORE Multi-Channel Gateway Button */}
        {onOpenKhyberCore && (
          <button
            type="button"
            onClick={onOpenKhyberCore}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-500/40 text-emerald-900 dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0 cursor-pointer"
            title="KHYBER CORE Gateway (Tel-Agent SIP Phone • Web PDF • WhatsApp)"
          >
            <Server className="w-4 h-4 text-emerald-600 group-hover:rotate-12 transition-transform" />
            <span className="hidden xl:inline">Khyber Core</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        )}

        {/* Download Current View PDF Button */}
        {onDownloadViewPdf && (
          <button
            type="button"
            onClick={onDownloadViewPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-900 dark:text-blue-300 text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
            title={language === 'ar' ? 'تنزيل تقرير PDF فوري للشاشة الحالية مع تنسيقات الطباعة' : 'Download print-friendly PDF report for current view'}
          >
            <FileDown className={`w-4 h-4 text-blue-600 ${isGeneratingPdf ? 'animate-bounce' : 'group-hover:-translate-y-0.5'} transition-transform`} />
            <span className="hidden md:inline">{isGeneratingPdf ? (language === 'ar' ? 'جاري التوليد...' : 'Exporting...') : (language === 'ar' ? 'تقرير PDF' : 'PDF Report')}</span>
          </button>
        )}

        {/* Adsterra Ad Network Monetization Quick Access Button */}
        <button
          type="button"
          onClick={() => setIsAdsterraModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs group active:scale-95 shrink-0 cursor-pointer ${
            adsterraConfig?.enabled
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }`}
          title="Adsterra Monetization Manager & Zone Keys"
        >
          <span className={`w-2 h-2 rounded-full ${adsterraConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="hidden sm:inline font-mono text-[11px]">Adsterra</span>
        </button>

        {/* AI Voice & Sound Control Center */}
        <div className="relative" ref={audioMenuRef}>
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden shrink-0">
            <button
              type="button"
              onClick={handleTestAudio}
              disabled={isAudioTesting}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-2 text-xs font-bold transition-all group active:scale-95 ${
                isAudioTesting
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : !soundActive && !voiceActive
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
              title="Click to Test Sound & Voice Synthesizer"
            >
              {!soundActive && !voiceActive ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              ) : volumeLevel < 40 ? (
                <Volume1 className={`w-3.5 h-3.5 ${isAudioTesting ? 'text-white' : 'text-emerald-600'}`} />
              ) : (
                <Volume2 className={`w-3.5 h-3.5 ${isAudioTesting ? 'text-white' : 'text-emerald-600'}`} />
              )}
              <span className="hidden xl:inline">
                {isAudioTesting ? 'Playing Audio...' : !soundActive ? 'Muted' : 'Test Sound'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioService.unlockAudio();
                setAudioMenuOpen(!audioMenuOpen);
              }}
              className="px-1.5 py-2 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 transition-colors"
              title="Open Sound & Voice Settings"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${audioMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Sound & Voice Settings Panel Dropdown */}
          {audioMenuOpen && (
            <div className={`absolute top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              dir === 'rtl' ? 'left-0' : 'right-0'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Audio & Real Human Voice</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Real Human
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3.1 Studio Voice • 24kHz RIFF WAV</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Master Volume
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 font-bold">{volumeLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volumeLevel}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Real Human Voice Persona Selector */}
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                  Real Human Studio Voice Persona
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'Puck', label: '👨‍✈️ Puck', sub: 'Driver (Male)' },
                    { id: 'Kore', label: '👩‍💼 Kore', sub: 'Fleet AI (Fem)' },
                    { id: 'Charon', label: '🧔 Charon', sub: 'Commander' },
                    { id: 'Fenrir', label: '👨‍🔧 Fenrir', sub: 'Field Team' },
                    { id: 'Zephyr', label: '👩‍💻 Zephyr', sub: 'Dispatcher' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVoice(v.id)}
                      className={`p-1.5 rounded-lg border text-left transition-all ${
                        selectedHumanVoice === v.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[11px] truncate">{v.label}</div>
                      <div className="text-[9px] opacity-75 truncate">{v.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound & Voice Toggles */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={toggleSoundEffects}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    soundActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Volume2 className="w-4 h-4" />
                    <span className={`w-2 h-2 rounded-full ${soundActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <span className="text-[11px] font-bold">Sound Chimes</span>
                  <span className="text-[10px] opacity-75">{soundActive ? 'Enabled' : 'Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceTTS}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    voiceActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Mic className="w-4 h-4" />
                    <span className={`w-2 h-2 rounded-full ${voiceActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </div>
                  <span className="text-[11px] font-bold">Real Human Voice</span>
                  <span className="text-[10px] opacity-75">{voiceActive ? 'Active (Studio)' : 'Disabled'}</span>
                </button>
              </div>

              {/* Instant Audio Diagnostics Test Buttons */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Listen to Real Human Voice Samples:
                </span>

                <button
                  type="button"
                  onClick={() => handlePlayRealHumanSample('sample_ar_driver', 'ar-driver')}
                  disabled={isAudioTesting}
                  className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
                    testingType === 'ar-driver'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🇸🇦</span>
                    <span>Captain Ahmed (Arabic Real Human Driver)</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">24kHz WAV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayRealHumanSample('sample_en_dispatcher', 'en-dispatcher')}
                  disabled={isAudioTesting}
                  className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
                    testingType === 'en-dispatcher'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🇬🇧</span>
                    <span>Logistics Dispatcher (English Real Human)</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">24kHz WAV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayRealHumanSample('sample_exec_summary', 'exec-summary')}
                  disabled={isAudioTesting}
                  className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
                    testingType === 'exec-summary'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>AI Executive Fleet Summary (Female - Kore)</span>
                  </div>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">24kHz WAV</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestRadioStream}
                  disabled={isAudioTesting}
                  className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
                    testingType === 'radio'
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-500" />
                    <span>Radio Dispatch & Squelch Channel</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Radio Chime</span>
                </button>
              </div>

              {/* Diagnostic Footnote */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Real Human Voices Active
                </span>
                <span>Zero Latency Studio WAV</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Hijri Toggle, Language, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Google Workspace Account Status Indicator */}
        {isGoogleAuth ? (
          <div
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs"
            title={`Google Workspace Connected: ${googleUser?.email}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="truncate max-w-[120px]">
              {googleUser?.displayName || (googleUser?.email ? googleUser.email.split('@')[0] : 'Google User')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={googleSignIn}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
            title="Connect Google Workspace (Gmail, Tasks, Chat)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Google Sync</span>
          </button>
        )}

        {/* Hijri Calendar Date Switcher */}
        <button
          type="button"
          onClick={toggleHijri}
          title={hijriEnabled ? 'Switch to Gregorian Dates' : 'Switch to Saudi Hijri Calendar (هـ)'}
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            hijriEnabled
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
          <span>{hijriEnabled ? 'تقويم أم القرى' : 'Hijri (هـ)'}</span>
        </button>

        {/* Language Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-800" />
            <span className="uppercase">{language}</span>
          </button>

          {langMenuOpen && (
            <div
              className={`absolute top-full mt-1.5 ${
                dir === 'rtl' ? 'left-0' : 'right-0'
              } w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40`}
            >
              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  setLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left rtl:text-right text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                  language === 'en' ? 'text-emerald-900 bg-emerald-50' : 'text-slate-700'
                }`}
              >
                <span>English (EN)</span>
                {language === 'en' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('ar');
                  setLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left rtl:text-right text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                  language === 'ar' ? 'text-emerald-900 bg-emerald-50' : 'text-slate-700'
                }`}
              >
                <span className="font-arabic">العربية (AR)</span>
                {language === 'ar' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('ps');
                  setLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left rtl:text-right text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                  language === 'ps' ? 'text-emerald-900 bg-emerald-50' : 'text-slate-700'
                }`}
              >
                <span className="font-arabic">پښتو (PS)</span>
                {language === 'ps' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5 text-slate-700" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* User Profile & Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left rtl:text-right">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {user?.fullName || 'User'}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role || 'VIEWER'}
                </span>
              </div>
            </div>
          </button>

          {userMenuOpen && (
            <div
              className={`absolute top-full mt-2 ${
                dir === 'rtl' ? 'left-0' : 'right-0'
              } w-64 bg-white border border-amber-500/30 rounded-2xl shadow-2xl py-2 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
            >
              {/* Corporate Identity Header */}
              <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-b border-amber-500/30 flex items-center gap-2.5 text-white">
                <div className="p-0.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-xs shrink-0">
                  <BrandLogo size="xs" showText={false} variant="luxury" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black tracking-wide truncate">KHYBER LOGISTICS</div>
                  <div className="text-[9px] text-amber-300 font-arabic">خدمات خيبر اللوجستية</div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
                <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                <div className="flex items-center justify-between gap-1 mt-1">
                  <span className="text-[10px] text-emerald-800 font-semibold">
                    {user?.department || 'Operations'}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${getRoleBadgeColor(
                      user?.role
                    )}`}
                  >
                    {user?.role || 'VIEWER'}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3.5 py-2 text-left rtl:text-right text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
