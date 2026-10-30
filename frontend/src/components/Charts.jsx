// Tiny SVG charts so we don't need a chart library for the demo.

export function LineChart({ labels, series, height = 220 }) {
  const W = 600, H = height, pad = { l: 32, r: 12, t: 12, b: 28 };
  const max = Math.max(...series.flatMap((s) => s.values)) * 1.15;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (labels.length - 1);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  return (
    <div className="stack gap-12">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cases per week">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            <circle cx={x(s.values.length - 1)} cy={y(s.values.at(-1))} r="4" fill={s.color} />
          </g>
        ))}
      </svg>
      <div className="row gap-16 small wrap">
        {series.map((s) => (
          <span key={s.name} className="row gap-8"><span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}

export function BarList({ rows, color = "var(--steel-500)" }) {
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="stack gap-12">
      {rows.map(([label, value]) => (
        <div key={label} className="stack gap-4">
          <div className="row between small"><span>{label}</span><span className="body-strong">{value}%</span></div>
          <div className="meter"><div style={{ width: `${(value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}
