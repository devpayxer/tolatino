-- 0195 · Fotos a la medida (decisión AI, 20 nov; docs/diseno/plan/fotos-a-la-medida.md, F1). Cada foto pública (n/<uuid>.jpg, la maestra JPEG que
-- no cambia) tiene variantes WebP con nombre fijo (n/<uuid>.w<ancho>.webp; apps/web/lib/fotos-variantes.ts). Pintar una foto nunca consulta la
-- base (el nombre se arma solo); aquí solo se anota, por foto, si sus variantes existen y cuánto pesan, para el barrido que convierte las de
-- antes y para las cifras del Super Admin. Lo escribe SOLO el servidor (la subida y el barrido); nadie lo edita a mano. Solo se agregan columnas
-- (expandir; nada se quita ni se renombra).
--   bytes       el peso de la maestra (null: una foto de antes de esto, o de afuera)
--   var_widths  los anchos generados, de menor a mayor (null: pendiente; '{}': no se pudo — la maestra ya no está o no se puede leer)
--   var_bytes   el peso de cada variante, en el mismo orden que var_widths (el ahorro de una caja de 640 px se calcula con el de su ancho)
--   var_at      cuándo se anotó (null: pendiente)
alter table media add column if not exists bytes integer;
alter table media add column if not exists var_widths smallint[];
alter table media add column if not exists var_bytes integer[];
alter table media add column if not exists var_at timestamptz;

-- Lo anotado es coherente: pendiente = las tres en null; hecho = un peso por ancho, hasta 4 anchos (los fijos, o los que caben más el de la
-- maestra), entre 1 y 1600 (nunca más que la maestra reducida). Las cifras del Super Admin suman por posición contando con ese tope.
-- «not valid» y después «validate»: con un millón de fotos no se bloquea la tabla mientras se revisa lo que ya estaba (todo null).
alter table media drop constraint if exists media_variantes_coherentes;
alter table media add constraint media_variantes_coherentes check (
  (bytes is null or bytes >= 0)
  and (var_widths is null) = (var_at is null)
  and (var_bytes is null) = (var_at is null)
  and (var_widths is null or (cardinality(var_widths) = cardinality(var_bytes) and cardinality(var_widths) <= 4 and 1 <= all (var_widths) and 1600 >= all (var_widths) and 0 <= all (var_bytes)))
) not valid;
alter table media validate constraint media_variantes_coherentes;

-- El barrido (fotosVariantes) busca la tanda de fotos públicas de nuestro almacén sin variantes por aquí, la más vieja primero, sin recorrer todas
-- las fotos: el índice solo tiene las pendientes (en régimen, casi ninguna). La consulta repite este mismo predicado (guardián fotosConVariantes).
create index if not exists media_variantes_pendientes_idx on media (created_at)
  where var_at is null and status = 'visible' and purged_at is null and url like '/medios/n/%.jpg';
