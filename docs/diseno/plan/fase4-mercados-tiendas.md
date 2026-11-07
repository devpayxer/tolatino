# Fase 4 · Mercados + Tiendas — plan de construcción extraído del prototipo (6 nov 2026)

Fuentes (todas en `docs/diseno/pantallas/datos/` salvo indicación): `neg-merc.js` (TLMerc: 26 negocios, 15 Pro; `SUBG`, `ROWS`, `NEED`,
`PAIS`, `WHO`, `GROUPS`, `QUICK5`, `PROD`), `neg-merc-listing.js` (TLMercL: `SVC` k lb · unid · plato, `CUT`/`PUNTO`/`PESC`, `OPTS`
envío y mínimo, `STATS`, `QTY`, `priceFor`, `cartTot` = estimado + 10 % por peso, `sheetVals`, `resAdd`), `neg-merc-flow.js`
(TLMercFlow: `APP-NEG-MERC-PEDIDO` → `-ESTADO`, `SUB`, `weigh`, `sumOf`, `sim`), `neg-merc-kind.js` (TLMercK: `kind`, `weighs`, `age`,
FAQ y reseñas por tipo, `post`), `neg-merc-rev.js` (TLMercRev, `TLHogarExt.mhelp`: `RSN`, `SOL`), `neg-tienda.js` (TLTiendaB: 29 negocios, 16 Pro)
`neg-tienda-data.js` (TLTienda: `SUBG` 7 capítulos, `SVC` k ropa · unid · plan · serv con `tallas`, `OPTS` dev · envio · plan ·
planFee, `STAFF`, `ABOUT`, `RV`, `STATS`), `neg-tienda-listing.js` (TLTiendaL: `priceFor`, `canHold`, `sheetVals`, `resAdd`),
`neg-tienda-flow.js` (TLTiendaFlow: `APP-NEG-TIENDA-APARTADO` → `-ESTADO`, abono del plan), `neg-tienda-kind.js` (TLTiendaK: `kind`, `HOW`,
FAQ por tipo, `post`), `neg-tienda-rev.js` (TLTiendaRev, `TLHogarExt.thelp`: `RSN`, `SOL`), `dash2-cat.js` (TLDashCat: `TOOLS['NEG-MERC'] =
['Balanza y pedidos','Scale and orders','scale']`, `TOOLS['NEG-TIENDA'] = ['Tallas y apartados','Sizes and holds','bag']`, `state` L187–189,
`apply` L207–212, `summary` L319–320, `blocksD` L414–425; `REAL_D` L43: demos Supermercado La Cosecha y Boutique Yaritza), `demo-biz.js`
(`demo-merc` L666, `demo-tienda` L941), `adm-data.js` L22/L26/L127 (tx `ped`, `apt`), `onb-neg-data.js` (= `apps/web/lib/onb/datos.ts`
L46/L50/L88–89/L203/L271: `ALLOW`, preguntas de onboarding); `docs/diseno/plan/taxonomia-negocios.md` §6 y §10 (TAX, familia **F-RETAIL**);
`docs/diseno/referencia/memoria-del-diseno.md` (MEM 165, 169, 432, 519, 921, 950–954, 2097–2136); `docs/diseno/entrega/modelo-datos.md`
(MD: Item, DeliverySettings, Operation `market_order`/`hold`, OperationLine `weight_est · weight_final`, category_attrs NEG-MERC/NEG-TIENDA);
`solo-prototipo.md` (SP §2 «Pasos del servicio», «Plazos sin respuesta»). Plantillas y motores comunes: `fase4-hogar-auto.md` (4a–4g) y
`fase4-salud-pro.md` (4h–4m), ya construidos. Esto es un resumen de trabajo; manda el prototipo. Nada de este archivo se ha construido.

## Tesis y líneas fijas (verbatim, en buscador, ficha, hoja, pedido/apartado, revisión y estado; nunca se suavizan)
- **Mercados y Bodegas (`NEG-MERC`):** «¿lo pesan delante de mí?» · línea **«Lo que va por peso se pesa delante de ti y pagas el peso
  real.»** (`TLMerc.line`) · sub: «Cada mercado dice el precio por libra. En pedidos se retiene el estimado y se cobra lo que pesó, con la
  foto de la balanza.» Si el negocio no vende por libra (`weighs(b)` falso: licorería, tabaquería, vape, botánica, mascotas, a dólar,
  conveniencia, agua, mayorista sin `lb`), la línea de la balanza, los 4 pasos por peso y la pregunta del peso **no salen** (MEM 165).
- **Tiendas (`NEG-TIENDA`):** «¿lo tienen y a qué precio de verdad?» · línea **«El precio que ves es el que pagas en la caja.»**
  (`TLTienda.line`) · sub: «Cada tienda publica precio y existencia al día. Apartar no cobra nada; te lo guardan 48 horas.» (las 48 h
  salen de Tu herramienta: 24/48/72).
- Reglas con candado (Tu herramienta, «REGLAS · NO SE APAGAN»): Mercados — «Se pesa delante y con foto» · «Se cobra el peso real (se
  retiene el estimado + 10 % y se libera el resto)» · «Sustituir solo con su OK (sin OK, no se cobra)». Tiendas — «El precio de la app es
  el de la caja (sin cargos que aparezcan al pagar)» · «Hoy no se cobra el apartado (pagas al recoger, en la caja)».

---

