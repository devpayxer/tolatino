# Fase 4 · Hogar + Auto — plan de construcción extraído del prototipo (6 nov 2026)

Fuentes (todas en `docs/diseno/pantallas/datos/` salvo indicación): `neg-auto.js` (TLAuto), `neg-auto-listing.js` (TLAutoL),
`neg-auto-book.js` (TLAutoBook), `neg-auto-flow.js` (TLAutoFlow), `neg-auto-pre.js` (TLAutoPre), `neg-hogar.js` (TLHogar),
`neg-hogar-listing.js` (TLHogarL), `neg-hogar-book.js` (TLHogarBook), `neg-hogar-flow.js` (TLHogarFlow), `neg-hogar-pre.js`
(TLHogarPre), `neg-hogar-mas.js` (TLHogarMas), `neg-hogar-plan.js` (TLHogarPlan), `neg-hogar-kind.js` (TLHogarK),
`neg-hogar-rev.js` (TLHogarRev), `neg-cita-help.js` (TLCitaHelp: `ahelp`, TLAutoRev, TLApartar), `dash2-asv.js` (TLASvc),
`dash2-cat.js` (TLDashCat, `blocksB`), `dash2-svc.js` (`citaOf`), `demo-biz.js` (`demo-auto`, `demo-hogar`), `adm-data.js`;
Panel v2 / Super Admin / Mi cuenta (.dc.html); `docs/diseno/referencia/memoria-del-diseno.md` (MEM, líneas 1525–1631 Auto,
1732–1835 Hogar, 935–940 M1b); `docs/diseno/entrega/modelo-datos.md` (MD); `solo-prototipo.md` (SP).
Esto es un resumen de trabajo; manda el prototipo. Nada de este archivo se ha construido.

## Tesis y líneas fijas (verbatim, en buscador, ficha, solicitud y confirmación)
- **Auto:** «¿cuánto cuesta de verdad y cuándo me lo devuelven?» · línea **«Nada se hace ni se cobra sin tu OK.»**
  (`TLAuto.line`), sub: «El taller te da el estimado antes de tocar el carro. Lo apruebas en la app y solo se cobra lo aprobado.»
- **Hogar:** «¿cuándo llega y cuánto cuesta de verdad?» · línea **«Precio completo antes de empezar. Si algo cambia, te
  pregunta primero.»** (`TLHogar.line`), sub: «Cada servicio dice cómo cobra: visita, precio fijo, por hora o presupuesto…».
