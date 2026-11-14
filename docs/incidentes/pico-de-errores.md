# Pico de errores

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `pico-de-errores`

## Cómo se nota
- `PicoDeErrores` (más de 20 grupos nuevos en una hora) o «Errores en vivo» (Sistema › Apps › Salud) avisa a los Admins.

## Qué hace el sistema solo
- Si coincide con un despliegue, la vigilancia vuelve atrás sola. Los errores llegan tapados (sin teléfonos, correos ni tarjetas) y agrupados.

## Qué hace Claude
- Ver el grupo, reproducir, arreglar en un commit; si es de una app de tienda, pausar su lanzamiento por fases (9u).

## Qué se le dice al fundador
- «Hubo un pico de errores en X (N personas lo vieron). Causa y arreglo: …»

## Qué se les dice a los vecinos
- Si afectó un cobro o un pedido, aviso a esas personas.
