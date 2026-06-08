/**
 * Ambient product-hero signature — Server Component.
 * A slow accent-hued "audit scan" sweeping across faint measure lines, over the
 * coordinate grid. Pure CSS animation (no JS) so the hero stays a Server
 * Component; the global reduced-motion rule freezes it to a static, legible
 * state. Colour is driven by the inherited --accent variable.
 */
export function AmbientSignature() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* horizontal measure lines (ledger / oscilloscope baselines) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 47px, color-mix(in oklab, var(--accent) 16%, transparent) 47px 47.5px)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
        }}
      />
      {/* sparse vertical ticks */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, transparent 0 95px, color-mix(in oklab, var(--accent) 12%, transparent) 95px 95.5px)",
        }}
      />
      {/* the scan sweep */}
      <div
        className="absolute inset-y-0 -left-1/4 w-1/4"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 22%, transparent), transparent)",
          animation: "octa-scan-x 7s var(--ease-linear) infinite",
        }}
      />
    </div>
  );
}
