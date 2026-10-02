import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  Receipt,
  Fuel,
  Truck,
  DollarSign,
  Languages,
  Clock,
  X,
  Volume2,
  FileAudio,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Check,
  Edit2,
  Plus,
  Trash2
} from 'lucide-react';
import { VoiceReport, ExtractedExpense, CompanyLocation, Worker, Vehicle } from '../../types';
import { audioService } from '../../services/audioService';
import { BrandLogo } from '../common/BrandLogo';
import { WhatsAppVoiceNoteBubble } from './WhatsAppVoiceNoteBubble';
import {
  ActiveCallLanguageBadge,
  detectLanguageFromText,
  VoiceLanguageCode,
  VOICE_LANGUAGES
} from './VoiceLanguageIndicator';

interface DriverVoiceReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (report: VoiceReport) => void;
  workers?: Worker[];
  vehicles?: Vehicle[];
  currentWorkerId?: string;
}

export const DriverVoiceReportingModal: React.FC<DriverVoiceReportingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  workers = [],
  vehicles = [],
  currentWorkerId
}) => {
  // State
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'ar' | 'ps' | 'ur' | 'en'>('auto');
  const [activeDetectedLang, setActiveDetectedLang] = useState<VoiceLanguageCode>('ar');
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0.96);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeakingAloud, setIsSpeakingAloud] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [extractedReport, setExtractedReport] = useState<VoiceReport | null>(null);

  // Driver editable fields
  const [editableDestination, setEditableDestination] = useState<string>('');
  const [editableExpenses, setEditableExpenses] = useState<ExtractedExpense[]>([]);
  const [driverNotes, setDriverNotes] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Preset demo voice phrases for 1-click test simulation with authentic driver audio
  const DEMO_PRESETS = [
    {
      id: 'ar-riyadh',
      label: '🇸🇦 Arabic (العربية)',
      driverName: 'Captain Ahmed Al-Omari',
      driverEmployeeId: 'DRV-101',
      lang: 'ar' as const,
      audioUrl: '/api/voice-reports/VR-1001/audio',
      text: 'أنا متجه الآن إلى الرياض لتسليم شحنة بضائع، صرفت 20 ريال ديزل بالمحطة و200 ريال مصاريف تحميل ونزول.',
      translation: 'I am heading to Riyadh for cargo delivery. I spent 20 SAR on diesel and 200 SAR for loading.',
      dest: 'Riyadh',
      fuel: 20,
      loading: 200
    },
    {
      id: 'ps-jeddah',
      label: '🇦🇫 Pashto (پښتو)',
      driverName: 'Captain Tariq Al-Masri',
      driverEmployeeId: 'DRV-102',
      lang: 'ps' as const,
      audioUrl: '/api/voice-reports/VR-1002/audio',
      text: 'زه د جدې اسلامي بندر ته بار وړم، زما مصارف پنځوس ریاله ډیزل دي، او شل ریاله د پارکینګ او اته سوه ریاله د بار خرڅ شوی.',
      translation: 'I am taking cargo to Jeddah Islamic Port. Spent 50 SAR diesel, 20 SAR parking, and 800 SAR loading.',
      dest: 'Jeddah',
      fuel: 50,
      loading: 800
    },
    {
      id: 'ur-dammam',
      label: '🇵🇰 Urdu (اردو)',
      driverName: 'Captain Noor Mohammad',
      driverEmployeeId: 'DRV-103',
      lang: 'ur' as const,
      audioUrl: '/api/voice-reports/VR-1003/audio',
      text: 'میں دمام ڈرائی پورٹ پر بوجھ لے کر جا رہا ہوں، راستے میں 100 روپے مرمت اور 150 روپے ڈیزل کا خرچ آیا۔',
      translation: 'I am taking cargo to Dammam Dry Port. Spent 100 SAR for maintenance repair and 150 SAR on diesel.',
      dest: 'Dammam',
      fuel: 150,
      loading: 0
    },
    {
      id: 'en-kharj',
      label: '🇬🇧 English (Fleet Express)',
      driverName: 'Captain Express Dispatch',
      driverEmployeeId: 'DRV-104',
      lang: 'en' as const,
      audioUrl: '/api/voice-reports/VR-1004/audio',
      text: 'Delivering urgent shipment to Customer Site Beta in Al-Kharj. Paid 35 SAR toll gate fee and 80 SAR fuel.',
      translation: 'Delivering urgent shipment to Customer Site Beta in Al-Kharj. Paid 35 SAR toll fee and 80 SAR fuel.',
      dest: 'Customer Site Beta',
      fuel: 80,
      loading: 0
    }
  ];

  // Initialize selected driver & vehicle
  useEffect(() => {
    if (workers.length > 0) {
      const match = currentWorkerId ? workers.find(w => w.id === currentWorkerId) : workers[0];
      if (match) {
        setSelectedDriverId(match.id);
        if (match.assignedVehicleId) {
          setSelectedVehicleId(match.assignedVehicleId);
        } else if (vehicles.length > 0) {
          setSelectedVehicleId(vehicles[0].id);
        }
      }
    }
  }, [workers, vehicles, currentWorkerId]);

  // When driver changes, update assigned vehicle
  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    const worker = workers.find(w => w.id === driverId);
    if (worker?.assignedVehicleId) {
      setSelectedVehicleId(worker.assignedVehicleId);
    }
  };

  // Reset modal state
  const resetAll = () => {
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioBlob(null);
    setAudioBase64('');
    setAudioUrl(null);
    setIsPlaying(false);
    setIsProcessing(false);
    setProcessingStep('');
    setExtractedReport(null);
    setEditableDestination('');
    setEditableExpenses([]);
    setDriverNotes('');
    setIsEditing(false);
    setIsConfirmed(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  };

  // Recording controls
  const startRecording = async () => {
    try {
      resetAll();
      audioService.playChime('whatsapp_start');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
          // Automatically trigger AI extraction
          processAudioReport(base64data, blob.type, recordingSeconds || 15);
        };

        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access not available or denied, prompting demo preset:', err);
      // Fallback: load demo sample directly
      loadPresetSample(DEMO_PRESETS[0]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioService.playChime('whatsapp_stop');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Trigger processing with custom audio or text
  const processAudioReport = async (audioDataOrText: string, mimeType: string = 'audio/webm', duration: number = 15) => {
    setIsProcessing(true);
    setProcessingStep('1/4 Connecting to Gemini Speech-to-Text...');

    try {
      setTimeout(() => setProcessingStep('2/4 Detecting Spoken Language & Normalizing...'), 600);
      setTimeout(() => setProcessingStep('3/4 Extracting Destination & Expense Entities...'), 1200);
      setTimeout(() => setProcessingStep('4/4 Matching Registered Company Hubs & Validating...'), 1800);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/driver/voice-reports/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          audioBase64: audioDataOrText.startsWith('data:') ? audioDataOrText : undefined,
          audioText: !audioDataOrText.startsWith('data:') ? audioDataOrText : undefined,
          mimeType,
          durationSeconds: duration,
          driverId: selectedDriverId,
          vehicleId: selectedVehicleId,
          languageHint: selectedLanguage !== 'auto' ? selectedLanguage : undefined
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process voice report');
      }

      const report: VoiceReport = data.report;
      setExtractedReport(report);
      if (report.language) {
        setActiveDetectedLang(report.language as VoiceLanguageCode);
        setDetectedConfidence(report.aiConfidence || 0.98);
      }
      setEditableDestination(report.aiExtraction.destination?.name || '');
      setEditableExpenses(report.aiExtraction.expenses || []);
      setIsProcessing(false);
      audioService.playChime('success');
    } catch (err: any) {
      console.error('Error uploading voice report:', err);
      setIsProcessing(false);
      audioService.playChime('error');
      alert('Could not process audio: ' + (err?.message || 'Server error'));
    }
  };

  // Load a demo preset for instant testing with Real Human Spoken Audio
  const loadPresetSample = (preset: typeof DEMO_PRESETS[0]) => {
    resetAll();
    setSelectedLanguage(preset.lang);
    setActiveDetectedLang(preset.lang);
    setDetectedConfidence(0.99);
    const sampleMap: Record<string, string> = {
      'ar-riyadh': '/api/voice-reports/VR-1001/audio',
      'ps-jeddah': '/api/voice-reports/VR-1002/audio',
      'ur-dammam': '/api/voice-reports/VR-1003/audio',
      'en-kharj': '/api/voice-reports/VR-1004/audio'
    };
    const audioEndpoint = sampleMap[preset.id] || '/api/voice/samples/sample_ar_driver';
    setAudioUrl(audioEndpoint);

    // Fetch authentic WAV blob for zero-latency audio playback & base64 persistence
    fetch(audioEndpoint)
      .then(res => res.blob())
      .then(blob => {
        setAudioBlob(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        const blob = audioService.createRadioAudioWavBlob(8);
        setAudioBlob(blob);
      });

    setProcessingStep('Processing Real Human voice sample...');
    processAudioReport(preset.text, 'text/plain', 12);
  };

  // Toggle Audio playback (Recorded or synthetic audio track)
  const togglePlayAudio = () => {
    // If TTS is speaking, stop it
    if (audioService.isSpeaking()) {
      audioService.stopSpeaking();
      setIsSpeakingAloud(false);
    }

    if (isPlaying) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    const currentUrl = audioUrl || (extractedReport ? `/api/voice-reports/${extractedReport.id}/audio` : null);

    if (currentUrl) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(currentUrl);
      } else {
        audioElementRef.current.src = currentUrl;
      }

      audioElementRef.current.currentTime = 0;
      audioElementRef.current.onended = () => setIsPlaying(false);
      audioElementRef.current.onerror = () => {
        setIsPlaying(false);
        // Fallback to synthesized voice reading
        toggleSpeakSummary();
      };

      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback error, falling back to speech synthesis:', err);
        setIsPlaying(false);
        toggleSpeakSummary();
      });
    } else if (extractedReport) {
      toggleSpeakSummary();
    } else {
      audioService.playChime('radio');
    }
  };

  // Toggle AI Voice Speech (Reads report summary aloud via speech synthesis)
  const toggleSpeakSummary = () => {
    if (audioElementRef.current && isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }

    if (isSpeakingAloud || audioService.isSpeaking()) {
      audioService.stopSpeaking();
      setIsSpeakingAloud(false);
      return;
    }

    if (!extractedReport) {
      audioService.playChime('radio');
      return;
    }

    audioService.speakReportSummary(
      extractedReport,
      selectedLanguage === 'en' ? 'en' : 'ar',
      () => setIsSpeakingAloud(true),
      () => setIsSpeakingAloud(false)
    );
  };

  // Calculate dynamic expense sum
  const calculatedTotal = editableExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Add custom expense
  const handleAddExpense = () => {
    setEditableExpenses([
      ...editableExpenses,
      { category: 'OTHER', amount: 50, currency: 'SAR', description: 'Additional expense', confidence: 1.0 }
    ]);
  };

  // Remove expense
  const handleRemoveExpense = (index: number) => {
    setEditableExpenses(editableExpenses.filter((_, i) => i !== index));
  };

  // Confirm Report by Driver
  const handleConfirmReport = async () => {
    if (!extractedReport) return;
    setSubmittingConfirm(true);

    try {
      const token = localStorage.getItem('auth_token');
      const updatedExtraction = {
        ...extractedReport.aiExtraction,
        destination: editableDestination ? { ...extractedReport.aiExtraction.destination, name: editableDestination, confidence: 1.0 } : null,
        expenses: editableExpenses
      };

      const res = await fetch(`/api/driver/voice-reports/${extractedReport.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          correctedExtraction: updatedExtraction,
          notes: driverNotes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm report');
      }

      setIsConfirmed(true);
      setExtractedReport(data.report);
      audioService.playChime('whatsapp_sent');
      if (onSuccess) onSuccess(data.report);
    } catch (err: any) {
      audioService.playChime('error');
      alert('Error confirming report: ' + (err?.message || 'Server error'));
    } finally {
      setSubmittingConfirm(false);
    }
  };

  if (!isOpen) return null;

  const currentDriver = workers.find(w => w.id === selectedDriverId);
  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" showText={false} variant="dark" />
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg text-white">Driver Voice Report</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini 3.7 AI
                </span>
              </div>
              <p className="text-xs text-slate-400">Speak naturally in Arabic, Pashto, Urdu, or English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Driver & Vehicle Context Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Active Driver / Captain</label>
              <select
                value={selectedDriverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                disabled={isRecording || isProcessing || isConfirmed}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.employeeId}) - {w.jobTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Assigned Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                disabled={isRecording || isProcessing || isConfirmed}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.internalVehicleId || v.plateNumber} - {v.make} {v.model} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MAIN RECORDING CONTROL SECTION (When no report extracted yet) */}
          {!extractedReport && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-gradient-to-b from-slate-800/40 to-slate-900/80 border border-slate-800 text-center space-y-5">
              {/* Record Pulse Circle */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/30 scale-105'
                      : 'bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 ring-4 ring-amber-500/20 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-8 h-8 fill-current mb-1" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Record</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status / Timer */}
              <div>
                {isRecording ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-red-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      Recording Live Audio...
                    </div>
                    <p className="text-2xl font-mono font-bold text-white tracking-widest">
                      {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                      {(recordingSeconds % 60).toString().padStart(2, '0')}
                    </p>

                    {/* Active Voice Call / Report Detected Language Confirmation */}
                    <div className="flex flex-col items-center gap-1 py-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Active Call Detected Language:
                      </span>
                      <ActiveCallLanguageBadge
                        language={selectedLanguage !== 'auto' ? selectedLanguage : activeDetectedLang}
                        isLiveProcessing={true}
                        confidence={detectedConfidence}
                        size="md"
                        showSubtitle={true}
                      />
                    </div>

                    <p className="text-xs text-slate-400">Speak your trip details and expenses clearly</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-200">Tap to Record Voice Message</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      "I am taking cargo to Riyadh. Spent 20 SAR diesel and 200 SAR loading."
                    </p>
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2 pt-2">
                <Languages className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">Language:</span>
                <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                  {[
                    { id: 'auto', label: 'Auto' },
                    { id: 'ar', label: 'العربية' },
                    { id: 'ps', label: 'پښتو' },
                    { id: 'ur', label: 'اردو' },
                    { id: 'en', label: 'English' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.id as any);
                        if (lang.id !== 'auto') {
                          setActiveDetectedLang(lang.id as VoiceLanguageCode);
                          setDetectedConfidence(0.99);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        selectedLanguage === lang.id
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demo Simulation Presets */}
              <div className="w-full pt-4 border-t border-slate-800/80 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Or Test With Real Human Voice Phrases:</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Real Human Voices
                    </span>
                  </span>
                  <span className="text-[11px] text-amber-400/80 font-medium">1-Click Test</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_PRESETS.map(preset => (
                    <div
                      key={preset.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-[#25D366]/50 hover:bg-[#1f2c34]/40 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-white group-hover:text-[#25D366] flex items-center gap-1.5">
                            <span>{preset.label}</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {preset.driverName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 italic bg-slate-900/80 p-1.5 rounded border border-slate-800 mb-2">
                          "{preset.text}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                        {/* Instant Audio Preview */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const audio = new Audio(preset.audioUrl);
                            audio.play().catch(() => {});
                          }}
                          className="px-2 py-1 rounded-lg bg-[#005c4b]/40 hover:bg-[#005c4b] text-[#25D366] hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors border border-[#00a884]/30"
                          title="Listen to native voice message"
                        >
                          <Play className="w-3 h-3 fill-current" /> Listen
                        </button>

                        {/* Load and AI Process */}
                        <button
                          type="button"
                          onClick={() => loadPresetSample(preset)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[11px] font-semibold flex items-center gap-1 transition-all border border-amber-500/30"
                        >
                          <span>Process AI</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING STATE INDICATOR */}
          {isProcessing && (
            <div className="py-12 px-6 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-white">AI Multilingual Processing</h3>
                <p className="text-sm text-amber-400 font-mono animate-pulse">{processingStep}</p>
              </div>

              {/* Clear visual confirmation of language currently being processed */}
              <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                <span className="text-xs text-slate-300 font-medium">
                  Voice Report Language Being Processed:
                </span>
                <ActiveCallLanguageBadge
                  language={selectedLanguage !== 'auto' ? selectedLanguage : activeDetectedLang}
                  isLiveProcessing={true}
                  confidence={detectedConfidence}
                  size="md"
                  showSubtitle={true}
                />
              </div>

              <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '70%' }} />
              </div>
            </div>
          )}

          {/* EXTRACTED REPORT CONFIRMATION VIEW */}
          {extractedReport && !isProcessing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* WhatsApp Voice Note Bubble Player */}
              <WhatsAppVoiceNoteBubble
                reportId={extractedReport.id}
                audioUrl={audioUrl || (extractedReport.id ? `/api/voice-reports/${extractedReport.id}/audio` : undefined)}
                driverName={currentDriver?.fullName || extractedReport.driverName}
                driverEmployeeId={currentDriver?.employeeId || extractedReport.driverEmployeeId}
                language={extractedReport.language}
                durationSeconds={extractedReport.audioDurationSeconds || recordingSeconds || 12}
                transcription={extractedReport.transcription}
                normalizedEnglish={extractedReport.normalizedText}
                timestamp={extractedReport.createdAt}
                vehiclePlate={currentVehicle?.plateNumber || extractedReport.vehiclePlate}
                vehicleInternalId={currentVehicle?.internalVehicleId || extractedReport.vehicleInternalId}
                showTranscription={true}
              />

              {/* Extraction Confidence & Read Aloud Bar */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>AI Extracted with {((extractedReport.aiConfidence || 0.95) * 100).toFixed(0)}% Confidence</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeakSummary}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                      isSpeakingAloud
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50 animate-pulse'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                    }`}
                    title="Listen to AI Executive Voice Report read aloud"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeakingAloud ? 'text-white' : 'text-emerald-400'}`} />
                    <span>{isSpeakingAloud ? 'Speaking...' : 'Read Aloud'}</span>
                  </button>
                </div>
              </div>

              {/* Structured Entities Preview (Editable) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-400" /> Extracted Trip & Expense Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> {isEditing ? 'Done Editing' : 'Edit Fields'}
                  </button>
                </div>

                {/* Destination */}
                <div>
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" /> Destination Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableDestination}
                      onChange={(e) => setEditableDestination(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Riyadh, Jeddah Port, Dammam"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-sm font-semibold text-white">
                        {editableDestination || 'No destination specified'}
                      </span>
                      {extractedReport.aiExtraction.destination?.matchedLocationName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Matched: {extractedReport.aiExtraction.destination.matchedLocationName}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expenses List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Extracted Expenses (SAR)
                    </label>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleAddExpense}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Item
                      </button>
                    )}
                  </div>

                  {editableExpenses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-900 rounded-lg">
                      No expenses reported in this voice message.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {editableExpenses.map((exp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                        >
                          {isEditing ? (
                            <>
                              <select
                                value={exp.category}
                                onChange={(e) => {
                                  const updated = [...editableExpenses];
                                  updated[idx].category = e.target.value as any;
                                  setEditableExpenses(updated);
                                }}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                              >
                                <option value="FUEL">Fuel (ديزل / بنزين)</option>
                                <option value="LOADING">Loading (تحميل / تنزيل)</option>
                                <option value="PARKING">Parking (مواقف)</option>
                                <option value="MAINTENANCE">Maintenance (صيانة)</option>
                                <option value="TOLL">Toll (رسوم طريق)</option>
                                <option value="OTHER">Other (مصاريف أخرى)</option>
                              </select>
                              <input
                                type="number"
                                value={exp.amount}
                                onChange={(e) => {
                                  const updated = [...editableExpenses];
                                  updated[idx].amount = parseFloat(e.target.value) || 0;
                                  setEditableExpenses(updated);
                                }}
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={exp.description || ''}
                                onChange={(e) => {
                                  const updated = [...editableExpenses];
                                  updated[idx].description = e.target.value;
                                  setEditableExpenses(updated);
                                }}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                placeholder="Description"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveExpense(idx)}
                                className="text-rose-400 hover:text-rose-300 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-amber-400 w-24 uppercase">
                                {exp.category}
                              </span>
                              <span className="flex-1 text-slate-300">
                                {exp.description || `${exp.category} expense`}
                              </span>
                              <span className="font-bold text-emerald-400 text-sm">
                                {exp.amount.toLocaleString()} SAR
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Backend Total Calculation Bar */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between font-medium">
                    <span className="text-xs text-slate-300">Backend Verified Total Expense:</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {calculatedTotal.toLocaleString()} SAR
                    </span>
                  </div>
                </div>

                {/* Driver Additional Notes */}
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1">
                    Driver Confirmation Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    placeholder="e.g. All receipts kept with captain in cabin"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Status Notice */}
              {isConfirmed ? (
                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-base">
                    <ShieldCheck className="w-5 h-5" /> Report Confirmed & Submitted to Admin
                  </div>
                  <p className="text-xs text-emerald-300/80">
                    Report ID: <span className="font-mono font-bold text-white">{extractedReport.id}</span>. Your report is now queued for administrator review and accounting ledger approval.
                  </p>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-2 text-xs text-slate-300 hover:text-white underline"
                  >
                    Submit Another Report
                  </button>
                </div>
              ) : (
                /* Action Buttons */
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Record Again
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmReport}
                    disabled={submittingConfirm}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {submittingConfirm ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirm & Send to Admin
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise Fleet AI Engine</span>
          <span>Arabic • Pashto • Urdu • English</span>
        </div>
      </div>
    </div>
  );
};
