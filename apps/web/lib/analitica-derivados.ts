import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

/* 9g · Los derivados de Analítica los escribe SOLO el barrido, por la conexión principal (guardián derivadoNoEditable): metricas_dinero_dia,
   metricas_pro_dia, metricas_retencion y las seis tablas de Eventos, El Compa y Soporte (0137: metricas_al_dia rehace los últimos 40 días cada 10
   minutos y toda la historia una vez al día; la base impide escribirlas fuera de esa función). Analítica las lee por la base de análisis
   (lib/db-analisis.ts). Aquí también los derivados de la Comunidad de 9b-3 (antes en lib/admin-analitica.ts, que ahora solo lee). */
export async function barrerAnalitica(): Promise<number> {
  return (await db().query<{ n: number }>(`select metricas_al_dia() as n`)).rows[0]?.n ?? 0;
}

/* 9b-3 · El derivado de Analítica › Comunidad (com_analitica_dia_cache, 0133) se rehace cada 10 min para los últimos 40 días. */
export async function comunidadAlDia(): Promise<number> {
  return (await db().query<{ n: number }>(`select com_analitica_al_dia() as n`)).rows[0]?.n ?? 0;
}

/* 9b-3 · Los resúmenes de la Comunidad (rangos y monedas por ciudad, activos por rango, candidatos de Recomendados) cada 10 minutos. */
export async function comunidadCifrasAlDia(): Promise<number> {
  return (await db().query<{ n: number }>(`select com_cifras_al_dia() as n`)).rows[0]?.n ?? 0;
}

/* 9g · Vistas sin repetidos (LAUNCH L127): una vista de la ficha cuenta en «sin repetidos» una vez por persona (o teléfono, sin cuenta) y día. Lo que
   queda en la base es una huella de quién CON LA SAL DEL DÍA (no se puede volver atrás ni cruzar entre días) y el barrido la suelta a los 2 días. */
export function huellaVista(quien: string, dia: string): string {
  return createHash("sha256").update(`${process.env.DATOS_SECRET ?? ""}|vista|${dia}|${quien}`).digest("hex");
}
