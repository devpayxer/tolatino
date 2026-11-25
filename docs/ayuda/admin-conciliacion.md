# Super Admin › Planes › Ingresos › Conciliación y alertas del dinero · Reconciliation and money alerts

_Pantallas: `/admin/planes?tab=ing` (CONCILIACIÓN DIARIA y ALERTAS DEL DINERO), el Inicio del Super Admin («EL DINERO NO CUADRA») y Sistema ›
Configuración › Dinero. Permiso: ver con «Planes y suscripciones»; actuar (me hago cargo, resuelta, reabrir, conciliar otra vez, resolver a mano,
preguntar a Stripe ahora, elegir cuál vale) con «Transacciones: aprobar». Versión: 21 nov 2026. Audiencia: equipo. Tema: equipo._

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
- **Elegir cuál vale** (en «lo que dijo Stripe no se cierra solo», desde el 21 nov): cuando Stripe tiene **más de un cobro** (o retención, o transferencia)
  para una sola intención, uno con **otro monto**, o un **cobro de Pro de un período que ya estaba pagado**, eliges cuál vale (o **ninguno**) y escribes por
  qué. El servidor **no se fía de la pantalla**: antes de guardar **vuelve a preguntar a Stripe** y solo deja elegir uno que Stripe tenga para esa intención,
  que haya salido y con **el monto de la intención**; si alguno sigue en curso o Stripe no contesta, no cambia nada. Se decide **una sola vez** (si otra
  persona decidió primero, lo dice). Después, en el mismo momento:
  - **Vale uno** → la intención queda hecha con ese, por el mismo camino de siempre (el plan avanza, la renta sale, la retención renovada queda anotada…).
  - **Ninguno** → la intención queda fallida **sin contar como un «no» del banco** (no suma intentos ni pasa a Free) y el objeto se puede volver a cobrar
    (con otra llave). En un **cobro de Pro de un período ya pagado** solo se puede elegir «ninguno»: se devuelve y el período sigue pagado con el otro; el
    siguiente período se cobra normal. Una **transferencia** solo se cierra eligiendo la que vale (el organizador espera su pago).
  - **Lo que sobra** se **devuelve** (un cobro), se **revierte** (una transferencia) o se **suelta** (una retención, que no movió dinero). Cada devolución
    sale con su llave y su dato propio; si Stripe no contesta, queda **en camino** y se termina sola (no es un «rechazo»); pasadas 23 h se le pregunta a
    Stripe. Si Stripe dice que no, llega **«devolver lo que Stripe hizo de más»**: hazla desde Stripe (o por fuera) y márcala resuelta con la nota.
  Mientras se pueda decidir, la alerta no ofrece «Resuelta» (la intención seguiría en camino). Queda todo en la auditoría (la decisión, lo que dijo Stripe
  al decidir y lo que se devolvió). La conciliación cuenta el cobro de más y su devolución en el libro.
