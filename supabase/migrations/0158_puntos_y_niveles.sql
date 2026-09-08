-- 0158_puntos_y_niveles.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- GAMIFICACIÓN: los puntos y los cinco niveles.
-- ════════════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE: el sistema de diseño nuevo («Sistema To'Latino», 2026-08-20)
-- ya trae la gamificación especificada — cinco niveles Vecino → Guía →
-- Conector → Voz del barrio → Leyenda, y puntos que premian «utilidad, no
-- volumen»: recomendación +150, mejor respuesta +50, foto verificada +40.
--
-- DECISIÓN DEL FUNDADOR (2026-09-08) QUE **CONTRADICE** EL HANDOFF, a propósito:
-- el handoff dice que los puntos «se canjean en la billetera contra descuentos
-- de negocios verificados y boletos». **Aquí NO.** Los puntos sirven solo para
-- el nivel y el ranking; no se cambian por dinero, ni por descuentos, ni se
-- puede apostar con ellos. Queda escrito para que ninguna sesión futura lo
-- «arregle» de vuelta.
--
-- Y no es solo una decisión de producto: es de seguridad. Unos puntos que se
-- convierten en valor real SON dinero, y dos cuentas jugando entre ellas
-- estarían imprimiendo cupones. Es la misma clase de fallo que aquel en que un
-- comprador podía ponerle el precio a su propio pedido.
--
-- ── LAS DOS REGLAS QUE SOSTIENEN ESTO ───────────────────────────────────────
--
-- 1. **El cliente NUNCA otorga puntos.** No hay ninguna función que el
--    navegador pueda llamar para sumarse puntos. Se otorgan con DISPARADORES
--    sobre las acciones reales: si no existe la recomendación en la base, no
--    existen sus puntos. No hay forma de tener lo segundo sin lo primero.
--
-- 2. **Un movimiento por acción, para siempre.** La clave única
--    (usuario, motivo, referencia) impide cobrar dos veces por lo mismo. Y al
--    deshacer una acción NO se borra el movimiento: se pone a cero y se marca
--    revocado. Si se borrara, bastaría con recomendar → quitar → recomendar
--    para imprimir puntos. Guardando la fila, el segundo intento choca con la
--    clave única y no paga.

-- ── 1 · la escalera ─────────────────────────────────────────────────────────
-- En tabla y no en un `case`, para poder ajustar los umbrales sin migración: el
-- primer mes de datos reales va a decir que estos números están mal.
create table if not exists public.niveles (
  orden      smallint primary key,
  clave      text not null unique,
  es         text not null,
  en         text not null,
  desde      integer not null unique  -- puntos mínimos para estar en este nivel
);

insert into public.niveles (orden, clave, es, en, desde) values
  (1, 'vecino',   'Vecino',         'Neighbor',        0),
  (2, 'guia',     'Guía',           'Guide',         500),
  (3, 'conector', 'Conector',       'Connector',    2000),
  (4, 'voz',      'Voz del barrio', 'Local voice',  6000),
  (5, 'leyenda',  'Leyenda',        'Legend',      15000)
on conflict (orden) do update
  set clave = excluded.clave, es = excluded.es, en = excluded.en, desde = excluded.desde;

-- ── 2 · cuánto vale cada cosa ───────────────────────────────────────────────
-- También en tabla: el día que se añadan los juegos, es una fila más, no una
-- migración que toque disparadores.
create table if not exists public.puntos_tarifa (
  motivo text primary key,
  puntos integer not null check (puntos > 0),
  es     text not null,
  en     text not null
);

insert into public.puntos_tarifa (motivo, puntos, es, en) values
  ('recomendacion', 150, 'Recomendaste un negocio',      'You recommended a business'),
  ('resena',         50, 'Escribiste una reseña',        'You wrote a review'),
  ('resena_foto',    40, 'Tu reseña llevaba foto',       'Your review had a photo')
on conflict (motivo) do update
  set puntos = excluded.puntos, es = excluded.es, en = excluded.en;

-- ── 3 · el libro mayor ──────────────────────────────────────────────────────
create table if not exists public.puntos_movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  motivo      text not null references public.puntos_tarifa(motivo),
  referencia  uuid not null,            -- la fila que lo causó
  puntos      integer not null,
  revocado_at timestamptz,              -- se deshizo la acción: vale 0, pero la fila SE QUEDA
  created_at  timestamptz not null default now(),
  -- LA CLAVE DE TODO: una acción paga UNA vez, aunque se deshaga y se rehaga.
  constraint puntos_movimientos_unicos unique (user_id, motivo, referencia)
);

