# SMS caído

_Manual interno de incidentes (9o; fase9-apertura.md §3.4). No es ayuda de El Compa: es para el equipo y para Claude. Cada caso: cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al fundador y a los vecinos. Lo que cada caso abre queda en `incident_log` (Super Admin › Sistema › Despliegues) con este archivo como `manual_ref`._

**Severidad:** alta · **caso:** `sms-caido`

## Cómo se nota
- Los códigos de entrada no llegan (Telnyx contesta error); sube «no me llegó el código» en Soporte.

## Qué hace el sistema solo
- Quien ya tiene llave de acceso entra con ella; los avisos van por push y correo; WhatsApp sigue si está aprobado.

## Qué hace Claude
- Confirmar con el estado de Telnyx; si dura, encender el respaldo por correo para el código (si el vecino tiene correo verificado).

## Qué se le dice al fundador
- «Los SMS no salieron N minutos; N personas no pudieron entrar.»

## Qué se les dice a los vecinos
- Anuncio en el Inicio si pasa de 30 minutos.
