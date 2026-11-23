import "server-only";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { borrarCarpetaSubida, carpetaSubida } from "./video-negocio";

/* 9t (19 nov) · Leer un formulario de subida CON TOPE. Un navegador que no avisa el tamaño (Safari en iPad/iPhone manda el cuerpo sin
   content-length) llegaba entero hasta req.formData(): un archivo de más se leía completo en memoria y salía «No llegó la foto» (400) en vez de
   «pesa demasiado» (413). Aquí se lee el cuerpo por partes y no se guarda nada pasado el tope; el aviso de content-length se mira primero.
   Lo usan todas las rutas de subida (guardián subidaConTope). */
export type Leido = { ok: true; fd: FormData } | { ok: false; grande: boolean };

export async function leerFormulario(req: Request, tope: number): Promise<Leido> {
  if (Number(req.headers.get("content-length") ?? 0) > tope) return { ok: false, grande: true };
  const r = req.body?.getReader();
  if (!r) return { ok: false, grande: false };
  const partes: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    n += value.byteLength;
    if (n > tope) {
      // Pasado el tope no se guarda nada más, pero se termina de recibir (tirándolo) para que quien sube lea el 413 y no un «se cortó la
      // conexión» (Safari). Si sigue mandando más de 4 veces el tope, se corta igual.
      for (;;) { const x = await r.read(); if (x.done) break; n += x.value.byteLength; if (n > tope * 4) { await r.cancel().catch(() => undefined); break; } }
      return { ok: false, grande: true };
    }
    partes.push(value);
  }
  const fd = await new Response(Buffer.concat(partes), { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  // 20 nov · Un formulario que llega sin archivo (o ilegible) deja dicho QUÉ llegó: bytes, tipo del cuerpo y el tamaño de cada parte (nada de
  // la persona). «No llegó la foto» en el iPhone SE del CI (confirmación 44734711575) no decía si llegó vacía, cortada o sin la parte.
  if (!fd || ![...fd.values()].some((v) => typeof v !== "string" && v.size > 0))
    console.warn(`[subida] sin archivo: ${n} bytes recibidos · ${(req.headers.get("content-type") ?? "sin tipo").slice(0, 80)} · ${fd ? [...fd.entries()].map(([k, v]) => `${k.slice(0, 20)}:${typeof v === "string" ? "texto" : v.size}`).join(",") || "sin partes" : "ilegible"}`);
  return fd ? { ok: true, fd } : { ok: false, grande: false };
}

/* 9t · Medios en flujo · Recibir UN archivo grande (el video del negocio, hasta 120 MB) directo al DISCO, sin tenerlo nunca entero en memoria.
   leerFormulario (arriba) junta el formulario en memoria: bien para una foto de 12 MB que sharp igual necesita entera, nunca para un video (la
   medida, scripts/carga/memoria-medios.mjs: ~610 MB de memoria por cada video de 120 MB). Aquí el formulario multipart se lee por partes y la
   parte `campo` se escribe en `ruta` a medida que llega; en memoria solo queda el trozo que está pasando (y una cola de bytes para encontrar el
   borde). El tope se aplica MIENTRAS llega (sin confiar en content-length): antes de escribir un trozo se mira si pasaría del tope, y si pasa no
   se escribe nada más (lo ya escrito lo borra quien llama, con su carpeta). Como leerFormulario, después del tope se termina de recibir tirándolo
   (Safari lee el 413 y no «se cortó la conexión») hasta el doble del tope; pasado eso, se corta. Guardián mediosEnFlujo. */
const TEXTO_MAX = 1024;
export type Recibido = ({ ok: true; bytes: number } | { ok: false; motivo: "grande" | "sin_archivo" | "cortado" }) & { tipo: string; textos: Record<string, string> };
/* 22 nov · `textos`: los campos de texto del formulario que se quieren leer de paso (destino, para…), cada uno con tope (TEXTO_MAX); el primero de
   cada nombre, como formData().get(). `tipo`: el Content-Type de la parte del archivo, como lo deja formData() (en minúsculas; sin él, text/plain). */
export async function recibirArchivo(req: Request, o: { campo: string; tope: number; ruta: string; margen?: number; textos?: string[] }): Promise<Recibido> {
  const topeCuerpo = o.tope + (o.margen ?? 64 * 1024);
  const textos: Record<string, string> = {};
  let tipo = "";
  const no = (motivo: "grande" | "sin_archivo" | "cortado"): Recibido => ({ ok: false, motivo, tipo, textos });
  if (Number(req.headers.get("content-length") ?? 0) > topeCuerpo) return no("grande");
  const b = /boundary=(?:"([^"]{1,70})"|([^;\s]{1,70}))/i.exec(req.headers.get("content-type") ?? "");
  const r = req.body?.getReader();
  if (!b || !r) return no("sin_archivo");
  const borde = Buffer.from(`\r\n--${b[1] ?? b[2]}`);
  const fh = await open(o.ruta, "w", 0o600);
  // La cola empieza con «\r\n» para que el primer borde se busque igual que los demás.
  let cola: Buffer = Buffer.from("\r\n"), total = 0, escritos = 0;
  let estado: "inicio" | "cabeceras" | "parte" | "fin" = "inicio", esLaNuestra = false, hubo = false;
  // El campo de texto que está pasando (si es uno de los pedidos y todavía no se leyó) y lo leído de él, con tope.
  let texto: string | null = null, valor = Buffer.alloc(0);
  const tirarResto = async () => {
    for (;;) {
      const x = await r.read().catch(() => null);
      if (!x || x.done) break;
      total += x.value.byteLength;
      if (total > topeCuerpo * 2) { await r.cancel().catch(() => undefined); break; }
    }
  };
  try {
    for (;;) {
      const x = await r.read().catch(() => null);
      if (!x) return no("cortado");
      if (x.done) break;
      total += x.value.byteLength;
      if (total > topeCuerpo) { await tirarResto(); return no("grande"); }
      const trozo = Buffer.from(x.value.buffer, x.value.byteOffset, x.value.byteLength);
      cola = cola.length ? Buffer.concat([cola, trozo]) : trozo;
      for (;;) {
        if (estado === "inicio" || estado === "parte") {
          const i = cola.indexOf(borde);
          // Sin borde a la vista: de la parte se suelta todo menos lo que podría ser el comienzo de un borde.
          const hasta = i >= 0 ? i : Math.max(0, cola.length - borde.length + 1);
          if (estado === "parte" && esLaNuestra && hasta > 0) {
            if (escritos + hasta > o.tope) { await tirarResto(); return no("grande"); }
            await fh.write(cola.subarray(0, hasta));
            escritos += hasta;
          }
          if (estado === "parte" && texto !== null && hasta > 0 && valor.length < TEXTO_MAX)
            valor = Buffer.concat([valor, cola.subarray(0, Math.min(hasta, TEXTO_MAX - valor.length))]);
          if (i < 0) { cola = Buffer.from(cola.subarray(hasta)); break; }
          if (estado === "parte" && esLaNuestra) { hubo = true; esLaNuestra = false; }
          if (estado === "parte" && texto !== null) { textos[texto] = valor.toString("utf8"); texto = null; valor = Buffer.alloc(0); }
          cola = Buffer.from(cola.subarray(i + borde.length));
          estado = "cabeceras";
        }
        if (cola.length < 2) break;
        if (cola[0] === 0x2d && cola[1] === 0x2d) { estado = "fin"; break; } // «--»: el último borde
        const j = cola.indexOf("\r\n\r\n");
        if (j < 0) { if (cola.length > 16 * 1024) return no("sin_archivo"); break; }
        const cab = cola.subarray(0, j).toString("latin1");
        const disp = /content-disposition:[^\r\n]*/i.exec(cab)?.[0] ?? "", nombre = /\bname="([^"]*)"/i.exec(disp)?.[1], conArchivo = /\bfilename=/i.test(disp);
        esLaNuestra = !hubo && nombre === o.campo && conArchivo;
        if (esLaNuestra) tipo = tipoDeParte(cab);
        texto = !conArchivo && nombre !== undefined && (o.textos ?? []).includes(nombre) && !(nombre in textos) ? nombre : null;
        cola = Buffer.from(cola.subarray(j + 4));
        estado = "parte";
      }
      if (estado === "fin") break;
    }
    if (!hubo && estado === "parte" && escritos > 0) return no("cortado");
    if (!hubo || escritos === 0) {
      console.warn(`[subida] sin archivo «${o.campo}»: ${total} bytes recibidos · ${(req.headers.get("content-type") ?? "sin tipo").slice(0, 80)}`);
      return no("sin_archivo");
    }
    return { ok: true, bytes: escritos, tipo, textos };
  } finally {
    await fh.close().catch(() => undefined);
  }
}

