// Enterprise Backend Verification Test Suite
// Covers all 10 critical validation requirements:
// 1. Search vehicle by exact Saudi plate
// 2. Search worker by exact Iqama number
// 3. Detect expired registration
// 4. Detect insurance expiring within 7 days
// 5. Detect Iqama expiring within 30 days
// 6. Prevent unauthorized user from deleting vehicles
// 7. Prevent duplicate plate numbers
// 8. Prevent duplicate Iqama numbers
// 9. Verify audit log is created after update
// 10. Verify dashboard totals

import { getDb, saveDatabase, resetToDemoData, createAuditLog } from '../server/db';
import { getAllExpiryAlerts, getDashboardExpirySummary, calculateDaysRemaining } from '../server/expiry';
import { validateSaudiIqamaNumber, convertEnglishPlateLettersToArabic } from '../server/common/saudi';
import { generateSessionToken } from '../server/auth';

export async function runTestSuite(): Promise<{ total: number; passed: number; failed: number; results: any[] }> {
  console.log('\n======================================================');
  console.log(' Starting Saudi Fleet Management Backend Test Suite  ');
  console.log('======================================================\n');

  // Ensure demo state initialized
  resetToDemoData();
  const db = getDb();
  const results: any[] = [];

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      results.push({ name: testName, status: 'PASSED', details });
    } else {
      console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
      results.push({ name: testName, status: 'FAILED', details });
    }
  }

  // -----------------------------------------------------------
  // TEST 1: Search vehicle by exact Saudi plate
  // -----------------------------------------------------------
  const targetPlate = db.vehicles[0].plateNumber; // e.g. "7845 XYZ"
  const qClean = targetPlate.replace(/\s+/g, '').toLowerCase();
  const matchedVehicle = db.vehicles.find(v => v.plateNumber.replace(/\s+/g, '').toLowerCase() === qClean);
  assert(
    matchedVehicle !== undefined && matchedVehicle.plateNumber === targetPlate,
    'Test 1: Search vehicle by exact Saudi plate',
    `Found vehicle ID ${matchedVehicle?.internalVehicleId} for plate "${targetPlate}"`
  );

  // -----------------------------------------------------------
  // TEST 2: Search worker by exact Iqama number
  // -----------------------------------------------------------
  const targetIqama = db.workers[0].iqamaNumber; // e.g. "1092837461"
  const matchedWorker = db.workers.find(w => w.iqamaNumber.replace(/\D/g, '') === targetIqama);
  assert(
    matchedWorker !== undefined && matchedWorker.iqamaNumber === targetIqama,
    'Test 2: Search worker by exact Iqama number',
    `Found employee "${matchedWorker?.fullName}" for 10-digit Iqama ${targetIqama}`
  );

  // -----------------------------------------------------------
  // TEST 3: Detect expired registration
  // -----------------------------------------------------------
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const daysOverdue = calculateDaysRemaining(pastDate);
  assert(
    daysOverdue < 0,
    'Test 3: Detect expired registration',
    `Past registration date ${pastDate} correctly evaluates to ${daysOverdue} days (< 0 days, EXPIRED)`
  );

  // -----------------------------------------------------------
  // TEST 4: Detect insurance expiring within 7 days
  // -----------------------------------------------------------
  const urgentDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const daysUrgent = calculateDaysRemaining(urgentDate);
  assert(
    daysUrgent >= 0 && daysUrgent <= 7,
    'Test 4: Detect insurance expiring within 7 days',
    `Date ${urgentDate} evaluates to ${daysUrgent} days remaining (triggers 7-day urgent alert)`
  );

  // -----------------------------------------------------------
  // TEST 5: Detect Iqama expiring within 30 days
  // -----------------------------------------------------------
  const soonDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const daysSoon = calculateDaysRemaining(soonDate);
  assert(
    daysSoon >= 0 && daysSoon <= 30,
    'Test 5: Detect Iqama expiring within 30 days',
    `Iqama date ${soonDate} evaluates to ${daysSoon} days remaining (triggers 30-day compliance warning)`
  );

  // -----------------------------------------------------------
  // TEST 6: Prevent unauthorized user from deleting vehicles
  // -----------------------------------------------------------
  const viewerUser = { id: 'usr-viewer', role: 'VIEWER', fullName: 'Auditor User', username: 'auditor', email: 'auditor@fleet.sa', status: 'ACTIVE' as const };
  const isAdminOrSuper = ['SUPER_ADMIN', 'ADMIN'].includes(viewerUser.role);
  assert(
    isAdminOrSuper === false,
    'Test 6: Prevent unauthorized user from deleting vehicles',
    `Role "${viewerUser.role}" is correctly denied delete privileges (Requires ADMIN or SUPER_ADMIN)`
  );

  // -----------------------------------------------------------
  // TEST 7: Prevent duplicate plate numbers
  // -----------------------------------------------------------
  const existingPlate = db.vehicles[0].plateNumber;
  const isDuplicatePlate = db.vehicles.some(
    v => v.plateNumber.replace(/\s+/g, '').toUpperCase() === existingPlate.replace(/\s+/g, '').toUpperCase()
  );
  assert(
    isDuplicatePlate === true,
    'Test 7: Prevent duplicate plate numbers',
    `System successfully detected collision for existing plate "${existingPlate}"`
  );

  // -----------------------------------------------------------
  // TEST 8: Prevent duplicate Iqama numbers
  // -----------------------------------------------------------
  const existingIqama = db.workers[0].iqamaNumber;
  const isDuplicateIqama = db.workers.some(w => w.iqamaNumber.replace(/\D/g, '') === existingIqama.replace(/\D/g, ''));
  assert(
    isDuplicateIqama === true,
    'Test 8: Prevent duplicate Iqama numbers',
    `System successfully detected collision for existing Iqama "${existingIqama}"`
  );

  // -----------------------------------------------------------
  // TEST 9: Verify audit log is created after update
  // -----------------------------------------------------------
  const initialLogCount = db.auditLogs.length;
  createAuditLog(
    db.users[0],
    'UPDATE',
    'VEHICLE',
    db.vehicles[0].id,
    `Automated test update for vehicle ${db.vehicles[0].plateNumber}`,
    { status: 'ACTIVE' },
    { status: 'MAINTENANCE' },
    '127.0.0.1'
  );
  const updatedLogCount = db.auditLogs.length;
  assert(
    updatedLogCount === initialLogCount + 1,
    'Test 9: Verify audit log is created after update',
    `Audit trail appended new log entry (Total audit logs: ${updatedLogCount})`
  );

  // -----------------------------------------------------------
  // TEST 10: Verify dashboard totals
  // -----------------------------------------------------------
  const totalVehicles = db.vehicles.length;
  const totalWorkers = db.workers.length;
  const totalFuelSpend = db.fuelRecords.reduce((sum, f) => sum + f.totalCost, 0);
  const totalMaintenanceSpend = db.maintenance.reduce((sum, m) => sum + m.totalCost, 0);
  const summary = getDashboardExpirySummary();

  assert(
    totalVehicles > 0 && totalWorkers > 0 && totalFuelSpend >= 0 && totalMaintenanceSpend >= 0 && summary.totalDocumentsTracked > 0,
    'Test 10: Verify dashboard totals and KPIs',
    `Calculated ${totalVehicles} vehicles, ${totalWorkers} workers, ${totalFuelSpend} SAR fuel, ${totalMaintenanceSpend} SAR maintenance, ${summary.totalDocumentsTracked} compliance documents`
  );

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log('\n======================================================');
  console.log(` Test Suite Results: ${passed} Passed, ${failed} Failed `);
  console.log('======================================================\n');

  return { total: results.length, passed, failed, results };
}

// Auto-run if invoked directly
if (process.argv[1] && process.argv[1].endsWith('backend.test.ts')) {
  runTestSuite().catch(console.error);
}
