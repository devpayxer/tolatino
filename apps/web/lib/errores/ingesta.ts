import "server-only";
import { huella as hmac } from "../cifrado";
import { leerRotulo } from "../app-nativa-comun";
import { valores } from "../config";
import { db, tx } from "../db";
import { huellaError, simbolizar } from "./huella";
import { familiaRuta, normalizar, taparError } from "./tapar";

/* 8f · Recibir un error de la web o de una app, o un cierre nativo de la vez anterior (fase8-apps.md §4 8f). Es una puerta SIN SESIÓN, así que:
   - Tamaño: el cuerpo se corta a 32 KB (la ruta lo revisa antes de leerlo); cada campo tiene su tope ANTES de tapar.
   - Límite: por minuto, en todo el sistema (errores_por_minuto), por teléfono o navegador (cookie tl_dev; errores_por_dispositivo) y por
     conexión (4× eso). En memoria del proceso (lo que se pasa se descarta y se cuenta); la base no recibe nada de lo descartado.
   - Solo se guardan campos conocidos (tipo, nombre, mensaje, stack, ruta); lo demás que mande el teléfono se ignora. Nunca el valor de un campo,
     la URL, la persona ni la operación: todo pasa por taparError() y la ruta queda en su familia. La sesión es una huella que cambia cada día.
   - Un cierre o error nativo solo se acepta de una app (rótulo TLApp); de la web, solo «js» y «red».
   - La huella del grupo sale del texto YA tapado y simbolizado (lib/errores/huella.ts). El grupo y sus cifras los lleva la base (0127). */
export type Entrada = { ua: string | null; dev: string | null; ip: string | null; cuerpo: unknown };
export type Recibido = { ok: true; grupo: string } | { ok: false; por: "apagado" | "limite" | "invalido" | "error" };

const ventana = { min: 0, global: 0, por: new Map<string, number>(), descartados: 0, desde: Date.now() };
/* Lo descartado por el tope desde que arrancó este proceso (Super Admin › Salud lo dice). */
export const descartados = () => ({ n: ventana.descartados, desde: new Date(ventana.desde).toISOString() });

function permitir(dev: string | null, ip: string | null, lim: { global: number; dev: number }): boolean {
  const m = Math.floor(Date.now() / 60_000);
  if (ventana.min !== m) { ventana.min = m; ventana.global = 0; ventana.por.clear(); }
  const kd = dev ? `d:${dev}` : null, ki = ip ? `i:${ip}` : "i:?";
  if (ventana.global >= lim.global || (kd && (ventana.por.get(kd) ?? 0) >= lim.dev) || (ventana.por.get(ki) ?? 0) >= lim.dev * 4 || ventana.por.size > 100_000) {
    ventana.descartados++;
    return false;
  }
  ventana.global++;
  if (kd) ventana.por.set(kd, (ventana.por.get(kd) ?? 0) + 1);
  ventana.por.set(ki, (ventana.por.get(ki) ?? 0) + 1);
  return true;
}

