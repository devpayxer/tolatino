# Fase 4 · Vida Nocturna (Noche) — plan de construcción extraído del prototipo (7 nov 2026)

Bloques **4na → 4ne** (la letra `n` de Noche delante de la del bloque, para no chocar con 4n–4s de Mercados + Tiendas). Migraciones
desde **0081**. Nada de este archivo se ha construido. Esto es un resumen de trabajo; manda el prototipo.

## 0. Fuentes
Todas en `docs/diseno/pantallas/datos/` salvo indicación. **`neg-noche.js`** (TLNoche: 23 negocios de ejemplo, 14 Pro y 9 Free contando
DJ, promotor y salones; cabecera L1–8 con `nt` = esta noche: `cover`, `after [hora, cover]`, `edad 18|21`, `mus`, `dress`, `fila` + `filaH`,
`list`, `day`; `B` L11–33; `eta` / `fee` derivados L35–41 con `lastD` (fila de la última noche abierta); `SUBG` L42–48 = 5 capítulos y 25
subcategorías; `ROWS` L49–53 «¿Qué quieres esta noche?» · «Esta noche» · «Música»; `NEED` L54–57; `HOY` / `MUS` L58–59; `GROUPS` L65–72;
`QL` L73; `QUICK5` L74; `statsK` «SIN COVER HOY» L75; **`line`** L77; `lineSub` L78), **`neg-noche-listing.js`** (TLNocheL: cabecera L1–7
con `k cover · lista · mesa · vip · evento` (+ `fecha` en DJ, promotor y salón); `SVC` L14–36 con `until`, `pax`, `dep`, `hora`, `day`,
`eid`; `STAFF` L37–52; `ABOUT` L53–68; `RV` L69–74; `STATS` L75; `asp` L82–85; `aspNote` L86; `facts` L87–91; `liveIt` L101–106 (Entrada y
Lista siguen al panel); `canBook` L109; `priceFor` L110–116; `tonight` L117–120; `listingAdd` L123–157 (notas L130–133, `ax.veh` / `ax.q`
L136–139, `TD` L142, `AM` L143, FAQ L146); `sheetVals` L158–171 (`payT` L163–165); `resAdd` L172–177), **`neg-noche-flow.js`**
(TLNocheFlow: `APP-NEG-NOCHE-RESERVA` → `APP-NEG-NOCHE-ESTADO`; cabecera L1–9; `DN` L17 = 7 noches; `OCC` L19; `slotsOf` L27; `costOf` /
`depOf` L28; `bookVals` L31–70 (`cobro` L40–42, `rows` L43, `pol2` L44, `kinds` L55, `slotK` L57); `sendNow` L71–73 (número `N-7xxx` y
código de puerta de 4 cifras); `reply` L75; `citaVals` L79–106 (`H` L83–89, pasos L90–92, acciones L93–94, hoja de cancelar L102);
`sim` L107–110; `mineCard` L111–113), **`neg-noche-kind.js`** (TLNocheK: `KS` L9–11, `kind` L12 = `club · salsa · urbano · banda · bar ·
sport · karaoke · billar · cerve · lounge · show · dj · promo · salon`; `nextOpen` L18; `work` L19; `faq` L22–47 (ID L30, mínimo L34);
`RK` L50–65; `hoursPro` de noche L73–80; `post` L88–125 (DJ y promotor L97–108, salón L109–114, Free L116–120); `svcSync` L129–139;
`tabL` L143), **`neg-noche-rev.js`** (TLNocheRev y `TLHogarExt.nhelp`: cabecera L1–7, `srcs` L21–23, `groups` L24–30, `tm` L31–32,
`draft` L34–35, `fix` L36–42 (`lowT` L39 con el 911), `RSN` L45, `SOL` L46, `helpForm` L51–68, `reply` L69, `helpStatus` L71–88).
**Comunes:** `dash2-cat.js` (TLDashCat: `MUS` / `FILA` L129, `TOOLS['NEG-NOCHE'] = ['Esta noche','Tonight','drink']` L140, `state` L192,
`apply` L283–286, `summary` L322, `blocksC` L387–396; `REAL_C['la-terraza-night']` L40), `demo-biz.js` (`demo-noche` L589–640),
`adm-data.js` L21 (NEG-NOCHE transacciona `bol`) y L125–134 (comisión `bol` = $1 + 5 %), `dash2-evt.js` L22 (tipos de evento de Noche),
`onb-neg-data.js` (= `apps/web/lib/onb/datos.ts` L45 `on: rsv · menu · eventos` y etiqueta `rsv` «Mesas y lista», `ALLOW` L88
`['svc','rsv']`, preguntas L188–201: cover, edad, lista, mesas, lo que hay); `packages/db/migrations/0004_catalogo_datos.sql` L404–
(NEG-NOCHE con módulos por defecto `svc rsv staff eventos nov jobs`; NEG-NOCHE-01…25 = `SUBG` 1:1); `docs/diseno/plan/taxonomia-negocios.md`
§5 y familia **F-NOCHE** (L72–74); `docs/diseno/referencia/memoria-del-diseno.md` (MEM 87, 164, 748, 2115–2129);
`docs/diseno/entrega/modelo-datos.md` (MD: `category_attrs` NEG-NOCHE `cover, cover_after, min_age, music, dress_code, line_now,
guest_list_until, nights` L262; Operation `night` = Vida Nocturna L834/L854; Eventos §8: Event, TicketType, EventTable, Ticket L48, L1126–1190);
`solo-prototipo.md` (SP «Pasos del servicio» L151–155: «Pasó la noche» lo marca el negocio; «El negocio responde», «Plazos sin
respuesta», «Boletos apartados» L245–261); `docs/PLAN.md` (fase 4 L210: Noche va sola después de Fiestas + Transporte; fase 6 Eventos L212;
sin venta de boletos en la puerta L90, D1). Plantillas y motores ya construidos: `fase4-hogar-auto.md` (4a–4g), `fase4-salud-pro.md`
(4h–4m), `fase4-mercados-tiendas.md` (4n–4s), `fase4-fiestas-transporte.md` (4t–4z). Decisiones que mandan: `docs/DECISIONES.md` (O, P, Q,
U, AA, AB).

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Página de categoría NEG-NOCHE (filas `plan` foto · `hoy` chips · `mus` chips; `stats_tag sincover` «SIN COVER HOY») | `packages/taxonomy/paginas.json` L10711–, `lib/categoria.ts`, `lib/buscar.ts` | Ya servida; faltan los derivados que la alimentan (`sincover` de esta noche, `fila`, `lista`, `mesas`, `e18`, `m:*`, `tarde`) — §2, 4na |
| Subcategorías NEG-NOCHE-01…25; módulos por defecto `svc rsv staff eventos nov jobs` | migr. 0004 L404– | Coinciden 1:1 con `SUBG`; «DJ de discoteca» y «Local para fiestas privadas» también existen en Fiestas (no se duplica lógica: van por contacto, §6 #9) |
| `ALLOW` NEG-NOCHE `['svc','rsv']`; onboarding guarda `cx.nt` (cover, edad, lista 11 PM, fila 0) y `tool` (cover, edad, `hasL`, `list`) y prende `rsv` si dijo mesas > 0 | `lib/onb/datos.ts` L45, L88, L188–201 | Lo que dijo en Publica tu negocio siembra Tu herramienta «Esta noche» (sin pedirlo otra vez) |
| `lib/tarjeta.ts` `botonPrincipal` (NEG-NOCHE «Lista y mesas» si `lista`/`mesas`, si no «Cómo llegar») y chip verificado «Edad 21+ · código» desde `attrs.nt` | L66, L86–87 | Tarjeta del buscador ya alineada; `attrs.nt` y `attrs.tarjeta.eta`/`fee` son los derivados que escribe 4na |
| `items` (`module 'svc'`, `svc_kind`, `svc_attrs`, `svc_opts`, `price_from`, `deposit_cents`, `stock_left`) · `item_sections` | migr. 0022, 0043, 0048, 0057, 0070, 0074 | Lista, entrada, mesas, VIP, noches especiales y «por fecha»; se amplía `svc_kind` (§2) |
| `lib/oficios.ts` (`KINDS` por rubro, `Attrs`, `TOOL_DEF`, `oficiosPanel`, `limpiarOficio` validado en el servidor, `recalcularFiltros`) · `app/panel/Oficios.tsx` + `acciones-oficios.ts` | 4a, 4h, 4t, 4w | **Editor de servicios** de Noche: se suma el rubro `noche` con sus tipos y atributos (hueco #1) |
| `lib/reservas.ts` (2e: retención corta `rsvRetener`, `rsvEnviar` con duplicado y `client_key`, `vencerMesas`, `rsvCliente` cancelar / aceptar / nogracias / tarde, **`rsvPaso` confirmar · otra · nohay · llegaron · nollegaron · sefueron**, `mesasPanel`, `mesaDetalle`, `mesasPendientes`) · `app/panel` Reservaciones | 2e, 2k, migr. 0024 | **Patrón y pasos de la mesa de noche** (confirmar, otra hora, no hay, llegaron, no llegaron, te guardan la mesa N min). Las mesas de un restaurante (áreas × tamaños × turnos) no sirven tal cual: la mesa de noche es por **tipo** (terraza, VIP, frente a la pista) con depósito y mínimo — §2 |
| `lib/citas.ts` `enviarCita` (candado `pg_advisory_xact_lock`, `client_key`, **depósito retenido antes de guardar** y liberado en rollback) · `lib/citas-flujo.ts` (`vencerCitas`, `citaCambio`, `avisarCliente`, `avisarNeg`) | 3a–3c | Motor de dinero del depósito de mesa (retener → cobrar al confirmar → liberar o devolver) |
| `lib/fiestas-reservas.ts` (4v: retiene al enviar, cobra al confirmar, devolución por regla de días, `barrerFiestas`) | 4v | **Plantilla más cercana**: mismo dinero con otra regla de cancelación (6 PM de esa noche en vez de 30 días) |
| `lib/cobros.ts` (`comision`, `registrarRetencion`, `cobrarOperacion`, `liberarOperacion`, `devolverPago`, `repararPagos`) · `lib/pagos/pasarela.ts` (`retener` manual capture, `cobrar`, `liberar`, `devolver`) | 2d, 4d | Depósito de la mesa y su devolución |
| `lib/resenas.ts` (`opParaResena`, `hechosCita`, `limpiarRespuestas` por rubro, `rubroRes`) · `lib/resenas-filtro.ts` | 2g, 4g, 4m, 4s, 4z | Reseña verificada por noche (`night` done): rubro `noche` |
| `lib/ayuda-cita.ts` (`RubroAyuda`, `MOTIVOS`, `CON_FOTO`, `pedirAyudaCita`, `responderAyudaCita`, fotos privadas, `NUM /^[CMAFV]-/`) · `lib/ayuda-motivos.ts` (`POR_RUBRO`) | 3e, 4g, 4m, 4s, 4z | Ayuda con la noche: rubro `noche`, `NUM` acepta `N-` |
| `lib/licencias.ts` + `license_kinds` / `licenses` (estados, `licencias_refrescar`, `lic_valid`, cola Licencias) | 1k, 4h-3, 4w | Licencia de licor del PLCB como **sello** (no bloquea nada: la app no vende alcohol) — §6 #11 |
| `lib/avisos.ts` (`avisar`, `avisarNegocio`) · `notif_templates` | 2j | Plantillas nuevas ES/EN (4nc, 4nd) |
| `lib/plan.ts` (`TOPE_FREE 10`, `ITEMS_FREE 5`) · `lib/suscripcion.ts` | 1h, 2s | Free = 5 servicios visibles y 10 al mes sin tarjeta |
| `lib/barrido.ts` `barridoCentral` (cada minuto, `system_jobs`; tareas `mesas`, `fiestas`, `viajes`, `dinero`…) | migr. 0078 | Se suma la tarea `noche` (vencer, cerrar la noche a las 6 AM, recalcular `sincover`/`fila`) — sin servicio nuevo |
| Super Admin: `app/admin/N360.tsx` (Lo que vende, ocultar con motivo), `Transacciones.tsx` + `lib/admin-tx.ts` (`TabTx` … `fiesta` · `viaje`), `Colas.tsx`, `Analitica.tsx` + `lib/admin-analitica.ts`, `Planes.tsx` (`fee_rules`) | 1i, 2i, 4z-3 | Pestaña **Noche**, colas y analítica |
| Guardianes `dineroDelServidor`, `retencionPorTarjeta`, `transaccionEnFila`, `operacionesConTipo`, `fotoAyudaPrivada`, `semilla` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |
| `operations.kind` ya admite `'night'` (y `'tickets'`, `'table'`); `change_proposals.kind 'time'`; `payments.kind` `deposit`; `fee_rules.kind` ya admite `'bol'` y `'rsv'` | 0023, 0024, 0053, 0074 | Sin migración para el tipo de operación |
| Regla de 21+ de Mercados: **nada de 21+ se vende ni se aparta por la app**; se compra en el local con ID | migr. 0064 L14, `docs/ayuda/ebt-y-edad.md` | Misma regla en Noche: la app no vende tragos, botellas ni hookah (§3, guardián `alcoholNoSeVende`) |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo (etapas 1–4: categoría, ficha, lista / mesa / boletos y estado, reseña y ayuda; MEM 2115–2129).
El **panel** solo trae «Tu herramienta · Esta noche» (`blocksC` L387–396) y el Servicios genérico (`svcSync` L129–139 lee de `over.items`
nombre, precio, descripción y `k`; no sabe de personas, depósito, mínimo, hora de la lista ni cuántas mesas hay). **No hay:**
1. **Editor de servicios** de Noche (lista con hora y precio de lista; entrada que sigue al cover; mesa con personas, mínimo, depósito, por
   hora (billar) y **cuántas mesas de ese tipo hay**; VIP con lo que incluye; noche especial ligada a un evento; «por fecha»). Se compone sobre
   `Oficios.tsx` con el rubro `noche`.
2. **Cuántas mesas hay de cada tipo**: el prototipo marca horas tomadas al azar (`slotsOf` L27, `hash < .3`). Sin ese dato no hay cupo real.
3. **Solicitud de mesa en el panel** (personas, ocasión, nota, hora de llegada, depósito, otras solicitudes para el mismo tipo esa noche) y
   su respuesta: Confirmar / Otra hora / No hay mesa; luego **Llegaron · No llegaron · No entró: sin identificación**.
4. **La lista de esta noche en la puerta** (buscar por nombre o código, «Entraron N de M»): el prototipo da el código pero nadie lo marca.
   Se compone en el panel (teléfono primero); en la Fase 6 la absorbe la app Puerta (`/puerta`).
5. **Código de vestimenta** (`nt.dress`) y **música** fuera de la herramienta: la herramienta tiene música (L395) pero no código; el código
   sale de la semilla. Se suma una fila de texto ES/EN en Tu herramienta.
6. **Historial de lo publicado por noche** (qué cover, «después de», lista y fila había y a qué hora): la Ayuda lo promete («Miramos el cover
   que el local publicó esa noche y tu recibo», rev L77) y el prototipo no lo guarda.
7. **Fila en vivo que caduca**: la ficha dice «HACE 4 MIN» fijo (listing L137). Hace falta la hora real de la fila y qué se muestra cuando
   ya no es de ahora.
8. **Noches especiales con boleto** (`k evento`, `eid`) abren la página del evento (listing L127–129), que es la **Fase 6 Eventos**.
9. **Por fecha** (DJ, promotor, salón privado): «Pedir fecha» abre el contacto (kind L107, L113); no hay flujo propio.
10. Super Admin: Transacciones › **Noche**, Colas › «Mesas no respetadas» y «Covers cobrados de más», licencia de licor en Licencias,
    Analítica Noche.
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de solicitud del panel, Reservaciones
del panel (2e), `Citas.tsx`) y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

### 1c. Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, lista / mesa, revisión y estado; nunca se suavizan)
- **Noche (`NEG-NOCHE`):** «¿cuánto es el cover y cómo está la fila?» · línea **«El cover que ves es el que pagas en la puerta.»**
  (`TLNoche.line` L77) · sub: «Cada local publica el cover de esta noche, la edad y la fila en vivo desde que abre. Si cambia el cover, lo ves
  aquí antes de salir.» (L78). Reglas con candado (Tu herramienta L396): «El cover publicado es el de la puerta» («Si cambia, cambia aquí
  primero.») · «El mínimo de mesa no es un cargo extra» («Se consume en la noche.»). Notas fijas: «La lista es gratis y no cobra nada. Solo te
  guarda el precio de la lista hasta la hora que dice.» · «Mesas: el mínimo es consumo, no un cargo aparte. Si piden depósito, se descuenta de tu
  cuenta.» (listing L132–133). Edad: «21+ con licencia, pasaporte o ID del estado vigente. Sin identificación no entras, aunque estés en la
  lista.» / 18+: «… Para tomar alcohol hay que tener 21 y te ponen pulsera.» (kind L30). Seguridad: «Si alguien corre peligro, llama al 911.»
  (rev L39, L67).

**Lo que el prototipo de Noche hace de verdad** (y lo que no): cinco formas de servicio en la pestaña «Esta noche» (`listing` L3): **cover**
(entrada: se paga en la puerta, nunca en la app; botón «Cómo llegar»), **lista** (anotarse no cobra nada; entras gratis o con cover reducido
hasta la hora de la lista; queda al instante con código), **mesa** (solicitud con personas y hora de llegada; mínimo de consumo; depósito
opcional que se descuenta de la cuenta; billar por hora), **vip** (mesa con botella y depósito), **evento** (noche especial con boleto pagado
en la app → página del evento). DJ, promotor y salón privado trabajan **por fecha** («Pedir fecha» → contacto). Las noches son hoy y las 6
siguientes (`DN` L17); las horas pasan de las 24 (26 = 2 AM). **No** hay venta de tragos, botellas ni hookah en la app, **no** hay cover
cobrado en la app, **no** hay verificación de edad en la app (la hace la puerta, en persona), **no** hay fila medida por la app (la publica el
local). Todo se construye sin terceros pagados nuevos (PLAN §8): cobros con Stripe, avisos con el SMS ya pagado.

**Tipos por negocio** (deciden FAQ, reseñas por tipo, pestaña y CTA; derivados de las subcategorías con `KS` L9–11, el admin puede
forzarlo): `club · salsa · urbano · banda · bar · sport · karaoke · billar · cerve · lounge · show` (local con noche) y `dj · promo ·
salon` (por fecha; pestaña «Para tu fecha» / «Próximas noches», `tabL` L143; sin horario ni dirección para DJ y promotor, L97–108).

---

## 2. Cambios de datos (migraciones 0081 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0081 `noche_servicios` (4na)**
- `items.svc_kind` amplía el check con `'cover', 'lista', 'mesa', 'vip', 'evento', 'fecha'` (rubro `noche`). `svc_attrs` (zod + guardián):
  `pax smallint 1–50` (personas por mesa; VIP hasta 12, `demo-biz` L593), `min_cents` (mínimo de consumo; 0 = «Sin mínimo»; `price_from` =
  mínimo para mostrar), `dep_cents` → `items.deposit_cents` (0–50000, ≤ mínimo cuando hay mínimo), `per_hour bool` (billar: `price_from` =
  precio por hora, `hora` L29), `tables smallint 1–50` (**cuántas mesas de ese tipo**, hueco #2; sin dato = 1), `until_min` (lista: minutos
  desde las 12 PM de la noche, 540–780 = 9 PM–1 AM, como la herramienta L393), `list_cents` (precio de la lista por persona; 0 = gratis),
  `dows smallint[]` (noches en que vale; `day` L27/L31), `inc [{es,en}]` (botella, mezcladores, mesero, boletos incluidos), `event_id`
  (ref `events`, nullable hasta la Fase 6), `occasion_ok bool` (cumpleaños: algo a la mesa). `cover` no lleva atributos propios: su precio
  **es** el cover de la herramienta (`liveIt` L101–106), el servidor lo copia; nunca se edita aparte.
- **`noche_settings`** (Tu herramienta «Esta noche», una fila por negocio; `TLDashCat.state` L192): `cover_cents 0–10000` (paso $5; L389,
  onboarding 0–60), `after_min smallint` (hora desde la que sube: 660 = 11 PM, 720 = 12 AM; null = igual toda la noche) + `after_cents`
  (check `after_cents > cover_cents`: «después de» solo si sube, MEM 164), `cover_by_dow jsonb` (`{0..6: cents}` validado por zod; «El
  viernes · Si esa noche es distinto», L391), `min_age smallint check in (18, 21)` def. 21, `list_on bool`, `list_until_min` (540–780),
  `list_cap smallint` (null = sin tope; hueco), `line_min smallint check in (0, 10, 20, 35)` + `line_at timestamptz` («CÓMO ESTÁ LA FILA
  AHORA», `FILA` L129), `music text[]` (subconjunto de `m:salsa · m:bachata · m:tipico · m:reggaeton · m:banda · m:envivo · m:mixto`, al menos
  uno, L395), `dress jsonb {es,en}` (hueco #5; ≤ 60), `reply_min smallint` def. 60 («Confirman en menos de 1 hora», flow L83), `hold_min`
  def. 30 («La mesa se guarda 30 minutos después de tu hora», L44), `cancel_cutoff time` def. 18:00 (L44, L102; fijo por ahora),
  `kind_override` (solo admin), `updated_by/at`. Días que abre y horario = `business_hours` (ya existe; la noche puede pasar de las 24).
- **`night_posts`** (historial de lo publicado; **solo inserción**, trigger inmutable como `app_events`): `id`, `business_id`, `city_id`,
  `night date` (la fecha de la tarde en que abre; lo que pasa antes de las 6 AM es de la noche anterior), `field check in ('cover','after',
  'by_dow','age','list','line','music','dress')`, `value jsonb`, `at timestamptz`, `by uuid` (miembro o `null` = barrido); índice
  `(business_id, night, at)`. Cada guardado de la herramienta escribe aquí en la misma transacción. Alimenta Ayuda («el cover que publicó esa
  noche a esa hora»), Analítica (cuántas veces sube el cover después de publicado) y el aviso de cambio de cover.
- `category_attrs.NEG-NOCHE` (MD L262: `cover, cover_after, min_age, music, dress_code, line_now, guest_list_until, nights`) = copia
  derivada para la tarjeta (`attrs.nt`) — nunca se edita a mano; la fuente es `noche_settings`.
- Derivados en `businesses.filter_values` (recalculados al guardar y por el barrido: a las 12 PM de la ciudad cambia «esta noche», y cada
  vez que la fila deja de ser de ahora): `cover` / `sincover` (de **esta noche**, con `cover_by_dow`), `lista`, `mesas` (algún servicio
  `mesa`/`vip` publicado con `rsv` encendido), `fila` (fila ≤ 10 min publicada hace ≤ 60 min, o la de la última noche abierta), `e18` / `e21`,
  `m:*`, `vestimenta`, `tarde` (cierra 2 AM o más), y los de amenidades ya existentes (`terraza`, `karaoke`, `deportes`, `comida`, `esp`,
  `estac`, `y10`). `attrs.tarjeta.eta` = «Hoy: cover $10 · $15 después de las 11 PM · 21+» / «Mañana: sin cover · 21+» (L39–40) y
  `attrs.tarjeta.fee` = «Fila anoche a las 11:30 PM: ~15 min» / «Fila ahora: ~10 min» / «Sin fila el sábado» (L41, `apply` L284–286).
- `license_kinds` + `pa_plcb` (licencia de licor del Pennsylvania Liquor Control Board; **sin verificar**, §6 #11): sello «Licencia de licor
  verificada», no bloquea nada.
- `fee_rules.kind` + `'noche'` (depósito de mesa; sembrada igual que `bol` = 500 bp + 100 ¢, que es lo que el prototipo cobra a Noche,
  adm-data L21/L133; §6 #12).

**0082 `noche_reservas` (4nc)** — `operations` `kind 'night'` con `details`: `k check in ('lista','mesa','vip')`, `item_id`, `night date`,
`arrive_min` (hora de llegada en minutos desde las 12 PM de la noche), `occasion check in ('bailar','cumple','despedida','celebra')` (`OCC`
L19), `note ≤ 200`, `door_cents` (lo que pagará en la puerta, **copiado** al enviar: lista o cover de esa noche), `list_until_min`,
`min_cents`, `min_age` (copiada), `hours` (billar), `checked_in_n`, `checked_in_at`, `checked_in_by`, `noid bool`; `party_size` (ya existe,
0024); `scheduled_at` = noche + hora de llegada; `deposit_cents` = el del servicio (0 en lista). **`night_seq start 7101`** (número
**N-7101**, «RESERVA #», flow L71; §6 #13). **`door_code`** char(4) en columna propia, `unique (business_id, night_date, door_code)` donde
la operación está viva; nunca en vistas públicas ni en logs. Índices `(business_id, (details->>'night'), status) where kind = 'night'` y
`(user_id, sent_at desc) where kind = 'night'`. **Cupo de mesas** = `items.svc_attrs.tables` − operaciones vivas (`pending`,
`change_proposed`, `confirmed`) del mismo `item_id` y noche (derivado, nunca editable; candado `noche:{negocio}:{noche}:{item}`).
`booking_policies.expires_h` = 1 para NEG-NOCHE (el check 1–48 ya lo admite). `operation_events`: `night_list`, `night_sent`, `night_ok`,
`night_alt`, `night_no`, `night_exp`, `night_cx`, `night_cx_kept`, `night_biz_cx`, `night_in`, `night_noshow`, `night_noid`, `night_done`,
`cover_up`.

**0083 `ayuda_noche` (4nd)** — `help_requests.reason` amplía Noche (`RSN` L45: `cover` (foto), `lista`, `mesa`, `minimo` (foto), `seguro`
(escala directo a To'Latino), `trato`, `otro`; y `deposito` (foto) «No me descontaron el depósito», hueco §6 #6); `wants` reusa `devolver`
y `avisar` (`SOL` L46). `reviews.answers` / `facts` con lo de 4nd. Plantillas de aviso de 4nc–4nd que no entraron en su bloque.

---

## 3. Dinero (reglas del servidor — Opus/high; revisión de seguridad obligatoria)

El servidor calcula todo; el cliente solo muestra (guardián `dineroDelServidor`). Comisión solo sobre tarjeta en la app. **To'Latino no cobra
cover, tragos, botellas, hookah ni el mínimo**: eso se paga en el local. En la app solo pasan el **depósito de la mesa** (este grupo) y los
**boletos** (Fase 6 Eventos, comisión `bol`).

| Momento | Lista (`k lista`) | Mesa / VIP (`k mesa`, `vip`) |
|---|---|---|
| Al enviar | $0. Queda **al instante** «ESTÁS EN LA LISTA» con código (flow L72, L84). Se copia lo de la puerta: «Gratis antes de las 11 PM» o «$8 por persona antes de las 9 PM» | Tarjeta: **se retiene el depósito** del servicio (`depOf` L28; 0 = «Sin depósito»). «HOY PAGAS $X» = depósito. Sin depósito: $0 y sin tarjeta |
| Sin respuesta | — | `reply_min` (60 min; nunca después de la hora de llegada − 15 min) → SIN RESPUESTA, se libera completo |
| Lo confirman | — | **Se cobra el depósito** (captura); la mesa cuenta en el cupo; «MESA CONFIRMADA · Código 4821 · Te guardan la mesa 30 min» |
| Otra hora | — | Lo retenido sigue; «Aceptar esta hora» → se cobra; «No me sirve» → se libera completo (L85, L99) |
| No hay mesa | — | Se libera completo («NO HAY MESA · Te devolvimos el depósito.», L86) |
| La noche | Paga en la puerta lo copiado si llega antes de la hora de la lista; después, el cover normal de esa noche | El depósito **se descuenta de su cuenta en el local** (fuera de la app); el mínimo es consumo, no un cargo aparte |
| Cancela el cliente | Gratis siempre («Salir de la lista») | Antes de las 6 PM de esa noche → **devolución completa**; después → **el depósito se queda con el local** (L44, L102; §6 #3) |
| No llegaron (30 min después de su hora) | La lista cierra sin entrada (sin dinero) | El negocio marca «No llegaron» → el depósito se queda (ya cobrado); ayuda abierta si el cliente dice que sí llegó |
| No entró: sin identificación | Sin dinero | Igual que «No llegaron» (la regla se leyó antes de pagar), con su propio hecho y cola en Super Admin (§6 #2) |
| Cancela el negocio / no respeta la mesa | Hecho «No respetaron la lista»; Ayuda | **Devolución completa siempre**, motivo obligatorio, hecho en la reseña y cola «Mesas no respetadas» |

- **Captura y liberación** con `cobrarOperacion` / `liberarOperacion` / `devolverPago` (idempotentes; candado `noche:{negocio}:{noche}:{item}`
  antes de tocar cupo o dinero). La retención vive como mucho `reply_min` (o hasta la hora de llegada); la reserva es a 7 noches como mucho
  (`DN` L17); nada se retiene más de 6 días (guardián `retencionPorTarjeta`).
- **Precio cerrado de la noche** = copia al enviar (`door_cents`, `list_until_min`, `min_cents`, depósito, edad): si el local cambia la
  herramienta después, lo que ya mandaste no cambia. Si **sube el cover** de una noche con listas o mesas vivas, aviso SMS `noche_cover` a esos
  clientes (flow L69: «Si cambia el cover o la fila, te avisamos»; la fila no manda SMS, §6 #8) y la ficha lo muestra antes de salir.
- **Comisión:** `fee_rules 'noche'` sobre el depósito capturado (también cuando se queda con el local); devolución con su comisión devuelta en
  proporción (como 3e). Free / sin tarjeta: $0.
- **Lo que no pasa por la app:** cover, lista, consumo, mínimo, botella, propina. Una diferencia de cover cobrada en la puerta la devuelve el
  local fuera de la app y el cliente confirma «Me lo devolvieron» (como Mercados #12 y Fiestas); To'Latino solo devuelve por Stripe lo que
  cobró (el depósito).
- **21+:** la app **no verifica edad, no pide fecha de nacimiento y nunca guarda la imagen de una identificación** (el diseño no lo pide: la
  puerta revisa el ID en persona, kind L30). La edad de la noche se copia en la reserva y se muestra en hoja, revisión y estado («Todos con
  identificación: 21+.», L44). Las fotos de Ayuda son del recibo o de la pantalla con el cover publicado (rev L66), nunca de un ID.
- **Guardianes nuevos:** `coverConHistoria` (cada cambio de cover, «después de», lista, edad o fila en `noche_settings` tiene su fila en
  `night_posts` en la misma transacción; `night_posts` no se edita ni se borra); `coverNuncaEnLaApp` (ningún `payment` ni línea de operación
  por un servicio `cover` o `lista`; `k lista` siempre con $0); `alcoholNoSeVende` (ningún ítem de NEG-NOCHE con módulo `menu`/`shop` en
  venta en línea; VIP = solo depósito); `depositoNoche` (ningún depósito capturado sin `confirmed`; ninguno retenido en
  `declined/expired/cancelled` más de 1 h; cancelación antes del corte = devolución exacta; después = 0 devuelto); `mesasSinSobreventa` (Σ
  operaciones vivas por ítem y noche ≤ `tables`, prueba de carrera con 3 clientes por la última mesa); `codigoPuerta` (único por negocio y
  noche; nunca en vistas públicas, logs, avisos de terceros ni Super Admin sin rol); `sinImagenDeID` (ninguna columna de fecha de nacimiento ni
  `media.owner_kind` de identificación en esquema o código de Noche; motivo de Ayuda sin «foto del ID»); `nocheCruzaMedianoche` (una llegada a
  la 1 AM es de la noche anterior: `night` y corte de 6 PM con reloj movido); `filaNoFalsa` (una fila con `line_at` de hace más de 60 min nunca
  sale como «ahora»); `semilla`.

---

## 4. Bloques

### 4na · Noche: servicios, «Esta noche» (Tu herramienta), historial, filtros y licencia (panel + admin + datos) — Sonnet/medium; migración Opus
**Datos:** migración 0081. Semilla de pruebas `infra/pruebas/semilla/0023_noche.sql` (`is_test`, nunca en producción), generada por
`scripts/semilla/extraer-noche.cjs` (como `extraer-transporte.cjs`) desde `TLNoche.B` (23: `nt` → `noche_settings` con fechas reales
desde hoy, `closed` / `hrs` / `sat` / `sun` → horario de noche, `tags` → amenidades), `TLNocheL.SVC` (`k`, `until`, `pax`, `dep`, `hora`,
`day` → `items`; los `evento` sin `event_id` quedan ocultos hasta la Fase 6), `STAFF`, `ABOUT`, `RV`, `STATS`, el panel `REAL_C` (dash2-cat
L40) y el demo `demo-noche` (`demo-biz.js` L589–640) con listas, mesas y reseñas. Lo de la «Barra» del demo (cubeta, mojito, hookah,
botella como `k cover`, L596) **no se siembra como servicio** (§6 #14). `night_posts` con la historia de la semana de ejemplo.
**Panel (Lo que vendes):**
- **Servicios** (hueco #1, `Oficios.tsx` rubro `noche`): secciones («Esta noche», «Mesas», «Noches especiales», «Para tu fecha»); por servicio:
  nombre ES/EN, descripción, foto, **qué es** (`cover` «Entrada · sigue a tu cover» sin precio editable · `lista` «Hasta las 11 PM · gratis o
  $X por persona» · `mesa` «Hasta 6 personas · mínimo $150 · depósito $50 · tienes 4 mesas así» / por hora · `vip` «Hasta 8 · incluye» ·
  `evento` «Se vende en Eventos» · `fecha` «Desde $350 · por fecha»), noches en que vale, ocultar; Free = 5 visibles.
- **Tu herramienta «Esta noche»** (§5): cada toque se guarda, deja `AuditEntry` y su fila en `night_posts`.
- **Tu página › Licencias** (como 4h-3): «Licencia de licor (PLCB)» con número y foto del documento; en revisión no cambia nada de la ficha.
**Servidor:** `lib/noche.ts` (`nochePanel`, `guardarHerramientaNoche` (valida «después de» > cover, música ≥ 1, lista 9 PM–1 AM, escribe
`night_posts`, recalcula), `ponerFila(negocio, min)`, `estaNoche(negocio, fecha)` = cover / después / edad / lista / fila / música de esa
noche con `cover_by_dow`, `nocheDe(ts, ciudad)` (corte 6 AM), `recalcularFiltrosNoche`, `kindNoche`), `app/panel/acciones-noche.ts`.
**Super Admin (ADM-NEG 360 › Lo que vende):** «Esta noche» en solo lectura siempre (`summary` L322: «Cover $10 · 21+ · lista hasta las 11 PM ·
fila 15 min · vie $15»; MEM 164 «Super Admin ve "Esta noche" siempre») + el historial de la noche; forzar el tipo (`kind_override`), ocultar
servicio con motivo, pausar módulos (`svc`, `rsv`); Catálogo › Licencias (`pa_plcb`); Catálogo › Filtros (los de §2). Auditoría de cada cambio.
**Guardianes:** `svc_kind` de noche coherente con sus atributos (`mesa`/`vip` con `pax` y `tables`; `lista` con `until_min`; `cover` sin precio
propio; `evento` sin venta mientras no haya `event_id` publicado); `coverConHistoria`; `filaNoFalsa`; `sincover` cambia a las 12 PM de la
ciudad (prueba con reloj movido y `cover_by_dow`); ningún `filter_values` sin fuente; ES/EN en todo texto nuevo.

### 4nb · Ficha de Noche (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-NOCHE), pestaña **Esta noche** / «Mañana viernes» / «Para tu fecha» / «Próximas noches»
(`tabL` L143, kind L122), hoja del servicio, tarjeta «TU NOCHE», barra y riel; página de categoría (derivados).
- **Tarjeta de esta noche** (`ax.veh` L136): «ESTA NOCHE · COVER» $10 · $15 después de las 11 PM · «21+ · BACHATA Y MERENGUE · DJ KELVIN» ·
  «Código: Sin gorra ni chancletas» · «Lo publica el local; es lo que pagas en la puerta». **La fila** (`ax.q` L137): «~15 min» + «Ahora · lo
  puso el local.» con la hora real de `line_at`, o «El sábado a las 11:30 PM. En vivo desde que abren.»; «AÚN NO ABRE» / «HOY NO ABRE» (kind
  L124); nunca «HACE 4 MIN» inventado (hueco #7).
- **Esta noche** por sección (L127–129): precio y meta de `priceFor` L110–116 («Gratis · CON LA LISTA HASTA LAS 11 PM» · «$10 · EN LA PUERTA»
  · «Mínimo $150 · HASTA 6 PERSONAS · DEPÓSITO $50» · «$10/hora» · «$250 · HASTA 8 PERSONAS» · «Desde $350 · POR FECHA»); botones «Anotarme» ·
  «Reservar» · «Cómo llegar» (cover) · «Boletos» (Fase 6) · «Pedir fecha» (contacto). La Entrada y la Lista siguen a la herramienta (`liveIt`):
  «$10 hasta las 11 PM, $15 después. Se paga en la puerta. Otras noches: viernes $15.»
- **Hoja** (L158–171): personas 1–10 (o boletos), precio, la tarjeta de esta noche y el texto de pago (`payT` L163–165: lista «Anotarte no cobra
  nada. En la puerta pagas…»; mesa «Depósito de $X al enviar; se descuenta de tu cuenta. Si no confirman, se devuelve. El mínimo es consumo,
  no un cargo aparte.» con la corrección de §6 #1); CTA «Anotarme en la lista» / «Pedir la mesa» / «Cómo llegar».
- **Notas** (máx. 4, L130–133): la línea + «Esta noche: cover $10…» · «Edad: 21+ con identificación. Código: …» · la nota de la lista · la de
  mesas.
- **Resumen:** riel COVER · EDAD · LA FILA (`TD` L142; «FILA AHORA» / «FILA EL SÁBADO» / «FILA ANOCHE», `resAdd` L174), «Anótate en la lista o
  pide mesa aquí.» + la línea (L173), sellos «Cover publicado cada noche» · «Lista de la noche» (L177), amenities (`AM` L143: mesas, terraza,
  karaoke, deportes, cocina abierta, estacionamiento, español, «Hasta las 2 AM»), hechos COVER · EDAD «con identificación» · CÓDIGO (L145),
  FAQ por tipo (`faq` L22–47: cover / «¿Hay que pagar para entrar?», ID, hasta qué hora vale la lista, la fila, «¿Y si en la puerta me cobran
  más?», mínimo; por tipo salsa, banda, sport, karaoke, billar, cerve, lounge, show; la de Tu página gana), Licencia de licor verificada
  (si `valid`) como hecho.
- **Variantes (`TLNocheK.post` L88–125):** «VERIFICADAS POR LISTA O MESA» / «RESEÑAS DE VISITANTES · AÚN SIN LISTAS NI MESAS VERIFICADAS»;
  día cerrado = «PRÓXIMO · VIERNES · Abre a las 10 PM · cierra a las 3 AM» y pestaña «Mañana viernes»; **DJ y promotor** sin horario ni
  dirección («Por contrato» / «Según la noche», «TOCA EN DISCOTECAS Y FIESTAS · NO HAY LOCAL», «Dónde toca», «CÓMO TRABAJA», CTA «Pedir
  fecha» / «Ver sus noches»); **salón** «SE ALQUILA POR FECHA · HASTA 150 PERSONAS», «Horario para eventos», «Pedir fecha»; **Free** sin
  «Desde $»: «Sin cover» / «Cover en la puerta», «Aún no publica el cover en To'Latino: pregúntalo en la puerta.», CIERRA · EDAD · COVER «Sin
  publicar» (L116–120).
- **Página de categoría:** derivados de §2 y §5; tarjeta con `eta` y `fee`; «SIN COVER HOY» cuenta los de esta noche.
**Servidor:** `lib/noche-publico.ts` (`nochePublica(negocio, noche)`, `estaNocheTarjeta`, `faqNoche`, `tipoNoche`), reusando `ficha.ts`.
**Estados del cliente:** ninguno nuevo (nacen en 4nc). Tarjeta «TU NOCHE · PENDIENTE / EN LA LISTA / CONFIRMADA / TE PROPONEN UN CAMBIO» +
«Código 4821» (`mineCard` L111–113).

### 4nc · Lista de la noche y mesa / VIP: anotarse, depósito, confirmar, puerta, cancelar y «Pasó la noche» + Panel — **Opus/high** (dinero)
**Pantallas:** `APP-NEG-NOCHE-RESERVA` (`s.nb`), `APP-NEG-NOCHE-ESTADO` (`s.nres`), Mi cuenta › Citas y reservas, Panel › Hoy / **Mesas y
lista** (hueco #3) / **La lista de esta noche** (hueco #4).
- **Reserva (3 pasos, `bookVals` L31–70; escritorio en una página con columna fija):** 1 **Tu noche** (¿Cuántos van? 1 · 2 · 4 · 6 · 8 · 10
  hasta `pax`, con «$X en la puerta» en la lista con precio; OCASIÓN A bailar · Cumpleaños · Despedida · Celebración «Opcional. Si es
  cumpleaños, algunos locales traen algo a la mesa.»; nota 0/200 «Ej.: somos 6, llegamos juntos…») → 2 **Noche y hora** (hoy y 6 noches; las
  cerradas no se eligen; ¿A QUÉ HORA LLEGAN? cada 30 min desde que abre hasta la hora de la lista (lista) o 2 h antes del cierre (mesa); **las
  horas sin mesa salen del cupo real**, no al azar; «HASTA · La lista vale hasta las 11 PM»; «Esa noche no abre.») → 3 **Revisa y envía**
  (RESUMEN LISTA/RESERVA · NOCHE «Esta noche · llegas 10:30 PM» · PERSONAS · EN LA PUERTA · EDAD; PRECIO; CÓMO SE PAGA (`cobro` L40–42); BUENO
  SABER (`pol2` L44): la línea · «Todos con identificación: 21+.» · «Puedes salir de la lista cuando quieras.» / «Cancelar antes de las 6 PM de
  esa noche devuelve el depósito; después, se queda con el local.» · «La mesa se guarda 30 minutos después de tu hora.»; TARJETA (solo con
  depósito); Avisos por SMS «Si cambia el cover o la fila, te avisamos.»; barra HOY PAGAS $X · EN LA PUERTA: … → «Anotarme» / «Enviar
  solicitud»). Sin sesión → entrar y volver. Tarjeta rechazada: «Tu tarjeta fue rechazada. No se cobró nada.» (L60).
- **Servidor:** `anotarLista(userId, f)` y `pedirMesa(userId, f)` en `lib/noche-reservas.ts` (sesión con teléfono verificado; una lista viva
  por cliente, negocio y noche; techo Free; noche abierta y dentro de 7; hora antes de la lista o del cierre − 2 h; personas ≤ `pax`;
  `client_key`; candado `noche:{negocio}:{noche}:{item}` y cupo; precio y depósito del servidor; **retención antes de guardar**; código de
  puerta). Número N-7101….
**Estados** (`citaVals` L83–89): lista `ok` ESTÁS EN LA LISTA («Código 4821 · 4 personas» · «Di tu nombre y el código en la puerta. Gratis
antes de las 11 PM.») → `done` · mesa `pending` PENDIENTE («Esperando a {local}» · «Confirman en menos de 1 hora. Si no confirman, te
devolvemos el depósito.») → `confirmed` MESA CONFIRMADA («Esta noche · 10:30 PM» · «Código 4821. Te guardan la mesa 30 min.») |
`change_proposed` TE PROPONEN UN CAMBIO («A tu hora no tienen mesa. Si no te sirve, te devolvemos el depósito.»; «Aceptar esta hora» / «No me
sirve») | `declined` NO HAY MESA («Esa noche están llenos» + devuelto / «No se cobró nada.») | `expired` SIN RESPUESTA → `done` BUENA NOCHE
(«Gracias por usar To'Latino» + estado del depósito; estrellas → reseña verificada; «Otra noche» · «Ayuda con la noche») | `cancelled`
CANCELADA («Saliste de la lista» / «Cancelaste la reserva» + «Depósito $X devuelto · 3–5 días» o «El depósito se quedó con el local»).
Cerrada sin entrar: «NO LLEGASTE» / «NO ENTRASTE · SIN IDENTIFICACIÓN» (hueco; mismo componente `hdr`). Pasos: lista En la lista · Esta
noche · Terminada; mesa Enviada · Confirmada · Esta noche · Terminada (L90–92). Tu dinero: Depósito · MÍNIMO «El mínimo es consumo.» (L97).
Acciones: Cómo llegar · Calendario · Compartir · Cancelar / Salir de la lista (hoja con la regla que aplica a la hora real, no la fija del
prototipo, L102).
**Panel (Hoy · Mesas y lista · detalle):** Esperan tu respuesta (Confirmar / Otra hora / No hay mesa, con personas, ocasión, nota, hora,
depósito, «quedan N mesas de este tipo esa noche»; vence a los 60 min); Esta noche (mesas confirmadas por hora con código; «Llegaron» · «No
llegaron» (desde los 30 min después de su hora) · «No entró: sin identificación»; «Cancelar la mesa» con motivo → devolución completa);
**La lista de esta noche** (teléfono primero, para la puerta: buscar por nombre o código, «Entraron 3 de 4», total en la lista y entradas;
se puede usar sin conexión con lo bajado al abrir y sincroniza al volver). «Pasó la noche» no es un botón: el barrido cierra la noche a las 6 AM
(lista con entrada → `done`; sin entrada → cerrada sin entrar; mesa «Llegaron» → `done`).
**Servidor:** `responderMesa(negocio, num, paso)` sobre el patrón de `rsvPaso`, `decidirOtraHora` (cliente), `cancelarNoche(por, num, motivo)`
(regla de las 6 PM con `nocheDe`), `entradaLista(negocio, codigo, n)`, `marcarMesa(negocio, num, 'llegaron' | 'nollegaron' | 'noid')`,
barrido `barrerNoche` (vence a los 60 min, cierra la noche a las 6 AM, recalcula `sincover` a las 12 PM y `fila` al caducar, SMS de cover que
sube) en `lib/barrido.ts`.
**Avisos:** `noche_lista` (en la lista con código; SMS si lo pidió), `biz_noche_mesa` (nueva solicitud, SMS), `noche_ok` (SMS), `noche_alt`,
`noche_no`, `noche_exp`, `noche_cx` (con lo devuelto o lo que se quedó), `noche_biz_cx` (SMS), `noche_cover` (SMS: «Esta noche el cover de
{local} es $X desde las …»); al negocio `biz_noche_alt_ok`, `biz_noche_cx`.
**Super Admin:** Transacciones › **Noche** (`TabTx 'noche'`: lista / mesa, depósito retenido / cobrado / devuelto / se quedó, línea de tiempo,
lo publicado esa noche); Colas › «Mesas no respetadas» (el negocio canceló o no la dio: 3 en 30 noches → sello en revisión), «Sin
identificación» (un local que marca muchos «no entró» con depósito: 3 en 30 noches → revisión) y «Retenciones que fallaron».
**Guardianes:** los de §3 + punta a punta: tres clientes por la última mesa VIP → uno pasa; lista sin tarjeta y $0 en `payments`; otra hora
aceptada y rechazada; vence a los 60 min; cancelar a las 5:59 PM y a las 6:01 PM (reloj movido); llegada a la 1 AM cuenta en la noche anterior;
el cover sube a las 9 PM con 12 en la lista → 12 SMS y la copia de cada reserva no cambia; código de puerta que no sale en ninguna vista pública.

### 4nd · Reseñas y Ayuda con la noche — Sonnet/medium; ayuda con dinero Opus
- **Reseña** (`APP-NEG-RESENA`, `TLNocheRev`): verificada = `night` `done` (lista con entrada o mesa con «Llegaron»); «Fui sin reservar · Pagué en
  la puerta · VISITANTE» (`srcs` L21–23). Dato de la reserva (no se edita, `tm` L31–32): RESERVA · PERSONAS · PAGASTE EN LA APP («TU NOCHE ·
  DATO DE LA RESERVA»; «La reserva y lo que pagaste en la app salen de To'Latino. No se editan.»). Preguntas (`groups` L24–30): ¿COBRARON EL
  COVER PUBLICADO? (Sí · Cobraron más) · ¿LA FILA FUE LA QUE DECÍA? (Sí · Un poco más · Mucho más) · ¿REGLAS CLARAS? · ¿TE SENTISTE SEGURO? ·
  ¿LA MÚSICA FUE LA ANUNCIADA? · TRATO EN LA PUERTA. **LO QUE IMPORTA DE NOCHE** (`asp` L82–85: COBRARON EL COVER PUBLICADO · LA FILA FUE LA QUE
  DECÍA · REGLAS CLARAS · TE SENTISTE SEGURO · MÚSICA COMO ANUNCIARON · TRATO EN LA PUERTA; «De N noches con lista o mesa por To'Latino en los
  últimos 90 días.», L86). Hechos (L87–91): Cover el publicado / Cobraron más cover · Fila como decía / Fila más larga · No se sintió seguro; y
  del servidor (no del cliente): No respetaron la mesa / la lista. ≤2 ★ → «La reseña no devuelve dinero. Si cobraron más cover o no respetaron tu
  lista o mesa, pídelo en Ayuda con la noche. Si alguien corre peligro, llama al 911.» (L39). Respuesta del local como hoy (2g).
- **Ayuda** `APP-NEG-NOCHE-AYUDA` → `-ESTADO` (`nhelp` L51–88; entradas: noche `done` o cerrada sin entrar, reseña ≤2 ★): MOTIVO (Cobraron más
  cover · No respetaron la lista · No respetaron la mesa · Cobraron el mínimo aparte · Me sentí inseguro · Mal trato en la puerta · Otra cosa;
  + «No me descontaron el depósito», §6 #6) + ¿Qué pasó? ≥15 («Ej.: decía $10 y en la puerta cobraron $15 a las 10:40…») + ¿CUÁNTO? · OPCIONAL
  + Fotos · obligatorias en cobros («Del recibo o de la pantalla con el cover publicado.») + ¿Qué quieres? (Que me devuelvan «Lo cobrado de más o
  el depósito» · Solo quiero avisar «Lo lee el local y To'Latino») → RESPONDE EN 24 H → ACEPTÓ · PROPONE OTRA COSA · NO ACEPTÓ («{local} dice que
  cumplió lo acordado») → «Pedir revisión a To'Latino» → EN REVISIÓN 48 h («Miramos el cover que el local publicó esa noche y tu recibo.» — con
  `night_posts` a la hora del recibo) → LISTO. **«Me sentí inseguro»** va directo a To'Latino con prioridad y el texto «Si alguien corre peligro
  ahora, llama al 911 primero.» (L67). Una abierta por reserva. Dinero: el depósito (cobrado en la app) se devuelve por Stripe; el cover o el
  mínimo cobrados de más los devuelve el local fuera de la app y el cliente confirma «Me lo devolvieron».
- **Servidor:** rubro `noche` en `ayuda-cita.ts` / `ayuda-motivos.ts` (`MOTIVOS`, `CON_FOTO` = cover · minimo · deposito; `NUM` acepta `N-`),
  `resenas.ts` (`rubroRes 'noche'`, `limpiarRespuestas`, hechos), `escalarVencidas` ya corre en el barrido.
- **Guardianes:** `fotoAyudaPrivada` (fotos del recibo privadas), `sinImagenDeID`; punta a punta: ayuda «cobraron más cover» con foto → el local
  acepta → «Me lo devolvieron»; «No me descontaron el depósito» → To'Latino decide → devolución exacta por Stripe; «inseguro» sin esperar 24 h.

### 4ne · Super Admin, avisos, analítica y documentación — Sonnet/medium
- **Super Admin:** Colas › Ayudas escaladas (motivos nuevos, «inseguro» con prioridad); Transacciones › Noche; Notificaciones (todas las
  plantillas nuevas ES/EN); Configuración (60 min de respuesta, 6 PM, 30 min de mesa, 60 min de fila — llega con Configuración, Fase 5);
  Analítica Noche (% mesas confirmadas en 60 min, % vencidas, mesas no respetadas, depósitos retenidos / cobrados / devueltos / que se quedaron,
  % de la lista que entró, veces que el cover sube después de publicado en el mismo día, % «fila como decía» en reseñas, ayudas «cobraron más
  cover» por cada 100 noches, licencias de licor vencidas). Todo con `city_id`, por cursor, sin N+1.
- **`docs/ayuda/`** (regla 9, ES/EN): cliente `esta-noche-cover-fila-y-edad` (cover, «después de», edad e ID, fila, código), `lista-de-la-noche`
  (código, hasta qué hora vale, salir de la lista), `pedir-mesa-o-vip` (depósito, mínimo, 6 PM, 30 min, otra hora), `ayuda-con-la-noche`;
  negocio `tu-herramienta-noche` (Esta noche: cover, por noche, después de, edad, lista, fila, música, código), `servicios-de-noche` (editor),
  `panel-mesas-y-lista` (responder, la lista en la puerta, llegaron / no llegaron / sin identificación, cancelar), `licencia-de-licor`; Super
  Admin: actualizar `admin-analitica.md`.
- **Triángulo** (regla 8): cada toque de Tu herramienta → ficha, tarjeta y Buscar (`summary` L322) → Super Admin lo ve, con su historia, y puede
  ocultar o pausar.

---

## 5. «Tu herramienta» y página de categoría (lo específico)

- **Noche · «Esta noche»** (`blocksC` L387–396; s: «Lo que preguntan antes de salir: cuánto es el cover y cómo está la fila. Lo que pongas aquí
  sale esta noche en tu página.»): **Cover de esta noche** (o «Cover del viernes» si hoy cierra; −/+ $5, 0–100; «El que ves es el que pagas en la
  puerta.») · DESPUÉS DE CIERTA HORA (Igual toda la noche · Después de las 11 PM · $+5 · Después de las 12 AM · $+10; solo si sube) · **las 3
  próximas noches que abre** («El viernes · Si esa noche es distinto.», −/+ $5) · EDAD MÍNIMA 18+ · 21+ · LISTA DE LA NOCHE (Sin lista · 9 PM ·
  10 PM · 11 PM · 12 AM · 1 AM) · CÓMO ESTÁ LA FILA AHORA (Sin fila · 10 min · 20 min · 30 min o más; «se ve en vivo»; toast «Listo. La gente lo
  ve en tu página.») · MÚSICA DE ESTA NOCHE (Bachata · Salsa · Típico · Reguetón · En vivo · Mixto; al menos una) · Código de vestimenta (hueco
  #5) · REGLAS · NO SE APAGAN (2 con candado). `apply()` (L283–286) → `nt`, tags `cover`/`sincover`/`lista`/`fila`/`e18`/`e21`/`m:*`, `eta`,
  `fee`; en código `noche_settings` + `night_posts` + `app/panel/acciones-noche.ts`. La fila tiene un atajo en Panel › Hoy (la puerta la cambia
  sin entrar a Lo que vendes).
- Lo que ya mandaron los clientes **copia** cover, lista, mínimo, depósito y edad: cambiar la herramienta no cambia una lista o una mesa viva
  (solo avisa si sube el cover).
- **Página de categoría** (ya en código; aquí solo los derivados): `plan` (NEED L54–57 → subcategorías: Bailar · Salsa y bachata · Reguetón ·
  Algo tranquilo · Ver el juego · Karaoke · Música en vivo · Mesa VIP), `hoy` (Sin cover · Fila corta · Desde 18 · Con lista), `mus` (Salsa ·
  Bachata · Merengue y típico · Reguetón y dembow · Banda y norteño · En vivo); GROUPS (L65–72) ORDENAR · ESTA NOCHE · EDAD · MÚSICA · LUGAR ·
  NEGOCIO; `QUICK5` sincover · fila · lista · e18 · mesas; stats «SIN COVER HOY». Todos derivados, cacheados, nunca editables; la consulta de la
  categoría lee `filter_values` con su GIN (presupuesto de velocidad), nunca `night_posts`.

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **¿El depósito se cobra al enviar?** El prototipo dice «Depósito de $X al enviar… Si no confirman, se devuelve» (listing L165, flow L42).
   Default (como Fiestas #1): **se retiene al enviar y se cobra al confirmar**; el texto pasa a «Hoy se retiene el depósito de $X; se cobra cuando
   confirmen y se descuenta de tu cuenta. Si no confirman, se libera completo.»
2. **«No entró: sin identificación».** No está en el diseño. Default: con mesa, cuenta como «No llegaron» (el depósito se queda; la regla del ID
   sale en la hoja, la revisión y el estado antes de pagar); con lista, sin dinero. Hecho propio y cola en Super Admin para que un local no lo use
   para quedarse depósitos. La app no pide fecha de nacimiento ni guarda la imagen de un ID (el diseño no lo pide).
3. **Corte de cancelación «6 PM de esa noche».** Con locales que abren a las 5 PM (Mambo L12) el corte cae después de la llegada. Default: el
   corte es las 6 PM o, si la llegada es antes de las 8 PM, 2 h antes de la llegada; se dice en la hoja con la hora exacta.
4. **¿Cuánto vale la fila «ahora»?** Default: 60 min desde que la puso el local; después sale «A las 11:30 PM: ~15 min» (la última con su hora) y,
   al día siguiente, la de la última noche abierta (`lastD`). Nunca se inventa la antigüedad.
5. **Tope de la lista.** El prototipo no tiene. Default: `list_cap` opcional (vacío = sin tope); al llegar, «La lista de esta noche está llena»
   y queda la entrada normal.
6. **«No me descontaron el depósito».** El diseño promete «se descuenta de tu cuenta» pero la Ayuda no tiene ese motivo. Default: se suma con
   foto del recibo obligatoria; si To'Latino lo confirma, se devuelve el depósito por Stripe.
7. **Free.** La ficha Free dice «AQUÍ NO SE RESERVA POR LA APP» (kind L92) y `canBook` exige Pro (L109); la decisión del 3 nov (MEM 87) dice que
   Free toma hasta 10 al mes pagando en el local. Default (como Fiestas #22): manda la decisión: Free acepta lista y mesa **sin depósito ni
   tarjeta**, tope 10 al mes; el texto Free se ajusta.
8. **SMS de la fila.** «Si cambia el cover o la fila, te avisamos» (flow L69). La fila cambia muchas veces en una noche. Default: SMS solo cuando
   **sube el cover** de una noche con listas o mesas vivas; la fila se ve en la ficha y en el estado.
9. **Por fecha (DJ, promotor, salón privado).** El diseño abre el contacto (kind L107, L113). Default: «Pedir fecha» abre Mensajes con el
   servicio puesto; sin dinero en la app. Si el fundador lo pide, se enciende el motor de Fiestas (4v) para NEG-NOCHE-23 y -25 sin código nuevo.
10. **Noches especiales con boleto** (`k evento`). Los boletos son de la Fase 6 Eventos (PLAN L212; tipos de evento de Noche en dash2-evt L22;
    sin venta en la puerta, D1). Default: el servicio guarda `event_id`; mientras Eventos no esté, **no sale en la ficha** (el panel dice «Se
    publica cuando abra Eventos»); «Mesa frente al escenario · 2 boletos incluidos» se vende como mesa y «incluye» lo dice. Comisión `bol`.
11. **Licencia de licor (PLCB).** No está en el diseño. Default: sello sin bloquear (la app no vende alcohol), **sin verificar**; `LAUNCH-CHECKLIST`:
    revisar con abogado si hace falta algo más (hookah, after-hours después de las 2 AM).
12. **Comisión.** El prototipo cobra a Noche como `bol` ($1 + 5 %, adm-data L133). Default: `fee_rules 'noche'` nueva sembrada igual que `bol`
    para que el fundador la mueva aparte; sobre el depósito capturado, también si se queda con el local.
13. **Número.** Default: **N-7101** («RESERVA #») con su secuencia; el código de puerta de 4 cifras aparte. Reversible.
14. **Errores del prototipo a no copiar:** horas tomadas al azar (`slotsOf` L27, `hash < .3`); «HACE 4 MIN» fijo (listing L137); la hora fija
    `12.5 >= 18` en la hoja de cancelar (flow L102); textos EN de Ayuda «They send the corrected bill» / «Read by the clinic» (rev L61) y «Va en
    tu próximo pickup o envío» (L74) copiados de otros rubros; `svc: 'Pedido'` (L54) y «Tu cita» (L65) en la ayuda; la «Barra» del demo (cubeta,
    mojito, hookah, botella) como `k cover` en servicios (demo-biz L596): **la app no vende tragos**; «Confirman en menos de 1 hora» (estado) vs
    «responde en 24 h» (ayuda): son dos plazos distintos y así se dicen.

## 7. Orden, dependencias y pruebas
4na → 4nb → 4nc (dinero) → 4nd → 4ne. 4nb y 4nc dependen de 4na (servicios, `noche_settings`, `night_posts`, `nocheDe`); 4nc reusa el dinero de
citas (3a–3c) y de Fiestas (4v) y los pasos de Reservaciones (2e) sin romper Comida / Belleza / Fiestas (regresión de sus mesas, citas y
depósitos); 4nd depende de 4nc; 4ne cierra. Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9
dispositivos con la `RESPUESTA` simulada igual que la barra del prototipo (ok · rechaza → no · nada → «Pasa 1 hora» → exp · cambio → otra hora
· tarjeta → rechazada al enviar; «Pasó la noche»; Ayuda «El local responde», «Pasan 24 h», «To'Latino decide») — en la app eso lo hacen el
panel, la puerta y los barridos del servidor (SP «Pasos del servicio», «Plazos sin respuesta»). Pruebas con reloj movido: 11:59 AM / 12:01 PM
(cambia «esta noche»), 5:59 / 6:01 PM (corte), 1 AM (noche anterior), 6 AM (cierre de la noche). Revisión de seguridad (regla 5) de 4na, 4nc y
4nd antes de cerrar (dinero, código de puerta, nada de ID). Presupuesto de velocidad: cupo de mesas y «esta noche» en una consulta indexada, sin
N+1. Capturas teléfono + escritorio de cada pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre del grupo (todo marcado antes de decir «Noche completa»)
- [ ] Migraciones 0081–0083 aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI.
- [ ] Semilla 0023 solo en pruebas (guardián `semilla`); demo `demo-noche` con listas, mesas, historia de la semana, reseñas y ayudas.
- [ ] Editor de servicios de Noche con todos sus tipos (cover que sigue a la herramienta, lista, mesa con cuántas hay, por hora, VIP, evento
      oculto hasta Eventos, por fecha).
- [ ] «Esta noche» guarda cada toque con su historia, refleja en ficha, tarjeta y Buscar, y el Super Admin la ve (triángulo).
- [ ] `sincover` y la fila cambian a su hora (reloj movido); la fila nunca sale «ahora» si no lo es.
- [ ] Lista de punta a punta ($0, código, puerta, entrada, cierre) y mesa con tarjeta (retiene, confirma y cobra, otra hora, no, vence, cancelar
      antes y después del corte, no llegaron, sin identificación, el negocio cancela) y sin tarjeta (Free): cifras exactas en `payments` y en
      Stripe simulado.
- [ ] Ninguna imagen de ID, fecha de nacimiento ni venta de alcohol en la app (guardianes probados al revés).
- [ ] Reseñas verificadas con preguntas y «Lo que importa de noche»; ayudas con motivos, fotos, 911 y escalado a To'Latino con el historial
      de esa noche.
- [ ] Super Admin: Transacciones › Noche, Colas (mesas no respetadas, sin identificación, ayudas), Licencias (PLCB), Notificaciones, Analítica.
- [ ] Avisos nuevos ES/EN en `notif_templates` y su SMS donde va.
- [ ] `docs/ayuda/` completas (ES/EN) para cliente y negocio (§4ne).
- [ ] Guardianes nuevos de §3 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes; Comida
      (mesas), Belleza, Fiestas y Transporte sin regresión.
- [ ] Preguntas #1–#14 anotadas en `docs/REVISION.md`; lo diferido en `docs/LAUNCH-CHECKLIST.md` (licencia de licor con abogado, boletos y
      Puerta en la Fase 6, Configuración de plazos en la Fase 5).
- [ ] `docs/PROGRESS.md` al día y `docs/REVISION.md` con los pasos para que el fundador lo mire en el sandbox.
