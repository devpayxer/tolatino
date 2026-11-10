# Super Admin · Eventos y boletos · Super Admin · Events and tickets

_Pantallas: **Super Admin › Eventos y boletos** (`/admin/eventos`: pestañas Eventos y Organizadores; ficha `/admin/eventos/{id}`),
**Colas › Eventos a revisar** (`/admin/colas?cola=evt`) y **Negocios 360° › Contenido › Eventos**. Versión: Fase 6 · bloque 6a (9 nov 2026).
Ver: todos los roles con Eventos; **decidir y verificar**: Admin y Ciudad (evt:aprobar); **ocultar y bloquear**: Admin (evt:retirar).
6c (10 nov): pestaña **Buscar boleto** y la ficha del boleto (`/admin/eventos/boleto/{código}`); Reenviar y Reemitir: Admin y Ciudad
(evt:editar); Anular: Admin (evt:retirar). «Modo puerta» llega con la puerta (6g)._

## Qué hace
- **Cifras:** EVENTOS (y cuántos esta semana), **A REVISAR** (con el plazo de Configuración › Eventos, 24 h de fábrica; lleva a la cola),
  ORGANIZADORES.
- **Eventos:** buscar por nombre, local u organizador; filtros En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados;
  tabla en escritorio, filas en el teléfono; 20 por página con cursor.
- **Ficha del evento:** cartel y fotos, estado, tipo, cuándo, dónde, entrada, edad, música, versión, texto ES/EN, programa, mesas y
  extras, «Antes de ir», el organizador (VERIFICADO · BLOQUEADO, eventos enviados y no aprobados) y el libro de la revisión (quién y cuándo).
  Si es un **cambio que importa**, **LO QUE CAMBIA** (antes → después): mientras decides sigue en vivo la versión publicada.
- **Revisar:** **Aprobar** (sale en Eventos y en su página; aviso al negocio, también por SMS) · **Pedir cambios** (motivo de la lista +
  nota; el negocio lo corrige y lo reenvía) · **No aprobar** (motivo; el negocio lo recibe por SMS y puede apelar). Motivos: falta la edad
  mínima · la capacidad supera el aforo del local · la descripción promete algo que no se puede garantizar · la foto no corresponde al
  evento · otro.
- **Ocultar del módulo / Volver a mostrar** (con motivo): sale de Eventos y de su página; el panel del negocio dice «OCULTO POR TO'LATINO»
  y le llega el aviso con la apelación. Volver a mostrar devuelve el estado que tenía.
- **Organizadores:** **Verificar** (sus eventos se publican al enviarlos, sin revisión previa) / **Quitar verificado**; **Bloquear
  publicación** (no envía ni publica; aviso con motivo y apelación) / **Permitir publicar**.
- **Colas › Eventos a revisar:** cada evento nuevo o cambio que importa de un organizador sin verificar; «Tomar», el plazo y las mismas
  decisiones. Cada decisión cierra el caso y queda en la auditoría con antes → después y el motivo.

- **6b · La ficha del evento** dice si **sale en Eventos** (lo decide la base: publicado y aprobado, sin ocultar, módulo Eventos del
  negocio encendido y sin pausa, organizador sin bloquear) con **Ver la página**, y los **últimos RSVP** (nombre con inicial, personas,
  estado; nunca teléfono).
- **6b · Negocios 360° › Contenido › Pausar Eventos** (con motivo): ninguno de sus eventos sale (no cambian de estado); el dueño ve
  «PAUSADO POR TO'LATINO» con el motivo en su panel. **Reanudar** con motivo. Todo queda en la auditoría.

- **6c · Cifras:** **BOLETOS EMITIDOS** (válidos y usados) y **BRUTO BOLETOS** (cobrado, menos devuelto) en tus ciudades.
- **6c · Buscar boleto:** por código del boleto (**TL-XXX-0000**), orden (**B-…**), últimos dígitos del teléfono, nombre, o **pegando el texto
  del QR**: se verifica la firma con la llave pública y dice **FIRMA VÁLIDA** (y si es la versión vigente: entra) o **FIRMA NO VÁLIDA** (alterado
  o de otro entorno: no entra), o «QR viejo» si el boleto se reemitió. El teléfono solo sale con los últimos 4.
