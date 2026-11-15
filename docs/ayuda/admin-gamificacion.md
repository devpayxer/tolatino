# Super Admin: Gamification (rangos, puntos, monedas, cupones y Tabla del Barrio) · Super Admin: Gamification (ranks, points, coins, coupons and Neighborhood Table)

_Pantallas: **Super Admin › Gamification** (`/admin/gamificacion`: pestañas Rangos · Puntos · Monedas · Cupones · Tabla del Barrio) y **Usuarios ›
360° › Comunidad › Puntos y rango · Monedas**. Teléfono y escritorio. Permiso: Gamification (ver/editar; hoy solo el rol Admin); «Cerrar el mes» y
«Cambiar rango», solo Admin; ajustar puntos, quien edita Usuarios (con tope por rol). Versión: 13 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Rangos:** los 10, con lo que piden, sus puntos mínimos, lo que desbloquean (lo de El Patio dice «Cuando abra El Patio») y cuántos
  vecinos hay en cada uno (en tus ciudades; esa cuenta se pone al día cada 10 minutos). **«Cambiar nombre»**: español e inglés con **vista previa** (así se ve la pastilla del rango);
  pide motivo, queda en la auditoría y la Comunidad lo muestra al instante. **«Cambiar lo que pide»** (Vecino a Comandante): los puntos
  mínimos y el número de su condición (y, en Comandante, los días sin sanciones), con **vista previa** «Antes / Ahora» en los dos idiomas.
  Los puntos mínimos quedan entre los del rango de abajo y los del de arriba. El texto «Para subir» se reescribe solo con el número nuevo.
  Cuenta desde ahora: el rango solo sube, así que quien ya lo tiene lo conserva. Recluta, Coronel (lo da el equipo) y General (3 plazas)
  no se cambian aquí.
- **Puntos:** el **tope del día** por persona (50 · 100 · 150 · 200; de fábrica 100) y cada regla con su valor (0–100) y su interruptor.
  Cuenta desde ahora; lo ya ganado no cambia. Las 4 reglas fijas se muestran como texto.
- **Tabla del Barrio:** por ciudad y mes (en curso o anterior), con puntos, lo que vino de recomendar y de responder, y las marcas
  **PREMIO** (3 primeros), **GENERAL DEL BARRIO** y **EXCLUIDO**.
  - **Excluir / Volver a incluir** (mes abierto): con motivo; la persona recibe «No sales en la Tabla de este mes: {motivo}». No cambia sus
    puntos ni su rango.
  - **Cerrar el mes** (solo Admin, mes anterior congelado): **1** la tabla queda fija con sus posiciones · **2** los excluidos no reciben
    premio · **3** se avisa a los 3 primeros (insignia «Top del mes»; quienes ya son Comandante toman las plazas de General del Barrio) ·
    **4** el reporte de canjes de cupones del mes en la ciudad (un reporte: no se le paga ni se le cobra nada al negocio). Los 3 primeros
    reciben además las monedas del premio del mes (regla «premio del mes», 200 de fábrica), una sola vez. **No se puede deshacer.** Si nadie lo
    cierra, el barrido lo cierra solo el día 3 de la ciudad.
- **Usuarios 360° › Comunidad › Puntos y rango:** rango actual, puntos (total, este mes, hoy), lo que pide el siguiente, la regla del
  tope, el piso del rango y los últimos movimientos (con quién del equipo y el motivo en los ajustes).
  - **Ajustar puntos** (Sumar / Restar, cantidad, motivo): Admin hasta **5,000** de una vez; otros roles que editan Usuarios, hasta
    **500**. Nunca deja los puntos en negativo; nadie ajusta los suyos. La persona recibe el aviso con la cantidad y el motivo.
  - **Cambiar rango** (solo Admin): dar **Coronel (9)** a quien modera con buen criterio, o bajar el piso por fraude. Con motivo y aviso.
    General del Barrio no se da a mano: sale del cierre de la Tabla.

- **Monedas:** **EN CIRCULACIÓN** (la suma de los saldos de tus ciudades) · **EMITIDAS ESTE MES** (bienvenida, premios y ajustes +) ·
  **CANJEADAS** (monedas y códigos de cupones del mes, y las devueltas por códigos vencidos) · **VALOR «Sin valor en dinero»** (no se compran
  ni se cambian). Las reglas de ganancia (**Bienvenida, una vez** +100 y **premio del mes** +200) con su valor (0–1,000) y su interruptor:
  con motivo, cuenta desde ahora. Los últimos 20 movimientos (tocar uno abre el 360° de la persona).
- **Cupones:** por ciudad y estado (**Por aprobar · En la Comunidad · Pausados · Terminados**), con su negocio, cupo del mes, días,
  canjes del mes, usados y códigos vivos. **Aprobar** con el costo (80–1,000 monedas; el negocio recibe el aviso con el costo) ·
  **Rechazar** con motivo · **Cambiar costo** (cuenta para los canjes de aquí en adelante) · **Pausar** con motivo (sale de la Comunidad al
  instante, los códigos ya canjeados siguen valiendo, el negocio recibe el aviso) · **Activar** lo que pausó el equipo. **Últimos canjes**
  de la ciudad (código, cupón, negocio, vecino, EMITIDO · USADO · VENCIÓ · DEVUELTO). Aprobar y rechazar piden «aprobar» en Gamification.
