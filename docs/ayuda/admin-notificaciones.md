# Super Admin: Notificaciones · Super Admin: Notifications

_Pantallas: **Super Admin › Notificaciones** (`/admin/notificaciones`) con sus pestañas **Plantillas**, **Envíos**, **Push**, **SMS y WhatsApp**,
**Plantillas de WhatsApp**, **Correos** y **Reglas**. Ver: Notificaciones · ver. Editar una plantilla, mandar una plantilla de WhatsApp a Meta y simular su
respuesta en el sandbox: Notificaciones · editar. Las cifras son de las ciudades de quien mira. Escritorio y teléfono; «SMS y WhatsApp» y «Plantillas de
WhatsApp» en español y en inglés (el selector de idioma del admin). Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- **Plantillas:** cada aviso con su texto en español y en inglés, editable con motivo (queda en la auditoría). Solo deja usar las variables que la plantilla ya
  tenía. **El código para entrar** (`cuenta_codigo`) también se edita aquí, pero siempre tiene que llevar `{codigo}`; al final del SMS To'Latino agrega la línea
  que el teléfono reconoce para llenar el código solo (esa no se edita).
- **Envíos:** cada aviso con su estado del SMS y del push.
- **SMS y WhatsApp:** la **entrega** de cada SMS, que sale por **un solo camino** (avisos, el código para entrar, los SMS a números sin cuenta y El Compa por
  SMS): enviado, **entregado** (lo confirma el operador por el aviso firmado de Telnyx), **en reintento**, **falló** o **sin proveedor**, con sus intentos. Sin
  teléfonos: solo los últimos 4. También la entrega de WhatsApp (los avisos firmados de Meta) y el **tope global de remitentes** con sus alertas.
- **Plantillas de WhatsApp:** las de To'Latino para escribir primero por WhatsApp (el código, tus boletos, tu cita confirmada y «te respondió Soporte», en
  español y en inglés) con su **estado en Meta**: borrador, en revisión en Meta, aprobada, rechazada (con el motivo de Meta), pausada o deshabilitada.
  **Mandar a Meta** pide el motivo; la respuesta de Meta llega sola, firmada.
- **Correos:** cada correo de la bandeja (recibos, confirmar el correo, Soporte, el resumen semanal, campañas) con su estado.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| El proveedor no acepta un SMS o el operador no lo entrega | Se reintenta con espera creciente (2, 4, 8 min de fábrica) hasta el tope de intentos (3). Lo permanente (el número pidió STOP, número inválido) no se reintenta. |
| El SMS lleva un código para entrar y el código vence antes del próximo intento | No se reintenta: queda «falló». La persona pide otro. |
| Llega el aviso de entrega de un intento VIEJO | No cambia nada: solo el último intento decide. |
| Más de 60 números distintos escriben en un minuto (WhatsApp y SMS) | A los que pasan el tope no se les contesta en ese minuto; a los Admins les llega «Muchos números escriben a la vez» (una vez cada 10 minutos). STOP siempre se respeta. El tope está en Sistema › Configuración › Avisos y canales. |
| Alguien escribe STOP | Se anota la baja siempre. La confirmación sale UNA vez: la nuestra (en su idioma) o la del proveedor (Configuración › Avisos y canales › «STOP · quién confirma la baja»). |
| Una plantilla de WhatsApp está en revisión | Su texto no cambia hasta que Meta conteste. Rechazada, se corrige y se manda otra vez. |
| Sandbox | Ningún SMS sale a un teléfono: el simulador contesta como Telnyx (570-555-0911 falla una vez, 570-555-0912 es inválido, 570-555-0913 no contesta una vez). Las plantillas de WhatsApp van al simulador de Meta y su respuesta se simula aquí («Simular: aprobada / rechazada»). |
| Producción sin las cuentas de Telnyx y Meta | Los SMS quedan «sin proveedor» y salen cuando lleguen las llaves; «Mandar a Meta» dice que falta la cuenta. |

## Preguntas frecuentes
**¿Por qué un SMS dice «entregado» y otro solo «enviado»?** «Enviado» = el proveedor lo aceptó; «entregado» = el operador del teléfono confirmó que llegó.
**¿Dónde cambio cuántas veces se reintenta?** Sistema › Configuración › Avisos y canales (intentos y la espera del primer reintento).
**¿Puedo ver el teléfono de un SMS?** No: aquí solo los últimos 4. La persona y su historial están en Usuarios 360°.

## English
_Screens: **Super Admin › Notifications** (`/admin/notifications`) with **Templates**, **Sends**, **Push**, **SMS and WhatsApp**, **WhatsApp templates**,
**Emails** and **Rules**. View: Notifications · view. Edit a template, send a WhatsApp template to Meta and simulate its answer in the sandbox:
Notifications · edit. «SMS and WhatsApp» and «WhatsApp templates» follow the admin language selector._

### What it does
- **Templates:** every notification in Spanish and English, editable with a reason. The sign-in code (`cuenta_codigo`) is editable too, but it must keep
  `{codigo}`; To'Latino adds the line phones use to autofill the code (not editable).
- **SMS and WhatsApp:** delivery of every SMS, which goes out through **one path** (notifications, the sign-in code, SMS to numbers without an account
  and El Compa by SMS): sent, **delivered** (confirmed by the carrier through Telnyx's signed webhook), **retrying**, **failed** or **no provider**, with its
  attempts. No phone numbers: only the last 4. Also WhatsApp delivery (Meta's signed statuses) and the **global sender cap** with its alerts.
- **WhatsApp templates:** To'Latino's templates to write first on WhatsApp (the code, your tickets, your confirmed appointment and «Support replied», in
  Spanish and English) with their **status at Meta**. **Send to Meta** asks for a reason; Meta's answer arrives on its own, signed.

### What happens in each case
| Case | What happens |
|---|---|
| The provider rejects an SMS or the carrier does not deliver it | It is retried with growing waits up to the attempt cap. Permanent failures (STOP, invalid number) are not retried. |
| A sign-in code would expire before the next attempt | Not retried: it stays «failed». The person asks for a new one. |
| More than 60 different numbers text in one minute | Those over the cap get no reply that minute; Admins get «Many numbers are texting at once» (once every 10 minutes). STOP is always honored. |
| Someone texts STOP | The opt-out is always recorded. Only ONE confirmation goes out: ours or the provider's (Configuration › Notifications and channels). |
| Sandbox | No SMS reaches a real phone: the simulator answers like Telnyx. WhatsApp templates go to the Meta simulator and its answer is simulated here. |

### FAQ
**Why does one SMS say «delivered» and another only «sent»?** «Sent» = the provider accepted it; «delivered» = the carrier confirmed it arrived.
**Can I see an SMS phone number?** No: only the last 4 here.
