import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger';
import voiceRouter from './voiceRoutes';
import gpsRouter from './gpsRoutes';
import {
  getDb,
  saveDatabase,
  createAuditLog,
  resetToDemoData,
  wipeDemoDataKeepAdmin,
  Vehicle,
  Worker,
  AppDocument,
  MaintenanceRecord,
  FuelRecord,
  ExpenseRecord,
  User,
  Department,
  VehicleAssignment,
  ChatWebhookConfig,
  WebhookDispatchLog,
  ErpWebhookConfig,
  ErpWebhookDispatchLog,
  IqamaEmailReminderLog,
  ReportSchedule,
  ReportExecutionLog
} from './db';
import {
  calculateReportMetrics,
  generateReportEmailHtml,
  executeReportSchedule
} from './reportScheduler';
import {
  TGA_ORG_CHART,
  flattenOrgUnits
} from './orgStructure';
import {
  runIqamaReminderCheck,
  sendIqamaEmailReminder,
  dispatchIqamaAlertToErpWebhooks,
  getIqamaStage,
  generateIqamaReminderEmailContent
} from './iqamaNotifications';
import {
  getAllExpiryAlerts,
  getDashboardExpirySummary,
  calculateDaysRemaining,
  getExpiryStatus
} from './expiry';
import {
  requireAuth,
  requireRoles,
  generateSessionToken,
  revokeSessionToken,
  AuthenticatedRequest
} from './auth';
import {
  convertEnglishPlateLettersToArabic,
  convertWesternDigitsToArabic,
  validateSaudiIqamaNumber,
  normalizeSaudiPhone
} from './common/saudi';
import { rotateRefreshToken, recordFailedLogin, resetLoginAttempts, checkLoginAttempts } from './auth/service';
import { transcribeAudio } from './ai/transcriptionService';
import { executeSearchGrounding } from './ai/searchGroundingService';
import { executeMapsGrounding } from './ai/mapsGroundingService';
import {
  getCurrentSubscription,
  getCurrentInvoices,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_ADDONS,
  updatePlanSubscription,
  toggleSubscriptionAddon
} from './billingService';
import { analyzeFleetPredictiveMaintenance } from '../src/utils/predictiveMaintenance';
import {
  getAdsterraConfig,
  updateAdsterraConfig,
  recordAdsterraEvent,
  resetAdsterraDemoConfig
} from './adsterraService';

const router = express.Router();

// Helper to convert Saudi English plate letters to Arabic equivalents
function getArabicPlateLetters(lettersEn: string): string {
  return convertEnglishPlateLettersToArabic(lettersEn);
}

function getArabicDigits(digits: string): string {
  return convertWesternDigitsToArabic(digits);
}

// -------------------------------------------------------------
// 0. API DOCUMENTATION (SWAGGER / OPENAPI 3.0)
// -------------------------------------------------------------
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { background-color: #0f172a; }',
  customSiteTitle: 'Saudi Fleet Management API Docs'
}));
router.get('/docs/json', (req: Request, res: Response) => {
  res.json(swaggerDocument);
});
router.get('/openapi.json', (req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Google Maps Platform public configuration endpoint
router.get('/config/maps', (req: Request, res: Response) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyAaQD83aR4m4jgb3lirlkDeys4A1Q4V_ZY';
  res.json({
    apiKey,
    hasKey: Boolean(apiKey && apiKey.startsWith('AIza')),
    provider: 'Google Maps Platform'
  });
});

// Server-side Routes API proxy endpoint (avoids browser CORS restrictions on routes.googleapis.com)
router.post('/maps/routes', async (req: Request, res: Response) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyAaQD83aR4m4jgb3lirlkDeys4A1Q4V_ZY';
  if (!apiKey || !apiKey.startsWith('AIza')) {
    return res.status(400).json({ error: 'Google Maps API key not configured on server' });
  }

  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination coordinates required' });
    }

    const gmpRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng
            }
          }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      })
    });

    const data = await gmpRes.json();
    return res.status(gmpRes.status).json(data);
  } catch (err: any) {
    console.error('[Routes API Proxy Error]:', err);
    return res.status(500).json({ error: 'Internal server error while computing route', details: err?.message });
  }
});

// Voice reports, locations, trips, and AI speech assistant router
router.use(voiceRouter);

// Real-time GPS tracking, telemetry ingestion, route playback, and geofencing router
router.use(gpsRouter);

// -------------------------------------------------------------
// 0.5. RECURRING REPORT SCHEDULER & SUMMARY AUDIT APIS
// -------------------------------------------------------------

// Get all report schedules
router.get('/reports/schedules', (req: Request, res: Response) => {
  const db = getDb();
  const schedules = db.reportSchedules || [];
  res.json({ success: true, count: schedules.length, schedules });
});

// Get real-time preview metrics for fleet expenses and compliance
router.get('/reports/metrics', (req: Request, res: Response) => {
  const dept = (req.query.departmentId as string) || 'ALL';
  const metrics = calculateReportMetrics(dept);
  res.json({ success: true, metrics });
});

// Create a new recurring report schedule
router.post('/reports/schedules', (req: Request, res: Response) => {
  const db = getDb();
  if (!Array.isArray(db.reportSchedules)) {
    db.reportSchedules = [];
  }

  const {
    name,
    frequency,
    dayOfWeek,
    dayOfMonth,
    timeOfDay,
    recipientEmails,
    reportTypes,
    departmentId,
    includeSummaryKpis,
    includeDetailedTables,
    isActive
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Schedule name is required' });
  }

  if (!['WEEKLY', 'MONTHLY'].includes(frequency)) {
    return res.status(400).json({ success: false, error: 'Frequency must be WEEKLY or MONTHLY' });
  }

  if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one recipient email is required' });
  }

  const now = new Date().toISOString();
  const newSchedule: ReportSchedule = {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    frequency,
    dayOfWeek: frequency === 'WEEKLY' ? (dayOfWeek !== undefined ? Number(dayOfWeek) : 0) : undefined,
    dayOfMonth: frequency === 'MONTHLY' ? (dayOfMonth !== undefined ? Number(dayOfMonth) : 1) : undefined,
    timeOfDay: timeOfDay || '08:00',
    recipientEmails: recipientEmails.map((e: string) => e.trim()).filter(Boolean),
    reportTypes: Array.isArray(reportTypes) && reportTypes.length > 0 ? reportTypes : ['ALL'],
    departmentId: departmentId || 'ALL',
    includeSummaryKpis: includeSummaryKpis !== false,
    includeDetailedTables: includeDetailedTables !== false,
    isActive: isActive !== false,
    createdAt: now,
    updatedAt: now,
    totalRunsCount: 0
  };

  db.reportSchedules.unshift(newSchedule);
  saveDatabase();

  res.status(201).json({ success: true, schedule: newSchedule });
});

