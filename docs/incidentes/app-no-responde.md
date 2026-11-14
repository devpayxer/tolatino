# La app no responde

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** critica · **caso:** `app-no-responde`

## Cómo se nota
- Prometheus (blackbox, desde la réplica) ve `/api/salud` sin `"ok":true` 2 minutos → alerta **AppNoResponde** (crítica).
- El segundo testigo de GitHub Actions (cada 10 min, desde fuera) falla y GitHub manda el correo de la corrida roja.
- `BarridoCallado`: el barrido no corre hace más de 10 min (`tolatino_barrido_segundos`); `ColaDelPush`: un aviso espera más de 15 min; `ReporteDiarioNoCorre`.

## Qué hace el sistema solo
- nginx sirve la **página de mantenimiento** («Estamos haciendo un cambio. Volvemos en unos minutos.») en vez de un error crudo (502/504).
- Docker reinicia el contenedor caído (`restart: unless-stopped`). Si fue un despliegue, la vigilancia de 10 minutos vuelve atrás sola (ver `despliegue-malo.md`).
- Alertmanager manda el correo directo (sale aunque la app esté caída) e intenta avisar por la app (push y SMS al equipo).

## Qué hace Claude
- Mira `/estado/` (último despliegue, últimas líneas) y Sistema › Salud (máquinas: CPU, memoria, disco). `/api/salud` dice si la base contesta.
- Si la base no contesta → `base-no-responde.md`. Si el disco está lleno → `disco-lleno.md`. Si la máquina no contesta ni por la red privada → `servidor-perdido.md`.
- Si es el código: un commit que lo arregla por el camino de siempre (sandbox → OK → producción); nunca se toca el servidor a mano.

## Qué se le dice al fundador
- «La app estuvo caída de HH:MM a HH:MM (N minutos). Causa: … Ya volvió; esto es lo que cambia para que no se repita: …»

## Qué se les dice a los vecinos
- La página de mantenimiento mientras dura. Si pasa de 30 minutos, un anuncio en el Inicio al volver (Textos y páginas › Anuncios).
