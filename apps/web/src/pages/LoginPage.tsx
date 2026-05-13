import { useMsal } from '@azure/msal-react';
import { useState } from 'react';
import { authorityForCountry, countries, Country, getCountry, loginRequest, setCountry } from '../auth/msalConfig';

export function LoginPage() {
  const { instance } = useMsal();
  const [selected, setSelected] = useState<Country>(getCountry());

  const choose = (c: Country) => {
    setSelected(c);
    setCountry(c);
  };

  const start = (mode: 'signin' | 'signup') => {
    setCountry(selected);
    void instance.loginRedirect({
      ...loginRequest,
      authority: authorityForCountry(selected),
      prompt: mode === 'signup' ? 'create' : 'select_account',
      extraQueryParameters: mode === 'signup' ? { option: 'signup' } : {},
    });
  };

  return (
    <section aria-labelledby="signin-title" style={{ maxWidth: '46rem' }}>
      <h1 id="signin-title">Sign in to UDCSP</h1>
      <p>Choose the country whose services you need. Your account is created on the matching national identity tenant — your data stays in that country.</p>

      <fieldset style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', background: 'var(--color-surface)', marginTop: 'var(--space-4)' }}>
        <legend style={{ padding: '0 .5rem', fontWeight: 600, color: 'var(--color-primary-strong)' }}>1. Choose your country</legend>
        <div role="radiogroup" aria-label="Country" style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 'var(--space-2)' }}>
          {countries.map((c) => {
            const isSelected = selected === c.code;
            return (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => choose(c.code)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.35rem',
                  padding: 'var(--space-3) var(--space-4)',
                  background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isSelected ? '#fff' : 'var(--color-fg)',
                  border: `2px solid ${isSelected ? 'var(--color-primary-strong)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }} aria-hidden="true">{c.flag}</span>
                <strong style={{ fontSize: '1.05rem' }}>{c.label}</strong>
                <span style={{ fontSize: '.85rem', opacity: .85 }}>{c.tenantDomain}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', background: 'var(--color-surface)', marginTop: 'var(--space-4)' }}>
        <legend style={{ padding: '0 .5rem', fontWeight: 600, color: 'var(--color-primary-strong)' }}>2. Sign in or register</legend>
        <p style={{ color: 'var(--color-fg-soft)', marginTop: 0 }}>
          You will be redirected to <strong>udcsp{selected}.ciamlogin.com</strong>. New residents can register; existing users sign in with email + password (or eID once federated).
        </p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => start('signin')}>Sign in</button>
          <button type="button" className="button--ghost" onClick={() => start('signup')}>Create an account</button>
        </div>
      </fieldset>
    </section>
  );
}
