# Super Admin: Negocios y Colas · Super Admin: Businesses and Queues

_Pantallas: ADM-COLAS (`/admin/colas`) y ADM-NEG (`/admin/negocios`, `/admin/negocios/{id}`), teléfono y escritorio. Para el equipo de To'Latino (y El
Compa como copiloto del equipo). Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Colas:** todo lo que espera la decisión de una persona del equipo, la más vieja contra su plazo primero:
  **Sello de verificación** (48 h), **Negocios nuevos** (24 h, revisión ligera), **Medios marcados** (4 h, fotos que
  reportó un vecino), **Recomendaciones de vecinos** (7 días), **Licencias** (72 h) y **Cambios sensibles** (48 h,
  los reclamos de «Recuperar tu negocio» y los pedidos de borrar una cuenta; ver `admin-usuarios.md`). Cada persona ve solo las colas de su rol y de sus
  ciudades. «Tomar siguiente» te asigna el caso sin dueño más urgente; «Tomar» avisa a los demás «Lo está viendo X».
- **Negocios:** lista con buscador (nombre, id, teléfono, dirección, subcategoría), categoría, plan, estado, «Más
  filtros» y orden. El **360°** muestra el negocio como lo ve el cliente, lo que hizo el dueño y lo que hizo el equipo:
  Resumen (datos, fuerza del perfil, notas internas, acciones), Ficha (fotos y campos que se editan en su nombre,
  horario), Dinero (cobros, pagos al banco y su pausa, plan; ver `admin-negocio-dinero.md`), Equipo (quién entra al
  panel, staff) y Confianza (casos abiertos, sello, sanciones). Con permiso de Soporte, **Soporte** (los casos que abrió desde su panel); con
  permiso de El Compa, **El Compa** (cifras de 30 días del asistente en su panel y si está en pausa ahí; sin texto ni personas).

## Decisiones y lo que ve el negocio
| Acción | Dónde | Permiso | Qué ve el dueño / la página |
|---|---|---|---|
| Aprobar sello (marcando las 3 comprobaciones) | Cola sello | colas · aprobar | Check Verificado en la ficha; «Tienes el sello» en su panel |
| Pedir un dato / No aprobar (con motivo) | Cola sello | colas · aprobar | «To’Latino necesita un dato más» / «No se aprobó esta vez» con el motivo, y el botón para volver a pedirlo |
| Todo bien / Ocultar | Negocios nuevos | colas · aprobar | Ocultar: sale de búsquedas y categoría; aviso con el motivo en su panel |
| Está bien / Quitar foto | Medios marcados | colas · aprobar | La foto sale de la ficha; «To'Latino quitó 1 foto…» con el motivo en Fotos. La única foto visible no se quita |
| Ya existe (cuál) / Crear semilla / Descartar | Recomendaciones | colas · aprobar | Crear semilla: sale al final de su categoría como «Sin reclamar · ¿Es tuyo?» hasta que el dueño lo publique |
| Aplicar cambio / Rechazar (con motivo) | Cambios sensibles | colas · aprobar | Aplicar: quien reclamó queda como dueño y abre el panel; el dueño anterior sale del equipo. Si ya tenía dueño, solo un Admin y pasados 7 días del aviso en su panel (R2). Rechazar: ve el motivo |
| Dar / Quitar sello | 360 › Resumen | neg · editar | Ficha y panel; al quitarlo, aviso en su panel |
| Cierre temporal (1, 3, 7, 14 días) / Reabrir | 360 › Resumen | neg · editar | Ficha y listas: «Cerrado temporalmente»; panel: «To’Latino cerró tu página por unos días…»; vuelve solo |
| Ocultar · Suspender · Cerrar (solo Admin) · Restaurar | 360 › Resumen | neg · retirar | Sale de búsquedas y categoría; aviso con el motivo en su panel |
| Editar nombre, Quiénes somos, teléfono, dirección | 360 › Ficha | neg · editar | Marca «EDITADO POR TO’LATINO»; panel: «To’Latino corrigió tu nombre…» / «To’Latino editó tu «Quiénes somos»». Si el dueño lo cambia, gana lo suyo |
| Quitar / Restaurar foto | 360 › Ficha | neg · retirar | Igual que en Medios marcados |
| Quitar de la página / Volver a mostrar (staff) | 360 › Equipo | neg · retirar | La persona sigue en su equipo; en su panel «QUITADO POR TO’LATINO» |
| Nota interna | 360 › Resumen | neg · editar | Nunca la ve el negocio |
| Pausar / Reanudar Menú o Pedidos en línea (Comida) | 360 › Lo que vende | neg · retirar | Menú: la pestaña sale de su página. Pedidos: el menú se ve, sin poder pedir. Aviso con el motivo en su panel. El módulo dice cuántos pedidos en línea lleva este mes (y, con Free, cuántos de su techo) |
| Ocultar / Volver a mostrar un plato | 360 › Lo que vende | neg · retirar | El plato sale de su menú; «OCULTO POR TO’LATINO» con el motivo en su panel |
| Mantener / Ocultar / Ocultar y sancionar (advertencia, silencio 7 días, bloquear publicación 30 días, suspender 14 días) | Reportes de contenido (reseñas, 24 h) | colas · aprobar | Mantener: la reseña se queda; si el negocio pidió revisarla, el cliente ve «Revisada». Ocultar: sale de la página y de las ★; el autor ve OCULTA y el motivo en «Tu reseña» |
| Ocultar / Restaurar una reseña | 360 › Contenido | neg · retirar | Igual que Ocultar en Reportes de contenido; Restaurar la devuelve a la página y a las ★ |
| Ocultar / Mostrar una novedad · Pausar / Reanudar Novedades | 360 › Contenido | neg · retirar | La novedad sale de su página; panel: «OCULTA POR TO’LATINO» con el motivo. En pausa: sin pestaña y sin precios de oferta; el dueño ve el motivo |
| Ocultar / Mostrar una vacante · Pausar / Reanudar Jobs | 360 › Contenido | neg · retirar | La vacante sale de su página y nadie nuevo aplica (las solicitudes se quedan); panel: «OCULTA POR TO’LATINO» con el motivo. En pausa: sin pestaña Jobs; el dueño ve el motivo |

