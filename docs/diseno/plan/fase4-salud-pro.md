# Fase 4 · Doctores + Profesionales — plan de construcción extraído del prototipo (6 nov 2026)

Fuentes (todas en `docs/diseno/pantallas/datos/` salvo indicación): `neg-salud.js` (TLSalud), `neg-salud-listing.js` (TLSaludL),
`neg-salud-kind.js` (TLSaludK), `neg-salud-flow.js` (TLSaludFlow), `neg-salud-rev.js` (TLSaludRev, `TLHogarExt.shelp`), `neg-pro.js`
(TLPro), `neg-pro-listing.js` (TLProL), `neg-pro-kind.js` (TLProK, `govSync`), `neg-pro-flow.js` (TLProFlow), `neg-pro-rev.js` (TLProRev,
`TLHogarExt.phelp`), `dash2-cat.js` (TLDashCat: `TOOLS`, `state`, `summary`, bloques NEG-SALUD L342–352 y NEG-PRO L353–366, `LIC0`,
`CANT`), `dash2-cat.js` L14/L23 (Centro Médico Quisqueya y Bufete Almonte en el panel), `demo-biz.js` (`demo-salud` L806–850,
`demo-pro` L874–916), `onb-neg-data.js` L44–45, `adm-data.js` L24–25; `docs/diseno/plan/taxonomia-negocios.md` §8–9 (TAX);
`docs/diseno/referencia/memoria-del-diseno.md` (MEM 744–745, 1834–1868 Salud, 2052–2077 Profesionales); `docs/diseno/entrega/
modelo-datos.md` (MD: reglas 6, 8, 12; License; Operation; BookingPolicy); `solo-prototipo.md` (SP «Pasos del servicio»).
Plantilla y motor común: `docs/diseno/plan/fase4-hogar-auto.md` (4a–4g, ya construidos). Esto es un resumen de trabajo; manda el
prototipo. Nada de este archivo se ha construido.

## Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, Booking, revisión y estado; nunca se suavizan)
- **Salud:** «¿aceptan mi seguro y me entienden?» · línea **«Si es una emergencia, llama al 911.»** (`TLSalud.line`) · sub: «To'Latino
  no da consejo médico. Cada consultorio dice qué seguros acepta, cuánto cuesta sin seguro y quién habla español.» · bloque de la ficha:
  «Si es una emergencia, llama al 911. Dolor de pecho, falta de aire, sangrado fuerte o señales de derrame: no esperes una cita.»
  Salud mental (`mente`, `psiq`): «¿Y si estoy en crisis?» → «Llama o escribe al 988, de día o de noche, también en español. Si hay
  peligro inmediato, llama al 911.»
- **Profesionales:** «¿puede hacerlo por ley y cuánto es en total?» · línea **«Nadie te garantiza un resultado.»** (`TLPro.line`) ·
  sub: «En EE. UU. un notario no es abogado. Solo un abogado o un representante acreditado puede aconsejarte en inmigración. Cada
  oficina dice su licencia, el total con lo del gobierno y lo que no puede hacer.» Banda: «¿Te prometen una visa o una green card
  segura?» → «Ver quién puede por ley». En los no legales (`TLProK.post`, `!legal`) la línea pasa a «Nada se cobra sin tu OK.».
- Las dos: «To'Latino no da consejo médico / legal. Lo que cuentes solo lo ve el consultorio / la oficina.» (pol2 del Booking).

---

