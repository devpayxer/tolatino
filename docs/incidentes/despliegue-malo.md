# Despliegue malo (vuelta atrás)

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `despliegue-malo`

## Cómo se nota
- La vigilancia de 10 minutos después de cambiar de versión ve pasar un umbral (Configuración › Despliegues): 5xx > 2 %, p95 > 1500 ms, 5 grupos de errores nuevos o 3 fallos seguidos de `/api/salud`.
- O la versión nueva no pasa la puerta de salud (3 respuestas buenas seguidas) y ni llega a servir.

## Qué hace el sistema solo
- **Vuelve sola** a la versión anterior (que siguió arrancada): nginx cambia de destino en segundos, se apaga la nueva, `deploy_releases` anota `vuelta_atras` con el motivo y lo medido, se abre el incidente y el barrido avisa al equipo (push y SMS).
- Si no pasó la puerta: «fallo», nada cambió para los vecinos.
- El reporte diario cuenta las vueltas atrás de ayer. Las apps de las tiendas no se pueden volver atrás: su lanzamiento por fases se pausa (9u).

## Qué hace Claude
- Ver el motivo en Sistema › Despliegues, reproducirlo en el sandbox, arreglarlo en un commit nuevo (nunca reescribir `produccion`) y pedir el OK otra vez.
- Cerrar el incidente con lo que se hizo.

## Qué se le dice al fundador
- «La versión de hoy volvió atrás sola a los N minutos (motivo). Los vecinos no vieron nada / vieron errores N minutos. El arreglo va en …»

## Qué se les dice a los vecinos
- Nada: la versión anterior siguió sirviendo.