/* El tipo de la parte del archivo como lo deja formData() (undici): sin Content-Type, «text/plain»; con él, en minúsculas; con caracteres fuera
   de lo imprimible, vacío. (Mensajes rechaza lo que dice no ser una imagen antes de abrirla.) */
function tipoDeParte(cab: string): string {
  const t = /(?:^|\r\n)content-type:[ \t]*([^\r\n]*)/i.exec(cab)?.[1]?.trim();
  if (t === undefined) return "text/plain";
  return /^[\x20-\x7e]*$/.test(t) ? t.toLowerCase() : "";
}

/* 9t (22 nov) · Subir UNA FOTO con lugar y turno (LAUNCH «Fotos que se suben: tope de subidas a la vez por proceso»). Medido el 22 nov (un proceso
   nuevo por ruta, fotos de 11,5 MB): 50 a la vez llevaban el proceso de ~0,5 GB a ~2,3 GB en cualquiera de las rutas de fotos, porque cada foto se
   juntaba en memoria y se copiaba (partes, Buffer.concat, formData(), arrayBuffer()) y nada limitaba cuántas abría sharp a la vez. Ahora TODAS las
   rutas que reciben una foto (/api/medios, mensajes, ayuda, reclamo, repartidor) pasan por aquí (guardián subidaConTope):
   - Lugar (fotos_dentro por proceso: llegando, esperando o procesándose). Se toma ANTES de leer el cuerpo; sin lugar, 503 + Retry-After al
     instante (quien sube no manda 12 MB para nada) y no se escribe nada al disco.
   - La foto llega al DISCO por partes (recibirArchivo, con el tope mientras llega) y sharp la abre desde el archivo: ninguna copia del archivo en
     la memoria de la app. Los campos de texto del formulario (destino, para) se leen de paso, con tope (TEXTO_MAX).
   - `antes` (opcional): lo que la ruta decide con el formulario ya leído y sin abrir la foto (topes, permisos, tipo); no gasta turno.
   - Turno (fotos_a_la_vez por proceso): abrir, enderezar, reducir, revisar, guardar y variantes. Ya en el disco, la foto espera su turno hasta
     fotos_espera_s; si no llega, el mismo 503. sharp nunca abre más de fotos_a_la_vez fotos subidas a la vez en un proceso.
   - La carpeta temporal (la misma de los videos: lib/video-negocio.ts carpetaSubida, que barre las de más de una hora que dejó un proceso caído)
     se borra y el lugar y el turno se sueltan en un finally (también si algo falla).
   - Cada rechazo por estar lleno se cuenta (Sistema › Salud, «Subidas de fotos · este proceso»: en curso, en espera, el tope vigente y los rechazos
     de la última hora) y queda en los errores del servidor (Sistema › Apps, grupo «Subida de fotos llena»): como mucho uno cada AVISO_LLENO_MS por
     proceso, para no cargar la base justo cuando el servidor está lleno.
   23 nov (LAUNCH «Tope de subidas de fotos, lo que queda», punto 1) · Los tres números son claves de Configuración (0212, Configuración › Apps, con sus
   límites: 1–4 a la vez, 6–32 de lugar, 5–60 s de espera). Se leen con valores() de lib/config.ts: la copia del proceso que el aviso de la base olvida
   al momento (cacheConAviso), así un cambio en el Super Admin vale desde la siguiente subida y una subida no hace ninguna consulta de más (la copia se
   lee una vez cada 15 s o tras un cambio, no por foto). Si Configuración no responde (o tarda más de CONFIG_ESPERA_MS), los de fábrica de FOTOS_DEF,
   iguales a los de 0212: nunca «sin tope» ni «cerrado». Si el turno baja con fotos dentro, las que ya tienen turno terminan y la siguiente entra cuando
   haya menos que el tope nuevo; si sube, las que esperan entran al momento (pasar()).
   El estado vive en globalThis (como lib/cambios-config.ts): Next carga este módulo una vez por capa y el tope es UNO por proceso; Sistema › Salud
   (otra capa) lee el mismo estado.
   Prueba: pruebas/e2e/sub9t2.cjs (30 a la vez; el tope cambiado en Configuración se respeta en la ráfaga siguiente, sin reiniciar). */
