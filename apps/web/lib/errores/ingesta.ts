import "server-only";
import { alCambiarConfig } from "../cambios-config";
import { huella as hmac } from "../cifrado";
import { leerRotulo } from "../app-nativa-comun";
import { valores } from "../config";
import { db, tx } from "../db";
import { dentroDelTope, sumaReciente, sumarTope } from "../topes";
import { huellaError, simbolizar } from "./huella";
import { familiaRuta, normalizar, taparError } from "./tapar";

/* 8f · Recibir un error de la web o de una app, o un cierre nativo de la vez anterior (fase8-apps.md §4 8f). Es una puerta SIN SESIÓN, así que:
   - Tamaño: el cuerpo se corta a 32 KB (la ruta lo revisa antes de leerlo); cada campo tiene su tope ANTES de tapar.
   - Límite: por minuto, en todo el sistema (errores_por_minuto), por teléfono o navegador (cookie tl_dev; errores_por_dispositivo) y por
     conexión (4× eso). Compartido entre los procesos (lib/topes.ts, rate_counters; 9b-3): lo que se pasa se descarta y se cuenta (últimas
     24 h); ninguna tabla de errores recibe nada de lo descartado.
   - Solo se guardan campos conocidos (tipo, nombre, mensaje, stack, ruta); lo demás que mande el teléfono se ignora. Nunca el valor de un campo,
     la URL, la persona ni la operación: todo pasa por taparError() y la ruta queda en su familia. La sesión es una huella que cambia cada día.
   - Un cierre o error nativo solo se acepta de una app (rótulo TLApp); de la web, solo «js» y «red».
   - La huella del grupo sale del texto YA tapado y simbolizado (lib/errores/huella.ts). El grupo y sus cifras los lleva la base (0127). */
export type Entrada = { ua: string | null; dev: string | null; ip: string | null; cuerpo: unknown };
export type Recibido = { ok: true; grupo: string } | { ok: false; por: "apagado" | "limite" | "invalido" | "error" };

/* Lo descartado por el tope en las últimas 24 h, entre todos los procesos (Super Admin › Sistema › Apps lo dice). */
export const descartados = async () => ({ n: await sumaReciente("errores_descartados", "todo", 24), desde: new Date(Date.now() - 86_400_000).toISOString() });

/* Primero lo de quien manda (su teléfono y su conexión: si insiste, sigue afuera); solo lo que pasa eso cuenta para el tope de todo el sistema. */
async function permitir(dev: string | null, ip: string | null, lim: { global: number; dev: number }): Promise<boolean> {
  const ok = (!dev || await dentroDelTope("errores_dev", dev, lim.dev)) && await dentroDelTope("errores_ip", ip ?? "?", lim.dev * 4)
    && await dentroDelTope("errores", "todo", lim.global);
  if (!ok) await sumarTope("errores_descartados", "todo").catch(() => undefined);
  return ok;
}

let interruptor: { at: number; on: boolean } | null = null, escucha = false;
async function encendido(): Promise<boolean> {
  if (!escucha) { escucha = true; alCambiarConfig(() => { interruptor = null; }); }
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
  if (!(await permitir(e.dev, e.ip, { global: lim.errores_por_minuto, dev: lim.errores_por_dispositivo }))) return { ok: false, por: "limite" };
  const b = (e.cuerpo && typeof e.cuerpo === "object" ? e.cuerpo : {}) as Record<string, unknown>;
  const tipo = String(b.tipo ?? "");
  if (!TIPOS.has(tipo)) return { ok: false, por: "invalido" };
  const ua = String(e.ua ?? "").slice(0, 600), app = leerRotulo(ua);
  if ((tipo === "cierre" || tipo === "nativo") && !app) return { ok: false, por: "invalido" };
  return guardar(e, b, tipo, ua, app);
}

/* 9j · Un error del SERVIDOR (instrumentation.ts › onRequestError: una página, una acción o una ruta que se cayó): el mismo tapado, la misma huella
   y las mismas tablas que los de la web y las apps, como «servidor» (app web). Solo lo llama el propio proceso (nunca un teléfono), así que no mira
   el interruptor app.errores (es de lo que mandan los teléfonos); tiene su tope por minuto (el de todo el sistema) para que un error en un bucle no
   llene la base. Sin persona: la «sesión» de todos los errores del servidor de un día es la misma huella. */
export async function recibirErrorServidor(err: unknown, ruta: string | null): Promise<Recibido> {
  const lim = await valores("errores_por_minuto");
  if (!(await dentroDelTope("errores_servidor", "todo", lim.errores_por_minuto))) return { ok: false, por: "limite" };
  const x = (err && typeof err === "object" ? err : { message: String(err) }) as { name?: unknown; message?: unknown; stack?: unknown };
  return guardar({ ua: null, dev: null, ip: null, cuerpo: null }, { nombre: x.name, mensaje: x.message, stack: x.stack, ruta }, "servidor", "", null);
}

/* Tapar, agrupar y guardar (lo común de los errores de los teléfonos y los del servidor). */
async function guardar(e: Entrada, b: Record<string, unknown>, tipo: string, ua: string, app: ReturnType<typeof leerRotulo>): Promise<Recibido> {
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
  const dia = new Date().toISOString().slice(0, 10) /* GUARDIAN-OK hoyEnLaCiudad: sal del día para la huella de la sesión, no una fecha que vea nadie */, sesion = hmac(`errores:${dia}:${e.dev ?? e.ip ?? "?"}`).slice(0, 32);
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