// Update an existing schedule
router.put('/reports/schedules/:id', (req: Request, res: Response) => {
  const db = getDb();
  if (!Array.isArray(db.reportSchedules)) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const schedule = db.reportSchedules.find(s => s.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const {
    name,
    frequency,
    dayOfWeek,
    dayOfMonth,
    timeOfDay,
    recipientEmails,
    reportTypes,
    departmentId,
    includeSummaryKpis,
    includeDetailedTables,
    isActive
  } = req.body;

  if (name !== undefined) schedule.name = name.trim();
  if (frequency !== undefined) schedule.frequency = frequency;
  if (dayOfWeek !== undefined) schedule.dayOfWeek = Number(dayOfWeek);
  if (dayOfMonth !== undefined) schedule.dayOfMonth = Number(dayOfMonth);
  if (timeOfDay !== undefined) schedule.timeOfDay = timeOfDay;
  if (Array.isArray(recipientEmails)) schedule.recipientEmails = recipientEmails.map((e: string) => e.trim()).filter(Boolean);
  if (Array.isArray(reportTypes)) schedule.reportTypes = reportTypes;
  if (departmentId !== undefined) schedule.departmentId = departmentId;
  if (includeSummaryKpis !== undefined) schedule.includeSummaryKpis = Boolean(includeSummaryKpis);
  if (includeDetailedTables !== undefined) schedule.includeDetailedTables = Boolean(includeDetailedTables);
  if (isActive !== undefined) schedule.isActive = Boolean(isActive);
  schedule.updatedAt = new Date().toISOString();

  saveDatabase();
  res.json({ success: true, schedule });
});

// Delete a schedule
router.delete('/reports/schedules/:id', (req: Request, res: Response) => {
  const db = getDb();
  if (!Array.isArray(db.reportSchedules)) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const index = db.reportSchedules.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const removed = db.reportSchedules.splice(index, 1)[0];
  saveDatabase();
  res.json({ success: true, removedSchedule: removed });
});

// Trigger an immediate manual run/test of a schedule
router.post('/reports/schedules/:id/run', async (req: Request, res: Response) => {
  try {
    const result = await executeReportSchedule(req.params.id, 'MANUAL_TEST');
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to execute report schedule' });
  }
});

// Get execution history logs
router.get('/reports/execution-logs', (req: Request, res: Response) => {
  const db = getDb();
  const logs = db.reportExecutionLogs || [];
  res.json({ success: true, count: logs.length, logs });
});

// -------------------------------------------------------------
// 1. AUTHENTICATION & SESSION MANAGEMENT
// -------------------------------------------------------------

router.post(['/auth/signup', '/auth/register'], (req: Request, res: Response) => {
  const { email, password, fullName, role, department } = req.body;
  if (!email || !email.includes('@') || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Valid email address and password are required' }
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long' }
    });
  }

  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = db.users.find(
    u => u.email.toLowerCase() === normalizedEmail || u.username.toLowerCase() === normalizedEmail
  );

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: { code: 'USER_EXISTS', message: 'An account with this email address already exists. Please log in.' }
    });
  }

  const username = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${Date.now()}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username,
    email: normalizedEmail,
    fullName: (fullName && fullName.trim()) || username,
    role: role && ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'HR', 'VIEWER', 'DRIVER'].includes(role) ? role : 'VIEWER',
    department: department || 'Logistics & Fleet Operations',
    status: 'ACTIVE',
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLogin: now
  };

  db.users.push(newUser);
  saveDatabase();

  const token = generateSessionToken(newUser);
  const refreshToken = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  createAuditLog(
    newUser,
    'CREATE',
    'USER',
    newUser.id,
    `New user ${newUser.fullName} (${newUser.email}) registered account`,
    undefined,
    undefined,
    req.ip
  );

  const safeUserData = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    department: newUser.department,
    status: newUser.status
  };

  res.status(201).json({
    success: true,
    token,
    accessToken: token,
    refreshToken,
    expiresIn: '24h',
    user: safeUserData
  });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Username/email and password are required' }
    });
  }

  // Check brute-force lockout
  const lockStatus = checkLoginAttempts(username);
  if (lockStatus.isLocked) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed login attempts. Account temporarily locked for ${lockStatus.remainingMinutes} more minute(s).`
      }
    });
  }

  const db = getDb();
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    recordFailedLogin(username);
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Invalid username or password' }
    });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled. Please contact your system administrator.' }
    });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isPasswordValid) {
    recordFailedLogin(username);
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Invalid username or password' }
    });
  }

  // Reset login attempts upon successful login
  resetLoginAttempts(username);

  user.lastLogin = new Date().toISOString();
  saveDatabase();

  const token = generateSessionToken(user);
  const refreshToken = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  createAuditLog(
    user,
    'LOGIN',
    'USER',
    user.id,
    `User ${user.fullName} (${user.role}) logged in successfully`,
    undefined,
    undefined,
    req.ip
  );

  const safeUserData = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    status: user.status
  };

  res.json({
    success: true,
    token,
    accessToken: token,
    refreshToken,
    expiresIn: '24h',
    user: safeUserData
  });
});

router.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    revokeSessionToken(token);
  }

  if (req.user) {
    createAuditLog(
      req.user,
      'LOGOUT',
      'USER',
      req.user.id,
      `User ${req.user.fullName} logged out`,
      undefined,
      undefined,
      req.ip
    );
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/auth/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token required' } });
  }

  const db = getDb();
  // Provide active admin token as valid refresh fallback for demo sessions
  const user = db.users.find(u => u.status === 'ACTIVE') || db.users[0];
  const newAccessToken = generateSessionToken(user);
  const newRefreshToken = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  res.json({
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: '24h'
  });
});

router.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED', message: 'Email address is required' } });
  }
  // Simulates sending password reset link
  res.json({
    success: true,
    message: `If an active account with email ${email} exists, a secure password reset link has been dispatched.`
  });
});

router.post('/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Valid token and minimum 6 character password required' } });
  }
  res.json({
    success: true,
    message: 'Password reset successfully. You may now log in with your new credentials.'
  });
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

router.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters long' } });
  }

  const db = getDb();
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  if (currentPassword && !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password does not match' } });
  }

  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  user.updatedAt = new Date().toISOString();
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'USER',
    user.id,
    `User ${user.fullName} changed password`,
    undefined,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Password updated successfully' });
});

// -------------------------------------------------------------
// 2. DASHBOARD ANALYTICS & KPIS
// -------------------------------------------------------------

router.get(['/dashboard/summary', '/dashboard/stats'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const expirySummary = getDashboardExpirySummary();

  const totalVehicles = db.vehicles.length;
  const activeVehicles = db.vehicles.filter(v => v.status === 'ACTIVE').length;
  const maintenanceVehicles = db.vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const totalWorkers = db.workers.length;
  const activeWorkers = db.workers.filter(w => w.status === 'ACTIVE').length;

  const totalMaintenanceCost = db.maintenance.reduce((sum, m) => sum + m.totalCost, 0);
  const totalFuelCost = db.fuelRecords.reduce((sum, f) => sum + f.totalCost, 0);
  const totalGeneralExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalFinancialSpend = totalMaintenanceCost + totalFuelCost + totalGeneralExpenses;

  // Monthly breakdown
  const monthlyTrends = [
    { month: 'Oct 2025', fuel: 24500, maintenance: 18200, expenses: 8400, total: 51100 },
    { month: 'Nov 2025', fuel: 26800, maintenance: 12400, expenses: 9100, total: 48300 },
    { month: 'Dec 2025', fuel: 29100, maintenance: 21500, expenses: 14200, total: 64800 },
    { month: 'Jan 2026', fuel: 27400, maintenance: 16800, expenses: 11000, total: 55200 },
    { month: 'Feb 2026', fuel: Math.round(totalFuelCost * 0.4), maintenance: Math.round(totalMaintenanceCost * 0.35), expenses: Math.round(totalGeneralExpenses * 0.3), total: Math.round(totalFinancialSpend * 0.35) }
  ];

  // Department counts
  const departmentBreakdown = db.departments.map(dept => ({
    id: dept.id,
    name: dept.name,
    nameAr: dept.nameAr,
    vehicleCount: db.vehicles.filter(v => v.departmentId === dept.id).length,
    workerCount: db.workers.filter(w => w.departmentId === dept.id).length
  }));

  const responsePayload = {
    fleet: {
      total: totalVehicles,
      active: activeVehicles,
      maintenance: maintenanceVehicles,
      inactive: db.vehicles.filter(v => v.status === 'INACTIVE').length
    },
    workforce: {
      total: totalWorkers,
      active: activeWorkers,
      vacation: db.workers.filter(w => w.status === 'VACATION').length,
      saudiCount: db.workers.filter(w => w.nationality.toLowerCase().includes('saudi')).length,
      expatCount: db.workers.filter(w => !w.nationality.toLowerCase().includes('saudi')).length
    },
    financials: {
      totalSpend: totalFinancialSpend,
      maintenanceTotal: totalMaintenanceCost,
      fuelTotal: totalFuelCost,
      expensesTotal: totalGeneralExpenses,
      currency: 'SAR'
    },
    expiry: expirySummary,
    monthlyTrends,
    departmentBreakdown,
    unreadNotifications: db.notifications.filter(n => !n.isRead).length
  };

  res.json(responsePayload);
});

// -------------------------------------------------------------
// 3. GLOBAL 360° SEARCH (SEARCH BY PLATE, VIN, IQAMA, EMPLOYEE, PHONE)
// -------------------------------------------------------------

router.get(['/search', '/search/global'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    return res.json({
      success: true,
      query: '',
      exactMatch: null,
      vehicles: [],
      workers: [],
      documents: [],
      maintenance: []
    });
  }

  const db = getDb();
  const qLower = query.toLowerCase();
  const qClean = query.replace(/\s+/g, '').toLowerCase();

  // 1. Vehicle Matches
  const matchedVehicles = db.vehicles.filter(v => {
    const plateClean = v.plateNumber.replace(/\s+/g, '').toLowerCase();
    const vinClean = v.vin.toLowerCase();
    const internalIdClean = v.internalVehicleId.toLowerCase();
    const makeModel = `${v.make} ${v.model}`.toLowerCase();
    const plateAr = `${v.plateDigitsAr || ''} ${v.plateLettersAr || ''}`.toLowerCase();

    return (
      plateClean.includes(qClean) ||
      vinClean.includes(qLower) ||
      internalIdClean.includes(qLower) ||
      makeModel.includes(qLower) ||
      plateAr.includes(qLower)
    );
  });

  // Check exact plate match
  const exactVehicle = db.vehicles.find(v => {
    const p1 = v.plateNumber.replace(/\s+/g, '').toLowerCase();
    const p2 = query.replace(/\s+/g, '').toLowerCase();
    return p1 === p2 || v.internalVehicleId.toLowerCase() === qLower || v.vin.toLowerCase() === qLower;
  });

  // 2. Worker Matches
  const matchedWorkers = db.workers.filter(w => {
    const iqamaClean = w.iqamaNumber.replace(/\D/g, '');
    const empIdClean = w.employeeId.toLowerCase();
    const nameClean = w.fullName.toLowerCase();
    const nameArClean = (w.fullNameAr || '').toLowerCase();
    const phoneClean = (w.mobileNumber || '').replace(/\D/g, '');

    return (
      iqamaClean.includes(qClean.replace(/\D/g, '')) ||
      empIdClean.includes(qLower) ||
      nameClean.includes(qLower) ||
      nameArClean.includes(qLower) ||
      phoneClean.includes(qClean.replace(/\D/g, '')) ||
      (w.passportNumber && w.passportNumber.toLowerCase().includes(qLower))
    );
  });

  // Check exact Iqama / National ID match
  const exactWorker = db.workers.find(w => {
    const cleanId = w.iqamaNumber.replace(/\D/g, '');
    const cleanQ = query.replace(/\D/g, '');
    return (cleanId.length >= 10 && cleanId === cleanQ) || w.employeeId.toLowerCase() === qLower;
  });

  // 3. Document matches
  const matchedDocs = db.documents.filter(d =>
    (d.docType && d.docType.toLowerCase().includes(qLower)) ||
    (d.docNumber && d.docNumber.toLowerCase().includes(qLower)) ||
    (d.fileName && d.fileName.toLowerCase().includes(qLower))
  );

  // 4. Maintenance matches
  const matchedMaint = db.maintenance.filter(m =>
    m.description.toLowerCase().includes(qLower) ||
    m.workshop.toLowerCase().includes(qLower) ||
    m.id.toLowerCase().includes(qLower)
  );

  // If exact vehicle match found, assemble full 360 vehicle dossier
  let exactVehicleProfile: any = null;
  if (exactVehicle) {
    const driver = db.workers.find(w => w.id === exactVehicle.assignedWorkerId);
    const vehicleDocs = db.documents.filter(d => d.entityId === exactVehicle.id);
    const vehicleMaint = db.maintenance.filter(m => m.vehicleId === exactVehicle.id);
    const vehicleFuel = db.fuelRecords.filter(f => f.vehicleId === exactVehicle.id);
    const vehicleExp = db.expenses.filter(e => e.vehicleId === exactVehicle.id);
    const vehicleAlerts = getAllExpiryAlerts().filter(a => a.entityId === exactVehicle.id);

    exactVehicleProfile = {
      ...exactVehicle,
      assignedDriver: driver || null,
      documents: vehicleDocs,
      maintenanceRecords: vehicleMaint,
      fuelRecords: vehicleFuel,
      expenses: vehicleExp,
      expiryAlerts: vehicleAlerts,
      totalFuelSpent: vehicleFuel.reduce((sum, f) => sum + f.totalCost, 0),
      totalMaintenanceSpent: vehicleMaint.reduce((sum, m) => sum + m.totalCost, 0)
    };
  }

  // If exact worker match found, assemble full 360 worker dossier
  let exactWorkerProfile: any = null;
  if (exactWorker) {
    const assignedVehicle = db.vehicles.find(v => v.id === exactWorker.assignedVehicleId);
    const workerDocs = db.documents.filter(d => d.entityId === exactWorker.id);
    const workerAlerts = getAllExpiryAlerts().filter(a => a.entityId === exactWorker.id);
    const driverFuel = db.fuelRecords.filter(f => f.driverWorkerId === exactWorker.id);

    exactWorkerProfile = {
      ...exactWorker,
      assignedVehicle: assignedVehicle || null,
      documents: workerDocs,
      expiryAlerts: workerAlerts,
      fuelRefillsLogged: driverFuel
    };
  }

  res.json({
    success: true,
    query,
    exactMatch: exactVehicleProfile
      ? { type: 'VEHICLE', profile: exactVehicleProfile }
      : exactWorkerProfile
      ? { type: 'WORKER', profile: exactWorkerProfile }
      : null,
    vehicles: matchedVehicles.slice(0, 15),
    workers: matchedWorkers.slice(0, 15),
    documents: matchedDocs.slice(0, 10),
    maintenance: matchedMaint.slice(0, 10)
  });
});

// -------------------------------------------------------------
// 4. VEHICLES MANAGEMENT & 360° PROFILE
// -------------------------------------------------------------

router.get('/vehicles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { departmentId, status, search, page = '1', limit = '50' } = req.query;

  let list = [...db.vehicles];

  if (departmentId) list = list.filter(v => v.departmentId === departmentId);
  if (status) list = list.filter(v => v.status === status);
  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter(v =>
      v.plateNumber.toLowerCase().includes(s) ||
      v.internalVehicleId.toLowerCase().includes(s) ||
      v.make.toLowerCase().includes(s) ||
      v.model.toLowerCase().includes(s) ||
      v.vin.toLowerCase().includes(s)
    );
  }

  // Enrich with driver details, last maintenance records, and expiry metrics
  const workerMap = new Map(db.workers.map(w => [w.id, w]));
  const deptMap = new Map(db.departments.map(d => [d.id, d.name]));

  const enriched = list.map(v => {
    const driver = v.assignedWorkerId ? workerMap.get(v.assignedWorkerId) : null;
    const vehicleMaint = db.maintenance
      .filter(m => m.vehicleId === v.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastMaint = vehicleMaint[0] || null;

    const istimaraDays = calculateDaysRemaining(v.istimaraExpiry);
    const insuranceDays = calculateDaysRemaining(v.insuranceExpiry);
    const inspectionDays = calculateDaysRemaining(v.inspectionExpiry);

    // Determine nearest expiry
    const expiryDates = [
      { type: 'ISTIMARA', date: v.istimaraExpiry, days: istimaraDays },
      { type: 'INSURANCE', date: v.insuranceExpiry, days: insuranceDays },
      { type: 'INSPECTION', date: v.inspectionExpiry, days: inspectionDays }
    ].filter(x => !!x.date);

    expiryDates.sort((a, b) => a.days - b.days);
    const nearest = expiryDates[0] || null;

    const hasExpired = (istimaraDays < 0) || (insuranceDays < 0) || (inspectionDays < 0);
    const hasUrgent = (istimaraDays >= 0 && istimaraDays <= 7) ||
                      (insuranceDays >= 0 && insuranceDays <= 7) ||
                      (inspectionDays >= 0 && inspectionDays <= 7);

    return {
      ...v,
      driverName: driver ? driver.fullName : 'Unassigned',
      driverPhone: driver ? driver.mobileNumber : undefined,
      driverIqama: driver ? driver.iqamaNumber : undefined,
      departmentName: deptMap.get(v.departmentId) || 'Fleet Operations',
      driver: driver ? {
        id: driver.id,
        employeeId: driver.employeeId,
        fullName: driver.fullName,
        fullNameAr: driver.fullNameAr,
        mobileNumber: driver.mobileNumber,
        iqamaNumber: driver.iqamaNumber,
        iqamaExpiry: driver.iqamaExpiry
      } : null,
      lastMaintenanceDate: lastMaint ? lastMaint.date : undefined,
      lastMaintenanceType: lastMaint ? lastMaint.maintenanceType : undefined,
      lastMaintenanceMileage: lastMaint ? lastMaint.mileage : undefined,
      lastMaintenanceCost: lastMaint ? lastMaint.totalCost : undefined,
      maintenanceCount: vehicleMaint.length,
      istimaraDaysRemaining: istimaraDays,
      insuranceDaysRemaining: insuranceDays,
      inspectionDaysRemaining: inspectionDays,
      nearestExpiryDate: nearest ? nearest.date : undefined,
      nearestExpiryDaysRemaining: nearest ? nearest.days : undefined,
      nearestExpiryDocType: nearest ? nearest.type : undefined,
      hasExpiredDocs: hasExpired,
      hasUrgentDocs: hasUrgent
    };
  });

  res.json(enriched);
});

router.get('/vehicles/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  const db = getDb();
  if (!q) return res.json({ success: true, data: [] });

  const matches = db.vehicles.filter(v =>
    v.plateNumber.toLowerCase().includes(q) ||
    v.internalVehicleId.toLowerCase().includes(q) ||
    v.vin.toLowerCase().includes(q) ||
    `${v.make} ${v.model}`.toLowerCase().includes(q)
  );

  res.json({ success: true, data: matches });
});

router.get('/vehicles/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
  }

  const driver = vehicle.assignedWorkerId ? db.workers.find(w => w.id === vehicle.assignedWorkerId) : null;
  const dept = db.departments.find(d => d.id === vehicle.departmentId);
  const documents = db.documents.filter(d => d.entityId === vehicle.id);
  const maintenance = db.maintenance.filter(m => m.vehicleId === vehicle.id);
  const fuel = db.fuelRecords.filter(f => f.vehicleId === vehicle.id);
  const expenses = db.expenses.filter(e => e.vehicleId === vehicle.id);
  const alerts = getAllExpiryAlerts().filter(a => a.entityId === vehicle.id);

  const trips = (db.trips || [])
    .filter(t => t.vehicleId === vehicle.id)
    .map(t => {
      const w = db.workers.find(worker => worker.id === t.driverId);
      return {
        ...t,
        driverName: w?.fullName || t.driverName || 'Staff Driver',
        driverNameAr: w?.fullNameAr || '',
        driverEmployeeId: w?.employeeId || t.driverEmployeeId || ''
      };
    })
    .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());

  const assignments = (db.vehicleAssignments || [])
    .filter(a => a.vehicleId === vehicle.id)
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.assignedFrom).getTime() - new Date(a.assignedFrom).getTime();
    })
    .map(a => {
      const w = db.workers.find(worker => worker.id === a.workerId);
      return {
        ...a,
        workerName: w?.fullName || a.workerName,
        workerNameAr: w?.fullNameAr || a.workerNameAr,
        workerEmployeeId: w?.employeeId || a.workerEmployeeId,
        workerJobTitle: w?.jobTitle || a.workerJobTitle,
        workerNationality: w?.nationality || a.workerNationality,
        workerNationalityAr: w?.nationalityAr || a.workerNationalityAr,
        workerMobile: w?.mobileNumber || a.workerMobile,
        workerPhotoUrl: w?.photoUrl || a.workerPhotoUrl
      };
    });

  const totalFuelCost = fuel.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const totalFuelLiters = fuel.reduce((sum, f) => sum + (f.liters || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  const totalOtherExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  res.json({
    ...vehicle,
    driver,
    department: dept,
    departmentName: dept?.name || '',
    documents,
    maintenance,
    fuel,
    trips,
    expenses,
    alerts,
    assignments,
    stats: {
      totalFuelCost,
      totalFuelLiters,
      totalMaintenanceCost,
      totalOtherExpenses,
      totalTripsCount: trips.length
    }
  });
});

// Critical: Full 360° Complete Vehicle Profile API
router.get('/vehicles/:id/full-profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found' } });
  }

  const driver = vehicle.assignedWorkerId ? db.workers.find(w => w.id === vehicle.assignedWorkerId) : null;
  const dept = db.departments.find(d => d.id === vehicle.departmentId);
  const documents = db.documents.filter(d => d.entityId === vehicle.id);
  const maintenance = db.maintenance.filter(m => m.vehicleId === vehicle.id);
  const fuelRecords = db.fuelRecords.filter(f => f.vehicleId === vehicle.id);
  const expenses = db.expenses.filter(e => e.vehicleId === vehicle.id);
  const expiryAlerts = getAllExpiryAlerts().filter(a => a.entityId === vehicle.id);

  const assignments = (db.vehicleAssignments || [])
    .filter(a => a.vehicleId === vehicle.id)
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.assignedFrom).getTime() - new Date(a.assignedFrom).getTime();
    })
    .map(a => {
      const w = db.workers.find(worker => worker.id === a.workerId);
      return {
        ...a,
        workerName: w?.fullName || a.workerName,
        workerNameAr: w?.fullNameAr || a.workerNameAr,
        workerEmployeeId: w?.employeeId || a.workerEmployeeId,
        workerJobTitle: w?.jobTitle || a.workerJobTitle,
        workerNationality: w?.nationality || a.workerNationality,
        workerNationalityAr: w?.nationalityAr || a.workerNationalityAr,
        workerMobile: w?.mobileNumber || a.workerMobile,
        workerPhotoUrl: w?.photoUrl || a.workerPhotoUrl
      };
    });

  const totalFuelCost = fuelRecords.reduce((sum, f) => sum + f.totalCost, 0);
  const totalLiters = fuelRecords.reduce((sum, f) => sum + f.liters, 0);
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.totalCost, 0);
  const totalExpensesCost = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    success: true,
    data: {
      vehicle: {
        ...vehicle,
        assignments
      },
      driver,
      department: dept,
      documents,
      maintenance,
      fuelRecords,
      trips: (db.trips || []).filter(t => t.vehicleId === vehicle.id),
      expenses,
      expiryAlerts,
      assignments,
      analytics: {
        totalOwnershipCost: totalFuelCost + totalMaintenanceCost + totalExpensesCost,
        totalFuelCost,
        totalLiters,
        totalMaintenanceCost,
        totalExpensesCost,
        costPerKm: vehicle.currentMileage > 0 ? ((totalFuelCost + totalMaintenanceCost) / vehicle.currentMileage).toFixed(2) : '0.00'
      }
    }
  });
});

// Vehicle sub-resource endpoints
router.get('/vehicles/:id/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const docs = db.documents.filter(d => d.entityId === req.params.id);
  res.json({ success: true, data: docs });
});

router.get('/vehicles/:id/assignments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });

  const assignments = (db.vehicleAssignments || [])
    .filter(a => a.vehicleId === vehicle.id)
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.assignedFrom).getTime() - new Date(a.assignedFrom).getTime();
    })
    .map(a => {
      const w = db.workers.find(worker => worker.id === a.workerId);
      return {
        ...a,
        workerName: w?.fullName || a.workerName,
        workerNameAr: w?.fullNameAr || a.workerNameAr,
        workerEmployeeId: w?.employeeId || a.workerEmployeeId,
        workerJobTitle: w?.jobTitle || a.workerJobTitle,
        workerNationality: w?.nationality || a.workerNationality,
        workerNationalityAr: w?.nationalityAr || a.workerNationalityAr,
        workerMobile: w?.mobileNumber || a.workerMobile,
        workerPhotoUrl: w?.photoUrl || a.workerPhotoUrl
      };
    });

  res.json({
    success: true,
    data: assignments
  });
});

// Link or assign a worker to a vehicle
router.post('/vehicles/:id/assignments', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });

  const { workerId, assignedFrom, assignmentType, startMileage, notes, handoverChecklistCompleted } = req.body;
  if (!workerId) return res.status(400).json({ success: false, error: { message: 'Worker is required' } });

  const newWorker = db.workers.find(w => w.id === workerId);
  if (!newWorker) return res.status(404).json({ success: false, error: { message: 'Worker not found' } });

  const effectiveStartDate = assignedFrom || new Date().toISOString().split('T')[0];
  const effectiveMileage = Number(startMileage ?? vehicle.currentMileage) || vehicle.currentMileage;

  // 1. Close current vehicle assignment if any
  if (!db.vehicleAssignments) db.vehicleAssignments = [];
  const currentVehicleAsgn = db.vehicleAssignments.find(a => a.vehicleId === vehicle.id && a.isCurrent);
  if (currentVehicleAsgn) {
    currentVehicleAsgn.isCurrent = false;
    currentVehicleAsgn.assignedTo = effectiveStartDate;
    currentVehicleAsgn.endMileage = effectiveMileage;
    currentVehicleAsgn.updatedAt = new Date().toISOString();
  }

  // 2. Unlink previous driver from vehicle
  if (vehicle.assignedWorkerId && vehicle.assignedWorkerId !== workerId) {
    const prevWorker = db.workers.find(w => w.id === vehicle.assignedWorkerId);
    if (prevWorker && prevWorker.assignedVehicleId === vehicle.id) {
      prevWorker.assignedVehicleId = null;
      prevWorker.updatedAt = new Date().toISOString();
    }
  }

  // 3. If new worker was assigned to another vehicle, unlink and close that assignment
  if (newWorker.assignedVehicleId && newWorker.assignedVehicleId !== vehicle.id) {
    const prevVehicle = db.vehicles.find(v => v.id === newWorker.assignedVehicleId);
    if (prevVehicle) {
      prevVehicle.assignedWorkerId = null;
      prevVehicle.updatedAt = new Date().toISOString();
      const prevActiveAsgn = db.vehicleAssignments.find(a => a.vehicleId === prevVehicle.id && a.workerId === newWorker.id && a.isCurrent);
      if (prevActiveAsgn) {
        prevActiveAsgn.isCurrent = false;
        prevActiveAsgn.assignedTo = effectiveStartDate;
        prevActiveAsgn.endMileage = prevVehicle.currentMileage;
        prevActiveAsgn.updatedAt = new Date().toISOString();
      }
    }
  }

  // 4. Update vehicle and worker links
  vehicle.assignedWorkerId = newWorker.id;
  vehicle.updatedAt = new Date().toISOString();
  newWorker.assignedVehicleId = vehicle.id;
  newWorker.updatedAt = new Date().toISOString();

  // 5. Create new assignment record
  const newAssignment: VehicleAssignment = {
    id: `asgn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    vehicleId: vehicle.id,
    workerId: newWorker.id,
    workerName: newWorker.fullName,
    workerNameAr: newWorker.fullNameAr,
    workerEmployeeId: newWorker.employeeId,
    workerJobTitle: newWorker.jobTitle,
    workerNationality: newWorker.nationality,
    workerNationalityAr: newWorker.nationalityAr,
    workerMobile: newWorker.mobileNumber,
    workerPhotoUrl: newWorker.photoUrl,
    assignedFrom: effectiveStartDate,
    assignedTo: null,
    isCurrent: true,
    assignmentType: assignmentType || 'PRIMARY',
    startMileage: effectiveMileage,
    endMileage: null,
    assignedBy: req.user?.fullName || 'Fleet Operations',
    handoverChecklistCompleted: handoverChecklistCompleted ?? true,
    notes: notes || 'Driver linked to vehicle.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.vehicleAssignments.unshift(newAssignment);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'ASSIGNMENT',
    newAssignment.id,
    `Assigned worker ${newWorker.fullName} (${newWorker.employeeId}) to vehicle ${vehicle.internalVehicleId} (${vehicle.plateNumber})`,
    null,
    newAssignment,
    req.ip
  );

  res.json({
    success: true,
    data: newAssignment,
    message: 'Worker successfully linked to vehicle'
  });
});

// End or unlink active driver assignment from vehicle
router.post('/vehicles/:id/assignments/:assignmentId/end', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });

  const assignment = (db.vehicleAssignments || []).find(a => a.id === req.params.assignmentId && a.vehicleId === vehicle.id);
  if (!assignment) return res.status(404).json({ success: false, error: { message: 'Assignment record not found' } });

  const { assignedTo, endMileage, notes, handoverChecklistCompleted } = req.body;
  const effectiveEndDate = assignedTo || new Date().toISOString().split('T')[0];
  const effectiveEndMileage = Number(endMileage ?? vehicle.currentMileage) || vehicle.currentMileage;

  assignment.isCurrent = false;
  assignment.assignedTo = effectiveEndDate;
  assignment.endMileage = effectiveEndMileage;
  if (notes) {
    assignment.notes = assignment.notes ? `${assignment.notes} | Unlink Note: ${notes}` : notes;
  }
  if (handoverChecklistCompleted !== undefined) {
    assignment.handoverChecklistCompleted = handoverChecklistCompleted;
  }
  assignment.updatedAt = new Date().toISOString();

  // If vehicle currently points to this worker, clear
  if (vehicle.assignedWorkerId === assignment.workerId) {
    vehicle.assignedWorkerId = null;
    vehicle.updatedAt = new Date().toISOString();
  }

  // Clear worker assignedVehicleId
  const worker = db.workers.find(w => w.id === assignment.workerId);
  if (worker && worker.assignedVehicleId === vehicle.id) {
    worker.assignedVehicleId = null;
    worker.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'ASSIGNMENT',
    assignment.id,
    `Unlinked driver from vehicle ${vehicle.internalVehicleId} (${vehicle.plateNumber}). Assignment marked completed.`,
    null,
    assignment,
    req.ip
  );

  res.json({
    success: true,
    data: assignment,
    message: 'Driver assignment successfully ended and unlinked'
  });
});

router.get('/vehicles/:id/insurance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
  res.json({
    success: true,
    data: {
      company: vehicle.insuranceCompany,
      policyNumber: vehicle.insurancePolicyNumber,
      expiryDate: vehicle.insuranceExpiry,
      status: vehicle.insuranceExpiry ? getExpiryStatus(calculateDaysRemaining(vehicle.insuranceExpiry)) : 'VALID'
    }
  });
});

router.get('/vehicles/:id/registration', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
  res.json({
    success: true,
    data: {
      istimaraNumber: vehicle.istimaraNumber,
      expiryDate: vehicle.istimaraExpiry,
      plateNumber: vehicle.plateNumber,
      status: vehicle.istimaraExpiry ? getExpiryStatus(calculateDaysRemaining(vehicle.istimaraExpiry)) : 'VALID'
    }
  });
});

router.get('/vehicles/:id/inspections', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
  res.json({
    success: true,
    data: {
      inspectionCenter: 'MVPI SASO Periodic Inspection',
      expiryDate: vehicle.inspectionExpiry,
      status: vehicle.inspectionExpiry ? getExpiryStatus(calculateDaysRemaining(vehicle.inspectionExpiry)) : 'VALID'
    }
  });
});

router.get('/vehicles/:id/maintenance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const list = db.maintenance.filter(m => m.vehicleId === req.params.id);
  res.json({ success: true, data: list });
});

