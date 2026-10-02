import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Globe,
  MapPin,
  FileAudio,
  Search,
  ExternalLink,
  Mic,
  Square,
  Copy,
  Check,
  Fuel,
  ShieldCheck,
  Truck,
  Wrench,
  Navigation,
  Star,
  RefreshCw,
  Send,
  Radio,
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GoogleSearchAgent } from '../components/ai/GoogleSearchAgent';

interface FleetIntelligenceViewProps {
  onOpenLiveVoice?: () => void;
}

export const FleetIntelligenceView: React.FC<FleetIntelligenceViewProps> = ({
  onOpenLiveVoice
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'transcribe'>('search');

  // Search Grounding state (gemini-3.5-flash + googleSearch)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    answer: string;
    sources: Array<{ title: string; url: string }>;
    searchQueries: string[];
    provider: string;
  } | null>(null);

  // Maps Grounding state (gemini-3.5-flash + googleMaps)
  const [mapsQuery, setMapsQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Riyadh',
    lat: 24.7136,
    lng: 46.6753
  });
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);
  const [mapsResult, setMapsResult] = useState<{
    answer: string;
    places: Array<{
      title: string;
      uri?: string;
      address?: string;
      rating?: number;
      reviewSnippets?: string[];
    }>;
    locationUsed?: { latitude: number; longitude: number };
    provider: string;
  } | null>(null);

  // Transcription state (gemini-3.5-transcribe)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<{
    transcription: string;
    detectedLanguage: string;
    confidence: number;
    provider: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Search Grounding Quick Prompts
  const SEARCH_PRESETS = [
    'Official Saudi Aramco retail Diesel and Petrol 91/95 rates this month',
    'Saudi Muroor heavy truck daytime ban timings in Riyadh Ring Roads',
    'Najm commercial truck accident liability reporting protocols',
    'ZATCA transport e-invoicing Phase 2 QR-code rules for logistics fleets',
    'Qiwa & Balagh driver contract transfer rules for Saudi transport companies'
  ];

  // Maps Grounding Quick Prompts
  const MAPS_PRESETS = [
    '24/7 SASCO and Aldrees high-flow diesel truck stops on Route 40 & Route 10',
    'Certified heavy commercial truck workshops in Riyadh Al-Sina\'iyah',
    'Saudi Port Logistics parks and dry ports container yards in Dammam & Jeddah',
    'Heavy vehicle periodic inspection (MVPI) testing stations in Riyadh'
  ];

  const SAUDI_CITIES = [
    { name: 'Riyadh (Central)', lat: 24.7136, lng: 46.6753 },
    { name: 'Jeddah (Western)', lat: 21.4858, lng: 39.1925 },
    { name: 'Dammam / Khobar (Eastern)', lat: 26.4207, lng: 50.0888 },
    { name: 'Mecca', lat: 21.3891, lng: 39.8579 },
    { name: 'Medina', lat: 24.5247, lng: 39.5692 },
    { name: 'Jubail Industrial', lat: 27.0046, lng: 49.6601 },
    { name: 'Yanbu Port', lat: 24.0895, lng: 38.0618 }
  ];

  // Execute Search Grounding
  const handleExecuteSearch = async (queryText?: string) => {
    const q = (queryText || searchQuery).trim();
    if (!q) return;

    setSearchQuery(q);
    setIsSearching(true);
    setSearchResult(null);

    try {
      const res = await fetch('/api/ai/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult({
          answer: data.answer,
          sources: data.sources || [],
          searchQueries: data.searchQueries || [],
          provider: data.provider || 'gemini-3.5-flash (Google Search Grounded)'
        });
      } else {
        setSearchResult({
          answer: 'Unable to complete search: ' + (data.error || 'Server error'),
          sources: [],
          searchQueries: [],
          provider: 'Error'
        });
      }
    } catch (e: any) {
      setSearchResult({
        answer: 'Failed to connect to search service: ' + (e?.message || 'Network error'),
        sources: [],
        searchQueries: [],
        provider: 'Error'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Execute Maps Grounding
  const handleExecuteMaps = async (queryText?: string) => {
    const q = (queryText || mapsQuery).trim();
    if (!q) return;

    setMapsQuery(q);
    setIsSearchingMaps(true);
    setMapsResult(null);

    try {
      const res = await fetch('/api/ai/grounded-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          latitude: selectedCity.lat,
          longitude: selectedCity.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setMapsResult({
          answer: data.answer,
          places: data.places || [],
          locationUsed: data.locationUsed,
          provider: data.provider || 'gemini-3.5-flash (Google Maps Grounded)'
        });
      } else {
        setMapsResult({
          answer: 'Unable to retrieve map locations: ' + (data.error || 'Server error'),
          places: [],
          provider: 'Error'
        });
      }
    } catch (e: any) {
      setMapsResult({
        answer: 'Failed to connect to maps service: ' + (e?.message || 'Network error'),
        places: [],
        provider: 'Error'
      });
    } finally {
      setIsSearchingMaps(false);
    }
  };

  // Audio Recording for gemini-3.5-transcribe
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setAudioBase64(b64);
          executeTranscribe(b64);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setTranscriptionResult(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.warn('[Transcription] Microphone setup notice:', e?.message || e);
      setTranscriptionResult({
        transcription: 'Microphone device not detected or permission is restricted. Please enable microphone permissions in your browser to record audio.',
        detectedLanguage: 'en',
        confidence: 0,
        provider: 'Audio Device Notice'
      });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const executeTranscribe = async (b64: string) => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: b64,
          mimeType: 'audio/webm'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTranscriptionResult({
          transcription: data.transcription,
          detectedLanguage: data.detectedLanguage || 'ar',
          confidence: data.confidence || 0.95,
          provider: data.provider || 'gemini-3.5-transcribe'
        });
      } else {
        setTranscriptionResult({
          transcription: 'Transcription failed: ' + (data.error || 'Unknown error'),
          detectedLanguage: 'en',
          confidence: 0,
          provider: 'Error'
        });
      }
    } catch (e: any) {
      setTranscriptionResult({
        transcription: 'Failed to connect to transcription service: ' + e?.message,
        detectedLanguage: 'en',
        confidence: 0,
        provider: 'Error'
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Saudi Fleet AI Grounding Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Fleet Regulatory & Geo-Intelligence Hub
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Verify transport compliance, monitor live Saudi fuel benchmarks, locate heavy vehicle maintenance workshops, and transcribe multilingual dispatch voice logs with real-time Google Grounding.
            </p>
          </div>

          {onOpenLiveVoice && (
            <button
              type="button"
              onClick={onOpenLiveVoice}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span>Launch Live Voice Call (gemini-3.1-flash-live-preview)</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Google Search Agent (Current Events • News • Fact-Check)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maps')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'maps'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Google Maps Places Grounding (gemini-3.5-flash)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transcribe')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transcribe'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileAudio className="w-4 h-4" />
          <span>Multilingual Transcription (gemini-3.5-transcribe)</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE SEARCH AGENT (Current Events, News Citation & Fact-Checking) */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <GoogleSearchAgent />
        </div>
      )}

      {/* TAB 2: MAPS GROUNDING */}
      {activeTab === 'maps' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                Google Maps Fleet Places & Workshop Finder
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounded directly in Google Maps place entities using <code className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">gemini-3.5-flash</code> with <code className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">googleMaps</code> tool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={mapsQuery}
                  onChange={(e) => setMapsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteMaps()}
                  placeholder="e.g. Heavy truck repairs in Al-Sina'iyah, 24/7 SASCO diesel station..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <select
                  value={selectedCity.name}
                  onChange={(e) => {
                    const c = SAUDI_CITIES.find(x => x.name === e.target.value) || SAUDI_CITIES[0];
                    setSelectedCity(c);
                  }}
                  className="w-full py-3 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-cyan-500"
                >
                  {SAUDI_CITIES.map((c, i) => (
                    <option key={i} value={c.name}>
                      📍 {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isSearchingMaps || !mapsQuery.trim()}
                onClick={() => handleExecuteMaps()}
                className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-cyan-950 cursor-pointer"
              >
                {isSearchingMaps ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Find Places Grounded</span>
                  </>
                )}
              </button>
            </div>

            {/* Maps Quick Presets */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Popular Fleet Navigation Presets
              </div>
              <div className="flex flex-wrap gap-2">
                {MAPS_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleExecuteMaps(preset)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Maps Results */}
          {mapsResult && (
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {mapsResult.answer}
              </div>

              {mapsResult.places && mapsResult.places.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mapsResult.places.map((place, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span>{place.title}</span>
                          </h4>
                          {place.rating && (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 shrink-0">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{place.rating}</span>
                            </span>
                          )}
                        </div>

                        {place.address && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{place.address}</span>
                          </p>
                        )}

                        {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 italic">
                            "{place.reviewSnippets[0]}"
                          </div>
                        )}
                      </div>

                      {place.uri && (
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <span>Open Location in Google Maps</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIO TRANSCRIPTION */}
      {activeTab === 'transcribe' && (
        <div className="space-y-6">
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse text-red-500' : ''}`} />
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Live Multilingual Audio Transcription Studio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mb-6 leading-relaxed">
              Record microphone audio in Arabic, Pashto, Urdu, or English. Model{' '}
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">gemini-3.5-transcribe</span> extracts verbatim text with high precision.
            </p>

            {!isRecording ? (
              <button
                type="button"
                disabled={isTranscribing}
                onClick={startRecording}
                className="py-3.5 px-8 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-950 transition-all cursor-pointer active:scale-95"
              >
                <Mic className="w-5 h-5" />
                <span>Start Audio Recording</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">
                  <span className="w-3 h-3 rounded-full bg-red-600" />
                  <span>Recording in progress: {recordingSeconds}s</span>
                </div>

                <button
                  type="button"
                  onClick={stopRecording}
                  className="py-3.5 px-8 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer active:scale-95"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>Stop & Transcribe with Gemini</span>
                </button>
              </div>
            )}

            {isTranscribing && (
              <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transcribing audio with gemini-3.5-transcribe...</span>
              </div>
            )}
          </div>

          {/* Transcription Results */}
          {transcriptionResult && (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Accurate Verbatim Transcript
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase font-mono font-bold">
                    Detected: {transcriptionResult.detectedLanguage} ({(transcriptionResult.confidence * 100).toFixed(0)}% Confidence)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(transcriptionResult.transcription)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-base text-slate-800 dark:text-slate-100 leading-relaxed">
                {transcriptionResult.transcription}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
