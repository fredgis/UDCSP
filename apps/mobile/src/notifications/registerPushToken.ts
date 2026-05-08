/**
 * UDCSP mobile — Push notification token registration
 *
 * Registers the device with Expo Push (https://docs.expo.dev/push-notifications/)
 * which fronts FCM (Android) and APNs (iOS). The push token is sent to the
 * UDCSP back-end and stored against the citizen's pseudonymous PID inside
 * the country sovereignty zone — Apple/Google never see the citizen's
 * national identifier; the back-end never sees the device's APNs/FCM token
 * unencrypted at rest (Key Vault wrapped).
 *
 * Compliance:
 *   - GDPR Art. 6(1)(a) — push notifications require explicit citizen
 *     consent, captured on first launch (not implicit). The function below
 *     refuses to ask the OS until the in-app consent flag is set.
 *   - GDPR Art. 13(2)(a) — retention disclosed to citizen as "until you
 *     uninstall the app or revoke the consent in Settings".
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

export type RegistrationResult =
  | { ok: true; expoToken: string }
  | { ok: false; reason: 'no-device' | 'denied' | 'no-consent' | 'expo-error' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(opts: {
  citizenConsentGiven: boolean;
  language: 'da' | 'sv' | 'no' | 'en';
}): Promise<RegistrationResult> {
  if (!Device.isDevice) return { ok: false, reason: 'no-device' };
  if (!opts.citizenConsentGiven) return { ok: false, reason: 'no-consent' };

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('case-updates', {
      name: 'Case updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await apiClient.post('/notifications/register', {
      provider: 'expo',
      token,
      language: opts.language,
      platform: Platform.OS,
    });
    return { ok: true, expoToken: token };
  } catch {
    return { ok: false, reason: 'expo-error' };
  }
}