- **6c · El boleto:** estado (**VÁLIDO · USADO · DEVUELTO · ANULADO · REEMITIDO**), la versión del QR, evento, tipo, entradas, a nombre de quién,
  lo que pagó, su comisión y descuento, el pago de la orden (cobrado / retenido / liberado, la tarjeta y **SIMULADO** en el sandbox), los
  boletos de la misma orden, la línea de tiempo de la orden y lo que pasó con el boleto. Acciones con motivo: **Reenviar** (aviso en su cuenta),
  **Reemitir** (QR nuevo; el anterior deja de entrar) y **Anular** (deja de entrar; no devuelve dinero: eso llega con 6d/6e). Todo queda en
  la auditoría y la persona recibe el aviso.
- **6c · La ficha del evento** suma **VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS** y las últimas órdenes (abren el boleto). **Transacciones ›
  Boletos** lista las órdenes B- con su cobro y comisión.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| Apruebas un cambio que importa | El cambio pasa a la versión publicada (sube la versión) y la fecha pública se mueve. |
| Pides cambios o no apruebas un cambio | Sigue en vivo la versión anterior; el negocio recibe el motivo en su panel. |
| El negocio apela un evento oculto o no aprobado, o un bloqueo | Caso en **Colas › Apelaciones** (72 h); lo decide **otra persona**, nunca quien ocultó, no aprobó o bloqueó (la base lo impide). Levantar: el evento se ve otra vez (o queda aprobado), o el organizador vuelve a publicar. |
| Un organizador bloqueado intenta enviar | La pantalla, el servidor y la base lo rechazan. |
| 6c · Pegas un QR con la firma alterada | **FIRMA NO VÁLIDA**: no entra. |
| 6c · Reemites un boleto | Sube la versión del QR: el anterior sale «QR viejo» y no entra (en línea y sin conexión). |
| 6c · Anulas un boleto | Queda **ANULADO** con el motivo; el dinero no se devuelve solo (devoluciones: 6d/6e). |
| Alguien intenta publicar sin revisión | La base no deja un evento en vivo sin aprobación (ni sin persona que apruebe, salvo organizador verificado). |

## Preguntas frecuentes
- **¿Se cambia el plazo de 24 h?** Sí, en Configuración › Eventos (con límites y auditoría).
- **¿Puedo editar el evento de un negocio?** No: se pide el cambio o se oculta, con motivo.
- **¿Dónde veo los eventos de un negocio?** Negocios 360° › Contenido › Eventos.

---

## What it does (English)
KPIs (events, **to review** with the Configuration deadline, organizers); **Events** list with search, filters and cursor; the event page
with everything needed to decide and, for an important change, **what changes** (the live version stays until you decide). **Approve** ·
**Ask for changes** · **Do not approve** (reason list + note; the business can appeal). **Hide from module / Show again** with a reason
(the business sees «HIDDEN BY TO’LATINO» and can appeal). **Organizers:** verify (publish without prior review) or block publishing (with
reason, notice and appeal). **Queues › Events to review** has the same decisions. Appeals are decided by another team member. Everything
goes to the audit log.

6b: the event page tells whether it **shows in Events** (with a link) and lists the **latest RSVPs** (first name and initial, people,
status; never phones). Business 360° › Content › **Pause Events** (with a reason) hides all of a business's events until resumed; the
owner sees the reason in the dashboard.

6c: **Find ticket** (ticket code, order, last phone digits, name, or the pasted QR text, whose signature is checked with the public key:
VALID SIGNATURE / INVALID SIGNATURE / old QR after a reissue); the ticket page (status, QR version, payment, order timeline, ticket history) with
**Resend**, **Reissue** (new QR; the old one stops working) and **Void** (no automatic refund), all with a reason, audit and a notice; KPIs
**TICKETS ISSUED** and **TICKET GROSS**; the event page adds **SOLD · GROSS · FEE · REFUNDED** and the latest orders; **Transactions › Tickets**.
