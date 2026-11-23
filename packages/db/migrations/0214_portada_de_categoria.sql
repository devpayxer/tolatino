-- 0214 · Portada de la página de una categoría desde el Super Admin (Catálogo, 23 nov; regla 8: nada existe sin su gestión en el Super Admin).
-- Hasta hoy la portada (hero) de /c/<categoría> salía solo de categories.page (la semilla, archivos propios de apps/web/public/paginas/) y
-- categories.page_admin existía sin que ningún código lo escribiera. Ahora un Admin sube una foto (la misma ruta de las fotos públicas, con su
-- revisión automática, decisión AJ), la pone de portada con motivo (app/admin/acciones-catalogo.ts catPortada: todo o nada, auditoría solo
-- inserción) y puede volver a la de fábrica (catPortadaFabrica). page_admin solo lleva la clave «hero»; la semilla no lo toca.
-- · media.owner_kind 'category' (owner_id = el id de la categoría): la foto puesta de portada es DE LA CATEGORÍA, no de quien la subió. Así una
--   misma foto no puede ser portada de dos categorías (al pasar a 'category' deja de ser 'user', que es lo que busca el adjuntar), y la purga de
--   la cuenta de quien la subió (datos/purgar.ts, owner_kind 'user') no se lleva una portada que la página pública está pintando. La foto que
--   se reemplaza o se devuelve a la de fábrica queda 'removed' con removed_reason 'replaced' (estados: nada se borra).
-- Candados: media es la tabla grande. Solo se AMPLÍA el check de owner_kind (un valor más: todo lo que ya cumplía el anterior cumple este), así
--   que se agrega «not valid» (se exige a las filas nuevas y a las que se actualicen; no recorre la tabla ni la deja bloqueada) y no se valida:
--   validar dentro de esta transacción retendría el candado exclusivo de media durante un recorrido entero. «set local lock_timeout» acota lo
--   que ESPERA para tomarlo (como 0211): si una consulta larga tiene media, falla a los 3 s, se deshace entera y el siguiente despliegue la reintenta.
-- Solo expande. Para deshacerla: devolver la portada de fábrica de cada categoría con foto del equipo, quitar categories_page_admin_portada_propia y volver a crear el check sin 'category'
-- (pruebas: aplicada → revertida → aplicada). Idempotente.
begin;
set local lock_timeout = '3s';

do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'media_owner_kind_check' and conrelid = 'media'::regclass;
  if d is null or position(quote_literal('category') in d) > 0 then return; end if;
  execute 'alter table media drop constraint media_owner_kind_check';
  execute 'alter table media add constraint media_owner_kind_check ' || replace(replace(d, ' NOT VALID', ''), 'ARRAY[', 'ARRAY[' || quote_literal('category') || '::text, ') || ' not valid';
end $$;

-- La portada puesta de una categoría se busca por (owner_kind, owner_id, status): ya la cubre media_owner_idx.

-- categories.page_admin solo puede llevar la clave «hero» y, si la lleva, una foto de NUESTRO almacén (/medios/n/<uuid>.jpg): nunca una dirección de
-- afuera (la CSP no la dejaría pintar y la regla de fotos propias lo prohíbe). La base lo impone aunque alguien escriba directo. categories son 17 filas:
-- el check se valida al momento (todas tienen page_admin = '{}', nada lo escribía).
alter table categories drop constraint if exists categories_page_admin_portada_propia;
alter table categories add constraint categories_page_admin_portada_propia check (
  jsonb_typeof(page_admin) = 'object' and (page_admin - 'hero') = '{}'::jsonb
  and (not (page_admin ? 'hero') or page_admin->>'hero' ~ '^/medios/n/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'));

commit;