Toda acción pide motivo (salvo las aprobaciones, que guardan uno fijo) y queda en la auditoría: quién, qué, antes →
después, motivo y cuándo. Nada se borra.

## Preguntas frecuentes
**¿Por qué no veo una cola?** Tu rol no la trabaja (p. ej. Medios es de moderación) o tu ciudad no tiene casos.

**¿«Tomar» bloquea al resto?** Es un bloqueo suave: avisa «Lo está viendo X»; otra persona puede tomarlo.

**¿Le llega un SMS al dueño?** No por lo que decide el equipo: el dueño lo ve en su panel y en la campana. Los avisos de su operación
(pedidos, citas, reservas…) sí pueden salir por SMS si los tiene encendidos.

**¿Dónde veo la foto del documento de un reclamo?** En el caso de Cambios sensibles. Es privada: no tiene enlace
público y cada vez que se abre queda en la auditoría. Más en `recuperar-negocio.md` y `licencia.md`.

### Lo que vende · Reservaciones
En el 360° › **Lo que vende** de un restaurante sale **Reservaciones** con cuántas van este mes y cuántas esperan respuesta.
**Pausar** (con motivo, permiso de retirar) quita la pestaña de su página; las reservaciones hechas siguen y el dueño ve el
motivo en su panel. **Reanudar** la devuelve. Los pedidos del mes ya no cuentan las reservaciones.

## El Compa y Soporte del negocio
**Negocios 360° › El Compa**: las cifras de 30 días del asistente en el panel de ese negocio, sus respuestas automáticas (Pro) con **Apagar El
Compa aquí** (con motivo y aviso al dueño) y si El Compa está en pausa ahí; sin texto ni personas (el hilo, en El Compa › Conversaciones, con
la lectura anotada). **Negocios 360° › Soporte**: los casos que abrió el negocio desde su panel. **El Compa › Negocios** lista todos los negocios
con respuestas automáticas.

