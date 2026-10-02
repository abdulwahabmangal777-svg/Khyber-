// Ensure window.fetch setter compatibility for sandboxed iframe environments
(function ensureFetchSetter() {
  if (typeof window === 'undefined') return;
  try {
    let currentFetch = window.fetch;
    const targets = [window, Object.getPrototypeOf(window), Window.prototype];
    for (const target of targets) {
      if (!target) continue;
      const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
      if (desc && (!desc.set || !desc.writable) && desc.configurable !== false) {
        Object.defineProperty(target, 'fetch', {
          get: () => currentFetch,
          set: (fn) => { currentFetch = fn; },
          configurable: true,
          enumerable: true
        });
      }
    }
  } catch {
    // Ignore
  }
})();

// Register early global listener and safe console tap for Google Maps Platform quota limits
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    origError.apply(console, args);
    const msg = args.map((a) => String(a)).join(' ');
    if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleWorkspaceProvider } from './context/GoogleWorkspaceContext';
import { AdsterraProvider } from './context/AdsterraContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <GoogleWorkspaceProvider>
          <AdsterraProvider>
            <App />
          </AdsterraProvider>
        </GoogleWorkspaceProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
