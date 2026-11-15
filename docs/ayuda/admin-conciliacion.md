# Super Admin › Planes › Ingresos › Conciliación y alertas del dinero · Reconciliation and money alerts

_Pantallas: `/admin/planes?tab=ing` (CONCILIACIÓN DIARIA y ALERTAS DEL DINERO), el Inicio del Super Admin («EL DINERO NO CUADRA») y Sistema ›
Configuración › Dinero. Permiso: ver con «Planes y suscripciones»; actuar (me hago cargo, resuelta, reabrir, conciliar otra vez, resolver a mano) con
«Transacciones: aprobar». Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

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
  del banco), **pago al banco que falló** y **la conciliación no corrió**. Cada una llega una sola vez.
- **Resolver a mano** (solo devoluciones y reversiones atascadas): cuando el dinero se movió fuera de Stripe (un cheque, una transferencia), escribes cómo;
  desde ahí el sistema **nunca** la vuelve a pedir a Stripe (sería pagar dos veces) y sigue contando como devuelta.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Stripe no responde a la hora de conciliar | El día queda FALLÓ, llega la alerta y puedes «Conciliar otra vez». |
| Pasaron dos horas de la hora y no corrió | Llega «la conciliación no corrió» (el barrido podría estar caído). |
| Un cobro cruzó la medianoche | Se empareja: se leen el día anterior y el siguiente; solo se informa lo del día. |
| La misma diferencia sale en otra corrida | Conserva a su dueño (misma llave). |
| Quieres conciliar hoy | No deja: solo días que ya terminaron (días UTC, los de Stripe). |
| Resolver a mano algo que Stripe ya hizo | No deja: «Ya no está pendiente». |
| Rol sin «Transacciones: aprobar» | Ves todo, sin botones. |
| Diferencias de otra ciudad | No aparecen (las de To'Latino sin ciudad, solo a quien ve todas). |

Para el reporte diario al fundador, la base da `conciliacion_del_dia(día)`: si corrió, su estado, cuántas diferencias y cuántas sin dueño.

## Preguntas frecuentes
**¿Una diferencia es dinero perdido?** No siempre: muchas son tiempos (algo que Stripe hizo y el webhook todavía no anotó). Por eso cada una necesita un
dueño que la mire.
**¿Puedo borrar una diferencia?** No: se resuelve con su nota. La conciliación y sus notas son de solo inserción.
**¿Qué hago con una retención suelta?** Se suelta sola en 7 días si nadie la cobra; si el pedido existe, revisa con el negocio y Stripe.

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
  deadline), **failed payout to the bank** and **reconciliation didn’t run**. Each one arrives only once.
- **Resolve by hand** (only stuck refunds and reversals): when the money moved outside Stripe (a check, a transfer), you write how; from then on the system
  **never** asks Stripe for it again (that would pay twice) and it keeps counting as refunded.

### What happens in each case
| Case | What happens |
|---|---|
| Stripe does not answer at reconciliation time | The day is left as FAILED, the alert arrives and you can «Reconcile again». |
| Two hours have passed since the set hour and it did not run | You get «Reconciliation didn’t run» (the sweep may be down). |
| A charge crossed midnight | It is matched: the previous and the next day are read; only what belongs to the day is reported. |
| The same difference shows up in another run | It keeps its owner (same key). |
| You want to reconcile today | It will not let you: only days that have already ended (UTC days, the ones Stripe uses). |
| Resolving by hand something Stripe already did | It will not let you: «It is no longer pending». |
| Role without «Transactions: approve» | You see everything, without buttons. |
| Differences from another city | They do not show (To'Latino's own, with no city, only to whoever sees all cities). |

For the daily report to the founder, the database provides `conciliacion_del_dia(day)`: whether it ran, its status, how many differences and how many have no owner.

### FAQ
**Is a difference lost money?** Not always: many are timing (something Stripe did that the webhook has not recorded yet). That is why each one needs an owner to
look at it.
**Can I delete a difference?** No: it is resolved with its note. The reconciliation and its notes are insert-only.
**What do I do with an orphan hold?** It releases itself in 7 days if nobody charges it; if the order exists, check with the business and Stripe.
