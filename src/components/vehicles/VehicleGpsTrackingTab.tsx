import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  MapPin,
  Compass,
  Gauge,
  Fuel,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Radio,
  CheckCircle2,
  RefreshCw,
  Send,
  Sliders,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import { Vehicle, Geofence, GeofenceAlert } from '../../types';
import { FleetGoogleMap } from '../maps/FleetGoogleMap';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAuthHeaders } from '../../utils/api';

interface VehicleGpsTrackingTabProps {
  vehicle: Vehicle;
  onRefreshVehicle?: () => void;
}

interface PlaybackPoint {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: 'ON' | 'OFF';
  fuel: number;
  odometer: number;
  locationName?: string;
  timestamp: string;
}

export const VehicleGpsTrackingTab: React.FC<VehicleGpsTrackingTabProps> = ({
  vehicle,
  onRefreshVehicle
}) => {
  const { t, formatCurrency, formatDate, dir } = useLanguage();
  const { token } = useAuth();

  const [playbackPoints, setPlaybackPoints] = useState<PlaybackPoint[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [analytics, setAnalytics] = useState<{
    distanceKm: number;
    topSpeedKmh: number;
    avgSpeedKmh: number;
    stopsCount: number;
    movingPointsRatio: number;
  }>({
    distanceKm: 0,
    topSpeedKmh: 0,
    avgSpeedKmh: 0,
    stopsCount: 0,
    movingPointsRatio: 0
  });

  // Simulator / Ingestion testing state
  const [isSimulatingPing, setIsSimulatingPing] = useState(false);
  const [pingSuccessMessage, setPingSuccessMessage] = useState<string | null>(null);

  // Playback timer ref
  const timerRef = useRef<any>(null);

  // Fetch Route History and Geofences
  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders(token);

      const [historyRes, gfRes, alertsRes] = await Promise.all([
        fetch(`/api/gps/history/${vehicle.id}?limit=150`, { headers }),
        fetch('/api/geofences', { headers }),
        fetch(`/api/geofences/alerts?vehicleId=${vehicle.id}`, { headers })
      ]);

      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (histData.points && histData.points.length > 0) {
          setPlaybackPoints(histData.points);
          setPlaybackIndex(histData.points.length - 1); // Default to current/latest
          setAnalytics({
            distanceKm: histData.distanceKm || 0,
            topSpeedKmh: histData.topSpeedKmh || 0,
            avgSpeedKmh: histData.avgSpeedKmh || 0,
            stopsCount: histData.stopsCount || 0,
            movingPointsRatio: histData.movingPointsRatio || 0
          });
        }
      }

      if (gfRes.ok) {
        const gfData = await gfRes.json();
        setGeofences(gfData.geofences || []);
      }

      if (alertsRes.ok) {
        const alertData = await alertsRes.json();
        setAlerts(alertData.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load GPS tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [vehicle.id]);

  // Handle playback animation
  useEffect(() => {
    if (isPlaying && playbackPoints.length > 0) {
      const intervalMs = Math.max(100, Math.floor(1000 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= playbackPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, playbackPoints.length]);

  const handlePlayPause = () => {
    if (playbackIndex >= playbackPoints.length - 1) {
      setPlaybackIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  };

  const handleSeekLatest = () => {
    setIsPlaying(false);
    if (playbackPoints.length > 0) {
      setPlaybackIndex(playbackPoints.length - 1);
    }
  };

  // Trigger simulated GPS telemetry ping from virtual tracker device
  const handleTriggerSimulatedPing = async () => {
    try {
      setIsSimulatingPing(true);
      setPingSuccessMessage(null);

      // Generate a realistic slight delta from current position
      const currentLat = vehicle.latitude || 24.7136;
      const currentLng = vehicle.longitude || 46.6753;
      const testSpeed = Math.round(55 + Math.random() * 35);
      const testHeading = Math.round(Math.random() * 360);
      const delta = 0.003; // ~300m shift

      const payload = {
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        internalVehicleId: vehicle.internalVehicleId,
        latitude: parseFloat((currentLat + (Math.random() - 0.5) * delta).toFixed(6)),
        longitude: parseFloat((currentLng + (Math.random() - 0.5) * delta).toFixed(6)),
        speedKmh: testSpeed,
        heading: testHeading,
        altitude: 620,
        ignitionStatus: 'ON',
        fuelLevelPercent: Math.max(20, (vehicle.fuelLevelPercent || 85) - 1),
        odometerKm: (vehicle.currentMileage || 45000) + 1,
        locationName: 'Saudi Telematics Live Ping',
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/gps/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(token)
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setPingSuccessMessage(
          `Telemetry logged successfully! Coordinates: ${data.updatedVehicle.latitude}, ${data.updatedVehicle.longitude} at ${data.updatedVehicle.speedKmh} km/h.`
        );
        // Refresh local data
        await fetchTrackingData();
        onRefreshVehicle?.();
      }
    } catch (err) {
      console.error('Failed to trigger GPS ping:', err);
    } finally {
      setIsSimulatingPing(false);
    }
  };

  // Acknowledge a geofence alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/geofences/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        setAlerts(prev =>
          prev.map(a => (a.id === alertId ? { ...a, isAcknowledged: true, acknowledgedBy: 'User' } : a))
        );
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Current active point during playback
  const currentPoint: PlaybackPoint | undefined =
    playbackPoints.length > 0 ? playbackPoints[playbackIndex] : undefined;

  // Active point object for map overlay
  const activePlaybackMarker = currentPoint
    ? {
        lat: currentPoint.lat,
        lng: currentPoint.lng,
        heading: currentPoint.heading,
        speed: currentPoint.speed,
        timestamp: currentPoint.timestamp
      }
    : null;

  // Polyline coordinates for trail
  const trailCoordinates = playbackPoints.map(p => ({
    lat: p.lat,
    lng: p.lng,
    speed: p.speed,
    timestamp: p.timestamp
  }));

  // Heading to compass cardinal direction
  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <div className="space-y-6">
      {/* 1. REAL-TIME TELEMETRY STATUS BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg">
              <Radio className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  GPS Telematics Radar & Route Playback
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ONLINE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Vehicle internal ID: <span className="text-amber-400 font-mono font-bold">{vehicle.internalVehicleId}</span> | Plate: <span className="text-white font-mono">{vehicle.plateNumber}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTriggerSimulatedPing}
              disabled={isSimulatingPing}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
              title="Send synthetic device packet to verify real-time ingestion"
            >
              <Send className="w-3.5 h-3.5" />
              {isSimulatingPing ? 'Ingesting...' : 'Simulate GPS Ping'}
            </button>
            <button
              onClick={fetchTrackingData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {pingSuccessMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{pingSuccessMessage}</span>
          </div>
        )}

        {/* Telemetry live gauges grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Speed */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Current Speed</span>
              <Gauge className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">
              {currentPoint ? currentPoint.speed : vehicle.speedKmh || 0}{' '}
              <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {(currentPoint ? currentPoint.speed : vehicle.speedKmh || 0) > 0 ? (
                <span className="text-emerald-400 font-semibold">● Vehicle in motion</span>
              ) : (
                <span className="text-slate-400">○ Stationary / Idling</span>
              )}
            </div>
          </div>

          {/* Heading */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Bearing / Heading</span>
              <Compass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white font-mono flex items-center gap-1.5">
              <span>{currentPoint ? currentPoint.heading : vehicle.heading || 0}°</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans">
                {getCardinalDirection(currentPoint ? currentPoint.heading : vehicle.heading || 0)}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">GPS gyro compass</div>
          </div>

          {/* Ignition */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Ignition Status</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono">
              {(currentPoint ? currentPoint.ignition : 'ON') === 'ON' ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ACC ON
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  KEY OFF
                </span>
              )}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">OBD-II Sensor Link</div>
          </div>

          {/* Fuel Level */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Fuel Level</span>
              <Fuel className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">
              {currentPoint ? currentPoint.fuel : vehicle.fuelLevelPercent || 82}%
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{ width: `${currentPoint ? currentPoint.fuel : vehicle.fuelLevelPercent || 82}%` }}
              ></div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 col-span-2">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>GPS Coordinates</span>
              <MapPin className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {currentPoint
                ? `${currentPoint.lat.toFixed(5)}, ${currentPoint.lng.toFixed(5)}`
                : `${vehicle.latitude || 24.7136}, ${vehicle.longitude || 46.6753}`}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate">
              {currentPoint?.locationName || vehicle.currentLocation || 'Riyadh Central Logistics Corridor'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE ROUTE PLAYBACK MAP & PLAYER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Playback Control Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Historical Breadcrumb Playback
              </h4>
              <p className="text-xs text-slate-500">
                {playbackPoints.length} logged waypoints in history | Active point: {playbackIndex + 1} of {playbackPoints.length}
              </p>
            </div>
          </div>

          {/* Playback action controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Reset to route start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlayPause}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause Playback
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Play Route
                </>
              )}
            </button>

            <button
              onClick={handleSeekLatest}
              className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              title="Jump to latest position"
            >
              Latest Position
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 text-xs font-bold text-slate-700">
              {[1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    playbackSpeed === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber Progress Slider */}
        <div className="px-5 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center gap-4">
          <span className="text-[11px] font-mono text-slate-500 w-16">
            {playbackPoints[0]
              ? new Date(playbackPoints[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(0, playbackPoints.length - 1)}
            value={playbackIndex}
            onChange={e => {
              setIsPlaying(false);
              setPlaybackIndex(parseInt(e.target.value, 10));
            }}
            className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-300 rounded-lg appearance-none"
          />

          <span className="text-[11px] font-mono text-slate-500 w-16 text-right">
            {playbackPoints[playbackPoints.length - 1]
              ? new Date(playbackPoints[playbackPoints.length - 1].timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '--:--'}
          </span>
        </div>

        {/* Current Point Status Ribbon */}
        {currentPoint && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-900 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-semibold">
                {new Date(currentPoint.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>
                Speed: <strong className="font-mono text-slate-900">{currentPoint.speed} km/h</strong>
              </span>
              <span>
                Heading: <strong className="font-mono text-slate-900">{currentPoint.heading}°</strong>
              </span>
              <span>
                Location: <strong className="text-slate-900">{currentPoint.locationName || 'Highway corridor'}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="relative w-full" style={{ height: '480px' }}>
          <FleetGoogleMap
            vehicles={[
              {
                ...vehicle,
                latitude: currentPoint?.lat || vehicle.latitude,
                longitude: currentPoint?.lng || vehicle.longitude,
                speedKmh: currentPoint?.speed || vehicle.speedKmh,
                heading: currentPoint?.heading || vehicle.heading
              }
            ]}
            locations={[]}
            geofences={geofences}
            showGeofences={true}
            playbackPath={trailCoordinates}
            activePlaybackPoint={activePlaybackMarker}
            height="480px"
            showControls={true}
          />
        </div>
      </div>

      {/* 3. ROUTE ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Distance Logged</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.distanceKm} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-rose-500" />
            <span>Top Recorded Speed</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.topSpeedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Avg Moving Speed</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.avgSpeedKmh} <span className="text-xs font-normal text-slate-500">km/h</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Stops Detected</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.stopsCount} <span className="text-xs font-normal text-slate-500">stops</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Active Motion Ratio</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.movingPointsRatio}%
          </div>
        </div>
      </div>

      {/* 4. GEOFENCE CROSSINGS & ALERTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Geofence Zone Activity & Alerts
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {alerts.length} logged alert events
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
            No geofence violations or boundary alert exceptions recorded for this vehicle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Geofence Zone</th>
                  <th className="p-3">Recorded Speed</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map(a => {
                  let badge = 'bg-blue-100 text-blue-700';
                  if (a.eventType === 'EXIT') badge = 'bg-amber-100 text-amber-700';
                  if (a.eventType === 'SPEEDING') badge = 'bg-rose-100 text-rose-700';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                          {a.eventType}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {a.geofenceName}
                      </td>
                      <td className="p-3 font-mono">
                        {a.speedKmh} km/h {a.speedLimitKmh ? `(Limit: ${a.speedLimitKmh})` : ''}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {a.isAcknowledged ? (
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1 text-[11px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!a.isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledgeAlert(a.id)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
