import { useEffect, useState } from 'react';
import { countries, Country, getCountry, setCountry } from '../auth/msalConfig';

/**
 * Compact country picker shown in the header. Switches the active country
 * (and therefore the APIM base + tenant + locale) for a fully anonymous
 * visitor. Once the citizen is signed in the active country is locked
 * to whatever tenant they authenticated against.
 */
export function CountryFlags({ disabled = false }: { disabled?: boolean }) {
  const [active, setActive] = useState<Country>(getCountry());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getCountry();
      if (next !== active) setActive(next);
    }, 1500);
    return () => window.clearInterval(id);
  }, [active]);

  function pick(c: Country) {
    if (disabled) return;
    setCountry(c);
    setActive(c);
    // Hard reload so MSAL re-initialises against the chosen tenant.
    if (window.location.pathname !== '/login') {
      window.location.href = window.location.pathname;
    }
  }

  return (
    <div
      className="country-flags"
      role="radiogroup"
      aria-label="Choose country"
      title={disabled ? 'Country is locked to your signed-in tenant' : 'Switch country (resets context)'}
    >
      {countries.map((c) => (
        <button
          key={c.code}
          type="button"
          role="radio"
          aria-checked={active === c.code}
          aria-label={c.label}
          className={`country-flags__btn${active === c.code ? ' country-flags__btn--active' : ''}`}
          disabled={disabled}
          onClick={() => pick(c.code)}
        >
          <span aria-hidden="true">{c.flag}</span>
        </button>
      ))}
    </div>
  );
}
