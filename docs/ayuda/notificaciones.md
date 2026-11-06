# Notificaciones · Notifications

_Pantallas: la campana del encabezado, `/avisos` (APP-NOTIF, la bandeja), Mi cuenta › Avisos (qué llega por teléfono) y
Super Admin › Notificaciones (ADM-NOTIF). Versión: Fase 2 · bloque 2j (6 nov 2026)._

## Qué hace
- Cuando pasa algo con lo tuyo, To'Latino te avisa: **el negocio aceptó o no tu pedido, está listo, va en camino; confirmó
  tu mesa, te propone otra hora o no pudo darte mesa; respondió tu solicitud de empleo; respondió o se resolvió tu ayuda con
  un pedido; ocultamos algo que escribiste** (con el motivo).
- Al **negocio** le avisamos: un pedido o una reservación nueva, un cliente que pide ayuda con un pedido, alguien que aplicó a
  una vacante.
- Cada aviso queda en la **bandeja** (la campana: un punto cuando hay nuevos). Tocar un aviso te lleva al pedido, la
  reservación o la solicitud. Abrir la bandeja los marca como leídos.
- Además del aviso en la app, casi todos salen como **mensaje de texto** al teléfono de la cuenta, en tu idioma.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Apagaste «Pedidos», «Citas y reservas» o «Empleos» en Mi cuenta › Avisos | Te llega a la bandeja, no al teléfono. |
| Son entre las 10 PM y las 7 AM (hora de tu ciudad) | El mensaje de texto no sale; el aviso queda en la bandeja. Puedes quitar las horas de silencio en Mi cuenta › Avisos. |
| Un pedido no aceptado o la respuesta a tu ayuda | No tienen interruptor: llegan siempre. |
| El negocio recibe un pedido nuevo de noche | Le llega igual: solo recibe pedidos mientras está abierto. |
| Sandbox (pruebas) | Ningún mensaje de texto sale: queda «en modo pruebas» y se ve en Super Admin › Notificaciones › Envíos. |
| Sin proveedor de mensajes | Queda «sin proveedor» en Envíos; la bandeja funciona igual. |

## Super Admin › Notificaciones
- **Cifras de 24 h:** avisos, mensajes enviados, frenados (por los avisos de la persona o el silencio) y con problema.
- **Plantillas:** cada evento con su texto en español y en inglés. **Editar** pide el motivo (queda en la auditoría) y solo
  deja usar las variables que la plantilla ya tenía (`{negocio}`, `{num}`…); 160 letras si sale como mensaje de texto.
  **Probar en mi teléfono** te manda el aviso con valores de muestra.
- **Envíos:** cada aviso con su estado (solo bandeja, en pruebas, enviado, apagado, horas de silencio, falló); toca para ver a
  la persona.
- **Reglas:** lo crítico siempre llega, horas de silencio, la bandeja siempre, lo decide cada persona, en su idioma.

## Preguntas frecuentes
**No me llegó el mensaje de texto.** Mira la campana: el aviso está ahí. Revisa Mi cuenta › Avisos (quizás lo apagaste) y si
era de noche (horas de silencio).
**¿Puedo borrar un aviso?** No; quedan en la bandeja, los más nuevos arriba.

---

## What it does (EN)
- When something happens with your stuff, To'Latino lets you know: **your order was accepted or not, is ready, is on the
  way; your table was confirmed, another time was proposed or no table was available; your job application got a reply;
  your order help got a reply or was resolved; we hid something you wrote** (with the reason).
- **Businesses** are told about: a new order or booking, a customer asking for help with an order, someone applying to a job.
- Every notification stays in the **inbox** (the bell shows a dot when there is something new). Tap one to open the order,
  booking or application. Opening the inbox marks them read.
- Most also go out as a **text message** to the account's phone, in your language.

## What happens in each case
| Case | What happens |
|---|---|
| You turned off Orders, Bookings or Jobs in My account › Notifications | It reaches your inbox, not your phone. |
| Between 10 PM and 7 AM (your city's time) | No text goes out; it stays in the inbox. You can turn quiet hours off. |
| An order not accepted, or a reply to your help request | No switch: always delivered. |
| A business gets a new order at night | It still arrives: it only takes orders while open. |
| Sandbox | No text message leaves: it shows as «test mode» in Super Admin › Notifications › Sends. |

## FAQ
**I didn't get the text.** Check the bell: it is there. Check My account › Notifications and whether it was quiet hours.
**Can I delete a notification?** No; they stay in the inbox, newest first.
