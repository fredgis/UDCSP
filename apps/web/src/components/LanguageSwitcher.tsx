import { supportedLanguages, SupportedLanguage } from '../utils/language';

type Props = { value: SupportedLanguage; onChange: (lang: SupportedLanguage) => void };

// Compact dropdown for the header. We surface the 6 languages most relevant
// to UDCSP — three Nordic UI locales (DA/SV/NB), the two largest minority
// languages (PL, AR) and English fallback — to keep the picker scannable.
const HEADER_LANGS: SupportedLanguage[] = ['en', 'da', 'sv', 'nb', 'pl', 'ar'];

export function LanguageSwitcher({ value, onChange }: Props) {
  const opts = supportedLanguages.filter((l) => HEADER_LANGS.includes(l.code as SupportedLanguage));
  return (
    <label className="lang-switcher" title="Choose language / Vælg sprog / Välj språk / Velg språk">
      <span className="visually-hidden">Choose language</span>
      <span aria-hidden="true" className="lang-switcher__icon">🌐</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        aria-label="Choose language"
      >
        {opts.map((l) => (
          <option key={l.code} value={l.code}>
            {l.code.toUpperCase()} · {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
