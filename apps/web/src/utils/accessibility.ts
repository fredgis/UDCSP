export type AccessibilityPreferences = { fontScale: number; highContrast: boolean; reduceMotion: boolean; dyslexicFont: boolean };
const key = 'udcsp.accessibility';
export const defaultAccessibility: AccessibilityPreferences = { fontScale: 1, highContrast: false, reduceMotion: false, dyslexicFont: false };
export function loadAccessibility(): AccessibilityPreferences {
  try { return { ...defaultAccessibility, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return defaultAccessibility; }
}
export function applyAccessibility(prefs: AccessibilityPreferences) {
  localStorage.setItem(key, JSON.stringify(prefs));
  document.documentElement.style.setProperty('--user-font-scale', String(prefs.fontScale));
  document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
  document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
  document.documentElement.classList.toggle('dyslexic-font', prefs.dyslexicFont);
}
