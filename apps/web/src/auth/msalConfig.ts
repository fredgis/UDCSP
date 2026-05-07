import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export type Country = 'dk' | 'se' | 'no';
const userFlow = 'SignUpSignIn';
export const getCountry = (): Country => ((localStorage.getItem('udcsp.country') as Country) || 'dk');
export const authorityForCountry = (country: Country) =>
  `https://udcsp${country}.ciamlogin.com/udcsp${country}.onmicrosoft.com/${userFlow}`;

export function createMsalConfig(country: Country = getCountry()): Configuration {
  return {
    auth: {
      clientId: import.meta.env.VITE_EXTERNAL_ID_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
      authority: authorityForCountry(country),
      knownAuthorities: [`udcsp${country}.ciamlogin.com`],
      redirectUri: window.location.origin,
      postLogoutRedirectUri: `${window.location.origin}/logout-callback`,
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  };
}
export const msalInstance = new PublicClientApplication(createMsalConfig());
export const loginRequest = { scopes: [import.meta.env.VITE_APIM_SCOPE || 'openid', 'profile'] };
