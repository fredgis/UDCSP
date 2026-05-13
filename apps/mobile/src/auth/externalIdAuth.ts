type Country = 'dk' | 'se' | 'no';
export const authorityForCountry = (country: Country) => `https://udcsp${country}.ciamlogin.com/udcsp${country}.onmicrosoft.com/SignUpSignIn`;
export async function signIn(country: Country = 'dk') { return { authority: authorityForCountry(country), note: 'Replace stub with expo-auth-session interactive OIDC flow against Microsoft Entra External ID when tenant app registrations exist.' }; }
