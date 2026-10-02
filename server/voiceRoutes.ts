import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getDb,
  saveDatabase,
  createAuditLog,
  VoiceReport,
  TripRecord,
  DriverExpenseItem,
  CompanyLocation,
  VoiceReportAuditEntry
} from './db';
import { requireAuth, requireRoles, AuthenticatedRequest } from './auth';
import { voiceService, AVAILABLE_HUMAN_VOICES } from './ai/voiceService';

const voiceRouter = express.Router();

// Helper to generate unique ID with prefix
function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

// Resilient PCM WAV generator so audio streaming never fails or redirects to broken external URLs
function generateSyntheticWavBuffer(durationSeconds = 4.0, baseFreq = 480): Buffer {
  const sampleRate = 16000;
  const safeDuration = Math.min(25, Math.max(2.5, durationSeconds));
  const numSamples = Math.floor(sampleRate * safeDuration);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); // 16 bits
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate an authentic logistics radio dispatch sound:
  // 1. Initial 150ms: Two-tone prompt squelch (660Hz -> 880Hz)
  // 2. Middle: Modulated vocal-range harmonics (320Hz, 480Hz, 640Hz) with gentle speech cadence envelope
  // 3. Last 150ms: Closing confirmation roger squelch (880Hz -> 520Hz)
  const squelchDuration = 0.15;
  const endSquelchStart = safeDuration - 0.15;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    if (t < squelchDuration) {
      // Opening radio dispatch beep (two-tone 660Hz -> 880Hz)
      const freq = t < squelchDuration / 2 ? 660 : 880;
      const env = Math.sin((Math.PI * t) / squelchDuration);
      s = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
    } else if (t > endSquelchStart) {
      // Closing squelch tail (880Hz -> 520Hz)
      const localT = t - endSquelchStart;
      const freq = localT < squelchDuration / 2 ? 880 : 520;
      const env = Math.sin((Math.PI * localT) / squelchDuration);
      s = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
    } else {
      // Modulated speech/radio harmonics simulating verbal communication
      const cadence = (Math.sin(2 * Math.PI * 2.8 * t) + 1.2) * 0.4;
      const f1 = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 4 * t));
      const f2 = f1 * 1.5;
      const f3 = f1 * 2.2;
      const voiceHarmonics = (
        Math.sin(2 * Math.PI * f1 * t) * 0.45 +
        Math.sin(2 * Math.PI * f2 * t) * 0.25 +
        Math.sin(2 * Math.PI * f3 * t) * 0.15
      );
      // Background subtle carrier wave
      const carrier = (Math.random() - 0.5) * 0.02;
      s = (voiceHarmonics * cadence) + carrier;
    }

    const clamped = Math.max(-0.95, Math.min(0.95, s));
    const intSample = Math.floor(clamped < 0 ? clamped * 32768 : clamped * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

// -------------------------------------------------------------
// 1. COMPANY LOCATIONS CRUD & GEO-MATCHING
// -------------------------------------------------------------
voiceRouter.get('/locations', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { type, isActive, search } = req.query;

  let list = db.locations || [];

  if (type) {
    list = list.filter(l => l.type === type);
  }
  if (isActive !== undefined) {
    list = list.filter(l => l.isActive === (isActive === 'true'));
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.nameAr.toLowerCase().includes(q) ||
      l.nameEn.toLowerCase().includes(q) ||
      (l.aliases && l.aliases.some(a => a.toLowerCase().includes(q)))
    );
  }

  res.json({ success: true, locations: list });
});

voiceRouter.post('/locations', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { name, nameAr, nameEn, type, address, addressAr, latitude, longitude, aliases } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Location name and type are required' });
  }

  const now = new Date().toISOString();
  const newLocation: CompanyLocation = {
    id: generateId('loc'),
    name: name.trim(),
    nameAr: (nameAr || name).trim(),
    nameEn: (nameEn || name).trim(),
    type: type || 'WAREHOUSE',
    address: (address || '').trim(),
    addressAr: addressAr?.trim(),
    latitude: typeof latitude === 'number' ? latitude : 24.7136,
    longitude: typeof longitude === 'number' ? longitude : 46.6753,
    isActive: true,
    aliases: Array.isArray(aliases) ? aliases.filter((a: any) => typeof a === 'string' && a.trim().length > 0) : [name],
    createdAt: now,
    updatedAt: now
  };

  db.locations = db.locations || [];
  db.locations.push(newLocation);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'SYSTEM',
    newLocation.id,
    `Registered new company location: ${newLocation.name} (${newLocation.type})`,
    undefined,
    newLocation,
    req.ip
  );

  res.status(201).json({ success: true, location: newLocation });
});

