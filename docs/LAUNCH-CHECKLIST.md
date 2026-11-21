# To'Latino v2 — Checklist de lanzamiento (lo diferido)

Todo lo que se decide «después / al lanzar / cuando esté listo» se anota aquí
en el momento. Se marca solo cuando está hecho de verdad.

## Infraestructura
- [ ] **→ 9t** · **Vercel (5 nov 2026):** el fundador desconectó el repo del proyecto de
      Vercel para parar los correos de «Preview deployment failed». El proyecto
      sigue sirviendo la v1 (tolatino.com y el sitio de pruebas viejo).
      **Al apuntar tolatino.com a Hetzner + Cloudflare, borrar el proyecto de
      Vercel completo** (decisión D: sin Vercel).
- [ ] **→ 9t** · **Supabase viejo:** borrar los dos proyectos de la v1 (pruebas
      `zpkaxojonufdwgahiqjh` y producción) cuando la v2 esté en producción.
- [ ] **→ 9t** · **Servidor de producción en Hetzner:** no se enciende hasta aprobarlo;
      al principio solo existe el de pruebas (decisión C).

## Infraestructura del sandbox
- [x] **→ 9o** · **Almacenamiento de archivos (5 nov 2026):** MinIO fuera (imágenes públicas retiradas).
      Entra **Garage** (`dxflrs/garage:v2.1.0`, S3 propio) en el bloque de subida de fotos,
      con bucket, llaves y respaldo del volumen. Hasta entonces la app no sube archivos. — _9a (11 nov): Garage hecho (infra/pruebas/medios.sh, servicio «medios» del compose; las fotos suben: com5a, com5d, publica). Falta el respaldo del volumen._ — **✓ 9o (14 nov):** producción respalda las fotos cada día (Garage → almacén de otra región con rclone; lo borrado o cambiado se aparta 35 días; `infra/comun/respaldos/respaldar.sh fotos`, anotado en backup_runs). El volumen del sandbox no se respalda: sus fotos son de prueba y se rehacen con la semilla (REVISION 9o).

## Cuenta (bloque 3b, 5 nov 2026)
- [ ] **→ 9q** · **Proveedor de SMS (decisión E/E2):** cuenta en Telnyx (o Twilio), registro 10DLC, clave en los secretos
      del entorno, y `lib/cuenta.ts` → envío real (hoy lanza `sin_proveedor` fuera del modo pruebas).
      WhatsApp como canal del código después de SMS.
- [ ] **→ 9p** · **Passkeys (Face ID / huella):** necesitan HTTPS y un dominio (WebAuthn no funciona sobre una IP con
      http). Construidas y probadas en 8d (11 nov); se usan cuando `pruebas.tolatino.com` esté detrás de Cloudflare (ver «Fase 8 · 8d»).
- [x] **→ 9m** · **Onboarding del vecino pasos 3–5** (Tu zona, Lo que te gusta, El barrio) y la bienvenida de Fundadores:
      hoy después de «Tú» se va a Mi cuenta mínima. — **✓ 9m (14 nov):** Entra (sin destino) sigue después de «Tú» a Tu zona, Lo que te gusta, El barrio y la bienvenida con el número de Fundadores (5c, `trasNombre`); quien venía de un pedido sigue a donde iba. Prueba: `vec9m` (Entra → paso 3 de 5 → bienvenida).
- [x] **→ 9c** · **Accesibilidad de `Button` del sistema:** es un `div` con onClick (no se enfoca con teclado ni lo anuncia
      un lector de pantalla). Pasa a `<button>` real cuando se tipe el componente; el guardián WCAG lo exigirá. — **✓ (comprobado 15 nov):** ya resuelto en 9c: `scripts/portar-sistema.mjs` (`accesibilizar`, tabla A11Y) da a cada `<div>`/`<span>` con clic del sistema rol, foco y teclado con `__ds_scope.__btn` (packages/ui/src/ds/scope.js); Button e IconButton con su parche; lo vigilan los guardianes `botonAccesible` y `clicConTeclado` y axe en el CI.
- [x] **Super Admin:** sesiones por dispositivo (cerrar / bloquear), cuentas, cambios de cuenta — en el bloque 3c. — **✓ 9a (11 nov):** Usuarios 360°: cerrar todas las sesiones y cerrar o bloquear un dispositivo (app/admin/U360.tsx: cerrarSesiones, dispositivoAccion); prueba usr1l.

## Super Admin (bloque 3c, 5 nov 2026)
- [x] **Segundo factor obligatorio para el equipo (T#30)** antes de encender producción: TOTP (app de
      autenticación) o passkey; sin él, una cuenta del equipo depende solo del SMS. Bloquea la fase 9. — **✓ 9j (14 nov):** staff() y requerir()
      (lib/admin.ts) exigen el segundo factor de ESA sesión (llave de acceso o TOTP propio, lib/equipo/), en los dos entornos; guardianes `equipoConDosPasos` y
      `totpPropio` (alreves9j 32/32); `sis9j` 78 ✓ dos veces seguidas en una base local.
- [ ] **→ 9t** · **Código de arranque del primer Admin:** su huella vive en `lib/admin.ts` y solo sirve mientras no exista
      ningún Admin. En producción se genera uno nuevo (otra huella) y se usa el día de la apertura.
- [x] **→ 9n** · **Buscador global ⌘K y campana con colas:** hoy llevan a Usuarios y a «Colas · Fase 1». — _9a (11 nov): la campana abre Colas reales con su cuenta y la de atrasados (app/admin/ui.tsx onBell, casos.n). Falta el buscador global ⌘K (hoy solo busca usuarios)._ — **✓ 9n-3 (14 nov):** `/admin/buscar` (⌘K / Ctrl K y la lupa del teléfono): negocio, persona, # de operación y sección, cada grupo con su `ver` y acotado a las ciudades de la vista. Prueba `adm9n3` paso 1; ayuda `admin-buscador-y-ciudad`.
- [x] **→ 9n** · **Selector de ciudad del admin:** hoy solo «Todas»; filtra por ciudad cuando haya datos por ciudad (Fase 1). — _9a (11 nov): el selector del encabezado sigue en «Todas» (app/admin/ui.tsx); filtra por ciudad con Ciudades._ — _9i (14 nov): Ciudades ya está completo (y cada sección filtra por las ciudades del rol: un Ciudad manager solo ve las suyas). El selector del encabezado filtra TODAS las secciones a la vez: es tocar las consultas de cada sección del Super Admin, la operación del admin de 9n; con cinco ciudades, en el teléfono no caben como segmentos (el diseño muestra «Hazleton · Todas»)._ — **✓ 9n-3 (14 nov):** el selector filtra TODAS las secciones a la vez: `Staff.cities` (lib/admin.ts) es la ciudad elegida (cookie httpOnly) o las del rol, nunca más que el rol (guardián `ciudadDelSelector`); en el teléfono, «Todas» y una ciudad que se cambia al tocarla. Prueba `adm9n3` paso 2.
- [x] **Abrir/cerrar ciudad** (asistente de 6 pasos) en Fase 9; **editar catálogo** con «afecta a N negocios» en Fase 1. — **✓ 9i (14 nov):** Super Admin › Ciudades con el asistente de 7 pasos (los 6 del prototipo + «Comprobar»: la regla, las líneas de LAUNCH de la ciudad y el commit), cada paso con su evidencia, solo avanza (la base: `city_launch_steps_reglas`); abrir solo por el asistente (`cities_estado` con `tl.apertura`) y cerrar con motivo y otra persona (`city_close_requests`, `tl.cierre`); guardián `ciudadConAsistente`; `ciu9i` lo prueba de punta a punta (lib/ciudades/apertura.ts, app/admin/Ciudades.tsx). «Afecta a N negocios» del catálogo ya estaba (Fase 1, Catálogo).
- [x] **→ 9m** · **Inicio — secciones ocultas hasta tener datos reales (bloque 1c):** Hoy en el barrio, Esta semana
  (eventos, Fase 6), Comunidad (Fase 5) y el mini mapa de la columna derecha (mapa propio). Cada una se
  enciende en el Inicio cuando su módulo exista; el prototipo manda en su forma. — **✓ 9m (14 nov):** Hoy en el barrio y Comunidad (5e), Esta semana (6b) y el mini mapa propio en la columna derecha del escritorio (9m: `MiniMapa`, puntos del Inicio, toca → Mapa). Prueba: `vec9m`.
- [x] **→ 9m** · **Pantallas `Pronto` (sandbox):** toda ruta que aún muestra «En construcción» debe llegar a 0 antes de la
  fase 9 (hoy: comunidad, eventos). — **✓ 9m (14 nov):** `Pronto.tsx` no existe (se borró en 9a) y ninguna pantalla dice «En construcción»: guardián `sinEnConstruccion` y `rutasVivas` en verde.
- [ ] **→ 9q** · **Publica tu negocio — lo que falta (bloque 1g-2):** (1) **ubicar la dirección en el mapa** (geocodificar con un
  servicio propio sobre OpenStreetMap: Photon o Nominatim autoalojado); hoy el negocio publicado no tiene punto, así que no
  sale como pin y cuenta como «dentro» del radio; (2) **la prueba Pro de 30 días** queda en category_attrs.onb.trial: la
  baja a Free al terminar llega con Suscripciones (Dinero); (3) **códigos de promotor** (HZL30 = 60 días, del diseño)
  como tabla del Super Admin; (4) «Tómale foto a tu lista: El Compa la lee» (el prototipo lo simulaba e inventaba
  precios) con El Compa; (5) «Es mío · recuperarlo» abre «Recuperar negocio» (pantalla propia); (6) H1 «Ir a mi panel» y
  las tareas de «Lo que sigue» abren el panel (bloque 1h); hoy «Ver mi página»; (7) lo que vende queda en
  category_attrs.items hasta la tabla de ítems del panel; (8) precios típicos de la lista sugerida = los del diseño
  («precios típicos de ejemplo, Hazleton 2026»): revisarlos con negocios reales; (9) la cola del Super Admin para ver los
  negocios nuevos (bloque 1i); (10) prueba de punta a punta de este flujo en CI (hoy corre a mano con Playwright); (11) «Publicar otro» (un segundo
  negocio con la misma cuenta): hoy el borrador es uno por persona; llega con el panel (varios negocios por cuenta). — _9a (11 nov): hecho: (2) prueba Pro → Free y primer cobro (lib/suscripcion.ts procesar/pasarAFree, 2m), (5) Recuperar negocio (app/(app)/recuperar), (6) «Ir a mi panel» (publica/Publica.tsx), (7) ítems del panel (Menú 2a y los módulos de la Fase 4), (9) la cola de negocios nuevos (1i). Falta: (1) ubicar la dirección en el mapa al publicar (lib/direcciones.ts existe; publica/acciones.ts no pone geo), (3) la tabla de códigos de promotor (hoy PROMO = { HZL30 } en publica/acciones.ts; → 9h con Promotores), (4) «Tómale foto a tu lista» con El Compa, (8) revisar los precios típicos con negocios reales (→ 9h, reclutamiento), (10) esta prueba en el CI (→ 9b), (11) «Publicar otro»._ — _9h (14 nov): (3) **hecho**: los códigos viven en `promo_codes` (0138; HZL30 y el de cada promotor, con sus días), Publica los lee de ahí (el código propio no vale: guardián `promotorAntiabuso`) y se administran en Super Admin › Crecimiento › Promotores (cre9h: un negocio publicado con el código de un promotor queda con 60 días y «traído»). (8) sigue: los precios típicos se revisan con los negocios reales del acceso anticipado (→ 9t, línea «Fase 9 · 9h»)._ — _9m (14 nov): (1) hecho: la dirección con sugerencias propias y su punto al publicar (`puntoFinal` o la primera sugerencia del estado); lo demás sigue en 9n._ — _(9n-7, 15 nov): (11) hecho: «Publicar otro negocio» en A1 (del diseño): el publicado se guarda en `onboarding_drafts_done` (0154, solo inserción; mapa de datos) y el borrador empieza en blanco; tope 5 negocios activos por cuenta; Analítica cuenta los dos; publica.cjs lo prueba. (10) ya corre en el CI (`publica.cjs`). Sigue abierto: (4) «Tómale foto a tu lista» con El Compa y (8) los precios típicos con negocios reales (→ 9t)._ — _(9n-12, 15 nov): solo queda (4) «Tómale foto a tu lista»: leer la foto de verdad pide El Compa real con visión; con el simulador del sandbox se inventarían precios (lo que hacía el prototipo; regla «nada falso»). Pasa a **9q** (Anthropic real en pruebas): la foto va al modelo con la lista sugerida (claves) y vuelve con precios y «REVISA»; el dueño confirma._
- [x] **Recomendar — lo que falta:** el SMS al negocio («X te recomendó…», una vez) y el aviso «ya publicó» al vecino
  (Fase 2, notificaciones); la cola «Recomendaciones» del Super Admin para revisarlas, marcarlas y unirlas al negocio
  cuando publique (bloque 1i). — _9a (11 nov): la cola «Recomendaciones» del Super Admin está (app/admin/Colas.tsx, «Crear semilla»). Falta el SMS al negocio («X te recomendó…») y el aviso «ya publicó» al vecino (no hay plantilla en notif_templates)._ — **✓ 9l (14 nov):** el SMS «X te recomendó…» al teléfono del negocio, UNA vez por teléfono en toda la vida (`rec_negocio`, con STOP; app/(app)/recomendar/acciones.ts) y «{negocio} ya está en To'Latino» al vecino cuando el negocio publica (`rec_publico`, barrido lib/canales/barrido.ts recomendados()). avi9l: las dos plantillas en ES y EN.
- [x] **→ 9m** · **Mapa — tope de 400 negocios:** el mapa trae los 400 más cercanos al punto (pines y lista). Cuando una ciudad pase
  de eso dentro de 2,6× el radio, pedir los pines por el recuadro visible al arrastrar. Mini mapas del Inicio y de la
  ficha («Cómo llegar» con el mapa propio) siguen pendientes; «Cómo llegar» abre el mapa del teléfono. — **✓ 9m (14 nov):** Al soltar el mapa con 400 o más negocios, pide los pines del recuadro visible (`?caja=s,o,n,e`, `leerCaja`: un recuadro de más de 1,5° se ignora); mini mapas propios en el Inicio y en la ficha; «Cómo llegar» abre la app de mapas del teléfono (`lib/como-llegar.ts`). Pruebas: `vec9m`, `dir9m`.
- [x] **Ciudad — lo que falta (bloque 1f-2):** barrios y pueblos cercanos de Allentown, Wilkes-Barre, Scranton y
  Reading (el prototipo solo trae los de Hazleton; se cargan desde Super Admin › Ciudades antes de abrir); filas de
  «Casa / Trabajo» para medir desde tus direcciones (llegan con Mi cuenta › Direcciones; hasta entonces no se ofrece
  «Entra para medir desde tu casa»); «Qué es Mi ciudad» para quien no entró (cuando exista el Centro de ayuda);
  la cifra de eventos en el radio (Fase 6); «Lo que más buscan los vecinos de X» en Próximamente (sale oculto hasta
  tener datos reales de `city_waitlist.wants`); el SMS «tu ciudad abrió» (Fase 2 + asistente de abrir ciudad, Fase 9);
  el teléfono de quien pide sin cuenta no se verifica con código (tope por IP): decidir antes de enviar SMS. — **✓ 9i (14 nov):** los barrios (6 por
  ciudad) y los pueblos cercanos de las cuatro en `packages/db/seeds/zonas.sql` (generado de `scripts/catalogo/barrios-ciudades.json`; corre en todos los
  entornos), y el equipo los corrige, agrega o retira en Super Admin › Ciudades › Barrios (lo que cambia el equipo, la semilla ya no lo pisa; `ciu9i`: los
  barrios de las cinco en el selector); el aviso «tu ciudad abrió» (en la app, push, SMS si no tiene la app, correo verificado; una vez, de día;
  `lib/ciudades/aviso.ts`, guardián `listaAvisadaUnaVez`); el teléfono sin cuenta: **decidido no escribirle** (REVISION 9i) — se le avisa si ese
  teléfono ya tiene cuenta; la cifra de eventos en el radio ya estaba (6b). Lo que queda pasó a la línea de abajo (→ 9m).
- [x] **→ 9t** · **Mi ciudad — lo que queda de 1f-2 (9i, 14 nov):** filas de «Casa / Trabajo» para medir desde tus direcciones (con Mi cuenta ›
  Direcciones; hasta entonces no se ofrece «Entra para medir desde tu casa»); «Qué es Mi ciudad» para quien no entró (un enlace a la ayuda
  `ciudades-que-abren`, que ya existe); «Lo que más buscan los vecinos» en Próximamente (sigue oculto: nada llena `city_waitlist.wants` salvo «negocio»
  de la landing). — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m (las direcciones de la decisión AC se llevaron el bloque): las filas «Casa / Trabajo» ya pueden salir de Mis direcciones (con su punto), falta componerlas en Mi ciudad con «Qué es Mi ciudad»._ — **✓ 9t (19 nov):** «Desde dónde medimos» con **Casa / Trabajo** (las direcciones de Mi cuenta › Direcciones con punto; el selector recibe «dir:<id>», la etiqueta y la calle; el servidor pone el punto con las direcciones de QUIEN mira, la cookie y la cuenta guardan solo «dir:<id>»; sin sesión, ajena o quitada → el centro) y, sin sesión, «Entra para medir desde tu casa o tu trabajo» (diseño loginAddr) y **«Qué es Mi ciudad»** → `/ayuda/ciudades-que-abren`. Encabezado «· casa / trabajo». «Lo que más buscan los vecinos» sigue oculto (sin datos). Guardián `medirDesdeTuDireccion` (alreves9t2); e2e `ciu9t` 29 ✓ en local. Ayuda `ciudad`.
- [x] **Ciudades en memoria 60 s:** abrir o cerrar una ciudad desde el Super Admin se nota en hasta un minuto. — **✓ 9i (14 nov):** `NOTIFY 'ciudades'` (0139) en cada cambio de `cities`, `zones` y `city_beta_invites`; cada proceso lo escucha (lib/cambios-config.ts) y olvida su copia al momento (los 60 s quedan de respaldo si la escucha se corta); quién entra a una beta no se guarda en memoria. Guardián `ciudadAlInstante`; `ciu9i`: al abrir Reading, la otra persona la ve abierta al recargar.
- [x] **Banda de emergencia de Hogar:** oculta hasta que exista el flujo «Pedir ayuda ahora»
  (APP-NEG-HOGAR-EMERGENCIA). Las de Doctores y Profesionales sí están (filtran la lista). — **✓ 9a (11 nov):** Emergencia 24/7 de Hogar construida en 4e (app/(app)/emergencia, lib/solicitudes.ts vencerEmergencias; plantillas em_ok, em_nadie, em_tomada); prueba em4e.
- [x] **Negocios — secciones ocultas hasta tener datos reales:** «Hoy en el barrio» (módulo Novedades) y
  «Recomendados por vecinos» (el prototipo lo calculaba como reseñas ÷ 4; necesita el dato real de las reseñas). — **✓ 9a (11 nov):** «Hoy en el barrio» (5e, lib/hoy.ts; com5e) y «Recomendados por vecinos» con el dato real (app/(app)/negocios/Negocios.tsx).
- [x] **→ 9b** · **Paginación numerada (excepción a «paginación por cursor»):** el diseño pide «Página 2 de 5» y números; la — **✓ 9b-3 (13 nov):** con 20 mil negocios en Hazleton en las 17 categorías (~1 200 en Comida, el umbral de esta línea): página 1 p95 33 / 31 ms y página 50 p95 35 / 33 ms (presupuesto 50; cargas 43457199398 / 43460154153). Se queda con páginas numeradas; si una categoría de una ciudad pasa de ~1 200 negocios, se vuelve a medir.
  lista de una categoría en una ciudad es acotada, así que va con OFFSET y tope de 100 páginas. Revisar con datos
  reales antes de la fase 9 (si una categoría pasa de ~1 000 negocios en una ciudad, pasar a cursor).
- [x] **→ 9m** · **Chips largos en BusinessCard:** textos largos (p. ej. «Coordinación del día $900 · boda completa…») se
  cortan en el borde de la tarjeta. Pedir al diseño cómo debe partirse. — **✓ 9m (14 nov):** Los chips largos van en dos líneas con «…» (parche de `scripts/portar-sistema.mjs` sobre BusinessCard; a confirmar con el diseño en REVISION 9m).
- [x] **→ 9m** · **«Cómo llegar»** abre Google Maps del teléfono hasta tener el mapa propio. — **✓ 9m (14 nov):** Un enlace (no una llamada): iPhone → Mapas de Apple (`maps://?daddr=`), Android → la app de mapas que elija (`geo:`), computadora → las indicaciones en la web. Los 25 lugares que abrían google.com/maps pasan por `lib/como-llegar.ts`; guardián `direccionSinTerceros`. Prueba: `dir9m` §5.
- [x] **«Avísame cuando haya»** guarda la búsqueda; el envío del aviso se construye en la Fase 2 (notificaciones push/SMS/correo). — _9a (11 nov): «Avísame cuando haya» guarda la búsqueda (app/(app)/acciones.ts); el envío del aviso no existe (ninguna plantilla de búsqueda en notif_templates)._ — **✓ 9l (14 nov):** el barrido manda «Ya hay {lo que buscaste}» cuando un negocio nuevo de la ciudad coincide (nombre o categoría), una vez por alerta (`busqueda_hay`, lib/canales/barrido.ts busquedas(); notified_at).
- [x] **Toques de contacto sin límite:** resuelto en 1h (0015: uno cada 10 min por persona o red, 60/h por red, sin
  contar a la gente del negocio).
- [x] **Ficha — lo que se ve cuando exista su dato o módulo:** («Quién está detrás» y «En el local» ✓ en 1h) reseñas y «N vecinos lo recomiendan» (Fase 2), menú/servicios/tienda/reservaciones/staff/eventos/jobs (sus
  fases), mini mapa con la zona (mapa propio), botón principal por módulo (hoy:
  «Llamar»). En el prototipo la tarjeta «Hoy» y la del dueño inventaban cifras (35–45 min por defecto, pedidos =
  reseñas × 0,7, rango por reseñas): no se copian. — **✓ 9a (11 nov):** reseñas y recomendaciones (2g), módulos por categoría en la ficha (Fases 2–4), mapa propio y botón por módulo (lib/ficha.ts, app/(app)/n/[id]/Ficha.tsx); no se copiaron cifras inventadas (guardián filaNoFalsa).
- [x] **Reporte de foto — el aviso por SMS:** la hoja dice «Te avisamos el resultado por SMS» (texto del diseño). El
  aviso se construye con las notificaciones (Fase 2) y la cola «Medios marcados» del Super Admin (bloque 1i). Sin eso
  no pasa a producción. — **✓ 9a (11 nov):** el resultado de un reporte de foto avisa con mod_foto / mod_hide (lib/apelaciones.ts) y la cola «Medios marcados» está en Colas (5d); prueba com5d.
- [x] **→ 9t** · **Buscar — pendientes con su módulo:** pestañas «Platos y servicios» (Fase 2), «Eventos» (Fase 6), «Vecinos» y
  «Pregúntale al barrio» (Fase 5); desplegable de búsqueda en el encabezado de escritorio (hoy el encabezado lleva a
  /buscar); vista previa al pasar el cursor (escritorio). — _9a (11 nov): hechas: Eventos y Vecinos en Buscar, «Pregúntale al barrio» (app/(app)/buscar/Buscar.tsx; com5e, evt6b-6c). Falta la pestaña «Platos y servicios», el desplegable del encabezado de escritorio y la vista previa al pasar el cursor._ — _9m (14 nov): Sigue: la pestaña «Platos y servicios», el desplegable del encabezado de escritorio y la vista previa al pasar el cursor; no cupo en 9m._ — **✓ 9t (19 nov):** «Platos y servicios» en Todo, en su pestaña (chips por categoría y «Precio más bajo») y en las sugerencias; solo lo que la ficha muestra (`lib/visible-publico.ts`, la misma regla que leen las fichas; `lib/buscar-platos.ts`, índice GIN `items_search_gin` y vocabulario `search_vocab_platos`, 0180); el desplegable del encabezado en escritorio (SearchPanel 2w) con la vista previa al pasar el cursor (negocio, plato, categoría, evento, conteos). Guardián `buscarPlatosComoLaFicha` (alreves9t); e2e `bus9t`. Lo que sigue va en las líneas de abajo.
- [x] **→ 9t** · **Buscar · servicios de las demás categorías y lo que falta del desplegable:** los servicios de Fiestas, Transporte, Noche, Educación/Niños/Deporte (cursos), Iglesias, y (si el fundador lo quiere) propiedades, carros y productos de Mercados y Tiendas, cada uno con la regla de su ficha en `lib/visible-publico.ts`; «Tiene Mofongo de chicharrón · $12» como razón en la fila de un negocio; abrir el plato directo en su hoja desde Buscar (hoy abre la ficha en su Menú); el micrófono y el chip de la ciudad dentro del desplegable de escritorio (REVISION «9t»). (9t, 19 nov) — _9t (19 nov): hecho: Fiestas, Transporte, Noche (sus tipos; la Lista solo encendida; la noche especial solo con su evento en vivo), Educación/Niños/Deporte (solo cursos, programas o membresías) e Iglesias en «Platos y servicios», cada una con la puerta de su ficha (pausa de Servicios) y su regla en `lib/visible-publico.ts` (`CURSO_INSC`, `SERVICIO_NOCHE`), que ahora leen también sus fichas; un negocio encaja por lo que vende (`NEGOCIOS_POR_PLATO` en `negocios()`, el mismo índice `items_search_gin` y la misma regla) y su fila, su tarjeta y su sugerencia dicen «Tiene Mofongo de chicharrón · $12» (`porQue()`, una consulta por página; el nombre gana; un servicio sin número); tocar un plato abre su hoja en la ficha (`?plato=<id>`, la ficha de siempre y la nueva, una vez al hidratar; si no se puede pedir, queda el Menú); el micrófono (la misma lógica de la página, `buscar/voz.ts`, con el aviso dentro del panel) y el chip de la ciudad dentro del desplegable. Sin migración (0180 ya trae el índice). Guardianes `buscarPlatosComoLaFicha` (ampliado), `negocioPorLoQueVende`, `platoAbreSuHoja`, `vozDelDesplegable` (alreves9tbus 44/44; alreves9t 32/32); e2e `bus9t` § 6. Propiedades, carros y productos: no entran (línea de abajo, decisión del fundador)._
- [x] **→ 9t** · **Buscar · propiedades, carros y productos de Mercados y Tiendas en «Platos y servicios»:** no entraron en 9t-2 porque no son «trivialmente iguales» a su ficha: las propiedades nunca llevan la dirección ni el punto (cuarto en casa de quien renta), los carros llevan el total en la puerta calculado por `enLaPuerta`, y los productos de Mercados (por libra, corte o punto) y de Tiendas (tallas, existencias, apartado) tienen su propio módulo; las casas y los carros ya tienen **Buscar casa / Buscar carro** (`/buscar/inventario`). Espera la decisión del fundador (REVISION «9t-2»): si los quiere aquí, cada uno con la regla de su ficha en `lib/visible-publico.ts`. (9t-2, 19 nov) — **✓ decidido (DECISIONES 9t-2, 20 nov): no entran.** El fundador no los quiere en Buscar; quedan en Buscar casa / Buscar carro y en la ficha de su negocio. Nada que construir.
- [x] **→ 9m** · **Buscar con la voz** usa el reconocimiento del propio navegador (Safari/Chrome lo procesan en servidores de
  Apple/Google). Revisar con el fundador si se acepta o se construye uno propio antes de producción. — **✓ 9m (14 nov):** La primera vez sale el aviso (lo procesan Apple o Google, no To'Latino) con «Ahora no»; interruptor «Buscar con la voz» en Mi cuenta › Ajustes › Privacidad (`users.voice_search`); apagado, Buscar no muestra el micrófono. Decisión en REVISION 9m (reconocimiento propio: después de abrir si el fundador lo pide). Prueba: `vec9m`.
- [x] **→ 9b** · **Vocabulario de búsqueda (`search_vocab`)** se refresca en cada despliegue; con negocios nuevos todos los días — **✓ 9b-3 (13 nov):** el barrido lo refresca cada hora sin bloquear a quien busca (`buscar_al_dia`, CONCURRENTLY) y anota `search_vocab_refreshed_at` en platform_config (0133).
  hace falta refrescarlo cada hora (trabajo programado, con el resto de procesos). — _9a (11 nov): refrescar_busqueda() corre en cada despliegue y semilla (packages/db/migrar.sh); no está en el barrido: falta el refresco cada hora (derivados cacheados de 9b)._

## Panel del negocio · base (bloque 1h, 5 nov 2026)
- [x] **→ 9n** · **Aceptar una invitación al equipo (`/e/{código}`):** el SMS dice «Acepta y pon tu foto aquí», pero el diseño no
  tiene esa pantalla (quien acepta entra con su teléfono, pone foto, palabras e idiomas). **Pedir el diseño al
  fundador.** Hasta entonces las invitaciones se guardan y vencen a los 7 días; nadie puede aceptar. — **✓ 9n-2 (14 nov):** `/e/{código}` (apps/web/app/e, lib/equipo-invitacion.ts): composada con head/photos/field/chips/acts, un solo uso, vence a 7 días, solo con el teléfono invitado, tope de 8 intentos por hora, el SMS lleva el enlace; foto-palabras-idiomas. Decisión en REVISION 9n-2 (el diseño no tiene la pantalla). Guardián invitacionDeEquipoSegura; pan9n2 §1; ayuda panel-equipo-invitacion.
- [x] **SMS de invitación y de «Reenviar»:** sale con el proveedor de SMS (decisión E2, Fase 2). La pantalla dice con la
  verdad que el SMS no salió. Igual «Le avisamos por SMS» al quitar a alguien y el aviso a quien pidió unirse (quitados
  del texto hasta que existan). — **✓ 9l (14 nov):** la invitación y «Reenviar SMS» salen por SMS con el código (`equipo_invitado`, avisarTelefono como los porteros; app/panel/acciones-equipo.ts); la pantalla dice la verdad si el número pidió STOP. Los avisos al quitar a alguien y a quien pidió unirse van con el flujo de aceptar de 9n (línea nueva en «Fase 9 · 9l»).
- [x] **Secciones del panel que llegan en su fase (ocultas, no a medias):** Clientes, Mensajes, Lo que vendes (módulos,
  ítems, «Marcar agotado»), Entrega, Eventos, El Compa, Moderadores, Cobros y plan (los botones «Tu plan / Decidir /
  Pro» de las notas de la prueba), Ajustes, «Más»; apartados Información y contacto, Ubicación y zona, Reseñas,
  Novedades («Publicar novedad»), Preguntas frecuentes, Relacionados, Vacantes, Verificación y sello, Insights. Las
  tareas de la fuerza que llevan ahí (ítems, sello, correo, FAQ, reseñas) se muestran sin enlace. — **✓ 9a (11 nov):** el panel tiene sus secciones con sus fases (Clientes, Mensajes, Lo que vendes, Entrega, Eventos, El Compa, Cobros y plan, Ajustes; app/panel/); prueba adm7i, compa7e, beta8f. Lo que todavía no existe no se enlaza (guardián panelClicMudo).
- [x] **Hoy con datos reales:** pedidos, citas, reservaciones, cotizaciones, mensajes y reseñas (Fase 2–3). Hoy las cifras
  son cero porque esos módulos no existen; «Free: 0 de 10» cuenta de verdad cuando existan las operaciones en línea. — **✓ 9a (11 nov):** Hoy del panel con pedidos, citas, reservaciones, cotizaciones, mensajes y reseñas reales (lib/panel.ts, app/panel/Panel.tsx; pedidos2c, cit3b, rsv2e).
- [x] **→ 9n** · **Horario — feriados, vacaciones, días especiales propios y «Abro por temporada»** (y que el estado abierto/
  cerrado los mire): catálogo de feriados por año en el servidor + días propios. Ocultos hasta construirlos (el
  subtítulo del apartado los menciona: texto del diseño). — **✓ 9n (14 nov):** Panel › Horario: el catálogo de feriados del servidor (holiday_catalog) con un toque, vacaciones y días propios con fechas y horas, «Abro por temporada»; special_hours con status (nada se borra) y negocio_abierto los mira (también Citas, la ficha, Jobs y El Compa leen solo los activos). Guardián diaEspecialActivo; prueba neg9n paso 6; ayuda panel-horario.
- [x] **→ 9n** · **Horario distinto por módulo** (último pedido en línea, citas que dejan de entrar antes de cerrar): con Pedidos y
  Citas. — _(9n-2, 14 nov): «último pedido» ya existe (menu_settings.last_min); falta el corte de citas antes de cerrar. No entró._ — _(9n-7, 15 nov): hecho. Panel › Citas › «LA ÚLTIMA CITA TERMINA» (al cerrar / 15 / 30 min / 1 h antes; booking_policies.close_cut_min, 0155); el motor de horas lo aplica (guardián corteDeCitas); svc3a lo guarda y cit3b comprueba que la última hora sale 60 min antes._
- [x] **El Compa traduce** (Quiénes somos, rol, especialidades, palabras): Fase 7; hoy se escribe a mano. — **✓ 9a (11 nov):** decisión del plan (§6 #9 de la Fase 7, L1140): los textos del panel se traducen con el traductor propio (5h), no con El Compa.
- [ ] **→ 9n** · **Pestaña Staff de la ficha** y «Ver equipo» de «Quién está detrás» (sin botón por ahora): con las pestañas Pro.
  «Sus platos» de cada persona: con el Menú (Fase 2). — _9a (11 nov): la pestaña Staff de la ficha y «Ver equipo» no están (solo «Sus platos» en app/panel/Menu.tsx)._ — _(9n-2, 14 nov): no hay pieza de diseño para la pestaña (solo StaffPicker de reservas); no se inventó. Pedir el diseño._
- [x] **Prueba Pro al terminar** (pasar a Free, primer cobro, «decidiste seguir/no seguir»): con Cobros y plan (Fase 2);
  hoy `business_stats_cache.plan` no cambia solo el día 30. — **✓ 9a (11 nov):** prueba Pro al terminar: pasar a Free, primer cobro y «decidiste seguir / no seguir» (lib/suscripcion.ts procesar, pasarAFree, seguirConPro; plantillas pro_free, pro_charged, pro_failed); el día 30 sin que nadie entre → L377 (9k).
- [x] **Avisos de la prueba fuera del panel** (día 20, 25, último, fin: push/SMS/correo a las 10 AM): Fase 2. — _9a (11 nov): solo existe el aviso del día 25 (pro_d25 en lib/suscripcion.ts); faltan el día 20, el último día y el de fin a las 10 AM._ — **✓ 9l (14 nov):** día 20 («Te quedan 10 días», `pro_d20`) y último día (`pro_ultimo`) a las 10 AM de la ciudad, solo sin tarjeta, una vez (lib/canales/barrido.ts pruebaPro()); el día 25 ya estaba (`pro_d25`) y el fin es «pasó a Free» (`pro_free`) al terminar. Push y SMS de respaldo; por correo no (decisión en REVISION 9l).
- [x] **Super Admin del panel (triángulo):** hecho en 1i (fotos, Quiénes somos, nombre, teléfono, dirección, staff,
  cierre temporal, ocultar/suspender/cerrar, sello). El horario queda en lectura en el admin (como el prototipo).
- [x] **9g** · **Vistas:** se cuentan al servir la ficha (sin robots ni gente del negocio). Revisar con tráfico real si hace falta
  dedupe por persona/día como los contactos. — **✓ 9g (14 nov):** una vez por persona (o teléfono) y día: `business_views_daily.unicos` + `business_view_marks` (huella con la sal del día, se suelta a los 2 días); Analítica › Resumen muestra vistas y sin repetidos. El panel sigue con todas las vistas (LAUNCH «Fase 9 · 9g» → 9n). Evidencia: `ana9g` (dos vistas = +2 y +1 sin repetidos; sin correr aquí).
- [x] **→ 9c** · **Botones del sistema de diseño (`Button`) son `<div>` sin `role="button"`:** accesibilidad por teclado/lector de
  pantalla en todo el sitio. Corregir en `portar-sistema.mjs` (guardián de accesibilidad) antes de la fase 9.

## Super Admin · Negocios y Colas (bloque 1i, 5 nov 2026) — **✓ (comprobado 15 nov):** ya resuelto en 9c: `scripts/portar-sistema.mjs` (`accesibilizar`, tabla A11Y) da a cada `<div>`/`<span>` con clic del sistema rol, foco y teclado con `__ds_scope.__btn` (packages/ui/src/ds/scope.js); Button e IconButton con su parche; lo vigilan los guardianes `botonAccesible` y `clicConTeclado` y axe en el CI.
- [x] **Colas que llegan con su pantalla:** Licencias (con la ficha «Licencia»: número de licencia en Publica/panel,
  filas `licenses` en revisión, estado «No aparece»); «Crear semilla» en Recomendaciones (con Reclamar negocio y la fila
  «SIN RECLAMAR» de la categoría); Reportes de contenido/negocio/usuario, Cambios sensibles, Ciudad nueva (sus fases). — **✓ 9a (11 nov):** Colas: Licencias, «Crear semilla» en Recomendaciones con «SIN RECLAMAR», Reportes, Cambios sensibles (app/admin/Colas.tsx, lib/colas.ts; 1k, 2k, 5d); Ciudad nueva → 9i con el asistente.
- [x] **→ 9n** · **Acciones del 360° que dependen de otras piezas:** Mensaje al dueño (bandeja en el panel + SMS), Destacar 7 días
  (Destacados), Cambiar categoría / Transferir / Fusionar / Reclamos (cola Cambios sensibles), Invitar a reclamar
  (SMS), Pro de cortesía / prueba / pagos (Fase 2), quitar acceso al panel (Moderadores), pausar módulos, «Panel del
  dueño» y «Ver como cliente» de un negocio no activo (vista del equipo). Pestañas Lo que vende, Operación, Dinero,
  Contenido: con sus módulos. — _(9n-7, 15 nov): «Mensaje al dueño» hecho (app o SMS, campana y push que abren su panel; 0156; adm9n3) y «Destacar» (= Crecimiento › Destacados › Fijar, mkt:editar; adm9n3) e «Invitar a reclamar» (SMS reclamar_invita al teléfono de un negocio sin dueño, una vez cada 30 días; 0157; adm9n3). Siguen abiertas las demás acciones de esta línea._ — _(9n-8, 15 nov): «Cambiar categoría», «Transferir dueño» y «Fusionar» hechos: se piden en el 360° (o en Posibles duplicados), entran a Colas › Cambios sensibles y los aplica OTRA persona (transferir un negocio con dueño, solo un Admin); al fusionar, reseñas/seguidores/guardados pasan al que queda y la página del duplicado lleva al que quedó (0158; lib/negocio-cambios.ts; guardián cambioNegocioOtraPersona; neg9n8). Siguen abiertos: quitar acceso al panel, «Panel del dueño» y «Ver como cliente» de un negocio no activo, y las pestañas Operación/Dinero con sus módulos._ — _(9n-13, 15 nov): «Quitar acceso» / «Devolver acceso» al panel en Equipo hecho (`business_members.panel_off_*`, **0163**; accesoPanel y misNegocios lo respetan; aviso al dueño; guardián `panelSinAccesoBloqueado`; neg9n8 §4b). Siguen: «Panel del dueño» (el equipo entrando al panel de un negocio) y «Ver como cliente» de uno oculto: piden un modo solo lectura del equipo con su auditoría; queda en REVISION como decisión._ — _(9n-20, 15 nov): «Ver como cliente» de un negocio no activo hecho (solo el equipo con neg:ver, `/n/{id}?equipo=1` desde el 360°, aviso VISTA DEL EQUIPO, auditoría `negocio.ver_como_cliente`, no cuenta como vista; guardián fichaOcultaSoloEquipo, alreves9n20 5/5; e2e neg9n20). Sigue: «Panel del dueño» (solo lectura del equipo), en REVISION._ — _(9n-18, 15 nov): pestaña **Operación** hecha (Super Admin.dc.html 'oper': cifras de 90 y 30 días, vistas de 7 días, lo que tocan en la ficha, lo que le queda si es Free y las operaciones por tipo con cursor → Transacciones; lib/admin-negocio-oper.ts, N360Oper.tsx; tx:ver; neg9n8 §6). «Pro de cortesía» y «pausar módulos» ya estaban (Dinero y Lo que vende). Sigue solo «Panel del dueño» / «Ver como cliente» de uno oculto: decisión en REVISION._ — **✓ (18 nov, 9n-23):** «Panel del dueño» hecho como **solo lectura del equipo** (decisión por defecto AB, en REVISION): el 360° abre `/panel/{id}?equipo=1` en otra pestaña; solo quien es del equipo con neg:ver (dos pasos, ciudades de su rol) entra, con el aviso fijo «VISTA DEL EQUIPO · SOLO LECTURA», «Guardar» apagado y cada sección en la auditoría (`negocio.ver_panel`, visible en el historial del 360°). Las acciones siguen con `accesoPanel` (miembro del negocio): todo cambio lo rechaza el servidor. Mirar no marca leído/visto, no cobra y no abre lo cifrado (lib/vista-equipo.ts). Ayuda `admin-negocios` (ES/EN); guardián `panelEquipoSoloLectura` (alreves9n23 27/27); e2e `neg9n23` (corre en CI). Con «Ver como cliente» (9n-20), la línea queda completa.
- [x] **Avisos por SMS** al dueño (sello, ocultar, foto quitada) y al vecino que reportó o recomendó: Fase 2. Los
  textos del admin dicen «lo ve en su panel» (verdad hoy). — _9a (11 nov): el dueño recibe aviso de foto quitada y de ocultar (mod_foto, mod_hide) y el vecino el resultado de su reporte (com_rep_ok / com_rep_no). Falta el aviso del sello (verificación del negocio) y el del vecino que recomendó cuando el negocio publica._ — **✓ 9l (14 nov):** el sello decidido llega al dueño con su motivo (`sello_ok` / `sello_info` / `sello_no`, push y SMS de respaldo; app/admin/acciones-colas.ts decidirSello); quien reportó una foto recibe el resultado (`foto_rep_quitada` / `foto_rep_queda`); quien recomendó, «ya publicó» (`rec_publico`). Ocultar y foto quitada siguen en la campana y el push (moderación: sin SMS, REVISION 9l).
- [x] **Avisos del panel sin diseño propio:** «To’Latino ocultó / suspendió / cerró tu página: {motivo}» usan el patrón
  del aviso «To’Latino cerró tu página por unos días» (el diseño del panel no trae esos tres). Confirmar con el fundador. — **✓ 9a (11 nov):** los tres avisos usan el patrón de «cerró tu página por unos días» (REVISION 9a).
- [x] **→ 9n** · **Colas:** atajos de teclado J/K/A/R y acciones en lote (plan §6), vencimiento del «tomado», tope de 200 casos por
  vista (paginar cuando haga falta), SLA editables por el Super Admin (hoy en `lib/colas.ts`). — **✓ 9n (14 nov):** atajos J/K/A/R y lote en escritorio (Tomar, Asignar a…, Soltar con la barra de selección del sistema), el «tomado» vence a cola_tomado_min (barrido colasTomado, auditado), el plazo de cada cola en Configuración › Colas (cola_sla_*; SLA_SQL y slasColas los leen). Lo que queda (tope de 200 por vista y paginar) va en «Fase 9 · 9n». Prueba neg9n paso 5; ayuda admin-colas.
- [x] **→ 9n** · **Permisos:** la matriz de 0007 manda (el prototipo daba Colas a soporte, finanzas y lectura). La visibilidad por
  cola vive en código; pasarla a la base si el Super Admin la quiere editar. — **✓ 9n (14 nov):** la visibilidad de cada cola por rol vive en la base (queue_roles, sembrada con lo que decía lib/colas.ts) y la edita un Admin en Colas › Ajustes con motivo y auditoría; staff() la trae en Staff.colas.
- [x] **→ 9n** · **Lista de Negocios con OFFSET** (14 por página, tope 100 páginas) y filtros de transacciones, Stripe, licencias,
  «sin actividad 30 d», «Exportar CSV» (servidor + auditoría): con sus datos. — **✓ 9n-3 (14 nov):** paginado por cursor (llave de orden + pila `ant`), filtros Con pedidos 30 d, Sin actividad 30 d, Con cobros (Stripe), Pro sin cobros y Con licencia verificada, y «Exportar CSV» (neg:exportar, motivo, auditoría, 5 por hora). Prueba `adm9n3` paso 4; guardián `negociosPorCursor`.
- [ ] **→ 9q** · **«Teléfono verificado» del negocio** = el teléfono del negocio es el del dueño que entró con código. Verificar
  un teléfono distinto (llamada o SMS) llega con el proveedor de SMS.

## Licencia (bloque 1k, 5 nov 2026)
- [x] **Revisión cada 3 meses:** abrir el caso solo al llegar `next_review` necesita los trabajos programados (no hay
  todavía). Hasta entonces una licencia verificada sigue verificada. — **✓ 9a (11 nov):** el barrido devuelve a la cola las licencias que llegan a next_review (lib/licencias.ts barrerLicencias en lib/barrido.ts); prueba adm4ig.
- [x] **Otras categorías con licencia** (Niños/DHS, Bienes Raíces, Salud, Hogar, Auto…): el catálogo es de NEG-PRO. — **✓ 9a (11 nov):** licencias de Niños (DHS), Salud, Bienes Raíces, Autos, Iglesias y demás (lib/licencias.ts CATS_LIC_4I; 4h–4ig); qué categorías vuelven solas a revisión: L561.
- [ ] **→ 9n** · **«Quién tiene licencia aquí»** (licencia de cada persona del equipo): sin gestión diseñada en el panel ni el admin. — _(9n-2, 14 nov): sin diseño para el panel ni el admin; no se inventó UI (regla 7). Pedir el diseño al fundador._
- [x] **Pestaña Servicios de la ficha:** la tarjeta «¿Puede hacerlo por ley?» vive en el Resumen hasta que exista. — **✓ 9a (11 nov):** la ficha de Profesionales tiene su pestaña Servicios con «¿Puede hacerlo por ley?» (app/(app)/n/[id]/licencia, lib/ficha.ts; pro4k).
- [x] **Decisiones tomadas sin el diseño:** el número de licencia se escribe en el panel (campo del sistema de diseño;
  el diseño no lo tenía); plazo único 72 h (el panel del diseño decía 48 h); «revocada» se muestra como «No aparece»;
  el paso 2 de «Cómo la verificamos» dice «la quitamos de su ficha» (el diseño decía «el sello», que es otra cosa). — **✓ 9a (11 nov):** número en el panel, plazo único de 72 h, «No aparece» y «la quitamos de su ficha» (REVISION 9a).
- [x] **Chip de la tarjeta** usa el título de la semilla (`licL`); un negocio nuevo verificado aún no muestra chip. — **✓ 9a (11 nov):** el chip sale de la licencia verificada del negocio (lib/tarjeta.ts), no solo de la semilla; prueba svc4h3.

## Recuperar negocio y semillas (bloque 1j, 5 nov 2026)
- [ ] **→ 9q** · **Proveedor de SMS en producción** para el código del reclamo (R1). En el sandbox el código sale en pantalla;
  sin proveedor, producción responde «Los mensajes de texto todavía no están disponibles. Usa un documento».
- [x] **Borrar la foto del documento a los 90 días** de decidido el reclamo: necesita los trabajos programados. — **✓ 9d (14 nov):** `retener_doc_reclamo_dias` (90, Configuración › Retención), `lib/datos/retener.ts` retenerDocReclamo en el barrido; prueba datos9d (local, 61 ✓).
- [x] **→ después de abrir (DA-01)** · **Botones de Soporte** del diseño (chat / llamar) ocultos hasta que exista Soporte. — 7b (10 nov): «chat» = Soporte (`/soporte`, casos con una
  persona) ya existe y los avisos del panel traen «Escribir a Soporte»; **llamar** sigue sin construirse (no hay línea telefónica, R1). — _9a (11 nov): «chat» = Soporte (7b); «llamar» no se construye: no hay servicio de voz (R1). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9n** · **Admin Negocios › pestañas «Reclamos» y «Duplicados»** e **«Invitar a reclamar»** (SMS): con sus módulos. — **✓ 9n-8 (15 nov):** Negocios › Lista · **Posibles duplicados** (pares que escribe la base al crear o renombrar: trigramas ≥ 0.75 o ≥ 0.6 con la misma primera palabra; estados POR REVISAR / VINCULADOS · SUCURSAL / NO ES DUPLICADO / FUSIÓN EN LA COLA / FUSIONADOS; «Fusionar» → Cambios sensibles; «No es duplicado» solo inserción) · **Reclamos** (por decidir + «Sin reclamar» con «Invitar a reclamar», una vez cada 30 días). Migración 0158; prueba neg9n8; ayuda admin-negocios.
- [x] **→ 9m** · **Entrada «¿Es tuyo?» desde la ficha** de un negocio: el diseño no la trae; hoy se llega desde Publica y semillas. — **✓ 9m (14 nov):** «¿Es tu negocio?» en la ficha de un negocio sin dueño → /recuperar/{id}; no sale en uno con dueño. Prueba: `vec9m`.
- [x] **Decisiones tomadas sin el diseño (confirmar con el fundador):** texto del aviso al dueño actual en su panel
  (R2), las 3 plantillas de «Rechazar», el detalle del caso en «Cambios sensibles» (compuesto con piezas del admin). — **✓ 9a (11 nov):** textos del aviso al dueño (R2), las 3 plantillas de Rechazar y el detalle de Cambios sensibles (REVISION 9a).
- [x] **9g** · **«Llamar» desde una semilla** abre el teléfono pero aún no se cuenta (la tabla `contact_taps` ya admite `seed_id`). — **✓ 9g (14 nov):** `registrarToqueSemilla` (mismas reglas que un negocio) desde la tarjeta de la semilla; Analítica › Resumen: toques, semillas y «las que más llaman». Evidencia: `ana9g` (sin correr aquí).
- [x] **→ 9b** · **Guardián de tipos de parámetros SQL:** el error «inconsistent types deduced for parameter» salió dos veces — **✓ 9b-3 (13 nov):** `parametroSinTipo` deduce el tipo de cada `$n` sin «::» desde las migraciones (lista de un insert, `set col = $n`, `col = $n`) y falla si recibe dos tipos; al revés en `alreves9b3`.
  (mismo `$n` usado como texto y uuid). Hoy lo caza la prueba punta a punta; falta un guardián estático.

## Usuarios 360° (bloque 1l, 5 nov 2026)
- [x] **→ 9n** · **Pestañas Actividad, Dinero y Comunidad** y los KPI del encabezado (pedidos, citas, Wallet, rango): con sus
  módulos. Igual la columna RANGO/ACTIVIDAD de la lista y los filtros «Con reportes», «Con saldo en Wallet», rango y
  «Promotores». — **✓ 9n-9 (15 nov):** Actividad (6j) y Comunidad (5i) ya estaban; ahora **Dinero** (solo tx:ver: cobrado 90 d, retenido, devuelto,
  tarjetas con últimos 4, últimos cobros), las cifras de arriba PEDIDOS · CITAS · RANGO, las columnas RANGO y ACTIVIDAD, «Promotores» y ORDENAR
  › Más compras / Más reportes / Rango, sobre el derivado `user_stats_cache` (**0159**, lo recalcula la base). Guardián `cifrasUsuarioDerivadas`;
  prueba usr9n9; ayuda admin-usuarios. **Wallet** (KPI, «Con saldo en Wallet», movimientos y «Ajustar») no existe en el código (solo tarjeta,
  plan fase 6 §6 #8): queda con su módulo, ver REVISION 9n-9.
- [x] **→ 9n** · **Enviar mensaje** (SMS/push, AdminMessage) y **avisos por SMS** de sanciones: con las notificaciones (Fase 2). — _9a (11 nov): los avisos de sanciones salen (mod_sancion en lib/apelaciones.ts) y existe la plantilla msg_user (lib/mensajes.ts). Falta el botón «Enviar mensaje» en Usuarios 360°._ — **✓ 9n-3 (14 nov):** Usuarios 360° › «Enviar mensaje» (app o SMS; sin enlaces; 30 por hora por persona del equipo y 3 al día por destinatario; `admin_messages` solo inserción y vaciable al borrar la cuenta) y las sanciones que quitan algo (silencio, bloqueo, suspensión, baneo) avisan también por SMS de respaldo (`mod_sancion` sin_push; la advertencia solo por la campana). Prueba `adm9n3` paso 5. El «Mensaje al dueño» de un negocio sigue abierto (necesita la bandeja del panel).
- [x] **Apelaciones** (cola de 72 h y botón en Mi cuenta): con Soporte / Confianza y seguridad. Hoy la persona ve el
  motivo y «Escríbele a Soporte». — **✓ 9a (11 nov):** apelaciones con su cola de 72 h y el botón en Mi cuenta (lib/apelaciones.ts, app/admin/Confianza.tsx; 5d); prueba com5d.
- [x] **Fusionar cuentas**: el pedido y su aplicación mueven todo lo de una cuenta a otra; se construye con un guardián
  que obligue a cada tabla nueva con `users` a declarar cómo se fusiona. No está en este bloque. — **✓ 9d (14 nov):** Usuarios 360° › Privacidad › «Fusionar con otra cuenta» → Cambios sensibles (mergeUser) → la aplica OTRA persona (`lib/datos/fusionar.ts`; `account_merges` solo inserción con `approved_by <> requested_by`); cada tabla declara `fusion` en el mapa (guardián mapaDeDatos); prueba datos9d (local, 61 ✓).
- [x] **Borrado definitivo a los 30 días** (y qué pasa con sus negocios: quedan sin reclamar): trabajos programados. — **✓ 9d (14 nov):** `lib/datos/purgar.ts` en el barrido, por el mapa; negocios sin otro dueño quedan sin dueño y su Pro termina; prueba datos9d (local, 61 ✓).
- [x] **«Ver como (solo lectura)»**, términos aceptados y avisos que recibe (Privacidad): con Mi cuenta completa. — **✓ 9d (14 nov):** Usuarios 360° › Privacidad (Ver como con motivo auditado antes de ver, Términos que aceptó, Avisos que recibe) y Mi cuenta › Privacidad › Términos que aceptaste (los Términos de uso con versión se suman en 9e).
- [x] **Decisiones tomadas sin el diseño (confirmar con el fundador):** textos de Mi cuenta y de Recomendar para la
  persona silenciada o advertida; textos al entrar (suspendida, borrándose, dispositivo bloqueado); «Silencio» y
  «Bloquear publicación» frenan Recomendar (no hay Comunidad todavía); no se sanciona ni borra a alguien del equipo. — **✓ 9a (11 nov):** textos de silencio, advertencia, suspensión y dispositivo bloqueado; desde 5c «Silencio» y «Bloquear publicación» también frenan la Comunidad; nadie del equipo se sanciona ni se borra (REVISION 9a).
- [x] **→ 9b** · **Lista de Usuarios con OFFSET** (14 por página, tope 100 páginas) y conteos con `count(*)`: cambiar a cursor — **✓ 9b-3 (13 nov):** con 1 M de cuentas: página 1 p95 50 / 48 ms y página 100 p95 49 / 56 ms (presupuesto 80 del Super Admin; cargas 43457199398 / 43460154153). Antes 900 ms: los dueños y los sancionados se cuentan sin mirar a cada persona (índice parcial de sancionados) y, sin filtros, el total es el de arriba. Se queda con páginas (tope 100).
  cuando haga falta.

## Catálogo (bloque 1m, 6 nov 2026)
- [x] **→ 9n** · **Subcategoría nueva en «Publica tu negocio»:** Publica usa la lista del diseño (lib/onb); hoy la nueva sale en la
  categoría, Buscar y el admin, no en el paso de subcategorías de Publica. — **✓ (9n-15, 15 nov):** la página de Publica lee las subcategorías vivas del Catálogo (`subcategorias_vivas`) y `catalogoVivo` (publica/logica.ts) rehace la lista del diseño con ellas: salen las nuevas, no las apagadas ni los nombres viejos de las renombradas («Yonke» → «deshuesadero», «corner store» → «Bodega de la esquina», que hasta hoy no se guardaban) (búsqueda «¿Qué haces?», «Ver más» y chips); el servidor ya las guardaba por nombre (`subcategorias_vivas`). cat1m §4b.
- [x] **→ 9n** · **Del diseño, pendiente:** mover / fusionar subcategorías, editar el nombre, plantillas de horario y placeholders
  del onboarding por categoría, activo por ciudad, límites Free/Pro editables por módulo (la matriz es de solo lectura). — **✓ 9n (18 nov):** migración 0179. Subcategorías: Editar (ES/EN), Mover (el código no cambia; «Agregar» no lo repite), Fusionar (los negocios pasan a la otra, sus sinónimos también y el nombre viejo queda como sinónimo; queda «fusionada» con su puntero y «Separar» lo deshace todo). Categoría activa por ciudad (Negocios, su página, Buscar, el mapa y Publica no la ofrecen; el servidor la rechaza al publicar) y módulo activo por ciudad (la pausa de Negocios 360° para todos los negocios de la ciudad y los nuevos; encender no quita la pausa propia). Plantilla de horario y ejemplos (nombre e ítem) de Publica por categoría, sembrados con lo que ya se veía. Límites Free/Pro (ítems, fotos Free y Pro, equipo y el techo de pedidos) en Configuración, editables por un Admin desde Módulos y Free/Pro; la ficha, el menú, el panel y Publica los leen (ninguno escrito en el código). Cada edición dice a cuántos negocios afecta, pide motivo y se audita en la misma transacción. Guardianes catalogoCompleto, categoriaPorCiudad, moduloPorCiudad, plantillasDePublica, limitesDelPlan (alrevesCat9n 29/29); e2e cat9n 51 ✓. Decisiones en REVISION «Catálogo completo».
- [ ] **→ 9n** · **Free en Servicios y Tienda:** la página de un negocio Free muestra TODOS sus servicios o productos; solo el Menú corta en el límite
  de ítems (free_items). Cortar también Servicios y Tienda (y que el panel lo diga igual) — cambia lo que hoy ven los vecinos: con el OK del fundador.
- [x] **→ 9n** · **Cotizaciones y Staff por ciudad:** su página no tiene la pausa de To'Latino (modules_off), así que el Catálogo no los apaga por
  ciudad. Darles la pausa y sumarlos a MODULOS_POR_CIUDAD. — **✓ 9n (18 nov):** ambos leen `modules_off` (clave `cot` y `staff`, las de module_types) y están en MODULOS_POR_CIUDAD (los 12). **Cotizaciones:** pre-estimado y «Pedir a hasta 3» (Auto y Hogar), «Pedir precio» de la mudanza (Transporte) y el total por escrito (Fiestas): la página no los ofrece (páginas, hoja del servicio, CTA «Llama al negocio») y el servidor rechaza el pedido con «Este negocio no recibe solicitudes de precio en línea por ahora: llama al negocio.» (`lib/modulo-pausa.ts`); los candidatos de «hasta 3» quitan al negocio pausado. **Staff:** la ficha no presenta al equipo (pestaña, riel, «Ver equipo», tarjetas, «Quién está detrás») y reservar NO cambia (elegir con quién es de Citas). Negocios 360° pausa ambos para un solo negocio (moduloPausar) y el dueño ve el motivo en su panel. Guardián moduloPorCiudad: cada clave de MODULOS_POR_CIUDAD tiene su lector (LECTORES) y una clave sin lector falla; al revés en alrevesCat9n (42/42); e2e `cat9n2` 48 ✓. Decisiones en REVISION «Cotizaciones y Staff por ciudad».
- [ ] **→ 9n** · **Categoría apagada en la ciudad · sin diseño:** su página responde 404; falta el estado «todavía no está en tu ciudad» (diseño).
- [x] **Decisiones tomadas sin el diseño (confirmar):** el nombre nuevo se escribe «español / inglés» en un solo campo;
  los módulos se listan sin la etiqueta «ACTIVO» del prototipo porque todavía no existen (llegan con sus fases). — **✓ 9a (11 nov):** nombre «español / inglés» en un campo y los módulos sin la etiqueta «ACTIVO» (REVISION 9a).
- [x] **9g** · **Búsquedas sin oferta** cuenta solo «Avísame cuando haya»; las búsquedas sin resultado (search_logs) entran con la
  analítica. — **✓ 9g (14 nov):** Búsquedas sin oferta suma «Buscaron y no hubo resultados» de `search_logs` (solo lo que buscaron 2 o más personas; las anónimas cuentan como una). Evidencia: `alreves9g` (el «2 o más») y `ana9g`.

## Analítica propia (bloque 1n, 6 nov 2026)
- [x] **→ 9b** · **Escala:** `app_events` sin particiones (BRIN por fecha); particionar por mes y resúmenes diarios cuando crezca — **✓ 9b-3 (13 nov):** 0133: `app_events` particionada por mes (BRIN en cada partición, partición por omisión que `app_events_mes` reparte), `app_events_dia` (resumen por día, ciudad, nombre, app y plataforma) y la retención `eventos_retener_meses` (13, lo que dicen las tiendas): el barrido resume el mes y suelta su partición. Medido con 5 M de eventos (PROGRESS 9b-3).
  (necesita trabajos programados). Política de cuánto tiempo se guardan los eventos (privacidad): decidir y programar.
- [x] **9g** · **Pestañas del diseño pendientes:** Dinero (MRR, conversión a Pro, devoluciones, ticket promedio), Comunidad y
  eventos, vecinos por rango, reportes por mil operaciones y tickets: con sus módulos. Envío semanal de reportes por
  correo (interruptor del diseño): con las notificaciones. — **✓ 9g (14 nov):** pestaña Dinero (MRR, conversión a Pro, devoluciones, ticket promedio, no llegaron, 8 semanas, por tipo, dinero por estado) de `metricas_dinero_dia` y `metricas_pro_dia`; Soporte y confianza con reportes por cada 1,000 operaciones y casos de Soporte; Comunidad y Eventos ya eran pestañas; reportes programados por correo (Analítica › Reportes, interruptor como el prototipo). Evidencia: funciones contra la base local con la semilla 0055; `ana9g` (sin correr aquí).
- [x] **9g** · **Embudo:** el diseño termina en «El negocio aceptó»; en la Fase 1 termina en «Contactaron» (Llamar, WhatsApp,
  Cómo llegar). Confirmar el texto con el fundador. Etiquetas cortas porque el componente de barras corta las largas. — **✓ 9g (14 nov):** Resumen suma el embudo de buscar a «El negocio aceptó» (enviaron un pedido o una cita → el negocio aceptó); el de «Contactaron» sigue. El texto queda para tu OK (REVISION 9g).
- [ ] **→ 9s** · **Grabación de sesiones (rrweb, con consentimiento)** y Web Vitals propios (HERRAMIENTAS §2 y §4): bloque aparte. — _9b-3 (13 nov): no es de la escala; va con la Analítica completa (9g)._ — _9g (14 nov): no se construyó; rrweb → 9s y Web Vitals → 9j, con su porqué en «Fase 9 · 9g»._
- [x] **9e** · **Aviso de privacidad** que diga qué mide To'Latino (sin terceros): /privacidad «Lo que no hacemos» (analítica propia, sin rastreo ni
      publicidad de terceros) y «Con quién se comparten» (docs/legal/us/privacidad.{es,en}.md). Evidencia: leg9e 72 ✓ dos veces seguidas. (9e, 14 nov)

## Menú (bloque 2a, 6 nov 2026)
- [x] **Pestaña Menú en la ficha, carrito y pedido:** hecho en el bloque 2b.
- [x] **«Lo que vendes» con los demás módulos** (Servicios, Tienda, Renta, Citas, Reservaciones, Pedidos en línea,
  Staff, Eventos, Novedades, Jobs) y «Tu herramienta» de la categoría: con sus fases. Hoy solo Menú (Comida). — **✓ 9a (11 nov):** «Lo que vendes» con todos los módulos y «Tu herramienta» de cada categoría (app/panel/; Fases 2–4).
- [x] **Traducir con El Compa** (plato, categoría, grupo): Fase 7. — **✓ 9a (11 nov):** decisión del plan (§6 #9 de la Fase 7, L1140): «Traducir» usa el traductor propio.
- [x] **→ 9n** · **«Últimos 30 días» del plato** (pedidos, vendido, puesto) y Populares por lo más pedido: con los pedidos (2b/2c). — _9a (11 nov): «Últimos 30 días» del plato (pedidos, vendido, puesto) no está en el editor del Menú._ — **✓ 9n-2 (14 nov):** «Últimos 30 días» en el editor del plato (pedidos, vendido, unidades, puesto) y Populares = fijados + lo más pedido (≥3 pedidos entregados en 30 días, máx. 6), una sola definición en lib/menu-ventas.ts. Guardián popularesPorLoMasPedido; pan9n2 §7.
- [x] **Aviso por SMS de «quedan pocos»:** la preferencia se guarda; el SMS llega con las notificaciones. — **✓ 9l (14 nov):** el pedido que cruza el umbral de Menú › Inventario (2, 3 o 5) avisa al dueño una vez (`biz_quedan_pocos`; lib/pedir.ts quedanPocos()).
- [x] **«Listo en N min»:** desde 2b sale de `delivery_settings.prep_min` (20 por defecto) + tiempo extra + el plato que más tarda.
- [x] **Fotos de ejemplo del sandbox** vienen de Pexels (como el prototipo); las de los negocios reales son propias. — **✓ 9a (11 nov):** las fotos de Pexels son solo de la semilla del sandbox; producción nace vacía (decisión I) y cada negocio sube las suyas.


## Pedir comida (bloque 2b, 6 nov 2026)
- [x] **Aceptar / rechazar, etapas (cocina, listo, entregado), SIN RESPUESTA a los 10 min, Cancelar del cliente, Clientes y
  Pedidos en línea en el panel:** hecho en el 2c.
- [x] **Proponer un cambio** (falta un plato: ChangeProposal 2k) y **Ayuda con el pedido** (APP-NEG-PEDIDO-AYUDA con
  HelpRequest y su cola): con Soporte (2i). — **✓ 9a (11 nov):** Proponer un cambio (change_proposals, 2k) y Ayuda con el pedido con su cola (lib/ayuda.ts, 2i); pruebas cambio2k, ayuda2i.
- [x] **Avisos** al cliente y al negocio (SMS / push: pedido nuevo, aceptado, listo): con las notificaciones. Hoy la
  página del pedido se actualiza sola cada 20 s y el panel al abrirlo. — **✓ 9a (11 nov):** avisos del pedido al cliente y al negocio (ord_ok, ord_ready, ord_way, ord_here, ord_no; lib/avisos.ts, app/panel/acciones-pedidos.ts; push 8c).
- [x] **Nota de cómo se recoge** (pickup_note): se edita en Entrega (DASH-ENTREGA): hecho en el 2f.
- [x] **→ 9n** · **Devolver dinero y Pedir reseña** (SMS «¿Cómo estuvo?») en un pedido entregado: con tarjeta (2d) y las notificaciones. El cliente ya escribe la reseña desde su pedido (2g). — _9a (11 nov): devolver dinero de un pedido con tarjeta existe (2d, lib/cobros.ts); falta «Pedir reseña» (SMS «¿Cómo estuvo?») en un pedido entregado._ — _(9n-2, 14 nov): «Pedir reseña» hecho (botón en el pedido entregado, una vez por pedido, ≤14 días, una por cliente por semana; SMS plantilla resena_pedir; guardián resenaPedidaUnaVez; pan9n2 §3). Devolver dinero sigue con lo de dinero (9n-3)._ — **✓ (comprobado 15 nov, 9n-13):** «Devolver dinero» sale en todo pedido cobrado con tarjeta, también el entregado (app/panel/Pedidos.tsx `puedeDev`: cobrado o devuelto en parte; solo quien tiene Cobros), total o parcial con motivo (acciones-pedidos.ts); pagos2d lo prueba. Nada más que construir.
- [x] **Pago con tarjeta** (retener al enviar, cobrar al aceptar), Wallet y cupones: 2d / Fase de Planes. Hoy solo pago en
  el local y no hay cupones. — **✓ 9a (11 nov):** pago con tarjeta: retener al enviar, cobrar al aceptar (lib/pagos, lib/cobros.ts; pagos2d); cupones de negocios (5g, lib/cupones.ts). Apple / Google Pay nativo → después de abrir (L1149).
- [x] **Delivery** (zona, envío, mínimo, propina, cómo te lo entregamos): hecho en el 2f, con efectivo al entregar.
- [x] **→ 9m** · **Hoja «Entra para pedir» (AuthSheet 2m):** el componente del sistema solo trae textos en español y no muestra
  errores; mientras, «Ir a pagar» sin cuenta usa la pantalla Entra (bilingüe) y vuelve al pago con el pedido igual. — **✓ 9m (14 nov):** `HojaEntrar` sobre la ficha (el pedido se queda igual) con el AuthSheet del sistema en ES/EN (props nuevas por `portar-sistema.mjs`) y el error del servidor (`role="alert"`). Pruebas: `vec9m` (en inglés, código malo), `menu2b`.
- [x] **→ 9c** · **Accesibilidad del sistema de diseño:** `Button` es un `div` sin `role="button"` ni teclado (lo cazó la prueba del
  2b). Corregir en `packages/ui` y sumar la regla a la revisión de accesibilidad. — **✓ (comprobado 15 nov):** ya resuelto en 9c: `scripts/portar-sistema.mjs` (`accesibilizar`, tabla A11Y) da a cada `<div>`/`<span>` con clic del sistema rol, foco y teclado con `__ds_scope.__btn` (packages/ui/src/ds/scope.js); Button e IconButton con su parche; lo vigilan los guardianes `botonAccesible` y `clicConTeclado` y axe en el CI.
- [x] **Mi cuenta › Pedidos** (la lista de los pedidos de la persona): 2h. Hoy se llega por el enlace del pedido. — **✓ 9a (11 nov):** Mi cuenta › Pedidos (app/(app)/cuenta/pedidos); prueba cuenta2h.
- [x] **Super Admin › Transacciones** (línea de tiempo por pedido): 2i. Hoy el 360° muestra cuántos pedidos van este mes. — **✓ 9a (11 nov):** Super Admin › Transacciones con la línea de tiempo (app/admin/Transacciones.tsx, 2i/4g).
- [x] **→ 9m** · **Alergias en el menú del cliente:** el panel las guarda; el prototipo del cliente no las muestra. Preguntar al
  fundador dónde salen. — **✓ 9m (14 nov):** La hoja del plato trae «LLEVA O ES · LO MARCÓ EL NEGOCIO» con las etiquetas del panel (picante, vegetariano, sin gluten, pescado o mariscos, lácteos, huevo, maní o nueces). Decisión en REVISION 9m. Prueba: `vec9m`.
- [x] **→ 9n** · **Hora del pedido programado** con el reloj del negocio: los horarios que cruzan la medianoche se programan solo hasta las 11:30 PM. — **✓ 9n-2 (14 nov):** los horarios que cruzan la medianoche se programan hasta una hora antes de cerrar, con el reloj del negocio («12:30 AM · de madrugada»). Guardián programadoCruzaMedianoche; pan9n2 §7b.

## Reservaciones de mesa (bloque 2e, 6 nov 2026)
- [x] **Cambiar una reservación ya confirmada** (el cambio queda pendiente y la actual sigue en pie): hecho en el 2k
  (6 nov); el lado del panel compuesto, pendiente del OK del fundador (REVISION 4).
- [x] **→ 9t** · **«Avísame si se libera» (lista de espera) y «Otros restaurantes con mesa»** en la pantalla de «no pudo»: con las
  notificaciones (SMS). — _9a (11 nov): «Avísame si se libera» existe para citas (lib/citas.ts) y la lista de espera de boletos (lib/espera.ts); falta en la pantalla «no pudo» de una reservación de mesa, con «Otros restaurantes con mesa»._ — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m: la lista de espera de una mesa y «Otros restaurantes con mesa» en la pantalla «no pudo»._ — **✓ 9t (19 nov · 0180):** «Avísame si se libera a esa hora» (`reservation_waitlist`, estados, una viva por persona/hora/personas; lib/mesa-espera.ts): solo si esa hora sigue llena con el mismo motor; el barrido de cada minuto, con el candado del restaurante, le GUARDA la mesa a la primera de la fila (retención a su nombre, `rsv_espera_min` de Configuración › Avisos, 10 de fábrica) y le avisa UNA vez (`rsv_libre`, push primero, SMS de respaldo, enlace a la mesa; en sus horas de silencio no se le ofrece); «Tomar la mesa» / «No, gracias»; Mi cuenta › Avisos › Tus alertas con «Quitar»; Super Admin › Transacciones muestra el estado de la lista. «Otros restaurantes con mesa» (`otrosConMesa`): misma ciudad, activos, Pro, Reservaciones encendido y sin pausa, la hora libre más cercana con `areaLibre`, ≤ 24 candidatos en 6 lecturas, ≤ 5. Panel: nada nuevo (sin diseño; REVISION). Guardianes `esperaMesaUnaVez`, `otrosConMesaDeLaCiudad` (alreves9t2 31/31); e2e `rsv9t` 37 ✓ en local. Ayuda `reservar-mesa`.
- [x] **Avisos por SMS** (al confirmar, el día de la reservación, al proponer otra hora) y al restaurante (solicitud
  nueva): con las notificaciones. Hoy la pantalla se actualiza sola cada 20 s y el panel al abrirlo. — **✓ 9a (11 nov):** avisos de reservaciones (rsv_ok, rsv_alt, rsv_no, rsv_chg_*) y al restaurante (biz_req); app/panel/acciones-reservas.ts; prueba rsv2e.
- [x] **Evento privado** (grupos grandes, APP-NEG-EVENTO-PRIVADO): hoy se ofrece Llamar; la solicitud de evento llega con
  Cotizaciones. — **✓ 9a (11 nov):** evento privado con su solicitud, propuesta y depósito (6i, lib/evento-privado.ts); prueba evt6i.
- [x] **→ 9n** · **Historial de no-show del cliente** visible para el restaurante (cuántas veces no llegó): con Mi cuenta / Usuarios 360°. — **✓ 9n-2 (14 nov):** la reservación dice cuántas veces no llegó a ESE negocio en el último año (solo lo del negocio; el panorama completo es del Super Admin). Guardián noShowSoloDelNegocio; pan9n2 §4.
- [x] **Plan Pro:** Reservaciones es de Pro; el botón «Ver Pro» del candado espera la Fase de Planes. — **✓ 9a (11 nov):** el candado lleva a Pro con «Ver Pro» (app/panel/pro-cta.ts, 2m).
- [x] **Fotos de Pexels** (semilla) no cargan en el entorno de pruebas sin salida a internet: la tarjeta de la solicitud
  muestra el fondo gris. En el sandbox real sí cargan. — **✓ 9a (11 nov):** solo pasa en local sin salida a internet; en el sandbox cargan (nota, sin cambio).

## Entrega y delivery (bloque 2f, 6 nov 2026)
- [x] **App To'Latino Repartidor** (`/repartidor`): sin pantallas en el diseño (pregunta 6 en `docs/REVISION.md`). Con
  ella llegan: foto al dejarlo en la puerta (prueba de entrega), espera de 5 min si no abren, mapa en vivo del
  repartidor, «Tus repartidores» (invitar con código), Despacho y Cuadre de efectivo en el panel. Mientras, el negocio
  marca «Salió en camino» y «Entregado» en su panel, y el pago no promete la foto. — **✓ 9a (11 nov):** App To'Latino Repartidor (/repartidor, 2l y 8e): foto al dejarlo, espera, mapa en vivo, Tus repartidores, Despacho (app/repartidor, lib/repartidor.ts, lib/ruta-vivo.ts); pruebas rep2l, app8e.
- [x] **Enlace de seguimiento por SMS** al cliente (app externa) y avisos «en camino» / «entregado»: con las notificaciones. — **✓ 9l (14 nov):** el SMS de «va en camino» lleva el enlace del pedido (notif_templates.sms_enlace: ord_way, merc_camino, cita_camino, caja_salio, chofer_salida, ord_tarde), donde está el seguimiento (también el de la app externa), y «Tu pedido llegó» al entregar (`ord_entregado`, una vez).
- [x] **→ después de abrir (DA-02)** · **App externa conectada de verdad** (DoorDash Drive / Uber Direct por API): hoy el negocio pide el repartidor en la
  app externa y pega el enlace. Conectarla sería un servicio externo nuevo: decisión del fundador. — _9a (11 nov): conectar DoorDash Drive / Uber Direct es un servicio externo nuevo (regla 3): decisión del fundador. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **Delivery con tarjeta** (envío y propina cobrados en la app): con el 2d. Hoy solo efectivo al recibir. — **✓ 9a (11 nov):** delivery con tarjeta: envío y propina (2f/2d; app/repartidor, lib/cobros.ts); prueba dlv2f4.
- [x] **→ 9t** · **Calles del Censo (TIGER) en el sandbox:** se cargan con `.github/workflows/direcciones.yml`; en el entorno local
  de pruebas se usan calles sintéticas. Producción las carga en la fase 9.

## Reseñas (bloque 2g-1, 6 nov 2026) — **✓ 19 nov:** el despliegue del sandbox las carga solo (`infra/pruebas/deploy.sh` 3e, unidad `tolatino-direcciones`); estado-sandbox 44603798811: `/api/direcciones?q=40 N Church St Hazleton` y `435 Hamilton St Allentown` responden con calidad «numero» (el número exacto del tramo del Censo).
- [x] **Rango y puntos** del vecino en la tarjeta («SARGENTO · 23 RESEÑAS», «+15 PUNTOS»): hecho en 5f (desde Sargento; +15 si la reseña
  verificada sumó). Falta solo la nota de rango en «Tu reseña» del formulario de escribir (texto del diseño, sin dato nuevo).
- [x] **«Ver traducción» (D3)** en reseñas y respuestas: con el servicio de traducción. — **✓ 9a (11 nov):** «Ver traducción» propia en reseñas y respuestas (5h, lib/traduccion.ts); prueba com5h.
- [x] **→ 9m** · **«Lo que más mencionan»** (temas): se calcula del texto; hoy no sale. — **✓ 9m (14 nov):** `review_topics` (0143) lo calcula el barrido (`temasResenas`, incremental, diccionario ES/EN en `lib/temas.ts`); Reseñas trae «LO QUE MÁS MENCIONAN» con 2+ menciones. Prueba: `vec9m`.
- [x] **Preguntas de cada categoría** en «Lo que importa» (belleza, autos, hogar, salud…): con la fase de cada categoría. Hoy:
  Comida; las demás escriben estrellas, texto y fotos. — **✓ 9a (11 nov):** preguntas de reseña por categoría (Fase 4: res4g, res4m, res4s, res4z, noc4d).
- [x] **Reseña de una cita** (VERIFICADA · CITA) y **de una reservación** desde su pantalla: la mesa ya cuenta como verificada;
  el botón en la pantalla de la reservación terminada llega con Mi cuenta (2h). — **✓ 9a (11 nov):** reseña verificada de una cita y de una reservación desde su pantalla (3c/2h; res4g, res4m).
- [x] **Ayuda con el pedido** desde una reseña de 2★ o menos: con Soporte (2i). — **✓ 9a (11 nov):** una reseña de 2★ o menos ofrece «Ayuda con…» (Fase 4: noc4d, res4s).
- [x] **Avisos** (al negocio: reseña nueva; al autor: respuesta, resultado de un reporte): con las notificaciones. — _9a (11 nov): el aviso de una respuesta del negocio y el resultado de un reporte existen en la bandeja; no hay plantilla de «reseña nueva» al negocio en notif_templates._ — **✓ 9l (14 nov):** «Reseña nueva» al dueño, una vez por reseña (`biz_resena`, lib/resenas.ts).
- [x] **→ 9n** · **El negocio «quiere arreglarlo»** (propuesta en la respuesta) y **editar la respuesta**: el panel del diseño no los tiene. — **✓ 9n-2 (14 nov):** «Quiero arreglarlo» al responder (≤3 estrellas) y editar la respuesta (3 veces, 7 días, historial en review_reply_history solo inserción); el cliente y la página lo ven («quiere arreglarlo», «editada»). Guardián respuestaDeResenaConHistorial; pan9n2 §5.
- [x] **Auto-moderación** («5 reseñas sin transacción en 10 min» → cola) y filtros de reseñas sospechosas en Contenido: con
  Contenido (2i). — **✓ 9a (11 nov):** auto-moderación de reseñas en ráfaga a la cola (lib/colas.ts, lib/barrido.ts; Confianza) — 5d.
- [x] **Mi cuenta › Reseñas** (escritas / por escribir): con Mi cuenta completa (2h). — **✓ 9a (11 nov):** Mi cuenta › Reseñas (app/(app)/cuenta, 2h); prueba cuenta2h.
- [x] **Semilla:** solo Sabor Dominicano trae reseñas de ejemplo (pregunta 8). — **✓ 9a (11 nov):** la semilla del sandbox trae reseñas de un solo negocio a propósito (pregunta 8); producción nace vacía.

## Novedades (bloque 2g-2, 6 nov 2026)
- [x] **«Hoy en el barrio»** en la portada (lo de las últimas 24 h de la ciudad, StoryCard) y su chip en la publicación. — **✓ 9a (11 nov):** «Hoy en el barrio» en la portada y su chip (5e, lib/hoy.ts); prueba com5e.
- [x] **→ 9n** · **Cupón para seguidores** (código, compra mínima, usos): con los cupones en el pago (2d / Planes). — _9a (11 nov): los cupones de negocios existen (5g); falta «Cupón para seguidores» como tipo de novedad._ — _(9n-2, 14 nov): no entró: cambia lo que se cobra (cupones en el pago) y queda con el bloque de dinero._ — **✓ 9n-21 (15 nov):** novedad «Cupón para seguidores» (código, descuento, mínimo, usos, vence siempre; 0169), el código solo para quien sigue, «Código de cupón / Aplicar / Quitar» y la línea del cupón en el pago (diseño del prototipo), lo decide el servidor al crear el pedido (lib/cupon-seguidores.ts: en vivo, sigue, una vez, quedan usos, mínimo), impuesto sobre lo que queda y comisión sobre lo que paga el cliente, uso en follower_coupon_uses (vuelve si el pedido no sigue: trigger); pedido, panel y Transacciones lo dicen. Guardián cuponDelServidor (alreves9n21 9/9); e2e cup9n21; ayuda.
- [x] **→ 9n** · **Evento y vacante** como tipo y como botón: con Eventos (y Jobs, ya hecho: falta el botón «Ver vacante» en una novedad). **«Escribir»**: con Mensajes. — _9a (11 nov): falta el botón «Ver vacante» en una novedad y «Escribir» con Mensajes._ — _(9n-2, 14 nov): «Ver vacante» hecho (link_kind job, sale solo con la vacante abierta; pan9n2 §9). «Escribir» con Mensajes sigue abierto._ — **✓ 9n-12 (15 nov):** «Escribir» como botón de una novedad (diseño lk 'msg': «Escríbele a {negocio}» · Escribir → Mensajes con el negocio; solo si recibe mensajes). **0162**; nov2g.
- [x] **→ 9n** · **«Repetir»** (todos los días, lun · mié · vie…) y **«Avisar a tus seguidores»**: con las notificaciones. — _(9n-2, 14 nov): «Avisar a tus seguidores» hecho (una vez por novedad, 2 al día, respeta Lo que traen hoy / Ofertas; guardián novedadAvisaUnaVez). «Repetir» (días de la semana) sigue abierto: pide un trabajo del barrido que republique la novedad._ — **✓ 9n-11 (15 nov):** «Repetir» en el editor (diseño schedBlocks: QUÉ DÍAS, Sale a las, CADA VEZ SE VE, HASTA CUÁNDO); la base calcula la primera vez y el barrido la vuelve a sacar (`novedad_siguiente` / `novedad_fin`, **0161**), se salta los días que el negocio cierra y avisa a los seguidores solo la primera vez. Guardián `novedadRepetida`; nov2g; ayuda panel-novedades.
- [x] **→ 9n** · **PEDIDOS** que salen de una novedad (hoy el detalle muestra comentarios en su lugar). — **✓ 9n-2 (14 nov):** el detalle de una oferta muestra los pedidos al precio de la oferta mientras estuvo en vivo (pedidos, unidades, vendido); se calcula al leer. pan9n2 §9. Una novedad que no es oferta no cuenta pedidos (no hay forma de atribuirlos).
- [x] **→ 9m** · **Reportar una novedad o un comentario** desde la página (la cola «Reportes de contenido» ya acepta novedades y
  comentarios; falta el botón en la tarjeta, que el diseño no trae). — **✓ 9m (14 nov):** «Reportar esta publicación» en cada novedad → Super Admin › Contenido (una vez por persona; ocultarla cierra los reportes abiertos). Prueba: `vec9m`.
- [x] **→ 9n** · **Elegir fotos de tu galería** en el editor (hoy se suben nuevas). — **✓ 9n-2 (14 nov):** el editor ofrece «O elige de tu galería»: se copian a la novedad, la galería no cambia. pan9n2 §9.

## Jobs (bloque 2g-3, 6 nov 2026)
- [x] **Avisos por SMS** de cada respuesta a la persona y de cada solicitud nueva al negocio: con el proveedor de SMS y las
  notificaciones. Hoy se ven en la solicitud y en Hoy. — **✓ 9l (14 nov):** `job_reply` ya llevaba SMS; `biz_job` (solicitud nueva al negocio) pasa a SMS de respaldo del push (0142).
- [x] **→ 9m** · **«Avísame de nuevas vacantes»** (vecinos) y el aviso al publicar: con las notificaciones. — _9l (14 nov): pasa a 9m: la suscripción va en la pantalla de vacantes de Buscar (L311, 9m); la plantilla y el barrido siguen el patrón de «Avísame cuando haya» de 9l._ — **✓ 9m (14 nov):** En Buscar «empleo»: «Avísame de nuevas vacantes» (search_alerts kind «vacantes», una por ciudad); el barrido avisa una vez por vacante (`vacante_nueva`, de 9 a 20 h, hasta 3 al día). Prueba: `vec9m`.
- [x] **→ 9n** · **«Traducir con El Compa»** en el editor: con El Compa. — _9a (11 nov): falta «Traducir con El Compa» en el editor de vacantes (solo existe en el Menú: app/panel/Menu.tsx)._ — **✓ 9n-2 (14 nov):** en el editor de vacantes y en el del plato (app/panel/acciones-traducir.ts, traductor propio; sin traductor lo dice). pan9n2 §9.
- [x] **→ 9m** · **Mis solicitudes** en Mi cuenta (lista de las J-… de la persona y las vacantes guardadas): con 2h Mi cuenta. — _9a (11 nov): falta «Mis solicitudes» en Mi cuenta (lista de las J-… y las vacantes guardadas)._ — **✓ 9m (14 nov):** Ya estaba servido: Mi cuenta › Empleos (las J-… con su estado, 2h) y Guardados › Vacantes. Revisado contra lo servido en 9m.
- [x] **→ 9m** · **Reportar una vacante** desde la página (la cola «Reportes de contenido» aún no acepta vacantes; el diseño no trae
  el botón). — **✓ 9m (14 nov):** «Reportar esta vacante» en la página de la vacante (teléfono y escritorio) → la cola de Contenido acepta «job» (0143). Prueba: `vec9m`.
- [x] **→ 9m** · **Vacantes en Buscar y en la portada de la ciudad** («Empleos en Hazleton»): el diseño las ubica en la pestaña del
  negocio; decidir si van en Buscar. — **✓ 9m (14 nov):** Van en Buscar (hasta 3 que encajan, «empleo» las trae todas) con «Avísame de nuevas vacantes». La portada de la ciudad no las lleva (el diseño las ubica en el negocio). Prueba: `vec9m`.

## Mi cuenta (bloque 2h, 6 nov 2026)
- [x] **Borrado definitivo a los 30 días** de lo que pidió la persona (`users.delete_at`, `delete_reason`): un trabajo
  programado borra perfil, direcciones, guardados, reseñas y comentarios, cierra solicitudes y quita los pedidos de la
  cuenta (lo que la pantalla promete). Hoy solo queda programado y se cancela al entrar. — **✓ 9d (14 nov):** purga por el mapa (`data_map`, `purge_runs`/`purge_items`, `datos_purga_pendiente`); entrar solo cancela ANTES de la fecha; el mismo teléfono = cuenta nueva; prueba datos9d (local, 61 ✓).
- [x] **Verificar el correo** (enlace) y **recibos por correo**: con el proveedor de correo. — **✓ 9l (14 nov):** el enlace es de un uso y solo vale el último que se pidió (email_verifications.revoked_at); recibos de pedido, mesa, Pro y boletos (con los botones de Wallet). avi9l sección 5 y 6.
- [x] **Avisos al teléfono** que respeten `users.notif_prefs` (pedidos, reservas, empleos, negocios guardados, correo,
  horas de silencio) y el aviso «cambiaste tu número» al número viejo. — _9a (11 nov): las preferencias y horas de silencio se respetan (Mi cuenta › Avisos, lib/avisos.ts; 2h/8c). Falta el aviso «cambiaste tu número» al número viejo._ — **✓ 9l (14 nov):** «Tu número de To'Latino cambió» al número viejo (`cuenta_tel_cambio`, crítico; lib/perfil.ts cambiarTelefono).
- [x] **→ 9t** · **Boletos, Mensajes, Pagos y Wallet, Apartados, platos y eventos guardados, Ayuda y soporte, Descargar mis datos,
  letra más grande, ajustes de la comunidad**: con sus fases (REVISION 11). — _9d (14 nov): «Descargar mis datos» hecho (Mi cuenta › Ajustes › Privacidad; prueba datos9d). Lo demás de la lista se revisa contra lo servido en 9m._ — _9m (14 nov): Revisado en 9m contra lo servido: Boletos, Mensajes (en vivo), Pagos y movimientos, Descargar mis datos, Ayuda y Soporte, ajustes de la Comunidad ya están. Quedan: los Apartados en una lista de Mi cuenta, los platos guardados (el plato no se guarda todavía) y la letra más grande._ — **✓ 9t (19 nov):** los Apartados vivos en Mi cuenta › Pedidos › Todos (diseño ordersV: LISTO/ESPERANDO/FALTA ALGO/EN PLAN, VENCE, AL RECOGER, «Cómo llegar» con el punto público, «Ver el negocio»; `apartadosActivos`, guardián `apartadosEnMiCuenta`) y «Letra más grande» en Ajustes › Idioma y pantalla (users.big_text, 0180; el marco de la app la aplica desde el servidor en la primera pintura; guardián `letraGrandeDelServidor`); e2e `bus9t` (sin scroll de lado a 390 en 6 pantallas). Los platos guardados pasan a la línea de abajo (sin diseño del control).
- [x] **→ 9t** · **Platos guardados:** la hoja del plato no tiene control de guardar en el diseño (el prototipo tampoco); la lista «Platos y productos» de Guardados sí (favV). Propuesta en REVISION «9t» (el cuadro del corazón de la barra de la vacante junto al contador); con el OK se construyen el control, la tabla (solo inserción, `removed_at`), la acción y la lista (un plato quitado u oculto sale «No disponible», nunca rompe). (9t, 19 nov) — **Hecho (19 nov, OK del fundador):** migración 0193 `item_saves` (nada se borra: `removed_at`; una viva por persona y plato; disparador), `lib/platos-guardados.ts` (la regla de la ficha), `platoGuardar`, el corazón (50 px, `aria-pressed`) a la izquierda del contador, Guardados › «Platos y productos» con «Pedir» y «No disponible», mapa de datos (archivo `platos_guardados`, purga, fusión), guardián `platosGuardadosSinBorrar` (alreves9tplatos 27/27), e2e plat9t, ayuda mi-cuenta.
- [x] **Invita vecinos con código** (quién invitó a quién) cuando exista la gamificación. — **✓ 9a (11 nov):** invita vecinos con código (lib/invitar.ts, 5f/5g); prueba com5f.
- [x] **→ 9m** · **Alertas de búsqueda** («Avísame cuando haya») listadas en Avisos con «Quitar». — **✓ 9m (14 nov):** Mi cuenta › Avisos › «Tus alertas» lista las de búsqueda y las de vacantes, cada una con «Quitar» (queda `removed_at`, no se borra). Prueba: `vec9m`.

## Ayuda con el pedido y Soporte (bloque 2i, 6 nov 2026)
- [x] **→ 9n** · **Devolución a la tarjeta y reponer con un pedido nuevo sin costo**: con Stripe (2d) y el Repartidor. — _9k (14 nov): la devolución a la tarjeta desde la ayuda ya existe (7b «Resolver y devolver»; ahora repartida entre cobros). Reponer es crear un pedido de $0 que sigue el flujo del negocio y del Repartidor: va con lo diferido del negocio y el Repartidor (9n)._ — **✓ 9n-4 (14 nov):** «Reponer sin costo» en el panel (al responder la ayuda) y «Resolver y reponer» en Colas: un pedido NUEVO de $0 (pay_mode 'none', $0 por plato, fuera del tope de Free) con los platos de la solicitud, aceptado y con su código de entrega (sigue el flujo del negocio y del Repartidor); uno por solicitud (help_requests.replacement_op_id único, 0148). «Resolver y devolver» también en la ayuda de un pedido. lib/ayuda.ts reponerEn; guardián reponerSinCosto; din9n4 F1.
- [x] **Soporte completo**: tickets por WhatsApp y correo, macros ES/EN, primera respuesta y CSAT; ayuda con citas y reservaciones. — 7b (10 nov):
  casos en la app, macros ES/EN, plazo de primera respuesta en horas hábiles y «¿Se resolvió?» hechos. Falta: **WhatsApp** (7h) y **correo
  entrante** (§6 #16, sin fecha). — **✓ 9l (14 nov):** correo entrante por SES (solo lo firmado; lib/correo/entrante.ts) y la respuesta del equipo por correo y por WhatsApp dentro de las 24 h (lib/soporte-canales.ts).
- [x] **Avisos** al negocio de una solicitud nueva y al cliente de la respuesta (SMS/push). — **✓ 9a (11 nov):** avisos de Ayuda: al negocio biz_help y al cliente help_reply (lib/ayuda.ts); prueba ayuda2i.
- [x] **El Compa** antes de abrir la solicitud (el prototipo lo pone primero). — 7d (10 nov): la hoja 2as sale antes del formulario en las 11
  páginas de «Ayuda con …»; apagada, al tope o con solicitud abierta, el formulario de siempre.

## Notificaciones (bloque 2j, 6 nov 2026)
- [ ] **→ 9q** · **SMS de verdad:** con la clave de Telnyx (`TELNYX_API_KEY`, `TELNYX_FROM`) en los secretos del entorno de producción
      y el registro 10DLC, los avisos salen solos (`lib/avisos.ts`). Hoy en el sandbox quedan «en modo pruebas». Sin
      reintentos todavía: un SMS que falla queda «falló» en Envíos (agregar reintento con espera antes de la fase 9).
- [x] **Push en las apps** (Fase 8): el mismo aviso como push; la plantilla ya dice qué grupo es. **Hecho en 8c (11 nov):** Web Push de verdad; APNs y
      FCM contra simuladores hasta que estén las llaves (ver «Fase 8 · 8c»).
- [x] **Anuncios in-app** (secNotif «Anuncios»): banner de un día en el home de la ciudad. Falta el banner en el inicio. _Hecho en 9f (14 nov): `announcements` (0136) con desde/hasta (31 días como máximo), para todos o solo vecinos con cuenta; el banner sale arriba del Inicio de la ciudad (InfoCard) y se crea y se retira en Super Admin › Textos y páginas › Home por ciudad (nada se borra; auditoría). Evidencia: cms9f (vivo, próximo, vencido, retirado y solo vecinos, en ES, EN y 390)._ La pestaña «Anuncios» de Notificaciones del diseño no se construyó: el banner se maneja desde Home por ciudad.
- [x] **Plantillas que faltan** porque su función aún no existe: código de entrada como plantilla editable, pedido tarde,
      recibo por correo, propuesta de evento privado, citas (confirmada / otra hora), devolución, evento cancelado, sello
      decidido, ciudad abierta, resumen semanal. Se agregan con su función. — **✓ 9l (14 nov):** código de entrada editable (`cuenta_codigo`), pedido tarde (`ord_tarde`), sello decidido, ciudad abierta (`ciudad_abierta`, el barrido avisa a la lista de espera de una ciudad abierta), resumen semanal (negocio `biz_resumen_semana` y el correo «Resumen semanal del barrio»); el recibo por correo, la propuesta de evento privado (`evp_propuesta`), las citas (`cita_ok`, `cita_alt`), la devolución (`pay_refund`) y el evento cancelado (`evt_cancelado`) ya existían. avi9l: las 21 nuevas en ES y EN.
- [x] **Cifras de entrega y apertura** (secNotif: entregados, abiertos, costo SMS): necesitan el webhook de Telnyx y push. **Push hecho en 8c**
      (Notificaciones › Push: entregados al proveedor, abiertos desde el push, SMS ahorrados); falta la entrega del SMS (webhook de Telnyx). — **✓ 9l (14 nov):** Super Admin › Notificaciones › SMS y WhatsApp: entregados, en reintento, fallidos y sin proveedor por el webhook firmado de Telnyx (y WhatsApp por los statuses de Meta). El costo por SMS va con la cuenta de Telnyx (línea nueva → 9q).
- [x] **Avisos que la pantalla ya promete y ahora pueden salir:** reporte de foto («te avisamos el resultado»), invitación al
      equipo, «Avísame cuando haya», recomendar. Engancharlos a `avisar()` con su plantilla. — **✓ 9l (14 nov):** reporte de foto, invitación al equipo, «Avísame cuando haya» y recomendar salen; guardián promesaSms SIN excepciones (cada promesa dice qué plantilla la cumple y que alguien la manda).

## Pagos con tarjeta (bloque 2d, 6 nov 2026)
- [ ] **→ 9q** · **Cuenta de Stripe (modo prueba y luego real) + Connect Express.** Claves en los secretos del entorno, por el formulario
      seguro: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET` (endpoint `/api/stripe/webhook`, eventos
      `account.updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`).
      Sin clave: el sandbox usa el simulador; producción deja la tarjeta apagada (candado + guardián `simuladorAislado`).
- [x] **→ 9k** · **3D Secure:** hoy, si el banco pide verificación extra, se pide otra tarjeta. Falta completar la acción con Stripe.js (también aplica al envío de la tienda, 4q-2, y al pedido del mercado).
      (`handleNextAction`) y confirmar el pedido después. — **✓ 9k (14 nov):** la hoja «Tu banco pide confirmar» (app/(app)/pago/Verificacion.tsx: Stripe.js handleNextAction; en el sandbox, el banco simulado con la tarjeta 4000 0027 6000 3184) y la verificación a nombre de quien paga (payment_actions, 0141); la pantalla vuelve a enviar con la misma llave y la pasarela reusa la retención verificada (nunca cobra dos veces; lib/pagos/pasarela.ts verificacionPrevia). En pedidos, el mercado, el envío y el abono de la tienda (4q-2), el pago del plan de apartado y los boletos; lo que nadie verifica vence en el barrido. Guardián tresDSecure; prueba din9k paso 1; los demás flujos, en la línea nueva de «Fase 9 · 9k».
- [x] **→ 9k** · **Disputas:** el webhook las marca y deja auditoría; falta la cola «Disputas» (120 h) con evidencia (Super Admin). — **✓ 9k (14 nov):** Super Admin › Transacciones › Disputas (`/admin/transacciones/disputas`, la cola de 120 h con plazo y estado de la evidencia) y en el caso de Colas los archivos para el banco (recibo en PDF, conversación sin teléfonos, constancia de entrega), subidos por la API de archivos y enviados en un solo envío (lib/disputas.ts responderDisputa; dispute_evidence). Guardián disputaConEvidencia; prueba din9k paso 4.
- [x] **→ 9k** · **Pagos al banco (Payout) y conciliación diaria** Stripe ↔ libro propio (guardián del dinero, HERRAMIENTAS 20):
      hoy Stripe paga según su calendario; falta fijarlo a martes y el reporte diario de diferencias. — **✓ 9k (14 nov):** los pagos al banco, fijos los martes (cuentaCrear con el calendario semanal del martes; reanudar vuelve al martes; Configuración › Dinero `pagos_banco_dia` = 2, no editable), el libro `payouts` (webhook payout.*; en el sandbox, lib/pagos-banco.ts el martes) y la conciliación diaria Stripe ↔ libro en el barrido (lib/conciliacion.ts; recon_runs / recon_diffs de solo inserción; Planes › Ingresos › Conciliación; «EL DINERO NO CUADRA» en Inicio; la alerta al equipo). Guardianes conciliacionDiaria y pagoAlBancoMartes; prueba din9k paso 3.
- [x] **→ 9k** · **Quitar una tarjeta guardada** desde Mi cuenta (Pagos) y el Wallet de To'Latino. — **✓ 9k (14 nov):** Mi cuenta › Ajustes › Pagos (`/cuenta/pagos`, USR-PAGOS: tus tarjetas con «Quitar»; queda «removed», con Stripe se desliga del cliente; la que paga Pro de un negocio no se quita sin cambiarla antes). El Wallet de To'Latino todavía no existe: va con «Pagos y Wallet» de Mi cuenta (→ 9m, arriba). Prueba din9k paso 6.
- [x] **Depósitos de citas, boletos y apartados** (comisiones 8 %, 5 % + $1, 6 % ya están en `fee_rules`): llegan con sus
      bloques. Super Admin › Planes › Comisiones (programar cambios con 30 días) también. — **✓ 9a (11 nov):** depósitos de citas, boletos y apartados con sus comisiones (Fases 3, 4 y 6) y Super Admin › Planes › Comisiones con cambios programados (app/admin/Planes.tsx, lib/admin-planes.ts); prueba adm5i.
- [x] **Recibo por correo** del pedido pagado (Fase 2, con el correo). — **✓ 9l (14 nov):** reciboPedido al terminar (lib/pedidos.ts y lib/repartidor.ts), a un correo confirmado con «Recibos» encendido.

## Repartidor (bloque 2l, 6 nov 2026)
- [ ] **→ 9r** · **App de tienda (Capacitor)** «To'Latino Repartidor» apuntando a `/repartidor` (decisión B) con su ícono; ubicación
      en vivo con permiso del sistema (mapa en vivo para el cliente y el negocio, plan §1.4) y push. _Ubicación en vivo y mapa del cliente y del negocio: hechos en 8e (11 nov; ver «Fase 8 · 8e»); la cáscara existe desde 8a y el push desde 8c. Faltan la firma y las tiendas (8h)._ — _9a (11 nov): cáscara (8a), ubicación en vivo y mapa del cliente y del negocio (8e), push (8c) hechos. Faltan la firma y las tiendas._
- [x] **→ 9n** · **Llamada y mensaje enmascarados** (hoy el botón llama al número real del cliente, solo mientras la entrega está activa). — **✓ 9n (14 nov):** decisión del plan (§6 #20, R1: sin servicio de voz): «Llamar» es al negocio y al cliente se le escribe dentro de la app (frases fijas o un texto corto sin teléfonos ni enlaces; delivery_messages solo inserción; aviso ord_rep_msg). El repartidor nunca recibe el teléfono del cliente (guardián sinTelefonoAlRepartidor). Prueba neg9n paso 3.
- [x] **→ 9n** · **Prueba de entrega** (foto, código del cliente) y **código de recogida** del negocio. — **✓ 9n (14 nov):** foto privada (privado/e/, /api/entrega/foto con permiso y auditoría) o el código del cliente con tope de intentos; código de recogida del negocio; la base exige la prueba si el negocio la pide (operations_prueba). Guardián entregaConPrueba; prueba neg9n paso 3; ayuda repartidor-prueba-de-entrega.
- [x] **→ 9n** · **Ofertas con cuenta regresiva y asignación automática**; entregas múltiples (batch); programados con recordatorio. — **✓ 9n (14 nov):** la oferta con cuenta regresiva a uno o a todos los repartidores en línea; «Aceptar» inicia la ruta (L1267); vence a oferta_seg y el negocio lo sabe. La asignación automática, los lotes (batch) y los programados con recordatorio van en «Fase 9 · 9n» (§6 #21: lotes después de abrir). Prueba neg9n pasos 1–2.
- [x] **→ 9n** · **Super Admin › Repartidores (ADM-DLV)**: lista, 360°, incidencias (cola) y sanciones. — **✓ 9n (14 nov):** lista con filtros y cursor, 360°, incidencias (cola «entrega», resolver con motivo) y sanciones (aviso, suspensión, baneo; levantar). Sección «dlv» en la matriz. Prueba neg9n paso 4; ayuda admin-repartidores.
- [x] **→ después de abrir (DA-03)** · **Repartidores de To'Latino** (registro, verificación, payout por Stripe Connect): «más adelante», por ciudad. — _9a (11 nov): Repartidores de To'Latino: «más adelante», por ciudad (§3.9). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9c** · **Accesibilidad:** el botón base ya es accesible (guardián `botonAccesible`); revisar el resto de piezas del sistema
      que usan `div` con onClick (auditoría por clase, decisión T).

## Plan Pro (bloque 2m, 6 nov 2026) — **✓ 9c (14 nov):** los 190 clics mudos del sistema pasan por el motor de `scripts/portar-sistema.mjs` (tabla A11Y; `__ds_scope.__btn`); el guardián `sistemaClicMudo` quedó en cero (antes tope 190) y `panelClicMudo` también (antes 18); prueba a11y9c.
- [x] **→ 9k** · **Reloj del servidor** (systemd timer o similar) que llame al proceso del plan cada hora, además del proceso «al usar
      la app» de hoy: que el día 30 llegue aunque nadie entre. — _9a (11 nov): el proceso del plan corre al abrir el panel (lib/panel.ts → suscripcion.procesar); no está en el barrido central: el día 30 no llega si nadie entra._ — **✓ 9k (14 nov):** el proceso del plan corre en el barrido central (lib/barrido.ts «planPro», cada minuto con su tope de 5 min por proceso): el día 30 llega aunque nadie abra el panel. Guardián barridoCompleto.
- [x] **Super Admin › Planes** (secPlan): suscripciones, MRR, extender prueba, cortesía, precio y comisiones programadas
      con 30 días (fee_rules ya lo soporta en datos). — **✓ 9a (11 nov):** Super Admin › Planes: suscripciones, MRR, extender prueba, cortesía, comisiones programadas (app/admin/Planes.tsx, lib/suscripcion.ts extenderPrueba/darCortesia); prueba adm5i.
- [ ] **→ 9s** · **Recibo por correo** de cada cobro de Pro e **impuesto** si aplica (consultar con el contador antes de la fase 9).
- [x] **→ 9k** · **3D Secure fuera de sesión** en renovaciones: si el banco pide verificación, avisar al dueño con un enlace para
      confirmar (hoy cuenta como intento fallido). — **✓ 9k (14 nov):** la renovación que pide 3-D Secure deja la verificación a nombre del dueño (hasta el próximo intento) y le avisa «Tu banco pide confirmar el cobro de Pro» con el enlace `/pago/verificar?pi=<pi>` (la misma hoja; Stripe.js confirmCardPayment con su tarjeta); al confirmar, el período se completa una sola vez (lib/suscripcion.ts completarRenovacion; también por el webhook payment_intent.succeeded). Antes de otro intento o de pasar a Free, la verificación vieja se mira (si ya cobró, no se cobra otra vez) y se suelta. Sigue contando para el calendario de 3 intentos, sin el aviso de «cobro fallido». Prueba din9k paso 2.

- [x] **→ 9t** · **Mensajes (2p):** tiempo real con WebSocket/SSE en vez de preguntar cada 4–5 s; fotos en el chat; «El Compa contesta
  por ti» y «Sugerir respuesta» (Fase 4); mensajes vecino ↔ vecino (Comunidad); traducción ES↔EN sugerida; aviso push. — _9m (14 nov): Hecho en 9m: en vivo con SSE propio (`/api/vivo`, LISTEN/NOTIFY; sin preguntar cada 4–5 s, guardián `mensajesEnVivo`); El Compa y vecino ↔ vecino ya estaban. Quedan: fotos en el chat y la traducción ES↔EN sugerida._ — _9t (19 nov): fotos en el chat (vecino en Mi cuenta y negocio en el panel; PRIVADAS bajo «privado/m/», sin metadatos, topes en el servidor, revisadas por el modelo propio al subirlas: bien → se ven; marcadas o sin servicio → «Foto en revisión» y caso en Colas › Medios; las ven solo las dos partes y el equipo con caso abierto, auditado; Mensajes reportados las muestra) y «Ver traducción» ES↔EN en la conversación (el traductor propio de 5h, misma caché y tope, solo para las partes; el Super Admin ve el original). Migración 0185, guardián `fotoMensajePrivada` (+ `traductorFueraDeTx`, `mensajesTapados`), alreves9tmsg 27/27, e2e msg9t escrita (sin correr aquí: sin Docker). El aviso push ya sale por 8c (avisar → push). Lo que queda va abajo («Mensajes · lo que quedó de 9t»)._
- [ ] **→ 9u** · **Mensajes · lo que quedó de 9t:** (1) correr **msg9t** en el CI (no corrió en la sesión que la escribió: sin Docker ni base); (2) ~~fotos y
  «Ver traducción» en los mensajes **entre vecinos** (Comunidad › Mensajes, `dm_messages`): mismo camino (privado/m/, `fotoMensajePrivada`), no se hizo~~
  **✓ 19 nov:** migración **0187** (media `'dm'` privada bajo privado/m/ — `media_dm_privada` —, `dm_messages.media_id`/`lang`, un mensaje no cambia su
  foto ni su idioma, la foto es de quien escribe, «Foto · Photo» como último texto, aviso en vivo al decidir la foto, `ugc_translations` `'dm_message'`;
  de paso arregla `dm_messages_body_check`, que hacía fallar la purga de una cuenta con mensajes entre vecinos); la misma ruta de subida con `para=dm`
  (solo con la Comunidad completa; el tope por hora cuenta las dos), `lib/mensajes-vecinos.ts` (tomarFoto/ponerFoto en la transacción del envío, después
  de los bloqueos; idioma antes de la transacción; `fotoDmVecino`; `FUENTE_TR_DM`), ver la foto: las dos personas sin bloqueo y el equipo solo con caso
  abierto (medios o reporte: `admin-dm.ts dmFotoConReporte`), auditado; Colas › Medios «Foto de Mensajes entre vecinos» y Mensajes reportados con la foto;
  la purga de 24 h (`lib/mensajes-purga.ts`) y la de la cuenta (traducciones) también las cubren. Pantalla `comunidad/mensajes/[id]/Chat.tsx` (foto,
  «Quitar foto», «Foto en revisión», «Foto quitada», «Ver traducción»). Guardián **fotoDmPrivada** (+ fotosSinEnviarSePurgan y traductorFueraDeTx
  ampliados), alreves9tdm 29/29, e2e **dm9t** (local: §1, §2 y F1 verdes; **F2 —subida real, metadatos, 413/415/403, purga de 24 h— solo corre con el
  almacén de fotos: falta correrla en el CI**). Ayuda: `docs/ayuda/comunidad-vecinos-seguir-bloquear-y-mensajes.md`;
  (3) ~~el barrido que purga las fotos subidas y **nunca enviadas** (`media.owner_kind = 'chat'`, `owner_id = 'pendiente'`, más de 24 h: hoy quedan
  privadas y sin dueño visible, solo para quien las subió)~~ **✓ 19 nov:** `lib/mensajes-purga.ts` en el barrido (fotosSinEnviar), mismas 24 h que tomarFoto, fila con purged_at; msg9t §5b, guardián fotosSinEnviarSePurgan, alreves9tpurga 6/6; ~~(4) la foto que el equipo **aprueba** llega en vivo al panel (RefrescoVivo) y a Mi cuenta
  (vuelve a traer desde la foto en revisión), pero la notificación al otro lado no se repite: si no tiene la conversación abierta, la ve al abrirla.~~ **✓ 19 nov:** al aprobarla (`decidirFotoCom`, solo lo que estaba en revisión) la otra parte recibe el aviso de siempre con «Foto · Photo» una vez: `avisarFotoAprobada` (biz_msg al equipo que lleva Mensajes / msg_user al cliente; nada con la conversación bloqueada) y `avisarFotoDmAprobada` (dm_message; nada con la conversación cerrada, bloqueo o silencio). Guardián **fotoAprobadaAvisa**, alreves9tfotoaviso 9/9, msg9t y dm9t («recibe el aviso de la foto (una vez)»; dm9t verde en local).

- [ ] **→ 9q** · **Correo (2q) · para encender en producción:** cuenta de Amazon SES fuera del «sandbox» de SES, dominio verificado con
  DKIM y SPF (+ DMARC) en Cloudflare, y en los secretos del entorno `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`,
  `SES_REGION`, `CORREO_DE` (p. ej. recibos@tolatino.com) y `TOLATINO_URL`. Rebotes y quejas (SNS → webhook) para dejar de
  mandar a correos que rebotan. Reloj propio para reintentos (hoy: perezoso, al usar la app). Resumen semanal (Comunidad).

- [x] **→ 9k** · **Disputas (2r):** suscribir el webhook de Stripe a `charge.dispute.created/updated/closed`; adjuntar archivos de
  evidencia (foto de entrega, recibo en PDF) por la API de archivos de Stripe; alerta al equipo 3 días antes del plazo. — **✓ 9k (14 nov):** el webhook ya aplica charge.dispute.created/updated/closed (2r); los archivos de evidencia por la API de archivos (lib/pagos/stripe.ts stripeArchivo; pasarela.subirEvidencia, en el contrato con stripe-mock) y la alerta al equipo 3 días antes del plazo (lib/dinero-alertas.ts «dispute_due», `disputa_alerta_dias`). Suscribir el endpoint a esos eventos en la cuenta real va con 9q (línea nueva de «Fase 9 · 9k»).
- [x] **→ 9c** · **Accesibilidad del sistema de diseño (bloque propio, antes de la fase 9):** quedan 193 `onClick` en `<div>/<span>` sin
      rol ni teclado en `packages/ui/src/ds` (AdminBar 23, Thread 18, SiteHeader 17, Patio 11, DeliveryPrefs 10, OnbTopBar 10,
      CompaFrame 10, MenuItemRow 9…). Se corrigen con nombre y estado en `scripts/portar-sistema.mjs` (como Button, IconButton,
      PostCard, Chip y el Booking); el guardián `sistemaClicMudo` no deja que suban y pide bajar el tope. — **✓ 9c (14 nov):** los 193 (190 contados por el guardián) son botones con rol, foco, Enter/Espacio y nombre; los contenedores con controles dentro (tarjetas, buscador con ciudad, fila del plato) entran por su nombre; los fondos de hojas y zonas repetidas son `role=presentation`. Nombres EN y 147 clics de las pantallas: ver «9c-2» abajo.
- [x] **Fotos privadas de ayuda y de citas:** las fotos de «Ayuda con la cita» (recibos, cómo quedó) y las de referencia de
      una cita se guardan con dirección imposible de adivinar pero pública (`/medios/n/…`). Antes de abrir: moverlas a
      `privado/` y servirlas con permiso (la persona, el negocio de esa cita y To'Latino). — **✓ 9a (11 nov):** fotos de ayuda y de citas en privado/ servidas con permiso (app/api/ayuda/foto/[id], guardián fotoAyudaPrivada); pruebas ayu4if, sop7b.
- [ ] **→ 9s** · **Impuesto de Auto y Hogar (validar con contador):** el diseño dice «6 % de PA solo en piezas o materiales». En PA la
      mano de obra de reparación de vehículos suele ser gravable y en mejoras a inmuebles el contratista paga el impuesto
      de los materiales. Antes de producción: confirmar la regla y dejarla en datos por ciudad y categoría (bloque 4d).
- [ ] **→ 9s** · **Ley HIC de PA (contratistas del hogar):** el fundador decidió no mostrarla; el servidor topará el depósito de
      trabajos de Hogar de más de $1,000 a un tercio (bloque 4b/4d). Confirmar con abogado antes de abrir.


## Fase 4 · 4d (estimado y dinero de Auto y Hogar)
- [ ] **→ Paquete 9-4** · Plantillas del estimado para producción: hoy son las líneas de ejemplo del prototipo (solo en pruebas). El fundador
      aprueba la lista por categoría (o se arranca sin plantillas).
- [x] Renovar retenciones de más de 7 días corre al abrir el panel (Hoy). En producción: tarea programada cada hora
      (mismo `repararEstimados`), para que no dependa de que el negocio abra el panel. — **✓ 9a (11 nov):** renovar retenciones de más de 7 días corre en el barrido central cada minuto (lib/barrido.ts: renovarRetenciones, repararEstimados; servicio «barrido» del compose); prueba renov4d, barr.
- [x] **→ 9n** · Rechazo de tarjeta al aprobar el estimado: sigue el mismo camino del Booking (error, elegir otra), sin prueba
      punta a punta propia todavía. Agregarla con la tarjeta 0002. — _9k (14 nov): el camino del rechazo es el de siempre (pagos2d lo prueba en pedidos con la 0002); la prueba propia del estimado necesita armar la cita de Auto/Hogar con su estimado (como est4d): va con las pruebas del negocio (9n)._ — **✓ 9n-4 (14 nov):** prueba propia: din9n4 B (plomería, hogar) aprueba con la 0002 → «Tu banco la rechazó. Prueba con otra tarjeta.», nada retenido y el estimado sigue; elige otra (la 3184) → la hoja del banco → retenido con ESE cobro; «algo más» con «No fui yo» y luego la 4242.
- [x] **→ 9k** · Si la base falla justo después de retener (entre la pasarela y el commit), la retención queda suelta hasta que
      Stripe la suelte (7 días). Conciliación diaria contra Stripe (PaymentIntents `requires_capture` sin fila). — **✓ 9k (14 nov):** la conciliación diaria marca la retención suelta (`requires_capture` en Stripe sin fila en el libro ni verificación viva) como diferencia «Retención suelta» con su alerta (lib/conciliacion.ts kind hold_orphan). Probado contra la base local (la corrida y sus dos filas) y en din9k paso 3.
- [ ] **→ 9s** · Validar con el contador: impuesto de PA solo sobre piezas/materiales en reparaciones de carro y de casa (tax_rules).

## Fase 4 · 4f (planes)
- [x] El barrido de planes (cobro del período, próxima visita, fin de la pausa) corre al abrir el plan o el panel de Hoy.
      En producción: tarea programada cada hora (`barrerPlanes()` sin filtro) para que los cobros no dependan de que alguien
      mire. — **✓ 9a (11 nov):** el barrido de planes corre en el barrido central (lib/barrido.ts: planes.barrerPlanes({})); prueba plan4f, barr.
- [x] **→ después de abrir (DA-04)** · Planes semanales, quincenales, por temporada y por nevada: hoy se piden llamando; decidir si entran en la app. — _9a (11 nov): planes semanales, quincenales, por temporada y por nevada: se piden llamando; entran si el fundador los pide con datos reales. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9n** · Recordatorio 24 h antes de cada visita del plan: usa el de las citas (3c); confirmar que sale para citas de $0. — _9a (11 nov): plan_visita existe (0053_planes.sql); falta confirmar con una prueba que el recordatorio de 24 h sale para una visita de $0._ — **✓ 9n-4 (14 nov):** confirmado y mejorado: el recordatorio no mira el dinero y la visita del plan recibe «Mañana es tu visita» con su franja (plan_visita, la plantilla de 0053 que nadie usaba) en vez del de la cita. Guardián recordatorioVisitaPlan; din9n4 G1 (visita de $0 → un aviso con la franja, una sola vez).

## Fase 4 · 4f-2 (renta de herramienta)
- [x] El barrido de rentas (vencer apartados de 48 h, aviso de tarde, renovar depósitos de más de 6 d 20 h, daños sin
      respuesta en 72 h) corre al abrir la renta o el panel de Hoy. En producción: tarea programada cada hora
      (`barrerRentas({})`). — **✓ 9a (11 nov):** el barrido de rentas corre en el barrido central (lib/barrido.ts: rentas.barrerRentas({})); prueba renta4f.
- [x] **→ 9n** · Editor de artículos de Tienda/Renta en el panel (nombre, precio por día, depósito, unidades, foto): llega con
      Tiendas; mientras, los artículos salen de datos. — _9a (11 nov): falta el editor de artículos de Renta en el panel (nombre, precio por día, depósito, unidades, foto)._ — _(9n-2, 14 nov): no entró (editor completo con fotos, depósito y unidades; queda para después de este bloque)._ — **✓ (9n-16, 15 nov):** Tu herramienta › «Lo que rentas» (Hogar y Transporte): agregar, editar (fotos, nombre ES/EN, qué incluye, precio por día, depósito, unidades; millas en Transporte), encender/apagar y quitar (removed_at, sin rentas vivas). Las unidades nunca bajan de las apartadas o fuera (stock_left = unidades − vivas). app/panel/RentaArticulo.tsx + acciones-rentas.ts (auditoría renta.articulo.*); renta4f §10–11. Pantalla compuesta con bloques (el diseño no la trae): en REVISION.
- [x] Si el depósito no se pudo renovar (el banco ya no deja), hoy solo se avisa al negocio: decidir si se le pide al
      cliente devolverla antes. — **✓ 9a (11 nov):** si el banco no deja renovar el depósito se avisa al negocio y no se le pide nada al cliente (REVISION 9a).
- [x] Rentas en Super Admin › Transacciones (pestaña propia junto a citas y pedidos): bloque 4g. — **✓ 9a (11 nov):** rentas en Super Admin › Transacciones (4g); prueba tx4g.

## Fase 4 · 4f-3 (apartar productos)
- [x] El barrido de apartados (sin respuesta a tiempo, no pasó en 48 h) corre al abrir el apartado, la ficha o el panel de
      Hoy. En producción: tarea programada cada 15 min (`barrerApartados({})`). — **✓ 9a (11 nov):** el barrido de apartados corre en el barrido central cada minuto (lib/barrido.ts: apartados.barrerApartados({})); prueba apt4f.
- [ ] **→ 9q** · «Avisos por SMS» del apartado: salen cuando estén las llaves de Telnyx (lista del fundador); hoy quedan en la
      bandeja de avisos y el SMS en modo pruebas.
- [x] Editor de artículos de Tienda en el panel (precio, existencia, foto, nueva/usada, medida): con Tiendas. — **✓ 9a (11 nov):** editor de artículos de Tienda con existencia y talla (4n/4q, app/panel/acciones-retail.ts); prueba prod4n, apt4q.
- [x] Apartados en Super Admin › Transacciones y en Mi cuenta: bloque 4g. — **✓ 9a (11 nov):** apartados en Super Admin › Transacciones (4g) y en Mi cuenta; prueba tx4g.

## Fase 4 · 4g-2 (ayuda con la visita)
- [x] **→ 9n** · Reserva de garantía a $0 desde la ayuda aceptada («que vuelva sin cargo»): Booking con `warr` (sin depósito ni
      retención) en vez de coordinar por Mensajes. — **✓ 9n-4 (14 nov):** «Reservar la visita sin cargo» en la ayuda (Auto y Hogar, «que vuelva sin cargo» aceptado por el negocio) → el Booking del mismo servicio con ?warr=H-…: $0, sin depósito ni tarjeta, fuera del tope de citas; el servidor vuelve a mirar que es suya, del mismo negocio y servicio, aceptada y sin usar; una por solicitud (warranty_op_id único). Guardián garantiaSinCargo; din9n4 F2.
- [x] **→ 9k** · Si se devuelve más que un cobro (estimado + «algo más»), hoy sale del de más saldo: repartir entre cobros. — **✓ 9k (14 nov):** lib/cobros.ts devolverOperacion reparte la devolución entre los cobros con saldo (del de más al de menos), cada parte con su llave `<idem>-p<cobro>` (reintentar no devuelve dos veces); la ayuda con la cita y Transacciones devuelven por ahí. Guardián devolverRepartido; probado contra la base local ($14 de $10 + $6 → 10 + 4; el reintento no repite).

## Fase 4 · 4g-3
- [x] **9g** · Analítica de Hogar y Auto: aprobado vs. cobrado, llegó en la franja, tiempo de respuesta a emergencias, % de
      pre-estimados que terminan en cita. — **✓ 9g (14 nov):** pestaña Hogar y Auto (pre-estimado y presupuesto → cita, emergencias y su respuesta, llegó en la franja, no llegó, aprobado contra cobrado y extras). Evidencia: funciones contra la base local con la semilla (10 visitas, 7 «Llegué», 4 en la franja); `ana9g`.
- [x] **→ 9n** · Configuración en el Super Admin: plazos (pre-estimado 24 h, presupuesto 48 h, emergencia 15 min, apartado 48 h) y la
      regla de impuesto (tax_rules) editables con motivo; hoy viven en el código y en datos. — **✓ 9n-6 (15 nov):** los cuatro plazos entran a Sistema › Configuración › Hogar y Auto (0150: `sol_pre_h` 24 h, `sol_pq_h` 48 h, `sol_em_min` 15 min, `apartado_h` 48 h; editables con motivo y auditoría). El motor los lee al enviar (lib/solicitudes.ts `respond_by` con cfgSql; lib/apartados.ts horasApartado) y cada solicitud o apartado guarda el suyo; el estado `/pre/…`, Presupuestos, la Tienda de la ficha y los avisos `biz_pq` ({horas}/{hours}) y `em_nadie` ({min}) dicen el valor (guardián plazoAbiertoSeLee). La regla de impuesto sigue abajo.
- [x] **→ 9n** · **4g-3 · tax_rules editables con motivo:** la tabla (por ciudad y categoría: `parts_bp`, `labor_bp`, `effective_from`; 20 filas en la semilla) solo se escribe en migraciones/semilla; no hay pantalla en el Super Admin para cambiarla. Hace falta una pieza nueva (lista por ciudad + «nueva regla desde» con motivo, como Comisiones de Planes): se pregunta al fundador antes de componerla (regla 7). (9n-6, 15 nov) — **✓ 9n-19 (15 nov):** Super Admin › Planes › **Impuestos** (compuesto como Comisiones; decisión por defecto AB en REVISION): la vigente y las programadas por ciudad y categoría, «Programar cambio» con motivo → una regla NUEVA (partes/precio o mano de obra; ahora, el 1.º del mes que viene o el 1.º de enero, hora del este). **0166**: quién y por qué, solo inserción (trigger). La firma del recálculo de Autos usa la regla VIGENTE de cada ciudad (antes `max(id)`: una regla futura no recalculaba el día que entraba). Guardián `impuestoSoloNuevo` (alreves9c); adm9n3 §12; ayuda admin-planes.
- [x] **→ 9k** · «Devolver» desde Transacciones para cobros de planes y rentas. — **✓ 9k (14 nov):** Transacciones › «Devolver» también en planes (PL-) y rentas (T-), de lo cobrado neto, repartido entre los cobros de cada período (devolverTx + devolverOperacion); la lista de la pantalla y la del servidor coinciden (devolverCoincide).


- [x] **→ 9o** · **DATOS_SECRET (4j):** respaldar la llave del cifrado de columna de producción (op_private) en un lugar seguro fuera del servidor; sin ella, las notas vivas (máx. 30 días) quedan ilegibles. — **✓ 9o (14 nov):** DATOS_SECRET (y QR, VAPID, AUTH, LLAVERO, RESPALDO_LLAVE y la llave age de cada máquina) va cada día en el **sobre de recuperación** de su máquina, cifrado para la llave de recuperación y subido al almacén (`respaldar.sh sobre`, backup_runs «sobre»); una máquina reconstruida lo recibe (`recuperacion.sh`, `scripts/produccion/reconstruir.sh`). Guardián secretoConDueno (no puede salir del sobre); probado con age de verdad en `pruebas/infra/sellado.test.sh` (17/17). La corrida en máquinas, en el ensayo (línea de abajo, «Fase 9 · 9o»).

- [ ] **→ 9s** · **Pro · cobrar en la app (4l):** hoy nada de Profesionales se cobra en la app (Preguntas #1 del plan Salud/Pro: honorarios de abogados, IOLTA, CROA). Verificar con abogado antes de encender cobros para los no legales.
- [ ] **→ 9s** · **Salud · HIPAA (4j):** consulta legal sobre si To’Latino es «business associate» de los consultorios antes de producción (Preguntas #2).

## Fase 4 · 4m (Doctores y Profesionales: reseñas y ayuda)
- [x] Acceso «vidrio roto» del Super Admin a una foto o nota de Salud: hoy queda en la auditoría al abrirla; falta pedir un
      motivo escrito antes de mostrarla (plan §3). — **✓ 9j (14 nov):** la foto de una ayuda de Salud pide el motivo antes (Colas › «Ver con motivo»,
      `break_glass` solo inserción, 10 minutos, auditoría `ayuda.foto.vidrio`); sin él la ruta contesta 404 al equipo. Las notas de Salud (op_private) el
      Super Admin no las ve nunca (guardián privacidadSalud). Guardián `vidrioRoto`; `ayu4m` al día (no corrió aquí: necesita Garage).
- [ ] **→ 9s** · La lista de términos de PRIVADO (`lib/resenas-filtro.ts`) es corta (diagnósticos y medicinas comunes): ampliarla con
      un listado revisado por alguien de salud antes de abrir, y medir falsos positivos en reseñas reales.
- [ ] **→ 9o** · Fotos privadas de ayuda: confirmar en el servidor real que Garage borra el objeto (el sandbox lo prueba contra el Garage local). — _9o (14 nov): el ensayo lo mide en la máquina de la base (sube 1 MB a medios/privado/, lo borra por la API S3 y comprueba que ya no está; GARAGE_BORRA en las cifras). No corrió aquí: va con el ensayo (línea «Fase 9 · 9o»)._
- [x] **→ 9n** · Configuración (Fase 5): hacer editables los plazos de Doctores y Profesionales **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). (2 h «no aceptamos su seguro», 24 h — _(9n-5, 15 nov): hecho. Los textos y avisos dicen el valor de Configuración (guardián plazoAbiertoSeLee) y 0149 abre las claves; la purga de lo privado va por razón (guardián purgaPorRazon)._
      cancelar, 30 d total por escrito, 24/48 h ayuda, 30 d notas, 90 d fotos de ayuda).

## Fase 4 · 4p (pedido del mercado)
- [x] **→ 9n** · «Pedir OK por $X más» cuando el peso real pasa lo retenido (hoy el mercado tiene que cortar menos). — **✓ 9n-4 (14 nov):** «Pedir OK por $X más» (la base calcula lo que falta); «Está bien, cobrar» es el OK: retiene esos $X como cobro 'extra' en la MISMA tarjeta (con la hoja de 3-D Secure) y liquida entre las dos retenciones sin pasar de lo de cada una; «No, que corten»; sin el OK no se marca listo; la base no deja cobrar de un cobro más de lo retenido (payments_cobro_hasta_lo_retenido). Guardianes okPorMas y capturaMercado; din9n4 D.
- [x] **→ 9n** · Sustituto que se vende por libra (hoy solo por unidad). — **✓ 9n-4 (14 nov):** el sustituto puede ser por libra: se proponen las libras de la línea que no había (o 1 lb), el cliente ve el precio por libra y, aceptado, entra como línea por peso (se pesa con su foto). Guardián sustitutoPorLibra; din9n4 D.
- [x] **→ 9n** · Envío del mercado con repartidor propio en /repartidor (hoy «Va en camino» / «Entregado» los marca el mercado). — **✓ (17 nov):** migración **0177**: el envío del mercado (`market_order`, delivery) recibe sus códigos al aceptarse, la ruta en vivo vale para él (`ruta_activa`, `operations_ruta`) y la base no lo cierra con repartidor sin la prueba DE ESE repartidor (`operations_prueba`). `lib/reparto-comun.ts` (número y tipo de lo que lleva el Repartidor) en lib/repartidor*.ts, lib/ruta.ts, /repartidor y /api/ruta|repartidor; «Está listo · para el repartidor» cuando el mercado tiene repartidores en la app (si no, el camino de antes), ofrecer/asignar/«Ofrecer solo» solo cuando está listo, «Recogí» con el código de recogida, prueba siempre obligatoria, y lo real se cobra al «Entregado» del repartidor (`liquidarMercado`, idempotente; si el cliente ya aprobó, no cobra otra vez). Panel › Entrega para el mercado; el detalle muestra el estado del repartidor, el código, el mapa y la prueba en vez de sus botones («Va en camino · lo llevo yo» y «Quitar» quedan); el cliente ve quién lo lleva, el mapa y su código; Super Admin › Transacciones (repartidor y «Ver recorrido») y Repartidores › 360°. Guardián `mercadoConRepartidor` (alrevesMercRep 21/21; alreves8e/9n al día); e2e `merc9n` 57 ✓; ayuda ES/EN (pedido-del-mercado, repartidor, panel-entrega, repartidor-prueba-de-entrega, admin-repartidores); decisiones en REVISION («Envío del mercado con el repartidor»).
- [x] **→ 9n** · Recordatorio a los 10 min si el cliente no toca «Está bien, cobrar» (hoy se cobra lo real al recoger o entregar). — **✓ 9n-4 (14 nov):** a los 10 min de mandar el peso sin «Está bien, cobrar», un recordatorio (merc_rec10, una vez por peso mandado); después, como antes, lo real al recoger o entregar. Guardián okPorMas; din9n4 D.
- [x] Pruebas viejas que borran datos compartidos del sandbox (pagos2d borra todas las cuentas de cobro y tarjetas): aislarlas. — **✓ 9a (11 nov):** pagos2d ya no borra datos compartidos: solo deja a Sabor Dominicano sin cuenta de cobro (la prueba la vuelve a conectar) y quita (no borra) las tarjetas de Marisol; ayuda2i y cit3e tampoco borran ya todas las solicitudes de ayuda ni la cola (pruebas/e2e/pagos2d.cjs 22 ✓).
- [ ] **→ 9s** · **Layaway (4r) — leyes por estado sin verificar:** PA/NJ/NY tienen reglas de layaway (aviso por escrito, devolución,
  cargos máximos). Hoy la red es el acuerdo por escrito aceptado (texto, hora, IP, versión, inmutable). Revisar con abogado antes
  de la fase 9 y ajustar `lay_cancel_pct` máximo por estado. También: Super Admin › Transacciones con el detalle del plan
  (pagado / falta / atrasado) y la cola de cancelaciones disputadas van en 4s.

- [x] **→ 9c** · **QtyStepper (sistema de diseño) sin teclado ni nombre accesible** (7 nov, 4y-1): los botones − / + son `div` con onClick, sin role ni aria-label. Lo usan el Booking de viajes, el carrito y los productos. Arreglarlo en `packages/ui` (role=button, tabIndex, aria-label «Uno menos / Uno más») y ampliar el guardián botonAccesible a `packages/ui/src/ds`. — **✓ 9c (14 nov):** «Uno menos» / «Uno más» (ES/EN con las props `decLabel`/`incLabel`; los cinco usos de las pantallas las pasan), role=button, foco y Enter/Espacio; el «+» del plato dice «Agregar», «Quitar» o «Cantidad: N» en el idioma de la pantalla.
- [x] **Barrido central (sin él no se vence nada si nadie mira)** — HECHO en el sandbox (0078, servicio «barrido», guardián barridoCompleto). Falta repetirlo en el docker-compose de PRODUCCIÓN cuando se encienda (fase 9) (7 nov, 4y-3b): vencer solicitudes y liberar retenciones (citas, fiestas, viajes, mercado, apartados), precios y totales vencidos, recordatorios y el aviso «tu salida todavía no sale» solo corren cuando alguien abre una página. Hace falta un proceso que los corra cada minuto (endpoint interno con token del entorno + servicio del docker-compose que lo llama). Bloque siguiente a 4y-3b.
- [ ] **→ 9s** · **Noche · licencia de licor (PLCB):** hoy es un sello que no bloquea nada y la lista legal no está revisada. Antes de abrir,
  revisar con abogado si hace falta algo más (hookah, after-hours después de las 2 AM, promotores). (4na, 7 nov)
- [x] **→ 9n** · **Noche · noches especiales con boleto:** se guardan pero no salen en la ficha hasta la Fase 6 (Eventos). (4na, 7 nov) — _9a (11 nov): las noches especiales con boleto se guardan; falta mostrarlas en la ficha de Noche junto a Eventos._ — **✓ 9n-4 (14 nov):** la noche especial sale en la ficha con su evento publicado y ahora dice el precio REAL del boleto más barato a la venta y la fecha de la próxima noche («Desde $15 · BOLETO · MAR 17 NOV») y «Comprar boletos». din9n4 G4.
- [x] **→ 9n** · **Noche · plazos en Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). 60 min para responder una mesa, corte de las 6 PM, 30 min de mesa guardada y 60 min
      de «la fila ahora» son constantes del código (`lib/noche-reservas.ts`, `lib/noche-comun.ts`). (4ne, 7 nov) — **✓ 9n-3 (14 nov):** `noche_responder_min`, `noche_mesa_guardada_min` y `noche_fila_viva_min` editables y `noche_corte_min` (nuevo, 360 = 6 PM; se copia en cada reserva); los textos leen la reserva (ya no dicen «1 hora» ni «30» fijos). Prueba `adm9n3` paso 7; guardián `nocheEditable`.
- [x] **→ 9n** · **Noche · demo del sandbox:** la semilla 0023 no trae listas, mesas, reseñas ni ayudas de ejemplo; para revisar Transacciones ›
      Noche, las colas y la Analítica en el sandbox hay que crearlas usando la app (o agregar una semilla de operaciones `is_test`). (4ne, 7 nov) — _9a (11 nov): una semilla de operaciones de Noche is_test (listas, mesas, reseñas, ayudas) para el demo del sandbox; no se hizo en 9a._ — **✓ 9n-3 (14 nov):** semilla `0065_noche_demo.sql` (7 operaciones is_test de La Terraza: lista, mesas, una reseña, una ayuda abierta, una «sin identificación»); idempotente; guardián `semillaNocheDemo`. La mesa pendiente vence a los 50 min como cualquier otra.
- [ ] **→ 9s** · **Niños · ChildLine y obligaciones de reporte:** verificar el número de ChildLine de PA (1-800-932-0313) y revisar con abogado qué
      debe hacer To'Latino si recibe un reporte de maltrato; textos y registros de licencias DHS, escuelas, CDL y PennDOT sin verificar. (plan 4e, 7 nov)
- [x] **4ee → 4eg:** Super Admin › Transacciones › **Inscripciones** (matrícula retenida/cobrada/devuelta/se quedó, plan por escrito) y las colas «Grupos que no abrieron», «No me dejan cancelar» y «Retenciones que fallaron» quedan para 4eg (Super Admin del grupo). Hoy se ven en el panel del negocio y en la base. — **✓ 9a (11 nov):** Transacciones › Inscripciones y las colas «Grupos que no abrieron», «No me dejan cancelar», «Retenciones que fallaron» (4eg; app/admin/Colas.tsx); prueba adm4eg.
- [x] **→ después de abrir (DA-05)** · **4ee:** el plan de pagos de una escuela no manda recordatorios de cuota (se pagan en la escuela); decidir si se avisa a la persona unos días antes de cada cuota. — _9a (11 nov): recordatorio de cuota del plan de pagos de una escuela (las cuotas se pagan en la escuela). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9n** · **Educación + Niños + Deporte · Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). los plazos (24 h para responder, 48 h de la oferta de la lista de espera, 72 h de — _(9n-5, 15 nov): hecho. Los textos y avisos dicen el valor de Configuración (guardián plazoAbiertoSeLee) y 0149 abre las claves; la purga de lo privado va por razón (guardián purgaPorRazon)._
      la baja de una membresía, 30 días de la purga de los datos del niño, 3 grupos en 90 días) son constantes del código (`lib/inscripciones.ts`). (4eg, 7 nov)
- [ ] **→ 9s** · **Cuidado de niños · protocolo:** el SLA de 4 h de la cola y qué hace Soporte con un caso (llamar al lugar, ChildLine) necesitan un
      protocolo escrito con abogado antes de abrir. (4eg, 7 nov)

- [ ] **→ 9s** · **4ia · Iglesias · sellos y ley:** verificar con abogado los textos y registros de `pa_funeraria` (State Board of Funeral Directors de PA), `fe_doj` (EOIR)
      e `irs_501c3` (IRS EO Search); la FTC Funeral Rule (lista general de precios por escrito) y si «plan de pagos · hasta 12 pagos» necesita aviso.
      Diezmo y donativo en línea no se construyen (§6 #1); si se piden, van con su plan (recibos, 501(c)(3)). (4ia, 7 nov)
- [ ] **→ 9s** · **4ib · Vivienda justa:** revisar con un abogado la lista de frases (ES/EN, `lib/vivienda-justa.ts` y Catálogo › Vivienda justa), el pie
  «Igualdad de oportunidad en la vivienda», la nota de animales de servicio y de apoyo, la excepción de vivienda para mayores de 62 (HOPA) y la de
  compañeros de cuarto, y la Pennsylvania Human Relations Act (más ordenanzas locales sobre fuente de ingreso / Section 8).
- [ ] **→ 9s** · **4ib · Depósitos en PA:** confirmar el tope de 2 meses de renta el primer año (1 mes desde el segundo; Landlord and Tenant Act) y si la
  cuota de solicitud tiene tope; hoy el servidor deja depósito ≤ 2 meses y solicitud ≤ $100.
- [ ] **→ 9s** · **4ib · Cuota estimada:** revisar las constantes de referencia de `lib/inmuebles.ts` (`EST_TASA_ANUAL` 6.75 %, `EST_MESES` 360,
  `EST_IMP_SEG_ANUAL` 2.5 %) y el texto «estimada» con un abogado (Regulation Z / publicidad de crédito); decidir quién la actualiza.
- [ ] **→ 9s** · **4ib · Licencias de Bienes Raíces:** verificar emisores y URL de registro de `pa_corredor` (PALS, State Real Estate Commission),
  `nmls_inm` (NMLS Consumer Access + PA Department of Banking and Securities), `pa_avaluador` (PALS, State Board of Certified Real Estate
  Appraisers) e `inspector_vivienda` (ley de inspectores de PA: membresía en asociación nacional); textos «puede / no puede».
- [ ] **→ 9s** · **4ic · Tope del cargo del dealer de PA:** verificar el valor del año (documentary fee del Board of Vehicles, con trámite electrónico y sin
  él) y ponerlo en Catálogo › Cargo del dealer (`platform_config.dealer_doc_fee_cap_cents`, hoy $477 «a verificar»); decidir quién lo actualiza
  cada año. Confirmar si el cargo del dealer y las placas pagan impuesto y si el carro a cambio baja el impuesto (hoy: 6 % solo sobre el precio,
  `tax_rules` NEG-DEALER).
- [ ] **→ 9s** · **4ic · Buyers Guide (FTC Used Car Rule):** revisar con un abogado que «Se vende como está» y la garantía del dealer de la app coincidan con
  la Buyers Guide de la ventana (ES/EN), y si la ficha (4id) debe enlazar la Buyers Guide de cada carro.
- [ ] **→ 9s** · **4ic · Regulation Z (publicidad de crédito):** revisar el pago de ejemplo (enganche, meses, APR, «estimado, sujeto a aprobación», total de
  pagos), el de compre aquí pague aquí (total pagado y la tasa que resulta) y la decisión de no poner enganche ni pago en la tarjeta del buscador;
  confirmar los topes de tasa de la Motor Vehicle Sales Finance Act de PA (hoy el servidor deja 0–30 %).
- [x] **→ 9m** · **4ic · Retiros del fabricante (recalls):** consultar los retiros abiertos de cada VIN con los datos públicos de NHTSA (sin pagar) y
  decidir cómo se muestran (§6 #11). — **✓ 9m (14 nov):** Los datos públicos de NHTSA (archivo FLAT_RCL, carga mensual `infra/retiros/generar.sh` → `vehicle_recalls`) por marca, modelo y año en la hoja del carro, con cómo confirmarlo con el VIN en nhtsa.gov/recalls (el archivo público no trae VIN). La carga real corre en el servidor (aquí la red no llega a NHTSA). Prueba: `vec9m`.
- [ ] **→ 9s** · **4ic · Licencias de Venta de Autos:** verificar emisores y URL de registro de `pa_dealer` y `pa_vendedor_autos` (PALS, State Board of
  Vehicle Manufacturers, Dealers and Salespersons), `pa_venta_plazos` (licencia de venta a plazos del Department of Banking and Securities: si
  vive en NMLS) y `nmls_dealer`; textos «puede / no puede».
- [x] **4id · Punto del negocio en la tarjeta de categoría** (resuelto el 7 nov: lista, ficha, relacionados, mapa y Ciudad sacan el punto de
  `PUNTO_PUBLICO`, que redondea a ~500 m a quien trabaja desde casa; quien renta en su propia dirección pasa solo a «desde casa»; guardián
  `puntoPublico`). Antes: la tarjeta del buscador manda la ubicación del negocio aunque trabaje desde casa
  (p. ej. quien renta cuartos en su casa). La ficha ya no la muestra para cuartos; revisar la tarjeta y el mapa (zona aproximada) antes de abrir.
- [ ] **→ 9s** · **4id · Pie de vivienda justa y nota de animales de servicio en la ficha:** confirmar con abogado el texto ES/EN y si va el logo de Equal
  Housing Opportunity (HUD) junto al texto.
- [x] **4ie · Ayuda con la visita / la prueba / la iglesia:** hoy `/vis/…` solo ofrece Mensaje; la ayuda con revisión de To'Latino (motivos,
  fotos, «Posible estafa») llega con 4if (`NUM` acepta `D-`). — **✓ 9a (11 nov):** Ayuda con la visita, la prueba y la iglesia con «Posible estafa» (4if; app/admin/Colas.tsx); prueba ayu4if.
- [ ] **→ 9q** · **4ie · SMS de visitas** (`vis_ok`, `vis_alt`, `vis_recordatorio`, `biz_vis`…): en el sandbox quedan «en modo pruebas»; salen con el proveedor
  de SMS de producción. Revisar el texto ES/EN en el teléfono bloqueado (sobre todo los neutros `insc_fen_*`).
- [x] **→ 9n** · **4ie · Plazo de 4 h hábiles y 24 h de «Pasó»:** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). constantes en el código hasta que llegue Configuración (Fase 5); a confirmar con el fundador. — _(9n-5, 15 nov): hecho. Los textos y avisos dicen el valor de Configuración (guardián plazoAbiertoSeLee) y 0149 abre las claves; la purga de lo privado va por razón (guardián purgaPorRazon)._
- [ ] **→ 9s** · **4ie · Prueba de manejo en casa:** no se comprueba que la dirección esté dentro del área del dealer; seguro y responsabilidad de la prueba
  (quién maneja, seguro del dealer) a revisar con abogado antes de abrir.
- [x] **→ después de abrir (DA-06)** · **4ie · Horas de prueba por carro:** el motor las admite; falta la pantalla si el fundador las pide. — _9a (11 nov): la pantalla de horas de prueba por carro (el motor ya las admite). En `docs/DESPUES-DE-ABRIR.md`._
- [ ] **→ 9v** · **4ie · Plantones:** revisar el umbral (3 en 30 días) con datos reales; hoy solo mira al negocio, no al cliente.
- [x] **4ie · Prefijo de las visitas (§6 #2), resuelto el 7 nov: las visitas usan «D-8101…»; «P-» queda para los pre-estimados.** Antes: los pre-estimados de Auto y Hogar también usan «P-» (otra tabla, `service_requests`, secuencia
  en ~2,130). No chocan en la base, pero si esa secuencia llegara a 8,101 dos números se verían iguales. Decidir otro prefijo o separar rangos.
- [x] **→ después de abrir (DA-07)** · **4if · «Posible estafa»:** la pausa es automática y no cancela visitas ya confirmadas de otras personas; revisar con el fundador. Texto de
  la advertencia al negocio y escalera de sanciones (hoy solo «advertencia»; suspender va por Negocios 360°) a definir con datos reales. — _9a (11 nov): la pausa automática por «Posible estafa» queda como está (REVISION 9a); el texto de la advertencia y la escalera de sanciones se definen con datos reales. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9n** · **4if · «Me lo devolvieron»:** si la persona nunca confirma ni dice que no, la solicitud queda «respondida» sin cierre automático; definir
  plazo (p. ej. 14 días) cuando llegue Configuración (Fase 5). — **✓ 9n-4 (14 nov):** se cierra sola a los ayuda_devuelto_dias (14, Configuración › Iglesias, Bienes Raíces y Autos) con un recordatorio a la mitad (una vez); closed_by 'system', outside_refund 'expired' (nada se borra); avisos neutros; outside_pending_at lo pone la base. Guardián devueltoSeCierra; din9n4 G2.
- [x] **4if · Reseñas de Iglesias sin fotos:** decisión por defecto (nadie sale en una foto sin saberlo); si el fundador quiere fotos del lugar,
  hace falta moderación previa en la cola Medios. — **✓ 9a (11 nov):** las reseñas de Iglesias no llevan fotos (nadie sale en una foto sin saberlo) (REVISION 9a).
- [x] **4if · Rótulos de «Lo que importa» del prototipo sin pregunta** («El precio no cambió», «Te explican cada paso», «Arreglan a tiempo»,
  «Explican el financiamiento»): agregar la pregunta si el fundador los quiere. — **✓ 9a (11 nov):** los rótulos del prototipo sin pregunta no se agregan (REVISION 9a).

- [x] **→ 9n** · **Iglesias + Bienes Raíces + Venta de Autos · Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). el tope del cargo del dealer (hoy en Catálogo › Cargo del dealer),
      las 4 h hábiles para responder una visita, las 24 h del «Pasó», las 48 h de Iglesias, los 14 días de aviso de una licencia y los 30 días de la
      purga son constantes del código (`lib/visitas-inm.ts`, `lib/licencias.ts`); la lista de frases de vivienda justa ya vive en Catálogo. Pasan a
      Configuración cuando llegue. (4ig, 7 nov) — **✓ 9n-6 (15 nov):** todas se cambian ya en Configuración: las de visitas, «Pasó», Iglesias y la purga se abrieron en 9n-5 (0149); el aviso de las licencias (`lic_aviso_dias`, 14 días) ya era editable y lo leía el barrido, y ahora también Analítica dice el valor («POR VENCER EN 14 DÍAS» sale de la clave; guardián plazoAbiertoSeLee) y la ayuda lleva la nota de que el plazo lo fija To'Latino. El tope del dealer sigue en Catálogo › Cargo del dealer.
- [x] **→ 9m** · **4ig · Búsqueda por propiedad o por carro (§6 #10):** recámaras, precio, año y millaje tienen datos e índices; falta componer la pantalla
      con el sistema de diseño y el OK del fundador. Hoy la categoría y Buscar filtran negocios con `filter_values`. (4ig, 7 nov) — **✓ 9m (14 nov):** `/buscar/inventario` (casa: renta o venta, recámaras, precio; carro: año desde, millas, precio, marca), desde la categoría con «Buscar casa / Buscar carro». Prueba: `vec9m`.
- [x] **→ 9n** · **4ig · Licencias de las demás categorías:** el barrido devuelve a la cola «Licencias» las de Iglesias, Bienes Raíces y Autos 14 días antes
      de su revisión (y con prioridad si pasó); las de Profesionales, Salud, Niños, Educación, Transporte, Fiestas y Noche todavía no vuelven
      solas. Decidir si se extiende a todas (es una línea en `CATS_LIC_4I`). (4ig, 7 nov) — _9a (11 nov): decisión pendiente: extender la vuelta automática a revisión a todas las categorías con licencia (una línea en CATS_LIC_4I, lib/licencias.ts)._ — _(9n-7, 15 nov): hecho. El barrido devuelve a revisión las licencias de todas las categorías (sin lista; guardián licenciasVuelvenTodas, índice parcial 0151, adm4ig §3 con la CDL de un chofer). Anotado en REVISION._
- [ ] **→ 9s** · **4ig · Colas › Vivienda justa:** protocolo escrito con abogado (cuándo un texto frenado es error de buena fe y cuándo advertencia; qué se
      revisa en una declaración de vivienda para mayores bajo HOPA) y la escalera después de la advertencia (hoy suspender va por Negocios 360°). (4ig, 7 nov)
- [ ] **→ 9c** · **4ig · Punta a punta en 9 dispositivos y en CI:** la CI de GitHub corre tipos, build, guardianes, contrato con Stripe, firma SES, imagen
      del sandbox, migraciones dos veces y la semilla dos veces; **no** corre las pruebas de punta a punta con Playwright ni en 9 dispositivos. Las
      pruebas del grupo (`fe4ia`, `inm4ib`, `autos4ic`, `fic4id`, `vis4ie`, `ayu4if`, `adm4ig`) corren en local en teléfono 390 y escritorio
      1360. Falta la matriz de 9 dispositivos en la CI. (4ig, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

- [ ] **→ 9s** · **5a · Comunidad, abogado (§3):** Sección 230 y Términos de la Comunidad versionados con las reglas del barrio; protocolo de material de
      abuso infantil (NCMEC, preservación); acoso (18 Pa.C.S. § 2709); difamación en recomendaciones; avisos de operativos de inmigración. (5a, 7 nov)
- [x] **5a · Dirección de una persona → cola `rep`** (hoy se rechaza al escribir); placas de carro; listas `spam`, `hate`, `migra`, `estafa`,
      `autolesion` y la moderación de imágenes (modelo propio) llegan en 5d. Hoy las fotos de la Comunidad pasan por el mismo `/api/medios` (sin EXIF
      ni GPS) sin revisión automática. (5a, 7 nov) — **✓ 9a (11 nov):** listas spam, hate, migra, estafa, autolesión y la moderación de imágenes propia (5d: lib/moderacion.ts, lib/moderacion-img.ts, services/moderacion-img); prueba com5d.
- [x] **5a · Límites de la Comunidad en Configuración:** — **Hecho en 5i:** `config_keys` (0105) con límites y auditoría; día local desde 5d. 10 publicaciones en 24 h (5 la primera día) son constantes de `lib/comunidad.ts`;
      pasan a `config_keys` con «día local» en 5i. (5a, 7 nov)
- [x] **→ 9b** · **5a · Velocidad con 1 M publicaciones** (`scripts/carga/comunidad-1m.mjs`, p95 ≤ 50 ms del muro): no se corrió; en la base del sandbox el
      plan usa `com_posts_hot_idx` sin ordenar aparte (comprobado con `EXPLAIN`). (5a, 7 nov) — **✓ 9b-3 (13 nov):** muro de Hazleton p95 Lo mejor 6,0 / 8,1 ms, Lo nuevo 6,3 / 5,6, sexta página por cursor 3,9 / 3,6, a 5 millas 6,7 / 6,6 (presupuesto 50; cargas 43457199398 / 43460154153; antes 840 ms: las 21 primero con «= any(array(…))» y el radio por ventanas).
- [ ] **→ Paquete 9-4** · **5a · Foto de portada del muro de registro:** el prototipo usa una foto de Pexels; va sin foto hasta que el fundador elija una propia. (5a, 7 nov)
- [x] **5a · Admin › Contenido pagina con `offset`** — **Hecho en 5i:** cursor (← →), sin offset. (venía de 2i); pasa a cursor con el resto de Contenido en 5i. (5a, 7 nov)
- [x] **5b · Avisos de la Comunidad sin grupo ni interruptor propio:** — **Hecho en 5i:** grupo `community`, «Respuestas y votos», «Mensajes de vecinos» y resumen diario en Mi cuenta › Avisos. las plantillas `com_*` van en el grupo `tx` sin preferencia que las apague
      (la campana, nunca SMS). El grupo «Comunidad» y su interruptor en Mi cuenta › Avisos llegan con Notificaciones en 5i. (5b, 7 nov)
- [x] **5b · Puntos del hilo:** votos que cuentan, «Me sirvió» (+10 y su reverso al cambiarla) y respuestas no dan puntos todavía; el lugar está
      marcado «HOOK 5f» en `votar` y `meSirvio` de `lib/comunidad-hilo.ts`. Los mensajes no prometen puntos. (5b, 7 nov) — **✓ 9a (11 nov):** votos, «Me sirvió» y respuestas dan puntos (5f; ya no queda «HOOK 5f» en lib/comunidad-hilo.ts); prueba com5f.
- [x] **5b · Comentario: reportar, bloquear y editar:** el menú del comentario hoy trae Borrar (lo propio) y «Esta me sirvió más» (quien
      preguntó). Reportar llega en 5d, bloquear y silenciar en 5c; editar un comentario (30 min, `com_edits`) no está en el prototipo: decidir. (5b, 7 nov) — **✓ 9a (11 nov):** reportar (5d) y bloquear (5c) en el menú del comentario; editar un comentario (com_edits) existe en la base y lib/comunidad.ts.
- [ ] **→ 9t** · **5b · Velocidad del hilo con 1 M publicaciones y 5 M comentarios** (hilo de 500 comentarios en 20 raíces ≤ 60 ms; votar ≤ 30 ms): no se
      corrió; en el sandbox las raíces salen de `com_comments_hilo_idx` sin ordenar aparte (`EXPLAIN` en `com5b`). (5b, 7 nov) — _9b-3 (13 nov): el hilo de 500 comentarios p95 4,3 / 3,8 ms (≤ 60) pasa en las dos corridas. Votar: p50 6,7 / 5,8 ms y p95 60 / 14 ms (≤ 30; cargas 43457199398 / 43460154153): una de dos corridas con cola. El runner de GitHub comparte disco y CPU con la base; se vuelve a medir votar en la máquina de producción antes de encenderla (9t)_
- [x] **→ 9b** · **5b · Resultado de encuestas muy grandes:** `avisarMuchos` escribe de 1,000 en 1,000 en una consulta; medir con una encuesta de 100 mil
      votos antes de abrir. (5b, 7 nov) — **✓ 9b-3 (13 nov):** cerrar una encuesta de 100 mil votos y avisar a todos (avisarMuchos): 6,9 s / 4,1 s en una vuelta del barrido (sin presupuesto escrito; cargas 43457199398 / 43460154153).
- [ ] **→ 9c** · **5b · Punta a punta en 9 dispositivos:** `com5b` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la matriz de CI. (5b, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **5c · Reportar a una persona** desde su perfil (hueco #4; hecho en 5d) y **«Abrir caso de red de cuentas»** (hecho en 5i) desde Usuarios 360° › Comunidad: van
      con la cola `repUsr` de 5d. (5c, 7 nov)
- [x] **5c · Monedas de bienvenida (+100):** el gancho está marcado «HOOK 5g» en `bienvenida()`; las acredita 5g a quien tiene
      `welcome_at` y `adult`. (5c, 7 nov) — **✓ 9a (11 nov):** monedas de bienvenida (+100) acreditadas por 5g (ya no queda «HOOK 5g»); prueba com5g.
- [x] **5c · Avisos viejos sin autor:** los avisos de la Comunidad anteriores a 0099 no tienen `actor_user_id` y un bloqueo no los esconde;
      en el sandbox son de prueba. En producción no existen (la Comunidad abre con 5c en adelante). (5c, 7 nov) — **✓ 9a (11 nov):** solo existen en el sandbox (datos de prueba); en producción la Comunidad nace con 0099.
- [x] **→ 9m** · **5c · Mensajes en tiempo real:** la conversación abierta pregunta cada 5 s; con mucho uso, medir y pasar a un canal propio
      (SSE) antes de abrir. (5c, 7 nov) — **✓ 9m (14 nov):** Canal propio: SSE `/api/vivo` con LISTEN/NOTIFY (0143: disparadores en chat_messages y dm_messages, el aviso sin el texto). Un mensaje llega al otro teléfono en ~10–40 ms; quieta, la conversación no pregunta nada. Prueba: `vec9m`.
- [x] **5c · «10 conversaciones nuevas al día»** ~~cuenta 24 h corridas~~ — hecho en 5d: todos los límites de la Comunidad cuentan el día
      local de la ciudad, con la mitad el primer día de la cuenta (`lib/moderacion.ts` limiteDia; valores en Contenido › Auto-moderación).
- [x] **→ 9b** · **5c · Velocidad** de Mensajes y listas de seguidores con 1 M de vecinos (índices `dm_threads_a/b_idx`, `follows_seguidos_idx`): no
      se corrió la base de carga. (5c, 7 nov) — **✓ 9b-3 (13 nov):** Siguiendo en el muro p95 37 / 5,0 ms, Mensajes 2,7 / 6,4, seguidores 3,1 / 2,8, siguiendo 2,9 / 2,7 (presupuesto de lista 50; cargas 43457199398 / 43460154153).
- [ ] **→ 9c** · **5c · Punta a punta en 9 dispositivos:** `com5c` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la
      matriz de CI. (5c, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [ ] **→ 9s** · **5c · Revisión de seguridad con abogado:** 18+ por declaración (COPPA si algún día se abre a 13–17), retención de mensajes
      privados y lectura solo con reporte (Términos y Privacidad lo deben decir). (5c, 7 nov)
- [ ] **→ 9s** · **5d · Abogado: Sección 230 y DMCA §512.** Términos de la Comunidad con las reglas, la moderación de buena fe y la apelación; **agente
      DMCA designado en la Copyright Office** (tiene un costo y no está en PLAN §8 → **decisión del fundador**), formulario de retiro y
      política de reincidentes. Sin eso no se abre la Comunidad. (5d, 7 nov)
- [ ] **→ 9s** · **5d · Licencia del modelo de fotos:** NudeNet 3.4.2 es MIT según su paquete; sus pesos se entrenaron con YOLOv8 (Ultralytics reclama
      AGPL-3.0 sobre pesos entrenados con su código). Confirmar con abogado o cambiar de modelo antes de producción. (5d, 7 nov)
- [ ] **→ Paquete 9-4** · **5d · Revisar las listas de términos** (odio · estafa · inmigración · autolesión, ES/EN; semilla corta en 0100) con el fundador y con
      vecinos de cada ciudad: palabras locales, falsos positivos («ice», «migra»). (5d, 7 nov)
- [ ] **→ 9o** · **5d · Imagen del servicio de fotos sin construir aquí:** Docker Hub respondió 429 desde este entorno; se probó el servicio con el
      mismo código y las mismas versiones fijadas (ruedas de PyPI para Python 3.12 verificadas) fuera de Docker. Confirmar que `deploy.sh`
      lo levanta en el sandbox y medir memoria junto con el traductor de 5h (§6 #24). (5d, 7 nov) — _9a (11 nov): el servicio de moderación tiene su perfil en el compose y deploy.sh lo levanta (systemd-run tolatino-moderacion); falta medir su memoria junto con el traductor en el sandbox._ — _9b-3 (13 nov): el CI la corre con su venv de Python (9b-2); la imagen del contenedor se arma y se prueba con la producción como código (9o)._ — _9o (14 nov): el compose de producción la construye en la máquina de la app (compose-app-fijos.yml, la misma receta del sandbox); se construye y se mide la memoria en el ensayo (línea «Fase 9 · 9o»)._
- [x] **→ después de abrir (DA-08)** · **5d · Fotos: violencia y texto promocional** no tienen modelo (NudeNet solo mide desnudez); hoy los decide una persona en Medios
      marcados. Solo las fotos de la Comunidad pasan por el modelo; reseñas y negocios siguen con el reporte de vecinos. (5d, 7 nov) — _9a (11 nov): un modelo de violencia y texto promocional en fotos; hoy decide una persona en Medios marcados. En `docs/DESPUES-DE-ABRIR.md`._
- [ ] **→ 9q** · **5d · No se probó el modelo con una foto de desnudez real** (solo fotos limpias y el servicio caído); probar el umbral 0.6 con un
      juego de fotos de prueba aprobado antes de abrir. (5d, 7 nov) — _9b-3 (13 nov): con los proveedores y los datos reales del sandbox (9q)._
- [x] **→ 9n** · **5d · Apelar una suspensión o un baneo:** la persona no puede entrar, así que hoy lo pide por Soporte; falta la pantalla de apelar
      desde «Entrar» (con el código por SMS, sin sesión). (5d, 7 nov) — _(9n-7, 15 nov): hecho. Tras el código por SMS, «Entrar» muestra «APELAR» (ficha firmada de 30 min, sin sesión; /api/cuenta/apelar); la respuesta sale por SMS (0152). Guardián apelarSinSesionConFicha, e2e apl9n7. Compuesto con las piezas de «Entrar»: captura en REVISION._
- [ ] **→ 9s** · **5d · NCMEC (abuso infantil):** protocolo de preservación y reporte al CyberTipline (18 U.S.C. § 2258A) con abogado; hoy un Admin
      oculta y preserva a mano. (5d, 7 nov)
- [x] **→ 9b** · **5d · Velocidad de moderación con 1 M:** `autoOcultar` (reportes de un contenido), `revisarAlEscribir` (parecidos con pg_trgm sobre lo
      de la persona en 24 h) y `redDeCuentas` (votos de 7 días) no se midieron en la base de carga. (5d, 7 nov) — **✓ 9b-3 (13 nov):** autoOcultar p95 1,0 / 2,5 ms (≤ 30), revisarAlEscribir 0,7 / 0,8 (≤ 50), redDeCuentas 1,5 / 1,8 (cargas 43457199398 / 43460154153).
- [ ] **→ 9c** · **5d · Punta a punta en 9 dispositivos:** `com5d` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la matriz
      de CI. (5d, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9b** · **5e · Velocidad de Hoy y de Recomendados con 1 M:** `hoyEnElBarrio` (índice `business_posts_hoy_idx`, presupuesto ≤ 40 ms) y
      `recomendadosPorVecinos` (agrega 180 días por ciudad en cada vista de Negocios) no se midieron en la base de carga; si no cumple,
      Recomendados pasa a derivado cacheado (con 5f). (5e, 7 nov) — **✓ 9b-3 (13 nov):** Hoy p95 15,6 / 16,8 ms (≤ 40; antes 72: solo las novedades de negocios Pro con Novedades antes de la regla) y Recomendados 14,3 / 13,5 ms (≤ 50; antes 580: candidatos de com_recomendados_cache que el barrido rehace cada 10 min; cargas 43457199398 / 43460154153). El tiempo de ese barrido va aparte (Fase 9 · 9b-3, abajo).
- [ ] **→ 9q** · **5e · Aviso «Hoy en un negocio que sigues» a muchos seguidores:** el barrido escribe a todos los seguidores de un golpe (lotes de
      1,000); con negocios de decenas de miles de seguidores hace falta repartirlo en varias pasadas y medirlo. Push real llega con la app. (5e, 7 nov) — _9b-3 (13 nov): no se midió en la carga (la carga no arma negocios con decenas de miles de seguidores); va con los avisos listos (9l)._ — _9l (14 nov): pasa a 9q: medirlo con push real (APNs/FCM) y la base de carga; 9l no cambió ese envío._
- [ ] **→ 9c** · **5e · Hoy y la cuenta oficial en los 9 dispositivos:** `com5e` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta en la
      matriz de CI. (5e, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **5e · Puntos y Tabla sin la cuenta oficial:** hecho en 5f: el libro y la Tabla piden una persona (`user_id not null references
      users`), `pts_sumar` rechaza sin persona, lo oficial no da puntos y toda lectura va unida a `users` (guardián `oficialNoEsPersona`
      ampliado, probado al revés; e2e `com5f`). (5f, 7 nov)
- [ ] **→ Paquete 9-4** · **5e · Foto propia de la cuenta oficial por ciudad** (`city_official_accounts.photo_media_id`): hoy sale el logo de To'Latino; falta
      dónde subirla en Contenido › Cuenta oficial si el fundador quiere una por ciudad. (5e, 7 nov)
- [x] **5f · Monedas del premio del mes:** `tabla_cerrar` deja 200 monedas anotadas a cada uno de los 3 primeros (`monthly_boards.prize_coins`);
      las acredita el libro de monedas de 5g (también las de los cierres anteriores a 5g). (5f, 7 nov) — **Hecho en 5g:** trigger del cierre
      `board_closures_premios` → `mon_premios_mes` (una vez por persona y mes); la migración 0103 acreditó los meses ya cerrados. Probado en `com5g`.
- [x] **5f · Reporte de canjes en «Cerrar el mes»** (paso 4): hoy dice 0 canjes porque los cupones llegan en 5g; conectar al libro de cupones. (5f, 7 nov)
      — **Hecho en 5g:** `board_closures_reporte` cuenta los canjes del mes de la ciudad (`canjes`, `canjes_usados`) al cerrar.
- [x] **→ 9t** · **5f · Velocidad de la Tabla y del rango con 1 M de publicaciones** (`scripts/carga/comunidad-1m.mjs`, presupuesto Tabla ≤ 40 ms): la
      Tabla usa índices `(city_id, month, puntos desc, user_id)` y cursor; «mi lugar» cuenta los de delante (índice), y `pts_rango` mira la
      escalera con `limit n`. Medir en la base de carga aparte y anotar las cifras. (5f, 7 nov) — _9b-3 (13 nov): con 580 mil vecinos con puntos en UNA ciudad, la Tabla p95 89 / 85 ms y «mi lugar» 86 / 86 (presupuesto 40; cargas 43457199398 / 43460154153). La lista sale del índice (~5 ms); lo que tarda es contar a los de delante de quien mira (580 mil entradas del índice). Antes 250 ms (sin unir con users, dos cuentas por rango). Para bajarlo del todo: un histograma de puntos por ciudad y mes que mantenga la base, o el lugar calculado por el barrido con el aviso de que se pone al día; se decide con lo diferido del vecino (9m)_ — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m: el histograma de puntos por ciudad y mes (o el lugar calculado por el barrido)._ — **✓ 19 nov (9t):** migración **0188** (`monthly_board_hist`: cuántos vecinos no excluidos tienen cada valor por ciudad, mes y pestaña, derivado que escribe solo el trigger de la Tabla) + **0189** (índice del ganador); «mi lugar» suma los valores mayores del histograma y cuenta el empate en el índice. Carga 44571463348 (7 M filas, 580 mil vecinos con puntos en una ciudad): **Tabla p95 3.5 ms, tabla corta 1.7 ms** (presupuesto 40; antes 86). Guardián tablaConHistograma, alreves9thist.
- [x] **5f · Notificación «Subiste de rango» en la app (push):** (hecho en 8c: va por push con la misma regla) hoy queda en la campana (sin SMS, `gam_*`); el push llega con la app. (5f, 7 nov)
- [ ] **→ 9c** · **5f · Puntos y Tabla en los 9 dispositivos:** `com5f` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta en la matriz de CI. (5f, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9n** · **5f · Condiciones de los rangos editables** (además del nombre): hoy el admin cambia nombres, valores de las reglas y el tope; los
      puntos mínimos y las condiciones viven en `ranks.min_points` / `ranks.cond` y se cambian con migración. Si el fundador los quiere en
      Gamification, se agregan con vista previa y auditoría. (5f, 7 nov) — _(9n-7, 15 nov): hecho. Gamification › Rangos › «Cambiar lo que pide» (Vecino a Comandante: puntos mínimos entre los vecinos, el número de la condición y los días de Comandante) con vista previa Antes/Ahora ES/EN, motivo y auditoría; el texto «Para subir» se reescribe (reqDeCond; guardián rangoDiceLoQuePide; com5f §12b)._
- [x] **5f · Invitados que «participan» por pedidos:** cuenta cualquier operación no cancelada; revisar con el fundador si un pedido de $1
      basta para Capitán (anillos de invitaciones). (5f, 7 nov) — **✓ 9a (11 nov):** cualquier operación no cancelada cuenta para «participa» (REVISION 9a); si aparecen anillos, Confianza los ve.
- [x] **5g · Escanear el código del cupón** en el panel (cámara, QR): hoy se escribe (no hay escáner en ningún lado del panel). Llega con la
      app Negocios (Capacitor) o con un lector propio; el servidor ya valida igual. (5g, 7 nov) _Hecho en 8e (11 nov): «Escanear cupón» en el panel (app Negocios y web) con el lector de la Puerta; el código del vecino trae su QR._
- [x] **→ 9n** · **5g · Validar un código desde «Hoy»** para quien solo tiene acceso a «Hoy y pedidos»: la acción ya lo permite (`cupValidar` acepta
      «Tu página» u «Hoy y pedidos»), pero el campo vive en Tu página › Cupones por monedas. Componer el bloque en Hoy. (5g, 7 nov) — **✓ 9n-2 (14 nov):** Hoy muestra «Validar un código» (con Escanear cupón) si hay cupones vivos; lo usa quien solo tiene «Hoy y pedidos». pan9n2 §6 (el camino de éxito sigue en com5g).
- [ ] **→ 9s** · **5g · Abogado:** monedas sin valor en dinero y cupones (leyes de tarjetas de regalo y de bienes no reclamados; premios del mes sin
      compra = no es sorteo); Términos de la Comunidad con «Sin valor en dinero · no se compran, no se venden, no se transfieren, no vencen».
      (5g, 7 nov)
- [x] **→ 9b** · **5g · Velocidad con 1 M:** cupones de una ciudad (`coupons_ciudad_idx` + un conteo del mes por cupón, 20 por página), mis cupones y
      movimientos (cursor por id), EN CIRCULACIÓN del Super Admin (suma de `community_profiles.coins` por ciudad: si pasa del presupuesto,
      cachearla por ciudad). Medir en la base de carga. (5g, 7 nov) — **✓ 9b-3 (13 nov):** cupones de la ciudad p95 9,6 / 10 ms, mis cupones 0,5 / 0,6; EN CIRCULACIÓN y vecinos por rango, de com_rangos_ciudad (cada 10 min): Gamificación p95 224 / 203 ms (≤ 300; antes 1,8 s; cargas 43457199398 / 43460154153).
- [ ] **→ 9c** · **5g · Monedas y cupones en los 9 dispositivos:** `com5g` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta la matriz
      de CI. (5g, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **5g · Push de los avisos de monedas y cupones** (hecho en 8c) (`gam_monedas*`, `gam_cupon_usado`, `biz_cupon_*`): hoy en la campana, sin SMS. (5g, 7 nov)
- [x] **5g · Analítica › Comunidad:** — **Hecho en 5i** (vistas por ciudad y día, sin personas). monedas emitidas y canjeadas, canjes por negocio (por ciudad, sin personas) — bloque 5i. (5g, 7 nov)
- [ ] **→ 9q** · **5h · LibreTranslate real en el sandbox:** aquí solo se probó con un traductor de mentira (los modelos de argos-net.com están
      bloqueados en la red de la sesión de trabajo). En el sandbox: que `tolatino-traductor` baje los modelos y quede arriba, Auto-moderación
      «RESPONDE», tiempos reales de `/translate` y `/detect` (presupuesto: traducir ≤ 3 s; detectar ≤ 1.5 s) y la memoria con moderacion-img
      en el cx33 (§6 #24). (5h, 7 nov) — _9a (11 nov): el traductor tiene su perfil y sus modelos en el compose (traductor-modelos) y deploy.sh lo levanta; falta comprobar en el sandbox los tiempos reales (≤ 3 s, ≤ 1,5 s) y la memoria con moderacion-img._ — _9b-3 (13 nov): con los proveedores reales del sandbox (9q)._
- [ ] **→ 9q** · **5h · Calidad del traductor:** comparar 200 textos reales ES↔EN (Comunidad y reseñas) contra una referencia antes de abrir; si no
      alcanza, el fundador decide un traductor pago (§6 #15). (5h, 7 nov) — _9b-3 (13 nov): con los proveedores reales del sandbox (9q)._
- [ ] **→ 9s** · **5h · Abogado:** LibreTranslate es **AGPL-3.0** (lo corremos sin modificar como servicio aparte; revisar §13 si algún día se
      modifica o se expone) y las licencias de cada modelo Argos (es→en, en→es) y de MiniSBD. Aviso en los Términos: «traducción
      automática; vale el original». (5h, 7 nov)
- [x] **5h · Borrado de cuenta (D5):** cuando se construya la purga de textos a los 30 días, debe borrar también sus filas de
      `ugc_translations` (derivadas) para que no quede el texto traducido. (5h, 7 nov) — **✓ 9d (14 nov):** la purga borra las traducciones de sus publicaciones, comentarios y reseñas (`fn: traducciones` en el mapa; `datos_purga_pendiente` lo comprueba).
- [ ] **→ 9p** · **5h · Límite sin cuenta:** es por cookie del dispositivo (se puede borrar); el costo lo acota la caché (cada texto se traduce una
      vez por idioma). En producción, límite por IP en Cloudflare para la acción. (5h, 7 nov) — _9o (14 nov): hecho como código: `infra/produccion/cloudflare/reglas.json` (una regla por IP para las acciones del servidor —«Ver traducción», «Avísame», el código— y /api/errores, el plan gratis trae una) y `scripts/produccion/cloudflare.sh reglas`. Se aplica por la API cuando exista la zona (Paquete 8-0 → 9p)._
- [x] **→ 9b** · **5h · Corta-circuito compartido:** hoy vive en la memoria de cada proceso de la app; con varias réplicas en producción, cada una
      corta por su cuenta (aceptable; anotar si se quiere uno común). (5h, 7 nov) — **✓ 9b-3 (13 nov):** `lib/topes.ts` (`estadoCorte` / `resultadoCorte` sobre `rate_counters`): uno para todos los procesos, sobrevive a un reinicio y, pasado el minuto, una sola prueba lo vuelve a abrir (com5h lo comprueba). También el de la moderación de fotos. Guardián `topeCompartido`.
- [ ] **→ 9c** · **5h · «Ver traducción» en los 9 dispositivos:** `com5h` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta la matriz
      de CI (y un traductor de prueba en CI). (5h, 7 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9t** · **5h · El Compa con «Ver traducción»** cuando llegue su fase (ayuda `ver-traduccion.md` lista). (5h, 7 nov) — _9a (11 nov): El Compa ya existe (7c–7f); falta que responda sobre «Ver traducción» (el artículo de ayuda ver-traduccion no está en docs/ayuda)._ — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **✓ 19 nov:** `docs/ayuda/ver-traduccion.md` al día (también los mensajes con negocios y entre vecinos; los de antes del 19 nov sin botón; solo las dos personas traducen) y su «Para El Compa»; la búsqueda de El Compa lo encuentra («traducir mensajes», «puedo traducir un mensaje de un negocio», «translate messages»: ver-traduccion y mensajes en los 3 primeros, local).

- [x] **→ 9n** · **5i · Plazos de la Fase 4 en SOLO LECTURA:** `sp_seguro_guardar_h`, `sp_total_escrito_dias`, `sp_notas_purga_dias`, `ayuda_negocio_h`, — _(9n-5, 15 nov): hecho. Los textos y avisos dicen el valor de Configuración (guardián plazoAbiertoSeLee) y 0149 abre las claves; la purga de lo privado va por razón (guardián purgaPorRazon)._
      `noche_responder_min`, `noche_mesa_guardada_min`, `noche_fila_viva_min`, `insc_responder_h`, `insc_oferta_h`, `insc_baja_h`,
      `ninos_purga_dias`, `insc_grupos_n`, `insc_grupos_dias`, `fe_responder_h`, `vis_responder_h`, `vis_paso_h`, `vis_purga_dias` ya se leen
      de Configuración, pero los textos que ve la persona dicen el número («2 h», «24 h», «72 horas», «4 h hábiles»…). Pasar esos textos a
      leer el valor (como «Editar» en 5i) y abrir cada uno (`editable = true` en una migración). (5i, 8 nov)
- [x] **→ 9n** · **5i · Fuera de Configuración todavía:** el corte de las 6 PM de Noche (Preguntas #3, se copia en cada reserva), los plazos de 4g-3
      (pre-estimado 24 h, presupuesto 48 h, emergencia 15 min, apartado 48 h), `free_ops_cap` (Planes) y «Me lo devolvieron» (4if, no
      existe). Decidir si entran al catálogo. (5i, 8 nov) — _(9n-3, 14 nov): el corte de las 6 PM entró (`noche_corte_min`); siguen fuera los plazos de 4g-3, `free_ops_cap` y «Me lo devolvieron»._ — **✓ 9n-6 (15 nov):** entraron todos: «Me lo devolvieron» en 9n-4 (`ayuda_devuelto_dias`), los plazos de 4g-3 en la sección nueva Hogar y Auto (0150) y `free_ops_cap` en Configuración › Dinero (0150; 10, de 0 a 1000). El techo de Free se lee con `cfg_int('free_ops_cap')` en las 12 consultas que lo leían de platform_config (pedir, citas, citas de Salud y Pro, visitas, visitas de inmuebles y autos, inscripciones, oficios, noche, fiestas, evento privado, Negocios 360°) y `TOPE_FREE` ya no existe; Plan, Menú y Servicios del panel y Planes y Catálogo del Super Admin dicen el valor (guardián plazoAbiertoSeLee).
- [x] **→ 9b** · **5i · Configuración en varios servidores:** la app guarda el valor 15 s por proceso (`lib/config.ts`); lo que decide la base
      (`cfg_int`) es al instante. Con réplicas en producción, un cambio tarda hasta 15 s en llegar a todas. (5i, 8 nov) — **✓ 9b-3 (13 nov):** la base avisa cada cambio de platform_config, config_keys, feature_flags, cities, mod_rules, mod_terms y synonyms por NOTIFY (`tl_config`, 0133) y cada proceso olvida su copia al momento (`lib/cambios-config.ts`); los 15 s quedan de respaldo. Guardián `copiaQueSeOlvida`.
- [x] **→ 9b** · **5i · Velocidad con 1 M:** Contenido (una consulta UNION de 6 tipos con cursor), Analítica › Comunidad (vistas que agregan desde las
      tablas; si pasa del presupuesto, pasar a un derivado por ciudad y día que rehace el barrido) y el resumen diario (500 personas por
      vuelta del barrido) no se midieron en la base de carga. (5i, 8 nov) — **✓ 9b-3 (13 nov):** Contenido p95 75 / 77 ms, segunda página 76 / 71, «Con reporte» 60 / 76 (≤ 80; antes 24,7 s); totales del barrido 1,3 s; Analítica › Comunidad 2,4 / 1,8 ms (de com_analitica_dia_cache; rehacerlo 1,0 / 2,3 s); resumen diario 2,2 / 1,4 ms (cargas 43457199398 / 43460154153).
- [x] **→ después de abrir (DA-09)** · **5i · Rango del negocio** (§6 #23): no se construye hasta que se diseñe la ficha. (5i, 8 nov) — _9a (11 nov): el rango del negocio (§6 #23 de la Fase 5) espera el diseño de la ficha. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **5i · Resumen diario por push o correo:** (push hecho en 8c; el correo sigue pendiente) hoy llega a la campana (la app con push llega con Capacitor). (5i, 8 nov)
- [ ] **→ 9c** · **5i · Super Admin de la Fase 5 en los 9 dispositivos:** `adm5i` corre en escritorio 1360 y teléfono 390 en local; falta la matriz de
      CI. (5i, 8 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9f** · **5i · Textos del Super Admin en inglés:** el Super Admin está en español (como el resto del admin); las etiquetas de Configuración
      ya traen ES/EN en `config_keys`. (5i, 8 nov)

## Fase 6 · 6a (base de eventos, panel, Publica tu evento, revisión)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._ — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [x] **6a → 6c · Boletos, mesas y extras guardados como configuración:** _hecho en 6c (10 nov): la base los pasa a ticket_types /
      event_tables / event_addons con su existencia por fecha (evt_sincronizar_venta) y se venden desde ahí; el editor sigue guardando la
      configuración que revisa To'Latino._ hoy viven en `events.tickets_cfg / tables_cfg / addons_cfg`
      (validados por el servidor y la base: sin alcohol, botellas ni hookah). 6c los pasa a `ticket_types`, `event_tables`, `event_addons`
      con existencias por fecha, y **antes de vender exige Cobros con tarjeta encendido** (`stripe_accounts.charges_enabled`) del
      organizador. Hasta entonces el editor y Publica tu evento dicen «La venta en la app abre pronto». (6a, 9 nov)
- [x] **6a → 6b · «Otro lugar» sin ubicar en el mapa:** _hecho en 6b (10 nov): pide el código postal y se ubica con `dir_ubicar` (calles
      del Censo); sin coincidencia sale con la dirección escrita y sin mapa._ un evento en otro lugar guarda nombre y dirección pero `geom` queda vacío (no hay
      geocodificador propio todavía); su ciudad es la del negocio. 6b lo ubica con el Nominatim propio para el radio y el mapa. (6a, 9 nov)
- [x] **6a → 6f · Series y varios días:** _hecho en 6f (10 nov): «Se repite» (cada semana, cada 2 semanas, cada mes / «el último») y «Varios días seguidos» en el editor; la base genera las fechas (0111) y la semilla 0037 pasa el sancocho, la vigilia y el festival a su forma._ el editor publica un solo día (con «Repetir otro día»); «Se repite» y «Varios días seguidos» del
      calendario llegan en 6f. La semilla mete el sancocho de cada domingo, la vigilia de cada mes y el festival de 3 días como un solo día. (6a, 9 nov)
- [x] **6a → 6c/6g · Super Admin › Eventos y boletos: «Buscar boleto» y «Modo puerta»:** _hecho: Buscar boleto en 6c; Modo puerta (solo lectura) y ESCANEOS del boleto en 6g (10 nov)._ las dos pestañas llegan con la venta (6c) y la
      puerta (6g); hoy salen Eventos y Organizadores. KPI BOLETOS EMITIDOS · BRUTO BOLETOS, con 6c. (6a, 9 nov)
- [x] **6a → 6b · Encender / apagar el módulo Eventos en «Lo que vendes»:** _hecho en 6b (10 nov): interruptor en Panel › Eventos y fila
      en Lo que vendes; pausa en N360; la base lo exige en `listable`; Eventos sale en el panel solo donde la categoría lo admite._ el panel muestra Eventos a todo negocio con la parte «evt»
      (todas las categorías publican algún formato). El interruptor del módulo (`modules_on` «eventos») y la pausa del admin por módulo
      se conectan cuando haya página pública (6b). (6a, 9 nov)
- [x] **6a · Fotos locales:** en local `/medios/…` no se sirve (lo sirve Caddy en el sandbox): carteles y fotos salen grises en las capturas
      locales. Verlos en el sandbox. (6a, 9 nov) — **✓ 9a (11 nov):** solo en local (/medios lo sirve el sandbox); nota, sin cambio.
- [ ] **→ 9c** · **6a · Eventos en los 9 dispositivos:** `evt6a` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6a, 9 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9f** · **6a · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (los avisos y el panel sí ES/EN). (6a, 9 nov)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._ — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [x] **6a · Catálogo de formatos y géneros editable desde el Super Admin (hueco #8):** _hecho en 6j (10 nov): Super Admin › Eventos y boletos › Catálogo (formatos, categorías y géneros con vista previa, auditoría; apagar no borra)._ hoy vive en la base (0106) y se lee de ahí; el editor
      del catálogo llega en 6j. (6a, 9 nov)

## Fase 6 · 6b (el módulo Eventos del cliente)
- [x] **6b → 6c · Comprar boletos:** _hecho en 6c (10 nov): «Boletos» abre la compra; QR real; Mis boletos en Mi cuenta._ la ficha muestra tipos, precios (cargos incluidos) y mesas con «Venta pronto»; «Mis boletos y RSVP»
      lleva a Mi cuenta › Guardados › Eventos hasta que exista Mi cuenta › Boletos. El **QR del enlace al compartir** (tarjeta con QR)
      llega con el generador de QR de código abierto de 6c. (6b, 10 nov)
- [x] **6b · «Otro lugar» fuera de las 5 ciudades:** no se bloquea; la ciudad del evento es la del negocio. Decidir si un evento fuera del
      radio de su ciudad no se publica (plan §2 0106). (6b, 10 nov) — **✓ 9a (11 nov):** un evento «otro lugar» no se bloquea; su ciudad es la del negocio (REVISION 9a).
- [x] **6b · Recordatorio del día antes (`rsvp_recordatorio`):** construido en el barrido (desde las 10 AM, a quien hizo el RSVP hace más
      de 1 h); el e2e prueba el de «evento guardado» y el aviso al abrir puertas, no este (la hora de creación del RSVP no se puede mover en
      la base). Mirarlo en el sandbox con un RSVP de un evento de mañana. (6b, 10 nov) — **✓ 9a (11 nov):** prueba nueva pruebas/e2e/rsvp9a.cjs (13 ✓): antes de la hora no sale; desde la hora sale una vez a quien va (no a quien canceló, ni a un RSVP de menos de 1 h, ni para pasado mañana) y se ve en Avisos a 390 y 1360.
- [x] **6b · Mi cuenta › Avisos › Eventos (grupo `events` en notif_prefs):** _hecho en 6j (10 nov): grupo `events` con Boletos y cambios · Recordatorios · Eventos que guardas; lo crítico no se apaga._ llega con 6j; hoy los avisos de RSVP y de evento guardado no
      se pueden apagar por grupo. (6b, 10 nov)
- [x] **→ 9b** · **6b · Presupuesto de velocidad con la base de carga (1 M de fechas):** la lista usa el índice (city_id, starts_at, id) where listable
      con cursor; falta medir p95 con `scripts/carga/eventos-1m.mjs` (plan §7). (6b, 10 nov) — **✓ 9b-3 (13 nov):** lista de Hazleton p95 11,4 / 13,4 ms, sexta página 5,3 / 5,3, ficha 2,2 / 2,3 (≤ 50 / 40; antes 1,3 s: las fechas por ventanas en orden y sin JIT; cargas 43457199398 / 43460154153).
- [x] **→ 9h** · **6b · Eventos en el sitemap:** las fichas se indexan (metadatos, canónico y schema.org/Event), pero no hay sitemap de eventos. (6b, 10 nov) — **✓ 9h (14 nov):** `/sitemap.xml` (índice) y `/mapa-del-sitio/{n}.xml` (lib/seo/mapa.ts): la parte 0 lleva cada evento con fechas por venir que sale al público (`event_dates.listable`) de las ciudades abiertas, con su `lastmod`; solo en producción y calculado al pedirlo (en el sandbox, 404: guardián `sandboxNoSeIndexa`). Visto en local con el servidor en modo producción (REVISION 9h).
- [ ] **→ 9c** · **6b · Eventos en los 9 dispositivos:** `evt6b` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6b, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9f** · **6b · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (ficha › últimos RSVP, Pausar Eventos). (6b, 10 nov)

## Fase 6 · 6c (boletos, mesas, extras y códigos)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._ — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [x] **6c · Transferir al organizador:** _hecho en 6e (10 nov): la liquidación del martes por fecha (lib/evt-liquidacion.ts)._ el cobro de boletos queda en la plataforma (`transfer_group` del evento); la transferencia del martes
      después de la fecha, las retenciones y el ajuste por devoluciones llegan con 6e. Hasta entonces el dinero no sale solo. (6c, 10 nov)
- [x] **6c · Devoluciones de boletos:** _6e (10 nov): la devolución total al cancelar el evento o una fecha, en lote e idempotente, hecha._ _6d (10 nov): cancelar el comprador (menos el cargo, hasta 24 h antes) y devolver desde el panel
      (100 %) hechos, idempotentes y con el reintento del barrido._ Falta la devolución total al cancelar el evento (6e); «Anular» del admin
      no devuelve dinero. (6c, 10 nov)
- [x] **→ 9k** · **6c · 3D Secure:** si el banco pide verificación extra, se pide otra tarjeta (como el resto de la app). (6c, 10 nov) — **✓ 9k (14 nov):** los boletos completan la verificación en la hoja y «Pagar» vuelve a enviar el mismo apartado con el mismo intento (lib/boletos.ts pagarBoletos con `usuario`; no se suelta lo retenido ni cuenta como otro intento).
- [x] **→ 9k** · **6c · Máximo por persona con la huella de la tarjeta:** hoy cuenta cuenta + dispositivo + la misma tarjeta guardada (`pm_…`); con
      Stripe real conviene la huella (`card.fingerprint`) para cazar la misma tarjeta en otra cuenta. (6c, 10 nov) — **✓ 9k (14 nov):** la huella (card.fingerprint; en el sandbox, la simulada de la marca y los 4) se guarda al guardar una tarjeta y en cada cobro (payment_methods/payments.card_fingerprint, 0141) y el máximo por persona y fecha cuenta la misma tarjeta en otra cuenta (lib/boletos.ts entradasDe). Guardián huellaDeTarjeta.
- [ ] **→ 9r** · **6c · QR sin señal en el teléfono del cliente:** el QR verifica sin conexión en la puerta, pero la página del boleto necesita señal
      para abrirse; la app instalable (service worker) llega con 6h. Apple / Google Wallet: Fase 8 (§6 #17). (6c, 10 nov) _6h (10 nov): hecho —
      el boleto abierto una vez con señal se guarda cifrado en el teléfono y se ve sin señal (service worker de Mis boletos); falta probarlo en un
      iPhone (Safari puede borrar lo guardado de una web que no se abre en 7 días) y que Mis boletos guarde todos los próximos sin abrirlos uno por uno._ — _9a (11 nov): hecho en 6h (service worker de Mis boletos, boleto cifrado) y Wallet en 8g. Falta probarlo en un iPhone y que Mis boletos guarde todos los próximos sin abrirlos uno por uno._ — _9m (14 nov): Mis boletos ya guarda TODOS los próximos al abrirse (9m, `boletosParaGuardar`); queda probarlo en un iPhone real (Safari y los 7 días), con las tiendas._
- [x] **→ después de abrir (DA-10)** · **6c · QR rotativo y reventa:** _6j (10 nov): las señales de reventa ya están en Confianza; queda el QR rotativo._ QR fijo, firmado y con versión (§6 #10); el rotativo anti-captura y las señales de reventa (Confianza,
      6j) quedan para después. (6c, 10 nov) — _9a (11 nov): el QR rotativo anti-captura (§3.9); las señales de reventa ya están en Confianza (6j). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6c · Contrato con Stripe de las llamadas nuevas** (`retenerPlataforma` con `transfer_group`, `capturarPlataforma` y la lectura del
      PaymentIntent): agregado a `scripts/contrato-stripe/prueba.cjs`; en local no corrió (Docker Hub 429 al bajar stripe-mock). Mirar el
      paso del CI. (6c, 10 nov) — **✓ 9a (11 nov):** el contrato de Stripe corre en el CI (.github/workflows/ci.yml: scripts/contrato-stripe/correr.sh) y pasó en las corridas de 8i (PROGRESS «Fase 8 · 8i»).
- [x] **6c · Recordatorio del boleto («Mañana» / «¡Es hoy!», `bol_recordatorio`) y aviso de aforo 90 % (`evt_aforo90`):** _hecho en 6j (10 nov): `bol_recordatorio` y `bol_es_hoy` desde `evt_recordatorio_hora` y `evt_aforo90` al 90 % de lo vendido, una vez cada uno (adm6j)._ no se
      construyeron en 6c; llegan con 6j (avisos de Eventos). (6c, 10 nov)
- [x] **→ 9m** · **6c · Mi cuenta › Inicio «Tu semana» con el boleto y Pagos › movimientos:** _6j (10 nov): «Tu semana» hecho (boletos, RSVP y evento privado); Pagos › movimientos sigue pendiente: ver «Fase 6 · 6j»._ los boletos están en Mi cuenta › Boletos y en
      Accesos; «Tu semana» llega con 6j. (6c, 10 nov) — **✓ 9m (14 nov):** Mi cuenta › Pagos › Movimientos (cobrado, retenido, liberado, devuelto, con su orden; cursor). Prueba: `vec9m`.
- [x] **→ 9o** · **6c · Llave del QR de producción:** `deploy.sh` del sandbox la genera; el despliegue de producción (fase 9) debe generarla igual
      (una por entorno) y nunca copiar la del sandbox. Rotar = nueva llave + `qr_keys.retired_at` de la vieja. (6c, 10 nov) — **✓ 9o (14 nov):** el despliegue de producción la hace nacer en la máquina de la app (`secreto_nace QR_LLAVE_PRIVADA`, la misma receta del sandbox en `infra/comun/lib.sh`), una por entorno, nunca copiada; solo viaja en el sobre de recuperación (guardián secretoConDueno). Rotar sigue igual (qr_keys.retired_at).
- [ ] **→ 9s** · **6c · Abogado:** ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad, To'Latino como comerciante del
      cobro (1099-K del organizador), política de devoluciones en los Términos. (6c, 10 nov)
- [x] **6c · `scripts/portar-sistema.mjs` no es idéntico a lo que hay en el repo:** al correrlo para el parche de TicketQR también
      deshacía arreglos de accesibilidad hechos a mano en `community/PostCard.js` y `community/Thread.js` (se restauraron a mano). Pasar
      esos arreglos al script. (6c, 10 nov) — _Hecho (10 nov): el «⋯» de PostCard y los dos de Thread son parches en el script; el script
      ahora produce exactamente lo que hay en el repo (comprobado en una copia aparte, dos veces). Guardián nuevo `sistemaSincronizado`:
      corre el script en una carpeta temporal y falla si un archivo portado o los tokens no son idénticos (probado al revés: un arreglo a
      mano y un parche quitado fallan)._
- [x] **→ 9c** · **6c · `QtyStepper` del sistema sin rol ni teclado** (los «+» y «−» son `div`): lo usan el menú y la pantalla de boletos; parche
      de accesibilidad como el de Button. (6c, 10 nov) — **✓ (comprobado 15 nov):** ya resuelto en 9c: `scripts/portar-sistema.mjs` (`accesibilizar`, tabla A11Y) da a cada `<div>`/`<span>` con clic del sistema rol, foco y teclado con `__ds_scope.__btn` (packages/ui/src/ds/scope.js); Button e IconButton con su parche; lo vigilan los guardianes `botonAccesible` y `clicConTeclado` y axe en el CI.
- [ ] **→ 9c** · **6c · Eventos en los 9 dispositivos:** `evt6c` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6c, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9f** · **6c · Textos del Super Admin de boletos en inglés:** como el resto del admin, en español. (6c, 10 nov)

## Fase 6 · 6d (después de comprar: transferir, cancelar, cortesías, lista de espera, ayuda B-)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._ — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [ ] **→ 9q** · **6d · SMS de verdad para «Te mandaron un boleto», «Tienes una cortesía» y «Se liberó un lugar»:** salen con la clave del proveedor
      (Telnyx, decisión E2). Hoy: con cuenta llegan en Avisos; a un número sin cuenta solo queda el SMS (`phone_messages`, en el sandbox
      en modo pruebas). Hasta conectarlo, quien recibe sin cuenta no se entera: los textos ya dicen «le avisamos a ese teléfono». (6d, 10 nov)
- [x] **→ después de abrir (DA-11)** · **6d · Compartir el enlace de una transferencia** (WhatsApp, copiar): sin diseño; el enlace solo lo recibe ese teléfono, así que
      compartirlo es seguro. Útil mientras no haya SMS. (6d, 10 nov) — _9a (11 nov): compartir el enlace de una transferencia (WhatsApp, copiar): sin diseño. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-12)** · **6d · Lista de espera de eventos gratis con cupo («cupo lleno»):** no se construyó (el RSVP no aparta; libera a las puertas + 30 min).
      Si se quiere, oferta de 30 min que guarda el RSVP. (6d, 10 nov) — _9a (11 nov): lista de espera de eventos gratis con cupo lleno. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6d · Oferta de la lista de espera de noche:** respeta las horas de silencio (el SMS espera; el aviso llega en Avisos); 30 min pueden
      vencer sin verse. Decidir si es crítica o si no se ofrece de noche (REVISION 6d). (6d, 10 nov) — **✓ 9a (11 nov):** la oferta de la lista de espera respeta las horas de silencio (REVISION 6d y 9a).
- [x] **→ 9k** · **6d · Devolución que Stripe nunca hace** (tarjeta cerrada, cuenta con disputa): queda «pendiente» y el barrido la reintenta para
      siempre con su llave (`refunds.attempts`, `last_error`). Falta la alerta en Dinero / Confianza pasado N intentos y el camino manual. (6d, 10 nov) — **✓ 9k (14 nov):** la alerta «devolución atascada» al equipo de dinero pasado `dinero_alerta_intentos` (Configuración › Dinero, 5), una vez por devolución, y el camino manual en Planes › Ingresos › Alertas: «Resolver a mano» con su nota (refunds.manual_*, la base lo impone una vez); desde ahí el barrido nunca la vuelve a pedir a Stripe y sigue contando como devuelta. Guardián alertasDelDinero.
- [x] **6d · Señales de reventa** (transferencias en cadena, muchas al día a distintos teléfonos): el tope diario existe; las señales para
      Confianza llegan con 6j (`evt_senales`). (6d, 10 nov)
- [x] **6d · La puerta (6g/6h) usa `bol_vigente`** (válido y sin transferencia pendiente) y el paquete sin conexión excluye boletos en
      transferencia y cortesías quitadas; `door_delta` lleva transferidos y devueltos. (6d, 10 nov) _6g (10 nov): en línea hecho (`puerta_entrada`: SE ESTÁ TRANSFIRIENDO; e2e). Falta el paquete (6h)._
      _6h (10 nov): hecho — el paquete marca «en transferencia» y trae los devueltos y anulados con su estado (para decir DEVUELTO / ANULADO sin señal);
      los cambios bajan cada 15 s._
- [x] **6d · Cortesías sin cuenta en la puerta:** _hecho en 6j (10 nov): Confianza › Fraude › EVENTOS Y BOLETOS (ráfaga, transferencias en cadena, duplicados, contracargos) con «Abrir caso»._ se buscan por nombre en `/puerta` (6g). (6d, 10 nov) _6g (10 nov): Buscar «rosa» → la cortesía por su nombre → entrada a mano con motivo (e2e evt6g)._
- [x] **6d · Contrato con Stripe de `POST /v1/refunds` sin `reverse_transfer`** (cobro de la plataforma): corre en el CI con stripe-mock. (6d, 10 nov) _6e (10 nov): corrido en local contra stripe-mock con todo el contrato (también transfers y reversals)._
- [x] **6d · Liquidación (6e):** _hecho en 6e (10 nov): evt_liq_calc usa refunds y fee_waived_cents; lo devuelto después de pagar resta de la siguiente o revierte._ `ticket_refund_lines` (`fee_kept_cents`, `fee_waived_cents`) es la fuente de lo devuelto por fecha; una
      devolución después de pagado al organizador resta de la siguiente. (6d, 10 nov)
- [ ] **→ 9s** · **6d · Abogado:** política de cancelación del comprador (24 h, menos el cargo) y de transferencia (sin precio) en los Términos; ley de
      reventa de PA. (6d, 10 nov)


## Fase 6 · 6e (cambios del evento y dinero del organizador)
- [x] **→ 9k** · **6e · Contrato de `pasarela.cliente` (POST /v1/customers):** lee la base antes de llamar a Stripe y el contrato corre sin base; es la
      única llamada a Stripe fuera de `scripts/contrato-stripe/prueba.cjs` (guardián `contratoCubreLaPasarela` la deja anotada). Darle un
      doble de la base al contrato y probarla. (6e, 10 nov) — **✓ 9k (14 nov):** scripts/contrato-stripe/correr.sh le da a la pasarela un doble de la base (users.stripe_customer_id en memoria; cualquier otra consulta falla) y prueba.cjs prueba `pasarela.cliente` (la primera vez crea y guarda, la segunda lee); el guardián contratoCubreLaPasarela ya no tiene excepciones. Compilado y probado aquí contra una API falsa; con stripe-mock corre en el CI.
- [x] **6e · Cargo de Stripe por disputa ($15):** lo absorbe To'Latino; decidir si se le cobra al organizador. (6e, 10 nov) — **✓ 9a (11 nov):** el cargo de Stripe por disputa lo absorbe To'Latino (REVISION 9a).
- [x] **→ 9k** · **6e · Revertir una transferencia sin saldo del organizador:** Stripe la rechaza; queda pendiente y se reintenta con su llave. Falta la
      alerta en Dinero y el camino manual (cobrarle al organizador). (6e, 10 nov) — **✓ 9k (14 nov):** la alerta «transferencia sin saldo para revertir» y el camino manual (cobrarle al organizador fuera de Stripe: «Resolver a mano» con su nota; event_settlement_reversals.manual_*; la deuda la sigue contando como revertida y el barrido no la vuelve a pedir). Guardián alertasDelDinero.
- [x] **→ después de abrir (DA-13)** · **6e · Cambiar el lugar de un evento con ventas:** no se construyó (cancelar y publicar otro, o un cambio que revisa To'Latino). Las
      transferencias de boletos pendientes no se ajustan al mover la fecha (vencen a la hora de antes). (6e, 10 nov) — _9a (11 nov): cambiar el lugar de un evento con ventas. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6e · Super Admin «Extender ventas» y «Ajustar cupo»** (admin-dashboard L183–185): con 6j. «Congelar» y «Cancelar y devolver todo» sí. (6e, 10 nov)
- [x] **6e · Alerta «evento con sobreventa»** (admin-dashboard L74): con las existencias y sus checks no debería pasar; la alerta viva llega con 6j. (6e, 10 nov)
- [ ] **→ 9q** · **6e · Costo de la tarjeta absorbido (§6 #24):** _hecho en 6j (10 nov): vista `evt_sobreventa`, alerta en Eventos y boletos y en el Inicio del Super Admin (adm6j la fuerza con un boleto fuera de la regla)._ _hecho en 6j (10 nov): en la ficha del evento, por fecha, con motivo, aviso, event_changes y auditoría; nunca bajo lo vendido ni después del inicio._ se guarda un estimado (2.9 % + 30 ¢ por orden devuelta) para Confianza; con Stripe real,
      leer el `balance_transaction.fee` de cada cobro. (6e, 10 nov) — _9a (11 nov): el estimado del costo de la tarjeta está (6e/6j); falta leer balance_transaction.fee de cada cobro con Stripe real._
- [ ] **→ 9q** · **6e · Payouts de Stripe al banco del organizador:** la transferencia llega a su saldo de Stripe el martes; de ahí al banco con su
      calendario (semanal, martes). Con dinero real, confirmar que el calendario y la transferencia del mismo martes no atrasan una semana. (6e, 10 nov)
- [x] **→ 9n** · **6e · Avisos del organizador sin moderación:** van tal cual a los que van (sin SMS); pasarlos por la auto-moderación (5d) antes de abrir. (6e, 10 nov) — **✓ 9n-2 (14 nov):** el aviso pasa por revisarTextoSuelto (odio, estafa, inmigración, datos personales) antes de salir; si lo marca, no sale y queda en Colas. Guardián avisoDelOrganizadorModerado.
- [ ] **→ 9s** · **6e · Abogado:** To'Latino como comerciante del cobro y la transferencia al organizador (1099-K), la política de cancelación del
      organizador y del cambio de fecha en los Términos. (6e, 10 nov)


## Fase 6 · 6f (series y eventos de varios días)
- [x] **6f → 6g/6h · La puerta de varios días:** cada boleto guarda sus días (`tickets.valid_days`, lo pone la base) y `bol_fechas_validas(boleto)` /
      `bol_vale_en(boleto, fecha)` dicen en qué fechas entra; el pase entra **una vez cada día** (las entradas por día van en `ticket_entries`
      de 6g). El paquete sin conexión (6h) debe llevar los días de cada boleto. (6f, 10 nov) _6g (10 nov): en línea hecho (ES DE OTRO DÍA con el día que vale;
      el pase una vez cada día en `ticket_entries`; e2e). Falta el paquete (6h)._
      _6h (10 nov): hecho — el paquete trae los días de cada boleto (todos los del evento de varios días: ES DE OTRO DÍA sin señal; e2e)._
- [x] **→ después de abrir (DA-14)** · **6f · Una serie sin fin** («cada jueves, siempre»): no existe; «cuántas fechas» cuenta desde la primera y el tope es Configuración (52).
      Si se quiere, n = sin límite con el barrido creando hasta el horizonte. (6f, 10 nov) — _9a (11 nov): una serie sin fin («cada jueves, siempre»). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6f · Panel de una serie: CORTESÍAS, DEVOLUCIONES y AYUDA CON ÓRDENES** muestran todas las fechas juntas (cada fila dice su orden);
      lo vendido, compradores, lista de espera, cambiar y cancelar sí son de la FECHA QUE ESTÁS VIENDO. (6f, 10 nov) — **✓ 9a (11 nov):** así se decidió (REVISION 6f): cortesías, devoluciones y ayuda de una serie se ven juntas; lo demás por fecha.
- [x] **→ después de abrir (DA-15)** · **6f · Mesas en un evento de varios días:** no se venden (una mesa es de una noche; REVISION 6f). Si el fundador las quiere, mesa por día
      con su existencia en cada día. (6f, 10 nov) — _9a (11 nov): mesas en un evento de varios días (mesa por día). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-16)** · **6f · Cancelar o mover UN día de un evento de varios días:** no se puede (se cancela entero); con pases, devolver la parte de un día
      necesita una regla de devolución parcial. (6f, 10 nov) — _9a (11 nov): cancelar o mover un solo día de un evento de varios días (necesita devolución parcial). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6f · Cambio de artista de una fecha con SMS:** hoy va en la app (sin SMS, §6 #7); el prototipo decía SMS. (6f, 10 nov) — **✓ 9a (11 nov):** el cambio de artista va en la app, sin SMS (§6 #7 de la Fase 6) (REVISION 9a).
- [x] **→ 9b** · **6f · Velocidad con la base de carga:** la lista deduplica la serie con un anti-join por fila sobre (event_id, starts_at); medir p95 con
      `scripts/carga/eventos-1m.mjs` (series de 52 fechas incluidas) junto con 6b. (6f, 10 nov) — **✓ 9b-3 (13 nov):** este fin de semana (series de 52 fechas, sin repetir la serie) p95 13,7 / 14,9 ms (≤ 50; cargas 43457199398 / 43460154153).
- [ ] **→ 9c** · **6f · Eventos en los 9 dispositivos:** `evt6f` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6f, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **6f · Texto viejo del editor:** «La venta en la app abre pronto» (6a) sigue en el editor de boletos aunque la venta ya existe (6c); lo
      prueba `evt6a`: cambiar el texto y la prueba juntos. (6f, 10 nov) — **✓ 9a (11 nov):** el texto viejo ya no está en el código y evt6a lo prueba («se venden en la app cuando el evento sale publicado»; 66 ✓).


## Fase 6 · 6g (la Puerta en línea)
- [x] **6g → 6h · Sin conexión:** paquete firmado y cifrado, cola local, choques entre porteros. Gancho listo: cada escaneo trae el id del teléfono
      (`ticket_scans.id`), la hora del teléfono (`at_device`) y `puerta_entrada(..., p_offline)`; `door_sessions.clock_offset_ms` y `package_id`
      existen. Hoy, sin señal: «SIN SEÑAL · no se marcó» + **Reintentar** con el mismo id. (6g, 10 nov) _6h (10 nov): hecho (ver «Fase 6 · 6h»)._
- [x] **6g · REPETIDOS en Confianza › Fraude** («boletos duplicados»: el mismo QR que intenta entrar otra vez, `door_counts.dup_n` y
      `ticket_scans.result = 'already_used'`): la señal viva llega con 6h/6j (`evt_senales`). (6g, 10 nov)
- [x] **6g · La app Puerta instalable** (manifiesto y service worker propios, 6h — _hecho en 6h con el logo SVG_) y la cáscara de Capacitor «To'Latino Puerta» (Fase 8); bloqueo del
      teléfono a la app (kiosco) si el negocio lo quiere: no se construyó. (6g, 10 nov) _Kiosco hecho en 8e (11 nov): «Fijar la Puerta en esta pantalla» (Android) y la ayuda de Acceso guiado (iPhone)._
- [ ] **→ Paquete 9-5** · **6g · Cámara en teléfonos reales:** _hecho en 6j (10 nov): señal «Entró dos veces» por persona en Confianza › Fraude._ probada con la cámara falsa de Chromium (jsQR en el Worker). Falta el iPhone del fundador (Safari: sin
      BarcodeDetector → jsQR) y un Android (BarcodeDetector), con poca luz y la linterna. (6g, 10 nov)
- [ ] **→ 9c** · **6g · La Puerta en los 9 dispositivos:** `evt6g` corre en teléfono 390 y escritorio 1360 en local; falta la matriz del CI. (6g, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9n** · **6g · Velocidad con la base de carga:** escaneo en línea local p50 21 ms / p95 26 ms (40 boletos, sin carga); medir ≤ 150 ms ida y vuelta con
      50 k boletos en una fecha (`scripts/carga/eventos-1m.mjs`) y la búsqueda por nombre (hoy `like` dentro de la fecha, sin índice de trigramas). (6g, 10 nov) — _9b-3 (13 nov): escaneo en línea p95 5,6 / 8,0 ms (≤ 150) con 50 mil boletos en la fecha; la búsqueda por nombre p95 131 / 160 ms (presupuesto 150; cargas 43457199398 / 43460154153): recorre los 50 mil con sus nombres. Se dejó de unir la orden; falta un índice de trigramas sobre el nombre (del boleto y de la cuenta, hoy en dos tablas), con la Puerta en lo diferido del negocio (9n)_ — _(9n-17, 15 nov): **0165** `tickets.door_name` (cortesía + titular + cuenta, sin acentos; lo mantiene la base, también al cambiar o borrar la cuenta; nunca a mano) con índice de trigramas `tickets_door_name_trgm`; la Puerta busca `t.door_name like tl_unaccent(…)`. Se cierra cuando la carga `eventos` mida la búsqueda ≤ 150 ms (corrida pedida al CI)._ — **✓ (carga 43719131317, 15 nov):** con 50 mil boletos en la fecha, escanear p95 7,9 ms y buscar por nombre p95 **2 ms** (antes 131–160 ms); presupuesto 150 ms.
- [x] **→ después de abrir (DA-17)** · **6g · Foto en una incidencia:** no se construyó (riesgo de fotos de identificaciones); si el fundador la quiere, foto privada como Ayuda con
      un filtro de documentos. (6g, 10 nov) — _9a (11 nov): foto en una incidencia de la Puerta (riesgo de fotos de identificaciones). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-18)** · **6g · Chat rápido entre porteros** («cerramos VIP», apps-delivery-checkin CHK-EQUIPO): no se construyó; Equipo muestra quién está en cada
      puerta y el panel puede cerrar una. (6g, 10 nov) — _9a (11 nov): chat rápido entre porteros. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-19)** · **6g · Noche sin evento en `/puerta`:** la lista de la noche entra a la Puerta solo con una puerta abierta de un evento del local esa noche; una
      noche sin evento se marca desde Panel › Hoy. Si se quiere, una «puerta de la noche» sin evento. (6g, 10 nov) — _9a (11 nov): una «puerta de la noche» sin evento. En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6g · «Adentro» por puerta con reentrada:** si alguien entra por una puerta y sale por otra, el adentro de cada puerta es aproximado (nunca
      negativo); el total de la fecha es exacto. (6g, 10 nov) — **✓ 9a (11 nov):** el «adentro» por puerta es aproximado y el total de la fecha es exacto (nota, sin cambio).
- [x] **6g · Retención de escaneos** (§6 #25: 13 meses y luego solo totales): hoy se guardan sin vencer (solo inserción). Falta la tarea que los
      resume. (6g, 10 nov) — **✓ 9d (14 nov):** `retener_escaneos_meses` (13): `escaneos_retener()` deja cada escaneo en cifras (sin boleto, código ni dispositivo; `tl.retencion`), en el barrido; prueba datos9d (local, 61 ✓).
- [ ] **→ 9q** · **6g · SMS de verdad para «Te invitaron a la puerta»** (`puerta_invitado`): sale con la clave del proveedor (Telnyx). Hoy en modo pruebas; el
      código también se ve en el panel para dictarlo. (6g, 10 nov)
- [x] **6g · Push de verdad** (hecho en 8c: van por push a To'Latino Puerta) para «Hoy escaneas en la puerta» (`puerta_abre`, una hora antes de las puertas) y «Tienes una puerta»: hoy en Avisos
      de la app (push con la app instalable). (6g, 10 nov)
- [x] **6g · Prueba noc4c dependiente del día:** su reloj movido (−2000 min) no alcanza cuando la próxima noche abierta está a 2 días (martes →
      jueves); con −9000 pasa. Cambiar la prueba para que mueva el reloj desde la noche de la reserva. (6g, 10 nov) — **✓ 9a (11 nov):** noc4c mueve el corte desde la noche de la reserva (1 h antes de ahora, sea la noche que sea; 26 ✓).


## Fase 6 · 6h (la Puerta sin conexión)
- [ ] **→ Paquete 9-5** · **6h · Teléfonos de verdad sin señal:** probado con Chromium (Playwright `setOffline`, service worker, IndexedDB, WebCrypto Ed25519). Falta el
      iPhone del fundador (Safari: Ed25519 en WebCrypto desde 17; antes, @noble/ed25519 dentro del repo) y un Android, en modo avión, con la app en la
      pantalla de inicio y abriéndola en frío sin señal. (6h, 10 nov)
- [ ] **→ 9r** · **6h · Safari borra lo guardado de una web que no se abre en 7 días** (ITP): la lista de la puerta dura una noche (no importa), pero el boleto
      del cliente guardado hace más de 7 días puede no estar sin señal. Con la app de las tiendas (Fase 8) no pasa; hasta entonces, «abre tu boleto
      antes de llegar». (6h, 10 nov)
- [x] **→ 9m** · **6h · Mis boletos guarda solo los boletos abiertos** una vez con señal; guardar todos los próximos al abrir Mis boletos (con su QR) queda
      pendiente (pide firmar todos los QR al listar). (6h, 10 nov) — **✓ 9m (14 nov):** Al abrir Mis boletos se guardan cifrados todos los próximos (hasta 20) sin abrirlos uno por uno. Prueba: `vec9m`.
- [ ] **→ 9r** · **6h · Velocidad con la base de carga:** paquete de 10 k boletos ≤ 1 s y ≤ 1 MB comprimido, subir 500 escaneos ≤ 2 s, validar sin conexión
      ≤ 50 ms en un Pixel emulado (`scripts/carga/eventos-1m.mjs`). Hoy medido solo con los datos del e2e (11 boletos). (6h, 10 nov) — _9b-3 (13 nov): paquete de 10 mil boletos p95 252 / 239 ms y 165 KB (≤ 1 s y 1 MB); el de 50 mil, 1,2 s y 812 KB; subir 500 escaneos 1,35 s / 2,2 s (≤ 2 s; una sola vuelta, la segunda corrida pasó del tope; cargas 43457199398 / 43460154153). Falta volver a medir la subida y validar sin conexión ≤ 50 ms en un Pixel emulado, con las tiendas de verdad (9r)_
- [x] **→ después de abrir (DA-20)** · **6h · Red entre teléfonos de la puerta sin internet** (LAN / Bluetooth) y **QR que cambia cada pocos segundos** (anti-captura): no se
      construyen (§6 #10). Sin señal, dos porteros no se ven: el duplicado se resuelve al subir. (6h, 10 nov) — _9a (11 nov): red entre teléfonos de la puerta y QR rotativo (§3.9). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **6h · Señales de duplicados en Confianza › Fraude** («boletos duplicados»): las incidencias automáticas «Entró dos veces (sin conexión)»
      ya existen (y `door_counts.dup_n`); la señal por comprador llega con 6j (`evt_senales`). (6h, 10 nov)
- [x] **6h · RSVP y «Contar en la puerta» sin señal** se suben con la puerta abierta; si la puerta se cerró (el panel o el barrido) antes de subir,
      esas marcas no cuentan (los boletos sí suben). La lista de la noche (Noche) es solo con señal. (6h, 10 nov) — **✓ 9a (11 nov):** RSVP y «Contar en la puerta» sin señal solo cuentan con la puerta abierta (nota, sin cambio).
- [x] **6h · Un teléfono revocado sin señal** sigue validando con su lista hasta recuperar la señal o hasta que venza (fin + 6 h); nada de lo que
      escanee después cuenta. Si se quiere menos ventana: vencer la lista antes (Configuración) o pedir un PIN al abrir la app sin señal. (6h, 10 nov) — **✓ 9a (11 nov):** un teléfono revocado sin señal valida hasta recuperar la señal o hasta fin + 6 h (REVISION 9a); la ventana se puede acortar en Configuración.
- [x] **6h · Íconos PNG de To'Latino Puerta** (192 / 512, maskable) para instalar en todos los Android; hoy el logo SVG. (6h, 10 nov) — **✓ 9a (11 nov):** superado: To'Latino Puerta es app nativa con íconos PNG y adaptativos (apps/mobile/android/app/src/puerta/res/mipmap-*, ios/Targets/ToLatinoPuerta/Assets.xcassets; 8a).
- [x] **6h · Cifrado en reposo en el navegador:** _hecho en 6j (10 nov): `evt_senales` (duplicado) con «Abrir caso»._ la llave no exportable vive en el perfil del navegador; con el teléfono desbloqueado alguien
      podría usarla en ese navegador. Con la app de las tiendas (Fase 8): llave en el Keychain / Keystore del teléfono. (6h, 10 nov) — **✓ 9a (11 nov):** en la app, la llave vive en el Keychain / Keystore (TLLocal, lib/nativo/almacen.ts; 8a/8e); pruebas app8a, app8e.

## Fase 6 · 6i (evento privado)
- [x] **6i · Contrato con stripe-mock:** el evento privado usa las llamadas que ya cubre `scripts/contrato-stripe/prueba.cjs` (retener con destino
      y comisión, cobrar, liberar, devolver); no hay llamada nueva. Probado contra el simulador; falta correr el contrato en el CI. (6i, 10 nov) — **✓ 9a (11 nov):** el contrato de Stripe corre en el CI (.github/workflows/ci.yml: scripts/contrato-stripe/correr.sh).
- [ ] **→ 9s** · **6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD):** sembrado igual en las 5 ciudades; validar con el contador si aplica
      impuesto local y si el «Todo el local» o la decoración pagan impuesto (hoy todo el subtotal lo paga). (6i, 10 nov)
- [x] **6i · Comisión `evp` 8 % del depósito** (igual que Fiestas, Super Admin › Planes): decisión del fundador (REVISION «### 6i»). (6i, 10 nov) — **✓ 9a (11 nov):** comisión evp 8 % del depósito, como Fiestas (REVISION 6i y 9a).
- [ ] **→ 9q** · **6i · El depósito llega directo al restaurante** (cobro con destino, como toda la app): si el restaurante cancela y su saldo en Stripe no
      alcanza, la devolución depende de Stripe (la plataforma la cubre y la cobra al negocio). Revisar con Stripe el saldo negativo de cuentas
      conectadas antes de abrir. (6i, 10 nov) — _9k (14 nov): el saldo negativo de una cuenta conectada (la plataforma cubre y se lo cobra al negocio) solo se revisa con Stripe de verdad (Connect, modo prueba): 9q. Mientras, una devolución que Stripe no puede hacer cae en la alerta «devolución atascada» con su camino manual._
- [ ] **→ 9q** · **6i · SMS del evento privado:** `evp_nueva` (al restaurante), `evp_propuesta`, `evp_ok` y `evp_cancelado_negocio` llevan SMS; salen de verdad
      cuando haya proveedor (Telnyx, decisión E). Hoy quedan «en modo pruebas». (6i, 10 nov)
- [ ] **→ 9s** · **6i · Términos y políticas:** la política de cancelar de un evento privado (gratis hasta 72 h; después el depósito se queda con el
      restaurante; si cancela el restaurante, devolución completa) va en los Términos versionados (`LegalPage`), con el abogado. 9e dejó el mecanismo
      (`legal_pages` con versión) y los Términos dicen que la política que cada operación muestra antes de enviarla es parte de ellos; el texto de cada
      política dentro de los Términos lo escribe el abogado. (6i, 10 nov · 9e, 14 nov)
- [x] **6i · El Fogón y Mariscos La Bahía** tienen Evento privado encendido en la semilla pero no tienen dueño ni Cobros: una solicitud a ellos solo
      puede vencer (sirven para «Otros que hacen eventos privados»). Al tener dueño, conectar Cobros. (6i, 10 nov) — **✓ 9a (11 nov):** son negocios de la semilla del sandbox sin dueño a propósito; en producción no existen.
- [x] **6i · Mi cuenta › Avisos › Eventos** (grupo `events`, apagar lo no crítico del evento privado) y la sección Eventos de Configuración con
      etiquetas finales: con 6j. Hoy las plantillas `evp_*` van en el grupo de citas (`cit`). (6i, 10 nov)
- [x] **6i · Analítica › Eventos privados** (pedidas → propuestas → aceptadas, depósito, canceladas a tiempo / tarde, por ciudad): con 6j. (6i, 10 nov)
- [ ] **→ 9n** · **6i · Un cambio de un evento confirmado nunca cobra más en la app:** _hecho en 6j (10 nov): Analítica › Eventos › EVENTO PRIVADO (`evp_analitica_dia`)._ _hecho en 6j (10 nov): las evp_* del cliente pasaron al grupo `events` (lo no crítico en Boletos y cambios / Recordatorios; propuesta, confirmación y cancelación siempre); Configuración › Eventos › Evento privado._ si el nuevo total sube, la diferencia se paga en el local; si baja, nunca
      por debajo del depósito pagado (la base lo rechaza). Cobrar un depósito adicional por un cambio: si el fundador lo quiere. (6i, 10 nov) — _9a (11 nov): decisión pendiente: cobrar un depósito adicional por un cambio que sube el total (hoy la diferencia se paga en el local y la base no deja bajar del depósito)._

## Fase 6 · 6j (Super Admin completo, Configuración, avisos, analítica, Mi cuenta) · FASE 6 CERRADA
- [x] **→ 9n** · **6j · Panel › Ajustes › Avisos del negocio** (venta, aforo 90 %, cancelaciones, pago; plan §4 6j): Panel › Ajustes (DASH-AJUSTES, «LO QUE TE
      AVISAMOS») no existe todavía. Hoy al negocio le llega todo en la campana (evt_venta, evt_aforo90, evt_ajuste_admin, evt_pago…). Con Ajustes. (6j, 10 nov) — **✓ 9n (14 nov):** Panel › Más › «Lo que te avisamos»: el dueño apaga grupos (pedidos, citas, reservas, eventos, reseñas, mensajes, quedan pocos); dinero, disputas, ayuda y decisiones de To'Latino no se apagan (notif_templates.biz_pref; avisarNegocio lo mira). Prueba neg9n paso 6; ayuda panel-avisos.
- [x] **→ 9m** · **6j · Mi cuenta › Pagos y movimientos de boletos:** la pantalla Pagos y Wallet (USR-PAGOS) no existe; el recibo de cada orden B- está en la
      orden. Con su fase (Pagos y Wallet). (6j, 10 nov) — **✓ 9m (14 nov):** Pagos y Wallet (9k) + Movimientos (9m) con las órdenes B- de boletos. Prueba: `vec9m`; ayuda `pagos-y-movimientos`.
- [x] **→ 9k** · **6j · Señal «la misma tarjeta en varias cuentas»:** necesita `card.fingerprint` de Stripe (un pm_… es de una sola cuenta); con Stripe real. (6j, 10 nov) — **✓ 9k (14 nov):** Confianza › Fraude › «LA MISMA TARJETA EN VARIAS CUENTAS · 90 DÍAS» desde la base (`tarjetas_en_varias_cuentas`, desde `tarjeta_cuentas_senal` cuentas, 3); con Stripe de verdad, la huella real. Prueba din9k paso 5.
- [x] **→ 9n** · **6j · «Día de pago de eventos» (evt_pago_dia) en SOLO LECTURA:** el panel (Eventos, Cobros), Publica tu evento y la ayuda dicen «el martes».
      Se abre cuando esos textos lean el valor. (6j, 10 nov) — **✓ 9n-6 (15 nov):** el panel (Eventos: «Te llega · a tu banco el martes después del evento» y la nota de Cobros; el dinero por fecha y Cobros › Pagos de eventos), el Super Admin (Liquidaciones y la ficha del evento) dicen el día de la clave (`diaSemanaTxt` de lib/plazo-txt.ts; el día llega del servidor con la liquidación); Publica tu evento no lo dice. 0150 abre la clave y la ayuda lleva la nota del plazo. `pagos_banco_dia` sigue fijo (martes, decisión del fundador). Pruebas: adm6j (la clave ya se edita) y evt6c/evt6e/evt6f.
- [x] **→ 9n** · **6j · Ajustar el cupo de un RSVP desde el Super Admin:** hoy solo boletos, mesas y aforo del día (el cupo del RSVP lo cambia el organizador). (6j, 10 nov) — **✓ 9n-3 (14 nov):** la ficha del evento con RSVP trae «Cupo del RSVP (lugares)» con «Ajustar cupo» (no baja de lo guardado; el último ajuste manda sobre el organizador por el trigger `events_cupo_admin`). Prueba `adm9n3` paso 6; guardián `rsvpCupoAdmin`.
- [x] **9g** · **6j · Analítica › Eventos con la base de carga:** las vistas `evt_analitica_dia` / `evt_asistencia_dia` agregan en cada consulta; con 1 M de
      fechas y 5 M de boletos medirlas y, si pasan del presupuesto, materializarlas por día (refresco en el barrido). (6j, 10 nov) — **✓ 9g (14 nov):** 0137: las cuatro vistas pasan a tablas `*_cache` que rehace el barrido (40 días cada 10 min y la historia una vez al día; las vistas leen desde `analitica_desde()`, sin recorrer años); Analítica lee las tablas (guardián `derivadoNoEditable`). La medida con la base de carga de 1 M no se corrió aquí (va con la carga del CI).
- [ ] **→ 9c** · **6j · Super Admin de Eventos en los 9 dispositivos:** `adm6j` corre en escritorio 1360 y teléfono 390 en local; falta la matriz de CI. (6j, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9f** · **6j · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (las etiquetas de Configuración y las plantillas sí ES/EN). (6j, 10 nov)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._ — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [x] **6j · Avisos viejos con «{evento}» en el título:** se arregló al mandar (guardián avisoTituloLleno); lo que ya estaba en las bandejas del
      sandbox queda como estaba (no se reescribe). En producción no hay avisos viejos. (6j, 10 nov) — **✓ 9a (11 nov):** solo en las bandejas del sandbox; en producción no hay avisos viejos.

- [x] **→ después de abrir (DA-21)** · **6j · Promotores de eventos** (§6 #18: vender cortesías o cobrar por promotor, MEM 208): no se construye; los promotores usan códigos de
      descuento del organizador. Si el fundador lo quiere: un rol «promotor» con su código y su reporte. (6j, 10 nov) — _9a (11 nov): promotores de eventos (§3.9). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-22)** · **6j · Wallet como forma de pago** (§6 #8): solo tarjeta; el Wallet de To'Latino y Apple/Google Pay llegan con su fase. (6j, 10 nov) — _9a (11 nov): Wallet de To'Latino como forma de pago y Apple / Google Pay (§3.9). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9n** · **6j · Panel › Eventos con cursor:** la lista del panel trae hasta 200 eventos (ahora lo vivo y próximo primero); un organizador con cientos de
      eventos necesita «Ver más» con cursor en Pasados y cancelados. (6j, 10 nov) — **✓ 9n-2 (14 nov):** lo vivo completo y lo pasado de a 20 con cursor (fecha+id) y «Ver más». Guardián eventosPanelConCursor; pan9n2 §6.
- [x] **→ 9b** · **6j · Pruebas que fallaron una vez en la corrida seguida de la fase y pasaron solas:** `evt6b-6c` (un aviso de React #418, texto distinto entre
      servidor y navegador, en una de sus ~40 pantallas; dos corridas más, una con la URL de cada error, salieron limpias) y `evt6i` (el paso de la
      propuesta que vence espera 52 s con el reloj real). Hacerlas deterministas: registrar la URL del error de hidratación y mover el reloj en la
      base en vez de esperar. (6j, 10 nov) — **✓ (15 nov):** evt6i ya no espera con el reloj real (adelanta el vencimiento en la base y espera 8 s); evt6b-6c (78 ✓), evt6c (70 ✓) y evt6i (75 ✓) en verde en la confirmación completa 43759335047, sin el aviso de hidratación.
- [x] **6j · Pruebas al revés viejas:** 4 casos ya no cazan porque cambian textos que un bloque posterior reemplazó (alreves6b `rsvpConCupo` sobre
      0107 y alreves6g `escaneoIdempotente` / `libroSoloInsercion` sobre 0112: la función viva es la redefinida en 0111 / 0113; alreves6d
      `devolverCoincide` sobre Transacciones.tsx de antes de 6i). Fallan igual con los guardianes de HEAD; apuntarlas a la última definición. (6j, 10 nov) — **✓ 9a (11 nov):** alreves6b apunta a la última definición (0110 / 0112) y alreves6d / 6g pasan: 31/31, 42/42, 32/32.

## Fase 7 · 7a (la ayuda como base de conocimiento y el Centro de ayuda)
- [x] **7a · Soporte detrás de la ayuda:** el pie «¿No es lo que buscabas?» y los «escríbenos / escribe a Soporte» de varias ayudas llevan a Mi cuenta
      hasta que exista Soporte (7b); 7b los cambia a `/soporte` y pone «Pregúntale al Compa» cuando llegue 7d. (7a, 10 nov) — 7b (10 nov): el pie
      del Centro de ayuda y de cada artículo dice **Escríbenos** y abre `/soporte`; los avisos del panel (foto quitada, reclamo, tipo ajustado)
      traen «Escribir a Soporte»; los textos de error dicen «Mi cuenta › Ayuda y soporte» o «Más › Ayuda y Soporte». Falta «Pregúntale al Compa» (7d). — **✓ 9a (11 nov):** «Pregúntale al Compa» en Soporte y en el Centro de ayuda (app/(app)/soporte/compa, 7d); prueba compa7d.
- [x] **→ 9f** · **7a · Inglés de la ayuda:** el inglés es un resumen fiel; ~25 archivos tienen menos de una quinta parte del largo del español (p. ej.
      propiedades-y-visitas, inscribirse, cita-con-doctores, emergencia-24-7). Ampliarlos antes de abrir; El Compa en inglés depende de eso. (7a, 10 nov) — **✓ 9f-5 (15 nov):** los 165 artículos con inglés por debajo de tres cuartos del español se rehicieron completos (cinco grupos; el español intacto, comprobado byte a byte); hoy los 210 están entre el 78 % y el 105 % del español. ayudaConForma y ayudaSinFaseInterna limpios.
- [x] **7a · SMS de invitación al equipo del panel:** `app/panel/acciones-equipo.ts` `enviarInvitacion` no manda nada (la pantalla y la ayuda lo dicen).
      Conectarlo a `avisarTelefono` como la invitación de porteros. (7a, 10 nov) — **✓ 9l (14 nov):** avisarTelefono(«equipo_invitado») con el código, por el único camino de los SMS.
- [x] **→ 9h** · **7a · Centro de ayuda público para buscadores:** los artículos de vecinos no entran a un sitemap todavía (las páginas de equipo y negocio ya
      dicen noindex). Con la web pública (Fase 9). (7a, 10 nov) — **✓ 9h (14 nov):** la parte 0 del mapa del sitio lleva `/ayuda` y cada artículo que ve quien entra SIN sesión (`audienciasDe(null)` = vecino; los de negocio y equipo nunca), más las páginas legales y la landing. Solo en producción.
- [x] **→ 9f** · **7a · Editar la ayuda desde el Super Admin:** hoy el repo es la fuente y el Super Admin solo pausa (§6 #12); el editor llega con el CMS. (7a, 10 nov) — **✓ 9f-5 (15 nov):** Textos y páginas › Ayuda › Editar (por sección, con motivo, sale al instante; Deshacer); 0168 (help_edits solo inserción, repo_sha256: el despliegue no pisa lo editado mientras el archivo no cambie; si cambia, manda el repo y la edición se cierra «en_repo» o «reemplazada»); /api/ayuda/ediciones + workflow «Ayuda editada» para pasarlo al repo (lo del equipo nunca sale); guardián ayudaEditadaRepoManda (alreves9f5 10/10); e2e ayu9f5.
- [ ] **→ 9c** · **7a · Centro de ayuda en los 9 dispositivos:** `ayu7a` corre en 390 y 1360 en local; falta la matriz de CI. (7a, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 7 · 7b (Soporte: casos con To'Latino)
- [x] **7b · Correo entrante de Soporte** (§6 #16): no se construye en esta fase; los casos entran por la app (y por WhatsApp en 7h). Una cuenta
      que no puede entrar (suspendida, baneada, dispositivo bloqueado) lee «Escríbele a Soporte» y hoy no tiene por dónde: definir el canal
      (correo de soporte o una página pública de contacto con verificación) antes de abrir. (7b, 10 nov) — **✓ 9l (14 nov):** Amazon SES → SNS firmado → /api/correo/entrada: solo lo que Amazon firma (tema propio, certificado de sns.*.amazonaws.com) y aprueba (SPF o DKIM, sin spam ni virus); el correo CONFIRMADO de una cuenta (aunque esté suspendida) abre un caso TK- tapado; contestar con el número en el asunto vuelve al caso. Guardián correoEntranteFirmado; avi9l sección 4.
- [x] **7b · Aviso de respuesta por correo** (plan: «push + correo»): hoy sop_recibido, sop_respuesta y sop_resuelto llegan a la campana de la
      app; el correo con plantilla propia (email_outbox) y el push llegan con el canal de push de las apps. (7b, 10 nov) — **✓ 9l (14 nov):** support_reply al correo confirmado (con el texto si el caso entró por correo); queda en support_replies_out.
- [x] **→ 9n** · **7b · Feriados del equipo** (§6 #17): el plazo cuenta lunes a viernes 9–6 sin feriados; sumar un calendario de feriados cuando haya
      equipo. (7b, 10 nov) — **✓ 9n (14 nov):** staff_holidays (Colas › Ajustes, solo un Admin; nada se borra) y soporte_sla no cuenta esos días.
- [x] **7b · Copiloto en la ficha del caso** («Sugerir respuesta con El Compa», §4 7g) y «Pregúntale al Compa» en Soporte (7d): la ficha y la
      pantalla ya tienen su lugar; se encienden con El Compa. (7b, 10 nov) — 7d: «Pregúntale al Compa». 7g (11 nov): el copiloto en la ficha del
      caso y en Colas › Ayuda con pedidos y citas (`compa7g`).
- [x] **7b · Analítica de Soporte** (`soporte_analitica_dia`: casos por tema, primera respuesta, SLA cumplido, «¿Se resolvió?») y Mi cuenta ›
      Avisos › Soporte: en 7i. Hoy las cifras salen en Super Admin › Soporte. (7b, 10 nov) — **✓ 9a (11 nov):** Analítica de Soporte (soporte_analitica_dia, 7i) y Mi cuenta › Avisos › Soporte; prueba adm7i.
- [ ] **→ 9c** · **7b · Soporte en los 9 dispositivos:** `sop7b` corre en 390 y 1360 en local; falta la matriz de CI. (7b, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9n** · **7b · Asignar un caso a una persona concreta** (hoy: tomarlo uno mismo, «Tomar el siguiente caso» o «Pasar a Finanzas / un Admin», que lo
      deja sin asignar para ese rol). Elegir a quién desde la ficha, con la lista del equipo activo. (7b, 10 nov) — **✓ 9n (14 nov):** «Asignar a…» en el caso y en lote: a alguien activo cuyo rol ve la cola, con colas:aprobar, en la ciudad del caso; auditado.

## Fase 7 · 7c (el motor de El Compa)
- [ ] **→ 9q** · **Cuenta de Anthropic** (el fundador, en persona: términos y facturación) y la llave `ANTHROPIC_API_KEY` con el formulario seguro del entorno
      (nunca en el chat). Falta además el camino de la llave al servidor de pruebas (`/etc/tolatino/pruebas.env` → compose ya la pasa): el mismo
      que tendrán `STRIPE_SECRET_KEY` y Telnyx (hoy ninguna llave de terceros llega sola al servidor).
- [ ] **→ 9q** · **Retención cero (ZDR)** pedida a Anthropic para la cuenta de producción; si no la dan, decirlo en Privacidad (`privacidad-de-el-compa`).
- [ ] **→ 9q** · **Primera llamada real** con la llave en el sandbox: revisar el formato exacto de la respuesta (esquema, `stop_reason`, `usage`) contra
      `lib/compa/modelo-claude.ts` y que `inference_geo` y el esfuerzo bajo se acepten para Haiku 5.5; medir p95 (meta ≤ 4 s) y el costo real por turno.
- [ ] **→ 9q** · **Batería del modelo real** (`scripts/compa/bateria/`, ≥ 150 preguntas ES/EN con revisión determinista, meta ≥ 95 %) — gasta dinero, dentro del
      tope; con la llave.
- [ ] **→ 9v** · **Encender en producción** (fase 9): poner `TOLATINO_COMPA=encendido` en el entorno de producción (candado de `lib/compa/interruptores.ts`).
      Sin eso, El Compa queda apagado aunque los interruptores digan otra cosa. El simulador no existe allí.
- [x] **Purga por retención** (12 meses → solo cifras) y por cuenta borrada (D5, 30 días): la ayuda `privacidad-de-el-compa` ya lo promete; se
      construye con el Super Admin completo de El Compa. `compa_retener_meses` queda bloqueada en Configuración hasta entonces. — **✓ 9d (14 nov):** la retención corre desde 7i (adm7i); la de cuenta borrada la hace la purga de 9d, que reusa `soporte_purgar_casos` y `compa_purgar_conversaciones` (adm7i 117 ✓ y datos9d en local).
- [ ] **→ 9s** · **Abogado:** aviso de IA en Términos y Privacidad; el texto (tapado y mínimo) se procesa con Anthropic en EE. UU.; quién del equipo lee las
      conversaciones y cuánto se guardan.
- [x] El copiloto, el panel y las respuestas automáticas usan el mismo motor (`turno` hoy solo acepta el uso «vecino»). — 7e (11 nov): el panel
      ya usa el motor (`turnoPanel` sobre `consultar()`, la llamada al modelo común); faltan las respuestas automáticas (7f) y el copiloto (7g).
      — 7f: respuestas automáticas por `consultar()`. 7g (11 nov): el copiloto también (`borradorCopiloto`, con su esquema y `verificarCopiloto`).
- [x] `go_to_panel` usa una lista cerrada mínima (hoy, mensajes, cobros, eventos, más) hasta que exista `compa_panel_guide`. — 7e (11 nov):
      `go_to_panel` va contra `compa_panel_guide` (0120) filtrada por las partes de la persona; confirmar relee la guía y pide `accesoPanel`.

## Fase 7 · 7d (El Compa para vecinos)
- [x] **→ después de abrir (DA-23)** · **7d · Botón «Ayuda» en operaciones vivas:** la hoja sale donde ya había «Ayuda con …» (casi siempre en operaciones terminadas). Para una
      cita o mesa pendiente, El Compa la cancela desde Soporte › Pregúntale al Compa; el diseño pone «Ayuda» también en la cita por venir. Decidir
      si se suma ese botón en cada pantalla de operación viva. (7d, 10 nov) — _9a (11 nov): el botón «Ayuda» en cada operación viva (hoy El Compa cancela desde Soporte). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ después de abrir (DA-24)** · **7d · Ampliar lo que El Compa puede cancelar** (§6 #6): hoy solo citas y mesas pendientes y sin cobro (`CANCELABLES`); visitas, fiestas,
      viajes o noches pendientes abren su pantalla. Decisión del fundador. (7d, 10 nov) — _9a (11 nov): ampliar lo que El Compa puede cancelar (visitas, fiestas, viajes, noches). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **7d · Pruebas viejas de Ayuda con El Compa encendido:** `ayuda2i`, `cit3e`, `ayu4if`, `ayu4z` pasan con El Compa apagado y al tope; encendido
      la hoja sale antes del formulario (es el cambio) y esas pruebas deben entrar por «Algo no salió bien» o con `?de=compa`. Ajustarlas cuando
      pasen a la matriz de CI. (7d, 10 nov) — **✓ 9a (11 nov):** ayuda2i, cit3e, ayu4if y ayu4z pasan con El Compa encendido: entran por la hoja («Algo no está bien / no salió bien») o con ?de=compa.
- [x] **7d · Super Admin › Usuarios 360° › El Compa** (cifras por persona) y «Marcar respuesta incorrecta», Resumen y Negocios de `ADM-COMPA`:
      con el Super Admin completo de El Compa (7i). La ficha con el hilo y las lecturas anotadas ya están (7d). (7d, 10 nov) — **✓ 9a (11 nov):** Usuarios 360° › El Compa y «Marcar respuesta incorrecta» (app/admin/ElCompaAdmin.tsx, 7i); prueba adm7i.
- [ ] **→ 9c** · **7d · El Compa en los 9 dispositivos:** `compa7d` corre en 390 y 1360 en local; falta la matriz de CI. (7d, 10 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **7d · Pantalla de un pedido sin hora de «listo» o de respuesta** (`lib/pedir.ts` `pedidoDe` falla con `ready_at` o `respond_by` nulos): la
      semilla 0041 repara el pedido de la 0040; pedidos de prueba hechos a mano siguen fallando. Hacer la pantalla tolerante. (7d, 10 nov) — **✓ 9a (11 nov):** pednull crea su propio pedido sin horas y pasa (15 ✓); cazó que el detalle del panel decía «antes de las null» → arreglado (app/panel/Pedidos.tsx) y el guardián pedidoHorasOpcionales lo vigila.

## Fase 7 · 7e (El Compa en el panel)
- [x] **7e · Un miembro con partes en la semilla del sandbox:** el panel no tiene todavía la pantalla para dar partes a alguien del equipo
      (Moderadores, más arriba), así que en el sandbox no hay un miembro con una sola parte para mirar «Eso lo ve el dueño». La prueba `compa7e`
      lo crea en la base local. Propuesta: la semilla 0042 (7f) suma una moderadora de prueba en Sabor Dominicano con «Hoy y pedidos». (7e, 11 nov)
      — 7f (11 nov): la semilla 0042 suma a Rosa Prueba (5705550691), moderadora de Sabor Dominicano con solo «Hoy y pedidos».
- [x] **7e · Respuestas automáticas en Panel › El Compa** (Pro, `lockB` para Free, «Pruébalo como cliente», «Lo que contestó El Compa»): 7f. Hoy
      la sección es solo el asistente y su cabecera no las menciona. (7e, 11 nov) — 7f (11 nov): hechas, y la cabecera dice «…y, con Pro, contesta a
      tus clientes cuando tú no puedes.».
- [ ] **→ 9c** · **7e · El Compa del panel en los 9 dispositivos:** `compa7e` corre en 390 y 1360 en local; falta la matriz de CI. (7e, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [ ] **→ 9q** · **7e · Calidad con el modelo real:** la batería (`scripts/compa/bateria/`) debe sumar preguntas del panel (dueño y miembro con partes,
      ES/EN, «llévame a…», dinero, transferir el negocio) cuando haya llave. Con el simulador la respuesta es la guía o el primer trozo de ayuda;
      con Haiku debería elegir el trozo útil. (7e, 11 nov)
- [x] **7e · Visto de paso: el pedido pagado de la semilla 0040 (El Fogón, #1360 en local) no tiene líneas** (`operation_lines`): su «Ayuda
      con el pedido › Falta algo» muestra «¿QUÉ PLATOS?» vacío y no deja seguir. `compa7d` §8 ya elige un pedido con líneas; corregir la semilla
      (una semilla nueva que le sume sus líneas, sin tocar la 0040) o que el formulario lo diga. (7e, 11 nov) — **✓ 9a (11 nov):** la semilla nueva infra/pruebas/semilla/0049_base_nueva.sql le pone sus dos líneas ($80) sin tocar la 0040.
- [x] **7e · «Cambiar mi teléfono / ciudad / borrar la cuenta» escrito en el panel** abre un caso de cuenta del negocio (el plan lo pide así);
      si el dueño quería su cuenta personal, ¿mejor abrirle Mi cuenta como al vecino? Decisión del fundador. (7e, 11 nov) — **✓ 9a (11 nov):** «cambiar mi teléfono / ciudad / borrar la cuenta» escrito en el panel abre un caso de cuenta del negocio (REVISION 9a).

## Fase 7 · 7f (respuestas automáticas de El Compa y «Sugerir respuesta»)
- [x] **→ 9n** · **7f · «Si no contestas en 10 min» y «Siempre, al instante»** (CUÁNDO del diseño): hoy solo «Fuera de tu horario» (§6 #8). Se construyen con
      `chat_threads.compa_pending_until` (ya existe) y el barrido; `compa_auto_espera_min` queda bloqueada en Configuración hasta entonces. (7f, 11 nov) — _(9n-2, 14 nov): no entró: pide el trabajo del barrido de compa_pending_until y su prueba; sigue abierto._ — _(9n-7, 15 nov): hecho. Los tres CUÁNDO en Panel › El Compa; «Si no contestas» marca `chat_threads.compa_wait_until` (0153) y el barrido lo pasa al turno al vencer (si el negocio contestó, nada); `compa_auto_espera_min` abierta en Configuración. Por WhatsApp/SMS «si no contestas» cuenta como fuera de horario. Guardián compaRespuestaAuto al día; compa7f §12._
- [x] **7f · WhatsApp y SMS en las respuestas automáticas** (POR DÓNDE): 7h. Hoy solo el chat de To'Latino (`channels` = {app}). (7f, 11 nov)
      — 7h (11 nov): POR DÓNDE con WhatsApp y SMS, solo con el número del negocio conectado en Super Admin › El Compa › Canales (`compa7h`).
- [x] **→ 9b** · **7f · «order by» sobre `id::text`** (clase): en Postgres `select id::text … order by id` ordena el texto (100 antes que 98). Cazado en 7f
      (arreglado en lib/compa y lib/mensajes, guardián `ordenSinTexto` solo ahí); quedan ~45 consultas en otros módulos (p. ej. `change_proposals
      … order by id desc limit 1` en citas, fiestas, noche, inscripciones, visitas y viajes; listas de secciones e ítems; `payments` en ayuda-cita
      y layaway). Arreglarlas y ampliar el guardián a todo el código (tarea sugerida en la sesión). (7f, 11 nov) — **✓ 9b-3 (13 nov):** `ordenSinTexto` revisa todo `apps/web/lib` y `apps/web/app`; las 50 consultas que ordenaban el texto del id, arregladas (califican la columna); al revés en `alreves9b3`.
- [ ] **→ 9q** · **7f · Calidad con el modelo real:** la batería (`scripts/compa/bateria/`) debe sumar preguntas de clientes a un negocio cerrado (horario,
      menú, cómo pedir, descuentos, «¿hay mesa?», inyecciones en la nota del dueño y en una FAQ, inglés y spanglish) y borradores de «Sugerir
      respuesta». Con el simulador, una pregunta de precio contesta los tres primeros del menú (no el que preguntaron): con Haiku debería elegir.
      El idioma del cliente se adivina por sus palabras (y si no, el de su cuenta). (7f, 11 nov)
- [ ] **→ 9c** · **7f · En los 9 dispositivos:** `compa7f` corre en 390 y 1360 en local; falta la matriz de CI. La prueba vieja de Mensajes (`msg2p`) pasa con
      El Compa apagado y al tope; con las respuestas automáticas encendidas en Sabor Dominicano su paso «cerrado → la fija» no pasa tal cual
      (contesta El Compa, que es el cambio): en CI debe correr con El Compa apagado o apagarlas antes. (7f, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **→ 9m** · **7f · Mensajes no tapa lo que escribe el cliente al negocio** (2p): un número de seguro social (9 dígitos) llega tal cual al negocio; El
      Compa sí lo tapa en lo suyo. ¿Tapar en Mensajes también (como Soporte)? Decisión del fundador. (7f, 11 nov) — **✓ 9m (14 nov):** Mensajes tapa tarjetas y seguro social como Soporte (`tapar` en `lib/mensajes.ts`: «[tapado]» y el aviso «No compartas eso aquí»); la base rechaza el que se salte la app (`mensajes_sin_secretos`, 0143). Guardián `mensajesTapados`. Prueba: `vec9m`.
- [x] **7f · «Marcar respuesta incorrecta»** en una respuesta automática (Super Admin › El Compa › ficha) y analítica de respuestas automáticas: 7i.
      Hoy el reporte del cliente abre el caso en «Mensajes reportados» y ahí se apaga en la conversación. (7f, 11 nov) — **✓ 9a (11 nov):** «Marcar respuesta incorrecta» en una respuesta automática y su analítica (7i, app/admin/ElCompaAdmin.tsx); prueba adm7i.
- [ ] **→ 9s** · **7f · Para el abogado:** respuestas automáticas en nombre de un negocio (que es una IA, que no confirma ni promete) y responsabilidad del
      negocio por lo que escribe en «Lo que El Compa debe saber». (7f, 11 nov)

## Fase 7 · 7g (el copiloto del equipo)
- [ ] **→ 9q** · **7g · Calidad del copiloto con el modelo real (Sonnet):** la batería (`scripts/compa/bateria/`) debe sumar casos de Soporte y ayudas escaladas
      (cobro doble, devolución que no llega, cuenta, técnico; ES/EN; inyección en el mensaje de la persona y en una nota interna; notas internas que
      no deben salir; montos que pide la persona) cuando haya llave. Con el simulador el borrador es fijo («Ya estoy revisando…») y el resumen dice
      el tema; con Sonnet debería resumir de verdad y elegir la macro. Revisar también si el esfuerzo bajo alcanza para Sonnet. (7g, 11 nov)
- [x] **→ 9n** · **7g · «Resolver» y «Resolver y devolver» de un caso TK- con el texto del borrador:** solo «Enviar» marca `from_draft` (y tal cual / editado);
      si alguien usa el borrador para resolver, el borrador queda «descartado» al día. ¿Llevar el borrador también a esos dos? (7g, 11 nov) — _(9n-7, 15 nov): hecho (decisión AB: sí). Los dos toman el borrador como «Enviar» (borradorDe: de ese caso, de esa persona, sin usar y de hoy) → from_draft y el borrador «tal cual»/«editado»; la auditoría lo dice. Guardián copilotoSoloBorrador cubre los tres; compa7g §3b._
- [x] **7g · El copiloto en Cuidado de niños, No me dejan cancelar y Posible estafa:** no sale (datos de niños, constancias y sanciones: decide
      una persona sin IA). Y no lee operaciones de Salud, Profesionales, inscripciones ni con datos privados. Si se quiere, es decisión del
      fundador. (7g, 11 nov) — **✓ 9a (11 nov):** el copiloto no sale en Cuidado de niños, No me dejan cancelar ni Posible estafa, ni lee Salud, Profesionales ni inscripciones (REVISION 9a).
- [x] **→ 9f** · **7g · Lo del equipo (resumen y siguiente paso) en español** (el Super Admin es en español); el borrador sale en el idioma de la persona.
      Cuando el Super Admin tenga inglés, pedirlos en el idioma de quien lo usa. (7g, 11 nov)
      _9f-1/2 (14 nov): el mecanismo está (cookie `tl_lang`, selector Español / English, `par(l)` en `app/admin/TextosComun.tsx`) y Textos y páginas ya sale completo en los dos idiomas; este módulo sigue en español → resto del Super Admin en inglés (9f-4)._
      **✓ 9f (15 nov):** el resumen, el siguiente paso y los avisos del copiloto salen en el idioma de quien usa el Super Admin (cookie `tl_lang`):
      `copilotoSugerir` lo pasa a `borradorCopiloto`; el modelo lo recibe en los datos (`equipo.idioma`, regla 2 de SISTEMA_COPILOTO) y el borrador de
      reglas tiene su versión en inglés. El borrador sigue en el idioma de la persona. compa7g lo comprueba con un equipo en inglés.
- [ ] **→ 9s** · **7g · Para el abogado y Privacidad:** el texto de un caso de Soporte (tapado, sin teléfono ni correo) y las notas internas del equipo se
      procesan con Anthropic en EE. UU. cuando el equipo pide un borrador (la ayuda `privacidad-de-el-compa` ya lo dice). Va con la retención cero
      y el aviso de IA de 7c. (7g, 11 nov)
- [ ] **→ 9c** · **7g · En los 9 dispositivos:** `compa7g` corre en 390 y 1360 en local; falta la matriz de CI. (7g, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Pedidos sin hora de listo o de respuesta (10 nov)
- [x] **Un pedido con `ready_at` o `respond_by` vacíos tumbaba con un 500 la página del pedido del cliente y TODA la pantalla Hoy del panel**
      (`hm2m(null)` en `lib/pedir.ts` y `lib/pedidos.ts`). Ahora esas horas son `string | null`: el cliente ve el pedido sin la hora («La
      cocina ya lo tiene», «Te avisamos cuando esté listo») y el panel lo lista sin hora. Reproducido antes del arreglo (500 en las tres
      pantallas) y probado después en el navegador (`pednull.cjs`, 15/15). Guardián `pedidoHorasOpcionales` (4/4 al revés). (10 nov)
- [x] **`pedidos2c.cjs` (prueba vieja de pedidos) espera «Nada pendiente» en Hoy**, pero desde 6i Hoy también cuenta las solicitudes de evento
      privado abiertas (la semilla deja EP-4125 pendiente en Sabor Dominicano). El pedido vence bien (1378 · expired); hay que actualizar la
      prueba para que limpie o ignore esas solicitudes. (10 nov) — **✓ 9a (11 nov):** pedidos2c ya no espera «Nada pendiente»: comprueba que el pedido vencido sale de «Esperan tu respuesta» (pruebas/e2e/pedidos2c.cjs).

## Fase 7 · 7h (El Compa por WhatsApp y SMS con enlace)
- [ ] **→ 9q** · **7h · Cuentas de los proveedores (el fundador, en persona):** Telnyx (número de To'Latino + registro **10DLC** de la marca y la campaña de
      respuestas, con STOP/HELP) y Meta (WhatsApp Business Account verificado, la app y el número). Las llaves (`TELNYX_API_KEY`, la llave
      pública `TELNYX_PUBLIC_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`) van al formulario seguro del entorno; el
      compose ya las pasa (vacías). Falta el camino de las llaves a `/etc/tolatino/pruebas.env` (el mismo que Stripe y Anthropic). (7h, 11 nov)
- [ ] **→ 9q** · **7h · Hosts de salida para el sandbox:** `api.telnyx.com` y `graph.facebook.com` cuando haya llaves (no se tocó la red). (7h, 11 nov)
- [ ] **→ 9v** · **7h · Fase 9:** WhatsApp encendido y **SMS apagado** (§6 #14): poner `compa.channel.sms` en pausa en producción, además del candado
      `TOLATINO_COMPA=encendido`. Conectar el número de To'Latino en Super Admin › El Compa › Canales. (7h, 11 nov)
- [ ] **→ 9q** · **7h · Respuesta de STOP de los proveedores:** Telnyx y Meta pueden mandar su propia confirmación de STOP; El Compa ya manda una. Dejar una
      sola (apagar la del perfil de Telnyx o la nuestra) al conectar. Con el canal en pausa, solo sale la del proveedor. (7h, 11 nov)
- [x] **7h · Plantillas de WhatsApp (escribir primero):** fuera de la ventana de 24 h no sale nada; los avisos por WhatsApp (código de entrada,
      boletos, citas) necesitan plantillas aprobadas por Meta. No se construyó. (7h, 11 nov) — **✓ 9l (14 nov):** wa_templates (código, boletos, cita, soporte; ES y EN) con su estado en Meta, «Mandar a Meta» y el webhook firmado de su estado; Soporte la usa fuera de la ventana si está aprobada. Mandarlas con la cuenta real → 9q (línea nueva).
- [ ] **→ 9n** · **7h · Bandeja de los negocios por SMS:** las respuestas automáticas por SMS a un número del negocio funcionan, pero el dueño no tiene
      dónde leer ni contestar esos SMS en To'Latino (el de WhatsApp lo lee en su app de WhatsApp Business). Antes de encender SMS a negocios,
      una bandeja en Mensajes o dejarlo solo en WhatsApp. (7h, 11 nov) — _(9n-2, 14 nov): no entró: necesita su diseño de bandeja en Mensajes; antes de encender SMS a negocios sigue valiendo dejarlo solo en WhatsApp._
- [x] **7h · Estado de entrega** (los avisos `message.finalized` de Telnyx y los `statuses` de Meta): hoy se ignoran; anotarlos en
      `compa_outbound` y en las cifras de Notificaciones (también los SMS de avisos). Sin reintentos de un envío que falló. (7h, 11 nov) — **✓ 9l (14 nov):** message.finalized de Telnyx → sms_attempts / sms_outbox (y la salida de El Compa); statuses de Meta → compa_outbound; reintentos con espera creciente. Guardián smsConReintento.
- [x] **7h · Especificaciones del contrato fijas:** `scripts/contrato-canales/correr.sh` baja la especificación de Telnyx (`master`) y la de Meta
      (`main`, v23.0) en cada corrida; fijarlas a un commit para que un cambio del proveedor no rompa la CI sin aviso. (7h, 11 nov) — **✓ 9l (14 nov):** correr.sh las baja de un commit fijo (Telnyx bf2eb8e…, Meta e96a1c9…) y revisa su sha256; el contrato prueba también mandarPlantilla, crearPlantillaMeta, los avisos de entrega y el estado de las plantillas (31 ✓ con las especificaciones fijas).
- [x] **7h · El simulador y los SMS de avisos:** los avisos por SMS (`lib/avisos.ts`, 6d transferencias/cortesías/lista de espera, 6g puerta,
      7a invitación al equipo) siguen saliendo por su propio camino (Telnyx con `TELNYX_FROM`, modo pruebas en el sandbox); ahora respetan STOP
      («baja»). Unificar su salida con `lib/compa/canales-proveedor.ts` cuando se conecte Telnyx. (7h, 11 nov) — **✓ 9l (14 nov):** UN solo camino (lib/sms): avisos, SMS a números sin cuenta, el código para entrar y El Compa por SMS; solo canales-proveedor.ts habla con Telnyx.
- [x] **7h · Soporte por WhatsApp** (admin-dashboard L271): hoy WhatsApp habla con El Compa y «Con una persona» abre un caso TK-; el equipo
      contesta en la app (la persona lo ve ahí), no por WhatsApp. Contestar el caso por WhatsApp = decisión del fundador (costo por mensaje). (7h, 11 nov) — **✓ 9l (14 nov):** la respuesta del equipo le llega por WhatsApp dentro de las 24 h (gratis en la ventana de servicio); encendido de fábrica y reversible en Configuración › Avisos y canales (REVISION 9l).
- [x] **7h · Inundación de remitentes falsos:** el límite es por teléfono (30 al día); un ataque con muchos números falsos por SMS gastaría
      mensajes. Agregar un tope global por minuto con alerta antes de encender SMS. (7h, 11 nov) — **✓ 9l (14 nov):** tope global de números distintos por minuto (60, Configuración) con alerta a los Admins una vez cada 10 minutos (canal_alertas); STOP siempre se respeta. avi9l sección 3.
- [ ] **→ 9s** · **7h · Para el abogado:** TCPA / 10DLC (consentimiento: el canal se enciende en Mi cuenta; STOP/HELP), política de WhatsApp Business
      (ventana de 24 h, opt-in, IA que se presenta) y el aviso de que el texto pasa por Telnyx/Meta y por el proveedor de IA. (7h, 11 nov)
- [ ] **→ 9c** · **7h · En los 9 dispositivos:** `compa7h` corre en 390 y 1360 en local; falta la matriz de CI. (7h, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 7 · 7i (Super Admin completo de El Compa y Soporte; cierre de la Fase 7)
- [x] **7i · Borrado definitivo de una cuenta (D5) completo:** la purga de 7i vacía a los 30 días las conversaciones con El Compa, los casos de
      Soporte y sus fotos de una cuenta borrada (`compa_purgar`, `barrerRetencion`). El resto de lo que promete «Borrar mi cuenta» (perfil,
      direcciones, guardados, reseñas, comentarios, Mensajes con negocios, pasar la cuenta a `deleted`) sigue en el trabajo de Mi cuenta (2h, arriba). — **✓ 9d (14 nov):** todo eso por el mapa (`lib/datos/purgar.ts`); prueba datos9d (local, 61 ✓).
      (7i, 11 nov)
- [x] **7i · Soporte por correo entrante** (admin-dashboard L271, §6 #16): no en esta fase; El Compa y Soporte viven en la app, la web, WhatsApp y
      SMS. (7i, 11 nov) — **✓ 9l (14 nov):** ver 7b · Correo entrante de Soporte (Super Admin › Soporte › Por correo).
- [ ] **→ 9q** · **7i · Batería del modelo real** (§7: ≥ 150 preguntas ES/EN, ≥ 95 %) y el **presupuesto de velocidad** con la base de carga (`compa-1m`):
      sin llave de Anthropic no se corren; todo lo de 7a–7i se probó con el simulador. (7i, 11 nov)
- [x] **9g** · **7i · Analítica a escala:** `compa_analitica_dia` y `soporte_analitica_dia` agrupan al leer (como las vistas de Eventos); con millones
      de conversaciones, pasarlas a una tabla de cifras diarias que llene el barrido. (7i, 11 nov) — **✓ 9g (14 nov):** 0137: `compa_analitica_dia_cache` y `soporte_analitica_dia_cache` (lo mismo que Eventos); Soporte también lee la tabla. Evidencia: tablas = vistas en la base local y en `ana9g`.
- [x] **7i · «Plazo cumplido» de un caso reabierto:** la vista compara la primera respuesta con el plazo vigente del caso (un caso reabierto
      tiene plazo nuevo). Si hace falta el plazo original, guardarlo aparte al abrir. (7i, 11 nov) — **✓ 9a (11 nov):** «Plazo cumplido» compara con el plazo vigente del caso (REVISION 9a).
- [ ] **→ 9c** · **7i · En los 9 dispositivos:** `adm7i` corre en 390 y 1360 en local; falta la matriz de CI y la corrida de CI de 0124 / 0043. (7i, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **7i · «Traducir con El Compa» y «Tómale foto a tu lista»** siguen como decidió el plan (§6 #9, #10): «Traducir» con el traductor propio y la
      foto de la lista sin construir; cambiarlo es decisión del fundador. (7i, 11 nov) — **✓ 9a (11 nov):** como decidió el plan (§6 #9, #10 de la Fase 7) (REVISION 9a).


## Fase 8 → Fase 9 (del plan de las apps, 11 nov)
- [ ] **→ 9u** · Build de producción apuntando a `tolatino.com` con su `apple-app-site-association` y `assetlinks.json`; llave de APNs y proyecto de Firebase de producción, aparte de los del sandbox.
- [ ] **→ 9u** · Cuentas de revisión en producción (decisión I, choque anotado en REVISION) y textos finales de `/privacidad` y `/terminos` revisados por el abogado.
- [ ] **→ 9u** · Ninguna pantalla «Pronto» alcanzable en los builds de tienda (Apple 2.1); la purga final de la cuenta a los 30 días corriendo (L314).
- [ ] **→ 9u** · Enviar a revisión y lanzamiento por fases; beta real en Hazleton.
- [ ] **→ 9r** · Apple Pay / Google Pay nativos; Smart App Banner; passkeys obligatorias para el equipo. — _9j (14 nov): lo del equipo está (segundo factor
      obligatorio: llave o TOTP). Apple Pay / Google Pay nativos y el Smart App Banner necesitan las apps en las tiendas y Stripe de verdad (Paquetes 8-1/8-2 y 9-1)._
- [ ] **→ 9u** · El día del envío: revisar de nuevo las reglas de compras externas en EE. UU. y el SDK mínimo que pide cada tienda.

## Fase 8 · 8a (las cuatro cáscaras, el puente, las islas y el llavero; 11 nov)
- [ ] **→ 9p** · **Paquete 8-0 (dominio) — bloqueado en el fundador:** `pruebas.tolatino.com` detrás de Cloudflare con HTTPS completo, Let's Encrypt en
      `deploy.sh`, nginx en 443, `TOLATINO_URL` y cookies `secure`. Hasta entonces las cuatro apps (que apuntan a `https://pruebas.tolatino.com`)
      abren su página local «Sin señal». Para probar Android contra la IP: `TOLATINO_URL=http://2.31.196.167 node apps/mobile/scripts/generar.mjs
      --preparar` (la app permite HTTP solo si la URL es HTTP; iOS nunca). (8a, 11 nov)
- [x] **Primera corrida de `cascara-android` y `cascara-ios` en CI** (11 nov): compilan los 8; el humo cazó cuatro defectos, ya corregidos con
      su guardián: (1) **seguridad**: en Negocios, Repartidor y Puerta un iframe de otro origen alcanzaba el puente (`server.url` con ruta →
      Capacitor caía a `addJavascriptInterface`), y en las cuatro `CapacitorCookiesAndroidInterface.setCookie` estaba abierto a todo marco
      (`puenteSoloNuestroOrigen`); (2) las cuatro de iOS se cerraban al abrir (SplashScreen pide `LaunchScreen.storyboard`; `cascaraArrancaIos`);
      (3) en Android la página local no se hidrataba y la isla no abría ni tenía TLLocal (con `server.url`, Capacitor no sirve el origen local:
      lo sirve `MainActivity`; `islaCoherente`); (4) el humo daba por buena la isla en cualquier página. (8a, 11 nov)
- [ ] **→ 9r** · **El JS de Capacitor en el origen local de Android** se toma por reflexión de `Bridge.getJSInjector()` (privado; Capacitor 8.6.0 fijo).
      Al subir Capacitor, revisar que siga: si falta, las islas caen a su respaldo web y el humo lo dice («tllocal»: false). (8a, 11 nov) — _9b-3 (13 nov): con las tiendas de verdad (9r)._
- [ ] **→ 9p** · **La red en la WebView** (11 nov, `senalHonesta`): en Android `RedWebView` le cuenta la red a la WebView (`ACCESS_NETWORK_STATE`, normal) y
      el humo lo prueba en modo avión; las islas dicen «hay señal» solo si nuestro servidor responde (`lib/nativo/senal.ts`). Pendiente: (1) iOS
      no se tocó — WKWebView sigue la red del sistema solo, pero el simulador no tiene modo avión: probarlo en un iPhone real con `nat8a`;
      (2) con el dominio (Paquete 8-0), comprobar en el emulador que con red la isla del Repartidor sí dice «Hay señal» (hoy el servidor no
      responde por HTTPS y la isla dice, con razón, «Sin señal»); (3) `setNetworkAvailable` apaga la Network Information API de la WebView
      (`navigator.connection`): nadie la usa hoy; si alguien la necesita, que la lea del lado nativo. (8a, 11 nov) — _9a (11 nov): (2) con el dominio, la isla del Repartidor con red dice «Hay señal»; (1) iOS en un iPhone real va con 9r; (3) es una nota._
- [ ] **→ 9r** · **Humo de iOS más hondo:** hoy solo «abre y sigue viva» (y lo que escribe Capacitor). Falta en el simulador: la isla, TLLocal y el marco
      ajeno sin puente (el portero `TLBridgeViewController` solo lo vigila el guardián). Va con el XCUITest de `nat8a`. (8a, 11 nov) — _9b-3 (13 nov): XCUITest más hondo con las tiendas de verdad (9r); el CI de 9b es web._
- [ ] **→ 9p** · **`nat8a` completo en emulador y simulador** cuando haya dominio: modo avión al abrir → isla de la Puerta con la lista firmada guardada en
      TLLocal; otra cuenta en el mismo teléfono no ve nada; un iframe de otro origen (Stripe Elements) no alcanza el puente (en iOS, el portero
      `TLBridgeViewController`). XCUITest mínimo en el job de iOS. (8a, 11 nov)
- [ ] **→ 9p** · **App-Bound Domains en iOS** (`limitsNavigationsToAppBoundDomains`): declarado y apagado; encenderlo solo después de probar la hoja de Stripe
      y su 3-D Secure en el simulador. (8a, 11 nov)
- [ ] **→ 9r** · **Islas más livianas:** hoy se copia todo `/_next/static` (≈6 MB por app); copiar solo los trozos que usan las islas. (8a, 11 nov) — _9b-3 (13 nov): con las tiendas de verdad (9r)._
- [x] **→ después de abrir (DA-25)** · **La isla de la Puerta en la app sube la cola sola** (hoy la sube la puerta en línea, con la misma cola del llavero): necesitaría un token de
      la sesión de puerta y CORS desde el origen local. (8a, 11 nov) — _9a (11 nov): la isla de la Puerta sube su cola sola (token de la sesión de puerta y CORS desde el origen local). En `docs/DESPUES-DE-ABRIR.md`._
- [x] **→ 9m** · **Mi cuenta › Ajustes › Privacidad** con «Este iPhone · To'Latino 1.0 (12)» en cada sesión (hoy lo dice Usuarios 360°). (8a, 11 nov) — **✓ 9m (14 nov):** Cada sesión dice «Este iPhone · To'Latino 1.0 (12)» (app, versión y build del rótulo de la app). Prueba: `vec9m`.
- [ ] **→ 9p** · **«Abrir en la web» desde una app en pausa** cuando existan los enlaces universales: que no vuelva a abrir la misma app (excluir
      `?web=1` en el AASA o abrir con la vista del navegador). (8a, 11 nov)
- [x] **El llavero:** lectura por el CI con OIDC y aviso de llaves que vencen (barrido) — tubería de las tiendas. (8a, 11 nov) — **✓ 9j (14 nov):** la
      lectura por OIDC es de 8h (`lib/tiendas/oidc.ts`); el aviso: `avisarLlavesQueVencen` en el barrido (toda llave viva con fecha, 30 días, 7 días y vencida,
      una vez por etapa, plantilla `llave_vence`) y cada reemplazo en `key_rotations`. Guardián `llaveConVencimiento`.
- [x] **Imagen del sandbox en local:** `docker build` no corrió aquí (corepack no sale a npm desde dentro de Docker en esta máquina); la
      instalación congelada sin `apps/mobile` se probó aparte con pnpm. El CI la construye en cada push. (8a, 11 nov) — **✓ 9a (11 nov):** el CI construye la imagen en cada push (.github/workflows/ci.yml); en local no hace falta.
- [ ] **→ 9r** · **Presupuesto de velocidad de las apps** (tocar el ícono → primer pintado ≤ 1.5 s; isla ≤ 400 ms): medir en emulador y simulador. (8a, 11 nov) — _9b-3 (13 nov): se mide en emulador y simulador con las tiendas de verdad (9r); la carga de 9b-3 mide la base._
- [ ] **→ 9c** · **En los 9 dispositivos:** `app8a` corre en 390 y 1360 en local; falta la matriz de CI. (8a, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 8 · 8c (avisos push propios: Web Push, APNs y FCM; push primero, SMS de respaldo; 11 nov)
- [ ] **→ 9p** · **Web Push en el iPhone del fundador (W, paso 1):** necesita el dominio con HTTPS (Paquete 8-0). En el sandbox por HTTP en la IP los
      navegadores no permiten Web Push: Mi cuenta dice «no disponible» y todo sigue por la campana y el SMS (probado). (8c, 11 nov)
- [ ] **→ 9r** · **APNs y FCM de verdad:** hoy contra los simuladores (`scripts/push-sim`) y el contrato (`scripts/contrato-push`, en el CI). Faltan la llave
      .p8 de APNs con su Team ID y la cuenta de servicio de Firebase en el llavero (Paquete 8-2), y la primera prueba en un iPhone (TestFlight) y
      un Android. El sandbox usa el APNs de producción (TestFlight); un build de Xcode necesita `APNS_ENTORNO=desarrollo`. (8c, 11 nov)
- [ ] **→ 9r** · **Firebase en la cáscara de Android:** el CI de las tiendas (8h) escribe `res/values/firebase.xml` de cada sabor desde el llavero (el
      plugin de avisos lo necesita para pedir el token). Hasta entonces Android dice «no disponible» y no pide el token (pedirlo sin
      Firebase cerraría la app). Quitar esa compuerta cuando todo build la lleve. (8c, 11 nov)
- [ ] **→ 9r** · **iOS: `aps-environment`** va en `project.yml` como «development»; la exportación a TestFlight lo cambia a producción (a verificar en el
      primer build firmado de 8h). No se compiló aquí (sin Xcode). (8c, 11 nov)
- [ ] **→ 9q** · **El SMS de respaldo sale de verdad cuando haya Telnyx** (`TELNYX_API_KEY`, `TELNYX_FROM`, 10DLC): hoy «en modo pruebas» en el sandbox; los
      textos de Mi cuenta › Avisos y del Super Admin que lo nombran están anotados en el guardián promesaSms. (8c, 11 nov)
- [x] **«pushsubscriptionchange»:** si el navegador cambia la suscripción sola, hoy se vuelve a registrar al abrir To'Latino (una vez al día);
      atenderlo en el service worker necesita una ruta propia (las acciones del servidor no se llaman desde ahí). (8c, 11 nov) — **✓ 9l (14 nov):** el service worker se vuelve a suscribir con la misma llave y avisa a /api/push/renovar (mismo origen y la sesión); la vieja queda «reemplazado». avi9l prueba la ruta (el evento del navegador no se puede disparar en Chromium sin pantalla).
- [x] **Silencio de noche:** lo que no es crítico no sale por push entre 10 PM y 7 AM (como el SMS), ni se manda a las 7. Alternativa a decidir:
      mandarlo «sin sonido» (iOS `passive`). (8c, 11 nov) — **✓ 9a (11 nov):** lo no crítico no sale por push de 10 PM a 7 AM, como el SMS (REVISION 9a); «sin sonido» queda como alternativa.
- [ ] **→ 9q** · **Web Push en Chromium de verdad:** la prueba `push8c` reemplaza `PushManager.subscribe` en la página (el Chromium de Playwright no tiene
      credenciales del servicio de push de Google); el resto es real (service worker, permiso, cifrado, VAPID, descifrar, mostrar, tocar). Probar
      una vez en un Chrome y un Safari reales con el dominio. (8c, 11 nov) — _9b-3 (13 nov): con los avisos listos (9l)._ — _9l (14 nov): pasa a 9q: necesita el dominio con HTTPS y un Chrome y un Safari reales._
- [x] **→ 9b** · **Presupuesto de velocidad en la base de carga** (`scripts/carga/apps-1m.mjs`, máquina aparte): aquí, 10 000 avisos por la tubería real en
      la base local: avisar() con el push encolado, media 4,98 ms (p95 6,3 ms); el trabajador entregó 10 000 en 49,8 s al simulador (tope
      `push_por_minuto` 10 000; los 50 de más salieron el minuto siguiente); 0 duplicados. Falta APNs p95 ≤ 2 s contra Apple. (8c, 11 nov) — **✓ 9b-3 (13 nov):** con 5 M de avisos en la base: avisar() con el push encolado p95 1,5 / 1,8 ms y la bandeja 0,5 / 0,6 ms (cargas 43457199398 / 43460154153). APNs p95 ≤ 2 s contra Apple, con las tiendas de verdad (9r).
- [x] **Íconos de la web instalada:** `public/assets/app/icono-*.png` salen del logo del sistema sobre `--tl-action` (el mismo dibujo que el
      ícono de la app To'Latino); se generaron una vez con sharp. Si el ícono de la app cambia, regenerarlos. (8c, 11 nov) — **✓ 9a (11 nov):** nota para el día que cambie el ícono (regenerarlos con sharp); sin cambio.
- [ ] **→ 9c** · **En los 9 dispositivos:** `push8c` corre en 390 y 1360 en local; falta la matriz de CI. (8c, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 8 · 8f (programa beta, «Reportar un problema», errores y cierres propios, Sistema › Apps completo; 11 nov)
- [ ] **→ 9r** · **TestFlight interno de verdad:** hoy contra el simulador de App Store Connect (`scripts/tiendas-sim`) y el contrato (`scripts/contrato-tiendas`,
      especificación OpenAPI 4.6 fijada por su sha256). Faltan la cuenta de Apple y la llave de la API en el llavero (Paquete 8-2), y verificar con
      Apple que el rol DEVELOPER sin aprovisionamiento alcanza para ser tester interno (si no, MARKETING). (8f, 11 nov)
- [ ] **→ 9r** · **Retroalimentación de TestFlight a Soporte:** la API la tiene (`betaFeedbackScreenshotSubmissions` y `betaFeedbackCrashSubmissions`, en la
      especificación); traerla como casos `reporte_app` cuando haya cuenta (8h). (8f, 11 nov)
- [ ] **→ 9r** · **Play interno:** la API no acepta correos (solo Grupos de Google). Decidir con el fundador si se usa un Grupo de Google para la lista (y
      agregar por la API) o se sigue agregando en Play Console (paso del Paquete 8-2). (8f, 11 nov)
- [ ] **→ 9r** · **APK propio de verdad:** hoy el build «disponible» del sandbox es un APK de PRUEBA que arma el servidor y no se instala. 8h sube los APK
      firmados por el CI (con su sha256) a `privado/apk/` y los registra en `app_builds`; nginx corta en 14 MB los cuerpos de subida: la subida del
      CI va directa al almacenamiento. Probar la instalación en un Android real (fuentes desconocidas). (8f, 11 nov)
- [ ] **→ 9r** · **Símbolos nativos:** los cierres de iOS y Android llegan con binario y desplazamiento (iOS) o la pila de Java ofuscada por R8; simbolizar con
      el dSYM y el `mapping.txt` que 8h guarda en `app_builds.symbols_media_id`. (8f, 11 nov) — _9j (14 nov): sin builds reales firmados no hay dSYM que probar
      (ni llvm-symbolizer / retrace en la imagen): con las tiendas de verdad (9r)._
- [ ] **→ 9r** · **Compilar lo nativo de 8f:** `TLReporteBeta.swift` / `.java` y los tres métodos nuevos de TLReporte (`ultimaCaptura`, `agitar`, `cierres`) los
      compila el CI de las cáscaras; probar en un iPhone y un Android reales agitar (captura de la pantalla) y un cierre que aparezca al abrir otra
      vez. MetricKit entrega los cierres al abrir de nuevo (iOS 15+). (8f, 11 nov)
- [ ] **→ 9r** · **Privacidad en las tiendas:** declarar «Datos de diagnóstico / Crash data» (sin vincular a la persona, sin rastreo) en `PrivacyInfo.xcprivacy`
      (`NSPrivacyCollectedDataTypes`, desde `generar.mjs`) y en las etiquetas de App Store y la sección de seguridad de datos de Play (8i). (8f, 11 nov)
- [x] **→ 9b** · **Tope de errores con varios procesos:** el tope por minuto vive en la memoria de cada proceso; en producción con varios procesos (o
      máquinas) se multiplica. Pasar a un contador compartido o a Cloudflare (límite por IP en `/api/errores`) en la Fase 9. (8f, 11 nov) — **✓ 9b-3 (13 nov):** el tope global, por teléfono y por conexión van a `rate_counters` (`dentroDelTope`), compartidos; lo descartado se cuenta en las últimas 24 h (Sistema › Apps). Cloudflare delante queda para 9o.
- [ ] **→ 9u** · **Vuelta atrás por «Errores en vivo»:** en producción, un pico en la web servida debe volver al despliegue anterior y, en las apps, pausar el
      lanzamiento por fases por la API de las tiendas (Fase 9). Hoy avisa a los Admins. (8f, 11 nov) — _9o (14 nov): la web ya vuelve atrás sola si aparecen grupos de errores nuevos (vuelta_errores_nuevos, Configuración › Despliegues; `infra/comun/azulverde.sh`). Pausar el lanzamiento por fases de las apps por la API de las tiendas va con las apps públicas (9u)._
- [x] **La semilla 0045 en una base nueva** no crea testers ni el caso de ejemplo si todavía no existen esas cuentas (las crean otras semillas o las
      pruebas); los builds y los grupos de errores sí. (8f, 11 nov) — **✓ 9a (11 nov):** la semilla 0049 crea a Ana, Juan y Lucía si faltan y repite los bloques idempotentes de 0044, 0045 y 0046; probada en una base nueva (6 teléfonos de push, 3 testers, el caso de Lucía, 60 posiciones) y dos veces.
- [ ] **→ 9c** · **En los 9 dispositivos:** `beta8f` corre en 390 y 1360 en local; falta la matriz de CI. (8f, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._
- [x] **El registro de la web vive en la memoria de la pestaña:** una navegación con recarga completa (Panel › Más usa una recarga) lo empieza de
      nuevo, así que un reporte desde el panel en el navegador trae pocas pantallas. En las apps vive en el nativo y sobrevive. Pasarlo a
      `sessionStorage` (solo familias de pantalla) si el equipo lo echa de menos. (8f, 11 nov) — **✓ 9a (11 nov):** el registro de la web vive en la memoria de la pestaña (REVISION 9a); sessionStorage si el equipo lo echa de menos.
- [ ] **→ 9t** · **Mapas de fuente y CPU:** cada proceso guarda hasta 12 mapas abiertos; un atacante dentro del tope por minuto puede obligar a abrir mapas
      distintos (cada uno cuesta leer y decodificar ~1 MB). Medir en la base de carga y, si hace falta, simbolizar en un trabajador aparte. (8f, 11 nov) — _9b-3 (13 nov): el tope por minuto ya es compartido (rate_counters); medir la CPU de simbolizar y, si hace falta, un trabajador aparte, con Sistema › Salud (9j)._ — _9j (14 nov): Salud ya cuenta los errores por tipo; la
      medida de CPU va en el ensayo de producción (9o), con la base de carga._ — _9o (14 nov): el ensayo no lleva la base de carga; se mide con la carga sobre producción en acceso anticipado (9t), con Prometheus en Sistema › Salud._

## Fase 8 · 8e (lo nativo de cada app: la ruta del Repartidor, la Puerta, el boleto, compartir, «Escanear cupón»; 11 nov)
- [ ] **→ 9r** · **La ruta en un teléfono real:** Android (servicio en primer plano con la pantalla apagada horas, batería, Doze) e iPhone (modo de fondo,
      indicador azul, que la app no se suspenda en una entrega de 40 min). El humo del emulador cubre Android; en iOS el simulador solo compila y
      abre (sin prueba de la ruta: el XCUITest con `simctl location` queda para cuando haya dominio). (8e, 11 nov)
- [ ] **→ 9p** · **Web sin HTTPS:** el sandbox se sirve por HTTP en la IP y el navegador no da la ubicación ahí: el Repartidor en la web dice «este navegador
      no da tu ubicación». Con el dominio (Paquete 8-0) funciona; la app nativa no depende de esto. (8e, 11 nov)
- [ ] **→ 9r** · **El aviso fijo en Android 13+ sin permiso de avisos:** si el repartidor dice que no a los avisos, el servicio sigue y Android lo lista en
      el administrador de tareas, pero el aviso no sale en la barra. Revisar en un Android real si conviene insistir. (8e, 11 nov)
- [ ] **→ 9r** · **Linterna en iPhone:** `AVCaptureDevice.torchMode` con la cámara del WebView abierta: *a verificar* en un iPhone real (el simulador no
      tiene luz). Si choca, la Puerta en iPhone se queda sin linterna (como hoy en Safari). (8e, 11 nov)
- [ ] **→ 9r** · **Fijar la pantalla en Android real:** si «Fijar apps» está apagado en Ajustes, `startLockTask` puede no hacer nada en algunos teléfonos;
      la Puerta lo dice. Probar en 2–3 marcas. (8e, 11 nov)
- [ ] **→ 9t** · **Ritmo y carga:** guardar una posición ≤ 30 ms y 200 por segundo sostenidas (2 000 repartidores cada 10 s) en la base de carga
      (`scripts/carga/apps-1m.mjs`, máquina aparte); SSE de la ruta ≤ 1 s. Aquí: 64 comprobaciones funcionales, sin medida de carga. El tope de una
      llamada por segundo por token vive en la memoria de cada proceso (como el de errores): con varios procesos, contador compartido. (8e, 11 nov) — _9b-3 (13 nov): una posición p95 3,9 / 3,6 ms (≤ 30) y el ritmo sostenido 189 / 200 por segundo (2 000 repartidores cada 10 s, 11 / 0 de menos). El p95 DURANTE el ritmo fue 2 860 / 673 ms (tope 30; cargas 43457199398 / 43460154153): un solo proceso de Node con 10 conexiones y la base en la misma máquina de 4 núcleos del runner. Se mide de nuevo con la app y la base en su sitio (varios procesos, la base aparte) antes de encender producción (9t)_
- [ ] **→ 9p** · **Teselas en las capturas:** en local no corre el servidor de teselas; las capturas de los mapas se ven sin calles. Rehacerlas en el sandbox
      con el dominio. (8e, 11 nov)
- [x] **La semilla 0046 en una base nueva** no crea las entregas de ejemplo si todavía no existen Juan (+1 570 555 0144) y Héctor (+1 570 555 0210)
      (las crean las pruebas), igual que 0044 y 0045. (8e, 11 nov) — **✓ 9a (11 nov):** igual que L1239: 0049 crea a Juan y repite 0046 (las dos entregas de Héctor) en una base nueva.
- [x] **→ 9n** · **Ofertas al repartidor («Aceptar» con cuenta regresiva), lotes y prueba de entrega con foto** siguen en «Repartidor (bloque 2l)»; cuando
      exista la oferta, «Aceptar» pasa a ser el paso que inicia la ruta (hoy «Voy por el pedido»). (8e, 11 nov) — **✓ 9n (14 nov):** ofertas con cuenta regresiva y prueba de entrega con foto hechas (ver «Repartidor (bloque 2l)»); los lotes, después de abrir (§6 #21).
- [ ] **→ 9r** · **Privacidad en las tiendas:** declarar «Ubicación precisa · funcionalidad de la app · vinculada a la persona · sin rastreo» para To'Latino
      Repartidor (y To'Latino «al usar») en `PrivacyInfo.xcprivacy` y en la sección de seguridad de datos de Play; en Play, la **declaración de
      ubicación en segundo plano** no aplica (no se pide ACCESS_BACKGROUND_LOCATION) pero sí la de **servicio en primer plano de tipo ubicación**
      (video corto del flujo). (8i, 11 nov)
- [ ] **→ 9c** · **En los 9 dispositivos:** `app8e` corre en 390 y 1360 en local; falta la matriz de CI. (8e, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 8 · 8g (el boleto en Apple Wallet y Google Wallet; 11 nov)
- [ ] **→ 9p** · **Solo después del Paquete 8-0 (dominio con HTTPS):** el iPhone del fundador NO puede agregar un pase desde el sandbox por HTTP en la IP:
      Apple Wallet exige `webServiceURL` con **HTTPS** (y el .pkpass se baja por Safari). Hoy el pase dice `https://pruebas.tolatino.com/api/pases`
      (BASE_URL); hasta que ese dominio responda, el pase se agrega pero no se actualiza. Con el dominio: agregar un boleto de prueba a Wallet,
      transferirlo y ver que el pase se anula solo. (8g, 11 nov)
- [ ] **→ 9r** · **Certificado del Pass Type ID (Paquete 8-2, opcional):** crear el Pass Type ID `pass.com.tolatino.boletos` en developer.apple.com, generar
      la solicitud en Super Admin › Sistema › Integraciones › Wallet, subirla a Apple, bajar el .cer y subirlo ahí. Todo lo demás (firma, servicio
      web, avisos) quedó probado contra una cadena de prueba hecha en el momento y simuladores. (8g, 11 nov)
- [ ] **→ 9r** · **A verificar con el certificado de verdad:** (1) que el intermedio que trae el AIA del .cer sea **Apple WWDR G4** (aquí no se pudo bajar
      `www.apple.com/certificateauthority`: el proxy lo negó; el servidor baja el intermedio de la dirección que dice el propio certificado, solo
      de `certs.apple.com` / `www.apple.com`, y comprueba que lo firmó); (2) que el aviso de cambio a APNs (TLS con el certificado del pase, cuerpo
      «{}», tema = Pass Type ID) entra **sin `apns-push-type`** — Apple no documenta cuál lleva un aviso de Wallet; (3) que `pass.strings` en
      UTF-16 con BOM se lee bien en un iPhone en inglés; (4) que el 304 de «If-Modified-Since» (no está en la lista actual de Apple, sí en la
      vieja) no molesta a Wallet. (8g, 11 nov)
- [ ] **→ 9r** · **Cuenta de emisor de Google Wallet (Paquete 8-2, opcional):** crear la cuenta en Google Pay & Wallet Console, la cuenta de servicio con
      acceso a la API de Wallet y subirla con el **ID del emisor** en Integraciones › Llaves. Las clases quedan en «UNDER_REVIEW»: Google las aprueba
      (a verificar el tiempo). Sin ella, solo sale Apple. (8g, 11 nov)
- [ ] **→ 9r** · **Arte oficial de los botones (hueco #9):** las insignias de hoy son **provisionales** (negro, borde gris, texto ES/EN, sin logos), marcadas
      `data-arte="provisional"`. Apple da el arte (SVG por idioma) solo después de **aceptar la «Apple Wallet Marketing Artwork License
      Agreement»** en developer.apple.com/wallet/add-to-apple-wallet-guidelines; Google, en su página de marca de Google Wallet (no abrió desde
      este entorno). Es un acuerdo legal del dueño de la cuenta: el fundador lo acepta (o da el OK para que Claude lo acepte en su nombre) y se
      reemplazan los dos botones ES/EN por el SVG oficial en `Wallet.tsx` (y se revisa que la licencia deje tenerlos en un repo público). (8g, 11 nov)
- [x] **El correo de la compra** todavía no trae los botones de Wallet (lleva a Mis boletos, donde están). Con el arte oficial: sumar las dos
      insignias al recibo (`lib/correo/recibos.ts`), enlazadas a la página del boleto. (8g, 11 nov) — **✓ 9l (14 nov):** el recibo trae «Agregar a Apple Wallet» y «Agregar a Google Wallet» (las insignias provisionales de 8g en HTML) a la página del boleto, solo si Wallet está disponible para ese boleto; el arte oficial sigue en REVISION 8g.
- [ ] **→ 9r** · **Dentro de la app iOS (Capacitor):** el botón abre el .pkpass con un enlace firmado de 10 minutos en la vista del sistema (Safari), porque
      el WebView no muestra «Agregar a Wallet». Probar en TestFlight; si no basta, un plugin nativo pequeño con `PKAddPassesViewController`
      (versión nueva de la app, revisada). (8g, 11 nov)
- [x] **→ 9b** · **Los límites del servicio web** (pase_ws_por_minuto por dirección) viven en la memoria de cada proceso; con varios procesos, contador
      compartido. El de registros por teléfono por hora está en la base. Detrás de Cloudflare, la dirección es `CF-Connecting-IP` (hoy
      `x-real-ip` de nginx). (8g, 11 nov) — **✓ 9b-3 (13 nov):** `permitido()` cuenta en `rate_counters` (compartido); la dirección detrás de Cloudflare (`CF-Connecting-IP`) queda para 9o con el resto de Cloudflare.
- [ ] **→ 9q** · **Ritmo:** un escaneo en la puerta marca el boleto «usado» y eso actualiza su pase (un aviso a cada teléfono que lo sigue). En una noche de
      2 000 personas con Wallet son 2 000 avisos a APNs en una hora: medir en la base de carga junto con el push (8c). (8g, 11 nov) — _9b-3 (13 nov): no se midió (los avisos a Apple necesitan APNs de verdad); con los avisos listos (9l)_ — _9l (14 nov): pasa a 9q: necesita APNs de verdad._
- [ ] **→ 9c** · **En los 9 dispositivos:** `wal8g` corre en 390 y 1360 en local; falta la matriz de CI. (8g, 11 nov) — _9b-3 (13 nov): corre en el CI en cada corrida (la regresión entera, teléfono 390 y escritorio 1360; 43392515329) y el recorrido `disp9b` en los 9 dispositivos; correr cada prueba en los 9 se decide en 9c con la lista de las que dependen del ancho (L1474)._

## Fase 8 · 8d (entrar con Face ID o huella: llaves de acceso; 11 nov)
- [ ] **→ 9p** · **Solo después del Paquete 8-0 (dominio con HTTPS):** las llaves no se pueden usar en el sandbox por HTTP en la IP (el navegador no da WebAuthn
      sin contexto seguro; la app no ofrece nada). Con `https://pruebas.tolatino.com`: probar en el iPhone del fundador (Safari) registrar, salir y entrar
      con Face ID, y quitarla. `PASSKEY_RP_ID` / `PASSKEY_ORIGENES` ya están en el compose. (8d, 11 nov)
- [ ] **→ 9p** · **TLLlave en las apps (8b + 8h):** el plugin compila en las 4 apps (CI) pero está apagado (`apps.json` → `llaves.activas: false`). Para
      encenderlo: (1) 8b sirve `/.well-known/apple-app-site-association` con `webcredentials` de los cuatro IDs y `assetlinks.json` con
      `delegate_permission/common.get_login_creds`; (2) cada target de iOS lleva `com.apple.developer.associated-domains` = `webcredentials:pruebas.tolatino.com`
      (capacidad en el App ID, 8h); (3) 8h suma a `PASSKEY_ORIGENES` el origen `android:apk-key-hash:<sha256 de la llave de firma>` (la de subida y la de
      Play App Signing); (4) `activas: true` y probar en el simulador de iOS (a verificar que ofrece passkeys con dominio asociado) y en el emulador con
      un perfil de Google. (8d, 11 nov)
- [x] **Passkeys obligatorias para el equipo (T#30):** hoy se ofrecen y Sistema › Equipo dice quién la tiene; exigirla para entrar al Super Admin es
      la Fase 9 (ver «Super Admin (bloque 3c)» L36). (8d, 11 nov) — **✓ 9j (14 nov):** obligatoria la llave O la app de códigos (sin dominio no hay llaves en
      el sandbox); una sesión abierta con la llave ya trae los dos pasos; Sistema › Equipo dice el segundo factor de cada uno.
- [x] **El borrado definitivo a los 30 días (L314)** no corre todavía; cuando corra, sus llaves quedan quitadas con la cuenta (hoy una cuenta borrada
      ya no entra con llave: lo revisa `abrirSesionEn`). (8d, 11 nov) — **✓ 9d (14 nov):** la purga deja sus llaves revocadas («Cuenta borrada») y `abrirSesionEn` no deja entrar pasada la fecha.
- [ ] **→ 9v** · **Nombres de los administradores de llaves (AAGUID):** la lista corta de `lib/llaves/llaves.ts` (iCloud Keychain, Google Password Manager, Windows
      Hello, Samsung Pass, 1Password, Bitwarden) es solo para el nombre que se muestra; revisarla contra la lista pública el día del lanzamiento. (8d, 11 nov) — _9a (11 nov): revisar la lista corta de AAGUID contra la lista pública el día de la apertura._

## Fase 8 · 8h (la tubería de las tiendas; 11 nov)
- [ ] **→ 9p** · **Paquete 8-0 (dominio con HTTPS):** sin él la tubería no entrega ninguna llave (el CI ve que no hay https y no manda su token). Con
      `https://pruebas.tolatino.com` detrás de Cloudflare en modo **Full (strict)**: lanzar «Tiendas» y ver en Integraciones › Lecturas del CI que
      entró. (8h, 11 nov)
- [ ] **→ 9r** · **Paquete 8-2 (llaves):** subir en Integraciones la llave de la API de App Store Connect (rol Admin, con el Issuer ID), la cuenta de servicio de
      Google Play (invitada en Play Console con permiso de publicar en las cuatro apps) y el **token de GitHub** para «Pedir un build» (de grano fino,
      solo este repositorio, permiso «Actions: write», vence como máximo en un año: anotar el vencimiento al subirlo). Crear las cuatro apps en App
      Store Connect y en Play Console (no hay API). (8h, 11 nov)
- [ ] **→ 9p** · **La llave de subida de Android la crea el primer job** (plan §3.5): falta el pedido OIDC que guarda en el llavero una llave generada en el CI
      **solo si no existe**, con la contraseña derivada (`claveAlmacen`, ya escrita). Hasta entonces el CI firma con una llave desechable y no sube
      nada. Igual para el certificado de distribución de iOS si la firma administrada por Apple no alcanza (a verificar con la cuenta real). (8h, 11 nov)
- [ ] **→ 9r** · **Primer TestFlight real** en el iPhone del fundador y primer build en Play interno: verificar `xcodebuild -exportArchive` con destino upload
      y la llave de la API (sin fastlane), que App Store Connect procese y que el grupo interno lo reciba; y que la primera subida por API a una app
      recién creada en Play funcione. (8h, 11 nov)
- [ ] **→ 9r** · **Símbolos nativos:** el CI sube el dSYM (y el mapping.txt si un día se activa R8) al almacén privado (`app_builds.symbols_key`), pero los
      cierres nativos todavía no se simbolizan con ellos (llvm-symbolizer / retrace en la imagen). (8h, 11 nov) — _9j (14 nov): con builds reales (9r)._
- [ ] **→ 9p** · **La huella de la firma de Google** (`lib/tiendas/play.ts` `huellaFirmaGoogle`, generatedapks.list) está escrita y probada contra el simulador,
      pero no se usa todavía: 8b la lleva a assetlinks.json y 8d a `PASSKEY_ORIGENES` (`android:apk-key-hash:`). (8h, 11 nov)
- [ ] **→ 9r** · **La configuración de Firebase de la app** (google-services / firebase.xml para el push de Android) no la escribe todavía el CI desde el
      llavero. (8h, 11 nov)
- [ ] **→ 9r** · **El entorno «tiendas» de GitHub:** hoy lo creó GitHub al primer uso, sin reglas. Ponerle «solo la rama pruebas» (y produccion en la Fase 9)
      por la API cuando haya un token con permiso de administración. (8h, 11 nov)
- [ ] **→ 9r** · **Cloudflare (plan gratis) corta los cuerpos en 100 MB:** un .aab o un dSYM más grande no pasaría; medir el tamaño real de los builds. (8h, 11 nov)
- [x] **`app_min_build_*` nunca por encima del último build disponible** (plan §3.5): no lo revisa 8h; revisarlo al cambiar el mínimo en Sistema ›
      Apps. (8h, 11 nov) — **✓ 9j (14 nov):** `cambiarBuild` lo rechaza en producción (mínimo y aviso, contra `app_builds` disponible); en el sandbox los builds
      son de prueba y se guarda diciéndolo (así `app8a` sigue). Guardián `minimoDisponible`.
- [ ] **→ 9u** · **Fase 9:** encender `app.tiendas.publico` con el OK del fundador, aceptar la rama produccion en el servidor de producción, el sabor de
      producción y los envíos a revisión pública (hoy la base los rechaza). (8h, 11 nov)

## Fase 8 · 8i (fichas, capturas, privacidad, reglas de las tiendas, cuentas de revisión, «Lo que te toca»; 11 nov)
- [ ] **→ 9r** · **Subir las fichas de verdad** (Sistema › Apps › Fichas y revisión › Subir como borrador) cuando estén la llave de la API de App Store Connect,
      la cuenta de servicio de Play y las cuatro apps creadas con una versión en preparación (Paquetes 8-1/8-2). Hoy solo contra los simuladores. (8i, 11 nov)
- [ ] **→ 9p** · **Capturas definitivas:** el job «capturas» de tiendas.yml (workflow_dispatch con capturas=si) las hace con la semilla en una base desechable del
      CI; las fotos de la semilla viven en el almacén del sandbox, así que en el CI salen sin foto. Con el dominio con HTTPS, rehacerlas contra el sandbox
      (o subir las fotos de la semilla al almacén del job) y revisarlas a ojo antes de la Fase 9; en la Fase 9, con negocios reales que den permiso (§6 #23). (8i, 11 nov)
- [ ] **→ 9r** · **Capturas de iPhone en el simulador real** (`xcrun simctl io booted screenshot` navegando con XCUITest): hoy las de Apple salen de WebKit con
      el rótulo de la app en 1320×2868; la cáscara de iOS solo se captura en su humo (Cáscaras). Hace falta XCUITest para navegar dentro de la app. (8i, 11 nov) — _9b-3 (13 nov): con las tiendas de verdad (9r)._
- [ ] **→ 9u** · **Tamaños de captura del día del envío:** Apple pide hoy 6.9" (APP_IPHONE_67, 1320×2868) y Google teléfono (1080×2400 aquí); volver a leerlo. (8i, 11 nov)
- [ ] **→ 9r** · **Data safety por la API:** Google tiene `applications.dataSafety` (el mismo CSV; probado contra el simulador del descubrimiento oficial). Es una
      declaración legal del dueño: el servidor no la manda sola. Decidir con el fundador si la sube Claude (con su OK) o la importa él. Los ids
      `PSL_…` del CSV, a verificar con la plantilla de Play Console del día. (8i, 11 nov)
- [ ] **→ 9r** · **Apple App Privacy** no está en la API: el fundador la toca con la pantalla Declaraciones (Paquete 8-3). (8i, 11 nov)
- [ ] **→ 9u** · **Clasificación por edad de Apple:** respuestas en `apps/mobile/tiendas/declaraciones.json` (con la escala de 2025: 13+/16+/18+); revisar el
      resultado que calcule Apple y «advertising» (Destacados de Pro: ¿cuenta como publicidad?) el día del envío. (8i, 11 nov)
- [ ] **→ 9u** · **Cuentas de revisión de producción (Fase 9):** crearlas a mano con el OK del fundador (número reservado, negocio de revisión oculto, portero
      invitado desde ese negocio, un evento de revisión), los cuatro `REVISION_CODIGO_*` en los secretos de producción y encender `app.revision.cuentas`
      (en producción además pide `app.tiendas.publico`). En el sandbox, deploy.sh crea los códigos al azar. (8i, 11 nov)
- [ ] **→ 9u** · **Puerta de revisión:** la semilla no la hace portera (el teléfono del portero va cifrado con la llave del entorno): invitarla desde el panel
      del negocio de revisión y darle un evento de revisión antes de mandar Puerta a revisión. (8i, 11 nov)
- [ ] **→ 9p** · **Face ID en las fichas:** las fichas no lo mencionan porque las llaves de acceso en las apps esperan el dominio (8b). Agregarlo cuando funcione. (8i, 11 nov)
- [x] **→ 9m** · **«Pronto»** (`sinProntoEnTienda`): 7 pantallas usan Pronto (Buscar, la categoría, Eventos, Esta noche…). Antes de la revisión pública,
      ninguna alcanzable dentro de las apps; con `TOLATINO_FASE=9` el guardián falla. (8i, 11 nov) — **✓ 9m (14 nov):** Pronto.tsx borrado (9a); `sinEnConstruccion` en verde.
- [ ] **→ 9u** · **Reglas de EE. UU. sobre enlaces a compras externas** (caso Epic, 2025): hoy Pro no se ofrece ni se enlaza en las apps (3.1.3(f)); volver a
      leerlas el día del envío y decidir con el fundador. (8i, 11 nov)
- [ ] **→ 9r** · **Novedades de Google:** van con cada lanzamiento (notas de la versión de la pista), no con la ficha; la tubería todavía no las manda en
      `tracks.update`. (8i, 11 nov) — _9j (14 nov): no se hizo; las notas de la versión se prueban con la primera subida real a Play (9r): el simulador no
      comprueba su forma._
- [x] **9e** · **/privacidad:** el texto sale de docs/legal/ con versión y sha256 (legal_pages), los datos del inventario y del mapa; /terminos y las otras
      nueve páginas existen sin sesión, en ES y EN. Evidencia: leg9e (cada página ES/EN, 22 ✓) y el paso 1 de fich8i al día. La revisión del abogado
      sigue en «Fase 9 · 9e» → 9s. (8i, 11 nov · 9e, 14 nov)
- [ ] **→ 9p** · **Analítica › Apps · enlaces que abren la app o la web:** espera los enlaces universales (8b). (8i, 11 nov)

## Fase 9 · 9a (las pruebas al repo y la LAUNCH con destino; 11 nov)
- [x] **→ 9b** · **CI «capturas de las fichas» (Tiendas, corrida 43106676848, `pruebas` b7e65b3, `capturas=si`):** el paso «adb exec-out
      screencap de cada app» falla igual en los dos intentos: cliente ES 6/6 capturas, y la primera llamada CDP de EN (`cdp.mjs 9222 eval
      document.cookie=…`) recibe ECONNREFUSED 127.0.0.1:9222; en el intento 1 el emulador ya no estaba («could not connect to TCP port 5554»).
      Probable: el emulador o la WebView mueren después de la vuelta en español (memoria de swiftshader) o se pierde el reenvío del puerto; además
      `capturas-android.sh` aborta por `set -e` en vez de decir qué falló. Las capturas de la tienda hechas con la web (`capturas.mjs`) nunca
      llegaron a correr en el CI con los últimos arreglos. (9a, 11 nov)
      **9b-1 (12 nov), sigue en rojo:** `capturas-android.sh` ya no aborta: toma por toma (✓/✗ con el motivo), reenvío de DevTools por llamada
      con el pid de ese momento, la app abierta de nuevo y con su sesión en cada idioma, el emulador vuelto a levantar si se va (máx. 2) y un
      diagnóstico en `capturas-android/diagnostico` (adb, memoria, disco, kernel, el logcat entero, los volcados). Tres corridas en el CI:
      43149359125 (4 GB, 3 núcleos) el emulador se fue al abrir la primera app; 43152342224 (4 GB, sin Vulkan) al navegar la primera;
      43154886642 (memoria por defecto, sin Vulkan) **4 de 6 capturas en español** y después la app y el emulador se fueron. En las tres: 10–11 GB
      libres, 75 GB de disco libres, sin OOM en el kernel, sin volcado de fallo y el logcat corta solo: el proceso del emulador (qemu) desaparece
      mientras la WebView carga páginas reales (el humo, con páginas locales, pasa). Falta: probar otra imagen (API 33 o 35), fijar una versión
      del emulador (`emulator-build`) o `-gpu guest`, y bajar el peso de las páginas en la cáscara de pruebas.
      **Hecho (9b-1, 12 nov):** con `-gpu guest` (la WebView dibuja dentro del emulador, sin el traductor de OpenGL del runner) y la toma
      que antes comprueba emulador vivo y app con proceso: Tiendas **43162239412 en verde** (a2c2c73, `capturas=si`), «capturas de Android:
      12 bien, 0 mal, emulador levantado de nuevo 0 vez/veces» (cliente ES 6/6 incluida «5-boletos», donde antes se caía, y EN 6/6); los
      demás trabajos (Android ×4, iOS ×4, JWKS, islas) también en verde.
- [x] **→ 9b** · **Humo de Android inestable (Cáscaras, corrida 43106680850, intento 1):** solo la app «cliente»: `navigator.onLine` = true en
      modo avión, logcat «red para la WebView: sí» al abrir y ningún evento online/offline; el intento 2 pasó. Probable: el modo avión todavía no
      quedó puesto cuando abre la primera app. Una prueba inestable se arregla, no se reintenta. (9a, 11 nov)
      **Hecho (9b-1, 12 nov):** `humo-android.sh` ya no espera 3 s: antes de abrir cada app pone el modo avión y espera a que el sistema diga
      que no hay red (`cmd connectivity airplane-mode` = enabled y `dumpsys connectivity` «Active default network: none», hasta 60 s; si no,
      falla diciéndolo) y comprueba que lo PRIMERO que la cáscara le dice a la WebView es «red para la WebView: no». Si una app no está, dice
      por qué (registro de fallos, lo que dijo el sistema, la memoria). Emulador con 4 GB, 3 núcleos y sin Vulkan. Cáscaras **43152344555 en
      verde** en `claude/vibrant-franklin-krutwa` (3613f94): las cuatro apps «modo avión: enabled · Active default network: none (1–4 s)» y
      «red para la WebView: no»; la 43149361486 (antes de subir la memoria) había visto a la del Repartidor cerrarse sola a los 10 s.
- [ ] **→ 9b** · **La regresión entera en verde (`orden9a`):** la corrida completa del 12 nov (`node pruebas/correr.mjs --todas`, una a la vez) dio
      **169/198 en verde (6 397 ✓)**; volviendo a correr solo las rojas pasaron 2 más (em4e, renta4f: dependen del orden). Quedan **27 rojas**, por
      tres causas: (1) pruebas de las fases 1–2 que nunca volvieron a correr y cuya pantalla cambió (admin1i, cat1m, rec1j, lic, rec, rec2,
      menu2a-f, free2b, cit3b); (2) datos acumulados de la base local o cuentas compartidas entre pruebas (adm2i, plan4f, adm4ne, adm4y, wal8g,
      sop7b, adm7i, compa7d, fich8i, evt6i, disp2r) y la hora del día (adm6j); (3) dependen del orden (pasaron solas en esta sesión: cit3e, ayu4g,
      noc4b, tra4y, vis4ie) y msg2p (ya era de 9b). 9b: cada prueba con sus propios datos (como pednull, ayuda2i, rsvp9a), una base nueva por
      corrida en el CI con la semilla 0049, y la regresión en la tubería. Salida de cada una en PROGRESS «Fase 9 · 9a». (9a, 12 nov)
      **9b-1 (12 nov), sigue abierta:** en bases nuevas, B3 **199/199 (7 120 ✓)**; A 196, B1 198, B2 197, C 198 y D 198 de 199; F parada en
      171/199 por costo. Cada roja arreglada en su raíz y comprobada sola en verde (tabla en PROGRESS «Fase 9 · 9b-1»). Falta lo que pide esta
      línea para cerrarla: dos corridas enteras seguidas en verde y una `--barajar` → la corrida de confirmación va al CI de 9b-2.

## Fase 9 · 9b-1 (la regresión entera en una base nueva; 12 nov)
- [x] **→ 9t** · **El tope de «Ayuda con …» (5 por persona en 24 h, `lib/ayuda.ts` y `lib/ayuda-cita.ts`) no tiene su prueba:** la regresión
      ahora corre un día hacia atrás la hora de las ayudas de esa persona antes de abrir otra (`sinTopeDeAyuda`), así que nada comprueba que la
      sexta del día se rechace con «Abriste muchas solicitudes hoy». Además es un número fijo en el código (no sale de Configuración). (9b-1, 12 nov) — _9b-3 (13 nov): la prueba del sexto pedido del día y el número en Configuración, con lo diferido del vecino (9m)._ — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m: la prueba del sexto pedido del día y el número en Configuración._ — _9t (19 nov): hecho. El número sale de Configuración › Soporte (`ayuda_tope_dia`, 0182, 1–50, de fábrica 5) y se lee con `cfgSql` en la misma consulta que cuenta (lib/ayuda.ts y lib/ayuda-cita.ts; un reporte de seguridad nunca se frena). Prueba de punta a punta `ayu9t` (persona nueva: con el tope en 2 la tercera se rechaza con «Abriste muchas solicitudes hoy», la de ayer no cuenta, con 3 pasa), guardián `topeAyudaDeConfig` y su al revés `alreves9t3` (8/8)._
- [ ] **→ 9b** · **La regresión de punta a punta tarda ~1 h 40 min una a la vez** (y más con las que piden a otra con `requiere`): para el CI
      (9b-2) va por grupos en paralelo, cada grupo con su base nueva. (9b-1, 12 nov)
- [x] **Pruebas con el negocio abierto «00:00–23:59»** (push8c, app8e, pagos2d, pedidos2c, avisos2j, menu2b, compa7h, compa7f,
      free2b, rep2l): el último pedido es 15 min antes de cerrar, así que de 11:44 PM a medianoche (hora de Hazleton) «Enviar pedido» se apaga y
      fallarían. dlvsrv tenía lo mismo con 06:00–05:00 (falló a las 4:45 AM en la corrida del 12 nov) y ya abre 3 h antes de la hora de la
      corrida, como nov2g y dlv2f4. Falta pasar las otras a esa forma (un ayudante en `pruebas/lib`). (9b-1, 12 nov) — _9b-3 (13 nov): no se pasaron a la forma de dlvsrv; el CI corre a las 8:17 y 20:43 UTC (3:17 AM y 3:43 PM de Hazleton), lejos de las 11:44 PM. Con Sistema (9j)_ — **✓ 9j (14 nov):** ya lo cerró la quinta confirmación
      de 9b-3: `lib/pedir.ts` cuenta el último pedido de un negocio de 24 h sin la medianoche y las pruebas escriben 00:00–00:00; ninguna prueba de `pruebas/e2e`
      tiene «00:00–23:59» y el guardián `veinticuatroHoras` lo vigila (alreves9b3).
- [x] **→ 9n** · **Negocios sin negocio:** quien entra a la app To'Latino Negocios sin tener un negocio va de `/panel` a `/publica`, que está
      fuera del alcance de esa app (`apps/mobile/apps.json`: solo `/panel` y lo común). Comprobar en la cáscara qué ve (¿se abre fuera?) y que
      llegue a Mi cuenta › Ajustes › Borrar mi cuenta, como ya llega el Repartidor sin equipo (9b-1). Hoy `borrarCuentaEnCadaApp` solo mira el
      panel con negocio. (9b-1, 12 nov) — _9b-3 (13 nov): con lo diferido del negocio (9n)._ — **✓ 9n-2 (14 nov):** /panel sin negocio en la app Negocios muestra SinNegocio (publicar, entrar a un equipo, Mi cuenta › Ajustes › Borrar mi cuenta). Guardián negociosSinNegocio; pan9n2 §8. Falta probarlo en la cáscara nativa real (CI 9b).
- [ ] **→ 9b** · **(9b-2) Pruebas que no aguantan repetirse en la misma base:** corriendo `--todas` 2 y 3 veces seguidas sobre una base (12 nov,
      corridas B4 197/199 y B5 194/199 en `tl9b1acc5`), salieron en rojo por lo que dejaba la corrida anterior: menu2a-f («Res guisada» quedaba
      agotada), adm2i (contaba las cortesías de evt6*), tra4y y adm4y (cada corrida gastaba dos días de salidas y a la tercera no quedaban en la
      semana generada), y además pq4e (pedía la SEGUNDA franja libre: a media tarde no hay) y ayu7a (contaba la navegación de escritorio antes
      de que Mi cuenta pasara de 390 a su ancho; la navegación sí está, la app está bien). Las seis están arregladas y pasan solas en esa base
      después de tres corridas (5/5), pero **no se repitió otra corrida entera** sobre la misma base con los arreglos. beta8f salió en rojo
      una vez en B5 («Recibimos tu reporte · TK-…» no apareció tras «Enviar»; sola, en la misma base, pasa): causa sin encontrar. Para 9b-2:
      una base nueva por corrida en el CI, y una corrida repetida a propósito para cazar lo que no se limpia. (9b-1, 12 nov)
- [ ] **→ 9b** · **(9b-2) La corrida de confirmación de 9b-1 en el CI:** `--todas` dos veces seguidas en verde sobre una base nueva y una
      `--barajar` (con su semilla). En la máquina quedó: 199/199 una vez (B3) y 198/199 en C y D, con las rojas arregladas y comprobadas solas
      (noc4c, noc4d, compa7h 3/3 al final); no se hizo ninguna corrida `--barajar` entera. Por costo no se siguió repitiendo aquí. Las
      pruebas atadas a la hora salieron una por cada franja del día en que se corrió (4:45 AM dlvsrv, 6 AM evt6g, media tarde pq4e, 6 PM
      noc4c, 7 AM de Tokio compa7h): el CI debería correr a dos horas distintas del día. (9b-1, 12 nov)
      **9b-2 (13 nov):** el CI ya corre la regresión entera en verde una vez sobre base nueva (43392515329, 160/160) y está programado a dos
      horas del día. La **confirmación** (`confirmar=si`, corrida 43406644136) salió **roja en sus dos carriles**: «dos veces seguidas» con 1 roja en la
      segunda vuelta (compa7e: «Hazleton en pausa: /panel/sabor-dominicano/hoy idéntica a la de antes», datos que dejó la primera vuelta) y «barajada»
      con ~15 rojas por orden (pruebas que dan por hecho lo que dejó otra: código de entrada pedido hace <30 s, umbral de Configuración, filas de
      anoche). Es de las pruebas, no de la app, pero no se da por cerrado: queda para 9b-3 (independizar esas pruebas del orden y de lo que dejó la
      vuelta anterior) con su guardián.

## Fase 9 · 9b-2 (la tubería en el CI; 13 nov)
- [x] **→ 9c** · **axe `color-contrast` (serio) en las seis pantallas clave** (inicio 13 nodos, ficha 24, mi cuenta 23, panel hoy 8, admin hoy 13; en buscar solo en tres dispositivos):
      textos chicos (9,5–10 px, en mayúsculas y con espacio entre letras) en gris sobre fondo claro que no llegan a 4,5:1. Es del sistema de diseño
      (tokens), no de una pantalla. Entra en `pruebas/visual/axe-conocidas.json` con destino 9c; cuando 9c lo arregle se borra de esa lista y el CI
      lo vigila. (9b-2, 13 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [x] **→ 9c** · **axe `scrollable-region-focusable` (serio) en inicio y ficha:** la fila de categorías/pestañas con `overflow-x-auto` (`div[role="tablist"]`
      en la ficha) no se alcanza con el teclado. Mismo trato que el anterior. (9b-2, 13 nov) — **✓ 9c (15 nov):** ya no sale en ningún dispositivo (CI 43749374007: axe en los 9 con `axe-conocidas.json` vacío): las pestañas tienen foco (`__key`) y ahora flechas; la fila de PanelBloques es `role="tablist"`.
- [x] **→ 9c** · **presupuesto-velocidad:mi-cuenta y presupuesto-velocidad:admin-hoy (escritorio 1280):** el CLS medido en el CI es 0,261 (mi cuenta) y 0,889
      (admin hoy), contra 0,1 que es lo bueno; el presupuesto de esas dos pantallas es lo medido con margen (0,4 y 1,2) para que el CI no mienta. 9b-3
      busca qué se mueve (contenido que llega después y empuja) y baja el presupuesto a 0,1 en `pruebas/velocidad/presupuesto.json`. El LCP (80–350 ms)
      y el TBT (0) son de laboratorio sin red ni CPU limitadas y con las fotos de fuera cortadas: lo de campo (RUM) llega con 9g. (9b-2, 13 nov) — _9b-3 (13 nov): no se buscó qué se mueve en 9b-3 (la escala de la base primero); va con el sistema de diseño en 9c, que toca esas pantallas._ — **9c-8 (15 nov):** la causa: las pantallas pintaban primero el teléfono (useState(390) / useState(false) + matchMedia) y saltaban al escritorio. Con el ancho que estima el servidor (`lib/ancho.ts`, `<AnchoInicial>`), Mi cuenta bajó de 0,261 a 0,022 y el panel de 0,046 a 0,002 (CI 43749374007); el Inicio del Super Admin seguía en 0,909 por `SeccionesMovil` (otro hook igual, corregido con otros cinco en 1d06358). Presupuesto de las seis pantallas: 0,1. Se cierra con la próxima corrida en verde. — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [x] **→ 9t** · **Semgrep `tolatino-sql-con-texto-interpolado` solo ve nombres de afuera** (`texto`, `q`, `body.x`, `searchParams.get(...)`…): el código tiene
      282 consultas con `${...}` dentro del SQL, ~210 con fragmentos fijos por convención (`PCT`, `ISO(…)`, `scope(…)`, `cfgSql(…)`) y 73 armadas con
      variables locales (`where`, `orden`, `col`, `fm`, `w.join(" and ")`…). Revisadas por encima, todas salen de constantes o de listas fijas del
      código, pero no hay una prueba de flujo de datos: en 9b-3, auditar las 73 una por una (modo taint de Semgrep desde los parámetros de las
      acciones: 50 hallazgos de partida) y pasar la regla a taint con `nosemgrep` y su porqué en cada una que lo merezca. (9b-2, 13 nov) — _9b-3 (13 nov): no se auditó en 9b-3; va con la revisión de seguridad de la producción (9o)._ — _9o (14 nov): no se auditó en 9o (el bloque fue la infraestructura); va con la revisión de seguridad antes de encender producción (9t)._ — _9t (19 nov): auditado y la regla pasa a flujo de datos. **Ninguna inyección real**: de las 5 721 `.query(…)` de apps/web, 802 llevan `${…}` en el texto; el modo taint (fuente = todo parámetro de función + cookies()/headers()/req.json()/formData; sumidero = el texto de `.query`; limpiadores = Number/Math/aritmética/comparaciones, el `.length` del arreglo de parámetros armado ahí, `centroSQL`/`radioSQL`/`CTE`/`ident`) dio 72 en 46 archivos, cada una seguida a mano hasta su origen: constantes, mapas fijos, columnas fijas de un ayudante privado (`set`/`add`/`put`/`leer(where)` con todas sus llamadas literales), filtros ya pasados por `leerFiltros*`, el uuid de DE_MIEMBRO (regex sin comillas posibles) y los fragmentos de `data_map` (solo la semilla). Las 72 llevan `// nosemgrep: … — <porqué>`; además se repasaron a mano las 337 plantillas de apps con algo que no es constante (lo que taint no ve: valores de la base, código de módulo). **Lo que sí estaba roto era la regla:** (1) por nombres; (2) **no veía ninguna `await x.query<Tipo>(…)`** (Semgrep la lee distinto: 2 544 de las 5 721 consultas, el 44 %, fuera de la regla vieja); (3) Semgrep no podía leer pedazos de 4 archivos (`import("…").T[]` y `/<!--/`, entre ellos la acción decidirCambio) y el CI no lo contaba. Arreglado: sumidero con las dos formas, `Array<import("…").T>` y `/<!-{2}/`, el CI corre `semgrep --test semgrep/` (prueba `semgrep/tolatino.ts`: 13 casos que tiene que cazar —incluidos `await c.query<T>`, FormData, req.json(), cookies(), `.map`, el `.length` de un objeto de afuera— y 7 que no) y falla si Semgrep no pudo leer algo. Endurecido: `buscar.ts` limit/offset siempre enteros acotados. Guardián `semgrepSqlPorFlujo` (alreves9t4 14/14)._
- [ ] **→ 9c** · **Las pruebas de punta a punta por dispositivo son `disp9b` (recorrido de 4 personas, ancho real, sin desborde, sin errores) en los 9
      dispositivos; el resto de la regresión corre con el dispositivo por defecto (teléfono 390 y escritorio 1360).** `correr.mjs --dispositivo <id>`
      ya cambia cualquier prueba (`pruebas/lib/dispositivo-precarga.cjs`), pero correr las 199 en cada uno de los 9 (≈ 15 h de máquina) no se hizo: se
      vuelve a decidir con la lista de pruebas que de verdad dependen del ancho (las de «teléfono» y «escritorio» a la vez). (9b-2, 13 nov) — _9b-3 (13 nov): se decide en 9c con la lista de pruebas que dependen del ancho._ — **9c-6 (15 nov), decidido:** las que abren teléfono y escritorio son 141 de ~200 (casi todas), así que no se elige: el trabajo **`anchos`** del CI corre **toda** la punta a punta de noche (programado, y a mano con `anchos=si`) en los tres anchos extremos — iPhone SE (375), iPad (820) y escritorio 1024 —; los de en medio los cubren la regresión de siempre (390 y 1360) y `disp9b` + capturas + axe en los 9. Cuenta en «tuberia» y `tuberiaNoSeSalta` lo vigila. Se cierra (con las ~25 líneas «en los 9 dispositivos» de las fases 4 a 8) cuando la primera corrida de `anchos` salga en verde.
- [ ] **→ 9c** · **Cuando el fundador cierre su diseño, las 54 capturas aprobadas se vuelven a aprobar** (corrida a mano `aprobar=si`, se mira cada una y
      entran por commit); y las pantallas nuevas entran en `pruebas/visual/pantallas.json` con su presupuesto de velocidad y sus capturas. El CI frena
      un cambio visual sin aprobar, así que el primer cambio de diseño lo va a frenar a propósito. (9b-2, 13 nov)
- [ ] **→ 9r** · **XCUITest de iOS más hondo en el job macOS (L1171, L1360) y `EXPLAIN` de las consultas calientes contra la base de carga:** no son de 9b-2
      (CI web); quedan para 9b-3 junto con la escala. (9b-2, 13 nov) — _9b-3 (13 nov): los `EXPLAIN` de las consultas calientes contra la base de carga ya están (`scripts/carga`, flujo «Carga 1M»: el plan de la más lenta de cada medida que pasa del presupuesto); el XCUITest, con las tiendas de verdad (9r)._

## Fase 9 · 9b-3 (la escala 1M y los topes compartidos; 13 nov)
- [x] **→ 9t** · **El barrido de la Comunidad con 1 M de vecinos** (`com_cifras_resumir`: rangos por ciudad, activos por rango en 7/30/90 días y candidatos de
      Recomendados, cada 10 min) tardó 8,6 s y 10,8 s en una sola vuelta (cargas 43457199398 / 43460154153; tope propio 10 s; antes 19 s solo los activos).
      No bloquea a nadie (corre aparte y la pantalla lee el resultado), pero con más ciudades crece: hacerlo por partes (solo lo que cambió desde la vuelta
      anterior) con lo diferido del vecino. (9b-3, 13 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m: el barrido por partes._ — _19 nov (9t): por partes: 0190 (activos de una pasada en vez de tres), 0191 (tres partes medibles) y 0192 (rangos y Recomendados cada 10 min; activos cada hora con tope propio de 15 s). Carga 44577890861: rangos 0,7 s, activos 7,5 s, Recomendados 0,5 s (en un runner ~1,5× más lento que el de 44571463348). Se cierra con la carga siguiente dentro de los dos topes._ — **✓ 19 nov:** carga 44581283913: la vuelta de 10 min (rangos + Recomendados) **2,1 s** de 10; los activos (cada hora) **9,7 s** de 15 — en el runner lento (imagen 20261111.196.1: generar la carga misma tarda 1,4–1,7× más que en la 20261111.82.6 de 44571463348).
- [ ] **→ 9t** · **Lo de una sola vuelta varía en el runner de GitHub** (la base y la carga en la misma máquina de 4 núcleos, disco compartido): entre dos corridas
      iguales, la subida de 500 escaneos 1,35 → 2,2 s, el barrido 8,6 → 10,8 s, el ritmo de posiciones 2 860 → 673 ms. Antes de encender producción, correr
      `scripts/carga` contra una base del tamaño de la de producción (la misma máquina que se contrate) y dejar ahí los presupuestos de las líneas movidas
      a 9t. (9b-3, 13 nov)

## Fase 9 · 9c — accesibilidad del sistema de diseño (14 nov) — _19 nov (9t): con la imagen nueva del runner (20261111.196.1) todo sale ~1,5× más lento que con la 20261111.82.6 (generar los datos de la carga: vecinos 0,9 → 1,5 s; Tabla del Barrio 14,8 → 21 s); «contenido» (Super Admin › Contenido, p95 ~100 ms de 80) y «categoría» (p95 ~66 ms de 50) quedan por encima en las tres cargas 44575391134 / 44577890861 / 44581283913 y por debajo en 44571463348 (64 / 39 ms), sin cambios en su código. Se vuelve a medir en la máquina de producción antes de encender._
- [x] **→ 9t** · **Contraste de texto AA (4,5 : 1):** los grises de texto del sistema (`--tl-text-muted` = tinta al 50 %, `--tl-text-faint` al 42 % y los
      `rgba(11,14,18,.42–.5)` en línea de muchos componentes) dan 2,9–3,7 : 1 sobre blanco y papel: no llegan a AA para texto pequeño. Subirlos a
      ≥ 60 % cambia pixeles en las capturas aprobadas de los 9 dispositivos, así que **no se hizo en 9c** (regla: lo visual no cambia sin OK).
      Se hace en un bloque con captura nueva aprobada en `docs/REVISION.md` (subir `muted` a .62 y `faint` a .55, `pruebas/visual/` por `aprobar`). (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m (sistema de diseño entero; pide el OK del diseño)._ — **9c-2 (15 nov):** hecho en el código (ink al 60 % en el sistema portado, las pantallas y los tokens; guardián `contrasteTexto`); queda que axe lo confirme en las seis pantallas, aprobar las capturas nuevas y sacar `color-contrast` de `axe-conocidas.json`. — **✓ 19 nov:** lo que quedaba ya está: `pruebas/visual/axe-conocidas.json` sin excepciones (color-contrast fuera) y axe «sin violaciones serias ni críticas» en las seis pantallas de los 9 dispositivos, con las capturas aprobadas (confirmación 44573806469: los 9 carriles «dispositivo» en verde).
- [x] **→ 9t** · **Objetivos táctiles de 44 px:** a11y9c informa cuántos controles del sistema miden menos de 44 px (íconos de 30–36 px, chips, filas
      compactas). Agrandarlos cambia el diseño aprobado: o se agranda el área de toque sin tocar lo que se ve (relleno invisible con `::after`) o se aprueba
      el cambio. Va con el contraste, en el mismo bloque y la misma aprobación visual. (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **✓ 9t (19 nov), decisión del fundador «agrandar de verdad»:** la CAJA de cada control mide ≥ 44 × 44 (nada de áreas invisibles: los dos intentos con `::after` y con el área «decidida al tocar» se revirtieron). Sistema (`scripts/portar-sistema.mjs`, tabla `TACTIL`): Button md/sm 44 de alto, IconButton ≥ 44, Chip con clic ≥ 44 × 44, pestañas (Tabs) 44, «Ver todo» de SectionHeader 44, campana/avatar/idioma/logo y buscador del encabezado 44 (el nombre «To’Latino» se ajusta y a 320 sin sesión o con letra grande queda solo el logo), el + del plato (AddPill: cuadrito igual en una caja de 44; abierto «− n +» de 44), QtyStepper 44, «Editar» del pedido 44, Comunidad (votar 44 × 44 con el número en medio, guardar/compartir/comentar/⋯ 44; la fila se envuelve), Super Admin en el teléfono (botones 44, la ciudad en su fila), filas de Completa tu cuenta y AdminRow 44; los NOMBRES que son botón (plato, negocio, autor) crecen a 44 con relleno y margen negativo dentro de su fila (el menú no se mueve; antes 18 px). Pantallas: Buscar (Volver, Borrar, voz, Relevancia, «Ver los N»), la ficha («3 FOTOS», Pickup/Delivery, «Ver el menú», «Más horarios» y los enlaces de acción de las reservas), Comunidad (Mensajes, rango, Filtros), Eventos (filtros), las X de cerrar de 36 → 44. a11y9c lo EXIGE (`pruebas/lib/tactil.cjs`: chicos, pisan, desbordan + botonesQueNoCaben, sin scroll de lado) en Inicio, Negocios, Buscar, dos fichas, Comunidad, Eventos, Mi cuenta a 390 y a 320 con letra grande, el Super Admin a 390 y 320, «Tu pedido», y el mínimo AA de 24 px en la ficha; permitidos solo «enlace dentro de un texto» y «oculto». Guardián `objetivosTactiles`, alreves9ttactil 17/17. **Queda (escritorio, con ratón; no se exige 44):** el encabezado de escritorio (logo 30, texto del buscador 19, ciudad 33), «Reportar» de las reseñas (17), el filtro de estrellas (24), pestañas de reseñas (25), menú lateral de Mi cuenta/Comunidad/Super Admin (34–38) y el texto de una publicación como botón (23) — y las pantallas fuera de las clave (panel del negocio, flujos de reserva/cita) no se midieron una por una: lo del sistema ya les llega.
- [x] **→ 9t** · **Objetivos de 24 px en el escritorio (WCAG 2.2 AA 2.5.8) y 44 en el resto de pantallas:** a 1440 quedan controles de menos de 24 px: el texto del buscador del encabezado de escritorio (19; su relleno lo usa AppShell para ubicar el desplegable), «Reportar» de las reseñas (17), «Escribir reseña» (22), «Ver 6» de la columna de reserva (20) y el texto de una publicación de Comunidad como botón (23); y los menús laterales (34–38) a menos de 44. El panel del negocio y los flujos de reserva/cita/pago no están en las pantallas clave de a11y9c. Medir con `pruebas/lib/tactil.cjs` (chicos con mínimo 24 en el escritorio) y agrandar igual. (9t, 19 nov) — **✓ 20 nov:** a 1440 ya no queda ninguno de menos de 24 en las pantallas clave ni en el Super Admin, y a11y9c lo EXIGE (antes era informe): el texto del buscador del escritorio toma 24 de alto (TACTIL, `T24`; el relleno de 12 queda para AppShell); «Útil», «Editar» y «Reportar» de las reseñas a 44 (ReviewCard por TACTIL); los 82 controles con forma de enlace de la app (`<button>` y `role="link"/"button"` con `text-action`/subrayado: «Ver 6», «Escribir reseña», «Más fechas», «Cambiar», «Mis boletos y RSVP»…) llevan su caja de 44 (`min-h-11`; los que van dentro de una oración quedan exentos, como pide WCAG); guardián **botonTextoConAlto** (alreves9tbotones) y objetivosTactiles amplía (24/24). Queda fuera: los menús laterales del panel del negocio a 34–38 (escritorio con ratón: pasan los 24 de AA).
- [x] **→ 9t** · **Nombres en inglés de los íconos sin texto del sistema (9c-2):** los controles que solo tienen un ícono (votar en Comunidad, «Foto» de una reseña,
      «Ver el equipo», ficha del dominó, cerrar/atrás/enviar de El Compa y del onboarding, los de la barra del Super Admin…) tienen nombre con un prop
      (`upLabel`, `closeLabel`, `backLabel`, `searchLabel`…) cuyo valor por defecto es ES, o ES/EN si el componente recibe `lang`. Falta que cada pantalla que los
      usa pase el EN: hoy lo pasan el menú, el QtyStepper y el encabezado (`SiteHeader`). Lo demás sale en español a un lector de pantalla en inglés. (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **9c-5 (15 nov), en parte:** los componentes no tenían el parámetro `lang` (el EN nunca salía aunque se pasara): el script de portar lo agrega donde hay nombres; ya lo pasan la barra del Super Admin, Entrar y Publica (OnbTopBar), Hoy (StoryCard), El Compa (CompaFrame), «También recomendado» y las tarjetas de reseña. Los votos de `PostCard` ya llevaban `labels` ES/EN (Comunidad, Novedades; ahora también el Hilo del Super Admin); los de comentarios y respuestas reciben `lang` (`actions.lang` y `ReplyThread` → `ReplyBody`, por el script de portar). Cerrado.
- [x] **→ 9m** · **Hoja «Entra para pedir» (AuthSheet):** ya anuncia errores (`error` → `role="alert"`, campos con nombre y `aria-invalid`), pero ninguna pantalla la
      usa todavía (el pedido sin cuenta usa la pantalla Entra, que ya es accesible); al conectarla con su texto ES/EN, pasar `error` y las etiquetas. (9c, 14 nov) — **✓ 9m (14 nov):** Conectada: `HojaEntrar` pasa `error` y las etiquetas ES/EN; Escape la cierra. Prueba: `vec9m` (en inglés, código malo → el error con role=alert).
- [x] **→ 9t** · **Hojas (diálogos) sin trampa de foco ni Escape:** los fondos de las hojas son `role=presentation` y el teclado las cierra con su botón «Cerrar», pero
      una hoja abierta no atrapa el foco ni se cierra con Escape, ni devuelve el foco a quien la abrió (WCAG 2.1.2 y 2.4.3, nivel A/AA). Es el mismo cambio en
      todas (≈ 40 hojas en `apps/web`): un componente `Hoja` con `role="dialog"`, `aria-modal`, foco inicial, Tab cíclico, Escape y retorno del foco. (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m (la hoja «Entra para pedir» ya cierra con Escape)._ — **✓ 9c-4 (15 nov):** un solo gestor `app/FocoHojas.tsx` (montado en el layout raíz) para toda hoja `role="dialog" aria-modal="true"`: foco al abrir, Tab que da la vuelta, Escape (su «Cerrar» o su fondo; las que ya lo hacían llevan `data-escape="propio"`) y el foco de vuelta a quien la abrió. 8 hojas sin nombre lo tienen y 7 capas que no eran diálogo lo son. Guardián `hojaAccesible` (alreves9c); a11y9c lo prueba en «Tu pedido».
- [x] **→ 9t** · **Tabs con flechas y lista de opciones:** las pestañas (`Tabs`, `DesktopTabs`) son botones en el orden de Tab; el patrón de WAI-ARIA pide una sola
      parada con las flechas ← → entre ellas, y lo mismo las listas de radios (día, hora). Hoy se llega a cada una con Tab y se elige con Enter o Espacio:
      cumple AA, es mejorable. (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **✓ 9c-3 (15 nov):** ← → (en círculo), Inicio y Fin entre pestañas en `Tabs` (por el script de portar), PanelBloques y las tres pestañas propias; Enter elige (activación manual). Cada pestaña sigue en el orden de Tab (a11y9c lo exige). a11y9c prueba las flechas en la ficha. Los radios de día y hora quedan como están (Tab + Enter: AA).
- [x] **→ 9t** · **Foco visible sobre fondos oscuros:** el contorno global es el morado de marca (más de 3 : 1 sobre blanco, papel y tinta); mirarlo en las pantallas
      oscuras (Puerta, Patio, el menú del Compa) con teclado físico y, si hace falta, un tono más claro con `:focus-visible` dentro de `[data-oscuro]`. (9c, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **✓ 9c (15 nov), medido:** el contorno Brand #7B61FF da 4,6 : 1 sobre la tinta #0B0E12, 4,2 : 1 sobre `dark-2` y 3,8 : 1 sobre `dark-3` (el mínimo de WCAG 2.4.11 para el foco es 3 : 1): no hace falta otro tono.
- [x] **→ 9b** · **a11y9c no se corrió en local** (sin Docker en la sesión que la escribió): `a11y9c` entra a la regresión de la fase 9; si alguna de sus
      pantallas tiene un selector distinto, la prueba lo dice con el texto de la página. Los avisos «clics con mano sin teclado» de a11y9c son una heurística de la página
      servida: lo que falla es lo estático (`sistemaClicMudo`, `clicConTeclado`) y los roles fuera del orden de tabulación. (9c, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.

## Fase 9 · 9d — tus datos: exportar, borrar a los 30 días, retener y fusionar (14 nov)
- [x] **→ 9b** · **datos9d y alreves9d entran a la regresión del CI:** en local (Postgres 16 + PostGIS, un S3 de mentira en vez de Garage, Chrome del sistema)
      datos9d pasó 61 ✓ dos veces seguidas, alreves9d 23/23, y usr1l, cuenta2h, adm7i, alreves7i y alreves8i siguen en verde. La corrida de verdad (con Garage y los
      9 dispositivos) es la del CI. (9d, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [x] **Aviso «Tu cuenta se borró» (`cuenta_borrada`):** la plantilla existe (crítica, SMS) pero la purga no la manda: al purgar, el teléfono queda vacío y
      un SMS a un número sin cuenta se guarda (cifrado) en `phone_messages`, que hoy no tiene retención. Mandarla antes de vaciar el teléfono y darle su retención
      a `phone_messages` van juntos con los canales. (9d, 14 nov) — **✓ 9l (14 nov):** purgarVencidas() lo manda al número de antes cuando la purga termina (una vez); phone_messages se vacía a retener_sms_dias. avi9l lo prueba.
- [x] **Retención de `phone_messages`** (el registro cifrado de los SMS a números sin cuenta): el mapa la guarda «por las reglas de los SMS» sin un plazo;
      falta su clave `retener_*` y su barrido. (9d, 14 nov) — **✓ 9l (14 nov):** `retener_sms_dias` (90) en Configuración › Retención: el teléfono y el texto se vacían (sms_outbox y phone_messages), prueba con el reloj movido en avi9l.
- [x] **9e** · **Términos de uso y Privacidad con versión en «Términos que aceptaste»:** `lib/datos/terminos.ts` suma `legal_acceptances` (la adenda del
      estado y «por {negocio}»); `/privacidad` trae «Qué pasa con cada dato al borrar tu cuenta» del mapa (`privacidadDelMapa`). Evidencia: leg9e
      («VERSIÓN N · ACEPTADO …») y datos9d 61 ✓ sigue en verde. (9d, 14 nov · 9e, 14 nov)
- [x] **«Cuenta borrada» en inglés:** el nombre que queda en una cuenta purgada es un texto en la base («Cuenta borrada»); un panel en inglés también lo
      lee así. _Hecho en 9f (14 nov) para el panel de Pedidos: `nombreVisible()` (lib/textos-cuenta.ts, cadena `USR-CUENTA.borrada` con candado) → «Deleted account»; guardián
      `cuentaBorradaBilingue`; cms9f paso 10. Los demás paneles → 9n (abajo)._ (9d, 14 nov)
- [x] **→ 9t** · **Pedir el archivo con la llave de acceso** (el plan dice «con el código de entrada otra vez (o la llave)»): hoy solo con el código por SMS, como
      Borrar mi cuenta. (9d, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — _9t (19 nov): hecho para
      **Descargar mis datos**, **Exportar los datos del negocio** (el dueño) y **Borrar mi cuenta** (el mismo mecanismo aplica limpio): «Pedir con Face ID» /
      «Borrar con Face ID» y «Mejor con un código» (el SMS sigue igual; sin llave, o donde no se ofrecen, o en un dispositivo que no puede, solo el código).
      Migración **0184** (`webauthn_challenges.purpose` + `data_export` / `account_delete`, siempre con cuenta; `passkey_log` + `confirmo` / `confirmar_fallo`
      con sus índices). `lib/llaves/llaves.ts`: `retoConfirmar` (reto de ESE propósito, de esta cuenta y este dispositivo, 120 s, verificación requerida,
      solo sus llaves vivas), `confirmarConLlave` (tope de fallos por cuenta y dirección; el reto se gasta antes de la firma; llave viva de ESTA cuenta;
      la firma la verifica `firmaDeLlave`, la MISMA de entrar —se sacó de `entrar`, un solo `verifyAuthenticationResponse`—) y `usarConfirmacionEn`
      (dentro de la transacción del pedido o del borrado: la prueba opaca de un uso y de ese propósito, contador quieto con la llave bloqueada, dispositivo
      y origen sin bloqueo, cuenta activa, teléfono verificado; «confirmo» en el libro). Super Admin › Usuarios 360° › Seguridad cuenta las
      confirmaciones de cada llave. Guardián `confirmarConLlave` (y `retoUnUso`, `llaveDeSuCuenta`, `passkeyNoSaltaBloqueo`, `clonSoloConFirma` miran la firma
      compartida); alreves9tllave 30/30, alreves8d 41/41. e2e `llave9t` (ver PROGRESS 19 nov). Ayuda: descargar-mis-datos, borrar-mi-cuenta,
      panel-exportar-los-datos, entrar-con-face-id, admin-usuarios._
- [x] **→ 9t** · **Un archivo con más de 20 000 filas en una parte** se corta en 20 000 (el LEEME dice cuántas trae cada parte); con la carga de 1M, medir el
      tiempo de armarlo para la cuenta más grande y, si hace falta, partirlo. (9d, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — **✓ 9t (19 nov):** ya no se corta: cada archivo sale entero en partes de 20 000 (`avisos-1.csv`, `-2`…; lo que cabe en una se llama igual), leído con un cursor de la base dentro de una transacción de solo lectura y comprimido parte por parte (`zipPorPartes`): en memoria, una parte cruda a la vez. Medido en local: 45 004 avisos → 3 partes en 1,9 s y 191 MB (todo el proceso). Freno: 100 partes (2 000 000 filas) por archivo; si se pasa, el LEEME dice cuántas quedaron fuera. `data_exports.sections` guarda las partes y `_ms`. Prueba `exp9t` (presupuesto 30 s), guardián `exportarSinCorte`, al revés `alreves9texp` (9/9).

## Fase 9 · 9e — legales por estado, aceptar términos y la web legal (14 nov)
- [ ] **→ 9s** · **El texto final de las 14 páginas de docs/legal/** (11 generales + 3 adendas de PA) lo revisa el abogado (Paquete 9-2): hoy son BORRADOR de
      Claude, sobrios y sacados de lo que el producto hace, con cada hueco marcado «[pendiente: …]» (nombre legal y dirección de la empresa, edad mínima de
      la cuenta y COPPA, límite de responsabilidad, ley aplicable y arbitraje, consentimiento de mensajes TCPA/10DLC, Sección 230 y difamación, respuesta
      a órdenes legales, proveedor de servidores de producción, leyes de privacidad de PA, avisos de IA, plazos DMCA, quejas ante HUD y la PHRC). Con
      TOLATINO_FASE=9, `legalRevisado` no deja abrir con un BORRADOR. (9e, 14 nov)
- [ ] **→ 9s** · **Agente designado DMCA** registrado en la Copyright Office (tiene costo): /dmca dice que está pendiente y manda a Soporte mientras tanto; no
      hay una cola propia de avisos DMCA (el equipo oculta con las herramientas de moderación de siempre). (9e, 14 nov)
- [ ] **→ 9s** · **Dónde más se anota la aceptación:** hoy en Publica tu negocio, el primer pedido de comida (Pagar) y la hoja. El registro («Al seguir aceptas
      los Términos y la Privacidad» en /entrar), la primera cita, reserva, boleto o compra del mercado todavía no anotan nada: el abogado dice cuál acto
      obliga (decisión en REVISION 9e). (9e, 14 nov)
- [x] **El pie de la web en todas las páginas** y **Super Admin › Textos y páginas › Páginas en inglés:** _hecho en 9f (14 nov): `<PieWeb>` bajo el Inicio, la ficha y Buscar detrás del
      interruptor `web.pie_todas` (apagado de fábrica: las capturas aprobadas no cambian; se enciende en Páginas con motivo, `cms:aprobar`); Páginas, Ayuda, Cadenas, Rótulos y Home
      salen en los dos idiomas (cms9f). Evidencia: cms9f 91 ✓ dos veces seguidas._ Lo que falta, abajo («Fase 9 · 9f»).
- [x] **→ 9b** · **leg9e y alreves9e entran a la regresión del CI:** en local (Postgres 16 + PostGIS, un S3 de mentira, Chrome del sistema, perfil basico)
      leg9e pasó 72 ✓ dos veces seguidas, alreves9e 18/18, datos9d 61 ✓, alreves8i y alreves9d siguen en verde. fich8i no se corrió entera en local (pide los
      simuladores de las tiendas y los documentos de Google): su paso 1 (/privacidad) se comprobó aparte con las mismas aserciones. La corrida de verdad es
      la del CI. (9e, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [ ] **→ 9t** · **El índice legal en producción:** el despliegue del sandbox indexa docs/legal/ (deploy.sh 3c-ter); el de producción (todavía no existe)
      hace lo mismo, sin la semilla 0053: allí la base es producción y nada se publica sin el abogado. (9e, 14 nov)

## Fase 9 · 9f — Textos y páginas completo: cadenas, rótulos, Home por ciudad, anuncios (14 nov)
- [x] **→ 9f** · **9f-3 · Más cadenas por el CMS:** hoy salen por el CMS el diccionario general `T` (Inicio, ficha, galería, categorías, Negocios y el menú), el texto del Inicio
      (`lib/textos-home.ts`), las líneas fijas y el nombre de la cuenta borrada: 214 cadenas. Quedan ~16 000 `E2("…","…")` escritos a mano en `apps/web` (el trinquete
      `cadenaConLlave` los cuenta: tope 16129, solo aviso hasta TOLATINO_FASE=9; cada pantalla migrada se anota en su lista `MIGRADAS` y ahí no puede quedar ninguno) y los
      componentes de cliente `Buscar.tsx` y `Hoy.tsx` leen `T` directo. Migrarlas pantalla por pantalla (cada una con su captura). (9f, 14 nov) — **✓ 9f-3 (18 nov):** todas las pantallas leen el CMS sin reescribir sus textos. Cada E2 local pasa por
      `dosIdiomas` (lib/dos-idiomas.ts; el codemod scripts/cms/e2-al-cms.mjs convirtió las 262 definiciones de 198 archivos, 0 sin convertir; 9 pasan el de otro) y
      cada par fijo E2("…", "…") es una cadena del catálogo `apps/web/lib/cms-cadenas-e2.json` (9 948 pares de 15 147 llamadas, llave `<PANTALLA>.e2-<huella>`, 44
      con candado) que el despliegue indexa con las demás (10 294 filas). El servidor carga solo lo editado (edicionesE2) y el layout raíz lo pasa al navegador
      (EdicionesE2): sin parpadeo ni diferencias al hidratar. Buscar.tsx y Hoy.tsx ya no leen `T` (textosT en su página). El trinquete de `cadenaConLlave` ahora
      cuenta definiciones de E2 sin `dosIdiomas`: tope 0, rompe el build; guardián nuevo `e2PorElCms`. alreves9f3 37/37, cms9f3 48 ✓, cms9f 94 ✓. Lo que no se
      edita: los E2 con `${…}` (siguen saliendo del código) y las islas estáticas sin señal (salen con el texto del código hasta el siguiente build).
- [x] **→ 9f** · **9f-4 · El resto del Super Admin en inglés:** el mecanismo está y Textos y páginas ya sale completo; faltan los demás módulos (Colas, Usuarios, Negocios,
      Transacciones, Soporte, El Compa, Contenido, Eventos y boletos, Planes, Notificaciones, Confianza, Analítica, Sistema…) y las piezas compartidas
      (`ConfirmarMotivo`/`ReasonConfirm`, `Toast`, `Shell`: su «Confirmar», «Volver», «Guardando…» y el menú siguen en español). Las líneas de 5i, 6a, 6b, 6c, 6j y 7g de arriba se cierran
      con esto. (9f, 14 nov) — _(9f-4a, 15 nov): la base está: `app/admin/idioma-admin.tsx` (el marco da el idioma de la persona; `useE()` en cada pantalla cliente); el marco (buscador, ciudades, barra del teléfono), el menú (admin_sections es/en, grupos) y la confirmación con motivo («Confirmar», «Guardando…», el texto del motivo) ya salen en inglés (adm9n3 §11). Faltan las pantallas, módulo por módulo, con `useE()`._ — **✓ (9f-4b…m, 15 nov):** todas las pantallas del Super Admin salen en el idioma de la persona del equipo (`useE()`; en las de servidor, `idioma()`): Colas, Negocios y su 360°, Usuarios y su 360°, Transacciones, Disputas, Liquidaciones, Soporte, El Compa, Contenido, Hoy, cuenta oficial, Auto-moderación, Confianza, Eventos y boletos, Planes, Catálogo, Gamification, Notificaciones, Analítica, Sistema (Configuración, Apps, Integraciones, Equipo). Sigue en español lo que el SERVIDOR arma solo en español (mensajes de las acciones `r.mensaje`, títulos de casos de lib/admin-colas, nombres de rol, de categoría y de filtros, canales push de lib/push/admin): va con 9f-3 (cadenas por el CMS).
- [x] **→ 9f** · **9f-5 · La ayuda: inglés ampliado y editor:** ~25 artículos de `docs/ayuda/` tienen un inglés de menos de una quinta parte del español (L969) y el Super Admin solo
      pausa (L975): falta ampliar el inglés y el editor que guarda «cambio propuesto» para el siguiente commit (la tabla de cambios propuestos no se creó). (9f, 14 nov) — **✓ 9f-5 (15 nov):** las dos partes (ver las líneas 7a de arriba). De paso: «calendario-y-deposito-fiestas» recupera las opciones de cobro que faltaban en español, «booking-taller-hogar» decía que el depósito se cobra al enviar (se retiene; el guardián depositoRetenido ahora lo caza aunque la frase esté partida en dos líneas) y «mis-boletos-y-el-qr» decía que Wallet «todavía no» (ya existe, 8g).
- [x] **→ 9n** · **«Cuenta borrada» en los demás paneles** (Apartados, Citas, Reservas, Rentas, Inscripciones, Fiestas, Noche…): solo el de Pedidos pasa el nombre por `nombreVisible()`;
      los otros leen `users.first_name` tal cual y en un panel en inglés dicen «Cuenta borrada». (9f, 14 nov) — **✓ 9n-2 (14 nov):** Panel envuelve a PanelBase con traducirBorradas: todos los paneles en inglés dicen «Deleted account». Guardián cuentaBorradaEnTodosLosPaneles; pan9n2 §2.
- [x] **→ 9n** · **Anuncios para negocios en el panel** (`announcements.audience = 'negocios'`): el banner sale en el Inicio de la ciudad (todos o solo vecinos); la audiencia de negocios
      (un aviso en Hoy del panel) no se construyó. (9f, 14 nov) — _(9n-2, 14 nov): el panel de Hoy ya muestra los anuncios con audience «negocios» (el CHECK se amplió; pan9n2 §6; guardián anuncioDeNegociosEnElPanel). Falta el selector «Negocios» en Super Admin › Textos (lib/cms-admin.ts crearAnuncio y TextosHome.tsx): es pantalla del Super Admin y no se tocó en 9n-2._ — _(9n-7, 15 nov): hecho. «¿A QUIÉN?» › Negocios en Super Admin › Textos › Inicio (crearAnuncio lo acepta; la lista dice «negocios (Hoy del panel)»; cms9f lo crea por la pantalla y comprueba que no sale en el Inicio)._
- [ ] **→ 9v** · **Encender el pie de la web en todas las páginas** (interruptor `web.pie_todas`, Super Admin › Textos y páginas › Páginas): nace apagado porque cambia las capturas
      aprobadas del Inicio, la ficha y Buscar. Con tu OK sobre las capturas nuevas (`pruebas/visual`, REVISION 9f) se enciende; el día de la apertura solo se encienden interruptores. (9f, 14 nov)
- [x] **→ 9h** · **Las líneas fijas de §1c que esperan su pantalla:** la landing y su teléfono (9h), la página de mantenimiento (9o) y «el equipo entra con dos pasos» (9j) ya están en
      `lib/textos-fijas.ts` con candado y comparadas con el plan palabra por palabra (`lineaFijaBloqueada`); cada pantalla las usa cuando exista (hoy solo «Exportar mis datos»). (9f, 14 nov) — **✓ 9h (14 nov):** la landing usa `FIJAS.landing` y `FIJAS.landingTel` tal cual (guardián `listaConPermiso`; cre9h las lee palabra por palabra en ES y EN). Las otras dos siguen abajo, cada una con su bloque.
- [x] **→ 9o** · **La línea fija de mantenimiento espera su pantalla** («Estamos haciendo un cambio. Volvemos en unos minutos.», `FIJAS.mantenimiento`): la página que sirve nginx con la app caída. (9h, 14 nov; de la línea de 9f) — **✓ 9o (14 nov):** `infra/comun/mantenimiento/index.html` sale del sistema de diseño con `FIJAS.mantenimiento` tal cual (ES y EN; `scripts/produccion/mantenimiento.mjs`) y nginx de producción la sirve con la app caída (502/503/504) y durante la ventana; guardián mantenimientoFijo (alreves9o).
- [x] **→ 9j** · **La línea fija «el equipo entra con dos pasos» espera su pantalla** (`FIJAS.equipoDosPasos`): el alta del segundo factor del equipo. (9h, 14 nov; de la línea de 9f) — **✓ (15 nov):** sale en `/admin/dos-pasos` (debajo de cada título) y ahora la pantalla la lee de `FIJAS` (antes era una copia).
- [x] **→ 9b** · **cms9f y alreves9f entran a la regresión del CI** (y a los 9 dispositivos): en local (Postgres 16 + PostGIS, un S3 de mentira, Chrome del sistema, perfil basico, :3110)
      cms9f pasó 91 ✓ dos veces seguidas y alreves9f 30/30; la corrida de verdad es la del CI. El paso nuevo del CI indexa las cadenas dos veces y comprueba que una línea fija y una edición
      sin autor se rechazan. (9f, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [ ] **→ 9t** · **El indexador de cadenas en producción:** el despliegue del sandbox corre `scripts/cms/indexar.mjs` (deploy.sh 3c-quater); el de producción (todavía no existe) hace
      lo mismo, sin la semilla 0054 (los anuncios de ejemplo son solo del sandbox). (9f, 14 nov)

## Fase 9 · 9g — Analítica completa, base de análisis y el reporte diario (14 nov)
- [ ] **→ 9s** · **Grabación de sesiones (rrweb, con consentimiento):** no se construyó en 9g. Graba pantallas donde hay nombres, direcciones, mensajes y datos de salud o de niños; pide
      una pantalla de consentimiento que el diseño no trae, cambiar el aviso de privacidad (hoy dice que no hay rastreo ni grabación) y la revisión del abogado. Se decide con el
      paquete legal (9s); si se hace, enmascarando todo campo y solo en la web. (9g, 14 nov)
- [x] **→ 9j** · **Web Vitals propios (RUM: LCP, INP, CLS de teléfonos reales):** no se construyó en 9g. Se mide sin personas, pero es un script en todas las pantallas de la app y su
      tablero y alertas van con Sistema › Salud (9j), donde ya viven los errores en vivo; el presupuesto de laboratorio sigue en el CI. (9g, 14 nov) — **✓ 9j-2 (15 nov):** propio y sin terceros: `app/_vitales/Vitales.tsx` (en el layout raíz) mide LCP, INP y CLS y los manda una vez por página a `/api/vitales` (2 KB, solo páginas nuestras, tope compartido por conexión y del sistema); **0167** `web_vitals_dia` suma por día, familia de ruta (nombres y números → «:x»), perfil y métrica en tres cubetas (umbrales de Google), sin personas; Sistema › Salud «VELOCIDAD EN TELÉFONOS REALES · 7 DÍAS». Flag `app.vitals`. Guardián `vitalesSinPersonas` (alreves9c); sis9j §9; ayuda admin-sistema.
- [ ] **→ 9n** · **El panel del negocio con vistas sin repetidos:** Analítica ya muestra las dos cifras (`business_views_daily.unicos`); el panel sigue con todas las vistas porque cambiarlo
      cambia las capturas aprobadas del panel (necesita el OK del fundador con las capturas nuevas). (9g, 14 nov) — _(9n-2, 14 nov): hecho detrás de feature_flags «panel.vistas_unicas» (nace APAGADO, no cambia las capturas aprobadas); el fundador lo enciende con las capturas nuevas._
- [x] **→ 9j** · **Los guardianes del build en el reporte diario:** el reporte lleva los guardianes en vivo (sobreventa, errores sin revisar, el tope de El Compa) y las tareas del barrido
      con error; lo que cazan los guardianes del build corre en el CI y no queda en la base: con Sistema › Salud (9j), cada despliegue anota su resultado y el reporte lo lee. (9g, 14 nov) — **✓ 9j (15 nov):** el reporte lleva el renglón «Último despliegue»
      (su commit, si sirvió, volvió atrás o no salió, y en qué entorno) de deploy_releases (0145): solo se despliega lo que pasó el CI (tipos, guardianes,
      pruebas), así que ese renglón es el resultado de los guardianes del build. ana9g lo comprueba en el correo del simulador.
- [x] **→ 9k** · **La conciliación con Stripe en el reporte diario y en Analítica › Dinero:** el renglón existe y dice que todavía no sale (`conciliacion: null`); lo llena la conciliación
      diaria de 9k. (9g, 14 nov) — **✓ 9k (15 nov):** el reporte dice «cuadra», «no cuadra · $diferencia» o «no corrió ayer»
      (conciliacion_del_dia de ayer); Analítica › Dinero suma el grupo «CONCILIACIÓN CON STRIPE» del período (días que cuadraron, con diferencias y
      cuántas sin dueño con su monto → Planes, no corrió o falló). Es de toda la plataforma: solo lo ve quien ve todas las ciudades. ana9g contra la base.
- [x] **→ 9o** · **Las vueltas atrás en el reporte diario:** el renglón existe (`vueltas: null`); lo llena la vuelta atrás automática de 9o. La alerta «el reporte no salió» la da el barrido:
      si el barrido entero se cae, nadie alerta; el monitoreo externo de 9o mira `system_jobs` (barrido.reporteDiario). (9g, 14 nov) — **✓ 9o (14 nov):** el renglón cuenta las de ayer (`vueltas_atras_del_dia`, 0145). Si el barrido entero se cae: Prometheus (BarridoCallado, ReporteDiarioNoCorre, por postgres_exporter) y el segundo testigo de GitHub Actions (`barrido_s` en /api/salud) avisan desde fuera.
- [x] **→ 9g** · **Corridas del CI de 9g:** `ana9g` pasó dos veces seguidas en una base local (85 ✓) con un docker de mentira; falta la regresión entera, la barajada y los 9
      dispositivos en el CI, y `pruebas/visual` del Inicio del Super Admin (Ciudad viva va al final de la pantalla). (9g, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.

## Fase 9 · 9j — Super Admin › Sistema completo y la seguridad del equipo (14 nov)
- [x] **→ 9o** · **Respaldos reales y la restauración de prueba semanal:** Sistema › Respaldos lee `backup_runs` y `restore_drills`; en el sandbox solo hay la semilla
      (0057). pgBackRest, la sincronización de las fotos, el sobre de recuperación y la máquina desechable que restaura cada semana (y la alerta si no corre en 8 días)
      nacen con producción como código. (9j, 14 nov) — **✓ 9o (14 nov), como código:** pgBackRest (completo diario, diferencial cada 6 h, WAL continuo, cifrado) al almacén de otra región, fotos y sobres de recuperación, cada corrida en backup_runs; la restauración de prueba cada domingo en un contenedor desechable de la réplica (PITR a hace 1 h, `migrar.sh --verificar`, consultas de control, restore_drills con su RTO) y la alerta crítica si falla o no corre en 8 días (Prometheus y el barrido; guardián respaldoRestaurado). PITR de verdad con la plantilla de producción en local: `pruebas/infra/pitr-local.sh` 8/8. En máquinas: el ensayo (línea «Fase 9 · 9o»).
- [x] **→ 9o** · **Despliegues y vueltas atrás en Salud:** la fila dice que llegan con producción; `deploy_releases` es de 0145. Prometheus, node_exporter,
      postgres_exporter y Uptime Kuma (HERRAMIENTAS #4, #14) también: Salud es su tablero. (9j, 14 nov) — **✓ 9o (14 nov):** Salud lee deploy_releases (y Sistema › Despliegues, nueva) y, en producción, las máquinas de Prometheus (PROMETHEUS_URL, red privada); node_exporter y postgres_exporter en cada máquina. Uptime Kuma se cambió por blackbox_exporter de Prometheus (configurado como código; REVISION 9o).
- [x] **→ 9o** · **La página de mantenimiento la sirve nginx** durante la ventana (§1b #8) y **el aviso a los vecinos 24 h antes** (prototipo): hoy el mantenimiento
      se programa, se cancela y queda en la auditoría, pero nadie lo ve fuera del Super Admin. (9j, 14 nov) — **✓ 9o (14 nov):** nginx de producción la sirve durante la ventana (un temporizador por minuto lee maintenance_windows y deja el aviso; la API, el Super Admin y la entrada siguen) y el barrido pone un anuncio en el Inicio de cada ciudad desde `mantenimiento_aviso_h` (24 h) antes, y lo retira si se cancela (`avisarMantenimiento`, con autor y auditoría por lib/cms-admin.ts).
- [x] **→ 9o** · **Llaves que vencen fuera del llavero** (`RESPALDO_LLAVE`, certificados de origen de Cloudflare, el token de la API del proveedor): nacen en el
      servidor de producción; su fecha se anota allí y el aviso es el mismo `llave_vence`. (9j, 14 nov) — **✓ 9o (14 nov):** server_keys (0145: solo la huella y el vencimiento; una nueva retira la anterior y deja key_rotations). El despliegue anota la llave age de cada máquina, RESPALDO_LLAVE y el certificado de origen (con su fecha); `llave_vence` avisa a los Admins igual que con el llavero y Salud las lista.
- [ ] **→ 9p** · **Dar el segundo paso con la llave dentro de una sesión de SMS** (sin salir y volver a entrar): necesita HTTPS en el dominio (las llaves no corren en
      el sandbox por IP). Hoy: «Salir y entrar con mi llave». (9j, 14 nov)
- [x] **→ 9n** · **La persona del equipo cambia su app de códigos o pide códigos de recuperación nuevos por su cuenta** (con su segundo factor): hoy lo hace un Admin
      con «Restablecer sus dos pasos». (9j, 14 nov) — **✓ 9n-3 (14 nov):** `/admin/seguridad` (Mis dos pasos): códigos de recuperación nuevos y cambio de app con un código fresco de la app de siempre; las otras sesiones vuelven a pedir el segundo factor. Prueba `adm9n3` paso 9; guardián `dosPasosPropios`.
- [x] **→ 9n** · **Más interruptores por ciudad o porcentaje:** hoy solo `app.reportar` es «scopable» (sus tres lectores usan `flag_para`). Cada interruptor nuevo que
      se quiera acotar pasa sus lectores a `flagPara` y se marca en una migración (guardián `flagPorPersona`). (9j, 14 nov) — _(9n-3, 14 nov): `app.ubicacion_vivo` pasó a «scopable» (se decide por el repartidor que comparte); el procedimiento para el siguiente sigue igual. Prueba `adm9n3` paso 8._ — **✓ (15 nov):** queda como procedimiento, no como tarea: `app.reportar` y `app.ubicacion_vivo` son «scopables»; cualquier interruptor nuevo que se quiera acotar pasa sus lectores a `flagPara` y se marca en su migración (lo exige el guardián `flagPorPersona`). Ninguno más está pedido.
- [x] **→ 9f** · **Equipo y permisos, Configuración, Apps e Integraciones en inglés:** las pestañas de 9j (Flags, Salud, Respaldos, Estados, los dos pasos) ya salen
      en los dos idiomas; esas cuatro siguen en español (como el resto del Super Admin). (9j, 14 nov) — **✓ 9f-4 (15 nov):** el Super Admin entero sale en el idioma de la persona del equipo (`useE()` / `idioma()`; adm9n3 §11). Lo que arma el servidor (mensajes de las acciones, títulos de colas) sigue en español: va con 9f-3.
- [x] **→ 9k** · **`sis9j`, `ayu4m` y la regresión en el CI:** `sis9j` pasó dos veces seguidas en una base local (78 ✓); `ayu4m` (vidrio roto) no corrió aquí (necesita
      Garage) y la regresión entera de las pruebas que entran como equipo corre en el CI (decisión AD: en el hito después de 9k). (9j, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.

## Fase 9 · 9h — Crecimiento, la landing de acceso anticipado, los QR de calle y el SEO (14 nov)
- [x] **→ 9b** · **cre9h y alreves9h entran a la regresión del CI** (y a los 9 dispositivos): en local (Postgres 16 + PostGIS de la máquina, un S3 de mentira, Chrome del sistema, sin Docker,
      en :3119) cre9h pasó 95 ✓ dos veces seguidas y alreves9h cazó 53/53; la corrida de verdad es la del CI. (9h, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [ ] **→ 9b** · **`pruebas/visual` · admin-hoy:** «Crecimiento» dejó de verse «en construcción» en el menú del Super Admin (antes atenuado y con candado; en el teléfono, la lista de secciones
      decía «Se construye en la Fase 9»). Si la captura aprobada del Inicio del admin cambia más de lo tolerado, se aprueba la nueva (REVISION 9h). No se corrió aquí. (9h, 14 nov)
- [ ] **→ 9q** · **El mensaje de texto que promete la landing** («Te avisamos por mensaje de texto cuando abra tu zona. Nada más.»): sale con Telnyx (9q); el guardián `promesaSms` la tiene
      anotada (`lib/textos-acceso.ts`). La landing sale al público en 9t, después de 9q. (9h, 14 nov)
- [x] **Avisar a la lista el día que abre la ciudad:** quien se anota queda en `city_waitlist` (source `coming_soon`, la misma «Avísame» de siempre) y en `early_access`
      (`notified_at` sin usar todavía). El asistente de apertura (9i) manda ese único mensaje y marca `notified_at`. (9h, 14 nov) — **✓ 9i (14 nov):** el paso 7 abre y el barrido avisa
      por partes (`ciudad_aviso_lote`), de 9 AM a 9 PM de la ciudad, una vez por persona y ciudad (`city_notices`); marca `city_waitlist.notified_at` + `notice_result` y
      `early_access.notified_at`. `ciu9i`: de noche no sale, de día sí, otro barrido no repite, sin cuenta no se escribe.
- [x] **El Inicio del Super Admin con la lista de espera** (§4 9h): la lista está en Crecimiento › Lista de espera y en Ciudades; no se puso en el Inicio del admin porque cambia su
      captura aprobada (`pruebas/visual/admin-hoy`). Va con el asistente de Ciudades (9i), con tu OK sobre la captura nueva. (9h, 14 nov) — **✓ 9i (14 nov):** «LISTA DE ESPERA» en las cifras del
      Inicio (por ciudad que viene) y el aviso «CIERRE DE CIUDAD POR APROBAR». La captura nueva de `admin-hoy` espera tu OK (REVISION 9i; LAUNCH «Fase 9 · 9i» → 9b).
- [ ] **→ 9k** · **Pagar la recompensa del promotor a la Wallet:** el negocio traído califica solo (`promotor_operaciones` pedidos o citas hechos) y la recompensa queda anotada
      (`business_referrals.reward_cents`, «pendiente de pago»); pasar a «pagado» con el movimiento de Wallet llega con el dinero real (9k). (9h, 14 nov)
- [x] **→ 9t** · **Destacar eventos:** `featured` lleva solo negocios (Negocios › Destacados). Fijar un evento en Eventos de la ciudad (el modelo Featured también lo pide) va con lo de
      Eventos del vecino. (9h, 14 nov) — _9m (14 nov): pasa a 9t (lo del vecino que queda antes de encender): no cupo en 9m._ — _9t (19 nov): 0183 — `featured`
      lleva eventos (placement 'eventos', solo «fijar», desde/hasta del equipo, máx. 30 días; tope `destacados_evt_por_ciudad` 4 en Configuración › Crecimiento,
      el peor momento del rango, con candado; lo cancelado/oculto/pasado no ocupa puesto ni sale). Super Admin › Crecimiento › Destacados › EVENTOS (lo de hoy,
      fijados VIVO · PROGRAMADO · NO SALE · TERMINÓ · RETIRADO, «Retirar», «Fijar un evento») y la ficha del evento («Destacar en Eventos» / DESTACADO EN
      EVENTOS), con motivo y auditoría `mkt.destacado_evt.*`. /eventos: «Destacados en {ciudad}» (SectionHeader + Cartel, la pieza de Negocios › Destacados) y
      primero en la lista de su día; no repite lo que ya sale en Patrocinados (C-003). Panel › Eventos: DESTACADO POR TO'LATINO (lista y ficha). Guardián
      `destacarEventosDelServidor`, alreves9tevt 27/27, e2e evt9t (escrita; sin Docker ni Playwright aquí no corrió: probado en local con `next dev` + copia
      de la base, ver PROGRESS)._
- [ ] **→ 9b** · **Destacar eventos (9t) en la corrida completa:** la e2e `evt9t` (Crecimiento › Destacados › EVENTOS, /eventos 390/1360, el panel del
      organizador, el tope, ocultar, retirar y la ficha del Super Admin) está escrita y no corrió (sin Docker ni Playwright en esa máquina), y `next build` no
      llegó a correr (disco lleno); tsc, guardianes, alreves9tevt y CMS sí. Correrlas en el CI dirigido y mirar las capturas `evt9t-*`. (9t, 19 nov)
- [ ] **→ 9n** · **Segmento «Free con N ítems» y la insignia Fundadores en la página del negocio:** las campañas segmentan por rol, ciudad, inactivos, categoría y plan; contar ítems no se
      construyó. El número de negocio fundador queda en `early_access.founder_negocio_n` y la landing lo dice; la insignia en la ficha del negocio no se pintó. (9h, 14 nov) — _(9n-7, 15 nov): el segmento «ÍTEMS EN SU CATÁLOGO» (5/10/20/50+, solo dueños; cre9h lo cuenta contra la base) está hecho. Sigue abierto: la insignia Fundadores en la ficha del negocio (sin diseño de esa pieza: va a REVISION para el fundador, regla 7)._
- [x] **Campañas por correo de verdad:** salen por la bandeja de correo (`email_outbox`, plantilla `campaign`, solo correos verificados, con el pie «para no recibir más: Mi cuenta ›
      Avisos»); en el sandbox quedan «en modo pruebas». Con SES (9q) falta la cabecera `List-Unsubscribe` de un toque. (9h, 14 nov) — **✓ 9l (14 nov):** List-Unsubscribe + List-Unsubscribe-Post (un toque, RFC 8058) en las cabeceras de SES y «Darme de baja» al pie; el POST firmado apaga «Novedades» y queda en email_unsubscribes; abrirlo (GET) no da de baja. avi9l lo prueba; el envío real con SES es de 9q.
- [ ] **→ 9t** · **Encender la landing en producción** (interruptor `growth.landing`, nace apagado) con el OK-1, revisar en vivo `robots.txt`, `/sitemap.xml` y Open Graph con el dominio, y revisar
      los precios típicos de Publica con los negocios reales que lleguen (parte 8 de «Publica tu negocio»). (9h, 14 nov)
- [ ] **→ 9u** · **Smart App Banner de iOS en la web** (L1149): cuando la app To'Latino sea pública (su id de App Store); hoy no hay app pública que anunciar. (9h, 14 nov)

## Fase 9 · 9k — dinero real listo: conciliación, pagos al banco, disputas con evidencia, 3-D Secure y la huella (14 nov)
- [x] **→ 9n** · **3-D Secure en los demás flujos:** citas (depósito), fiestas, noche, viajes, inscripciones, visitas, evento privado, estimados y rentas todavía sueltan el cobro y piden
      otra tarjeta cuando el banco pide verificar. El mecanismo está (la pasarela con `usuario`, `pideVerificar` en el servidor y `useVerificacion` + `{V.hoja}` en la pantalla; el guardián
      tresDSecure revisa los flujos que ya lo tienen): falta pasarlo en cada uno, con su prueba. (9k, 14 nov) — **✓ 9n-4 (14 nov):** citas (depósito), visitas, inscripciones, noche, fiestas, viajes, evento privado, mudanza (precio cerrado), estimado y «algo más» pasan quien paga y devuelven la hoja (bancoPide); cada pantalla vuelve a enviar con la MISMA llave. Solo requires_action abre la hoja (requires_payment_method queda en «fallo»). Guardián tresDSecureEnTodos (la clase: todo cobro en sesión con usuario y todo «accion» por la hoja). Probado en el navegador: cita, estimado y «algo más», fiesta, mesa VIP, inscripción, mercado y Pro (din9n4 A–E); visitas, viajes, evento privado y mudanza por el guardián y tsc (sin su prueba de navegador propia). Las rentas cobran al recogerlas, sin la persona en la app: ver la línea nueva → 9q.
- [ ] **→ 9q** · **Rentas: 3-D Secure al recogerlas.** El depósito y la renta se cobran al recoger, sin la persona en la app (`fuera`); si el banco pide verificar, hoy se le pide cambiar la tarjeta. Con Stripe de verdad: el aviso con el enlace a la hoja (como la renovación de Pro) o verificar al apartar. (9n-4, 14 nov)
- [x] **→ 9b** · **`alreves7b` con 2 casos que ya no cazan:** «soporteCasoConSla» (0117_soporte.sql) y «compaTapaSecretos» (0122_compa_copiloto.sql) cambian la definición VIEJA de una función que 0144 (9n) volvió a definir; el guardián mira la última. Apuntar esos dos casos a 0144 (como 7g hizo con los suyos). No es de 9n-4: salió al correr las suites al revés vecinas. (9n-4, 14 nov) — **✓ (comprobado 15 nov):** `alreves7b` 45/45 (los casos ya apuntan a 0144).
- [x] **→ 9n** · **«Volver a Pro» en el panel con 3-D Secure:** si el banco pide confirmar al volver a Pro desde Free (en sesión), hoy el dueño recibe el aviso con el enlace a la hoja; abrir la
      hoja directo en Tu plan (como en el checkout). (9k, 14 nov) — **✓ 9n-4 (14 nov):** la hoja se abre en Tu plan y al confirmar solo se vuelve a leer el plan (nunca otro cobro); en sesión no sale el aviso con el enlace. Y un bug: la verificación de «Volver a Pro» desde Free no activaba Pro (completarRenovacion no aceptaba 'ended': el banco cobraba y el plan seguía en Free); ahora el período empieza ese minuto. din9n4 E.
- [x] **→ 9n** · **La foto de la entrega en la evidencia de una disputa:** el Repartidor no toma foto al entregar; la evidencia lleva la constancia con la línea de tiempo y la dirección.
      Cuando exista la foto, se suma como `foto_entrega` (dispute_evidence ya la admite). (9k, 14 nov) — **✓ 9n (14 nov):** la foto (si sigue en el almacén) va como archivo «foto_entrega» (uncategorized_file en Stripe) y la constancia dice la prueba con su hora. Guardián disputaConEvidencia ampliado.
- [ ] **→ 9q** · **El webhook de Stripe de verdad:** al crear el endpoint (Paquete 9-1), suscribirlo a payment_intent.succeeded / canceled / amount_capturable_updated, charge.refunded,
      charge.dispute.created / updated / closed, account.updated y, en los eventos de las cuentas conectadas, payout.created / updated / paid / failed / canceled; y fijar el calendario
      de los pagos al banco (martes) en las cuentas que ya existan. (9k, 14 nov)
- [ ] **→ 9q** · **La conciliación y 3-D Secure con Stripe de verdad (modo prueba):** aquí corren contra el simulador y el contrato (stripe-mock no guarda estado: no hay banco que pida
      verificar ni listas con objetos). Con la llave de prueba: la tarjeta 4000 0027 6000 3184 en la hoja (handleNextAction), una renovación con `authentication_required`, una conciliación de
      un día con objetos reales (paginación, payouts por cuenta conectada) y un archivo de evidencia real. (9k, 14 nov)
- [x] **→ 9b** · **din9k y alreves9k entran a la corrida dirigida del CI** (y a la confirmación completa después de 9k, decisión AD): aquí no hay Docker; alreves9k 38/38, la lógica del
      dinero contra Postgres 16 local (41 ✓) y din9k 39 ✓ dos veces seguidas con el build servido en local (perfil basico, S3 de mentira, Chrome del sistema); la corrida
      de verdad es la del CI. El contrato con stripe-mock (cliente con el doble de la base, intento, huella, delDia, archivos) también corre allí. (9k, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.

## Fase 9 · 9i — Ciudades: el asistente de apertura, la regla, la lista de espera, el estado «beta» y los barrios de las cinco (14 nov)
- [x] **→ 9b** · **ciu9i y alreves9i entran a la regresión del CI** (y a los 9 dispositivos): en local (Postgres 16 + PostGIS de la máquina, sin Docker, Chrome del sistema, el build
      standalone en :3149) `ciu9i` pasó dos veces seguidas (61 ✓) y `alreves9i` cazó 46/46; la corrida de verdad es la del CI. (9i, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [ ] **→ 9b** · **`pruebas/visual` · admin-hoy:** el Inicio del Super Admin suma la cifra «LISTA DE ESPERA» (y «Ciudades» cuenta beta con próximamente): si la captura aprobada cambia más de
      lo tolerado, se aprueba la nueva con tu OK (REVISION 9i). No se corrió aquí. (9i, 14 nov)
- [ ] **→ Paquete 9-4** · **El equipo local de cada ciudad** (paso 4 del asistente): un Ciudad manager por ciudad, con su nombre y su teléfono, lo da el fundador. En el sandbox, Reading tiene a Raúl
      (de ficción, semilla 0059); las otras tres que vienen no tienen a nadie y su asistente se queda en el paso 4 hasta entonces. (9i, 14 nov)
- [ ] **→ 9t** · **Los barrios y los pueblos de Allentown, Wilkes-Barre, Scranton y Reading revisados en el lugar:** sus puntos son aproximados (a menos de media milla); el equipo
      local los confirma o corrige en Super Admin › Ciudades › Barrios antes de abrir (lo que corrige ya no lo pisa la semilla). (9i, 14 nov)
- [ ] **→ 9s** · **El impuesto de cada ciudad lo confirma el contador:** las cinco nacen en 6 % (PA, 0005); Ciudades deja cambiarlo (Admin, con motivo) y vale para lo que se cobre desde ese
      momento. (9i, 14 nov)
- [ ] **→ 9u** · **Hazleton en «beta» para la beta cerrada (OK-2):** en producción se pasa con Super Admin › Ciudades › «Pasar a beta» y se invita por teléfono a los vecinos y negocios de
      confianza; las cuentas de revisión de Apple y Google entran solas (`review_accounts` activas). Hoy no se le avisa a la persona invitada (la beta la arma el fundador en persona):
      si se quiere un aviso «te invitamos a la beta», va con su plantilla. (9i, 14 nov)
- [ ] **→ 9v** · **Abrir las cinco con el asistente (OK-3):** cada ciudad pasa sus 7 pasos; la que no llegue a la regla (30 negocios listos o 300 en la lista, y al menos uno en comida,
      belleza, hogar, fiestas e iglesias) se abre con «Abrir igual» y su motivo solo si el fundador lo decide (§6 #17); la LAUNCH de esa ciudad tiene que estar en cero. (9i, 14 nov)


## Fase 9 · 9o — Producción como código y ensayada (14 nov)
- [ ] **→ 9o** · **El ensayo completo en máquinas desechables NO corrió** (el sandbox no tiene el token del proveedor y crea máquinas que se cobran): `.github/workflows/ensayo.yml` (a mano) o `scripts/produccion/ensayo.sh`. Necesita el secreto HCLOUD_TOKEN del entorno de GitHub «ensayo» (lo pone Claude con `gh secret set HCLOUD_TOKEN --env ensayo` desde los secretos de su entorno) y que el flujo pueda empujar las ramas desechables «ensayo» y «recuperacion-ensayo». Mide: primer despliegue, sobre ajeno que no abre, vuelta atrás sola, expandir → contraer, RPO, PITR del dato borrado, restauración de prueba (RTO), Garage borra, reconstruir la app. Cifras a `docs/incidentes/simulacros.md` y PROGRESS. (9o, 14 nov)
- [x] **→ 9o** · **`pruebas/infra/correr.sh` en el CI** — **✓ 18 nov:** corre en `verificar` con `docker compose config` de verdad (5 compose), azul/verde 21/21, sobre sellado 17/17, traza, sync 12/12 y el **PITR de verdad 8/8** (Postgres 16 del repositorio oficial PGDG + pgBackRest; en el CI ya no se salta en silencio). CI 44243264819. (paso nuevo de `verificar`, con `docker compose config` de verdad y la imagen de la base con pgBackRest): aquí corrió sin Docker (bash -n, shellcheck, la revisión de los compose en Python, azul/verde 21/21, sobre sellado 17/17, traza del sandbox, PITR 8/8); la corrida de verdad es la del CI (confirmación al terminar 9o, decisión AD). (9o, 14 nov)
- [ ] **→ Paquete 9-3** · **Lo que producción necesita del fundador para nacer:** proveedor, región y tamaños con el precio del día (§6 #2–#3; los scripts aceptan TIPO_*, UBICACION y ZONA), el token del proveedor de producción (HCLOUD_TOKEN_PRODUCCION, entorno de GitHub «produccion» con aprobación), el **almacén de objetos de los respaldos** (Hetzner no tiene almacén en EE. UU.: otra región del mismo proveedor en la UE u otro proveedor S3 — decisión, REVISION 9o), y la variable TOLATINO_DOMINIO_PRODUCCION del repo para que el segundo testigo empiece a mirar. Claude crea la llave de recuperación (`sellar.sh recuperacion produccion`) y sella las llaves. (9o, 14 nov)
- [ ] **→ 9p** · **Cloudflare por la API** (`scripts/produccion/cloudflare.sh dns | ajustes | reglas | origen`): con la zona y el token (Paquete 8-0); también `pruebas.tolatino.com` para el sandbox. El certificado de origen se firma con la solicitud que publica la app y se sella (ORIGEN_CERT). (9o, 14 nov)
- [ ] **→ 9t** · **El SMS crítico cuando la app está caída:** Alertmanager manda el correo directo (sale aunque la app esté caída) y avisa por la app (push y SMS al equipo) cuando la app contesta; un SMS que no dependa de la app (Telnyx desde la réplica) no se construyó. (9o, 14 nov)
- [ ] **→ 9t** · **Reconstruir la base o la réplica en máquinas:** el ensayo pierde y reconstruye la app; base y réplica tienen el mismo camino (`maquinas.sh reconstruir`, su disco aparte se vuelve a montar o PITR desde el almacén, estado provisional por la red privada) pero no se ensayaron. Se ensayan sobre producción en acceso anticipado antes de OK-3. (9o, 14 nov)

- [ ] **→ 9o** · **Vía urgente (DECISIONES AE, 20 nov):** un arreglo marcado «urgente» (seguridad, cobro mal hecho, app caída; con su motivo en la
      auditoría) sale a producción con la revisión rápida + una prueba corta contra producción ya desplegada (entrar, buscar, pedir, pagar en el
      simulador, Super Admin); la confirmación completa corre justo después sobre ese mismo paquete y, si cae, producción vuelve sola a la versión
      anterior. Guardián: un despliegue urgente sin motivo, sin la prueba corta o sin la confirmación de después. (20 nov)


## Fase 9 · 9l — avisos, correo y canales listos (14 nov)
- [x] **Cerradas con su evidencia** (marcadas «✓ 9l» arriba): recomendar, «Avísame cuando haya», invitación al equipo y «Reenviar», prueba de Pro, sello y foto
      reportada, quedan pocos, seguimiento y «llegó», reseña nueva, SMS de empleos, verificar el correo y recibos, «cambiaste tu número», Soporte por WhatsApp y
      correo, plantillas que faltaban, cifras de entrega, promesas de la pantalla, recibo del pedido, 7a/7b/7h/7i (estado de entrega, especificaciones fijas, un solo
      camino, tope de remitentes, plantillas de WhatsApp), pushsubscriptionchange, Wallet en el recibo, «Tu cuenta se borró», retención de phone_messages,
      baja de un toque. Prueba: `avi9l` 123 ✓ dos veces seguidas en local; `alreves9l` 41/41; contrato de los canales 31 ✓. (9l, 14 nov)
- [ ] **→ 9q** · **Telnyx, Meta y SES de verdad:** `TELNYX_FROM`, `WHATSAPP_WABA_ID` y `CORREO_SNS_TEMA` (no son secretos) más las llaves; el tema de SNS
      suscrito a `/api/correo/entrada` (la suscripción se confirma sola) y la regla de recepción de SES con la dirección de Soporte; probar una vez cada
      camino con un teléfono y un correo reales. (9l, 14 nov)
- [ ] **→ 9q** · **Mandar las 8 plantillas de WhatsApp a Meta** con la cuenta real (Notificaciones › Plantillas de WhatsApp) y corregir las que rechace. (9l, 14 nov)
- [ ] **→ 9q** · **Los códigos de error permanentes de Telnyx** (hoy: 40300, 40310, 40311) y **el costo por SMS** en Notificaciones (el campo `cost` del aviso de
      entrega): confirmarlos con la cuenta. (9l, 14 nov)
- [ ] **→ 9q** · **Una sola respuesta de STOP:** al conectar Telnyx y Meta, apagar la de su perfil (o la nuestra en Configuración › Avisos y canales). (9l, 14 nov)
- [x] **→ 9n** · **Avisos al quitar a alguien del equipo y a quien pidió unirse:** van con aceptar la invitación con el código (L101). (9l, 14 nov) — **✓ 9n-2 (14 nov):** al quitar (equipo_quitado), al aceptar o no a quien pidió unirse (equipo_unirse_ok/no), al dueño cuando alguien acepta (biz_equipo_acepto) o pide unirse (biz_equipo_pide). pan9n2 §1.
- [x] **→ 9b** · **avi9l y alreves9l en la corrida dirigida del CI** (perfil completo de servir.sh: el certificado de «SNS» lo sirve la prueba en :4409); la
      regresión entera, la matriz de 9 dispositivos y `pruebas/visual` (Notificaciones y Soporte suman pestañas) no corrieron aquí. (9l, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [x] **→ 9b** · **alreves8c, caso `permisosMinimos`:** no encuentra su texto en apps/mobile/apps.json (también en la rama base; no es de 9l). (9l, 14 nov)

## Fase 9 · 9m — lo diferido del vecino que entra antes de abrir (14 nov) — **✓ (comprobado 15 nov):** `alreves8c` 37/37.
- [x] **Cerradas con su evidencia** (marcadas «✓ 9m» arriba): onboarding pasos 3–5 y Fundadores, Inicio completo con el mini mapa, Pronto y «En construcción»,
      mapa por recuadro y mini mapas propios, chips en dos líneas, «Cómo llegar» a la app de mapas, voz con su aviso e interruptor, «¿Es tu negocio?», AuthSheet
      bilingüe con errores, alergias en la hoja del plato, «Lo que más mencionan», reportar novedad y vacante, «Avísame de nuevas vacantes» y vacantes en Buscar,
      Mis solicitudes (ya estaba), alertas con «Quitar», retiros de NHTSA, buscar casa o carro, Mensajes en vivo (SSE propio) y tapados, Pagos y movimientos,
      Mis boletos guarda todos los próximos, sesiones con «Este iPhone · To'Latino 1.0 (12)». Direcciones como DoorDash/Uber (decisión AC): autocompletar propio
      ≤ 100 ms, «Usar mi ubicación», pin ajustable, Mis direcciones, checkout, Publica, panel y Super Admin. Pruebas: `dir9m` y `vec9m` dos veces seguidas en
      local; `alreves9m`; `pruebas/infra/direcciones.test.sh`; la medida nacional `scripts/carga/direcciones-1m.mjs`. (9m, 14 nov)
- [ ] **→ 9t** · **Direcciones de todo EE. UU. en producción:** `infra/produccion/deploy.sh` corre `generar.sh` con `ESTADOS=todos PARALELO=4` en su volumen
      (≈ 80 GB: ADDRFEAT ≈ 11 GB y OpenAddresses ≈ 15–20 GB de descarga; 8–12 h la primera vez; refresco cada 90 días). Antes: un servidor con ese disco y
      **las URLs de OpenAddresses en `infra/direcciones/fuentes-oa.txt`** (hoy vacío: aquí la red no llega a openaddresses.io para verificarlas; sin ellas
      la precisión es la del rango de TIGER, interpolada). (9m, 14 nov)
- [ ] **→ 9t** · **Mapa base de todo EE. UU.:** `MAPA_REGION=us bash infra/mapa/generar.sh` genera `us.mbtiles` (≈ 20 GB, ≥ 32 GB de RAM, 1–2 h); el
      servidor de teselas de producción sigue leyendo `pennsylvania.mbtiles` hasta que su compose apunte a `us.mbtiles` (fuera de Pensilvania el mapa sale
      sin calles; la dirección y su punto sí funcionan). (9m, 14 nov)
- [ ] **→ 9b** · **Cargas reales en el sandbox y en CI:** TIGER de Pensilvania con la muestra de CA/TX/NY (workflow «Direcciones», ampliado con
      `dir_sugerir`, `dir_inversa` y ≤ 100 ms) y la primera carga de NHTSA en `tolatino-pruebas-1` (paso de 3 h de `deploy.sh`); aquí la red no llega a
      census.gov ni a nhtsa.gov: se probó con archivos del mismo formato (`pruebas/infra/direcciones-espejo.py`, 19/19). (9m, 14 nov)
- [x] **→ 9b** · **`dir9m`, `vec9m` y `alreves9m` en la corrida dirigida del CI;** la regresión entera, la matriz de 9 dispositivos y `pruebas/visual` no
      corrieron aquí. Cambian capturas: el Inicio de escritorio (mini mapa a la derecha), la ficha (mini mapa en «Cómo llegar», «¿Es tu negocio?»), las
      tarjetas con chips largos (dos líneas), la vacante (reportar), Mensajes (sin cambios visibles). (9m, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.


## Fase 9 · 9n — lo diferido del negocio, el Repartidor y la operación del Super Admin (14 nov)
_Hecho en esta pasada (cada línea de arriba marcada «✓ 9n»): prueba de entrega, código de recogida, oferta con cuenta regresiva, «Llamar al cliente» → escribirle en
la app, ADM-DLV, colas (atajos, lote, asignar, «tomado» que vence, plazos en Configuración, visibilidad en la base, feriados del equipo), la foto en la evidencia de
la disputa, feriados / vacaciones / días propios / temporada, Lo que te avisamos y los grupos cancelados de Educación editables. Las líneas «→ 9n» que siguen abiertas
arriba NO entraron en esta pasada (era el bloque más grande de la fase): siguen con su destino 9n y su texto original; lo nuevo, aquí._
- [x] **→ 9n** · **Lo que no entró en esta pasada de 9n (sigue abierto con su línea de arriba):** aceptar una invitación al equipo `/e/{código}` y sus avisos (L101,
      L1741), horario por módulo (L117), repetir una novedad y avisar a los seguidores, pedidos desde una novedad, fotos de la galería (L297–L301), «quiere
      arreglarlo» y editar la respuesta (L287), pedido programado que cruza la medianoche (L248), historial de no-show (L259), «Si no contestas en 10 min» y «Siempre,
      al instante» (L1048), bandeja de SMS del negocio (L1108), validar un cupón desde Hoy (L660), avisos del organizador por la auto-moderación (L831), el mercado
      (L473–476), garantía a $0 (L446), reponer con un pedido de $0 (L327), Reclamos y Duplicados (L171), filtros y CSV (L149), Usuarios 360° Actividad/Dinero/Comunidad
      (L180), apelar desde «Entrar» (L623), Catálogo (L197, L199), el resto de Configuración en solo lectura (L453…L939, L548), condiciones de los rangos (L653), cupo
      del RSVP (L941), Panel › Eventos con cursor (L952), acciones del 360° (L136), «Resolver» con el borrador del copiloto (L1075), selector de ciudad del encabezado
      (L42), interruptores por ciudad y reinicio del autenticador (9j), 3-D Secure en los demás flujos, «Volver a Pro» en el panel y la tarjeta 0002 del estimado
      (9k), «Free con N ítems» e insignia Fundadores (9h), vistas sin repetidos en el panel (9g). Motivo: no cabían con el cuidado que piden (dinero, permisos) en la
      misma pasada que el Repartidor y las colas; ninguna pantalla quedó a medias. (9n, 14 nov) — **✓ (17 nov, auditada):** cada partida de esta lista tiene su propia línea y está cerrada allí (comprobado una por una). Lo de 9n que sigue abierto va en sus líneas: Staff de la ficha, «Quién tiene licencia aquí», Catálogo (mover/fusionar, plantillas), insignia Fundadores y bandeja de SMS del negocio (esperan diseño); modo solo lectura del equipo y depósito extra del evento privado (esperan decisión); vistas sin repetidos (flag apagado, espera OK con capturas); envío del mercado con el Repartidor (en curso).
- [x] **→ 9n** · **Configuración: lo que sigue en solo lectura** (sp_seguro_guardar_h, sp_total_escrito_dias, sp_notas_purga_dias, ayuda_negocio_h, noche_*, insc_responder_h,
      insc_oferta_h, insc_baja_h, ninos_purga_dias, fe_responder_h, vis_*, evt_pago_dia, compa_auto_espera_min): cada uno pasa a editable cuando TODOS sus textos lean
      el valor (como hizo 9n con insc_grupos_n / insc_grupos_dias en Colas, `textoCola`). pagos_banco_dia queda fijo por decisión. (9n, 14 nov) — _(9n-3, 14 nov): Noche salió; el resto sigue en solo lectura porque sus textos dicen el número escrito en muchos sitios: sp_* y ayuda_negocio_h (Estado de la cita, Consulta, Trámite y Panel › Citas), insc_*/ninos_purga_dias/fe_responder_h/vis_* (Inscribirme, InscEstado, paneles de Inscripciones y Visitas, y `interval '48 hours'` escrito en lib/inscripciones.ts), evt_pago_dia (panel de Eventos y Cobros, Publica tu evento y la ayuda: «el martes»), compa_auto_espera_min (aún no existe «Si no contestas en 10 min»). Cada uno se abre cuando TODOS sus textos leen el valor; los de panel chocan con el bloque del panel (0146), por eso no se tocaron._ — **✓ (comprobado 15 nov):** en la base solo `pagos_banco_dia` queda `editable = false` (fijo por decisión); los demás se abrieron en 9n-5 (0149) y 9n-6 (0150) con sus textos leyendo el valor.
- [x] **→ 9n** · **Repartidor: asignación automática y pedidos programados con recordatorio** (la oferta con cuenta regresiva ya está; los lotes son «después de abrir»,
      §6 #21). (9n, 14 nov) — **✓ 9n-4 (14 nov):** «Ofrecer solo a los repartidores» (Panel › Entrega, apagado de fábrica): la oferta de 9n sin que nadie la mande, hasta rep_auto_intentos (3) y un aviso «Nadie tomó el pedido» una vez; los programados se ofrecen y se recuerdan (al negocio y al repartidor) rep_programado_min (30) antes de estar listos. lib/repartidor-auto.ts; guardián repartoSolo; din9n4 G3.
- [x] **→ 9n** · **La temporada en las citas** (hoy la ficha y el estado abierto/cerrado la miran;
      el calendario de citas todavía ofrece días fuera de temporada si el horario de la semana los tiene abiertos). (9n, 14 nov) — _(9n-3, 14 nov): el tope de 200 de Colas ya no existe: de a 50 por página, conteos y «Vencidos» desde la base (prueba `adm9n3` paso 3; guardián `colasSinTope`). Queda la temporada en el calendario de citas._ — **✓ 9n-10 (15 nov):** y su clase: TODOS los calendarios a futuro (citas, reservaciones, pedidos programados de hoy, Noche, apartados, rentas, mercado, planes, entrevistas y visitas) leen feriados, vacaciones, días con otras horas, cierre temporal y temporada con `lib/dias-especiales.ts` (o `negocio_dia_cerrado`, **0160**, en SQL). Guardián `calendarioConDiasEspeciales`; cit3b §6a (temporada). Las visitas armadas en SQL respetan los días cerrados; un día especial con otras horas usa todavía el horario de la semana ahí (LAUNCH abajo).
- [x] **→ 9n** · **Colas: tope de 200 casos por vista:** — **✓ 9n-3 (14 nov):** paginado de a 50, conteos y filtros en la base; `adm9n3` con 279 casos abiertos.
- [x] **→ 9b** · **neg9n y alreves9n en la corrida dirigida del CI** (perfil completo de servir.sh: el almacén de fotos es Garage); la regresión entera, la matriz de 9
      dispositivos y `pruebas/visual` (Panel › Entrega y Horario, el detalle del pedido y el Repartidor suman bloques: cambian sus capturas aprobadas) no corrieron aquí.
      rep2l/app8e/ruta8e no cambian de flujo (prueba y código apagados de fábrica) pero el detalle del Repartidor ya no tiene «Llamar» al cliente. (9n, 14 nov) — **✓ (15 nov):** la confirmación completa del CI 43759335047 (3f99c21: todas las fases, al revés, 9 dispositivos con axe y velocidad, seguridad, build) salió en verde; está en main y en pruebas.
- [x] **→ 9b** · **Íconos que no existen en el sistema:** `"camera"` en app/(app)/n/[id]/Resenas.tsx (de antes de 9n; 9n usaba el mismo y lo cambió a `image`) sale como
      un cuadro vacío. Un guardián que compare cada `icon: "…"` con el mapa de packages/ui/src/ds/core/Icon.js. (9n, 14 nov) — **✓ 9c (15 nov):** «camera» → «image»; con el guardián nuevo **`iconoExiste`** salieron otros cuatro («undo» en Hoy del Super Admin, «download» en Integraciones, «chevronUp» en el panel, «receipt» en el buscador): corregidos; alreves9c.
- [x] **→ 9b** · **alreves8e, caso `permisosMinimos`:** no encuentra su texto en apps/mobile/apps.json (igual que alreves8c; de antes de 9n). (9n, 14 nov) — **✓ (15 nov):** alreves8e y alreves8c pasan enteros (rc 0) con el apps.json de hoy; el ancla ya coincide.

- [x] **→ 9n** · **Visitas (Bienes Raíces y dealer) con las horas de un día especial:** hoy respetan los días cerrados y la temporada (negocio_dia_cerrado, 0160), pero un día especial con OTRAS horas ofrece las de la semana (las horas se arman en SQL). (9n-10, 15 nov) — **✓ (9n-14, 15 nov):** `negocio_rangos_dia` (**0164**) da las horas de cada fecha (cerrado, temporada, día especial con horas propias o la semana) y las visitas (horas y plazo de respuesta) la usan; guardián `calendarioConDiasEspeciales` ampliado (al revés 48/48); vis4ie §10b.
- [x] **→ 9n** · **Lo que no entró en 9n-3 (sigue abierto con su línea de arriba):** Negocios › pestañas Reclamos y Duplicados e «Invitar a reclamar»; Mensaje al dueño, Destacar 7 días y demás acciones del 360° que dependen del panel; pestañas Actividad, Dinero y Comunidad de Usuarios y sus KPI; Catálogo (subcategoría nueva en Publica, mover/fusionar, renombrar, plantillas de horario, placeholders); condiciones de los rangos editables (5f); apelar una suspensión desde «Entrar» (5d); Licencias de las demás categorías en la cola (4ig); «Resolver» / «Resolver y devolver» con el texto del borrador (7g); segmento «Free con N ítems» e insignia Fundadores en la página (9h). No entraron por tiempo de esta pasada, no por una cuenta externa. (9n-3, 14 nov) — **✓ (17 nov, auditada):** cada partida de esta lista tiene su propia línea y está cerrada allí (comprobado una por una). Lo de 9n que sigue abierto va en sus líneas: Staff de la ficha, «Quién tiene licencia aquí», Catálogo (mover/fusionar, plantillas), insignia Fundadores y bandeja de SMS del negocio (esperan diseño); modo solo lectura del equipo y depósito extra del evento privado (esperan decisión); vistas sin repetidos (flag apagado, espera OK con capturas); envío del mercado con el Repartidor (en curso).
## C-005 → C-008 — Ficha nueva del negocio (16 nov)
- [x] **→ 9n** · **Precio anterior tachado en el menú «C» (C-008, «Datos nuevos»):** hecho el 16 nov para **Comida**, sin campo nuevo: el tachado es
      el precio de siempre del plato (`items.price_cents`) cuando una oferta en vivo de Novedades lo baja (`lib/pedir.ts` → `was`; MenuTile y
      MenuItemRow; «Antes» para el lector de pantalla). El negocio no escribe ningún «precio anterior» (descuento falso imposible: guardián
      `precioAntesReal`, alrevesC005 17/17; e2e fic008 1b). Panel y Super Admin: se gestiona desde la oferta en Novedades, como siempre.
- [x] **→ 9n** · **Tachado en Mercado y Tienda:** sus productos no tienen ofertas (Novedades solo enlaza platos de Comida y el cobro de mercado y
      apartado lee `price_cents` sin oferta). Cuando haya ofertas de productos, el tachado sale igual que en Comida. Hoy no se muestra (no se inventa).
      — **✓ (18 nov):** Panel › Novedades › Oferta elige un producto del catálogo (por libra, la oferta es por libra; lo de 21+ no entra: editor,
      servidor y base, **0178**); la ficha del mercado y la Tienda muestran el tachado como Comida y el pedido del mercado (y su sustituto) y el
      apartado cobran `oferta_precio()`. Guardián `ofertaProductoDelServidor` (alrevesOfe9n 15/15); e2e `ofe9n`.
- [ ] **→ 9n** · **Ficha Free nueva (C-007):** el canvas dice que la versión Free no está decidida; los Free siguen con la ficha de siempre.
## C-002 — Página de categoría + Patrocinados (17 nov)
- [x] **→ 9n** · **Patrocinio: devolver lo que no se usó.** Hoy «Terminar antes» y «Cancelar reserva» no devuelven nada (lo dice la pantalla) y el Super
      Admin termina sin devolver (Soporte lo hace a mano). Si Henry prefiere devolver la parte no usada (o toda la reserva que no empezó), va por
      `pasarela.devolver` con su fila en el libro (sponsorship_payments solo inserción: una fila de devolución) y la conciliación la lee. — **✓ (17 nov):**
      **0175**: la base decide cuánto al terminar (`patrocinio_devolucion`: reserva que no empezó = todo; terminar antes de tiempo = días enteros sin
      usar en proporción) y lo escribe una vez en el patrocinio; `devolverPatrocinio` va por `pasarela.devolver` (llave `pat-dev-…`, una por patrocinio)
      y deja UNA fila 'devolucion' en el libro (índice único, nunca más que lo cobrado, solo inserción), la auditoría y el aviso ES/EN; el barrido la
      reintenta (`devolverPendientes`); la conciliación lee las devoluciones. «Cancelar reserva» devuelve todo; Super Admin › Terminar con «Devolver lo
      que no se usó · $X» (marcado de entrada) o «No devolver»; «Terminar antes» de uno activo sigue sin devolver (REVISION). Guardián
      `patrocinioDelServidor` ampliado (alrevesC002 41/41); pat002 86 ✓.
- [x] **→ 9n** · **Patrocinio con 3-D Secure:** si el banco pide confirmar al comprar, hoy se suelta el intento y se pide otra tarjeta. Falta la hoja del
      banco (useVerificacion, como «Volver a Pro») y, en la renovación sola, el enlace para confirmar (hoy termina y avisa). — **✓ (17 nov):** la compra
      en sesión se retiene con la verificación a nombre de quien paga; el panel abre la hoja del banco (`c.ver` = useVerificacion) y vuelve a mandar lo
      mismo con la misma clave; se captura al guardar el patrocinio (si algo falla, se suelta). La renovación sola termina y su aviso lleva al panel
      para comprar otro y confirmarlo ahí (no hay página «confirmar para renovar»: al confirmar habría que volver a revisar el puesto; REVISION).
      pat002 §6 (3184: «No fui yo» no cobra; confirmar = un cobro).
- [x] **→ 9n** · **Patrocinio de eventos (C-003):** — **✓ C-003 (17 nov):** 0174 (`event_sponsorships`), Panel › Eventos › Patrocinar, la vitrina de Eventos y el grupo Eventos del Super Admin. Antes: la tabla del libro (`sponsorship_payments.kind`), las cifras y `entroPatrocinado` ya aceptan «evento»;
      falta 0174 (`event_sponsorships`) y sus pantallas.
- [ ] **→ 9n** · **Comida sin «Tipo de lugar»:** el diseño D dibuja la pestaña «TIPO DE LUGAR»; las pestañas salen de las filas del Catálogo y Comida solo
      tiene «Por país» y los antojos. Agregar la fila en Super Admin › Catálogo (contenido; no es código) si Henry la quiere.
- [ ] **→ 9b** · **C-002 en la corrida completa:** en local (Chromium) pasaron pat002 (55 ✓), cat1m, fie4u, mapa y an1n. No llegan a la página de
      categoría en local, por cosas de antes de C-002: noc4a (la fila «anoche» depende de la hora del día: falla en su paso 1), adm4ig (la base local no
      deriva «sinssn» de rentas-hazleton-latino en su punto de partida), rec1j y vid001 (subir fotos o video: sin almacén de medios local, 503), fic4id
      (ver la línea de abajo) y com5c (Comunidad › «CONVERSACIÓN», paso 5; su parte de /c/comida pasó). Lo de la categoría que esas pruebas miran
      se comprobó a mano: «Se acabó por hoy» y el cover de esta noche salen en la caja HOY. Safari/iPad, la matriz de 9 dispositivos y estas
      pruebas van en la corrida completa al terminar C-003. Las capturas aprobadas de `pruebas/visual` de la página de categoría cambian (diseño D).
- [x] **Privacidad (falsa alarma, revisado 17 nov):** en local, fic4id vio «857 N Laurel St» en el HTML de cuartos-dona-mary. Viene de la
      información de depuración que React solo manda con `next dev` (`env`, `stack`, `owner` con los datos internos del componente); el build
      de producción no la manda y fic4id pasa en CI (regresión completa). La ficha ya devuelve `direccion: null` cuando el negocio trabaja desde casa.
- [x] **→ 9n** · **Vistas del patrocinio sin el equipo del negocio:** «entraron» ya no cuenta al dueño ni a su equipo; las vistas sí (la fila se cuenta
      al mostrarse, sin mirar quién es miembro, para no sumar una consulta por página). Si molesta, se excluye en `patrocinio_vistas`. — **✓ (17 nov):**
      `patrocinio_vistas` (0175) descuenta al dueño y su equipo con un solo `not exists` sobre business_members en la misma consulta de la tanda (sin
      N+1; el guardián lo vigila). pat002 y pat003: el dueño mira su vitrina y no suma.
## C-003 — Página de Eventos por días + Patrocinados de eventos (17 nov)
- [ ] **→ 9n** · **Caritas de quién va en la tarjeta del evento:** el diseño las dibuja; hoy la tarjeta dice «N VAN». Mostrar caras de quien hizo
      RSVP o compró es un dato personal: falta decidir el permiso (por ejemplo, solo amigos o quien activó «mostrar que voy»).
- [x] **→ 9n** · **Patrocinio de evento: devolver lo que no se usó** si el evento se cancela (hoy termina solo, avisa y no devuelve; Soporte a mano).
      Igual que C-002: `pasarela.devolver` con su fila en `sponsorship_payments`. — **✓ (17 nov):** el barrido termina el de un evento cancelado con
      'sin_usar' (la pausa no cuenta como usada) y devuelve por la misma caja que C-002; el aviso de evento cancelado ya no manda a Soporte.
      Reserva cancelada y Super Admin › Terminar, como en C-002. pat003 §6–8.
- [x] **→ 9n** · **Patrocinio de evento con 3-D Secure:** misma pieza pendiente que C-002 (hoy pide otra tarjeta). — **✓ (17 nov):** la misma hoja del
      banco en Eventos › Patrocinar. pat003 §9.
- [x] **→ 9n** · **Evento oculto / módulo apagado con patrocinio vivo:** no sale en la vitrina pero el patrocinio sigue corriendo; decidir si se pausa
      y se alarga, o se termina solo. — **✓ (17 nov):** se pausa (decisión AB: lo reversible; REVISION). 0175: `paused_at`/`paused_secs`/
      `extended_secs`; el barrido pausa lo de un evento sin fecha visible que sigue por venir, no lo vence, y al volver lo sigue alargado lo que duró
      la pausa si cabe (puestos con candado, siguiente patrocinio del evento, fin del evento; la base lo revisa al mover el fin); lo que no cupo se
      devuelve al terminar. La vitrina, las vistas y «entraron» no cuentan lo pausado; EN PAUSA en el panel y en el Super Admin; avisos ES/EN.
      Guardián `patrocinioEventoDelServidor` ampliado (alrevesC003 41/41); pat003 §8 (pat003 entera 101 ✓ en local).
- [ ] **→ 9b** · **0175 (devoluciones, 3-D Secure, pausa) en la corrida completa:** en local (Chromium, `next dev`) pasaron pat002 (86 ✓), pat003
      (101 ✓), alrevesC002 (41/41), alrevesC003 (41/41), tipos y guardianes. Falta la confirmación completa del CI (Safari/iPad, 9 dispositivos,
      `pruebas/visual`: la hoja del banco del patrocinio y EN PAUSA son pantallas nuevas sin captura aprobada) y la prueba de contrato contra
      Stripe de verdad (`/v1/refunds` con `payment_intent` de un cobro de la plataforma, y la retención con 3-D Secure + captura) en el sandbox con llave.
      (17 nov)
- [ ] **→ 9b** · **C-003 en la corrida completa:** en local (Chromium, `next dev`) pasaron pat003 (66 ✓), pat002 (55 ✓), alrevesC003 (28/28) y
      alrevesC002 (20/20). evt6b-6c y evt6f se pasaron al calendario: sus partes de /eventos pasaron (evt6b-6c 68 ✓, evt6f 43 ✓), pero ninguna de las
      dos llegó al final en local por cosas de fuera de C-003: publicar desde el editor pide subir el cartel (sin almacén de medios local, 503),
      y el servidor de desarrollo se reinició por memoria o tardó más de 30 s en compilar /admin/eventos/{id}. Van enteras en la corrida completa
      con Safari/iPad y los 9 dispositivos; `pruebas/visual` no tiene capturas aprobadas de Eventos.
- [x] **→ 9b** · **Anchos (4), después de C-001 → C-003 (CI 43996571745):** — **✓ (17 nov):** arreglados en las pruebas (esperas de Safari, copias escondidas del iPad, UA de iOS) y en vivo (vec9m: el panel se pone al día al conectarse); CI 44028911097 + 44045893242 + 44051353861 en verde en los tres anchos. Solo queda dir9m en el iPad (línea de abajo). escritorio 1024 sin rojos propios; Safari falla en iPhone SE
      (silla3d, app8a, inm4ib, noc4d, pan9n2) y en iPad (silla3d, app8a, app8e, ayu4z, tra4y, dir9m). silla3d, app8a y dir9m ya venían de antes;
      los demás son nuevos en esta corrida y hay que ver uno por uno si son de la prueba (esperas de Safari) o de la pantalla.
- [ ] **→ 9b** · **dir9m en el iPad (WebKit), Anchos (4):** el ratón de las pruebas no arrastra el mapa del pin en el iPad (sí en el SE y en
      Chromium a tamaño iPad: ahí pasa todo, «muy lejos» incluido) y, moviéndolo con las flechas, el pin se ve movido pero al guardar llega sin
      pin (el servidor guarda el punto de la dirección). Mirarlo en un iPad real (REVISION · «Pin en el iPad»): si pasa con el dedo, es la
      prueba; si no, es la pantalla. La prueba ya usa el mapa VISIBLE (había dos copias) y dice dónde quedó.
- [x] **→ 9b** · **merc9n en Safari (SE e iPad), Anchos (6):** — **✓ 18 nov:** en la web, si el GPS se calla dos intervalos, el repartidor pide una lectura fresca (`lib/nativo/ruta.ts`); merc9n en verde en el SE y el iPad (CI 44229046199). Queda mirarlo en un iPhone real (REVISION). la ubicación del repartidor en el envío del mercado. En el WebKit de las pruebas la página
      manda UNA lectura (de hace 31 s, después de empezar la ruta) que la base rechaza (`rejected_n = 1`) y después el emulador no da más lecturas
      aunque la prueba mueve el GPS cada 2 s; en Chromium pasa y en app8e (repartidor de comida) Safari sí sube posiciones. Diagnóstico en la salida
      de merc9n («· la página … · envíos … · pista»). Se mira a mano en un iPhone de verdad (REVISION «Ubicación del repartidor en el iPhone»).
- [x] **→ 9n** · **Auditoría en la misma transacción que el cambio (acciones del panel):** `app/panel/acciones-puerta.ts` (y otras acciones del panel)
      guardan el cambio y DESPUÉS escriben la auditoría en otra consulta: si la segunda falla, el cambio queda sin su renglón. evt6g lo cazó como
      carrera (17 nov). Revisar la clase (acciones del panel que tocan permisos, dinero o reglas) y pasar la auditoría a la misma transacción, con
      su guardián. **Hecho (18 nov):** los 19 acciones-*.ts del panel con auditoría suelta (104 acciones) dejan su renglón con el cliente de la
      transacción del cambio: tx() en la acción, `enTx`/cliente para lib simple (puerta) y `alGuardar`/`txAuditada` (lib/db.ts) cuando lib cobra,
      devuelve o avisa fuera de la base; también lib (pedir reseña, patrocinios con `null`, barrido de colas) y el simulador de Cobros. Guardián
      `auditoriaEnLaTransaccion` (alreves9n22 10/10). Payloads iguales salvo `eventos.cancelar`/`eventos.fecha.cancelar`: `por_devolver` en vez de
      `devueltas`/`pendientes` (las devoluciones corren después en lotes; su avance está en `event_cancellations`).
- [x] **→ 9t** · **Botones que no caben a 320 px o con letra grande (fuera de la ficha):** la revisión local del 19 nov (pruebas/lib/caben.cjs contra
      Inicio, Negocios, Buscar, Eventos, Comunidad, Ciudad, Entrar) vio, solo a 320 o con letra grande en 320: el campo «Buscar en Hazleton» del
      encabezado (142 px en 130), tarjetas del riel de Inicio que pasan su caja por 7–40 px, «Entrar con mi teléfono» (251 en 244) y una fila de
      Buscar. A 375 y 390 con letra normal, nada. Pasar `botonesQueNoCaben` a esas pantallas a 320 en la corrida de anchos y acomodarlas. (19 nov) — _19 nov (después): con las filas de Buscar que se encogen (grid minmax(0,1fr)) y el área de toque, la misma revisión (botón contra su caja, sin contar los rieles que se desplazan) en Inicio, Negocios, Buscar, Eventos, Comunidad, Ciudad, Entrar, dos fichas y Mi cuenta, a 320/375/390 con letra normal y grande: ninguno se sale y ninguna página se mueve de lado. Lo de antes eran falsos (el logo y enlaces medidos por scrollWidth) y la fila de Buscar (arreglada). bus9t y fic005 lo siguen mirando._


## Confirmación del 20 nov (44734711575) — lo que quedó anotado
- [ ] **→ 9t** · **La foto que llega vacía desde WebKit (causa de fondo):** el iPhone SE del CI mandó una foto normal y el servidor contestó «No
      llegó la foto» (400). Mitigado (la app reintenta una vez con la original, `subidaReintenta`) y el servidor registra qué recibió
      (`[subida] sin archivo: …`). Falta la causa: leer ese registro en la próxima corrida que lo repita y la prueba del fundador desde un
      iPhone de verdad en el sandbox (REVISION). Si es solo del WebKit de pruebas, se anota y se cierra. (20 nov)
- [x] **→ 9t** · **Auditoría en otra transacción (misma clase que `evtCancelarAdmin`, ya arreglada):** `devolverTx`, `conciliarOtraVez` y
      `app/admin/acciones-planes.ts` escriben su renglón de auditoría aparte, después del cambio. Pasarlos a la transacción del cambio y
      extender `auditoriaDelAdminConElCambio`. (20 nov)
      **Hecho (20 nov):** cada acción le pasa su auditoría (`alGuardar`) a la función de lib, que la escribe en la transacción que anota el
      cambio en la base; la pasarela va antes y fuera. `devolverTx` → `devolverOperacion` → `devolverPago`: un renglón por cada cobro devuelto,
      con el insert de `refunds` (un reintento no re-audita lo ya devuelto). `conciliarOtraVez` → `conciliarDia`: con la corrida
      (`after.corrida`). Planes: `extenderPrueba`, `darCortesia`, `quitarCortesia`, `anularSuscripcion` (con `canceled_admin`) y
      `reintentarCobro` (la decisión y su auditoría en UNA transacción antes de cobrar: ahora queda auditado aunque el banco rechace). Por clase,
      también Colas › Ayuda con monto (`decidirSop`: el dinero que sale queda como `transacciones.devolver` con la devolución) y Colas ›
      Disputas (`responderDisputa`/`aceptarDisputa`: sus dos escrituras sueltas pasan a una transacción con la auditoría; antes se saltaba en
      silencio si el caso ya no estaba abierto). Guardián `auditoriaDelAdminConElCambio` extendido; 18 casos nuevos en `alreves9tcarrera`;
      `din9k` exige un renglón «conciliacion.correr» de la corrida sin esperar.
- [x] **→ 9t** · **Devolución: la pasarela antes que cualquier renglón en la base** (`lib/cobros.ts › devolverPago`): si el proceso muere entre
      el «sí» de Stripe y la transacción, el dinero salió sin `refunds` ni auditoría hasta que alguien repita con la MISMA llave (la pantalla
      puede generar otra) o la conciliación lo marque (devolución que falta en el libro). Arreglo de verdad: dos pasos como los boletos (6d),
      `refunds` «pending» con la auditoría en la base ANTES de llamar a Stripe y cerrar en otra transacción; toca a todos los que llaman a
      `devolverPago`. (20 nov)
      **Hecho (21 nov):** `devolverPago` = `anotarDevolucionPago` (con el cobro bloqueado: la fila 'pending' con su llave, el tope de la base y la
      auditoría de quien decide, en una transacción) + `ejecutarDevolucionPago` (la pasarela con la MISMA llave; el «sí» se cierra en otra
      transacción, una vez: `where status = 'pending'`; un «no» la deja 'failed' con su saldo y su llave libres —la fila guarda la original con
      «~fallida-<id>»—; sin respuesta sigue 'pending' y la acción dice «en camino»). `barrerDevolucionesPago` (barrido central) termina las
      pendientes con su llave mientras Stripe la recuerda (23 h) y después alerta (`refund_stuck`) para resolverla a mano; un «no» en el barrido
      también alerta. Otra devolución del mismo cobro con otra llave espera a que termine la que va en camino. El cierre toma lo devuelto del
      libro (`greatest` con la suma de lo hecho): si el webhook `charge.refunded` llegó antes, no se cuenta dos veces. Hacia fuera, los que llaman
      siguen igual (`{ ok }`/`{ ok: false, msg }`, más `enCamino`); Soporte no da por fallida una devolución en camino y la ayuda de la cita no
      reabre la solicitud. Sin migración. Guardián `devolucionEnDosPasos` (al revés `alreves9tdinero`); prueba `din9t` (base + pasarela de mentira).
- [x] **→ 9t** · **Colas › Ayuda con monto (`decidirSop`): devolución y cierre del caso en dos transacciones.** Si el caso ya se decidió en
      otra pestaña, el dinero sale (ya auditado) pero `help_requests.refunded_cents` no lo suma y la acción dice «Este caso ya se decidió».
      Pasarlo al patrón de `support_refunds` (intención con su llave antes de Stripe, cierre después). (20 nov)
      **Hecho (21 nov):** tres pasos. (1) Con el caso bloqueado y abierto: la devolución 'pending' con la llave DEL CASO (`sop-q<caso>`, no la del
      toque) y «transacciones.devolver», en una transacción; (2) la pasarela; (3) con el caso bloqueado otra vez, el cierre suma lo que de verdad
      salió (la devolución del caso, hecha), una vez. Dos pestañas a la vez: una devolución; la otra «Este caso ya se decidió». Si el proceso muere
      entre (1) y (3), el barrido termina el dinero y decidir otra vez usa ESA devolución (otro monto se rechaza y dice cuál salió). `din9t` § 2.
- [x] **→ 9t** · **Planes › Anular con cobro fallido:** la auditoría entra con `canceled_admin`, pero el paso a Free (`aFree`) va aparte y
      puede no ocurrir (una verificación del banco que ya pasó completa el período: sigue Pro con «anuló» en la auditoría). Y las ramas
      activa/prueba no miran `rowCount` (en una carrera queda `canceled_admin` sin cambio). Decidir y avisar en la misma acción. (20 nov)
      **Hecho (21 nov):** Anular va con el candado del plan (el del barrido que cobra; si lo tiene otro: «El plan se está procesando…», nada
      cambia), relee la fila y cada rama cambia con su estado en el `where` y mira `rowCount` (si cambió: «El plan cambió mientras tanto», sin
      auditoría). Con cobro fallido, primero la pasarela: si la verificación del banco ya pasó, el período queda pagado y la acción lo dice sin
      anular; si no, Free + `canceled_admin` + `ended` + la auditoría en UNA transacción. Por clase: el candado del plan se tomaba y se soltaba por
      el pool (`db().query`: el desbloqueo podía ir por otra conexión y dejarlo tomado para siempre) → `conCandado` en una conexión, y `procesar`
      relee la fila con el candado; los cambios del dueño (Pasar a Free, Deshacer, Seguir con Pro) con su estado en el `where`. Guardianes
      `estadoEnElWhere` y `candadoEnSuConexion`; `din9t` § 3.
- [x] **→ 9t** · **Disputas: `responderDisputa`/`aceptarDisputa` actualizan `disputes` sin mirar su estado** (`where id = $1`): un webhook que
      cerró la disputa entre la lectura y la escritura queda pisado. Añadir el estado esperado al `where` y decir «ya cambió». (20 nov)
      **Hecho (21 nov):** las dos con el estado esperado en el `where`. Si cambió: no se escribe nada de la disputa, la acción dice «La disputa
      cambió mientras tanto (ahora: …)» y la auditoría entra igual con lo que se mandó a Stripe y el estado que encontró. El webhook de la propia
      acción vale sin pisarlo (responder: ya «en revisión» sin respuesta anotada → se anota la respuesta; aceptar: ya «perdida»). `din9t` § 4.
      **Por clase (21 nov):** lo que no se arregló aquí va en las líneas de abajo («Dinero por clase, 21 nov»).
- [x] **→ 9t** · **Dinero por clase, 21 nov (auditoría de la pasarela antes que la base y de estados sin el anterior en el `where`):**
      (1) `lib/boletos-despues.ts › ejecutarDevolucion` cierra con `refunded_cents = refunded_cents + $2`: si el webhook `charge.refunded` llegó antes
      (lo que pasa cuando el barrido cierra minutos después), el cobro cuenta dos veces lo devuelto (y puede chocar con el `check`). Pasarlo al cierre
      de `cerrarDevolucionPago` (lo devuelto sale del libro). (2) Boletos (`barrerDevolucionesBoletos`, sin tope de tiempo) y patrocinios
      (`devolverPendientes`, 30 días) reintentan con la misma llave más allá de las 24 h en que Stripe la recuerda: si el «sí» se perdió y el
      barrido no corrió en un día, podría devolver dos veces. Tope de 23 h y alerta, como `barrerDevolucionesPago`. (3) Ayuda de la cita
      (`responderAyudaCita`, el negocio devuelve): la devolución va sin la auditoría en su transacción (la del negocio entra después) y, si queda
      en camino, `help_requests.refunded_cents` no la suma cuando el barrido la termina; la llave es la del toque (`ayb-<clave>`). Pasarla a la del
      caso y al patrón de `decidirSop`. (4) Soporte (`resolverYDevolver`): con la devolución en camino, la fila de `support_refunds` queda pendiente
      y el caso abierto hasta que alguien vuelva a tocar (el barrido termina el dinero, no el caso). (5) `pagosPausar` (Negocio 360° › Dinero) llama
      a Stripe antes de anotar: si el proceso muere en medio, Stripe queda en pausa y la base no (repetir lo arregla). (6) `registrarPeriodo`
      (cobro de Pro) pone `status = 'active'` sin mirar el anterior: fuera del candado (Volver a Pro desde Free) podría pisar una cortesía puesta en
      ese segundo. (7) La alerta `refund_stuck` de una devolución que quedó fallida en el barrido ofrece «Resolver a mano», que contesta «Ya no está
      pendiente» (correcto, pero la pantalla debería no ofrecerlo). (8) El webhook no escucha `charge.refund.updated` (una devolución que Stripe da
      por fallida días después). (9) Una disputa que el banco cerró (webhook) deja su caso abierto en Colas. (21 nov)
      **Hecho (21 nov, rama dinero-9t2; migración 0198):** (1) el cierre de boletos toma lo devuelto del libro con `devueltoDelLibro` (la misma
      consulta que `cerrarDevolucionPago`, en lib/cobros): el webhook antes del cierre ya no cuenta dos veces ni choca con el check. (2) `HORAS_LLAVE`
      (23 h) es una sola para todas las devoluciones: `ejecutarDevolucionPago`, `ejecutarDevolucion` (boletos) y `devolverPatrocinio` no llaman a la
      pasarela con una llave más vieja (tampoco un segundo toque de Colas o Soporte); los barridos de boletos y patrocinios reintentan solo dentro de
      ese tiempo y después alertan (`refund_stuck`, una vez). (3) `responderAyudaCita`: la respuesta, la devolución con la llave DEL CASO
      (`ayb-h<solicitud>-p<cobro>`, `anotarDevolucionOperacion`) y la auditoría del negocio en UNA transacción; la pasarela después;
      `help_requests.refunded_cents` lo suma el cierre de cada devolución (`cerrarDelCaso`, en la transacción del 'done'), una vez, la cierre la
      acción o el barrido (también lo aceptado por la persona, `ayc-`). (4) Soporte: la fila de `support_refunds` y la devolución se anotan juntas
      con la auditoría; el cierre de la devolución cierra la fila y el caso (`cerrarCasoDevuelto`: «Te devolvimos», lo devuelto, resuelto, auditoría
      del sistema) una vez; con la devolución en camino, la respuesta queda como nota interna y sale al cerrarse; un «no» deja la fila fallida en la
      misma transacción. (5) `pagosPausar`: la decisión, `payouts_sync_at` y la auditoría antes de Stripe; `aplicarPausaEnStripe` y el barrido
      `sincronizarPausas` piden a Stripe lo que dice la base hasta que coincidan (limpian la marca solo si la decisión no cambió). (6)
      `registrarPeriodo` con el estado leído en el `where` y `rowCount`; si cambió (una cortesía en ese segundo), el cobro queda en el historial sin
      aplicar y alerta `charge_unapplied`; por clase, `aFree` y `fallo` del barrido también con su estado en el `where`. (7) «Resolver a mano» solo
      si la devolución (o reversión) sigue pendiente y Stripe ya la intentó (lo calcula `alertasDinero` del estado de hoy; sin tocar la pantalla).
      (8) El webhook (con su firma) escucha `charge.refund.updated`: la devolución hecha que Stripe da por fallida queda 'failed' una vez, el saldo
      vuelve al cobro desde el libro, la solicitud o el caso restan lo que habían sumado y alerta `refund_failed`. (9) `cerrarDisputa`: con la
      disputa cerrada por el banco, su caso abierto en Colas se cierra en la misma transacción, una vez, con auditoría `disputa.cerrada_banco`
      (quién: «sistema»). Guardianes `llaveSoloUnDia`, `casoSeCierraConSuDevolucion`, `intencionAntesDeStripe`, `alertaSoloConCaminoReal`,
      `webhookDevolucionFallida`, `disputaCierraSuCaso` (y `devolucionEnDosPasos`, `estadoEnElWhere`, `devolucionUnaVez`, `soporteDevolverConTope`
      al día); al revés `alreves9tdinero`; prueba `din9t2` (base + pasarela de mentira + webhook firmado).
- [ ] **→ 9t** · **Dinero por clase, 21 nov · lo que quedó (encontrado al cerrar la línea de arriba):** (a) `lib/evt-liquidacion.ts ›
      repararLiquidaciones` → `pagarUna` (transferencia al organizador) y `ejecutarReversion` reintentan con la MISMA llave sin tope de tiempo: pasadas
      24 h, Stripe podría transferir o revertir dos veces. Tope de 23 h y alerta, como las devoluciones (falta un tipo de alerta para transferencias en
      camino). (b) `lib/suscripcion.ts › cobrarPeriodo` cobra antes de anotar (se apoya en la llave del cobro: si el barrido no vuelve a pasar en 24 h,
      otro intento podría cobrar otra vez); la conciliación lo vería. (c) `refunds_a_mano` (0141) exige `attempts >= 1`: una devolución que murió
      antes de su primer intento y pasó 23 h alerta, pero no se puede «Resolver a mano» (la alerta queda informativa); decidir si la base lo permite.
      (d) Una devolución de boletos que Stripe da por fallida después (charge.refund.updated) deja los boletos 'refunded' y
      `event_cancellations.refunded_cents` sin restar; la alerta lo dice, falta el camino (¿reponer el boleto o devolver otra vez?). (e) Al conectar
      Stripe de verdad, el endpoint del webhook debe suscribirse también a `charge.refund.updated` (hoy no hay lista escrita de eventos en el repo).
      (f) `responderAyudaCita` con un «no» de Stripe vuelve a abrir la solicitud aunque otra parte de esa devolución ya haya salido (lo que salió
      cuenta y no sale dos veces, pero la persona ve la solicitud abierta otra vez). (21 nov)
- [x] **→ 9t** · **Panel: llaves por posición (`step#n`) y doble toque en un «+»:** `packages/ui/src/panel/Bloques.tsx` da a cada bloque una
      llave por su posición: al quitar un paso, el nodo que era «Mensualidad +» pasa a ser «Cuota de inscripción +» (dep4c lo vio; la prueba
      ahora espera la pantalla). Y un doble toque rápido en el mismo «+» pierde un incremento. Llaves estables por bloque y contador que no
      pierda toques; revisar las demás pruebas que tocan «+» seguido. (20 nov)
      **20 nov · hecha la mitad:** la llave de un paso ya es su rótulo (`llavesDeBloques`, guardián `bloquesConLlave` + al revés): al quitarse
      un paso de arriba, el «+» de otro ya no queda bajo el dedo. **Falta:** el doble toque rápido en el mismo «+» cuando ese paso guarda en
      el servidor en cada toque (el segundo toque sale del valor viejo): revisar los ~120 pasos del panel, cuáles guardan en cada toque, y que
      sumen sobre el último valor.
      **Hecho (21 nov):** de los 124 pasos de `apps/web/app`, 67 viven en el estado local de la pantalla (formularios `c.form`/`c.setUi`: React
      pinta entre dos clics, sin fallo) y 57 guardan en el servidor en cada toque. Esos 57 se armaban con `onM/onP` calculados desde el valor
      pintado. Una sola solución: `pasoSrv` (`@tolatino/ui`) + el paso con `srv` en `Bloques.tsx` (`Paso`): se ve y se calcula desde el ÚLTIMO
      valor pedido, el guardado va de uno en uno y, al terminar, lo último pedido; si el servidor dice que no, vuelve al valor del servidor y la
      pantalla muestra el error como ya lo hacía. `c.run` ahora devuelve si se guardó. 55 pasos pasan por `pasoSrv` (Autos, Deporte, Edu, Fe,
      Fiestas, Inmuebles, Ninos, Noche, NocheReservas, Oficios, Retail, SaludPro, Transporte); 2 quedan como estaban (`transFuera`,
      `tallaExistencia`): cada toque es UN ±1 que el servidor suma de forma atómica, N toques suman N. Guardián `pasoQueSuma` (al revés
      `alreves9tpaso`, 9/9); prueba `toque9t` (5 toques seguidos en Deporte › Pase de un día y Mercados › precio por libra, y mira la base).
      Un toque en un tope sin cambio (p. ej. «−» en el mínimo) ya no guarda lo mismo otra vez. El catálogo `cms-cadenas-e2.json` se regeneró
      (solo cuentas de llamadas).
- [ ] **→ 9t** · **Panel: `toque9t` sin correr, y la pareja Desde/Hasta de Ninos:** `toque9t` (5 toques seguidos) se escribió el 21 nov sin
      servidor local (el puerto era de otro dueño): la corre el CI y, si falla, se mira antes de subir. Y «Desde» y «Hasta» (Ninos › Edades)
      guardan el par `edad` completo cada uno: dos toques rápidos, uno en cada paso, todavía pueden pisarse (cada paso suma bien sobre sí
      mismo, no sobre el otro). Lo mismo cualquier par de pasos que guarde el mismo registro entero. (21 nov)
- [ ] **→ 9t** · **`dlv2f4` en el iPad horizontal (WebKit): no pudo tocar «Aceptar» en el detalle del pedido, dos veces seguidas** (corrida
      programada 44778631725, ancho iPad 4/4; ya había pasado el 19 nov). El botón queda abajo, dentro de la hoja que se desplaza (y=967 de
      834); en Chromium con las mismas medidas, agente y toque del iPad el clic llega (probado el 20 nov), así que es de WebKit o de un momento.
      La prueba ahora dice por qué no pudo (tapado, moviéndose, fuera de pantalla) y cuánto se desplazó la hoja: leerlo en la próxima corrida
      de anchos y, si es de la app (la hoja no se desplaza en Safari), arreglar la hoja del detalle del panel. (20 nov)
- [ ] **→ 9t** · **`pro4l2` como requisito no puede tocar «Pasó la consulta» (30 s), dos corridas seguidas:** en la confirmación 44847327303
      dejó a `res4m` INESTABLE (pasó al repetir) y en la programada 44851886841 sobre `main` (ancho iPad 2/4) dejó ROJA a `ayu4m` dos veces.
      Corrida sola en ese mismo carril, `pro4l2` pasa (13 ✓). El botón se ve pero el toque no entra: misma familia que `dlv2f4` («Aceptar» en el
      detalle del panel). Sospecha sin comprobar: los botones del detalle llevan `off: c.pending` y la transición del panel queda pendiente.
      `pruebas/lib/requiere.cjs` ahora dice el motivo que da Playwright (deshabilitado, tapado, moviéndose, fuera de pantalla): leerlo en la
      próxima corrida y arreglar la causa, no la prueba. (21 nov)
- [ ] **→ 9b** · **`evt9t`: /eventos tardó más de 30 s en cargar una vez** (CI repartido 44743122204, parte 3/4, Chromium). Sin causa todavía;
      el CI ahora imprime lo último del servidor cuando algo cae. Mirarlo si se repite. (20 nov)


## Fotos a la medida (decisión AI, 20 nov) — lo que quedó fuera y lo que vio el inventario
- [x] **→ 9t** · _Hecho el 20 nov (decisión AJ: cuatro capas, en el sandbox desde be601ea; plan `docs/diseno/plan/fotos-revision-automatica.md`)._ **Las fotos públicas no pasan por revisión de contenido al subir:** `/api/medios` (portada y galería del negocio, menú, reseñas,
      eventos, novedades, foto de perfil) guarda la foto ya visible; solo las de Mensajes y las de Comunidad pasan por el modelo propio
      (`revisarImagen`). Decidir con el fundador si las públicas también pasan (y qué se hace mientras se revisan) y construirlo. (20 nov)
- [x] **→ 9t** · **La limpieza de las fotos de ayuda a los 90 días no corre:** `purgarFotosAyuda()` (`lib/ayuda-cita.ts`) existe pero nadie la
      llama (el barrido no la tiene) y la ruta promete borrarlas 90 días después de cerrar. Registrarla en el barrido, con su guardián. (20 nov) — **✓ (21 nov, F3):** el barrido la corre (`fotosAyudaPurga`). Borra SOLO la foto privada
      de la ayuda (`privado/a/`: Salud, Pro, Niños, Iglesias, Bienes Raíces y Autos) de una ayuda `resolved` hace más de `sp_fotos_ayuda_dias`;
      sin almacén no hace nada (antes marcaba borrado lo que seguía ahí); el archivo primero y, en la misma transacción, la fila «borrada»
      (status, purged_at, `privado/borrada`) y su renglón en la auditoría (`ayuda.fotos.purga`, system). Guardián `fotosPrivadasConPermiso`;
      prueba de la base `fot9uprivadas` (sin almacén, vieja, reciente, abierta, F3).
- [ ] **→ 9t** · **Fotos a la medida · privadas (F3):** variantes de las fotos de Mensajes, ayuda, entrega y reclamo bajo `privado/…`,
      entregadas por su misma ruta con permiso (`?w=`). Hoy una miniatura del chat baja la foto entera. (20 nov) — _(21 nov, F3): hecho para las
      fotos de destino privado de `/api/medios` (las 10 pantallas: variantes en `privado/o/`, `/api/medios/privada/<id>?w=`). Siguen sin variantes
      las de Mensajes, ayuda de Salud y Pro, entrega y reclamo (sus rutas son otras)._
- [ ] **→ 9t** · **Fotos a la medida · después:** AVIF para los anchos grandes; el color dominante mientras carga (hoy, el fondo neutro del
      sistema); variantes del póster del video del negocio (`/medios/v/…jpg`, que además no está en la regla de caché de Cloudflare). (20 nov)
- [ ] **→ 9t** · **Fotos guardadas como texto fuera de `media`:** `menu_items.photos text[]`, `users.photo_url`, `subcategories.photo_url`,
      `business_members.photo_url`, y `businesses.logo_url` (sin lector: el logo vive en `media`). Unificar o retirar lo que no se usa. Dos
      índices que se pisan en `media` (`media_chat_subidas_idx` y `media_msj_subidas_idx`). (20 nov) — _(21 nov, F3): al GUARDAR, los cinco
      catálogos (Oficios, Servicios, Autos, Bienes Raíces, Renta de artículos) y el Menú ya validan cada foto nueva de `items.photos` contra
      `media` (`lib/fotos-catalogo.ts`). Sigue: que los LECTORES miren `media` (la línea de «Quitar una foto no llega a las copias por TEXTO»)
      y unificar o retirar las columnas de texto._
- [ ] **→ 9t** · **Las rutas de fotos y video cargan el archivo entero en memoria** (12 MB por foto, 120 MB por video) y las privadas se
      entregan sin `Range` ni `ETag`. Medir con carga y, si pesa, pasar a flujo. (20 nov)


## Fotos a la medida — F1 (decisión AI, 20 nov) — lo que quedó anotado
- [ ] **→ 9p** · **Una foto borrada sigue en el borde de Cloudflare:** al borrar una cuenta (o al purgar una foto) se saca del almacén la maestra y
      sus variantes, pero Cloudflare las guarda hasta un año (caché inmutable de `/medios/n/`) y nadie le pide que las suelte. Con la zona y el
      token (Paquete 8-0): pedir a Cloudflare que purgue esas direcciones (maestra + variantes) en el mismo paso, con reintento desde el barrido,
      y su guardián. Hasta entonces, lo borrado puede seguir saliendo a quien tenga la dirección. (revisión de F1, 20 nov)
- [ ] **→ 9u** · **fot9u (punta a punta con Garage) no corrió fuera del CI:** la sesión de F1 no tenía almacén ni docker; corrieron tipos, guardianes,
      alreves9ufotos, fotos9uvariantes (variantesDe y el barrido con dobles) y medios-nginx.test.sh con nginx 1.24 de verdad. Correrla en el CI
      dirigido y en el sandbox con una foto de cámara real (peso de cada variante, antes/después de una tarjeta, una ficha y una galería). (20 nov)
- [ ] **→ 9u** · **WebP y el caché de Cloudflare:** Cloudflare (plan gratis) no separa la caché por Accept. Una variante real guardada en el borde se
      le da también a un navegador sin WebP (Safari 13 o anterior, < 1 %); la maestra que se le da a un navegador sin WebP va «private» y nunca queda
      en el borde. Safari 14–15 no dice image/webp en Accept aunque lo lee: recibe la maestra (se ve bien, pesa más). Si pesa en las cifras: que F2
      pinte con `<picture type="image/webp">` o mirar «Vary for images» de Cloudflare. (20 nov)
- [ ] **→ 9u** · **F2–F4:** pintar con `fotoSrc`/`fotoFondo`/`Foto` (F2), las fotos privadas con `?w=` (F3), el bloque del Super Admin con
      `cifrasFotos()` de lib/fotos-variantes.ts y su ayuda de equipo (F4). Hasta F2 las variantes existen pero ninguna pantalla las pide. (20 nov)

## Revisión automática de las fotos públicas — R1 + R2 (decisión AJ, 20 nov) — lo que quedó anotado
- [ ] **→ 9u** · **Plazo de retención de las fotos rechazadas o retenidas** (`privado/rev/<uuid>.jpg` + su fila en `media`): hoy no se borran
      nunca (estados; nada se borra). Decidir con el fundador cuánto se guardan (y si la apelación cerrada cambia el plazo) y construir la purga
      con su guardián. No se inventó un plazo. (R1, 20 nov)
- [ ] **→ 9u** · **Quitar una foto no llega a las copias por TEXTO de su dirección:** la capa 3 (y el «Quitar» de siempre en «Medios marcados»)
      cambian el estado en `media` (la galería, la ficha y las filas que comparten el archivo: novedades y eventos copiados), pero `items.photos`
      (menú y catálogos: ~15 lectores), `users.photo_url`, `business_members.photo_url` y `businesses.logo_url` guardan la DIRECCIÓN y no miran
      `media`. Antes de AJ la foto quitada seguía viéndose ahí; ahora, con el archivo fuera de `n/`, ahí se ve rota hasta que vuelva. Arreglo de
      fondo: que esos lectores filtren por `media.status = 'visible'` (o que la quita limpie y restaure esas referencias), con su guardián. (R2, 20 nov)
- [ ] **→ 9p** · **La foto oculta por reportes sigue en el borde de Cloudflare:** la capa 3 saca el archivo y sus variantes de `n/`, pero
      Cloudflare guarda `/medios/n/` hasta un año (caché inmutable). Va con la purga del borde ya anotada (F1): pedirle a Cloudflare que suelte la
      maestra y las variantes al ocultar (y al rechazar algo que estuvo publicado), con reintento desde el barrido. (R2, 20 nov)
- [ ] **→ 9u** · **La capa 3 solo existe para la galería del negocio:** el reporte de fotos (`photo_reports`, «Reportar foto» de la galería) solo
      acepta fotos de `owner_kind = 'business'`. Las fotos de reseñas, eventos, novedades, menú y perfil no se pueden reportar como foto. Decidir
      si se agregan (y su pantalla) en R3. (R2, 20 nov)
- [ ] **→ 9u** · **R3 (pantallas, Sonnet):** el estado de la foto y «Pedir revisión» donde se ven las fotos propias (hoy cada pantalla que sube
      muestra el mensaje del servidor como un aviso; la apelación ya se pide en Mi cuenta › Avisos de moderación, que la lista como «Quitamos tu
      foto» aunque esté retenida: decir «En revisión»), Contenido › Auto-moderación (las cuatro capas ya salen con el patrón de siempre; falta el
      gasto de la capa 2), el bloque del reporte diario con `cifrasRevisionFotos()` y la ayuda en `docs/ayuda/` (quien sube y el equipo). La
      acción `pedirRevisionFoto` está hecha y sin botón. (R1, 20 nov)
- [x] **→ 9u** · **/api/medios también recibe fotos que van solo a un negocio** (las de una solicitud, una cita, un viaje, un estimado, la
      balanza o el daño de una renta: se guardan en `n/` y se adjuntan con `owner_kind` request, appointment, trip, estimate_line…). Desde la
      revisión de R2 las pantallas que suben esas fotos mandan `destino=privado` (lista en el guardián fotosRevisionPrivacidad): nunca van a la
      segunda opinión y su dudosa queda retenida («privada») hasta que una persona la revise. Queda: su archivo sigue en `n/` (dirección pública
      que nadie lista); decidir si deberían subirse por una ruta privada, como las de ayuda. (R2, 20 nov) — **✓ (21 nov, F3):** van por una
      llave privada servida con permiso: `privado/o/<uuid>.jpg`, `media.private`, `/api/medios/privada/<uuid>` (quien la subió, el cliente y el
      negocio de su operación, el equipo con un caso abierto, auditado). Ver «Fotos a la medida — F3».
- [x] **→ 9u** · **El atajo de la foto «privada» en los catálogos:** desde el 20 nov una foto subida con destino «privado» entra aunque el modelo
      propio esté caído (decisión de después del CI). Las acciones que adjuntan una foto de `media` a algo público ya la rechazan
      (`not rev_sin_c2`: Publica tu negocio, galería, logo, foto del equipo, menú, perfil, Comunidad, novedades, eventos, reseñas; guardián
      fotosRevisionPrivacidad). Los catálogos que guardan la DIRECCIÓN como texto sin mirar `media` (oficios, servicios, autos, inmuebles y renta de
      artículos: `items.photos` por expresión regular) no la validan: quien mienta «privado» con el modelo caído puede pegar esa dirección ahí.
      Arreglo de fondo (F3 de Fotos a la medida): las fotos privadas a una llave privada servida con permiso; mientras, o validar esas direcciones contra `media`. (20 nov) — **✓ (21 nov, F3):** cerrado de fondo
      (una foto de destino privado no tiene dirección pública que pegar) y en cada catálogo: `fotosDeCatalogoOk` (visible, sin purgar, no
      privada, sin `rev_sin_c2`, del negocio o de quien guarda; por el id de la dirección). Guardián `fotosPrivadasConPermiso` (+ al revés).
- [ ] **→ 9u** · **rev9u (punta a punta con Garage) no corrió fuera del CI:** esta sesión no tenía almacén (/api/medios da 503) ni el servidor
      de pruebas. Corrieron tipos, todos los guardianes, alreves9urevision 31/31, la prueba pura fotos9urevision y la migración 0196 dos veces
      sobre todas las anteriores (con el SQL de cada camino probado contra la base). Correr rev9u y com5d (su paso 13 cambió) en el CI dirigido.
      (R1+R2, 20 nov)
- [ ] **→ 9u** · **El modelo de la segunda opinión es el «cotidiano» de El Compa** (Configuración › El Compa › modelo de cada papel; hoy Claude
      Haiku 5.5): cambiar ese modelo cambia también el de las fotos. Si hace falta separarlos, un papel nuevo en `compa_models`. (R2, 20 nov)
- [ ] **→ 9u** · **La segunda opinión en la subida contra el guardián compaSinRutaCritica:** El Compa nunca está en la ruta crítica, y la segunda
      opinión usa su modelo dentro de la subida (decisión AJ: en el mismo pedido, ≈ 8 s). Se permitió solo `lib/fotos-segunda-opinion.ts`, con
      tiempo límite y fallo cerrado (si no contesta, la foto queda retenida y la subida sigue). Confirmarlo con el fundador. (R2, 20 nov)

## Fotos a la medida — F3 · las fotos de destino privado (21 nov) — lo que quedó anotado
- [x] **→ 9u** · **Las pantallas todavía no piden `?w=` de una foto privada:** la ruta `/api/medios/privada/<id>?w=320|640|1080|1600` ya entrega
      la variante WebP con el mismo permiso, pero `fotoSrc`/`fotoFondo` (`packages/ui/src/foto.ts`) solo reconocen `/medios/n/…` y dejan pasar la
      dirección privada sin tocar: las miniaturas de una cita, solicitud o viaje bajan la maestra (≤ 1600 px). Arreglo: que reconozcan
      `/api/medios/privada/<uuid>` y agreguen `?w=<ancho>` (cambio del sistema de diseño; esta entrega no tocó `packages/ui`). (21 nov)
      **Hecho (21 nov):** `fotoSrc`, `fotoFondo`, `fotoCss` y `fotoSrcSet` reconocen `/api/medios/privada/<uuid>` y piden `?w=<ancho>`
      (prueba pura en `pruebas/alreves/alreves9ufoto.cjs`). Falta verlo servido con una foto real: lo corre el CI (aquí no hay almacén).
- [ ] **→ 9u** · **fot9uprivadas y rev9u (F3) corren en el CI:** aquí corrió `fot9uprivadas` contra una base propia con todas las migraciones y la
      semilla (41/41) y nginx de verdad (`medios-nginx.test.sh`); NO corrieron la subida real ni la ruta servida (sin almacén: `/api/medios` da
      503). Correr en el CI dirigido `rev9u` (sus pasos F3: la fila privada, nada bajo n/, la ruta 200 para quien subió y 404 sin sesión u otra
      persona), `fot9uprivadas` y las 10 pruebas de esos flujos (`est4d`, `pq4e`, `pre4e`, `merc4p`, `merc9n`, `cit3e`, `renta4f`, `tra4y2`,
      `ayu4f`, `ayu4z`). (21 nov)
- [ ] **→ 9u** · **Las fotos de antes bajo n/ que el barrido mueve:** 0197 marca como de destino privado las de una solicitud, cita, viaje,
      balanza, estimado, ayuda no privada y daño de renta, y `barrerPrivadas` las pasa a `privado/o/` de a 20 por minuto. Cómo saber que terminó:
      `select count(*) from media where rev_sin_c2 and not private and purged_at is null` → 0. Mientras tanto, la que falta se sigue viendo por su
      dirección vieja. Lo ya movido puede seguir en el borde de Cloudflare (`/medios/n/` se cacheaba un año): va con la purga del borde (9p). (21 nov)
- [ ] **→ 9u** · **El equipo en «Panel del dueño (solo lectura)» no ve las fotos privadas:** la ruta solo deja pasar al equipo con un caso
      ABIERTO de esa operación en su cola («Ayuda con…» o el daño de una renta). En la vista de solo lectura del panel, en una disputa o en el
      360° de una cita sin caso, la foto sale vacía (404). Decidir con el fundador si se abre (con motivo escrito y auditoría, como el vidrio
      roto) o se deja así. (21 nov)
- [ ] **→ 9u** · **Plazo de las fotos de destino privado:** no tienen purga propia (como antes de F3: vivían en n/ sin plazo). Las de una ayuda
      de Salud y Pro sí (90 días); decidir con el fundador si las de una cita, solicitud, viaje, balanza, estimado, daño y «Ayuda con…» de los
      demás rubros se borran a los N días de cerrar su operación, y construirlo con su guardián. No se inventó un plazo. (21 nov)
- [ ] **→ 9u** · **Una privada de otra ruta (`privado/a/`, ayuda de Salud y Pro) en un destino público:** las consultas del atajo exigen
      `not rev_sin_c2` (que esas filas no tienen) y no `not private`; el Menú y los cinco catálogos ya exigen las dos. Si alguien pega el id de
      una foto de ayuda en la galería o el perfil, la dirección guardada sería `privado/a/…`, que no se sirve (se ve rota, no se filtra).
      Agregar `not private` a las 11 consultas del atajo (guardián `fotosRevisionPrivacidad`). (21 nov)

