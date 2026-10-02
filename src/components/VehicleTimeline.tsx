import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Fuel,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  Gauge,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  Info,
  Layers,
  Milestone,
  Truck,
  Navigation,
  ArrowRight,
  ExternalLink,
  FileAudio,
  Radio,
  Eye,
  Activity,
  Check,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { MaintenanceRecord, FuelRecord, TripRecord, VehicleAssignment } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { exportToCsv } from '../utils/export';

export interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  type: 'TRIP' | 'FUEL' | 'MAINTENANCE' | 'MILESTONE';
  title: string;
  subtitle: string;
  mileage: number;
  cost?: number;
  status?: string;
  historicalStatus: string;
  details: {
    // Maintenance details
    workshop?: string;
    parts?: string;
    laborCost?: number;
    partsCost?: number;
    nextMaintenanceDate?: string;
    nextMaintenanceMileage?: number;
    // Fuel details
    liters?: number;
    pricePerLiter?: number;
    fuelStation?: string;
    fuelType?: string;
    // Trip details
    originName?: string;
    destinationName?: string;
    distanceKm?: number;
    startOdometer?: number;
    endOdometer?: number;
    driverName?: string;
    driverEmployeeId?: string;
    tripType?: string;
    voiceReportId?: string;
    originCoords?: { lat: number; lng: number };
    destinationCoords?: { lat: number; lng: number };
    // Milestone / Assignment details
    assignmentType?: string;
    workerName?: string;
    workerEmployeeId?: string;
    workerJobTitle?: string;
    // Common
    description?: string;
    notes?: string;
  };
  rawRecord: MaintenanceRecord | FuelRecord | TripRecord | VehicleAssignment | any;
}

interface VehicleTimelineProps {
  vehicle: any;
  onAddMaintenance?: (vehicleId: string) => void;
  onAddFuel?: (vehicleId: string) => void;
  onSelectRouteTab?: () => void;
  onViewFullTimeline?: () => void;
  compact?: boolean;
  maxRecent?: number;
}

