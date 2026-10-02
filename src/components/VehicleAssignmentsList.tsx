import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Phone,
  ExternalLink,
  FileText,
  AlertCircle,
  X,
  Gauge,
  CheckCircle2,
  Sparkles,
  UserX,
  BadgeCheck
} from 'lucide-react';
import { Vehicle, VehicleAssignment, Worker } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { exportToCsv } from '../utils/export';
import { getAuthHeaders } from '../utils/api';

interface VehicleAssignmentsListProps {
  vehicle: Vehicle;
  onOpenWorker?: (workerId: string) => void;
  onRefreshVehicle?: () => void;
  userRole?: string;
  token?: string | null;
}

export const VehicleAssignmentsList: React.FC<VehicleAssignmentsListProps> = ({
  vehicle,
  onOpenWorker,
  onRefreshVehicle,
  userRole = 'ADMIN',
  token = null
}) => {
  const { formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PAST'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Modal / drawer states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [targetAssignmentToUnlink, setTargetAssignmentToUnlink] = useState<VehicleAssignment | null>(null);

  // Available workers list for assignment
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Assign Form state
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentType, setAssignmentType] = useState<'PRIMARY' | 'TEMPORARY' | 'RELIEF' | 'MAINTENANCE_RELOCATION'>('PRIMARY');
  const [startMileage, setStartMileage] = useState<number | string>(vehicle.currentMileage || 0);
  const [handoverChecklist, setHandoverChecklist] = useState(true);
  const [assignNotes, setAssignNotes] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Unlink Form state
  const [unlinkEndDate, setUnlinkEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [unlinkEndMileage, setUnlinkEndMileage] = useState<number | string>(vehicle.currentMileage || 0);
  const [unlinkHandoverChecked, setUnlinkHandoverChecked] = useState(true);
  const [unlinkNotes, setUnlinkNotes] = useState('');
  const [submittingUnlink, setSubmittingUnlink] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');

  const canManageAssignments = ['ADMIN', 'MANAGER'].includes(userRole);

  // Fetch available workers when assign modal opens
  useEffect(() => {
    if (isAssignModalOpen) {
      fetchWorkers();
    }
  }, [isAssignModalOpen]);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const res = await fetch('/api/workers', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        setAvailableWorkers(list);
        if (list.length > 0 && !selectedWorkerId) {
          // Default to first worker not currently assigned to this vehicle
          const candidate = list.find((w: Worker) => w.id !== vehicle.assignedWorkerId);
          if (candidate) setSelectedWorkerId(candidate.id);
        }
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Assignments raw list
  const rawAssignments: VehicleAssignment[] = useMemo(() => {
    if (Array.isArray(vehicle.assignments) && vehicle.assignments.length > 0) {
      return vehicle.assignments;
    }
    // Fallback: If vehicle has a current driver, build an active assignment item
    if (vehicle.driver || vehicle.assignedWorkerId) {
      const drv = vehicle.driver;
      return [{
        id: `asgn-fallback-${vehicle.id}`,
        vehicleId: vehicle.id,
        workerId: vehicle.assignedWorkerId || drv?.id || 'unknown',
        workerName: drv?.fullName || 'Assigned Driver',
        workerNameAr: drv?.fullNameAr || '',
        workerEmployeeId: drv?.employeeId || '',
        workerJobTitle: 'Fleet Driver',
        workerNationality: drv?.nationality || 'Saudi',
        workerMobile: drv?.mobileNumber || '',
        workerPhotoUrl: drv?.photoUrl || '',
        assignedFrom: vehicle.purchaseDate || vehicle.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        assignedTo: null,
        isCurrent: true,
        assignmentType: 'PRIMARY',
        startMileage: 0,
        endMileage: null,
        assignedBy: 'Fleet Operations',
        handoverChecklistCompleted: true,
        notes: 'Current primary vehicle captain.',
        createdAt: vehicle.createdAt || new Date().toISOString(),
        updatedAt: vehicle.updatedAt || new Date().toISOString()
      }];
    }
    return [];
  }, [vehicle.assignments, vehicle.driver, vehicle.assignedWorkerId, vehicle.id, vehicle.createdAt, vehicle.updatedAt, vehicle.purchaseDate]);

  // Duration calculator
  const calculateDuration = (fromStr: string, toStr: string | null) => {
    try {
      const fromDate = new Date(fromStr);
      const toDate = toStr ? new Date(toStr) : new Date();
      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (diffDays < 30) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      }
      const months = Math.floor(diffDays / 30.4375);
      const remDays = Math.round(diffDays % 30.4375);
      if (months < 12) {
        return remDays > 0 ? `${months} mo, ${remDays} d` : `${months} mo`;
      }
      const years = (diffDays / 365.25).toFixed(1);
      return `${years} yrs (${diffDays} d)`;
    } catch {
      return '--';
    }
  };

  // Filtered and sorted assignments
  const filteredAssignments = useMemo(() => {
    let list = [...rawAssignments];

    // Status filter
    if (filterStatus === 'ACTIVE') {
      list = list.filter(a => a.isCurrent);
    } else if (filterStatus === 'PAST') {
      list = list.filter(a => !a.isCurrent);
    }

    // Type filter
    if (filterType !== 'ALL') {
      list = list.filter(a => a.assignmentType === filterType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.workerName && a.workerName.toLowerCase().includes(q)) ||
        (a.workerNameAr && a.workerNameAr.toLowerCase().includes(q)) ||
        (a.workerEmployeeId && a.workerEmployeeId.toLowerCase().includes(q)) ||
        (a.workerJobTitle && a.workerJobTitle.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.assignedBy && a.assignedBy.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      // Keep currently active at top if sorting by date DESC
      if (sortOrder === 'DESC') {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return new Date(b.assignedFrom).getTime() - new Date(a.assignedFrom).getTime();
      } else {
        return new Date(a.assignedFrom).getTime() - new Date(b.assignedFrom).getTime();
      }
    });

    return list;
  }, [rawAssignments, filterStatus, filterType, searchQuery, sortOrder]);

  // Metrics
  const activeAssignment = useMemo(() => rawAssignments.find(a => a.isCurrent), [rawAssignments]);
  const totalCompletedAssignments = useMemo(() => rawAssignments.filter(a => !a.isCurrent).length, [rawAssignments]);
  const totalDaysAssigned = useMemo(() => {
    return rawAssignments.reduce((sum, a) => {
      const f = new Date(a.assignedFrom).getTime();
      const t = a.assignedTo ? new Date(a.assignedTo).getTime() : new Date().getTime();
      const days = Math.max(0, Math.floor((t - f) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
  }, [rawAssignments]);

  // Handle Export CSV
  const handleExportCsv = () => {
    if (rawAssignments.length === 0) return;
    const exportData = rawAssignments.map(a => ({
      'Vehicle ID': vehicle.internalVehicleId,
      'Plate Number': vehicle.plateNumber,
      'Status': a.isCurrent ? 'ACTIVE' : 'COMPLETED',
      'Worker ID': a.workerEmployeeId || a.workerId,
      'Driver Name (EN)': a.workerName || '',
      'Driver Name (AR)': a.workerNameAr || '',
      'Job Title': a.workerJobTitle || '',
      'Nationality': a.workerNationality || '',
      'Mobile Phone': a.workerMobile || '',
      'Link Date (From)': a.assignedFrom,
      'Unlink Date (To)': a.assignedTo || 'Currently Active',
      'Duration Days': a.assignedFrom ? Math.max(0, Math.floor(((a.assignedTo ? new Date(a.assignedTo).getTime() : new Date().getTime()) - new Date(a.assignedFrom).getTime()) / (1000 * 60 * 60 * 24))) : '',
      'Assignment Type': a.assignmentType,
      'Start Mileage (KM)': a.startMileage ?? '',
      'End Mileage (KM)': a.endMileage ?? '',
      'Distance Driven (KM)': (a.endMileage && a.startMileage !== undefined) ? (a.endMileage - a.startMileage) : '',
      'Handover Verified': a.handoverChecklistCompleted ? 'YES' : 'NO',
      'Assigned By': a.assignedBy || '',
      'Notes': a.notes || ''
    }));

    exportToCsv(exportData, `Driver_Assignments_${vehicle.internalVehicleId}_${vehicle.plateNumber.replace(/\s+/g, '_')}`);
  };

  // Submit Link New Driver
  const handleSubmitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      setAssignError('Please select an employee/driver to link.');
      return;
    }
    setSubmittingAssign(true);
    setAssignError('');

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/assignments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          assignedFrom: assignStartDate,
          assignmentType,
          startMileage: Number(startMileage) || vehicle.currentMileage || 0,
          notes: assignNotes,
          handoverChecklistCompleted: handoverChecklist
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to link worker to vehicle.');
      }

      setIsAssignModalOpen(false);
      setAssignNotes('');
      if (onRefreshVehicle) onRefreshVehicle();
    } catch (err: any) {
      setAssignError(err.message || 'An error occurred while linking worker.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Submit Unlink Driver
  const handleSubmitUnlink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentToUnlink) return;
    setSubmittingUnlink(true);
    setUnlinkError('');

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/assignments/${targetAssignmentToUnlink.id}/end`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignedTo: unlinkEndDate,
          endMileage: Number(unlinkEndMileage) || vehicle.currentMileage || 0,
          notes: unlinkNotes,
          handoverChecklistCompleted: unlinkHandoverChecked
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to end driver assignment.');
      }

      setIsUnlinkModalOpen(false);
      setTargetAssignmentToUnlink(null);
      setUnlinkNotes('');
      if (onRefreshVehicle) onRefreshVehicle();
    } catch (err: any) {
      setUnlinkError(err.message || 'An error occurred while ending assignment.');
    } finally {
      setSubmittingUnlink(false);
    }
  };

  return (
    <div className="space-y-6" id="vehicle-assignments-container">
      {/* Top Banner & KPI Metrics */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-600/10 text-blue-700 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Driver Assignment History
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
                {rawAssignments.length} {rawAssignments.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              Complete historical record of all fleet captains and drivers linked to {vehicle.internalVehicleId} ({vehicle.plateNumber}), tracking linkage dates, mileage handovers, and assignment tenures.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={rawAssignments.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-colors"
              title="Download Driver History CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {canManageAssignments && (
              <button
                type="button"
                onClick={() => {
                  setStartMileage(vehicle.currentMileage || 0);
                  setAssignStartDate(new Date().toISOString().split('T')[0]);
                  setIsAssignModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Link Driver</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Currently Linked</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
              {activeAssignment ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {activeAssignment.workerName?.split(' ')[0]} {activeAssignment.workerName?.split(' ')[1] || ''}
                </span>
              ) : (
                <span className="text-amber-600 italic text-xs font-semibold">Unassigned Pool</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {activeAssignment ? `Linked since ${formatDate(activeAssignment.assignedFrom)}` : 'Ready for assignment'}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Past Driver Links</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {totalCompletedAssignments} {totalCompletedAssignments === 1 ? 'Driver' : 'Drivers'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Historical handovers</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Total Days In Service</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {totalDaysAssigned.toLocaleString()} Days
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cumulative tenure</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Current Odometer</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {(vehicle.currentMileage || 0).toLocaleString()} KM
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Fleet logged distance</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver by name, employee ID, Iqama, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({rawAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                filterStatus === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({rawAssignments.filter(a => a.isCurrent).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PAST')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                filterStatus === 'PAST'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past ({rawAssignments.filter(a => !a.isCurrent).length})
            </button>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Type:
            </span>
            {['ALL', 'PRIMARY', 'TEMPORARY', 'RELIEF', 'MAINTENANCE_RELOCATION'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === t
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC'))}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 py-1 px-2 rounded hover:bg-slate-100"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'DESC' ? 'Newest Link First' : 'Oldest Link First'}</span>
          </button>
        </div>
      </div>

      {/* Driver Assignments List View */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-900">No driver assignment records found</h4>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || filterStatus !== 'ALL' || filterType !== 'ALL'
              ? 'No driver assignments match your selected search filter criteria.'
              : 'There are currently no driver assignment records logged for this vehicle.'}
          </p>
          {canManageAssignments && (
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Link First Driver</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAssignments.map((assignment, idx) => {
            const isCurrentlyActive = assignment.isCurrent;
            const durationLabel = calculateDuration(assignment.assignedFrom, assignment.assignedTo);
            const kmDriven =
              assignment.endMileage && assignment.startMileage !== undefined
                ? assignment.endMileage - assignment.startMileage
                : null;

            return (
              <div
                key={assignment.id || idx}
                className={`relative bg-white border rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-md ${
                  isCurrentlyActive
                    ? 'border-emerald-300 ring-1 ring-emerald-500/20 bg-gradient-to-r from-emerald-50/20 via-white to-white'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Active Driver Badge ribbon / status tag */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {isCurrentlyActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Currently Active Driver
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        Completed Assignment
                      </span>
                    )}

                    {/* Assignment Type badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                        assignment.assignmentType === 'PRIMARY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : assignment.assignmentType === 'TEMPORARY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : assignment.assignmentType === 'RELIEF'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {assignment.assignmentType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Dates linked prominent display (Prompt core requirement) */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Linked: {formatDate(assignment.assignedFrom)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>
                      {assignment.assignedTo ? (
                        formatDate(assignment.assignedTo)
                      ) : (
                        <span className="text-emerald-700 font-bold">Present (Active)</span>
                      )}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {durationLabel}
                    </span>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Left: Driver Identity Card */}
                  <div className="lg:col-span-6 flex items-start gap-3.5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {assignment.workerPhotoUrl ? (
                        <img
                          src={assignment.workerPhotoUrl}
                          alt={assignment.workerName}
                          referrerPolicy="no-referrer"
                          className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs border-2 border-white">
                          {assignment.workerName ? assignment.workerName.substring(0, 2).toUpperCase() : 'DR'}
                        </div>
                      )}
                      {isCurrentlyActive && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"
                          title="Active driver"
                        />
                      )}
                    </div>

                    {/* Identity Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 tracking-tight">
                          {assignment.workerName || 'Fleet Driver'}
                        </h4>
                        {assignment.workerNameAr && (
                          <span className="text-xs text-slate-500 font-medium font-arabic" dir="rtl">
                            {assignment.workerNameAr}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-600">
                        {assignment.workerEmployeeId && (
                          <span className="font-mono font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                            {assignment.workerEmployeeId}
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="font-medium text-slate-700">{assignment.workerJobTitle || 'Driver'}</span>
                        {assignment.workerNationality && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{assignment.workerNationality}</span>
                          </>
                        )}
                      </div>

                      {/* Contact & Profile links */}
                      <div className="flex items-center gap-3 mt-2.5 text-xs">
                        {assignment.workerMobile && (
                          <a
                            href={`tel:${assignment.workerMobile}`}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{assignment.workerMobile}</span>
                          </a>
                        )}

                        {assignment.workerId && onOpenWorker && (
                          <button
                            type="button"
                            onClick={() => onOpenWorker(assignment.workerId)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                          >
                            <span>Worker Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Mileage & Handover details */}
                  <div className="lg:col-span-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" /> Start Mileage:
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {(assignment.startMileage || 0).toLocaleString()} KM
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" /> Return Mileage:
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {assignment.endMileage !== null && assignment.endMileage !== undefined
                          ? `${assignment.endMileage.toLocaleString()} KM`
                          : isCurrentlyActive
                          ? 'Active in Transit'
                          : '--'}
                      </span>
                    </div>

                    {kmDriven !== null && kmDriven >= 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-700">
                        <span className="font-medium text-slate-500">Distance Driven:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          +{kmDriven.toLocaleString()} KM
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 pt-1 text-[11px] text-slate-500">
                      <ShieldCheck
                        className={`w-3.5 h-3.5 ${
                          assignment.handoverChecklistCompleted ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <span>
                        {assignment.handoverChecklistCompleted
                          ? 'Handover Checklist Verified'
                          : 'Standard Handover'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Notes, Assigned By, and Management Action */}
                  <div className="lg:col-span-3 flex flex-col justify-between h-full space-y-2">
                    <div className="space-y-1">
                      {assignment.assignedBy && (
                        <div className="text-[11px] text-slate-500 font-medium">
                          Assigned by <span className="text-slate-700 font-semibold">{assignment.assignedBy}</span>
                        </div>
                      )}

                      {assignment.notes && (
                        <p className="text-xs text-slate-600 italic line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                          "{assignment.notes}"
                        </p>
                      )}
                    </div>

                    {/* Unlink Action for currently active driver */}
                    {isCurrentlyActive && canManageAssignments && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetAssignmentToUnlink(assignment);
                            setUnlinkEndDate(new Date().toISOString().split('T')[0]);
                            setUnlinkEndMileage(vehicle.currentMileage || assignment.startMileage || 0);
                            setIsUnlinkModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-600" />
                          <span>End / Unlink Driver</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Link / Assign Driver Modal */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsAssignModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Link Driver to Vehicle</h3>
                  <p className="text-xs text-slate-500">
                    {vehicle.internalVehicleId} • Plate: {vehicle.plateNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Warning if vehicle currently has an active driver */}
              {activeAssignment && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Active Driver Replacement:</span> This vehicle is currently assigned to{' '}
                    <span className="font-semibold">{activeAssignment.workerName}</span>. Linking a new worker will automatically conclude the active assignment as of the link date.
                  </div>
                </div>
              )}

              {/* Driver / Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Fleet Employee / Driver <span className="text-rose-500">*</span>
                </label>
                {loadingWorkers ? (
                  <div className="text-xs text-slate-500 py-2">Loading active workforce...</div>
                ) : (
                  <select
                    value={selectedWorkerId}
                    onChange={e => setSelectedWorkerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Employee --</option>
                    {availableWorkers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.employeeId}) - {w.jobTitle} {w.assignedVehicleId ? '• [Already has vehicle]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Link Date & Assignment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Date (From) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={e => setAssignStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Type</label>
                  <select
                    value={assignmentType}
                    onChange={e => setAssignmentType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PRIMARY">Primary Captain</option>
                    <option value="TEMPORARY">Temporary Assignment</option>
                    <option value="RELIEF">Relief Driver</option>
                    <option value="MAINTENANCE_RELOCATION">Relocation / Workshop</option>
                  </select>
                </div>
              </div>

              {/* Start Mileage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Odometer at Handover (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={startMileage}
                    onChange={e => setStartMileage(e.target.value)}
                    min={0}
                    className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                    KM
                  </span>
                </div>
              </div>

              {/* Handover Checklist Verification Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={handoverChecklist}
                  onChange={e => setHandoverChecklist(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Vehicle Handover Protocol Verified</span>
                  <p className="text-slate-500 text-[11px]">
                    Physical exterior walkaround, keys handed over, registration card and fuel card accounted for.
                  </p>
                </div>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational & Route Notes (Optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Assigned to North Riyadh delivery corridor. Certified for hazardous materials."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !selectedWorkerId}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submittingAssign ? 'Linking Worker...' : 'Confirm Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: End / Unlink Driver Modal */}
      {isUnlinkModalOpen && targetAssignmentToUnlink && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsUnlinkModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-600 text-white rounded-lg shadow-xs">
                  <UserX className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">End Driver Assignment</h3>
                  <p className="text-xs text-slate-500">
                    Unlink {targetAssignmentToUnlink.workerName} from {vehicle.internalVehicleId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnlinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUnlink} className="p-5 space-y-4">
              {unlinkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{unlinkError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                You are closing the active driver assignment for{' '}
                <span className="font-bold text-slate-900">{targetAssignmentToUnlink.workerName}</span>. This will record the return date, final odometer reading, and release both the vehicle and driver back to the unassigned pool.
              </p>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unlink / Return Date (To) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={unlinkEndDate}
                  onChange={e => setUnlinkEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Return Mileage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Final Odometer at Return (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={unlinkEndMileage}
                    onChange={e => setUnlinkEndMileage(e.target.value)}
                    min={targetAssignmentToUnlink.startMileage || 0}
                    className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                    KM
                  </span>
                </div>
                {targetAssignmentToUnlink.startMileage !== undefined && Number(unlinkEndMileage) >= targetAssignmentToUnlink.startMileage && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    Logged tenure distance: +{(Number(unlinkEndMileage) - targetAssignmentToUnlink.startMileage).toLocaleString()} KM
                  </div>
                )}
              </div>

              {/* Handover inspection checkbox */}
              <label className="flex items-start gap-2 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={unlinkHandoverChecked}
                  onChange={e => setUnlinkHandoverChecked(e.target.checked)}
                  className="rounded text-rose-600 mt-0.5 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Return Inspection Completed</span>
                  <p className="text-slate-500 text-[11px]">
                    Vehicle received in good order, fuel tank level checked, key and fuel card returned.
                  </p>
                </div>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Notes & Handover Condition (Optional)
                </label>
                <textarea
                  value={unlinkNotes}
                  onChange={e => setUnlinkNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Vehicle returned in clean condition. Transferred to long-haul division."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUnlinkModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUnlink}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {submittingUnlink ? 'Ending Assignment...' : 'Confirm Unlink'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
