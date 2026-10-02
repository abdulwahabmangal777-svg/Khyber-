/**
 * Google Maps Platform Configuration & Validation Helper
 * Validates API key formatting and prevents invalid or placeholder keys from breaking the runtime.
 */

let cachedDynamicKey: string | null = null;
let dynamicKeyPromise: Promise<string> | null = null;

/**
 * Validates whether a given key has the authentic Google Cloud / Google Maps API Key format.
 * All Google API keys start with the prefix "AIza" and consist of 30 to 60 standard characters.
 */
export function isValidGoogleMapsApiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return /^AIza[0-9A-Za-z_-]{30,60}$/.test(trimmed);
}

/**
 * Retrieves the configured Google Maps API key synchronously from environment or cache.
 */
export function getGoogleMapsApiKey(): string {
  if (cachedDynamicKey && isValidGoogleMapsApiKey(cachedDynamicKey)) {
    return cachedDynamicKey;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) {
    const key = String((import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY).trim();
    if (isValidGoogleMapsApiKey(key)) return key;
  }
  if (typeof window !== 'undefined' && (window as any).__GOOGLE_MAPS_API_KEY__) {
    return (window as any).__GOOGLE_MAPS_API_KEY__;
  }
  return 'AIzaSyAaQD83aR4m4jgb3lirlkDeys4A1Q4V_ZY';
}

/**
 * Sets the active Google Maps API key at runtime.
 */
export function setGoogleMapsApiKey(key: string): void {
  if (isValidGoogleMapsApiKey(key)) {
    cachedDynamicKey = key.trim();
    if (typeof window !== 'undefined') {
      (window as any).__GOOGLE_MAPS_API_KEY__ = cachedDynamicKey;
    }
  }
}

/**
 * Asynchronously loads the provisioned Google Maps API key from the server if not present in env.
 */
export async function loadGoogleMapsApiKey(): Promise<string> {
  const currentKey = getGoogleMapsApiKey();
  if (isValidGoogleMapsApiKey(currentKey)) {
    return currentKey;
  }

  if (dynamicKeyPromise) {
    return dynamicKeyPromise;
  }

  dynamicKeyPromise = (async () => {
    try {
      const res = await fetch('/api/config/maps');
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey && isValidGoogleMapsApiKey(data.apiKey)) {
          setGoogleMapsApiKey(data.apiKey);
          return data.apiKey;
        }
      }
    } catch (e) {
      console.warn('[Google Maps Platform] Failed to fetch key from /api/config/maps:', e);
    }
    return '';
  })();

  return dynamicKeyPromise;
}
