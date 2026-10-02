/**
 * Centralized safe fetch & auth header utility
 */

export function getAuthHeaders(token?: string | null, additionalHeaders: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { ...additionalHeaders };

  if (token && typeof token === 'string' && token.trim() !== '' && token !== 'null' && token !== 'undefined') {
    // Ensure token is clean ASCII
    const cleanToken = token.trim().replace(/[^\x20-\x7E]/g, '');
    if (cleanToken) {
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }
  }

  return headers;
}

export async function safeFetch(url: string, options: RequestInit = {}, token?: string | null): Promise<Response> {
  const customHeaders = (options.headers as Record<string, string>) || {};
  const headers = getAuthHeaders(token, customHeaders);
  
  return fetch(url, {
    ...options,
    headers
  });
}
