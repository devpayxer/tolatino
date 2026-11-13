import "server-only";
import { headers } from "next/headers";
import { leerRotulo } from "./app-nativa-comun";
import { dispositivo } from "./cuenta";
import { db } from "./db";

/* Analítica propia (HERRAMIENTAS §1): eventos de la app y actividad por día, en nuestra base. Sin datos personales: quién
   (cuenta o dispositivo), qué (lista cerrada), sobre qué (ref) y la ciudad. Nunca rompe la pantalla: si falla, se calla. */
export type Evento = "ver_categoria" | "ver_ficha" | "buscar" | "contactar" | "entrar" | "registrarse" | "publicar_negocio" | "recomendar" | "reclamar" | "reportar_foto" | "pedir_aviso" | "pedir" | "ver_evento" | "rsvp" | "guardar_evento" | "compartir_evento" | "compa_abrir" | "compa_mensaje" | "compa_accion" | "compa_persona"
  | "app_abrir" | "app_actualizar" | "permiso_pedido" | "permiso_respuesta";
const ROBOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;
const CIUDAD = /^[a-z]{3}$/;

/* Lo que se lee de la petición (robot y dispositivo). En una página va ANTES de after(): ahí ya no hay petición. */
export async function contexto(): Promise<{ robot: boolean; dev: string | null; app?: string | null; plat?: string | null }> {
  const ua = (await headers()).get("user-agent");
  // 8a · La app y la plataforma (rótulo TLApp; null = la web). Solo para contar, nunca para decidir.
  const a = leerRotulo(ua);
  return { robot: !ua || ROBOT.test(ua), dev: await dispositivo(false), app: a?.app ?? null, plat: a?.plataforma ?? null };
}

export async function evento(nombre: Evento, o: { ref?: string | null; ciudad?: string | null; userId?: string | null; props?: Record<string, string | number | boolean | null> } = {}, ctx?: { robot: boolean; dev: string | null; app?: string | null; plat?: string | null }) {
  try {
    const { robot, dev, app = null, plat = null } = ctx ?? (await contexto());
    if (robot) return;
    await db().query(
      `insert into app_events (name, ref, city_id, user_id, device, props, app, plat) values ($1, $2, $3, $4::uuid, $5::uuid, $6::jsonb, $7, $8)`,
      [nombre, o.ref ? String(o.ref).slice(0, 120) : null, o.ciudad && CIUDAD.test(o.ciudad) ? o.ciudad : null, o.userId ?? null, dev, JSON.stringify(o.props ?? {}), app, plat]);
  } catch (e) {
    console.error("[eventos]", nombre, e instanceof Error ? e.message : e);
  }
}

/* Una fila por cuenta (y por dispositivo) y día: activos y retención. La llama el marco de la app en cada carga. */
export async function actividad(userId: string | null, ciudad: string | null, ctx?: { robot: boolean; dev: string | null }) {
  try {
    const { robot, dev } = ctx ?? (await contexto());
    if (robot) return;
    const c = ciudad && CIUDAD.test(ciudad) ? ciudad : null;
    const hoy = `(now() at time zone 'America/New_York')::date`;
    if (userId) await db().query(`insert into user_days (user_id, day, city_id) values ($1, ${hoy}, $2) on conflict do nothing`, [userId, c]);
    if (dev) await db().query(`insert into device_days (device, day, city_id) values ($1::uuid, ${hoy}, $2) on conflict do nothing`, [dev, c]);
  } catch (e) {
    console.error("[actividad]", e instanceof Error ? e.message : e);
  }
}

/* 9b-3 · El barrido: los meses de app_events (particiones) de ahora y los dos siguientes, el resumen por día (app_events_dia) de ayer y hoy, y
   los meses que pasaron eventos_retener_meses se resumen y se sueltan (después solo quedan las cifras). Todo en la base (0133). */
export async function analiticaAlDia(): Promise<number> {
  return (await db().query<{ n: number }>(`select app_events_al_dia() as n`)).rows[0]?.n ?? 0;
}