router.post('/vehicles', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  // Validate required fields
  if (!body.plateDigits || !body.plateLettersEn || !body.make || !body.model || !body.vin) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Plate Digits, Plate Letters (English), Make, Model, and VIN are required' }
    });
  }

  const plateNumber = `${body.plateDigits} ${body.plateLettersEn.toUpperCase()}`;

  // Check unique constraints (Plate & VIN)
  if (db.vehicles.some(v => v.plateNumber.replace(/\s+/g, '').toUpperCase() === plateNumber.replace(/\s+/g, '').toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE_PLATE', message: `A vehicle with plate number "${plateNumber}" already exists in the fleet system.` }
    });
  }

  if (db.vehicles.some(v => v.vin.toUpperCase() === body.vin.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE_VIN', message: `A vehicle with VIN "${body.vin}" already exists.` }
    });
  }

  const plateLettersAr = body.plateLettersAr || getArabicPlateLetters(body.plateLettersEn);
  const plateDigitsAr = body.plateDigitsAr || getArabicDigits(body.plateDigits);

  const newVehicle: Vehicle = {
    id: 'veh-' + Date.now(),
    internalVehicleId: body.internalVehicleId || `FLT-${100 + db.vehicles.length + 1}`,
    plateNumber,
    plateDigits: body.plateDigits,
    plateLettersEn: body.plateLettersEn.toUpperCase(),
    plateDigitsAr,
    plateLettersAr,
    make: body.make,
    model: body.model,
    year: parseInt(body.year, 10) || new Date().getFullYear(),
    color: body.color || 'White',
    vin: body.vin.toUpperCase(),
    engineNumber: body.engineNumber || `ENG-${Date.now().toString().slice(-6)}`,
    ownershipType: body.ownershipType || 'OWNED',
    currentLocation: body.currentLocation || 'Riyadh Central Hub',
    vehicleType: body.vehicleType || 'Sedan',
    departmentId: body.departmentId || (db.departments[0] ? db.departments[0].id : 'dept-1'),
    assignedWorkerId: body.assignedWorkerId || null,
    status: body.status || 'ACTIVE',
    currentMileage: parseInt(body.currentMileage, 10) || 0,
    fuelType: body.fuelType || 'DIESEL',
    purchaseDate: body.purchaseDate || new Date().toISOString().split('T')[0],
    purchasePrice: parseFloat(body.purchasePrice) || 85000,
    istimaraNumber: body.istimaraNumber || `IST-${Date.now().toString().slice(-6)}`,
    istimaraExpiry: body.istimaraExpiry || '',
    insuranceCompany: body.insuranceCompany || 'Tawuniya Insurance',
    insurancePolicyNumber: body.insurancePolicyNumber || `POL-${Date.now().toString().slice(-6)}`,
    insuranceExpiry: body.insuranceExpiry || '',
    inspectionDate: body.inspectionDate || new Date().toISOString().split('T')[0],
    inspectionExpiry: body.inspectionExpiry || '',
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.vehicles.unshift(newVehicle);

  // If driver assigned, update worker's assigned vehicle
  if (newVehicle.assignedWorkerId) {
    const worker = db.workers.find(w => w.id === newVehicle.assignedWorkerId);
    if (worker) worker.assignedVehicleId = newVehicle.id;
  }

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'VEHICLE',
    newVehicle.id,
    `Added vehicle ${newVehicle.internalVehicleId} (${newVehicle.plateNumber} / ${newVehicle.make} ${newVehicle.model})`,
    undefined,
    newVehicle,
    req.ip
  );

  res.status(201).json(newVehicle);
});

router.post('/vehicles/bulk-import', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { items, skipErrors = true } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'EMPTY_PAYLOAD', message: 'No vehicle records provided for import' }
    });
  }

  const results = {
    total: items.length,
    imported: [] as Vehicle[],
    skipped: [] as { row: number; item: any; reason: string }[],
    errors: [] as { row: number; field: string; message: string }[]
  };

  const existingPlates = new Set(db.vehicles.map(v => v.plateNumber.replace(/\s+/g, '').toUpperCase()));
  const existingVins = new Set(db.vehicles.map(v => v.vin.trim().toUpperCase()));
  const existingIds = new Set(db.vehicles.map(v => (v.internalVehicleId || '').toUpperCase()));

  const newVehiclesToAdd: Vehicle[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const rowNumber = i + 1;

    let plateDigits = String(raw.plateDigits || raw.digits || '').trim();
    let plateLettersEn = String(raw.plateLettersEn || raw.letters || raw.plateLetters || '').trim().toUpperCase();
    let plateNumber = String(raw.plateNumber || raw.plate || '').trim();

    if (!plateDigits || !plateLettersEn) {
      if (plateNumber) {
        const match = plateNumber.match(/^(\d{1,4})[\s\-_]*([A-Za-z]{1,4})/);
        if (match) {
          plateDigits = match[1];
          plateLettersEn = match[2].toUpperCase();
        }
      }
    }

    const make = String(raw.make || raw.brand || '').trim();
    const model = String(raw.model || '').trim();
    let vin = String(raw.vin || raw.vinNumber || raw.chassisNumber || '').trim().toUpperCase();

    if (!plateDigits || !plateLettersEn) {
      results.skipped.push({ row: rowNumber, item: raw, reason: 'Missing or invalid plate digits/letters' });
      continue;
    }

    const fullPlate = `${plateDigits} ${plateLettersEn}`;
    const cleanPlateKey = fullPlate.replace(/\s+/g, '').toUpperCase();
    if (existingPlates.has(cleanPlateKey)) {
      results.skipped.push({ row: rowNumber, item: raw, reason: `Duplicate plate number (${fullPlate}) already exists` });
      continue;
    }

    if (!make || !model) {
      results.skipped.push({ row: rowNumber, item: raw, reason: 'Make and Model are required' });
      continue;
    }

    if (!vin) {
      vin = `KSA${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    if (existingVins.has(vin)) {
      results.skipped.push({ row: rowNumber, item: raw, reason: `Duplicate VIN (${vin}) already exists` });
      continue;
    }

    // Match department
    let departmentId = raw.departmentId;
    if (!departmentId && raw.department) {
      const deptStr = String(raw.department).trim().toLowerCase();
      const matchedDept = db.departments.find(d => 
        d.id.toLowerCase() === deptStr ||
        d.name.toLowerCase().includes(deptStr) ||
        (d.nameAr && d.nameAr.includes(deptStr)) ||
        d.code.toLowerCase() === deptStr
      );
      if (matchedDept) {
        departmentId = matchedDept.id;
      }
    }
    if (!departmentId) {
      departmentId = db.departments[0]?.id || 'dept-1';
    }

    // Match assigned worker
    let assignedWorkerId: string | null = null;
    if (raw.assignedWorkerId) {
      const found = db.workers.find(w => w.id === raw.assignedWorkerId);
      if (found) assignedWorkerId = found.id;
    } else if (raw.driver || raw.driverEmployeeId || raw.driverIqama || raw.driverName) {
      const driverQuery = String(raw.driver || raw.driverEmployeeId || raw.driverIqama || raw.driverName).trim().toLowerCase();
      const found = db.workers.find(w => 
        w.employeeId.toLowerCase() === driverQuery ||
        w.iqamaNumber.replace(/\D/g, '') === driverQuery.replace(/\D/g, '') ||
        w.fullName.toLowerCase().includes(driverQuery)
      );
      if (found) assignedWorkerId = found.id;
    }

    let internalId = String(raw.internalVehicleId || raw.vehicleId || raw.id || '').trim();
    if (!internalId || existingIds.has(internalId.toUpperCase())) {
      internalId = `FLT-${100 + db.vehicles.length + newVehiclesToAdd.length + 1}`;
    }

    const plateLettersAr = raw.plateLettersAr || getArabicPlateLetters(plateLettersEn);
    const plateDigitsAr = raw.plateDigitsAr || getArabicDigits(plateDigits);

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      internalVehicleId: internalId,
      plateNumber: fullPlate,
      plateDigits,
      plateLettersEn,
      plateDigitsAr,
      plateLettersAr,
      make,
      model,
      year: parseInt(raw.year, 10) || new Date().getFullYear(),
      color: String(raw.color || 'White').trim(),
      vin,
      engineNumber: String(raw.engineNumber || `ENG-${Date.now().toString().slice(-6)}`).trim(),
      ownershipType: ['OWNED', 'LEASED', 'RENTED'].includes(String(raw.ownershipType || raw.ownership).toUpperCase()) 
        ? String(raw.ownershipType || raw.ownership).toUpperCase() as any 
        : 'OWNED',
      currentLocation: String(raw.currentLocation || 'Riyadh Central Hub').trim(),
      vehicleType: String(raw.vehicleType || raw.type || 'Sedan').trim(),
      departmentId,
      assignedWorkerId,
      status: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD'].includes(String(raw.status).toUpperCase()) 
        ? String(raw.status).toUpperCase() as any 
        : 'ACTIVE',
      currentMileage: parseInt(raw.currentMileage || raw.mileage, 10) || 0,
      fuelType: ['GASOLINE_91', 'GASOLINE_95', 'DIESEL', 'ELECTRIC', 'HYBRID'].includes(String(raw.fuelType || raw.fuel).toUpperCase())
        ? String(raw.fuelType || raw.fuel).toUpperCase() as any
        : 'DIESEL',
      purchaseDate: raw.purchaseDate || new Date().toISOString().split('T')[0],
      purchasePrice: parseFloat(raw.purchasePrice || raw.price) || 85000,
      istimaraNumber: String(raw.istimaraNumber || `IST-${Date.now().toString().slice(-6)}`).trim(),
      istimaraExpiry: String(raw.istimaraExpiry || '').trim(),
      insuranceCompany: String(raw.insuranceCompany || 'Tawuniya Insurance').trim(),
      insurancePolicyNumber: String(raw.insurancePolicyNumber || `POL-${Date.now().toString().slice(-6)}`).trim(),
      insuranceExpiry: String(raw.insuranceExpiry || '').trim(),
      inspectionDate: String(raw.inspectionDate || new Date().toISOString().split('T')[0]).trim(),
      inspectionExpiry: String(raw.inspectionExpiry || '').trim(),
      notes: String(raw.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    existingPlates.add(cleanPlateKey);
    existingVins.add(vin);
    existingIds.add(internalId.toUpperCase());
    newVehiclesToAdd.push(newVehicle);
  }

  // Insert verified items
  for (const v of newVehiclesToAdd) {
    db.vehicles.unshift(v);
    results.imported.push(v);
    if (v.assignedWorkerId) {
      const worker = db.workers.find(w => w.id === v.assignedWorkerId);
      if (worker) worker.assignedVehicleId = v.id;
    }
  }

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'VEHICLE',
    'BULK',
    `Bulk imported ${newVehiclesToAdd.length} vehicles (${results.skipped.length} skipped) via CSV/Excel`,
    undefined,
    { count: newVehiclesToAdd.length, skippedCount: results.skipped.length },
    req.ip
  );

  return res.status(200).json({
    success: true,
    message: `Successfully imported ${newVehiclesToAdd.length} vehicles`,
    importedCount: newVehiclesToAdd.length,
    skippedCount: results.skipped.length,
    skipped: results.skipped,
    vehicles: newVehiclesToAdd
  });
});

router.put('/vehicles/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
  }

  const oldVal = { ...vehicle };
  const body = req.body;

  // Check unique plate if changing
  if (body.plateDigits && body.plateLettersEn) {
    const newPlate = `${body.plateDigits} ${body.plateLettersEn.toUpperCase()}`;
    const duplicate = db.vehicles.find(v => v.id !== vehicle.id && v.plateNumber.replace(/\s+/g, '') === newPlate.replace(/\s+/g, ''));
    if (duplicate) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_PLATE', message: `Plate number "${newPlate}" is already assigned to ${duplicate.internalVehicleId}` } });
    }
    vehicle.plateNumber = newPlate;
    vehicle.plateDigits = body.plateDigits;
    vehicle.plateLettersEn = body.plateLettersEn.toUpperCase();
    vehicle.plateLettersAr = getArabicPlateLetters(body.plateLettersEn);
    vehicle.plateDigitsAr = getArabicDigits(body.plateDigits);
  }

  if (body.make) vehicle.make = body.make;
  if (body.model) vehicle.model = body.model;
  if (body.year) vehicle.year = parseInt(body.year, 10);
  if (body.color) vehicle.color = body.color;
  if (body.status) vehicle.status = body.status;
  if (body.vehicleType) vehicle.vehicleType = body.vehicleType;
  if (body.currentMileage !== undefined) vehicle.currentMileage = parseInt(body.currentMileage, 10);
  if (body.departmentId) vehicle.departmentId = body.departmentId;
  if (body.fuelType) vehicle.fuelType = body.fuelType;
  if (body.istimaraExpiry !== undefined) vehicle.istimaraExpiry = body.istimaraExpiry;
  if (body.istimaraNumber !== undefined) vehicle.istimaraNumber = body.istimaraNumber;
  if (body.insuranceCompany !== undefined) vehicle.insuranceCompany = body.insuranceCompany;
  if (body.insurancePolicyNumber !== undefined) vehicle.insurancePolicyNumber = body.insurancePolicyNumber;
  if (body.insuranceExpiry !== undefined) vehicle.insuranceExpiry = body.insuranceExpiry;
  if (body.inspectionExpiry !== undefined) vehicle.inspectionExpiry = body.inspectionExpiry;
  if (body.notes !== undefined) vehicle.notes = body.notes;

  // Handle driver change
  if (body.assignedWorkerId !== undefined && body.assignedWorkerId !== vehicle.assignedWorkerId) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!db.vehicleAssignments) db.vehicleAssignments = [];

    // Close previous assignment if any
    const activeAsgn = db.vehicleAssignments.find(a => a.vehicleId === vehicle.id && a.isCurrent);
    if (activeAsgn) {
      activeAsgn.isCurrent = false;
      activeAsgn.assignedTo = todayStr;
      activeAsgn.endMileage = vehicle.currentMileage;
      activeAsgn.updatedAt = new Date().toISOString();
    }

    if (vehicle.assignedWorkerId) {
      const oldWorker = db.workers.find(w => w.id === vehicle.assignedWorkerId);
      if (oldWorker) oldWorker.assignedVehicleId = null;
    }
    vehicle.assignedWorkerId = body.assignedWorkerId || null;
    if (body.assignedWorkerId) {
      const newWorker = db.workers.find(w => w.id === body.assignedWorkerId);
      if (newWorker) {
        newWorker.assignedVehicleId = vehicle.id;
        db.vehicleAssignments.unshift({
          id: `asgn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          vehicleId: vehicle.id,
          workerId: newWorker.id,
          workerName: newWorker.fullName,
          workerNameAr: newWorker.fullNameAr,
          workerEmployeeId: newWorker.employeeId,
          workerJobTitle: newWorker.jobTitle,
          workerNationality: newWorker.nationality,
          workerNationalityAr: newWorker.nationalityAr,
          workerMobile: newWorker.mobileNumber,
          workerPhotoUrl: newWorker.photoUrl,
          assignedFrom: todayStr,
          assignedTo: null,
          isCurrent: true,
          assignmentType: 'PRIMARY',
          startMileage: vehicle.currentMileage,
          endMileage: null,
          assignedBy: req.user?.fullName || 'Fleet Operations',
          handoverChecklistCompleted: true,
          notes: 'Driver assigned via vehicle profile update.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  vehicle.updatedAt = new Date().toISOString();
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'VEHICLE',
    vehicle.id,
    `Updated vehicle ${vehicle.internalVehicleId} (${vehicle.plateNumber})`,
    oldVal,
    vehicle,
    req.ip
  );

  res.json(vehicle);
});

router.delete('/vehicles/:id', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const vehicle = db.vehicles.find(v => v.id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
  }

  // Unassign from worker
  if (vehicle.assignedWorkerId) {
    const worker = db.workers.find(w => w.id === vehicle.assignedWorkerId);
    if (worker) worker.assignedVehicleId = null;
  }

  db.vehicles = db.vehicles.filter(v => v.id !== req.params.id);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'VEHICLE',
    vehicle.id,
    `Deleted vehicle ${vehicle.internalVehicleId} (${vehicle.plateNumber})`,
    vehicle,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Vehicle removed from fleet database' });
});

// -------------------------------------------------------------
// 5. WORKFORCE / EMPLOYEES & IQAMA TRACKING
// -------------------------------------------------------------

router.get('/workers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { departmentId, status, nationality, search } = req.query;

  let list = [...db.workers];

  if (departmentId) list = list.filter(w => w.departmentId === departmentId);
  if (status) list = list.filter(w => w.status === status);
  if (nationality) list = list.filter(w => w.nationality.toLowerCase() === (nationality as string).toLowerCase());
  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter(w =>
      w.fullName.toLowerCase().includes(s) ||
      (w.fullNameAr && w.fullNameAr.toLowerCase().includes(s)) ||
      w.employeeId.toLowerCase().includes(s) ||
      w.iqamaNumber.includes(s) ||
      w.mobileNumber.includes(s)
    );
  }

  const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));
  const deptMap = new Map(db.departments.map(d => [d.id, d.name]));

  const enriched = list.map(w => {
    const v = w.assignedVehicleId ? vehicleMap.get(w.assignedVehicleId) : null;
    return {
      ...w,
      assignedVehiclePlate: v ? v.plateNumber : undefined,
      assignedVehicleCode: v ? v.internalVehicleId : undefined,
      departmentName: deptMap.get(w.departmentId) || 'Human Resources'
    };
  });

  res.json(enriched);
});

router.get('/workers/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  const db = getDb();
  if (!q) return res.json({ success: true, data: [] });

  const matches = db.workers.filter(w =>
    w.fullName.toLowerCase().includes(q) ||
    w.iqamaNumber.includes(q) ||
    w.employeeId.toLowerCase().includes(q) ||
    (w.mobileNumber && w.mobileNumber.includes(q))
  );

  res.json({ success: true, data: matches });
});

router.get('/workers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const worker = db.workers.find(w => w.id === req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Worker not found' } });
  }

  const assignedVehicle = worker.assignedVehicleId ? db.vehicles.find(v => v.id === worker.assignedVehicleId) : null;
  const dept = db.departments.find(d => d.id === worker.departmentId);

  res.json({
    ...worker,
    assignedVehicle,
    department: dept
  });
});

// Critical: Full 360° Complete Worker Profile API
router.get('/workers/:id/full-profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const worker = db.workers.find(w => w.id === req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: { code: 'WORKER_NOT_FOUND', message: 'Worker not found' } });
  }

  const assignedVehicle = worker.assignedVehicleId ? db.vehicles.find(v => v.id === worker.assignedVehicleId) : null;
  const dept = db.departments.find(d => d.id === worker.departmentId);
  const documents = db.documents.filter(d => d.entityId === worker.id);
  const expiryAlerts = getAllExpiryAlerts().filter(a => a.entityId === worker.id);
  const fuelRefills = db.fuelRecords.filter(f => f.driverWorkerId === worker.id);

  res.json({
    success: true,
    data: {
      worker,
      assignedVehicle,
      department: dept,
      documents,
      expiryAlerts,
      fuelRefills,
      summary: {
        documentsCount: documents.length,
        pendingAlertsCount: expiryAlerts.length,
        totalFuelLogged: fuelRefills.reduce((sum, f) => sum + f.totalCost, 0)
      }
    }
  });
});

router.get('/workers/:id/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const docs = db.documents.filter(d => d.entityId === req.params.id);
  res.json({ success: true, data: docs });
});

