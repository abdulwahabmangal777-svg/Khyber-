export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'HR' | 'VIEWER' | 'DRIVER';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  workerId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
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
  vehicleCount?: number;
  workerCount?: number;
}

export interface Vehicle {
  id: string;
  internalVehicleId: string;
  plateNumber: string;
  plateDigits: string;
  plateLettersEn: string;
  plateDigitsAr: string;
  plateLettersAr: string;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  engineNumber: string;
  ownershipType: 'OWNED' | 'LEASED' | 'RENTED';
  departmentId: string;
  departmentName?: string;
  assignedWorkerId: string | null;
  currentLocation: string;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  heading?: number;
  fuelLevelPercent?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SOLD';
  istimaraNumber: string;
  istimaraExpiry: string;
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  inspectionDate: string;
  inspectionExpiry: string;
  purchaseDate: string;
  purchasePrice: number;
  currentMileage: number;
  fuelType: 'GASOLINE_91' | 'GASOLINE_95' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  notes: string;
  photoUrl?: string;
  driver?: {
    id: string;
    employeeId: string;
    fullName: string;
    fullNameAr?: string;
    mobileNumber: string;
    iqamaNumber: string;
    iqamaExpiry: string;
    driverLicenseExpiry?: string;
    driverLicenseNumber?: string;
    nationality?: string;
    photoUrl?: string;
  } | null;
  documents?: AppDocument[];
  maintenance?: MaintenanceRecord[];
  fuel?: FuelRecord[];
  trips?: TripRecord[];
  expenses?: ExpenseRecord[];
  alerts?: ExpiryAlertItem[];
  assignments?: VehicleAssignment[];
  lastMaintenanceDate?: string;
  lastMaintenanceType?: string;
  lastMaintenanceMileage?: number;
  lastMaintenanceCost?: number;
  maintenanceCount?: number;
  istimaraDaysRemaining?: number;
  insuranceDaysRemaining?: number;
  inspectionDaysRemaining?: number;
  nearestExpiryDate?: string;
  nearestExpiryDaysRemaining?: number;
  nearestExpiryDocType?: string;
  hasExpiredDocs?: boolean;
  hasUrgentDocs?: boolean;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface Worker {
  id: string;
  employeeId: string;
  fullName: string;
  fullNameAr: string;
  nationality: string;
  nationalityAr: string;
  jobTitle: string;
  departmentId: string;
  departmentName?: string;
  mobileNumber: string;
  email: string;
  iqamaNumber: string;
  iqamaExpiry: string;
  passportNumber: string;
  passportExpiry: string;
  workPermitNumber: string;
  workPermitExpiry: string;
  medicalInsuranceNumber: string;
  medicalInsuranceExpiry: string;
  contractStartDate: string;
  contractEndDate: string;
  joiningDate: string;
  salary: number;
  assignedVehicleId: string | null;
  assignedVehicle?: {
    id: string;
    internalVehicleId: string;
    plateNumber: string;
    plateDigitsAr?: string;
    plateLettersAr?: string;
    make: string;
    model: string;
    year?: number;
    status: string;
    istimaraExpiry?: string;
    insuranceExpiry?: string;
    insuranceCompany?: string;
    inspectionExpiry?: string;
  } | null;
  driverLicenseNumber: string;
  driverLicenseExpiry: string;
  status: 'ACTIVE' | 'VACATION' | 'INACTIVE' | 'TERMINATED';
  address: string;
  emergencyContact: string;
  notes: string;
  photoUrl?: string;
  documents?: AppDocument[];
  alerts?: ExpiryAlertItem[];
  fuelRecords?: FuelRecord[];
  iqamaDaysRemaining?: number;
  passportDaysRemaining?: number;
  licenseDaysRemaining?: number;
  medicalDaysRemaining?: number;
  hasExpiredDocs?: boolean;
  hasUrgentDocs?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppDocument {
  id: string;
  entityType: 'VEHICLE' | 'WORKER';
  entityId: string;
  entityName?: string;
  docType: 'ISTIMARA' | 'INSURANCE' | 'INSPECTION' | 'IQAMA' | 'PASSPORT' | 'WORK_PERMIT' | 'MEDICAL_INSURANCE' | 'DRIVER_LICENSE' | 'CONTRACT' | 'INVOICE' | 'RECEIPT' | 'OTHER';
  docNumber: string;
  fileName: string;
  fileData: string;
  fileSize: string;
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
  vehiclePlate?: string;
  vehicleMakeModel?: string;
  internalVehicleId?: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'BRAKE_SERVICE' | 'ENGINE_OVERHAUL' | 'PERIODIC_SERVICE';
  date: string;
  mileage: number;
  workshop: string;
  description: string;
  parts: string;
  laborCost: number;
  partsCost?: number;
  totalCost: number;
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
  vehiclePlate?: string;
  vehicleMakeModel?: string;
  driverWorkerId: string | null;
  driverName?: string;
  date: string;
  fuelType: 'GASOLINE_91' | 'GASOLINE_95' | 'DIESEL';
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  mileage: number;
  fuelStation: string;
  receiptDocId?: string;
  notes?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleMakeModel?: string;
  expenseType: 'FUEL' | 'MAINTENANCE' | 'INSURANCE' | 'REGISTRATION' | 'INSPECTION' | 'TIRES' | 'SPARE_PARTS' | 'FINES' | 'TOLLS_SALIK' | 'OTHER';
  date: string;
  amount: number;
  vendor: string;
  invoiceNumber: string;
  description: string;
  receiptDocId?: string;
  notes?: string;
  createdAt: string;
}

export interface ExpiryAlertItem {
  id: string;
  documentType: 'ISTIMARA' | 'INSURANCE' | 'INSPECTION' | 'IQAMA' | 'PASSPORT' | 'WORK_PERMIT' | 'MEDICAL_INSURANCE' | 'DRIVER_LICENSE' | 'CONTRACT';
  documentTypeName: string;
  documentTypeNameAr: string;
  documentTypeNamePs: string;
  documentNumber: string;
  entityType: 'VEHICLE' | 'WORKER';
  entityId: string;
  entityName: string;
  entitySubtext: string;
  department: string;
  departmentId: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'EXPIRING_URGENT' | 'EXPIRING_WARNING' | 'EXPIRING_SOON' | 'VALID';
  responsiblePerson?: string;
  contactNumber?: string;
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
  details?: string;
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
  crNumber: string;
  vatNumber: string;
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

export interface DashboardStats {
  kpis: {
    totalVehicles: number;
    activeVehicles: number;
    maintenanceVehicles: number;
    totalWorkers: number;
    activeWorkers: number;
    vacationWorkers: number;
    maintenanceDueCount: number;
    currentMonthExpenses: number;
    currentMonthFuelExpenses: number;
    currentMonthMaintenanceExpenses: number;
    currentMonthOtherExpenses: number;
  };
  expiry: {
    totalDocumentsTracked: number;
    expiredCount: number;
    expiring7DaysCount: number;
    expiring15DaysCount: number;
    expiring30DaysCount: number;
    expiring60DaysCount: number;
    validCount: number;
    insuranceExpiringSoonCount: number;
    registrationExpiringSoonCount: number;
    iqamaExpiringSoonCount: number;
    passportExpiringSoonCount: number;
    inspectionExpiringSoonCount: number;
    driverLicenseExpiringSoonCount: number;
    urgentAlerts: ExpiryAlertItem[];
  };
  monthlyTrends: {
    month: string;
    monthLabel: string;
    fuel: number;
    maintenance: number;
    other: number;
    total: number;
  }[];
  company: CompanyProfile;
}

export type DocumentItem = AppDocument;
export type Expense = ExpenseRecord & { vehicleName?: string; plateNumber?: string };
export type FuelLog = FuelRecord & { vehicleName?: string; plateNumber?: string };
export type MaintenanceLog = MaintenanceRecord & { vehicleName?: string; plateNumber?: string };
export interface CompanySettings {
  companyName: string;
  companyNameAr: string;
  crNumber: string;
  vatNumber: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  generalManager: string;
  fleetManager: string;
  currency: string;
  dateFormat: string;
  enableHijri?: boolean;
  alertThresholdDays?: number;
  reportTheme?: 'SAUDI_GREEN' | 'ENTERPRISE_BLUE';
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
  driverName?: string;
  driverEmployeeId?: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleInternalId?: string;
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

export interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number; // 0 for Sunday, 1 for Monday, etc.
  dayOfMonth?: number; // 1 to 31
  timeOfDay: string; // "08:00"
  recipientEmails: string[];
  reportTypes: Array<'FLEET_EXPENSES' | 'WORKFORCE_COMPLIANCE' | 'EXECUTIVE_SUMMARY' | 'ALL'>;
  departmentId?: string;
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
  overallComplianceRate: number;
  status: 'SUCCESS' | 'FAILED';
  deliveryMode: 'SIMULATED_AND_LOGGED' | 'SMTP_DISPATCHED';
  emailSubject: string;
  emailPreviewHtml?: string;
  error?: string;
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
  heading: number;
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
  // Notification configurations
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
  activeVehiclesInsideCount?: number;
  recentAlertsCount?: number;
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
  // Notification dispatch status
  emailDispatched?: boolean;
  emailSentTo?: string[];
  emailSubject?: string;
  emailPreviewHtml?: string;
  pushDelivered?: boolean;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

// Subscription & Monetization Types
export type PlanTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED';
export type PaymentMethodType = 'MADA' | 'VISA_MASTER' | 'APPLE_PAY' | 'STC_PAY' | 'SADAD' | 'BANK_TRANSFER';

export interface PlanFeature {
  textEn: string;
  textAr: string;
  textPs: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: PlanTier;
  nameEn: string;
  nameAr: string;
  namePs: string;
  monthlyPriceSar: number;
  yearlyPriceSar: number;
  vehicleLimit: number; // -1 for unlimited
  workerLimit: number; // -1 for unlimited
  isPopular?: boolean;
  descriptionEn: string;
  descriptionAr: string;
  descriptionPs: string;
  features: PlanFeature[];
}

export interface SubscriptionAddon {
  id: string;
  nameEn: string;
  nameAr: string;
  namePs: string;
  pricePerMonthSar: number;
  pricePerYearSar: number;
  billingType: 'PER_VEHICLE' | 'FLAT';
  descriptionEn: string;
  descriptionAr: string;
  descriptionPs: string;
  badge?: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  zatcaUuid: string;
  issueDate: string;
  dueDate: string;
  planId: PlanTier;
  planName: string;
  billingCycle: BillingCycle;
  subtotalSar: number;
  vatRatePercent: number; // 15
  vatAmountSar: number;
  totalSar: number;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  paidAt?: string;
  customerName: string;
  customerCr: string;
  customerVat: string;
  items: Array<{
    description: string;
    descriptionAr?: string;
    qty: number;
    unitPriceSar: number;
    totalSar: number;
  }>;
  zatcaQrCodeData: string;
}

export interface SubscriptionState {
  planId: PlanTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startDate: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  activeAddons: string[];
  paymentMethod: {
    type: PaymentMethodType;
    lastFour?: string;
    cardBrand?: string;
    expiry?: string;
    accountHolder?: string;
  };
  sadadBillerCode?: string;
  sadadBillNumber?: string;
  vehicleUsage: {
    current: number;
    limit: number;
  };
  workerUsage: {
    current: number;
    limit: number;
  };
}

export type AdsterraBannerFormat = '728x90' | '300x250' | '468x60' | '160x600' | 'responsive';

export interface AdsterraPlacements {
  dashboardTop: boolean;
  dashboardSidebar: boolean;
  reportsTop: boolean;
  fleetMapBanner: boolean;
  socialBar: boolean;
}

export interface AdsterraSmartlink {
  zoneName: string;
  placementName: string;
  placementId: string;
  url: string;
  active: boolean;
  clicks: number;
  assignedPlacement?: 'dashboardTop' | 'dashboardSidebar' | 'reportsTop' | 'socialBar' | 'all';
}

export interface AdsterraConfig {
  enabled: boolean;
  publisherId: string;
  zoneName?: string;
  admobAppId?: string;
  admobPublisherId?: string;
  admobAdUnitId?: string;
  banner728x90ZoneKey: string;
  banner300x250ZoneKey: string;
  banner468x60ZoneKey: string;
  socialBarScriptUrl: string;
  popunderScriptUrl: string;
  directLinkUrl: string;
  smartlinks?: AdsterraSmartlink[];
  smartlinkRotation?: 'placement-mapped' | 'round-robin' | 'random';
  hideForPaidTiers: boolean;
  testMode: boolean;
  placements: AdsterraPlacements;
  stats: {
    impressions: number;
    clicks: number;
    estimatedRevenueSar: number;
    lastUpdated: string;
  };
}


