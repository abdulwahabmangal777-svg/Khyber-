import { ChatWebhookConfig, WebhookDispatchLog, ErpWebhookConfig, ErpWebhookDispatchLog, IqamaEmailReminderLog, Worker } from '../types';
import { getAuthHeaders } from '../utils/api';

export async function fetchChatWebhooks(token?: string | null): Promise<ChatWebhookConfig[]> {
  try {
    const res = await fetch('/api/notifications/webhooks', {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notice: Failed to fetch chat webhooks:', err);
    return [];
  }
}

export async function createChatWebhook(
  webhook: Partial<ChatWebhookConfig>,
  token?: string | null
): Promise<{ success: boolean; data?: ChatWebhookConfig; error?: string }> {
  try {
    const res = await fetch('/api/notifications/webhooks', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhook)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create webhook' };
  }
}

export async function updateChatWebhook(
  id: string,
  updates: Partial<ChatWebhookConfig>,
  token?: string | null
): Promise<{ success: boolean; data?: ChatWebhookConfig; error?: string }> {
  try {
    const res = await fetch(`/api/notifications/webhooks/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update webhook' };
  }
}

export async function deleteChatWebhook(
  id: string,
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/notifications/webhooks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete webhook' };
  }
}

export async function toggleChatWebhook(
  id: string,
  token?: string | null
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/notifications/webhooks/${id}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, isActive: data.isActive };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle webhook' };
  }
}

export async function testChatWebhook(
  params: { webhookId?: string; webhookUrl?: string; webhookName?: string },
  token?: string | null
): Promise<{ success: boolean; statusCode?: number; simulated?: boolean; error?: string; log?: WebhookDispatchLog }> {
  try {
    const res = await fetch('/api/notifications/webhooks/test', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return {
      success: data.success ?? false,
      statusCode: data.statusCode,
      simulated: data.simulated,
      error: data.error,
      log: data.log
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection test failed' };
  }
}

export interface DispatchEventParams {
  category: 'VEHICLE_EXPIRY' | 'MAINTENANCE_EVENT' | 'DRIVER_COMPLIANCE' | 'SYSTEM';
  entityId?: string;
  entityName: string;
  plateOrId?: string;
  department?: string;
  daysRemaining?: number;
  expiryDate?: string;
  documentType?: string;
  maintenanceType?: string;
  workshop?: string;
  cost?: number;
  odometer?: number;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO';
  webhookId?: string;
  notes?: string;
}

export async function dispatchEventToGoogleChat(
  event: DispatchEventParams,
  token?: string | null
): Promise<{ success: boolean; dispatchedCount?: number; totalTargets?: number; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/notifications/webhooks/dispatch-event', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch event' };
  }
}

export async function triggerAutoPushCritical(
  token?: string | null
): Promise<{
  success: boolean;
  scannedExpiries?: number;
  scannedMaintenance?: number;
  activeWebhooksCount?: number;
  totalPushesDelivered?: number;
  timestamp?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/notifications/webhooks/auto-push-critical', {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || data.error || `HTTP ${res.status}` };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to trigger automated push' };
  }
}

export async function fetchWebhookDispatchLogs(token?: string | null): Promise<WebhookDispatchLog[]> {
  try {
    const res = await fetch('/api/notifications/webhooks/logs', {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notice: Failed to fetch webhook logs:', err);
    return [];
  }
}

export async function clearWebhookDispatchLogs(token?: string | null): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/webhooks/logs', {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// ERP WEBHOOK CLIENT APIS
// -------------------------------------------------------------

export async function fetchErpWebhooks(token?: string | null): Promise<ErpWebhookConfig[]> {
  try {
    const res = await fetch('/api/erp-webhooks', {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notice: Failed to fetch ERP webhooks:', err);
    return [];
  }
}

export async function createErpWebhook(
  webhook: Partial<ErpWebhookConfig>,
  token?: string | null
): Promise<{ success: boolean; data?: ErpWebhookConfig; error?: string }> {
  try {
    const res = await fetch('/api/erp-webhooks', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhook)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create ERP webhook' };
  }
}

export async function updateErpWebhook(
  id: string,
  updates: Partial<ErpWebhookConfig>,
  token?: string | null
): Promise<{ success: boolean; data?: ErpWebhookConfig; error?: string }> {
  try {
    const res = await fetch(`/api/erp-webhooks/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update ERP webhook' };
  }
}

export async function deleteErpWebhook(id: string, token?: string | null): Promise<boolean> {
  try {
    const res = await fetch(`/api/erp-webhooks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleErpWebhook(
  id: string,
  token?: string | null
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/erp-webhooks/${id}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, isActive: data.isActive };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle ERP webhook' };
  }
}

export async function testErpWebhook(
  id: string,
  token?: string | null
): Promise<{ success: boolean; message?: string; results?: any; error?: string }> {
  try {
    const res = await fetch(`/api/erp-webhooks/${id}/test`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, message: data.message, results: data.results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to test ERP webhook' };
  }
}

export async function dispatchIqamaToErp(
  workerId: string,
  stage: 30 | 7 | 1 = 30,
  token?: string | null
): Promise<{ success: boolean; message?: string; results?: any; error?: string }> {
  try {
    const res = await fetch('/api/erp-webhooks/dispatch-iqama', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workerId, stage })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, message: data.message, results: data.results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch Iqama alert to ERP' };
  }
}

export async function fetchErpWebhookLogs(token?: string | null): Promise<ErpWebhookDispatchLog[]> {
  try {
    const res = await fetch('/api/erp-webhooks/logs', {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notice: Failed to fetch ERP webhook logs:', err);
    return [];
  }
}

export async function clearErpWebhookLogs(token?: string | null): Promise<boolean> {
  try {
    const res = await fetch('/api/erp-webhooks/logs', {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// THREE-STAGE IQAMA EMAIL REMINDERS CLIENT APIS
// -------------------------------------------------------------

export interface IqamaRemindersResponse {
  logs: IqamaEmailReminderLog[];
  workersDue: Array<{
    worker: Worker;
    daysRemaining: number;
    stage: 30 | 7 | 1 | null;
    stageName: string;
    hasSentThisStage: boolean;
  }>;
  summary: {
    totalDispatched: number;
    stage30Count: number;
    stage7Count: number;
    stage1Count: number;
    pendingCount: number;
  };
}

export async function fetchIqamaReminders(token?: string | null): Promise<IqamaRemindersResponse> {
  try {
    const res = await fetch('/api/notifications/iqama-reminders', {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Notice: Failed to fetch Iqama reminders:', err);
    return {
      logs: [],
      workersDue: [],
      summary: { totalDispatched: 0, stage30Count: 0, stage7Count: 0, stage1Count: 0, pendingCount: 0 }
    };
  }
}

export async function runIqamaReminderScan(token?: string | null): Promise<{
  success: boolean;
  message?: string;
  result?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/notifications/iqama-reminders/run', {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, message: data.message, result: data.result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to execute Iqama scan' };
  }
}

export async function sendTestIqamaReminder(
  workerId: string,
  stage: 30 | 7 | 1,
  customEmail?: string,
  token?: string | null
): Promise<{ success: boolean; message?: string; log?: IqamaEmailReminderLog; error?: string }> {
  try {
    const res = await fetch('/api/notifications/iqama-reminders/send-test', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workerId, stage, customEmail })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, message: data.message, log: data.log };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch test reminder' };
  }
}

export async function previewIqamaReminder(
  workerId: string,
  stage: 30 | 7 | 1 = 30,
  token?: string | null
): Promise<{ subject: string; subjectAr: string; html: string; text: string } | null> {
  try {
    const res = await fetch(`/api/notifications/iqama-reminders/preview/${workerId}?stage=${stage}`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function clearIqamaReminderLogs(token?: string | null): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/iqama-reminders/logs', {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    return res.ok;
  } catch {
    return false;
  }
}
