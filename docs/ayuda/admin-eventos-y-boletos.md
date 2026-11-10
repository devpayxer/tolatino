# Super Admin · Eventos y boletos · Super Admin · Events and tickets

_Pantallas: **Super Admin › Eventos y boletos** (`/admin/eventos`: pestañas Eventos y Organizadores; ficha `/admin/eventos/{id}`),
**Colas › Eventos a revisar** (`/admin/colas?cola=evt`) y **Negocios 360° › Contenido › Eventos**. Versión: Fase 6 · bloques 6a–6d (9–10 nov 2026).
Ver: todos los roles con Eventos; **decidir y verificar**: Admin y Ciudad (evt:aprobar); **ocultar y bloquear**: Admin (evt:retirar).
6c (10 nov): pestaña **Buscar boleto** y la ficha del boleto (`/admin/eventos/boleto/{código}`); Reenviar y Reemitir: Admin y Ciudad
(evt:editar); Anular: Admin (evt:retirar). «Modo puerta»: ver `admin-puerta-auditoria`._

## Qué hace
- **6f · Series y varios días:** la lista dice «Cada jueves · N por delante» o «3 días»; la ficha muestra **FECHAS** (cada fecha con lo vendido, movida, saltada, cancelada o con artista solo esa fecha) o **DÍAS** (con boleto o pase y el aforo de cada día). El cambio de la regla de una serie de un organizador sin verificar llega a la cola como «LO QUE CAMBIA · Se repite».
- **Cifras:** EVENTOS (y cuántos esta semana), **A REVISAR** (con el plazo de Configuración › Eventos, 24 h de fábrica; lleva a la cola),
  ORGANIZADORES.
- **Eventos:** buscar por nombre, local u organizador; filtros En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados;
  tabla en escritorio, filas en el teléfono; 20 por página con cursor.
- **Ficha del evento:** cartel y fotos, estado, tipo, cuándo, dónde, entrada, edad, música, versión, texto ES/EN, programa, mesas y
  extras, «Antes de ir», el organizador (VERIFICADO · BLOQUEADO, eventos enviados y no aprobados) y el libro de la revisión (quién y cuándo).
  Si es un **cambio que importa**, **LO QUE CAMBIA** (antes → después): mientras decides sigue en vivo la versión publicada.
- **Revisar:** **Aprobar** (sale en Eventos y en su página; aviso al negocio, también por SMS) · **Pedir cambios** (motivo de la lista +
  nota; el negocio lo corrige y lo reenvía) · **No aprobar** (motivo; el negocio lo recibe por SMS y puede apelar). Motivos: falta la edad
  mínima · la capacidad supera el aforo del local · la descripción promete algo que no se puede garantizar · la foto no corresponde al
  evento · otro.
- **Ocultar del módulo / Volver a mostrar** (con motivo): sale de Eventos y de su página; el panel del negocio dice «OCULTO POR TO'LATINO»
  y le llega el aviso con la apelación. Volver a mostrar devuelve el estado que tenía.
- **Organizadores:** **Verificar** (sus eventos se publican al enviarlos, sin revisión previa) / **Quitar verificado**; **Bloquear
  publicación** (no envía ni publica; aviso con motivo y apelación) / **Permitir publicar**.
- **Colas › Eventos a revisar:** cada evento nuevo o cambio que importa de un organizador sin verificar; «Tomar», el plazo y las mismas
  decisiones. Cada decisión cierra el caso y queda en la auditoría con antes → después y el motivo.

- **6b · La ficha del evento** dice si **sale en Eventos** (lo decide la base: publicado y aprobado, sin ocultar, módulo Eventos del
  negocio encendido y sin pausa, organizador sin bloquear) con **Ver la página**, y los **últimos RSVP** (nombre con inicial, personas,
  estado; nunca teléfono).
- **6b · Negocios 360° › Contenido › Pausar Eventos** (con motivo): ninguno de sus eventos sale (no cambian de estado); el dueño ve
  «PAUSADO POR TO'LATINO» con el motivo en su panel. **Reanudar** con motivo. Todo queda en la auditoría.

- **6c · Cifras:** **BOLETOS EMITIDOS** (válidos y usados) y **BRUTO BOLETOS** (cobrado, menos devuelto) en tus ciudades.
- **6c · Buscar boleto:** por código del boleto (**TL-XXX-0000**), orden (**B-…**), últimos dígitos del teléfono, nombre, o **pegando el texto
  del QR**: se verifica la firma con la llave pública y dice **FIRMA VÁLIDA** (y si es la versión vigente: entra) o **FIRMA NO VÁLIDA** (alterado
  o de otro entorno: no entra), o «QR viejo» si el boleto se reemitió. El teléfono solo sale con los últimos 4.
