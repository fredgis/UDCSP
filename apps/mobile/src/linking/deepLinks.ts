/**
 * UDCSP mobile — Deep / universal links
 *
 * The app declares a URL scheme (`udcsp://`) AND universal/app-links
 * (`https://citizens.udcsp.eu/...`) so that:
 *   - the web channel can hand off to the mobile app on the citizen's phone
 *     ("open in app" link from the email confirmation);
 *   - SMS callbacks from `notify-citizen` Logic App can deep-link into the
 *     correct case (`udcsp://case/<caseId>`);
 *   - push-notification taps land on the right screen.
 *
 * Sovereignty / privacy:
 *   - The deep-link payload only carries pseudonymous identifiers; the
 *     national ID never appears in a URL.
 *   - Universal-link domain verification files live under the per-country
 *     web-channel CDN (`/.well-known/apple-app-site-association` and
 *     `/.well-known/assetlinks.json`).
 */
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

export type AppRoute =
  | { name: 'Home' }
  | { name: 'CaseDetail'; params: { caseId: string } }
  | { name: 'ApplyResidency'; params: { country: 'dk' | 'se' | 'no' } }
  | { name: 'AccessibilitySettings' }
  | { name: 'Login'; params?: { returnTo?: string } };

export const linkingConfig = {
  prefixes: [
    Linking.createURL('/'),
    'udcsp://',
    'https://citizens.udcsp.eu',
    'https://citizens.udcsp.dk',
    'https://citizens.udcsp.se',
    'https://citizens.udcsp.no',
  ],
  config: {
    screens: {
      Home: '',
      Login: 'login',
      ApplyResidency: 'apply/:country',
      MyCases: 'cases',
      CaseDetail: 'case/:caseId',
      AccessibilitySettings: 'settings/accessibility',
    },
  },
};

/**
 * React hook: wires inbound deep links to navigation. Mount once near
 * the root navigator.
 */
export function useDeepLinkRouter(): void {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      const path = parsed.path ?? '';

      if (path.startsWith('case/')) {
        const caseId = path.split('/')[1];
        if (caseId) navigation.navigate('CaseDetail', { caseId });
      } else if (path.startsWith('apply/')) {
        const country = path.split('/')[1];
        if (country === 'dk' || country === 'se' || country === 'no') {
          navigation.navigate('ApplyResidency', { country });
        }
      } else if (path === 'settings/accessibility') {
        navigation.navigate('AccessibilitySettings');
      }
    });
    return () => sub.remove();
  }, [navigation]);
}
