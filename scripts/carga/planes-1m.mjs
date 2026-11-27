#!/usr/bin/env node
/* 27 nov (LAUNCH «Barridos por clase: lo que quedó de 9t9» (4)) · Lo que el barrido de cada minuto elige de los Planes del Hogar con 1 M de planes:
   TOCA_PLAN (lib/planes.ts: lo que toca hoy en la ciudad de cada plan, lo más atrasado primero, de a 50; barrerPlanes la corre por tandas). Llena 1 M de
   planes (90 % activos con su cobro y su visita repartidos en los próximos 30 días, 5 % en pausa, 5 % cancelados; 1 de cada 20 000 con el cobro HOY),
   1 M de citas de plan y 1 M de cobros hechos (uno por plan, el del mes pasado), y mide la consulta TAL CUAL está en el código (se lee de lib/planes.ts, no
   se copia) con su plan (EXPLAIN ANALYZE): ningún recorrido secuencial sobre plan_subscriptions, operations ni offsession_charges, y su p95 contra el
   presupuesto. Dos momentos: el de todo el día (lo que toca ya se hizo: pocos candidatos) y el del principio del día (1 de cada 30 activos con el cobro
   hoy: ~30 mil candidatos). Uso: DATABASE_URL=… node scripts/carga/planes-1m.mjs [--sin-generar] */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./lib/app.mjs";
import { analizar, anotar, candado, fin, generar, guardarMeta, meta, n, porLotes, q, uno } from "./lib/comun.mjs";

await candado();
const PL = n(1_000_000);

if (!process.argv.includes("--sin-generar") && !(await meta("planes"))) {
  const u = (await uno(`select id::text from users order by created_at limit 1`))?.id ?? "00000000-0000-0000-0000-000000000000";
  const it = (await uno(`select id::text from items order by id limit 1`))?.id ?? "1";
  // Cada plan con su cita de plan (operations kind 'plan'); el día de hoy en Nueva York (las cinco ciudades están en esa zona).
  await porLotes("planes y sus citas", PL, `
    with o as (
      insert into operations (number, kind, city_id, business_id, user_id, pay_mode, client_key, status, details, subtotal_cents, total_cents, is_test)
      select 'PL-C' || g, 'plan', (array['hzl','alw','wbr','scr','rdg'])[1 + g % 5], 'carga-plan-' || (g % 2000), '${u}'::uuid, 'app', gen_random_uuid(), 'confirmed', '{}'::jsonb, 9900, 9900, true
        from generate_series($1::int, $2::int) g
      returning id, number, city_id, business_id)
    insert into plan_subscriptions (operation_id, business_id, user_id, city_id, item_id, price_cents, dow, nth, window_m, charge_day, first_visit_on, next_visit_on, next_charge_on,
                                    status, paused_until, payment_method, created_at, updated_at, cancelled_at)
    select o.id, o.business_id, '${u}'::uuid, o.city_id, ${it}, 9900, 2, 2, 540, 5, h.hoy - 60,
           case when x.g % 20 = 2 then null else h.hoy + 1 + (x.g / 20) % 28 end,
           case when x.g % 20 = 2 then null when x.g % 20000 = 0 then h.hoy else h.hoy + 1 + (x.g / 20) % 30 end,
           case x.g % 20 when 1 then 'paused' when 2 then 'cancelled' else 'active' end,
           case when x.g % 20 = 1 then h.hoy + 1 + (x.g / 20) % 60 end, 'pm_carga_plan', now() - interval '400 days',
           now() - make_interval(hours => 2 + (x.g % 8760)), case when x.g % 20 = 2 then now() - interval '10 days' end
      from o cross join lateral (select substr(o.number, 5)::int as g) x
      cross join (select (now() at time zone 'America/New_York')::date as hoy) h`, 200_000);
  // El cobro del mes pasado de cada plan (hecho): la tabla de los cobros fuera de sesión con su tamaño de verdad.
  await generar("cobros hechos de los planes", `
    insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail, status, created_at)
    select 'plan', s.id::text, 'periodo-' || (s.first_visit_on + 30), s.operation_id, s.business_id, s.city_id, s.user_id, 9900, 0, 'acct_carga', 'pm_carga_plan',
           'plan-' || s.id || '-' || (s.first_visit_on + 30), '{}'::jsonb, 'done', now() - interval '30 days'
      from plan_subscriptions s where s.payment_method = 'pm_carga_plan'`);
  await guardarMeta("planes", PL);
  await analizar();
}