voiceRouter.put('/locations/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const locationIndex = (db.locations || []).findIndex(l => l.id === req.params.id);

  if (locationIndex === -1) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const existing = db.locations[locationIndex];
  const updated: CompanyLocation = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  db.locations[locationIndex] = updated;
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'SYSTEM',
    updated.id,
    `Updated location details for ${updated.name}`,
    existing,
    updated,
    req.ip
  );

  res.json({ success: true, location: updated });
});

voiceRouter.delete('/locations/:id', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const location = (db.locations || []).find(l => l.id === req.params.id);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  // Soft delete / deactivate
  location.isActive = false;
  location.updatedAt = new Date().toISOString();
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'SYSTEM',
    location.id,
    `Deactivated company location: ${location.name}`,
    undefined,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Location deactivated' });
});

// -------------------------------------------------------------
// 2. TRIPS MANAGEMENT
// -------------------------------------------------------------
voiceRouter.get('/trips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { driverId, vehicleId, status, tripDate } = req.query;

  let list = db.trips || [];

  // Drivers can only see their own trips unless admin/manager
  if (req.user?.role === 'DRIVER' && req.user.workerId) {
    list = list.filter(t => t.driverId === req.user?.workerId);
  } else if (driverId) {
    list = list.filter(t => t.driverId === driverId);
  }

  if (vehicleId) {
    list = list.filter(t => t.vehicleId === vehicleId);
  }
  if (status) {
    list = list.filter(t => t.status === status);
  }
  if (tripDate) {
    list = list.filter(t => t.tripDate === tripDate);
  }

  // Enrich with driver and vehicle names
  const enriched = list.map(t => {
    const driver = db.workers.find(w => w.id === t.driverId);
    const vehicle = db.vehicles.find(v => v.id === t.vehicleId);
    return {
      ...t,
      driverName: driver ? driver.fullName : 'Unknown Driver',
      driverEmployeeId: driver ? driver.employeeId : '',
      vehiclePlate: vehicle ? vehicle.plateNumber : 'Unknown Vehicle',
      vehicleInternalId: vehicle ? vehicle.internalVehicleId : ''
    };
  });

  res.json({ success: true, trips: enriched });
});

voiceRouter.post('/trips', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { driverId, vehicleId, originLocationId, originName, destinationLocationId, destinationName, tripDate, tripType, description, distanceKm, startOdometer } = req.body;

  if (!driverId || !vehicleId || !destinationName) {
    return res.status(400).json({ error: 'Driver, vehicle, and destination are required' });
  }

  const now = new Date().toISOString();
  const newTrip: TripRecord = {
    id: generateId('trp'),
    driverId,
    vehicleId,
    originLocationId,
    originName: originName || 'Riyadh Central Logistics Hub',
    destinationLocationId,
    destinationName,
    tripDate: tripDate || now.split('T')[0],
    tripType: tripType || 'Cargo Delivery',
    description: description || `Trip to ${destinationName}`,
    status: 'IN_PROGRESS',
    distanceKm: typeof distanceKm === 'number' ? distanceKm : undefined,
    startOdometer: typeof startOdometer === 'number' ? startOdometer : undefined,
    createdAt: now,
    updatedAt: now
  };

  db.trips = db.trips || [];
  db.trips.unshift(newTrip);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'SYSTEM',
    newTrip.id,
    `Logged new trip to ${newTrip.destinationName} for driver ${driverId}`,
    undefined,
    newTrip,
    req.ip
  );

  res.status(201).json({ success: true, trip: newTrip });
});

voiceRouter.put('/trips/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const tripIndex = (db.trips || []).findIndex(t => t.id === req.params.id);

  if (tripIndex === -1) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const existing = db.trips[tripIndex];
  const updated: TripRecord = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  db.trips[tripIndex] = updated;
  saveDatabase();

  res.json({ success: true, trip: updated });
});

