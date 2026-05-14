type Authority = { label: string; sub?: string; flag?: string };
type Group = { country: string; flag: string; items: Authority[] };

export type PlatformDiagramProps = {
  title?: string;
  intro?: string;
  groups: Group[];
};

export function PlatformDiagram({ title, intro, groups }: PlatformDiagramProps) {
  return (
    <div className="platform-diagram" role="img" aria-label={title ?? 'Connected national authorities'}>
      {title && <div className="platform-diagram__title">{title}</div>}
      {intro && <p className="platform-diagram__intro">{intro}</p>}
      <div className="platform-diagram__canvas">
        <div className="platform-diagram__hub" aria-hidden="true">
          <span className="platform-diagram__hub-eyebrow">Unified platform</span>
          <span className="platform-diagram__hub-name">UDCSP</span>
          <span className="platform-diagram__hub-tag">One guided intake</span>
        </div>
        <ul className="platform-diagram__groups" role="list">
          {groups.map((g) => (
            <li key={g.country} className="platform-diagram__group">
              <div className="platform-diagram__country">
                <span aria-hidden="true">{g.flag}</span> {g.country}
              </div>
              <ul className="platform-diagram__pills" role="list">
                {g.items.map((it) => (
                  <li key={it.label} className="platform-diagram__pill" title={it.sub}>
                    <span className="platform-diagram__pill-name">{it.label}</span>
                    {it.sub && <span className="platform-diagram__pill-sub">{it.sub}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
