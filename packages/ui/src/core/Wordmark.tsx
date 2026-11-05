/* Logo en texto: To'(ink) + Latino (brand) con el símbolo circular. Fuente: assets/logo-tolatino.svg del sistema. */
export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span
      aria-label="To'Latino"
      role="img"
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size, letterSpacing: "-0.04em", lineHeight: 1 }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="var(--tl-brand)" />
        <circle cx="12" cy="12" r="5" fill="var(--tl-white)" />
      </svg>
      <span style={{ color: "var(--tl-ink)" }}>To&rsquo;</span>
      <span style={{ color: "var(--tl-brand)", marginLeft: -size * 0.22 }}>Latino</span>
    </span>
  );
}
