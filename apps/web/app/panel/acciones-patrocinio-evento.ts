"use server";
/* C-003 · Panel › Eventos › el evento › Patrocinar (canvas tolatino-master+, Panel v2 evPat): comprar (o reservar desde el día que se libera un
   puesto), «Avísame si se libera un puesto», renovar solo (1 semana o 1 mes), «Renovar otra semana / otro mes» y «Terminar antes». Toca dinero:
   solo quien tiene «Cobros» Y «Eventos» en el panel (el dueño tiene todo), desde el mismo origen. El servidor decide el precio (Configuración),
   las fechas (la zona de la ciudad y el día del evento) y los puestos (con candado); la pantalla nunca manda un monto (guardián
   patrocinioEventoDelServidor). Dentro de las apps de las tiendas no se compra ni se enciende la renovación (como Pro: compraDigitalAqui);
   terminar sí. Todo queda en la auditoría (lib/patrocinio-evento.ts). */
import { mismoOrigen } from "@/lib/cuenta";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { avisameLibreEvento, comprarPatrocinioEvento, consultarPuestosEvento, consultarRenovacionEvento, renovarSoloEvento, terminarPorDuenoEvento, type DurE } from "@/lib/patrocinio-evento";
import type { ResPat } from "@/lib/patrocinio";
import type { Verificar } from "@/lib/pagos/pasarela";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("Solo quien maneja los cobros y los eventos del negocio compra el patrocinio.", "Only whoever manages the business payments and events buys the sponsorship.");
const EN_APP = no("Esto no está disponible en la app.", "This is not available in the app.");
const ID = /^\d{1,18}$/;
async function entrar(id: unknown, evento: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  if (typeof id !== "string" || typeof evento !== "string" || !ID.test(evento)) return null;
  const a = await accesoPanel(id, "pay");
  return a && (a.partes.includes("all") || a.partes.includes("evt")) ? a : null;
}
const enLaWeb = async () => (await import("@/lib/tiendas/reglas")).compraDigitalAqui();
/* 3-D Secure: `verificar` abre la hoja del banco en el panel (useVerificacion) y la pantalla vuelve a mandar lo mismo con la misma clave.
   `devuelto`: lo que la pasarela ya devolvió al cancelar una reserva; si no salió, `devolucion` (en camino o fallida) y `aDevolver` (lo que decidió la base). */
type Sal = Res & { id?: string; estado?: string; sinPuestos?: boolean; verificar?: Verificar; devuelto?: number; devolucion?: "en_camino" | "fallida"; aDevolver?: number };
const sal = (r: ResPat): Sal => (r.ok ? { ok: true, id: r.id, estado: r.estado, devuelto: r.devuelto, devolucion: r.devolucion, aDevolver: r.aDevolver } : { ok: false, mensaje: r.msg, sinPuestos: r.sinPuestos, ...(r.verificar ? { verificar: r.verificar } : {}) });
const S = (x: unknown, n: number) => String(x ?? "").slice(0, n);
const durDe = (x: unknown): DurE | null => (x === "week" || x === "month" || x === "until_event" ? x : null);

/* Pagar (o reservar). La pantalla manda qué duración, desde cuándo, qué tarjeta, si renueva solo y una clave por intento (un solo cobro por clave). */
export async function pevComprar(id: string, evento: string, x: { dur?: unknown; desde?: unknown; pm?: unknown; renovar?: unknown; clave?: unknown; renovarDe?: unknown }): Promise<Sal> {
  const a = await entrar(id, evento);
  if (!a) return SIN_ACCESO;
  if (!(await enLaWeb())) return EN_APP;
  const dur = durDe(x?.dur);
  if (!dur) return no("Elige 1 semana, 1 mes o hasta el evento.", "Choose 1 week, 1 month or until the event.");
  return sal(await comprarPatrocinioEvento(a.negocio.id, evento, a.yo.id, { dur, desde: S(x?.desde, 10) || "hoy", pm: S(x?.pm, 80), renovar: x?.renovar === true, clave: S(x?.clave, 36),
    renovarDe: x?.renovarDe ? S(x.renovarDe, 18) : null }));
}

/* Puestos libres para otra fecha (solo lectura; la pantalla los muestra antes de pagar). */
export async function pevPuestos(id: string, evento: string, dur: string, desde: string) {
  const a = await entrar(id, evento);
  if (!a) return null;
  const d = durDe(dur);
  return d ? consultarPuestosEvento(a.negocio.id, evento, d, S(desde, 10)) : null;
}

/* «Renovar otra semana / otro mes»: las fechas y el precio del período que se va a cobrar (los calcula el servidor; solo lectura). */
export async function pevPuestosRenovar(id: string, evento: string, sid: string, dur: string) {
  const a = await entrar(id, evento);
  if (!a) return null;
  return consultarRenovacionEvento(a.negocio.id, evento, S(sid, 18), dur === "month" ? "month" : "week");
}

export async function pevAvisame(id: string, evento: string): Promise<Res> {
  const a = await entrar(id, evento);
  if (!a) return SIN_ACCESO;
  return sal(await avisameLibreEvento(a.negocio.id, evento, a.yo.id));
}

export async function pevRenovarSolo(id: string, evento: string, sid: string, on: boolean): Promise<Res> {
  const a = await entrar(id, evento);
  if (!a) return SIN_ACCESO;
  if (on === true && !(await enLaWeb())) return EN_APP;
  return sal(await renovarSoloEvento(a.negocio.id, evento, a.yo.id, S(sid, 18), on === true));
}

export async function pevTerminar(id: string, evento: string, sid: string): Promise<Res> {
  const a = await entrar(id, evento);
  if (!a) return SIN_ACCESO;
  return sal(await terminarPorDuenoEvento(a.negocio.id, evento, a.yo.id, S(sid, 18)));
}
