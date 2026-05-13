import { useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { authorityForCountry, countries, Country, createMsalConfig, getCountry, isCountryConfigured, loginRequest, setCountry } from '../auth/msalConfig';

export function LoginPage() {
  const [selected, setSelected] = useState<Country>(getCountry());
  const [error, setError] = useState<string | null>(null);
  const configured = isCountryConfigured(selected);

  const choose = (c: Country) => { setSelected(c); setCountry(c); setError(null); };

  const start = async (mode: 'signin' | 'signup') => {
    if (!configured) {
      setError(`No app registration is configured for ${selected.toUpperCase()}. Set VITE_EXTERNAL_ID_CLIENT_ID_${selected.toUpperCase()} (or VITE_EXTERNAL_ID_CLIENT_ID) in apps/web/.env then rebuild + redeploy the portal.`);
      return;
    }
    setCountry(selected);
    // Always build a fresh MSAL instance for the chosen country: each CIAM tenant
    // has its own clientId, so a single app-wide msalInstance can't target all 3.
    // The redirect causes a full page reload — main.tsx then re-creates the
    // app-wide instance from localStorage country, which now matches.
    try {
      const pca = new PublicClientApplication(createMsalConfig(selected));
      await pca.initialize();
      await pca.loginRedirect({
        ...loginRequest,
        authority: authorityForCountry(selected),
        ...(mode === 'signup' ? { prompt: 'create' as const } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Sign-${mode === 'signup' ? 'up' : 'in'} failed: ${msg}`);
    }
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
            const ok = isCountryConfigured(c.code);
            return (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => choose(c.code)}
                className={`country-card${isSelected ? ' country-card--selected' : ''}${!ok ? ' country-card--unconfigured' : ''}`}
                title={ok ? `${c.label} ready` : `${c.label} — app registration not configured in this build`}
              >
                <span className="country-card__flag" aria-hidden="true">{c.flag}</span>
                <strong className="country-card__name">{c.label} {ok ? '✓' : '⚠'}</strong>
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
          <button type="button" className="button-primary" onClick={() => void start('signin')} disabled={!configured}>Sign in</button>
          <button type="button" className="button-secondary" onClick={() => void start('signup')} disabled={!configured}>Create an account</button>
        </div>
        {!configured && (
          <p role="alert" className="login-warning">
            ⚠ <strong>{selected.toUpperCase()}</strong> is not configured in this build — pick a country marked ✓, or follow{' '}
            <a href="https://github.com/fredgis/UDCSP/blob/main/docs/tech/installation.md#-post-configuration--external-id-app-registrations-dk--se--no">POST CONFIGURATION</a>{' '}
            to register the SPA app on <code>udcsp{selected}.onmicrosoft.com</code> and rebuild.
          </p>
        )}
        {error && <p role="alert" className="login-error">{error}</p>}
      </fieldset>

      <details className="login-help">
        <summary>How does this work?</summary>
        <ol>
          <li>Each country runs its own <strong>Entra External ID (CIAM)</strong> tenant — DK, SE, NO. Citizen data stays in that country.</li>
          <li>The portal is a single-page app. When you choose a country, MSAL is rebuilt with that tenant's <code>SignUpSignIn</code> user flow and matching SPA client ID, then redirects you there.</li>
          <li>The hosted page handles password reset, MFA, and (when federated) MitID / BankID / BankID Norge.</li>
          <li>After redirect back, you land authenticated for that country tenant only.</li>
        </ol>
      </details>
    </section>
  );
}
