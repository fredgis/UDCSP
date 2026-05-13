// Tiny consent helper used everywhere a feature is gated by user consent.
// Mirrors the keys defined in ConsentManagementPage.tsx so we don't import
// the page module from non-page consumers.

export type ConsentKey =
  | 'crossBorder'
  | 'notifications'
  | 'aiAssistant'
  | 'dataExport'
  | 'analytics'
  | 'platformAudit';

const STORAGE_KEY = 'udcsp.consents.v1';

const DEFAULTS: Record<ConsentKey, boolean> = {
  crossBorder: false,
  notifications: true,
  aiAssistant: true,
  dataExport: false,
  analytics: true,
  platformAudit: true,
};

export function getConsents(): Record<ConsentKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Record<ConsentKey, boolean>) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function isAllowed(key: ConsentKey): boolean {
  return Boolean(getConsents()[key]);
}

// Subscribe to consent changes — fires when ConsentManagementPage saves.
export function onConsentChange(handler: () => void): () => void {
  function wrap(e: StorageEvent) {
    if (e.key === STORAGE_KEY) handler();
  }
  window.addEventListener('storage', wrap);
  // Same-tab updates: ConsentManagementPage dispatches this manually.
  window.addEventListener('udcsp:consent-changed', handler as EventListener);
  return () => {
    window.removeEventListener('storage', wrap);
    window.removeEventListener('udcsp:consent-changed', handler as EventListener);
  };
}

export function notifyConsentChanged() {
  window.dispatchEvent(new CustomEvent('udcsp:consent-changed'));
}