- **Retenciones que se renuevan** (el **depósito de una renta** y lo retenido de un **estimado** o de **«algo más»**: la tarjeta suelta una retención a
  los 7 días y a las 164 h se vuelve a retener sola): desde el 21 nov la renovación sale con su dato propio y, si Stripe **no contesta**, **no se suelta la
  vieja ni se avisa a nadie** (antes se avisaba «el banco ya no deja» aunque no fuera cierto). Se reintenta con la misma llave mientras Stripe la recuerde
  y la vieja siga viva (unas 4 horas); después **se le pregunta a Stripe**: si la nueva existe, se anota y entonces se suelta la vieja; si el banco dijo que
  no, se suelta la vieja y se avisa «el banco ya no deja»; si nunca llegó (24 h), se suelta la vieja y se avisa «no se pudo renovar» (sin culpar al banco).
  Lo que no se cierra así llega como **«retención renovada sin respuesta»**, una vez, con «Preguntar a Stripe ahora». Si la renta volvió o la cita se cerró
  mientras tanto y la nueva sí salió, la nueva se suelta sola.
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
| Stripe tiene dos cobros para una intención, u otro monto | No se cierra solo: llega «lo que dijo Stripe no se cierra solo», con «Elegir cuál vale». |
| Un cobro de Pro que Stripe sí hizo, de un período que ya estaba pagado con otro cobro | No se cierra solo: «Elegir cuál vale» solo ofrece «ninguno»: se devuelve ese cobro, la intención falla sin contar como cobro fallido y el siguiente período se cobra normal. |
| Eliges uno que Stripe no tiene para esa intención | No deja: «Ese no está entre lo que Stripe tiene para esta intención». |
| Eliges uno con otro monto, o que no salió | No deja: «Ese no vale». |
| Al decidir, uno sigue en curso en Stripe, o Stripe no contesta | No cambia nada; vuelve a intentarlo después. |
| Dos personas deciden a la vez | Vale la primera; la otra lee «Ya lo decidió otra persona del equipo». |
| La devolución de lo que sobra no tiene respuesta de Stripe | Sigue en camino y se termina sola con la misma llave; pasadas 23 h se le pregunta a Stripe. |
| Stripe dice que no a esa devolución | Queda fallida y llega «devolver lo que Stripe hizo de más», una vez: hazla por otro lado y márcala resuelta. |
| La renovación de una retención no tiene respuesta | No se suelta la vieja ni se avisa; se reintenta con la misma llave (unas 4 h) y después se pregunta a Stripe. |
| …Stripe dice que la nueva existe | Se anota la nueva y se suelta la vieja; nadie recibe un aviso. |
| …el banco dijo que no | Se suelta la vieja; el negocio (y en un estimado, la persona) lee «el banco no dejó». |
| …nunca llegó a Stripe (24 h) | Se suelta la vieja; el aviso dice «no se pudo renovar», sin culpar al banco. |
| …no se cierra (en curso, sin respuesta, no está todavía) | Sigue; llega «retención renovada sin respuesta» una vez, con «Preguntar a Stripe ahora». |
| …Stripe tiene dos retenciones nuevas, u otro monto | «Elegir cuál vale»: la elegida queda anotada, lo que sobra se suelta; «ninguno» suelta todo. |
| Se va a soltar una retención y Stripe dice que ya estaba cobrada (desde el 25 nov) | El cobro queda **cobrado** con lo que Stripe cobró de verdad (nunca «soltado»), la persona y el negocio leen que no se pudo soltar porque ya se había cobrado, y llega «una retención atascada» (cobrada:) una vez, que **no se cierra sola**: mira en Stripe si ese cobro correspondía y, si no, devuélvelo. |
| La captura de una cancelación tarde (viaje, evento privado) da error o Stripe no la contesta (desde el 25 nov) | La retención se suelta (o se ve cobrada, si la captura sí salió: entonces la regla de la cancelación tarde sigue con lo cobrado) y llega «una retención atascada» (captura:) una vez, que **no se cierra sola** y dice que no se sabe si la captura salió: míralo en Stripe. |
| «Preguntar a Stripe ahora» en algo que ya se cerró | No deja: «Ya no está en camino». |
| Rol sin «Transacciones: aprobar» | Ves todo, sin botones. |
| Diferencias de otra ciudad | No aparecen (las de To'Latino sin ciudad, solo a quien ve todas). |

Para el reporte diario al fundador, la base da `conciliacion_del_dia(día)`: si corrió, su estado, cuántas diferencias y cuántas sin dueño.

### Devoluciones y reversiones que Stripe no contestó (desde el 21 nov)
Cada devolución de un cobro (también la de boletos) y cada reversión al organizador queda anotada **antes** de ir a Stripe, con un dato propio para
buscarla después. Si Stripe no contesta, no se da por rechazada: se vuelve a pedir con la misma llave durante 23 h. Pasado eso, el sistema **le pregunta a
Stripe** cada 15 minutos y la cierra con lo que diga:

| Lo que dice Stripe | Qué pasa |
|---|---|
| Sí salió | Queda hecha, una vez, con su objeto de Stripe; la alerta «Devolución atascada» se cierra sola. |
| La tiene como fallida | Queda fallida y su saldo libre (como cuando Stripe dice que no): alerta «Devolución que Stripe dio por fallida». Si todavía se debe, devuélvela otra vez. En boletos, la alerta dice qué orden y qué boletos; los boletos siguen devueltos. |
| No la tiene, y ya pasaron 24 h desde que se mandó | Nunca llegó: la **misma** devolución se manda con **otra llave**, una vez, si lo que se debe sigue igual. Si el cobro cambió (se devolvió por otro lado, tiene una disputa o no le queda saldo), queda fallida «nunca llegó» con su alerta. |
| No la tiene, pero todavía no pasa el margen | Sigue en camino; alerta «Devolución atascada» (una vez); se vuelve a preguntar. |
| Tiene varias para una sola | Alerta «Lo que dijo Stripe no se cierra solo» con «Elegir cuál vale»: la elegida queda como la hecha. Lo que salió de más **no se deshace desde aquí**: queda en la auditoría para verlo con la persona. No hay «ninguna». |
| La tiene con otro monto | Misma alerta, sin «Elegir»: míralo en Stripe y resuelve la devolución a mano. |
| No contesta la consulta | No cambia nada; se vuelve a preguntar. |

Una devolución anotada **antes del 21 nov** no tiene ese dato: nunca se da por «no llegó» y el sistema no la pregunta; su alerta lo dice. Mírala en Stripe y
resuélvela a mano.

**«Resolver a mano»** (devolución atascada, reversión atascada y, desde ahora, «Devolver lo que Stripe hizo de más») vuelve a preguntar a Stripe antes de
guardar: si Stripe dice que **salió**, se cierra como hecha y **no** se marca a mano; si **no contesta**, la tiene **en curso** o tiene **varias**, no
cambia nada (te dice por qué); si no la tiene, la tiene fallida o con otro monto, se marca a mano con tu nota. Dos personas a la vez: queda una sola.
«Preguntar a Stripe ahora» también sirve en estas alertas.

### La devolución de lo no usado de un patrocinio (desde el 21 nov, octava tanda)
Cuando un patrocinio (de negocio o de evento) termina con devolución, la base anota la devolución en ese mismo momento y se manda a Stripe con su dato
propio. Va por el mismo camino que las demás devoluciones (la tabla de arriba), con dos diferencias:
- **Un «no» de Stripe** (al mandarla o en la consulta) la deja **fallida** y **no se reintenta sola** (Stripe contestaría lo mismo). La alerta es
  «Devolución atascada» de esa devolución («Devolución de $X de lo no usado de un patrocinio (N): …»), con **«Resolver a mano»**: hazla por fuera (o desde
  Stripe) y márcala con tu nota. Antes de marcarla, el servidor vuelve a preguntar a Stripe.
- **Nunca llegó** siempre se vuelve a mandar con otra llave (una vez por ventana): lo que se debe no cambia, lo fijó la base al terminar.
Si la consulta caída dejó la alerta en «sin respuesta» y después Stripe dice «fallida», la misma alerta sigue abierta y muestra lo que dijo Stripe.
Las alertas de antes («pat-dev-…», sin botones) se cerraron solas: las sigue la de cada devolución. Una devolución de patrocinio que quedó en camino
antes del 21 nov no tiene el dato: su alerta dice mirarla en Stripe y resolverla a mano.

### Devolver otra vez unos boletos y la espera de 10 minutos (desde el 22 nov)
- **Devolver otra vez (boletos):** en la alerta «Devolución que Stripe dio por fallida» de unos boletos aparece **Devolver otra vez · $X** cuando el cobro
  todavía tiene saldo y no hay una disputa con el banco. Devuelve exactamente lo que falló, a la misma tarjeta, **una sola vez** (dos personas a la vez =
  una devolución). Los boletos siguen devueltos. Pide un motivo, que queda en la auditoría con tu nombre. Permiso: el mismo de Devolver.
- **Si sale:** la persona recibe su aviso y la alerta se cierra sola. **Si Stripe dice que no:** queda su propia alerta (desde ahí se puede intentar otra
  vez) y la de antes se reabre a tu nombre.
- **Resolver a mano espera 10 minutos:** no deja marcar a mano una devolución en los 10 minutos siguientes a un envío a Stripe (Stripe puede no mostrarla
  todavía): «Se mandó a Stripe hace menos de 10 minutos…». Espera y vuelve a intentarlo.
- **La devolución de un patrocinio que primero quedó sin respuesta y después falló** dice ahora «Devolución que Stripe dio por fallida», con lo que dijo el
  banco y cuándo.

| Caso | Qué pasa |
|---|---|
| Ya se devolvió parte por otro lado y el cobro no alcanza | «Devolver otra vez» no se ofrece; se resuelve con la persona. |
| Dos personas del equipo la piden a la vez | Una sola devolución; la otra ve que es la misma. |
| El cobro tiene una disputa con el banco | No se ofrece hasta que la disputa se gane. |
| Marcar a mano una fallida que ya se devolvió otra vez | No deja: «Ya no está pendiente: se devolvió otra vez desde su alerta o Stripe la cerró.» |

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
**¿Puedo cambiar una decisión de «Elegir cuál vale»?** No: se decide una vez y queda en la auditoría (la base no deja cambiarla). Si lo devuelto no
llegó, sale la alerta de esa devolución.
**¿Cómo sé cuál fue el primero en «Elegir cuál vale»?** Cada opción dice su **monto**, **cuándo salió** (día y hora en la zona de la ciudad de la
alerta; si la alerta no tiene ciudad, la hora del Este, como el resto del Super Admin) y su **id de Stripe** completo, p. ej. «$149.00 · 20 nov, 3:14 pm ·
pi_…». Van **en orden de cobro: el primero arriba**. Lo que Stripe tiene pero no se puede elegir (de **otro monto**, que **no salió**, que **sigue en
curso**, o un período de Pro que ya estaba cobrado) no sale como opción: aparece en el texto de la hoja, en «No se puede elegir», con su monto, su fecha y
el porqué. Es lo que contestó **la última consulta**; al decidir, el servidor vuelve a preguntar a Stripe y decide con esa respuesta (si algo cambió, te lo
dice y no guarda nada). Una alerta de antes del 21 nov (consulta sin ese detalle) muestra solo los ids, como antes.
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
- **Choose which counts** (on «what Stripe said doesn’t close by itself», since Nov 21): when Stripe has **more than one charge** (or hold, or transfer) for a
  single intent, one with **another amount**, or a **Pro charge for a period already paid**, you choose which one counts (or **none**) and write why. The
  server **does not trust the screen**: before saving it **asks Stripe again** and only lets you pick one that Stripe has for that intent, that went
  through and has **the intent's amount**; if one is still in progress or Stripe does not answer, nothing changes. It is decided **only once** (if someone
  else decided first, it says so). Then, at once:
  - **One counts** → the intent is done with it, the usual way (the plan moves on, the rental goes out, the renewed hold is recorded…).
  - **None** → the intent fails **without counting as a «no» from the bank** (no attempt is added, it does not go to Free) and the object can be charged
    again (with another key). For a **Pro charge of an already paid period** only «none» can be chosen: it is refunded and the period stays paid by the
    other one; the next period is charged as usual. A **transfer** only closes by choosing the one that counts (the organizer is waiting for the payment).
  - **What is left over** is **refunded** (a charge), **reversed** (a transfer) or **released** (a hold, which moved no money). Each refund goes out with
    its own key and tag; if Stripe does not answer, it stays **on its way** and finishes by itself (it is not a «rejection»); after 23 h Stripe is asked.
    If Stripe says no, **«refund what Stripe made in excess»** arrives: do it from Stripe (or outside it) and mark it resolved with the note.
  While it can be decided, the alert does not offer «Resolved» (the intent would stay on its way). Everything stays in the audit log (the decision, what
  Stripe said when deciding and what was refunded). The reconciliation counts the extra charge and its refund in the ledger.
