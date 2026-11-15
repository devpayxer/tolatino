-- 9n · La Puerta busca por nombre con un índice (LAUNCH «6g · Velocidad con la base de carga»): con 50 mil boletos en una fecha la búsqueda
-- por nombre recorría todos (p95 131–160 ms; presupuesto 150) porque el nombre está en dos tablas (el del boleto y el de la cuenta). Ahora
-- cada boleto lleva su nombre de puerta derivado (sin acentos, en minúsculas: cortesía, titular y la cuenta), lo mantiene la base (al crear o
-- cambiar el boleto y cuando la persona cambia su nombre) y tiene un índice de trigramas. Derivado: nunca se escribe a mano.
begin;

alter table tickets add column if not exists door_name text;

create or replace function ticket_nombre_puerta(comp text, holder text, uid uuid) returns text language sql stable as $$
  select tl_unaccent(lower(coalesce(comp, '') || ' ' || coalesce(holder, '') || ' ' ||
         coalesce((select coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '') from users u where u.id = uid), '')))
$$;

create or replace function tickets_zz_nombre() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.comp_name is distinct from old.comp_name or new.holder_name is distinct from old.holder_name
     or new.holder_user_id is distinct from old.holder_user_id or new.door_name is distinct from old.door_name then
    new.door_name := ticket_nombre_puerta(new.comp_name, new.holder_name, new.holder_user_id);
  end if;
  return new;
end $$;
drop trigger if exists tickets_zz_nombre on tickets;
create trigger tickets_zz_nombre before insert or update on tickets for each row execute function tickets_zz_nombre();

create or replace function users_nombre_puerta() returns trigger language plpgsql as $$
begin
  update tickets set door_name = ticket_nombre_puerta(comp_name, holder_name, holder_user_id) where holder_user_id = new.id;
  return null;
end $$;
drop trigger if exists users_nombre_puerta on users;
create trigger users_nombre_puerta after update of first_name, last_name on users for each row
  when (old.first_name is distinct from new.first_name or old.last_name is distinct from new.last_name) execute function users_nombre_puerta();

update tickets set door_name = ticket_nombre_puerta(comp_name, holder_name, holder_user_id) where door_name is null;

create index if not exists tickets_door_name_trgm on tickets using gin (door_name gin_trgm_ops);

commit;