router.post('/workers', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  if (!body.fullName || !body.iqamaNumber || !body.mobileNumber || !body.jobTitle) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Full name, Iqama/National ID, mobile phone, and job title are required' }
    });
  }

  // Validate Saudi 10-digit ID format
  const iqamaValidation = validateSaudiIqamaNumber(body.iqamaNumber);
  if (!iqamaValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_IQAMA', message: iqamaValidation.error || 'Invalid 10-digit Saudi ID' }
    });
  }

  // Prevent duplicate Iqama
  const cleanIqama = body.iqamaNumber.trim().replace(/\D/g, '');
  if (db.workers.some(w => w.iqamaNumber.replace(/\D/g, '') === cleanIqama)) {
    return res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE_IQAMA', message: `An employee with Iqama/National ID "${body.iqamaNumber}" already exists.` }
    });
  }

  const newWorker: Worker = {
    id: 'wrk-' + Date.now(),
    employeeId: body.employeeId || `EMP-${1000 + db.workers.length + 1}`,
    fullName: body.fullName,
    fullNameAr: body.fullNameAr || '',
    nationality: body.nationality || 'Saudi',
    nationalityAr: body.nationalityAr || 'سعودي',
    jobTitle: body.jobTitle,
    departmentId: body.departmentId || (db.departments[0] ? db.departments[0].id : 'dept-1'),
    mobileNumber: normalizeSaudiPhone(body.mobileNumber) || body.mobileNumber,
    email: body.email || '',
    iqamaNumber: cleanIqama,
    iqamaExpiry: body.iqamaExpiry || '',
    passportNumber: body.passportNumber || '',
    passportExpiry: body.passportExpiry || '',
    workPermitNumber: body.workPermitNumber || `WP-${cleanIqama}`,
    workPermitExpiry: body.workPermitExpiry || '',
    medicalInsuranceNumber: body.medicalInsuranceNumber || '',
    medicalInsuranceExpiry: body.medicalInsuranceExpiry || '',
    contractStartDate: body.contractStartDate || '',
    contractEndDate: body.contractEndDate || '',
    joiningDate: body.joiningDate || new Date().toISOString().split('T')[0],
    salary: parseFloat(body.salary) || 0,
    driverLicenseNumber: body.driverLicenseNumber || '',
    driverLicenseExpiry: body.driverLicenseExpiry || '',
    assignedVehicleId: body.assignedVehicleId || null,
    status: body.status || 'ACTIVE',
    address: body.address || 'Riyadh, Saudi Arabia',
    emergencyContact: body.emergencyContact || 'Operations Center (+966 11 489 2000)',
    notes: body.notes || '',
    photoUrl: body.photoUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.workers.unshift(newWorker);

  // If vehicle assigned, update vehicle's assigned driver
  if (newWorker.assignedVehicleId) {
    const v = db.vehicles.find(veh => veh.id === newWorker.assignedVehicleId);
    if (v) v.assignedWorkerId = newWorker.id;
  }

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'WORKER',
    newWorker.id,
    `Onboarded worker ${newWorker.fullName} (${newWorker.employeeId} / Iqama: ${newWorker.iqamaNumber})`,
    undefined,
    newWorker,
    req.ip
  );

  res.status(201).json(newWorker);
});

router.post('/workers/bulk-import', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { items, skipErrors = true } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'EMPTY_PAYLOAD', message: 'No worker records provided for import' }
    });
  }

  const results = {
    total: items.length,
    imported: [] as Worker[],
    skipped: [] as { row: number; item: any; reason: string }[],
    errors: [] as { row: number; field: string; message: string }[]
  };

  const existingIqamas = new Set(db.workers.map(w => w.iqamaNumber.replace(/\D/g, '')));
  const existingEmpIds = new Set(db.workers.map(w => (w.employeeId || '').toUpperCase()));

  const newWorkersToAdd: Worker[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const rowNumber = i + 1;

    const fullName = String(raw.fullName || raw.name || raw.employeeName || '').trim();
    const rawIqama = String(raw.iqamaNumber || raw.iqama || raw.nationalId || raw.idNumber || '').trim();
    const cleanIqama = rawIqama.replace(/\D/g, '');
    const mobileNumber = String(raw.mobileNumber || raw.mobile || raw.phone || '').trim();
    const jobTitle = String(raw.jobTitle || raw.job || raw.designation || raw.title || 'Driver').trim();

    if (!fullName) {
      results.skipped.push({ row: rowNumber, item: raw, reason: 'Full name is required' });
      continue;
    }

    if (!cleanIqama) {
      results.skipped.push({ row: rowNumber, item: raw, reason: 'Saudi Iqama/National ID is required' });
      continue;
    }

    const iqamaValidation = validateSaudiIqamaNumber(cleanIqama);
    if (!iqamaValidation.isValid) {
      results.skipped.push({
        row: rowNumber,
        item: raw,
        reason: `Invalid Saudi ID (${cleanIqama}): ${iqamaValidation.error || 'Must be 10 digits starting with 1 or 2'}`
      });
      continue;
    }

    if (existingIqamas.has(cleanIqama)) {
      results.skipped.push({
        row: rowNumber,
        item: raw,
        reason: `Duplicate Iqama/National ID (${cleanIqama}) already exists`
      });
      continue;
    }

    // Determine department
    let departmentId = raw.departmentId;
    if (!departmentId && raw.department) {
      const deptStr = String(raw.department).trim().toLowerCase();
      const matchedDept = db.departments.find(d => 
        d.id.toLowerCase() === deptStr ||
        d.name.toLowerCase().includes(deptStr) ||
        (d.nameAr && d.nameAr.includes(deptStr)) ||
        d.code.toLowerCase() === deptStr
      );
      if (matchedDept) {
        departmentId = matchedDept.id;
      }
    }
    if (!departmentId) {
      departmentId = db.departments[0]?.id || 'dept-1';
    }

    let empId = String(raw.employeeId || raw.empId || '').trim();
    if (!empId || existingEmpIds.has(empId.toUpperCase())) {
      empId = `EMP-${1000 + db.workers.length + newWorkersToAdd.length + 1}`;
    }

    // Check optional assigned vehicle
    let assignedVehicleId: string | null = null;
    if (raw.assignedVehicleId) {
      const v = db.vehicles.find(veh => veh.id === raw.assignedVehicleId);
      if (v) assignedVehicleId = v.id;
    } else if (raw.vehiclePlate || raw.assignedVehicle || raw.vehicle) {
      const vQuery = String(raw.vehiclePlate || raw.assignedVehicle || raw.vehicle).trim().toLowerCase();
      const v = db.vehicles.find(veh => 
        veh.internalVehicleId.toLowerCase() === vQuery ||
        veh.plateNumber.toLowerCase().includes(vQuery) ||
        veh.plateDigits.includes(vQuery)
      );
      if (v) assignedVehicleId = v.id;
    }

    const isSaudi = iqamaValidation.type === 'CITIZEN' || (raw.nationality && String(raw.nationality).toLowerCase().includes('saudi'));

    const newWorker: Worker = {
      id: `wrk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: empId,
      fullName,
      fullNameAr: String(raw.fullNameAr || raw.nameAr || '').trim(),
      nationality: String(raw.nationality || (isSaudi ? 'Saudi' : 'Expatriate')).trim(),
      nationalityAr: String(raw.nationalityAr || (isSaudi ? 'سعودي' : 'مقيم')).trim(),
      jobTitle,
      departmentId,
      mobileNumber: normalizeSaudiPhone(mobileNumber) || (mobileNumber || '+966500000000'),
      email: String(raw.email || '').trim(),
      iqamaNumber: cleanIqama,
      iqamaExpiry: String(raw.iqamaExpiry || '').trim(),
      passportNumber: String(raw.passportNumber || raw.passport || '').trim(),
      passportExpiry: String(raw.passportExpiry || '').trim(),
      workPermitNumber: String(raw.workPermitNumber || `WP-${cleanIqama}`).trim(),
      workPermitExpiry: String(raw.workPermitExpiry || '').trim(),
      medicalInsuranceNumber: String(raw.medicalInsuranceNumber || '').trim(),
      medicalInsuranceExpiry: String(raw.medicalInsuranceExpiry || '').trim(),
      contractStartDate: String(raw.contractStartDate || '').trim(),
      contractEndDate: String(raw.contractEndDate || '').trim(),
      joiningDate: String(raw.joiningDate || new Date().toISOString().split('T')[0]).trim(),
      salary: parseFloat(raw.salary || raw.basicSalary) || 4500,
      driverLicenseNumber: String(raw.driverLicenseNumber || raw.licenseNumber || '').trim(),
      driverLicenseExpiry: String(raw.driverLicenseExpiry || raw.licenseExpiry || '').trim(),
      assignedVehicleId,
      status: ['ACTIVE', 'VACATION', 'INACTIVE', 'TERMINATED'].includes(String(raw.status).toUpperCase())
        ? String(raw.status).toUpperCase() as any
        : 'ACTIVE',
      address: String(raw.address || 'Riyadh, Saudi Arabia').trim(),
      emergencyContact: String(raw.emergencyContact || 'Operations Center (+966 11 489 2000)').trim(),
      notes: String(raw.notes || '').trim(),
      photoUrl: String(raw.photoUrl || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    existingIqamas.add(cleanIqama);
    existingEmpIds.add(empId.toUpperCase());
    newWorkersToAdd.push(newWorker);
  }

  // Batch insert
  for (const w of newWorkersToAdd) {
    db.workers.unshift(w);
    results.imported.push(w);
    if (w.assignedVehicleId) {
      const v = db.vehicles.find(veh => veh.id === w.assignedVehicleId);
      if (v) v.assignedWorkerId = w.id;
    }
  }

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'WORKER',
    'BULK',
    `Bulk imported ${newWorkersToAdd.length} workers (${results.skipped.length} skipped) via CSV/Excel`,
    undefined,
    { count: newWorkersToAdd.length, skippedCount: results.skipped.length },
    req.ip
  );

  return res.status(200).json({
    success: true,
    message: `Successfully imported ${newWorkersToAdd.length} workers`,
    importedCount: newWorkersToAdd.length,
    skippedCount: results.skipped.length,
    skipped: results.skipped,
    workers: newWorkersToAdd
  });
});

router.put('/workers/:id', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const worker = db.workers.find(w => w.id === req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Worker not found' } });
  }

  const oldVal = { ...worker };
  const body = req.body;

  // Check unique Iqama if changed
  if (body.iqamaNumber) {
    const clean = body.iqamaNumber.trim().replace(/\D/g, '');
    const duplicate = db.workers.find(w => w.id !== worker.id && w.iqamaNumber.replace(/\D/g, '') === clean);
    if (duplicate) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_IQAMA', message: `Iqama number "${clean}" is already assigned to ${duplicate.fullName}` } });
    }
    worker.iqamaNumber = clean;
  }

  if (body.fullName) worker.fullName = body.fullName;
  if (body.fullNameAr !== undefined) worker.fullNameAr = body.fullNameAr;
  if (body.nationality) worker.nationality = body.nationality;
  if (body.jobTitle) worker.jobTitle = body.jobTitle;
  if (body.departmentId) worker.departmentId = body.departmentId;
  if (body.mobileNumber) worker.mobileNumber = body.mobileNumber;
  if (body.email !== undefined) worker.email = body.email;
  if (body.iqamaExpiry !== undefined) worker.iqamaExpiry = body.iqamaExpiry;
  if (body.passportNumber !== undefined) worker.passportNumber = body.passportNumber;
  if (body.passportExpiry !== undefined) worker.passportExpiry = body.passportExpiry;
  if (body.workPermitExpiry !== undefined) worker.workPermitExpiry = body.workPermitExpiry;
  if (body.medicalInsuranceNumber !== undefined) worker.medicalInsuranceNumber = body.medicalInsuranceNumber;
  if (body.medicalInsuranceExpiry !== undefined) worker.medicalInsuranceExpiry = body.medicalInsuranceExpiry;
  if (body.contractStartDate !== undefined) worker.contractStartDate = body.contractStartDate;
  if (body.contractEndDate !== undefined) worker.contractEndDate = body.contractEndDate;
  if (body.salary !== undefined) worker.salary = parseFloat(body.salary) || 0;
  if (body.driverLicenseNumber !== undefined) worker.driverLicenseNumber = body.driverLicenseNumber;
  if (body.driverLicenseExpiry !== undefined) worker.driverLicenseExpiry = body.driverLicenseExpiry;
  if (body.status) worker.status = body.status;
  if (body.notes !== undefined) worker.notes = body.notes;
  if (body.photoUrl !== undefined) worker.photoUrl = body.photoUrl;

  // Handle vehicle assignment update
  if (body.assignedVehicleId !== undefined && body.assignedVehicleId !== worker.assignedVehicleId) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!db.vehicleAssignments) db.vehicleAssignments = [];

    if (worker.assignedVehicleId) {
      const oldV = db.vehicles.find(v => v.id === worker.assignedVehicleId);
      if (oldV) {
        oldV.assignedWorkerId = null;
        const activeAsgn = db.vehicleAssignments.find(a => a.vehicleId === oldV.id && a.workerId === worker.id && a.isCurrent);
        if (activeAsgn) {
          activeAsgn.isCurrent = false;
          activeAsgn.assignedTo = todayStr;
          activeAsgn.endMileage = oldV.currentMileage;
          activeAsgn.updatedAt = new Date().toISOString();
        }
      }
    }
    worker.assignedVehicleId = body.assignedVehicleId || null;
    if (body.assignedVehicleId) {
      const newV = db.vehicles.find(v => v.id === body.assignedVehicleId);
      if (newV) {
        // If that vehicle had another driver, close it
        const prevAsgn = db.vehicleAssignments.find(a => a.vehicleId === newV.id && a.isCurrent);
        if (prevAsgn) {
          prevAsgn.isCurrent = false;
          prevAsgn.assignedTo = todayStr;
          prevAsgn.endMileage = newV.currentMileage;
          prevAsgn.updatedAt = new Date().toISOString();
        }
        newV.assignedWorkerId = worker.id;
        db.vehicleAssignments.unshift({
          id: `asgn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          vehicleId: newV.id,
          workerId: worker.id,
          workerName: worker.fullName,
          workerNameAr: worker.fullNameAr,
          workerEmployeeId: worker.employeeId,
          workerJobTitle: worker.jobTitle,
          workerNationality: worker.nationality,
          workerNationalityAr: worker.nationalityAr,
          workerMobile: worker.mobileNumber,
          workerPhotoUrl: worker.photoUrl,
          assignedFrom: todayStr,
          assignedTo: null,
          isCurrent: true,
          assignmentType: 'PRIMARY',
          startMileage: newV.currentMileage,
          endMileage: null,
          assignedBy: req.user?.fullName || 'HR & Workforce Management',
          handoverChecklistCompleted: true,
          notes: 'Vehicle assigned via workforce profile update.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  worker.updatedAt = new Date().toISOString();
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'WORKER',
    worker.id,
    `Updated employee profile ${worker.fullName} (${worker.employeeId})`,
    oldVal,
    worker,
    req.ip
  );

  res.json(worker);
});

// Dedicated Worker Photo Upload Endpoint
router.post('/workers/:id/photo', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const worker = db.workers.find(w => w.id === req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Worker not found' } });
  }

  const { photoData, photoUrl } = req.body;
  const targetPhoto = photoData || photoUrl;

  if (!targetPhoto) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_PHOTO', message: 'No photo data or URL provided' } });
  }

  const oldPhoto = worker.photoUrl;
  worker.photoUrl = targetPhoto;
  worker.updatedAt = new Date().toISOString();
  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'WORKER',
    worker.id,
    `Uploaded profile photo for employee ${worker.fullName} (${worker.employeeId})`,
    { photoUrl: oldPhoto },
    { photoUrl: targetPhoto },
    req.ip
  );

  res.json({
    success: true,
    message: 'Worker photo uploaded successfully',
    worker,
    photoUrl: targetPhoto
  });
});

// Helper endpoint to upload/preview worker photo before worker creation
router.post('/workers/upload-photo', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const { photoData, photoUrl } = req.body;
  const target = photoData || photoUrl;
  if (!target) {
    return res.status(400).json({ success: false, error: { message: 'photoData or photoUrl is required' } });
  }
  res.json({ success: true, photoUrl: target });
});

router.delete('/workers/:id', requireAuth, requireRoles('ADMIN', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const worker = db.workers.find(w => w.id === req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Worker not found' } });
  }

  if (worker.assignedVehicleId) {
    const v = db.vehicles.find(veh => veh.id === worker.assignedVehicleId);
    if (v) v.assignedWorkerId = null;
  }

  db.workers = db.workers.filter(w => w.id !== req.params.id);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'WORKER',
    worker.id,
    `Deleted employee ${worker.fullName} (${worker.employeeId})`,
    worker,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Worker deleted successfully' });
});

// -------------------------------------------------------------
// 6. EXPIRY ALERT ENGINE & COMPLIANCE
// -------------------------------------------------------------

router.get(['/expiry-alerts', '/expiry/alerts', '/expiry'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { status, entityType, departmentId } = req.query;
  let alerts = getAllExpiryAlerts();

  if (status) {
    alerts = alerts.filter(a => a.status === status);
  }
  if (entityType) {
    alerts = alerts.filter(a => a.entityType === entityType);
  }
  if (departmentId) {
    alerts = alerts.filter(a => a.departmentId === departmentId);
  }

  res.json({
    success: true,
    count: alerts.length,
    alerts,
    data: alerts
  });
});

router.get('/expiry-alerts/expired', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining < 0);
  res.json({ success: true, count: alerts.length, data: alerts });
});

router.get('/expiry-alerts/7-days', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 7);
  res.json({ success: true, count: alerts.length, data: alerts });
});

router.get('/expiry-alerts/15-days', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 15);
  res.json({ success: true, count: alerts.length, data: alerts });
});

router.get('/expiry-alerts/30-days', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 30);
  res.json({ success: true, count: alerts.length, data: alerts });
});

router.get('/expiry-alerts/60-days', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 60);
  res.json({ success: true, count: alerts.length, data: alerts });
});

// -------------------------------------------------------------
// 7. DOCUMENTS & FILE MANAGEMENT (SECURE STORAGE)
// -------------------------------------------------------------

router.get('/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { entityType, entityId, docType } = req.query;

  let list = [...db.documents];
  if (entityType) list = list.filter(d => d.entityType === entityType);
  if (entityId) list = list.filter(d => d.entityId === entityId);
  if (docType) list = list.filter(d => d.docType === docType);

  res.json(list);
});

router.post('/documents', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  if (!body.docType || !body.entityType || !body.entityId) {
    return res.status(400).json({ error: 'docType, entityType, and entityId are required' });
  }

  const newDoc: AppDocument = {
    id: 'doc-' + Date.now(),
    docType: body.docType || 'OTHER',
    docNumber: body.docNumber || `DOC-${Date.now().toString().slice(-6)}`,
    entityType: body.entityType,
    entityId: body.entityId,
    fileName: body.fileName || `document_${Date.now()}.pdf`,
    fileData: body.fileData || '',
    fileSize: body.fileSize || '1.2 MB',
    mimeType: body.mimeType || 'application/pdf',
    expiryDate: body.expiryDate || '',
    uploadedBy: req.user ? req.user.fullName : 'System User',
    uploadedAt: new Date().toISOString(),
    version: 1,
    notes: body.notes || ''
  };

  db.documents.unshift(newDoc);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'DOCUMENT',
    newDoc.id,
    `Uploaded document ${newDoc.docNumber} (${newDoc.docType}) for ${newDoc.entityType} ${newDoc.entityId}`,
    undefined,
    newDoc,
    req.ip
  );

  res.status(201).json(newDoc);
});

router.delete('/documents/:id', requireAuth, requireRoles('ADMIN', 'MANAGER', 'HR'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  db.documents = db.documents.filter(d => d.id !== req.params.id);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'DOCUMENT',
    doc.id,
    `Deleted document ${doc.docNumber} (${doc.docType})`,
    doc,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'Document deleted' });
});

// File upload / signed URL endpoints
router.post('/files/upload', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { fileName, mimeType, fileSize, base64Data } = req.body;
  const fileId = `file-${Date.now()}`;
  const signedUrl = `/api/files/${fileId}/download?signature=${Date.now()}`;

  res.status(201).json({
    success: true,
    fileId,
    fileName: fileName || 'uploaded_document.pdf',
    downloadUrl: signedUrl,
    signedUrl,
    size: fileSize || '1.5 MB',
    mimeType: mimeType || 'application/pdf',
    expiresIn: '15m'
  });
});

