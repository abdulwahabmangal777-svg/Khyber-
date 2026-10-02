import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
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
  Info,
  Maximize2,
  RotateCcw,
  Zap,
  ExternalLink,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { Vehicle, CompanyLocation, TripRecord, Geofence } from '../../types';
import { Polyline } from './Polyline';
import { Circle } from './Circle';
import { Polygon } from './Polygon';
import { isValidGoogleMapsApiKey, getGoogleMapsApiKey, loadGoogleMapsApiKey } from '../../services/googleMapsConfig';
import { SaudiTelematicsVectorMap } from './SaudiTelematicsVectorMap';

interface FleetGoogleMapProps {
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
  autoCenterOnSelection?: boolean;
  // Visual Geofence Boundary Drawing Tool Props
  isDrawingBoundary?: boolean;
  drawingMode?: 'POLYGON' | 'CIRCLE';
  drawingPoints?: Array<{ lat: number; lng: number }>;
  drawingRadiusMeters?: number;
  drawingColor?: string;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

// Controller component to smoothly pan/zoom camera
const MapCameraController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
  zoom?: number;
}> = ({ targetCoords, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetCoords) return;
    map.panTo(targetCoords);
    if (zoom) {
      map.setZoom(zoom);
    }
  }, [map, targetCoords, zoom]);

  return null;
};

// Watches Google Maps SDK loading status for auth failures
const MapsAuthWatcher: React.FC<{ onAuthFailure: () => void }> = ({ onAuthFailure }) => {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      console.warn(`[Google Maps Platform] Status: ${status}. Falling back to Saudi Telematics Vector Radar.`);
      onAuthFailure();
    }
  }, [status, onAuthFailure]);

  return null;
};

