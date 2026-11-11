# Push en el Super Admin · Push in Super Admin

_Pantallas: Super Admin › Sistema › Integraciones › Push (`/admin/sistema/integraciones?tab=push`), Notificaciones › Push y las plantillas
(`/admin/notificaciones`), Usuarios 360° › Seguridad › Avisos push. Escritorio y teléfono. Versión: 11 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **El servidor de avisos es nuestro:** plantillas, preferencias, horas de silencio, cola, reintentos, tokens y cifras. El último tramo es del
  sistema del teléfono: **APNs** (Apple, directo, con la llave .p8 del llavero), **FCM v1** (Android, solo mensajería, con la cuenta de servicio
  del llavero) y **Web Push** (navegadores y la web instalada, con nuestra llave VAPID; sin cuenta de nadie). Sin costo.
- **Push primero, SMS de respaldo:** cada plantilla dice si va por push, si su texto es **genérico** y **qué app** lo abre; su SMS es
  «siempre» (solo el grupo crítico), «si no hay push» o «nunca». El SMS «de respaldo» espera al push: si llega, queda **ahorrado**; si no, sale.
- **Lo sensible es genérico:** Salud, Niños, Soporte, moderación y sanciones, y la cuenta pasan por Apple y Google solo como «Tienes un aviso
  nuevo en To'Latino.». No se puede destapar (lo impide la base).

## Cómo se usa
- **Integraciones › Push:** los tres canales con su interruptor (apagar uno: deja de usarse al instante y lo que iba por ahí sale por SMS de
  respaldo cuando la plantilla lo lleva), de dónde sale cada llave (nunca la llave), los teléfonos con avisos por app y canal, la cola, lo de
  las últimas 24 horas por resultado, los errores por código y los **límites** (horas que vale un aviso, reintentos, lote, tope por minuto,
  días sin uso). Cada cambio pide motivo y queda en la auditoría. **«Mandar un push de prueba a mi teléfono»** pasa por la plantilla de prueba.
- **Notificaciones › Plantillas:** en cada plantilla, «Encender/Apagar push», «Texto genérico» y «Abre en…», con motivo.
- **Notificaciones › Push:** entregados al proveedor, abiertos desde el push y SMS ahorrados por plantilla, app y plataforma (7 días). Sin personas.
- **Usuarios 360° › Seguridad › Avisos push:** los teléfonos de la persona, enmascarados (rótulo, app, canal y los últimos 6 de la huella;
  nunca el token), los revocados con su motivo, y **Revocar** uno con motivo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Falta la llave de Apple o de Google en el llavero | En el sandbox, ese canal queda «en modo pruebas» (no sale nada); en producción, no sale y el SMS de respaldo sí. |
| El proveedor dice que el token ya no sirve (410, Unregistered) | El token se revoca solo («invalido») y el aviso sale por SMS de respaldo si lo lleva. |
| El proveedor está saturado (429) o falla (500 en adelante) | Se reintenta con espera creciente hasta los reintentos de Configuración; después, el SMS de respaldo. |
| El trabajador de push estuvo caído | Los avisos siguen en la campana; al vencer las horas que vale un aviso, sale el SMS de respaldo. |
| La persona sale de su cuenta o el equipo bloquea la sesión | El token de esa sesión se revoca en la misma transacción. |
| Un teléfono no abre To'Latino en los días sin uso | Su token vence; al volver a abrir, se registra solo. |
| Sandbox por HTTP en la IP | Los navegadores no permiten Web Push sin https: Mi cuenta dice «no disponible» y todo sigue por la campana y el SMS. |

## Para el equipo
<!-- solo-equipo -->
- Seguridad: el servidor solo le escribe a servicios de push conocidos (Apple, Google, Mozilla, Microsoft) por https; los simuladores
  solo existen fuera de producción. Los tokens y el contenido van cifrados en reposo; el contenido se borra de la cola al terminar.
- Un aviso nunca llega dos veces al mismo teléfono (una fila por aviso y teléfono) y su SMS de respaldo se reclama una sola vez.

## English

### What it does
- **The notification server is ours:** templates, preferences, quiet hours, queue, retries, tokens and numbers. The last mile belongs to the
  phone's system: **APNs** (Apple, direct, with the .p8 key from the key store), **FCM v1** (Android, messaging only, with the service account
  from the key store) and **Web Push** (browsers and the installed web, with our VAPID key; no third-party account). No cost.
- **Push first, SMS as backup:** each template says whether it goes by push, whether its text is **generic** and **which app** opens it; its
  SMS is «always» (only the critical group), «if no push» or «never». The backup SMS waits for the push: if it arrives, it is **saved**; if not,
  it goes out.
- **Sensitive notices are generic:** Health, Children, Support, moderation and sanctions, and account pass through Apple and Google only as
  «You have a new notice in To'Latino.». It cannot be turned off (the database enforces it).

### How to use it
- **Integrations › Push:** the three channels with their switch (turning one off stops it at once; what went that way goes out by backup SMS
  when the template carries it), where each key comes from (never the key), phones with notifications by app and channel, the queue, the last
  24 hours by result, errors by code and the **limits**. Every change asks for a reason and is audited. **«Send a test push to my phone»** uses
  the test template.
- **Notifications › Templates:** on each template, «Turn push on/off», «Generic text» and «Opens in…», with a reason.
- **Notifications › Push:** delivered to the provider, opened from the push and SMS saved by template, app and platform (7 days). No people.
- **Users 360° › Security › Push notifications:** the person's phones, masked (label, app, channel and the last 6 of the fingerprint; never
  the token), the revoked ones with their reason, and **Revoke** one with a reason.

### What happens in each case
| Case | What happens |
|---|---|
| Apple or Google key missing from the key store | In the sandbox that channel stays «in test mode»; in production it does not send and the backup SMS does. |
| The provider says the token is dead (410, Unregistered) | The token is revoked automatically and the notice goes by backup SMS if it carries one. |
| The provider is saturated (429) or failing (500 and above) | Retried with growing waits up to the configured retries; then the backup SMS. |
| The push worker was down | Notices stay in the bell; when the notice validity hours run out, the backup SMS goes out. |
| The person signs out or the team blocks the session | That session's token is revoked in the same transaction. |
| A phone does not open To'Latino for the unused days | Its token expires; when it opens again, it registers itself. |
| Sandbox over HTTP on the IP | Browsers do not allow Web Push without https: My account says «not available» and everything continues via bell and SMS. |
