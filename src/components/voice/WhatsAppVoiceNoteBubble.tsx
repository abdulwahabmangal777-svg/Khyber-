import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Mic,
  Volume2,
  CheckCheck,
  Download,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  FileAudio
} from 'lucide-react';
import { audioService } from '../../services/audioService';

export interface WhatsAppVoiceNoteBubbleProps {
  reportId?: string;
  audioUrl?: string;
  driverName: string;
  driverEmployeeId?: string;
  driverAvatar?: string;
  language: 'ar' | 'ps' | 'ur' | 'en' | string;
  durationSeconds?: number;
  transcription?: string;
  normalizedEnglish?: string;
  timestamp?: string;
  vehiclePlate?: string;
  vehicleInternalId?: string;
  compact?: boolean;
  showTranscription?: boolean;
  onPlayChange?: (isPlaying: boolean) => void;
  className?: string;
}

const LANGUAGE_CONFIG: Record<string, { label: string; nativeName: string; flag: string; fontDir: 'rtl' | 'ltr' }> = {
  ar: { label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', fontDir: 'rtl' },
  ps: { label: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', fontDir: 'rtl' },
  ur: { label: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', fontDir: 'rtl' },
  en: { label: 'English', nativeName: 'English', flag: '🇬🇧', fontDir: 'ltr' }
};

// 34 simulated authentic voice waveform bars (percentages 15% - 95%)
const DEFAULT_WAVEFORM_BARS = [
  25, 40, 70, 45, 85, 95, 60, 30, 20, 50, 80, 90, 65, 40, 35, 75,
  88, 92, 55, 30, 45, 80, 85, 70, 50, 35, 65, 90, 75, 45, 30, 60,
  40, 20
];

export const WhatsAppVoiceNoteBubble: React.FC<WhatsAppVoiceNoteBubbleProps> = ({
  reportId,
  audioUrl,
  driverName,
  driverEmployeeId,
  driverAvatar,
  language = 'ar',
  durationSeconds = 10,
  transcription,
  normalizedEnglish,
  timestamp,
  vehiclePlate,
  vehicleInternalId,
  compact = false,
  showTranscription = true,
  onPlayChange,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [usePhoneWarmthFilter, setUsePhoneWarmthFilter] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  const langInfo = LANGUAGE_CONFIG[language] || {
    label: language.toUpperCase(),
    nativeName: language.toUpperCase(),
    flag: '🎙️',
    fontDir: 'ltr'
  };

  // Derive resolved audio URL
  const resolvedAudioUrl = audioUrl || (reportId ? `/api/voice-reports/${reportId}/audio` : '');

  // Initialize or cleanup audio element
  useEffect(() => {
    if (!resolvedAudioUrl) return;

    const audio = new Audio(resolvedAudioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.max(audio.duration, 1));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onPlayChange) onPlayChange(false);
    };

    const handleError = () => {
      console.warn('WhatsApp audio playback warning for:', resolvedAudioUrl);
      setAudioError(true);
      setIsPlaying(false);
      if (onPlayChange) onPlayChange(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, [resolvedAudioUrl]);

  // Handle Play / Pause Toggle
  const togglePlay = () => {
    audioService.unlockAudio();

    if (!audioRef.current) {
      if (transcription) {
        speakFallback();
      }
      return;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (onPlayChange) onPlayChange(false);
    } else {
      // Setup Web Audio phone warmth filter if enabled and context available
      if (usePhoneWarmthFilter && !sourceNodeRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const src = ctx.createMediaElementSource(audio);
            const filter = ctx.createBiquadFilter();
            // WhatsApp voice message mobile microphone bandpass EQ (300Hz - 3400Hz phone band)
            filter.type = 'bandpass';
            filter.frequency.value = 1600;
            filter.Q.value = 0.8;
            src.connect(filter);
            filter.connect(ctx.destination);
            sourceNodeRef.current = src;
            filterNodeRef.current = filter;
          }
        } catch (e) {
          // Ignore if already connected
        }
      }

      audio.playbackRate = playbackSpeed;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(false);
          if (onPlayChange) onPlayChange(true);
        })
        .catch((err) => {
          console.warn('HTML5 Audio playback interrupted, falling back to speech synthesis:', err);
          setIsPlaying(false);
          speakFallback();
        });
    }
  };

  // Fallback speech in native driver language
  const speakFallback = () => {
    if (!transcription) return;
    setIsPlaying(true);
    if (onPlayChange) onPlayChange(true);

    const langCode = language === 'ps' ? 'ps-AF' : language === 'ur' ? 'ur-PK' : language === 'ar' ? 'ar-SA' : 'en-US';

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(transcription);
      utterance.lang = langCode;
      utterance.rate = playbackSpeed;
      utterance.onend = () => {
        setIsPlaying(false);
        if (onPlayChange) onPlayChange(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        if (onPlayChange) onPlayChange(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlaying(false);
        if (onPlayChange) onPlayChange(false);
      }, (durationSeconds || 5) * 1000);
    }
  };

  // Speed Toggle (1x -> 1.5x -> 2x -> 1x)
  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Waveform Scrubbing (seek to position)
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const newTime = ratio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format seconds into mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const activeBarIndex = Math.floor(progressRatio * DEFAULT_WAVEFORM_BARS.length);

  // Time formatted as WhatsApp timestamp (e.g. 14:32)
  const displayTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '14:30';

  // Compact row representation (for tables)
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 bg-[#005c4b]/30 hover:bg-[#005c4b]/50 border border-[#00a884]/40 rounded-full py-1 px-2.5 transition-all group ${className}`}
        title={`Listen to WhatsApp voice note from ${driverName} (${langInfo.nativeName})`}
      >
        <button
          type="button"
          onClick={togglePlay}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-[#25D366] text-slate-950 ring-2 ring-[#25D366]/50 shadow-md animate-pulse'
              : 'bg-[#25D366] text-slate-950 hover:bg-[#20bd5a] hover:scale-105 shadow'
          }`}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        {/* Mini waveform bars */}
        <div className="flex items-center gap-0.5 h-4 w-16">
          {DEFAULT_WAVEFORM_BARS.slice(0, 14).map((h, i) => {
            const isPlayed = i <= (activeBarIndex / DEFAULT_WAVEFORM_BARS.length) * 14;
            return (
              <div
                key={i}
                style={{ height: `${Math.max(20, h * 0.4)}%` }}
                className={`w-0.5 rounded-full transition-colors ${
                  isPlayed ? 'bg-[#25D366]' : 'bg-slate-500/60'
                }`}
              />
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-emerald-300 font-semibold">
          {formatTime(currentTime > 0 ? currentTime : duration)}
        </span>

        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 text-emerald-400 font-medium border border-emerald-500/30 flex items-center gap-1">
          <span>{langInfo.flag}</span>
          <span>{langInfo.nativeName}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative rounded-2xl p-4 bg-gradient-to-br from-[#1f2c34] to-[#121b22] border border-[#2a3942] text-slate-100 shadow-xl transition-all duration-200 hover:border-[#00a884]/60 ${className}`}
    >
      {/* WhatsApp Voice Header Banner */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#2a3942]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar with WhatsApp Mic Badge */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-[#00a884] flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
              {driverAvatar ? (
                <img src={driverAvatar} alt={driverName} className="w-full h-full object-cover" />
              ) : (
                driverName.split(' ').map(n => n[0]).slice(0, 2).join('')
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#25D366] text-slate-950 flex items-center justify-center ring-2 ring-[#1f2c34] shadow">
              <Mic className="w-2.5 h-2.5 stroke-[2.5]" />
            </div>
          </div>

          {/* Driver details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-white truncate">{driverName}</h4>
              {driverEmployeeId && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {driverEmployeeId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {vehiclePlate && (
                <span>Vehicle: <strong className="text-slate-200">{vehiclePlate}</strong></span>
              )}
              {vehicleInternalId && (
                <span className="text-slate-500">• {vehicleInternalId}</span>
              )}
            </div>
          </div>
        </div>

        {/* Native Language Pill */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#005c4b]/50 border border-[#00a884]/40 text-emerald-300 text-xs font-semibold shadow-inner"
            title={`Driver's Native Language: ${langInfo.label}`}
          >
            <span className="text-sm">{langInfo.flag}</span>
            <span className="font-arabic font-bold">{langInfo.nativeName}</span>
            <span className="text-[10px] text-emerald-400/80 font-normal">({langInfo.label})</span>
          </div>
        </div>
      </div>

      {/* Main WhatsApp Voice Player Row */}
      <div className="flex items-center gap-3.5 py-1">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-slate-950 transition-all duration-200 shadow-lg ${
            isPlaying
              ? 'bg-[#25D366] ring-4 ring-[#25D366]/30 shadow-[#25D366]/20 scale-105 animate-pulse'
              : 'bg-[#25D366] hover:bg-[#20bd5a] hover:scale-105 active:scale-95 ring-2 ring-[#25D366]/20'
          }`}
          aria-label={isPlaying ? 'Pause Voice Message' : 'Play WhatsApp Voice Message'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform & Scrubbing Track */}
        <div className="flex-1 space-y-1.5">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="relative h-9 flex items-center gap-[3px] cursor-pointer py-1 px-1 rounded-lg hover:bg-slate-800/40 transition-colors group"
            title="Click or drag to scrub voice message"
          >
            {DEFAULT_WAVEFORM_BARS.map((heightPercent, idx) => {
              const isPlayed = idx <= activeBarIndex;
              return (
                <div
                  key={idx}
                  style={{ height: `${heightPercent}%` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isPlayed
                      ? 'bg-[#25D366] shadow-[0_0_6px_rgba(37,211,102,0.4)]'
                      : 'bg-slate-600/80 group-hover:bg-slate-500'
                  }`}
                />
              );
            })}

            {/* Playhead Scrubbing Indicator */}
            <div
              style={{ left: `${progressRatio * 100}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-[#25D366] shadow-md pointer-events-none transition-transform group-hover:scale-125"
            />
          </div>

          {/* Time and WhatsApp Message Footer Strip */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-400">
                {formatTime(currentTime)}
              </span>
              <span className="text-slate-600">/</span>
              <span>{formatTime(duration)}</span>

              {isPlaying && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-sans animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  Playing native speech
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* WhatsApp Playback Speed (1x, 1.5x, 2x) */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold font-sans bg-[#2a3942] hover:bg-[#324552] text-emerald-300 transition-colors border border-slate-700 shadow-sm"
                title="Change WhatsApp playback speed"
              >
                {playbackSpeed}x
              </button>

              {/* Timestamp & Double Blue Read Checkmarks */}
              <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                <span>{displayTime}</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" title="Listened" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Transcription in Native Driver Language */}
      {showTranscription && transcription && (
        <div className="mt-3 pt-3 border-t border-[#2a3942]/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <FileAudio className="w-3.5 h-3.5 text-[#00a884]" />
              Native Spoken Voice Transcription ({langInfo.label}):
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Original Driver Audio</span>
          </div>

          <div
            dir={langInfo.fontDir}
            className="p-2.5 rounded-xl bg-[#111b21] border border-[#2a3942] text-sm text-slate-200 leading-relaxed font-medium"
          >
            "{transcription}"
          </div>

          {normalizedEnglish && normalizedEnglish !== transcription && (
            <div className="pt-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                AI English Translation:
              </span>
              <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                "{normalizedEnglish}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Voice Options & Filter Bar */}
      <div className="mt-2.5 pt-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" /> Real Native Voice Note
          </span>

          {resolvedAudioUrl && (
            <a
              href={resolvedAudioUrl}
              download={`${driverName.replace(/\s+/g, '_')}_VoiceReport.wav`}
              className="hover:text-emerald-400 flex items-center gap-1 transition-colors text-[10px]"
              title="Download original audio WAV"
            >
              <Download className="w-3 h-3" /> Audio File
            </a>
          )}
        </div>

        {/* Audio Warmth Filter Toggle */}
        <button
          type="button"
          onClick={() => setUsePhoneWarmthFilter(!usePhoneWarmthFilter)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-colors ${
            usePhoneWarmthFilter
              ? 'bg-[#005c4b] text-emerald-200 font-medium'
              : 'hover:text-slate-300 text-slate-500'
          }`}
          title="Toggle WhatsApp phone microphone acoustic warmth filter"
        >
          <SlidersHorizontal className="w-2.5 h-2.5" />
          <span>{usePhoneWarmthFilter ? 'Phone Mic Warmth On' : 'Studio Quality'}</span>
        </button>
      </div>
    </div>
  );
};
