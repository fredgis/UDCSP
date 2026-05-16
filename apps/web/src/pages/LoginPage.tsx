import { useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { FormattedMessage } from 'react-intl';
import { authorityForCountry, countries, Country, createMsalConfig, getCountry, isCountryConfigured, loginRequest, setCountry } from '../auth/msalConfig';
import { Flag } from '../components/Flag';

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
      <h1 id="signin-title"><FormattedMessage id="login.title" defaultMessage="Sign in to UDCSP" /></h1>
      <p><FormattedMessage id="login.lede" defaultMessage="Choose the country whose services you need. Your account is created on the matching national identity tenant — your data stays in that country." /></p>

      <fieldset className="login-fieldset">
        <legend><FormattedMessage id="login.legend.country" defaultMessage="1. Choose your country" /></legend>
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
                <span className="country-card__flag" aria-hidden="true"><Flag countryCode={c.code} /></span>
                <strong className="country-card__name">{c.label} {ok ? '✓' : '⚠'}</strong>
                <span className="country-card__tenant">{c.tenantDomain}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="login-fieldset">
        <legend><FormattedMessage id="login.legend.method" defaultMessage="2. Choose how to sign in" /></legend>
        <p style={{ color: 'var(--color-fg-soft)', marginTop: 0, fontSize: '.92rem' }}>
          <FormattedMessage id="login.method.help" defaultMessage="In production, residents authenticate either with email and password (returning users) or with their national eID. The eID button is shown for clarity but disabled in this prototype — the real wiring goes through a certified OIDC broker federated to External ID." />
        </p>
        <div className="auth-method-grid" role="group" aria-label="Authentication method (preview)">
          <button type="button" className="auth-method auth-method--active" disabled aria-pressed="true" title="Active in this prototype">
            <span className="auth-method__icon" aria-hidden="true">📧</span>
            <span className="auth-method__body">
              <strong>Email &amp; password</strong>
              <span className="auth-method__hint">Active — prototype default</span>
            </span>
          </button>
          <button type="button" className="auth-method" disabled title="Disabled in prototype — Criipto OIDC broker required">
            <span className="auth-method__icon" aria-hidden="true">🆔</span>
            <span className="auth-method__body">
              <strong>{selected === 'dk' ? 'MitID' : selected === 'se' ? 'BankID' : 'BankID Norge'}</strong>
              <span className="auth-method__hint">Production · via OIDC broker</span>
            </span>
          </button>
        </div>
      </fieldset>

      <fieldset className="login-fieldset">
        <legend><FormattedMessage id="login.legend.action" defaultMessage="3. Sign in or register" /></legend>
        <p style={{ color: 'var(--color-fg-soft)', marginTop: 0 }}>
          <FormattedMessage id="login.action.help" defaultMessage="You will be redirected to your national identity tenant. New residents register; returning users sign in." />
        </p>
        <div className="login-actions">
          <button type="button" className="button-primary" onClick={() => void start('signin')} disabled={!configured}><FormattedMessage id="login.signin" defaultMessage="Sign in" /></button>
          <button type="button" className="button-secondary" onClick={() => void start('signup')} disabled={!configured}><FormattedMessage id="login.create" defaultMessage="Create an account" /></button>
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
        <summary><FormattedMessage id="login.help.summary" defaultMessage="How does this work?" /></summary>
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
