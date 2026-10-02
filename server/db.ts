import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSeedGeofences, getSeedGpsLogs, getSeedGeofenceAlerts } from './gpsService';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'HR' | 'VIEWER' | 'DRIVER';
  department: string;
  workerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  headName: string;
}

export interface Vehicle {
  id: string;
  internalVehicleId: string; // e.g. "FLT-101"
  plateNumber: string; // e.g. "7845 XYZ"
  plateDigits: string; // "7845"
  plateLettersEn: string; // "XYZ"
  plateDigitsAr: string; // "٧٨٤٥"
  plateLettersAr: string; // "س ص ع"
  vehicleType: string; // "Sedan", "SUV", "Pickup", "Heavy Truck", "Van", "Bus"
  make: string; // "Toyota", "Isuzu", "Hyundai", "Mercedes-Benz", "Ford"
  model: string; // "Hilux", "D-Max", "Elantra", "Actros", "Coaster"
  year: number;
  color: string;
  vin: string; // 17-character chassis number
  engineNumber: string;
  ownershipType: 'OWNED' | 'LEASED' | 'RENTED';
  departmentId: string;
  assignedWorkerId: string | null; // linked driver
  driver?: { fullName: string; mobileNumber?: string };
  currentLocation: string; // "Riyadh Head Office", "Jeddah Warehouse", "Dammam Port", "Khobar Project"
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  heading?: number;
  fuelLevelPercent?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SOLD';
  istimaraNumber: string;
  istimaraExpiry: string; // YYYY-MM-DD
  insuranceCompany: string; // "Tawuniya", "Al-Rajhi Takaful", "Bupa Arabia", "Medgulf"
  insurancePolicyNumber: string;
  insuranceExpiry: string; // YYYY-MM-DD
  inspectionDate: string;
  inspectionExpiry: string; // YYYY-MM-DD (Periodic MVPI Fahs)
  purchaseDate: string;
  purchasePrice: number; // in SAR
  currentMileage: number; // in KM
  fuelType: 'GASOLINE_91' | 'GASOLINE_95' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  notes: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  workerId: string;
  workerName?: string;
  workerNameAr?: string;
  workerEmployeeId?: string;
  workerJobTitle?: string;
  workerNationality?: string;
  workerNationalityAr?: string;
  workerMobile?: string;
  workerPhotoUrl?: string;
  assignedFrom: string; // YYYY-MM-DD
  assignedTo: string | null; // YYYY-MM-DD or null if currently active
  isCurrent: boolean;
  assignmentType: 'PRIMARY' | 'TEMPORARY' | 'RELIEF' | 'MAINTENANCE_RELOCATION';
  startMileage?: number;
  endMileage?: number | null;
  assignedBy?: string;
  handoverChecklistCompleted?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Worker {
  id: string;
  employeeId: string; // e.g. "EMP-0412"
  fullName: string;
  fullNameAr: string;
  nationality: string; // "Saudi", "Egyptian", "Pakistani", "Indian", "Filipino", "Yemeni", "Sudanese"
  nationalityAr: string;
  jobTitle: string; // "Heavy Vehicle Driver", "Fleet Supervisor", "Mechanic", "Field Technician"
  departmentId: string;
  mobileNumber: string; // e.g. "+966 50 123 4567"
  email: string;
  iqamaNumber: string; // 10 digits (starts with 1 for Saudi or 2 for Resident)
  iqamaExpiry: string; // YYYY-MM-DD
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD
  workPermitNumber: string;
  workPermitExpiry: string; // YYYY-MM-DD
  medicalInsuranceNumber: string;
  medicalInsuranceExpiry: string; // YYYY-MM-DD
  contractStartDate: string;
  contractEndDate: string;
  joiningDate: string;
  salary: number; // in SAR
  assignedVehicleId: string | null;
  driverLicenseNumber: string;
  driverLicenseExpiry: string;
  status: 'ACTIVE' | 'VACATION' | 'INACTIVE' | 'TERMINATED';
  address: string; // "Al Malaz, Riyadh, KSA"
  emergencyContact: string; // Name & Phone
  notes: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppDocument {
  id: string;
  entityType: 'VEHICLE' | 'WORKER';
  entityId: string;
  docType: 'ISTIMARA' | 'INSURANCE' | 'INSPECTION' | 'IQAMA' | 'PASSPORT' | 'WORK_PERMIT' | 'MEDICAL_INSURANCE' | 'DRIVER_LICENSE' | 'CONTRACT' | 'INVOICE' | 'RECEIPT' | 'OTHER';
  docNumber: string;
  fileName: string;
  fileData: string; // data URL or mock file reference
  fileSize: string; // e.g. "1.2 MB"
  mimeType: string;
  expiryDate?: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'BRAKE_SERVICE' | 'ENGINE_OVERHAUL' | 'PERIODIC_SERVICE';
  date: string;
  mileage: number;
  workshop: string; // "Petromin Express", "Official Dealer Service Center", "Al-Qadisiyah Workshop"
  description: string;
  parts: string; // "Synthetic Oil 5W-30, Oil Filter, Air Filter"
  laborCost: number; // in SAR
  partsCost: number; // in SAR
  totalCost: number; // in SAR
  nextMaintenanceDate: string;
  nextMaintenanceMileage: number;
  invoiceDocId?: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  notes?: string;
  createdAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  driverWorkerId: string | null;
  date: string;
  fuelType: 'GASOLINE_91' | 'GASOLINE_95' | 'DIESEL';
  liters: number;
  pricePerLiter: number; // e.g. 2.18 SAR or 2.33 SAR or 1.15 SAR (Saudi Aramco standard prices)
  totalCost: number; // in SAR
  mileage: number;
  fuelStation: string; // "SASCO", "Aldrees", "Petromin", "Naft", "Enoc"
  receiptDocId?: string;
  notes?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  vehicleId: string;
  expenseType: 'FUEL' | 'MAINTENANCE' | 'INSURANCE' | 'REGISTRATION' | 'INSPECTION' | 'TIRES' | 'SPARE_PARTS' | 'FINES' | 'TOLLS_SALIK' | 'OTHER';
  date: string;
  amount: number; // in SAR
  vendor: string; // "Morour (Traffic Dept)", "Tawuniya", "Petromin", "Bridgestone Center"
  invoiceNumber: string;
  description: string;
  receiptDocId?: string;
  notes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleAr: string;
  titlePs: string;
  message: string;
  messageAr: string;
  messagePs: string;
  type: 'EXPIRY_URGENT' | 'EXPIRY_WARNING' | 'MAINTENANCE_DUE' | 'SYSTEM' | 'SECURITY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  entityType?: 'VEHICLE' | 'WORKER' | 'MAINTENANCE' | 'SYSTEM';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatWebhookConfig {
  id: string;
  name: string;
  spaceName?: string;
  webhookUrl: string;
  isActive: boolean;
  events: {
    vehicleExpiry: boolean;
    maintenanceUrgent: boolean;
    driverCompliance: boolean;
    systemAlerts: boolean;
  };
  urgencyThreshold: 'ALL' | 'URGENT_15_DAYS' | 'CRITICAL_7_DAYS' | 'EXPIRED_ONLY';
  customHeader?: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  lastTriggerStatus?: 'SUCCESS' | 'FAILED';
  triggerCount?: number;
}

export interface WebhookDispatchLog {
  id: string;
  webhookId: string;
  webhookName: string;
  spaceName?: string;
  eventCategory: 'VEHICLE_EXPIRY' | 'MAINTENANCE_EVENT' | 'DRIVER_COMPLIANCE' | 'SYSTEM' | 'TEST';
  entityName: string;
  entityId?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  summary: string;
  status: 'SUCCESS' | 'FAILED';
  responseCode?: number;
  errorMessage?: string;
  dispatchedAt: string;
  payloadPreview?: string;
}

export interface GpsLogRecord {
  id: string;
  vehicleId: string;
  plateNumber?: string;
  internalVehicleId?: string;
  driverId?: string | null;
  driverName?: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number; // 0-360
  altitude?: number;
  accuracy?: number;
  ignitionStatus: 'ON' | 'OFF';
  fuelLevelPercent?: number;
  odometerKm?: number;
  batteryVoltage?: number;
  locationName?: string;
  timestamp: string;
}

export interface Geofence {
  id: string;
  name: string;
  nameAr: string;
  type: 'CIRCLE' | 'POLYGON';
  center: { lat: number; lng: number };
  radiusMeters: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  zoneType: 'WAREHOUSE' | 'PORT' | 'HEAD_OFFICE' | 'RESTRICTED_ZONE' | 'CUSTOMER_SITE' | 'CHECKPOINT' | 'SERVICE_CENTER';
  speedLimitKmh?: number;
  color: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  alertOnSpeeding: boolean;
  emailAlertsEnabled?: boolean;
  notificationEmails?: string[];
  pushAlertsEnabled?: boolean;
  alertSoundEnabled?: boolean;
  highPriorityAlertEnabled?: boolean;
  assignedVehicleIds?: string[];
  description?: string;
  descriptionAr?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceAlert {
  id: string;
  geofenceId: string;
  geofenceName: string;
  geofenceNameAr?: string;
  vehicleId: string;
  plateNumber: string;
  internalVehicleId: string;
  driverName?: string;
  eventType: 'ENTER' | 'EXIT' | 'SPEEDING';
  speedKmh: number;
  speedLimitKmh?: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  emailDispatched?: boolean;
  emailSentTo?: string[];
  emailSubject?: string;
  emailPreviewHtml?: string;
  pushDelivered?: boolean;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number; // 0 for Sunday (Saudi business week start), 1 for Monday, 4 for Thursday
  dayOfMonth?: number; // 1 to 31
  timeOfDay: string; // e.g. "08:00"
  recipientEmails: string[];
  reportTypes: Array<'FLEET_EXPENSES' | 'WORKFORCE_COMPLIANCE' | 'EXECUTIVE_SUMMARY' | 'ALL'>;
  departmentId?: string; // 'ALL' or specific dept
  includeSummaryKpis: boolean;
  includeDetailedTables: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  lastRunSummary?: string;
  totalRunsCount: number;
}

export interface ReportExecutionLog {
  id: string;
  scheduleId: string;
  scheduleName: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  dispatchedAt: string;
  recipients: string[];
  reportTypes: string[];
  totalExpensesSar: number;
  fuelExpensesSar: number;
  maintenanceExpensesSar: number;
  otherExpensesSar: number;
  totalWorkers: number;
  activeIqamas: number;
  expiringIqamas30d: number;
  expiredIqamas: number;
  overallComplianceRate: number; // percentage e.g. 96.5
  status: 'SUCCESS' | 'FAILED';
  deliveryMode: 'SIMULATED_AND_LOGGED' | 'SMTP_DISPATCHED';
  emailSubject: string;
  emailPreviewHtml?: string;
  error?: string;
}

export interface IqamaEmailReminderLog {
  id: string;
  workerId: string;
  workerName: string;
  workerNameAr?: string;
  employeeId: string;
  iqamaNumber: string;
  recipientEmail: string;
  stage: 30 | 7 | 1;
  stageName: 'STAGE_30_DAYS' | 'STAGE_7_DAYS' | 'STAGE_1_DAY';
  daysRemaining: number;
  iqamaExpiry: string;
  subject: string;
  subjectAr: string;
  emailBodyHtml: string;
  status: 'SENT' | 'FAILED' | 'SIMULATED';
  deliveredAt: string;
  error?: string;
  triggeredBy: 'AUTOMATED_SCHEDULER' | 'MANUAL_DISPATCH' | 'TEST';
}

export interface ErpWebhookConfig {
  id: string;
  name: string;
  erpType: 'SAP' | 'ORACLE' | 'DYNAMICS' | 'ODOO' | 'CUSTOM' | 'GENERIC';
  webhookUrl: string;
  httpMethod: 'POST' | 'PUT';
  headers?: Record<string, string>;
  secretToken?: string;
  isActive: boolean;
  events: {
    stage30Days: boolean;
    stage7Days: boolean;
    stage1Day: boolean;
    expired: boolean;
    allIqamaExpiries: boolean;
  };
  payloadFormat: 'STANDARD_JSON' | 'SAP_COMPLIANCE' | 'ORACLE_HCM' | 'ODOO_HR';
  customNotes?: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  lastTriggerStatus?: 'SUCCESS' | 'FAILED';
  lastResponseCode?: number;
  triggerCount?: number;
}

export interface ErpWebhookDispatchLog {
  id: string;
  webhookId: string;
  webhookName: string;
  erpType: string;
  webhookUrl: string;
  eventType: 'IQAMA_STAGE_30' | 'IQAMA_STAGE_7' | 'IQAMA_STAGE_1' | 'IQAMA_EXPIRED' | 'MANUAL_DISPATCH' | 'TEST';
  workerId?: string;
  workerName: string;
  iqamaNumber: string;
  daysRemaining: number;
  status: 'SUCCESS' | 'FAILED';
  responseCode?: number;
  responseBody?: string;
  durationMs?: number;
  errorMessage?: string;
  dispatchedAt: string;
  payloadPreview?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'RESTORE' | 'BACKUP';
  entityType: string;
  entityId?: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  timestamp: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  nameAr: string;
  namePs: string;
  logo: string;
  crNumber: string; // 10 digits Saudi Commercial Registration (e.g. 1010894523)
  vatNumber: string; // 15 digits Saudi VAT (e.g. 310245892100003)
  address: string;
  addressAr: string;
  phone: string;
  email: string;
  managerName: string;
  managerNameAr: string;
  currency: string;
  timezone: string;
  hijriEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyLocation {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  type: 'HEAD_OFFICE' | 'WAREHOUSE' | 'PORT' | 'CUSTOMER_SITE' | 'DEPOT' | 'FUEL_STATION' | 'WORKSHOP' | 'CITY';
  address: string;
  addressAr?: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TripRecord {
  id: string;
  driverId: string;
  driverName?: string;
  driverNameAr?: string;
  driverEmployeeId?: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleInternalId?: string;
  originLocationId?: string;
  originName?: string;
  originCoords?: { lat: number; lng: number };
  destinationLocationId?: string;
  destinationName?: string;
  destinationCoords?: { lat: number; lng: number };
  currentCoords?: { lat: number; lng: number };
  tripDate: string;
  voiceReportId?: string;
  tripType: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  distanceKm?: number;
  startOdometer?: number;
  endOdometer?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverExpenseItem {
  id: string;
  driverId: string;
  vehicleId: string;
  tripId?: string;
  category: 'FUEL' | 'LOADING' | 'PARKING' | 'MAINTENANCE' | 'TOLL' | 'FOOD' | 'ACCOMMODATION' | 'FINES' | 'OTHER';
  amount: number;
  currency: string;
  description: string;
  voiceReportId?: string;
  expenseDate: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  receiptDocId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedExpense {
  category: 'FUEL' | 'LOADING' | 'PARKING' | 'MAINTENANCE' | 'TOLL' | 'FOOD' | 'ACCOMMODATION' | 'FINES' | 'OTHER';
  amount: number;
  currency: string;
  description?: string;
  confidence: number;
}

export interface VoiceReportAIExtraction {
  destination?: {
    name: string;
    matchedLocationId?: string;
    matchedLocationName?: string;
    matchedLocationConfidence?: number;
    multipleMatches?: Array<{ id: string; name: string; nameAr: string; type: string }>;
    confidence: number;
  } | null;
  origin?: {
    name: string;
    matchedLocationId?: string;
    matchedLocationName?: string;
    confidence: number;
  } | null;
  tripType?: string | null;
  tripDescription?: string | null;
  expenses: ExtractedExpense[];
  totalExpense: number;
  fuelExpense?: number | null;
  otherExpense?: number | null;
  currency: string;
  overallConfidence: number;
  requiresClarification?: boolean;
  clarificationMessage?: string;
  matchedDriverId?: string;
  matchedVehicleId?: string;
}

export interface VoiceReportAuditEntry {
  id: string;
  timestamp: string;
  action: 'UPLOADED' | 'PROCESSED' | 'DRIVER_CONFIRMED' | 'ADMIN_EDITED' | 'APPROVED' | 'REJECTED' | 'REPROCESSED';
  actorId: string;
  actorName: string;
  actorRole: string;
  details: string;
  previousValues?: any;
  updatedValues?: any;
}

export interface VoiceReport {
  id: string;
  driverId: string;
  driverName: string;
  driverEmployeeId: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleInternalId: string;
  departmentId: string;
  departmentName: string;
  audioFileUrl: string;
  audioData?: string;
  audioMimeType: string;
  audioDurationSeconds: number;
  language: 'ar' | 'ps' | 'ur' | 'en' | 'mixed';
  transcription: string;
  normalizedText: string;
  aiExtraction: VoiceReportAIExtraction;
  aiConfidence: number;
  processingStatus: 'UPLOADED' | 'TRANSCRIBING' | 'EXTRACTING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
  reviewStatus: 'PENDING' | 'APPROVED' | 'EDITED' | 'REJECTED';
  driverConfirmed: boolean;
  driverConfirmedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  generatedTripId?: string;
  generatedExpenseIds?: string[];
  auditHistory: VoiceReportAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  departments: Department[];
  vehicles: Vehicle[];
  workers: Worker[];
  documents: AppDocument[];
  maintenance: MaintenanceRecord[];
  fuelRecords: FuelRecord[];
  expenses: ExpenseRecord[];
  locations: CompanyLocation[];
  trips: TripRecord[];
  driverExpenses: DriverExpenseItem[];
  voiceReports: VoiceReport[];
  notifications: NotificationItem[];
  chatWebhooks: ChatWebhookConfig[];
  webhookDispatchLogs: WebhookDispatchLog[];
  iqamaReminderLogs?: IqamaEmailReminderLog[];
  erpWebhooks?: ErpWebhookConfig[];
  erpWebhookDispatchLogs?: ErpWebhookDispatchLog[];
  reportSchedules?: ReportSchedule[];
  reportExecutionLogs?: ReportExecutionLog[];
  gpsLogs?: GpsLogRecord[];
  geofences?: Geofence[];
  geofenceAlerts?: GeofenceAlert[];
  auditLogs: AuditLog[];
  vehicleAssignments: VehicleAssignment[];
  subscription?: any;
  invoices?: any[];
  adsterraConfig?: any;
  companyProfile: CompanyProfile;
  systemSettings: {
    alertDaysThresholds: number[]; // [60, 30, 15, 7, 1]
    autoBackupEnabled: boolean;
    autoBackupFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    smsAlertsEnabled: boolean;
    emailAlertsEnabled: boolean;
    whatsappAlertsEnabled: boolean;
    defaultLanguage: 'en' | 'ar' | 'ps';
    aiConfidenceThreshold?: number;
    voiceRetentionDays?: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'fleet_database.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn('Notice: Failed to create data or backup directory on local filesystem:', dirErr);
}

// In-memory cache synced with JSON file
let db: DatabaseSchema;

export function initDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);

      // Ensure all collections are valid arrays without injecting demo data
      if (!Array.isArray(db.vehicles)) db.vehicles = [];
      if (!Array.isArray(db.workers)) db.workers = [];
      if (!Array.isArray(db.documents)) db.documents = [];
      if (!Array.isArray(db.maintenance)) db.maintenance = [];
      if (!Array.isArray(db.fuelRecords)) db.fuelRecords = [];
      if (!Array.isArray(db.expenses)) db.expenses = [];
      if (!Array.isArray(db.locations)) db.locations = [];
      if (!Array.isArray(db.trips)) db.trips = [];
      if (!Array.isArray(db.driverExpenses)) db.driverExpenses = [];
      if (!Array.isArray(db.voiceReports)) db.voiceReports = [];
      if (!Array.isArray(db.chatWebhooks)) db.chatWebhooks = [];
      if (!Array.isArray(db.webhookDispatchLogs)) db.webhookDispatchLogs = [];
      if (!Array.isArray(db.vehicleAssignments)) db.vehicleAssignments = [];
      if (!Array.isArray(db.erpWebhooks)) db.erpWebhooks = [];
      if (!Array.isArray(db.iqamaReminderLogs)) db.iqamaReminderLogs = [];
      if (!Array.isArray(db.erpWebhookDispatchLogs)) db.erpWebhookDispatchLogs = [];
      if (!Array.isArray(db.reportSchedules)) db.reportSchedules = [];
      if (!Array.isArray(db.reportExecutionLogs)) db.reportExecutionLogs = [];
      if (!Array.isArray(db.geofences)) db.geofences = [];
      if (!Array.isArray(db.gpsLogs)) db.gpsLogs = [];
      if (!Array.isArray(db.geofenceAlerts)) db.geofenceAlerts = [];
      if (!Array.isArray(db.notifications)) db.notifications = [];
      if (!Array.isArray(db.auditLogs)) db.auditLogs = [];

      console.log('Existing fleet database loaded with', db.vehicles?.length || 0, 'vehicles,', db.workers?.length || 0, 'workers, and', db.voiceReports?.length || 0, 'voice reports.');
      return;
    } catch (e) {
      console.error('Failed to parse database file, re-initializing with seed data:', e);
    }
  }

  // Seed default data
  db = generateSeedData();
  saveDatabase();
  console.log('Initialized new Fleet & Workforce database with comprehensive Saudi demo data.');
}

export function getDb(): DatabaseSchema {
  if (!db) {
    initDatabase();
  }
  return db;
}

export function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

export function createAuditLog(
  user: { id: string; fullName: string; role: string } | null,
  action: AuditLog['action'],
  entityType: string,
  entityId: string | undefined,
  description: string,
  oldValue?: any,
  newValue?: any,
  ipAddress: string = '127.0.0.1'
) {
  const log: AuditLog = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    userId: user?.id || 'sys-system',
    userName: user?.fullName || 'System Automated Job',
    userRole: user?.role || 'SYSTEM',
    action,
    entityType,
    entityId,
    description,
    oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
    newValue: newValue ? JSON.stringify(newValue) : undefined,
    ipAddress,
    timestamp: new Date().toISOString()
  };

  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 2000) {
    db.auditLogs = db.auditLogs.slice(0, 2000);
  }
  saveDatabase();
}

function generateSeedData(): DatabaseSchema {
  const now = new Date();
  
  // Helpers for relative date generation
  const addDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date.toISOString().split('T')[0];
  };

  const subDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().split('T')[0];
  };

