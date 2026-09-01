// Динамика ELO игрока. Инлайновый SVG — график простой, тянуть recharts незачем.
export function EloSparkline({ history, width = 260, height = 56 }) {
  if (!history || history.length < 2) return null;

  const values = [history[0].eloBefore, ...history.map((h) => h.eloAfter)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const padding = 4;
  const stepX = (width - padding * 2) / (values.length - 1);
  const toY = (v) => padding + (1 - (v - min) / span) * (height - padding * 2);

  const points = values.map((v, i) => [padding + i * stepX, toY(v)]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${padding},${height} ${line} ${(width - padding).toFixed(1)},${height}`;

  const last = points[points.length - 1];
  const growing = values[values.length - 1] >= values[0];
  const color = growing ? "#34d399" : "#f87171";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-14"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Динамика ELO: с ${values[0]} до ${values[values.length - 1]}`}
    >
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}
