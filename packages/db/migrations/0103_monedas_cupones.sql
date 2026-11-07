-- 0103 · Monedas y cupones de negocios (Fase 5 · 5g · docs/diseno/plan/fase5-comunidad.md §2 «0103 monedas_cupones», §3 «Monedas», §4 5g
-- y §6 #3–#6). Libro y valor: Opus/high.
-- · Las monedas NO tienen valor en dinero: no se compran, no se venden, no se transfieren entre personas, no se cambian por dinero ni por
--   saldo y no vencen (§6 #3). Viven en su propio libro (coin_entries), nunca en columnas de dinero ni en un monedero. Se ganan con la
--   bienvenida (+100, una vez) y con el premio del mes (los 3 primeros de la Tabla del Barrio, al cerrar el mes); se gastan en cupones.
-- · coin_rules: cuánto da cada cosa (el equipo cambia el valor o la apaga, con auditoría en la app).
-- · coin_entries: el libro. SOLO INSERCIÓN (trigger: ni update ni delete). Solo lo escriben las funciones mon_* (marca tl.monedas):
--   mon_bienvenida, mon_premios_mes (idempotentes por persona + motivo + referencia), mon_gastar (candado por persona y `for update`
--   sobre el perfil: el saldo nunca queda negativo), mon_devolver (asiento inverso de un canje, una sola vez) y mon_ajustar (el equipo,
--   con motivo; nunca deja el saldo negativo; nadie se ajusta a sí mismo).
-- · community_profiles.coins es derivado (check coins >= 0): lo escribe solo el libro (trigger después de cada asiento).
-- · coupons: el negocio (Pro) los ofrece; To'Latino los aprueba y FIJA EL COSTO (80–1,000 monedas). Cupo del mes, días de validez,
--   estados pending · live · paused · ended (pausa del negocio o del equipo, con motivo). El cupón es un descuento que el negocio decide
--   dar en su local: To'Latino no le paga ni le cobra (§6 #4: «liquidar» = reporte de canjes del mes).
-- · coupon_redemptions: el canje. Código TL-CQ-xxxx (único, sin 0/O/1/I), vence a los días del cupón; issued → used (lo valida el
--   negocio, una sola vez) o issued → expired (las monedas vuelven). Solo lo escriben cup_canjear / cup_validar / cup_vencer (marca
--   tl.cupones): un canje gasta en la misma transacción que crea el código, con el cupón bloqueado (`for update`): dos canjes de la
--   última unidad a la vez → pasa uno; la misma persona no tiene dos códigos vivos del mismo cupón.
-- · El cierre de la Tabla (tabla_cerrar, de cualquier camino) acredita el premio del mes con este libro y el reporte del cierre cuenta
--   los canjes de cupones del mes en la ciudad. Lo prometido antes de esta migración se cumple aquí: la bienvenida ya hecha y los meses
--   ya cerrados reciben sus monedas (idempotente).
-- Idempotente: if not exists, funciones que se reemplazan, triggers que se recrean, catálogo on conflict. Nada se borra.
begin;

-- ── Reglas de ganancia ──
create table if not exists coin_rules (
  key        text primary key,
  coins      integer not null check (coins between 0 and 1000),
  enabled    boolean not null default true,
  label      jsonb not null,
  sort       smallint not null default 0,
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);
insert into coin_rules (key, coins, label, sort) values
  ('welcome', 100, '{"es":"Bienvenida, una vez","en":"Welcome, once"}', 1),
  ('premio_mes', 200, '{"es":"Quedar entre los 3 primeros de la Tabla del Barrio del mes","en":"Finishing in the top 3 of the monthly Neighborhood Table"}', 2)
on conflict (key) do nothing;
create or replace function mon_regla(k text) returns integer language sql stable as $$
  select coalesce((select case when enabled then coins else 0 end from coin_rules where key = k), 0)
$$;

-- ── El libro de monedas ──
create table if not exists coin_entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  city_id     text not null references cities (id),
  delta       integer not null check (delta <> 0 and delta between -5000 and 5000),
  reason_key  text not null check (reason_key in ('welcome', 'premio_mes', 'canje', 'devolucion', 'ajuste')),
  ref_kind    text not null,
  ref_id      text not null,
  reverses_id bigint references coin_entries (id),
  by_staff    uuid references users (id),
  reason      text check (char_length(reason) <= 500),
  created_at  timestamptz not null default now(),
  check (reason_key not in ('welcome', 'premio_mes') or (delta > 0 and reverses_id is null and by_staff is null)),
  check (reason_key <> 'canje' or (delta < 0 and reverses_id is null and by_staff is null)),
  check (reason_key <> 'devolucion' or (delta > 0 and reverses_id is not null)),
  check (reason_key <> 'ajuste' or (reverses_id is null and by_staff is not null and reason is not null and by_staff <> user_id))
);
-- Idempotente: una sola vez por persona, motivo y referencia (la bienvenida, el premio de un mes, el canje de un código); cada canje se
-- devuelve una sola vez.
create unique index if not exists coin_entries_unico on coin_entries (user_id, reason_key, ref_kind, ref_id) where reverses_id is null;
create unique index if not exists coin_entries_reverso on coin_entries (reverses_id) where reverses_id is not null;
create index if not exists coin_entries_persona_idx on coin_entries (user_id, id desc);
create index if not exists coin_entries_ciudad_idx on coin_entries (city_id, created_at);

-- Marca del libro: solo las funciones mon_* insertan (la app nunca escribe el libro directo; guardián libroSoloInsercion).
create or replace function mon_entrar() returns text language plpgsql as $$
declare p text := coalesce(current_setting('tl.monedas', true), '');
begin perform set_config('tl.monedas', 'si', true); return p; end $$;
create or replace function mon_salir(prev text) returns void language sql as $$ select set_config('tl.monedas', coalesce(prev, ''), true) $$;

create or replace function coin_entries_inmutable() returns trigger language plpgsql as $$
begin raise exception 'coin_entries es solo de inserción'; end $$;
drop trigger if exists coin_entries_no_cambia on coin_entries;
create trigger coin_entries_no_cambia before update or delete on coin_entries for each row execute function coin_entries_inmutable();

-- Antes de insertar: solo por las funciones del libro; una devolución es el inverso exacto de un canje de la misma persona.
create or replace function coin_entries_antes() returns trigger language plpgsql as $$
declare o coin_entries;
begin
  if coalesce(current_setting('tl.monedas', true), '') <> 'si' then raise exception 'el libro de monedas solo lo escriben sus funciones (mon_*)'; end if;
  if new.reason_key = 'devolucion' then
    select * into o from coin_entries where id = new.reverses_id;
    if o.id is null or o.reason_key <> 'canje' or o.user_id <> new.user_id or new.delta <> -o.delta then raise exception 'una devolución es el inverso exacto de un canje'; end if;
  end if;
  return new;
end $$;
drop trigger if exists coin_entries_antes on coin_entries;
create trigger coin_entries_antes before insert on coin_entries for each row execute function coin_entries_antes();

-- ── El saldo (derivado) ──
alter table community_profiles add column if not exists coins integer not null default 0;
alter table community_profiles drop constraint if exists community_profiles_monedas;
alter table community_profiles add constraint community_profiles_monedas check (coins >= 0);

-- El perfil: contadores, puntos, rango y monedas los escribe solo la base (marca tl.derivados que encienden sus funciones).
create or replace function community_profiles_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then
      new.followers_n := 0; new.following_n := 0; new.posts_n := 0; new.answers_best_n := 0;
      new.points_total := 0; new.points_today := 0; new.points_day := null; new.points_month := 0; new.points_month_key := null; new.rank_level := 1; new.rank_floor := 1;
      new.coins := 0;
    end if;
  elsif not com_derivados_ok() and (new.followers_n, new.following_n, new.posts_n, new.answers_best_n) is distinct from (old.followers_n, old.following_n, old.posts_n, old.answers_best_n) then
    raise exception 'los contadores del perfil son derivados';
  elsif not com_derivados_ok() and (new.points_total, new.points_today, new.points_day, new.points_month, new.points_month_key, new.rank_level, new.rank_floor)
        is distinct from (old.points_total, old.points_today, old.points_day, old.points_month, old.points_month_key, old.rank_level, old.rank_floor) then
    raise exception 'los puntos y el rango son derivados: solo los escriben el libro y pts_rango';
  elsif not com_derivados_ok() and new.coins is distinct from old.coins then
    raise exception 'las monedas son derivadas: solo las escribe su libro (mon_*)';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Después de cada asiento: el saldo de la persona, en la misma transacción (el check coins >= 0 rechaza un saldo negativo).
create or replace function coin_entries_despues() returns trigger language plpgsql as $$
declare prev text;
begin
  prev := com_derivados_entrar();
  insert into community_profiles (user_id) values (new.user_id) on conflict (user_id) do nothing;
  update community_profiles set coins = coins + new.delta where user_id = new.user_id;
  perform com_derivados_salir(prev);
  return null;
end $$;
drop trigger if exists coin_entries_despues on coin_entries;
create trigger coin_entries_despues after insert on coin_entries for each row execute function coin_entries_despues();

-- ── Funciones del libro ──
-- Asentar (interno): la ciudad es la del perfil de la persona (o la que se diga, p. ej. la del mes de la Tabla). Devuelve el id del
-- asiento, o null si esa referencia ya estaba asentada (idempotente).
create or replace function mon_asentar(uid uuid, d integer, motivo text, rk text, rid text, rev bigint, staff uuid, porque text, ciudad text) returns bigint language plpgsql as $$
declare c text := ciudad; prev text; nid bigint;
begin
  if uid is null then raise exception 'las monedas son de una persona (la cuenta oficial no tiene monedas)'; end if;
  if c is null then select home_city_id into c from users where id = uid; end if;
  if c is null then raise exception 'la persona no tiene ciudad'; end if;
  prev := mon_entrar();
  if rev is null then
    insert into coin_entries (user_id, city_id, delta, reason_key, ref_kind, ref_id, by_staff, reason)
      values (uid, c, d, motivo, rk, rid, staff, left(porque, 500))
      on conflict (user_id, reason_key, ref_kind, ref_id) where reverses_id is null do nothing returning id into nid;
  else
    insert into coin_entries (user_id, city_id, delta, reason_key, ref_kind, ref_id, reverses_id, by_staff, reason)
      values (uid, c, d, motivo, rk, rid, rev, staff, left(porque, 500))
      on conflict (reverses_id) where reverses_id is not null do nothing returning id into nid;
  end if;
  perform mon_salir(prev);
  return nid;
end $$;

-- La bienvenida: una vez, a quien hizo la bienvenida y declaró tener 18 años o más. Devuelve cuántas se acreditaron (0 si ya estaban).
create or replace function mon_bienvenida(uid uuid) returns integer language plpgsql as $$
declare n int := mon_regla('welcome');
begin
  if uid is null or n <= 0 then return 0; end if;
  if not exists (select 1 from community_profiles cp join users u on u.id = cp.user_id where cp.user_id = uid and cp.welcome_at is not null and cp.adult is true and u.home_city_id is not null) then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('mon:' || uid::text, 0));
  return case when mon_asentar(uid, n, 'welcome', 'persona', uid::text, null, null, null, null) is null then 0 else n end;
