-- 0205 · Lo que halló cada consulta a la pasarela, con su detalle (9t6, 21 nov; LAUNCH «lo que quedó de 9t6» (4)). Idempotente. Nada se borra; la tabla
-- sigue siendo solo de inserción (gateway_checks_no_cambia, de 0203, no se toca: la columna nueva entra con la fila y nunca cambia).
--
-- Antes, de una consulta con varios hallados quedaban solo los ids unidos por coma (stripe_id): la hoja «Elegir cuál vale» del Super Admin ofrecía ids
-- pelados (sin monto ni fecha) y la persona tenía que irse a Stripe a ver cuál fue el primero y de cuánto era cada uno. Ahora la consulta guarda, de lo que
-- halló, cada objeto con su estado, su monto y cuándo se creó en Stripe. SOLO para mostrar: la decisión del equipo (lib/revision-pasarela.ts ›
-- decidirRevision) vuelve a preguntar a la pasarela y decide con ESA respuesta, nunca con este detalle.
--   found: null (la pasarela no contestó, o una consulta anterior a 0205) · [] (no halló nada) · [{id, estado, centavos, creado}] (hasta 20, en orden de
--   creación). found_n sigue diciendo cuántos halló en total.
begin;

alter table gateway_checks add column if not exists found jsonb;

-- La forma de cada hallado: un objeto con un id de Stripe, un estado conocido, un monto entero no negativo y, si se sabe, cuándo se creó (ISO en UTC).
create or replace function gateway_checks_found_ok(f jsonb) returns boolean language plpgsql immutable as $$
declare e jsonb;
begin
  if f is null then return true; end if;
  if jsonb_typeof(f) <> 'array' or jsonb_array_length(f) > 20 or octet_length(f::text) > 8000 then return false; end if;
  for e in select * from jsonb_array_elements(f) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    if jsonb_typeof(e->'id') is distinct from 'string' or (e->>'id') !~ '^[a-z]{2,4}_[A-Za-z0-9_]{3,200}$' then return false; end if;
    if (e->>'estado') is null or (e->>'estado') not in ('hecho', 'fallido', 'en_curso') then return false; end if;
    if jsonb_typeof(e->'centavos') is distinct from 'number' or (e->>'centavos') !~ '^[0-9]{1,12}$' then return false; end if;
    if e ? 'creado' and jsonb_typeof(e->'creado') <> 'null'
       and (jsonb_typeof(e->'creado') <> 'string' or (e->>'creado') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$') then return false; end if;
    if (select count(*) from jsonb_object_keys(e) k where k not in ('id', 'estado', 'centavos', 'creado')) > 0 then return false; end if;
  end loop;
  return true;
end $$;

alter table gateway_checks drop constraint if exists gateway_checks_found_forma;
alter table gateway_checks add constraint gateway_checks_found_forma check (gateway_checks_found_ok(found));

commit;
