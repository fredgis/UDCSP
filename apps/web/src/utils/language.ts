export const supportedLanguages = [
  { code: 'da', name: 'Dansk', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', dir: 'ltr' },
  { code: 'nb', name: 'Norsk bokmål', dir: 'ltr' },
  { code: 'nn', name: 'Norsk nynorsk', dir: 'ltr' },
  { code: 'se', name: 'Davvisámegiella', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'pl', name: 'Polski', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'uk', name: 'Українська', dir: 'ltr' },
  { code: 'fi', name: 'Suomi', dir: 'ltr' },
] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number]['code'];
const key = 'udcsp.language';
export function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(key);
  const browser = navigator.language?.slice(0, 2);
  return (supportedLanguages.find(l => l.code === stored)?.code ?? supportedLanguages.find(l => l.code === browser)?.code ?? 'en') as SupportedLanguage;
}
export function persistLanguage(lang: SupportedLanguage) {
  localStorage.setItem(key, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = supportedLanguages.find(l => l.code === lang)?.dir ?? 'ltr';
}
export async function loadMessages(lang: SupportedLanguage): Promise<Record<string, string>> {
  const response = await fetch(`/i18n/messages/${lang}.json`, { headers: { 'cache-control': 'no-cache' } });
  return response.ok ? response.json() : {};
}