end $$;

-- El premio del mes: a quienes quedaron entre los 3 primeros de un mes CERRADO de la Tabla (lo que fijó el cierre en prize_coins; los
-- excluidos no tienen premio). Una vez por persona y mes. Devuelve cuántas personas recibieron monedas ahora.
create or replace function mon_premios_mes(ciudad text, mes date) returns integer language plpgsql as $$
declare r record; k int := 0;
begin
  if not exists (select 1 from board_closures where city_id = ciudad and month = mes and closed_at is not null) then return 0; end if;
  for r in select mb.user_id, mb.prize_coins from monthly_boards mb join users u on u.id = mb.user_id
            where mb.city_id = ciudad and mb.month = mes and mb.position <= 3 and mb.prize_coins > 0 and not mb.excluded order by mb.position loop
    perform pg_advisory_xact_lock(hashtextextended('mon:' || r.user_id::text, 0));
    if mon_asentar(r.user_id, r.prize_coins, 'premio_mes', 'tabla', ciudad || ':' || to_char(mes, 'YYYY-MM-DD'), null, null, null, ciudad) is not null then k := k + 1; end if;
  end loop;
  return k;
end $$;

-- Gastar (un canje): candado por persona y el perfil `for update`; con saldo insuficiente no se asienta nada. Devuelve el id del asiento.
create or replace function mon_gastar(uid uuid, n integer, rk text, rid text) returns bigint language plpgsql as $$
declare saldo int; nid bigint;
begin
  if uid is null or n is null or n <= 0 then raise exception 'un canje pide persona y cantidad'; end if;
  perform pg_advisory_xact_lock(hashtextextended('mon:' || uid::text, 0));
  select coins into saldo from community_profiles where user_id = uid for update;
  if coalesce(saldo, 0) < n then raise exception 'saldo insuficiente de monedas: tiene %, cuesta %', coalesce(saldo, 0), n; end if;
  nid := mon_asentar(uid, -n, 'canje', rk, rid, null, null, null, null);
  if nid is null then raise exception 'ese canje ya estaba asentado'; end if;
  return nid;
