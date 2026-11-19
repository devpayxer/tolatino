-- 0183 · 9t (19 nov) — Destacar eventos (LAUNCH «Destacar eventos»; modelo Featured · Destacado: «Super Admin › Crecimiento › Destacados»; admin-dashboard
-- ADM-MKT «negocios/eventos destacados en la ciudad por fecha»). La tabla `featured` de 0138 llevaba solo negocios (Negocios › Destacados); ahora también
-- fija EVENTOS arriba de Eventos de la ciudad. Destacado es editorial (lo decide el equipo, con motivo, sin cobro); Patrocinado (C-003, 0174) es pagado y
-- va por su lado (event_sponsorships): uno no toca al otro.
-- Lo decide la base:
--   · featured.placement 'eventos' lleva event_id (y nunca business_id) y solo «fijar» (los eventos no tienen rotación que «quitar»). Nada se borra ni se
--     edita: se retira y se crea otro (featured_reglas, igual que los negocios).
--   · Desde y hasta las elige el equipo (from_at puede ser futuro; el máximo de 30 días es el de 0138).
--   · Solo se fija un evento de ESA ciudad, no cancelado y con una fecha publicada (listable) que todavía no termina; un evento no tiene dos vivos.
--   · Nunca más de destacados_evt_por_ciudad a la vez en una ciudad (el peor momento del rango, con candado por ciudad). Un evento que se canceló, se
--     ocultó o ya pasó deja de ocupar su puesto y deja de salir solo (la consulta pública pide listable): nadie tiene que retirarlo.
-- Idempotente.
begin;

-- ── Configuración › Crecimiento ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('destacados_evt_por_ciudad', 1, 12, 4, '{"es":"eventos","en":"events"}', 'crecimiento', '{"es":"Destacados de Eventos · fijados a la vez por ciudad","en":"Featured events · pinned at once per city"}',
    '{"es":"Cuántos eventos puede fijar el equipo arriba de Eventos a la vez en una ciudad. Bajarlo no retira a nadie: deja de aceptar más hasta que queden menos.","en":"How many events the team can pin at the top of Events at once in a city. Lowering it retires nobody: it stops accepting more until fewer remain."}', true, null, null, 1027)
on conflict (key) do nothing;

-- ── featured lleva eventos ──
alter table featured add column if not exists event_id bigint references events (id);
alter table featured alter column business_id drop not null;
alter table featured drop constraint if exists featured_placement_check;
alter table featured add constraint featured_placement_check check (placement in ('negocios', 'eventos'));
alter table featured drop constraint if exists featured_que_check;
alter table featured add constraint featured_que_check check (
  (placement = 'negocios' and business_id is not null and event_id is null)
  or (placement = 'eventos' and event_id is not null and business_id is null and mode = 'fijar'));
-- Lo de cada evento (el panel del organizador, la ficha del Super Admin).
create index if not exists featured_evento_idx on featured (event_id, created_at desc) where event_id is not null;

-- Cuántos destacados de eventos vivos (de eventos que todavía se ven) se cruzan con [a, b) en una ciudad en el peor momento (el máximo a la vez).
create or replace function destacados_evt_a_la_vez(ciudad text, a timestamptz, b timestamptz) returns integer language sql stable as $$
  with v as (select f.from_at, f.to_at from public.featured f join public.events e on e.id = f.event_id
              where f.city_id = ciudad and f.placement = 'eventos' and f.retired_at is null and f.to_at > now() and f.from_at < b and f.to_at > a
                and e.status <> 'cancelled' and exists (select 1 from public.event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()))
  select coalesce(max((select count(*) from v v2 where v2.from_at <= p.t and v2.to_at > p.t)), 0)::int
    from (select a as t union select v.from_at from v where v.from_at > a and v.from_at < b) p
$$;

create or replace function featured_reglas() returns trigger language plpgsql as $$
declare n integer;
begin
  if tg_op = 'DELETE' then raise exception 'un destacado no se borra: se retira'; end if;
  if tg_op = 'UPDATE' then
    if old.retired_at is not null then raise exception 'un destacado retirado no vuelve'; end if;
    if new.business_id is distinct from old.business_id or new.event_id is distinct from old.event_id or new.placement <> old.placement or new.mode <> old.mode
       or new.city_id <> old.city_id or new.from_at <> old.from_at or new.to_at <> old.to_at then
      raise exception 'un destacado no se edita: se retira y se crea otro'; end if;
    return new;
  end if;
  if new.placement = 'eventos' then
    perform pg_advisory_xact_lock(hashtextextended('destacados_evt:' || new.city_id, 0));
    if not exists (select 1 from public.events e where e.id = new.event_id and e.city_id = new.city_id and e.status <> 'cancelled'
                     and exists (select 1 from public.event_dates d where d.event_id = e.id and d.listable and d.ends_at > greatest(now(), new.from_at))) then
      raise exception 'destacado_evento: el evento no está publicado en esta ciudad o ya pasó';
    end if;
    if exists (select 1 from public.featured f where f.event_id = new.event_id and f.retired_at is null and f.to_at > now()) then raise exception 'destacado: ese evento ya tiene uno vivo'; end if;
    if public.destacados_evt_a_la_vez(new.city_id, new.from_at, new.to_at) >= public.cfg_int('destacados_evt_por_ciudad') then raise exception 'destacados_evt_tope'; end if;
    return new;
  end if;
  if not exists (select 1 from public.businesses b where b.id = new.business_id and b.city_id = new.city_id) then raise exception 'destacado: el negocio es de otra ciudad'; end if;
  perform pg_advisory_xact_lock(hashtextextended('destacados:' || new.city_id, 0));
  if exists (select 1 from public.featured f where f.business_id = new.business_id and f.retired_at is null and f.to_at > now()) then raise exception 'destacado: ese negocio ya tiene uno vivo'; end if;
  if new.mode = 'fijar' then
    select count(*) into n from public.featured f where f.city_id = new.city_id and f.placement = new.placement and f.mode = 'fijar' and f.retired_at is null and f.to_at > now();
    if n >= public.cfg_int('destacados_por_ciudad') then raise exception 'destacados_tope'; end if;
  end if;
  return new;
end $$;
drop trigger if exists featured_reglas on featured;
create trigger featured_reglas before insert or update or delete on featured for each row execute function featured_reglas();

commit;