- **Holds that renew** (a **rental deposit** and what is held for an **estimate** or an **extra**: the card releases a hold after 7 days and at 164 h it is
  held again by itself): since Nov 21 the renewal goes out with its own tag and, if Stripe **does not answer**, **the old hold is not released and nobody is
  notified** (before, «the bank no longer allows it» was sent even when it was not true). It is retried with the same key while Stripe remembers it and the
  old hold is alive (about 4 hours); after that **Stripe is asked**: if the new one exists, it is recorded and then the old one is released; if the bank
  said no, the old one is released and «the bank no longer allows it» is sent; if it never arrived (24 h), the old one is released and «it could not be
  renewed» is sent (without blaming the bank). What does not close this way arrives as **«renewed hold with no answer»**, once, with «Ask Stripe now». If the
  rental came back or the booking closed in the meantime and the new hold did go through, the new one is released by itself.
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
| Stripe has two charges for one intent, or another amount | It does not close by itself: «what Stripe said doesn’t close by itself» arrives, with «Choose which counts». |
| A Pro charge Stripe did make, for a period already paid by another charge | It does not close by itself: «Choose which counts» only offers «none»: that charge is refunded, the intent fails without counting as a failed charge and the next period is charged as usual. |
| You choose one Stripe does not have for that intent | It will not let you: «That one is not among what Stripe has for this intent». |
| You choose one with another amount, or that did not go through | It will not let you: «That one does not count». |
| When deciding, one is still in progress at Stripe, or Stripe does not answer | Nothing changes; try again later. |
| Two people decide at the same time | The first one counts; the other reads «Someone else on the team already decided it». |
| The refund of what is left over gets no answer from Stripe | It stays on its way and finishes by itself with the same key; after 23 h Stripe is asked. |
| Stripe says no to that refund | It is marked failed and «refund what Stripe made in excess» arrives once: do it another way and mark it resolved. |
| A hold renewal gets no answer | The old hold is not released and nobody is notified; it is retried with the same key (about 4 h) and then Stripe is asked. |
| …Stripe says the new one exists | The new one is recorded and the old one released; nobody gets a notice. |
| …the bank said no | The old one is released; the business (and, for an estimate, the person) reads «the bank did not allow it». |
| …it never reached Stripe (24 h) | The old one is released; the notice says «it could not be renewed», without blaming the bank. |
| …it does not close (in progress, no answer, not there yet) | It stays; «renewed hold with no answer» arrives once, with «Ask Stripe now». |
| …Stripe has two new holds, or another amount | «Choose which counts»: the chosen one is recorded and the rest released; «none» releases everything. |
| A hold is about to be released and Stripe says it was already charged (since 25 Nov) | The charge is recorded as **charged** with what Stripe really charged (never «released»), the person and the business read that it could not be released because it had already been charged, and «a stuck hold» (cobrada:) arrives once and **does not close by itself**: check in Stripe whether that charge was due and, if not, refund it. |
| The capture of a late cancellation (trip, private event) fails or Stripe does not answer it (since 25 Nov) | The hold is released (or shows as charged, if the capture did go through: then the late-cancellation rule goes on with what was charged) and «a stuck hold» (captura:) arrives once, **does not close by itself** and says it is not known whether the capture went through: check in Stripe. |
| «Ask Stripe now» on something already closed | It will not let you: «It is no longer on its way». |
| Role without «Transactions: approve» | You see everything, without buttons. |
| Differences from another city | They do not show (To'Latino's own, with no city, only to whoever sees all cities). |

