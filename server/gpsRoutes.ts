import { Router, Request, Response } from 'express';
import {
  getDb,
  saveDatabase,
  createAuditLog,
  Geofence,
  GeofenceAlert
} from './db';
import {
  ingestTelemetryPoint,
  getRoutePlaybackAnalytics,
  stepFleetSimulation,
  isPointInGeofence,
  dispatchGeofenceAlertNotifications,
  generateGeofenceEmailContent,
  TelemetryIngestInput
} from './gpsService';
import { requireAuth, requireRoles, AuthenticatedRequest } from './auth';

const gpsRouter = Router();

// -------------------------------------------------------------
// 0. GOOGLE MAPS CONFIGURATION KEY ENDPOINT
// -------------------------------------------------------------
gpsRouter.get('/config/maps', (req: Request, res: Response) => {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyAaQD83aR4m4jgb3lirlkDeys4A1Q4V_ZY';
  res.json({ apiKey });
});

// -------------------------------------------------------------
// 1. LIVE GPS TELEMETRY INGESTION (DEVICE API)
// -------------------------------------------------------------

/**
 * Ingest real-time telemetry from on-board vehicle GPS trackers or telematics OBD devices.
 * Open or authenticated (supports device token or session auth).
 */
gpsRouter.post('/gps/telemetry', async (req: Request, res: Response) => {
  try {
    const data: TelemetryIngestInput = req.body;

    if (!data.latitude || !data.longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
      return res.status(400).json({ error: 'Coordinates out of range' });
    }

    const result = await ingestTelemetryPoint(data);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Error in /api/gps/telemetry:', err);
    res.status(500).json({ error: err.message || 'Failed to ingest GPS telemetry' });
  }
});

/**
 * Batch ingestion for offline trackers synchronizing buffered logs after reconnecting
 */
gpsRouter.post('/gps/telemetry/batch', async (req: Request, res: Response) => {
  try {
    const { points } = req.body;
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Array of telemetry points is required' });
    }

    let processed = 0;
    let alerts = 0;

    for (const point of points) {
      if (point.latitude && point.longitude) {
        const r = await ingestTelemetryPoint(point);
        processed++;
        alerts += r.alertsGeneratedCount;
      }
    }

    res.json({
      success: true,
      processedCount: processed,
      alertsGeneratedCount: alerts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process batch telemetry' });
  }
});

// -------------------------------------------------------------
// 2. LIVE FLEET LOCATIONS & RADAR
// -------------------------------------------------------------

/**
 * Fast endpoint returning current coordinates, status, speed, heading, and driver for all fleet vehicles
 */
gpsRouter.get('/gps/live', (req: Request, res: Response) => {
  const db = getDb();
  const geofences = (db.geofences || []).filter(g => g.isActive);

  const liveList = db.vehicles.map(v => {
    const lat = v.latitude || 24.7136;
    const lng = v.longitude || 46.6753;
    const speed = v.speedKmh || 0;

    // Classify telemetry status
    let telemetryStatus: 'MOVING' | 'IDLING' | 'PARKED' | 'OFFLINE' = 'PARKED';
    if (v.status === 'INACTIVE' || v.status === 'SOLD') {
      telemetryStatus = 'OFFLINE';
    } else if (speed > 3) {
      telemetryStatus = 'MOVING';
    } else if (speed >= 0 && v.status === 'ACTIVE') {
      telemetryStatus = 'IDLING';
    }

    // Determine which geofences vehicle is currently inside
    const currentGeofences = geofences
      .filter(gf => isPointInGeofence({ lat, lng }, gf))
      .map(gf => ({ id: gf.id, name: gf.name, nameAr: gf.nameAr, zoneType: gf.zoneType, color: gf.color }));

    return {
      vehicleId: v.id,
      internalVehicleId: v.internalVehicleId,
      plateNumber: v.plateNumber,
      plateDigits: v.plateDigits,
      plateLettersEn: v.plateLettersEn,
      vehicleType: v.vehicleType,
      make: v.make,
      model: v.model,
      status: v.status,
      telemetryStatus,
      latitude: lat,
      longitude: lng,
      speedKmh: speed,
      heading: v.heading || 0,
      fuelLevelPercent: v.fuelLevelPercent || 80,
      currentLocation: v.currentLocation,
      currentMileage: v.currentMileage,
      driverName: v.driver?.fullName || null,
      driverMobile: v.driver?.mobileNumber || null,
      departmentId: v.departmentId,
      currentGeofences,
      lastPingTime: v.updatedAt || new Date().toISOString()
    };
  });

  const movingCount = liveList.filter(v => v.telemetryStatus === 'MOVING').length;
  const idlingCount = liveList.filter(v => v.telemetryStatus === 'IDLING').length;
  const parkedCount = liveList.filter(v => v.telemetryStatus === 'PARKED').length;
  const offlineCount = liveList.filter(v => v.telemetryStatus === 'OFFLINE').length;

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      totalVehicles: liveList.length,
      movingCount,
      idlingCount,
      parkedCount,
      offlineCount
    },
    vehicles: liveList
  });
});

