import "server-only";
import { db } from "../db";

/* 9o · Lo que manda Alertmanager desde la réplica (infra/comun/monitoreo/reglas.yml) a /api/interno/alerta. Cada alerta dice su caso del manual
   (docs/incidentes/<caso>.md) y su severidad:
   - «latido» (siempre encendida, cada 5 min): deja health_checks «vigia» (el segundo testigo de GitHub Actions mira desde fuera que no se calle).
   - una alerta que se enciende: abre UN incidente por caso (si ya hay uno abierto del mismo caso, no abre otro) y avisa a los Admins (monitoreo_alerta,
     crítico: push y SMS); el correo directo lo manda Alertmanager por su lado (sale aunque la app esté caída).
   - una alerta que se resuelve: si no queda otra encendida del mismo caso, el incidente se cierra con «se resolvió solo (monitoreo)».
   Solo nombres de alertas y cifras: nada de una persona. */
export type AlertaAM = { status: "firing" | "resolved"; labels: Record<string, string>; annotations?: Record<string, string>; startsAt?: string };
const CASO = /^[a-z][a-z0-9-]{2,40}$/;
const SEV: Record<string, "critica" | "alta" | "media" | "baja"> = { critica: "critica", alta: "alta", media: "media", baja: "baja" };
const ENT = () => (process.env.TOLATINO_ENTORNO === "produccion" ? "produccion" : "pruebas");

export async function recibirAlertas(alertas: AlertaAM[], entorno: string = ENT()): Promise<{ latidos: number; abiertos: number; cerrados: number }> {
  let latidos = 0, abiertos = 0, cerrados = 0;
  const e = ["pruebas", "ensayo", "produccion"].includes(entorno) ? entorno : "produccion";
  for (const a of alertas.slice(0, 50)) {
    const sev = a.labels?.severity ?? "", caso = a.labels?.caso ?? "", nombre = String(a.labels?.alertname ?? "alerta").slice(0, 60);
    if (sev === "latido") {
      if (!latidos) await db().query(`insert into health_checks (service, ok, detail) values ('vigia', true, 'latido del monitoreo (Alertmanager)')`);
      latidos++; continue;
    }
    if (!CASO.test(caso) || !SEV[sev]) continue;
    const resumen = String(a.annotations?.resumen ?? nombre).replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 300);
    if (a.status === "firing") {
      const r = await db().query<{ id: string }>(
        `insert into incident_log (entorno, started_at, severity, kind, seen, manual_ref, source)
         select $1, coalesce($2::timestamptz, now()), $3, $4, $5, 'docs/incidentes/' || $4 || '.md', 'monitoreo'
          where not exists (select 1 from incident_log where kind = $4 and ended_at is null and source = 'monitoreo') returning id::text`,
        [e, a.startsAt && !a.startsAt.startsWith("0001") ? a.startsAt : null, SEV[sev], caso, `${nombre}: ${resumen}`]);
      if (r.rows[0]) {
        abiertos++;
        const equipo = (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
        const { avisar } = await import("../avisos");
        for (const u of equipo) await avisar(u.id, "monitoreo_alerta", { que: resumen, que_en: nombre, caso }, { href: "/admin/sistema/despliegues", ref: ["incidente", r.rows[0].id] }).catch(() => undefined);
      }
    } else {
      const n = await db().query(`update incident_log set ended_at = now(), done = 'Se resolvió solo (el monitoreo dejó de verlo).' where kind = $1 and ended_at is null and source = 'monitoreo'`, [caso]);
      cerrados += n.rowCount ?? 0;
    }
  }
  return { latidos, abiertos, cerrados };
}
