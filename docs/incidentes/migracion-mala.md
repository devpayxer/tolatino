# Migración mala

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `migracion-mala`

## Cómo se nota
- La migración falla al desplegar (el despliegue se anota «fallo: las migraciones fallaron») o el guardián `migracionReversible` rompe el CI antes.

## Qué hace el sistema solo
- Cada archivo es una transacción: lo que falló no queda a medias; el código que sirve sigue funcionando porque toda migración es **expandir → contraer** (columnas y tablas nuevas primero; borrar o renombrar solo cuando ningún código vivo lo usa).

## Qué hace Claude
- Una migración nunca se «deshace»: se escribe otra que corrige. Se prueba dos veces en una base local y en el sandbox antes del OK.
- Si una migración ya aplicada dañó datos: `dato-borrado.md` (PITR a otra base y copiar lo puntual).

## Qué se le dice al fundador
- «La migración N falló al desplegar; no cambió nada para los vecinos. La corrección es la migración N+1.»

## Qué se les dice a los vecinos
- Nada.
