interface Props {
  now: Date;
  showSeconds: boolean;
  size?: number;
}

export function AnalogClock({ now, showSeconds, size = 300 }: Props) {
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;

  const secAngle = s * 6; // 360/60
  const minAngle = m * 6;
  const hourAngle = h * 30; // 360/12

  const r = size / 2;
  const c = size / 2;

  // Hour ticks
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const outer = r - 10;
    const inner = i % 3 === 0 ? r - 26 : r - 20;
    const x1 = c + outer * Math.sin(angle);
    const y1 = c - outer * Math.cos(angle);
    const x2 = c + inner * Math.sin(angle);
    const y2 = c - inner * Math.cos(angle);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={i % 3 === 0 ? 3 : 1.5}
        strokeLinecap="round"
        opacity={i % 3 === 0 ? 0.9 : 0.45}
      />
    );
  });

  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = (angle * Math.PI) / 180;
    const x2 = c + length * Math.sin(rad);
    const y2 = c - length * Math.cos(rad);
    return (
      <line
        x1={c}
        y1={c}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="analog-clock"
    >
      <circle cx={c} cy={c} r={r - 4} className="clock-rim" />
      {ticks}
      {hand(hourAngle, r * 0.5, 6, "var(--fg)")}
      {hand(minAngle, r * 0.72, 4, "var(--fg)")}
      {showSeconds && hand(secAngle, r * 0.8, 2, "var(--accent)")}
      <circle cx={c} cy={c} r={6} fill="var(--accent)" />
    </svg>
  );
}
