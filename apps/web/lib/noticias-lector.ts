import "server-only";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { createGunzip } from "node:zlib";
import { db } from "./db";
import { origenDePruebas } from "./origen-pruebas";
import { ipPrivada, leerXml, notasDe, resolverSeguro, urlFuente, XmlNoSirve, type NotaLeida, type Resolver } from "./noticias-comun";

/* AO 5b · El lector de fuentes de noticias: la ÚNICA llamada de red a un servidor que no es nuestro ni de un proveedor contratado. Pieza de
   seguridad (guardián noticiasLectorSeguro; al revés en pruebas/alreves/alrevesNoticias.cjs). Lo llaman SOLO el barrido central (lib/compa/noticias.ts,
   barrerFuentes) y «Probar» del Super Admin (lib/anfitriones-fuentes.ts, probarFuente, con cont:editar): nunca una pantalla ni lo que hace un vecino.
   - Nunca lee una URL suelta: recibe el id de una fuente de com_host_sources (encendida; o cualquiera que no esté retirada, para «Probar») y lee SU url.
   - Solo https, puerto de https, servidor con nombre (urlFuente) y el servidor de la URL tiene que ser el de la fila (la base también lo exige).
   - Resuelve el DNS y RECHAZA si alguna dirección es privada, loopback, link-local, CGNAT, metadata, IPv6 local o mapeada (ipPrivada). Conecta a la
     dirección que ya comprobó (lookup fijo: contra DNS rebinding) y vuelve a comprobar la dirección real del socket al conectar.
   - Redirecciones: solo al MISMO servidor por https, hasta 2 (cada una vuelve a resolver y comprobar). A otro servidor o a http: se rechaza.
   - Tiempo límite 5 s en total; tamaño máximo 1 MB (también ya descomprimido) cortando el flujo; tipo de contenido XML, RSS o Atom.
   - XML con el lector propio (sin DTD ni entidades: XXE) y con tope de elementos; lo que sale es dato no confiable (limpio y acotado).
   En pruebas (TOLATINO_ENTORNO=pruebas y NOTICIAS_RSS_BASE local, por origenDePruebas; PROHIBIDA en producción en infra/comun/secretos.json) el DNS y
   la descarga van al servidor de mentira de las pruebas: NUNCA sale a internet. Las mismas reglas corren igual (DNS privado, redirección,
   tamaño, tipo, XML), salvo la comprobación del socket, que allí es el simulador local. */

export const LECTOR_TIEMPO_MS = 5000, LECTOR_MAX_BYTES = 1024 * 1024, LECTOR_MAX_REDIRECCIONES = 2;
const TIPOS_OK = /^(application\/(rss\+xml|atom\+xml|rdf\+xml|xml)|text\/xml)\b/i;

export type Lectura = { ok: true; notas: NotaLeida[]; formato: string; ms: number } | { ok: false; error: string; ms: number };
export type Fuente = { id: string; url: string; host: string; status: string };
type Respuesta = { estado: number; ubicacion: string | null; tipo: string; cuerpo: Buffer };
class Rechazo extends Error {}

/* El DNS: el del sistema en producción; en pruebas, la tabla del simulador (nunca un DNS de verdad). */
function resolverDe(sim: URL | null): Resolver {
  if (!sim) return async (h) => (await lookup(h, { all: true, verbatim: true })).map((x) => x.address);
  return (h) => new Promise((ok, mal) => {
    const r = http.get({ host: sim.hostname, port: sim.port, path: `/__dns/${encodeURIComponent(h)}`, timeout: 2000 }, (res) => {
      const c: Buffer[] = []; res.on("data", (x: Buffer) => c.push(x)); res.on("end", () => { try { const j = JSON.parse(Buffer.concat(c).toString("utf8")); res.statusCode === 200 && Array.isArray(j.direcciones) ? ok(j.direcciones.map(String)) : mal(new Error("nx")); } catch { mal(new Error("nx")); } });
    });
    r.on("error", mal); r.on("timeout", () => r.destroy(new Error("tiempo")));
  });
}

