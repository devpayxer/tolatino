# Fase 6 · Eventos — plan de construcción extraído del prototipo (9 nov 2026)

Bloques **6a → 6j** (`6a`–`6j` no aparecen en `docs/PROGRESS.md`, `docs/REVISION.md` ni en el historial). Migraciones desde **0106** (la última es
`0105_configuracion_comunidad.sql`) hasta **0115**, una por bloque. Semillas de pruebas desde **0035** (la última es `0034_monedas_cupones.sql`).
Nada de este archivo se ha construido. Alcance = fila 6 de `docs/PLAN.md` (L212): «Publica tu evento → revisión · listado y detalle · boletos,
mesas, extras, códigos, cortesías · compra en nuestra hoja · boleto QR · **Puerta** (`/puerta`, varios porteros, sin conexión) · series · evento
privado · Panel: Eventos · Admin: Eventos y boletos». **D1 manda en todo el archivo: en la puerta no se vende; el portero solo escanea** (PLAN L51,
L89–90; MD L1111, L1126, L1136, L1210, L2060–2067). «Evento privado» = la solicitud de un grupo grande a un restaurante (pantalla `To'Latino Evento
privado.dc.html`, `evp-flow.js`, MD `PrivateEventSettings` L630 y estado L1958), **no** un evento solo con invitación (§6 #9). Esto es un resumen de
trabajo; manda el prototipo.

## 0. Fuentes
**Pantallas** (`docs/diseno/pantallas/`): **`To'Latino Eventos.dc.html`** (rutas `APP-EVT-BUSQ · NOCHE · LISTING · BOLETOS · PAGO · ORDEN · MIS`, cada
una móvil y desktop + sub-etiquetas «Boletos · tipos · mesas · extras · código», «Pago · nombres · método · resumen», «Orden · estado · recibo ·
calificar»; lógica L1076–1520: `bqVals` L1141 (secciones Esta noche · Este fin de semana · Más adelante, chips de fecha y tipo, «Publica tu evento»,
línea fija), `nvVals` L1178 (Esta noche como historias), `lsVals` L1205 (ficha oscura/clara por formato, series, varios días, estados cancelado ·
pausado · venta cerrada · cambió de fecha, RSVP con personas, lista de espera con oferta de 30 min), `cartCalc` L1275 y `tkVals` L1289 (cantidades,
máximo por persona, una mesa por orden, extras «solo con mesa», código, «te guardamos boletos y mesa por 8 minutos»), `pay` L1337 y `pyVals` L1347
(contador del apartado, nombres por boleto opcionales, tarjeta rechazada sin cobro, «SE COBRA AHORA»), `refund` L1395, `odVals` L1399 (pasos, QR,
mesa, cambio de fecha con «Me quedo» / «Devolución total», cancelado por el organizador, recibo, calificar), `msVals` L1462 (Mis boletos), `shVals`
L1485 (ayuda: reenviar, cambiar nombre, problema con el pago → `APP-EVT-AYUDA-PAGO` (encargo, hueco), cancelar «menos $3 de cargo»; transferir por
teléfono «hasta 2 h antes», «EL QR ANTERIOR QUEDA ANULADO»)). **`To'Latino Publica tu evento.dc.html`** (`APP-EVT-EDITAR`, lógica L105–: qué negocio
organiza (o «Mi negocio no está aquí» → `ONB-NEG-A1`), nombre ≤ 70, tipo, cartel, descripción ≤ 400, día (14), horas, puertas, dónde, entrada
`free · rsvp · tk` (sin `door`, D1), precio, cupo, edad; «Te falta»; enviado → «To'Latino lo revisa en 24 h y te avisa por SMS»; **cargo 8 % + $0.99
que paga el vecino y «Te pagamos al día siguiente»: choca con el panel, §6 #1–#2**). **`To'Latino Evento privado.dc.html`** (`APP-NEG-EVENTO-PRIVADO`:
3 pasos móvil / una página desktop; estados PENDIENTE · TE MANDARON SU PROPUESTA · TE PROPONEN UN CAMBIO · CONFIRMADO · NO PUDO · SIN RESPUESTA ·
CANCELADO). **`To'Latino Panel negocio v2.dc.html`** (`DASH-EVENTOS`, comentario L2348: «Fuente única = TLEvP»; `evSave/evPatch/evTag/evMiss/evDup`
L2350–2365, `evCalB` L2379 (calendario de 6 meses, serie, punto ámbar, gris = cerrado), `evDaysB` L2416 (horario por día), `evRefund/evCxDate/evBuyers`
L2913–2916, **`evView` L2940** (KPI vendido · mesas · órdenes · adentro · vistas · guardado; DINERO «Comisión To'Latino 5 % + $1 por boleto» · «Te
llega · A tu banco el martes después del evento»; AVISOS A LOS QUE VAN; compradores Todos · Por la app · Con mesa · Con extras · Cortesías · Adentro ·
Faltan; VENDIDOS POR DÍA; LISTA DE ESPERA «Avisar a la lista»; MESAS · QUIÉN LAS TIENE; CÓDIGOS; PORTEROS «Código de un uso»; REGLAS DE PUERTA
reentrada / pedir ID; quién se presenta solo esta fecha; FECHAS saltar / cancelar; VENTA pausar; cancelar con motivo «Mal tiempo · El artista no
puede venir · Problema en el local · Cambio de planes»), **`evEdit` L3011** (formato que no cambia con ventas, cartel y hasta 6 fotos, «Hacer cartel»
(hueco), EN «Traducir con El Compa», cuándo, dónde, entrada, cupo y personas por RSVP, «Contar en la puerta», boletos con precio «cargos incluidos»,
cantidad que «No baja de lo vendido», vale para día/pase, máximo por persona, «SE VENDE EN LÍNEA HASTA · EN LA PUERTA NO SE VENDE», aforo por día,
mesas «cada una se vende una vez», extras «solo con mesa», line-up, música ≤ 3, edad, ID, familias, vestimenta, cuidado de niños, «la comida se paga
en el local», «Antes de ir», «Así lo ve el cliente», reglas fijas «To'Latino cobra 5 % + $1 por boleto. Si cancelas, devolvemos todo. En la puerta no
se venden boletos: el portero solo escanea.»), `evCompDet` L3077 (cortesía: nombre, teléfono opcional, cuántas), `evCodeDet` L3082 (código
porcentaje / monto fijo, usos; «El descuento sale de lo tuyo»), **`doorDet` L3091** (modo puerta del panel: día, VÁLIDO · YA USADO HOY · ES DE OTRO
DÍA · NO ES DE ESTE EVENTO · TIENE MESA · ¿CUÁL LE DAS?, ADENTRO / FALTAN / RECHAZADOS, aforo, buscar por nombre o código)). **`To'Latino Super
Admin.dc.html`** `secEvt` L1005–1056 (pestañas Eventos · Buscar boleto · Modo puerta · Organizadores; KPI EVENTOS · A REVISAR SLA 24 h · BOLETOS EMITIDOS
· BRUTO BOLETOS «comisión 5 % + $1»; filtros En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados; boleto VÁLIDO · USADO · DEVUELTO ·
ANULADO · REEMITIDO con Reenviar por SMS · Reemitir · Anular con motivo; modo puerta en solo lectura «para disputas de "me cobraron y no entré"»;
organizador VERIFICADO / BLOQUEADO; ocultar del módulo; «Cancelar y devolver todo»). **`To'Latino Mi cuenta.dc.html`** (`USR-BOLETOS` / `USR-BOLETO`,
L398 «Toca el código para verlo grande. Sube el brillo», L561 «Si no hay señal, el código funciona igual», L573 «Pasar una entrada»). `To'Latino
Buscar.dc.html` (pestaña Eventos, «No hay eventos con ese filtro.»), `To'Latino Ciudad.dc.html` («lo que ves en Negocios, Eventos y Buscar»),
`To'Latino Compa.dc.html` («Tus boletos de eventos», Fase 7), `To'Latino Prototipo.dc.html` (pestaña Eventos de la ficha → `APP-EVT-LISTING`;
«Pedir evento privado»).
**Datos** (`docs/diseno/pantallas/datos/`): **`evt-data.js`** (TLEvt; hoy fijo jue 24 sep 2026 12:30; **«Precios CON cargos incluidos (línea fija del
módulo)»** L3; `POL_PAGO` L7 y `POL_GRATIS` L9; `E` L11–128: 24 eventos de Hazleton con `tks` (`left`, `dy` por día), `mesas` (`seats`, `min`,
`dep`), `adds` (`mesa: true`; **«Botella premium», «Hookah»: §6 #4**), `lu`, `rep` (`w` · `m`), `span` + `dh` + `dcap`, `cap`, `party`, `chkOn`,
`kids`, `payAt`, `before`, `dress`). **`dash2-evt.js`** (TLEvP, fuente única: `FMT` L10–21 — `noche · comida · clase · fe · comunidad` con sus campos y
palabras; `CAT` L22 formatos por categoría; `toPanel`, `fresh`, `calc` L57 (vendido, quedan, bruto, agotado, estado con lo del admin; `oid` = una
fecha de la serie), `occ` L72 (series `none · w · 2w · m`, `n` ≤ 52, `skip`, `MAXD` 180 días, «el último» del mes), `repL`, varios días seguidos
2–30 con pase y boleto por día, `perDay` L90, `toClient` L93, `sync` L105). **`evp-flow.js`** (TLEvp: ocasiones, áreas + «Todo el local», menús,
presupuesto por persona, extras, `quote()` con impuesto 6 %, depósito `evpDep` 25 %, cancelar gratis `evpCx` 72 h, propuesta válida 24 h, sin
respuesta en 24 h = vence). `adm-data.js` (`QUEUES` L74 `evt` «Eventos a revisar» 24 h; `evtNo` L93 motivos de rechazo; disputa DP-121 L158 «Boletos
comprados dos veces»; `tickets(eid)` L223 código `TL-XXX-0000`; permisos por rol L62–66 `evt`). `dash2-data.js` (`BIZ.events`, porteros
`['Portero · Junior', 'scan']`).
**Modelo** (`docs/diseno/entrega/modelo-datos.md`): Reglas L9–22; §8 Eventos L1109–1213 (Event, TicketType, EventTable, EventAddOn, Ticket, Rsvp,
DoorStaff, CheckIn); Operation L826 (kind `tickets`, número `B-9401`); Payment / Refund / FeeRule §7; Favorite L727; Notification L755; estados Evento
L1857, Boleto L1875, Dinero de una operación, **Evento privado L1958**; `PrivateEventSettings` L630; **D1 L2060**, D5. **Solo prototipo**
(`solo-prototipo.md`): «Boletos apartados» L245–249 (lo lleva el servidor), «Día del evento» L257–261 (avanza con la fecha y con el escaneo), respuesta
simulada del evento privado L117.
**Plan:** `CLAUDE-plan.md` L877–946 (Módulo 3 Eventos: motor de boletos, boleto con estado, modo puerta, add-ons = motor de variantes y extras,
alcance de pantallas), L1213–1236 (cuatro apps; check-in solo app), L1300–1310 (faseo: check-in sin conexión en v1.1 — **superado por PLAN L212 y
la decisión T #23**), L1374 (sin venta en la puerta); **`apps-delivery-checkin.md` Parte 2 L156–254** (`CHK-ONB`, `CHK-SCAN`, `CHK-BUSCAR`,
`CHK-LISTA`, `CHK-AFORO`, `CHK-MESAS`, `CHK-PUERTA` **fuera por D1**, `CHK-INCID`, `CHK-EQUIPO`, `CHK-CIERRE`, sin conexión, varios porteros, espejo en
DASH, ADM y USR); `flujos-transversales.md` L59–73 (avisos: boleto comprado, evento mañana, cambio/cancelación; negocio: venta, aforo 90 %; portero:
asignación y apertura), L249–255 (reportar evento, compartir con QR); `admin-dashboard.md` ADM-EVT L174–186, cola 12 L97, alertas L74 («evento con
sobreventa»), fraude L291 («boletos duplicados»); `admin-implementacion.md` L74, L102; `onboarding-negocios.md` L336 (**Eventos: Free no, Pro sí**,
§6 #5); `pantallas-iniciales.md` L45–47, L107, L157 (eventos aliados y comunitarios, «Publica el primer evento»); `revision-estructural.md` B2
L102–106 (modo puerta en línea primero), C5 L155–158 (pagar en la puerta: **superado por D1**). `docs/PLAN.md` L51, L89–90, **L212**, §3.3 (pagos
en nuestra hoja), §5 (guardianes), §8 (Stripe ya en la lista). `docs/HERRAMIENTAS.md` #20 (guardián del dinero), **#23 (modo sin conexión en Puerta
y Repartidor)**. Fase 4 · Noche: `fase4-noche.md` L79 («La lista de esta noche en la puerta … en la Fase 6 la absorbe la app Puerta»), L86 y §6 #10
(noches especiales `k evento` con `event_id`), L66 y L108 (la app no vende tragos, botellas ni hookah).
**Memoria** (`docs/diseno/referencia/memoria-del-diseno.md`, solo grep): MEM 35 y 1034–1036 (D1 aplicado), 207–208 (pendientes: el portero real usa
la app de check-in, «sin pantalla en el prototipo»; cortesías vendidas a promotores; el admin no edita el formato), 321–369 (Eventos revisado 25 oct:
fuente única, formatos, ficha del panel, series, varios días, manejar un evento creado), 432–435 (comisiones: boletos 5 % + $1; pagos al banco
**cada martes**; boletos el martes después del evento; devuelto después de pagado resta al martes siguiente), 520–522 (lista de espera real, ventas
por día, mesa en la puerta), 616–618 (ADM-EVT), 829–838 (P7 evento privado), 1360–1363 (la pestaña Eventos de la ficha solo replica), 1702–1731
(Eventos v2: pantallas). Decisiones que mandan: `docs/DECISIONES.md` B (cuatro apps: To'Latino Puerta «portero, solo escanea»), E (SMS se paga),
O, P, Q, R, T (#23 sin conexión), U, AA, AB, Z; D1 y D5 (MD). Plantilla: `fase5-comunidad.md`.

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| `operations.kind` ya admite `'tickets'` y `'private_event'`; `operation_lines`; `operation_events` (línea de tiempo) | 0023, 0053 | La compra de boletos y el evento privado son operaciones; Mi cuenta, Panel › Hoy y Transacciones leen lo mismo |
| `fee_rules` `'bol'` = **500 bp + 100 ¢** (5 % + $1) sembrado; `lib/cobros.ts` `comision(c, "bol", subtotal, n)` | 0034 L39, `lib/cobros.ts` L15 | La comisión de boletos ya existe y la edita Planes; nada de comisión escrita en el código |
| `payments` (`full`, `card`, captura, `refunded_cents`), `refunds` (**`initiated_by 'event_cancelled'` ya existe**, `fee_absorbed_by`), `payment_methods`, `stripe_accounts`, `sim_intents` | 0034 | Cobro, devolución parcial por boleto y devolución total al cancelar |
| `lib/pagos/pasarela.ts` (`retener` captura manual, `cobrar`, `liberar`, `devolver`, `cobrarFuera`, simulador `pm_sim_*` con 0002 / 9995 / 0069; candado: el simulador no existe en producción) · `lib/cobros.ts` (`tarjetaDe`, `registrarRetencion`, `devolverPago`, `repararPagos`) · `app/(app)/pago/MetodoPago.tsx` | 2d | **Compra en nuestra hoja** (PLAN §3.3) contra el simulador; se suman «cargo de la plataforma» y «transferencia al organizador» (§3, §6 #2) |
| `lib/disputas.ts` + cola `disputa` (evidencia con `evidenciaStripe`) | 2i | Contracargos de boletos (DP-121 de `adm-data.js` L158): la evidencia sale de los escaneos en la puerta |
| `lib/reservas.ts`, `lib/fiestas-reservas.ts` (retener / cobrar / devolver por regla de plazo, `barrerFiestas`), `lib/estimados.ts` + `app/panel/Estimado.tsx` (propuesta línea por línea) | 2e, 4v, 4b | Evento privado: propuesta del negocio → aceptar y pagar el depósito → cancelar gratis hasta 72 h |
| `lib/noche-reservas.ts` (lista con código de 4 cifras, mesa / VIP con depósito, `mesasSinSobreventa` con `pg_advisory_xact_lock`), `lib/noche-publico.ts` (las noches especiales `k evento` **no salen hasta la Fase 6**, L9), `app/panel/Servicios.tsx` L123–127, L261 («Se publica cuando abra Eventos») | 4na–4nd | El servicio `evento` gana su `event_id` y abre la página del evento; la lista de la noche y las mesas entran a `/puerta` (fase4-noche L79) |
| `lib/repartidor.ts` (invitar por nombre + teléfono → código de 7 días → la persona entra con **su cuenta** y acepta; quitar con motivo; `delivery_drivers`) · `app/repartidor/` | 2l | **Patrón de los porteros** (invitar, aceptar, revocar) y de la app de una sola tarea |
| `lib/panel.ts` `accesoPanel(negocio, parte)` (parte `evt` del diseño: `['DASH-EVENTOS', …, 'evt']`), `business_members.panel_access`, módulo `eventos` en `business_modules` (0003 L6, L90) y en los módulos por defecto de Noche, Comida, Fiestas… (0004) | 1h, 0003–0004 | Quién del equipo maneja Eventos; Pro / Free por módulo |
| `favorites.kind` ya admite `'event'` | 0008 L223 | «Guardar» (corazón) de un evento; USR-FAVORITOS «eventos» |
| `business_posts` (Novedades) + Hoy en el barrio (5e) | 0028, 0101, `lib/hoy.ts` | Una novedad con enlace a un evento sale en Hoy (LAUNCH L295 «Evento como tipo y como botón») |
| `queue_items` + `lib/colas.ts` (`ORDEN_COLAS`) + `Colas.tsx`; `admin_sections` ya tiene `evt` (en el menú como «Fase 6», `lib/admin-nav.ts` L9) | 0016, 1i | Cola `evt` 24 h y la sección Eventos y boletos |
| `notifications` + `notif_templates` + `lib/avisos.ts` (`avisar`, `avisarMuchos`, `avisarNegocio`) | 2j, 5i | Plantillas `evt_*`, `bol_*`, `rsvp_*`, `puerta_*`, `evp_*` ES/EN |
| `lib/config.ts` (`valor`, `cfgSql`, `cambiarConfig` con límites y auditoría) + `config_keys` | 5i (0105) | **Todo plazo y límite nuevo de la fase es una clave** (§2 0115); el guardián `configDesdeUnLugar` ya vigila |
| `lib/barrido.ts` `barridoCentral` (cada minuto, `system_jobs`) | 0078 | Tareas nuevas: apartados que vencen, RSVP que vencen, lista de espera, evento que terminó, recordatorio del día antes, liquidación del martes, paquetes de puerta que vencen |
| `lib/resenas.ts` (`opParaResena`, reseña verificada) | 2g | «¿Cómo estuvo?» del boleto usado → reseña verificada del organizador (§6 #15) |
| `lib/ayuda.ts` + `lib/ayuda-motivos.ts` (`NUM` por prefijo, guardián `prefijosAyuda`) | 2h | Ayuda con la orden de boletos (`APP-EVT-AYUDA-PAGO`, hueco #3): prefijo `B-` |
| `lib/cifrado.ts` | 4eb | Teléfono de una cortesía o de una transferencia a quien aún no tiene cuenta, cifrado |
| `lib/traduccion.ts` + servicio `traductor` (LibreTranslate propio, 5h) | 5h | «Traducir» el título y la descripción del evento al inglés en el editor (sugerencia que el negocio edita), hasta El Compa (Fase 7) |
| `lib/buscar.ts` (pestañas, GIN), `lib/ciudad.ts`, `app/(app)/Inicio.tsx` | 1d, 5e | Pestaña Eventos de Buscar (LAUNCH L92), «Eventos de la semana» en Inicio, cifra de eventos en el radio de Ciudad (LAUNCH L68) |
| `packages/ui`: `cards/EventCard.js`, `cards/EventPromo.js`, `cards/StoryCard.js`, **`cards/TicketQR.js` (2ac: hoy dibuja un QR de muestra desde `seed`)**, `booking/PartyPicker.js`, `booking/PaymentSummary.js`, `panel/Bloques.tsx` (ya trae `evbuy`, `kpis`, `rows`, `chips`, `search`, `timeline`, `rvsum`…) | Fase 0 | Pantallas del cliente, panel y admin. **Faltan en `Bloques.tsx`** los bloques del panel de eventos que sí están en `Panel negocio v2.dc.html`: `evrow`, `evhd`, `cal`, `chart` (se portan de ahí, no se inventan) |
| Lugares que esperan esta fase: `app/(app)/eventos/page.tsx` (`Pronto` «Fase 6»), `lib/admin-nav.ts` L9, `lib/noche-publico.ts` L9, `app/panel/Servicios.tsx` L123/L261, `app/(app)/cuenta/page.tsx` L13 («boletos no se muestra»), `cuenta/avisos/Avisos.tsx` L4; LAUNCH-CHECKLIST L43, L68, L85, L92, L108, L219, L295, L320, L355, L482 | — | Se encienden con datos reales |
| Guardianes `dineroDelServidor`, `retencionPorTarjeta`, `tarjetaEnServidor`, `simuladorAislado`, `transaccionEnFila`, `operacionesConTipo`, `devolverCoincide`, `reparaVivas`, `barridoCompleto`, `accionesConAcceso`, `servidorSoloFunciones`, `auditoriaLegible`, `colaConVista`, `avisoConPlantilla`, `alcoholNoSeVende`, `codigoPuerta`, `sinImagenDeID`, `sinFechaDeNacimiento`, `libroSoloInsercion`, `configDesdeUnLugar`, `configConLimites`, `analiticaSinPersonas`, `eventosEnLista`, `semilla`, `idioma`, `rutasVivas` | `guardianes/run.mjs` | Se reusan (algunos se amplían) y se suman los de §3 |

**Choque de nombre (técnico):** `apps/web/lib/eventos.ts` y la tabla `app_events` son la **analítica propia** (eventos de la app, guardián
`eventosEnLista`). El código de esta fase usa `lib/evt*.ts`, `lib/boletos*.ts`, `lib/puerta*.ts` y `lib/evento-privado.ts`; las tablas se llaman `events`,
`event_dates`… (como el modelo). `lib/eventos.ts` no se toca salvo para sumar los nombres nuevos a su lista cerrada.

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
El **cliente** (módulo, ficha, boletos, pago, orden, mis boletos), el **panel** (crear, editar, manejar, modo puerta) y el **Super Admin** (Eventos y
boletos) están diseñados. **No hay:**
1. **La app Puerta (`CHK-*`)**: «el portero real usa la app de check-in (CHK, sin pantalla en el prototipo)» (MEM 207). Se compone con los bloques del
   modo puerta del panel (`doorDet` L3091: resultado, KPI, buscar, mesas) a pantalla completa y oscuro, siguiendo la estructura de
   `apps-delivery-checkin.md` §2.3 (Escanear · Buscar · Lista · Aforo · Mesas · Incidencias · Equipo · Cierre), sin `CHK-PUERTA` (D1).
2. **Aceptar la invitación de portero** (el panel crea «Código de un uso»; la otra punta no existe): se compone con el patrón del Repartidor (2l).
3. **`APP-EVT-AYUDA-PAGO`** (es un `encargo` en `shVals` L1485): se compone con Ayuda con el pedido (2h), prefijo `B-`.
4. **Recibir un boleto transferido** (el SMS lleva un enlace; qué ve quien lo recibe, sobre todo sin cuenta): se compone con Entrar (0c) + `TicketQR`.
5. **Responder un evento privado en el panel** (el prototipo lo manda a la cotización genérica, `dashLive` `evps: 'cot'`; `Panel negocio v2` no tiene
   `evp`): se compone con `Estimado.tsx` (propuesta línea por línea) y los ajustes del evento privado en Panel › Reservaciones.
6. **Incidencias en la puerta** (`CHK-INCID`) y **cierre de la puerta** (`CHK-CIERRE`): solo descritos en texto.
7. **«Hacer cartel»** (botón del editor sin diseño): no se construye; se sube la foto (§6 #19).
8. **Catálogo de formatos y géneros en el Super Admin** (admin-dashboard L186; MEM 208 «el admin aún no edita el formato»): se compone con Catálogo.
9. **Señales de reventa y boletos duplicados** en Confianza (admin-dashboard L183, L291): se compone con Fraude (5d).
10. **Agregar a Apple Wallet / Google Wallet** (apps-delivery-checkin §2.4): sin diseño y requiere la cuenta de Apple Developer → Fase 8 (§6 #17).
Se compone con piezas existentes (`rows`, `kpis`, `chips`, `search`, `note`, `step`, `acts`, tabla densa, cola con SLA, confirmación con motivo; patrones
p11–p18) y cada pantalla compuesta va a `docs/REVISION.md` con su captura (teléfono y escritorio; la Puerta solo teléfono, apps-delivery-checkin L3).

### 1c. Tesis y líneas fijas (verbatim; nunca se suavizan)
- **Línea del módulo** (`bqVals`, `lsVals`, `pyVals`, recibo): **«El precio que ves es el que pagas: cargos incluidos.»** / «The price you see is what
  you pay: fees included.»; en el pago: «CARGOS INCLUIDOS · NADA MÁS EN LA PUERTA» / «FEES INCLUDED · NOTHING EXTRA AT THE DOOR».
- **Gratis:** «NO SE COBRA NADA: TU RSVP SOLO GUARDA TU LUGAR.» / «NOTHING IS CHARGED: YOUR RSVP ONLY HOLDS YOUR SPOT.» y `POL_GRATIS` (L9).
- **D1:** «La venta en línea cerró · En la puerta no se venden boletos.» (cliente) y «En la puerta no se venden boletos: el portero solo escanea.»
  (reglas fijas del editor). Ningún botón, estado ni texto de «pagar en la puerta» (`entry` sin `door`).
- **Política de pago** (`POL_PAGO` L7): «Devolución total si el evento se cancela o cambia de fecha y no puedes ir. Si cancelas tú: se devuelve el
  boleto menos el cargo de servicio. Puedes transferir tus boletos hasta 2 h antes.» (los plazos salen de Configuración, §6 #6).
- **Mesa:** «El depósito aparta tu mesa y se descuenta de tu consumo esa noche.» · «SE VENDEN UNA SOLA VEZ».
- **Cancelado:** «Si compraste, te devolvemos todo en 3–5 días hábiles. No tienes que hacer nada.»
- **El QR:** «Tu QR es la entrada; no hace falta imprimir.» · «Si no hay señal, el código funciona igual.» · al transferir «EL QR ANTERIOR QUEDA
  ANULADO».
- **Evento privado:** «Nada se cobra hasta que aceptes su propuesta. Al aceptar, se cobra el depósito y se descuenta del total.»
**Lo que el prototipo hace de verdad** (y lo que no): los boletos se cobran al comprar; la mesa se paga con depósito; el apartado de 8 min, la lista de
espera de 30 min y el «día del evento» los lleva el servidor (SP L245–261), no el navegador; el código `TOLATINO5` (L1283) es de demostración (§6 #13);
el QR de `TicketQR` es de muestra; `going`, `sold0`, `views`, `likes` y los compradores «de ejemplo» de `evBuyers` son inventados y **no** se copian
(derivados de verdad); `tl-evt-v2`, `tl-evt-pub-v1` y `tl-adm-v1.evt` en localStorage no son base.

---

## 2. Cambios de datos (migraciones 0106 → 0115, una por bloque; nada se borra; `city_id` en todo lo nuevo; solo el servidor lee y escribe)

**0106 `eventos_base` (6a)**
- **`event_formats`** (`key` pk `noche · comida · clase · fe · comunidad`, `label {es,en}`, `dark bool`, `fields jsonb` = lo de `FMT` L10–21: qué campos y
  qué palabras trae cada uno, `ages smallint[]`, `on`) · **`event_format_categories`** (`category_id`, `format`; semilla = `CAT` L22; resto → `comunidad,
  clase`) · **`event_genres`** (`key`, `label {es,en}`, `sort`, `on`; semilla `GEN`). Catálogo editable desde el Super Admin (hueco #8), con auditoría.
- **`events`**: `id` identity, `slug` (único por ciudad), `city_id` (la del lugar: la del negocio o la del otro lugar dentro del radio de una de las 5;
  fuera = no se publica), `business_id` (organizador, obligatorio), `format`, `title {es,en}` 3–70, `description {es,en}` ≤ 400, `genres text[]` ≤ 3,
  `min_age smallint check in (0, 12, 18, 21)`, `id_required bool`, `reentry bool`, `dress_code {es,en}` ≤ 80, `kids check in ('fam','care')` null,
  `food_paid_at_venue bool`, `before_you_go jsonb` (≤ 6 × {es,en} ≤ 120), `venue_mode check in ('own','other')`, `venue_name`, `venue_address`, `geom
  geography(Point)` (el del negocio o geocodificado con el Nominatim propio), `zone_id`, `poster_media_id` + galería (`media.owner_kind 'event'`, que ya existe en
  0008; ≤ 6, EXIF y GPS fuera), `entry check in ('free','rsvp','tickets')` (**sin `door`, D1**), `rsvp_capacity` (0 = sin límite), `party_max` 1–10, `door_count
  bool`, `doors_before_min check in (0,30,60)`, `sales_until check in ('start','doors','day_before')`, `max_per_person` (null = sin límite del negocio;
  el tope de la plataforma va en Configuración), `kind check in ('single','series','span')`, `rep jsonb` ({k `w|2w|m`, days, n ≤ 52}), `span_days` 1–30,
  **`status check in ('draft','review','changes','live','paused','cancelled','rejected','done')`** (agotado es derivado, no estado; MD L1857),
  `hidden_at` / `hidden_by` / `hidden_reason` (ocultar del admin aparte, para que restaurar devuelva el estado), `review_note`, `submitted_at`,
  `approved_at` / `approved_by`, `cancel_reason`, `cancelled_at` / `cancelled_by check in ('business','admin')`, `version int` (sube con cada cambio
  que importa), `tsv tsvector` generado (unaccent, título ES/EN + lugar + géneros), `created_by`, `created_at`, `updated_at`. Índices `(business_id,
  status)`, GIN `(tsv)`, `(city_id, status) where hidden_at is null`.
- **`event_dates`** (una fila por fecha: un evento simple tiene una; una serie, una por fecha; varios días, una por día con `day_index`): `id`, `event_id`,
  `city_id`, `starts_at`, `ends_at`, `doors_at` (timestamptz; la hora que pasa de medianoche ya es del día siguiente, como Noche), `local_date` (de la zona
  de la ciudad), `day_index`, `status check in ('scheduled','skipped','cancelled','done')`, `cancel_reason`, `lineup_override jsonb` («solo esta fecha»),
  `day_capacity` (aforo por día de `dcap`), `geom` (copia para el GIST), **`listable bool`** derivado por trigger (evento `live`/`paused`, sin ocultar,
  fecha `scheduled`), derivados por trigger, **nunca editables**: `sold_n`, `rsvp_n`, `going_n`, `inside_n`, `entered_n`. Índices **`(city_id,
  starts_at, id) where listable`**, GIST `(geom) where listable`, `(event_id, starts_at)`, único `(event_id, starts_at)`.
- **`event_lineup`** (`event_id`, `day_index`, `at_min` (minutos desde el inicio del día; puede pasar de 1440), `who` ≤ 60, `role {es,en}` ≤ 60, `sort`).
- **`event_review_log`** (**solo inserción**): `event_id`, `version`, `decision check in ('submitted','approved','changes','rejected','resubmitted')`,
  `reason_key` (de `evtNo` L93 + «otro»), `note`, `by`, `at`, `snapshot jsonb` (lo que se revisó).
- **`event_organizers`** (`business_id` pk): `verified_at` / `verified_by` (publica sin revisión previa, §6 #3), `blocked_at` / `blocked_by` /
  `blocked_reason` (Organizadores del admin: «Bloquear publicación» con motivo, aviso y apelación).
- `queue_items.queue` suma **`'evt'`** (SLA 24 h; roles admin y ciudad, `adm-data.js` L74); `admin_sections` `evt` pasa a `HECHAS`.
- Plantillas `evt_revision` (negocio: «Tu evento está en revisión»), `evt_aprobado`, `evt_cambios` (con lo que falta), `evt_rechazado` (motivo +
  apelar), `evt_bloqueado` — push + SMS solo `evt_aprobado` y `evt_rechazado` (lo dice Publica: «te avisa por SMS»).
- Claves (`config_keys`, sección `eventos`): `evt_revision_h` 24, `evt_fechas_max` 52, `evt_dias_adelante` 180, `evt_fotos_max` 6, `evt_dias_seguidos_max`
  30.

**0107 `eventos_publico` (6b)** — **`rsvps`** (`id`, `event_date_id`, `city_id`, `user_id`, `party` 1–`party_max`, `status check in ('going','cancelled',
'expired','attended')`, `hold_until` (= puertas + `rsvp_guarda_min`), `door_code` 6 caracteres (para la puerta; nunca en vistas públicas ni avisos),
`created_at`, `updated_at`; único vivo `(event_date_id, user_id) where status = 'going'`; índice `(user_id, created_at desc)`). El cupo se cuenta con
`event_dates.rsvp_n` (`check (rsvp_capacity = 0 or rsvp_n <= rsvp_capacity)` vía trigger con la fila del evento bloqueada). `business_posts.link_kind`
suma **`'event'`** + `event_id` (novedad con «Ver evento»; sale en Hoy en el barrio). `app_events.name` suma `ver_evento`, `rsvp`, `guardar_evento`,
`compartir_evento`. Plantillas `rsvp_ok`, `rsvp_recordatorio` (el día antes, push), `rsvp_vence`, `evt_guardado_cerca` (un evento guardado es mañana,
push). Clave `rsvp_guarda_min` 30.

**0108 `boletos_venta` (6c)**
- **`ticket_types`**: `id`, `event_id`, `name {es,en}` ≤ 40, `note {es,en}` ≤ 80, `price_cents` (lo que paga el cliente, **cargos incluidos**; ≥ 100),
  `quantity` (no baja de lo vendido: trigger), `valid_day` (null = pase de todos los días), `sales_end_at` (preventa), `off bool` («apaga uno para dejar
  de venderlo»), `sort`.
- **`ticket_stock`** (`ticket_type_id`, `event_date_id`, `quantity`, `sold_n`, `held_n`; **`check (sold_n + held_n <= quantity)`**; pk compuesta): en una
  serie cada fecha tiene su existencia (`calc(r, oid)` L57); en varios días el boleto de un día cuenta en su día y el pase en el día 0, y el aforo por día se
  cuenta aparte (`event_dates.day_capacity`).
- **`event_tables`** (`zone {es,en}`, `seats` 1–20 = entradas incluidas, `min_spend_cents`, `deposit_cents` > 0, `quantity`) + **`table_stock`** (por fecha;
  mismo `check`) — «cada una se vende una vez».
- **`event_addons`** (`name {es,en}`, `desc {es,en}`, `price_cents`, `table_only bool`, **`kind check in ('detalle','material','servicio','otro')`** —
  sin alcohol ni hookah, §3 y §6 #4 —, `quantity` null = sin límite, `sold_n`).
- **`discount_codes`** (`event_id`, `code` `^[A-Z0-9]{3,16}$` único por evento, `kind check in ('pct','amount')`, `value`, `uses_max`, `used_n` derivado,
  `status check in ('on','off')`, `created_by`); el descuento sale de lo del organizador (`evCodeDet`).
- **`ticket_holds`** (`id uuid`, `user_id`, `device`, `event_date_id`, `lines jsonb` (tipos, mesa, extras, código), `expires_at` (= ahora +
  `evt_apartado_min`), `status check in ('held','converted','expired','released')`, `operation_id`, `created_at`): crear un apartado sube `held_n` en la
  misma transacción; vencer, soltar o convertir lo baja.
- **`tickets`**: `id`, **`code`** único (`TL-XXX-0000`, alfabeto sin 0/O/1/I), `event_id`, `event_date_id` (la fecha; en varios días, la del día que vale o
  el día 0 si es pase), `valid_days smallint[]`, `ticket_type_id`, `table_id`, `operation_id`, `holder_user_id`, `holder_name` ≤ 40 (opcional, «Nombre en
  cada boleto»), `admits` (1, o `seats` de la mesa), `kind check in ('paid','comp')`, `price_cents`, `fee_cents` (la comisión de ese boleto, copiada),
  `discount_cents`, **`status check in ('valid','used','void','refunded','replaced')`** (MD L1875), `qr_ver int` (sube al transferir o reemitir: el QR
  viejo deja de entrar), `replaced_by`, `void_reason`, `city_id`, `created_at`. Índices `(event_date_id, status)`, `(holder_user_id, created_at desc)`,
  `(operation_id)`, `(code)`.
- **`qr_keys`** (`kid` pk, `public_key` (Ed25519), `created_at`, `retired_at`): **solo la llave pública** vive en la base; la privada está en los secretos
  del entorno (una por entorno; regla 1) y la lee solo `lib/boletos-qr.ts`.
- Número de la orden `B-9401…` (secuencia; MD L833). `payments` de la orden: `full`, capturado al comprar, con `transfer_group` del evento (§3).
- Plantillas `bol_comprado` (push + correo con recibo; sin SMS: los boletos viven en la app), `bol_recordatorio` (el día antes y «¡Es hoy!»), `evt_venta`
  (negocio, agrupado), `evt_aforo90` (negocio). Claves `evt_apartado_min` 8, `evt_boletos_por_orden_max` 10, `evt_boletos_persona_fecha_max` 20.

**0109 `boletos_comprador` (6d)** — **`ticket_transfers`** (`id`, `ticket_id`, `from_user_id`, `to_phone_enc` + `to_phone_hash`, `claim_token` (un uso,
hash guardado), `status check in ('pending','claimed','cancelled','expired')`, `new_ticket_id`, `expires_at` (= inicio − `bol_transferir_h`), `created_at`,
`claimed_at`); **cortesías** = `tickets.kind 'comp'` + `comp_name` ≤ 40, `comp_phone_enc`, `comp_by` (cuentan como boleto en la puerta y en el aforo,
`evCompDet`); **`waitlist`** (`event_date_id`, `user_id`, `party`, `status check in ('waiting','offered','converted','left','expired')`, `offered_at`,
`offer_expires_at` (= `espera_oferta_min`), `created_at`; posición derivada por `created_at`); `refunds.initiated_by` suma **`'buyer'`**; ayuda con la
orden prefijo `B-` (`help_requests` de 0031). Plantillas `bol_transfer_in` (**SMS**: es la entrega del boleto a otra persona), `bol_transfer_ok`,
`bol_cortesia` (**SMS**), `espera_lugar` (**SMS**: «tienes 30 min»), `bol_cancelado`, `bol_devuelto`. Claves `bol_transferir_h` 2, `bol_cancelar_h` 24
(§6 #6), `espera_oferta_min` 30, `evt_cortesias_max` 50, `bol_transferencias_dia_max` 10.

**0110 `eventos_cambios_dinero` (6e)**
- **`event_changes`** (**solo inserción**): `event_id`, `event_date_id`, `kind check in ('paused','resumed','moved','time_changed','venue_changed',
  'cancelled','date_cancelled','date_skipped','lineup_changed')`, `before jsonb`, `after jsonb`, `reason_key` (Mal tiempo · El artista no puede venir ·
  Problema en el local · Cambio de planes · admin), `note`, `by`, `by_kind check in ('business','admin')`, `at`.
- **`event_notices`** (**solo inserción**): `event_id`, `event_date_id`, `text` ≤ 160 + `lang`, `by`, `sent_n`, `at` (AVISOS A LOS QUE VAN; el último sale
  primero en «Antes de ir»).
- **`ticket_choices`** (`operation_id`, `change_id`, `choice check in ('keep','refund')`, `at`): «Me quedo con la nueva fecha» / «Devolución total».
- **`event_settlements`** (lo que se le paga al organizador por fecha): `event_date_id`, `business_id`, `gross_cents`, `fee_cents`, `refunded_cents`,
  `discount_cents`, `net_cents` (derivados de `tickets` y `refunds`, nunca a mano), `pay_on date` (el martes después de la fecha, MEM 434), `status check
  in ('pending','held','paid','reversed')`, `hold_reason` (disputa abierta, organizador nuevo, revisión de Confianza), `transfer_id`, `paid_at`; un ajuste
  posterior (devolución después de pagado) resta en la siguiente (MEM 434) o revierte la transferencia si no hay siguiente.
- Pasarela: `cobrarPlataforma` (cargo con `transfer_group`, sin destino) y `transferir` / `revertirTransferencia` (Stripe Transfers) + `sim_transfers`
  para el simulador (§3, §6 #2).
- Plantillas `evt_cancelado` (**SMS**), `evt_fecha_cancelada` (**SMS**), `evt_movido` (**SMS**), `evt_hora_cambio` (**SMS**), `evt_aviso` (push + en la app,
  §6 #7), `evt_pago` (negocio). Claves `evt_aviso_max` 3 por fecha, `evt_pago_dia` 2 (martes), `evt_retener_nuevo_cents` (primer evento de un
  organizador sobre ese bruto → `held` hasta revisión, §6 #16).

**0111 `series_y_dias` (6f)** — `events.rep` validado (`k`, `days`, `n` ≤ `evt_fechas_max`, hasta `evt_dias_adelante`), función **`evt_generar_fechas(event_id)`**
(idempotente: crea las `event_dates` que faltan y su `ticket_stock` / `table_stock`; nunca borra una fecha con ventas: la salta o la cancela),
`event_days` (`event_id`, `day_index`, `start_min`, `end_min`: horario distinto por día, `dh` / `evDaysB`), único vivo de `event_lineup` por día; el día
pasado de una serie pasa a `done` en el barrido.

**0112 `puerta` (6g)**
- **`door_staff`** (`id`, `business_id`, `user_id` (null hasta aceptar), `display_name`, `phone_enc` + `phone_hash`, `invite_code` + `invite_expires_at` (7
  días, como el Repartidor), `scope check in ('all','events')` + `event_ids bigint[]`, **`role check in ('scan')`** (D1: no hay «escanear + vender»; el
  supervisor es quien tiene la parte `evt` del panel), `status check in ('invited','active','removed')`, `removed_reason`, `invited_by`, `created_at`).
- **`door_sessions`** (`id`, `event_date_id`, `door_staff_id` o `member_user_id`, `door_name` ≤ 30 (Principal · VIP · Terraza), `device uuid`,
  `clock_offset_ms` (medido en cada sincronización), `started_at`, `ended_at`, `package_id`).
- **`ticket_scans`** (**solo inserción**; `id uuid` **generado en el teléfono** = idempotencia): `event_date_id`, `session_id`, `device`, `ticket_id`,
  `rsvp_id`, `noche_res_id` (la lista o mesa de Noche esa noche), `code_hash` (lo que se escaneó, si no se encontró), `direction check in ('in','out')`,
  `admits_n` (de un grupo entran N de M), `result check in ('valid','already_used','wrong_event','wrong_day','not_found','void','refunded','replaced',
  'manual','over_capacity')`, `manual_reason` (no trajo QR), `table_no`, `at_device`, `at_server`, `offline bool`, **`resolution check in ('accepted',
  'duplicate','rejected')`** (la decide el servidor, §3), `created_at`. Índices `(event_date_id, at_server)`, `(ticket_id, at_server)`, `(session_id)`.
- Derivados por trigger: `event_dates.entered_n`, `inside_n` (entradas − salidas aceptadas), `tickets.status 'used'` en la primera entrada aceptada (los
  pases y la reentrada se cuentan por día en `ticket_entries` (`ticket_id`, `local_date`, `inside bool`, `entries_n`)).
- **`door_incidents`** (`event_date_id`, `session_id`, `kind check in ('duplicado','edad','seguridad','devolucion','otro')`, `note` ≤ 300, foto privada
  opcional (`media` privada, como Ayuda), `ticket_id`, `status check in ('open','closed')`, `by`, `at`) → aviso al organizador; `seguridad` muestra el 911.
- `events` suma `door_close_at_min` (hora de cerrar la puerta) y `door_caps jsonb` (aforo por puerta). Plantillas `puerta_invitado` (SMS con el código,
  como el Repartidor), `puerta_asignado` (push), `puerta_abre` (push). Claves `puerta_aforo_alerta_pct` 90, `puerta_porteros_max` 20.

**0113 `puerta_sin_conexion` (6h)** — **`door_packages`** (`id`, `session_id`, `event_date_id`, `built_at`, `expires_at` (= fin de la fecha +
`puerta_paquete_h`), `rows_n`, `sha256`, `revoked_at`; el contenido se arma al pedirlo y **no se guarda**), **`door_syncs`** (**solo inserción**: `session_id`,
`device`, `received_at`, `n`, `accepted_n`, `duplicate_n`, `rejected_n`, `clock_offset_ms`), vista `door_delta` (boletos, RSVP y cortesías de esa fecha
cambiados desde un cursor: `status`, `qr_ver`, nuevos, transferidos, devueltos). Claves `puerta_paquete_h` 6, `puerta_sync_seg` 15, `puerta_offline_aviso_min`
10.

**0114 `evento_privado` (6i)** — **`private_event_settings`** (MD L630: `business_id` pk, `on`, `capacity`, `lead_days`, `areas jsonb` (+ «Todo el local»
con su cargo), `occasions`, `menus jsonb` ({es,en} + precio por persona o «que me propongan»), `budgets`, `extras jsonb` (precio o «sin cargo»),
`respond_h`); la solicitud es `operations.kind 'private_event'` con número **`EP-4101…`** y `details jsonb` (ocasión, personas, área, fecha, hora,
duración, menú, presupuesto, extras, nota); **`private_event_quotes`** (**solo inserción**, una por versión: `operation_id`, `version`, `kind check in
('quote','alt')`, `lines jsonb`, `subtotal`, `tax` (impuesto de la ciudad), `total`, `deposit` (= `evp_deposito_pct`), `alt_starts_at`, `valid_until` (24 h),
`status check in ('sent','accepted','expired','superseded')`, `by`, `at`). Plantillas `evp_nueva` (negocio), `evp_propuesta`, `evp_otra_fecha`, `evp_no`,
`evp_vence`, `evp_ok`, `evp_cancelado` (cliente: push; SMS solo `evp_propuesta` y `evp_ok`). Claves `evp_deposito_pct` 25, `evp_cancelar_h` 72,
`evp_responder_h` 24, `evp_propuesta_h` 24, `evp_anticipacion_dias` 3.

**0115 `eventos_admin_config` (6j)** — `config_keys` de la sección `eventos` completas (las de arriba con límites, unidad y etiqueta ES/EN; los de la Fase
4 que esperaban Eventos); grupo de avisos **`events`** en `notif_prefs` (Mi cuenta › Avisos › Eventos: boletos y cambios — no se apagan los críticos —,
recordatorios, eventos guardados); vistas de analítica **`evt_analitica_dia`** y **`evt_ventas_negocio_dia`** (por ciudad, día y formato: vistas,
guardados, RSVP, boletos, bruto, comisión, devoluciones, asistencia (entraron / vendidos), no-show, lista de espera convertida; sin personas); vista
`evt_senales` (mismo dispositivo o tarjeta con muchas órdenes en minutos, transferencias en cadena, duplicados en la puerta, contracargos) para
Confianza.

**Semillas de pruebas** (`is_test`, nunca en producción; guardián `semilla`): **`0035_eventos.sql`** (6a; `scripts/semilla/extraer-eventos.cjs` desde
`TLEvt.E` + `TLEvP.toPanel`: eventos cuyo `org.biz` existe en la semilla de negocios con sus fechas relativas a la semilla, series `rep`, el festival de
3 días; los de organizadores sin negocio (`Barra Latina`, `El Coco Lounge`, `Salón Quisqueya`…) van a los negocios «To'Latino Demo» del rubro o no se
siembran — nada de negocios inventados; extras de alcohol fuera), **`0036_boletos.sql`** (6c: órdenes `B-` de vecinos de prueba con pagos
`simulated = true`, cortesías, códigos, una lista de espera), **`0037_puerta.sql`** (6g: porteros de prueba con teléfonos `+1570555…` y escaneos de una
fecha pasada), **`0038_evento_privado.sql`** (6i: ajustes de Sabor 40 · Fogón 60 · Bahía 30 y una solicitud en cada estado).

---

## 3. Dinero, puerta, datos personales y reglas legales (servidor — Opus/high; revisión de seguridad obligatoria)

**El servidor decide todo** (precio, existencias, apartado, código, comisión, devolución, quién entra). El cliente solo muestra.

**Existencias sin sobreventa.** Apartar = una transacción que (1) suelta los apartados vencidos de esas filas, (2) `update ticket_stock set held_n = held_n
+ $q where … and sold_n + held_n + $q <= quantity` (y lo mismo en `table_stock`, `event_addons`, `day_capacity`), (3) cuenta máximo por persona (cuenta +
dispositivo + tarjeta guardada, contando boletos vivos y apartados) y (4) crea el `ticket_hold` con `expires_at`. Si alguna fila no alcanza, nada se
aparta («Solo quedan N.»). El `check` de la tabla es la última barrera: aun con un error de código, la base no deja vender de más. **Agotado** es
derivado (`sold_n + held_n >= quantity` en todo lo que se vende). El apartado vence en el barrido de cada minuto (`evtApartados`) y también al leer
(una consulta nunca cuenta un apartado vencido); el contador del pago es solo pantalla.

**Comprar (en nuestra hoja, nunca la página de Stripe).** Orden de pasos con idempotencia por la llave del apartado: apartado vivo → **autorizar** la
tarjeta (`retener`, captura manual) → transacción: el apartado sigue vivo y es de esa persona → `held_n → sold_n`, `operations` (`tickets`,
`confirmed`), `tickets` con su código, `fee_cents` = `comision("bol", precio pagado, n)` por boleto → **capturar**. Si el apartado venció entre la
autorización y la transacción: se intenta apartar otra vez; si ya no hay, **se libera la autorización** y la pantalla dice «Se acabaron mientras pagabas.
No se cobró nada.». Si la captura falla: los boletos pasan a `void` y la existencia vuelve. Tarjeta rechazada: «No se cobró nada y tus boletos siguen
guardados.» (`pyVals`). `repararPagos` y el guardián del dinero cubren lo que quede a medias. **El precio que ve el cliente es el total** (cargos
incluidos); la comisión sale de lo del organizador (§6 #1); el código de descuento baja lo del organizador; la cortesía no paga ni cobra comisión.
**Sin Wallet** (no existe en el código; §6 #8): solo tarjeta.

**Dónde vive el dinero (default más seguro, §6 #2).** El resto de la app cobra con destino al negocio (`transfer_data.destination`). Para boletos el
riesgo es distinto: se vende semanas antes y el evento se puede cancelar. Default: **el cargo queda en la plataforma** (`transfer_group` = el evento) y
se **transfiere al organizador el martes después de cada fecha** (MEM 434; el panel lo dice: «A tu banco el martes después del evento»), neto de
comisión, descuentos y devoluciones; con una disputa abierta, ese monto queda `held`; el primer evento de un organizador nuevo sobre
`evt_retener_nuevo_cents` queda `held` hasta que Confianza lo mire. Así **cancelar siempre devuelve el 100 %** sin depender del saldo del organizador.
Depósito de mesa: igual (se transfiere el martes; el negocio lo descuenta de la cuenta esa noche).

**Devoluciones (Retenido · Cobrado · Liberado · Devuelto; en ES nunca «Reembolso»).**
| Caso | Quién | Cuánto | Cuándo |
|---|---|---|---|
| El organizador o el admin cancela el evento o una fecha | automático, `event_cancelled` | **100 %** de cada boleto, mesa y extra; la comisión no se cobra; el costo de la tarjeta lo absorbe To'Latino (§6 #24) | en el acto, idempotente; aviso SMS |
| Cambio de fecha (u hora o lugar que importa) | el comprador elige | «Me quedo» o **100 %** | hasta el nuevo inicio; sin respuesta = se queda |
| El comprador cancela | el comprador | precio pagado − cargo de servicio (`fee_cents` de esos boletos) | hasta `bol_cancelar_h` antes (§6 #6); después, solo transferir |
| El organizador devuelve a un comprador (Compradores › Devolver) | negocio | total o por boleto | antes de la liquidación; después, resta de la siguiente |
| Ayuda con la orden aprobada / disputa | admin | lo que decida, con motivo | cola `sop` / `disputa` |
Un boleto devuelto queda `refunded` y deja de entrar; uno **usado** no se devuelve por el comprador; uno transferido es otro boleto (el de quien lo recibe).

**El QR (§6 #10).** El QR lleva `TL1.<kid>.<id del boleto>.<id de la fecha>.<qr_ver>.<admits>.<firma>` firmado con **Ed25519** por el servidor: el teléfono
de la puerta lo **verifica sin conexión con la llave pública** y no puede fabricar uno (una llave compartida tipo HMAC en el teléfono del portero
permitiría inventar boletos: no se usa). **Sin datos personales** en el QR. El código humano `TL-XXX-0000` sirve para buscar en la puerta junto con el
nombre. Transferir o reemitir sube `qr_ver`: el QR viejo sale «Anulado». El QR del cliente se guarda en su teléfono para mostrarlo sin señal (Mi cuenta
L561). QR real con un generador de código abierto (licencia MIT, dentro del repo, sin CDN); `TicketQR` (2ac) pasa a recibir la matriz real en vez de
`seed` (cambio del sistema de diseño en `packages/ui` + README, decisión L). Lectura con `BarcodeDetector` donde exista y un lector de código abierto
(jsQR, Apache-2.0) en un Worker donde no (iOS).

**La puerta (D1: solo escanea).** Ninguna función de `/puerta` ni de `lib/puerta*` cobra, crea operaciones, emite boletos ni ve montos; el portero ve
nombre (nombre + inicial), tipo, `admits`, mesa, edad mínima y estado; **nunca** teléfono completo, correo, total ni historial. En línea primero: cada
escaneo es una llamada con su `id` del teléfono; el servidor bloquea la fila del boleto (o de la entrada del día) y decide **VÁLIDO** / **YA USADO** (con
puerta y hora: «ya entró por Puerta VIP a las 10:42») / **ES DE OTRO DÍA** / **NO ES DE ESTE EVENTO** / **ANULADO · DEVUELTO · REEMITIDO** / **NO
ENCONTRADO**. Entrada manual (no trajo QR) = buscar por nombre o código + motivo. Grupo: un QR de mesa con N personas → «entran 3 de 6». Reentrada si el
evento la permite (salida y entrada). Aforo: `inside_n` contra la capacidad del día y de cada puerta; alerta al 90 % y al 100 % («Llegaste al aforo de
hoy»). La lista y las mesas de **Noche** de esa noche se marcan desde `/puerta` solo a través de `lib/noche-reservas.ts` (el guardián `codigoPuerta`
sigue: nadie más lee `door_code`).

**Sin conexión y varios porteros (6h).** Al abrir la puerta, el teléfono baja un **paquete firmado** de esa fecha (boletos vivos con `qr_ver`, tipo,
`admits`, días que valen, mesa, nombre + inicial, últimos 4 del código y del teléfono, RSVP y cortesías; nada más) y lo guarda **cifrado** en
IndexedDB con una llave AES-GCM no exportable de WebCrypto; cada `puerta_sync_seg` baja los cambios (`door_delta`: devueltos, transferidos, nuevos hasta
que cierra la venta). Sin señal: valida la firma del QR con la llave pública + el paquete + sus propios escaneos, y guarda cada escaneo en una cola local
con su `id`, hora del teléfono y `offline = true`; la pantalla dice «SIN CONEXIÓN · lista de las 10:42» y, pasados `puerta_offline_aviso_min`, lo
avisa en grande. Al volver la señal manda la cola en orden; el servidor la aplica **idempotente** (`ticket_scans.id`) y **resuelve los choques**:
1. La hora de cada escaneo = `at_server` si fue en línea; si no, `at_device` corregida con el `clock_offset_ms` de ese teléfono (medido en cada sync).
2. Para una entrada sin reentrada, gana la **primera** por esa hora (empate: la que llegó primero al servidor); las demás quedan `duplicate`.
3. Con reentrada, se aplica la secuencia entrada / salida por hora; una entrada estando adentro = `duplicate`.
4. Un `duplicate` no deshace nada (la persona ya entró): abre una **incidencia «duplicado»** con las dos puertas y horas, aparece en vivo en el panel
   (Equipo / Monitor) y en Super Admin › Modo puerta (REPETIDOS), y suma a las señales de fraude del comprador.
5. Un escaneo sin conexión de un boleto que el servidor ya tenía devuelto o anulado queda `rejected` con incidencia (entró con un boleto que ya no
   valía) — el riesgo se acota bajando el delta cada 15 s y avisando cuando el paquete es viejo.
Entre teléfonos sin señal no hay red propia (LAN / Bluetooth no se construye; §6 #10 y LAUNCH). En línea, «adentro», «faltan» y los «ya entró» se ven en
todos los teléfonos al momento con **SSE** propio desde Next.js (LISTEN/NOTIFY de Postgres; respaldo: preguntar cada 5 s) — ningún servicio nuevo. El
paquete vence a `fin + puerta_paquete_h`, se borra del teléfono al cerrar la sesión de puerta y el panel puede **revocar** un teléfono (en la próxima
señal se borra).

**Porteros.** Solo con **cuenta de To'Latino** (teléfono verificado una vez, decisión E) + el código de invitación del negocio (§6 #11); ven solo los
eventos que les tocan y **solo el día** (desde `doors_at − 2 h` hasta `ends_at + 2 h`); quitar a un portero corta su sesión y revoca su paquete.
Toda acción de puerta es de esa persona y queda en `ticket_scans` (auditoría de check-ins: «quién escaneó qué y cuándo»).

**Datos personales.** El organizador ve de sus compradores: nombre (o el nombre del boleto), qué compró, si entró, y «Escribirle» por Mensajes (sin
teléfono ni correo: el chat cliente ↔ negocio ya existe). Las listas de la puerta no salen del teléfono (no hay «exportar» con teléfonos; §6 #25). Edad:
**no** se pide fecha de nacimiento ni foto de ID (guardianes `sinFechaDeNacimiento`, `sinImagenDeID`); el evento dice «21+ con ID» y la puerta lo
revisa en persona; antes de pagar un 18+ / 21+: «Si en la puerta no muestras ID, no entras.» (§6 #14). Cuenta borrada (D5): a los 30 días sus boletos,
RSVP, transferencias y escaneos quedan sin persona (los cobros quedan en Stripe).

**Antiabuso.** Máximo por persona por fecha (cuenta + dispositivo + tarjeta) y por orden; apartados por persona limitados (bots que acaparan); códigos
de descuento con límite de intentos; transferencias por día limitadas y sin precio (no hay reventa dentro de la app; señal «transferencias en cadena»);
cortesías con tope; SMS de transferencia y cortesía con tope por persona (bombeo de SMS); contracargos con evidencia de la puerta; organizador que cancela
seguido o no paga → Confianza (sanciones existentes, con apelación).

**Lo que la app no vende** (`alcoholNoSeVende`, fase4-noche L66/L108): ni tragos, ni botellas, ni hookah, ni «paquetes de bebidas» (`evt-data.js` los
trae: §6 #4). La mesa con consumo mínimo sí (el depósito es consumo que se descuenta en el local).

**Para el abogado** (`LAUNCH-CHECKLIST`): ley de reventa de boletos de Pennsylvania y precio total mostrado (cargos incluidos ya cumple «all-in
pricing»), impuesto municipal de diversiones (amusement tax) por ciudad, To'Latino como comerciante del cobro (cargo de la plataforma) y sus efectos
fiscales (1099-K del organizador), política de devoluciones en los Términos (versionada, `LegalPage`), menores en eventos 18+/21+ (la puerta revisa),
eventos benéficos (colectas: no se cobra donación en la app), datos de asistencia.

**Guardianes nuevos** (cada uno probado al revés): `sinVentaEnLaPuerta` (D1: nada en `/puerta`, `lib/puerta*` ni `app/(puerta)` llama a la pasarela,
`comision`, crea `operations` o `tickets`; `events.entry` sin `door`; ninguna cadena «pagar en la puerta» / «pay at the door»); `boletosSinSobreventa`
(apartar y vender solo por la función con el `update … where sold_n + held_n + q <= quantity`; `check` presente en `ticket_stock` y `table_stock`; prueba
de carrera); `apartadoLoLlevaElServidor` (el vencimiento sale de `expires_at` y del barrido, nunca de un contador del cliente); `nadaSeCobraSinBoleto`
(capturar solo después de crear los boletos en la transacción; si falla, liberar); `precioConCargos` (el total cobrado = suma de precios − descuento,
calculado en el servidor; ninguna línea «cargo de servicio» que se sume en el pago); `qrFirmado` (el QR solo lo arma `lib/boletos-qr.ts` con Ed25519;
la llave privada solo desde el entorno, nunca en la base, en un log ni en el paquete del cliente; ningún HMAC compartido con la puerta);
`qrSinDatosPersonales`; `qrViejoNoEntra` (transferir y reemitir suben `qr_ver`; la puerta rechaza el anterior en línea y sin conexión);
`porteroSoloSuEvento` (toda acción de `/puerta` pasa por `accesoPuerta(evento, fecha)` con la ventana del día; ningún DTO de la puerta trae montos ni
teléfonos completos); `escaneoIdempotente` (`ticket_scans.id` del teléfono, `on conflict do nothing`; repetir la cola no cuenta dos veces);
`choqueDePuertaDeterminista` (la misma cola en distinto orden da el mismo resultado); `paqueteMinimo` (el paquete solo trae los campos de §3 y se guarda
cifrado; vence y se borra); `devolucionTotalAlCancelar`; `pagoDespuesDelEvento` (ninguna transferencia al organizador antes del martes después de la
fecha ni con disputa abierta); `cortesiaSinDinero`; `revisionAntesDePublicar` (ninguna fecha `listable` de un evento sin `approved_at` salvo organizador
verificado); `listaDeEsperaEnOrden`; `eventosConCursor` (sin `offset`; plan con Index Scan); `avisoEventoSmsSoloCritico` (plantillas `evt_*`, `bol_*`,
`rsvp_*`, `puerta_*`, `evp_*` con `sms = true` solo en la lista de §2); `alcoholNoSeVende` ampliado a `event_addons`; `libroSoloInsercion` ampliado a
`ticket_scans`, `event_changes`, `event_notices`, `event_review_log`, `door_syncs`, `private_event_quotes`; `codigoPuerta` ampliado (la puerta lee la lista
de Noche solo por `noche-reservas.ts`); `semilla`.

---

## 4. Bloques

### 6a · Base de eventos, crear y editar en el Panel, Publica tu evento y revisión (+ Super Admin › Eventos) — migración **Opus/high**; pantallas Sonnet/medium
**Datos:** migración 0106; semilla `0035_eventos.sql`.
**Pantallas:** **Panel › Eventos** (`DASH-EVENTOS`, parte `evt`, **Pro**, §6 #5): lista `evrow` (cartel 78×104 con fecha, tipo + Tag `evTag`, barra de
venta) con «Sin eventos próximos · Crea uno abajo»; **LO QUE PUEDES PUBLICAR** = los formatos de su categoría (`CAT`); **editor `evEdit` L3011** por
formato (solo sus campos y palabras, `FMT`): cartel y fotos (≤ 6), nombre y descripción ES + EN con «Traducir» del traductor propio (5h; «El Compa» en
la Fase 7, §6 #20), cuándo (calendario `cal` de 6 meses, `evCalB`), puertas, dónde (mi local / otro lugar con dirección), entrada (gratis · RSVP ·
boletos — boletos solo con Cobros encendido), cupo, personas por RSVP, contar en la puerta, line-up / programa, música ≤ 3, edad, ID, familias,
vestimenta, cuidado de niños, «la comida se paga en el local», «Antes de ir», **«Así lo ve el cliente»** y las reglas fijas; «Para guardar falta:»
(`evMiss`); borrador → **Enviar a revisión** (o publicar si el organizador está verificado, §6 #3); «Repetir otro día» (`evDup`, borrador + 7 días).
Boletos, mesas y extras se editan aquí pero **no se venden** hasta 6c (el editor lo dice). **Publica tu evento** (`APP-EVT-EDITAR`, `/eventos/publicar`:
el formulario corto de L105, con sesión; sin negocio → `ONB-NEG-A1`; con un negocio Free → la prueba Pro, §6 #5) → «Tu evento está en revisión» con
sus 3 pasos → panel.
**Servidor:** `lib/evt.ts` (`formatosDe(categoria)`, `guardarEvento(acceso, borrador)` con validación por formato en el servidor, `enviarARevision`,
`eventosDelNegocio`), `lib/evt-revision.ts` (`aprobar`, `pedirCambios`, `rechazar` con motivo `evtNo` y aviso, `bloquearOrganizador`, `verificar`),
`app/panel/acciones-eventos.ts`, `app/(app)/eventos/publicar/`. Un cambio que importa (fecha, lugar, edad, entrada) en un evento publicado de un
organizador sin verificar vuelve a la cola con la versión anterior en vivo hasta decidir (`version`).
**Super Admin (ADM-EVT, sale de `pendiente`):** **Eventos** (lista por ciudad, fecha, formato, gratis / con boletos, estado; detalle completo; Revisar
→ Aprobar · Pedir cambios · No aprobar con los motivos de `evtNo`; Ocultar del módulo / Volver a mostrar con motivo), **Organizadores** (VERIFICADO ·
BLOQUEADO, «Permitir publicar» / «Bloquear publicación» con motivo, aviso y apelación), **Colas › Eventos a revisar** (24 h), Negocios 360° ›
Contenido › Eventos. **Triángulo:** el negocio crea → el admin aprueba → (6b) sale en Eventos y en su página → el admin lo oculta → el panel dice
«OCULTO POR TO'LATINO».
**Guardianes:** `revisionAntesDePublicar`, `alcoholNoSeVende` (extras), `colaConVista`, `ocultarAvisaYApela` (organizador bloqueado).
**Ayuda:** `panel-eventos-crear`, `publica-tu-evento`, `admin-eventos-y-boletos` (revisar, ocultar, organizadores).

### 6b · El módulo Eventos del cliente: buscar, «Esta noche», la ficha, guardar y RSVP (+ ficha, Inicio, Buscar, Ciudad, Noche, Hoy) — Sonnet/medium; cupo del RSVP Opus/high
**Datos:** migración 0107.
**Pantallas:** **`APP-EVT-BUSQ`** (`/eventos`: «Mis boletos y RSVP» si tienes, «Esta noche» como historias, destacado (`EventPromo`), la línea fija, chips
de fecha Todos · Hoy · Este finde · Próximos y de tipo Todo · Gratis · Con boleto · géneros · Comunidad, secciones Esta noche · Este fin de semana ·
Más adelante con `EventCard` (VAS · ESTA NOCHE · GRATIS · QUEDAN N), «N EVENTOS EN {CIUDAD}», vacío «Nada con esos filtros», «¿Tu negocio tiene un
evento?»; 20 por página con cursor; desktop con columna), **`APP-EVT-NOCHE`** (`/eventos/esta-noche`: historias verticales a pantalla completa, flechas
en desktop), **`APP-EVT-LISTING`** (`/eventos/[slug]`, con `?fecha=` en una serie: oscura para fiesta/show y clara para los demás (`ls.th`); cuándo,
dónde con «Cómo llegar» (mapa propio) y «Calendario», edad, vestimenta, etiquetas, line-up / programa, boletos y mesas (en 6b solo se ven; «Boletos»
llega en 6c), galería, organizador «Ver negocio», «Antes de ir», política, «Te puede gustar»; RSVP «Voy» con personas (`PartyPicker`), «Ya no voy»,
«Cupo lleno», «Invita»; corazón = guardar; compartir con tarjeta y QR del enlace). **Ficha › Eventos** (solo réplica, MEM 1360: mismas tarjetas, abre la
ficha del evento; pestaña solo si hay eventos vivos, Pro). **Inicio › Eventos de la semana**, **Buscar › Eventos** («No hay eventos con ese filtro.»),
**Ciudad** (cifra en el radio), **Noche** (el servicio `evento` con `event_id` vivo abre la ficha del evento: `noche-publico.ts` L9 y `Servicios.tsx` dejan
de decir «espera a Eventos»), **Novedades** (enlace «Evento» → sale en Hoy en el barrio con «Ver evento»). **Mi cuenta › Favoritos › Eventos**.
**Servidor:** `lib/evt-publico.ts` (`eventosCiudad(ciudad, {fecha, tipo, genero, dist, cursor})` una consulta sobre `event_dates` `listable` con el
índice; `fichaEvento(slug, fecha, viewer)`; `estaNoche(ciudad)`), `lib/rsvp.ts` (`rsvp(userId, fechaId, party)` con el evento bloqueado y el cupo,
`quitarRsvp`, `vencerRsvp` en el barrido a las puertas + 30 min), `buscar.ts` pestaña Eventos (GIN `tsv`), SEO de la ficha pública (`schema.org/Event`,
enlace universal; los eventos sí se indexan).
**Panel:** Eventos › QUIÉN VA (RSVP con personas, contar en la puerta llega en 6g). **Super Admin:** ficha › Últimos RSVP.
**Guardianes:** `eventosConCursor`, `hoySoloEnVivo` (la novedad con evento sale solo si el evento está vivo), `rutasVivas`; punta a punta: RSVP del
último lugar con 3 personas a la vez → uno entra, dos ven «Cupo lleno».
**Ayuda:** `eventos-buscar-y-ver`, `rsvp-gratis`, `eventos-en-la-ficha`; `novedades` al día (enlace a evento).

### 6c · Boletos, mesas, extras y códigos: apartar 8 min, comprar en nuestra hoja, boleto QR y Mis boletos — **Opus/high** (dinero)
**Datos:** migración 0108; semilla `0036_boletos.sql`; llave Ed25519 del sandbox en los secretos del entorno (la genera Claude, regla 1).
**Pantallas:** **`APP-EVT-BOLETOS`** (`/eventos/[slug]/boletos`: tipos con stepper, «MÁX. N POR PERSONA», «Solo quedan N.», «Agotado.», una mesa por orden
con «QUEDAN N» y su nota de depósito, extras con «SOLO CON MESA», código «Aplicar» → «CÓDIGO APLICADO · −$X» o «Ese código ya se usó todas las veces.»,
«Al continuar te guardamos boletos y mesa por 8 minutos mientras pagas.»; sin sesión → Entrar con todo guardado), **`APP-EVT-PAGO`** (`/eventos/pagar`:
«TUS BOLETOS ESTÁN GUARDADOS» con el tiempo del servidor, nombre en cada boleto (opcional), `MetodoPago` (tarjeta guardada o nueva, simulador en el
sandbox), resumen (`PaymentSummary`), «CARGOS INCLUIDOS · NADA MÁS EN LA PUERTA», ANTES DE PAGAR (`POL_PAGO` y, si es 18+/21+, la línea de ID), «Pagar
$X»; tarjeta rechazada; «Se acabaron mientras pagabas»; apartado vencido), **`APP-EVT-ORDEN`** (`/eventos/orden/[num]`: «¡Listo, vas!», boletos con
`TicketQR` **real** y «MUÉSTRALO EN LA PUERTA · SUBE EL BRILLO», mesa, pasos Boletos listos · Día del evento · En la puerta · Después, acciones
Calendario · Cómo llegar · Recibo (`receipt` con «Cargos de servicio · Incluidos»)), **`APP-EVT-MIS`** = **Mi cuenta › Boletos** (`USR-BOLETOS`
/cuenta/boletos: Próximos · Pasados con «CON QR» / «DEVUELTO») y **`USR-BOLETO`** (`/cuenta/boletos/[codigo]`: QR grande, funciona sin señal —
guardado en el teléfono —). Mi cuenta › Inicio «Tu semana» con el boleto; Pagos › movimientos.
**Servidor:** `lib/boletos.ts` (`apartar(userId, fechaId, lineas)` §3, `soltarApartado`, `vencerApartados` (barrido `evtApartados`), `pagarBoletos(userId,
apartadoId, pm, nombres)` §3, `misBoletos`, `boleto(codigo, userId)`), `lib/boletos-qr.ts` (`firmar`, `verificar`, matriz del QR), `lib/pagos/pasarela.ts`
`cobrarPlataforma` (+ simulador), `lib/codigos-evt.ts` (`validarCodigo` con límite de intentos), `app/(app)/eventos/acciones-boletos.ts`. Ficha:
«Boletos» / «Lista de espera» (6d) / «Venta pausada» / «Venta cerrada» según el servidor.
**Panel:** Eventos › ficha `evView`: KPI VENDIDO · MESAS · ÓRDENES (adentro llega en 6g), BOLETOS con QUEDAN N y «+10 más», MESAS · QUIÉN LAS TIENE,
**CÓDIGOS DE DESCUENTO** (`evCodeDet`), DINERO (bruto, depósitos, extras, «Comisión To'Latino 5 % + $1 por boleto», «Te llega · A tu banco el martes
después del evento» → Cobros), COMPRADORES (`evbuy`: Todos · Por la app · Con mesa · Con extras; buscar; Reenviar boletos (a su cuenta, sin SMS)).
**Super Admin:** **Buscar boleto** (código, teléfono o nombre; estado; Reenviar · Reemitir · Anular con motivo — §3), **Transacciones › Boletos**
(línea de tiempo por orden `B-`), ficha del evento con VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS. **Triángulo:** el negocio pone tipos y mesas → la
persona compra → el panel cuenta → el admin ve la orden y el boleto.
**Guardianes:** `boletosSinSobreventa`, `apartadoLoLlevaElServidor`, `nadaSeCobraSinBoleto`, `precioConCargos`, `qrFirmado`, `qrSinDatosPersonales`,
`dineroDelServidor`, `simuladorAislado`, `tarjetaEnServidor`; punta a punta: 3 compradores por el último boleto y por la última mesa a la vez; apartado
que vence a los 8 min con el reloj movido; tarjeta 0002 / 9995 / 0069; el código usado hasta su tope; un 11.º boleto en la orden.
**Ayuda:** `comprar-boletos`, `mis-boletos-y-el-qr`, `panel-eventos-boletos-mesas-y-extras`, `panel-eventos-codigos`; `pagar-con-tarjeta` al día.

### 6d · Después de comprar: transferir, cancelar, cortesías, lista de espera y ayuda con la orden — **Opus/high** (dinero y cuentas)
**Datos:** migración 0109.
**Pantallas:** en la orden y en `USR-BOLETO`: **Transferir** (teléfono → «Enviar boleto»; «Puedes transferir hasta 2 h antes del evento.»; «EL QR ANTERIOR
QUEDA ANULADO»; «Pasar 1 entrada» de Mi cuenta; deshacer mientras nadie lo reciba), **recibir** (`/eventos/recibir/[token]`, hueco #4: entra con su
teléfono y el boleto pasa a su cuenta), **Cancelar mis boletos** (hoja con lo que se devuelve y hasta cuándo), **Ayuda con esta orden** (No veo mis
boletos → reenviar · Cambiar un nombre (gratis hasta 2 h antes) · Un problema con el pago → `APP-EVT-AYUDA-PAGO` (hueco #3) · Cancelar). Ficha
agotada / cupo lleno → **Lista de espera** («En lista · #N», «Salir de la lista», «SE LIBERÓ UN LUGAR · TIENES 30 MIN» → apartado directo de su lugar).
**Panel:** **Dar cortesía** (`evCompDet`: nombre, teléfono opcional, cuántas; «Le llega el QR por SMS»), COMPRADORES › Cortesías · **Devolver** (total o
por boleto, con confirmación), **LISTA DE ESPERA · N** con «Avisar a la lista» solo si hay lugar (sube el cupo o devuelve un boleto).
**Servidor:** `lib/boletos-despues.ts` (`transferir` (sube `qr_ver` del original a `replaced` al reclamar; mientras está pendiente el original no entra),
`reclamar`, `cancelarTransferencia`, `cancelarBoletos` (regla de §3), `cambiarNombre`, `darCortesia`, `devolverDesdePanel`), `lib/espera.ts` (`anotar`,
`salir`, `ofrecer` en orden: un lugar liberado = una oferta de 30 min con existencia apartada a su nombre; vence → siguiente; barrido `espera`),
`ayuda.ts` con `B-`.
**Super Admin:** boleto › historial (transferencias, cortesía, devolución); Transacciones › Boletos con las devoluciones; Colas `sop` con la ayuda `B-`.
**Guardianes:** `qrViejoNoEntra`, `cortesiaSinDinero`, `listaDeEsperaEnOrden`, `devolverCoincide`; punta a punta: transferir y escanear el viejo →
anulado; transferir a las 1:59 h → rechazado; cancelar a las 23 h → solo transferir; devolver un boleto ya usado → rechazado; dos personas en la lista
y un lugar → una oferta; la oferta vence → la siguiente.
**Ayuda:** `transferir-boletos`, `cancelar-y-devoluciones-de-boletos`, `lista-de-espera`, `ayuda-con-la-orden-de-boletos`, `panel-eventos-cortesias-y-devoluciones`.

### 6e · Cambios del evento y dinero del organizador: pausar, cambiar fecha, cancelar, avisos, liquidación del martes y disputas — **Opus/high**
**Datos:** migración 0110.
**Pantallas:** **Panel › ficha**: VENTA Vendiendo / **Venta pausada** («Los que compraron entran igual.»), **cambiar fecha u hora** con boletos vendidos
(guarda `moved`, avisa por SMS), **Cancelar** (QUÉ CANCELAS: esta fecha / toda la serie; ¿POR QUÉ? con los 4 motivos; «Devolvemos $X a N personas»;
«Sí, cancelar…»), **AVISOS A LOS QUE VAN** (ideas + texto 160 → push y en la app, §6 #7; el último sale en «Antes de ir»), «Es hoy · puertas · venta
hasta…». **Panel › Cobros**: los pagos de eventos por fecha (pendiente · retenido con su motivo · pagado el martes) en PAGOS A TU BANCO y MOVIMIENTOS.
**Cliente:** ficha con «Evento cancelado» / «Venta pausada» / «Cambió de fecha»; orden con el aviso y «Me quedo con la nueva fecha» / «Devolución total».
**Servidor:** `lib/evt-cambios.ts` (`pausar`, `reanudar`, `mover` (fecha / hora / lugar, con `event_changes` y avisos), `cancelarEvento(quien, alcance,
motivo)` → devoluciones 100 % en lote **idempotentes por boleto** con progreso y fallos parciales que se reintentan en el barrido, `elegir` (quedarse o
devolver), `avisarAsistentes`), `lib/evt-liquidacion.ts` (`liquidar` del martes en el barrido: por fecha terminada, neto derivado, `transferir`, `held`
con disputa u organizador nuevo, ajuste en la siguiente; `repararLiquidaciones`), disputas de boletos con la evidencia de la puerta (`evidenciaStripe`:
hora y puerta del escaneo).
**Super Admin:** ficha del evento › **Cancelar y devolver todo** («regla del módulo: cancela el evento → devolución total», avisa por SMS), congelar /
extender ventas, ajustar cupo (admin-dashboard L183–185), todo con motivo y auditoría; **Dinero / Transacciones**: liquidaciones de eventos, retener o
soltar con motivo; alerta «evento con sobreventa» (admin-dashboard L74; con §3 no debería pasar: la alerta es el guardián vivo).
**Guardianes:** `devolucionTotalAlCancelar`, `pagoDespuesDelEvento`, `avisoEventoSmsSoloCritico`, `transaccionEnFila`; punta a punta: cancelar con 40
órdenes y la pasarela fallando en 3 → 37 devueltas, 3 se reintentan solas; mover la fecha → uno se queda, otro pide devolución; liquidar el martes con
el reloj movido; devolución después de pagado → resta la siguiente.
**Ayuda:** `panel-eventos-cancelar-cambiar-y-avisar`, `panel-eventos-cobros`, `si-cambia-o-se-cancela-un-evento`; `admin-negocio-dinero` y `disputas` al día.

### 6f · Series y eventos de varios días — Sonnet/medium; existencias por fecha Opus/high
**Datos:** migración 0111.
**Pantallas:** editor: **«Se repite»** no · cada semana (qué días, varios) · cada 2 semanas · el mismo día de cada mes («el último»), cuántas fechas, el
calendario marca la serie y deja **saltar** una fecha (con ventas no: se cancela con devolución); **varios días seguidos** (2–30) con «Horario distinto
cada día» (`evDaysB`), boletos «Vale para» un día o todos (pase), «Crear un boleto por cada día + pase» (pase −20 %, editable), aforo por día. Ficha del
panel: **FECHA QUE ESTÁS VIENDO** (chips; todo es de esa fecha), FECHAS con Saltar / Cancelada / Volver a ponerla, **QUIÉN SE PRESENTA · SOLO ESTA
FECHA** (cambiar artista de una fecha), POR DÍA · CUÁNTOS VAN, VENDIDOS POR DÍA (`chart`). Cliente: etiqueta «CADA JUEVES», «FECHAS · …» (12 chips),
«Cada fecha tiene sus boletos.», «VIE 9 OCT – DOM 11 OCT · 3 DÍAS», DÍAS Y HORARIO, «Vale solo el…».
**Servidor:** `lib/evt-series.ts` (`evt_generar_fechas` al guardar y en el barrido para mantener la ventana de `evt_dias_adelante`, `saltar`, `cancelarFecha`
(usa 6e), `artistaDeFecha`), existencias por fecha (§2 `ticket_stock`), aforo por día en `apartar` y en la puerta (pase = una entrada por día).
**Guardianes:** `boletosSinSobreventa` con el aforo por día; punta a punta: pase + boleto del sábado con aforo de día lleno; saltar una fecha con ventas
→ rechazado; serie mensual «el último viernes».
**Ayuda:** `panel-eventos-series-y-varios-dias`.

### 6g · Puerta: porteros, `/puerta` en línea (escanear, buscar, lista, aforo, mesas, incidencias, equipo, cierre) y modo puerta del panel — **Opus/high**
**Datos:** migración 0112; semilla `0037_puerta.sql`.
**Pantallas:** **To'Latino Puerta** (`app/(puerta)/puerta`, solo teléfono, oscuro y alto contraste, una sola tarea; hueco #1): `CHK-ONB` (entrar con su
cuenta → eventos asignados de hoy y próximos → elegir → nombre de la puerta → abrir), **`CHK-SCAN`** (cámara a pantalla completa, linterna, escaneo
continuo; resultado grande en < 1 s **VERDE** VÁLIDO (nombre, tipo, mesa, edad mínima; «Entró»), **ÁMBAR** revisar (pide ID por edad, boleto transferido,
grupo: «entran N de M»), **ROJO** YA USADO (hora y puerta) · ANULADO · DEVUELTO · ES DE OTRO DÍA · NO ES DE ESTE EVENTO; sonido y vibración),
**`CHK-BUSCAR`** (nombre, últimos 4 del código o del teléfono → entrada manual con motivo), **`CHK-LISTA`** (todos: entró / no entró, con mesa, cortesías,
RSVP; contar a cada RSVP que llega), **`CHK-AFORO`** (adentro / capacidad por tipo y por puerta, entradas por hora, alerta 90 % y 100 %), **`CHK-MESAS`**
(«TIENE MESA · ¿CUÁL LE DAS?» con los números, OCUPADAS, llegada de la mesa), **`CHK-INCID`** (hueco #6: duplicado · edad · seguridad (911) · pide
devolución → nota y foto privada → aviso al organizador), **`CHK-EQUIPO`** (quién está activo, en qué puerta, entradas por portero), **`CHK-CIERRE`**
(vendidos, entraron, no vinieron, cortesías, incidencias; cerrar la sesión). Para negocios de **Noche**: pestaña **Lista de la noche** (la lista y las mesas
de 4nc por nombre o código de 4 cifras: «Entraron 3 de 4»). **Panel:** **PORTEROS · ESCANEAN EN LA PUERTA** (Agregar: nombre + teléfono + eventos →
código de 7 días; Quitar con motivo; activo / invitado), **REGLAS DE PUERTA** (reentrada, pedir ID, hora de cerrar la puerta, aforo por puerta),
**«Abrir modo puerta»** (`doorDet`: el dueño o quien tenga la parte `evt` escanea desde el panel con los mismos resultados), **Monitor en vivo** (adentro,
entradas por minuto, por puerta, por portero, incidencias, mesas); ADENTRO en el KPI de la ficha. **Mi cuenta:** el boleto dice «Usado · entraste a las
10:42». Aceptar la invitación de portero (hueco #2) en `/puerta`.
**Servidor:** `lib/puerta.ts` (`invitarPortero`, `aceptarPortero`, `quitarPortero`, `accesoPuerta(userId, fecha)`, `abrirPuerta`, `escanear(sesion, qr|codigo,
id, direccion)` (§3, bloqueo de la fila, resultado, `ticket_scans`, derivados), `entradaManual`, `marcarRsvp`, `darMesa`, `incidencia`, `cerrarPuerta`),
`noche-reservas.ts` suma `listaEnLaPuerta` / `marcarLlegada` (único lector de `door_code`), SSE `app/api/puerta/vivo` (LISTEN/NOTIFY).
**Super Admin:** **Modo puerta** (solo lectura: ADENTRO · FALTAN · RECHAZADOS · REPETIDOS, ÚLTIMOS EN LA PUERTA; «Ninguna puerta abierta ahora»),
auditoría de check-ins por evento, sesiones de portero, incidencias escaladas; Confianza › Fraude «boletos duplicados».
**Guardianes:** `sinVentaEnLaPuerta`, `porteroSoloSuEvento`, `escaneoIdempotente`, `codigoPuerta` (ampliado), `sinImagenDeID`, `accionesConAcceso`;
punta a punta con **dos porteros en línea** escaneando el mismo QR a la vez → uno VÁLIDO, otro YA USADO con la puerta; portero quitado → su sesión se
corta; portero de otro negocio → no ve nada; QR de otra fecha de la serie → ES DE OTRO DÍA; mesa de 6 → entran 4, luego 2.
**Ayuda:** `puerta-escanear` (portero, ES/EN), `panel-porteros-y-modo-puerta`, `admin-puerta-auditoria`; `lista-y-mesa-de-noche` y `panel-mesas-y-lista` al
día (la lista en `/puerta`).

### 6h · Puerta sin conexión: paquete firmado, validación local, cola de escaneos y choques entre porteros — **Opus/high** (seguridad y tiempo real)
**Datos:** migración 0113.
**Pantallas:** `/puerta` instalable (manifiesto y service worker propios: la app abre sin señal), «Preparando la puerta · N boletos» al abrir, barra
**SIN CONEXIÓN · lista de las 10:42** y el aviso grande pasados 10 min, contador de escaneos por subir, «Sincronizado» al volver; incidencias de
duplicado en vivo en `CHK-EQUIPO`, el Monitor del panel y Super Admin › Modo puerta (REPETIDOS); «Revocar este teléfono» en Porteros.
**Servidor:** `lib/puerta-paquete.ts` (`armarPaquete(sesion)` firmado, `delta(sesion, cursor)`, `revocar`), `lib/puerta-sync.ts` (`aplicarCola(sesion, escaneos)`
§3 pasos 1–5, idempotente y determinista; mide `clock_offset_ms`), barrido `puertaPaquetes` (vence y marca revocados), cliente `app/(puerta)/puerta/sin-conexion/`
(IndexedDB cifrado con llave no exportable, verificación Ed25519 con WebCrypto o con una librería abierta dentro del repo donde no exista, cola de
escaneos).
**Guardianes:** `paqueteMinimo`, `choqueDePuertaDeterminista`, `escaneoIdempotente`, `qrViejoNoEntra` (sin conexión); punta a punta con el navegador
**sin red** (Playwright `setOffline`): dos teléfonos sin señal escanean el mismo QR → los dos entran, al volver uno `accepted` y otro `duplicate` con
incidencia; un boleto devuelto mientras un teléfono estaba sin señal → `rejected` con incidencia; la misma cola subida dos veces → nada cambia; reloj
del teléfono 7 min adelantado → el orden sale bien; el paquete vence → se borra.
**Ayuda:** `puerta-sin-conexion` (qué pasa sin señal, qué es un duplicado), `panel-porteros-y-modo-puerta` al día.

### 6i · Evento privado (solicitud, propuesta, depósito, cancelar) — **Opus/high** (dinero); pantallas Sonnet/medium
**Datos:** migración 0114; semilla `0038_evento_privado.sql`.
**Pantallas:** **`APP-NEG-EVENTO-PRIVADO`** (`/n/[id]/evento-privado`: desde Reservar cuando el grupo pasa del máximo, «Pedir evento privado»; móvil 3 pasos
con StepHeader y barra fija — ¿Qué celebran? · ¿Cuántos son? · ¿Dónde los sientan? (+ «Todo el local» con su cargo) · ¿Qué día? (con 3 días o más) ·
¿Cuánto dura? · ¿Qué van a comer? · presupuesto por persona · también necesitan · algo más —, desktop en una página con columna de 372; «Nada se cobra
hasta que aceptes su propuesta.»), **estado** `/privado/[num]` (PENDIENTE · TE MANDARON SU PROPUESTA (filas, subtotal, impuesto de la ciudad, total,
depósito, «Lo pagas en el local el día del evento», VÁLIDA 24 H; Aceptar y pagar · Pedir un cambio (Mensaje) · No, gracias) · TE PROPONEN UN CAMBIO
(otra fecha) · CONFIRMADO (depósito cobrado, resto, Calendario, Cómo llegar, Mensaje, Cancelar el evento) · NO PUDO / SIN RESPUESTA (otra fecha, mesas
aparte, otros restaurantes) · CANCELADO (devuelto o se quedó con el negocio)). **Panel** (hueco #5): Reservaciones › **Evento privado** (encender,
capacidad, anticipación, áreas, menús con precio por persona, presupuestos, extras) y la solicitud en **Hoy** → **Mandar propuesta** (`Estimado.tsx`:
líneas de menú × personas, área, extras, impuesto, depósito calculado) · Proponer otra fecha · No puedo (motivo). Mi cuenta: la operación `EP-`.
**Servidor:** `lib/evento-privado.ts` (`pedir` (sin dinero), `proponer` / `otraFecha` / `noPuedo` (negocio, en `evp_responder_h`), `aceptar` (retener +
cobrar el depósito en el acto; propuesta vigente), `cancelar` (antes de `evp_cancelar_h` → devolver el depósito; después se queda con el negocio),
`vencerEvp` (barrido: sin respuesta 24 h → SIN RESPUESTA; propuesta sin aceptar 24 h → vence)); impuesto de la ciudad del negocio.
**Super Admin:** Transacciones › **Evento privado** («Depósito · evento privado»), Configuración (`evp_*`), Notificaciones (`evp_*`).
**Guardianes:** `depositoRetenido` / `transaccionEnFila` (reusados), `nadaSeCobraSinBoleto` (versión «sin propuesta aceptada»); punta a punta: pedir →
proponer → aceptar con 0002 (rechazada, la propuesta sigue) → con 4242 → cancelar a 73 h (devuelto) y a 71 h (se queda).
**Ayuda:** `evento-privado`, `panel-evento-privado`; `reservar-mesa` y `panel-reservaciones` al día.

### 6j · Super Admin completo de la fase, Configuración, avisos, analítica, Mi cuenta y ayuda — Sonnet/medium; Configuración Opus/high
- **Eventos y boletos** (ADM-EVT) con sus 4 pestañas y todo lo de 6a–6h con cursor; **catálogo de formatos y géneros** (hueco #8) con vista previa;
  KPI EVENTOS · A REVISAR · BOLETOS EMITIDOS · BRUTO BOLETOS (comisión de `fee_rules`).
- **Usuarios 360°** › Actividad › Boletos y RSVP (transferencias, devoluciones, entradas); **Negocios 360°** › Eventos (organizador verificado /
  bloqueado, liquidaciones, cancelaciones).
- **Confianza › Fraude**: señales de `evt_senales` (hueco #9) → caso en `repUsr` con «Abrir caso».
- **Configuración global**: la sección **Eventos** de `config_keys` (apartado, máximos, plazos de transferir y cancelar, lista de espera, avisos,
  liquidación, porteros, paquete, evento privado) con límites y auditoría; los textos del cliente leen el valor (nada de «8 minutos» escrito a mano).
- **Notificaciones:** plantillas `evt_*`, `bol_*`, `rsvp_*`, `espera_*`, `puerta_*`, `evp_*` ES/EN; **Mi cuenta › Avisos › Eventos** (grupo `events`; lo
  crítico no se apaga) y el panel › Ajustes › Avisos (venta, aforo 90 %, cancelaciones, pago).
- **Analítica › Eventos:** vistas → guardados → RSVP / compras, bruto, comisión, devoluciones, asistencia y no-show, lista de espera convertida,
  incidencias por cada 1,000 entradas, por ciudad, formato y día; sin personas (`analiticaSinPersonas`).
- **Mi cuenta:** Boletos (6c) en el menú, «Tu semana», Pagos › movimientos de boletos, Favoritos › Eventos.
- **`docs/ayuda/`** (regla 9, ES/EN): la lista de cada bloque + `admin-eventos-y-boletos`, `admin-configuracion` (Eventos), `notificaciones` (Eventos),
  `admin-analitica` (Eventos), `mi-cuenta` (Boletos).

---

## 5. Notas de interfaz (lo específico)
- **Ficha del evento:** oscura (`#0B0E12`, acento rosa) solo para fiesta/show; clara para comida, clase, fe y comunidad (`ls.th`, `FMT.dark`); rótulos por
  formato (Line-up / Programa, Boletos / Cupos / Inscripción, El ambiente / Fotos; `FMT.tkL`, `luL`, `galL`, `cta`).
- **Tarjeta del evento** = `EventCard` con fecha en caja, Tag VAS · ESTA NOCHE · GRATIS · QUEDAN N (ámbar si ≤ 20); destacado = `EventPromo`; «Esta noche»
  = historias con anillo + pantalla completa (no se inventa otro carrusel).
- **Boleto** = `TicketQR` 2ac con el QR real, código debajo, estado VÁLIDO (verde) / USADO / DEVUELTO; en Mi cuenta el pase grande.
- **Puerta:** oscuro y alto contraste por defecto; resultado ocupa media pantalla con color + palabra + ícono (no solo color: accesibilidad); botones de
  44 px o más; sin menús profundos; sin montos.
- **Panel:** lista `evrow`, cabecera `evhd`, calendario `cal`, gráfica `chart`, compradores `evbuy` — se portan de `Panel negocio v2.dc.html` a
  `packages/ui/src/panel/Bloques.tsx` con su captura (no se inventan).
- **Estados (9) por pantalla:** módulo vacío en una ciudad nueva («Publica el primer evento», pantallas-iniciales L157), sin resultados del filtro,
  agotado, cupo lleno, venta pausada, venta cerrada, cancelado, cambió de fecha, apartado vencido, tarjeta rechazada, sin sesión en Boletos, puerta sin
  eventos hoy («El modo puerta se activa el día del evento»), puerta sin señal, portero quitado.
- Todo el texto de interfaz en `CmsString` ES/EN; lo del negocio `{es,en}` (sale en español si falta el inglés); sin emoji; dinero en centavos con el
  formato de la app; horas en la zona de la ciudad (la de las 25:00 se muestra «1 AM» del día siguiente).

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **Comisión y quién la paga.** `Publica tu evento` dice 8 % + $0.99 **sumado** al precio que paga el vecino; el panel, el admin, MEM 432 y `fee_rules` dicen
   **5 % + $1 que sale de lo del organizador** con «el precio que ves es el que pagas». Default: **5 % + $1 de `fee_rules`, del organizador**; el texto de
   Publica se corrige.
2. **Cuándo y cómo le llega el dinero al organizador.** Publica: «al día siguiente»; panel y MEM 434: «el martes después del evento». Default: **martes
   después de cada fecha**, con el cobro en la plataforma y transferencia (§3) para que cancelar siempre devuelva el 100 %. Alternativa: cobro con destino
   al negocio como el resto de la app (más simple, pero la devolución depende del saldo del organizador).
3. **¿Todo evento pasa por revisión?** PLAN L212 y el modelo: sí (24 h); el editor del panel publica al guardar. Default: **todo se revisa** hasta que el
   admin marca al organizador **VERIFICADO** (pantalla Organizadores); los verificados publican al instante con la auto-moderación de 5d.
4. **Extras con alcohol y hookah** (`evt-data.js`: «Botella premium», «Hookah», «paquetes de bebidas» en CLAUDE-plan L916). Choca con la regla de la Fase 4
   (la app no vende tragos, botellas ni hookah). Default: **no se venden**; extras solo `detalle · material · servicio · otro`; la mesa con consumo
   mínimo sí.
5. **Pro o Free.** `onboarding-negocios.md` L336: Eventos solo Pro; el módulo dice «Publícalo gratis». Default: **publicar no cuesta**, pero el módulo
   Eventos es **Pro** (un negocio Free entra con la prueba de 30 días sin tarjeta); la pestaña Eventos de la ficha solo en Pro.
6. **Cancelar por el comprador.** El prototipo deja cancelar siempre «menos el cargo»; no dice hasta cuándo. Default: **hasta 24 h antes**, se devuelve
   el precio menos el cargo de servicio (5 % + $1 de esos boletos); después, solo transferir (hasta 2 h antes). Claves en Configuración.
7. **Avisos del organizador por SMS** (el panel dice «les llega por SMS»). El SMS se paga (E). Default: los avisos del organizador van **por push y en
   la app** (máx. 3 por fecha); por SMS solo lo crítico que manda la plataforma: cancelación, cambio de fecha u hora, transferencia, cortesía y oferta de
   la lista de espera.
8. **Wallet** como forma de pago («tarjeta o Wallet»). No existe en el código. Default: **solo tarjeta**; el Wallet llega con su fase.
9. **«Evento privado».** Default: es la **solicitud de grupo a un restaurante** (diseño `APP-NEG-EVENTO-PRIVADO`, MD L630/L1958). Un evento solo con
   invitación no está diseñado: no se construye.
10. **QR fijo o rotativo.** Default: **fijo, firmado y con versión** (funciona sin señal en el teléfono del cliente; transferir o reemitir lo anula). El
    QR que cambia cada pocos segundos (anti-captura) y la red entre teléfonos de la puerta sin internet quedan para LAUNCH.
11. **Portero sin cuenta** («código de portero de un solo uso para porteros sin cuenta», apps-delivery-checkin L167). Default: **el portero entra con su
    cuenta** (teléfono una vez) + el código del negocio, como el Repartidor; nadie escanea de forma anónima.
12. **Venta en la puerta** — decidido (D1): no existe; `CHK-PUERTA`, «escanear + vender» y el cuadre de efectivo de puerta no se construyen. (Solo para
    que conste.)
13. **Código de la plataforma `TOLATINO5`** (−$5 con mínimo $20, `tkVals`). Sería dinero de To'Latino. Default: **no**; solo códigos del organizador.
14. **Edad e ID.** Default: sin fecha de nacimiento ni foto de ID; antes de pagar un 18+ / 21+: «Si en la puerta no muestras ID, no entras.» Sin devolución
    por no mostrar ID (lo dice antes de pagar).
15. **«¿Cómo estuvo?»** (estrellas en la orden). Default: es una **reseña verificada del organizador** «vía {evento}» con `resenas.ts`, solo con boleto
    usado o RSVP con entrada marcada.
16. **Retener el pago de un organizador nuevo.** Default: el primer evento con bruto sobre $2,000 (clave) queda retenido hasta que Confianza lo mire; el
    resto se paga el martes.
17. **Apple Wallet / Google Wallet** para el boleto. Default: Fase 8 (cuenta de Apple Developer); hasta entonces el QR vive en la app y funciona sin señal.
18. **Promotores** (vender cortesías o cobrar por promotor, MEM 208). Default: no se construye; los promotores usan códigos de descuento del organizador.
19. **«Hacer cartel».** Default: no se construye; se sube la foto.
20. **«Traducir con El Compa».** Default: «Traducir» con el traductor propio (5h) hasta la Fase 7.
21. **Cambio de fecha.** Default: el comprador elige hasta el nuevo inicio; si no contesta, se queda con la nueva fecha.
22. **Límites de compra.** Default: hasta 10 boletos por orden y 20 por persona y fecha (cuenta + dispositivo + tarjeta); el organizador puede bajar el
    máximo por persona.
23. **Mesa = entradas incluidas.** Default: la mesa trae tantas entradas como `seats` (un QR de grupo); el depósito se cobra al comprar y sigue la misma
    política de cancelación.
24. **Costo de la tarjeta cuando el organizador cancela.** Default: To'Latino lo absorbe y el comprador recibe el 100 %; dos cancelaciones del mismo
    organizador en 90 días → caso en Confianza.
25. **Cuánto se guardan los escaneos y quién exporta la lista.** Default: escaneos 13 meses y luego solo totales; el paquete de la puerta se borra al cerrar;
    el organizador no exporta teléfonos.

## 7. Orden, dependencias y pruebas
6a → 6b → 6c → 6d → 6e → 6f → 6g → 6h → 6i → 6j. 6a crea la base y la revisión (el módulo público sigue «Pronto» hasta 6b); 6b solo lee y RSVP (sin
dinero); **6c antes que todo lo demás de dinero**; 6d y 6e dependen de 6c; 6f necesita las existencias por fecha de 6c y las cancelaciones de 6e; **6g
necesita boletos vivos (6c) y series (6f)**; 6h solo después de 6g en línea; 6i es independiente (motor de Fiestas/Estimado) y puede ir en paralelo
desde 6c; 6j cierra la fase. Cada bloque: migración (aplicada dos veces) + semilla de pruebas (`is_test`) + punta a punta en 9 dispositivos (la Puerta
en los teléfonos). Lo que el prototipo simula («El negocio responde», «Pasa el tiempo») se hace con **cuentas de prueba reales** (comprador, segundo
comprador, dueño, portero A, portero B) en la misma prueba. **Reloj movido:** apartado de 8 min, RSVP que vence a las puertas + 30 min, venta que cierra
(inicio · puertas · un día antes), transferir hasta 2 h antes, cancelar hasta 24 h antes, oferta de la lista de 30 min, recordatorio del día antes y
«¡Es hoy!», fecha que pasa a terminada, liquidación del martes, revisión de 24 h, propuesta del evento privado de 24 h y cancelar a 72 h, paquete de puerta
que vence. **Abuso** (cada uno al revés): 3 compradores por el último boleto, la última mesa y el último lugar de un día; un 21.º boleto de la misma
persona con otra cuenta en el mismo dispositivo; código adivinado (límite); transferir y usar el viejo; devolver uno usado; cortesía 51; portero de otro
negocio; portero quitado con la puerta abierta; QR alterado (firma mala); QR de otro entorno (llave del sandbox en un QR «de producción»); el mismo QR en
dos puertas en línea y sin conexión; extra «Botella» en el editor; precio cambiado desde el cliente; organizador bloqueado que publica. **Velocidad**
(presupuesto, guardián Velocidad): base de carga **aparte** (nunca la semilla del sandbox) con **1 M de fechas, 5 M de boletos y 50 k boletos en
una sola fecha**, `scripts/carga/eventos-1m.mjs`: lista de una ciudad 20 con cursor p95 ≤ 50 ms y TTFB ≤ 300 ms (Index Scan, sin
`offset`); ficha ≤ 40 ms; apartar ≤ 30 ms con 200 apartados a la vez sobre el mismo tipo; escaneo en línea ≤ 150 ms de ida y vuelta; validación sin
conexión ≤ 50 ms en un Pixel emulado; paquete de 10 k boletos ≤ 1 s y ≤ 1 MB comprimido; subir 500 escaneos ≤ 2 s; LCP de la ficha ≤ 2.5 s en 4G con el
cartel en WebP. Revisión de seguridad (regla 5) de 6c, 6d, 6e, 6g, 6h y 6i. Capturas teléfono + escritorio de cada pantalla compuesta (§1b; la Puerta
solo teléfono) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre de la fase (todo marcado antes de decir «Fase 6 completa»)
_Cada marca dice con qué se comprobó; lo que no se pudo comprobar queda sin marcar con el motivo._
- [ ] Migraciones 0106–0115 aplicadas dos veces en PostGIS real (idempotentes, sin borrar nada) y en CI; semillas 0035–0038 solo en pruebas (`semilla`).
- [ ] Crear y editar por formato en el Panel, Publica tu evento, revisión con la cola `evt` de 24 h, organizadores verificados y bloqueados; ningún evento
      público sin aprobar (`revisionAntesDePublicar` al revés).
- [ ] Módulo Eventos (buscar, Esta noche, ficha clara/oscura), ficha › Eventos, Inicio, Buscar › Eventos, Ciudad, Noche `evento`, Novedad → Hoy; RSVP con
      cupo exacto con personas a la vez.
- [ ] Boletos, mesas, extras y códigos: apartado de 8 min del servidor, compra en nuestra hoja contra el simulador, QR firmado real, Mis boletos; sin
      sobreventa en carrera (`boletosSinSobreventa`, `nadaSeCobraSinBoleto`, `qrFirmado` al revés).
- [ ] Transferir (QR viejo anulado), cancelar con su regla, cortesías, lista de espera en orden, ayuda `B-`.
- [ ] Pausar, cambiar fecha (quedarse o devolución), cancelar fecha o serie con devolución total idempotente, avisos, liquidación del martes con retención
      por disputa y ajuste posterior; Cobros y Transacciones lo muestran.
- [ ] Series (semanal, cada 2 semanas, mensual «el último»), saltar y cancelar una fecha, artista de una fecha, varios días con pase y aforo por día.
- [ ] Puerta en línea: porteros con cuenta e invitación, escanear / buscar / lista / aforo / mesas / incidencias / equipo / cierre, modo puerta del panel,
      lista de Noche; dos porteros a la vez sin entradas dobles; nada se vende ni se ve de dinero (`sinVentaEnLaPuerta` al revés).
- [ ] Puerta sin conexión: paquete firmado y cifrado, validación local, cola idempotente, choques resueltos igual en cualquier orden, incidencias de
      duplicado, paquete que vence y se revoca.
- [ ] Evento privado de punta a punta (pedir, proponer, otra fecha, no puedo, vence, aceptar con depósito, cancelar antes y después de 72 h).
- [ ] Super Admin: Eventos y boletos (4 pestañas), catálogo de formatos y géneros, Buscar boleto con reenviar / reemitir / anular, Modo puerta, Dinero,
      Usuarios y Negocios 360°, Confianza › señales, Configuración › Eventos, Notificaciones, Analítica › Eventos; cada acción con motivo, aviso, apelación y
      auditoría.
- [ ] Avisos ES/EN en `notif_templates`; SMS solo en la lista crítica (`avisoEventoSmsSoloCritico`); Mi cuenta › Avisos › Eventos.
- [ ] Presupuesto de velocidad con la base de carga cumplido (cifras en PROGRESS); guardianes de §3 en `guardianes/run.mjs`, cada uno probado al revés;
      build + CI + punta a punta en 9 dispositivos verdes; Pedidos, Reservaciones, Noche (lista y mesas), Cobros y Comunidad sin regresión.
- [ ] `docs/ayuda/` completas (cada bloque + 6j); preguntas #1–#25 en `docs/REVISION.md`; `LAUNCH-CHECKLIST` con ley de reventa de PA, amusement tax,
      comerciante del cobro, Términos de devoluciones, QR rotativo y red entre teléfonos de la puerta, Apple/Google Wallet (Fase 8), promotores, Wallet.
- [ ] `docs/PROGRESS.md` al día (Fase 6 cerrada) y `docs/REVISION.md` con los pasos para mirarla en el sandbox (comprador, dueño y dos porteros).

## 9. Decisiones del fundador pendientes (resumen para `docs/REVISION.md`; se construye con el default, regla AB)
| # | Qué decidir | Default que se construye (reversible) |
|---|---|---|
| 1 | Comisión de boletos y quién la paga | 5 % + $1 de `fee_rules`, sale de lo del organizador; el vecino ve el precio total |
| 2 | Cuándo y cómo cobra el organizador | Cobro en la plataforma, transferencia el martes después de cada fecha |
| 3 | ¿Todo evento se revisa? | Sí, hasta que el admin verifica al organizador |
| 4 | Extras con alcohol / hookah | No se venden; la mesa con consumo mínimo sí |
| 5 | Eventos en Free | Publicar es gratis pero el módulo es Pro (prueba de 30 días) |
| 6 | Hasta cuándo cancela el comprador | 24 h antes, menos el cargo de servicio; después solo transferir (2 h) |
| 7 | Avisos del organizador por SMS | Push y en la app; SMS solo lo crítico de la plataforma |
| 8 | Wallet como forma de pago | Solo tarjeta |
| 9 | Qué es «evento privado» | La solicitud de grupo a un restaurante; nada de eventos con invitación |
| 10 | QR fijo o rotativo | Fijo, firmado y con versión |
| 11 | Portero sin cuenta | No: cuenta + código de invitación |
| 13 | Código `TOLATINO5` de la plataforma | No; solo códigos del organizador |
| 16 | Retener al organizador nuevo | Primer evento sobre $2,000 retenido hasta revisión |
| 24 | Costo de la tarjeta si el organizador cancela | Lo absorbe To'Latino; repetido → Confianza |
