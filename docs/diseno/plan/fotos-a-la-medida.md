# Fotos a la medida — plan (decisión AI, 20 nov)

**Pedido del fundador:** «al subir una foto, que se convierta en la mejor versión para bajarle peso y mantenga calidad; servir las fotos
rápida y eficiente». **Decidido:** WebP como formato principal, 4 anchos, un JPEG de respaldo; AVIF después.

## Cómo está hoy (inventario del 20 nov, hecho por Haiku)
- Toda foto pasa por sharp: enderezar, máximo 1600 px, JPEG q82 sin metadatos. Una sola versión por foto.
- Públicas: `/api/medios` → llave `n/<uuid>.jpg`, dirección `/medios/n/<uuid>.jpg`, fila en `media`. nginx las sirve desde Garage con caché de
  un año; Cloudflare cachea `/medios/n/`.
- Privadas (`privado/a|m|e|r/<uuid>.jpg`): Mensajes, ayuda, entrega, reclamo. Solo salen por su ruta con permiso, sin caché.
- Se muestran casi siempre como **fondo CSS** (unas 200 concatenaciones `url(…)` en ~107 archivos; 12 `<img>`). No hay `srcset`, ni WebP, ni
  variantes: una miniatura de 54 px baja la foto de 1600.
- La semilla de pruebas usa fotos externas (Pexels), no nuestro almacén.

## Qué se construye
1. **Variantes al subir (en el mismo pedido, no en cola):** de la foto maestra salen WebP con pérdida (calidad ~80) en **320, 640, 1080 y 1600**
   de ancho (nunca más ancho que la maestra). WebP se genera en décimas de segundo: no hace falta cola.
2. **Nombres fijos, sin consultar la base para mostrar:** `/medios/n/<uuid>.jpg` → `/medios/n/<uuid>.w<ancho>.webp`. Quien pinta una foto sabe
   el tamaño de su caja y elige el ancho (caja × 2 por las pantallas de alta densidad, redondeado hacia arriba al ancho que existe).
3. **Nunca una foto rota:** si una variante no existe (foto vieja sin convertir, fallo al generar) o el navegador no acepta WebP, el servidor
   entrega la maestra JPEG en esa misma dirección, con caché corta. La maestra JPEG es además el respaldo y la vista previa al compartir.
4. **Una sola forma de pintar fotos en el sistema de diseño:** `fotoSrc(url, ancho)` / `fotoFondo(url, ancho)` y la pieza `Foto` (para `<img>`
   con `srcset`, carga diferida y caja reservada). Lo que no es nuestro (Pexels de la semilla, privadas, pósteres de video) pasa sin tocar.
5. **Las fotos que ya existen:** un trabajo del barrido las convierte por tandas (y repara las que falten). La maestra no se toca.
6. **Privadas (fase 3):** variantes bajo `privado/…`, entregadas por la misma ruta con permiso (`?w=`).
7. **Espejo:** el Super Admin muestra fotos convertidas, pendientes y peso ahorrado. Ayuda en `docs/ayuda/`.
8. **Guardianes:** toda ruta de subida genera variantes; ninguna pantalla pinta una foto nuestra sin `fotoSrc`/`fotoFondo`/`Foto`; nginx y
   Cloudflare con el respaldo y la caché correctos.

## Lo que queda fuera por ahora (anotado en LAUNCH)
AVIF; el color dominante mientras carga (hoy ya hay un fondo neutro del sistema); variantes del póster de video; moderación de las fotos
públicas al subir (hoy solo se revisan las de Mensajes y Comunidad: hallazgo del inventario).

## Fases y quién (regla 14)
| Fase | Qué | Quién |
|---|---|---|
| F0 | Inventario | Haiku ✓ |
| F1 | Migración, generador, `/api/medios`, respaldo en nginx/Cloudflare, conversión de lo existente, cifras para el admin, pruebas, guardián | Opus |
| F2 | `fotoSrc`/`fotoFondo`/`Foto` en el sistema de diseño y cambio pantalla por pantalla, con pruebas y guardián | Sonnet |
| F3 | Privadas con `?w=` | Opus · **hecho en parte (21 nov):** ver «Estado de F3» |
| F4 | Bloque del Super Admin y ayuda | Sonnet · **hecho (21 nov):** ver «Estado de F4» |
| Siempre | Plan, revisión de cada entrega, correr guardianes/tipos/pruebas, medir con fotos reales en el sandbox | Fable |

## Cómo se comprueba
- Una foto de cámara real subida en el sandbox: peso de cada variante y lo que baja una tarjeta, una ficha y una galería (antes/después).
- Punta a punta en el CI (hay almacén): subir → existen las 4 variantes, pesan menos, la tarjeta pide la de su tamaño, una variante que falta
  entrega la maestra.
- Presupuesto de velocidad (LCP) de las pantallas con fotos: igual o mejor.

## Estado de F3 (21 nov)
- **Las fotos de destino privado (las 10 pantallas de `destino=privado`) ya no tienen dirección pública:** `/api/medios` las guarda en
  `privado/o/<uuid>.jpg` con `media.private`, contesta `/api/medios/privada/<uuid>` y genera sus variantes WebP en `privado/o/<uuid>.w<ancho>.webp`.
  La ruta con permiso (`app/api/medios/privada/[id]`) decide desde la fila y su operación (`lib/fotos-privadas.ts permisoFotoPrivada`) y sirve
  `?w=` con el mismo permiso; sin caché, `nosniff`, 404 a quien no puede. Una retenida de destino privado, al aprobarse, vuelve a `privado/o/`.
- **Las de antes** (bajo `n/`): migración 0197 las marca y el barrido (`barrerPrivadas`) las mueve y reescribe su copia en `preFotos`.
- **Los catálogos** que guardan la foto como texto validan contra `media` (`lib/fotos-catalogo.ts`).
- **Las pantallas ya PIDEN `?w=`:** `fotoSrc`/`fotoFondo` de `packages/ui/src/foto.ts` reconocen `/api/medios/privada/<uuid>` y agregan
  `?w=<ancho>`. Las privadas de antes (Mensajes, ayuda de Salud y Pro, entrega, reclamo) siguen sin variantes.
- Guardián `fotosPrivadasConPermiso`; al revés `alreves9uprivadas`; prueba de la base `fot9uprivadas`; nginx `pruebas/infra/medios-nginx.test.sh`.

## Estado de F4 (21 nov)
- **El espejo:** Super Admin › Contenido › Auto-moderación › bloque «Fotos a la medida» (lo ve quien ya ve Contenido; solo lectura). Muestra: fotos
  públicas, con sus tamaños, las que faltan (las convierte el barrido), las que quedaron sin archivo, el peso de las originales y de los tamaños, y el
  ahorro de servir una foto a 640 (en % y en MB). Las cifras son de `cifrasFotos()` (lib/fotos-variantes.ts); como esa solo cuenta las públicas, las de
  destino privado salen de su hermana `cifrasFotosPrivadas()` (lib/fotos-privadas.ts: una consulta, solo números). Se arma con las piezas de la
  pantalla de al lado (grupo, nota, KPIs).
- **Ayuda del equipo:** `docs/ayuda/admin-fotos-a-la-medida.md` (ES/EN).
- Guardián `fotosCifrasEnElAdmin` (una cifra del servidor sin pantalla); al revés `alreves9ufotosadmin`; punta a punta `pruebas/e2e/fot9uadmin.cjs`
  (cifras del bloque contra la base, 390 y 1360, ES y EN, sin errores de consola ni desborde).
