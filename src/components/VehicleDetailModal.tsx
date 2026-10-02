import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  User,
  FileText,
  Wrench,
  Fuel,
  Receipt,
  AlertTriangle,
  Calendar,
  DollarSign,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Download,
  Eye,
  ExternalLink,
  QrCode,
  Activity,
  Users,
  Radio,
  MapPin,
  Compass
} from 'lucide-react';
import { SaudiPlate } from './SaudiPlate';
import { AssetQRLabelModal } from './AssetQRLabelModal';
import { VehicleTimeline } from './VehicleTimeline';
import { VehicleAssignmentsList } from './VehicleAssignmentsList';
import { VehicleGpsTrackingTab } from './vehicles/VehicleGpsTrackingTab';
import { BrandLogo } from './common/BrandLogo';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../utils/api';

interface VehicleDetailModalProps {
  vehicleId: string | null;
  onClose: () => void;
  onOpenWorker?: (workerId: string) => void;
  onAddMaintenance?: (vehicleId: string) => void;
  onAddFuel?: (vehicleId: string) => void;
  onAddExpense?: (vehicleId: string) => void;
  onUploadDoc?: (vehicleId: string) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicleId,
  onClose,
  onOpenWorker,
  onAddMaintenance,
  onAddFuel,
  onAddExpense,
  onUploadDoc
}) => {
  const { t, formatCurrency, formatDate, formatDaysRemainingText, dir } = useLanguage();
  const { token, hasRole } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GPS_TRACKING' | 'TIMELINE' | 'ASSIGNMENTS' | 'DOCUMENTS' | 'MAINTENANCE' | 'FUEL' | 'EXPENSES' | 'ALERTS'>('OVERVIEW');
  const [isQRLabelOpen, setIsQRLabelOpen] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails(vehicleId);
    }
  }, [vehicleId]);

  const fetchVehicleDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        // Fallback fetch trips if not present
        if (!data.trips || !Array.isArray(data.trips) || data.trips.length === 0) {
          try {
            const tripsRes = await fetch(`/api/trips?vehicleId=${id}`, {
              headers: getAuthHeaders(token)
            });
            if (tripsRes.ok) {
              const tripsData = await tripsRes.json();
              if (tripsData.success && Array.isArray(tripsData.trips)) {
                data.trips = tripsData.trips;
              }
            }
          } catch (e) {
            // ignore fallback error
          }
        }
        setVehicle(data);
      }
    } catch (err) {
      console.warn('Notice: Vehicle details fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!vehicleId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
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
              COMMERCIAL FLEET ASSET
            </span>
            <span>CR: 1010748291</span>
          </div>
        </div>

        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SaudiPlate
              plateDigits={vehicle?.plateDigits || '0000'}
              plateLettersEn={vehicle?.plateLettersEn || 'KSA'}
              plateDigitsAr={vehicle?.plateDigitsAr}
              plateLettersAr={vehicle?.plateLettersAr}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  {vehicle?.make} {vehicle?.model} ({vehicle?.year})
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    vehicle?.status === 'ACTIVE'
                      ? 'bg-emerald-500 text-white'
                      : (vehicle?.status === 'MAINTENANCE' ? 'bg-amber-500 text-slate-950' : 'bg-slate-600 text-white')
                  }`}
                >
                  {vehicle?.status}
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex items-center gap-2">
                <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-white">{vehicle?.internalVehicleId}</span>
                <span>•</span>
                <span>VIN: <span className="font-mono text-white">{vehicle?.vin}</span></span>
                <span>•</span>
                <span>{vehicle?.departmentName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: '360° Overview', icon: Truck },
            { id: 'GPS_TRACKING', label: 'Live GPS & Route Playback', icon: Radio, pulse: true },
            {
              id: 'ASSIGNMENTS',
              label: `Driver History (${vehicle?.assignments?.length || (vehicle?.assignedWorkerId ? 1 : 0)})`,
              icon: Users
            },
            {
              id: 'TIMELINE',
              label: `Timeline (${(vehicle?.trips?.length || 0) + (vehicle?.fuel?.length || 0) + (vehicle?.maintenance?.length || 0)})`,
              icon: Activity
            },
            { id: 'DOCUMENTS', label: `Documents (${vehicle?.documents?.length || 0})`, icon: FileText },
            { id: 'MAINTENANCE', label: `Maintenance (${vehicle?.maintenance?.length || 0})`, icon: Wrench },
            { id: 'FUEL', label: `Fuel (${vehicle?.fuel?.length || 0})`, icon: Fuel },
            { id: 'EXPENSES', label: `Expenses (${vehicle?.expenses?.length || 0})`, icon: Receipt },
            { id: 'ALERTS', label: `Alerts (${vehicle?.alerts?.length || 0})`, icon: AlertTriangle, badge: vehicle?.alerts?.length }
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

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="animate-spin w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full mx-auto mb-3"></div>
              Loading 360° vehicle telemetry and connected records...
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Top 3 Columns: Assigned Driver, Compliance Status, Odometer & Financials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Driver Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-4 h-4 text-emerald-800" />
                          Assigned Driver
                        </span>
                        {vehicle?.driver && onOpenWorker && (
                          <button
                            type="button"
                            onClick={() => onOpenWorker(vehicle.driver.id)}
                            className="text-xs text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <span>Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {vehicle?.driver ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={vehicle.driver.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                              alt={vehicle.driver.fullName}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-900">{vehicle.driver.fullName}</div>
                              <div className="text-xs text-slate-500 font-arabic">{vehicle.driver.fullNameAr}</div>
                              <div className="text-[11px] text-slate-600 font-mono">Iqama: {vehicle.driver.iqamaNumber}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Iqama Expiry:</span>
                              <span className="font-semibold text-slate-800">{formatDate(vehicle.driver.iqamaExpiry)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Driver License:</span>
                              <span className="font-semibold text-slate-800">{formatDate(vehicle.driver.driverLicenseExpiry || '')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Mobile:</span>
                              <span className="font-semibold text-emerald-900 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {vehicle.driver.mobileNumber}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('ASSIGNMENTS')}
                            className="w-full mt-2.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Driver Assignment History ({vehicle?.assignments?.length || 1})</span>
                          </button>
                        </div>
                      ) : (
                        <div className="py-5 text-center text-xs text-slate-400 space-y-2">
                          <p className="italic">No driver currently assigned to this vehicle</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('ASSIGNMENTS')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg border border-blue-200 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Link Driver / View History</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Government & Compliance Expiries */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-800" />
                          Morour & Compliance
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        {/* Istimara */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">Istimara Registration</span>
                            <span className="text-[11px] font-mono text-slate-500">{vehicle?.istimaraNumber}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-slate-500">Expires: {formatDate(vehicle?.istimaraExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(vehicle?.istimaraDaysRemaining || 0)}</span>
                          </div>
                        </div>

                        {/* Insurance */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">Insurance ({vehicle?.insuranceCompany})</span>
                            <span className="text-[11px] font-mono text-slate-500">{vehicle?.insurancePolicyNumber}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-slate-500">Expires: {formatDate(vehicle?.insuranceExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(vehicle?.insuranceDaysRemaining || 0)}</span>
                          </div>
                        </div>

                        {/* Periodic Inspection */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">Periodic MVPI (Fahs)</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-slate-500">Expires: {formatDate(vehicle?.inspectionExpiry)}</span>
                            <span className="font-bold text-emerald-800">{formatDaysRemainingText(vehicle?.inspectionDaysRemaining || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational & Financial Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-800" />
                          Odometer & Costs
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="bg-emerald-950 text-white p-3 rounded-xl shadow-xs">
                          <div className="text-[11px] text-emerald-300 uppercase font-semibold">Current Odometer</div>
                          <div className="text-xl font-black">{vehicle?.currentMileage?.toLocaleString()} KM</div>
                          <div className="text-[10px] text-emerald-200 mt-0.5">Location: {vehicle?.currentLocation}</div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Fuel Spend:</span>
                            <span className="font-bold text-emerald-950">{formatCurrency(vehicle?.stats?.totalFuelCost || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Fuel Consumed:</span>
                            <span className="font-semibold text-slate-800">{vehicle?.stats?.totalFuelLiters || 0} L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Maintenance Spend:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(vehicle?.stats?.totalMaintenanceCost || 0)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-100">
                            <span className="font-bold text-slate-800">Total Operational TCO:</span>
                            <span className="font-black text-emerald-800">
                              {formatCurrency((vehicle?.stats?.totalFuelCost || 0) + (vehicle?.stats?.totalMaintenanceCost || 0) + (vehicle?.stats?.totalOtherExpenses || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Spec Grid */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                      Technical & Asset Specifications
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Vehicle Type</span>
                        <span className="font-bold text-slate-900">{vehicle?.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Chassis / VIN</span>
                        <span className="font-bold text-slate-900 font-mono">{vehicle?.vin}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Engine Number</span>
                        <span className="font-bold text-slate-900 font-mono">{vehicle?.engineNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Fuel Type</span>
                        <span className="font-bold text-slate-900">{vehicle?.fuelType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ownership</span>
                        <span className="font-bold text-slate-900">{vehicle?.ownershipType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Purchase Date</span>
                        <span className="font-bold text-slate-900">{formatDate(vehicle?.purchaseDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Purchase Price</span>
                        <span className="font-bold text-slate-900">{formatCurrency(vehicle?.purchasePrice || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Color</span>
                        <span className="font-bold text-slate-900">{vehicle?.color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trip History, Fuel & Maintenance Timeline Section */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-800" />
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Recent Trip, Fuel & Maintenance Activity
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('TIMELINE')}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
                      >
                        <span>Full Interactive Timeline</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <VehicleTimeline
                      vehicle={vehicle}
                      onAddMaintenance={onAddMaintenance}
                      onAddFuel={onAddFuel}
                      onSelectRouteTab={() => setActiveTab('GPS_TRACKING')}
                      onViewFullTimeline={() => setActiveTab('TIMELINE')}
                      compact={true}
                      maxRecent={5}
                    />
                  </div>
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-4 rounded-xl shadow-xs">
                    <div>
                      <h3 className="text-sm font-black flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>Fleet Activity & Operational Timeline</span>
                      </h3>
                      <p className="text-xs text-emerald-200/90 mt-0.5">
                        Chronological audit trail combining recent trip dispatches, fuel replenishment logs, and commercial garage maintenance events.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab('GPS_TRACKING')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors border border-white/20 shadow-2xs"
                      >
                        <Radio className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Route Playback</span>
                      </button>
                      {onAddMaintenance && hasRole('ADMIN', 'MANAGER') && (
                        <button
                          type="button"
                          onClick={() => onAddMaintenance(vehicle.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log Maintenance</span>
                        </button>
                      )}
                      {onAddFuel && (
                        <button
                          type="button"
                          onClick={() => onAddFuel(vehicle.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log Fuel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <VehicleTimeline
                    vehicle={vehicle}
                    onAddMaintenance={onAddMaintenance}
                    onAddFuel={onAddFuel}
                    onSelectRouteTab={() => setActiveTab('GPS_TRACKING')}
                    compact={false}
                  />
                </div>
              )}

              {/* DRIVER ASSIGNMENTS TAB */}
              {activeTab === 'ASSIGNMENTS' && (
                <VehicleAssignmentsList
                  vehicle={vehicle}
                  onOpenWorker={onOpenWorker}
                  onRefreshVehicle={() => fetchVehicleDetails(vehicle.id)}
                  userRole={hasRole('ADMIN') ? 'ADMIN' : hasRole('MANAGER') ? 'MANAGER' : 'VIEWER'}
                  token={token}
                />
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Uploaded Official Documents & Policies</h3>
                    {onUploadDoc && (
                      <button
                        type="button"
                        onClick={() => onUploadDoc(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </button>
                    )}
                  </div>

                  {vehicle?.documents?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vehicle.documents.map((doc: any) => (
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

                          <div className="flex items-center gap-1">
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No documents uploaded for this vehicle yet.
                    </div>
                  )}
                </div>
              )}

              {/* MAINTENANCE TAB */}
              {activeTab === 'MAINTENANCE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Work Orders & Garage Maintenance History</h3>
                    {onAddMaintenance && hasRole('ADMIN', 'MANAGER') && (
                      <button
                        type="button"
                        onClick={() => onAddMaintenance(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Maintenance</span>
                      </button>
                    )}
                  </div>

                  {vehicle?.maintenance?.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left rtl:text-right">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Workshop / Garage</th>
                            <th className="p-3">Odometer</th>
                            <th className="p-3">Parts Replaced</th>
                            <th className="p-3">Cost</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vehicle.maintenance.map((m: any) => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{formatDate(m.date)}</td>
                              <td className="p-3 font-bold text-emerald-950">{m.maintenanceType}</td>
                              <td className="p-3 text-slate-700">{m.workshop}</td>
                              <td className="p-3 font-mono">{m.mileage?.toLocaleString()} KM</td>
                              <td className="p-3 text-slate-600 max-w-[200px] truncate">{m.parts || '—'}</td>
                              <td className="p-3 font-bold text-slate-900">{formatCurrency(m.totalCost)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No maintenance work orders logged for this vehicle.
                    </div>
                  )}
                </div>
              )}

              {/* FUEL TAB */}
              {activeTab === 'FUEL' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Fuel Refill Logs & Consumption</h3>
                    {onAddFuel && (
                      <button
                        type="button"
                        onClick={() => onAddFuel(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Fuel Refill</span>
                      </button>
                    )}
                  </div>

                  {vehicle?.fuel?.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left rtl:text-right">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Fuel Type</th>
                            <th className="p-3">Liters</th>
                            <th className="p-3">Price / Liter</th>
                            <th className="p-3">Total Cost</th>
                            <th className="p-3">Odometer</th>
                            <th className="p-3">Station</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vehicle.fuel.map((f: any) => (
                            <tr key={f.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{formatDate(f.date)}</td>
                              <td className="p-3 font-bold text-slate-900">{f.fuelType}</td>
                              <td className="p-3 font-semibold text-emerald-900">{f.liters} L</td>
                              <td className="p-3">{formatCurrency(f.pricePerLiter)}</td>
                              <td className="p-3 font-bold text-slate-900">{formatCurrency(f.totalCost)}</td>
                              <td className="p-3 font-mono">{f.mileage?.toLocaleString()} KM</td>
                              <td className="p-3 text-slate-600">{f.fuelStation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No fuel refill records recorded for this vehicle.
                    </div>
                  )}
                </div>
              )}

              {/* EXPENSES TAB */}
              {activeTab === 'EXPENSES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Vehicle Operational Expenses</h3>
                    {onAddExpense && hasRole('ADMIN', 'ACCOUNTANT') && (
                      <button
                        type="button"
                        onClick={() => onAddExpense(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Expense</span>
                      </button>
                    )}
                  </div>

                  {vehicle?.expenses?.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left rtl:text-right">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Vendor</th>
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vehicle.expenses.map((e: any) => (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{formatDate(e.date)}</td>
                              <td className="p-3 font-bold text-emerald-950">{e.expenseType}</td>
                              <td className="p-3 text-slate-700">{e.vendor}</td>
                              <td className="p-3 font-mono">{e.invoiceNumber || '—'}</td>
                              <td className="p-3 text-slate-600 max-w-[200px] truncate">{e.description}</td>
                              <td className="p-3 font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No expenses logged for this vehicle yet.
                    </div>
                  )}
                </div>
              )}

              {/* ALERTS TAB */}
              {activeTab === 'ALERTS' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Active Expiry & Compliance Alerts</h3>
                  {vehicle?.alerts?.length > 0 ? (
                    <div className="space-y-2">
                      {vehicle.alerts.map((al: any) => (
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
                      <span>All vehicle documents and inspections are completely valid!</span>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE GPS TELEMETRY & ROUTE PLAYBACK TAB */}
              {activeTab === 'GPS_TRACKING' && vehicle && (
                <VehicleGpsTrackingTab
                  vehicle={vehicle}
                  onRefreshVehicle={() => vehicleId && fetchVehicleDetails(vehicleId)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Saudi QR Asset Tag Generation & Print Modal */}
      {isQRLabelOpen && vehicle && (
        <AssetQRLabelModal
          isOpen={isQRLabelOpen}
          onClose={() => setIsQRLabelOpen(false)}
          type="VEHICLE"
          data={vehicle}
        />
      )}
    </div>
  );
};
