import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export type Country = 'dk' | 'se' | 'no';
export const countries: { code: Country; label: string; flag: string; tenantDomain: string; locale: string }[] = [
  { code: 'dk', label: 'Danmark',  flag: '🇩🇰', tenantDomain: 'udcspdk.onmicrosoft.com', locale: 'da' },
  { code: 'se', label: 'Sverige',  flag: '🇸🇪', tenantDomain: 'udcspse.onmicrosoft.com', locale: 'sv' },
  { code: 'no', label: 'Norge',    flag: '🇳🇴', tenantDomain: 'udcspno.onmicrosoft.com', locale: 'nb' },
];
const userFlow = 'SignUpSignIn';
const COUNTRY_KEY = 'udcsp.country';
export const getCountry = (): Country => ((localStorage.getItem(COUNTRY_KEY) as Country) || 'dk');
export const setCountry = (c: Country) => localStorage.setItem(COUNTRY_KEY, c);
export const authorityForCountry = (country: Country) =>
  `https://udcsp${country}.ciamlogin.com/udcsp${country}.onmicrosoft.com/${userFlow}`;
const knownAll = countries.map((c) => `udcsp${c.code}.ciamlogin.com`);

export function createMsalConfig(country: Country = getCountry()): Configuration {
  return {
    auth: {
      clientId: import.meta.env.VITE_EXTERNAL_ID_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
      authority: authorityForCountry(country),
      knownAuthorities: knownAll,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: `${window.location.origin}/logout-callback`,
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  };
}
export const msalInstance = new PublicClientApplication(createMsalConfig());
export const loginRequest = { scopes: [import.meta.env.VITE_APIM_SCOPE || 'openid', 'profile'] };
