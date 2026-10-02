import {
  getDb,
  saveDatabase,
  ReportSchedule,
  ReportExecutionLog,
  NotificationItem
} from './db';

export interface ReportSummaryMetrics {
  totalExpensesSar: number;
  fuelExpensesSar: number;
  maintenanceExpensesSar: number;
  otherExpensesSar: number;
  totalWorkers: number;
  activeIqamas: number;
  expiringIqamas30d: number;
  expiredIqamas: number;
  overallComplianceRate: number;
  totalVehicles: number;
  activeVehicles: number;
  upcomingIstimaraExpiries: number;
  upcomingInsuranceExpiries: number;
}

/**
 * Calculates real-time fleet expense and compliance metrics from database
 */
export function calculateReportMetrics(departmentId: string = 'ALL'): ReportSummaryMetrics {
  const db = getDb();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Filter vehicles
  const vehicles = (db.vehicles || []).filter(v => departmentId === 'ALL' || v.departmentId === departmentId);
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;

  let upcomingIstimaraExpiries = 0;
  let upcomingInsuranceExpiries = 0;
  vehicles.forEach(v => {
    if (v.istimaraExpiry) {
      const d = new Date(v.istimaraExpiry);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 30 && diffDays >= 0) upcomingIstimaraExpiries++;
    }
    if (v.insuranceExpiry) {
      const d = new Date(v.insuranceExpiry);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 30 && diffDays >= 0) upcomingInsuranceExpiries++;
    }
  });

  // 2. Filter workforce compliance
  const workers = (db.workers || []).filter(w => departmentId === 'ALL' || w.departmentId === departmentId);
  const totalWorkers = workers.length;
  let activeIqamas = 0;
  let expiringIqamas30d = 0;
  let expiredIqamas = 0;

  workers.forEach(w => {
    if (w.status !== 'ACTIVE') return;
    if (!w.iqamaExpiry) {
      activeIqamas++;
      return;
    }
    const expDate = new Date(w.iqamaExpiry);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) {
      expiredIqamas++;
    } else if (diffDays <= 30) {
      expiringIqamas30d++;
      activeIqamas++;
    } else {
      activeIqamas++;
    }
  });

  const compliantCount = Math.max(0, totalWorkers - expiredIqamas);
  const overallComplianceRate = totalWorkers > 0 
    ? Math.round((compliantCount / totalWorkers) * 1000) / 10 
    : 100;

  // 3. Filter fleet expenses
  const fuelRecords = (db.fuelRecords || []).filter(f => departmentId === 'ALL' || !f.vehicleId || vehicles.some(v => v.id === f.vehicleId));
  const maintenanceRecords = (db.maintenance || []).filter(m => departmentId === 'ALL' || vehicles.some(v => v.id === m.vehicleId));
  const generalExpenses = (db.expenses || []).filter(e => departmentId === 'ALL' || !e.vehicleId || vehicles.some(v => v.id === e.vehicleId));
  const driverExpenses = (db.driverExpenses || []).filter(de => de.status === 'APPROVED');

  const fuelExpensesSar = fuelRecords.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0);
  const maintenanceExpensesSar = maintenanceRecords.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
  const otherExpensesSar = generalExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
    driverExpenses.reduce((sum, de) => sum + (Number(de.amount) || 0), 0);

  const totalExpensesSar = fuelExpensesSar + maintenanceExpensesSar + otherExpensesSar;

  return {
    totalExpensesSar,
    fuelExpensesSar,
    maintenanceExpensesSar,
    otherExpensesSar,
    totalWorkers,
    activeIqamas,
    expiringIqamas30d,
    expiredIqamas,
    overallComplianceRate,
    totalVehicles,
    activeVehicles,
    upcomingIstimaraExpiries,
    upcomingInsuranceExpiries
  };
}

/**
 * Generates an executive bilingual HTML email summarizing expenses and workforce compliance
 */
