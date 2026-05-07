type Country = 'dk' | 'se' | 'no';
export const authorityForCountry = (country: Country) => `https://udcsp${country}.b2clogin.com/udcsp${country}.onmicrosoft.com/B2C_1A_SignUpOrSignIn`;
export async function signIn(country: Country = 'dk') { return { authority: authorityForCountry(country), note: 'Replace stub with msal-react-native interactive OIDC flow when tenant app registrations exist.' }; }
