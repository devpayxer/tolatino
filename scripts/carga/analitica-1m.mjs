#!/usr/bin/env node
/* 9b-3 · La analítica con 5 M de eventos (LAUNCH L207; 0133: app_events por mes + app_events_dia). Llena 13 meses de eventos de 1 M de vecinos
   y mide el Super Admin (embudo, aperturas de las apps, Analítica › Comunidad) y el barrido (app_events_al_dia: el resumen de ayer y hoy, y el
   mes que pasa la retención). Uso: DATABASE_URL=… node scripts/carga/analitica-1m.mjs [--sin-generar] */
import { analizar, anotar, app, candado, fin, guardarMeta, medir, meta, n, porLotes, q, STAFF, uno } from "./lib/comun.mjs";

await candado();
const EVT = n(5_000_000);
const nv = (await uno(`select count(*)::int as n from carga_v`).catch(() => null))?.n;
if (!nv) { console.error("[carga] corre primero comunidad-1m (los vecinos de la carga)"); process.exit(2); }

if (!process.argv.includes("--sin-generar") && !(await meta("analitica"))) {
  // Los meses de 13 meses atrás a hoy (las particiones que el barrido crea cada mes; aquí, de una vez).
  await q(`select app_events_mes((now() - make_interval(months => k))::date) from generate_series(0, 13) k`);
  await porLotes("eventos de la app", EVT, `
    insert into app_events (at, day, city_id, user_id, device, name, ref, app, plat)
    select t, (t at time zone 'America/New_York')::date, v.c, case when g % 3 = 0 then null else v.id end, case when g % 3 = 0 then md5(g::text)::uuid end,
           (array['ver_categoria','ver_ficha','buscar','contactar','ver_evento','app_abrir','compa_abrir','ver_ficha'])[1 + g % 8], (g % 5000)::text,
           case when g % 8 = 5 then (array['cliente','negocio','delivery','checkin'])[1 + g % 4] end, case when g % 8 = 5 then (array['ios','android'])[1 + g % 2] end
      from generate_series($1::int, $2::int) g join carga_v v on v.k = 1 + (g * 7) % ${nv}
      cross join lateral (select now() - make_interval(secs => ((g::bigint * 7919) % 34000000)::int) as t) x`, 500_000);
  await guardarMeta("analitica", EVT);
  await analizar();
}
const parts = await q(`select c.relname, c.reltuples::bigint as n from pg_inherits i join pg_class c on c.oid = i.inhrelid where i.inhparent = 'app_events'::regclass order by 1`);
anotar("particiones", { linea: "L207", que: `meses de app_events (${parts.map((p) => `${p.relname.slice(11)}: ${p.n}`).join(" · ")})`, valor: parts.length, tope: null, unidad: "particiones" });

const ADM = (await uno(`select user_id::text as id from staff_members where status = 'active' and role = 'admin' limit 1`))?.id ?? (await uno(`select id::text from users limit 1`)).id;
const S = STAFF(ADM), ana = await app("lib/admin-analitica.ts"), ev = await app("lib/eventos.ts");
await medir("embudo-30d", { linea: "L207", presupuesto: 300, veces: 10, que: "Analítica › embudo de 30 días (personas distintas)" }, () => ana.embudo(S, 30));
await medir("embudo-7d", { linea: "L207", presupuesto: 300, veces: 10, que: "Analítica › embudo de 7 días" }, () => ana.embudo(S, 7));
await medir("analitica-gente", { linea: "L207", presupuesto: 300, veces: 10, que: "Analítica › gente (activos y retención)" }, () => ana.gente(S, 30));
const apps = ana.appsAnalitica ?? ana.apps ?? null;
if (apps) await medir("analitica-apps", { linea: "L207", presupuesto: 300, veces: 10, que: "Analítica › Apps (aperturas, permisos)" }, () => apps(S, 30));
await medir("al-dia", { linea: "L207", presupuesto: 5000, veces: 3, calentar: 0, que: "barrido: app_events_al_dia (meses, resumen de ayer y hoy)" }, async () => { await q(`update app_events_dia set refreshed_at = now() - interval '1 hour'`); return ev.analiticaAlDia(); });
// La retención: con eventos_retener_meses = 12 se resume y suelta el mes 13 (y se vuelve a dejar como estaba).
await q(`insert into platform_config (key, value, note) values ('eventos_retener_meses', '12', 'carga') on conflict (key) do update set value = excluded.value`);
await medir("retencion", { linea: "L207", presupuesto: 30000, veces: 1, calentar: 0, que: "barrido: resumir y soltar el mes que pasa la retención" }, () => ev.analiticaAlDia());
await q(`delete from platform_config where key = 'eventos_retener_meses' and note = 'carga'`);
const dia = await uno(`select count(*)::int as filas, coalesce(sum(n), 0)::bigint as eventos from app_events_dia`);
anotar("resumen-dia", { linea: "L207", que: `app_events_dia: ${dia.filas} filas que resumen ${dia.eventos} eventos`, valor: dia.filas, tope: null, unidad: "filas" });
process.exit(await fin() ? 1 : 0);
