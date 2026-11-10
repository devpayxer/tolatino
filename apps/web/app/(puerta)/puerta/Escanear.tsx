"use client";
/* To'Latino Puerta · CHK-SCAN (y el modo puerta del panel, la misma pieza): cámara a pantalla completa, linterna, ENTRADA / SALIDA si el
   evento deja volver a entrar, y el resultado grande en menos de un segundo: color + palabra + ícono (nunca solo color), sonido y vibración.
   VERDE entra · ÁMBAR revisar (grupo «entran N de M», pide ID, boleto transferido) · ROJO no entra (ya entró por … a las …, anulado,
   devuelto, QR anulado, de otro día, de otro evento, QR no válido). Un grupo o un evento que pide ID se confirma con «Entró» antes de
   marcar. Entrada libre: el contador (+1 / −1). Sin montos ni precios: la puerta no vende (D1). Lo decide el servidor
   (/api/puerta/escanear, con el id del escaneo: repetir no cuenta dos veces). 6h: con `local` (To'Latino Puerta), sin señal decide el
   teléfono con su paquete firmado y guarda el escaneo en la cola con el MISMO id (sin-conexion/usePuertaLocal.ts); la pantalla lo dice. */
import { Button, Icon } from "@tolatino/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Escaner } from "./Escaner";
import { QUE_HACER, RESULTADO, type Pregunta, type ResEscaneo, type VistaEscaneo } from "@/lib/puerta-comun";
import type { PuertaLocal } from "./sin-conexion/usePuertaLocal";

type Bi = { es: string; en: string };
const TONO = { ok: ["var(--tl-signal)", "var(--tl-ink)"], warn: ["var(--tl-pro)", "var(--tl-ink)"], bad: ["var(--tl-danger)", "var(--tl-white)"] } as const;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0]! & (15 >> (Number(c) / 4)))).toString(16)));
let audio: AudioContext | null = null;
function sonar(bien: boolean) {
  try {
    navigator.vibrate?.(bien ? 80 : [120, 80, 120]);
    audio ??= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = bien ? 880 : 220; g.gain.value = 0.08; o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + (bien ? 0.12 : 0.32));
  } catch { /* sin sonido no pasa nada */ }
}
export async function mandar(cuerpo: Record<string, unknown>): Promise<ResEscaneo | { ok: false; msg: Bi; red: true }> {
  const ab = new AbortController(), t = setTimeout(() => ab.abort(), 6000);
  try {
    const r = await fetch("/api/puerta/escanear", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo), signal: ab.signal });
    return (await r.json()) as ResEscaneo;
  } catch { return { ok: false, red: true, msg: { es: "Sin señal: no se marcó. Toca «Reintentar» cuando vuelva la señal.", en: "No signal: not marked. Tap “Retry” when the signal is back." } }; }
  finally { clearTimeout(t); }
}
/* 6h · Con la puerta sin conexión: en línea primero; sin señal (o si la llamada no llega), decide el teléfono con su paquete (mismo id). */
export async function mandarOLocal(cuerpo: Record<string, unknown>, local?: PuertaLocal | null): Promise<ResEscaneo | { ok: false; msg: Bi; red: true } | { ok: true; res: string; k: number }> {
  if (local && local.listo && !local.enLinea) return local.escanear(cuerpo);
  const r = await mandar(cuerpo);
  if (!r.ok && "red" in r && local?.listo) return local.escanear(cuerpo);
  if (local && r.ok) local.notar(cuerpo, r);
  return r;
}

