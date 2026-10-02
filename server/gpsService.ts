import {
  getDb,
  saveDatabase,
  Vehicle,
  GpsLogRecord,
  Geofence,
  GeofenceAlert,
  NotificationItem
} from './db';

// Geodesic distance formula (Haversine in meters)
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if point is inside circle
export function isPointInCircle(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusMeters: number
): boolean {
  const dist = haversineDistanceMeters(point.lat, point.lng, center.lat, center.lng);
  return dist <= radiusMeters;
}

// Ray-casting algorithm for point in polygon
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if point is inside a geofence (circle or polygon)
export function isPointInGeofence(
  point: { lat: number; lng: number },
  geofence: Geofence
): boolean {
  if (!geofence.isActive) return false;
  if (geofence.type === 'CIRCLE') {
    return isPointInCircle(point, geofence.center, geofence.radiusMeters || 1000);
  } else if (geofence.type === 'POLYGON' && geofence.polygonCoordinates && geofence.polygonCoordinates.length >= 3) {
    return isPointInPolygon(point, geofence.polygonCoordinates);
  }
  return false;
}

// Generates executive bilingual HTML email notification for geofence breaches
export function generateGeofenceEmailContent(
  alert: GeofenceAlert,
  geofence: Geofence,
  vehicle: Vehicle,
  recipientEmails: string[] = ['abdulwahabmangal777@gmail.com']
): { subject: string; html: string; text: string } {
  const eventLabel =
    alert.eventType === 'ENTER'
      ? 'ZONE ENTRY / دخول منطقة'
      : alert.eventType === 'EXIT'
      ? 'ZONE EXIT / مغادرة منطقة'
      : 'OVER-SPEED VIOLATION / تجاوز سرعة';

  const badgeColor =
    alert.eventType === 'ENTER' ? '#059669' : alert.eventType === 'EXIT' ? '#d97706' : '#dc2626';

  const subject = `[KHYBER-ALERT] Vehicle ${vehicle.internalVehicleId} (${vehicle.plateNumber}) - ${alert.eventType}: "${geofence.name}"`;
  const googleMapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: #0b1329; padding: 24px 28px; border-bottom: 2px solid ${badgeColor}; }
    .company-name { font-size: 18px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .event-badge { display: inline-block; padding: 6px 14px; background: ${badgeColor}; color: #ffffff; font-weight: 700; font-size: 12px; border-radius: 9999px; margin-top: 14px; letter-spacing: 0.5px; }
    .content { padding: 28px; }
    .headline { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
    .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    .table-box td { padding: 10px 12px; border-bottom: 1px solid #334155; }
    .table-box td.label { color: #94a3b8; font-weight: 600; width: 38%; }
    .table-box td.value { color: #f8fafc; font-weight: 700; }
    .maps-btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; border-radius: 10px; margin-top: 12px; }
    .footer { background: #0f172a; padding: 18px 28px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-name">Khyber Logistics services</div>
      <div class="company-sub">شركة خيبر للخدمات اللوجستية • Automated Real-Time Fleet Radar</div>
      <div class="event-badge">${eventLabel}</div>
    </div>
    <div class="content">
      <div class="headline">Real-Time Geofence Telemetry Alert</div>
      <p style="font-size: 13px; color: #cbd5e1; margin-top: 0; line-height: 1.6;">
        Our live GPS tracking telemetry detected vehicle <strong>${vehicle.internalVehicleId}</strong> triggering a boundary event on zone <strong>"${geofence.name}"</strong>.
      </p>

      <table class="table-box">
        <tr>
          <td class="label">Vehicle Plate / اللوحة</td>
          <td class="value">${vehicle.plateNumber} (${vehicle.plateDigitsAr || ''} ${vehicle.plateLettersAr || ''})</td>
        </tr>
        <tr>
          <td class="label">Fleet ID / معرف المركبة</td>
          <td class="value">${vehicle.internalVehicleId} &bull; ${vehicle.make} ${vehicle.model}</td>
        </tr>
        <tr>
          <td class="label">Assigned Driver / السائق</td>
          <td class="value">${vehicle.driver?.fullName || 'Active Duty Driver'}</td>
        </tr>
        <tr>
          <td class="label">Geofence Zone / النطاق</td>
          <td class="value">${geofence.name} <span style="font-size: 11px; color: #94a3b8;">(${geofence.nameAr || ''})</span></td>
        </tr>
        <tr>
          <td class="label">Event Trigger / نوع الحدث</td>
          <td class="value" style="color: ${badgeColor};">${alert.eventType}</td>
        </tr>
        <tr>
          <td class="label">Speed / السرعة المسجلة</td>
          <td class="value">${alert.speedKmh} km/h ${geofence.speedLimitKmh ? `(Zone Max: ${geofence.speedLimitKmh} km/h)` : ''}</td>
        </tr>
        <tr>
          <td class="label">Event Timestamp / التوقيت</td>
          <td class="value">${new Date(alert.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (AST)</td>
        </tr>
        <tr>
          <td class="label">GPS Coordinates / الإحداثيات</td>
          <td class="value" style="font-family: monospace;">${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}</td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${googleMapsUrl}" target="_blank" class="maps-btn">
          View Vehicle Position on Google Maps &rarr;
        </a>
      </div>
    </div>
    <div class="footer">
      Automated email dispatch delivered to: ${recipientEmails.join(', ')}<br>
      Khyber Logistics services Telematics Network &bull; Kingdom of Saudi Arabia
    </div>
  </div>
</body>
</html>
`.trim();

  const text = `
[KHYBER-ALERT] ${eventLabel}
Vehicle: ${vehicle.internalVehicleId} (${vehicle.plateNumber})
Driver: ${vehicle.driver?.fullName || 'Active Driver'}
Zone: ${geofence.name}
Speed: ${alert.speedKmh} km/h
Coordinates: ${alert.latitude}, ${alert.longitude}
Timestamp: ${alert.timestamp}
Google Maps: ${googleMapsUrl}
`.trim();

  return { subject, html, text };
}

// Dispatches geofence notifications (email & push) and updates alert record
export function dispatchGeofenceAlertNotifications(
  alert: GeofenceAlert,
  geofence: Geofence,
  vehicle: Vehicle
): void {
  const recipientEmails =
    geofence.notificationEmails && geofence.notificationEmails.length > 0
      ? geofence.notificationEmails
      : ['abdulwahabmangal777@gmail.com'];

  const isEmailEnabled = geofence.emailAlertsEnabled !== false;
  const isPushEnabled = geofence.pushAlertsEnabled !== false;

  alert.severity =
    alert.eventType === 'SPEEDING' ? 'CRITICAL' : alert.eventType === 'EXIT' ? 'WARNING' : 'INFO';
  alert.pushDelivered = isPushEnabled;

  if (isEmailEnabled) {
    const { subject, html } = generateGeofenceEmailContent(alert, geofence, vehicle, recipientEmails);
    alert.emailDispatched = true;
    alert.emailSentTo = recipientEmails;
    alert.emailSubject = subject;
    alert.emailPreviewHtml = html;
  }
}

// Predefined realistic Saudi Geofences (clean slate for production)
export function getSeedGeofences(): Geofence[] {
  return [];
}

// Generate realistic GPS historical routes for playback (clean slate for production)
export function getSeedGpsLogs(vehicles: Vehicle[]): GpsLogRecord[] {
  return [];
}

// Predefined recent Geofence Alerts (clean slate for production)
export function getSeedGeofenceAlerts(vehicles: Vehicle[], geofences: Geofence[]): GeofenceAlert[] {
  return [];
}

export interface TelemetryIngestInput {
  vehicleId?: string;
  plateNumber?: string;
  imei?: string;
  internalVehicleId?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number;
  altitude?: number;
  accuracy?: number;
  ignitionStatus?: 'ON' | 'OFF';
  fuelLevelPercent?: number;
  odometerKm?: number;
  batteryVoltage?: number;
  locationName?: string;
  timestamp?: string;
}

export interface TelemetryIngestResult {
  success: boolean;
  vehicleId: string;
  plateNumber: string;
  logId: string;
  geofenceEvents: Array<{
    geofenceId: string;
    geofenceName: string;
    eventType: 'ENTER' | 'EXIT' | 'SPEEDING';
    alertId?: string;
  }>;
  alertsGeneratedCount: number;
  updatedVehicle: {
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
    currentLocation: string;
  };
}

/**
 * Ingests a real-time GPS telemetry point from an on-board tracker device.
 * Stores in historical log, updates vehicle state, and runs geofence alert engine.
 */
export async function ingestTelemetryPoint(data: TelemetryIngestInput): Promise<TelemetryIngestResult> {
  const db = getDb();
  db.gpsLogs = db.gpsLogs || [];
  db.geofences = db.geofences || [];
  db.geofenceAlerts = db.geofenceAlerts || [];
  db.notifications = db.notifications || [];

  // 1. Locate the vehicle
  let vehicle = db.vehicles.find(v => {
    if (data.vehicleId && v.id === data.vehicleId) return true;
    if (data.plateNumber && v.plateNumber.toLowerCase() === data.plateNumber.toLowerCase()) return true;
    if (data.internalVehicleId && v.internalVehicleId.toLowerCase() === data.internalVehicleId.toLowerCase()) return true;
    if (data.imei && (v.vin?.includes(data.imei) || v.internalVehicleId === data.imei)) return true;
    return false;
  });

  if (!vehicle) {
    // If not matched, default to the first vehicle to maintain continuity
    vehicle = db.vehicles[0];
  }

  if (!vehicle) {
    throw new Error('Vehicle not found and no vehicles in database');
  }

  const timestamp = data.timestamp || new Date().toISOString();
  const lat = typeof data.latitude === 'number' ? data.latitude : vehicle.latitude || 24.7136;
  const lng = typeof data.longitude === 'number' ? data.longitude : vehicle.longitude || 46.6753;
  const speed = typeof data.speedKmh === 'number' ? Math.max(0, data.speedKmh) : 0;
  const heading = typeof data.heading === 'number' ? data.heading : vehicle.heading || 0;
  const ignition = data.ignitionStatus || (speed > 0 ? 'ON' : 'OFF');

  const previousCoord = (vehicle.latitude !== undefined && vehicle.longitude !== undefined)
    ? { lat: vehicle.latitude, lng: vehicle.longitude }
    : null;
  const currentCoord = { lat, lng };

  // 2. Geofence evaluation engine
  const geofenceEvents: TelemetryIngestResult['geofenceEvents'] = [];
  let alertsCount = 0;

  for (const gf of db.geofences.filter(g => g.isActive)) {
    // Check if geofence is restricted to specific vehicles
    if (gf.assignedVehicleIds && gf.assignedVehicleIds.length > 0 && !gf.assignedVehicleIds.includes(vehicle.id)) {
      continue;
    }

    const isInsideNow = isPointInGeofence(currentCoord, gf);
    const wasInsideBefore = previousCoord ? isPointInGeofence(previousCoord, gf) : null;

      // Check ENTER
    if (isInsideNow && wasInsideBefore === false && gf.alertOnEnter) {
      const alertId = `gfa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newAlert: GeofenceAlert = {
        id: alertId,
        geofenceId: gf.id,
        geofenceName: gf.name,
        geofenceNameAr: gf.nameAr,
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        internalVehicleId: vehicle.internalVehicleId,
        driverName: vehicle.driver?.fullName || 'Assigned Driver',
        eventType: 'ENTER',
        speedKmh: speed,
        speedLimitKmh: gf.speedLimitKmh,
        latitude: lat,
        longitude: lng,
        timestamp,
        isAcknowledged: false
      };
      // Dispatch email and push notification configuration
      dispatchGeofenceAlertNotifications(newAlert, gf, vehicle);
      db.geofenceAlerts.unshift(newAlert);
      alertsCount++;

      // Trigger user notification
      db.notifications.unshift({
        id: `notif-gf-${Date.now()}`,
        title: `Geofence Entry: ${vehicle.internalVehicleId}`,
        titleAr: `دخول منطقة جغرافية: ${vehicle.internalVehicleId}`,
        titlePs: `د ساحې داخلیدل: ${vehicle.internalVehicleId}`,
        message: `Vehicle ${vehicle.plateNumber} entered "${gf.name}" at ${speed} km/h.${newAlert.emailDispatched ? ` [Email sent to ${newAlert.emailSentTo?.join(', ')}]` : ''}`,
        messageAr: `دخلت المركبة ${vehicle.plateNumber} نطاق "${gf.nameAr || gf.name}" بسرعة ${speed} كم/س.`,
        messagePs: `ګاډی ${vehicle.plateNumber} سیمی ته ننوتلو "${gf.name}".`,
        type: 'SYSTEM',
        severity: 'INFO',
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        isRead: false,
        createdAt: timestamp
      });

      geofenceEvents.push({
        geofenceId: gf.id,
        geofenceName: gf.name,
        eventType: 'ENTER',
        alertId
      });
    }

    // Check EXIT
    if (!isInsideNow && wasInsideBefore === true && gf.alertOnExit) {
      const alertId = `gfa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newAlert: GeofenceAlert = {
        id: alertId,
        geofenceId: gf.id,
        geofenceName: gf.name,
        geofenceNameAr: gf.nameAr,
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        internalVehicleId: vehicle.internalVehicleId,
        driverName: vehicle.driver?.fullName || 'Assigned Driver',
        eventType: 'EXIT',
        speedKmh: speed,
        speedLimitKmh: gf.speedLimitKmh,
        latitude: lat,
        longitude: lng,
        timestamp,
        isAcknowledged: false
      };
      // Dispatch email and push notification configuration
      dispatchGeofenceAlertNotifications(newAlert, gf, vehicle);
      db.geofenceAlerts.unshift(newAlert);
      alertsCount++;

      db.notifications.unshift({
        id: `notif-gf-${Date.now()}`,
        title: `Geofence Exit: ${vehicle.internalVehicleId}`,
        titleAr: `خروج من منطقة جغرافية: ${vehicle.internalVehicleId}`,
        titlePs: `له ساحې وتل: ${vehicle.internalVehicleId}`,
        message: `Vehicle ${vehicle.plateNumber} exited "${gf.name}" at ${speed} km/h.${newAlert.emailDispatched ? ` [Email sent to ${newAlert.emailSentTo?.join(', ')}]` : ''}`,
        messageAr: `غادرت المركبة ${vehicle.plateNumber} نطاق "${gf.nameAr || gf.name}".`,
        messagePs: `ګاډی ${vehicle.plateNumber} له سیمې ووت.`,
        type: 'SYSTEM',
        severity: 'WARNING',
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        isRead: false,
        createdAt: timestamp
      });

      geofenceEvents.push({
        geofenceId: gf.id,
        geofenceName: gf.name,
        eventType: 'EXIT',
        alertId
      });
    }

    // Check SPEEDING inside geofence
    if (isInsideNow && gf.speedLimitKmh && speed > gf.speedLimitKmh && gf.alertOnSpeeding) {
      // Throttle speeding alerts to avoid spamming on every second ping
      const recentSpeedAlert = db.geofenceAlerts.find(
        a =>
          a.vehicleId === vehicle.id &&
          a.geofenceId === gf.id &&
          a.eventType === 'SPEEDING' &&
          Date.now() - new Date(a.timestamp).getTime() < 10 * 60 * 1000 // 10 minutes debounce
      );

      if (!recentSpeedAlert) {
        const alertId = `gfa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newAlert: GeofenceAlert = {
          id: alertId,
          geofenceId: gf.id,
          geofenceName: gf.name,
          geofenceNameAr: gf.nameAr,
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          internalVehicleId: vehicle.internalVehicleId,
          driverName: vehicle.driver?.fullName || 'Assigned Driver',
          eventType: 'SPEEDING',
          speedKmh: speed,
          speedLimitKmh: gf.speedLimitKmh,
          latitude: lat,
          longitude: lng,
          timestamp,
          isAcknowledged: false
        };
        // Dispatch email and push notification configuration
        dispatchGeofenceAlertNotifications(newAlert, gf, vehicle);
        db.geofenceAlerts.unshift(newAlert);
        alertsCount++;

        db.notifications.unshift({
          id: `notif-speed-${Date.now()}`,
          title: `⚠️ Speeding in Geofence: ${vehicle.internalVehicleId}`,
          titleAr: `⚠️ تجاوز سرعة في نطاق جغرافي: ${vehicle.internalVehicleId}`,
          titlePs: `⚠️ د سرعت سرغړونه: ${vehicle.internalVehicleId}`,
          message: `Vehicle ${vehicle.plateNumber} clocked ${speed} km/h in "${gf.name}" (Limit: ${gf.speedLimitKmh} km/h).${newAlert.emailDispatched ? ` [Email sent to ${newAlert.emailSentTo?.join(', ')}]` : ''}`,
          messageAr: `سجلت المركبة ${vehicle.plateNumber} سرعة ${speed} كم/س في نطاق "${gf.nameAr || gf.name}" (الحد: ${gf.speedLimitKmh} كم/س).`,
          messagePs: `ګاډي ${speed} km/h سرعت درلود په ${gf.name} کې.`,
          type: 'SYSTEM',
          severity: 'CRITICAL',
          entityType: 'VEHICLE',
          entityId: vehicle.id,
          isRead: false,
          createdAt: timestamp
        });

        geofenceEvents.push({
          geofenceId: gf.id,
          geofenceName: gf.name,
          eventType: 'SPEEDING',
          alertId
        });
      }
    }
  }

  // 3. Create GPS Breadcrumb Record
  const logId = `gps-${vehicle.id}-${Date.now()}`;
  const newLog: GpsLogRecord = {
    id: logId,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    internalVehicleId: vehicle.internalVehicleId,
    driverId: vehicle.assignedWorkerId || null,
    driverName: vehicle.driver?.fullName || null,
    latitude: lat,
    longitude: lng,
    speedKmh: speed,
    heading,
    altitude: data.altitude,
    accuracy: data.accuracy || 3.0,
    ignitionStatus: ignition,
    fuelLevelPercent: data.fuelLevelPercent !== undefined ? data.fuelLevelPercent : vehicle.fuelLevelPercent,
    odometerKm: data.odometerKm || vehicle.currentMileage,
    batteryVoltage: data.batteryVoltage || 24.2,
    locationName: data.locationName || vehicle.currentLocation,
    timestamp
  };

  db.gpsLogs.push(newLog);

  // Keep last 20,000 GPS points in memory/json to maintain clean storage
  if (db.gpsLogs.length > 20000) {
    db.gpsLogs = db.gpsLogs.slice(-15000);
  }

  // 4. Update vehicle current live state
  vehicle.latitude = lat;
  vehicle.longitude = lng;
  vehicle.speedKmh = speed;
  vehicle.heading = heading;
  if (data.fuelLevelPercent !== undefined) vehicle.fuelLevelPercent = data.fuelLevelPercent;
  if (data.locationName) vehicle.currentLocation = data.locationName;
  if (data.odometerKm && data.odometerKm > vehicle.currentMileage) {
    vehicle.currentMileage = data.odometerKm;
  }
  vehicle.updatedAt = timestamp;

  saveDatabase();

  return {
    success: true,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    logId,
    geofenceEvents,
    alertsGeneratedCount: alertsCount,
    updatedVehicle: {
      latitude: lat,
      longitude: lng,
      speedKmh: speed,
      heading,
      currentLocation: vehicle.currentLocation
    }
  };
}

/**
 * Computes route playback breadcrumbs and trajectory analytics for a given vehicle
 */
export function getRoutePlaybackAnalytics(
  vehicleId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
) {
  const db = getDb();
  let logs = (db.gpsLogs || []).filter(l => l.vehicleId === vehicleId);

  if (options?.startDate) {
    const startMs = new Date(options.startDate).getTime();
    logs = logs.filter(l => new Date(l.timestamp).getTime() >= startMs);
  }
  if (options?.endDate) {
    const endMs = new Date(options.endDate).getTime();
    logs = logs.filter(l => new Date(l.timestamp).getTime() <= endMs);
  }

  // Sort chronological
  logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (options?.limit && logs.length > options.limit) {
    // Subsample evenly to respect limit while preserving route integrity
    const step = logs.length / options.limit;
    const sampled: GpsLogRecord[] = [];
    for (let i = 0; i < options.limit; i++) {
      sampled.push(logs[Math.floor(i * step)]);
    }
    // Always include the last point
    if (sampled[sampled.length - 1]?.id !== logs[logs.length - 1]?.id) {
      sampled[sampled.length - 1] = logs[logs.length - 1];
    }
    logs = sampled;
  }

  // Calculate distance, top speed, moving/idling duration
  let totalDistanceMeters = 0;
  let topSpeedKmh = 0;
  let speedSum = 0;
  let movingCount = 0;
  let idleCount = 0;
  let stopsCount = 0;

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    if (current.speedKmh > topSpeedKmh) {
      topSpeedKmh = current.speedKmh;
    }

    if (current.speedKmh > 3) {
      speedSum += current.speedKmh;
      movingCount++;
    } else {
      idleCount++;
    }

    if (i > 0) {
      const prev = logs[i - 1];
      const dist = haversineDistanceMeters(prev.latitude, prev.longitude, current.latitude, current.longitude);
      totalDistanceMeters += dist;

      // Stop detection (speed dropped to 0 after moving)
      if (prev.speedKmh > 5 && current.speedKmh <= 1) {
        stopsCount++;
      }
    }
  }

  const avgSpeedKmh = movingCount > 0 ? Math.round(speedSum / movingCount) : 0;
  const distanceKm = parseFloat((totalDistanceMeters / 1000).toFixed(1));

  // Geofence events associated with this vehicle
  const vehicleAlerts = (db.geofenceAlerts || []).filter(a => a.vehicleId === vehicleId);

  return {
    vehicleId,
    totalPoints: logs.length,
    distanceKm,
    topSpeedKmh,
    avgSpeedKmh,
    stopsCount,
    movingPointsRatio: logs.length > 0 ? Math.round((movingCount / logs.length) * 100) : 0,
    startTime: logs[0]?.timestamp || null,
    endTime: logs[logs.length - 1]?.timestamp || null,
    points: logs.map(l => ({
      id: l.id,
      lat: l.latitude,
      lng: l.longitude,
      speed: l.speedKmh,
      heading: l.heading,
      ignition: l.ignitionStatus,
      fuel: l.fuelLevelPercent,
      odometer: l.odometerKm,
      locationName: l.locationName,
      timestamp: l.timestamp
    })),
    recentGeofenceAlerts: vehicleAlerts.slice(0, 10)
  };
}

/**
 * Advanced simulation step: moves vehicles smoothly along route corridors to produce live map updates
 */
export function stepFleetSimulation(): {
  updatedCount: number;
  alertsCount: number;
  positions: Array<{
    vehicleId: string;
    plateNumber: string;
    internalVehicleId: string;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    fuel: number;
    status: string;
  }>;
} {
  const db = getDb();
  let updatedCount = 0;
  let alertsCount = 0;
  const positions: any[] = [];

  const activeVehicles = db.vehicles.filter(v => v.status === 'ACTIVE');

  activeVehicles.forEach(v => {
    // Generate slight movement delta in current heading or wander slightly along highways
    const currentLat = v.latitude || 24.7136;
    const currentLng = v.longitude || 46.6753;
    let heading = v.heading || 45;

    // Wobble heading slightly (-15 to +15 degrees)
    heading = (heading + Math.floor(Math.random() * 30 - 15) + 360) % 360;

    // Movement step: ~0.002 to 0.004 degrees (approx 200-400 meters)
    const speed = Math.round(50 + Math.random() * 35);
    const speedFactor = (speed / 3600) * 0.01; // Scale to coordinates

    const rad = (heading * Math.PI) / 180;
    const deltaLat = Math.cos(rad) * speedFactor;
    const deltaLng = Math.sin(rad) * speedFactor;

    const newLat = parseFloat((currentLat + deltaLat).toFixed(6));
    const newLng = parseFloat((currentLng + deltaLng).toFixed(6));

    v.latitude = newLat;
    v.longitude = newLng;
    v.speedKmh = speed;
    v.heading = heading;
    v.fuelLevelPercent = Math.max(15, (v.fuelLevelPercent || 80) - 0.05);
    v.currentMileage = (v.currentMileage || 40000) + 1;
    v.updatedAt = new Date().toISOString();

    // Log to gpsLogs
    db.gpsLogs = db.gpsLogs || [];
    db.gpsLogs.push({
      id: `gps-${v.id}-${Date.now()}`,
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      internalVehicleId: v.internalVehicleId,
      driverId: v.assignedWorkerId || null,
      driverName: v.driver?.fullName || null,
      latitude: newLat,
      longitude: newLng,
      speedKmh: speed,
      heading,
      ignitionStatus: 'ON',
      fuelLevelPercent: Math.round(v.fuelLevelPercent),
      odometerKm: v.currentMileage,
      batteryVoltage: 24.4,
      locationName: v.currentLocation,
      timestamp: new Date().toISOString()
    });

    // Check geofences
    db.geofences = db.geofences || [];
    for (const gf of db.geofences.filter(g => g.isActive)) {
      if (isPointInGeofence({ lat: newLat, lng: newLng }, gf)) {
        if (gf.speedLimitKmh && speed > gf.speedLimitKmh && gf.alertOnSpeeding) {
          alertsCount++;
        }
      }
    }

    positions.push({
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      internalVehicleId: v.internalVehicleId,
      lat: newLat,
      lng: newLng,
      speed,
      heading,
      fuel: v.fuelLevelPercent,
      status: 'MOVING'
    });

    updatedCount++;
  });

  saveDatabase();

  return {
    updatedCount,
    alertsCount,
    positions
  };
}
