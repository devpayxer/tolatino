-- 9n · Las horas de UNA fecha con sus días especiales (LAUNCH «Visitas con las horas de un día especial»): las visitas de Bienes Raíces y
-- las del dealer arman sus horas en SQL; respetaban el día cerrado y la temporada (negocio_dia_cerrado, 0160) pero un día especial con OTRAS
-- horas ofrecía las de la semana. Igual que horasDelDia (lib/dias-especiales.ts): cerrado → []; día especial abierto con horas propias → esas
-- (el más nuevo); si no, el horario de la semana (módulo general).
begin;

create or replace function negocio_rangos_dia(bid text, d date) returns jsonb language sql stable as $$
  select case when negocio_dia_cerrado(bid, d) then '[]'::jsonb else coalesce(
    (select nullif(s.ranges, '[]'::jsonb) from special_hours s
      where s.business_id = bid and s.status = 'active' and s.kind <> 'season' and not s.closed and d between s.date_from and s.date_to
      order by s.id desc limit 1),
    (select h.ranges from business_hours h where h.business_id = bid and h.module = '' and h.weekday = extract(dow from d)::int and h.open limit 1),
    '[]'::jsonb) end
$$;

commit;
