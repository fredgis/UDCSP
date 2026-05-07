import { useState } from 'react';
import { AccessibilityPreferences, applyAccessibility, loadAccessibility } from '../utils/accessibility';
export function AccessibilityMenu() {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(loadAccessibility());
  const update = (next: AccessibilityPreferences) => { setPrefs(next); applyAccessibility(next); };
  return <section aria-labelledby="accessibility-menu"><h2 id="accessibility-menu">Accessibility</h2><label>Text size <input type="range" min="1" max="1.4" step="0.1" value={prefs.fontScale} onChange={e => update({ ...prefs, fontScale: Number(e.target.value) })} /></label><label><input type="checkbox" checked={prefs.highContrast} onChange={e => update({ ...prefs, highContrast: e.target.checked })} /> High contrast</label><label><input type="checkbox" checked={prefs.reduceMotion} onChange={e => update({ ...prefs, reduceMotion: e.target.checked })} /> Reduce motion</label><label><input type="checkbox" checked={prefs.dyslexicFont} onChange={e => update({ ...prefs, dyslexicFont: e.target.checked })} /> Dyslexic-friendly font</label></section>;
}