## Lista por cursor, filtros nuevos y Exportar CSV
- **La lista pagina por cursor** (de a 14, sin tope de páginas): las flechas ← y → siguen donde ibas aunque cambien los datos. Filtros nuevos en «Más filtros»: **Con pedidos 30 d**, **Sin actividad 30 d**, **Con cobros (Stripe)**, **Pro sin cobros** y **Con licencia verificada**.
- **Exportar CSV** (solo un Admin): baja lo que ves con tus filtros (hasta 20,000 filas). Pide motivo, queda en la auditoría con las filas y los filtros, y se puede hasta 5 veces por hora.

| Caso | Qué pasa |
|---|---|
| Exportas más de 5 veces en una hora | Se rechaza y se dice; las anteriores siguen en la auditoría. |
| Tu rol no es Admin | No ves «Exportar CSV». |
| Eliges una ciudad en el encabezado | La lista, los filtros y el CSV son solo de esa ciudad. |

**¿El CSV trae datos personales?** Solo lo del negocio (nombre, ciudad, categoría, plan, calificación, estado, pedidos de 30 días, si cobra con Stripe y si tiene licencia verificada). Nada de clientes.

## English

Queues: everything waiting for a team decision, oldest against its SLA first — Verification badge (48 h), New
businesses (24 h light review), Flagged media (4 h), Neighbor recommendations (7 days), Licenses (72 h) and Sensitive changes (48 h, business claims). You only see your role's
queues in your cities; "Take next" assigns you the most urgent unassigned case; "Take" shows others "X is on it".
Businesses: searchable list with category, plan, status, more filters and sorting; the 360° shows the business as
clients see it, what the owner did and what the team did (Overview, Page, Team, Trust; with permission, Support and El Compa — the dashboard
assistant's 30-day numbers, without text or people). Every action asks for a
reason (approvals store a fixed one), writes the audit log, and the owner sees the result and reason in their
dashboard; the page reflects it (temporarily closed, hidden, photo removed, badge). Team decisions are not texted: the owner
sees them in the dashboard and the bell. "Create seed" lists a recommended business as unclaimed in its category; "Apply change"
makes the claimant the owner (an already-owned business: Admin only, 7 days after the owner's notice); claim
documents are private and every view is audited. In What it sells, Reservations shows this month's bookings and pending
requests; Pause (with a reason) removes the tab from the page and the owner sees why.
Content reports (reviews, 24 h): Keep (if the business asked for a review, the client sees "Reviewed"), Hide, or Hide and
sanction the author (warning, 7-day mute, 30-day posting block, 14-day suspension). The review stays visible while you
decide. 360 › Content lists the latest reviews with their state and open report, with Hide / Restore and a reason.
360 › Content also lists the business updates (deals, polls, notices) with Hide / Show, and Pause Updates removes the tab
and stops deal prices; the owner sees the reason.

### The business's El Compa and Support
**Businesses 360° › El Compa** shows the dashboard assistant's 30-day numbers, the auto-replies (Pro) with **Turn off El Compa here** (with a
reason and a notice to the owner) and any pause, without text or people. **Businesses 360° › Support** lists the cases the business opened.

### Cursor list, new filters and Export CSV
- **The list pages by cursor** (14 at a time, no page cap): the ← and → arrows continue where you were even if the data changes. New filters under «More filters»: **With orders 30 d**, **No activity 30 d**, **With payouts (Stripe)**, **Pro without payouts** and **With verified license**.
- **Export CSV** (Admin only): downloads what you see with your filters (up to 20,000 rows). It asks for a reason, is audited with the rows and the filters, and works up to 5 times an hour.

| Case | What happens |
|---|---|
| You export more than 5 times in an hour | It is refused and you are told; the earlier ones stay in the audit. |
| Your role is not Admin | You do not see «Export CSV». |
| You pick a city in the header | The list, the filters and the CSV are only for that city. |

**Does the CSV carry personal data?** Only the business's own (name, city, category, plan, rating, status, 30-day orders, whether it takes Stripe payouts and whether it has a verified license). No customers.
