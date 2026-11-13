# Super Admin · Contenido y Transacciones

_Pantallas: `/admin/contenido` (ADM-CONT) y `/admin/transacciones` (ADM-TX). Escritorio y teléfono. Acotado a las ciudades de quien mira. Versión: 13
nov 2026. Audiencia: equipo. Tema: equipo._

## Contenido
- **Qué es:** todo lo que escriben vecinos y negocios y ya existe: **reseñas**, **novedades**, **comentarios** de novedades y
  **vacantes**. Cifras (reseñas y comentarios, reportes abiertos, novedades y vacantes, ocultos), pestañas por tipo, búsqueda
  por texto, autor o negocio, y filtros **Con reporte**, **Ocultos** y **Votos negativos**. Lo reportado sale primero.
- **Ocultar / Mostrar** pide un motivo (plantillas o escrito). La reseña sale de la página y de las estrellas y el autor ve el
  motivo; la novedad y la vacante salen de la página y el dueño ve el motivo en su panel (la vacante deja de recibir
  solicitudes; las que tiene se quedan); el comentario sale de la novedad. Nada se borra; todo queda en la auditoría.
- **Ver negocio** abre su 360 › Contenido. Permiso: ver con `cont:ver`; ocultar con `neg:retirar`.
- Publicaciones de la Comunidad, comentarios de vecinos, auto-moderación, «Hoy en el barrio» y cuenta oficial
  están abajo y en `admin-cuenta-oficial.md`.

### Publicaciones de la Comunidad
- Pestaña **Publicaciones** (y en **Todo**): preguntas, recomendaciones, encuestas y publicaciones de los vecinos y de la cuenta
  oficial de la ciudad, con tipo, autor, el negocio recomendado, votos + / −, si está fijada o con comentarios bloqueados y, si
  está oculta, el motivo. Las que su autor borró no salen aquí (quedan en la base como borradas).
- **Ocultar / Restaurar** (Admin y Moderador): con motivo. Sale del muro y de su página para todos; el autor la sigue viendo con
  el motivo y recibe el aviso «Ocultamos tu publicación» (sin SMS). Restaurar la devuelve y le avisa. Al ocultarla deja de estar fijada.
- **Fijar / Desfijar** (Admin, Ciudad, Moderador): con motivo; sale arriba del muro de su ciudad **7 días**, una a la vez (la que
  estaba fijada se desfija). No cambia los votos de nadie.
- **Bloquear / Abrir comentarios**: con motivo; nadie más comenta ni responde en el hilo, lo que ya está se queda.
- **Ver** abre la publicación como la ve un vecino. Todo queda en la auditoría (`com.publicacion.*`) con antes → después.

### Comentarios de vecinos
- Pestaña **Comentarios de vecinos** (y en **Todo**): comentarios y respuestas del hilo de la Comunidad, con autor, el negocio
  que recomiendan, votos + / − y, si está oculto, el motivo. Los que su autor borró no salen aquí.
- **Ocultar / Restaurar** (Admin y Moderador): con motivo. Sale del hilo para todos (si tenía respuestas, queda «Comentario oculto
  por las reglas del barrio») y deja de contar en «Recomendados en este hilo»; el autor recibe «Ocultamos tu comentario» con el
  motivo (sin SMS). Restaurar lo devuelve y le avisa. **Ver** abre la publicación en ese comentario. Auditoría `com.comentario.*`.

### Hoy en el barrio
- Pestaña **Hoy en el barrio** (la cifra «HOY EN EL BARRIO» de arriba también la abre): lo que sale **ahora** en Hoy en tus
  ciudades, con su **origen** (la novedad de qué negocio, quién la publicó en su panel, hace cuánto, cuántos lo siguen) y la
  etiqueta **EN HOY · QUEDAN N H**. Debajo, lo que To'Latino **retiró de Hoy** en las últimas 24 h, con quién y por qué.
