# Super Admin · Gamification (rangos, puntos y Tabla del Barrio) · Super Admin · Gamification (ranks, points and Neighborhood Table)

_Pantallas: **Super Admin › Gamification** (`/admin/gamificacion`: pestañas Rangos · Puntos · Tabla del Barrio) y **Usuarios › 360° ›
Comunidad › Puntos y rango**. Teléfono y escritorio. Versión: Fase 5 · bloque 5f (7 nov 2026). Permiso: Gamification (ver/editar; hoy solo
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
    **4** el reporte de canjes de cupones del mes (todavía 0: los cupones llegan con el bloque 5g). **No se puede deshacer.** Si nadie lo
    cierra, el barrido lo cierra solo el día 3 de la ciudad.
- **Usuarios 360° › Comunidad › Puntos y rango:** rango actual, puntos (total, este mes, hoy), lo que pide el siguiente, la regla del
  tope, el piso del rango y los últimos movimientos (con quién del equipo y el motivo en los ajustes).
  - **Ajustar puntos** (Sumar / Restar, cantidad, motivo): Admin hasta **5,000** de una vez; otros roles que editan Usuarios, hasta
    **500**. Nunca deja los puntos en negativo; nadie ajusta los suyos. La persona recibe el aviso con la cantidad y el motivo.
  - **Cambiar rango** (solo Admin): dar **Coronel (9)** a quien modera con buen criterio, o bajar el piso por fraude. Con motivo y aviso.
    General del Barrio no se da a mano: sale del cierre de la Tabla.

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
| Ajuste mayor al tope de tu rol | «Tu rol ajusta hasta 500 (o 5,000) puntos de una vez.» |

## Preguntas frecuentes
- **¿Se pueden borrar puntos?** No. El libro de puntos es de solo inserción: todo cambio es un asiento nuevo (inverso o ajuste) con su motivo.
- **¿Las monedas y los cupones?** Llegan con el bloque 5g (Monedas · Cupones). El Patio, después de la apertura. «Rango del negocio» no se
  construye todavía.
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

## FAQ (English)
- **Can points be deleted?** No. The points ledger is insert-only: every change is a new entry (reversal or adjustment) with its reason.
- **Coins and coupons?** Next block (5g). El Patio after launch. Business rank is not built yet.