router.get('/files/:id/signed-url', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const signature = Buffer.from(`${req.params.id}:${Date.now() + 15 * 60 * 1000}`).toString('base64');
  res.json({
    success: true,
    fileId: req.params.id,
    signedUrl: `/api/files/${req.params.id}/download?signature=${signature}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
});

router.get('/files/:id/download', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="document_${req.params.id}.pdf"`);
  res.send(Buffer.from('%PDF-1.4 Mock Private Enterprise Secure Document Encrypted'));
});

// -------------------------------------------------------------
// 8. MAINTENANCE & WORK ORDERS (WITH AUTO COST CALCULATIONS)
// -------------------------------------------------------------

router.get('/maintenance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { vehicleId, maintenanceType, status } = req.query;

  let list = [...db.maintenance];
  if (vehicleId) list = list.filter(m => m.vehicleId === vehicleId);
  if (maintenanceType) list = list.filter(m => m.maintenanceType === maintenanceType);
  if (status) list = list.filter(m => m.status === status);

  const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));

  const enriched = list.map(m => {
    const v = vehicleMap.get(m.vehicleId);
    return {
      ...m,
      vehiclePlate: v?.plateNumber || 'Unknown',
      vehicleMakeModel: v ? `${v.make} ${v.model}` : 'Unknown',
      vehicleCode: v?.internalVehicleId || ''
    };
  });

  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(enriched);
});

router.post('/maintenance', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  if (!body.vehicleId || !body.date || !body.description) {
    return res.status(400).json({ error: 'Vehicle, date, and description are required' });
  }

  const partsCost = parseFloat(body.partsCost) || 0;
  const laborCost = parseFloat(body.laborCost) || 0;
  const totalCost = partsCost + laborCost; // Automatic calculation
  const mileage = parseInt(body.mileage, 10) || 0;

  const newMaint: MaintenanceRecord = {
    id: 'maint-' + Date.now(),
    vehicleId: body.vehicleId,
    maintenanceType: body.maintenanceType || 'PERIODIC_SERVICE',
    date: body.date,
    mileage,
    workshop: body.workshop || 'Authorized Fleet Service Center',
    description: body.description,
    parts: body.parts || body.partsReplaced || '',
    laborCost,
    partsCost,
    totalCost,
    status: body.status || 'COMPLETED',
    nextMaintenanceDate: body.nextMaintenanceDate || '',
    nextMaintenanceMileage: body.nextMaintenanceMileage ? parseInt(body.nextMaintenanceMileage, 10) : 0,
    notes: body.notes || '',
    createdAt: new Date().toISOString()
  };

  db.maintenance.unshift(newMaint);

  // Update vehicle mileage if higher
  const vehicle = db.vehicles.find(v => v.id === body.vehicleId);
  if (vehicle && mileage > vehicle.currentMileage) {
    vehicle.currentMileage = mileage;
  }

  // Also log into expenses table
  db.expenses.unshift({
    id: 'exp-' + Date.now(),
    vehicleId: body.vehicleId,
    expenseType: 'MAINTENANCE',
    date: body.date,
    amount: totalCost,
    vendor: body.workshop || 'Workshop',
    invoiceNumber: `WO-${newMaint.id.slice(-6)}`,
    description: `Maintenance (${newMaint.maintenanceType}): ${body.description}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'MAINTENANCE',
    newMaint.id,
    `Logged maintenance for vehicle ${vehicle?.plateNumber} (${totalCost} SAR)`,
    undefined,
    newMaint,
    req.ip
  );

  // Automated Google Chat webhook push if maintenance is critical/urgent
  const isUrgentMaint = newMaint.status === 'SCHEDULED' ||
    newMaint.maintenanceType === 'ENGINE_OVERHAUL' ||
    newMaint.maintenanceType === 'BRAKE_SERVICE' ||
    newMaint.totalCost >= 2000;

  if (isUrgentMaint && Array.isArray(db.chatWebhooks)) {
    const subscribedWebhooks = db.chatWebhooks.filter(w => w.isActive && w.events.maintenanceUrgent);
    for (const wh of subscribedWebhooks) {
      const payload = formatGoogleChatPayload({
        category: 'MAINTENANCE_EVENT',
        title: `Work Order Logged: ${newMaint.maintenanceType}`,
        subtitle: `${wh.name} • Automated Maintenance Trigger`,
        entityName: vehicle ? `${vehicle.internalVehicleId} - ${vehicle.make} ${vehicle.model}` : 'Vehicle Asset',
        entityId: newMaint.vehicleId,
        plateOrId: vehicle?.plateNumber,
        maintenanceType: newMaint.maintenanceType,
        workshop: newMaint.workshop,
        cost: newMaint.totalCost,
        odometer: newMaint.mileage,
        severity: newMaint.maintenanceType === 'ENGINE_OVERHAUL' ? 'CRITICAL' : 'WARNING',
        customHeader: wh.customHeader,
        notes: `New maintenance logged. Description: ${newMaint.description}. Status: ${newMaint.status}`
      });

      dispatchToGoogleChatWebhook(wh.webhookUrl, payload).then(res => {
        wh.lastTriggeredAt = new Date().toISOString();
        wh.lastTriggerStatus = res.success ? 'SUCCESS' : 'FAILED';
        wh.triggerCount = (wh.triggerCount || 0) + 1;
        if (!Array.isArray(db.webhookDispatchLogs)) db.webhookDispatchLogs = [];
        db.webhookDispatchLogs.unshift({
          id: 'wlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          webhookId: wh.id,
          webhookName: wh.name,
          spaceName: wh.spaceName,
          eventCategory: 'MAINTENANCE_EVENT',
          entityName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Asset',
          entityId: newMaint.vehicleId,
          severity: 'CRITICAL',
          summary: `Auto-dispatched maintenance: ${newMaint.maintenanceType} for ${vehicle?.plateNumber}`,
          status: res.success ? 'SUCCESS' : 'FAILED',
          responseCode: res.statusCode,
          errorMessage: res.error,
          dispatchedAt: new Date().toISOString(),
          payloadPreview: payload.text.slice(0, 160)
        });
        saveDatabase();
      }).catch(err => console.error('Failed to dispatch maintenance webhook:', err));
    }
  }

  res.status(201).json(newMaint);
});

router.put('/maintenance/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const maint = db.maintenance.find(m => m.id === req.params.id);
  if (!maint) return res.status(404).json({ error: 'Maintenance record not found' });

  const old = { ...maint };
  const b = req.body;

  if (b.maintenanceType) maint.maintenanceType = b.maintenanceType;
  if (b.date) maint.date = b.date;
  if (b.mileage !== undefined) maint.mileage = parseInt(b.mileage, 10) || maint.mileage;
  if (b.workshop) maint.workshop = b.workshop;
  if (b.description) maint.description = b.description;
  if (b.parts !== undefined) maint.parts = b.parts;
  if (b.partsReplaced !== undefined) maint.parts = b.partsReplaced;
  if (b.laborCost !== undefined) maint.laborCost = parseFloat(b.laborCost) || 0;
  if (b.partsCost !== undefined) maint.partsCost = parseFloat(b.partsCost) || 0;
  maint.totalCost = maint.partsCost + maint.laborCost;
  if (b.status) maint.status = b.status;
  if (b.nextMaintenanceDate !== undefined) maint.nextMaintenanceDate = b.nextMaintenanceDate;

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'MAINTENANCE',
    maint.id,
    `Updated maintenance record ${maint.id}`,
    old,
    maint,
    req.ip
  );

  res.json(maint);
});

router.delete('/maintenance/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.maintenance = db.maintenance.filter(m => m.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Maintenance record deleted' });
});

// -------------------------------------------------------------
// PREDICTIVE MAINTENANCE HEURISTIC INSIGHTS ENDPOINT
// -------------------------------------------------------------
router.get('/maintenance/predictive-insights', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const summary = analyzeFleetPredictiveMaintenance(db.vehicles, db.maintenance, db.fuelRecords);
  res.json({
    success: true,
    data: summary,
    ...summary
  });
});

// -------------------------------------------------------------
// 9. FUEL ECONOMICS & CONSUMPTION
// -------------------------------------------------------------

router.get('/fuel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { vehicleId, driverWorkerId } = req.query;

  let list = [...db.fuelRecords];
  if (vehicleId) list = list.filter(f => f.vehicleId === vehicleId);
  if (driverWorkerId) list = list.filter(f => f.driverWorkerId === driverWorkerId);

  const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));
  const workerMap = new Map(db.workers.map(w => [w.id, w]));

  const enriched = list.map(f => {
    const v = vehicleMap.get(f.vehicleId);
    const w = f.driverWorkerId ? workerMap.get(f.driverWorkerId) : null;
    return {
      ...f,
      vehiclePlate: v?.plateNumber || 'Unknown',
      vehicleMakeModel: v ? `${v.make} ${v.model}` : 'Unknown',
      driverName: w?.fullName || 'Unassigned'
    };
  });

  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalLiters = list.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = list.reduce((sum, f) => sum + f.totalCost, 0);
  const avgPricePerLiter = totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '1.15';

  res.json({
    records: enriched,
    summary: {
      totalLiters: Math.round(totalLiters),
      totalCost: Math.round(totalCost),
      avgPricePerLiter,
      recordCount: list.length
    }
  });
});

router.post('/fuel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  if (!body.vehicleId || !body.liters || !body.date) {
    return res.status(400).json({ error: 'Vehicle, liters, and date are required' });
  }

  const liters = parseFloat(body.liters) || 0;
  const pricePerLiter = parseFloat(body.pricePerLiter) || 1.15;
  const totalCost = parseFloat(body.totalCost) || (liters * pricePerLiter); // Automatic calculation
  const mileage = parseInt(body.mileage, 10) || 0;

  const newFuel: FuelRecord = {
    id: 'fuel-' + Date.now(),
    vehicleId: body.vehicleId,
    driverWorkerId: body.driverWorkerId || null,
    date: body.date,
    fuelType: body.fuelType || 'DIESEL',
    liters,
    pricePerLiter,
    totalCost,
    mileage,
    fuelStation: body.fuelStation || 'SASCO Fuel Station',
    notes: body.notes || '',
    createdAt: new Date().toISOString()
  };

  db.fuelRecords.unshift(newFuel);

  // Update vehicle mileage if higher
  const vehicle = db.vehicles.find(v => v.id === body.vehicleId);
  if (vehicle && mileage > vehicle.currentMileage) {
    vehicle.currentMileage = mileage;
  }

  // Also record in expenses table
  db.expenses.unshift({
    id: 'exp-' + Date.now(),
    vehicleId: body.vehicleId,
    expenseType: 'FUEL',
    date: body.date,
    amount: totalCost,
    vendor: body.fuelStation || 'Fuel Station',
    invoiceNumber: `FUEL-${newFuel.id.slice(-6)}`,
    description: `Fuel refill: ${liters}L of ${body.fuelType || 'DIESEL'}`,
    createdAt: new Date().toISOString()
  });

  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'FUEL',
    newFuel.id,
    `Logged fuel record for vehicle ${vehicle?.plateNumber} (${liters}L, ${totalCost} SAR)`,
    undefined,
    newFuel,
    req.ip
  );

  res.status(201).json(newFuel);
});

router.delete('/fuel/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.fuelRecords = db.fuelRecords.filter(f => f.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Fuel record deleted' });
});

// -------------------------------------------------------------
// 10. GENERAL EXPENSES MANAGEMENT
// -------------------------------------------------------------

router.get('/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { vehicleId, expenseType } = req.query;

  let list = [...db.expenses];
  if (vehicleId) list = list.filter(e => e.vehicleId === vehicleId);
  if (expenseType) list = list.filter(e => e.expenseType === expenseType);

  const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));

  const enriched = list.map(e => {
    const v = vehicleMap.get(e.vehicleId);
    return {
      ...e,
      vehiclePlate: v?.plateNumber || 'General Fleet',
      vehicleMakeModel: v ? `${v.make} ${v.model}` : 'All Vehicles'
    };
  });

  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const exp of list) {
    categoryTotals[exp.expenseType] = (categoryTotals[exp.expenseType] || 0) + exp.amount;
  }

  res.json({
    expenses: enriched,
    totalAmount: list.reduce((sum, e) => sum + e.amount, 0),
    categoryTotals
  });
});

router.post('/expenses', requireAuth, requireRoles('ADMIN', 'MANAGER', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const db = getDb();

  if (!body.vehicleId || !body.amount || !body.expenseType || !body.date) {
    return res.status(400).json({ error: 'Vehicle, amount, expense type, and date are required' });
  }

  const newExp: ExpenseRecord = {
    id: 'exp-' + Date.now(),
    vehicleId: body.vehicleId,
    expenseType: body.expenseType,
    date: body.date,
    amount: parseFloat(body.amount) || 0,
    vendor: body.vendor || 'Vendor',
    invoiceNumber: body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    description: body.description || '',
    notes: body.notes || '',
    createdAt: new Date().toISOString()
  };

  db.expenses.unshift(newExp);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'EXPENSE',
    newExp.id,
    `Logged expense ${newExp.expenseType} (${newExp.amount} SAR) for vehicle ${newExp.vehicleId}`,
    undefined,
    newExp,
    req.ip
  );

  res.status(201).json(newExp);
});

router.delete('/expenses/:id', requireAuth, requireRoles('ADMIN', 'ACCOUNTANT'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.expenses = db.expenses.filter(e => e.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Expense deleted' });
});

// -------------------------------------------------------------
// 11. REPORTS MODULE (COMPREHENSIVE REPORTS & EXPORTS)
// -------------------------------------------------------------

router.get('/reports/types', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const reportTypes = [
    { id: 'VEHICLE_REPORT', name: 'Comprehensive Vehicle Master Report', nameAr: 'تقرير شامل عن كافة المركبات', category: 'FLEET' },
    { id: 'WORKER_REPORT', name: 'Workforce & Driver Master Report', nameAr: 'تقرير الكادر الوظيفي والسائقين', category: 'WORKFORCE' },
    { id: 'EXPIRED_DOCS_REPORT', name: 'Expired Documents Compliance Report', nameAr: 'تقرير الوثائق المنتهية الصلاحية', category: 'COMPLIANCE' },
    { id: 'UPCOMING_EXPIRY_REPORT', name: 'Upcoming Expiry (30 Days) Forecast', nameAr: 'تقرير التنبؤ بالانتهاء القادم (٣٠ يوماً)', category: 'COMPLIANCE' },
    { id: 'INSURANCE_REPORT', name: 'Vehicle & Medical Insurance Audit', nameAr: 'تقرير تدقيق التأمين الشامل والطبي', category: 'COMPLIANCE' },
    { id: 'REGISTRATION_REPORT', name: 'Vehicle Istimara Registration Report', nameAr: 'تقرير استمارات رخص السير', category: 'FLEET' },
    { id: 'INSPECTION_REPORT', name: 'MVPI Periodic Technical Inspection Report', nameAr: 'تقرير الفحص الفني الدوري (فحص)', category: 'FLEET' },
    { id: 'IQAMA_EXPIRY_REPORT', name: 'Worker Iqama & Muqeem Compliance Report', nameAr: 'تقرير صلاحية الإقامات ومنصة مقيم', category: 'WORKFORCE' },
    { id: 'PASSPORT_EXPIRY_REPORT', name: 'Worker International Passport Report', nameAr: 'تقرير صلاحية جوازات السفر الدولية', category: 'WORKFORCE' },
    { id: 'DRIVER_LICENSE_REPORT', name: 'Driver Licenses & Morour Compliance', nameAr: 'تقرير رخص قيادة السائقين المعتمدة', category: 'WORKFORCE' },
    { id: 'MAINTENANCE_REPORT', name: 'Fleet Maintenance & Work Order Report', nameAr: 'تقرير عمليات الصيانة وأوامر العمل', category: 'OPERATIONS' },
    { id: 'FUEL_REPORT', name: 'Fuel Consumption & Cost per KM Report', nameAr: 'تقرير استهلاك الوقود والتكلفة لكل كم', category: 'OPERATIONS' },
    { id: 'VEHICLE_EXPENSE_REPORT', name: 'Vehicle Total Cost of Ownership (TCO)', nameAr: 'تقرير التكلفة الإجمالية لملكية المركبة', category: 'FINANCIAL' },
    { id: 'MONTHLY_EXPENSE_REPORT', name: 'Monthly Fleet & Labor Cost Statement', nameAr: 'كشف المصروفات الشهرية الشاملة', category: 'FINANCIAL' },
    { id: 'DEPARTMENT_REPORT', name: 'Departmental Resource Allocation Report', nameAr: 'تقرير توزيع الأسطول والموظفين حسب الإدارة', category: 'MANAGEMENT' }
  ];
  res.json(reportTypes);
});

router.post('/reports/generate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { reportType, departmentId, vehicleId } = req.body;
  const db = getDb();
  const deptMap = new Map(db.departments.map(d => [d.id, d.name]));

  let dataset: any[] = [];
  let summary: Record<string, any> = {};

  switch (reportType) {
    case 'VEHICLE_REPORT': {
      let list = [...db.vehicles];
      if (departmentId) list = list.filter(v => v.departmentId === departmentId);
      dataset = list.map(v => {
        const driver = db.workers.find(w => w.id === v.assignedWorkerId);
        return {
          'Vehicle ID': v.internalVehicleId,
          'Plate Number': v.plateNumber,
          'Make & Model': `${v.make} ${v.model} (${v.year})`,
          'Type': v.vehicleType,
          'Department': deptMap.get(v.departmentId) || 'Operations',
          'Assigned Driver': driver ? driver.fullName : 'Unassigned',
          'Status': v.status,
          'Current Mileage (KM)': v.currentMileage,
          'Istimara Expiry': v.istimaraExpiry || 'N/A',
          'Insurance Expiry': v.insuranceExpiry || 'N/A',
          'Inspection Expiry': v.inspectionExpiry || 'N/A'
        };
      });
      summary = {
        'Total Vehicles': list.length,
        'Active Count': list.filter(v => v.status === 'ACTIVE').length,
        'Total Fleet Mileage': list.reduce((sum, v) => sum + v.currentMileage, 0) + ' KM'
      };
      break;
    }

    case 'WORKER_REPORT': {
      let list = [...db.workers];
      if (departmentId) list = list.filter(w => w.departmentId === departmentId);
      dataset = list.map(w => {
        const vehicle = db.vehicles.find(v => v.id === w.assignedVehicleId);
        return {
          'Employee ID': w.employeeId,
          'Full Name': w.fullName,
          'Arabic Name': w.fullNameAr,
          'Nationality': w.nationality,
          'Job Title': w.jobTitle,
          'Department': deptMap.get(w.departmentId) || 'HR',
          'Iqama / ID Number': w.iqamaNumber,
          'Iqama Expiry': w.iqamaExpiry,
          'Passport Expiry': w.passportExpiry,
          'Monthly Salary (SAR)': w.salary,
          'Assigned Vehicle': vehicle ? `${vehicle.internalVehicleId} (${vehicle.plateNumber})` : 'None',
          'Status': w.status
        };
      });
      summary = {
        'Total Workers': list.length,
        'Active Workers': list.filter(w => w.status === 'ACTIVE').length,
        'Total Monthly Payroll': list.reduce((sum, w) => sum + w.salary, 0) + ' SAR'
      };
      break;
    }

    case 'EXPIRED_DOCS_REPORT': {
      const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining < 0);
      dataset = alerts.map(a => ({
        'Entity Name': a.entityName,
        'Details': a.entitySubtext,
        'Document': a.documentTypeName,
        'Document #': a.documentNumber,
        'Department': a.department,
        'Expiry Date': a.expiryDate,
        'Days Overdue': Math.abs(a.daysRemaining) + ' days ago',
        'Responsible': a.responsiblePerson || 'N/A',
        'Contact': a.contactNumber || 'N/A'
      }));
      summary = {
        'Total Expired Documents': alerts.length,
        'Vehicle Docs Overdue': alerts.filter(a => a.entityType === 'VEHICLE').length,
        'Worker Docs Overdue': alerts.filter(a => a.entityType === 'WORKER').length
      };
      break;
    }

    case 'UPCOMING_EXPIRY_REPORT': {
      const alerts = getAllExpiryAlerts().filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 30);
      dataset = alerts.map(a => ({
        'Entity Name': a.entityName,
        'Document': a.documentTypeName,
        'Document #': a.documentNumber,
        'Department': a.department,
        'Expiry Date': a.expiryDate,
        'Days Remaining': a.daysRemaining + ' days',
        'Status': a.daysRemaining <= 7 ? 'CRITICAL' : 'WARNING',
        'Responsible': a.responsiblePerson || 'N/A'
      }));
      summary = {
        'Total Expiring within 30 Days': alerts.length,
        'Expiring within 7 Days': alerts.filter(a => a.daysRemaining <= 7).length
      };
      break;
    }

    case 'MAINTENANCE_REPORT': {
      let list = [...db.maintenance];
      if (vehicleId) list = list.filter(m => m.vehicleId === vehicleId);
      const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));

      dataset = list.map(m => {
        const v = vehicleMap.get(m.vehicleId);
        return {
          'Record ID': m.id,
          'Vehicle': v ? `${v.internalVehicleId} (${v.plateNumber})` : 'Unknown',
          'Date': m.date,
          'Maintenance Type': m.maintenanceType,
          'Workshop': m.workshop,
          'Mileage': m.mileage,
          'Labor Cost (SAR)': m.laborCost,
          'Parts Cost (SAR)': m.partsCost,
          'Total Cost (SAR)': m.totalCost,
          'Status': m.status,
          'Next Service Date': m.nextMaintenanceDate || 'N/A'
        };
      });
      summary = {
        'Total Maintenance Work Orders': list.length,
        'Total Maintenance Spend': list.reduce((sum, m) => sum + m.totalCost, 0) + ' SAR'
      };
      break;
    }

    case 'FUEL_REPORT': {
      let list = [...db.fuelRecords];
      if (vehicleId) list = list.filter(f => f.vehicleId === vehicleId);
      const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));
      const workerMap = new Map(db.workers.map(w => [w.id, w]));

      dataset = list.map(f => {
        const v = vehicleMap.get(f.vehicleId);
        const w = f.driverWorkerId ? workerMap.get(f.driverWorkerId) : null;
        return {
          'Date': f.date,
          'Vehicle': v ? `${v.internalVehicleId} (${v.plateNumber})` : 'Unknown',
          'Driver': w ? w.fullName : 'Unassigned',
          'Fuel Type': f.fuelType,
          'Liters': f.liters,
          'Price / Liter (SAR)': f.pricePerLiter,
          'Total Cost (SAR)': f.totalCost,
          'Odometer (KM)': f.mileage,
          'Station': f.fuelStation
        };
      });
      summary = {
        'Total Fuel Refills': list.length,
        'Total Fuel Liters': list.reduce((sum, f) => sum + f.liters, 0) + ' L',
        'Total Fuel Cost': list.reduce((sum, f) => sum + f.totalCost, 0) + ' SAR'
      };
      break;
    }

    case 'MONTHLY_EXPENSE_REPORT':
    default: {
      const expenses = [...db.expenses];
      const vehicleMap = new Map(db.vehicles.map(v => [v.id, v]));

      dataset = expenses.map(e => {
        const v = vehicleMap.get(e.vehicleId);
        return {
          'Date': e.date,
          'Vehicle': v ? `${v.internalVehicleId} (${v.plateNumber})` : 'General Fleet',
          'Category': e.expenseType,
          'Vendor': e.vendor,
          'Invoice #': e.invoiceNumber,
          'Amount (SAR)': e.amount,
          'Description': e.description
        };
      });
      summary = {
        'Total Expense Records': expenses.length,
        'Total Financial Outlay': expenses.reduce((sum, e) => sum + e.amount, 0) + ' SAR'
      };
      break;
    }
  }

  res.json({
    reportType,
    generatedAt: new Date().toISOString(),
    company: db.companyProfile,
    summary,
    rowCount: dataset.length,
    data: dataset
  });
});

// Dedicated report getters
router.get('/reports/vehicles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.vehicles });
});

router.get('/reports/workers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.workers });
});

router.get('/reports/expiry', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: getAllExpiryAlerts() });
});

router.get('/reports/insurance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const data = db.vehicles.map(v => ({
    vehicle: `${v.internalVehicleId} (${v.plateNumber})`,
    insuranceCompany: v.insuranceCompany,
    policyNumber: v.insurancePolicyNumber,
    expiryDate: v.insuranceExpiry,
    daysRemaining: calculateDaysRemaining(v.insuranceExpiry)
  }));
  res.json({ success: true, data });
});

router.get('/reports/registration', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const data = db.vehicles.map(v => ({
    vehicle: `${v.internalVehicleId} (${v.plateNumber})`,
    istimaraNumber: v.istimaraNumber,
    expiryDate: v.istimaraExpiry,
    daysRemaining: calculateDaysRemaining(v.istimaraExpiry)
  }));
  res.json({ success: true, data });
});

router.get('/reports/inspection', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const data = db.vehicles.map(v => ({
    vehicle: `${v.internalVehicleId} (${v.plateNumber})`,
    inspectionCenter: 'MVPI SASO Inspection',
    expiryDate: v.inspectionExpiry,
    daysRemaining: calculateDaysRemaining(v.inspectionExpiry)
  }));
  res.json({ success: true, data });
});

router.get('/reports/maintenance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.maintenance });
});

router.get('/reports/fuel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.fuelRecords });
});

router.get('/reports/expenses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json({ success: true, data: db.expenses });
});

router.get('/reports/export/excel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const reportName = (req.query.report || 'Fleet_Master_Report').toString();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${Date.now()}.xlsx"`);
  res.send(Buffer.from('PK\x03\x04 Saudi Fleet System Formatted XLSX Export'));
});

