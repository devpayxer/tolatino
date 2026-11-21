# Super Admin › Planes › Ingresos › Conciliación y alertas del dinero · Reconciliation and money alerts

_Pantallas: `/admin/planes?tab=ing` (CONCILIACIÓN DIARIA y ALERTAS DEL DINERO), el Inicio del Super Admin («EL DINERO NO CUADRA») y Sistema ›
Configuración › Dinero. Permiso: ver con «Planes y suscripciones»; actuar (me hago cargo, resuelta, reabrir, conciliar otra vez, resolver a mano,
preguntar a Stripe ahora) con «Transacciones: aprobar». Versión: 21 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **La conciliación diaria** (el guardián del dinero): cada mañana, a la hora de Configuración › Dinero (6 AM del Este de fábrica), el sistema cuadra el
  día anterior **objeto por objeto** entre Stripe y nuestro libro: cobros (PaymentIntents) contra los cobros del libro, los de Pro y las verificaciones
  del banco; devoluciones; transferencias a organizadores y sus reversiones; pagos al banco; disputas; y las **retenciones sueltas** (una retención que
  Stripe tiene y el libro no, porque la base falló justo después de retener).
- Cada día sale con su estado: **CUADRA**, **DIFERENCIAS** (cuántas y cuántas **sin dueño**), **FALLÓ** (Stripe no respondió) o **SIN CORRER**.
  Toca un día para ver sus diferencias: qué es, de qué negocio, el id, lo que dice Stripe y lo que dice el libro.
- **Una diferencia sin dueño avisa al instante** al equipo de dinero (Admin y Finanzas) y el Inicio dice **«EL DINERO NO CUADRA»** hasta que alguien la
  toma. **Me hago cargo** (con nota), **Resuelta** (cómo se resolvió) y **Reabrir**: todo con nota y en la auditoría; nada se borra.
- **Conciliar otra vez** un día que ya terminó (por ejemplo, después de que Stripe corrigió algo): la nueva corrida es la que vale; las diferencias que
  siguen conservan a su dueño.
- **Alertas del dinero** (lo que Stripe nunca avisa): **devolución atascada** (Stripe la rechazó más veces que el número de Configuración: tarjeta cerrada,
  cuenta con disputa), **transferencia sin saldo para revertir** (el organizador no tiene saldo), **disputa por vencer** (sin responder a 3 días del plazo
  del banco), **pago al banco que falló**, **la conciliación no corrió**, **devolución que Stripe dio por fallida** (Stripe la había hecho y días después
  dijo que no llegó a la tarjeta: queda fallida, su saldo vuelve al cobro y, si todavía se debe, se devuelve otra vez) y **cobro de Pro sin aplicar** (se
  cobró Pro mientras el plan cambiaba, por ejemplo una cortesía puesta en ese momento: el cambio se respeta y tú decides si se devuelve). Una devolución
  (de un cobro, de boletos o de un patrocinio) que lleva **23 horas** sin respuesta de Stripe ya no se le vuelve a pedir con la misma llave (Stripe la
  olvida a las 24 h y podría devolver dos veces): llega como devolución atascada para mirarla en Stripe. Cada una llega una sola vez.
- Lo mismo con el resto del dinero que sale: la **transferencia al organizador** (la liquidación del martes) y su **reversión**, y el **cobro de Pro**.
  Si a las **23 horas** Stripe no dijo que sí, no se le vuelve a pedir: llega **transferencia al organizador sin respuesta**, **transferencia sin saldo
  para revertir** o **cobro de Pro sin respuesta**, una vez, para mirarlo en Stripe. Un cobro de Pro en camino no cuenta como «cobro fallido» (el plan no
  cambia) y, mientras siga en camino, a ese negocio no se le cobra otra cosa.
