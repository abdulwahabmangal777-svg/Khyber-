import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Truck,
  FileText,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Plus,
  Briefcase,
  QrCode,
  Camera
} from 'lucide-react';
import { SaudiPlate } from './SaudiPlate';
import { AssetQRLabelModal } from './AssetQRLabelModal';
import { WorkerPhotoUploadModal } from './common/WorkerPhotoUploadModal';
import { BrandLogo } from './common/BrandLogo';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';

interface WorkerDetailModalProps {
  workerId: string | null;
  onClose: () => void;
  onOpenVehicle?: (vehicleId: string) => void;
  onUploadDoc?: (workerId: string) => void;
  onWorkerUpdated?: (worker: any) => void;
  onEditWorker?: (worker: any) => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  workerId,
  onClose,
  onOpenVehicle,
  onUploadDoc,
  onWorkerUpdated,
  onEditWorker
}) => {
  const { t, formatCurrency, formatDate, formatDaysRemainingText } = useLanguage();
  const { token, hasRole } = useAuth();
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOCUMENTS' | 'ALERTS' | 'CONTRACT'>('OVERVIEW');
  const [isQRLabelOpen, setIsQRLabelOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const canEditPhoto = hasRole('ADMIN', 'MANAGER', 'HR');

  useEffect(() => {
    if (workerId) {
      fetchWorkerDetails(workerId);
    }
  }, [workerId]);

  const fetchWorkerDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workers/${id}`, {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setWorker(data);
      }
    } catch (err) {
      console.warn('Notice: Worker details fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!workerId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Corporate Khyber Logistics Identity Bar */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-amber-500/30 flex items-center justify-between text-[11px] text-emerald-200 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-0.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
              <BrandLogo size="xs" showText={false} variant="luxury" />
            </div>
            <span className="font-black tracking-wide text-white uppercase">KHYBER LOGISTICS SERVICES</span>
            <span className="text-amber-400 font-arabic font-bold text-xs">خدمات خيبر اللوجستية</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300/90">
            <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 text-amber-300 font-bold">
              KSA ENTERPRISE
            </span>
            <span>CR: 1010748291</span>
          </div>
        </div>

        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={worker?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                alt={worker?.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shrink-0 shadow-md bg-slate-800"
              />
              {canEditPhoto && (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute inset-0 bg-slate-950/70 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 text-white transition-opacity cursor-pointer text-[9px] font-bold border border-white/40 shadow-md"
                  title="Upload or Change Worker Photo"
                >
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>Change</span>
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{worker?.fullName}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    worker?.status === 'ACTIVE'
                      ? 'bg-emerald-500 text-white'
                      : (worker?.status === 'VACATION' ? 'bg-amber-500 text-slate-950' : 'bg-red-500 text-white')
                  }`}
                >
                  {worker?.status}
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 font-arabic text-sm">{worker?.fullNameAr}</p>
              <div className="text-xs text-emerald-200 mt-1 flex items-center gap-2">
                <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-white">{worker?.employeeId}</span>
                <span>•</span>
                <span>Iqama: <span className="font-mono text-white">{worker?.iqamaNumber}</span></span>
                <span>•</span>
                <span>{worker?.jobTitle} ({worker?.nationality})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {canEditPhoto && (
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-bold transition-colors border border-emerald-600/60 shadow-xs"
                title="Upload official employee identification photo"
              >
                <Camera className="w-4 h-4 text-emerald-300" />
                <span>Upload Photo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsQRLabelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20 shadow-xs"
              title="Generate printable Saudi QR Asset Tag"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">QR Asset Tag</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: '360° Overview', icon: User },
            { id: 'DOCUMENTS', label: `Documents (${worker?.documents?.length || 0})`, icon: FileText },
            { id: 'CONTRACT', label: 'Contract & Payroll', icon: Briefcase },
            { id: 'ALERTS', label: `Alerts (${worker?.alerts?.length || 0})`, icon: AlertTriangle, badge: worker?.alerts?.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-emerald-700 text-emerald-950 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="animate-spin w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3"></div>
              Loading 360° employee & compliance records...
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Top 3 Columns: Assigned Vehicle, Saudi Government IDs, Contact Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Assigned Vehicle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-emerald-800" />
                          Assigned Fleet Asset
                        </span>
                        {worker?.assignedVehicle && onOpenVehicle && (
                          <button
                            type="button"
                            onClick={() => onOpenVehicle(worker.assignedVehicle.id)}
                            className="text-xs text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <span>Asset</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {worker?.assignedVehicle ? (
                        <div className="space-y-2">
                          <div className="text-sm font-bold text-slate-900">
                            {worker.assignedVehicle.make} {worker.assignedVehicle.model} ({worker.assignedVehicle.year})
                          </div>
                          <div className="my-2">
                            <SaudiPlate
                              plateDigits={worker.assignedVehicle.plateDigits || '0000'}
                              plateLettersEn={worker.assignedVehicle.plateLettersEn || 'KSA'}
                              plateDigitsAr={worker.assignedVehicle.plateDigitsAr}
                              plateLettersAr={worker.assignedVehicle.plateLettersAr}
                              size="sm"
                            />
                          </div>
                          <div className="text-xs space-y-1 pt-1 border-t border-slate-200/60">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Istimara:</span>
                              <span className="font-semibold text-slate-800">{formatDate(worker.assignedVehicle.istimaraExpiry)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Insurance:</span>
                              <span className="font-semibold text-slate-800">{formatDate(worker.assignedVehicle.insuranceExpiry)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          No vehicle currently assigned to this worker
                        </div>
                      )}
                    </div>

                    {/* Government & Compliance Expiries */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-800" />
                          Government IDs & Expiry
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800">Iqama / National ID</span>
                            <span className="font-mono text-slate-600">{worker?.iqamaNumber}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-500">Expires: {formatDate(worker?.iqamaExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(worker?.iqamaDaysRemaining || 0)}</span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800">Passport</span>
                            <span className="font-mono text-slate-600">{worker?.passportNumber}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-500">Expires: {formatDate(worker?.passportExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(worker?.passportDaysRemaining || 0)}</span>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800">Saudi Driving License</span>
                            <span className="font-mono text-slate-600">{worker?.driverLicenseNumber || '—'}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-slate-500">Expires: {formatDate(worker?.driverLicenseExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(worker?.licenseDaysRemaining || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Department */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-emerald-800" />
                          Contact & Organization
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Mobile Phone</span>
                          <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5" />
                            {worker?.mobileNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Corporate Email</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5" />
                            {worker?.email || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Department</span>
                          <span className="font-bold text-slate-900">{worker?.departmentName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Emergency Contact</span>
                          <span className="font-medium text-slate-700">{worker?.emergencyContact || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Saudi Labor & Insurance Details */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                      Saudi Ministry of Human Resources (MHRSD / Qiwa) & Insurance Details
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Work Permit (Qiwa) #</span>
                        <span className="font-bold text-slate-900 font-mono">{worker?.workPermitNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Work Permit Expiry</span>
                        <span className="font-bold text-slate-900">{formatDate(worker?.workPermitExpiry)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CCHI Medical Insurance #</span>
                        <span className="font-bold text-slate-900 font-mono">{worker?.medicalInsuranceNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Medical Insurance Expiry</span>
                        <span className="font-bold text-slate-900">{formatDate(worker?.medicalInsuranceExpiry)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Worker Uploaded Identity & Contract Files</h3>
                    {onUploadDoc && (
                      <button
                        type="button"
                        onClick={() => onUploadDoc(worker.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </button>
                    )}
                  </div>

                  {worker?.documents?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {worker.documents.map((doc: any) => (
                        <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold text-slate-900 truncate">{doc.fileName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span className="font-semibold text-emerald-800">{doc.docType}</span>
                                <span>•</span>
                                <span>{doc.fileSize}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">Uploaded by {doc.uploadedBy}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            title="Download File"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.fileData;
                              link.download = doc.fileName;
                              link.click();
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No documents uploaded for this worker yet.
                    </div>
                  )}
                </div>
              )}

              {/* CONTRACT TAB */}
              {activeTab === 'CONTRACT' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Employment Contract & Wage Records</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Joining Date</span>
                        <span className="font-bold text-slate-900 text-sm">{formatDate(worker?.joiningDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Contract Start Date</span>
                        <span className="font-bold text-slate-900 text-sm">{formatDate(worker?.contractStartDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Contract End Date</span>
                        <span className="font-bold text-slate-900 text-sm">{formatDate(worker?.contractEndDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Basic Monthly Salary</span>
                        <span className="font-black text-emerald-950 text-base">{formatCurrency(worker?.salary || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Residential Address</span>
                        <span className="font-medium text-slate-800">{worker?.address || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ALERTS TAB */}
              {activeTab === 'ALERTS' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Worker Active Expiry & Compliance Alerts</h3>
                  {worker?.alerts?.length > 0 ? (
                    <div className="space-y-2">
                      {worker.alerts.map((al: any) => (
                        <div
                          key={al.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            al.daysRemaining < 0
                              ? 'bg-red-50 border-red-300 text-red-900'
                              : (al.daysRemaining <= 7 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-yellow-50 border-yellow-300 text-yellow-900')
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div>
                              <div className="text-xs font-bold">{al.documentTypeName}</div>
                              <div className="text-[11px] opacity-80">Document #: {al.documentNumber} • Expiry: {formatDate(al.expiryDate)}</div>
                            </div>
                          </div>
                          <div className="text-right rtl:text-left">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/80 border">
                              {formatDaysRemainingText(al.daysRemaining)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-emerald-800 text-xs font-semibold flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      <span>All worker government documents and licenses are completely valid!</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Saudi QR Asset Tag Generation & Print Modal */}
      {isQRLabelOpen && worker && (
        <AssetQRLabelModal
          isOpen={isQRLabelOpen}
          onClose={() => setIsQRLabelOpen(false)}
          type="WORKER"
          data={worker}
        />
      )}

      {/* Worker Photo Upload Modal */}
      {isPhotoModalOpen && worker && (
        <WorkerPhotoUploadModal
          isOpen={isPhotoModalOpen}
          worker={worker}
          onClose={() => setIsPhotoModalOpen(false)}
          onSuccess={(updatedWorker) => {
            setWorker((prev: any) => ({
              ...prev,
              photoUrl: updatedWorker.photoUrl
            }));
            onWorkerUpdated?.(updatedWorker);
          }}
        />
      )}
    </div>
  );
};
