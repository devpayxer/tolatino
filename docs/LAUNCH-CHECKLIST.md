# To'Latino v2 — Checklist de lanzamiento (lo diferido)

Todo lo que se decide «después / al lanzar / cuando esté listo» se anota aquí
en el momento. Se marca solo cuando está hecho de verdad.

## Infraestructura
- [ ] **Vercel (5 nov 2026):** el fundador desconectó el repo del proyecto de
      Vercel para parar los correos de «Preview deployment failed». El proyecto
      sigue sirviendo la v1 (tolatino.com y el sitio de pruebas viejo).
      **Al apuntar tolatino.com a Hetzner + Cloudflare, borrar el proyecto de
      Vercel completo** (decisión D: sin Vercel).
- [ ] **Supabase viejo:** borrar los dos proyectos de la v1 (pruebas
      `zpkaxojonufdwgahiqjh` y producción) cuando la v2 esté en producción.
- [ ] **Servidor de producción en Hetzner:** no se enciende hasta aprobarlo;
      al principio solo existe el de pruebas (decisión C).

## Infraestructura del sandbox
- [ ] **Almacenamiento de archivos (5 nov 2026):** MinIO fuera (imágenes públicas retiradas).
      Entra **Garage** (`dxflrs/garage:v2.1.0`, S3 propio) en el bloque de subida de fotos,
      con bucket, llaves y respaldo del volumen. Hasta entonces la app no sube archivos.

## Cuenta (bloque 3b, 5 nov 2026)
- [ ] **Proveedor de SMS (decisión E/E2):** cuenta en Telnyx (o Twilio), registro 10DLC, clave en los secretos
      del entorno, y `lib/cuenta.ts` → envío real (hoy lanza `sin_proveedor` fuera del modo pruebas).
      WhatsApp como canal del código después de SMS.
- [ ] **Passkeys (Face ID / huella):** necesitan HTTPS y un dominio (WebAuthn no funciona sobre una IP con
      http). Construidas y probadas en 8d (11 nov); se usan cuando `pruebas.tolatino.com` esté detrás de Cloudflare (ver «Fase 8 · 8d»).
- [ ] **Onboarding del vecino pasos 3–5** (Tu zona, Lo que te gusta, El barrio) y la bienvenida de Fundadores:
      hoy después de «Tú» se va a Mi cuenta mínima.
- [ ] **Accesibilidad de `Button` del sistema:** es un `div` con onClick (no se enfoca con teclado ni lo anuncia
      un lector de pantalla). Pasa a `<button>` real cuando se tipe el componente; el guardián WCAG lo exigirá.
- [ ] **Super Admin:** sesiones por dispositivo (cerrar / bloquear), cuentas, cambios de cuenta — en el bloque 3c.

## Super Admin (bloque 3c, 5 nov 2026)
- [ ] **Segundo factor obligatorio para el equipo (T#30)** antes de encender producción: TOTP (app de
      autenticación) o passkey; sin él, una cuenta del equipo depende solo del SMS. Bloquea la fase 9.
- [ ] **Código de arranque del primer Admin:** su huella vive en `lib/admin.ts` y solo sirve mientras no exista
      ningún Admin. En producción se genera uno nuevo (otra huella) y se usa el día de la apertura.
- [ ] **Buscador global ⌘K y campana con colas:** hoy llevan a Usuarios y a «Colas · Fase 1».
- [ ] **Selector de ciudad del admin:** hoy solo «Todas»; filtra por ciudad cuando haya datos por ciudad (Fase 1).
- [ ] **Abrir/cerrar ciudad** (asistente de 6 pasos) en Fase 9; **editar catálogo** con «afecta a N negocios» en Fase 1.
- [ ] **Inicio — secciones ocultas hasta tener datos reales (bloque 1c):** Hoy en el barrio, Esta semana
  (eventos, Fase 6), Comunidad (Fase 5) y el mini mapa de la columna derecha (mapa propio). Cada una se
  enciende en el Inicio cuando su módulo exista; el prototipo manda en su forma.
- [ ] **Pantallas `Pronto` (sandbox):** toda ruta que aún muestra «En construcción» debe llegar a 0 antes de la
  fase 9 (hoy: comunidad, eventos).
- [ ] **Publica tu negocio — lo que falta (bloque 1g-2):** (1) **ubicar la dirección en el mapa** (geocodificar con un
  servicio propio sobre OpenStreetMap: Photon o Nominatim autoalojado); hoy el negocio publicado no tiene punto, así que no
  sale como pin y cuenta como «dentro» del radio; (2) **la prueba Pro de 30 días** queda en category_attrs.onb.trial: la
  baja a Free al terminar llega con Suscripciones (Dinero); (3) **códigos de promotor** (HZL30 = 60 días, del diseño)
  como tabla del Super Admin; (4) «Tómale foto a tu lista: El Compa la lee» (el prototipo lo simulaba e inventaba
  precios) con El Compa; (5) «Es mío · recuperarlo» abre «Recuperar negocio» (pantalla propia); (6) H1 «Ir a mi panel» y
  las tareas de «Lo que sigue» abren el panel (bloque 1h); hoy «Ver mi página»; (7) lo que vende queda en
  category_attrs.items hasta la tabla de ítems del panel; (8) precios típicos de la lista sugerida = los del diseño
  («precios típicos de ejemplo, Hazleton 2026»): revisarlos con negocios reales; (9) la cola del Super Admin para ver los
  negocios nuevos (bloque 1i); (10) prueba de punta a punta de este flujo en CI (hoy corre a mano con Playwright); (11) «Publicar otro» (un segundo
  negocio con la misma cuenta): hoy el borrador es uno por persona; llega con el panel (varios negocios por cuenta).
- [ ] **Recomendar — lo que falta:** el SMS al negocio («X te recomendó…», una vez) y el aviso «ya publicó» al vecino
  (Fase 2, notificaciones); la cola «Recomendaciones» del Super Admin para revisarlas, marcarlas y unirlas al negocio
  cuando publique (bloque 1i).
- [ ] **Mapa — tope de 400 negocios:** el mapa trae los 400 más cercanos al punto (pines y lista). Cuando una ciudad pase
  de eso dentro de 2,6× el radio, pedir los pines por el recuadro visible al arrastrar. Mini mapas del Inicio y de la
  ficha («Cómo llegar» con el mapa propio) siguen pendientes; «Cómo llegar» abre el mapa del teléfono.
- [ ] **Ciudad — lo que falta (bloque 1f-2):** barrios y pueblos cercanos de Allentown, Wilkes-Barre, Scranton y
  Reading (el prototipo solo trae los de Hazleton; se cargan desde Super Admin › Ciudades antes de abrir); filas de
  «Casa / Trabajo» para medir desde tus direcciones (llegan con Mi cuenta › Direcciones; hasta entonces no se ofrece
  «Entra para medir desde tu casa»); «Qué es Mi ciudad» para quien no entró (cuando exista el Centro de ayuda);
  la cifra de eventos en el radio (Fase 6); «Lo que más buscan los vecinos de X» en Próximamente (sale oculto hasta
  tener datos reales de `city_waitlist.wants`); el SMS «tu ciudad abrió» (Fase 2 + asistente de abrir ciudad, Fase 9);
  el teléfono de quien pide sin cuenta no se verifica con código (tope por IP): decidir antes de enviar SMS.
- [ ] **Ciudades en memoria 60 s:** abrir o cerrar una ciudad desde el Super Admin se nota en hasta un minuto.
- [ ] **Banda de emergencia de Hogar:** oculta hasta que exista el flujo «Pedir ayuda ahora»
  (APP-NEG-HOGAR-EMERGENCIA). Las de Doctores y Profesionales sí están (filtran la lista).
- [ ] **Negocios — secciones ocultas hasta tener datos reales:** «Hoy en el barrio» (módulo Novedades) y
  «Recomendados por vecinos» (el prototipo lo calculaba como reseñas ÷ 4; necesita el dato real de las reseñas).
- [ ] **Paginación numerada (excepción a «paginación por cursor»):** el diseño pide «Página 2 de 5» y números; la
  lista de una categoría en una ciudad es acotada, así que va con OFFSET y tope de 100 páginas. Revisar con datos
  reales antes de la fase 9 (si una categoría pasa de ~1 000 negocios en una ciudad, pasar a cursor).
- [ ] **Chips largos en BusinessCard:** textos largos (p. ej. «Coordinación del día $900 · boda completa…») se
  cortan en el borde de la tarjeta. Pedir al diseño cómo debe partirse.
- [ ] **«Cómo llegar»** abre Google Maps del teléfono hasta tener el mapa propio.
- [ ] **«Avísame cuando haya»** guarda la búsqueda; el envío del aviso se construye en la Fase 2 (notificaciones push/SMS/correo).
- [x] **Toques de contacto sin límite:** resuelto en 1h (0015: uno cada 10 min por persona o red, 60/h por red, sin
  contar a la gente del negocio).
- [ ] **Ficha — lo que se ve cuando exista su dato o módulo:** («Quién está detrás» y «En el local» ✓ en 1h) reseñas y «N vecinos lo recomiendan» (Fase 2), menú/servicios/tienda/reservaciones/staff/eventos/jobs (sus
  fases), mini mapa con la zona (mapa propio), botón principal por módulo (hoy:
  «Llamar»). En el prototipo la tarjeta «Hoy» y la del dueño inventaban cifras (35–45 min por defecto, pedidos =
  reseñas × 0,7, rango por reseñas): no se copian.
- [ ] **Reporte de foto — el aviso por SMS:** la hoja dice «Te avisamos el resultado por SMS» (texto del diseño). El
  aviso se construye con las notificaciones (Fase 2) y la cola «Medios marcados» del Super Admin (bloque 1i). Sin eso
  no pasa a producción.
- [ ] **Buscar — pendientes con su módulo:** pestañas «Platos y servicios» (Fase 2), «Eventos» (Fase 6), «Vecinos» y
  «Pregúntale al barrio» (Fase 5); desplegable de búsqueda en el encabezado de escritorio (hoy el encabezado lleva a
  /buscar); vista previa al pasar el cursor (escritorio).
- [ ] **Buscar con la voz** usa el reconocimiento del propio navegador (Safari/Chrome lo procesan en servidores de
  Apple/Google). Revisar con el fundador si se acepta o se construye uno propio antes de producción.
- [ ] **Vocabulario de búsqueda (`search_vocab`)** se refresca en cada despliegue; con negocios nuevos todos los días
  hace falta refrescarlo cada hora (trabajo programado, con el resto de procesos).

## Panel del negocio · base (bloque 1h, 5 nov 2026)
- [ ] **Aceptar una invitación al equipo (`/e/{código}`):** el SMS dice «Acepta y pon tu foto aquí», pero el diseño no
  tiene esa pantalla (quien acepta entra con su teléfono, pone foto, palabras e idiomas). **Pedir el diseño al
  fundador.** Hasta entonces las invitaciones se guardan y vencen a los 7 días; nadie puede aceptar.
- [ ] **SMS de invitación y de «Reenviar»:** sale con el proveedor de SMS (decisión E2, Fase 2). La pantalla dice con la
  verdad que el SMS no salió. Igual «Le avisamos por SMS» al quitar a alguien y el aviso a quien pidió unirse (quitados
  del texto hasta que existan).
- [ ] **Secciones del panel que llegan en su fase (ocultas, no a medias):** Clientes, Mensajes, Lo que vendes (módulos,
  ítems, «Marcar agotado»), Entrega, Eventos, El Compa, Moderadores, Cobros y plan (los botones «Tu plan / Decidir /
  Pro» de las notas de la prueba), Ajustes, «Más»; apartados Información y contacto, Ubicación y zona, Reseñas,
  Novedades («Publicar novedad»), Preguntas frecuentes, Relacionados, Vacantes, Verificación y sello, Insights. Las
  tareas de la fuerza que llevan ahí (ítems, sello, correo, FAQ, reseñas) se muestran sin enlace.
- [ ] **Hoy con datos reales:** pedidos, citas, reservaciones, cotizaciones, mensajes y reseñas (Fase 2–3). Hoy las cifras
  son cero porque esos módulos no existen; «Free: 0 de 10» cuenta de verdad cuando existan las operaciones en línea.
- [ ] **Horario — feriados, vacaciones, días especiales propios y «Abro por temporada»** (y que el estado abierto/
  cerrado los mire): catálogo de feriados por año en el servidor + días propios. Ocultos hasta construirlos (el
  subtítulo del apartado los menciona: texto del diseño).
- [ ] **Horario distinto por módulo** (último pedido en línea, citas que dejan de entrar antes de cerrar): con Pedidos y
  Citas.
- [ ] **El Compa traduce** (Quiénes somos, rol, especialidades, palabras): Fase 7; hoy se escribe a mano.
- [ ] **Pestaña Staff de la ficha** y «Ver equipo» de «Quién está detrás» (sin botón por ahora): con las pestañas Pro.
  «Sus platos» de cada persona: con el Menú (Fase 2).
- [ ] **Prueba Pro al terminar** (pasar a Free, primer cobro, «decidiste seguir/no seguir»): con Cobros y plan (Fase 2);
  hoy `business_stats_cache.plan` no cambia solo el día 30.
- [ ] **Avisos de la prueba fuera del panel** (día 20, 25, último, fin: push/SMS/correo a las 10 AM): Fase 2.
- [x] **Super Admin del panel (triángulo):** hecho en 1i (fotos, Quiénes somos, nombre, teléfono, dirección, staff,
  cierre temporal, ocultar/suspender/cerrar, sello). El horario queda en lectura en el admin (como el prototipo).
- [ ] **Vistas:** se cuentan al servir la ficha (sin robots ni gente del negocio). Revisar con tráfico real si hace falta
  dedupe por persona/día como los contactos.
- [ ] **Botones del sistema de diseño (`Button`) son `<div>` sin `role="button"`:** accesibilidad por teclado/lector de
  pantalla en todo el sitio. Corregir en `portar-sistema.mjs` (guardián de accesibilidad) antes de la fase 9.

## Super Admin · Negocios y Colas (bloque 1i, 5 nov 2026)
- [ ] **Colas que llegan con su pantalla:** Licencias (con la ficha «Licencia»: número de licencia en Publica/panel,
  filas `licenses` en revisión, estado «No aparece»); «Crear semilla» en Recomendaciones (con Reclamar negocio y la fila
  «SIN RECLAMAR» de la categoría); Reportes de contenido/negocio/usuario, Cambios sensibles, Ciudad nueva (sus fases).
- [ ] **Acciones del 360° que dependen de otras piezas:** Mensaje al dueño (bandeja en el panel + SMS), Destacar 7 días
  (Destacados), Cambiar categoría / Transferir / Fusionar / Reclamos (cola Cambios sensibles), Invitar a reclamar
  (SMS), Pro de cortesía / prueba / pagos (Fase 2), quitar acceso al panel (Moderadores), pausar módulos, «Panel del
  dueño» y «Ver como cliente» de un negocio no activo (vista del equipo). Pestañas Lo que vende, Operación, Dinero,
  Contenido: con sus módulos.
- [ ] **Avisos por SMS** al dueño (sello, ocultar, foto quitada) y al vecino que reportó o recomendó: Fase 2. Los
  textos del admin dicen «lo ve en su panel» (verdad hoy).
- [ ] **Avisos del panel sin diseño propio:** «To’Latino ocultó / suspendió / cerró tu página: {motivo}» usan el patrón
  del aviso «To’Latino cerró tu página por unos días» (el diseño del panel no trae esos tres). Confirmar con el fundador.
- [ ] **Colas:** atajos de teclado J/K/A/R y acciones en lote (plan §6), vencimiento del «tomado», tope de 200 casos por
  vista (paginar cuando haga falta), SLA editables por el Super Admin (hoy en `lib/colas.ts`).
- [ ] **Permisos:** la matriz de 0007 manda (el prototipo daba Colas a soporte, finanzas y lectura). La visibilidad por
  cola vive en código; pasarla a la base si el Super Admin la quiere editar.
- [ ] **Lista de Negocios con OFFSET** (14 por página, tope 100 páginas) y filtros de transacciones, Stripe, licencias,
  «sin actividad 30 d», «Exportar CSV» (servidor + auditoría): con sus datos.
- [ ] **«Teléfono verificado» del negocio** = el teléfono del negocio es el del dueño que entró con código. Verificar
  un teléfono distinto (llamada o SMS) llega con el proveedor de SMS.

## Licencia (bloque 1k, 5 nov 2026)
- [ ] **Revisión cada 3 meses:** abrir el caso solo al llegar `next_review` necesita los trabajos programados (no hay
  todavía). Hasta entonces una licencia verificada sigue verificada.
- [ ] **Otras categorías con licencia** (Niños/DHS, Bienes Raíces, Salud, Hogar, Auto…): el catálogo es de NEG-PRO.
- [ ] **«Quién tiene licencia aquí»** (licencia de cada persona del equipo): sin gestión diseñada en el panel ni el admin.
- [ ] **Pestaña Servicios de la ficha:** la tarjeta «¿Puede hacerlo por ley?» vive en el Resumen hasta que exista.
- [ ] **Decisiones tomadas sin el diseño:** el número de licencia se escribe en el panel (campo del sistema de diseño;
  el diseño no lo tenía); plazo único 72 h (el panel del diseño decía 48 h); «revocada» se muestra como «No aparece»;
  el paso 2 de «Cómo la verificamos» dice «la quitamos de su ficha» (el diseño decía «el sello», que es otra cosa).
- [ ] **Chip de la tarjeta** usa el título de la semilla (`licL`); un negocio nuevo verificado aún no muestra chip.

## Recuperar negocio y semillas (bloque 1j, 5 nov 2026)
- [ ] **Proveedor de SMS en producción** para el código del reclamo (R1). En el sandbox el código sale en pantalla;
  sin proveedor, producción responde «Los mensajes de texto todavía no están disponibles. Usa un documento».
- [ ] **Borrar la foto del documento a los 90 días** de decidido el reclamo: necesita los trabajos programados.
- [ ] **Botones de Soporte** del diseño (chat / llamar) ocultos hasta que exista Soporte. — 7b (10 nov): «chat» = Soporte (`/soporte`, casos con una
  persona) ya existe y los avisos del panel traen «Escribir a Soporte»; **llamar** sigue sin construirse (no hay línea telefónica, R1).
- [ ] **Admin Negocios › pestañas «Reclamos» y «Duplicados»** e **«Invitar a reclamar»** (SMS): con sus módulos.
- [ ] **Entrada «¿Es tuyo?» desde la ficha** de un negocio: el diseño no la trae; hoy se llega desde Publica y semillas.
- [ ] **Decisiones tomadas sin el diseño (confirmar con el fundador):** texto del aviso al dueño actual en su panel
  (R2), las 3 plantillas de «Rechazar», el detalle del caso en «Cambios sensibles» (compuesto con piezas del admin).
- [ ] **«Llamar» desde una semilla** abre el teléfono pero aún no se cuenta (la tabla `contact_taps` ya admite `seed_id`).
- [ ] **Guardián de tipos de parámetros SQL:** el error «inconsistent types deduced for parameter» salió dos veces
  (mismo `$n` usado como texto y uuid). Hoy lo caza la prueba punta a punta; falta un guardián estático.

## Usuarios 360° (bloque 1l, 5 nov 2026)
- [ ] **Pestañas Actividad, Dinero y Comunidad** y los KPI del encabezado (pedidos, citas, Wallet, rango): con sus
  módulos. Igual la columna RANGO/ACTIVIDAD de la lista y los filtros «Con reportes», «Con saldo en Wallet», rango y
  «Promotores».
- [ ] **Enviar mensaje** (SMS/push, AdminMessage) y **avisos por SMS** de sanciones: con las notificaciones (Fase 2).
- [ ] **Apelaciones** (cola de 72 h y botón en Mi cuenta): con Soporte / Confianza y seguridad. Hoy la persona ve el
  motivo y «Escríbele a Soporte».
- [ ] **Fusionar cuentas**: el pedido y su aplicación mueven todo lo de una cuenta a otra; se construye con un guardián
  que obligue a cada tabla nueva con `users` a declarar cómo se fusiona. No está en este bloque.
- [ ] **Borrado definitivo a los 30 días** (y qué pasa con sus negocios: quedan sin reclamar): trabajos programados.
- [ ] **«Ver como (solo lectura)»**, términos aceptados y avisos que recibe (Privacidad): con Mi cuenta completa.
- [ ] **Decisiones tomadas sin el diseño (confirmar con el fundador):** textos de Mi cuenta y de Recomendar para la
  persona silenciada o advertida; textos al entrar (suspendida, borrándose, dispositivo bloqueado); «Silencio» y
  «Bloquear publicación» frenan Recomendar (no hay Comunidad todavía); no se sanciona ni borra a alguien del equipo.
