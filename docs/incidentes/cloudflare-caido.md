# Cloudflare caído

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** critica · **caso:** `cloudflare-caido`

## Cómo se nota
- El segundo testigo falla desde fuera pero Prometheus (por la red privada) ve todo bien; la página de estado de Cloudflare.

## Qué hace el sistema solo
- Nada que hacer del lado del servidor: el firewall solo deja entrar a Cloudflare (a propósito).

## Qué hace Claude
- Esperar; NO abrir el firewall a todo internet (se perdería la protección). Si dura horas, decisión del fundador: DNS sin proxy temporal (Cloudflare «DNS only») con el firewall abierto, anotado y revertido al volver.

## Qué se le dice al fundador
- «Cloudflare (lo que protege la entrada) se cayó N minutos en todo el mundo; nosotros no podíamos hacer nada.»

## Qué se les dice a los vecinos
- Nada (no hay cómo llegarles).
