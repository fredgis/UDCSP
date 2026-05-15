/**
 * NordicMap — hand-tuned simplified outlines of Norway, Denmark and Sweden.
 *
 * The geometry is NOT cartographically accurate (we don't ship Natural Earth
 * GeoJSON to the SPA bundle); it's a stylised approximation that captures
 * the *iconic* silhouette of each country at a glance:
 *   - Norway: long narrow Atlantic-facing strip with the famous fjord
 *     coastline; widens northeast around Finnmark; tapers at the south tip.
 *   - Sweden: tall continental shape east of Norway, widening from Lapland
 *     to Skåne in the south.
 *   - Denmark: small landmass at the bottom — Jutland peninsula attached at
 *     the south, plus the Funen and Zealand islands separated by sea.
 *
 * Clicking a country (or hovering with a mouse / focusing with the keyboard)
 * is handled by the parent through `onSelect`/`selected`.
 */
import { useState } from 'react';

type CountryCode = 'no' | 'dk' | 'se';

type Props = {
  selected?: CountryCode | null;
  onSelect?: (code: CountryCode) => void;
};

const COUNTRY_LABEL: Record<CountryCode, string> = {
  no: 'Norway',
  dk: 'Denmark',
  se: 'Sweden',
};

export function NordicMap({ selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<CountryCode | null>(null);
  const active = hovered ?? selected ?? null;

  const handle = (code: CountryCode) => {
    if (onSelect) onSelect(code);
  };

  return (
    <svg
      viewBox="0 0 300 420"
      role="img"
      aria-label="Map of the Nordic countries: Norway, Sweden and Denmark"
      className="nordic-map"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="seaGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f1f9" />
          <stop offset="100%" stopColor="#cee0f0" />
        </linearGradient>
        <pattern id="seaPattern" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="url(#seaGradient)" />
          <path d="M0 14 Q5.5 10 11 14 T22 14" stroke="rgba(10,77,140,.08)" fill="none" strokeWidth="1" />
        </pattern>
        <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0a4d8c" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Sea background */}
      <rect x="0" y="0" width="300" height="420" fill="url(#seaPattern)" />

      {/* Faint continental Europe hint (south) */}
      <path
        d="M 0 405 L 300 405 L 300 420 L 0 420 Z"
        fill="rgba(206,224,240,.55)"
        stroke="rgba(10,77,140,.12)"
      />
      <text x="150" y="416" fontSize="7" textAnchor="middle" fill="#5e7c95" letterSpacing="2">EUROPE</text>

      {/* Norway — long west-coast strip with fjord notches */}
      <g
        className={`nordic-map__country ${active === 'no' ? 'nordic-map__country--active' : ''}`}
        onMouseEnter={() => setHovered('no')}
        onMouseLeave={() => setHovered((c) => (c === 'no' ? null : c))}
        onFocus={() => setHovered('no')}
        onBlur={() => setHovered((c) => (c === 'no' ? null : c))}
        onClick={() => handle('no')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle('no'); } }}
        tabIndex={0}
        role="button"
        aria-label="Norway"
        aria-pressed={selected === 'no'}
      >
        <path
          d="M 95 28
             C 110 22, 132 18, 152 22
             L 168 30
             L 180 42
             L 184 56
             L 178 70
             L 165 78
             L 152 76
             L 148 88
             L 140 102
             L 134 118
             L 130 134
             L 126 148
             L 118 158
             L 112 168
             L 108 182
             L 102 196
             L 96 212
             L 90 226
             L 84 240
             L 78 254
             L 76 268
             L 80 280
             L 90 288
             L 102 290
             L 110 282
             L 116 268
             L 122 252
             L 128 240
             L 122 232
             L 118 220
             L 116 206
             L 114 192
             L 112 178
             L 110 164
             L 108 150
             L 100 142
             L 92 130
             L 86 116
             L 82 100
             L 78 82
             L 76 64
             L 80 48
             L 86 36
             Z"
          fill="#BA0C2F"
          opacity="0.92"
          stroke="#7a0a23"
          strokeWidth="0.6"
          filter="url(#dropShadow)"
        />
        <text x="100" y="120" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle" pointerEvents="none">NO</text>
      </g>

      {/* Sweden — tall continental shape east of Norway */}
      <g
        className={`nordic-map__country ${active === 'se' ? 'nordic-map__country--active' : ''}`}
        onMouseEnter={() => setHovered('se')}
        onMouseLeave={() => setHovered((c) => (c === 'se' ? null : c))}
        onFocus={() => setHovered('se')}
        onBlur={() => setHovered((c) => (c === 'se' ? null : c))}
        onClick={() => handle('se')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle('se'); } }}
        tabIndex={0}
        role="button"
        aria-label="Sweden"
        aria-pressed={selected === 'se'}
      >
        <path
          d="M 152 22
             L 168 30
             L 180 42
             L 184 56
             L 178 70
             L 165 78
             L 152 76
             L 148 88
             L 152 102
             L 162 112
             L 170 128
             L 176 144
             L 182 162
             L 186 180
             L 192 196
             L 200 212
             L 208 228
             L 212 244
             L 216 258
             L 222 272
             L 226 286
             L 224 300
             L 218 310
             L 210 318
             L 200 322
             L 188 318
             L 178 308
             L 170 294
             L 160 278
             L 152 262
             L 148 246
             L 144 230
             L 140 214
             L 136 198
             L 134 182
             L 132 166
             L 132 150
             L 134 134
             L 138 118
             L 144 102
             L 148 88
             L 148 70
             Z"
          fill="#006AA7"
          opacity="0.92"
          stroke="#004777"
          strokeWidth="0.6"
          filter="url(#dropShadow)"
        />
        <text x="180" y="180" fontSize="10" fontWeight="700" fill="#FFCC00" textAnchor="middle" pointerEvents="none">SE</text>
      </g>

      {/* Denmark — Jutland peninsula + Funen + Zealand */}
      <g
        className={`nordic-map__country ${active === 'dk' ? 'nordic-map__country--active' : ''}`}
        onMouseEnter={() => setHovered('dk')}
        onMouseLeave={() => setHovered((c) => (c === 'dk' ? null : c))}
        onFocus={() => setHovered('dk')}
        onBlur={() => setHovered((c) => (c === 'dk' ? null : c))}
        onClick={() => handle('dk')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle('dk'); } }}
        tabIndex={0}
        role="button"
        aria-label="Denmark"
        aria-pressed={selected === 'dk'}
      >
        {/* Jutland */}
        <path
          d="M 92 332
             C 100 326, 112 324, 122 328
             L 130 336
             L 136 348
             L 138 360
             L 134 372
             L 128 380
             L 120 386
             L 112 388
             L 104 384
             L 96 376
             L 92 366
             L 90 354
             L 90 344
             Z"
          fill="#C8102E"
          opacity="0.92"
          stroke="#8a0b1f"
          strokeWidth="0.6"
          filter="url(#dropShadow)"
        />
        {/* Funen (Fyn) */}
        <path
          d="M 146 360
             C 152 358, 160 360, 162 366
             L 162 374
             L 156 380
             L 148 380
             L 144 374
             L 144 366
             Z"
          fill="#C8102E"
          opacity="0.92"
          stroke="#8a0b1f"
          strokeWidth="0.6"
        />
        {/* Zealand (Sjælland) */}
        <path
          d="M 172 358
             C 180 354, 192 354, 198 360
             L 202 368
             L 200 378
             L 194 384
             L 184 384
             L 174 378
             L 170 370
             Z"
          fill="#C8102E"
          opacity="0.92"
          stroke="#8a0b1f"
          strokeWidth="0.6"
          filter="url(#dropShadow)"
        />
        <text x="115" y="358" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle" pointerEvents="none">DK</text>
      </g>

      {/* Compass rose */}
      <g transform="translate(268, 32)" pointerEvents="none">
        <circle r="14" fill="rgba(255,255,255,.6)" stroke="rgba(10,77,140,.25)" />
        <path d="M 0 -10 L 3 0 L 0 10 L -3 0 Z" fill="#0a4d8c" />
        <text x="0" y="-15" fontSize="6" textAnchor="middle" fill="#0a4d8c" fontWeight="700">N</text>
      </g>

      {/* Country active-state label badge (top-left) */}
      {active && (
        <g pointerEvents="none">
          <rect x="14" y="14" rx="6" width="76" height="22" fill="rgba(15,41,68,.92)" />
          <text x="22" y="29" fontSize="11" fill="#fff" fontWeight="600">
            {COUNTRY_LABEL[active]}
          </text>
        </g>
      )}
    </svg>
  );
}
