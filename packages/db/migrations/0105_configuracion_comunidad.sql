-- 0105 · configuracion_comunidad (5i · fase5-comunidad.md §2 y §4 5i). Cierra la Fase 5.
-- · config_keys: el catálogo de platform_config (clave, tipo, mínimo, máximo, valor de fábrica, unidad, sección, etiqueta ES/EN).
--   Un valor de platform_config que está en el catálogo se lee SOLO con cfg_int() (base) o lib/config.ts (app), que lo acotan a
--   [min, max] y usan el de fábrica si no hay fila; un insert/update fuera de los límites lo rechaza la base (trigger). Cada cambio
--   lo escribe guardarConfig() con su AuditEntry antes → después. `editable = false`: el valor se lee de aquí pero todavía no se
--   cambia desde Configuración porque algún texto que ve la persona dice el número (el motivo va en `bloqueo`; LAUNCH-CHECKLIST).
--   `edit_in`: se cambia en otra pantalla que hace algo más al guardar (p. ej. Catálogo › Cargo del dealer baja a los dealers).
-- · Plazos de la Comunidad (límites del día, editar, apelar, encuesta, traducciones, resumen diario, cupón, tope de puntos) y los
--   diferidos de la Fase 4 (LAUNCH-CHECKLIST: Doctores y Profesionales, Noche, Educación + Niños + Deporte, Iglesias + Bienes
--   Raíces + Autos). pts_tope() pasa a leer el catálogo.
-- · Avisos: grupo `community` (Mi cuenta › Avisos › Comunidad: «Respuestas y votos» = pref com, «Mensajes de vecinos» = pref msg,
--   «Un resumen al día» = pref dig), `notifications.held_digest` (guardado para el resumen) y `notif_digests` (uno por persona y día
--   local; la pk impide mandarlo dos veces); plantilla com_resumen (sin SMS).
-- · Analítica › Comunidad: vistas por ciudad y día SIN personas (com_analitica_dia, com_canjes_negocio_dia) y
--   com_activos_por_rango() (cuántos vecinos activos por rango; nunca quiénes).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Catálogo ──
create table if not exists config_keys (
  key      text primary key,
  type     text not null default 'int' check (type in ('int')),
  min      numeric not null,
  max      numeric not null,
  def      numeric not null,
  unit     jsonb not null,
  section  text not null check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos')),
  label    jsonb not null,
  help     jsonb,
  editable boolean not null default true,
  bloqueo  jsonb,
  edit_in  text,
  sort     integer not null default 0,
  check (min < max),
  check (def >= min and def <= max),
  check (label ? 'es' and label ? 'en' and unit ? 'es' and unit ? 'en'),
  check (editable or (bloqueo ? 'es' and bloqueo ? 'en'))
);

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  -- Comunidad
  ('com_lim_publicaciones', 1, 100, 10, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Publicaciones por persona","en":"Posts per person"}',
    '{"es":"Día local de su ciudad; la mitad las primeras 24 h de la cuenta.","en":"Local day of the city; half during the account''s first 24 h."}', true, null, null, 10),
  ('com_lim_comentarios', 1, 1000, 100, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Comentarios por persona","en":"Comments per person"}',
    '{"es":"Día local de su ciudad; la mitad las primeras 24 h de la cuenta.","en":"Local day of the city; half during the account''s first 24 h."}', true, null, null, 11),
  ('com_lim_votos', 1, 5000, 500, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Votos por persona","en":"Votes per person"}',
    '{"es":"Día local de su ciudad; la mitad las primeras 24 h de la cuenta.","en":"Local day of the city; half during the account''s first 24 h."}', true, null, null, 12),
  ('com_lim_conversaciones', 1, 100, 10, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Conversaciones nuevas por persona","en":"New conversations per person"}',
    '{"es":"Mensajes entre vecinos; día local; la mitad las primeras 24 h.","en":"Neighbor messages; local day; half during the first 24 h."}', true, null, null, 13),
  ('com_lim_reportes', 1, 200, 20, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Reportes por persona","en":"Reports per person"}',
    '{"es":"Día local de su ciudad; la mitad las primeras 24 h de la cuenta.","en":"Local day of the city; half during the account''s first 24 h."}', true, null, null, 14),
  ('com_editar_min', 5, 1440, 30, '{"es":"min","en":"min"}', 'comunidad', '{"es":"Editar una publicación","en":"Edit a post"}',
    '{"es":"Después de publicarla; la versión anterior queda guardada.","en":"After posting; the previous version is kept."}', true, null, null, 20),
  ('com_apelar_dias', 3, 60, 14, '{"es":"días","en":"days"}', 'comunidad', '{"es":"Apelar lo que To''Latino ocultó o una sanción","en":"Appeal hidden content or a sanction"}',
    '{"es":"Desde el aviso. La decide otra persona del equipo.","en":"From the notice. Another team member decides."}', true, null, null, 21),
  ('com_encuesta_dias_max', 1, 30, 7, '{"es":"días","en":"days"}', 'comunidad', '{"es":"Lo más que dura una encuesta","en":"Longest a poll can run"}',
    '{"es":"Las opciones son 1, 3 y 7 días hasta este máximo (y el máximo si no es una de ellas).","en":"Options are 1, 3 and 7 days up to this maximum (and the maximum itself)."}', true, null, null, 22),
  ('com_traduccion_hora', 1, 1000, 60, '{"es":"por hora","en":"per hour"}', 'comunidad', '{"es":"«Ver traducción» por persona","en":"«See translation» per person"}',
    '{"es":"El traductor es propio; el tope lo protege.","en":"The translator is our own; the cap protects it."}', true, null, null, 23),
  ('com_resumen_hora', 0, 23, 19, '{"es":"h (hora local)","en":"h (local time)"}', 'comunidad', '{"es":"Hora del resumen diario de la Comunidad","en":"Time of the daily Community digest"}',
    '{"es":"Para quien eligió «Un resumen al día». 19 = 7 PM de su ciudad.","en":"For people who chose «One daily digest». 19 = 7 PM in their city."}', true, null, null, 24),
  ('cup_dias_def', 7, 90, 30, '{"es":"días","en":"days"}', 'comunidad', '{"es":"Días para usar un cupón (lo que se propone)","en":"Days to use a coupon (proposed)"}',
    '{"es":"El negocio puede elegir de 7 a 90; esto es lo que el formulario propone.","en":"The business may choose 7 to 90; this is what the form proposes."}', true, null, null, 25),
  -- Gamification
  ('pts_tope_dia', 10, 1000, 100, '{"es":"puntos al día","en":"points a day"}', 'gamificacion', '{"es":"Tope de puntos por persona","en":"Points cap per person"}',
    '{"es":"Día local de su ciudad. Lo que pasa del tope no suma.","en":"Local day of the city. Anything over the cap does not count."}', true, null, null, 30),
  -- Doctores y Profesionales (4h–4m)
  ('sp_seguro_guardar_h', 1, 24, 2, '{"es":"h","en":"h"}', 'salud_pro', '{"es":"«No aceptamos su seguro»: la hora se guarda","en":"«We don''t take your insurance»: the time is held"}', null,
    false, '{"es":"El estado de la cita y el panel dicen «2 h».","en":"The appointment status and the dashboard say «2 h»."}', null, 40),
  ('sp_total_escrito_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'salud_pro', '{"es":"Vale el total por escrito","en":"A written total is valid for"}', null,
    false, '{"es":"La consulta y el trámite dicen «30 días».","en":"The consult and paperwork screens say «30 days»."}', null, 41),
  ('sp_notas_purga_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'salud_pro', '{"es":"La nota privada de una cita se borra","en":"A private appointment note is deleted after"}', null,
    false, '{"es":"La consulta y las citas del panel dicen «30 días».","en":"The consult and dashboard appointments say «30 days»."}', null, 42),
  ('sp_fotos_ayuda_dias', 30, 365, 90, '{"es":"días","en":"days"}', 'salud_pro', '{"es":"Fotos privadas de una ayuda se borran","en":"Private help photos are deleted after"}',
    '{"es":"Después de cerrarse la ayuda (Salud y Profesionales).","en":"After the help case closes (Health and Professionals)."}', true, null, null, 43),
  ('ayuda_negocio_h', 4, 72, 24, '{"es":"h","en":"h"}', 'salud_pro', '{"es":"El negocio responde una ayuda en","en":"The business answers a help request within"}', null,
    false, '{"es":"La ayuda con la cita y el panel dicen «24 h».","en":"The help screen and the dashboard say «24 h»."}', null, 44),
  -- Noche (4na–4ne)
  ('noche_responder_min', 15, 240, 60, '{"es":"min","en":"min"}', 'noche', '{"es":"El local responde una mesa (si no eligió otro)","en":"The venue answers a table (unless it chose another)"}', null,
    false, '{"es":"La reserva y el panel de Noche dicen «60 min».","en":"The booking and the Night dashboard say «60 min»."}', null, 50),
  ('noche_mesa_guardada_min', 10, 120, 30, '{"es":"min","en":"min"}', 'noche', '{"es":"La mesa se guarda después de la hora (si no eligió otro)","en":"The table is held after the time (unless it chose another)"}', null,
    false, '{"es":"La reserva y su detalle dicen «30 min».","en":"The booking and its detail say «30 min»."}', null, 51),
  ('noche_fila_viva_min', 15, 240, 60, '{"es":"min","en":"min"}', 'noche', '{"es":"La fila «ahora» vale","en":"The «line now» is valid for"}', null,
    false, '{"es":"El panel de Noche dice «dura 60 min».","en":"The Night dashboard says «lasts 60 min»."}', null, 52),
  -- Educación + Niños + Deporte (4ea–4eg)
  ('insc_responder_h', 4, 72, 24, '{"es":"h","en":"h"}', 'edu', '{"es":"El lugar responde una inscripción (si no eligió otro)","en":"The place answers an enrollment (unless it chose another)"}', null,
    false, '{"es":"Inscribirme y el panel dicen «24 h».","en":"Enroll and the dashboard say «24 h»."}', null, 60),
  ('insc_oferta_h', 12, 168, 48, '{"es":"h","en":"h"}', 'edu', '{"es":"La oferta de la lista de espera aparta el cupo","en":"A waitlist offer holds the spot"}', null,
    false, '{"es":"Inscribirme y el panel dicen «48 h».","en":"Enroll and the dashboard say «48 h»."}', null, 61),
  ('insc_baja_h', 24, 168, 72, '{"es":"h","en":"h"}', 'edu', '{"es":"La baja de una membresía queda sola a las","en":"A membership cancellation goes through after"}', null,
    false, '{"es":"El estado de la inscripción dice «72 horas».","en":"The enrollment status says «72 hours»."}', null, 62),
  ('ninos_purga_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'edu', '{"es":"Los datos del niño se borran","en":"A child''s data is deleted after"}', null,
    false, '{"es":"Inscribirme dice «30 días».","en":"Enroll says «30 days»."}', null, 63),
  ('insc_grupos_n', 2, 10, 3, '{"es":"grupos","en":"groups"}', 'edu', '{"es":"Grupos cancelados que abren un caso","en":"Cancelled groups that open a case"}', null,
    false, '{"es":"Colas › Grupos que no abrieron dice «3 grupos en 90 días».","en":"Queues › Groups that did not open says «3 groups in 90 days»."}', null, 64),
  ('insc_grupos_dias', 30, 365, 90, '{"es":"días","en":"days"}', 'edu', '{"es":"En cuántos días se cuentan","en":"Counted over"}', null,
    false, '{"es":"Colas › Grupos que no abrieron dice «3 grupos en 90 días».","en":"Queues › Groups that did not open says «3 groups in 90 days»."}', null, 65),
  -- Iglesias + Bienes Raíces + Venta de Autos (4ia–4ig)
  ('fe_responder_h', 12, 168, 48, '{"es":"h","en":"h"}', 'fe_inm_autos', '{"es":"Una iglesia responde una fecha o el catecismo","en":"A church answers a date or catechism"}', null,
    false, '{"es":"Pedir fecha, el panel de Iglesias y la Analítica dicen «48 h».","en":"Request a date, the Churches dashboard and Analytics say «48 h»."}', null, 70),
  ('vis_responder_h', 1, 24, 4, '{"es":"h hábiles","en":"business h"}', 'fe_inm_autos', '{"es":"El negocio responde una visita o prueba de manejo","en":"The business answers a visit or test drive"}', null,
    false, '{"es":"Pedir visita y el panel de Visitas dicen «4 h hábiles».","en":"Request a visit and the Visits dashboard say «4 business h»."}', null, 71),
  ('vis_paso_h', 6, 72, 24, '{"es":"h","en":"h"}', 'fe_inm_autos', '{"es":"«Pasó» solo si nadie marca","en":"«It happened» if nobody marks it"}', null,
    false, '{"es":"El estado de la visita dice «24 h».","en":"The visit status says «24 h»."}', null, 72),
  ('vis_purga_dias', 7, 90, 30, '{"es":"días","en":"days"}', 'fe_inm_autos', '{"es":"Notas y datos de una visita se borran","en":"Visit notes and data are deleted after"}', null,
    false, '{"es":"Pedir visita y el panel de Visitas dicen «30 días».","en":"Request a visit and the Visits dashboard say «30 days»."}', null, 73),
  ('lic_aviso_dias', 7, 60, 14, '{"es":"días","en":"days"}', 'fe_inm_autos', '{"es":"Una licencia vuelve a revisión antes de su fecha","en":"A license comes back for review before its date"}',
    '{"es":"Colas › Licencias (Iglesias, Bienes Raíces y Autos).","en":"Queues › Licenses (Churches, Real Estate and Cars)."}', true, null, null, 74),
  ('dealer_doc_fee_cap_cents', 0, 200000, 47700, '{"es":"centavos","en":"cents"}', 'fe_inm_autos', '{"es":"Tope del cargo del dealer en PA","en":"PA dealer document fee cap"}',
    '{"es":"A verificar cada año. Al bajarlo, baja a los dealers que lo pasan.","en":"Verify every year. Lowering it lowers dealers above it."}', true, null, '/admin/catalogo?tab=dealer', 75)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- El único lector en la base: el valor acotado a [min, max], el de fábrica si no hay fila. Una clave fuera del catálogo es un error.
