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
Content lists reviews, business updates, update comments and job posts in your cities, with search, type tabs and filters
(reported, hidden, downvoted); hiding or showing asks for a reason the author or owner sees, and is audited. Transactions lists
orders and table reservations from the last 90 days with daily and 90-day figures, tabs, status filters, search and a CSV export
(formula-safe, audited). Card payments, holds, refunds and commission arrive with Stripe.
