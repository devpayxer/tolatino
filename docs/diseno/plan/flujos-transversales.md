# To' Latino — Flujos transversales pendientes

Estado: **APROBADO por el usuario**. Decisiones finales que ajustan este
archivo: votos **positivo y negativo**; chat entre usuarios **solo entre
seguidores** (sin "Solicitudes" a desconocidos); El Patio **en el
lanzamiento** (asincrónico primero), **sin límite de edad**; Novedades a las
24 h **desaparece** de Hoy en el barrio. Dudas de la sección final resueltas. Cada flujo trae su
**espejo de gestión** (`DASH` / `USR` / `ADM`) por regla maestra.

---

## 1. Cambio de ciudad (declarado + desarrollado)

**Reglas declaradas por el usuario:**
- El usuario **puede cambiar de ciudad sin problemas** para **buscar negocios
  o eventos**.
- Para el **stream de Community** hay **límite de 30 días** (su ciudad de
  comunidad).
- Cuando un usuario **postea, se publica su ciudad**.
- Si va a **otra ciudad a publicar**, lleva un **badge de "Invitado"** (o
  similar) **y de dónde viene**.

**Cómo funciona (propuesta):**
- Dos conceptos distintos, visibles y con nombre:
  - **Ciudad que estoy viendo** (selector del header): cambia libre, al
    instante, y filtra Negocios y Eventos. Se recuerda la última.
  - **Mi ciudad** (comunidad): la del perfil; es la que aparece en sus posts,
    su Tabla del Barrio y sus rangos. Cambiable **cada 30 días**; el perfil
    muestra "Podrás cambiarla el {fecha}".
- En Community, al ver otra ciudad: puede **leer**; al **publicar o comentar**
  ahí, el post lleva **badge "Invitado · de Hazleton"** (ES) / "Visitor · from
  Hazleton" (EN). Sus votos cuentan, pero los puntos de rango se acreditan en
  **su** ciudad.
- Al cambiar "Mi ciudad": aviso de qué pasa (Tabla del Barrio, torneos y
  rango de ciudad se reinician en la nueva; el rango global se conserva) →
  confirmación → 30 días de bloqueo → sus posts pasados conservan la ciudad
  donde se publicaron.
- Ciudad no abierta todavía: puede seleccionarla para ver (estado "próximamente"
  con lista de espera), no puede fijarla como "Mi ciudad".
- Detección por GPS: sugiere, nunca cambia sola.

**Espejo:** `USR` → Perfil: Mi ciudad, fecha de próximo cambio, historial.
`ADM-USR` → historial de cambios, forzar cambio / excepción a los 30 días,
métricas de "invitados" por ciudad. `ADM-CONT` → filtro "posts de invitados".

---

## 2. Notificaciones (propuesta)

**Centro de notificaciones** (campana del header, contador; misma pantalla en
las 4 apps con contenido según rol).
- Lista agrupada por día; cada una: ícono del tipo, texto, hora, **acción
  directa** (Ver pedido, Aprobar cita, Responder). Tocar → pantalla exacta.
- Pestañas: **Todas · Pedidos y citas · Community · Negocio** (si tiene) ·
  Sistema. Marcar todas como leídas.
- **Canales**: in-app, push, SMS (solo lo crítico: OTP, cita aprobada/hoy,
  pedido listo), correo (recibos, resúmenes), WhatsApp (futuro, a validar).

**Catálogo de eventos que notifican (por rol):**
- *Cliente*: pedido (aceptado, listo, en camino, entregado, cancelado),
  cita (aprobada, rechazada, reprogramada, recordatorio 24 h y 2 h, "califica"),
  boleto (comprado, evento mañana, cambio/cancelación), Community (respuesta,
  voto que alcanza umbral, mención, comentario destacado, nuevo seguidor,
  post de alguien que sigo), Hoy en el barrio de negocios favoritos, mensaje
  nuevo, rango subido / insignia, monedas ganadas, torneo, cupón por vencer,
  reembolso, seguridad (nuevo inicio de sesión), ciudad abierta.
