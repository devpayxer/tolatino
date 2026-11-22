/* Contar un toque de contacto desde la pantalla (llamar, cómo llegar, compartir, escribir) y el «entraron» de un patrocinio. La ÚNICA vía
   (guardián toqueSobreviveSalida). Casi siempre la página se va en el mismo instante: tel:, el mapa del teléfono, la hoja de compartir.
   Historia: una acción del servidor se cancelaba en Safari al abrir tel: (CI 45042985880); con navigator.sendBeacon llegaba casi siempre, pero
   NO siempre (CI 45060882235: el iPad perdió uno). Ninguna petición tiene garantizado sobrevivir a la salida de la página, así que el toque no
   depende de eso: va a una BANDEJA DE SALIDA.
   1. Al tocar se anota pendiente (memoria + sessionStorage, con un id propio del toque y su hora) y se manda ya: sendBeacon (mejor esfuerzo:
      no deja leer la respuesta) o, si no hay o no lo acepta, fetch con keepalive (su 204 lo confirma). No se espera nada: tel: sale del propio
      toque (iOS lo exige).
   2. Lo no confirmado se reintenta con fetch (keepalive) a los 1,5 s si la página sigue viva (con tel: casi siempre sigue: sale un diálogo del
      sistema), al volver a verse (visibilitychange a visible, pageshow) y al montar la app en la siguiente página (iniciarBandeja, en
      el Arranque del marco raíz). Confirmado = el servidor contestó 204 (lo recibió; si sus reglas no lo cuentan, reintentar no cambia nada).
   3. Un pendiente con más de 9 min se tira: el servidor no cuenta otra vez a la misma persona (o red) en el mismo negocio durante 10 min, y el
      minuto de margen cubre la latencia, así un reintento nunca cae fuera de esa ventana y no puede contarse dos veces. Máx. 20 pendientes.
   El cuerpo es el de siempre (el id del toque no viaja: la ventana de 10 min del servidor ya deduplica, y bajo concurrencia lo cierra un candado
   en lib/toques.ts). Cuerpo de texto (sin preflight; el servidor lo lee como JSON y lo acota a 512 bytes). Las reglas están en el servidor. */
import { uuid } from "./uuid";

export type Toque = "call" | "whatsapp" | "directions" | "share" | "calendar" | "copy" | "message";
const RUTA = "/api/toque";
const LLAVE = "tl-toques-pendientes";
const REINTENTO_MS = 1500;
const TOPE_MS = 9 * 60_000;
const MAX_PENDIENTES = 20;
const FORMAS = new Set(["id,kind,origen", "origen,semilla", "entro,patrocinio"]);

type Cuerpo = Record<string, string>;
type Pendiente = { t: string; h: number; d: Cuerpo };

let memoria: Pendiente[] | null = null;
const enVuelo = new Set<string>();
let reloj: ReturnType<typeof setTimeout> | null = null;
let iniciada = false;

const hayVentana = () => typeof window !== "undefined" && typeof document !== "undefined";
const nuevoId = () => {
  try { return uuid(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
};

/* Lo guardado se revisa al leerlo: solo las tres formas que acepta la puerta, todo texto corto. */
const valido = (x: unknown): x is Pendiente => {
  if (!x || typeof x !== "object") return false;
  const p = x as Pendiente;
  if (typeof p.t !== "string" || p.t.length > 64 || typeof p.h !== "number" || !Number.isFinite(p.h) || !p.d || typeof p.d !== "object") return false;
  const claves = Object.keys(p.d).sort();
  return FORMAS.has(claves.join(",")) && claves.every((k) => typeof p.d[k] === "string" && p.d[k].length <= 200);
};

function cargar(): Pendiente[] {
  try {
    const t = sessionStorage.getItem(LLAVE);
    const l: unknown = t ? JSON.parse(t) : [];
    return Array.isArray(l) ? l.filter(valido).slice(-MAX_PENDIENTES) : [];
  } catch { return []; }
}

function guardar(l: Pendiente[]): void {
  memoria = l;
  try { if (l.length) sessionStorage.setItem(LLAVE, JSON.stringify(l)); else sessionStorage.removeItem(LLAVE); } catch { /* sin almacenamiento: queda en memoria */ }
}

/* Los pendientes vigentes (los de más de 9 min se tiran aquí). */
function vigentes(): Pendiente[] {
  if (!memoria) memoria = cargar();
  const ahora = Date.now(), v = memoria.filter((p) => ahora - p.h < TOPE_MS && p.h <= ahora + 60_000);
  if (v.length !== memoria.length) guardar(v);
  return v;
}

function quitar(t: string): void { guardar(vigentes().filter((p) => p.t !== t)); }

/* fetch con keepalive: si la página sigue viva, su 204 confirma y el pendiente sale de la bandeja. */
function enviar(p: Pendiente): void {
  if (enVuelo.has(p.t)) return;
  enVuelo.add(p.t);
  try {
    void fetch(RUTA, { method: "POST", body: JSON.stringify(p.d), keepalive: true, credentials: "same-origin", cache: "no-store", headers: { "content-type": "text/plain;charset=UTF-8" } })
      .then((r) => { if (r.status === 204) quitar(p.t); }, () => undefined)
      .finally(() => enVuelo.delete(p.t));
  } catch { enVuelo.delete(p.t); }
}

/* Manda todo lo pendiente que no esté ya en camino. */
function vaciar(): void {
  if (!hayVentana()) return;
  for (const p of vigentes()) enviar(p);
}

function programar(): void {
  if (reloj) clearTimeout(reloj);
  reloj = setTimeout(() => { reloj = null; vaciar(); }, REINTENTO_MS);
}

/* Una vez por página: los reintentos al volver a verse. La llama el Arranque del marco raíz al montar (y manda lo que quedó de la página
   anterior: una recarga, volver del mapa), y también el primer toque. */
export function iniciarBandeja(): void {
  if (iniciada || !hayVentana()) return;
  iniciada = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") vaciar(); });
  window.addEventListener("pageshow", vaciar);
  vaciar();
}

function mandar(d: Cuerpo): void {
  if (!hayVentana()) return;
  iniciarBandeja();
  const p: Pendiente = { t: nuevoId(), h: Date.now(), d };
  const l = vigentes().concat(p);
  guardar(l.slice(-MAX_PENDIENTES));
  let enCola = false;
  try {
    enCola = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(RUTA, new Blob([JSON.stringify(d)], { type: "text/plain;charset=UTF-8" }));
  } catch { enCola = false; }
  if (!enCola) enviar(p);
  programar();
}

/* Un toque en un negocio. */
export function contarToque(id: string, kind: Toque, origen: string): void {
  mandar({ id, kind, origen });
}

/* «Llamar» en una semilla (un negocio recomendado que aún no reclamó su página): siempre «call». */
export function contarToqueSemilla(id: string, origen: string): void {
  mandar({ semilla: id, origen });
}

/* C-002 / C-003 · «Entraron» de un patrocinio (la tarjeta patrocinada de un negocio o de un evento). Las reglas son las de siempre
   (lib/patrocinio.ts · entroPatrocinado: una vez por persona o dispositivo y día, solo activo, sin la gente del negocio ni robots). */
export function contarEntradaPatrocinio(kind: "negocio" | "evento", sid: string): void {
  mandar({ entro: kind, patrocinio: sid });
}
