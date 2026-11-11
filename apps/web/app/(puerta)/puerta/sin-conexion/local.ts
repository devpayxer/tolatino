"use client";
/* 6h · To'Latino Puerta sin señal: lo que vive en el teléfono (fase6-eventos.md §3 «Sin conexión y varios porteros», §4 6h).
   - IndexedDB «tl-puerta»: por sesión de puerta, la LLAVE (CryptoKey AES-GCM NO exportable: el navegador no la deja sacar), el PAQUETE y la
     COLA de escaneos, los dos CIFRADOS con esa llave (sin la sesión no se leen). Las llaves públicas Ed25519 (no son secretas) y el idioma.
   - El paquete llega del servidor firmado (Ed25519, prefijo TLPK1) y cifrado con la llave de la sesión: se descifra, se verifica la firma con
     la llave pública ANTES de usarlo y se guarda cifrado otra vez (con los cambios locales). Un paquete vencido no se usa y se borra.
   - Validar sin señal: la firma del QR con la llave pública (WebCrypto Ed25519 o @noble/ed25519 dentro del repo), la versión, el estado,
     los días y las entradas del paquete + los escaneos de este teléfono. Lo mismo que en línea: un QR falso, viejo, devuelto, anulado, en
     transferencia, de otro día o de otro evento NO entra. Cada escaneo va a la cola con su id (uuid del teléfono) y la hora del teléfono.
   - Cerrar la puerta, perder el acceso, revocar el teléfono, vencer el paquete o salir de la cuenta borra todo de esta sesión (o todo).
   Nada aquí cobra ni ve montos, teléfonos ni correos (D1). */
import { verifyAsync } from "@/lib/ed25519/noble";
import type { FilaPaqB, FilaPaqR, Paquete } from "@/lib/puerta-paquete";
import type { Pregunta, Resultado, Tono, VistaEscaneo } from "@/lib/puerta-comun";
import { RESULTADO } from "@/lib/puerta-comun";
import { PUERTA } from "@/lib/nativo/almacen";

/* 8a · Dónde se guarda: lib/nativo/almacen.ts (IndexedDB «tl-puerta» en la web, TLLocal en la app To'Latino Puerta). La lógica no cambia. */
const ALM = PUERTA();
type Cifrado = { iv: Uint8Array<ArrayBuffer>; c: ArrayBuffer };
type FilaPaq = { s: string; vence: string; emitido: string; cursor: string; n: number; datos: Cifrado };
type FilaCola = { id: string; s: string; at: number; datos: Cifrado };
export type ItemCola = { id: string; at: number; tipo: "qr" | "boleto" | "rsvp" | "contar"; qr?: string; boleto?: string; rsvp?: string; motivo?: string; dir: "in" | "out"; n: number; entro: boolean; res: Resultado };

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
const b64url = (s: string) => b64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
/* ── Llave de la sesión (no exportable) ── */
export async function guardarLlave(s: string, raw: string): Promise<CryptoKey> { return ALM.guardarLlave("llaves", s, b64(raw)); }
export async function llaveDe(s: string): Promise<CryptoKey | null> { return ALM.llave("llaves", s); }
async function cifrar(k: CryptoKey, o: unknown): Promise<Cifrado> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv, c: await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(o))) };
}
async function descifrar<T>(k: CryptoKey, x: Cifrado): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: x.iv }, k, x.c))) as T;
}

/* ── Llaves públicas Ed25519 (no secretas) ── */
export async function guardarPublicas(m: Record<string, string>) { await ALM.poner("meta", { k: "pub", v: m }); }
export async function publicas(): Promise<Record<string, string>> { return (await ALM.leer<{ v?: Record<string, string> }>("meta", "pub"))?.v ?? {}; }
export async function guardarMeta(k: string, v: unknown) { await ALM.poner("meta", { k, v }); }
export async function meta<T>(k: string): Promise<T | null> { return (await ALM.leer<{ v?: T }>("meta", k))?.v ?? null; }

const llavesEd = new Map<string, CryptoKey | null>();
async function verificarEd(pub: string, msg: Uint8Array<ArrayBuffer>, sig: Uint8Array<ArrayBuffer>): Promise<boolean> {
  const crudo = b64url(pub);
  if (!llavesEd.has(pub)) {
    try { llavesEd.set(pub, await crypto.subtle.importKey("raw", crudo, { name: "Ed25519" }, false, ["verify"])); }
    catch { llavesEd.set(pub, null); }
  }
  const k = llavesEd.get(pub);
  try {
    if (k) return await crypto.subtle.verify({ name: "Ed25519" }, k, sig, msg);
    return await verifyAsync(sig, msg, crudo);   // sin Ed25519 en WebCrypto: la librería abierta dentro del repo
  } catch { return false; }
}

