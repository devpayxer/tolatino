-- 9t · «Mi lugar» de la Tabla del Barrio sin contar a todos los de delante (LAUNCH «5f · Velocidad de la Tabla y del rango con 1 M»).
-- Con 580 mil vecinos con puntos en una ciudad, «mi lugar» contaba las entradas del índice por encima de quien mira: p95 86 ms (presupuesto 40).
-- Ahora la base mantiene, por ciudad, mes y pestaña, cuántos vecinos (no excluidos) tienen cada valor: «los de delante» es la suma de los valores
-- mayores (unos pocos miles de filas como mucho), y el empate se sigue contando en el índice de la Tabla (los del mismo valor antes en el orden).
-- Derivado: lo escribe solo el trigger de monthly_boards (que a su vez solo escribe el libro de puntos y tabla_*); a mano, no.

begin;

create table if not exists monthly_board_hist (
  city_id text not null references cities (id),
  month   date not null check (extract(day from month) = 1),
  col     text not null check (col in ('points', 'recs', 'answers')),
  v       integer not null check (v > 0),
  n       integer not null check (n >= 0),
  primary key (city_id, month, col, v)
);
comment on table monthly_board_hist is 'Derivado de monthly_boards: cuántos vecinos no excluidos tienen cada valor (por ciudad, mes y pestaña). Lo escribe solo el trigger monthly_boards_hist.';

-- Sumar o restar uno a un valor (un valor 0 o menos no está en la Tabla: no se guarda).
create or replace function monthly_board_hist_mover(p_city text, p_month date, p_col text, p_v integer, p_d integer) returns void language plpgsql as $$
begin
  if p_v is null or p_v <= 0 then return; end if;
  insert into monthly_board_hist (city_id, month, col, v, n) values (p_city, p_month, p_col, p_v, greatest(p_d, 0))
  on conflict (city_id, month, col, v) do update set n = greatest(monthly_board_hist.n + p_d, 0);
end $$;

create or replace function monthly_boards_hist() returns trigger language plpgsql as $$
declare
  ov int[]; nv int[]; cols text[] := array['points', 'recs', 'answers']; i int; mismo boolean;
begin
  -- Lo que contaba antes (si no estaba excluido) y lo que cuenta ahora.
  ov := case when tg_op in ('UPDATE', 'DELETE') and not old.excluded then array[old.points, old.recs, old.answers] else array[0, 0, 0] end;
  nv := case when tg_op in ('INSERT', 'UPDATE') and not new.excluded then array[new.points, new.recs, new.answers] else array[0, 0, 0] end;
  mismo := tg_op = 'UPDATE' and (old.city_id, old.month) is not distinct from (new.city_id, new.month);
  for i in 1..3 loop
    if mismo and ov[i] = nv[i] then continue; end if;
    if tg_op in ('UPDATE', 'DELETE') then perform monthly_board_hist_mover(old.city_id, old.month, cols[i], ov[i], -1); end if;
    if tg_op in ('INSERT', 'UPDATE') then perform monthly_board_hist_mover(new.city_id, new.month, cols[i], nv[i], 1); end if;
  end loop;
  return null;
end $$;

-- El primer llenado, con la Tabla quieta (nadie suma puntos mientras se cuenta).
lock table monthly_boards in share row exclusive mode;
drop trigger if exists monthly_board_hist_guardia on monthly_board_hist;
delete from monthly_board_hist;
insert into monthly_board_hist (city_id, month, col, v, n)
select city_id, month, c.col, c.v, count(*)::int
  from monthly_boards mb
  cross join lateral (values ('points', mb.points), ('recs', mb.recs), ('answers', mb.answers)) as c(col, v)
 where not mb.excluded and c.v > 0
 group by city_id, month, c.col, c.v;

drop trigger if exists monthly_boards_hist on monthly_boards;
create trigger monthly_boards_hist after insert or update or delete on monthly_boards for each row execute function monthly_boards_hist();

-- A mano no: solo desde el trigger de monthly_boards (profundidad de trigger 2 o más).
create or replace function monthly_board_hist_guardia() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() < 2 then raise exception 'monthly_board_hist es derivado: lo escribe solo la Tabla del Barrio'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger monthly_board_hist_guardia before insert or update or delete on monthly_board_hist for each row execute function monthly_board_hist_guardia();

commit;
