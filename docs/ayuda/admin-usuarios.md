# Super Admin: Usuarios · Super Admin: Users

_Pantallas: ADM-USR (`/admin/usuarios` y `/admin/usuarios/{id}`), teléfono y escritorio. Para el equipo de To'Latino (y El Compa como copiloto del
equipo). Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Lista:** todas las cuentas de tus ciudades (Mi ciudad de la persona; una cuenta sin ciudad solo la ve quien
  trabaja todas). Buscar por nombre, teléfono, correo o id; QUIÉN (dueños de negocio, solo clientes), ESTADO (activo,
  advertido, silenciado, suspendido, baneado, borrado), «Más filtros» (nuevos 30 d, activos 7 d, sin entrar 30 d+,
  varios dispositivos, sin correo) y ORDENAR (última vez, más nuevos). 14 por página.
- **360°** con cuatro pestañas:
  - **Resumen:** teléfono y si está verificado, correo, ciudad, rol, desde cuándo, última vez, dispositivos (en rojo si
    comparte dispositivo con otra cuenta), notas internas, sus negocios y las acciones.
  - **Seguridad:** dispositivos y sesiones (cerrar una, cerrar todas, bloquear o desbloquear un dispositivo), otras
    cuentas que entraron desde el mismo dispositivo, verificación del teléfono (restablecer), cambios de teléfono, y su
    ciudad con el historial y «Cambiar ciudad».
    **Llaves de acceso** (Face ID / huella): cada llave con su dispositivo y la app donde nació, cuándo se agregó, la última vez, cuántas
    entradas y si está sincronizada; las quitadas dicen quién (la persona, el equipo o el sistema) y por qué. **Revocar** pide motivo, le avisa
    a la persona por texto y en la app, y queda en la auditoría. En Verificación salen los cambios de llaves.
    Cada dispositivo dice desde dónde entró: «Web» o la app, su versión y el sistema (por ejemplo «To'Latino Puerta 1.0.0 (12) · iOS 17.5»). Es solo informativo: la app nunca cambia lo que la persona puede hacer.
  - **Confianza:** su estado, cada sanción (vigente, terminó o levantada, con su motivo y quién) y las fotos que reportó.
  - **Privacidad:** exportar sus datos (archivo JSON, para un pedido de privacidad).
  - **Comunidad:** rango, publicaciones y comentarios, votos recibidos, mejores respuestas; seguidores, siguiendo, a quién
    bloqueó y silenció (listas de 50, con «MISMO DISPOSITIVO» en rojo); cuántas conversaciones privadas tiene (**nunca su
    contenido**: solo se lee con un reporte abierto en Colas › Mensajes reportados); su declaración de 18 años o más (sí/no y
    cuándo; nunca una fecha de nacimiento) y su bienvenida. Aviso de **posible red**: seguidores que entraron desde el mismo
    dispositivo que esta cuenta (el caso de red de cuentas se abre desde Colas › Reportes de usuario).
  - Abajo, el historial: quién del equipo hizo qué, antes → después y el motivo.

### Usuarios 360° › Comunidad completo
- **Arriba:** rango, puntos (y del mes), monedas (sin valor en dinero), votos recibidos (+ / −, mejores respuestas), publicaciones y
  comentarios, seguidores y siguiendo, a cuántos bloqueó y silenció, conversaciones privadas (nunca su contenido), 18+ y bienvenida.
- **Posible red:** si un seguidor entró desde el mismo dispositivo que esta cuenta, el aviso trae **«Abrir caso de red de cuentas»**: con
  motivo, abre (o reúsa) el caso en **Colas › Reportes de usuario** con la marca «posible red»; lo decide una persona con la escalera de
  sanciones. Queda en la auditoría.
- **Sub-pestañas:** **Publicaciones** (con su estado y reportes; toca para ver el hilo; «Ver todo en Contenido») · **Comentarios** (abre el
  hilo con el comentario marcado) · **Seguidores y siguiendo** (y bloqueados / silenciados; MISMO DISPOSITIVO) · **Puntos y monedas**
  (movimientos y ajustes con tope por rol) · **Cupones y referidos** (cupones canjeados con su estado y el código tapado; su código de
  invitación, a cuántos invitó y quién la invitó; sin dinero). Sin El Patio (decisión G).
- **Lista de Usuarios › Más filtros:** **Con reportes** (a la persona o a lo que escribió en la Comunidad) y **Rango en la Comunidad**
  (4, 7 o 9 o más).

## Acciones y lo que ve la persona
| Acción | Permiso | Qué pasa |
|---|---|---|
| Nota interna | usr · editar | Solo la ve el equipo. No se borra. |
| Advertencia | usr · retirar | Sin restricción. La ve en Mi cuenta con el motivo hasta que alguien la levante. |
| Silencio 7 días / Bloquear publicación 30 días | usr · retirar | No puede mandar recomendaciones (ni publicar en Comunidad cuando abra). Lo ve en Mi cuenta y al intentar recomendar, con la fecha y el motivo. Se levanta sola. |
| Suspender 14 días | usr · retirar | Se cierran sus sesiones. Al intentar entrar ve «suspendida hasta el {fecha}» y el motivo. Se levanta sola. |
| Banear | usr · retirar y rol Admin | Se cierran sus sesiones; no puede entrar. Ve el motivo al intentar entrar. |
| Levantar | usr · retirar | Termina las sanciones vigentes; la cuenta vuelve a activa. |
| Cerrar sesión / Cerrar todas | usr · editar | Entra otra vez en ese dispositivo (o en todos), con el código por SMS o con su llave de acceso. |
| Revocar una llave de acceso | usr · editar | Esa llave ya no entra; sigue entrando con el código y puede agregar otra. Recibe un aviso (texto y app) con «la quitó el equipo de To'Latino». |
| Bloquear dispositivo | usr · retirar | Ninguna cuenta entra desde ese dispositivo; se cierran todas sus sesiones. No se bloquea el dispositivo desde el que trabajas. |
| Restablecer verificación | usr · editar | Se cierran sus sesiones, **se quitan sus llaves de acceso** y al entrar le pedimos el código otra vez (la llave no lo salta). |
| Cambiar ciudad | usr · editar | Se salta la regla de 30 días. Si la ciudad no ha abierto, queda en su lista de espera. |
| Quitar foto de perfil | usr · editar | Sale la foto; queda el motivo. |
| Borrar datos | usr · editar | Entra a Cambios sensibles. **Otra persona** lo aplica: la cuenta no puede entrar y tiene 30 días de gracia; un Admin la puede restaurar. |
| Exportar sus datos | usr · exportar | Descarga el archivo. Queda en la auditoría. |

Nadie se sanciona ni se borra a sí mismo, y a alguien del equipo de To'Latino primero se le quita el rol (Sistema ›
Equipo). Toda acción pide motivo y queda en la auditoría. Nada se borra: estados.

