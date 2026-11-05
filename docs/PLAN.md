# To'Latino v2 — Plan de construcción

> **Estado: BORRADOR para aprobar (5 nov 2026).** Nada de código hasta que el
> fundador apruebe este plan y responda las decisiones de la sección 3.
> Este documento es la fuente de verdad del *código*; la fuente de verdad del
> *producto y el diseño* es el proyecto de Claude Design, copiado en
> `docs/diseno/` (ver sección 1.3).

---

## 0. Cómo leer este plan

- **Sección 1** — lo que entendí del diseño. Si algo aquí está mal, el plan está
  mal: corregir primero.
- **Sección 2** — las reglas del diseño que el código obedece literalmente.
- **Sección 3** — las decisiones que cambian el plan y que solo el fundador puede
  tomar. Cada una trae mi recomendación.
- **Sección 4–6** — arquitectura, datos y fases, escritas asumiendo las
  recomendaciones de la sección 3. Si una decisión cambia, se ajusta aquí.
- **Sección 7–9** — método de trabajo, costos externos y lo que NO se construye.

---

## 1. Lo que entendí del diseño

### 1.1 Qué es
**To'Latino** es una plataforma *all in one* para latinos en Estados Unidos,
**por ciudad** (piloto: **Hazleton, PA**, comunidad dominicana), con **tres
módulos** en la v1: **Negocios** (directorio + transacciones por categoría),
**Comunidad** (muro tipo barrio con votos ±, Hoy en el barrio, gamificación con
10 rangos, El Patio: dominó y parchís) y **Eventos** (boletos con QR y modo
puerta). Alrededor: **Mi cuenta** (vecino), **Panel del negocio v2**, **Super
Admin** (17 secciones, 7 roles), **El Compa** (asistente de IA con Claude, en
los tres lados), **Soporte**, **Publica tu negocio v2** (onboarding de pasos
guiados), **Onboarding del vecino** (5 pasos), **Ciudad** (radio con mapa /
ciudad próximamente), **Buscar**, **Recomendar un negocio**, **Recuperar
negocio** y **Licencia**.

Resuelve: el latino "chambero" (hobby, 2–3 días a la semana, sin empresa) no
tiene dónde publicar; las plataformas grandes sirven solo a establecidos; hoy
todo es boca a boca y llamada telefónica. **Confianza y honestidad como
función**: precios completos, lo que el negocio NO puede hacer, esperas reales,
lo retenido vs lo cobrado, «Solicitud enviada» nunca «confirmada».

