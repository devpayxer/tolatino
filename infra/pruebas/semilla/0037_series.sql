-- Semilla de pruebas · 6f · Series y eventos de varios días. SOLO SANDBOX.
-- La semilla 0035 metió como un solo día lo que en el prototipo (TLEvt.E, dash2-evt.js toPanel: rep, span, dh) se repite o dura varios
-- días; aquí pasan a su forma real, sin tocar 0035:
--   · «Sancocho del domingo en familia» (Sabor Dominicano) → cada domingo, 8 fechas.
--   · «Vigilia de oración y alabanza» (Parroquia Santa María) → el mismo día de cada mes, 6 fechas.
--   · «Festival del Sancocho» (Sabor Dominicano, con cambios pedidos) → 3 días seguidos; el último cierra más temprano.
-- Las fechas las genera la base (evt_sincronizar_fechas → evt_generar_fechas, 0111) con los topes de Configuración. Idempotente: solo
-- cambia un evento que todavía es de un día; en una base nueva sin equipo (CI) los eventos ya quedaron en revisión (0035) y esto solo
-- les da su forma. Una fecha con gente (RSVP) se queda como el día de la regla que le toca.
begin;

do $$
declare r record;
begin
  for r in select e.id, e.title->>'es' as t from events e
            where e.kind = 'single' and e.status not in ('cancelled', 'rejected', 'done')
              and ((e.business_id = 'sabor-dominicano' and e.title->>'es' in ('Sancocho del domingo en familia', 'Festival del Sancocho'))
                or (e.business_id = 'parroquia-santa-maria' and e.title->>'es' = 'Vigilia de oración y alabanza'))
              and not exists (select 1 from tickets t where t.event_id = e.id and t.status in ('valid', 'used'))
  loop
    if r.t = 'Sancocho del domingo en familia' then
      -- Cada domingo (como dice su nombre): la primera fecha pasa al domingo siguiente si 0035 la dejó otro día.
      update events set kind = 'series', start_date = start_date + ((7 - extract(dow from start_date)::int) % 7), rep = '{"k":"w","days":[0],"n":8,"skip":[]}'::jsonb where id = r.id;
    elsif r.t = 'Vigilia de oración y alabanza' then
      update events set kind = 'series', rep = jsonb_build_object('k', 'm', 'days', '[]'::jsonb, 'n', 6, 'skip', '[]'::jsonb) where id = r.id;
    else
      update events set kind = 'span', span_days = 3, day_hours = jsonb_build_array(jsonb_build_object('h0', start_min, 'h1', end_min), jsonb_build_object('h0', start_min, 'h1', end_min),
                                                                                    jsonb_build_object('h0', start_min, 'h1', greatest(start_min + 120, end_min - 180))) where id = r.id;
    end if;
    perform evt_sincronizar_fechas(r.id);
  end loop;
end $$;

commit;