  const salt = bcrypt.genSaltSync(10);

  const departments: Department[] = [
    { id: 'dept-1', name: 'Logistics & Supply Chain', nameAr: 'الخدمات اللوجستية وسلاسل الإمداد', code: 'LOG', headName: 'Eng. Khalid Al-Otaibi' },
    { id: 'dept-2', name: 'Operations & Fleet', nameAr: 'العمليات والأسطول', code: 'OPS', headName: 'Fahad Al-Harbi' },
    { id: 'dept-3', name: 'Field Maintenance & Technical', nameAr: 'الصيانة الميدانية والفنية', code: 'MNT', headName: 'Ibrahim Al-Zahrani' },
    { id: 'dept-4', name: 'Executive & Administration', nameAr: 'الإدارة التنفيذية والعامة', code: 'EXEC', headName: 'Dr. Tariq Al-Ghamdi' },
    { id: 'dept-5', name: 'Human Resources', nameAr: 'الموارد البشرية', code: 'HR', headName: 'Noura Al-Shehri' },
    { id: 'dept-6', name: 'Finance & Accounting', nameAr: 'المالية والمحاسبة', code: 'FIN', headName: 'Mansour Al-Qahtani' }
  ];

  const users: User[] = [
    {
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('admin123', salt),
      fullName: 'Sultan Al-Dossary',
      role: 'ADMIN',
      department: 'Logistics & Supply Chain',
      status: 'ACTIVE',
      createdAt: subDays(180),
      updatedAt: subDays(1)
    },
    {
      id: 'usr-manager',
      username: 'manager',
      email: 'manager@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('manager123', salt),
      fullName: 'Faisal Al-Mutairi',
      role: 'MANAGER',
      department: 'Operations & Fleet',
      status: 'ACTIVE',
      createdAt: subDays(120),
      updatedAt: subDays(5)
    },
    {
      id: 'usr-hr',
      username: 'hr',
      email: 'hr@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('hr123', salt),
      fullName: 'Maha Al-Sudairi',
      role: 'HR',
      department: 'Human Resources',
      status: 'ACTIVE',
      createdAt: subDays(90),
      updatedAt: subDays(2)
    },
    {
      id: 'usr-accountant',
      username: 'accountant',
      email: 'finance@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('acc123', salt),
      fullName: 'Yousef Al-Husseini',
      role: 'ACCOUNTANT',
      department: 'Finance & Accounting',
      status: 'ACTIVE',
      createdAt: subDays(75),
      updatedAt: subDays(3)
    },
    {
      id: 'usr-viewer',
      username: 'viewer',
      email: 'viewer@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('viewer123', salt),
      fullName: 'Salem Al-Bishi',
      role: 'VIEWER',
      department: 'Field Maintenance & Technical',
      status: 'ACTIVE',
      createdAt: subDays(60),
      updatedAt: subDays(10)
    },
    {
      id: 'usr-driver-1',
      username: 'ahmed',
      email: 'ahmed.omari@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('ahmed123', salt),
      fullName: 'Ahmed Mohammed Al-Omari',
      role: 'DRIVER',
      department: 'Logistics & Supply Chain',
      workerId: 'wrk-1',
      status: 'ACTIVE',
      createdAt: subDays(180),
      updatedAt: subDays(1)
    },
    {
      id: 'usr-driver-2',
      username: 'driver',
      email: 'driver@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('driver123', salt),
      fullName: 'Ahmed Mohammed Al-Omari (Captain)',
      role: 'DRIVER',
      department: 'Logistics & Supply Chain',
      workerId: 'wrk-1',
      status: 'ACTIVE',
      createdAt: subDays(180),
      updatedAt: subDays(1)
    },
    {
      id: 'usr-driver-3',
      username: 'khan',
      email: 'khan.afridi@saudifleet.com.sa',
      passwordHash: bcrypt.hashSync('khan123', salt),
      fullName: 'Khan Bahadur Afridi',
      role: 'DRIVER',
      department: 'Logistics & Supply Chain',
      workerId: 'wrk-2',
      status: 'ACTIVE',
      createdAt: subDays(150),
      updatedAt: subDays(2)
    }
  ];

  const workers: Worker[] = [
    {
      id: 'wrk-1',
      employeeId: 'EMP-1001',
      fullName: 'Ahmed Mohammed Al-Omari',
      fullNameAr: 'أحمد محمد العمري',
      nationality: 'Saudi',
      nationalityAr: 'سعودي',
      jobTitle: 'Senior Heavy Fleet Captain',
      departmentId: 'dept-1',
      mobileNumber: '+966 50 481 9201',
      email: 'ahmed.omari@saudifleet.com.sa',
      iqamaNumber: '1092837461', // Saudi National ID (starts with 1)
      iqamaExpiry: addDays(240),
      passportNumber: 'G8492019',
      passportExpiry: addDays(400),
      workPermitNumber: 'WP-892104',
      workPermitExpiry: addDays(240),
      medicalInsuranceNumber: 'BUPA-99210-A',
      medicalInsuranceExpiry: addDays(45), // Warning
      contractStartDate: subDays(700),
      contractEndDate: addDays(395),
      joiningDate: subDays(700),
      salary: 9500,
      assignedVehicleId: 'veh-1',
      driverLicenseNumber: 'DL-1092837461',
      driverLicenseExpiry: addDays(180),
      status: 'ACTIVE',
      address: 'Al-Suwaidi Dist, Riyadh, KSA',
      emergencyContact: 'Mohammed Al-Omari (Father) - +966 55 123 9988',
      notes: 'Exemplary driving track record. Certified hazardous goods handling.',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(700),
      updatedAt: subDays(10)
    },
    {
      id: 'wrk-2',
      employeeId: 'EMP-1002',
      fullName: 'Tariq Mehmood Khan',
      fullNameAr: 'طارق محمود خان',
      nationality: 'Pakistani',
      nationalityAr: 'باكستاني',
      jobTitle: 'Long Haul Trailer Driver',
      departmentId: 'dept-1',
      mobileNumber: '+966 55 819 2304',
      email: 'tariq.khan@saudifleet.com.sa',
      iqamaNumber: '2491028475', // Resident Iqama (starts with 2)
      iqamaExpiry: addDays(5), // URGENT ALERT (5 days left!)
      passportNumber: 'PK-9912048',
      passportExpiry: addDays(14), // URGENT ALERT (14 days left!)
      workPermitNumber: 'WP-401928',
      workPermitExpiry: addDays(5),
      medicalInsuranceNumber: 'TAW-48190-B',
      medicalInsuranceExpiry: addDays(85),
      contractStartDate: subDays(360),
      contractEndDate: addDays(5),
      joiningDate: subDays(360),
      salary: 5200,
      assignedVehicleId: 'veh-2',
      driverLicenseNumber: 'DL-2491028475',
      driverLicenseExpiry: addDays(90),
      status: 'ACTIVE',
      address: 'Al-Batha, Riyadh, KSA',
      emergencyContact: 'Asad Mehmood (Brother) - +966 54 881 2910',
      notes: 'Iqama renewal request submitted to HR ministry portal.',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(360),
      updatedAt: subDays(1)
    },
    {
      id: 'wrk-3',
      employeeId: 'EMP-1003',
      fullName: 'Mahmoud Sayed Abdelrahman',
      fullNameAr: 'محمود سيد عبد الرحمن',
      nationality: 'Egyptian',
      nationalityAr: 'مصري',
      jobTitle: 'Field Supervisor & Light Vehicle Driver',
      departmentId: 'dept-2',
      mobileNumber: '+966 56 391 8204',
      email: 'mahmoud.sayed@saudifleet.com.sa',
      iqamaNumber: '2381920491',
      iqamaExpiry: subDays(3), // EXPIRED (3 days ago!)
      passportNumber: 'EG-3819201',
      passportExpiry: addDays(310),
      workPermitNumber: 'WP-381920',
      workPermitExpiry: subDays(3), // EXPIRED
      medicalInsuranceNumber: 'MED-10293-C',
      medicalInsuranceExpiry: addDays(120),
      contractStartDate: subDays(500),
      contractEndDate: addDays(230),
      joiningDate: subDays(500),
      salary: 6800,
      assignedVehicleId: 'veh-3',
      driverLicenseNumber: 'DL-2381920491',
      driverLicenseExpiry: subDays(12), // EXPIRED
      status: 'ACTIVE',
      address: 'Al-Bawadi Dist, Jeddah, KSA',
      emergencyContact: 'Amr Sayed (Cousin) - +966 50 918 2039',
      notes: 'URGENT: Morour license & Absher Iqama renewal fees pending payment.',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(500),
      updatedAt: subDays(2)
    },
    {
      id: 'wrk-4',
      employeeId: 'EMP-1004',
      fullName: 'Rajesh Kumar Pillai',
      fullNameAr: 'راجيش كومار بيلاي',
      nationality: 'Indian',
      nationalityAr: 'هندي',
      jobTitle: 'Senior Fleet Mechanic & Test Driver',
      departmentId: 'dept-3',
      mobileNumber: '+966 54 918 2049',
      email: 'rajesh.kumar@saudifleet.com.sa',
      iqamaNumber: '2291048291',
      iqamaExpiry: addDays(28), // WARNING (28 days left)
      passportNumber: 'IN-7491028',
      passportExpiry: addDays(650),
      workPermitNumber: 'WP-910283',
      workPermitExpiry: addDays(28),
      medicalInsuranceNumber: 'BUPA-10928-C',
      medicalInsuranceExpiry: addDays(28), // WARNING
      contractStartDate: subDays(900),
      contractEndDate: addDays(195),
      joiningDate: subDays(900),
      salary: 5800,
      assignedVehicleId: 'veh-4',
      driverLicenseNumber: 'DL-2291048291',
      driverLicenseExpiry: addDays(400),
      status: 'ACTIVE',
      address: 'Industrial Area Phase 2, Dammam, KSA',
      emergencyContact: 'Suresh Kumar - +966 55 928 1029',
      notes: 'Lead mechanic for all heavy Actros trucks.',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(900),
      updatedAt: subDays(15)
    },
    {
      id: 'wrk-5',
      employeeId: 'EMP-1005',
      fullName: 'Bandar Saad Al-Zamil',
      fullNameAr: 'بندر سعد الزامل',
      nationality: 'Saudi',
      nationalityAr: 'سعودي',
      jobTitle: 'Operations Dispatch Manager',
      departmentId: 'dept-2',
      mobileNumber: '+966 50 771 9920',
      email: 'bandar.zamil@saudifleet.com.sa',
      iqamaNumber: '1048291048',
      iqamaExpiry: addDays(800),
      passportNumber: 'G9102849',
      passportExpiry: addDays(750),
      workPermitNumber: 'WP-104829',
      workPermitExpiry: addDays(800),
      medicalInsuranceNumber: 'TAW-88192-A',
      medicalInsuranceExpiry: addDays(310),
      contractStartDate: subDays(1200),
      contractEndDate: addDays(600),
      joiningDate: subDays(1200),
      salary: 14500,
      assignedVehicleId: 'veh-5',
      driverLicenseNumber: 'DL-1048291048',
      driverLicenseExpiry: addDays(550),
      status: 'ACTIVE',
      address: 'Al-Nakheel Dist, Riyadh, KSA',
      emergencyContact: 'Saad Al-Zamil - +966 50 119 2837',
      notes: 'Assigned executive department SUV.',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(1200),
      updatedAt: subDays(4)
    },
    {
      id: 'wrk-6',
      employeeId: 'EMP-1006',
      fullName: 'Janathan Dela Cruz',
      fullNameAr: 'جوناثان ديلا كروز',
      nationality: 'Filipino',
      nationalityAr: 'فلبيني',
      jobTitle: 'Delivery Van Driver',
      departmentId: 'dept-1',
      mobileNumber: '+966 53 192 8401',
      email: 'janathan.cruz@saudifleet.com.sa',
      iqamaNumber: '2410294819',
      iqamaExpiry: addDays(160),
      passportNumber: 'PH-4819204',
      passportExpiry: addDays(8), // URGENT WARNING (8 days left!)
      workPermitNumber: 'WP-481920',
      workPermitExpiry: addDays(160),
      medicalInsuranceNumber: 'MED-88192-B',
      medicalInsuranceExpiry: addDays(210),
      contractStartDate: subDays(400),
      contractEndDate: addDays(330),
      joiningDate: subDays(400),
      salary: 4500,
      assignedVehicleId: 'veh-6',
      driverLicenseNumber: 'DL-2410294819',
      driverLicenseExpiry: addDays(180),
      status: 'ACTIVE',
      address: 'Al-Murabba, Riyadh, KSA',
      emergencyContact: 'Maria Cruz (Wife) - +63 917 123 4567',
      notes: 'Philippine Embassy passport renewal appointment scheduled next week.',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      createdAt: subDays(400),
      updatedAt: subDays(3)
    }
  ];

