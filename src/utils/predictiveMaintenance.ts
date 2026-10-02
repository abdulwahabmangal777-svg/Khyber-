/**
 * Predictive Maintenance Heuristic Algorithm Engine
 * 
 * Computes estimated upcoming service dates and wear scores for fleet vehicles
 * based on real-time odometers, historical maintenance logs, and fuel consumption trends.
 */

export interface MaintenanceServiceTrack {
  id: string;
  name: string;
  nameAr: string;
  maintenanceType: 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'BRAKE_SERVICE' | 'PERIODIC_SERVICE';
  intervalKm: number;
  intervalDays: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  priorityWeight: number; // 1 to 5
}

export const STANDARD_SERVICE_TRACKS: MaintenanceServiceTrack[] = [
  {
    id: 'track-oil',
    name: 'Engine Oil & Filter Service',
    nameAr: 'تغيير زيت المحرك والفلاتر',
    maintenanceType: 'OIL_CHANGE',
    intervalKm: 10000,
    intervalDays: 90, // 3 months max under Saudi climate
    estimatedCostMin: 280,
    estimatedCostMax: 650,
    priorityWeight: 4
  },
  {
    id: 'track-tires',
    name: 'Tire Rotation & Dynamic Balancing',
    nameAr: 'تدوير الإطارات والترصيص وميزان الأذرعة',
    maintenanceType: 'TIRE_REPLACEMENT',
    intervalKm: 20000,
    intervalDays: 180,
    estimatedCostMin: 350,
    estimatedCostMax: 1200,
    priorityWeight: 3
  },
  {
    id: 'track-brakes',
    name: 'Brake Pads & Disc Inspection',
    nameAr: 'فحص واستبدال فحمات وأقراص الفرامل',
    maintenanceType: 'BRAKE_SERVICE',
    intervalKm: 30000,
    intervalDays: 240,
    estimatedCostMin: 500,
    estimatedCostMax: 1500,
    priorityWeight: 5
  },
  {
    id: 'track-periodic',
    name: 'Major Comprehensive Periodic Service',
    nameAr: 'الصيانة الدورية الشاملة وسوائل النقل',
    maintenanceType: 'PERIODIC_SERVICE',
    intervalKm: 40000,
    intervalDays: 365,
    estimatedCostMin: 1800,
    estimatedCostMax: 4500,
    priorityWeight: 4
  }
];

export interface PredictiveServiceSuggestion {
  trackId: string;
  trackName: string;
  trackNameAr: string;
  maintenanceType: 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'BRAKE_SERVICE' | 'PERIODIC_SERVICE';
  lastServiceDate: string | null;
  lastServiceMileage: number;
  currentMileage: number;
  mileageSinceLastService: number;
  intervalKm: number;
  remainingKm: number;
  dailyMileageRate: number; // KM/day
  estimatedDaysToService: number;
  suggestedDate: string;
  limitingFactor: 'MILEAGE_LIMIT' | 'TIME_LIMIT' | 'OVERDUE';
  wearPercentage: number; // 0% - 100%+
  urgency: 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'HEALTHY';
  reasonText: string;
  reasonTextAr: string;
  estimatedCost: number;
}

export interface VehiclePredictiveProfile {
  vehicleId: string;
  internalVehicleId: string;
  plateNumber: string;
  plateDigitsAr?: string;
  plateLettersAr?: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  currentMileage: number;
  currentLocation: string;
  status: string;
  assignedDriverName?: string;
  calculatedDailyRate: number; // km/day
  rateConfidence: 'HIGH' | 'MEDIUM' | 'ESTIMATED';
  overallHealthScore: number; // 0 to 100
  urgencyStatus: 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'HEALTHY';
  nearestServiceTrack: PredictiveServiceSuggestion;
  allSuggestions: PredictiveServiceSuggestion[];
  historicalServiceCount: number;
  lastServiceSummary?: {
    date: string;
    type: string;
    mileage: number;
    workshop: string;
  };
}

export interface FleetPredictiveSummary {
  totalVehiclesAnalyzed: number;
  criticalCount: number;
  warningCount: number;
  upcomingCount: number;
  healthyCount: number;
  fleetAvgDailyKm: number;
  fleetAvgHealthScore: number;
  totalEstimatedMaintenanceBudgetSar: number;
  overdueKmTotal: number;
  vehicles: VehiclePredictiveProfile[];
}

/**
 * Baseline fallback mileage rates by Saudi commercial vehicle category
 */
