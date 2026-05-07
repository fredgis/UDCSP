import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export type Country = 'dk' | 'se' | 'no';
const policy = 'B2C_1A_SignUpOrSignIn';
export const getCountry = (): Country => ((localStorage.getItem('udcsp.country') as Country) || 'dk');
export const authorityForCountry = (country: Country) =>
  `https://udcsp${country}.b2clogin.com/udcsp${country}.onmicrosoft.com/${policy}`;

export function createMsalConfig(country: Country = getCountry()): Configuration {
  return {
    auth: {
      clientId: import.meta.env.VITE_B2C_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
      authority: authorityForCountry(country),
      knownAuthorities: [`udcsp${country}.b2clogin.com`],
      redirectUri: window.location.origin,
      postLogoutRedirectUri: `${window.location.origin}/logout-callback`,
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  };
}
export const msalInstance = new PublicClientApplication(createMsalConfig());
export const loginRequest = { scopes: [import.meta.env.VITE_APIM_SCOPE || 'openid', 'profile'] };
