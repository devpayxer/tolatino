"use client";
/* 6h · To'Latino Puerta con y sin señal: el paquete de la sesión, la cola y la puesta al día (fase6-eventos.md §3 y §4 6h).
   - Al abrir la puerta: «Preparando la puerta · N boletos» (baja el paquete firmado y cifrado y la llave de la sesión).
   - Con señal, cada puerta_sync_seg: sube la cola EN ORDEN (de a puerta_sync_lote, con la hora del teléfono de ahora para medir su reloj) y
     después baja los cambios desde su cursor. Sin señal: decide con el paquete y guarda cada escaneo en la cola (cifrada) con su id.
   - Si el servidor dice que la puerta se cerró, se revocó o venció: se borra todo de esta sesión en el teléfono.
   - El service worker propio de /puerta guarda solo la cáscara de la app (nunca respuestas con datos): así la puerta abre sin señal. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Pregunta, ResEscaneo, VistaEscaneo } from "@/lib/puerta-comun";
import * as L from "./local";

type Bi = { es: string; en: string };
export type EstadoLocal = {
  listo: boolean; preparando: boolean; n: number; lista: string | null; enLinea: boolean; desde: number | null; porSubir: number; avisoMin: number;
  sincronizado: number | null; error: Bi | null; tz: string; revocada: boolean;
};
export type PuertaLocal = EstadoLocal & {
  escanear: (c: Record<string, unknown>) => Promise<ResEscaneo | { ok: true; res: string; k: number }>;
  notar: (c: Record<string, unknown>, r: ResEscaneo) => void;
  buscar: (q: string) => Promise<{ b: import("@/lib/puerta-paquete").FilaPaqB[]; r: import("@/lib/puerta-paquete").FilaPaqR[] }>;
  tipoDe: (i: number) => string;
  sincronizar: () => Promise<boolean>;
  cerrar: () => Promise<boolean>;
};
const hayDS = () => typeof DecompressionStream !== "undefined";
const T_RED = 8000;
async function post(url: string, body: unknown): Promise<{ st: number; j: Record<string, unknown> } | null> {
  const ab = new AbortController(), t = setTimeout(() => ab.abort(), T_RED);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ab.signal, cache: "no-store" });
    return { st: r.status, j: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return null; } finally { clearTimeout(t); }
}

/* Registra el service worker de la puerta (alcance /puerta) y le pide guardar la cáscara para abrir sin señal. */
export function registrarSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/puerta/sw.js", { scope: "/puerta" }).then((r) => { (r.active ?? r.waiting ?? r.installing)?.postMessage?.({ t: "preparar" }); }).catch(() => undefined);
}
/* Las llaves públicas (con señal): para verificar QR y paquetes sin señal. */
async function bajarPublicas() {
  try { const r = await fetch("/api/puerta/llaves", { cache: "no-store" }); const j = (await r.json()) as { llaves?: Record<string, string> }; if (j.llaves && Object.keys(j.llaves).length) await L.guardarPublicas(j.llaves); } catch { /* sin señal: las guardadas */ }
}

