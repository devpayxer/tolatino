-- 0016 · Super Admin › Negocios 360° y Colas (bloque 1i): casos de cola (asignación, decisión), motivo de cada estado
-- del negocio, ediciones del equipo («EDITADO POR TO'LATINO»), fotos quitadas por el equipo, sello y recomendaciones
-- con sus estados reales, y notas internas (solo inserción).
begin;

-- Casos de cola (modelo de datos QueueItem). Nacen en la misma transacción que su fuente: pedido de sello, negocio
-- publicado, primer reporte abierto de una foto, recomendación enviada. El plazo (SLA) es derivado: opened_at + horas
-- de la cola (lib/colas.ts); no se guarda.
create table if not exists queue_items (
  id           bigint generated always as identity primary key,
  queue        text not null check (queue in ('sello', 'nuevo', 'lic', 'medios', 'rec')),
  subject_kind text not null check (subject_kind in ('verification_request', 'business', 'license', 'media', 'recommendation')),
  subject_id   text not null,
  business_id  text references businesses (id),
  city_id      text not null references cities (id),
  priority     text not null default 'normal' check (priority in ('normal', 'alta')),
  opened_at    timestamptz not null default now(),
  assigned_to  uuid references users (id),
  assigned_at  timestamptz,
  status       text not null default 'open' check (status in ('open', 'decided')),
  decision     text,
  reason       text,
  decided_by   uuid references users (id),
  decided_at   timestamptz
);
create unique index if not exists queue_items_abierto_idx on queue_items (queue, subject_kind, subject_id) where status = 'open';
create index if not exists queue_items_lista_idx on queue_items (city_id, status, queue, opened_at);
create index if not exists queue_items_negocio_idx on queue_items (business_id, opened_at desc);

-- Estado del negocio con su porqué (el dueño lo ve en su panel): oculto, suspendido, cerrado.
alter table businesses add column if not exists status_reason text;
alter table businesses add column if not exists status_at timestamptz;
alter table businesses add column if not exists status_by uuid references users (id);
-- Cierre temporal por To'Latino (hasta una fecha, con motivo). El negocio sigue en la app y dice «Cerrado
-- temporalmente»; vuelve solo al vencer. (El «Cerrar por hoy» del dueño es closed_on.)
alter table businesses add column if not exists temp_closed_reason text;
alter table businesses add column if not exists temp_closed_by uuid references users (id);
-- Campos que el equipo editó en nombre del negocio: {campo: {at, by}}. El valor vive en su columna; el antes, el
-- después y el motivo, en la auditoría. Si el dueño vuelve a editar ese campo, la marca se quita (gana lo último).
alter table businesses add column if not exists admin_edits jsonb not null default '{}'::jsonb;

-- Fotos quitadas por el equipo: cuándo y el motivo que ve el dueño (removed_reason = 'admin').
alter table media add column if not exists removed_at timestamptz;
alter table media add column if not exists removed_note text;

-- Sello: las tres comprobaciones y los estados «quitado por To'Latino» y «cancelado por el dueño».
alter table verification_requests drop constraint if exists verification_requests_status_check;
alter table verification_requests add constraint verification_requests_status_check
  check (status in ('review', 'ok', 'info', 'no', 'revoked', 'canceled'));
alter table verification_requests add column if not exists checks jsonb not null default '{}'::jsonb;
create index if not exists verification_requests_biz_idx on verification_requests (business_id, created_at desc);

-- Recomendaciones: «Ya existe» (con el negocio que ya estaba) y quién decidió.
alter table recommendations drop constraint if exists recommendations_status_check;
alter table recommendations add constraint recommendations_status_check
  check (status in ('draft', 'sent', 'joined', 'seeded', 'declined', 'duplicate'));
alter table recommendations add column if not exists decided_by uuid references users (id);
alter table recommendations add column if not exists decided_at timestamptz;
alter table recommendations add column if not exists decision_reason text;

-- Reportes de foto: el motivo de la decisión.
alter table photo_reports add column if not exists decision_reason text;

-- Notas internas del equipo (nunca las ve el negocio). Solo se agregan.
create table if not exists admin_notes (
  id          bigint generated always as identity primary key,
  target_kind text not null check (target_kind in ('business', 'user', 'case')),
  target_id   text not null,
  city_id     text references cities (id),
  text        text not null check (char_length(text) between 1 and 1000),
  by_staff    uuid not null references users (id),
  at          timestamptz not null default now()
);
create index if not exists admin_notes_target_idx on admin_notes (target_kind, target_id, at desc);
create or replace function admin_notes_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'admin_notes es solo de inserción (% no permitido)', tg_op;
end $$;
drop trigger if exists admin_notes_no_cambia on admin_notes;
create trigger admin_notes_no_cambia before update or delete on admin_notes for each row execute function admin_notes_inmutable();

-- Abierto ahora: tampoco lo está un negocio que To'Latino cerró por unos días.
create or replace function negocio_abierto(bid text, t timestamp) returns boolean language sql stable as $$
  select not exists (select 1 from businesses b where b.id = bid and (b.closed_on = t::date or b.temp_closed_until > now()))
     and exists (
    select 1 from business_hours h, jsonb_array_elements(h.ranges) g
     where h.business_id = bid and h.module = '' and h.open
       and (
         (h.weekday = extract(dow from t)::int
           and (g->>0)::time <= t::time
           and ((g->>1)::time > t::time or (g->>1)::time <= (g->>0)::time))
         or
         (h.weekday = (extract(dow from t)::int + 6) % 7
           and (g->>1)::time <= (g->>0)::time and (g->>1)::time > '00:00'::time
           and t::time < (g->>1)::time)
       ))
$$;

-- Fuerza del perfil (derivado, nunca editable): las mismas 11 reglas que apps/web/lib/panel-reglas.ts fuerza() —
-- si cambia una, cambia la otra. Puntaje = 30 + puntos (máx. 70). La guarda business_stats_cache.profile_strength
-- para ordenar y filtrar en el Super Admin; el panel la vuelve a guardar cada vez que la calcula.
create or replace function perfil_fuerza(bid text) returns smallint language sql stable as $$
  select (30
    + case when jsonb_array_length(coalesce(case when jsonb_typeof(b.category_attrs->'items') = 'array' then b.category_attrs->'items' end, '[]'::jsonb)) >= 3 then 12 else 0 end
    + case when (select count(*) from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible') >= 5 then 10 else 0 end
    + case when coalesce(b.about->>'es', '') <> '' then 8 else 0 end
    + case when b.logo_url is not null then 4 else 0 end
    + case when coalesce(s.verified, false) then 6 else 0 end
    + case when coalesce(u.email_verified, false) then 4 else 0 end
    + case when coalesce(s.plan, 'free') <> 'pro' or exists (select 1 from faqs f where f.business_id = b.id) then 4 else 0 end
    + 6  -- reseñas críticas respondidas (no hay reseñas todavía: se cumple)
    + case when b.operation = 'casa' or exists (select 1 from business_members m where m.business_id = b.id and m.status = 'active' and m.kind <> 'owner') then 4 else 0 end
    + case when exists (select 1 from business_hours h where h.business_id = b.id and h.module = '' and h.open and jsonb_array_length(h.ranges) > 0) then 8 else 0 end
    + case when coalesce(b.about->>'es', '') <> '' and cardinality(b.amenities) > 0 then 4 else 0 end)::smallint
  from businesses b left join business_stats_cache s on s.business_id = b.id left join users u on u.id = b.owner_user_id
  where b.id = bid
$$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id);

-- Casos que ya esperaban antes de esta migración (una vez; los nuevos nacen con su fuente).
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, opened_at)
select 'nuevo', 'business', b.id, b.id, b.city_id, b.created_at from businesses b
 where b.origin = 'self' and b.status = 'active' and not b.is_demo
on conflict do nothing;
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, opened_at)
select 'sello', 'verification_request', v.id::text, v.business_id, b.city_id, v.created_at
  from verification_requests v join businesses b on b.id = v.business_id where v.status = 'review'
on conflict do nothing;
insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, opened_at)
select 'medios', 'media', m.id::text, m.owner_id, b.city_id, min(r.created_at)
  from photo_reports r join media m on m.id = r.media_id join businesses b on b.id = m.owner_id
 where r.status = 'open' and m.owner_kind = 'business'
 group by m.id, m.owner_id, b.city_id
on conflict do nothing;
insert into queue_items (queue, subject_kind, subject_id, city_id, opened_at)
select 'rec', 'recommendation', r.id::text, r.city_id, r.created_at from recommendations r where r.status = 'sent'
on conflict do nothing;

commit;
