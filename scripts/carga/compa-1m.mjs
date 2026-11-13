#!/usr/bin/env node
/* 9b-3 · El Compa con 1 M de conversaciones y 5 M de mensajes (plan 7; fase7-compa.md: buscar en la ayuda ≤ 30 ms, armar el contexto ≤ 50 ms,
   lista de Conversaciones del Super Admin p95 ≤ 80 ms con cursor). Necesita el Centro de ayuda indexado (scripts/ayuda/indexar.mjs) y los
   vecinos de comunidad-1m. Uso: DATABASE_URL=… node scripts/carga/compa-1m.mjs [--sin-generar] */
import { analizar, app, candado, fin, guardarMeta, medir, meta, n, porLotes, q, STAFF, uno } from "./lib/comun.mjs";

await candado();
const CONV = n(1_000_000), MSJ = n(5_000_000);
const nv = (await uno(`select count(*)::int as n from carga_v`).catch(() => null))?.n;
if (!nv) { console.error("[carga] corre primero comunidad-1m (los vecinos de la carga)"); process.exit(2); }

if (!process.argv.includes("--sin-generar") && !(await meta("compa"))) {
  await porLotes("conversaciones", CONV, `
    insert into compa_conversations (number, use, channel, surface, user_id, city_id, lang, outcome, ai, turns_n, started_at, updated_at, closed_at, is_test)
    select 'CP-' || lpad((10000000 + g)::text, 8, '0'), (array['neighbor','neighbor','owner','copilot'])[1 + g % 4], 'app', (array['support_page','help_sheet','panel','business_chat'])[1 + g % 4],
           v.id, v.c, 'es', case when g % 50 = 0 then 'open' else (array['self_resolved','action_done','handed_off'])[1 + g % 3] end, true, 5,
           now() - make_interval(secs => (g::bigint * 13) % 31536000), now() - make_interval(secs => (g::bigint * 13) % 31536000), case when g % 50 = 0 then null else now() - make_interval(secs => (g::bigint * 13) % 31536000) end, true
      from generate_series($1::int, $2::int) g join carga_v v on v.k = 1 + (g::bigint * 7) % ${nv}`);
  await porLotes("mensajes", MSJ, `
    insert into compa_messages (conversation_id, city_id, sender, user_id, text, engine, at)
    select c.id, c.city_id, case when g % 2 = 0 then 'user' else 'compa' end, case when g % 2 = 0 then c.user_id end,
           case when g % 2 = 0 then '¿Cómo cancelo mi pedido?' else 'Desde Mis pedidos, toca el pedido y luego «Cancelar». Si ya salió, escríbele al negocio.' end,
           case when g % 2 = 0 then null else 'modelo' end, c.started_at + make_interval(secs => g % 600)
      from generate_series($1::int, $2::int) g join compa_conversations c on c.id = (select min(id) from compa_conversations where number like 'CP-1%') + (g % ${CONV})`, 500_000);
  await guardarMeta("compa", CONV);
  await analizar();
}

const VS = (await q(`select id::text from carga_v where c = 'hzl' order by k limit 100`)).map((x) => x.id);
const ind = await app("lib/compa/ayuda-indice.ts"), ctx = await app("lib/compa/contexto-vecino.ts"), adm = await app("lib/compa/admin-compa.ts");
const PREG = ["cómo cancelo mi pedido", "devolución de un boleto", "cambiar mi teléfono", "borrar mi cuenta", "dónde veo mis cupones", "refund my ticket"];
await medir("ayuda-buscar", { linea: "7d", presupuesto: 30, que: "buscar en la ayuda (con 1 M de conversaciones en la base)" }, (i) => ind.buscarAyuda(PREG[i % PREG.length], i % PREG.length === 5 ? "en" : "es", ["vecino"], 20));
await medir("compa-contexto", { linea: "7c", presupuesto: 50, que: "armar el contexto de un vecino" }, (i) => ctx.contextoVecino(VS[i % VS.length], "es"));
const ADM = (await uno(`select user_id::text as id from staff_members where status = 'active' and role = 'admin' limit 1`))?.id ?? VS[0];
const S = STAFF(ADM);
await medir("compa-conversaciones", { linea: "7i", presupuesto: 80, que: "Super Admin › El Compa › Conversaciones (5 M de mensajes, cursor)" }, () => adm.datosCompaAdmin(S, { uso: null, resultado: null, antes: null }));
const NUM = (await q(`select number from compa_conversations where number like 'CP-1%' order by id desc limit 30`)).map((x) => x.number);
await medir("compa-ficha", { linea: "7i", presupuesto: 80, que: "la ficha de una conversación" }, (i) => adm.fichaConversacion(S, NUM[i % NUM.length]));
process.exit(await fin() ? 1 : 0);