/* Leer la respuesta con el tope de tamaño (cortando el flujo) y descomprimida si vino en gzip (el tope cuenta lo descomprimido). */
function cuerpo(res: http.IncomingMessage, limite: number): Promise<Buffer> {
  return new Promise((ok, mal) => {
    const cod = String(res.headers["content-encoding"] ?? "identity").toLowerCase();
    if (cod !== "identity" && cod !== "gzip") { res.destroy(); return mal(new Rechazo("La fuente manda el contenido comprimido de una forma que no se lee.")); }
    const largo = Number(res.headers["content-length"] ?? 0);
    if (largo > limite) { res.destroy(); return mal(new Rechazo("La fuente es demasiado grande (más de 1 MB).")); }
    const flujo = cod === "gzip" ? res.pipe(createGunzip()) : res;
    const c: Buffer[] = []; let n = 0;
    flujo.on("data", (x: Buffer) => { n += x.length; if (n > limite) { res.destroy(); flujo.destroy(); mal(new Rechazo("La fuente es demasiado grande (más de 1 MB).")); return; } c.push(x); });
    flujo.on("end", () => ok(Buffer.concat(c)));
    flujo.on("error", () => mal(new Rechazo("La respuesta se cortó.")));
    res.on("error", () => mal(new Rechazo("La respuesta se cortó.")));
  });
}