export const FOTOS_DEF = { aLaVez: 2, dentro: 16, esperaS: 30 } as const;
export const AVISO_LLENO_MS = 10_000, CONFIG_ESPERA_MS = 1_000;
export type TopesFotos = { aLaVez: number; dentro: number; esperaS: number; deConfig: boolean };
type EstadoFotos = { dentro: number; activas: number; enCola: (() => boolean)[]; ultimoAviso: number; tope: TopesFotos; rechazos: [number, number][]; ultimoRechazo: number | null };
const G = globalThis as typeof globalThis & { __tlSubidaFotos?: EstadoFotos };
const E: EstadoFotos = (G.__tlSubidaFotos ??= { dentro: 0, activas: 0, enCola: [], ultimoAviso: 0, tope: { ...FOTOS_DEF, deConfig: false }, rechazos: [], ultimoRechazo: null });

/* Los topes vigentes: de Configuración (la copia del proceso; sin consulta si está al día) o, si no responde a tiempo, los de fábrica. */
export async function topesFotos(): Promise<TopesFotos> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  try {
    const v = await Promise.race([
      // Import diferido: lib/config.ts trae la base y el Super Admin; quien solo usa leerFormulario/recibirArchivo (y las pruebas sin servidor) no lo carga.
      import("./config").then((c) => c.valores("fotos_a_la_vez", "fotos_dentro", "fotos_espera_s")),
      new Promise<null>((listo) => { reloj = setTimeout(() => listo(null), CONFIG_ESPERA_MS); }),
    ]);
    E.tope = v ? { aLaVez: v.fotos_a_la_vez, dentro: v.fotos_dentro, esperaS: v.fotos_espera_s, deConfig: true } : { ...FOTOS_DEF, deConfig: false };
  } catch {
    E.tope = { ...FOTOS_DEF, deConfig: false };
  } finally {
    clearTimeout(reloj);
  }
  return E.tope;
}

