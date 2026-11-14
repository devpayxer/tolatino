import "server-only";
import { auditar, type Staff } from "../admin";
import { valores } from "../config";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";

/* 9o · Super Admin › Sistema › Despliegues (fase9-apertura.md §3.5, §4 9o): cada versión que salió, su salud, las vueltas atrás y el OK que la dejó
   pasar; y el registro de incidentes con su caso del manual (docs/incidentes/). Lee deploy_releases e incident_log (solo inserción, 0145). Los escribe
   el deploy.sh del entorno (infra/comun/registro.sh): en el sandbox, cada despliegue de tolatino-sync; en producción y en el ensayo, el azul/verde con su
   puerta de salud y su vigilancia de 10 minutos. La versión que sirve esta app es la de su propio proceso (TOLATINO_COMMIT).
   El barrido (avisarDespliegues) avisa al equipo de cada vuelta atrás o despliegue fallido de producción o del ensayo, una vez; vigilarRespaldos da la
   alerta crítica si la restauración de prueba falló o no corrió en 8 días (guardián respaldoRestaurado); avisarMantenimiento pone el anuncio a los
   vecinos antes de un mantenimiento programado (y lo retira si se cancela). Nada aquí lleva personas. */
type Bi = { es: string; en: string };
export type Resultado = "ok" | "vuelta_atras" | "fallo";
export type Despliegue = { id: string; entorno: string; commit: string; previo: string | null; digest: string | null; color: string | null; migraciones: string[];
  inicio: string; sano: string | null; fin: string; result: Resultado; motivo: string | null; vigilancia: Record<string, number | string>; vueltaS: number | null; ok: string | null; prueba: boolean };
export type Incidente = { id: string; entorno: string; inicio: string; fin: string | null; severidad: "critica" | "alta" | "media" | "baja"; caso: string; visto: string; hecho: string | null;
  manual: string | null; origen: string; despliegue: string | null; prueba: boolean };
export type DatosDespliegues = {
  entorno: string; servido: string; lista: Despliegue[]; incidentes: Incidente[];
  resumen: { ultimoOk: string | null; vueltas24: number; vueltas7: number; fallos7: number; abiertos: number };
  umbrales: { vigilancia: number; p5xx: number; p95: number; nuevos: number; salud: number };
};

const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
/* El entorno de la base (en el ensayo la app corre como producción, pero sus filas dicen «ensayo»: se muestran las de la base). */
const ENT_SQL = `(select coalesce((select entorno from deploy_releases order by finished_at desc limit 1), $1))`;

export async function desplieguesAdmin(): Promise<DatosDespliegues> {
  const [l, i, r, u] = await Promise.all([
    db().query<Despliegue>(
      `select id::text, entorno, commit_sha as commit, previous_sha as previo, image_digest as digest, color, migrations_applied as migraciones, ${ISO("started_at")} as inicio,
              ${ISO("healthy_at")} as sano, ${ISO("finished_at")} as fin, result, reason as motivo, watch as vigilancia, rollback_s as "vueltaS", founder_ok_ref as ok, is_test as prueba
         from deploy_releases r order by r.finished_at desc, r.id desc limit 30`),
    db().query<Incidente>(
      `select id::text, entorno, ${ISO("started_at")} as inicio, ${ISO("ended_at")} as fin, severity as severidad, kind as caso, seen as visto, done as hecho, manual_ref as manual,
              source as origen, deploy_release_id::text as despliegue, is_test as prueba
         from incident_log i order by (i.ended_at is null) desc, i.started_at desc, i.id desc limit 20`),
    db().query<{ ultimo_ok: string | null; vueltas_24h: number; vueltas_7d: number; fallos_7d: number; incidentes_abiertos: number }>(
      `select ultimo_ok, vueltas_24h, vueltas_7d, fallos_7d, incidentes_abiertos from despliegues_estado where entorno = ${ENT_SQL}`, [ENTORNO === "local" ? "pruebas" : ENTORNO]),
    valores("vuelta_vigilancia_min", "vuelta_5xx_pct", "vuelta_p95_ms", "vuelta_errores_nuevos", "vuelta_salud_fallos"),
  ]);
  const e = r.rows[0];
  return {
    entorno: ENTORNO, servido: (process.env.TOLATINO_COMMIT ?? "desconocido").slice(0, 12), lista: l.rows, incidentes: i.rows,
    resumen: { ultimoOk: e?.ultimo_ok ?? null, vueltas24: e?.vueltas_24h ?? 0, vueltas7: e?.vueltas_7d ?? 0, fallos7: e?.fallos_7d ?? 0, abiertos: e?.incidentes_abiertos ?? 0 },
    umbrales: { vigilancia: u.vuelta_vigilancia_min, p5xx: u.vuelta_5xx_pct, p95: u.vuelta_p95_ms, nuevos: u.vuelta_errores_nuevos, salud: u.vuelta_salud_fallos },
  };
}