- *Negocio*: nueva orden, nueva solicitud de cita (con acción Aprobar /
  Rechazar desde la notificación), cita cancelada, no-show, nueva reseña
  (Responder), pago recibido / fallido, payout, fin de prueba Pro (5 días,
  1 día), sello aprobado/rechazado, staff aceptó invitación, stock bajo,
  nuevo mensaje, reporte sobre su contenido, evento: venta, aforo 90%.
- *Repartidor*: oferta de pedido, cambios, cuadre.
- *Portero*: asignación a evento, apertura de puerta.

**Preferencias** (`USR` → Notificaciones): por **categoría × canal** con
toggles; **horas de silencio**; resumen diario en vez de una por una para
Community; idioma. Lo transaccional crítico no se puede apagar (cita de hoy,
OTP).

**Reglas de diseño:** agrupar ("3 personas votaron tu recomendación"), nunca
notificar dos veces lo mismo por dos canales salvo lo crítico, texto en el
idioma del usuario, deep link siempre.

**Espejo:** `ADM-NOTIF` (plantillas, envíos, log) ya previsto; `DASH` →
Notificaciones del negocio con preferencias por moderador/área.

---

## 3. Direcciones para delivery (propuesta)

- **Libreta de direcciones** del usuario: etiqueta (Casa, Trabajo, Mamá…),
  dirección con autocompletar + **pin ajustable** en mapa (importante en zonas
  donde el número no coincide), apartamento/piso, **referencias** ("portón
  azul, tocar timbre 2"), teléfono de contacto para esa entrega, instrucciones
  al repartidor, **predeterminada**.
- **Agregar / editar / eliminar**; validación de que está dentro de la **zona
  de entrega del negocio** (aviso claro si no: "Este negocio no entrega ahí ·
  Ver pickup").
- En el **checkout**: selector de dirección con la predeterminada arriba,
  "Agregar nueva" sin salir del checkout, "Usar mi ubicación actual" (entrega
  en el punto donde estoy: parque, trabajo).
- **Cambio de dirección con pedido en curso**: permitido hasta "Recogido" si
  la nueva sigue en zona; recalcula costo; el negocio y el repartidor reciben
  aviso; después de "Recogido", solo por chat/llamada.
- Dirección de **facturación** separada (para recibos) opcional.
- Privacidad: el negocio ve la dirección solo del pedido activo; el
  repartidor solo durante la entrega.

**Espejo:** `USR` → Direcciones (trío). `DASH` → en la orden: dirección, mapa,
referencias, historial de cambios. `ADM-TX` → dirección en la orden,
direcciones sospechosas (fraude), zonas con fallos de entrega.

---

## 4. Seguir usuarios (propuesta)

- **Seguir** a un vecino desde su perfil o desde un post; sin aprobación
  (perfil público dentro de la ciudad). Opción de **perfil privado** →
  solicitud.
- **Qué da seguir**: pestaña **"Siguiendo"** en el feed de Community
  (posts de la gente que sigo, en cualquier ciudad, con su ciudad visible),
  notificación opcional por publicación, prioridad de sus comentarios en mis
  posts.
- **Seguir negocios = Favoritos** (ya existe): recibe Hoy en el barrio y
  eventos de ese negocio. No se duplica el concepto: a personas se les
  "sigue", a negocios se les "guarda".
- Contadores en el perfil (seguidores / siguiendo) con opción de ocultarlos.
- **Bloquear** (mutuo e invisible para el bloqueado) y **silenciar** (no veo
  sus posts, él no lo sabe).
- Gamification: seguir no da puntos (evita farmeo); tener seguidores no da
  rango (evita popularidad vacía). Solo aporte validado.

**Espejo:** `USR` → Siguiendo / Seguidores / Bloqueados. `ADM-USR` → grafo de
seguimiento en el 360°, detección de redes de cuentas falsas.

---

## 5. Chats privados (propuesta)

**Dos tipos de conversación, misma bandeja (`Mensajes` en el header):**
1. **Cliente ↔ Negocio** (ya previsto): siempre ligado a un contexto — un
   pedido, una cita, un producto, "consulta general". El negocio responde
   desde su Dashboard (cualquier moderador con área Mensajes); plantillas de
   respuesta rápida; horario de atención y respuesta automática fuera de
   horario; "tiempo típico de respuesta" visible en el listing.
2. **Usuario ↔ Usuario** (nuevo): desde un perfil o un post de Community.
   - Reglas antispam: el primer mensaje a alguien que **no te sigue** llega a
     **"Solicitudes"**; el receptor acepta / rechaza / bloquea. Rango mínimo
     para iniciar chats con desconocidos (ej. Vecino) para frenar cuentas
     nuevas de spam.
   - Contenido: texto, foto, ubicación, **compartir un negocio, un post o un
     evento** (tarjeta embebida), nota de voz.
   - Sin dinero entre usuarios (no es billetera).
   - **Grupos** de barrio (futuro, a validar): por ahora no.
3. **Mesa de juego** (El Patio): chat de mesa efímero con emotes, separado de
   la bandeja.

**Transversal:** leído/entregado, escribiendo, silenciar, archivar, reportar
conversación (adjunta el hilo al reporte), bloquear, borrar para mí,
búsqueda, traducción automática ES↔EN (sugerida, a validar), teléfonos
enmascarados en cliente↔negocio hasta que ambos lo permitan.

**Espejo:** `USR` → Mensajes (bandeja). `DASH` → Mensajes (bandeja del
negocio con asignación por moderador, plantillas, auto-respuesta, métricas de
respuesta). `ADM-NOTIF` → acceso de auditoría solo con reporte abierto;
`ADM-CONF` → reportes de chat, palabras prohibidas, límites de envío.

---

## 6. Requerimientos adicionales para Games — El Patio (propuesta)

Complementa lo ya aprobado (Dominó, Parchís, mesas, monedas, torneos, modo
asincrónico, antitrampa). Lo que faltaba:

**Principio declarado por el usuario (regla vigente):** los juegos **no son
para generar dinero**; son para **enganchar a la audiencia a venir siempre** y
**no espantarla**. Consecuencias:
- **Nunca se venden monedas ni se cobra por jugar.** Cero dinero real en El
  Patio. (Duda cerrada.)
- **Jugar siempre es posible**: si alguien se queda sin monedas, tiene
  **mesas gratis** ilimitadas (sin premio) y recupera monedas por volver al
  día siguiente. Nadie se queda afuera.
- **Barrera de entrada mínima**: entrar a una mesa toma dos toques; sin
  registro de juego aparte, sin tutorial obligatorio (ayuda opcional).
- **Sin castigos que duelan**: perder no resta monedas más allá de la
  entrada; abandonar solo afecta la reputación de juego, y se perdona con el
  tiempo; sin rachas que humillen al que falta un día (la racha "pausa", no
  se rompe, hasta 2 días).
- **Diseñado para volver, no para retener a la fuerza**: recompensa diaria
  pequeña, "te toca" en el modo asincrónico, torneo semanal con premio de
  negocio local, retos entre amigos. Ninguna mecánica de presión (contadores
  de "última oportunidad", compras, publicidad intrusiva).
- **Premios** siempre en **cupones de negocios locales**, nunca dinero. El
  negocio patrocinador define el cupón; el ganador lo canjea con QR; el
  negocio lo valida desde su Dashboard. El premio es un pretexto para visitar
  el negocio, no un ingreso.
- Tono: patio de casa, familiar, para jugar con la gente del barrio.

**Entrada y economía**
- **Monedas de bienvenida** al entrar por primera vez; **monedas diarias** por
  volver (pequeñas, con tope) y por aportar en Community (validado).
- Las monedas **solo se ganan**, nunca se compran.

**Partida**
- Reglas por variante: Dominó (doble seis, a 100/200, cierre y tranque,
  parejas fijas), Parchís (clásico / rápido, dados, casas seguras, comer y
  barrera). Ayuda de reglas dentro de la mesa.
- **Tiempo por turno** (30 s / 60 s) con auto-jugada o pérdida de turno;
  modo asincrónico: 24 h por turno, notificación "te toca".
- **Reconexión**: 90 s para volver antes de que la IA/pareja te sustituya o
  se anule la partida sin castigo si la caída es masiva.
- **Abandono**: penalización en reputación de juego (no en rango de
  Community) y pérdida de la entrada.
- **Espectadores**: ver mesas públicas, sin chat con los jugadores (solo
  entre espectadores) para evitar soplar fichas.
- **Invitar a jugar** a un amigo (link/código) y **retar** a alguien de la
  Tabla.

**Social y estatus**
- **Perfil de jugador**: nivel de juego (separado del rango de Community),
  partidas, % victorias, racha, insignias de juego (100 partidas, campeón de
  torneo, invicto de la semana).
- **Ranking de la ciudad** por juego y temporada (mensual); temporadas con
  reinicio y premio.
- **Torneos**: inscripción con monedas, bracket, horarios, patrocinador,
  reglas, transmisión (espectadores), premios; el negocio patrocinador crea
  el torneo desde su Dashboard y el admin lo aprueba.
- **Salas por comunidad** (futuro): "Los dominicanos de Hazleton" — a validar.

**Seguridad y conducta**
- Edad mínima 18 para El Patio (por si hay premios), a validar.
- Reportar jugador (colusión, lenguaje), silenciar chat de mesa, filtro de
  palabras, baneo de juego separado del baneo de la plataforma.
- **Antitrampa**: dos cuentas del mismo dispositivo en una mesa, patrones de
  parejas que siempre coinciden, victorias anómalas; revisión en `ADM-GAM`.
- Límite de horas diarias configurable ("Llevas 2 h jugando").

**Espejo:** `USR` → Games: monedas, historial, torneos, cupones ganados.
`DASH` → Patrocinar torneo, cupones emitidos/canjeados, validar cupón con QR.
`ADM-GAM` (ya previsto) + aprobación de torneos patrocinados, economía de
monedas, edad mínima, reportes de juego.

---

## 7. Otros flujos que también faltaban (propuesta, breve)

- **Recuperar acceso**: cambié de número (verificación por correo + últimos
  datos), perdí el teléfono (cerrar sesiones remotas desde web).
- **Reportar** (unificado): post, comentario, reseña, negocio, evento,
  usuario, mensaje, foto → motivo → detalle → confirmación → seguimiento en
  `USR` → Mis reportes. Alimenta `ADM-COLAS`.
- **Reseña completa**: solo tras transacción o cita cumplida (verificada) o
  como "visitante" sin verificación (marcada), estrellas + texto + fotos,
  editar 48 h, respuesta del negocio (Pro), reportar, "útil".
- **Compartir**: negocio, post, evento, producto → link + tarjeta de vista
  previa + QR (para el negocio imprimirlo).
- **Cupones y promociones del negocio** (Pro): código o automático, condiciones,
  vigencia, usos, se muestran en el listing y en Hoy en el barrio; canje en
  checkout o con QR en el local.
- **Cotización** (servicios sin precio fijo): formulario del cliente → el
  negocio responde con precio → aceptar → cita u orden.
- **Lista de espera** para citas llenas y **recordatorio** de recompra.
- **Trabajos**: vacante (puesto, pago, horario, requisitos, idioma) →
  postulación con perfil básico y teléfono → el negocio ve postulantes en su
  Dashboard → estados (nuevo, contactado, descartado). Sin CV obligatorio.
- **Relacionados**: el negocio propone; el otro acepta; también sugeridos
  automáticos por categoría/cercanía (marcados como "cerca de ti").
- **Modo negocio ↔ modo cliente** en la app principal para dueños (cambio
  rápido desde el avatar), y **selector de negocio** si tiene varios.
- **Borrar cuenta**: motivo, qué pasa con sus negocios (transferir o cerrar),
  período de gracia 14 días, confirmación por OTP.
- **Accesibilidad y baja alfabetización digital**: texto grande, íconos con
  etiqueta, notas de voz en chat, botones de llamada visibles, sin jerga.

---

## Dudas para el formulario final (añadidas)
- ¿Edad mínima 18 para El Patio?
- ¿Chats usuario↔usuario en v1.0 o después?
- ¿Traducción automática ES↔EN en chats?
- ¿Perfil privado / solicitudes de seguimiento, o todo público en la ciudad?