- [ ] **Lista de Usuarios con OFFSET** (14 por página, tope 100 páginas) y conteos con `count(*)`: cambiar a cursor
  cuando haga falta.

## Catálogo (bloque 1m, 6 nov 2026)
- [ ] **Subcategoría nueva en «Publica tu negocio»:** Publica usa la lista del diseño (lib/onb); hoy la nueva sale en la
  categoría, Buscar y el admin, no en el paso de subcategorías de Publica.
- [ ] **Del diseño, pendiente:** mover / fusionar subcategorías, editar el nombre, plantillas de horario y placeholders
  del onboarding por categoría, activo por ciudad, límites Free/Pro editables por módulo (la matriz es de solo lectura).
- [ ] **Decisiones tomadas sin el diseño (confirmar):** el nombre nuevo se escribe «español / inglés» en un solo campo;
  los módulos se listan sin la etiqueta «ACTIVO» del prototipo porque todavía no existen (llegan con sus fases).
- [ ] **Búsquedas sin oferta** cuenta solo «Avísame cuando haya»; las búsquedas sin resultado (search_logs) entran con la
  analítica.

## Analítica propia (bloque 1n, 6 nov 2026)
- [ ] **Escala:** `app_events` sin particiones (BRIN por fecha); particionar por mes y resúmenes diarios cuando crezca
  (necesita trabajos programados). Política de cuánto tiempo se guardan los eventos (privacidad): decidir y programar.
- [ ] **Pestañas del diseño pendientes:** Dinero (MRR, conversión a Pro, devoluciones, ticket promedio), Comunidad y
  eventos, vecinos por rango, reportes por mil operaciones y tickets: con sus módulos. Envío semanal de reportes por
  correo (interruptor del diseño): con las notificaciones.
- [ ] **Embudo:** el diseño termina en «El negocio aceptó»; en la Fase 1 termina en «Contactaron» (Llamar, WhatsApp,
  Cómo llegar). Confirmar el texto con el fundador. Etiquetas cortas porque el componente de barras corta las largas.
- [ ] **Grabación de sesiones (rrweb, con consentimiento)** y Web Vitals propios (HERRAMIENTAS §2 y §4): bloque aparte.
- [ ] **Aviso de privacidad** que diga qué mide To'Latino (sin terceros): con las páginas legales (Fase 9).

## Menú (bloque 2a, 6 nov 2026)
- [x] **Pestaña Menú en la ficha, carrito y pedido:** hecho en el bloque 2b.
- [ ] **«Lo que vendes» con los demás módulos** (Servicios, Tienda, Renta, Citas, Reservaciones, Pedidos en línea,
  Staff, Eventos, Novedades, Jobs) y «Tu herramienta» de la categoría: con sus fases. Hoy solo Menú (Comida).
- [ ] **Traducir con El Compa** (plato, categoría, grupo): Fase 7.
- [ ] **«Últimos 30 días» del plato** (pedidos, vendido, puesto) y Populares por lo más pedido: con los pedidos (2b/2c).
- [ ] **Aviso por SMS de «quedan pocos»:** la preferencia se guarda; el SMS llega con las notificaciones.
- [x] **«Listo en N min»:** desde 2b sale de `delivery_settings.prep_min` (20 por defecto) + tiempo extra + el plato que más tarda.
- [ ] **Fotos de ejemplo del sandbox** vienen de Pexels (como el prototipo); las de los negocios reales son propias.


## Pedir comida (bloque 2b, 6 nov 2026)
- [x] **Aceptar / rechazar, etapas (cocina, listo, entregado), SIN RESPUESTA a los 10 min, Cancelar del cliente, Clientes y
  Pedidos en línea en el panel:** hecho en el 2c.
- [ ] **Proponer un cambio** (falta un plato: ChangeProposal 2k) y **Ayuda con el pedido** (APP-NEG-PEDIDO-AYUDA con
  HelpRequest y su cola): con Soporte (2i).
- [ ] **Avisos** al cliente y al negocio (SMS / push: pedido nuevo, aceptado, listo): con las notificaciones. Hoy la
  página del pedido se actualiza sola cada 20 s y el panel al abrirlo.
- [x] **Nota de cómo se recoge** (pickup_note): se edita en Entrega (DASH-ENTREGA): hecho en el 2f.
- [ ] **Devolver dinero y Pedir reseña** (SMS «¿Cómo estuvo?») en un pedido entregado: con tarjeta (2d) y las notificaciones. El cliente ya escribe la reseña desde su pedido (2g).
- [ ] **Pago con tarjeta** (retener al enviar, cobrar al aceptar), Wallet y cupones: 2d / Fase de Planes. Hoy solo pago en
  el local y no hay cupones.
- [x] **Delivery** (zona, envío, mínimo, propina, cómo te lo entregamos): hecho en el 2f, con efectivo al entregar.
- [ ] **Hoja «Entra para pedir» (AuthSheet 2m):** el componente del sistema solo trae textos en español y no muestra
  errores; mientras, «Ir a pagar» sin cuenta usa la pantalla Entra (bilingüe) y vuelve al pago con el pedido igual.
- [ ] **Accesibilidad del sistema de diseño:** `Button` es un `div` sin `role="button"` ni teclado (lo cazó la prueba del
  2b). Corregir en `packages/ui` y sumar la regla a la revisión de accesibilidad.
- [ ] **Mi cuenta › Pedidos** (la lista de los pedidos de la persona): 2h. Hoy se llega por el enlace del pedido.
- [ ] **Super Admin › Transacciones** (línea de tiempo por pedido): 2i. Hoy el 360° muestra cuántos pedidos van este mes.
- [ ] **Alergias en el menú del cliente:** el panel las guarda; el prototipo del cliente no las muestra. Preguntar al
  fundador dónde salen.
- [ ] **Hora del pedido programado** con el reloj del negocio: los horarios que cruzan la medianoche se programan solo hasta las 11:30 PM.

## Reservaciones de mesa (bloque 2e, 6 nov 2026)
- [x] **Cambiar una reservación ya confirmada** (el cambio queda pendiente y la actual sigue en pie): hecho en el 2k
  (6 nov); el lado del panel compuesto, pendiente del OK del fundador (REVISION 4).
- [ ] **«Avísame si se libera» (lista de espera) y «Otros restaurantes con mesa»** en la pantalla de «no pudo»: con las
  notificaciones (SMS).
- [ ] **Avisos por SMS** (al confirmar, el día de la reservación, al proponer otra hora) y al restaurante (solicitud
  nueva): con las notificaciones. Hoy la pantalla se actualiza sola cada 20 s y el panel al abrirlo.
- [ ] **Evento privado** (grupos grandes, APP-NEG-EVENTO-PRIVADO): hoy se ofrece Llamar; la solicitud de evento llega con
  Cotizaciones.
- [ ] **Historial de no-show del cliente** visible para el restaurante (cuántas veces no llegó): con Mi cuenta / Usuarios 360°.
- [ ] **Plan Pro:** Reservaciones es de Pro; el botón «Ver Pro» del candado espera la Fase de Planes.
- [ ] **Fotos de Pexels** (semilla) no cargan en el entorno de pruebas sin salida a internet: la tarjeta de la solicitud
  muestra el fondo gris. En el sandbox real sí cargan.

## Entrega y delivery (bloque 2f, 6 nov 2026)
- [ ] **App To'Latino Repartidor** (`/repartidor`): sin pantallas en el diseño (pregunta 6 en `docs/REVISION.md`). Con
  ella llegan: foto al dejarlo en la puerta (prueba de entrega), espera de 5 min si no abren, mapa en vivo del
  repartidor, «Tus repartidores» (invitar con código), Despacho y Cuadre de efectivo en el panel. Mientras, el negocio
  marca «Salió en camino» y «Entregado» en su panel, y el pago no promete la foto.
- [ ] **Enlace de seguimiento por SMS** al cliente (app externa) y avisos «en camino» / «entregado»: con las notificaciones.
- [ ] **App externa conectada de verdad** (DoorDash Drive / Uber Direct por API): hoy el negocio pide el repartidor en la
  app externa y pega el enlace. Conectarla sería un servicio externo nuevo: decisión del fundador.
- [ ] **Delivery con tarjeta** (envío y propina cobrados en la app): con el 2d. Hoy solo efectivo al recibir.
- [ ] **Calles del Censo (TIGER) en el sandbox:** se cargan con `.github/workflows/direcciones.yml`; en el entorno local
  de pruebas se usan calles sintéticas. Producción las carga en la fase 9.

## Reseñas (bloque 2g-1, 6 nov 2026)
- [x] **Rango y puntos** del vecino en la tarjeta («SARGENTO · 23 RESEÑAS», «+15 PUNTOS»): hecho en 5f (desde Sargento; +15 si la reseña
  verificada sumó). Falta solo la nota de rango en «Tu reseña» del formulario de escribir (texto del diseño, sin dato nuevo).
- [ ] **«Ver traducción» (D3)** en reseñas y respuestas: con el servicio de traducción.
- [ ] **«Lo que más mencionan»** (temas): se calcula del texto; hoy no sale.
- [ ] **Preguntas de cada categoría** en «Lo que importa» (belleza, autos, hogar, salud…): con la fase de cada categoría. Hoy:
  Comida; las demás escriben estrellas, texto y fotos.
- [ ] **Reseña de una cita** (VERIFICADA · CITA) y **de una reservación** desde su pantalla: la mesa ya cuenta como verificada;
  el botón en la pantalla de la reservación terminada llega con Mi cuenta (2h).
- [ ] **Ayuda con el pedido** desde una reseña de 2★ o menos: con Soporte (2i).
- [ ] **Avisos** (al negocio: reseña nueva; al autor: respuesta, resultado de un reporte): con las notificaciones.
- [ ] **El negocio «quiere arreglarlo»** (propuesta en la respuesta) y **editar la respuesta**: el panel del diseño no los tiene.
- [ ] **Auto-moderación** («5 reseñas sin transacción en 10 min» → cola) y filtros de reseñas sospechosas en Contenido: con
  Contenido (2i).
- [ ] **Mi cuenta › Reseñas** (escritas / por escribir): con Mi cuenta completa (2h).
- [ ] **Semilla:** solo Sabor Dominicano trae reseñas de ejemplo (pregunta 8).

## Novedades (bloque 2g-2, 6 nov 2026)
- [ ] **«Hoy en el barrio»** en la portada (lo de las últimas 24 h de la ciudad, StoryCard) y su chip en la publicación.
- [ ] **Cupón para seguidores** (código, compra mínima, usos): con los cupones en el pago (2d / Planes).
- [ ] **Evento y vacante** como tipo y como botón: con Eventos (y Jobs, ya hecho: falta el botón «Ver vacante» en una novedad). **«Escribir»**: con Mensajes.
- [ ] **«Repetir»** (todos los días, lun · mié · vie…) y **«Avisar a tus seguidores»**: con las notificaciones.
- [ ] **PEDIDOS** que salen de una novedad (hoy el detalle muestra comentarios en su lugar).
- [ ] **Reportar una novedad o un comentario** desde la página (la cola «Reportes de contenido» ya acepta novedades y
  comentarios; falta el botón en la tarjeta, que el diseño no trae).
- [ ] **Elegir fotos de tu galería** en el editor (hoy se suben nuevas).

## Jobs (bloque 2g-3, 6 nov 2026)
- [ ] **Avisos por SMS** de cada respuesta a la persona y de cada solicitud nueva al negocio: con el proveedor de SMS y las
  notificaciones. Hoy se ven en la solicitud y en Hoy.
- [ ] **«Avísame de nuevas vacantes»** (vecinos) y el aviso al publicar: con las notificaciones.
- [ ] **«Traducir con El Compa»** en el editor: con El Compa.
- [ ] **Mis solicitudes** en Mi cuenta (lista de las J-… de la persona y las vacantes guardadas): con 2h Mi cuenta.
- [ ] **Reportar una vacante** desde la página (la cola «Reportes de contenido» aún no acepta vacantes; el diseño no trae
  el botón).
- [ ] **Vacantes en Buscar y en la portada de la ciudad** («Empleos en Hazleton»): el diseño las ubica en la pestaña del
  negocio; decidir si van en Buscar.

## Mi cuenta (bloque 2h, 6 nov 2026)
- [ ] **Borrado definitivo a los 30 días** de lo que pidió la persona (`users.delete_at`, `delete_reason`): un trabajo
  programado borra perfil, direcciones, guardados, reseñas y comentarios, cierra solicitudes y quita los pedidos de la
  cuenta (lo que la pantalla promete). Hoy solo queda programado y se cancela al entrar.
- [ ] **Verificar el correo** (enlace) y **recibos por correo**: con el proveedor de correo.
- [ ] **Avisos al teléfono** que respeten `users.notif_prefs` (pedidos, reservas, empleos, negocios guardados, correo,
  horas de silencio) y el aviso «cambiaste tu número» al número viejo.
- [ ] **Boletos, Mensajes, Pagos y Wallet, Apartados, platos y eventos guardados, Ayuda y soporte, Descargar mis datos,
  letra más grande, ajustes de la comunidad**: con sus fases (REVISION 11).
- [ ] **Invita vecinos con código** (quién invitó a quién) cuando exista la gamificación.
- [ ] **Alertas de búsqueda** («Avísame cuando haya») listadas en Avisos con «Quitar».

