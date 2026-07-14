# To'Latino — Progress & Session Handoff

> **Purpose.** A living "where we are / how to resume" doc so a fresh session can
> pick up instantly. Read this + `CLAUDE.md` (vision/standards) +
> `docs/LAUNCH-CHECKLIST.md` (deferred decisions) before working.
> Last updated: 2026-07-14.

## Auditoría de performance + seguridad (2026-07-14) — spinner colgado ARREGLADO

El fundador reportó un **spinner de carga que se quedaba girando** "en todos
lados" (Mensajes, Menú, configuración de listado, fotos) y pidió una auditoría de
performance + seguridad antes de seguir. Informe completo en
**`docs/AUDIT-2026-07-14.md`**; los pendientes de seguridad están en
`LAUNCH-CHECKLIST.md` §2a.

**Causa raíz del spinner (P0) — ARREGLADO y verificado en navegador real:**
`lib/supabase.ts` creaba el cliente **sin timeout de red**. supabase-js usa
`fetch` (sin timeout por defecto) → en una conexión móvil lenta un request que
nunca responde nunca resuelve → `setLoading(false)` nunca corre → el spinner gira
para siempre. Parecía "en todos lados" porque `bizAdmin.loading` (una sola
compuerta) bloquea **seis** módulos a la vez. Fix (solo cliente, reversible):
1. **Timeout global de 15s** con `AbortController` envolviendo `fetch` en
   `supabase.ts` — cubre TODAS las queries de una sola vez; el request colgado
   falla rápido y la pantalla cae a estado vacío/error en vez de girar.
2. **`finally`-clear** en `bizAdmin.tsx` — `loading` siempre se limpia; ningún
   return temprano lo deja colgado.
3. **Key estable** — `bizAdmin` depende de `user?.id` (string), no del objeto
   `user` que `useAuth()` recrea en cada evento de auth (refresh/focus) que
   re-flasheaba los spinners a media sesión.
   Verificado: red normal → conversaciones cargan sin spinner; `business_
   conversations` simulado como muerto → el spinner aparece y **resuelve** al
   estado "Sin mensajes todavía" dentro del timeout (antes era infinito).

**Escala (migración 0080) — APLICADA:** índices `reviews (business_id, created_at
desc)` y `business_orders (business_id, status)` para las lecturas calientes del
panel (Reseñas, ingresos, campana). Aditivo, no rompe nada.

**Seguridad:** la base es sólida (RLS en las 40 tablas, sin políticas de escritura
`using(true)` ni anon, RPCs de service_role bien `revoke`adas, sin secretos en el
bundle). **Cerradas y verificadas 2026-07-14 (lote aprobado por el fundador):**
- **C1** webhook Stripe ahora **falla cerrado** (si falta el secreto → 500; nunca
  procesa cuerpo sin verificar). Redeploy v8; evento falsificado → 400.
- **C2** el total de un **pedido se recalcula desde precios de la BD** (id + add-ons
  estructurados `sel`; el `price` del cliente se ignora). Redeploy v7; probado: un
  pedido con `price:0.01` de un ítem real de $11.99 + $2 → se cobra **$14.69** real.
- **H1** (migración 0081) trigger que bloquea que un dueño cambie columnas
  protegidas (`tier/rating/connect/owner`) por PostgREST directo; escritores
  legítimos (RPCs SECURITY DEFINER, webhook service_role) pasan. Verificado:
  auto-ascenso a premium → 400; publicar reseña (sync de rating) sigue OK.
- **H2** (migración 0081) quitadas las políticas insert+update directas de
  `event_tickets` (crear boletos gratis / reusar código). Verificado: insert
  directo → 403.

- **H3** el **depósito de reserva y la tarifa de renta se recalculan desde la BD**
  (ignoran el `subtotal` del cliente): reserva = (persona? precio×party : precio) +
  add-ons; renta = tarifa hora/día/semana × unidades + add-ons, con el **span de
  días re-derivado de las fechas** (para que nadie pague 1 día y bloquee 30).
  Verificado: reserva con `subtotal:0.01` → se cobra **$26.25** real; renta 3d×2 +
  extra → **$36.75**; add-on/ítem inválido → rechazado.

Migraciones **0080** (índices) + **0081** (RLS) pegadas al fundador para correr en
Supabase. **Todas las críticas/altas (C1, C2, H1, H2, H3) cerradas.** Pendientes
(M1–M5, L1–L4 — medios/bajos) en checklist §2a. Ver `AUDIT-2026-07-14.md`.

## UX: sub-navegación de módulos como TABS (2026-07-14)
El founder notó que las sub-secciones de cada módulo (Despacho/Zonas/Repartidores ·
Platillos/Categorías/Modificadores · Equipo/Horario/Nómina …) usaban el MISMO estilo
de "pill" que los filtros de datos justo debajo (Todos/Nuevos/Preparando · Todos/
Desayunos …), así que se confundían: parecían opciones/filtros, no configuraciones.
- **Nuevo componente `components/SectionTabs.tsx`:** barra de **tabs con subrayado**
  (tab activo en primary + underline; inactivos en muted), scrollable en móvil con
  flechas ‹ › en desktop (reusa `ChipRow`), badges opcionales, tokens only, touch
  ≥42px. Deliberadamente distinto de los `chip()` (pills) → el dueño lee las
  secciones como "configuraciones a las que navego", no como filtros.
- **Convertidos** (solo la navegación de SECCIONES; los filtros de datos siguen
  como pills): `Fulfillment` (Despacho/Zonas/Repartidores/Ajustes + Envíos/…),
  `Food` (Platillos/…/Stock&86), `Staff` (Equipo/…/Roles + Vacantes/…, con badge
  PRO), `Products` (Catálogo/…/Inventario), `Services` (Catálogo/Categorías/Add-ons),
  `Rental` (Artículos y Rentas), `Events` (lista + detalle de evento), `Billing`
  (Plan/Comparar/Pagos/Facturas).
- **Sin tocar:** los toggles de MODO tipo segmented dark (Delivery/Shipping,
  Personal/Empleos, Servicios/Reservas, Directorio/Pedidos/Reseñas, Solo mostrar/
  Pedidos en línea) — ya se leen distinto; y los FILTROS de datos (incl. Novedades,
  que filtra por estado) siguen como pills a propósito.
- Resultado: jerarquía clara de 3 niveles → segmented (modo) · tabs (secciones/
  configuración) · pills (filtros de datos). Verificado en navegador (Fulfillment,
  Food, Staff; móvil + escritorio). Como es UN componente compartido, cualquier
  ajuste de estilo es un cambio de un solo lugar.
- **Peso de los tabs — REVERTIDO al original (2026-07-14):** probé subirlos a 15px +
  inactivos oscuros (Opción A), pero al founder no le convenció; regresé al estilo
  original (13.5px, activo 800 primary, inactivos 700 muted). **Pendiente acordado:**
  el founder quiere hacerlo bien con un **cambio de fuente** (una "black"/900 tipo
  Archivo Black solo para tabs/títulos) más adelante — probar aplicada en la app y
  decidir. No se hace ahora.

## Pagos: efectivo contra entrega por defecto · Stripe para tarjeta en línea (2026-07-14)
Decisión del founder (corrige el enfoque anterior de "modo catálogo"): **Stripe NO
es obligatorio para vender.** Activar un módulo = ya puedes cobrar en **efectivo
contra entrega o al recoger**; **Stripe** habilita **vender en línea y aceptar
tarjeta** (depósito a tu banco). Todo cliente, sin migración.
- **Consumidor (`BizDetail.tsx`) — cash-on-delivery real:**
  - `deliveryAvailable = !!del?.on` (antes exigía Stripe) → la entrega se ofrece con
    o sin Stripe; en efectivo el cliente paga al repartidor.
  - Los `*DisplayOnly` vuelven a depender **solo** del toggle del dueño
    (`ordering`/`selling`/…), no de Stripe → sin Stripe el menú/tienda es
    **ordenable en efectivo** (no catálogo).
  - Sin Stripe: total = subtotal + tarifa de entrega (sin tarifa de servicio 5%,
    sin propina en línea — el cliente le da propina al repartidor en efectivo). El
    desglose y la nota se adaptan: **"Pagas en efectivo al recibir tu pedido"**
    (entrega) / **"…al recoger"** (pickup).
  - `placeCart` ahora manda `channel` + un `fulfillment` con `payment:'cash'`,
    dirección, `delivery_fee` y `collect_total` (mismo shape que un pedido pagado
    → la Cocina muestra la dirección). `myActivity.placeOrder` acepta `fulfillment`.
  - **Cocina/Pedidos (`Customers.tsx`):** chip **"Efectivo"** + aviso **"Cobra $X en
    efectivo al entregar/recoger"** en pedidos `payment:'cash'`, para que el dueño
    sepa que NO está prepagado.
- **El diálogo profesional (dueño):**
  - **`ModulesSetup.tsx`:** al activar venta sin Stripe → tarjeta informativa (no
    alarma): **"✓ Ventas activas — ya puedes cobrar en efectivo · Cobras en efectivo
    contra entrega o al recoger · … conecta Stripe. Es opcional"** con CTA **"Aceptar
    pagos con tarjeta"**. Conectado → verde "Aceptas tarjeta (Stripe) y efectivo".
  - **`DashboardHome.tsx`:** ya NO es "Requiere tu atención" (no es un error) — es un
    empujón suave en "Mejora tu visibilidad": **"Acepta pagos con tarjeta · hoy
    cobras en efectivo"** (→ Pagos).
