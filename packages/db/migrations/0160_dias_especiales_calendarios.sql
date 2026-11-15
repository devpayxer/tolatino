-- 0160 · Fase 9 · 9n-10 — Los días especiales y la temporada en TODOS los calendarios (LAUNCH «La temporada en las citas» y su clase).
-- negocio_abierto (0144) ya miraba feriados, vacaciones, días propios cerrados y la temporada para «abierto ahora»; los calendarios a futuro armaban
-- el día con el horario de la semana. En TypeScript lo hace lib/dias-especiales.ts; los que arman los días en SQL (visitas de Bienes Raíces y del
-- dealer, el plazo para responder) usan esta función: ¿ESE día el negocio está cerrado entero? Idempotente.
begin;

create or replace function negocio_dia_cerrado(bid text, d date) returns boolean language sql stable as $$
  select exists (select 1 from special_hours s where s.business_id = bid and s.status = 'active' and s.kind <> 'season' and s.closed and d between s.date_from and s.date_to)
      or not coalesce((select bool_or(d between s.date_from and s.date_to) from special_hours s where s.business_id = bid and s.status = 'active' and s.kind = 'season'), true)
      or exists (select 1 from businesses b join cities c on c.id = b.city_id
                  where b.id = bid and b.temp_closed_until > now() and d <= (b.temp_closed_until at time zone c.timezone)::date)
$$;

-- Leer los días especiales de un negocio por su ventana de fechas (y su temporada) con un índice.
create index if not exists special_hours_negocio_idx on special_hours (business_id, date_from, date_to) where status = 'active';

commit;
