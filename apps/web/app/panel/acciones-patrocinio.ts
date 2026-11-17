"use server";
/* C-002 · Panel › Cobros y plan › Patrocinio (canvas tolatino-master+, «Cómo compra el negocio su patrocinio»): comprar (o reservar), «Avísame si
   se libera antes», renovar solo (encender / apagar), «Renovar otra semana / otro mes» y «Terminar antes». Toca dinero: solo quien tiene «Cobros»
   en el panel (accesoPanel(id, "pay"), como el plan Pro), desde el mismo origen. El servidor decide el precio (Configuración), las fechas (la zona
   de la ciudad) y los puestos (con candado); la pantalla nunca manda un monto (guardián patrocinioDelServidor). Dentro de las apps de las tiendas
   no se compra ni se enciende la renovación (como Pro: compraDigitalAqui); terminar sí. Todo queda en la auditoría (lib/patrocinio.ts). */
import { mismoOrigen } from "@/lib/cuenta";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { avisameLibre, comprarPatrocinio, consultarPuestos, renovarSolo, terminarPorDueno, type ResPat } from "@/lib/patrocinio";
import type { Verificar } from "@/lib/pagos/pasarela";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("Solo quien maneja los cobros del negocio compra el patrocinio.", "Only whoever manages the business payments buys the sponsorship.");
const EN_APP = no("Esto no está disponible en la app.", "This is not available in the app.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "pay") : null;
}
const enLaWeb = async () => (await import("@/lib/tiendas/reglas")).compraDigitalAqui();
/* 3-D Secure: `verificar` abre la hoja del banco en el panel (useVerificacion) y la pantalla vuelve a mandar lo mismo con la misma clave.
   `devuelto`: lo que volvió a la tarjeta al cancelar una reserva (lo decidió la base). */
type Sal = Res & { id?: string; estado?: string; sinPuestos?: boolean; verificar?: Verificar; devuelto?: number };
const sal = (r: ResPat): Sal => (r.ok ? { ok: true, id: r.id, estado: r.estado, devuelto: r.devuelto } : { ok: false, mensaje: r.msg, sinPuestos: r.sinPuestos, ...(r.verificar ? { verificar: r.verificar } : {}) });
const S = (x: unknown, n: number) => String(x ?? "").slice(0, n);

/* Pagar (o reservar). La pantalla manda qué duración, desde cuándo, qué tarjeta, si renueva solo y una clave por intento (un solo cobro por clave). */
export async function patComprar(id: string, x: { dur?: unknown; desde?: unknown; pm?: unknown; renovar?: unknown; clave?: unknown; renovarDe?: unknown }): Promise<Sal> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!(await enLaWeb())) return EN_APP;
  const dur = x?.dur === "month" ? "month" : x?.dur === "week" ? "week" : null;
  if (!dur) return no("Elige 1 semana o 1 mes.", "Choose 1 week or 1 month.");
  return sal(await comprarPatrocinio(a.negocio.id, a.yo.id, { dur, desde: S(x?.desde, 10) || "hoy", pm: S(x?.pm, 80), renovar: x?.renovar === true, clave: S(x?.clave, 36),
    renovarDe: x?.renovarDe ? S(x.renovarDe, 18) : null }));
}

/* Puestos libres para otra fecha (solo lectura; la pantalla los muestra antes de pagar). */
export async function patPuestos(id: string, dur: string, desde: string) {
  const a = await entrar(id);
  if (!a) return null;
  return consultarPuestos(a.negocio.id, dur === "month" ? "month" : "week", S(desde, 10));
}

export async function patAvisame(id: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  return sal(await avisameLibre(a.negocio.id, a.yo.id));
}

export async function patRenovarSolo(id: string, sid: string, on: boolean): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (on === true && !(await enLaWeb())) return EN_APP;
  return sal(await renovarSolo(a.negocio.id, a.yo.id, S(sid, 18), on === true));
}

export async function patTerminar(id: string, sid: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  return sal(await terminarPorDueno(a.negocio.id, a.yo.id, S(sid, 18)));
}
