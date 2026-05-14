import { supportedLanguages, SupportedLanguage } from '../utils/language';

type Props = { value: SupportedLanguage; onChange: (lang: SupportedLanguage) => void };

export function LanguageSwitcher({ value, onChange }: Props) {
  return (
    <label className="lang-switcher" title="Choose language / Vælg sprog / Välj språk / Velg språk">
      <span className="visually-hidden">Choose language</span>
      <span aria-hidden="true" className="lang-switcher__icon">🌐</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        aria-label="Choose language"
      >
        {supportedLanguages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.code.toUpperCase()} · {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