- Sale exactamente lo mismo que ve la gente: la regla vive en la base (novedad en vivo de un negocio **Pro** con Novedades encendido,
  sin pausa, no oculta, no detenida, sin vencer, **para todos** —no «solo seguidores»—, publicada hace menos de **24 h** y no
  retirada). Lo de un negocio Free, lo oculto, lo detenido, lo vencido o lo de más de 24 h nunca sale (guardián `hoySoloEnVivo`).
- **Retirar de Hoy** (Admin y Moderador, `cont:retirar`): pide motivo (plantillas: no es una novedad, engañosa o con precio falso,
  datos de otra persona, repetida, rompe las reglas). La novedad **sigue en la página del negocio**; solo sale de Hoy. El negocio
  recibe «Retiramos una novedad de Hoy en el barrio» con el motivo (sin SMS) y lo ve en su panel. **Devolver a Hoy** lo deshace si
  todavía está en sus 24 h. Para quitarla también de su página, se oculta desde **Novedades**. Auditoría `hoy.retirar` / `hoy.devolver`.
- **Ver en su página** abre la ficha › Novedades; **Negocio 360** abre su contenido.

### Cuenta oficial
- Pestaña **Cuenta oficial**: escribir, programar y fijar como «To'Latino {Ciudad}». Detalle en `admin-cuenta-oficial.md`.

### Pestañas, filtros y acciones de Contenido
- **Pestañas** (como el prototipo): **Todo · Publicaciones · Comentarios · Hoy en el barrio · Reseñas · Auto-moderación · Cuenta oficial**.
  Novedades, comentarios de novedades y vacantes siguen en **Todo** con el filtro **Tipo**.
- **Filtros:** Tipo, **Ciudad**, **Se ven / Ocultos**, **Con reporte**, **Votos negativos**, **10+ votos**, **De invitados** (vive en otra
  ciudad), **Rango del autor** (4, 7 o 9 o más) y **autor** (desde Usuarios 360° › Comunidad › «Ver todo en Contenido»). Búsqueda por texto,
  autor o negocio. Lo reportado sale primero. **Páginas con cursor** (← →): nunca se salta ni se repite una fila aunque entren nuevas.
- **Ver hilo:** la publicación como en la Comunidad (autor, rango, tema, fotos, encuesta con sus votos, el negocio recomendado, votos) y sus
  comentarios, los más votados primero y cada respuesta debajo; lo oculto sale marcado con su motivo. Abierto desde un comentario, ese
  comentario va **marcado y a la vista** («COMENTARIO DE ORIGEN»). Desde ahí: Ocultar / Restaurar con motivo, ir al autor o al reporte.
- **Ocultar los N reportados** (escritorio, quien puede ocultar): oculta de una vez las publicaciones y comentarios de la Comunidad que se ven
  y tienen un reporte abierto. Pide un motivo; muestra el **progreso** (N de M) y al final cuántos se ocultaron y **cuáles no y por qué**.
  **La cuenta oficial nunca se oculta en lote** (sale como «no se pudo»: si hace falta, ocúltala sola desde su fila). Cada autor recibe el
  motivo con «Apelar»; quienes reportaron, el resultado (sin nombres); los reportes y el caso de la cola Reportes quedan decididos; todo en la
  auditoría (`com.publicacion.ocultar_lote`, `com.comentario.ocultar_lote`).
- **Mover de ciudad** (Admin, Ciudad, Moderador; tus ciudades): una publicación que habla de otra ciudad pasa a su muro con sus comentarios;
  la ubicación la vuelve a poner el sistema (centro del barrio o de la ciudad, nunca la de la persona) y se desfija. Una **recomendación** o
  un hilo con negocios recomendados **no se mueve** (va con su negocio): se oculta con el motivo. Queda en la auditoría.
- Las cifras y el tiempo de Contenido salen de la base; los plazos (minutos para editar, días para apelar) de **Sistema › Configuración**.
- Arriba, **PUBLICACIONES**, comentarios y reseñas son totales que el sistema vuelve a contar **cada 10 minutos** (contarlos en cada vista era
  muy lento con millones); **REPORTES ABIERTOS**, **OCULTOS**, Hoy en el barrio y «Ocultar los N reportados» se cuentan al momento.

