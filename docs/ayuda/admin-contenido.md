# Super Admin · Contenido y Transacciones

_Pantallas: `/admin/contenido` (ADM-CONT) y `/admin/transacciones` (ADM-TX). Escritorio y teléfono. Versión: Fase 2 · bloque
2i (6 nov 2026). Acotado a las ciudades de quien mira._

## Contenido
- **Qué es:** todo lo que escriben vecinos y negocios y ya existe: **reseñas**, **novedades**, **comentarios** de novedades y
  **vacantes**. Cifras (reseñas y comentarios, reportes abiertos, novedades y vacantes, ocultos), pestañas por tipo, búsqueda
  por texto, autor o negocio, y filtros **Con reporte**, **Ocultos** y **Votos negativos**. Lo reportado sale primero.
- **Ocultar / Mostrar** pide un motivo (plantillas o escrito). La reseña sale de la página y de las estrellas y el autor ve el
  motivo; la novedad y la vacante salen de la página y el dueño ve el motivo en su panel (la vacante deja de recibir
  solicitudes; las que tiene se quedan); el comentario sale de la novedad. Nada se borra; todo queda en la auditoría.
- **Ver negocio** abre su 360 › Contenido. Permiso: ver con `cont:ver`; ocultar con `neg:retirar`.
- Publicaciones de la comunidad, «Hoy en el barrio», auto-moderación y cuenta oficial llegan con la comunidad (Fase 5).

### Publicaciones de la Comunidad (5a, 7 nov)
- Pestaña **Publicaciones** (y en **Todo**): preguntas, recomendaciones, encuestas y publicaciones de los vecinos y de la cuenta
  oficial de la ciudad, con tipo, autor, el negocio recomendado, votos + / −, si está fijada o con comentarios bloqueados y, si
  está oculta, el motivo. Las que su autor borró no salen aquí (quedan en la base como borradas).
- **Ocultar / Restaurar** (Admin y Moderador): con motivo. Sale del muro y de su página para todos; el autor la sigue viendo con
  el motivo y recibe el aviso «Ocultamos tu publicación» (sin SMS). Restaurar la devuelve y le avisa. Al ocultarla deja de estar fijada.
- **Fijar / Desfijar** (Admin, Ciudad, Moderador): con motivo; sale arriba del muro de su ciudad **7 días**, una a la vez (la que
  estaba fijada se desfija). No cambia los votos de nadie.
- **Bloquear / Abrir comentarios**: con motivo; nadie más comenta (el hilo llega en 5b), lo que ya está se queda.
- **Ver** abre la publicación como la ve un vecino. Todo queda en la auditoría (`com.publicacion.*`) con antes → después.

## Transacciones
- **Qué es:** pedidos y reservaciones de los **últimos 90 días**. Cifras: hoy (y lo pedido hoy), pedidos terminados en 90 días
  (pagados en el local), los que no se dieron (cancelados, rechazados o sin respuesta) y reservaciones. Pestañas Todas, Pedidos
  y Reservaciones; estados Pendiente, En curso, Terminado, Cancelado y No se dio; búsqueda por número, negocio o cliente.
- **Exportar** (permiso `tx:exportar`): CSV de lo filtrado (hasta 5,000 filas), con las celdas protegidas contra fórmulas; queda
  en la auditoría.
- Hoy todo se paga en el local o al recibir: no hay retenido, cobro con tarjeta, devoluciones ni comisión (llegan con Stripe,
  bloque 2d). Citas, boletos y apartados llegan con sus fases.

---

## English
Community posts (5a): the Posts tab lists neighbors' and the official city account's posts; Admins and Moderators hide or
restore them with a reason (the author still sees it with the reason and gets a notice, no SMS), and Admin, City and Moderator
roles pin one per city for 7 days or lock comments, all audited.

Content lists reviews, business updates, update comments and job posts in your cities, with search, type tabs and filters
(reported, hidden, downvoted); hiding or showing asks for a reason the author or owner sees, and is audited. Transactions lists
orders and table reservations from the last 90 days with daily and 90-day figures, tabs, status filters, search and a CSV export
(formula-safe, audited). Card payments, holds, refunds and commission arrive with Stripe.
