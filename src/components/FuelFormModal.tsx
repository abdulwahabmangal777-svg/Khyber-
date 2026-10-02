import React, { useState } from 'react';
import { X, Fuel, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Vehicle, Worker } from '../types';
import { BrandLogo } from './common/BrandLogo';

interface FuelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Vehicle[];
  workers: Worker[];
  defaultVehicleId?: string;
}

export const FuelFormModal: React.FC<FuelFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  workers,
  defaultVehicleId = ''
}) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState(defaultVehicleId || vehicles[0]?.id || '');
  const [driverWorkerId, setDriverWorkerId] = useState(workers[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fuelType, setFuelType] = useState('GASOLINE_91');
  const [liters, setLiters] = useState(60);
  const [pricePerLiter, setPricePerLiter] = useState(2.18);
  const [mileage, setMileage] = useState(55000);
  const [fuelStation, setFuelStation] = useState('SASCO Station');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const totalCost = Number((liters * pricePerLiter).toFixed(2));

  const handleFuelTypeChange = (type: string) => {
    setFuelType(type);
    if (type === 'GASOLINE_91') setPricePerLiter(2.18);
    else if (type === 'GASOLINE_95') setPricePerLiter(2.33);
    else if (type === 'DIESEL') setPricePerLiter(1.15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          vehicleId,
          driverWorkerId: driverWorkerId || null,
          date,
          fuelType,
          liters,
          pricePerLiter,
          totalCost,
          mileage,
          fuelStation,
          notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log fuel');
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
          <span className="font-mono text-[10px] text-emerald-300">FUEL DISPATCH</span>
        </div>

        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Fuel className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">{t.addFuelRecord}</h2>
              <p className="text-[10px] text-emerald-200 font-arabic">تسجيل فاتورة واستهلاك الوقود للمركبة</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Target Vehicle</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.internalVehicleId} - {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Driver</label>
              <select
                value={driverWorkerId}
                onChange={e => setDriverWorkerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
              >
                <option value="">-- Anonymous / Company Tank --</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.fullName} ({w.employeeId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fuel Type</label>
              <select
                value={fuelType}
                onChange={e => handleFuelTypeChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              >
                <option value="GASOLINE_91">Gasoline 91 (بنزين ٩١ - 2.18 SAR)</option>
                <option value="GASOLINE_95">Gasoline 95 (بنزين ٩٥ - 2.33 SAR)</option>
                <option value="DIESEL">Diesel (ديزل - 1.15 SAR)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Refill Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Liters (L)</label>
              <input
                type="number"
                step="0.1"
                required
                value={liters}
                onChange={e => setLiters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">SAR / Liter</label>
              <input
                type="number"
                step="0.01"
                required
                value={pricePerLiter}
                onChange={e => setPricePerLiter(parseFloat(e.target.value) || 0)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Odometer (KM)</label>
              <input
                type="number"
                required
                value={mileage}
                onChange={e => setMileage(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fuel Station</label>
              <input
                type="text"
                required
                value={fuelStation}
                onChange={e => setFuelStation(e.target.value)}
                placeholder="e.g. SASCO, Aldrees, Naft"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
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
              <span>{loading ? 'Saving...' : 'Save Fuel Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
