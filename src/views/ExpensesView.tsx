import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Receipt,
  Tag
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';
import { exportToExcel, exportToPdf } from '../utils/export';
import { Expense, Vehicle } from '../types';
import { InvoiceModal } from '../components/InvoiceModal';
import { BrandLogo } from '../components/common/BrandLogo';

interface ExpensesViewProps {
  onOpenExpenseModal: (vehicleId?: string) => void;
  onOpenVehicle: (id: string) => void;
  vehicles: Vehicle[];
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenExpenseModal,
  onOpenVehicle,
  vehicles
}) => {
  const { t, formatCurrency, formatDate } = useLanguage();
  const { token, hasRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.expenses || data?.data || []);
        setExpenses(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.warn('Notice: Expenses fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const totalSpend = safeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const filteredExpenses = safeExpenses.filter(e => {
    if (typeFilter !== 'ALL' && e.expenseType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlate = (e.plateNumber || '').toLowerCase().includes(q);
      const matchVendor = (e.vendor || '').toLowerCase().includes(q);
      const matchInvoice = (e.invoiceNumber || '').toLowerCase().includes(q);
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      if (!matchPlate && !matchVendor && !matchInvoice && !matchDesc) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    const data = filteredExpenses.map(e => ({
      'Date': e.date,
      'Vehicle': e.vehicleName,
      'Saudi Plate': e.plateNumber,
      'Category': e.expenseType,
      'Amount (SAR)': e.amount,
      'Vendor': e.vendor,
      'Invoice #': e.invoiceNumber,
      'Description': e.description || '—'
    }));
    exportToExcel(data, 'Saudi_Fleet_Operational_Expenses', 'Expenses');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-800" />
            <span>{t.expenses} ({expenses.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet Operational Cost Tracking: Tires, Insurance Policies, Registration Fees, Traffic Fines & Spare Parts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950">
            Total Spend: <span className="font-black">{formatCurrency(totalSpend)}</span>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
            <span>{t.exportExcel}</span>
          </button>

          {hasRole('ADMIN', 'ACCOUNTANT', 'MANAGER') && (
            <button
              type="button"
              onClick={() => onOpenExpenseModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by vendor, invoice #, plate, description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Expense Categories</option>
          <option value="TIRES">Tires & Alignment (إطارات)</option>
          <option value="INSURANCE">Insurance Policy (تأمين)</option>
          <option value="REGISTRATION">Istimara Registration Fee (رسوم)</option>
          <option value="INSPECTION">MVPI Fahs Periodic (فحص دوري)</option>
          <option value="FINES">Morour Traffic Fines (مخالفات)</option>
          <option value="TOLLS_SALIK">Tolls & Parking (بوابات ومواقف)</option>
          <option value="SPARE_PARTS">Spare Parts (قطع غيار)</option>
          <option value="OTHER">Other Costs (أخرى)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading expense ledger...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">{t.noRecordsFound}</p>
            <p className="text-xs text-slate-400 mt-1">No operational expenses logged.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle & Plate</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount (SAR)</th>
                  <th className="py-3 px-4">Vendor & Invoice</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right rtl:text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {formatDate(exp.date)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div
                        onClick={() => onOpenVehicle(exp.vehicleId)}
                        className="cursor-pointer hover:underline font-bold text-slate-900 flex items-center gap-1"
                      >
                        <span>{exp.vehicleName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono font-bold">{exp.plateNumber}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {exp.expenseType}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-black text-sm text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{exp.vendor}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Invoice: {exp.invoiceNumber}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {exp.description || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right rtl:text-left flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedInvoice({
                            invoiceNumber: exp.invoiceNumber || `INV-${exp.id.slice(0, 8).toUpperCase()}`,
                            date: exp.date,
                            vendor: exp.vendor,
                            expenseType: exp.expenseType,
                            description: exp.description,
                            amount: exp.amount,
                            vehiclePlate: exp.plateNumber,
                            vehicleName: exp.vehicleName
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition-colors shadow-2xs"
                        title="View Official Khyber Logistics Tax Invoice"
                      >
                        <Receipt className="w-3 h-3 text-amber-700" />
                        <span>Tax Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenVehicle(exp.vehicleId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-950 hover:text-white transition-colors"
                      >
                        <span>Vehicle 360°</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Khyber Logistics Tax Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoiceData={selectedInvoice}
      />
    </div>
  );
};
