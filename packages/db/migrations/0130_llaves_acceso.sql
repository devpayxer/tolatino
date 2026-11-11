-- 0130 · Fase 8 · 8d · Entrar con Face ID o huella: llaves de acceso (passkeys, WebAuthn) en la web y en las apps
-- (docs/diseno/plan/fase8-apps.md §2 «llaves_acceso», §3.4, §4 8d, §6 #13; DECISIONES E).
-- NUMERACIÓN: el plan decía 0128 (que tomó 8e). La última confirmada es 0129 (8g) y la última semilla 0047: 8d toma 0130 y no necesita
-- semilla (las llaves solo nacen en un autenticador de verdad; la semilla no puede inventarlas). 8b tomará la siguiente libre. Anotado en el
-- plan y en REVISION.
--
-- Autenticación (Opus/high). Lo que pone la base, además de lo que revisa lib/llaves/ (verificación con @simplewebauthn/server):
-- · passkeys: una llave por credencial (credential_id único en todo el sistema: una llave es de UNA cuenta, guardián llaveDeSuCuenta). Nunca se
--   borra: se quita (la persona), se revoca (el equipo, con motivo) o la quita el sistema (contador que retrocede = posible clon). El contador
--   de firmas SOLO sube (o se queda en 0 si el autenticador no cuenta): la base rechaza un retroceso aunque la app se equivoque. Tope
--   passkey_max llaves vivas por cuenta, en la base. La credencial, la llave pública, la cuenta y el dispositivo donde nació no cambian.
-- · webauthn_challenges: el reto de cada ceremonia (registro, entrar, confirmar) se guarda SOLO como huella (sha256), vence a los
--   passkey_reto_s segundos y se consume UNA vez (used_at pasa de null a una hora y nunca vuelve; guardián retoUnUso). Atado al dispositivo
--   (cookie tl_dev) y, en el registro, a la cuenta. Se purgan los vencidos hace más de un día (retención; es lo único que se borra).
-- · passkey_log: SOLO inserción (registrada, entró, rechazada con su motivo, quitada, revocada, contador), con la IP para los límites.
-- · sessions suma via ('codigo' | 'llave') y passkey_id: la sesión que abre una llave es la MISMA que la del código (lib/cuenta.ts abrirSesionEn),
--   solo anota por dónde entró (Usuarios 360°).
-- · users suma llave_ofrecida_at: la hoja «Entra la próxima vez con Face ID / tu huella» sale UNA vez por cuenta (se marca al mostrarla).
-- · account_changes suma kind 'passkey' (agregó / quitó una llave) y by 'sistema'.
-- · Avisos crit (sin interruptor, como lo demás de seguridad): cuenta_llave_nueva y cuenta_llave_quitada (push privado: el prefijo cuenta_ lo fuerza).
-- · Configuración › Apps: passkey_max (10), passkey_reto_s (120), passkey_retos_hora (por dirección), passkey_fallos_hora (por dirección y por llave).
--   Interruptor cuenta.llaves (sandbox encendido; producción: Fase 9). El RP ID y los orígenes salen del entorno (PASSKEY_RP_ID, PASSKEY_ORIGENES).
-- Idempotente: se puede aplicar dos veces. Nada se borra (salvo los retos vencidos, por retención).
begin;

-- ── Las llaves ──
create table if not exists passkeys (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references users (id),
  city_id          text references cities (id),
  -- base64url del id de la credencial (lo que manda el autenticador). Único en todo el sistema.
  credential_id    text not null unique check (credential_id ~ '^[A-Za-z0-9_-]+$' and char_length(credential_id) between 16 and 1366),
  -- La llave pública COSE tal cual (verificada al registrar). Nunca la privada: esa no sale del teléfono.
  public_key       bytea not null check (octet_length(public_key) between 32 and 2048),
  sign_count       bigint not null default 0 check (sign_count >= 0),
  aaguid           uuid,
  transports       text[] not null default '{}' check (cardinality(transports) <= 8),
  device_type      text not null default 'singleDevice' check (device_type in ('singleDevice', 'multiDevice')),
  backed_up        boolean not null default false,
  name             text not null check (char_length(name) between 1 and 80),
  rp_id            text not null check (rp_id ~ '^[a-z0-9.-]{1,253}$'),
  created_via_app  text not null default 'cliente' check (created_via_app in ('cliente', 'negocio', 'delivery', 'checkin')),
  created_platform text not null default 'web' check (created_platform in ('ios', 'android', 'web')),
  -- Dónde nació: si el equipo bloquea ese dispositivo o esa sesión, la llave tampoco entra (guardián passkeyNoSaltaBloqueo).
  created_session  uuid references sessions (id),
  created_device   uuid,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz,
  revoked_at       timestamptz,
  revoked_by       text check (revoked_by in ('user', 'staff', 'sistema')),
  revoked_staff    uuid references users (id),
  revoked_reason   text check (char_length(revoked_reason) <= 500),
  check ((revoked_at is null) = (revoked_by is null)),
  check (revoked_by is distinct from 'staff' or (revoked_staff is not null and coalesce(revoked_reason, '') <> '')),
  check (revoked_by is distinct from 'sistema' or coalesce(revoked_reason, '') <> '')
);
create index if not exists passkeys_user_idx on passkeys (user_id, created_at desc);
create index if not exists passkeys_vivas_idx on passkeys (user_id) where revoked_at is null;

create or replace function passkeys_antes() returns trigger language plpgsql as $$
declare n int;
begin
  if tg_op = 'DELETE' then raise exception 'una llave de acceso no se borra: se quita o se revoca'; end if;
  if tg_op = 'INSERT' then
    select count(*) into n from passkeys where user_id = new.user_id and revoked_at is null;
    if n >= cfg_int('passkey_max') then raise exception 'llave: la cuenta ya tiene el máximo de llaves (passkey_max)' using errcode = 'P0429'; end if;
    new.created_at := now(); new.last_used_at := null; new.revoked_at := null; new.revoked_by := null; new.revoked_staff := null; new.revoked_reason := null;
    return new;
  end if;
  if (new.user_id, new.credential_id, new.public_key, new.rp_id, new.created_at, new.created_session, new.created_device, new.created_via_app, new.created_platform)
     is distinct from (old.user_id, old.credential_id, old.public_key, old.rp_id, old.created_at, old.created_session, old.created_device, old.created_via_app, old.created_platform)
    then raise exception 'llave: la credencial, su cuenta y dónde nació no cambian'; end if;
  -- El contador de firmas solo sube; 0 → 0 vale (autenticadores que no cuentan, como las llaves sincronizadas). Un retroceso = posible clon.
  if new.sign_count < old.sign_count or (new.sign_count = old.sign_count and old.sign_count > 0 and new.last_used_at is distinct from old.last_used_at)
    then raise exception 'llave: el contador de firmas no retrocede (posible clon)'; end if;
  if old.revoked_at is not null and (new.revoked_at is distinct from old.revoked_at or new.revoked_by is distinct from old.revoked_by
       or new.revoked_reason is distinct from old.revoked_reason or new.sign_count <> old.sign_count or new.last_used_at is distinct from old.last_used_at)
    then raise exception 'llave: una llave quitada no vuelve ni se usa'; end if;
  if new.last_used_at < old.last_used_at then raise exception 'llave: la última vez solo avanza'; end if;
  return new;
end $$;
drop trigger if exists passkeys_antes on passkeys;
create trigger passkeys_antes before insert or update or delete on passkeys for each row execute function passkeys_antes();

-- ── Los retos (uno por ceremonia; un uso; corto) ──
create table if not exists webauthn_challenges (
  id             bigint generated always as identity primary key,
  purpose        text not null check (purpose in ('registro', 'entrar', 'confirmar')),
  challenge_hash text not null unique check (challenge_hash ~ '^[a-f0-9]{64}$'),
  user_id        uuid references users (id),
  device         uuid,
  ip             inet,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  used_at        timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  check (purpose <> 'registro' or user_id is not null)
);
create index if not exists webauthn_challenges_ip_idx on webauthn_challenges (ip, created_at desc);
create index if not exists webauthn_challenges_vence_idx on webauthn_challenges (expires_at);

create or replace function webauthn_challenges_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.expires_at > now() - interval '1 day' then raise exception 'reto: solo se purgan los vencidos hace más de un día'; end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.used_at := null;
    if new.expires_at is null or new.expires_at <= now() then raise exception 'reto: nace vigente'; end if;
    return new;
  end if;
  -- Un uso: lo único que cambia es used_at, de null a ahora, y solo si no venció.
  if (new.purpose, new.challenge_hash, new.user_id, new.device, new.ip, new.created_at, new.expires_at)
     is distinct from (old.purpose, old.challenge_hash, old.user_id, old.device, old.ip, old.created_at, old.expires_at)
    then raise exception 'reto: no cambia'; end if;
  if old.used_at is not null then raise exception 'reto: ya se usó (un uso)'; end if;
  if new.used_at is null or old.expires_at <= now() then raise exception 'reto: vencido'; end if;
  new.used_at := now();
  return new;
end $$;
drop trigger if exists webauthn_challenges_antes on webauthn_challenges;
create trigger webauthn_challenges_antes before insert or update or delete on webauthn_challenges for each row execute function webauthn_challenges_antes();

-- ── El libro de las llaves (solo inserción) ──
create table if not exists passkey_log (
  id         bigint generated always as identity primary key,
  passkey_id bigint references passkeys (id),
  user_id    uuid references users (id),
  city_id    text references cities (id),
  action     text not null check (action in ('registrada', 'registro_fallo', 'entro', 'entrar_fallo', 'quitada', 'revocada', 'contador')),
  detail     text check (char_length(detail) <= 120),
  ip         inet,
  device     uuid,
  app        text check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  platform   text check (platform in ('ios', 'android', 'web')),
  at         timestamptz not null default now()
);
create index if not exists passkey_log_llave_idx on passkey_log (passkey_id, at desc);
create index if not exists passkey_log_fallos_idx on passkey_log (ip, at desc) where action = 'entrar_fallo';
create index if not exists passkey_log_fallos_dev_idx on passkey_log (device, at desc) where action = 'entrar_fallo';
create index if not exists passkey_log_at_brin on passkey_log using brin (at);
create or replace function passkey_log_inmutable() returns trigger language plpgsql as $$
begin
  raise exception 'passkey_log es solo de inserción';
end $$;
drop trigger if exists passkey_log_no_cambia on passkey_log;
create trigger passkey_log_no_cambia before update or delete on passkey_log for each row execute function passkey_log_inmutable();

-- ── La sesión dice por dónde entró (la misma sesión; solo informativo) ──
alter table sessions add column if not exists via text not null default 'codigo';
alter table sessions add column if not exists passkey_id bigint references passkeys (id);
alter table sessions drop constraint if exists sessions_via_check;
alter table sessions add constraint sessions_via_check check (via in ('codigo', 'llave') and ((via = 'llave') = (passkey_id is not null)));

-- ── La hoja «Entra la próxima vez con Face ID / tu huella»: una vez por cuenta ──
alter table users add column if not exists llave_ofrecida_at timestamptz;

-- ── Cambios de cuenta: agregó o quitó una llave; el sistema también puede quitarla ──
alter table account_changes drop constraint if exists account_changes_kind_check;
alter table account_changes add constraint account_changes_kind_check check (kind in ('phone', 'city', 'email', 'name', 'photo', 'delete', 'undelete', 'passkey'));
alter table account_changes drop constraint if exists account_changes_by_check;
alter table account_changes add constraint account_changes_by_check check (by in ('user', 'staff', 'sistema'));

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('passkey_max', 1, 20, 10, '{"es":"llaves","en":"passkeys"}', 'apps', '{"es":"Llaves de acceso · máximo por cuenta","en":"Passkeys · maximum per account"}',
    '{"es":"Cuántas llaves de acceso vivas puede tener una cuenta (una por teléfono o computadora). Más: la base lo rechaza.","en":"How many live passkeys an account can have (one per phone or computer). More: the database rejects it."}', true, null, null, 380),
  ('passkey_reto_s', 30, 600, 120, '{"es":"segundos","en":"seconds"}', 'apps', '{"es":"Llaves de acceso · vigencia del reto","en":"Passkeys · challenge lifetime"}',
    '{"es":"Cuántos segundos tiene la persona para tocar Face ID o la huella después de pedir entrar. Después el reto vence y se pide otro.","en":"How many seconds the person has to use Face ID or the fingerprint after asking to sign in. Then the challenge expires and a new one is needed."}', true, null, null, 381),
  ('passkey_retos_hora', 10, 1000, 60, '{"es":"retos","en":"challenges"}', 'apps', '{"es":"Llaves de acceso · retos por dirección por hora","en":"Passkeys · challenges per address per hour"}',
    '{"es":"Cuántas veces por hora una misma dirección de internet puede empezar a entrar o a agregar una llave. Más: «Demasiados intentos».","en":"How many times per hour one internet address can start signing in or adding a passkey. More: \"Too many tries\"."}', true, null, null, 382),
  ('passkey_fallos_hora', 3, 100, 10, '{"es":"intentos","en":"attempts"}', 'apps', '{"es":"Llaves de acceso · intentos fallidos por hora","en":"Passkeys · failed attempts per hour"}',
    '{"es":"Intentos fallidos de entrar con llave por hora, por dirección de internet y por llave. Más: hay que esperar o entrar con el código.","en":"Failed passkey sign-in attempts per hour, per internet address and per passkey. More: wait or sign in with the code."}', true, null, null, 383)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Avisos de seguridad (crit: sin interruptor; push privado por el prefijo cuenta_) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('cuenta_llave_nueva', 'crit', null, true, '{"es":"Agregaste una llave de acceso","en":"You added a passkey"}',
    '{"es":"Agregaste una llave de acceso en {dispositivo}. Si no fuiste tú, entra y quítala en Mi cuenta › Privacidad.","en":"You added a passkey on {dispositivo}. If it wasn''t you, sign in and remove it in My account › Privacy."}'),
  ('cuenta_llave_quitada', 'crit', null, true, '{"es":"Quitamos una llave de acceso de tu cuenta","en":"We removed a passkey from your account"}',
    '{"es":"La llave de acceso de {dispositivo} ya no entra a tu cuenta: {motivo}. Entra con tu código y, si quieres, agrega otra.","en":"The passkey on {dispositivo} no longer signs in to your account: {motivo}. Sign in with your code and, if you want, add another."}')
on conflict (key) do nothing;

-- ── Interruptor (sandbox encendido; producción: Fase 9) ──
insert into feature_flags (key, enabled, note) values
  ('cuenta.llaves', true, 'Cuenta · entrar con Face ID o huella (llaves de acceso). Apagado: no se ofrecen ni entran; el código por SMS sigue igual')
on conflict (key) do nothing;

commit;
