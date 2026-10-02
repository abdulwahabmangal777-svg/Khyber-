export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  unread: boolean;
  labelIds: string[];
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText: string;
  bodyHtml?: string;
}

function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(base64Url: string): string {
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const bytes = Uint8Array.from(binStr, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

// Extract headers helper
function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const match = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return match?.value || '';
}

// Extract body recursively from payload parts
function extractBody(payload: any): { text: string; html?: string } {
  let text = '';
  let html = '';

  if (!payload) return { text: '' };

  if (payload.body?.data) {
    const decoded = base64UrlDecode(payload.body.data);
    if (payload.mimeType?.includes('html')) {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = text || base64UrlDecode(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = html || base64UrlDecode(part.body.data);
      } else if (part.parts) {
        const nested = extractBody(part);
        if (nested.text) text = text || nested.text;
        if (nested.html) html = html || nested.html;
      }
    }
  }

  return { text, html };
}

/**
 * List messages with summary metadata from Gmail API
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 20
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString()
  });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Gmail API error: ${res.statusText}`);
  }

  const data = await res.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch summary metadata in parallel for top messages (max 15 to avoid rate limits)
  const summaries = await Promise.all(
    rawList.slice(0, 15).map(async item => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        if (!detailRes.ok) return null;
        const msg = await detailRes.json();
        const headers: GmailHeader[] = msg.payload?.headers || [];
        const isUnread = (msg.labelIds || []).includes('UNREAD');

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: msg.snippet || '',
          from: getHeader(headers, 'From'),
          to: getHeader(headers, 'To'),
          subject: getHeader(headers, 'Subject') || '(No Subject)',
          date: getHeader(headers, 'Date'),
          unread: isUnread,
          labelIds: msg.labelIds || []
        } as GmailMessageSummary;
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s): s is GmailMessageSummary => s !== null);
}

/**
 * Fetch complete message details including body
 */
export async function getGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch message: ${res.statusText}`);
  }

  const msg = await res.json();
  const headers: GmailHeader[] = msg.payload?.headers || [];
  const { text, html } = extractBody(msg.payload);

  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet || '',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    date: getHeader(headers, 'Date'),
    unread: (msg.labelIds || []).includes('UNREAD'),
    labelIds: msg.labelIds || [],
    bodyText: text || msg.snippet || '',
    bodyHtml: html
  };
}

/**
 * Send an email through Gmail API
 */
export async function sendGmailMessage(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
  }
): Promise<{ id: string; threadId: string }> {
  // UTF-8 encoded subject
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;

  const emailLines = [
    `To: ${params.to}`,
    ...(params.cc ? [`Cc: ${params.cc}`] : []),
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.body
  ];

  const rawMessage = emailLines.join('\r\n');
  const encodedEmail = base64UrlEncode(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to send email: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Move message to trash (destructive operation with user confirmation)
 */
export async function trashGmailMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to trash email: ${res.statusText}`);
  }
}