end $$;

-- Devolver un canje (código vencido sin usar): el asiento inverso exacto, una sola vez. Devuelve cuántas volvieron (0 si ya volvieron).
create or replace function mon_devolver(entrada bigint, porque text) returns integer language plpgsql as $$
declare e coin_entries;
begin
  select * into e from coin_entries where id = entrada;
  if e.id is null or e.reason_key <> 'canje' then raise exception 'solo se devuelve un canje'; end if;
  perform pg_advisory_xact_lock(hashtextextended('mon:' || e.user_id::text, 0));
  return case when mon_asentar(e.user_id, -e.delta, 'devolucion', e.ref_kind, e.ref_id, e.id, null, coalesce(porque, 'vencido'), e.city_id) is null then 0 else -e.delta end;
end $$;

-- Ajuste del equipo (± con motivo; el tope por rol lo revisa la app y el libro no deja más de 5,000). Nunca deja el saldo en negativo.
create or replace function mon_ajustar(uid uuid, d integer, staff uuid, porque text) returns integer language plpgsql as $$
declare saldo int;
begin
  if uid is null or staff is null or d is null or d = 0 or porque is null or btrim(porque) = '' then raise exception 'ajuste sin persona, cantidad o motivo'; end if;
  if staff = uid then raise exception 'nadie ajusta sus propias monedas'; end if;
  perform pg_advisory_xact_lock(hashtextextended('mon:' || uid::text, 0));
  select coins into saldo from community_profiles where user_id = uid for update;
  if coalesce(saldo, 0) + d < 0 then raise exception 'el ajuste deja las monedas en negativo (tiene %)', coalesce(saldo, 0); end if;
  perform mon_asentar(uid, d, 'ajuste', 'equipo', gen_random_uuid()::text, null, staff, porque, null);
  return d;