create or replace function cfg_int(k text) returns integer language plpgsql stable as $$
declare c config_keys; v numeric;
begin
  select * into c from config_keys where key = k;
  if not found then raise exception 'config: % no está en config_keys', k; end if;
  begin
    v := (select (p.value #>> '{}')::numeric from platform_config p where p.key = k);
  exception when others then v := null;
  end;
  return round(greatest(c.min, least(c.max, coalesce(v, c.def))))::integer;
end $$;

-- Lo que se escribe en platform_config para una clave del catálogo tiene que ser un número entero dentro de sus límites.
create or replace function platform_config_limites() returns trigger language plpgsql as $$
declare c config_keys; v numeric;
begin
  select * into c from config_keys where key = new.key;
  if not found then return new; end if;
  begin
    v := (new.value #>> '{}')::numeric;
  exception when others then raise exception 'config %: el valor debe ser un número', new.key;
  end;
  if v is null then raise exception 'config %: el valor debe ser un número', new.key; end if;
  if c.type = 'int' and v <> trunc(v) then raise exception 'config %: el valor debe ser un número entero', new.key; end if;
  if v < c.min or v > c.max then raise exception 'config %: % está fuera de los límites (% a %)', new.key, v, c.min, c.max; end if;
  return new;
end $$;
drop trigger if exists platform_config_limites on platform_config;
create trigger platform_config_limites before insert or update on platform_config for each row execute function platform_config_limites();

-- El tope de puntos (5f) lee el catálogo.
create or replace function pts_tope() returns integer language sql stable as $$ select cfg_int('pts_tope_dia') $$;

-- ── Avisos: grupo `community` y el resumen diario ──
alter table notif_templates drop constraint if exists notif_templates_grp_check;
alter table notif_templates add constraint notif_templates_grp_check check (grp in ('crit', 'tx', 'mod', 'biz', 'mkt', 'community'));
update notif_templates set grp = 'community', pref = 'com'
 where key in ('com_comment', 'com_reply', 'com_mention', 'com_best', 'com_votes_10', 'com_poll_closed', 'com_follow', 'gam_rank', 'gam_top3') and (grp, coalesce(pref, '')) is distinct from ('community', 'com');
update notif_templates set grp = 'community', pref = 'msg' where key = 'dm_message' and (grp, coalesce(pref, '')) is distinct from ('community', 'msg');
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('com_resumen', 'community', null, false, '{"es":"Tu día en la Comunidad","en":"Your day in the Community"}', '{"es":"{resumen}","en":"{resumen}"}')
on conflict (key) do nothing;

alter table notifications add column if not exists held_digest boolean not null default false;
alter table notifications add column if not exists digest_id bigint references notifications (id);
create index if not exists notifications_resumen_idx on notifications (user_id, id) where held_digest and digest_id is null;

create table if not exists notif_digests (
  user_id         uuid not null references users (id),
  local_day       date not null,
  notification_id bigint references notifications (id),          -- null: lo guardado era de alguien bloqueado (no se manda nada)
  n               integer not null check (n >= 0 and (n = 0) = (notification_id is null)),
  created_at      timestamptz not null default now(),
  primary key (user_id, local_day)
);

-- ── Analítica › Comunidad: por ciudad y día local, sin personas ──
create index if not exists com_posts_dia_idx on com_posts (city_id, created_at);
create index if not exists com_comments_dia_idx on com_comments (city_id, created_at);
create index if not exists coin_entries_dia_idx on coin_entries (city_id, created_at);

create or replace view com_analitica_dia as
with p as (
  select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as publicaciones, count(*) filter (where x.kind = 'pregunta') as preguntas,
         count(*) filter (where x.kind = 'pregunta' and x.solved_at is not null) as resueltas,
         count(*) filter (where x.kind = 'pregunta' and r.primera is not null) as con_respuesta,
         coalesce(sum(extract(epoch from r.primera - x.created_at) / 60) filter (where x.kind = 'pregunta'), 0) as min_primera
    from com_posts x join cities ci on ci.id = x.city_id
    left join lateral (select min(c.created_at) as primera from com_comments c where c.post_id = x.id and c.status <> 'deleted' and c.author_user_id is distinct from x.author_user_id) r on true
   where x.status <> 'deleted' and x.author_kind = 'user' group by 1, 2),
c as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as comentarios
        from com_comments x join cities ci on ci.id = x.city_id where x.status <> 'deleted' group by 1, 2),
r as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as reportes
        from content_reports x join cities ci on ci.id = x.city_id where x.target_kind in ('com_post', 'com_comment') group by 1, 2),
a as (select x.city_id, (x.decided_at at time zone ci.timezone)::date as dia, count(*) filter (where x.status = 'lifted') as levantadas, count(*) as decididas
        from appeals x join cities ci on ci.id = x.city_id where x.status <> 'open' group by 1, 2),
m as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia,
             coalesce(sum(x.delta) filter (where x.reason_key in ('welcome', 'premio_mes')), 0) as monedas_emitidas,
             coalesce(-sum(x.delta) filter (where x.reason_key = 'canje'), 0) as monedas_canjeadas,
             coalesce(sum(x.delta) filter (where x.reason_key = 'devolucion'), 0) as monedas_devueltas
        from coin_entries x join cities ci on ci.id = x.city_id group by 1, 2),