/* La descarga real: https al servidor de la fuente, conectando a la IP ya comprobada (lookup fijo) y comprobando el socket al conectar. */
function pedirReal(u: URL, ip: string, quedan: number, signal: AbortSignal): Promise<Respuesta> {
  return new Promise((ok, mal) => {
    const familia = ip.includes(":") ? 6 : 4;
    const req = https.request({
      host: u.hostname, servername: u.hostname, port: 443, path: `${u.pathname}${u.search}`, method: "GET", agent: false, family: familia, signal,
      lookup: ((_h: string, o: { all?: boolean }, cb: (e: Error | null, a: string | { address: string; family: number }[], f?: number) => void) => (o?.all ? cb(null, [{ address: ip, family: familia }]) : cb(null, ip, familia))) as unknown as https.RequestOptions["lookup"],
      headers: { "user-agent": "ToLatino-Noticias/1.0", accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8", "accept-encoding": "gzip" },
    }, (res) => {
      const real = res.socket?.remoteAddress ?? "";
      if (!real || ipPrivada(real.replace(/^::ffff:(?=\d+\.)/, "")) || real.replace(/^::ffff:/, "") !== ip.replace(/^::ffff:/, "")) { res.destroy(); return mal(new Rechazo("La conexión no fue a la dirección comprobada: no se lee.")); }
      const est = res.statusCode ?? 0, loc = res.headers.location ?? null;
      if (est >= 300 && est < 400) { res.resume(); return ok({ estado: est, ubicacion: loc, tipo: "", cuerpo: Buffer.alloc(0) }); }
      cuerpo(res, LECTOR_MAX_BYTES).then((b) => ok({ estado: est, ubicacion: null, tipo: String(res.headers["content-type"] ?? ""), cuerpo: b }), mal);
    });
    req.setTimeout(quedan, () => req.destroy(new Rechazo("La fuente tardó demasiado.")));
    req.on("socket", (s) => s.once("connect", () => { const a = (s.remoteAddress ?? "").replace(/^::ffff:(?=\d+\.)/, ""); if (!a || ipPrivada(a)) req.destroy(new Rechazo("La conexión fue a una dirección privada: no se lee.")); }));
    req.on("error", (e) => mal(e instanceof Rechazo ? e : new Rechazo("No se pudo conectar con la fuente.")));
    req.end();
  });
}

/* En pruebas: la misma petición, al simulador local (el servidor y la ruta de la fuente van en la ruta del simulador). Nunca sale a internet. */
function pedirSimulador(sim: URL, u: URL, quedan: number, signal: AbortSignal): Promise<Respuesta> {
  return new Promise((ok, mal) => {
    const req = http.request({ host: sim.hostname, port: sim.port, path: `/fuente/${u.hostname}${u.pathname}${u.search}`, method: "GET", signal, headers: { "accept-encoding": "gzip" } }, (res) => {
      const est = res.statusCode ?? 0, loc = res.headers.location ?? null;
      if (est >= 300 && est < 400) { res.resume(); return ok({ estado: est, ubicacion: loc, tipo: "", cuerpo: Buffer.alloc(0) }); }
      cuerpo(res, LECTOR_MAX_BYTES).then((b) => ok({ estado: est, ubicacion: null, tipo: String(res.headers["content-type"] ?? ""), cuerpo: b }), mal);
    });
    req.setTimeout(quedan, () => req.destroy(new Rechazo("La fuente tardó demasiado.")));
    req.on("error", (e) => mal(e instanceof Rechazo ? e : new Rechazo("No se pudo conectar con la fuente.")));
    req.end();
  });
}

/* El DNS de las fuentes (el del sistema; en pruebas, el del simulador): lo usa también el alta del Super Admin para validar con las mismas reglas. */
export const resolverDeFuentes = (): Resolver => resolverDe(origenDePruebas(process.env.NOTICIAS_RSS_BASE));

/* Leer UNA fuente de la tabla. `probar`: «Probar» del Super Admin (también una apagada; nunca una retirada). No escribe nada: quien llama lo anota. */
export async function leerFuente(id: string, o: { probar?: boolean } = {}): Promise<Lectura> {
  const t0 = Date.now(), ms = () => Date.now() - t0;
  if (!/^\d{1,18}$/.test(String(id))) return { ok: false, error: "Esa fuente no existe.", ms: 0 };
  const f = (await db().query<Fuente>(`select id::text, url, host, status from com_host_sources where id = $1::bigint and (status = 'on' or ($2 and status <> 'retired'))`, [id, !!o.probar])).rows[0];
  if (!f) return { ok: false, error: o.probar ? "Esa fuente no existe o está retirada." : "Esa fuente no está encendida.", ms: 0 };
  const v = urlFuente(f.url);
  if (!v.ok || v.host !== f.host) return { ok: false, error: v.ok ? "La dirección no es del servidor de la fuente." : v.error, ms: 0 };
  const sim = origenDePruebas(process.env.NOTICIAS_RSS_BASE);
  const resolver = resolverDe(sim);
  let u = new URL(v.url);
  try {
    for (let saltos = 0; ; saltos++) {
      if (u.protocol !== "https:" || u.hostname.toLowerCase() !== f.host || u.port || u.username || u.password) throw new Rechazo("La fuente redirige a otro servidor o fuera de https: no se sigue.");
      const r = await resolverSeguro(u.hostname, resolver);
      if (!r.ok) throw new Rechazo(r.error);
      const quedan = LECTOR_TIEMPO_MS - ms();
      if (quedan <= 0) throw new Rechazo("La fuente tardó demasiado.");
      // El tiempo es TOTAL (no de silencio): al cumplirse, la petición se corta de verdad; una fuente que gotea no deja una conexión abierta.
      const corte = new AbortController();
      const reloj = setTimeout(() => corte.abort(), quedan);
      let res: Respuesta;
      try {
        res = await Promise.race([
          sim ? pedirSimulador(sim, u, quedan, corte.signal) : pedirReal(u, r.ip, quedan, corte.signal),
          new Promise<never>((_, mal) => corte.signal.addEventListener("abort", () => mal(new Rechazo("La fuente tardó demasiado.")), { once: true })),
        ]);
      } finally { clearTimeout(reloj); corte.abort(); }
      if (res.estado >= 300 && res.estado < 400) {
        if (saltos >= LECTOR_MAX_REDIRECCIONES || !res.ubicacion) throw new Rechazo("Demasiadas redirecciones.");
        let sig: URL;
        try { sig = new URL(res.ubicacion, u); } catch { throw new Rechazo("La fuente redirige a una dirección que no se entiende."); }
        u = sig;
        continue;
      }
      if (res.estado !== 200) throw new Rechazo(`La fuente contestó ${res.estado}.`);
      if (!TIPOS_OK.test(res.tipo)) throw new Rechazo("No es un RSS ni un Atom (tipo de contenido).");
      const { formato, notas } = notasDe(leerXml(res.cuerpo.toString("utf8")), f.host);
      return { ok: true, notas, formato, ms: ms() };
    }
  } catch (e) {
    const error = e instanceof Rechazo ? e.message : e instanceof XmlNoSirve ? `El XML no se lee: ${e.message}.` : "No se pudo leer la fuente.";
    return { ok: false, error: error.slice(0, 200), ms: ms() };
  }
}
