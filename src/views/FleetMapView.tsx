import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Building2,
  Navigation,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Radio,
  Layers,
  Fuel,
  Gauge,
  ShieldCheck,
  Plus,
  Play,
  Bell,
  Trash2,
  PenTool,
  Undo2,
  RotateCcw,
  Compass,
  Check,
  Mail,
  Send,
  Eye,
  X
} from 'lucide-react';
import { Vehicle, CompanyLocation, TripRecord, Geofence, GeofenceAlert } from '../types';
import { FleetGoogleMap } from '../components/maps/FleetGoogleMap';
import { AddGeofenceModal, DrawnShapeInitialData } from '../components/maps/AddGeofenceModal';
import { useLanguage } from '../context/LanguageContext';

interface FleetMapViewProps {
  vehicles: Vehicle[];
  onOpenVehicle: (id: string) => void;
  onOpenWorker?: (id: string) => void;
}

// Haversine distance calculator in meters
function computeDistanceMeters(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const FleetMapView: React.FC<FleetMapViewProps> = ({
  vehicles,
  onOpenVehicle,
  onOpenWorker
}) => {
  const { language } = useLanguage();
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState<GeofenceAlert[]>([]);
  const [showGeofences, setShowGeofences] = useState(true);
  const [isAddGeofenceOpen, setIsAddGeofenceOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'HUBS' | 'GEOFENCES' | 'ALERTS' | 'TRIPS'>('VEHICLES');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'TRANSIT' | 'MAINTENANCE' | 'HUBS'>('ALL');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Visual Geofence Boundary Drawing Tool States
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'POLYGON' | 'CIRCLE'>('POLYGON');
  const [drawingPoints, setDrawingPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [drawingRadiusMeters, setDrawingRadiusMeters] = useState<number>(2000);
  const [drawingColor, setDrawingColor] = useState<string>('#10B981');
  const [drawnShapeToConfigure, setDrawnShapeToConfigure] = useState<DrawnShapeInitialData | null>(null);

  // Test Alert Simulation States & Dispatched Email Viewer
  const [testingGeofenceId, setTestingGeofenceId] = useState<string | null>(null);
  const [testAlertFeedback, setTestAlertFeedback] = useState<string | null>(null);
  const [selectedAlertForEmailView, setSelectedAlertForEmailView] = useState<GeofenceAlert | null>(null);

  // Fetch company locations, active trips, and geofences
  const fetchMapData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [locRes, tripsRes, gfRes, alertsRes] = await Promise.all([
        fetch('/api/locations', { headers }),
        fetch('/api/trips', { headers }),
        fetch('/api/geofences', { headers }),
        fetch('/api/geofences/alerts', { headers })
      ]);

      const locData = await locRes.json();
      const tripsData = await tripsRes.json();
      const gfData = await gfRes.json();
      const alertsData = await alertsRes.json();

      if (locData.success) {
        setLocations(locData.locations || []);
      }
      if (tripsData.success) {
        setTrips(tripsData.trips || []);
      }
      if (gfData.success) {
        setGeofences(gfData.geofences || []);
      }
      if (alertsData.success) {
        setGeofenceAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStep = async () => {
    try {
      setIsSimulating(true);
      setSimMessage(null);
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/gps/simulate-step', {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setSimMessage(`Advanced ${data.updatedCount} vehicles along Saudi corridors.`);
        await fetchMapData();
        setTimeout(() => setSimMessage(null), 4000);
      }
    } catch (err) {
      console.error('Simulation step error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/geofences/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setGeofences(prev => prev.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error('Delete geofence error:', err);
    }
  };

  // Drawing Tools Control Functions
  const startDrawing = (mode: 'POLYGON' | 'CIRCLE' = 'POLYGON') => {
    setIsDrawingBoundary(true);
    setDrawingMode(mode);
    setDrawingPoints([]);
    setDrawnShapeToConfigure(null);
  };

  const cancelDrawing = () => {
    setIsDrawingBoundary(false);
    setDrawingPoints([]);
    setDrawnShapeToConfigure(null);
  };

  const undoLastPoint = () => {
    setDrawingPoints(prev => prev.slice(0, -1));
  };

  const handleMapClickDuringDrawing = (coords: { lat: number; lng: number }) => {
    if (!isDrawingBoundary) return;

    if (drawingMode === 'POLYGON') {
      setDrawingPoints(prev => [...prev, coords]);
    } else {
      if (drawingPoints.length === 0) {
        setDrawingPoints([coords]);
      } else {
        const dist = computeDistanceMeters(drawingPoints[0], coords);
        setDrawingRadiusMeters(Math.max(200, dist));
      }
    }
  };

  const handleFinishDrawing = () => {
    if (drawingMode === 'POLYGON') {
      if (drawingPoints.length < 3) return;
      setDrawnShapeToConfigure({
        type: 'POLYGON',
        polygonCoordinates: drawingPoints
      });
    } else {
      if (drawingPoints.length === 0) return;
      setDrawnShapeToConfigure({
        type: 'CIRCLE',
        center: drawingPoints[0],
        radiusMeters: drawingRadiusMeters
      });
    }
    setIsAddGeofenceOpen(true);
    setIsDrawingBoundary(false);
  };

  // Simulate Geofence Breach Alert
  const handleTriggerTestAlert = async (geofenceId: string) => {
    try {
      setTestingGeofenceId(geofenceId);
      setTestAlertFeedback(null);
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/geofences/${geofenceId}/test-alert`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setTestAlertFeedback(`Dispatched test breach notification for "${data.geofence.name}" to ${data.alert.notificationEmails?.join(', ') || 'abdulwahabmangal777@gmail.com'}`);
        await fetchMapData();
        setActiveTab('ALERTS');
        setTimeout(() => setTestAlertFeedback(null), 6000);
      }
    } catch (err) {
      console.error('Test alert error:', err);
    } finally {
      setTestingGeofenceId(null);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  // Filter items based on search query
  const filteredVehicles = vehicles.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.internalVehicleId.toLowerCase().includes(q) ||
      v.plateNumber.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.currentLocation.toLowerCase().includes(q) ||
      (v.driver?.fullName && v.driver.fullName.toLowerCase().includes(q))
    );
  });

  const filteredLocations = locations.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nameAr.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q)
    );
  });

  const inTransitCount = vehicles.filter(v => v.status === 'ACTIVE' && (v.speedKmh || 0) >= 60).length;
  const inMaintenanceCount = vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const activeTripsCount = trips.filter(t => t.status === 'IN_PROGRESS').length;

  return (
    <div className={`space-y-5 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''}`}>
      {/* Header & Metric Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Navigation className="w-6 h-6 text-amber-400" />
              {language === 'ar' ? 'خريطة الأسطول والمواقع اللوجستية' : 'Interactive Fleet & Logistics Map'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Telematics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Google Maps Platform real-time vehicle positioning, route polylines, and virtual boundary visual drawing
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {simMessage && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-medium animate-in fade-in">
              {simMessage}
            </span>
          )}

          {testAlertFeedback && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 font-medium animate-in fade-in flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              {testAlertFeedback}
            </span>
          )}

          <button
            onClick={handleSimulateStep}
            disabled={isSimulating}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            title="Advance fleet simulation along Saudi corridors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isSimulating ? 'Simulating...' : 'Simulate Movement'}
          </button>

          {/* Visual Boundary Drawing Tool Trigger Button */}
          {!isDrawingBoundary ? (
            <button
              onClick={() => startDrawing('POLYGON')}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ring-1 ring-emerald-400/40"
              title="Draw a custom geofence boundary zone directly on the map"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'رسم منطقة سياج' : 'Draw Boundary'}</span>
            </button>
          ) : (
            <button
              onClick={cancelDrawing}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Drawing</span>
            </button>
          )}

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showGeofences
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Geofences {showGeofences ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              setDrawnShapeToConfigure(null);
              setIsAddGeofenceOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Geofence</span>
          </button>

          <button
            onClick={fetchMapData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            title="Refresh map telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4" /> Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" /> Fullscreen Map
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Tracked Vehicles</div>
            <div className="text-lg font-bold text-white font-mono">{vehicles.length}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Highway Transit</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{inTransitCount} Units</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Virtual Geofences</div>
            <div className="text-lg font-bold text-purple-400 font-mono">{geofences.length} Zones</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Geofence Events</div>
            <div className="text-lg font-bold text-amber-400 font-mono">{geofenceAlerts.length} Alerts</div>
          </div>
        </div>
      </div>

      {/* Main Map Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Interactive Unit Selector & Telematics Drawer */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3.5 h-[620px] flex flex-col">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('VEHICLES')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'VEHICLES'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('GEOFENCES')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'GEOFENCES'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Geofences ({geofences.length})
            </button>
            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'ALERTS'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alerts ({geofenceAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('HUBS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'HUBS'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hubs ({locations.length})
            </button>
            <button
              onClick={() => setActiveTab('TRIPS')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'TRIPS'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trips ({trips.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'VEHICLES' ? 'Filter by plate, ID, model...' : 'Search records...'}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500/50"
            />
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activeTab === 'VEHICLES' && (
              <>
                {filteredVehicles.map(vehicle => {
                  const isSelected = selectedVehicleId === vehicle.id;
                  const isMoving = (vehicle.speedKmh || 0) > 0;
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              vehicle.status === 'ACTIVE'
                                ? isMoving
                                  ? 'bg-emerald-400 animate-ping'
                                  : 'bg-blue-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="font-mono font-bold text-white text-xs">
                            {vehicle.internalVehicleId}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {vehicle.plateNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{vehicle.currentLocation}</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {vehicle.speedKmh || 0} km/h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'GEOFENCES' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Active Geofence Boundaries</span>
                  <button
                    onClick={() => startDrawing('POLYGON')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Draw on Map</span>
                  </button>
                </div>

                {geofences.map(gf => (
                  <div
                    key={gf.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: gf.color || '#10B981' }}
                        />
                        <strong className="text-xs font-bold text-white">{gf.name}</strong>
                      </div>
                      <button
                        onClick={() => handleDeleteGeofence(gf.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete Geofence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {gf.nameAr && <div className="text-[11px] text-slate-400" dir="rtl">{gf.nameAr}</div>}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                      <span className="flex items-center gap-1">
                        {gf.type === 'POLYGON' ? <Layers className="w-3 h-3 text-purple-400" /> : <Compass className="w-3 h-3 text-emerald-400" />}
                        {gf.type === 'POLYGON' ? `Polygon (${gf.polygonCoordinates?.length || 0} vertices)` : `Radius: ${gf.radiusMeters}m`}
                      </span>
                      <span>Max: {gf.speedLimitKmh ? `${gf.speedLimitKmh} km/h` : 'None'}</span>
                    </div>

                    {/* Notification Dispatch Status & Test Alert Button */}
                    <div className="flex items-center justify-between gap-1 text-[10px] pt-1">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Mail className="w-3 h-3 text-amber-400" />
                        <span className="truncate max-w-[130px]" title={gf.notificationEmails?.join(', ') || 'abdulwahabmangal777@gmail.com'}>
                          {gf.notificationEmails?.[0] || 'abdulwahabmangal777@gmail.com'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTriggerTestAlert(gf.id)}
                        disabled={testingGeofenceId === gf.id}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Simulate vehicle breach and dispatch test email"
                      >
                        <Send className="w-3 h-3" />
                        <span>{testingGeofenceId === gf.id ? 'Sending...' : 'Test Alert'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ALERTS' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Telemetry Ingress / Egress Alerts</span>
                  <span className="text-[10px] text-slate-400">{geofenceAlerts.length} Events</span>
                </div>

                {geofenceAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No geofence breach events recorded yet.
                  </div>
                ) : (
                  geofenceAlerts.map(al => (
                    <div
                      key={al.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          al.eventType === 'ENTER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          al.eventType === 'EXIT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {al.eventType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white flex items-center justify-between">
                        <span>{al.plateNumber} ({al.internalVehicleId})</span>
                        <span className="text-[10px] font-mono text-emerald-400">{al.speedKmh} km/h</span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {al.geofenceName}
                      </div>

                      {/* Notification Dispatched Pill & Viewer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Dispatched ({al.emailStatus || 'SENT'})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedAlertForEmailView(al)}
                          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Email</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'HUBS' && (
              <>
                {filteredLocations.map(l => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{l.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {l.type}
                      </span>
                    </div>
                    {l.nameAr && <div className="text-[11px] text-slate-400 mt-0.5" dir="rtl">{l.nameAr}</div>}
                    <div className="text-[11px] text-slate-500 mt-1">{l.address}</div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'TRIPS' && (
              <>
                {trips.map(t => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800/40 transition-all space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-xs">{t.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">
                      {t.originName} &rarr; {t.destinationName}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Distance: {t.distanceKm} km</span>
                      <span>{t.tripType}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Primary Interactive Google Map & Visual Boundary Drawing Controller */}
        <div className="lg:col-span-8 space-y-3">
          {/* Floating Boundary Drawing Bar */}
          {isDrawingBoundary && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 shadow-2xl space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Visual Boundary Drawing Active</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                        {drawingMode === 'POLYGON'
                          ? `${drawingPoints.length} Vertices Placed`
                          : drawingPoints.length === 0
                          ? 'Click center point'
                          : `Radius: ${drawingRadiusMeters}m`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {drawingMode === 'POLYGON'
                        ? drawingPoints.length < 3
                          ? 'Click anywhere on the map to drop boundary pins (minimum 3 required).'
                          : 'Polygon closed. You can add more vertices or click "Complete & Save".'
                        : drawingPoints.length === 0
                        ? 'Click on the map to place the center of the circular zone.'
                        : 'Adjust the radius slider below or click a second point on the map.'}
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawingMode('POLYGON');
                      setDrawingPoints([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      drawingMode === 'POLYGON'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Polygon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawingMode('CIRCLE');
                      setDrawingPoints([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      drawingMode === 'CIRCLE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Circle
                  </button>
                </div>
              </div>

              {/* Action Controls & Finish */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Color:</span>
                    {['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDrawingColor(c)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          drawingColor === c ? 'scale-125 border-white ring-2 ring-white/50' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {drawingMode === 'CIRCLE' && drawingPoints.length >= 1 && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 ml-2">
                      <span>Radius:</span>
                      <input
                        type="range"
                        min="500"
                        max="15000"
                        step="250"
                        value={drawingRadiusMeters}
                        onChange={e => setDrawingRadiusMeters(parseInt(e.target.value))}
                        className="w-24 accent-emerald-500"
                      />
                      <span className="font-mono text-xs text-amber-400">{drawingRadiusMeters}m</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {drawingMode === 'POLYGON' && drawingPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={undoLastPoint}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDrawingPoints([])}
                    disabled={drawingPoints.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishDrawing}
                    disabled={drawingMode === 'POLYGON' ? drawingPoints.length < 3 : drawingPoints.length === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete & Configure Zone</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelDrawing}
                    className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <FleetGoogleMap
            vehicles={vehicles}
            locations={locations}
            trips={trips}
            geofences={geofences}
            showGeofences={showGeofences}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={id => setSelectedVehicleId(id)}
            onOpenVehicleModal={id => onOpenVehicle(id)}
            height="620px"
            showControls={true}
            activeFilter={activeFilter}
            onFilterChange={f => setActiveFilter(f)}
            isDrawingBoundary={isDrawingBoundary}
            drawingMode={drawingMode}
            drawingPoints={drawingPoints}
            drawingRadiusMeters={drawingRadiusMeters}
            drawingColor={drawingColor}
            onMapClick={handleMapClickDuringDrawing}
          />
        </div>
      </div>

      {/* Add Geofence Modal */}
      {isAddGeofenceOpen && (
        <AddGeofenceModal
          isOpen={isAddGeofenceOpen}
          onClose={() => {
            setIsAddGeofenceOpen(false);
            setDrawnShapeToConfigure(null);
          }}
          initialShape={drawnShapeToConfigure}
          onCreated={newGf => {
            setGeofences(prev => [newGf, ...prev]);
            setActiveTab('GEOFENCES');
          }}
        />
      )}

      {/* Dispatched Email Preview Modal */}
      {selectedAlertForEmailView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Dispatched Bilingual Email Alert</h3>
                  <p className="text-[11px] text-slate-400">
                    Recipient: {selectedAlertForEmailView.notificationEmails?.join(', ') || 'abdulwahabmangal777@gmail.com'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertForEmailView(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="bg-white text-slate-900 rounded-xl p-4 space-y-3 font-sans text-xs shadow-md">
                <div className="flex justify-between items-center border-b pb-2 text-[11px] text-slate-600">
                  <span className="font-bold text-emerald-800">KHYBER LOGISTICS SERVICES</span>
                  <span dir="rtl" className="font-bold text-emerald-800">شركة خيبر للخدمات اللوجستية</span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="font-bold text-amber-900">
                    🚨 {selectedAlertForEmailView.eventType} ALERT: {selectedAlertForEmailView.geofenceName}
                  </span>
                  <span className="text-[10px] font-mono text-amber-800">
                    {new Date(selectedAlertForEmailView.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <div><strong>Vehicle:</strong> {selectedAlertForEmailView.plateNumber} ({selectedAlertForEmailView.internalVehicleId})</div>
                  <div><strong>Speed Recorded:</strong> {selectedAlertForEmailView.speedKmh} km/h</div>
                  <div><strong>Geofence Zone:</strong> {selectedAlertForEmailView.geofenceName}</div>
                  <div><strong>Event Type:</strong> {selectedAlertForEmailView.eventType}</div>
                </div>

                <div className="text-[11px] text-slate-600 border-t pt-2" dir="rtl">
                  تم تسجيل خرق سياج جغرافي ({selectedAlertForEmailView.eventType}) للمركبة {selectedAlertForEmailView.plateNumber} بسرعة {selectedAlertForEmailView.speedKmh} كم/س في منطقة {selectedAlertForEmailView.geofenceName}.
                </div>

                <div className="text-[10px] text-slate-400 text-center pt-2 border-t">
                  Automated GPS Dispatch &bull; Khyber Telematics System &bull; Riyadh, Kingdom of Saudi Arabia
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAlertForEmailView(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
