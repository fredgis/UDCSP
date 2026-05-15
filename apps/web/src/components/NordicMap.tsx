/**
 * NordicMap — accurate-but-sober map of Norway, Denmark and Sweden.
 *
 * Geometry: Natural Earth 1:110m (countries-110m via world-atlas), filtered
 * to NO/DK/SE only and inlined as ./nordic-geo.json (6 KB raw / ~2 KB gzip).
 * Projection: D3 geoMercator fitted to the feature collection.
 *
 * Interaction: hover, focus (keyboard) or tap to select a country. The
 * parent listens to `onSelect` and reflects the choice in the adjacent
 * info panel.
 */
import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import rawGeo from './nordic-geo.json';

type CountryCode = 'no' | 'dk' | 'se';

const NAME_TO_CODE: Record<string, CountryCode> = {
  Norway: 'no',
  Denmark: 'dk',
  Sweden: 'se',
};

const COUNTRY_COLOR: Record<CountryCode, { fill: string; stroke: string; labelFill: string }> = {
  no: { fill: '#BA0C2F', stroke: '#7a0a23', labelFill: '#ffffff' },
  dk: { fill: '#C8102E', stroke: '#8a0b1f', labelFill: '#ffffff' },
  se: { fill: '#006AA7', stroke: '#004777', labelFill: '#FFCC00' },
};

const COUNTRY_LABEL: Record<CountryCode, string> = {
  no: 'Norway',
  dk: 'Denmark',
  se: 'Sweden',
};

type Props = {
  selected?: CountryCode | null;
  onSelect?: (code: CountryCode) => void;
};

const WIDTH = 320;
const HEIGHT = 420;

export function NordicMap({ selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<CountryCode | null>(null);
  const active = hovered ?? selected ?? null;

  // Memoise projection + path generator so we don't recompute on every render.
  const { path, features, centroids } = useMemo(() => {
    const fc = rawGeo as unknown as FeatureCollection<Geometry, { name: string }>;
    const proj = geoMercator().fitExtent(
      [[18, 18], [WIDTH - 18, HEIGHT - 32]],
      fc,
    );
    const pathGen = geoPath(proj);
    const cs: Record<CountryCode, [number, number]> = {} as Record<CountryCode, [number, number]>;
    for (const f of fc.features) {
      const code = NAME_TO_CODE[f.properties.name];
      if (!code) continue;
      cs[code] = pathGen.centroid(f as Feature<Geometry>) as [number, number];
    }
    return { path: pathGen, features: fc.features, centroids: cs };
  }, []);

  const select = (code: CountryCode) => {
    if (onSelect) onSelect(code);
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Map of the Nordic countries: Norway, Sweden and Denmark"
      className="nordic-map"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="seaGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eaf2f9" />
          <stop offset="100%" stopColor="#d1e0ee" />
        </linearGradient>
        <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#0a4d8c" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Sea background */}
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#seaGradient)" rx="8" />

      {/* Subtle latitude/longitude grid for the corporate-cartographic feel */}
      <g stroke="rgba(10,77,140,.06)" strokeWidth="0.6" fill="none">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * (HEIGHT / 8)} x2={WIDTH} y2={i * (HEIGHT / 8)} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`v-${i}`} x1={i * (WIDTH / 6)} y1="0" x2={i * (WIDTH / 6)} y2={HEIGHT} />
        ))}
      </g>

      {/* Continental Europe label (south) */}
      <text x={WIDTH / 2} y={HEIGHT - 12} fontSize="8" textAnchor="middle" fill="#5e7c95" letterSpacing="3" opacity="0.55">
        EUROPE
      </text>

      {/* Country features */}
      {features.map((feat) => {
        const f = feat as Feature<Geometry, { name: string }>;
        const code = NAME_TO_CODE[f.properties.name];
        if (!code) return null;
        const isActive = active === code;
        const isSelected = selected === code;
        const c = COUNTRY_COLOR[code];
        const d = path(f) ?? '';
        return (
          <g
            key={code}
            className={`nordic-map__country ${isActive ? 'nordic-map__country--active' : ''}`}
            onMouseEnter={() => setHovered(code)}
            onMouseLeave={() => setHovered((h) => (h === code ? null : h))}
            onFocus={() => setHovered(code)}
            onBlur={() => setHovered((h) => (h === code ? null : h))}
            onClick={() => select(code)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(code); } }}
            tabIndex={0}
            role="button"
            aria-label={f.properties.name}
            aria-pressed={isSelected}
          >
            <path
              d={d}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={isActive ? 1.2 : 0.7}
              strokeLinejoin="round"
              opacity={isActive ? 1 : 0.88}
              filter={isActive ? 'url(#dropShadow)' : undefined}
            />
          </g>
        );
      })}

      {/* Country labels positioned at geographic centroids — pointer-events none so the parent <g> stays clickable */}
      {(Object.keys(centroids) as CountryCode[]).map((code) => {
        const [cx, cy] = centroids[code];
        const c = COUNTRY_COLOR[code];
        // Denmark's centroid lands in the sea between islands — nudge onto Jutland.
        const offset = code === 'dk' ? { dx: -12, dy: 2 } : { dx: 0, dy: 0 };
        return (
          <text
            key={`l-${code}`}
            x={cx + offset.dx}
            y={cy + offset.dy}
            fontSize="11"
            fontWeight="700"
            fill={c.labelFill}
            textAnchor="middle"
            pointerEvents="none"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="0.4"
            paintOrder="stroke fill"
          >
            {code.toUpperCase()}
          </text>
        );
      })}

      {/* Compass rose */}
      <g transform={`translate(${WIDTH - 28}, 28)`} pointerEvents="none">
        <circle r="13" fill="rgba(255,255,255,.72)" stroke="rgba(10,77,140,.3)" strokeWidth="0.8" />
        <path d="M 0 -10 L 3 0 L 0 10 L -3 0 Z" fill="#0a4d8c" />
        <text x="0" y="-15" fontSize="6" textAnchor="middle" fill="#0a4d8c" fontWeight="700">N</text>
      </g>

      {/* Active-country badge (top-left) */}
      {active && (
        <g pointerEvents="none">
          <rect x="12" y="12" rx="6" width="78" height="22" fill="rgba(15,41,68,.92)" />
          <text x="20" y="27" fontSize="11" fill="#fff" fontWeight="600">{COUNTRY_LABEL[active]}</text>
        </g>
      )}
    </svg>
  );
}
