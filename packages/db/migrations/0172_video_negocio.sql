-- 0172 · C-001 (canvas tolatino-master+, project/entrega/cambios.md, «LISTO PARA CÓDIGO» 10 nov) — Video de presentación del negocio (Pro).
-- El negocio sube su video (archivo, no enlace); el servicio propio services/video (ffmpeg) lo deja en 30 s como mucho, 720p, sin metadatos,
-- y saca la portada. Entra a la cola «Medios» del Super Admin; solo un video APROBADO de un negocio Pro se ve (tarjeta de resultados y
-- portada de su página). Nada se borra: cada video queda con su estado (en revisión · aprobado · no aprobado · quitado · reemplazado).
-- Un negocio tiene como mucho un video en revisión y uno aprobado a la vez (el aprobado sigue en la página mientras el nuevo se revisa).
-- Idempotente.
begin;

create table if not exists business_videos (
  id            bigint generated always as identity primary key,
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  url           text not null check (url like '/medios/v/%.mp4'),
  poster_url    text not null check (poster_url like '/medios/v/%.jpg'),
  seconds       real not null check (seconds > 0 and seconds <= 60),
  width         integer check (width between 16 and 4096),
  height        integer check (height between 16 and 4096),
  bytes         integer check (bytes > 0),
  status        text not null default 'revision' check (status in ('revision', 'aprobado', 'rechazado', 'quitado', 'reemplazado')),
  reject_reason text check (reject_reason is null or length(reject_reason) between 3 and 300),
  reviewed_by   uuid references users (id),
  reviewed_at   timestamptz,
  uploaded_by   uuid not null references users (id),
  created_at    timestamptz not null default now(),
  ended_at      timestamptz,
  check (status <> 'rechazado' or reject_reason is not null),
  check ((status in ('aprobado', 'rechazado')) = (reviewed_at is not null) or status in ('quitado', 'reemplazado'))
);
create unique index if not exists business_videos_una_revision on business_videos (business_id) where status = 'revision';
create unique index if not exists business_videos_un_aprobado on business_videos (business_id) where status = 'aprobado';
create index if not exists business_videos_negocio_idx on business_videos (business_id, created_at desc);
create index if not exists business_videos_ciudad_idx on business_videos (city_id, status, created_at desc);

-- La cola «Medios» también recibe los videos (subject_kind business_video, subject_id = business_videos.id).
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
do $$ begin perform pg_temp.ampliar_check('queue_items', 'queue_items_subject_kind_check', array['business_video']); end $$;

-- Cuánto dura como mucho (lo que se recorta al subir). Configuración › Negocios.
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('video_max_s', 10, 60, 30, '{"es":"segundos","en":"seconds"}', 'negocios', '{"es":"Video de presentación · duración máxima","en":"Intro video · maximum length"}',
    '{"es":"El video que sube un negocio Pro se recorta a esta duración (se queda el principio). Los que ya están no cambian.","en":"The video a Pro business uploads is trimmed to this length (the beginning stays). Existing videos do not change."}', true, null, null, 2)
on conflict (key) do nothing;

-- Avisos al dueño cuando el equipo revisa su video (push y bandeja; sin SMS: no es urgente).
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('biz_video_ok', 'biz', null, false, 'nunca', true, false,
   '{"es":"Tu video ya sale","en":"Your video is live"}',
   '{"es":"Aprobamos el video de {negocio}: ya se mueve en tu tarjeta y en tu página.","en":"We approved the {negocio} video: it now plays on your card and your page."}'),
  ('biz_video_no', 'biz', null, false, 'nunca', true, false,
   '{"es":"Tu video no se aprobó","en":"Your video was not approved"}',
   '{"es":"El video de {negocio} no se aprobó: {motivo}. Puedes subir otro desde tu panel.","en":"The {negocio} video was not approved: {motivo}. You can upload another one from your dashboard."}')
on conflict (key) do nothing;

commit;
