"use client";
/* 6h · El QR del cliente sin señal (fase6-eventos.md §3 «El QR»: «El QR del cliente se guarda en su teléfono para mostrarlo sin señal»;
   Mi cuenta L561 «Si no hay señal, el código funciona igual»; LAUNCH 6c).
   - Al abrir un boleto con señal, su QR (la matriz), el código, el tipo, el nombre del boleto y el evento se guardan en IndexedDB
     «tl-boletos» CIFRADOS (AES-GCM) con una llave que sale de la cookie tl_bk de ESTA sesión de la cuenta (la pone el servidor al entrar,
     solo para /cuenta/boletos; se borra al salir). Sin precio ni datos de pago.
   - Salir de la cuenta borra la base y la cookie: aunque algo quedara, sin la cookie no se lee. Otra cuenta en el mismo teléfono tiene otra
     cookie: lo de la cuenta anterior no se descifra y se borra al primer intento.
   - El service worker /sw-boletos.js solo guarda la cáscara estática /cuenta/boletos/sin-conexion; nunca el HTML de un boleto.
   8a · Dónde se guarda: lib/nativo/almacen.ts (IndexedDB «tl-boletos» en la web, TLLocal en la app To'Latino). En la app, la isla sin señal
   vive en otro origen y no ve la cookie tl_bk: la app guarda una copia de ESA llave en TLLocal (llavero del teléfono) al abrir Mis boletos
   con la sesión, y la cambia (borrando lo guardado) si la cookie cambia o ya no está: otra cuenta en el mismo teléfono no lee nada. */
import { BOLETOS, olvidarTodo } from "./nativo/almacen";
import { enIsla, esApp } from "./nativo/puente";

const ALM = BOLETOS();
type Cif = { code: string; kid: string; dia: string; iv: Uint8Array<ArrayBuffer>; c: ArrayBuffer };
export type BoletoGuardado = { code: string; filas: string[]; tipo: string; nombre: string; estado: string; estadoBg: string; estadoFg: string; titulo: string; cuando: string; lugar: string; dia: string };

function cookie(): string | null {
  const m = /(?:^|;\s*)tl_bk=([A-Za-z0-9_-]{40,60})/.exec(typeof document === "undefined" ? "" : document.cookie);
  return m ? m[1]! : null;
}
/* La llave de la sesión: la cookie (web y app servida); en la isla de la app, su copia en el llavero del teléfono. */
async function llaveSesion(): Promise<string | null> {
  if (!esApp()) return cookie();
  if (enIsla()) return (await ALM.leer<{ v?: string }>("meta", "bk"))?.v ?? null;
  const c = cookie(), m = (await ALM.leer<{ v?: string }>("meta", "bk"))?.v ?? null;
  if (c !== m) { await ALM.vaciar("b"); if (c) await ALM.poner("meta", { k: "bk", v: c }); else await ALM.quitar("meta", "bk"); }
  return c;
}
async function llave(v: string): Promise<{ k: CryptoKey; kid: string }> {
  const raw = Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((v.length + 3) % 4)), (c) => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey", "deriveBits"]);
  const k = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("tl:boletos-sin-conexion:v1"), info: new TextEncoder().encode("qr") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const id = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("tl:boletos-sin-conexion:v1"), info: new TextEncoder().encode("kid") }, base, 64));
  return { k, kid: Array.from(id).map((x) => x.toString(16).padStart(2, "0")).join("") };
}
const hoy = () => new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);

/* La matriz del QR en texto corto (una fila = hex de sus módulos). */
export const filasDe = (m: boolean[][]) => m.map((f) => { let s = ""; for (let i = 0; i < f.length; i += 4) s += ((f[i] ? 8 : 0) | (f[i + 1] ? 4 : 0) | (f[i + 2] ? 2 : 0) | (f[i + 3] ? 1 : 0)).toString(16); return s; });
export const matrizDe = (filas: string[]) => { const n = filas.length; return filas.map((s) => Array.from({ length: n }, (_, i) => ((parseInt(s[i >> 2] ?? "0", 16) >> (3 - (i & 3))) & 1) === 1)); };

/* Guarda (o quita) el boleto que se ve con señal. Sin la cookie de la sesión, nada se guarda. */
export async function guardarBoleto(b: BoletoGuardado | null, code: string) {
  try {
    const v = await llaveSesion();
    if (!v) { await ALM.vaciar("b"); return; }
    const { k, kid } = await llave(v);
    for (const x of await ALM.todos<Cif>("b")) if (x.kid !== kid || x.dia < hoy()) await ALM.quitar("b", x.code);   // de otra cuenta o ya pasó
    if (!b) { await ALM.quitar("b", code); return; }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(b)));
    await ALM.poner("b", { code: b.code, kid, dia: b.dia, iv, c } satisfies Cif);
  } catch { /* sin almacenamiento: el boleto sigue en la app con señal */ }
}
/* Los boletos guardados de ESTA cuenta (sin la cookie: ninguno, y se borra lo que haya). */
export async function leerBoletos(): Promise<BoletoGuardado[]> {
  try {
    const v = await llaveSesion();
    if (!v) { await ALM.vaciar("b"); return []; }
    const { k, kid } = await llave(v), out: BoletoGuardado[] = [];
    const L = await ALM.todos<Cif>("b");
    for (const x of L) {
      if (x.kid !== kid || x.dia < hoy()) { await ALM.quitar("b", x.code); continue; }
      try { out.push(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: x.iv }, k, x.c))) as BoletoGuardado); } catch { /* no se lee: fuera */ }
    }
    return out.sort((a, b) => a.dia.localeCompare(b.dia));
  } catch { return []; }
}
/* El idioma de la app (no es un dato de la persona): la cáscara sin señal habla igual que la app. */
export function recordarIdioma(es: boolean) { try { localStorage.setItem("tl-idioma-sin-senal", es ? "es" : "en"); } catch { /* sin almacenamiento */ } }
export function idiomaGuardado(): boolean { try { const v = localStorage.getItem("tl-idioma-sin-senal"); if (v) return v === "es"; } catch { /* nada */ } return !/^en/i.test(typeof navigator === "undefined" ? "es" : navigator.language ?? "es"); }
export function registrarSWBoletos() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw-boletos.js", { scope: "/cuenta/boletos" }).then((r) => { (r.active ?? r.waiting ?? r.installing)?.postMessage?.({ t: "preparar" }); }).catch(() => undefined);
}
/* Salir de la cuenta (y To'Latino Puerta): nada de boletos ni de puertas queda en el teléfono. */
export async function olvidarSinConexion() { await olvidarTodo(); }
