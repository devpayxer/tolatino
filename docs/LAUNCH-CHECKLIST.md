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
- [ ] **Super Admin del panel (triángulo):** ver y corregir horario, fotos (quitar con motivo → nota «To'Latino quitó…»),
  Quiénes somos (nota «To'Latino editó…»), equipo (quitar persona, pausar Staff), cerrar la página por días: bloque 1i.
- [ ] **Vistas:** se cuentan al servir la ficha (sin robots ni gente del negocio). Revisar con tráfico real si hace falta
  dedupe por persona/día como los contactos.
- [ ] **Botones del sistema de diseño (`Button`) son `<div>` sin `role="button"`:** accesibilidad por teclado/lector de
  pantalla en todo el sitio. Corregir en `portar-sistema.mjs` (guardián de accesibilidad) antes de la fase 9.