## Preguntas frecuentes
**¿Le llega un SMS cuando lo sancionan?** No: los avisos de moderación no salen por SMS. Lo ve en la campana y en Mi cuenta ›
Avisos de moderación.

**¿Puede apelar?** Sí: el aviso de la sanción trae «Apelar» (Mi cuenta › Avisos de moderación) y la revisa una persona del
equipo distinta de quien sancionó.

**¿Qué es «comparte dispositivo»?** Que otra cuenta entró desde el mismo teléfono o navegador. Es una señal, no una
prueba: una familia puede compartir teléfono. Si borra las cookies, el dispositivo cambia.

**¿Dónde están pedidos, citas, Wallet, rango y Comunidad?** En las pestañas Actividad, Dinero y Comunidad, que llegan
con sus módulos.

## Actividad
**Usuarios 360° › Actividad:** pedidos, citas y reservaciones de los últimos 90 días, y **BOLETOS DE EVENTOS** (código, tipo, precio o cortesía,
orden, si lo recibió o lo pasó por transferencia, a qué hora entró y su estado: VÁLIDO · USADO · DEVUELTO · ANULADO · TRANSFERIDO) y **RSVP**
(personas, cuántos llegaron). Cada boleto abre Buscar boleto; cada RSVP, la ficha del evento. Nunca el teléfono de otra persona.
**English:** Users 360° › Activity shows 90-day counts and the person's event tickets (status, comp, transfers, entry time) and RSVPs.

## El Compa
**Usuarios 360° › El Compa** (con el permiso de El Compa): lo que esa persona habló con El Compa en 30 días, en cifras (conversaciones por
nivel, resolvió solo, acciones confirmadas, a una persona, sin IA, marcadas y preguntas sin respuesta) y **SUS CONVERSACIONES** por número CP-,
resultado y ciudad, **sin el texto**. Admin y Soporte tocan una para abrir su ficha en El Compa › Conversaciones (la lectura queda anotada);
Solo lectura ve las cifras. Si el texto ya se borró por la retención, la fila lo dice. **Soporte** (al lado) son sus casos.

## English

Community: the 360° Community tab shows rank, points, coins (no cash value), votes received, followers, blocks and mutes, and a
"possible network" notice with "Abrir caso de red de cuentas" (opens a User reports case, audited). Sub-tabs: Posts · Comments · Followers
and following · Points and coins · Coupons and referrals (no El Patio). The users list adds "With reports" and "Community rank" filters.

Users lists every account in your cities (search by name, phone, email or id; who, status, more filters, sort; 14 per
page). The 360° has Overview (phone and verification, email, city, role, since, last seen, devices, internal notes,
their businesses, actions), Security (devices and sessions: sign out one or all, block or unblock a device; passkeys
with device, last use and number of sign-ins, revoke one with a reason (the person is notified, audited); accounts
on the same device; reset phone verification; city with history and "Change city"), Trust (status, every sanction
with its reason and who, photos they reported) and Privacy (export their data as JSON). Sanctions: warning (no
restriction, shown in My account), mute 7 days / block posting 30 days (cannot send recommendations; lifts
automatically), suspend 14 days (sessions closed; sees "suspended until {date}" and the reason when signing in; lifts
automatically), ban (Admin only). "Delete data" goes to Sensitive changes and another person applies it: the account
cannot sign in and has 30 grace days; an Admin can restore it. Resetting phone verification also removes their passkeys. A passkey never
bypasses a suspension, a ban or a blocked device. System › Team shows whether each team member has a passkey. Nobody sanctions or deletes themselves; team members
must lose their role first. Every action asks for a reason and is audited. Moderation notices are not texted: the person
sees them in the bell and in My account › Moderation notices, where they can appeal.

### El Compa
**Users 360° › El Compa** (with El Compa permission): that person's 30-day El Compa numbers and **their conversations** by CP- number, outcome
and city, **without the text**. Admin and Support tap one to open its record (the read is logged); Read-only sees numbers only.
