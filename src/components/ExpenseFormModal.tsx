import React, { useState } from 'react';
import { X, Receipt, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { Vehicle } from '../types';
import { BrandLogo } from './common/BrandLogo';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
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
  const [expenseType, setExpenseType] = useState('TIRES');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(1200);
  const [vendor, setVendor] = useState('Bridgestone Center');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [description, setDescription] = useState('4x New Heavy Load Tires replacement');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          vehicleId,
          expenseType,
          date,
          amount,
          vendor,
          invoiceNumber,
          description
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log expense');
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
          <span className="font-mono text-[10px] text-emerald-300">CR: 1010748291</span>
        </div>

        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Log Vehicle Operational Expense & Invoice</h2>
              <p className="text-[10px] text-emerald-200 font-arabic">تسجيل فاتورة ومصروفات تشغيل الأسطول</p>
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
              <label className="block text-slate-600 font-semibold mb-1">Expense Category</label>
              <select
                value={expenseType}
                onChange={e => setExpenseType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              >
                <option value="TIRES">Tires & Alignment (إطارات وترصيص)</option>
                <option value="INSURANCE">Insurance Renewal (تجديد تأمين)</option>
                <option value="REGISTRATION">Istimara Registration Fee (رسوم تجديد)</option>
                <option value="INSPECTION">MVPI Fahs Fee (رسوم الفحص الدوري)</option>
                <option value="FINES">Morour Traffic Fines (مخالفات مرورية)</option>
                <option value="TOLLS_SALIK">Tolls / Gate Fees (بوابات ورسوم)</option>
                <option value="SPARE_PARTS">Spare Parts (قطع غيار إضافية)</option>
                <option value="OTHER">Other Operational Cost (أخرى)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date</label>
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
              <label className="block text-slate-600 font-semibold mb-1">Amount (SAR)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Vendor / Provider</label>
              <input
                type="text"
                required
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                placeholder="e.g. Michelin, Morour"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Invoice / Receipt #</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Description / Note</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Set of 4 new heavy duty tires"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
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
              <span>{loading ? 'Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