/* Los últimos despliegues para Sistema › Salud (la fila «Despliegues y vueltas atrás»). */
export async function ultimosDespliegues(n = 5): Promise<Pick<Despliegue, "id" | "commit" | "fin" | "result" | "motivo" | "entorno">[]> {
  return (await db().query<Pick<Despliegue, "id" | "commit" | "fin" | "result" | "motivo" | "entorno">>(
    `select id::text, commit_sha as commit, ${ISO("finished_at")} as fin, result, reason as motivo, entorno from deploy_releases r order by r.finished_at desc, r.id desc limit $1`, [n])).rows;
}

/* ── Cerrar un incidente (sys:editar; con lo que se hizo; una vez) ── */
const mal = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
const limpio = (x: unknown, max: number) => String(x ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export async function cerrarIncidente(s: Staff, id: string, hecho: string): Promise<{ ok: true; msg: Bi } | { ok: false; msg: Bi }> {
  if (!s.puede("sys", "editar")) return mal("Tu rol no cierra incidentes.", "Your role cannot close incidents.");
  const h = limpio(hecho, 1000);
  if (h.length < 10) return mal("Escribe qué se hizo (10 letras o más).", "Write what was done (10 characters or more).");
  if (!/^\d{1,18}$/.test(String(id))) return mal("Ese incidente no existe.", "That incident does not exist.");
  return tx(async (c) => {
    const n = (await c.query(`update incident_log set ended_at = now(), done = coalesce(done, $2), closed_by = $3 where id = $1 and ended_at is null`, [id, h, s.id])).rowCount ?? 0;
    if (!n) return mal("Ese incidente ya estaba cerrado.", "That incident was already closed.");
    await auditar(c, { actor: s.id, action: "sistema.incidente.cerrar", targetKind: "incident", targetId: id, before: { estado: "abierto" }, after: { estado: "cerrado" }, reason: h });
    return { ok: true as const, msg: { es: "Incidente cerrado.", en: "Incident closed." } };
  });
}

/* ── Barrido: avisar al equipo de cada vuelta atrás o despliegue fallido (producción y ensayo; el sandbox lo dice en /estado/) ── */
const admins = async () => (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
export async function avisarDespliegues(): Promise<number> {
  const r = await db().query<{ id: string; entorno: string; commit: string; result: Resultado; motivo: string }>(
    `select id::text, entorno, left(commit_sha, 8) as commit, result, reason as motivo from deploy_releases
      where result <> 'ok' and noticed_at is null and entorno <> 'pruebas' and not is_test order by finished_at limit 20`);
  if (!r.rows.length) return 0;
  const { avisar } = await import("../avisos");
  const equipo = await admins();
  for (const d of r.rows) {
    const vuelta = d.result === "vuelta_atras";
    for (const u of equipo)
      await avisar(u.id, "despliegue_vuelta", { que: vuelta ? "volvió atrás sola" : "no salió", que_en: vuelta ? "rolled back on its own" : "did not go out",
        entorno: d.entorno, commit: d.commit, motivo: d.motivo ?? "—" }, { href: "/admin/sistema/despliegues", ref: ["despliegue", d.id] }).catch(() => undefined);
    await db().query(`update deploy_releases set noticed_at = now() where id = $1 and noticed_at is null`, [d.id]);
  }
  return r.rows.length;
}

/* ── Barrido: la restauración de prueba (guardián respaldoRestaurado). Solo en producción (en el sandbox lo que hay es la semilla): si la última falló
   o no hubo una buena en 8 días, o la base no tiene un respaldo bueno en 26 h → alerta crítica a los Admins, una vez por día y por motivo. ── */
export async function vigilarRespaldos(): Promise<number> {
  if (ENTORNO !== "produccion") return 0;
  const { ATRASO_H, SIN_RESTAURAR_DIAS } = await import("./respaldos-comun");
  const x = (await db().query<{ ult: string | null; buena: boolean; horas: number | null }>(
    `select (select result from restore_drills where not is_test order by started_at desc limit 1) as ult,
            exists (select 1 from restore_drills where not is_test and result = 'ok' and started_at > now() - make_interval(days => $1)) as buena,
            (select extract(epoch from now() - max(finished_at))::float / 3600 from backup_runs where not is_test and kind = 'base' and result = 'ok') as horas`, [SIN_RESTAURAR_DIAS])).rows[0];
  const motivos: [string, string, string][] = [];
  if (x?.ult === "fallo") motivos.push(["fallo", "la restauración de prueba falló", "La última restauración de prueba falló: hasta que una restaure bien, ningún respaldo cuenta"]);
  if (!x?.buena) motivos.push(["sin_restaurar", "sin restauración de prueba", `No hay una restauración de prueba buena en ${SIN_RESTAURAR_DIAS} días`]);
  if (x?.horas == null || x.horas > ATRASO_H) motivos.push(["atrasado", "respaldo de la base atrasado", `La base no tiene un respaldo bueno en ${x?.horas == null ? "ningún momento" : `${Math.round(x.horas)} h`}`]);
  if (!motivos.length) return 0;
  const { avisar } = await import("../avisos");
  const hoy = (await db().query<{ d: string }>(`select ((now() at time zone 'America/New_York')::date)::text as d`)).rows[0]!.d, equipo = await admins();
  let n = 0;
  for (const [k, que, detalle] of motivos) {
    const ref = `${k}:${hoy}`;
    if ((await db().query(`select 1 from notifications where ref_kind = 'respaldo_alerta' and ref_id = $1 limit 1`, [ref])).rowCount) continue;
    for (const u of equipo) { await avisar(u.id, "respaldo_alerta", { que, que_en: que, detalle }, { href: "/admin/sistema/respaldos", ref: ["respaldo_alerta", ref] }).catch(() => undefined); n++; }
  }
  return n;
}

/* ── Barrido: el aviso del mantenimiento a los vecinos (un anuncio en el Inicio de cada ciudad, desde «mantenimiento_aviso_h» horas antes hasta que
   termina; una vez por mantenimiento). Si el mantenimiento se cancela, sus anuncios se retiran. ── */
const hora = (d: Date, en: boolean) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
export async function avisarMantenimiento(): Promise<number> {
  const { anunciarMantenimiento, retirarAnunciosDeMantenimiento } = await import("../cms-admin");
  let n = 0;
  const pend = (await db().query<{ id: string; desde: Date; hasta: Date; es: string; en: string; por: string; motivo: string }>(
    `select w.id::text, w.from_at as desde, w.to_at as hasta, w.message->>'es' as es, w.message->>'en' as en, w.by_staff::text as por, w.reason as motivo from maintenance_windows w
      where w.cancelled_at is null and w.notice_at is null and w.to_at > now() and w.from_at - make_interval(hours => cfg_int('mantenimiento_aviso_h')) <= now()
      order by w.from_at limit 5`)).rows;
  for (const w of pend)
    n += await anunciarMantenimiento({ id: w.id, hasta: w.hasta, por: w.por, motivo: w.motivo,
      es: `${hora(w.desde, false)} – ${hora(w.hasta, false)}. ${w.es}`, en: `${hora(w.desde, true)} – ${hora(w.hasta, true)}. ${w.en}` });
  return n + (await retirarAnunciosDeMantenimiento());
}