export const VehicleTimeline: React.FC<VehicleTimelineProps> = ({
  vehicle,
  onAddMaintenance,
  onAddFuel,
  onSelectRouteTab,
  onViewFullTimeline,
  compact = false,
  maxRecent = 5
}) => {
  const { formatCurrency, formatDate } = useLanguage();
  const [filterType, setFilterType] = useState<'ALL' | 'TRIP' | 'FUEL' | 'MAINTENANCE' | 'MILESTONE'>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | '7D' | '30D' | '90D' | '180D' | '365D'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Compile all Trip, Fuel, Maintenance, and Milestone records into unified timeline
  const allTimelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!vehicle) return [];
    const events: TimelineEvent[] = [];

    // 1. Trip Records (Commercial Dispatches & Missions)
    if (Array.isArray(vehicle.trips)) {
      vehicle.trips.forEach((t: TripRecord) => {
        let historicalStatus = 'Completed Commercial Delivery';
        if (t.status === 'IN_PROGRESS') {
          historicalStatus = 'Active In-Transit Route';
        } else if (t.status === 'PLANNED') {
          historicalStatus = 'Scheduled Logistics Dispatch';
        } else if (t.status === 'CANCELLED') {
          historicalStatus = 'Cancelled Dispatch Order';
        }

        const origin = t.originName || 'Origin Depot';
        const destination = t.destinationName || 'Destination Site';
        const routeTitle = `${origin} ➔ ${destination}`;

        events.push({
          id: `trip-${t.id}`,
          date: t.tripDate,
          type: 'TRIP',
          title: routeTitle,
          subtitle: t.driverName ? `Driver: ${t.driverName}` : 'Commercial Transit Mission',
          mileage: t.endOdometer || t.startOdometer || 0,
          status: t.status || 'COMPLETED',
          historicalStatus,
          details: {
            originName: t.originName,
            destinationName: t.destinationName,
            distanceKm: t.distanceKm,
            startOdometer: t.startOdometer,
            endOdometer: t.endOdometer,
            driverName: t.driverName,
            driverEmployeeId: t.driverEmployeeId,
            tripType: t.tripType,
            description: t.description,
            voiceReportId: t.voiceReportId,
            originCoords: t.originCoords,
            destinationCoords: t.destinationCoords
          },
          rawRecord: t
        });
      });
    }

    // 2. Maintenance Records (Garage Work Orders & Servicing)
    if (Array.isArray(vehicle.maintenance)) {
      vehicle.maintenance.forEach((m: MaintenanceRecord) => {
        let historicalStatus = 'Returned to Active Fleet';
        if (m.status === 'IN_PROGRESS') {
          historicalStatus = 'Undergoing Workshop Repair';
        } else if (m.status === 'SCHEDULED') {
          historicalStatus = 'Scheduled Maintenance Slot';
        }

        const formatTypeTitle = (type: string) => {
          switch (type) {
            case 'PERIODIC_SERVICE': return 'Periodic Major Maintenance';
            case 'OIL_CHANGE': return 'Engine Oil & Filter Service';
            case 'BRAKE_SERVICE': return 'Brake Overhaul & Fluid Service';
            case 'TIRE_REPLACEMENT': return 'Tire Replacement & Balancing';
            case 'ENGINE_OVERHAUL': return 'Engine / Drivetrain Overhaul';
            case 'PREVENTIVE': return 'Preventive Safety Inspection';
            case 'CORRECTIVE': return 'Corrective Mechanical Repair';
            default: return type ? type.replace(/_/g, ' ') : 'Workshop Maintenance';
          }
        };

        events.push({
          id: `mnt-${m.id}`,
          date: m.date,
          type: 'MAINTENANCE',
          title: formatTypeTitle(m.maintenanceType),
          subtitle: m.workshop || 'Authorized Commercial Garage',
          mileage: m.mileage || 0,
          cost: m.totalCost || 0,
          status: m.status || 'COMPLETED',
          historicalStatus,
          details: {
            workshop: m.workshop,
            parts: m.parts,
            laborCost: m.laborCost,
            partsCost: m.partsCost,
            notes: m.notes,
            nextMaintenanceDate: m.nextMaintenanceDate,
            nextMaintenanceMileage: m.nextMaintenanceMileage,
            description: m.description
          },
          rawRecord: m
        });
      });
    }

    // 3. Fuel Records (Refills & Dispensing Logs)
    if (Array.isArray(vehicle.fuel)) {
      vehicle.fuel.forEach((f: FuelRecord) => {
        const fuelTypeLabel = f.fuelType
          ? f.fuelType.replace('GASOLINE_91', 'Gasoline 91').replace('GASOLINE_95', 'Gasoline 95').replace('DIESEL', 'Diesel')
          : 'Fuel';

        events.push({
          id: `fuel-${f.id}`,
          date: f.date,
          type: 'FUEL',
          title: `Fuel Refill (${f.liters || 0} L ${fuelTypeLabel})`,
          subtitle: f.fuelStation || 'Kingdom Fuel Service Hub',
          mileage: f.mileage || 0,
          cost: f.totalCost || 0,
          status: 'RECORDED',
          historicalStatus: 'Active Route Transit & Delivery',
          details: {
            liters: f.liters,
            pricePerLiter: f.pricePerLiter,
            fuelStation: f.fuelStation,
            fuelType: f.fuelType,
            notes: f.notes
          },
          rawRecord: f
        });
      });
    }

    // 4. Key Vehicle Milestones (Purchase / Acquisition Registration)
    if (vehicle.purchaseDate) {
      events.push({
        id: `milestone-purchase-${vehicle.id}`,
        date: vehicle.purchaseDate,
        type: 'MILESTONE',
        title: 'Fleet Acquisition & Asset Registration',
        subtitle: `${vehicle.make} ${vehicle.model} (${vehicle.year || ''}) - ${vehicle.ownershipType || 'OWNED'}`,
        mileage: 0,
        cost: vehicle.purchasePrice || 0,
        status: 'ONBOARDED',
        historicalStatus: 'Initial Fleet Commissioning',
        details: {
          description: `Vehicle acquired and entered into the Saudi commercial fleet registry. Initial VIN: ${vehicle.vin || 'N/A'}. Plate: ${vehicle.plateNumber || 'N/A'}.`,
          notes: vehicle.notes
        },
        rawRecord: vehicle
      });
    }

    // 5. Driver Custody Handover Milestones
    if (Array.isArray(vehicle.assignments)) {
      vehicle.assignments.forEach((asgn: VehicleAssignment) => {
        if (asgn.assignedFrom) {
          events.push({
            id: `milestone-asgn-start-${asgn.id}`,
            date: asgn.assignedFrom,
            type: 'MILESTONE',
            title: `Driver Linked: ${asgn.workerName || 'Staff Driver'}`,
            subtitle: `${asgn.workerEmployeeId ? `${asgn.workerEmployeeId} • ` : ''}${asgn.assignmentType || 'PRIMARY'} Driver Link`,
            mileage: asgn.startMileage || 0,
            status: asgn.isCurrent ? 'ACTIVE' : 'COMPLETED',
            historicalStatus: asgn.isCurrent ? 'Current Active Custody' : 'Historical Driver Link',
            details: {
              workerName: asgn.workerName,
              workerEmployeeId: asgn.workerEmployeeId,
              workerJobTitle: asgn.workerJobTitle,
              assignmentType: asgn.assignmentType,
              description: `Assigned driver ${asgn.workerName || 'Staff Member'} (${asgn.workerJobTitle || 'Driver'}) took vehicle custody at odometer ${asgn.startMileage ? `${asgn.startMileage.toLocaleString()} KM` : 'N/A'}.`,
              notes: asgn.notes
            },
            rawRecord: asgn
          });
        }
        if (asgn.assignedTo && !asgn.isCurrent) {
          events.push({
            id: `milestone-asgn-end-${asgn.id}`,
            date: asgn.assignedTo,
            type: 'MILESTONE',
            title: `Driver Handover Concluded: ${asgn.workerName || 'Staff Driver'}`,
            subtitle: `Handover Complete • Return Odometer: ${asgn.endMileage ? `${asgn.endMileage.toLocaleString()} KM` : 'N/A'}`,
            mileage: asgn.endMileage || asgn.startMileage || 0,
            status: 'COMPLETED',
            historicalStatus: 'Vehicle Handover & Return',
            details: {
              workerName: asgn.workerName,
              workerEmployeeId: asgn.workerEmployeeId,
              description: `Driver ${asgn.workerName || 'Staff Member'} concluded custody assignment and completed vehicle handover.`,
              notes: asgn.notes
            },
            rawRecord: asgn
          });
        }
      });
    }

    return events;
  }, [vehicle]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    const now = new Date();

    const filtered = allTimelineEvents.filter(ev => {
      // Filter by category
      if (filterType !== 'ALL' && ev.type !== filterType) {
        return false;
      }

      // Filter by date preset
      if (dateRange !== 'ALL') {
        const evDate = new Date(ev.date);
        const diffDays = (now.getTime() - evDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dateRange === '7D' && diffDays > 7) return false;
        if (dateRange === '30D' && diffDays > 30) return false;
        if (dateRange === '90D' && diffDays > 90) return false;
        if (dateRange === '180D' && diffDays > 180) return false;
        if (dateRange === '365D' && diffDays > 365) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesSub = ev.subtitle.toLowerCase().includes(q);
        const matchesNotes = ev.details.notes?.toLowerCase().includes(q) || false;
        const matchesParts = ev.details.parts?.toLowerCase().includes(q) || false;
        const matchesStation = ev.details.fuelStation?.toLowerCase().includes(q) || false;
        const matchesWorkshop = ev.details.workshop?.toLowerCase().includes(q) || false;
        const matchesDriver = ev.details.driverName?.toLowerCase().includes(q) || false;
        const matchesOrigin = ev.details.originName?.toLowerCase().includes(q) || false;
        const matchesDest = ev.details.destinationName?.toLowerCase().includes(q) || false;
        const matchesTripType = ev.details.tripType?.toLowerCase().includes(q) || false;
        const matchesStatus = ev.historicalStatus.toLowerCase().includes(q);
        if (
          !matchesTitle &&
          !matchesSub &&
          !matchesNotes &&
          !matchesParts &&
          !matchesStation &&
          !matchesWorkshop &&
          !matchesDriver &&
          !matchesOrigin &&
          !matchesDest &&
          !matchesTripType &&
          !matchesStatus
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

    if (compact) {
      return filtered.slice(0, maxRecent);
    }
    return filtered;
  }, [allTimelineEvents, filterType, dateRange, searchQuery, sortOrder, compact, maxRecent]);

  // Timeline Statistics & Aggregations
  const stats = useMemo(() => {
    let totalTripCount = 0;
    let totalTripDistance = 0;
    let totalMaintenanceCost = 0;
    let totalMaintenanceCount = 0;
    let totalFuelCost = 0;
    let totalFuelLiters = 0;
    let totalFuelCount = 0;
    let totalMilestonesCount = 0;
    const mileages: number[] = [];

    allTimelineEvents.forEach(e => {
      if (e.mileage > 0) mileages.push(e.mileage);
      if (e.type === 'TRIP') {
        totalTripCount++;
        totalTripDistance += e.details.distanceKm || 0;
      } else if (e.type === 'MAINTENANCE') {
        totalMaintenanceCount++;
        totalMaintenanceCost += e.cost || 0;
      } else if (e.type === 'FUEL') {
        totalFuelCount++;
        totalFuelCost += e.cost || 0;
        totalFuelLiters += e.details.liters || 0;
      } else if (e.type === 'MILESTONE') {
        totalMilestonesCount++;
      }
    });

    const minMileage = mileages.length > 0 ? Math.min(...mileages) : (vehicle?.currentMileage || 0);
    const maxMileage = mileages.length > 0 ? Math.max(...mileages) : (vehicle?.currentMileage || 0);
    const mileageSpan = Math.max(0, maxMileage - minMileage);

    return {
      totalEvents: allTimelineEvents.length,
      totalTripCount,
      totalTripDistance,
      totalMaintenanceCount,
      totalMaintenanceCost,
      totalFuelCount,
      totalFuelCost,
      totalFuelLiters,
      totalMilestonesCount,
      minMileage,
      maxMileage,
      mileageSpan
    };
  }, [allTimelineEvents, vehicle]);

  // Toggle individual card expansion
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(filteredEvents.map(e => e.id));
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Export filtered timeline to CSV
  const handleExportCsv = () => {
    if (filteredEvents.length === 0) return;
    const data = filteredEvents.map(e => ({
      Date: e.date,
      Category: e.type,
      Title: e.title,
      'Location / Subtitle': e.subtitle,
      'Odometer (KM)': e.mileage || '',
      'Cost (SAR)': e.cost || 0,
      Status: e.status || '',
      'Operational State': e.historicalStatus,
      'Trip Distance (KM)': e.details.distanceKm || '',
      'Driver Name': e.details.driverName || '',
      Workshop: e.details.workshop || '',
      'Parts Serviced': e.details.parts || '',
      'Labor Cost (SAR)': e.details.laborCost || '',
      'Parts Cost (SAR)': e.details.partsCost || '',
      'Fuel Volume (Liters)': e.details.liters || '',
      'Fuel Unit Price (SAR)': e.details.pricePerLiter || '',
      'Fuel Station': e.details.fuelStation || '',
      Notes: e.details.notes || e.details.description || ''
    }));
    exportToCsv(data, `${vehicle?.internalVehicleId || 'Vehicle'}_Full_Operational_Timeline`);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics Strip (Shown in Full Mode) */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Trip Missions Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/30 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Trips & Missions</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {stats.totalTripCount} Dispatches
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                {stats.totalTripDistance.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-500">KM</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Total commercial route distance logged
              </div>
            </div>
          </div>

          {/* Fuel Card */}
          <div className="bg-gradient-to-br from-sky-50/70 to-cyan-50/30 border border-sky-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5" />
                <span>Fuel Dispensed</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {stats.totalFuelCount} Refills
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                {stats.totalFuelLiters.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-500">Liters</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {formatCurrency(stats.totalFuelCost)} cumulative spend
              </div>
            </div>
          </div>

          {/* Maintenance Card */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>Garage Service</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                {stats.totalMaintenanceCount} Orders
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(stats.totalMaintenanceCost)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Spare parts & commercial labor
              </div>
            </div>
          </div>

          {/* Mileage Span Card */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                <span>Odometer Span</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono">
                {stats.maxMileage.toLocaleString()} KM
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                {stats.mileageSpan > 0 ? `+${stats.mileageSpan.toLocaleString()} KM` : 'Verified'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Tracked odometer progression
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Events ({allTimelineEvents.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('TRIP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'TRIP'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Trips ({stats.totalTripCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('FUEL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'FUEL'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Fuel ({stats.totalFuelCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('MAINTENANCE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'MAINTENANCE'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance ({stats.totalMaintenanceCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('MILESTONE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'MILESTONE'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              <Milestone className="w-3.5 h-3.5" />
              <span>Milestones ({stats.totalMilestonesCount})</span>
            </button>
          </div>

          {/* Quick Actions (Sort, Expand, Export) */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title={`Sorting: ${sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
            </button>

            <button
              type="button"
              onClick={expandedIds.size === filteredEvents.length ? collapseAll : expandAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Expand or collapse event details"
            >
              {expandedIds.size === filteredEvents.length ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              )}
            </button>

            {!compact && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Download full chronological timeline report as CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-800" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Search and Date Preset Filters (In Full Mode or if searched) */}
        {(!compact || searchQuery) && (
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search trip routes, destinations, drivers, fuel stations, workshops, parts..."
                className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white text-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Range:</span>
              </span>
              {(['ALL', '7D', '30D', '90D', '180D', '365D'] as const).map(rng => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => setDateRange(rng)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap ${
                    dateRange === rng
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rng === 'ALL'
                    ? 'All Time'
                    : rng === '7D'
                    ? '7 Days'
                    : rng === '30D'
                    ? '30 Days'
                    : rng === '90D'
                    ? '90 Days'
                    : rng === '180D'
                    ? '6 Months'
                    : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. The Vertical Timeline Feed */}
      {filteredEvents.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 space-y-3.5">
          {filteredEvents.map((ev, index) => {
            const isExpanded = expandedIds.has(ev.id);
            const prevEvent = index > 0 ? filteredEvents[index - 1] : null;
            const kmDelta =
              prevEvent && prevEvent.mileage && ev.mileage
                ? Math.abs(ev.mileage - prevEvent.mileage)
                : null;

            // Category classification
            const isTrip = ev.type === 'TRIP';
            const isFuel = ev.type === 'FUEL';
            const isMaintenance = ev.type === 'MAINTENANCE';
            const isMilestone = ev.type === 'MILESTONE';

            // Distinct node icons & theme colors
            let badgeBg = 'bg-slate-700 text-white';
            let cardBorder = 'border-slate-200 hover:border-slate-300';
            let categoryPillStyle = 'bg-slate-100 text-slate-700';

            if (isTrip) {
              badgeBg =
                ev.status === 'IN_PROGRESS'
                  ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white ring-4 ring-indigo-100 animate-pulse'
                  : 'bg-indigo-600 text-white shadow-xs';
              cardBorder = isExpanded
                ? 'border-indigo-300 ring-1 ring-indigo-200 shadow-sm'
                : 'border-slate-200 hover:border-indigo-200';
              categoryPillStyle =
                ev.status === 'IN_PROGRESS'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200/60';
            } else if (isFuel) {
              badgeBg = 'bg-sky-600 text-white shadow-xs';
              cardBorder = isExpanded
                ? 'border-sky-300 ring-1 ring-sky-200 shadow-sm'
                : 'border-slate-200 hover:border-sky-200';
              categoryPillStyle = 'bg-sky-50 text-sky-800 border border-sky-200/60';
            } else if (isMaintenance) {
              badgeBg =
                ev.status === 'IN_PROGRESS'
                  ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-100 animate-pulse'
                  : 'bg-amber-600 text-white shadow-xs';
              cardBorder = isExpanded
                ? 'border-amber-300 ring-1 ring-amber-200 shadow-sm'
                : 'border-slate-200 hover:border-amber-200';
              categoryPillStyle =
                ev.status === 'IN_PROGRESS'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-200/60';
            } else if (isMilestone) {
              badgeBg = 'bg-purple-700 text-white shadow-xs';
              cardBorder = isExpanded
                ? 'border-purple-300 ring-1 ring-purple-200 shadow-sm'
                : 'border-slate-200 hover:border-purple-200';
              categoryPillStyle = 'bg-purple-50 text-purple-900 border border-purple-200/60';
            }

            return (
              <div key={ev.id} className="relative group">
                {/* Node icon anchored to vertical stem */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-white transition-transform group-hover:scale-110 z-10 ${badgeBg}`}
                >
                  {isTrip && <Truck className="w-3 h-3" />}
                  {isFuel && <Fuel className="w-3 h-3" />}
                  {isMaintenance && <Wrench className="w-3 h-3" />}
                  {isMilestone && <Milestone className="w-3 h-3" />}
                </div>

                {/* Event Card */}
                <div
                  onClick={() => toggleExpand(ev.id)}
                  className={`bg-white border rounded-xl p-3.5 transition-all duration-150 cursor-pointer shadow-2xs ${cardBorder}`}
                >
                  {/* Card Header & Content Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Top Bar: Title & Category Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isTrip ? (
                          <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs sm:text-sm">
                            <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-none">
                              {ev.details.originName || 'Origin'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="text-slate-900 font-black truncate max-w-[200px] sm:max-w-none">
                              {ev.details.destinationName || 'Destination'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {ev.title}
                          </span>
                        )}

                        {/* Category Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${categoryPillStyle}`}
                        >
                          {isTrip && <Navigation className="w-2.5 h-2.5" />}
                          {isFuel && <Fuel className="w-2.5 h-2.5" />}
                          {isMaintenance && <Wrench className="w-2.5 h-2.5" />}
                          {isMilestone && <Milestone className="w-2.5 h-2.5" />}
                          <span>{isTrip ? 'Trip Mission' : ev.type}</span>
                        </span>

                        {/* Operational State Pill */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60 truncate max-w-[190px]">
                          {ev.historicalStatus}
                        </span>

                        {/* Voice Note Link Tag if available */}
                        {ev.details.voiceReportId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <FileAudio className="w-3 h-3 text-emerald-600" />
                            <span>#{ev.details.voiceReportId}</span>
                          </span>
                        )}
                      </div>

                      {/* Subtitle & Metadata Row */}
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{ev.subtitle}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(ev.date)}
                        </span>

                        {/* Odometer */}
                        {ev.mileage > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-semibold text-slate-800 flex items-center gap-1 shrink-0">
                              <Gauge className="w-3 h-3 text-emerald-700" />
                              {ev.mileage.toLocaleString()} KM
                            </span>
                          </>
                        )}

                        {/* Distance for Trip */}
                        {isTrip && ev.details.distanceKm !== undefined && ev.details.distanceKm > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                              {ev.details.distanceKm} KM Route
                            </span>
                          </>
                        )}

                        {/* Consecutive Mileage Delta */}
                        {kmDelta !== null && kmDelta > 0 && (
                          <span className="text-[10px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded shrink-0">
                            Δ {kmDelta.toLocaleString()} KM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Cost / Metrics & Expand Button */}
                    <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                      {/* Financial Value for Fuel & Maintenance */}
                      {ev.cost !== undefined && ev.cost > 0 && (
                        <div className="text-right rtl:text-left">
                          <div className="text-xs font-black text-slate-900">
                            {formatCurrency(ev.cost)}
                          </div>
                          {isFuel && ev.details.liters && (
                            <div className="text-[10px] text-slate-500">
                              {ev.details.liters} L @ {formatCurrency(ev.details.pricePerLiter || 1.15)}/L
                            </div>
                          )}
                          {isMaintenance && ev.details.laborCost !== undefined && (
                            <div className="text-[10px] text-slate-500">
                              Labor: {formatCurrency(ev.details.laborCost)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Distance Badge for Trip */}
                      {isTrip && ev.details.distanceKm && (
                        <div className="text-right rtl:text-left">
                          <div className="text-xs font-black text-indigo-700">
                            {ev.details.distanceKm} KM
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {ev.status === 'IN_PROGRESS' ? 'Active Transit' : 'Route Complete'}
                          </div>
                        </div>
                      )}

                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* 4. Expanded Card Panel Details */}
                  {isExpanded && (
                    <div
                      className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-3 animate-in fade-in duration-150"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* --- A. TRIP EXPANDED VIEW --- */}
                      {isTrip && (
                        <div className="space-y-3">
                          {/* Route Visual Pathway Banner */}
                          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 p-3 rounded-xl border border-indigo-200/80">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-1.5 flex-1">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                                  Commercial Route Direction
                                </span>
                                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></div>
                                    <span>{ev.details.originName || 'Origin Depot'}</span>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-200"></div>
                                    <span>{ev.details.destinationName || 'Destination Site'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Live Route Tab Quick Jump */}
                              {onSelectRouteTab && (
                                <button
                                  type="button"
                                  onClick={() => onSelectRouteTab()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs self-start sm:self-center"
                                >
                                  <Radio className="w-3.5 h-3.5 text-indigo-200" />
                                  <span>Route Playback</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Trip Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">Assigned Driver</span>
                              <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{ev.details.driverName || 'Staff Driver'}</span>
                              </span>
                              {ev.details.driverEmployeeId && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ID: {ev.details.driverEmployeeId}
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-400 block">Mission Type</span>
                              <span className="font-bold text-slate-900 mt-0.5 block">
                                {ev.details.tripType || 'Logistics Dispatch'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block">Odometer Log</span>
                              <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                                {ev.details.startOdometer ? `${ev.details.startOdometer.toLocaleString()} KM` : '—'} ➔{' '}
                                {ev.details.endOdometer ? `${ev.details.endOdometer.toLocaleString()} KM` : 'En Route'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block">Dispatch Status</span>
                              <span
                                className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-[10px] ${
                                  ev.status === 'IN_PROGRESS'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}
                              >
                                {ev.status === 'IN_PROGRESS' ? '● In Progress' : '✓ Completed'}
                              </span>
                            </div>
                          </div>

                          {/* Trip Mission Description / Cargo Notes */}
                          {ev.details.description && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                              <span className="font-bold text-slate-600 block mb-0.5 flex items-center gap-1">
                                <Info className="w-3 h-3 text-slate-400" />
                                Cargo & Mission Brief
                              </span>
                              <p className="text-slate-700">{ev.details.description}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* --- B. MAINTENANCE EXPANDED VIEW --- */}
                      {isMaintenance && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                              Parts Serviced / Installed
                            </span>
                            <div className="text-slate-800 font-medium bg-white p-2.5 rounded border border-slate-200 text-[11px]">
                              {ev.details.parts || 'No component replacement recorded for this service event.'}
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                              Cost Allocation Breakdown
                            </span>
                            <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Labor Charge:</span>
                                <span className="font-semibold text-slate-800">
                                  {formatCurrency(ev.details.laborCost || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Spare Parts Cost:</span>
                                <span className="font-semibold text-slate-800">
                                  {formatCurrency(ev.details.partsCost || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                                <span className="text-slate-800">Total Invoice:</span>
                                <span className="text-emerald-950 font-black">
                                  {formatCurrency(ev.cost || 0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Next Recommended Preventive Milestones */}
                          {(ev.details.nextMaintenanceDate || ev.details.nextMaintenanceMileage) && (
                            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px]">
                              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Recommended Next Preventive Service:
                              </span>
                              <div className="flex items-center gap-3 font-semibold text-emerald-900">
                                {ev.details.nextMaintenanceDate && (
                                  <span>Target Date: {formatDate(ev.details.nextMaintenanceDate)}</span>
                                )}
                                {ev.details.nextMaintenanceMileage && (
                                  <span>
                                    Target Odometer:{' '}
                                    {ev.details.nextMaintenanceMileage.toLocaleString()} KM
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {ev.details.description && (
                            <div className="sm:col-span-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                                Work Order Description
                              </span>
                              <p className="text-slate-700 text-[11px]">{ev.details.description}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* --- C. FUEL EXPANDED VIEW --- */}
                      {isFuel && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Fuel Dispensed</span>
                            <span className="font-bold text-slate-900 mt-0.5 block">
                              {ev.details.liters || 0} Liters
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Grade Rate</span>
                            <span className="font-bold text-slate-900 mt-0.5 block">
                              {formatCurrency(ev.details.pricePerLiter || 0)} / L
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Total Settlement</span>
                            <span className="font-bold text-emerald-950 mt-0.5 block">
                              {formatCurrency(ev.cost || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Odometer at Pump</span>
                            <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                              {ev.mileage?.toLocaleString()} KM
                            </span>
                          </div>
                        </div>
                      )}

                      {/* --- D. MILESTONE EXPANDED VIEW --- */}
                      {isMilestone && (
                        <div className="bg-purple-50/60 border border-purple-200 p-3 rounded-lg text-[11px] text-purple-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                            <span>Asset Registry & Custody Event</span>
                          </div>
                          <p>{ev.details.description}</p>
                          {ev.cost !== undefined && ev.cost > 0 && (
                            <div className="pt-1 text-slate-600">
                              Capitalized Purchase Value:{' '}
                              <span className="font-bold text-slate-900">
                                {formatCurrency(ev.cost)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Common Notes Section */}
                      {ev.details.notes && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                          <span className="font-bold text-slate-600 block mb-0.5 flex items-center gap-1">
                            <Info className="w-3 h-3 text-slate-400" />
                            Operational & Administrative Notes
                          </span>
                          <p className="text-slate-700 italic">{ev.details.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl py-10 px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              No timeline events match the selected criteria
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || filterType !== 'ALL' || dateRange !== 'ALL'
                ? 'Try adjusting your search query, selecting "All Events", or widening the date filter.'
                : 'No recent trips, fuel fill-ups, or maintenance events have been logged for this vehicle.'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {searchQuery || filterType !== 'ALL' || dateRange !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL');
                  setDateRange('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs"
              >
                Reset All Filters
              </button>
            ) : (
              <>
                {onAddFuel && (
                  <button
                    type="button"
                    onClick={() => onAddFuel(vehicle.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-700 text-white hover:bg-sky-800 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Fuel Refill</span>
                  </button>
                )}
                {onAddMaintenance && (
                  <button
                    type="button"
                    onClick={() => onAddMaintenance(vehicle.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-white hover:bg-emerald-900 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Maintenance</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Compact Mode Switch to Full Timeline Link */}
      {compact && allTimelineEvents.length > maxRecent && (
        <div className="pt-2 flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <div className="text-xs text-slate-600">
            Showing <span className="font-bold text-slate-900">{filteredEvents.length}</span> of{' '}
            <span className="font-bold text-slate-900">{allTimelineEvents.length}</span> total
            chronological events (Trips, Fuel & Maintenance).
          </div>
          {onViewFullTimeline && (
            <button
              type="button"
              onClick={onViewFullTimeline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs shrink-0"
            >
              <span>View Full Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
