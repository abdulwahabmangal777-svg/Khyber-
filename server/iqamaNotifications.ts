import {
  getDb,
  saveDatabase,
  Worker,
  IqamaEmailReminderLog,
  ErpWebhookConfig,
  ErpWebhookDispatchLog,
  NotificationItem
} from './db';

// Helper to calculate days remaining
export function calculateDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiryDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Determine stage: 30, 7, 1 or null
export function getIqamaStage(daysRemaining: number): 30 | 7 | 1 | null {
  if (daysRemaining <= 1 && daysRemaining >= 0) return 1;
  if (daysRemaining <= 7 && daysRemaining > 1) return 7;
  if (daysRemaining <= 30 && daysRemaining > 7) return 30;
  return null;
}

// Generate bilingual email template for 3-stage reminders
export function generateIqamaReminderEmailContent(
  worker: Worker,
  stage: 30 | 7 | 1,
  daysRemaining: number,
  companyName: string = 'Khyber Logistics services'
): { subject: string; subjectAr: string; html: string; text: string } {
  const isSaudi = worker.iqamaNumber.startsWith('1');
  const docTitle = isSaudi ? 'Saudi National ID / الهوية الوطنية' : 'Resident Iqama / هوية مقيم';
  const stageName = stage === 30 ? 'Stage 1 (30 Days)' : stage === 7 ? 'Stage 2 (7 Days - CRITICAL)' : 'Stage 3 (1 Day - EMERGENCY)';
  const stageBadgeColor = stage === 30 ? '#2563eb' : stage === 7 ? '#d97706' : '#dc2626';

  let urgencyHeadline = '';
  let urgencyHeadlineAr = '';
  let penaltyNotice = '';
  let penaltyNoticeAr = '';

  if (stage === 30) {
    urgencyHeadline = 'Stage 1 Advance Notice: 30 Days Remaining Before Iqama Expiration';
    urgencyHeadlineAr = 'الإشعار الاستباقي الأول: بقي 30 يوماً على انتهاء الإقامة / الهوية';
    penaltyNotice = 'Please ensure Jawazat government fee is settled via SADAD and Qiwa work permit is active.';
    penaltyNoticeAr = 'يرجى التأكد من سداد الرسوم الحكومية عبر سداد والتحقق من رخصة العمل عبر منصة قوى.';
  } else if (stage === 7) {
    urgencyHeadline = 'Stage 2 Urgent Warning: Only 7 Days Remaining Before Iqama Expiration';
    urgencyHeadlineAr = 'تحذير عاجل للمرحلة الثانية: بقي 7 أيام فقط على انتهاء الإقامة';
    penaltyNotice = 'CRITICAL: Failure to renew prior to expiration results in a 500 SAR Saudi Jawazat penalty (1,000 SAR for repeat) and suspension of Muqeem portal electronic services.';
    penaltyNoticeAr = 'تنبيه عاجل: عدم التجديد قبل انتهاء المدة يعرض المنشأة لغرامة 500 ريال عن المرة الأولى (و1,000 ريال عند التكرار) وإيقاف خدمات مقيم.';
  } else {
    urgencyHeadline = 'Stage 3 EMERGENCY: Iqama Expires Tomorrow!';
    urgencyHeadlineAr = 'تنبيه طارئ للمرحلة الثالثة: تنتهي الإقامة غداً!';
    penaltyNotice = 'IMMEDIATE ACTION REQUIRED: Iqama expires within 24 hours. The employee must not be scheduled on cross-city transport routes until renewal is verified on Muqeem.';
    penaltyNoticeAr = 'إجراء فوري مطلوب: تنتهي الإقامة خلال 24 ساعة. يجب عدم تكليف السائق برحلات نقل بين المدن لحين تأكيد التجديد عبر مقيم.';
  }

  const subject = `[${stageName}] ${docTitle} Expiry Reminder for ${worker.fullName} (${worker.employeeId})`;
  const subjectAr = `[${stageName}] إشعار انتهاء ${docTitle} للموظف ${worker.fullNameAr || worker.fullName}`;

  const text = `
${companyName} - Official Workforce Compliance Notice
${urgencyHeadline}
${urgencyHeadlineAr}

Worker Details:
- Name: ${worker.fullName} (${worker.fullNameAr || ''})
- Employee ID: ${worker.employeeId}
- Iqama / National ID: ${worker.iqamaNumber}
- Expiry Date: ${worker.iqamaExpiry}
- Days Remaining: ${daysRemaining} day(s)
- Department: ${worker.departmentId}
- Job Title: ${worker.jobTitle}
- Mobile: ${worker.mobileNumber}

Next Mandatory Steps:
1. Verify Qiwa Work Permit validity.
2. Confirm CCHI-accredited medical insurance status.
3. Settle renewal fees through SADAD (MOI / Jawazat code).
4. Issue digital renewal via Muqeem or Absher Business.

Notice: ${penaltyNotice}
`.trim();

  const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #064e3b; color: #ffffff; padding: 24px; text-align: left; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: ${stageBadgeColor}; color: #ffffff; margin-bottom: 8px; }
    .title { font-size: 18px; font-weight: 800; margin: 0; color: #ffffff; }
    .subtitle-ar { font-size: 15px; font-weight: 600; margin-top: 6px; color: #a7f3d0; direction: rtl; text-align: right; }
    .body { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; font-size: 13px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .info-table td.label { font-weight: bold; color: #64748b; width: 38%; }
    .info-table td.value { color: #0f172a; font-weight: 600; }
    .highlight-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; margin-bottom: 20px; }
    .checklist { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .checklist h4 { margin: 0 0 10px 0; color: #166534; font-size: 13px; }
    .checklist ul { margin: 0; padding-left: 20px; font-size: 12px; color: #14532d; line-height: 1.6; }
    .footer { background: #f8fafc; padding: 16px 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">${stageName}</div>
      <h1 class="title">${urgencyHeadline}</h1>
      <div class="subtitle-ar">${urgencyHeadlineAr}</div>
    </div>
    <div class="body">
      <p style="margin-top:0;font-size:13px;color:#475569;">
        This is an automated Saudi regulatory notification dispatched by the <strong>${companyName}</strong> Fleet & Workforce System.
      </p>

      <table class="info-table">
        <tr>
          <td class="label">Worker Full Name:</td>
          <td class="value">${worker.fullName} <span style="color:#059669;">(${worker.fullNameAr || ''})</span></td>
        </tr>
        <tr>
          <td class="label">Employee ID:</td>
          <td class="value">${worker.employeeId}</td>
        </tr>
        <tr>
          <td class="label">Iqama / Saudi ID:</td>
          <td class="value" style="font-family:monospace;font-size:14px;letter-spacing:1px;">${worker.iqamaNumber}</td>
        </tr>
        <tr>
          <td class="label">Nationality:</td>
          <td class="value">${worker.nationality}</td>
        </tr>
        <tr>
          <td class="label">Current Expiry Date:</td>
          <td class="value" style="color:#b91c1c;"><strong>${worker.iqamaExpiry}</strong></td>
        </tr>
        <tr>
          <td class="label">Days Remaining:</td>
          <td class="value"><span style="color:${stageBadgeColor};font-size:15px;font-weight:900;">${daysRemaining} Days</span></td>
        </tr>
        <tr>
          <td class="label">Job Title:</td>
          <td class="value">${worker.jobTitle}</td>
        </tr>
        <tr>
          <td class="label">Mobile Number:</td>
          <td class="value">${worker.mobileNumber}</td>
        </tr>
      </table>

      <div class="highlight-box">
        <div style="font-weight:bold;font-size:12px;color:#92400e;margin-bottom:4px;">⚠️ Regulatory Caution / تنبيه نظامي:</div>
        <div style="font-size:12px;color:#b45309;line-height:1.5;">${penaltyNotice}</div>
        <div style="font-size:12px;color:#b45309;direction:rtl;text-align:right;margin-top:6px;line-height:1.5;">${penaltyNoticeAr}</div>
      </div>

      <div class="checklist">
        <h4>📋 Required Renewal Checklist (Absher Business & Muqeem):</h4>
        <ul>
          <li><strong>Step 1:</strong> Issue/Renew Work Permit on Qiwa Portal (رخصة العمل - قوى).</li>
          <li><strong>Step 2:</strong> Verify active Cooperative Health Insurance (CCHI / الضمان الصحي).</li>
          <li><strong>Step 3:</strong> Settle Jawazat renewal levy via SADAD banking code 026 (سداد رسوم الإقامة).</li>
          <li><strong>Step 4:</strong> Submit digital renewal request on Muqeem (منصة مقيم) to generate new digital Iqama.</li>
        </ul>
      </div>

      <p style="font-size:12px;color:#64748b;margin-bottom:0;">
        For questions or manual escalation, please contact the Human Resources & Regulatory Fleet Compliance Department.
      </p>
    </div>
    <div class="footer">
      Generated automatically by Saudi Enterprise Fleet & Workforce Management System.<br>
      Kingdom of Saudi Arabia • Compliant with ZATCA, Muqeem, and Saudi Labor Law.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, subjectAr, html, text };
}

// Dispatches formatted webhook alert to all configured enterprise ERPs
export async function dispatchIqamaAlertToErpWebhooks(
  worker: Worker,
  stage: 30 | 7 | 1 | 0,
  daysRemaining: number,
  eventType: 'IQAMA_STAGE_30' | 'IQAMA_STAGE_7' | 'IQAMA_STAGE_1' | 'IQAMA_EXPIRED' = 'IQAMA_STAGE_30'
): Promise<{ dispatchedCount: number; results: Array<{ webhookName: string; success: boolean; responseCode?: number; error?: string }> }> {
  const db = getDb();
  if (!Array.isArray(db.erpWebhooks) || db.erpWebhooks.length === 0) {
    return { dispatchedCount: 0, results: [] };
  }

  const activeWebhooks = db.erpWebhooks.filter(wh => {
    if (!wh.isActive) return false;
    if (stage === 30 && (wh.events.stage30Days || wh.events.allIqamaExpiries)) return true;
    if (stage === 7 && (wh.events.stage7Days || wh.events.allIqamaExpiries)) return true;
    if (stage === 1 && (wh.events.stage1Day || wh.events.allIqamaExpiries)) return true;
    if (stage === 0 && (wh.events.expired || wh.events.allIqamaExpiries)) return true;
    return false;
  });

  if (activeWebhooks.length === 0) {
    return { dispatchedCount: 0, results: [] };
  }

  const results: Array<{ webhookName: string; success: boolean; responseCode?: number; error?: string }> = [];

  for (const wh of activeWebhooks) {
    const startTime = Date.now();
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let responseCode: number | undefined = 200;
    let responseBody = '';
    let errorMessage: string | undefined;

    // Build payload according to ERP type and format
    let payload: any;
    const stageStr = stage === 30 ? 'STAGE_30_DAYS' : stage === 7 ? 'STAGE_7_DAYS' : stage === 1 ? 'STAGE_1_DAY' : 'EXPIRED';

    if (wh.payloadFormat === 'SAP_COMPLIANCE') {
      payload = {
        d: {
          EventHeader: {
            EventId: `SAP-EVT-${Date.now()}-${worker.id}`,
            EventType: eventType,
            Stage: stageStr,
            DaysRemaining: daysRemaining,
            Timestamp: new Date().toISOString(),
            CompanyCode: 'SAUDI_FLEET_KSA_01'
          },
          EmployeeComplianceRecord: {
            EmployeeId: worker.employeeId,
            FullName: worker.fullName,
            FullNameArabic: worker.fullNameAr || worker.fullName,
            NationalIdOrIqama: worker.iqamaNumber,
            Nationality: worker.nationality,
            ExpirationDate: worker.iqamaExpiry,
            DepartmentCode: worker.departmentId,
            JobPosition: worker.jobTitle,
            ContactMobile: worker.mobileNumber,
            CorporateEmail: worker.email,
            JawazatRenewalActionRequired: true,
            QiwaValidationStatus: 'PENDING_RENEWAL'
          }
        }
      };
    } else if (wh.payloadFormat === 'ORACLE_HCM') {
      payload = {
        notificationType: 'HR_DOCUMENT_EXPIRY',
        severity: stage <= 7 ? 'HIGH' : 'MEDIUM',
        timestamp: new Date().toISOString(),
        workerRecord: {
          personNumber: worker.employeeId,
          displayName: worker.fullName,
          arabicName: worker.fullNameAr || worker.fullName,
          nationalIdentifier: worker.iqamaNumber,
          citizenship: worker.nationality,
          documentType: 'SAUDI_RESIDENCE_IQAMA',
          expirationDate: worker.iqamaExpiry,
          daysToExpiration: daysRemaining,
          businessUnit: 'Saudi Fleet Operations'
        }
      };
    } else if (wh.payloadFormat === 'ODOO_HR') {
      payload = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'hr.employee',
          event: 'iqama_expiry_alert',
          stage: stageStr,
          days_remaining: daysRemaining,
          employee_id: worker.employeeId,
          name: worker.fullName,
          iqama_number: worker.iqamaNumber,
          expiry_date: worker.iqamaExpiry,
          create_renewal_task: true
        }
      };
    } else {
      // STANDARD_JSON
      payload = {
        event: 'IQAMA_EXPIRY_ALERT',
        eventType,
        stage: stageStr,
        daysRemaining,
        alertSeverity: stage === 1 ? 'EMERGENCY' : stage === 7 ? 'CRITICAL' : 'WARNING',
        timestamp: new Date().toISOString(),
        company: {
          name: db.companyProfile?.name || 'Saudi Enterprise Fleet Co.',
          crNumber: db.companyProfile?.crNumber || '1010000000',
          vatNumber: db.companyProfile?.vatNumber || '310000000000003'
        },
        worker: {
          id: worker.id,
          employeeId: worker.employeeId,
          fullName: worker.fullName,
          fullNameAr: worker.fullNameAr || worker.fullName,
          iqamaNumber: worker.iqamaNumber,
          iqamaExpiry: worker.iqamaExpiry,
          nationality: worker.nationality,
          departmentId: worker.departmentId,
          jobTitle: worker.jobTitle,
          mobileNumber: worker.mobileNumber,
          email: worker.email,
          status: worker.status
        },
        complianceGuidance: {
          portal: 'Muqeem / Absher Business',
          qiwaPermitStatus: 'Requires Verification',
          sadadJawazatBill: 'Payment Required'
        }
      };
    }

    const payloadString = JSON.stringify(payload);

    // If simulated / demo webhook URL
    if (
      !wh.webhookUrl ||
      wh.webhookUrl.includes('example.com') ||
      wh.webhookUrl.includes('DEMO') ||
      wh.webhookUrl.includes('MOCK') ||
      wh.webhookUrl.includes('local')
    ) {
      status = 'SUCCESS';
      responseCode = 200;
      responseBody = JSON.stringify({
        status: 'OK',
        message: `Simulated ERP webhook acceptance by ${wh.name} (${wh.erpType})`,
        receivedAt: new Date().toISOString(),
        workerId: worker.id
      });
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'SaudiFleetManagement-WebhookDispatcher/1.0',
          'X-Fleet-Event': eventType,
          'X-Fleet-Timestamp': new Date().toISOString(),
          ...(wh.headers || {})
        };

        if (wh.secretToken) {
          requestHeaders['X-Fleet-Signature'] = `sha256=${Buffer.from(wh.secretToken).toString('base64')}`;
        }

        const res = await fetch(wh.webhookUrl, {
          method: wh.httpMethod || 'POST',
          headers: requestHeaders,
          body: payloadString,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        responseCode = res.status;
        const text = await res.text();
        responseBody = text.slice(0, 1000);

        if (!res.ok) {
          status = 'FAILED';
          errorMessage = `HTTP ${res.status}: ${text.slice(0, 200)}`;
        }
      } catch (err: any) {
        status = 'FAILED';
        responseCode = 500;
        errorMessage = err.name === 'AbortError' ? 'ERP Webhook request timed out after 10 seconds' : (err.message || 'Network error');
      }
    }

    const durationMs = Date.now() - startTime;

    // Update webhook statistics
    wh.lastTriggeredAt = new Date().toISOString();
    wh.lastTriggerStatus = status;
    wh.lastResponseCode = responseCode;
    wh.triggerCount = (wh.triggerCount || 0) + 1;
    wh.updatedAt = new Date().toISOString();

    // Append to ERP dispatch logs
    if (!Array.isArray(db.erpWebhookDispatchLogs)) {
      db.erpWebhookDispatchLogs = [];
    }

    const logEntry: ErpWebhookDispatchLog = {
      id: `erplog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      webhookId: wh.id,
      webhookName: wh.name,
      erpType: wh.erpType,
      webhookUrl: wh.webhookUrl,
      eventType,
      workerId: worker.id,
      workerName: `${worker.fullName} (${worker.employeeId})`,
      iqamaNumber: worker.iqamaNumber,
      daysRemaining,
      status,
      responseCode,
      responseBody,
      durationMs,
      errorMessage,
      dispatchedAt: new Date().toISOString(),
      payloadPreview: payloadString.slice(0, 300)
    };

    db.erpWebhookDispatchLogs.unshift(logEntry);
    if (db.erpWebhookDispatchLogs.length > 200) {
      db.erpWebhookDispatchLogs = db.erpWebhookDispatchLogs.slice(0, 200);
    }

    results.push({
      webhookName: wh.name,
      success: status === 'SUCCESS',
      responseCode,
      error: errorMessage
    });
  }

  saveDatabase();
  return { dispatchedCount: activeWebhooks.length, results };
}

// Dispatches a single stage email reminder to a worker
export async function sendIqamaEmailReminder(
  worker: Worker,
  stage: 30 | 7 | 1,
  daysRemaining: number,
  triggeredBy: 'AUTOMATED_SCHEDULER' | 'MANUAL_DISPATCH' | 'TEST' = 'AUTOMATED_SCHEDULER'
): Promise<{ success: boolean; log: IqamaEmailReminderLog; erpDispatchResults?: any }> {
  const db = getDb();
  const companyName = db.companyProfile?.name || 'Khyber Logistics services';
  const recipientEmail = worker.email?.trim() || 'hr.compliance@saudifleet.com';

  const { subject, subjectAr, html, text } = generateIqamaReminderEmailContent(
    worker,
    stage,
    daysRemaining,
    companyName
  );

  const stageName = stage === 30 ? 'STAGE_30_DAYS' : stage === 7 ? 'STAGE_7_DAYS' : 'STAGE_1_DAY';
  const now = new Date().toISOString();

  // Create log record
  const log: IqamaEmailReminderLog = {
    id: `remlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workerId: worker.id,
    workerName: worker.fullName,
    workerNameAr: worker.fullNameAr || worker.fullName,
    employeeId: worker.employeeId,
    iqamaNumber: worker.iqamaNumber,
    recipientEmail,
    stage,
    stageName,
    daysRemaining,
    iqamaExpiry: worker.iqamaExpiry,
    subject,
    subjectAr,
    emailBodyHtml: html,
    status: 'SENT',
    deliveredAt: now,
    triggeredBy
  };

  if (!Array.isArray(db.iqamaReminderLogs)) {
    db.iqamaReminderLogs = [];
  }
  db.iqamaReminderLogs.unshift(log);
  if (db.iqamaReminderLogs.length > 300) {
    db.iqamaReminderLogs = db.iqamaReminderLogs.slice(0, 300);
  }

  // Create In-App Notification Item
  if (!Array.isArray(db.notifications)) {
    db.notifications = [];
  }

  const notificationItem: NotificationItem = {
    id: `notif-iqama-${Date.now()}-${worker.id}`,
    title: `[Iqama Expiry ${stageName}] ${worker.fullName}`,
    titleAr: `[تنبيه إقامة ${stage} يوم] ${worker.fullNameAr || worker.fullName}`,
    titlePs: `[د اقامې خبرداری ${stage} ورځې] ${worker.fullName}`,
    message: `Stage reminder sent to ${recipientEmail}. Iqama #${worker.iqamaNumber} expires in ${daysRemaining} day(s) on ${worker.iqamaExpiry}.`,
    messageAr: `تم إرسال تذكير المرحلة إلى ${recipientEmail}. تنتهي الإقامة رقم ${worker.iqamaNumber} بعد ${daysRemaining} يوماً في ${worker.iqamaExpiry}.`,
    messagePs: `تذکیر واستول شو. د کارکوونکي اقامه په ${daysRemaining} ورځو کې پای ته رسیږي.`,
    type: stage <= 7 ? 'EXPIRY_URGENT' : 'EXPIRY_WARNING',
    severity: stage === 1 ? 'CRITICAL' : stage === 7 ? 'CRITICAL' : 'WARNING',
    entityType: 'WORKER',
    entityId: worker.id,
    isRead: false,
    createdAt: now
  };

  db.notifications.unshift(notificationItem);
  if (db.notifications.length > 200) {
    db.notifications = db.notifications.slice(0, 200);
  }

  // Also trigger external ERP Webhooks
  const eventType = stage === 30 ? 'IQAMA_STAGE_30' : stage === 7 ? 'IQAMA_STAGE_7' : 'IQAMA_STAGE_1';
  const erpDispatchResults = await dispatchIqamaAlertToErpWebhooks(worker, stage, daysRemaining, eventType);

  saveDatabase();

  return { success: true, log, erpDispatchResults };
}

// Master function: Scans all workers and issues 30, 7, and 1-day reminders if due and not yet sent
export async function runIqamaReminderCheck(
  triggeredBy: 'AUTOMATED_SCHEDULER' | 'MANUAL_DISPATCH' = 'AUTOMATED_SCHEDULER'
): Promise<{
  processedWorkers: number;
  stage30Sent: number;
  stage7Sent: number;
  stage1Sent: number;
  totalRemindersSent: number;
  erpWebhooksTriggered: number;
  dispatchedLogs: IqamaEmailReminderLog[];
}> {
  const db = getDb();
  if (!Array.isArray(db.workers) || db.workers.length === 0) {
    return {
      processedWorkers: 0,
      stage30Sent: 0,
      stage7Sent: 0,
      stage1Sent: 0,
      totalRemindersSent: 0,
      erpWebhooksTriggered: 0,
      dispatchedLogs: []
    };
  }

  let stage30Sent = 0;
  let stage7Sent = 0;
  let stage1Sent = 0;
  let totalErpWebhooks = 0;
  const dispatchedLogs: IqamaEmailReminderLog[] = [];

  const existingLogs = Array.isArray(db.iqamaReminderLogs) ? db.iqamaReminderLogs : [];

  for (const worker of db.workers) {
    if (!worker.iqamaExpiry) continue;

    const days = calculateDaysRemaining(worker.iqamaExpiry);
    const stage = getIqamaStage(days);

    if (!stage) continue;

    // Deduplication check: Did we already send this stage reminder for this worker's current iqamaExpiry date?
    const alreadySent = existingLogs.some(
      l =>
        l.workerId === worker.id &&
        l.stage === stage &&
        l.iqamaExpiry === worker.iqamaExpiry &&
        l.status === 'SENT'
    );

    if (alreadySent) {
      continue;
    }

    // Send the reminder
    const result = await sendIqamaEmailReminder(worker, stage, days, triggeredBy);
    if (result.success) {
      dispatchedLogs.push(result.log);
      if (stage === 30) stage30Sent++;
      if (stage === 7) stage7Sent++;
      if (stage === 1) stage1Sent++;
      totalErpWebhooks += result.erpDispatchResults?.dispatchedCount || 0;
    }
  }

  return {
    processedWorkers: db.workers.length,
    stage30Sent,
    stage7Sent,
    stage1Sent,
    totalRemindersSent: dispatchedLogs.length,
    erpWebhooksTriggered: totalErpWebhooks,
    dispatchedLogs
  };
}

// Background scheduler for automated daily check
let schedulerInterval: NodeJS.Timeout | null = null;

export function startIqamaScheduler() {
  if (schedulerInterval) return;

  // Run initial check after 5 seconds
  setTimeout(() => {
    runIqamaReminderCheck('AUTOMATED_SCHEDULER')
      .then(res => {
        if (res.totalRemindersSent > 0) {
          console.log(`[Iqama Scheduler] Dispatched ${res.totalRemindersSent} three-stage email reminders & triggered ${res.erpWebhooksTriggered} ERP webhooks.`);
        }
      })
      .catch(err => console.error('[Iqama Scheduler] Error during initial scan:', err));
  }, 5000);

  // Check every 12 hours (43,200,000 ms)
  schedulerInterval = setInterval(() => {
    runIqamaReminderCheck('AUTOMATED_SCHEDULER')
      .then(res => {
        if (res.totalRemindersSent > 0) {
          console.log(`[Iqama Scheduler] Dispatched ${res.totalRemindersSent} three-stage email reminders & triggered ${res.erpWebhooksTriggered} ERP webhooks.`);
        }
      })
      .catch(err => console.error('[Iqama Scheduler] Error during recurring scan:', err));
  }, 12 * 60 * 60 * 1000);

  console.log('[Iqama Scheduler] Automated Three-Stage (30d, 7d, 1d) Expiry Reminder & ERP Webhook engine initialized.');
}