export function getBaselineDailyMileage(vehicleType: string = ''): number {
  const t = vehicleType.toLowerCase();
  if (t.includes('heavy') || t.includes('truck') || t.includes('trailer') || t.includes('actros')) {
    return 185; // Long haul Saudi intercity
  }
  if (t.includes('van') || t.includes('staria') || t.includes('hiace') || t.includes('delivery')) {
    return 130; // City courier / parcel routes
  }
  if (t.includes('pickup') || t.includes('hilux') || t.includes('d-max')) {
    return 80; // Field operations & logistics
  }
  if (t.includes('bus') || t.includes('coaster')) {
    return 110; // Workforce commute
  }
  if (t.includes('suv') || t.includes('prado') || t.includes('land cruiser')) {
    return 55; // Management / site inspections
  }
  return 50; // Standard municipal default
}

/**
 * Calculates empirical daily mileage rate using historical records
 */
export function calculateEmpiricalDailyRate(
  vehicle: { currentMileage: number; purchaseDate?: string; vehicleType?: string },
  historicalLogs: Array<{ date: string; mileage: number }>
): { rate: number; confidence: 'HIGH' | 'MEDIUM' | 'ESTIMATED' } {
  const baseline = getBaselineDailyMileage(vehicle.vehicleType);

  // Filter valid logs with mileage > 0
  const sorted = [...historicalLogs]
    .filter(log => log && log.mileage && log.date && !isNaN(log.mileage))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length >= 2) {
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];

    const dOld = new Date(oldest.date).getTime();
    const dNew = new Date(newest.date).getTime();
    const daysDiff = Math.max(1, Math.round((dNew - dOld) / (1000 * 60 * 60 * 24)));
    const mileageDiff = newest.mileage - oldest.mileage;

    if (daysDiff >= 5 && mileageDiff > 0) {
      const measuredRate = mileageDiff / daysDiff;
      // Filter out impossible outliers (e.g. odometer reset or odometer typos)
      if (measuredRate >= 10 && measuredRate <= 800) {
        // Blend empirical with baseline
        const blended = Math.round(measuredRate * 0.85 + baseline * 0.15);
        return { rate: blended, confidence: sorted.length >= 4 ? 'HIGH' : 'MEDIUM' };
      }
    }
  }

  // If we only have 1 log and currentMileage
  if (sorted.length === 1) {
    const log = sorted[0];
    const daysDiff = Math.max(1, Math.round((Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24)));
    const mileageDiff = vehicle.currentMileage - log.mileage;
    if (daysDiff >= 3 && mileageDiff > 0) {
      const measuredRate = mileageDiff / daysDiff;
      if (measuredRate >= 10 && measuredRate <= 800) {
        const blended = Math.round(measuredRate * 0.7 + baseline * 0.3);
        return { rate: blended, confidence: 'MEDIUM' };
      }
    }
  }

  return { rate: baseline, confidence: 'ESTIMATED' };
}

/**
 * Analyzes a single vehicle against all service tracks to generate predictions
 */
