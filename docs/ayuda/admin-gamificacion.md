# Super Admin · Gamification (rangos, puntos, monedas, cupones y Tabla del Barrio) · Super Admin · Gamification (ranks, points, coins, coupons and Neighborhood Table)

_Pantallas: **Super Admin › Gamification** (`/admin/gamificacion`: pestañas Rangos · Puntos · Monedas · Cupones · Tabla del Barrio) y
**Usuarios › 360° › Comunidad › Puntos y rango · Monedas**. Teléfono y escritorio. Versión: Fase 5 · bloques 5f y 5g (7 nov 2026). Permiso: Gamification (ver/editar; hoy solo
el rol Admin); «Cerrar el mes» y «Cambiar rango», solo Admin; ajustar puntos, quien edita Usuarios (con tope por rol)._

## Qué hace
- **Rangos:** los 10, con lo que piden, sus puntos mínimos, lo que desbloquean (lo de El Patio dice «Cuando abra El Patio») y cuántos
  vecinos hay en cada uno (en tus ciudades). **«Cambiar nombre»**: español e inglés con **vista previa** (así se ve la pastilla del rango);
  pide motivo, queda en la auditoría y la Comunidad lo muestra al instante. Lo que piden y los puntos mínimos no se cambian aquí.
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

- **Monedas (5g):** **EN CIRCULACIÓN** (la suma de los saldos de tus ciudades) · **EMITIDAS ESTE MES** (bienvenida, premios y ajustes +) ·
  **CANJEADAS** (monedas y códigos de cupones del mes, y las devueltas por códigos vencidos) · **VALOR «Sin valor en dinero»** (no se compran
  ni se cambian). Las reglas de ganancia (**Bienvenida, una vez** +100 y **premio del mes** +200) con su valor (0–1,000) y su interruptor:
  con motivo, cuenta desde ahora. Los últimos 20 movimientos (tocar uno abre el 360° de la persona).
- **Cupones (5g):** por ciudad y estado (**Por aprobar · En la Comunidad · Pausados · Terminados**), con su negocio, cupo del mes, días,
  canjes del mes, usados y códigos vivos. **Aprobar** con el costo (80–1,000 monedas; el negocio recibe el aviso con el costo) ·
  **Rechazar** con motivo · **Cambiar costo** (cuenta para los canjes de aquí en adelante) · **Pausar** con motivo (sale de la Comunidad al
  instante, los códigos ya canjeados siguen valiendo, el negocio recibe el aviso) · **Activar** lo que pausó el equipo. **Últimos canjes**
  de la ciudad (código, cupón, negocio, vecino, EMITIDO · USADO · VENCIÓ · DEVUELTO). Aprobar y rechazar piden «aprobar» en Gamification.
- **Usuarios 360° › Comunidad › Monedas:** saldo, códigos vivos, VALOR «Sin valor en dinero» y los últimos movimientos. **Ajustar
  monedas** (Sumar / Restar, cantidad, motivo): Admin hasta **1,000** de una vez, otros roles que editan Usuarios hasta **500**. Nunca deja
  el saldo en negativo; nadie ajusta las suyas; la persona recibe el aviso con la cantidad y el motivo.

## Configuración (5i, 8 nov)
- El **tope de puntos del día** es un valor de **Sistema › Configuración** (10–1,000; de fábrica 100). Aquí se elige entre 50 · 100 · 150 ·
  200; allá, cualquier entero dentro de sus límites. Es el mismo valor y la misma auditoría (antes → después). Settings (EN): the daily
  points cap is a Settings value; both screens write the same value with the same audit.
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

---

## What it does (English)
- **Ranks:** the 10 ranks with requirements, minimum points, unlocks (El Patio ones say «When El Patio opens») and how many neighbors hold
  each. **Rename** in Spanish and English with a **preview**; asks for a reason, is audited and shows in Community instantly.
- **Points:** the **daily cap** per person (50 · 100 · 150 · 200; default 100) and each rule’s value (0–100) and switch. Applies from now on.
- **Neighborhood Table:** per city and month (current or previous) with **PRIZE**, **NEIGHBORHOOD GENERAL** and **EXCLUDED** marks.
  **Exclude / Include again** with a reason (the person is notified). **Close the month** (Admin only, frozen previous month): 1 table fixed
  · 2 excluded get no prize · 3 top 3 notified (badge; those already Commander take the General seats) · 4 coupon redemption report (0
  until coupons ship in 5g). Cannot be undone; the sweep closes it on day 3 if nobody does.
- **User 360° › Community › Points and rank:** current rank, points, next requirement, rank floor and recent entries. **Adjust points**
  (Add / Subtract, amount, reason): Admin up to 5,000 at once, other roles that edit Users up to 500; never below zero; the person is
  notified. **Change rank** (Admin only): grant **Colonel (9)** or lower the floor for fraud, with a reason.
- **Coins (5g):** IN CIRCULATION · ISSUED THIS MONTH · REDEEMED · VALUE «No cash value»; earning rules (welcome +100, monthly prize +200)
  with value and switch; last movements. **User 360° › Community › Coins:** balance and **Adjust coins** (Admin up to 1,000, others 500;
  never below zero; the person is notified).
- **Coupons (5g):** by city and status; **Approve** with the cost (80–1,000 coins; the business is notified), **Reject**, **Change cost**,
  **Pause** with a reason (business notified; redeemed codes stay valid), **Activate**; last redemptions.

## FAQ (English)
- **Can points be deleted?** No. The points ledger is insert-only: every change is a new entry (reversal or adjustment) with its reason.
- **Do coins have cash value?** No: never bought, sold, transferred or cashed out, and they don’t expire. **Does To’Latino pay businesses
  for redemptions?** No; the month close only reports them. El Patio after launch. Business rank is not built yet.
