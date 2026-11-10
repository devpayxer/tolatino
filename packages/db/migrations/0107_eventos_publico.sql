-- 0107 · eventos_publico (6b · docs/diseno/plan/fase6-eventos.md §2 0107 y §4 6b).
-- · El módulo Eventos del negocio decide si sus eventos salen al público: negocio activo, su categoría admite Eventos (Catálogo del
--   Super Admin), el interruptor del negocio encendido («eventos» en modules_on), sin pausa de To'Latino (modules_off ? 'eventos') y el
--   organizador sin bloquear. evt_listable (la regla de 0106) suma esa condición y la base vuelve a calcular `listable` de las fechas
--   cuando cambia cualquiera de esas cosas (triggers en businesses, event_organizers y categories). Lo público solo lee `listable`.
-- · rsvps: «Voy» de un evento con RSVP, con personas (1 – party_max). La entrada libre «sin lista» no aparta lugar (6a) y no lleva RSVP. El cupo lo cuenta la base: la fila de la fecha se
--   bloquea (for update) antes de contar, y el contador event_dates.rsvp_n (lugares guardados) lo lleva un trigger; un último control
--   después de sumar rechaza pasar del cupo aunque el código falle. Sin sobreventa con personas a la vez.
--   going_n = personas que dijeron que van (guardado, vencido o que llegaron); rsvp_n = lugares que se guardan hoy. Los derivados de una
--   fecha (sold_n, rsvp_n, going_n, inside_n, entered_n) solo los escriben sus triggers (marca tl.evt_derivado): nadie los edita.
--   El lugar se guarda hasta las puertas + rsvp_guarda_min (Configuración); después el RSVP vence en el barrido (POL_GRATIS).
--   door_code (6, sin 0/O/1/I) es para la puerta (6g): nunca sale en vistas públicas ni avisos.
-- · El cupo de un evento no baja de los lugares ya guardados (trigger). Un RSVP no se borra (estados).
-- · business_posts: el enlace de una novedad puede ser un evento (link_kind 'event' + event_id); sale en Hoy en el barrio solo si el
--   evento está en vivo (post_en_vivo lo exige).
-- · events.venue_zip: el código postal del «otro lugar» para ubicarlo con el geocodificador propio (dir_ubicar, 0025).
-- · app_events suma ver_evento · rsvp · guardar_evento · compartir_evento; plantillas rsvp_ok, rsvp_recordatorio, rsvp_vence,
--   evt_guardado_cerca (en la app, sin SMS); clave rsvp_guarda_min.
-- · Backfill: los negocios que ya tienen eventos encienden su módulo Eventos (en producción no hay eventos todavía).
-- Idempotente: if not exists, checks que se reemplazan, triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── El módulo Eventos del negocio decide si sus eventos salen ──
create or replace function evt_negocio_publico(neg text) returns boolean language sql stable as $$
  select exists (select 1 from businesses b join categories c on c.id = b.category_id
                  where b.id = neg and b.status = 'active' and 'eventos' = any(b.modules_on) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'eventos')
                    and coalesce(c.allowed_modules, '[]'::jsonb) ? 'eventos')
     and not exists (select 1 from event_organizers o where o.business_id = neg and o.blocked_at is not null)
$$;
-- La regla de 0106 (publicado, aprobado, sin ocultar, fecha programada) + el módulo del negocio y el organizador sin bloquear.
create or replace function evt_listable(e events, st text) returns boolean language sql stable as $$
  select e.status in ('live', 'paused') and e.approved_at is not null and e.hidden_at is null and st = 'scheduled' and evt_negocio_publico(e.business_id)
$$;

-- Los derivados de una fecha los escriben solo sus triggers (marca tl.evt_derivado); listable lo decide la base.
create or replace function event_dates_antes() returns trigger language plpgsql as $$
declare e events;
begin
  if tg_op = 'DELETE' then raise exception 'una fecha no se borra: se salta o se cancela'; end if;
  if tg_op = 'INSERT' then
    new.sold_n := 0; new.rsvp_n := 0; new.going_n := 0; new.inside_n := 0; new.entered_n := 0;
  elsif (new.sold_n, new.rsvp_n, new.going_n, new.inside_n, new.entered_n) is distinct from (old.sold_n, old.rsvp_n, old.going_n, old.inside_n, old.entered_n)
        and coalesce(current_setting('tl.evt_derivado', true), '') <> 'si' then
    raise exception 'los derivados de una fecha (vendidos, RSVP, van, adentro) los lleva la base';
  end if;
  select * into e from events where id = new.event_id;
  new.listable := evt_listable(e, new.status);
  new.city_id := e.city_id;
  new.updated_at := now();
  return new;