- Igual con los **cobros con tarjeta guardada** que To'Latino hace sin la persona delante: el **plan del Hogar** de cada mes, la **renta** (al recoger,
  «un día más» y los días tarde) y la **renovación sola de un patrocinio**. Si Stripe no contesta, el cobro queda **en camino** (no es un «no» del banco:
  el plan no pasa a fallido, la renta no dice «la tarjeta no pasó» y el patrocinio no termina) y el sistema lo termina solo con la misma llave. A las
  **23 horas** sin respuesta llega **cobro con tarjeta guardada sin respuesta**, una vez, para mirarlo en Stripe. Si el cobro salió cuando lo que pagaba
  ya había cambiado (el plan se canceló, la renta ya no estaba apartada, el patrocinio terminó o ya no quedaba puesto), queda en el libro sin aplicarse
  y llega **cobro con tarjeta guardada sin aplicar**: decide si se devuelve. Ninguno se cobra dos veces por lo mismo (la base lo impide).
- **Preguntarle a Stripe (desde el 21 nov):** lo que pasa esas **23 horas** sin respuesta (un cobro de Pro, un cobro con tarjeta guardada o una
  transferencia al organizador) ya no se queda en camino para siempre. Cada cobro y cada transferencia salen con un **dato propio** (en Stripe, la
  metadata `tl_intencion`, por ejemplo `offsession_charges:812`), y el sistema le **pregunta a Stripe** por ese dato (cada 15 minutos por intención) y
  cierra con lo que Stripe dice, nunca con lo que alguien recuerda:
  - **Sí salió** → queda hecho, **una sola vez**, por el mismo camino de siempre (el período del plan avanza, la renta sale, el patrocinio se renueva, Pro
    queda pagado, la liquidación queda pagada) y sin cobrar otra vez. La auditoría dice «consulta a la pasarela».
  - **El banco dijo que no** → queda rechazado y sigue lo de un «no» (el plan reintenta, la renta pide otra tarjeta, Pro pasa a cobro fallido).
  - **No está en Stripe** → «nunca llegó»: no se cobró nada y el siguiente cobro de ese plan, renta, patrocinio o Pro **vuelve a poder salir** (con otra
    llave). En una transferencia, su llave vuelve a valer y se manda otra vez, el mismo monto. Solo si se mandó con su dato propio y pasaron **24 horas**
    desde que se mandó (Stripe tarda en mostrar lo nuevo en su búsqueda). Lo que se mandó antes del 21 nov, sin ese dato, **nunca** se da por «no llegó».
  - **Sigue en curso** (por ejemplo, el banco pide verificar) o **Stripe no contestó la consulta** → nada cambia; la alerta sigue abierta.
  - **Más de uno en Stripe**, u **otro monto** → no se cierra solo: llega **«lo que dijo Stripe no se cierra solo»** para que una persona decida.
  La alerta dice **qué dijo la última consulta y cuándo**, y **se cierra sola** (firmada «To'Latino») cuando la intención deja de estar en camino.
- **Preguntar a Stripe ahora** (en esas alertas, mientras la intención siga en camino): la misma consulta del sistema, sin esperar su turno. Escribes por
  qué (queda en la auditoría con tu nombre); el servidor pregunta y cierra con la respuesta. No hay botón para decir «sí se cobró» o «no se cobró»: si te
  equivocaras, se cobraría dos veces.
- **Devolución de boletos que Stripe dio por fallida**: la alerta dice la orden, quién pagó y los códigos de los boletos. Los boletos siguen devueltos
  (no entran: no se reponen solos), el cobro vuelve a tener ese saldo y la cancelación del evento deja de contarlo como devuelto. Decide con la persona si
  se le devuelve otra vez o se le repone el boleto (hoy, por fuera de la app: la acción todavía no existe).
- **Resolver a mano** (solo devoluciones y reversiones atascadas que **siguen pendientes**, y que Stripe ya intentó **o** que llevan **23 horas** anotadas
  sin un solo intento: desde ahí nadie las va a mandar): cuando el dinero se movió fuera de Stripe (un cheque, una transferencia), escribes cómo; desde ahí
  el sistema **nunca** la vuelve a pedir a Stripe (sería pagar dos veces) y sigue contando como devuelta. Antes de esas 23 horas, una sin intentos no se
  ofrece (todavía podría salir sola). Si la devolución ya quedó hecha o fallida, la alerta es solo informativa: no ofrece «Resolver a mano».

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Stripe no responde a la hora de conciliar | El día queda FALLÓ, llega la alerta y puedes «Conciliar otra vez». |
| Pasaron dos horas de la hora y no corrió | Llega «la conciliación no corrió» (el barrido podría estar caído). |
| Un cobro cruzó la medianoche | Se empareja: se leen el día anterior y el siguiente; solo se informa lo del día. |
| La misma diferencia sale en otra corrida | Conserva a su dueño (misma llave). |
| Quieres conciliar hoy | No deja: solo días que ya terminaron (días UTC, los de Stripe). |
| Resolver a mano algo que Stripe ya hizo | No deja: «Ya no está pendiente». |
| La devolución de la alerta ya quedó fallida o hecha | La alerta se ve sin «Resolver a mano» (informativa): «Me hago cargo» y «Resuelta» siguen. |
| Una devolución lleva 23 h sin respuesta de Stripe | No se vuelve a pedir; llega «devolución atascada» una vez: mira en Stripe si salió y resuélvela. |
| Stripe da por fallida días después una devolución hecha | La devolución queda fallida, el cobro vuelve a tener ese saldo (y la solicitud o el caso restan lo que habían sumado) y llega la alerta. |
| …y era de boletos | Además: los boletos siguen devueltos, la cancelación del evento lo resta y la alerta dice qué boletos y de quién. Nada se devuelve ni se repone solo. |
| Una devolución anotada murió antes de su primer intento | El barrido la manda con su llave en las 23 h siguientes; pasadas, llega la alerta y ya se puede «Resolver a mano». |
| Una transferencia al organizador lleva 23 h en camino | No se vuelve a pedir; llega «transferencia al organizador sin respuesta» una vez: mira en Stripe si salió. |
| Un cobro de Pro lleva 23 h sin respuesta de Stripe | No se cobra otra vez ni pasa a «cobro fallido»; llega «cobro de Pro sin respuesta» una vez: mira en Stripe si se cobró. |
| Un cobro del plan del Hogar, de una renta o de la renovación de un patrocinio lleva 23 h sin respuesta | No se cobra otra vez y nada cambia por eso; llega «cobro con tarjeta guardada sin respuesta» una vez (si era al recoger una renta, dice el depósito que sigue retenido): mira en Stripe si se cobró. |
| Ese cobro salió cuando ya no aplicaba | Queda en el libro (el pago del plan o de la renta) sin aplicarse; llega «cobro con tarjeta guardada sin aplicar» una vez: decide si se devuelve. |
| Pasadas 23 h, Stripe dice que sí salió | Se cierra hecho una vez, sin cobrar otra vez; la alerta se cierra sola. |
| Pasadas 23 h, no está en Stripe (y pasaron 24 h desde que se mandó) | «Nunca llegó»: no se cobró; el siguiente cobro vuelve a poder salir (una renta apartada suelta su depósito y ya se puede cancelar; una transferencia se manda otra vez). |
| Stripe no contesta la consulta | Nada cambia; se vuelve a preguntar en 15 minutos o con «Preguntar a Stripe ahora». |
| Stripe tiene dos cobros para una intención, u otro monto | No se cierra solo: llega «lo que dijo Stripe no se cierra solo». |
| Un cobro de Pro que Stripe sí hizo, de un período que ya estaba pagado con otro cobro | No se cierra solo («lo que dijo Stripe…»): se cobró dos veces; devuelve uno. Mientras tanto, a ese negocio no se le cobra Pro otra vez. |
| «Preguntar a Stripe ahora» en algo que ya se cerró | No deja: «Ya no está en camino». |
| Rol sin «Transacciones: aprobar» | Ves todo, sin botones. |
| Diferencias de otra ciudad | No aparecen (las de To'Latino sin ciudad, solo a quien ve todas). |

Para el reporte diario al fundador, la base da `conciliacion_del_dia(día)`: si corrió, su estado, cuántas diferencias y cuántas sin dueño.

## Los eventos del webhook
El libro se pone al día con lo que Stripe avisa por el webhook (firmado). Al conectar Stripe de verdad, el endpoint debe suscribirse a **todos** estos
eventos, también los de las **cuentas conectadas** (los `payout.*` llegan de la cuenta de cada negocio). Es la misma lista que está escrita al principio
del código del webhook; si el código escucha uno que no está aquí, un guardián lo detiene.
`account.updated` · `payment_intent.canceled` · `payment_intent.succeeded` · `payment_intent.amount_capturable_updated` · `charge.refunded` ·
`charge.refund.updated` · `charge.dispute.created` · `charge.dispute.updated` · `charge.dispute.closed` · `payout.created` · `payout.updated` ·
`payout.paid` · `payout.failed` · `payout.canceled`

## Preguntas frecuentes
**¿Una diferencia es dinero perdido?** No siempre: muchas son tiempos (algo que Stripe hizo y el webhook todavía no anotó). Por eso cada una necesita un
dueño que la mire.
**¿Puedo borrar una diferencia?** No: se resuelve con su nota. La conciliación y sus notas son de solo inserción.
**¿Qué hago con una retención suelta?** Se suelta sola en 7 días si nadie la cobra; si el pedido existe, revisa con el negocio y Stripe.
**¿Por qué no hay un botón «sí se cobró»?** Porque el servidor decide con lo que dice Stripe. «Preguntar a Stripe ahora» hace la misma consulta que el
sistema; si Stripe no contesta, inténtalo más tarde.
**¿Y si la alerta dice «sin dato propio» o la consulta siempre dice «no está»?** Es un cobro que salió antes del 21 nov: no se da por «no llegó» solo.
Míralo en Stripe por el negocio y la fecha y anótalo con «Me hago cargo».

## English

### What it does
- **The daily reconciliation** (the money guardian): every morning, at the hour set in Configuration › Money (6 AM Eastern by default), the system balances the
  previous day **object by object** between Stripe and our ledger: charges (PaymentIntents) against the ledger's charges, the Pro ones and the bank
  verifications; refunds; transfers to organizers and their reversals; payouts to the bank; disputes; and **orphan holds** (a hold that Stripe has and the
  ledger does not, because the database failed right after the hold).
- Each day comes out with its status: **BALANCED**, **DIFFERENCES** (how many, and how many **have no owner**), **FAILED** (Stripe did not answer) or **NOT RUN**.
  Tap a day to see its differences: what it is, which business, the id, what Stripe says and what the ledger says.
- **A difference with no owner alerts the money team at once** (Admin and Finance) and the home screen says **«The money doesn’t balance»** until someone takes
  it. **I’ll take it** (with a note), **Resolved** (how it was resolved) and **Reopen**: all with a note and in the audit log; nothing is deleted.
- **Reconcile again** a day that has already ended (for example, after Stripe corrected something): the new run is the one that counts; the differences that
  remain keep their owner.
- **Money alerts** (what Stripe never warns about): **stuck refund** (Stripe rejected it more times than the number in Configuration: closed card, account
  with a dispute), **transfer with no balance to reverse** (the organizer has no balance), **dispute about to expire** (unanswered 3 days before the bank's
  deadline), **failed payout to the bank**, **reconciliation didn’t run**, **refund Stripe marked as failed** (Stripe had made it and days later said it did
  not reach the card: it is marked failed, its balance goes back to the charge and, if it is still owed, it is refunded again) and **unapplied Pro charge**
  (Pro was charged while the plan was changing, for example a courtesy given at that moment: the change is kept and you decide whether to refund it). A
  refund (of a charge, of tickets or of a sponsorship) with **23 hours** and no answer from Stripe is no longer requested again with the same key (Stripe
  forgets it after 24 h and could refund twice): it arrives as a stuck refund to check in Stripe. Each one arrives only once.
- The same for the rest of the money that goes out: the **transfer to the organizer** (Tuesday's settlement) and its **reversal**, and the **Pro charge**.
  If after **23 hours** Stripe has not said yes, it is not requested again: **organizer transfer with no answer**, **transfer with no balance to reverse**
  or **Pro charge with no answer** arrives once, to check in Stripe. A Pro charge on its way does not count as a «failed charge» (the plan does not change)
  and, while it is on its way, that business is not charged anything else.
- The same for the **saved-card charges** To'Latino makes without the person present: the monthly **home plan**, the **rental** (at pickup, «one more
  day» and late days) and a **sponsorship's automatic renewal**. If Stripe does not answer, the charge stays **on its way** (it is not a «no» from the
  bank: the plan does not fail, the rental does not say «the card did not go through» and the sponsorship does not end) and the system finishes it by
  itself with the same key. After **23 hours** with no answer, **saved-card charge with no answer** arrives once, to check in Stripe. If the charge went
  through when what it paid for had already changed (the plan was cancelled, the rental was no longer on hold, the sponsorship ended or there was no slot
  left), it stays in the ledger without being applied and **unapplied saved-card charge** arrives: decide whether to refund it. None is charged twice for
  the same thing (the database prevents it).
- **Asking Stripe (since Nov 21):** what spends those **23 hours** with no answer (a Pro charge, a saved-card charge or a transfer to the organizer) no
  longer stays on its way forever. Each charge and transfer goes out with **its own tag** (in Stripe, the `tl_intencion` metadata, e.g.
  `offsession_charges:812`), and the system **asks Stripe** for that tag (every 15 minutes per intent) and closes it with what Stripe says, never with what
  someone remembers:
  - **It went through** → it is done, **only once**, the usual way (the plan period moves on, the rental goes out, the sponsorship renews, Pro is paid,
    the settlement is paid) and nothing is charged again. The audit log says «gateway query».
  - **The bank declined it** → it is declined and the usual «no» follows (the plan retries, the rental asks for another card, Pro goes to failed charge).
  - **It is not in Stripe** → «never arrived»: nothing was charged and the next charge for that plan, rental, sponsorship or Pro **can go out again**
    (with another key). For a transfer, its key becomes valid again and it is sent again, same amount. Only if it was sent with its own tag and **24
    hours** have passed since it was sent (Stripe's search takes time to show new things). Whatever was sent before Nov 21, without that tag, is **never**
    taken as «never arrived».
  - **Still in progress** (e.g. the bank asks to verify) or **Stripe did not answer the query** → nothing changes; the alert stays open.
  - **More than one in Stripe**, or **another amount** → it does not close by itself: **«what Stripe said doesn’t close by itself»** arrives so a person decides.
  The alert shows **what the last query said and when**, and **closes by itself** (signed «To'Latino») once the intent is no longer on its way.
- **Ask Stripe now** (on those alerts, while the intent is still on its way): the same query the system makes, without waiting for its turn. You write why
  (it stays in the audit log with your name); the server asks and closes with the answer. There is no button to say «it was charged» or «it wasn’t»: a
  mistake would charge twice.
- **Ticket refund Stripe marked as failed**: the alert names the order, who paid and the ticket codes. The tickets stay refunded (no entry: they are not
  reissued by themselves), the charge has that balance again and the event cancellation stops counting it as refunded. Decide with the person whether to
  refund again or reissue the ticket (for now, outside the app: the action does not exist yet).
- **Resolve by hand** (only stuck refunds and reversals that are **still pending**, and that Stripe already tried **or** that have been recorded for
  **23 hours** without a single attempt: from then on nobody will send them): when the money moved outside Stripe (a check, a transfer), you write how; from
  then on the system **never** asks Stripe for it again (that would pay twice) and it keeps counting as refunded. Before those 23 hours, one with no attempts
  is not offered (it could still go out by itself). If the refund is already done or failed, the alert is informational only: it does not offer «Resolve by hand».

### What happens in each case
| Case | What happens |
|---|---|
| Stripe does not answer at reconciliation time | The day is left as FAILED, the alert arrives and you can «Reconcile again». |
| Two hours have passed since the set hour and it did not run | You get «Reconciliation didn’t run» (the sweep may be down). |
| A charge crossed midnight | It is matched: the previous and the next day are read; only what belongs to the day is reported. |
| The same difference shows up in another run | It keeps its owner (same key). |
| You want to reconcile today | It will not let you: only days that have already ended (UTC days, the ones Stripe uses). |
| Resolving by hand something Stripe already did | It will not let you: «It is no longer pending». |
| The alert's refund is already failed or done | The alert shows without «Resolve by hand» (informational): «I’ll take it» and «Resolved» remain. |
| A refund has 23 h with no answer from Stripe | It is not requested again; «stuck refund» arrives once: check in Stripe whether it went out and resolve it. |
| Stripe marks a refund that was made as failed days later | The refund is marked failed, the charge has that balance again (and the request or case subtracts what it had added) and the alert arrives. |
| …and it was a ticket refund | Also: the tickets stay refunded, the event cancellation subtracts it and the alert names the tickets and who they belong to. Nothing is refunded or reissued by itself. |
| A recorded refund died before its first attempt | The sweep sends it with its key within the next 23 h; after that, the alert arrives and «Resolve by hand» becomes available. |
| A transfer to the organizer has been on its way for 23 h | It is not requested again; «organizer transfer with no answer» arrives once: check in Stripe whether it went out. |
| A Pro charge has had no answer from Stripe for 23 h | It is not charged again and does not become a «failed charge»; «Pro charge with no answer» arrives once: check in Stripe whether it was charged. |
| A home plan, rental or sponsorship renewal charge has had no answer for 23 h | It is not charged again and nothing changes because of it; «saved-card charge with no answer» arrives once (at a rental pickup, it names the deposit still held): check in Stripe whether it was charged. |
| That charge went through when it no longer applied | It stays in the ledger (the plan or rental payment) without being applied; «unapplied saved-card charge» arrives once: decide whether to refund it. |
| After 23 h, Stripe says it went through | It closes as done once, without charging again; the alert closes by itself. |
| After 23 h, it is not in Stripe (and 24 h have passed since it was sent) | «Never arrived»: nothing was charged; the next charge can go out again (a held rental releases its deposit and can be cancelled; a transfer is sent again). |
| Stripe does not answer the query | Nothing changes; it is asked again in 15 minutes or with «Ask Stripe now». |
| Stripe has two charges for one intent, or another amount | It does not close by itself: «what Stripe said doesn’t close by itself» arrives. |
| A Pro charge Stripe did make, for a period already paid by another charge | It does not close by itself: it was charged twice; refund one. Meanwhile that business is not charged Pro again. |
| «Ask Stripe now» on something already closed | It will not let you: «It is no longer on its way». |
| Role without «Transactions: approve» | You see everything, without buttons. |
| Differences from another city | They do not show (To'Latino's own, with no city, only to whoever sees all cities). |

For the daily report to the founder, the database provides `conciliacion_del_dia(day)`: whether it ran, its status, how many differences and how many have no owner.

### Webhook events
The ledger catches up with what Stripe reports through the (signed) webhook. When Stripe is connected for real, the endpoint must subscribe to **all**
these events, including those from **connected accounts** (the `payout.*` ones come from each business's account). It is the same list written at the top
of the webhook code; if the code listens to one that is not here, a guardian stops it.
`account.updated` · `payment_intent.canceled` · `payment_intent.succeeded` · `payment_intent.amount_capturable_updated` · `charge.refunded` ·
`charge.refund.updated` · `charge.dispute.created` · `charge.dispute.updated` · `charge.dispute.closed` · `payout.created` · `payout.updated` ·
`payout.paid` · `payout.failed` · `payout.canceled`

### FAQ
**Is a difference lost money?** Not always: many are timing (something Stripe did that the webhook has not recorded yet). That is why each one needs an owner to
look at it.
**Can I delete a difference?** No: it is resolved with its note. The reconciliation and its notes are insert-only.
**What do I do with an orphan hold?** It releases itself in 7 days if nobody charges it; if the order exists, check with the business and Stripe.
**Why is there no «it was charged» button?** Because the server decides with what Stripe says. «Ask Stripe now» makes the same query as the system; if
Stripe does not answer, try again later.
**What if the query always says «not in Stripe» for an old charge?** It is a charge sent before Nov 21, without its own tag: it is not taken as «never
arrived» by itself. Look it up in Stripe by business and date and note it with «I’ll take it».
