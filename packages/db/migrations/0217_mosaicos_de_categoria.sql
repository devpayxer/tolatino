-- 0217 · Mosaicos de la página de una categoría desde el Super Admin (Catálogo, 24 nov; regla 8). 0214 dio la PORTADA; esto da cada MOSAICO (los de
-- subcategoría de las filas de fotos y de los capítulos), incluidos los 7 que salían en gris porque su foto de origen ya no existe.
-- · categories.page_admin admite, además de «hero», la clave «tiles»: un objeto { <clave del mosaico>: "/medios/n/<uuid>.jpg" }. La clave del mosaico
--   es la misma que la página usa en ?sub=<clave> (estable: cambiarla rompería los enlaces guardados). Lo escribe SOLO app/admin/acciones-catalogo.ts
--   (catMosaico / catMosaicoOriginal: permiso cat:editar, mismo origen, motivo, categoría bloqueada, auditoría en la misma transacción). La semilla no
--   lo toca: un mosaico que la semilla quita deja su foto del equipo sin pintar (la pantalla y la página solo miran los mosaicos que existen).
-- · La foto de un mosaico es media con owner_kind 'category' (0214) y owner_id '<categoría>/<clave del mosaico>': así es DE ESE MOSAICO (una foto no
--   es de dos mosaicos ni de la portada; la portada sigue siendo owner_id = '<categoría>' exacto y su código no la confunde), no de quien la subió
--   (la purga de su cuenta no se la lleva), y la que se reemplaza o se devuelve a la original queda 'removed' / 'replaced' (estados: nada se borra).
--   La página pública solo pinta la foto del equipo mientras esa foto sigue visible, pública y sin purgar (lib/categoria.ts): si la revisión la baja
--   después, vuelve la original; sin original, el gris de siempre.
-- · No toca media: el check de owner_kind ya admite 'category' desde 0214 (sigue NOT VALID, ver LAUNCH).
-- Candados: categories son 17 filas; cambiar su check toma el candado exclusivo un instante y lo valida al momento. «set local lock_timeout» acota lo
--   que ESPERA (como 0211 y 0214): si alguien tiene categories, falla a los 3 s, se deshace entera y el siguiente despliegue la reintenta.
-- Solo expande: todo page_admin válido para 0214 ({} o {"hero": …}) lo es para este check. Mismo nombre de restricción (lo que ya la nombra sigue igual).
-- Para deshacerla: devolver a la original cada mosaico con foto del equipo (catMosaicoOriginal, o quitar la clave «tiles» y dejar sus fotos 'removed' /
-- 'replaced') y volver a crear el check de 0214 (pruebas: aplicada → revertida → aplicada). Idempotente.
begin;
set local lock_timeout = '3s';

-- page_admin: solo «hero» y «tiles». «hero», como en 0214, una foto de NUESTRO almacén. «tiles», un objeto cuyas claves son texto de 1 a 80 caracteres
-- sin caracteres de control (la clave del mosaico) y cuyos valores son TODOS una foto de nuestro almacén (nunca una dirección de afuera: la CSP no la
-- dejaría pintar y la regla de fotos propias lo prohíbe). La base lo impone aunque alguien escriba directo. jsonb_path_exists sin _tz es inmutable.
-- Un valor que no es texto se caza por su tipo (type() != "string"), no por la expresión: así un número o un objeto nunca pasa por «desconocido».
alter table categories drop constraint if exists categories_page_admin_portada_propia;
alter table categories add constraint categories_page_admin_portada_propia check (
  jsonb_typeof(page_admin) = 'object' and (page_admin - 'hero' - 'tiles') = '{}'::jsonb
  and (not (page_admin ? 'hero') or page_admin->>'hero' ~ '^/medios/n/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  and (not (page_admin ? 'tiles') or (jsonb_typeof(page_admin->'tiles') = 'object'
    and not jsonb_path_exists(page_admin->'tiles', '$.keyvalue() ? (@.value.type() != "string" || !(@.value like_regex "^/medios/n/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$") || !(@.key like_regex "^[^[:cntrl:]]{1,80}$"))'))));

-- La foto puesta de un mosaico se busca por (owner_kind, owner_id, status): ya la cubre media_owner_idx (0008).

commit;