- Emergencia (nunca se suaviza): **«Si huele a gas, hay chispas o humo, sal de la casa y llama al 911.»** (`LINE911`, neg-hogar-mas).
- Decisión del fundador (MEM 1741): **Ley HIC de PA (1/3 de anticipo, 3 días) no se muestra.** (ver Preguntas abiertas #6).

---

## 0. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué en Fase 4 |
|---|---|---|
| `operations` (kind ya admite `appointment`, `quote`, `hold`, `rental`, `visit`), `operation_lines`, `operation_events`, `change_proposals` | migr. 0023, 0024 | Visita/cita de Auto y Hogar = `appointment` (C-48xx); pre-estimado/presupuesto = `quote`; renta = `rental`; apartado = `hold` |
| `items` (module `svc`/`renta`/`shop`/`plan`, `unit` dia/mes/hora, `stock_left`), `item_sections`, `svc_opts`, `is_extra`, `duration_min`, `price_from` | 0022, 0043 | Servicios de Auto/Hogar (+ columnas de tipo, ver §2) |
| `booking_policies` (auto_approve, response_min, expires_h, deposit_cents, cancel_free_h, tolerance_min, staff_pick) | 0043 | Reglas de citas; se amplía el depósito por tipo/sección/«trabajo grande» |
| `business_members` (`kind renter`, `chair_seat`, `chair_auto`, `chair_deposit_cents`, `takes_bookings`) + `member_payout_accounts` | 0043, 0046 | Bahía rentada (Auto, `m:'bahia'`) y técnico de la red (Hogar, `m:'tec'`) = la «silla» de 3d |
| `help_requests` (+ amount, decision, offer, refunded, closed_by) | 0031, 0047 | Ayuda con la cita/visita (motivos nuevos) |
| `payments` / `refunds` / `fee_rules` (`cita` 8 %) | 0034 | Retener / cobrar / liberar / devolver; **ojo: `unique (operation_id, kind)` impide varias retenciones por operación** |
| `user_addresses` (geo PostGIS, city_id, instructions) | 0025 | Base de **Mi casa** (la zona sale de ST_DWithin con `businesses.geo` + `service_radius_mi`) |
| `businesses.service_radius_mi`, `filter_values` (GIN), `category_attrs`, `operation`, `geo` (GIST) | 0008 | Zona, tags de filtro, chips de la tarjeta |
| `media.owner_kind 'appointment'` | 0044 | Fotos del Booking; se suman `estimate_line`, `request` |
| `lib/citas.ts` | `contexto`, `gente`, `ocupadas`, `huecos`, `preparar`, `puede` (techo Free), `enviarCita` (candado `pg_advisory_xact_lock('cita:'+id)`, `client_key`, depósito retenido antes de guardar, `liberar` en rollback), `citaVista`, `proximas`, `alertaHora` | Motor de disponibilidad (Hogar = franjas de 2 h), patrón de envío idempotente |
| `lib/citas-flujo.ts` | `vencerCitas`, `citaPaso` (`PasoCita` confirmar/otra/nopuedo/llego/nollego/terminada), `citaCambio`, `citaCliente` (cancelar/aceptar/nogracias/tarde), `avisarCliente`, `avisarNeg`, `horaLibre` | Se amplía con los pasos de taller/visita (§4c) |
| `lib/citas-panel.ts` | `StCita`, `citasVivas`, `citasPendientes`, `citasLista`, `citaPanel` | Panel › Hoy / Citas con sub-estados nuevos |
| `lib/servicios.ts` | `serviciosPanel`, `conOpciones`, `POL_DEF` | Panel › Servicios |
| `lib/cobros.ts` | `comision`, `tarjetaDe`, `registrarRetencion`, `cobrarOperacion`, `liberarOperacion`, `repararPagos`, `devolverPago`, `pagoDe` | Dinero; **generalizar** a «por pago» (hoy buscan un solo pago `kind in ('full','deposit')`) |
| `lib/pagos/pasarela.ts` | `retener` (manual capture, on-session), `cobrar(pi, centavos, comision)` (**ya hace captura parcial** con `amount_to_capture`), `liberar`, `devolver`, `cobrarDirecto` (off-session, sin destino), `cliente`, `cuentaCrear` (mcc por defecto **5812 restaurante**) | Falta: verificación $0 (SetupIntent), retención off-session con destino, cobro off-session con destino (planes) |
| `lib/ayuda-cita.ts` | `MOTIVOS_CITA`, `CON_FOTO`, `pedirAyudaCita`, `responderAyudaCita`, `citaAyudaCliente`, `ayudasCitasNegocio`, `avisarAyudaCita` | Ayuda Auto/Hogar |
| `lib/sillas.ts` | `invitarCobro`, `cobroSilla`, `conectarSilla` | Cuenta de cobro de la bahía / del técnico |
| `lib/licencias.ts`, `lib/resenas.ts`, `lib/mensajes.ts`, `lib/avisos.ts`, `lib/direcciones.ts`, `lib/subir-foto.ts` | | Certificaciones (ASE, inspector PennDOT, EPA 608, licencia de la ciudad), reseñas con `answers`, chat con contexto, avisos, Mi casa, fotos |
| `lib/tarjeta.ts` `botonPrincipal` (CITA → «Booking»), `chipsTarjeta`; `lib/categoria.ts` + `packages/taxonomy/paginas.json` | | **La página de categoría de Auto y Hogar ya existe** (filas `sint/veh/mk` y `sint/emer/temp/quien`, grupos, `quick5`, banda «¿Es una emergencia?» con `code: APP-NEG-HOGAR-EMERGENCIA`); `buscar.ts` ya filtra `h24` y `diagfree/presfree` |
| Rutas | `/n/[id]/cita` (Booking.tsx), `/cita/[num]` (Estado.tsx, acciones.ts, ayuda), `/cuenta/citas`, `/panel/[id]/…`, `/admin/negocios/[id]`, `/admin/transacciones`, `/admin/colas` | Se extienden; rutas nuevas en cada bloque |

## 1. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo (etapas 1–4 de Auto y Hogar). El **panel** solo trae: Servicios de Auto
(`dash2-asv.js`), Tu herramienta (`dash2-cat.js blocksB`), Citas genérico (`reqRow` k `cita`: Confirmar / Otra hora / No
puedo) y Cotizaciones genérico (k `cot`: «Mandar precio» con texto libre). **No hay** en el panel:
1. Constructor del **estimado / precio completo línea por línea** (necesario · recomendado · puede esperar; pieza/material +
   horas × tarifa + 6 %; foto) ni el **extra con foto** ni los pasos En camino / Llegó / Empezar / Terminé / No había nadie.
2. **Servicios de Hogar** (no existe `dash2-hsv`; copiar el patrón de `dash2-asv` con los tipos de Hogar).
3. Respuesta a **pre-estimado** con rango (lo–hi) / «hay que verlo» / «no lo hacemos» (hoy `cot` es texto libre).
4. Bandeja de **emergencias** entrantes (aceptar primero) — SP: «La acepta, desde su panel, el primero…».
5. Listas de **planes** (suscriptores, próximas visitas) y **rentas/apartados** (apartada, la tiene, devuelta, tarde).
6. Super Admin: vista de estimados en Transacciones y cola de «retenciones que fallaron».
Regla 7 dice «si falta una pieza, se pregunta»; con AB: se compone con piezas existentes del sistema (`rows`, `step`, `chips`,
`form`, `money`, `note`, `steps`, tarjetas de pedido del panel) y se anota cada pantalla en `docs/REVISION.md` para el OK.

---

## 2. Cambios de datos (migraciones 0048 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0048 `hogar_auto_servicios` (4a)**
- `items`: `svc_kind text check in ('fijo','desde','cotiza','diag','lav','goma','insp','grua','visita','hora','area','pres',
  'emer','plan')`; `svc_attrs jsonb` validado en el servidor (zod + guardián): Auto (`dash2-asv` header) `rng [lo,hi]`, `sz
  [carro,SUV,van]`, `per eje|goma|sensor`, `days [a,b]`, `w espera|deja|ambos|dom|call`, `walk`, `cred`, `alt`, `inc/no`
  `[[es,en]]`, `sym`; Hogar (neg-hogar-listing header) `mh` horas mínimas, `u pie2|cuarto|salida`, `min`, `rng`, `sur`
  (recargo), `fr mes|temp`, `cred`, `free`, `days`. Índice `(business_id, svc_kind) where module='svc' and removed_at is null`.
- `items` renta: `deposit_cents` (depósito de la herramienta, `SHOP[].dep`), `stock_left` ya existe (`left`).
- `businesses.svc_model` amplía el check: `('emp','comm','chair','bay','solo','red','gc')` (Auto `shop|bay|solo`; Hogar
  `shop|solo|red|gc`; `shop` = `emp`). `crew_size`/`subs_n` van en `category_attrs`.
- **`trade_settings`** (Tu herramienta, una fila por negocio): `labor_rate_cents` (40–250 $, paso 5; `RATE0`),
  `warranty_months/miles` ((3,3000)|(12,12000)|(24,24000); `WARR`), `same_day_cutoff_h` (11|12|14|15; `CUT`), `bays`,
  `zone_mi` (10|15|20|30; `ZONES`; escribe `businesses.service_radius_mi`), `h24 bool`, `emergency_eta_min` (`cfg.eta24`,
  60), `off jsonb` (planes/rentas pausados por nombre, `S.off`), `updated_by/at`.
- `booking_policies`: `deposit_kinds text[]` (`DEP.k`), `deposit_section_ids bigint[]` (`DEP.secs`, MD BookingPolicy),
  `deposit_big_over_cents` + `deposit_big_cents` (`DEP.big`), `deposit_min_price_cents` (`DEP.min`); `cancel_free_h`
  admite 12 (`DEP.cx` 4/12/24 → check `(2,4,12,24,72)`).
- **`user_vehicles`**: `user_id`, `year` (1980–año+1), `make` (clave de `ALLMK`, 41 marcas), `model` (≤40), `mileage`,
  `veh_type c|s|m|d` (`VEH`), `size c|s|v` (precio de lavado), `tire_size` (regex `^\d{3}/\d{2}R\d{2}$`), `is_default`,
  `removed_at`. Demo: `ACC` 2016 Honda CR-V 84,200 mi 225/65R17.
- **`user_homes`**: `user_id`, `address_id → user_addresses` (geo), `kind casa|apto|duplex|movil` (`TIPO`), `tenure
  dueno|inq|land` (`OWN`), `beds` (1..5+), `baths` (1|1.5|2|3+), `sqft`, `year_band pre50|50|80|00` (`YR`), `pets`
  (`PETS`), `heat caldera|horno|bomba|zocalo` + `heat_age` (`HEAT`,`AGE`), `water_heater gas|elec|sintanque|aceite` +
  `wh_age` (`WH`), `access_note` ≤120 (`park`), `is_default`, `removed_at`. Demo: `ACC` 112 W Oak St.
  Invitado = «solo esta visita» (`s.casas`/`s.vehs`) → al entrar se guarda en la cuenta (sin sesión no se envía nada).
- `media.owner_kind` + `'estimate_line','request'`.

**0049 `visitas_estimados` (4c–4d)**
- `operations`: `vehicle_id`, `home_id` (FK) + copia en `details` (`vehicle` texto ya existe en MD: «2016 Honda CR-V»);
  `window_end timestamptz` (franja de 2 h de Hogar); `details.return_mode wait|drop|ride|tow|dom` (`KL` neg-auto-flow),
  `details.access home|key` (`KL` neg-hogar-flow) + nota, `details.landlord_ok`, `details.keep_parts`, `details.mileage`,
  `details.lights[]`, `details.area` (`AREAS` cocina/bano/sotano/…). `status_detail` (MD ya lo prevé: «est, xtra, noshow»)
  toma: `road | in | est | work | xtra | ready | live | done | noshow`.
- **`estimates`**: `operation_id`, `version`, `status draft|sent|answered|superseded`, `labor_rate_cents` (copia de
  `trade_settings`), `tax_rule` (copia), `visit_credit_cents`, `sent_at`, `answered_at`, `created_by` (member), `pre_range`
  (copia del pre-estimado para «Dentro de / Pasa tu pre-estimado»).
- **`estimate_lines`**: `estimate_id`, `sort`, `urgency now|soon|later` (necesario ahora · recomendado · puede esperar),
  `title jsonb`, `why jsonb`, `parts jsonb [{n:{es,en}, cents, qty}]`, `labor_hours numeric(5,2)`, `photo media`,
  `is_extra bool`, `decision null|ok|no`, `decided_at`; **derivados** (no editables): `labor_cents = horas × tarifa`,
  `tax_cents`, `line_total_cents`. Fuentes de ejemplo: `EST` y `XTRA` (neg-auto-flow L25/L44, neg-hogar-flow L30/L46,
  incluido `PERMIT` «Permiso de la Ciudad de Hazleton» $85).
- **`payments`**: `kind` amplía `('full','deposit','balance','tip','visit','estimate','extra','rental','security','plan')`;
  nuevo `seq smallint default 1`; **reemplazar `unique (operation_id, kind)` por `unique (operation_id, kind, seq)`**;
  `hold_expires_at` (derivado de `held_at` + 6 d 20 h), `renewed_from bigint` (retención renovada).
- `fee_rules.kind` + `'plan','renta'` (sembrar 800 y 600 bp; Super Admin › Planes los edita).

**0050 `solicitudes_servicio` (4e)** — **`service_requests`**: `number` (P-xxxx pre-estimado · Q-xxxx presupuesto · E-xxxx
emergencia), `mode pre|pq|em`, `user_id`, `city_id`, `category`, `vehicle_id|home_id`, `item_id` (servicio de origen),
`form jsonb` (qué pasa ≥10, área, luces, código del escáner, marca/edad del equipo, medidas, para cuándo `WHEN`
hoy|sem|nada, ahora|3h en emergencia), `status sent|answered|used|expired|cancelled|nobody`, `respond_by`, `valid_until`
(+7 d), `accepted_business_id` (emergencia), `created_at`. Fotos/video en `media owner_kind 'request'` (mín. 1, máx. 6;
emergencia opcional). Por negocio: `operations kind 'quote'` (lo que ve el panel en Cotizaciones) con `details.request_id`,
`details.range [lo,hi]`, `details.reply rng|see|no`, `details.days`, `details.visit_cents`. Emergencia: **`request_targets`**
(`request_id`, `business_id`, `notified_at`, `seen_at`, `declined_at`) — la aceptación es un `update … where
accepted_business_id is null returning` (gana el primero, sin carreras).

**0051 `planes_rentas` (4f)** — `operations.kind` + `'plan'` (un plan = una operación PL-xxxx; cada visita del plan = una
`appointment` con `details.plan_op`); **`plan_subscriptions`** (o columnas del op `plan`): `item_id`, `home_id`, `weekday`
o `day_of_month`, `first_visit_at`, `next_visit_at`, `next_charge_at`, `price_cents` (copia), `freq mes|temp`, `status
active|paused|cancelled`, `paused_until`, `skip_next`. Cobro mensual = `payments kind 'plan' seq = período`. Renta/apartado:
`operations kind 'rental'|'hold'` con `details.days`, `pickup_at`, `hold_until` (+48 h), `returned_at`, `late_days`;
pagos `rental` (cobrado al recoger) y `security` (retenido al recoger, liberado al devolver; el día tarde se captura de él).

**0052 `ayuda_hogar_auto` (4g)** — `help_requests.reason` amplía con Auto (`neg-cita-help.js` L24: `cobro`(foto),
`tarde`, `igual`, `dano`(foto), `piezas`, `otro`) y Hogar (`neg-hogar-rev.js RSN`: `win`, `more`, `bad`(foto), `dmg`(foto),
`who`, `otro`); `requested_solution` + `'warranty'` («que vuelva sin cargo por la garantía»). Plantillas de aviso nuevas
(§3). `reviews.src` ya tiene `cita`; `answers` json guarda las preguntas de categoría.

---

## 3. El dinero (motor común de Auto y Hogar — Opus/high; revisión de seguridad)

Regla del modelo (MD «Dinero de una operación»): held → captured | released; captured → refunded. Comisión solo sobre
tarjeta en la app (`fee_rules`, sobre subtotal sin impuesto). El servidor calcula todo; el cliente solo muestra.

| Momento | Auto (`neg-auto-flow` L128–151, L200) | Hogar (`neg-hogar-flow` L106, L161) |
|---|---|---|
| Al enviar | **Verificación $0** de la tarjeta (RESPUESTA `tarjeta`: «la verificación de $0 falla»). Depósito solo si `DEP` aplica (`depOf`: monto, `k`/`secs`, `big`, `min`) → se cobra al enviar como en Belleza (MEM 1622; decisión 26 sep) | Igual (`DEP` neg-hogar-book L33: Rodríguez $40 en fijo, $150 en ≥$1000; Cibao $50; Richard $20; Santana $150 en fijo ≥$1000) |
| Al confirmar | Nada nuevo (depósito ya cobrado) | Igual |
| Al dejar el carro / al empezar (`atT`) | Retener **diagnóstico** (`it.p`; gratis si `p 0`, `alt` si no lo arreglas) o el **precio** (fijo/lav/goma/insp, menos depósito) | Al llegar: retener **la visita** (`visita`, `pres` con costo) o el **precio fijo** |
| Estimado / precio completo | Apruebas **línea por línea** → se **retiene lo aprobado** (`hold = base + diag + rep − credit`) | Igual: `hold = base + visit + rep`; la visita se descuenta si apruebas (`cred`) o es gratis con el arreglo (`free`) |
| Algo más (`xtra`) | Foto + precio; **Sí** → nueva retención `extra` (seq n); **No** → no se hace ni se cobra; «Pararon hasta que decidas» | Igual |
| Listo / Terminado | «Ya lo recogí · pagar» → **se cobra lo final** (≤ lo aprobado; `save` si la pieza salió más barata) **menos el depósito** y **se libera el resto** | «Todo bien · pagar» → igual |
| No llega / no había nadie | Depósito se queda si cancela tarde o no llega (política) | `noshow`: «No se cobró nada.» (depósito según política) |

Implementación:
- `pasarela.verificar(pm, cliente)` (SetupIntent; simulador con `SIM_PM`), `pasarela.retenerFuera(...)` (PaymentIntent
  manual, `off_session: true`, `transfer_data` al negocio o a la cuenta de la bahía/técnico) y `pasarela.cobrarFuera(...)`
  (planes: captura automática, off-session, con destino). `requires_action` fuera de sesión → `status_detail` no cambia,
  `operations.details.pay_action` + aviso «Confirma tu tarjeta» y pantalla para confirmar (hoy 3b solo dice «todavía no
  hacemos aquí» → resolverlo aquí).
- `cobros.ts`: nuevas `retenerPago(op, kind, seq, cents)`, `cobrarPago(paymentId, cents)` (captura parcial: Stripe libera
  el resto solo), `liberarPago(paymentId)`; `cobrarOperacion/liberarOperacion` quedan como envoltorios. **Liquidación final**
  `liquidar(opId)`: final F = Σ(líneas aprobadas + extras aprobados + visita/diag − crédito − ahorro) ≤ Σ aprobado; se reparte
  F − depósito entre las retenciones vivas en orden visita → estimado → extras; cada una captura ≤ su monto; las sobrantes
  se liberan. Idempotente (`idem` por pago), dentro de `pg_advisory_xact_lock('cita:'+negocio)`.
- **Retenciones de más de 7 días** (Stripe cancela una autorización sin capturar a los 7 días en tarjeta no presente):
  taller con días (`days [a,b]`, hojalatería), obras de Hogar, rentas de una semana. Barrido `renovarRetenciones()` a los
  6 d 20 h: libera y vuelve a retener off-session con la misma tarjeta (`renewed_from`); si falla → aviso al cliente y al
  negocio («Pago por confirmar»), cola en el Super Admin. `repararPagos` lo cubre también.
- Impuesto: regla en datos (`tax_rule`: % sobre piezas/materiales y % sobre mano de obra, por ciudad y categoría), nunca en
  código; por defecto lo del diseño (6 % solo piezas/materiales). Ver Preguntas #1.
- Comisión: `comision(c, 'cita', subtotal)` sobre cada captura (sin impuesto); `plan` y `renta` con sus `fee_rules`.
  Devolución de depósito no paga comisión (como 3e).
- Guardián del dinero (nuevo): para toda operación de Auto/Hogar, `Σ capturado ≤ Σ aprobado + depósito`, ninguna
  retención viva en operación `done/cancelled/declined/expired` más de 1 h, ninguna retención con `hold_expires_at` < ahora.

---

## 4. Bloques

### 4a · Servicios, Tu herramienta y perfiles (panel + admin + datos) — Sonnet/medium
**Datos:** migración 0048 completa. Semilla de pruebas: los 20 + 18 (+2 lavado) negocios de `TLAuto.B` / 36 de
`TLHogar.B` ya sembrados en Fase 1 → sumar sus `SVC`, `SHOP`, `STAFF`, `PROS`, `GAL`, `trade_settings` (`RATE0`, `RENT0`,
`PLAN0`), `DEP`, y los demos `demo-auto` / `demo-hogar` (`demo-biz.js` L14, L485) con sus `req` (L186, L541).
**Panel (Lo que vendes):**
- **Servicios de Auto** = `dash2-asv.js` (`asvBlocks`/`asvDet`, det `as:`): resumen (n.º servicios, «Nada se hace ni se
  cobra sin el OK del cliente: los «desde» y «se cotiza» llevan estimado», tag «SOLO EL TALLER» si hay bahías), por servicio:
  tipo (`fijo` «Lo que ve el cliente es lo que paga» · `desde` «El mínimo…» · `cotiza` rango · `diag` con «Se descuenta si lo
  arreglan aquí» (`cred`) y gratis/`alt` · `lav` 3 precios · `goma` · `insp` · `grua` «Remolque hasta 10 millas»), minutos,
  días, cómo lo devuelven (`w`), solo sin cita (`walk`), incluye / NO INCLUYE · OPCIONAL (4), opciones (`opt` ±$ ±min, máx 3),
  extras (`x`), foto, ocultar (`hid`), secciones (`asecs`). Quien renta bahía tiene su propia lista (MEM 480).
- **Servicios de Hogar** (hueco #2): lo mismo con tipos `visita` (cred/free) · `fijo` · `hora` (`mh`) · `area` (`u`,`min`) ·
  `pres` (visita $ o gratis, `rng`) · `emer` (`sur` recargo incluido) · `plan` (`fr`); `sym` (síntomas de la fila «¿Qué pasa
  en tu casa?»).
- **Tu herramienta** (`dash2-cat.js`, `TOOLS['NEG-AUTO'] = ['Taller y estimados','Shop and estimates','wrench']`,
  `TOOLS['NEG-HOGAR'] = ['Visitas, planes y renta','Visits, plans and rentals','home']`, `blocksB`): ver §6.
- **Citas** (`dash2-svc.js citaOf`: auto, dep, cxh, apr, staffPick) + depósito por tipo/sección/grande (`DEP`).
- **Bahías / Técnicos** = «Sillas y agenda» de 3d: bahía N · desde AAAA (Wilson Tejada bahía 3, Eddy Polanco bahía 4
  «confirma al instante»); red Arreglos Ya: Richard, Maritza (al instante), Yefri. Cuenta de cobro propia (`sillas.ts`).
- **Equipo:** STAFF con certificaciones (ASE, inspector PennDOT; licencia de la ciudad, EPA 608, seguro; subcontratistas del
  `gc` con licencia propia) → `licencias.ts`; el Super Admin verifica (`tl-adm-v1.biz[id].licOk`).
**Derivados → filtros** (`filter_values`, recalculados al guardar, nunca editables): Auto `walkin cita domicilio sameday
diagfree garantia financia online deposit ase inspector seguro grua cortesia tienda h24`; Hogar `cita sameday h24 finde
presfree hora trabajo lic seguro garantia online deposit financia plan tienda renta galeria inq dueno land tp tm tg y10`
(`y10` sale de `yrs ≥ 10`; `h24` del interruptor; `diagfree`/`presfree` de los servicios; `sameday` de la disponibilidad).
**Super Admin (ADM-NEG 360 › Lo que vende):** ocultar servicio (`itemOff['as:'+id]` Auto, `'hs:'+id` Hogar), pausar módulos
(`modules_off`: citas, cot, renta, plan), ver Tu herramienta (solo lectura), verificar licencias; Auditoría de cada cambio.
**Mi cuenta:** `USR-*` «Mis vehículos» y «Mi casa» (crear/editar/quitar; quitar = `removed_at`).
**Guardianes:** svc_attrs válido por tipo; ningún `filter_values` sin su fuente; `ES/EN` en todo texto nuevo.

### 4b · Ficha y Booking (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (Auto y Hogar), hoja del servicio, hoja Mi vehículo (`vhs`) / Mi casa (`hcs`),
`APP-NEG-AUTO-BOOKING`, `APP-NEG-HOGAR-BOOKING`, «Tu cita» / «Tu visita» en la ficha.
- **Ficha Auto** (`TLAutoBook`): Servicios «Por servicio | Por mecánico» (bahías), fila en vivo del lavado («FILA AHORA ·
  SIN CITA», `c.q`), «Para «síntoma»» si vienes de la fila; **Hoy** de Auto (listo hoy si lo dejas antes de `cut`,
  diagnóstico, grúa 24/7, fila); bloque «Nada se hace ni se cobra sin tu OK.» con los pasos del cobro; franja de confianza
  (garantía meses/millas, ASE, inspector); Tienda (gomas filtradas por la medida de tu vehículo, nuevas/usadas, instaladas)
  con «Apartar» (→ 4f); `OFFERS`; emergencia (`TLAutoL.isEm`: Grúas · Auxilio · Cerrajero) = **sin Booking, todo «Llamar»**.
  Compatibilidad: marca y tipo de vehículo (`mk`, `veh`); si no trabajan con él, no se puede pedir.
- **Ficha Hogar** (`TLHogarBook`): «Cómo trabaja» en vez de «En el local» (`amenK` con `b.hogar`); sin oficina = «Zona donde
  trabaja» + «Ver la zona»; «Por técnico | Por servicio» (red); franjas de 2 h (`nextWin`); emergencia «EMERGENCIA AHORA ·
  llega en ~N min» (`eta24`); **Trabajos hechos** (`GAL`: antes/después, días, precio; móvil carrusel, desktop grilla 300);
  Tienda + Renta (→ 4f); FAQ por tipo (`TLHogarK.kind`: handy · plumb · drain · heater · hvac · elec · appl · lock · clean ·
  lawn · plan · red · gc; «¿Cobran por venir?» sale de sus precios; `b.fq`/Tu página ganan). Compatibilidad: casa dentro de
  la zona (fuera bloquea) e inquilino (algunos solo con dueños; inquilino = «Tengo el permiso de mi landlord» obligatorio).
  Aviso de plomo (`hint` de Mi casa, casas antiguas).
- **Booking Auto** (`s.ab`): 1 **Tu carro** (vehículo obligatorio y compatible, millaje; diag/desde/cotiza: luces
  encendidas `LIGHTS`, qué le pasa, fotos del ruido; lavado: cómo está por dentro; opcional «Pídeles un rango con tus fotos»
  = `preAsk`, el rango llega al confirmar) → 2 **Día y hora** + cómo te lo devuelven (`KL`: Espero en el taller · Lo dejo y
  me avisan · Me llevan y me traen · Lo recoge su grúa · Donde está tu carro con franja de 2 h y dirección en zona) →
  3 **Revisa y envía** (resumen, precio `totalK/totalV`, CÓMO SE COBRA en 3 pasos, TU DEPÓSITO DE $X con cada caso,
  «Guárdame las piezas viejas» (no en lavado ni inspección), SMS, políticas «cancelar gratis 2 h», HOY PAGAS $X, Enviar
  solicitud). Desktop: una página + columna sticky (MEM 1597).
- **Booking Hogar** (`s.hb`): 1 **Tu casa** (Mi casa obligatoria y en zona; visita/hora/área/pres: ¿dónde es? `AREAS`, qué
  pasa, fotos) → 2 **Franja de llegada** de 2 h + «Estaré en casa / No estaré: dejo cómo entrar» (no en presupuesto) +
  cuánto dura → 3 **Revisa y envía** (hoy $0 o depósito · al llegar se retiene la visita o el fijo · precio completo en la
  app, tú decides · al terminar lo final; inquilino = permiso del landlord; «Déjame las piezas»; SMS).
- Servidor: `enviarVisita(userId, negocio, f)` sobre el patrón de `enviarCita` (candado, `client_key`, máx. 3 pendientes,
  verificación $0 + depósito, fotos → media, `operations_appt_seq`); disponibilidad: Auto por bahía/mecánico y `duration_min`
  (dejarlo = franja de entrega, no ocupa la bahía todo el día: ver Preguntas #4); Hogar = `huecos` con `dur = 120` y capacidad
  por cuadrilla/técnico. Free: `puede()` (techo 10/mes, `TLFreeOn/TLFreeLeft`) → «Llamar».
**Estados del cliente:** `pend` (SOLICITUD ENVIADA) — se crea aquí; el resto en 4c.
**Panel:** solicitud nueva en Hoy (`reqRow` k `cita` con vehículo/casa, depósito, nota, fotos).
**Avisos:** reusar `biz_cita`, `biz_cita_ok`.

### 4c · La cita / visita en curso + Panel (sin estimado: fijo, lavado, gomas, inspección) — Sonnet/medium, dinero Opus
**Pantallas:** `APP-NEG-AUTO-CITA` (`s.acitas`), `APP-NEG-HOGAR-CITA` (`s.hcitas`), Mi cuenta `USR-CITAS`/`USR-CITA`
(Auto con «Nada se hace ni se cobra sin tu OK.»), Panel › Hoy / detalle de la cita.
**Estados** (status + `status_detail`):
- Auto: `pend → ok | no | alt | exp → in (recibido) → work → ready (listo para recoger, «Recógelo hasta las …») → done`;
  `cx`. Con estimado (4d): `in → est → work → xtra → ready`.
- Hogar: `pend → ok | no | alt | exp → road (VA EN CAMINO «llega en unos 20 min · dentro de tu franja») → in (EN TU CASA) →
  work → ready (TERMINADO «Revisa el trabajo antes de pagar») → done`; `noshow` (NO HABÍA NADIE «No se cobró nada.»); `cx`.
  Precio fijo: `ok → road → work → ready`.
- Otra hora: Auto = siguiente hueco libre (como 3c); **Hogar = siguiente franja libre** de esa persona/cuadrilla.
- Vence: sin respuesta en `expires_h` (2 h) → SIN RESPUESTA, se devuelve el depósito (`vencerCitas`).
**Panel (Hoy · detalle):** Confirmar / Otra hora / No puedo (3c) + pasos nuevos en `citaPaso`: Auto `recibido` (retiene diag
o precio), `empezar`, `listo`; Hogar `en_camino`, `llegue` (retiene visita o fijo), `empezar`, `termine`, `no_habia_nadie`
(solo dentro o después de la franja). Cliente: «Ya lo recogí · pagar» / «Todo bien · pagar» → `liquidar`. Si el cliente no
confirma: ver Preguntas #3. Cambiar / cancelar (política del depósito, `citaCliente`), voy tarde, calendario, cómo llegar,
mensaje al negocio (chat con `operation_id`).
**Dinero:** verificación $0 ya hecha; retención al recibir/llegar; captura final; liberar en no/exp/cx.
**Avisos nuevos:** `visita_road`, `visita_in`, `auto_in`, `auto_ready`, `visita_ready`, `cita_pagada` (cobrado vs. liberado),
`visita_noshow`, `pay_action` («Confirma tu tarjeta»); al negocio `biz_cita_pagada`.
**Super Admin:** ADM-TX › Citas muestra sub-estado y la línea de tiempo (retenido/cobrado/liberado por pago).

### 4d · Estimado / precio completo línea por línea + extras (núcleo de la tesis) — **Opus/high** (dinero)
**Pantallas cliente:** estado `est` de `APP-NEG-AUTO-CITA` («ESTIMADO LISTO · TU OK», «Revisa lo que encontraron», «Nada se
hace ni se cobra sin tu OK. Aprueba solo lo que quieras.») y de `APP-NEG-HOGAR-CITA` («PRECIO · TU OK»); estado `xtra`
(«ENCONTRARON ALGO MÁS · TU OK», «Pararon hasta que decidas. Sin tu OK no se hace ni se cobra.») con foto y Sí / No;
`done` con «Cobrado $X · liberado $Y» y «La pieza salió $Z más barata de lo estimado: se liberaron $Z.»
- Cada línea: necesario ahora / recomendado / puede esperar, por qué (medida o código: «Quedan 2 mm; el mínimo seguro es 3
  mm.», «Código P0133…»), pieza o material + mano de obra (horas × tarifa del panel `TLDashCat.rate(id)`) + impuesto, foto.
  Crédito del diagnóstico / visita. Pre-estimado al lado: «Dentro de tu pre-estimado» / «Pasa tu pre-estimado» (por qué).
**Panel (hueco #1, componer):** constructor del estimado en el detalle de la cita: agregar línea (urgencia, título, por qué,
pieza/material $, horas, foto obligatoria en «necesario ahora»), plantillas por clase (`EST` claves Auto `brakes`, `engine`…;
Hogar `plom, agua, elec, calef, electro, drena, handy, insp, bath, roof, panel, boiler, heater, repipe`), total en vivo
calculado por el servidor, «Mandar al cliente». Versión nueva = `superseded` la anterior (líneas ya aprobadas no se tocan).
«Algo más» = línea `is_extra` con foto + precio + horas. Al terminar: «Lo final» (puede bajar, nunca subir), piezas viejas
entregadas (Auto), garantía (meses/millas).
**Reglas que no se apagan** (bloque con candado de `blocksB`): Auto — Línea por línea · Nada extra sin su OK · Impuesto solo
en piezas · Piezas viejas al recoger · el diagnóstico se descuenta. Hogar — Precio completo antes de empezar (materiales con
precio antes de comprarlos) · La visita se descuenta · Impuesto solo en materiales.
**Servidor:** `mandarEstimado`, `decidirLineas(userId, num, ids[])` (retiene lo aprobado en `kind 'estimate'`), `pedirExtra`,
`decidirExtra` (retención `extra` seq n), `liquidar`. Todo con candado y `operation_events` (`estimate_sent`,
`lines_approved`, `extra_asked`, `extra_ok/no`, `settled`).
**Avisos:** `est_listo` (cliente, SMS), `biz_est_ok` (qué aprobó), `xtra_pide` (cliente, SMS), `biz_xtra_ok/no`.
**Super Admin:** ADM-TX › detalle: versiones del estimado, líneas aprobadas, aprobado vs. cobrado (dato para la reseña y para
Analítica: «cobró lo cotizado»). Cola «Retenciones que fallaron».
**Guardianes:** «nada se captura sin línea aprobada», «captura ≤ aprobado», «líneas derivadas no editables», prueba de punta
a punta: aprobar 2 de 4 líneas + extra rechazado + pieza más barata → cobrado/liberado exactos.

### 4e · Pre-estimado con fotos (Auto + Hogar), Presupuesto a hasta 3 y Emergencia 24/7 (Hogar) — Sonnet; emergencia Opus
Las tres usan las mismas vistas del prototipo (`pe` formulario / `ps` estado, `s.pe`/`s.hpe`, `s.pres`/`s.hpres`,
`mode 'pre'|'pq'|'em'`) → un solo motor (`service_requests`, migración 0050).
- **`APP-NEG-AUTO-PREEST` → `-ESTADO`** (para `desde` y `cotiza`; link «Pre-estimado con fotos» en la fila + bloque en la
  hoja): vehículo, fotos/video 1–6, luces, qué le pasa, código del escáner, para cuándo; gratis, no compromete, pide sesión.
  Estados: `sent → rng` (rango, qué incluye, qué puede cambiarlo, válido 7 días, «Reservar con este pre-estimado» → Booking)
  `| see` (hay que verlo: rango amplio + «Reservar el diagnóstico») `| no` (talleres de Hazleton que sí) `| exp` (24 h sin
  respuesta: mandar otra vez) `→ used | cx`.
- **`APP-NEG-HOGAR-PREEST` → `-ESTADO`** (visita, hora, área): casa (en zona), fotos 1–6, ¿dónde es? + qué pasa (≥10),
  marca y edad del equipo, para cuándo; igual que Auto; «Reservar con este pre-estimado» → Booking en el paso 2 con fotos y nota.
- **`APP-NEG-HOGAR-PRESUPUESTOS` → `-ESTADO`** (servicios `pres`, «Pedir presupuesto a hasta 3»): misma solicitud (casa,
  fotos, dónde, qué quieres, medidas) a hasta 3 negocios con presupuesto (el de la ficha primero; los que no llegan a tu casa
  no se eligen) → responden uno a uno (rango, visita, días; «el más bajo»; uno «hay que verlo»; uno no lo hace) → tocar uno =
  Booking de su visita en el paso 2; **los otros se cierran**. Plazo 48 h (SP).
- **`APP-NEG-HOGAR-EMERGENCIA` → `-ESTADO`** (banda de la categoría, fila «Emergencia 24/7», hoja): tipo (`EMER`: fuga,
  calefacción, chispas/sin luz, desbordado, te quedaste afuera, tormenta) + casa + fotos opcionales + cómo entrar + ahora / 3 h;
  muestra el rango de salidas con recargo; línea 911. Se manda a **todos** los Pro 24/7 que cubren tu zona y hacen ese trabajo
  (`emCands`: `h24` + subcategoría + ST_DWithin) → **el primero que acepta la toma** (nombre, salida con recargo incluido, llega
  en ~N min) → se crea la visita (`appointment`, `k emer`, `status_detail road`) y se **retiene la salida** off-session |
  nadie en **15 min** → NADIE DISPONIBLE («No se cobró nada. Mándalo otra vez o llama directo a uno.»).
**Panel:** Cotizaciones (`KIND.cot`) con respuesta estructurada (hueco #3): Mandar rango (lo–hi, qué incluye, visita $, días)
/ Hay que verlo / No lo hacemos; plazo visible. Emergencias (hueco #4): tarjeta fija arriba en Hoy con sonido/aviso, Aceptar
(gana el primero; los demás ven «Ya la tomó otro negocio»), salida y llegada; Tu herramienta controla `h24`.
**Avisos:** `biz_preest`, `preest_rng/see/no/exp`, `biz_pq`, `pq_resp`, `pq_cerrado` (a los otros negocios), `biz_em`
(SMS, todos los candidatos), `em_ok`, `em_nadie`.
**Super Admin:** Transacciones › Solicitudes (P/Q/E con a quién se mandó, quién respondió, cuándo); Analítica: tiempo de
respuesta y % aceptadas; Configuración: 24 h / 48 h / 15 min / 7 días (PlatformConfig).
**Guardianes:** carrera de aceptación (dos negocios aceptan a la vez → uno gana), ningún candidato fuera de zona, ninguna
emergencia sin la línea 911.

### 4f · Planes recurrentes, Renta de herramienta y Apartar (Hogar + Tienda de Auto) — Opus/high (cobros recurrentes)
- **`APP-NEG-HOGAR-PLAN` → `-PLAN-ESTADO`** (servicios `k plan`, «Empezar el plan»): Tu casa + día fijo + primera visita
  (3 opciones) + qué quieres que revisen + cómo entrar → **activo**; hoy $0; **primer cobro el día de la primera visita**,
  después cada mes el mismo día; Plan de confort (Cibao) = 2 visitas al año (oct calefacción · abr aire) con cobro mensual.
  Acciones: saltar la próxima · pausar un mes · cancelar («no se cobra el mes siguiente»). Ejemplos `PLAN0`: Mantenimiento de
  la casa $149, Plan para landlords $149, Plan de confort $18.
- **Renta** (`SHOP` con `rent: 1, dep`; ruta `APP-NEG-RENTAR` → `-ESTADO`, pide sesión): días (semana = paga 5) + día de
  recoger → **apartada 48 h** (hoy $0, baja `stock_left`) → **la tienes** (se cobra la renta, se retiene el depósito; «Un día
  más») → **devuelta** (se libera el depósito) | **tarde** (un día más, del depósito) | cancelada / vencida (vuelve el stock).
- **Apartar** (`TLApartar.hold`: productos de Tienda de Auto/Hogar usan el apartado de Tiendas): el mismo motor de 48 h
  (`kind 'hold'`, `fee_rules apt`) — se construye aquí y lo reusa la fase Mercados + Tiendas.
**Panel:** Tu herramienta (planes y rentas encendidos/pausados, `S.off`); listas Planes y Rentas (hueco #5): próximas visitas
del plan (cada una entra a Hoy como cita confirmada), apartadas/fuera/devueltas, «La recogió», «La devolvió», «Llegó tarde».
**Servidor/dinero:** `pasarela.cobrarFuera` mensual con barrido diario idempotente (`plan` seq = período); fallo → reintento
día 1/3/5 y aviso; pausa/salto/cancelación cambian `next_charge_at`. Renta: `rental` capturado al recoger, `security` retenido
(renovación si pasa de 6 d), captura parcial del día tarde.
**Avisos:** `plan_activo`, `plan_cobro`, `plan_visita` (24 h antes), `plan_fallo`, `plan_pausa`, `plan_cancelado`;
`renta_apartada`, `renta_vence`, `renta_recogida`, `renta_devuelta`, `renta_tarde`; al negocio `biz_plan_nuevo`, `biz_renta`.
**Super Admin:** Transacciones › Planes y Rentas; Planes › comisiones `plan`/`renta`; ocultar plan o renta (`itemOff`).

### 4g · Reseña, Ayuda con la cita/visita, Super Admin y documentación — Sonnet; ayuda con dinero Opus
- **Reseña** (`APP-NEG-RESENA`, `TLHogarRev` / `TLAutoRev` en `revWVals`): verificada = cita `done`. Datos del sistema (no se
  editan): Hogar «Llegó en la franja» y «Cobró lo cotizado»; Auto «estimado aprobado vs. cobrado» y «listo cuando lo
  prometieron». Preguntas: Hogar — quedó bien a la primera · llegó {persona} · limpió · cuidó tu casa · trato; Auto — a la
  primera · pidieron tu OK · te enseñaron la pieza vieja · te explicaron sin enredos · trato · carro limpio; lavado — precio
  publicado · a tiempo · quedó limpio · cuidaron tu carro. ≤2 ★ → «la reseña no devuelve dinero ni pide que vuelvan» → Ayuda.
  Cada reseña muestra vehículo / datos de la cita; «Con {técnico}» / bahía (como 3d).
- **Ayuda** `APP-NEG-AUTO-AYUDA` (`TLCitaHelp.ahelp`) y `APP-NEG-HOGAR-AYUDA` → `-ESTADO` (`TLHogarExt.help`): motivos (§2
  0052), qué pasó (15+), fotos obligatorias en los marcados, qué quieres (que vuelva sin cargo por la garantía · devolución a la
  tarjeta · al Wallet) → negocio 24 h (acepta · propone otra solución · no acepta → «Pedir revisión a To'Latino» 48 h) | sin
  respuesta 24 h → To'Latino revisa. Una abierta por visita; nunca «resuelto» antes de la respuesta. «Que vuelva sin cargo»
  abre el Booking con `warr: true` (precio y depósito $0, sin retención).
- **Super Admin:** Colas › Ayudas escaladas (ya existe) con motivos nuevos; Transacciones (todo lo anterior); Notificaciones
  (todas las plantillas nuevas, ES/EN); Configuración (plazos, regla de impuesto); Analítica (aprobado vs. cobrado, llegó en la
  franja, tiempo de respuesta a emergencias, % pre-estimados que terminan en cita).
- **`docs/ayuda/`** (regla 9, ES/EN): Booking de Auto, Booking de Hogar, estimado y extras, pre-estimado, presupuesto a 3,
  emergencia, planes, renta, apartado, ayuda con la visita; lado negocio: Tu herramienta, constructor del estimado, bahías/red.
- **Triángulo** (regla 8): cada opción de Tu herramienta → se ve en la ficha (garantía, `eta`, zona, `h24`, planes/rentas
  pausados quitados de `SVC/SHOP`) → el Super Admin la ve y puede ocultar/pausar.

---

## 5. Página de categoría y ficha (lo específico)
Ya en código (`paginas.json`, `Categoria.tsx`, `buscar.ts`); Fase 4 solo conecta lo que hoy va a «encargo»:
- **Auto** (`TLAuto`): filas `sint` «¿Qué le pasa a tu carro?» (`s:luz s:arranca s:ruido s:choque s:insp s:calor` →
  subcategorías), `veh` «Tu vehículo» (`v:c v:s v:m v:d`), `mk` «Por marca» (10 visibles + «Ver todas · 41»). Grupos: ORDENAR ·
  CÓMO TE ATIENDEN (walkin, cita, domicilio, sameday) · PRECIO Y GARANTÍA (diagfree, garantia, financia, online) · CONFIANZA
  (ase, inspector, seguro) · EXTRAS (grua, cortesia, tienda, h24) · NEGOCIO (open, verified, r45). `QUICK5`: open, walkin,
  sameday, diagfree, verified. Stats «SIN CITA» (`walkin`). Tarjeta: `eta` («Listo hoy si lo dejas antes de las 2 PM»),
  `fee`, `offer`, «SOLO CITA» (`soloCita`), a domicilio + millas (`zone`). Modelos `m`: `shop` · `bay` · `solo`.
- **Hogar** (`TLHogar`): filas `sint` «¿Qué pasa en tu casa?» (`SYM` 8), `emer` «Emergencia 24/7» (`EMER` 6, solo negocios
  `h24`), `temp` «Por temporada» (`TEMP`: calefacción, quitar el aire de la ventana, canaletas, tubos, nieve — otoño primero),
  `quien` «Para inquilinos o para dueños» (chips `q:inq q:dueno q:land`). 6 capítulos `SUBG` (58 subcategorías). Grupos:
  ORDENAR · CUÁNDO LLEGA (sameday, h24, finde) · CÓMO COBRA (presfree, hora, trabajo, online, financia) · CONFIANZA (lic,
  seguro, garantia, y10) · TAMAÑO DEL TRABAJO (tp, tm, tg) · EXTRAS (plan, tienda, renta, galeria) · NEGOCIO. `QUICK5`: open,
  sameday, h24, presfree, lic. Stats «LLEGAN HOY» (`sameday`). **Banda** «¿Es una emergencia?» → `APP-NEG-HOGAR-EMERGENCIA`
  (4e). Tarjeta: meta «HASTA N MI» (`tarjeta.ts` ya lo hace), `eta` próxima franja, `fee` cómo cobra la visita, CTA Booking.
  Modelos `m`: `shop` (cuadrilla `crew`) · `solo` · `red` (técnicos con página propia, `pros`, `m:'tec'`, `at`) · `gc`
  (contratista con subcontratistas, `subsN`).
- `sameday` (Hogar «Llega hoy») y `walkin`/fila (Auto) son **derivados** de la disponibilidad real; se cachean (no se editan).

## 6. «Tu herramienta» (Panel › Lo que vendes, `dash2-cat.js blocksB`)
- **Auto · «Taller y estimados»** (s: «Tu tarifa, la garantía y a qué hora entregas el mismo día. El estimado le llega al
  cliente línea por línea y nada se hace sin su OK.»): Mano de obra por hora (step −/+5, 40–250, «Con esto se arma cada línea
  del estimado.») · GARANTÍA DEL TRABAJO chips 3 m·3,000 mi / 12 m·12,000 mi / 24 m·24,000 mi · LISTO EL MISMO DÍA SI LO DEJAN
  ANTES DE 11 AM / 12 PM / 2 PM / 3 PM · REGLAS DEL ESTIMADO · NO SE APAGAN (4 con candado) · nota «El diagnóstico se descuenta
  del trabajo si el cliente lo aprueba.» Resumen de la fila: `$95/h · garantía 12 meses · mismo día antes de las 2 PM`.
  `apply()` → `b.warr`, `b.eta` («Listo hoy si lo dejas antes de las …»).
- **Hogar · «Visitas, planes y renta»** (s: «Tu tarifa, hasta dónde vas, emergencias, tus planes y lo que rentas.»): Mano de
  obra por hora · HASTA DÓNDE VAS 10/15/20/30 mi · Emergencias 24 h (toggle; «Sale en «Emergencia en casa» con su precio.») ·
  PLANES · COBRO CADA MES (toggle por plan, «primer cobro el día de la primera visita») · RENTA DE HERRAMIENTA · APARTADA 48 H
  (toggle por artículo, «$X por día · depósito $Y (se libera al devolver)») · REGLAS · NO SE APAGAN (3 con candado).
  `apply()` → `b.zone`, tag `h24`, quita planes/rentas pausados de `TLHogarL.SVC/SHOP` y rehace el menú (`menuSync`).
- En código: `trade_settings` + server actions; el estimado lee la tarifa vigente y la **copia** en `estimates`.

## 7. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md`)
1. **Impuesto.** El diseño dice «6 % de PA solo en piezas/materiales». En PA la mano de obra de reparación de vehículos
   (bienes muebles) suele ser gravable y en mejoras a inmuebles el contratista paga el impuesto de materiales — **sin
   verificar**. Default: regla de impuesto en datos (Configuración, por ciudad/categoría), sembrada como el diseño; ítem en
   `LAUNCH-CHECKLIST.md` «validar con contador antes de producción».
2. **Retenciones > 7 días** (Stripe): default = renovar a los 6 d 20 h off-session; si falla, «Pago por confirmar» (no se
   frena el trabajo, el negocio decide). Alternativa: cobrar lo aprobado al día 6 (contradice «se cobra al final»).
3. **El cliente no toca «pagar» al recoger / al terminar.** Default: aviso a 2 h y 24 h; a las 48 h se liquida solo lo
   aprobado (nunca más) y se abre la ventana de Ayuda; reversible por config.
4. **Agenda de taller** (dejar el carro ocupa ¿la bahía todo el día?). Default: «Lo dejo» reserva una franja de entrega y
   descuenta capacidad diaria por bahía (`bays` en Tu herramienta), no bloquea la bahía por horas; «Espero» sí bloquea
   `duration_min`.
5. **Estimado sin respuesta.** El diseño no pone plazo. Default: sin vencimiento; recordatorios 2 h / 24 h; el negocio puede
   «Cerrar con solo el diagnóstico/visita» pasadas 72 h.
6. **HIC de PA no se muestra** (decisión). Default: no se muestra texto, pero el servidor **topa el depósito** de trabajos de
   Hogar > $1,000 a 1/3 y deja la regla en Configuración; ítem en `LAUNCH-CHECKLIST.md`.
7. **MCC de Stripe** (`cuentaCrear` usa 5812): default mapear por subcategoría principal (7538 taller, 7542 lavado, 1711
   plomería/HVAC, 1731 electricista, 7349 limpieza, 0780 jardín, 1520 contratista general); reversible.
8. **Fila en vivo del lavado** (`c.q`): ¿quién la mueve? Default: el negocio en Panel › Hoy («Fila ahora» −/+), caduca a los
   30 min sin tocar y se oculta.
9. **Plan sin tarjeta / pago en el local.** Default: plan y renta exigen tarjeta en la app (cobro recurrente y depósito);
   citas sin tarjeta del negocio: el estimado se aprueba en la app y se paga en el taller (sin retenciones, `pay_mode local`).
10. **Comisiones `plan` y `renta`.** Default: 8 % y 6 % (como `cita` y `apt`), editables en Super Admin › Planes.
11. **Aviso de plomo** (`hint` solo con `pre50`): default también para `50` (1950–1979 incluye casas antes de 1978).
12. **Tipo de operación del plan.** Default `kind 'plan'` nuevo (no reusar `enrollment`, que es de Educación); revisar al
    hacer Educación por si conviene unificar cobros recurrentes.
13. **Emergencia y Free.** Solo Pro con `h24` reciben emergencias (diseño: «Pro 24/7»). Default mantenerlo.

## 8. Orden, dependencias y pruebas
4a → 4b → 4c → 4d (dinero) → 4e → 4f → 4g. 4e depende de 4c (la emergencia aceptada es una visita) y de 4d (pre-estimado
compara con el estimado). Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9
dispositivos con `RESPUESTA` simulada (ok · rechaza · nada · cambio · tarjeta) igual que la barra del prototipo
(«El taller responde», «Dejaste el carro», «Llega el estimado», «Terminaron»; Hogar «Va en camino», «Llegó», «Llega el precio
completo», «Terminó»; «Pasan 24 h», «Pasan 48 h», «Pasan 15 min», «Alguien acepta», «Pasa una visita», «La recogiste», «La
devolviste») — en la app eso lo hacen el panel y los barridos del servidor (SP «Plazos sin respuesta»). Capturas teléfono +
desktop de cada pantalla compuesta (huecos §1) y su línea en `docs/REVISION.md`.
