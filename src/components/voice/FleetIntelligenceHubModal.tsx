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
  X,
  Navigation,
  Star,
  RefreshCw,
  Send,
  Radio,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { ActiveCallLanguageBadge } from './VoiceLanguageIndicator';
import { GoogleSearchAgent } from '../ai/GoogleSearchAgent';

interface FleetIntelligenceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'search' | 'maps' | 'transcribe';
  onOpenLiveVoice?: () => void;
}

export const FleetIntelligenceHubModal: React.FC<FleetIntelligenceHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'search',
  onOpenLiveVoice
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'maps' | 'transcribe'>(initialTab);

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
    'Current official Saudi Aramco retail Diesel and Petrol prices today',
    'Saudi Muroor heavy truck daytime entry ban hours in Riyadh and Jeddah',
    'Najm commercial vehicle accident reporting steps and required documents',
    'ZATCA transport e-invoicing Phase 2 requirements for logistics fleets',
    'Qiwa & Ministry of Human Resources driver Iqama transfer regulations'
  ];

  // Maps Grounding Quick Prompts
  const MAPS_PRESETS = [
    '24/7 SASCO & Aldrees heavy truck diesel stations on Highway 40',
    'Certified heavy commercial truck maintenance workshops in Riyadh Al-Sina\'iyah',
    'Truck weigh stations and rest areas between Riyadh and Dammam',
    'Authorized vehicle inspection (MVPI) centers for heavy trucks in Jeddah'
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
          provider: data.provider || 'gemini-3.5-flash (Google Search)'
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
          provider: data.provider || 'gemini-3.5-flash (Google Maps)'
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
        transcription: 'Microphone device not detected or permission is restricted. You can upload an audio sample or test search/maps grounding.',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-slate-900 text-white border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Saudi Fleet AI Grounding & Intelligence Hub</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Gemini Multi-Model Suite
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ground answers in real-time Google Search data, Google Maps places, and high-accuracy speech transcription
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLiveVoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLiveVoice();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Voice Call</span>
              </button>
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

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-3 px-2 border-b-2 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Google Search Agent</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-400">
              gemini-3.8-flash
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maps')}
            className={`py-3 px-2 border-b-2 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'maps'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Maps Grounding (Places)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-400">
              gemini-3.5-flash
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transcribe')}
            className={`py-3 px-2 border-b-2 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'transcribe'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Audio Transcription</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950 border border-amber-800 text-amber-400">
              gemini-3.5-transcribe
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {/* TAB 1: GOOGLE SEARCH AGENT (Current Events, News Citation & Fact-Checking) */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <GoogleSearchAgent compact={true} />
            </div>
          )}

          {/* TAB 2: GOOGLE MAPS GROUNDING */}
          {activeTab === 'maps' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Search Places, Heavy Truck Repair, Gas Stations & Logistics Hubs
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={mapsQuery}
                        onChange={(e) => setMapsQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleExecuteMaps()}
                        placeholder="e.g. 24/7 SASCO diesel truck stops, Mercedes truck repair workshop..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSearchingMaps || !mapsQuery.trim()}
                      onClick={() => handleExecuteMaps()}
                      className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950 cursor-pointer"
                    >
                      {isSearchingMaps ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Searching Maps...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          <span>Find Places</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* City Anchor Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Location Anchor (Saudi City)
                  </label>
                  <select
                    value={selectedCity.name}
                    onChange={(e) => {
                      const c = SAUDI_CITIES.find(x => x.name === e.target.value) || SAUDI_CITIES[0];
                      setSelectedCity(c);
                    }}
                    className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500"
                  >
                    {SAUDI_CITIES.map((c, i) => (
                      <option key={i} value={c.name}>
                        {c.name} ({c.lat.toFixed(2)}, {c.lng.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Maps Quick Presets */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Common Logistics & Fleet Location Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {MAPS_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleExecuteMaps(preset)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Maps Results Cards */}
              {mapsResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap">
                    {mapsResult.answer}
                  </div>

                  {mapsResult.places && mapsResult.places.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mapsResult.places.map((place, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
                                <span>{place.title}</span>
                              </h4>
                              {place.rating && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 shrink-0">
                                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                                  <span>{place.rating}</span>
                                </span>
                              )}
                            </div>

                            {place.address && (
                              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{place.address}</span>
                              </p>
                            )}

                            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                              <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 mb-3 italic">
                                "{place.reviewSnippets[0]}"
                              </div>
                            )}
                          </div>

                          {place.uri && (
                            <a
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span>Open in Google Maps</span>
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

          {/* TAB 3: AUDIO TRANSCRIPTION (gemini-3.5-transcribe) */}
          {activeTab === 'transcribe' && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mb-4">
                  <Mic className={`w-8 h-8 ${isRecording ? 'animate-pulse text-red-400' : ''}`} />
                </div>

                <h4 className="text-sm font-bold text-slate-100 mb-1">
                  High-Precision Audio Transcription Studio
                </h4>
                <p className="text-xs text-slate-400 max-w-md mb-6">
                  Speak into your microphone in Arabic, Pashto, Urdu, or English. Model{' '}
                  <span className="text-amber-400 font-mono">gemini-3.5-transcribe</span> will transcribe verbatim.
                </p>

                {/* Record Button */}
                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isTranscribing}
                    onClick={startRecording}
                    className="py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950 transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recording Audio</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>Recording: {recordingSeconds}s</span>
                    </div>

                    <button
                      type="button"
                      onClick={stopRecording}
                      className="py-3 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop & Transcribe with Gemini</span>
                    </button>
                  </div>
                )}

                {isTranscribing && (
                  <div className="mt-4 flex items-center gap-2 text-amber-300 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing transcription with gemini-3.5-transcribe...</span>
                  </div>
                )}
              </div>

              {/* Transcription Results */}
              {transcriptionResult && (
                <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">Verbatim Transcription</span>
                      <ActiveCallLanguageBadge
                        language={transcriptionResult.detectedLanguage}
                        isLiveProcessing={false}
                        confidence={transcriptionResult.confidence}
                        size="sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(transcriptionResult.transcription)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-sm text-slate-100 leading-relaxed font-sans">
                    {transcriptionResult.transcription}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