end $$;

-- ── Cupones de negocios ──
create table if not exists coupons (
  id             bigint generated always as identity primary key,
  business_id    text not null references businesses (id),
  city_id        text not null references cities (id),
  kind           text not null default 'coins' check (kind in ('coins')),
  title          jsonb not null check (char_length(coalesce(title ->> 'es', '')) between 3 and 60 and char_length(coalesce(title ->> 'en', '')) <= 60),
  terms          jsonb not null default '{"es":"","en":""}'::jsonb check (char_length(coalesce(terms ->> 'es', '')) <= 200 and char_length(coalesce(terms ->> 'en', '')) <= 200),
  cost_coins     integer check (cost_coins between 80 and 1000),
  monthly_stock  integer not null check (monthly_stock between 1 and 500),
  valid_days     smallint not null default 30 check (valid_days between 7 and 90),
  status         text not null default 'pending' check (status in ('pending', 'live', 'paused', 'ended')),
  paused_by      text check (paused_by in ('business', 'admin')),
  paused_reason  text check (char_length(paused_reason) <= 500),
  paused_at      timestamptz,
  ended_by       text check (ended_by in ('business', 'admin')),
  ended_reason   text check (char_length(ended_reason) <= 500),
  ended_at       timestamptz,
  created_by     uuid references users (id),
  approved_by    uuid references users (id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (status in ('pending', 'ended') or cost_coins is not null),
  check (status <> 'paused' or paused_by is not null),
  check (paused_by is distinct from 'admin' or paused_reason is not null),
  check (status <> 'ended' or ended_by is not null),
  check (ended_by is distinct from 'admin' or ended_reason is not null)
);
create index if not exists coupons_ciudad_idx on coupons (city_id, cost_coins, id) where status = 'live';
create index if not exists coupons_negocio_idx on coupons (business_id, created_at desc);
create index if not exists coupons_estado_idx on coupons (city_id, status, id desc);

-- Un cupón no se borra (estados) y uno terminado no vuelve.
create or replace function coupons_guardia() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cupón no se borra: se termina'; end if;
  if old.status = 'ended' and (new.status, new.cost_coins, new.monthly_stock, new.valid_days, new.title, new.terms) is distinct from (old.status, old.cost_coins, old.monthly_stock, old.valid_days, old.title, old.terms) then
    raise exception 'un cupón terminado no cambia';
  end if;
  if new.business_id <> old.business_id or new.city_id <> old.city_id then raise exception 'un cupón no cambia de negocio ni de ciudad'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists coupons_guardia on coupons;
create trigger coupons_guardia before update or delete on coupons for each row execute function coupons_guardia();

create table if not exists coupon_redemptions (
  id              bigint generated always as identity primary key,
  coupon_id       bigint not null references coupons (id),
  business_id     text not null references businesses (id),
  city_id         text not null references cities (id),
  user_id         uuid not null references users (id),
  code            text not null unique check (code ~ '^TL-CQ-[2-9A-HJ-NP-Z]{4,6}$'),
  cost_coins      integer not null check (cost_coins between 80 and 1000),
  coin_entry_id   bigint not null unique references coin_entries (id),
  expires_at      timestamptz not null,
  status          text not null default 'issued' check (status in ('issued', 'used', 'expired')),
  used_at         timestamptz,
  used_by         uuid references users (id),
  expired_at      timestamptz,
  return_entry_id bigint unique references coin_entries (id),
  created_at      timestamptz not null default now(),
  check (status <> 'used' or (used_at is not null and used_by is not null)),
  check (status <> 'expired' or (expired_at is not null and return_entry_id is not null))
);
create index if not exists coupon_redemptions_persona_idx on coupon_redemptions (user_id, created_at desc, id desc);
create index if not exists coupon_redemptions_cupon_idx on coupon_redemptions (coupon_id, status);
create index if not exists coupon_redemptions_mes_idx on coupon_redemptions (coupon_id, created_at) where status <> 'expired';
create index if not exists coupon_redemptions_negocio_idx on coupon_redemptions (business_id, id desc);
create index if not exists coupon_redemptions_ciudad_idx on coupon_redemptions (city_id, created_at);
create index if not exists coupon_redemptions_vence_idx on coupon_redemptions (expires_at) where status = 'issued';
-- Una persona no tiene dos códigos vivos (o usados) del mismo cupón: «uno por persona». Si el código venció sin usarse, puede volver a canjear.
create unique index if not exists coupon_redemptions_uno on coupon_redemptions (coupon_id, user_id) where status in ('issued', 'used');

-- Marca de los cupones: solo cup_* escriben un canje. Un canje no se borra; solo pasa de emitido a usado (una vez) o a vencido.
create or replace function cup_entrar() returns text language plpgsql as $$
declare p text := coalesce(current_setting('tl.cupones', true), '');
begin perform set_config('tl.cupones', 'si', true); return p; end $$;
create or replace function cup_salir(prev text) returns void language sql as $$ select set_config('tl.cupones', coalesce(prev, ''), true) $$;
create or replace function coupon_redemptions_guardia() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un canje no se borra'; end if;
  if coalesce(current_setting('tl.cupones', true), '') <> 'si' then raise exception 'los canjes solo los escriben sus funciones (cup_*)'; end if;
  if tg_op = 'UPDATE' then
    if (new.coupon_id, new.business_id, new.city_id, new.user_id, new.code, new.cost_coins, new.coin_entry_id, new.expires_at, new.created_at)
       is distinct from (old.coupon_id, old.business_id, old.city_id, old.user_id, old.code, old.cost_coins, old.coin_entry_id, old.expires_at, old.created_at) then
      raise exception 'un canje no cambia lo que se emitió';
    end if;
    if old.status <> 'issued' then raise exception 'un código usado o vencido no cambia'; end if;
    if new.status not in ('used', 'expired') then raise exception 'un código emitido solo pasa a usado o a vencido'; end if;
  end if;
  return new;
end $$;
drop trigger if exists coupon_redemptions_guardia on coupon_redemptions;
create trigger coupon_redemptions_guardia before insert or update or delete on coupon_redemptions for each row execute function coupon_redemptions_guardia();

-- Un código TL-CQ-xxxx sin 0/O/1/I (32 signos, bytes aleatorios de pgcrypto); si choca, prueba otra vez y crece a 5 y 6 signos.
create or replace function cup_codigo() returns text language plpgsql volatile as $$
declare a text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; n int; b bytea; c text;
begin
  for i in 1..30 loop
    n := case when i <= 10 then 4 when i <= 20 then 5 else 6 end;
    b := gen_random_bytes(n);
    select string_agg(substr(a, 1 + (get_byte(b, k) % 32), 1), '' order by k) into c from generate_series(0, n - 1) k;
    c := 'TL-CQ-' || c;
    if not exists (select 1 from coupon_redemptions where code = c) then return c; end if;
  end loop;
  raise exception 'no se pudo crear un código único';
end $$;

-- Canjear: el cupón bloqueado (`for update`) mientras se cuenta el cupo del mes (mes local de la ciudad) y se gasta: dos canjes de la
-- última unidad a la vez → el segundo espera, ve el cupo lleno y no gasta nada. Uno por persona (vivo o usado). Quien es del negocio no
-- canjea su propio cupón. Gastar y crear el código van en la misma transacción.
create or replace function cup_canjear(uid uuid, cid bigint) returns table (canje bigint, codigo text, vence timestamptz, costo integer) language plpgsql as $$
declare cp record; ini timestamptz; usados int; cod text; e bigint; prev text; rid bigint; v timestamptz;
begin
  select c.id, c.business_id, c.city_id, c.status, c.cost_coins, c.monthly_stock, c.valid_days, b.status as bst, coalesce(s.plan, 'free') = 'pro' as pro, ci.timezone as tz
    into cp from coupons c join businesses b on b.id = c.business_id join cities ci on ci.id = c.city_id left join business_stats_cache s on s.business_id = c.business_id
   where c.id = cid for update of c;
  if cp.id is null or cp.status <> 'live' or cp.cost_coins is null or cp.bst <> 'active' or not cp.pro then raise exception 'cupon no disponible'; end if;
  if exists (select 1 from business_members m where m.business_id = cp.business_id and m.user_id = uid and m.status = 'active') then raise exception 'cupon de tu negocio'; end if;
  if exists (select 1 from coupon_redemptions r where r.coupon_id = cid and r.user_id = uid and r.status in ('issued', 'used')) then raise exception 'cupon ya canjeado'; end if;
  ini := date_trunc('month', now() at time zone cp.tz) at time zone cp.tz;
  select count(*) into usados from coupon_redemptions r where r.coupon_id = cid and r.created_at >= ini and r.status <> 'expired';
  if usados >= cp.monthly_stock then raise exception 'cupon agotado este mes'; end if;
  cod := cup_codigo();
  e := mon_gastar(uid, cp.cost_coins, 'cupon', cod);
  v := now() + make_interval(days => cp.valid_days);
  prev := cup_entrar();
  insert into coupon_redemptions (coupon_id, business_id, city_id, user_id, code, cost_coins, coin_entry_id, expires_at)
    values (cid, cp.business_id, cp.city_id, uid, cod, cp.cost_coins, e, v) returning id into rid;
  perform cup_salir(prev);
  return query select rid, cod, v, cp.cost_coins;
end $$;

-- Vencer un código (interno): pasa a vencido y las monedas vuelven (asiento inverso). Devuelve cuántas volvieron.
create or replace function cup_vencer_uno(rid bigint) returns integer language plpgsql as $$
declare r coupon_redemptions; n int; dev bigint; prev text;
begin
  select * into r from coupon_redemptions where id = rid for update;
  if r.id is null or r.status <> 'issued' or r.expires_at > now() then return 0; end if;
  n := mon_devolver(r.coin_entry_id, 'vencido');
  select id into dev from coin_entries where reverses_id = r.coin_entry_id;
  prev := cup_entrar();
  update coupon_redemptions set status = 'expired', expired_at = now(), return_entry_id = dev where id = rid;
  perform cup_salir(prev);
  return n;
end $$;

-- Validar en el local: el código bloqueado (`for update`); solo el negocio del cupón lo ve (para otro negocio «no existe»); se usa una
-- sola vez; si ya venció, vence ahora y las monedas vuelven. Resultado: ok · usado · vencido · no.
create or replace function cup_validar(negocio text, cod text, staff uuid) returns table (res text, canje bigint, persona uuid, cupon bigint, usado timestamptz) language plpgsql as $$
declare r coupon_redemptions; prev text;
begin
  select * into r from coupon_redemptions where code = upper(btrim(cod)) for update;
  if r.id is null or r.business_id <> negocio then return query select 'no'::text, null::bigint, null::uuid, null::bigint, null::timestamptz; return; end if;
  if r.status = 'used' then return query select 'usado'::text, r.id, r.user_id, r.coupon_id, r.used_at; return; end if;
  if r.status = 'expired' or r.expires_at <= now() then
    perform cup_vencer_uno(r.id);
    return query select 'vencido'::text, r.id, r.user_id, r.coupon_id, null::timestamptz; return;
  end if;
  if staff is null then raise exception 'validar pide quién valida'; end if;
  prev := cup_entrar();
  update coupon_redemptions set status = 'used', used_at = now(), used_by = staff where id = r.id and status = 'issued';
  perform cup_salir(prev);
  return query select 'ok'::text, r.id, r.user_id, r.coupon_id, now();
end $$;

-- El barrido: los códigos vencidos sin usar (de a 500, sin esperar a los que otro está tocando) y las monedas vuelven.
create or replace function cup_vencer(lote int) returns table (canje bigint, persona uuid, codigo text, cupon bigint, monedas integer) language plpgsql as $$
declare x record; n int;
begin
  for x in select r.id, r.user_id, r.code, r.coupon_id from coupon_redemptions r where r.status = 'issued' and r.expires_at <= now()
            order by r.expires_at limit greatest(1, least(coalesce(lote, 500), 2000)) for update skip locked loop
    n := cup_vencer_uno(x.id);
    if n > 0 then canje := x.id; persona := x.user_id; codigo := x.code; cupon := x.coupon_id; monedas := n; return next; end if;
  end loop;
end $$;

-- ── El cierre de la Tabla: premio en monedas y reporte de canjes (cualquier camino que cierre: Super Admin, barrido, semilla) ──
create or replace function board_closures_reporte() returns trigger language plpgsql as $$
declare tz text; ini timestamptz; fin timestamptz; k int; u int;
begin
  if old.closed_at is null and new.closed_at is not null then
    select coalesce(timezone, 'America/New_York') into tz from cities where id = new.city_id;
    ini := new.month::timestamp at time zone tz; fin := (new.month + interval '1 month')::timestamp at time zone tz;
    select count(*), count(*) filter (where status = 'used') into k, u from coupon_redemptions where city_id = new.city_id and created_at >= ini and created_at < fin;
    new.report := coalesce(new.report, '{}'::jsonb) || jsonb_build_object('canjes', k, 'canjes_usados', u);
  end if;
  return new;
end $$;
drop trigger if exists board_closures_reporte on board_closures;
create trigger board_closures_reporte before update on board_closures for each row execute function board_closures_reporte();
create or replace function board_closures_premios() returns trigger language plpgsql as $$
begin
  if old.closed_at is null and new.closed_at is not null then perform mon_premios_mes(new.city_id, new.month); end if;
  return null;
end $$;
drop trigger if exists board_closures_premios on board_closures;
create trigger board_closures_premios after update on board_closures for each row execute function board_closures_premios();

-- ── Lo prometido antes de 5g: la bienvenida ya hecha (+100) y el premio de los meses ya cerrados (idempotente) ──
do $$ declare x record; begin
  for x in select cp.user_id from community_profiles cp join users u on u.id = cp.user_id where cp.welcome_at is not null and cp.adult is true and u.home_city_id is not null loop
    perform mon_bienvenida(x.user_id);
  end loop;
  for x in select city_id, month from board_closures where closed_at is not null loop
    perform mon_premios_mes(x.city_id, x.month);
  end loop;
end $$;

-- ── Avisos (ES/EN; la Comunidad nunca por SMS; los del negocio tampoco: no son urgentes) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('gam_monedas', 'tx', null, false, '{"es":"Te llegaron monedas","en":"You got coins"}', '{"es":"{motivo}: +{n} monedas. Úsalas en los cupones de los negocios del barrio. No tienen valor en dinero.","en":"{motivo}: +{n} coins. Use them on neighborhood business coupons. They have no cash value."}'),
  ('gam_monedas_vuelven', 'tx', null, false, '{"es":"Te devolvimos tus monedas","en":"Your coins are back"}', '{"es":"Tu código {codigo} de «{cupon}» venció sin usarse. Te devolvimos {n} monedas.","en":"Your code {codigo} for «{cupon}» expired unused. We returned {n} coins."}'),
  ('gam_monedas_ajuste', 'tx', null, false, '{"es":"Ajustamos tus monedas","en":"We adjusted your coins"}', '{"es":"El equipo de To''Latino ajustó tus monedas: {delta}. Motivo: {motivo}","en":"The To''Latino team adjusted your coins: {delta}. Reason: {motivo}"}'),
  ('gam_cupon_usado', 'tx', null, false, '{"es":"Usaste tu cupón","en":"You used your coupon"}', '{"es":"{negocio} validó tu código {codigo}: «{cupon}».","en":"{negocio} validated your code {codigo}: «{cupon}»."}'),
  ('biz_cupon_ok', 'biz', null, false, '{"es":"Tu cupón ya está en la Comunidad","en":"Your coupon is live in the Community"}', '{"es":"«{cupon}» cuesta {costo} monedas. Los vecinos ya lo pueden canjear; valida su código en tu panel.","en":"«{cupon}» costs {costo} coins. Neighbors can redeem it now; validate their code in your dashboard."}'),
  ('biz_cupon_no', 'biz', null, false, '{"es":"Tu cupón no salió","en":"Your coupon was not approved"}', '{"es":"«{cupon}» no se publicó. Motivo: {motivo}","en":"«{cupon}» was not published. Reason: {motivo}"}'),
  ('biz_cupon_pausa', 'biz', null, false, '{"es":"To''Latino pausó tu cupón","en":"To''Latino paused your coupon"}', '{"es":"«{cupon}» ya no sale en la Comunidad. Motivo: {motivo}. Los códigos ya canjeados siguen valiendo.","en":"«{cupon}» no longer shows in the Community. Reason: {motivo}. Codes already redeemed stay valid."}'),
  ('biz_cupon_canje', 'biz', null, false, '{"es":"Un vecino canjeó tu cupón","en":"A neighbor redeemed your coupon"}', '{"es":"Canjearon «{cupon}». Te mostrará su código en el local: valídalo en tu panel.","en":"Someone redeemed «{cupon}». They will show their code in store: validate it in your dashboard."}')
on conflict (key) do nothing;

commit;