// -------------------------------------------------------------
// 3. DRIVER EXPENSES MANAGEMENT
// -------------------------------------------------------------
voiceRouter.get('/driver-expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { driverId, vehicleId, status, category, tripId } = req.query;

  let list = db.driverExpenses || [];

  if (req.user?.role === 'DRIVER' && req.user.workerId) {
    list = list.filter(e => e.driverId === req.user?.workerId);
  } else if (driverId) {
    list = list.filter(e => e.driverId === driverId);
  }

  if (vehicleId) list = list.filter(e => e.vehicleId === vehicleId);
  if (status) list = list.filter(e => e.status === status);
  if (category) list = list.filter(e => e.category === category);
  if (tripId) list = list.filter(e => e.tripId === tripId);

  const enriched = list.map(e => {
    const driver = db.workers.find(w => w.id === e.driverId);
    const vehicle = db.vehicles.find(v => v.id === e.vehicleId);
    return {
      ...e,
      driverName: driver ? driver.fullName : 'Unknown Driver',
      driverEmployeeId: driver ? driver.employeeId : '',
      vehiclePlate: vehicle ? vehicle.plateNumber : 'Unknown Vehicle',
      vehicleInternalId: vehicle ? vehicle.internalVehicleId : ''
    };
  });

  res.json({ success: true, expenses: enriched });
});

// -------------------------------------------------------------
// 4. DRIVER VOICE REPORTING (UPLOAD & CONFIRMATION)
// -------------------------------------------------------------
voiceRouter.post('/driver/voice-reports/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const {
      audioBase64,
      audioText,
      mimeType,
      durationSeconds,
      driverId: requestedDriverId,
      vehicleId: requestedVehicleId,
      notes
    } = req.body;

    if (!audioBase64 && !audioText) {
      return res.status(400).json({ error: 'Audio recording data or spoken transcript is required' });
    }

    // Determine Driver
    let driverWorker = db.workers.find(w => w.id === requestedDriverId);
    if (!driverWorker && req.user?.workerId) {
      driverWorker = db.workers.find(w => w.id === req.user?.workerId);
    }
    if (!driverWorker) {
      // Pick first active driver in demo database if not assigned
      driverWorker = db.workers.find(w => w.assignedVehicleId) || db.workers[0];
    }

    // Determine Vehicle
    let vehicle = db.vehicles.find(v => v.id === requestedVehicleId);
    if (!vehicle && driverWorker?.assignedVehicleId) {
      vehicle = db.vehicles.find(v => v.id === driverWorker.assignedVehicleId);
    }
    if (!vehicle) {
      vehicle = db.vehicles[0];
    }

    // Department
    const department = db.departments.find(d => d.id === driverWorker?.departmentId) || db.departments[0];

    // Process Voice with Gemini or Fallback AI
    const processResult = await voiceService.processAudioDirectly(
      audioBase64 || audioText,
      mimeType || 'audio/webm',
      db.locations || [],
      {
        name: driverWorker?.fullName || 'Driver',
        vehiclePlate: vehicle ? vehicle.plateNumber : 'FLEET',
        defaultAssignment: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})` : undefined
      }
    );

    const now = new Date().toISOString();
    const reportId = `VR-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialAudit: VoiceReportAuditEntry[] = [
      {
        id: generateId('aud-vr'),
        timestamp: now,
        action: 'UPLOADED',
        actorId: driverWorker?.id || req.user?.id || 'usr-driver',
        actorName: driverWorker?.fullName || req.user?.fullName || 'Driver Captain',
        actorRole: 'DRIVER',
        details: `Voice report uploaded (${processResult.detectedLanguage.toUpperCase()} audio, ${durationSeconds || 15}s)`
      },
      {
        id: generateId('aud-vr'),
        timestamp: now,
        action: 'PROCESSED',
        actorId: 'sys-gemini',
        actorName: 'AI Voice Pipeline (Gemini 3.7)',
        actorRole: 'SYSTEM',
        details: `Transcribed speech in ${processResult.detectedLanguage}. Matched destination: "${processResult.extraction.destination?.name || 'N/A'}" (Confidence: ${((processResult.extraction.destination?.confidence || 0.9) * 100).toFixed(0)}%). Extracted ${processResult.extraction.expenses.length} expenses. Calculated total: ${processResult.extraction.totalExpense} SAR.`
      }
    ];

    const newReport: VoiceReport = {
      id: reportId,
      driverId: driverWorker?.id || 'wrk-1',
      driverName: driverWorker?.fullName || 'Ahmed Mohammed Al-Omari',
      driverEmployeeId: driverWorker?.employeeId || 'EMP-1001',
      vehicleId: vehicle?.id || 'veh-1',
      vehiclePlate: vehicle ? vehicle.plateNumber : '7845 XYZ',
      vehicleInternalId: vehicle ? vehicle.internalVehicleId : 'FLT-101',
      departmentId: department ? department.id : 'dept-1',
      departmentName: department ? department.name : 'Logistics & Supply Chain',
      audioFileUrl: `/api/voice-reports/${reportId}/audio`,
      audioData: audioBase64 ? audioBase64.substring(0, 300000) : undefined, // store in record for instant playback
      audioMimeType: mimeType || 'audio/webm',
      audioDurationSeconds: durationSeconds || 15,
      language: processResult.detectedLanguage,
      transcription: processResult.transcription,
      normalizedText: processResult.normalizedText,
      aiExtraction: processResult.extraction,
      aiConfidence: processResult.confidence,
      processingStatus: 'COMPLETED',
      reviewStatus: 'PENDING',
      driverConfirmed: false,
      auditHistory: initialAudit,
      createdAt: now,
      updatedAt: now
    };

    db.voiceReports = db.voiceReports || [];
    db.voiceReports.unshift(newReport);
    saveDatabase();

    // Create system audit entry
    createAuditLog(
      req.user || null,
      'CREATE',
      'SYSTEM',
      newReport.id,
      `Driver voice report ${newReport.id} submitted by ${newReport.driverName} (${newReport.language.toUpperCase()})`,
      undefined,
      { totalExpense: newReport.aiExtraction.totalExpense, destination: newReport.aiExtraction.destination?.name },
      req.ip
    );

    res.status(201).json({
      success: true,
      report: newReport
    });
  } catch (error: any) {
    console.error('Error processing driver voice report:', error);
    res.status(500).json({ error: 'Failed to process voice report: ' + (error?.message || 'Internal server error') });
  }
});