// -------------------------------------------------------------
// 3. HISTORICAL GPS LOGS & ROUTE PLAYBACK
// -------------------------------------------------------------

/**
 * Route playback points and analytics for a vehicle
 */
gpsRouter.get('/gps/history/:vehicleId', (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { startDate, endDate, limit } = req.query;

  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const playbackData = getRoutePlaybackAnalytics(vehicleId, {
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? parseInt(limit as string, 10) : 100
  });

  res.json({
    success: true,
    vehicle: {
      id: vehicle.id,
      internalVehicleId: vehicle.internalVehicleId,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      driverName: vehicle.driver?.fullName || null
    },
    ...playbackData
  });
});

/**
 * Telemetry analytics (distance, driving hours, idle hours, fuel burned, top speed)
 */
gpsRouter.get('/gps/analytics/:vehicleId', (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const playbackData = getRoutePlaybackAnalytics(vehicleId);
  res.json({
    success: true,
    analytics: {
      vehicleId,
      distanceKm: playbackData.distanceKm,
      topSpeedKmh: playbackData.topSpeedKmh,
      avgSpeedKmh: playbackData.avgSpeedKmh,
      stopsCount: playbackData.stopsCount,
      movingPointsRatio: playbackData.movingPointsRatio,
      totalBreadcrumbs: playbackData.totalPoints,
      activeAlertsCount: (db.geofenceAlerts || []).filter(a => a.vehicleId === vehicleId && !a.isAcknowledged).length
    }
  });
});

// -------------------------------------------------------------
// 4. FLEET TELEMETRY SIMULATION (LIVE STEPPING)
// -------------------------------------------------------------

/**
 * Simulates real-time truck progression on Saudi highway routes
 */
gpsRouter.post('/gps/simulate-step', (req: Request, res: Response) => {
  const result = stepFleetSimulation();
  res.json({
    success: true,
    message: `Advanced ${result.updatedCount} vehicles along their route coordinates.`,
    ...result
  });
});

// -------------------------------------------------------------
// 5. GEOFENCING CRUD & GEOFENCE-BASED ALERTS
// -------------------------------------------------------------

/**
 * List all geofences with augmented live vehicle counts
 */
gpsRouter.get('/geofences', (req: Request, res: Response) => {
  const db = getDb();
  const list = db.geofences || [];

  // Compute live vehicles inside each geofence
  const enriched = list.map(gf => {
    let vehiclesInside = 0;
    if (gf.isActive) {
      db.vehicles.forEach(v => {
        if (v.latitude && v.longitude) {
          if (isPointInGeofence({ lat: v.latitude, lng: v.longitude }, gf)) {
            vehiclesInside++;
          }
        }
      });
    }

    const recentAlerts = (db.geofenceAlerts || []).filter(a => a.geofenceId === gf.id).length;

    return {
      ...gf,
      activeVehiclesInsideCount: vehiclesInside,
      recentAlertsCount: recentAlerts
    };
  });

  res.json({ success: true, geofences: enriched });
});

/**
 * Create a new geofence (Circle or Polygon)
 */