  const vehicles: Vehicle[] = [
    {
      id: 'veh-1',
      internalVehicleId: 'FLT-101',
      plateNumber: '7845 XYZ',
      plateDigits: '7845',
      plateLettersEn: 'XYZ',
      plateDigitsAr: '٧٨٤٥',
      plateLettersAr: 'س ص ع',
      vehicleType: 'Heavy Truck',
      make: 'Mercedes-Benz',
      model: 'Actros 1845 LS',
      year: 2023,
      color: 'White',
      vin: 'WDB9634031L892104',
      engineNumber: 'OM471LA-981204',
      ownershipType: 'OWNED',
      departmentId: 'dept-1',
      assignedWorkerId: 'wrk-1',
      currentLocation: 'Riyadh Central Logistics Hub',
      latitude: 24.5829,
      longitude: 46.7728,
      speedKmh: 65,
      heading: 42,
      fuelLevelPercent: 78,
      status: 'ACTIVE',
      istimaraNumber: 'IST-89102938',
      istimaraExpiry: addDays(140),
      insuranceCompany: 'Tawuniya',
      insurancePolicyNumber: 'POL-TWN-2024-9910',
      insuranceExpiry: addDays(4), // URGENT EXPIRED IN 4 DAYS!
      inspectionDate: subDays(300),
      inspectionExpiry: addDays(65), // Valid
      purchaseDate: subDays(600),
      purchasePrice: 485000,
      currentMileage: 142500,
      fuelType: 'DIESEL',
      notes: 'Fitted with GPS tracking and cold chain temperature telematics.',
      photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(600),
      updatedAt: subDays(2)
    },
    {
      id: 'veh-2',
      internalVehicleId: 'FLT-102',
      plateNumber: '1234 ABC',
      plateDigits: '1234',
      plateLettersEn: 'ABC',
      plateDigitsAr: '١٢٣٤',
      plateLettersAr: 'أ ب ج',
      vehicleType: 'Heavy Truck',
      make: 'Isuzu',
      model: 'GIGA Prime 6x4',
      year: 2022,
      color: 'Silver',
      vin: 'JALCYZ51Q97102948',
      engineNumber: '6WF1-TC981029',
      ownershipType: 'LEASED',
      departmentId: 'dept-1',
      assignedWorkerId: 'wrk-2',
      currentLocation: 'Dammam Port Cargo Terminal',
      latitude: 26.4207,
      longitude: 50.0888,
      speedKmh: 72,
      heading: 265,
      fuelLevelPercent: 62,
      status: 'ACTIVE',
      istimaraNumber: 'IST-40192837',
      istimaraExpiry: subDays(6), // EXPIRED (6 days ago!)
      insuranceCompany: 'Al-Rajhi Takaful',
      insurancePolicyNumber: 'POL-ARJ-881920',
      insuranceExpiry: addDays(18), // Expiring in 18 days
      inspectionDate: subDays(360),
      inspectionExpiry: subDays(5), // EXPIRED
      purchaseDate: subDays(800),
      purchasePrice: 420000,
      currentMileage: 218900,
      fuelType: 'DIESEL',
      notes: 'Requires immediate MVPI inspection and Istimara fine settlement.',
      photoUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(800),
      updatedAt: subDays(1)
    },
    {
      id: 'veh-3',
      internalVehicleId: 'FLT-103',
      plateNumber: '5678 KSA',
      plateDigits: '5678',
      plateLettersEn: 'KSA',
      plateDigitsAr: '٥٦٧٨',
      plateLettersAr: 'ح س أ',
      vehicleType: 'Pickup',
      make: 'Toyota',
      model: 'Hilux Double Cab 4x4',
      year: 2024,
      color: 'White',
      vin: 'MROFR22G981029384',
      engineNumber: '2GD-FTV491029',
      ownershipType: 'OWNED',
      departmentId: 'dept-2',
      assignedWorkerId: 'wrk-3',
      currentLocation: 'Jeddah Regional Branch',
      latitude: 21.5433,
      longitude: 39.1728,
      speedKmh: 45,
      heading: 180,
      fuelLevelPercent: 88,
      status: 'ACTIVE',
      istimaraNumber: 'IST-77192039',
      istimaraExpiry: addDays(290),
      insuranceCompany: 'Medgulf',
      insurancePolicyNumber: 'POL-MED-491029',
      insuranceExpiry: addDays(290),
      inspectionDate: subDays(60),
      inspectionExpiry: addDays(305),
      purchaseDate: subDays(180),
      purchasePrice: 138000,
      currentMileage: 24500,
      fuelType: 'DIESEL',
      notes: 'Equipped with heavy duty tool racking for field technical team.',
      photoUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(180),
      updatedAt: subDays(5)
    },
    {
      id: 'veh-4',
      internalVehicleId: 'FLT-104',
      plateNumber: '9901 RYD',
      plateDigits: '9901',
      plateLettersEn: 'RYD',
      plateDigitsAr: '٩٩٠١',
      plateLettersAr: 'ر ى د',
      vehicleType: 'Van',
      make: 'Toyota',
      model: 'Hiace High Roof',
      year: 2023,
      color: 'White',
      vin: 'JTFFX22P781029384',
      engineNumber: '1KD-FTV891029',
      ownershipType: 'OWNED',
      departmentId: 'dept-3',
      assignedWorkerId: 'wrk-4',
      currentLocation: 'Dammam Industrial Workshop',
      latitude: 26.4207,
      longitude: 50.0888,
      speedKmh: 0,
      heading: 0,
      fuelLevelPercent: 35,
      status: 'MAINTENANCE',
      istimaraNumber: 'IST-10928374',
      istimaraExpiry: addDays(25), // Expiring in 25 days
      insuranceCompany: 'Tawuniya',
      insurancePolicyNumber: 'POL-TWN-338190',
      insuranceExpiry: addDays(110),
      inspectionDate: subDays(200),
      inspectionExpiry: addDays(165),
      purchaseDate: subDays(450),
      purchasePrice: 125000,
      currentMileage: 89400,
      fuelType: 'GASOLINE_91',
      notes: 'Currently in garage for scheduled brake pad and suspension bushing replacement.',
      photoUrl: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(450),
      updatedAt: subDays(2)
    },
    {
      id: 'veh-5',
      internalVehicleId: 'FLT-105',
      plateNumber: '4411 DMM',
      plateDigits: '4411',
      plateLettersEn: 'DMM',
      plateDigitsAr: '٤٤١١',
      plateLettersAr: 'د م م',
      vehicleType: 'SUV',
      make: 'Toyota',
      model: 'Land Cruiser Prado V6',
      year: 2024,
      color: 'Black',
      vin: 'JTEBU5JR981029381',
      engineNumber: '1GR-FE9910293',
      ownershipType: 'OWNED',
      departmentId: 'dept-2',
      assignedWorkerId: 'wrk-5',
      currentLocation: 'Riyadh Executive HQ VIP Parking',
      latitude: 24.7136,
      longitude: 46.6753,
      speedKmh: 0,
      heading: 90,
      fuelLevelPercent: 92,
      status: 'ACTIVE',
      istimaraNumber: 'IST-99102837',
      istimaraExpiry: addDays(340),
      insuranceCompany: 'Bupa Arabia / Tawuniya',
      insurancePolicyNumber: 'POL-TWN-881920-VIP',
      insuranceExpiry: addDays(340),
      inspectionDate: subDays(30),
      inspectionExpiry: addDays(335),
      purchaseDate: subDays(100),
      purchasePrice: 245000,
      currentMileage: 14200,
      fuelType: 'GASOLINE_95',
      notes: 'Executive vehicle for site visits and government relations.',
      photoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(100),
      updatedAt: subDays(8)
    },
    {
      id: 'veh-6',
      internalVehicleId: 'FLT-106',
      plateNumber: '3322 JED',
      plateDigits: '3322',
      plateLettersEn: 'JED',
      plateDigitsAr: '٣٣٢٢',
      plateLettersAr: 'ج د ى',
      vehicleType: 'Van',
      make: 'Hyundai',
      model: 'Staria Cargo',
      year: 2023,
      color: 'White',
      vin: 'KMHFH81WB81029381',
      engineNumber: 'D4HB-9910284',
      ownershipType: 'OWNED',
      departmentId: 'dept-1',
      assignedWorkerId: 'wrk-6',
      currentLocation: 'Riyadh Express Parcel Center',
      latitude: 24.6380,
      longitude: 46.7130,
      speedKmh: 54,
      heading: 135,
      fuelLevelPercent: 64,
      status: 'ACTIVE',
      istimaraNumber: 'IST-38192048',
      istimaraExpiry: addDays(11), // WARNING (11 days left!)
      insuranceCompany: 'Al-Rajhi Takaful',
      insurancePolicyNumber: 'POL-ARJ-192049',
      insuranceExpiry: addDays(190),
      inspectionDate: subDays(320),
      inspectionExpiry: addDays(45),
      purchaseDate: subDays(380),
      purchasePrice: 112000,
      currentMileage: 64800,
      fuelType: 'DIESEL',
      notes: 'City delivery express unit.',
      photoUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&auto=format&fit=crop&q=80',
      createdAt: subDays(380),
      updatedAt: subDays(3)
    }
  ];

  const documents: AppDocument[] = [
    {
      id: 'doc-1',
      entityType: 'VEHICLE',
      entityId: 'veh-1',
      docType: 'ISTIMARA',
      docNumber: 'IST-89102938',
      fileName: 'Vehicle_Registration_FLT101_7845XYZ.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJUZsZWV0RG9jdW1lbnQ...',
      fileSize: '1.4 MB',
      mimeType: 'application/pdf',
      expiryDate: addDays(140),
      uploadedBy: 'Sultan Al-Dossary',
      uploadedAt: subDays(60),
      version: 1,
      notes: 'Official Saudi Traffic Department (Morour) electronic registration document'
    },
    {
      id: 'doc-2',
      entityType: 'VEHICLE',
      entityId: 'veh-1',
      docType: 'INSURANCE',
      docNumber: 'POL-TWN-2024-9910',
      fileName: 'Tawuniya_Comprehensive_Insurance_Policy.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJUZsZWV0RG9jdW1lbnQ...',
      fileSize: '2.1 MB',
      mimeType: 'application/pdf',
      expiryDate: addDays(4),
      uploadedBy: 'Faisal Al-Mutairi',
      uploadedAt: subDays(360),
      version: 1,
      notes: 'Comprehensive heavy commercial coverage with Najm roadside assistance'
    },
    {
      id: 'doc-3',
      entityType: 'VEHICLE',
      entityId: 'veh-2',
      docType: 'INSPECTION',
      docNumber: 'MVPI-491029',
      fileName: 'MVPI_Periodic_Fahs_Certificate.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJUZsZWV0RG9jdW1lbnQ...',
      fileSize: '850 KB',
      mimeType: 'application/pdf',
      expiryDate: subDays(5),
      uploadedBy: 'Salem Al-Bishi',
      uploadedAt: subDays(365),
      version: 1,
      notes: 'SASO periodic technical inspection certificate (Expired)'
    },
    {
      id: 'doc-4',
      entityType: 'WORKER',
      entityId: 'wrk-2',
      docType: 'IQAMA',
      docNumber: '2491028475',
      fileName: 'Iqama_Card_Copy_Tariq_Khan.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJUZsZWV0RG9jdW1lbnQ...',
      fileSize: '1.1 MB',
      mimeType: 'application/pdf',
      expiryDate: addDays(5),
      uploadedBy: 'Maha Al-Sudairi',
      uploadedAt: subDays(350),
      version: 1,
      notes: 'Muqeem portal resident ID card verification'
    },
    {
      id: 'doc-5',
      entityType: 'WORKER',
      entityId: 'wrk-1',
      docType: 'DRIVER_LICENSE',
      docNumber: 'DL-1092837461',
      fileName: 'Saudi_Heavy_Driving_License_Ahmed.pdf',
      fileData: 'data:application/pdf;base64,JVBERi0xLjQKJUZsZWV0RG9jdW1lbnQ...',
      fileSize: '950 KB',
      mimeType: 'application/pdf',
      expiryDate: addDays(180),
      uploadedBy: 'Maha Al-Sudairi',
      uploadedAt: subDays(200),
      version: 1,
      notes: 'Valid Grade 1 Heavy Public Transport Driving License'
    }
  ];