- **Verificado E2E** (`tools/mobile-audit/{cash-sales,cash-cart}.js`): con El Sabor
  NO conectado → el diálogo del dueño es correcto (efectivo contra entrega + aceptar
  tarjeta, sin "modo catálogo"); el menú es ordenable; el carrito muestra
  Entrega/Recoger + tarifa de entrega + **"Pagas en efectivo al recibir tu pedido"**
  con total = subtotal+entrega. Restaurado a conectado después.
- **`bizAdmin.tsx`:** `BizRow.connect_charges_enabled` (viene del `select('*')`).
- **Pendiente (setup del founder):** conectar Stripe de verdad (Edge Functions
  `connect-onboard`/`connect-status`/`marketplace-checkout` + llaves) — la UI + el
  onboarding ya están; sin eso, el pago con tarjeta en línea no completa, pero el
  efectivo contra entrega funciona.

## "Vender en To'Latino" — activador rediseñado + venta OFF por defecto (2026-07-13)
El founder notó que la sección "Vender" se veía larga y confusa para un negocio
nuevo. Causa raíz: **todo arrancaba ENCENDIDO** (`DEFAULT_MODS` all-on), así que
cada negocio aparecía "vendiendo todo" — contra "el listado es el master, vender
es opcional". Arreglado en dos partes:
- **Venta OFF por defecto para negocios reales** (`Panel.tsx`): nuevo
  `LISTING_ONLY_MODS` (comercio apagado; `updates`/`staff` mantienen su default —
  solo se apaga vender). El demo sigue mostrando todo para explorar. Un negocio
  nuevo → el sidebar colapsa a **"Activar ventas"**.
- **`ModulesSetup.tsx` rediseñado como activador guiado** (benchmark: Shopify
  setup / Square "Add features" / Google Business): enmarca "✓ tu página ya está
  publicada, vender es opcional"; **recomienda el canal según el rubro** (★ en
  Menú para restaurante, Servicios para salón, etc.); cada tarjeta explica en
  cristiano qué es + un chip "→ qué añade a tu panel"; y una tira aclara que
  **Pedidos/Entregas/Pagos se activan solos**. Estado honesto "Aún no vendes en
  línea — y está bien".
