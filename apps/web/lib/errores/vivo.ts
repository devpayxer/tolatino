import "server-only";
import { valor } from "../config";
import { db } from "../db";

/* 8f · El guardián «Errores en vivo» (docs/PLAN.md §5; fase8-apps.md §4 8f): lo corre el barrido central cada minuto. Lee app_error_groups y
   app_error_events y avisa al equipo (Admins, plantilla err_vivo, sin SMS) UNA vez por grupo, tipo y build:
   - «nuevo»: un grupo que apareció (no silenciado);
   - «pico»: un grupo con al menos errores_pico_n en 10 minutos en un mismo build y cinco veces lo de la hora anterior;
   - «regresion»: un grupo resuelto que volvió en un build posterior (la base lo pasó a «nuevo», regressed_at).
   La alerta queda en app_error_alerts (solo inserción; única por grupo, tipo y build) ANTES de avisar: dos barridos no avisan dos veces.
   Una app de tienda no se vuelve atrás sola: en la Fase 9 se pausa el lanzamiento por fases por la API; la web servida vuelve atrás con el
   despliegue (LAUNCH-CHECKLIST). Hasta 10 alertas por pasada; lo demás, en la siguiente.
   Y la purga: los eventos de más de errores_retener_dias se borran (errores_purgar, 0127; la base solo deja borrar lo vencido). */
export type Vivo = { alertas: number; avisados: number; purgados: number };
const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
const QUE = { nuevo: "error nuevo", pico: "pico de errores", regresion: "volvió un error resuelto" } as const;

export async function barrerErrores(lim = 10): Promise<Vivo> {
  const pico = await valor("errores_pico_n");
  const C = (await db().query<{ id: string; kind: keyof typeof QUE; release: string; n: number; titulo: string; app: string }>(
    `with nuevos as (
       select g.id, 'nuevo'::text as kind, coalesce(g.first_build, '') as release, g.count::int as n from app_error_groups g
        where g.status = 'nuevo' and g.regressed_at is null and g.first_seen > now() - interval '1 day'
          and not exists (select 1 from app_error_alerts a where a.group_id = g.id and a.kind = 'nuevo')),
     regresiones as (
       select g.id, 'regresion'::text, coalesce(g.last_build, ''), g.count::int from app_error_groups g
        where g.status = 'nuevo' and g.regressed_at > now() - interval '1 day'
          and not exists (select 1 from app_error_alerts a where a.group_id = g.id and a.kind = 'regresion' and a.release = coalesce(g.last_build, ''))),
     picos as (
       select e.group_id as id, 'pico'::text, coalesce(e.release, ''), count(*)::int from app_error_events e join app_error_groups g on g.id = e.group_id
        where e.at > now() - interval '10 minutes' and g.status <> 'silenciado'
        group by e.group_id, e.release
       having count(*) >= $1
          and count(*) >= 5 * greatest(1, (select count(*) from app_error_events p where p.group_id = e.group_id and p.release is not distinct from e.release
                                              and p.at between now() - interval '70 minutes' and now() - interval '10 minutes') / 6.0)
          and not exists (select 1 from app_error_alerts a where a.group_id = e.group_id and a.kind = 'pico' and a.release = coalesce(e.release, '')))
     select x.id::text, x.kind, x.release, x.n, g.title as titulo, g.app from (select * from nuevos union all select * from regresiones union all select * from picos) x(id, kind, release, n)
       join app_error_groups g on g.id = x.id
      order by case x.kind when 'pico' then 0 when 'regresion' then 1 else 2 end, x.n desc limit $2`, [pico, lim])).rows;
  let alertas = 0, avisados = 0;
  if (C.length) {
    const equipo = (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
    const { avisar } = await import("../avisos");
    for (const x of C) {
      // Primero la alerta (única): si otro barrido ya la anotó, no se avisa otra vez.
      const a = (await db().query(`insert into app_error_alerts (group_id, kind, release, events_n, notified_n) values ($1::bigint, $2, $3, $4, $5) on conflict do nothing`,
        [x.id, x.kind, x.release, x.n, equipo.length])).rowCount;
      if (!a) continue;
      alertas++;
      for (const u of equipo) {
        await avisar(u.id, "err_vivo", { que: QUE[x.kind], titulo: x.titulo.slice(0, 90), app: APP[x.app] ?? x.app, build: x.release || "—" },
          { href: `/admin/sistema/apps?v=salud&g=${x.id}`, ref: ["error", `${x.id}:${x.kind}:${x.release}`], sinSms: true }).catch(() => undefined);
        avisados++;
      }
    }
  }
  const purgados = (await db().query<{ n: number }>(`select errores_purgar(5000) as n`)).rows[0]?.n ?? 0;
  return { alertas, avisados, purgados };
}