- **6c · El boleto:** estado (**VÁLIDO · USADO · DEVUELTO · ANULADO · TRANSFERIDO**), la versión del QR, evento, tipo, entradas, a nombre de quién,
  lo que pagó, su comisión y descuento, el pago de la orden (cobrado / retenido / liberado, la tarjeta y **SIMULADO** en el sandbox), los
  boletos de la misma orden, la línea de tiempo de la orden y lo que pasó con el boleto. Acciones con motivo: **Reenviar** (aviso en su cuenta),
  **Reemitir** (QR nuevo; el anterior deja de entrar) y **Anular** (deja de entrar; no devuelve dinero: eso llega con 6d/6e). Todo queda en
  la auditoría y la persona recibe el aviso.
- **6c · La ficha del evento** suma **VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS** y las últimas órdenes (abren el boleto). **Transacciones ›
  Boletos** lista las órdenes B- con su cobro y comisión.
- **6d · El boleto** suma su **historial** después de comprar: **TRANSFERIDO** (y a qué boleto pasó), **TRANSFERENCIAS** (de quién, a «••23»,
  ESPERANDO · RECIBIDO · DESHECHO · VENCIÓ; nunca el teléfono), **SE ESTÁ TRANSFIRIENDO: ningún QR entra**, la **DEVOLUCIÓN** de ese boleto
  (cuánto, quién: el comprador o el organizador, el cargo que se queda To'Latino o la comisión que no cobra, hecha o en camino) y si es
  **CORTESÍA**. Pegar el QR de un boleto transferido o en transferencia dice que no entra. **Anular** un boleto deja caer su transferencia.
- **6d · La ficha del evento** suma **CORTESÍAS VIVAS · TRANSFERIDOS · EN LISTA DE ESPERA** y cuántos boletos se devolvieron. **Transacciones ›
  Boletos** muestra lo devuelto de cada orden; las cortesías (sin dinero) no salen ahí. Transacciones **no devuelve boletos por monto** (dejaría
  boletos vivos): se devuelven desde la orden (el comprador) o el panel (el organizador).
- **6d · Colas › Ayuda con pedidos:** «Ayuda con una orden de boletos» (B-: cobro doble, otro monto, pagó y no tiene boletos) llega directo, sin
  esperar al organizador. **Resolver con un mensaje** o **Resolver y devolver** (hasta lo cobrado; vuelve a la tarjeta; los boletos siguen
  valiendo). Lo decide quien aprueba dinero en Transacciones.

## 6e · Cambios del evento y Liquidaciones (10 nov 2026)
- **La ficha del evento** suma **CAMBIOS DEL EVENTO** (pausas, cambios de fecha u hora, cancelaciones, congelados; quién y cuándo), el aviso de
  **CANCELADO** con su progreso (órdenes devueltas, lo que falta) y **DINERO POR FECHA · LIQUIDACIÓN DEL MARTES** (Finanzas).
- **Congelar ventas** (Eventos · editar): la venta en línea se detiene, los que compraron entran igual y el organizador no la reabre; recibe el
  motivo. **Descongelar** la abre otra vez.
- **Cancelar y devolver todo** (Eventos · retirar, Admin): regla del módulo, cancela el evento → **devolución total** a cada comprador (boletos,
  mesa y extras; la comisión no se cobra; el costo de la tarjeta lo pone To'Latino); avisa a cada persona por SMS. Con motivo; queda en la auditoría.
- **Liquidaciones** (pestaña de Eventos y boletos; Transacciones · ver): lo que se le paga a cada organizador por fecha: POR PAGAR · RETENIDAS ·
  PAGADO EN 30 DÍAS · POR DESCONTAR; filtros Pendientes · Retenidas · En camino · Pagadas · Ajustadas; **Retener** y **Soltar** con motivo
  (Transacciones · aprobar); **Exportar CSV** (Transacciones · exportar, auditado). Una disputa abierta o una cuenta que no recibe pagos retiene
  y suelta sola; el primer evento grande de un organizador nuevo y lo que retiene To'Latino lo suelta una persona.
- **Colas**: **Organizadores que cancelan** (2 cancelaciones con boletos en 90 días, Configuración): cada cancelación con lo devuelto y el costo
  de la tarjeta; **Bloquear publicación** o **Revisado, sin cambios**. **Pagos de eventos retenidos** (primer evento sobre $2,000): **Soltar el
  pago** (el organizador queda revisado) o **Mantener retenido** con motivo.
- **Configuración › Eventos**: avisos del organizador por fecha (3), día de pago (2 = martes), retener el primer evento desde ($2,000),
  cancelaciones que abren un caso (2) y su plazo (90 días), esperar otra liquidación para un ajuste (14 días), devoluciones al momento al
  cancelar (25 órdenes).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Apruebas un cambio que importa | El cambio pasa a la versión publicada (sube la versión) y la fecha pública se mueve. |
| Pides cambios o no apruebas un cambio | Sigue en vivo la versión anterior; el negocio recibe el motivo en su panel. |
| El negocio apela un evento oculto o no aprobado, o un bloqueo | Caso en **Colas › Apelaciones** (72 h); lo decide **otra persona**, nunca quien ocultó, no aprobó o bloqueó (la base lo impide). Levantar: el evento se ve otra vez (o queda aprobado), o el organizador vuelve a publicar. |
| Un organizador bloqueado intenta enviar | La pantalla, el servidor y la base lo rechazan. |
| 6c · Pegas un QR con la firma alterada | **FIRMA NO VÁLIDA**: no entra. |
| 6c · Reemites un boleto | Sube la versión del QR: el anterior sale «QR viejo» y no entra (en línea y sin conexión). |
| 6c · Anulas un boleto | Queda **ANULADO** con el motivo; el dinero no se devuelve solo (devolver: el comprador cancela, el organizador devuelve o una ayuda B-; cancelar el evento: 6e). |
| Alguien intenta publicar sin revisión | La base no deja un evento en vivo sin aprobación (ni sin persona que apruebe, salvo organizador verificado). |

## Preguntas frecuentes
- **¿Se cambia el plazo de 24 h?** Sí, en Configuración › Eventos (con límites y auditoría).
- **¿Puedo editar el evento de un negocio?** No: se pide el cambio o se oculta, con motivo.
- **¿Dónde veo los eventos de un negocio?** Negocios 360° › Contenido › Eventos.

---

## What it does (English)
KPIs (events, **to review** with the Configuration deadline, organizers); **Events** list with search, filters and cursor; the event page
with everything needed to decide and, for an important change, **what changes** (the live version stays until you decide). **Approve** ·
**Ask for changes** · **Do not approve** (reason list + note; the business can appeal). **Hide from module / Show again** with a reason
(the business sees «HIDDEN BY TO’LATINO» and can appeal). **Organizers:** verify (publish without prior review) or block publishing (with
reason, notice and appeal). **Queues › Events to review** has the same decisions. Appeals are decided by another team member. Everything
goes to the audit log.

6b: the event page tells whether it **shows in Events** (with a link) and lists the **latest RSVPs** (first name and initial, people,
status; never phones). Business 360° › Content › **Pause Events** (with a reason) hides all of a business's events until resumed; the
owner sees the reason in the dashboard.

6c: **Find ticket** (ticket code, order, last phone digits, name, or the pasted QR text, whose signature is checked with the public key:
VALID SIGNATURE / INVALID SIGNATURE / old QR after a reissue); the ticket page (status, QR version, payment, order timeline, ticket history) with
**Resend**, **Reissue** (new QR; the old one stops working) and **Void** (no automatic refund), all with a reason, audit and a notice; KPIs
**TICKETS ISSUED** and **TICKET GROSS**; the event page adds **SOLD · GROSS · FEE · REFUNDED** and the latest orders; **Transactions › Tickets**.

6d: the ticket page adds its **history after purchase** — **TRANSFERRED** (and the new ticket), **TRANSFERS** (from whom, to «••23», status; never
the phone), **BEING TRANSFERRED: no QR gets in**, its **REFUND** (amount, who, the fee To'Latino keeps or waives, done or on its way) and **COMP**. The
event page adds **LIVE COMPS · TRANSFERRED · ON THE WAITLIST** and refunded tickets. Transactions never refunds tickets by amount (tickets are refunded
by the buyer or the organizer). **Queues › Help with orders** gets «Help with a ticket order» (B-) directly; resolve with a message or refund to the
card (tickets stay valid).

**6e (English):** the event page adds the change history, the cancellation progress and money by date; **Freeze sales** (organizer cannot reopen),
**Cancel and refund everything** (100 % to every buyer); **Payouts** tab with hold/release and CSV; queues **Organizers who cancel** and **Held
event payouts**; new Event settings (notices per date, payout day, new-organizer threshold, cancellations window, adjustment wait, refunds batch).

**Recurring and multi-day (6f):** the list shows “Every Thursday · N ahead” or “3 days”; the event page shows DATES (sold, moved, skipped, cancelled, performer for one date) or DAYS (ticket or pass holders and the daily capacity). A rule change from an unverified organizer reaches the queue as “WHAT CHANGES · Repeats”.

## Modo puerta y escaneos (6g, 10 nov 2026)
- Pestaña **Modo puerta** (solo lectura): las puertas de hoy y de los últimos 7 días con adentro, faltan, rechazados y repetidos; de una fecha, por
  puerta, sesiones de portero, últimos en la puerta e incidencias. La ficha de un boleto suma **ESCANEOS EN LA PUERTA** (resultado, puerta, quién y
  hora). Detalle en `admin-puerta-auditoria`. · *Door mode tab (read-only) and DOOR SCANS on each ticket.*