## 0. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Página de categoría NEG-SALUD y NEG-PRO (filas `sint`/`seg`/`quien` y `tram`/`lic`/`como`, 7 capítulos cada una, grupos, `quick5`, banda) | `packages/taxonomy/paginas.json`, `lib/categoria.ts`, `buscar.ts` | Ya servida; solo faltan los derivados que la alimentan (§2, §5) |
| Subcategorías NEG-SALUD-01…60 y NEG-PRO-01…60 | migr. 0004 | 59 «Exámenes médicos laborales y DOT» y 60 «Veterinario» no están en ningún capítulo (Preguntas #12) |
| `operations` (kind `appointment`, `status_detail`), `operation_events`, `booking_policies`, `business_members` (`languages`, `certification`, `weekly_schedule`) | 0023, 0043, 0008 | Cita de Salud y consulta de Pro = `appointment`; «Quién te atiende» = miembros |
| `lib/citas.ts` (`contexto`, `gente`, `huecos`, `preparar`, `puede` techo Free, `enviarCita` con candado y `client_key`, `citaVista`, `proximas`) · `app/(app)/n/[id]/cita/Booking.tsx` · `/cita/[num]` (Estado.tsx) | 3b–3c | Motor de disponibilidad por profesional (30 min) y envío idempotente; Booking de 3 pasos |
| `lib/citas-flujo.ts` (`vencerCitas`, `citaPaso`, `citaCambio`, `citaCliente`, `avisarCliente/Neg`) · `lib/citas-panel.ts` | 3c | Confirmar / Otra hora / No puedo + pasos nuevos (`seg`, `quote`, `hired`, `noshow`) |
| `lib/servicios.ts` (Belleza) · `lib/oficios.ts` (`KINDS`, `Attrs`, `limpiarOficio`, `recalcularFiltros`, `TOOL_DEF`) | 3a, 4a | Patrón de servicio con `svc_kind` + `svc_attrs` validados en servidor; se suman los rubros `salud` y `pro` |
| `lib/estimados.ts` (`mandarEstimado`, `decidirEstimado`, `pedirExtra`, `decidirExtra`, `plantillas`) · `app/panel/Estimado.tsx` | 4d | Base del **«El total, por escrito»** de Pro (versión, enviado, aceptado, extra con tu OK) sin retenciones |
| `lib/solicitudes.ts` | 4e | No se usa en esta fase (Pro «cotiza» se resuelve en la consulta, no con fotos) |
| `lib/licencias.ts` (`licenciasDe`, `licenciaPagina`, `tarjetaLey`) · `license_kinds` (10 claves NEG-PRO sembradas: abogado, acreditado, notario, ata, cpa, ptin, caa, nmls, arq, agente) · `/n/[id]/licencia` · cola Licencias (72 h) | 1k, 0017, `seeds/licencias.sql` | Tarjeta «¿PUEDE HACERLO POR LEY?» ya en la ficha (`ficha.ts` L183); se suman licencias de salud y de persona |
| `app/panel/Panel.tsx` `licencias()` (TUS LICENCIAS · número · AGREGAR UNA LICENCIA · LO QUE NO HACES) · `lib/no-hago.ts` (`NO_HAGO` = `CANT`, `LIC_LEGAL`) | 1k | Mitad de «Tu herramienta» de Pro ya construida; falta «EL TOTAL, POR ESCRITO» y los no legales |
| `lib/tarjeta.ts` (`CITA` incluye NEG-SALUD/NEG-PRO; sin `cita` → «Cómo llegar»; chips «El médico habla español» y licencia) | 1f | Tarjeta del buscador ya alineada |
| `lib/ayuda-cita.ts` (`MOTIVOS` por rubro, `CON_FOTO`, `pedirAyudaCita`, `responderAyudaCita`, `ayudasCitasNegocio`) · `/cita/[num]/ayuda` | 3e, 4g | Ayuda con la cita (Salud) y con el trámite (Pro): rubros nuevos |
| `lib/resenas.ts` (`answers`, `facts`, `PII`, `limpiarRespuestas` por rubro, `src 'cita'`) | 2g, 4g | Preguntas de categoría y datos de la cita; filtro de datos sensibles nuevo |
| `lib/apartados.ts` | 4f-3 | Tienda de la óptica («Apartar» lentes) sin código nuevo |
| `lib/cobros.ts`, `lib/pagos/pasarela.ts` (`retener`, `cobrar`, `cobrarFuera`, `devolver`) | 2d, 4d, 4f | Solo si Pro cobra en la app (Preguntas #1); Salud no mueve dinero |
| `lib/mensajes.ts`, `lib/avisos.ts`, `lib/mi-cuenta.ts`, `lib/subir-foto.ts`, `app/panel/Equipo.tsx` (`SP['NEG-SALUD'] = consultorio`) | | Chat con contexto, avisos, Mi cuenta, fotos de factura/recibo, Staff |
| Onboarding `lib/onb/datos.ts` (`NEG-SALUD` mods svc/citas/staff; `NEG-PRO` svc/citas/cot; amenities y línea fija) | 1g | Ya pide lo de la categoría al publicar |

## 1. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo (etapas 1–4 de las dos). El **panel** solo trae «Tu herramienta» (`dash2-cat.js`) y las
solicitudes genéricas (`reqRow` k `cita`: Confirmar / Otra hora / No puedo; demos `D8.req`/`Q9.req`). **No hay:**
1. **Servicios de Salud y de Pro** en el panel (no existe `dash2-ssv`/`dash2-psv`): copiar `dash2-asv` con los tipos de §2 (Salud:
   consulta, por video, sin cita, gratis con tu seguro, precio fijo, «según tus ingresos», con quién; Pro: + honorario/gobierno,
   por hora con horas estimadas, % solo si ganas, se cotiza, «se descuenta si lo contratas», video o teléfono, «lo que NO hacen»).
2. Respuesta del consultorio **«No aceptamos su seguro»** (estado `seg`) y **«No vino»** en la tarjeta de la cita del panel.
3. Constructor del **total por escrito** de Pro (honorario, gobierno aparte, crédito de la consulta, extra opcional, horas estimadas,
   válido 30 días) y los pasos **Contratado / Terminó el trámite / No contrató**.
4. Campo **«Enlace de tu consulta por video»** (por negocio o por profesional) — el prototipo dice «El enlace del video te llega por
   SMS 10 minutos antes» pero no dice de dónde sale.
5. Toggles que la ficha usa y Tu herramienta no tiene: **«Intérprete gratis»** (`interp`), **«Plan de pagos»** (`plan`),
   **«Urgencias»** (`urgente`, Pro) y **«Para quién»** (`ninos`/`mujer`/`mayor`/`familia`, Salud).
6. **Mis seguros** en Mi cuenta (la hoja «Tu seguro» dice «EN TU CUENTA», pero no hay pantalla `USR-*` para verlos/quitarlos).
7. Super Admin: licencias **de persona** (staff con licencia médica/de abogado), catálogo de **seguros y planes**, y la vista de
   «total por escrito vs. pagado».
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de cita del panel, Estimado.tsx)
y cada pantalla nueva va a `docs/REVISION.md` para el OK.

---

## 2. Cambios de datos (migraciones 0057 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0057 `salud_pro_servicios` (4h)**
- `items.svc_kind` amplía el check: Salud `('cons','tele','walk','free','proc')`; Pro `('cons','fijo','hora','pct','walk','cotiza')`
  (`fijo`/`cotiza` ya existen en Auto). `lib/oficios.ts`: `Rubro` + `'salud' | 'pro'`, `KINDS.salud`, `KINDS.pro`.
  `svc_attrs` (zod + guardián): Salud (`neg-salud-listing` cabecera) `esc` (según tus ingresos), `who` (miembros que lo hacen),
  `no [[es,en]]` («Dolor de pecho, falta de aire o sangrado fuerte: llama al 911.»); Pro (`neg-pro-listing` cabecera) `gov_cents`
  (tarifa del gobierno, aparte), `cred` (se descuenta si lo contratas), `rem` (video o teléfono), `hrs` («1–2», «8–15»), `mes`
  (por mes), `unit` (`s0`: DEL CHEQUE · DE LA FIANZA · POR CARGA), `who`, `no`. `duration_min` = `mi`. `price_cents` = `p` (en `pct`
  guarda el % × 100, nunca dinero; en `cons` 0 = «Gratis»).
- **`health_settings`** (Tu herramienta de Salud, una fila por negocio; `TLDashCat.state` NEG-SALUD): `insurers text[]` (claves de
  `insurers`; mínimo 1 o `uninsured`, toast «Deja al menos un seguro o marca «Sin seguro».»), `uninsured bool` (`sin`),
  `cash_cents` (20–400 $, paso 5; `cash`), `langs text[]` (es · en · pt · ht), `tele bool`, `new_patients bool` (`nuevos`; apagado =
  `b.noNew`), `walk_wait_min` (0–180, paso 5) + `walk_wait_at` (para «HACE N MIN»), `sliding bool` (`escala`), `no_id bool` (`sinid`),
  `interp bool` (hueco #5), `video_url text` (hueco #4; https, validado), `updated_by/at`.
- **`insurers`** (catálogo, Super Admin › Catálogo; nunca en código): `key`, `state` (PA), `kind pub|priv`, `name jsonb` (`INS`:
  Medicaid (UPMC for You, Geisinger Family, AmeriHealth Caritas), Medicare, CHIP (niños), Highmark, Geisinger Health Plan, UPMC, Aetna,
  Cigna, UnitedHealthcare, Delta Dental, VSP, EyeMed, Community Care (salud mental)), `plans jsonb` (`PLANS`: medicaid upmcfy · geifam
  · ahc; medicare orig · adv; chip; priv = las privadas), `sort`, `hidden`.
- **`pro_settings`** (Tu herramienta de Pro, no legales; `TLProK.DEF`): `days` (1–90), `warranty_days` (0–365, paso 15; repair y
  digital), `estimate_first bool` (`est`), `insurers_n` (1–30; `cos`), `compares bool` (`cmp`), `payment_plan bool` (hueco #5),
  `urgent bool`. Lo legal (`cant`) ya vive en `category_attrs.cant`. El tipo (`TLProK.kind`: inm · doc · tax · injury · penal · fam ·
  law · fin · seg · repair · print · money · biz · digital · ofic · build · svc) **se deriva** de la primera subcategoría (`KS`).
- `license_kinds`: sembrar las de **NEG-SALUD** (hoy no hay ninguna): médico (MD/DO), asistente médico (PA-C), enfermera practicante
  (CRNP), enfermera (RN), terapeuta físico (DPT), terapeuta ocupacional, terapeuta del habla (CCC-SLP), psicólogo, consejero (LPC),
  trabajador social clínico (LCSW), dentista, higienista dental, optometrista, quiropráctico, farmacia, partera (CNM), nutricionista
  (LDN); emisor = la junta de PA, `registry_site/url` = el buscador oficial de licencias de PA (PALS) — **verificar el enlace exacto
  antes de sembrar**. Sumar a NEG-PRO `ea` («Agente registrado (EA) · IRS», sale en el staff de Rosario Tax y no está en `LIC`).
- `licenses.member_id uuid null references business_members` (licencia **de la persona**: «Licencia médica de Pennsylvania ·
  verificada · Vence en dic 2027», «Abogado con licencia en PA · Colegio de Abogados verificado»); `business_members.certification`
  deja de ser texto libre y apunta a la licencia. La cola Licencias del Super Admin ya las procesa (72 h).
- **`user_insurances`** («Tu seguro», como `user_vehicles`/`user_homes`): `user_id`, `kind medicaid|medicare|chip|priv|none`,
  `plan` (clave del catálogo), `member_last4 char(4)` (**solo los 4 últimos**, el prototipo guarda `'••• ' + num.slice(-4)`),
  `for_whom yo|hijo|otro` (`FOR`), `is_default`, `removed_at`. Demo (`ACC`): Medicaid · UPMC for You · ••• 4471 · Para mí.
  Invitado = «SOLO ESTA VISITA» (`s.segs`) → al entrar se guarda en la cuenta; sin sesión no se envía nada.

**0058 `citas_salud` (4j)** — `operations`: `insurance jsonb` (copia al enviar: `{kind, plan, last4, ok}`; MD ya prevé «Medicaid ·
aceptado»), `details.for yo|nino|otro`, `details.why nuevo|seguim|receta|papel|chequeo` (`WHY`, solo la clave), `details.interp`,
`details.video bool`, `details.price_label` (lo que la app le dijo: «$0 · CON TU SEGURO» / «Copago» / «$85 · SIN SEGURO»).
`status_detail` toma `seg` (no aceptan tu seguro) y `noshow`. **`op_private`** (texto sensible fuera de `operations`, ver §3):
`operation_id`, `note_enc bytea` (nota ≤300 «Ej.: dolor de garganta desde el lunes…» / Pro ≤300 «Ej.: mi green card vence en
noviembre…»), `purge_at`, `city_id`. `booking_policies`: Salud `expires_h` 2, `cancel_free_h` **24**, `response_min` 45 (30 en
Quisqueya, `APR`), `deposit_cents` 0; `noshow_fee_cents` (0 por defecto; Preguntas #3); `seg_hold_h` 2 («La hora sigue guardada 2 horas»).

**0059 `consultas_pro` (4l)** — reusar `estimates`/`estimate_lines` (0051): `estimates.valid_until` (+30 d, «VÁLIDO 30 DÍAS»),
`estimates.kind 'repair'|'written_total'`; `estimate_lines.line_kind fee|gov|credit|extra` (+ `optional bool` = «OPCIONAL · TU OK»,
`decision`), `hours_est text` («Estimado de N horas. Si pasa, te piden tu OK antes.»). **Derivados** (no editables): total = fee + gov
− credit + extras aprobados (`qTotal`). `operations.details.how ofi|video|tel` (`HOW`), `details.why nuevo|caso|carta|fecha`,
`details.hired_at`, `details.no_hire` («No, gracias · solo la consulta»), `details.pay` (`local` por defecto, Preguntas #1).
`status_detail` toma `quote` (TOTAL POR ESCRITO) y `hired` (CONTRATADO). `operations_appt_seq` da los números (prototipo: S-xxxx
Salud, P-xxxx Pro; en código = C-xxxx de citas, el rubro se lee de la categoría).

**0060 `ayuda_salud_pro` (4m)** — `help_requests.reason` amplía Salud (`neg-salud-rev.js RSN`: `cobro`(foto), `seguro`(foto),
`noseg`(foto), `interp`, `espera`, `trato`, `otro`) y Pro (`neg-pro-rev.js RSN`: `cobro`(foto), `ley`, `nohizo`, `fecha`,
`contesta`, `trato`, `otro`); `requested_solution` + `'claim_fix'` («Que corrijan el cobro a mi seguro») y `'finish'` («Que terminen
lo acordado»), `'notify'` («Solo quiero avisar»). `media.owner_kind 'help'` con `purge_at` (§3). `reviews.answers` guarda las preguntas
de §4m; `reviews.facts` los datos de la cita (seguro aceptado, pagado, total por escrito).

---

## 3. Privacidad, datos sensibles y dinero (motor común de las dos — Opus/high; revisión de seguridad obligatoria)

To'Latino **no es** un consultorio ni una oficina: no guarda historial médico, diagnósticos, medicinas, resultados, números de caso,
A-number, documentos ni estatus migratorio (MD regla 12 «Nunca papeles»). Pero el Booking recoge **seguro + motivo + nota + para
quién** y eso, junto al nombre del consultorio, ya es información de salud. Reglas del servidor (el cliente solo muestra):

| Dato | Se guarda | Quién lo ve | Nunca |
|---|---|---|---|
| Seguro del usuario | tipo + plan + **4 últimos** (`user_insurances`) | El usuario; el consultorio de **esa** cita mientras está viva | Número completo, foto de la tarjeta, Super Admin en listas |
| Motivo (`why`) | Solo la clave del chip | El negocio de la cita | Reseñas, avisos, analítica, El Compa |
| Nota libre (Salud y Pro) | `op_private.note_enc` (cifrada en columna, llave en secretos del entorno) | Miembros con permiso de citas de ese negocio | Logs, grabación de sesiones (enmascarar), correos, SMS, push, búsqueda, El Compa; se borra a los 30 d de `done/cx/exp` |
| «Para quién» hijo/otra persona | `details.for` | Negocio de la cita | Edad o nombre del menor en campos estructurados |
| Foto de factura (Ayuda Salud) / recibo o total (Ayuda Pro) | `media` privado, URL firmada corta | Negocio + revisor de To'Latino | Pública; se borra a los 90 d del cierre del caso |
| Reseña | Texto + respuestas | Público | Motivo, diagnóstico, medicinas, de qué trataba el caso (aviso fijo + filtro, §4m) |

- **Avisos neutros (Salud):** SMS, push y correo dicen «Tu cita del jue 24 a las 3:40 PM está confirmada. Detalles en la app.» —
  **sin nombre del consultorio ni del servicio** (una notificación de «Psiquiatría Nuevo Amanecer» en la pantalla bloqueada ya dice
  demasiado). Dentro de la app (con sesión) sí se ve todo. Pro: el aviso puede llevar el nombre de la oficina, nunca el trámite.
- **Super Admin:** ve el estado, fechas, seguro aceptado sí/no y montos; la nota y las fotos solo al abrir un caso de Ayuda o una
  disputa, con motivo obligatorio y `AuditEntry` (acceso de «vidrio roto»). Exportar CSV nunca incluye nota, motivo ni seguro.
- **Mensajes** (chat con `operation_id`): mismo trato que la nota (no entran a El Compa ni a analítica; aviso en el compositor
  «No mandes fotos de documentos ni resultados»).
- **Dinero Salud:** nada se cobra en la app. «Hoy, al enviar $0 · No se cobra nada al pedir la cita.» → «En la consulta: $0 /
  Copago / $85 · Lo que te toque según tu seguro» (`pay_mode 'local'`, `deposit 0`). El prototipo pide tarjeta («TARJETA · SOLO SI NO
  VAS»): ver Preguntas #3 (por defecto **no se pide** y nunca se cobra a Medicaid/CHIP).
- **Dinero Pro:** consulta «Pagas la consulta en la oficina; se descuenta si contratas el servicio.» Total por escrito: el prototipo
  dice «Se cobra el honorario al aceptar. Lo del gobierno lo pagas tú a la agencia.» / «Puedes pagarlo en plan de pagos. Se cobra al
  aceptar el primer pago.» → ver Preguntas #1 (por defecto **se acepta en la app y se paga a la oficina**; la tarifa del gobierno
  nunca pasa por To'Latino). `pct` («33 % si ganas, 0 si no»): nunca dinero en la app.
- **Guardianes nuevos:** ningún texto de `op_private` en tablas de avisos/correos/logs; ninguna plantilla de aviso de NEG-SALUD con
  `{negocio}` o `{servicio}`; `member_last4` siempre `^\d{4}$`; `purge_at` vencido = 0 filas; ninguna `payments` en operaciones
  NEG-SALUD; ninguna línea `gov` en un cobro.

---

## 4. Bloques

### 4h · Servicios, Tu herramienta, seguros y licencias (panel + admin + datos) — Sonnet/medium; migración y licencias Opus
**Datos:** migración 0057. Semilla de pruebas (`is_test`): los 35 de `TLSalud.B` (26 Pro + 9 Free; `shop` 28 · `solo` 7) y los 29 de
`TLPro.B` (todos Pro; `shop` 16 · `solo` 13) ya sembrados en Fase 1 → sumar `SVC`, `STAFF` (idiomas, especialidades, bio, semana,
licencia), `ABOUT`, `SHOP` (Óptica Visión Clara: lentes $89 · antirreflejo $149 · contacto $60), `health_settings`/`pro_settings`
desde `TLDashCat.state`, y los demos `demo-salud` / `demo-pro` (`demo-biz.js` L806, L874) con sus `req` (L831, L897).
**Panel (Lo que vendes):**
- **Servicios de Salud** (hueco #1): por servicio tipo (`cons` CONSULTA · `tele` POR VIDEO · `walk` SIN CITA · `free` GRATIS CON TU
  SEGURO · `proc` PRECIO FIJO), precio sin seguro, minutos, «Según tus ingresos» (`esc`: «Desde $20 · SEGÚN TUS INGRESOS»), con
  quién (`who`, solo miembros con licencia), IMPORTANTE (`no`), foto, ocultar, secciones («Consultas», «Niños», «Vista»…).
- **Servicios de Pro** (hueco #1): tipo (`cons` con `cred` · `fijo` honorario + gobierno = TOTAL · `hora` «$200/hora · ESTIMADO
  8–15 H» · `pct` «33 % · SOLO SI GANAS · SI NO, $0» · `walk` «$5 por firma» · `cotiza` «Desde $3,500 · TOTAL POR ESCRITO EN LA
  CONSULTA»), `rem` VIDEO O TELÉFONO, `mes` /mes, `who`, «lo que NO hacen» (`no`), foto, ocultar.
- **Tu herramienta** (`dash2-cat.js`, `TOOLS['NEG-SALUD'] = ['Seguros e idiomas','Insurance and languages','insurance']`,
  `TOOLS['NEG-PRO'] = ['Licencias y el total por escrito','Licenses and the total in writing','law']`): ver §6.
- **Citas** (`citaOf`): aprobar al instante (apagado, D4), responde en ~N min, cancelar gratis 24 h, «Pasa una cita» por profesional.
- **Equipo / Staff:** cada profesional con idiomas (ES · EN · PT · Kreyòl), especialidades, bio, semana propia y **su licencia**
  (`licenses.member_id`); solo quien tiene licencia verificada sale en «¿Con quién?» (`isDoc`: Dr./Dra./Lic. o PA-C/NP/DPT/CNM).
  Recepción («Marisol Peña · Recepción y seguros») sale en Staff pero no se elige.
**Derivados → filtros** (`filter_values`, recalculados al guardar, nunca editables): Salud `cita walk hoy seguro medicaid medicare
chip sinseguro escala sinid medesp esp interp tele noche finde ninos mujer mayor familia financia tienda online deposit y10`
(`medesp` = algún profesional con licencia habla `es`; `esp` = `langs` incluye `es`; `hoy` de la disponibilidad real; `tele` del
toggle o de algún servicio `tele`). Pro `cita walk gratis esp fijo hora plan remoto presencial urgente lic sabado noche online y10`
(`lic` = alguna licencia `valid`; `gratis` = algún `cons` a $0; `remoto` = algún `rem`; `presencial` = tiene dirección).
**Super Admin (ADM-NEG 360 › Lo que vende):** ocultar servicio (`itemOff['ss:'+id]` / `'ps:'+id`), pausar módulos (`citas`, `cot`,
`shop`), Tu herramienta solo lectura (`admRows`: resumen + licencias con su estado), verificar licencias de negocio y de persona
(`tl-adm-v1.biz[id].licOk`), Catálogo › Seguros (`insurers`). Auditoría de cada cambio.
**Mi cuenta (hueco #6):** «Mis seguros» (ver, elegir el principal, quitar = `removed_at`; texto «To'Latino no ve tu historial
médico. Tu seguro solo se usa para decirte si lo aceptan y cuánto pagas.»).
**Guardianes:** `svc_attrs` válido por tipo; ningún `filter_values` sin fuente; `pct` nunca con `gov`; ES/EN en todo texto nuevo.

### 4i · Ficha de Salud y «Tu seguro» (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-SALUD), hoja del servicio (`ash`, `salud: 1`), hoja **Tu seguro** (plantilla `hc`,
`s.hcs.salud`), tarjeta «Tu cita» en la ficha (`mineCard`).
- **Tu seguro** (`segVals`): TU SEGURO (Medicaid · Medicare · CHIP (niños) · Seguro del trabajo o privado · No tengo seguro; con
  «No tengo» la pista «Cada consultorio dice su precio sin seguro. Algunos cobran según tus ingresos o no piden papeles.») → PLAN →
  NÚMERO DE MIEMBRO · OPCIONAL («Está en tu tarjeta»; se guardan 4) → ¿PARA QUIÉN ES? (Para mí · Para mi hijo o hija · Para otra
  persona) → «Guardar seguro». Lista con EN TU CUENTA / SOLO ESTA VISITA, «Agregar otro seguro».
- **Compatibilidad** (`compat`, servidor): acepta → «Aceptan tu Medicaid · UPMC for You · no pagas la consulta» (pub) o «· pagas tu
  copago» (priv); no acepta → aviso que **no bloquea**: «No aceptan {seguro} · sin seguro $85 · o según tus ingresos»; sin seguro →
  «Sin seguro: consulta $85». Precio por servicio (`priceFor`): `$0 · CON TU SEGURO` · `Copago · SEGÚN TU PLAN` · `Desde $20 ·
  SEGÚN TUS INGRESOS` · `$85 · SIN SEGURO` (sin seguro elegido: «SIN SEGURO · CON EL TUYO PUEDE SER MENOS»); `walk` sin precio = Gratis.
- **Servicios** (por sección, «Por servicio»): meta `CONSULTA · 20 MIN`, `SIN CITA · ESPERA ~25 MIN AHORA`; botón «Booking» o «Cómo
  llegar» (walk). Notas (máx. 4): 911 · idioma («El médico habla español. Cada profesional dice sus idiomas en Staff.» / «Intérprete
  gratis por teléfono en cada consulta.» / «Personal bilingüe en recepción.») · escala (+ «No piden papeles ni seguro social.») ·
  «Booking es una solicitud: el consultorio revisa tu seguro y confirma la hora.» (o «No toma citas: llegas y te atienden por orden.»).
- **Hoja del servicio:** precio con/sin seguro, ¿Con quién? (nombre · ES, próxima hora, «HABLA ESPAÑOL» / «HABLA INGLÉS ·
  INTÉRPRETE GRATIS» / «CUALQUIERA: EL PRIMERO LIBRE»), IMPORTANTE, tarjeta Tu seguro, texto de pago, CTA «Elegir hora» / «Elegir hora
  del video» / «Cómo llegar».
- **Resumen:** fila «SIN CITA · AHORA · Espera ~N min · Si es grave, llama al 911. · HACE 6 MIN» (solo `walk` con espera fresca);
  Hoy: PRÓXIMA CITA / SEGUROS / IDIOMA o SIN SEGURO (o SIN CITA AHORA); hechos SEGUROS · SIN SEGURO · IDIOMAS · PAGO «Copago o precio
  en la consulta»; amenities (`AM`); «Cómo funciona» en 4 pasos; FAQ (¿Aceptan mi seguro? · 2 por tipo `TLSaludK.mid` · ¿Y si es una
  emergencia?), con tipos gen · urg · comm · ped · dent · eye · audio · mujer · partera · mente · psiq · ther · esp · bien · farm ·
  casa · trans · lab; `b.fq` y Tu página ganan.
- **Variantes** (`TLSaludK.post`): sin consultorio (`casa`, `trans`) = «Va a tu casa · hasta 20 mi» / «Te recoge en tu casa · hasta
  25 mi», «NO TIENE CONSULTORIO · TRABAJA EN TU CASA», «Zona donde trabaja», «CÓMO TRABAJA»; `casa` sin precio = «Evaluación en casa
  gratis»; 24 h = «ABIERTO 24 HORAS»; `noNew` = «Por ahora solo atiende a sus pacientes: si ya eres paciente, pide tu cita aquí.»;
  Free = «RESEÑAS DE VISITANTES · AQUÍ NO SE PIDE CITA POR LA APP», «Llama para tu cita» / «Ve directo»; idiomas extra «También en
  Kreyòl»; Oncología «Con referido de tu médico».
- **Tienda** (solo óptica): «Apartar» → motor de 4f-3, nota «Con tu seguro de la vista, te dicen cuánto cubre antes de pedir los
  lentes. Pagas al recoger.»
**Estados del cliente:** ninguno nuevo (la cita nace en 4j).

### 4j · Booking y cita de Salud + Panel — Sonnet/medium; privacidad (op_private, avisos) Opus/high
**Pantallas:** `APP-NEG-SALUD-BOOKING` (`s.sb`), `APP-NEG-SALUD-CITA` (`s.scitas`), Mi cuenta `USR-CITAS`/`USR-CITA`, Panel › Hoy.
- **Booking (3 pasos, mismas vistas `ab` que Auto/Hogar; desktop una página + columna sticky):**
  1 **Tu seguro** (OBLIGATORIO: «Agrega tu seguro · O ELIGE "NO TENGO SEGURO"») + ¿Para quién es? (con hijo: «Escribe su nombre y edad
  en la nota. Un adulto responsable va con el niño o la niña.»; otra persona: «La persona tiene que estar de acuerdo con la cita.») +
  ¿Para qué es la cita? «Opcional. Solo lo ve el consultorio; nunca sale en reseñas.» (MOTIVO: Algo nuevo · Seguimiento · Receta o
  resultados · Papeles (trabajo, escuela) · Chequeo) + nota 0/300 → 2 **Día y hora** (por profesional o «El primero libre»; 30 min;
  hoy desde +1 h, video desde +30 min; «Ese día no hay consulta. Elige otro.»; DURA · IDIOMA «20 min · habla español» / «· intérprete
  gratis si lo pides») → 3 **Revisa y envía** (911; RESUMEN SEGURO · PACIENTE · CUÁNDO · CON · IDIOMA · DÓNDE; PRECIO con «CON TU
  SEGURO»/«SIN SEGURO»; si no aceptan: «No aceptan… Puedes pedir la cita igual y pagar el precio sin seguro.»; CÓMO SE PAGA «Hoy, al
  enviar $0» / «En la consulta $X»; «Necesito intérprete · Gratis, por teléfono o en persona. Es tu derecho.» (solo si el profesional
  no habla español); Avisos por SMS; BUENO SABER: cancelar gratis 24 h · «Llega 15 minutos antes con tu tarjeta del seguro y una
  identificación.» · video «El enlace del video te llega por SMS 10 minutos antes.» · «To'Latino no da consejo médico…»; barra HOY
  PAGAS $0 · EN LA CONSULTA: $X → «Enviar solicitud»). Sin sesión → entrar y volver.
- **Servidor:** `enviarCita` con rubro `salud`: valida seguro (o `none`), copia `insurance` y `price_label`, nota a `op_private`,
  `pay_mode 'local'`, sin retención; máx. 3 pendientes; Free = techo 10/mes → «Llamar».
**Estados** (status + `status_detail`): `pend` PENDIENTE («Revisan tu seguro y confirman en unos 45 min. No se ha cobrado nada.») →
`ok` CONFIRMADA («Aceptaron tu seguro. Llega 15 min antes…») | **`seg` NO ACEPTAN TU SEGURO** («La hora sigue guardada 2 horas.
Puedes seguir con el precio sin seguro o buscar otro consultorio.»: «Seguir sin seguro · $85» → `ok` sin seguro · «Buscar otro
consultorio» → APP-NEG-CAT NEG-SALUD · «Cambiar de seguro» → Booking paso 1; a las 2 h sin elegir → `cx` por sistema) | `alt` TE
PROPONEN UN CAMBIO («Aceptar esta hora» / «Buscar otra») | `no` NO PUDIERON (4 horas libres) | `exp` SIN RESPUESTA (2 h) → `done`
CITA TERMINADA («Pagaste en la consulta: $X.», estrellas, «Volver a pedir cita», «Ayuda con la cita») | `noshow` | `cx` CANCELADA
(«Es gratis…»; < 24 h: «Faltan menos de 24 h. No se cobra nada, pero avisa al consultorio si puedes.»). Pasos: Solicitud enviada ·
Confirmada · Consulta/Video · Terminada. Acciones en pend/ok: Cambiar · Calendario · Cómo llegar (o Llamar si es video) · Cancelar.
**Panel (Hoy · detalle):** solicitud con seguro («Con Medicaid · primera vez», «Con CHIP · para Dylan», «Sin seguro · $95», «Por
video»), motivo, nota, intérprete; Confirmar / Otra hora / No puedo / **No aceptamos su seguro** (hueco #2) → `citaPaso`; el día:
**Pasó la cita** (`terminada`) / **No vino** (`noshow`, solo después de la hora). Video: el enlace sale de `health_settings.video_url`
o del profesional.
**Avisos** (neutros, §3): reusar `biz_cita`, `cita_ok`, `cita_alt`, `cita_no`, `cita_exp`, `cita_rec` (día antes); nuevos `cita_seg`
(«Tu consultorio no acepta tu seguro: elige en la app»), `cita_seg_fin` (se liberó la hora), `cita_video` (enlace, 10 min antes, SMS),
`biz_cita_seg_ok` (el cliente sigue sin seguro). **Super Admin:** ADM-TX › Citas con `seg`/`noshow` y la línea de tiempo (sin nota).
**Guardianes:** carrera de confirmación (dos miembros confirman a la vez); `seg` siempre libera la hora a las 2 h; ningún aviso de
Salud con nombre del negocio; punta a punta «tarjeta» = seguro no aceptado (RESPUESTA del prototipo).

### 4k · Ficha de Profesionales: licencia y total (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-PRO), hoja del servicio (`prof: 1`), `APP-NEG-LICENCIA` (ya existe, «Verificar»).
- **Tarjeta «¿PUEDE HACERLO POR LEY?»** (`licCard` = `tarjetaLey` ya en código): licencia verificada (`licL`), qué permite (`LIC[k][2]`)
  y «No puede: {cant}»; sin licencia → «LO QUE NO HACE». En la hoja, la licencia **de la persona elegida** (`cert`).
- **Precio = total** (`priceFor`): `fijo` con gobierno → «$815 · HONORARIO $350 + GOBIERNO $465»; hoja «EL TOTAL»: «Honorario de
  {negocio} · $350» · «Tarifa del gobierno (se paga aparte, a la agencia) · $465» · «Total · $815». `cons` «$75 · SE DESCUENTA SI LO
  CONTRATAS» / «Gratis»; `hora`; `pct`; `cotiza`; `walk` «$4.99». Meta `PRECIO FIJO · VIDEO O TELÉFONO`, `SE COTIZA · 60 MIN`.
- **Servicios** notas (máx. 5): «Nadie te garantiza un resultado. Nadie puede prometerte una visa, una green card, un reembolso ni
  ganar un caso.» · licencia · «No puede: …» · «El precio dice el total: el honorario y lo que se paga al gobierno, por separado.» ·
  «Booking es una solicitud: la oficina confirma la hora. No se cobra nada al pedirla.»
- **Resumen:** Hoy PRÓXIMA CONSULTA · LICENCIA Verificada · CONSULTA $X (walk: SIN CITA · Hasta las 7 PM · DESDE); hechos LICENCIA ·
  NO PUEDE · IDIOMAS · PAGO («Tarjeta, efectivo · plan de pagos»); amenities; «Cómo funciona» 4 pasos; FAQ (¿Puede hacer mi trámite
  por ley? · 2 por tipo `TLProK.faq` · ¿Me garantizan el resultado?): inm («¿Cuánto es lo del gobierno?» «Cambia cuando USCIS lo
  cambia.» · «¿Cuánto tarda mi caso?» sin prometer fechas), doc («¿El notario me puede llenar los papeles de inmigración?» No), tax
  (adelanto del reembolso con costo por escrito; ITIN con CAA), injury («Tu estatus no cambia tu derecho a reclamar»), penal, fam,
  law, fin; no legales con 4 preguntas propias (seg, repair, print, digital, build, biz).
- **No legales** (`!legal`): sin textos de abogado: LICENCIA → LISTO EN / COMPAÑÍAS / PRESUPUESTO, «PRÓXIMA CITA», «servicios
  calificados», línea «Nada se cobra sin tu OK.», pasos propios (seg: «Comparan 6 compañías… El precio final lo pone la compañía.»;
  repair: «Lo revisan gratis y te dicen el precio antes de arreglar.»; print: «Te mandan la prueba: nada se imprime sin tu OK.»).
- Sin oficina (`ofic`, Rev. Carmen Soto) = «Va a tu boda o evento · hasta 40 mi»; Free = «AQUÍ NO SE PIDE CITA POR LA APP».

### 4l · Consulta, «El total, por escrito» y contratación (Pro) + Panel — **Opus/high** (acuerdo con dinero y servicios regulados)
**Pantallas:** `APP-NEG-PRO-BOOKING` (`s.pb`), `APP-NEG-PRO-CITA` (`s.pcitas`), Mi cuenta, Panel › Hoy y el constructor (hueco #3).
- **Booking:** 1 **Tu trámite** (¿PUEDE HACERLO POR LEY? con la licencia de quien te atiende y «No puede: …»; ¿Cómo quieres la consulta?
  En la oficina · Por video · Por teléfono (solo si `rem`); ¿Qué pasa con tu trámite? SITUACIÓN Primera vez · Ya tengo un caso · Me
  llegó una carta · Tengo fecha límite (con fecha: «Escribe la fecha límite en la nota. Si es en menos de 3 días, llama también a la
  oficina.»); nota «Opcional. Solo lo ve la oficina; nunca sale en reseñas.») → 2 **Día y hora** → 3 **Revisa y envía** (SERVICIO ·
  CUÁNDO · CÓMO · CON · LICENCIA · DÓNDE; CÓMO SE PAGA «Hoy, al enviar $0» + consulta / «SOLO SI GANAS: Si no ganas, no pagas nada.» /
  «Honorario $350 a {negocio} · gobierno $465 aparte, a la agencia.» / «Te dan el total por escrito antes de empezar.»; BUENO SABER:
  cancelar gratis 24 h · «Antes de contratar, la oficina te da el total por escrito. Nada se cobra sin tu OK.» · «Trae tu
  identificación y los papeles de tu trámite.» o «El enlace o la llamada te llegan por SMS 10 minutos antes.» · «To'Latino no da
  consejo legal…»; tarjeta «TARJETA · NO SE COBRA HOY» → Preguntas #1).
**Estados:** `pend` («Confirman la hora en unos 45 min. No se ha cobrado nada.») → `ok` | `alt` | `no` | `exp` → (Pasó la consulta)
→ si el servicio es `cons`/`cotiza`/`hora` (`quoteFirst`): **`quote` TOTAL POR ESCRITO** («Te mandaron el total: $X» · «Revísalo con
calma. Nada se cobra hasta que lo aceptes.»; DE {OFICINA} · VÁLIDO 30 DÍAS; por {persona}; cuadro «Nadie te garantiza un resultado.
Este total es lo que cobran por el trabajo, no una promesa de resultado.»; LO QUE INCLUYE: HONORARIO (precio cerrado o «Estimado de
N horas. Si pasa, te piden tu OK antes.») + extra «OPCIONAL · TU OK» con casilla («Te lo piden aparte. Puedes traerla tú.»); filas
Honorario · Gobierno (se paga aparte, a la agencia) · Crédito de la consulta −$75; TOTAL POR ESCRITO; «Aceptar y contratar» ·
«Llamar para preguntar» · «No, gracias · solo la consulta») → **`hired` CONTRATADO** («Tu trámite está en manos de {persona}» ·
«Total por escrito: $X. Si algo cambia, te piden tu OK primero.»; Lo que pagas: Honorario «A {oficina}» · Gobierno «Lo pagas tú a la
agencia» · crédito · extra «Con tu OK»; «Mensaje a la oficina» · «Ayuda con el trámite») → `done` TERMINADO («Trámite terminado» /
«No contrataste · Solo pagaste la consulta: $75.»; estrellas; «Otra consulta»). `fijo`/`pct` pasan de `ok` a `hired`. Vence el total a
30 días → `done` sin contratar. Pasos: Solicitud enviada · Confirmada · Consulta · Total por escrito · Contratado · Terminado.
**Panel (hueco #3, componer sobre Estimado.tsx):** en el detalle de la consulta, «Mandar el total por escrito»: servicio de origen
(plantilla = el primer `fijo` con gobierno de la oficina, como `quoteOf`), honorario, gobierno (de «EL TOTAL, POR ESCRITO»), crédito
automático si `cred`, horas estimadas (`hora`), extras opcionales; total calculado por el servidor; versión nueva = `superseded`.
Pasos: **Pasó la consulta**, **Terminó el trámite**; «Cambio que pide tu OK» = línea `extra` nueva (decide el cliente).
**Servidor:** `mandarTotal`, `aceptarTotal(userId, num, extrasOk[])` (registra la aceptación con hora, versión e IP — es el
«acuerdo» del cliente), `noContratar`, `terminarTramite`; todo con `operation_events` (`total_sent`, `total_accepted`, `no_hire`,
`case_done`). **Avisos:** `biz_cita`/`cita_ok`/… reusados; nuevos `pro_total` (cliente, SMS), `pro_total_vence` (a 25 d), `biz_pro_ok`
(contrató, con extras), `biz_pro_no`, `pro_terminado`. **Super Admin:** ADM-TX › Consultas: versiones del total, aceptado vs. pagado
(dato para «Cobró el total que dijo»). **Guardianes:** total derivado = Σ líneas; ninguna línea `gov` cobrada; aceptación inmutable;
punta a punta consulta $75 con crédito → total → extra rechazado → contratado → terminado.

### 4m · Reseñas, Ayuda (Salud + Pro), Super Admin y documentación — Sonnet; ayuda con dinero y filtro de datos Opus
- **Reseña Salud** (`APP-NEG-RESENA`, `TLSaludRev` en `revWVals`): verificada = cita `done`. Dato de la cita (no se edita): SERVICIO
  · SEGURO Aceptado/Sin seguro · PAGASTE · CON («El seguro y lo que pagaste salen de tu cita. Nunca se publica el motivo de la
  consulta.»). Preguntas: ¿TE ENTENDIERON EN TU IDIOMA? (El médico habló español · Con intérprete · No me entendieron) · ¿ESPERASTE LO
  QUE DIJERON? (A la hora · Hasta 30 min · Más de 30 min) · ¿TE EXPLICARON? · ¿COBRARON LO QUE DIJERON? (Sí · Cobraron algo más) ·
  TRATO; visitante también ¿ACEPTARON TU SEGURO? (Sí · No · Fui sin seguro). LO QUE IMPORTA EN SALUD (6 barras: ACEPTARON TU SEGURO ·
  TE ENTENDIERON EN TU IDIOMA · ESPERASTE LO QUE DIJERON · TE EXPLICARON · COBRARON LO QUE DIJERON · TRATO); hechos «Aceptaron su
  seguro» / «No aceptaron su seguro · avisaron antes», «El médico habló español», «Esperó N min» (rojo > 30), «Cobraron algo que no
  dijeron». Placeholder fijo: «No escribas diagnósticos, medicinas ni resultados. Cuenta cómo te atendieron.»
- **Reseña Pro** (`TLProRev`): verificada = consulta `done`; dato TOTAL POR ESCRITO · PAGASTE «· lo que dijo» / «No contrataste».
  Preguntas: ¿COBRÓ EL TOTAL QUE DIJO? (Sí · Cobró más) · ¿HIZO LO QUE DIJO QUE PODÍA? (Sí · Ofreció algo que no podía) · ¿TE EXPLICÓ?
  · ¿EN TU IDIOMA? · ¿CUMPLIÓ LA FECHA? (Sí · Un poco tarde, avisó · Tarde, sin avisar) · TRATO. LO QUE IMPORTA EN UN TRÁMITE (6 barras).
  Placeholder: «No escribas datos de tu caso, números de expediente ni documentos. Cuenta cómo te atendieron.»
- Las dos: ≤2 ★ → «La reseña no devuelve dinero…» → «Ir a Ayuda con la cita / con el trámite». **Filtro del servidor** (además de
  `PII`): lista de términos (medicinas, diagnósticos, A-number `A\d{8,9}`, números de caso USCIS `[A-Z]{3}\d{10}`) → «Quita datos de
  salud o de tu caso: la reseña no se publica con ellos.»; reporte «Tiene datos privados» en la cola de reseñas.
- **Ayuda Salud** `APP-NEG-SALUD-AYUDA` → `-ESTADO` (vistas `pe`/`ps`, `shelp`): MOTIVO (Me cobraron algo que no dijeron · Cobraron
  a mi seguro algo que no pedí · No aceptaron mi seguro después de confirmar · No había intérprete · Esperé mucho más de lo que dijeron
  · Mal trato · Otra cosa) + ¿Qué pasó? ≥15 («Ej.: me dijeron $0 con Medicaid y me llegó una factura de $60…») + ¿CUÁNTO TE COBRARON DE
  MÁS? · OPCIONAL + «Foto de la factura · obligatoria» en cobros («Tapa los datos médicos si aparecen; solo hace falta el cobro.», 0/4)
  + ¿Qué quieres? (Que lo revisen y me devuelvan · Que corrijan el cobro a mi seguro «Te mandan la factura corregida» · Solo quiero
  avisar) → RESPONDE EN 24 H → ACEPTÓ («Vuelve a tu tarjeta en 3–5 días hábiles.» / «Te mandan la factura corregida en 10 días.») ·
  PROPONE OTRA COSA («Devolverte $30») · NO ACEPTÓ («El cobro es lo que tu seguro no cubre…») → «Pedir revisión a To'Latino» → EN
  REVISIÓN (48 h) → LISTO. Sin respuesta 24 h → To'Latino. Una abierta por cita. Dinero: Preguntas #4.
- **Ayuda Pro** `APP-NEG-PRO-AYUDA` → `-ESTADO` (`phelp`): Cobró más del total por escrito · Ofreció algo que no podía hacer por ley ·
  No hizo lo acordado · Perdió una fecha o un documento · No me contesta · Mal trato · Otra cosa; foto «del recibo o del total por
  escrito · obligatoria» en cobros («Tapa los números de tu caso si aparecen»); Que me devuelvan · Que terminen lo acordado («Sin
  cobrarte más») · Solo quiero avisar; con «ley»: «Si te ofrecieron un trámite de inmigración sin ser abogado ni representante
  acreditado, también puedes reportarlo a la Fiscalía de Pennsylvania.» Entradas: consulta `hired` o `done`, reseña ≤2 ★.
- **Super Admin:** Colas › Ayudas escaladas (motivos nuevos; «ley» marca el negocio para revisar licencia y `cant`); Licencias
  (negocio y persona; vencidas → aviso 30 d antes y la tarjeta baja a «EN REVISIÓN»); Transacciones (Citas Salud sin nota, Consultas
  Pro con total); Notificaciones (plantillas nuevas ES/EN, neutras en Salud); Catálogo (seguros); Configuración (2 h `seg`, 24 h
  cancelar, 30 d total, 24/48 h ayuda, días de borrado de §3); Analítica (% seguro aceptado, % `seg`, % `noshow`, tiempo de respuesta,
  % consultas → contratado, «cobró el total», motivos de ayuda).
- **`docs/ayuda/`** (regla 9, ES/EN): tu-seguro, booking-salud, tu-cita-salud (seguro no aceptado, video, intérprete), consulta-pro,
  total-por-escrito, licencias-que-puede-hacer (notario ≠ abogado), ayuda-salud, ayuda-tramite; negocio: tu-herramienta-salud,
  tu-herramienta-pro (licencias, el total), panel-total-por-escrito, privacidad-de-datos-de-salud.
- **Triángulo** (regla 8): cada toggle de Tu herramienta → ficha y Buscar (`summary` de `dash2-cat`: «7 seguros · sin seguro $85 ·
  espera ~20 min · según ingresos · sin papeles · ES · EN» / «2 licencias verificadas · 1 en revisión») → Super Admin lo ve y oculta.

---

## 5. Página de categoría y ficha (lo específico)
Ya en código (`paginas.json`, `Categoria.tsx`, `buscar.ts`); aquí solo se conectan los derivados y el Booking:
- **Salud** (`TLSalud`): filas `sint` «¿Qué necesitas?» (fiebre · muela · chequeo · embarazo · ansiedad · vista · análisis · espalda →
  subcategorías), `seg` «Tu seguro» (chips `i:medicaid i:medicare i:chip i:privado i:sin` → tags), `quien` «Para quién» (`w:ninos
  w:mujer w:mayor w:familia`). 7 capítulos (`SUBG`, 58 subcategorías). Grupos: ORDENAR · TU SEGURO (seguro, medicaid, medicare, chip,
  sinseguro, escala, sinid) · TE ENTIENDEN (medesp, esp, interp) · CUÁNDO (hoy, walk, tele, noche, finde) · PARA QUIÉN · NEGOCIO.
  `QUICK5`: open, hoy, medicaid, medesp, sinseguro. Stats «CITA HOY» (`hoy`). Banda «¿No puede esperar a una cita?» → filtra
  «Clínica sin cita y urgencias». Tarjeta: `eta` («Cita hoy · 3:40 PM», «Sin cita · espera ~25 min», «Mañana · 10:15 AM · o video
  hoy»), `fee` («Medicaid y Medicare · sin seguro $85»), `offer`, chip «El médico habla español». Con «Tu seguro» guardado, la
  tarjeta dice «Aceptan tu Medicaid» o «No aceptan tu seguro» (servidor). Farmacias, cuidado en casa y transporte = Free sin Booking.
- **Pro** (`TLPro`): filas `tram` «¿Qué trámite necesitas?» (green card · ciudadanía · ITIN · impuestos · acta · notarizar · pasaporte
  dominicano · accidente · LLC · divorcio), `lic` «¿Quién puede hacerlo por ley?» (`l:abogado l:acreditado l:cpa l:ptin l:notario l:ata
  l:agente` → `licenses.kind`), `como` «Cómo te atiende» (gratis, remoto, fijo, plan). 7 capítulos (60). Grupos: ORDENAR · LICENCIA ·
  PRECIO (gratis, fijo, hora, plan) · CÓMO (esp, remoto, presencial, walk, urgente) · CUÁNDO (sabado, noche) · NEGOCIO. `QUICK5`: open,
  lic, gratis, esp, remoto. Stats «CONSULTA GRATIS». Tarjeta: `eta`, `fee` («Consulta $75 · se descuenta si lo contratas»), `cant`
  (**sale en la tarjeta**: «No garantiza que aprueben tu caso»), chip de licencia (`lib/tarjeta.ts` ya lo hace).
- `hoy` (Salud) y la espera sin cita son **derivados** (disponibilidad real / `walk_wait_at`); se cachean, nunca se editan.

## 6. «Tu herramienta» (Panel › Lo que vendes, `dash2-cat.js`)
- **Salud · «Seguros e idiomas»:** KPIs SEGUROS · SIN SEGURO · IDIOMAS; PÚBLICOS y PRIVADOS (toggle por seguro del catálogo);
  SIN SEGURO «Atiendes sin seguro · Tu página dice el precio de la consulta.» + paso «Consulta sin seguro · El precio completo, sin
  cargos escondidos.» (−/+5, 20–400); IDIOMAS EN LA CONSULTA (Español · English · Português · Kreyòl, mínimo 1); «Consulta por video ·
  Sale el filtro «Telemedicina» en Buscar.»; «Aceptas pacientes nuevos · Cualquiera puede pedir cita. / Solo tus pacientes piden
  cita.»; si toma sin cita: «Espera ahora sin cita · Cámbiala cuando se llene; sale en tu página y en Buscar.» (−/+5, 0–180); QUIÉN
  PUEDE VENIR «Precio según tus ingresos» · «Sin papeles ni seguro social · Solo nombre y una forma de contactar.»; nota «En Buscar y
  en tu página: «Acepta Medicaid, Medicare, CHIP y 4 más».» + huecos #4–#5 (enlace del video, intérprete, para quién). Resumen de la
  fila: `7 seguros · sin seguro $85 · ES · EN` (`summary`).
- **Pro · «Licencias y el total por escrito»** (legales): TUS LICENCIAS (VERIFICADA / EN REVISIÓN / NO VERIFICADA, número, Quitar) ·
  AGREGAR UNA LICENCIA «se verifica antes de salir» · LO QUE NO HACES · SALE EN TU PÁGINA (3 `CANT`) — **ya en código** — + **EL TOTAL,
  POR ESCRITO** (por servicio fijo con gobierno o > $100: «Honorario $350 + gobierno $465 = total $815», paso «gob. $» −/+5; al
  guardar, el total de la ficha cambia: `govSync`) + nota «Nadie te garantiza un resultado. En EE. UU. un notario no es abogado: tu
  página lo dice.» **No legales:** seg «Compañías con las que trabajas» (1–30) + «Comparas precios por el cliente»; resto «Listo en» /
  «Entregas en» (1–90 d) + «Garantía» (repair/digital, 0–365 paso 15, «0 = sin garantía») + «Presupuesto antes de empezar · Nada se
  cobra sin el OK del cliente.» Resumen: `2 licencias verificadas · 1 en revisión` / `Listo en 2 días · presupuesto antes`.
- En código: `health_settings` / `pro_settings` + server actions; el total por escrito lee el gobierno vigente y lo **copia** en la
  línea `gov` (cambiar la tarifa no cambia un total ya mandado).

## 7. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md`)
1. **¿Pro cobra en la app?** El prototipo cobra el honorario al aceptar (y el primer pago del plan). En PA las reglas de conducta de
   abogados prohíben **compartir honorarios con quien no es abogado** (una comisión de To'Latino sobre un honorario legal podría
   serlo) y los anticipos no ganados van a cuenta fiduciaria (IOLTA); la Ley federal de reparación de crédito (CROA) prohíbe cobrar
   antes de terminar el servicio; remesas, cambio de cheques, fianzas y seguros son actividades con licencia propia — **sin verificar
   con abogado**. Default: en Fase 4 **nada de Pro se cobra en la app** (`pay_mode 'local'`, sin tarjeta, sin comisión): la app
   registra la consulta, el total por escrito y la aceptación; se paga a la oficina. Interruptor por tipo (`pay_in_app`, apagado) para
   los no legales (repair, print, digital, build), que podrían usar el motor de 4d más adelante. Ítem en `LAUNCH-CHECKLIST.md`.
2. **¿Somos «socio comercial» (HIPAA) de los consultorios?** Recoger motivo, nota y número de seguro para un consultorio puede
   convertir a To'Latino en *business associate* (contrato BAA, controles, aviso de brechas) — **sin verificar**. Default: minimizar
   (§3: motivo solo como clave, nota cifrada y borrada a 30 d, seguro con 4 dígitos, avisos neutros, sin datos en analítica ni El
   Compa) y no ofrecer historial, resultados ni archivos médicos; consulta legal antes de producción (`LAUNCH-CHECKLIST.md`).
3. **Tarjeta «SOLO SI NO VAS» (Salud).** Las reglas federales de Medicaid no permiten cobrar al paciente de Medicaid por faltar a una
   cita. Default: **Salud no pide tarjeta** (`noshow_fee_cents 0`, se oculta «TARJETA · SOLO SI NO VAS»); si un consultorio la activa
   más adelante, el servidor nunca la aplica a Medicaid/CHIP. Pro: se oculta «TARJETA · NO SE COBRA HOY» mientras rija #1.
4. **Devoluciones de Ayuda cuando se pagó en el consultorio/oficina.** El prototipo dice «Vuelve a tu tarjeta en 3–5 días hábiles»,
   pero ese dinero nunca pasó por To'Latino. Default: la devolución la hace el negocio; el estado dice «{negocio} te devuelve $X» y el
   cliente confirma «Me lo devolvieron»; To'Latino media y puede sancionar (regla 10), no paga de su bolsillo. Reversible si algún día
   Salud/Pro cobran en la app.
5. **Nota libre y estatus migratorio (Pro).** El ejemplo «mi green card vence en noviembre…» roza MD regla 12. Default: nota opcional
   con aviso «No escribas números de caso, A-number ni documentos.», cifrada y borrada a 30 d; nunca subida de documentos (el
   prototipo no la tiene; ITIN y pasaporte se llevan en persona).
6. **«No pagas la consulta» con Medicaid/CHIP.** Es una promesa que depende del plan (algunos cobran copagos pequeños). Default:
   mantener el texto del diseño solo en servicios `free` y en `cons` cuando el consultorio marca «Sin copago con Medicaid/CHIP» (toggle
   compuesto, encendido en la semilla); si no, «Aceptan tu Medicaid · te confirman si pagas algo». El estado `seg` es la red.
7. **Enlace del video** (hueco #4). To'Latino no aloja videollamadas (no está en PLAN §8 y son datos de salud). Default: el
   consultorio pega su enlace propio (https), se manda por SMS 10 min antes solo al paciente; sin enlace, el servicio `tele` no se
   puede publicar.
8. **Reseñas de salud mental, adicciones, fertilidad.** Una reseña con nombre ya dice que la persona fue. Default: en Salud la reseña
   sale con nombre e inicial (como todas) pero **no aparece en ningún perfil público ni actividad** del usuario; opción «Publicar sin mi
   nombre» compuesta para los capítulos `mente` y `mujer`; reversible.
9. **Licencias de salud por persona** (no hay ninguna NEG-SALUD en `license_kinds`). Default: sembrar §2 con el registro oficial de PA
   (enlace exacto verificado antes), verificación manual en la cola (72 h), y quien no tiene licencia `valid` no sale en «¿Con quién?»
   (sí en Staff como «Recepción»). EA se suma a Pro.
10. **Etiqueta `ata` en el panel.** `dash2-cat.js LIC0.ata` dice «Preparador de impuestos (ATA)» y `neg-pro.js LIC.ata` «Traductor
    certificado» (ATA = American Translators Association). Default: «Traductor certificado» (así está la semilla); `LIC0` es un error
    del prototipo.
11. **Espera sin cita** (`walk_wait_min`): ¿quién la mueve y cuánto vale? Default: el consultorio en Panel › Hoy (−/+5); si no la toca
    en 60 min se oculta («Espera no actualizada») — igual que la fila del lavado (fase4-hogar-auto #8).
12. **Subcategorías 59 «Exámenes médicos laborales y DOT» y 60 «Veterinario»** están en la base y en TAX pero no en el prototipo.
    Default: 59 entra al capítulo `gen` con tipo `gen`; 60 queda fuera de los capítulos de Salud y se propone moverla (no es medicina
    humana; Preguntas al fundador), sin borrar (regla taxonomía 1).
13. **«Ofreció algo que no podía hacer por ley».** Default: además de la Ayuda, abre una tarea en la cola Licencias para revisar el
    negocio (posible «notario» dando consejo migratorio) y nunca se publica el nombre de quien reporta.

## 8. Orden, dependencias y pruebas
4h → 4i → 4j → 4k → 4l → 4m. 4j y 4l dependen de 4h (servicios, licencias de persona, settings); 4l reusa el constructor de 4d;
4m depende de 4j/4l (reseña verificada y ayuda desde la cita). §3 (privacidad) se construye **dentro** de 4h/4j, no al final. Cada
bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9 dispositivos con la `RESPUESTA` simulada
igual que la barra del prototipo: Salud «El consultorio responde» (ok · rechaza → no · nada → exp · cambio → otra hora · tarjeta →
**seguro no aceptado**), «Pasa el tiempo», «Pasó la cita»; Pro «La oficina responde», «Pasó la consulta» (cambio → extra que pide tu
OK), «Terminó el trámite»; Ayuda «El consultorio responde», «Pasan 24 h», «To'Latino decide» — en la app eso lo hacen el panel y los
barridos del servidor (SP «Pasos del servicio», «Plazos sin respuesta»). Revisión de seguridad (regla 5) de 4h/4j/4l/4m antes de
cerrar. Capturas teléfono + desktop de cada pantalla compuesta (§1) y su línea en `docs/REVISION.md`.
