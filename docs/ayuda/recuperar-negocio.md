# Recuperar tu negocio · Recover your business

_Pantallas: ONB-NEG-RECUPERAR (`/recuperar/{negocio}`), «¿Es tuyo? Reclámalo» de Publica tu negocio, las semillas «Sin reclamar» de la página de
categoría, el aviso del panel del dueño y la cola «Cambios sensibles» del Super Admin. Decisiones R1 y R2 (`docs/DECISIONES.md`). Versión: 5 nov 2026.
Audiencia: vecino. Tema: negocios._

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

## English

### What it does
- **For whoever owns a business that is already on To'Latino** (a neighbor listed it, the team loaded it, or another account manages it): they
  ask to take it over. They pick what they are to the business (owner, partner, manager) and how we check it:
  - **A code to the business's phone** (decision R1): we send a 6-digit code by text message to the phone the page has (shown covered:
    (570) 5••-••80). Only if the business has no owner and has a phone.
  - **A document:** the business license, a utility bill, or the IRS letter with the EIN. The photo is private: it never appears on the page and
    only the team reviewing the case opens it (every time it is opened it goes in the audit log).
  We never ask for identity documents or immigration status.
- **For the team:** each claim goes into the **Sensitive changes** queue (48 hours). The person sees who is asking, the business, how they proved
  it (verified code or the photo of the document), the note and, if the business already has an owner, how many days the notice has been out. They
  decide **Apply change** or **Reject** with a reason.
- **Seeds (decision I / D2):** from the **Neighbor recommendations** queue, "Create seed" puts the recommended business at the end of its category
  as "UNCLAIMED · {address}" with "Is it yours? Claim it for free." It is not a listing: it does not show in Search or on the Map. When tapped,
  the owner goes into List your business and, when they publish, the seed is claimed and stops showing.

### What happens in each case
| Case | What happens |
|---|---|
| Business with no owner, with the right code | Claim "in review" with high priority; a person approves it |
| Business with no owner, with a document | Claim "in review"; it is reviewed within 48 hours |
| Business **with an owner** (decision R2) | Only with a document. The current owner sees in their dashboard "Someone asked to recover {business} with a document. If you do not recognize this, write to us from Help before {date}. Until then nothing changes." After 7 days, only an Admin can apply it |
| Approved | The person who claimed becomes the owner and sees "It is yours" with "Open your dashboard." The previous owner leaves the team (reason: claim). Reviews and followers stay |
| Rejected | They see "We could not approve it" with the reason and "Try with a document" |
| Wrong or expired code | "That code is not right" / "The code expired. Ask for another" |
| Many attempts | 3 codes per hour and 5 per day per phone; 5 claims per month per person. After that: "Write to us from Help" |
| Already asked for that business | "You already asked to recover it. We are reviewing it" (one open claim per person and business) |

While To'Latino reviews, the page stays the same. Everything is recorded in the audit log (who asked, who decided, the change of owner). Nothing is
deleted.

### FAQ
**Why a text code and not a call?** The founder decided it (R1): no extra voice service. If the business only has a landline, a document is used.

**In the sandbox, does the SMS arrive?** No: in testing the code shows on the screen ("TEST MODE"). In production it arrives through the SMS provider.

**Someone claimed my business and I do not know them.** Write to us from Help before the date in the notice. Until a person at To'Latino decides,
nothing changes.

**What does everyone else see of the document photo?** Nothing. To'Latino keeps it private; only the team with permission for the queue opens it.
