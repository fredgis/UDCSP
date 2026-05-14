import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export type Country = 'dk' | 'se' | 'no';
export const countries: { code: Country; label: string; flag: string; tenantDomain: string; locale: string }[] = [
  { code: 'dk', label: 'Danmark',  flag: '🇩🇰', tenantDomain: 'udcspdk.onmicrosoft.com', locale: 'da' },
  { code: 'se', label: 'Sverige',  flag: '🇸🇪', tenantDomain: 'udcspse.onmicrosoft.com', locale: 'sv' },
  { code: 'no', label: 'Norge',    flag: '🇳🇴', tenantDomain: 'udcspno.onmicrosoft.com', locale: 'nb' },
];
const COUNTRY_KEY = 'udcsp.country';
const PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

export const getCountry = (): Country => ((localStorage.getItem(COUNTRY_KEY) as Country) || 'dk');
export const setCountry = (c: Country) => localStorage.setItem(COUNTRY_KEY, c);
export const authorityForCountry = (country: Country) =>
  `https://udcsp${country}.ciamlogin.com/udcsp${country}.onmicrosoft.com`;

export const clientIdForCountry = (country: Country): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const perCountry = env[`VITE_EXTERNAL_ID_CLIENT_ID_${country.toUpperCase()}`];
  const generic = env.VITE_EXTERNAL_ID_CLIENT_ID;
  return perCountry || generic || PLACEHOLDER;
};
export const isCountryConfigured = (country: Country): boolean =>
  clientIdForCountry(country) !== PLACEHOLDER;

export const apimBaseUrlForCountry = (country: Country): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    env[`VITE_APIM_BASE_URL_${country.toUpperCase()}`] ||
    env.VITE_APIM_BASE_URL ||
    ''
  );
};

export const apiScopeForCountry = (country: Country): string => {
  const cid = clientIdForCountry(country);
  return `api://${cid}/access_as_user`;
};

const knownAll = countries.map((c) => `udcsp${c.code}.ciamlogin.com`);

export function createMsalConfig(country: Country = getCountry()): Configuration {
  return {
    auth: {
      clientId: clientIdForCountry(country),
      authority: authorityForCountry(country),
      knownAuthorities: knownAll,
      redirectUri: window.location.origin + '/',
      postLogoutRedirectUri: window.location.origin + '/',
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  };
}
export const msalInstance = new PublicClientApplication(createMsalConfig());
export const loginRequest = { scopes: [import.meta.env.VITE_APIM_SCOPE || 'openid', 'profile'] };