For the daily report to the founder, the database provides `conciliacion_del_dia(day)`: whether it ran, its status, how many differences and how many have no owner.

#### Refunds and reversals Stripe did not answer (since Nov 21)
Every refund of a charge (tickets too) and every reversal from an organizer is recorded **before** going to Stripe, with its own tag to find it later. If
Stripe does not answer, it is not taken as rejected: it is requested again with the same key for 23 h. After that, the system **asks Stripe** every 15
minutes and closes it with the answer:

| What Stripe says | What happens |
|---|---|
| It went through | Done, once, with its Stripe object; the «Stuck refund» alert closes by itself. |
| It has it as failed | Failed and its balance free (as when Stripe says no): «Refund Stripe marked as failed» alert. If it is still owed, refund it again. For tickets, the alert names the order and the tickets; the tickets stay refunded. |
| It does not have it, 24 h after it was sent | It never arrived: the **same** refund is sent with **another key**, once, if what is owed is unchanged. If the charge changed (refunded elsewhere, disputed, or no balance left), it fails as «never arrived» with its alert. |
| It does not have it, before the margin | Still on its way; «Stuck refund» alert (once); asked again later. |
| It has several for one | «What Stripe said doesn’t close by itself» alert with «Choose which counts»: the chosen one is the done one. What went out in excess **is not undone from here**: it stays in the audit log to sort out with the person. There is no «none». |
| It has it with another amount | Same alert, without «Choose»: check Stripe and resolve the refund manually. |
| It does not answer the query | Nothing changes; it is asked again. |

