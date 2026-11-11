# Fase 8 · Las cuatro apps en las tiendas — plan de construcción (11 nov 2026)

Bloques **8a → 8i** (`8a`–`8i` no aparecen como bloques en `docs/PROGRESS.md`, `docs/REVISION.md` ni en el historial; «8a» solo sale como el patrón
StoryCard 8a del sistema de diseño). Migraciones desde **0125** (la última confirmada es `0123_compa_canales.sql`; **0124 la toma 7i**) hasta **0133**, una
por bloque. Semillas de pruebas desde **0044** (la última confirmada es `0042_compa_negocios.sql`; 0043 la puede tomar 7i). Nada de este archivo se ha
construido. Alcance = fila 8 de `docs/PLAN.md` (L214): «cáscaras Capacitor, enlaces universales, TestFlight / Play interno, programa beta con «Reportar un
problema», fichas de tienda · Mac en la nube». **Decisión B manda en todo el archivo** (`docs/DECISIONES.md` L12): **un solo código** (Next.js) y **cuatro
cáscaras de Capacitor** —To'Latino, To'Latino Negocios, To'Latino Repartidor, To'Latino Puerta— «cada app = una cáscara con su ícono y nombre apuntando a
una entrada de la misma app»; el Super Admin es solo web; nada en React Native. Y **U** (L21) en cada paso: el fundador solo da el OK desde el teléfono; lo
que Apple o Google exigen al dueño de la cuenta va en un **paquete de pasos para el teléfono** (§10), nunca «copia esto y pégalo allá» (donde una consola
de un tercero obliga a escribir un dato, se dice el choque: §6 #25). **Nada sale al público antes de la Fase 9** (regla 2, decisión A): en esta fase las
apps se compilan, se firman y se reparten **solo** por TestFlight interno y Play interno contra el **sandbox**; la revisión pública espera la Fase 9 y su OK.

**Lo que el diseño trae de esta fase: casi nada.** `memoria-del-diseno.md` no menciona Capacitor, TestFlight, App Store, Google Play, «Reportar un
problema», enlaces universales ni beta (grep: 0 coincidencias); `push` sale 5 veces y solo como canal de un aviso. El comportamiento sale de PLAN §3.1,
§3.3, §3.4, §6 fila 8, §8, §9; DECISIONES B, U, W, E, O, S, M, I, A; `HERRAMIENTAS.md` #7, #23, #26; `apps-delivery-checkin.md` (Repartidor y Puerta);
`admin-dashboard.md` ADM-SYS (L323–340: «Integraciones … push … claves y salud», «versiones mínimas de app», «Salud del sistema: errores») y lo que las
fases 2–7 dejaron en `docs/LAUNCH-CHECKLIST.md` «para la Fase 8». Lo que no tiene diseño se compone con el sistema y se anota (§1b). Esto es un resumen de
trabajo; las reglas de Apple y Google se vuelven a leer el día de cada envío (cambian; lo que no se pudo comprobar aquí va marcado **«(a verificar)»**).

## 0. Fuentes
**Plan y decisiones:** `docs/PLAN.md` **§3.1 L97** (árbol: `apps/mobile/` = «4 cáscaras Capacitor (ícono, nombre, pantalla de inicio, enlaces
universales)»), §3.2 L120 (Cloudflare delante; `pruebas.tolatino.com`), **§3.3 L137** (Acceso: «sesión persistente + **passkeys**»), **L143** (Avisos:
«Web Push / FCM propios; SMS y WhatsApp pagados solo para lo crítico»), L145 (Observabilidad: «Sentry/GlitchTip … rrweb»), **§3.4 L150** (tubería), §5
(guardianes: Errores en vivo, Costos, Documentación), **§6 L214** (fila 8), **§8 L241** («tiendas Apple ($99/año) y Google ($25) · … · minutos de Mac en
la nube si se agotan los gratis»), **§9 L247** («Apple Developer, Google Play» en persona; Cloudflare «y apuntar el dominio»). `docs/DECISIONES.md` **B**
(L12), M (L13), O (L15), S (L19), **U** (L21), C (L22), D (L23), V (L24), **W** (L25: «iPhone del fundador, primero instalando `pruebas.tolatino.com` desde
Safari (app instalada, push), luego la app nativa por TestFlight … Android: emulación + Google Play pruebas internas … Sin granjas de dispositivos pagas.
Compilar iPhone usa una Mac en la nube por minutos»), **E** (L27: passkeys «Face ID / huella»), I (L30), A (L33), Z (L34), E2 (L36), AA, AB (L39–40).
`docs/HERRAMIENTAS.md` #3 (errores: «Sentry autoalojado o GlitchTip»), **#7** (push propio), #23 (sin conexión en Puerta y Repartidor), **#26** («Programa
beta en Hazleton | TestFlight / pruebas internas de Play; botón «Reportar un problema» con captura + grabación de sesión → Soporte»), #30 (segundo factor
del equipo), L27 (lo que se paga).
**Producto:** `apps-delivery-checkin.md` (Parte 1 Repartidor: «Ubicación en vivo compartida con el cliente y el negocio solo durante el pedido», «Sin
señal: los cambios de estado se guardan», modo manos libres; Parte 2 Puerta: cámara a pantalla completa, linterna, sin conexión, «Bloqueo del
dispositivo del portero a la app (kiosco) si el negocio lo quiere», §2.4 «agregar a wallet»; Parte 3: «Una sola cuenta To'Latino entra a todas las
apps»). `admin-dashboard.md` ADM-SYS L323–340, ADM-SOP L276 («dispositivo, versión de la app»). `CLAUDE-plan.md` L76–90 (regla maestra mobile-first:
«el 99 % vive en el teléfono», «el 85 % de los negocios no usa computadora»). `modelo-datos.md` **Device L667–679** (`platform ios|android|web`, `app
cliente|negocio|delivery|checkin`, **`push_token`**), Notification L758 (`channel push|sms|email|inapp`), NotificationPref L770. `solo-prototipo.md` L301
(«En la app: Push, SMS y correo con esas plantillas»). `fase6-eventos.md` §1b #10 y **§6 #17** («Apple Wallet / Google Wallet … Fase 8 (cuenta de Apple
Developer)»). `fase7-compa.md` §6 #14 y 0117 («SMS solo si la persona no tiene la app instalada»), §6 #18 (El Compa no va en Puerta ni Repartidor).
**LAUNCH-CHECKLIST que espera esta fase** (solo lectura): L26 (passkeys «necesitan HTTPS y un dominio»), L36 (segundo factor del equipo), L314 (borrado
definitivo a los 30 días), **L339** («Push en las apps (Fase 8)»), L344 (cifras de entrega y apertura), **L364–365** («App de tienda (Capacitor) «To'Latino
Repartidor» … ubicación en vivo con permiso del sistema … y push»), L633, L649, L668, L703 (push de Comunidad, rangos, monedas, resumen), **L657**
(escanear el cupón «llega con la app Negocios (Capacitor)»), L761 (Apple / Google Wallet: Fase 8), **L862–863** (cáscara «To'Latino Puerta» y kiosco),
L881 (push «Hoy escaneas en la puerta»), **L892** (Safari borra lo guardado a los 7 días: «Con la app de las tiendas (Fase 8) no pasa»), **L908** (llave
de los boletos «en el Keychain / Keystore del teléfono»), L978 (push de Soporte).
**Código (verificado el 11 nov):** `apps/web` = Next.js 15.5 con `output: "standalone"`; **151 páginas, 138 con `force-dynamic`, 125 archivos con `"use
server"`** (no hay export estático posible, §3.1). Entradas: **`/` (app de vecinos), `/panel` (Panel v2; PLAN §3.1 decía `/negocio`), `/repartidor`,
`/puerta`**, `/admin`. **No existe `apps/mobile/`.** Instalable hoy: solo la Puerta (`public/puerta/manifest.webmanifest` + `sw.js`, alcance `/puerta`) y
el service worker de Mis boletos (`/sw-boletos.js`, alcance `/cuenta/boletos`); la app de vecinos **no** tiene manifiesto. **No hay push de ningún tipo**
(sin Web Push, VAPID, FCM ni APNs): `lib/avisos.ts` deja el aviso en la campana y manda SMS (Telnyx o «modo pruebas»). **No hay passkeys** (0
coincidencias de WebAuthn). Puerta: `getUserMedia` + `BarcodeDetector` o jsQR en un Worker (`public/puerta/lector.js`), `navigator.vibrate`, paquete
firmado en IndexedDB (6h). Mis boletos: QR cifrado AES-GCM en IndexedDB con la llave de la cookie `tl_bk` (`lib/boletos-sin-conexion.ts`). Repartidor
(2l): cola de pasos en `localStorage` que se reenvía con señal (`Repartidor.tsx` L26–69); **sin ubicación** y sin service worker (en frío y sin señal no
abre). Geolocalización solo en `CiudadSelector.tsx` (una vez, al tocar). `sessions` (0006) ya trae **`platform ios|android|web`** y **`app
cliente|negocio|delivery|checkin|admin`**. `lib/soporte.ts` L55–61 ya lee la cabecera **`x-tl-app`** para el «contexto automático» (hoy siempre «web»).
Mi cuenta › Ajustes › **Borrar mi cuenta** existe (`/cuenta/ajustes/borrar`, 3 pasos y código; queda programado a 30 días) y Privacidad cierra sesiones;
**el borrado definitivo a los 30 días no corre todavía** (LAUNCH L314). **No hay `/privacidad` ni `/terminos` públicos.** **No hay recolector de errores**
(sin GlitchTip/Sentry; el compose del sandbox trae `web`, `barrido`, `db`, `mapa`, `medios`, `moderacion-img`, `traductor`). **El sandbox se sirve por HTTP
en la IP** (`nginx-pruebas.conf` escucha solo el 80; `BASE_URL` ya asume `https://pruebas.tolatino.com`): sin dominio con HTTPS no hay enlaces
universales, passkeys ni llaves que viajen (8a lo resuelve). CI (`.github/workflows/ci.yml`): `ubuntu-latest`, tipos, build, guardianes, contratos
(Stripe, canales, SES), imagen y migraciones dos veces; no hay macOS. **El repositorio `devpayxer/tolatino` es público** (API de GitHub, 11 nov): los
minutos de macOS de GitHub Actions son gratis en repos públicos (§3.5) y ninguna llave puede vivir en el repo (§3.5, guardián `llavesFueraDelRepo`).
Plantilla de este archivo: `fase7-compa.md`.

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| Las cuatro entradas `/`, `/panel`, `/repartidor`, `/puerta` con su marco (AppShell, Marco del panel, Repartidor, Marco de la Puerta oscuro) | 0–6 | Cada cáscara abre **su** entrada; nada de pantallas nuevas para «hacer app» |
| `sessions.platform` / `sessions.app` (0006) + `lib/cuenta.ts` (sesión persistente por dispositivo, `tl_dev`, bloquear dispositivo) | 0 | La cáscara se identifica (rótulo `TLApp` en el user-agent, §3.1) y la sesión guarda app, plataforma y versión; Super Admin ya cierra o bloquea sesiones |
| `lib/soporte.ts` `dispositivo()` (lee `x-tl-app`) + `support_cases.device` / `app_version` (7b) + `abrirCaso` con foto privada (`media.owner_kind 'support'`) | 7b | **«Reportar un problema»** = un caso TK- de tema `tecnico` con captura y registro técnico (8f); el contexto automático por fin dice la app y la versión |
| `lib/avisos.ts` (`avisar`, `avisarTelefono`, `avisarNegocio`), `notif_templates` (grupos `crit · tx · mod · biz · mkt · community · events`, `pref`, `sms`), `users.notif_prefs`, horas de silencio, `notifications.sms_status` | 2j, 5i, 6j, 7h | **Push entra como un canal más** del mismo aviso (8c): la plantilla ya dice el grupo; el SMS pasa a ser respaldo (§3.3) |
| Mi cuenta › **Avisos** (`USR-AVISOS`, «Los avisos al teléfono todavía no salen») y › Ajustes › **Privacidad** (sesiones abiertas) y **Borrar mi cuenta** | 2h | Interruptores de push por grupo; «Este iPhone · To'Latino 1.0 (12)» en sesiones; **Apple 5.1.1(v) y Play: borrar la cuenta desde la app ya existe** (falta el borrado definitivo, §3.6) |
| Puerta sin conexión (6h): paquete firmado Ed25519, validación local, cola de escaneos, `usePuertaLocal.ts`, `public/puerta/sw.js`, lector jsQR/BarcodeDetector | 6g, 6h | Se reusa tal cual en la cáscara; lo que cambia es **dónde se guarda** (Keychain / Keystore, §3.1 «islas») |
| Mis boletos sin señal (6h): `lib/boletos-sin-conexion.ts`, `/cuenta/boletos/sin-conexion` (`force-static`), `/sw-boletos.js` | 6h | Isla local de la app To'Latino; llave en Keychain / Keystore (LAUNCH L892, L908) |
| Repartidor (2l): cola de pasos sin señal, En línea / Fuera de línea, detalle con «Cómo llegar» | 2l | Isla sin señal en frío y **ubicación en vivo durante la entrega** (8e) |
| `lib/puerta-vivo.ts` (una conexión `LISTEN` por proceso → SSE `/api/puerta/vivo`, respaldo de 5 s) | 6g | El mismo patrón para el **mapa en vivo del repartidor** (8e), sin servicio nuevo |
| Mapa propio (MapLibre + teselas de Pensilvania en `/teselas/`, `lib/mapa*.ts`) | 1f | Mapa en vivo del cliente y del negocio |
| `lib/compa/enlace.ts` + `/compa/e/[token]` («abrirlo no lo gasta», 7h), `/i/[code]` (invitar), enlaces de la Puerta y del Repartidor por SMS | 5g, 6g, 7h | **Enlaces universales**: el mismo enlace abre la app correcta o la web (8b) |
| `lib/config.ts` (`valor`, `cambiarConfig` con límites y auditoría), `config_keys`, `feature_flags`, `admin_sections` / `role_permissions` | 0, 5i | Versión mínima por app y plataforma, interruptores de push, ubicación, Wallet y reportes; la sección **Sistema › Apps** |
| `lib/cifrado.ts` (`cifrar`, `huella`, `DATOS_SECRET` del servidor) | 4j | Tokens de push y llaves de las tiendas cifrados en reposo; nunca en claro |
| `lib/compa/tapar.ts` (tapa tarjeta, SSN, códigos, contraseñas) | 7c | Tapar los registros técnicos y los errores antes de guardarlos |
| `lib/eventos.ts` (analítica propia `app_events`, lista cerrada) | 1 | Suma `app` y `plat` y los eventos de apps, permisos y enlaces; nada con personas |
| `lib/barrido.ts` `barridoCentral` (0078) | 4y | Vencer tokens de push, purgar posiciones del repartidor y errores por retención, recordar llaves que vencen |
| `docs/ayuda/` (151 artículos con audiencia, índice de 7a) | 7a | Fuente de las fichas de tienda ES/EN y de las notas para la revisión; la ayuda nueva de cada bloque |
| `scripts/contrato-canales/` y `scripts/contrato-stripe/` (contrato contra la especificación oficial, en CI) | 6c, 7h | El mismo método para **APNs, FCM y Web Push** (8c) y para la API de App Store Connect y de Google Play (8h) |
| Guardianes `servidorSoloFunciones`, `accionesConAcceso`, `auditoriaLegible`, `avisoConPlantilla`, `libroSoloInsercion`, `configDesdeUnLugar`, `configConLimites`, `analiticaSinPersonas`, `eventosEnLista`, `semilla`, `idioma`, `rutasVivas`, `fotoAyudaPrivada`, `compaTapaSecretos` | `guardianes/run.mjs` (4 680 líneas) | Se reusan (algunos se amplían) y se suman los de §4 |

**Choque de nombre:** `platform` / `app` de `sessions` usan `cliente|negocio|delivery|checkin`; los nombres públicos son To'Latino · Negocios · Repartidor ·
Puerta. El código nativo vive en **`apps/mobile/`** (`apps.json` = fuente única, §3.1) y el puente en **`apps/web/lib/nativo/`** (el único lugar que importa
`@capacitor/*`). «Wallet» de To'Latino (saldo, fase de Pagos) **no** es Apple Wallet / Google Wallet (8g); en el código el pase se llama `pase_*`.

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
No hay ninguna pantalla de esta fase en el diseño. Se compone con piezas existentes (`note`, `rows`, `kpis`, `acts`, `tabs`, `chips`, hoja, `OptionCard`,
`HelpReasonList`, la cola con SLA, el formulario de Soporte) y cada una va a `docs/REVISION.md` con captura (teléfono y escritorio cuando aplica):
1. **Los cuatro íconos y pantallas de inicio** (no hay íconos de app en `docs/diseno/design-system/`; solo `logo-tolatino*.svg`): se componen con el logo y
   un ícono de los 73 del sistema sobre los colores de los tokens (§6 #21). Tamaños de Apple (1024 sin transparencia) y Android (adaptativo + monocromo).
2. **Antes de pedir un permiso** (push, ubicación, cámara): hoja corta con el porqué en una frase y «Ahora no» / «Continuar»; nunca imita el botón del
   sistema (Apple 5.1.1(iv)). Si la persona dijo que no: nota con «Abrir Ajustes».
3. **«Actualiza la app»** (versión por debajo de la mínima) y el aviso suave (por debajo de la recomendada): pantalla completa con el logo y un botón a la
   tienda; el aviso, una `note` arriba que se cierra.
4. **«Sin señal» al abrir en frío** (la página local de cada cáscara) y las **islas** (Puerta, Mis boletos, Repartidor): son las pantallas sin conexión que
   ya existen (6h) más una del Repartidor compuesta igual.
5. **«Reportar un problema»**: el formulario de Soporte (`APP-SOPORTE`, CASO NUEVO) con tema «Algo no funciona en la app», la captura en miniatura (se
   puede quitar) y la línea «Se envía también: el modelo del teléfono, la versión de la app y las últimas pantallas, sin lo que escribiste.»
6. **Repartidor › «Compartiendo tu ubicación»** (banda fija mientras hay entrega activa) y el **mapa en vivo** del cliente y del negocio (pin del
   repartidor sobre el mapa propio, hora de la última posición).
7. **Super Admin › Sistema › Apps, › Integraciones (Llaves de las tiendas, Push) y › Salud › Errores** (ADM-SYS los nombra sin diseño): `tabs` + `kpis` +
   `rows` + la ficha de un grupo de errores; subir una llave es un campo de archivo con su huella.
8. **Panel › Más › «Tus apps»** (instalar To'Latino Negocios, mandar el enlace de Repartidor o Puerta a tu equipo, avisos del panel con sonido) y **Mi
   cuenta › Avisos › «En este teléfono»**.
9. **«Agregar a Apple Wallet» / «Guardar en Google Wallet»**: los botones son arte oficial de Apple y Google (sus reglas de marca lo exigen); no salen
   del sistema y se anotan como excepción (§6 #15).
10. **Fichas de tienda** (texto, capturas, «Novedades»): no son pantallas; viven en el repo (`apps/mobile/tiendas/`) y se ven en Sistema › Apps › Fichas.

### 1c. Tesis y líneas fijas (verbatim; nunca se suavizan)
- **Tesis:** la app no es «la web en un marco». Cada cáscara tiene que hacer algo que el navegador no hace bien: **avisar** (push), **funcionar sin
  señal desde el arranque**, **guardar llaves en el teléfono** (Keychain / Keystore), **entrar con Face ID o huella**, **ubicación con la pantalla
  apagada** (solo el repartidor, solo con entrega activa), **cámara a pantalla completa con pantalla encendida** (la Puerta), **el boleto en la Wallet**.
  Lo demás sigue siendo la misma web, servida por el servidor, que decide todo.
- **El servidor decide; la app solo muestra.** El rótulo `TLApp` del user-agent dice qué app es y qué versión; **nunca** da permisos ni cambia lo que se
  cobra o se ve (guardián `appNoAutoriza`).
- **Textos de permiso (iOS `InfoPlist.strings` es/en y la hoja previa en Android):**
  - Cámara · To'Latino: «To'Latino usa la cámara solo cuando tú tomas una foto para tu reseña, tu publicación o tu caso de Soporte.» / «To'Latino uses
    the camera only when you take a photo for your review, your post or your Support case.»
  - Cámara · Negocios: «To'Latino Negocios usa la cámara para las fotos de tu página, para leer el código de un cupón y para escanear boletos en el modo
    puerta.» / «To'Latino Negocios uses the camera for your page photos, to read a coupon code and to scan tickets in door mode.»
  - Cámara · Puerta: «To'Latino Puerta usa la cámara para leer el QR de los boletos en la puerta. No guarda fotos ni video.» / «To'Latino Puerta uses the
    camera to read ticket QR codes at the door. It does not save photos or video.»
  - Ubicación · To'Latino: «To'Latino usa tu ubicación solo cuando tocas «Usar mi ubicación», para mostrarte tu ciudad y lo que tienes cerca.» / «To'Latino
    uses your location only when you tap "Use my location", to show your city and what is near you.»
  - Ubicación · Repartidor (la única con modo de fondo): «To'Latino Repartidor usa tu ubicación solo mientras tienes una entrega activa, también con la
    pantalla apagada, para que el cliente y el negocio vean por dónde va el pedido. Al marcar «Entregado» deja de compartirse.» / «To'Latino Repartidor
    uses your location only while you have an active delivery, also with the screen off, so the customer and the business can see where the order is. It
    stops when you mark "Delivered".»
  - Aviso fijo de Android mientras comparte: «Compartiendo tu ubicación con {negocio} y el cliente · Entrega #{num}» / «Sharing your location with
    {business} and the customer · Delivery #{num}».
- **Push sensible (Salud, Niños, Soporte, sanciones):** el texto que pasa por Apple y Google es solo «Tienes un aviso nuevo en To'Latino.» / «You have a new
  notice in To'Latino.»; el detalle se lee dentro de la app con la sesión.
- **Antes del permiso de avisos (To'Latino):** «¿Te avisamos cuando tu pedido esté listo, te confirmen una cita o cambie tu evento? Apagas cada tipo en
  Mi cuenta › Avisos.» / «Should we let you know when your order is ready, an appointment is confirmed or your event changes? Turn each type off in My
  account › Notifications.»
- **Actualizar:** «Hay una versión nueva de {app}. Actualízala para seguir.» · «Actualizar» / «There is a new version of {app}. Update it to continue.» ·
  «Update».
- **Reportar:** «Se envía también: el modelo del teléfono, la versión de la app y las últimas pantallas, sin lo que escribiste.» / «We also send your
  phone model, the app version and the last screens, without anything you typed.»
- **Sin rastreo:** To'Latino no rastrea a nadie entre apps ni sitios de otros, no usa publicidad ni el identificador de anuncios; **no hay aviso de
  ATT** porque no hay nada que pedir (§3.6).

---

## 2. Cambios de datos (migraciones 0125 → 0133, una por bloque; nada se borra salvo purga por retención y D5; `city_id` donde hay persona o lugar; solo el servidor lee y escribe)

**0125 `apps_base` (8a)**
- **`app_clients`** (`key` pk `check in ('cliente','negocio','delivery','checkin')` (los de `sessions.app`), `name {es,en}`, `bundle_ios`
  (`com.tolatino.app`, `.negocios`, `.repartidor`, `.puerta`, §6 #8), `package_android` (igual), `entry_path` (`/`, `/panel`, `/repartidor`, `/puerta`),
  `scope text[]` (familias de rutas que abre, §3.2), `store_ios_id`, `store_android_url` (null hasta la Fase 9), `on`) — la escribe la migración desde
  `apps/mobile/apps.json` (guardián `appsUnaFuente`).
- `sessions` suma `app_version text`, `app_build int`, `os_version text` (del rótulo `TLApp`; solo informativo) e índice `(app, platform, last_seen_at
  desc)`; `app_events` suma `app` y `plat` (null = web) y los nombres `app_abrir`, `app_actualizar`, `permiso_pedido`, `permiso_respuesta`.
- **`store_secrets`** (el **llavero de las tiendas**: `id`, `kind check in ('asc_api_key','apns_key','fcm_service_account','play_service_account',
  'android_upload_keystore','ios_dist_cert','pass_type_cert','google_wallet_sa')`, `version`, `blob_enc` (sobre cifrado con `DATOS_SECRET`), `meta jsonb`
  (id de la llave, equipo, correo de la cuenta de servicio, vence), `fingerprint` (sha256 del contenido; lo único que se muestra), `uploaded_by`,
  `uploaded_at`, `retired_at`, `retired_reason`; único `(kind) where retired_at is null`) + **`store_secret_reads`** (**solo inserción**: `secret_id`, `by
  check in ('servidor','ci')`, `ci_run`, `ci_sha`, `purpose`, `ok`, `at`).
- `admin_sections` suma **`apps`** (Sistema › Apps, grupo control) e **`integ`** (Sistema › Integraciones); `role_permissions`: admin todo; soporte `ver`
  en Apps (errores y reportes); lectura `ver` en Apps sin llaves.
- Claves (sección **`apps`**, nueva; números para que valgan los límites de `config_keys`): **`app_min_build_{cliente|negocio|delivery|checkin}_{ios|
  android}`** (por debajo: «Actualiza la app»; 0 = sin mínimo) y **`app_aviso_build_*`** (aviso suave), `app_splash_max_ms` 3000.
- `feature_flags`: **`app.cascara.{cliente|negocio|delivery|checkin}`** (apagada = la cáscara muestra «Esta app está en pausa · Abrir en la web»; para
  emergencias) — encendidas en el sandbox; en producción, Fase 9.

**0127 `apps_enlaces` (8b; renumerada: el plan la llamaba 0126, que tomó 8c porque 8b espera el dominio)** — **`app_signing_certs`** (`app`, `platform 'android'`, `sha256`, `source check in ('subida','play','pruebas')`, `added_at`,
`retired_at`; de aquí sale `assetlinks.json`); clave de texto `apple_team_id` (de la llave de App Store Connect; de aquí sale `apple-app-site-association`);
`app_events.name` suma `enlace_app` y `enlace_web` (props: familia de ruta y app; nunca el token). Nada más: **el contenido de AASA y assetlinks no se
guarda, se genera** de `apps.json` + esta tabla en cada petición (con caché de 5 min).

**0126 `push` (8c; renumerada: el plan la llamaba 0127. 8c se construyó antes que 8b —8b espera el dominio— y tomó 0126; nada asume números contiguos: migrar.sh aplica en orden de nombre y ningún guardián cuenta huecos)**
- **`push_tokens`** (`id`, `user_id`, `session_id`, `app`, `platform`, **`provider check in ('apns','fcm','webpush','sim')`**, `token_enc` + **`token_hash`
  único** (nunca en claro), `webpush_keys_enc` (p256dh y auth), `lang`, `created_at`, `last_ok_at`, `last_seen_at`, **`revoked_at`**, `revoked_reason check in
  ('salir','invalido','apagado','reemplazado','admin','vencido')`; índice `(user_id, app) where revoked_at is null`). Salir de la cuenta revoca el token de
  esa sesión en la misma transacción.
- **`push_outbox`** (`id`, `notification_id`, `token_id`, `payload_enc`, `priority check in ('alta','normal')`, `collapse_key`, `not_before`, `tries`,
  `status check in ('pendiente','enviando','hecho','fallo')`; índice parcial de pendientes) y **`push_deliveries`** (**solo inserción**: `notification_id`,
  `token_id`, `provider`, `result check in ('enviado','invalido','rechazado','limite','error','pruebas')`, `provider_id`, `error_code`, `ms`, `at`; BRIN por
  `at`).
- `notifications` suma **`push_status check in ('no','pendiente','enviado','fallo','sin_app','apagado','silencio','pruebas')`**, `push_at`, **`opened_at`**,
  `opened_via check in ('push','campana','sms','correo')`.
- `notif_templates` suma **`push bool`** (default true), **`push_private bool`** (texto genérico; true en los grupos y plantillas de Salud, Niños, Soporte,
  sanciones y cuenta), **`app`** (`cliente|negocio|delivery|checkin`: qué app abre el aviso; de la familia de su `href`) y **`sms_mode check in ('siempre',
  'sin_push','nunca')`** (migra: `sms = true` y grupo `crit` → `siempre`; resto con `sms = true` → `sin_push`; `sms = false` → `nunca`; §3.3).
- `users.notif_prefs` suma la llave **`push`** por grupo (mismas llaves que hoy; el grupo `crit` y lo que no tiene interruptor no se apaga) y `mkt_push`
  (**apagado por defecto**; Apple 4.5.4).
- Claves: `push_ttl_h` 24, `push_reintentos` 5, `push_lote` 500, `push_por_minuto` 10000, `push_inactivo_dias` 90 (token sin uso → `vencido`).
- `feature_flags`: **`push.webpush` · `push.apns` · `push.fcm`** (sandbox encendidos; producción, Fase 9).
- Plantillas nuevas: `puerta_abre` y `puerta_asignada` con push (LAUNCH L881), `rep_entrega_asignada` (Repartidor).

**`0130 llaves_acceso` (8d; renumerada: el plan la ponía en 0128, que tomó 8e; la última confirmada era 0129 (8g), así que 8d tomó 0130, sin semilla. Construida además con `passkey_log` solo inserción, `sessions.via`/`passkey_id`, `users.llave_ofrecida_at`, el aviso `cuenta_llave_quitada` y los límites `passkey_retos_hora`/`passkey_fallos_hora`: ver REVISION «8d»)** — **`passkeys`** (`id`, `user_id`, `credential_id` único, `public_key`, `sign_count`, `aaguid`, `transports text[]`,
`backed_up bool`, `name` («iPhone de Ana»), `created_via` (`app`, `platform`), `created_at`, `last_used_at`, **`revoked_at`**, `revoked_by check in
('user','staff','sistema')`), **`webauthn_challenges`** (`id`, `user_id` null, `purpose check in ('registro','entrar','confirmar')`, `challenge_hash`,
`expires_at` (2 min), `used_at`; un uso), `account_changes.kind` suma **`'passkey'`**, plantilla `cuenta_llave_nueva` (crit: «Agregaste una llave de acceso
en {dispositivo}. Si no fuiste tú, entra y quítala.»). Claves `passkey_max` 10, `passkey_reto_s` 120.

**0128 `ruta_en_vivo` (8e; renumerada: el plan la llamaba 0129 y su semilla 0045_ruta.sql; la última confirmada era 0127 / 0045, así que 8e tomó 0128 y `0046_ruta.sql`. 8d, que estaba en 0128, y 8b tomarán las siguientes libres. Construida con `delivery_tracks` aparte en vez de columnas en la entrega: ver REVISION «8e»)** — **`delivery_positions`** (**solo inserción**: `delivery_id`, `rider_user_id`, `city_id`, `at`, **`geom geography(Point)`**,
`accuracy_m`, `speed_mps`, `heading`, `source check in ('app','web')`; BRIN por `at`, GIST por `geom`; **purga a los `ubic_retener_dias`**, luego solo el
resumen en la entrega); la entrega suma `sharing_from`, `sharing_until`, `distance_m`, `last_position_at`; trigger `NOTIFY 'ruta'` con el id de la entrega
(como `ticket_scans` → `'puerta'`). Claves `ubic_cada_s` 10, `ubic_min_m` 25, `ubic_retener_dias` 14 (§6 #14), `ubic_cliente_desde` (`recogido`).
`feature_flags` **`app.ubicacion_vivo`**. Semilla **`0045_ruta.sql`**.

**0130 `apps_beta` (8f)**
- **`app_error_groups`** (`id`, `fingerprint` único, `app`, `platform`, `kind check in ('js','nativo','cierre','red')`, `title` tapado ≤ 200, `first_seen`,
  `last_seen`, `count`, `users_n` (aproximado), `first_build`, `last_build`, `status check in ('nuevo','visto','resuelto','silenciado')`, `resolved_in_build`)
  + **`app_error_events`** (**solo inserción**: `group_id`, `at`, `build`, `os_version`, `device_model`, `route_family` (nunca la URL con ids), `stack`
  (tapado, ≤ 16 KB), `session_hash`, `user_id` null; BRIN por `at`; **purga a los `errores_retener_dias`**).
- **`app_builds`** (`id`, `app`, `platform`, `version` (semver), **`build` int único por app y plataforma (creciente)**,
  `commit`, `flavor check in ('pruebas','produccion')`, `channel check in ('testflight_interno','play_interno','apk_propio','tienda')`, `status check in
  ('compilando','subido','procesando','disponible','fallo','retirado')`, `ci_run_url`, `size_bytes`, `symbols_media_id` (dSYM / `mapping.txt`, privado),
  `islas_sha` (huella de las islas que lleva), `created_at`, `updated_at`) — aquí porque Sistema › Apps › Versiones nace en 8f; 8h lo llena desde el CI.
- **`beta_testers`** (`id`, `user_id`, `app`, `platform`, `channel check in ('testflight','play_interno','apk_propio')`, `email_enc` (lo que pide Apple para
  invitar), `invited_by`, `invited_at`, `accepted_at`, `removed_at`, `removed_reason`).
- **`support_case_logs`** (**solo inserción**: `case_id`, `kind check in ('registro_app','captura')`, `body jsonb` tapado ≤ 32 KB, `at`);
  `support_cases.origin` suma **`'reporte_app'`**.
- Claves `errores_retener_dias` 90, `errores_por_minuto` 600 (por dispositivo 30), `reporte_logs_kb` 32, `beta_agitar` 1 (solo builds de prueba).
  `feature_flags` **`app.reportar`**. Semilla **`0046_apps_beta.sql`**.

**0129 `pases_wallet` (8g; renumerada: el plan la llamaba 0131; la última confirmada era 0128 (8e) y la última semilla 0046, así que 8g tomó 0129 y la semilla `0047_pases.sql` (esa coincide). Construida con un trigger por tabla —tickets, event_dates, events— que llama `pase_tocar()` en la misma transacción, `pass_registrations` con el estado del aviso por registro y `store_secrets.kind` + `'pass_type_csr'` (la llave de la solicitud del certificado nace en el servidor): ver REVISION «8g»)** — **`ticket_passes`** (`id`, `ticket_id`, `platform check in ('apple','google')`, `serial` único, `auth_token_hash`,
`pass_type_id` / `google_class_id`, `version`, `voided_at`, `updated_at`), **`pass_devices`** (`device_library_id`, `push_token_enc`, `created_at`) y
**`pass_registrations`** (`device_library_id`, `serial`, `created_at`, `removed_at`) — el servicio web de PassKit de Apple; **`pass_log`** (**solo
inserción**: `serial`, `action check in ('emitido','actualizado','anulado','registrado','baja')`, `at`). `feature_flags` **`app.wallet.apple`** ·
**`app.wallet.google`**. Semilla **`0047_pases.sql`**.

**0132 `tiendas_tuberia` (8h)** — **`ci_oidc_jti`** (`jti` pk, `exp`; el mismo token de GitHub no se usa dos veces), **`store_submissions`** (**solo inserción**: `build_id`, `kind check in ('testflight','play_interno','revision_publica','lanzamiento')`, `by`,
`founder_ok_ref`, `result`, `at`; **`revision_publica` y `lanzamiento` rechazados por `check` mientras el interruptor `app.tiendas.publico` esté
apagado**, que solo se enciende en la Fase 9).

**0133 `tiendas_fichas` (8i)** — **`store_listings`** (copia de lo enviado: `app`, `store check in ('apple','google')`, `locale` (`es-MX`/`en-US` en Apple,
`es-US`/`en-US` en Google, §6 #23), `title`, `subtitle`, `short_desc`, `description`, `keywords`, `promo`, `whats_new`, `privacy_url`, `support_url`,
`sha256` del archivo del repo, `pushed_at`, `pushed_by`; **el repo es la fuente**: `apps/mobile/tiendas/{app}/{locale}.md`), **`store_screenshots`** (`app`,
`store`, `device_class`, `locale`, `ord`, `media_id`, `commit`), **`data_inventory`** (generado desde `apps/mobile/inventario-datos.json`: categoría de
Apple y de Google, propósito, ligado a la persona, rastreo **false**, opcional, de qué tablas sale; de aquí salen las etiquetas, el CSV de Data safety y la
sección de `/privacidad`), **`review_accounts`** (`app`, `user_id`, `purpose`, `code_ref` (nombre del secreto), `active`, `created_by`; **vacía en el
sandbox salvo prueba; en producción se crea en la Fase 9**, §6 #24).

**Semillas de pruebas** (`is_test`, nunca en producción; guardián `semilla`): **`0044_push.sql`** (8c: tokens `sim` de los vecinos, dueños, repartidor y
portero de prueba; entregas en cada resultado; uno revocado por `invalido`), **`0046_ruta.sql`** (8e, renumerada desde 0045: una entrega activa en Hazleton con 30 posiciones de
una ruta real por calles de la semilla de direcciones; otra entregada con su resumen), **`0046_apps_beta.sql`** (8f: builds de las 4 apps en cada estado,
testers, tres grupos de errores (nuevo, visto, resuelto), un caso TK- de `reporte_app` con captura de ejemplo), **`0047_pases.sql`** (8g: un boleto de
prueba con su pase de Apple y uno anulado).

---

## 3. Cáscaras, push, enlaces, llaves, privacidad y reglas de las tiendas (servidor y nativo — Opus/high; revisión de seguridad obligatoria)

### 3.1 La cáscara: la web servida, no un export estático (§6 #2)
- **Decisión:** cada app es una cáscara de **Capacitor** (versión estable mayor del día de 8a, fija en el lockfile) cuyo WebView carga **la web servida**
  (`server.url` = `https://pruebas.tolatino.com{entrada}` en el sabor `pruebas`; `https://tolatino.com{entrada}` en el sabor `produccion`, Fase 9). **No hay
  export estático**: 138 de 151 páginas son `force-dynamic`, hay 125 archivos de acciones del servidor y la regla 5 («el servidor decide») lo prohíbe en
  la práctica; un export obligaría a duplicar la lógica en el cliente.
- **Lo honesto:** la documentación de Capacitor describe `server.url` como pensado para recarga en vivo y **no para producción** (a verificar el texto el
  día de 8a). Riesgos y cómo se cubren: (1) **sin red al abrir** → página local (`server.errorPath`) y **islas** empaquetadas (abajo); (2) **revisión de
  Apple 4.2** («minimum functionality») → la tesis de §1c, hecha de verdad y descrita en las notas para la revisión (§3.6); (3) **el puente nativo
  expuesto a lo que cargue el WebView** → navegación limitada a nuestro origen (abajo); (4) **la app cambia sin pasar por la tienda** → Apple 2.5.2 permite
  contenido web que no cambia el propósito de la app; lo nativo (permisos, plugins) solo cambia con una versión nueva revisada.
- **Islas locales (sin señal en frío):** las páginas que ya son `force-static` y funcionan sin servidor —`/puerta/sin-conexion`,
  `/cuenta/boletos/sin-conexion`— y una nueva **`/repartidor/sin-conexion`** se copian del build de Next al paquete de la cáscara (`webDir`) con sus
  `/_next/static`. Viven en otro origen (`capacitor://localhost` / `https://localhost`) que no ve el IndexedDB ni las cookies de la web; por eso **dentro de
  la app lo que se guarda para sin señal vive en el almacén nativo** (`TLLocal`, 8d): el paquete firmado de la Puerta y su cola, los QR cifrados de Mis
  boletos y la cola del Repartidor. El código de 6h no cambia: `lib/nativo/almacen.ts` elige IndexedDB en la web y `TLLocal` en la app (mismas funciones,
  mismo cifrado). Así **Safari ya no borra nada a los 7 días** (LAUNCH L892) y la llave queda en Keychain / Keystore (LAUNCH L908).
- **Alcance de navegación por app** (`apps.json` › `scope`): To'Latino abre todo menos `/panel*`, `/repartidor*`, `/puerta*`, `/admin*`; Negocios abre
  `/panel*` y lo común; Repartidor `/repartidor*` y lo común; Puerta `/puerta*` y lo común. **Lo común** en las cuatro: `/entrar`, `/recuperar`,
  `/cuenta/ajustes*` (incluye **Borrar mi cuenta**), `/soporte*`, `/ayuda*`, `/privacidad`, `/terminos`. Una ruta de otra app abre esa app si está instalada
  (enlace universal) o la vista de navegador del sistema (SFSafariViewController / Custom Tabs). Todo origen ajeno (Stripe Connect, mapas, sitios de
  negocios) abre en la vista del sistema o en su app, **nunca** en el WebView del puente. La regla está en tres lugares que deben coincidir (`allowNavigation`
  + el filtro nativo de navegación, el AASA / intent-filters, y el servidor que manda a la entrada correcta): guardián `cascaraSoloSuAlcance`.
- **Seguridad del WebView:** iOS con **App-Bound Domains** (`WKAppBoundDomains` = nuestro dominio; `limitsNavigationsToAppBoundDomains`; además habilita los
  service workers en WKWebView, a verificar); Android sin `addJavascriptInterface` abierto a otros orígenes (Capacitor usa `addWebMessageListener` con
  reglas de origen donde existe; **a verificar en 8a con una prueba: un iframe de otro origen —Stripe Elements— no alcanza el puente**); depuración del
  WebView solo en builds `pruebas`; **Content-Security-Policy** propia en la web (hoy no hay; `frame-ancestors 'none'`, `connect-src` cerrado), que también
  protege la web. `X-Frame-Options: DENY` sigue.
- **Identificación:** `appendUserAgent` = **`TLApp/{app}/{ios|android}/{version} ({build})`**. `lib/app-nativa.ts` (`deLaApp()`, solo servidor) lo lee;
  `lib/soporte.ts` deja de depender de `x-tl-app` (que WKWebView no puede poner en cada petición) y usa esto. Nunca autoriza (guardián `appNoAutoriza`).
- **Puente** (`apps/web/lib/nativo/`): el único lugar que importa `@capacitor/*`; cada función tiene su respaldo web (`Capacitor.isPluginAvailable`) y
  devuelve lo mismo en la web (guardianes `capacitorSoloEnPuente`, `nativoConRespaldo`). Plugins: oficiales de Capacitor (MIT) `app`, `browser`,
  `push-notifications`, `haptics`, `status-bar`, `splash-screen`, `keyboard`, `share`, `geolocation`; **propios** (Swift + Kotlin + TS, en
  `apps/mobile/plugins/`, pequeños): **`TLLocal`** (almacén cifrado: Keychain `AfterFirstUnlockThisDeviceOnly` / Android Keystore AES-GCM, fuera de la
  copia de iCloud), **`TLRuta`** (ubicación durante la entrega, 8e), **`TLLlave`** (passkeys nativas, 8d), **`TLPantalla`** (mantener encendida, brillo al
  mostrar un QR, fijar pantalla en Android), **`TLReporte`** (captura del WebView, agitar en builds de prueba, registro técnico en anillo, cierres de la vez
  anterior: MetricKit en iOS, `ApplicationExitInfo` en Android). Referencia MIT para `TLRuta`: `@capacitor-community/background-geolocation` (no se adopta
  sin auditar; §6 #14).
- **Proyecto nativo:** un proyecto de Xcode con **4 targets** y un proyecto de Gradle con **4 `productFlavors`**, cada uno con su `capacitor.config.json`
  generado desde `apps.json`, sus íconos, sus textos de permiso y **solo los plugins que usa** (un binario que enlaza CoreLocation sin texto de permiso lo
  rechaza Apple; Puerta no lleva ubicación). Si Capacitor no lo permite limpio, cuatro proyectos generados de la misma plantilla (a verificar en 8a).
  Mínimos (§6 #19): **iOS 16**, **Android 8 (API 26)**; `targetSdk` el que exija Google ese día. Solo iPhone (§6 #18).
- **Lo que se siente nativo:** áreas seguras (hoy solo AppShell y Puerta usan `safe-area-inset`; el panel y el Repartidor se revisan), botón «atrás» de
  Android (cierra la hoja de arriba → vuelve una pantalla → en la raíz sale), sin rebote de página ni zoom, teclado que no tapa el campo, splash hasta el
  primer pintado (máx. `app_splash_max_ms`), sin barras de navegador, sin «Instala la app» ni «Agregar a pantalla de inicio» dentro de la app (guardián
  `sinAvisoWebEnApp`), háptica en lo que confirma (escaneo, entregado).

### 3.2 Enlaces universales y App Links (8b)
- **`/.well-known/apple-app-site-association`** y **`/.well-known/assetlinks.json`** como rutas de Next (`app/.well-known/…/route.ts`), generadas de
  `apps.json` + `apple_team_id` + `app_signing_certs`: `200`, **`Content-Type: application/json`**, sin redirección, sin extensión el de Apple, ≤ 128 KB; el
  middleware y nginx no los tocan (el `matcher` hoy deja pasar `/.well-known/apple-app-site-association` porque no tiene extensión: se excluye); **Cloudflare
  no los desafía** (Apple los pide desde su CDN: regla de WAF «saltar» para `/.well-known/*`).
- AASA con `components` por app y en orden (las exclusiones primero): Negocios `/panel/*`; Repartidor `/repartidor/*`; Puerta `/puerta/*`; To'Latino todo lo
  demás menos `/admin/*`, `/api/*`, `/medios/*`, `/teselas/*`, `/.well-known/*`. `webcredentials` con los cuatro IDs (passkeys, 8d). Android: un
  `intent-filter` con `autoVerify` por familia de ruta en cada sabor y `delegate_permission/common.handle_all_urls` +
  `common.get_login_creds` en assetlinks con las huellas de la llave de subida **y** la de Play App Signing (la de Google se saca del APK firmado por
  Google que da la API de Play, sin pedirla a nadie; a verificar).
- **Un dominio por sabor:** el sabor `pruebas` declara solo `pruebas.tolatino.com`; el `produccion` solo `tolatino.com` (Fase 9). Un enlace del sandbox
  nunca abre una app de producción.
- **Los enlaces que mandamos** (SMS, WhatsApp, correo, push): el `href` del aviso ya es una ruta; la plantilla sabe qué app la abre (`notif_templates.app`).
  **Un enlace de un uso nunca se gasta con un GET** (las vistas previas de WhatsApp e iMessage lo abren): hoy `/compa/e/[token]` ya lo cumple (7h); se
  generaliza como guardián `enlaceUnUsoSinGet` sobre todo `route.ts`/página que lea un token. Sin la app: la web de siempre. **Volver de Stripe Connect**
  (onboarding y panel de Stripe en la vista del sistema): `return_url` = enlace universal a `/panel/{id}/cobros` → abre Negocios.
- Analítica: `enlace_app` / `enlace_web` por familia de ruta (nunca el token ni ids).

### 3.3 Avisos push propios (8c; §6 #3–#5)
- **Construir lo propio, sin pagar nada nuevo.** El **servidor de avisos es nuestro** (plantillas, preferencias, silencio, cola, reintentos, tokens,
  estadísticas, privacidad); **el último tramo es del sistema operativo y no se puede replicar**: un iPhone solo despierta por **APNs** (Apple) y un
  Android con Google Play, de forma fiable con la pantalla apagada, solo por **FCM** (Google). Ambos son **gratis**: §8 no crece. La web instalada usa
  **Web Push** (VAPID, RFC 8030/8291/8292), que también pasa por el servicio de push del navegador (Apple, Google o Mozilla).
- **iOS → APNs directo** (HTTP/2 con JWT firmado por la llave `.p8`; **sin SDK de Firebase en iOS**). **Android → FCM HTTP v1** con una cuenta de servicio;
  en la app solo **Firebase Messaging** (sin Analytics, Crashlytics ni nada más; recolección apagada en el manifiesto). **Web → Web Push** con llaves VAPID
  generadas en el servidor (sin cuenta de nadie: **funciona antes de que existan las cuentas de Apple y Google**; cumple el paso 1 de W: el iPhone del
  fundador con `pruebas.tolatino.com` en la pantalla de inicio recibe avisos). La app de vecinos suma manifiesto y un service worker de push con alcance `/`
  que no guarda nada (los de `/puerta` y `/cuenta/boletos` siguen con su alcance).
- **Alternativa descartada:** UnifiedPush / ntfy propio (código abierto) — exige que la persona instale otra app distribuidora; no es «a la altura de los
  grandes». Se anota como opción si algún día se quiere salir de FCM.
- **Cómo sale un aviso:** `avisar()` sigue igual por fuera (nunca rompe la acción); por dentro, después de guardar la notificación, **encola** en
  `push_outbox` (≤ 5 ms) para cada token activo de la persona en la app de la plantilla (si no tiene esa app, en To'Latino; si no, Web Push). Un trabajador
  propio (`servicio push`, misma imagen que la web, perfil del compose como `barrido`) manda en lotes con conexiones HTTP/2 reusadas; respuesta `410
  Unregistered` / `UNREGISTERED` / `404` de Web Push → token `invalido`. **Push primero, SMS de respaldo** (`sms_mode`): `siempre` solo el grupo `crit`
  (lo que hoy «siempre llega»); `sin_push` = SMS **solo si la persona no tiene ningún token activo para esa plantilla** o el push vuelve `invalido`;
  baja los SMS pagados (decisión E) y cumple fase7 §6 #14. Horas de silencio, preferencias y STOP se respetan igual que hoy.
- **Contenido:** título y cuerpo de la plantilla en el idioma de la persona, ≤ 4 KB, `href` relativo, sin teléfono, correo, montos de Salud ni nombres de
  menores. **`push_private`** → texto genérico (§1c) y el detalle se pide al abrir con la sesión. iOS: `interruption-level` **`time-sensitive`** solo para
  `biz_req` (el negocio tiene minutos para contestar) y `puerta_abre`; nunca `critical`. `collapse-id` por operación (el estado nuevo reemplaza al viejo).
- **Abrir:** el toque abre la ruta en la app correcta y marca `opened_at` / `opened_via 'push'`; la campana marca leído igual que hoy.
- **Estadísticas** (Super Admin › Notificaciones, LAUNCH L344): enviados, entregados al proveedor, inválidos, abiertos y SMS ahorrados por plantilla,
  app, plataforma y día; tokens activos por app. Sin personas (`analiticaSinPersonas`).
- **Simuladores y contrato:** `scripts/push-sim/` (un APNs y un FCM falsos que contestan como los reales: 200, 400 `BadDeviceToken`, 410, 429; y un servicio
  Web Push que descifra lo que recibe para comprobarlo) + **contrato** contra la especificación pública de APNs, FCM HTTP v1 y Web Push (como
  `scripts/contrato-canales/`). En el sandbox, sin llaves, el proveedor es `sim` y el push queda «en modo pruebas» visible en el Super Admin, como el SMS.

### 3.4 Llaves de acceso (passkeys) y el almacén del teléfono (8d; §6 #13)
- **Servidor WebAuthn propio** (registro, entrar, confirmar) sobre `passkeys` / `webauthn_challenges`; RP ID = el dominio (`pruebas.tolatino.com` hoy). Se
  puede usar una biblioteca MIT para verificar la atestación (a elegir en 8d con revisión) o la verificación propia con `node:crypto` (ES256/EdDSA/RS256).
- **Web:** `navigator.credentials` en Safari y Chrome. **Apps:** `TLLlave` con las API del sistema (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider`;
  Android Credential Manager), porque el soporte de WebAuthn dentro de WKWebView y del WebView de Android **no es seguro de asumir** (a verificar; si el
  WebView lo trae, `TLLlave` queda de respaldo). Requiere `webcredentials` en el AASA y `get_login_creds` en assetlinks (8b).
- **Flujo (decisión E):** teléfono y código una vez → «Entra la próxima vez con Face ID / tu huella» (hoja; «Ahora no») → en un dispositivo nuevo, «Entrar
  con llave de acceso» antes que el SMS; el SMS sigue siempre como camino. Mi cuenta › Privacidad: llaves con su dispositivo, quitar; aviso `crit` al
  agregar una. Super Admin › Usuarios 360°: ver y revocar con motivo. **Equipo:** se ofrece y se guarda; hacerlo obligatorio para el Super Admin es la
  Fase 9 (LAUNCH L36, T#30).
- **`TLLocal`** (almacén): llave AES de 256 bits en Keychain / Keystore, datos cifrados en archivos del contenedor (excluidos de la copia); se borra al
  salir de la cuenta y al borrar la app. Lo usan las islas (§3.1).

### 3.5 Tubería de tiendas, firma y llaves (8h; §6 #11–#12)
- **Mac en la nube = runners macOS de GitHub Actions** (`macos-*` con el Xcode que exija Apple ese día). **El repo es público**: los runners estándar son
  **gratis y sin límite de minutos** en repos públicos (si el repo pasa a privado, macOS cuenta 10× sobre los minutos incluidos y entra el «si se agotan»
  de §8). Android en `ubuntu-latest` (con KVM para el emulador). Alternativas descartadas por precio: Codemagic, Bitrise, Mac mini por hora (mínimo 24 h por
  la licencia de Apple), EC2 Mac.
- **Las cáscaras no se recompilan con cada cambio de la web** (la web es servida): un build nativo solo cuando cambia `apps/mobile/**`, un plugin, una isla
  o la versión; `workflow_dispatch` para pedirlo. Unos 15 min por plataforma y app (a medir).
- **Ninguna llave en GitHub ni en el repo.** Las llaves viven cifradas en el **llavero** del servidor del sandbox (`store_secrets`, 8a). El job de CI se
  identifica con **OIDC de GitHub** (sin token guardado en ningún lado): pide un JWT con `audience tolatino-tiendas`, el servidor lo valida contra las
  llaves públicas de GitHub (`iss`, `aud`, **`repository devpayxer/tolatino`**, **`environment tiendas`**, `ref` `refs/heads/pruebas` (y `produccion` en la
  Fase 9), `event_name` `push` o `workflow_dispatch`, `jti` sin usar, `exp`), anota la lectura y entrega solo las llaves de ese job, por HTTPS; el job las
  pone en un llavero temporal y las borra al final (`if: always()`). Los PR desde forks no tienen OIDC ni llaves; **no se usa `pull_request_target`**.
  Alternativa (§6 #11): secretos del entorno `tiendas` de GitHub puestos por la API.
- **iOS:** firma **administrada por Apple en la nube** (`xcodebuild -allowProvisioningUpdates` con la llave de la API de App Store Connect: el certificado
  de distribución no sale de Apple; **a verificar que la llave con rol Admin lo permite**); si no, `cert`/`sigh` de fastlane con la llave de la API y el
  `.p12` generado en el primer job, guardado en el llavero (`ios_dist_cert`). App IDs, capacidades (push, associated domains, Wallet) y perfiles por la API.
  Subida a TestFlight con fastlane `pilot` (MIT, versión fija en `Gemfile.lock`) o la API. **Crear el registro de cada app en App Store Connect no está en
  la API pública** (a verificar): si sigue así, son 4 toques del fundador (§10).
- **Android:** **llave de subida generada por nosotros** en el primer job (`keytool`, guardada en el llavero; nadie la ve) + **Play App Signing** (Google
  guarda la de firma). AAB a **Play interno** por la API de Google Play (cuenta de servicio). **Crear la app en Play Console es solo de consola** (4
  toques); la primera subida por API a una app recién creada, a verificar.
- **Versionado:** `apps/mobile/{app}/version.json` (semver) = `MARKETING_VERSION` = `versionName`; **build** = número creciente por app y plataforma
  (`app_builds`); cambiar código nativo exige subir la versión (guardián `versionCoherente`). `app_min_build_*` nunca por encima del último build disponible.
- **Símbolos:** dSYM y `mapping.txt` de cada build al almacén privado (Garage, `media` privada); se simbolizan los cierres en el servidor con
  `llvm-symbolizer` y `retrace` (Linux), sin servicio externo.
- **Sabor y canal:** en la Fase 8 solo se compila el sabor **`pruebas`** (apunta al sandbox) y solo va a **TestFlight interno**, **Play interno** y el **APK
  propio** (§6 #10). El sabor `produccion` y cualquier envío a revisión pública los bloquea `store_submissions` + el interruptor `app.tiendas.publico` y el
  guardián `tiendaSoloProduccion` hasta la Fase 9.

### 3.6 Reglas de Apple y Google (análisis; se vuelven a leer el día de cada envío)
- **Apple 4.2 (funcionalidad mínima) y 4.2.2 (no un sitio empaquetado):** se cumple con lo que la web no hace y la app sí, por app: **To'Latino** (push de
  pedidos, citas y boletos; boletos sin señal desde el arranque con llave en el Keychain; Apple Wallet; Face ID; enlaces universales desde SMS y WhatsApp;
  compartir y háptica), **Negocios** (push con sonido de solicitud nueva —`time-sensitive`—; cámara para escanear cupones y boletos en el modo puerta;
  Face ID; volver de Stripe), **Repartidor** (ubicación con la pantalla apagada solo durante la entrega; sin señal en frío; pantalla encendida; abrir
  Mapas o Waze), **Puerta** (cámara a pantalla completa con la pantalla encendida; sin señal en frío con la lista firmada en el Keychain; háptica y sonido;
  fijar pantalla en Android; push «Hoy escaneas»). Las notas para la revisión lo dicen con una lista y un video corto por app.
- **Apple 4.3 (spam: varias apps del mismo código):** cuatro públicos y tareas distintas (como Uber · Uber Driver · Uber Eats Manager; DoorDash · Dasher ·
  Merchant): cada cáscara solo abre su alcance (§3.1) y tiene su ficha. Alternativa para Puerta y Repartidor: **distribución no listada** de Apple (§6 #22).
- **Apple 2.1 (app completa):** pantallas «Pronto» (`Pronto.tsx`, `PantallaPronto.tsx`, la pestaña de El Patio) son motivo de rechazo en la revisión
  pública; en la Fase 9 no debe quedar ninguna alcanzable (guardián `sinProntoEnTienda`, en la Fase 8 solo avisa). «Ciudad próximamente» es una función,
  no un hueco (se explica en las notas).
- **Apple 5.1.1(v) / Google Play (borrar la cuenta):** ya existe dentro de la app (Mi cuenta › Ajustes › Borrar mi cuenta, en el alcance común de las
  cuatro); Google además pide **una URL web** para pedir el borrado sin la app → `/cuenta/ajustes/borrar` (entra y vuelve). **Dependencia:** el borrado
  definitivo a los 30 días (LAUNCH L314) tiene que correr antes de la revisión pública: lo que la pantalla promete tiene que pasar.
- **Apple 4.8 (Iniciar sesión con Apple):** **no aplica**. 4.8 pide una opción equivalente solo a las apps que usan un **servicio de entrada de terceros**
  (Google, Facebook…) para la cuenta principal; To'Latino usa **su propio** sistema (teléfono verificado, sesión, passkeys), que la regla exceptúa
  expresamente. Si un día se agrega «Entrar con Google», entra Apple también.
- **Apple 3.1.1 / 3.1.3 y Pagos de Google Play (§6 #6–#7):** pedidos, citas, reservaciones, depósitos, boletos de eventos, propinas y rentas son **bienes y
  servicios que se consumen fuera de la app** (Apple 3.1.3(e)) → se cobran con tarjeta por Stripe en nuestra hoja, sin compra dentro de la app. Las
  **monedas** no se compran (5f) y se canjean en negocios: sin compra digital. **El plan Pro ($14.99/mes) sí es una función digital del panel**: el camino
  seguro es Apple **3.1.3(f)** (app gratuita compañera de una herramienta web pagada) → **en las apps no se vende Pro ni hay botón o enlace para
  comprarlo**; el panel muestra el estado del plan («Pro hasta el 12 de dic») y se gestiona en la web (guardián `sinCompraDigitalEnApp`, servidor por
  `TLApp`). Las reglas del escaparate de EE. UU. sobre enlaces a compras externas cambiaron en 2025 por el caso Epic: **a verificar el día del envío**;
  cambiar el default es decisión del fundador. **Apple Pay dentro de la app:** Apple Pay en la web no funciona en un WKWebView con scripts inyectados (el
  puente lo es; a verificar): Apple Pay / Google Pay quedan para su fase con un plugin nativo de Stripe (LAUNCH).
- **Apple 5.1.1(ix) (servicios regulados por una entidad):** To'Latino cobra con tarjeta y agenda citas médicas → Apple espera **una organización**, no una
  persona (§6 #1).
- **Apple 1.2 (contenido de usuarios):** reportar, bloquear, filtro y contacto ya existen (5d); se citan en las notas.
- **Apple 4.5.4 (push):** el push no es necesario para usar la app y lo de mercadeo pide permiso aparte (`mkt_push` apagado por defecto).
- **Apple 5.1.1(iv) / 5.1.5 (permisos y ubicación):** pedir cada permiso en el momento en que se usa, con la hoja previa (§1b #2); ubicación solo donde es
  directamente útil.
- **ATT (App Tracking Transparency):** **no rastreamos** (sin SDK de anuncios, sin IDFA / `AdSupport`, sin compartir datos con terceros para publicidad;
  la cookie `tl_dev` es primera parte para analítica propia y antiabuso). Sin `NSUserTrackingUsageDescription`; `PrivacyInfo.xcprivacy` con
  `NSPrivacyTracking false` y las razones de las API (UserDefaults, fecha de archivos…). Guardián `sinRastreo`.
- **Etiquetas de privacidad (Apple) y Data safety (Google):** salen de **un inventario real** (`apps/mobile/inventario-datos.json` → `data_inventory`),
  hecho desde el modelo y las migraciones: teléfono, nombre, correo (opcional), ubicación precisa (Repartidor durante la entrega; To'Latino solo al
  tocar), fotos y contenido que sube la persona, mensajes, historial de compras, identificadores (cuenta, `tl_dev`), datos de diagnóstico (errores),
  interacción (analítica propia), datos de salud **no** (las citas de Doctores guardan el servicio, no un diagnóstico; a revisar con 4j/HIPAA de LAUNCH),
  ligados a la persona, **sin rastreo**, cifrados en tránsito, con borrado. El mismo inventario escribe la sección de `/privacidad` (§6 #26). Apple App
  Privacy **no está en la API de App Store Connect** y Data safety, la clasificación IARC, el público objetivo y las declaraciones de Google **solo se
  llenan en la consola** (a verificar): van al paquete del fundador con una pantalla lado a lado (§10, Paquete 8-3).
- **Clasificación por edad (§6 #20):** contenido de usuarios y mensajes; referencias a alcohol (Noche, eventos 21+); sin juegos de azar (El Patio no
  entra). Esperado: **17+** en Apple (escala de ese día) y **Mature 17+** en IARC; Claude contesta el cuestionario de Apple por la API con la verdad.
- **Cifrado (exportación):** solo HTTPS y el cifrado del sistema (`ITSAppUsesNonExemptEncryption = NO`, a verificar el día).
- **Repartidor en Google Play:** servicio en primer plano de tipo **ubicación** (Android 14+ pide `FOREGROUND_SERVICE_LOCATION` y la declaración en la
  consola con descripción y quizá video, que generamos del emulador); **sin `ACCESS_BACKGROUND_LOCATION`** (no hace falta: el servicio arranca con la
  app abierta). iOS: **«Mientras se usa» + `UIBackgroundModes location`** con el indicador azul, **nunca «Siempre»**.
- **Fotos:** el selector del sistema (sin `READ_MEDIA_IMAGES` ni acceso a toda la galería; política de Google de 2024). Sin micrófono en ninguna app.
- **Lo que piden las tiendas que todavía no existe:** URL de privacidad y de soporte (`/privacidad`, `/soporte` público), contacto para la revisión,
  **cuentas de revisión** que puedan entrar sin un SMS real (§6 #24), sitio en el dominio para la verificación de la organización de Apple (§6 #26).

### 3.7 Lo que esta fase NO hace
Revisión pública ni lanzamiento (Fase 9) · el sabor `produccion` y su dominio (Fase 9) · beta con vecinos reales (Fase 9, §6 #9) · Apple Pay / Google Pay
nativos (su fase) · grabación de sesiones (rrweb no existe, §6 #16) · El Compa en Puerta y Repartidor (fase7 §6 #18) · llamada enmascarada, prueba de
entrega con foto, ofertas con cuenta regresiva y lotes del Repartidor (LAUNCH L366–368, siguen ahí) · venta en la puerta (D1) · iPad nativo (§6 #18) ·
QR rotativo y red entre teléfonos de la puerta (LAUNCH, 6h).

---

## 4. Bloques

### 8a · Dominio con HTTPS, las cuatro cáscaras, el puente nativo, las islas y el llavero (+ Super Admin › Sistema › Apps e Integraciones) — **Opus/high**
**Estado (11 nov): hecho salvo el dominio.** El Paquete 8-0 sigue en el fundador; todo lo demás está construido y probado (`app8a` 110,
`alreves8a` 55/55, regresión en verde) con `TOLATINO_URL` configurable. Android e iOS los compila el CI (`cascaras.yml`); aquí no se pudo (red y
sin Xcode). Desvíos y lo diferido: `docs/REVISION.md` «8a» y `docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8a».
**Antes de nada (Paquete 8-0, §10):** `pruebas.tolatino.com` detrás de Cloudflare con HTTPS completo (DNS y modo «Full (strict)» por la API de Cloudflare
con el token guardado por el formulario seguro; certificado del origen con Let's Encrypt HTTP-01 en el sandbox desde `deploy.sh`; nginx escucha 443;
`TOLATINO_URL` y cookies `secure`). Sin esto no siguen 8b, 8d ni 8h. Si el dominio tarda, 8a sigue con las cáscaras en simuladores contra el sandbox por
HTTPS de prueba y se anota.
**Datos:** migración 0125.
**Nativo:** `apps/mobile/` (`apps.json`, proyectos iOS con 4 targets y Android con 4 sabores, `capacitor.config` generado, íconos y splash (hueco #1),
textos de permiso ES/EN, `PrivacyInfo.xcprivacy`, plugins `TLLocal`, `TLPantalla`, `TLReporte` (lo mínimo: registro técnico), página local «Sin señal» e
**islas** copiadas del build). `pnpm --filter @tolatino/mobile` con `cap sync` por app.
**Pantallas:** «Actualiza la app» y aviso suave (hueco #3), «Sin señal» en frío (#4), «Esta app está en pausa» (interruptor), la hoja previa de permisos
(#2, la usan 8c y 8e). **Servidor:** `lib/app-nativa.ts` (`deLaApp`, versión mínima, alcance), redirección a la entrada de cada app, CSP, sesiones con
`app` / `platform` / versión; `lib/nativo/*` (puente con respaldo); `lib/nativo/almacen.ts` (IndexedDB en la web, `TLLocal` en la app) y Puerta, Mis
boletos y Repartidor pasan a usarlo sin cambiar su lógica; isla nueva `/repartidor/sin-conexion` (lo pendiente y las entregas del turno, sin datos del
cliente más allá de lo que ya ve). **Llavero:** `lib/tiendas/llavero.ts` (`guardar` (archivo → huella → sobre cifrado; nunca se vuelve a mostrar), `leer`
(solo servidor, anotado), `retirar` con motivo).
**Super Admin:** **Sistema › Apps** (por app y plataforma: build mínimo y de aviso con límites, motivo y auditoría; sesiones activas por app y versión) y
**Sistema › Integraciones › Llaves de las tiendas** (subir archivo, huella, quién, cuándo, vence, retirar; solo admin, vuelve a pedir el código o la llave
antes de subir). Usuarios 360° › Sesiones muestra app y versión.
**CI:** jobs `cascara-android` (Linux: build debug de los 4 sabores + emulador: abre la entrada, el alcance, la isla en modo avión) y `cascara-ios`
(macOS: build de simulador sin firma de los 4 targets + XCUITest mínimo: abre, isla en modo avión, captura). Corren cuando cambia `apps/mobile/**` o una isla.
**Guardianes:** `appsUnaFuente`, `cascaraSoloSuAlcance`, `capacitorSoloEnPuente`, `nativoConRespaldo`, `appNoAutoriza`, `permisoConTexto`,
`permisosMinimos`, `sinRastreo`, `sinAvisoWebEnApp`, `islaCoherente`, `llavesFueraDelRepo`; punta a punta `app8a` (Playwright con el rótulo `TLApp` en
teléfono 390: cada app entra a su entrada, una ruta ajena va a la otra app o a la web, build bajo el mínimo → «Actualiza», interruptor apagado → pausa, la
CSP no rompe ninguna pantalla de la regresión) y `nat8a` (emulador y simulador: modo avión al abrir → isla de la Puerta con la lista firmada guardada en
`TLLocal`; otra cuenta en el mismo teléfono no ve nada; **un iframe de otro origen no alcanza el puente**); subir una llave → huella, nunca el contenido en
HTML ni RSC; otro rol → 403.
**Ayuda:** `apps-de-to-latino` (vecino: qué app es para qué y cómo se instala), `admin-sistema-apps` y `admin-llaves-de-las-tiendas` (equipo).

### 8b · Enlaces universales y App Links, enlaces de SMS, WhatsApp y correo, y volver de Stripe — **Opus/high**
**Datos:** la siguiente migración libre (antes 0126 y después 0127; 8c tomó 0126 y 8f tomó 0127).
**Servidor:** `app/.well-known/apple-app-site-association/route.ts`, `app/.well-known/assetlinks.json/route.ts` (de `apps.json` + `apple_team_id` +
`app_signing_certs`), exclusión en el `matcher` del middleware, regla de Cloudflare para `/.well-known/*` (por la API), `lib/enlaces.ts` (`hrefDeAviso`
con la app que lo abre), Stripe Connect con `return_url` / `refresh_url` universales, `@capacitor/app` `appUrlOpen` → navegar dentro de la cáscara
(validado contra el alcance; lo de fuera, a la vista del sistema).
**Pantallas:** ninguna nueva. **Super Admin:** Sistema › Apps › **Enlaces** (estado del AASA y de assetlinks como los ve Apple y Google: código,
tipo, tamaño, apps; huellas cargadas; «Probar un enlace» que dice qué app lo abriría).
**Guardianes:** `aasaYAssetlinks` (200, `application/json`, sin redirección, cada app, cada huella, ≤ 128 KB; se prueba contra lo servido), `enlaceUnUsoSinGet`,
`enlacesPorApp` (toda plantilla con `href` tiene app); punta a punta `enl8b` (pedir el AASA y assetlinks por HTTPS con el user-agent de Apple; el validador
de Google `digitalassetlinks` contra el sandbox cuando haya dominio; en emulador y simulador: `/pedido/…` abre To'Latino, `/panel/…` abre Negocios,
`/puerta/s/…` abre Puerta, `/compa/e/{token}` abre To'Latino y la vista previa (GET sin sesión) no lo gasta; sin la app → la web; una ruta de
`/admin` nunca abre una app; volver de Stripe (simulado) abre Cobros).
**Ayuda:** `apps-de-to-latino` al día (enlaces), `panel-cobros` al día (volver de Stripe).

### 8c · Avisos push propios: Web Push, APNs y FCM, push primero y SMS de respaldo — **Opus/high**
**Estado (11 nov): hecho, antes que 8b (el dominio sigue pendiente).** Migración **0126** (renumerada desde 0127), semilla `0044_push.sql`.
Web Push de verdad en `localhost` (contexto seguro) y «no disponible» en el sandbox por HTTP; APNs y FCM contra los simuladores de
`scripts/push-sim` y el contrato `scripts/contrato-push` (54 comprobaciones en el CI); `push8c` 86 comprobaciones (390 y 1360), 10 guardianes
nuevos o ampliados (37/37 al revés), 10 000 avisos por la tubería real (media 5 ms por aviso con el push encolado). Android pide su token de
FCM solo cuando el llavero tiene la cuenta de servicio (la cáscara trae la configuración de Firebase desde 8h). Desvíos y lo diferido:
`docs/REVISION.md` «8c» y `docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8c».
**Datos:** migración 0126 (el plan decía 0127); semilla `0044_push.sql`.
**Servidor:** `lib/push/` (`registrar(token, app, plataforma)` atado a la sesión, `revocar`, `encolar`, `enviar` con `apns.ts` (HTTP/2 + JWT ES256),
`fcm.ts` (OAuth de la cuenta de servicio → HTTP v1), `webpush.ts` (VAPID + aes128gcm, propio con `node:crypto`), `sim.ts`); `avisar()` encola y decide el
SMS por `sms_mode`; servicio **`push`** en el compose (perfil propio, como `barrido`, reintenta con espera creciente; caído = los avisos siguen en la
campana y el SMS de respaldo sale al vencer `push_ttl_h` para `sin_push`); llaves VAPID generadas una vez en `deploy.sh` como los demás secretos del
sandbox; APNs `.p8` y cuenta de servicio de FCM desde el llavero. Manifiesto de la app de vecinos + `/sw-push.js` (solo push y abrir; no guarda nada).
**Pantallas:** hoja previa de avisos en el momento útil (primer pedido, primera cita, primer boleto; en Negocios al abrir el panel; Repartidor al entrar en
línea; Puerta al aceptar una puerta) — nunca al abrir la app por primera vez; Mi cuenta › Avisos: «En este teléfono» (encendidos / apagados en el sistema
→ «Abrir Ajustes») y push por grupo; Panel › Más › **Tus apps** (hueco #8) con los avisos del panel. **Super Admin:** Notificaciones con push en cada
plantilla (encender, privado, app), cifras de entrega y apertura (LAUNCH L344); Sistema › Integraciones › **Push** (proveedores, llaves, tokens activos,
cola, errores, «Mandar un push de prueba a mi teléfono»); Usuarios 360° › Dispositivos (tokens por app; revocar con motivo).
**Guardianes:** `pushConPlantilla` (no hay push sin plantilla), `pushPrivadoSinTexto`, `smsSoloRespaldo`, `pushFueraDeTx` (encolar nunca hace red
dentro de una transacción), `tokensCifrados`, `avisoConPlantilla` ampliado; contrato `scripts/contrato-push/` en CI; punta a punta `push8c` con los
simuladores: pedido aceptado → push al teléfono del vecino y **sin SMS**; sin token → SMS como hoy; token inválido → revocado y SMS; plantilla de Salud →
texto genérico; silencio a las 11 PM → nada hasta las 7 (lo `crit` sí); STOP y preferencias igual que hoy; dos teléfonos → dos push; salir de la cuenta
→ el token de esa sesión ya no recibe; 10 000 avisos → todos encolados ≤ 5 ms cada uno y enviados por el trabajador; Web Push real en Chromium con su
servicio de push cuando la red lo permita (si no, el simulador descifra y compara).
**Ayuda:** `avisos-en-tu-telefono` (vecino), `panel-avisos` (negocio), `admin-push` (equipo); `notificaciones` y `mi-cuenta` al día.

### 8d · Entrar con Face ID o huella (passkeys) en la web y en las apps, y el almacén del teléfono — **Opus/high**
**Estado (11 nov): hecho en la web; TLLlave nativo compilado y apagado hasta 8b.** Migración **0130** (renumerada desde 0128; sin semilla).
`@simplewebauthn/server` 14.0.3 fijo; la llave y el código abren la misma sesión (`lib/cuenta.ts` `abrirSesionEn`). `llave8d` 90 comprobaciones
(390 y 1360, autenticador virtual de Chromium), 5 guardianes nuevos (`retoUnUso`, `llaveDeSuCuenta`, `passkeyNoSaltaBloqueo`, `clonSoloConFirma`,
`llaveSoloDondeSePuede`) y 4 que ya cubren 8d (`libroSoloInsercion`, `nativoConRespaldo`, `pluginViejoNoRompe`, `accionesConAcceso`), 41/41 al revés.
En el sandbox por HTTP en la IP no se ofrece (correcto); funciona sola con el dominio. `TLLocal` ya estaba completo desde 8a. Desvíos y lo diferido:
`docs/REVISION.md` «8d» y `docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8d».
**Datos:** migración 0130 (el plan decía 0128).
**Servidor:** `lib/llaves/` (`retoRegistro`, `registrar`, `retoEntrar`, `entrar` → la misma sesión de `lib/cuenta.ts`, `quitar`), límites de intentos,
aviso `crit` al agregar; `TLLlave` nativo (iOS / Android) y `TLLocal` completo (lo usan las islas desde 8a).
**Pantallas:** Entrar con «Usar mi llave de acceso» (si el dispositivo la ofrece), la hoja «Entra la próxima vez con Face ID / tu huella» después del
código, Mi cuenta › Privacidad › **Llaves de acceso** (lista, quitar). **Super Admin:** Usuarios 360° › Seguridad (llaves con dispositivo y última vez;
revocar con motivo, aviso y auditoría); Sistema › Equipo: cada miembro ve si tiene llave.
**Guardianes:** `retoUnUso`, `llaveDeSuCuenta` (una llave nunca entra a otra cuenta), `passkeyNoSaltaBloqueo` (cuenta suspendida o dispositivo
bloqueado: la llave no entra), `accionesConAcceso`; punta a punta `llave8d` con autenticador virtual de Chromium (WebAuthn de Playwright/CDP): registrar,
salir, entrar sin SMS; reto repetido o vencido → no; llave de otra cuenta → no; quitarla → ya no entra; cuenta borrada programada → entrar la cancela
como hoy; en simulador y emulador, `TLLlave` con la biometría simulada (a verificar que el simulador de iOS la ofrece con dominio asociado).
**Ayuda:** `entrar-con-face-id` (vecino), `mi-cuenta` al día, `admin-usuarios` al día.

### 8e · Lo nativo de cada app: Repartidor con ubicación en vivo, Puerta en frío y con pantalla encendida, boletos y cupones — Sonnet/medium; ubicación Opus/high
**Estado (11 nov): hecho.** Migración **0128** (renumerada desde 0129) y semilla **0046_ruta.sql** (desde 0045). `app8e` 64 comprobaciones (390 y
1360), 7 guardianes nuevos y 2 ampliados (53/53 al revés), regresión en verde; Android e iOS compilados por el CI y el humo de la ruta en el emulador
(ver PROGRESS). El paso que inicia la entrega es **«Voy por el pedido»** (nuevo; o «Recogí»). Desvíos y lo diferido: `docs/REVISION.md` «8e» y
`docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8e».
**Datos:** migración 0128 (el plan decía 0129); semilla `0046_ruta.sql` (decía `0045_ruta.sql`).
**Repartidor:** `TLRuta` (iOS `CLLocationManager` con `allowsBackgroundLocationUpdates` e indicador; Android servicio en primer plano de tipo ubicación
con el aviso fijo de §1c) que **solo arranca** cuando el repartidor toca el paso que inicia la entrega y **para solo** en «Entregado», «Cancelar» o si el
servidor contesta que la entrega ya no está activa; cada `ubic_cada_s` o `ubic_min_m`, en lotes si no hay señal. Servidor `lib/ruta.ts` (`posicion` valida
repartidor, entrega activa, ciudad y velocidad posible; `NOTIFY 'ruta'`), SSE `/api/ruta/vivo` como la Puerta. **Mapa en vivo** en el pedido del cliente
desde «Recogí» (`ubic_cliente_desde`) y en el panel (Entrega › Despacho) desde que acepta, con la hora de la última posición; al entregar, desaparece. La
banda «Compartiendo tu ubicación» (hueco #6). Sin señal en frío: la isla. Pantalla encendida mientras hay entrega activa (`TLPantalla`).
**Puerta:** abre en frío sin señal (isla + `TLLocal`), pantalla siempre encendida mientras escanea, **linterna** (en Android por la restricción `torch`
de la cámara web; en iOS nativa si no choca con la cámara del WebView, a verificar), háptica y sonido; **«Fijar la Puerta en esta pantalla»** en Android
(`startLockTask`, la persona confirma) y en iOS la ayuda de **Acceso guiado** (el sistema no deja que una app se fije sola sin MDM; LAUNCH L862).
**To'Latino:** al mostrar un QR de boleto, brillo al máximo y se devuelve al salir; compartir nativo; háptica al pagar y confirmar.
**Negocios:** **«Escanear cupón»** (LAUNCH L657) con el lector de la Puerta (jsQR / BarcodeDetector) en el panel, también en la web; el modo puerta del panel
(6g) con pantalla encendida.
**Super Admin:** Transacciones › entrega con el recorrido (solo mientras dura y hasta la purga; abrirlo pide motivo y queda anotado); Configuración ›
Apps (cada cuánto, retención, desde cuándo lo ve el cliente).
**Guardianes:** `ubicacionSoloEntregaActiva` (el servidor rechaza posiciones sin entrega activa de ese repartidor), `rutaSoloDeLosTres` (solo el cliente
de ese pedido, el negocio y el admin con motivo la ven), `posicionesConPurga`, `permisosMinimos` ampliado (ubicación solo en Repartidor y To'Latino;
fondo solo en Repartidor); punta a punta `nat8e` (emulador con ruta GPX: entra en línea → acepta → el cliente no ve nada hasta «Recogí» → ve el pin
moverse → pantalla apagada, sigue → modo avión, se guardan y suben al volver → «Entregado» → el servicio se detiene y el cliente ya no ve el mapa; otro
vecino pide el SSE de esa entrega → 404; posición de una entrega ajena → rechazada) y `app8e` (web: escanear cupón con una imagen de prueba; brillo y
pantalla no rompen la web).
**Ayuda:** `repartidor-ubicacion` (repartidor), `puerta-sin-senal` y `puerta-fijar-pantalla` (portero), `panel-entrega` y `panel-cupones` al día,
`seguimiento-del-pedido` (vecino).

### 8f · Programa beta, «Reportar un problema», errores y cierres propios (+ Super Admin › Sistema › Apps completo) — Sonnet/medium; ingesta y tapado Opus/high
**Estado (11 nov): hecho salvo lo que piden las cuentas de las tiendas.** Migración **0127** (renumerada: el plan decía 0130) y semilla **0045**
(decía 0046): 8b, que tomaría 0127 en el papel, espera el dominio; 8b tomará la siguiente libre. Nada asume números contiguos. Probado: `beta8f`
94 comprobaciones (390 y 1360), contrato de las tiendas 46 (App Store Connect con su especificación OpenAPI 4.6 fijada; Google Play), 8 guardianes
nuevos o ampliados con `alreves8f` 48/48. TestFlight interno contra el simulador (faltan las cuentas, Paquete 8-2); el APK propio de punta a punta con
un APK de PRUEBA que arma el servidor (sin binarios en el repo); Play interno se agrega en Play Console (su API no acepta correos). Desvíos y lo
diferido: `docs/REVISION.md` «8f» y `docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8f».
**Datos:** migración 0127 (antes 0130); semilla `0045_apps_beta.sql` (antes 0046).
**Servidor:** `/api/errores` (JS de la web y de las apps, cierres nativos de la vez anterior; límite por dispositivo; **tapado** con `lib/compa/tapar.ts`;
agrupado por huella del stack; nunca la URL con ids ni el texto de un campo), `lib/reportar.ts` (`reportarProblema` → `abrirCaso` de 7b con tema
`tecnico`, `origin 'reporte_app'`, la captura como foto privada y el registro técnico en `support_case_logs`), `lib/beta.ts` (`invitar` por la API de
App Store Connect a TestFlight interno (necesita el correo de la cuenta; sin correo, se pide en la misma pantalla) y a la lista de Play interno o al
**APK propio** con enlace de un uso, §6 #10; `quitar`). TestFlight trae su propio «enviar comentario con captura»: si la API lo expone, se trae a Soporte
igual (a verificar).
**Pantallas:** «Reportar un problema» (hueco #5) en Mi cuenta › Ayuda y soporte, Panel › Más, Perfil del Repartidor y menú de la Puerta; **agitar** abre
lo mismo solo en builds de prueba (`beta_agitar`); el caso se ve en Soporte como cualquier otro. **Super Admin:** **Sistema › Apps** completo: Versiones
(lo que hay en TestFlight / Play interno / APK propio, en revisión y en la tienda; builds con estado, commit y CI), Testers (invitar a una cuenta To'Latino,
quitar con motivo), **Salud › Errores** (grupos por app, plataforma y build; tasa de sesiones sin cierre; «Visto», «Resuelto en el build N», silenciar con
motivo; la ficha con el stack simbolizado), Reportes (los casos `reporte_app` en la cola `ticket` de Soporte con la captura y el registro).
**Guardianes:** `erroresTapados`, `erroresSinPersonas` (nada de nombre, teléfono, correo ni ids de operación), `reporteConConsentimiento` (el registro
solo sale al tocar «Enviar»), `colaConVista` ampliado; el guardián **Errores en vivo** de PLAN §5 lee `app_error_groups` (grupo nuevo o pico por build →
aviso; en una app de tienda no hay vuelta atrás automática: se **pausa el lanzamiento por fases** por la API (Fase 9) y la web servida se vuelve atrás
como siempre); punta a punta `beta8f` (un error JS con un teléfono escrito en el mensaje → guardado tapado; 1 000 errores iguales → un grupo; cierre
nativo simulado en el emulador → aparece al abrir otra vez; reportar con captura → caso TK- con foto privada y registro; otra cuenta pide el caso → 404;
invitar un tester → simulador de la API).
**Ayuda:** `reportar-un-problema` (vecino, negocio, repartidor, portero), `admin-errores-y-beta` (equipo).

### 8g · El boleto en Apple Wallet y Google Wallet — **Opus/high** (firma y actualizaciones)
**Estado (11 nov): hecho contra la cadena de prueba y los simuladores.** Migración **0129** (renumerada desde 0131) y semilla `0047_pases.sql`.
Sin certificado del Pass Type ID ni cuenta de emisor de Google (Paquete 8-2, opcional): todo construido y probado con una cadena de prueba hecha
en el momento (nunca en el repo), el APNs simulado con TLS de cliente y el simulador de Google Wallet validado con su descubrimiento oficial
(`wal8g`, `alreves8g`, contrato `scripts/contrato-wallet`). El arte oficial de los botones espera aceptar las licencias de Apple y Google
(insignias provisionales marcadas). Desvíos y lo diferido: `docs/REVISION.md` «8g» y `docs/LAUNCH-CHECKLIST.md` «Fase 8 · 8g».
**Datos:** migración 0131 (hoy **0129**); semilla `0047_pases.sql`.
**Servidor:** `lib/pases/apple.ts` (`.pkpass` firmado con el certificado del Pass Type ID (llavero `pass_type_cert`, PKCS#7 propio con `node:crypto` o
`openssl` en el contenedor); el QR es **el mismo QR firmado del boleto** (6c), así la Puerta lo valida igual con y sin señal), el **servicio web de
PassKit** (`/api/pases/v1/devices/…`, `/passes/…`, `/log`) con su token por pase, y el push de actualización a Wallet por APNs (para pases se usa el
certificado del Pass Type ID, no la llave `.p8`; a verificar); `lib/pases/google.ts` (clase de evento y objeto por boleto con la API de Google Wallet,
enlace «Guardar» firmado con la cuenta de servicio). Transferir, devolver, anular o cambiar la fecha del evento (6d, 6e) **actualiza o anula el pase** en
la misma acción que ya avisa.
**Pantallas:** en el boleto (`/cuenta/boletos/[codigo]`) y en el correo de la compra: «Agregar a Apple Wallet» en iPhone y «Guardar en Google Wallet» en
Android (arte oficial, hueco #9). **Super Admin:** Eventos › boleto: pases emitidos y su estado; Sistema › Integraciones: certificado del pase (vence cada
año → aviso a los 30 días).
**Guardianes:** `paseMismoQr`, `paseSigueAlBoleto` (todo cambio del boleto toca su pase), `tokenDePase` (el servicio web solo responde con el token de ese
pase); punta a punta `wal8g` (emitir → el `.pkpass` valida su firma y su manifiesto; registrar un dispositivo de prueba → transferir el boleto → el pase
viejo queda anulado y se pide la actualización; token ajeno → 401; Google: objeto creado contra un simulador del contrato público; la Puerta escanea el
QR del pase igual que el de la app).
**Ayuda:** `boletos-en-wallet` (vecino), `admin-eventos` al día.

### 8h · Tubería de tiendas: llaves por OIDC, firma, versiones, TestFlight interno, Play interno y APK propio — **Opus/high** (secretos)
**Datos:** migración 0132.
**CI:** `.github/workflows/tiendas.yml` (entorno **`tiendas`** con regla de ramas; `permissions: id-token: write, contents: read`; jobs `ios-{app}` en
macOS y `android-{app}` en Linux, por matriz de las 4 apps; solo en `push` a `pruebas` con cambios nativos o `workflow_dispatch`): pedir llaves por OIDC →
build firmado → subir a **TestFlight interno** / **Play interno** / guardar el **APK propio** → registrar en `app_builds` (por la misma API con OIDC) → subir
símbolos → borrar llaves. Primer job de cada plataforma: crea el certificado / la llave de subida y los guarda en el llavero (solo si no existen).
**Servidor:** `/api/tiendas/oidc` (valida el JWT de GitHub, §3.5; entrega solo las llaves del job; anota cada lectura), `lib/tiendas/asc.ts` (JWT de la
API de App Store Connect; App IDs, capacidades, grupos internos, builds, testers, ficha) y `lib/tiendas/play.ts` (Android Publisher: ediciones, pistas,
fichas, APK firmado por Google para la huella de assetlinks), con simuladores del contrato público para las pruebas.
**Super Admin:** Sistema › Apps › Versiones con cada build en vivo (compilando → subido → procesando → disponible) y «Pedir un build» (lanza el
`workflow_dispatch`); Integraciones › Llaves con cada lectura del CI.
**Guardianes:** `llavesFueraDelRepo` ampliado (ningún `.p8`, `.p12`, `.jks`, `.keystore`, `AuthKey_*`, JSON con `private_key` en el repo ni en los logs;
`secrets.*` prohibido en `tiendas.yml`; sin `pull_request_target`), `oidcEstricto` (el endpoint rechaza otro repo, otra rama, otro entorno, `jti` repetido,
token vencido), `versionCoherente`, `tiendaSoloProduccion`; punta a punta `tien8h` (con JWT firmados por una llave de prueba que imita la de GitHub:
cada rechazo; el job feliz contra los simuladores de Apple y Google; un build con la versión sin subir y código nativo cambiado → falla el guardián); y
**el primer TestFlight real** en cuanto existan las cuentas (Paquete 8-2): el iPhone del fundador lo instala y abre su entrada.
**Si las cuentas no están:** todo hasta la firma corre; Android sale firmado con nuestra llave de subida como **APK propio**; iOS queda en simulador.
Se dice en REVISION y en PROGRESS.
**Ayuda:** `admin-tuberia-de-apps` (equipo; cómo se pide un build, qué hace cada estado, qué hacer si una llave vence).

### 8i · Fichas ES/EN, capturas automáticas, privacidad, clasificación, cuentas de revisión, el paquete del fundador y Super Admin, avisos, analítica y ayuda — Sonnet/medium; reglas de pago y privacidad Opus/high
**Datos:** migración 0133.
**Fichas:** `apps/mobile/tiendas/{app}/{es,en}.md` (nombre, subtítulo, descripción corta y larga, palabras clave, «Novedades»), escritas desde `docs/ayuda/`,
sobrias, sin emoji ni superlativos falsos, dentro de los límites de cada tienda (guardián `fichaEnLimites`). **Capturas:** generadas solas en el job macOS
(simulador, la cáscara real, `xcrun simctl io … screenshot`) y en el emulador de Android (`adb exec-out screencap`), con la semilla del sandbox
(negocios «To'Latino Demo», §6 #23), en los tamaños que pida cada tienda ese día (Apple hoy 6.9", a verificar), ES y EN, 5–8 por app, en `store_screenshots`.
Se suben como borrador por la API (Apple: localizaciones de la versión; Google: `edits.listings` e imágenes); **no se envía nada a revisión**.
**Privacidad:** `inventario-datos.json` → etiquetas de Apple (para la pantalla lado a lado), CSV de Data safety de Google, `PrivacyInfo.xcprivacy` y la
sección de datos de **`/privacidad`** (borrador versión 0 con el inventario real; el texto legal final y la revisión de abogado son de la Fase 9, §6 #26);
`/soporte` público (sin sesión: cómo escribir a Soporte). **Clasificación:** Apple por la API; Google en el Paquete 8-3. **Notas para la revisión** por app
(qué hace lo nativo, cómo entrar con la cuenta de revisión, video corto del simulador). **Cuentas de revisión:** se construyen y prueban en el sandbox
(`review_accounts`: un número reservado que acepta un código fijo guardado como secreto, solo ese número, sin tarjeta, con un negocio de revisión oculto;
§6 #24); en producción, Fase 9.
**El paquete del fundador (§10):** **Sistema › Apps › «Lo que te toca»** (una lista con cada paso, su estado y el botón que abre la consola del tercero) y
la **pantalla lado a lado** de las declaraciones (cada pregunta como la escribe Apple o Google, la respuesta y de dónde sale).
**Configuración, avisos, analítica, Mi cuenta y ayuda (cierre):** Configuración › Apps (versiones, push, ubicación, errores, reportes) con límites y
auditoría; plantillas nuevas con push ES/EN; **Analítica › Apps** (instalaciones activas por app y plataforma = sesiones con `TLApp` en 7 y 30 días,
versión, push aceptado / negado, enlaces que abren app vs web, errores por sesión; sin personas); Mi cuenta › Avisos y Privacidad al día; `docs/ayuda/`
de cada bloque.
**Guardianes:** `fichaEnLimites`, `privacidadCoherente` (el inventario cubre cada columna personal nueva de las migraciones —teléfono, correo, `geom`,
fotos, mensajes— y las tres salidas coinciden), `sinCompraDigitalEnApp`, `borrarCuentaEnCadaApp`, `sinProntoEnTienda` (solo aviso hasta la Fase 9),
`revisionAcotada` (la cuenta de revisión no paga con tarjeta, no ve otras cuentas y solo existe con su interruptor); punta a punta `fich8i` (con
`TLApp/negocio/ios`: el panel no ofrece comprar Pro en ninguna pantalla y la web sí; Borrar mi cuenta alcanzable en las 4 apps; `/privacidad` y
`/soporte` sin sesión; capturas generadas en los dos idiomas sin texto cortado; cuenta de revisión: entra con su código, no paga, no ve a nadie más).
**Ayuda:** `admin-fichas-y-revision` (equipo), `privacidad` (vecino; borrador), y las de los bloques anteriores revisadas.

---

## 5. Notas de interfaz (lo específico)
- **La app es la misma interfaz**: nada se rediseña para «parecer app»; lo que cambia es lo de §3.1 (áreas seguras, atrás, sin rebote, splash, teclado).
  El escritorio no cambia.
- **Hoja previa de permisos** (hueco #2): una hoja del sistema con ícono, una frase (§1c) y dos botones («Continuar», «Ahora no»); nunca con el aspecto del
  diálogo del sistema; si ya dijo que no, `note` con «Abrir Ajustes».
- **«Actualiza la app»**: pantalla completa, logo, una frase, un botón; el aviso suave es una `note` que se cierra y vuelve en 7 días.
- **Repartidor**: la banda «Compartiendo tu ubicación» es fija arriba, verde, con la hora de la última posición enviada; en modo avión dice «Sin señal ·
  se envía al volver». El mapa del cliente usa el pin del sistema y las teselas propias; sin ETA inventada (solo la hora de la última posición).
- **Puerta**: sigue oscura y de alto contraste; «Fijar la Puerta» en Perfil › Esta puerta (Android) y la ayuda de Acceso guiado (iOS).
- **Reportar un problema**: el formulario de Soporte con la captura arriba (tocar = ver grande; × = quitar) y la línea de §1c; al enviar, «Recibimos tu
  reporte · TK-…».
- **Super Admin › Sistema** suma pestañas **Apps** e **Integraciones** a «Equipo y permisos · Configuración» (`Pestanas.tsx`); Salud › Errores con
  `kpis` + lista con cursor + ficha.
- **Estados (9) por pantalla:** sin la app (web), app vieja (aviso / bloqueo), app en pausa, permiso no pedido / concedido / negado, sin señal en frío,
  push sin proveedor («modo pruebas»), token inválido, sin llave subida (Integraciones), build fallido, entrega sin ubicación todavía, ubicación vieja
  (> 2 min: «Última posición hace 3 min»), pase anulado, cuenta de revisión.
- Todo texto de interfaz en `CmsString` ES/EN; textos de permiso en `InfoPlist.strings` es/en y en `strings.xml` es/en; fichas en los dos idiomas; sin emoji;
  horas en la zona de la ciudad.

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **¿Cuenta de organización o personal en Apple y Google?** Organización: Apple 5.1.1(ix) espera una entidad para pagos y citas médicas; el vendedor
   sale con el nombre de la empresa, no el del fundador; Google no exige a las organizaciones la prueba cerrada de 12 personas por 14 días que exige a las
   cuentas personales nuevas. Ambas piden **D-U-N-S** (gratis, días o semanas). Default: **organización** (si ya existe la empresa; si no, se dice y se
   espera; mientras, todo se construye y prueba en simuladores, emuladores y APK propio). Pendiente saber: ¿existe To'Latino como empresa (LLC) y su
   D-U-N-S?
2. **Cáscara con la web servida vs export estático.** Default: **web servida + islas locales + plugins nativos** (§3.1). Export estático: no (exige rehacer
   el servidor en el cliente).
3. **Push y «construir lo propio».** Default: **servidor propio; APNs directo, FCM HTTP v1 solo mensajería en Android, Web Push con VAPID**; $0. UnifiedPush
   descartado. No crece §8.
4. **SMS cuando hay push.** Default: **push primero; SMS solo para `crit` y, para lo demás, solo si no hay app con avisos o el push falla** (cumple
   fase7 §6 #14).
5. **Qué texto pasa por Apple y Google.** Default: el de la plantilla, salvo **Salud, Niños, Soporte, sanciones y cuenta → texto genérico**.
6. **Pro dentro de las apps.** Default: **no se vende ni se enlaza su compra en las apps** (3.1.3(f) y Pagos de Google); se ve el estado; se compra en la
   web. Revisar con las reglas de EE. UU. del día del envío.
7. **Pedidos, citas, depósitos y boletos.** Default: tarjeta por Stripe en nuestra hoja (servicios fuera de la app, 3.1.3(e)); Apple Pay / Google Pay
   nativos en su fase.
8. **Identificadores.** Default: **`com.tolatino.app` · `com.tolatino.negocios` · `com.tolatino.repartidor` · `com.tolatino.puerta`**, uno por app; los
   builds del sandbox van a los canales internos con el mismo ID (no se crean 8 registros); la producción usa el mismo ID con build mayor.
9. **Programa beta en Hazleton (HERRAMIENTAS #26).** Default: **en la Fase 8 solo interno contra el sandbox** (el fundador y hasta ~10 personas de
   confianza; datos de prueba; «MODO PRUEBAS» en el código de entrada). **La beta con vecinos y negocios reales va en la Fase 9 sobre producción cerrada**
   (decisiones A e I: los datos reales no viven en el sandbox). TestFlight externo (pide revisión de Apple) no se usa en esta fase.
10. **Testers de Android.** Default: lista de Play interno (la crea el fundador una vez con su correo, Paquete 8-2) **y** el **APK propio** firmado con
    nuestra llave de subida, con enlace de un uso desde Sistema › Apps, para los que no estén en la lista.
11. **Dónde viven las llaves.** Default: **llavero cifrado del sandbox + OIDC de GitHub**; ninguna llave en GitHub. Alternativa: secretos del entorno
    `tiendas` de GitHub escritos por la API (más simple, pero exige un token de GitHub con permiso de secretos). En la Fase 9 el llavero pasa a producción
    con llaves propias de producción (APNs nueva, Firebase de producción).
12. **Firma de iOS.** Default: **administrada por Apple** con la llave de la API (rol Admin); si no alcanza, certificado en el llavero.
13. **Passkeys dentro de la Fase 8.** No están en la fila 8 de PLAN pero dependen del dominio y de los dominios asociados que esta fase crea, y son la
    razón nativa más clara para 4.2. Default: **sí (8d)**, web y apps, el SMS siempre como camino; obligatorio para el equipo en la Fase 9.
14. **Ubicación del repartidor.** Default: **solo con entrega activa; «Mientras se usa» + modo de fondo (nunca «Siempre»); el cliente la ve desde
    «Recogí», el negocio desde que acepta; se guarda 14 días** (disputas de entrega) y luego solo distancia y tiempo. `TLRuta` propio; el plugin MIT de
    la comunidad solo como referencia.
15. **Apple Wallet y Google Wallet** (fase6 §6 #17). Default: **los dos** con el mismo QR firmado; Google necesita la cuenta de emisor del fundador
    (Paquete 8-2, opcional: si no está, solo Apple). Los botones son arte oficial (excepción al «todo del sistema», anotada).
16. **Errores y cierres.** Default: **propio** (`app_error_*`, MetricKit / `ApplicationExitInfo`, simbolizado en el servidor). GlitchTip (HERRAMIENTAS #3)
    queda como alternativa si el volumen lo pide. **Sin grabación de sesión** en «Reportar un problema» (rrweb no existe y pide consentimiento; LAUNCH
    L214): captura + registro técnico.
17. **«Agitar para reportar».** Default: solo en builds de prueba; el menú «Reportar un problema» siempre.
18. **iPad.** Default: **solo iPhone** en las cuatro (en iPad corre en modo compatibilidad; el escritorio sigue en la web). Agregar iPad exige capturas y
    revisión en iPad.
19. **Versiones mínimas.** Default: **iOS 16** (passkeys) y **Android 8 (API 26)**; passkeys en Android donde el sistema las ofrezca, si no, SMS.
20. **Clasificación por edad.** Default: contestar con la verdad (contenido de usuarios, mensajes, referencias a alcohol): **17+ / Mature 17+** esperado.
    Bajarla exigiría ocultar Noche y eventos 21+ en la app (no se hace).
21. **Íconos de las cuatro apps** (sin diseño). Default: el logo de To'Latino sobre el color de cada app con un ícono del sistema (tienda, moto, QR) para
    Negocios, Repartidor y Puerta; To'Latino solo el logo. Captura en REVISION; si el fundador los quiere de Claude Design, se reemplazan.
22. **Puerta y Repartidor públicas o no listadas.** Default: **públicas** (como Dasher o Uber Driver); la distribución no listada de Apple es la
    alternativa si la revisión las ve como «apps para una organización».
23. **Capturas de la ficha con datos de la semilla.** Default: negocios «To'Latino Demo» del sandbox (es la app en uso, no un montaje); en la Fase 9 se
    rehacen con negocios reales que den permiso. Idiomas: Apple `es-MX` + `en-US`; Google `es-US` + `en-US`.
24. **Cuentas de revisión en producción** (choque con la decisión I / regla 13: «datos de ejemplo solo en pruebas»). Apple y Google necesitan entrar sin
    un SMS real y ver un pedido, un panel, una entrega y una puerta. Default: **cuentas operativas ocultas, no datos de ejemplo**: un número reservado que
    acepta un código fijo guardado como secreto (solo ese número; no es el «modo pruebas» de E2, cuyo candado sigue), sin tarjeta, con un negocio y un
    evento de revisión invisibles para todos, creados a mano por el admin en la Fase 9 con el OK del fundador, anotados y apagables.
25. **Pasos de consola que obligan a escribir un dato** (choque con U: «nada de copia esto aquí»). Al menos: invitar en Play Console el correo de la cuenta
    de servicio. Default: se minimizan (un solo correo, con «Copiar» en Sistema › Apps › Lo que te toca) y se dice el choque; si la consola ofrece
    «Otorgar acceso» sin escribir, se usa eso.
26. **`/privacidad`, `/terminos` y la página en `tolatino.com`.** Las tiendas exigen URL de privacidad y Apple verifica que la organización tenga sitio en
    su dominio. Default: **`/privacidad` y `/soporte` públicos en el sandbox** desde el inventario real (versión 0, marcada borrador) y una **página estática
    de «acceso anticipado» en `tolatino.com`** (PLAN fila 9: «puede ir antes»), sin la app de producción; el texto legal final y el abogado, Fase 9.
27. **Kiosco de la Puerta** (LAUNCH L862). Default: «Fijar pantalla» en Android y la ayuda de Acceso guiado en iOS; sin MDM.
28. **Escanear cupones en el panel** (LAUNCH L657). Default: **sí (8e)**, con el lector de la Puerta, también en la web.
29. **El repo es público.** Hoy es lo que hace gratis la Mac en la nube. Si el fundador lo quiere privado, macOS se paga por minuto (§8 ya lo prevé) y
    nada más cambia (las llaves nunca estuvieron en el repo).

## 7. Orden, dependencias y pruebas
**Paquete 8-0 (Cloudflare y dominio) → 8a → 8b → 8c → 8d → 8e → 8f → 8g → 8h → 8i.** El Paquete 8-1 (cuentas de Apple y Google; tardan días) se pide **al
empezar 8a** para que llegue a tiempo para 8h. **Cada bloque sale al sandbox solo:** 8a deja las cuatro cáscaras compilando en CI (sin firma) y abriendo
su entrada, las islas sin señal y el llavero; 8b los enlaces (necesita el dominio); 8c el push (Web Push de verdad desde el primer día; APNs y FCM contra
simuladores hasta que haya llaves); 8d las passkeys (necesita 8b); 8e lo nativo de cada app; 8f el programa beta y los errores; 8g Wallet (Apple necesita
la cuenta para el certificado del pase; antes, contra el contrato); 8h la tubería firmada (necesita los Paquetes 8-1 y 8-2; sin ellos llega hasta la firma
y el APK propio); 8i cierra la fase. 8c, 8d y 8f pueden ir en paralelo después de 8b. Cada bloque: migración (aplicada dos veces) + semilla `is_test` +
punta a punta en **teléfono 390 y escritorio 1360** con el rótulo `TLApp` (e2e `app8a`, `enl8b`, `push8c`, `llave8d`, `app8e`, `beta8f`, `wal8g`, `tien8h`,
`fich8i`) + **smoke nativo** en emulador Android (Linux, `nat8a`, `nat8e`) y simulador iOS (macOS, XCUITest) + guardianes al revés (`alreves8a`…
`alreves8i`). **Dispositivo real (W):** el iPhone del fundador (primero la web instalada con Web Push, 8c; luego TestFlight, 8h) — se anota en REVISION qué
mirar; Android físico, más adelante (W). **Reloj movido:** token sin uso 90 días → vencido; push que vence a las 24 h → SMS de respaldo; reto de passkey
a los 2 min; purga de posiciones a los 14 días y de errores a los 90; certificado del pase y de distribución a 30 días de vencer → aviso; enlace de un uso
del APK propio. **Abuso (cada uno al revés):** registrar un token para otra cuenta; push con `href` a `/admin` o a otro origen; AASA servido con
redirección o `text/html`; enlace de un uso abierto por una vista previa; la cáscara navegando a un origen ajeno con el puente; iframe ajeno llamando al
puente; posición para una entrega ajena o terminada; SSE de la ruta pedido por otro vecino; error con tarjeta o teléfono en el mensaje; 10 000 errores por
minuto de un dispositivo; JWT de OIDC de otro repo, otra rama, un fork o repetido; llave subida por un rol que no es admin; pase pedido con el token de
otro pase; cuenta de revisión intentando pagar o ver a otros; `TLApp` falso para saltarse algo (no cambia nada). **Sin la app nada se rompe:** toda la
regresión web (Ayuda, Mensajes, Pedidos, Citas, Eventos, Puerta, Repartidor, Soporte, El Compa) pasa igual sin el rótulo `TLApp`, con push apagado y con
el proveedor caído. **Velocidad (presupuesto, guardián Velocidad):** de tocar el ícono al primer pintado ≤ 1.5 s en un Pixel 6a emulado y un iPhone 13 del
simulador con el servidor caliente; isla sin señal ≤ 400 ms; encolar un push dentro de `avisar` ≤ 5 ms; del aviso a la entrega al simulador de APNs p95 ≤
2 s; 10 000 push por minuto por trabajador; AASA y assetlinks ≤ 50 ms; guardar una posición ≤ 30 ms y 200 posiciones por segundo sostenidas (2 000
repartidores cada 10 s) en la base de carga (`scripts/carga/apps-1m.mjs`, máquina aparte); SSE de la ruta ≤ 1 s de la posición al cliente. **Revisión de
seguridad** (regla 5) de 8a, 8b, 8c, 8d, 8e, 8g y 8h. Capturas teléfono + escritorio de cada pantalla compuesta (§1b) y su línea en `docs/REVISION.md`.

## 8. Lista de cierre de la fase (todo marcado antes de decir «Fase 8 completa»)
_Cada marca dice con qué se comprobó; lo que no se pudo comprobar queda sin marcar con el motivo._
- [ ] Migraciones 0125–0133 aplicadas dos veces en PostGIS real (idempotentes) y en CI; semillas 0044–0047 solo en pruebas (`semilla`).
- [ ] `pruebas.tolatino.com` con HTTPS detrás de Cloudflare; `/.well-known/*` sin desafío.
- [ ] Las cuatro cáscaras compilan en CI (Android firmado con nuestra llave; iOS en simulador y, con la cuenta, firmado), abren su entrada, respetan su
      alcance, abren en frío sin señal (islas con `TLLocal`), muestran «Actualiza» bajo el mínimo y no exponen el puente a otro origen.
- [ ] Enlaces universales y App Links: cada familia de ruta abre su app; sin app, la web; un enlace de un uso no se gasta con un GET; volver de Stripe.
- [ ] Push: Web Push real en el iPhone del fundador (web instalada); APNs y FCM contra simuladores y, con llaves, de verdad; push primero y SMS de respaldo;
      texto genérico donde toca; preferencias, silencio y STOP; cifras en Notificaciones.
- [ ] Passkeys en la web y en las apps; SMS siempre como camino; quitar y revocar con aviso.
- [ ] Repartidor con ubicación solo durante la entrega (también con la pantalla apagada), mapa en vivo del cliente y del negocio, purga a los 14 días;
      Puerta en frío y con pantalla encendida, fijar en Android; brillo del QR; escanear cupones en el panel.
- [ ] «Reportar un problema» → caso TK- con captura y registro tapado; errores y cierres agrupados y simbolizados; Sistema › Apps (versiones, testers,
      errores, reportes) e Integraciones (llaves, push) con motivo y auditoría.
- [ ] Apple Wallet (y Google Wallet si hay cuenta de emisor) con el mismo QR; el pase sigue al boleto.
- [ ] Tubería: llaves solo por OIDC, ninguna en el repo ni en los logs; **primer build en TestFlight interno instalado en el iPhone del fundador** y en
      Play interno / APK propio en un Android emulado (o sin marcar con el motivo si faltan las cuentas).
- [ ] Fichas ES/EN y capturas subidas como borrador; inventario de datos → etiquetas, Data safety y `/privacidad` (borrador) coherentes; clasificación
      contestada; notas para la revisión; cuentas de revisión probadas en el sandbox; **nada enviado a revisión pública** (`store_submissions`).
- [ ] Guardianes de §4 en `guardianes/run.mjs`, cada uno probado al revés; build + CI + punta a punta en 9 dispositivos verdes; regresión web sin
      cambios con y sin `TLApp`; presupuesto de velocidad con la base de carga (cifras en PROGRESS).
- [ ] `docs/ayuda/` de cada bloque (ES/EN); preguntas #1–#29 en `docs/REVISION.md`; `LAUNCH-CHECKLIST` con lo de la Fase 9 (§3.7, §10 Paquete 9).
- [ ] `docs/PROGRESS.md` al día (Fase 8 cerrada) y `docs/REVISION.md` con los pasos para mirarla (iPhone del fundador con la web instalada y con
      TestFlight; Android emulado; Super Admin › Sistema › Apps).

## 9. Decisiones del fundador pendientes (resumen para `docs/REVISION.md`; se construye con el default, regla AB)
| # | Qué decidir | Default que se construye (reversible) |
|---|---|---|
| 1 | Cuenta de organización o personal | Organización con D-U-N-S (si existe la empresa) |
| 2 | Cómo es la cáscara | La web servida + islas locales + plugins nativos |
| 3 | Push | Servidor propio; APNs directo, FCM solo mensajería, Web Push; $0 |
| 4 | SMS con push | Push primero; SMS solo `crit` o sin app |
| 6 | Pro en las apps | No se vende ni se enlaza en las apps; se gestiona en la web |
| 8 | Identificadores | `com.tolatino.app` · `.negocios` · `.repartidor` · `.puerta` |
| 9 | Beta con vecinos reales | Fase 9 sobre producción cerrada; en la 8 solo interna contra el sandbox |
| 11 | Dónde viven las llaves | Llavero cifrado del sandbox + OIDC; nada en GitHub |
| 13 | Passkeys en esta fase | Sí, web y apps; obligatorias para el equipo en la Fase 9 |
| 14 | Ubicación del repartidor | Solo con entrega activa, «Mientras se usa», el cliente desde «Recogí», 14 días |
| 15 | Wallet | Apple y Google con el mismo QR |
| 18 | iPad | Solo iPhone |
| 20 | Clasificación por edad | 17+ / Mature 17+ (la verdad) |
| 21 | Íconos de las apps | Logo + ícono del sistema por app (captura en REVISION) |
| 24 | Cuentas de revisión en producción | Cuentas operativas ocultas con código fijo de un número reservado, Fase 9 |
| 25 | Pasos de consola que piden escribir | Uno solo (correo de la cuenta de servicio), dicho como choque con U |
| 26 | Privacidad y página en `tolatino.com` | `/privacidad` borrador desde el inventario; página estática de acceso anticipado |
| 29 | Repo público | Sigue público (Mac gratis); privado = minutos de macOS pagados |

## 10. Paquete de pasos del fundador (en el teléfono; cada uno llega cuando toca, con su enlace y su estado en Sistema › Apps › «Lo que te toca»)
_Nada aquí se le pide en el chat; ningún secreto se escribe en el chat. Los archivos que Apple y Google entregan solo al dueño de la cuenta se suben una
vez en el llavero del Super Admin (un toque en «Subir archivo» desde la app Archivos). Costos: $99 al año (Apple) y $25 una vez (Google), ya en §8; todo
lo demás es gratis._

**Paquete 8-0 · Dominio (antes de 8a; PLAN §9).** (1) Crear la cuenta de Cloudflare (plan gratis) y aceptar términos. (2) En el registrador de
`tolatino.com`, cambiar los servidores de nombres a los dos que da Cloudflare (es el único paso en otra página; la lista de toques llega con capturas).
(3) Crear un token de API de Cloudflare con permisos de DNS y SSL de esa zona y guardarlo en el **formulario seguro** de los secretos del entorno (nunca en
el chat). Claude hace lo demás (DNS de `pruebas`, HTTPS, reglas).

**Paquete 8-1 · Cuentas (al empezar 8a; tardan días).** (1) **D-U-N-S** de la empresa (si no lo tiene): la herramienta gratuita de Apple para pedirlo
(Dun & Bradstreet tarda de días a dos semanas). (2) **Apple Developer Program como organización** desde la app **Apple Developer** del iPhone: Apple ID con
dos factores, datos de la empresa y D-U-N-S, sitio web en el dominio (la página de acceso anticipado, §6 #26), pago de $99 con Apple Pay; Apple puede
llamar para verificar. (3) **Google Play Console como organización**: cuenta de Google, pago de $25, D-U-N-S, verificación de identidad con documento
(foto desde el teléfono), teléfono y correo de contacto verificados, y la verificación de desarrollador de Android que Google pida ese día (a
verificar). (4) **Firebase**: crear el proyecto «tolatino» y aceptar los términos (para el push de Android). _No hace falta_ contrato de apps pagadas,
datos fiscales ni banco en ninguna tienda: las apps son gratis y sin compras dentro (§6 #6); solo si un día se vende algo dentro.

**Paquete 8-2 · Llaves y registros (cuando Apple y Google aprueben; unos 15 minutos).** (1) App Store Connect › Usuarios y acceso › Integraciones ›
**generar una llave de la API** con rol Admin → descargarla → subirla en Super Admin › Sistema › Integraciones › Llaves. (2) developer.apple.com › Keys ›
**llave de APNs** → descargarla → subirla. (3) App Store Connect › **Nueva app** cuatro veces (nombre, idioma principal Español (México), ID que ya
aparece en la lista porque Claude lo creó por la API; a verificar si la API ya lo permite y entonces lo hace Claude). (4) Firebase › Configuración ›
Cuentas de servicio › **generar llave privada** → subirla. (5) Play Console › **Crear app** cuatro veces (nombre, idioma, gratis, aceptar las
declaraciones de políticas). (6) Play Console › Usuarios y permisos › **invitar el correo de la cuenta de servicio** con permiso de publicar en las cuatro
apps (el único dato que se escribe: choque con U, §6 #25). (7) Play Console › Prueba interna › **lista de testers con su correo** (y los de las personas
de confianza). (8) Opcional (8g): **Pass Type ID** de Apple Wallet si la API no lo crea (subir el CSR que genera el servidor y bajar el certificado: dos
archivos) y la **cuenta de emisor de Google Wallet** (Google Pay & Wallet Console). TestFlight interno: el fundador ya es tester por ser el dueño; Claude
arma el grupo por la API.

**Paquete 8-3 · Declaraciones de las tiendas (antes de cualquier revisión; con la pantalla lado a lado de Sistema › Apps).** Apple: **Privacidad de la
app** de las cuatro (las respuestas salen del inventario). Google, por app: **Seguridad de los datos** (importar el CSV que generamos o tocar las mismas
respuestas), **clasificación de contenido** (cuestionario IARC), **público objetivo** (18+), anuncios (no tiene), app de noticias o de gobierno (no),
funciones financieras y de salud (las respuestas que salen del inventario), **servicio en primer plano de ubicación** del Repartidor (texto y video que
generamos), URL de privacidad y de borrar la cuenta. Son declaraciones legales del dueño de la cuenta: no se pueden hacer por API (a verificar).

**Paquete 9 · Salir al público (Fase 9, con el OK).** Contacto para la revisión, cuentas de revisión de producción, URL de privacidad final, llave de APNs
y proyecto de Firebase **de producción** (aislados del sandbox, decisión M), **enviar a revisión** las cuatro y elegir el lanzamiento (por fases).
