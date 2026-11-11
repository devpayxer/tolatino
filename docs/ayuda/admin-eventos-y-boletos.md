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

## English

### What it does
KPIs (events, **to review** with the Configuration deadline, organizers); **Events** list with search, filters and cursor; the event page
with everything needed to decide and, for an important change, **what changes** (the live version stays until you decide). **Approve** ·
**Ask for changes** · **Do not approve** (reason list + note; the business can appeal). **Hide from module / Show again** with a reason
(the business sees «HIDDEN BY TO’LATINO» and can appeal). **Organizers:** verify (publish without prior review) or block publishing (with
reason, notice and appeal). **Queues › Events to review** has the same decisions. Appeals are decided by another team member. Everything
goes to the audit log.

The event page tells whether it **shows in Events** (with a link) and lists the **latest RSVPs** (first name and initial, people,
status; never phones). Business 360° › Content › **Pause Events** (with a reason) hides all of a business's events until resumed; the
owner sees the reason in the dashboard.

**Find ticket** (ticket code, order, last phone digits, name, or the pasted QR text, whose signature is checked with the public key:
VALID SIGNATURE / INVALID SIGNATURE / old QR after a reissue); the ticket page (status, QR version, payment, order timeline, ticket history) with
**Resend**, **Reissue** (new QR; the old one stops working) and **Void** (no automatic refund), all with a reason, audit and a notice; KPIs
**TICKETS ISSUED** and **TICKET GROSS**; the event page adds **SOLD · GROSS · FEE · REFUNDED** and the latest orders; **Transactions › Tickets**.

The ticket page adds its **history after purchase** — **TRANSFERRED** (and the new ticket), **TRANSFERS** (from whom, to «••23», status; never
the phone), **BEING TRANSFERRED: no QR gets in**, its **REFUND** (amount, who, the fee To'Latino keeps or waives, done or on its way) and **COMP**. The
event page adds **LIVE COMPS · TRANSFERRED · ON THE WAITLIST** and refunded tickets. Transactions never refunds tickets by amount (tickets are refunded
by the buyer or the organizer). **Queues › Help with orders** gets «Help with a ticket order» (B-) directly; resolve with a message or refund to the
card (tickets stay valid).

the event page adds the change history, the cancellation progress and money by date; **Freeze sales** (organizer cannot reopen),
**Cancel and refund everything** (100 % to every buyer); **Payouts** tab with hold/release and CSV; queues **Organizers who cancel** and **Held
event payouts**; new Event settings (notices per date, payout day, new-organizer threshold, cancellations window, adjustment wait, refunds batch).

**Recurring and multi-day:** the list shows “Every Thursday · N ahead” or “3 days”; the event page shows DATES (sold, moved, skipped, cancelled, performer for one date) or DAYS (ticket or pass holders and the daily capacity). A rule change from an unverified organizer reaches the queue as “WHAT CHANGES · Repeats”.

#### Tickets in Apple Wallet and Google Wallet
- **The ticket page › WALLET:** each pass of the ticket (Apple Wallet or Google Wallet) with its short serial, its **version** (it goes up with
  every change of the ticket, the date or the event), **LIVE** or **VOIDED** and why (the ticket is no longer valid, changed owner, the date or
  the event was cancelled), how many phones follow it, how many are still to be notified and the last notice to Apple; for Google, whether it is
  up to date or which error it gave. Below, **THE PASSES**: their history. Without passes: «This ticket is not in Apple Wallet or Google Wallet».
- **Every ticket change touches its pass in the same action:** transfer, receive, refund, cancel, void, reissue, rename, move the date or time
  and cancel the event. The Apple pass updates on the phone (Apple notifies it and the phone downloads it) and the Google one is replaced.
  **Void** on this page also voids its passes. The pass QR is the same as the ticket's: the door validates it the same way, online and offline.
- **System › Integrations › Wallet** (Admin only): the **Apple pass certificate** (it expires every year; the team gets a notice 30 days before
  and another when it expires), the **certificate request** (generated here with the code sent to your phone; the key stays on the server;
  download it, upload it at developer.apple.com, then upload the .cer here), the **Google Wallet account** (service account + issuer ID), the
  `app.wallet.apple` and `app.wallet.google` switches (off: no new passes; existing passes keep getting their changes) and the figures.
- What goes through Apple and Google: event, date, venue, type and code. Never the person's name, phone or amounts; Faith, Health and Kids
  events: «Event ticket», without name or venue.