A refund recorded **before Nov 21** has no tag: it is never taken as «never arrived» and the system does not ask about it; its alert says so. Check it in
Stripe and resolve it manually.

**«Resolve manually»** (stuck refund, stuck reversal and, now, «Refund what Stripe made in excess») asks Stripe again before saving: if Stripe says it
**went through**, it is closed as done and **not** marked manually; if it **does not answer**, has it **in progress** or has **several**, nothing changes
(it tells you why); if it does not have it, has it as failed or with another amount, it is marked manually with your note. Two people at once: only one
counts. «Ask Stripe now» also works on these alerts.

#### Refunding the unused part of a sponsorship (since Nov 21, eighth batch)
When a sponsorship (business or event) ends with a refund, the database records the refund at that same moment and it is sent to Stripe with its own
tag. It follows the same path as the other refunds (the table above), with two differences:
- **A «no» from Stripe** (when sending it or in the query) leaves it **failed** and it is **not retried by itself** (Stripe would answer the same). The
  alert is that refund's «Stuck refund» («Refund of $X for the unused part of a sponsorship (N): …»), with **«Resolve manually»**: make it outside (or
  from Stripe) and mark it with your note. Before marking it, the server asks Stripe again.
- **Never arrived** is always sent again with another key (once per window): what is owed does not change, the database fixed it when it ended.
If the query was down and left the alert as «no answer» and later Stripe says «failed», the same alert stays open and shows what Stripe said.
The old alerts («pat-dev-…», without buttons) closed by themselves: each refund's alert follows them. A sponsorship refund left on its way before Nov 21
has no tag: its alert says to check it in Stripe and resolve it manually.

