import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  PhoneCall,
  PhoneOff,
  Activity,
  User,
  Shield,
  RefreshCw,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Globe,
  Languages
} from 'lucide-react';
import {
  ActiveCallLanguageBadge,
  ActiveCallLanguageConfirmationCard,
  detectLanguageFromText,
  VoiceLanguageCode,
  VOICE_LANGUAGES
} from './VoiceLanguageIndicator';

interface LiveVoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceConversationModal: React.FC<LiveVoiceConversationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Zephyr' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir'>('Zephyr');
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Marhaban! I am your Saudi Fleet & Logistics AI Voice Assistant powered by Gemini 3.1 Flash Live. Press "Start Live Conversation" and speak naturally or type in Arabic, English, Urdu, or Pashto.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentAiTranscript, setCurrentAiTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Detected Voice Report Language confirmation state for active calls
  const [detectedLanguage, setDetectedLanguage] = useState<VoiceLanguageCode>('ar');
  const [selectedLanguageMode, setSelectedLanguageMode] = useState<string>('auto');
  const [languageConfidence, setLanguageConfidence] = useState<number>(0.96);

  // Audio & WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentAiTranscript]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      disconnectLiveSession();
    }
    return () => {
      disconnectLiveSession();
    };
  }, [isOpen]);

  // Convert Float32Array PCM to 16kHz 16-bit mono PCM Little-Endian Base64
  const floatTo16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Play incoming 24kHz PCM Little-Endian chunk from Gemini Live
  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }
      const ctx = outputAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const binaryStr = window.atob(base64Audio);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Gapless scheduling
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setIsAiSpeaking(true);

      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx > -1) {
          activeSourcesRef.current.splice(idx, 1);
        }
        if (activeSourcesRef.current.length === 0) {
          setIsAiSpeaking(false);
        }
      };
    } catch (e) {
      console.warn('[LiveVoice] Error playing audio chunk:', e);
    }
  };

  // Stop pending audio buffers when interrupted
  const stopAllAudio = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // ignore
      }
    }
    activeSourcesRef.current = [];
    setIsAiSpeaking(false);
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const connectLiveSession = async () => {
    setErrorMessage(null);
    setIsConnecting(true);

    let micActive = false;

    // 1. Attempt Microphone setup (gracefully handles environments without mic or with restrictions)
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (e1) {
          // Fallback to basic audio constraint
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (stream) {
          mediaStreamRef.current = stream;
          const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000
          });
          inputAudioCtxRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(2048, 1, 1);
          scriptProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          // Handle live mic streaming to WebSocket
          processor.onaudioprocess = (e) => {
            if (isMutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
              return;
            }

            const inputChannel = e.inputBuffer.getChannelData(0);

            // Compute volume for visual feedback
            let sum = 0;
            for (let i = 0; i < inputChannel.length; i++) {
              sum += inputChannel[i] * inputChannel[i];
            }
            const rms = Math.sqrt(sum / inputChannel.length);
            setAudioLevel(Math.min(100, Math.round(rms * 400)));

            // Send 16kHz PCM Little-Endian base64
            const base64Audio = floatTo16BitPCMBase64(inputChannel);
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              audio: base64Audio,
              mimeType: 'audio/pcm;rate=16000'
            }));
          };

          micActive = true;
        }
      }
    } catch (micErr: any) {
      console.log('[LiveVoice] Microphone not detected or permission restricted. Operating in Text & Live Audio Speaker mode:', micErr?.message || micErr);
      micActive = false;
    }

    setIsMicAvailable(micActive);

    // 2. Establish WebSocket to server Live API bridge
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-assistant?voice=${selectedVoice}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        setTranscriptHistory(prev => [
          ...prev,
          {
            sender: 'ai',
            text: micActive
              ? `🟢 Connected with voice "${selectedVoice}". You can now speak in Arabic, English, Urdu, or Pashto.`
              : `🟢 Connected with voice "${selectedVoice}". (Microphone inactive - Type or use Quick Prompts; Live AI audio responses will play via speaker).`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio' && data.audio) {
            playAudioChunk(data.audio);
          }

          if (data.type === 'transcript_delta' && data.text) {
            setCurrentAiTranscript(prev => prev + data.text);
            if (selectedLanguageMode === 'auto') {
              const detected = detectLanguageFromText(data.text);
              if (detected.confidence >= 0.9) {
                setDetectedLanguage(detected.lang);
                setLanguageConfidence(detected.confidence);
              }
            }
          }

          if (data.type === 'turn_complete') {
            setCurrentAiTranscript(curr => {
              if (curr.trim()) {
                if (selectedLanguageMode === 'auto') {
                  const detected = detectLanguageFromText(curr);
                  setDetectedLanguage(detected.lang);
                  setLanguageConfidence(detected.confidence);
                }
                setTranscriptHistory(prev => [
                  ...prev,
                  {
                    sender: 'ai',
                    text: curr.trim(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }
              return '';
            });
          }

          if (data.type === 'interrupted') {
            stopAllAudio();
          }

          if (data.type === 'error') {
            setErrorMessage(data.message || 'Live session encountered an error.');
          }
        } catch (e) {
          console.warn('[LiveVoice] Message parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[LiveVoice] WebSocket error:', err);
        setErrorMessage('Failed to connect to Live API bridge. Please check server and GEMINI_API_KEY.');
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };

    } catch (err: any) {
      console.error('[LiveVoice] Setup error:', err);
      setErrorMessage(err?.message || 'Could not initiate Live Audio session.');
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const disconnectLiveSession = () => {
    stopAllAudio();

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {
        // ignore
      }
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {
        // ignore
      }
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
  };

  const handleSendTextMessage = () => {
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const userText = textInput.trim();

    // Dynamically detect language from user's spoken or typed report
    if (selectedLanguageMode === 'auto') {
      const detected = detectLanguageFromText(userText);
      setDetectedLanguage(detected.lang);
      setLanguageConfidence(detected.confidence);
    }

    setTranscriptHistory(prev => [
      ...prev,
      {
        sender: 'user',
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    wsRef.current.send(JSON.stringify({
      type: 'text',
      text: userText
    }));

    setTextInput('');
  };

  const handleVoiceChange = (voice: 'Zephyr' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir') => {
    setSelectedVoice(voice);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'change_voice',
        voice
      }));
    }
  };

  const QUICK_PROMPTS = [
    { label: '🇸🇦 Arabic (تقرير رحلة الرياض)', lang: 'ar' as VoiceLanguageCode, text: 'أنا الكابتن أحمد، وصلت إلى مستودع الرياض وسجلت 50 ريال ديزل و200 ريال تحميل.' },
    { label: '🇦🇫 Pashto (د بار او مصارفو راپور)', lang: 'ps' as VoiceLanguageCode, text: 'زه د جدې اسلامي بندر ته بار وړم، زما مصارف پنځوس ریاله ډیزل دي، او اته سوه ریاله د بار خرڅ شوی.' },
    { label: '🇵🇰 Urdu (دمام ٹرپ اور خرچ رپورٹ)', lang: 'ur' as VoiceLanguageCode, text: 'میں دمام ڈرائی پورٹ پر بوجھ لے کر جا رہا ہوں، راستے میں 100 روپے مرمت اور 150 روپے ڈیزل کا خرچ آیا۔' },
    { label: '🇬🇧 English (Trip & Fuel Report)', lang: 'en' as VoiceLanguageCode, text: 'Delivering urgent shipment to Customer Site Beta in Al-Kharj. Paid 35 SAR toll gate fee and 80 SAR fuel.' },
    { label: '🚨 Report Najm Accident', lang: 'ar' as VoiceLanguageCode, text: 'وقع حادث اصطدام بسيط على طريق الرياض مكة، ما هي خطوات بلاغ نجم الفورية؟' },
    { label: '⛽ Fuel & Expense Log', lang: 'ar' as VoiceLanguageCode, text: 'سجلت الآن فاتورة وقود ديزل بمبلغ 120 ريال في محطة ساسكو بالدمام.' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 text-white border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">AI Live Voice Conversation</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                  gemini-3.1-flash-live-preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Low-latency, real-time two-way voice stream with Gemini Live API (16kHz in / 24kHz out)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* ACTIVE CALL DETECTED LANGUAGE BADGE */}
            {isConnected && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Call Language</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Report Processing</span>
                </div>
                <ActiveCallLanguageBadge
                  language={detectedLanguage}
                  isLiveProcessing={true}
                  confidence={languageConfidence}
                  size="sm"
                  showSubtitle={false}
                />
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="px-6 py-3 bg-red-950/80 border-b border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Central Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Left Column: Voice Selector & Live Waveform Visualizer */}
          <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between bg-slate-950/40">
            <div>
              {/* Voice Choice */}
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                AI Dispatcher Voice
              </label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { id: 'Zephyr', name: 'Zephyr', role: 'Executive Female' },
                  { id: 'Puck', name: 'Puck', role: 'Natural Male Driver' },
                  { id: 'Kore', name: 'Kore', role: 'Warm Dispatcher' },
                  { id: 'Charon', name: 'Charon', role: 'Command Baritone' },
                  { id: 'Fenrir', name: 'Fenrir', role: 'Field Coordinator' }
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVoiceChange(v.id as any)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      selectedVoice === v.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{v.name}</div>
                    <div className="text-[10px] opacity-75">{v.role}</div>
                  </button>
                ))}
              </div>

              {/* Status Visualizer Circle */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-3xl border border-slate-800 mb-6">
                <div className="relative flex items-center justify-center mb-4">
                  {/* Outer pulse wave */}
                  {isConnected && (
                    <motion.div
                      animate={{
                        scale: isAiSpeaking ? [1, 1.4, 1] : audioLevel > 10 ? [1, 1.25, 1] : 1,
                        opacity: isAiSpeaking ? [0.4, 0.8, 0.4] : 0.2
                      }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className={`absolute inset-0 rounded-full ${
                        isAiSpeaking ? 'bg-emerald-500' : 'bg-cyan-500'
                      }`}
                    />
                  )}

                  {/* Main Avatar Button */}
                  <div
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${
                      isConnected
                        ? isAiSpeaking
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'border-cyan-400 bg-slate-950 text-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isConnected ? (
                      isAiSpeaking ? (
                        <Volume2 className="w-10 h-10 animate-bounce" />
                      ) : (
                        <Mic className="w-10 h-10 animate-pulse" />
                      )
                    ) : (
                      <PhoneOff className="w-10 h-10" />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold text-slate-100 mb-0.5">
                    {isConnected
                      ? isAiSpeaking
                        ? 'Gemini Live Speaking...'
                        : isMicAvailable
                        ? audioLevel > 15
                          ? 'Listening to your voice...'
                          : 'Listening (Speak freely)'
                        : 'Live Audio Ready (Text & Speaker Mode)'
                      : 'Disconnected'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isConnected
                      ? isMicAvailable
                        ? 'Full-duplex audio stream with live interruption handling'
                        : 'Real-time Gemini voice output stream (Type below or use prompts)'
                      : 'Press the green button to start live session'}
                  </p>
                </div>

                {/* Animated Equalizer Waveform Bars */}
                {isConnected && (
                  <div className="flex items-center justify-center gap-1 mt-4 h-6">
                    {[40, 75, 90, 60, 100, 70, 85, 45, 95, 60].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: isAiSpeaking
                            ? [`${15 + (i % 4) * 10}%`, `${h}%`, `${10 + (i % 3) * 15}%`]
                            : audioLevel > 10
                            ? [`${audioLevel * 0.4}%`, `${audioLevel * 0.8}%`, `${audioLevel * 0.3}%`]
                            : '15%'
                        }}
                        transition={{ repeat: Infinity, duration: 0.4 + (i % 3) * 0.2 }}
                        className={`w-1.5 rounded-full ${
                          isAiSpeaking ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Active Voice Call Detected Language Visual Confirmation Card */}
              {isConnected && (
                <div className="mb-4">
                  <ActiveCallLanguageConfirmationCard
                    detectedLanguage={detectedLanguage}
                    selectedLanguage={selectedLanguageMode}
                    onSelectLanguage={(lang) => {
                      setSelectedLanguageMode(lang);
                      if (lang !== 'auto') {
                        setDetectedLanguage(lang as VoiceLanguageCode);
                        setLanguageConfidence(0.99);
                      }
                    }}
                    title="Active Call Detected Language"
                    subtitle="Gemini AI is processing your live voice report in"
                  />
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="space-y-3">
              {!isConnected ? (
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={connectLiveSession}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting Live API Bridge...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-5 h-5" />
                      <span>Start Live Conversation</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`flex-1 py-3 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isMuted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                    <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopAllAudio}
                    title="Interrupt AI Speaking"
                    className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <VolumeX className="w-4 h-4 text-amber-400" />
                    <span>Interrupt</span>
                  </button>

                  <button
                    type="button"
                    onClick={disconnectLiveSession}
                    className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-950"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Live Transcript Stream & Text Fallback */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-slate-900/90 h-[500px] md:h-auto">
            {/* Quick Prompts */}
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Voice Prompts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => {
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        if (selectedLanguageMode === 'auto' && qp.lang) {
                          setDetectedLanguage(qp.lang);
                          setLanguageConfidence(0.99);
                        }
                        setTranscriptHistory(prev => [
                          ...prev,
                          {
                            sender: 'user',
                            text: qp.text,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                        wsRef.current.send(JSON.stringify({ type: 'text', text: qp.text }));
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Transcript Log */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 custom-scrollbar mb-3"
            >
              {transcriptHistory.map((item, index) => {
                const itemLang = detectLanguageFromText(item.text);
                const langMeta = VOICE_LANGUAGES[itemLang.lang] || VOICE_LANGUAGES.ar;

                return (
                  <div
                    key={index}
                    className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        item.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-[10px]">
                        <div className="flex items-center gap-1.5 opacity-75">
                          {item.sender === 'user' ? (
                            <>
                              <User className="w-3 h-3" />
                              <span>You (Driver/Dispatch)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Gemini Live Assistant ({selectedVoice})</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{item.time}</span>
                        </div>

                        {/* Detected Language Flag & Label */}
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300 font-medium text-[9px] shrink-0"
                          title={`Detected Language: ${langMeta.label} (${langMeta.nativeName})`}
                        >
                          <span>{langMeta.flag}</span>
                          <span>{langMeta.label}</span>
                        </span>
                      </div>
                      <div dir={langMeta.direction}>{item.text}</div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming Live AI Partial Transcript */}
              {currentAiTranscript && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs leading-relaxed bg-slate-800 text-emerald-300 border border-emerald-500/30">
                    <div className="flex items-center justify-between gap-2 mb-1 text-[10px]">
                      <div className="flex items-center gap-1.5 opacity-80">
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                        <span>Speaking Live...</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-medium text-[9px]">
                        <span>{VOICE_LANGUAGES[detectedLanguage]?.flag || '🇸🇦'}</span>
                        <span>{VOICE_LANGUAGES[detectedLanguage]?.label || 'Arabic'}</span>
                      </span>
                    </div>
                    <div dir={VOICE_LANGUAGES[detectedLanguage]?.direction || 'rtl'}>{currentAiTranscript}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Input form for typed queries during live call */}
            <div className="flex gap-2">
              <input
                type="text"
                disabled={!isConnected}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendTextMessage();
                  }
                }}
                placeholder={
                  isConnected
                    ? 'Type a message to Gemini Live or speak into your mic...'
                    : 'Connect to Gemini Live to chat...'
                }
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!isConnected || !textInput.trim()}
                onClick={handleSendTextMessage}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