export const FleetGoogleMap: React.FC<FleetGoogleMapProps> = ({
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
  autoCenterOnSelection = true,
  isDrawingBoundary = false,
  drawingMode = 'POLYGON',
  drawingPoints = [],
  drawingRadiusMeters = 1500,
  drawingColor = '#10B981',
  onMapClick
}) => {
  const [apiKey, setApiKey] = useState<string>(getGoogleMapsApiKey());
  const [authFailed, setAuthFailed] = useState(false);
  const [useVectorRadar, setUseVectorRadar] = useState(() => !isValidGoogleMapsApiKey(getGoogleMapsApiKey()));

  // On mount, if key is not yet loaded, asynchronously load from /api/config/maps
  useEffect(() => {
    let isMounted = true;
    if (!isValidGoogleMapsApiKey(apiKey)) {
      loadGoogleMapsApiKey().then(loadedKey => {
        if (isMounted && isValidGoogleMapsApiKey(loadedKey)) {
          setApiKey(loadedKey);
          setUseVectorRadar(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  const isKeyValidFormat = isValidGoogleMapsApiKey(apiKey);

  // Catch window.gm_authFailure (triggered when Google Maps JavaScript API evaluates an invalid key)
  useEffect(() => {
    const originalGmAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('[Google Maps Platform] gm_authFailure fired. Switching to Saudi Telematics Vector Radar.');
      setAuthFailed(true);
      if (typeof originalGmAuthFailure === 'function') {
        try {
          originalGmAuthFailure();
        } catch {
          // ignore
        }
      }
    };
    return () => {
      (window as any).gm_authFailure = originalGmAuthFailure;
    };
  }, []);

  // Internal State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [targetFocus, setTargetFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [targetZoom, setTargetZoom] = useState<number | undefined>(undefined);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedVehicles, setSimulatedVehicles] = useState<Vehicle[]>(vehicles);

  // Sync simulated vehicles when prop changes
  useEffect(() => {
    setSimulatedVehicles(vehicles);
  }, [vehicles]);

  // Sync selectedVehicle when prop changes
  useEffect(() => {
    if (selectedVehicleId) {
      const found = simulatedVehicles.find(v => v.id === selectedVehicleId);
      if (found && found.latitude && found.longitude) {
        setSelectedVehicle(found);
        setSelectedLocation(null);
        if (autoCenterOnSelection) {
          setTargetFocus({ lat: found.latitude, lng: found.longitude });
          setTargetZoom(14);
        }
      }
    }
  }, [selectedVehicleId, simulatedVehicles, autoCenterOnSelection]);

  // Live telematics simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulatedVehicles(prev =>
        prev.map(v => {
          // Only animate active vehicles that have coordinates and speed
          if (v.status !== 'ACTIVE' || !v.latitude || !v.longitude) return v;
          const deltaLat = (Math.random() - 0.48) * 0.003;
          const deltaLng = (Math.random() - 0.48) * 0.003;
          const newSpeed = Math.max(30, Math.min(110, (v.speedKmh || 65) + Math.floor((Math.random() - 0.5) * 6)));
          return {
            ...v,
            latitude: v.latitude + deltaLat,
            longitude: v.longitude + deltaLng,
            speedKmh: newSpeed
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Filtering vehicles based on current filter state
  const filteredVehicles = simulatedVehicles.filter(v => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return v.status === 'ACTIVE' && (v.speedKmh || 0) < 60;
    if (activeFilter === 'TRANSIT') return v.status === 'ACTIVE' && (v.speedKmh || 0) >= 60;
    if (activeFilter === 'MAINTENANCE') return v.status === 'MAINTENANCE';
    if (activeFilter === 'HUBS') return false;
    return true;
  });

  const shouldShowLocations = activeFilter === 'ALL' || activeFilter === 'HUBS';

  // Region Focus Preset Handler
  const handleRegionFocus = (region: 'KSA' | 'RIYADH' | 'JEDDAH' | 'DAMMAM' | 'MADINAH') => {
    switch (region) {
      case 'KSA':
        setTargetFocus({ lat: 24.0, lng: 45.0 });
        setTargetZoom(6);
        break;
      case 'RIYADH':
        setTargetFocus({ lat: 24.7136, lng: 46.6753 });
        setTargetZoom(11);
        break;
      case 'JEDDAH':
        setTargetFocus({ lat: 21.4858, lng: 39.1764 });
        setTargetZoom(11);
        break;
      case 'DAMMAM':
        setTargetFocus({ lat: 26.4207, lng: 50.0888 });
        setTargetZoom(11);
        break;
      case 'MADINAH':
        setTargetFocus({ lat: 24.4672, lng: 39.6111 });
        setTargetZoom(11);
        break;
    }
  };

  // Helper for location pin color & icon
  const getLocationPinConfig = (type: CompanyLocation['type']) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return { bg: '#3B82F6', glyph: '#FFFFFF', border: '#1D4ED8' };
      case 'PORT':
        return { bg: '#0EA5E9', glyph: '#FFFFFF', border: '#0284C7' };
      case 'DEPOT':
      case 'WAREHOUSE':
        return { bg: '#F59E0B', glyph: '#FFFFFF', border: '#D97706' };
      case 'FUEL_STATION':
        return { bg: '#10B981', glyph: '#FFFFFF', border: '#059669' };
      default:
        return { bg: '#6366F1', glyph: '#FFFFFF', border: '#4338CA' };
    }
  };

  // Fallback to Interactive Saudi Telematics Vector Map if key format is invalid, missing, or auth failed
  if (!isKeyValidFormat || authFailed || useVectorRadar) {
    return (
      <SaudiTelematicsVectorMap
        vehicles={simulatedVehicles}
        locations={locations}
        trips={trips}
        geofences={geofences}
        showGeofences={showGeofences}
        playbackPath={playbackPath}
        activePlaybackPoint={activePlaybackPoint}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={onSelectVehicle}
        onOpenVehicleModal={onOpenVehicleModal}
        height={height}
        showControls={showControls}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        isGoogleMapsAuthFailed={authFailed}
        hasGoogleMapsKey={isKeyValidFormat}
        onSwitchToGoogleMaps={isKeyValidFormat && !authFailed ? () => setUseVectorRadar(false) : undefined}
        isDrawingBoundary={isDrawingBoundary}
        drawingMode={drawingMode}
        drawingPoints={drawingPoints}
        drawingRadiusMeters={drawingRadiusMeters}
        drawingColor={drawingColor}
        onMapClick={onMapClick}
      />
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 ${isDrawingBoundary ? 'cursor-crosshair ring-2 ring-emerald-500/50' : ''}`} style={{ height }}>
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'geometry']}
      >
        <MapsAuthWatcher onAuthFailure={() => setAuthFailed(true)} />
        <Map
          id="fleet-telematics-map"
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={{ lat: 24.7136, lng: 46.6753 }}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeId={mapType}
          className="w-full h-full"
          onClick={(e) => {
            if (isDrawingBoundary && e.detail.latLng && onMapClick) {
              onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
            }
          }}
        >
          {/* Camera Controller to animate focus */}
          <MapCameraController targetCoords={targetFocus} zoom={targetZoom} />

          {/* 1. RENDER ACTIVE TRIP POLYLINES */}
          {trips.map(trip => {
            if (!trip.originCoords || !trip.destinationCoords) return null;
            const isTripSelected = selectedTrip?.id === trip.id;
            const isInProgress = trip.status === 'IN_PROGRESS';

            // Create mid-point waypoint if currently moving
            const path = trip.currentCoords
              ? [trip.originCoords, trip.currentCoords, trip.destinationCoords]
              : [trip.originCoords, trip.destinationCoords];

            return (
              <Polyline
                key={`trip-line-${trip.id}`}
                path={path}
                strokeColor={isTripSelected ? '#F59E0B' : isInProgress ? '#3B82F6' : '#64748B'}
                strokeWeight={isTripSelected ? 5 : isInProgress ? 4 : 2}
                strokeOpacity={isTripSelected ? 1 : isInProgress ? 0.85 : 0.4}
                zIndex={isTripSelected ? 10 : isInProgress ? 5 : 1}
                onClick={() => {
                  setSelectedTrip(trip);
                  setSelectedVehicle(null);
                  setSelectedLocation(null);
                }}
              />
            );
          })}

          {/* 1.5 GEOFENCE BOUNDARIES OVERLAYS */}
          {showGeofences &&
            geofences.map(gf => {
              if (!gf.isActive) return null;
              if (gf.type === 'CIRCLE') {
                return (
                  <React.Fragment key={`gf-circle-wrap-${gf.id}`}>
                    <Circle
                      key={`gf-circle-${gf.id}`}
                      center={gf.center}
                      radius={gf.radiusMeters}
                      fillColor={gf.color || '#10B981'}
                      fillOpacity={0.18}
                      strokeColor={gf.color || '#10B981'}
                      strokeWeight={2}
                      strokeOpacity={0.8}
                    />
                    <AdvancedMarker position={gf.center} title={gf.name}>
                      <div className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold border border-emerald-400 shadow-sm pointer-events-none whitespace-nowrap">
                        {gf.name}
                      </div>
                    </AdvancedMarker>
                  </React.Fragment>
                );
              } else if (gf.type === 'POLYGON' && gf.polygonCoordinates && gf.polygonCoordinates.length >= 3) {
                return (
                  <React.Fragment key={`gf-poly-wrap-${gf.id}`}>
                    <Polygon
                      key={`gf-poly-${gf.id}`}
                      paths={gf.polygonCoordinates}
                      fillColor={gf.color || '#3B82F6'}
                      fillOpacity={0.18}
                      strokeColor={gf.color || '#3B82F6'}
                      strokeWeight={2}
                      strokeOpacity={0.8}
                    />
                    <AdvancedMarker position={gf.center} title={gf.name}>
                      <div className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold border border-blue-400 shadow-sm pointer-events-none whitespace-nowrap">
                        {gf.name}
                      </div>
                    </AdvancedMarker>
                  </React.Fragment>
                );
              }
              return null;
            })}

          {/* 1.6 HISTORICAL ROUTE PLAYBACK TRAIL */}
          {playbackPath.length > 1 && (
            <Polyline
              key="playback-trail-line"
              path={playbackPath.map(p => ({ lat: p.lat, lng: p.lng }))}
              strokeColor="#F59E0B"
              strokeWeight={4}
              strokeOpacity={0.9}
              zIndex={50}
            />
          )}

          {/* 1.7 ACTIVE PLAYBACK VEHICLE ANIMATED MARKER */}
          {activePlaybackPoint && (
            <AdvancedMarker
              key="active-playback-marker"
              position={{ lat: activePlaybackPoint.lat, lng: activePlaybackPoint.lng }}
              zIndex={200}
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-amber-400 opacity-75"></span>
                <div
                  className="w-9 h-9 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-black"
                  style={{
                    transform: `rotate(${activePlaybackPoint.heading || 0}deg)`
                  }}
                >
                  <Navigation className="w-5 h-5 fill-slate-950" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* 1.8 ACTIVE VISUAL BOUNDARY DRAWING PREVIEW */}
          {isDrawingBoundary && (
            <>
              {/* Vertex Markers */}
              {drawingPoints.map((pt, idx) => (
                <AdvancedMarker
                  key={`draw-vertex-${idx}`}
                  position={pt}
                  zIndex={350}
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-mono font-bold text-xs text-white transform hover:scale-110 transition-transform"
                    style={{ backgroundColor: drawingColor }}
                  >
                    {idx + 1}
                  </div>
                </AdvancedMarker>
              ))}

              {/* In-progress Polygon Polyline */}
              {drawingMode === 'POLYGON' && drawingPoints.length >= 2 && (
                <Polyline
                  key="drawing-boundary-line"
                  path={drawingPoints.length >= 3 ? [...drawingPoints, drawingPoints[0]] : drawingPoints}
                  strokeColor={drawingColor}
                  strokeWeight={3}
                  strokeOpacity={0.95}
                  zIndex={300}
                />
              )}

              {/* Translucent Polygon Enclosure Preview */}
              {drawingMode === 'POLYGON' && drawingPoints.length >= 3 && (
                <Polygon
                  key="drawing-boundary-polygon"
                  paths={drawingPoints}
                  strokeColor={drawingColor}
                  strokeWeight={2}
                  strokeOpacity={1}
                  fillColor={drawingColor}
                  fillOpacity={0.25}
                  zIndex={280}
                />
              )}

              {/* Radial Circle Center Marker & Perimeter Preview */}
              {drawingMode === 'CIRCLE' && drawingPoints.length >= 1 && (
                <Circle
                  key="drawing-boundary-circle"
                  center={drawingPoints[0]}
                  radius={drawingRadiusMeters}
                  strokeColor={drawingColor}
                  strokeWeight={2}
                  strokeOpacity={1}
                  fillColor={drawingColor}
                  fillOpacity={0.25}
                  zIndex={280}
                />
              )}
            </>
          )}

          {/* 2. RENDER COMPANY LOCATIONS (LOGISTICS HUBS & PORTS) */}
          {shouldShowLocations &&
            locations.map(loc => {
              if (!loc.latitude || !loc.longitude) return null;
              const isSelected = selectedLocation?.id === loc.id;
              const pinConfig = getLocationPinConfig(loc.type);

              return (
                <AdvancedMarker
                  key={`loc-${loc.id}`}
                  position={{ lat: loc.latitude, lng: loc.longitude }}
                  title={`${loc.name} (${loc.nameAr})`}
                  onClick={() => {
                    setSelectedLocation(loc);
                    setSelectedVehicle(null);
                    setSelectedTrip(null);
                  }}
                >
                  <Pin
                    background={isSelected ? '#F59E0B' : pinConfig.bg}
                    glyphColor={pinConfig.glyph}
                    borderColor={isSelected ? '#D97706' : pinConfig.border}
                    scale={isSelected ? 1.3 : 1.05}
                  />
                </AdvancedMarker>
              );
            })}

          {/* 3. RENDER FLEET VEHICLES */}
          {filteredVehicles.map(vehicle => {
            if (!vehicle.latitude || !vehicle.longitude) return null;
            const isSelected = selectedVehicle?.id === vehicle.id;
            const isMoving = (vehicle.speedKmh || 0) > 0;
            const isMaintenance = vehicle.status === 'MAINTENANCE';

            // Status color styling
            const badgeBg = isMaintenance
              ? 'bg-amber-600 border-amber-400'
              : isMoving
              ? 'bg-blue-600 border-blue-400'
              : 'bg-emerald-600 border-emerald-400';

            return (
              <AdvancedMarker
                key={`veh-${vehicle.id}`}
                position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
                title={`${vehicle.internalVehicleId} - ${vehicle.plateNumber}`}
                zIndex={isSelected ? 100 : 20}
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  setSelectedLocation(null);
                  setSelectedTrip(null);
                  onSelectVehicle?.(vehicle.id);
                }}
              >
                <div className="relative group cursor-pointer">
                  {/* Outer pulse when moving or selected */}
                  {(isMoving || isSelected) && (
                    <span className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping" />
                  )}

                  {/* Marker Body */}
                  <div
                    className={`relative px-2 py-1 rounded-lg border shadow-lg flex items-center gap-1.5 transition-transform ${
                      isSelected ? 'scale-110 ring-2 ring-amber-400' : 'hover:scale-105'
                    } ${badgeBg} text-white`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px] font-bold tracking-tight">
                      {vehicle.internalVehicleId}
                    </span>
                    {isMoving && (
                      <span className="text-[10px] opacity-90 font-mono">
                        {vehicle.speedKmh}k
                      </span>
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* 4. VEHICLE INFO WINDOW */}
          {selectedVehicle && selectedVehicle.latitude && selectedVehicle.longitude && (
            <InfoWindow
              position={{ lat: selectedVehicle.latitude, lng: selectedVehicle.longitude }}
              onCloseClick={() => setSelectedVehicle(null)}
              headerContent={
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  {selectedVehicle.internalVehicleId} &bull; {selectedVehicle.make} {selectedVehicle.model}
                </div>
              }
            >
              <div className="p-1 max-w-xs text-xs space-y-2 text-slate-800">
                {/* Saudi Plate Representation */}
                <div className="bg-slate-100 border border-slate-300 rounded px-2 py-1 flex items-center justify-between font-mono">
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-900">{selectedVehicle.plateDigits}</span>{' '}
                    <span className="text-slate-600">{selectedVehicle.plateLettersEn}</span>
                  </div>
                  <div className="text-[11px] text-right font-sans">
                    <span className="font-bold text-slate-900">{selectedVehicle.plateDigitsAr}</span>{' '}
                    <span className="text-slate-600">{selectedVehicle.plateLettersAr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className={`font-semibold ${
                      selectedVehicle.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Speed:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedVehicle.speedKmh || 0} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mileage:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedVehicle.currentMileage?.toLocaleString()} km
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fuel Tank:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedVehicle.fuelLevelPercent || 75}%
                    </span>
                  </div>
                </div>

                <div className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-slate-500 block">Current Location / Station:</span>
                  <span className="font-medium text-slate-800">{selectedVehicle.currentLocation}</span>
                </div>

                {onOpenVehicleModal && (
                  <button
                    onClick={() => onOpenVehicleModal(selectedVehicle.id)}
                    className="w-full mt-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    View 360° Profile <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </InfoWindow>
          )}

          {/* 5. LOCATION INFO WINDOW */}
          {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
            <InfoWindow
              position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
              onCloseClick={() => setSelectedLocation(null)}
              headerContent={
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  {selectedLocation.name}
                </div>
              }
            >
              <div className="p-1 max-w-xs text-xs space-y-2 text-slate-800">
                <div className="text-[11px] font-medium text-slate-600">
                  {selectedLocation.nameAr}
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-500 block">Address:</span>
                  <span className="text-slate-700">{selectedLocation.address}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-[10px]">
                    {selectedLocation.type}
                  </span>
                  <span className="font-mono text-slate-500 text-[10px]">
                    {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* TOP FLOATING CONTROLS */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2.5">
          {/* Filter Pills */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
            {(['ALL', 'TRANSIT', 'ACTIVE', 'MAINTENANCE', 'HUBS'] as const).map(f => (
              <button
                key={f}
                onClick={() => onFilterChange?.(f)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeFilter === f
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' && `All (${simulatedVehicles.length})`}
                {f === 'TRANSIT' && `In Transit (${simulatedVehicles.filter(v => (v.speedKmh || 0) >= 60).length})`}
                {f === 'ACTIVE' && `Local / Active`}
                {f === 'MAINTENANCE' && `In Workshop (${simulatedVehicles.filter(v => v.status === 'MAINTENANCE').length})`}
                {f === 'HUBS' && `Hubs (${locations.length})`}
              </button>
            ))}
          </div>

          {/* Quick Actions Bar */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Live Telematics Simulator Toggle */}
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
              <span>{isSimulating ? 'Simulating Telematics' : 'Simulate Movement'}</span>
            </button>

            {/* Map Style Selector */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
              <button
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-1 rounded-lg ${
                  mapType === 'roadmap' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Street
              </button>
              <button
                onClick={() => setMapType('hybrid')}
                className={`px-2.5 py-1 rounded-lg ${
                  mapType === 'hybrid' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setMapType('terrain')}
                className={`px-2.5 py-1 rounded-lg ${
                  mapType === 'terrain' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Terrain
              </button>
            </div>

            {/* Vector Radar Switch Button */}
            <button
              onClick={() => setUseVectorRadar(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xl"
              title="Switch to Saudi Telematics Vector Radar"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Vector Radar</span>
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING REGION FOCUS SHORTCUTS */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1.5 text-xs">
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
      )}
    </div>
  );
};
