-- 0194 · Patrocinios: los días comprados se cuentan por el calendario de la ciudad (20 nov, confirmación 44658035571, pat002).
-- 0175 los deducía de la duración (ends_at − starts_at, redondeada con 1 h de margen por el cambio de horario). Una compra que empieza «hoy»
-- arranca AHORA y termina a medianoche del día 7: comprada en la última hora del día, 6 d + < 1 h → 6 días, y al terminar se devolvían «6 de 6»
-- (el precio entero) aunque ya se había usado un día. Aquí los días comprados se miden desde la medianoche local del día en que empieza
-- (el día empezado cuenta como comprado y como usado). Lo demás (sin_usar, pausa) no cambia. La versión de 8 argumentos queda (nada se borra)
-- pero el código ya no la usa (guardián patrocinioDiasPorCalendario).
create or replace function patrocinio_dias_comprados(a timestamptz, b timestamptz, ext integer, tz text)
returns integer language sql immutable as $$
  select greatest(1, ceil((extract(epoch from b - ((date_trunc('day', a at time zone tz)) at time zone tz)) - ext) / 86400.0 - 1 / 24.0))::int
$$;

create or replace function patrocinio_devolucion(modo text, precio integer, a timestamptz, b timestamptz, ext integer, pausa_s integer, pausa_desde timestamptz, t timestamptz, tz text)
returns table (cents integer, dias integer) language sql immutable as $$
  with x as (select patrocinio_dias_comprados(a, b, ext, tz) as total,
                    extract(epoch from b - a) - ext as comprado,
                    pausa_s + coalesce(greatest(0, extract(epoch from t - pausa_desde)), 0) as pausado),
       d as (select total, (case modo
                when 'todo' then total
                when 'sin_usar' then case when t <= a then total
                  else least(total, greatest(0, floor((comprado - greatest(0, extract(epoch from t - a) - pausado)) / 86400.0 + 1 / 24.0)))::int end
                when 'pausa' then least(total, greatest(0, floor((pausado - ext) / 86400.0 + 1 / 24.0)))::int
                else 0 end)::int as dias from x)
  select (case when d.dias >= d.total then precio else floor(precio::numeric * d.dias / d.total) end)::int, d.dias from d
$$;
