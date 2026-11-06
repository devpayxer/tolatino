-- 0029 · Jobs (bloque 2g-3). Modelo «JobPosting · Vacante» y «JobApplication · Aplicación». Solo Pro. Pago real por hora
-- (desde $7.25, el mínimo de Pensilvania; «hasta» ≥ «desde»), sin CV, sin estatus migratorio, SSN ni pago para aplicar
-- (el editor y el servidor bloquean esas palabras). Aplicar = perfil corto. Estados de la solicitud: enviada → vista →
-- le van a llamar | entrevista | no seleccionado | la retiró. Nada se borra (removed / withdrawn).
begin;

create table if not exists job_postings (
  id             bigint generated always as identity primary key,
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  title          jsonb not null check (char_length(title->>'es') between 3 and 50),   -- {es, en}
  kind           text not null default 'ft' check (kind in ('ft', 'pt', 'fds')),     -- tiempo completo · medio tiempo · fines de semana
  pay_from_cents integer not null check (pay_from_cents >= 725),
  pay_to_cents   integer check (pay_to_cents is null or pay_to_cents >= pay_from_cents),
  tips           boolean not null default false,
  days           smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]),  -- 0 = lunes
  start_min      smallint not null check (start_min between 0 and 1440),
  end_min        smallint not null check (end_min between 0 and 1440 and end_min > start_min),
  openings       smallint not null default 1 check (openings between 1 and 20),
  lang_es        text not null default 'need' check (lang_es in ('need', 'plus', 'no')),
  lang_en        text not null default 'no' check (lang_en in ('need', 'plus', 'no')),
  descr          jsonb not null default '{}'::jsonb,                                 -- {es, en} hasta 300
  requirements   jsonb not null default '[]'::jsonb,                                 -- [[es, en]] hasta 5
  benefits       jsonb not null default '[]'::jsonb,                                 -- [[es, en]] hasta 5
  status         text not null default 'live' check (status in ('draft', 'live', 'paused', 'filled', 'removed')),
  published_at   timestamptz,
  hidden_at      timestamptz,
  hidden_reason  text,
  hidden_by      uuid references users (id),
  created_by     uuid references users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists job_postings_negocio_idx on job_postings (business_id, status, published_at desc);
create index if not exists job_postings_ciudad_idx on job_postings (city_id, published_at desc) where status = 'live' and hidden_at is null;

create table if not exists job_applications (
  id                  bigint generated always as identity primary key,
  number              text not null unique,                                          -- J-3101…
  job_id              bigint not null references job_postings (id),
  business_id         text not null references businesses (id),
  city_id             text not null references cities (id),
  user_id             uuid not null references users (id),
  name                text not null check (char_length(name) between 2 and 80),
  phone               text not null check (phone ~ '^\+1[2-9][0-9]{9}$'),
  experience          smallint not null check (experience in (0, 1, 3, 4)),
  days                smallint[] not null check (cardinality(days) between 1 and 7),
  languages           text[] not null default '{}' check (languages <@ array['es', 'en']),
  note                text check (char_length(note) <= 200),
  status              text not null default 'sent' check (status in ('sent', 'seen', 'contact', 'interview', 'not_selected', 'withdrawn')),
  interview_at        timestamptz,
  interview_confirmed boolean not null default false,
  seen_at             timestamptz,
  answered_at         timestamptz,
  withdrawn_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create sequence if not exists job_app_number_seq start 3101;
-- Una solicitud viva por persona y vacante (si la retira, puede volver a aplicar).
create unique index if not exists job_applications_una_idx on job_applications (job_id, user_id) where status <> 'withdrawn';
create index if not exists job_applications_job_idx on job_applications (job_id, created_at desc);
create index if not exists job_applications_user_idx on job_applications (user_id, created_at desc);
create index if not exists job_applications_negocio_idx on job_applications (business_id, status, created_at desc);

create table if not exists job_saves (
  job_id     bigint not null references job_postings (id),
  user_id    uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

-- ¿Una vacante sale ahora? (publicada, no oculta, negocio Pro con Jobs encendido y sin pausa de To'Latino).
create or replace function vacante_en_vivo(j job_postings) returns boolean language sql stable as $$
  select j.status = 'live' and j.hidden_at is null
     and exists (select 1 from businesses b join business_stats_cache s on s.business_id = b.id
                  where b.id = j.business_id and b.status = 'active' and s.plan = 'pro' and 'jobs' = any(b.modules_on) and not (b.modules_off ? 'jobs'));
$$;

commit;