gpsRouter.post('/geofences', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const {
    name,
    nameAr,
    type = 'CIRCLE',
    center,
    radiusMeters = 1500,
    polygonCoordinates,
    zoneType = 'WAREHOUSE',
    speedLimitKmh,
    color = '#10b981',
    alertOnEnter = true,
    alertOnExit = true,
    alertOnSpeeding = true,
    emailAlertsEnabled = true,
    notificationEmails = ['abdulwahabmangal777@gmail.com'],
    pushAlertsEnabled = true,
    alertSoundEnabled = true,
    highPriorityAlertEnabled = false,
    assignedVehicleIds,
    description,
    descriptionAr
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Geofence name is required' });
  }

  if (type === 'CIRCLE' && (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number')) {
    return res.status(400).json({ error: 'Circle center coordinates (lat, lng) are required' });
  }

  if (type === 'POLYGON' && (!Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3)) {
    return res.status(400).json({ error: 'Polygon requires at least 3 coordinates' });
  }

  const now = new Date().toISOString();
  const parsedEmails = Array.isArray(notificationEmails)
    ? notificationEmails.map((e: string) => e.trim()).filter(Boolean)
    : typeof notificationEmails === 'string'
    ? (notificationEmails as string).split(',').map((e: string) => e.trim()).filter(Boolean)
    : ['abdulwahabmangal777@gmail.com'];

  const newGeofence: Geofence = {
    id: `gf-${Date.now()}`,
    name: name.trim(),
    nameAr: nameAr ? nameAr.trim() : name.trim(),
    type,
    center: center || { lat: 24.7136, lng: 46.6753 },
    radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : 1500,
    polygonCoordinates: type === 'POLYGON' ? polygonCoordinates : undefined,
    zoneType,
    speedLimitKmh: speedLimitKmh ? parseInt(speedLimitKmh, 10) : undefined,
    color,
    alertOnEnter: Boolean(alertOnEnter),
    alertOnExit: Boolean(alertOnExit),
    alertOnSpeeding: Boolean(alertOnSpeeding),
    emailAlertsEnabled: Boolean(emailAlertsEnabled),
    notificationEmails: parsedEmails.length > 0 ? parsedEmails : ['abdulwahabmangal777@gmail.com'],
    pushAlertsEnabled: Boolean(pushAlertsEnabled),
    alertSoundEnabled: Boolean(alertSoundEnabled),
    highPriorityAlertEnabled: Boolean(highPriorityAlertEnabled),
    assignedVehicleIds: Array.isArray(assignedVehicleIds) ? assignedVehicleIds : undefined,
    description,
    descriptionAr,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  db.geofences = db.geofences || [];
  db.geofences.push(newGeofence);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'GEOFENCE',
    newGeofence.id,
    `Created geofence "${newGeofence.name}" (${newGeofence.type}, zone: ${newGeofence.zoneType}, notifications: ${newGeofence.emailAlertsEnabled ? 'Email' : 'Off'})`,
    undefined,
    newGeofence,
    req.ip
  );

  res.status(201).json({ success: true, geofence: newGeofence });
});

/**
 * Trigger immediate test alert notification for a geofence (Email & Push simulation)
 */