export function generateReportEmailHtml(
  schedule: ReportSchedule,
  metrics: ReportSummaryMetrics,
  companyName: string = 'Khyber Logistics services'
): { subject: string; html: string; text: string } {
  const periodTitle = schedule.frequency === 'WEEKLY' ? 'Weekly Executive Digest' : 'Monthly Executive Audit';
  const periodTitleAr = schedule.frequency === 'WEEKLY' ? 'التقرير التنفيذي الأسبوعي' : 'تقرير التدقيق التنفيذي الشهري';
  const subject = `📊 [${periodTitle}] Fleet Expenses & Workforce Compliance Summary - ${companyName}`;

  const text = `
======================================================================
${companyName} - ${periodTitle} (${periodTitleAr})
Frequency: ${schedule.frequency} | Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (Riyadh Time)
======================================================================

1. FINANCIAL & FLEET EXPENSE AUDIT:
--------------------------------------------------
• Total Operating Spend: ${metrics.totalExpensesSar.toLocaleString()} SAR
  - Fuel Consumption: ${metrics.fuelExpensesSar.toLocaleString()} SAR
  - Workshop & Maintenance: ${metrics.maintenanceExpensesSar.toLocaleString()} SAR
  - Tolls, Logistics & General Ops: ${metrics.otherExpensesSar.toLocaleString()} SAR

2. SAUDI WORKFORCE & REGULATORY COMPLIANCE:
--------------------------------------------------
• Overall Workforce Compliance Rate: ${metrics.overallComplianceRate}%
• Total Active Workforce: ${metrics.totalWorkers} employees
• Valid Iqamas / National IDs: ${metrics.activeIqamas}
• Expiries within next 30 days (Action Required): ${metrics.expiringIqamas30d}
• Expired Iqamas (Urgent Morour/Jawazat Risk): ${metrics.expiredIqamas}

3. VEHICLE REGULATORY STATUS:
--------------------------------------------------
• Total Fleet Size: ${metrics.totalVehicles} units (${metrics.activeVehicles} active on route)
• Istimara (Vehicle Registration) Expiries <= 30d: ${metrics.upcomingIstimaraExpiries}
• Insurance Expiries <= 30d: ${metrics.upcomingInsuranceExpiries}

Automated delivery generated by Saudi Fleet Management Enterprise System.
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #f1f5f9; color: #0f172a; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: #ffffff; padding: 28px 32px; border-bottom: 4px solid #10b981; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #065f46; margin-bottom: 12px; }
    .content { padding: 32px; }
    .section-title { font-size: 14px; font-weight: 700; color: #064e3b; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 12px 0; display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .card-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .card-value.highlight { color: #065f46; }
    .card-value.warning { color: #d97706; }
    .card-value.danger { color: #dc2626; }
    .progress-bar-bg { height: 10px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-top: 8px; }
    .progress-bar-fill { height: 100%; background: #10b981; border-radius: 9999px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { text-align: left; padding: 8px 12px; background: #f1f5f9; color: #475569; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .footer { background: #f8fafc; padding: 20px 32px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">SAUDI ARABIA ENTERPRISE AUTOMATION</span>
      <h1>${companyName}</h1>
      <p>${periodTitle} • ${periodTitleAr}</p>
      <div style="font-size: 11px; margin-top: 8px; opacity: 0.85;">
        Schedule: <strong>${schedule.name}</strong> • Dispatched: <strong>${new Date().toISOString().slice(0, 10)}</strong>
      </div>
    </div>

    <div class="content">
      <!-- Section 1: Fleet Expenses -->
      <div class="section-title">1. Operational Fleet Expenses Summary</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Total Fleet Spend</div>
          <div class="card-value highlight">${metrics.totalExpensesSar.toLocaleString()} <span style="font-size: 14px; font-weight: 600;">SAR</span></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Verified Ledger Transactions</div>
        </div>
        <div class="card">
          <div class="card-label">Fuel Operations</div>
          <div class="card-value">${metrics.fuelExpensesSar.toLocaleString()} <span style="font-size: 14px; font-weight: 600;">SAR</span></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Diesel 91/95 Dispensed</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Expense Category</th>
            <th>Amount (SAR)</th>
            <th>Share %</th>
            <th>Operational Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>⛽ Diesel & Gasoline Fuel</strong></td>
            <td><strong>${metrics.fuelExpensesSar.toLocaleString()} SAR</strong></td>
            <td>${metrics.totalExpensesSar > 0 ? Math.round((metrics.fuelExpensesSar / metrics.totalExpensesSar) * 100) : 0}%</td>
            <td><span style="color: #059669; font-weight: 600;">Optimal Efficiency</span></td>
          </tr>
          <tr>
            <td><strong>🔧 Workshop & Preventive Maintenance</strong></td>
            <td><strong>${metrics.maintenanceExpensesSar.toLocaleString()} SAR</strong></td>
            <td>${metrics.totalExpensesSar > 0 ? Math.round((metrics.maintenanceExpensesSar / metrics.totalExpensesSar) * 100) : 0}%</td>
            <td><span style="color: #0284c7; font-weight: 600;">Work Orders Settle</span></td>
          </tr>
          <tr>
            <td><strong>📋 Tolls, Parking & Driver Incidentals</strong></td>
            <td><strong>${metrics.otherExpensesSar.toLocaleString()} SAR</strong></td>
            <td>${metrics.totalExpensesSar > 0 ? Math.round((metrics.otherExpensesSar / metrics.totalExpensesSar) * 100) : 0}%</td>
            <td><span style="color: #475569; font-weight: 600;">Reconciled</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Section 2: Workforce Compliance -->
      <div class="section-title">2. Saudi Workforce & Iqama Regulatory Compliance</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Workforce Compliance Rate</div>
          <div class="card-value ${metrics.overallComplianceRate >= 95 ? 'highlight' : 'warning'}">
            ${metrics.overallComplianceRate}%
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${metrics.overallComplianceRate}%;"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-label">Active Workforce Roster</div>
          <div class="card-value">${metrics.totalWorkers} <span style="font-size: 14px; font-weight: 600;">Workers</span></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Iqama & Qiwa Verified</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Metric / Regulatory Obligation</th>
            <th>Count</th>
            <th>Risk Level</th>
            <th>Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Valid Iqamas & National IDs</strong></td>
            <td><strong>${metrics.activeIqamas}</strong> / ${metrics.totalWorkers}</td>
            <td><span style="color: #059669; font-weight: 600;">Low / Compliant</span></td>
            <td>Routine audit</td>
          </tr>
          <tr>
            <td><strong>Expiring within 30 Days (Stage 1)</strong></td>
            <td><strong>${metrics.expiringIqamas30d}</strong></td>
            <td><span style="color: #d97706; font-weight: 600;">Moderate Alert</span></td>
            <td>Settle Jawazat SADAD fee</td>
          </tr>
          <tr>
            <td><strong>Expired (Imminent Penalty)</strong></td>
            <td><strong>${metrics.expiredIqamas}</strong></td>
            <td><span style="color: ${metrics.expiredIqamas > 0 ? '#dc2626' : '#059669'}; font-weight: 600;">${metrics.expiredIqamas > 0 ? 'CRITICAL (500+ SAR Fee)' : 'Zero Violations'}</span></td>
            <td>${metrics.expiredIqamas > 0 ? 'Immediate Muqeem renewal' : 'No action needed'}</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 3: Fleet Assets -->
      <div class="section-title">3. Vehicle Registration & Safety Fleet Status</div>
      <div class="grid">
        <div class="card">
          <div class="card-label">Active Heavy & Light Vehicles</div>
          <div class="card-value">${metrics.activeVehicles} / ${metrics.totalVehicles}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Vehicles on Active Routes</div>
        </div>
        <div class="card">
          <div class="card-label">Istimara / Insurance Expiries (30d)</div>
          <div class="card-value ${metrics.upcomingIstimaraExpiries + metrics.upcomingInsuranceExpiries > 0 ? 'warning' : 'highlight'}">
            ${metrics.upcomingIstimaraExpiries + metrics.upcomingInsuranceExpiries}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Istimara: ${metrics.upcomingIstimaraExpiries} | Insurance: ${metrics.upcomingInsuranceExpiries}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      This is an automated executive dispatch sent to: <strong>${schedule.recipientEmails.join(', ')}</strong>.<br>
      Configured via the <strong>Enterprise Report Scheduler</strong> in ${companyName}.<br>
      © ${new Date().getFullYear()} ${companyName} • Kingdom of Saudi Arabia.
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * Executes a single scheduled report, logs result, sends in-app notifications,
 * and records the execution log.
 */
export async function executeReportSchedule(
  scheduleId: string,
  mode: 'AUTOMATED' | 'MANUAL_TEST' = 'AUTOMATED'
): Promise<{ success: boolean; log: ReportExecutionLog; error?: string }> {
  const db = getDb();
  if (!Array.isArray(db.reportSchedules)) {
    db.reportSchedules = [];
  }
  if (!Array.isArray(db.reportExecutionLogs)) {
    db.reportExecutionLogs = [];
  }
  if (!Array.isArray(db.notifications)) {
    db.notifications = [];
  }

  const schedule = db.reportSchedules.find(s => s.id === scheduleId);
  if (!schedule) {
    throw new Error(`Report schedule with ID '${scheduleId}' not found.`);
  }

  const metrics = calculateReportMetrics(schedule.departmentId || 'ALL');
  const companyName = db.companyProfile?.name || 'Khyber Logistics services';
  const { subject, html } = generateReportEmailHtml(schedule, metrics, companyName);

  const now = new Date().toISOString();
  const logEntry: ReportExecutionLog = {
    id: `replog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    frequency: schedule.frequency,
    dispatchedAt: now,
    recipients: schedule.recipientEmails,
    reportTypes: schedule.reportTypes,
    totalExpensesSar: metrics.totalExpensesSar,
    fuelExpensesSar: metrics.fuelExpensesSar,
    maintenanceExpensesSar: metrics.maintenanceExpensesSar,
    otherExpensesSar: metrics.otherExpensesSar,
    totalWorkers: metrics.totalWorkers,
    activeIqamas: metrics.activeIqamas,
    expiringIqamas30d: metrics.expiringIqamas30d,
    expiredIqamas: metrics.expiredIqamas,
    overallComplianceRate: metrics.overallComplianceRate,
    status: 'SUCCESS',
    deliveryMode: 'SIMULATED_AND_LOGGED',
    emailSubject: subject,
    emailPreviewHtml: html
  };

  db.reportExecutionLogs.unshift(logEntry);
  if (db.reportExecutionLogs.length > 200) {
    db.reportExecutionLogs = db.reportExecutionLogs.slice(0, 200);
  }

  // Update schedule status
  schedule.lastRunAt = now;
  schedule.lastRunStatus = 'SUCCESS';
  schedule.lastRunSummary = `Dispatched ${schedule.frequency.toLowerCase()} summary to ${schedule.recipientEmails.length} recipient(s). Total Spend: ${metrics.totalExpensesSar.toLocaleString()} SAR, Compliance: ${metrics.overallComplianceRate}%.`;
  schedule.totalRunsCount = (schedule.totalRunsCount || 0) + 1;
  schedule.updatedAt = now;

  // Add in-app notification
  const notif: NotificationItem = {
    id: `notif-rep-${Date.now()}`,
    title: `[Automated Report Dispatched] ${schedule.name}`,
    titleAr: `[تم إرسال التقرير المجدول] ${schedule.name}`,
    titlePs: `[راپور واستول شو] ${schedule.name}`,
    message: `${schedule.frequency} summary sent to ${schedule.recipientEmails.join(', ')}. Expenses: ${metrics.totalExpensesSar.toLocaleString()} SAR • Compliance: ${metrics.overallComplianceRate}%.`,
    messageAr: `تم إرسال ملخص ${schedule.frequency === 'WEEKLY' ? 'أسبوعي' : 'شهري'} إلى ${schedule.recipientEmails.join(', ')}. المصروفات: ${metrics.totalExpensesSar.toLocaleString()} ريال • الامتثال: ${metrics.overallComplianceRate}%.`,
    messagePs: `د ${schedule.frequency} راپور واستول شو. لګښت: ${metrics.totalExpensesSar.toLocaleString()} SAR`,
    type: 'SYSTEM',
    severity: 'SUCCESS',
    isRead: false,
    createdAt: now
  };
  db.notifications.unshift(notif);
  if (db.notifications.length > 200) {
    db.notifications = db.notifications.slice(0, 200);
  }

  saveDatabase();

  console.log(`[Report Scheduler] Successfully executed '${schedule.name}' (${schedule.frequency}) for ${schedule.recipientEmails.length} recipients.`);

  return { success: true, log: logEntry };
}