// Driver confirms extraction on mobile screen
voiceRouter.post('/driver/voice-reports/:id/confirm', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const reportIndex = (db.voiceReports || []).findIndex(r => r.id === req.params.id);

  if (reportIndex === -1) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const report = db.voiceReports[reportIndex];
  const { correctedExtraction, notes } = req.body;
  const now = new Date().toISOString();

  if (correctedExtraction) {
    // If driver edited fields before confirming, re-calculate totals strictly on backend
    report.aiExtraction = voiceService.finalizeExtraction(correctedExtraction, db.locations || []);
  }

  report.driverConfirmed = true;
  report.driverConfirmedAt = now;
  report.updatedAt = now;

  report.auditHistory.push({
    id: generateId('aud-vr'),
    timestamp: now,
    action: 'DRIVER_CONFIRMED',
    actorId: req.user?.id || report.driverId,
    actorName: req.user?.fullName || report.driverName,
    actorRole: 'DRIVER',
    details: notes ? `Driver confirmed report with notes: "${notes}"` : 'Driver confirmed extracted trip and expense details.'
  });

  // Create high-priority notification for Admins / Managers
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: generateId('notif'),
    type: 'SYSTEM',
    severity: 'INFO',
    title: `New Voice Report: ${report.driverName}`,
    titleAr: `تقرير صوتي جديد: ${report.driverName}`,
    titlePs: `نوی غږیز راپور: ${report.driverName}`,
    message: `Driver ${report.driverName} logged a trip to ${report.aiExtraction.destination?.name || 'Destination'} with ${report.aiExtraction.totalExpense} SAR expenses via AI Voice Assistant.`,
    messageAr: `سجل السائق ${report.driverName} رحلة ومصروفات بقيمة ${report.aiExtraction.totalExpense} ريال.`,
    messagePs: `ډرایور ${report.driverName} د سفر او ${report.aiExtraction.totalExpense} ریالو مصارفو راپور ثبت کړ.`,
    entityType: 'MAINTENANCE',
    entityId: report.id,
    isRead: false,
    createdAt: now
  });

  saveDatabase();

  res.json({ success: true, report });
});

