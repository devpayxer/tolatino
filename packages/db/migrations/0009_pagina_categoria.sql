-- 0009 · Página de categoría (APP-NEG-CAT): configuración por categoría y «abierto ahora» como función única.
begin;

-- Portada, buscador, filas de mosaicos («Por país», «Qué necesitas»…), capítulos «Qué se te antoja», banda y
-- filtros rápidos. La escribe la semilla repetible seeds/paginas.sql (sale del prototipo). Cada mosaico trae su
-- regla de coincidencia: {subs:[…]} · {tag} · {attr,value} · {cap_gte}. Cuando el Super Admin edite la página
-- (bloque 1i) sus cambios irán en page_admin, que la semilla nunca toca.
alter table categories add column if not exists page jsonb not null default '{}'::jsonb;
alter table categories add column if not exists page_admin jsonb not null default '{}'::jsonb;

-- Filtros por categoría: orden e ícono (los rápidos del prototipo llevan ícono). `active` lo controla el admin.
alter table filter_options add column if not exists sort smallint not null default 0;
alter table filter_options add column if not exists icon text;
create index if not exists filter_options_cat_idx on filter_options (category_id, active, sort);

-- ¿Está abierto el negocio a la hora local `t` de su ciudad? Incluye rangos que cruzan la medianoche
-- (p. ej. 20:00–02:00 sigue abierto a la 01:00 del día siguiente) y 24 horas (00:00–00:00).
create or replace function negocio_abierto(bid text, t timestamp) returns boolean language sql stable as $$
  select exists (
    select 1 from business_hours h, jsonb_array_elements(h.ranges) g
     where h.business_id = bid and h.module = '' and h.open
       and (
         (h.weekday = extract(dow from t)::int
           and (g->>0)::time <= t::time
           and ((g->>1)::time > t::time or (g->>1)::time <= (g->>0)::time))
         or
         (h.weekday = (extract(dow from t)::int + 6) % 7
           and (g->>1)::time <= (g->>0)::time and (g->>1)::time > '00:00'::time
           and t::time < (g->>1)::time)
       ))
$$;

commit;