export function usePuertaLocal(sesion: string, es: boolean, o: { puerta: string; onCerrada: () => void; activo?: boolean }): PuertaLocal {
  const [st, setSt] = useState<EstadoLocal>({ listo: false, preparando: true, n: 0, lista: null, enLinea: true, desde: null, porSubir: 0, avisoMin: 10, sincronizado: null, error: null, tz: "America/New_York", revocada: false });
  const est = useRef<L.Estado | null>(null), ocupado = useRef(false), cerrada = useRef(o.onCerrada), vivo = useRef(true), seg = useRef(15);
  cerrada.current = o.onCerrada;
  const pon = useCallback((x: Partial<EstadoLocal>) => { if (vivo.current) setSt((s) => ({ ...s, ...x })); }, []);
  const contar = useCallback(async () => pon({ porSubir: await L.cuantosEnCola(sesion).catch(() => 0) }), [pon, sesion]);
  const reflejar = useCallback((e: L.Estado) => { est.current = e; seg.current = e.sync.seg; pon({ listo: true, n: e.b.length + e.r.length, lista: e.emitido, avisoMin: e.sync.avisoMin, tz: e.ev.tz }); }, [pon]);
  const sinSenal = useCallback(() => setSt((s) => (vivo.current ? { ...s, enLinea: false, desde: s.desde ?? Date.now() } : s)), []);
  const conSenal = useCallback(() => pon({ enLinea: true, desde: null }), [pon]);
  // Se cerró, se revocó o venció: nada de esta puerta queda en el teléfono.
  const olvidar = useCallback(async (revocada: boolean) => { await L.borrarSesion(sesion).catch(() => undefined); est.current = null; pon({ listo: false, revocada, porSubir: 0 }); cerrada.current(); }, [pon, sesion]);

  // Bajar el paquete completo (con la llave de la sesión).
  const completo = useCallback(async (): Promise<boolean> => {
    const r = await post("/api/puerta/paquete", { sesion, llave: true, gz: hayDS() });
    if (!r) { sinSenal(); return false; }
    conSenal();
    if (!r.j.ok) { if (r.j.cerrada) await olvidar(false); else pon({ error: r.j.msg as Bi }); return false; }
    await L.guardarLlave(sesion, String(r.j.llave));
    reflejar(await L.recibir(sesion, { iv: String(r.j.iv), c: String(r.j.c), gz: !!r.j.gz, delta: false }, null));
    pon({ sincronizado: Date.now(), error: null });
    return true;
  }, [sesion, sinSenal, conSenal, olvidar, pon, reflejar]);

  // Subir la cola (en orden) y bajar los cambios. true = al día.
  const sincronizar = useCallback(async (): Promise<boolean> => {
    if (ocupado.current) return false;
    ocupado.current = true;
    try {
      for (let vuelta = 0; vuelta < 50; vuelta++) {
        const C = await L.cola(sesion);
        if (!C.length) break;
        const lote = C.slice(0, est.current?.sync.lote ?? 200);
        const r = await post("/api/puerta/escanear", { tipo: "cola", sesion, ahora: Date.now(), escaneos: lote });
        if (!r) { sinSenal(); return false; }
        conSenal();
        if (!r.j.ok) { if (r.j.cerrada) await olvidar(!!r.j.revocada); return false; }
        const hechos = (r.j.hechos as { id: string; estado: string }[]) ?? [];
        // Lo que el servidor ya tiene (decidido, repetido, ajeno o mal formado) sale de la cola; «cerrada» (RSVP o conteo con la puerta ya
        // cerrada) también: la puerta no lo puede marcar.
        await L.quitarDeCola(lote.map((x, i) => (hechos[i] ? x.id : "")).filter(Boolean));
        await contar();
        if (hechos.length < lote.length) break;
      }
      if ((await L.cuantosEnCola(sesion)) > 0) return false;
      const e = est.current;
      if (!e) return completo();
      const r = await post("/api/puerta/paquete", { sesion, desde: e.cursor, gz: hayDS() });
      if (!r) { sinSenal(); return false; }
      conSenal();
      if (!r.j.ok) { if (r.j.cerrada) { await olvidar(false); return false; } if (r.j.completo) return completo(); return false; }
      reflejar(await L.recibir(sesion, { iv: String(r.j.iv), c: String(r.j.c), gz: !!r.j.gz, delta: true }, e));
      pon({ sincronizado: Date.now(), error: null });
      return true;
    } catch { return false; } finally { ocupado.current = false; }
  }, [sesion, sinSenal, conSenal, olvidar, contar, completo, reflejar, pon]);

  // Al abrir: lo guardado (si hay) y después el servidor.
  useEffect(() => {
    vivo.current = true;
    if (o.activo === false) return;
    registrarSW();
    void (async () => {
      await L.guardarMeta("es", es).catch(() => undefined);
      await bajarPublicas();
      const e = await L.leerEstado(sesion).catch(() => null);
      if (e) reflejar(e);
      await contar();
      if (navigator.onLine === false) { sinSenal(); pon({ preparando: false }); return; }
      if (!e) await completo(); else await sincronizar();
      pon({ preparando: false });
    })();
    return () => { vivo.current = false; };
  }, [sesion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Cada puerta_sync_seg (y al volver la señal).
  useEffect(() => {
    if (o.activo === false) return;
    let t: ReturnType<typeof setTimeout>;
    const vuelta = async () => { await sincronizar(); t = setTimeout(vuelta, Math.max(5, seg.current) * 1000); };
    t = setTimeout(vuelta, Math.max(5, seg.current) * 1000);
    const on = () => void sincronizar(), off = () => sinSenal();
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { clearTimeout(t); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [sincronizar, sinSenal, o.activo]);

  /* Un escaneo sin señal: decide con el paquete, lo anota y lo pone en la cola (mismo id, hora del teléfono). */
  const escanear = useCallback(async (c: Record<string, unknown>): Promise<ResEscaneo | { ok: true; res: string; k: number }> => {
    const e = est.current, id = String(c.id ?? ""), dir = c.dir === "out" ? "out" : "in", n = c.n == null ? null : Number(c.n), at = Number(c.at) || Date.now();
    if (!e) return { ok: false, msg: { es: "Sin señal y sin la lista de esta puerta: busca por nombre cuando vuelva la señal.", en: "No signal and no list for this door: search by name when the signal is back." } };
    if (c.tipo === "contar") {
      await L.encolar(sesion, { id, at, tipo: "contar", dir, n: 1, entro: true, res: "count" });
      await contar();
      return { ok: true, res: "count", k: 1 };
    }
    if (c.tipo === "rsvp") {
      const k = Math.max(1, Math.min(20, n ?? 1));
      await L.encolar(sesion, { id, at, tipo: "rsvp", rsvp: String(c.rsvp ?? ""), dir: "in", n: k, entro: true, res: "valid" });
      await L.guardarEstado(sesion, L.anotarRsvp(e, String(c.rsvp ?? ""), k));
      await contar();
      return { ok: true, res: "valid", k } as unknown as ResEscaneo;
    }
    let tid: string | null = null, ver: number | null = null, qrFecha: string | null = null, firma: "ok" | "formato" | "llave" | "firma" = "ok";
    if (c.tipo === "qr") {
      const q = await L.verificarQR(String(c.qr ?? ""));
      if (q.ok) { tid = q.id; ver = q.ver; qrFecha = q.fecha; } else firma = q.motivo;
    } else tid = String(c.boleto ?? "") || null;
    const r = L.decidir(e, { id, tid, qrFecha, ver, firma, dir, n, previo: c.previo === true, manual: c.tipo === "boleto" }, es);
    if ("pregunta" in r) return { ok: true, pregunta: r.pregunta as Pregunta };
    const v = r.v, entro = v.res === "valid" || v.res === "manual";
    await L.encolar(sesion, { id, at, tipo: c.tipo === "boleto" ? "boleto" : "qr", qr: c.tipo === "qr" ? String(c.qr ?? "") : undefined, boleto: c.tipo === "boleto" ? String(c.boleto ?? "") : undefined,
      motivo: c.tipo === "boleto" ? String(c.motivo ?? "") : undefined, dir, n: entro ? v.k : Math.max(1, n ?? 1), entro, res: v.res });
    if (entro) await L.guardarEstado(sesion, L.anotar(e, tid, v, o.puerta, r.fila ? undefined : { tipo: -1 }));
    await contar();
    return { ok: true, v };
  }, [es, o.puerta, sesion, contar]);

  /* Lo que se decidió EN LÍNEA también queda en el paquete (si la señal se va un minuto después, este teléfono ya lo sabe). */
  const notar = useCallback((c: Record<string, unknown>, r: ResEscaneo) => {
    const e = est.current;
    if (!e || !r.ok || !("v" in r)) return;
    const v: VistaEscaneo = r.v;
    void (async () => {
      let tid: string | null = c.tipo === "boleto" ? String(c.boleto ?? "") : null;
      if (c.tipo === "qr") { const q = await L.verificarQR(String(c.qr ?? "")); if (q.ok) tid = q.id; }
      if (tid) await L.guardarEstado(sesion, L.anotar(e, tid, v, o.puerta));
    })().catch(() => undefined);
  }, [o.puerta, sesion]);

  const buscar = useCallback(async (q: string) => (est.current ? L.buscarLocal(est.current, q) : { b: [], r: [] }), []);
  const tipoDe = useCallback((i: number) => { const t = est.current?.tipos[i]; return t ? (es ? t.es : t.en || t.es) : ""; }, [es]);
  /* Cerrar la puerta: primero sube todo; si queda algo sin subir, no se cierra (se perdería). Después, nada queda en el teléfono. */
  const cerrar = useCallback(async () => {
    const al = await sincronizar().catch(() => false);
    if (!al && (await L.cuantosEnCola(sesion)) > 0) return false;
    await L.borrarSesion(sesion).catch(() => undefined);
    est.current = null;
    return true;
  }, [sincronizar, sesion]);
  return { ...st, escanear, notar, buscar, tipoDe, sincronizar, cerrar };
}

/* Una puerta que ya no está abierta para esta persona: lo que quedó en su cola se sube (la base lo acepta si se cerró por ella, el panel o
   el barrido y no venció; revocada = no) y después se borra todo de esa puerta. Sin señal: se intenta la próxima vez (sigue cifrado). */
export async function soltarSesion(s: string): Promise<boolean> {
  try {
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      const C = await L.cola(s);
      if (!C.length) break;
      const lote = C.slice(0, 200), r = await post("/api/puerta/escanear", { tipo: "cola", sesion: s, ahora: Date.now(), escaneos: lote });
      if (!r) return false;
      if (!r.j.ok) break;                                   // revocada, vencida o ajena: lo que quedó ya no cuenta
      const h = ((r.j.hechos as unknown[]) ?? []).length;
      await L.quitarDeCola(lote.slice(0, h).map((x) => x.id));
      if (h < lote.length) return false;
    }
    await L.borrarSesion(s);
    return true;
  } catch { return false; }
}
/* /puerta (con señal): lo guardado de puertas que ya no están abiertas para esta persona se sube y se borra. */
export async function limpiarSesiones(abiertas: string[]) {
  try { for (const x of await L.sesionesGuardadas()) if (!abiertas.includes(x.s)) await soltarSesion(x.s); } catch { /* sin almacenamiento */ }
}