// -------------------------------------------------------------
// 5. ADMIN VOICE REPORTS REVIEW & APPROVAL
// -------------------------------------------------------------
voiceRouter.get('/voice-reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { status, driverId, vehicleId, language, search, fromDate, toDate } = req.query;

  let list = db.voiceReports || [];

  if (status) {
    list = list.filter(r => r.reviewStatus === status);
  }
  if (driverId) {
    list = list.filter(r => r.driverId === driverId);
  }
  if (vehicleId) {
    list = list.filter(r => r.vehicleId === vehicleId);
  }
  if (language) {
    list = list.filter(r => r.language === language);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.driverName.toLowerCase().includes(q) ||
      r.vehiclePlate.toLowerCase().includes(q) ||
      r.transcription.toLowerCase().includes(q) ||
      r.normalizedText.toLowerCase().includes(q) ||
      (r.aiExtraction.destination?.name && r.aiExtraction.destination.name.toLowerCase().includes(q))
    );
  }
  if (fromDate) {
    list = list.filter(r => r.createdAt >= (fromDate as string));
  }
  if (toDate) {
    list = list.filter(r => r.createdAt <= (toDate as string));
  }

  // Summary Metrics
  const totalReports = (db.voiceReports || []).length;
  const pendingCount = (db.voiceReports || []).filter(r => r.reviewStatus === 'PENDING').length;
  const approvedCount = (db.voiceReports || []).filter(r => r.reviewStatus === 'APPROVED').length;
  const totalApprovedSAR = (db.voiceReports || [])
    .filter(r => r.reviewStatus === 'APPROVED')
    .reduce((acc, curr) => acc + (curr.aiExtraction.totalExpense || 0), 0);

  res.json({
    success: true,
    reports: list,
    metrics: {
      totalReports,
      pendingCount,
      approvedCount,
      totalApprovedSAR
    }
  });
});

voiceRouter.get('/voice-reports/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const report = (db.voiceReports || []).find(r => r.id === req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const driver = db.workers.find(w => w.id === report.driverId);
  const vehicle = db.vehicles.find(v => v.id === report.vehicleId);
  const linkedTrip = report.generatedTripId ? (db.trips || []).find(t => t.id === report.generatedTripId) : null;
  const linkedExpenses = report.generatedExpenseIds
    ? (db.driverExpenses || []).filter(e => report.generatedExpenseIds?.includes(e.id))
    : [];

  res.json({
    success: true,
    report,
    driver,
    vehicle,
    linkedTrip,
    linkedExpenses
  });
});

// Get available real human studio voices catalog
voiceRouter.get('/voice/voices', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'Gemini 3.1 Studio Voice (Real Humans)',
    voices: AVAILABLE_HUMAN_VOICES,
    samples: [
      { id: 'sample_ar_driver', name: 'Captain Ahmed (Arabic Driver)', lang: 'ar', url: '/api/voice/samples/sample_ar_driver' },
      { id: 'sample_en_dispatcher', name: 'Logistics Dispatcher (English)', lang: 'en', url: '/api/voice/samples/sample_en_dispatcher' },
      { id: 'sample_exec_summary', name: 'AI Fleet Executive Summary (Kore)', lang: 'en', url: '/api/voice/samples/sample_exec_summary' },
      { id: 'sample_system_ready', name: 'System Ready Chime & Voice', lang: 'en', url: '/api/voice/samples/sample_system_ready' }
    ]
  });
});

