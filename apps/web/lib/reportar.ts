import "server-only";
import { headers } from "next/headers";
import { valor } from "./config";
import { db } from "./db";
import { equipo } from "./errores/ingesta";
import { taparError } from "./errores/tapar";
import { abrirCaso, type Quien, type RegistroCaso, type ResS } from "./soporte";

/* 8f · «Reportar un problema» (fase8-apps.md §4 8f, hueco #5): un caso TK- normal de Soporte, tema `tecnico`, origen `reporte_app`, en la cola
   `ticket` como cualquier otro, con dos cosas más en support_case_logs (en la misma transacción que el caso):
   - el REGISTRO TÉCNICO que mandó el teléfono SOLO al tocar «Enviar» (guardián reporteConConsentimiento): las últimas pantallas por familia, errores
     de la página y cambios de señal; aquí se vuelve a tapar línea por línea (sin direcciones, correos, teléfonos, números de operación ni texto
     entre comillas), se acota a reporte_logs_kb y se suma el teléfono en pocas palabras (sistema y modelo; la app y su versión ya van en el caso);
   - la CAPTURA, si la hay: una foto PRIVADA (subida por /api/ayuda/foto, como la de cualquier caso) que pasa a ser del caso; aquí solo se anota
     de dónde salió (agitar o un archivo).
   El caso es de quien lo abre (y del negocio si es desde el panel): otra cuenta que pide el número recibe «no existe» (404), como en 7b. */
export type ReporteIn = { texto: string; foto?: string | null; registro?: unknown; captura?: string | null; clave?: string | null };
const LINEA = /^\d{2}:\d{2}:\d{2} /;

export async function reportarProblema(q: Quien, x: ReporteIn): Promise<ResS> {
  const on = (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'app.reportar'`)).rows[0]?.enabled === true;
  if (!on) return { ok: false, msg: { es: "Reportar un problema no está disponible ahora. Escríbenos desde Ayuda y soporte.", en: "Report a problem is not available right now. Write to us from Help and support." } };
  const kb = await valor("reporte_logs_kb");
  const crudo = Array.isArray(x.registro) ? x.registro.slice(-200) : [];
  const lineas: string[] = [];
  let bytes = 0;
  // Desde la más nueva hacia atrás, hasta llenar el tope; después se ponen en orden.
  for (const l of [...crudo].reverse()) {
    if (typeof l !== "string") continue;
    const t = taparError(l.slice(0, 200), 200).trim();
    if (!t || !LINEA.test(t)) continue;
    bytes += Buffer.byteLength(t) + 4;
    if (bytes > kb * 1024 - 600) break;
    lineas.unshift(t);
  }
  const eq = equipo((await headers()).get("user-agent") ?? "");
  const registros: RegistroCaso[] = [{ kind: "registro_app", body: { lineas, sistema: eq.os, modelo: eq.modelo } }];
  const foto = x.foto && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(x.foto)) ? String(x.foto) : null;
  if (foto) registros.push({ kind: "captura", body: { media: foto, origen: x.captura === "agitar" ? "agitar" : "archivo" } });
  return abrirCaso(q, { tema: "tecnico", texto: String(x.texto ?? ""), foto, clave: x.clave ? String(x.clave) : null }, { origen: "reporte_app", registros });
}

/* Lo que ve el equipo en la ficha del caso (Super Admin › Soporte): el registro y de dónde salió la captura. Solo con sop:ver (lo revisa quien llama). */
export type RegistroEquipo = { lineas: string[]; sistema: string | null; modelo: string | null; captura: string | null; purgado: boolean } | null;
export async function registroDelCaso(caseId: string): Promise<RegistroEquipo> {
  const L = (await db().query<{ kind: string; body: Record<string, unknown>; purged: boolean }>(`select kind, body, purged_at is not null as purged from support_case_logs where case_id = $1::bigint`, [caseId])).rows;
  if (!L.length) return null;
  const r = L.find((x) => x.kind === "registro_app"), c = L.find((x) => x.kind === "captura");
  return {
    lineas: Array.isArray(r?.body.lineas) ? (r!.body.lineas as unknown[]).filter((x): x is string => typeof x === "string") : [],
    sistema: typeof r?.body.sistema === "string" ? r.body.sistema : null, modelo: typeof r?.body.modelo === "string" ? r.body.modelo : null,
    captura: typeof c?.body.origen === "string" ? c.body.origen : null, purgado: L.some((x) => x.purged),
  };
}

/* Super Admin › Sistema › Apps › Reportes: los casos «Reportar un problema» (cola ticket de Soporte), sin la persona (eso está en Soporte, con
   sop:ver): número, estado, de qué app y versión, si trae captura y cuántas líneas de registro. Por las ciudades del rol. */
export type FilaReporte = { num: string; estado: string; at: string; device: string | null; version: string | null; captura: string | null; lineas: number; negocio: boolean; texto: string | null };
export async function reportesApp(ciudades: string[]): Promise<FilaReporte[]> {
  return (await db().query<FilaReporte>(
    `select c.number as num, c.status as estado, to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, c.device, c.app_version as version,
            (select l.body->>'origen' from support_case_logs l where l.case_id = c.id and l.kind = 'captura') as captura,
            coalesce((select jsonb_array_length(l.body->'lineas') from support_case_logs l where l.case_id = c.id and l.kind = 'registro_app'), 0) as lineas,
            c.business_id is not null as negocio,
            (select left(m.body, 90) from support_messages m where m.case_id = c.id and m.sender = 'user' order by m.at limit 1) as texto
       from support_cases c
      where c.origin = 'reporte_app' and (cardinality($1::text[]) = 0 or c.city_id = any($1::text[]))
      order by c.created_at desc limit 50`, [ciudades])).rows;
}
