import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Truck,
  User,
  FileText,
  AlertTriangle,
  Wrench,
  Fuel,
  DollarSign,
  Phone,
  Calendar,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  QrCode
} from 'lucide-react';
import { SaudiPlate } from './SaudiPlate';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  onSelectWorker?: (workerId: string) => void;
  onOpenQRScanner?: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectVehicle,
  onSelectWorker,
  onOpenQRScanner
}) => {
  const { t, formatCurrency, formatDate, formatDaysRemainingText, dir } = useLanguage();
  const { token } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    vehicles: any[];
    workers: any[];
    vehiclesCount: number;
    workersCount: number;
  }>({ vehicles: [], workers: [], vehiclesCount: 0, workersCount: 0 });
  const [activeTab, setActiveTab] = useState<'ALL' | 'VEHICLES' | 'WORKERS'>('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 50);
      if (initialQuery.trim()) {
        performSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults({ vehicles: [], workers: [], vehiclesCount: 0, workersCount: 0 });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search/global?q=${encodeURIComponent(searchTerm)}`, {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.warn('Search notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const quickSearchPresets = [
    { label: '7845 XYZ', type: 'plate', q: '7845 XYZ' },
    { label: '1234 ABC', type: 'plate', q: '1234 ABC' },
    { label: '2491028475 (Iqama)', type: 'iqama', q: '2491028475' },
    { label: '1092837461 (National ID)', type: 'iqama', q: '1092837461' },
    { label: 'Actros Truck', type: 'vehicle', q: 'Actros' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 pt-12 sm:pt-16 overflow-y-auto"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Search className="w-5 h-5" />
          </div>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                performSearch(e.target.value);
              }}
              placeholder={t.globalSearchPlaceholder}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-medium shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults({ vehicles: [], workers: [], vehiclesCount: 0, workersCount: 0 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {onOpenQRScanner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQRScanner();
              }}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
              title="Open QR Scanner"
            >
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets */}
        {!query && (
          <div className="p-6 bg-white flex-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Instant Saudi Lookup Suggestions
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickSearchPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(preset.q);
                      performSearch(preset.q);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-950 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">💡 360-Degree Instant Profile Search:</p>
              <p>• Type any <strong>Saudi License Plate Number</strong> (e.g. 7845 XYZ) to view vehicle details, assigned driver, Morour Istimara & insurance expiry, documents, maintenance history, and fuel expenses.</p>
              <p>• Type any <strong>10-digit Saudi Iqama or National ID</strong> (e.g. 2491028475) to view employee details, passport, driver license, assigned vehicle, and expiring documents.</p>
            </div>
          </div>
        )}

        {/* Results Container */}
        {query && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {loading && (
              <div className="py-12 text-center text-slate-400 text-sm">
                <div className="animate-spin w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full mx-auto mb-3"></div>
                Searching database indexes...
              </div>
            )}

            {!loading && results.vehicles.length === 0 && results.workers.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No matching vehicles or workers found</p>
                <p className="text-xs text-slate-400 mt-1">Try searching by full or partial plate number, Iqama number, VIN, or employee name.</p>
              </div>
            )}

            {/* VEHICLES RESULTS (Full 360-degree card) */}
            {results.vehicles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-800" />
                    <span>Matching Vehicles ({results.vehicles.length})</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {results.vehicles.map((v: any) => (
                    <div
                      key={v.id}
                      className="bg-white border-2 border-emerald-700/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Vehicle Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <SaudiPlate
                            plateDigits={v.plateDigits}
                            plateLettersEn={v.plateLettersEn}
                            plateDigitsAr={v.plateDigitsAr}
                            plateLettersAr={v.plateLettersAr}
                            size="md"
                          />
                          <div>
                            <div className="text-base font-bold text-slate-900">
                              {v.make} {v.model} ({v.year})
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{v.internalVehicleId}</span>
                              <span>•</span>
                              <span>VIN: <span className="font-mono">{v.vin}</span></span>
                              <span>•</span>
                              <span className="text-emerald-800 font-medium">{v.departmentName}</span>
                            </div>
                          </div>
                        </div>

                        {onSelectVehicle && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVehicle(v.id);
                              onClose();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-sm self-start sm:self-center"
                          >
                            <span>Open 360° Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Grid of Key Connected Data */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                        {/* Driver Card */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Assigned Driver</span>
                          </div>
                          {v.driver ? (
                            <div>
                              <div className="text-xs font-bold text-slate-900">{v.driver.fullName}</div>
                              <div className="text-[11px] text-slate-500 font-arabic">{v.driver.fullNameAr}</div>
                              <div className="text-[11px] text-slate-600 mt-1 font-mono">Iqama: {v.driver.iqamaNumber}</div>
                              <div className="text-[11px] text-emerald-800 mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{v.driver.mobileNumber}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-amber-700 italic">No assigned driver currently</div>
                          )}
                        </div>

                        {/* Expiry Status */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Morour & Compliance</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Istimara:</span>
                              <span className="font-semibold text-slate-800">{formatDate(v.istimaraExpiry)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Insurance:</span>
                              <span className="font-semibold text-slate-800">{formatDate(v.insuranceExpiry)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">MVPI Fahs:</span>
                              <span className="font-semibold text-slate-800">{formatDate(v.inspectionExpiry)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financials & Odometer */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Operations & Spend</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Odometer:</span>
                              <span className="font-bold text-slate-900">{v.currentMileage?.toLocaleString()} KM</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Total Fuel Spend:</span>
                              <span className="font-semibold text-emerald-900">{formatCurrency(v.financialSummary?.totalFuelSpend || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Maintenance Spend:</span>
                              <span className="font-semibold text-slate-900">{formatCurrency(v.financialSummary?.totalMaintSpend || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Alerts */}
                      {v.alerts && v.alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                          {v.alerts.map((al: any) => (
                            <span
                              key={al.id}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                al.daysRemaining < 0
                                  ? 'bg-red-100 text-red-800'
                                  : (al.daysRemaining <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-900')
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{al.documentTypeName}: {formatDaysRemainingText(al.daysRemaining)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WORKERS RESULTS (Full 360-degree card) */}
            {results.workers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-800" />
                    <span>Matching Workers & Drivers ({results.workers.length})</span>
                  </h3>
                </div>

                <div className="space-y-4">
                  {results.workers.map((w: any) => (
                    <div
                      key={w.id}
                      className="bg-white border-2 border-emerald-700/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Worker Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={w.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                            alt={w.fullName}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="text-base font-bold text-slate-900">{w.fullName}</div>
                            <div className="text-xs text-slate-500 font-arabic">{w.fullNameAr}</div>
                            <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-semibold bg-emerald-50 text-emerald-950 px-2 py-0.5 rounded border border-emerald-200">
                                {w.employeeId}
                              </span>
                              <span>•</span>
                              <span className="font-mono font-bold text-slate-800">Iqama: {w.iqamaNumber}</span>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">{w.jobTitle} ({w.nationality})</span>
                            </div>
                          </div>
                        </div>

                        {onSelectWorker && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectWorker(w.id);
                              onClose();
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-sm self-start sm:self-center"
                          >
                            <span>Open 360° Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Worker 360 Data Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                        {/* Assigned Vehicle */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <Truck className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Assigned Fleet Asset</span>
                          </div>
                          {w.assignedVehicle ? (
                            <div>
                              <div className="text-xs font-bold text-slate-900">{w.assignedVehicle.internalVehicleId} - {w.assignedVehicle.make} {w.assignedVehicle.model}</div>
                              <div className="mt-1">
                                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                                  {w.assignedVehicle.plateNumber}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                Istimara: {formatDate(w.assignedVehicle.istimaraExpiry || '')}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic">No assigned vehicle</div>
                          )}
                        </div>

                        {/* Government & Compliance Expiry */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Government Licensing</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Iqama Expiry:</span>
                              <span className="font-semibold text-slate-800">{formatDate(w.iqamaExpiry)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Passport Expiry:</span>
                              <span className="font-semibold text-slate-800">{formatDate(w.passportExpiry)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Driver License:</span>
                              <span className="font-semibold text-slate-800">{formatDate(w.driverLicenseExpiry)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Employment & Salary */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Contact & Contract</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Mobile:</span>
                              <span className="font-semibold text-emerald-800">{w.mobileNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Basic Salary:</span>
                              <span className="font-bold text-slate-900">{formatCurrency(w.salary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Department:</span>
                              <span className="font-semibold text-slate-800">{w.departmentName}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Alerts */}
                      {w.alerts && w.alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                          {w.alerts.map((al: any) => (
                            <span
                              key={al.id}
                              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                al.daysRemaining < 0
                                  ? 'bg-red-100 text-red-800'
                                  : (al.daysRemaining <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-900')
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{al.documentTypeName}: {formatDaysRemainingText(al.daysRemaining)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold">ESC</span>
            <span>to close</span>
          </div>
          <div>Saudi Fleet & Workforce Compliance Engine • Real-time DB Query</div>
        </div>
      </div>
    </div>
  );
};
