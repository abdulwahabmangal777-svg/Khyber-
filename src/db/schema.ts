import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';

// 1. Users Table (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('ADMIN'), // ADMIN, MANAGER, ACCOUNTANT, HR, VIEWER, DRIVER
  department: text('department').default('Logistics & Fleet Operations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Vehicles Table
export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  internalVehicleId: text('internal_vehicle_id').notNull().unique(), // e.g. "FLT-101"
  plateNumber: text('plate_number').notNull(),
  plateDigits: text('plate_digits'),
  plateLettersEn: text('plate_letters_en'),
  plateDigitsAr: text('plate_digits_ar'),
  plateLettersAr: text('plate_letters_ar'),
  vehicleType: text('vehicle_type').notNull().default('Sedan'),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  color: text('color'),
  vin: text('vin'),
  ownershipType: text('ownership_type').default('OWNED'),
  currentLocation: text('current_location').default('Riyadh Head Office'),
  status: text('status').default('ACTIVE'), // ACTIVE, MAINTENANCE, INACTIVE, SOLD
  istimaraExpiry: text('istimara_expiry'),
  insuranceExpiry: text('insurance_expiry'),
  inspectionExpiry: text('inspection_expiry'),
  currentMileage: integer('current_mileage').default(0),
  fuelType: text('fuel_type').default('GASOLINE_91'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Drivers / Workers Table
export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(), // e.g. "EMP-0412"
  fullName: text('full_name').notNull(),
  fullNameAr: text('full_name_ar'),
  nationality: text('nationality').default('Saudi'),
  jobTitle: text('job_title').default('Heavy Vehicle Driver'),
  mobileNumber: text('mobile_number'),
  email: text('email'),
  iqamaNumber: text('iqama_number'),
  iqamaExpiry: text('iqama_expiry'),
  driverLicenseNumber: text('driver_license_number'),
  driverLicenseExpiry: text('driver_license_expiry'),
  assignedVehiclePlate: text('assigned_vehicle_plate'),
  status: text('status').default('ACTIVE'), // ACTIVE, VACATION, INACTIVE
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. Voice Reports & Telematics Dispatches Table
export const voiceReports = pgTable('voice_reports', {
  id: serial('id').primaryKey(),
  reportId: text('report_id').notNull().unique(),
  driverName: text('driver_name').notNull(),
  driverLanguage: text('driver_language').default('ar'),
  transcription: text('transcription').notNull(),
  translationEn: text('translation_en'),
  sourceLocation: text('source_location'),
  destinationLocation: text('destination_location'),
  fuelExpenseSar: numeric('fuel_expense_sar', { precision: 10, scale: 2 }),
  otherExpenseSar: numeric('other_expense_sar', { precision: 10, scale: 2 }),
  tripDate: text('trip_date'),
  aiConfidence: numeric('ai_confidence', { precision: 4, scale: 2 }).default('0.95'),
  reviewStatus: text('review_status').default('AUTO_PROCESSED'), // PENDING_REVIEW, APPROVED, AUTO_PROCESSED
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Maintenance & Workshop Log Table
export const maintenanceLogs = pgTable('maintenance_logs', {
  id: serial('id').primaryKey(),
  vehicleInternalId: text('vehicle_internal_id').notNull(),
  serviceType: text('service_type').notNull(), // "Periodic Oil Change", "Brake Service", etc.
  costSar: numeric('cost_sar', { precision: 10, scale: 2 }).default('0.00'),
  serviceDate: text('service_date').notNull(),
  vendorWorkshop: text('vendor_workshop').default('Petromin Express'),
  odometerKm: integer('odometer_km').default(0),
  status: text('status').default('COMPLETED'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  maintenanceLogs: many(maintenanceLogs),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [maintenanceLogs.vehicleInternalId],
    references: [vehicles.internalVehicleId],
  }),
}));