## Transacciones
- **Qué es:** pedidos, reservaciones y citas de los **últimos 90 días**. Cifras: hoy (y lo pedido hoy), lo retenido ahora, pedidos
  terminados en 90 días, los que no se dieron (cancelados, rechazados o sin respuesta) y reservaciones. Pestañas Todas, Pedidos
  y Reservaciones; estados Pendiente, En curso, Terminado, Cancelado y No se dio; búsqueda por número, negocio o cliente.
- **Exportar** (permiso `tx:exportar`): CSV de lo filtrado (hasta 5,000 filas), con las celdas protegidas contra fórmulas; queda
  en la auditoría.
- **Dinero:** pedidos, reservaciones y citas se pagan en el local, al recibir o **con tarjeta en la app**; cada cobro dice su estado
  (**retenido · cobrado · liberado · devuelto**) y **Devolver** (con motivo) devuelve hasta lo cobrado. En citas, la tarjeta es el depósito y
  la comisión (8 %) va sobre el depósito. Las disputas del banco tienen su cola (ver `disputas.md`).
- **Evento privado** (pestaña «Evento privado»): cada solicitud EP-… con personas, para cuándo, cuántas propuestas, la versión aceptada, el
  total, el depósito y su estado (retenido · cobrado · devuelto), si se quedó con el restaurante, la comisión y cómo cerró. **Devolver** (permiso
  `tx:aprobar`) devuelve hasta lo cobrado menos lo devuelto, con motivo y auditoría. Las ayudas van a Colas › Soporte y las disputas del banco a
  Colas › Disputas, como el resto.

## English

Tabs All · Posts · Comments · Today nearby · Reviews · Auto-moderation · Official account (updates, update comments
and job posts stay under All with the Type filter). Filters: type, city, visible/hidden, reported, downvoted, 10+ votes, from visitors, author
rank and author; cursor pages (← →). "Ver hilo" shows the post as in the Community with all its comments (hidden ones marked) and the comment
you came from highlighted. "Ocultar los N reportados" (desktop) hides every visible reported Community post and comment with one reason,
shows progress and which ones failed and why; the official account is never hidden in bulk. Each author gets the reason with Appeal; reports
and the queue case are closed; all audited. "Mover de ciudad" moves a post (not a recommendation) to another of your cities with its comments.

Today nearby: the "Hoy en el barrio" tab lists what is live in Today nearby in your cities (the same database rule people
see: a Pro business's live, public update from the last 24 h), with its origin and hours left, plus what To'Latino took out in the
last 24 h. "Retirar de Hoy" (Admin, Moderator) asks for a reason, keeps the update on the business page, notifies the business (no
SMS) and is audited; "Devolver a Hoy" undoes it within the 24 h. The "Cuenta oficial" tab is described in admin-cuenta-oficial.md.
Neighbor comments: the "Comentarios de vecinos" tab lists Community comments and replies; Admins and Moderators hide or
restore them with a reason (the author gets a notice, no SMS; a hidden comment stops counting in the thread's recommended list),
audited as com.comentario.*. Community posts: the Posts tab lists neighbors' and the official city account's posts; Admins and Moderators hide or
restore them with a reason (the author still sees it with the reason and gets a notice, no SMS), and Admin, City and Moderator
roles pin one per city for 7 days or lock comments, all audited.

Content lists reviews, business updates, update comments and job posts in your cities, with search, type tabs and filters
(reported, hidden, downvoted); hiding or showing asks for a reason the author or owner sees, and is audited. Transactions lists
orders and table reservations from the last 90 days with daily and 90-day figures, tabs, status filters, search and a CSV export
(formula-safe, audited). Orders, reservations and appointments are paid at the store, on delivery or by card in the app; each charge
shows its status (held · charged · released · refunded) and Refund (with a reason) returns up to what was charged.
- On **Content**, the posts, comments and reviews totals at the top are recounted **every 10 minutes**; open reports, hidden, Today and «Hide the N reported» are counted right away.