k as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as canjes, count(*) filter (where x.status = 'used') as usados
        from coupon_redemptions x join cities ci on ci.id = x.city_id group by 1, 2),
d as (select city_id, dia from p union select city_id, dia from c union select city_id, dia from r union select city_id, dia from a
      union select city_id, dia from m union select city_id, dia from k)
select d.city_id, d.dia,
       coalesce(p.publicaciones, 0)::int as publicaciones, coalesce(p.preguntas, 0)::int as preguntas, coalesce(p.resueltas, 0)::int as resueltas,
       coalesce(p.con_respuesta, 0)::int as con_respuesta, coalesce(p.min_primera, 0)::numeric as min_primera,
       coalesce(c.comentarios, 0)::int as comentarios, coalesce(r.reportes, 0)::int as reportes,
       coalesce(a.levantadas, 0)::int as apelaciones_levantadas, coalesce(a.decididas, 0)::int as apelaciones_decididas,
       coalesce(m.monedas_emitidas, 0)::int as monedas_emitidas, coalesce(m.monedas_canjeadas, 0)::int as monedas_canjeadas, coalesce(m.monedas_devueltas, 0)::int as monedas_devueltas,
       coalesce(k.canjes, 0)::int as canjes, coalesce(k.usados, 0)::int as canjes_usados
  from d left join p using (city_id, dia) left join c using (city_id, dia) left join r using (city_id, dia) left join a using (city_id, dia)
  left join m using (city_id, dia) left join k using (city_id, dia);