- **Migración de datos:** para no ocultar catálogo real, a los negocios con
  contenido hay que fijarles sus módulos. Hecho para **El Sabor**
  (`update businesses set modules='{"menu":true}'`) — conserva su menú de 150
  platillos; su Menú sigue activo y el sidebar muestra solo Menú·Pedidos·Entregas·
  Pagos (ya no la lista larga). Los demás (fixtures sin catálogo real) pasan a
  listing-only. **Nota:** El Sabor tenía un producto suelto de prueba ("Carro
  electrico") — quedó oculto (Productos off); el founder decide si borrarlo.
- **Verificado E2E** (`tools/mobile-audit/{modules-activator,modules-elsabor}.js`,
  390 + 1440): el activador nuevo se entiende (primer-día vacío con recomendado
  resaltado, móvil y escritorio); El Sabor NO perdió su menú (sidebar conserva
  "Menú de comida", activador con Menú ON y Productos OFF).

## Analítica — pendientes cerrados: búsquedas + anti-inflación + zona horaria (2026-07-13, migración 0079)
Se cerraron los tres pendientes de descubrimiento que quedaban (LAUNCH-CHECKLIST §3b).
- **Apariciones en búsqueda (`search`).** Nueva RPC **`track_search_appearance(slugs[])`**
  (SECURITY DEFINER, anon+auth): +1 'search' para cada negocio mostrado en un set de
  resultados, en UNA llamada + un upsert masivo (una página de 40 = 1 round-trip →
  escalable a 1M+/mo). Dueños de la ficha excluidos (`owner_id <> auth.uid()`).
  Instrumentado en `Negocios.tsx`: efecto con **debounce 800ms** (el tecleo colapsa a
  un evento) + **dedup por firma** (query+cat+subcat+página) para no recontar en
  re-render, disparado cuando hay query o filtro de categoría. Surface: fila
  **Alcance** (Búsquedas · Vistas) en la pestaña Estadísticas + `trackSearchAppearance`
  en `live.tsx`.
- **Anti-inflación (rate-limit por sesión).** `trackListingView` ahora deduplica las
  **acciones** (save/direction/call) por sesión (sessionStorage, ventana 6h) para que
  un tap repetido no infle; las **vistas** siguen contando siempre ("cada vista
  cuenta", regla del founder). El filtro de bots/crawlers a nivel edge (Cloudflare)
  queda como ítem de infra a escala — no fakeable en app.
- **Zona horaria del negocio.** Se añadió `businesses.timezone` (default
  `America/Chicago`, editable). `track_listing_view`, `track_search_appearance` y
  `business_metrics` ahora bucketan/filtran por la zona del negocio
  (`(now() at time zone tz)::date`), y el Inicio + Estadísticas construyen las series
  con el helper **`tzDayKeys(tz)`** (+ `dkTz` para pedidos/reseñas). Server y cliente
  coinciden exactamente → sin corrimiento de un día en el borde de la medianoche.
- **Verificado E2E** (SQL con claims JWT + navegador real): RPC de búsqueda
  (owner-excluido, batch de 2 negocios, no-owner cuenta); `buckets_match=true` para la
  tz; el cliente dispara `track_search_appearance(['hz-sabor-quisqueya'])` al buscar
  "sabor" (interceptado, sin mutar DB); y la pestaña Estadísticas muestra la fila
  **Alcance** con Búsquedas reales (`tools/mobile-audit/{stats-tab,search-track}.js`).
  Artefactos revertidos (El Sabor → view=3; esperanza limpio).

## Pestaña "Estadísticas" dedicada (2026-07-13) — analítica real estilo Google Business
Nueva pestaña **Estadísticas** en el panel, bajo el grupo "Cómo te encuentran"
(arriba de Reseñas). Benchmark: **Google Business Profile Insights / Yelp Business**.
- **`Estadisticas.tsx`** (nuevo): renderizado en `Panel.tsx` (`tab === 'stats'`);
  TabKey `'stats'` + item de nav + `pageHead` en `tabs.tsx`; añadida a `RICH_MODULES`
  (sin botón "+Nuevo"). Icono `IconChartLine`.
- **Bloques (todos con datos reales):**
  - **Selector de rango** 7 / 30 / 90 días (chips) — `business_metrics(slug, range*2)`
    para poder comparar el periodo actual contra el inmediatamente anterior.
  - **Interacciones totales** (vistas+guardados+cómo-llegar+llamadas) + **tendencia
    %** vs periodo anterior + gráfica de área SVG.
  - **Cómo te encuentran**: grid 2×2 (Vistas · Guardados · Cómo llegar · Llamadas),
    cada una con su número, delta % y sparkline. Nota honesta: búsquedas pronto,
    auto-vistas del dueño no cuentan.
  - **Reputación**: calificación · reseñas totales · reseñas en el periodo · sin
    responder (link a Reseñas).
  - **Ventas** (solo vendedores): ingresos + pedidos del rango desde `business_orders`,
    tendencia + gráfica de área. Link a Pedidos.
- **Inicio → Estadísticas**: el bloque "Cómo te encuentran" del Inicio ahora tiene
  un enlace **"Ver estadísticas ›"** que abre la pestaña.
- **Disponible en todos los planes** (como Google Business; refuerza "el listado es
  el master"). Gate por plan = decisión pendiente (LAUNCH-CHECKLIST §3b).
- **Verificado E2E** (`tools/mobile-audit/stats-tab.js`, 390 + 1440): con datos
  reales sembrados por SQL (spread multi-día → 107 interacciones/7d, 91 vistas,
  7 guardados, 4 cómo-llegar, 5 llamadas, tendencias +40/+40/+33/+150%), se renderiza
  el hero, el grid con sparklines, reputación y ventas; el cambio de rango refetchea.
  Artefactos de prueba revertidos (El Sabor → view=3 hoy, sin datos inventados, #8).

## Métricas de descubrimiento — endurecidas + acciones del cliente (2026-07-13, migración 0078)
Continuación de la Fase 3 para que los números sean **confiables** (el dueño los
usa para decidir si el listado funciona) y **más completos** (el set de Google
Business: no solo vistas, también qué HACE la gente tras encontrarte).
- **Migración 0078** (`supabase/migrations/0078_metrics_self_view.sql`, aplicada):
  `track_listing_view` ahora **retorna temprano si `auth.uid()` = `owner_id`** —
  las auto-vistas/acciones del dueño ya **no inflan** las estadísticas. La tabla
  0077 no cambió (el `kind` ya era extensible). Idempotente (create or replace).
- **Acciones del cliente instrumentadas** (`BizDetail.tsx` + `live.tsx`):
  - `save` — el ♥ ("Guardar") registra un `save` **solo al guardar** (no al
    quitar). Ambos botones (hero + barra sticky) usan un `toggleSave` común.
  - `direction` — el tile **"Cómo llegar"** ahora **abre mapas de verdad**
    (deep-link universal `maps/dir?api=1&destination=…`, sin API key ni cobro —
    la regla no-Google-Maps es sobre nuestras llamadas de tiles/geocoding, no un
    link de direcciones gratis) y registra `direction`. Antes el tile no hacía nada.
  - `call` — el tile **"Llamar"** ahora sí marca (`tel:`) y registra `call`.
    Antes tampoco hacía nada (dos stubs corregidos → barra competitiva #8).
- **Cockpit** (`DashboardHome.tsx`): el bloque **"Cómo te encuentran"** suma una
  fila de acciones del cliente estilo Google Business — **Guardados · Cómo llegar ·
  Llamadas** (7 días, reales) bajo las mini-barras de vistas. Nota honesta
  actualizada: "tus propias visitas no cuentan · búsquedas: pronto".
- **Verificado E2E** (`tools/mobile-audit/discovery-metrics.js`, 390 + 1440):
  con datos reales sembrados por SQL (view=5, save/direction/call=1), el Inicio del
  dueño muestra 5 / 1 / 1 / 1. Probado el guard vía claims JWT: **owner NO cuenta**;
  comprador anónimo y autenticado **sí**. Artefactos de prueba revertidos al estado
  previo (view=3, sin otros tipos) — sin datos inventados para un negocio real (#8).
- **Pendiente (LAUNCH-CHECKLIST §3b):** `search` (apariciones en búsqueda);
  anti-bots/rate-limit; borde de zona horaria en las barras; pestaña "Estadísticas".

## Dashboard nuevo = OFICIAL (2026-07-12) — flags eliminados, viejo borrado
El dueño aprobó el rediseño, así que se hizo permanente: se **quitaron los flags**
`DASH_V2`/`HOME_V2` (ahora `buildNav` = la nav listing-first y `DashboardHome` =
el Inicio, sin condicionales) y se **borró el dashboard viejo**: el `buildNav`
anterior, `Insights.tsx` (InsightsFree/InsightsPaid, el Resumen demo), y el
código muerto `GenericTab.tsx` + `buildGeneric` + sus tipos `G`. Verificado en
navegador (grupos nuevos + Vistas reales, sin errores). Las secciones de Fase 1–3
abajo quedan como historial del proceso.

## Dashboard restructure — Fase 1: navegación (2026-07-12, tras flag DASH_V2)
Reorganización del panel de negocio alrededor de la verdad del producto (founder):
**el LISTADO es el master** (todo negocio se publica para ser encontrado); **vender
es un adherido opcional**. El modelo mental pasó de Shopify a Google Business/Yelp
+ comercio opcional encima.
- **`DASH_V2` flag** (`tabs.tsx`): `true` = nav nueva; ponlo en `false` para
  revertir **al instante** a la nav anterior + bottom bar + títulos. `buildNav`
  (legacy) queda intacto como fallback — revert de una línea, sin perder nada.
- **`buildNavV2`**: grupos por frecuencia/propósito — **Inicio** (antes "Resumen")
  · **Tu página** (Información/Fotos/Horario/Relacionados — el master, primero) ·
  **Cómo te encuentran** (Reseñas/Novedades; Estadísticas entra aquí en Fase 3) ·
  **Clientes** (Mensajes/Directorio) · **Vender en To'Latino · opcional** · **Cuenta**.
  Headers en overline mayúscula (más limpio) solo bajo v2.
- **Vender = adherido**: solo muestra los módulos de comercio ACTIVOS (menú/
  servicios/productos/renta/eventos + pedidos/entregas/pagos). Si el negocio NO
  vende, colapsa a un único **"Activar ventas"** → Configurar módulos. Reactivo:
  activar un módulo puebla el grupo y cambia el bottom nav.
- **Bottom nav adaptable** (`Panel.tsx`): vende → Inicio·Pedidos·Catálogo(menú/
  productos/…)·Mensajes·Más; solo-listado → Inicio·Reseñas·Mensajes·Novedades·Más.
- **NO tocado aún**: el contenido del Inicio (sigue siendo el cockpit demo — Fase 2,
  con datos reales), Estadísticas reales (Fase 3), y los controles muertos del
  header (buscador/campana — Fase 1b). Todo en `docs/LAUNCH-CHECKLIST.md §3b`.
- **Verificado** a 1440 + 390 (`tools/mobile-audit/dashboard-v2.js`): grupos nuevos,
  Vender poblado para El Sabor, y en demo con comercio apagado colapsa a "Activar
  ventas" con el bottom nav de engagement. Sin mutar datos reales (el apagado de
  módulos fue en modo demo, local).

### Fase 1b: header del panel funcional (2026-07-12)
Arreglados los controles muertos del header (`Panel.tsx`), lo último de "se ve
profesional":
- **Buscador = "ir a" real**: filtra los destinos del nav (no bloqueados) y
  navega al elegir. Antes era decorativo.
- **Campana = Avisos reales**: dropdown con pedidos nuevos (si vende) + reseñas
  sin responder (`replied_at is null`) + mensajes sin leer (`unread>0`), badge con
  el total, cada fila enlaza a su tab. Fetch de conteos en Panel; demo muestra
  una muestra. Antes: badge falso, sin acción.
- **"Ver mi página"** (antes "Ver listado"): va a `/negocios?b=<slug>` (tu ficha
  pública), no al directorio general.
- **Free bottom-nav "Pedidos"** respeta el candado → lleva a facturación (antes
  saltaba el bloqueo del sidebar).
- Verificado en navegador real (`shoot-header.js`): buscar "rese" → Reseñas →
  navega; campana muestra "2 reseñas sin responder · 1 mensaje sin leer" reales.
  (Nota harness: los conteos vía header `content-range` no pasan por el relay de
  pruebas; se verificó reenviándolo — en producción funcionan como el badge de
  fotos que ya usa el mismo patrón.)

### Fase 3: vistas reales — "cómo te encuentran" (2026-07-12, migración 0077)
El corazón del producto: que la gente ENCUENTRE los negocios latinos → el dueño
ve cuánta gente lo ve. **Cada vista cuenta** (sin dedup, decisión del founder).
- **Migración 0077** (`supabase/migrations/0077_listing_metrics.sql`, aplicada):
  `business_metric_daily(business_id, day, kind, count)` — **rollup diario** (1 fila
  por negocio·día·tipo, no una por vista → aguanta 1M+/mo). `track_listing_view(slug,
  kind)` (SECURITY DEFINER, anon puede llamar) hace +1 con `on conflict … count+1`.
  `business_metrics(slug, days)` lee el rollup del dueño (RLS: `owner_id=auth.uid()`).
  `kind` extensible (view/search/direction/save) — hoy solo `view`.
- **Instrumentado** (`BizDetail.tsx` + `live.tsx trackListingView`): cada apertura de
  la ficha dispara una vista (fire-and-forget). Verificado: abrir 2× subió el
  contador 3→5.
- **Cockpit** (`DashboardHome.tsx` + `fetchBusinessMetrics`): bloque **"Cómo te
  encuentran · Vistas de tu página · 7 días"** con número real + mini-barras, arriba
  (justo tras KPIs) porque el listado/descubrimiento es el master; en modo
  solo-listado, Vistas es el KPI líder. Estado vacío honesto ("aún sin vistas").
  Reemplazó el teaser "Pronto". Total robusto a zona horaria (suma de las filas de
  7 días); las barras se agrupan por día local.
- **Pendiente (LAUNCH-CHECKLIST):** búsquedas/cómo-llegar/guardados; filtrado de
  bots/rate-limit; excluir auto-vistas del dueño; borde de zona horaria en las
  barras; pestaña "Estadísticas" dedicada (hoy vive en el Inicio).

### Fase 2: Inicio real — cockpit con datos reales (2026-07-12, flag HOME_V2)
Reemplaza el viejo "Resumen" (100% demo, aun para negocios reales) por un
**cockpit real** (`DashboardHome.tsx`), gated por **`HOME_V2`** (independiente de
DASH_V2 — revierte solo el Inicio sin perder el menú nuevo).
- **Todo real para un negocio firmado** (regla #8): saludo + fecha; estado
  Abierto/Cerrado + **% de completitud del listado** (logo/fotos/descripción/
  horario/teléfono/dirección); **Requiere tu atención** solo con señales reales
  (pedidos nuevos si vende, reseñas sin responder `replied_at`, mensajes
  `unread`); KPIs de HOY reales (`business_orders` filtrado a hoy → ventas/
  pedidos, `business_bookings` → reservas, rating real); **cola en vivo** real
  (orders en new/preparing/ready); **gráfica 7 días** real (suma diaria);
  **mejora tu visibilidad** con huecos reales; **actividad reciente** real;
  acciones rápidas → tabs reales. Modo **solo-listado** cambia KPIs a
  rating/reseñas/fotos/perfil y agrega la invitación "Activar ventas".
- **Estados vacíos honestos**: "$0.00 · Aún sin ventas hoy" cuando no hay pedidos
  (no se inventa nada). **Descubrimiento (vistas/búsquedas) NO se muestra** —
  aún sin tracking (Fase 3) — en su lugar un teaser honesto "Pronto".
- **Demo** (explorar sin listado) sí muestra un cockpit de muestra rico.
- Panel oculta su header viejo (título "Inicio" + identity card móvil) bajo
  HOME_V2; `DashboardHome` trae su propio saludo.
- **Verificado** navegador real (`shoot-home.js`): El Sabor muestra sus reseñas/
  mensajes/pedidos activos/gráfica reales sin errores; demo muestra el cockpit
  de muestra. Falta (Fase 3): estadísticas de descubrimiento reales.

## Professional delivery config + zone-derived radius + address decouple (2026-07-12)
Founder request (3 parts, phased): (1) make the seller's delivery inputs
professional like existing platforms — auto-units on distance, `$`/`.00` on
money; (2) the delivery distance based on the business address must actually gate
buyers ("cambié la dirección y todavía está disponible para compras"); (3) **muy
importante** — the delivery address chosen in the cart must NOT change the user's
platform-wide location, it's only for that order.
- **Zones are now the single source of truth for delivery distance + fee.** The
  `Zone` type went from free-text (`rad:"0–1.2 mi"`, `feeEs`/`feeEn`) to numeric
  **`toMi`** (the ring's outer radius, miles) + **`fee`** (dollars, 0 = free).
  `normalizeZone()` (`FulfillmentEditors.tsx`) coerces any pre-existing stored
  shape → numeric, so older businesses keep working; the new shape is written on
  the next save.
- **Professional inputs** (`ZoneEditor`): "Radio de la zona" with a `mi` affix +
  a from-distance hint, "Tarifa de entrega" with a `$` prefix that reformats to
  `X.00` on blur (`0` = Gratis). The Ajustes money fields (`numBox`) also `.00`
  on blur.
- **Gate now derives from the zones.** `zonesRadiusMi()` = the OUTERMOST zone's
  `toMi`; it's mirrored into `settings.delivery_ops.radiusMi` on every save, so
  the existing `delivery_range_check` RPC (0076) enforces exactly the reach the
  owner sees. This fixes part (2): the founder had a 0–5 mi zone but `radiusMi`
  was never set → the gate failed open. The manual "Radio de entrega" field in
  Ajustes was REMOVED and replaced by a read-only derived summary **"Alcance de
  entrega · Hasta X mi ›"** (taps through to the Zonas tab). No migration — the
  jsonb reshape happens on save; the RPC is unchanged.
- **Delivery-address decouple** (part 3): the cart's "+ Nueva dirección" now
  opens the shared `AddressModal` in a new **delivery mode** (`state.tsx`:
  `addressMode`, `openDeliveryAddress()`, `deliveryAddrId`/`setDeliveryAddr`). In
  that mode the modal persists to `user_addresses` and hands the id back to the
  cart via `deliveryAddrId` — it never calls `app.setUserAddress`, so the global
  city/origin is untouched. Modal copy: "Solo para este pedido. No cambia tu
  ubicación en la plataforma." Selecting a saved address in the cart was already
  local (`setAddrId`); this closes the only path (adding a new one) that used to
  move the platform location.
- **Verified 3 sides in a real browser** (owner b@b.com desktop + client a@a.com
  mobile, `tools/mobile-audit/delivery-config.js`): pro zone editor + `.00`
  format; Ajustes derived reach; owner save persisted `radiusMi="5"` (DB-checked)
  and migrated the zone to numeric; tia NYC (104 mi) → warning + Pagar disabled
  while the header stayed "Hazleton, PA"; casa Hazleton (1.4 mi) → enabled;
  "+ Nueva dirección" opens the delivery-scoped modal. El Sabor left with the
  working config (its own 0–5 mi zone now gates at 5 mi).

### Repartidor editor made professional (2026-07-12)
`DriverEditor` (Entregas y envíos → Repartidores) upgraded per the founder:
- **Photo of the driver OR their vehicle** — tap the avatar to upload
  (`uploadImage`, AVATAR_MAX_EDGE, public `post-photos` bucket via the module's
  `onUploadPhoto`; demo falls back to an object URL). Shown as the avatar in the
  editor, the drivers list and the assign-driver sheet; initials remain the
  fallback. `OwnDriver` gained `photo?` + `vehicle?` (flexible jsonb, no
  migration).
- **Proper phone field** using the shared `formatPhone` — digits-only, auto
  "(XXX) XXX-XXXX" (leading `+` keeps international). It even cleans garbage: the
  founder's "570566985ghghfhg" now reads "(570) 566-985".
- **Vehicle field** (optional · "Honda Civic gris · ABC-1234"), shown under the
  driver in the lists — helps the customer recognize who's arriving (Uber-style).
- Verified in a real browser at 390px (`tools/mobile-audit/drivers-editor.js`):
  demo editor uploads + renders a photo, phone formats on type, vehicle saves;
  owner's garbage phone auto-cleans. No artifacts (demo upload uses an object
  URL; owner flow doesn't save).

## Cart: delivery-radius gate (2026-07-11)
Founder request: the cart must know whether the chosen delivery address is
inside the business's delivery range — if not, show a message and disable
Pagar. Built end-to-end, geo math in PostGIS per skill §5 (never app-side):
- **Migration 0076** (`supabase/migrations/0076_delivery_range.sql`, applied):
  `delivery_range_check(slug, lat, lng)` → `distance_m / radius_m / in_range`
  via `st_dwithin` on `businesses.location` (GIST-indexed); radius comes from
  `settings.delivery_ops.radiusMi` (miles, strict-regex parsed). **Fail-open**:
  no radius set, not geocoded, or RPC error → never blocks. Also re-created
  `business_by_slug` to expose `radius` inside the public `delivery` jsonb.
- **Owner** (Entregas y envíos): the delivery radius is now DERIVED from the
  zones' outermost `toMi` and mirrored into `settings.delivery_ops.radiusMi` on
  save (see the 2026-07-12 section above — this replaced the earlier standalone
  "Radio de entrega" field).
- **Cart** (`BizDetail.tsx`): effect re-checks on address/channel change; out of
  range → pink card under the address row with the REAL numbers ("Está a
  104.4 mi y El Sabor entrega hasta 8 mi. Elige otra dirección o cambia a
  Recoger.") and Pagar disabled with label "Fuera del rango de entrega".
  Switching address or to Recoger clears it. `payCart` guard also blocks it.
- **Verified 3 sides** (radius temporarily 8 mi on El Sabor, then reverted to
  baseline): casa Hazleton (1.4 mi) → enabled; tia NYC (104 mi) → warning +
  disabled; both recovery paths; owner field loads/edits the stored value.
  Permanent test `tools/mobile-audit/delivery-range.js` (precondition: a radius
  set on El Sabor). Cart/menu regression suite still passes.
- **Deferred** (LAUNCH-CHECKLIST → Payments): enforce the radius server-side in
  the checkout edge function at charge time (client gate is bypassable), same
  pass as the order re-pricing item.

## "¿igual o cambiar?" flow extended to the sheet + cart steppers (2026-07-11)
The addon add-another prompt ("¿Lo deseas igual o quieres cambiar algo?") that
already lived on the **menu-card** stepper now also drives two more steppers,
per the founder:
- **Customize-sheet footer stepper** (`− 1 +` in "Personaliza tu platillo"): on
  an addon item, `+` prompts; *Cambiar algo* adds the built combo and resets the
  sheet in place so you build a different variant without leaving (`addFromModal`
  gained a `keepOpen` param; `freshSingles` extracted for the reset).
- **Cart per-line stepper**: `+` on a customized line prompts over the cart;
  *Sí, igual* bumps that exact line, *Cambiar algo* opens the sheet for a new
  variant. `lineOwner()` maps a cart-line key back to its (catKey, MenuItem);
  the existing `addPrompt` overlay was extended with an optional `key`.
- **Two real bugs caught by the browser tests while building:** (1) the sheet's
  "Agregar" button passed the click *event* into the new `keepOpen` arg (truthy)
  so the sheet never closed — fixed to `onClick={() => addFromModal()}`; (2) all
  `<Overlay>`s shared `z-[70]`, so a prompt/sheet opened from *within* the cart
  (later in DOM) rendered BEHIND it — added an optional `zIndex` prop to the
  shared Overlay (sheet 80, its prompt 90, add/remove prompts 80). Verified:
  `tools/mobile-audit/stepper-igual-cambiar.js`; menu-card flow
  (`addon-variant-prompts.js`) + `scroll-lock`/`spy-modal-open`/`reorder` still
  pass (Overlay is shared by ~84 modals).

## History reset to "Ordenar de nuevo" + icons kept (2026-07-11)
Founder asked to roll the branch back to the "Ordenar de nuevo" commit and drop
everything after — the Entrega/Recoger toggle experiment, the bordered card, the
muted-text/`surface` background experiments — because he didn't like where those
landed. **Kept**, per his explicit choice: the Lucide → **Tabler icon** swap he'd
approved. Executed as: hard-reset to `9b08fe9`, then re-ran the icon codemod
(`scratchpad/icon-migrate/migrate.mjs`) + the 8 `*Filled` variant fixes on that
clean base, so icons are Tabler with none of the reverted experiments. Both
branches force-pushed (with-lease). **Everything dropped is recoverable** from
the `backup/before-revert-20260711` branch (pushed to origin) if any of it is
wanted back. Note: the Entrega/Recoger is back to the older info-badge row (not
the toggle); the rail chips (⭐/🔁) are emoji again — the emoji→icon polish was
in a dropped commit and wasn't part of the "keep the icons" scope.

## Platform polish batch (2026-07-10) — all verified in a real browser
- **Business single-page restored** (founder correction): the food menu lives ONLY
  in the "Menú" tab of `BizDetail.tsx`; the full-page OrderFlow takeover was
  reverted/deleted. **Rule: menu work is ADDITIVE to the Menú tab — never rebuild
  the single-page.**
- **Menú tab, DoorDash-grade:** sticky category rail pinned under the tab bar +
  scroll-spy (active chip tracks the visible section, auto-centers; frozen during
  click-jumps and reset on tab entry so it never flashes); desktop hover arrows
  ◁▷ on the rail; product-card **quantity stepper** ( + → [🗑]1[+] → [−]N[+] ),
  no more "Pedir" one-tap button.
- **Site-wide modal scroll-lock:** `lib/scrollLock.ts` (ref-counted, iOS-safe)
  wired into the shared `<Overlay>` (≈84 modals) + bespoke overlays
  (ConfirmDialog, photo viewer, Billing cancel, Panel drawer, ModulePage).
- **No demo flash on load:** `useLiveData` gained `loading`; with a real backend
  it starts EMPTY + skeletons (`SkeletonList` in ui.tsx) in Negocios/Eventos/
  Comunidad — fixtures only when no backend or on query error.
- **Constant-layout sticky header on BizDetail:** the compact title's 50px is
  ALWAYS reserved in the sticky bar (Overview overlaps it via `-mt-[46px]`);
  pinning only FADES it (stuck boolean → opacity/transform). Zero layout writes
  on scroll = no jump/flicker; tab switches settle on their first frame.
- **Verification harness:** `tools/mobile-audit/*.js` — Playwright + async curl
  relay for `*.supabase.co` (sandbox proxy can't MITM Chromium TLS; use `execFile`,
  not `execFileSync` — the sync form starves Playwright's event loop under load).
  Key scripts: `single-page`, `menu-sticky`, `menu-stepper`, `spy-click/noflash/
  tabentry`, `scroll-lock`, `sticky-collapse`, `tab-switch`, `no-demo-flash`,
  `desktop-arrows`, `pedidos-restored`. Serve `apps/web/out` with `npx serve out
  -l 4173 --no-clipboard` (NOT `-s` — SPA mode breaks the multi-page export).
  Mint sessions via GoTrue admin generate_link (scratchpad `mint-session.mjs`
  pattern; never echo keys).
- **Supabase security-advisor email:** verified false alarm for user data; the
  only flagged table is PostGIS `spatial_ref_sys` (can't self-remediate — see
  LAUNCH-CHECKLIST §2 for the analysis + options).

### Dashboard Pedidos restored + Cocina handoff grafted in additively (2026-07-10)
Second instance of the same lesson as the Menú-tab correction above, this time
on the business side: a session had fully replaced the dashboard's "Pedidos" tab
(`CustomersModule`'s orders mode — KPI cards, status chips, order-card grid, a
lightweight detail overlay) with a standalone rebuild of the handoff's
`ToLatino Cocina.dc.html` (full "EN VIVO" board). The founder rejected the
replacement and asked for the original screen back with only the NEW
capabilities Cocina brought layered in.
- **Reverted:** `Panel.tsx`'s `orders` tab routes back to `CustomersModule`
  (matches `customers`/`reviews`, as originally); deleted the standalone
  `modules/Cocina.tsx` + its `cocina-ui.js`/`cocina-accept.js` audits (orphaned).
- **Grafted in additively** (same cards/KPIs/overlay, smarter behind them — no
  schema change, `fulfillment` jsonb from 0049/0074 already covers it):
  - **Accept → prep time.** Tapping "Aceptar" on a new order opens a small sheet
    (10/15/20/30 min chips) before advancing to `preparing`; also doubles as the
    reject entry point.
  - **Real driver assignment.** A `ready` delivery order's action button becomes
    **"Asignar repartidor"** (own roster from `business.settings.drivers` +
    external Uber Direct/DoorDash Drive backup) until a driver is set
    (`fulfillment.dispatch='on_the_way'`), then becomes **"Marcar entregado."**
    Previously "Dar al repartidor" silently jumped straight to `completed` with
    no record of who delivered it — a real functional gap now closed.
  - **Reject with a reason** (Artículo agotado / Cocina saturada / Cerramos por
    hoy / Fuera de zona) — customer notified, not charged, same as `cancelOrder`
    under the hood.
  - **Pago y liquidación** in the order-detail overlay: subtotal, tip (100% to
    driver), 15% To'Latino commission, net payout — inserted between the
    existing Total row and the Cancelar/action buttons.
  - **Realtime "new order" toast** (Supabase channel on `business_orders`
    INSERT) — prepends the order + a toast; no modal takeover, accepting still
    happens by tapping the card like any other order.
- **Rule for future Domain-B work (skill §8):** a `.dc.html` filename existing in
  the handoff does NOT mean rebuild that screen from scratch — if an app screen
  already occupies that role, graft the new design's capabilities into it.
- Verified in the real browser as b@b.com (El Sabor): board matches the original
  screenshot-for-screenshot (KPI cards, Clientes/Pedidos/Reseñas toggle, status
  chips — no "EN VIVO"); accept→prep-sheet, reject→reason-sheet, assign-driver
  (own + external), and the payout math ($15.48 sub → -$2.32 commission →
  $13.16 net) all verified live against real orders, then reverted to baseline.

### Design handoff consolidated (2026-07-10)
The founder re-uploaded the **complete, canonical handoff** (`docs/design-
system/`), merging two prior partial uploads from different sessions (a
"Plataforma" handoff and a separate "Pedidos" handoff) into one package with a
proper index. New structure: `README.md` (master index) → `01-plataforma.md`
(Domain A) + `02-pedidos.md` (Domain B, incl. the charge/payout formulas) →
`reference/dc/*.dc.html` (18 prototypes, now including `Ordenar`/`Cocina`/`Menu
Builder`/`tolatino-menu.js`) → `Guia visual.html` (printable contact sheet). The
old `HANDOFF.md` was byte-identical to the new `01-plataforma.md` — removed to
avoid two competing sources of truth. `CLAUDE.md` § Design system rewritten to
point at the new structure.

### Menú tab: category rail jumping on item-sheet open — fixed (2026-07-10)
Founder-reported regression: opening a product's customize sheet snapped the
category rail to the LAST category, even mid-scroll in a middle category. Root
cause: `useScrollLock` pinned `<body>` (`position:fixed`) via a plain `useEffect`
— a frame after the DOM commits — and in that gap the browser's own scroll
anchoring could nudge `window.scrollY` before the lock captured it; once pinned,
the document's collapsed scroll height then fooled the Menú tab's scroll-spy
"near-bottom" clamp into forcing the last category active. Fixed in
`lib/scrollLock.ts` (engage via `useLayoutEffect` — pre-paint, no drift window)
and `BizDetail.tsx`'s spy (freeze recomputation outright while `body.position ===
'fixed'`, holding the already-correct category steady while any sheet is open).
Regression test: `tools/mobile-audit/spy-modal-open.js`. Swept the other spy/
sticky/scroll-lock scripts for regressions — all still pass (shared primitive,
~84 modals depend on it).

### Menú tab: "Ordenar de nuevo" (Order again) — new (2026-07-11)
DoorDash/Uber Eats-style: the Menú tab's category rail now leads with an
"Ordenar de nuevo" chip/section for a signed-in customer who has ordered from
this business before — the items they've ordered, most-recent first, deduped,
still on the current menu. Built additively onto the existing rail/scroll-spy
(same `_pop`/category-key pattern, new `_reorder` key first) and reuses
`itemCard` as-is, so add/customize/cart behaves identically to every other
occurrence of that item on the page.
- **Data:** `useMyActivity()`'s already-loaded `orders` (no new fetch/migration).
  Matched by item display name (either language) against `MyOrder.items`;
  matched by **`slug`**, not `business_id` — `Business.id` is just the feed's
  array index, not the real Supabase id, so id-matching would silently match
  nothing (or worse, the wrong business). Cancelled orders excluded (never
  reached the customer); capped at 8 like Populares.
- **Gating:** signed-out visitors, and signed-in customers with no matching
  order history at this business, never see it — falls back to Populares/first
  category exactly as before, zero behavior change for new customers.
- **Verified:** `tools/mobile-audit/reorder-section.js` (signed-in with real
  order history → chip first, tap "+" → normal add/customize flow, cart state
  stays in sync with the same item's other occurrences on the page; signed-out
  → hidden). Swept `spy-*`/`scroll-lock`/`addon-variant-prompts` for
  regressions from the new first rail entry — all pass (`spy-tabentry.js` and
  `spy-modal-open.js` needed small fixes: they'd hardcoded "Populares" as the
  first category / a fixed scroll pixel offset — now read the actual first
  chip and a document-height fraction instead, so they stay valid regardless
  of which chip legitimately leads).

## How this project ships (read first)
- **Monorepo:** pnpm + Turborepo. App: `apps/web` (Next.js 15 App Router,
  `output: 'export'` static export, Tailwind). Build: `pnpm --filter @tolatino/web build`.
- **Branches / deploy flow:**
  - Develop on the **current session branch** (it churns each session — pin it here
    per session, don't hardcode an old one). This session: **`claude/progress-md-review-r5bdar`**.
  - Release by **fast-forward-merging** into **`claude/tolatino-repo-setup-1efdil`**
    (the branch **Vercel** auto-deploys). Sequence every time (swap in the current
    session branch for `<dev>`):
    ```
    git add -A && git commit -m "…"
    git push -u origin <dev>
    git checkout claude/tolatino-repo-setup-1efdil
    git merge --ff-only <dev>
    git push -u origin claude/tolatino-repo-setup-1efdil
    git checkout <dev>
    ```
  - Git identity for commits: `user.email noreply@anthropic.com`, `user.name Claude`.
- **Live site:** `tolatino.vercel.app` (Vercel; Cloudflare Pages is the eventual target per `CLAUDE.md`).
- **Non-negotiables that bite every task:** design tokens only (no raw hex in
  `className`); Spanish-first `L('es','en')`; mobile-first; **#6 paste anything
  runnable (SQL/env/commands) in FULL in chat** (founder is copy-paste, no CLI);
  **#7 record every deferral in `docs/LAUNCH-CHECKLIST.md`**; **#8 benchmark every
  section vs. the category leader (Yelp/DoorDash/Amazon/Nextdoor/Uber/Eventbrite/…)
  and ship a feature-complete competitor — no stubbed/fake states as final.**
- **Sandbox limit:** Supabase / Photon / Vercel are network-blocked here — features
  are verified by **build + a Playwright mobile audit**, not live E2E.

## What's built and live

### Consumer app (`/comunidad`, `/negocios`, `/eventos`, …)
- **Comunidad** (Nextdoor-style home): real posts/comments/likes/saves/**polls**/
  **follows**, Supabase **Realtime** (live likes/comments + new-post pill),
  Instagram-style photo carousel, per-city barrios, post "…" menu (edit/delete/
  report), profile+feed nav card, follow system.
- **Negocios** (Yelp-style): full 15-category taxonomy + ~418 subcategories, real
  subcategory filtering, **dynamic per-category feature filters** (Sugeridos +
  Características), distance filter (5–50 mi), **Verified vs Sin-verificar card
  variants** (verified always on top), **Saved businesses** (♥ persists: localStorage
  guests + Supabase signed-in), **live open/closed status from business hours**
  ("Abierto · cierra en 30 min" / "Cerrado · abre mañana 9am"), real "Publicar
  negocio" (**now collects a weekly Horario editor + Características picker** →
  new listings ship with live open/closed status and are filterable immediately),
  **BizDetail** page with a focused-tab mode (hero collapses; tab bar
  pinned to the measured header height; seamless transitions; touch-pan-x).
- **Geo:** own city gazetteer (`cities` + `search_cities`/`nearest_city`) + free
  street-address pipeline (Photon + US Census + synthesized suggestions, US-only,
  locality-aware). Saved-addresses manager. **Migration target: Pelias (config flip).**
- **Eventos** + "Muy pronto" placeholders (Transporte/Bienes Raíces/Autos/Trabajos).
- **Food ordering lives in the business single-page "Menú" tab (2026-07-09).**
  The client ordering experience is the DoorDash-grade **Menú tab** inside
  `BizDetail.tsx` (delivery/pickup chips with fee+ETA, horizontal category tabs,
  ⭐ Populares, item cards → item sheet with addon groups + special instructions →
  cart with tip/fees/AMIGO10 → checkout → real Stripe). Wired to real
  business_by_slug + business_menu_by_slug + marketplace-checkout.
  **Scope correction (founder):** an earlier pass replaced the ENTIRE business
  single-page with a full-screen `OrderFlow` component for orderable restaurants —
  the founder wanted the original single-page design kept and only the **Menú** tab
  to carry the food menu, so that full-page takeover was reverted and
  `screens/order/OrderFlow.tsx` + `orderIcons.tsx` deleted. Rule going forward for
  the menu: **only ADD missing professional touches to the Menú tab; don't rebuild
  the single-page.** Verified in the real browser from the Negocios list: El Sabor
  opens as the single-page (hero · Overview/Menú/Tienda/Relacionados/Reseñas tabs ·
  Lo que ofrece · Horario · Fotos · Ubicación · Reseñas); the Menú tab orders
  (add → cart bar). Phase 2 **Cocina** is rebuilt pixel-perfect
  as `apps/web/src/screens/negocio/modules/Cocina.tsx` — the restaurant order-
  management board (today stats + EN VIVO · status tabs Nuevos/Preparando/Listos/
  En camino/Completados · order cards) → order detail (status banner, progress
  timeline, customer + address card, "Para preparar" items, assigned-driver card,
  Pago y liquidación showing the 15% To'Latino commission + net payout) → incoming-
  order dialog (prep-time chips, Aceptar/Rechazar) → assign-driver / reject /
  notifications bottom sheets. Wired to REAL `business_orders` for the owner's
  active business (RLS owner-updatable) with realtime; the `orders` panel tab now
  routes here (was CustomersModule). Verified in the real browser as the El Sabor
  owner (b@b.com): board + detail render pixel-faithful on real orders, and
  clicking **Aceptar** flips the order to `preparing` in the DB AND notifies the
  client (a@a.com) — the full Cliente·Negocio·Plataforma loop. **Phase 3 Menú
  (builder) is the next pass.**
- **Food ordering — DoorDash-grade (2026-07-09, migrations 0074+0075):** El Sabor
  de Quisqueya carries a REAL 150-dish menu (15 categories × 10, 9 reusable
  modifier groups, bilingual, seeded via `scripts/seed-menu-sabor.mjs` in the exact
  shape the Food module edits). Cart checkout: **Entrega/Recoger** toggle, saved-
  address picker (+ new address), delivery instructions, driver tip (10/15/20%/
  custom, 100% pass-through), full fee breakdown that EXACTLY matches the Stripe
  charge, minimum-order + address guards (server-side from the business's own
  `settings`). Client tracking in Mi cuenta: live status timeline (Ordenado →
  Aceptado → Listo → En camino → Entregado), receipt, cancel while new, "Reportar
  un problema" → real chat to the business. Owner side (Entregas board): accept →
  ready → assign driver (roster CRUD, empty-start for real businesses) → picked
  up → on the way → delivered; card shows address, instructions, tip; client is
  notified at EVERY transition (order_status incl. dispatch states). Verified E2E
  autonomously (paid $24.87 delivery order → fulfilled → 6 client notifications)
  then cleaned.
- **Marketplace payments (Stripe Connect, test mode — 2026-07-09):** real card
  checkout for **Pedidos** (cart / one-tap), **Boletos** (Eventos tier picker),
  **Reservas** (service deposit) and **Renta** (rental fee) via **destination
  charges** (migrations 0072 + 0073). Buyer pays `P + 5%`, To'Latino keeps
  `15% of P` (`application_fee`), the seller's connected account gets `≈P − 10%`.
  Flow: `startMarketplaceCheckout` → `marketplace-checkout` Edge Function stages the
  purchase in `pending_purchases` + builds a Stripe Checkout Session → buyer pays →
  `stripe-webhook` **fulfills** (`fulfill_order` / `fulfill_event_tickets_multi`) +
  records `payments`; failed fulfillment (e.g. tickets sold out) **auto-refunds**.
  Sellers without a connected account keep pay-on-pickup (orders) / free-issue (free
  tiers). Migration **0072**. Return toast via `?pay=success|cancel` (PurchaseReturnToast).

### Business dashboard (`/negocio`)
Reached via user menu → **"Panel de negocio"**. Plan- (free/verified/premium) and
rubro-aware. Built from a **mobile handoff** (`handoff_business_mobile/`, in chat
uploads, not committed).
- **Shell:** desktop sidebar + mobile drawer, **dark top bar on Inicio** (light
  elsewhere), business **identity card** on Inicio, **mobile bottom-tab bar**
  (Inicio · Pedidos · Mensajes · Reseñas · Más→drawer).
- **Inicio/Insights home:** dark live-revenue hero (+ pedidos/ticket/nuevos row),
  needs-attention, 7-day KPIs, metric-switch chart, channel mix, live order queue
  (horizontal on mobile), top sellers, pulse, module health, activity, Premium
  band; **Free variant** = verify checklist + plan compare.
- **All 9 modules** (files in `apps/web/src/screens/negocio/modules/`):
  Updates, Billing, Customers/Orders/Reviews, Staff/Jobs, Rental, Events,
  Products/Shipping, Services/Bookings, Food menu. Each mobile-first → desktop,
  tier+category aware, **real interactive state (fixture/demo data, local
  `useState`)**: mode toggles, sub-tabs, filters, wizards, edit flows, toasts.
- **Full-page flows (no cramped popups):** every edit/create/detail/wizard was
  converted from bottom-sheet popups to a shared **`ModulePage`** full-screen page
  (`modules/_page.tsx`): own header (back/title/action), natural scroll, sticky
  footer actions, safe-area + keyboard friendly.
- **Wiring:** `screens/negocio/Panel.tsx` routes each tab to its module via
  `RICH_MODULES`. `screens/negocio/tabs.tsx` = nav model + `PanelCtx`
  (`{ L, es, tier, rubro, ci, isFree, isPremium, mods, go }`).

### Quality tooling
- **`tools/mobile-audit/`** — Playwright harness: at 392px it visits every dashboard
  tab, clicks every chip row, opens every sheet/wizard (first *visible* opener) and
  steps wizards, flagging any horizontal overflow / off-screen element / overlay
  hscroll, with screenshots. **Run after any dashboard UI change; must report
  "0 violation state(s)".** The harness counts *violations* only (it does not emit
  a total-states figure, and no run screenshots/logs are committed) — a clean run
  prints `0 violation state(s)`. Last clean run: **0 violations** (~125 states walked).
- iOS input auto-zoom disabled via `maximum-scale=1` in `apps/web/app/layout.tsx`
  viewport (kept multi-field forms from blowing past the screen).

## ⚠️ ACTION NEEDED FROM THE FOUNDER (apply in the SQL Editor)
- ⏳ **Apply `0065_events_phase2.sql`** (idempotent) — Eventos Phase 2: individual
  admissions (`event_tickets.admitted` + redesigned `checkin_ticket`), waitlist
  (`event_waitlist` + join/leave/notify + seat-freed trigger), promo codes
  (`event_promo_codes` + `validate_promo` + `buy_event_tickets_multi` gains `in_promo`
  + closes the hidden-tier hole), and `event_by_slug` gains `organizer_slug` +
  `events_by_owner`. Full SQL pasted in chat.
- ✅ **`0064_events_multi_ticket_search.sql` applied** (2026-07-07) — Eventos Phase 1:
  `buy_event_tickets_multi` (atomic multi-tier order) + `search_events` (server FTS,
  category/free filters, paginated) + widened `search_tsv` trigger; retires the old
  generated `search_vector`. Full SQL pasted in chat.
- ✅ **`0063_events_discovery_integrity.sql` applied** (2026-07-07) — Eventos P0
  hardening: past/cancelled events dropped from discovery, drafts hidden, RSVP on
  cancelled blocked, `owner_events_summary()` + `cancel_event()`.
- ✅ **`0013`→`0018` applied** (2026-07-04, verified: single 16-arg `create_business`).
  The old "not unique / owner_id missing" blocker is resolved; publish + Hazleton
  ownership work.
- ⏳ **Apply `0019_business_photos.sql` + `0020_business_modules.sql`** (both
  idempotent) so the dashboard's **Fotos** and **Configurar módulos** persist. The
  combined SQL is pasted in chat.
- ⏳ **Apply `0031_profile_settings.sql` + `0032_consumer_transactions.sql`** (both
  idempotent) — power Mi cuenta (bio/settings) and the **two-sided transaction
  loop** (orders/bookings gain `user_id`; new `business_rentals`, `event_tickets`,
  `event_attendance`; dual customer↔owner RLS). Combined SQL pasted in chat.

## Dashboard → real data (in progress, 2026-07-04)
Building the business panel section-by-section from fixture/demo into real,
Supabase-backed tools. **Foundation done:** `lib/bizAdmin` loads the signed-in
owner's business(es) by `owner_id`, exposes the active one + a switcher + a writer
(`update`) that persists to the real `businesses` row (RLS "update own business");
`app/negocio/layout.tsx` provides it; `Panel.tsx` derives identity/plan/rubro from
the real business, with a **demo sample business** when nobody's signed in (edits
local-only) so every editor stays explorable + auditable.
- [x] **Listado · Información general** — real edit/save (name, category, tagline,
  price, phone, address, description) → `businesses`.
- [x] **Listado · Horario** — weekly HoursEditor + manual fallback → `businesses.hours`.
- [x] **Listado · Fotos y media** — gallery on `business_photos` (0019); WebP upload
  to the `post-photos` bucket; cover + delete.
- [x] **Listado · Listados relacionados** — real portfolio of the owner's businesses.
- [x] **Configurar módulos** — toggles persist to `businesses.modules` (0020).
- [x] **Catalog modules — real CRUD** on the shared `business_items` table (0021,
  `lib/bizItems.ts`): **Menú de comida** (add/edit/delete/86), **Servicios**
  (add/edit/delete), **Productos** (add/edit/delete), **Renta** (add). Each keeps
  its rich handoff UI + demo seed (local-only) and persists for real owners.
- [x] **Eventos** — create (create_event RPC 0022) + delete + load owner's events.
- [x] **Reseñas** — load real reviews + owner reply (reply_to_review RPC 0023).
- [x] **Novedades** — post + delete on business_updates (0024).
- [x] **Personal + Empleos** — business_staff (private) + business_jobs (public) (0025):
  load, invite/add, remove, post job.
- [x] **Zonas de envío + Repartidores** — persist config to businesses.settings (0026).
- [x] **Ajustes** — real profile links, ES/EN, notification prefs (businesses.settings),
  account (email + sign out).
- [x] **Mensajes** — real inbox: conversations + threads + send (business_conversations
  / business_messages 0029), mobile list↔thread, demo sample inbox.
- [x] **Pedidos** — orders list + status changes on business_orders (0028).
- [x] **Clientes** — customer directory on business_customers (0030).
- [x] **Pagos** — real revenue from completed orders **+ live Stripe Connect
  onboarding** (Express account → "Recibiendo pagos" state, charges_enabled synced
  via the `connect-status` fn). Sellers get bank payouts through destination charges.
- [x] **Plan y facturación** — reflects the business's real tier (via bizAdmin) and
  runs **real Stripe subscription Checkout + Billing Portal** (0070; `stripe-checkout`
  / `stripe-portal` / `stripe-webhook` Edge Functions flip the tier on payment).
- [x] **Reservas** — booking list + status lifecycle on business_bookings (0027).

**Every dashboard section is now real-data backed** (payouts honestly deferred to a
payment processor). Catalog/list rows, edits, statuses and messages persist to
Supabase for signed-in owners; a demo sample business keeps the whole panel
explorable when nobody's signed in. Aggregate KPI/rollup cards and a few
visual-only surfaces (calendar/floor-plan grids) stay as fixtures where there's no
table to bind. Verified per batch by build + `tools/mobile-audit/audit.js` (125
states, 0 overflow at 392px). **Founder must apply migrations 0019–0030** (pasted in
chat) for the data to persist in production.

Every dashboard-real change: **build + `tools/mobile-audit/audit.js` (125 states,
0 overflow at 392px)**; the demo mock exercises the real editors.

## Consumer transaction loop — DONE (2026-07-05)
The two-sided loop is complete and live. A customer creates a transaction from a
listing (or Eventos) and the SAME row shows in BOTH Mi cuenta and the business
dashboard (dual customer↔owner RLS, migration 0032).
- **Create actions** (`lib/myActivity.tsx` — `MyActivityProvider`, signed-in only;
  guests routed to `/entrar`):
  - `BizDetail` — **Pedir** (menu/shop order), **Reservar** (Servicios booking),
    new **Renta** tab + modal (period/qty/date + refundable deposit), event RSVP.
  - `Eventos` — **Voy** RSVP + **Comprar boletos**.
- **Mi cuenta (`/cuenta`)** manages all five: Mis pedidos · Reservas · Rentas ·
  Boletos · Voy a asistir (status pills, live counts).
- **Business side** sees the same rows: orders → **Pedidos/Pagos**, bookings →
  **Servicios**, rentals → **Renta · Solicitudes** (confirm/hand-out/return),
  tickets → **Eventos · Boletos** (buyer + qty + code + total).
- Consumer objects carry the public `slug` (not the uuid); creators resolve
  slug→uuid internally. Verified: tsc, build, and mobile audits all green —
  dashboard 0, **consumer 0/20** (`tools/mobile-audit/consumer.js`), publish 0.
- Deferred (see LAUNCH-CHECKLIST §5): business-side RSVP **names** (attendance has
  no name column); rentals/tickets are request-stage, **not charged** yet.

## Professional-depth arc — DONE (2026-07-07)
A push to make the consumer + owner experience compete with any existing platform.
Each item is real-data backed and verified (tsc + build + RPC-intercepted Playwright,
0 pageerrors / 0 overflow at 392px). Migrations pasted in chat; founder applied
**0046–0057** (`0055`+`0056`+`0057` applied 2026-07-07).
- **Renta module** rebuilt to Servicios-level depth: categories, per-item config,
  add-ons, policies/availability, calendar day-picking + qty + deposit; consumer
  Renta tab with availability truth (no double-booking across Rentas/Productos/
  Reservas via SECURITY DEFINER busy-date / seat-load RPCs).
- **In-app chat** (`lib/chat.tsx`): realtime customer↔business threads
  (`business_conversations`/`business_messages`), "Enviar mensaje" from the contact
  sheet, inbox + thread subscribe.
- **Auto notifications** (`lib/notifications.tsx`, migration 0054): DB triggers
  generate a per-user feed on real events; realtime badge + panel when signed in,
  fixtures when logged out.
- **Scalable search** (migration **0055**): Postgres FTS (`search_tsv` trigger-
  maintained tsvector + GIN + trigram fuzzy) via `search_businesses` RPC; Negocios
  calls it debounced, falls back to client filter when empty. NOTE: `search_tsv` is
  trigger-maintained, not a GENERATED column (`to_tsvector` is STABLE → 42P17); 0055
  also drops the superseded 0001 `search_businesses` overload so the grant is
  unambiguous (42725).
- **Real reviews** (migration **0056**): one review per user per business, author
  RLS, `post_review` upsert, `reviews_by_slug`, trigger syncing `rating`+`reviews_count`.
- **Owner reply on the public listing** (migration **0057**): `reviews_by_slug`
  widened to return `reply_es`/`reply_en`/`replied_at`; BizDetail shows the business's
  response under each review.
- **Real time-slot booking** (no migration): the Servicios booking sheet generates
  time slots from the business's real open hours × the service duration
  (`bookingSlots` in `lib/hours.ts`), drops past slots for today, blocks closed days,
  auto-selects the first slot. Replaces the old fixed 9/12/3/6 list.
- **Photo reviews** (migration **0058**): `reviews.photos text[]`; `post_review`
  takes photo URLs (old 3-arg overload dropped); `reviews_by_slug` returns photos.
  Reviewers upload in the "Tu reseña" sheet (reuses `uploadPostImages` → `post-photos`
  bucket, no new policy); the reviews list shows a thumbnail row per review.
  NOTE both 0057 and 0058 **drop** `reviews_by_slug` before recreating — adding a
  return column can't be done via CREATE OR REPLACE (42P13).
- **Per-slot booking capacity** (migration **0059**): `booking_load_by_service`
  regrouped by exact slot timestamp; the booking sheet disables only full slots
  ("Lleno"), shows "N libres", auto-selects the first open slot, greys a day only
  when all its slots are full. Slot↔booking matched by epoch(ms) (timestamptz
  round-trip). Fixes the old over-blocking where any capMax bookings marked the
  whole day full.
- **Per-variant / SKU stock** (no migration): each sellable variant (cartesian over
  a product's single option sets) carries its own count in
  `business_items.attrs.variantStock` (shared `variantCombos` key in productConfig).
  Dashboard Products wizard shows a per-variant stock grid; the consumer item sheet
  marks out-of-stock variant values "Agotado"/disabled, opens on the first in-stock
  one, caps qty, and shows "Solo N disponibles". Falls back to product-level stock.
- **Customer self-service cancel** on Mi cuenta (early orders/bookings/rentals).
- **Realtime Mi cuenta** (migration **0060**): the customer's transaction rows update
  live when the owner advances a status. `MyActivityProvider` subscribes to the five
  transaction tables (user_id-filtered) → `refresh()`; 0060 publishes them to
  `supabase_realtime`. Reuses the notifications realtime pattern.
- **Global search suggestions → server FTS** (no migration): header business
  suggestions call `search_businesses` (debounced), so the preview surfaces the full
  catalog, not just the loaded geo slice. Closes the Handoff global-search rule.
- **Eventos y boletos → Eventbrite parity** (migration **0061**): `event_tiers`
  (price/capacity/sales-window per tier), `buy_event_tickets` (no overselling),
  `event_by_slug`, `checkin_ticket`, triggers for tier.sold + going_count + organizer
  notifications. Consumer: rich detail (full date, directions, organizer,
  add-to-calendar ICS, share) + real tier picker + entry-code ticket in Mi cuenta.
  Dashboard: real tier editor + code-based check-in + real KPIs. Deferred (honest):
  Stripe charging, SES email, QR-image + camera scanner, map tiles, recurring/drafts/
  promoters.
- **Professional event-creation wizard** (migration **0062**): rebuilt to Eventbrite
  standard — cover-photo upload + 13-category picker (step 1), native date + start/end
  time pickers + online toggle + **geo address autocomplete (searchAddress → real
  lat/lng)** (step 2), **multi-tier ticket builder** (step 3), review + per-step
  gating (step 4). Backed by an atomic `create_event_full` RPC (event + cover + geo +
  end-time + all tiers). Replaces the thin free-text wizard.
- **Eventos P0 — correctness & honesty pass** (migration **0063**): after a 10-agent
  ultracode audit, fixed the discovery + counting bugs and de-faked the organizer
  dashboard. `events_near` now returns only published + upcoming (index-accelerated
  `st_dwithin`); `event_by_slug` hides drafts (cancelled still resolves → "Cancelado"
  banner); a DB guard blocks RSVP on non-published events. New `owner_events_summary()`
  drives real KPIs + rail (was hardcoded 186/$14.2k/212); Pasados/Asistentes/sales-
  sparkline now built from real `event_tickets`. New `cancel_event()` **soft-cancels**
  (tickets preserved) + notifies every attendee (`event_cancelled` kind) — replaces the
  old hard-delete that cascaded away sold tickets. Removed unbacked controls (wizard
  online toggle + visibility chips, 5 fake Ajustes toggles) and the fixture Borradores/
  Recurrentes/Promotores tabs → honest "Muy pronto". Fixed the "asisten" double-count
  and the date-chip year collapse. Verified: tsc + build + `eventos-p0.js` audit (0
  overflow). Newly-deferred items (online events, visibility, drafts, recurring,
  promoters, Ajustes controls, `/eventos/[slug]` page) logged in LAUNCH-CHECKLIST.
- **Eventos Phase 1 — deep-link, atomic order, event search** (migration **0064**):
  designed via a 6-agent ultracode workflow (map → synthesize → adversarial critique).
  (1) **Shareable deep link** `/eventos/?e=<slug>` (query-param pattern; a static
  `/eventos/[slug]` route is impossible for UGC under `output:'export'`) — refactored the
  detail from an index to an OBJECT so deep-linked/server-search results open; share URL is
  basePath-safe; unresolved slug flashes a message. (2) **Atomic multi-tier purchase**
  `buy_event_tickets_multi` (locks all tiers deterministically, all-or-nothing, one
  aggregated organizer notice; success lists every code by tier) — replaces the per-tier
  loop that could leave a partial order. (3) **Server event search** `search_events` (FTS +
  trigram, published+upcoming, category/free filters in SQL, ranked+paginated) wired into
  `/eventos` (debounced + numbered pager) and the header dropdown; retired the narrow 0002
  generated `search_vector`. (4) **List-page static metadata** + per-event client title/meta
  (browser + Googlebot; NOT social unfurls — SSR deferred honestly). Verified: tsc + build
  (metadata baked) + audit 0 overflow + deep-link strips `?e=`.
- **Eventos Phase 2 — run-the-event core** (migration **0065**): designed via a 6-agent
  workflow. **Individual admissions** (`event_tickets.admitted` + a redesigned
  `checkin_ticket(code,qty)` that admits N of a group per scan, row-locked; dashboard
  `admitted/qty` + "admit remaining" + per-buyer +1; Mi cuenta live progress). **Real QR**
  (`qrcode-generator`, zero-dep MIT) — attendee's scannable ticket in Mi cuenta + an
  organizer `BarcodeDetector` camera scanner (Chromium/Android) with a clean code-entry
  fallback; the fake `QrGrid` is gone. **Waitlist** (`event_waitlist` + join/leave/notify +
  seat-freed trigger) — consumer "Avísame" on sold-out tiers (notifies, doesn't hold) +
  organizer tab/KPI/blast. **Promo codes** (`event_promo_codes` + `validate_promo` +
  `buy_event_tickets_multi` gains `in_promo`) — access codes unlock hidden tiers (real;
  closed a latent hidden-tier-purchase hole; tier editor gains an "Oculto" toggle); %/$
  discounts adjust the snapshotted total only. **Map embed** (zero-dep OSM iframe) +
  **organizer profile** (`events_by_owner` → their other upcoming events). Verified: tsc +
  build + QR structural check + 0 overflow.
- **Honestly deferred** (need the founder's external setup, in LAUNCH-CHECKLIST):
  payments (Stripe), push/email delivery (VAPID+Edge Function+SES), **per-event crawler/social
  SEO (needs SSR/ISR)**, single-ticket refund UI (activates the waitlist seat-freed path),
  iOS camera QR (jsQR/zxing), recurring events. Not shipped as fake/broken.

## Next steps (priority order)
1. **Founder E2E-tests marketplace checkout** with card `4242 4242 4242 4242` (any
   future date / any CVC / any ZIP): buy a Pedido from El Sabor (`hz-sabor-quisqueya`)
   and 2× "Salsa mix" tickets → confirm in Stripe the split (buyer `P+5%`, platform
   fee `15% of P`, seller transfer `P−10%`) + the order/tickets appear in "Mi cuenta".
2. **Before real-money launch:** rotate the `sk_test` key, re-price orders/bookings/
   rentals against their config server-side, wire `%`/`$` promos into paid ticket
   checkout, and add a real rental security-deposit hold (see
   `docs/LAUNCH-CHECKLIST.md` → "Payments — marketplace checkout").
4. Continue **`docs/LAUNCH-CHECKLIST.md`** deferrals: delivery logistics, saved-biz
   cross-city, claim/verify, moderation, push, next-intl.

## Map of key files
```
apps/web/app/(cliente)/…               consumer routes + layout (providers)
apps/web/app/negocio/page.tsx          business dashboard entry → PanelScreen
apps/web/src/screens/negocio/
  Panel.tsx                            dashboard shell + tab dispatch (RICH_MODULES)
  tabs.tsx                             nav model, PanelCtx, CAT_INFO
  Insights.tsx                         Inicio home (paid + free)
  modules/_page.tsx                    ModulePage + Toast (full-screen page)
  modules/{Listing,Hours,Photos,Related}.tsx   Listado section — REAL (bizAdmin-backed)
  modules/{Food,Products,Services,Events,Rental,Staff,Customers,Billing,Updates}.tsx  (still fixture)
apps/web/app/negocio/layout.tsx        provides BizAdminProvider
apps/web/src/lib/bizAdmin.tsx          real owner-business loader + writer (RLS)
apps/web/src/lib/bizItems.ts           CRUD over business_items (catalog modules)
apps/web/src/screens/{Negocios,BizDetail,Comunidad,…}.tsx   consumer screens
apps/web/src/lib/                      state, live (Supabase), savedBiz, hours,
                                       geo, addresses, follows, interactions, i18n
apps/web/src/components/PublishModal.tsx   FAB publish flow (post / negocio / evento)
apps/web/src/components/HoursEditor.tsx     weekly Horario editor (→ businesses.hours)
apps/web/src/data/fixtures.ts          demo data + taxonomy (SUBCATS, FEATURES_*)
supabase/migrations/00xx_*.sql         all migrations (paste into SQL Editor)
tools/mobile-audit/                    Playwright audits: audit.js (dashboard) + publish.js (publish flow)
CLAUDE.md (repo root)                  master project memory
docs/{LAUNCH-CHECKLIST.md,PROGRESS.md,design-system/}
```
