# Panel · Reservaciones · Dashboard · Reservations

_Pantallas: `/panel/{negocio}/hoy` (Hoy), `?det=rsv:{número}` (detalle), `/panel/{negocio}/clientes?t=rsv` (Clientes ›
Reservaciones) y `/panel/{negocio}/vendes/reservaciones` (Lo que vendes › Reservaciones). Teléfono y escritorio.
Versión: Fase 2 · bloque 2e (6 nov 2026). Restaurantes Pro._

## Qué hace
- **Hoy:** las solicitudes de mesa llegan a **Esperan tu respuesta** junto a los pedidos, con **Confirmar**, **Otra
  hora** (le propone al cliente la hora libre más cercana: ±30, ±60 o +90 min) y **No hay mesa**. Las de hoy
  (confirmadas, sentados, otra hora propuesta) van a **Hoy en tu agenda**.
- **Detalle:** cliente (o a nombre de quién), cuándo, personas, área, nota, ocasión, qué necesitan, si avisó que llega
  tarde, el **historial** y lo que sigue: **Llegaron · en su mesa** / **No llegaron** → **Se fueron · mesa libre**.
- **Clientes › Reservaciones:** todas con filtro (todas, esperan tu respuesta, confirmadas y en curso, terminadas, no se
  pudo) con su cuenta, búsqueda por nombre o número y «Ver más». Pestañas Pedidos / Reservaciones con cuántas esperan.
- **Lo que vendes › Reservaciones:**
  - **Hoy:** cuántas personas de tus lugares, por confirmar, reservaciones de hoy, mesas; Ver página, Cerrar un día,
    Ver en Hoy. Las que esperan y las próximas, cada una se abre con sus datos y sus botones.
  - **Mesas por área** (Salón, Terraza, Barra): enciendes el área y pones cuántas mesas de 2, 4, 6 y 8. **Mesas que no
    se reservan** (para los que llegan sin reservación).
  - **Grupos:** «Juntamos mesas» y hasta cuántas personas; más que eso, el cliente pide un evento privado.
  - **Cuándo:** días, turnos (Almuerzo y Cena con primera y última mesa) y cuánto dura cada reservación (1 h, 1 h 30,
    2 h). Avisa si tu horario cierra un día que marcaste, si la última mesa no cabe antes de cerrar o si los turnos se cruzan.
  - **Días sin reservaciones:** cierra un día, un turno o un área (evento privado, feriado, lluvia en la terraza). Se
    guarda al instante y la página deja de ofrecerlo; «Quitar» lo abre otra vez.
  - **Reglas:** confirmar al instante si hay mesa, cuánto les guardas la mesa (10–30 min), aviso para cancelar gratis
    (1 h a 1 día), con cuánta anticipación mínima (1 h, 2 h, 1 día), hasta cuánto antes (1 semana, 2, 1 mes) y en cuánto
    respondes (lo ve el cliente). **Así lo ve el cliente** y **Guardar**.

## Qué pasa en cada caso
| Caso | Qué pasa |
|---|---|
| No respondes en 30 minutos (o llega la hora) | La solicitud se cierra sola: **SIN RESPUESTA**. |
| «Otra hora» sin ninguna hora libre cerca | Te dice que uses «No hay mesa». |
| El cliente no contesta tu propuesta en 15 minutos | Se cierra sola. |
| El cliente cancela tarde | Lo ves en el historial como cancelación tardía. No hay cargo para nadie. |
| El cliente pide cambiar una reservación confirmada | Sale en **Hoy** con «PIDE CAMBIO» (y te llega un aviso). En el detalle: la hora, personas y área que pide, **Aceptar el cambio** o **No se puede**. Su reservación actual sigue en pie hasta que respondas. |
| No respondes al cambio en 30 minutos (o llega la hora) | Se cierra solo y la reservación queda como estaba. |
| Aceptas un cambio y ya no tienes mesa a esa hora | No deja aceptarlo: usa «No se puede». |
| Tienes «Confirmar al instante» | Los cambios con mesa libre se hacen solos; lo ves en el historial. |
| Dos de tu equipo tocan a la vez | Gana el primero; el otro ve «Esta reservación ya cambió». |
| Guardar sin mesas, sin turno o sin días | No deja: dice qué falta. |
| Plan Free | La fila de Reservaciones sale con candado Pro. |
| To’Latino pausó tus Reservaciones | Aviso con el motivo; la pestaña no sale en tu página (las hechas siguen). |
| Apagas Reservaciones | La pestaña deja de salir; puedes encenderla otra vez. |

Cada paso queda en la auditoría con quién lo hizo. Responder y marcar llegadas pide el permiso «Hoy y pedidos»; los
ajustes, «Lo que vendes».

## Preguntas frecuentes
**¿To’Latino cobra por las reservaciones?** No. Sin cargo ni comisión.

**¿Se puede cambiar una reservación ya confirmada?** El cliente lo pide desde su reservación; tú lo aceptas o no desde el
detalle. Si no puedes, todo queda como estaba.

---

## English
Table requests arrive in **Today** next to orders with **Confirm**, **Other time** (suggests the nearest free time) and
**No table**; today's bookings go to the agenda. The detail shows client, when, guests, area, note, occasion, needs,
late notice and history, then **Arrived · seated** / **No-show** → **Left · table free**. **Clients › Reservations** has
filters with counts and search. **What you sell › Reservations**: today's summary, pending and upcoming requests,
tables by area (2, 4, 6, 8 seats), tables kept for walk-ins, joining tables for groups, days, shifts and duration
(with warnings against your hours), days without bookings (saved instantly), rules (instant confirm, hold time,
cancellation notice, minimum and maximum advance, reply time) and "How the client sees it". A client can ask to change
a confirmed booking: it shows in Today as "CHANGE ASKED", with **Accept the change** or **Can't**; the current booking
stands until you reply (30 minutes, or it closes on its own). Requests close on their own
after 30 minutes without a reply; proposals after 15. Free plans see the Pro lock; a To’Latino pause shows its reason.
No fees.
