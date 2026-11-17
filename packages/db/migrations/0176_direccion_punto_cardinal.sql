-- 0176 · Direcciones: la calle sin su punto cardinal (LAUNCH 9b «Cargas reales», CI Direcciones 17 nov).
-- Lo que pasó: desde 0143, dir_resolver busca SOLO el nombre exacto de la calle en ese código postal. «435 Hamilton St, 18101» (el Ayuntamiento
-- de Allentown) existe en el Censo como «W Hamilton St» (401-441); «Hamilton St» también existe allí, pero en otra cuadra (300-398), así que la
-- dirección salía como «calle» (sin número) a 2 km. Como DoorDash y Google: si la persona NO escribió el punto cardinal (N, S, E, W), también
-- vale la misma calle con uno, cuando su número cae en el tramo; si lo escribió, se respeta (N Wyoming nunca pasa a S Wyoming). Con varias
-- iguales, gana el nombre tal cual y después el tramo más cercano. Lo demás (la casa, la paridad, la calle sin ese número) no cambia.
create or replace function dir_resolver(calle text, cp text)
returns table (lat double precision, lng double precision, calidad text, nombre text, zip text, lugar text, estado text, numero text)
language plpgsql stable parallel safe as $$
#variable_conflict use_column
declare pa record; s text; g record; v text[];
begin
  select * into pa from dir_partes(calle);
  if pa.num_i is null or coalesce(pa.calle, '') = '' or cp !~ '^\d{5}$' then return; end if;
  -- La calle tal cual en ese código postal, o la más parecida (≥ 0.5) de ese código postal.
  select n.norm into s from geo_names n where n.zip = cp and n.norm = pa.calle limit 1;
  if s is null then select n.norm into s from geo_names n where n.zip = cp and similarity(n.norm, pa.calle) >= 0.5 order by similarity(n.norm, pa.calle) desc, n.n desc limit 1; end if;
  s := coalesce(s, pa.calle);
  -- Las variantes con punto cardinal, solo si la persona no escribió uno (al principio o al final).
  -- (de lo que ESCRIBIÓ: si escribió «Wyoming St», valen N y S Wyoming aunque el nombre parecido elegido arriba sea uno de los dos).
  v := array[s];
  if pa.calle !~ '^(n|s|e|w|ne|nw|se|sw)\s' and pa.calle !~ '\s(n|s|e|w|ne|nw|se|sw)$' then
    v := v || array[pa.calle, 'n ' || pa.calle, 's ' || pa.calle, 'e ' || pa.calle, 'w ' || pa.calle, pa.calle || ' n', pa.calle || ' s', pa.calle || ' e', pa.calle || ' w'];
  end if;
  -- 1) la casa
  for g in select p.* from geo_points p where p.norm = any(v) and p.zip = cp and p.num_i = pa.num_i
           order by (p.norm = s) desc, (p.num = pa.num) desc, p.unit nulls first limit 1 loop
    -- El nombre como se escribe más en ese código postal (muchas fuentes de puntos lo traen EN MAYÚSCULAS).
    lat := st_y(g.geom); lng := st_x(g.geom); calidad := 'punto'; zip := cp; numero := g.num;
    nombre := coalesce((select n.name from geo_names n where n.norm = g.norm and n.zip = cp), g.street);
    lugar := coalesce(g.place, (select z.place from geo_zips z where z.zip = cp)); estado := g.state; return next; return;
  end loop;
  -- 2) el tramo con ese número (del lado con la misma paridad), y si no, 3) la calle con el número más cercano (el nombre tal cual primero)
  for g in
    with cand as (
      select t.*, case when t.l_from is not null and pa.num_i between least(t.l_from, t.l_to) and greatest(t.l_from, t.l_to) and coalesce(t.zip_l, cp) = cp then 'l'
                       when t.r_from is not null and pa.num_i between least(t.r_from, t.r_to) and greatest(t.r_from, t.r_to) and coalesce(t.zip_r, cp) = cp then 'r' end as lado,
             least(abs(pa.num_i - coalesce(t.l_from, -99999999)), abs(pa.num_i - coalesce(t.l_to, -99999999)), abs(pa.num_i - coalesce(t.r_from, -99999999)), abs(pa.num_i - coalesce(t.r_to, -99999999))) as lejos
        from geo_streets t where t.norm = any(v) and (t.zip_l = cp or t.zip_r = cp)
    )
    select c.*, case c.lado when 'l' then case when c.l_to = c.l_from then 0.5 else (pa.num_i - c.l_from)::float8 / (c.l_to - c.l_from) end
                            when 'r' then case when c.r_to = c.r_from then 0.5 else (pa.num_i - c.r_from)::float8 / (c.r_to - c.r_from) end else 0.5 end as f
      from cand c
     -- Sin tramo con el número, la calle sin ese número es SOLO la que escribió (no una variante con punto cardinal).
     where c.lado is not null or c.norm = s
     order by (c.lado is not null) desc, (c.norm = s) desc, (case c.lado when 'l' then (c.l_from % 2) = (pa.num_i % 2) when 'r' then (c.r_from % 2) = (pa.num_i % 2) else false end) desc, c.lejos
     limit 1
  loop
    lat := st_y(st_lineinterpolatepoint(g.geom, greatest(0, least(1, g.f)))); lng := st_x(st_lineinterpolatepoint(g.geom, greatest(0, least(1, g.f))));
    calidad := case when g.lado is null then 'calle' else 'numero' end; nombre := g.name; zip := cp; numero := pa.num;
    lugar := coalesce(g.place, (select z.place from geo_zips z where z.zip = cp)); estado := coalesce(g.state, (select z.state from geo_zips z where z.zip = cp));
    return next; return;
  end loop;
end $$;
