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

`/admin/planes?tab=ing`: every morning (Configuration › Money hour, 6 AM Eastern by default) the previous day is reconciled object by object between
Stripe and our ledger — charges, refunds, organizer transfers and reversals, bank payouts, disputes and orphan holds. Each day shows MATCHES, DIFFERENCES
(how many have no owner), FAILED or NOT RUN. A difference with no owner alerts the money team at once and the Admin home says «MONEY DOES NOT MATCH»
until someone takes it: «I'll take it», «Resolved», «Reopen», all with a note and audited; nothing is deleted. «Reconcile again» re-runs a finished day.
Money alerts cover what Stripe never warns about: stuck refunds, transfers that cannot be reversed, disputes near the deadline, failed payouts and a
reconciliation that did not run. «Resolve by hand» records that money moved outside Stripe; the system then never asks Stripe again (that would pay twice).
