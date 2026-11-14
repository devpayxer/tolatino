# Abuso o ataque

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `abuso-o-ataque`

## Cómo se nota
- Picos de tráfico, de 5xx o de una sola IP; Cloudflare lo muestra; los límites de la app (rate_counters) rechazan de más.

## Qué hace el sistema solo
- El límite por IP de Cloudflare (acciones sin cuenta y /api/errores) y los de la app por persona y por teléfono.

## Qué hace Claude
- Cloudflare en «Under attack» por la API si hace falta; bloquear rangos; revisar qué se intentó en la auditoría y los registros.

## Qué se le dice al fundador
- «Hubo un intento de X; se bloqueó en Cloudflare; no se vio afectado …»

## Qué se les dice a los vecinos
- Nada, salvo que haya afectado sus datos.
