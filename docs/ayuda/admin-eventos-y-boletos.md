# Super Admin: Eventos y boletos · Super Admin: Events and tickets

_Pantallas: **Super Admin › Eventos y boletos** (`/admin/eventos`: pestañas Eventos y Organizadores; ficha `/admin/eventos/{id}`), **Colas › Eventos a
revisar** (`/admin/colas?cola=evt`) y **Negocios 360° › Contenido › Eventos**. Ver: todos los roles con Eventos; **decidir y verificar**: Admin y
Ciudad (evt:aprobar); **ocultar y bloquear**: Admin (evt:retirar). Pestaña **Buscar boleto** y la ficha del boleto
(`/admin/eventos/boleto/{código}`); Reenviar y Reemitir: Admin y Ciudad (evt:editar); Anular: Admin (evt:retirar). «Modo puerta»: ver
`admin-puerta-auditoria`. Wallet: la ficha del boleto › **WALLET** y **Sistema › Integraciones › Wallet** (`/admin/sistema/integraciones?tab=wallet`). Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Series y varios días:** la lista dice «Cada jueves · N por delante» o «3 días»; la ficha muestra **FECHAS** (cada fecha con lo vendido, movida, saltada, cancelada o con artista solo esa fecha) o **DÍAS** (con boleto o pase y el aforo de cada día). El cambio de la regla de una serie de un organizador sin verificar llega a la cola como «LO QUE CAMBIA · Se repite».
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

- **La ficha del evento** dice si **sale en Eventos** (lo decide la base: publicado y aprobado, sin ocultar, módulo Eventos del
  negocio encendido y sin pausa, organizador sin bloquear) con **Ver la página**, y los **últimos RSVP** (nombre con inicial, personas,
  estado; nunca teléfono).
- **Negocios 360° › Contenido › Pausar Eventos** (con motivo): ninguno de sus eventos sale (no cambian de estado); el dueño ve
  «PAUSADO POR TO'LATINO» con el motivo en su panel. **Reanudar** con motivo. Todo queda en la auditoría.

- **Cifras:** **BOLETOS EMITIDOS** (válidos y usados) y **BRUTO BOLETOS** (cobrado, menos devuelto) en tus ciudades.
- **Buscar boleto:** por código del boleto (**TL-XXX-0000**), orden (**B-…**), últimos dígitos del teléfono, nombre, o **pegando el texto
  del QR**: se verifica la firma con la llave pública y dice **FIRMA VÁLIDA** (y si es la versión vigente: entra) o **FIRMA NO VÁLIDA** (alterado
  o de otro entorno: no entra), o «QR viejo» si el boleto se reemitió. El teléfono solo sale con los últimos 4.
- **El boleto:** estado (**VÁLIDO · USADO · DEVUELTO · ANULADO · TRANSFERIDO**), la versión del QR, evento, tipo, entradas, a nombre de quién,
  lo que pagó, su comisión y descuento, el pago de la orden (cobrado / retenido / liberado, la tarjeta y **SIMULADO** en el sandbox), los
  boletos de la misma orden, la línea de tiempo de la orden y lo que pasó con el boleto. Acciones con motivo: **Reenviar** (aviso en su cuenta),
  **Reemitir** (QR nuevo; el anterior deja de entrar) y **Anular** (deja de entrar; no devuelve dinero: para devolver, el comprador cancela, el organizador devuelve, se resuelve una ayuda B- o se cancela la fecha). Todo queda en
  la auditoría y la persona recibe el aviso.
- **La ficha del evento** suma **VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS** y las últimas órdenes (abren el boleto). **Transacciones ›
  Boletos** lista las órdenes B- con su cobro y comisión.