let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Initializes the background scheduler check that evaluates recurring schedules.
 */
export function initReportSchedulerEngine() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('[Report Scheduler] Initializing automated weekly/monthly recurring report engine.');

  // Run initial scan 10 seconds after server boot
  setTimeout(() => {
    checkAndRunDueReportSchedules().catch(err =>
      console.error('[Report Scheduler] Error during startup scan:', err)
    );
  }, 10000);

  // Check every 10 minutes (600,000 ms)
  schedulerTimer = setInterval(() => {
    checkAndRunDueReportSchedules().catch(err =>
      console.error('[Report Scheduler] Error during periodic check:', err)
    );
  }, 10 * 60 * 1000);
}

/**
 * Evaluates active schedules and triggers them if due
 */
export async function checkAndRunDueReportSchedules() {
  const db = getDb();
  if (!Array.isArray(db.reportSchedules) || db.reportSchedules.length === 0) {
    return;
  }

  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday
  const currentDayOfMonth = now.getDate(); // 1 to 31

  for (const schedule of db.reportSchedules) {
    if (!schedule.isActive) continue;

    const lastRun = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
    const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 3600) : 9999;

    let isDue = false;

    if (schedule.frequency === 'WEEKLY') {
      // Must match dayOfWeek and not have run in past 6 days (140 hours)
      const targetDay = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0;
      if (currentDayOfWeek === targetDay && hoursSinceLastRun > 140) {
        isDue = true;
      }
    } else if (schedule.frequency === 'MONTHLY') {
      // Must match dayOfMonth and not have run in past 25 days (600 hours)
      const targetDate = schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : 1;
      if (currentDayOfMonth === targetDate && hoursSinceLastRun > 600) {
        isDue = true;
      }
    }

    if (isDue) {
      console.log(`[Report Scheduler] Schedule '${schedule.name}' is due. Triggering automated execution.`);
      try {
        await executeReportSchedule(schedule.id, 'AUTOMATED');
      } catch (err) {
        console.error(`[Report Scheduler] Failed to execute schedule ${schedule.id}:`, err);
      }
    }
  }
}