- **Usuarios 360° › Comunidad › Monedas:** saldo, códigos vivos, VALOR «Sin valor en dinero» y los últimos movimientos. **Ajustar
  monedas** (Sumar / Restar, cantidad, motivo): Admin hasta **1,000** de una vez, otros roles que editan Usuarios hasta **500**. Nunca deja
  el saldo en negativo; nadie ajusta las suyas; la persona recibe el aviso con la cantidad y el motivo.

## Configuración
- El **tope de puntos del día** es un valor de **Sistema › Configuración** (10–1,000; de fábrica 100). Aquí se elige entre 50 · 100 · 150 ·
  200; allá, cualquier entero dentro de sus límites. Es el mismo valor y la misma auditoría (antes → después).
- La subpestaña **El Patio** no se construye (decisión G): los desbloqueos de El Patio dicen «Cuando abra El Patio». El rango del negocio
  tampoco (LAUNCH-CHECKLIST).

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Renombras un rango | Se ve en la pastilla, el perfil, los comentarios (desde Sargento), las reseñas y la Tabla. Queda «EDITADO» y en la auditoría. |
| Apagas una regla | No da puntos desde ahora. Lo ya ganado sigue. |
| Bajas el tope del día | Cuenta desde ahora; lo de hoy que ya pasó del nuevo tope no se quita. |
| Excluyes a alguien y luego lo incluyes | Vuelve a la tabla; las dos decisiones quedan en la auditoría. |
| Intentas cerrar el mes en curso | No se puede: se congela el último día a medianoche. |
| Intentas cerrar un mes ya cerrado | «Ese mes ya se cerró.» Un mes cerrado no cambia. |
| El mismo vecino gana con votos de cuentas de su mismo teléfono | Esos votos no dan puntos (la base lo impide); Confianza › Fraude muestra la posible red. Excluye o ajusta con motivo si hizo falta. |
| Ajuste mayor al tope de tu rol | «Tu rol ajusta hasta 500 (o 5,000) puntos de una vez.» (monedas: 500 o 1,000) |
| Restar más monedas de las que tiene | «El ajuste deja las monedas en negativo.» No se aplica. |
| Aprobar con un costo fuera de 80–1,000 | «El costo va de 80 a 1,000 monedas.» |
| Pausas un cupón con códigos vivos | Los códigos siguen valiendo hasta que vencen; si vencen sin usarse, las monedas vuelven al vecino. |
| Cambias el premio del mes o lo apagas | Cuenta para el próximo cierre; lo ya acreditado no cambia. |

## Preguntas frecuentes
- **¿Se pueden borrar puntos?** No. El libro de puntos es de solo inserción: todo cambio es un asiento nuevo (inverso o ajuste) con su motivo.
- **¿Las monedas valen dinero?** No. No se compran, no se venden, no se transfieren, no se cambian por dinero y no vencen; viven en su
  propio libro (solo inserción), separado del de puntos.
- **¿To'Latino le paga al negocio por los canjes?** No. «Liquidar» al cerrar el mes es un reporte de canjes; ningún pago en ningún sentido.
- **¿Se puede borrar un cupón o un canje?** No: un cupón se termina (estado) y un código pasa a usado o vencido, nunca se borra.
- El Patio, después de la apertura. «Rango del negocio» no se construye todavía.
- **¿Por qué Altagracia (Coronel) no es General si quedó primera?** El Coronel lo da el equipo para moderar; las plazas de General son de
  los 3 primeros que ya son Comandante (decisión anotada en REVISION; se puede cambiar).

## English

### What it does
- **Ranks:** the 10 ranks with what they require, their minimum points, what they unlock (the El Patio ones say «When El Patio opens») and how
  many neighbors are in each (in your cities; that count refreshes every 10 minutes). **«Rename»**: Spanish and English with a **preview**
  (this is how the rank pill looks); it asks for a reason, goes into the audit trail and the Community shows it instantly. **«Change
  requirements»** (Neighbor to Commander): the minimum points and the number in its condition (and, for Commander, the days without sanctions),
  with a «Before / Now» **preview** in both languages. The minimum points stay between those of the rank below and the rank above. The «To rank
  up» text rewrites itself with the new number. It counts from now on: a rank only goes up, so whoever already has it keeps it. Recruit,
  Colonel (given by the team) and General (3 seats) are not changed here.
- **Points:** the **daily cap** per person (50 · 100 · 150 · 200; default 100) and each rule with its value (0–100) and its switch. It counts
  from now on; what was already earned does not change. The 4 fixed rules are shown as text.
