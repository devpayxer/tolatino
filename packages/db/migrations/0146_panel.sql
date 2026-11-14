-- 0146 · El panel del negocio y la página del negocio: lo diferido que entra antes de abrir (Fase 9 · 9n-2; fase9-apertura.md §4 9n).
-- · Equipo: aceptar la invitación con el código (`/e/{código}`; `business_members.accepted_at`), avisos al aceptar, al pedir unirse y al quitar a alguien.
-- · Los CHECK que listan valores se AMPLÍAN (pg_temp.ampliar_check; nunca una lista fija). Nada se borra (estados). Idempotente: dos veces no cambia nada.
-- No depende de 0147 (Super Admin / Configuración) ni de 0148 (dinero): cada una toca sus propias tablas y claves.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ════════════════════ EQUIPO · ACEPTAR LA INVITACIÓN ════════════════════
alter table business_members add column if not exists accepted_at timestamptz;
update notif_templates set sms_enlace = true,
  body = '{"es":"{negocio} te invitó a su equipo en To''Latino como {rol}. Acepta y pon tu foto aquí. Vence en 7 días.","en":"{negocio} invited you to its team on To''Latino as {rol}. Accept and add your photo here. It expires in 7 days."}'
 where key = 'equipo_invitado' and not sms_enlace;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, app, title, body) values
  ('biz_equipo_acepto', 'biz', null, false, 'nunca', true, 'negocio', '{"es":"Aceptó tu invitación","en":"Accepted your invite"}', '{"es":"{nombre} aceptó tu invitación y ya está en tu equipo.","en":"{nombre} accepted your invite and is now on your team."}'),
  ('biz_equipo_pide', 'biz', null, false, 'nunca', true, 'negocio', '{"es":"Alguien pide unirse","en":"Someone asks to join"}', '{"es":"{nombre} pide rentar un espacio en tu negocio. Acéptalo o no en Tu página › Equipo.","en":"{nombre} asks to rent a space in your business. Accept or decline in Your page › Team."}'),
  ('equipo_quitado', 'tx', null, false, 'nunca', true, 'cliente', '{"es":"Saliste de un equipo","en":"You left a team"}', '{"es":"{negocio} te quitó de su equipo en To''Latino. Ya no sales en su página.","en":"{negocio} removed you from its team on To''Latino. You no longer show on its page."}'),
  ('equipo_unirse_ok', 'tx', null, false, 'nunca', true, 'cliente', '{"es":"Te aceptaron en el equipo","en":"You were accepted"}', '{"es":"{negocio} aceptó tu solicitud: ya estás en su equipo.","en":"{negocio} accepted your request: you are on its team."}'),
  ('equipo_unirse_no', 'tx', null, false, 'nunca', true, 'cliente', '{"es":"No te aceptaron por ahora","en":"Not accepted for now"}', '{"es":"{negocio} no aceptó tu solicitud por ahora.","en":"{negocio} did not accept your request for now."}')
on conflict (key) do nothing;
update notif_templates set biz_pref = 'equipo' where key in ('biz_equipo_acepto', 'biz_equipo_pide') and biz_pref is null;

-- ════════════════════ PEDIR RESEÑA (L248) ════════════════════
-- «¿Cómo estuvo?» a quien recibió un pedido: UNA vez por pedido (índice único) y solo inserción (nada se borra).
create table if not exists review_requests (
  id            bigint generated always as identity primary key,
  operation_id  bigint not null references operations (id),
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  user_id       uuid not null references users (id),
  requested_by  uuid not null references users (id),
  requested_at  timestamptz not null default now()
);
create unique index if not exists review_requests_op_idx on review_requests (operation_id);
create index if not exists review_requests_cliente_idx on review_requests (business_id, user_id, requested_at desc);
drop trigger if exists review_requests_solo_insercion on review_requests;
create trigger review_requests_solo_insercion before update or delete on review_requests for each row execute function negocio_solo_insercion();
insert into notif_templates (key, grp, pref, sms, sms_mode, push, app, title, body) values
  ('resena_pedir', 'tx', null, true, 'sin_push', true, 'cliente', '{"es":"¿Cómo estuvo tu pedido?","en":"How was your order?"}', '{"es":"{negocio} quiere saber cómo estuvo tu pedido #{num}. Cuéntanos en un minuto.","en":"{negocio} would like to know how your order #{num} was. Tell us in a minute."}')
on conflict (key) do nothing;
update notif_templates set sms_enlace = true where key = 'resena_pedir' and not sms_enlace;