## 0. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Página de categoría NEG-MERC y NEG-TIENDA (filas `que`/`pais`/`como` y `que`/`como`, capítulos, `GROUPS`, `quick5`, stats `pesa` / `apartado`) | `packages/taxonomy/paginas.json`, `lib/categoria.ts`, `lib/buscar.ts` | Ya servidas; faltan los derivados que las alimentan (§2, §5) |
| Subcategorías NEG-MERC-01…30 y NEG-TIENDA-01…52 | migr. 0004 | Coinciden 1:1 con `SUBG` del prototipo (30 y 52) |
| `ALLOW` NEG-MERC `['shop','pedidos']`, NEG-TIENDA `['shop','pedidos','svc','citas','renta']`; módulo principal `shop` | `lib/onb/datos.ts` L79, L88–89 | Onboarding ya pregunta pickup/envío/costo/mínimo/EBT/por libra (Mercados) y apartar/layaway/envío/días para devolver (Tiendas) y guarda `mopts`/`topts`/`tool` |
| `lib/tarjeta.ts` `botonPrincipal` (NEG-MERC «Ordenar» si `pickup`/`envio`; NEG-TIENDA «Apartar» si Pro + `apartado`), chip «Pesan delante de ti» | L65–88 | Tarjeta del buscador ya alineada |
| `items` (`module 'shop'`, `unit 'lb'`, `tax_pct`, `sold_out` + `sold_out_until 'hoy'`, `stock_mode`/`stock_left`, `channels dlv/pick`, `max_qty`, `status hidden` + motivo, `attrs` 0055) · `item_sections` · `option_groups` | migr. 0022, 0055 | Productos de mercado y tienda; **corte / punto / limpio** = `option_groups` obligatorios de 1 (cero centavos) |
| `lib/menu.ts` + `app/panel/Menu.tsx` + `acciones-menu.ts` (constructor del menú: secciones, ítems, opciones, inventario, agotado hoy, horarios, duplicar) | 2a | **Base del editor de productos** (hoy fijo en `module = 'menu'`, L28/L34, acciones L159/L205/L227): se parametriza el módulo. Cierra el ítem de `LAUNCH-CHECKLIST` «Editor de artículos de Tienda/Renta en el panel» |
| `operations` (`kind 'market_order'` y `'hold'` ya en el check), `operation_lines` (`weight_est`, `weight_final`, `status ok/out/removed` 0055), `operation_events` (solo inserción), `change_proposals` (`kind 'items'`) | 0023, 0024, 0055 | Pedido del mercado (`market_order`), apartado (`hold`), sustitución propuesta = `change_proposals` kind `items` |
| `delivery_settings` (pickup, delivery, `zone_mi`, `fee_cents`, `free_over_cents`, `min_order_cents`, `prep_min`, `auto_accept` apagado = 10 min, `pay_card`, `pay_cash_pickup`, `who team/external`) · `app/panel/Entrega.tsx` | 0023, 2f-3 | Una sola fuente para «Costo del envío» y «Pedido mínimo» de Tu herramienta (Mercados) y Panel › Entrega |
| `lib/pedir.ts` (`crearPedido`: candado `pg_advisory_xact_lock('pedido:'+negocio)`, `client_key`, máx. 3 pendientes, techo Free, `calcEstado`, `rangosHoy`, zona de entrega) · `lib/pedidos.ts` (`vencer` 10 min con devolución de inventario, `cambiarPaso`, `guardarSeguimiento`, `cancelarDelCliente`, `pedidosHoy`, `pedidoNegocio`) · `app/panel/Pedidos.tsx` · `/pedido/[num]` | 2b–2c, 2f | **Hoy solo NEG-FOOD** (`crearPedido` L291 rechaza otra categoría): se extraen las piezas comunes (horario, techo, zona, retención, vencer) y el pedido del mercado se arma encima |
| `lib/direcciones.ts` (`zonaDe`, Mis direcciones con geo), `lib/repartidor.ts` + `/repartidor` (asignar, pasos, sin conexión) | 2f, 2l | Envío del mercado con equipo propio o app externa, igual que Comida |
| `lib/cobros.ts` (`comision`, `tarjetaDe`, `retenerPedido`, `registrarRetencion`, `cobrarOperacion`, `liberarOperacion`, `repararPagos`, `devolverPago`, `pagoDe`) · `lib/pagos/pasarela.ts` (`retener` manual capture, **`cobrar(pi, centavos, comision)` con captura parcial**, `liberar`, `devolver`, `cobrarFuera`) | 2d, 4d, 4f | Retener estimado + 10 %, capturar el peso real, liberar el resto; abono del layaway |
| `lib/estimados.ts` (`retenerFalta`, `decidirExtra`, `planLiquidar`, `cobrarLiquidacion`: captura ≤ aprobado y libera el resto, idempotente) | 4d | Patrón de la **liquidación del peso real** y del «pasa lo retenido: pide OK» |
| `lib/apartados.ts` (`tiendaVenta`, `opcionesApartar`, `apartar` con unidades reservadas, `apartadoNegocio` confirma / falta uno / no lo tiene / lo recogió, `barrerApartados`, `tiendaMia`, `MAX_LINEAS 10`, `MAX_QTY 3`, 48 h fijas) · `/n/{id}/apartar` (Apartar.tsx) · `/apartado/{num}` · `app/panel/Apartados.tsx` · `app/(app)/n/[id]/Tienda.tsx` (carrito en el teléfono `tl-apartado-{id}`) · migr. 0055 (`hold_seq` A-9501, avisos `apt_ok/apt_falta/apt_no/apt_vence/biz_apartado`) | 4f-3 | **El motor del apartado de Tiendas ya existe** (se construyó para Auto/Hogar como motor común): aquí se le suman tallas, horas 24/48/72, «otra talla», envío de la tienda y layaway |
| `lib/rentas.ts` (renta 48 h, depósito, tarde) · `/n/{id}/rentar` | 4f-2 | Ferretería con «Renta de herramienta» (NEG-TIENDA-44) sin código nuevo |
| `lib/novedades.ts` + `business_posts kind 'oferta'` (`price_was_cents`, `price_now_cents`, `oferta_precio()` que **se cobra de verdad** mientras está en vivo) | 2g-2, migr. 0028 | «Pollo entero $1.29/lb hasta el domingo», «ANTES $35»: la oferta semanal sale de Novedades, no de un campo libre (Preguntas #6) |
| `tax_rules` (por ciudad y categoría, en datos) · `items.tax_pct` | 4d (0051), 0022 | Impuesto por producto: comida para la casa exenta, comida lista y no-comida gravadas (Preguntas #3) |
| `lib/resenas.ts` (`opParaResena` ya acepta `kind 'hold'`; `hechosDe` de pedidos; `limpiarRespuestas` por rubro; `PCT`) · `lib/resenas-filtro.ts` | 2g, 4g, 4m | Reseña verificada por compra / por apartado con preguntas de rubro |
| `lib/ayuda.ts` (ayuda con el pedido de Comida: 24 h, escalar a To'Latino, cola `sop`) · `lib/ayuda-cita.ts` (fotos privadas, decisión con monto, `/api/ayuda/foto`) · `lib/ayuda-motivos.ts` (`POR_RUBRO`, `QUIERE`) | 2i, 3e, 4g, 4m | Ayuda con el pedido del mercado y con la compra de la tienda: motivos y etiquetas por rubro |
| `lib/avisos.ts` (`avisar`, `avisarNegocio`, `avisarPedido`) · `notif_templates` | 2j | Plantillas nuevas ES/EN (§4) |
| `lib/plan.ts` (`TOPE_FREE 10`, `ITEMS_FREE 5`), `lib/suscripcion.ts` | 1h, 2s | Free = 5 productos visibles y 10 pedidos/apartados al mes pagando en el local |
| `app/panel/Panel.tsx` (Lo que vendes), `app/panel/Equipo.tsx` (`NO_RENTA` incluye NEG-MERC/NEG-TIENDA) | 1h | Tu herramienta nueva cuelga de Lo que vendes |
| Super Admin: `app/admin/N360.tsx` (Lo que vende, ocultar con motivo), `Transacciones.tsx` (pestañas Pedidos, Apartados…), `Colas.tsx`, `Analitica.tsx`, `Planes.tsx` (`fee_rules` `ped` 10 %, `apt` 6 %) | 1i, 2i, 4g-3, 4m-3 | Se extienden con pestaña Mercado y las vistas del layaway |
| Guardianes `dineroDelServidor`, `retencionPorTarjeta`, `transaccionEnFila`, `operacionesConTipo`, `derivadosDelEstimado`, `barraDoble`, `pestanaVende`, `rubroComoBooleano`, `fotoAyudaPrivada` | `guardianes/run.mjs` | Se reusan y se suman los de §3 |

## 1. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El prototipo del **cliente** está completo en las dos (etapas 1–4: categoría, ficha, pedido/apartado y estado, reseña y ayuda). El
**panel** solo trae «Tu herramienta» (`dash2-cat.js blocksD`) y la solicitud genérica (`reqRow` k `ped`, incluido un apartado
«Paga al recoger · 48 h», `dash2-data.js` L106). **No hay:**
1. **Editor de productos** de Tienda/Mercado (nombre, foto, precio, por libra o por unidad, corte/punto, tallas con existencia, plan,
   «solo en la tienda», EBT sí/no, gravable sí/no). Se compone parametrizando el constructor del Menú (`Menu.tsx`) con el módulo `shop`.
2. **Pesar el pedido** en el panel: por cada línea por libra, peso real + foto de la balanza (obligatoria); «No hay» con propuesta de
   sustitución (otro producto del mismo mercado y su precio) o «Quitarlo»; total en vivo calculado por el servidor; «Mandar al cliente».
3. **Franjas de pickup / envío con cupo** (el prototipo marca horas «ocupadas» al azar, `hash < .2`): falta dónde el mercado dice
   cuántos pedidos caben por franja.
4. **Apartado con tallas** en el panel: «Falta esa talla · ofrecer la de al lado» (el cliente ve «FALTA UNA TALLA · Te ofrecen la talla
   de al lado al mismo precio»), «Enviado / Entregado» del envío de la tienda.
5. **Layaway** en el panel y en Mi cuenta: abono, calendario de pagos, pagado / falta, atrasado, «Terminó de pagar · listo para
   recoger», cancelar con el cargo dicho por escrito. El prototipo solo muestra el abono y «el resto en N pagos».
6. **Parámetros del plan** (abono %, número de pagos, cada cuánto, cargo por no terminar) en Tu herramienta: el prototipo los tiene en
   `OPTS.plan` / `planFee` pero sus bloques solo traen el interruptor «Layaway».
7. **«Revisé la ID»** al entregar algo de 21+ (Preguntas #4) y el aviso de «solo en la tienda» en los productos de edad.
8. Super Admin: pestaña **Mercado** en Transacciones (estimado / retenido / peso real / cobrado / liberado, fotos de la balanza) y vista
   de **planes de layaway**; Analítica de Mercados y Tiendas.
Se compone con piezas existentes (`rows`, `step`, `chips`, `form`, `money`, `note`, `steps`, tarjeta de pedido del panel, `Estimado.tsx`,
`Apartados.tsx`) y cada pantalla nueva va a `docs/REVISION.md` con su captura (teléfono y escritorio).

---

## 2. Cambios de datos (migraciones 0064 →, una por bloque; nada se borra; `city_id` en todo lo nuevo)

**0064 `mercados_tiendas` (4n)**
- `items`: `shop_kind text check in ('peso','unid','plato','talla','plan','serv')` (prototipo Mercados `k lb · unid · plato`; Tiendas
  `k ropa · unid · plan · serv`; `peso` ⇔ `unit = 'lb'`, `talla` ⇔ tiene variantes); `ebt bool` (elegible SNAP: por defecto sí en `peso`
  y `unid` de comida, **no** en `plato`, alcohol, tabaco, vape, limpieza, mascotas — se deriva de la sección/subcategoría y el dueño lo
  corrige); `age_min smallint check in (0, 21)` (licor, cerveza y vino, tabaco, vape: `age(b)` del prototipo); `size_label jsonb`
  («Talla» / «Número», `tallaK`); `in_store_only bool` (= `sell_mode local_only` del MD: «SOLO EN LA TIENDA»). Índice
  `(business_id, shop_kind) where module = 'shop' and removed_at is null`.
- **`item_variants`** (tallas con existencia; MD «stock» por talla, `SZ0` del panel): `id`, `item_id`, `business_id`, `label text`
  (1–8: S · M · L · XL · 2X · 3X · 8 · 9 · 10…), `sort`, `stock_left int 0–9999`, `updated_by/at`, `removed_at`;
  `unique (item_id, label) where removed_at is null`. Una talla en 0 **no se aparta** (servidor). `operation_lines`: `variant_id`,
  `variant_label` (copia).
- **`retail_settings`** (Tu herramienta, una fila por negocio; `TLDashCat.state` NEG-MERC / NEG-TIENDA): Mercados `ebt bool`, `cash bool`,
  `weighs_front bool` (MD `category_attrs.NEG-MERC.weighs_in_front`, se escribe también ahí), `sub_default call|similar|no`, `slot_cap
  smallint 1–30` (hueco #3); Tiendas `hold_hours smallint check in (24, 48, 72)` (escribe `category_attrs.NEG-TIENDA.hold_hours` del MD),
  `returns_days 0–90` (paso 7; 0 = «no acepta cambios»), `cash bool`, `layaway bool`, `lay_down_pct 10–50` (paso 5; def. 20),
  `lay_payments 2–6` (def. 4), `lay_every_days check in (7, 14, 30)` (def. 14), `lay_cancel_pct 0–10` (def. 10, `planFee`);
  `updated_by/at`. Costo y mínimo del envío **no** se duplican: viven en `delivery_settings`.
- `delivery_settings`: `ship bool`, `ship_fee_cents`, `ship_free_over_cents`, `ship_days check in ('1-2','3-5','5-7')` (MD
  DeliverySettings «Solo Tienda y Renta»; MEM 519 `dlv.ship, shipFee, shipFree, shipD`).
- `media.owner_kind` + `'line'` (foto de la balanza por línea).
- `fee_rules.kind` + `'merc'` (sembrar 1000 bp = igual que `ped`, para que el fundador la mueva aparte; Preguntas #8).

**0065 `pedidos_mercado` (4p)** — `operations`: `window_end timestamptz` (franja de envío de 1 h: «12:00 PM–1:00 PM»);
`details.sub call|similar|no` (SI ALGO NO HAY), `details.hold_est_cents` (estimado), `details.weighed_at`, `details.approved_at`
(«Está bien, cobrar»), `details.id_checked_by` (21+). `status_detail` toma `preparando | pesado | listo | camino`. `operation_lines`:
`weight_final` (ya existe) + **`final_cents` derivado** (`generated always as (round(unit_price_cents * weight_final))` para `peso`;
copia de `line_total_cents` para `unid`; 0 si `out` sin sustitución aceptada) — nunca editable; `weigh_photo_id` (media `line`).
`change_proposals`: `expires_at` (sustitución: 10 min) + `line_id`. Secuencia `market_seq start 6101` (número **M-6101**, como el
prototipo `M-6xxx`; Preguntas #13). `payments.kind` ya admite `full` + `extra` (seq) desde 0051.

**0066 `apartados_tiendas` (4q)** — `operations.details.hold_hours` (copia de `retail_settings` al enviar; el motor de 0055 usa 48 fijas);
`details.ship true` + `details.tracking_url` + `details.shipped_at` (envío de la tienda); `change_proposals kind 'items'` para «la talla de al
lado» (`proposed {line_id, variant_id, label}`); `operation_lines.status` + `'swapped'`.

**0068 `layaway` (4r)** — **`layaway_plans`**: `operation_id` (el apartado A-…), `total_cents`, `down_pct`, `down_cents`, `n_payments`,
`every_days`, `cancel_pct`, `terms jsonb` (texto ES/EN exacto que el cliente aceptó), `accepted_at`, `accepted_ip`, `accepted_version`
(inmutable, como `written_totals` de 4l), `status active|paid|late|cancelled`, `paid_cents` **derivado** (Σ pagos capturados − devueltos),
`next_due_at`, `city_id`. **`layaway_payments`**: `plan_id`, `seq`, `due_at`, `amount_cents`, `payment_id` (→ `payments kind 'balance'
seq`), `status due|paid|late|waived`. `payments.kind` + `'layaway'` si conviene separarlo de `balance` (decidir al migrar; sin cambiar
`unique (operation_id, kind, seq)`). La unidad apartada queda reservada (`stock_left`/`item_variants`) mientras el plan está vivo.

**0069 `ayuda_mercados_tiendas` (4s)** — `help_requests.reason` amplía Mercados (`neg-merc-rev.js RSN`: `peso`(foto), `falto`(foto),
`fresco`(foto), `sust`, `caja`(foto), `tarde`, `otro`; `falto` ≠ `falta` de Comida para no mezclar etiquetas) y Tiendas
(`neg-tienda-rev.js RSN`: `caja`(foto), `apa`, `talla`, `cambio`(foto), `dano`(foto), `otro`; `dano` ya existe con etiqueta de Auto →
`POR_RUBRO.tienda`); `wants` reusa `devolver` · `reponer` (Mercados «Que me lo repongan», Tiendas «Cambiarlo») · `avisar`.
Plantillas de aviso de 4p–4r si no entraron en su bloque. `reviews.answers`/`facts` guardan lo de 4s.

---

## 3. Dinero, edad, EBT e impuesto (reglas del servidor — Opus/high; revisión de seguridad obligatoria)

El servidor calcula todo; el cliente solo muestra (guardián `dineroDelServidor`). Comisión solo sobre tarjeta en la app.

| Momento | Mercados (`neg-merc-flow`) | Tiendas (`neg-tienda-flow`) |
|---|---|---|
| Al enviar | Tarjeta: **se retiene** estimado + **10 % de lo que va por peso** + envío (`cartTot.hold`); «No se cobra todavía.» Pagar en el mercado (EBT, efectivo, Free): $0 en la app | Apartado: **$0**. Con plan: **se retiene el abono** (`lay_down_pct` de lo que va en plan). Con envío: ver Preguntas #10 |
| Lo aceptan | Nada nuevo. Sin respuesta en **10 min** → SIN RESPUESTA, se libera (`vencer`) | Confirma que lo tiene → te lo guardan `hold_hours` desde tu hora; con plan se **cobra el abono** |
| Lo pesan | Peso real × precio por libra = `final_cents`; foto de la balanza por línea; **total real ≤ retenido** o se pide OK (abajo) | — |
| Algo no hay | Sustitución propuesta: Sí → precio del estante del sustituto; No / sin respuesta en 10 min → se quita y **no se cobra** | Falta una talla: «Sí, la otra talla» (mismo precio) o «Quitarlo» |
| «Está bien, cobrar $X» | **Captura parcial** de lo real (`pasarela.cobrar`) y **se libera el resto** («Cobrado $X · se liberan $Y», 3–5 días) | — |
| Recogido / entregado | Si el cliente no tocó «Está bien»: se captura al marcar Recogido/Entregado (Preguntas #2) | Pagas en la caja lo que viste (o el resto del plan ya pagado) |
| No / vence / cancela | Se libera todo | Se libera; el abono vuelve completo si la tienda no lo tiene o cancela; si el cliente no termina el plan: lo abonado − `lay_cancel_pct` |

- **Total real mayor que lo retenido** (pesó más del estimado + 10 %): el panel no deja mandar ese total; ofrece «Cortar menos» o «Pedir
  OK por $Z más» → nueva retención `extra` (seq) con el patrón de `decidirExtra` (4d). Sin OK, se cobra como máximo lo retenido.
- **Liquidación** (`liquidarMercado(opId)` sobre `planLiquidar`/`cobrarLiquidacion`): F = Σ `final_cents` de líneas `ok` + sustitutos
  aceptados + envío; captura ≤ Σ retenido vivo; libera lo demás; idempotente, con `pg_advisory_xact_lock('pedido:'+negocio)` y
  `operation_events` (`weighed`, `sub_proposed`, `sub_ok/no/exp`, `approved`, `settled`).
- **EBT / SNAP:** To'Latino **no procesa EBT** (necesita autorización del USDA para venta en línea y un procesador externo que no está en
  PLAN §8). En la app: filtro, amenidad y «¿Pagas con EBT? Elige pagar en el mercado al recoger.» → pedido `pay_mode 'local'` solo pickup,
  sin retención (Preguntas #1). Textos verbatim: «Solo comida que no está caliente. No cubre alcohol, tabaco ni el envío.» El servidor nunca
  marca `ebt` un `plato`, alcohol, tabaco, vape ni no-comida.
- **Edad (21+):** productos con `age_min 21` (licor, cerveza y vino, tabaco, vape) — **nunca envío**, nunca pago con tarjeta en la app, y por
  defecto **solo en la tienda** (catálogo con precio, sin pedir; Preguntas #4). Línea: «21+ con ID; no hay envío de alcohol.» Si el
  fundador enciende el pickup, el panel exige «Revisé la ID» antes de «Lo recogió».
- **Servicios de dinero en bodega** (remesas, cambio de cheques; NEG-MERC-29): solo información (FAQ «Te dicen la tarifa y la tasa antes de
  mandarlo; llevas tu ID.»). Nada de eso se vende ni se cobra en la app (actividad con licencia propia).
- **Impuesto** (Preguntas #3): por producto (`items.tax_pct` desde `tax_rules` por ciudad y sección), nunca en código. La línea fija exige
  que lo que ves sea lo de la caja: la ficha y la hoja muestran el precio **con** su impuesto cuando es gravable («$25.44 en la caja ·
  incluye 6 % de impuesto»).
- **Precio de la caja = el publicado** (Tiendas) y **del estante = caja** (Mercados): el apartado y el pedido copian el precio al enviar;
  si el dueño cambia el precio después, lo ya enviado no cambia (como 4l copia el gobierno).
- **Comisión:** pedidos del mercado con tarjeta → `fee_rules 'merc'` (sembrada en 10 % = `ped`) sobre lo capturado sin impuesto ni envío;
  abono y pagos del layaway → `apt` (6 %); EBT y efectivo → $0. Devolución sin comisión (como 3e).
- **Guardianes nuevos:** `pesoConFoto` (ninguna línea `peso` con `weight_final` sin `weigh_photo_id`); `capturaMercado` (Σ capturado ≤ Σ
  retenido y = Σ `final_cents` aprobado; ninguna retención viva en `market_order` `done/cancelled/declined/expired` más de 1 h);
  `sinSustitucionSinOk` (ninguna línea sustituida cobrada sin `change_proposals.status = 'accepted'`); `edadSinEnvio` (ninguna línea
  `age_min 21` en `mode delivery` ni en `pay_mode app`); `ebtSoloComida`; `tallaEnCero` (ningún apartado con variante en 0 al enviar);
  `layawayAceptado` (ningún cobro de layaway sin `accepted_at` y `terms`).

---

## 4. Bloques

### 4n · Productos, tallas, Tu herramienta y filtros (panel + admin + datos) — Sonnet/medium; migración Opus
**Datos:** migración 0064. Semilla de pruebas `infra/pruebas/semilla/0019_mercados_tiendas.sql` (`is_test`, nunca en producción),
generada por `scripts/semilla/extraer-mercados-tiendas.cjs` (como `extraer-hogar-auto.cjs`) desde `TLMercL.SVC` (15 mercados Pro con
productos, `CUT`/`PUNTO`/`PESC` → `option_groups`, `OPTS` → `delivery_settings`), `TLTienda.SVC` (16 tiendas Pro con `tallas` →
`item_variants`, `OPTS.dev/envio/plan/planFee` → `retail_settings`/`delivery_settings`), `STAFF`, `ABOUT`, `RV`, `STATS`, y los demos
`demo-merc` / `demo-tienda` (`demo-biz.js` L666, L941) con sus solicitudes.
**Panel (Lo que vendes):**
- **Productos** (hueco #1, sobre el constructor del Menú con `module 'shop'`): secciones («Carnicería», «Frutas y víveres», «Despensa»…;
  «Ropa», «Accesorios»…), por producto: nombre ES/EN, descripción, foto (hasta 5), precio, **cómo se vende** (`peso` «Por libra · se pesa
  delante» · `unid` · `plato` «LISTO PARA LLEVAR» · `talla` · `plan` · `serv` «EN LA TIENDA»), corte/punto (grupo obligatorio de 1),
  tallas con existencia (−/+; 0 = agotada), «Solo en la tienda», EBT sí/no, gravable sí/no, agotado hoy, ocultar; Free = 5 visibles (los
  demás dormidos).
- **Tu herramienta** (§6): Mercados «Balanza y pedidos», Tiendas «Tallas y apartados». Cada toque se guarda y deja `AuditEntry`.
- **Entrega** (`Entrega.tsx`): Tiendas suma «Envío por correo» (`ship`, costo, gratis desde, días).
**Derivados → filtros** (`filter_values`, recalculados al guardar, nunca editables): Mercados `pickup envio ebt efectivo mayoreo estac
domingo pesa esp deli noche remesas p:do p:mx p:ca p:sa p:car y10` (`pesa` = `weighs_front` y algún `peso`; `pickup`/`envio` de
`delivery_settings`; `ebt`/`efectivo` de `retail_settings`; `domingo`/`noche` del horario; `deli` de la subcategoría; `p:*` de las
subcategorías de país); Tiendas `apartado layaway envio efectivo estac domingo esp tallas y10` (`apartado` = Pro + `pedidos` + `hold_hours`;
`layaway` del toggle; `envio` = delivery o `ship`; `tallas` = alguna variante 2X/3X o más).
**Super Admin (ADM-NEG 360 › Lo que vende):** ocultar producto (`itemOff['mp:'+id]` / `'tp:'+id`, con motivo), pausar módulos (`shop`,
`pedidos`), Tu herramienta en solo lectura (`summary`), Catálogo › Filtros (los de §5). Auditoría de cada cambio.
**Guardianes:** `shop_kind` coherente con `unit` y variantes; ningún `filter_values` sin fuente; ES/EN en todo texto nuevo; `pestanaVende`.

### 4o · Ficha de Mercados (cliente) — Sonnet/medium
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-MERC), pestaña **Productos** (`svc`), hoja del producto, tarjeta «Tu pedido», barra.
- **Productos** por sección: meta `SE COBRA LO QUE PESE` (peso) · `LISTO PARA LLEVAR` (plato) · `ANTES $1.79` (oferta de Novedades) ·
  `EN TU PEDIDO: N`; precio `$2.49/lb`; botón «Agregar» (o «Cómo llegar» si no toma pedidos / es solo en la tienda).
- **Hoja:** «¿Cuánto? · estimado» (lb 1 · 2 · 3 · 5 · 10) o «¿Cuántos?» (unid 1 · 2 · 3 · 6 · 12; plato 1–4), «¿Cómo lo quieres?» (corte:
  Entero · En trozos · Para guisar · Molido; pescado: Entero · Limpio y escamado · En filete) o «¿De qué punto?» (Verde · Pintón · Maduro;
  aguacate Para hoy · Para 2 días); nota «Es un estimado: pesa distinto cada pieza. Se retiene $X…» / «Precio del estante. Si no hay, te
  preguntan antes de cambiarlo.»; **un mercado a la vez** («Tienes un pedido en otro mercado; si agregas aquí, se reemplaza.»); IMPORTANTE.
- **Notas de Productos** (máx. 4): «Aquí la balanza está de frente al cliente.» · «En pedidos por libra se retiene el estimado + 10 % y se
  cobra lo que pesó, con la foto de la balanza. Lo que sobra se libera.» · «Si algo no hay, te preguntan antes de cambiarlo. Sin tu OK no se
  sustituye.» · «Acepta EBT / SNAP en la tienda». Con 21+: «21+ con ID; no hay envío de alcohol.»
- **Resumen:** tarjeta **«¿LO PESAN DELANTE DE TI?»** («Sí: la balanza está de frente al cliente» / «Pregunta en el mostrador»; «En
  pedidos: foto de la balanza en cada artículo por peso.»; «Verificado por reseñas de clientes»); **Cómo se cobra lo que va por peso** en 4
  pasos (Agregas… · Se retiene el estimado + 10 %… · Lo pesan y te mandan la foto… · Se cobra lo que pesó y se libera el resto.); riel
  PICKUP «En 30–45 min» · ENVÍO «$3.99 · mín. $20» · PAGO «EBT · tarjeta · efectivo»; amenities (`AM`: pesa, ebt, pickup, envio, estac,
  domingo…); FAQ por tipo (§5); «Cómo funciona tu pedido» si no pesa (Se retiene el total… · Se cobra cuando lo recoges o te llega.).
- **Variantes (`TLMercK.post`):** mayorista «PRECIO POR CAJA · ENVÍO CON PEDIDO DE $100» («Precio por caja, saco o bulto. Vende a todos;
  a negocios les hace factura.»); agua «Cambias el vacío»; mercado de agricultores «Jueves y sábados de 8 AM a 1 PM, de mayo a noviembre»;
  24 horas; «ESTACIONAMIENTO PROPIO»; Free: «RESEÑAS DE VISITANTES · AQUÍ NO SE PIDE POR LA APP», barra «Ve directo» + HOY HASTA, 21+ con
  ID en licor/tabaco/vape, sin «Desde $» ni «PICKUP · NO».
**Estados del cliente:** ninguno nuevo (el pedido nace en 4p). Carrito en el teléfono (como Tienda.tsx), validado de nuevo en el servidor.

### 4p · Pedido del mercado: retener, pesar con foto, sustituir con OK, cobrar el peso real + Panel — **Opus/high** (dinero)
**Pantallas:** `APP-NEG-MERC-PEDIDO` (`s.mb`), `APP-NEG-MERC-ESTADO` (`s.mped`), Mi cuenta `USR-PEDIDOS`/`USR-PEDIDO`, Panel › Hoy /
detalle del pedido (hueco #2), `/repartidor` para el envío.
- **Pedido (3 pasos, vistas `ab`; desktop una página + columna sticky):** 1 **Tu pedido** (resumen del carrito con «estimado» por línea ·
  ¿Cómo lo recibes? Pickup en el mercado «Gratis» / Envío a tu casa «$3.99» con mínimo «El envío pide un mínimo de $20» · **SI ALGO NO HAY**:
  Llámame · Uno parecido, con mi OK · No sustituir — «Sin tu OK no se cambia nada.» · nota 0/200 «Ej.: el pernil con cuero, plátanos bien
  verdes…») → 2 **Cuándo** (hoy / mañana; pickup cada 30 min desde +45 min, envío en franjas de 1 h desde +1.5 h, con cupo; «Ya no hay
  horas hoy. Elige mañana.») → 3 **Revisa y envía** (líneas con estimado + «Extra retenido por peso (10 %)» + envío; CÓMO SE COBRA: Hoy, al
  enviar · se retiene $X («No se cobra todavía. Incluye un 10 % extra en lo que va por peso.») · Al pesar · Peso real («Te mandan la foto de
  la balanza y se cobra lo que pesó.») · Al terminar · Se libera («Lo que sobre de la retención, en 3–5 días.»); BUENO SABER: la línea fija ·
  «Si algo no hay, te preguntan antes; si no contestas en 10 minutos, se quita y no se cobra.» · «Si el mercado no acepta el pedido en 10
  minutos, se libera la retención.» · «¿Pagas con EBT? Elige pagar en el mercado al recoger.»; TARJETA; Avisos por SMS «Cuando lo pesan y
  cuando está listo.»; barra HOY SE RETIENE $X → «Enviar pedido»). Sin sesión → entrar y volver.
- **Servidor:** `crearPedidoMercado(userId, f)` en `lib/mercado.ts` con las piezas comunes extraídas de `crearPedido` (horario, techo Free
  10/mes, zona de entrega con `zonaDe`, `client_key`, máx. 3 pendientes, candado por negocio), precios del servidor (oferta de Novedades
  incluida), cupo por franja (`slot_cap`), reserva de inventario, retención `retenerPedido` del estimado + 10 % + envío, `pay_mode 'local'`
  para EBT/efectivo/Free. Número M-6101….
**Estados** (status + `status_detail`): `pending` PEDIDO ENVIADO («Se retuvieron $X. Si no aceptan en 10 min, se libera.») →
`confirmed`·`preparando` PREPARANDO («Están armando tu pedido · Te mandan la foto de la balanza de lo que va por peso.») → `pesado` ASÍ LO
PESARON («Total real: $X · Revísalo. Se cobra cuando digas que está bien.»; por línea «Pediste 3 lb · pesó 2.84 lb» + FOTO DE LA BALANZA ·
PESADO A LAS 1:05 PM; lo que no había: «Proponen: Otra marca parecida $X. Toca para aceptar.» · SIN TU OK NO SE COBRA; «Lo que va por peso
pesó menos que el estimado: pagas $X» / «Todo al precio del estante.»; Estimado · Peso real · Incluye envío · Retenido · SE COBRA · «Se
liberan $Y de la retención.»; «Está bien, cobrar $X» · «El peso no me cuadra» → Ayuda · «Llamar al mercado») → `listo` LISTO PARA RECOGER
(«En el mostrador de {negocio}») | `camino` EN CAMINO («Llega entre …») → `done` RECOGIDO / ENTREGADO («Pagaste $X · liberados $Y»; Retenido ·
Cobrado · peso real · Liberado 3–5 días hábiles; estrellas; «Volver a pedir»; «Ayuda con el pedido») | `declined` NO ACEPTARON («El mercado no
puede hoy · Liberamos los $X. No se cobró nada.» + «Buscar otro mercado») | `expired` SIN RESPUESTA («No aceptaron en 10 min») | `cancelled`
CANCELADO («Liberamos la retención.»). Cancelar gratis mientras no lo acepten (`cancelarDelCliente`). Pasos: Enviado · Preparando ·
Pesado · Listo/En camino · Recogido/Entregado.
**Panel (Hoy · detalle):** Aceptar / No puedo (10 min, `auto_accept` apagado) → **Pesar** (hueco #2: peso real + foto por línea `peso`;
«No hay» → proponer sustituto del mismo mercado o quitar; según `details.sub`: «Llámame» muestra el teléfono y el resultado se marca a mano)
→ «Mandar al cliente» → espera OK (o 10 min de sustitución) → Listo / Asignar repartidor / En camino / Entregado / Lo recogió; «Revisé la
ID» si hay 21+ (solo si Preguntas #4 se enciende).
**Servidor:** `aceptarMercado`, `pesarMercado(negocio, num, lineas[{id, lb, foto}])` (sube a media `line`, valida 0 < lb ≤ estimado × 3,
calcula `final_cents`), `proponerSustituto`, `decidirSustituto(userId, num, lineId, si)`, `aprobarPeso(userId, num)` → `liquidarMercado`,
`pedirExtraMercado` / `decidirExtraMercado`, barrido `vencerMercado` (10 min aceptar · 10 min sustitución · recordatorio de «Está bien»).
**Avisos nuevos:** `biz_merc` (nuevo pedido, SMS), `merc_ok`, `merc_pesado` (SMS «Revisa el peso de tu pedido: $X»), `merc_sust` (SMS,
10 min), `merc_listo`, `merc_camino`, `merc_cobrado` («Cobrado $X · se liberan $Y»), `merc_no`, `merc_exp`; al negocio `biz_merc_ok`
(aprobó), `biz_merc_sust` (respuesta a la sustitución).
**Super Admin:** Transacciones › **Mercado** (hueco #8): línea de tiempo, estimado / retenido / peso real / cobrado / liberado por pedido y
fotos de la balanza (solo lectura); Colas › «Retenciones que fallaron».
**Guardianes:** los de §3 + punta a punta: 3 líneas por libra y 1 por unidad → pesa −6 %/+9 % (como `weigh`) → una sin existencia con
sustituto rechazado → «Está bien» → cobrado y liberado exactos; carrera de aceptación (dos miembros aceptan a la vez).

### 4q · Ficha de Tiendas y apartado con tallas, horas y envío (motor de 4f-3 ampliado) — Sonnet/medium; envío con tarjeta Opus
**Pantallas:** `APP-NEG-LISTING-PRO/FREE` (NEG-TIENDA), pestaña **Productos** (o «Servicios» en lavandería, sastre, tintorería, estética
canina), hoja, tarjeta «Tu apartado», `APP-NEG-TIENDA-APARTADO` (= `/n/{id}/apartar`) → `APP-NEG-TIENDA-ESTADO` (= `/apartado/{num}`).
- **Productos:** meta `QUEDAN 9` / `AGOTADO` (suma de tallas), `ANTES $35` (oferta), `ABONO 20 % · 4 PAGOS` (plan), `EN LA TIENDA` (serv),
  `APARTADO: N`; botón «Apartar» (Pro con `apartado` y no `serv`) o «Cómo llegar». Notas (máx. 4): la línea fija + «Lo que dice "oferta"
  tiene el precio de antes al lado.» · «Apartar no cobra nada: te lo guardan 48 horas y pagas en la caja lo mismo que ves aquí.» · «Muebles y
  electrodomésticos en plan: abono del 20 % y 4 pagos sin intereses. Si no terminas de pagar, te devuelven lo abonado menos 10 %.» ·
  «Cambios y devoluciones: 30 días con el recibo.»
- **Hoja:** Talla / Número (ELIGE 1; «quedan 2» si ≤ 2; «agotada» no se elige: «Agotada en esa talla»; «Elige la talla») + ¿Cuántos? 1·2·3 →
  «Apartar no cobra nada. Te lo guardan 48 horas y pagas $X en la caja.» / plan «Plan: hoy pagas el abono de $X y el resto en N pagos. Te lo
  entregan al terminar de pagar.» / serv «Precio en la tienda. Te dicen el total antes de empezar.»
- **Resumen:** tarjeta «¿ES EL PRECIO DE LA CAJA?» («Sí: el precio de aquí es el de la caja» · «Existencia al día: si dice "quedan 2", hay
  2.» · «Lo confirman las reseñas»); riel APARTADO «48 h · gratis» · PLAN «20 % + 4» · CAMBIOS «30 días»; hechos PRECIOS «Los de la caja» ·
  CAMBIOS · IDIOMAS; amenities; FAQ (¿El precio de aquí es el de la caja? · 2 por tipo · ¿Cómo funciona el apartado? o ¿Aceptan cambios?).
- **Variantes (`TLTiendaK.post`):** tipos ropa · cel · tec · casa · ferr (mat) · bell · joya · fam · svc · auto · pet · online · movil;
  servicios = pestaña «Servicios» + «Cómo funciona» (`HOW`: lavado por libra listo el mismo día antes de las 10 AM; bastas en 3 días con
  precio antes de cortar; baño y corte con cita por tamaño; seco en 2 días); tienda en línea «Solo en línea: pides por WhatsApp y te lo
  envían.» / vendedor móvil «Vende en la calle; dice dónde está cada día.» = «Dónde vende» + «NO TIENE TIENDA FÍSICA»; Free «RESEÑAS DE
  VISITANTES · AQUÍ NO SE APARTA POR LA APP», barra «Ve directo / Llama o pasa / Pide por WhatsApp» + HOY HASTA.
- **Apartado (3 pasos; motor `lib/apartados.ts`):** 1 **Tu apartado** (artículos con talla · ¿Cómo lo recibes? «Lo recojo en la tienda ·
  Gratis» / «Envío a tu casa · llega en 3–5 días · $6.99 · gratis desde $X» · nota «Ej.: es para regalo…») → 2 **Cuándo pasas** (hoy,
  mañana, pasado; HORA EN QUE PASAS / HORA DE ENTREGA) → 3 **Revisa y envía** (ARTÍCULOS · CÓMO · CUÁNDO · TE LO GUARDAN «48 horas»; CÓMO SE
  PAGA Hoy $0 «Apartar no cobra nada.» / abono · En la caja / Al entregar $X «Lo mismo que ves aquí.» · Plan N pagos; BUENO SABER: línea fija
  · «Si no pasas en 48 horas, vuelve al estante y no se cobra nada.» · cambios · cargo del plan; barra HOY PAGAS $0 · EN LA CAJA $X →
  «Apartar»).
- **Cambios al motor:** `hold_hours` de `retail_settings` (Auto/Hogar siguen en 48); variante obligatoria y reservada; «Falta esa talla»
  en el panel → `change_proposals` con la talla de al lado → cliente **FALTA UNA TALLA** («Sí, la otra talla» / «Quitarlo»); envío
  (`details.ship`): la tienda marca **Enviado** (con enlace de seguimiento, `guardarSeguimiento`) y **Entregado**.
**Estados:** `pend` APARTADO ENVIADO («Confirman que lo tienen en unos minutos. No se ha cobrado nada.») → `ok` TE LO GUARDAN («Hasta el
sáb 26 · 3 PM · En la caja pagas $X.») | `parcial` FALTA UNA TALLA | `no` NO LO TIENEN («Se agotó antes de apartarlo · No se cobró nada.») |
`exp` VENCIÓ («No pasaste en 48 h · Volvió al estante.») → `done` RECOGIDO («Pagaste $X.»; estrellas; «Ayuda con la compra») | `cx` CANCELADO
(«No se cobró nada.» / «Te devolvemos el abono.»). Pasos: Enviado · Guardado · Recogido.
**Panel:** `Apartados.tsx` + tallas, «Ofrecer otra talla», «Enviado / Entregado»; Hoy con «Apartados · N por confirmar».
**Avisos:** reusar `apt_ok`, `apt_falta`, `apt_no`, `apt_vence`, `biz_apartado`; nuevos `apt_talla` (SMS «Falta tu talla: te ofrecen la
{talla}»), `apt_vence_pronto` (2 h antes), `apt_enviado` (con enlace), `apt_entregado`.
**Super Admin:** Transacciones › Apartados con talla, envío y abono.

### 4r · Layaway (plan de pagos) de Tiendas — **Opus/high** (acuerdo con dinero; revisión de seguridad)
**Pantallas:** hoja y apartado con `plan` (4q), estado del plan en `/apartado/{num}` (hueco #5: «Tu plan» Abono · Pagado · Resto «En pagos
sin intereses» · TOTAL + calendario), Mi cuenta (Apartados › planes), Panel (hueco #5), Tu herramienta (hueco #6).
- **Acuerdo por escrito antes de pagar** (como «El total, por escrito» de 4l): total, abono, número y fechas de los pagos, cada cuánto,
  «sin intereses», qué pasa si no terminas («te devuelven lo abonado menos 10 %»), que el artículo se entrega al terminar y que queda
  guardado mientras pagas. «Aceptar y pagar el abono» registra hora, versión e IP (inmutable, guardián `layawayAceptado`).
- **Abono:** se retiene al enviar y se cobra cuando la tienda confirma que lo tiene; si no lo tiene → se libera completo.
- **Pagos:** cada `lay_every_days`; aviso 2 días antes y el día; el cliente paga en la app («Pagar $X», on-session; Preguntas #11) o en la
  tienda (la tienda marca «Pagó en la tienda» → `waived` con nota, sin comisión). Atrasado 14 días → la tienda puede **cancelar el plan**:
  se devuelve lo abonado − `lay_cancel_pct` (devolución por `devolverPago`, repartida en los pagos capturados), la unidad vuelve al estante.
- **Terminó de pagar** → «Listo para recoger» → la tienda marca «Lo recogió» → `done`.
**Servidor:** `aceptarLayaway`, `pagarLayaway(userId, num, pm)`, `pagoEnTienda`, `cancelarLayaway(por, motivo)`, barrido `barrerLayaway`
(vencimientos y atrasos), todo con candado y `operation_events` (`lay_accepted`, `lay_paid`, `lay_late`, `lay_cancelled`, `lay_done`).
**Avisos:** `lay_abono`, `lay_pronto`, `lay_pagado`, `lay_atrasado`, `lay_cancelado` (con lo devuelto), `lay_listo`; al negocio `biz_lay_*`.
**Super Admin:** Transacciones › Apartados con su plan (pagado / falta / atrasado), Planes › comisión `apt` del layaway, cola de
cancelaciones disputadas. **Guardianes:** Σ pagos ≤ total; devolución = abonado − cargo exacto; ninguna unidad liberada con plan vivo.

### 4s · Reseñas, Ayuda (mercado y compra), Super Admin, avisos y documentación — Sonnet; ayuda con dinero Opus
- **Reseña Mercados** (`APP-NEG-RESENA`, `TLMercRev`): verificada = pedido `done`. Dato del pedido (no se edita): «Foto de cada peso» ·
  «N artículos · peso real» («TU PEDIDO · DATO DEL PEDIDO»). Preguntas: ¿ESTABA FRESCO? (Todo fresco · …) · ¿LA CAJA COBRÓ EL PRECIO DEL
  ESTANTE? · SI ALGO NO HABÍA (Me preguntaron · No hizo falta · Cambiaron sin preguntar) · TRATO (Con respeto · Normal · Mal trato); visitante
  también ¿PESARON DELANTE DE TI? · ¿COBRARON EL PESO REAL? (Sí · Cobraron más). **LO QUE IMPORTA EN UN MERCADO** (6 barras: PESARON DELANTE
  DE TI · COBRARON EL PESO REAL · FRESCO · PRECIO DEL ESTANTE = CAJA · SUSTITUCIONES CON TU OK · TRATO; «De N pedidos y compras calificadas…»);
  FRESCO fuera en licor · taba · vape · bota · pet · dollar · conv · agua · mayor; PESARON/COBRARON fuera si no pesa. Hechos: Pesaron
  delante / No pesaron delante · Cobraron el peso real / Cobraron más del peso · La caja no cobró el precio del estante · Cambiaron algo sin
  preguntar / Llamaron antes de sustituir · No estaba fresco. «VERIFICADAS POR COMPRA».
- **Reseña Tiendas** (`TLTiendaRev`): verificada = apartado `done`; dato APARTADO # · artículos · PAGASTE. Preguntas: ¿EL PRECIO DE LA CAJA FUE
  EL PUBLICADO? (Sí · Cobraron más) · ¿LO TENÍAN COMO DECÍA? · ¿LA TALLA O MEDIDA CORRECTA? (Sí · Más o menos · No) · ¿TE GUARDARON EL APARTADO?
  · CAMBIOS Y DEVOLUCIONES (Sin problema · No hizo falta · No quisieron) · TRATO. **LO QUE IMPORTA EN UNA TIENDA** (6 barras: PRECIO DE LA CAJA
  = EL PUBLICADO · LO TENÍAN COMO DECÍA · LA TALLA O MEDIDA CORRECTA · GUARDARON EL APARTADO · CAMBIOS Y DEVOLUCIONES · TRATO). Hechos: Precio
  de la caja = el publicado / Cobraron más en la caja · No lo tenían como decía · Guardaron / No guardaron el apartado · No aceptaron el
  cambio. «VERIFICADAS POR APARTADO». «¿QUÉ SERVICIO RECOMIENDAS? · Opcional. Sale en tu reseña.»
- Las dos: ≤2 ★ → «La reseña no devuelve dinero. Si el peso no cuadra, faltó algo o no estaba fresco, pídelo en Ayuda con el pedido.» /
  «…Si en la caja cobraron más o no guardaron tu apartado, pídelo en Ayuda con la compra.» → «Ir a Ayuda…».
- **Ayuda Mercados** `APP-NEG-MERC-AYUDA` → `-ESTADO` (`mhelp`; entradas: pedido `done`, «El peso no me cuadra» en `pesado`, reseña ≤2 ★):
  MOTIVO (El peso no cuadra · Faltó algo · No estaba fresco · Cambiaron algo sin preguntar · No cobraron el precio del estante · Llegó tarde ·
  Otra cosa) + ¿Qué pasó? ≥15 («Ej.: pedí 3 lb y la foto dice 2.6, pero me cobraron 3…») + ¿CUÁNTO? · OPCIONAL + Fotos · obligatorias en
  peso, faltó, fresco y precio («Del producto, la etiqueta o el recibo.»; «Compararemos tu foto con la foto de la balanza del mercado.») +
  ¿Qué quieres? (Que me devuelvan · Que me lo repongan «En tu próximo pickup o envío» · Solo quiero avisar) → RESPONDE EN 24 H → ACEPTÓ
  («Vuelve a tu tarjeta en 3–5 días hábiles.» / «Va en tu próximo pickup o envío, sin costo.») · PROPONE OTRA COSA («Devolverte $X») · NO
  ACEPTÓ («La foto de la balanza muestra el peso cobrado…») → «Pedir revisión a To'Latino» → EN REVISIÓN 48 h («Miramos la foto de la
  balanza, lo que pagaste y tus fotos.») → LISTO. Sin respuesta 24 h → To'Latino. Una abierta por pedido.
- **Ayuda Tiendas** `APP-NEG-TIENDA-AYUDA` → `-ESTADO` (`thelp`): Cobraron más en la caja · No guardaron el apartado · Talla o artículo
  equivocado · No aceptan el cambio · Llegó dañado · Otra cosa; «Ej.: la página decía $39 y en la caja cobraron $45…»; foto del recibo o del
  artículo obligatoria en cobros, cambio y daño; Que me devuelvan «Lo cobrado de más» · Cambiarlo «Por otra talla o artículo» · Solo quiero
  avisar; «Miramos el precio que la tienda publicó y tu recibo.» Dinero: Preguntas #12.
- **Super Admin:** Colas › Ayudas escaladas (motivos nuevos); Transacciones (Mercado, Apartados con tallas/envío/plan); Notificaciones (todas
  las plantillas nuevas ES/EN); Configuración (10 min aceptar, 10 min sustitución, 10 % extra, `hold_hours` permitidas, 14 días de atraso del
  layaway, 24/48 h ayuda — llega con Configuración, Fase 5); Analítica Mercados (% pedidos con foto de cada peso, estimado vs. cobrado, %
  sustituciones aceptadas, % no aceptados / vencidos, tiempo de aceptación, motivos de ayuda) y Tiendas (% apartados recogidos / vencidos,
  % falta talla, layaway terminados vs. cancelados, «precio de la caja = publicado»).
- **`docs/ayuda/`** (regla 9, ES/EN): `pedir-al-mercado` (carrito, estimado, franjas, EBT), `peso-real-y-balanza` (retenido + 10 %, foto,
  «Está bien», qué se libera y cuándo), `sustituciones`, `ayuda-con-el-pedido-del-mercado`, `apartar-en-tiendas` (amplía `apartar-productos`:
  tallas, horas, envío), `plan-de-pagos-layaway`, `ayuda-con-la-compra`, `ebt-y-edad` (dónde se usa el EBT, 21+); negocio:
  `tu-herramienta-mercados` (Balanza y pedidos), `tu-herramienta-tiendas` (Tallas y apartados), `panel-pesar-pedido`, `panel-productos`
  (editor de productos, tallas, por libra), `panel-layaway`.
- **Triángulo** (regla 8): cada toggle de Tu herramienta → ficha y Buscar (`summary`: «Pickup · envío $3.99 · mínimo $20.00 · EBT · efectivo ·
  2 agotados hoy» / «Aparta 48 h · layaway · cambios 30 días · efectivo · 3 tallas agotadas») → Super Admin lo ve y puede ocultar / pausar.

---

## 5. Página de categoría y ficha (lo específico)
Ya en código (`paginas.json`, `Categoria.tsx`, `buscar.ts`); aquí solo se conectan los derivados, la pestaña Productos y el pedido/apartado:
- **Mercados** (`TLMerc`): filas `que` «¿Qué buscas hoy?» (foto: Carne · Pescado · Víveres · Queso · Pan · Comida lista · Agua e hielo · Al por
  mayor → subcategorías), `pais` «De tu país» (`p:do p:mx p:ca p:sa p:car` → tags), `como` «Cómo compras» (Pickup · Envío a tu casa · Acepta
  EBT · Pesan delante de ti). 5 capítulos (`SUBG`: Tiendas · Carne, pescado y fresco · Productos de tu país · Bebidas · Otros; 30
  subcategorías). Grupos: ORDENAR · CÓMO COMPRAS (pickup, envio, pesa) · PAGO (ebt, efectivo, mayoreo) · DE TU PAÍS · CUÁNDO (domingo, noche,
  estac) · NEGOCIO (open, verified, r45, y10). `QUICK5`: open, pesa, ebt, envio, pickup. Stats «PESAN DELANTE DE TI». Tarjeta: `eta`
  («Pickup en 45 min · envío hoy $4.99»), `fee` («Pierna de cerdo $2.49/lb · la pesan delante de ti»), `offer` (de Novedades), CTA «Ordenar»
  / «Cómo llegar». Tipos (`TLMercK.kind`): super · carne · pesc · fruta · tortilla · pais · bodega · deli · mayor · agua · licor · taba · vape
  · bota · pet · dollar · conv · agric · queso; FAQ por tipo (se queda la del peso si pesa; `b.fq` y Tu página ganan): ¿Cortan como yo lo
  pida? · ¿El hueso y la grasa se cobran? · ¿Qué días llega el pescado fresco? · ¿Se pesa antes o después de limpiarlo? · ¿Puedo escoger el
  punto? · ¿Cada cuánto salen tortillas calientes? · ¿De qué países tienen productos? · ¿Hacen envíos de dinero? · ¿El EBT cubre el plato
  del día? (No: no cubre comida caliente) · ¿El precio es por caja? · ¿Tengo que devolver el botellón vacío? · ¿Piden identificación? (21+) ·
  ¿Llevan a la casa? (alcohol: No) · ¿Aceptan EBT? (por tipo).
- **Tiendas** (`TLTienda`): filas `que` «¿Qué buscas?» (Ropa · Tenis · Vestido de quince · Muebles · Celular · Ferretería · Juguetes ·
  Belleza), `como` «Cómo compras» (Aparta 48 h · Plan de pagos · Envío · Tallas grandes). 7 capítulos (52). Grupos: ORDENAR · CÓMO COMPRAS
  (apartado, layaway, envio) · PAGO (efectivo) · CUÁNDO (domingo, estac, tallas) · NEGOCIO. `QUICK5`: open, apartado, layaway, envio, domingo.
  Stats «APARTAN 48 H». Tarjeta: `eta` («Aparta 48 h · pagas en la caja», escrita por `apply()` con las horas reales), `fee`, `offer`.
- `pesa`, `apartado` y el «quedan N» son **derivados** (balanza declarada + productos por libra; Pro + horas; existencia real); se cachean,
  nunca se editan.

## 6. «Tu herramienta» (Panel › Lo que vendes, `dash2-cat.js blocksD`)
- **Mercados · «Balanza y pedidos»** (s: «Lo que va por peso se pesa delante del cliente y se cobra el peso real. Aquí pones el precio por
  libra y lo que se acabó hoy.»): CÓMO ENTREGAS Pickup / Envío a casa (toggles; «Deja al menos una forma.») · si envío: Costo del envío (−/+
  $0.50, 0–50; «Lo que paga el cliente por llevárselo a su casa.») y Pedido mínimo para envío (−/+ $5, 0–500; «Para pickup no hay mínimo.») →
  escriben `delivery_settings` · CÓMO TE PAGAN EN LA TIENDA: EBT / SNAP («Solo comida que no está caliente. No cubre alcohol, tabaco ni el
  envío.») · Efectivo · por cada producto `peso`: paso −/+ 10¢ «Por libra · se pesa delante» (cambia `items.price_cents`, auditado) · SE
  ACABÓ HOY · TOCA PARA QUITAR DE LA APP (AGOTADO HOY = `sold_out` hasta mañana) · REGLAS · NO SE APAGAN (3 con candado) + hueco #3 (cupo por
  franja) y «Si algo no hay» por defecto. `apply()` → tags pickup/envio/ebt/efectivo, `eta`, productos sin agotados y con el precio nuevo.
- **Tiendas · «Tallas y apartados»** (s: «Cuántas quedan de cada talla y cuánto tiempo guardas un apartado. Una talla en 0 no se puede
  apartar.»): GUARDAS UN APARTADO 24 h · 48 h · 72 h · Layaway · pagos para apartar («El cliente abona y se lo lleva al terminar de pagar.»)
  + hueco #6 (abono %, pagos, cada cuánto, cargo por no terminar) · Cambios con el recibo (−/+ 7, 0–90; «0 = no acepta cambios. Sale en tu
  página.») · PAGO Aceptas efectivo («La tarjeta siempre se acepta. El envío se cambia en Entrega.») · por producto con tallas: «Talla M · Se
  puede apartar / Agotada · no se aparta» (−/+ 1 → `item_variants.stock_left`) · REGLAS · NO SE APAGAN (2 con candado). `apply()` → tag
  layaway/efectivo, `eta` «Aparta {h} h · pagas en la caja», tallas en la ficha.
- En código: `retail_settings` + server actions en `app/panel/acciones-retail.ts`, `lib/retail.ts` (`TOOL_DEF`, `recalcularFiltrosRetail`);
  lo que ya enviaron los clientes **copia** precio, horas y condiciones (cambiar la herramienta no cambia un pedido o apartado vivo).

## 7. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md`)
1. **EBT / SNAP en la app.** El prototipo solo filtra y dice «paga en el mercado al recoger»; cobrar EBT en línea exige que cada mercado sea
   aprobado por el USDA para venta en línea y un procesador externo (pagado, fuera de PLAN §8). Default: **EBT solo en la tienda**: filtro,
   amenidad y pedido pickup con «Pagar en el mercado» (`pay_mode 'local'`, sin retención, el peso y la foto igual). Ítem en
   `LAUNCH-CHECKLIST` como decisión del fundador.
2. **El cliente no toca «Está bien, cobrar».** El prototipo no pone plazo. Default: recordatorio a los 10 min; se captura lo real (≤
   retenido) cuando el negocio marca Recogido/Entregado (el cliente está ahí y vio la foto); «El peso no me cuadra» abre Ayuda 7 días.
   Nunca se cobra más de lo retenido sin OK. Reversible por Configuración.
3. **Impuesto vs. «el precio que ves es el de la caja».** En PA la comida para la casa suele estar exenta, la comida lista y los artículos de
   limpieza no, y la mayoría de la ropa está exenta — **sin verificar**. El prototipo no muestra impuesto. Default: impuesto por producto
   desde `tax_rules` (datos, por ciudad y sección), sembrado exento en víveres y ropa, 6 % en `plato` y no-comida; la ficha muestra el total de
   la caja con el impuesto incluido. `LAUNCH-CHECKLIST`: validar con contador.
4. **Productos de 21+ (licor, cerveza y vino, tabaco, vape).** El prototipo deja pedir pickup en La Cumbre («Pickup en 15 min · 21+ con ID»).
   En PA el licor fuerte lo vende el estado (PLCB) y la venta en línea de tabaco/vape tiene reglas federales de verificación de edad — **sin
   verificar**. Default: **solo en la tienda** (catálogo con precio, sin pedir ni apartar, nunca envío), interruptor `age_orders` apagado en
   PlatformConfig; si se enciende: solo pickup, pago en la tienda y «Revisé la ID» obligatorio en el panel.
5. **Cupo por franja** (hueco #3). Default: `slot_cap` 6 pedidos por franja (pickup 30 min, envío 1 h), editable en Tu herramienta;
   reversible.
6. **«ANTES $X» y ofertas.** El prototipo pone `was` libre en el producto («ANTES $35», «Jeans 2 × $50»). Un precio «de antes» inventado es
   publicidad engañosa. Default: el «ANTES» y la oferta semanal salen **solo** de una Oferta de Novedades (`oferta_precio()`, con fechas, se
   cobra de verdad); «2 × $50» = oferta con texto, el servidor cobra el precio de cada unidad que dice la oferta.
7. **Sustitución con «Llámame».** Default: el panel muestra el teléfono, el negocio marca el resultado (aceptó / quitar) y queda en la línea
   de tiempo; si en 10 min no hay resultado, se quita y no se cobra (como «uno parecido» sin respuesta).
8. **Comisión del mercado.** Default: `fee_rules 'merc'` nueva sembrada en 10 % (= `ped`) para que el fundador la baje aparte (los márgenes del
   súper son menores que los de un restaurante); layaway en `apt` 6 %.
9. **Pedido mínimo y mayorista.** Default: el mínimo es solo del envío (MD DeliverySettings); el mayorista pone mínimo $100 de envío y «precio
   por caja»; pickup sin mínimo.
10. **Envío de Tiendas con «Apartar no cobra nada».** El prototipo dice «Al entregar $X». Default: envío de la tienda exige tarjeta: se
    **retiene** al confirmar la tienda, se cobra al marcar Enviado (correo) o Entregado (su camión); sin tarjeta, solo «Lo recojo en la
    tienda». Reversible.
11. **Pagos del layaway: ¿cobro automático?** Default: el cliente paga cada pago en la app (on-session) o en la tienda, con avisos; sin cargos
    automáticos fuera de sesión (el diseño no los pide). Cada 14 días, 4 pagos, abono 20 %, cargo 10 % (valores del prototipo). Las leyes de
    layaway por estado — **sin verificar**: el acuerdo por escrito aceptado es la red; `LAUNCH-CHECKLIST`.
12. **Devoluciones de Ayuda cuando se pagó en la caja.** El prototipo dice «Vuelve a tu tarjeta en 3–5 días hábiles», pero el pago de la caja
    (y el EBT) nunca pasó por To'Latino. Default (igual que fase4-salud-pro #4): lo cobrado en la app se devuelve por Stripe; lo pagado en la
    tienda lo devuelve el negocio («{negocio} te devuelve $X» → el cliente confirma «Me lo devolvieron»); To'Latino media y sanciona.
13. **Número del pedido del mercado.** El MD dice `#1051` para pedidos y el prototipo `M-6xxx`. Default: `M-` con su secuencia (se distingue en
    Transacciones y en la ayuda); reversible.
14. **Servicios dentro de Tiendas (lavandería, sastre, tintorería, estética canina).** `ALLOW` deja `svc`/`citas`, pero el diseño de Tiendas
    no trae Booking (solo «EN LA TIENDA · Cómo llegar» y «con cita» en texto). Default: catálogo con precio y «Cómo funciona»; sin Booking en
    esta fase; si un negocio lo pide, se usa el motor de citas de Belleza (3a–3c) sin código nuevo.
15. **Errores del prototipo a no copiar:** en `neg-tienda-rev.js` los subtítulos en inglés de «Cambiarlo» y «Solo quiero avisar» dicen «They
    send the corrected bill» / «Read by the clinic» (copiados de Salud) → se escriben bien. «Dollar Plus»/«La Económica» con EBT en limpieza:
    el EBT solo cubre comida (FAQ del propio prototipo).

## 8. Orden, dependencias y pruebas
4n → 4o → 4p (dinero) → 4q → 4r (dinero) → 4s. 4o/4q dependen de 4n (productos, tallas, settings); 4p reusa el pedido de Comida (2b–2c,
2f) y la liquidación de 4d; 4q amplía el motor de 4f-3 sin romper Auto/Hogar (prueba de regresión de sus apartados); 4r depende de 4q; 4s
depende de 4p/4q. Cada bloque: migración + semilla de pruebas (`is_test`, nunca en producción) + punta a punta en 9 dispositivos con la
`RESPUESTA` simulada igual que la barra del prototipo: Mercados «El mercado responde» (ok · rechaza → no · nada → «Pasan 10 min» → exp ·
cambio → falta un artículo y proponen otro · tarjeta → rechazada), «Lo pesaron», «Lo recogí» / «Llegó»; Tiendas «La tienda responde» (ok ·
rechaza · nada → «Pasan 48 h» · cambio → falta una talla · tarjeta → rechazada solo con abono), «Lo recogí»; Ayuda «El negocio responde»,
«Pasan 24 h», «To'Latino decide» — en la app eso lo hacen el panel y los barridos del servidor (SP «Pasos del servicio», «Plazos sin
respuesta»). Revisión de seguridad (regla 5) de 4n/4p/4r/4s antes de cerrar. Capturas teléfono + desktop de cada pantalla compuesta (§1) y
su línea en `docs/REVISION.md`.

## 9. Lista de cierre del grupo (todo marcado antes de decir «Mercados + Tiendas completos»)
- [ ] Migraciones 0064–0069 (0067 = envío de la tienda, 4q-2) aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI.
- [ ] Semilla 0019 solo en pruebas (guardián `semilla`); demos `demo-merc` y `demo-tienda` con pedidos, apartados, plan y reseñas.
- [ ] Editor de productos en el panel (por libra, tallas, plan, solo en la tienda, EBT, gravable) — ítem de `LAUNCH-CHECKLIST` cerrado.
- [ ] Tu herramienta de las dos guarda cada toque, refleja en ficha y Buscar y el Super Admin la ve (triángulo de las tres puntas).
- [ ] Pedido del mercado de punta a punta con tarjeta (retiene estimado + 10 %, pesa con foto, sustitución sí/no/sin respuesta, cobra lo
      real, libera el resto) y con «Pagar en el mercado» (EBT): cifras exactas en `payments` y en Stripe simulado.
- [ ] Apartado con tallas, horas 24/48/72, falta talla, envío, vencer; apartados de Auto/Hogar sin regresión.
- [ ] Layaway: acuerdo aceptado inmutable, abono, pagos, atraso, cancelación con cargo exacto, terminado y recogido.
- [ ] 21+ solo en la tienda y nunca en envío; EBT nunca en comida caliente ni no-comida (guardianes probados al revés).
- [ ] Reseñas verificadas con preguntas y «Lo que importa» de cada rubro; ayudas con motivos, fotos y escalado a To'Latino.
- [ ] Super Admin: Transacciones › Mercado y Apartados (tallas, envío, plan), Colas, Notificaciones, Analítica de las dos.
- [ ] Avisos nuevos ES/EN en `notif_templates` y su SMS donde va.
- [ ] `docs/ayuda/` completas (ES/EN) para cliente y negocio (§4s).
- [ ] Guardianes nuevos de §3 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes.
- [ ] Preguntas #1–#15 anotadas en `docs/REVISION.md` con «decidí X; si prefieres Y, se cambia»; lo diferido en `docs/LAUNCH-CHECKLIST.md`
      (EBT en línea, impuesto con contador, 21+, leyes de layaway, Configuración de plazos en Fase 5).
- [ ] `docs/PROGRESS.md` al día y `docs/REVISION.md` con los pasos para que el fundador lo mire en el sandbox.
