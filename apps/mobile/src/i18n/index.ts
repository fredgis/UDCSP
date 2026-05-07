import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const languages = ['da', 'sv', 'nb', 'nn', 'se', 'en', 'de', 'fr', 'pl', 'ar', 'uk', 'fi'] as const;

export async function loadWebCatalogue(lang: (typeof languages)[number]) {
  const catalogue = await import(`../../../web/i18n/messages/${lang}.json`);
  return catalogue.default ?? catalogue;
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: 'en',
  fallbackLng: 'en',
  resources: {},
});
export default i18n;
