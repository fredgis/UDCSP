import { useMsal } from '@azure/msal-react';
import { useState } from 'react';
import { authorityForCountry, countries, Country, getCountry, loginRequest, setCountry } from '../auth/msalConfig';

const PLACEHOLDER_CLIENT_ID = '00000000-0000-0000-0000-000000000000';

export function LoginPage() {
  const { instance } = useMsal();
  const [selected, setSelected] = useState<Country>(getCountry());
  const [error, setError] = useState<string | null>(null);
  const clientId = (import.meta.env.VITE_EXTERNAL_ID_CLIENT_ID as string) || PLACEHOLDER_CLIENT_ID;
  const configured = clientId !== PLACEHOLDER_CLIENT_ID;

  const choose = (c: Country) => { setSelected(c); setCountry(c); setError(null); };

  const start = (mode: 'signin' | 'signup') => {
    if (!configured) {
      setError('No app registration is configured for this country tenant yet. Ask your DevOps to register a SPA app on udcsp' + selected + '.onmicrosoft.com and set VITE_EXTERNAL_ID_CLIENT_ID in apps/web/.env.');
      return;
    }
    setCountry(selected);
    instance.loginRedirect({
      ...loginRequest,
      authority: authorityForCountry(selected),
      ...(mode === 'signup' ? { prompt: 'create' as const } : {}),
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Sign-${mode === 'signup' ? 'up' : 'in'} failed: ${msg}`);
    });
  };

  return (
    <section aria-labelledby="signin-title" style={{ maxWidth: '52rem' }}>
      <h1 id="signin-title">Sign in to UDCSP</h1>
      <p>Choose the country whose services you need. Your account is created on the matching national identity tenant — your data stays in that country.</p>

      <fieldset className="login-fieldset">
        <legend>1. Choose your country</legend>
        <div role="radiogroup" aria-label="Country" className="country-grid">
          {countries.map((c) => {
            const isSelected = selected === c.code;
            return (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => choose(c.code)}
                className={`country-card${isSelected ? ' country-card--selected' : ''}`}
              >
                <span className="country-card__flag" aria-hidden="true">{c.flag}</span>
                <strong className="country-card__name">{c.label}</strong>
                <span className="country-card__tenant">{c.tenantDomain}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="login-fieldset">
        <legend>2. Sign in or register</legend>
        <p style={{ color: 'var(--color-fg-soft)', marginTop: 0 }}>
          You will be redirected to <strong>udcsp{selected}.ciamlogin.com</strong> · user flow <code>SignUpSignIn</code>.
          {' '}New residents register; returning users sign in.
        </p>
        <div className="login-actions">
          <button type="button" className="button-primary" onClick={() => start('signin')}>Sign in</button>
          <button type="button" className="button-secondary" onClick={() => start('signup')}>Create an account</button>
        </div>
        {!configured && (
          <p role="alert" className="login-warning">
            ⚠ App registration is not set for this build (<code>VITE_EXTERNAL_ID_CLIENT_ID</code> is the placeholder).
            The redirect will fail with <em>AADSTS700016</em> until DevOps registers a SPA app on the country tenant and rebuilds the portal.
          </p>
        )}
        {error && <p role="alert" className="login-error">{error}</p>}
      </fieldset>

      <details className="login-help">
        <summary>How does this work?</summary>
        <ol>
          <li>Each country runs its own <strong>Entra External ID (CIAM)</strong> tenant — DK, SE, NO. Citizen data stays in that country.</li>
          <li>The portal is a single-page app. When you choose a country, MSAL points at that tenant's <code>SignUpSignIn</code> user flow and redirects you there.</li>
          <li>The hosted page handles password reset, MFA, and (when federated) MitID / BankID / BankID Norge.</li>
          <li>After redirect back, you land on the page you came from with a session valid for that country tenant only.</li>
        </ol>
      </details>
    </section>
  );
}
