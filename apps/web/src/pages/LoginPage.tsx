import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/msalConfig';
export function LoginPage() { const { instance } = useMsal(); return <section><h1>Sign in</h1><p>Use your national eID through the UDCSP External ID country tenant.</p><button onClick={() => void instance.loginRedirect(loginRequest)}>Sign in securely</button></section>; }
