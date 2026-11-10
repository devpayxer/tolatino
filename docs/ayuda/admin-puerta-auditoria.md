# Super Admin › Eventos y boletos › Modo puerta · Door mode audit

_Pantallas: **Super Admin › Eventos y boletos › Modo puerta** (`/admin/eventos/puerta`, y `?fecha=` para una puerta) y **Buscar boleto → la ficha
del boleto** (ESCANEOS EN LA PUERTA). Permiso: Eventos (ver). Solo las ciudades de tu equipo. Escritorio y teléfono. Versión: Fase 6 · bloque 6g
(10 nov 2026)._

## Qué hace
- **Solo lectura**, para revisar un «me cobraron y no entré» o un problema en la puerta. Nadie vende en la puerta.
- **AHORA**: las puertas del día (2 horas antes de las puertas hasta 2 horas después del final) con adentro, faltan, rechazados, repetidos y
  cuántas puertas abiertas. **ÚLTIMOS 7 DÍAS**: las fechas que tuvieron escaneos. «Ninguna puerta abierta ahora» si no hay.
- **Una fecha**: **ADENTRO · FALTAN · RECHAZADOS · REPETIDOS** (repetidos = ya habían entrado), **POR PUERTA**, **SESIONES DE PORTERO** (quién, en
  qué puerta, desde qué hora, cuántos dejó entrar y cuántos rechazó; los del equipo del negocio dicen «equipo del negocio»), **ÚLTIMOS EN LA
  PUERTA** (resultado, puerta y hora) e **INCIDENCIAS**. Se pone al día cada 10 segundos.
- **La ficha de un boleto** suma **ESCANEOS EN LA PUERTA**: cada vez que pasó por la puerta, con el resultado (VÁLIDO, YA ENTRÓ, QR ANULADO…), la
  puerta, quién lo escaneó, la fecha y la hora, y si entró **a mano** con su motivo. Sirve de evidencia en una disputa.
- Ningún dato de la puerta trae teléfonos completos ni montos.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Un cliente dice que pagó y no lo dejaron entrar | Busca el boleto: en ESCANEOS ves si se escaneó, con qué resultado, en qué puerta y quién. Sin escaneos, nunca llegó a la puerta. |
| Un boleto aparece YA ENTRÓ dos veces | El primero entró; los demás fueron intentos con el mismo QR (fotos o capturas). Revisa las puertas y las horas. |
| Una entrada «a mano» | Dice el motivo (no trajo el QR, el QR no se lee…) y el portero que la marcó. |
| La fecha es de una ciudad que no es tuya | No sale. |
| Un boleto entró dos veces sin señal | En ESCANEOS: VÁLIDO en una puerta y REPETIDO · SIN CONEXIÓN en la otra; gana el primero por la hora (corregida). |

## Preguntas frecuentes
- **¿Puedo marcar una entrada desde aquí?** No: es solo lectura. La puerta la marca el portero o el negocio.
- **¿Cuánto se guardan los escaneos?** Quedan en la auditoría (solo inserción, no se borran ni se cambian).
- **¿Y las entradas sin conexión?** Salen marcadas **SIN CONEXIÓN**, con la hora del teléfono corregida, cuándo llegaron y si el reloj estaba
  desviado. Si dos puertas dejaron entrar el mismo boleto sin señal, una queda **REPETIDO** («decidido otra vez al subir otra puerta») y hay una
  incidencia. Las sesiones de portero dicen cuántos escaneos subieron sin conexión y si el teléfono se revocó.

---

## What it does (English)
Read-only door audit for disputes (“I paid and was not let in”). **NOW**: today’s doors with inside, to come, rejected, repeated and open doors;
**LAST 7 DAYS**: dates with scans. One date: **INSIDE · TO COME · REJECTED · REPEATED**, **BY DOOR**, **DOOR STAFF SESSIONS**, **LATEST AT THE DOOR**
and **INCIDENTS**, refreshed every 10 seconds. A ticket’s page adds **DOOR SCANS**: every scan with result, door, who scanned it, date and time,
and manual entries with their reason. No full phones or amounts anywhere. Limited to your team’s cities.

**Offline entries (6h):** they show **OFFLINE**, with the phone time corrected, when they arrived and whether the clock was off. If two doors let the same ticket in offline, one shows **REPEATED** (re-decided when the other door uploaded) and there is an incident. Door sessions show how many scans came in offline and whether the phone was revoked.
