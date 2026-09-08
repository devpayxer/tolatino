-- 0159_lista_de_espera.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- LA LISTA DE ESPERA, QUE HASTA HOY NO GUARDABA NADA.
-- ════════════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE: al ir a añadir un «Avísame» para la sala de juegos se miró el
-- que ya existe en «Muy pronto» (Transporte, Bienes raíces, Dealer, Trabajos).
-- Pide el correo, enseña «¡Listo! Te avisamos cuando abra» … y **no guarda
-- nada**: `markWaitDone` solo cambia una variable en el navegador. El correo se
-- pierde al recargar la página.
--
-- O sea: cuatro pantallas llevan meses recogiendo interés que nadie está
-- recibiendo. Es exactamente lo que la regla #7 del proyecto prohíbe — un
-- estado falso presentado como terminado.
--
-- Se arregla en la RAÍZ y no solo para los juegos: una tabla y una función que
-- sirven a los cinco sitios. Si se hubiera añadido solo para la sala, habría
-- dos «Avísame» en la app, uno de verdad y otro de mentira.

create table if not exists public.lista_espera (
  id          uuid primary key default gen_random_uuid(),
  modulo      text not null,          -- 'juegos', 'transporte', 'realestate', 'autos', 'trabajos'
  email       text not null,
  user_id     uuid references auth.users(id) on delete set null,
  city_label  text,
  created_at  timestamptz not null default now()
);

comment on table public.lista_espera is
  'Quién pidió aviso de un módulo que aún no abre. Se escribe SOLO por '
  'apuntarme_lista(); nadie puede leerla desde el navegador (son correos de '
  'terceros). Ver migración 0159.';

-- Apuntarse dos veces al mismo módulo no crea dos filas: la segunda actualiza
-- la fecha. Sin esto, un botón pulsado tres veces son tres correos iguales en
-- la lista y el conteo de interés miente.
create unique index if not exists lista_espera_unica
  on public.lista_espera (modulo, lower(email));

create index if not exists lista_espera_modulo_idx
  on public.lista_espera (modulo, created_at desc);

/** Apuntarse. Es la ÚNICA puerta de escritura.
 *
 *  Valida el correo aquí y no solo en el navegador: el `type="email"` del
 *  formulario lo puede saltar cualquiera. */
create or replace function public.apuntarme_lista(in_modulo text, in_email text, in_ciudad text default null)
returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare correo text := lower(btrim(coalesce(in_email, '')));
begin
  if in_modulo is null or btrim(in_modulo) = '' then return false; end if;
  if length(correo) > 254 or correo !~ '^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$' then
    return false;
  end if;

  insert into public.lista_espera (modulo, email, user_id, city_label)
  values (btrim(in_modulo), correo, auth.uid(), nullif(btrim(coalesce(in_ciudad, '')), ''))
  on conflict (modulo, lower(email)) do update
    set created_at = now(),
        user_id    = coalesce(excluded.user_id, public.lista_espera.user_id),
        city_label = coalesce(excluded.city_label, public.lista_espera.city_label);
  return true;
end $$;

/** Cuánta gente espera cada módulo. Solo el número — nunca los correos — para
 *  poder enseñar «ya somos 34» sin exponer a nadie. */
create or replace function public.espera_conteo(in_modulo text)
returns integer
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select count(*)::integer from public.lista_espera where modulo = in_modulo;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────
-- La tabla guarda correos de terceros: NADIE la lee desde el navegador. Se
-- escribe solo por la función, que corre como dueña.
alter table public.lista_espera enable row level security;
revoke all on table public.lista_espera from anon, authenticated;

grant execute on function public.apuntarme_lista(text, text, text) to anon, authenticated;
grant execute on function public.espera_conteo(text)               to anon, authenticated;

-- ── Comprobación ────────────────────────────────────────────────────────────
do $$
declare ok boolean; mal boolean;
begin
  -- Un correo válido entra…
  select public.apuntarme_lista('__prueba__', 'Prueba@Ejemplo.com', 'Hazleton, PA') into ok;
  -- …y uno inválido no.
  select public.apuntarme_lista('__prueba__', 'esto-no-es-correo') into mal;
  if not ok then raise exception 'La función rechazó un correo válido.'; end if;
  if mal then raise exception 'La función aceptó un correo inválido — la validación del servidor no sirve.'; end if;
  if (select count(*) from public.lista_espera where modulo = '__prueba__') <> 1 then
    raise exception 'La prueba dejó un número de filas inesperado.';
  end if;
  delete from public.lista_espera where modulo = '__prueba__';
  raise notice 'Lista de espera lista: acepta correos válidos, rechaza los que no, y no duplica.';
end $$;

notify pgrst, 'reload schema';