/* ── El QR (igual que lib/boletos-qr.ts: TL1.<kid>.<boleto>.<fecha>.<versión>.<entradas>.<firma>) ── */
const RE = /^TL1\.([a-f0-9]{8})\.(\d{1,18})\.(\d{1,18})\.(\d{1,6})\.(\d{1,2})\.([A-Za-z0-9_-]{86})$/;
export type QRLocal = { ok: true; id: string; fecha: string; ver: number; admits: number } | { ok: false; motivo: "formato" | "llave" | "firma" };
export async function verificarQR(texto: string): Promise<QRLocal> {
  const m = RE.exec(String(texto ?? "").trim());
  if (!m) return { ok: false, motivo: "formato" };
  const pub = (await publicas())[m[1]!];
  if (!pub) return { ok: false, motivo: "llave" };
  const msg = `TL1.${m[1]}.${m[2]}.${m[3]}.${m[4]}.${m[5]}`;
  return (await verificarEd(pub, new TextEncoder().encode(msg), b64url(m[6]!))) ? { ok: true, id: m[2]!, fecha: m[3]!, ver: Number(m[4]), admits: Number(m[5]) } : { ok: false, motivo: "firma" };
}

/* ── El paquete ── */
export type Estado = Paquete & { recibido: number };
async function abrirSobre(k: CryptoKey, iv: string, c: string, gz: boolean): Promise<Paquete> {
  let plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(iv) }, k, b64(c));
  if (gz) plano = await new Response(new Blob([plano]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  const sobre = JSON.parse(new TextDecoder().decode(plano)) as { j: string; kid: string; sig: string };
  const pub = (await publicas())[sobre.kid];
  // Firmado por To'Latino o no se usa (un paquete alterado en el teléfono no pasa).
  if (!pub || !(await verificarEd(pub, new TextEncoder().encode(`TLPK1\n${sobre.j}`), b64url(sobre.sig)))) throw new Error("paquete_firma");
  return JSON.parse(sobre.j) as Paquete;
}
/* El paquete que llegó del servidor (todo o los cambios): descifrar, verificar, mezclar y guardar cifrado. */
export async function recibir(s: string, r: { iv: string; c: string; gz: boolean; delta: boolean }, previo: Estado | null): Promise<Estado> {
  const k = await llaveDe(s);
  if (!k) throw new Error("sin_llave");
  const p = await abrirSobre(k, r.iv, r.c, r.gz);
  if (p.s !== s) throw new Error("paquete_ajeno");
  let e: Estado;
  if (!r.delta || !previo) e = { ...p, recibido: Date.now() };
  else {
    // Los cambios reemplazan la fila entera (estado, versión, entradas…): lo que dice el servidor manda.
    const B = new Map(previo.b.map((x) => [x[0], x])), R = new Map(previo.r.map((x) => [x[0], x]));
    const tipos = [...previo.tipos], idx = new Map(tipos.map((t, i) => [JSON.stringify(t), i]));
    const re = (i: number) => { if (i < 0) return -1; const t = p.tipos[i]!, kk = JSON.stringify(t); if (!idx.has(kk)) { idx.set(kk, tipos.length); tipos.push(t); } return idx.get(kk)!; };
    for (const x of p.b) { const y = [...x] as FilaPaqB; y[8] = re(x[8]); B.set(x[0], y); }
    for (const x of p.r) R.set(x[0], x);
    e = { ...previo, emitido: p.emitido, cursor: p.cursor, vence: p.vence, reglas: p.reglas, ev: p.ev, fechas: p.fechas, sync: p.sync, tipos, b: [...B.values()], r: [...R.values()], recibido: Date.now() };
  }
  await guardarEstado(s, e);
  return e;
}
export async function guardarEstado(s: string, e: Estado) {
  const k = await llaveDe(s);
  if (!k) throw new Error("sin_llave");
  const fila: FilaPaq = { s, vence: e.vence, emitido: e.emitido, cursor: e.cursor, n: e.b.length + e.r.length, datos: await cifrar(k, e) };
  await ALM.poner("paquetes", fila);
}
/* El paquete guardado de una sesión (null si no hay, no se puede leer o venció: entonces se borra todo de esa sesión). */
export async function leerEstado(s: string): Promise<Estado | null> {
  const f = await ALM.leer<FilaPaq>("paquetes", s);
  if (!f) return null;
  if (Date.parse(f.vence) < Date.now()) { await borrarSesion(s); return null; }
  const k = await llaveDe(s);
  if (!k) { await borrarSesion(s); return null; }
  try { return await descifrar<Estado>(k, f.datos); } catch { await borrarSesion(s); return null; }
}
/* Las sesiones guardadas en este teléfono (para la pantalla sin señal). */
export async function sesionesGuardadas(): Promise<{ s: string; vence: string; emitido: string; n: number }[]> {
  const L = await ALM.todos<FilaPaq>("paquetes");
  const vivas = [];
  for (const f of L) { if (Date.parse(f.vence) < Date.now()) await borrarSesion(f.s); else vivas.push({ s: f.s, vence: f.vence, emitido: f.emitido, n: f.n }); }
  return vivas;
}

/* ── La cola (cifrada) ── */
export async function encolar(s: string, x: ItemCola) {
  const k = await llaveDe(s);
  if (!k) throw new Error("sin_llave");
  const f: FilaCola = { id: x.id, s, at: x.at, datos: await cifrar(k, x) };
  await ALM.poner("cola", f);
}
export async function cola(s: string): Promise<ItemCola[]> {
  const k = await llaveDe(s);
  if (!k) return [];
  const L = (await ALM.porIndice<FilaCola>("cola", s)).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const out: ItemCola[] = [];
  for (const f of L) { try { out.push(await descifrar<ItemCola>(k, f.datos)); } catch { /* dañada: no se manda */ } }
  return out;
}
export async function cuantosEnCola(s: string): Promise<number> { return ALM.contar("cola", s); }
export async function quitarDeCola(ids: string[]) {
  for (const id of ids) await ALM.quitar("cola", id);
}

/* ── Borrar ── */
export async function borrarSesion(s: string) {
  await ALM.quitar("llaves", s).catch(() => undefined);
  await ALM.quitar("paquetes", s).catch(() => undefined);
  for (const f of await ALM.porIndice<FilaCola>("cola", s).catch(() => [] as FilaCola[])) await ALM.quitar("cola", f.id).catch(() => undefined);
}
/* Salir de la cuenta: nada de la puerta queda en el teléfono. */
export async function borrarTodo() { await ALM.borrarTodo(); }

/* ── Decidir sin señal (las mismas reglas que puerta_entrada) ── */
export type LocalRes = { ok: true; v: VistaEscaneo; fila: string | null } | { ok: true; pregunta: Pregunta & { fuera?: boolean }; fila: string | null };
const TONO: Record<Resultado, Tono> = Object.fromEntries(Object.entries(RESULTADO).map(([k, v]) => [k, v.tono])) as Record<Resultado, Tono>;
const bi = (x: { es: string; en: string } | undefined, es: boolean) => (x ? (es ? x.es : x.en || x.es) : "");
export function horaLocal(tz: string, d = new Date()): string {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d); } catch { return d.toTimeString().slice(0, 5); }
}
function hora12(hhmm: string | null) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "";
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
type Pedido = { id: string; tid: string | null; qrFecha: string | null; ver: number | null; firma: "ok" | "formato" | "llave" | "firma"; dir: "in" | "out"; n: number | null; previo: boolean; manual: boolean };
export function decidir(e: Estado, x: Pedido, es: boolean): LocalRes {
  const R = e.reglas, fila = x.tid ? e.b.find((b) => b[0] === x.tid) ?? null : null;
  const vista = (res: Resultado, o: Partial<VistaEscaneo> = {}): LocalRes => ({ ok: true, fila: fila?.[0] ?? null, v: {
    id: x.id, res, tono: TONO[res], dir: x.dir, k: 0, de: fila?.[2] ?? 0, entraron: fila?.[10] ?? 0, nombre: fila?.[4] ?? null, tipo: fila ? (fila[9] & 2 ? (es ? "Cortesía" : "Comp") : bi(e.tipos[fila[8]], es) || null) : null,
    code: null, cortesia: !!fila && !!(fila[9] & 2), transferido: !!fila && !!(fila[9] & 4), mesa: fila && fila[9] & 1 ? { zona: bi(e.tipos[fila[8]], es), numero: null } : null,
    edad: R.edad, pideId: R.pideId, ya: null, vale: null, reentrada: R.reentrada, sinSenal: true, ...o } });
  if (x.firma !== "ok") return vista(x.firma === "formato" ? "not_found" : "forged");
  if (!fila) {
    // Firmado por To'Latino pero no está en la lista de este teléfono.
    if (x.qrFecha && x.qrFecha !== e.f && e.fechas.includes(x.qrFecha) && !R.span) return vista("wrong_day");
    if (!x.qrFecha || (x.qrFecha !== e.f && !e.fechas.includes(x.qrFecha))) return vista("wrong_event");
    // Se vendió después de la última lista: se pregunta (si entra, el servidor lo revisa al volver la señal).
    if (x.dir === "in" && x.previo) return { ok: true, fila: null, pregunta: { id: x.id, quedan: 1, de: 1, entraron: 0, nombre: null, tipo: null, mesa: null, edad: R.edad, pideId: R.pideId && R.edad > 0, cortesia: false, transferido: false, reentrada: R.reentrada, fuera: true } };
    return x.dir === "in" ? { ...vista("valid", { k: 1, de: 1, entraron: 1 }) } : vista("not_inside");
  }
  const st = fila[3];
  if (st === "void" || st === "cancelled") return vista("void");
  if (st === "refunded") return vista("refunded");
  if (st === "replaced" || (x.ver != null && x.ver !== fila[1])) return vista("replaced");
  if (st === "pending") return vista("pending_transfer");
  if (R.span && fila[7] && !fila[7].includes(e.di)) return vista("wrong_day", { vale: fila[7].map((d) => (es ? `Día ${d + 1}` : `Day ${d + 1}`)).join(" · ") });
  const de = fila[2], ent = fila[10], dentro = fila[11];
  if (x.dir === "out") {
    if (!R.reentrada) return vista("no_reentry");
    if (dentro <= 0) return vista("not_inside");
    return vista("valid", { k: Math.min(x.n ?? dentro, dentro) });
  }
  if (R.cierre && Date.now() > Date.parse(R.cierre)) return vista("door_closed");
  const ya = fila[12] ? { puerta: fila[12], hora: hora12(fila[13]) } : null;
  if (ent < de) {
    const quedan = de - ent;
    if (x.previo && (quedan > 1 || (R.pideId && R.edad > 0))) return { ok: true, fila: fila[0], pregunta: { id: x.id, quedan, de, entraron: ent, nombre: fila[4], tipo: fila[9] & 2 ? (es ? "Cortesía" : "Comp") : bi(e.tipos[fila[8]], es) || null,
      mesa: fila[9] & 1 ? bi(e.tipos[fila[8]], es) : null, edad: R.edad, pideId: R.pideId && R.edad > 0, cortesia: !!(fila[9] & 2), transferido: !!(fila[9] & 4), reentrada: R.reentrada } };
    const k = Math.max(1, Math.min(x.n ?? quedan, quedan));
    return vista(x.manual ? "manual" : "valid", { k, entraron: ent + k });
  }
  if (R.reentrada && dentro < ent) { const q = ent - dentro, k = Math.max(1, Math.min(x.n ?? q, q)); return vista(x.manual ? "manual" : "valid", { k, entraron: ent }); }
  return vista("already_used", { ya });
}
/* Lo que el teléfono hizo queda en su paquete (para el siguiente escaneo sin señal): entraron, adentro, puerta y hora. */
export function anotar(e: Estado, tid: string | null, v: VistaEscaneo, puerta: string, nuevo?: { tipo: number }): Estado {
  if (!tid || (v.res !== "valid" && v.res !== "manual")) return e;
  let f = e.b.find((b) => b[0] === tid);
  if (!f && nuevo) { f = [tid, 1, 1, "valid", "—", "", "", null, nuevo.tipo, 0, 0, 0, null, null]; e.b.push(f); }
  if (!f) return e;
  if (v.dir === "out") f[11] = Math.max(0, f[11] - v.k);
  else {
    const primeras = Math.max(0, Math.min(v.k, f[2] - f[10]));
    f[10] += primeras; f[11] = Math.min(f[10], f[11] + v.k);
    f[12] = puerta; f[13] = horaLocal(e.ev.tz);
    if (f[3] === "valid") f[3] = "used";
  }
  return e;
}
/* Una RSVP que llega sin señal. */
export function anotarRsvp(e: Estado, rid: string, n: number): Estado { const r = e.r.find((x) => x[0] === rid); if (r) { r[4] = Math.min(r[1], r[4] + n); if (r[2] === "going" || r[2] === "expired") r[2] = "attended"; } return e; }

/* ── Buscar sin señal: nombre, últimos 4 o el código completo (huella) ── */
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export async function buscarLocal(e: Estado, q: string): Promise<{ b: FilaPaqB[]; r: FilaPaqR[] }> {
  const s = q.replace(/\s+/g, " ").trim();
  if (s.length < 2) return { b: [], r: [] };
  const Q = s.toUpperCase().replace(/\s/g, "");
  if (/^TL-?[A-Z0-9]{3}-?\d{4}$/.test(Q)) {
    const code = `TL-${Q.replace(/^TL-?/, "").replace(/-/g, "").slice(0, 3)}-${Q.slice(-4)}`;
    const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)))).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
    return { b: e.b.filter((x) => x[6] === h).slice(0, 20), r: [] };
  }
  if (/^\d{4}$/.test(Q)) return { b: e.b.filter((x) => x[5] === Q).slice(0, 20), r: [] };
  const n = norm(s);
  return { b: e.b.filter((x) => norm(x[4]).includes(n)).slice(0, 20), r: e.r.filter((x) => norm(x[3]).includes(n)).slice(0, 20) };
}
