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
      http). Entran cuando `pruebas.tolatino.com` esté detrás de Cloudflare.
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
- [ ] **Botones de Soporte** del diseño (chat / llamar) ocultos hasta que exista Soporte.
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
- [ ] **Rango y puntos** del vecino en la tarjeta («SARGENTO · 23 RESEÑAS», «+15 puntos») y la nota de rango en «Tu reseña»: con
  la gamificación. Hoy: «N RESEÑAS». Pregunta 7 en `docs/REVISION.md`.
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
- [ ] **Soporte completo**: tickets por WhatsApp y correo, macros ES/EN, primera respuesta y CSAT; ayuda con citas y reservaciones.
- [ ] **Avisos** al negocio de una solicitud nueva y al cliente de la respuesta (SMS/push).
- [ ] **El Compa** antes de abrir la solicitud (el prototipo lo pone primero).

## Notificaciones (bloque 2j, 6 nov 2026)
- [ ] **SMS de verdad:** con la clave de Telnyx (`TELNYX_API_KEY`, `TELNYX_FROM`) en los secretos del entorno de producción
      y el registro 10DLC, los avisos salen solos (`lib/avisos.ts`). Hoy en el sandbox quedan «en modo pruebas». Sin
      reintentos todavía: un SMS que falla queda «falló» en Envíos (agregar reintento con espera antes de la fase 9).
- [ ] **Push en las apps** (Fase 8): el mismo aviso como push; la plantilla ya dice qué grupo es.
- [ ] **Anuncios in-app** (secNotif «Anuncios»): banner de un día en el home de la ciudad. Falta el banner en el inicio.
- [ ] **Plantillas que faltan** porque su función aún no existe: código de entrada como plantilla editable, pedido tarde,
      recibo por correo, propuesta de evento privado, citas (confirmada / otra hora), devolución, evento cancelado, sello
      decidido, ciudad abierta, resumen semanal. Se agregan con su función.
- [ ] **Cifras de entrega y apertura** (secNotif: entregados, abiertos, costo SMS): necesitan el webhook de Telnyx y push.
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
      en vivo con permiso del sistema (mapa en vivo para el cliente y el negocio, plan §1.4) y push.
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
- [ ] Configuración (Fase 5): hacer editables los plazos de Doctores y Profesionales (2 h «no aceptamos su seguro», 24 h
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
- [ ] **Noche · plazos en Configuración (Fase 5):** 60 min para responder una mesa, corte de las 6 PM, 30 min de mesa guardada y 60 min
      de «la fila ahora» son constantes del código (`lib/noche-reservas.ts`, `lib/noche-comun.ts`). (4ne, 7 nov)
- [ ] **Noche · demo del sandbox:** la semilla 0023 no trae listas, mesas, reseñas ni ayudas de ejemplo; para revisar Transacciones ›
      Noche, las colas y la Analítica en el sandbox hay que crearlas usando la app (o agregar una semilla de operaciones `is_test`). (4ne, 7 nov)
- [ ] **Niños · ChildLine y obligaciones de reporte:** verificar el número de ChildLine de PA (1-800-932-0313) y revisar con abogado qué
      debe hacer To'Latino si recibe un reporte de maltrato; textos y registros de licencias DHS, escuelas, CDL y PennDOT sin verificar. (plan 4e, 7 nov)
- [ ] **4ee → 4eg:** Super Admin › Transacciones › **Inscripciones** (matrícula retenida/cobrada/devuelta/se quedó, plan por escrito) y las colas «Grupos que no abrieron», «No me dejan cancelar» y «Retenciones que fallaron» quedan para 4eg (Super Admin del grupo). Hoy se ven en el panel del negocio y en la base.
- [ ] **4ee:** el plan de pagos de una escuela no manda recordatorios de cuota (se pagan en la escuela); decidir si se avisa a la persona unos días antes de cada cuota.
- [ ] **Educación + Niños + Deporte · Configuración (Fase 5):** los plazos (24 h para responder, 48 h de la oferta de la lista de espera, 72 h de
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
