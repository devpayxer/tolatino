# Super Admin › Eventos y boletos › Modo puerta · Door mode audit

_Pantallas: **Super Admin › Eventos y boletos › Modo puerta** (`/admin/eventos/puerta`, y `?fecha=` para una puerta) y **Buscar boleto → la ficha del
boleto** (ESCANEOS EN LA PUERTA). Permiso: Eventos (ver). Solo las ciudades de tu equipo. Escritorio y teléfono. Versión: 10 nov 2026. Audiencia:
equipo. Tema: equipo._

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

## English

### What it does
- **Read-only**, to review an «I was charged and did not get in» or a problem at the door. Nobody sells at the door.
- **NOW**: today's doors (from 2 hours before doors open until 2 hours after the end) with inside, to come, rejected, repeated and how many doors
  are open. **LAST 7 DAYS**: the dates that had scans. «No door open now» if there are none.
- **One date**: **INSIDE · TO COME · REJECTED · REPEATED** (repeated = had already come in), **BY DOOR**, **DOOR STAFF SESSIONS** (who, at which
  door, since what time, how many they let in and how many they rejected; the business team's say «business team»), **LATEST AT THE DOOR**
  (result, door and time) and **INCIDENTS**. It refreshes every 10 seconds.
- **A ticket's page** adds **DOOR SCANS**: every time it went through the door, with the result (VALID, ALREADY IN, QR VOIDED…), the door, who
  scanned it, the date and time, and whether it came in **by hand** with its reason. It serves as evidence in a dispute.
- No door data carries full phone numbers or amounts.

### What happens in each case
| Case | What happens |
|---|---|
| A customer says they paid and were not let in | Look up the ticket: in SCANS you see whether it was scanned, with what result, at which door and by whom. With no scans, it never reached the door. |
| A ticket shows ALREADY IN twice | The first one got in; the others were attempts with the same QR (photos or screenshots). Check the doors and the times. |
| An entry «by hand» | It shows the reason (did not bring the QR, the QR does not read…) and the door staff member who marked it. |
| The date is in a city that is not yours | It does not show. |
| A ticket got in twice with no signal | In SCANS: VALID at one door and REPEATED · OFFLINE at the other; the first one wins by time (corrected). |

### FAQ
- **Can I mark an entry from here?** No: it is read-only. The door staff member or the business marks it at the door.
- **How long are scans kept?** They stay in the audit (insert-only, never deleted or changed).
- **What about offline entries?** They show marked **OFFLINE**, with the phone's corrected time, when they arrived and whether the clock was off.
  If two doors let the same ticket in without signal, one stays **REPEATED** («decided again when another door uploaded») and there is an
  incident. Door staff sessions show how many scans were uploaded offline and whether the phone was revoked.
