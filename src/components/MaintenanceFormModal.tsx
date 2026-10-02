import React, { useState } from 'react';
import { X, Wrench, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Vehicle } from '../types';
import { BrandLogo } from './common/BrandLogo';

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  defaultVehicleId = ''
}) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState(defaultVehicleId || vehicles[0]?.id || '');
  const [maintenanceType, setMaintenanceType] = useState('PREVENTIVE');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(50000);
  const [workshop, setWorkshop] = useState('Petromin Express');
  const [description, setDescription] = useState('');
  const [parts, setParts] = useState('');
  const [laborCost, setLaborCost] = useState(150);
  const [partsCost, setPartsCost] = useState(300);
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [nextMaintenanceMileage, setNextMaintenanceMileage] = useState(60000);
  const [status, setStatus] = useState('COMPLETED');

  if (!isOpen) return null;

  const totalCost = (laborCost || 0) + (partsCost || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          vehicleId,
          maintenanceType,
          date,
          mileage,
          workshop,
          description: description || `${maintenanceType} performed at ${workshop}`,
          parts,
          laborCost,
          partsCost,
          totalCost,
          nextMaintenanceDate: nextMaintenanceDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          nextMaintenanceMileage: nextMaintenanceMileage || (mileage + 10000),
          status
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log maintenance');
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Corporate Header */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-amber-500/30 flex items-center justify-between text-[11px] text-emerald-200">
          <div className="flex items-center gap-2">
            <div className="p-0.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-xs">
              <BrandLogo size="xs" showText={false} variant="luxury" />
            </div>
            <span className="font-black text-white uppercase tracking-wider">KHYBER LOGISTICS</span>
            <span className="text-amber-400 font-arabic text-[11px]">خدمات خيبر اللوجستية</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-300">MAINTENANCE DISPATCH</span>
        </div>

        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">{t.addMaintenance}</h2>
              <p className="text-[10px] text-emerald-200 font-arabic">إصدار أمر صيانة وفحص فني للمركبة</p>
            </div>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Target Vehicle</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.internalVehicleId} - {v.plateNumber} ({v.make} {v.model})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Maintenance Type</label>
              <select
                value={maintenanceType}
                onChange={e => setMaintenanceType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
              >
                <option value="PREVENTIVE">Preventive Maintenance (دورية)</option>
                <option value="OIL_CHANGE">Oil & Filter Change (تغيير زيت وفلتر)</option>
                <option value="TIRE_REPLACEMENT">Tires Replacement (تغيير إطارات)</option>
                <option value="BRAKE_SERVICE">Brake Pads Service (فرامل)</option>
                <option value="CORRECTIVE">Corrective Repair (إصلاح طارئ)</option>
                <option value="ENGINE_OVERHAUL">Engine Overhaul (توضيب ماكينة)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Service Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Workshop / Service Center</label>
              <input
                type="text"
                required
                value={workshop}
                onChange={e => setWorkshop(e.target.value)}
                placeholder="e.g. Petromin, Official Dealer"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Current Odometer (KM)</label>
              <input
                type="number"
                required
                value={mileage}
                onChange={e => setMileage(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Labor Cost (SAR)</label>
              <input
                type="number"
                value={laborCost}
                onChange={e => setLaborCost(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Parts Cost (SAR)</label>
              <input
                type="number"
                value={partsCost}
                onChange={e => setPartsCost(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Total (SAR)</label>
              <input
                type="text"
                disabled
                value={`${totalCost} SAR`}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-950 font-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Parts Replaced / Details</label>
            <input
              type="text"
              value={parts}
              onChange={e => setParts(e.target.value)}
              placeholder="e.g. Synthetic Oil 5W-30, Genuine Oil Filter, Air Filter"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Next Service Odometer (KM)</label>
              <input
                type="number"
                value={nextMaintenanceMileage}
                onChange={e => setNextMaintenanceMileage(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              >
                <option value="COMPLETED">COMPLETED (مكتملة)</option>
                <option value="IN_PROGRESS">IN PROGRESS (تحت التنفيذ)</option>
                <option value="SCHEDULED">SCHEDULED (مجدولة)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Maintenance Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
