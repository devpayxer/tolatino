# Migración mala

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `migracion-mala`

## Cómo se nota
- La migración falla al desplegar (el despliegue se anota «fallo: las migraciones fallaron (<archivo>: <motivo>)») o los guardianes `migracionReversible`,
  `migracionContraeConMotivo` o `migracionConTope` rompen el CI antes.
- Motivo «una tabla siguió ocupada por la app (lock_timeout)»: una migración sobre una tabla grande chocó con escrituras largas (o con otra carga) y,
  con su tope de candados, falló en segundos sin aplicar nada en vez de dejar la app esperando detrás.

## Qué hace el sistema solo
- Cada archivo es una transacción: lo que falló no queda a medias; el código que sirve sigue funcionando porque toda migración es **expandir → contraer** (columnas y tablas nuevas primero; borrar o renombrar solo cuando ningún código vivo lo usa).
- Las migraciones terminan antes de arrancar la versión nueva: si una falla, no se arranca, ni se indexa, ni se recrea nada (sigue la anterior) y el despliegue se reintenta a los 15 min.
- Una tabla ocupada (`lock_timeout`): `migrar.sh` reintenta 3 veces, cada 20 s; si sigue ocupada, se detiene con ese motivo. Un `statement_timeout` no se reintenta.

## Qué hace Claude
- Una migración nunca se «deshace»: se escribe otra que corrige. Se prueba dos veces en una base local y en el sandbox antes del OK.
- Si fue `lock_timeout`: mirar qué escribía en esa tabla en ese momento (`pg_stat_activity`; un barrido o una carga larga). Lo normal es que el reintento de los 15 min entre; si vuelve a chocar, la migración se parte (por tandas) o se aplaza a una hora tranquila. Si fue `statement_timeout`: partirla, o subir el tope con su motivo (hasta 5 min).
- Si una migración ya aplicada dañó datos: `dato-borrado.md` (PITR a otra base y copiar lo puntual).

## Qué se le dice al fundador
- «La migración N falló al desplegar; no cambió nada para los vecinos. La corrección es la migración N+1.»

## Qué se les dice a los vecinos
- Nada.