/* Mientras haya turno libre (según el tope vigente), pasa al primero de la cola. */
function pasar() {
  while (E.activas < E.tope.aLaVez && E.enCola.length) if (E.enCola.shift()!()) E.activas++;
}

/* Un turno de fotos_a_la_vez: libre al instante, o en la cola hasta `espera` ms (null si no llegó). Al soltarlo pasa al primero de la cola. */
function turnoFoto(aLaVez: number, espera: number): Promise<(() => void) | null> {
  const soltador = () => {
    let suelto = false;
    return () => {
      if (suelto) return;
      suelto = true;
      E.activas--;
      pasar();
    };
  };
  if (E.activas < aLaVez && !E.enCola.length) { E.activas++; return Promise.resolve(soltador()); }
  return new Promise((listo) => {
    let hecho = false;
    const paso = () => { if (hecho) return false; hecho = true; clearTimeout(reloj); listo(soltador()); return true; };
    const reloj = setTimeout(() => { if (hecho) return; hecho = true; const i = E.enCola.indexOf(paso); if (i >= 0) E.enCola.splice(i, 1); listo(null); }, espera);
    E.enCola.push(paso);
  });
}

/* Lo mismo que contesta el cupo de los videos (app/api/negocio/video, ocupado()), dicho de fotos. */
export const fotosOcupado = () => NextResponse.json({ ok: false, mensaje: { es: "Estamos preparando otras fotos en este momento. Prueba en un momento.", en: "We are processing other photos right now. Try again in a moment." } },
  { status: 503, headers: { "Retry-After": "15" } });

