import React, { useState, useEffect } from 'react';
import { X, User, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Worker, Vehicle, Department } from '../types';
import { WorkerPhotoUploader } from './common/WorkerPhotoUploader';

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWorker?: Worker | null;
  vehicles: Vehicle[];
  departments: Department[];
}

export const WorkerFormModal: React.FC<WorkerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWorker,
  vehicles,
  departments
}) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    fullNameAr: '',
    nationality: 'Saudi',
    nationalityAr: 'سعودي',
    jobTitle: 'Heavy Truck Driver',
    departmentId: '',
    mobileNumber: '+966 5',
    email: '',
    iqamaNumber: '',
    iqamaExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    workPermitNumber: '',
    workPermitExpiry: '',
    medicalInsuranceNumber: '',
    medicalInsuranceExpiry: '',
    contractStartDate: '',
    contractEndDate: '',
    joiningDate: '',
    salary: 4500,
    assignedVehicleId: '',
    driverLicenseNumber: '',
    driverLicenseExpiry: '',
    status: 'ACTIVE',
    address: 'Riyadh, KSA',
    emergencyContact: '',
    notes: '',
    photoUrl: ''
  });

  useEffect(() => {
    if (initialWorker) {
      setFormData({
        employeeId: initialWorker.employeeId || '',
        fullName: initialWorker.fullName || '',
        fullNameAr: initialWorker.fullNameAr || '',
        nationality: initialWorker.nationality || 'Saudi',
        nationalityAr: initialWorker.nationalityAr || 'سعودي',
        jobTitle: initialWorker.jobTitle || 'Heavy Truck Driver',
        departmentId: initialWorker.departmentId || (departments[0]?.id || ''),
        mobileNumber: initialWorker.mobileNumber || '+966 5',
        email: initialWorker.email || '',
        iqamaNumber: initialWorker.iqamaNumber || '',
        iqamaExpiry: initialWorker.iqamaExpiry || '',
        passportNumber: initialWorker.passportNumber || '',
        passportExpiry: initialWorker.passportExpiry || '',
        workPermitNumber: initialWorker.workPermitNumber || '',
        workPermitExpiry: initialWorker.workPermitExpiry || '',
        medicalInsuranceNumber: initialWorker.medicalInsuranceNumber || '',
        medicalInsuranceExpiry: initialWorker.medicalInsuranceExpiry || '',
        contractStartDate: initialWorker.contractStartDate || '',
        contractEndDate: initialWorker.contractEndDate || '',
        joiningDate: initialWorker.joiningDate || '',
        salary: initialWorker.salary || 4500,
        assignedVehicleId: initialWorker.assignedVehicleId || '',
        driverLicenseNumber: initialWorker.driverLicenseNumber || '',
        driverLicenseExpiry: initialWorker.driverLicenseExpiry || '',
        status: initialWorker.status || 'ACTIVE',
        address: initialWorker.address || 'Riyadh, KSA',
        emergencyContact: initialWorker.emergencyContact || '',
        notes: initialWorker.notes || '',
        photoUrl: initialWorker.photoUrl || ''
      });
    } else {
      setFormData({
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: '',
        fullNameAr: '',
        nationality: 'Pakistani',
        nationalityAr: 'باكستاني',
        jobTitle: 'Heavy Truck Driver',
        departmentId: departments[0]?.id || 'DEP-OPS',
        mobileNumber: '+966 5',
        email: '',
        iqamaNumber: '',
        iqamaExpiry: '',
        passportNumber: '',
        passportExpiry: '',
        workPermitNumber: '',
        workPermitExpiry: '',
        medicalInsuranceNumber: '',
        medicalInsuranceExpiry: '',
        contractStartDate: new Date().toISOString().slice(0, 10),
        contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        joiningDate: new Date().toISOString().slice(0, 10),
        salary: 4000,
        assignedVehicleId: '',
        driverLicenseNumber: '',
        driverLicenseExpiry: '',
        status: 'ACTIVE',
        address: 'Riyadh, KSA',
        emergencyContact: '',
        notes: '',
        photoUrl: ''
      });
    }
    setError(null);
  }, [initialWorker, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName) {
      setError('Full name is required');
      return;
    }
    if (!formData.iqamaNumber || formData.iqamaNumber.length < 10) {
      setError('Please provide a valid 10-digit Saudi Iqama or National ID Number');
      return;
    }
    if (!formData.iqamaExpiry) {
      setError('Iqama expiry date is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = initialWorker ? `/api/workers/${initialWorker.id}` : '/api/workers';
      const method = initialWorker ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save worker');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">
              {initialWorker ? t.editWorker : t.addWorker}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Worker Profile Photo Upload */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <WorkerPhotoUploader
              currentPhotoUrl={formData.photoUrl}
              workerName={formData.fullName || 'Employee'}
              onPhotoSelected={url => setFormData(prev => ({ ...prev, photoUrl: url }))}
              onPhotoRemoved={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
              disabled={loading}
            />
          </div>

          {/* Section 1: Basic Identity */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              1. Worker Identity & Saudi Iqama Registration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Name (English)</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Tariq Khan"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1 font-arabic">الاسم الكامل (عربي)</label>
                <input
                  type="text"
                  value={formData.fullNameAr}
                  onChange={e => setFormData({ ...formData, fullNameAr: e.target.value })}
                  placeholder="مثال: طارق خان"
                  dir="rtl"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-arabic font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">10-Digit Saudi Iqama / ID #</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.iqamaNumber}
                  onChange={e => setFormData({ ...formData, iqamaNumber: e.target.value })}
                  placeholder="e.g. 2491028475"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Iqama Expiry Date</label>
                <input
                  type="date"
                  required
                  value={formData.iqamaExpiry}
                  onChange={e => setFormData({ ...formData, iqamaExpiry: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nationality</label>
                <input
                  type="text"
                  required
                  value={formData.nationality}
                  onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="e.g. Pakistani, Saudi, Egyptian, Indian"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Profession & Fleet Assignment */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              2. Job Role & Fleet Vehicle Assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={formData.jobTitle}
                  onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g. Heavy Truck Driver"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.nameAr})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assigned Vehicle</label>
                <select
                  value={formData.assignedVehicleId}
                  onChange={e => setFormData({ ...formData, assignedVehicleId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  <option value="">-- No Assigned Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.internalVehicleId} - {v.plateNumber} ({v.make} {v.model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Basic Monthly Salary (SAR)</label>
                <input
                  type="number"
                  required
                  value={formData.salary}
                  onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Passport, Driving License & Saudi Government Regulations */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              3. Passport, Saudi Driving License, Qiwa & Medical Insurance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-slate-700 font-bold mb-1">Passport #</label>
                <input
                  type="text"
                  value={formData.passportNumber}
                  onChange={e => setFormData({ ...formData, passportNumber: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono mb-2"
                />
                <label className="block text-slate-700 font-bold mb-1">Passport Expiry</label>
                <input
                  type="date"
                  value={formData.passportExpiry}
                  onChange={e => setFormData({ ...formData, passportExpiry: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-slate-700 font-bold mb-1">Driver License #</label>
                <input
                  type="text"
                  value={formData.driverLicenseNumber}
                  onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono mb-2"
                />
                <label className="block text-slate-700 font-bold mb-1">Driver License Expiry</label>
                <input
                  type="date"
                  value={formData.driverLicenseExpiry}
                  onChange={e => setFormData({ ...formData, driverLicenseExpiry: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-slate-700 font-bold mb-1">Work Permit (Qiwa) #</label>
                <input
                  type="text"
                  value={formData.workPermitNumber}
                  onChange={e => setFormData({ ...formData, workPermitNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono mb-2"
                />
                <label className="block text-slate-700 font-bold mb-1">Work Permit Expiry</label>
                <input
                  type="date"
                  value={formData.workPermitExpiry}
                  onChange={e => setFormData({ ...formData, workPermitExpiry: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-slate-700 font-bold mb-1">Medical Insurance (CCHI) #</label>
                <input
                  type="text"
                  value={formData.medicalInsuranceNumber}
                  onChange={e => setFormData({ ...formData, medicalInsuranceNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono mb-2"
                />
                <label className="block text-slate-700 font-bold mb-1">Medical Insurance Expiry</label>
                <input
                  type="date"
                  value={formData.medicalInsuranceExpiry}
                  onChange={e => setFormData({ ...formData, medicalInsuranceExpiry: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Contact & Status */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              4. Contact Info & Employment Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Saudi Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={formData.mobileNumber}
                  onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="employee@company.sa"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employment Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  <option value="ACTIVE">ACTIVE (على رأس العمل)</option>
                  <option value="VACATION">ON VACATION (إجازة رسمية)</option>
                  <option value="INACTIVE">INACTIVE (متوقف)</option>
                  <option value="TERMINATED">TERMINATED (خروج نهائي)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Name / Phone"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : (initialWorker ? t.save : t.addWorker)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