  const maintenance: MaintenanceRecord[] = [
    {
      id: 'mnt-1',
      vehicleId: 'veh-1',
      maintenanceType: 'PERIODIC_SERVICE',
      date: subDays(20),
      mileage: 140000,
      workshop: 'Mercedes-Benz Juffali Commercial Workshop',
      description: '140,000 KM major maintenance inspection, transmission fluid change, engine tuning and diagnostic check.',
      parts: 'Full synthetic oil 25L, 3x Filter Kit, Fuel Water Separator, Wiper Blades',
      laborCost: 1400,
      partsCost: 3200,
      totalCost: 4600,
      nextMaintenanceDate: addDays(70),
      nextMaintenanceMileage: 160000,
      status: 'COMPLETED',
      notes: 'Clean bill of health. Brake linings at 85%.',
      createdAt: subDays(20)
    },
    {
      id: 'mnt-2',
      vehicleId: 'veh-4',
      maintenanceType: 'BRAKE_SERVICE',
      date: subDays(2),
      mileage: 89400,
      workshop: 'Petromin Auto Care - Dammam Branch',
      description: 'Front and rear brake disc resurfacing, ceramic brake pad replacement, and brake fluid purge.',
      parts: 'OEM Front Brake Pads, OEM Rear Pads, DOT4 Fluid',
      laborCost: 450,
      partsCost: 850,
      totalCost: 1300,
      nextMaintenanceDate: addDays(90),
      nextMaintenanceMileage: 100000,
      status: 'IN_PROGRESS',
      notes: 'Vehicle currently in bay 3, expected pickup tomorrow 2:00 PM.',
      createdAt: subDays(2)
    },
    {
      id: 'mnt-3',
      vehicleId: 'veh-2',
      maintenanceType: 'TIRE_REPLACEMENT',
      date: subDays(45),
      mileage: 212000,
      workshop: 'Al-Rashed Tires & Bridgestone Service Center',
      description: 'Replaced 4 rear drive axle heavy commercial tires with Bridgestone R168.',
      parts: '4x Bridgestone 315/80R22.5 Heavy Commercial Tires, 4x Heavy Valves',
      laborCost: 600,
      partsCost: 6800,
      totalCost: 7400,
      nextMaintenanceDate: addDays(120),
      nextMaintenanceMileage: 235000,
      status: 'COMPLETED',
      notes: 'Wheel alignment and computer dynamic balancing completed.',
      createdAt: subDays(45)
    },
    {
      id: 'mnt-4',
      vehicleId: 'veh-3',
      maintenanceType: 'OIL_CHANGE',
      date: subDays(15),
      mileage: 23500,
      workshop: 'Petromin Express - Jeddah Al-Madinah Rd',
      description: 'Synthetic oil change & 21-point safety inspection.',
      parts: 'Petromin Super Synthetic 5W-40 7L, Genuine Toyota Oil Filter',
      laborCost: 80,
      partsCost: 340,
      totalCost: 420,
      nextMaintenanceDate: addDays(75),
      nextMaintenanceMileage: 33500,
      status: 'COMPLETED',
      notes: 'Next service at 33,500 KM.',
      createdAt: subDays(15)
    }
  ];

  const fuelRecords: FuelRecord[] = [
    {
      id: 'fuel-1',
      vehicleId: 'veh-1',
      driverWorkerId: 'wrk-1',
      date: subDays(2),
      fuelType: 'DIESEL',
      liters: 280,
      pricePerLiter: 1.15,
      totalCost: 322,
      mileage: 142500,
      fuelStation: 'SASCO Highway Station #104 - Riyadh-Dammam Hwy',
      notes: 'Full tank refuel for Riyadh - Dammam roundtrip haul.',
      createdAt: subDays(2)
    },
    {
      id: 'fuel-2',
      vehicleId: 'veh-2',
      driverWorkerId: 'wrk-2',
      date: subDays(4),
      fuelType: 'DIESEL',
      liters: 310,
      pricePerLiter: 1.15,
      totalCost: 356.5,
      mileage: 218900,
      fuelStation: 'Aldrees Petroleum #219 - Dammam Port Gate',
      notes: 'Fuel card transaction approved.',
      createdAt: subDays(4)
    },
    {
      id: 'fuel-3',
      vehicleId: 'veh-3',
      driverWorkerId: 'wrk-3',
      date: subDays(3),
      fuelType: 'DIESEL',
      liters: 65,
      pricePerLiter: 1.15,
      totalCost: 74.75,
      mileage: 24500,
      fuelStation: 'Petromin Station - Jeddah Airport Road',
      notes: 'Field inspection route fuel.',
      createdAt: subDays(3)
    },
    {
      id: 'fuel-4',
      vehicleId: 'veh-5',
      driverWorkerId: 'wrk-5',
      date: subDays(5),
      fuelType: 'GASOLINE_95',
      liters: 72,
      pricePerLiter: 2.33,
      totalCost: 167.76,
      mileage: 14200,
      fuelStation: 'Naft Station - King Fahd Rd Riyadh',
      notes: 'Executive department Prado refuel.',
      createdAt: subDays(5)
    },
    {
      id: 'fuel-5',
      vehicleId: 'veh-6',
      driverWorkerId: 'wrk-6',
      date: subDays(1),
      fuelType: 'DIESEL',
      liters: 58,
      pricePerLiter: 1.15,
      totalCost: 66.7,
      mileage: 64800,
      fuelStation: 'Aldrees Petroleum #84 - Riyadh Ring Road',
      notes: 'Daily delivery route refuel.',
      createdAt: subDays(1)
    },
    {
      id: 'fuel-6',
      vehicleId: 'veh-1',
      driverWorkerId: 'wrk-1',
      date: subDays(12),
      fuelType: 'DIESEL',
      liters: 290,
      pricePerLiter: 1.15,
      totalCost: 333.5,
      mileage: 140800,
      fuelStation: 'SASCO Station - Qassim Expressway',
      notes: 'Trip to Buraidah distribution warehouse.',
      createdAt: subDays(12)
    }
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp-1',
      vehicleId: 'veh-1',
      expenseType: 'MAINTENANCE',
      date: subDays(20),
      amount: 4600,
      vendor: 'Mercedes-Benz Juffali Commercial Workshop',
      invoiceNumber: 'INV-JUF-992104',
      description: '140,000 KM major maintenance overhaul and genuine filters replacement.',
      createdAt: subDays(20)
    },
    {
      id: 'exp-2',
      vehicleId: 'veh-2',
      expenseType: 'TIRES',
      date: subDays(45),
      amount: 7400,
      vendor: 'Al-Rashed Tires & Bridgestone Center',
      invoiceNumber: 'INV-RSH-810294',
      description: '4x Bridgestone heavy trailer tires and dynamic laser balancing.',
      createdAt: subDays(45)
    },
    {
      id: 'exp-3',
      vehicleId: 'veh-2',
      expenseType: 'FINES',
      date: subDays(14),
      amount: 300,
      vendor: 'Morour (General Directorate of Traffic - Absher)',
      invoiceNumber: 'FINE-SA-9102830',
      description: 'Traffic violation: Expired vehicle registration renewal delay fine.',
      createdAt: subDays(14)
    },
    {
      id: 'exp-4',
      vehicleId: 'veh-1',
      expenseType: 'INSURANCE',
      date: subDays(360),
      amount: 14500,
      vendor: 'Tawuniya Insurance Company',
      invoiceNumber: 'INV-TWN-891029',
      description: 'Annual comprehensive fleet policy premium for Actros heavy vehicle.',
      createdAt: subDays(360)
    },
    {
      id: 'exp-5',
      vehicleId: 'veh-5',
      expenseType: 'REGISTRATION',
      date: subDays(100),
      amount: 750,
      vendor: 'Morour (Saudi Traffic Dept)',
      invoiceNumber: 'MOR-IST-991028',
      description: '3-Year private vehicle Istimara issuance and digital plate stamp.',
      createdAt: subDays(100)
    }
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'Vehicle Insurance Expiring Soon',
      titleAr: 'تأمين المركبة سينتهي قريباً',
      titlePs: 'د موټر بیمه ژر ختمیږي',
      message: 'Vehicle 7845 XYZ (Mercedes Actros) insurance with Tawuniya expires in 4 days.',
      messageAr: 'تأمين المركبة ٧٨٤٥ س ص ع لدى شركة التعاونية ينتهي خلال ٤ أيام.',
      messagePs: 'د موټر 7845 XYZ د التعاونیه بیمه په ۴ ورځو کې پای ته رسیږي.',
      type: 'EXPIRY_URGENT',
      severity: 'CRITICAL',
      entityType: 'VEHICLE',
      entityId: 'veh-1',
      isRead: false,
      createdAt: subDays(0)
    },
    {
      id: 'notif-2',
      title: 'Worker Iqama Expiry Alert',
      titleAr: 'تنبيه انتهاء إقامة موظف',
      titlePs: 'د کارکوونکي د اقامې د ختمیدو خبرداری',
      message: 'Worker Tariq Mehmood Khan (EMP-1002) Iqama expires in 5 days.',
      messageAr: 'إقامة الموظف طارق محمود خان (EMP-1002) تنتهي خلال ٥ أيام.',
      messagePs: 'د کارکوونکي طارق محمود خان اقامه په ۵ ورځو کې ختمیږي.',
      type: 'EXPIRY_URGENT',
      severity: 'CRITICAL',
      entityType: 'WORKER',
      entityId: 'wrk-2',
      isRead: false,
      createdAt: subDays(0)
    },
    {
      id: 'notif-3',
      title: 'Expired Documents Detected',
      titleAr: 'تم رصد وثائق منتهية الصلاحية',
      titlePs: 'ختم شوي اسناد وموندل شول',
      message: 'Vehicle 1234 ABC Istimara & MVPI Inspection have EXPIRED.',
      messageAr: 'انتهت استمارة وفحص المركبة ١٢٣٤ أ ب ج.',
      messagePs: 'د ۱۲۳۴ ABC موټر استماره او معاینه پای ته رسیدلي دي.',
      type: 'EXPIRY_URGENT',
      severity: 'CRITICAL',
      entityType: 'VEHICLE',
      entityId: 'veh-2',
      isRead: false,
      createdAt: subDays(1)
    },
    {
      id: 'notif-4',
      title: 'Worker License & Iqama Expired',
      titleAr: 'إقامة ورخصة السائق منتهية',
      titlePs: 'د موټر چلوونکي اقامه او لایسنس ختم شوي',
      message: 'Worker Mahmoud Sayed (EMP-1003) Driving License and Iqama are expired.',
      messageAr: 'انتهت صلاحية رخصة وإقامة السائق محمود سيد (EMP-1003).',
      messagePs: 'د محمود سید اقامه او موټر چلولو لایسنس پای ته رسیدلي دي.',
      type: 'EXPIRY_URGENT',
      severity: 'CRITICAL',
      entityType: 'WORKER',
      entityId: 'wrk-3',
      isRead: false,
      createdAt: subDays(2)
    },
    {
      id: 'notif-5',
      title: 'Scheduled Maintenance in Progress',
      titleAr: 'صيانة دورية جارية حالياً',
      titlePs: 'روان ترمیماتي کار روان دی',
      message: 'Vehicle 9901 RYD is currently at Petromin Auto Care Dammam for brake service.',
      messageAr: 'المركبة ٩٩٠١ ر ى د تخضع لصيانة الفرامل حالياً في بترومين أوتوكير الدمام.',
      messagePs: 'موټر 9901 RYD اوس مهال په پیټرومین ډمام کې د بریکونو په ترمیم بوخت دی.',
      type: 'MAINTENANCE_DUE',
      severity: 'INFO',
      entityType: 'MAINTENANCE',
      entityId: 'mnt-2',
      isRead: true,
      createdAt: subDays(2)
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      userId: 'usr-admin',
      userName: 'Sultan Al-Dossary',
      userRole: 'ADMIN',
      action: 'LOGIN',
      entityType: 'AUTH',
      description: 'Admin user logged in successfully from Riyadh HQ IP',
      ipAddress: '212.138.64.12',
      timestamp: subDays(0)
    },
    {
      id: 'aud-2',
      userId: 'usr-hr',
      userName: 'Maha Al-Sudairi',
      userRole: 'HR',
      action: 'UPDATE',
      entityType: 'WORKER',
      entityId: 'wrk-2',
      description: 'Updated Iqama renewal status and submitted Qiwa work permit request for Tariq Khan',
      oldValue: 'Status: Pending Review',
      newValue: 'Status: In Renewal Process (Qiwa Request #991028)',
      ipAddress: '212.138.64.15',
      timestamp: subDays(1)
    },
    {
      id: 'aud-3',
      userId: 'usr-manager',
      userName: 'Faisal Al-Mutairi',
      userRole: 'MANAGER',
      action: 'CREATE',
      entityType: 'MAINTENANCE',
      entityId: 'mnt-2',
      description: 'Created work order #MNT-2 for Toyota Hiace (9901 RYD) at Petromin Auto Care',
      newValue: 'Work Order Cost: 1,300 SAR',
      ipAddress: '212.138.64.18',
      timestamp: subDays(2)
    }
  ];

  const companyProfile: CompanyProfile = {
    id: 'comp-1',
    name: 'Khyber Logistics services',
    nameAr: 'خدمات خيبر اللوجستية',
    namePs: 'د خيبر لوژستیکي خدمتونه',
    logo: '/khyber_luxury_logo.jpg',
    crNumber: '1010748291', // Saudi Commercial Registration
    vatNumber: '310492817200003', // Saudi 15-digit ZATCA Tax ID
    address: 'King Abdulaziz Road, Al-Murabba District, P.O. Box 48291, Riyadh 11513, Kingdom of Saudi Arabia',
    addressAr: 'طريق الملك عبد العزيز، حي المربع، ص.ب ٤٨٢٩١، الرياض ١١٥١٣، المملكة العربية السعودية',
    phone: '+966 11 489 7700',
    email: 'info@khyber-logistics.com.sa',
    managerName: 'Abdul Wahab Mangal',
    managerNameAr: 'عبد الوهاب منګل',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    hijriEnabled: true,
    createdAt: subDays(1000),
    updatedAt: subDays(10)
  };

  const locations = getSeedLocations();
  const trips = getSeedTrips();
  const driverExpenses = getSeedDriverExpenses();
  const voiceReports = getSeedVoiceReports();

  return {
    users,
    departments,
    vehicles,
    workers,
    documents,
    maintenance,
    fuelRecords,
    expenses,
    locations,
    trips,
    driverExpenses,
    voiceReports,
    notifications,
    chatWebhooks: getSeedChatWebhooks(),
    webhookDispatchLogs: getSeedWebhookDispatchLogs(),
    erpWebhooks: getSeedErpWebhooks(),
    iqamaReminderLogs: getSeedIqamaReminderLogs(),
    erpWebhookDispatchLogs: getSeedErpWebhookDispatchLogs(),
    reportSchedules: getSeedReportSchedules(),
    reportExecutionLogs: getSeedReportExecutionLogs(),
    geofences: getSeedGeofences(),
    gpsLogs: getSeedGpsLogs(vehicles),
    geofenceAlerts: getSeedGeofenceAlerts(vehicles, getSeedGeofences()),
    auditLogs,
    vehicleAssignments: getSeedVehicleAssignments(),
    companyProfile,
    systemSettings: {
      alertDaysThresholds: [60, 30, 15, 7, 1],
      autoBackupEnabled: true,
      autoBackupFrequency: 'DAILY',
      smsAlertsEnabled: true,
      emailAlertsEnabled: true,
      whatsappAlertsEnabled: false,
      defaultLanguage: 'en',
      aiConfidenceThreshold: 0.85,
      voiceRetentionDays: 90
    }
  };
}

