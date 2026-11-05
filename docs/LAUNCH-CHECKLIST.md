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
  fase 9 (hoy: mapa, abierto, publica, recomendar, comunidad, eventos).
- [ ] **Ciudad — lo que falta (bloque 1f-2):** barrios y pueblos cercanos de Allentown, Wilkes-Barre, Scranton y
  Reading (el prototipo solo trae los de Hazleton; se cargan desde Super Admin › Ciudades antes de abrir); filas de
  «Casa / Trabajo» para medir desde tus direcciones (llegan con Mi cuenta › Direcciones; hasta entonces no se ofrece
  «Entra para medir desde tu casa»); «Qué es Mi ciudad» para quien no entró (cuando exista el Centro de ayuda);
  la cifra de eventos en el radio (Fase 6); «Lo que más buscan los vecinos de X» en Próximamente (sale oculto hasta
  tener datos reales de `city_waitlist.wants`); el SMS «tu ciudad abrió» (Fase 2 + asistente de abrir ciudad, Fase 9);
  el teléfono de quien pide sin cuenta no se verifica con código (tope por IP): decidir antes de enviar SMS.
- [ ] **Ciudades en memoria 60 s:** abrir o cerrar una ciudad desde el Super Admin se nota en hasta un minuto.
- [ ] **Mapa — versión de Planetiler:** hoy `latest`; fijar la versión exacta en cuanto el CI la imprima.
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
- [ ] **Toques de contacto sin límite:** «Llamar» y «Cómo llegar» registran `contact_taps` también sin sesión; falta un
  límite por IP/dispositivo para que nadie infle las estadísticas de un negocio. Antes de que el panel muestre esos
  números (bloque 1h).
- [ ] **Ficha — lo que se ve cuando exista su dato o módulo:** tarjeta «Quién está detrás» + «sobre nosotros» (Equipo,
  1h), reseñas y «N vecinos lo recomiendan» (Fase 2), menú/servicios/tienda/reservaciones/staff/eventos/jobs (sus
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
