import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  User as UserIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Plus,
  RefreshCw,
  Eye,
  ArrowRight,
  Map as MapIcon,
  Layers,
  Compass,
  Navigation,
  ExternalLink,
  ChevronRight,
  Table as TableIcon
} from 'lucide-react';
import { TripRecord, Worker, Vehicle, CompanyLocation } from '../../types';
import { FleetGoogleMap } from '../maps/FleetGoogleMap';
import { routesApiClient, RouteComputationResult } from '../../services/routesApi';

interface TripsListViewProps {
  onOpenVoiceModal?: () => void;
  onOpenVehicle?: (id: string) => void;
}

export const TripsListView: React.FC<TripsListViewProps> = ({
  onOpenVoiceModal,
  onOpenVehicle
}) => {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'SPLIT' | 'MAP' | 'TABLE'>('SPLIT');
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteComputationResult | null>(null);

  const fetchTripsAndMeta = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const [tripsRes, vehRes, locRes] = await Promise.all([
        fetch(`/api/trips?${params.toString()}`, { headers }),
        fetch('/api/vehicles', { headers }),
        fetch('/api/locations', { headers })
      ]);

      const tripsData = await tripsRes.json();
      const vehData = await vehRes.json();
      const locData = await locRes.json();

      if (tripsData.success) {
        setTrips(tripsData.trips || []);
        if (tripsData.trips?.length > 0 && !selectedTrip) {
          setSelectedTrip(tripsData.trips[0]);
        }
      }
      if (vehData.success) {
        setVehicles(vehData.vehicles || []);
      }
      if (locData.success) {
        setLocations(locData.locations || []);
      }
    } catch (e) {
      console.error('Error fetching trips and metadata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndMeta();
  }, [statusFilter]);

  // When selected trip changes, compute realistic route metrics via RoutesApi
  useEffect(() => {
    if (!selectedTrip || !selectedTrip.originCoords || !selectedTrip.destinationCoords) {
      setRouteMetrics(null);
      return;
    }

    let isMounted = true;
    routesApiClient
      .computeRoute(selectedTrip.originCoords, selectedTrip.destinationCoords)
      .then(result => {
        if (isMounted) {
          setRouteMetrics(result);
        }
      })
      .catch(err => console.warn('Routes calculation failed:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedTrip]);

  const filteredTrips = trips.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.driverName && t.driverName.toLowerCase().includes(q)) ||
      (t.vehiclePlate && t.vehiclePlate.toLowerCase().includes(q)) ||
      (t.destinationName && t.destinationName.toLowerCase().includes(q)) ||
      (t.originName && t.originName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" /> Dispatch Trips & Route Corridors
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time Google Maps route visualization, freight dispatches, and voice-reported logistics journeys
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'SPLIT'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Map and Table View"
            >
              <Layers className="w-3.5 h-3.5" /> Split
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'MAP'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Route Map View"
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compact Table View"
            >
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          <button
            onClick={fetchTripsAndMeta}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <FileAudio className="w-4 h-4" /> Report Trip via Voice
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE ROUTE MAP SECTION (Shown in SPLIT or MAP mode) */}
      {(viewMode === 'SPLIT' || viewMode === 'MAP') && (
        <div className="space-y-3">
          {/* Selected Route Banner */}
          {selectedTrip && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {selectedTrip.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        selectedTrip.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {selectedTrip.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      &bull; {selectedTrip.tripType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                    <span className="font-medium">{selectedTrip.originName || 'Origin Hub'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-white">{selectedTrip.destinationName}</span>
                  </div>
                </div>
              </div>

              {/* Route Computation Metrics from Routes API */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                {routeMetrics && (
                  <>
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">CORRIDOR DISTANCE</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {routeMetrics.distanceKm} km
                      </span>
                    </div>
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">EST. DRIVING TIME</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {routeMetrics.durationText}
                      </span>
                    </div>
                  </>
                )}

                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ASSIGNED DRIVER</span>
                  <span className="font-semibold text-slate-200">
                    {selectedTrip.driverName || 'Captain Driver'}
                  </span>
                </div>

                {selectedTrip.vehicleId && onOpenVehicle && (
                  <button
                    onClick={() => onOpenVehicle(selectedTrip.vehicleId)}
                    className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    Vehicle {selectedTrip.vehiclePlate || selectedTrip.vehicleInternalId} <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Interactive Google Map Instance */}
          <FleetGoogleMap
            vehicles={vehicles}
            locations={locations}
            trips={trips}
            selectedVehicleId={selectedTrip?.vehicleId}
            onSelectVehicle={id => {
              const matchedTrip = trips.find(t => t.vehicleId === id);
              if (matchedTrip) setSelectedTrip(matchedTrip);
            }}
            onOpenVehicleModal={onOpenVehicle}
            height={viewMode === 'MAP' ? '650px' : '440px'}
            showControls={true}
          />
        </div>
      )}

      {/* Filter Bar */}
      {(viewMode === 'SPLIT' || viewMode === 'TABLE') && (
        <>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search trips by destination, driver, plate number, route ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'IN_PROGRESS', 'COMPLETED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Trips' : st === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Trips Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading trips...</div>
            ) : filteredTrips.length === 0 ? (
              <div className="py-16 text-center text-slate-400">No trips recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Trip ID & Date</th>
                      <th className="py-3 px-4">Driver & Assigned Vehicle</th>
                      <th className="py-3 px-4">Origin & Destination</th>
                      <th className="py-3 px-4">Type & Description</th>
                      <th className="py-3 px-4">Distance / Status</th>
                      <th className="py-3 px-4">Actions / Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTrips.map(trip => {
                      const isSelected = selectedTrip?.id === trip.id;
                      return (
                        <tr
                          key={trip.id}
                          onClick={() => setSelectedTrip(trip)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                              {trip.id}
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {trip.tripDate}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">
                              {trip.driverName || 'Captain Driver'}
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-400" />
                              {trip.vehiclePlate} ({trip.vehicleInternalId})
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <span className="text-slate-400">{trip.originName || 'Origin'}</span>
                              <ArrowRight className="w-3 h-3 text-amber-400" />
                              <span className="font-bold text-white flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-400" /> {trip.destinationName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium block w-fit mb-0.5">
                              {trip.tripType}
                            </span>
                            <span className="text-xs text-slate-400 line-clamp-1">
                              {trip.description}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-200 text-xs">
                              {trip.distanceKm || 350} km
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                trip.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {trip.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {trip.status}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedTrip(trip);
                                if (viewMode === 'TABLE') setViewMode('SPLIT');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <MapIcon className="w-3 h-3" />
                              {isSelected ? 'Viewing on Map' : 'View on Map'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