// La consulta del código, tal cual (si cambia en lib/planes.ts, se mide la nueva).
const fuente = readFileSync(join(RAIZ, "apps/web/lib/planes.ts"), "utf8");
const TOCA = /const TOCA_PLAN = `([\s\S]*?)`;/.exec(fuente)?.[1];
if (!TOCA) { anotar("toca-plan", { linea: "9t9 (4)", que: "TOCA_PLAN no está en lib/planes.ts", valor: 1, tope: 0, unidad: "error" }); process.exit((await fin()) ? 1 : 0); }
const planes = Number((await uno(`select count(*)::int as n from plan_subscriptions`)).n), mil = planes.toLocaleString("es-US");
async function medirToca(id, que, presupuesto) {
  const plan = (await q(`explain (analyze, buffers, format json) ${TOCA}`, [[]]))[0]["QUERY PLAN"][0];
  const nodos = [];
  const recorrer = (x) => { nodos.push(x); for (const h of x.Plans ?? []) recorrer(h); };
  recorrer(plan.Plan);
  const seq = nodos.filter((x) => x["Node Type"] === "Seq Scan" && ["plan_subscriptions", "operations", "offsession_charges"].includes(x["Relation Name"]));
  const filas = nodos.find((x) => x["Node Type"] === "Limit")?.["Actual Rows"];
  console.log(`[plan] ${id}: ${plan["Execution Time"].toFixed(1)} ms · ${filas} filas · índices: ${[...new Set(nodos.map((x) => x["Index Name"]).filter(Boolean))].join(", ")}` +
    `${seq.length ? ` · SECUENCIAL: ${seq.map((x) => x["Relation Name"]).join(", ")}` : ""}`);
  anotar(`${id}-secuencial`, { linea: "9t9 (4)", que: `${que}: recorridos secuenciales sobre plan_subscriptions, operations u offsession_charges`, valor: seq.length, tope: 0, unidad: "recorridos" });
  // El p95 de la consulta (cada tanda del barrido central es una).
  const xs = [];
  for (let i = 0; i < 23; i++) { const t = performance.now(); await q(TOCA, [[]]); if (i >= 3) xs.push(performance.now() - t); }
  xs.sort((a, b) => a - b);
  anotar(id, { linea: "9t9 (4)", que: `${que}, p95 de una tanda`, valor: +xs[Math.ceil(0.95 * xs.length) - 1].toFixed(1), tope: presupuesto, unidad: "ms" });
}
// Con el JIT de Postgres encendido (el de fábrica) se le van ~25 ms por compilar: el planificador no sabe cuántos candidatos salen del tope de las ciudades.
await medirToca("toca-plan", `TOCA_PLAN con ${mil} planes, durante el día`, 100);
// El principio del día: 1 de cada 30 planes activos con el cobro hoy (los que no se cobraron todavía). Se deja como estaba al terminar (con su vacuum:
// sin él, el índice del cobro arrastra las versiones viejas de las filas cambiadas y la medida sería de la limpieza, no de la consulta).
const hoy = `(now() at time zone 'America/New_York')::date`;
await q(`update plan_subscriptions set next_charge_on = ${hoy}, updated_at = updated_at where payment_method = 'pm_carga_plan' and status = 'active' and id % 30 = 7`);
await q(`vacuum analyze plan_subscriptions`);
// Presupuesto más alto: es un momento del día, y cada tanda que elige 50 planes los cobra después (cada cobro tarda más que la consulta).
await medirToca("toca-plan-amanece", `TOCA_PLAN con ${mil} planes, al empezar el día (1 de cada 30 activos cobra hoy)`, 500);
await q(`update plan_subscriptions set next_charge_on = ${hoy} + 1 + ((id / 20) % 30)::int where payment_method = 'pm_carga_plan' and status = 'active' and id % 30 = 7`);
await q(`vacuum analyze plan_subscriptions`);
process.exit((await fin()) ? 1 : 0);
