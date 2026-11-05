-- 0006 · Personas y cuenta (modelo de datos §5): User, OtpCode, Device/sesión, AccountChange.
-- Una sola cuenta: teléfono verificado una vez (decisión E). Nada se borra: estados. Nunca papeles.
begin;

create table if not exists users (
  id                 uuid primary key default gen_random_uuid(),
  phone              text not null unique check (phone ~ '^\+1[2-9][0-9]{9}$'),
  phone_verified_at  timestamptz,
  email              citext unique,
  email_verified     boolean not null default false,
  first_name         text check (char_length(first_name) between 1 and 60),
  last_name          text check (char_length(last_name) between 1 and 60),
  nick               text check (char_length(nick) between 1 and 40),
  photo_url          text,
  lang               text not null default 'es' check (lang in ('es', 'en')),
  home_city_id       text references cities (id),
  home_city_changed_at timestamptz,
  zone_id            text,
  status             text not null default 'active'
                       check (status in ('active','muted','suspended','banned','deleted_pending','deleted','merged')),
  status_until       timestamptz,
  delete_at          timestamptz,
  founder            boolean not null default false,
  is_test            boolean not null default false,
  created_at         timestamptz not null default now(),
  last_seen_at       timestamptz
);
create index if not exists users_city_idx on users (home_city_id, status);
create index if not exists users_name_trgm on users using gin ((lower(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) gin_trgm_ops);

-- Códigos de un solo uso: se guarda solo la huella (HMAC), nunca el código.
create table if not exists otp_codes (
  id         bigint generated always as identity primary key,
  phone      text not null,
  purpose    text not null default 'login' check (purpose in ('login', 'phone_change', 'claim_call')),
  code_hash  text not null,
  attempts   smallint not null default 0,
  ip         inet,
  channel    text not null default 'sms' check (channel in ('sms', 'whatsapp', 'pruebas')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists otp_codes_phone_idx on otp_codes (phone, created_at desc);
create index if not exists otp_codes_ip_idx on otp_codes (ip, created_at desc);

-- Sesiones por dispositivo: se guarda solo la huella del token. El Super Admin puede cerrarlas o bloquearlas.
create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id),
  token_hash    text not null unique,
  name          text,
  platform      text not null default 'web' check (platform in ('ios', 'android', 'web')),
  app           text not null default 'cliente' check (app in ('cliente', 'negocio', 'delivery', 'checkin', 'admin')),
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  signed_out_at timestamptz,
  blocked       boolean not null default false
);
create index if not exists sessions_user_idx on sessions (user_id, created_at desc);

create table if not exists account_changes (
  id      bigint generated always as identity primary key,
  user_id uuid not null references users (id),
  kind    text not null check (kind in ('phone', 'city', 'email', 'name')),
  "from"  text,
  "to"    text,
  by      text not null check (by in ('user', 'staff')),
  at      timestamptz not null default now()
);
create index if not exists account_changes_user_idx on account_changes (user_id, at desc);

commit;