### Refund tickets again and the 10-minute wait (since 22 Nov)
- **Refund again (tickets):** on the «Refund Stripe marked as failed» alert for tickets, **Refund again · $X** appears when the charge still has balance
  and there is no bank dispute. It refunds exactly what failed, to the same card, **only once** (two people at once = one refund). The tickets stay
  refunded. It asks for a reason, kept in the audit log under your name. Permission: the same as Refund.
- **If it goes through:** the person is notified and the alert closes by itself. **If Stripe says no:** it gets its own alert (you can try again from
  there) and the earlier one reopens under your name.
- **Resolve manually waits 10 minutes:** a refund cannot be marked as resolved by hand within 10 minutes of a send to Stripe (Stripe may not show it
  yet). Wait and try again.
- **A sponsorship refund that first got no answer and then failed** now reads «Refund Stripe marked as failed», with what the bank said and when.

| Case | What happens |
|---|---|
| Part was already refunded another way and the charge is not enough | «Refund again» is not offered; sort it out with the person. |
| Two team members ask at once | One refund; the other sees it is the same one. |
| The charge has a bank dispute | Not offered until the dispute is won. |
| Marking as manual a failed refund that was already refunded again | Not allowed: it is no longer pending. |

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
**Can I change a «Choose which counts» decision?** No: it is decided once and stays in the audit log (the database does not allow changing it). If the
refund did not arrive, that refund's alert shows up.
**How do I know which was first in «Choose which counts»?** Each option shows its **amount**, **when it went through** (day and time in the alert's
city time zone; if the alert has no city, Eastern time, like the rest of the Super Admin) and its full **Stripe id**, e.g. «$149.00 · Nov 20, 3:14 PM ·
pi_…». They come **in charge order: the first on top**. What Stripe has but cannot be chosen (**another amount**, **did not go through**, **still in
progress**, or a Pro period already charged) is not an option: it appears in the sheet's text, under «Can’t be chosen», with its amount, its date and
why. This is what **the last query** answered; when you decide, the server asks Stripe again and decides with that answer (if something changed, it tells
you and saves nothing). An alert from before Nov 21 (a query without that detail) shows only the ids, as before.
**What if the query always says «not in Stripe» for an old charge?** It is a charge sent before Nov 21, without its own tag: it is not taken as «never
arrived» by itself. Look it up in Stripe by business and date and note it with «I’ll take it».