gpsRouter.post('/geofences/:id/test-alert', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const gf = (db.geofences || []).find(g => g.id === req.params.id);
  if (!gf) {
    return res.status(404).json({ error: 'Geofence not found' });
  }

  const vehicle = db.vehicles[0] || {
    id: 'veh-demo',
    internalVehicleId: 'FLT-101',
    plateNumber: '7845 XYZ',
    plateDigitsAr: '٧٨٤٥',
    plateLettersAr: 'س ص ع',
    make: 'Mercedes-Benz',
    model: 'Actros 2645',
    driver: { fullName: 'Tariq Al-Ghamdi', mobileNumber: '+966 50 123 4567' }
  };

  const testAlert: GeofenceAlert = {
    id: `gfa-test-${Date.now()}`,
    geofenceId: gf.id,
    geofenceName: gf.name,
    geofenceNameAr: gf.nameAr,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    internalVehicleId: vehicle.internalVehicleId,
    driverName: (vehicle as any).driver?.fullName || 'Assigned Driver',
    eventType: req.body.eventType === 'EXIT' ? 'EXIT' : 'ENTER',
    speedKmh: req.body.speedKmh ? parseFloat(req.body.speedKmh) : 68,
    speedLimitKmh: gf.speedLimitKmh,
    latitude: gf.center?.lat || 24.7136,
    longitude: gf.center?.lng || 46.6753,
    timestamp: new Date().toISOString(),
    isAcknowledged: false
  };

  // Dispatch email and push simulation
  dispatchGeofenceAlertNotifications(testAlert, gf, vehicle as any);

  db.geofenceAlerts = db.geofenceAlerts || [];
  db.geofenceAlerts.unshift(testAlert);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: `notif-test-${Date.now()}`,
    title: `🧪 Test Alert: ${gf.name}`,
    titleAr: `🧪 تنبيه اختباري: ${gf.nameAr || gf.name}`,
    titlePs: `🧪 آزمایښتي خبرتیا: ${gf.name}`,
    message: `Test ${testAlert.eventType} alert for ${vehicle.internalVehicleId}. Email dispatched to ${testAlert.emailSentTo?.join(', ')}.`,
    messageAr: `تنبيه اختباري ${testAlert.eventType} للمركبة ${vehicle.internalVehicleId}. تم إرسال البريد إلى ${testAlert.emailSentTo?.join(', ')}.`,
    messagePs: `آزمایښتي خبرتیا وااستول شوه.`,
    type: 'SYSTEM',
    severity: 'INFO',
    entityType: 'VEHICLE',
    entityId: vehicle.id,
    isRead: false,
    createdAt: testAlert.timestamp
  });

  saveDatabase();

  res.json({
    success: true,
    message: `Test alert dispatched successfully to ${testAlert.emailSentTo?.join(', ')}`,
    alert: testAlert,
    emailPreviewHtml: testAlert.emailPreviewHtml,
    emailSubject: testAlert.emailSubject,
    emailSentTo: testAlert.emailSentTo
  });
});

/**
 * Update geofence
 */
gpsRouter.put('/geofences/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.geofences = db.geofences || [];
  const index = db.geofences.findIndex(g => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Geofence not found' });
  }

  const existing = db.geofences[index];
  const updated: Geofence = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  db.geofences[index] = updated;
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'GEOFENCE',
    updated.id,
    `Updated geofence "${updated.name}"`,
    existing,
    updated,
    req.ip
  );

  res.json({ success: true, geofence: updated });
});

/**
 * Delete geofence
 */
gpsRouter.delete('/geofences/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.geofences = db.geofences || [];
  const existing = db.geofences.find(g => g.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Geofence not found' });
  }

  db.geofences = db.geofences.filter(g => g.id !== req.params.id);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'GEOFENCE',
    existing.id,
    `Deleted geofence "${existing.name}"`,
    existing,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Geofence deleted' });
});

/**
 * List Geofence Alerts
 */
gpsRouter.get('/geofences/alerts', (req: Request, res: Response) => {
  const db = getDb();
  const { vehicleId, geofenceId, eventType, unacknowledgedOnly } = req.query;

  let alerts = db.geofenceAlerts || [];

  if (vehicleId) {
    alerts = alerts.filter(a => a.vehicleId === vehicleId);
  }
  if (geofenceId) {
    alerts = alerts.filter(a => a.geofenceId === geofenceId);
  }
  if (eventType) {
    alerts = alerts.filter(a => a.eventType === eventType);
  }
  if (unacknowledgedOnly === 'true') {
    alerts = alerts.filter(a => !a.isAcknowledged);
  }

  res.json({
    success: true,
    totalCount: alerts.length,
    unacknowledgedCount: alerts.filter(a => !a.isAcknowledged).length,
    alerts
  });
});

/**
 * Acknowledge a geofence alert
 */
gpsRouter.post('/geofences/alerts/:id/ack', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.geofenceAlerts = db.geofenceAlerts || [];
  const alert = db.geofenceAlerts.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.isAcknowledged = true;
  alert.acknowledgedBy = req.user?.fullName || 'Operator';
  alert.acknowledgedAt = new Date().toISOString();

  saveDatabase();
  res.json({ success: true, alert });
});

/**
 * Clear or acknowledge all alerts
 */
gpsRouter.post('/geofences/alerts/ack-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.geofenceAlerts = db.geofenceAlerts || [];
  const now = new Date().toISOString();
  db.geofenceAlerts.forEach(a => {
    a.isAcknowledged = true;
    a.acknowledgedBy = req.user?.fullName || 'Operator';
    a.acknowledgedAt = now;
  });

  saveDatabase();
  res.json({ success: true, message: 'All geofence alerts acknowledged' });
});

export default gpsRouter;
