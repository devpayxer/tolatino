-- 0146_el_tipo_tambien_se_busca.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: probando 0145 en PRODUCCIÓN con un vehículo limpio —una Toyota
-- Tacoma, `vtype = 'pickup'`— resultó que «camioneta» devolvía CERO. En la base
-- de pruebas daba 3, así que allí parecía arreglado. La diferencia: los
-- vehículos sembrados mencionan «camioneta» en su descripción, y el de
-- producción no. Lo que se estaba midiendo era la descripción, no el tipo.
--
-- LA CAUSA es la misma que la causa #2 de 0144, que arreglé para Negocios y NO
-- barrí aquí: **el TIPO no entra en el índice**. Se indexaban
--     vehicles   → make, model, year, color_es, city, desc_es
--     properties → title, address, hood, city, desc_es
-- y quedaban fuera `vtype` (pickup, sedan, suv, minivan) y `ptype` (casa,
-- cuarto, departamento, condo, local, oficina, townhouse). Así que un `pickup`
-- solo aparecía si alguien había escrito «camioneta» a mano en el texto libre.
--
-- Se arregla en el índice —el tipo pasa a ser buscable— y con los sinónimos que
-- traducen del castellano de la calle al valor guardado: nadie escribe
-- «pickup», escribe «camioneta» o «troca».

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · El tipo entra al índice
-- ════════════════════════════════════════════════════════════════════════════
-- `search_tsv` es una columna GENERADA, así que cambiar su fórmula obliga a
-- rehacerla. Se tira el índice antes y se rehace después: con la columna caída
-- el índice no puede existir.
drop index if exists public.vehicles_fts_idx;
alter table public.vehicles drop column if exists search_tsv;
alter table public.vehicles add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish',
      coalesce(make, '')     || ' ' || coalesce(model, '')    || ' ' ||
      coalesce(year::text,'')|| ' ' || coalesce(color_es, '') || ' ' ||
      coalesce(city, '')     || ' ' || coalesce(desc_es, '')  || ' ' ||
      coalesce(vtype, ''))
  ) stored;
create index vehicles_fts_idx on public.vehicles using gin (search_tsv);

drop index if exists public.properties_fts_idx;
alter table public.properties drop column if exists search_tsv;
alter table public.properties add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish',
      coalesce(title, '')  || ' ' || coalesce(address, '') || ' ' ||
      coalesce(hood, '')   || ' ' || coalesce(city, '')    || ' ' ||
      coalesce(desc_es,'') || ' ' || coalesce(ptype, ''))
  ) stored;
create index properties_fts_idx on public.properties using gin (search_tsv);

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Del castellano de la calle al valor guardado
-- ════════════════════════════════════════════════════════════════════════════
-- Indexar el tipo no basta: los de vehículos están en inglés (`pickup`, `suv`)
-- y nadie los teclea así. Estas filas hacen la traducción — y como desde 0145
-- los sinónimos van en los dos sentidos, con UNA fila basta: «camioneta»
-- encuentra las pickups y «pickup» encuentra las camionetas.
insert into public.search_synonyms (term, expands_to, note) values
  ('camioneta',   array['pickup','troca','van','suv'], 'vtype está en inglés'),
  ('pickup',      array['camioneta','troca'], null),
  ('suv',         array['camioneta','vagoneta','todoterreno'], null),
  ('van',         array['minivan','camioneta','vagoneta'], null),
  ('carro',       array['sedan','auto','coche','vehiculo'], null),
  ('coche',       array['sedan','carro','auto'], null),
  ('sedan',       array['carro','coche','auto'], null),
  -- Vivienda: `ptype` ya está en castellano, pero la gente usa otras palabras.
  ('departamento',array['apartamento','depa','condo'], null),
  ('apartamento', array['departamento','depa','condo'], null),
  ('condo',       array['departamento','apartamento','condominio'], null),
  ('habitacion',  array['cuarto','recamara','room'], null),
  ('recamara',    array['cuarto','habitacion'], 'MX'),
  ('local',       array['local comercial','oficina','negocio'], null)
on conflict (term) do update
  set expands_to = excluded.expands_to,
      note = excluded.note,
      updated_at = now();

notify pgrst, 'reload schema';
