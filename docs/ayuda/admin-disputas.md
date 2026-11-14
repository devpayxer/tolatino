# Super Admin › Transacciones › Disputas con el banco · Bank disputes

_Pantallas: `/admin/transacciones/disputas` (la cola de 120 h) y el caso en Colas › Disputas con el banco. Permiso: ver con «Transacciones»; responder y
aceptar con «Transacciones: aprobar» (Finanzas y Admin). Versión: 14 nov 2026. Audiencia: equipo. Tema: equipo._

## Qué hace
- Cuando un cliente reclama un cobro con su banco, Stripe nos avisa y la disputa entra a la cola **de 120 horas** con su **plazo del banco**. El negocio
  recibe el aviso; To'Latino responde.
- **Transacciones › Disputas**: cifras (falta responder, **vencen pronto**, el banco revisa, ganadas y perdidas en 90 días), filtros y una fila por
  disputa: el pedido, el monto, el motivo, el plazo (faltan N horas) y la **evidencia** (sin armar, lista o enviada). Toca la fila para abrir el caso.
- **El caso**: lo que tenemos del pedido (la línea de tiempo) y los **archivos para el banco**: el **recibo en PDF**, la **conversación con el cliente**
  (sin teléfonos) y la **constancia de entrega** con la línea de tiempo. **Responder con evidencia** arma los archivos, los sube por la API de archivos de
  Stripe y los manda junto con tu resumen **en un solo envío**. Si un archivo no sube, no se envía nada (inténtalo otra vez). **Aceptar devolución**
  cierra la disputa y el dinero vuelve al cliente.
- **Tres días antes del plazo** (Configuración › Dinero), una disputa sin responder avisa al equipo.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Responder dos veces | No deja: «Esta disputa ya se respondió o se cerró». |
| Stripe no acepta la respuesta | No cambia nada; inténtalo otra vez. |
| El pedido no tiene foto de entrega | Va la constancia con la línea de tiempo (la foto llega con el Repartidor). |
| El banco decide | Llega por Stripe: ganada (el dinero se queda) o perdida; el negocio recibe el resultado. |
| Sandbox | La disputa y el resultado se simulan desde Transacciones; el «banco» del simulador recibe los mismos archivos. |

Los archivos se guardan en el almacén privado (nunca públicos) y quedan anotados con su huella; nada se borra.

## Preguntas frecuentes
**¿En qué idioma respondo?** En inglés si puedes: lo lee el banco.
**¿Puedo cambiar un archivo después de enviar?** No: la evidencia enviada no se cambia.

## English

`/admin/transacciones/disputas`: the 120-hour queue with each bank deadline and the evidence status. Open the case to respond: the receipt PDF, the customer
conversation (no phone numbers) and the delivery record with the timeline are uploaded through Stripe's file API and sent together with your summary in a
single submission; if one file fails, nothing is sent. «Accept refund» closes it and returns the money. Three days before the deadline an unanswered
dispute alerts the team.