function avisarLleno(ruta: string, por: "lugar" | "turno") {
  // Se cuenta cada rechazo para Sistema › Salud (solo para mostrar, de ESTE proceso: no es un tope): tramos de 10 s [desde, cuántos] de la última
  // hora (360 como mucho); a los errores del servidor va como mucho uno cada AVISO_LLENO_MS.
  const ahora = Date.now(), ult = E.rechazos[E.rechazos.length - 1];
  if (ult && ahora - ult[0] < 10_000) ult[1]++; else E.rechazos.push([ahora, 1]);
  while (E.rechazos.length && ahora - E.rechazos[0]![0] > 3_600_000) E.rechazos.shift();
  E.ultimoRechazo = ahora;
  if (Date.now() - E.ultimoAviso < AVISO_LLENO_MS) return;
  E.ultimoAviso = Date.now();
  const e = new Error(`Subida de fotos llena: ${por === "lugar" ? "sin lugar en el proceso" : "sin turno a tiempo"}`);
  e.stack = e.message;
  void import("./errores/ingesta").then((x) => x.recibirErrorServidor(e, ruta)).catch(() => undefined);
}

/* Sistema › Salud · las subidas de fotos de ESTE proceso: en curso (con turno), en espera (en la cola del turno), llegando (con lugar, todavía sin
   turno ni cola), el tope vigente y los rechazos (lugar o turno) de los últimos 10 minutos y de la última hora. */
export type EstadoSubidas = { enCurso: number; enEspera: number; llegando: number; tope: TopesFotos; rechazos10: number; rechazosHora: number; ultimoRechazo: string | null };
export async function estadoSubidas(): Promise<EstadoSubidas> {
  const tope = await topesFotos(), ahora = Date.now();
  let rechazos10 = 0, rechazosHora = 0;
  for (const [t, n] of E.rechazos) { if (ahora - t <= 3_600_000) rechazosHora += n; if (ahora - t <= 600_000) rechazos10 += n; }
  return { enCurso: E.activas, enEspera: E.enCola.length, llegando: Math.max(0, E.dentro - E.activas - E.enCola.length), tope, rechazos10, rechazosHora,
    ultimoRechazo: E.ultimoRechazo == null ? null : new Date(E.ultimoRechazo).toISOString() };
}

export type FotoLlegada = { ruta: string; bytes: number; tipo: string; textos: Record<string, string> };
export type OpcionesFoto = {
  tope: number; campo?: string; textos?: string[];
  grande: () => Response; sinArchivo: (textos: Record<string, string>) => Response | Promise<Response>;
  antes?: (f: FotoLlegada) => Response | null | Promise<Response | null>;
};
export async function conFotoSubida(req: Request, o: OpcionesFoto, hacer: (f: FotoLlegada) => Promise<Response>): Promise<Response> {
  const ruta = new URL(req.url).pathname;
  const t = await topesFotos();
  pasar();
  if (E.dentro >= t.dentro) { avisarLleno(ruta, "lugar"); return fotosOcupado(); }
  E.dentro++;
  let soltar: (() => void) | null = null, dir = "";
  try {
    dir = await carpetaSubida();
    const archivo = join(dir, "foto");
    const rec = await recibirArchivo(req, { campo: o.campo ?? "foto", tope: o.tope, ruta: archivo, margen: 4096, textos: o.textos });
    if (!rec.ok) return rec.motivo === "grande" ? o.grande() : await o.sinArchivo(rec.textos);
    const f: FotoLlegada = { ruta: archivo, bytes: rec.bytes, tipo: rec.tipo, textos: rec.textos };
    const corta = o.antes ? await o.antes(f) : null;
    if (corta) return corta;
    soltar = await turnoFoto(t.aLaVez, t.esperaS * 1000);
    if (!soltar) { avisarLleno(ruta, "turno"); return fotosOcupado(); }
    return await hacer(f);
  } finally {
    soltar?.();
    E.dentro--;
    if (dir) await borrarCarpetaSubida(dir);
  }
}