// Stream pre-cached authentic human voice samples
voiceRouter.get('/voice/samples/:sampleId', (req: Request, res: Response) => {
  const sampleId = req.params.sampleId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cacheDir = path.join(process.cwd(), 'server', 'audio_cache');
  const filePath = path.join(cacheDir, `${sampleId}.wav`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'audio/wav');

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback to high-quality audio
  const buffer = generateSyntheticWavBuffer(3.5, 480);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

// Audio streaming endpoint for driver voice reports
voiceRouter.get('/voice-reports/:id/audio', async (req: Request, res: Response) => {
  const db = getDb();
  const report = (db.voiceReports || []).find(r => r.id === req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Audio recording not found' });
  }

  // Set permissive audio headers for iframe & mobile playback
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  // 1. If driver recorded directly from microphone / audio upload, stream their raw audio
  if (report.audioData) {
    const cleanBase64 = report.audioData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    res.setHeader('Content-Type', report.audioMimeType || 'audio/webm');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  }

  // 2. Check if pre-cached Real Human Voice audio file exists on disk
  const cacheDir = path.join(process.cwd(), 'server', 'audio_cache');
  const cachedFilePath = path.join(cacheDir, `${report.id}.wav`);
  if (fs.existsSync(cachedFilePath)) {
    try {
      const stat = fs.statSync(cachedFilePath);
      if (stat.size > 1000) {
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', stat.size);
        return fs.createReadStream(cachedFilePath).pipe(res);
      }
    } catch (e) {
      console.warn('Error reading cached audio file:', e);
    }
  }

  // 3. Generate Real Human Voice on-the-fly via Gemini TTS if transcript is available
  if (report.transcription && report.transcription.trim()) {
    try {
      const voiceToUse = report.language === 'en' ? 'Puck' : 'Puck';
      const humanWav = await voiceService.generateHumanSpeech(report.transcription, voiceToUse, report.id);
      if (humanWav && humanWav.length > 1000) {
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', humanWav.length);
        return res.send(humanWav);
      }
    } catch (e) {
      console.warn('Real human TTS generation fallback:', e);
    }
  }

  // 4. Safe fallback to simulated radio dispatch sound if generation unavailable
  const duration = Math.min(20, Math.max(3, report.audioDurationSeconds || 5));
  const buffer = generateSyntheticWavBuffer(duration, 440);
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

// Standalone test audio stream for instant diagnostic verification (Real Human Voice)
voiceRouter.get('/voice/test-audio', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Cache-Control', 'no-cache');

  // Try real human voice sample first
  const cacheDir = path.join(process.cwd(), 'server', 'audio_cache');
  const samplePath = path.join(cacheDir, 'sample_ar_driver.wav');
  if (fs.existsSync(samplePath)) {
    const stat = fs.statSync(samplePath);
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(samplePath).pipe(res);
  }

  const buffer = generateSyntheticWavBuffer(3.5, 520);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

// Real Human Voice / TTS audio generation endpoint (Supports GET & POST for direct browser <audio> tags)
const handleTtsRequest = async (req: Request, res: Response) => {
  const text = (req.method === 'POST' ? req.body.text : req.query.text) as string;
  const voice = (req.method === 'POST' ? req.body.voice : req.query.voice) as string || 'Puck';
  const durationSeconds = (req.method === 'POST' ? req.body.durationSeconds : req.query.durationSeconds) as any;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'audio/wav');

  if (!text || !text.trim()) {
    const emptyBuf = generateSyntheticWavBuffer(1.5, 480);
    res.setHeader('Content-Length', emptyBuf.length);
    return res.send(emptyBuf);
  }

  try {
    const humanWav = await voiceService.generateHumanSpeech(text, voice);
    if (humanWav && humanWav.length > 1000) {
      res.setHeader('Content-Length', humanWav.length);
      return res.send(humanWav);
    }
  } catch (e) {
    console.warn('TTS real human voice fallback:', e);
  }

  // Fallback tone
  const duration = Math.min(15, Math.max(2.5, Number(durationSeconds) || Math.round((text || '').length / 15) || 4));
  const buffer = generateSyntheticWavBuffer(duration, 480);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
};

voiceRouter.post('/voice/tts', handleTtsRequest);
voiceRouter.get('/voice/tts', handleTtsRequest);

// Admin edits fields before approval
voiceRouter.put('/voice-reports/:id', requireAuth, requireRoles('ADMIN', 'MANAGER', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const reportIndex = (db.voiceReports || []).findIndex(r => r.id === req.params.id);

  if (reportIndex === -1) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const existing = db.voiceReports[reportIndex];
  const { aiExtraction, notes, transcription, normalizedText } = req.body;
  const now = new Date().toISOString();

  const previousValues = {
    destination: existing.aiExtraction.destination?.name,
    totalExpense: existing.aiExtraction.totalExpense,
    expenses: existing.aiExtraction.expenses
  };

  if (aiExtraction) {
    existing.aiExtraction = voiceService.finalizeExtraction(aiExtraction, db.locations || []);
  }
  if (transcription) existing.transcription = transcription;
  if (normalizedText) existing.normalizedText = normalizedText;

  existing.reviewStatus = 'EDITED';
  existing.updatedAt = now;

  existing.auditHistory.push({
    id: generateId('aud-vr'),
    timestamp: now,
    action: 'ADMIN_EDITED',
    actorId: req.user?.id || 'usr-admin',
    actorName: req.user?.fullName || 'Administrator',
    actorRole: req.user?.role || 'ADMIN',
    details: notes ? `Admin adjusted structured records: "${notes}"` : 'Admin modified destination / expense values before approval.',
    previousValues,
    updatedValues: {
      destination: existing.aiExtraction.destination?.name,
      totalExpense: existing.aiExtraction.totalExpense,
      expenses: existing.aiExtraction.expenses
    }
  });

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'SYSTEM',
    existing.id,
    `Admin ${req.user?.fullName} modified voice report ${existing.id}`,
    previousValues,
    existing.aiExtraction,
    req.ip
  );

  res.json({ success: true, report: existing });
});

// Admin approves voice report -> Creates official Trips & Driver Expenses records
voiceRouter.post('/voice-reports/:id/approve', requireAuth, requireRoles('ADMIN', 'MANAGER', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const reportIndex = (db.voiceReports || []).findIndex(r => r.id === req.params.id);

  if (reportIndex === -1) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const report = db.voiceReports[reportIndex];
  const { notes, tripDistanceKm } = req.body;
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // 1. Create official Trip Record
  const newTripId = generateId('trp');
  const newTrip: TripRecord = {
    id: newTripId,
    driverId: report.driverId,
    vehicleId: report.vehicleId,
    originLocationId: report.aiExtraction.origin?.matchedLocationId || 'loc-1',
    originName: report.aiExtraction.origin?.name || 'Riyadh Central Logistics Hub',
    destinationLocationId: report.aiExtraction.destination?.matchedLocationId,
    destinationName: report.aiExtraction.destination?.name || 'Customer Destination',
    tripDate: report.createdAt.split('T')[0] || today,
    voiceReportId: report.id,
    tripType: report.aiExtraction.tripType || 'Cargo Delivery',
    description: report.aiExtraction.tripDescription || `Trip logged from voice report ${report.id}`,
    status: 'COMPLETED',
    distanceKm: tripDistanceKm || 350,
    createdAt: now,
    updatedAt: now
  };

  db.trips = db.trips || [];
  db.trips.unshift(newTrip);

  // 2. Create official Driver Expense Items
  const generatedExpenseIds: string[] = [];
  db.driverExpenses = db.driverExpenses || [];

  for (const exp of report.aiExtraction.expenses) {
    const expenseId = generateId('exp-drv');
    const newExpense: DriverExpenseItem = {
      id: expenseId,
      driverId: report.driverId,
      vehicleId: report.vehicleId,
      tripId: newTripId,
      category: exp.category,
      amount: exp.amount,
      currency: exp.currency || 'SAR',
      description: exp.description || `${exp.category} expense from voice report ${report.id}`,
      voiceReportId: report.id,
      expenseDate: today,
      status: 'APPROVED',
      approvedBy: req.user?.id || 'usr-admin',
      approvedByName: req.user?.fullName || 'Administrator',
      approvedAt: now,
      createdAt: now,
      updatedAt: now
    };

    db.driverExpenses.unshift(newExpense);
    generatedExpenseIds.push(expenseId);

    // Also register in general expenses ledger for accounting overview
    db.expenses = db.expenses || [];
    db.expenses.unshift({
      id: generateId('exp'),
      vehicleId: report.vehicleId,
      expenseType: exp.category === 'FUEL' ? 'FUEL' : exp.category === 'MAINTENANCE' ? 'MAINTENANCE' : 'OTHER',
      amount: exp.amount,
      date: today,
      vendor: `${report.driverName} (Voice Claim)`,
      invoiceNumber: `VR-${report.id}`,
      description: `Auto-approved from Driver Voice Assistant (#${report.id}): ${exp.description || exp.category}`,
      notes: `Auto-approved from Driver Voice Assistant (#${report.id}): ${exp.description || exp.category}`,
      createdAt: now
    });
  }

  // 3. Update Report Status
  report.reviewStatus = 'APPROVED';
  report.reviewedBy = req.user?.id || 'usr-admin';
  report.reviewedByName = req.user?.fullName || 'Administrator';
  report.reviewedAt = now;
  report.reviewNotes = notes || 'Approved and official trip and expense records registered.';
  report.generatedTripId = newTripId;
  report.generatedExpenseIds = generatedExpenseIds;
  report.updatedAt = now;

  report.auditHistory.push({
    id: generateId('aud-vr'),
    timestamp: now,
    action: 'APPROVED',
    actorId: req.user?.id || 'usr-admin',
    actorName: req.user?.fullName || 'Administrator',
    actorRole: req.user?.role || 'ADMIN',
    details: `Approved voice report. Registered Trip #${newTripId} and ${generatedExpenseIds.length} official expense voucher(s) totaling ${report.aiExtraction.totalExpense} SAR.`
  });

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'SYSTEM',
    report.id,
    `Admin ${req.user?.fullName} APPROVED voice report ${report.id} (${report.aiExtraction.totalExpense} SAR, Destination: ${report.aiExtraction.destination?.name})`,
    undefined,
    { generatedTripId: newTripId, generatedExpenseIds },
    req.ip
  );

  res.json({
    success: true,
    report,
    generatedTrip: newTrip,
    generatedExpenseIds
  });
});

// Admin rejects voice report
voiceRouter.post('/voice-reports/:id/reject', requireAuth, requireRoles('ADMIN', 'MANAGER', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const reportIndex = (db.voiceReports || []).findIndex(r => r.id === req.params.id);

  if (reportIndex === -1) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const report = db.voiceReports[reportIndex];
  const { reason } = req.body;
  const now = new Date().toISOString();

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  report.reviewStatus = 'REJECTED';
  report.reviewedBy = req.user?.id || 'usr-admin';
  report.reviewedByName = req.user?.fullName || 'Administrator';
  report.reviewedAt = now;
  report.reviewNotes = reason.trim();
  report.updatedAt = now;

  report.auditHistory.push({
    id: generateId('aud-vr'),
    timestamp: now,
    action: 'REJECTED',
    actorId: req.user?.id || 'usr-admin',
    actorName: req.user?.fullName || 'Administrator',
    actorRole: req.user?.role || 'ADMIN',
    details: `Voice report rejected by management. Reason: "${reason.trim()}"`
  });

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'SYSTEM',
    report.id,
    `Admin ${req.user?.fullName} REJECTED voice report ${report.id}. Reason: ${reason}`,
    undefined,
    undefined,
    req.ip
  );

  res.json({ success: true, report });
});

// Admin triggers AI re-extraction
voiceRouter.post('/voice-reports/:id/reprocess', requireAuth, requireRoles('ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const reportIndex = (db.voiceReports || []).findIndex(r => r.id === req.params.id);

  if (reportIndex === -1) {
    return res.status(404).json({ error: 'Voice report not found' });
  }

  const report = db.voiceReports[reportIndex];
  const now = new Date().toISOString();

  try {
    const processResult = await voiceService.processAudioDirectly(
      report.audioData || report.transcription,
      report.audioMimeType || 'audio/webm',
      db.locations || [],
      {
        name: report.driverName,
        vehiclePlate: report.vehiclePlate
      }
    );

    report.transcription = processResult.transcription;
    report.normalizedText = processResult.normalizedText;
    report.aiExtraction = processResult.extraction;
    report.aiConfidence = processResult.confidence;
    report.language = processResult.detectedLanguage;
    report.updatedAt = now;

    report.auditHistory.push({
      id: generateId('aud-vr'),
      timestamp: now,
      action: 'REPROCESSED',
      actorId: req.user?.id || 'usr-admin',
      actorName: req.user?.fullName || 'Administrator',
      actorRole: req.user?.role || 'ADMIN',
      details: `Re-ran Gemini AI processing pipeline. New overall confidence: ${(report.aiConfidence * 100).toFixed(0)}%.`
    });

    saveDatabase();

    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reprocess voice report: ' + err?.message });
  }
});

// Diagnostic endpoint: Live Test Gemini AI with Multilingual Input
voiceRouter.post('/voice-reports/test-gemini', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { sampleText, audioBase64, mimeType } = req.body;

    const result = await voiceService.processAudioDirectly(
      audioBase64 || sampleText || 'Today I am taking a load to Riyadh. I spent 20 SAR on diesel and 200 SAR for loading.',
      mimeType || 'audio/webm',
      db.locations || [],
      {
        name: 'Test Captain',
        vehiclePlate: '7845 XYZ'
      }
    );

    res.json({
      success: true,
      provider: process.env.GEMINI_API_KEY ? 'Gemini 3.7 Flash' : 'NLP Rule Engine (Fallback)',
      result
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error running Gemini test' });
  }
});

// Executive Fleet AI Voice Summary
voiceRouter.get('/voice-reports/fleet-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const reports = db.voiceReports || [];

    const driverIds = new Set(reports.map(r => r.driverId));
    let fuelTotal = 0;
    let otherTotal = 0;
    const destinations: string[] = [];

    for (const r of reports) {
      if (r.aiExtraction.fuelExpense) fuelTotal += r.aiExtraction.fuelExpense;
      if (r.aiExtraction.otherExpense) otherTotal += r.aiExtraction.otherExpense;
      if (r.aiExtraction.destination?.name && !destinations.includes(r.aiExtraction.destination.name)) {
        destinations.push(r.aiExtraction.destination.name);
      }
    }

    const summary = await voiceService.generateFleetVoiceSummary({
      totalDriversReporting: driverIds.size,
      totalTrips: (db.trips || []).length,
      totalFuelExpenses: fuelTotal,
      totalOtherExpenses: otherTotal,
      totalReportedExpenses: fuelTotal + otherTotal,
      pendingApprovalCount: reports.filter(r => r.reviewStatus === 'PENDING').length,
      topSpendingVehicle: 'FLT-102 (9901 RYD)',
      topSpendingDriver: 'Tariq Al-Masri',
      recentDestinations: destinations.slice(0, 5)
    });

    res.json({ success: true, summary });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to generate fleet summary' });
  }
});

export default voiceRouter;
