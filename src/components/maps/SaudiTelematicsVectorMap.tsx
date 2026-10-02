import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Navigation,
  Layers,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Anchor,
  Warehouse,
  Fuel,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Crosshair,
  ShieldCheck,
  HelpCircle,
  X,
  Radio,
  ChevronRight,
  Info
} from 'lucide-react';
import { Vehicle, CompanyLocation, TripRecord, Geofence } from '../../types';

interface SaudiTelematicsVectorMapProps {
  vehicles: Vehicle[];
  locations: CompanyLocation[];
  trips?: TripRecord[];
  geofences?: Geofence[];
  showGeofences?: boolean;
  playbackPath?: Array<{ lat: number; lng: number; speed?: number; timestamp?: string }>;
  activePlaybackPoint?: { lat: number; lng: number; heading?: number; speed?: number; timestamp?: string } | null;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicleId: string) => void;
  onOpenVehicleModal?: (vehicleId: string) => void;
  height?: string;
  showControls?: boolean;
  activeFilter?: 'ALL' | 'ACTIVE' | 'TRANSIT' | 'MAINTENANCE' | 'HUBS';
  onFilterChange?: (filter: 'ALL' | 'ACTIVE' | 'TRANSIT' | 'MAINTENANCE' | 'HUBS') => void;
  isGoogleMapsAuthFailed?: boolean;
  hasGoogleMapsKey?: boolean;
  onSwitchToGoogleMaps?: () => void;
  // Visual Geofence Boundary Drawing Tool Props
  isDrawingBoundary?: boolean;
  drawingMode?: 'POLYGON' | 'CIRCLE';
  drawingPoints?: Array<{ lat: number; lng: number }>;
  drawingRadiusMeters?: number;
  drawingColor?: string;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

