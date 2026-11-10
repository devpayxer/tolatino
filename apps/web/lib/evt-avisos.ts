import "server-only";
import { avisar, avisarNegocio } from "./avisos";
import { cfgSql } from "./config";
import { db } from "./db";
import { diaCorto, hora, type Bi } from "./evt-comun";

/* 6j · Los avisos automáticos de Eventos que faltaban (fase6-eventos.md §2 0108 y §4 6j; LAUNCH-CHECKLIST 6c):
   - «Mañana: …» (bol_recordatorio) y «¡Es hoy!» (bol_es_hoy) a quien TIENE un boleto vivo (el dueño de hoy, también si lo recibió por
     transferencia), desde la hora de Configuración (evt_recordatorio_hora) de la ciudad de la fecha; «¡Es hoy!» solo si todavía no empezó.
     Un pase de varios días: «Mañana» antes de su primer día y «¡Es hoy!» cada día que vale. Se apagan en Mi cuenta › Avisos › Eventos ›
     Recordatorios (pref evtR). Sin SMS.
   - «Tu evento casi se agota» (evt_aforo90) al organizador cuando lo vendido de una fecha llega a evt_aforo_aviso_pct de lo que está a la
     venta (cortesías incluidas: ocupan lugar).
   Cada uno sale UNA vez: evt_avisos_enviados (solo inserción, pk kind + ref) se escribe antes de avisar; correr el barrido otra vez o dos
   barridos a la vez no mandan otro. Lo llama el barrido de cada minuto. */
type Fila = { ref: string; uid: string; fid: string; title: Bi; slug: string; ldate: string; h0: number; lugar: string; en: boolean };

const DATOS = `select x.ref, split_part(x.ref, ':', 2) as uid, split_part(x.ref, ':', 1) as fid, e.title, e.slug, d.local_date::text as ldate,
                      (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
                      case when e.venue_mode = 'other' then e.venue_name else b.name end as lugar, coalesce(u.lang = 'en', false) as en
                 from nuevos x join event_dates d on d.id = split_part(x.ref, ':', 1)::bigint join events e on e.id = d.event_id
                 join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id join users u on u.id = split_part(x.ref, ':', 2)::uuid`;

/* Las fechas que vale cada boleto vivo con dueño; en varios días, la que toca. */
const VALE = `from tickets t join events e on e.id = t.event_id
               join event_dates d on d.event_id = t.event_id and (case when e.kind = 'span' then d.day_index = any(t.valid_days) else d.id = t.event_date_id end)
               join cities ci on ci.id = d.city_id
              where t.status = 'valid' and t.holder_user_id is not null and d.status = 'scheduled' and e.status in ('live', 'paused')`;

export async function barrerRecordatoriosBoletos(): Promise<{ manana: number; hoy: number }> {
  const H = cfgSql("evt_recordatorio_hora"), out = { manana: 0, hoy: 0 };
  for (const [kind, tpl, cond] of [
    ["bol_manana", "bol_recordatorio", `d.local_date = (now() at time zone ci.timezone)::date + 1 and extract(hour from now() at time zone ci.timezone) >= ${H}
       and (e.kind <> 'span' or d.day_index = (select min(v) from unnest(t.valid_days) v))`],
    ["bol_hoy", "bol_es_hoy", `d.local_date = (now() at time zone ci.timezone)::date and extract(hour from now() at time zone ci.timezone) >= ${H} and d.starts_at > now()`],
  ] as const) {
    const L = (await db().query<Fila>(
      `with nuevos as (
         insert into evt_avisos_enviados (kind, ref, city_id)
         select '${kind}', d.id::text || ':' || t.holder_user_id::text, d.city_id ${VALE} and ${cond}
          group by d.id, t.holder_user_id, d.city_id limit 500
         on conflict do nothing returning ref)
       ${DATOS}`)).rows;
    for (const x of L) {
      await avisar(x.uid, tpl, { evento: x.en ? x.title.en || x.title.es : x.title.es, cuando: `${diaCorto(x.ldate, !x.en)} · ${hora(x.h0)}`, lugar: x.lugar },
        { href: "/cuenta/boletos", ref: ["event_date", x.fid] });
    }
    out[kind === "bol_manana" ? "manana" : "hoy"] = L.length;
  }
  return out;
}

/* El organizador: una fecha con boletos que llegó al porcentaje de Configuración de lo que está a la venta. */
export async function barrerAforoEvt(): Promise<number> {
  const L = (await db().query<{ fid: string; biz: string; title: Bi; ldate: string; h0: number; vendidos: number; total: number }>(
    `with f as (
       select d.id, d.city_id, e.business_id, e.title, d.local_date, d.starts_at, ci.timezone, sum(s.sold_n)::int as vendidos, sum(s.quantity)::int as total
         from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id
         join ticket_stock s on s.event_date_id = d.id join ticket_types tt on tt.id = s.ticket_type_id and not tt.off
        where d.status = 'scheduled' and d.starts_at > now() and e.status in ('live', 'paused') and e.entry = 'tickets'
        group by d.id, d.city_id, e.business_id, e.title, d.local_date, d.starts_at, ci.timezone
       having sum(s.quantity) > 0 and sum(s.sold_n) * 100 >= sum(s.quantity) * ${cfgSql("evt_aforo_aviso_pct")}),
     nuevos as (insert into evt_avisos_enviados (kind, ref, city_id) select 'aforo', f.id::text, f.city_id from f limit 200 on conflict do nothing returning ref)
     select f.id::text as fid, f.business_id as biz, f.title, f.local_date::text as ldate,
            (extract(hour from f.starts_at at time zone f.timezone) * 60 + extract(minute from f.starts_at at time zone f.timezone))::int as h0, f.vendidos, f.total
       from f join nuevos n on n.ref = f.id::text`)).rows;
  for (const x of L) {
    await avisarNegocio(x.biz, "evt_aforo90", { evento: x.title.es, cuando: `${diaCorto(x.ldate, true)} · ${hora(x.h0)}`, pct: Math.floor((x.vendidos * 100) / x.total), vendidos: x.vendidos, total: x.total },
      { href: "/panel", ref: ["event_date", x.fid] });
  }
  return L.length;
}