-- El ranking ordena por puntos dentro de una ciudad; el historial es por
-- usuario y fecha.
create index if not exists puntos_movimientos_usuario_idx
  on public.puntos_movimientos (user_id, created_at desc);

-- ── 4 · el total, materializado ─────────────────────────────────────────────
-- Se guarda sumado en el perfil en vez de calcularlo al leer: con 1M de
-- usuarios, un `sum()` por cada vez que se pinta un nombre no se sostiene.
alter table public.profiles add column if not exists puntos integer not null default 0;

-- El ranking de una ciudad, ordenado por puntos. Sin este índice, el listado
-- del barrio recorre la tabla entera.
create index if not exists profiles_ranking_idx
  on public.profiles (city_label, puntos desc)
  where puntos > 0;

create or replace function public.puntos_actualizar_total()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.profiles p
     set puntos = greatest(0, p.puntos
                   + coalesce(new.puntos, 0) - coalesce(old.puntos, 0))
   where p.id = coalesce(new.user_id, old.user_id);
  return null;
end $$;

drop trigger if exists puntos_total on public.puntos_movimientos;
create trigger puntos_total
  after insert or update of puntos or delete on public.puntos_movimientos
  for each row execute function public.puntos_actualizar_total();

-- ── 5 · quién otorga: los disparadores sobre las acciones reales ────────────
-- `security definer` porque escriben en el libro mayor, donde nadie más puede.

/** Suma (o revoca) puntos por una acción. Interna: no la puede llamar nadie
 *  desde fuera. `revocar` no borra la fila — la pone a cero — para que la clave
 *  única siga impidiendo volver a cobrar por lo mismo. */
create or replace function public.puntos_otorgar(
  in_user uuid, in_motivo text, in_ref uuid, in_revocar boolean default false
) returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v integer;
begin
  if in_user is null or in_ref is null then return; end if;

  if in_revocar then
    update public.puntos_movimientos
       set puntos = 0, revocado_at = now()
     where user_id = in_user and motivo = in_motivo and referencia = in_ref
       and revocado_at is null;
    return;
  end if;

  select puntos into v from public.puntos_tarifa where motivo = in_motivo;
  if v is null then return; end if;

  -- Si ya existía y estaba revocada, se REVIVE en vez de crear otra fila. Así
  -- «recomiendo este negocio» ocupa UNA fila para siempre, por muchas veces que
  -- se ponga y se quite — y el total nunca pasa de lo que vale una vez.
  insert into public.puntos_movimientos (user_id, motivo, referencia, puntos)
  values (in_user, in_motivo, in_ref, v)
  on conflict on constraint puntos_movimientos_unicos do update
    set puntos = v, revocado_at = null;
end $$;

-- Recomendar un negocio.
create or replace function public.puntos_por_recomendacion()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    perform public.puntos_otorgar(new.user_id, 'recomendacion', new.business_id, false);
  else
    perform public.puntos_otorgar(old.user_id, 'recomendacion', old.business_id, true);
  end if;
  return null;
end $$;

drop trigger if exists puntos_recomendacion on public.business_endorsements;
create trigger puntos_recomendacion
  after insert or delete on public.business_endorsements
  for each row execute function public.puntos_por_recomendacion();