export function Escanear({ sesion, es, reentrada, libre, onCambio, onCerrada, onBuscar, local }: {
  sesion: string; es: boolean; reentrada: boolean; libre: boolean; onCambio?: () => void; onCerrada?: () => void; onBuscar?: () => void; local?: PuertaLocal | null;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [v, setV] = useState<VistaEscaneo | null>(null), [preg, setPreg] = useState<{ p: Pregunta; qr: string; n: number } | null>(null);
  const [dir, setDir] = useState<"in" | "out">("in"), [luz, setLuz] = useState(false), [hayLuz, setHayLuz] = useState(false);
  const [err, setErr] = useState<{ msg: Bi; cuerpo?: Record<string, unknown> } | null>(null), [enviando, setEnviando] = useState(false), [cuenta, setCuenta] = useState<number | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limpiar = useCallback(() => { if (t.current) clearTimeout(t.current); setV(null); setPreg(null); setErr(null); }, []);
  const resolver = useCallback(async (cuerpo: Record<string, unknown>, qr: string | null) => {
    setEnviando(true);
    const r = (await mandarOLocal(cuerpo, local)) as ResEscaneo | { ok: false; msg: Bi; red: true };
    setEnviando(false);
    if (!r.ok) {
      if ("cerrada" in r && r.cerrada) { onCerrada?.(); return; }
      setErr({ msg: r.msg, cuerpo: "red" in r ? cuerpo : undefined }); sonar(false); return;
    }
    if ("pregunta" in r) { setPreg({ p: r.pregunta, qr: qr ?? "", n: r.pregunta.quedan }); sonar(true); return; }
    setPreg(null); setV(r.v); sonar(r.v.tono !== "bad"); onCambio?.();
    if (t.current) clearTimeout(t.current);
    if (r.v.tono === "ok") t.current = setTimeout(() => setV(null), 2600);
  }, [onCambio, onCerrada, local]);
  const leido = useCallback((qr: string) => {
    if (enviando || v || preg || err) return;
    void resolver({ sesion, tipo: "qr", qr, id: uuid(), at: Date.now(), dir, previo: dir === "in" }, qr);
  }, [enviando, v, preg, err, resolver, sesion, dir]);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  const contar = async (d: "in" | "out") => {
    setEnviando(true);
    const r = await mandarOLocal({ sesion, tipo: "contar", id: uuid(), at: Date.now(), dir: d, n: 1 }, local);
    setEnviando(false);
    if (!r.ok) { if ("cerrada" in r && r.cerrada) { onCerrada?.(); return; } setErr({ msg: r.msg }); return; }
    const x = r as unknown as { res: string; k: number };
    if (x.res === "count") { setCuenta((c) => (c ?? 0) + (d === "in" ? x.k : -x.k)); sonar(true); onCambio?.(); }
    else { setErr({ msg: x.res === "over_capacity" ? { es: "Llegaste al aforo: deja entrar cuando salgan.", en: "You reached capacity: let people in as others leave." } : x.res === "door_closed" ? { es: "La puerta ya cerró.", en: "The door is closed." } : { es: "No hay nadie adentro para sacar.", en: "Nobody inside to take out." } }); sonar(false); }
  };
  const btnGrande = { height: 58, borderRadius: 17, font: "800 16px Manrope,sans-serif" };

  // Resultado grande (media pantalla): color + palabra + ícono.
  const Res = ({ x }: { x: VistaEscaneo }) => {
    const R = RESULTADO[x.res], [bg, fg] = TONO[x.tono], aqui = QUE_HACER[x.res];
    const linea = [x.tipo, x.mesa ? `${x.mesa.zona}${x.mesa.numero ? E2(` · mesa ${x.mesa.numero}`, ` · table ${x.mesa.numero}`) : ""}` : null].filter(Boolean).join(" · ");
    return (
      <div role="status" aria-live="assertive" style={{ minHeight: "46dvh", borderRadius: 24, background: bg, color: fg, padding: "26px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name={R.icon} size={40} color={fg} strokeWidth={2.4} />
          <span style={{ font: "800 34px/1.02 Sora,sans-serif", letterSpacing: "-.03em" }}>{x.dir === "out" && x.res === "valid" ? E2("SALIÓ", "OUT") : x.tono === "warn" && x.res === "valid" ? E2("ENTRA · REVISA", "IN · CHECK") : es ? R.t.es : R.t.en}</span></span>
        {x.nombre ? <span style={{ font: "800 26px/1.15 Sora,sans-serif" }}>{x.nombre}</span> : null}
        {linea ? <span style={{ font: "700 15px/1.4 Manrope,sans-serif" }}>{linea}</span> : null}
        {(x.res === "valid" || x.res === "manual") && x.de > 1 ? <span style={{ font: "800 19px Manrope,sans-serif" }}>{x.dir === "out" ? E2(`Salen ${x.k}`, `${x.k} out`) : E2(`Entran ${x.k} · ya van ${x.entraron} de ${x.de}`, `${x.k} in · ${x.entraron} of ${x.de} so far`)}</span> : null}
        {x.ya ? <span style={{ font: "800 18px/1.35 Manrope,sans-serif" }}>{E2(`Ya entró por ${x.ya.puerta} a las ${x.ya.hora}.`, `Already in through ${x.ya.puerta} at ${x.ya.hora}.`)}</span> : null}
        {x.vale ? <span style={{ font: "700 16px/1.35 Manrope,sans-serif" }}>{E2(`Vale: ${x.vale}`, `Valid: ${x.vale}`)}</span> : null}
        {x.transferido && x.res === "valid" ? <span style={{ font: "700 15px/1.4 Manrope,sans-serif" }}>{E2("Boleto transferido: revisa que el QR esté en su teléfono.", "Transferred ticket: check the QR is on their phone.")}</span> : null}
        {x.edad > 0 && (x.res === "valid" || x.res === "manual") && x.dir === "in" ? <span style={{ font: "700 15px Manrope,sans-serif" }}>{E2(`Evento ${x.edad}+`, `${x.edad}+ event`)}</span> : null}
        {aqui ? <span style={{ font: "600 15px/1.45 Manrope,sans-serif" }}>{es ? aqui.es : aqui.en}</span> : null}
        {x.sinSenal ? <span style={{ display: "flex", alignItems: "center", gap: 8, font: "800 13px/1.4 Manrope,sans-serif" }}><Icon name="wifi" size={16} color={fg} />{E2("SIN CONEXIÓN · lo decidió este teléfono; se sube al volver la señal.", "OFFLINE · decided on this phone; it uploads when the signal is back.")}</span> : null}
        <span style={{ flex: 1 }} />
        <Button variant={x.tono === "bad" ? "secondary" : "primary"} size="lg" block icon="grid" onClick={limpiar} style={btnGrande}>{E2("Siguiente", "Next")}</Button>
      </div>);
  };
  const Pre = ({ q }: { q: { p: Pregunta; qr: string; n: number } }) => (
    <div role="status" aria-live="assertive" style={{ minHeight: "46dvh", borderRadius: 24, background: TONO.warn[0], color: TONO.warn[1], padding: "26px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name={q.p.pideId ? "shield" : "users"} size={38} color="var(--tl-ink)" strokeWidth={2.4} />
        <span style={{ font: "800 30px/1.05 Sora,sans-serif", letterSpacing: "-.03em" }}>{q.p.pideId ? E2(`PIDE ID · ${q.p.edad}+`, `CHECK ID · ${q.p.edad}+`) : E2("REVISA EL GRUPO", "CHECK THE GROUP")}</span></span>
      {q.p.nombre ? <span style={{ font: "800 25px/1.15 Sora,sans-serif" }}>{q.p.nombre}</span> : null}
      <span style={{ font: "700 15px/1.4 Manrope,sans-serif" }}>{[q.p.tipo, q.p.mesa].filter(Boolean).join(" · ")}</span>
      {q.p.pideId ? <span style={{ font: "600 15px/1.45 Manrope,sans-serif" }}>{E2(`Mira su identificación. Si no muestra ID de ${q.p.edad} o más, no entra.`, `Check their ID. If they cannot show they are ${q.p.edad} or older, no entry.`)}</span> : null}
      {q.p.quedan > 1 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Button variant="secondary" size="lg" icon="minus" onClick={() => setPreg({ ...q, n: Math.max(1, q.n - 1) })} style={{ width: 58, height: 58, padding: 0 }}>{""}</Button>
          <span style={{ flex: 1, textAlign: "center", font: "800 22px/1.2 Sora,sans-serif" }}>{E2(`Entran ${q.n} de ${q.p.quedan}`, `${q.n} of ${q.p.quedan} in`)}</span>
          <Button variant="secondary" size="lg" icon="plus" onClick={() => setPreg({ ...q, n: Math.min(q.p.quedan, q.n + 1) })} style={{ width: 58, height: 58, padding: 0 }}>{""}</Button>
        </div>) : null}
      {q.p.entraron > 0 ? <span style={{ font: "700 14px Manrope,sans-serif" }}>{E2(`Ya entraron ${q.p.entraron} de ${q.p.de}.`, `${q.p.entraron} of ${q.p.de} already in.`)}</span> : null}
      {q.p.fuera ? <span style={{ font: "600 15px/1.45 Manrope,sans-serif" }}>{E2("SIN CONEXIÓN · El QR es de To’Latino pero no está en la lista de este teléfono (se vendió hace poco). Si lo dejas entrar, se revisa al volver la señal.", "OFFLINE · The QR is To’Latino’s but it is not on this phone’s list (sold recently). If you let them in, it is checked when the signal is back.")}</span> : null}
      <span style={{ flex: 1 }} />
      <Button variant="primary" size="lg" block icon="check" onClick={() => void resolver({ sesion, tipo: "qr", qr: q.qr, id: q.p.id, at: Date.now(), dir: "in", n: q.n, previo: false }, q.qr)} style={btnGrande}>
        {q.p.quedan > 1 ? E2(`Entraron ${q.n}`, `${q.n} got in`) : E2("Entró", "Got in")}</Button>
      <Button variant="secondary" size="lg" block onClick={limpiar} style={btnGrande}>{E2("No entra", "No entry")}</Button>
    </div>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {err ? (
        <div role="alert" style={{ borderRadius: 22, background: "var(--tl-danger)", color: "var(--tl-white)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, font: "800 20px/1.2 Sora,sans-serif" }}><Icon name={err.cuerpo ? "wifi" : "warning"} size={26} color="var(--tl-white)" />{err.cuerpo ? E2("SIN SEÑAL", "NO SIGNAL") : E2("NO SE PUDO", "COULD NOT")}</span>
          <span style={{ font: "600 15px/1.45 Manrope,sans-serif" }}>{es ? err.msg.es : err.msg.en}</span>
          {err.cuerpo ? <Button variant="secondary" size="lg" block onClick={() => { const c = err.cuerpo!; setErr(null); void resolver(c, String(c.qr ?? "")); }} style={btnGrande}>{E2("Reintentar", "Retry")}</Button> : null}
          <Button variant="secondary" size="lg" block onClick={limpiar} style={btnGrande}>{E2("Seguir", "Continue")}</Button>
        </div>) : null}
      {libre ? (
        // Entrada libre: «Contar en la puerta» (cuántos vinieron de verdad).
        <div style={{ borderRadius: 24, background: "var(--tl-dark-2)", color: "var(--tl-white)", padding: 22, display: "flex", flexDirection: "column", gap: 14, border: "1px solid var(--tl-dark-line)" }}>
          <span style={{ font: "700 10px 'JetBrains Mono',monospace", letterSpacing: ".12em", opacity: 0.7 }}>{E2("CONTAR EN LA PUERTA", "COUNT AT THE DOOR")}</span>
          <span style={{ font: "800 15px/1.45 Manrope,sans-serif", opacity: 0.85 }}>{E2("Toca +1 por cada persona que entra. Así sabes cuántos vinieron de verdad.", "Tap +1 for each person who comes in. So you know how many really came.")}</span>
          {cuenta !== null ? <span style={{ font: "800 15px Manrope,sans-serif" }}>{E2(`Contaste ${cuenta} en esta pantalla`, `You counted ${cuenta} on this screen`)}</span> : null}
          <Button variant="action" size="lg" block icon="plus" onClick={() => void contar("in")} disabled={enviando} style={{ height: 96, borderRadius: 22, font: "800 26px Sora,sans-serif" }}>{E2("+1 Entró", "+1 In")}</Button>
          <Button variant="secondary" size="lg" block icon="minus" onClick={() => void contar("out")} disabled={enviando} style={btnGrande}>{E2("−1 Salió", "−1 Out")}</Button>
        </div>
      ) : v ? <Res x={v} /> : preg ? <Pre q={preg} /> : !err ? (
        <Escaner activo={!enviando && !v && !preg && !err} onCodigo={leido} linterna={luz} es={es} onLinterna={setHayLuz} />
      ) : null}
      {!libre && !v && !preg ? (
        <div style={{ display: "flex", gap: 8 }}>
          {hayLuz ? <Button variant={luz ? "primary" : "secondary"} size="lg" icon="bolt" onClick={() => setLuz((x) => !x)} style={{ ...btnGrande, flex: 1 }}>{luz ? E2("Apagar luz", "Light off") : E2("Linterna", "Flashlight")}</Button> : null}
          {reentrada ? <Button variant={dir === "out" ? "danger" : "secondary"} size="lg" icon={dir === "out" ? "right" : "check"} onClick={() => setDir((d) => (d === "in" ? "out" : "in"))} style={{ ...btnGrande, flex: 1 }}>
            {dir === "in" ? E2("Escaneando ENTRADAS", "Scanning ENTRIES") : E2("Escaneando SALIDAS", "Scanning EXITS")}</Button> : null}
          {onBuscar ? <Button variant="secondary" size="lg" icon="search" onClick={onBuscar} style={{ ...btnGrande, flex: 1 }}>{E2("Buscar", "Search")}</Button> : null}
        </div>) : null}
      {enviando ? <span role="status" style={{ textAlign: "center", font: "700 13px Manrope,sans-serif", color: "rgba(255,255,255,.7)" }}>{E2("Revisando…", "Checking…")}</span> : null}
    </div>);
}
