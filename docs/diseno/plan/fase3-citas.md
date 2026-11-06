# Fase 3 · Belleza (citas) — especificación extraída del prototipo (6 nov 2026)

Fuente: `docs/diseno/pantallas/datos/neg-bell-book.js` (B), `neg-bell-listing.js` (L), `neg-cita-help.js` (H),
`dash2-svc.js` (SV), `dash2-stf.js` (ST), `dash2-cat.js` (CAT); Panel v2, Super Admin y Mi cuenta (.dc.html);
`memoria-del-diseno.md` (MEM). Offsets entre paréntesis. Lo que manda es el prototipo; esto es su resumen de trabajo.

## Conflictos resueltos (decisión del fundador o la más reciente)
- **Depósito:** se cobra **al enviar** la solicitud (aprobación manual) o al confirmar (al instante) y se devuelve si no
  se confirma (MEM ~1130, decisión 26 sep). Las frases viejas «se retiene y solo se cobra al confirmar» se reescriben.
- **«Otra hora»:** el negocio no elige la hora: el motor propone el siguiente hueco libre (MEM ~869, B@74789).
- **Plazo del cliente para «otra hora»:** 2 h (plantilla `cita_alt`).
- **Plazo del negocio:** las citas vencen a las 2 h por defecto (cfg `citaReply`), no 10 min.
- **Silla rentada:** la configura el panel del dueño por silla («lo decide cada silla»); no hay panel aparte del rentero.
- **Reseña «vía {Local}»:** pendiente en el diseño; la página de una silla muestra las reseñas del local donde `pro = la persona`.

## Bloques
- **3a · Servicios y reglas de citas (panel + admin + datos):** modelo del negocio (Rentan silla / A comisión /
  Empleados), Servicios (nombre ES/EN, categoría, dura 15–480, tiempo entre citas 0/5/10/15, precio fijo o desde, quién lo
  hace, opciones con ±precio ±min, extras, foto), Citas (aprobar al instante, tarda en contestar 15/30/60/180, depósito
  0/5/10/20/50, cancelar gratis 2/4/24/72 h, el cliente elige con quién, quién recibe citas), Sillas y agenda por silla.
  Admin › 360 › Lo que vende: ocultar servicio, pausar Citas; Equipo ya existe.
- **3b · Ficha y reserva (cliente):** pestaña Servicios (por servicio / por barbero), hoja del servicio (opciones, extras,
  ¿con quién?), Booking: Día y hora (14 días; mañana/tarde/noche; paso 30 min, 60 si ≥180; cabe antes de cerrar; hoy
  ≥ ahora+30; horario de la persona → del negocio; buffers; huecos reales contra citas existentes) → Detalles (para quién,
  nota 280, recordatorio SMS) → Revisa y envía (precio, cómo se paga, tabla del depósito, políticas, tarjeta) → C-xxxx.
- **3c · Estado de la cita + Panel › Citas:** estados pend/ok/alt/no/exp/cx/done (+ chg, nos, live); cambiar (el depósito
  pasa), cancelar (gratis si faltan ≥ cx h), voy tarde; panel: Confirmar / Otra hora / No puedo, vence a las 2 h,
  Llegó / No llegó (depósito se queda) / Terminada · cobrar; avisos `cita_ok`, `cita_alt`, `cita_no`, `biz_cita`; Mi cuenta.
- **3d · Staff con silla propia:** página de la silla («SILLA N · DESDE AAAA», Ver el local), su agenda y precios,
  confirma al instante o responde en ~N min, depósito propio; reseñas con «Con {pro}».
- **3e · Ayuda con la cita + Admin:** motivos (cobraron más (foto), no me atendió quien reservé, no quedó como lo pedí
  (foto), esperé mucho, no me devolvieron el depósito, otra cosa), qué quieres (arreglo sin cargo / devolución / solo
  avisar), 24 h negocio → 48 h To'Latino; Transacciones › Citas; comisión 8 % (el depósito devuelto no paga comisión).

## Textos clave (verbatim)
- Hoja: «¿Con quién?», «CADA UNO PONE SU PRECIO Y SU AGENDA», «CUALQUIERA: TE TOCA QUIEN ESTÉ LIBRE», «Elegir día y hora».
- Booking: «Día y hora», «Detalles», «Revisa y envía», «De {h} a ~{end} · {dur}», «No quedan horas el {día}»,
  «¿PARA QUIÉN ES?» Para mí / Para otra persona («Tú recibes los avisos») / Para un niño o niña («Hasta 12 años · tú lo
  acompañas»), «NOTA PARA {X}», «Recordatorio por SMS · 24 horas y 2 horas antes», «CÓMO SE PAGA», «Hoy, al enviar ·
  Depósito. Se descuenta del total.», «TU DEPÓSITO DE $X» (No puede a esa hora → «Te propone otra»; No te sirve la otra
  hora → «Te devolvemos $X»; No contesta en N h → «Te devolvemos $X»; Cancelas hasta N h antes → «Te devolvemos $X»;
  Cancelas después o no llegas → «Se queda con {X}»), «HOY PAGAS $dep», «Enviar solicitud» / «Confirmar cita».
- Estado: «Solicitud enviada» / «PENDIENTE DE CONFIRMAR» / «{X} tiene N horas para contestar. Suele tardar … Te avisamos
  por SMS apenas responda.»; «Cita confirmada» / «CONFIRMADA POR …»; «Te propone otra hora» / «TE PROPONEN UN CAMBIO»
  (Aceptar esta hora / Buscar otra / No, gracias); «No pudo tomarla» / «NO PUDO»; «Sin respuesta» / «VENCIDA»;
  «Cita cancelada» / «CANCELADA»; «Cita terminada» / «TERMINADA». «Esta hora sigue tuya hasta que …».
- Panel Citas: «Aprobar citas al instante» («Apagado: tú confirmas cada una. Recomendado.»), «TARDAS EN CONTESTAR»,
  «Si no contestas en 2 horas, la solicitud vence y se devuelve el depósito.», «DEPÓSITO AL PEDIR LA CITA» («Se cobra al
  enviar la solicitud y se descuenta del total. Si no confirmas, se devuelve.»), «CANCELAR GRATIS HASTA» («Si cancelan
  más tarde o no llegan, el depósito se queda contigo.»), «El cliente elige con quién» («Si lo apagas, se asigna a quien
  esté libre.»). Bandeja: Confirmar / Otra hora / No puedo; «Hasta que respondas, el cliente ve «Solicitud enviada».
  Nunca se confirma sola.»; Llegó · en atención / No llegó / Terminada · cobrar.
- Plantillas: `cita_ok` «{negocio} confirmó tu cita: {dia} a las {hora}. Depósito {dep} cobrado.»; `cita_alt`
  «{negocio} no puede a las {hora}. Te propone {alt}. Tienes 2 h para aceptar.»; `dev` «Te devolvimos {monto} a tu
  {medio}. Llega en 3–5 días hábiles.»

## Modelo (modelo-datos.md)
Operation kind `appointment` (status pending|change_proposed|confirmed|declined|expired|cancelled|done, `respond_by`,
`late_notice_at`, `free_quota_month`); BookingPolicy (approval manual|instant, response_min, expires_h, deposit +
deposit_section_ids, cancel_free_h, late_tolerance_min); StaffService; BusinessMember (kind owner|staff|renter,
weekly_schedule, specialties); HelpRequest.