end $$;

-- Volver a calcular `listable` de las fechas de un negocio (el trigger de event_dates lo decide; aquí solo se le pide).
create or replace function evt_relistar(neg text) returns void language sql as $$
  update event_dates d set status = d.status from events e
   where e.id = d.event_id and e.business_id = neg and d.listable is distinct from evt_listable(e, d.status);
$$;
create or replace function evt_negocio_cambia() returns trigger language plpgsql as $$
begin
  if exists (select 1 from events where business_id = new.id) then perform evt_relistar(new.id); end if;
  return null;
end $$;
drop trigger if exists businesses_evt_relistar on businesses;
create trigger businesses_evt_relistar after update on businesses for each row
  when (old.modules_on is distinct from new.modules_on or old.modules_off is distinct from new.modules_off or old.status is distinct from new.status or old.category_id is distinct from new.category_id)
  execute function evt_negocio_cambia();
create or replace function evt_organizador_cambia() returns trigger language plpgsql as $$
begin
  perform evt_relistar(new.business_id);
  return null;
end $$;
drop trigger if exists event_organizers_relistar on event_organizers;
create trigger event_organizers_relistar after insert or update on event_organizers for each row execute function evt_organizador_cambia();
create or replace function evt_categoria_cambia() returns trigger language plpgsql as $$
declare b text;
begin
  for b in select distinct e.business_id from events e join businesses x on x.id = e.business_id where x.category_id = new.id loop
    perform evt_relistar(b);
  end loop;
  return null;
end $$;
drop trigger if exists categories_evt_relistar on categories;
create trigger categories_evt_relistar after update on categories for each row when (old.allowed_modules is distinct from new.allowed_modules) execute function evt_categoria_cambia();

-- ── «Otro lugar»: código postal para ubicarlo con el geocodificador propio ──
alter table events add column if not exists venue_zip text;
alter table events drop constraint if exists events_venue_zip_check;
alter table events add constraint events_venue_zip_check check (venue_zip is null or venue_zip ~ '^\d{5}$');