// Bounding box of Saudi Arabia for accurate Equirectangular / Mercator projection
const KSA_BOUNDS = {
  minLat: 16.0,
  maxLat: 32.5,
  minLng: 34.5,
  maxLng: 55.5
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 700;

export const SaudiTelematicsVectorMap: React.FC<SaudiTelematicsVectorMapProps> = ({
  vehicles,
  locations,
  trips = [],
  geofences = [],
  showGeofences = true,
  playbackPath = [],
  activePlaybackPoint = null,
  selectedVehicleId,
  onSelectVehicle,
  onOpenVehicleModal,
  height = '620px',
  showControls = true,
  activeFilter = 'ALL',
  onFilterChange,
  isGoogleMapsAuthFailed = false,
  hasGoogleMapsKey = false,
  onSwitchToGoogleMaps,
  isDrawingBoundary = false,
  drawingMode = 'POLYGON',
  drawingPoints = [],
  drawingRadiusMeters = 1500,
  drawingColor = '#10B981',
  onMapClick
}) => {
  // Pan and Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Selected Entities
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Live Telematics Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedVehicles, setSimulatedVehicles] = useState<Vehicle[]>(vehicles);

  useEffect(() => {
    setSimulatedVehicles(vehicles);
  }, [vehicles]);

  // Sync selected vehicle prop
  useEffect(() => {
    if (selectedVehicleId) {
      const found = simulatedVehicles.find(v => v.id === selectedVehicleId);
      if (found) {
        setSelectedVehicle(found);
        setSelectedLocation(null);
      }
    }
  }, [selectedVehicleId, simulatedVehicles]);

  // Simulation movement loop along Saudi corridors
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulatedVehicles(prev =>
        prev.map(v => {
          if (v.status !== 'ACTIVE' || !v.latitude || !v.longitude) return v;
          const deltaLat = (Math.random() - 0.48) * 0.004;
          const deltaLng = (Math.random() - 0.48) * 0.004;
          const speedVariation = (Math.random() - 0.5) * 6;
          const currentSpeed = v.speedKmh || 70;
          const newSpeed = Math.max(35, Math.min(115, Math.round(currentSpeed + speedVariation)));
          return {
            ...v,
            latitude: v.latitude + deltaLat,
            longitude: v.longitude + deltaLng,
            speedKmh: newSpeed
          };
        })
      );
    }, 2200);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Convert GPS Coordinates (Lat, Lng) to SVG (X, Y)
  const project = (lat: number, lng: number) => {
    const clampedLat = Math.max(KSA_BOUNDS.minLat, Math.min(KSA_BOUNDS.maxLat, lat));
    const clampedLng = Math.max(KSA_BOUNDS.minLng, Math.min(KSA_BOUNDS.maxLng, lng));

    // Mercator-adjusted Equirectangular projection
    const x = ((clampedLng - KSA_BOUNDS.minLng) / (KSA_BOUNDS.maxLng - KSA_BOUNDS.minLng)) * SVG_WIDTH;
    const y = ((KSA_BOUNDS.maxLat - clampedLat) / (KSA_BOUNDS.maxLat - KSA_BOUNDS.minLat)) * SVG_HEIGHT;
    return { x, y };
  };

  // Convert SVG coordinate back to GPS coordinates (Lat, Lng)
  const unproject = (x: number, y: number) => {
    const lng = (x / SVG_WIDTH) * (KSA_BOUNDS.maxLng - KSA_BOUNDS.minLng) + KSA_BOUNDS.minLng;
    const lat = KSA_BOUNDS.maxLat - (y / SVG_HEIGHT) * (KSA_BOUNDS.maxLat - KSA_BOUNDS.minLat);
    return { lat, lng };
  };

  // Pre-calculated major Saudi highway network lines
  const highwayCorridors = useMemo(() => {
    // Highway 40: Jeddah -> Makkah -> Taif -> Riyadh -> Dammam
    const hw40Coords = [
      { lat: 21.4858, lng: 39.1925 }, // Jeddah
      { lat: 21.3891, lng: 39.8579 }, // Makkah
      { lat: 21.4373, lng: 40.5127 }, // Taif
      { lat: 24.7136, lng: 46.6753 }, // Riyadh
      { lat: 25.3833, lng: 49.5833 }, // Al Ahsa
      { lat: 26.4207, lng: 50.0888 }  // Dammam
    ];

    // Highway 15: Makkah -> Madinah -> Tabuk
    const hw15Coords = [
      { lat: 21.3891, lng: 39.8579 }, // Makkah
      { lat: 24.5247, lng: 39.5692 }, // Madinah
      { lat: 26.5000, lng: 38.0000 }, // Al Ula
      { lat: 28.3835, lng: 36.5662 }  // Tabuk
    ];

    // Highway 65: Riyadh -> Qassim -> Hail
    const hw65Coords = [
      { lat: 24.7136, lng: 46.6753 }, // Riyadh
      { lat: 26.3260, lng: 43.9750 }, // Buraidah
      { lat: 27.5219, lng: 41.6907 }  // Hail
    ];

    // Highway 10: Riyadh -> Haradh -> Southern / Abha
    const hw10Coords = [
      { lat: 24.7136, lng: 46.6753 }, // Riyadh
      { lat: 24.1353, lng: 49.0641 }, // Haradh
      { lat: 18.2164, lng: 42.5053 }  // Abha
    ];

    const toPath = (coords: { lat: number; lng: number }[]) =>
      coords.map((c, i) => {
        const { x, y } = project(c.lat, c.lng);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');

    return [
      { id: 'hw-40', name: 'Highway 40 (Trans-Kingdom)', path: toPath(hw40Coords) },
      { id: 'hw-15', name: 'Highway 15 (Western Corridor)', path: toPath(hw15Coords) },
      { id: 'hw-65', name: 'Highway 65 (Northern Link)', path: toPath(hw65Coords) },
      { id: 'hw-10', name: 'Highway 10 (Southern Link)', path: toPath(hw10Coords) }
    ];
  }, []);

  // Filter vehicles
  const filteredVehicles = simulatedVehicles.filter(v => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return v.status === 'ACTIVE' && (v.speedKmh || 0) < 60;
    if (activeFilter === 'TRANSIT') return (v.speedKmh || 0) >= 60;
    if (activeFilter === 'MAINTENANCE') return v.status === 'MAINTENANCE';
    if (activeFilter === 'HUBS') return false;
    return true;
  });

  // Region Focus Controls
  const handleRegionFocus = (region: 'KSA' | 'RIYADH' | 'JEDDAH' | 'DAMMAM' | 'MADINAH') => {
    switch (region) {
      case 'KSA':
        setZoom(1);
        setPan({ x: 0, y: 0 });
        break;
      case 'RIYADH': {
        const { x, y } = project(24.7136, 46.6753);
        setZoom(2.2);
        setPan({ x: SVG_WIDTH / 2 - x * 2.2, y: SVG_HEIGHT / 2 - y * 2.2 });
        break;
      }
      case 'JEDDAH': {
        const { x, y } = project(21.4858, 39.5);
        setZoom(2.5);
        setPan({ x: SVG_WIDTH / 2 - x * 2.5, y: SVG_HEIGHT / 2 - y * 2.5 });
        break;
      }
      case 'DAMMAM': {
        const { x, y } = project(26.4207, 50.0888);
        setZoom(2.6);
        setPan({ x: SVG_WIDTH / 2 - x * 2.6, y: SVG_HEIGHT / 2 - y * 2.6 });
        break;
      }
      case 'MADINAH': {
        const { x, y } = project(24.5247, 39.5692);
        setZoom(2.5);
        setPan({ x: SVG_WIDTH / 2 - x * 2.5, y: SVG_HEIGHT / 2 - y * 2.5 });
        break;
      }
    }
  };

  // Mouse Drag / Touch Navigation Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const next = direction === 'in' ? prev * 1.3 : prev / 1.3;
      return Math.max(1, Math.min(4.5, next));
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedVehicle(null);
    setSelectedLocation(null);
    setSelectedTrip(null);
  };

  return (
    <div
      id="saudi-telematics-radar-container"
      className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#0B1120] select-none shadow-2xl"
      style={{ height }}
    >
      {/* MAP STATUS / ENGINE BANNER */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-xl text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white tracking-wide">
            Saudi Telematics Vector Radar
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            KSA Highway Grid
          </span>
          {isGoogleMapsAuthFailed && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" /> Key Mode Active
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Simulation Toggle */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xl ${
              isSimulating
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="Simulate live vehicle movement telemetry"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isSimulating ? 'Simulating Movement' : 'Simulate Movement'}</span>
          </button>

          {/* Switch to Real Google Maps Button */}
          {onSwitchToGoogleMaps && (
            <button
              onClick={onSwitchToGoogleMaps}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xl cursor-pointer"
              title="Switch to Real Google Maps (Street, Satellite & Terrain)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Real Google Maps</span>
            </button>
          )}

          {/* Setup Guide Button */}
          <button
            onClick={() => setShowSetupModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xl"
            title="Google Maps Platform Setup"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Google Maps Config</span>
          </button>
        </div>
      </div>

      {/* FILTER PILLS (When controls enabled) */}
      {showControls && (
        <div className="absolute top-14 left-3 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
          {(['ALL', 'TRANSIT', 'ACTIVE', 'MAINTENANCE', 'HUBS'] as const).map(f => (
            <button
              key={f}
              onClick={() => onFilterChange?.(f)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === f
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' && `All (${simulatedVehicles.length})`}
              {f === 'TRANSIT' && `In Transit (${simulatedVehicles.filter(v => (v.speedKmh || 0) >= 60).length})`}
              {f === 'ACTIVE' && `Local / Active`}
              {f === 'MAINTENANCE' && `Workshop (${simulatedVehicles.filter(v => v.status === 'MAINTENANCE').length})`}
              {f === 'HUBS' && `Hubs (${locations.length})`}
            </button>
          ))}
        </div>
      )}

      {/* ZOOM AND RESET FLOATING CONTROLS */}
      <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-1.5 pointer-events-auto bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-xl">
        <button
          onClick={() => handleZoom('in')}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* REGION FOCUS SHORTCUTS */}
      <div className="absolute left-3 bottom-3 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl flex items-center gap-1.5 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
          <Compass className="w-3 h-3 text-amber-400" /> Focus:
        </span>
        <button
          onClick={() => handleRegionFocus('KSA')}
          className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
        >
          All KSA
        </button>
        <button
          onClick={() => handleRegionFocus('RIYADH')}
          className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
        >
          Riyadh
        </button>
        <button
          onClick={() => handleRegionFocus('JEDDAH')}
          className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
        >
          Jeddah & Makkah
        </button>
        <button
          onClick={() => handleRegionFocus('DAMMAM')}
          className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
        >
          Eastern (Dammam)
        </button>
        <button
          onClick={() => handleRegionFocus('MADINAH')}
          className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
        >
          Madinah
        </button>
      </div>

      {/* SVG INTERACTIVE STAGE */}
      <div
        className={`w-full h-full ${isDrawingBoundary ? 'cursor-crosshair ring-2 ring-emerald-500/50' : isDragging ? 'cursor-grabbing' : 'cursor-grab'} overflow-hidden relative`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (isDrawingBoundary && onMapClick && svgRef.current) {
            const pt = svgRef.current.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = svgRef.current.getScreenCTM();
            if (ctm) {
              const svgP = pt.matrixTransform(ctm.inverse());
              const contentX = (svgP.x - pan.x) / zoom;
              const contentY = (svgP.y - pan.y) / zoom;
              const coords = unproject(contentX, contentY);
              onMapClick(coords);
            }
          }
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            {/* Radar Sweep Gradient */}
            <radialGradient id="radar-center" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0B1120" stopOpacity="0.9" />
            </radialGradient>

            {/* Glowing polyline filter */}
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Root Transform Group for Pan and Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Background Map Canvas */}
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#radar-center)" />
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#radar-grid)" />

            {/* Saudi Arabia Stylized Geographical Landmass Polygon */}
            <path
              d="
                M 120 180
                L 240 100
                L 380 90
                L 540 120
                L 680 180
                L 820 220
                L 870 300
                L 840 380
                L 760 490
                L 640 590
                L 490 620
                L 380 600
                L 280 520
                L 210 420
                L 150 310
                Z
              "
              fill="#0F172A"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.8"
            />

            {/* Water Body Labels */}
            <text x="70" y="380" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="3" transform="rotate(-70 70 380)">
              RED SEA (البحر الأحمر)
            </text>
            <text x="830" y="270" fill="#475569" fontSize="13" fontWeight="bold" letterSpacing="3" transform="rotate(45 830 270)">
              ARABIAN GULF (الخليج العربي)
            </text>

            {/* Regional Outlines & Major Highway Network */}
            {highwayCorridors.map(hw => (
              <g key={hw.id}>
                {/* Under-glow */}
                <path
                  d={hw.path}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeOpacity="0.25"
                />
                {/* Main Highway Line */}
                <path
                  d={hw.path}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="1.8"
                  strokeDasharray="6 4"
                />
              </g>
            ))}

            {/* Geofence Boundaries Overlay */}
            {showGeofences &&
              geofences.map(gf => {
                if (!gf.isActive) return null;
                if (gf.type === 'CIRCLE') {
                  const { x, y } = project(gf.center.lat, gf.center.lng);
                  const pixelRadius = Math.max(14, Math.round((gf.radiusMeters / 1000) * 12));
                  return (
                    <g key={`gf-vec-${gf.id}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={pixelRadius}
                        fill={gf.color || '#10B981'}
                        fillOpacity={0.16}
                        stroke={gf.color || '#10B981'}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                      <text
                        x={x}
                        y={y - pixelRadius - 4}
                        textAnchor="middle"
                        fill={gf.color || '#10B981'}
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {gf.name}
                      </text>
                    </g>
                  );
                } else if (gf.type === 'POLYGON' && gf.polygonCoordinates && gf.polygonCoordinates.length >= 3) {
                  const pointsStr = gf.polygonCoordinates
                    .map(coord => {
                      const { x, y } = project(coord.lat, coord.lng);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');
                  const centerPt = project(gf.center.lat, gf.center.lng);
                  return (
                    <g key={`gf-poly-${gf.id}`}>
                      <polygon
                        points={pointsStr}
                        fill={gf.color || '#3B82F6'}
                        fillOpacity={0.16}
                        stroke={gf.color || '#3B82F6'}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                      <text
                        x={centerPt.x}
                        y={centerPt.y - 8}
                        textAnchor="middle"
                        fill={gf.color || '#3B82F6'}
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {gf.name}
                      </text>
                    </g>
                  );
                }
                return null;
              })}

            {/* Visual Boundary Drawing In-Progress Overlay */}
            {isDrawingBoundary && (
              <g key="drawing-boundary-vector-group">
                {/* Polygon mode path */}
                {drawingMode === 'POLYGON' && drawingPoints.length >= 2 && (
                  <path
                    d={
                      drawingPoints
                        .map((pt, i) => {
                          const { x, y } = project(pt.lat, pt.lng);
                          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                        })
                        .join(' ') + (drawingPoints.length >= 3 ? ' Z' : '')
                    }
                    fill={drawingPoints.length >= 3 ? drawingColor : 'none'}
                    fillOpacity={0.25}
                    stroke={drawingColor}
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                )}

                {/* Circle mode preview */}
                {drawingMode === 'CIRCLE' && drawingPoints.length >= 1 && (() => {
                  const center = project(drawingPoints[0].lat, drawingPoints[0].lng);
                  const pixelRadius = Math.max(14, Math.round((drawingRadiusMeters / 1000) * 12));
                  return (
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={pixelRadius}
                      fill={drawingColor}
                      fillOpacity={0.25}
                      stroke={drawingColor}
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                    />
                  );
                })()}

                {/* Placed Vertex Markers with Numbers */}
                {drawingPoints.map((pt, idx) => {
                  const { x, y } = project(pt.lat, pt.lng);
                  return (
                    <g key={`vec-draw-pin-${idx}`}>
                      <circle cx={x} cy={y} r={10} fill={drawingColor} stroke="#ffffff" strokeWidth={2} />
                      <text
                        cx={x}
                        cy={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Historical Breadcrumbs Trail / Route Playback */}
            {playbackPath.length > 1 && (
              <g key="playback-trail-group">
                <polyline
                  points={playbackPath
                    .map(p => {
                      const { x, y } = project(p.lat, p.lng);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.85"
                />
                {playbackPath.map((p, idx) => {
                  const { x, y } = project(p.lat, p.lng);
                  return (
                    <circle
                      key={`trail-dot-${idx}`}
                      cx={x}
                      cy={y}
                      r="2.5"
                      fill="#F59E0B"
                      fillOpacity="0.7"
                    />
                  );
                })}
              </g>
            )}

            {/* Active Route Playback Animated Marker */}
            {activePlaybackPoint && (() => {
              const { x, y } = project(activePlaybackPoint.lat, activePlaybackPoint.lng);
              const heading = activePlaybackPoint.heading || 0;
              return (
                <g key="active-playback-vehicle" transform={`translate(${x}, ${y})`}>
                  <circle r="18" fill="#F59E0B" fillOpacity="0.35" className="animate-ping" />
                  <circle r="12" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2.5" />
                  <g transform={`rotate(${heading})`}>
                    <polygon points="0,-8 5,5 0,2 -5,5" fill="#0F172A" />
                  </g>
                </g>
              );
            })()}

            {/* Active Trips Dispatch Polylines */}
            {trips.map(trip => {
              if (!trip.originCoords || !trip.destinationCoords) return null;
              const p1 = project(trip.originCoords.lat, trip.originCoords.lng);
              const p2 = project(trip.destinationCoords.lat, trip.destinationCoords.lng);
              const isSelected = selectedTrip?.id === trip.id;
              const isInProgress = trip.status === 'IN_PROGRESS';

              // Midpoint curve calculation
              const midX = (p1.x + p2.x) / 2 + (p2.y - p1.y) * 0.1;
              const midY = (p1.y + p2.y) / 2 - (p2.x - p1.x) * 0.1;
              const curvePath = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

              return (
                <g key={`trip-vec-${trip.id}`} className="cursor-pointer" onClick={() => setSelectedTrip(trip)}>
                  <path
                    d={curvePath}
                    fill="none"
                    stroke={isSelected ? '#F59E0B' : isInProgress ? '#38BDF8' : '#64748B'}
                    strokeWidth={isSelected ? 4 : isInProgress ? 2.5 : 1.5}
                    strokeDasharray={isInProgress ? '8 6' : 'none'}
                    strokeOpacity={isSelected ? 1 : isInProgress ? 0.9 : 0.4}
                    filter={isSelected ? 'url(#glow-gold)' : undefined}
                  />
                </g>
              );
            })}

            {/* Logistics Hubs Pins */}
            {(activeFilter === 'ALL' || activeFilter === 'HUBS') &&
              locations.map(loc => {
                const { x, y } = project(loc.latitude, loc.longitude);
                const isSelected = selectedLocation?.id === loc.id;

                return (
                  <g
                    key={`loc-vec-${loc.id}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-transform duration-200 hover:scale-125"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setSelectedVehicle(null);
                    }}
                  >
                    {/* Outer Ring */}
                    <circle
                      r={isSelected ? 16 : 10}
                      fill={loc.type === 'PORT' ? '#0284C7' : loc.type === 'HEAD_OFFICE' ? '#2563EB' : '#D97706'}
                      fillOpacity={isSelected ? 0.3 : 0.2}
                      stroke={loc.type === 'PORT' ? '#38BDF8' : loc.type === 'HEAD_OFFICE' ? '#60A5FA' : '#F59E0B'}
                      strokeWidth={isSelected ? 2 : 1}
                    />

                    {/* Center Dot */}
                    <circle
                      r={isSelected ? 6 : 4}
                      fill={loc.type === 'PORT' ? '#38BDF8' : loc.type === 'HEAD_OFFICE' ? '#60A5FA' : '#F59E0B'}
                    />

                    {/* Hub Label */}
                    <text
                      x="0"
                      y={-14}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none drop-shadow"
                    >
                      {(loc.name ? String(loc.name).split(' ')[0] : '')}
                    </text>
                  </g>
                );
              })}

            {/* Fleet Vehicles Dynamic Markers */}
            {filteredVehicles.map(v => {
              if (!v.latitude || !v.longitude) return null;
              const { x, y } = project(v.latitude, v.longitude);
              const isSelected = selectedVehicle?.id === v.id;
              const isMoving = (v.speedKmh || 0) >= 60;
              const isWorkshop = v.status === 'MAINTENANCE';

              const pinColor = isWorkshop ? '#EF4444' : isMoving ? '#10B981' : '#F59E0B';

              return (
                <g
                  key={`veh-vec-${v.id}`}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform duration-200 hover:scale-125"
                  onClick={() => {
                    setSelectedVehicle(v);
                    setSelectedLocation(null);
                    onSelectVehicle?.(v.id);
                  }}
                >
                  {/* Ping effect for moving vehicles */}
                  {isMoving && (
                    <circle
                      r="16"
                      fill="#10B981"
                      fillOpacity="0.25"
                      className="animate-ping origin-center"
                    />
                  )}

                  {/* Marker Base Pin */}
                  <circle
                    r={isSelected ? 14 : 9}
                    fill="#0F172A"
                    stroke={pinColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* Center Dot */}
                  <circle r={isSelected ? 5 : 3.5} fill={pinColor} />

                  {/* Speed Tag for Fast Transit */}
                  {isMoving && (
                    <g transform="translate(12, -8)">
                      <rect x="0" y="0" width="38" height="14" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="0.8" />
                      <text x="19" y="10" fill="#6EE7B7" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        {v.speedKmh} km/h
                      </text>
                    </g>
                  )}

                  {/* Vehicle Plate Short Identifier */}
                  <text
                    x="0"
                    y={isSelected ? 22 : 18}
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="pointer-events-none drop-shadow"
                  >
                    {v.internalVehicleId}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* SELECTED VEHICLE TELEMETRY CARD */}
      {selectedVehicle && (
        <div className="absolute bottom-16 right-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">
                  {selectedVehicle.internalVehicleId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    (selectedVehicle.speedKmh || 0) >= 60
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : selectedVehicle.status === 'MAINTENANCE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {(selectedVehicle.speedKmh || 0) >= 60 ? 'In Transit' : selectedVehicle.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
              </p>
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Saudi License Plate Display */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Saudi Plate:</span>
            <span className="font-mono font-bold text-white tracking-wider">
              {selectedVehicle.plateNumber}
            </span>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">SPEED</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {selectedVehicle.speedKmh || 0} km/h
              </span>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">ODOMETER</span>
              <span className="font-mono font-bold text-slate-200 text-sm">
                {(selectedVehicle.odometerKm || 0).toLocaleString()} km
              </span>
            </div>
          </div>

          {/* Location & Driver */}
          <div className="text-xs space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{selectedVehicle.currentLocation || 'Riyadh Logistics Corridor'}</span>
            </div>
            {selectedVehicle.driver && (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Driver: {selectedVehicle.driver.fullName}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {onOpenVehicleModal && (
            <button
              onClick={() => onOpenVehicleModal(selectedVehicle.id)}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <span>View Vehicle 360° Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* SELECTED LOGISTICS HUB CARD */}
      {selectedLocation && (
        <div className="absolute bottom-16 right-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {selectedLocation.type.replace('_', ' ')}
              </span>
              <h4 className="font-bold text-white text-sm mt-0.5">{selectedLocation.name}</h4>
              {selectedLocation.nameAr && (
                <p className="text-xs text-slate-400 font-arabic">{selectedLocation.nameAr}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300">{selectedLocation.address}</p>

          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400">GPS Coordinates:</span>
            <span className="font-mono text-slate-300 text-[11px]">
              {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
            </span>
          </div>
        </div>
      )}

      {/* GOOGLE MAPS PLATFORM CONFIG MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Maps Platform Setup</h3>
                  <p className="text-xs text-slate-400">
                    How to enable Google Satellite & Street Maps in this application
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                The system is equipped with high-performance dual mapping engines:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                <li>
                  <strong className="text-slate-200">Saudi Telematics Vector Radar (Active):</strong> Zero-cost, resilient vector canvas visualizing vehicle movements, logistics hubs, and highway routes.
                </li>
                <li>
                  <strong className="text-slate-200">Google Maps Platform (Ready):</strong> High-resolution satellite tiles, Google Routes API highway corridors, and street photography.
                </li>
              </ul>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                <div className="text-slate-400">Target Environment Variable:</div>
                <div className="text-emerald-400 font-bold">VITE_GOOGLE_MAPS_API_KEY</div>
                <div className="text-slate-500 text-[10px]">
                  (Must start with &quot;AIza...&quot; and be at least 35 characters)
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="font-semibold text-white">Zero-Cost Prototyping:</div>
                <p className="text-slate-400">
                  You can mint a free <strong className="text-amber-400">Google Maps Demo Key</strong> without setting up a Google Cloud billing card:
                </p>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
                >
                  <span>Generate Free Maps Demo Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