let interruptor: { at: number; on: boolean } | null = null;
async function encendido(): Promise<boolean> {
  if (interruptor && Date.now() - interruptor.at < 15_000) return interruptor.on;
  const on = (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'app.errores'`).catch(() => ({ rows: [] as { enabled: boolean }[] }))).rows[0]?.enabled === true;
  interruptor = { at: Date.now(), on };
  return on;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const TIPOS = new Set(["js", "red", "cierre", "nativo"]);

/* El teléfono o el navegador, en pocas palabras (nunca la cadena entera del user-agent). */
export function equipo(ua: string): { os: string | null; modelo: string | null } {
  const ios = /(?:iPhone|iPad|iPod).*? OS (\d{1,2})[_.](\d{1,2})/.exec(ua);
  if (ios) return { os: `iOS ${ios[1]}.${ios[2]}`, modelo: /iPad/.test(ua) ? "iPad" : "iPhone" };
  const and = /Android (\d{1,2}(?:\.\d{1,2})?)(?:; ([^;)]{1,40}?))?(?: Build[^;)]*)?\)/.exec(ua);
  if (and) { const m = (and[2] ?? "").replace(/[^A-Za-z0-9 ._-]/g, "").trim(); return { os: `Android ${and[1]}`, modelo: m && m !== "K" && !/^wv$/i.test(m) ? m.slice(0, 40) : "Android" }; }
  const so = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : null;
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return { os: so, modelo: so ? `${so} · ${nav}` : nav };
}

export async function recibirError(e: Entrada): Promise<Recibido> {
  if (!(await encendido())) return { ok: false, por: "apagado" };
  const lim = await valores("errores_por_minuto", "errores_por_dispositivo");
  if (!permitir(e.dev, e.ip, { global: lim.errores_por_minuto, dev: lim.errores_por_dispositivo })) return { ok: false, por: "limite" };
  const b = (e.cuerpo && typeof e.cuerpo === "object" ? e.cuerpo : {}) as Record<string, unknown>;
  const tipo = String(b.tipo ?? "");
  if (!TIPOS.has(tipo)) return { ok: false, por: "invalido" };
  const ua = String(e.ua ?? "").slice(0, 600), app = leerRotulo(ua);
  if ((tipo === "cierre" || tipo === "nativo") && !app) return { ok: false, por: "invalido" };
  const nombre = texto(b.nombre, 80).replace(/[^A-Za-z0-9_$. ]/g, "").trim();
  // Chrome antepone «Uncaught » al mensaje de un ErrorEvent; el nombre ya va aparte.
  const mensaje = taparError(texto(b.mensaje, 2000).replace(/^Uncaught\s+(?:\(in promise\)\s+)?/, ""), 500);
  const crudo = taparError(texto(b.stack, 16384), 16384);
  if (!mensaje && !crudo) return { ok: false, por: "invalido" };
  const ruta = familiaRuta(b.ruta);
  // Lo nuestro de /_next/static se simboliza con los mapas del servidor; el resultado se vuelve a tapar (nombres de función y archivos).
  const s = tipo === "js" || tipo === "red" ? await simbolizar(crudo) : { stack: crudo, cuadros: [], ok: false };
  const stack = taparError(s.stack, 16384);
  const titulo = (normalizar(`${nombre && !mensaje.startsWith(`${nombre}:`) ? `${nombre}: ` : ""}${mensaje || stack.split("\n")[0] || "?"}`).slice(0, 200)) || "?";
  const plataforma = app?.plataforma ?? "web", clave = app?.app ?? "web";
  const fp = huellaError({ app: clave, plataforma, tipo, titulo, cuadros: s.cuadros, stackNativo: stack });
  const eq = equipo(ua);
  const release = app ? String(app.build) : (process.env.TOLATINO_COMMIT ?? "local").replace(/[^a-f0-9a-z]/gi, "").slice(0, 12) || "local";
  const dia = new Date().toISOString().slice(0, 10), sesion = hmac(`errores:${dia}:${e.dev ?? e.ip ?? "?"}`).slice(0, 32);
  const prueba = process.env.TOLATINO_ENTORNO !== "produccion";
  try {
    const id = await tx(async (c) => {
      let g = (await c.query<{ id: string }>(
        `insert into app_error_groups (fingerprint, app, platform, kind, title) values ($1, $2, $3, $4, $5) on conflict (fingerprint) do nothing returning id::text`,
        [fp, clave, plataforma, tipo, titulo])).rows[0]?.id;
      g ??= (await c.query<{ id: string }>(`select id::text from app_error_groups where fingerprint = $1`, [fp])).rows[0]!.id;
      await c.query(
        `insert into app_error_events (group_id, release, build, app_version, os_version, device_model, route_family, message, stack, symbolicated, session_hash, is_test)
         values ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [g, release, app?.build ?? null, app?.version ?? null, eq.os, eq.modelo, ruta, mensaje || null, stack || null, s.ok, sesion, prueba]);
      return g;
    });
    return { ok: true, grupo: id };
  } catch {
    // La base rechazó algo que el tapado dejó pasar (un correo, un teléfono, una tarjeta): no se guarda nada.
    return { ok: false, por: "error" };
  }
}
