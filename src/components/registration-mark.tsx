/**
 * Registration mark — corner crosshair / alignment target (design-tokens.md §6.2,
 * CLAUDE.md §2). Rendered as crisp SVG so the hairline stays clean at any size.
 * Tint `color` to a product signature hue to mark that instrument.
 */
export function RegistrationMark({
  color = "var(--ink-ghost)",
  size = 14,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  const c = size / 2;
  const r = size * 0.2;
  // small gap around the center ring, like an optical sight
  const gap = r + size * 0.12;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
      fill="none"
      stroke={color}
      strokeWidth={0.75}
      shapeRendering="geometricPrecision"
    >
      <line x1={c} y1={0} x2={c} y2={c - gap} />
      <line x1={c} y1={c + gap} x2={c} y2={size} />
      <line x1={0} y1={c} x2={c - gap} y2={c} />
      <line x1={c + gap} y1={c} x2={size} y2={c} />
      <circle cx={c} cy={c} r={r} />
    </svg>
  );
}