export function getSeedLocations(): CompanyLocation[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'loc-1',
      name: 'Riyadh Central Logistics Hub',
      nameAr: 'مركز الرياض اللوجستي المركزي',
      nameEn: 'Riyadh Central Logistics Hub',
      type: 'HEAD_OFFICE',
      address: 'Exit 18, Ring Road South, Industrial Area 2, Riyadh',
      addressAr: 'مخرج ١٨، الدائري الجنوبي، المدينة الصناعية الثانية، الرياض',
      latitude: 24.5829,
      longitude: 46.7728,
      isActive: true,
      aliases: ['Riyadh', 'الرياض', 'ریاض', 'Riyadh Hub', 'Central Hub', 'Riyadh HQ', 'مرکز ریاض'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-2',
      name: 'Jeddah Islamic Port Terminal',
      nameAr: 'محطة ميناء جدة الإسلامي',
      nameEn: 'Jeddah Islamic Port Terminal',
      type: 'PORT',
      address: 'Port Customs Gate 3, Al-Mina Dist, Jeddah',
      addressAr: 'بوابة الجمارك ٣، حي الميناء، جدة',
      latitude: 21.4858,
      longitude: 39.1764,
      isActive: true,
      aliases: ['Jeddah', 'جدة', 'جده', 'Jeddah Port', 'Islamic Port', 'ميناء جدة', 'جدې بندر'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-3',
      name: 'Dammam Dry Port & Logistics Depot',
      nameAr: 'الميناء الجاف ومستودع الدمام',
      nameEn: 'Dammam Dry Port & Logistics Depot',
      type: 'DEPOT',
      address: 'King Fahd Suburb, Dammam-Al Khobar Highway, Dammam',
      addressAr: 'ضاحية الملك فهد، طريق الدمام الخبر السريع، الدمام',
      latitude: 26.4207,
      longitude: 50.0888,
      isActive: true,
      aliases: ['Dammam', 'الدمام', 'دمام', 'Dammam Depot', 'Dry Port Dammam'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-4',
      name: 'Makkah Logistics & Pilgrimage Supply Base',
      nameAr: 'قاعدة إمداد مكة المكرمة اللوجستية',
      nameEn: 'Makkah Logistics Supply Base',
      type: 'WAREHOUSE',
      address: 'Al-Kakiyyah Industrial Hub, Makkah',
      addressAr: 'منطقة الكعكية الصناعية، مكة المكرمة',
      latitude: 21.3691,
      longitude: 39.8152,
      isActive: true,
      aliases: ['Makkah', 'مكة', 'مكة المكرمة', 'مکه', 'مکه مکرمه'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-5',
      name: 'Madinah Cargo & Distribution Center',
      nameAr: 'مركز شحن وتوزيع المدينة المنورة',
      nameEn: 'Madinah Cargo & Distribution Center',
      type: 'WAREHOUSE',
      address: 'Abyar Ali Industrial Park, Madinah',
      addressAr: 'المدينة الصناعية بأبيار علي، المدينة المنورة',
      latitude: 24.4672,
      longitude: 39.6111,
      isActive: true,
      aliases: ['Madinah', 'المدينة', 'المدينة المنورة', 'مدينه', 'مدینه منوره'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-6',
      name: 'Jubail Industrial Petrochemical Depot',
      nameAr: 'مستودع الجبيل للبتروكيماويات والصناعات',
      nameEn: 'Jubail Industrial Depot',
      type: 'DEPOT',
      address: 'Support Industrial City Stage 2, Jubail',
      addressAr: 'المنطقة المساندة للمدينة الصناعية ٢، الجبيل',
      latitude: 27.0046,
      longitude: 49.6587,
      isActive: true,
      aliases: ['Jubail', 'الجبيل', 'جبيل', 'Jubail Depot'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-7',
      name: 'Yanbu Commercial Port & Storage',
      nameAr: 'ميناء ينبع التجاري ومرافق التخزين',
      nameEn: 'Yanbu Commercial Port',
      type: 'PORT',
      address: 'Port Authority Zone, Yanbu Al-Bahr',
      addressAr: 'منطقة هيئة الموانئ، ينبع البحر',
      latitude: 24.0891,
      longitude: 38.0618,
      isActive: true,
      aliases: ['Yanbu', 'ينبع', 'ينبع البحر'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-8',
      name: 'Customer Site Alpha (SABIC Supply)',
      nameAr: 'موقع العميل أ (إمدادات سابك)',
      nameEn: 'Customer Site Alpha (SABIC Supply)',
      type: 'CUSTOMER_SITE',
      address: 'SABIC Industrial Park Gate 4, Jubail',
      latitude: 27.0250,
      longitude: 49.6420,
      isActive: true,
      aliases: ['Customer Site Alpha', 'Site A', 'موقع أ', 'سابك'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'loc-9',
      name: 'Customer Site Beta (Almarai Distribution)',
      nameAr: 'موقع العميل ب (توزيع المراعي)',
      nameEn: 'Customer Site Beta (Almarai Distribution)',
      type: 'CUSTOMER_SITE',
      address: 'Al-Kharj Food Processing Zone, Al-Kharj',
      latitude: 24.1550,
      longitude: 47.3120,
      isActive: true,
      aliases: ['Customer Site Beta', 'Site B', 'موقع ب', 'المراعي', 'Al-Kharj'],
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function getSeedVoiceReports(): VoiceReport[] {
  const now = new Date();
  const subDays = (d: number, h: number = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(date.getHours() - h);
    return date.toISOString();
  };

  return [
    {
      id: 'VR-1001',
      driverId: 'wrk-1',
      driverName: 'Ahmed Mohammed Al-Omari',
      driverEmployeeId: 'EMP-1001',
      vehicleId: 'veh-1',
      vehiclePlate: '7845 XYZ',
      vehicleInternalId: 'FLT-101',
      departmentId: 'dept-1',
      departmentName: 'Logistics & Supply Chain',
      audioFileUrl: '/api/voice-reports/VR-1001/audio',
      audioDurationSeconds: 14,
      audioMimeType: 'audio/webm',
      language: 'ar',
      transcription: 'أنا متجه الآن إلى الرياض لتسليم شحنة بضائع، صرفت 20 ريال ديزل بالمحطة و200 ريال مصاريف تحميل ونزول.',
      normalizedText: 'I am currently heading to Riyadh for cargo delivery. I spent 20 SAR on diesel at the fuel station and 200 SAR for loading and unloading expenses.',
      aiExtraction: {
        destination: {
          name: 'Riyadh',
          matchedLocationId: 'loc-1',
          matchedLocationName: 'Riyadh Central Logistics Hub',
          matchedLocationConfidence: 0.98,
          confidence: 0.98
        },
        origin: null,
        tripType: 'Cargo Delivery',
        tripDescription: 'Cargo delivery transport to Riyadh Central Hub',
        expenses: [
          {
            category: 'FUEL',
            amount: 20,
            currency: 'SAR',
            description: 'Diesel fuel refill at station',
            confidence: 0.99
          },
          {
            category: 'LOADING',
            amount: 200,
            currency: 'SAR',
            description: 'Loading and unloading fees',
            confidence: 0.96
          }
        ],
        totalExpense: 220,
        fuelExpense: 20,
        otherExpense: 200,
        currency: 'SAR',
        overallConfidence: 0.97,
        requiresClarification: false
      },
      aiConfidence: 0.97,
      processingStatus: 'COMPLETED',
      reviewStatus: 'PENDING',
      driverConfirmed: true,
      driverConfirmedAt: subDays(0, 2),
      auditHistory: [
        {
          id: 'aud-vr-1-1',
          timestamp: subDays(0, 2),
          action: 'UPLOADED',
          actorId: 'wrk-1',
          actorName: 'Ahmed Mohammed Al-Omari',
          actorRole: 'DRIVER',
          details: 'Voice report recording uploaded via driver mobile terminal.'
        },
        {
          id: 'aud-vr-1-2',
          timestamp: subDays(0, 2),
          action: 'PROCESSED',
          actorId: 'sys-gemini',
          actorName: 'AI Voice Pipeline (Gemini 3.7)',
          actorRole: 'SYSTEM',
          details: 'Transcribed Arabic audio, extracted destination (Riyadh, 98% match) and 2 expenses (20 SAR Fuel, 200 SAR Loading). Backend calculated total: 220 SAR.'
        },
        {
          id: 'aud-vr-1-3',
          timestamp: subDays(0, 2),
          action: 'DRIVER_CONFIRMED',
          actorId: 'wrk-1',
          actorName: 'Ahmed Mohammed Al-Omari',
          actorRole: 'DRIVER',
          details: 'Driver confirmed AI structured extraction on mobile screen.'
        }
      ],
      createdAt: subDays(0, 2),
      updatedAt: subDays(0, 2)
    },
    {
      id: 'VR-1002',
      driverId: 'wrk-2',
      driverName: 'Tariq Mahmoud Al-Masri',
      driverEmployeeId: 'EMP-1002',
      vehicleId: 'veh-2',
      vehiclePlate: '9901 RYD',
      vehicleInternalId: 'FLT-102',
      departmentId: 'dept-1',
      departmentName: 'Logistics & Supply Chain',
      audioFileUrl: '/api/voice-reports/VR-1002/audio',
      audioDurationSeconds: 19,
      audioMimeType: 'audio/webm',
      language: 'ps',
      transcription: 'زه د جدې اسلامي بندر ته بار وړم، زما مصارف پنځوس ریاله ډیزل دي، او شل ریاله د پارکینګ او اته سوه ریاله د بار خرڅ شوی.',
      normalizedText: 'I am transporting cargo to Jeddah Islamic Port. My expenses are 50 SAR for diesel, 20 SAR for port parking, and 800 SAR for cargo loading/unloading.',
      aiExtraction: {
        destination: {
          name: 'Jeddah',
          matchedLocationId: 'loc-2',
          matchedLocationName: 'Jeddah Islamic Port Terminal',
          matchedLocationConfidence: 0.96,
          confidence: 0.96
        },
        origin: null,
        tripType: 'Cargo Delivery',
        tripDescription: 'Heavy cargo shipment to Jeddah Islamic Port Terminal',
        expenses: [
          {
            category: 'FUEL',
            amount: 50,
            currency: 'SAR',
            description: 'Diesel fuel refill',
            confidence: 0.98
          },
          {
            category: 'PARKING',
            amount: 20,
            currency: 'SAR',
            description: 'Port parking fee',
            confidence: 0.94
          },
          {
            category: 'LOADING',
            amount: 800,
            currency: 'SAR',
            description: 'Cargo loading fee',
            confidence: 0.95
          }
        ],
        totalExpense: 870,
        fuelExpense: 50,
        otherExpense: 820,
        currency: 'SAR',
        overallConfidence: 0.96,
        requiresClarification: false
      },
      aiConfidence: 0.96,
      processingStatus: 'COMPLETED',
      reviewStatus: 'APPROVED',
      driverConfirmed: true,
      driverConfirmedAt: subDays(1, 4),
      reviewedBy: 'usr-admin',
      reviewedByName: 'Sultan Al-Dossary',
      reviewedAt: subDays(1, 1),
      reviewNotes: 'Verified against port manifest and terminal receipt voucher.',
      generatedTripId: 'trp-101',
      generatedExpenseIds: ['exp-drv-1', 'exp-drv-2', 'exp-drv-3'],
      auditHistory: [
        {
          id: 'aud-vr-2-1',
          timestamp: subDays(1, 4),
          action: 'UPLOADED',
          actorId: 'wrk-2',
          actorName: 'Tariq Mahmoud Al-Masri',
          actorRole: 'DRIVER',
          details: 'Voice report submitted via mobile in Pashto dialect.'
        },
        {
          id: 'aud-vr-2-2',
          timestamp: subDays(1, 4),
          action: 'PROCESSED',
          actorId: 'sys-gemini',
          actorName: 'AI Voice Pipeline (Gemini 3.7)',
          actorRole: 'SYSTEM',
          details: 'Pashto language recognized, destination matched to Jeddah Islamic Port Terminal (96%), 3 expenses extracted: 50 SAR Fuel, 20 SAR Parking, 800 SAR Loading. Total: 870 SAR.'
        },
        {
          id: 'aud-vr-2-3',
          timestamp: subDays(1, 1),
          action: 'APPROVED',
          actorId: 'usr-admin',
          actorName: 'Sultan Al-Dossary',
          actorRole: 'ADMIN',
          details: 'Approved report and created official accounting ledger records and active trip #trp-101.'
        }
      ],
      createdAt: subDays(1, 4),
      updatedAt: subDays(1, 1)
    },
    {
      id: 'VR-1003',
      driverId: 'wrk-4',
      driverName: 'Rajesh Kumar Pillai',
      driverEmployeeId: 'EMP-1004',
      vehicleId: 'veh-4',
      vehiclePlate: '4452 JED',
      vehicleInternalId: 'FLT-104',
      departmentId: 'dept-3',
      departmentName: 'Field Maintenance & Technical',
      audioFileUrl: '/api/voice-reports/VR-1003/audio',
      audioDurationSeconds: 16,
      audioMimeType: 'audio/webm',
      language: 'ur',
      transcription: 'میں دمام ڈرائی پورٹ پر بوجھ لے کر پہنچ گیا ہوں، راستے میں ٹائر پنکچر ہو گیا تھا جس پر 100 ریال مرمت اور 150 ریال ڈیزل لگا۔',
      normalizedText: 'I have arrived at Dammam Dry Port with cargo. On the way a tire was punctured, costing 100 SAR for repair and 150 SAR on diesel.',
      aiExtraction: {
        destination: {
          name: 'Dammam',
          matchedLocationId: 'loc-3',
          matchedLocationName: 'Dammam Dry Port & Logistics Depot',
          matchedLocationConfidence: 0.95,
          confidence: 0.95
        },
        origin: null,
        tripType: 'Cargo Delivery',
        tripDescription: 'Material haul to Dammam Dry Port Depot',
        expenses: [
          {
            category: 'MAINTENANCE',
            amount: 100,
            currency: 'SAR',
            description: 'En-route emergency tire repair',
            confidence: 0.95
          },
          {
            category: 'FUEL',
            amount: 150,
            currency: 'SAR',
            description: 'Diesel fuel refill',
            confidence: 0.97
          }
        ],
        totalExpense: 250,
        fuelExpense: 150,
        otherExpense: 100,
        currency: 'SAR',
        overallConfidence: 0.95,
        requiresClarification: false
      },
      aiConfidence: 0.95,
      processingStatus: 'COMPLETED',
      reviewStatus: 'PENDING',
      driverConfirmed: true,
      driverConfirmedAt: subDays(0, 5),
      auditHistory: [
        {
          id: 'aud-vr-3-1',
          timestamp: subDays(0, 5),
          action: 'UPLOADED',
          actorId: 'wrk-4',
          actorName: 'Rajesh Kumar Pillai',
          actorRole: 'DRIVER',
          details: 'Voice report submitted in Urdu audio.'
        },
        {
          id: 'aud-vr-3-2',
          timestamp: subDays(0, 5),
          action: 'PROCESSED',
          actorId: 'sys-gemini',
          actorName: 'AI Voice Pipeline (Gemini 3.7)',
          actorRole: 'SYSTEM',
          details: 'Urdu speech extracted: Destination Dammam (95%), 100 SAR Tire Maintenance, 150 SAR Fuel. Total: 250 SAR.'
        }
      ],
      createdAt: subDays(0, 5),
      updatedAt: subDays(0, 5)
    },
    {
      id: 'VR-1004',
      driverId: 'wrk-6',
      driverName: 'Janathan Dela Cruz',
      driverEmployeeId: 'EMP-1006',
      vehicleId: 'veh-6',
      vehiclePlate: '1122 DMM',
      vehicleInternalId: 'FLT-106',
      departmentId: 'dept-1',
      departmentName: 'Logistics & Supply Chain',
      audioFileUrl: '/api/voice-reports/VR-1004/audio',
      audioDurationSeconds: 12,
      audioMimeType: 'audio/webm',
      language: 'en',
      transcription: 'Delivering urgent commercial spare parts to Customer Site Beta in Al-Kharj. Paid 35 SAR toll gate fee and 80 SAR fuel.',
      normalizedText: 'Delivering urgent commercial spare parts to Customer Site Beta in Al-Kharj. Paid 35 SAR toll gate fee and 80 SAR fuel.',
      aiExtraction: {
        destination: {
          name: 'Customer Site Beta',
          matchedLocationId: 'loc-9',
          matchedLocationName: 'Customer Site Beta (Almarai Distribution)',
          matchedLocationConfidence: 0.97,
          confidence: 0.97
        },
        origin: null,
        tripType: 'Material Transfer',
        tripDescription: 'Spare parts delivery to Customer Site Beta in Al-Kharj',
        expenses: [
          {
            category: 'TOLL',
            amount: 35,
            currency: 'SAR',
            description: 'Highway toll & gate access fee',
            confidence: 0.98
          },
          {
            category: 'FUEL',
            amount: 80,
            currency: 'SAR',
            description: 'Gasoline refill',
            confidence: 0.99
          }
        ],
        totalExpense: 115,
        fuelExpense: 80,
        otherExpense: 35,
        currency: 'SAR',
        overallConfidence: 0.98,
        requiresClarification: false
      },
      aiConfidence: 0.98,
      processingStatus: 'COMPLETED',
      reviewStatus: 'APPROVED',
      driverConfirmed: true,
      driverConfirmedAt: subDays(2, 6),
      reviewedBy: 'usr-manager',
      reviewedByName: 'Faisal Al-Mutairi',
      reviewedAt: subDays(2, 3),
      reviewNotes: 'Customer delivery confirmed by logistics dispatch.',
      generatedTripId: 'trp-102',
      generatedExpenseIds: ['exp-drv-4', 'exp-drv-5'],
      auditHistory: [
        {
          id: 'aud-vr-4-1',
          timestamp: subDays(2, 6),
          action: 'UPLOADED',
          actorId: 'wrk-6',
          actorName: 'Janathan Dela Cruz',
          actorRole: 'DRIVER',
          details: 'English voice report submitted.'
        },
        {
          id: 'aud-vr-4-2',
          timestamp: subDays(2, 3),
          action: 'APPROVED',
          actorId: 'usr-manager',
          actorName: 'Faisal Al-Mutairi',
          actorRole: 'MANAGER',
          details: 'Approved 115 SAR total expenses and registered official trip #trp-102.'
        }
      ],
      createdAt: subDays(2, 6),
      updatedAt: subDays(2, 3)
    }
  ];
}

export function getSeedTrips(): TripRecord[] {
  const now = new Date();
  const subDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().split('T')[0];
  };

  return [
    // --- veh-1: Toyota Hilux (FLT-101, Current Odo ~48,000 KM) ---
    {
      id: 'trp-103',
      driverId: 'wrk-1',
      vehicleId: 'veh-1',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-3',
      destinationName: 'Dammam Dry Port & Logistics Depot',
      destinationCoords: { lat: 26.4207, lng: 50.0888 },
      currentCoords: { lat: 25.5500, lng: 48.4500 },
      tripDate: subDays(0),
      tripType: 'Cargo Delivery',
      description: 'Scheduled freight dispatch of industrial parts to Eastern Province logistics depot',
      status: 'IN_PROGRESS',
      distanceKm: 420,
      startOdometer: 47980,
      endOdometer: 48400,
      createdAt: subDays(0),
      updatedAt: subDays(0)
    },
    {
      id: 'trp-105',
      driverId: 'wrk-1',
      vehicleId: 'veh-1',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-9',
      destinationName: 'Al-Kharj Agricultural Distribution Depot',
      destinationCoords: { lat: 24.1352, lng: 47.3114 },
      currentCoords: { lat: 24.1352, lng: 47.3114 },
      tripDate: subDays(4),
      tripType: 'Material Transfer',
      description: 'Urgent pallet delivery and equipment transfer to customer facilities in Al-Kharj',
      status: 'COMPLETED',
      distanceKm: 95,
      startOdometer: 47885,
      endOdometer: 47980,
      createdAt: subDays(4),
      updatedAt: subDays(4)
    },
    {
      id: 'trp-106',
      driverId: 'wrk-1',
      vehicleId: 'veh-1',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-7',
      destinationName: 'King Khalid International Airport Air Cargo Terminal',
      destinationCoords: { lat: 24.9576, lng: 46.6988 },
      currentCoords: { lat: 24.9576, lng: 46.6988 },
      tripDate: subDays(9),
      tripType: 'Express Logistics',
      description: 'Priority customs clearance consignment pickup from KKIA terminal',
      status: 'COMPLETED',
      distanceKm: 55,
      startOdometer: 47830,
      endOdometer: 47885,
      createdAt: subDays(9),
      updatedAt: subDays(9)
    },

    // --- veh-2: Mercedes-Benz Actros (FLT-102, Current Odo ~145,000 KM) ---
    {
      id: 'trp-101',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-2',
      destinationName: 'Jeddah Islamic Port Terminal',
      destinationCoords: { lat: 21.4858, lng: 39.1764 },
      currentCoords: { lat: 21.4858, lng: 39.1764 },
      tripDate: subDays(1),
      voiceReportId: 'VR-1002',
      tripType: 'Cargo Delivery',
      description: 'Heavy 40ft container transport to Jeddah Islamic Port Terminal from voice report #VR-1002',
      status: 'COMPLETED',
      distanceKm: 950,
      startOdometer: 144050,
      endOdometer: 145000,
      createdAt: subDays(1),
      updatedAt: subDays(1)
    },
    {
      id: 'trp-107',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      originLocationId: 'loc-3',
      originName: 'King Abdulaziz Port Dammam',
      originCoords: { lat: 26.4207, lng: 50.0888 },
      destinationLocationId: 'loc-1',
      destinationName: 'Riyadh Central Logistics Hub',
      destinationCoords: { lat: 24.5829, lng: 46.7728 },
      currentCoords: { lat: 24.5829, lng: 46.7728 },
      tripDate: subDays(6),
      tripType: 'Container Haulage',
      description: 'Inbound maritime container transit from Dammam port to central hub',
      status: 'COMPLETED',
      distanceKm: 425,
      startOdometer: 143625,
      endOdometer: 144050,
      createdAt: subDays(6),
      updatedAt: subDays(6)
    },
    {
      id: 'trp-108',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-8',
      destinationName: 'Jubail Industrial City Petrochemical Depot',
      destinationCoords: { lat: 27.0174, lng: 49.6583 },
      currentCoords: { lat: 27.0174, lng: 49.6583 },
      tripDate: subDays(14),
      tripType: 'Industrial Freight',
      description: 'Bulk specialized raw materials delivery to Royal Commission Jubail facilities',
      status: 'COMPLETED',
      distanceKm: 480,
      startOdometer: 143145,
      endOdometer: 143625,
      createdAt: subDays(14),
      updatedAt: subDays(14)
    },

    // --- veh-3: Isuzu NPR Medium Truck (FLT-103, Current Odo ~32,000 KM) ---
    {
      id: 'trp-104',
      driverId: 'wrk-3',
      vehicleId: 'veh-3',
      originLocationId: 'loc-5',
      originName: 'Madinah Cargo & Distribution Center',
      originCoords: { lat: 24.4672, lng: 39.6111 },
      destinationLocationId: 'loc-4',
      destinationName: 'Makkah Logistics & Pilgrimage Supply Base',
      destinationCoords: { lat: 21.3691, lng: 39.8152 },
      currentCoords: { lat: 22.9181, lng: 39.7130 },
      tripDate: subDays(0),
      tripType: 'Pilgrimage Logistics',
      description: 'Urgent medical and catering supplies delivery via Hijrah Highway corridor',
      status: 'IN_PROGRESS',
      distanceKm: 440,
      startOdometer: 31760,
      endOdometer: 32200,
      createdAt: subDays(0),
      updatedAt: subDays(0)
    },
    {
      id: 'trp-109',
      driverId: 'wrk-3',
      vehicleId: 'veh-3',
      originLocationId: 'loc-2',
      originName: 'Jeddah South Industrial Distribution Hub',
      originCoords: { lat: 21.4858, lng: 39.1764 },
      destinationLocationId: 'loc-10',
      destinationName: 'Yanbu Commercial Port & Industrial Zone',
      destinationCoords: { lat: 24.0891, lng: 38.0637 },
      currentCoords: { lat: 24.0891, lng: 38.0637 },
      tripDate: subDays(5),
      tripType: 'Commercial Transit',
      description: 'Scheduled refrigerated and packaged goods transit to Yanbu retail hubs',
      status: 'COMPLETED',
      distanceKm: 330,
      startOdometer: 31430,
      endOdometer: 31760,
      createdAt: subDays(5),
      updatedAt: subDays(5)
    },
    {
      id: 'trp-110',
      driverId: 'wrk-3',
      vehicleId: 'veh-3',
      originLocationId: 'loc-4',
      originName: 'Makkah Logistics & Pilgrimage Supply Base',
      originCoords: { lat: 21.3691, lng: 39.8152 },
      destinationLocationId: 'loc-2',
      destinationName: 'Jeddah South Industrial Distribution Hub',
      destinationCoords: { lat: 21.4858, lng: 39.1764 },
      currentCoords: { lat: 21.4858, lng: 39.1764 },
      tripDate: subDays(11),
      tripType: 'Regional Shuttle',
      description: 'Supply replenishment shuttle between Western Province depots',
      status: 'COMPLETED',
      distanceKm: 85,
      startOdometer: 31345,
      endOdometer: 31430,
      createdAt: subDays(11),
      updatedAt: subDays(11)
    },

    // --- veh-4: Toyota Hiace (FLT-104, Current Odo ~67,000 KM) ---
    {
      id: 'trp-111',
      driverId: 'wrk-4',
      vehicleId: 'veh-4',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-11',
      destinationName: 'King Abdulaziz Medical City Pharmacy Depot',
      destinationCoords: { lat: 24.7525, lng: 46.8581 },
      currentCoords: { lat: 24.7525, lng: 46.8581 },
      tripDate: subDays(1),
      tripType: 'Express Courier',
      description: 'Temperature-monitored pharmaceutical consignment direct delivery',
      status: 'COMPLETED',
      distanceKm: 45,
      startOdometer: 66955,
      endOdometer: 67000,
      createdAt: subDays(1),
      updatedAt: subDays(1)
    },
    {
      id: 'trp-112',
      driverId: 'wrk-4',
      vehicleId: 'veh-4',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-9',
      destinationName: 'Al-Kharj Industrial Distribution Park',
      destinationCoords: { lat: 24.1352, lng: 47.3114 },
      currentCoords: { lat: 24.1352, lng: 47.3114 },
      tripDate: subDays(3),
      tripType: 'Material Transfer',
      description: 'Urgent office documentation and tech hardware transfer',
      status: 'COMPLETED',
      distanceKm: 120,
      startOdometer: 66835,
      endOdometer: 66955,
      createdAt: subDays(3),
      updatedAt: subDays(3)
    },
    {
      id: 'trp-113',
      driverId: 'wrk-4',
      vehicleId: 'veh-4',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-12',
      destinationName: 'King Abdullah Financial District (KAFD)',
      destinationCoords: { lat: 24.7644, lng: 46.6416 },
      currentCoords: { lat: 24.7644, lng: 46.6416 },
      tripDate: subDays(8),
      tripType: 'Corporate Courier',
      description: 'Multi-stop executive document delivery loop across Riyadh commercial centers',
      status: 'COMPLETED',
      distanceKm: 85,
      startOdometer: 66750,
      endOdometer: 66835,
      createdAt: subDays(8),
      updatedAt: subDays(8)
    },

    // --- veh-5: Ford Transit Van (FLT-105, Current Odo ~18,500 KM) ---
    {
      id: 'trp-114',
      driverId: 'wrk-5',
      vehicleId: 'veh-5',
      originLocationId: 'loc-3',
      originName: 'Dammam Dry Port & Logistics Depot',
      originCoords: { lat: 26.4207, lng: 50.0888 },
      destinationLocationId: 'loc-13',
      destinationName: 'Al-Khobar Commercial Logistics Center',
      destinationCoords: { lat: 26.2172, lng: 50.1971 },
      currentCoords: { lat: 26.2172, lng: 50.1971 },
      tripDate: subDays(2),
      tripType: 'Last-Mile Delivery',
      description: 'Retail store restock and parcel distribution along Dhahran-Khobar expressway',
      status: 'COMPLETED',
      distanceKm: 35,
      startOdometer: 18465,
      endOdometer: 18500,
      createdAt: subDays(2),
      updatedAt: subDays(2)
    },
    {
      id: 'trp-115',
      driverId: 'wrk-5',
      vehicleId: 'veh-5',
      originLocationId: 'loc-3',
      originName: 'Dammam Dry Port & Logistics Depot',
      originCoords: { lat: 26.4207, lng: 50.0888 },
      destinationLocationId: 'loc-8',
      destinationName: 'Jubail Commercial Harbor Depot',
      destinationCoords: { lat: 27.0174, lng: 49.6583 },
      currentCoords: { lat: 27.0174, lng: 49.6583 },
      tripDate: subDays(7),
      tripType: 'Express Logistics',
      description: 'Direct courier delivery of critical machinery seals to Jubail harbor terminal',
      status: 'COMPLETED',
      distanceKm: 110,
      startOdometer: 18355,
      endOdometer: 18465,
      createdAt: subDays(7),
      updatedAt: subDays(7)
    },

    // --- veh-6: Hyundai Mighty Truck (FLT-106, Current Odo ~29,400 KM) ---
    {
      id: 'trp-102',
      driverId: 'wrk-6',
      vehicleId: 'veh-6',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-9',
      destinationName: 'Customer Site Beta (Almarai Distribution)',
      destinationCoords: { lat: 24.1352, lng: 47.3114 },
      currentCoords: { lat: 24.1352, lng: 47.3114 },
      tripDate: subDays(2),
      voiceReportId: 'VR-1004',
      tripType: 'Material Transfer',
      description: 'Spare parts delivery to Customer Site Beta in Al-Kharj from voice report #VR-1004',
      status: 'COMPLETED',
      distanceKm: 85,
      startOdometer: 29315,
      endOdometer: 29400,
      createdAt: subDays(2),
      updatedAt: subDays(2)
    },
    {
      id: 'trp-117',
      driverId: 'wrk-6',
      vehicleId: 'veh-6',
      originLocationId: 'loc-1',
      originName: 'Riyadh Central Logistics Hub',
      originCoords: { lat: 24.5829, lng: 46.7728 },
      destinationLocationId: 'loc-14',
      destinationName: 'Riyadh South Wholesale Market (Al-Aziziyah)',
      destinationCoords: { lat: 24.5615, lng: 46.7410 },
      currentCoords: { lat: 24.5615, lng: 46.7410 },
      tripDate: subDays(6),
      tripType: 'Commercial Delivery',
      description: 'Wholesale palletized FMCG drop-off across southern market zones',
      status: 'COMPLETED',
      distanceKm: 65,
      startOdometer: 29250,
      endOdometer: 29315,
      createdAt: subDays(6),
      updatedAt: subDays(6)
    },
    {
      id: 'trp-118',
      driverId: 'wrk-6',
      vehicleId: 'veh-6',
      originLocationId: 'loc-15',
      originName: 'Qassim Regional Agro Hub (Buraidah)',
      originCoords: { lat: 26.3260, lng: 43.9750 },
      destinationLocationId: 'loc-1',
      destinationName: 'Riyadh Central Logistics Hub',
      destinationCoords: { lat: 24.5829, lng: 46.7728 },
      currentCoords: { lat: 24.5829, lng: 46.7728 },
      tripDate: subDays(12),
      tripType: 'Intercity Cargo',
      description: 'Fresh agricultural produce inbound logistics dispatch to Riyadh center',
      status: 'COMPLETED',
      distanceKm: 340,
      startOdometer: 28910,
      endOdometer: 29250,
      createdAt: subDays(12),
      updatedAt: subDays(12)
    }
  ];
}

export function getSeedDriverExpenses(): DriverExpenseItem[] {
  const now = new Date();
  const subDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().split('T')[0];
  };

  return [
    {
      id: 'exp-drv-1',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      tripId: 'trp-101',
      category: 'FUEL',
      amount: 50,
      currency: 'SAR',
      description: 'Diesel fuel refill (Voice Report #VR-1002)',
      voiceReportId: 'VR-1002',
      expenseDate: subDays(1),
      status: 'APPROVED',
      approvedBy: 'usr-admin',
      approvedByName: 'Sultan Al-Dossary',
      approvedAt: subDays(1),
      createdAt: subDays(1),
      updatedAt: subDays(1)
    },
    {
      id: 'exp-drv-2',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      tripId: 'trp-101',
      category: 'PARKING',
      amount: 20,
      currency: 'SAR',
      description: 'Port parking fee (Voice Report #VR-1002)',
      voiceReportId: 'VR-1002',
      expenseDate: subDays(1),
      status: 'APPROVED',
      approvedBy: 'usr-admin',
      approvedByName: 'Sultan Al-Dossary',
      approvedAt: subDays(1),
      createdAt: subDays(1),
      updatedAt: subDays(1)
    },
    {
      id: 'exp-drv-3',
      driverId: 'wrk-2',
      vehicleId: 'veh-2',
      tripId: 'trp-101',
      category: 'LOADING',
      amount: 800,
      currency: 'SAR',
      description: 'Cargo loading fee (Voice Report #VR-1002)',
      voiceReportId: 'VR-1002',
      expenseDate: subDays(1),
      status: 'APPROVED',
      approvedBy: 'usr-admin',
      approvedByName: 'Sultan Al-Dossary',
      approvedAt: subDays(1),
      createdAt: subDays(1),
      updatedAt: subDays(1)
    },
    {
      id: 'exp-drv-4',
      driverId: 'wrk-6',
      vehicleId: 'veh-6',
      tripId: 'trp-102',
      category: 'TOLL',
      amount: 35,
      currency: 'SAR',
      description: 'Highway toll & gate fee (Voice Report #VR-1004)',
      voiceReportId: 'VR-1004',
      expenseDate: subDays(2),
      status: 'APPROVED',
      approvedBy: 'usr-manager',
      approvedByName: 'Faisal Al-Mutairi',
      approvedAt: subDays(2),
      createdAt: subDays(2),
      updatedAt: subDays(2)
    },
    {
      id: 'exp-drv-5',
      driverId: 'wrk-6',
      vehicleId: 'veh-6',
      tripId: 'trp-102',
      category: 'FUEL',
      amount: 80,
      currency: 'SAR',
      description: 'Gasoline refill (Voice Report #VR-1004)',
      voiceReportId: 'VR-1004',
      expenseDate: subDays(2),
      status: 'APPROVED',
      approvedBy: 'usr-manager',
      approvedByName: 'Faisal Al-Mutairi',
      approvedAt: subDays(2),
      createdAt: subDays(2),
      updatedAt: subDays(2)
    }
  ];
}

export function getSeedChatWebhooks(): ChatWebhookConfig[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'wh-1',
      name: 'Fleet Logistics & Regulatory Ops Space',
      spaceName: 'Central Logistics Dispatch (Riyadh)',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/FLEET_LOGISTICS_HQ/messages?key=AIzaSy_MOCK_DEMO_FLEET_KSA&token=SECURE_TOKEN_DISPATCH_8899',
      isActive: true,
      events: {
        vehicleExpiry: true,
        maintenanceUrgent: true,
        driverCompliance: true,
        systemAlerts: true
      },
      urgencyThreshold: 'URGENT_15_DAYS',
      customHeader: '🇸🇦 [SAUDI FLEET OPS - DISPATCH]',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      triggerCount: 14
    },
    {
      id: 'wh-2',
      name: 'MVPI, Istimara & Insurance Urgent Alerts',
      spaceName: 'Compliance & Safety Enforcement',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/SAFETY_COMPLIANCE_OPS/messages?key=AIzaSy_MOCK_DEMO_SAFETY_KSA&token=SECURE_TOKEN_TGA_4433',
      isActive: true,
      events: {
        vehicleExpiry: true,
        maintenanceUrgent: false,
        driverCompliance: true,
        systemAlerts: false
      },
      urgencyThreshold: 'CRITICAL_7_DAYS',
      customHeader: '⚠️ [REGULATORY EXPIRY WARNING]',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 86400000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      triggerCount: 8
    },
    {
      id: 'wh-3',
      name: 'Workshop, Heavy Maintenance & Spares Depot',
      spaceName: 'Maintenance & Technical Depot',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/MAINTENANCE_DEPOT_KSA/messages?key=AIzaSy_MOCK_DEMO_MAINT_KSA&token=SECURE_TOKEN_DEPOT_1122',
      isActive: true,
      events: {
        vehicleExpiry: false,
        maintenanceUrgent: true,
        driverCompliance: false,
        systemAlerts: false
      },
      urgencyThreshold: 'ALL',
      customHeader: '🔧 [WORKSHOP & MAINTENANCE ALERT]',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 172800000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      triggerCount: 5
    }
  ];
}

export function getSeedWebhookDispatchLogs(): WebhookDispatchLog[] {
  const now = new Date();
  const subMinutes = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
  return [
    {
      id: 'wlog-1',
      webhookId: 'wh-1',
      webhookName: 'Fleet Logistics & Regulatory Ops Space',
      spaceName: 'Central Logistics Dispatch (Riyadh)',
      eventCategory: 'VEHICLE_EXPIRY',
      entityName: 'Mercedes-Benz Actros 3340 (7845 XYZ)',
      entityId: 'veh-1',
      severity: 'CRITICAL',
      summary: 'Comprehensive Insurance (Tawuniya) expires in 4 days. Policy #TWN-9982314.',
      status: 'SUCCESS',
      responseCode: 200,
      dispatchedAt: subMinutes(42),
      payloadPreview: '🚨 [CRITICAL EXPIRY ALERT]: Mercedes-Benz Actros 3340 (7845 XYZ) - Insurance with Tawuniya expires in 4 days.'
    },
    {
      id: 'wlog-2',
      webhookId: 'wh-2',
      webhookName: 'MVPI, Istimara & Insurance Urgent Alerts',
      spaceName: 'Compliance & Safety Enforcement',
      eventCategory: 'VEHICLE_EXPIRY',
      entityName: 'Toyota Hilux GLX (1234 ABC)',
      entityId: 'veh-4',
      severity: 'CRITICAL',
      summary: 'Periodic Inspection (MVPI / الفحص الدوري) expired 12 days ago.',
      status: 'SUCCESS',
      responseCode: 200,
      dispatchedAt: subMinutes(120),
      payloadPreview: '🚨 [CRITICAL EXPIRY ALERT]: Toyota Hilux GLX (1234 ABC) - Periodic Inspection (MVPI) EXPIRED 12 days ago.'
    },
    {
      id: 'wlog-3',
      webhookId: 'wh-3',
      webhookName: 'Workshop, Heavy Maintenance & Spares Depot',
      spaceName: 'Maintenance & Technical Depot',
      eventCategory: 'MAINTENANCE_EVENT',
      entityName: 'Volvo FH16 540 (9901 RYD)',
      entityId: 'veh-2',
      severity: 'WARNING',
      summary: 'Brake Service Scheduled at Petromin Autocare Dammam. Estimated SAR 1,850.',
      status: 'SUCCESS',
      responseCode: 200,
      dispatchedAt: subMinutes(240),
      payloadPreview: '🔧 [MAINTENANCE DISPATCH]: Volvo FH16 540 (9901 RYD) - Brake pads & rotor replacement in progress.'
    }
  ];
}

export function getSeedErpWebhooks(): ErpWebhookConfig[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'wh-erp-1',
      name: 'SAP S/4HANA HR & Muqeem Compliance Sync',
      erpType: 'SAP',
      webhookUrl: 'https://erp.saudifleet-enterprise.com/api/v1/sap/compliance/iqama-alerts',
      httpMethod: 'POST',
      headers: {
        'Authorization': 'Bearer sap_oauth2_ksa_enterprise_token_secure_99',
        'X-Enterprise-Client-ID': 'SAP-KSA-FLEET-HR'
      },
      secretToken: 'whsec_sap_s4hana_iqama_secret_2026',
      isActive: true,
      events: {
        stage30Days: true,
        stage7Days: true,
        stage1Day: true,
        expired: true,
        allIqamaExpiries: true
      },
      payloadFormat: 'SAP_COMPLIANCE',
      customNotes: 'Automated push to SAP S/4HANA HR module to initiate Jawazat fee voucher and Qiwa work permit validation.',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      lastResponseCode: 200,
      triggerCount: 28
    },
    {
      id: 'wh-erp-2',
      name: 'Oracle HCM Cloud - Saudi Workforce Expiries',
      erpType: 'ORACLE',
      webhookUrl: 'https://hcm.oraclecloud.com/hcmRestApi/resources/11.13.18.05/workerAlerts/iqama',
      httpMethod: 'POST',
      headers: {
        'Authorization': 'Basic b3JhY2xlX2hjbV9rb2RlOnNhbmRib3hfcGFzc3dvcmRfOTk=',
        'X-Oracle-Tenant-Id': 'ORACLE-KSA-GOV-987'
      },
      secretToken: 'whsec_oracle_hcm_token_ksa',
      isActive: true,
      events: {
        stage30Days: true,
        stage7Days: true,
        stage1Day: true,
        expired: false,
        allIqamaExpiries: false
      },
      payloadFormat: 'ORACLE_HCM',
      customNotes: 'Syncs with Oracle Human Capital Management for residency document tracking and payroll holds.',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 86400000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      lastResponseCode: 200,
      triggerCount: 12
    },
    {
      id: 'wh-erp-3',
      name: 'Odoo 18 Enterprise - Fleet & Driver HR Connector',
      erpType: 'ODOO',
      webhookUrl: 'https://odoo.saudifleet.local/web/hook/iqama_expiry',
      httpMethod: 'POST',
      headers: {
        'X-Odoo-Database': 'saudi_fleet_prod',
        'X-Odoo-API-Key': 'odoo_live_api_key_ksa_transport_7766'
      },
      secretToken: 'whsec_odoo_driver_iqama_secret',
      isActive: true,
      events: {
        stage30Days: true,
        stage7Days: true,
        stage1Day: true,
        expired: true,
        allIqamaExpiries: true
      },
      payloadFormat: 'ODOO_HR',
      customNotes: 'Pushes alert to Odoo Employee contracts and raises Muqeem electronic transaction task.',
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: new Date(Date.now() - 43200000).toISOString(),
      lastTriggerStatus: 'SUCCESS',
      lastResponseCode: 200,
      triggerCount: 19
    }
  ];
}

export function getSeedIqamaReminderLogs(): IqamaEmailReminderLog[] {
  const now = new Date();
  const subDays = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  return [
    {
      id: 'rem-log-1',
      workerId: 'wrk-1',
      workerName: 'Ahmed Mohammed Al-Omari',
      workerNameAr: 'أحمد محمد العمري',
      employeeId: 'EMP-1001',
      iqamaNumber: '1089234567',
      recipientEmail: 'ahmed.omari@saudifleet.com',
      stage: 30,
      stageName: 'STAGE_30_DAYS',
      daysRemaining: 29,
      iqamaExpiry: '2026-10-15',
      subject: '30-Day Expiry Notice: Iqama Renewal Required for Ahmed Mohammed Al-Omari (EMP-1001)',
      subjectAr: 'تنبيه: بقي 30 يوماً على موعد تجديد هوية / إقامة الموظف أحمد محمد العمري',
      emailBodyHtml: '<p>Stage 1 Reminder (30 Days): Please initiate Qiwa permit & Jawazat renewal fee verification.</p>',
      status: 'SENT',
      deliveredAt: subDays(1),
      triggeredBy: 'AUTOMATED_SCHEDULER'
    },
    {
      id: 'rem-log-2',
      workerId: 'wrk-2',
      workerName: 'Tariq Mahmoud Al-Masri',
      workerNameAr: 'طارق محمود المصري',
      employeeId: 'EMP-1002',
      iqamaNumber: '2198765432',
      recipientEmail: 'tariq.masri@saudifleet.com',
      stage: 7,
      stageName: 'STAGE_7_DAYS',
      daysRemaining: 6,
      iqamaExpiry: '2026-09-21',
      subject: 'CRITICAL ALERT (7 Days): Resident Iqama Expiration for Tariq Mahmoud Al-Masri (EMP-1002)',
      subjectAr: 'تنبيه عاجل (7 أيام): موعد انتهاء إقامة مقيم للموظف طارق محمود المصري',
      emailBodyHtml: '<p>Stage 2 Reminder (7 Days): Immediate processing via Muqeem required to avoid 500 SAR late penalty.</p>',
      status: 'SENT',
      deliveredAt: subDays(1),
      triggeredBy: 'AUTOMATED_SCHEDULER'
    },
    {
      id: 'rem-log-3',
      workerId: 'wrk-5',
      workerName: 'Farhan Zaheer Khan',
      workerNameAr: 'فرحان ظهير خان',
      employeeId: 'EMP-1005',
      iqamaNumber: '2345678901',
      recipientEmail: 'farhan.khan@saudifleet.com',
      stage: 1,
      stageName: 'STAGE_1_DAY',
      daysRemaining: 1,
      iqamaExpiry: '2026-09-16',
      subject: 'EMERGENCY ACTION (1 Day): Iqama Expires Tomorrow for Farhan Zaheer Khan (EMP-1005)',
      subjectAr: 'إشعار طارئ (يوم واحد): تنتهي إقامة الموظف فرحان ظهير خان غداً',
      emailBodyHtml: '<p>Stage 3 Reminder (1 Day): Emergency renewal required immediately today.</p>',
      status: 'SENT',
      deliveredAt: subDays(0),
      triggeredBy: 'AUTOMATED_SCHEDULER'
    }
  ];
}

export function getSeedErpWebhookDispatchLogs(): ErpWebhookDispatchLog[] {
  const now = new Date();
  const subMinutes = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
  return [
    {
      id: 'erp-log-1',
      webhookId: 'wh-erp-1',
      webhookName: 'SAP S/4HANA HR & Muqeem Compliance Sync',
      erpType: 'SAP',
      webhookUrl: 'https://erp.saudifleet-enterprise.com/api/v1/sap/compliance/iqama-alerts',
      eventType: 'IQAMA_STAGE_7',
      workerId: 'wrk-2',
      workerName: 'Tariq Mahmoud Al-Masri (EMP-1002)',
      iqamaNumber: '2198765432',
      daysRemaining: 6,
      status: 'SUCCESS',
      responseCode: 200,
      responseBody: '{"sapStatus":"ACCEPTED","workflowInstanceId":"WF-SAP-98124","hrAction":"EXPIRY_BLOCK_NOTICE"}',
      durationMs: 142,
      dispatchedAt: subMinutes(120),
      payloadPreview: '{"event":"IQAMA_EXPIRY_ALERT","stage":"STAGE_7_DAYS","workerId":"wrk-2","iqamaNumber":"2198765432","daysRemaining":6}'
    },
    {
      id: 'erp-log-2',
      webhookId: 'wh-erp-3',
      webhookName: 'Odoo 18 Enterprise - Fleet & Driver HR Connector',
      erpType: 'ODOO',
      webhookUrl: 'https://odoo.saudifleet.local/web/hook/iqama_expiry',
      eventType: 'IQAMA_STAGE_30',
      workerId: 'wrk-1',
      workerName: 'Ahmed Mohammed Al-Omari (EMP-1001)',
      iqamaNumber: '1089234567',
      daysRemaining: 29,
      status: 'SUCCESS',
      responseCode: 200,
      responseBody: '{"odoo_task_created":true,"task_id":4092,"model":"hr.employee"}',
      durationMs: 98,
      dispatchedAt: subMinutes(360),
      payloadPreview: '{"event":"IQAMA_EXPIRY_ALERT","stage":"STAGE_30_DAYS","workerId":"wrk-1","iqamaNumber":"1089234567","daysRemaining":29}'
    }
  ];
}

export function getSeedReportSchedules(): ReportSchedule[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'sched-weekly-exec',
      name: 'Weekly Executive Fleet & Compliance Digest',
      frequency: 'WEEKLY',
      dayOfWeek: 0, // Sunday (Saudi business week kickoff)
      timeOfDay: '08:00',
      recipientEmails: ['cfo@saudifleet.com.sa', 'fleet.director@saudifleet.com.sa', 'abdulwahabmangal777@gmail.com'],
      reportTypes: ['ALL'],
      departmentId: 'ALL',
      includeSummaryKpis: true,
      includeDetailedTables: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastRunAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      lastRunStatus: 'SUCCESS',
      lastRunSummary: 'Dispatched to 3 recipients. Total spend: 142,580 SAR. Workforce compliance rate: 96.8%.',
      totalRunsCount: 14
    },
    {
      id: 'sched-monthly-audit',
      name: 'Monthly Operational Expenses & Iqama Regulatory Audit',
      frequency: 'MONTHLY',
      dayOfMonth: 1, // 1st of each calendar month
      timeOfDay: '07:30',
      recipientEmails: ['finance.audit@saudifleet.com.sa', 'hr.muqeem@saudifleet.com.sa'],
      reportTypes: ['FLEET_EXPENSES', 'WORKFORCE_COMPLIANCE'],
      departmentId: 'ALL',
      includeSummaryKpis: true,
      includeDetailedTables: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastRunAt: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString(),
      lastRunStatus: 'SUCCESS',
      lastRunSummary: 'Dispatched monthly audit. Total expenses logged: 428,940 SAR across 6 branches.',
      totalRunsCount: 5
    }
  ];
}

export function getSeedReportExecutionLogs(): ReportExecutionLog[] {
  const now = new Date();
  const subDays = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  return [
    {
      id: 'replog-1',
      scheduleId: 'sched-weekly-exec',
      scheduleName: 'Weekly Executive Fleet & Compliance Digest',
      frequency: 'WEEKLY',
      dispatchedAt: subDays(3),
      recipients: ['cfo@saudifleet.com.sa', 'fleet.director@saudifleet.com.sa', 'abdulwahabmangal777@gmail.com'],
      reportTypes: ['FLEET_EXPENSES', 'WORKFORCE_COMPLIANCE', 'EXECUTIVE_SUMMARY'],
      totalExpensesSar: 142580,
      fuelExpensesSar: 78420,
      maintenanceExpensesSar: 49160,
      otherExpensesSar: 15000,
      totalWorkers: 42,
      activeIqamas: 39,
      expiringIqamas30d: 2,
      expiredIqamas: 1,
      overallComplianceRate: 96.8,
      status: 'SUCCESS',
      deliveryMode: 'SIMULATED_AND_LOGGED',
      emailSubject: '📊 [Weekly Digest] Saudi Fleet Operating Expenses & Iqama Compliance Audit - Khyber Logistics services'
    },
    {
      id: 'replog-2',
      scheduleId: 'sched-monthly-audit',
      scheduleName: 'Monthly Operational Expenses & Iqama Regulatory Audit',
      frequency: 'MONTHLY',
      dispatchedAt: subDays(16),
      recipients: ['finance.audit@saudifleet.com.sa', 'hr.muqeem@saudifleet.com.sa'],
      reportTypes: ['FLEET_EXPENSES', 'WORKFORCE_COMPLIANCE'],
      totalExpensesSar: 428940,
      fuelExpensesSar: 245300,
      maintenanceExpensesSar: 152640,
      otherExpensesSar: 31000,
      totalWorkers: 42,
      activeIqamas: 40,
      expiringIqamas30d: 2,
      expiredIqamas: 0,
      overallComplianceRate: 97.6,
      status: 'SUCCESS',
      deliveryMode: 'SIMULATED_AND_LOGGED',
      emailSubject: '📑 [Monthly Summary] Comprehensive Fleet Expense Ledger & Workforce Compliance - Khyber Logistics services'
    }
  ];
}

export function getSeedVehicleAssignments(): VehicleAssignment[] {
  const now = new Date();
  const subDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().split('T')[0];
  };

  return [
    // veh-1: Mercedes-Benz Actros (Heavy Truck)
    {
      id: 'asgn-101',
      vehicleId: 'veh-1',
      workerId: 'wrk-4',
      workerName: 'Hassan Ali Al-Ghamdi',
      workerNameAr: 'حسن علي الغامدي',
      workerEmployeeId: 'EMP-1004',
      workerJobTitle: 'Heavy Rig Transport Driver',
      workerNationality: 'Saudi',
      workerNationalityAr: 'سعودي',
      workerMobile: '+966 50 192 8374',
      assignedFrom: subDays(520),
      assignedTo: subDays(200),
      isCurrent: false,
      assignmentType: 'PRIMARY',
      startMileage: 110000,
      endMileage: 145000,
      assignedBy: 'Sultan Al-Dossary (Fleet Operations Manager)',
      handoverChecklistCompleted: true,
      notes: 'Riyadh to Western Province long-haul heavy line. Vehicle returned in clean mechanical order with comprehensive tire report.',
      createdAt: subDays(520),
      updatedAt: subDays(200)
    },
    {
      id: 'asgn-102',
      vehicleId: 'veh-1',
      workerId: 'wrk-8',
      workerName: 'Noor Mohammad',
      workerNameAr: 'نور محمد',
      workerEmployeeId: 'EMP-1008',
      workerJobTitle: 'Heavy Transport Specialist',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 55 491 8293',
      assignedFrom: subDays(200),
      assignedTo: subDays(185),
      isCurrent: false,
      assignmentType: 'RELIEF',
      startMileage: 145000,
      endMileage: 146200,
      assignedBy: 'Operations Dispatch Desk',
      handoverChecklistCompleted: true,
      notes: 'Temporary relief assignment during annual driver leave coverage and scheduled logistics rotation.',
      createdAt: subDays(200),
      updatedAt: subDays(185)
    },
    {
      id: 'asgn-103',
      vehicleId: 'veh-1',
      workerId: 'wrk-1',
      workerName: 'Ahmed Mohammed Al-Omari',
      workerNameAr: 'أحمد محمد العمري',
      workerEmployeeId: 'EMP-1001',
      workerJobTitle: 'Senior Heavy Fleet Captain',
      workerNationality: 'Saudi',
      workerNationalityAr: 'سعودي',
      workerMobile: '+966 50 481 9201',
      assignedFrom: subDays(185),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 146200,
      endMileage: null,
      assignedBy: 'Sultan Al-Dossary (Fleet Operations Manager)',
      handoverChecklistCompleted: true,
      notes: 'Chief Heavy Transport Captain assigned to primary Riyadh-Dammam corridor. Fully certified hazardous cargo handling.',
      createdAt: subDays(185),
      updatedAt: subDays(185)
    },

    // veh-2: Isuzu Forward Reefer (Refrigerated Truck)
    {
      id: 'asgn-201',
      vehicleId: 'veh-2',
      workerId: 'wrk-9',
      workerName: 'Suresh Chandra Sharma',
      workerNameAr: 'سوريش شاندرا شارما',
      workerEmployeeId: 'EMP-1009',
      workerJobTitle: 'Cold Chain Delivery Specialist',
      workerNationality: 'Indian',
      workerNationalityAr: 'هندي',
      workerMobile: '+966 54 819 2049',
      assignedFrom: subDays(420),
      assignedTo: subDays(160),
      isCurrent: false,
      assignmentType: 'PRIMARY',
      startMileage: 52000,
      endMileage: 78400,
      assignedBy: 'Jeddah Regional Logistics Office',
      handoverChecklistCompleted: true,
      notes: 'Cold-chain dairy and pharmaceutical distribution across Makkah & Jeddah sectors. Thermo King cooling unit inspection verified at handover.',
      createdAt: subDays(420),
      updatedAt: subDays(160)
    },
    {
      id: 'asgn-202',
      vehicleId: 'veh-2',
      workerId: 'wrk-2',
      workerName: 'Tariq Mehmood Khan',
      workerNameAr: 'طارق محمود خان',
      workerEmployeeId: 'EMP-1002',
      workerJobTitle: 'Long Haul Trailer Driver',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 55 819 2304',
      assignedFrom: subDays(160),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 78400,
      endMileage: null,
      assignedBy: 'Jeddah Regional Logistics Office',
      handoverChecklistCompleted: true,
      notes: 'Assigned as primary reefer transport captain for Western Province inter-depot transit lines.',
      createdAt: subDays(160),
      updatedAt: subDays(160)
    },

    // veh-3: Toyota Hilux D/Cab
    {
      id: 'asgn-301',
      vehicleId: 'veh-3',
      workerId: 'wrk-10',
      workerName: 'Muhammad Bilal',
      workerNameAr: 'محمد بلال',
      workerEmployeeId: 'EMP-1010',
      workerJobTitle: 'Light Transport Driver',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 53 910 2847',
      assignedFrom: subDays(340),
      assignedTo: subDays(110),
      isCurrent: false,
      assignmentType: 'PRIMARY',
      startMileage: 35000,
      endMileage: 66000,
      assignedBy: 'Dammam Branch Supervisor',
      handoverChecklistCompleted: true,
      notes: 'Eastern Province field maintenance and port utility duties. Completed with full tool inventory reconciliation.',
      createdAt: subDays(340),
      updatedAt: subDays(110)
    },
    {
      id: 'asgn-302',
      vehicleId: 'veh-3',
      workerId: 'wrk-7',
      workerName: 'Rajesh Kumar Patel',
      workerNameAr: 'راجيش كومار باتيل',
      workerEmployeeId: 'EMP-1007',
      workerJobTitle: 'Heavy Equipment Operator',
      workerNationality: 'Indian',
      workerNationalityAr: 'هندي',
      workerMobile: '+966 56 719 3820',
      assignedFrom: subDays(110),
      assignedTo: subDays(95),
      isCurrent: false,
      assignmentType: 'TEMPORARY',
      startMileage: 66000,
      endMileage: 68100,
      assignedBy: 'Dammam Operations Control',
      handoverChecklistCompleted: true,
      notes: 'Temporary field utility transport during Ras Tanura site mobilization surge.',
      createdAt: subDays(110),
      updatedAt: subDays(95)
    },
    {
      id: 'asgn-303',
      vehicleId: 'veh-3',
      workerId: 'wrk-3',
      workerName: 'Fahad Nasser Al-Otaibi',
      workerNameAr: 'فهد ناصر العتيبي',
      workerEmployeeId: 'EMP-1003',
      workerJobTitle: 'Field Fleet Supervisor & Technician',
      workerNationality: 'Saudi',
      workerNationalityAr: 'سعودي',
      workerMobile: '+966 54 392 0192',
      assignedFrom: subDays(95),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 68100,
      endMileage: null,
      assignedBy: 'Dammam Operations Control',
      handoverChecklistCompleted: true,
      notes: 'Assigned as primary field supervisor vehicle with calibrated diagnostic tools and safety beacon installed.',
      createdAt: subDays(95),
      updatedAt: subDays(95)
    },

    // veh-4: Ford Transit Cargo Van
    {
      id: 'asgn-401',
      vehicleId: 'veh-4',
      workerId: 'wrk-6',
      workerName: 'Bilal Arshad Butt',
      workerNameAr: 'بلال أرشد بوت',
      workerEmployeeId: 'EMP-1006',
      workerJobTitle: 'Express Courier & Parcel Driver',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 56 102 9384',
      assignedFrom: subDays(280),
      assignedTo: subDays(75),
      isCurrent: false,
      assignmentType: 'PRIMARY',
      startMileage: 12000,
      endMileage: 34200,
      assignedBy: 'Riyadh Sulay Hub Dispatch',
      handoverChecklistCompleted: true,
      notes: 'Urban parcel distribution in central Riyadh zone. Handover clean with all delivery POD devices accounted for.',
      createdAt: subDays(280),
      updatedAt: subDays(75)
    },
    {
      id: 'asgn-402',
      vehicleId: 'veh-4',
      workerId: 'wrk-4',
      workerName: 'Hassan Ali Al-Ghamdi',
      workerNameAr: 'حسن علي الغامدي',
      workerEmployeeId: 'EMP-1004',
      workerJobTitle: 'Heavy Rig Transport Driver',
      workerNationality: 'Saudi',
      workerNationalityAr: 'سعودي',
      workerMobile: '+966 50 192 8374',
      assignedFrom: subDays(75),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 34200,
      endMileage: null,
      assignedBy: 'Riyadh Sulay Hub Dispatch',
      handoverChecklistCompleted: true,
      notes: 'Commercial distribution account manager van. Authorized for inter-branch parcel transfers.',
      createdAt: subDays(75),
      updatedAt: subDays(75)
    },

    // veh-5: Toyota Land Cruiser Prado (VIP)
    {
      id: 'asgn-501',
      vehicleId: 'veh-5',
      workerId: 'wrk-5',
      workerName: 'Omar Farooq',
      workerNameAr: 'عمر فاروق',
      workerEmployeeId: 'EMP-1005',
      workerJobTitle: 'Executive Transport Chauffeur',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 53 718 2930',
      assignedFrom: subDays(100),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 120,
      endMileage: null,
      assignedBy: 'Eng. Abdulrahman Al-Bawardi (General Manager)',
      handoverChecklistCompleted: true,
      notes: 'Dedicated executive chauffeur assignment for board members, ministerial liaisons, and VIP corporate delegations.',
      createdAt: subDays(100),
      updatedAt: subDays(100)
    },

    // veh-6: Hyundai Staria Cargo
    {
      id: 'asgn-601',
      vehicleId: 'veh-6',
      workerId: 'wrk-2',
      workerName: 'Tariq Mehmood Khan',
      workerNameAr: 'طارق محمود خان',
      workerEmployeeId: 'EMP-1002',
      workerJobTitle: 'Long Haul Trailer Driver',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 55 819 2304',
      assignedFrom: subDays(370),
      assignedTo: subDays(140),
      isCurrent: false,
      assignmentType: 'PRIMARY',
      startMileage: 5000,
      endMileage: 42000,
      assignedBy: 'Parcel Hub Supervisor',
      handoverChecklistCompleted: true,
      notes: 'Pre-delivery route coverage. Transferred back to heavy refrigerated division.',
      createdAt: subDays(370),
      updatedAt: subDays(140)
    },
    {
      id: 'asgn-602',
      vehicleId: 'veh-6',
      workerId: 'wrk-6',
      workerName: 'Bilal Arshad Butt',
      workerNameAr: 'بلال أرشد بوت',
      workerEmployeeId: 'EMP-1006',
      workerJobTitle: 'Express Courier & Parcel Driver',
      workerNationality: 'Pakistani',
      workerNationalityAr: 'باكستاني',
      workerMobile: '+966 56 102 9384',
      assignedFrom: subDays(140),
      assignedTo: null,
      isCurrent: true,
      assignmentType: 'PRIMARY',
      startMileage: 42000,
      endMileage: null,
      assignedBy: 'Parcel Hub Supervisor',
      handoverChecklistCompleted: true,
      notes: 'Primary courier driver for North Riyadh high-density business districts.',
      createdAt: subDays(140),
      updatedAt: subDays(140)
    }
  ];
}

