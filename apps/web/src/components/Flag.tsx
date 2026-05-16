// Cross-platform country flag. iOS / macOS / Android / ChromeOS render the
// Regional-Indicator emoji pairs (🇩🇰 etc.) as actual flag glyphs natively.
// Windows + Chrome/Edge fall back to "DK" / "SE" / "NO" letterforms because
// Segoe UI Emoji ships no flag glyphs. To get pixel-identical flags on every
// browser we render the SVG sprites from the `flag-icons` package, which is
// the de-facto industry standard for this exact problem.
//
// Usage: <Flag countryCode="dk" /> or <Flag countryCode="DK" />.
//
// The wrapper preserves the screen-reader-friendly emoji as visually-hidden
// text so assistive tech still announces "Danish flag" without depending on
// what the OS happens to render.

import 'flag-icons/css/flag-icons.min.css';

const EMOJI_BY_CODE: Record<string, string> = {
  dk: '🇩🇰',
  se: '🇸🇪',
  no: '🇳🇴',
  fr: '🇫🇷',
  de: '🇩🇪',
  gb: '🇬🇧',
  pl: '🇵🇱',
  ua: '🇺🇦',
  fi: '🇫🇮',
};

export function Flag({
  countryCode,
  className,
  ariaLabel,
}: {
  countryCode: string;
  className?: string;
  ariaLabel?: string;
}) {
  const code = countryCode.toLowerCase();
  const emoji = EMOJI_BY_CODE[code] ?? '';
  const label = ariaLabel ?? `${code.toUpperCase()} flag`;
  return (
    <span
      className={`fi fi-${code}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{emoji}</span>
    </span>
  );
}
