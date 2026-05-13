import { useState } from 'react';
import { AccessibilityPreferences, applyAccessibility, defaultAccessibility, loadAccessibility } from '../utils/accessibility';

export function AccessibilityMenu() {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(loadAccessibility());
  const update = (next: AccessibilityPreferences) => { setPrefs(next); applyAccessibility(next); };
  const reset = () => update(defaultAccessibility);
  const pct = Math.round(prefs.fontScale * 100);

  return (
    <section className="a11y-menu" aria-labelledby="accessibility-menu">
      <header className="a11y-menu__head">
        <h2 id="accessibility-menu">Accessibility preferences</h2>
        <p>These settings are stored on this device only. Refresh the page to see them propagate everywhere.</p>
      </header>

      <div className="a11y-menu__grid">
        <div className="a11y-card">
          <div className="a11y-card__title">
            <span aria-hidden="true">🔠</span>
            <span>Text size</span>
            <span className="a11y-card__value">{pct}%</span>
          </div>
          <p className="a11y-card__hint">Drag to enlarge every text on the portal.</p>
          <div className="a11y-range">
            <button type="button" className="a11y-range__btn" aria-label="Decrease text size"
              onClick={() => update({ ...prefs, fontScale: Math.max(1, +(prefs.fontScale - 0.1).toFixed(2)) })}>A−</button>
            <input
              id="a11y-font-scale"
              type="range" min="1" max="1.6" step="0.1"
              value={prefs.fontScale}
              aria-valuetext={`${pct} percent`}
              onChange={(e) => update({ ...prefs, fontScale: Number(e.target.value) })}
            />
            <button type="button" className="a11y-range__btn" aria-label="Increase text size"
              onClick={() => update({ ...prefs, fontScale: Math.min(1.6, +(prefs.fontScale + 0.1).toFixed(2)) })}>A+</button>
          </div>
          <div className="a11y-range__ticks" aria-hidden="true"><span>100%</span><span>120%</span><span>140%</span><span>160%</span></div>
        </div>

        <label className={`a11y-card a11y-toggle${prefs.highContrast ? ' a11y-toggle--on' : ''}`}>
          <input type="checkbox" checked={prefs.highContrast}
            onChange={(e) => update({ ...prefs, highContrast: e.target.checked })} />
          <span className="a11y-card__title">
            <span aria-hidden="true">🌓</span>
            <span>High-contrast theme</span>
          </span>
          <span className="a11y-card__hint">Black background, yellow links, cyan focus ring — for low-vision users.</span>
        </label>

        <label className={`a11y-card a11y-toggle${prefs.reduceMotion ? ' a11y-toggle--on' : ''}`}>
          <input type="checkbox" checked={prefs.reduceMotion}
            onChange={(e) => update({ ...prefs, reduceMotion: e.target.checked })} />
          <span className="a11y-card__title">
            <span aria-hidden="true">🛑</span>
            <span>Reduce motion</span>
          </span>
          <span className="a11y-card__hint">Disable transitions and scroll animations — for vestibular sensitivity.</span>
        </label>

        <label className={`a11y-card a11y-toggle${prefs.dyslexicFont ? ' a11y-toggle--on' : ''}`}>
          <input type="checkbox" checked={prefs.dyslexicFont}
            onChange={(e) => update({ ...prefs, dyslexicFont: e.target.checked })} />
          <span className="a11y-card__title">
            <span aria-hidden="true">🔤</span>
            <span>Dyslexia-friendly font</span>
          </span>
          <span className="a11y-card__hint">Wider letter and word spacing, plain sans-serif typeface.</span>
        </label>
      </div>

      <footer className="a11y-menu__foot">
        <button type="button" className="button-secondary" onClick={reset}>Reset to defaults</button>
        <span className="a11y-menu__saved" role="status">Saved on this device</span>
      </footer>
    </section>
  );
}

