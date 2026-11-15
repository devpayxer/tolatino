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

### Content
- **What it is:** everything neighbors and businesses write that already exists: **reviews**, **updates**, update **comments** and **job posts**. Figures
  (reviews and comments, open reports, updates and job posts, hidden), tabs by type, search by text, author or business, and the filters **Reported**,
  **Hidden** and **Downvoted**. What is reported comes first.
- **Hide / Show** asks for a reason (templates or written). The review leaves the page and the stars and the author sees the reason; the update and the job post
  leave the page and the owner sees the reason in their panel (the job post stops receiving applications; the ones it already has stay); the comment leaves the
  update. Nothing is deleted; everything goes in the audit log.
- **See business** opens its 360 › Content. Permission: view with `cont:ver`; hide with `neg:retirar`.
- Community posts, neighbor comments, auto-moderation, «Today nearby» and the official account are below and in `admin-cuenta-oficial.md`.

#### Community posts
- **Posts** tab (and in **All**): questions, recommendations, polls and posts from neighbors and from the city's official account, with type, author, the
  recommended business, votes + / −, whether it is pinned or has comments locked and, if hidden, the reason. The ones their author deleted do not show here
  (they stay in the database as deleted).
- **Hide / Restore** (Admin and Moderator): with a reason. It leaves the wall and its page for everyone; the author still sees it with the reason and gets the
  notice «We hid your post» (no SMS). Restore brings it back and notifies them. Hiding it also unpins it.
- **Pin / Unpin** (Admin, City, Moderator): with a reason; it goes to the top of its city's wall for **7 days**, one at a time (the one that was pinned gets
  unpinned). It does not change anyone's votes.
- **Lock / Open comments**: with a reason; nobody else comments or replies in the thread, and what is already there stays.
- **View** opens the post the way a neighbor sees it. Everything goes in the audit log (`com.publicacion.*`) with before → after.

#### Neighbor comments
- **Neighbor comments** tab (and in **All**): comments and replies in Community threads, with author, the business they recommend, votes + / − and, if hidden,
  the reason. The ones their author deleted do not show here.
- **Hide / Restore** (Admin and Moderator): with a reason. It leaves the thread for everyone (if it had replies, it stays as «Comment hidden under the
  neighborhood rules») and stops counting in «Recommended in this thread»; the author gets «We hid your comment» with the reason (no SMS). Restore brings it
  back and notifies them. **View** opens the post at that comment. Audit entries `com.comentario.*`.

#### Today nearby
- **Today nearby** tab (the «TODAY NEARBY» figure at the top opens it too): what shows **right now** in Today in your cities, with its **origin** (which
  business's update, who posted it in their panel, how long ago, how many follow it) and the label **ON TODAY · N H LEFT**. Below it, what To'Latino **removed
  from Today** in the last 24 h, with who and why.
- It shows exactly what people see: the rule lives in the database (a live update from a **Pro** business with Updates turned on, not paused, not hidden, not
  stopped, not expired, **for everyone** —not «followers only»—, posted less than **24 h** ago and not removed). Anything from a Free business, hidden, stopped,
  expired or older than 24 h never shows (guardian `hoySoloEnVivo`).
- **Remove from Today** (Admin and Moderator, `cont:retirar`): asks for a reason (templates: it is not an update, misleading or with a false price, someone
  else's data, repeated, breaks the rules). The update **stays on the business page**; it only leaves Today. The business gets «We removed an update from Today
  in the neighborhood» with the reason (no SMS) and sees it in their panel. **Put back on Today** undoes it if it is still within its 24 h. To remove it from
  its page too, hide it from **Updates**. Audit entries `hoy.retirar` / `hoy.devolver`.
- **See on their page** opens the business page › Updates; **Business 360** opens its content.

#### Official account
- **Official account** tab: write, schedule and pin as «To'Latino {City}». Details in `admin-cuenta-oficial.md`.

#### Tabs, filters and actions in Content
- **Tabs** (as in the prototype): **All · Posts · Comments · Today nearby · Reviews · Auto-moderation · Official account**. Updates, update comments and job
  posts stay in **All** with the **Type** filter.
- **Filters:** Type, **City**, **Visible / Hidden**, **Reported**, **Downvoted**, **10+ votes**, **From visitors** (lives in another city), **Author rank**
  (4, 7 or 9 or more) and **author** (from Users 360° › Community › «See all in Content»). Search by text, author or business. What is reported comes first.
  **Cursor pages** (← →): a row is never skipped or repeated even when new ones come in.
- **View thread:** the post as in the Community (author, rank, topic, photos, poll with its votes, the recommended business, votes) and its comments, the most
  voted first and each reply under its comment; what is hidden shows marked with its reason. When opened from a comment, that comment is **marked and in view**
  («ORIGIN COMMENT»). From there: Hide / Restore with a reason, go to the author or to the report.
- **Hide the N reported** (desktop, whoever can hide): hides at once the visible Community posts and comments that have an open report. It asks for a reason;
  it shows the **progress** (N of M) and at the end how many were hidden and **which were not and why**. **The official account is never hidden in bulk**
  (it shows as «COULD NOT»: if needed, hide it on its own from its row). Each author gets the reason with «Appeal»; those who reported get the result (no
  names); the reports and the case in the Reports queue are decided; everything is in the audit log (`com.publicacion.ocultar_lote`, `com.comentario.ocultar_lote`).
- **Move city** (Admin, City, Moderator; your cities): a post that talks about another city moves to that city's wall with its comments; the location is set
  again by the system (center of the neighborhood or the city, never the person's) and it is unpinned. A **recommendation** or a thread with recommended
  businesses **does not move** (it goes with its business): hide it with the reason. It goes in the audit log.
- The figures and times in Content come from the database; the deadlines (minutes to edit, days to appeal) come from **System › Configuration**.
- At the top, **POSTS**, comments and reviews are totals that the system recounts **every 10 minutes** (counting them on every view was too slow with
  millions); **OPEN REPORTS**, **HIDDEN**, Today nearby and «Hide the N reported» are counted right away.

### Transactions
- **What it is:** orders, reservations and appointments from the **last 90 days**. Figures: today (and what was ordered today), what is held now, orders
  finished in 90 days, the ones that did not happen (canceled, rejected or unanswered) and reservations. Tabs All, Orders and Reservations; statuses Pending,
  In progress, Done, Canceled and Did not happen; search by number, business or customer.
- **Export** (permission `tx:exportar`): CSV of what is filtered (up to 5,000 rows), with cells protected against formulas; it goes in the audit log.
- **Money:** orders, reservations and appointments are paid at the business, on receipt or **by card in the app**; each charge shows its status
  (**held · charged · released · refunded**) and **Refund** (with a reason) returns up to what was charged. For appointments, the card is the deposit and the
  commission (8 %) applies to the deposit. Bank disputes have their own queue (see `disputas.md`).
- **Private event** (the «Private event» tab): each EP-… request with people, for when, how many proposals, the accepted version, the total, the deposit and
  its status (held · charged · refunded), whether it stayed with the restaurant, the commission and how it closed. **Refund** (permission `tx:aprobar`) returns
  up to what was charged minus what was refunded, with a reason and audit. Help requests go to Queues › Support and bank disputes to Queues › Disputes, like
  the rest.