## Ayuda con el pedido y Soporte (bloque 2i, 6 nov 2026)
- [ ] **Devolución a la tarjeta y reponer con un pedido nuevo sin costo**: con Stripe (2d) y el Repartidor.
- [ ] **Soporte completo**: tickets por WhatsApp y correo, macros ES/EN, primera respuesta y CSAT; ayuda con citas y reservaciones. — 7b (10 nov):
  casos en la app, macros ES/EN, plazo de primera respuesta en horas hábiles y «¿Se resolvió?» hechos. Falta: **WhatsApp** (7h) y **correo
  entrante** (§6 #16, sin fecha).
- [ ] **Avisos** al negocio de una solicitud nueva y al cliente de la respuesta (SMS/push).
- [x] **El Compa** antes de abrir la solicitud (el prototipo lo pone primero). — 7d (10 nov): la hoja 2as sale antes del formulario en las 11
  páginas de «Ayuda con …»; apagada, al tope o con solicitud abierta, el formulario de siempre.

## Notificaciones (bloque 2j, 6 nov 2026)
- [ ] **SMS de verdad:** con la clave de Telnyx (`TELNYX_API_KEY`, `TELNYX_FROM`) en los secretos del entorno de producción
      y el registro 10DLC, los avisos salen solos (`lib/avisos.ts`). Hoy en el sandbox quedan «en modo pruebas». Sin
      reintentos todavía: un SMS que falla queda «falló» en Envíos (agregar reintento con espera antes de la fase 9).
- [x] **Push en las apps** (Fase 8): el mismo aviso como push; la plantilla ya dice qué grupo es. **Hecho en 8c (11 nov):** Web Push de verdad; APNs y
      FCM contra simuladores hasta que estén las llaves (ver «Fase 8 · 8c»).
- [ ] **Anuncios in-app** (secNotif «Anuncios»): banner de un día en el home de la ciudad. Falta el banner en el inicio.
- [ ] **Plantillas que faltan** porque su función aún no existe: código de entrada como plantilla editable, pedido tarde,
      recibo por correo, propuesta de evento privado, citas (confirmada / otra hora), devolución, evento cancelado, sello
      decidido, ciudad abierta, resumen semanal. Se agregan con su función.
- [ ] **Cifras de entrega y apertura** (secNotif: entregados, abiertos, costo SMS): necesitan el webhook de Telnyx y push. **Push hecho en 8c**
      (Notificaciones › Push: entregados al proveedor, abiertos desde el push, SMS ahorrados); falta la entrega del SMS (webhook de Telnyx).
- [ ] **Avisos que la pantalla ya promete y ahora pueden salir:** reporte de foto («te avisamos el resultado»), invitación al
      equipo, «Avísame cuando haya», recomendar. Engancharlos a `avisar()` con su plantilla.

## Pagos con tarjeta (bloque 2d, 6 nov 2026)
- [ ] **Cuenta de Stripe (modo prueba y luego real) + Connect Express.** Claves en los secretos del entorno, por el formulario
      seguro: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET` (endpoint `/api/stripe/webhook`, eventos
      `account.updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`).
      Sin clave: el sandbox usa el simulador; producción deja la tarjeta apagada (candado + guardián `simuladorAislado`).
- [ ] **3D Secure:** hoy, si el banco pide verificación extra, se pide otra tarjeta. Falta completar la acción con Stripe.js (también aplica al envío de la tienda, 4q-2, y al pedido del mercado).
      (`handleNextAction`) y confirmar el pedido después.
- [ ] **Disputas:** el webhook las marca y deja auditoría; falta la cola «Disputas» (120 h) con evidencia (Super Admin).
- [ ] **Pagos al banco (Payout) y conciliación diaria** Stripe ↔ libro propio (guardián del dinero, HERRAMIENTAS 20):
      hoy Stripe paga según su calendario; falta fijarlo a martes y el reporte diario de diferencias.
- [ ] **Quitar una tarjeta guardada** desde Mi cuenta (Pagos) y el Wallet de To'Latino.
- [ ] **Depósitos de citas, boletos y apartados** (comisiones 8 %, 5 % + $1, 6 % ya están en `fee_rules`): llegan con sus
      bloques. Super Admin › Planes › Comisiones (programar cambios con 30 días) también.
- [ ] **Recibo por correo** del pedido pagado (Fase 2, con el correo).

## Repartidor (bloque 2l, 6 nov 2026)
- [ ] **App de tienda (Capacitor)** «To'Latino Repartidor» apuntando a `/repartidor` (decisión B) con su ícono; ubicación
      en vivo con permiso del sistema (mapa en vivo para el cliente y el negocio, plan §1.4) y push. _Ubicación en vivo y mapa del cliente y del negocio: hechos en 8e (11 nov; ver «Fase 8 · 8e»); la cáscara existe desde 8a y el push desde 8c. Faltan la firma y las tiendas (8h)._
- [ ] **Llamada y mensaje enmascarados** (hoy el botón llama al número real del cliente, solo mientras la entrega está activa).
- [ ] **Prueba de entrega** (foto, código del cliente) y **código de recogida** del negocio.
- [ ] **Ofertas con cuenta regresiva y asignación automática**; entregas múltiples (batch); programados con recordatorio.
- [ ] **Super Admin › Repartidores (ADM-DLV)**: lista, 360°, incidencias (cola) y sanciones.
- [ ] **Repartidores de To'Latino** (registro, verificación, payout por Stripe Connect): «más adelante», por ciudad.
- [ ] **Accesibilidad:** el botón base ya es accesible (guardián `botonAccesible`); revisar el resto de piezas del sistema
      que usan `div` con onClick (auditoría por clase, decisión T).

## Plan Pro (bloque 2m, 6 nov 2026)
- [ ] **Reloj del servidor** (systemd timer o similar) que llame al proceso del plan cada hora, además del proceso «al usar
      la app» de hoy: que el día 30 llegue aunque nadie entre.
- [ ] **Super Admin › Planes** (secPlan): suscripciones, MRR, extender prueba, cortesía, precio y comisiones programadas
      con 30 días (fee_rules ya lo soporta en datos).
- [ ] **Recibo por correo** de cada cobro de Pro e **impuesto** si aplica (consultar con el contador antes de la fase 9).
- [ ] **3D Secure fuera de sesión** en renovaciones: si el banco pide verificación, avisar al dueño con un enlace para
      confirmar (hoy cuenta como intento fallido).

- **Mensajes (2p):** tiempo real con WebSocket/SSE en vez de preguntar cada 4–5 s; fotos en el chat; «El Compa contesta
  por ti» y «Sugerir respuesta» (Fase 4); mensajes vecino ↔ vecino (Comunidad); traducción ES↔EN sugerida; aviso push.

- **Correo (2q) · para encender en producción:** cuenta de Amazon SES fuera del «sandbox» de SES, dominio verificado con
  DKIM y SPF (+ DMARC) en Cloudflare, y en los secretos del entorno `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`,
  `SES_REGION`, `CORREO_DE` (p. ej. recibos@tolatino.com) y `TOLATINO_URL`. Rebotes y quejas (SNS → webhook) para dejar de
  mandar a correos que rebotan. Reloj propio para reintentos (hoy: perezoso, al usar la app). Resumen semanal (Comunidad).

- **Disputas (2r):** suscribir el webhook de Stripe a `charge.dispute.created/updated/closed`; adjuntar archivos de
  evidencia (foto de entrega, recibo en PDF) por la API de archivos de Stripe; alerta al equipo 3 días antes del plazo.
- [ ] **Accesibilidad del sistema de diseño (bloque propio, antes de la fase 9):** quedan 193 `onClick` en `<div>/<span>` sin
      rol ni teclado en `packages/ui/src/ds` (AdminBar 23, Thread 18, SiteHeader 17, Patio 11, DeliveryPrefs 10, OnbTopBar 10,
      CompaFrame 10, MenuItemRow 9…). Se corrigen con nombre y estado en `scripts/portar-sistema.mjs` (como Button, IconButton,
      PostCard, Chip y el Booking); el guardián `sistemaClicMudo` no deja que suban y pide bajar el tope.
- [ ] **Fotos privadas de ayuda y de citas:** las fotos de «Ayuda con la cita» (recibos, cómo quedó) y las de referencia de
      una cita se guardan con dirección imposible de adivinar pero pública (`/medios/n/…`). Antes de abrir: moverlas a
      `privado/` y servirlas con permiso (la persona, el negocio de esa cita y To'Latino).
- [ ] **Impuesto de Auto y Hogar (validar con contador):** el diseño dice «6 % de PA solo en piezas o materiales». En PA la
      mano de obra de reparación de vehículos suele ser gravable y en mejoras a inmuebles el contratista paga el impuesto
      de los materiales. Antes de producción: confirmar la regla y dejarla en datos por ciudad y categoría (bloque 4d).
- [ ] **Ley HIC de PA (contratistas del hogar):** el fundador decidió no mostrarla; el servidor topará el depósito de
      trabajos de Hogar de más de $1,000 a un tercio (bloque 4b/4d). Confirmar con abogado antes de abrir.


## Fase 4 · 4d (estimado y dinero de Auto y Hogar)
- [ ] Plantillas del estimado para producción: hoy son las líneas de ejemplo del prototipo (solo en pruebas). El fundador
      aprueba la lista por categoría (o se arranca sin plantillas).
- [ ] Renovar retenciones de más de 7 días corre al abrir el panel (Hoy). En producción: tarea programada cada hora
      (mismo `repararEstimados`), para que no dependa de que el negocio abra el panel.
- [ ] Rechazo de tarjeta al aprobar el estimado: sigue el mismo camino del Booking (error, elegir otra), sin prueba
      punta a punta propia todavía. Agregarla con la tarjeta 0002.
- [ ] Si la base falla justo después de retener (entre la pasarela y el commit), la retención queda suelta hasta que
      Stripe la suelte (7 días). Conciliación diaria contra Stripe (PaymentIntents `requires_capture` sin fila).
- [ ] Validar con el contador: impuesto de PA solo sobre piezas/materiales en reparaciones de carro y de casa (tax_rules).

## Fase 4 · 4f (planes)
- [ ] El barrido de planes (cobro del período, próxima visita, fin de la pausa) corre al abrir el plan o el panel de Hoy.
      En producción: tarea programada cada hora (`barrerPlanes()` sin filtro) para que los cobros no dependan de que alguien
      mire.
- [ ] Planes semanales, quincenales, por temporada y por nevada: hoy se piden llamando; decidir si entran en la app.
- [ ] Recordatorio 24 h antes de cada visita del plan: usa el de las citas (3c); confirmar que sale para citas de $0.

## Fase 4 · 4f-2 (renta de herramienta)
- [ ] El barrido de rentas (vencer apartados de 48 h, aviso de tarde, renovar depósitos de más de 6 d 20 h, daños sin
      respuesta en 72 h) corre al abrir la renta o el panel de Hoy. En producción: tarea programada cada hora
      (`barrerRentas({})`).
- [ ] Editor de artículos de Tienda/Renta en el panel (nombre, precio por día, depósito, unidades, foto): llega con
      Tiendas; mientras, los artículos salen de datos.
- [ ] Si el depósito no se pudo renovar (el banco ya no deja), hoy solo se avisa al negocio: decidir si se le pide al
      cliente devolverla antes.
- [ ] Rentas en Super Admin › Transacciones (pestaña propia junto a citas y pedidos): bloque 4g.

## Fase 4 · 4f-3 (apartar productos)
- [ ] El barrido de apartados (sin respuesta a tiempo, no pasó en 48 h) corre al abrir el apartado, la ficha o el panel de
      Hoy. En producción: tarea programada cada 15 min (`barrerApartados({})`).
- [ ] «Avisos por SMS» del apartado: salen cuando estén las llaves de Telnyx (lista del fundador); hoy quedan en la
      bandeja de avisos y el SMS en modo pruebas.
- [ ] Editor de artículos de Tienda en el panel (precio, existencia, foto, nueva/usada, medida): con Tiendas.
- [ ] Apartados en Super Admin › Transacciones y en Mi cuenta: bloque 4g.

## Fase 4 · 4g-2 (ayuda con la visita)
- [ ] Reserva de garantía a $0 desde la ayuda aceptada («que vuelva sin cargo»): Booking con `warr` (sin depósito ni
      retención) en vez de coordinar por Mensajes.
- [ ] Si se devuelve más que un cobro (estimado + «algo más»), hoy sale del de más saldo: repartir entre cobros.

## Fase 4 · 4g-3
- [ ] Analítica de Hogar y Auto: aprobado vs. cobrado, llegó en la franja, tiempo de respuesta a emergencias, % de
      pre-estimados que terminan en cita.
- [ ] Configuración en el Super Admin: plazos (pre-estimado 24 h, presupuesto 48 h, emergencia 15 min, apartado 48 h) y la
      regla de impuesto (tax_rules) editables con motivo; hoy viven en el código y en datos.
- [ ] «Devolver» desde Transacciones para cobros de planes y rentas.


- [ ] **DATOS_SECRET (4j):** respaldar la llave del cifrado de columna de producción (op_private) en un lugar seguro fuera del servidor; sin ella, las notas vivas (máx. 30 días) quedan ilegibles.

- [ ] **Pro · cobrar en la app (4l):** hoy nada de Profesionales se cobra en la app (Preguntas #1 del plan Salud/Pro: honorarios de abogados, IOLTA, CROA). Verificar con abogado antes de encender cobros para los no legales.
- [ ] **Salud · HIPAA (4j):** consulta legal sobre si To’Latino es «business associate» de los consultorios antes de producción (Preguntas #2).

## Fase 4 · 4m (Doctores y Profesionales: reseñas y ayuda)
- [ ] Acceso «vidrio roto» del Super Admin a una foto o nota de Salud: hoy queda en la auditoría al abrirla; falta pedir un
      motivo escrito antes de mostrarla (plan §3).
- [ ] La lista de términos de PRIVADO (`lib/resenas-filtro.ts`) es corta (diagnósticos y medicinas comunes): ampliarla con
      un listado revisado por alguien de salud antes de abrir, y medir falsos positivos en reseñas reales.
- [ ] Fotos privadas de ayuda: confirmar en el servidor real que Garage borra el objeto (el sandbox lo prueba contra el Garage local).
- [ ] Configuración (Fase 5): hacer editables los plazos de Doctores y Profesionales **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). (2 h «no aceptamos su seguro», 24 h
      cancelar, 30 d total por escrito, 24/48 h ayuda, 30 d notas, 90 d fotos de ayuda).

## Fase 4 · 4p (pedido del mercado)
- [ ] «Pedir OK por $X más» cuando el peso real pasa lo retenido (hoy el mercado tiene que cortar menos).
- [ ] Sustituto que se vende por libra (hoy solo por unidad).
- [ ] Envío del mercado con repartidor propio en /repartidor (hoy «Va en camino» / «Entregado» los marca el mercado).
- [ ] Recordatorio a los 10 min si el cliente no toca «Está bien, cobrar» (hoy se cobra lo real al recoger o entregar).
- [ ] Pruebas viejas que borran datos compartidos del sandbox (pagos2d borra todas las cuentas de cobro y tarjetas): aislarlas.
- [ ] **Layaway (4r) — leyes por estado sin verificar:** PA/NJ/NY tienen reglas de layaway (aviso por escrito, devolución,
  cargos máximos). Hoy la red es el acuerdo por escrito aceptado (texto, hora, IP, versión, inmutable). Revisar con abogado antes
  de la fase 9 y ajustar `lay_cancel_pct` máximo por estado. También: Super Admin › Transacciones con el detalle del plan
  (pagado / falta / atrasado) y la cola de cancelaciones disputadas van en 4s.

- [ ] **QtyStepper (sistema de diseño) sin teclado ni nombre accesible** (7 nov, 4y-1): los botones − / + son `div` con onClick, sin role ni aria-label. Lo usan el Booking de viajes, el carrito y los productos. Arreglarlo en `packages/ui` (role=button, tabIndex, aria-label «Uno menos / Uno más») y ampliar el guardián botonAccesible a `packages/ui/src/ds`.

- [x] **Barrido central (sin él no se vence nada si nadie mira)** — HECHO en el sandbox (0078, servicio «barrido», guardián barridoCompleto). Falta repetirlo en el docker-compose de PRODUCCIÓN cuando se encienda (fase 9) (7 nov, 4y-3b): vencer solicitudes y liberar retenciones (citas, fiestas, viajes, mercado, apartados), precios y totales vencidos, recordatorios y el aviso «tu salida todavía no sale» solo corren cuando alguien abre una página. Hace falta un proceso que los corra cada minuto (endpoint interno con token del entorno + servicio del docker-compose que lo llama). Bloque siguiente a 4y-3b.
- [ ] **Noche · licencia de licor (PLCB):** hoy es un sello que no bloquea nada y la lista legal no está revisada. Antes de abrir,
  revisar con abogado si hace falta algo más (hookah, after-hours después de las 2 AM, promotores). (4na, 7 nov)
- [ ] **Noche · noches especiales con boleto:** se guardan pero no salen en la ficha hasta la Fase 6 (Eventos). (4na, 7 nov)
- [ ] **Noche · plazos en Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). 60 min para responder una mesa, corte de las 6 PM, 30 min de mesa guardada y 60 min
      de «la fila ahora» son constantes del código (`lib/noche-reservas.ts`, `lib/noche-comun.ts`). (4ne, 7 nov)
- [ ] **Noche · demo del sandbox:** la semilla 0023 no trae listas, mesas, reseñas ni ayudas de ejemplo; para revisar Transacciones ›
      Noche, las colas y la Analítica en el sandbox hay que crearlas usando la app (o agregar una semilla de operaciones `is_test`). (4ne, 7 nov)
- [ ] **Niños · ChildLine y obligaciones de reporte:** verificar el número de ChildLine de PA (1-800-932-0313) y revisar con abogado qué
      debe hacer To'Latino si recibe un reporte de maltrato; textos y registros de licencias DHS, escuelas, CDL y PennDOT sin verificar. (plan 4e, 7 nov)
- [ ] **4ee → 4eg:** Super Admin › Transacciones › **Inscripciones** (matrícula retenida/cobrada/devuelta/se quedó, plan por escrito) y las colas «Grupos que no abrieron», «No me dejan cancelar» y «Retenciones que fallaron» quedan para 4eg (Super Admin del grupo). Hoy se ven en el panel del negocio y en la base.
- [ ] **4ee:** el plan de pagos de una escuela no manda recordatorios de cuota (se pagan en la escuela); decidir si se avisa a la persona unos días antes de cada cuota.
- [ ] **Educación + Niños + Deporte · Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). los plazos (24 h para responder, 48 h de la oferta de la lista de espera, 72 h de
      la baja de una membresía, 30 días de la purga de los datos del niño, 3 grupos en 90 días) son constantes del código (`lib/inscripciones.ts`). (4eg, 7 nov)
- [ ] **Cuidado de niños · protocolo:** el SLA de 4 h de la cola y qué hace Soporte con un caso (llamar al lugar, ChildLine) necesitan un
      protocolo escrito con abogado antes de abrir. (4eg, 7 nov)

- [ ] **4ia · Iglesias · sellos y ley:** verificar con abogado los textos y registros de `pa_funeraria` (State Board of Funeral Directors de PA), `fe_doj` (EOIR)
      e `irs_501c3` (IRS EO Search); la FTC Funeral Rule (lista general de precios por escrito) y si «plan de pagos · hasta 12 pagos» necesita aviso.
      Diezmo y donativo en línea no se construyen (§6 #1); si se piden, van con su plan (recibos, 501(c)(3)). (4ia, 7 nov)
- [ ] **4ib · Vivienda justa:** revisar con un abogado la lista de frases (ES/EN, `lib/vivienda-justa.ts` y Catálogo › Vivienda justa), el pie
  «Igualdad de oportunidad en la vivienda», la nota de animales de servicio y de apoyo, la excepción de vivienda para mayores de 62 (HOPA) y la de
  compañeros de cuarto, y la Pennsylvania Human Relations Act (más ordenanzas locales sobre fuente de ingreso / Section 8).
- [ ] **4ib · Depósitos en PA:** confirmar el tope de 2 meses de renta el primer año (1 mes desde el segundo; Landlord and Tenant Act) y si la
  cuota de solicitud tiene tope; hoy el servidor deja depósito ≤ 2 meses y solicitud ≤ $100.
- [ ] **4ib · Cuota estimada:** revisar las constantes de referencia de `lib/inmuebles.ts` (`EST_TASA_ANUAL` 6.75 %, `EST_MESES` 360,
  `EST_IMP_SEG_ANUAL` 2.5 %) y el texto «estimada» con un abogado (Regulation Z / publicidad de crédito); decidir quién la actualiza.
- [ ] **4ib · Licencias de Bienes Raíces:** verificar emisores y URL de registro de `pa_corredor` (PALS, State Real Estate Commission),
  `nmls_inm` (NMLS Consumer Access + PA Department of Banking and Securities), `pa_avaluador` (PALS, State Board of Certified Real Estate
  Appraisers) e `inspector_vivienda` (ley de inspectores de PA: membresía en asociación nacional); textos «puede / no puede».
- [ ] **4ic · Tope del cargo del dealer de PA:** verificar el valor del año (documentary fee del Board of Vehicles, con trámite electrónico y sin
  él) y ponerlo en Catálogo › Cargo del dealer (`platform_config.dealer_doc_fee_cap_cents`, hoy $477 «a verificar»); decidir quién lo actualiza
  cada año. Confirmar si el cargo del dealer y las placas pagan impuesto y si el carro a cambio baja el impuesto (hoy: 6 % solo sobre el precio,
  `tax_rules` NEG-DEALER).
- [ ] **4ic · Buyers Guide (FTC Used Car Rule):** revisar con un abogado que «Se vende como está» y la garantía del dealer de la app coincidan con
  la Buyers Guide de la ventana (ES/EN), y si la ficha (4id) debe enlazar la Buyers Guide de cada carro.
- [ ] **4ic · Regulation Z (publicidad de crédito):** revisar el pago de ejemplo (enganche, meses, APR, «estimado, sujeto a aprobación», total de
  pagos), el de compre aquí pague aquí (total pagado y la tasa que resulta) y la decisión de no poner enganche ni pago en la tarjeta del buscador;
  confirmar los topes de tasa de la Motor Vehicle Sales Finance Act de PA (hoy el servidor deja 0–30 %).
- [ ] **4ic · Retiros del fabricante (recalls):** consultar los retiros abiertos de cada VIN con los datos públicos de NHTSA (sin pagar) y
  decidir cómo se muestran (§6 #11).
- [ ] **4ic · Licencias de Venta de Autos:** verificar emisores y URL de registro de `pa_dealer` y `pa_vendedor_autos` (PALS, State Board of
  Vehicle Manufacturers, Dealers and Salespersons), `pa_venta_plazos` (licencia de venta a plazos del Department of Banking and Securities: si
  vive en NMLS) y `nmls_dealer`; textos «puede / no puede».
- [x] **4id · Punto del negocio en la tarjeta de categoría** (resuelto el 7 nov: lista, ficha, relacionados, mapa y Ciudad sacan el punto de
  `PUNTO_PUBLICO`, que redondea a ~500 m a quien trabaja desde casa; quien renta en su propia dirección pasa solo a «desde casa»; guardián
  `puntoPublico`). Antes: la tarjeta del buscador manda la ubicación del negocio aunque trabaje desde casa
  (p. ej. quien renta cuartos en su casa). La ficha ya no la muestra para cuartos; revisar la tarjeta y el mapa (zona aproximada) antes de abrir.
- [ ] **4id · Pie de vivienda justa y nota de animales de servicio en la ficha:** confirmar con abogado el texto ES/EN y si va el logo de Equal
  Housing Opportunity (HUD) junto al texto.
- [ ] **4ie · Ayuda con la visita / la prueba / la iglesia:** hoy `/vis/…` solo ofrece Mensaje; la ayuda con revisión de To'Latino (motivos,
  fotos, «Posible estafa») llega con 4if (`NUM` acepta `D-`).
- [ ] **4ie · SMS de visitas** (`vis_ok`, `vis_alt`, `vis_recordatorio`, `biz_vis`…): en el sandbox quedan «en modo pruebas»; salen con el proveedor
  de SMS de producción. Revisar el texto ES/EN en el teléfono bloqueado (sobre todo los neutros `insc_fen_*`).
- [ ] **4ie · Plazo de 4 h hábiles y 24 h de «Pasó»:** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). constantes en el código hasta que llegue Configuración (Fase 5); a confirmar con el fundador.
- [ ] **4ie · Prueba de manejo en casa:** no se comprueba que la dirección esté dentro del área del dealer; seguro y responsabilidad de la prueba
  (quién maneja, seguro del dealer) a revisar con abogado antes de abrir.
- [ ] **4ie · Horas de prueba por carro:** el motor las admite; falta la pantalla si el fundador las pide.
- [ ] **4ie · Plantones:** revisar el umbral (3 en 30 días) con datos reales; hoy solo mira al negocio, no al cliente.
- [x] **4ie · Prefijo de las visitas (§6 #2), resuelto el 7 nov: las visitas usan «D-8101…»; «P-» queda para los pre-estimados.** Antes: los pre-estimados de Auto y Hogar también usan «P-» (otra tabla, `service_requests`, secuencia
  en ~2,130). No chocan en la base, pero si esa secuencia llegara a 8,101 dos números se verían iguales. Decidir otro prefijo o separar rangos.
- [ ] **4if · «Posible estafa»:** la pausa es automática y no cancela visitas ya confirmadas de otras personas; revisar con el fundador. Texto de
  la advertencia al negocio y escalera de sanciones (hoy solo «advertencia»; suspender va por Negocios 360°) a definir con datos reales.
- [ ] **4if · «Me lo devolvieron»:** si la persona nunca confirma ni dice que no, la solicitud queda «respondida» sin cierre automático; definir
  plazo (p. ej. 14 días) cuando llegue Configuración (Fase 5).
- [ ] **4if · Reseñas de Iglesias sin fotos:** decisión por defecto (nadie sale en una foto sin saberlo); si el fundador quiere fotos del lugar,
  hace falta moderación previa en la cola Medios.
- [ ] **4if · Rótulos de «Lo que importa» del prototipo sin pregunta** («El precio no cambió», «Te explican cada paso», «Arreglan a tiempo»,
  «Explican el financiamiento»): agregar la pregunta si el fundador los quiere.

- [ ] **Iglesias + Bienes Raíces + Venta de Autos · Configuración (Fase 5):** **5i:** ya se leen de Sistema › Configuración (un solo lugar, con límites) pero en SOLO LECTURA hasta que sus textos lean el valor (ver «5i · Plazos de la Fase 4» abajo). el tope del cargo del dealer (hoy en Catálogo › Cargo del dealer),
      las 4 h hábiles para responder una visita, las 24 h del «Pasó», las 48 h de Iglesias, los 14 días de aviso de una licencia y los 30 días de la
      purga son constantes del código (`lib/visitas-inm.ts`, `lib/licencias.ts`); la lista de frases de vivienda justa ya vive en Catálogo. Pasan a
      Configuración cuando llegue. (4ig, 7 nov)
- [ ] **4ig · Búsqueda por propiedad o por carro (§6 #10):** recámaras, precio, año y millaje tienen datos e índices; falta componer la pantalla
      con el sistema de diseño y el OK del fundador. Hoy la categoría y Buscar filtran negocios con `filter_values`. (4ig, 7 nov)
- [ ] **4ig · Licencias de las demás categorías:** el barrido devuelve a la cola «Licencias» las de Iglesias, Bienes Raíces y Autos 14 días antes
      de su revisión (y con prioridad si pasó); las de Profesionales, Salud, Niños, Educación, Transporte, Fiestas y Noche todavía no vuelven
      solas. Decidir si se extiende a todas (es una línea en `CATS_LIC_4I`). (4ig, 7 nov)
- [ ] **4ig · Colas › Vivienda justa:** protocolo escrito con abogado (cuándo un texto frenado es error de buena fe y cuándo advertencia; qué se
      revisa en una declaración de vivienda para mayores bajo HOPA) y la escalera después de la advertencia (hoy suspender va por Negocios 360°). (4ig, 7 nov)
- [ ] **4ig · Punta a punta en 9 dispositivos y en CI:** la CI de GitHub corre tipos, build, guardianes, contrato con Stripe, firma SES, imagen
      del sandbox, migraciones dos veces y la semilla dos veces; **no** corre las pruebas de punta a punta con Playwright ni en 9 dispositivos. Las
      pruebas del grupo (`fe4ia`, `inm4ib`, `autos4ic`, `fic4id`, `vis4ie`, `ayu4if`, `adm4ig`) corren en local en teléfono 390 y escritorio
      1360. Falta la matriz de 9 dispositivos en la CI. (4ig, 7 nov)

- [ ] **5a · Comunidad, abogado (§3):** Sección 230 y Términos de la Comunidad versionados con las reglas del barrio; protocolo de material de
      abuso infantil (NCMEC, preservación); acoso (18 Pa.C.S. § 2709); difamación en recomendaciones; avisos de operativos de inmigración. (5a, 7 nov)
- [ ] **5a · Dirección de una persona → cola `rep`** (hoy se rechaza al escribir); placas de carro; listas `spam`, `hate`, `migra`, `estafa`,
      `autolesion` y la moderación de imágenes (modelo propio) llegan en 5d. Hoy las fotos de la Comunidad pasan por el mismo `/api/medios` (sin EXIF
      ni GPS) sin revisión automática. (5a, 7 nov)
- [x] **5a · Límites de la Comunidad en Configuración:** — **Hecho en 5i:** `config_keys` (0105) con límites y auditoría; día local desde 5d. 10 publicaciones en 24 h (5 la primera día) son constantes de `lib/comunidad.ts`;
      pasan a `config_keys` con «día local» en 5i. (5a, 7 nov)
- [ ] **5a · Velocidad con 1 M publicaciones** (`scripts/carga/comunidad-1m.mjs`, p95 ≤ 50 ms del muro): no se corrió; en la base del sandbox el
      plan usa `com_posts_hot_idx` sin ordenar aparte (comprobado con `EXPLAIN`). (5a, 7 nov)
- [ ] **5a · Foto de portada del muro de registro:** el prototipo usa una foto de Pexels; va sin foto hasta que el fundador elija una propia. (5a, 7 nov)
- [x] **5a · Admin › Contenido pagina con `offset`** — **Hecho en 5i:** cursor (← →), sin offset. (venía de 2i); pasa a cursor con el resto de Contenido en 5i. (5a, 7 nov)
- [x] **5b · Avisos de la Comunidad sin grupo ni interruptor propio:** — **Hecho en 5i:** grupo `community`, «Respuestas y votos», «Mensajes de vecinos» y resumen diario en Mi cuenta › Avisos. las plantillas `com_*` van en el grupo `tx` sin preferencia que las apague
      (la campana, nunca SMS). El grupo «Comunidad» y su interruptor en Mi cuenta › Avisos llegan con Notificaciones en 5i. (5b, 7 nov)
- [ ] **5b · Puntos del hilo:** votos que cuentan, «Me sirvió» (+10 y su reverso al cambiarla) y respuestas no dan puntos todavía; el lugar está
      marcado «HOOK 5f» en `votar` y `meSirvio` de `lib/comunidad-hilo.ts`. Los mensajes no prometen puntos. (5b, 7 nov)
- [ ] **5b · Comentario: reportar, bloquear y editar:** el menú del comentario hoy trae Borrar (lo propio) y «Esta me sirvió más» (quien
      preguntó). Reportar llega en 5d, bloquear y silenciar en 5c; editar un comentario (30 min, `com_edits`) no está en el prototipo: decidir. (5b, 7 nov)
- [ ] **5b · Velocidad del hilo con 1 M publicaciones y 5 M comentarios** (hilo de 500 comentarios en 20 raíces ≤ 60 ms; votar ≤ 30 ms): no se
      corrió; en el sandbox las raíces salen de `com_comments_hilo_idx` sin ordenar aparte (`EXPLAIN` en `com5b`). (5b, 7 nov)
- [ ] **5b · Resultado de encuestas muy grandes:** `avisarMuchos` escribe de 1,000 en 1,000 en una consulta; medir con una encuesta de 100 mil
      votos antes de abrir. (5b, 7 nov)
- [ ] **5b · Punta a punta en 9 dispositivos:** `com5b` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la matriz de CI. (5b, 7 nov)
- [x] **5c · Reportar a una persona** desde su perfil (hueco #4; hecho en 5d) y **«Abrir caso de red de cuentas»** (hecho en 5i) desde Usuarios 360° › Comunidad: van
      con la cola `repUsr` de 5d. (5c, 7 nov)
- [ ] **5c · Monedas de bienvenida (+100):** el gancho está marcado «HOOK 5g» en `bienvenida()`; las acredita 5g a quien tiene
      `welcome_at` y `adult`. (5c, 7 nov)
- [ ] **5c · Avisos viejos sin autor:** los avisos de la Comunidad anteriores a 0099 no tienen `actor_user_id` y un bloqueo no los esconde;
      en el sandbox son de prueba. En producción no existen (la Comunidad abre con 5c en adelante). (5c, 7 nov)
- [ ] **5c · Mensajes en tiempo real:** la conversación abierta pregunta cada 5 s; con mucho uso, medir y pasar a un canal propio
      (SSE) antes de abrir. (5c, 7 nov)
- [x] **5c · «10 conversaciones nuevas al día»** ~~cuenta 24 h corridas~~ — hecho en 5d: todos los límites de la Comunidad cuentan el día
      local de la ciudad, con la mitad el primer día de la cuenta (`lib/moderacion.ts` limiteDia; valores en Contenido › Auto-moderación).
- [ ] **5c · Velocidad** de Mensajes y listas de seguidores con 1 M de vecinos (índices `dm_threads_a/b_idx`, `follows_seguidos_idx`): no
      se corrió la base de carga. (5c, 7 nov)
- [ ] **5c · Punta a punta en 9 dispositivos:** `com5c` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la
      matriz de CI. (5c, 7 nov)
- [ ] **5c · Revisión de seguridad con abogado:** 18+ por declaración (COPPA si algún día se abre a 13–17), retención de mensajes
      privados y lectura solo con reporte (Términos y Privacidad lo deben decir). (5c, 7 nov)
- [ ] **5d · Abogado: Sección 230 y DMCA §512.** Términos de la Comunidad con las reglas, la moderación de buena fe y la apelación; **agente
      DMCA designado en la Copyright Office** (tiene un costo y no está en PLAN §8 → **decisión del fundador**), formulario de retiro y
      política de reincidentes. Sin eso no se abre la Comunidad. (5d, 7 nov)
- [ ] **5d · Licencia del modelo de fotos:** NudeNet 3.4.2 es MIT según su paquete; sus pesos se entrenaron con YOLOv8 (Ultralytics reclama
      AGPL-3.0 sobre pesos entrenados con su código). Confirmar con abogado o cambiar de modelo antes de producción. (5d, 7 nov)
- [ ] **5d · Revisar las listas de términos** (odio · estafa · inmigración · autolesión, ES/EN; semilla corta en 0100) con el fundador y con
      vecinos de cada ciudad: palabras locales, falsos positivos («ice», «migra»). (5d, 7 nov)
- [ ] **5d · Imagen del servicio de fotos sin construir aquí:** Docker Hub respondió 429 desde este entorno; se probó el servicio con el
      mismo código y las mismas versiones fijadas (ruedas de PyPI para Python 3.12 verificadas) fuera de Docker. Confirmar que `deploy.sh`
      lo levanta en el sandbox y medir memoria junto con el traductor de 5h (§6 #24). (5d, 7 nov)
- [ ] **5d · Fotos: violencia y texto promocional** no tienen modelo (NudeNet solo mide desnudez); hoy los decide una persona en Medios
      marcados. Solo las fotos de la Comunidad pasan por el modelo; reseñas y negocios siguen con el reporte de vecinos. (5d, 7 nov)
- [ ] **5d · No se probó el modelo con una foto de desnudez real** (solo fotos limpias y el servicio caído); probar el umbral 0.6 con un
      juego de fotos de prueba aprobado antes de abrir. (5d, 7 nov)
- [ ] **5d · Apelar una suspensión o un baneo:** la persona no puede entrar, así que hoy lo pide por Soporte; falta la pantalla de apelar
      desde «Entrar» (con el código por SMS, sin sesión). (5d, 7 nov)
- [ ] **5d · NCMEC (abuso infantil):** protocolo de preservación y reporte al CyberTipline (18 U.S.C. § 2258A) con abogado; hoy un Admin
      oculta y preserva a mano. (5d, 7 nov)
- [ ] **5d · Velocidad de moderación con 1 M:** `autoOcultar` (reportes de un contenido), `revisarAlEscribir` (parecidos con pg_trgm sobre lo
      de la persona en 24 h) y `redDeCuentas` (votos de 7 días) no se midieron en la base de carga. (5d, 7 nov)
- [ ] **5d · Punta a punta en 9 dispositivos:** `com5d` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta sumarlo a la matriz
      de CI. (5d, 7 nov)
- [ ] **5e · Velocidad de Hoy y de Recomendados con 1 M:** `hoyEnElBarrio` (índice `business_posts_hoy_idx`, presupuesto ≤ 40 ms) y
      `recomendadosPorVecinos` (agrega 180 días por ciudad en cada vista de Negocios) no se midieron en la base de carga; si no cumple,
      Recomendados pasa a derivado cacheado (con 5f). (5e, 7 nov)
- [ ] **5e · Aviso «Hoy en un negocio que sigues» a muchos seguidores:** el barrido escribe a todos los seguidores de un golpe (lotes de
      1,000); con negocios de decenas de miles de seguidores hace falta repartirlo en varias pasadas y medirlo. Push real llega con la app. (5e, 7 nov)
- [ ] **5e · Hoy y la cuenta oficial en los 9 dispositivos:** `com5e` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta en la
      matriz de CI. (5e, 7 nov)
- [x] **5e · Puntos y Tabla sin la cuenta oficial:** hecho en 5f: el libro y la Tabla piden una persona (`user_id not null references
      users`), `pts_sumar` rechaza sin persona, lo oficial no da puntos y toda lectura va unida a `users` (guardián `oficialNoEsPersona`
      ampliado, probado al revés; e2e `com5f`). (5f, 7 nov)
- [ ] **5e · Foto propia de la cuenta oficial por ciudad** (`city_official_accounts.photo_media_id`): hoy sale el logo de To'Latino; falta
      dónde subirla en Contenido › Cuenta oficial si el fundador quiere una por ciudad. (5e, 7 nov)
- [x] **5f · Monedas del premio del mes:** `tabla_cerrar` deja 200 monedas anotadas a cada uno de los 3 primeros (`monthly_boards.prize_coins`);
      las acredita el libro de monedas de 5g (también las de los cierres anteriores a 5g). (5f, 7 nov) — **Hecho en 5g:** trigger del cierre
      `board_closures_premios` → `mon_premios_mes` (una vez por persona y mes); la migración 0103 acreditó los meses ya cerrados. Probado en `com5g`.
- [x] **5f · Reporte de canjes en «Cerrar el mes»** (paso 4): hoy dice 0 canjes porque los cupones llegan en 5g; conectar al libro de cupones. (5f, 7 nov)
      — **Hecho en 5g:** `board_closures_reporte` cuenta los canjes del mes de la ciudad (`canjes`, `canjes_usados`) al cerrar.
- [ ] **5f · Velocidad de la Tabla y del rango con 1 M de publicaciones** (`scripts/carga/comunidad-1m.mjs`, presupuesto Tabla ≤ 40 ms): la
      Tabla usa índices `(city_id, month, puntos desc, user_id)` y cursor; «mi lugar» cuenta los de delante (índice), y `pts_rango` mira la
      escalera con `limit n`. Medir en la base de carga aparte y anotar las cifras. (5f, 7 nov)
- [x] **5f · Notificación «Subiste de rango» en la app (push):** (hecho en 8c: va por push con la misma regla) hoy queda en la campana (sin SMS, `gam_*`); el push llega con la app. (5f, 7 nov)
- [ ] **5f · Puntos y Tabla en los 9 dispositivos:** `com5f` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta en la matriz de CI. (5f, 7 nov)
- [ ] **5f · Condiciones de los rangos editables** (además del nombre): hoy el admin cambia nombres, valores de las reglas y el tope; los
      puntos mínimos y las condiciones viven en `ranks.min_points` / `ranks.cond` y se cambian con migración. Si el fundador los quiere en
      Gamification, se agregan con vista previa y auditoría. (5f, 7 nov)
- [ ] **5f · Invitados que «participan» por pedidos:** cuenta cualquier operación no cancelada; revisar con el fundador si un pedido de $1
      basta para Capitán (anillos de invitaciones). (5f, 7 nov)
- [x] **5g · Escanear el código del cupón** en el panel (cámara, QR): hoy se escribe (no hay escáner en ningún lado del panel). Llega con la
      app Negocios (Capacitor) o con un lector propio; el servidor ya valida igual. (5g, 7 nov) _Hecho en 8e (11 nov): «Escanear cupón» en el panel (app Negocios y web) con el lector de la Puerta; el código del vecino trae su QR._
- [ ] **5g · Validar un código desde «Hoy»** para quien solo tiene acceso a «Hoy y pedidos»: la acción ya lo permite (`cupValidar` acepta
      «Tu página» u «Hoy y pedidos»), pero el campo vive en Tu página › Cupones por monedas. Componer el bloque en Hoy. (5g, 7 nov)
- [ ] **5g · Abogado:** monedas sin valor en dinero y cupones (leyes de tarjetas de regalo y de bienes no reclamados; premios del mes sin
      compra = no es sorteo); Términos de la Comunidad con «Sin valor en dinero · no se compran, no se venden, no se transfieren, no vencen».
      (5g, 7 nov)
- [ ] **5g · Velocidad con 1 M:** cupones de una ciudad (`coupons_ciudad_idx` + un conteo del mes por cupón, 20 por página), mis cupones y
      movimientos (cursor por id), EN CIRCULACIÓN del Super Admin (suma de `community_profiles.coins` por ciudad: si pasa del presupuesto,
      cachearla por ciudad). Medir en la base de carga. (5g, 7 nov)
- [ ] **5g · Monedas y cupones en los 9 dispositivos:** `com5g` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta la matriz
      de CI. (5g, 7 nov)
- [x] **5g · Push de los avisos de monedas y cupones** (hecho en 8c) (`gam_monedas*`, `gam_cupon_usado`, `biz_cupon_*`): hoy en la campana, sin SMS. (5g, 7 nov)
- [x] **5g · Analítica › Comunidad:** — **Hecho en 5i** (vistas por ciudad y día, sin personas). monedas emitidas y canjeadas, canjes por negocio (por ciudad, sin personas) — bloque 5i. (5g, 7 nov)
- [ ] **5h · LibreTranslate real en el sandbox:** aquí solo se probó con un traductor de mentira (los modelos de argos-net.com están
      bloqueados en la red de la sesión de trabajo). En el sandbox: que `tolatino-traductor` baje los modelos y quede arriba, Auto-moderación
      «RESPONDE», tiempos reales de `/translate` y `/detect` (presupuesto: traducir ≤ 3 s; detectar ≤ 1.5 s) y la memoria con moderacion-img
      en el cx33 (§6 #24). (5h, 7 nov)
- [ ] **5h · Calidad del traductor:** comparar 200 textos reales ES↔EN (Comunidad y reseñas) contra una referencia antes de abrir; si no
      alcanza, el fundador decide un traductor pago (§6 #15). (5h, 7 nov)
- [ ] **5h · Abogado:** LibreTranslate es **AGPL-3.0** (lo corremos sin modificar como servicio aparte; revisar §13 si algún día se
      modifica o se expone) y las licencias de cada modelo Argos (es→en, en→es) y de MiniSBD. Aviso en los Términos: «traducción
      automática; vale el original». (5h, 7 nov)
- [ ] **5h · Borrado de cuenta (D5):** cuando se construya la purga de textos a los 30 días, debe borrar también sus filas de
      `ugc_translations` (derivadas) para que no quede el texto traducido. (5h, 7 nov)
- [ ] **5h · Límite sin cuenta:** es por cookie del dispositivo (se puede borrar); el costo lo acota la caché (cada texto se traduce una
      vez por idioma). En producción, límite por IP en Cloudflare para la acción. (5h, 7 nov)
- [ ] **5h · Corta-circuito compartido:** hoy vive en la memoria de cada proceso de la app; con varias réplicas en producción, cada una
      corta por su cuenta (aceptable; anotar si se quiere uno común). (5h, 7 nov)
- [ ] **5h · «Ver traducción» en los 9 dispositivos:** `com5h` corre en teléfono 390 y escritorio 1360 en el sandbox local; falta la matriz
      de CI (y un traductor de prueba en CI). (5h, 7 nov)
- [ ] **5h · El Compa con «Ver traducción»** cuando llegue su fase (ayuda `ver-traduccion.md` lista). (5h, 7 nov)

- [ ] **5i · Plazos de la Fase 4 en SOLO LECTURA:** `sp_seguro_guardar_h`, `sp_total_escrito_dias`, `sp_notas_purga_dias`, `ayuda_negocio_h`,
      `noche_responder_min`, `noche_mesa_guardada_min`, `noche_fila_viva_min`, `insc_responder_h`, `insc_oferta_h`, `insc_baja_h`,
      `ninos_purga_dias`, `insc_grupos_n`, `insc_grupos_dias`, `fe_responder_h`, `vis_responder_h`, `vis_paso_h`, `vis_purga_dias` ya se leen
      de Configuración, pero los textos que ve la persona dicen el número («2 h», «24 h», «72 horas», «4 h hábiles»…). Pasar esos textos a
      leer el valor (como «Editar» en 5i) y abrir cada uno (`editable = true` en una migración). (5i, 8 nov)
- [ ] **5i · Fuera de Configuración todavía:** el corte de las 6 PM de Noche (Preguntas #3, se copia en cada reserva), los plazos de 4g-3
      (pre-estimado 24 h, presupuesto 48 h, emergencia 15 min, apartado 48 h), `free_ops_cap` (Planes) y «Me lo devolvieron» (4if, no
      existe). Decidir si entran al catálogo. (5i, 8 nov)
- [ ] **5i · Configuración en varios servidores:** la app guarda el valor 15 s por proceso (`lib/config.ts`); lo que decide la base
      (`cfg_int`) es al instante. Con réplicas en producción, un cambio tarda hasta 15 s en llegar a todas. (5i, 8 nov)
- [ ] **5i · Velocidad con 1 M:** Contenido (una consulta UNION de 6 tipos con cursor), Analítica › Comunidad (vistas que agregan desde las
      tablas; si pasa del presupuesto, pasar a un derivado por ciudad y día que rehace el barrido) y el resumen diario (500 personas por
      vuelta del barrido) no se midieron en la base de carga. (5i, 8 nov)
- [ ] **5i · Rango del negocio** (§6 #23): no se construye hasta que se diseñe la ficha. (5i, 8 nov)
- [x] **5i · Resumen diario por push o correo:** (push hecho en 8c; el correo sigue pendiente) hoy llega a la campana (la app con push llega con Capacitor). (5i, 8 nov)
- [ ] **5i · Super Admin de la Fase 5 en los 9 dispositivos:** `adm5i` corre en escritorio 1360 y teléfono 390 en local; falta la matriz de
      CI. (5i, 8 nov)
- [ ] **5i · Textos del Super Admin en inglés:** el Super Admin está en español (como el resto del admin); las etiquetas de Configuración
      ya traen ES/EN en `config_keys`. (5i, 8 nov)

## Fase 6 · 6a (base de eventos, panel, Publica tu evento, revisión)
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
- [ ] **6a · Fotos locales:** en local `/medios/…` no se sirve (lo sirve Caddy en el sandbox): carteles y fotos salen grises en las capturas
      locales. Verlos en el sandbox. (6a, 9 nov)
- [ ] **6a · Eventos en los 9 dispositivos:** `evt6a` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6a, 9 nov)
- [ ] **6a · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (los avisos y el panel sí ES/EN). (6a, 9 nov)
- [x] **6a · Catálogo de formatos y géneros editable desde el Super Admin (hueco #8):** _hecho en 6j (10 nov): Super Admin › Eventos y boletos › Catálogo (formatos, categorías y géneros con vista previa, auditoría; apagar no borra)._ hoy vive en la base (0106) y se lee de ahí; el editor
      del catálogo llega en 6j. (6a, 9 nov)

## Fase 6 · 6b (el módulo Eventos del cliente)
- [x] **6b → 6c · Comprar boletos:** _hecho en 6c (10 nov): «Boletos» abre la compra; QR real; Mis boletos en Mi cuenta._ la ficha muestra tipos, precios (cargos incluidos) y mesas con «Venta pronto»; «Mis boletos y RSVP»
      lleva a Mi cuenta › Guardados › Eventos hasta que exista Mi cuenta › Boletos. El **QR del enlace al compartir** (tarjeta con QR)
      llega con el generador de QR de código abierto de 6c. (6b, 10 nov)
- [ ] **6b · «Otro lugar» fuera de las 5 ciudades:** no se bloquea; la ciudad del evento es la del negocio. Decidir si un evento fuera del
      radio de su ciudad no se publica (plan §2 0106). (6b, 10 nov)
- [ ] **6b · Recordatorio del día antes (`rsvp_recordatorio`):** construido en el barrido (desde las 10 AM, a quien hizo el RSVP hace más
      de 1 h); el e2e prueba el de «evento guardado» y el aviso al abrir puertas, no este (la hora de creación del RSVP no se puede mover en
      la base). Mirarlo en el sandbox con un RSVP de un evento de mañana. (6b, 10 nov)
- [x] **6b · Mi cuenta › Avisos › Eventos (grupo `events` en notif_prefs):** _hecho en 6j (10 nov): grupo `events` con Boletos y cambios · Recordatorios · Eventos que guardas; lo crítico no se apaga._ llega con 6j; hoy los avisos de RSVP y de evento guardado no
      se pueden apagar por grupo. (6b, 10 nov)
- [ ] **6b · Presupuesto de velocidad con la base de carga (1 M de fechas):** la lista usa el índice (city_id, starts_at, id) where listable
      con cursor; falta medir p95 con `scripts/carga/eventos-1m.mjs` (plan §7). (6b, 10 nov)
- [ ] **6b · Eventos en el sitemap:** las fichas se indexan (metadatos, canónico y schema.org/Event), pero no hay sitemap de eventos. (6b, 10 nov)
- [ ] **6b · Eventos en los 9 dispositivos:** `evt6b` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6b, 10 nov)
- [ ] **6b · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (ficha › últimos RSVP, Pausar Eventos). (6b, 10 nov)

## Fase 6 · 6c (boletos, mesas, extras y códigos)
- [x] **6c · Transferir al organizador:** _hecho en 6e (10 nov): la liquidación del martes por fecha (lib/evt-liquidacion.ts)._ el cobro de boletos queda en la plataforma (`transfer_group` del evento); la transferencia del martes
      después de la fecha, las retenciones y el ajuste por devoluciones llegan con 6e. Hasta entonces el dinero no sale solo. (6c, 10 nov)
- [x] **6c · Devoluciones de boletos:** _6e (10 nov): la devolución total al cancelar el evento o una fecha, en lote e idempotente, hecha._ _6d (10 nov): cancelar el comprador (menos el cargo, hasta 24 h antes) y devolver desde el panel
      (100 %) hechos, idempotentes y con el reintento del barrido._ Falta la devolución total al cancelar el evento (6e); «Anular» del admin
      no devuelve dinero. (6c, 10 nov)
- [ ] **6c · 3D Secure:** si el banco pide verificación extra, se pide otra tarjeta (como el resto de la app). (6c, 10 nov)
- [ ] **6c · Máximo por persona con la huella de la tarjeta:** hoy cuenta cuenta + dispositivo + la misma tarjeta guardada (`pm_…`); con
      Stripe real conviene la huella (`card.fingerprint`) para cazar la misma tarjeta en otra cuenta. (6c, 10 nov)
- [ ] **6c · QR sin señal en el teléfono del cliente:** el QR verifica sin conexión en la puerta, pero la página del boleto necesita señal
      para abrirse; la app instalable (service worker) llega con 6h. Apple / Google Wallet: Fase 8 (§6 #17). (6c, 10 nov) _6h (10 nov): hecho —
      el boleto abierto una vez con señal se guarda cifrado en el teléfono y se ve sin señal (service worker de Mis boletos); falta probarlo en un
      iPhone (Safari puede borrar lo guardado de una web que no se abre en 7 días) y que Mis boletos guarde todos los próximos sin abrirlos uno por uno._
- [ ] **6c · QR rotativo y reventa:** _6j (10 nov): las señales de reventa ya están en Confianza; queda el QR rotativo._ QR fijo, firmado y con versión (§6 #10); el rotativo anti-captura y las señales de reventa (Confianza,
      6j) quedan para después. (6c, 10 nov)
- [ ] **6c · Contrato con Stripe de las llamadas nuevas** (`retenerPlataforma` con `transfer_group`, `capturarPlataforma` y la lectura del
      PaymentIntent): agregado a `scripts/contrato-stripe/prueba.cjs`; en local no corrió (Docker Hub 429 al bajar stripe-mock). Mirar el
      paso del CI. (6c, 10 nov)
- [x] **6c · Recordatorio del boleto («Mañana» / «¡Es hoy!», `bol_recordatorio`) y aviso de aforo 90 % (`evt_aforo90`):** _hecho en 6j (10 nov): `bol_recordatorio` y `bol_es_hoy` desde `evt_recordatorio_hora` y `evt_aforo90` al 90 % de lo vendido, una vez cada uno (adm6j)._ no se
      construyeron en 6c; llegan con 6j (avisos de Eventos). (6c, 10 nov)
- [ ] **6c · Mi cuenta › Inicio «Tu semana» con el boleto y Pagos › movimientos:** _6j (10 nov): «Tu semana» hecho (boletos, RSVP y evento privado); Pagos › movimientos sigue pendiente: ver «Fase 6 · 6j»._ los boletos están en Mi cuenta › Boletos y en
      Accesos; «Tu semana» llega con 6j. (6c, 10 nov)
- [ ] **6c · Llave del QR de producción:** `deploy.sh` del sandbox la genera; el despliegue de producción (fase 9) debe generarla igual
      (una por entorno) y nunca copiar la del sandbox. Rotar = nueva llave + `qr_keys.retired_at` de la vieja. (6c, 10 nov)
- [ ] **6c · Abogado:** ley de reventa de boletos de PA, impuesto de diversiones (amusement tax) por ciudad, To'Latino como comerciante del
      cobro (1099-K del organizador), política de devoluciones en los Términos. (6c, 10 nov)
- [x] **6c · `scripts/portar-sistema.mjs` no es idéntico a lo que hay en el repo:** al correrlo para el parche de TicketQR también
      deshacía arreglos de accesibilidad hechos a mano en `community/PostCard.js` y `community/Thread.js` (se restauraron a mano). Pasar
      esos arreglos al script. (6c, 10 nov) — _Hecho (10 nov): el «⋯» de PostCard y los dos de Thread son parches en el script; el script
      ahora produce exactamente lo que hay en el repo (comprobado en una copia aparte, dos veces). Guardián nuevo `sistemaSincronizado`:
      corre el script en una carpeta temporal y falla si un archivo portado o los tokens no son idénticos (probado al revés: un arreglo a
      mano y un parche quitado fallan)._
- [ ] **6c · `QtyStepper` del sistema sin rol ni teclado** (los «+» y «−» son `div`): lo usan el menú y la pantalla de boletos; parche
      de accesibilidad como el de Button. (6c, 10 nov)
- [ ] **6c · Eventos en los 9 dispositivos:** `evt6c` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6c, 10 nov)
- [ ] **6c · Textos del Super Admin de boletos en inglés:** como el resto del admin, en español. (6c, 10 nov)

## Fase 6 · 6d (después de comprar: transferir, cancelar, cortesías, lista de espera, ayuda B-)
- [ ] **6d · SMS de verdad para «Te mandaron un boleto», «Tienes una cortesía» y «Se liberó un lugar»:** salen con la clave del proveedor
      (Telnyx, decisión E2). Hoy: con cuenta llegan en Avisos; a un número sin cuenta solo queda el SMS (`phone_messages`, en el sandbox
      en modo pruebas). Hasta conectarlo, quien recibe sin cuenta no se entera: los textos ya dicen «le avisamos a ese teléfono». (6d, 10 nov)
- [ ] **6d · Compartir el enlace de una transferencia** (WhatsApp, copiar): sin diseño; el enlace solo lo recibe ese teléfono, así que
      compartirlo es seguro. Útil mientras no haya SMS. (6d, 10 nov)
- [ ] **6d · Lista de espera de eventos gratis con cupo («cupo lleno»):** no se construyó (el RSVP no aparta; libera a las puertas + 30 min).
      Si se quiere, oferta de 30 min que guarda el RSVP. (6d, 10 nov)
- [ ] **6d · Oferta de la lista de espera de noche:** respeta las horas de silencio (el SMS espera; el aviso llega en Avisos); 30 min pueden
      vencer sin verse. Decidir si es crítica o si no se ofrece de noche (REVISION 6d). (6d, 10 nov)
- [ ] **6d · Devolución que Stripe nunca hace** (tarjeta cerrada, cuenta con disputa): queda «pendiente» y el barrido la reintenta para
      siempre con su llave (`refunds.attempts`, `last_error`). Falta la alerta en Dinero / Confianza pasado N intentos y el camino manual. (6d, 10 nov)
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
- [ ] **6d · Abogado:** política de cancelación del comprador (24 h, menos el cargo) y de transferencia (sin precio) en los Términos; ley de
      reventa de PA. (6d, 10 nov)


## Fase 6 · 6e (cambios del evento y dinero del organizador)
- [ ] **6e · Contrato de `pasarela.cliente` (POST /v1/customers):** lee la base antes de llamar a Stripe y el contrato corre sin base; es la
      única llamada a Stripe fuera de `scripts/contrato-stripe/prueba.cjs` (guardián `contratoCubreLaPasarela` la deja anotada). Darle un
      doble de la base al contrato y probarla. (6e, 10 nov)
- [ ] **6e · Cargo de Stripe por disputa ($15):** lo absorbe To'Latino; decidir si se le cobra al organizador. (6e, 10 nov)
- [ ] **6e · Revertir una transferencia sin saldo del organizador:** Stripe la rechaza; queda pendiente y se reintenta con su llave. Falta la
      alerta en Dinero y el camino manual (cobrarle al organizador). (6e, 10 nov)
- [ ] **6e · Cambiar el lugar de un evento con ventas:** no se construyó (cancelar y publicar otro, o un cambio que revisa To'Latino). Las
      transferencias de boletos pendientes no se ajustan al mover la fecha (vencen a la hora de antes). (6e, 10 nov)
- [x] **6e · Super Admin «Extender ventas» y «Ajustar cupo»** (admin-dashboard L183–185): con 6j. «Congelar» y «Cancelar y devolver todo» sí. (6e, 10 nov)
- [x] **6e · Alerta «evento con sobreventa»** (admin-dashboard L74): con las existencias y sus checks no debería pasar; la alerta viva llega con 6j. (6e, 10 nov)
- [ ] **6e · Costo de la tarjeta absorbido (§6 #24):** _hecho en 6j (10 nov): vista `evt_sobreventa`, alerta en Eventos y boletos y en el Inicio del Super Admin (adm6j la fuerza con un boleto fuera de la regla)._ _hecho en 6j (10 nov): en la ficha del evento, por fecha, con motivo, aviso, event_changes y auditoría; nunca bajo lo vendido ni después del inicio._ se guarda un estimado (2.9 % + 30 ¢ por orden devuelta) para Confianza; con Stripe real,
      leer el `balance_transaction.fee` de cada cobro. (6e, 10 nov)
- [ ] **6e · Payouts de Stripe al banco del organizador:** la transferencia llega a su saldo de Stripe el martes; de ahí al banco con su
      calendario (semanal, martes). Con dinero real, confirmar que el calendario y la transferencia del mismo martes no atrasan una semana. (6e, 10 nov)
- [ ] **6e · Avisos del organizador sin moderación:** van tal cual a los que van (sin SMS); pasarlos por la auto-moderación (5d) antes de abrir. (6e, 10 nov)
- [ ] **6e · Abogado:** To'Latino como comerciante del cobro y la transferencia al organizador (1099-K), la política de cancelación del
      organizador y del cambio de fecha en los Términos. (6e, 10 nov)


## Fase 6 · 6f (series y eventos de varios días)
- [x] **6f → 6g/6h · La puerta de varios días:** cada boleto guarda sus días (`tickets.valid_days`, lo pone la base) y `bol_fechas_validas(boleto)` /
      `bol_vale_en(boleto, fecha)` dicen en qué fechas entra; el pase entra **una vez cada día** (las entradas por día van en `ticket_entries`
      de 6g). El paquete sin conexión (6h) debe llevar los días de cada boleto. (6f, 10 nov) _6g (10 nov): en línea hecho (ES DE OTRO DÍA con el día que vale;
      el pase una vez cada día en `ticket_entries`; e2e). Falta el paquete (6h)._
      _6h (10 nov): hecho — el paquete trae los días de cada boleto (todos los del evento de varios días: ES DE OTRO DÍA sin señal; e2e)._
- [ ] **6f · Una serie sin fin** («cada jueves, siempre»): no existe; «cuántas fechas» cuenta desde la primera y el tope es Configuración (52).
      Si se quiere, n = sin límite con el barrido creando hasta el horizonte. (6f, 10 nov)
- [ ] **6f · Panel de una serie: CORTESÍAS, DEVOLUCIONES y AYUDA CON ÓRDENES** muestran todas las fechas juntas (cada fila dice su orden);
      lo vendido, compradores, lista de espera, cambiar y cancelar sí son de la FECHA QUE ESTÁS VIENDO. (6f, 10 nov)
- [ ] **6f · Mesas en un evento de varios días:** no se venden (una mesa es de una noche; REVISION 6f). Si el fundador las quiere, mesa por día
      con su existencia en cada día. (6f, 10 nov)
- [ ] **6f · Cancelar o mover UN día de un evento de varios días:** no se puede (se cancela entero); con pases, devolver la parte de un día
      necesita una regla de devolución parcial. (6f, 10 nov)
- [ ] **6f · Cambio de artista de una fecha con SMS:** hoy va en la app (sin SMS, §6 #7); el prototipo decía SMS. (6f, 10 nov)
- [ ] **6f · Velocidad con la base de carga:** la lista deduplica la serie con un anti-join por fila sobre (event_id, starts_at); medir p95 con
      `scripts/carga/eventos-1m.mjs` (series de 52 fechas incluidas) junto con 6b. (6f, 10 nov)
- [ ] **6f · Eventos en los 9 dispositivos:** `evt6f` corre en teléfono 390 y escritorio 1360 en local; falta la matriz de CI. (6f, 10 nov)
- [ ] **6f · Texto viejo del editor:** «La venta en la app abre pronto» (6a) sigue en el editor de boletos aunque la venta ya existe (6c); lo
      prueba `evt6a`: cambiar el texto y la prueba juntos. (6f, 10 nov)


## Fase 6 · 6g (la Puerta en línea)
- [x] **6g → 6h · Sin conexión:** paquete firmado y cifrado, cola local, choques entre porteros. Gancho listo: cada escaneo trae el id del teléfono
      (`ticket_scans.id`), la hora del teléfono (`at_device`) y `puerta_entrada(..., p_offline)`; `door_sessions.clock_offset_ms` y `package_id`
      existen. Hoy, sin señal: «SIN SEÑAL · no se marcó» + **Reintentar** con el mismo id. (6g, 10 nov) _6h (10 nov): hecho (ver «Fase 6 · 6h»)._
- [x] **6g · REPETIDOS en Confianza › Fraude** («boletos duplicados»: el mismo QR que intenta entrar otra vez, `door_counts.dup_n` y
      `ticket_scans.result = 'already_used'`): la señal viva llega con 6h/6j (`evt_senales`). (6g, 10 nov)
- [x] **6g · La app Puerta instalable** (manifiesto y service worker propios, 6h — _hecho en 6h con el logo SVG_) y la cáscara de Capacitor «To'Latino Puerta» (Fase 8); bloqueo del
      teléfono a la app (kiosco) si el negocio lo quiere: no se construyó. (6g, 10 nov) _Kiosco hecho en 8e (11 nov): «Fijar la Puerta en esta pantalla» (Android) y la ayuda de Acceso guiado (iPhone)._
- [ ] **6g · Cámara en teléfonos reales:** _hecho en 6j (10 nov): señal «Entró dos veces» por persona en Confianza › Fraude._ probada con la cámara falsa de Chromium (jsQR en el Worker). Falta el iPhone del fundador (Safari: sin
      BarcodeDetector → jsQR) y un Android (BarcodeDetector), con poca luz y la linterna. (6g, 10 nov)
- [ ] **6g · La Puerta en los 9 dispositivos:** `evt6g` corre en teléfono 390 y escritorio 1360 en local; falta la matriz del CI. (6g, 10 nov)
- [ ] **6g · Velocidad con la base de carga:** escaneo en línea local p50 21 ms / p95 26 ms (40 boletos, sin carga); medir ≤ 150 ms ida y vuelta con
      50 k boletos en una fecha (`scripts/carga/eventos-1m.mjs`) y la búsqueda por nombre (hoy `like` dentro de la fecha, sin índice de trigramas). (6g, 10 nov)
- [ ] **6g · Foto en una incidencia:** no se construyó (riesgo de fotos de identificaciones); si el fundador la quiere, foto privada como Ayuda con
      un filtro de documentos. (6g, 10 nov)
- [ ] **6g · Chat rápido entre porteros** («cerramos VIP», apps-delivery-checkin CHK-EQUIPO): no se construyó; Equipo muestra quién está en cada
      puerta y el panel puede cerrar una. (6g, 10 nov)
- [ ] **6g · Noche sin evento en `/puerta`:** la lista de la noche entra a la Puerta solo con una puerta abierta de un evento del local esa noche; una
      noche sin evento se marca desde Panel › Hoy. Si se quiere, una «puerta de la noche» sin evento. (6g, 10 nov)
- [ ] **6g · «Adentro» por puerta con reentrada:** si alguien entra por una puerta y sale por otra, el adentro de cada puerta es aproximado (nunca
      negativo); el total de la fecha es exacto. (6g, 10 nov)
- [ ] **6g · Retención de escaneos** (§6 #25: 13 meses y luego solo totales): hoy se guardan sin vencer (solo inserción). Falta la tarea que los
      resume. (6g, 10 nov)
- [ ] **6g · SMS de verdad para «Te invitaron a la puerta»** (`puerta_invitado`): sale con la clave del proveedor (Telnyx). Hoy en modo pruebas; el
      código también se ve en el panel para dictarlo. (6g, 10 nov)
- [x] **6g · Push de verdad** (hecho en 8c: van por push a To'Latino Puerta) para «Hoy escaneas en la puerta» (`puerta_abre`, una hora antes de las puertas) y «Tienes una puerta»: hoy en Avisos
      de la app (push con la app instalable). (6g, 10 nov)
- [ ] **6g · Prueba noc4c dependiente del día:** su reloj movido (−2000 min) no alcanza cuando la próxima noche abierta está a 2 días (martes →
      jueves); con −9000 pasa. Cambiar la prueba para que mueva el reloj desde la noche de la reserva. (6g, 10 nov)


## Fase 6 · 6h (la Puerta sin conexión)
- [ ] **6h · Teléfonos de verdad sin señal:** probado con Chromium (Playwright `setOffline`, service worker, IndexedDB, WebCrypto Ed25519). Falta el
      iPhone del fundador (Safari: Ed25519 en WebCrypto desde 17; antes, @noble/ed25519 dentro del repo) y un Android, en modo avión, con la app en la
      pantalla de inicio y abriéndola en frío sin señal. (6h, 10 nov)
- [ ] **6h · Safari borra lo guardado de una web que no se abre en 7 días** (ITP): la lista de la puerta dura una noche (no importa), pero el boleto
      del cliente guardado hace más de 7 días puede no estar sin señal. Con la app de las tiendas (Fase 8) no pasa; hasta entonces, «abre tu boleto
      antes de llegar». (6h, 10 nov)
- [ ] **6h · Mis boletos guarda solo los boletos abiertos** una vez con señal; guardar todos los próximos al abrir Mis boletos (con su QR) queda
      pendiente (pide firmar todos los QR al listar). (6h, 10 nov)
- [ ] **6h · Velocidad con la base de carga:** paquete de 10 k boletos ≤ 1 s y ≤ 1 MB comprimido, subir 500 escaneos ≤ 2 s, validar sin conexión
      ≤ 50 ms en un Pixel emulado (`scripts/carga/eventos-1m.mjs`). Hoy medido solo con los datos del e2e (11 boletos). (6h, 10 nov)
- [ ] **6h · Red entre teléfonos de la puerta sin internet** (LAN / Bluetooth) y **QR que cambia cada pocos segundos** (anti-captura): no se
      construyen (§6 #10). Sin señal, dos porteros no se ven: el duplicado se resuelve al subir. (6h, 10 nov)
- [x] **6h · Señales de duplicados en Confianza › Fraude** («boletos duplicados»): las incidencias automáticas «Entró dos veces (sin conexión)»
      ya existen (y `door_counts.dup_n`); la señal por comprador llega con 6j (`evt_senales`). (6h, 10 nov)
- [ ] **6h · RSVP y «Contar en la puerta» sin señal** se suben con la puerta abierta; si la puerta se cerró (el panel o el barrido) antes de subir,
      esas marcas no cuentan (los boletos sí suben). La lista de la noche (Noche) es solo con señal. (6h, 10 nov)
- [ ] **6h · Un teléfono revocado sin señal** sigue validando con su lista hasta recuperar la señal o hasta que venza (fin + 6 h); nada de lo que
      escanee después cuenta. Si se quiere menos ventana: vencer la lista antes (Configuración) o pedir un PIN al abrir la app sin señal. (6h, 10 nov)
- [ ] **6h · Íconos PNG de To'Latino Puerta** (192 / 512, maskable) para instalar en todos los Android; hoy el logo SVG. (6h, 10 nov)
- [ ] **6h · Cifrado en reposo en el navegador:** _hecho en 6j (10 nov): `evt_senales` (duplicado) con «Abrir caso»._ la llave no exportable vive en el perfil del navegador; con el teléfono desbloqueado alguien
      podría usarla en ese navegador. Con la app de las tiendas (Fase 8): llave en el Keychain / Keystore del teléfono. (6h, 10 nov)

## Fase 6 · 6i (evento privado)
- [ ] **6i · Contrato con stripe-mock:** el evento privado usa las llamadas que ya cubre `scripts/contrato-stripe/prueba.cjs` (retener con destino
      y comisión, cobrar, liberar, devolver); no hay llamada nueva. Probado contra el simulador; falta correr el contrato en el CI. (6i, 10 nov)
- [ ] **6i · Impuesto de la comida preparada (6 % PA, `tax_rules` NEG-FOOD):** sembrado igual en las 5 ciudades; validar con el contador si aplica
      impuesto local y si el «Todo el local» o la decoración pagan impuesto (hoy todo el subtotal lo paga). (6i, 10 nov)
- [ ] **6i · Comisión `evp` 8 % del depósito** (igual que Fiestas, Super Admin › Planes): decisión del fundador (REVISION «### 6i»). (6i, 10 nov)
- [ ] **6i · El depósito llega directo al restaurante** (cobro con destino, como toda la app): si el restaurante cancela y su saldo en Stripe no
      alcanza, la devolución depende de Stripe (la plataforma la cubre y la cobra al negocio). Revisar con Stripe el saldo negativo de cuentas
      conectadas antes de abrir. (6i, 10 nov)
- [ ] **6i · SMS del evento privado:** `evp_nueva` (al restaurante), `evp_propuesta`, `evp_ok` y `evp_cancelado_negocio` llevan SMS; salen de verdad
      cuando haya proveedor (Telnyx, decisión E). Hoy quedan «en modo pruebas». (6i, 10 nov)
- [ ] **6i · Términos y políticas:** la política de cancelar de un evento privado (gratis hasta 72 h; después el depósito se queda con el
      restaurante; si cancela el restaurante, devolución completa) va en los Términos versionados (`LegalPage`), con el abogado. (6i, 10 nov)
- [ ] **6i · El Fogón y Mariscos La Bahía** tienen Evento privado encendido en la semilla pero no tienen dueño ni Cobros: una solicitud a ellos solo
      puede vencer (sirven para «Otros que hacen eventos privados»). Al tener dueño, conectar Cobros. (6i, 10 nov)
- [x] **6i · Mi cuenta › Avisos › Eventos** (grupo `events`, apagar lo no crítico del evento privado) y la sección Eventos de Configuración con
      etiquetas finales: con 6j. Hoy las plantillas `evp_*` van en el grupo de citas (`cit`). (6i, 10 nov)
- [x] **6i · Analítica › Eventos privados** (pedidas → propuestas → aceptadas, depósito, canceladas a tiempo / tarde, por ciudad): con 6j. (6i, 10 nov)
- [ ] **6i · Un cambio de un evento confirmado nunca cobra más en la app:** _hecho en 6j (10 nov): Analítica › Eventos › EVENTO PRIVADO (`evp_analitica_dia`)._ _hecho en 6j (10 nov): las evp_* del cliente pasaron al grupo `events` (lo no crítico en Boletos y cambios / Recordatorios; propuesta, confirmación y cancelación siempre); Configuración › Eventos › Evento privado._ si el nuevo total sube, la diferencia se paga en el local; si baja, nunca
      por debajo del depósito pagado (la base lo rechaza). Cobrar un depósito adicional por un cambio: si el fundador lo quiere. (6i, 10 nov)

## Fase 6 · 6j (Super Admin completo, Configuración, avisos, analítica, Mi cuenta) · FASE 6 CERRADA
- [ ] **6j · Panel › Ajustes › Avisos del negocio** (venta, aforo 90 %, cancelaciones, pago; plan §4 6j): Panel › Ajustes (DASH-AJUSTES, «LO QUE TE
      AVISAMOS») no existe todavía. Hoy al negocio le llega todo en la campana (evt_venta, evt_aforo90, evt_ajuste_admin, evt_pago…). Con Ajustes. (6j, 10 nov)
- [ ] **6j · Mi cuenta › Pagos y movimientos de boletos:** la pantalla Pagos y Wallet (USR-PAGOS) no existe; el recibo de cada orden B- está en la
      orden. Con su fase (Pagos y Wallet). (6j, 10 nov)
- [ ] **6j · Señal «la misma tarjeta en varias cuentas»:** necesita `card.fingerprint` de Stripe (un pm_… es de una sola cuenta); con Stripe real. (6j, 10 nov)
- [ ] **6j · «Día de pago de eventos» (evt_pago_dia) en SOLO LECTURA:** el panel (Eventos, Cobros), Publica tu evento y la ayuda dicen «el martes».
      Se abre cuando esos textos lean el valor. (6j, 10 nov)
- [ ] **6j · Ajustar el cupo de un RSVP desde el Super Admin:** hoy solo boletos, mesas y aforo del día (el cupo del RSVP lo cambia el organizador). (6j, 10 nov)
- [ ] **6j · Analítica › Eventos con la base de carga:** las vistas `evt_analitica_dia` / `evt_asistencia_dia` agregan en cada consulta; con 1 M de
      fechas y 5 M de boletos medirlas y, si pasan del presupuesto, materializarlas por día (refresco en el barrido). (6j, 10 nov)
- [ ] **6j · Super Admin de Eventos en los 9 dispositivos:** `adm6j` corre en escritorio 1360 y teléfono 390 en local; falta la matriz de CI. (6j, 10 nov)
- [ ] **6j · Textos del Super Admin de Eventos en inglés:** como el resto del admin, en español (las etiquetas de Configuración y las plantillas sí ES/EN). (6j, 10 nov)
- [ ] **6j · Avisos viejos con «{evento}» en el título:** se arregló al mandar (guardián avisoTituloLleno); lo que ya estaba en las bandejas del
      sandbox queda como estaba (no se reescribe). En producción no hay avisos viejos. (6j, 10 nov)

- [ ] **6j · Promotores de eventos** (§6 #18: vender cortesías o cobrar por promotor, MEM 208): no se construye; los promotores usan códigos de
      descuento del organizador. Si el fundador lo quiere: un rol «promotor» con su código y su reporte. (6j, 10 nov)
- [ ] **6j · Wallet como forma de pago** (§6 #8): solo tarjeta; el Wallet de To'Latino y Apple/Google Pay llegan con su fase. (6j, 10 nov)
- [ ] **6j · Panel › Eventos con cursor:** la lista del panel trae hasta 200 eventos (ahora lo vivo y próximo primero); un organizador con cientos de
      eventos necesita «Ver más» con cursor en Pasados y cancelados. (6j, 10 nov)
- [ ] **6j · Pruebas que fallaron una vez en la corrida seguida de la fase y pasaron solas:** `evt6b-6c` (un aviso de React #418, texto distinto entre
      servidor y navegador, en una de sus ~40 pantallas; dos corridas más, una con la URL de cada error, salieron limpias) y `evt6i` (el paso de la
      propuesta que vence espera 52 s con el reloj real). Hacerlas deterministas: registrar la URL del error de hidratación y mover el reloj en la
      base en vez de esperar. (6j, 10 nov)
- [ ] **6j · Pruebas al revés viejas:** 4 casos ya no cazan porque cambian textos que un bloque posterior reemplazó (alreves6b `rsvpConCupo` sobre
      0107 y alreves6g `escaneoIdempotente` / `libroSoloInsercion` sobre 0112: la función viva es la redefinida en 0111 / 0113; alreves6d
      `devolverCoincide` sobre Transacciones.tsx de antes de 6i). Fallan igual con los guardianes de HEAD; apuntarlas a la última definición. (6j, 10 nov)

## Fase 7 · 7a (la ayuda como base de conocimiento y el Centro de ayuda)
- [ ] **7a · Soporte detrás de la ayuda:** el pie «¿No es lo que buscabas?» y los «escríbenos / escribe a Soporte» de varias ayudas llevan a Mi cuenta
      hasta que exista Soporte (7b); 7b los cambia a `/soporte` y pone «Pregúntale al Compa» cuando llegue 7d. (7a, 10 nov) — 7b (10 nov): el pie
      del Centro de ayuda y de cada artículo dice **Escríbenos** y abre `/soporte`; los avisos del panel (foto quitada, reclamo, tipo ajustado)
      traen «Escribir a Soporte»; los textos de error dicen «Mi cuenta › Ayuda y soporte» o «Más › Ayuda y Soporte». Falta «Pregúntale al Compa» (7d).
- [ ] **7a · Inglés de la ayuda:** el inglés es un resumen fiel; ~25 archivos tienen menos de una quinta parte del largo del español (p. ej.
      propiedades-y-visitas, inscribirse, cita-con-doctores, emergencia-24-7). Ampliarlos antes de abrir; El Compa en inglés depende de eso. (7a, 10 nov)
- [ ] **7a · SMS de invitación al equipo del panel:** `app/panel/acciones-equipo.ts` `enviarInvitacion` no manda nada (la pantalla y la ayuda lo dicen).
      Conectarlo a `avisarTelefono` como la invitación de porteros. (7a, 10 nov)
- [ ] **7a · Centro de ayuda público para buscadores:** los artículos de vecinos no entran a un sitemap todavía (las páginas de equipo y negocio ya
      dicen noindex). Con la web pública (Fase 9). (7a, 10 nov)
- [ ] **7a · Editar la ayuda desde el Super Admin:** hoy el repo es la fuente y el Super Admin solo pausa (§6 #12); el editor llega con el CMS. (7a, 10 nov)
- [ ] **7a · Centro de ayuda en los 9 dispositivos:** `ayu7a` corre en 390 y 1360 en local; falta la matriz de CI. (7a, 10 nov)

## Fase 7 · 7b (Soporte: casos con To'Latino)
- [ ] **7b · Correo entrante de Soporte** (§6 #16): no se construye en esta fase; los casos entran por la app (y por WhatsApp en 7h). Una cuenta
      que no puede entrar (suspendida, baneada, dispositivo bloqueado) lee «Escríbele a Soporte» y hoy no tiene por dónde: definir el canal
      (correo de soporte o una página pública de contacto con verificación) antes de abrir. (7b, 10 nov)
- [ ] **7b · Aviso de respuesta por correo** (plan: «push + correo»): hoy sop_recibido, sop_respuesta y sop_resuelto llegan a la campana de la
      app; el correo con plantilla propia (email_outbox) y el push llegan con el canal de push de las apps. (7b, 10 nov)
- [ ] **7b · Feriados del equipo** (§6 #17): el plazo cuenta lunes a viernes 9–6 sin feriados; sumar un calendario de feriados cuando haya
      equipo. (7b, 10 nov)
- [x] **7b · Copiloto en la ficha del caso** («Sugerir respuesta con El Compa», §4 7g) y «Pregúntale al Compa» en Soporte (7d): la ficha y la
      pantalla ya tienen su lugar; se encienden con El Compa. (7b, 10 nov) — 7d: «Pregúntale al Compa». 7g (11 nov): el copiloto en la ficha del
      caso y en Colas › Ayuda con pedidos y citas (`compa7g`).
- [ ] **7b · Analítica de Soporte** (`soporte_analitica_dia`: casos por tema, primera respuesta, SLA cumplido, «¿Se resolvió?») y Mi cuenta ›
      Avisos › Soporte: en 7i. Hoy las cifras salen en Super Admin › Soporte. (7b, 10 nov)
- [ ] **7b · Soporte en los 9 dispositivos:** `sop7b` corre en 390 y 1360 en local; falta la matriz de CI. (7b, 10 nov)
- [ ] **7b · Asignar un caso a una persona concreta** (hoy: tomarlo uno mismo, «Tomar el siguiente caso» o «Pasar a Finanzas / un Admin», que lo
      deja sin asignar para ese rol). Elegir a quién desde la ficha, con la lista del equipo activo. (7b, 10 nov)

## Fase 7 · 7c (el motor de El Compa)
- [ ] **Cuenta de Anthropic** (el fundador, en persona: términos y facturación) y la llave `ANTHROPIC_API_KEY` con el formulario seguro del entorno
      (nunca en el chat). Falta además el camino de la llave al servidor de pruebas (`/etc/tolatino/pruebas.env` → compose ya la pasa): el mismo
      que tendrán `STRIPE_SECRET_KEY` y Telnyx (hoy ninguna llave de terceros llega sola al servidor).
- [ ] **Retención cero (ZDR)** pedida a Anthropic para la cuenta de producción; si no la dan, decirlo en Privacidad (`privacidad-de-el-compa`).
- [ ] **Primera llamada real** con la llave en el sandbox: revisar el formato exacto de la respuesta (esquema, `stop_reason`, `usage`) contra
      `lib/compa/modelo-claude.ts` y que `inference_geo` y el esfuerzo bajo se acepten para Haiku 5.5; medir p95 (meta ≤ 4 s) y el costo real por turno.
- [ ] **Batería del modelo real** (`scripts/compa/bateria/`, ≥ 150 preguntas ES/EN con revisión determinista, meta ≥ 95 %) — gasta dinero, dentro del
      tope; con la llave.
- [ ] **Encender en producción** (fase 9): poner `TOLATINO_COMPA=encendido` en el entorno de producción (candado de `lib/compa/interruptores.ts`).
      Sin eso, El Compa queda apagado aunque los interruptores digan otra cosa. El simulador no existe allí.
- [ ] **Purga por retención** (12 meses → solo cifras) y por cuenta borrada (D5, 30 días): la ayuda `privacidad-de-el-compa` ya lo promete; se
      construye con el Super Admin completo de El Compa. `compa_retener_meses` queda bloqueada en Configuración hasta entonces.
- [ ] **Abogado:** aviso de IA en Términos y Privacidad; el texto (tapado y mínimo) se procesa con Anthropic en EE. UU.; quién del equipo lee las
      conversaciones y cuánto se guardan.
- [x] El copiloto, el panel y las respuestas automáticas usan el mismo motor (`turno` hoy solo acepta el uso «vecino»). — 7e (11 nov): el panel
      ya usa el motor (`turnoPanel` sobre `consultar()`, la llamada al modelo común); faltan las respuestas automáticas (7f) y el copiloto (7g).
      — 7f: respuestas automáticas por `consultar()`. 7g (11 nov): el copiloto también (`borradorCopiloto`, con su esquema y `verificarCopiloto`).
- [x] `go_to_panel` usa una lista cerrada mínima (hoy, mensajes, cobros, eventos, más) hasta que exista `compa_panel_guide`. — 7e (11 nov):
      `go_to_panel` va contra `compa_panel_guide` (0120) filtrada por las partes de la persona; confirmar relee la guía y pide `accesoPanel`.

## Fase 7 · 7d (El Compa para vecinos)
- [ ] **7d · Botón «Ayuda» en operaciones vivas:** la hoja sale donde ya había «Ayuda con …» (casi siempre en operaciones terminadas). Para una
      cita o mesa pendiente, El Compa la cancela desde Soporte › Pregúntale al Compa; el diseño pone «Ayuda» también en la cita por venir. Decidir
      si se suma ese botón en cada pantalla de operación viva. (7d, 10 nov)
- [ ] **7d · Ampliar lo que El Compa puede cancelar** (§6 #6): hoy solo citas y mesas pendientes y sin cobro (`CANCELABLES`); visitas, fiestas,
      viajes o noches pendientes abren su pantalla. Decisión del fundador. (7d, 10 nov)
- [ ] **7d · Pruebas viejas de Ayuda con El Compa encendido:** `ayuda2i`, `cit3e`, `ayu4if`, `ayu4z` pasan con El Compa apagado y al tope; encendido
      la hoja sale antes del formulario (es el cambio) y esas pruebas deben entrar por «Algo no salió bien» o con `?de=compa`. Ajustarlas cuando
      pasen a la matriz de CI. (7d, 10 nov)
- [ ] **7d · Super Admin › Usuarios 360° › El Compa** (cifras por persona) y «Marcar respuesta incorrecta», Resumen y Negocios de `ADM-COMPA`:
      con el Super Admin completo de El Compa (7i). La ficha con el hilo y las lecturas anotadas ya están (7d). (7d, 10 nov)
- [ ] **7d · El Compa en los 9 dispositivos:** `compa7d` corre en 390 y 1360 en local; falta la matriz de CI. (7d, 10 nov)
- [ ] **7d · Pantalla de un pedido sin hora de «listo» o de respuesta** (`lib/pedir.ts` `pedidoDe` falla con `ready_at` o `respond_by` nulos): la
      semilla 0041 repara el pedido de la 0040; pedidos de prueba hechos a mano siguen fallando. Hacer la pantalla tolerante. (7d, 10 nov)

## Fase 7 · 7e (El Compa en el panel)
- [x] **7e · Un miembro con partes en la semilla del sandbox:** el panel no tiene todavía la pantalla para dar partes a alguien del equipo
      (Moderadores, más arriba), así que en el sandbox no hay un miembro con una sola parte para mirar «Eso lo ve el dueño». La prueba `compa7e`
      lo crea en la base local. Propuesta: la semilla 0042 (7f) suma una moderadora de prueba en Sabor Dominicano con «Hoy y pedidos». (7e, 11 nov)
      — 7f (11 nov): la semilla 0042 suma a Rosa Prueba (5705550691), moderadora de Sabor Dominicano con solo «Hoy y pedidos».
- [x] **7e · Respuestas automáticas en Panel › El Compa** (Pro, `lockB` para Free, «Pruébalo como cliente», «Lo que contestó El Compa»): 7f. Hoy
      la sección es solo el asistente y su cabecera no las menciona. (7e, 11 nov) — 7f (11 nov): hechas, y la cabecera dice «…y, con Pro, contesta a
      tus clientes cuando tú no puedes.».
- [ ] **7e · El Compa del panel en los 9 dispositivos:** `compa7e` corre en 390 y 1360 en local; falta la matriz de CI. (7e, 11 nov)
- [ ] **7e · Calidad con el modelo real:** la batería (`scripts/compa/bateria/`) debe sumar preguntas del panel (dueño y miembro con partes,
      ES/EN, «llévame a…», dinero, transferir el negocio) cuando haya llave. Con el simulador la respuesta es la guía o el primer trozo de ayuda;
      con Haiku debería elegir el trozo útil. (7e, 11 nov)
- [ ] **7e · Visto de paso: el pedido pagado de la semilla 0040 (El Fogón, #1360 en local) no tiene líneas** (`operation_lines`): su «Ayuda
      con el pedido › Falta algo» muestra «¿QUÉ PLATOS?» vacío y no deja seguir. `compa7d` §8 ya elige un pedido con líneas; corregir la semilla
      (una semilla nueva que le sume sus líneas, sin tocar la 0040) o que el formulario lo diga. (7e, 11 nov)
- [ ] **7e · «Cambiar mi teléfono / ciudad / borrar la cuenta» escrito en el panel** abre un caso de cuenta del negocio (el plan lo pide así);
      si el dueño quería su cuenta personal, ¿mejor abrirle Mi cuenta como al vecino? Decisión del fundador. (7e, 11 nov)

## Fase 7 · 7f (respuestas automáticas de El Compa y «Sugerir respuesta»)
- [ ] **7f · «Si no contestas en 10 min» y «Siempre, al instante»** (CUÁNDO del diseño): hoy solo «Fuera de tu horario» (§6 #8). Se construyen con
      `chat_threads.compa_pending_until` (ya existe) y el barrido; `compa_auto_espera_min` queda bloqueada en Configuración hasta entonces. (7f, 11 nov)
- [x] **7f · WhatsApp y SMS en las respuestas automáticas** (POR DÓNDE): 7h. Hoy solo el chat de To'Latino (`channels` = {app}). (7f, 11 nov)
      — 7h (11 nov): POR DÓNDE con WhatsApp y SMS, solo con el número del negocio conectado en Super Admin › El Compa › Canales (`compa7h`).
- [ ] **7f · «order by» sobre `id::text`** (clase): en Postgres `select id::text … order by id` ordena el texto (100 antes que 98). Cazado en 7f
      (arreglado en lib/compa y lib/mensajes, guardián `ordenSinTexto` solo ahí); quedan ~45 consultas en otros módulos (p. ej. `change_proposals
      … order by id desc limit 1` en citas, fiestas, noche, inscripciones, visitas y viajes; listas de secciones e ítems; `payments` en ayuda-cita
      y layaway). Arreglarlas y ampliar el guardián a todo el código (tarea sugerida en la sesión). (7f, 11 nov)
- [ ] **7f · Calidad con el modelo real:** la batería (`scripts/compa/bateria/`) debe sumar preguntas de clientes a un negocio cerrado (horario,
      menú, cómo pedir, descuentos, «¿hay mesa?», inyecciones en la nota del dueño y en una FAQ, inglés y spanglish) y borradores de «Sugerir
      respuesta». Con el simulador, una pregunta de precio contesta los tres primeros del menú (no el que preguntaron): con Haiku debería elegir.
      El idioma del cliente se adivina por sus palabras (y si no, el de su cuenta). (7f, 11 nov)
- [ ] **7f · En los 9 dispositivos:** `compa7f` corre en 390 y 1360 en local; falta la matriz de CI. La prueba vieja de Mensajes (`msg2p`) pasa con
      El Compa apagado y al tope; con las respuestas automáticas encendidas en Sabor Dominicano su paso «cerrado → la fija» no pasa tal cual
      (contesta El Compa, que es el cambio): en CI debe correr con El Compa apagado o apagarlas antes. (7f, 11 nov)
- [ ] **7f · Mensajes no tapa lo que escribe el cliente al negocio** (2p): un número de seguro social (9 dígitos) llega tal cual al negocio; El
      Compa sí lo tapa en lo suyo. ¿Tapar en Mensajes también (como Soporte)? Decisión del fundador. (7f, 11 nov)
- [ ] **7f · «Marcar respuesta incorrecta»** en una respuesta automática (Super Admin › El Compa › ficha) y analítica de respuestas automáticas: 7i.
      Hoy el reporte del cliente abre el caso en «Mensajes reportados» y ahí se apaga en la conversación. (7f, 11 nov)
- [ ] **7f · Para el abogado:** respuestas automáticas en nombre de un negocio (que es una IA, que no confirma ni promete) y responsabilidad del
      negocio por lo que escribe en «Lo que El Compa debe saber». (7f, 11 nov)

## Fase 7 · 7g (el copiloto del equipo)
- [ ] **7g · Calidad del copiloto con el modelo real (Sonnet):** la batería (`scripts/compa/bateria/`) debe sumar casos de Soporte y ayudas escaladas
      (cobro doble, devolución que no llega, cuenta, técnico; ES/EN; inyección en el mensaje de la persona y en una nota interna; notas internas que
      no deben salir; montos que pide la persona) cuando haya llave. Con el simulador el borrador es fijo («Ya estoy revisando…») y el resumen dice
      el tema; con Sonnet debería resumir de verdad y elegir la macro. Revisar también si el esfuerzo bajo alcanza para Sonnet. (7g, 11 nov)
- [ ] **7g · «Resolver» y «Resolver y devolver» de un caso TK- con el texto del borrador:** solo «Enviar» marca `from_draft` (y tal cual / editado);
      si alguien usa el borrador para resolver, el borrador queda «descartado» al día. ¿Llevar el borrador también a esos dos? (7g, 11 nov)
- [ ] **7g · El copiloto en Cuidado de niños, No me dejan cancelar y Posible estafa:** no sale (datos de niños, constancias y sanciones: decide
      una persona sin IA). Y no lee operaciones de Salud, Profesionales, inscripciones ni con datos privados. Si se quiere, es decisión del
      fundador. (7g, 11 nov)
- [ ] **7g · Lo del equipo (resumen y siguiente paso) en español** (el Super Admin es en español); el borrador sale en el idioma de la persona.
      Cuando el Super Admin tenga inglés, pedirlos en el idioma de quien lo usa. (7g, 11 nov)
- [ ] **7g · Para el abogado y Privacidad:** el texto de un caso de Soporte (tapado, sin teléfono ni correo) y las notas internas del equipo se
      procesan con Anthropic en EE. UU. cuando el equipo pide un borrador (la ayuda `privacidad-de-el-compa` ya lo dice). Va con la retención cero
      y el aviso de IA de 7c. (7g, 11 nov)
- [ ] **7g · En los 9 dispositivos:** `compa7g` corre en 390 y 1360 en local; falta la matriz de CI. (7g, 11 nov)

## Pedidos sin hora de listo o de respuesta (10 nov)
- [x] **Un pedido con `ready_at` o `respond_by` vacíos tumbaba con un 500 la página del pedido del cliente y TODA la pantalla Hoy del panel**
      (`hm2m(null)` en `lib/pedir.ts` y `lib/pedidos.ts`). Ahora esas horas son `string | null`: el cliente ve el pedido sin la hora («La
      cocina ya lo tiene», «Te avisamos cuando esté listo») y el panel lo lista sin hora. Reproducido antes del arreglo (500 en las tres
      pantallas) y probado después en el navegador (`pednull.cjs`, 15/15). Guardián `pedidoHorasOpcionales` (4/4 al revés). (10 nov)
- [ ] **`pedidos2c.cjs` (prueba vieja de pedidos) espera «Nada pendiente» en Hoy**, pero desde 6i Hoy también cuenta las solicitudes de evento
      privado abiertas (la semilla deja EP-4125 pendiente en Sabor Dominicano). El pedido vence bien (1378 · expired); hay que actualizar la
      prueba para que limpie o ignore esas solicitudes. (10 nov)

## Fase 7 · 7h (El Compa por WhatsApp y SMS con enlace)
- [ ] **7h · Cuentas de los proveedores (el fundador, en persona):** Telnyx (número de To'Latino + registro **10DLC** de la marca y la campaña de
      respuestas, con STOP/HELP) y Meta (WhatsApp Business Account verificado, la app y el número). Las llaves (`TELNYX_API_KEY`, la llave
      pública `TELNYX_PUBLIC_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`) van al formulario seguro del entorno; el
      compose ya las pasa (vacías). Falta el camino de las llaves a `/etc/tolatino/pruebas.env` (el mismo que Stripe y Anthropic). (7h, 11 nov)
- [ ] **7h · Hosts de salida para el sandbox:** `api.telnyx.com` y `graph.facebook.com` cuando haya llaves (no se tocó la red). (7h, 11 nov)
- [ ] **7h · Fase 9:** WhatsApp encendido y **SMS apagado** (§6 #14): poner `compa.channel.sms` en pausa en producción, además del candado
      `TOLATINO_COMPA=encendido`. Conectar el número de To'Latino en Super Admin › El Compa › Canales. (7h, 11 nov)
- [ ] **7h · Respuesta de STOP de los proveedores:** Telnyx y Meta pueden mandar su propia confirmación de STOP; El Compa ya manda una. Dejar una
      sola (apagar la del perfil de Telnyx o la nuestra) al conectar. Con el canal en pausa, solo sale la del proveedor. (7h, 11 nov)
- [ ] **7h · Plantillas de WhatsApp (escribir primero):** fuera de la ventana de 24 h no sale nada; los avisos por WhatsApp (código de entrada,
      boletos, citas) necesitan plantillas aprobadas por Meta. No se construyó. (7h, 11 nov)
- [ ] **7h · Bandeja de los negocios por SMS:** las respuestas automáticas por SMS a un número del negocio funcionan, pero el dueño no tiene
      dónde leer ni contestar esos SMS en To'Latino (el de WhatsApp lo lee en su app de WhatsApp Business). Antes de encender SMS a negocios,
      una bandeja en Mensajes o dejarlo solo en WhatsApp. (7h, 11 nov)
- [ ] **7h · Estado de entrega** (los avisos `message.finalized` de Telnyx y los `statuses` de Meta): hoy se ignoran; anotarlos en
      `compa_outbound` y en las cifras de Notificaciones (también los SMS de avisos). Sin reintentos de un envío que falló. (7h, 11 nov)
- [ ] **7h · Especificaciones del contrato fijas:** `scripts/contrato-canales/correr.sh` baja la especificación de Telnyx (`master`) y la de Meta
      (`main`, v23.0) en cada corrida; fijarlas a un commit para que un cambio del proveedor no rompa la CI sin aviso. (7h, 11 nov)
- [ ] **7h · El simulador y los SMS de avisos:** los avisos por SMS (`lib/avisos.ts`, 6d transferencias/cortesías/lista de espera, 6g puerta,
      7a invitación al equipo) siguen saliendo por su propio camino (Telnyx con `TELNYX_FROM`, modo pruebas en el sandbox); ahora respetan STOP
      («baja»). Unificar su salida con `lib/compa/canales-proveedor.ts` cuando se conecte Telnyx. (7h, 11 nov)
- [ ] **7h · Soporte por WhatsApp** (admin-dashboard L271): hoy WhatsApp habla con El Compa y «Con una persona» abre un caso TK-; el equipo
      contesta en la app (la persona lo ve ahí), no por WhatsApp. Contestar el caso por WhatsApp = decisión del fundador (costo por mensaje). (7h, 11 nov)
- [ ] **7h · Inundación de remitentes falsos:** el límite es por teléfono (30 al día); un ataque con muchos números falsos por SMS gastaría
      mensajes. Agregar un tope global por minuto con alerta antes de encender SMS. (7h, 11 nov)
- [ ] **7h · Para el abogado:** TCPA / 10DLC (consentimiento: el canal se enciende en Mi cuenta; STOP/HELP), política de WhatsApp Business
      (ventana de 24 h, opt-in, IA que se presenta) y el aviso de que el texto pasa por Telnyx/Meta y por el proveedor de IA. (7h, 11 nov)
- [ ] **7h · En los 9 dispositivos:** `compa7h` corre en 390 y 1360 en local; falta la matriz de CI. (7h, 11 nov)

## Fase 7 · 7i (Super Admin completo de El Compa y Soporte; cierre de la Fase 7)
- [ ] **7i · Borrado definitivo de una cuenta (D5) completo:** la purga de 7i vacía a los 30 días las conversaciones con El Compa, los casos de
      Soporte y sus fotos de una cuenta borrada (`compa_purgar`, `barrerRetencion`). El resto de lo que promete «Borrar mi cuenta» (perfil,
      direcciones, guardados, reseñas, comentarios, Mensajes con negocios, pasar la cuenta a `deleted`) sigue en el trabajo de Mi cuenta (2h, arriba).
      (7i, 11 nov)
- [ ] **7i · Soporte por correo entrante** (admin-dashboard L271, §6 #16): no en esta fase; El Compa y Soporte viven en la app, la web, WhatsApp y
      SMS. (7i, 11 nov)
- [ ] **7i · Batería del modelo real** (§7: ≥ 150 preguntas ES/EN, ≥ 95 %) y el **presupuesto de velocidad** con la base de carga (`compa-1m`):
      sin llave de Anthropic no se corren; todo lo de 7a–7i se probó con el simulador. (7i, 11 nov)
- [ ] **7i · Analítica a escala:** `compa_analitica_dia` y `soporte_analitica_dia` agrupan al leer (como las vistas de Eventos); con millones
      de conversaciones, pasarlas a una tabla de cifras diarias que llene el barrido. (7i, 11 nov)
- [ ] **7i · «Plazo cumplido» de un caso reabierto:** la vista compara la primera respuesta con el plazo vigente del caso (un caso reabierto
      tiene plazo nuevo). Si hace falta el plazo original, guardarlo aparte al abrir. (7i, 11 nov)
- [ ] **7i · En los 9 dispositivos:** `adm7i` corre en 390 y 1360 en local; falta la matriz de CI y la corrida de CI de 0124 / 0043. (7i, 11 nov)
- [ ] **7i · «Traducir con El Compa» y «Tómale foto a tu lista»** siguen como decidió el plan (§6 #9, #10): «Traducir» con el traductor propio y la
      foto de la lista sin construir; cambiarlo es decisión del fundador. (7i, 11 nov)


## Fase 8 → Fase 9 (del plan de las apps, 11 nov)
- [ ] Build de producción apuntando a `tolatino.com` con su `apple-app-site-association` y `assetlinks.json`; llave de APNs y proyecto de Firebase de producción, aparte de los del sandbox.
- [ ] Cuentas de revisión en producción (decisión I, choque anotado en REVISION) y textos finales de `/privacidad` y `/terminos` revisados por el abogado.
- [ ] Ninguna pantalla «Pronto» alcanzable en los builds de tienda (Apple 2.1); la purga final de la cuenta a los 30 días corriendo (L314).
- [ ] Enviar a revisión y lanzamiento por fases; beta real en Hazleton.
- [ ] Apple Pay / Google Pay nativos; Smart App Banner; passkeys obligatorias para el equipo.
- [ ] El día del envío: revisar de nuevo las reglas de compras externas en EE. UU. y el SDK mínimo que pide cada tienda.

## Fase 8 · 8a (las cuatro cáscaras, el puente, las islas y el llavero; 11 nov)
- [ ] **Paquete 8-0 (dominio) — bloqueado en el fundador:** `pruebas.tolatino.com` detrás de Cloudflare con HTTPS completo, Let's Encrypt en
      `deploy.sh`, nginx en 443, `TOLATINO_URL` y cookies `secure`. Hasta entonces las cuatro apps (que apuntan a `https://pruebas.tolatino.com`)
      abren su página local «Sin señal». Para probar Android contra la IP: `TOLATINO_URL=http://2.31.196.167 node apps/mobile/scripts/generar.mjs
      --preparar` (la app permite HTTP solo si la URL es HTTP; iOS nunca). (8a, 11 nov)
- [x] **Primera corrida de `cascara-android` y `cascara-ios` en CI** (11 nov): compilan los 8; el humo cazó cuatro defectos, ya corregidos con
      su guardián: (1) **seguridad**: en Negocios, Repartidor y Puerta un iframe de otro origen alcanzaba el puente (`server.url` con ruta →
      Capacitor caía a `addJavascriptInterface`), y en las cuatro `CapacitorCookiesAndroidInterface.setCookie` estaba abierto a todo marco
      (`puenteSoloNuestroOrigen`); (2) las cuatro de iOS se cerraban al abrir (SplashScreen pide `LaunchScreen.storyboard`; `cascaraArrancaIos`);
      (3) en Android la página local no se hidrataba y la isla no abría ni tenía TLLocal (con `server.url`, Capacitor no sirve el origen local:
      lo sirve `MainActivity`; `islaCoherente`); (4) el humo daba por buena la isla en cualquier página. (8a, 11 nov)
- [ ] **El JS de Capacitor en el origen local de Android** se toma por reflexión de `Bridge.getJSInjector()` (privado; Capacitor 8.6.0 fijo).
      Al subir Capacitor, revisar que siga: si falta, las islas caen a su respaldo web y el humo lo dice («tllocal»: false). (8a, 11 nov)
- [ ] **La red en la WebView** (11 nov, `senalHonesta`): en Android `RedWebView` le cuenta la red a la WebView (`ACCESS_NETWORK_STATE`, normal) y
      el humo lo prueba en modo avión; las islas dicen «hay señal» solo si nuestro servidor responde (`lib/nativo/senal.ts`). Pendiente: (1) iOS
      no se tocó — WKWebView sigue la red del sistema solo, pero el simulador no tiene modo avión: probarlo en un iPhone real con `nat8a`;
      (2) con el dominio (Paquete 8-0), comprobar en el emulador que con red la isla del Repartidor sí dice «Hay señal» (hoy el servidor no
      responde por HTTPS y la isla dice, con razón, «Sin señal»); (3) `setNetworkAvailable` apaga la Network Information API de la WebView
      (`navigator.connection`): nadie la usa hoy; si alguien la necesita, que la lea del lado nativo. (8a, 11 nov)
- [ ] **Humo de iOS más hondo:** hoy solo «abre y sigue viva» (y lo que escribe Capacitor). Falta en el simulador: la isla, TLLocal y el marco
      ajeno sin puente (el portero `TLBridgeViewController` solo lo vigila el guardián). Va con el XCUITest de `nat8a`. (8a, 11 nov)
- [ ] **`nat8a` completo en emulador y simulador** cuando haya dominio: modo avión al abrir → isla de la Puerta con la lista firmada guardada en
      TLLocal; otra cuenta en el mismo teléfono no ve nada; un iframe de otro origen (Stripe Elements) no alcanza el puente (en iOS, el portero
      `TLBridgeViewController`). XCUITest mínimo en el job de iOS. (8a, 11 nov)
- [ ] **App-Bound Domains en iOS** (`limitsNavigationsToAppBoundDomains`): declarado y apagado; encenderlo solo después de probar la hoja de Stripe
      y su 3-D Secure en el simulador. (8a, 11 nov)
- [ ] **Islas más livianas:** hoy se copia todo `/_next/static` (≈6 MB por app); copiar solo los trozos que usan las islas. (8a, 11 nov)
- [ ] **La isla de la Puerta en la app sube la cola sola** (hoy la sube la puerta en línea, con la misma cola del llavero): necesitaría un token de
      la sesión de puerta y CORS desde el origen local. (8a, 11 nov)
- [ ] **Mi cuenta › Ajustes › Privacidad** con «Este iPhone · To'Latino 1.0 (12)» en cada sesión (hoy lo dice Usuarios 360°). (8a, 11 nov)
- [ ] **«Abrir en la web» desde una app en pausa** cuando existan los enlaces universales: que no vuelva a abrir la misma app (excluir
      `?web=1` en el AASA o abrir con la vista del navegador). (8a, 11 nov)
- [ ] **El llavero:** lectura por el CI con OIDC y aviso de llaves que vencen (barrido) — tubería de las tiendas. (8a, 11 nov)
- [ ] **Imagen del sandbox en local:** `docker build` no corrió aquí (corepack no sale a npm desde dentro de Docker en esta máquina); la
      instalación congelada sin `apps/mobile` se probó aparte con pnpm. El CI la construye en cada push. (8a, 11 nov)
- [ ] **Presupuesto de velocidad de las apps** (tocar el ícono → primer pintado ≤ 1.5 s; isla ≤ 400 ms): medir en emulador y simulador. (8a, 11 nov)
- [ ] **En los 9 dispositivos:** `app8a` corre en 390 y 1360 en local; falta la matriz de CI. (8a, 11 nov)

## Fase 8 · 8c (avisos push propios: Web Push, APNs y FCM; push primero, SMS de respaldo; 11 nov)
- [ ] **Web Push en el iPhone del fundador (W, paso 1):** necesita el dominio con HTTPS (Paquete 8-0). En el sandbox por HTTP en la IP los
      navegadores no permiten Web Push: Mi cuenta dice «no disponible» y todo sigue por la campana y el SMS (probado). (8c, 11 nov)
- [ ] **APNs y FCM de verdad:** hoy contra los simuladores (`scripts/push-sim`) y el contrato (`scripts/contrato-push`, en el CI). Faltan la llave
      .p8 de APNs con su Team ID y la cuenta de servicio de Firebase en el llavero (Paquete 8-2), y la primera prueba en un iPhone (TestFlight) y
      un Android. El sandbox usa el APNs de producción (TestFlight); un build de Xcode necesita `APNS_ENTORNO=desarrollo`. (8c, 11 nov)
- [ ] **Firebase en la cáscara de Android:** el CI de las tiendas (8h) escribe `res/values/firebase.xml` de cada sabor desde el llavero (el
      plugin de avisos lo necesita para pedir el token). Hasta entonces Android dice «no disponible» y no pide el token (pedirlo sin
      Firebase cerraría la app). Quitar esa compuerta cuando todo build la lleve. (8c, 11 nov)
- [ ] **iOS: `aps-environment`** va en `project.yml` como «development»; la exportación a TestFlight lo cambia a producción (a verificar en el
      primer build firmado de 8h). No se compiló aquí (sin Xcode). (8c, 11 nov)
- [ ] **El SMS de respaldo sale de verdad cuando haya Telnyx** (`TELNYX_API_KEY`, `TELNYX_FROM`, 10DLC): hoy «en modo pruebas» en el sandbox; los
      textos de Mi cuenta › Avisos y del Super Admin que lo nombran están anotados en el guardián promesaSms. (8c, 11 nov)
- [ ] **«pushsubscriptionchange»:** si el navegador cambia la suscripción sola, hoy se vuelve a registrar al abrir To'Latino (una vez al día);
      atenderlo en el service worker necesita una ruta propia (las acciones del servidor no se llaman desde ahí). (8c, 11 nov)
- [ ] **Silencio de noche:** lo que no es crítico no sale por push entre 10 PM y 7 AM (como el SMS), ni se manda a las 7. Alternativa a decidir:
      mandarlo «sin sonido» (iOS `passive`). (8c, 11 nov)
- [ ] **Web Push en Chromium de verdad:** la prueba `push8c` reemplaza `PushManager.subscribe` en la página (el Chromium de Playwright no tiene
      credenciales del servicio de push de Google); el resto es real (service worker, permiso, cifrado, VAPID, descifrar, mostrar, tocar). Probar
      una vez en un Chrome y un Safari reales con el dominio. (8c, 11 nov)
- [ ] **Presupuesto de velocidad en la base de carga** (`scripts/carga/apps-1m.mjs`, máquina aparte): aquí, 10 000 avisos por la tubería real en
      la base local: avisar() con el push encolado, media 4,98 ms (p95 6,3 ms); el trabajador entregó 10 000 en 49,8 s al simulador (tope
      `push_por_minuto` 10 000; los 50 de más salieron el minuto siguiente); 0 duplicados. Falta APNs p95 ≤ 2 s contra Apple. (8c, 11 nov)
- [ ] **Íconos de la web instalada:** `public/assets/app/icono-*.png` salen del logo del sistema sobre `--tl-action` (el mismo dibujo que el
      ícono de la app To'Latino); se generaron una vez con sharp. Si el ícono de la app cambia, regenerarlos. (8c, 11 nov)
- [ ] **En los 9 dispositivos:** `push8c` corre en 390 y 1360 en local; falta la matriz de CI. (8c, 11 nov)

## Fase 8 · 8f (programa beta, «Reportar un problema», errores y cierres propios, Sistema › Apps completo; 11 nov)
- [ ] **TestFlight interno de verdad:** hoy contra el simulador de App Store Connect (`scripts/tiendas-sim`) y el contrato (`scripts/contrato-tiendas`,
      especificación OpenAPI 4.6 fijada por su sha256). Faltan la cuenta de Apple y la llave de la API en el llavero (Paquete 8-2), y verificar con
      Apple que el rol DEVELOPER sin aprovisionamiento alcanza para ser tester interno (si no, MARKETING). (8f, 11 nov)
- [ ] **Retroalimentación de TestFlight a Soporte:** la API la tiene (`betaFeedbackScreenshotSubmissions` y `betaFeedbackCrashSubmissions`, en la
      especificación); traerla como casos `reporte_app` cuando haya cuenta (8h). (8f, 11 nov)
- [ ] **Play interno:** la API no acepta correos (solo Grupos de Google). Decidir con el fundador si se usa un Grupo de Google para la lista (y
      agregar por la API) o se sigue agregando en Play Console (paso del Paquete 8-2). (8f, 11 nov)
- [ ] **APK propio de verdad:** hoy el build «disponible» del sandbox es un APK de PRUEBA que arma el servidor y no se instala. 8h sube los APK
      firmados por el CI (con su sha256) a `privado/apk/` y los registra en `app_builds`; nginx corta en 14 MB los cuerpos de subida: la subida del
      CI va directa al almacenamiento. Probar la instalación en un Android real (fuentes desconocidas). (8f, 11 nov)
- [ ] **Símbolos nativos:** los cierres de iOS y Android llegan con binario y desplazamiento (iOS) o la pila de Java ofuscada por R8; simbolizar con
      el dSYM y el `mapping.txt` que 8h guarda en `app_builds.symbols_media_id`. (8f, 11 nov)
- [ ] **Compilar lo nativo de 8f:** `TLReporteBeta.swift` / `.java` y los tres métodos nuevos de TLReporte (`ultimaCaptura`, `agitar`, `cierres`) los
      compila el CI de las cáscaras; probar en un iPhone y un Android reales agitar (captura de la pantalla) y un cierre que aparezca al abrir otra
      vez. MetricKit entrega los cierres al abrir de nuevo (iOS 15+). (8f, 11 nov)
- [ ] **Privacidad en las tiendas:** declarar «Datos de diagnóstico / Crash data» (sin vincular a la persona, sin rastreo) en `PrivacyInfo.xcprivacy`
      (`NSPrivacyCollectedDataTypes`, desde `generar.mjs`) y en las etiquetas de App Store y la sección de seguridad de datos de Play (8i). (8f, 11 nov)
- [ ] **Tope de errores con varios procesos:** el tope por minuto vive en la memoria de cada proceso; en producción con varios procesos (o
      máquinas) se multiplica. Pasar a un contador compartido o a Cloudflare (límite por IP en `/api/errores`) en la Fase 9. (8f, 11 nov)
- [ ] **Vuelta atrás por «Errores en vivo»:** en producción, un pico en la web servida debe volver al despliegue anterior y, en las apps, pausar el
      lanzamiento por fases por la API de las tiendas (Fase 9). Hoy avisa a los Admins. (8f, 11 nov)
- [ ] **La semilla 0045 en una base nueva** no crea testers ni el caso de ejemplo si todavía no existen esas cuentas (las crean otras semillas o las
      pruebas); los builds y los grupos de errores sí. (8f, 11 nov)
- [ ] **En los 9 dispositivos:** `beta8f` corre en 390 y 1360 en local; falta la matriz de CI. (8f, 11 nov)
- [ ] **El registro de la web vive en la memoria de la pestaña:** una navegación con recarga completa (Panel › Más usa una recarga) lo empieza de
      nuevo, así que un reporte desde el panel en el navegador trae pocas pantallas. En las apps vive en el nativo y sobrevive. Pasarlo a
      `sessionStorage` (solo familias de pantalla) si el equipo lo echa de menos. (8f, 11 nov)
- [ ] **Mapas de fuente y CPU:** cada proceso guarda hasta 12 mapas abiertos; un atacante dentro del tope por minuto puede obligar a abrir mapas
      distintos (cada uno cuesta leer y decodificar ~1 MB). Medir en la base de carga y, si hace falta, simbolizar en un trabajador aparte. (8f, 11 nov)

## Fase 8 · 8e (lo nativo de cada app: la ruta del Repartidor, la Puerta, el boleto, compartir, «Escanear cupón»; 11 nov)
- [ ] **La ruta en un teléfono real:** Android (servicio en primer plano con la pantalla apagada horas, batería, Doze) e iPhone (modo de fondo,
      indicador azul, que la app no se suspenda en una entrega de 40 min). El humo del emulador cubre Android; en iOS el simulador solo compila y
      abre (sin prueba de la ruta: el XCUITest con `simctl location` queda para cuando haya dominio). (8e, 11 nov)
- [ ] **Web sin HTTPS:** el sandbox se sirve por HTTP en la IP y el navegador no da la ubicación ahí: el Repartidor en la web dice «este navegador
      no da tu ubicación». Con el dominio (Paquete 8-0) funciona; la app nativa no depende de esto. (8e, 11 nov)
- [ ] **El aviso fijo en Android 13+ sin permiso de avisos:** si el repartidor dice que no a los avisos, el servicio sigue y Android lo lista en
      el administrador de tareas, pero el aviso no sale en la barra. Revisar en un Android real si conviene insistir. (8e, 11 nov)
- [ ] **Linterna en iPhone:** `AVCaptureDevice.torchMode` con la cámara del WebView abierta: *a verificar* en un iPhone real (el simulador no
      tiene luz). Si choca, la Puerta en iPhone se queda sin linterna (como hoy en Safari). (8e, 11 nov)
- [ ] **Fijar la pantalla en Android real:** si «Fijar apps» está apagado en Ajustes, `startLockTask` puede no hacer nada en algunos teléfonos;
      la Puerta lo dice. Probar en 2–3 marcas. (8e, 11 nov)
- [ ] **Ritmo y carga:** guardar una posición ≤ 30 ms y 200 por segundo sostenidas (2 000 repartidores cada 10 s) en la base de carga
      (`scripts/carga/apps-1m.mjs`, máquina aparte); SSE de la ruta ≤ 1 s. Aquí: 64 comprobaciones funcionales, sin medida de carga. El tope de una
      llamada por segundo por token vive en la memoria de cada proceso (como el de errores): con varios procesos, contador compartido. (8e, 11 nov)
- [ ] **Teselas en las capturas:** en local no corre el servidor de teselas; las capturas de los mapas se ven sin calles. Rehacerlas en el sandbox
      con el dominio. (8e, 11 nov)
- [ ] **La semilla 0046 en una base nueva** no crea las entregas de ejemplo si todavía no existen Juan (+1 570 555 0144) y Héctor (+1 570 555 0210)
      (las crean las pruebas), igual que 0044 y 0045. (8e, 11 nov)
- [ ] **Ofertas al repartidor («Aceptar» con cuenta regresiva), lotes y prueba de entrega con foto** siguen en «Repartidor (bloque 2l)»; cuando
      exista la oferta, «Aceptar» pasa a ser el paso que inicia la ruta (hoy «Voy por el pedido»). (8e, 11 nov)
- [ ] **Privacidad en las tiendas:** declarar «Ubicación precisa · funcionalidad de la app · vinculada a la persona · sin rastreo» para To'Latino
      Repartidor (y To'Latino «al usar») en `PrivacyInfo.xcprivacy` y en la sección de seguridad de datos de Play; en Play, la **declaración de
      ubicación en segundo plano** no aplica (no se pide ACCESS_BACKGROUND_LOCATION) pero sí la de **servicio en primer plano de tipo ubicación**
      (video corto del flujo). (8i, 11 nov)
- [ ] **En los 9 dispositivos:** `app8e` corre en 390 y 1360 en local; falta la matriz de CI. (8e, 11 nov)

## Fase 8 · 8g (el boleto en Apple Wallet y Google Wallet; 11 nov)
- [ ] **Solo después del Paquete 8-0 (dominio con HTTPS):** el iPhone del fundador NO puede agregar un pase desde el sandbox por HTTP en la IP:
      Apple Wallet exige `webServiceURL` con **HTTPS** (y el .pkpass se baja por Safari). Hoy el pase dice `https://pruebas.tolatino.com/api/pases`
      (BASE_URL); hasta que ese dominio responda, el pase se agrega pero no se actualiza. Con el dominio: agregar un boleto de prueba a Wallet,
      transferirlo y ver que el pase se anula solo. (8g, 11 nov)
- [ ] **Certificado del Pass Type ID (Paquete 8-2, opcional):** crear el Pass Type ID `pass.com.tolatino.boletos` en developer.apple.com, generar
      la solicitud en Super Admin › Sistema › Integraciones › Wallet, subirla a Apple, bajar el .cer y subirlo ahí. Todo lo demás (firma, servicio
      web, avisos) quedó probado contra una cadena de prueba hecha en el momento y simuladores. (8g, 11 nov)
- [ ] **A verificar con el certificado de verdad:** (1) que el intermedio que trae el AIA del .cer sea **Apple WWDR G4** (aquí no se pudo bajar
      `www.apple.com/certificateauthority`: el proxy lo negó; el servidor baja el intermedio de la dirección que dice el propio certificado, solo
      de `certs.apple.com` / `www.apple.com`, y comprueba que lo firmó); (2) que el aviso de cambio a APNs (TLS con el certificado del pase, cuerpo
      «{}», tema = Pass Type ID) entra **sin `apns-push-type`** — Apple no documenta cuál lleva un aviso de Wallet; (3) que `pass.strings` en
      UTF-16 con BOM se lee bien en un iPhone en inglés; (4) que el 304 de «If-Modified-Since» (no está en la lista actual de Apple, sí en la
      vieja) no molesta a Wallet. (8g, 11 nov)
- [ ] **Cuenta de emisor de Google Wallet (Paquete 8-2, opcional):** crear la cuenta en Google Pay & Wallet Console, la cuenta de servicio con
      acceso a la API de Wallet y subirla con el **ID del emisor** en Integraciones › Llaves. Las clases quedan en «UNDER_REVIEW»: Google las aprueba
      (a verificar el tiempo). Sin ella, solo sale Apple. (8g, 11 nov)
- [ ] **Arte oficial de los botones (hueco #9):** las insignias de hoy son **provisionales** (negro, borde gris, texto ES/EN, sin logos), marcadas
      `data-arte="provisional"`. Apple da el arte (SVG por idioma) solo después de **aceptar la «Apple Wallet Marketing Artwork License
      Agreement»** en developer.apple.com/wallet/add-to-apple-wallet-guidelines; Google, en su página de marca de Google Wallet (no abrió desde
      este entorno). Es un acuerdo legal del dueño de la cuenta: el fundador lo acepta (o da el OK para que Claude lo acepte en su nombre) y se
      reemplazan los dos botones ES/EN por el SVG oficial en `Wallet.tsx` (y se revisa que la licencia deje tenerlos en un repo público). (8g, 11 nov)
- [ ] **El correo de la compra** todavía no trae los botones de Wallet (lleva a Mis boletos, donde están). Con el arte oficial: sumar las dos
      insignias al recibo (`lib/correo/recibos.ts`), enlazadas a la página del boleto. (8g, 11 nov)
- [ ] **Dentro de la app iOS (Capacitor):** el botón abre el .pkpass con un enlace firmado de 10 minutos en la vista del sistema (Safari), porque
      el WebView no muestra «Agregar a Wallet». Probar en TestFlight; si no basta, un plugin nativo pequeño con `PKAddPassesViewController`
      (versión nueva de la app, revisada). (8g, 11 nov)
- [ ] **Los límites del servicio web** (pase_ws_por_minuto por dirección) viven en la memoria de cada proceso; con varios procesos, contador
      compartido. El de registros por teléfono por hora está en la base. Detrás de Cloudflare, la dirección es `CF-Connecting-IP` (hoy
      `x-real-ip` de nginx). (8g, 11 nov)
- [ ] **Ritmo:** un escaneo en la puerta marca el boleto «usado» y eso actualiza su pase (un aviso a cada teléfono que lo sigue). En una noche de
      2 000 personas con Wallet son 2 000 avisos a APNs en una hora: medir en la base de carga junto con el push (8c). (8g, 11 nov)
- [ ] **En los 9 dispositivos:** `wal8g` corre en 390 y 1360 en local; falta la matriz de CI. (8g, 11 nov)

## Fase 8 · 8d (entrar con Face ID o huella: llaves de acceso; 11 nov)
- [ ] **Solo después del Paquete 8-0 (dominio con HTTPS):** las llaves no se pueden usar en el sandbox por HTTP en la IP (el navegador no da WebAuthn
      sin contexto seguro; la app no ofrece nada). Con `https://pruebas.tolatino.com`: probar en el iPhone del fundador (Safari) registrar, salir y entrar
      con Face ID, y quitarla. `PASSKEY_RP_ID` / `PASSKEY_ORIGENES` ya están en el compose. (8d, 11 nov)
- [ ] **TLLlave en las apps (8b + 8h):** el plugin compila en las 4 apps (CI) pero está apagado (`apps.json` → `llaves.activas: false`). Para
      encenderlo: (1) 8b sirve `/.well-known/apple-app-site-association` con `webcredentials` de los cuatro IDs y `assetlinks.json` con
      `delegate_permission/common.get_login_creds`; (2) cada target de iOS lleva `com.apple.developer.associated-domains` = `webcredentials:pruebas.tolatino.com`
      (capacidad en el App ID, 8h); (3) 8h suma a `PASSKEY_ORIGENES` el origen `android:apk-key-hash:<sha256 de la llave de firma>` (la de subida y la de
      Play App Signing); (4) `activas: true` y probar en el simulador de iOS (a verificar que ofrece passkeys con dominio asociado) y en el emulador con
      un perfil de Google. (8d, 11 nov)
- [ ] **Passkeys obligatorias para el equipo (T#30):** hoy se ofrecen y Sistema › Equipo dice quién la tiene; exigirla para entrar al Super Admin es
      la Fase 9 (ver «Super Admin (bloque 3c)» L36). (8d, 11 nov)
- [ ] **El borrado definitivo a los 30 días (L314)** no corre todavía; cuando corra, sus llaves quedan quitadas con la cuenta (hoy una cuenta borrada
      ya no entra con llave: lo revisa `abrirSesionEn`). (8d, 11 nov)
- [ ] **Nombres de los administradores de llaves (AAGUID):** la lista corta de `lib/llaves/llaves.ts` (iCloud Keychain, Google Password Manager, Windows
      Hello, Samsung Pass, 1Password, Bitwarden) es solo para el nombre que se muestra; revisarla contra la lista pública el día del lanzamiento. (8d, 11 nov)

## Fase 8 · 8h (la tubería de las tiendas; 11 nov)
- [ ] **Paquete 8-0 (dominio con HTTPS):** sin él la tubería no entrega ninguna llave (el CI ve que no hay https y no manda su token). Con
      `https://pruebas.tolatino.com` detrás de Cloudflare en modo **Full (strict)**: lanzar «Tiendas» y ver en Integraciones › Lecturas del CI que
      entró. (8h, 11 nov)
- [ ] **Paquete 8-2 (llaves):** subir en Integraciones la llave de la API de App Store Connect (rol Admin, con el Issuer ID), la cuenta de servicio de
      Google Play (invitada en Play Console con permiso de publicar en las cuatro apps) y el **token de GitHub** para «Pedir un build» (de grano fino,
      solo este repositorio, permiso «Actions: write», vence como máximo en un año: anotar el vencimiento al subirlo). Crear las cuatro apps en App
      Store Connect y en Play Console (no hay API). (8h, 11 nov)
- [ ] **La llave de subida de Android la crea el primer job** (plan §3.5): falta el pedido OIDC que guarda en el llavero una llave generada en el CI
      **solo si no existe**, con la contraseña derivada (`claveAlmacen`, ya escrita). Hasta entonces el CI firma con una llave desechable y no sube
      nada. Igual para el certificado de distribución de iOS si la firma administrada por Apple no alcanza (a verificar con la cuenta real). (8h, 11 nov)
- [ ] **Primer TestFlight real** en el iPhone del fundador y primer build en Play interno: verificar `xcodebuild -exportArchive` con destino upload
      y la llave de la API (sin fastlane), que App Store Connect procese y que el grupo interno lo reciba; y que la primera subida por API a una app
      recién creada en Play funcione. (8h, 11 nov)
- [ ] **Símbolos nativos:** el CI sube el dSYM (y el mapping.txt si un día se activa R8) al almacén privado (`app_builds.symbols_key`), pero los
      cierres nativos todavía no se simbolizan con ellos (llvm-symbolizer / retrace en la imagen). (8h, 11 nov)
- [ ] **La huella de la firma de Google** (`lib/tiendas/play.ts` `huellaFirmaGoogle`, generatedapks.list) está escrita y probada contra el simulador,
      pero no se usa todavía: 8b la lleva a assetlinks.json y 8d a `PASSKEY_ORIGENES` (`android:apk-key-hash:`). (8h, 11 nov)
- [ ] **La configuración de Firebase de la app** (google-services / firebase.xml para el push de Android) no la escribe todavía el CI desde el
      llavero. (8h, 11 nov)
- [ ] **El entorno «tiendas» de GitHub:** hoy lo creó GitHub al primer uso, sin reglas. Ponerle «solo la rama pruebas» (y produccion en la Fase 9)
      por la API cuando haya un token con permiso de administración. (8h, 11 nov)
- [ ] **Cloudflare (plan gratis) corta los cuerpos en 100 MB:** un .aab o un dSYM más grande no pasaría; medir el tamaño real de los builds. (8h, 11 nov)
- [ ] **`app_min_build_*` nunca por encima del último build disponible** (plan §3.5): no lo revisa 8h; revisarlo al cambiar el mínimo en Sistema ›
      Apps. (8h, 11 nov)
- [ ] **Fase 9:** encender `app.tiendas.publico` con el OK del fundador, aceptar la rama produccion en el servidor de producción, el sabor de
      producción y los envíos a revisión pública (hoy la base los rechaza). (8h, 11 nov)