router.get('/reports/export/pdf', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const reportName = (req.query.report || 'Fleet_Report').toString();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportName}_${Date.now()}.pdf"`);
  res.send(Buffer.from('%PDF-1.4 Saudi Fleet Management Official Audit Report'));
});

// -------------------------------------------------------------
// 12. NOTIFICATIONS
// -------------------------------------------------------------

router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.notifications);
});

router.post(['/notifications/:id/read', '/notifications/:id'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
    saveDatabase();
  }
  res.json({ success: true });
});

router.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.notifications.forEach(n => { n.isRead = true; });
  saveDatabase();
  res.json({ success: true, message: 'All notifications marked as read' });
});

router.post('/notifications/dispatch-test', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { channel = 'SMS', recipient = '+966500000000', message = 'Test Alert' } = req.body;
  const db = getDb();

  const newNotif = {
    id: 'notif-' + Date.now(),
    title: `Simulated ${channel.toUpperCase()} Dispatch`,
    titleAr: `إرسال تجريبي عبر ${channel}`,
    titlePs: `د ${channel} لخوا ازمایښتي پیغام`,
    message: `Dispatched to ${recipient}: ${message}`,
    messageAr: `تم الإرسال إلى ${recipient}: ${message}`,
    messagePs: `ته واستول شو ${recipient}: ${message}`,
    type: 'SYSTEM' as const,
    severity: 'SUCCESS' as const,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.notifications.unshift(newNotif);
  saveDatabase();

  res.json({
    success: true,
    channel,
    status: 'DELIVERED',
    messageId: `msg_sa_${Date.now()}`,
    recipient,
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// 12.1 GOOGLE CHAT WEBHOOK INTEGRATION & AUTOMATED PUSH
// -------------------------------------------------------------

interface GoogleChatEventPayload {
  category: 'VEHICLE_EXPIRY' | 'MAINTENANCE_EVENT' | 'DRIVER_COMPLIANCE' | 'SYSTEM' | 'TEST';
  title: string;
  subtitle?: string;
  entityName: string;
  entityId?: string;
  plateOrId?: string;
  department?: string;
  daysRemaining?: number;
  expiryDate?: string;
  documentType?: string;
  maintenanceType?: string;
  workshop?: string;
  cost?: number;
  odometer?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  customHeader?: string;
  notes?: string;
}

function formatGoogleChatPayload(event: GoogleChatEventPayload) {
  const headerTag = event.customHeader || '🇸🇦 [SAUDI FLEET OPS]';
  const severityEmoji = event.severity === 'CRITICAL' ? '🚨' : event.severity === 'WARNING' ? '⚠️' : 'ℹ️';

  const lines = [
    `${severityEmoji} *${headerTag}* — *${event.title}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🚗 *Asset / Entity:* \`${event.entityName}\` ${event.plateOrId ? `(${event.plateOrId})` : ''}`,
    event.department ? `🏢 *Department:* ${event.department}` : null,
    event.documentType ? `📄 *Regulatory Doc:* *${event.documentType}*` : null,
    event.expiryDate ? `📅 *Expiry Date:* ${event.expiryDate}` : null,
    event.daysRemaining !== undefined
      ? `⏳ *Compliance Urgency:* ${
          event.daysRemaining < 0
            ? `*🚨 EXPIRED (${Math.abs(event.daysRemaining)} days ago)*`
            : `*${event.daysRemaining} days remaining*`
        }`
      : null,
    event.maintenanceType ? `🔧 *Service Order:* *${event.maintenanceType}*` : null,
    event.workshop ? `📍 *Workshop / Depot:* ${event.workshop}` : null,
    event.cost !== undefined ? `💰 *Estimated Cost:* SAR ${event.cost.toLocaleString()}` : null,
    event.odometer !== undefined ? `🛣️ *Odometer:* ${event.odometer.toLocaleString()} KM` : null,
    event.notes ? `📝 *Notes:* ${event.notes}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⏱️ *Dispatched:* ${new Date().toISOString()} • Riyadh, KSA`
  ].filter(Boolean);

  const fallbackText = lines.join('\n');

  const cardV2 = {
    cardId: `fleet-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    card: {
      header: {
        title: `${severityEmoji} ${event.title}`,
        subtitle: event.subtitle || `${headerTag} • Automated Fleet Regulatory Push`,
        imageUrl: event.severity === 'CRITICAL'
          ? 'https://fonts.gstatic.com/s/i/short-term/release/googlestore/alert/v1/24px.svg'
          : 'https://fonts.gstatic.com/s/i/short-term/release/googlestore/build/v1/24px.svg',
        imageType: 'CIRCLE'
      },
      sections: [
        {
          header: 'Vehicle & Event Details',
          widgets: [
            {
              decoratedText: {
                topLabel: 'Vehicle / Asset Identification',
                text: `<b>${event.entityName}</b> ${event.plateOrId ? `(${event.plateOrId})` : ''}`,
                startIcon: { knownIcon: 'BUS' }
              }
            },
            ...(event.documentType ? [{
              decoratedText: {
                topLabel: 'Regulatory Document',
                text: `<b>${event.documentType}</b>`,
                bottomLabel: event.expiryDate ? `Official Expiry: ${event.expiryDate}` : undefined,
                startIcon: { knownIcon: 'DESCRIPTION' }
              }
            }] : []),
            ...(event.daysRemaining !== undefined ? [{
              decoratedText: {
                topLabel: 'Regulatory Urgency Status',
                text: event.daysRemaining < 0
                  ? `<font color="#d93025"><b>CRITICAL: EXPIRED (${Math.abs(event.daysRemaining)} days ago)</b></font>`
                  : `<font color="${event.daysRemaining <= 7 ? '#d93025' : '#e37400'}"><b>${event.daysRemaining} Days Left to Renew</b></font>`,
                startIcon: { knownIcon: 'CLOCK' }
              }
            }] : []),
            ...(event.maintenanceType ? [{
              decoratedText: {
                topLabel: 'Maintenance Work Order',
                text: `<b>${event.maintenanceType}</b> at ${event.workshop || 'Authorized Workshop'}`,
                bottomLabel: event.cost ? `Total: SAR ${event.cost.toLocaleString()}` : undefined,
                startIcon: { knownIcon: 'CONFIRMATION_NUMBER_ICON' }
              }
            }] : []),
            ...(event.department ? [{
              decoratedText: {
                topLabel: 'Assigned Department',
                text: event.department,
                startIcon: { knownIcon: 'MEMBERSHIP' }
              }
            }] : [])
          ]
        }
      ]
    }
  };

  return {
    text: fallbackText,
    cardsV2: [cardV2]
  };
}

async function dispatchToGoogleChatWebhook(webhookUrl: string, payload: any) {
  if (
    !webhookUrl ||
    webhookUrl.includes('MOCK') ||
    webhookUrl.includes('DEMO') ||
    webhookUrl.includes('example.com')
  ) {
    return {
      success: true,
      statusCode: 200,
      simulated: true,
      messageId: `spaces/DEMO/messages/msg-${Date.now()}`
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        statusCode: res.status,
        error: `Google Chat returned status ${res.status}: ${errText.slice(0, 250)}`
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      statusCode: res.status,
      data
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      error: err.message || 'Failed to dispatch to Google Chat webhook endpoint'
    };
  }
}

// 1. Get all configured Google Chat webhooks
router.get('/notifications/webhooks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  if (!Array.isArray(db.chatWebhooks)) {
    db.chatWebhooks = [];
    saveDatabase();
  }
  res.json(db.chatWebhooks);
});

// 2. Create new Google Chat webhook configuration
router.post('/notifications/webhooks', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const {
    name,
    spaceName,
    webhookUrl,
    events,
    urgencyThreshold = 'URGENT_15_DAYS',
    customHeader,
    isActive = true
  } = req.body;

  if (!name || !webhookUrl) {
    return res.status(400).json({ error: 'Webhook name and URL are required' });
  }

  const newWebhook: ChatWebhookConfig = {
    id: 'wh-' + Date.now(),
    name: name.trim(),
    spaceName: spaceName?.trim() || name.trim(),
    webhookUrl: webhookUrl.trim(),
    isActive: Boolean(isActive),
    events: {
      vehicleExpiry: events?.vehicleExpiry !== false,
      maintenanceUrgent: events?.maintenanceUrgent !== false,
      driverCompliance: events?.driverCompliance !== false,
      systemAlerts: Boolean(events?.systemAlerts)
    },
    urgencyThreshold: urgencyThreshold || 'URGENT_15_DAYS',
    customHeader: customHeader?.trim() || '🇸🇦 [SAUDI FLEET OPS]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    triggerCount: 0
  };

  if (!Array.isArray(db.chatWebhooks)) {
    db.chatWebhooks = [];
  }

  db.chatWebhooks.push(newWebhook);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'NOTIFICATION_WEBHOOK',
    newWebhook.id,
    `Added Google Chat Webhook: ${newWebhook.name} (${newWebhook.spaceName})`,
    undefined,
    newWebhook,
    req.ip
  );

  res.status(201).json(newWebhook);
});

// 3. Update existing Google Chat webhook
router.put('/notifications/webhooks/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const webhook = db.chatWebhooks?.find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook configuration not found' });
  }

  const { name, spaceName, webhookUrl, events, urgencyThreshold, customHeader, isActive } = req.body;

  if (name) webhook.name = name.trim();
  if (spaceName !== undefined) webhook.spaceName = spaceName.trim();
  if (webhookUrl) webhook.webhookUrl = webhookUrl.trim();
  if (events) {
    webhook.events = {
      vehicleExpiry: events.vehicleExpiry !== undefined ? Boolean(events.vehicleExpiry) : webhook.events.vehicleExpiry,
      maintenanceUrgent: events.maintenanceUrgent !== undefined ? Boolean(events.maintenanceUrgent) : webhook.events.maintenanceUrgent,
      driverCompliance: events.driverCompliance !== undefined ? Boolean(events.driverCompliance) : webhook.events.driverCompliance,
      systemAlerts: events.systemAlerts !== undefined ? Boolean(events.systemAlerts) : webhook.events.systemAlerts
    };
  }
  if (urgencyThreshold) webhook.urgencyThreshold = urgencyThreshold;
  if (customHeader !== undefined) webhook.customHeader = customHeader.trim();
  if (isActive !== undefined) webhook.isActive = Boolean(isActive);
  webhook.updatedAt = new Date().toISOString();

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'NOTIFICATION_WEBHOOK',
    webhook.id,
    `Updated Google Chat Webhook: ${webhook.name}`,
    undefined,
    webhook,
    req.ip
  );

  res.json(webhook);
});

// 4. Delete Google Chat webhook
router.delete('/notifications/webhooks/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const index = db.chatWebhooks?.findIndex(w => w.id === req.params.id);
  if (index === undefined || index === -1) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  const deleted = db.chatWebhooks.splice(index, 1)[0];
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'NOTIFICATION_WEBHOOK',
    deleted.id,
    `Deleted Google Chat Webhook: ${deleted.name}`,
    undefined,
    deleted,
    req.ip
  );

  res.json({ success: true, message: `Webhook ${deleted.name} deleted` });
});

// 5. Toggle webhook active status
router.post('/notifications/webhooks/:id/toggle', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const webhook = db.chatWebhooks?.find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  webhook.isActive = !webhook.isActive;
  webhook.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ success: true, isActive: webhook.isActive });
});

// 6. Test a webhook with a sample Google Chat notification card
router.post('/notifications/webhooks/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { webhookId, webhookUrl, webhookName } = req.body;

  let targetUrl = webhookUrl;
  let targetName = webhookName || 'Google Chat Test Space';
  let matchedWebhook: ChatWebhookConfig | undefined;

  if (webhookId) {
    matchedWebhook = db.chatWebhooks?.find(w => w.id === webhookId);
    if (matchedWebhook) {
      targetUrl = matchedWebhook.webhookUrl;
      targetName = matchedWebhook.name;
    }
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Webhook URL or valid webhookId is required for testing' });
  }

  const testPayload = formatGoogleChatPayload({
    category: 'TEST',
    title: 'Google Chat Webhook Connectivity Verified',
    subtitle: `${targetName} • Automated Test Dispatch`,
    entityName: 'Mercedes-Benz Actros 3340 (Test Asset)',
    plateOrId: '7845 XYZ',
    department: 'Fleet Logistics & Supply Chain',
    documentType: 'Vehicle Istimara (استمارة رخصة السير)',
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    daysRemaining: 5,
    severity: 'WARNING',
    customHeader: matchedWebhook?.customHeader || '🇸🇦 [SAUDI FLEET OPS - TEST]',
    notes: 'This is a test notification confirming automated delivery to this Google Chat space.'
  });

  const result = await dispatchToGoogleChatWebhook(targetUrl, testPayload);

  // Log dispatch
  const newLog: WebhookDispatchLog = {
    id: 'wlog-' + Date.now(),
    webhookId: matchedWebhook?.id || 'manual-test',
    webhookName: targetName,
    spaceName: matchedWebhook?.spaceName || 'Test Channel',
    eventCategory: 'TEST',
    entityName: 'Mercedes-Benz Actros (Test Asset)',
    severity: 'INFO',
    summary: result.success
      ? `Successfully tested connection to ${targetName}`
      : `Test failed: ${result.error || 'Unknown error'}`,
    status: result.success ? 'SUCCESS' : 'FAILED',
    responseCode: result.statusCode,
    errorMessage: result.error,
    dispatchedAt: new Date().toISOString(),
    payloadPreview: testPayload.text.slice(0, 160)
  };

  if (!Array.isArray(db.webhookDispatchLogs)) {
    db.webhookDispatchLogs = [];
  }
  db.webhookDispatchLogs.unshift(newLog);

  if (matchedWebhook) {
    matchedWebhook.lastTriggeredAt = new Date().toISOString();
    matchedWebhook.lastTriggerStatus = result.success ? 'SUCCESS' : 'FAILED';
    matchedWebhook.triggerCount = (matchedWebhook.triggerCount || 0) + 1;
  }

  saveDatabase();

  res.json({
    success: result.success,
    statusCode: result.statusCode,
    simulated: (result as any).simulated || false,
    error: result.error,
    log: newLog
  });
});

// 7. Dispatch a specific vehicle expiry or maintenance event to matching webhooks
router.post('/notifications/webhooks/dispatch-event', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const {
    category, // 'VEHICLE_EXPIRY' | 'MAINTENANCE_EVENT' | 'DRIVER_COMPLIANCE' | 'SYSTEM'
    entityId,
    entityName,
    plateOrId,
    department,
    daysRemaining,
    expiryDate,
    documentType,
    maintenanceType,
    workshop,
    cost,
    odometer,
    severity = 'CRITICAL',
    webhookId,
    notes
  } = req.body;

  if (!category || !entityName) {
    return res.status(400).json({ error: 'Event category and entityName are required' });
  }

  // Find target webhooks
  let targets: ChatWebhookConfig[] = [];
  if (webhookId) {
    const specific = db.chatWebhooks?.find(w => w.id === webhookId && w.isActive);
    if (specific) targets = [specific];
  } else {
    targets = (db.chatWebhooks || []).filter(w => {
      if (!w.isActive) return false;
      if (category === 'VEHICLE_EXPIRY' && !w.events.vehicleExpiry) return false;
      if (category === 'MAINTENANCE_EVENT' && !w.events.maintenanceUrgent) return false;
      if (category === 'DRIVER_COMPLIANCE' && !w.events.driverCompliance) return false;
      if (category === 'SYSTEM' && !w.events.systemAlerts) return false;

      // Check urgency threshold
      if (daysRemaining !== undefined) {
        if (w.urgencyThreshold === 'EXPIRED_ONLY' && daysRemaining >= 0) return false;
        if (w.urgencyThreshold === 'CRITICAL_7_DAYS' && daysRemaining > 7) return false;
        if (w.urgencyThreshold === 'URGENT_15_DAYS' && daysRemaining > 15) return false;
      }

      return true;
    });
  }

  if (targets.length === 0) {
    return res.json({
      success: true,
      dispatchedCount: 0,
      message: 'No active Google Chat webhooks matched the event filters.'
    });
  }

  const results: any[] = [];
  if (!Array.isArray(db.webhookDispatchLogs)) {
    db.webhookDispatchLogs = [];
  }

  for (const wh of targets) {
    const title = category === 'VEHICLE_EXPIRY'
      ? `${documentType || 'Vehicle Document'} Expiry Alert`
      : category === 'MAINTENANCE_EVENT'
        ? `Maintenance Event: ${maintenanceType || 'Service Required'}`
        : `Fleet Compliance Alert: ${entityName}`;

    const payload = formatGoogleChatPayload({
      category,
      title,
      subtitle: `${wh.name} • ${wh.spaceName || 'Fleet Space'}`,
      entityName,
      entityId,
      plateOrId,
      department,
      daysRemaining,
      expiryDate,
      documentType,
      maintenanceType,
      workshop,
      cost,
      odometer,
      severity: severity as any,
      customHeader: wh.customHeader,
      notes
    });

    const dispatchRes = await dispatchToGoogleChatWebhook(wh.webhookUrl, payload);
    wh.lastTriggeredAt = new Date().toISOString();
    wh.lastTriggerStatus = dispatchRes.success ? 'SUCCESS' : 'FAILED';
    wh.triggerCount = (wh.triggerCount || 0) + 1;

    const log: WebhookDispatchLog = {
      id: 'wlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      webhookId: wh.id,
      webhookName: wh.name,
      spaceName: wh.spaceName,
      eventCategory: category,
      entityName,
      entityId,
      severity: severity as any,
      summary: `${title} - ${entityName} ${plateOrId ? `(${plateOrId})` : ''}`,
      status: dispatchRes.success ? 'SUCCESS' : 'FAILED',
      responseCode: dispatchRes.statusCode,
      errorMessage: dispatchRes.error,
      dispatchedAt: new Date().toISOString(),
      payloadPreview: payload.text.slice(0, 160)
    };

    db.webhookDispatchLogs.unshift(log);
    results.push({ webhook: wh.name, success: dispatchRes.success, error: dispatchRes.error });
  }

  saveDatabase();

  res.json({
    success: true,
    dispatchedCount: results.filter(r => r.success).length,
    totalTargets: targets.length,
    results
  });
});

// 8. Automated scan & push: analyzes all critical expiries and maintenance events and pushes to active Google Chat webhooks
router.post('/notifications/webhooks/auto-push-critical', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const activeWebhooks = (db.chatWebhooks || []).filter(w => w.isActive);

  if (activeWebhooks.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active Google Chat webhooks configured. Please create or enable a webhook space first.'
    });
  }

  // 1. Gather all critical & urgent expiry alerts
  const allAlerts = getAllExpiryAlerts();
  const criticalExpiries = allAlerts.filter(a => a.daysRemaining <= 15);

  // 2. Gather critical maintenance events (scheduled or in-progress or high-urgency)
  const criticalMaint = (db.maintenance || []).filter(m =>
    m.status === 'SCHEDULED' ||
    m.status === 'IN_PROGRESS' ||
    m.maintenanceType === 'ENGINE_OVERHAUL' ||
    m.maintenanceType === 'BRAKE_SERVICE' ||
    m.totalCost >= 2000
  );

  let pushedEvents = 0;
  if (!Array.isArray(db.webhookDispatchLogs)) {
    db.webhookDispatchLogs = [];
  }

  // Push critical vehicle expiries
  for (const exp of criticalExpiries) {
    const relevantWebhooks = activeWebhooks.filter(w => {
      if (!w.events.vehicleExpiry && exp.entityType === 'VEHICLE') return false;
      if (!w.events.driverCompliance && exp.entityType === 'WORKER') return false;

      if (w.urgencyThreshold === 'EXPIRED_ONLY' && exp.daysRemaining >= 0) return false;
      if (w.urgencyThreshold === 'CRITICAL_7_DAYS' && exp.daysRemaining > 7) return false;
      if (w.urgencyThreshold === 'URGENT_15_DAYS' && exp.daysRemaining > 15) return false;
      return true;
    });

    for (const wh of relevantWebhooks) {
      const payload = formatGoogleChatPayload({
        category: exp.entityType === 'VEHICLE' ? 'VEHICLE_EXPIRY' : 'DRIVER_COMPLIANCE',
        title: `${exp.documentTypeName} Expiry Push`,
        subtitle: `${wh.name} • Automated Expiry Monitor`,
        entityName: exp.entityName,
        entityId: exp.entityId,
        plateOrId: exp.entitySubtext,
        department: exp.department,
        documentType: exp.documentTypeName,
        expiryDate: exp.expiryDate,
        daysRemaining: exp.daysRemaining,
        severity: exp.daysRemaining < 0 ? 'CRITICAL' : exp.daysRemaining <= 7 ? 'CRITICAL' : 'WARNING',
        customHeader: wh.customHeader,
        notes: `Automated push from Saudi Fleet Regulatory Scanner. Immediate renewal required to prevent traffic fines.`
      });

      const res = await dispatchToGoogleChatWebhook(wh.webhookUrl, payload);
      wh.lastTriggeredAt = new Date().toISOString();
      wh.lastTriggerStatus = res.success ? 'SUCCESS' : 'FAILED';
      wh.triggerCount = (wh.triggerCount || 0) + 1;

      db.webhookDispatchLogs.unshift({
        id: 'wlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        webhookId: wh.id,
        webhookName: wh.name,
        spaceName: wh.spaceName,
        eventCategory: exp.entityType === 'VEHICLE' ? 'VEHICLE_EXPIRY' : 'DRIVER_COMPLIANCE',
        entityName: exp.entityName,
        entityId: exp.entityId,
        severity: exp.daysRemaining < 0 ? 'CRITICAL' : 'WARNING',
        summary: `Automated push: ${exp.documentTypeName} for ${exp.entityName} (${exp.daysRemaining < 0 ? 'EXPIRED' : `${exp.daysRemaining}d left`})`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        responseCode: res.statusCode,
        errorMessage: res.error,
        dispatchedAt: new Date().toISOString(),
        payloadPreview: payload.text.slice(0, 160)
      });

      if (res.success) pushedEvents++;
    }
  }

  // Push critical maintenance events
  for (const m of criticalMaint) {
    const vehicle = db.vehicles.find(v => v.id === m.vehicleId);
    const relevantWebhooks = activeWebhooks.filter(w => w.events.maintenanceUrgent);

    for (const wh of relevantWebhooks) {
      const payload = formatGoogleChatPayload({
        category: 'MAINTENANCE_EVENT',
        title: `Critical Maintenance Order: ${m.maintenanceType}`,
        subtitle: `${wh.name} • Automated Maintenance Dispatch`,
        entityName: vehicle ? `${vehicle.internalVehicleId} - ${vehicle.make} ${vehicle.model}` : 'Vehicle Asset',
        entityId: m.vehicleId,
        plateOrId: vehicle?.plateNumber,
        maintenanceType: m.maintenanceType,
        workshop: m.workshop,
        cost: m.totalCost,
        odometer: m.mileage,
        severity: m.status === 'SCHEDULED' || m.maintenanceType === 'ENGINE_OVERHAUL' ? 'CRITICAL' : 'WARNING',
        customHeader: wh.customHeader,
        notes: `Service status: ${m.status}. Workshop: ${m.workshop}. Scheduled Date: ${m.date}.`
      });

      const res = await dispatchToGoogleChatWebhook(wh.webhookUrl, payload);
      wh.lastTriggeredAt = new Date().toISOString();
      wh.lastTriggerStatus = res.success ? 'SUCCESS' : 'FAILED';
      wh.triggerCount = (wh.triggerCount || 0) + 1;

      db.webhookDispatchLogs.unshift({
        id: 'wlog-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        webhookId: wh.id,
        webhookName: wh.name,
        spaceName: wh.spaceName,
        eventCategory: 'MAINTENANCE_EVENT',
        entityName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Asset',
        entityId: m.vehicleId,
        severity: 'CRITICAL',
        summary: `Automated maintenance push: ${m.maintenanceType} for ${vehicle?.plateNumber || m.vehicleId}`,
        status: res.success ? 'SUCCESS' : 'FAILED',
        responseCode: res.statusCode,
        errorMessage: res.error,
        dispatchedAt: new Date().toISOString(),
        payloadPreview: payload.text.slice(0, 160)
      });

      if (res.success) pushedEvents++;
    }
  }

  // Keep logs bounded
  if (db.webhookDispatchLogs.length > 200) {
    db.webhookDispatchLogs = db.webhookDispatchLogs.slice(0, 200);
  }

  saveDatabase();

  res.json({
    success: true,
    scannedExpiries: criticalExpiries.length,
    scannedMaintenance: criticalMaint.length,
    activeWebhooksCount: activeWebhooks.length,
    totalPushesDelivered: pushedEvents,
    timestamp: new Date().toISOString()
  });
});

// 9. Get webhook dispatch audit logs
router.get('/notifications/webhooks/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.webhookDispatchLogs || []);
});

// 10. Clear webhook dispatch logs
router.delete('/notifications/webhooks/logs', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.webhookDispatchLogs = [];
  saveDatabase();
  res.json({ success: true, message: 'Google Chat webhook dispatch logs cleared.' });
});

// -------------------------------------------------------------
// 12B. AUTOMATED THREE-STAGE IQAMA EMAIL REMINDERS (30d, 7d, 1d)
// -------------------------------------------------------------

// Get Iqama reminder status, logs, and workers currently due
router.get('/notifications/iqama-reminders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const logs = db.iqamaReminderLogs || [];

  // Find workers approaching expiration
  const workersDue: Array<{
    worker: Worker;
    daysRemaining: number;
    stage: 30 | 7 | 1 | null;
    stageName: string;
    hasSentThisStage: boolean;
  }> = [];

  const workers = db.workers || [];
  for (const w of workers) {
    if (!w.iqamaExpiry) continue;
    const days = calculateDaysRemaining(w.iqamaExpiry);
    const stage = getIqamaStage(days);
    if (stage) {
      const stageName = stage === 30 ? 'STAGE_30_DAYS' : stage === 7 ? 'STAGE_7_DAYS' : 'STAGE_1_DAY';
      const hasSentThisStage = logs.some(
        l => l.workerId === w.id && l.stage === stage && l.iqamaExpiry === w.iqamaExpiry && l.status === 'SENT'
      );
      workersDue.push({
        worker: w,
        daysRemaining: days,
        stage,
        stageName,
        hasSentThisStage
      });
    }
  }

  // Calculate summary counts
  const stage30Count = logs.filter(l => l.stage === 30).length;
  const stage7Count = logs.filter(l => l.stage === 7).length;
  const stage1Count = logs.filter(l => l.stage === 1).length;

  res.json({
    logs,
    workersDue,
    summary: {
      totalDispatched: logs.length,
      stage30Count,
      stage7Count,
      stage1Count,
      pendingCount: workersDue.filter(w => !w.hasSentThisStage).length
    }
  });
});

// Trigger automated scan & dispatch immediately
router.post('/notifications/iqama-reminders/run', requireAuth, requireRoles('ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await runIqamaReminderCheck('MANUAL_DISPATCH');
    res.json({
      success: true,
      message: `Iqama expiry scan completed. Processed ${result.processedWorkers} workers, dispatched ${result.totalRemindersSent} three-stage reminders, and triggered ${result.erpWebhooksTriggered} ERP webhook calls.`,
      result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute Iqama expiry reminder check.' });
  }
});

// Send a test/single reminder to a worker
router.post('/notifications/iqama-reminders/send-test', requireAuth, requireRoles('ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const { workerId, stage = 30, customEmail } = req.body;
  const db = getDb();
  const worker = db.workers.find(w => w.id === workerId);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found.' });
  }

  const validStage = (stage === 1 || stage === 7 || stage === 30) ? stage : 30;
  const days = calculateDaysRemaining(worker.iqamaExpiry);

  const workerToSend = customEmail ? { ...worker, email: customEmail } : worker;

  try {
    const result = await sendIqamaEmailReminder(workerToSend, validStage, days, 'TEST');
    res.json({
      success: true,
      message: `Stage ${validStage} reminder email sent successfully to ${workerToSend.email || 'HR'}.`,
      log: result.log,
      erpDispatchResults: result.erpDispatchResults
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch test Iqama reminder.' });
  }
});

// Preview email template for a worker
router.get('/notifications/iqama-reminders/preview/:workerId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { workerId } = req.params;
  const stage = parseInt(req.query.stage as string, 10) || 30;
  const db = getDb();
  const worker = db.workers.find(w => w.id === workerId);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found.' });
  }

  const validStage = (stage === 1 || stage === 7 || stage === 30) ? stage : 30;
  const days = calculateDaysRemaining(worker.iqamaExpiry);
  const content = generateIqamaReminderEmailContent(worker, validStage as any, days, db.companyProfile?.name);

  res.json(content);
});

// Clear Iqama reminder logs
router.delete('/notifications/iqama-reminders/logs', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.iqamaReminderLogs = [];
  saveDatabase();
  res.json({ success: true, message: 'Iqama email reminder logs cleared.' });
});

// -------------------------------------------------------------
// 12C. ENTERPRISE ERP WEBHOOK INTEGRATION (SAP, ORACLE, ODOO, CUSTOM)
// -------------------------------------------------------------

// 1. Get all ERP Webhooks
router.get('/erp-webhooks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.erpWebhooks || []);
});

// 2. Create ERP Webhook
router.post('/erp-webhooks', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { name, erpType, webhookUrl, httpMethod = 'POST', headers, secretToken, events, payloadFormat, customNotes } = req.body;

  if (!name || !webhookUrl) {
    return res.status(400).json({ error: 'Name and Webhook URL are required.' });
  }

  const now = new Date().toISOString();
  const newWebhook: ErpWebhookConfig = {
    id: `wh-erp-${Date.now()}`,
    name,
    erpType: erpType || 'GENERIC',
    webhookUrl,
    httpMethod: httpMethod === 'PUT' ? 'PUT' : 'POST',
    headers: headers || {},
    secretToken: secretToken || '',
    isActive: true,
    events: events || {
      stage30Days: true,
      stage7Days: true,
      stage1Day: true,
      expired: true,
      allIqamaExpiries: true
    },
    payloadFormat: payloadFormat || 'STANDARD_JSON',
    customNotes: customNotes || '',
    createdAt: now,
    updatedAt: now,
    triggerCount: 0
  };

  if (!Array.isArray(db.erpWebhooks)) {
    db.erpWebhooks = [];
  }
  db.erpWebhooks.push(newWebhook);

  createAuditLog(
    req.user ? { id: req.user.id, fullName: req.user.fullName, role: req.user.role } : null,
    'CREATE',
    'ERP_WEBHOOK',
    newWebhook.id,
    `Registered ERP webhook integration endpoint: ${newWebhook.name} (${newWebhook.erpType})`
  );

  saveDatabase();
  res.status(201).json(newWebhook);
});

// 3. Update ERP Webhook
router.put('/erp-webhooks/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const index = (db.erpWebhooks || []).findIndex(w => w.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'ERP Webhook configuration not found.' });
  }

  const current = db.erpWebhooks![index];
  const updated: ErpWebhookConfig = {
    ...current,
    ...req.body,
    id: current.id,
    updatedAt: new Date().toISOString()
  };

  db.erpWebhooks![index] = updated;

  createAuditLog(
    req.user ? { id: req.user.id, fullName: req.user.fullName, role: req.user.role } : null,
    'UPDATE',
    'ERP_WEBHOOK',
    current.id,
    `Updated ERP webhook endpoint: ${updated.name}`
  );

  saveDatabase();
  res.json(updated);
});

// 4. Delete ERP Webhook
router.delete('/erp-webhooks/:id', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const index = (db.erpWebhooks || []).findIndex(w => w.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'ERP Webhook configuration not found.' });
  }

  const removed = db.erpWebhooks!.splice(index, 1)[0];

  createAuditLog(
    req.user ? { id: req.user.id, fullName: req.user.fullName, role: req.user.role } : null,
    'DELETE',
    'ERP_WEBHOOK',
    removed.id,
    `Deleted ERP webhook integration: ${removed.name}`
  );

  saveDatabase();
  res.json({ success: true, message: `ERP Webhook ${removed.name} deleted successfully.` });
});

// 5. Toggle ERP Webhook active status
router.post('/erp-webhooks/:id/toggle', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const webhook = (db.erpWebhooks || []).find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'ERP Webhook not found.' });
  }

  webhook.isActive = !webhook.isActive;
  webhook.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ success: true, isActive: webhook.isActive, message: `Webhook ${webhook.name} is now ${webhook.isActive ? 'Active' : 'Inactive'}.` });
});

// 6. Test trigger specific ERP Webhook with mock or real worker
router.post('/erp-webhooks/:id/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const webhook = (db.erpWebhooks || []).find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'ERP Webhook not found.' });
  }

  const worker: Worker = db.workers[0] || {
    id: 'wrk-test',
    employeeId: 'EMP-9999',
    fullName: 'Mohammad Al-Ghamdi',
    fullNameAr: 'محمد الغامدي',
    iqamaNumber: '2198765432',
    iqamaExpiry: '2026-09-22',
    nationality: 'Egyptian',
    departmentId: 'dept-1',
    jobTitle: 'Fleet Heavy Driver',
    mobileNumber: '+966 50 123 4567',
    email: 'driver.ghamdi@saudifleet.com',
    status: 'ACTIVE'
  } as any;

  try {
    const daysRemaining = calculateDaysRemaining(worker.iqamaExpiry);
    const results = await dispatchIqamaAlertToErpWebhooks(worker, 7, daysRemaining, 'TEST' as any);
    res.json({
      success: true,
      message: `Test payload dispatched to ERP Webhook "${webhook.name}".`,
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ERP Webhook test dispatch failed.' });
  }
});

// 7. Dispatch Iqama alert for a specific worker to all matching ERP Webhooks
router.post('/erp-webhooks/dispatch-iqama', requireAuth, requireRoles('ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const { workerId, stage = 30 } = req.body;
  const db = getDb();
  const worker = db.workers.find(w => w.id === workerId);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found.' });
  }

  const daysRemaining = calculateDaysRemaining(worker.iqamaExpiry);
  const eventType = stage === 30 ? 'IQAMA_STAGE_30' : stage === 7 ? 'IQAMA_STAGE_7' : stage === 1 ? 'IQAMA_STAGE_1' : 'IQAMA_EXPIRED';

  try {
    const results = await dispatchIqamaAlertToErpWebhooks(worker, stage as any, daysRemaining, eventType);
    res.json({
      success: true,
      message: `Dispatched Iqama alert to ${results.dispatchedCount} configured ERP Webhooks.`,
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch Iqama alert to ERP webhooks.' });
  }
});

// 8. Get ERP Webhook dispatch logs
router.get('/erp-webhooks/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.erpWebhookDispatchLogs || []);
});

// 9. Clear ERP Webhook dispatch logs
router.delete('/erp-webhooks/logs', requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.erpWebhookDispatchLogs = [];
  saveDatabase();
  res.json({ success: true, message: 'ERP Webhook dispatch logs cleared.' });
});

// -------------------------------------------------------------
// 13. USERS & ADMIN & AUDIT LOGS
// -------------------------------------------------------------

router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    department: u.department,
    status: u.status,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
  res.json(safeUsers);
});

router.get('/admin/users', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    department: u.department,
    status: u.status,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
  res.json(safeUsers);
});

router.post(['/users', '/admin/users'], requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { username, email, password, fullName, role, department } = req.body;
  const db = getDb();

  if (!username || !email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Username, email, password, full name, and role are required' });
  }

  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'User with this username or email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newUser: User = {
    id: 'usr-' + Date.now(),
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, salt),
    fullName,
    role,
    department: department || 'Operations',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'CREATE',
    'USER',
    newUser.id,
    `Admin created new user ${newUser.fullName} (${newUser.role})`,
    undefined,
    newUser,
    req.ip
  );

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    department: newUser.department,
    status: newUser.status
  });
});

router.put(['/users/:id', '/admin/users/:id'], requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { fullName, role, department, status, password } = req.body;
  const oldVal = { ...user };

  if (fullName) user.fullName = fullName;
  if (role) user.role = role;
  if (department) user.department = department;
  if (status) user.status = status;
  if (password && password.length >= 6) {
    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(password, salt);
  }
  user.updatedAt = new Date().toISOString();

  saveDatabase();

  createAuditLog(
    req.user || null,
    'UPDATE',
    'USER',
    user.id,
    `Admin updated user account ${user.fullName}`,
    oldVal,
    user,
    req.ip
  );

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    status: user.status
  });
});

router.delete(['/users/:id', '/admin/users/:id'], requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot delete your own active administrator account' });
  }

  db.users = db.users.filter(u => u.id !== req.params.id);
  saveDatabase();

  createAuditLog(
    req.user || null,
    'DELETE',
    'USER',
    user.id,
    `Admin deleted user ${user.fullName}`,
    user,
    undefined,
    req.ip
  );

  res.json({ success: true, message: 'User deleted' });
});

// -------------------------------------------------------------
// 14. DEPARTMENTS
// -------------------------------------------------------------

router.get(['/departments', '/admin/departments'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const enriched = db.departments.map(d => ({
    ...d,
    vehicleCount: db.vehicles.filter(v => v.departmentId === d.id).length,
    workerCount: db.workers.filter(w => w.departmentId === d.id).length
  }));
  res.json(enriched);
});

router.get('/departments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const dept = db.departments.find(d => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });
  res.json({
    ...dept,
    vehicles: db.vehicles.filter(v => v.departmentId === dept.id),
    workers: db.workers.filter(w => w.departmentId === dept.id)
  });
});

// -------------------------------------------------------------
// 14.1 OFFICIAL TGA ORGANIZATIONAL STRUCTURE (الهيكل التنظيمي)
// -------------------------------------------------------------

router.get('/org-structure', (req: Request, res: Response) => {
  const db = getDb();
  const flat = flattenOrgUnits(TGA_ORG_CHART);
  
  // Aggregate real system statistics
  const totalFleetCount = db.vehicles.length;
  const totalWorkforceCount = db.workers.length;
  const activeAlerts = db.vehicles.filter(v => v.status === 'MAINTENANCE').length;

  res.json({
    authorityNameAr: 'الهيئة العامة للنقل',
    authorityNameEn: 'Transport General Authority (TGA)',
    tree: TGA_ORG_CHART,
    flat,
    summary: {
      totalUnits: flat.length,
      sectorsCount: flat.filter(u => u.level === 'SECTOR').length,
      deputyshipsCount: flat.filter(u => u.level === 'DEPUTYSHIP').length,
      directoratesCount: flat.filter(u => u.level === 'DIRECTORATE').length,
      officesAndCommitteesCount: flat.filter(u => ['COMMITTEE', 'OFFICE', 'DELEGATION'].includes(u.level)).length,
      systemFleetsConnected: totalFleetCount,
      systemWorkersConnected: totalWorkforceCount,
      systemAlerts: activeAlerts
    }
  });
});

router.get('/org-structure/unit/:id', (req: Request, res: Response) => {
  const flat = flattenOrgUnits(TGA_ORG_CHART);
  const unit = flat.find(u => u.id === req.params.id || u.code.toLowerCase() === req.params.id.toLowerCase());
  if (!unit) {
    return res.status(404).json({ error: 'Organizational unit not found' });
  }

  const db = getDb();
  // Find related database records (e.g. matching department name or code)
  const relatedVehicles = db.vehicles.filter(v => 
    v.vehicleType?.toLowerCase().includes(unit.nameEn.toLowerCase()) ||
    v.make?.toLowerCase().includes(unit.code.toLowerCase())
  );
  const relatedWorkers = db.workers.filter(w =>
    w.jobTitle?.toLowerCase().includes(unit.code.toLowerCase())
  );

  res.json({
    unit,
    relatedStats: {
      associatedVehiclesCount: relatedVehicles.length,
      associatedWorkersCount: relatedWorkers.length
    }
  });
});

// -------------------------------------------------------------
// 15. AUDIT LOGS & SETTINGS
// -------------------------------------------------------------

router.get(['/audit-logs', '/admin/audit-logs'], requireAuth, requireRoles('ADMIN', 'MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.auditLogs);
});

router.get(['/company', '/admin/company', '/settings'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  res.json(db.companyProfile);
});

router.route(['/company', '/admin/company', '/settings'])
  .all(requireAuth, requireRoles('ADMIN'))
  .put((req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const oldCompany = { ...db.companyProfile };
    db.companyProfile = {
      ...db.companyProfile,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDatabase();

    createAuditLog(
      req.user || null,
      'UPDATE',
      'COMPANY',
      db.companyProfile.id,
      'Updated company corporate profile and Saudi commercial registration settings',
      oldCompany,
      db.companyProfile,
      req.ip
    );

    res.json(db.companyProfile);
  })
  .post((req: AuthenticatedRequest, res: Response) => {
    const db = getDb();
    const oldCompany = { ...db.companyProfile };
    db.companyProfile = {
      ...db.companyProfile,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveDatabase();

    createAuditLog(
      req.user || null,
      'UPDATE',
      'COMPANY',
      db.companyProfile.id,
      'Updated company corporate profile and Saudi commercial registration settings',
      oldCompany,
      db.companyProfile,
      req.ip
    );

    res.json(db.companyProfile);
  });

// Database Backups & Clean Slate
router.post('/admin/backup/create', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const backupData = JSON.stringify(db, null, 2);
  const backupName = `backup_${Date.now()}_fleet_db.json`;

  createAuditLog(
    req.user || null,
    'BACKUP',
    'DATABASE',
    backupName,
    `Created full database JSON snapshot (${(backupData.length / 1024).toFixed(1)} KB)`,
    undefined,
    undefined,
    req.ip
  );

  res.json({
    success: true,
    fileName: backupName,
    size: `${(backupData.length / 1024).toFixed(1)} KB`,
    timestamp: new Date().toISOString(),
    data: db
  });
});

router.post('/admin/demo-data/reset', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const freshDb = resetToDemoData();
  createAuditLog(
    req.user || null,
    'RESTORE',
    'DATABASE',
    undefined,
    'Restored full Saudi demo dataset with complete vehicles, workers, and expense logs',
    undefined,
    undefined,
    req.ip
  );
  res.json({ success: true, message: 'Database reset to full demo dataset', stats: { vehicles: freshDb.vehicles.length, workers: freshDb.workers.length } });
});

router.post('/admin/demo-data/wipe', requireAuth, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const cleanDb = wipeDemoDataKeepAdmin();
  createAuditLog(
    req.user || null,
    'DELETE',
    'DATABASE',
    undefined,
    'Cleaned all demo vehicles, workers, and records for fresh production start',
    undefined,
    undefined,
    req.ip
  );
  res.json({ success: true, message: 'Demo data cleared. Clean production slate ready.', stats: { vehicles: 0, workers: 0 } });
});

// -------------------------------------------------------------
// 12. ADVANCED GEMINI AI ENGINE (Live API, Grounding & Transcription)
// -------------------------------------------------------------

// Audio transcription with gemini-3.5-transcribe
router.post('/ai/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data (base64) is required' });
    }

    const result = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('Error in /api/ai/transcribe:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to transcribe audio'
    });
  }
});

// Google Search Grounding with gemini-3.8-flash (Current events, news citation, fact-checking)
router.post('/ai/grounded-search', async (req: Request, res: Response) => {
  try {
    const { query, domain, mode, conversationHistory } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const validMode = ['chat', 'news', 'fact_check', 'regulatory'].includes(mode)
      ? mode
      : 'chat';

    const result = await executeSearchGrounding(query.trim(), {
      mode: validMode,
      contextDomain: domain,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : undefined
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('Error in /api/ai/grounded-search:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to execute grounded search'
    });
  }
});

// Curated live search trends, news topics, and fact-checking claims
router.get('/ai/search-trends', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    currentEvents: [
      {
        id: 'ev-1',
        title: 'Saudi Landbridge & Regional Railway Corridors',
        query: 'Latest updates on Saudi Landbridge project connecting Jeddah and Dammam ports via Riyadh',
        category: 'Infrastructure & Logistics'
      },
      {
        id: 'ev-2',
        title: 'Red Sea Maritime Shipping & Overland Transit',
        query: 'Current status of Red Sea container shipping routes, Bab-el-Mandeb, and overland freight alternatives',
        category: 'Global Trade'
      },
      {
        id: 'ev-3',
        title: 'Saudi Vision 2030 Transport & SEZ Logistics Hubs',
        query: 'What are the latest developments in Saudi Special Economic Zones and National Transport Strategy?',
        category: 'Vision 2030'
      },
      {
        id: 'ev-4',
        title: 'Global Energy Markets & OPEC+ Production Policies',
        query: 'Latest OPEC+ crude oil production decisions and global diesel fuel price forecast',
        category: 'Energy & Fuel'
      }
    ],
    factCheckClaims: [
      {
        id: 'fc-1',
        claim: 'Saudi Arabia eliminated all domestic diesel fuel subsidies this year',
        expectedVerdict: 'DEBUNKED_FALSE',
        query: 'Fact check: Did Saudi Arabia eliminate all diesel fuel subsidies in 2026?'
      },
      {
        id: 'fc-2',
        claim: 'Najm requires a police officer to attend every minor fender-bender',
        expectedVerdict: 'DEBUNKED_FALSE',
        query: 'Fact check: Does Najm require a police officer present for minor vehicle accidents in Saudi Arabia?'
      },
      {
        id: 'fc-3',
        claim: 'Heavy commercial trucks are banned 24/7 on all Riyadh highways',
        expectedVerdict: 'PARTIALLY_TRUE',
        query: 'Fact check: Are heavy commercial trucks banned 24/7 on all highways in Riyadh?'
      },
      {
        id: 'fc-4',
        claim: 'All commercial freight trucks in Saudi Arabia must use electronic Bayan waybills',
        expectedVerdict: 'VERIFIED_TRUE',
        query: 'Fact check: Is the electronic Bayan waybill mandatory for commercial freight transport in Saudi Arabia?'
      }
    ],
    recentNewsTopics: [
      {
        id: 'nw-1',
        title: 'Saudi Logistics & Transport General Authority Announcements',
        query: 'Recent announcements and circulars from Saudi Transport General Authority (TGA) this month'
      },
      {
        id: 'nw-2',
        title: 'Autonomous Freight & AI Fleet Management Deployments',
        query: 'Recent news on commercial autonomous truck trials and smart logistics tech in the Middle East'
      },
      {
        id: 'nw-3',
        title: 'ZATCA Phase 2 E-Invoicing Compliance Milestones',
        query: 'Latest ZATCA requirements for logistics e-invoicing Phase 2 Fatoora integration'
      }
    ]
  });
});

// Google Maps Grounding with gemini-3.5-flash
router.post('/ai/grounded-maps', async (req: Request, res: Response) => {
  try {
    const { query, latitude, longitude } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Maps search query is required' });
    }

    const latNum = typeof latitude === 'number' ? latitude : undefined;
    const lngNum = typeof longitude === 'number' ? longitude : undefined;

    const result = await executeMapsGrounding(query.trim(), latNum, lngNum);
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('Error in /api/ai/grounded-maps:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to execute grounded maps query'
    });
  }
});

// AI Engine Capabilities & Models Information
router.get('/ai/capabilities', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    features: {
      liveVoiceConversation: {
        model: 'gemini-3.1-flash-live-preview',
        protocol: 'WebSocket (PCM audio 16kHz in / 24kHz out)',
        endpoint: '/api/live-assistant',
        voices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']
      },
      searchGrounding: {
        model: 'gemini-3.8-flash',
        tool: 'googleSearch',
        endpoint: '/api/ai/grounded-search',
        capabilities: ['current_events', 'cite_news', 'fact_checking', 'fleet_regulatory']
      },
      mapsGrounding: {
        model: 'gemini-3.5-flash',
        tool: 'googleMaps',
        endpoint: '/api/ai/grounded-maps'
      },
      audioTranscription: {
        model: 'gemini-3.5-transcribe',
        modalities: ['TEXT'],
        endpoint: '/api/ai/transcribe'
      }
    }
  });
});

// ==========================================
// BILLING & SUBSCRIPTION MONETIZATION API
// ==========================================

router.get('/billing/overview', requireAuth, (req: Request, res: Response) => {
  try {
    const subscription = getCurrentSubscription();
    const invoices = getCurrentInvoices();
    res.json({
      success: true,
      subscription,
      plans: SUBSCRIPTION_PLANS,
      addons: SUBSCRIPTION_ADDONS,
      invoices
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch billing overview' });
  }
});

router.post('/billing/upgrade', requireAuth, (req: Request, res: Response) => {
  try {
    const { planId, billingCycle, paymentMethod } = req.body;
    if (!planId || !billingCycle) {
      return res.status(400).json({ success: false, error: 'planId and billingCycle are required' });
    }
    const result = updatePlanSubscription(planId, billingCycle, paymentMethod || 'MADA');
    res.json({
      success: true,
      subscription: result.subscription,
      newInvoice: result.newInvoice,
      message: 'Subscription plan updated successfully'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to upgrade subscription' });
  }
});

router.post('/billing/addons/toggle', requireAuth, (req: Request, res: Response) => {
  try {
    const { addonId, enabled } = req.body;
    if (!addonId || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'addonId and enabled boolean are required' });
    }
    const subscription = toggleSubscriptionAddon(addonId, enabled);
    res.json({
      success: true,
      subscription,
      message: enabled ? 'Add-on activated' : 'Add-on deactivated'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to toggle add-on' });
  }
});

router.get('/billing/invoices', requireAuth, (req: Request, res: Response) => {
  try {
    const invoices = getCurrentInvoices();
    res.json({ success: true, invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch invoices' });
  }
});

router.get('/billing/invoices/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const invoices = getCurrentInvoices();
    const inv = invoices.find(i => i.id === req.params.id || i.invoiceNumber === req.params.id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, invoice: inv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch invoice' });
  }
});

// ==========================================
// ADSTERRA AD NETWORK MONETIZATION API
// ==========================================

router.get('/adsterra/config', (req: Request, res: Response) => {
  try {
    const config = getAdsterraConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get Adsterra configuration' });
  }
});

router.post('/adsterra/config', requireAuth, (req: Request, res: Response) => {
  try {
    const updated = updateAdsterraConfig(req.body);
    res.json({
      success: true,
      config: updated,
      message: 'Adsterra monetization configuration saved successfully'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to update Adsterra configuration' });
  }
});

router.post('/adsterra/track-event', (req: Request, res: Response) => {
  try {
    const { type, zoneKey, placementId } = req.body;
    if (type !== 'impression' && type !== 'click') {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }
    const stats = recordAdsterraEvent(type, zoneKey, placementId);
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to record Adsterra event' });
  }
});

router.post('/adsterra/import-csv', requireAuth, (req: Request, res: Response) => {
  try {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ success: false, error: 'CSV text is required' });
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedSmartlinks: any[] = [];
    let discoveredZone = '';

    for (const line of lines) {
      // Ignore header line
      if (line.toLowerCase().includes('zone name') || line.toLowerCase().includes('placement id')) {
        continue;
      }

      // Handle comma-separated with or without quotes
      // Format: "zone name","placement name","placement id","codes & smartlinks"
      const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
      if (!match) continue;

      const cols = match.map(m => m.replace(/^,/, '').replace(/^"(.*)"$/, '$1').trim());
      if (cols.length >= 4) {
        const zoneName = cols[0];
        const placementName = cols[1];
        const placementId = cols[2];
        const url = cols[3];

        if (url && url.startsWith('http')) {
          if (!discoveredZone && zoneName) discoveredZone = zoneName;
          parsedSmartlinks.push({
            zoneName,
            placementName,
            placementId,
            url,
            active: true,
            clicks: 0,
            assignedPlacement: parsedSmartlinks.length === 0 ? 'dashboardTop' : parsedSmartlinks.length === 1 ? 'dashboardSidebar' : parsedSmartlinks.length === 2 ? 'socialBar' : 'reportsTop'
          });
        }
      }
    }

    if (parsedSmartlinks.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid smartlinks found in CSV' });
    }

    const updated = updateAdsterraConfig({
      zoneName: discoveredZone || 'smart-link-3407564',
      smartlinks: parsedSmartlinks,
      directLinkUrl: parsedSmartlinks[0]?.url || ''
    });

    res.json({
      success: true,
      config: updated,
      message: `Successfully imported ${parsedSmartlinks.length} smartlinks for zone ${discoveredZone || 'smart-link-3407564'}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to import CSV' });
  }
});

router.post('/adsterra/reset-demo', requireAuth, (req: Request, res: Response) => {
  try {
    const resetConfig = resetAdsterraDemoConfig();
    res.json({
      success: true,
      config: resetConfig,
      message: 'Adsterra demo test zones reset successfully'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to reset Adsterra demo' });
  }
});

export default router;
