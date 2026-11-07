# Fase 4 · Fiestas + Transporte — plan de construcción extraído del prototipo (7 nov 2026)

## 0. Fuentes
Todas en `docs/diseno/pantallas/datos/` salvo indicación. **Fiestas:** `neg-fiesta.js` (TLFiesta: 26 negocios, todos Pro desde el
29 oct (MEM 118); `B` L10–35 con `busy` / `dep` / `cap` / `zone`, `SUBG` L41–49 = 7 capítulos y 56 subcategorías, `ROWS` L50–54, `EV` /
`DAY` / `GST` L55–65, `GROUPS` L70–77, `line` L82–83), `neg-fiesta-listing.js` (TLFiestaL: `SVC` L20–102 con `k pack · hora · unid · fijo ·
visita · cotiza` y `h`, `cap`, `mont`, `inc`, `u`, `min`; `STAFF` L103–119; `RV` / `STATS` L137–152; `asp` L160–164; «Tu fecha» `EVT` /
`DATES` / `GUESTS` / `WHERE` L179–182, `availOf` L187–191, `fechaVals` L193–205; `priceFor` L210–215; `metaOf` L216–219; `walkOnly` L220;
`listingAdd` L225–267; `sheetVals` L268–279; `resAdd` L280–286), `neg-fiesta-flow.js` (TLFiestaFlow: `APP-NEG-FIESTA-BOOKING` →
`APP-NEG-FIESTA-CITA`; cabecera L1–10, `qtyOf` L22, `totOf` L23, `depFor` L24, `starts` L25, `busyH` L26, `bookVals` L34–77, `sendNow`
L78–80 número `F-5xxx`, `citaVals` L86–116, `sim` L117–120), `neg-fiesta-kind.js` (TLFiestaK: `kind` L10–20, `noOffice` L23, `faq`
L26–50, `RK` L53–74, `post` L108–115), `neg-fiesta-rev.js` (TLFiestaRev y `TLHogarExt.fhelp`: `groups` L24–29, `tm` L30–31, `fix` L35–41,
`RSN` L44, `SOL` L45, `helpForm` L50–67, `helpStatus` L70–87). **Transporte:** `neg-trans.js` (TLTrans: 17 negocios, 10 Pro y 7 Free;
`B` L9–25, `SUBG` L27–32 = 4 capítulos y 30 subcategorías, `ROWS` / `NEED` / `WHO` L33–35, `GROUPS` L40–44, `line` L48–49),
`neg-trans-listing.js` (TLTransL: `SVC` L11–48 con `k asiento · priv · caja · cotiza` y `sal`, `pax`, `child`, `inc`; `RV` / `STATS`
L50–52; `asp` L56–57; `ST` L62; `canBook` L70; `priceFor` L71–75; `listingAdd` L77–97; `sheetVals` L98–103; `resAdd` L104–105),
`neg-trans-flow.js` (TLTransFlow: `APP-NEG-TRANS-RESERVA` → `APP-NEG-TRANS-ESTADO`; cabecera L1–6, `DN` L12 = 7 días, `totOf` L14,
`slotsOf` L15, `bookVals` L18–48, `sendNow` L49–51 número `V-9xxx`, `reply` L53, `citaVals` L56–74, `sim` L75–79), `neg-trans-kind.js`
(TLTransK: `kind` L9–13, `noOffice` L16, `faq` L19–33, `RK` L36–45, `post` L63–80), `neg-trans-rev.js` (TLTransRev y
`TLHogarExt.vhelp`: `groups` L20–26, `tm` L27–28, `fix` L32–38, `RSN` L41, `SOL` L42, `helpForm` L47–64, `helpStatus` L67–84).
**Comunes:** `dash2-cat.js` (TLDashCat: `DEP0` L130, `TOOLS['NEG-FIESTA'] = ['Calendario y depósito','Calendar and deposit','party']` y
`TOOLS['NEG-TRANS'] = ['Salidas y asientos','Departures and seats','truck']` L140, `tT` L158 (título por tipo), `state` L193–195, `apply`
L287–288, `summary` L323–325, `blocksC` L386–411; `BIZ[…]` L79–81: demos del panel Envíos Quisqueya Cargo, Mudanzas El Primo, Traslados Abuela),
`demo-biz.js` (`demo-fiesta` L737, `demo-trans` L1004), `adm-data.js` L23/L27 (las dos transaccionan `cita`; comisión `cita` 8 % L133),
`onb-neg-data.js` (= `apps/web/lib/onb/datos.ts` L47, L51, `ALLOW` L88–89, preguntas Fiestas L218–233 y Transporte L291–306);
`packages/db/migrations/0004_catalogo_datos.sql` (NEG-FIESTA-01…56 L525–635, NEG-TRANS-01…30 L997–1055: coinciden 1:1 con `SUBG`);
`docs/diseno/plan/taxonomia-negocios.md` §7 y §11 (familias **F-EVENTO** y **F-TRANSPORTE**); `docs/diseno/referencia/memoria-del-diseno.md`
(MEM 87, 118, 166, 170, 2079–2096, 2138–2144); `docs/diseno/entrega/modelo-datos.md` (MD: Operation `party` = Fiestas, `trip` = Transporte,
L834/L854; `category_attrs` NEG-FIESTA `capacity, busy_dates, deposit` L261 y NEG-TRANS `vehicle_types, routes, long_distance` L265);
`solo-prototipo.md` (SP §2 «El negocio responde», «Pasos del servicio», «Plazos sin respuesta»). Plantillas y motores ya construidos:
`fase4-hogar-auto.md` (4a–4g), `fase4-salud-pro.md` (4h–4m), `fase4-mercados-tiendas.md` (4n–4s). Decisiones que mandan:
`docs/DECISIONES.md` (O, P, Q, U, AA, AB). Esto es un resumen de trabajo; manda el prototipo. Nada de este archivo se ha construido.

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Página de categoría NEG-FIESTA (filas `tipo` foto · `fecha` chips `d:2/d:3/d:9` · `inv` chips `g:50…300`; `stats_tag d:2` «LIBRES ESTE SÁBADO») y NEG-TRANS (filas `a` «¿A dónde vas?» · `como` «Cómo viajas»; `stats_tag cerrado`) | `packages/taxonomy/paginas.json`, `lib/categoria.ts`, `lib/buscar.ts` | Ya servidas; faltan los derivados que las alimentan (`d:*`, `cerrado`, `hoy`, `24h`, `nino`, `silla`, `estados`) — §2, 4t, 4w |
| Subcategorías NEG-FIESTA-01…56 y NEG-TRANS-01…30; módulos por defecto `svc citas cot renta staff eventos nov jobs` | migr. 0004 | Coinciden 1:1 con `SUBG`; «Limosina y party bus» vive en las dos (NEG-FIESTA-52 y NEG-TRANS-12) |
| `ALLOW` NEG-FIESTA y NEG-TRANS `['svc','citas','cot','renta']`; onboarding guarda `tool.dep`, `tool.zone`, `cx.dep` (Fiestas) y `tool.h24`, `tool.silla`, `cx.seats` (Transporte) | `lib/onb/datos.ts` L47, L51, L88–89, L218–233, L291–306 | Lo que dijo en Publica tu negocio siembra Tu herramienta (ojo: error de `silla`, Preguntas #23) |
| `lib/tarjeta.ts` `botonPrincipal` (NEG-FIESTA «Booking» si `cita`; NEG-TRANS «Reservar» si Pro), `chipsTarjeta` («Hasta N invitados») | L51–93 | Tarjeta del buscador ya alineada; `attrs.tarjeta.eta` es el derivado que escribe 4t/4w |
| `items` (`module 'svc'`/`'renta'`, `svc_kind`, `svc_attrs`, `svc_opts`, `price_from`, `duration_min`, `stock_left`, `deposit_cents`) · `item_sections` | migr. 0022, 0043, 0048, 0057 | Paquetes de fiesta y viajes; se amplía `svc_kind` (§2) |
| `lib/oficios.ts` (`KINDS` por rubro, `Attrs`, `TOOL_DEF`, `oficiosPanel`, `limpiarOficio` validado en el servidor, `recalcularFiltros`) · `lib/servicios.ts` (`rubroSP`, `limpiarSP`) · `app/panel/Oficios.tsx` + `acciones-oficios.ts` | 4a, 4h | **Editor de servicios**: se suman los rubros `fiesta` y `trans` con sus tipos y atributos (hueco #1) |
| `lib/citas.ts` (`contexto`, `ocupadas`, `huecos`, `preparar`, `puede` techo Free, **`enviarCita`**: candado `pg_advisory_xact_lock`, `client_key`, depósito **retenido antes de guardar** y liberado en rollback, `auto` → `cobrarOperacion`) · `lib/citas-flujo.ts` (`vencerCitas`, `citaPaso` confirmar / otra / nopuedo / terminada, `citaCambio`, `citaCliente` cancelar / aceptar / nogracias, `avisarCliente`, `avisarNeg`) · `lib/citas-panel.ts` · `app/panel/Citas.tsx` | 3a–3c | **Motor de «Pedir la fecha»** (Fiestas) y del pedido de viaje (Transporte): solicitud → Confirmar / Otra hora / No puedo / vence, con su dinero |
| `lib/visitas.ts` (`calcularVisita`, `enviarVisita`: franja en la casa del cliente, dirección, zona) · `lib/oficios-publico.ts` (`depositoDe`, `misCasas`) | 4b | Servicios que **van a tu lugar** (DJ, renta con montaje, patio, chofer que recoge en tu casa) |
| `lib/solicitudes.ts` (`pedirPre` con fotos, `responderSolicitud`, `vencerSolicitudes`, `solicitudPanel`) · `app/panel/Solicitudes.tsx` | 4e | Mudanza / hotshot / CDL «Pedir precio cerrado» con fotos (Transporte `k cotiza`) |
| `lib/total-escrito.ts` (`mandarTotal`, `decidirTotal`, `vencerTotales`, versión nueva reemplaza, acepta con hora, versión e IP) · tabla `written_totals` (inmutable al aceptar, trigger) · `acciones-total.ts` | 4l (0061–0062) | **El acuerdo por escrito** de la fiesta («Te mandan el acuerdo por escrito con lo que incluye», L91) y el **precio cerrado** de la mudanza (L58); `NUM` hoy solo `C-` |
| `lib/estimados.ts` (`planLiquidar`, `cobrarLiquidacion`: captura ≤ retenido, libera el resto, idempotente) | 4d | Patrón de la cancelación tardía de un viaje (cobrar la mitad y liberar el resto) |
| `lib/cobros.ts` (`comision`, `tarjetaDe`, `registrarRetencion`, `cobrarOperacion`, `liberarOperacion`, `devolverPago`, `repararPagos`, `pagoDe`) · `lib/pagos/pasarela.ts` (`retener` manual capture, `cobrar(pi, centavos, comision)` con captura parcial, `liberar`, `devolver`) | 2d, 4d | Depósito de la fiesta, total del viaje, devoluciones por cancelación |
| `lib/rentas.ts` (`opcionesRenta`, `apartarRenta`, depósito, «un día más», tarde por día, `resolverDano` con foto, `barrerRentas`, número `T-`) · `app/panel/Rentas.tsx` | 4f-2 | Renta de autos, camionetas y remolques (NEG-TRANS-25…27) y renta de artículos sueltos de fiesta sin código nuevo de dinero |
| `lib/apartados.ts`, `lib/layaway.ts`, `lib/mercado.ts` | 4f-3, 4q, 4r, 4p | No se usan aquí; `mercado.ts` es el patrón de «candado + vencer + liquidar» |
| `lib/pedir.ts` `dirEntrega` (distancia con `st_distance` geography entre `user_addresses.geo` y `businesses.geo`), `lib/direcciones.ts` (`zonaDe`, Mis direcciones con geo PostGIS) | 2f | Dirección de la fiesta y de recogida dentro de `service_radius_mi` (el servidor decide) |
| `lib/repartidor.ts` + `/repartidor` (`asignarRepartidor`, `misEntregas`, `pasoRepartidor` en orden, `problemaRepartidor`, sin conexión) · tabla `delivery_drivers` | 2l, migr. 0035 | **App del chofer**: Salió · Va tarde · Llegó · lista de pasajeros; recogida y entrega de cajas |
| `op_private` (datos sensibles fuera de `operations.details`) · `lib/cifrado.ts` | 4j (0058) | Destinatario del envío a RD y destino de un traslado médico |
| `lib/licencias.ts` + tablas `license_kinds` / `licenses` (estados, `licencias_refrescar`, derivado `lic_valid`, cola Licencias) | 1k, 4h-3 | Autoridades de transporte (PUC, USDOT/MC, CDL, OTI) y licencias de fiesta (inflables, alimentos) — §2, 4w |
| `lib/resenas.ts` (`opParaResena`, `hechosCita`, `limpiarRespuestas` por rubro, `rubroRes`) · `lib/resenas-filtro.ts` | 2g, 4g, 4m, 4s | Reseña verificada por fiesta (`party` done) y por viaje (`trip` done) |
| `lib/ayuda-cita.ts` (`MOTIVOS` por `RubroAyuda`, `CON_FOTO`, `pedirAyudaCita`, `responderAyudaCita`, fotos privadas, `NUM /^[CMA]-/`) · `lib/ayuda-motivos.ts` (`POR_RUBRO`) | 3e, 4g, 4m, 4s | Ayuda con la fiesta y con el viaje: rubros `fiesta` y `trans`, `NUM` acepta `F-` y `V-` |
| `lib/avisos.ts` (`avisar`, `avisarNegocio`) · `notif_templates` | 2j | Plantillas nuevas ES/EN (4v, 4y, 4z) |
| `lib/plan.ts` (`TOPE_FREE 10`, `ITEMS_FREE 5`) · `lib/suscripcion.ts` | 1h, 2s | Free = 5 servicios visibles y 10 solicitudes al mes pagando en el local |
| Super Admin: `app/admin/N360.tsx` (Lo que vende, ocultar con motivo), `Transacciones.tsx` + `lib/admin-tx.ts` (`TabTx`), `Colas.tsx`, `Analitica.tsx` + `lib/admin-analitica.ts`, `Planes.tsx` (`fee_rules`) | 1i, 2i, 4g-3, 4m-3, 4s | Pestañas Fiestas y Viajes, cola «Salidas canceladas», analítica de las dos |
| Guardianes `dineroDelServidor`, `retencionPorTarjeta`, `transaccionEnFila`, `operacionesConTipo`, `derivadosDelEstimado`, `fotoAyudaPrivada`, `semilla` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |
| `operations.kind` ya admite `'party'` y `'trip'`; `change_proposals.kind 'time'`; `payments.kind` `deposit`/`full`, `unique (operation_id, kind, seq)`; `media.owner_kind 'request'` | 0023, 0024, 0051, 0053, 0064 | Sin migración para el tipo de operación |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo en las dos (etapas 1–4: categoría, ficha, solicitud y estado, reseña y ayuda). El **panel** solo
trae «Tu herramienta» (`blocksC` L386–411) y el Servicios genérico (`svcSync` de `neg-fiesta-kind.js` L90–105 lee de `over.items` solo nombre,
precio y descripción: no sabe de `k`, horas, invitados ni «incluye»). **No hay:**
1. **Editor de servicios** de Fiestas (paquete con horas, «incluye», invitados, montaje, por unidad con regla por invitados, por hora con
   mínimo, visita gratis, «desde» con total por escrito) y de Transporte (por asiento con salidas, niño y maletas; vehículo completo con
   personas y zona o destino; caja con medidas; precio cerrado con fotos; pase semanal). Se compone sobre `Oficios.tsx` con los rubros nuevos.
2. **Calendario de meses** para marcar fechas ocupadas (la herramienta solo muestra viernes a domingo de 5 semanas, L397–399) y **cuántas
   fiestas por día** caben (un salón, 1; una rentadora, varias).
3. **Solicitud de fecha** en el panel con lo propio: qué celebra, invitados, dónde y a cuántas millas, depósito, choque con otra solicitud
   del mismo día; **el acuerdo por escrito** que ve el cliente al confirmar; «Terminó» después del evento.
4. **Dirección de la fiesta**: el prototipo pide «En un salón · ESCRIBE CUÁL EN LA NOTA» (flow L65); hace falta elegir un salón del
   directorio o una dirección real para validar la zona.
5. **Panel de salidas** (Transporte): por salida, lista de pasajeros (adultos, niños, maletas, abordó / no llegó), «No sale hoy» con aviso de
   cuántos pasajeros hay, «Va tarde · sale a las …», «Salió», «Llegó»; y lo mismo en `/repartidor` para el chofer.
6. **Asientos vendidos fuera de la app**: la herramienta deja editar «quedan» a mano (L409); el derivado no se edita, lo que se edita es lo
   vendido en la oficina.
7. **Destino** de los viajes privados (el prototipo solo tiene la recogida) y **destinatario** del envío a RD (nombre, teléfono, provincia,
   dirección) — ninguno está en el flujo (L27).
8. **Precio de la maleta extra** (FAQ van L22 lo promete; la herramienta solo tiene «MALETAS INCLUIDAS»).
9. **Responder la cotización** de mudanza / hotshot con el precio cerrado (`reply` L53 lo inventa: precio + 50).
10. Super Admin: Transacciones › **Fiestas** y **Viajes**, Colas › **Salidas canceladas**, licencias de transporte en la cola Licencias,
    Analítica de las dos.
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de solicitud del panel, `Citas.tsx`,
`Solicitudes.tsx`, la vista de «El total, por escrito») y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

### 1c. Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, solicitud, revisión y estado; nunca se suavizan)
- **Fiestas (`NEG-FIESTA`):** «¿esa fecha está libre?» · línea **«La fecha no es tuya hasta que te la confirmen.»** (`TLFiesta.line` L82) ·
  sub: «Cada negocio muestra su calendario real. El depósito aparta la fecha solo cuando confirman; si no, se devuelve completo.» (L83).
  Reglas con candado (Tu herramienta L403): «La fecha no es suya hasta que confirmas» («Respondes en 24 h; si no, se devuelve el depósito.») ·
  «Lo del paquete, sin cargos escondidos» («Lo extra se pide antes y por escrito.»). FAQ fija: «Lo que no está escrito en el paquete, no
  está incluido.» (listing L254, flow L49).
- **Transporte (`NEG-TRANS`):** «¿cuánto es el viaje en total y sale a la hora?» · línea **«El precio del viaje es cerrado antes de salir.»**
  (`TLTrans.line` L48) · sub: «Cada negocio dice el total con peajes y maletas antes de reservar, y si sale a la hora.» (L49). Reglas con
  candado (L407, L411): «Precio cerrado antes de salir» («Lo que pagas al reservar es todo.») · «Cancelar gratis hasta 24 h antes». En renta
  la línea cambia a «El precio de la renta es cerrado: lo que ves al reservar es todo.» (kind L78).

**Lo que el prototipo de Transporte hace de verdad** (y lo que no): cuatro formas de servicio (`listing` L3): **asiento** (rutas con salidas
fijas por persona: Hazleton → Washington Heights 5 AM · 1 PM · 7 PM $45, niño $30, peajes y 2 maletas incluidas; Paterson / Passaic; pase
semanal y viaje suelto al almacén por turno), **priv** (vehículo completo hasta N personas: aeropuerto JFK $220 / EWR $180 / ABE $75 con espera
si el vuelo se atrasa, cita médica ida y vuelta con rampa y espera, taxi «Dentro de Hazleton $8», conductor designado, flete de un mueble),
**caja** (envío de cajas y tanques a RD puerta a puerta con recogida en tu casa, seguro hasta $500 y rastreo; y mensajería el mismo día en
Hazleton con foto al entregar) y **cotiza** (mudanza, hotshot, CDL, traslado de carros, maquinaria, botes: «Pedir precio cerrado» con fotos;
renta de camionetas y remolques por día). La reserva es **programada** (hoy y los 6 días siguientes, `DN` L12; salidas o franjas por hora,
`slotsOf` L15): **no** hay viaje a pedido con despacho en vivo, ni mapa del chofer, ni tarifa por milla calculada en la app. Grúas, renta de
autos, fletes, shuttle Allentown, mensajería, escolar y reparto en moto son **Free**: solo contacto (`canBook` L70 exige Pro y `viaje` o
`envio`). Todo eso se construye sin terceros pagados nuevos (PLAN §8): direcciones y distancias con nuestro PostGIS, avisos con el SMS ya pagado,
cobros con Stripe.

**Tipos por negocio** (deciden FAQ, reseñas por tipo y el título de Tu herramienta; derivados de las subcategorías, el admin puede forzarlo):
Fiestas `salon · quince · org · ninos · renta · infl · dj · sonido · musica · anim · deco · flor · foto · pastel · barra · taquiza · limo ·
tienda · invit · chispa` (`kind` L10–20); Transporte `van · air · caja · mud · med · emp · taxi · courier · cdl · grua · renta · escolar`
(`kind` L9–13; `tT` L158: `van` «Salidas y asientos», `caja` «Salidas de la caja», el resto «Disponibilidad y servicio»).

---

## 2. Cambios de datos (migraciones 0070 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0070 `fiestas_servicios` (4t)**
- `items.svc_kind` amplía el check con `'pack', 'unid'` (Fiestas `k pack · hora · unid · fijo · visita · cotiza`; `hora`, `fijo`, `visita`,
  `cotiza` ya existen). `svc_attrs` (zod + guardián, rubro `fiesta`): `h` horas del paquete (0 = sin horas), `inc [{es,en}]` (lo que incluye;
  «lo que no está escrito, no está incluido»), `cap` invitados del servicio, `mont bool` (montaje incluido), `u {es,en}` (unidad: juego, mantel,
  porción, mesero…), `per smallint` (invitados por unidad: juego 8, mantel 8, mesero 40 — lo que en el prototipo era `qtyOf` L22, ahora dato),
  `min_qty` (porción mínimo 20), `min_h` (hora: mínimo), `stock_total` (opcional: cuántos tiene para una misma fecha, Preguntas #8).
- **`fiesta_settings`** (Tu herramienta, una fila por negocio; `TLDashCat.state` L193): `deposit_cents 0–300000` (paso $50; prototipo
  `dep` hasta 3000), `guests_max smallint 10–1000` (null = no aplica; «Si piden más, la app dice "No caben"»), `events_per_day smallint 1–20`
  def. 1 (hueco #2), `book_ahead_days smallint 30–365` def. 180 (Preguntas #3), `cancel_full_days smallint` = 30 (prototipo, fijo por ahora),
  `updated_by/at`. Zona = `businesses.service_radius_mi` (5–150, paso 5; L402). Se escribe también `category_attrs.NEG-FIESTA.capacity` y
  `.deposit` (MD L261); las fechas **no** van a `category_attrs` (un jsonb no se indexa por día).
- **`party_days`** (calendario real): `id`, `business_id`, `city_id`, `day date`, `source check in ('manual','booking')`, `operation_id`
  (si viene de una reserva confirmada), `created_by`, `created_at`, `removed_at`; `unique (business_id, day) where source = 'manual' and
  removed_at is null`; índice `(business_id, day) where removed_at is null`. **Ocupada** (derivado, nunca editable) = hay `manual` **o**
  las reservas confirmadas de ese día llegan a `events_per_day`.
- **`user_event_plans`** («Tu fecha», `s.fev` = e, i, g, w): `user_id unique`, `city_id`, `kind check in ('quince','boda','cumple','baby',
  'bautizo','grad','empresa')`, `day date`, `guests smallint`, `where_kind check in ('salon','casa','nose')`, `updated_at`. Sin sesión vive en
  el teléfono. «Guardar tu fecha no aparta nada» (L203).
- Derivados en `businesses.filter_values` (recalculados al guardar y por el barrido de medianoche de la ciudad): `d:sab`, `d:dom`, `d:sab2`
  (libre este sábado / domingo / el sábado siguiente — `DAY` L63 con fechas reales), `paquete`, `montaje`, `traslado`, `visita`, `hora`,
  `deposit`, `cita`, `esp`, `finde`, `noche`, `ninos`, `y10`; `attrs.tarjeta.eta` = «Libre este sábado» / «Próximo sábado libre: 3 oct»
  (`apply` L287) y `attrs.cap`.
- `license_kinds` + Fiestas (sin verificar, Preguntas #9): `pa_inflables` (registro e inspección de juegos inflables, Dept. of Agriculture),
  `alimentos` (licencia de alimentos de la ciudad o del estado: taquiza, pastel), `pa_puc_limo` (limosina y party bus), `seguro_general`.
- `fee_rules.kind` + `'fiesta'` (sembrada en 800 bp = `cita`, adm-data L133; Preguntas #20).

**0072 `fiestas_reservas` (4v)** (0071 = filtros de fecha de Fiestas, 4t; desde aquí todo corre uno) — `operations` `kind 'party'` con `details`: `event check in (EVT)`, `guests`, `where {kind, address_id |
venue_business_id}`, `mi` (distancia calculada), `svc_k`, `qty` (servidor), `h`, `visit bool`, `agreement_version`; `scheduled_at` = día y hora
de inicio; `deposit_cents` = mín(depósito, total) (`depFor` L24). Secuencia **`party_seq start 5101`** (número **F-5101**, `FIESTA #`;
Preguntas #24). `written_totals`: se generaliza a `F-` (fee = total del paquete o lo escrito, `credit_cents` = depósito cobrado, `gov_cents` 0,
`extras` = lo extra pedido antes y por escrito, `note` = «incluye»); `total_cents` = el resto. `booking_policies.expires_h` = 24 para
NEG-FIESTA (el check 1–48 ya lo admite). `party_days` recibe la fila `booking` al confirmar (en la misma transacción). `operation_events`:
`party_sent`, `party_ok`, `party_alt`, `party_no`, `party_exp`, `party_cx`, `party_biz_cx`, `party_done`, `agreement_sent`, `agreement_ok`.

**0072 `transporte_servicios` (4w)**
- `items.svc_kind` + `'asiento', 'priv', 'caja', 'pase'` (`cotiza` ya existe). `svc_attrs` (rubro `trans`): `sal smallint[]` (horas de salida,
  0–23; `DEP0` L130), `from {es,en}` (sale de), `to {es,en}` (destino; Washington Heights), `dur_min`, `pax smallint 1–56` (asientos o personas),
  `child_cents` (precio de niño), `bags smallint` (incluidas), `inc [{es,en}]` (peajes, maletas, espera, recogida, seguro, rastreo), `zone
  'destino'|'zona'` (priv: destino fijo o «dentro de N mi»), `box {l,w,h,lb}` (caja), `wait_min` (espera incluida), `days smallint` (pase: 5).
- **`trans_settings`** (Tu herramienta; `state` L194–195): `kind_override` (solo admin), `bags_included 1–3` def. 2, `extra_bag_cents`
  (hueco #8; null = no se vende maleta extra), `available_today_on date` («Disponible hoy» vence a medianoche, Preguntas #14), `child_seat
  bool` (tag `nino`), `ramp bool` (tag `silla`), `ship_day check in ('sab','mie','15d')` y `ship_weeks check in ('2-3','3-4','4-6')` (caja,
  L405), `cutoff_h smallint` (mensajería: «antes del mediodía»), `cancel_free_h` = 24 y `cancel_fee_pct` = 50 (fijos por ahora, Preguntas
  #10), `updated_by/at`. «24 horas» escribe el horario (no es un dato aparte).
- **`trip_runs`** (cada salida de un día): `id`, `business_id`, `city_id`, `item_id`, `run_at timestamptz`, `seats_total` (copia de `pax`),
  `seats_outside smallint` (vendidos en la oficina, hueco #6), `seats_booked smallint` (**derivado** cacheado: lo mantiene el servidor en la
  misma transacción; nunca editable; guardián lo recalcula), `status check in ('scheduled','cancelled','departed','arrived')`, `cancel_reason`,
  `departed_at`, `arrived_at`, `late_until timestamptz` («Va tarde · sale a las …»), `driver_id` (→ `delivery_drivers`); `unique (item_id,
  run_at)`; índice `(business_id, run_at)`. Se crea al primer pedido o cuando el panel la toca. **Quedan** = `seats_total − seats_outside −
  seats_booked` (derivado).
- `license_kinds` + Transporte (sin verificar, Preguntas #9): `pa_puc` (Public Utility Commission: taxi, aeropuerto, limosina, traslados,
  mudanzas dentro de PA), `usdot`, `fmcsa_mc` (autoridad interestatal: vans a NY/NJ, mudanzas y carga entre estados), `cdl`, `seguro_carga`,
  `fmc_oti` (intermediario de envíos al extranjero: cajas a RD), `act_menores` (transporte escolar). Escriben `lic_valid` y el filtro
  `lic` (función `licencias_refrescar` ampliada a NEG-TRANS).
- Derivados en `filter_values`: `viaje`, `envio`, `cerrado` (todo Pro con servicios publicados: el precio es del servidor), `hoy`, `24h`,
  `equipaje`, `estados` (algún servicio con destino fuera de PA o licencia `fmcsa_mc` válida), `nino`, `silla`, `semana`, `esp`, `y10`; `attrs.tarjeta.eta`
  = «Hoy 7 PM a Washington Heights · quedan 4» (próxima salida con asientos, recalculada en cada reserva) / «Caja a Santo Domingo en 3–4
  semanas» / «Precio cerrado con fotos de tu casa».
- `fee_rules.kind` + `'viaje'` (sembrada en 800 bp; Preguntas #20).

**0073 `transporte_reservas` (4y)** — `operations` `kind 'trip'` con `details`: `k`, `adults`, `kids`, `child_seats`, `bags`, `bags_extra`,
`boxes`, `pickup_address_id`, `drop {text, geo}` (priv por zona), `week_of` (pase), `quote bool`; secuencia **`trip_seq start 9101`**
(**V-9101**, `VIAJE #`). **`run_seats`**: `operation_id`, `run_id`, `seats smallint`, `status check in ('held','boarded','noshow','cancelled',
'refunded')`, `unique (operation_id, run_id)` (un pase = 10 filas). `op_private` guarda el **destinatario** del envío (nombre, teléfono,
provincia, dirección, referencia; cifrado) y el destino de un traslado médico. `operations.details.tracking {code, url}` + `departed_at` del
envío; `media.owner_kind 'request'` (fotos de la mudanza). `written_totals` acepta `V-` (precio cerrado de la cotización; vale 48 h).
`rentals.details`: `license_checked_by`, `odometer_out`, `odometer_in`, foto del odómetro (renta de vehículos, Preguntas #19).
`operation_events`: `trip_sent`, `trip_ok`, `trip_alt`, `trip_no`, `trip_exp`, `trip_cx`, `trip_cx_fee`, `run_late`, `run_cancelled`,
`run_departed`, `run_arrived`, `boarded`, `noshow`, `box_picked`, `box_departed`, `box_delivered`, `quote_sent`, `quote_ok`.

**0074 `ayuda_fiestas_transporte` (4z)** — `help_requests.reason` amplía Fiestas (`neg-fiesta-rev.js RSN` L44: `nollego`, `tarde`, `nocomo`
(foto), `falto` (foto), `cobro` (foto), `dano` (foto; ya existe con etiqueta de Auto → `POR_RUBRO.fiesta`), `otro`) y Transporte (`RSN` L41:
`cobro` (foto), `tarde`, `nollego`, `seguro` (escala directo, Preguntas #5), `equipaje` (foto), `otro`); `wants` + `descuento` (Fiestas «Un
descuento») y reusa `devolver` · `reponer` · `avisar`. `reviews.answers` / `facts` con lo de 4z. Plantillas de aviso de 4v–4y que no entraron
en su bloque.

---

## 3. Dinero (reglas del servidor — Opus/high; revisión de seguridad obligatoria)

El servidor calcula todo; el cliente solo muestra (guardián `dineroDelServidor`). Comisión solo sobre tarjeta en la app. Free: sin tarjeta, pago
en el local, hasta 10 al mes (decisión del 3 nov, MEM 87; Preguntas #22).

| Momento | Fiestas (`neg-fiesta-flow`) | Transporte (`neg-trans-flow`) |
|---|---|---|
| Al enviar | Tarjeta: **se retiene el depósito** = mín(depósito, total) (L24). Visita al salón: $0. Sin depósito: $0. «HOY PAGAS $X» (Preguntas #1) | **Se retiene el total cerrado**: asientos × precio + niños × precio de niño + maletas extra; cajas × precio; vehículo completo = su precio (L14). Cotiza: $0 |
| Sin respuesta | 24 h → SIN RESPUESTA, se libera completo (`vencerCitas`) | Plazo del negocio (SP «Pasa el tiempo»): 2 h si sale hoy, si no 24 h y nunca después de la salida → se libera |
| Lo confirman | **Se cobra el depósito** (captura); la fecha queda ocupada (`party_days`); se manda el acuerdo por escrito (§4v) | **Se cobra el total** (captura; L59 «Cobrado $X · precio cerrado»); asientos tomados en `run_seats` |
| Otra hora / otra salida | Lo retenido sigue; «Aceptar esta hora» → se cobra; «No me sirve» → se libera completo | Igual: aceptar → se cobra; no → se libera |
| No pueden | Se libera completo + fechas libres del negocio | Se libera («No hay cupo») |
| Cotización | `cotiza` (boda completa, planeación): se aparta la fecha con depósito igual; el total llega **por escrito**; si no lo aceptas, se devuelve el depósito completo | Mudanza / hotshot / CDL: precio cerrado por escrito (vale 48 h) → «Aceptar $X» **retiene y cobra** en el mismo paso (es su confirmación) |
| El día | El resto **al negocio, fuera de la app**, como dice el acuerdo (L45; Preguntas #2) | Nada nuevo: «Lo que pagas al reservar es todo» |
| Cancela el cliente | Sin confirmar → se libera; confirmada y faltan 30 días o más → **devolución completa**; menos de 30 → el depósito se queda con el negocio (L112–113) | Hasta 24 h antes → devolución completa; después → **se cobra la mitad** y se devuelve la otra (Preguntas #10) |
| Cancela el negocio | Devolución completa, siempre; hecho «Cancelaron la fecha» en la reseña y cola de Super Admin | «No sale hoy» / no puede → devolución completa automática a cada pasajero + SMS + la próxima salida ofrecida (Preguntas #12) |
| Sale tarde | — | Más de 15 min: SMS («Si sale más de 15 minutos tarde, te avisan por SMS», L82); sin cargo extra; «Salió o llegó muy tarde» en Ayuda |

- **Captura y liberación** con `cobrarOperacion` / `liberarOperacion` / `devolverPago` (idempotentes, `pg_advisory_xact_lock` por negocio y
  por día — `fiesta:{negocio}:{día}` — o por salida — `salida:{run_id}` — antes de tocar cupo o dinero). La cancelación tardía de un viaje usa
  el patrón de `cobrarLiquidacion`: si el pago ya se capturó, devolución parcial exacta de la mitad (redondeo a favor del cliente).
- **Precio cerrado** = copia al enviar (`unit_price_cents` por línea, `inc` copiado); si el negocio cambia el precio después, lo enviado no
  cambia. Nada se agrega al llegar: el panel no tiene «agregar cargo» en un viaje (guardián `viajeCerrado`).
- **Acuerdo de la fiesta**: al confirmar, el servidor escribe la versión 1 de `written_totals` con el paquete copiado (total, depósito, resto,
  qué incluye, regla de cancelación); lo extra solo entra como versión nueva que el cliente acepta (hora, versión, IP). El resto nunca lo cobra
  To'Latino.
- **Comisión:** `fee_rules 'fiesta'` sobre el depósito capturado; `'viaje'` sobre lo capturado menos lo devuelto; devolución con su comisión
  devuelta en proporción (como 3e). Free / pago en el local: $0.
- **Ventanas de la tarjeta:** la retención vive como mucho 24 h (Fiestas) o hasta la confirmación del viaje (la reserva es a 7 días como
  mucho, `DN` L12); nada se retiene más de 6 días (guardián `retencionPorTarjeta`).
- **Guardianes nuevos:** `fechaSinDoble` (ningún día con más reservas confirmadas que `events_per_day`, ni confirmada sobre un día `manual`);
  `depositoFiesta` (ningún depósito capturado sin `confirmed`, ninguno retenido en `declined/expired/cancelled` más de 1 h, devolución =
  depósito exacto cuando toca); `acuerdoFiesta` (ninguna fiesta confirmada sin su `written_totals` v1; ninguna versión aceptada cambiada);
  `asientosSinSobreventa` (Σ `run_seats` vivos + `seats_outside` ≤ `seats_total`; `seats_booked` = Σ real); `salidaCanceladaDevuelta`
  (ninguna salida `cancelled` con pasajeros sin devolución o liberación a 1 h); `viajeCerrado` (capturado ≤ retenido = precio al enviar;
  cancelación tardía = 50 % exacto); `licenciaParaReservar` (ningún `trip` con `pay_mode 'app'` de un negocio sin autoridad válida para su
  tipo mientras el interruptor esté encendido); `zonaDelServicio` (dirección de la fiesta o de recogida dentro de `service_radius_mi`,
  recalculado con PostGIS); `destinatarioPrivado` (ningún dato de `op_private` en vistas públicas, logs, avisos ni Super Admin sin rol);
  `semilla`.

---

## 4. Bloques

### 4t · Fiestas: servicios, «Calendario y depósito», fechas ocupadas y filtros (panel + admin + datos) — Sonnet/medium; migración Opus
**Datos:** migración 0070. Semilla de pruebas `infra/pruebas/semilla/0020_fiestas_transporte.sql` (`is_test`, nunca en producción), generada
por `scripts/semilla/extraer-fiestas-transporte.cjs` (como `extraer-mercados-tiendas.cjs`) desde `TLFiesta.B` (26 negocios: `busy` →
`party_days` con fechas reales desde hoy, `dep` / `cap` / `zone` → `fiesta_settings` y radio), `TLFiestaL.SVC` (`k`, `h`, `cap`, `mont`, `inc`,
`u` → `items`), `STAFF`, `ABOUT`, `RV`, `STATS` y el demo `demo-fiesta` (`demo-biz.js` L737) con sus solicitudes.
**Panel (Lo que vendes):**
- **Servicios** (hueco #1, `Oficios.tsx` rubro `fiesta`): secciones («Salón», «Decoración», «Quince»…); por servicio: nombre ES/EN,
  descripción, foto, precio, **cómo cobra** (`pack` «PAQUETE · 6 HORAS · HASTA 250 INVITADOS · MONTAJE INCLUIDO» · `hora` «$200/hora ·
  MÍNIMO 1 H» · `unid` «$14 por juego» con invitados por unidad · `fijo` · `visita` «Gratis · VISITA · 30 MIN» · `cotiza` «Desde $2,500 ·
  TOTAL POR ESCRITO»), «incluye» (lista), invitados, montaje, ocultar; Free = 5 visibles.
- **Tu herramienta «Calendario y depósito»** (§5): cada toque se guarda y deja `AuditEntry`.
**Servidor:** `lib/fiestas.ts` (`fiestaPanel`, `guardarHerramientaFiesta`, `marcarDia(negocio, día, ocupada)` — no deja liberar un día con
reserva confirmada: «Ese día tienes la fiesta F-5123; cancélala primero», `diasOcupados(negocio, desde, hasta)`, `recalcularFiltrosFiesta`),
`app/panel/acciones-fiesta.ts`.
**Super Admin (ADM-NEG 360 › Lo que vende):** Tu herramienta en solo lectura (`summary` L323: «2 fechas ocupadas · depósito $500 · hasta 250
invitados · va hasta 30 mi»), ocultar servicio con motivo, pausar módulos (`svc`, `citas`); Catálogo › Licencias (los `license_kinds` nuevos);
Catálogo › Filtros (los de §2). Auditoría de cada cambio.
**Guardianes:** `svc_kind` de fiesta coherente con sus atributos (`pack` con `h ≥ 0`, `unid` con `u`, `hora` con `min_h`); ningún
`filter_values` sin fuente; los `d:*` cambian a medianoche de la ciudad (prueba con reloj movido); ES/EN en todo texto nuevo.

### 4u · Ficha de Fiestas y «Tu fecha» (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-FIESTA), pestaña **Servicios**, hoja del servicio, hoja **Tu fecha** (`hc`, `fechaVals`), tarjeta
«TU FECHA», barra y riel.
- **Tu fecha** (L193–205): ¿QUÉ CELEBRAS? · ¿QUÉ DÍA? (los próximos sábados y domingos libres + calendario hasta `book_ahead_days`; «Te decimos
  en cada negocio si esa fecha está libre.») · ¿CUÁNTOS INVITADOS? 25 · 50 · 100 · 150 · 200 · 300+ · ¿DÓNDE? En un salón · En mi casa o patio ·
  Aún no sé; nota: la línea fija + «Guardar tu fecha no aparta nada: solo te muestra quién está libre.»; «Ver quién está libre». Con sesión se
  guarda en `user_event_plans`; vale para todos los negocios y para la página de categoría (fila «¿Está libre tu fecha?»).
- **Disponibilidad por negocio** (`availOf` L187–191, servidor): «Libre el sáb 26 sep · caben tus 150» · «Ocupada el sáb 26 sep · libre 3 oct y
  10 oct» · «Caben hasta 120 · tú esperas 150» · sin fecha: «Próxima fecha libre: sáb 3 oct». Cada servicio lleva el meta «LIBRE EL SÁB 26 SEP».
- **Servicios** por sección (L229–231): precio y meta de `priceFor` / `metaOf`; botón «Booking» o «Pedir visita».
- **Hoja** (L268–279): foto, precio, meta, INCLUYE, tarjeta TU FECHA con el semáforo, «Hoy pagas el depósito de $X para apartar la fecha; se
  descuenta del total. Si no confirman, se devuelve completo.» (con la corrección de Preguntas #1) + la línea; CTA «Pedir la fecha» / «Pedir
  visita» / «Ver otra fecha» si está ocupada.
- **Notas** (máx. 4, L232–235): línea + calendario real · depósito · «Van a tu lugar hasta N millas de Hazleton.» · «Montaje incluido: llegan
  antes y recogen al terminar.»
- **Resumen:** tarjeta «¿ESTÁ LIBRE TU FECHA?» / «TU FECHA» (L239–240), línea (L242), «Cómo funciona» en 4 pasos (L243), riel PRÓXIMA LIBRE ·
  DEPÓSITO · INVITADOS o VA HASTA o DESDE (L247), amenities (`AM` L248), hechos FECHAS LIBRES · DEPÓSITO · IDIOMAS · PAGO «Depósito con tarjeta ·
  el resto como diga el acuerdo» (L250–251), FAQ por tipo (`faq` L26–50; la de la fecha y la del depósito salen del calendario y del panel; la de
  Tu página gana).
- **Variantes (`TLFiestaK.post` L108–115):** «VERIFICADAS POR FIESTA RESERVADA» / «RESEÑAS DE VISITANTES · AÚN SIN FIESTAS VERIFICADAS»; sin
  local (va a tu lugar) = «Va a tu lugar · hasta N mi» + «NO TIENE LOCAL · VA DONDE SEA TU FIESTA» + «Zona donde trabaja» / «Ver la zona» +
  «CÓMO TRABAJA»; tienda (`walkOnly` L220) = «Cómo llegar»; Free = «Llama para tu fecha» + la línea (`resAdd` L281).
**Estados del cliente:** ninguno nuevo (la solicitud nace en 4v). Tarjeta «TU FECHA · PENDIENTE / CONFIRMADA / TE PROPONEN UN CAMBIO»
(`mineCard` L121–123).

### 4v · Pedir la fecha: depósito, confirmar, acuerdo por escrito, cancelar y «Pasó la fiesta» + Panel — **Opus/high** (dinero)
**Pantallas:** `APP-NEG-FIESTA-BOOKING` (`s.fb`), `APP-NEG-FIESTA-CITA` (`s.fcitas`), Mi cuenta › Citas y reservas, Panel › Hoy / Citas
(hueco #3), vista del acuerdo (la de «El total, por escrito» de 4l).
- **Booking (3 pasos, vistas `ab`; escritorio en una página con columna fija):** 1 **Tu fiesta** (EVENTO: qué celebras · ¿Cuántos invitados?
  con el precio por invitados en lo que va por unidad · nota 0/300 «Ej.: quince de Ashley, colores rosa y dorado…»; «Caben hasta N invitados»)
  → 2 **Fecha y hora** (días: ocupadas no se eligen; HORA DE INICIO 10 AM–8 PM, visita 10–4; las horas tomadas salen de las reservas del día,
  no al azar como `busyH` L26; DURA «6 horas»; si va a tu lugar: ¿DÓNDE ES LA FIESTA? Tu casa (Mis direcciones) · En un salón (salón del
  directorio) · Otra dirección (hueco #4), «Van hasta N millas de Hazleton.») → 3 **Revisa y envía** (RESUMEN SERVICIO · FECHA · EVENTO ·
  DÓNDE; PRECIO y TOTAL; CÓMO SE PAGA: Hoy, al enviar · depósito $X «Aparta la fecha cuando confirmen. Si no confirman, se devuelve completo.» ·
  El día del evento $Y «A {negocio}, como diga el acuerdo por escrito.»; BUENO SABER (L49): depósito y 24 h · «Cancelar: gratis hasta 30 días
  antes. Después: el depósito se queda con el negocio.» · «Lo que no está escrito en el paquete, no está incluido.»; TARJETA DEL DEPÓSITO; Avisos
  por SMS «Confirmación y recordatorio una semana antes.»; barra HOY PAGAS $X · RESTO $Y · EL DÍA DEL EVENTO → «Enviar solicitud»). Visita =
  sin depósito ni evento. Sin sesión → entrar y volver. Tarjeta rechazada: «Tu tarjeta fue rechazada. No se cobró nada; cambia la tarjeta.»
- **Servidor:** `pedirFecha(userId, f)` en `lib/fiestas.ts` sobre `enviarCita` (candado `fiesta:{negocio}:{día}`, `client_key`, techo Free,
  zona con `dirEntrega`/PostGIS, invitados ≤ `guests_max` y ≤ `cap` del servicio, día no ocupado y dentro de `book_ahead_days`, cantidad y total
  del servidor, retención del depósito antes de guardar). Número F-5101….
**Estados** (`citaVals` L90–96): `pending` PENDIENTE («Esperando a {negocio}» + línea + «Responden en menos de 24 h. Si no confirman, te
devolvemos el depósito completo.») → `confirmed` FECHA CONFIRMADA / VISITA CONFIRMADA («La fecha es tuya. Te mandan el acuerdo por escrito con
lo que incluye.» / «La visita no aparta la fecha.») | `change_proposed` TE PROPONEN UN CAMBIO («La fecha está libre, pero a otra hora. Si no
te sirve, te devolvemos el depósito.»; «Aceptar esta hora» / «No me sirve») | `declined` NO PUDIERON («Esa fecha ya no está libre» + depósito
devuelto + FECHAS LIBRES EN {NEGOCIO} con «Pedir esta») | `expired` SIN RESPUESTA («No contestaron en 24 h») → `done` FIESTA TERMINADA
(«Pagaste $X en total.» = lo del acuerdo; estrellas → reseña; «Otra fiesta» · «Ayuda con la fiesta») | `cancelled` CANCELADA (depósito devuelto
o «El depósito de $X se quedó con el negocio»). Pasos: Solicitud enviada · Fecha confirmada · El día · Terminada. Tu dinero: Depósito ·
Resto el día del evento («Según el acuerdo» / «No se cobra») · TOTAL. Acciones: Calendario · Mensaje · Cancelar (hoja con la regla que aplica:
«Aún no confirman: te devolvemos todo.» / «Faltan 30 días o más…» / «Faltan menos de 30 días…»).
**Panel (Hoy · Esperan tu respuesta · detalle):** Confirmar / Otra hora / No puedo (24 h) con qué celebra, invitados, dónde y a cuántas millas,
depósito, «Otra solicitud para ese día» si choca; Confirmar ocupa el día y, si llega a `events_per_day`, declina sola las demás del mismo día
(Preguntas #7); el acuerdo por escrito sale solo y el negocio puede sumar un extra como versión nueva; el día después: «Terminó» (o solo a las
24 h del cierre si no hay ayuda abierta); «Cancelar la fecha» (el negocio) → devolución completa y motivo obligatorio.
**Servidor:** `responderFecha(negocio, num, paso)` sobre `citaPaso`, `decidirCambioFecha`, `cancelarFecha(por, num, motivo)`,
`terminarFiesta`, barrido `barrerFiestas` (24 h sin respuesta, recordatorio a 7 días y a 48 h, «Terminó» automático), `acuerdoFiesta(opId)`
sobre `mandarTotal`.
**Avisos:** `biz_fiesta` (nueva solicitud, SMS), `fiesta_ok` (SMS), `fiesta_alt`, `fiesta_no`, `fiesta_exp`, `fiesta_acuerdo`, `fiesta_7d`
(SMS, recordatorio una semana antes), `fiesta_cx` (con lo devuelto o lo que se quedó), `fiesta_biz_cx` (SMS); al negocio `biz_fiesta_alt_ok`,
`biz_fiesta_cx`.
**Super Admin:** Transacciones › **Fiestas** (línea de tiempo, depósito retenido / cobrado / devuelto / se quedó, acuerdo y sus versiones);
Colas › «Fechas canceladas por el negocio» (3 en 90 días → sello en revisión) y «Retenciones que fallaron».
**Guardianes:** los de §3 + punta a punta: dos clientes piden el mismo sábado → el negocio confirma uno → el otro sale NO PUDIERON con la
liberación exacta; cancelación a 31 y a 29 días; otra hora aceptada y rechazada; vence a las 24 h; carrera de confirmación (dos miembros a la vez).

### 4w · Transporte: servicios, «Salidas y asientos», licencias y filtros (panel + admin + datos) — Sonnet/medium; migración y licencias Opus
**Datos:** migración 0072. La semilla 0020 suma `TLTrans.B` (17: 10 Pro, 7 Free), `TLTransL.SVC` (`k`, `sal`, `pax`, `child`, `inc` →
`items`), `ABOUT`, `ST` (persona del negocio), `RV`, `STATS`, `DEP0`, los demos del panel (Envíos Quisqueya Cargo, Mudanzas El Primo, Traslados
Abuela, dash2-cat L79–81) y `demo-trans` (L1004) con sus viajes, envíos y cotizaciones; licencias de ejemplo en `review` y `valid`.
**Panel (Lo que vendes):**
- **Servicios** (hueco #1, rubro `trans`): `asiento` (ruta: sale de · llega a · salidas del día · dura · asientos · precio de niño · maletas
  incluidas · incluye), `priv` (vehículo completo: hasta N personas · destino fijo o «dentro de N mi» · espera incluida · incluye), `caja`
  (medidas o peso · destino · incluye recogida, seguro declarado, rastreo), `cotiza` («Desde $X · CERRADO CON FOTOS»), `pase` (pase semanal:
  turno, días). Renta de vehículos = módulo `renta` (`Rentas.tsx`, día y depósito).
- **Tu herramienta** (§5) por tipo: `van` «Salidas y asientos» (SALIDAS DE CADA DÍA con «No sale hoy», asientos vendidos fuera de la app,
  MALETAS INCLUIDAS 1 · 2 · 3, precio de la maleta extra); `caja` «Salidas de la caja» (LA CAJA SALE EL Sábado · Miércoles · Cada 15 días;
  LLEGA EN 2 a 3 · 3 a 4 · 4 a 6 semanas); el resto «Disponibilidad y servicio» (Disponible hoy · 24 horas · Rampa para silla de ruedas en
  médico y escolar · Asiento de niño); REGLAS · NO SE APAGAN con candado.
- **Licencias** (Panel › Tu página › Licencias, como 4h-3): el tipo pide las suyas (`van`/`mud`/`cdl` entre estados: USDOT + MC; dentro de PA:
  PUC; `cdl`: CDL + seguro de carga; `caja`: OTI; `escolar`: autorizaciones) con número y foto del documento; mientras no esté `valid`, la ficha
  dice «Licencia en revisión» y Reservar no sale (Preguntas #9).
**Servidor:** `lib/transporte.ts` (`transPanel`, `guardarHerramientaTrans`, `salidasDe(negocio, día)` crea `trip_runs` al vuelo,
`venderFuera(run, n)`, `recalcularFiltrosTrans`, `kindTrans`), `app/panel/acciones-transporte.ts`; `licencias_refrescar` amplía la marca `lic`.
**Super Admin:** N360 › Lo que vende (Tu herramienta en solo lectura: «3 salidas al día · 4 asientos libres hoy» / «Sale el sábado · llega en
3 a 4 semanas · disponible hoy · 24/7», L324–325), forzar el tipo (`kind_override`), ocultar servicio con motivo, pausar módulos; Colas ›
Licencias con los tipos nuevos y su registro oficial (FMCSA, PUC, FMC).
**Guardianes:** `svc_kind` de transporte coherente (`asiento` con `sal` y `pax`; `caja` sin `pax`; `priv` con zona o destino); «quedan» nunca se
escribe a mano; `licenciaParaReservar`; ningún `filter_values` sin fuente.

### 4x · Ficha de Transporte (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-TRANS), pestaña **Servicios** (`post` L66–67: «Servicios» en vez de «Del menú»), hoja del
servicio, tarjeta «TU VIAJE», barra y riel.
- **Servicios** (L80–81): precio y meta de `priceFor` (L71–75: «$45 · POR PERSONA · NIÑO $30» · «$85 · POR CAJA» · «Desde $350 · CERRADO CON
  FOTOS» · «$220 · HASTA 4 PERSONAS») + «INCLUYE PEAJES · 2 MALETAS»; botón «Reservar» · «Enviar» · «Pedir precio».
- **Hoja** (L98–103): INCLUYE; «Se retiene al enviar y se cobra cuando confirman. Si no sale o no confirman, se libera.» / cotiza: «Mandas
  fotos y te dan el precio cerrado. No se cobra nada hasta que lo aceptes.» + la línea; CTA «Reservar» / «Enviar una caja» / «Pedir precio cerrado».
- **Notas** (L82–83): la línea + «El total incluye peajes y lo que dice "incluye". Nada se agrega al llegar.» · «Si sale más de 15 minutos tarde,
  te avisan por SMS.» · «Asiento de niño gratis si lo pides.»
- **Resumen:** tarjeta «¿CUÁNTO ES EN TOTAL?» («Precio cerrado con peajes» · «Lo pagas al confirmar; si no sale, se devuelve.» · «Lo
  confirman las reseñas», L86); riel PRECIO Cerrado · DISPONIBLE 24/7 / Hoy / Con reserva · CRUZA ESTADOS (L88); caja: SALE Sábado · 3 a 4
  semanas (L70); médico con rampa: RAMPA (L71); Pro sin reserva: «Con cotización» (L69); amenities (`AM` L89); FAQ por tipo (`faq` L19–33).
- **Variantes:** «VERIFICADAS POR VIAJE»; sin local (grúa, mensajería, fletes, CDL, escolar) = «Recoge y entrega · hasta N mi» / «Va donde
  estés» + «Zona donde trabaja» (L76–77); 24 horas sin «12 AM» (`fix24` L60); renta = su línea (L78); Free = «Llama para tu viaje» / «Llama para
  pedirlo» / «Ve directo» + HOY HASTA / VA HASTA / ABIERTO 24 HORAS (L72–75).
- **Licencia** verificada como chip de la tarjeta y hecho del Resumen («USDOT y autoridad interestatal verificadas»), con el registro oficial
  (como NEG-PRO).
**Estados del cliente:** ninguno nuevo (4y).

### 4y · Reservar viaje, envío y mudanza: retener, confirmar y cobrar, salidas, en camino, llegó, cancelar + Panel y app del chofer — **Opus/high** (dinero)
**Pantallas:** `APP-NEG-TRANS-RESERVA` (`s.trb`), `APP-NEG-TRANS-ESTADO` (`s.trv`), Mi cuenta › Viajes, Panel › Hoy / Salidas (hueco #5),
Panel › Solicitudes (cotizaciones), `/repartidor` (chofer), renta de vehículos en `/n/{id}/rentar` → `/renta/{num}`.
- **Reserva (3 pasos, L18–48):** 1 **Tu viaje / Tu envío / Tu mudanza** (asiento: ¿Cuántos viajan? 1 adulto … 4 adultos, 2 adultos + 2 niños con
  el precio de cada opción; asiento de niño; maletas (incluidas y extra con precio); priv: recogida (Mis direcciones) y destino si es por zona
  (hueco #7); caja: ¿Cuántas cajas? 1–4, recogida en tu casa, DESTINATARIO en RD (hueco #7, privado) y «Lo que no se puede mandar» aceptado;
  cotiza: FOTOS hasta 6 «Cuartos, muebles grandes y escaleras. Con fotos el precio es cerrado.»; nota 0/200 «Ej.: llevo un coche de bebé…») →
  2 **Día y hora** (hoy y 6 días; SALIDA / RECOGIDA / HORA; «No hay salidas ese día.»; una salida sin asientos sale tomada) → 3 **Revisa y envía**
  (SERVICIO · CUÁNDO · PASAJEROS / CAJAS / RECOGIDA · SALE DE; PRECIO CERRADO con lo que incluye; CÓMO SE PAGA: Hoy, al enviar · se retiene $X
  «No se cobra todavía.» · Al confirmar $X «Se cobra el mismo total, con peajes.» (cotiza: Hoy $0 · Al aceptar «Precio cerrado» «Nada se agrega
  el día de la mudanza.»); BUENO SABER (L28): la línea · cancelar 24 h · aviso por SMS; TARJETA; Avisos por SMS «Cuando confirman, cuando sale
  y si se atrasa.»; barra SE RETIENE $X · PRECIO CERRADO → «Reservar» / «Enviar» / «Pedir precio cerrado»). Tarjeta rechazada: «Tu tarjeta fue
  rechazada. No se retuvo nada.»
- **Servidor:** `reservarViaje(userId, f)` en `lib/transporte.ts` (licencia válida, techo Free, zona con PostGIS para recogida y destino,
  `client_key`, candado `salida:{run_id}` y cupo con `run_seats`, total del servidor, retención antes de guardar), `pedirPrecioCerrado` sobre
  `pedirPre` (fotos privadas), `aceptarPrecio` sobre `decidirTotal` (retiene y cobra), `reservarPase` (10 asientos, Preguntas #17).
**Estados** (`citaVals` L57–63): `pending` PENDIENTE («Se retuvieron $X. Si no confirman, se libera.» / cotiza «Te mandan el precio cerrado con
tus fotos.») → `quote` PRECIO CERRADO («Incluye camión, personas, mantas y peajes. Nada se agrega ese día.»; «Aceptar $X» · «No, gracias») →
`confirmed` CONFIRMADO («Cobrado $X · precio cerrado.») | `change_proposed` OTRA SALIDA PROPUESTA («Si no te sirve, se libera la retención.») |
`declined` NO PUEDEN («No hay cupo» · «Liberamos la retención.») | `expired` SIN RESPUESTA → `camino` EN CAMINO («Salió a las 7:04 PM»; caja:
CAJA EN CAMINO «Salió del almacén de Hazleton» · «Llega a RD en 3–4 semanas.» + rastreo) → `done` LLEGASTE / ENTREGADA («Pagaste $X.»;
estrellas; «Ayuda con el viaje») | `cancelled` CANCELADO («No se cobró nada.» / «Se cobró la mitad: $X»). Pasos: Enviado · Confirmado · En camino ·
Llegó / Entregada. Acciones: Cómo llegar (al punto de salida) · Calendario · Cancelar (hoja con la regla de 24 h).
**Panel:** Hoy › **Salidas** (por salida: hora y destino, asientos tomados / fuera / libres, pasajeros con adultos, niños, asiento de niño y
maletas, «Abordó» / «No llegó», chofer asignado; «Va tarde · sale a las …» (SMS a todos), «Salió», «Llegó», «No sale hoy» con «Hay N
pasajeros: se les devuelve todo y se les avisa» antes de confirmar); Esperan tu respuesta (Confirmar / Otra salida / No hay cupo); envíos
(Recogida hecha → Salió del almacén con número de rastreo → Entregada); Solicitudes (mandar el precio cerrado: monto, qué incluye, válido 48 h).
**App del chofer** (`/repartidor`, sin conexión): sus salidas de hoy, lista de pasajeros con «Abordó», Salió / Va tarde / Llegó; recogida y
entrega de cajas y mensajería con foto al entregar (mensajería: «Te mando foto cuando entrego», ST L62).
**Servidor:** `responderViaje`, `pasoSalida(run, paso)` (en orden; `departed_at` real), `cancelarSalida(run, motivo)` (devolución a todos en la
misma pasada), `abordo(op, run, si)`, `cancelarViaje(userId, num)` (24 h / mitad), `pasoEnvio`, barrido `barrerViajes` (vence pendientes, aviso
de retraso si a los 15 min de la hora no hay «Salió», cierra `done` a las 24 h de «Llegó»).
**Renta de vehículos** (NEG-TRANS-25…27, motor `rentas.ts`): día, depósito, «un día más», tarde con 1 hora de gracia (FAQ L30); «Revisé la
licencia y la edad (21+)» obligatorio antes de «La recogió»; millas de más con foto del odómetro descontadas del depósito por el camino de
`resolverDano` (Preguntas #19).
**Avisos:** `biz_viaje` (SMS), `viaje_ok` (SMS), `viaje_alt`, `viaje_no`, `viaje_exp`, `viaje_precio` (SMS: «Tu precio cerrado: $X»),
`viaje_tarde` (SMS), `viaje_salio`, `viaje_cancelada` (SMS, con lo devuelto), `viaje_cx`, `caja_salio` (con rastreo), `caja_entregada`; al
negocio `biz_viaje_cx`, `biz_precio_ok`.
**Super Admin:** Transacciones › **Viajes** (por viaje: retenido / cobrado / devuelto / mitad; por salida: hora programada y real, ocupación);
Colas › «Salidas canceladas» (con pasajeros y devoluciones) y «Retenciones que fallaron».
**Guardianes:** los de §3 + punta a punta: 14 asientos, 3 clientes a la vez por los últimos 4 → nadie pasa del cupo; «No sale hoy» con 6
pasajeros → 6 devoluciones exactas y 6 SMS; cancelación a 25 h y a 23 h; precio cerrado aceptado y rechazado; caja con destinatario que no sale en
ninguna vista pública; licencia vencida → Reservar se apaga.

### 4z · Reseñas, Ayuda (fiesta y viaje), Super Admin, avisos y documentación — Sonnet/medium; ayuda con dinero Opus
- **Reseña Fiestas** (`APP-NEG-RESENA`, `TLFiestaRev`): verificada = `party` `done`. Dato de la reserva (no se edita, `tm` L30–31): SERVICIO ·
  FECHA «· respetada» · PAGASTE («TU FIESTA · DATO DE LA RESERVA»; «La fecha y lo que pagaste salen de tu reserva en To'Latino. No se
  editan.»). Preguntas (`groups` L24–29): ¿LLEGARON A LA HORA? (Sí · Un poco tarde · Muy tarde) · ¿QUEDÓ COMO EN LAS FOTOS? (Igual o mejor · Más o
  menos · No) · ¿RECOGIERON Y LIMPIARON? · TRATO; visitante también ¿RESPETARON LA FECHA? y ¿COBRARON LO DEL PAQUETE? (y la verificada también,
  Preguntas #6). **LO QUE IMPORTA EN UNA FIESTA** (`asp` L160–164: RESPETARON LA FECHA · LLEGARON A LA HORA · COBRARON LO DEL PAQUETE · QUEDÓ
  COMO EN LAS FOTOS · RECOGIERON Y LIMPIARON · TRATO; «De N fiestas reservadas en To'Latino en los últimos 12 meses.»). Hechos (L165–170):
  Respetaron la fecha / Cancelaron la fecha (del servidor, no del cliente) · A la hora / Llegaron tarde · Cobraron más del paquete · No quedó como
  en las fotos. ≤2 ★ → «La reseña no devuelve dinero. Si faltó algo del paquete, llegaron tarde o cobraron más, pídelo en Ayuda con la fiesta.»
- **Reseña Transporte** (`TLTransRev`): verificada = `trip` `done`; dato VIAJE · PAGASTE «· precio cerrado». Preguntas (L20–26): ¿COBRÓ EL PRECIO
  CERRADO? · ¿SALIÓ A LA HORA? (Sí · Hasta 15 min tarde · Más tarde) · ¿LLEGÓ A LA HORA? · ¿MANEJO SEGURO? · ¿EQUIPAJE O CARGA BIEN? · TRATO.
  **LO QUE IMPORTA EN UN VIAJE** (`asp` L56–57; «De N viajes y envíos por To'Latino en los últimos 90 días.»). Hechos (L59–61). ≤2 ★ → «… pídelo
  en Ayuda con el viaje.» La hora real de salida (`trip_runs.departed_at`) alimenta la Analítica, no la reseña.
- **Ayuda Fiestas** `APP-NEG-FIESTA-AYUDA` → `-ESTADO` (`fhelp` L50–87; entradas: fiesta `done`, reseña ≤2 ★): MOTIVO (No llegaron · Llegaron tarde ·
  No quedó como lo acordado · Faltó algo del paquete · Cobraron más del paquete · Dañaron algo o no recogieron · Otra cosa) + ¿Qué pasó? ≥15
  («Ej.: el arco llegó a las 6 y la fiesta empezaba a las 5…») + ¿CUÁNTO? · OPCIONAL + Fotos · obligatorias en lo acordado, faltó, cobro y daños
  («De cómo quedó, lo que faltó o el recibo.») + ¿Qué quieres? (Que me devuelvan «Lo que faltó o se cobró de más» · Un descuento «Lo acuerdas con
  el negocio» · Solo quiero avisar) → RESPONDE EN 24 H → ACEPTÓ · PROPONE OTRA COSA («Devolverte $X») · NO ACEPTÓ («{negocio} dice que cumplió lo
  acordado») → «Pedir revisión a To'Latino» → EN REVISIÓN 48 h («Miramos el paquete, lo que pagaste y tus fotos.») → LISTO. Sin respuesta 24 h →
  To'Latino. Una abierta por fiesta. «No llegaron»: Preguntas #5. Dinero: lo cobrado en la app se devuelve por Stripe; lo pagado al negocio lo
  devuelve el negocio y el cliente confirma «Me lo devolvieron» (como Mercados #12).
- **Ayuda Transporte** `APP-NEG-TRANS-AYUDA` → `-ESTADO` (`vhelp` L47–84): Cobró más del precio cerrado · Salió o llegó muy tarde · No pasó a
  recogerme · Manejo inseguro · Perdió o dañó mi equipaje o caja · Otra cosa; «Ej.: salió una hora tarde y no avisaron…»; fotos obligatorias en
  cobro y equipaje («Del recibo, la maleta o la caja.»); Que me devuelvan «Lo cobrado de más o el viaje» · Que lo repongan «Lo perdido o dañado» ·
  Solo quiero avisar; «Miramos el precio cerrado, la hora de salida y tus fotos.» (con la hora real de `trip_runs`). «Manejo inseguro» va directo a
  To'Latino con prioridad.
- **Super Admin:** Colas › Ayudas escaladas (motivos nuevos); Transacciones (Fiestas y Viajes); Notificaciones (todas las plantillas nuevas ES/EN);
  Configuración (24 h fiesta, 30 días, 180 días, 24 h y 50 % del viaje, 15 min de retraso — llega con Configuración, Fase 5); Analítica Fiestas
  (% confirmadas en 24 h, % vencidas, fechas canceladas por el negocio, depósitos retenidos / cobrados / devueltos / que se quedaron, ocupación
  de fines de semana) y Transporte (% salidas a la hora con `departed_at − run_at ≤ 15 min`, ocupación de asientos, cancelaciones tardías,
  salidas canceladas, ayudas «cobró más» por cada 100 viajes, licencias vencidas).
- **`docs/ayuda/`** (regla 9, ES/EN): cliente `tu-fecha` (guardar la fecha, quién está libre), `pedir-la-fecha` (depósito, 24 h, acuerdo,
  cancelar a 30 días), `ayuda-con-la-fiesta`, `reservar-un-viaje` (precio cerrado, salidas, niños y maletas, 24 h y la mitad, retraso),
  `enviar-una-caja` (recogida, destinatario, lo prohibido, rastreo), `precio-cerrado-de-mudanza`, `rentar-un-vehiculo`, `ayuda-con-el-viaje`;
  negocio `tu-herramienta-fiestas` (Calendario y depósito), `panel-solicitud-de-fecha`, `panel-acuerdo-por-escrito`,
  `tu-herramienta-transporte` (Salidas y asientos / de la caja / Disponibilidad), `panel-salidas-y-pasajeros`, `app-del-chofer`,
  `licencias-de-transporte`.
- **Triángulo** (regla 8): cada toque de Tu herramienta → ficha y Buscar (`summary` L323–325) → Super Admin lo ve y puede ocultar o pausar.

---

## 5. «Tu herramienta» y página de categoría (lo específico)

- **Fiestas · «Calendario y depósito»** (`blocksC` L387 s: «La pregunta es una: ¿esa fecha está libre? Marca tus fechas ocupadas; la fecha no es
  del cliente hasta que tú la confirmas.»): KPIs OCUPADAS · DEPÓSITO · INVITADOS o VA HASTA (L398) · TUS FECHAS · TOCA PARA MARCAR OCUPADA
  (viernes a domingo, L399) + calendario de meses (hueco #2) con las reservas confirmadas marcadas y sin poder liberarlas · Depósito para apartar
  (−/+ $50, 0–3000; «Se devuelve si no confirmas o si cancelan con 30 días o más.») · Invitados máximo (−/+ 10, 10–1000) · Vas hasta (−/+ 5 mi,
  5–150; solo si va a tu lugar) · Fiestas por día (hueco #2) · REGLAS · NO SE APAGAN (2 con candado). `apply()` (L287) → `d:*`, `eta`, `cap`,
  `zone`; en código `fiesta_settings` + `party_days` + `app/panel/acciones-fiesta.ts`.
- **Transporte · «Salidas y asientos»** (`van`, L408–411; s: «A qué hora sales y cuántos asientos quedan. El precio es cerrado antes de salir.»):
  SALIDAS DE CADA DÍA (por salida «Sale a la hora» / «No sale hoy»; «Deja al menos una salida.») · Asientos vendidos fuera de la app en la próxima
  salida (en vez de «quedan», hueco #6; «quedan» se muestra y baja solo con cada reserva) · MALETAS INCLUIDAS 1 · 2 · 3 · maleta extra · REGLAS
  (2 con candado). **«Salidas de la caja»** (`caja`, L405) y **«Disponibilidad y servicio»** (resto, L404–407). `apply()` (L288) → tags `hoy`,
  `24h`, `silla`, `nino`, `eta`, `b.sale` / `b.dias` y la FAQ de la caja. En código `trans_settings` + `trip_runs` + `acciones-transporte.ts`.
- Lo que ya mandaron los clientes **copia** precio, depósito, horas e «incluye»: cambiar la herramienta no cambia una fiesta o un viaje vivo.
- **Página de categoría** (ya en código; aquí solo los derivados): Fiestas — fila `tipo` (EV L55–62 → subcategorías), `fecha` (chips con fechas
  reales y la fecha guardada en «Tu fecha»), `inv` (`cap ≥ N` o sin límite, `inSub` L66); GROUPS (L70–77) TU FECHA · INCLUYE · PRECIO · CÓMO ·
  NEGOCIO; `QUICK5` open · d:sab · paquete · traslado · esp; stats «LIBRES ESTE SÁBADO». Transporte — `a` (NEED L34), `como` (WHO L35); GROUPS
  (L40–44) VIAJE · A BORDO · NEGOCIO; `QUICK5` cerrado · hoy · 24h · nino · estados; stats «PRECIO CERRADO». Todos derivados, cacheados, nunca
  editables; las consultas de fecha libre usan `not exists` contra `party_days` con su índice (presupuesto de velocidad de la página de categoría).

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **¿El depósito de la fiesta se cobra al enviar?** El prototipo dice «se cobra al enviar; se devuelve si no confirman» (neg-fiesta.js L5, listing L233). Cobrar y
   devolver cuesta comisiones de tarjeta que no vuelven y el cliente ve dos movimientos. Default: **se retiene al enviar y se cobra al
   confirmar** (motor de citas); el texto pasa a «Hoy se retiene el depósito de $X; se cobra cuando confirmen. Si no confirman, se libera
   completo.» Reversible por configuración.
2. **El resto de la fiesta.** Default: se paga al negocio fuera de la app, como dice el acuerdo (L45); la comisión es solo del depósito. Pagar
   el resto en la app (con su retención el día antes) queda para cuando el fundador lo pida.
3. **Hasta cuándo se aparta una fecha en la app.** El prototipo muestra 5 semanas; las quinces y bodas se apartan con meses. Default:
   `book_ahead_days` 180 (las devoluciones de tarjeta son confiables en ese plazo); más lejos, «Llama para esa fecha». Reversible por negocio.
4. **El negocio cancela una fecha confirmada.** No está en el prototipo. Default: devolución completa siempre, motivo obligatorio, hecho
   «Cancelaron la fecha» en la reseña y cola de Super Admin; 3 en 90 días → sello en revisión.
5. **«No llegaron» / «No pasó a recogerme».** El prototipo promete «Si no llegaron, te devolvemos el depósito mientras revisamos» (rev L66).
   Devolver antes de oír al negocio deja el dinero sin recuperar si sí llegó. Default: esos motivos y «Manejo inseguro» van directo a To'Latino
   (sin esperar las 24 h); si el negocio no contesta en 24 h se devuelve solo; si contesta, To'Latino decide en 48 h. El texto pasa a «Si no
   llegaron, To'Latino lo revisa primero y te devuelve el depósito si se confirma.»
6. **«Cobraron lo del paquete» en la reseña verificada.** El prototipo lo da por hecho (`draft` L34: `tot = 1`), pero el resto se paga fuera de la
   app y no lo sabemos. Default: la pregunta sale también en la verificada; «Respetaron la fecha» sí sale del servidor.
7. **Dos solicitudes para el mismo día.** Default: pendientes no bloquean; al confirmar una que llena `events_per_day`, las demás se declinan
   solas con «Esa fecha ya no está libre» y la liberación completa.
8. **Inventario de renta por fecha** (400 sillas, 6 carpas). El prototipo no lo controla. Default: `stock_total` opcional por artículo; si se
   pone, el servidor no deja pasar del total en una misma fecha; vacío = sin control.
9. **Licencias.** Transporte de personas (taxi, aeropuerto, vans a NY/NJ, médico, limosina y party bus, conductor designado), mudanzas y carga
   necesitan autoridad (PUC dentro de PA; USDOT + MC entre estados; CDL; envíos al extranjero con OTI de la FMC) — **sin verificar**. Default:
   interruptor `trans_license_gate` encendido: Reservar en la app solo con la autoridad de su tipo `valid`; en revisión, la ficha lo dice y se
   contacta por teléfono. Fiestas: licencias como sello sin bloquear (inflables, alimentos), salvo limosina y party bus (misma regla que
   Transporte). `LAUNCH-CHECKLIST`: revisar con abogado la lista por tipo.
10. **Cancelar un viaje tarde.** El flujo dice «después se cobra la mitad» (L28) y la herramienta y la FAQ «se queda el pago» (L411, kind L22).
    Default: **la mitad** (lo que el cliente lee al reservar; es lo menos duro); se corrigen la regla con candado y la FAQ.
11. **Cuándo se cobra el viaje.** Prototipo: «se cobra al confirmar» (L26, L59). Default: igual; la reserva es a 7 días como mucho y cabe en la
    retención. Alternativa reversible: cobrar al «Salió» (menos devoluciones).
12. **«No sale hoy» con pasajeros.** Default: el panel muestra cuántos hay antes de confirmar; devolución completa automática, SMS con la próxima
    salida con asientos y «Reservar en esa»; queda en la cola «Salidas canceladas».
13. **Destino de los viajes privados.** El prototipo no lo pide. Default: servicios con destino fijo (aeropuerto) no lo piden; los de zona
    («Dentro de Hazleton», taxi, conductor designado) piden destino y el servidor valida recogida y destino dentro de la zona; fuera, «Fuera de
    su zona».
14. **«Llega en ~8 min» y «Disponible hoy».** La tarjeta del taxi dice «Llega en ~8 min» (neg-trans L15) y nadie lo mide. Default: sin minutos
    (nada falso); «Disponible hoy» lo prende el negocio y se apaga solo a medianoche.
15. **Envíos a RD.** Default: destinatario privado (`op_private`, cifrado); lista de lo prohibido aceptada al enviar (FAQ L24); «Seguro hasta
    $500» sale como algo que incluye el negocio, no To'Latino; la aduana la hace el negocio; el número de rastreo lo pone el negocio.
16. **«Tus compras del súper»** (mensajería, L40: «pagas lo que cueste más la entrega»). Default: en la app solo se cobra la entrega; lo
    comprado se le paga al mensajero contra el recibo, fuera de la app, hasta que el fundador decida retener un estimado como Mercados.
17. **Pase semanal** (L32). Default: aparta el mismo turno de lunes a viernes, ida y vuelta (10 asientos); cancelar gratis hasta 24 h antes del
    primer viaje, después la mitad de lo que falta; si el negocio no sale un día, se devuelve ese viaje; sin cobro automático cada semana.
18. **Escolar y grúas.** Default: sin reserva en la app en esta fase (solo contacto): el transporte de menores pide autorizaciones de PA (sin
    verificar) y la grúa no tiene flujo en el prototipo.
19. **Renta de vehículos.** El prototipo la pone como `cotiza` (L45–48) con FAQ de renta (L30). Default: motor `rentas.ts` (día, depósito,
    tarde con 1 h de gracia), «Revisé la licencia y la edad (21+)» antes de entregar, millas de más con foto del odómetro descontadas del
    depósito; el seguro del vehículo lo da el negocio en el mostrador; la app no vende seguro.
20. **Comisión.** Default: `fee_rules 'fiesta'` y `'viaje'` nuevas sembradas en 8 % (= `cita`, que es lo que el prototipo cobra a las dos) para
    que el fundador las mueva aparte.
21. **Impuesto.** En PA la renta de artículos y la comida de evento suelen estar gravadas; música, fotos y transporte no — **sin verificar**.
    Default: `tax_rules` por subcategoría (datos), y si va impuesto, el precio del paquete sale con él incluido («Lo del paquete, sin cargos
    escondidos»). `LAUNCH-CHECKLIST`: validar con contador.
22. **Free.** La ficha Free del prototipo dice «AQUÍ NO SE RESERVA POR LA APP» (fiesta-kind L111, trans-kind L68); la decisión del 3 nov (MEM 87)
    dice que Free toma hasta 10 al mes pagando en el local. Default: manda la decisión: Free pide la fecha o el viaje sin tarjeta, pago en el
    local, tope 10; el texto Free se ajusta.
23. **Errores del prototipo a no copiar:** onboarding de Transporte pregunta «Asiento de niño» y guarda la marca `silla` (rampa) — `datos.ts`
    L297/L304 → `nino`; textos EN de Ayuda «They send the corrected bill» / «Read by the clinic» (fiesta-rev L60, trans-rev L57) copiados de
    Salud; Ayuda de viaje «Va en tu próximo pickup o envío, sin costo.» (L70) copiado de Mercados; `svc: 'Pedido'` en la ayuda del viaje (L50);
    «Tu cita» como rótulo en las dos ayudas (L64, L61); horas tomadas al azar (`busyH` L26, `slotsOf` L15) y precio de cotización inventado
    (`reply` L53); «Limosina y party bus» vive en dos categorías (misma licencia en las dos).
24. **Números.** Default: fiesta **F-5101** («FIESTA #») y viaje **V-9101** («VIAJE #») con sus secuencias; la visita al salón también es F- con
    `visit`. Reversible.

## 7. Orden, dependencias y pruebas
4t → 4u → 4v (dinero) → 4w → 4x → 4y (dinero) → 4z. 4u y 4v dependen de 4t (servicios, settings, `party_days`); 4v reusa el motor de citas
(3a–3c), `enviarCita` y «El total, por escrito» (4l) sin romper Belleza / Auto / Hogar / Salud / Profesionales (prueba de regresión de sus
citas y de sus totales); 4x y 4y dependen de 4w (servicios, salidas, licencias); 4y reusa `pedirPre` (4e), `rentas.ts` (4f-2) y `/repartidor`
(2l) sin romper sus flujos (regresión de entregas de Comida y rentas de Hogar); 4z depende de 4v y 4y. Fiestas y Transporte no se tocan entre sí:
si hace falta, 4w puede empezar después de 4t. Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9
dispositivos con la `RESPUESTA` simulada igual que la barra del prototipo: Fiestas «El negocio responde» (ok · rechaza → no · nada → «Pasan 24 h» →
exp · cambio → otra hora · tarjeta → rechazada al enviar), «Pasó la fiesta»; Transporte «El negocio responde» (ok · rechaza · nada → «Pasa el
tiempo» · cambio → otra salida · tarjeta), cotiza → precio cerrado, «Salió», «Llegó»; Ayuda «El negocio responde», «Pasan 24 h», «To'Latino
decide» — en la app eso lo hacen el panel, el chofer y los barridos del servidor (SP «Pasos del servicio», «Plazos sin respuesta»). Revisión de
seguridad (regla 5) de 4t, 4v, 4w, 4y y 4z antes de cerrar (dinero, licencias, datos del destinatario). Presupuesto de velocidad: fecha libre y
asientos libres en una consulta indexada, sin N+1. Capturas teléfono + escritorio de cada pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre del grupo (todo marcado antes de decir «Fiestas + Transporte completos»)
- [ ] Migraciones 0070–0074 aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI.
- [ ] Semilla 0020 solo en pruebas (guardián `semilla`); demos `demo-fiesta` y `demo-trans` y los del panel (dash2-cat L79–81) con solicitudes, salidas, envíos,
      cotizaciones, reseñas y ayudas.
- [ ] Editor de servicios de Fiestas y Transporte con todos sus tipos (paquete, hora, unidad, visita, cotiza; asiento, vehículo completo, caja,
      cotiza, pase).
- [ ] Tu herramienta de las dos guarda cada toque, refleja en ficha y Buscar y el Super Admin la ve (triángulo de las tres puntas).
- [ ] «Tu fecha» y la fila «¿Está libre tu fecha?» con fechas reales; los `d:*` cambian a medianoche de la ciudad.
- [ ] Pedir la fecha de punta a punta con tarjeta (retiene, confirma y cobra, otra hora, no, vence, cancelar a 30 días, el negocio cancela) y sin
      tarjeta (Free): cifras exactas en `payments` y en Stripe simulado; acuerdo por escrito inmutable.
- [ ] Reservar viaje, envío, pase y precio cerrado de punta a punta: cupo sin sobreventa, salida cancelada con devoluciones, cancelación tardía a
      la mitad exacta, retraso con SMS, chofer en `/repartidor`; renta de vehículo con licencia revisada.
- [ ] Licencias de transporte en la cola Licencias; Reservar se apaga sin autoridad válida (guardián probado al revés).
- [ ] Datos del destinatario y del traslado médico solo en `op_private` (guardián `destinatarioPrivado` probado al revés).
- [ ] Reseñas verificadas con preguntas y «Lo que importa» de cada rubro; ayudas con motivos, fotos y escalado a To'Latino.
- [ ] Super Admin: Transacciones › Fiestas y Viajes, Colas (fechas canceladas, salidas canceladas, licencias, ayudas), Notificaciones, Analítica
      de las dos.
- [ ] Avisos nuevos ES/EN en `notif_templates` y su SMS donde va.
- [ ] `docs/ayuda/` completas (ES/EN) para cliente y negocio (§4z).
- [ ] Guardianes nuevos de §3 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes; Belleza,
      Auto, Hogar, Salud, Profesionales, Comida (entregas) y Hogar (rentas) sin regresión.
- [ ] Preguntas #1–#24 anotadas en `docs/REVISION.md`; lo diferido en `docs/LAUNCH-CHECKLIST.md` (licencias por tipo con abogado, impuesto con
      contador, pagar el resto de la fiesta en la app, compras del súper con estimado, escolar y grúas, Configuración de plazos en Fase 5).
- [ ] `docs/PROGRESS.md` al día y `docs/REVISION.md` con los pasos para que el fundador lo mire en el sandbox.