export function analyzeVehicleMaintenance(
  vehicle: any,
  maintenanceRecords: any[] = [],
  fuelRecords: any[] = []
): VehiclePredictiveProfile {
  // Combine all mileage-dated logs for rate calculation
  const mileageLogs: Array<{ date: string; mileage: number }> = [];

  const vehicleMaint = maintenanceRecords.filter(m => m.vehicleId === vehicle.id);
  vehicleMaint.forEach(m => {
    if (m.date && m.mileage) mileageLogs.push({ date: m.date, mileage: m.mileage });
  });

  const vehicleFuel = fuelRecords.filter(f => f.vehicleId === vehicle.id);
  vehicleFuel.forEach(f => {
    if (f.date && f.mileage) mileageLogs.push({ date: f.date, mileage: f.mileage });
  });

  // Current mileage reference
  const currentMileage = Math.max(
    vehicle.currentMileage || 0,
    ...mileageLogs.map(l => l.mileage || 0)
  );

  const { rate: dailyRate, confidence } = calculateEmpiricalDailyRate(
    { currentMileage, purchaseDate: vehicle.purchaseDate, vehicleType: vehicle.vehicleType },
    mileageLogs
  );

  const now = new Date();
  const suggestions: PredictiveServiceSuggestion[] = [];

  // Evaluate each service track
  for (const track of STANDARD_SERVICE_TRACKS) {
    // Find matching logs for this track
    const trackLogs = vehicleMaint
      .filter(m => m.maintenanceType === track.maintenanceType || m.maintenanceType === 'PERIODIC_SERVICE')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastLog = trackLogs[0] || null;

    let lastMileage = 0;
    let lastDate: string | null = null;
    let targetMileage = 0;
    let targetDateCalendar: Date | null = null;

    if (lastLog) {
      lastMileage = lastLog.mileage || 0;
      lastDate = lastLog.date;

      if (lastLog.nextMaintenanceMileage && lastLog.nextMaintenanceMileage > lastMileage) {
        targetMileage = lastLog.nextMaintenanceMileage;
      } else {
        targetMileage = lastMileage + track.intervalKm;
      }

      if (lastLog.nextMaintenanceDate) {
        targetDateCalendar = new Date(lastLog.nextMaintenanceDate);
      } else {
        targetDateCalendar = new Date(new Date(lastLog.date).getTime() + track.intervalDays * 24 * 60 * 60 * 1000);
      }
    } else {
      // No historical log: estimate based on current odometer relative to cycle
      lastMileage = Math.max(0, Math.floor(currentMileage / track.intervalKm) * track.intervalKm);
      targetMileage = lastMileage + track.intervalKm;
      targetDateCalendar = new Date(now.getTime() + Math.round(track.intervalDays * 0.6) * 24 * 60 * 60 * 1000);
    }

    const mileageSinceLast = Math.max(0, currentMileage - lastMileage);
    const remainingKm = targetMileage - currentMileage;

    // Days remaining by mileage
    let daysByMileage = 0;
    if (remainingKm <= 0) {
      daysByMileage = 0; // Overdue
    } else {
      daysByMileage = Math.max(1, Math.round(remainingKm / dailyRate));
    }

    // Days remaining by calendar limit
    let daysByCalendar = 999;
    if (targetDateCalendar && !isNaN(targetDateCalendar.getTime())) {
      daysByCalendar = Math.round((targetDateCalendar.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    let limitingFactor: 'MILEAGE_LIMIT' | 'TIME_LIMIT' | 'OVERDUE' = 'MILEAGE_LIMIT';
    let estimatedDays = daysByMileage;

    if (remainingKm <= 0) {
      limitingFactor = 'OVERDUE';
      estimatedDays = 0;
    } else if (daysByCalendar < daysByMileage) {
      limitingFactor = 'TIME_LIMIT';
      estimatedDays = Math.max(0, daysByCalendar);
    } else {
      limitingFactor = 'MILEAGE_LIMIT';
      estimatedDays = daysByMileage;
    }

    // Compute suggested service date
    const suggestedServiceDate = new Date(now.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
    const suggestedDateStr = suggestedServiceDate.toISOString().split('T')[0];

    // Wear percentage (0% to 100%+)
    const wearPercentage = Math.round(Math.min(150, Math.max(0, (mileageSinceLast / track.intervalKm) * 100)));

    // Determine Urgency
    let urgency: 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'HEALTHY' = 'HEALTHY';
    if (remainingKm <= 0 || estimatedDays <= 3) {
      urgency = 'CRITICAL';
    } else if (remainingKm <= 1200 || estimatedDays <= 14) {
      urgency = 'WARNING';
    } else if (remainingKm <= 3500 || estimatedDays <= 35) {
      urgency = 'UPCOMING';
    } else {
      urgency = 'HEALTHY';
    }

    // Build heuristic reason string
    let reasonText = '';
    let reasonTextAr = '';

    if (limitingFactor === 'OVERDUE') {
      const overKm = Math.abs(remainingKm);
      reasonText = `Service threshold exceeded by ${overKm.toLocaleString()} KM. Immediate workshop scheduling required.`;
      reasonTextAr = `تم تجاوز حد الصيانة بمقدار ${overKm.toLocaleString()} كم. يلزم حجز موعد فوري بالورشة.`;
    } else if (limitingFactor === 'TIME_LIMIT') {
      reasonText = `Calendar age limit reached (${track.intervalDays} days max). Service due in ~${estimatedDays} days.`;
      reasonTextAr = `تم بلوغ الحد الزمني الموصى به (${track.intervalDays} يوم). الموعد المقترح بعد ~${estimatedDays} يوم.`;
    } else {
      reasonText = `Based on daily usage of ~${dailyRate} KM/day, the ${track.intervalKm.toLocaleString()} KM cycle will be reached in ${estimatedDays} days (${remainingKm.toLocaleString()} KM remaining).`;
      reasonTextAr = `بناءً على معدل تشغيل ~${dailyRate} كم/يوم، سيتم الوصول لحد ${track.intervalKm.toLocaleString()} كم خلال ${estimatedDays} يوم (متبقي ${remainingKm.toLocaleString()} كم).`;
    }

    const estimatedCost = Math.round((track.estimatedCostMin + track.estimatedCostMax) / 2);

    suggestions.push({
      trackId: track.id,
      trackName: track.name,
      trackNameAr: track.nameAr,
      maintenanceType: track.maintenanceType,
      lastServiceDate: lastDate,
      lastServiceMileage: lastMileage,
      currentMileage,
      mileageSinceLastService: mileageSinceLast,
      intervalKm: track.intervalKm,
      remainingKm,
      dailyMileageRate: dailyRate,
      estimatedDaysToService: estimatedDays,
      suggestedDate: suggestedDateStr,
      limitingFactor,
      wearPercentage,
      urgency,
      reasonText,
      reasonTextAr,
      estimatedCost
    });
  }

  // Sort suggestions by urgency and estimatedDays (most urgent first)
  const urgencyWeight: Record<string, number> = { CRITICAL: 0, WARNING: 1, UPCOMING: 2, HEALTHY: 3 };
  suggestions.sort((a, b) => {
    const diff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    if (diff !== 0) return diff;
    return a.estimatedDaysToService - b.estimatedDaysToService;
  });

  const nearest = suggestions[0];

  // Overall Health Score (100 - weighted average wear percentage)
  const avgWear = suggestions.reduce((sum, s) => sum + s.wearPercentage, 0) / suggestions.length;
  const overallHealthScore = Math.max(0, Math.min(100, Math.round(100 - avgWear * 0.8)));

  let lastServiceSummary: VehiclePredictiveProfile['lastServiceSummary'] = undefined;
  if (vehicleMaint.length > 0) {
    const sortedAll = [...vehicleMaint].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const m0 = sortedAll[0];
    lastServiceSummary = {
      date: m0.date,
      type: m0.maintenanceType,
      mileage: m0.mileage || 0,
      workshop: m0.workshop || 'Authorized Workshop'
    };
  }

  return {
    vehicleId: vehicle.id,
    internalVehicleId: vehicle.internalVehicleId || `FLT-${vehicle.id.slice(-3)}`,
    plateNumber: vehicle.plateNumber || 'Unknown',
    plateDigitsAr: vehicle.plateDigitsAr,
    plateLettersAr: vehicle.plateLettersAr,
    make: vehicle.make || 'Toyota',
    model: vehicle.model || 'Commercial',
    year: vehicle.year || 2023,
    vehicleType: vehicle.vehicleType || 'Sedan',
    currentMileage,
    currentLocation: vehicle.currentLocation || 'Riyadh Central Hub',
    status: vehicle.status || 'ACTIVE',
    assignedDriverName: vehicle.driver?.fullName || vehicle.assignedWorkerName,
    calculatedDailyRate: dailyRate,
    rateConfidence: confidence,
    overallHealthScore,
    urgencyStatus: nearest.urgency,
    nearestServiceTrack: nearest,
    allSuggestions: suggestions,
    historicalServiceCount: vehicleMaint.length,
    lastServiceSummary
  };
}

/**
 * Analyzes an entire fleet of vehicles and returns summary & profiles
 */
export function analyzeFleetPredictiveMaintenance(
  vehicles: any[] = [],
  maintenanceRecords: any[] = [],
  fuelRecords: any[] = []
): FleetPredictiveSummary {
  const profiles: VehiclePredictiveProfile[] = vehicles.map(v =>
    analyzeVehicleMaintenance(v, maintenanceRecords, fuelRecords)
  );

  // Sort: Critical first, then Warning, then Upcoming, then Healthy
  const urgencyWeight: Record<string, number> = { CRITICAL: 0, WARNING: 1, UPCOMING: 2, HEALTHY: 3 };
  profiles.sort((a, b) => {
    const diff = urgencyWeight[a.urgencyStatus] - urgencyWeight[b.urgencyStatus];
    if (diff !== 0) return diff;
    return a.nearestServiceTrack.estimatedDaysToService - b.nearestServiceTrack.estimatedDaysToService;
  });

  const criticalCount = profiles.filter(p => p.urgencyStatus === 'CRITICAL').length;
  const warningCount = profiles.filter(p => p.urgencyStatus === 'WARNING').length;
  const upcomingCount = profiles.filter(p => p.urgencyStatus === 'UPCOMING').length;
  const healthyCount = profiles.filter(p => p.urgencyStatus === 'HEALTHY').length;

  const totalDaily = profiles.reduce((sum, p) => sum + p.calculatedDailyRate, 0);
  const fleetAvgDailyKm = profiles.length > 0 ? Math.round(totalDaily / profiles.length) : 80;

  const totalHealth = profiles.reduce((sum, p) => sum + p.overallHealthScore, 0);
  const fleetAvgHealthScore = profiles.length > 0 ? Math.round(totalHealth / profiles.length) : 85;

  const totalEstimatedMaintenanceBudgetSar = profiles
    .filter(p => p.urgencyStatus === 'CRITICAL' || p.urgencyStatus === 'WARNING')
    .reduce((sum, p) => sum + p.nearestServiceTrack.estimatedCost, 0);

  const overdueKmTotal = profiles.reduce((sum, p) => {
    const rem = p.nearestServiceTrack.remainingKm;
    return rem < 0 ? sum + Math.abs(rem) : sum;
  }, 0);

  return {
    totalVehiclesAnalyzed: profiles.length,
    criticalCount,
    warningCount,
    upcomingCount,
    healthyCount,
    fleetAvgDailyKm,
    fleetAvgHealthScore,
    totalEstimatedMaintenanceBudgetSar,
    overdueKmTotal,
    vehicles: profiles
  };
}
