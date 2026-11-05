# Recuperar tu negocio · Recover your business

_Pantallas: ONB-NEG-RECUPERAR (`/recuperar/{negocio}`), «¿Es tuyo? Reclámalo» de Publica tu negocio, las semillas
«Sin reclamar» de la página de categoría, el aviso del panel del dueño y la cola «Cambios sensibles» del Super Admin.
Versión: Fase 1 · bloque 1j (5 nov 2026). Decisiones R1 y R2 (`docs/DECISIONES.md`)._

## Qué hace
- **Para quien es dueño de un negocio que ya está en To'Latino** (lo puso un vecino, lo cargó el equipo o lo maneja
  otra cuenta): pide quedarse con él. Elige qué es del negocio (dueño, socio, encargado) y cómo lo comprobamos:
  - **Un código al teléfono del negocio** (decisión R1): mandamos un código de 6 números por mensaje de texto al
    teléfono que tiene la página (se muestra tapado: (570) 5••-••80). Solo si el negocio no tiene dueño y tiene teléfono.
  - **Un documento:** licencia del negocio, factura de luz o agua, o la carta del IRS con el EIN. La foto es privada:
    nunca sale en la página y solo la abre el equipo que revisa el caso (cada vez que se abre queda en la auditoría).
  Nunca pedimos documentos de identidad ni el estatus migratorio.
- **Para el equipo:** cada reclamo entra a la cola **Cambios sensibles** (48 h). La persona ve quién lo pide, el
  negocio, cómo lo comprobó (código verificado o la foto del documento), la nota y, si el negocio ya tiene dueño, cuántos
  días lleva el aviso. Decide **Aplicar cambio** o **Rechazar** con motivo.
- **Semillas (decisión I / D2):** desde la cola **Recomendaciones de vecinos**, «Crear semilla» pone el negocio
  recomendado al final de su categoría como «SIN RECLAMAR · {dirección}» con «¿Es tuyo? Reclámalo gratis». No es una
  ficha: no sale en Buscar ni en el Mapa. Al tocarlo, el dueño entra a Publica tu negocio y, al publicar, la semilla
  queda reclamada y deja de salir.

## Qué pasa en cada caso
| Caso | Lo que pasa |
|---|---|
| Negocio sin dueño, con código correcto | Reclamo «en revisión» con prioridad alta; una persona lo aprueba |
| Negocio sin dueño, con documento | Reclamo «en revisión»; se revisa en 48 h |
| Negocio **con dueño** (decisión R2) | Solo con documento. El dueño actual ve en su panel «Alguien pidió recuperar {negocio} con un documento. Si no lo reconoces, escríbenos desde Ayuda antes del {fecha}. Hasta entonces nada cambia.» Pasados 7 días, solo un Admin puede aplicarlo |
| Aprobado | Quien reclamó queda como dueño y ve «Ya es tuyo» con «Abrir tu panel». El dueño anterior sale del equipo (motivo: reclamo). Reseñas y seguidores se quedan |
| Rechazado | Ve «No pudimos aprobarlo» con el motivo y «Probar con un documento» |
| Código equivocado o vencido | «Ese código no es» / «El código venció. Pide otro» |
| Muchos intentos | 3 códigos por hora y 5 al día por teléfono; 5 reclamos al mes por persona. Después: «Escríbenos desde Ayuda» |
| Ya pidió ese negocio | «Ya pediste recuperarlo. Lo estamos revisando» (un reclamo abierto por persona y negocio) |

Mientras To'Latino revisa, la página sigue igual. Todo queda en la auditoría (quién pidió, quién decidió, el cambio de
dueño). Nada se borra.

## Preguntas frecuentes
**¿Por qué un código por texto y no una llamada?** Lo decidió el fundador (R1): sin un servicio de voz más. Si el
negocio solo tiene teléfono fijo, se usa un documento.

**En el sandbox, ¿llega el SMS?** No: en pruebas el código sale en la pantalla («MODO PRUEBAS»). En producción llega
con el proveedor de SMS.

**Alguien reclamó mi negocio y no lo conozco.** Escríbenos desde Ayuda antes de la fecha del aviso. Hasta que una
persona de To'Latino lo decida, nada cambia.

**¿Qué ve el resto de la gente de la foto del documento?** Nada. La guarda To'Latino en privado; solo el equipo con
permiso de la cola la abre.

---

## English
Recover your business lets the owner of a business already on To'Latino take it over. They pick their role (owner,
partner, manager) and how we check it: a 6-digit **code texted to the business phone** (decision R1; only when the
business has no owner and has a phone, shown masked) or a **document** (business license, utility bill or IRS EIN
letter, stored privately and only opened by the team, every view audited). We never ask for ID or immigration status.
Every claim goes to the **Sensitive changes** queue (48 h); a person applies or rejects it with a reason. If the
business **already has an owner** (decision R2), only a document works, the current owner sees a notice in their
dashboard with 7 days to answer, and after that only an Admin can apply it. Approved: the claimant becomes the owner
and opens the dashboard; the previous owner leaves the team; reviews and followers stay. Rejected: they see the reason
and can try with a document. Limits: 3 codes per hour and 5 per day per phone; 5 claims per month per person; one open
claim per person and business. **Seeds:** from the Neighbor recommendations queue, "Create seed" lists the recommended
business at the end of its category as "UNCLAIMED"; it is not a page (not in Search or Map) and becomes claimed when
the owner publishes it. In the sandbox the code is shown on screen ("TEST MODE"); in production it arrives by SMS.
