/**
 * UDCSP mobile — Biometric gate
 *
 * Implements the second factor for sensitive screens (CaseDetail, Apply,
 * AccessibilitySettings/data-export). Backed by `expo-local-authentication`,
 * which under the hood uses Apple LAContext (Face ID / Touch ID) on iOS and
 * AndroidX BiometricPrompt on Android. The biometric template **never
 * leaves the device** (Apple Secure Enclave / Android StrongBox).
 *
 * Compliance / case-study anchors:
 *   - eIDAS High assurance level: a step-up authentication on sensitive
 *     actions complements MitID/BankID/Vipps device-bound assertion.
 *   - GDPR Art. 32(1)(b) — appropriate technical measure, on-device only.
 *   - WCAG 2.2 AA — fall-back to PIN on biometric unavailability.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricResult =
  | { ok: true; method: 'biometric' | 'devicePin' }
  | { ok: false; reason: 'unavailable' | 'cancelled' | 'lockout' | 'failed' };

const REASON_KEY = 'udcsp.biometric.lastReason';

/**
 * Returns true on success, false otherwise. Always non-blocking.
 *
 * @param reason  human-readable string surfaced inside the system prompt;
 *                must be localized by the caller (i18next key).
 */
export async function requireBiometricAuth(reason: string): Promise<BiometricResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return { ok: false, reason: 'unavailable' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use device PIN',
    requireConfirmation: true,
  });

  if (result.success) {
    await SecureStore.setItemAsync(REASON_KEY, `${reason}|${Date.now()}`);
    return { ok: true, method: 'biometric' };
  }

  if (result.error === 'user_cancel') return { ok: false, reason: 'cancelled' };
  if (result.error === 'lockout' || result.error === 'lockout_permanent') {
    return { ok: false, reason: 'lockout' };
  }
  return { ok: false, reason: 'failed' };
}

/** Reads the timestamp of the last successful gate, for short-lived re-use windows. */
export async function getLastBiometricTimestamp(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(REASON_KEY);
  if (!raw) return null;
  const ts = Number(raw.split('|').pop());
  return Number.isFinite(ts) ? ts : null;
}
