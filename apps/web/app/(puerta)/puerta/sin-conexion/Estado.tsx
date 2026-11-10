"use client";
/* 6h · La línea de estado de To'Latino Puerta (en la cabecera oscura): EN LÍNEA / SIN CONEXIÓN · N POR SUBIR · lista de las 10:42, o
   «Preparando la puerta · N boletos» al abrir. Compuesta con Tag e Icon del sistema (hueco del plan: la Puerta no tiene pantalla en el
   prototipo). El aviso grande pasados puerta_offline_aviso_min sin señal es un bloque «note» del sistema (avisoSinSenal). */
import { Icon, Tag, type PanelBloqueT as Bloque } from "@tolatino/ui";
import type { EstadoLocal } from "./usePuertaLocal";

export function horaLista(iso: string | null, tz: string): string {
  if (!iso) return "";
  try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)); } catch { return ""; }
}
export function EstadoPuerta({ x, es }: { x: EstadoLocal; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), lista = horaLista(x.lista, x.tz);
  const [tono, t] = x.preparando && !x.listo ? (["neutral", E2("PREPARANDO", "PREPARING")] as const) : x.enLinea ? (["signal", E2("EN LÍNEA", "ONLINE")] as const) : (["danger", E2("SIN CONEXIÓN", "OFFLINE")] as const);
  const partes = [
    x.preparando && !x.listo ? E2(`Preparando la puerta${x.n ? ` · ${x.n} boletos` : "…"}`, `Preparing the door${x.n ? ` · ${x.n} tickets` : "…"}`) : null,
    x.porSubir > 0 ? E2(`${x.porSubir} POR SUBIR`, `${x.porSubir} TO UPLOAD`) : x.enLinea && x.sincronizado ? E2("Sincronizado", "Synced") : null,
    x.listo && lista ? E2(`lista de las ${lista}`, `list from ${lista}`) : null,
    x.listo ? E2(`${x.n} en la lista`, `${x.n} on the list`) : null,
  ].filter(Boolean);
  return (
    <div role="status" aria-live="polite" data-estado-puerta={x.enLinea ? "en-linea" : "sin-conexion"} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "9px 12px", borderRadius: 14, background: "var(--tl-dark-2)", border: "1px solid var(--tl-dark-line)" }}>
      <Icon name="wifi" size={16} color={x.enLinea ? "var(--tl-signal)" : "var(--tl-danger)"} />
      <Tag tone={tono} style={tono === "neutral" ? { background: "rgba(255,255,255,.12)", color: "var(--tl-white)" } : tono === "signal" ? { background: "var(--tl-signal)", color: "var(--tl-ink)" } : { background: "var(--tl-danger)", color: "var(--tl-white)" }}>{t}</Tag>
      <span style={{ font: "700 12px/1.35 Manrope,sans-serif", color: "rgba(255,255,255,.78)" }}>{partes.join(" · ")}</span>
    </div>);
}
/* El aviso grande: pasados puerta_offline_aviso_min sin señal (o un paquete que no se pudo bajar). */
export function avisoSinSenal(x: EstadoLocal, es: boolean, ahora: number): Bloque[] {
  const E2 = (a: string, b: string) => (es ? a : b), out: Bloque[] = [];
  if (x.error) out.push({ type: "note", tone: "warn", icon: "warning", t: es ? x.error.es : x.error.en });
  if (!x.enLinea && !x.listo && !x.preparando) out.push({ type: "note", tone: "danger", icon: "wifi", t: E2("Sin señal y sin la lista de esta puerta: escanea cuando vuelva la señal.", "No signal and no list for this door: scan when the signal is back.") });
  if (!x.enLinea && x.listo && x.desde && ahora - x.desde >= x.avisoMin * 60000) {
    const min = Math.floor((ahora - x.desde) / 60000), lista = horaLista(x.lista, x.tz);
    out.push({ type: "note", tone: "danger", icon: "wifi", t: E2(`Llevas ${min} min sin señal. La lista es de las ${lista}: lo que se devolvió o transfirió después, este teléfono no lo sabe. Busca señal para subir ${x.porSubir} escaneos y ponerte al día.`,
      `${min} min without signal. The list is from ${lista}: anything refunded or transferred since then is unknown to this phone. Find signal to upload ${x.porSubir} scans and catch up.`) });
  }
  return out;
}
