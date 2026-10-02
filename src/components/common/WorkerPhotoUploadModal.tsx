import React, { useState } from 'react';
import { X, Camera, CheckCircle2, AlertCircle, Save, User } from 'lucide-react';
import { Worker } from '../../types';
import { WorkerPhotoUploader } from './WorkerPhotoUploader';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';
import { audioService } from '../../services/audioService';

export interface WorkerPhotoUploadModalProps {
  isOpen: boolean;
  worker: Worker | null;
  onClose: () => void;
  onSuccess: (updatedWorker: Worker) => void;
}

export const WorkerPhotoUploadModal: React.FC<WorkerPhotoUploadModalProps> = ({
  isOpen,
  worker,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !worker) return null;

  const currentPhoto = selectedPhoto !== null ? selectedPhoto : (worker.photoUrl || '');

  const handleSavePhoto = async () => {
    if (!selectedPhoto) {
      setError('Please select or upload a new photo first.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/workers/${worker.id}/photo`, {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          photoData: selectedPhoto
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || data.error || 'Failed to upload worker photo');
      }

      const data = await res.json();
      audioService.playChime('confirm');

      const updatedWorker: Worker = data.worker || {
        ...worker,
        photoUrl: selectedPhoto
      };

      onSuccess(updatedWorker);
      onClose();
    } catch (err: any) {
      console.error('Error uploading worker photo:', err);
      audioService.playChime('error');
      setError(err.message || 'Error occurred while saving worker photo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-xs">
              <Camera className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload Worker Photo</h3>
              <p className="text-xs text-emerald-200">
                Official employee identification headshot
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Worker Summary Banner */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
              {worker.fullName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{worker.fullName}</div>
              <div className="text-[11px] text-slate-500 font-arabic">{worker.fullNameAr}</div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-800">
              {worker.employeeId}
            </span>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Iqama: <span className="font-mono">{worker.iqamaNumber}</span>
            </div>
          </div>
        </div>

        {/* Upload Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <WorkerPhotoUploader
            currentPhotoUrl={currentPhoto}
            workerName={worker.fullName}
            onPhotoSelected={photoUrl => {
              setSelectedPhoto(photoUrl);
              setError(null);
            }}
            onPhotoRemoved={() => {
              setSelectedPhoto('');
            }}
            disabled={saving}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSavePhoto}
            disabled={saving || selectedPhoto === null}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Worker Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerPhotoUploadModal;
