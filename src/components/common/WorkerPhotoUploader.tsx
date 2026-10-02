import React, { useState, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  User
} from 'lucide-react';
import { processProfileImage } from '../../utils/imageUtils';

export interface WorkerPhotoUploaderProps {
  currentPhotoUrl?: string;
  workerName?: string;
  onPhotoSelected: (dataUrl: string) => void;
  onPhotoRemoved?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

// Curated professional corporate headshot presets if admin wants a quick option
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80'
];

export const WorkerPhotoUploader: React.FC<WorkerPhotoUploaderProps> = ({
  currentPhotoUrl,
  workerName = 'Worker',
  onPhotoSelected,
  onPhotoRemoved,
  disabled = false,
  compact = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoInfo, setPhotoInfo] = useState<{ size: string; dim: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds 15MB. Please choose a smaller photo.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const processed = await processProfileImage(file, 600, 0.88);
      const kbSize = (processed.sizeBytes / 1024).toFixed(1);
      setPhotoInfo({
        size: `${kbSize} KB`,
        dim: `${processed.width}×${processed.height}px`
      });
      onPhotoSelected(processed.dataUrl);
    } catch (err: any) {
      console.error('Error processing photo:', err);
      setErrorMessage(err.message || 'Failed to process image file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // reset input value so re-uploading same file name triggers change
    if (e.target) e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Inputs: standard file picker & mobile camera capture */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="user"
        className="hidden"
        disabled={disabled}
      />

      {/* Main Upload Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 p-4 sm:p-5 ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-emerald-600/60 bg-slate-50/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar Preview Section */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-200 ring-2 ring-slate-200 flex items-center justify-center">
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={workerName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>

            {/* Quick action button overlay on preview */}
            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-900/60 rounded-2xl text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity cursor-pointer text-[10px] font-bold"
                title="Click to replace photo"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Replace</span>
              </button>
            )}
          </div>

          {/* Upload Instructions and Controls */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Worker Profile Photo
              </h4>
              {currentPhotoUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <Check className="w-3 h-3 text-emerald-700" /> Photo Loaded
                </span>
              )}
              {photoInfo && (
                <span className="text-[10px] text-slate-500 font-mono">
                  ({photoInfo.dim} • {photoInfo.size})
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Drag and drop high-resolution JPG, PNG or WebP here, or browse from your computer.
            </p>

            {/* Action Buttons: Browse File, Take Photo, Remove */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white text-xs font-bold transition-all shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{currentPhotoUrl ? 'Upload New Photo' : 'Browse File'}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
                title="Capture from camera / webcam"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Camera</span>
              </button>

              {currentPhotoUrl && onPhotoRemoved && (
                <button
                  type="button"
                  onClick={onPhotoRemoved}
                  disabled={disabled || isProcessing}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Remove worker photo"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-900">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Processing and cropping worker photo...</span>
          </div>
        )}
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Optional Preset Avatars for Quick Setup */}
      {!compact && (
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>Or choose a standard professional profile placeholder:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {PRESET_AVATARS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => onPhotoSelected(url)}
                className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition-all hover:scale-105 active:scale-95 ${
                  currentPhotoUrl === url
                    ? 'border-emerald-600 ring-2 ring-emerald-400'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
                title={`Preset portrait ${idx + 1}`}
              >
                <img
                  src={url}
                  alt={`Preset ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerPhotoUploader;
