import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  FlipHorizontal,
  Zap,
  ZapOff,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  QrCode,
  Sparkles,
  RefreshCw,
  FileImage,
  Layers,
  ArrowRight
} from 'lucide-react';
import jsQR from 'jsqr';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { SaudiPlate } from './SaudiPlate';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectWorker: (workerId: string) => void;
}

interface ScanResultMatch {
  type: 'VEHICLE' | 'WORKER';
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  plateEn?: string;
  plateAr?: string;
  iqamaNumber?: string;
  rawData: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectVehicle,
  onSelectWorker
}) => {
  const { t, dir } = useLanguage();
  const { token } = useAuth();

  // Camera & Stream states
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Lookup & Feedback states
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [resolving, setResolving] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<ScanResultMatch | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState<string>('');

  // Mode tabs: CAMERA vs UPLOAD vs SAMPLE_CODES
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'UPLOAD' | 'SAMPLES'>('CAMERA');

  // Sample fleet/worker demo QR tags for testing without physical labels
  const [sampleAssets, setSampleAssets] = useState<{
    vehicles: any[];
    workers: any[];
  }>({ vehicles: [], workers: [] });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Play audio beep tone on detection
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz tone (A5)
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio might be blocked before user interaction
    }

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Ignore vibration errors
      }
    }
  }, []);

  // Fetch sample assets for the quick testing drawer
  useEffect(() => {
    if (!isOpen) return;

    const fetchSamples = async () => {
      try {
        const [vRes, wRes] = await Promise.all([
          fetch('/api/vehicles', { headers: getAuthHeaders(token) }),
          fetch('/api/workers', { headers: getAuthHeaders(token) })
        ]);
        const vData = vRes.ok ? await vRes.json() : [];
        const wData = wRes.ok ? await wRes.json() : [];
        setSampleAssets({
          vehicles: Array.isArray(vData) ? vData.slice(0, 4) : [],
          workers: Array.isArray(wData) ? wData.slice(0, 4) : []
        });
      } catch {
        // Ignore sample loading error
      }
    };
    fetchSamples();
  }, [isOpen, token]);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  }, []);

  // Parse and resolve scanned text into actual Vehicle or Worker
  const processScannedCode = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    playBeep();
    setScannedRaw(trimmed);
    setResolving(true);
    setResolveError(null);
    setMatchResult(null);

    try {
      // 1. Try parsing JSON payload
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'VEHICLE' && parsed.id) {
            const vRes = await fetch(`/api/vehicles/${parsed.id}`, { headers: getAuthHeaders(token) });
            if (vRes.ok) {
              const v = await vRes.json();
              setMatchResult({
                type: 'VEHICLE',
                id: v.id,
                title: `${v.make} ${v.model} (${v.year})`,
                subtitle: `VIN: ${v.vin} • ID: ${v.internalVehicleId || v.id}`,
                badge: v.status,
                plateEn: v.plateEn,
                plateAr: v.plateAr,
                rawData: trimmed
              });
              setResolving(false);
              return;
            }
          } else if (parsed.type === 'WORKER' && parsed.id) {
            const wRes = await fetch(`/api/workers/${parsed.id}`, { headers: getAuthHeaders(token) });
            if (wRes.ok) {
              const w = await wRes.json();
              setMatchResult({
                type: 'WORKER',
                id: w.id,
                title: `${w.nameEn} / ${w.nameAr}`,
                subtitle: `Iqama: ${w.iqamaNumber} • ${w.jobTitle}`,
                badge: w.status,
                iqamaNumber: w.iqamaNumber,
                rawData: trimmed
              });
              setResolving(false);
              return;
            }
          }
        } catch {
          // Fall through to other formats
        }
      }

      // 2. Try prefix formats: "VEHICLE:id", "WORKER:id", "SAUDIFLEET:VEHICLE:id", "SAUDIFLEET:WORKER:id"
      const prefixMatch = trimmed.match(/^(?:SAUDIFLEET:)?(VEHICLE|WORKER):([a-zA-Z0-9_-]+)$/i);
      if (prefixMatch) {
        const entityType = prefixMatch[1].toUpperCase();
        const entityId = prefixMatch[2];

        if (entityType === 'VEHICLE') {
          const vRes = await fetch(`/api/vehicles/${entityId}`, { headers: getAuthHeaders(token) });
          if (vRes.ok) {
            const v = await vRes.json();
            setMatchResult({
              type: 'VEHICLE',
              id: v.id,
              title: `${v.make} ${v.model} (${v.year})`,
              subtitle: `VIN: ${v.vin} • ID: ${v.internalVehicleId || v.id}`,
              badge: v.status,
              plateEn: v.plateEn,
              plateAr: v.plateAr,
              rawData: trimmed
            });
            setResolving(false);
            return;
          }
        } else {
          const wRes = await fetch(`/api/workers/${entityId}`, { headers: getAuthHeaders(token) });
          if (wRes.ok) {
            const w = await wRes.json();
            setMatchResult({
              type: 'WORKER',
              id: w.id,
              title: `${w.nameEn} / ${w.nameAr}`,
              subtitle: `Iqama: ${w.iqamaNumber} • ${w.jobTitle}`,
              badge: w.status,
              iqamaNumber: w.iqamaNumber,
              rawData: trimmed
            });
            setResolving(false);
            return;
          }
        }
      }

      // 3. Try URL patterns: "/vehicles/123", "/workers/456", "vehicleId=...", etc.
      if (trimmed.includes('http') || trimmed.includes('/')) {
        const vUrlMatch = trimmed.match(/\/vehicles\/([a-zA-Z0-9_-]+)/i) || trimmed.match(/vehicle(?:Id)?=([a-zA-Z0-9_-]+)/i);
        if (vUrlMatch) {
          const vRes = await fetch(`/api/vehicles/${vUrlMatch[1]}`, { headers: getAuthHeaders(token) });
          if (vRes.ok) {
            const v = await vRes.json();
            setMatchResult({
              type: 'VEHICLE',
              id: v.id,
              title: `${v.make} ${v.model} (${v.year})`,
              subtitle: `VIN: ${v.vin} • ID: ${v.internalVehicleId || v.id}`,
              badge: v.status,
              plateEn: v.plateEn,
              plateAr: v.plateAr,
              rawData: trimmed
            });
            setResolving(false);
            return;
          }
        }

        const wUrlMatch = trimmed.match(/\/workers\/([a-zA-Z0-9_-]+)/i) || trimmed.match(/worker(?:Id)?=([a-zA-Z0-9_-]+)/i);
        if (wUrlMatch) {
          const wRes = await fetch(`/api/workers/${wUrlMatch[1]}`, { headers: getAuthHeaders(token) });
          if (wRes.ok) {
            const w = await wRes.json();
            setMatchResult({
              type: 'WORKER',
              id: w.id,
              title: `${w.nameEn} / ${w.nameAr}`,
              subtitle: `Iqama: ${w.iqamaNumber} • ${w.jobTitle}`,
              badge: w.status,
              iqamaNumber: w.iqamaNumber,
              rawData: trimmed
            });
            setResolving(false);
            return;
          }
        }
      }

      // 4. Perform comprehensive global lookup by ID / Plate / Iqama / VIN / Worker Code
      const searchRes = await fetch(`/api/search/global?q=${encodeURIComponent(trimmed)}`, {
        headers: getAuthHeaders(token)
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const vehicles = searchData.vehicles || [];
        const workers = searchData.workers || [];

        if (vehicles.length > 0) {
          const v = vehicles[0];
          setMatchResult({
            type: 'VEHICLE',
            id: v.id,
            title: `${v.make} ${v.model} (${v.year || ''})`,
            subtitle: `VIN: ${v.vin} • Code: ${v.internalVehicleId || v.id}`,
            badge: v.status,
            plateEn: v.plateEn,
            plateAr: v.plateAr,
            rawData: trimmed
          });
          setResolving(false);
          return;
        }

        if (workers.length > 0) {
          const w = workers[0];
          setMatchResult({
            type: 'WORKER',
            id: w.id,
            title: `${w.nameEn} / ${w.nameAr || ''}`,
            subtitle: `Iqama: ${w.iqamaNumber} • ${w.jobTitle || ''}`,
            badge: w.status,
            iqamaNumber: w.iqamaNumber,
            rawData: trimmed
          });
          setResolving(false);
          return;
        }
      }

      // 5. Direct ID queries if nothing matched search yet
      const [vDirectRes, wDirectRes] = await Promise.all([
        fetch(`/api/vehicles/${trimmed}`, { headers: getAuthHeaders(token) }),
        fetch(`/api/workers/${trimmed}`, { headers: getAuthHeaders(token) })
      ]);

      if (vDirectRes.ok) {
        const v = await vDirectRes.json();
        setMatchResult({
          type: 'VEHICLE',
          id: v.id,
          title: `${v.make} ${v.model} (${v.year})`,
          subtitle: `VIN: ${v.vin} • ID: ${v.internalVehicleId || v.id}`,
          badge: v.status,
          plateEn: v.plateEn,
          plateAr: v.plateAr,
          rawData: trimmed
        });
        setResolving(false);
        return;
      }

      if (wDirectRes.ok) {
        const w = await wDirectRes.json();
        setMatchResult({
          type: 'WORKER',
          id: w.id,
          title: `${w.nameEn} / ${w.nameAr}`,
          subtitle: `Iqama: ${w.iqamaNumber} • ${w.jobTitle}`,
          badge: w.status,
          iqamaNumber: w.iqamaNumber,
          rawData: trimmed
        });
        setResolving(false);
        return;
      }

      // If no matching profile was found
      setResolveError(`No registered vehicle or worker matches code: "${trimmed}"`);
    } catch (err: any) {
      setResolveError(`Lookup failed: ${err.message || 'Network error'}`);
    } finally {
      setResolving(false);
    }
  }, [playBeep, token]);

  // Frame scanner loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data && code.data.trim().length > 0) {
        // Detected a code!
        processScannedCode(code.data);
        return; // Pause scanning while resolving/displaying
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processScannedCode]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API is not supported on this browser or platform.');
      setActiveMode('UPLOAD');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setIsScanning(true);

        // Check if torch/flashlight is supported on video track
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was blocked. Please grant camera permissions in your browser settings to scan QR labels.'
          : `Unable to access camera: ${err.message || 'Device in use or unavailable'}`
      );
      setHasCamera(false);
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Handle active mode or modal open changes
  useEffect(() => {
    if (isOpen && activeMode === 'CAMERA' && !matchResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, startCamera, stopCamera, matchResult]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
  };

  // Switch between front and rear cameras
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Decode QR code from uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processScannedCode(code.data);
        } else {
          setResolveError('Could not find a valid QR code in the uploaded image. Please try another clear photo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Confirm selection and open profile
  const handleOpenProfile = () => {
    if (!matchResult) return;
    onClose();
    if (matchResult.type === 'VEHICLE') {
      onSelectVehicle(matchResult.id);
    } else {
      onSelectWorker(matchResult.id);
    }
  };

  // Reset scanner to scan another code
  const handleScanAgain = () => {
    setScannedRaw(null);
    setMatchResult(null);
    setResolveError(null);
    if (activeMode === 'CAMERA') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="qr-scanner-dialog"
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl bg-slate-900 text-white border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>{t.qrScanner || 'Asset QR Scanner'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.scanLabelHint || 'Scan vehicle or worker QR tags to instantly open 360° profiles'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/30 px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('CAMERA');
              handleScanAgain();
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all ${
              activeMode === 'CAMERA'
                ? 'border-emerald-400 text-emerald-300 font-bold bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('UPLOAD');
              stopCamera();
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all ${
              activeMode === 'UPLOAD'
                ? 'border-emerald-400 text-emerald-300 font-bold bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('SAMPLES');
              stopCamera();
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all ${
              activeMode === 'SAMPLES'
                ? 'border-emerald-400 text-emerald-300 font-bold bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Demo QR Tags</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. CAMERA MODE */}
          {activeMode === 'CAMERA' && !matchResult && (
            <div className="space-y-4">
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Viewfinder Target Reticle Overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Framing Box with Glowing Corners */}
                    <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-500/40 rounded-3xl overflow-hidden">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse top-1/2 -translate-y-1/2"></div>
                    </div>

                    <div className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-emerald-300 border border-emerald-500/30 shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Point camera at QR label</span>
                    </div>
                  </div>
                )}

                {/* Resolving overlay */}
                {resolving && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-spin mb-3">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Decoded QR Code!</p>
                    <p className="text-xs text-emerald-400">Verifying asset credentials in Saudi registry...</p>
                  </div>
                )}

                {/* Camera Error / Permission Fallback */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Camera Notice</h3>
                    <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode('UPLOAD')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                      >
                        Upload QR Image
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Camera Action Controls (Torch & Camera Switch) */}
                {isScanning && !cameraError && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all ${
                          torchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_#f59e0b]'
                            : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                        }`}
                        title="Toggle Flashlight"
                      >
                        {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md transition-all"
                      title="Switch Camera (Rear/Front)"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. UPLOAD IMAGE MODE */}
          {activeMode === 'UPLOAD' && !matchResult && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    const fakeEvent: any = { target: { files: e.dataTransfer.files } };
                    handleFileUpload(fakeEvent);
                  }
                }}
                className="w-full aspect-4/3 sm:aspect-16/10 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors mb-3">
                  <FileImage className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  Click or Drag & Drop QR Image
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Upload a photo of a vehicle dashboard label, Iqama card, or asset sticker
                </p>
                <span className="mt-3 px-3 py-1 rounded-lg bg-slate-800 text-[11px] font-semibold text-emerald-400 border border-slate-700">
                  Select File from Device
                </span>
              </div>
            </div>
          )}

          {/* 3. DEMO QR TAGS (Live Database Samples) */}
          {activeMode === 'SAMPLES' && !matchResult && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-200">
                💡 <strong>Instant Test Samples:</strong> Click any registered asset below to simulate scanning its physical QR tag immediately:
              </div>

              {/* Sample Vehicles */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Fleet Vehicles in Database
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sampleAssets.vehicles.map(v => (
                    <div
                      key={v.id}
                      onClick={() => processScannedCode(JSON.stringify({ type: 'VEHICLE', id: v.id, plate: v.plateEn }))}
                      className="p-3 bg-slate-800/70 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                          {v.make} {v.model} ({v.year})
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {v.plateEn} • {v.vin?.slice(0, 8)}...
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                        Simulate Scan
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Workers */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Workforce & Drivers in Database
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sampleAssets.workers.map(w => (
                    <div
                      key={w.id}
                      onClick={() => processScannedCode(JSON.stringify({ type: 'WORKER', id: w.id, iqama: w.iqamaNumber }))}
                      className="p-3 bg-slate-800/70 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/60 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                          {w.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Iqama: {w.iqamaNumber}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                        Simulate Scan
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message if lookup failed */}
          {resolveError && !matchResult && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-300 mb-0.5">Asset Lookup Notice</p>
                <p>{resolveError}</p>
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="mt-2 text-xs font-bold text-white underline hover:text-emerald-300"
                >
                  Scan Another Code
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS MATCH RESULT CARD */}
          {matchResult && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/80 rounded-2xl text-white shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-emerald-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      {matchResult.type === 'VEHICLE' ? 'Fleet Vehicle Verified' : 'Workforce Profile Verified'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                    {matchResult.badge}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white mb-1">
                      {matchResult.title}
                    </h3>
                    <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
                      {matchResult.subtitle}
                    </p>
                  </div>

                  {matchResult.type === 'VEHICLE' && matchResult.plateEn && (
                    <div className="shrink-0 scale-90 sm:scale-100 origin-left">
                      <SaudiPlate
                        plateEn={matchResult.plateEn}
                        plateAr={matchResult.plateAr}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                >
                  <span>Open 360° {matchResult.type === 'VEHICLE' ? 'Vehicle' : 'Worker'} Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold border border-slate-700 transition-colors"
                >
                  Scan Next
                </button>
              </div>
            </div>
          )}

          {/* Quick Manual Search Input Fallback */}
          <div className="border-t border-slate-800 pt-3">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (manualQuery.trim()) {
                  processScannedCode(manualQuery.trim());
                }
              }}
              className="relative flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualQuery}
                  onChange={e => setManualQuery(e.target.value)}
                  placeholder="Or type Plate (e.g. 7845 XYZ) or Iqama # to simulate..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!manualQuery.trim() || resolving}
                className="px-3.5 py-2 bg-slate-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                Lookup
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