-- ── RSVP ──
create table if not exists rsvps (
  id                bigint generated always as identity primary key,
  event_date_id     bigint not null references event_dates (id),
  event_id          bigint not null references events (id),
  city_id           text not null references cities (id),
  user_id           uuid not null references users (id),
  party             smallint not null check (party between 1 and 10),
  status            text not null default 'going' check (status in ('going', 'cancelled', 'expired', 'attended')),
  hold_until        timestamptz not null,
  door_code         text not null check (door_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  reminded_at       timestamptz,
  doors_notified_at timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists rsvps_vivo on rsvps (event_date_id, user_id) where status = 'going';
create index if not exists rsvps_persona_idx on rsvps (user_id, created_at desc);
create index if not exists rsvps_fecha_idx on rsvps (event_date_id, status);
create index if not exists rsvps_vencen_idx on rsvps (hold_until) where status = 'going';

-- Antes: la fila de la fecha bloqueada, el cupo contado con lo guardado de verdad. Nada del cliente decide.
create or replace function rsvps_antes() returns trigger language plpgsql as $$
declare d event_dates; e events; ab text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; antes int := 0;
begin
  if tg_op = 'DELETE' then raise exception 'un RSVP no se borra: se cancela'; end if;
  if tg_op = 'UPDATE' then
    if (new.event_date_id, new.event_id, new.city_id, new.user_id, new.door_code, new.created_at) is distinct from (old.event_date_id, old.event_id, old.city_id, old.user_id, old.door_code, old.created_at) then
      raise exception 'de un RSVP solo cambian las personas y el estado';
    end if;
    if old.status <> 'going' and new.status is distinct from old.status and not (old.status = 'expired' and new.status = 'attended') then
      raise exception 'un RSVP cancelado o vencido no vuelve: se hace uno nuevo';
    end if;
    if old.status <> 'going' and new.party <> old.party then raise exception 'solo cambian las personas de un RSVP vivo'; end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then new.cancelled_at := now(); end if;
    new.updated_at := now();
    if not (new.status = 'going' and (old.status <> 'going' or new.party > old.party)) then return new; end if;
    antes := case when old.status = 'going' then old.party else 0 end;
  end if;
  -- Un lugar nuevo o más personas: la fecha bloqueada; el evento se lee con «for share» (nadie cambia el cupo mientras se cuenta).
  select * into d from event_dates where id = new.event_date_id for update;
  if not found then raise exception 'esa fecha no existe'; end if;
  select * into e from events where id = d.event_id for share;
  if tg_op = 'INSERT' then
    new.status := 'going'; new.event_id := d.event_id; new.city_id := d.city_id;
    new.hold_until := d.doors_at + make_interval(mins => cfg_int('rsvp_guarda_min'));
    new.created_at := now(); new.updated_at := now(); new.cancelled_at := null; new.reminded_at := null; new.doors_notified_at := null;
    if new.door_code is null or new.door_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
      new.door_code := '';
      for i in 1..6 loop new.door_code := new.door_code || substr(ab, 1 + floor(random() * length(ab))::int, 1); end loop;
    end if;
  end if;
  if not d.listable then raise exception 'evt_no_rsvp: este evento no recibe RSVP'; end if;
  if e.entry <> 'rsvp' then raise exception 'evt_no_rsvp: este evento no lleva RSVP (entrada libre sin lista o con boletos)'; end if;
  if e.status <> 'live' then raise exception 'evt_no_rsvp: el organizador pausó este evento'; end if;
  if now() >= d.doors_at + make_interval(mins => cfg_int('rsvp_guarda_min')) then raise exception 'evt_rsvp_cerrado: el RSVP de esta fecha ya cerró'; end if;
  if new.party > e.party_max then raise exception 'evt_rsvp_personas: hasta % personas por RSVP', e.party_max; end if;
  if e.rsvp_capacity > 0 and d.rsvp_n - antes + new.party > e.rsvp_capacity then raise exception 'evt_cupo_lleno: quedan % lugares', greatest(0, e.rsvp_capacity - d.rsvp_n + antes); end if;
  return new;
end $$;
drop trigger if exists rsvps_antes on rsvps;
create trigger rsvps_antes before insert or update or delete on rsvps for each row execute function rsvps_antes();

-- Después: los contadores de la fecha (con la marca) y el último control del cupo.
create or replace function rsvps_despues() returns trigger language plpgsql as $$
declare dh int; dg int; n int; cap int;
begin
  dh := (case when new.status = 'going' then new.party else 0 end) - (case when tg_op = 'UPDATE' and old.status = 'going' then old.party else 0 end);
  dg := (case when new.status <> 'cancelled' then new.party else 0 end) - (case when tg_op = 'UPDATE' and old.status <> 'cancelled' then old.party else 0 end);
  if dh = 0 and dg = 0 then return null; end if;
  perform set_config('tl.evt_derivado', 'si', true);
  update event_dates set rsvp_n = rsvp_n + dh, going_n = going_n + dg where id = new.event_date_id returning rsvp_n into n;
  perform set_config('tl.evt_derivado', '', true);
  select rsvp_capacity into cap from events where id = new.event_id;
  if dh > 0 and cap > 0 and n > cap then raise exception 'evt_cupo_lleno: el cupo se llenó'; end if;
  return null;
end $$;
drop trigger if exists rsvps_despues on rsvps;
create trigger rsvps_despues after insert or update on rsvps for each row execute function rsvps_despues();

-- El cupo de un evento no baja de los lugares que ya se guardaron.
create or replace function events_cupo() returns trigger language plpgsql as $$
declare n int;
begin
  if new.rsvp_capacity > 0 and new.rsvp_capacity is distinct from old.rsvp_capacity then
    select coalesce(max(rsvp_n), 0) into n from event_dates where event_id = new.id and status = 'scheduled';
    if n > new.rsvp_capacity then raise exception 'evt_cupo_bajo: ya van %; el cupo no baja de ahí', n; end if;
  end if;
  return new;
end $$;
drop trigger if exists events_cupo on events;
create trigger events_cupo before update of rsvp_capacity on events for each row execute function events_cupo();

-- «Un evento que guardaste es mañana»: un aviso por persona y fecha (idempotente).
create table if not exists event_save_reminders (
  user_id       uuid not null references users (id),
  event_date_id bigint not null references event_dates (id),
  at            timestamptz not null default now(),
  primary key (user_id, event_date_id)
);
create index if not exists favorites_objetivo_idx on favorites (kind, target_id);

-- ── Novedad con enlace a un evento (sale en Hoy en el barrio con «Ver evento» solo si el evento está en vivo) ──
alter table business_posts add column if not exists event_id bigint references events (id);
alter table business_posts drop constraint if exists business_posts_link_kind_check;
alter table business_posts add constraint business_posts_link_kind_check check (link_kind in ('none', 'item', 'menu', 'tel', 'web', 'event'));
alter table business_posts drop constraint if exists business_posts_evento_check;
alter table business_posts add constraint business_posts_evento_check check ((link_kind = 'event') = (event_id is not null));
create index if not exists business_posts_evento_idx on business_posts (event_id) where event_id is not null;
create or replace function post_en_vivo(p business_posts) returns boolean language sql stable as $$
  select p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now())
     and exists (select 1 from businesses b join business_stats_cache s on s.business_id = b.id
                  where b.id = p.business_id and b.status = 'active' and s.plan = 'pro' and 'nov' = any(b.modules_on) and not (b.modules_off ? 'nov'))
     and (p.link_kind <> 'event' or exists (select 1 from event_dates d join events e on e.id = d.event_id
                                              where d.event_id = p.event_id and e.business_id = p.business_id and d.listable and d.ends_at > now()));
$$;

-- ── Analítica: los nombres nuevos (lista cerrada, guardián eventosEnLista) ──
alter table app_events drop constraint if exists app_events_name_check;
alter table app_events add constraint app_events_name_check check (name in ('ver_categoria', 'ver_ficha', 'buscar', 'contactar', 'entrar', 'registrarse', 'publicar_negocio', 'recomendar', 'reclamar', 'reportar_foto', 'pedir_aviso', 'pedir', 'ver_evento', 'rsvp', 'guardar_evento', 'compartir_evento'));

-- ── Avisos (en la app; ninguno por SMS) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('rsvp_ok', 'tx', null, false, '{"es":"Vas a {evento}","en":"You are going to {evento}"}', '{"es":"{cuando}. Tu lugar para {personas} se guarda hasta {hasta}. Si ya no vas, quítalo para que otro vecino entre.","en":"{cuando}. Your spot for {personas} is held until {hasta}. If you can no longer go, remove it so another neighbor can get in."}'),
  ('rsvp_recordatorio', 'tx', null, false, '{"es":"Mañana: {evento}","en":"Tomorrow: {evento}"}', '{"es":"{cuando} en {lugar}. Tu RSVP guarda tu lugar hasta {hasta}.","en":"{cuando} at {lugar}. Your RSVP holds your spot until {hasta}."}'),
  ('rsvp_vence', 'tx', null, false, '{"es":"Abrieron las puertas de {evento}","en":"Doors are open at {evento}"}', '{"es":"Tu lugar se guarda hasta {hasta}. Después entra quien llegue.","en":"Your spot is held until {hasta}. After that, whoever arrives gets in."}'),
  ('evt_guardado_cerca', 'tx', null, false, '{"es":"Un evento que guardaste es mañana","en":"An event you saved is tomorrow"}', '{"es":"{evento} · {cuando} en {lugar}.","en":"{evento} · {cuando} at {lugar}."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('rsvp_guarda_min', 0, 180, 30, '{"es":"min","en":"min"}', 'eventos', '{"es":"El RSVP guarda el lugar después de abrir puertas","en":"An RSVP holds the spot after doors open"}',
    '{"es":"Después de este tiempo el lugar ya no se guarda y entra quien llegue. Lo dicen la ficha del evento y el aviso.","en":"After this time the spot is no longer held and whoever arrives gets in. The event page and the notice say it."}', true, null, null, 85)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Backfill: quien ya tiene eventos enciende su módulo Eventos; y todas las fechas con la regla nueva ──
update businesses b set modules_on = array_append(b.modules_on, 'eventos'), updated_at = now()
 where not ('eventos' = any(b.modules_on)) and exists (select 1 from events e where e.business_id = b.id);
update event_dates d set status = d.status from events e where e.id = d.event_id and d.listable is distinct from evt_listable(e, d.status);

commit;
