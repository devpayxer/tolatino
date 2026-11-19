-- 0193 · 9t (19 nov) · Platos guardados (decisión del fundador del 19 nov sobre la propuesta de REVISION «Guardar un plato»: el cuadro del corazón de
-- la barra de la vacante, a la izquierda del contador en la hoja del plato; LAUNCH «Platos guardados»). La persona guarda un plato del menú de un
-- restaurante (lib/platos-guardados.ts guardarPlato) y lo tiene en Mi cuenta › Guardados › «Platos y productos» (diseño favV), con «Pedir» que abre
-- el negocio en su menú; si el plato ya no sale en su página (quitado, oculto por To'Latino, el menú pausado, el negocio no activo) la fila dice
-- «No disponible» y no ofrece «Pedir».
-- Lo que pone la base:
-- · item_saves: una fila por vez que se guarda. Nada se borra: quitar de guardados pone removed_at (la fila queda); volver a guardar crea una fila
--   nueva. Una sola fila viva por persona y plato (índice único parcial). city_id = la ciudad del negocio del plato (escala por ciudad).
-- · El disparador: no se borra (salvo la purga de una cuenta borrada a los 30 días, lib/datos/purgar.ts con tl.purga = 'si'; mapa de datos:
--   item_saves.user_id → borrar), el plato, la ciudad y la fecha no cambian, y una fila quitada no vuelve (se guarda de nuevo con otra fila).
--   La persona solo cambia al fusionar dos cuentas (lib/datos/fusionar.ts, mapa: fusion = mover).
-- Idempotente: se puede aplicar dos veces.
begin;

create table if not exists item_saves (
  id         bigserial primary key,
  user_id    uuid not null references users (id),
  item_id    bigint not null references items (id),
  city_id    text not null references cities (id),           -- la del negocio del plato
  created_at timestamptz not null default now(),
  removed_at timestamptz                                     -- quitó el plato de guardados (la fila queda)
);
create unique index if not exists item_saves_viva on item_saves (user_id, item_id) where removed_at is null;
create index if not exists item_saves_usuario on item_saves (user_id, created_at desc) where removed_at is null;
create index if not exists item_saves_ciudad on item_saves (city_id, created_at desc);

create or replace function item_saves_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
    raise exception 'item_saves no se borra: quitar de guardados pone removed_at';
  end if;
  if new.item_id <> old.item_id or new.city_id <> old.city_id or new.created_at <> old.created_at then
    raise exception 'item_saves: el plato, la ciudad y la fecha no cambian';
  end if;
  if old.removed_at is not null and new.removed_at is distinct from old.removed_at then
    raise exception 'item_saves: un plato quitado no vuelve (se guarda de nuevo con otra fila)';
  end if;
  return new;
end $$;
drop trigger if exists item_saves_antes on item_saves;
create trigger item_saves_antes before update or delete on item_saves for each row execute function item_saves_antes();

commit;