-- ════════════════════ RESEÑAS · «QUIERE ARREGLARLO» Y EDITAR LA RESPUESTA (L287) ════════════════════
alter table reviews add column if not exists reply_offer boolean not null default false;
alter table reviews add column if not exists reply_edited_at timestamptz;
alter table reviews add column if not exists reply_edits smallint not null default 0 check (reply_edits between 0 and 3);
-- Lo que había antes de cada edición (nada se borra; solo inserción).
create table if not exists review_reply_history (
  id              bigint generated always as identity primary key,
  review_id       bigint not null references reviews (id),
  business_id     text not null references businesses (id),
  previous_reply  text not null,
  previous_offer  boolean not null default false,
  edited_by       uuid not null references users (id),
  edited_at       timestamptz not null default now()
);
create index if not exists review_reply_history_idx on review_reply_history (review_id, edited_at);
drop trigger if exists review_reply_history_solo_insercion on review_reply_history;
create trigger review_reply_history_solo_insercion before update or delete on review_reply_history for each row execute function negocio_solo_insercion();

-- ════════════════════ ANUNCIOS PARA NEGOCIOS EN EL PANEL (L1606) ════════════════════
-- `audience = 'negocios'`: el aviso sale en Hoy del panel de los negocios de esa ciudad (no en el Inicio de los vecinos).
do $$ begin perform pg_temp.ampliar_check('announcements', 'announcements_audience_check', array['negocios']); end $$;

-- ════════════════════ NOVEDADES: «VER VACANTE», AVISAR A LOS SEGUIDORES (L297, L298, L1740) ════════════════════
alter table business_posts add column if not exists job_id bigint references job_postings (id);
alter table business_posts add column if not exists followers_notified_at timestamptz;     -- «Avisar a tus seguidores»: una vez por novedad (la marca se escribe antes de avisar)
do $$ begin perform pg_temp.ampliar_check('business_posts', 'business_posts_link_kind_check', array['job']); end $$;
alter table business_posts drop constraint if exists business_posts_trabajo_check;
alter table business_posts add constraint business_posts_trabajo_check check ((link_kind = 'job') = (job_id is not null));
create index if not exists business_posts_avisadas_idx on business_posts (business_id, followers_notified_at) where followers_notified_at is not null;
-- Una novedad con «Ver vacante» solo sale mientras la vacante esté abierta (como una con «Ver evento»).
create or replace function post_en_vivo(p business_posts) returns boolean language sql stable as $$
  select p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now())
     and exists (select 1 from businesses b join business_stats_cache s on s.business_id = b.id
                  where b.id = p.business_id and b.status = 'active' and s.plan = 'pro' and 'nov' = any(b.modules_on) and not (b.modules_off ? 'nov'))
     and (p.link_kind <> 'event' or exists (select 1 from event_dates d join events e on e.id = d.event_id
                                              where d.event_id = p.event_id and e.business_id = p.business_id and d.listable and d.ends_at > now()))
     and (p.link_kind <> 'job' or exists (select 1 from job_postings j where j.id = p.job_id and j.business_id = p.business_id and vacante_en_vivo(j)));
$$;
insert into notif_templates (key, grp, pref, sms, sms_mode, push, app, title, body) values
  ('nov_seguidores', 'tx', 'hoy', false, 'nunca', false, 'cliente', '{"es":"Novedad de {negocio}","en":"Update from {negocio}"}', '{"es":"{negocio}: {titulo}","en":"{negocio}: {titulo}"}'),
  ('nov_oferta_seguidores', 'tx', 'of', false, 'nunca', false, 'cliente', '{"es":"Oferta de {negocio}","en":"Deal from {negocio}"}', '{"es":"{negocio}: {titulo}","en":"{negocio}: {titulo}"}')
on conflict (key) do nothing;

-- ════════════════════ EL PANEL CON VISTAS SIN REPETIDOS (L1626) ════════════════════
-- Las cifras de vistas del panel (Tu página, Hoy) pasan a `business_views_daily.unicos` (una persona cuenta una vez por día) cuando el fundador lo enciende: cambia las
-- capturas aprobadas del panel, así que NACE APAGADO (igual que web.pie_todas). Analítica ya muestra las dos cifras.
insert into feature_flags (key, enabled, note, updated_by) values ('panel.vistas_unicas', false, 'Las vistas del panel del negocio sin repetidos (una persona, una vez por día). Apagado hasta que el fundador apruebe las capturas nuevas.', 'migración 0146')
on conflict (key) do nothing;

commit;