- **Neighborhood Board:** by city and month (current or previous), with points, what came from recommending and from answering, and the
  marks **PRIZE** (top 3), **NEIGHBORHOOD GENERAL** and **EXCLUDED**.
  - **Exclude / Include again** (open month): with a reason; the person gets «You are not on this month's Board: {reason}». It does not
    change their points or their rank.
  - **Close the month** (Admin only, previous month frozen): **1** the board is fixed with its positions · **2** excluded people get no
    prize · **3** the top 3 are notified («Top of the month» badge; those who are already Commander take the Neighborhood General seats) ·
    **4** the month's coupon redemption report for the city (a report: nothing is paid to or charged to the business). The top 3 also
    receive the month's prize coins (the «monthly prize» rule, 200 by default), once. **It cannot be undone.** If nobody closes it, the sweep
    closes it by itself on day 3 of the city.
- **Users 360° › Community › Points and rank:** current rank, points (total, this month, today), what the next rank requires, the cap rule,
  the rank floor and the latest movements (with who on the team and the reason for adjustments).
  - **Adjust points** (Add / Subtract, amount, reason): an Admin up to **5,000** at once; other roles that edit Users, up to **500**. It never
    leaves points negative; nobody adjusts their own. The person gets the notice with the amount and the reason.
  - **Change rank** (Admin only): give **Colonel (9)** to someone who moderates with good judgment, or lower the floor for fraud. With a
    reason and a notice. Neighborhood General is not given by hand: it comes from the Board close.

- **Coins:** **IN CIRCULATION** (the sum of the balances in your cities) · **ISSUED THIS MONTH** (welcome, prizes and + adjustments) ·
  **REDEEMED** (coins and coupon codes of the month, and those returned for expired codes) · **VALUE «No cash value»** (they are not bought or
  exchanged). The earning rules (**Welcome, once** +100 and **monthly prize** +200) with their value (0–1,000) and their switch: with a
  reason, they count from now on. The latest 20 movements (tapping one opens that person's 360°).
- **Coupons:** by city and status (**To approve · In the Community · Paused · Ended**), with their business, monthly allowance, days,
  redemptions this month, used and live codes. **Approve** with the cost (80–1,000 coins; the business gets the notice with the cost) ·
  **Reject** with a reason · **Change cost** (it counts for redemptions from then on) · **Pause** with a reason (it leaves the Community
  instantly, codes already redeemed stay valid, the business gets the notice) · **Activate** what the team paused. **Latest redemptions** in
  the city (code, coupon, business, neighbor, ISSUED · USED · EXPIRED · RETURNED). Approving and rejecting require «approve» in Gamification.
- **Users 360° › Community › Coins:** balance, live codes, VALUE «No cash value» and the latest movements. **Adjust coins** (Add / Subtract,
  amount, reason): an Admin up to **1,000** at once, other roles that edit Users up to **500**. It never leaves the balance negative; nobody
  adjusts their own; the person gets the notice with the amount and the reason.

### Settings
- The **daily points cap** is a value in **System › Settings** (10–1,000; default 100). Here you choose among 50 · 100 · 150 · 200; there,
  any whole number within its limits. It is the same value and the same audit trail (before → after).
- The **El Patio** sub-tab is not built (decision G): the El Patio unlocks say «When El Patio opens». The business rank is not built either
  (LAUNCH-CHECKLIST).

### What happens in each case
| Case | What happens |
|---|---|
| You rename a rank | It shows in the pill, the profile, comments (from Sergeant up), reviews and the Board. It is marked «EDITED» and goes into the audit trail. |
| You turn a rule off | It gives no points from now on. What was already earned stays. |
| You lower the daily cap | It counts from now on; today's points already past the new cap are not taken away. |
| You exclude someone and then include them | They go back on the board; both decisions stay in the audit trail. |
| You try to close the current month | It cannot be done: the last day is frozen at midnight. |
| You try to close a month that is already closed | «That month is already closed.» A closed month does not change. |
| The same neighbor wins with votes from accounts on their own phone | Those votes give no points (the database prevents it); Trust & safety › Fraud shows the possible network. Exclude or adjust with a reason if needed. |
| Adjustment above your role's cap | «Your role adjusts up to 500 (or 5,000) points at once.» (coins: 500 or 1,000) |
| Subtracting more coins than the person has | «The adjustment leaves the coins negative.» It is not applied. |
| Approving with a cost outside 80–1,000 | «The cost goes from 80 to 1,000 coins.» |
| You pause a coupon with live codes | The codes stay valid until they expire; if they expire unused, the coins go back to the neighbor. |
| You change the monthly prize or turn it off | It counts for the next close; what was already credited does not change. |

### FAQ
- **Can points be deleted?** No. The points ledger is insert-only: every change is a new entry (a reversal or an adjustment) with its reason.
- **Are coins worth money?** No. They are not bought, not sold, not transferred, not exchanged for money and they do not expire; they live
  in their own ledger (insert-only), separate from the points ledger.
- **Does To'Latino pay the business for redemptions?** No. «Settle» at month close is a redemption report; no payment in either direction.
- **Can a coupon or a redemption be deleted?** No: a coupon is ended (status) and a code becomes used or expired, never deleted.
- El Patio comes after the opening. «Business rank» is not built yet.
- **Why isn't Altagracia (Colonel) a General if she finished first?** The Colonel is given by the team to moderate; the General seats go to
  the top 3 who are already Commander (decision noted in REVISION; it can be changed).