export function resetToDemoData() {
  db = generateSeedData();
  saveDatabase();
  return db;
}

export function wipeDemoDataKeepAdmin() {
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();
  
  db = {
    users: [
      {
        id: 'usr-admin',
        username: 'admin',
        email: 'abdulwahabmangal777@gmail.com',
        passwordHash: bcrypt.hashSync('admin123', salt),
        fullName: 'Abdul Wahab Mangal (Administrator)',
        role: 'ADMIN',
        department: 'Executive Management',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    ],
    departments: [
      { id: 'dept-1', name: 'Logistics & Fleet Operations', nameAr: 'العمليات والأسطول', code: 'OPS', headName: 'Abdul Wahab Mangal' },
      { id: 'dept-2', name: 'Human Resources', nameAr: 'الموارد البشرية', code: 'HR', headName: 'HR Manager' },
      { id: 'dept-3', name: 'Finance & Accounting', nameAr: 'المالية والمحاسبة', code: 'FIN', headName: 'Finance Manager' }
    ],
    vehicles: [],
    workers: [],
    documents: [],
    maintenance: [],
    fuelRecords: [],
    expenses: [],
    locations: [],
    trips: [],
    driverExpenses: [],
    voiceReports: [],
    notifications: [],
    chatWebhooks: [],
    webhookDispatchLogs: [],
    erpWebhooks: [],
    iqamaReminderLogs: [],
    erpWebhookDispatchLogs: [],
    vehicleAssignments: [],
    geofences: [],
    gpsLogs: [],
    geofenceAlerts: [],
    reportSchedules: [],
    reportExecutionLogs: [],
    auditLogs: [
      {
        id: 'aud-wipe',
        userId: 'usr-admin',
        userName: 'Abdul Wahab Mangal',
        userRole: 'ADMIN',
        action: 'DELETE',
        entityType: 'SYSTEM',
        description: 'All demo vehicles, workers, trips, expenses, voice reports, and telemetry removed.',
        ipAddress: '127.0.0.1',
        timestamp: now
      }
    ],
    companyProfile: {
      id: 'comp-1',
      name: 'Khyber Logistics services',
      nameAr: 'خدمات خيبر اللوجستية',
      namePs: 'د خيبر لوژستیکي خدمتونه',
      logo: '/khyber_luxury_logo.jpg',
      crNumber: '1010000000',
      vatNumber: '310000000000003',
      address: 'Riyadh, Kingdom of Saudi Arabia',
      addressAr: 'الرياض، المملكة العربية السعودية',
      phone: '+966 11 000 0000',
      email: 'abdulwahabmangal777@gmail.com',
      managerName: 'Abdul Wahab Mangal',
      managerNameAr: 'عبد الوهاب منګل',
      currency: 'SAR',
      timezone: 'Asia/Riyadh',
      hijriEnabled: true,
      createdAt: now,
      updatedAt: now
    },
    systemSettings: {
      alertDaysThresholds: [60, 30, 15, 7, 1],
      autoBackupEnabled: true,
      autoBackupFrequency: 'DAILY',
      smsAlertsEnabled: true,
      emailAlertsEnabled: true,
      whatsappAlertsEnabled: false,
      defaultLanguage: 'en'
    }
  };
  saveDatabase();
  return db;
}