-- Canjes por negocio (un negocio no es una persona): por ciudad y día local.
create or replace view com_canjes_negocio_dia as
select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, x.business_id, b.name as negocio, count(*)::int as canjes, count(*) filter (where x.status = 'used')::int as usados,
       coalesce(sum(x.cost_coins), 0)::int as monedas
  from coupon_redemptions x join cities ci on ci.id = x.city_id join businesses b on b.id = x.business_id group by 1, 2, 3, 4;

-- Vecinos activos (publicaron, comentaron o votaron) desde un día, por rango: solo cuántos.
create or replace function com_activos_por_rango(ciudades text[], desde timestamptz)
returns table (rango smallint, activos integer) language sql stable as $$
  with a as (
    select author_user_id as u from com_posts where author_kind = 'user' and status <> 'deleted' and created_at >= desde and (cardinality(ciudades) = 0 or city_id = any(ciudades))
    union select author_user_id from com_comments where status <> 'deleted' and created_at >= desde and (cardinality(ciudades) = 0 or city_id = any(ciudades))
    union select v.user_id from com_votes v join users x on x.id = v.user_id where v.created_at >= desde and (cardinality(ciudades) = 0 or x.home_city_id = any(ciudades)))
  select coalesce(cp.rank_level, 1)::smallint as rango, count(*)::int as activos
    from a left join community_profiles cp on cp.user_id = a.u group by 1 order by 1
$$;

commit;
