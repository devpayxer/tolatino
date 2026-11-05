# Super Admin · Negocios y Colas · Super Admin · Businesses and Queues

_Pantallas: ADM-COLAS (`/admin/colas`) y ADM-NEG (`/admin/negocios`, `/admin/negocios/{id}`), teléfono y escritorio.
Versión: Fase 1 · bloques 1i, 1k y 1j (5 nov 2026). Para el equipo de To'Latino (y El Compa como copiloto del equipo)._

## Qué hace
- **Colas:** todo lo que espera la decisión de una persona del equipo, la más vieja contra su plazo primero:
  **Sello de verificación** (48 h), **Negocios nuevos** (24 h, revisión ligera), **Medios marcados** (4 h, fotos que
  reportó un vecino), **Recomendaciones de vecinos** (7 días), **Licencias** (72 h) y **Cambios sensibles** (48 h,
  los reclamos de «Recuperar tu negocio» y los pedidos de borrar una cuenta; ver `admin-usuarios.md`). Cada persona ve solo las colas de su rol y de sus
  ciudades. «Tomar siguiente» te asigna el caso sin dueño más urgente; «Tomar» avisa a los demás «Lo está viendo X».
- **Negocios:** lista con buscador (nombre, id, teléfono, dirección, subcategoría), categoría, plan, estado, «Más
  filtros» y orden. El **360°** muestra el negocio como lo ve el cliente, lo que hizo el dueño y lo que hizo el equipo:
  Resumen (datos, fuerza del perfil, notas internas, acciones), Ficha (fotos y campos que se editan en su nombre,
  horario), Equipo (quién entra al panel, staff) y Confianza (casos abiertos, sello, sanciones).

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

Toda acción pide motivo (salvo las aprobaciones, que guardan uno fijo) y queda en la auditoría: quién, qué, antes →
después, motivo y cuándo. Nada se borra.

## Preguntas frecuentes
**¿Por qué no veo una cola?** Tu rol no la trabaja (p. ej. Medios es de moderación) o tu ciudad no tiene casos.

**¿«Tomar» bloquea al resto?** Es un bloqueo suave: avisa «Lo está viendo X»; otra persona puede tomarlo.

**¿Le llega un SMS al dueño?** Todavía no: los avisos por SMS llegan con las notificaciones (Fase 2). Hoy el dueño ve
todo en su panel.

**¿Dónde veo la foto del documento de un reclamo?** En el caso de Cambios sensibles. Es privada: no tiene enlace
público y cada vez que se abre queda en la auditoría. Más en `recuperar-negocio.md` y `licencia.md`.

---

## English
Queues: everything waiting for a team decision, oldest against its SLA first — Verification badge (48 h), New
businesses (24 h light review), Flagged media (4 h), Neighbor recommendations (7 days), Licenses (72 h) and Sensitive changes (48 h, business claims). You only see your role's
queues in your cities; "Take next" assigns you the most urgent unassigned case; "Take" shows others "X is on it".
Businesses: searchable list with category, plan, status, more filters and sorting; the 360° shows the business as
clients see it, what the owner did and what the team did (Overview, Page, Team, Trust). Every action asks for a
reason (approvals store a fixed one), writes the audit log, and the owner sees the result and reason in their
dashboard; the page reflects it (temporarily closed, hidden, photo removed, badge). Owner texts arrive with
notifications (Phase 2). "Create seed" lists a recommended business as unclaimed in its category; "Apply change"
makes the claimant the owner (an already-owned business: Admin only, 7 days after the owner's notice); claim
documents are private and every view is audited.