-- Escribir una reseña, y el extra si lleva foto.
create or replace function public.puntos_por_resena()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  u uuid := coalesce(new.user_id, old.user_id);
  r uuid := coalesce(new.id, old.id);
  con_foto boolean;
begin
  if tg_op = 'DELETE' then
    perform public.puntos_otorgar(u, 'resena', r, true);
    perform public.puntos_otorgar(u, 'resena_foto', r, true);
    return null;
  end if;

  -- Oculta por moderación = no paga. Y si ya había pagado, se revoca: no se
  -- premia lo que se tuvo que esconder.
  if coalesce(new.hidden, false) then
    perform public.puntos_otorgar(u, 'resena', r, true);
    perform public.puntos_otorgar(u, 'resena_foto', r, true);
    return null;
  end if;

  perform public.puntos_otorgar(u, 'resena', r, false);

  -- `photos` puede ser arreglo o jsonb según la versión; se comprueba por texto
  -- para no depender del tipo.
  con_foto := new.photos is not null
              and btrim(new.photos::text) not in ('', '[]', '{}', 'null');
  if con_foto then
    perform public.puntos_otorgar(u, 'resena_foto', r, false);
  end if;
  return null;
end $$;

drop trigger if exists puntos_resena on public.reviews;
create trigger puntos_resena
  after insert or update or delete on public.reviews
  for each row execute function public.puntos_por_resena();

-- ── 6 · lo que la app lee ───────────────────────────────────────────────────