- **El boleto** suma su **historial** después de comprar: **TRANSFERIDO** (y a qué boleto pasó), **TRANSFERENCIAS** (de quién, a «••23»,
  ESPERANDO · RECIBIDO · DESHECHO · VENCIÓ; nunca el teléfono), **SE ESTÁ TRANSFIRIENDO: ningún QR entra**, la **DEVOLUCIÓN** de ese boleto
  (cuánto, quién: el comprador o el organizador, el cargo que se queda To'Latino o la comisión que no cobra, hecha o en camino) y si es
  **CORTESÍA**. Pegar el QR de un boleto transferido o en transferencia dice que no entra. **Anular** un boleto deja caer su transferencia.
- **La ficha del evento** suma **CORTESÍAS VIVAS · TRANSFERIDOS · EN LISTA DE ESPERA** y cuántos boletos se devolvieron. **Transacciones ›
  Boletos** muestra lo devuelto de cada orden; las cortesías (sin dinero) no salen ahí. Transacciones **no devuelve boletos por monto** (dejaría
  boletos vivos): se devuelven desde la orden (el comprador) o el panel (el organizador).
- **Colas › Ayuda con pedidos:** «Ayuda con una orden de boletos» (B-: cobro doble, otro monto, pagó y no tiene boletos) llega directo, sin
  esperar al organizador. **Resolver con un mensaje** o **Resolver y devolver** (hasta lo cobrado; vuelve a la tarjeta; los boletos siguen
  valiendo). Lo decide quien aprueba dinero en Transacciones.

## Cambios del evento y Liquidaciones
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
| Pegas un QR con la firma alterada | **FIRMA NO VÁLIDA**: no entra. |
| Reemites un boleto | Sube la versión del QR: el anterior sale «QR viejo» y no entra (en línea y sin conexión). |
| Anulas un boleto | Queda **ANULADO** con el motivo; el dinero no se devuelve solo (devolver: el comprador cancela, el organizador devuelve o una ayuda B-; o cancelar el evento). |
| Alguien intenta publicar sin revisión | La base no deja un evento en vivo sin aprobación (ni sin persona que apruebe, salvo organizador verificado). |

**Los plazos de esta página** (el día de pago: el martes después de cada fecha) son los de hoy: To'Latino los fija en su Configuración y la pantalla siempre dice el que vale en ese momento.

## Preguntas frecuentes
- **¿Se cambia el plazo de 24 h?** Sí, en Configuración › Eventos (con límites y auditoría).
- **¿Puedo editar el evento de un negocio?** No: se pide el cambio o se oculta, con motivo.
- **¿Dónde veo los eventos de un negocio?** Negocios 360° › Contenido › Eventos.

## Modo puerta y escaneos
- Pestaña **Modo puerta** (solo lectura): las puertas de hoy y de los últimos 7 días con adentro, faltan, rechazados y repetidos; de una fecha, por
  puerta, sesiones de portero, últimos en la puerta e incidencias. La ficha de un boleto suma **ESCANEOS EN LA PUERTA** (resultado, puerta, quién y
  hora). Detalle en `admin-puerta-auditoria`.

## El boleto en Apple Wallet y Google Wallet
- **La ficha del boleto › WALLET:** cada pase del boleto (Apple Wallet o Google Wallet) con su serie corta, su **versión** (sube con cada
  cambio del boleto, la fecha o el evento), **VIVO** o **ANULADO** y por qué (el boleto ya no vale, cambió de dueño, la fecha o el evento se
  cancelaron), cuántos teléfonos lo siguen, cuántos faltan por avisar y el último aviso a Apple; en Google, si está al día o qué error dio.
  Debajo, **LOS PASES**: su historia (emitido, lo volvió a bajar, actualizado, anulado, un teléfono lo sigue o lo dejó, aviso enviado a
  Apple, Google al día, avisos que se dejaron de intentar). Sin pases: «Este boleto no está en Apple Wallet ni en Google Wallet».
- **Todo cambio del boleto toca su pase en la misma acción:** transferir, recibir, devolver, cancelar, anular, reemitir, cambiar el nombre,
  mover la fecha o la hora y cancelar el evento. El pase de Apple se actualiza en el teléfono (Apple le avisa y el teléfono lo baja) y el de
  Google se reemplaza. **Anular** desde esta ficha anula también sus pases.
- **El QR del pase es el mismo del boleto:** la puerta lo valida igual, con y sin señal. **Reemitir** cambia el QR también en el pase.
- **Sistema › Integraciones › Wallet** (solo Admin): el **certificado del pase de Apple** (vence cada año; el equipo recibe un aviso a los
  30 días —Configuración › Apps, «Wallet · avisar antes de que venza»— y otro al vencer), la **solicitud** (se genera aquí con el código a
  tu teléfono; la llave se queda en el servidor; se baja y se sube a developer.apple.com; luego se sube aquí el .cer), la **cuenta de Google
  Wallet** (cuenta de servicio + ID del emisor), los interruptores `app.wallet.apple` y `app.wallet.google` (apagados: no se emiten pases
  nuevos; los emitidos siguen recibiendo sus cambios) y las cifras: pases emitidos, teléfonos que los siguen, por avisar, fallos de 7 días.
- Lo que pasa por Apple y Google: el evento, la fecha, el lugar, el tipo y el código. Nunca el nombre de la persona, su teléfono ni montos;
  eventos de Fe, Salud y Niños: «Boleto de evento», sin nombre ni lugar.

## Cierre de la fase: cupos, venta, sobreventa, catálogo y señales
- **Cifras:** BRUTO BOLETOS dice la comisión vigente (la regla «bol» de Planes, hoy 5 % + $1).
- **La ficha del evento › CUPOS** (de UNA fecha: la próxima, o elige otra en «FECHA QUE ESTÁS VIENDO»): cada tipo de boleto, mesa y el aforo del día
  con vendidos / cupo, apartados y lo que queda. **Ajustar cupo** (Eventos · editar): escribe el cupo nuevo y el motivo. **Nunca baja de lo vendido
  + apartado** (lo dice antes de guardar y la base lo vuelve a imponer). Manda sobre lo que guarde el organizador para esa fecha (si vuelve a guardar
  su editor, el ajuste de To'Latino se queda). El organizador recibe «To'Latino ajustó tu evento» con el motivo y su panel lo dice.
- **VENTA EN LÍNEA HASTA** y **Extender ventas** (Eventos · editar): si el organizador cierra la venta un día antes o al abrir las puertas, puedes
  dejarla abierta hasta las puertas o hasta que empieza. **Nunca después del inicio: en la puerta no se venden boletos (D1).** Con motivo, aviso al
  organizador, CAMBIOS DEL EVENTO y auditoría.
- **EVENTO CON SOBREVENTA** (alerta en Eventos y boletos y en el Inicio del Super Admin): sale si un tipo o una mesa de una fecha tiene más boletos
  vivos que su existencia. Con las reglas de la base no debería pasar nunca: si sale, alguien se saltó la regla; abre el evento y revisa la auditoría.
- **Catálogo** (pestaña; cambia solo un Admin): los **formatos** (nombre y descripción ES/EN, encender o apagar, qué categorías de negocio lo
  publican) con la vista previa de «Lo que puedes publicar» y si la ficha sale oscura o clara; los **géneros de música** (agregar, nombre ES/EN,
  encender o apagar, subir o bajar) con la vista previa de los filtros de Eventos. **Apagar no borra:** los eventos que ya lo tienen siguen igual y
  el organizador los sigue editando; solo deja de ofrecerse para crear. Los campos de cada formato (boletos, mesas, line-up…) los fija el diseño.
- **Confianza › Fraude › EVENTOS Y BOLETOS:** órdenes en ráfaga desde un dispositivo (umbral en Configuración), boletos recibidos y pasados a otra
  persona (transferencias en cadena), entradas duplicadas en la puerta (sin conexión) y contracargos de boletos. **Abrir caso** lo manda a Colas ›
  Reportes de usuario con la marca «Señal de Eventos»; lo decide una persona con la escalera de sanciones y la apelación.
- **Usuarios 360° › Actividad:** cuántas operaciones en 90 días y sus **BOLETOS DE EVENTOS** (estado, cortesía, recibido o pasado por transferencia,
  a qué hora entró) y **RSVP**. **Negocios 360° › Contenido › Eventos:** suma sus **liquidaciones** por estado y sus **cancelaciones**.

| Caso | Qué pasa |
|---|---|
| Ajustas un cupo por debajo de lo vendido | «No baja de lo vendido y apartado: N.» Nada cambia. |
| El organizador vuelve a guardar su editor con otro cupo | Se queda el ajuste de To'Latino para esa fecha. |
| Extiendes la venta y ya cierra a esa hora | «La venta ya cierra a esa hora o más tarde.» |
| Apagas un formato | Ya no se ofrece al crear; los eventos que lo tienen siguen igual. Cada categoría publica al menos uno. |

**English:** BOOKED/GROSS KPI shows the current ticket fee. The event page adds **CAPACITY** for one date (each ticket type, table and the day
capacity: sold / capacity, held, left) with **Adjust capacity** (never below sold + held; the database enforces it; it overrides what the organizer
saves for that date; the organizer is notified) and **Extend sales** (to doors or start, never after the start: no sales at the door). An **OVERSOLD
EVENT** alert shows on Events and on the admin home if a ticket type or table has more live tickets than stock (it should never happen). The
**Catalog** tab edits formats (name and description ES/EN, on/off, which business categories publish it) and music genres (add, rename, on/off,
order), with previews; turning something off never deletes it. **Trust › Fraud › EVENTS AND TICKETS** lists burst orders from one device, chain
transfers, duplicate entries and ticket chargebacks, with **Open case**. **Users 360° › Activity** shows a person's tickets and RSVPs; **Business 360°**
adds payouts by status and cancellations.

## Ajustar el cupo de un RSVP
- En la ficha de un evento con RSVP, la fila «Cupo del RSVP (lugares)» tiene **Ajustar cupo** (0 = sin límite). No baja de los lugares ya guardados en ninguna fecha, manda sobre lo que guarde el organizador, le llega el aviso con el motivo y queda en la auditoría y en los cambios del evento.

**¿El organizador puede deshacer mi ajuste de un RSVP?** No: el último ajuste de To'Latino manda en la base; para cambiarlo, vuelve a ajustar.

## English

### What it does
- **Series and multi-day events:** the list says «Every Thursday · N ahead» or «3 days»; the page shows **DATES** (each date with what was sold, moved, skipped,
  canceled or with an artist for that date only) or **DAYS** (with a ticket or pass and each day's capacity). When the rule of a series from an unverified
  organizer changes, it reaches the queue as «WHAT CHANGES · Repeats».
- **Figures:** EVENTS (and how many this week), **TO REVIEW** (with the deadline from Configuration › Events, 24 h by default; it leads to the queue),
  ORGANIZERS.
- **Events:** search by name, venue or organizer; filters In review · Today · With tickets · Free entry · Hidden / canceled; table on desktop, rows on the
  phone; 20 per page with a cursor.
- **Event page:** poster and photos, status, type, when, where, entry, age, music, version, ES/EN text, program, tables and extras, «Before you go», the
  organizer (VERIFIED · BLOCKED, events sent and not approved) and the review log (who and when). If it is a **change that matters**, **WHAT CHANGES**
  (before → after): while you decide, the published version stays live.
- **Review:** **Approve** (it shows in Events and on its page; the business is notified, also by SMS) · **Ask for changes** (reason from the list + note; the
  business fixes it and sends it again) · **Do not approve** (reason; the business gets it by SMS and can appeal). Reasons: minimum age is missing · the
  capacity exceeds the venue's capacity · the description promises something that cannot be guaranteed · the photo does not match the event · other.
- **Hide from the module / Show again** (with a reason): it leaves Events and its page; the business panel says «HIDDEN BY TO'LATINO» and the business gets
  the notice with the appeal. Showing again brings back the status it had.
- **Organizers:** **Verify** (their events are published when sent, with no prior review) / **Remove verified**; **Block publishing** (they cannot send or
  publish; notice with the reason and appeal) / **Allow publishing**.
- **Queues › Events to review:** every new event or change that matters from an unverified organizer; «Take», the deadline and the same decisions. Each
  decision closes the case and is recorded in the audit log with before → after and the reason.

- **The event page** says whether it **shows in Events** (the database decides: published and approved, not hidden, the business's Events module on and not
  paused, organizer not blocked) with **See the page**, and the **latest RSVPs** (name with initial, people, status; never a phone number).
- **Business 360° › Content › Pause Events** (with a reason): none of its events show (their status does not change); the owner sees «PAUSED BY TO'LATINO»
  with the reason in their panel. **Resume** with a reason. Everything goes in the audit log.

- **Figures:** **TICKETS ISSUED** (valid and used) and **TICKET GROSS** (charged, minus refunded) in your cities.
- **Find ticket:** by ticket code (**TL-XXX-0000**), order (**B-…**), last digits of the phone, name, or by **pasting the QR text**: the signature is checked
  with the public key and it says **VALID SIGNATURE** (and whether it is the current version: it gets in) or **INVALID SIGNATURE** (altered or from another
  environment: it does not get in), or «old QR» if the ticket was reissued. The phone only shows its last 4 digits.
- **The ticket:** status (**VALID · USED · REFUNDED · VOIDED · TRANSFERRED**), the QR version, event, type, entries, whose name it is under, what was paid, its
  commission and discount, the order's payment (charged / held / released, the card and **SIMULATED** in the sandbox), the tickets of the same order, the
  order's timeline and what happened to the ticket. Actions with a reason: **Resend** (notice in their account), **Reissue** (new QR; the old one stops
  getting in) and **Void** (it stops getting in; it does not refund money: to refund, the buyer cancels, the organizer refunds, a B- help request is resolved
  or the date is canceled). Everything goes in the audit log and the person gets the notice.
- **The event page** adds **SOLD · GROSS · COMMISSION · REFUNDED** and the latest orders (they open the ticket). **Transactions › Tickets** lists the B-
  orders with their charge and commission.
- **The ticket** adds its **history** after purchase: **TRANSFERRED** (and to which ticket it went), **TRANSFERS** (from whom, to «••23», WAITING · RECEIVED ·
  UNDONE · EXPIRED; never the phone number), **BEING TRANSFERRED: no QR gets in**, that ticket's **REFUND** (how much, who: the buyer or the organizer, the fee
  To'Latino keeps or the commission it does not charge, done or on its way) and whether it is a **COMPLIMENTARY** ticket. Pasting the QR of a transferred
  ticket or one in transfer says it does not get in. **Voiding** a ticket drops its transfer.
- **The event page** adds **LIVE COMPLIMENTARY · TRANSFERRED · ON THE WAITLIST** and how many tickets were refunded. **Transactions › Tickets** shows what
  was refunded on each order; complimentary tickets (no money) do not show there. Transactions **does not refund tickets by amount** (it would leave live
  tickets): they are refunded from the order (the buyer) or the panel (the organizer).
- **Queues › Order help:** «Help with a ticket order» (B-: double charge, different amount, paid and has no tickets) arrives directly, without waiting for the
  organizer. **Resolve with a message** or **Resolve and refund** (up to what was charged; it goes back to the card; the tickets stay valid). Whoever approves
  money in Transactions decides.

### Event changes and Payouts
- **The event page** adds **EVENT CHANGES** (pauses, date or time changes, cancellations, freezes; who and when), the **CANCELED** notice with its progress
  (orders refunded, what is left) and **MONEY BY DATE · TUESDAY PAYOUT** (Finance).
- **Freeze sales** (Events · edit): online sales stop, those who already bought still get in and the organizer cannot reopen them; the organizer receives the
  reason. **Unfreeze** opens them again.
- **Cancel and refund everything** (Events · remove, Admin): module rule, it cancels the event → **full refund** to every buyer (tickets, table and extras; the
  commission is not charged; To'Latino covers the card cost); each person is notified by SMS. With a reason; it goes in the audit log.
- **Payouts** (tab of Events and tickets; Transactions · view): what is paid to each organizer by date: TO PAY · HELD · PAID IN 30 DAYS · TO DEDUCT; filters
  Pending · Held · On its way · Paid · Adjusted; **Hold** and **Release** with a reason (Transactions · approve); **Export CSV** (Transactions · export,
  audited). An open dispute or an account that cannot receive payouts holds and releases on its own; the first big event of a new organizer and anything
  To'Latino holds is released by a person.
- **Queues**: **Organizers who cancel** (2 cancellations with tickets in 90 days, Configuration): each cancellation with what was refunded and the card cost;
  **Block publishing** or **Reviewed, no changes**. **Held event payouts** (first event over $2,000): **Release the payout** (the organizer is marked
  reviewed) or **Keep held** with a reason.
- **Configuration › Events**: organizer notices per date (3), payout day (2 = Tuesday), hold the first event from ($2,000), cancellations that open a case (2)
  and their window (90 days), wait for another payout for an adjustment (14 days), instant refunds on cancellation (25 orders).

### What happens in each case
| Case | What happens |
|---|---|
| You approve a change that matters | The change goes into the published version (the version goes up) and the public date moves. |
| You ask for changes or do not approve a change | The previous version stays live; the business gets the reason in its panel. |
| The business appeals a hidden or unapproved event, or a block | Case in **Queues › Appeals** (72 h); **another person** decides, never whoever hid, did not approve or blocked (the database prevents it). Lifting: the event shows again (or is approved), or the organizer can publish again. |
| A blocked organizer tries to send | The screen, the server and the database all reject it. |
| You paste a QR with an altered signature | **INVALID SIGNATURE**: it does not get in. |
| You reissue a ticket | The QR version goes up: the old one shows as «old QR» and does not get in (online and offline). |
| You void a ticket | It is left as **VOIDED** with the reason; the money is not refunded on its own (to refund: the buyer cancels, the organizer refunds or a B- help request; or cancel the event). |
| Someone tries to publish without review | The database does not allow a live event without approval (or without a person who approves, except a verified organizer). |

**The deadlines on this page** (payout day: the Tuesday after each date) are today's: To'Latino sets them in its Configuration and the screen always says the
one that applies at that moment.

### FAQ
- **Can the 24 h deadline be changed?** Yes, in Configuration › Events (with limits and audit).
- **Can I edit a business's event?** No: you ask for the change or hide it, with a reason.
- **Where do I see a business's events?** Business 360° › Content › Events.

### Door mode and scans
- **Door mode** tab (read only): today's doors and those of the last 7 days with inside, missing, rejected and repeated; for a date, by door, doorkeeper
  sessions, latest at the door and incidents. A ticket page adds **SCANS AT THE DOOR** (result, door, who and time). Details in `admin-puerta-auditoria`.

### The ticket in Apple Wallet and Google Wallet
- **Ticket page › WALLET:** each pass of the ticket (Apple Wallet or Google Wallet) with its short serial, its **version** (it goes up with every change to the
  ticket, the date or the event), **LIVE** or **VOIDED** and why (the ticket is no longer valid, it changed owner, the date or the event was canceled), how
  many phones follow it, how many are left to notify and the last notice to Apple; on Google, whether it is up to date or what error it gave. Below, **THE
  PASSES**: their history (issued, downloaded again, updated, voided, a phone follows it or left it, notice sent to Apple, Google up to date, notices that
  stopped being retried). With no passes: «This ticket isn't in Apple Wallet or Google Wallet».
- **Every change to the ticket touches its pass in the same action:** transfer, receive, refund, cancel, void, reissue, change the name, move the date or the
  time and cancel the event. The Apple pass updates on the phone (Apple notifies it and the phone downloads it) and the Google one is replaced. **Voiding**
  from this page voids its passes too.
- **The pass's QR is the same as the ticket's:** the door validates it the same way, with and without signal. **Reissue** changes the QR in the pass too.
- **System › Integrations › Wallet** (Admin only): the **Apple pass certificate** (it expires every year; the team gets a notice 30 days before —
  Configuration › Apps, «Wallet · notify before it expires»— and another when it expires), the **request** (generated here with the code sent to your phone;
  the key stays on the server; it is downloaded and uploaded to developer.apple.com; then the .cer is uploaded here), the **Google Wallet account** (service
  account + issuer ID), the switches `app.wallet.apple` and `app.wallet.google` (off: no new passes are issued; the ones already issued keep receiving their
  changes) and the figures: passes issued, phones that follow them, to notify, failures in 7 days.
- What goes through Apple and Google: the event, the date, the place, the type and the code. Never the person's name, phone or amounts; Faith, Health and
  Children events: «Event ticket», with no name or place.

### Closing the loop: capacity, sales, oversell, catalog and signals
- **Figures:** TICKET GROSS says the current commission (the «bol» rule in Plans, today 5 % + $1).
- **Event page › CAPACITY** (for ONE date: the next one, or pick another in «DATE YOU'RE VIEWING»): each ticket type, table and the day's capacity with
  sold / capacity, held and what is left. **Adjust capacity** (Events · edit): type the new capacity and the reason. **It never goes below sold + held** (it
  says so before saving and the database enforces it again). It overrides what the organizer saves for that date (if their editor saves again, To'Latino's
  adjustment stays). The organizer gets «To'Latino adjusted your event» with the reason and their panel says so.
- **ONLINE SALES UNTIL** and **Extend sales** (Events · edit): if the organizer closes sales a day before or when doors open, you can leave them open until
  doors or until it starts. **Never after the start: tickets are not sold at the door (D1).** With a reason, notice to the organizer, EVENT CHANGES and audit.
- **OVERSOLD EVENT** (alert in Events and tickets and on the Super Admin home): it shows if a ticket type or a table on a date has more live tickets than its
  stock. With the database rules it should never happen: if it shows, someone bypassed the rule; open the event and check the audit log.
- **Catalog** (tab; only an Admin changes it): the **formats** (name and description ES/EN, turn on or off, which business categories publish it) with the
  preview of «WHAT YOU CAN PUBLISH» and whether the page shows dark or light; the **music genres** (add, ES/EN name, turn on or off, move up or down) with the
  preview of the Events filters. **Turning off does not delete:** events that already have it stay the same and the organizer keeps editing them; it just
  stops being offered when creating. The fields of each format (tickets, tables, line-up…) are set by the design.
- **Trust › Fraud › EVENTS AND TICKETS:** burst orders from one device (threshold in Configuration), tickets received and passed to another person (chain
  transfers), duplicate entries at the door (offline) and ticket chargebacks. **Open case** sends it to Queues › User reports with the mark «Events signal»;
  a person decides it with the ladder of sanctions and the appeal.
- **Users 360° › Activity:** how many operations in 90 days and their **EVENT TICKETS** (status, complimentary, received or passed by transfer, what time it
  got in) and **RSVPs**. **Business 360° › Content › Events:** adds its **payouts** by status and its **cancellations**.

| Case | What happens |
|---|---|
| You adjust a capacity below what was sold | «It does not go below sold and held: N.» Nothing changes. |
| The organizer saves their editor again with another capacity | To'Latino's adjustment for that date stays. |
| You extend sales and they already close at that time | «Sales already close at that time or later.» |
| You turn off a format | It is no longer offered when creating; events that have it stay the same. Each category publishes at least one. |

### Adjust an RSVP's capacity
- On the page of an event with RSVP, the «RSVP capacity (spots)» row has **Adjust capacity** (0 = no limit). It does not go below the spots already saved on any
  date, it overrides what the organizer saves, the organizer gets the notice with the reason, and it is recorded in the audit log and in the event's changes.

**Can the organizer undo my adjustment of an RSVP?** No: To'Latino's last adjustment rules in the database; to change it, adjust again.