### 1.2 Las piezas, con su tamaño real
| Pieza | Qué incluye | Fuente |
|---|---|---|
| **17 categorías** | Auto · Belleza · Comida · Hogar · Noche · Mercados · Fiestas · Doctores · Profesionales · Tiendas · Transporte · Educación · Niños · Deporte · Iglesias · Bienes Raíces · Venta de Autos. Cada una con subcategorías (30–60), familia de filtros, **tesis** propia, módulos permitidos y flujo propio (cita, pedido, cotización, renta, mesa, boleto, visita, cover…). **Comida es la categoría modelo**; las demás copian su estructura y cambian solo lo que su tesis exige. | `docs/diseno/plan/taxonomia-negocios.md` · memoria §3 |
| **Página del negocio** | Base: Resumen · Novedades · Eventos · Staff · Relacionados · Jobs · Reseñas. Por módulo: Menú · Reservaciones · Servicios · Tienda · Renta. Una pestaña aparece **solo si el módulo está activo Y tiene contenido**. Pro = pestañas; Free = una sola página, 5 ítems, 3 fotos. | memoria §3 · 3 nov |
| **Pro / Free** | «Lo que tenemos es Pro; Free es lo básico para empujar a Pro.» Free: módulo principal + pedidos/citas en línea hasta 10/mes con pago en el local, 3 fotos, 5 ítems. Pro **$14.99/mes solo mensual**, prueba 30 días sin tarjeta, código promotor `HZL30` = 60 días. Lo Pro que vence **se duerme, no se borra**. | memoria 3 nov · `onboarding-negocios.md` §5 |
| **Transacción** | Operación única (pedido · cita · reservación · cotización · renta · boleto) con estados PENDIENTE → confirmada / otra hora / no confirmada / vence sola. Depósito **retenido al enviar**, se descuenta del total. Stripe Connect para cobrar con tarjeta; sin Stripe = paga en el local. Comisión **solo** sobre pagos con tarjeta. Copy del dinero: Retenido · Cobrado · Liberado · Devuelto. | modelo de datos reglas 4, 6 · plan |
| **Panel del negocio v2** | Hoy · Clientes · Mensajes · Tu página · Lo que vendes (por módulo + «Tu herramienta» por categoría) · Cobros y plan · Insights · Moderadores · Más · El Compa. 85 % de los negocios no usa computadora → el panel vive en el teléfono. | memoria §2d · `CLAUDE-plan.md` Dashboard |
| **Super Admin** | 17 secciones en 4 grupos (Operar · Contenido y oferta · Dinero y crecimiento · Control), 12+ colas con SLA, 7 roles con matriz de permisos, auditoría inmutable, acciones sobre terceros con motivo + aviso + apelación. **Regla literal: maneja cada píxel**; todo lo que nace en el producto nace con su fila aquí **en el mismo turno**. | `admin-dashboard.md` · `admin-implementacion.md` |
| **Comunidad** | Muro simple (PostCard 2ab + VoteBar pastillas), publicar, comentar, mejor respuesta, encuestas, Hoy en el barrio (avisos 24 h de negocios), rangos (Recluta → …), monedas, Tabla del Barrio, El Patio (mesa pública espera 60 s y «La computadora» llena, mesa privada desde Teniente, torneos). | memoria · `flujos-transversales.md` §6 |
| **Eventos** | Publica tu evento → EN REVISIÓN → publicado; tipos de boleto, mesas, extras, cortesías, códigos, serie de fechas; boleto QR; modo puerta (el portero **solo escanea**, D1); **no hay venta en la puerta en V1**. | memoria rev-evt · D1 |
| **El Compa** | IA (Claude) para vecinos (Soporte + «Ayuda» de cada operación), panel del negocio (asistente + **respuestas automáticas solo Pro**), copiloto del equipo en el admin. Prepara acciones que la persona confirma; **nunca mueve dinero ni toca la cuenta**. Canales app/web, WhatsApp, SMS. Siempre dice que es IA; «Con una persona» siempre visible. | memoria §2 (22–23 oct) · modelo área 12 |
| **Cuenta** | **Una sola cuenta: teléfono + código (OTP)** para todo (cliente, dueño, equipo, portero, repartidor, equipo To'Latino). Permisos por `BusinessMember` / `StaffMember`. Cuenta borrada: 30 días de gracia, luego se borra todo salvo lo de Stripe (D5). | modelo regla 2 · D5 |
| **Apps** | Diseño declarado: app del usuario, app del negocio, app de delivery (repartidor **del negocio**), app de check-in; desktop para plataforma, panel, admin y Mi cuenta. Una cuenta entra a todas. | `CLAUDE-plan.md` Arquitectura de apps |
| **Modelo de datos 1.2** | ~130 entidades en 13 áreas, con estados, dónde se gestiona cada una (espejo) y de dónde sale en el prototipo. Es la especificación de la base de datos. | `docs/diseno/entrega/modelo-datos.md` |
| **Sistema de diseño** | Tokens (Ink `#0B0E12`, Action `#4B37F5`, Brand `#7B61FF` solo identidad, Signal, Pro `#FFB020`, Paper `#F7F6F3`; Sora / Manrope / JetBrains Mono; radios 5…26; sombras), 73 íconos propios, ~120 componentes React (DOM) en el bundle `ToLatinoDesignSystem_d26632`, 47 patrones aprobados (2a–2au). | `docs/diseno/design-system/` |

### 1.3 Fuentes de verdad (en este orden) — ya copiadas al repo
1. **Producto y estructura** → `docs/diseno/plan/` (`CLAUDE-plan.md` reglas
   maestras y decisiones cerradas · `taxonomia-negocios.md` · `onboarding-negocios.md`
   · `admin-dashboard.md` + `admin-implementacion.md` · `apps-delivery-checkin.md`
   · `flujos-transversales.md` · `pantallas-iniciales.md` · `revision-estructural.md`).
2. **Datos** → `docs/diseno/entrega/modelo-datos.md` (+ `.json`, fuente única).
3. **Lo que NO se construye** → `docs/diseno/entrega/solo-prototipo.md` (60 piezas).
4. **Visual** → `docs/diseno/design-system/README.md` + `tokens/*.css`; los
   componentes fuente (`components/**/*.jsx`) viven en el proyecto Design System
   (artifact `28YSky6mS3eWe4R9tdvX2B`), ver decisión 3-J.
5. **Comportamiento exacto de cada pantalla** → el prototipo navegable
   (`To'Latino Prototipo.dc.html`, Panel negocio v2, Super Admin, Comunidad,
   Eventos, Mi cuenta…) en el artifact `tolatino-master+`. **El prototipo es la
   especificación, no código a copiar.**
6. **Historial de decisiones del diseño** → `docs/diseno/referencia/memoria-del-diseno.md`
   (342 KB; no se lee entero: se busca con grep por tema).

Si dos fuentes difieren: gana la decisión más reciente del fundador en la
memoria del diseño; si no está ahí, gana el plan; el prototipo manda en el
comportamiento de pantalla.

---

## 2. Reglas del diseño que el código obedece (no se re-preguntan)

**Del plan (reglas maestras):**
1. **Espejo de gestión.** Nada existe sin su trío *listado → detalle → editor*
   en el dashboard que le toca (negocio → Panel; vecino → Mi cuenta; todo →
   Super Admin). Si toca a varios, aparece en todos con su permiso.
2. **Triángulo de sincronización.** Cada opción del panel controla algo real en
   la página; el admin ve lo que el dueño dejó (no datos de ejemplo), puede
   pausar/quitar; la página lo respeta y el panel avisa «To'Latino lo pausó».
   Toda sección se cierra comprobando las tres puntas.
3. **Revisión profunda.** Cada opción tiene que tener sentido para un negocio
   real; casos límite siempre (0, apagado, cerrado, feriado, Free/Pro, pausa).
4. **Mobile-first y desktop 100 % desktop.** Misma estructura, pasos y nombres;
   el desktop agrega información y cambia la forma (tabla ↔ tarjetas, sidebar ↔
   nav inferior, panel lateral ↔ hoja). Nunca el móvil estirado.
5. **Ciudad primero.** `city_id` en toda entidad pública; «cerca de mí» es un
   filtro. Multi-ciudad desde el día 1; solo Hazleton abierta; otras = «próximamente»
   con lista de espera.
6. **Nomenclatura** `ÁREA-MÓDULO-PANTALLA[-ESTADO]` (APP · DASH · USR · ADM ·
   ONB · DLV · CHK). Cada pantalla declara patrón canónico y nivel de acceso.

**Del modelo de datos (12 reglas):** una cuenta · bilingüe (UI en `CmsString`;
lo del negocio `text·i18n {es,en}`; lo del vecino en su idioma con «Ver
traducción», D3) · dinero en centavos USD, impuesto por ciudad (Hazleton 6 %),
nunca un número de tarjeta · `datetime` UTC, horario local · citas = solicitud
(D4: «Aprobar al instante» es opción del profesional, apagada) · **nada se
borra** (estados, 30 días de gracia) · **derivado no es dato** (★, conteos,
distancia, abierto ahora, fuerza del perfil, cupo, saldo: se calculan y cachean)
· `AuditEntry` en toda acción del equipo · acciones sobre terceros con motivo +
aviso + apelación · espejo · **nunca papeles** (ni ID ni estatus; para reclamar:
licencia, recibo de luz/agua o EIN con cuentas tapadas).

**De negocio:**
- Comida = categoría modelo; método por categoría = copiar y cambiar solo lo que
  la tesis exige; **nada genérico como respaldo** (una categoría sin flujo propio
  nunca cae en la ficha de otra).
- Módulos por categoría = `ALLOW` del 3 nov (Auto svc·citas·cot·shop·renta ·
  Belleza svc·citas·shop · Comida menu·pedidos·rsv·cot·shop · … · Venta de Autos
  svc·citas·cot) + Staff, Eventos, Novedades, Vacantes en todas.
- Orden de resultados: Pro primero con **rotación diaria justa**; dentro,
  relevancia + cercanía + calificación. **10 por página**; desktop números,
  móvil «Página 2 de 7 · Siguiente».
- Reseñas con staff propio: pertenece al **profesional**, agrega en el local
  («vía {Local}»).
- Novedad → «Hoy en el barrio» 24 h, luego solo en la pestaña Novedades.
- Chat vecino↔vecino solo si el receptor te sigue; cliente↔negocio libre;
  cliente↔negocio desde el admin solo con reporte abierto.
- **Negocios semilla: solo desde recomendaciones de vecinos** (D2), nunca
  importados. Fundadores = insignia.
- Una línea que nunca se suaviza (911 en Salud; «nadie te garantiza un
  resultado» en Profesionales).

**Del sistema de diseño:** todo sale del sistema; si una pieza no existe se
pregunta antes de crearla; copy sobrio, español primero, tuteo, sin emoji,
«lo normal no se etiqueta»; CTA de cita = «Booking»; fotos reales (Pexels solo
para datos de ejemplo), placeholder rayado; `repeat(n, minmax(0,1fr))`.

**Lo que no pasa a la app** (`solo-prototipo.md`): barras de revisión, botón de
simulación, RESPUESTA, hora fija (jue 24 sep 2026 12:30), «Entrar como», EN
VIVO, galería de estados, datos de ejemplo, localStorage como base, asas
`window.__tl*`. Nada marcado `data-proto` se construye.

---

## 3. Decisiones que cambian el plan (solo el fundador)

Cada una con **recomendación** y por qué. Las de arriba pesan más.

### 3-A · Alcance del lanzamiento en Hazleton
El 20 oct decidiste: **«todo lo que se construye va a la V1, nada a medias»**:
17 categorías con su flujo, Comunidad, Eventos, El Patio (dominó + parchís),
El Compa, Soporte, Panel, Super Admin, 4 apps. El prototipo probado tiene
~47 000 pantallas y 12 700 botones.

Lo que eso significa en código, con honestidad: **muchos meses sin un solo
usuario real**, y cuando salga, saldrá con todo lo que el diseño asumió de
Hazleton sin haberlo comprobado con un negocio real.

**Recomendación:** mantener **«nada a medias» por pieza**, pero **lanzar
Hazleton por etapas completas**:
- **Lanzamiento 1 (puerta abierta a negocios):** directorio completo de las 17
  categorías (buscar, categoría, ficha Pro/Free con contacto real: Llamar, Cómo
  llegar, Mensaje), Publica tu negocio v2, Panel base, Mi cuenta base, Super
  Admin núcleo. **Comida** completa (menú, pedidos, reservaciones, Stripe) y
  **Belleza** completa (Booking con depósito = patrón de todas las citas).
  Una categoría sin su flujo transaccional todavía **no está a medias**: su
  ficha está completa y el contacto funciona; solo no vende en línea aún.
- **Después, grupo por grupo** (como el propio plan de diseño lo ordena), cada
  categoría sale cuando está completa; luego Comunidad, Eventos, El Compa,
  El Patio.

Si prefieres mantener el «todo antes de abrir», el plan es el mismo; solo cambia
cuándo se enciende el dominio. **Decide: ¿etapas completas (recomendado) o todo
antes de abrir?**

### 3-B · Plataforma: ¿cómo llegamos al teléfono?
El diseño dice «app nativa iOS/Android + web». Opciones reales para un fundador
solo:
1. **Web app (Next.js) instalable como PWA + Capacitor para las tiendas cuando
   toque** — **recomendado.** Un solo código para teléfono, tablet y desktop;
   los ~120 componentes del sistema de diseño son **React DOM** y se portan casi
   1:1; publicar en App Store / Google Play se hace después envolviendo la misma
   web (Capacitor), sin reescribir. Cámara (fotos), QR (modo puerta), ubicación,
   avisos push (iOS ≥ 16.4) y compartir funcionan desde la web.
2. **Expo / React Native** — nativo de verdad, pero obliga a **reescribir el
   sistema de diseño** (RN no usa CSS ni DOM) y a mantener web aparte o con
   compromisos. Doble costo para el mismo resultado visual.

### 3-C · Backend: Supabase otra vez
**Recomendado: sí, Supabase** (Postgres + PostGIS para «cerca de mí», Auth con
OTP por teléfono, Storage para fotos, Realtime para chat/pedidos/El Patio, RLS
para permisos). Es Postgres estándar → migrable a un servidor propio con
`pg_dump` cuando las facturas lo justifiquen. **Proyectos nuevos** (pruebas y
producción); los viejos se borran cuando quieras. Edge Functions para lo que no
puede vivir en el cliente (Stripe webhooks, OTP, El Compa, procesos diarios de
la prueba Pro).

### 3-D · Hosting
Antes el repo decía «Cloudflare Pages» pero lo real era **Vercel**
(`tolatino-git-pruebas-…vercel.app`). **Recomendado: Vercel**, mismo flujo que
ya conoces (rama `pruebas` = tu sitio de pruebas; producción = `tolatino.com`
con tu visto bueno).

### 3-E · Entrar con teléfono + código (SMS cuesta dinero)
El diseño exige teléfono + OTP como única entrada. Cada SMS cuesta (~$0.008 con
Twilio Verify, que Supabase Auth soporta). **Recomendado:** aceptarlo —es
central en el producto— y abaratar: código por **WhatsApp** cuando el teléfono
lo tenga (Meta Cloud API, plantilla de autenticación, más barato y encaja con la
audiencia), SMS como respaldo; límite de reenvíos y de intentos (ya en el
diseño). Correo solo como recuperación opcional. **Confirma que aceptas el costo
por SMS.**

### 3-F · El Compa (IA con Claude) — cuándo y con qué modelo
Cuesta por uso. **Recomendado:** construirlo cuando exista lo que debe explicar
(fase 7), con el modelo más barato que cumpla (Haiku) y tope mensual
configurable desde el Super Admin (`ADM-COMPA` · interruptores ya diseñados).
Nunca en la ruta crítica de un pedido.

### 3-G · El Patio en tiempo real
Dominó/parchís en vivo con reconexión y antitrampa es un producto dentro del
producto. El plan original decía «asincrónico primero»; el 20 oct pasó todo a
V1. **Recomendado:** última fase, con Supabase Realtime; mesa pública con «La
computadora» (D6) desde el principio para que nunca se vea vacía.

### 3-H · Las 4 apps
**Recomendado para V1:** una sola web app con cuatro entradas (`/`, `/negocio`,
`/repartidor`, `/puerta`), instalable cada una; el repartidor es **del negocio**
(regla 1.0 del plan), así que su «app» es una vista del panel para el teléfono.
Las tiendas (Capacitor) después del lanzamiento, con Apple $99/año y Google $25.

### 3-I · Datos de ejemplo y las 17 demos
Los negocios «To'Latino Demo · …» y los 276 de ejemplo **solo en la base de
pruebas** como `seed` para que puedas probar todo. Producción nace vacía (regla
«negocios semilla: NO»; D2 solo desde recomendaciones).

### 3-J · El sistema de diseño: necesito su última versión
El artifact del Design System que puedo leer (`28YSky6mS3eWe4R9tdvX2B`) tiene
**67 componentes fuente** (versión ~11 oct). El bundle compilado del proyecto
de diseño tiene **~120** (SINCRONIZAR 32: admin, El Compa, PostCard/VoteBar,
onboarding, ciudad, Review, Payment, Ticket, SearchSelect…). **Necesito que
exportes de nuevo el proyecto «To'Latino Design System» desde Claude Design**
(o me pegues su link actualizado) para portar las fuentes y no reconstruir 50
componentes mirando capturas.

### 3-K · Reglas del repo viejo que seguimos
Del `CLAUDE.md` anterior mantengo, salvo que digas lo contrario: **pegar en el
chat todo lo que debas correr** (SQL, variables, comandos) · **registrar lo
diferido en `docs/LAUNCH-CHECKLIST.md`** · **evitar servicios pagos fuera de la
lista** (Supabase, Vercel, Stripe, Twilio/WhatsApp OTP, Claude API, Apple/Google)
· **benchmark contra el líder de cada categoría** · **rama `pruebas` = tu sitio**
· **mock → captura → tu OK → conectar** para toda pantalla nueva. Del código
viejo **no se reutiliza ninguna pantalla**; sí dos herramientas (el aplicador
de migraciones `sbsql.mjs` y el guardián de build) tras revisarlas.

---

## 4. Arquitectura propuesta (asumiendo 3-B/C/D/H)

```
tolatino/
  apps/web/                 Next.js (App Router) · una sola app, 4 entradas
    app/(app)/              APP-*   cliente: /, /negocios, /c/[categoria], /n/[slug], /buscar, /comunidad, /eventos, /cuenta
    app/(negocio)/          DASH-*  panel: /negocio/[id]/hoy|clientes|mensajes|pagina|vendes|cobros|insights|moderadores|mas|compa
    app/(onb)/              ONB-*   /publica (negocio) · /entrar (vecino) · /recuperar
    app/(admin)/            ADM-*   /admin/… (17 secciones)
    app/(dlv)/ (chk)/       /repartidor · /puerta
    app/api/                webhooks (Stripe), rutas que necesitan secreto
  packages/ui/              sistema de diseño portado: tokens → Tailwind, ~120 componentes, 73 íconos
  packages/taxonomy/        17 categorías, subcategorías, familias de filtros, ALLOW, tesis, rótulos (datos, no código)
  packages/i18n/            CmsString ES/EN (next-intl), reglas de copy
  packages/types/           tipos generados de la base + DTOs
  supabase/migrations/      NNNN_*.sql idempotentes · RLS · funciones · índices
  supabase/functions/       Edge Functions: otp, stripe, compa, cron diario (prueba Pro, vencimientos)
  supabase/seed/            datos de prueba (solo base de pruebas)
  scripts/                  sbsql.mjs (aplicar migraciones), verify-build.mjs (guardián)
  docs/                     PLAN.md · PROGRESS.md · LAUNCH-CHECKLIST.md · diseno/
```

**Decisiones técnicas fijas:**
- **Geo:** PostGIS `geography` + GIST; radio con `st_dwithin`; «cerca de mí» =
  orden por distancia dentro de la ciudad.
- **Búsqueda:** Postgres full-text (ES/EN) + sinónimos de `Synonym` + trigram;
  `SearchLog` y «búsquedas sin oferta» desde el día 1. Meilisearch solo si hace
  falta a escala.
- **Permisos:** RLS por `city_id`, `BusinessMember.role`, `StaffMember.role`;
  el servidor aplica `autoConfirm`, techos Free, estados: **nunca el cliente**.
- **Dinero:** Stripe Connect Express (el negocio conecta su cuenta desde Cobros;
  no frena la publicación); PaymentIntent con `capture_method: manual` para
  **Retenido → Cobrado / Devuelto**; checkout **dentro de nuestra hoja**
  (Payment Element), nunca la página de Stripe.
- **Realtime:** Supabase Realtime para pedidos/citas en vivo, chat, El Patio.
- **Avisos:** Web Push (VAPID) + SMS/WhatsApp para lo crítico (plantillas en
  `NotificationTemplate`, editables desde el admin).
- **Imágenes:** Supabase Storage, redimensionadas al subir (960 px), fotos
  reportables; nunca `data:` en la base.
- **Mapas:** MapLibre + OpenStreetMap; geocodificación Nominatim/Photon.
- **i18n:** `es-US` por defecto, `en-US` secundario; toda cadena de UI en
  `CmsString` editable desde `ADM-CMS`.
- **Rutas con nombre de pantalla:** cada página declara su código
  (`APP-NEG-LISTING-PRO`), su patrón y su acceso, para hablar el mismo idioma
  que el prototipo.

---

## 5. Base de datos

- La especificación es **`docs/diseno/entrega/modelo-datos.md` 1.2** (130
  entidades, 13 áreas, estados en §14). No se re-diseña; se traduce a SQL por
  fases, en el orden de la sección 6.
- Convenciones: `snake_case`; `money` = `integer` centavos; `text·i18n` =
  `jsonb {es,en}`; `datetime` = `timestamptz`; horarios = `time` local;
  estados = `enum` o `text` con `check`; `city_id` en toda tabla pública;
  campos derivados **no existen como columnas editables** (vistas
  materializadas o columnas cache con trigger, marcadas `-- derivado`).
- Toda acción del equipo → `audit_entries` (solo inserción; trigger que impide
  `update`/`delete`).
- Toda migración idempotente, pegada en el chat, aplicada primero en la base de
  **pruebas**; en producción solo con tu visto bueno.
- Índices desde el día 1 para 1M+: GIST geo, GIN búsqueda, btree en
  `(city_id, category_id, status)`, paginación por cursor.

---

## 6. Fases de construcción

Reglas de toda fase: **cliente + panel + Super Admin juntos** (espejo y
triángulo); móvil primero y desktop real; cada pantalla con sus 9 estados
(carga, vacío, error, sin permiso, bloqueado-Pro…); ES/EN; migraciones
pegadas; captura real antes de decir «listo»; la rama `pruebas` actualizada
antes de pedirte que pruebes; lo diferido en `LAUNCH-CHECKLIST.md`.
**Definición de terminado = el fundador lo probó en `pruebas` y dio el OK.**

| # | Fase | Qué se construye (resumen) | Entidades principales |
|---|---|---|---|
| 0 | **Cimientos** | Repo y monorepo · Supabase pruebas/prod · **puerto del sistema de diseño** (tokens, íconos, componentes) · shell (SiteHeader, BottomNav, hojas, estados) · i18n · **cuenta** (teléfono + OTP, onboarding del vecino 5 pasos, Mi cuenta mínima) · **ciudad** (Hazleton, radio con mapa, «próximamente» + lista de espera) · taxonomía como datos · **Super Admin esqueleto**: barra con ciudad, equipo y roles, matriz de permisos, auditoría, `CmsString`, feature flags · guardián de build | City, Zone, CityWaitlist, Category, Subcategory, FilterOption, Synonym, ModuleType, User, Device, OtpCode, StaffMember, RolePermission, AuditEntry, CmsString, FeatureFlag, PlatformConfig |
| 1 | **Directorio** | Inicio (Abierto ahora, Hoy en el barrio placeholder real, categorías) · página de categoría (CategoryHero, subcategorías, filtros por familia, 10/página, Pro primero rotación) · **ficha base Pro y Free** (Resumen con OwnerCard/TodayCard, horario Pro con feriados, galería, Relacionados, contacto real: Llamar / Cómo llegar / Compartir / Calendario) · Buscar (entendimos, sinónimos, Aún no hay + Avísame + Recomiéndalo) · Recomendar un negocio · **Publica tu negocio v2** (A1→H1) · **Panel base** (Hoy, Tu página, Fotos, Horario, Equipo, fuerza del perfil) · Recuperar / reclamar negocio · Licencia · **Admin:** Negocios 360°, Usuarios, colas sello · nuevos · recomendaciones · licencias, Catálogo | Business, CategoryAttrs, BusinessHours, SpecialHours, BusinessLink, BusinessMember, License, VerificationRequest, Media, PhotoReport, Faq, Claim, OnboardingDraft, ContactTap, BusinessDailyStats, Favorite, Follow, SearchLog, SearchAlert, Recommendation, QueueItem, AdminNote |
| 2 | **Comida (categoría modelo)** | Menú del cliente (2i: secciones, platos con foto, grupos de opciones, agotados, horario propio) · pedido completo (DeliveryPrefs, carrito, impuesto 6 %, **CheckoutSheet con Stripe**, pago en el local, seguimiento, cambio propuesto, ayuda, recibo) · Reservaciones de mesa · **Panel:** Menú builder (platos, categorías, opciones, inventario, horarios), Pedidos en línea + Entrega (pickup · mi equipo · plataforma externa · envío), Reservaciones, Clientes, Mensajes · **Cobros y plan:** Stripe Connect, Pro $14.99, prueba 30 días, HZL30, día 20/25/29/30 · **Reseñas** (2z, verificadas, «llegó caliente · a tiempo», respuesta del negocio, reportar) · **Novedades** (publicar v2, oferta/cupón/encuesta/aviso) · Jobs · Mi cuenta completa (pedidos, citas, pagos, direcciones, avisos, perfil, borrar cuenta 30 días) · **Admin:** Transacciones, Soporte (tickets, macros), devoluciones, disputas, Planes, Contenido (reseñas, novedades), Notificaciones, Vacantes | Item, ItemSection, OptionGroup, DeliverySettings, ReservationSettings, Operation, OperationLine, OperationEvent, ChangeProposal, Delivery, HelpRequest, Review, ChatThread, Message, Address, PaymentMethod, Payment, Refund, Dispute, StripeAccount, Payout, WalletEntry, Subscription, Invoice, FeeRule, Coupon, BusinessPost, JobPosting, JobApplication, Notification, NotificationPref, SupportCase, SupportMessage, Macro |
| 3 | **Belleza (patrón de citas)** | Booking con depósito (StaffPicker, servicios, fecha/hora, add-ons, PaymentSummary + DepositOutcomes), solicitud → confirmar / otra hora / no puedo / vence; «Aprobar al instante» por profesional; staff con silla rentada = su propia página y agenda, reseña «vía {Local}»; ayuda con la cita; calendario · **Panel:** Servicios, Citas (agenda, walk-ins), Staff (modelo A/B, invitar), techo Free 10/mes · **Admin:** citas en Transacciones, staff en Negocio 360° | StaffService, BookingPolicy, (Operation tipo cita), BusinessMember roles |
| 4 | **Las otras 14 categorías, grupo por grupo** | Cada grupo: tesis, módulos permitidos, rótulos, campos (`CategoryAttrs`), filtros, flujo propio y «Tu herramienta» del panel. Orden sugerido por reutilización: **Hogar + Auto** (cotización / pre-estimado / emergencia / renta) → **Doctores + Profesionales** (cita sin cobro, seguros, licencias, líneas fijas) → **Mercados + Tiendas** (tienda, peso real, apartado, EBT, envío) → **Fiestas + Transporte** (fecha libre, paquetes, renta, asientos) → **Noche** (esta noche, cover, lista, mesas) → **Educación + Niños + Deporte** (cursos, membresías, credenciales) → **Iglesias + Bienes Raíces + Venta de Autos** (cultos/donativo, visitas, lote/financiamiento). Una categoría sale **solo completa**: cliente + panel + admin. | PrivateEventSettings, Item con tipos por categoría, campos de CategoryAttrs |
| 5 | **Comunidad** | Muro simple (PostCard 2c/3b/4c), publicar (tipos), comentar, mejor respuesta, encuestas, votos ±, Hoy en el barrio real (StoryCard de Novedades 24 h), seguir, bloquear, reportar, traducción (D3), rangos y puntos, monedas y cupones canjeables, Tabla del Barrio, cuenta oficial «To'Latino Hazleton», reglas del barrio · **Admin:** Contenido, sanciones, apelaciones, Gamification | CommunityProfile, Post, Comment, Vote, PollVote, Report, PointsEntry, CoinsEntry, Rank, Badge, MonthlyBoard, BlockMute, Sanction, Appeal |
| 6 | **Eventos** | Publica tu evento → EN REVISIÓN · listado y detalle · tipos de boleto, mesas, extras, códigos, cortesías · compra en nuestra hoja · **boleto QR** · Mis boletos · **modo puerta** (`/puerta`, varios porteros, solo escanea) · serie de fechas, cambiar artista de una fecha · evento privado · **Panel:** Eventos (ficha, compradores, reenviar/devolver, pausar venta) · **Admin:** Eventos y boletos, auditoría de check-ins | Event, TicketType, EventTable, EventAddOn, Ticket, Rsvp, DoorStaff, CheckIn |
| 7 | **El Compa** | Hoja de ayuda (2as) y pasos guiados (2at) para vecinos; asistente del panel; respuestas automáticas Pro; copiloto en Soporte/colas; interruptores por nivel y canal; «Marcar respuesta incorrecta»; WhatsApp/SMS con enlace a la app | CompaConversation, CompaMessage, CompaAction, CompaHandoff, CompaBusinessSettings, CompaReview |
| 8 | **El Patio** | Dominó y parchís: mesa pública (60 s + La computadora), mesa privada desde Teniente, reacciones, torneos; antitrampa básica; realtime | GameMatch, PrivateTable, Tournament, TournamentEntry |
| 9 | **Cierre de lanzamiento** | Super Admin completo (Analítica, CMS, Crecimiento, Ciudades con wizard, Sistema), páginas legales, landing pre-lanzamiento con acceso anticipado, QR de calle, umbrales por categoría en `ADM-CIUD`, respaldos, monitoreo, `LAUNCH-CHECKLIST.md` en cero | Campaign, Featured, ShortLink, LegalPage, CityHomeConfig, Announcement, Referral, TermsAcceptance |

Con **3-A recomendado**, tolatino.com abre al terminar la fase 3 (más el núcleo
del Super Admin de las fases 0–3), y las fases 4–9 van saliendo completas
encima del sitio vivo. Con «todo antes de abrir», abre tras la fase 9.

---

## 7. Método de trabajo (cómo trabajamos tú y yo)

1. **Una tarea por mensaje.** Captura + una línea vale más que un párrafo.
2. **Pantalla nueva = mock → captura → tu OK → conectar datos.** Aprobar una
   captura cuesta menos que rehacer una pantalla conectada. El mock se compone
   con el sistema de diseño; nunca se inventa UI.
3. **Cada fase se cierra con el triángulo** (panel → página · admin → panel y
   página · panel → admin) y con los casos límite, antes de pedirte el OK.
4. **Tu sitio de pruebas es la rama `pruebas`.** Un cambio existe para ti solo
   cuando `pruebas` tiene el commit, las migraciones están aplicadas en la base
   de pruebas y te digo **qué mirar y en qué condiciones**.
5. **Producción (`tolatino.com`) solo con tu visto bueno explícito**, con las
   migraciones pegadas por ti en el SQL Editor del proyecto de producción.
6. **Todo lo que debas correr va pegado completo en el chat**: SQL, `.env`,
   comandos, ajustes de paneles (Supabase, Vercel, Stripe, Twilio, Meta).
7. **Lo diferido se anota en `docs/LAUNCH-CHECKLIST.md`** en el momento, nunca
   solo en el chat. `docs/PROGRESS.md` = dónde estamos / cómo retomar.
8. **Verificar sobre lo servido**, no sobre la intención: build + guardián +
   navegador real + captura. «Listo» sin captura no es listo.
9. **Modelo y esfuerzo:** Sonnet/medium para pantallas y features; subir a Opus
   y effort high para RLS, pagos, migraciones y un bug que falló dos veces. Te
   digo cuándo pegar el comando.
10. **Auditorías por clases, no por pantallas**; cada clase cazada deja un
    guardián automático en el build cuando se puede.

---

## 8. Costos externos (honestos, estimados, mensuales)

| Servicio | Para qué | Costo |
|---|---|---|
| Supabase | base, auth, storage, realtime | $0 (free) → $25 (Pro) cuando crezca |
| Vercel | hosting web | $0 (hobby) → $20 si hace falta equipo/analytics |
| Twilio Verify o WhatsApp Cloud API | código de entrada | ~$0.008–0.015 por código; 1 000 entradas ≈ $8–15 |
| Stripe + Connect Express | cobros y pagos al negocio | 2.9 % + 30 ¢ por cobro con tarjeta (+0.25 % Connect); comisión To'Latino se descuenta de ahí |
| Claude API (El Compa) | IA | por uso; tope mensual desde el admin; Haiku para la mayoría |
| Dominio tolatino.com | ya es tuyo | lo que ya pagas |
| Apple Developer / Google Play | solo cuando salgan las apps a tiendas | $99/año · $25 una vez |
| Pexels | fotos de datos de ejemplo únicamente | $0 |

Todo lo demás (mapas, geocodificación, búsqueda, push, íconos, tipografía) es
gratuito u open source.

---

## 9. Lo que NO se construye

Todo lo listado en `docs/diseno/entrega/solo-prototipo.md` (60 piezas en 5
grupos): barras de revisión, simulaciones, hora fija, «Entrar como», galería de
estados, datos de ejemplo en producción, almacenamiento en el navegador como
base de datos, asas de consola. Tampoco: venta de boletos en la puerta (D1),
negocios importados (D2), pago anual de Pro, caja «línea fija» en categorías,
feed de tarjetas separadas en Comunidad («aire», rechazado 28 oct), ninguna
pantalla del código v1 archivado.

---

## 10. Siguiente paso

1. Tú respondes la sección 3 (A es la que más importa; J me desbloquea el
   sistema de diseño).
2. Ajusto este plan con tus respuestas y escribo el `CLAUDE.md` definitivo
   (reglas del proyecto) y `docs/LAUNCH-CHECKLIST.md` inicial.
3. Fase 0 empieza con el puerto del sistema de diseño y te mando la primera
   captura (tokens + componentes base en el teléfono) antes de tocar la base de
   datos.
