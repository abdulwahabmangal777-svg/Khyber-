// Audio & Voice Service for Fleet Enterprise
// Handles Web Audio API sound effects, Web Speech API (Speech-to-Text & Text-to-Speech),
// and synthetic audio generation for 100% resilient playback across all browsers & platforms.

export type ChimeType = 'start' | 'stop' | 'success' | 'confirm' | 'error' | 'click' | 'beep' | 'radio' | 'whatsapp_start' | 'whatsapp_stop' | 'whatsapp_sent';

export interface SpeechRecognitionOptions {
  language?: string; // 'ar-SA', 'ur-PK', 'ps-AF', 'en-US'
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export interface SpeakOptions {
  fallbackText?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  playChimeFirst?: boolean;
}

class AudioService {
  private audioCtx: AudioContext | null = null;
  private soundEffectsEnabled = true;
  private voiceEnabled = true;
  private volume = 1.0;
  private activeRecognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private activeHumanVoice = 'Puck';
  private isSpeakingActive = false;
  private voices: SpeechSynthesisVoice[] = [];
  private hasInitializedVoices = false;
  private unlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalUnlock();
      this.initVoices();
      try {
        const savedVoice = localStorage.getItem('fleet_active_human_voice');
        if (savedVoice) this.activeHumanVoice = savedVoice;
      } catch (e) {}
    }
  }

  public getActiveHumanVoice(): string {
    return this.activeHumanVoice;
  }

  public setActiveHumanVoice(voiceName: string) {
    this.activeHumanVoice = voiceName;
    try {
      localStorage.setItem('fleet_active_human_voice', voiceName);
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // Browser Autoplay & AudioContext Auto-Unlock
  // -------------------------------------------------------------
  private setupGlobalUnlock() {
    const unlockHandler = () => {
      this.unlockAudio();
    };

    window.addEventListener('click', unlockHandler, { capture: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { capture: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { capture: true, passive: true });
  }

  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      this.unlocked = true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list && list.length > 0) {
          this.voices = list;
          this.hasInitializedVoices = true;
        }
      } catch (e) {
        // ignore
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Initialize or resume AudioContext
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEffectsEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEffectsEnabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.stopSpeaking();
    }
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
    return this.voices;
  }

  public hasVoiceForLanguage(langPrefix: string): boolean {
    if (!langPrefix) return false;
    const list = this.getAvailableVoices();
    const prefix = String(langPrefix).toLowerCase().split('-')[0];
    return list.some(v => v.lang.toLowerCase().startsWith(prefix));
  }

  // -------------------------------------------------------------
  // 1. Web Audio API Synthesized Chimes (Zero external network requests)
  // -------------------------------------------------------------
  public playChime(type: ChimeType = 'beep') {
    if (!this.soundEffectsEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) {
      this.playFallbackAudioChime(type);
      return;
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.executeChime(ctx, type);
      }).catch(() => {
        this.playFallbackAudioChime(type);
      });
    } else {
      this.executeChime(ctx, type);
    }
  }

  private executeChime(ctx: AudioContext, type: ChimeType) {
    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.45, now);
      masterGain.connect(ctx.destination);

      if (type === 'start') {
        // Two-tone rising prompt (recording started): 440Hz -> 660Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(660, now + 0.1);
        gain2.gain.setValueAtTime(0.6, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.25);
      } else if (type === 'stop') {
        // Descending finish chime (recording stopped): 660Hz -> 440Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'success') {
        // Harmonic major triad chord (C5 523Hz, E5 659Hz, G5 784Hz, C6 1046Hz)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.35, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.45);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.45);
        });
      } else if (type === 'confirm') {
        // High crisp double chime (D5 587Hz, A5 880Hz)
        [587.33, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.4, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.3);
        });
      } else if (type === 'error') {
        // Soft low alert
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'radio') {
        // Authentic radio squelch prompt
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1046, now + 0.06);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'whatsapp_start') {
        // WhatsApp mic start recording soft pop tone (680Hz -> 840Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.06);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'whatsapp_stop') {
        // WhatsApp mic stop recording release pop tone (620Hz -> 500Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'whatsapp_sent') {
        // WhatsApp message sent outgoing tone
        [580, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0.28, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.18);
        });
      } else {
        // Standard beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (err) {
      console.warn('Audio chime error, falling back to HTML5 audio:', err);
      this.playFallbackAudioChime(type);
    }
  }

  // HTML5 audio fallback using in-memory generated WAV blob
  private playFallbackAudioChime(type: ChimeType) {
    try {
      const freq = type === 'error' ? 300 : type === 'confirm' ? 880 : type === 'start' ? 660 : 520;
      const blob = this.createToneWavBlob(freq, 0.2);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.play().catch(() => {});
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      // ignore
    }
  }

  // -------------------------------------------------------------
  // 2. Real Human Voices & Text-to-Speech Engine
  // -------------------------------------------------------------
  public isSpeaking(): boolean {
    if (this.currentAudioElement && !this.currentAudioElement.paused) return true;
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    return window.speechSynthesis.speaking || this.isSpeakingActive;
  }

  public stopSpeaking() {
    this.stopAllAudio();
  }

  public stopAllAudio() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.isSpeakingActive = false;
    this.currentUtterance = null;
  }

  /**
   * Plays a direct Audio URL (e.g. Real Human Voice recordings or samples)
   * with full volume control and lifecycle callbacks.
   */
  public async playAudioUrl(
    url: string,
    options?: SpeakOptions
  ): Promise<HTMLAudioElement | null> {
    if (typeof window === 'undefined') return null;
    this.unlockAudio();
    this.stopAllAudio();

    if (options?.playChimeFirst) {
      this.playChime('radio');
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      this.currentAudioElement = audio;
      this.isSpeakingActive = true;

      audio.onplay = () => {
        this.isSpeakingActive = true;
        if (options?.onStart) options.onStart();
      };

      audio.onended = () => {
        this.isSpeakingActive = false;
        this.currentAudioElement = null;
        if (options?.onEnd) options.onEnd();
      };

      audio.onerror = (e) => {
        console.warn('Real Human audio playback error:', e);
        this.isSpeakingActive = false;
        this.currentAudioElement = null;
        if (options?.onError) options.onError(e);
      };

      await audio.play();
      return audio;
    } catch (err) {
      console.warn('Failed to play audio url:', err);
      this.isSpeakingActive = false;
      this.currentAudioElement = null;
      if (options?.onError) options.onError(err);
      return null;
    }
  }

  /**
   * Plays pre-generated studio Real Human voice samples
   * (e.g. 'sample_ar_driver', 'sample_en_dispatcher', 'sample_exec_summary', 'sample_system_ready')
   */
  public async playHumanSample(
    sampleId: string,
    options?: SpeakOptions
  ): Promise<boolean> {
    const audio = await this.playAudioUrl(`/api/voice/samples/${sampleId}`, options);
    return !!audio;
  }

  /**
   * Generates or streams Real Human Spoken Voice via Gemini TTS server API.
   * Falls back gracefully to browser SpeechSynthesis if offline or unavailable.
   */
  public async playHumanSpeech(
    text: string,
    voiceName?: string,
    options?: SpeakOptions
  ): Promise<boolean> {
    if (!this.voiceEnabled || !text || !text.trim()) return false;
    const selectedVoice = voiceName || this.activeHumanVoice || 'Puck';

    // Map common phrases to pre-cached human sample files for instant zero-latency playback
    const normalized = text.trim();
    if (normalized.includes('أنا متجه') || normalized.includes('تسليم شحنة') || normalized.includes('السائق أحمد')) {
      const ok = await this.playHumanSample('sample_ar_driver', options);
      if (ok) return true;
    } else if (normalized.includes('Attention fleet units') || normalized.includes('verified and clear')) {
      const ok = await this.playHumanSample('sample_en_dispatcher', options);
      if (ok) return true;
    } else if (normalized.includes('Executive Fleet Report') || normalized.includes('TODAY\'S FLEET SUMMARY')) {
      const ok = await this.playHumanSample('sample_exec_summary', options);
      if (ok) return true;
    }

    try {
      const ttsUrl = `/api/voice/tts?text=${encodeURIComponent(text.trim())}&voice=${encodeURIComponent(selectedVoice)}`;
      const audio = await this.playAudioUrl(ttsUrl, options);
      if (audio) return true;
    } catch (e) {
      console.warn('Real human TTS streaming fallback to native:', e);
    }

    // Fallback to browser speech synthesis
    return this.speakWithSpeechSynthesis(text, 'ar', options);
  }

  /**
   * Robust speech synthesis with automatic language detection, voice fallback,
   * Chrome un-sticking, and synthetic audio backup.
   */
  public speakText(
    text: string,
    languageHint: string = 'ar',
    options?: SpeakOptions | (() => void),
    maybeOnEnd?: () => void,
    maybeOnError?: (err: any) => void
  ): boolean {
    if (!this.voiceEnabled) return false;

    // Support both modern SpeakOptions and legacy callback arguments
    let opts: SpeakOptions = {};
    if (typeof options === 'function') {
      opts = {
        onStart: options,
        onEnd: maybeOnEnd,
        onError: maybeOnError
      };
    } else if (options) {
      opts = options;
    }

    // Prefer Real Human Speech streaming
    this.playHumanSpeech(text, this.activeHumanVoice, opts).then(success => {
      if (!success) {
        this.speakWithSpeechSynthesis(text, languageHint, opts);
      }
    }).catch(() => {
      this.speakWithSpeechSynthesis(text, languageHint, opts);
    });

    return true;
  }

  private speakWithSpeechSynthesis(
    text: string,
    languageHint: string = 'ar',
    opts: SpeakOptions = {}
  ): boolean {

    if (opts.playChimeFirst) {
      this.playChime('radio');
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis not supported in this browser environment. Playing synthetic tone.');
      this.playChime('confirm');
      if (opts.onError) opts.onError(new Error('SpeechSynthesis not supported'));
      if (opts.onEnd) setTimeout(opts.onEnd, 1500);
      return false;
    }

    try {
      this.unlockAudio();

      // Fix Chromium bug: calling cancel() and speak() in the same synchronous cycle
      // cancels the new utterance! If speaking, cancel and delay speak by 60ms.
      const wasSpeaking = window.speechSynthesis.speaking;
      if (wasSpeaking) {
        window.speechSynthesis.cancel();
      }

      const scheduleSpeak = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          if (!text || !text.trim()) {
            if (opts.onEnd) opts.onEnd();
            return;
          }

          const voices = this.getAvailableVoices();
          const langLower = (languageHint || 'ar').toLowerCase();
          const langPrefix = langLower.split('-')[0];

          // Check if we have an installed voice matching the requested language
          const hasMatchingVoice = voices.some(v => v.lang.toLowerCase().startsWith(langPrefix));

          // If requested Arabic / Pashto / Urdu has no installed voice on this system,
          // use the English fallback text so the user actually hears real speech audio!
          let textToSpeak = text.trim();
          let targetLang = 'ar-SA';

          if (langLower.startsWith('ps')) {
            targetLang = 'fa-IR';
          } else if (langLower.startsWith('ur')) {
            targetLang = 'ur-PK';
          } else if (langLower.startsWith('en')) {
            targetLang = 'en-US';
          } else {
            targetLang = 'ar-SA';
          }

          if (!hasMatchingVoice && langPrefix !== 'en' && opts.fallbackText) {
            // Smooth graceful fallback to English voice with English summary
            textToSpeak = opts.fallbackText.trim();
            targetLang = 'en-US';
          }

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.volume = this.volume;
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.lang = targetLang;

          // Select matching voice
          if (voices.length > 0) {
            const targetPrefix = targetLang.split('-')[0].toLowerCase();
            const matchedVoice =
              voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
              voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix)) ||
              voices.find(v => v.lang.toLowerCase().includes(targetPrefix)) ||
              voices.find(v => v.default) ||
              voices[0];

            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
          }

          let endedCalled = false;
          const finish = () => {
            if (!endedCalled) {
              endedCalled = true;
              this.isSpeakingActive = false;
              this.currentUtterance = null;
              if (opts.onEnd) opts.onEnd();
            }
          };

          utterance.onstart = () => {
            this.isSpeakingActive = true;
            if (opts.onStart) opts.onStart();
          };

          utterance.onend = () => {
            finish();
          };

          utterance.onerror = (e) => {
            console.warn('Speech synthesis playback error, playing audible chime fallback:', e);
            // If native speech fails (e.g. language-unavailable), ensure the user STILL hears audio!
            this.playChime('confirm');
            finish();
            if (opts.onError) opts.onError(e);
          };

          // Chrome safety timer: if onend fails to fire, clear speaking state
          const estimatedDurationMs = Math.max(3000, (textToSpeak.length / 10) * 1000 + 2000);
          setTimeout(() => {
            if (this.isSpeakingActive && this.currentUtterance === utterance) {
              finish();
            }
          }, estimatedDurationMs);

          this.currentUtterance = utterance;
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('SpeechSynthesis schedule error, fallback chime:', err);
          this.playChime('confirm');
          this.isSpeakingActive = false;
          if (opts.onError) opts.onError(err);
          if (opts.onEnd) opts.onEnd();
        }
      };

      if (wasSpeaking) {
        setTimeout(scheduleSpeak, 60);
      } else {
        scheduleSpeak();
      }

      return true;
    } catch (err) {
      console.warn('Failed to invoke speech synthesis:', err);
      this.playChime('confirm');
      this.isSpeakingActive = false;
      if (opts.onError) opts.onError(err);
      if (opts.onEnd) opts.onEnd();
      return false;
    }
  }

  /**
   * Reads an AI Executive Voice Summary of a voice report aloud
   * Automatically adapts to available voices (Arabic if installed, English fallback if not)
   */
  public speakReportSummary(
    report: {
      driverName: string;
      language: string;
      aiExtraction: {
        destination?: { name: string } | null;
        totalExpense: number;
        expenses?: Array<{ category: string; amount: number }>;
      };
      transcription?: string;
      normalizedText?: string;
    },
    preferredLang?: 'ar' | 'en',
    onStart?: () => void,
    onEnd?: () => void
  ) {
    const lang = preferredLang || (report.language === 'en' ? 'en' : 'ar');
    const dest = report.aiExtraction.destination?.name || (lang === 'ar' ? 'الوجهة المحددة' : 'Destination');
    const total = report.aiExtraction.totalExpense || 0;

    const arPhrase = `تقرير صوتي من السائق ${report.driverName}. الوجهة: ${dest}. إجمالي المصروفات: ${total} ريال سعودي.`;
    const enPhrase = `AI Voice Report for Driver ${report.driverName}. Destination: ${dest}. Total recorded expenses: ${total} Saudi Riyals.`;

    const primaryText = lang === 'ar' ? arPhrase : enPhrase;
    const fallbackText = enPhrase;

    return this.speakText(primaryText, lang, {
      fallbackText,
      playChimeFirst: true,
      onStart,
      onEnd
    });
  }

  // -------------------------------------------------------------
  // 3. Web Speech Recognition (Browser-Native Speech-to-Text)
  // -------------------------------------------------------------
  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startSpeechRecognition(options: SpeechRecognitionOptions = {}): any {
    if (typeof window === 'undefined') return null;
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not available in this browser.');
      return null;
    }

    try {
      this.stopSpeechRecognition();

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Select recognition language
      const lang = (options.language || 'ar').toLowerCase();
      if (lang.startsWith('en')) {
        recognition.lang = 'en-US';
      } else if (lang.startsWith('ur')) {
        recognition.lang = 'ur-PK';
      } else if (lang.startsWith('ps')) {
        recognition.lang = 'ps-AF';
      } else {
        recognition.lang = 'ar-SA';
      }

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim && options.onInterimResult) {
          options.onInterimResult(interim);
        }
        if (final && options.onFinalResult) {
          options.onFinalResult(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (options.onError) options.onError(event);
      };

      recognition.onend = () => {
        this.activeRecognition = null;
        if (options.onEnd) options.onEnd();
      };

      recognition.start();
      this.activeRecognition = recognition;
      return recognition;
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
      if (options.onError) options.onError(err);
      return null;
    }
  }

  public stopSpeechRecognition() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch (e) {
        // ignore
      }
      this.activeRecognition = null;
    }
  }

  // -------------------------------------------------------------
  // 4. Client-side Synthetic Audio Generators for Playback
  // -------------------------------------------------------------
  public createToneWavBlob(frequency = 520, durationSeconds = 1.8): Blob {
    const sampleRate = 16000;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((Math.PI * i) / numSamples);
      const val = (Math.sin(2 * Math.PI * frequency * t) * 0.7 + Math.sin(2 * Math.PI * (frequency * 1.5) * t) * 0.3) * env;
      const s = Math.max(-1, Math.min(1, val));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Generates a realistic logistics radio transmission audio WAV blob
   * with squelch chime, vocal harmonics, and closing confirmation.
   */
  public createRadioAudioWavBlob(durationSeconds = 5.0, baseFreq = 480): Blob {
    const sampleRate = 16000;
    const safeDuration = Math.min(25, Math.max(2.5, durationSeconds));
    const numSamples = Math.floor(sampleRate * safeDuration);
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const squelchDuration = 0.15;
    const endSquelchStart = safeDuration - 0.15;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let s = 0;

      if (t < squelchDuration) {
        const freq = t < squelchDuration / 2 ? 660 : 880;
        const env = Math.sin((Math.PI * t) / squelchDuration);
        s = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
      } else if (t > endSquelchStart) {
        const localT = t - endSquelchStart;
        const freq = localT < squelchDuration / 2 ? 880 : 520;
        const env = Math.sin((Math.PI * localT) / squelchDuration);
        s = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
      } else {
        const cadence = (Math.sin(2 * Math.PI * 2.8 * t) + 1.2) * 0.4;
        const f1 = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 4 * t));
        const f2 = f1 * 1.5;
        const f3 = f1 * 2.2;
        const voiceHarmonics = (
          Math.sin(2 * Math.PI * f1 * t) * 0.45 +
          Math.sin(2 * Math.PI * f2 * t) * 0.25 +
          Math.sin(2 * Math.PI * f3 * t) * 0.15
        );
        const carrier = (Math.random() - 0.5) * 0.02;
        s = (voiceHarmonics * cadence) + carrier;
      }

      const clamped = Math.max(-0.95, Math.min(0.95, s));
      view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // -------------------------------------------------------------
  // 5. Diagnostics & Self-Test for UI
  // -------------------------------------------------------------
  public async testSoundAndVoice(): Promise<{
    audioContextOk: boolean;
    speechSynthesisOk: boolean;
    speechRecognitionOk: boolean;
    voicesCount: number;
    hasArabicVoice: boolean;
    hasEnglishVoice: boolean;
  }> {
    this.unlockAudio();

    const ctx = this.getAudioContext();
    const audioContextOk = !!ctx;
    const speechSynthesisOk = typeof window !== 'undefined' && !!window.speechSynthesis;
    const speechRecognitionOk = this.isSpeechRecognitionSupported();
    const voices = this.getAvailableVoices();
    const hasArabicVoice = this.hasVoiceForLanguage('ar');
    const hasEnglishVoice = this.hasVoiceForLanguage('en');

    // 1. Play chime immediately inside user gesture
    this.playChime('confirm');

    // 2. Speak voice confirmation
    this.speakText(
      'AI Voice and Sound system is active and ready.',
      'en',
      {
        fallbackText: 'Fleet Voice system ready.',
        playChimeFirst: false
      }
    );

    return {
      audioContextOk,
      speechSynthesisOk,
      speechRecognitionOk,
      voicesCount: voices.length,
      hasArabicVoice,
      hasEnglishVoice
    };
  }
}

export const audioService = new AudioService();
