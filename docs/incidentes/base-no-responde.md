# La base no responde

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** critica · **caso:** `base-no-responde`

## Cómo se nota
- `BaseNoResponde` (postgres_exporter o la base sin contestar 2 min); `/api/salud` contesta 503 con `base.ok: false`.
- `RespaldoAtrasado` (más de 26 h sin un respaldo bueno) o `RestauracionDePrueba` (la de la semana falló o no corrió en 8 días): también llegan aquí.

## Qué hace el sistema solo
- La app contesta 503 en `/api/salud` y las páginas muestran su estado de error; nada se escribe a medias (cada operación es una transacción).
- Docker reinicia Postgres; el WAL que no se archivó se archiva al volver (pgBackRest asíncrono).

## Qué hace Claude
- Diagnóstico por Sistema › Salud (disco y memoria de la base) y el registro del despliegue. Si el disco de la base se perdió → `servidor-perdido.md` (rol base: el disco aparte se vuelve a montar; si no existe, PITR desde el almacén).
- Si la restauración de prueba falló: correr `restaurar-prueba.sh` en la réplica (la próxima corrida del temporizador o un commit con la orden en el ensayo) y no dar por bueno ningún respaldo hasta que una salga bien.

## Qué se le dice al fundador
- «La base estuvo sin contestar N minutos. No se perdió nada (respaldo continuo, pérdida máxima 5 minutos) / se perdieron N minutos de …»

## Qué se les dice a los vecinos
- La página de mantenimiento si dura; si se perdió algo de alguien, se le dice a esa persona (aviso propio).
