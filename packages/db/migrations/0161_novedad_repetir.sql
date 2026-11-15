-- 0161 · Fase 9 · 9n-11 — Novedades que se repiten (LAUNCH «Repetir (todos los días, lun · mié · vie…)»; diseño Panel v2 schedBlocks):
-- QUÉ DÍAS (0 = domingo … 6 = sábado), «Sale a las» (minuto del día, en la hora del negocio), CADA VEZ SE VE (hasta que cierra · 3 h · 6 h · 24 h)
-- y HASTA CUÁNDO (sin fin · una fecha). Es la MISMA publicación (sus votos y comentarios siguen): el barrido la vuelve a sacar en el siguiente
-- día que toca (publish_at / ends_at nuevos) y se salta los días que el negocio cierra (negocio_dia_cerrado, 0160). A los seguidores se les avisa
-- solo la primera vez (followers_notified_at). Detener (status 'stopped') la para. Idempotente.
begin;

alter table business_posts add column if not exists repeat_days smallint[];
alter table business_posts add column if not exists repeat_min smallint;
alter table business_posts add column if not exists repeat_dur text;
alter table business_posts add column if not exists repeat_until date;
alter table business_posts add column if not exists repeat_n integer not null default 0;
alter table business_posts drop constraint if exists business_posts_repetir;
alter table business_posts add constraint business_posts_repetir check (
  (repeat_days is null) = (repeat_min is null) and (repeat_days is null) = (repeat_dur is null)
  and (repeat_days is null or (cardinality(repeat_days) between 1 and 7 and repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]))
  and (repeat_min is null or repeat_min between 0 and 1439)
  and (repeat_dur is null or repeat_dur in ('close', '3h', '6h', '24h'))
  and (repeat_until is null or repeat_days is not null)
  and repeat_n >= 0);
create index if not exists business_posts_repetir_idx on business_posts (ends_at) where repeat_days is not null and status = 'live' and hidden_at is null;

-- La siguiente vez que sale después de `desde` (hasta 15 días adelante), en un día que toca, antes de `hasta` y con el negocio abierto ese día.
create or replace function novedad_siguiente(bid text, dias smallint[], m int, hasta date, desde timestamptz) returns timestamptz language sql stable as $$
  select x.t from (
    select ((d::date + make_interval(mins => m)) at time zone c.timezone) as t, d::date as dia
      from businesses b join cities c on c.id = b.city_id
      cross join generate_series((desde at time zone c.timezone)::date, (desde at time zone c.timezone)::date + 15, interval '1 day') d
     where b.id = bid) x
   where extract(dow from x.dia)::int = any(dias) and (hasta is null or x.dia <= hasta) and x.t > desde and not negocio_dia_cerrado(bid, x.dia)
   order by x.t limit 1
$$;

-- Hasta cuándo se ve cada vez: 3/6/24 h, o hasta que cierra ese día (la última hora del horario de la semana; si ya cerró o no abre, 6 h).
create or replace function novedad_fin(bid text, t timestamptz, dur text) returns timestamptz language sql stable as $$
  select case dur when '3h' then t + interval '3 hours' when '6h' then t + interval '6 hours' when '24h' then t + interval '24 hours'
    else coalesce((
      select z.fin from (
        select (((t at time zone c.timezone)::date + (h.ranges->-1->>1)::time) at time zone c.timezone)
               + case when (h.ranges->-1->>1)::time <= (h.ranges->-1->>0)::time then interval '1 day' else interval '0' end as fin
          from businesses b join cities c on c.id = b.city_id
          join business_hours h on h.business_id = b.id and h.module = '' and h.open and jsonb_array_length(h.ranges) > 0
                                and h.weekday = extract(dow from t at time zone c.timezone)::int
         where b.id = bid) z where z.fin > t), t + interval '6 hours') end
$$;

commit;
