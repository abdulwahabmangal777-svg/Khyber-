import React, { useState, useEffect } from 'react';
import { X, Truck, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Vehicle, Worker, Department } from '../types';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVehicle?: Vehicle | null;
  workers: Worker[];
  departments: Department[];
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialVehicle,
  workers,
  departments
}) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    internalVehicleId: '',
    plateDigits: '',
    plateLettersEn: '',
    plateDigitsAr: '',
    plateLettersAr: '',
    vehicleType: 'Sedan',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'White',
    vin: '',
    engineNumber: '',
    ownershipType: 'OWNED',
    departmentId: '',
    assignedWorkerId: '',
    currentLocation: 'Riyadh HQ',
    status: 'ACTIVE',
    istimaraNumber: '',
    istimaraExpiry: '',
    insuranceCompany: 'Tawuniya Insurance',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    inspectionDate: '',
    inspectionExpiry: '',
    purchaseDate: '',
    purchasePrice: 0,
    currentMileage: 0,
    fuelType: 'GASOLINE_91',
    notes: ''
  });

  useEffect(() => {
    if (initialVehicle) {
      setFormData({
        internalVehicleId: initialVehicle.internalVehicleId || '',
        plateDigits: initialVehicle.plateDigits || '',
        plateLettersEn: initialVehicle.plateLettersEn || '',
        plateDigitsAr: initialVehicle.plateDigitsAr || '',
        plateLettersAr: initialVehicle.plateLettersAr || '',
        vehicleType: initialVehicle.vehicleType || 'Sedan',
        make: initialVehicle.make || '',
        model: initialVehicle.model || '',
        year: initialVehicle.year || new Date().getFullYear(),
        color: initialVehicle.color || 'White',
        vin: initialVehicle.vin || '',
        engineNumber: initialVehicle.engineNumber || '',
        ownershipType: initialVehicle.ownershipType || 'OWNED',
        departmentId: initialVehicle.departmentId || (departments[0]?.id || ''),
        assignedWorkerId: initialVehicle.assignedWorkerId || '',
        currentLocation: initialVehicle.currentLocation || 'Riyadh HQ',
        status: initialVehicle.status || 'ACTIVE',
        istimaraNumber: initialVehicle.istimaraNumber || '',
        istimaraExpiry: initialVehicle.istimaraExpiry || '',
        insuranceCompany: initialVehicle.insuranceCompany || 'Tawuniya Insurance',
        insurancePolicyNumber: initialVehicle.insurancePolicyNumber || '',
        insuranceExpiry: initialVehicle.insuranceExpiry || '',
        inspectionDate: initialVehicle.inspectionDate || '',
        inspectionExpiry: initialVehicle.inspectionExpiry || '',
        purchaseDate: initialVehicle.purchaseDate || '',
        purchasePrice: initialVehicle.purchasePrice || 0,
        currentMileage: initialVehicle.currentMileage || 0,
        fuelType: (initialVehicle.fuelType as any) || 'GASOLINE_91',
        notes: initialVehicle.notes || ''
      });
    } else {
      setFormData({
        internalVehicleId: `V-${Math.floor(100 + Math.random() * 900)}`,
        plateDigits: '',
        plateLettersEn: '',
        plateDigitsAr: '',
        plateLettersAr: '',
        vehicleType: 'Sedan',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: 'White',
        vin: '',
        engineNumber: '',
        ownershipType: 'OWNED',
        departmentId: departments[0]?.id || 'DEP-OPS',
        assignedWorkerId: '',
        currentLocation: 'Riyadh HQ',
        status: 'ACTIVE',
        istimaraNumber: '',
        istimaraExpiry: '',
        insuranceCompany: 'Tawuniya Insurance',
        insurancePolicyNumber: '',
        insuranceExpiry: '',
        inspectionDate: '',
        inspectionExpiry: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        purchasePrice: 65000,
        currentMileage: 1000,
        fuelType: 'GASOLINE_91',
        notes: ''
      });
    }
    setError(null);
  }, [initialVehicle, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateDigits || !formData.plateLettersEn) {
      setError('Please provide Saudi plate digits (e.g. 7845) and letters (e.g. XYZ)');
      return;
    }
    if (!formData.make || !formData.model) {
      setError('Make and model are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = initialVehicle ? `/api/vehicles/${initialVehicle.id}` : '/api/vehicles';
      const method = initialVehicle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save vehicle');
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
            <Truck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">
              {initialVehicle ? t.editVehicle : t.addVehicle}
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

          {/* Section 1: Plate & Basic Identity */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              1. Saudi License Plate & Vehicle Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Internal Code</label>
                <input
                  type="text"
                  required
                  value={formData.internalVehicleId}
                  onChange={e => setFormData({ ...formData, internalVehicleId: e.target.value })}
                  placeholder="e.g. V-101"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Plate Digits (EN)</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={formData.plateDigits}
                  onChange={e => setFormData({ ...formData, plateDigits: e.target.value })}
                  placeholder="e.g. 7845"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Plate Letters (EN)</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={formData.plateLettersEn}
                  onChange={e => setFormData({ ...formData, plateLettersEn: e.target.value.toUpperCase() })}
                  placeholder="e.g. XYZ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  <option value="Sedan">Sedan (سيدان)</option>
                  <option value="SUV">SUV (دفع رباعي)</option>
                  <option value="Pickup">Pickup (ونيت)</option>
                  <option value="Heavy Truck">Heavy Truck (شاحنة نقل ثقيل)</option>
                  <option value="Light Truck">Light Truck (دينا / شاحنة خفيفة)</option>
                  <option value="Van">Van (فان ركاب / بضائع)</option>
                  <option value="Bus">Bus (حافلة)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Specs & Assignment */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              2. Make, Model & Assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Make / Manufacturer</label>
                <input
                  type="text"
                  required
                  value={formData.make}
                  onChange={e => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g. Toyota, Mercedes-Benz"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Model</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. Hilux, Actros 3340"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Year</label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={e => setFormData({ ...formData, year: parseInt(e.target.value, 10) || 2024 })}
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
                <label className="block text-slate-600 font-semibold mb-1">Assigned Driver</label>
                <select
                  value={formData.assignedWorkerId}
                  onChange={e => setFormData({ ...formData, assignedWorkerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  <option value="">-- No Assigned Driver --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.fullName} ({w.employeeId}) - Iqama: {w.iqamaNumber}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chassis / VIN</label>
                <input
                  type="text"
                  required
                  value={formData.vin}
                  onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  placeholder="17-digit VIN"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Current Mileage (KM)</label>
                <input
                  type="number"
                  value={formData.currentMileage}
                  onChange={e => setFormData({ ...formData, currentMileage: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Fuel Type</label>
                <select
                  value={formData.fuelType}
                  onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                >
                  <option value="GASOLINE_91">Gasoline 91 (بنزين ٩١)</option>
                  <option value="GASOLINE_95">Gasoline 95 (بنزين ٩٥)</option>
                  <option value="DIESEL">Diesel (ديزل)</option>
                  <option value="HYBRID">Hybrid (هايبرد)</option>
                  <option value="ELECTRIC">Electric (كهربائي)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Saudi Regulatory Compliance & Expiry Dates */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
              3. Saudi Morour Registration, Insurance & MVPI Expiry Dates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Istimara */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Istimara Registration</span>
                <div>
                  <label className="block text-slate-500 mb-1">Istimara Number</label>
                  <input
                    type="text"
                    value={formData.istimaraNumber}
                    onChange={e => setFormData({ ...formData, istimaraNumber: e.target.value })}
                    placeholder="e.g. IST-2024-8841"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Istimara Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.istimaraExpiry}
                    onChange={e => setFormData({ ...formData, istimaraExpiry: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Insurance */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Insurance Policy</span>
                <div>
                  <label className="block text-slate-500 mb-1">Insurance Company</label>
                  <input
                    type="text"
                    value={formData.insuranceCompany}
                    onChange={e => setFormData({ ...formData, insuranceCompany: e.target.value })}
                    placeholder="e.g. Tawuniya, Al Rajhi Takaful"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Insurance Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.insuranceExpiry}
                    onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* MVPI */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">Periodic MVPI Inspection (Fahs)</span>
                <div>
                  <label className="block text-slate-500 mb-1">Inspection Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.inspectionExpiry}
                    onChange={e => setFormData({ ...formData, inspectionExpiry: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Current Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (جاهزة للعمل)</option>
                    <option value="MAINTENANCE">IN MAINTENANCE (في الصيانة)</option>
                    <option value="INACTIVE">INACTIVE (متوقفة)</option>
                    <option value="SOLD">SOLD (تم البيع)</option>
                  </select>
                </div>
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
              <span>{loading ? 'Saving...' : (initialVehicle ? t.save : t.addVehicle)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