/** Mi progreso: puntos, nivel actual, siguiente y cuánto falta. */
create or replace function public.mi_progreso()
returns table (
  puntos integer, nivel_orden smallint, nivel_es text, nivel_en text,
  siguiente_es text, siguiente_en text, siguiente_desde integer, faltan integer
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with yo as (select coalesce(p.puntos, 0) as pts from public.profiles p where p.id = auth.uid()),
  actual as (
    select n.* from public.niveles n, yo where n.desde <= yo.pts order by n.desde desc limit 1
  ),
  sig as (
    select n.* from public.niveles n, yo where n.desde > yo.pts order by n.desde asc limit 1
  )
  select yo.pts, actual.orden, actual.es, actual.en,
         sig.es, sig.en, sig.desde,
         case when sig.desde is null then 0 else sig.desde - yo.pts end
    from yo left join actual on true left join sig on true;
$$;

/** El ranking de una ciudad. Público: los nombres y los puntos se ven, nada
 *  más — ni correo, ni ubicación exacta. */
create or replace function public.ranking_barrio(in_ciudad text, in_limite integer default 20)
returns table (
  posicion bigint, user_id uuid, nombre text, iniciales text, color text,
  puntos integer, nivel_es text, nivel_en text, soy_yo boolean
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select row_number() over (order by p.puntos desc, p.id) as posicion,
         p.id, p.display_name, p.initials, p.avatar_color, p.puntos,
         n.es, n.en,
         p.id = auth.uid()
    from public.profiles p
    left join lateral (
      select x.es, x.en from public.niveles x where x.desde <= p.puntos
      order by x.desde desc limit 1
    ) n on true
   where p.city_label = in_ciudad and p.puntos > 0
   order by p.puntos desc, p.id
   limit least(coalesce(in_limite, 20), 100);
$$;

/** Mi historial de puntos, para «cómo los gané». */
create or replace function public.mis_puntos(in_limite integer default 30)
returns table (motivo text, puntos integer, es text, en text, cuando timestamptz)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select m.motivo, m.puntos, t.es, t.en, m.created_at
    from public.puntos_movimientos m
    join public.puntos_tarifa t on t.motivo = m.motivo
   where m.user_id = auth.uid() and m.revocado_at is null
   order by m.created_at desc
   limit least(coalesce(in_limite, 30), 100);
$$;

-- ── 7 · permisos: nadie escribe, todos leen lo suyo ─────────────────────────
alter table public.niveles            enable row level security;
alter table public.puntos_tarifa      enable row level security;
alter table public.puntos_movimientos enable row level security;

drop policy if exists niveles_lectura on public.niveles;
create policy niveles_lectura on public.niveles for select to anon, authenticated using (true);

drop policy if exists tarifa_lectura on public.puntos_tarifa;
create policy tarifa_lectura on public.puntos_tarifa for select to anon, authenticated using (true);

-- El libro mayor: cada quien ve SOLO el suyo. Y nadie inserta, actualiza ni
-- borra — solo los disparadores, que corren como dueños.
drop policy if exists movimientos_lectura on public.puntos_movimientos;
create policy movimientos_lectura on public.puntos_movimientos
  for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.puntos_movimientos from anon, authenticated;
revoke insert, update, delete on public.niveles, public.puntos_tarifa from anon, authenticated;

-- La función interna no se expone.
revoke all on function public.puntos_otorgar(uuid, text, uuid, boolean) from public, anon, authenticated;

grant execute on function public.mi_progreso()                     to authenticated;
grant execute on function public.ranking_barrio(text, integer)     to anon, authenticated;
grant execute on function public.mis_puntos(integer)               to authenticated;

-- ── 8 · poner al día a quien ya actuó antes de existir esto ─────────────────
-- Primero se retiran los movimientos de recomendación con el formato ANTERIOR
-- (la referencia era la fila, no el negocio). Solo afecta a una aplicación
-- previa de esta misma migración; en una base nueva no encuentra nada.
delete from public.puntos_movimientos m
 where m.motivo = 'recomendacion'
   and not exists (select 1 from public.businesses b where b.id = m.referencia);
-- Sin esto, quien ya recomendó o reseñó empezaría en cero y parecería que la
-- app no cuenta lo que hizo.
insert into public.puntos_movimientos (user_id, motivo, referencia, puntos)
select e.user_id, 'recomendacion', e.business_id, t.puntos
  from (select distinct user_id, business_id from public.business_endorsements
         where user_id is not null) e, public.puntos_tarifa t
 where t.motivo = 'recomendacion'
on conflict on constraint puntos_movimientos_unicos do nothing;

insert into public.puntos_movimientos (user_id, motivo, referencia, puntos)
select r.id_user, 'resena', r.id_row, t.puntos
  from (select user_id as id_user, id as id_row, photos, hidden from public.reviews) r,
       public.puntos_tarifa t
 where t.motivo = 'resena' and r.id_user is not null and not coalesce(r.hidden, false)
on conflict on constraint puntos_movimientos_unicos do nothing;

insert into public.puntos_movimientos (user_id, motivo, referencia, puntos)
select r.id_user, 'resena_foto', r.id_row, t.puntos
  from (select user_id as id_user, id as id_row, photos, hidden from public.reviews) r,
       public.puntos_tarifa t
 where t.motivo = 'resena_foto' and r.id_user is not null and not coalesce(r.hidden, false)
   and r.photos is not null and btrim(r.photos::text) not in ('', '[]', '{}', 'null')
on conflict on constraint puntos_movimientos_unicos do nothing;

-- ── 9 · comprobación ────────────────────────────────────────────────────────
do $$
declare
  desc_total integer;
  suma_libro integer;
begin
  select coalesce(sum(puntos), 0) into desc_total from public.profiles;
  select coalesce(sum(puntos), 0) into suma_libro from public.puntos_movimientos;
  if desc_total <> suma_libro then
    raise exception 'El total de los perfiles (%) no cuadra con el libro mayor (%). El disparador no está sumando bien.', desc_total, suma_libro;
  end if;
  raise notice 'Puntos al día: % en el libro mayor, % repartidos en los perfiles.', suma_libro, desc_total;
end $$;

notify pgrst, 'reload schema';
