# Mensajes con los negocios · Messages with businesses

_Pantallas: Mi cuenta › **Mensajes** (`/cuenta/mensajes`) y la conversación (`/cuenta/mensajes/{negocio}`); botón
**Mensaje** en la página del negocio, **Escribir al negocio** en tu pedido y tu reservación; Panel › **Mensajes**
(`/panel/{negocio}/mensajes`) y «Mensajes sin responder» en Hoy; Super Admin › Colas › **Mensajes reportados**.
Versión: Fase 2 · bloque 2p (6 nov 2026)._

## Qué hace
- **Vecino:** le escribes a cualquier negocio que ya está en To'Latino (tiene dueño). Una conversación por negocio; si
  vienes de un pedido o una reservación, arriba dice cuál («Pedido #1051»). Tu número no se comparte. La respuesta te
  llega sola mientras tienes la conversación abierta y, si no, te avisamos.
- **Negocio:** contesta desde el panel (el dueño o quien tenga Mensajes en el equipo). Respuestas rápidas, **Compartir mi
  teléfono** (sale como aviso dentro de la conversación), **Quién lo lleva** (Pro con equipo), **Bloquear** y **Reportar
  a To'Latino**. **Respuesta automática fuera de horario**: cuando el negocio está cerrado contesta sola
  «Gracias por escribir… te contestamos cuando abramos» (una vez cada 12 horas por cliente).
- **To'Latino:** no lee conversaciones. Solo cuando alguien reporta una, se abre un caso en «Mensajes reportados» y el
  equipo puede leerla mientras el caso está abierto. Puede **ocultar un mensaje** (quien lo escribió ve el motivo) y
  cerrar el caso (**Todo bien** o **Resuelto**). Nada se borra.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Escribes un número de teléfono | No se envía: «Por seguridad, sin teléfonos en los mensajes». El negocio comparte el suyo con el botón. |
| El negocio no está en To'Latino (sin dueño) | No sale el botón Mensaje; llámalo. |
| Escribes muy rápido | Máximo 20 mensajes cada 10 minutos y 8 conversaciones nuevas al día. |
| El negocio está cerrado y tiene la respuesta automática | Te contesta sola una vez; el negocio lee tu mensaje cuando abra. |
| El negocio te bloquea | Ya no puedes escribirle: «Este negocio no recibe mensajes tuyos». |
| Avisos | Al negocio le llega un aviso con el primer mensaje sin leer (no uno por cada mensaje). A ti, cuando el negocio contesta. |
| To'Latino oculta un mensaje | En la conversación sale «Mensaje oculto por To'Latino» y a quien lo escribió le llega el motivo. |

## Mensajes entre vecinos y reportes (5c)
- **Mi cuenta › Mensajes** lleva a **Comunidad › Mensajes** («Mensajes con vecinos · solo con quien te sigue»). Reglas y casos en
  `comunidad-vecinos-seguir-bloquear-y-mensajes.md`.
- **Colas › Mensajes reportados** también recibe las conversaciones entre vecinos («Mensajes entre vecinos · Comunidad»): se leen
  solo con el caso y un reporte abiertos; «Ocultar» un mensaje avisa a quien lo escribió («Ocultamos tu mensaje», con el motivo).
- **Reportar otra vez:** si ya habías reportado una conversación y el caso se cerró, el nuevo reporte la vuelve a abrir (antes
  daba error).

## Preguntas frecuentes
**¿El negocio ve mi teléfono?** No. Solo tu nombre y lo que escribes.
**¿To'Latino lee mis mensajes?** No, salvo que tú o el negocio reporten la conversación.
**¿Puedo escribirle a otro vecino?** Llega con Comunidad (solo a quien te sigue).

---

## English
Write to any business already on To'Latino (with an owner) from its page, your order or your booking: one conversation
per business, your number is never shared, replies arrive live while the chat is open and as a notification otherwise.
No phone numbers in messages (the business shares theirs with a button). Limits: 20 messages per 10 minutes, 8 new
conversations a day. Businesses reply from the dashboard (quick replies, share phone, who handles it with Pro, block,
report) and can turn on an auto-reply when closed (once every 12 hours per customer). To'Latino reads a conversation
only when someone reports it, while that case is open; it can hide a message (the author sees the reason). Nothing is
deleted.
