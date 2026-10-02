import React, { useState, useEffect } from 'react';
import {
  Radio,
  Navigation,
  Truck,
  Gauge,
  MapPin,
  RefreshCw,
  Maximize2,
  Play,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Zap,
  Fuel,
  Compass
} from 'lucide-react';
import { Vehicle, CompanyLocation, Geofence } from '../../types';
import { FleetGoogleMap } from '../maps/FleetGoogleMap';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';

interface DashboardLiveGpsMapCardProps {
  onOpenVehicle: (id: string) => void;
  onNavigateToFleetMap: () => void;
}

export const DashboardLiveGpsMapCard: React.FC<DashboardLiveGpsMapCardProps> = ({
  onOpenVehicle,
  onNavigateToFleetMap
}) => {
  const { t } = useLanguage();
  const { token } = useAuth();

  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [summary, setSummary] = useState<{
    totalVehicles: number;
    movingCount: number;
    idlingCount: number;
    parkedCount: number;
    offlineCount: number;
  }>({
    totalVehicles: 0,
    movingCount: 0,
    idlingCount: 0,
    parkedCount: 0,
    offlineCount: 0
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatusMsg, setSimulationStatusMsg] = useState<string | null>(null);

  // Fetch live tracking data
  const fetchLiveTracking = async () => {
    try {
      const headers = getAuthHeaders(token);
      const [gpsRes, locRes, gfRes] = await Promise.all([
        fetch('/api/gps/live', { headers }),
        fetch('/api/locations', { headers }),
        fetch('/api/geofences', { headers })
      ]);

      if (gpsRes.ok) {
        const data = await gpsRes.json();
        setLiveVehicles(data.vehicles || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }

      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(locData.locations || []);
      }

      if (gfRes.ok) {
        const gfData = await gfRes.json();
        setGeofences(gfData.geofences || []);
      }
    } catch (err) {
      console.error('Failed to fetch live GPS data for dashboard card:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTracking();
    // Auto refresh every 25 seconds for live status
    const interval = setInterval(fetchLiveTracking, 25000);
    return () => clearInterval(interval);
  }, []);

  // Run simulation step to see trucks move in real-time
  const handleSimulateStep = async () => {
    try {
      setIsSimulating(true);
      setSimulationStatusMsg(null);
      const res = await fetch('/api/gps/simulate-step', {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatusMsg(
          `Live radar updated! Advanced ${data.updatedCount} vehicles along Saudi corridors.`
        );
        await fetchLiveTracking();
        setTimeout(() => setSimulationStatusMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to simulate fleet movement:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Convert liveVehicles to Vehicle type for FleetGoogleMap
  const mapVehicles: Vehicle[] = liveVehicles.map(lv => ({
    id: lv.vehicleId,
    internalVehicleId: lv.internalVehicleId,
    plateNumber: lv.plateNumber,
    plateDigits: lv.plateDigits,
    plateLettersEn: lv.plateLettersEn,
    plateLettersAr: '',
    make: lv.make,
    model: lv.model,
    year: 2024,
    vin: '',
    vehicleType: lv.vehicleType,
    ownershipType: 'OWNED',
    status: lv.status,
    currentMileage: lv.currentMileage || 40000,
    fuelType: 'DIESEL',
    assignedWorkerId: null,
    currentLocation: lv.currentLocation,
    departmentId: lv.departmentId,
    latitude: lv.latitude,
    longitude: lv.longitude,
    speedKmh: lv.speedKmh,
    heading: lv.heading,
    fuelLevelPercent: lv.fuelLevelPercent,
    driver: lv.driverName ? { fullName: lv.driverName, mobileNumber: lv.driverMobile } : undefined,
    createdAt: '',
    updatedAt: lv.lastPingTime
  }));

  const activeSelected = liveVehicles.find(v => v.vehicleId === selectedVehicleId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-wide">
                Live GPS Fleet Radar & Real-Time Tracking
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Khyber Logistics telematics network • Real-time satellite positions across Saudi Arabia
            </p>
          </div>
        </div>

        {/* Action Controls & Metrics */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status summary pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-xl p-1 text-xs border border-slate-700/80">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{summary.movingCount} Moving</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{summary.idlingCount} Idling</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>{summary.parkedCount} Parked</span>
            </div>
          </div>

          <button
            onClick={handleSimulateStep}
            disabled={isSimulating}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Step fleet simulation along highways"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isSimulating ? 'Updating...' : 'Simulate Movement'}
          </button>

          <button
            onClick={onNavigateToFleetMap}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Map & Geofences</span>
          </button>
        </div>
      </div>

      {simulationStatusMsg && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{simulationStatusMsg}</span>
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="relative w-full" style={{ height: '420px' }}>
        <FleetGoogleMap
          vehicles={mapVehicles}
          locations={locations}
          geofences={geofences}
          showGeofences={true}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={id => setSelectedVehicleId(id)}
          height="420px"
          showControls={true}
        />

        {/* Selected Vehicle Floating Info Card */}
        {activeSelected && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 border border-slate-700/80 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm font-mono text-white">
                  {activeSelected.internalVehicleId}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeSelected.telemetryStatus === 'MOVING' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {activeSelected.telemetryStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <span className="text-slate-400 block text-[10px]">Plate Number</span>
                <strong className="font-mono text-white">{activeSelected.plateNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Current Speed</span>
                <strong className="font-mono text-emerald-400">{activeSelected.speedKmh} km/h</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Driver</span>
                <span className="text-slate-200 truncate block">{activeSelected.driverName || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Fuel Level</span>
                <span className="text-cyan-400 font-mono font-bold">{activeSelected.fuelLevelPercent}%</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-800/80 p-2 rounded-lg mb-3 flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{activeSelected.currentLocation || 'Saudi Transit Corridor'}</span>
            </div>

            <button
              onClick={() => onOpenVehicle(activeSelected.vehicleId)}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>View Live GPS & Route Playback</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Quick Telemetry Strip */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{geofences.length} Active Geofence Zones Monitored</span>
          <span className="text-slate-300">•</span>
          <span>Automatic Geofence Ingress/Egress Alerts Enabled</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveTracking}
            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telematics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
