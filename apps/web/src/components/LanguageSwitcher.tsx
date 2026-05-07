import { supportedLanguages, SupportedLanguage } from '../utils/language';
type Props = { value: SupportedLanguage; onChange: (lang: SupportedLanguage) => void };
export function LanguageSwitcher({ value, onChange }: Props) {
  return <label className="field">Language<select value={value} onChange={e => onChange(e.target.value as SupportedLanguage)} aria-label="Choose language">{supportedLanguages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label>;
}
