# Fase 9 · Cierre y apertura — plan de construcción (11 nov 2026)

Bloques **9a → 9v** en tres grupos. Migraciones desde **0133** (la última confirmada es `0132_tiendas_fichas.sql`, 8i) hasta **0145**, una por bloque
del grupo A; los grupos B y C toman **la siguiente libre** el día que corren (como en la Fase 8: nada asume números contiguos, `migrar.sh` aplica en
orden de nombre). Semillas de pruebas desde **0049** (la última confirmada es `0048_revision.sql`); **ninguna semilla corre contra producción** (regla
13, decisión I, guardián `semilla`). Construido: 9a (12 nov); lo demás, todavía no. Alcance = fila 9 de `docs/PLAN.md` (L215): «Super Admin completo
(Analítica, CMS, Crecimiento, Ciudades, Sistema) · legales por estado · exportar mis datos · landing de acceso anticipado y QR de calle (puede ir antes)
· **producción encendida** (servidores EE. UU., Cloudflare, dominio) · respaldos y manual de incidentes probados · `LAUNCH-CHECKLIST.md` en cero ·
**apertura en las 5 ciudades** · guardianes: todos».

**Mandan en todo el archivo:** decisión **A** (`docs/DECISIONES.md` L33: se abre cuando esté todo, una sola vez, en las cinco ciudades; el reclutamiento
de negocios puede correr antes), **M** (L13: dos proyectos aislados; nada se prueba en el real), **C / C2** (L22, L26: producción en EE. UU., proveedor
por precio real el día que se encienda), **D** (L23: Cloudflare gratis delante, sin Vercel), **I** (L30: producción nace vacía), **U** (L21: el fundador
solo da el OK desde el teléfono; lo que un tercero exige en persona va en un paquete, §10), **AA / AB** (L39–40: en el sandbox los bloques se encadenan
sin OK por bloque y lo que pide una decisión se construye con el default más seguro y reversible y se anota en `docs/REVISION.md`; **producción pide su
OK y nada se enciende en producción antes de esta fase**). Regla 2 de `CLAUDE.md`: **producción solo recibe el mismo paquete aprobado y nunca se toca a
mano**.

**Los tres grupos:**
- **Grupo A · se construye ya en el sandbox, sin nada del fundador (9a–9o):** se encadenan por AB, cada uno con migración, semilla `is_test`, punta a
  punta en teléfono 390 y escritorio 1360, guardianes probados al revés, ayuda y commit a `pruebas`. Empieza **9a**.
- **Grupo B · espera un paquete del fundador (9p–9s):** todo lo que se pueda queda construido y probado contra simuladores en el grupo A; el bloque solo
  conecta, enciende y prueba de verdad cuando llega el paquete (8-0, 8-1/8-2/8-3, 9-1, 9-2).
- **Grupo C · producción, con el OK explícito del fundador (9t–9v):** producción en **acceso anticipado** (OK-1), beta cerrada y revisión pública de las
  apps (OK-2), **apertura** en las cinco ciudades (OK-3).

**Lo que el diseño trae de esta fase:** `admin-dashboard.md` ADM-CIUD (L235), **ADM-MKT** (L248), ADM-ANALIT (L298), **ADM-CMS** (L314), **ADM-SYS**
(L323); el prototipo del Super Admin (`To'Latino Super Admin.dc.html`: `secSys` L977 con pestañas Equipo · Roles · Historial · Integraciones · **Flags ·
Salud** · Configuración · **Respaldos · Estados**; `secCiud` L1132 con el asistente de **6 pasos** L1153 y la regla «300 en lista de espera o 30 negocios
listos»; `secMkt` L1197 con Semilla · Promotores · Campañas · Destacados · **Enlaces y QR**; `secAnalit` L1525 con **Dinero**; `secCms` L1616 con Cadenas ·
Rótulos por categoría · **Páginas** · Home por ciudad); **`To'Latino Página.dc.html`** + `datos/web-pages.js` (14 páginas de la web: Centro de ayuda,
Preguntas, Planes, Cómo cobrar, Renta de silla, **Reglas del barrio**, Votos, **Cómo verificamos**, Seguridad, La app, **Términos, Privacidad,
Cookies**…); `pantallas-iniciales.md` §3.1 **`APP-LANDING-PRE`** y §2 (salida a la calle con QR, Fundadores = solo insignia); `memoria-del-diseno.md` §7
**Coming Soon v1–v3** (L2187–2221; v3 es la última decisión: sin ciudad ni fecha, código postal + teléfono, «Tengo un negocio»; **el archivo
`.dc.html` no está en el repo**, hueco §1b #1); `modelo-datos.md` **TermsAcceptance** (L813), **LegalPage** (L1739), CityHomeConfig, **Campaign**,
Featured, **ShortLink** (L1776), Referral (L803), FeatureFlag por ciudad y porcentaje. Esto es un resumen de trabajo; manda el prototipo en el
comportamiento de cada pantalla.

## 0. Fuentes
**Plan y decisiones:** `docs/PLAN.md` §3.2 L120 (producción: «app y base en máquinas separadas + réplica de lectura para análisis (T#33)»; GitOps;
emergencia = reconstruir desde cloud-init), §3.4 L150 (tubería con vuelta atrás sola), §5 L173 (guardianes: Visual, Triángulo, Seguridad,
Accesibilidad, Velocidad, Errores en vivo, Dinero, Costos, **Datos** «respaldo diario verificado; borrado a 30 días», Documentación, **Salud**, **Reporte
diario**), **§6 L215** (fila 9), §8 L241 (lo que se paga), **§9 L247** (lo que el fundador hace en persona: Cloudflare, proveedor de producción, Stripe y
Connect, Telnyx/Twilio con 10DLC, Meta WhatsApp, SES, Apple, Google). `docs/DECISIONES.md` A, C, C2, D, E, E2, G, I, M, O, Q, R, T, U, V, W, X, AA, AB.
`docs/HERRAMIENTAS.md` #1–#6, **#14** (estado y respaldos), **#16** (CI/CD con vuelta atrás), #17–#18 (punta a punta y visuales), #20 (dinero), #21
(costos), **#22** (respaldos probados + recuperación a un punto + manual de incidentes), #24 (SEO), **#29** (legal por estado, exportar mis datos, borrado
a 30 días), **#30** (segundo factor del equipo + rotación de llaves), **#31** (reporte diario al fundador), #32 (vista previa por rama), **#33** (base de
análisis separada).
**Producto:** `admin-dashboard.md` §2 y §5 (roles), `admin-implementacion.md` §4 (17 secciones) y §7, `pantallas-iniciales.md` (arranque en frío,
programa de lanzamiento, `APP-LANDING-PRE`), `flujos-transversales.md` L270 (borrar cuenta), `revision-estructural.md` L79–114 (Comunidad en una ciudad
nueva), `modelo-datos.md` §5 y §13, `solo-prototipo.md` (lo que no pasa a la app: ninguna pieza de esta fase está en su lista; «Importar tu negocio»
L321 pide leer datos públicos de Google Places, que la decisión I y D2 dejan fuera: §3.9).
**Fase 8 (lo que pasa a esta fase):** `fase8-apps.md` §3.7 y §10 «Paquete 9»; **8b** sin construir (espera el dominio, Paquete 8-0); LAUNCH «Fase 8 →
Fase 9» (L1144–1150). PROGRESS «Fase 8 · 8i» (Fase 8 cerrada salvo 8b; `planes2n` falla por un texto que salió del código el 6 nov).
**Código (verificado el 11 nov):** Super Admin con 20 rutas vivas en `lib/admin-nav.ts` `HECHAS`; **`mkt` (Crecimiento) marcada «Fase 9»** y sin
pantalla; **Ciudades solo lectura** (`app/admin/ciudades/page.tsx`: «Abrir o cerrar una ciudad … entra en la Fase 9»); **Sistema** con cuatro pestañas
(`sistema/Pestanas.tsx`: Equipo y permisos · Configuración · Apps · Integraciones; sin Flags, Salud, Respaldos ni Estados); **Textos y páginas** solo
con la Ayuda (`app/admin/textos/page.tsx`: «el editor de textos llega con el CMS»); **Analítica** con 15 pestañas (Resumen … Apps, Búsquedas sin oferta,
Exportar) y **sin Dinero**. Público: `/privacidad` (borrador versión 0 desde el inventario, 8i) y `/soporte`; **no existe `/terminos`** ni ninguna otra
página legal; Mi cuenta › Privacidad dice que «Descargar mis datos» llega después (`Privacidad.tsx` L4). **Borrado definitivo a los 30 días:** la cuenta
queda programada (`lib/perfil.ts` L150) y solo `lib/compa/purga.ts` vacía El Compa y Soporte (7i); **el resto no se borra** (LAUNCH L315). `/api/salud`
existe (app, base, migraciones, commit). Errores: `app_error_groups` (8f) recibe JS de la web y de las apps; **los errores del servidor no se recogen** (no
hay `instrumentation.ts`). `feature_flags`, `config_keys` y `lib/config.ts` existen (Configuración con límites y auditoría). **Infra:** solo
`infra/pruebas/` (deploy.sh 121 líneas: secretos que nacen en el servidor —`AUTH_SECRET`, `DATOS_SECRET`, `QR_LLAVE_PRIVADA`, `VAPID_PRIVADA`,
`REVISION_CODIGO_*`—, Garage, migraciones, semilla, índice de la ayuda, mapa, moderación, traductor, direcciones, nginx, comprobación de salud);
docker-compose con `web`, `barrido`, `push`, `db` (PostGIS 16-3.5), `mapa`, `medios` (Garage), `moderacion-img`, `traductor`; `tolatino-sync` cada 60 s
contra `pruebas`. **No hay `infra/produccion/`, ni cloud-init en el repo** (el del sandbox se pasó por la API el 5 nov), **ni respaldo de la base fuera de
los respaldos automáticos de Hetzner** (20 %), ni restauración probada, ni vuelta atrás, ni monitoreo externo. **Las llaves de terceros (Stripe, Telnyx,
SES) no tienen camino al servidor**: el compose ni las nombra (solo `TELNYX_PUBLIC_KEY`, `ANTHROPIC_API_KEY` y los de WhatsApp) y LAUNCH L994 lo dice.
**CI** (`ci.yml`): tipos, build, guardianes, contratos (Stripe, canales, push, tiendas, OIDC, Wallet), firma SES, imagen, migraciones y semilla dos
veces; **no corre las pruebas de punta a punta, ni visuales, ni axe, ni Semgrep, ni velocidad** (LAUNCH L566). **Las pruebas de punta a punta no están en
el repo:** unas 220 (`*.cjs`, más 37 «al revés» y los `servir*.sh`) viven en el directorio temporal de la sesión de trabajo; una sesión nueva o un
contenedor nuevo las pierde (§3.8, 9a). Guardianes: `node guardianes/run.mjs` limpio (1 838 archivos, 11 nov) con un aviso: `sinProntoEnTienda` cuenta 7
pantallas, que **son `PantallaPronto`** (la ciudad «próximamente», una función) y no `Pronto` (la pantalla «En construcción», que ya no se usa en
ninguna ruta). Plantilla de este archivo: `fase8-apps.md`.

---

## 1. Lo que ya existe y lo que falta

### 1a. Lo que ya existe y se reusa (código)

| Pieza | Dónde | Para qué aquí |
|---|---|---|
| `infra/pruebas/deploy.sh` + `docker-compose.yml` + `tolatino-sync` + `nginx-pruebas.conf` | 0, 4j, 5d, 5h, 6c, 8c, 8i | **El mismo paquete** para producción (9o): se parametriza por entorno; lo propio de pruebas (semilla, `TOLATINO_SMS_MODO`, simuladores, códigos de revisión del sandbox) queda fuera por guardián |
| `packages/db/migrar.sh` (migraciones en orden, una vez; `--semilla-pruebas` aparte) | 0 | Producción corre **solo migraciones**; la semilla no existe allá (guardián `semilla` ampliado a `infra/produccion`) |
| `/api/salud`, página `/estado/` de `tolatino-sync` | 0 | Puerta de salud del despliegue y de la vuelta atrás (9o); fuente de Sistema › Salud (9j) |
| `lib/barrido.ts` `barridoCentral` (0078) + servicio `barrido` | 4y | Purga a 30 días, retenciones, exportaciones, conciliación diaria, restauración de prueba, reporte diario (9d, 9g, 9j, 9k) |
| `lib/compa/purga.ts` (`compa_purgar`, `barrerRetencion`) | 7i | Patrón de la purga completa de D5 (9d): por tabla, en lotes, anotada y comprobable |
| `app_error_groups` / `app_error_events` + `/api/errores` + guardián **Errores en vivo** (`erroresEnVivo`) | 8f | Suma los errores del servidor (`instrumentation.ts`, 9j) y es la señal de la vuelta atrás (9o) y de la pausa del lanzamiento por fases (9u) |
| `feature_flags`, `config_keys`, `lib/config.ts` (`valor`, `cambiarConfig` con límites, motivo y auditoría) | 0, 5i | Sistema › Flags por ciudad y porcentaje (9j); lo que hoy está «en solo lectura» pasa a editable (9n) |
| `store_secrets` (llavero cifrado con `DATOS_SECRET`) + `/api/tiendas/oidc` (8h) | 8a, 8h | Llaves de las tiendas de producción (9u); el **sobre sellado** de los secretos de terceros (§3.3) usa el mismo principio |
| `review_accounts` + `REVISION_CODIGO_*` + interruptor `app.revision.cuentas` | 8i | Cuentas de revisión de producción (9u, decisión fase8 §6 #24) |
| `store_submissions` (rechaza `revision_publica` y `lanzamiento` sin `app.tiendas.publico`) | 8h | El único camino al envío público, con `founder_ok_ref` (9u) |
| `data_inventory` + `apps/mobile/inventario-datos.json` + `/privacidad` (borrador v0) + guardián `privacidadCoherente` | 8i | Base de Privacidad por estado (9e) y del **mapa de lo que se exporta y se borra** (9d): una sola fuente |
| `city_waitlist`, `cities.status on/soon/off`, `PantallaPronto` / `CiudadPronto`, `lib/ciudad.ts` | 0, 1f | Lista de espera de la landing (9h), asistente de apertura y estado `beta` (9i) |
| `invites` / `/i/[code]` (invitar vecinos, 5f), `contact_taps`, `app_events` (lista cerrada, `analiticaSinPersonas`) | 1n, 5f | Enlaces y QR con conteo sin personas (9h); referidos (9h); embudos (9g) |
| `lib/compa/ayuda-indice.ts` + `scripts/ayuda/indexar.mjs` (el repo es la fuente, sha256, pausar con motivo) | 7a | El mismo mecanismo para **las páginas legales** (`docs/legal/`) y las cadenas del CMS (9e, 9f) |
| Analítica (`app/admin/Analitica.tsx`, 15 pestañas, Exportar con auditoría) | 1n–8i | Se completa con Dinero, retención y reportes programados (9g) |
| Passkeys (`lib/llaves/`, 8d) + Sistema › Equipo (quién tiene llave) | 8d | Segundo factor obligatorio del equipo (9j) |
| `scripts/contrato-*` (Stripe, canales, push, tiendas, OIDC, Wallet) y simuladores | 2d–8i | Los proveedores reales del grupo B se prueban contra lo mismo antes de encender (9q, 9r) |
| Guardianes (`guardianes/run.mjs`, 6 402 líneas; `semilla`, `modoPruebas`, `libroSoloInsercion`, `configConLimites`, `analiticaSinPersonas`, `retencionQueCorre`, `tiendaSoloProduccion`, `revisionAcotada`, `sinProntoEnTienda`, `idioma`…) | 0–8 | Se reusan, se amplían y se suman los de §4; **todos** corren en producción como paso del despliegue |

### 1b. Huecos del diseño (componer con el sistema y anotar en `docs/REVISION.md`, regla AB)
1. **Landing de acceso anticipado** (`APP-LANDING-PRE`): la memoria describe Coming Soon v3 con detalle (L2211–2221) pero el `.dc.html` no está en el
   repo. Se compone con el sistema (hero, `SearchBar`, `BusinessCard` Free, `chips`, `EventCard`, `FeedPost`) siguiendo la v3 y se anota; si el fundador
   exporta el archivo, se porta y se reemplaza.
2. **Super Admin › Crecimiento** (`secMkt` existe en el prototipo; sin `PROTO-ENCARGO`): se porta del prototipo con los bloques del admin.
3. **Super Admin › Sistema › Flags, Salud, Respaldos, Estados** (prototipo `secSys`): se portan; Respaldos suma «Restauración de prueba» (no está en el
   prototipo) como una fila más.
4. **Exportar mis datos** (Mi cuenta › Ajustes › Privacidad y Panel › Más): no hay pantalla; se compone con `rows`, `note` y `acts` («Pedir mi archivo»,
   estado, «Bajar» con vencimiento).
5. **Aceptar términos nuevos** (TermsAcceptance con `force_accept`): hoja con el resumen de cambios, «Leer completo» y «Acepto»; nunca tapa una operación
   en curso (el pedido abierto sigue).
6. **Asistente de apertura de ciudad** (prototipo `STEPS` L1153): se porta; suma el paso «Comprobar» (LAUNCH en cero para esa ciudad, guardianes en
   verde) antes de «Avisar a la lista de espera».
7. **Segundo factor del equipo** (TOTP: alta con QR, código de 6 dígitos, códigos de recuperación): no hay diseño; `OtpInput` del sistema.
8. **Página de mantenimiento / incidente** (lo que ve un vecino si la plataforma está en mantenimiento programado): una pantalla mínima con logo y
   una frase, servida por nginx sin la app.
9. **Volante y cartel con QR** (PDF imprimible desde Crecimiento › Enlaces y QR): carta y media carta, con el logo, una frase y el QR; no son pantallas.
10. **Prueba de entrega** del Repartidor (foto y código del cliente) y **Ajustes › Avisos** del panel (DASH-AJUSTES): el diseño no los trae (LAUNCH L369,
    L934); se componen con el sistema.

### 1c. Tesis y líneas fijas (verbatim; nunca se suavizan)
- **Tesis:** la apertura es **un solo día con todo** (A). Antes de ese día, producción ya existe y está probada: corre el mismo paquete que el sandbox,
  restaura sus respaldos, vuelve atrás sola y tiene a negocios reales armando su página (acceso anticipado). El día de la apertura solo se encienden
  interruptores; no se despliega nada nuevo ese día.
- **Producción nunca se toca a mano.** Ni SSH, ni consola de base de datos, ni un «arreglo rápido»: todo entra por la rama `produccion` y el mismo
  paquete que pasó por `pruebas`. Lo único que no viaja del sandbox a producción son los datos y las llaves (M, I).
- **Nada de lo legal se publica como final sin el abogado.** Los textos los redacta Claude como **BORRADOR** y así se ven en el sandbox; en producción
  una página legal sin `reviewed_by_counsel` no se puede publicar (guardián `legalRevisado`).
- **La landing:** «Alguien cerca de ti hace justo lo que buscas. Encontrarlo es lo difícil.» / «Someone near you does exactly what you need. Finding them
  is the hard part.» (memoria L2213). Debajo del teléfono: «Te avisamos por mensaje de texto cuando abra tu zona. Nada más.» / «We will text you when your
  area opens. Nothing else.»
- **Exportar mis datos:** «Te armamos un archivo con lo tuyo: perfil, pedidos, citas, reseñas, publicaciones y mensajes. Tarda unos minutos y lo bajas
  aquí durante 24 horas.» / «We put together a file with your data: profile, orders, appointments, reviews, posts and messages. It takes a few minutes and
  you can download it here for 24 hours.»
- **Borrar mi cuenta** (lo que ya promete la pantalla, D5): «Si borras tu cuenta tienes 30 días para arrepentirte; después se borra todo. Los cobros quedan
  en Stripe como pide la ley.» (`web-pages.js`, Centro de ayuda). A los 30 días tiene que pasar exactamente eso.
- **Página de mantenimiento:** «Estamos haciendo un cambio. Volvemos en unos minutos.» / «We are making a change. Back in a few minutes.»
- **El equipo entra con dos pasos:** «Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.» / «Your team account
  needs your passkey or your code app. SMS alone is not enough.»

---

## 2. Cambios de datos (migraciones 0133 → 0145 en el grupo A; nada se borra salvo la purga de D5 y las retenciones; `city_id` donde hay persona o lugar; solo el servidor lee y escribe)

**0133 `escala` (9b)** — **`rate_counters`** (contador compartido entre procesos: `scope`, `key_hash`, `window_start`, `n`; `unlogged`, índice por
`(scope, key_hash, window_start)`, purga por el barrido) para los topes que hoy viven en la memoria de cada proceso (traducción sin cuenta L683,
corta-circuito L685, errores L1235, Wallet L1302, Configuración L699); **`app_events` particionada por mes** (la migración crea la tabla nueva, copia por
lotes y cambia el nombre en una transacción corta; BRIN por fecha en cada partición) + **`app_events_dia`** (resumen por ciudad, nombre, app y día; lo
llena el barrido; L207); `search_vocab_refreshed_at` en Configuración (refresco por hora, L97).

**0134 `mis_datos` (9d)**
- **`data_exports`** (`id`, `user_id`, `business_id` null (exportación del negocio), `requested_at`, `status check in ('pendiente','armando','listo',
  'vencido','fallo')`, `media_key` (almacén privado), `sha256`, `bytes`, `ready_at`, `expires_at` (24 h), `downloaded_at`, `ip_hash`); una a la vez por
  persona y negocio; tope `export_cada_dias` 7.
- **`purge_runs`** y **`purge_items`** (**solo inserción**: cuenta, tabla, filas borradas o seudonimizadas, `at`; nunca el contenido) — la prueba de
  que D5 corrió; guardián `purgaCompleta`.
- **`data_map`** (generado desde `apps/mobile/inventario-datos.json` + un archivo nuevo `packages/db/mapa-de-datos.json`: por tabla y columna con persona,
  **qué se exporta**, **qué se borra a los 30 días**, **qué se seudonimiza y por qué se guarda** (ley, Stripe, auditoría, impuestos) y su retención).
  Toda tabla con `user_id` o columna personal nueva sin fila aquí rompe el build (guardián `mapaDeDatos`, sucesor de `privacidadCoherente`).
- **`account_merges`** (**solo inserción**: `from_user_id`, `to_user_id`, `requested_by`, `approved_by` (otra persona del equipo), `reason`, `tables jsonb`,
  `at`) para Fusionar cuentas (L186), con el mismo mapa (cada tabla declara cómo se fusiona).
- Claves: `export_cada_dias` 7, `export_vence_h` 24, `purga_lote` 1000, `retener_escaneos_meses` 13 (L879), `retener_doc_reclamo_dias` 90 (L168),
  `retener_app_events_meses` 13, `retener_sesiones_dias` 400; plantillas `datos_export_listo` y `cuenta_borrada` (correo y aviso).
- Semilla **`0049_mis_datos.sql`** (vecino de prueba con la cuenta borrándose a 1 día y otro a 31; una exportación lista y una vencida).

**0135 `legales` (9e)** — **`legal_pages`** (`key` (terms, privacy, cookies, rules, community, verify, votes, safety, ai, dmca, fair_housing, accessibility…),
`jurisdiction` (`us` general, `us-pa` primero; `us-nj`, `us-ny` cuando toque), `version`, `lang`, `body_md`, `summary_md` (lo que cambió), `sha256`,
`source_path` (`docs/legal/…`), **`status check in ('borrador','revisado','publicado','retirado')`**, **`reviewed_by_counsel`** (nombre del despacho y
fecha; obligatorio para `publicado` en producción, `check` con el entorno), `effective_at`, **`force_accept bool`**, `published_by`); **`legal_acceptances`**
(**solo inserción**: `user_id` o `business_id`, `page_key`, `jurisdiction`, `version`, `accepted_at`, `ip_hash`, `app`; TermsAcceptance de
`modelo-datos.md` L813); `users.legal_state` (estado de residencia declarado o derivado de la ciudad; PA para las cinco); `admin_sections` suma `legal`
dentro de Textos y páginas. **Sin semilla:** los textos son contenido real del repo (como `docs/ayuda/`); el despliegue los indexa.

**0136 `cms` (9f)** — **`cms_strings`** (`id` = `ÁREA-MÓDULO-PANTALLA.clave`, `screen`, `text {es,en}`, `status check in ('borrador','vivo')`,
`max_len`, `locked bool` (líneas fijas del plan y de cada categoría), `updated_by`, `updated_at`) + **`cms_string_versions`** (solo inserción);
**`city_home_config`** (`city_id`, `notice {es,en}`, `blocks jsonb` (bloques encendidos y su orden), `updated_by`); **`announcements`** completa el banner
del Inicio (L341: `city_id`, `audience`, `text`, `from`, `to`, `by_staff_id`). Las cadenas nacen del código (un extractor genera `cms-cadenas.json`; el
servidor sirve primero lo de la base y si no hay, lo del código; guardián `cadenaConLlave`). Semilla **`0050_cms.sql`** (un anuncio vivo y uno vencido).

**0137 `analitica_completa` (9g)** — derivados diarios que llena el barrido (nunca editables): **`metricas_dinero_dia`** (GMV por tipo de operación,
comisión, devoluciones, ticket medio, MRR y conversión a Pro por ciudad y día), **`metricas_retencion`** (cohortes semanales D1/D7/D30 por ciudad, sin
personas), `compa_analitica_dia` y `soporte_analitica_dia` pasan de vista a tabla (L1135), `evt_analitica_dia` igual (L942); **`scheduled_reports`**
(`by_staff_id`, `tab`, `cada check in ('dia','semana','mes')`, `canal check in ('correo')`, `last_sent_at`) + **`founder_reports`** (**solo
inserción**: el reporte diario T#31, su cuerpo y a dónde salió). Réplica de lectura: la app lee la Analítica por `DATABASE_URL_ANALISIS` cuando existe
(en el sandbox, la misma base). Semilla **`0051_analitica.sql`** (90 días de operaciones y cobros de prueba en Hazleton para ver Dinero y retención).

**0138 `crecimiento` (9h)**
- **`short_links`** (ShortLink: `code` único (7 letras sin ambiguas), `target` (ruta propia, nunca un origen ajeno; `check`), `city_id`, `campaign_id`,
  `kind check in ('calle','volante','iglesia','negocio','redes','prensa')`, `created_by`, `retired_at`) + **`link_scans`** (**solo inserción**:
  `code`, `at`, `city_id` de la ciudad elegida, `app` (web/app), `ua_class`; **sin IP ni dispositivo**; `analiticaSinPersonas`).
- **`campaigns`** (`id`, `name`, `city_id`, `kind check in ('lanzamiento','promocion','reclutamiento','aviso')`, `segment jsonb` (ciudad, rol, categoría,
  inactivos, Free con N ítems…), `channel check in ('push','correo','sms','inapp')`, `template_key`, `scheduled_at`, `status`, `approved_by`; nunca a
  quien apagó `mkt`; tope por persona y semana) + **`campaign_sends`** (solo inserción, resultados por plantilla).
- **`featured`** (Featured: `business_id` o `event_id`, `placement`, `city_id`, `from`, `to`, `by_staff_id`, `reason`; rotación justa, tope por ciudad).
- **`referrals`** (Referral: `promoter_user_id`, `code`, `referred_kind`, `referred_id`, `reward_coins`, `status`, `at`; auto-referido = rechazado por
  el antiabuso de 5d) y `users.is_promoter`.
- **`early_access`** (la lista de la landing: `phone_hash` + `user_id` (la persona ya tiene cuenta verificada, E), `zip`, `city_id` o `asked_city`,
  `has_business bool`, `business_kind`, `business_name`, `source_code` (el QR o enlace), `created_at`, `notified_at`); los negocios de acceso anticipado
  son **negocios reales** que publican con Publica tu negocio y quedan «listos» en una ciudad `soon`.
- Interruptor `growth.landing`, claves `campana_por_semana` 2, `destacados_por_ciudad` 6, `fundadores_vecinos` 500, `fundadores_negocios` 100.
- Semilla **`0052_crecimiento.sql`** (enlaces de calle y volante con escaneos de prueba, una campaña programada y una enviada, un destacado, 20
  entradas de prueba en la lista con códigos postales de las cinco ciudades).

**0139 `ciudades_apertura` (9i)** — `cities.status` suma **`'beta'`** (solo entran las cuentas invitadas: beta cerrada y cuentas de revisión, §3.1);
**`city_launch_steps`** (por ciudad: paso 1–7 del asistente, `done_by`, `done_at`, `evidence jsonb`; solo avanza) y **`city_open_rules`** (por ciudad:
`min_waitlist`, `min_ready`, `min_por_categoria jsonb` (comida, belleza, hogar, fiestas, iglesias: `pantallas-iniciales.md`), `checked_at`, `ok`);
`city_status_log` (solo inserción, con motivo); `NOTIFY 'ciudades'` al cambiar el estado (abrir se nota al instante en todos los procesos, L71); barrios
y pueblos de Allentown, Wilkes-Barre, Scranton y Reading en **`packages/db/seeds/zonas.sql`** (dato real del catálogo, corre también en producción; no
es semilla de pruebas). Semilla **`0053_ciudades.sql`** (Reading en `beta` con un vecino invitado).

**0140 `sistema` (9j)** — **`staff_mfa`** (`user_id`, `kind check in ('passkey','totp')`, `totp_secret_enc`, `recovery_hashes text[]`, `enrolled_at`,
`last_used_at`, `revoked_at`); **`backup_runs`** y **`restore_drills`** (**solo inserción**: tipo (base completa, WAL, fotos, sobre de llaves), tamaño,
`sha256`, destino, duración, resultado; la restauración de prueba anota filas contadas y la consulta de verificación); **`health_checks`** (solo
inserción: servicio, latencia, resultado; purga a 30 días); **`maintenance_windows`** (`from`, `to`, `message {es,en}`, `by`, `reason`); **`key_rotations`**
(solo inserción: qué llave, versión vieja y nueva por huella, quién, por qué); `app_error_groups.kind` suma **`'servidor'`**; `feature_flags` suma
`scope check in ('all','city','percent')`, `cities uuid[]`, `percent` (FeatureFlag de `modelo-datos.md`). Semilla **`0054_sistema.sql`** (respaldos y
restauraciones de prueba en cada estado, un grupo de errores del servidor).

**0141 `dinero_real` (9k)** — **`recon_runs`** y **`recon_diffs`** (**solo inserción**: día, PaymentIntents, cargos, devoluciones, transferencias,
payouts y disputas de Stripe contra `payments` / `refunds` / `transfers` / `wallet_entries`; cada diferencia con su tipo y monto; el guardián del dinero
avisa al instante); **`dispute_evidence`** (`dispute_id`, `kind` (foto de entrega, recibo, conversación, constancia), `media_key` privado, `sent_at`);
`payouts_schedule` en Configuración (martes); `payment_methods.card_fingerprint` (huella de Stripe, L760, L938); alertas `refund_stuck` y
`transfer_reversal_stuck` (L800, L821). Semilla **`0055_conciliacion.sql`** (un día cuadrado y uno con dos diferencias).

**0142 `avisos_completos` (9l)** — `notifications.sms_delivery` (`entregado`, `fallo`, `sin_respuesta`; del webhook de Telnyx) y `sms_tries`;
**`wa_templates`** (plantillas de WhatsApp para escribir primero: nombre, idioma, categoría, estado de Meta); `users.email_verified_at` + `email_tokens`
(un uso, 24 h); **`inbound_email`** (correo entrante de Soporte por SES: `message_id`, `from_hash`, `case_id`, `at`; el cuerpo tapado en
`support_messages`); claves `sms_reintentos` 3, `remitentes_por_minuto` 60 (tope global, L1120); plantillas que faltan (L342).

**0143 `vecino_cierre` (9m)** — `user_onboarding` (pasos 3–5: zona, gustos, barrio); `search_alerts.removed_at` (Avisos › Quitar, L324); `dm_threads`
y `chat_threads` con `NOTIFY 'mensajes'` (Mensajes en vivo por SSE, L385, L599); `business_mentions` (temas «Lo que más mencionan», derivado, L280).

**0144 `negocio_cierre` (9n)** — `business_holidays` (feriados del año por estado + días propios + «Abro por temporada», L114) y `module_hours` (L117);
**`delivery_proofs`** (foto privada y código del cliente, código de recogida del negocio, L369); `delivery_offers` (oferta con cuenta regresiva a los
repartidores del negocio, L370); `admin_sections` suma **`dlv`** (Super Admin › Repartidores, ADM-DLV, L371); `support_cases.assigned_to` libre (L990);
`team_holidays` (L982); `queue_sla` editable (L145). Semilla **`0056_repartidor.sql`** (una entrega con prueba de foto y una oferta vencida).

**0145 `despliegues` (9o)** — **`deploy_releases`** (**solo inserción**: `entorno`, `commit`, `image_digest`, `migrations_applied`, `started_at`,
`healthy_at`, `result check in ('ok','vuelta_atras','fallo')`, `reason`, `founder_ok_ref` (obligatorio en producción)); **`incident_log`** (solo
inserción: inicio, fin, severidad, qué se vio, qué se hizo, enlace al paso del manual); la vista que alimenta Sistema › Estados.

**Grupo B y C (la siguiente libre el día que corren):** **9p** = la migración de 8b (`apps_enlaces`: `app_signing_certs`, `apple_team_id`, eventos
`enlace_app` / `enlace_web`; fase8 §2); 9q, 9r, 9s, 9t, 9u y 9v **no deberían necesitar** migración (si la necesitan, la toman y se dice).

**Semillas de pruebas** (`is_test`, nunca en producción): `0049_mis_datos`, `0050_cms`, `0051_analitica`, `0052_crecimiento`, `0053_ciudades`,
`0054_sistema`, `0055_conciliacion`, `0056_repartidor`. Arreglo previo en 9a: las semillas 0044–0046 en una base nueva no crean lo que depende de
cuentas que crean las pruebas (LAUNCH L1239, L1265): se crean en la semilla misma.

---

## 3. Producción, secretos, respaldos, vuelta atrás, legales y datos personales (servidor — Opus/high; revisión de seguridad obligatoria)

### 3.1 Producción en dos tiempos: acceso anticipado y apertura (§6 #1)
- **Por qué dos tiempos:** la fila 9 dice que la landing de acceso anticipado «puede ir antes» y la decisión A deja reclutar negocios antes de abrir.
  Pero lo que deja la landing (teléfonos, negocios reales armando su página) **son datos reales** y por M e I no pueden vivir en el sandbox. Entonces
  producción se enciende **antes** de la apertura, con casi todo apagado, y la apertura es solo encender interruptores.
- **Tiempo 1 · acceso anticipado (OK-1, bloque 9t):** las cinco ciudades en `soon`; abiertos **solo**: la landing en `tolatino.com`, «Avísame» con
  código (crea la cuenta, E), **Publica tu negocio** y el **panel** (el negocio arma su página, su menú, sus servicios; ve «Tu página se ve el día que
  abra Hazleton»), Soporte y El Compa del panel (si 9q está). **Apagados por interruptor:** pedidos, citas, boletos, cobros a clientes, Comunidad,
  Eventos públicos, campañas. Stripe Connect: el negocio puede conectar su cuenta (no se cobra nada hasta abrir) si 9-1 está en vivo; si no, conecta al
  abrir.
- **Tiempo 1b · beta cerrada (OK-2, bloque 9u):** Hazleton pasa a **`beta`**: entran solo las cuentas invitadas (vecinos y negocios de confianza +
  las **cuentas de revisión** de Apple y Google). Con eso Apple y Google revisan **una ciudad abierta**, no la pantalla «próximamente» (que en la revisión
  sería un 2.1 / 4.2). Pagos reales con tarjeta entre invitados (montos chicos, devolución si piden).
- **Tiempo 2 · apertura (OK-3, bloque 9v):** las cinco ciudades a `on` el mismo día (A, X) con el asistente (9i), lista de espera avisada, El Compa
  encendido, apps aprobadas publicadas por fases.

### 3.2 Producción como código: `infra/produccion/` (9o; §6 #2–#4)
- **Mismo paquete:** `infra/comun/` con lo que comparten los dos entornos (compose base, `deploy.sh` parametrizado por `TOLATINO_ENTORNO`, nginx,
  migraciones, índice de la ayuda y de lo legal, mapa, moderación, traductor, direcciones); `infra/pruebas/` y `infra/produccion/` solo con sus
  diferencias (compose override, nginx con el dominio, número de máquinas). El guardián **`mismoPaquete`** comprueba que producción no tenga un paso que
  no exista en pruebas (salvo la lista cerrada: sin semilla, sin `TOLATINO_SMS_MODO=pruebas`, sin simuladores, sin `REVISION_CODIGO_*` del sandbox,
  sin `TOLATINO_PAGOS_SIMULADOR`).
- **Máquinas (PLAN §3.2, T#33):** **app** (Next + barrido + push + servicios internos), **base** (Postgres + PostGIS, disco propio) y **réplica** de lectura
  (análisis, T#33; es también la que vigila desde fuera, §3.5). Tamaño inicial por precio del día (C2), parecido al sandbox (4 núcleos / 8 GB la app,
  4 dedicados / 16 GB la base). Red privada entre las tres; la base sin IP pública. Firewall: 80/443 solo desde los rangos de Cloudflare (por la API).
- **Cloud-init en el repo** (`infra/produccion/cloud-init.yml`, y el del sandbox también, que hoy no está): paquetes, usuario `deploy`, fail2ban,
  actualizaciones automáticas, `tolatino-sync` contra la rama **`produccion`**. **Sin llave SSH** (como el sandbox): emergencia = reconstruir con el
  mismo cloud-init por la API del proveedor.
- **Cloudflare (D, Paquete 8-0):** zona `tolatino.com`; registros de producción y de `pruebas.` por la API; «Full (strict)» con certificado de origen;
  WAF que no desafía `/.well-known/*` (8b) ni `/api/stripe/webhook`, `/api/tiendas/*`, `/api/pases/*`; límites por IP para las acciones sin cuenta
  (traducción L683, «Avísame», código de entrada); caché de `/_next/static`, `/medios/n/*` y `/teselas/*`. Cuerpos de hasta 100 MB en el plan gratis
  (LAUNCH L1348: los `.aab` y dSYM van por la tubería del sandbox, no por producción).
- **La rama `produccion`** nace de `pruebas` el día de OK-1 y solo avanza por fast-forward a un commit que ya pasó por `pruebas` con su CI en verde
  (guardián **`produccionSoloAvanza`** en el CI: el commit de `produccion` siempre es ancestro de `pruebas` y tiene una corrida verde). Nadie empuja a
  `produccion` sin el OK anotado en `deploy_releases.founder_ok_ref` (la frase del fundador con su fecha, del chat).
- **Lo que nace en el servidor (una vez, nunca viaja):** `AUTH_SECRET`, `DATOS_SECRET`, `BARRIDO_TOKEN`, `QR_LLAVE_PRIVADA` (una por entorno, LAUNCH
  L775), `VAPID_PRIVADA`, `POSTGRES_PASSWORD`, llaves de Garage, `LLAVERO_SECRET`; el **código de arranque del primer Admin** nuevo (otra huella, L37).
- **Datos que producción carga sola:** teselas de Pennsylvania, calles TIGER (L273), barrios (9i), catálogo (`packages/db/seeds/*`: categorías,
  filtros, licencias, inventario de datos). **Nunca** `infra/pruebas/semilla/`.

### 3.3 Secretos de terceros: el sobre sellado (§6 #5)
- **El problema:** las llaves de Stripe, Telnyx, SES, Meta y Anthropic llegan a los **secretos del entorno de Claude Code** por el formulario seguro
  (regla 1), pero hoy **no tienen camino al servidor** (LAUNCH L994; el compose ni las nombra).
- **Decisión:** cada servidor genera al nacer un par **X25519** (formato `age`, BSD-3) y publica solo la llave pública en `/estado/llave.txt`. Claude,
  en una sesión que tiene la llave en sus secretos, la cifra para ese servidor y la sube como **`infra/{entorno}/sellado/{NOMBRE}.age`** en un commit; el
  `deploy.sh` del servidor la abre con su llave privada y la pone en `/etc/tolatino/{entorno}.env`. En el repo solo hay texto cifrado que **solo ese
  servidor** puede abrir; nadie copia ni pega nada; rotar = sellar la nueva y anotar en `key_rotations`. Sirve igual para el sandbox (9q) y producción (9t).
- **Riesgo dicho:** el repo es público (fase8 §6 #29), así que el texto cifrado queda a la vista. Con X25519 + ChaCha20-Poly1305 es seguro mientras la
  llave privada del servidor no salga; si el fundador prefiere que **nada** cifrado viva en el repo, la alternativa es un endpoint del servidor con
  autenticación OIDC de GitHub (como 8h) al que Claude manda el sobre; se cambia sin tocar la app.
- **Guardianes:** `llavesFueraDelRepo` ampliado (ningún secreto en claro; solo `*.age` en `sellado/`), **`selladoSoloSuServidor`** (cada sobre dice para
  qué huella de llave pública se cifró y coincide con la publicada), `secretoConDueño` (cada variable del entorno de producción está en una lista cerrada
  con su origen: nace en el servidor o llega sellada).

### 3.4 Respaldos, restauración probada y el manual de incidentes (9o, 9j; HERRAMIENTAS #14, #22; guardián Datos de PLAN §5)
- **Base:** respaldo físico continuo con **pgBackRest** (MIT) — completo diario y diferencial cada 6 h + WAL continuo — a un **almacén de objetos fuera del
  servidor y en otra región del mismo proveedor**, cifrado del lado del servidor con una llave propia (`RESPALDO_LLAVE`, nace en el servidor y se guarda
  también en el sobre de recuperación). **Recuperación a un punto en el tiempo** (PITR) de hasta 35 días.
- **Fotos (Garage):** sincronización diaria del bucket al mismo almacén (versionado, 35 días). **Llaves:** el **sobre de recuperación** (`DATOS_SECRET`,
  `QR_LLAVE_PRIVADA`, `VAPID_PRIVADA`, `AUTH_SECRET`, `RESPALDO_LLAVE`, la llave privada `age` del servidor) cifrado para una **llave de recuperación**
  que vive solo en los secretos del entorno de Claude Code de producción (formulario seguro) — sin ella, un servidor reconstruido no podría leer
  `op_private` (LAUNCH L458) ni validar los QR ya emitidos.
- **Restauración probada (no «respaldo verificado» de palabra):** cada semana el barrido de la réplica crea por la API una **máquina desechable**, restaura
  el último respaldo a un punto de hace 1 h, corre `migrar.sh --verificar` (no cambia nada), una lista de consultas de control (filas por tabla
  principal, sumas de dinero, último `audit_entries`), **destruye la máquina** y anota en `restore_drills` (cuánto tardó = el RTO real). Si falla o no
  corrió en 8 días → alerta crítica (guardián `respaldoRestaurado`). Objetivo: **RPO ≤ 5 min, RTO ≤ 1 h**.
- **Manual de incidentes** (`docs/incidentes/`, ES): un archivo por caso con «cómo se nota → qué hace el sistema solo → qué hace Claude → qué se le dice al
  fundador y a los vecinos»: la app no responde; la base no responde; disco lleno; despliegue malo (vuelta atrás); migración mala; pico de errores;
  Stripe caído (los pedidos con tarjeta esperan, efectivo sigue); SMS caído (passkeys, WhatsApp, correo); Cloudflare caído; llave filtrada (rotación);
  dato borrado por error (PITR a otra base y copia de lo puntual, nunca restaurar encima); servidor perdido (reconstruir con cloud-init + restaurar +
  sobre); certificado vencido; abuso o ataque (Cloudflare «Under attack», límites); proveedor de IA caído (El Compa → «Con una persona», F).
- **Simulacros (9o en el ensayo, 9t en producción antes de abrir):** se provoca cada caso en la máquina de ensayo y se mide; los de producción se
  repiten antes de OK-3 con la plataforma en acceso anticipado (sin vecinos todavía). Lo medido va a `docs/incidentes/simulacros.md` y a PROGRESS.

### 3.5 Vuelta atrás automática y monitoreo (9o, 9j; T#16, PLAN §3.4)
- **Despliegue azul/verde en la máquina de la app:** la imagen nueva (etiquetada por commit y digest) arranca junto a la vieja; nginx cambia de destino
  solo cuando `/api/salud` contesta bien 3 veces; **10 minutos de vigilancia**: tasa de 5xx de nginx, `/api/salud`, errores nuevos de
  `app_error_groups` (web, apps y servidor) y latencia p95. Si pasa el umbral (Configuración, con límites) → **vuelve a la imagen anterior sola**, anota
  `vuelta_atras` en `deploy_releases`, avisa (push al equipo, correo y SMS crítico al fundador) y abre un caso del manual.
- **Migraciones que permiten volver:** toda migración es **expandir → contraer** (columnas y tablas nuevas primero; borrar o renombrar solo en un
  despliegue posterior, cuando ningún código vivo las usa). Guardián **`migracionReversible`**: un `drop`/`rename` de algo que el commit anterior todavía
  lee rompe el CI. Una migración nunca se «deshace»: se escribe otra.
- **Apps de tienda:** no se pueden volver atrás; un pico en una versión pausa el **lanzamiento por fases** por la API (8f, 9u) y la web servida vuelve
  atrás como siempre.
- **Monitoreo propio (HERRAMIENTAS #4, #14):** **Uptime Kuma** (MIT) en la réplica vigila desde fuera de la app (`tolatino.com`, `/api/salud`, la base,
  certificados, Stripe webhook vivo, cola del push, cola del barrido); **Prometheus + node_exporter + postgres_exporter** y tableros en **Sistema › Salud**
  (no se agrega Grafana como pantalla aparte: el Super Admin es el tablero, HERRAMIENTAS #15); **segundo testigo**: un flujo de GitHub Actions programado
  cada 10 min que pide `/api/salud` desde fuera (gratis en repo público) y avisa si el primero calla. Alertas: push al equipo, correo (SES) y SMS solo a lo
  crítico. Logs técnicos: `journald` + rotación; Loki queda como opción si el volumen lo pide (§6 #7).

### 3.6 Legales por estado (9e, 9s; HERRAMIENTAS #29)
- **Mecanismo, no texto final:** `docs/legal/{jurisdiccion}/{clave}.{es,en}.md` (el repo es la fuente, como la ayuda) → `legal_pages` con versión y
  sha256 en cada despliegue; Super Admin › Textos y páginas › **Páginas** muestra versiones, diferencias, estado y quién lo revisó; publicar una versión
  nueva con `force_accept` pide aceptar de nuevo (hoja §1b #5) a quien entra después de `effective_at`.
- **Jurisdicción:** las cinco ciudades están en **Pennsylvania** → `us` (general) + **`us-pa`** (adendas de PA). La página que se ve es la general con
  la adenda del estado de la persona; un estado nuevo (NJ, NY) es una carpeta más. Nada del código cambia por estado.
- **Páginas:** las 14 de `web-pages.js` (las legales son Términos, Privacidad, Cookies) + las que piden las fases: **Términos de la Comunidad** (5a, 5d:
  Sección 230, apelación), **Política DMCA** con el agente designado (5d), **Aviso de IA** (El Compa, 7c, 7f, 7g), **Vivienda justa** (4ib, 4id),
  **Accesibilidad**, y las políticas de cancelación y devolución que cada fase dejó escritas (boletos 6d, evento privado 6i, layaway 4r, planes 4f,
  rentas 4f-2). **Privacidad** sale del inventario y del mapa de datos (9d) —qué se guarda, para qué, cuánto, qué se exporta, qué se borra—, del aviso de
  analítica propia sin terceros (L215), de los procesadores (Stripe, Telnyx, Meta, SES, Anthropic, Apple, Google) y de la voz del navegador (L95).
- **Borradores de Claude** marcados «BORRADOR — pendiente de revisión legal» en el sandbox; **la lista para el abogado** (`docs/legal/para-el-abogado.md`)
  junta cada pregunta abierta de LAUNCH con su línea (el anexo, grupo 9s) para que el paquete 9-2 sea una sola consulta.
- **Cookies:** solo propias y necesarias (sesión, dispositivo `tl_dev`, idioma, ciudad); **sin terceros ni publicidad** → sin banner de consentimiento;
  la página lo explica (a confirmar con el abogado por las leyes de privacidad estatales vigentes ese día).

### 3.7 Tus datos: exportar, borrar a los 30 días, retener (9d; D5, HERRAMIENTAS #29)
- **Un solo mapa** (`data_map`, §2 0134) dice por cada tabla y columna personal qué se exporta, qué se borra, qué se seudonimiza y por qué se guarda. El
  inventario de las tiendas (8i) y Privacidad (9e) salen del mismo lugar; el guardián **`mapaDeDatos`** rompe el build si una tabla nueva con personas no
  está.
- **Exportar** (vecino y negocio): pedido con el código de entrada otra vez (o la llave), armado en segundo plano por el barrido, ZIP con JSON + CSV
  legibles y un `LEEME` ES/EN; almacén privado; enlace de **un uso** que vence a las 24 h (un GET de una vista previa no lo gasta, `enlaceUnUsoSinGet`);
  una cada 7 días; anotado. El negocio exporta **lo que su panel ya muestra** (su página, catálogo, operaciones, cobros y clientes con lo mismo que ve
  hoy), nunca más.
- **Borrar a los 30 días (L315, L188, L1127, L1321, L681):** el barrido toma las cuentas con `delete_at` vencido, en lotes, y por el mapa: **borra**
  perfil, direcciones, guardados, seguidores, reseñas y comentarios, publicaciones, mensajes, traducciones derivadas (`ugc_translations`), llaves de
  acceso, tokens de push, sesiones, fotos (Garage), alertas de búsqueda, exportaciones; **seudonimiza** lo que la ley o el dinero exigen guardar
  (operaciones y cobros: el cliente pasa a «Cuenta borrada», sin nombre ni teléfono; auditoría: el id queda, el nombre no); **sus negocios** quedan sin
  dueño («sin reclamar», L188) si no tienen otro dueño; Stripe guarda lo suyo (D5). `users.status = 'deleted'`, `purge_runs` anota cada tabla. Un vecino
  que vuelve con el mismo teléfono es una cuenta nueva.
- **Retenciones** con su número en Configuración (límites y auditoría): escaneos 13 meses y luego totales (L879), foto del documento del reclamo 90 días
  (L168), `app_events` 13 meses y luego `app_events_dia`, El Compa 12 meses (ya, 7i), errores 90 días (8f), posiciones 14 días (8e), sesiones viejas 400
  días. Guardián `retencionQueCorre` ampliado: cada clave `retener_*` tiene su barrido y su prueba con el reloj movido.

### 3.8 La `LAUNCH-CHECKLIST` en cero: cómo se cuenta (9a)
- **Hoy (commit `eb386fd`, 11 nov):** 1 383 líneas; **535 pendientes** (532 casillas sin marcar + 3 viñetas abiertas en «Plan Pro», L385, L388, L393) y 62
  marcadas. El **Anexo A** asigna cada una, por su línea, a un bloque o paquete: **403 (a) se resuelven en el sandbox**, **113 (b) esperan un paquete del
  fundador o una cuenta de un tercero**, **19 (c) solo se cierran al encender producción**.
- **«Cero» quiere decir:** cada línea queda (1) **hecha y comprobada** sobre lo servido, con la prueba o la captura que lo dice; o (2) **cerrada por una
  decisión** anotada en `docs/REVISION.md` («decidí X; si prefieres Y, se cambia») y, si es «después de abrir», movida a **`docs/DESPUES-DE-ABRIR.md`**
  (lista nueva, con la decisión que la saca de la apertura: El Patio (G), Repartidores de To'Latino, Apple Pay nativo, lotes del repartidor…). Nada se
  borra de LAUNCH: se marca con su motivo.
- **Muchas líneas viejas ya están hechas** (las fases 2–8 construyeron lo que las fases 1–2 dejaron «para después» y nadie volvió a marcar): las 89 de
  «verificar» del grupo 9a se comprueban contra el código y el sandbox y se marcan con su evidencia, o pasan al bloque de su área si falta algo.
- **Guardián `launchConDestino`:** desde 9a cada línea pendiente lleva su destino (`→ 9k`, `→ Paquete 9-2`, `→ después de abrir`); una línea nueva sin
  destino rompe el CI. Con `TOLATINO_FASE=9` en el CI de la apertura, **una sola línea pendiente** rompe el despliegue a producción de OK-3.

### 3.9 Lo que esta fase NO hace
El Patio (G) · Repartidores de To'Latino (registro, verificación, pago por Connect; L372: «más adelante», por ciudad) · Apple Pay / Google Pay nativos
(L1149) · grabación de sesiones con rrweb (fase8 §6 #16; L214) · lotes del repartidor (L370, la oferta sí) · QR rotativo y red entre teléfonos de la puerta
(L766, L900) · venta en la puerta (D1) · Pro anual · importar negocios de Google Places o de la web (D2, I: producción nace vacía; `solo-prototipo.md`
L321 queda sin construir) · iPad nativo · promotores de eventos (L949) · Wallet de To'Latino como forma de pago (L951) · conectar DoorDash Drive / Uber
Direct (L270: servicio externo nuevo, decisión del fundador) · llamada enmascarada por voz (R1: sin servicio de voz; §6 #20) · vista previa por rama
con Vercel (HERRAMIENTAS #32; D: sin Vercel; el sandbox y la base desechable del CI la cubren). Todo esto va a `docs/DESPUES-DE-ABRIR.md` con su decisión.

---
## 4. Bloques

Cada bloque del grupo A se cierra como en las fases 5–8: migración aplicada dos veces (local, base nueva y CI) + semilla `is_test` + punta a punta en
**teléfono 390 y escritorio 1360** (y en la matriz de 9 dispositivos desde 9b) + guardianes nuevos con su prueba **al revés** (`alreves9x`) + capturas
de lo compuesto + `docs/ayuda/` ES/EN + PROGRESS, REVISION y LAUNCH al día + commit a `pruebas`. «Necesita» dice qué hace falta del fundador.

### Grupo A · se construye ya en el sandbox, sin nada del fundador (encadenado, decisión AB)

### 9a · Orden antes de cerrar: las pruebas al repo, las viejas al día y la LAUNCH auditada contra lo servido — Sonnet/medium
**Estado (12 nov): HECHO** salvo la regresión entera en verde (29 de 198 rojas en la corrida completa; su lista y su destino, 9b, en PROGRESS
«Fase 9 · 9a» y en LAUNCH «Fase 9 · 9a»). Pruebas en `pruebas/` (159 de punta a punta, 39 al revés, `servir/`, `correr.mjs`), semilla `0049`,
guardianes `pruebaSinSecretos`, `sinEnConstruccion`, `revisionVeCiudadAbierta`, `launchConDestino`, `e2eEnElRepo` (`alreves9a` 28/28), LAUNCH con
destino en cada línea y `docs/DESPUES-DE-ABRIR.md`. Sin migración.
**Necesita:** nada. **Va primero:** las pruebas de punta a punta viven fuera del repo (§0) y la auditoría de LAUNCH ordena todo lo demás.
**Datos:** ninguna migración. Arreglo de las semillas 0044–0046 en una base nueva (L1239, L1265: crean ellas mismas las cuentas de las que dependen).
**Pruebas al repo:** `pruebas/e2e/{nombre}.cjs` (las ~220 de punta a punta: `adm*`, `com5*`, `evt6*`, `compa7*`, `app8a`, `push8c`…), `pruebas/alreves/`
(las 37 al revés y `alreves.sh`), `pruebas/servir/` (los `servir*.sh` reducidos a uno con perfiles por fase) y **`pruebas/correr.mjs`** (una o todas, una a
la vez o por grupos que no se pisan, con el resumen de comprobaciones). Las de depuración (`dbg*`, `cap*`, `probe*`, `*.pre*`) **no** se suben. Ninguna
prueba lleva teléfonos reales, llaves ni datos fuera de la semilla (guardián **`pruebaSinSecretos`**).
**Pruebas viejas al día (Anexo A, 9a-P, 13 líneas + las de PROGRESS):** `planes2n` (espera «Pedidos (Comida, Mercados, Tiendas)», que salió del código el 6
nov), `pedidos2c` (espera «Nada pendiente» y Hoy cuenta el evento privado, L1092), `noc4c` (reloj que depende del día, L885), `alreves6b` y `alreves6g`
(L958), `ayuda2i`, `cit3e`, `ayu4if`, `ayu4z` con El Compa encendido (L1020), `msg2p` con respuestas automáticas (L1060, en 9b), `usr1l` (datos
acumulados; PROGRESS 8d), `evt6a` con el texto viejo «La venta en la app abre pronto» (L854), `pagos2d` que borra datos compartidos (L477), `evt6b-6c`
inestable (L954, en 9b), el recordatorio `rsvp_recordatorio` sin prueba (L742), la semilla 0040 sin líneas (L1041) y el pedido sin hora (L1026).
**Guardián `sinProntoEnTienda` corregido:** hoy cuenta `PantallaPronto` (la ciudad «próximamente», una función) como si fuera `Pronto` («En
construcción»). Se parte en **`sinEnConstruccion`** (falla siempre: `Pronto.tsx` sin usos se borra del código) y **`revisionVeCiudadAbierta`** (las
cuentas de revisión y la beta entran a una ciudad `on` o `beta`, 9i).
**Auditoría de LAUNCH:** cada línea del Anexo A del grupo **9a-V** (89) se comprueba contra el código y el sandbox: hecha → se marca con su evidencia
(archivo, prueba o captura); a medias → su resto pasa al bloque de su área con la línea nueva. Las del grupo **9a-D** (63) son decisiones tomadas o
notas: se confirman en REVISION y se cierran o pasan a `docs/DESPUES-DE-ABRIR.md`. Cada pendiente que queda lleva su destino (`→ 9x`).
**Guardianes:** **`launchConDestino`** (toda línea pendiente con destino válido; con `TOLATINO_FASE=9`, ninguna pendiente), **`e2eEnElRepo`** (cada
bloque de `docs/PROGRESS.md` que nombra una prueba la tiene en `pruebas/e2e/` o `pruebas/alreves/`), `pruebaSinSecretos`, `sinEnConstruccion`,
`revisionVeCiudadAbierta`; punta a punta **`orden9a`** = `pruebas/correr.mjs --todas` en el sandbox local: toda la regresión en verde, con su cuenta.
**Ayuda:** ninguna nueva (no cambia nada para las personas).

### 9b · La tubería completa (PLAN §3.4, §5) y la escala 1M — Opus/high (carga y contadores); CI Sonnet/medium
**Necesita:** nada (la máquina de carga es por horas en el proyecto de pruebas, §6 #28).
**Datos:** migración **0133** (`rate_counters`, `app_events` por mes + `app_events_dia`, refresco del vocabulario).
**CI:** **punta a punta en 9 dispositivos** (W: iPhone SE, 15, Pro Max, Pixel, Galaxy, iPad y escritorio 1024 · 1280 · 1440; Playwright con WebKit y
Chromium) en `ci.yml`, por grupos en paralelo contra una base desechable con migraciones + semilla (como el job «capturas» de 8i); **pruebas visuales**
(capturas aprobadas en `pruebas/visual/{pantalla}/{dispositivo}.png`, diferencia con tolerancia; una captura nueva se aprueba en REVISION y entra por
commit); **axe** (WCAG AA) sobre cada pantalla de la regresión; **Semgrep** con reglas propias + `pnpm audit` (dependencias); **velocidad** con el
presupuesto de cada pantalla (Web Vitals de laboratorio, L214) y de cada consulta (`EXPLAIN` de las consultas calientes contra la base de carga). Las
pruebas que fallan una vez y pasan solas se arreglan, no se reintentan (L954). XCUITest de iOS más hondo en el job macOS (L1171, L1360).
**Escala:** `scripts/carga/` completo (`comunidad-1m`, `eventos-1m`, `apps-1m`, `compa-1m`, `analitica-1m`) contra una base de 1 M de vecinos y 5 M de
operaciones en una máquina desechable; cada presupuesto que dejaron las fases (Anexo A, grupo 9b: L578, L588, L603, L627, L631, L648, L665, L701, L747,
L851, L869, L898, L942, L1210, L1260, L1305…) se mide y queda en PROGRESS con su cifra; lo que pasa del presupuesto se arregla aquí (índice, derivado o
cursor). **Topes compartidos** entre procesos en `rate_counters` (L685, L699, L1235, L1302); listas con `OFFSET` a cursor donde la cifra lo pida (L76,
L193); guardián estático de tipos de parámetros SQL (L176) y `ordenSinTexto` a todo el código (L1052).
**Guardianes:** **Visual**, **Accesibilidad** (axe), **Seguridad** (Semgrep + dependencias), **Velocidad** (presupuesto) — los de PLAN §5 que faltaban —,
`topeCompartido` (ningún tope por minuto en la memoria del proceso), `ordenSinTexto` ampliado, `parametroSinTipo` estático; punta a punta **`tub9b`**: una
corrida del CI completa en verde y un cambio visual sin aprobar que la frena (al revés).
**Ayuda:** ninguna (equipo: `admin-configuracion` al día por los topes).

### 9c · Accesibilidad WCAG AA del sistema de diseño — Sonnet/medium
**Necesita:** nada. **Datos:** ninguna.
**Sistema de diseño:** los **193 `onClick` en `<div>/<span>`** de `packages/ui/src/ds` (L395: AdminBar 23, Thread 18, SiteHeader 17, Patio 11,
DeliveryPrefs 10, OnbTopBar 10, CompaFrame 10, MenuItemRow 9…) pasan a `<button>` o a elementos con rol, nombre y teclado; `QtyStepper` (L483, L785);
foco visible, orden de tabulación, contraste y tamaño táctil (44 px); `AuthSheet` con errores anunciados (L240). Se cambia en `portar-sistema.mjs` y en
`packages/ui` en el mismo turno (decisión L). Trinquete `botonAccesible` baja a **0**.
**Guardianes:** `botonAccesible` en cero, axe sin violaciones serias en la regresión (9b); punta a punta **`a11y9c`** (teclado solo: pedir, reservar,
comprar un boleto, publicar un negocio y entrar al Super Admin sin mouse; VoiceOver simulado por el árbol de accesibilidad de Playwright).
**Ayuda:** `accesibilidad` (vecino, nueva; también es la página de Accesibilidad de 9e).

### 9d · Tus datos: exportar, borrado definitivo a los 30 días, retención y fusionar cuentas — **Opus/high**
**Necesita:** nada. **Datos:** migración **0134** y semilla **0049_mis_datos.sql**.
**Servidor:** `lib/datos/mapa.ts` (lee `data_map`), `lib/datos/exportar.ts` (arma el ZIP por el mapa, en el barrido, al almacén privado; enlace de un
uso), `lib/datos/purgar.ts` (D5 por el mapa: borrar, seudonimizar, negocios sin dueño, fotos de Garage, `purge_runs`; reusa `compa_purgar` de 7i),
retenciones (§3.7) en el barrido, **Fusionar cuentas** (`lib/datos/fusionar.ts`, aprobada por otra persona del equipo, L186). Volver a entrar durante los
30 días cancela como hoy; después, nada vuelve.
**Pantallas:** Mi cuenta › Ajustes › Privacidad › **Descargar mis datos** (hueco #4; L321) y **Términos que aceptaste** (L189); Panel › Más › **Exportar
los datos del negocio**; la pantalla de «Borrar mi cuenta» sin cambios de texto (ya promete lo que ahora pasa).
**Super Admin:** Usuarios 360° › Privacidad (exportaciones, borrado programado y su purga con cada tabla, «ver como» de solo lectura L189, **Fusionar** con
dos personas); Sistema › Configuración › Retención (las claves `retener_*` con límites).
**Guardianes:** **`mapaDeDatos`** (toda tabla o columna personal está en el mapa; reemplaza y amplía `privacidadCoherente`), **`purgaCompleta`** (después de
la purga de una cuenta de prueba, ninguna tabla del mapa marcada «borrar» tiene su id ni su teléfono), **`exportaSoloLoSuyo`** (el archivo no trae nada
de otra persona), `retencionQueCorre` ampliado, `enlaceUnUsoSinGet`; punta a punta **`datos9d`** (pedir y bajar el archivo, el enlace vence y no se gasta
con una vista previa; otra cuenta pide el archivo → 404; reloj a +30 días → la cuenta purgada con cada tabla comprobada y su pedido como «Cuenta
borrada» en el panel del negocio; volver con el mismo teléfono = cuenta nueva; fusionar con una sola persona → no).
**Ayuda:** `descargar-mis-datos` (vecino y negocio), `borrar-mi-cuenta` al día, `admin-privacidad` (equipo).

### 9e · Legales por estado, aceptación de términos y la web legal (`/terminos`, `/privacidad`, `/cookies`…) — **Opus/high** (versiones y aceptación)
**Necesita:** nada para construir; **el texto final es del abogado** (Paquete 9-2, bloque 9s).
**Datos:** migración **0135**; contenido en `docs/legal/us/` y `docs/legal/us-pa/` (borradores de Claude, ES/EN, marcados BORRADOR).
**Servidor:** `scripts/legal/indexar.mjs` (como la ayuda: sha256, versión, estado), `lib/legal.ts` (`paginaPara(persona, clave)` con la adenda del estado,
`aceptar`, `faltaAceptar`), el despliegue las indexa; publicar una versión nueva solo desde el Super Admin y, en producción, solo con
`reviewed_by_counsel`.
**Pantallas:** `To'Latino Página.dc.html` (`APP-WEB`) para las páginas públicas: **`/terminos`**, `/privacidad` (sale de borrador cuando el abogado la
revisa), `/cookies`, `/reglas`, `/verificamos`, `/votos`, `/seguridad`, `/ia`, `/dmca`, `/vivienda-justa`, `/accesibilidad`; pie de la web con todas; la
hoja «Aceptar los términos nuevos» (hueco #5); en Publica tu negocio y en el primer pedido, la aceptación que hoy es texto se guarda en
`legal_acceptances`. Las fichas de las tiendas apuntan a estas URL (8i).
**Super Admin:** Textos y páginas › **Páginas** (versiones, diferencias, estado, quién revisó, publicar con motivo, `force_accept`; aceptaciones por
versión sin personas).
**Guardianes:** **`legalRevisado`** (en producción ninguna página `publicado` sin `reviewed_by_counsel`), **`legalUnaFuente`** (el texto solo vive en
`docs/legal/`; ninguna página legal escrita en un `.tsx`), `aceptacionSoloInsercion` (`libroSoloInsercion`), `idioma`; punta a punta **`leg9e`**
(sin sesión: cada página en ES y EN; versión nueva con `force_accept` → la hoja al entrar, el pedido abierto sigue; aceptar queda anotado una vez; en
modo producción simulado, publicar sin revisión → rechazado).
**Ayuda:** `terminos-y-privacidad` (vecino y negocio), `admin-paginas-legales` (equipo).

### 9f · Super Admin › Textos y páginas completo (CMS): cadenas ES/EN, rótulos, Home por ciudad, anuncios y el Super Admin en inglés — Sonnet/medium
**Necesita:** nada. **Datos:** migración **0136** y semilla **0050_cms.sql**.
**Servidor:** extractor `scripts/cms/extraer.mjs` (las cadenas de la interfaz con su llave `ÁREA-MÓDULO-PANTALLA`; las líneas fijas del plan y de cada
categoría quedan `locked`), `lib/cms.ts` (la base primero, el código de respaldo; caché con `NOTIFY 'cms'`), `CityHomeConfig` en el Inicio de cada
ciudad, el **banner de Anuncios** en el Inicio (L341), el editor de la ayuda que publica una versión nueva sin tocar el repo de inmediato (el repo sigue
siendo la fuente: lo editado se guarda como cambio propuesto y entra al repo en el siguiente commit de Claude; L973, fase7 §6 #12).
**Pantallas:** las que ya existen leen el CMS (nada se ve distinto hasta que alguien edita). **Super Admin:** Textos y páginas con **Cadenas** (buscar,
estado traducido / pendiente / revisado, largo máximo, ES/EN lado a lado), **Rótulos por categoría**, **Páginas** (9e), **Home por ciudad**, **Ayuda**
(7a, con el editor); el **Super Admin en inglés** (L708, L732, L751, L788, L945, L1080: hoy todo en español) con el idioma de quien lo usa; el inglés de
la ayuda ampliado donde es menos de una quinta parte del español (L967).
**Guardianes:** **`cadenaConLlave`** (todo texto de interfaz sale del CMS con su llave; amplía `idioma`), `lineaFijaBloqueada` (911, «nadie te garantiza un
resultado» y las de §1c de cada fase no se editan), `cmsConLimite` (largo máximo del componente); punta a punta **`cms9f`** (editar una cadena → la ve el
vecino al instante en los 9 dispositivos, sin cortar; una línea fija no se puede editar; Home de Allentown con un bloque apagado; anuncio con fechas).
**Ayuda:** `admin-textos-y-paginas` (equipo).

### 9g · Super Admin › Analítica completa, base de análisis y el reporte diario al fundador — Sonnet/medium; réplica y derivados Opus/high
**Necesita:** nada (en el sandbox la base de análisis es la misma base; la réplica real nace en 9o/9t).
**Datos:** migración **0137** y semilla **0051_analitica.sql**.
**Servidor:** el barrido llena `metricas_dinero_dia`, `metricas_retencion` y pasa a tabla los derivados que hoy agregan al leer (L942, L1135);
`DATABASE_URL_ANALISIS`; reportes programados por correo (L209); **reporte diario al fundador** (T#31, PLAN §5): negocios nuevos, operaciones, dinero
(conciliación de 9k), errores, vueltas atrás, colas vencidas, lo que los guardianes corrigieron y **lo que necesita de él** (paquetes pendientes), por
correo y push a las 7:30 AM de Hazleton.
**Super Admin:** Analítica › **Dinero** (GMV por tipo, comisión, devoluciones, ticket medio, MRR, conversión a Pro; L209), **Gente** con retención D1/D7/D30 por
cohorte, embudos completos (vecino, negocio paso a paso, prueba Pro → pago, búsqueda → ficha → operación; L212), búsquedas sin resultado de `search_logs`
(L203), contactos desde semillas (L175), vistas sin repetidos (L127), Hogar y Auto (L451); **programar** un reporte; Inicio del Super Admin con «ciudad
viva» (`pantallas-iniciales.md` §2).
**Guardianes:** `analiticaSinPersonas` (también en los reportes por correo), **`derivadoNoEditable`** (los `metricas_*` solo los escribe el barrido),
**`analisisPorReplica`** (las consultas de Analítica usan la conexión de análisis), `reporteDiarioSale` (si no salió a las 8:00, alerta); punta a punta
**`ana9g`** (cada pestaña a 390 y 1360 con la semilla; las cifras de Dinero cuadran con las operaciones sembradas; programar y recibir un reporte en el
simulador de correo; el reporte diario con su lista de «lo que necesita de ti»).
**Ayuda:** `admin-analitica` al día, `reporte-diario` (equipo).

### 9h · Crecimiento (ADM-MKT), la landing de acceso anticipado, los QR de calle y el SEO de la web pública — Sonnet/medium; lista y teléfonos Opus/high
**Necesita:** nada para construir y probar en el sandbox; **sale al público en 9t** (producción, OK-1), porque lo que junta son datos reales (§3.1).
**Datos:** migración **0138** y semilla **0052_crecimiento.sql**.
**Servidor:** `lib/crecimiento/enlaces.ts` (`/q/{código}` → anota el escaneo sin personas → redirige a una ruta propia; PDF del volante y del cartel con el
QR, hueco #9), `lib/crecimiento/campanas.ts` (segmento → plantilla → push / correo / SMS / en la app, con preferencias, `mkt` apagado por defecto, horas de
silencio y tope por semana; aprobación de otra persona si pasa de 1 000), destacados con rotación justa, referidos con el antiabuso de 5d,
`lib/crecimiento/lista.ts` (la landing: código postal → ciudad; teléfono → código de entrada (E) → cuenta; «Tengo un negocio» → Publica tu negocio con
la ciudad en `soon`; insignia **Fundadores** a los primeros 500 vecinos y 100 negocios de cada ciudad, §6 #15). **SEO** (HERRAMIENTAS #24): sitemap de
negocios, categorías, eventos (L749) y ayuda de vecinos (L971), `robots.txt` por entorno (el sandbox no se indexa nunca), Open Graph y schema.org
revisados.
**Pantallas:** **landing** en `/` cuando la plataforma está en acceso anticipado (hueco #1; Coming Soon v3: hero, vitrina que rota, «Aquí cabe cualquier
negocio», Lo que viene, Cómo llega, Para negocios, preguntas, Comparte; móvil primero); «Estás en la lista · #N»; la página de un QR que lleva a
Publica tu negocio con la ciudad puesta; Smart App Banner de iOS en la web cuando haya app pública (L1149).
**Super Admin:** **Crecimiento** (ADM-MKT, hueco #2; sale de «Fase 9» en `admin-nav.ts`): **Semilla** (recomendaciones de vecinos, D2), **Promotores**,
**Campañas**, **Destacados**, **Enlaces y QR** (crear, imprimir PDF, escaneos por día y por enlace, retirar), **Lista de espera** (por ciudad, código postal,
negocios apartados por tipo, fecha de apertura visible u oculta como el prototipo v3); Inicio con la lista de espera.
**Guardianes:** **`enlaceSoloPropio`** (un `short_links.target` nunca es otro origen), `analiticaSinPersonas` (escaneos sin IP), **`campanaConPermiso`**
(nunca a quien apagó `mkt`, nunca en horas de silencio, tope por semana), **`sandboxNoSeIndexa`**, `idioma`; punta a punta **`crec9h`** (landing a 390 y
1360 en ES y EN; anotarse con código postal de cada ciudad y de fuera → «Pide tu ciudad»; «Tengo un negocio» → publica y el panel dice cuándo se verá;
QR → escaneo contado → Publica con la ciudad; campaña a un segmento en el simulador; un vecino con `mkt` apagado no la recibe).
**Ayuda:** `acceso-anticipado` (vecino y negocio), `admin-crecimiento` (equipo).

### 9i · Ciudades: el asistente de apertura, la regla, la lista de espera, el estado `beta` y los barrios de las cinco — **Opus/high** (abrir y cerrar)
**Necesita:** nada para construir; los nombres del **equipo local** de cada ciudad (paso 4) son del fundador (Paquete 9-4).
**Datos:** migración **0139**, barrios en `packages/db/seeds/zonas.sql` (L64), semilla **0053_ciudades.sql**.
**Servidor:** `lib/ciudades/apertura.ts`: los 7 pasos (Ciudad y centro · Radio y barrios · Categorías de arranque · Equipo local · Negocios listos ·
**Comprobar** (regla de apertura, LAUNCH sin pendientes de esa ciudad, guardianes en verde) · Avisar a la lista de espera); cada paso con su evidencia,
solo avanza, motivo y auditoría; `on` / `beta` / `soon` / `off` con `NOTIFY 'ciudades'` (L71); la lista de espera recibe su aviso (push, correo, SMS)
en lotes y sin horas de silencio rotas; **cerrar** una ciudad abierta pide motivo y otra persona.
**Pantallas:** las de la ciudad «próximamente» siguen (son una función); en `beta`, lo mismo que `on` para los invitados y «próximamente» para los demás.
**Super Admin:** **Ciudades** completo (ADM-CIUD): listado con lista de espera, negocios listos por categoría clave, el asistente (hueco #6), barrios,
zona horaria, impuesto, categorías activas, cuenta oficial, equipo local, **«Fecha de apertura»** (oculta por defecto, §6 #14).
**Guardianes:** **`ciudadConAsistente`** (una ciudad solo pasa a `on` por el asistente con todos sus pasos), **`ciudadAlInstante`** (ningún proceso guarda
el estado de la ciudad más de lo que tarda el `NOTIFY`), `revisionVeCiudadAbierta` (9a); punta a punta **`ciu9i`** (abrir Reading en `beta` → el vecino
invitado la ve y otro no → `on` con el asistente → la lista avisada una vez; saltarse un paso → no; cerrar sin segunda persona → no; los barrios de las
cinco en el selector).
**Ayuda:** `ciudades-que-abren` (vecino), `admin-ciudades` (equipo).

### 9j · Super Admin › Sistema completo y la seguridad del equipo: Flags, Salud, Respaldos, Estados, segundo factor obligatorio, llaves que vencen — **Opus/high**
**Necesita:** nada (en el sandbox, Salud y Respaldos leen el sandbox; los respaldos reales de producción nacen en 9o).
**Datos:** migración **0140** y semilla **0054_sistema.sql**.
**Servidor:** **segundo factor del equipo** (T#30, L35, L1319): toda cuenta con rol del Super Admin entra con **llave de acceso** (8d) o **TOTP propio**
(RFC 6238, `node:crypto`, secreto cifrado, 10 códigos de recuperación) además del teléfono; sin él, el Super Admin no abre (también en el sandbox: allí,
TOTP, porque sin dominio no hay llaves); «vidrio roto» de Salud con motivo escrito antes de mostrar (L464); **errores del servidor** con
`instrumentation.ts` (`onRequestError`) → `app_error_groups` kind `servidor`, tapados; simbolizar los cierres nativos con los dSYM y `mapping.txt` que 8h
ya guarda (L1228, L1340); **llaves que vencen** (certificados de las tiendas y del pase, token de GitHub, `RESPALDO_LLAVE`): aviso a los 30 días y
rotación anotada (L1184); `app_min_build_*` nunca por encima del último build disponible (L1349); «Novedades» de Google en cada lanzamiento (L1379).
**Super Admin:** Sistema suma **Flags** (por ciudad y porcentaje, con motivo), **Salud** (servicios, latencia, colas del barrido y del push, disco,
certificados, últimos despliegues y vueltas atrás de `deploy_releases`), **Respaldos** (último completo, WAL, fotos, sobre de llaves, restauraciones de
prueba con su RTO), **Estados** (los 9 estados de pantalla del prototipo) y **Mantenimiento programado** (la página de §1b #8); Equipo exige el segundo
factor y muestra quién lo tiene; código de arranque del primer Admin de un entorno nuevo (L37) con su procedimiento.
**Guardianes:** **`equipoConDosPasos`** (ninguna acción de `/admin` sin segundo factor de esa sesión), **`totpPropio`** (sin dependencia externa; ventana
±1; código usado no vuelve a entrar), `erroresTapados` ampliado al servidor, `llaveConVencimiento`; punta a punta **`sis9j`** (alta de TOTP con el QR,
entrar con código, código repetido → no, recuperación de un uso; sin segundo factor el Super Admin no abre ni por la API; un flag al 10 % en Reading;
un error del servidor con un teléfono en el mensaje → tapado y agrupado; Salud y Respaldos con la semilla).
**Ayuda:** `admin-sistema` (Flags, Salud, Respaldos, Estados), `admin-segundo-factor` (equipo).

### 9k · Dinero real listo: conciliación diaria, pagos al banco, disputas con evidencia, 3-D Secure y la huella de la tarjeta — **Opus/high**
**Necesita:** nada (contra `stripe-mock`, el simulador del sandbox y el contrato; con dinero real, en 9q y 9u).
**Datos:** migración **0141** y semilla **0055_conciliacion.sql**.
**Servidor:** **guardián del dinero** (HERRAMIENTAS #20): conciliación diaria Stripe ↔ libro propio (PaymentIntents, cargos, devoluciones,
transferencias, payouts, disputas; retenciones sueltas `requires_capture` sin fila, L416); pagos al banco fijos los martes (L358, L829); **3-D Secure**
completo con `handleNextAction` en la hoja (L355, L759) y fuera de sesión en las renovaciones de Pro con enlace al dueño (L382); `card.fingerprint`
para el máximo por persona y la señal «misma tarjeta en varias cuentas» (L760, L938); alertas de devolución que Stripe nunca hace y de transferencia
sin saldo con su camino manual (L800, L821, L918); repartir una devolución entre cobros (L448); devolver desde Transacciones planes y rentas (L455);
quitar una tarjeta guardada (L360); reponer un pedido sin costo (L327); contrato de `pasarela.cliente` (L817); rechazo al aprobar un estimado con la
tarjeta 0002 (L414).
**Super Admin:** Transacciones › **Disputas** (cola de 120 h con evidencia: foto de entrega, recibo PDF, conversación; enviar por la API de archivos de
Stripe; alerta 3 días antes, L357, L393), Planes › Ingresos con la conciliación, Inicio con «el dinero no cuadra» si hay diferencias.
**Guardianes:** **`conciliacionDiaria`** (si no corrió o hay diferencias sin dueño → alerta), `dineroDelServidor`, `contratoCubreLaPasarela` ampliado;
punta a punta **`din9k`** (tarjeta con 3-D Secure → se completa en la hoja; renovación con 3DS → enlace al dueño; un día con dos diferencias → alerta y
fila; disputa → evidencia enviada al simulador; misma tarjeta en dos cuentas → señal).
**Ayuda:** `pagos-con-tarjeta` y `panel-cobros` al día (3DS), `admin-disputas` y `admin-conciliacion` (equipo).

### 9l · Avisos, correo y canales listos — **Opus/high** (canales y firmas); plantillas Sonnet/medium
**Necesita:** nada (contra los simuladores y los contratos; de verdad con 9q).
**Datos:** migración **0142**.
**Servidor:** las **plantillas que faltan** (L342: código de entrada editable, pedido tarde, recibo por correo, citas, devolución, evento cancelado, sello
decidido, ciudad abierta, resumen semanal…) y los avisos que las pantallas ya prometen (L347, L104, L223, L269, L304, L306, L969: invitación al equipo
del panel por SMS); SMS con **reintentos** y **estado de entrega** del webhook de Telnyx y de Meta (L336, L345, L1111) y un solo camino para todos los SMS
(L1115); **tope global de remitentes** por minuto (L1120); **plantillas de WhatsApp** para escribir primero, listas para que Meta las apruebe (L1106);
una sola respuesta de STOP (L1104, se cierra en 9q); especificaciones del contrato fijadas a un commit (L1113); **correo**: verificar el correo con
enlace de un uso, recibos por correo del pedido y de Pro (L318, L363, L381 —el impuesto lo dice el contador, 9s—), aviso de respuesta de Soporte por
correo (L980), botones de Wallet en el correo de la compra (L1297); **correo entrante de Soporte** con SES (L977, L1131, §6 #23); Soporte contesta por
WhatsApp dentro de la ventana de 24 h (L1118); `pushsubscriptionchange` en el service worker (L1203).
**Super Admin:** Notificaciones con la entrega del SMS y de WhatsApp, plantillas de WhatsApp con su estado en Meta; Soporte con los casos que entran
por correo.
**Guardianes:** `avisoConPlantilla`, `promesaSms` (sin excepciones al cierre), **`smsConReintento`**, **`correoEntranteFirmado`** (solo lo que SES firma),
`canalConFirma`; punta a punta **`avi9l`** (cada plantilla nueva a un teléfono simulado en ES y EN; SMS que falla → reintento → entregado; 61 remitentes
en un minuto → tope y alerta; correo a Soporte → caso TK- tapado; verificar el correo con el enlace; recibo con los botones de Wallet).
**Ayuda:** `notificaciones`, `soporte` y `mi-cuenta` al día; `admin-notificaciones` al día.

### 9m · Lo diferido del vecino que entra antes de abrir — Sonnet/medium
**Necesita:** nada. **Datos:** migración **0143**.
**Qué:** onboarding del vecino pasos 3–5 y bienvenida de Fundadores (L28); el Inicio y la ficha con su mini mapa propio (L42, L61, L81: «Cómo llegar»
abre el mapa del teléfono, como DoorDash; el mini mapa es el propio); pines por el recuadro visible cuando pasa de 400 (L61); chips largos en
`BusinessCard` en dos líneas (L79, a confirmar con el diseño); la entrada «¿Es tuyo?» en la ficha de una semilla (L172); `AuthSheet` bilingüe con
errores (L240); alergias en la hoja del plato como etiquetas (L246; decisión anotada en REVISION); «Lo que más mencionan» (L280); reportar una novedad y una vacante
desde la página (L299, L309); vacantes en Buscar (L311); alertas de búsqueda en Mi cuenta › Avisos con «Quitar» (L324); **Mensajes en vivo** con SSE
propio (L385, L599); retiros del fabricante por VIN con datos públicos de NHTSA (L524); búsqueda por propiedad y por carro (L559); Mi cuenta › **Pagos
y movimientos** (L773, L936); Mis boletos guarda todos los próximos (L896); tapar números de seguro social y tarjetas en Mensajes como Soporte (L1063);
sesiones con «Este iPhone · To'Latino 1.0 (12)» (L1181); la búsqueda por voz con su aviso en Privacidad y su interruptor (L95); **`Pronto.tsx` borrado**
y ninguna pantalla «En construcción» (L45, L1375).
**Guardianes:** `sinEnConstruccion` (9a), `rutasVivas`, `mensajesEnVivo` (sin preguntar cada 5 s); punta a punta **`vec9m`** (cada pieza a 390 y 1360,
ES y EN; un mensaje llega al otro teléfono en ≤ 1 s).
**Ayuda:** la de cada pieza (`mi-cuenta`, `mensajes`, `buscar`, `mapa`, `pagos-y-movimientos`).

### 9n · Lo diferido del negocio, el Repartidor y la operación del Super Admin — Sonnet/medium; dinero, permisos y Repartidor Opus/high
**Necesita:** nada. **Datos:** migración **0144** y semilla **0056_repartidor.sql**.
**Panel:** feriados, vacaciones, días propios y «Abro por temporada» (L114) y horario por módulo (L117); aceptar una invitación al equipo (L101); repetir
una novedad y avisar a los seguidores (L297), pedidos desde una novedad (L298), elegir fotos de la galería (L301); el negocio «quiere arreglarlo» y
editar la respuesta a una reseña (L287); hora del pedido programado que cruza la medianoche (L248); historial de no-show visible al restaurante (L259);
**Panel › Ajustes › Avisos** (L934, hueco #10); «Si no contestas en 10 min» y «Siempre, al instante» de El Compa (L1048); bandeja de los SMS del
negocio (L1108: se leen y contestan en Mensajes del panel); validar un cupón desde Hoy (L660); avisos del organizador por la auto-moderación (L831); el mercado: «Pedir OK por $X más»,
sustituto por libra, envío con su repartidor y recordatorio a los 10 min (L473–476); garantía a $0 desde la ayuda (L446).
**Repartidor:** **prueba de entrega** con foto privada y código del cliente, **código de recogida** del negocio (L369, hueco #10), **oferta con cuenta
regresiva** a los repartidores del negocio (L370, L1267: «Aceptar» pasa a ser el paso que inicia la ruta); el botón «Llamar al cliente» deja de marcar el
número real (L368, §6 #20); **Super Admin › Repartidores** (ADM-DLV: lista, 360°, incidencias con cola y sanciones, L371).
**Super Admin (operación):** colas con atajos J/K/A/R, lote en escritorio, vencimiento del «tomado», SLA editables y visibilidad por cola en la base
(L145, L147); asignar un caso a una persona concreta (L990) y feriados del equipo (L982); Negocios › Reclamos y Duplicados e «Invitar a reclamar» (L171),
filtros y «Exportar CSV» con auditoría (L149); Usuarios 360° › Actividad, Dinero y Comunidad (L180); apelar una suspensión desde «Entrar» (L623);
Catálogo: mover y fusionar subcategorías, plantillas de horario, activo por ciudad, límites Free/Pro por módulo (L197, L199); **Configuración: lo que
quedó «en solo lectura» pasa a editable** cuando sus textos lean el valor (L453, L469, L489, L497, L539, L555, L691, L696, L939) y el plazo de «Me lo
devolvieron» (L548); condiciones de los rangos editables (L653); cupo de un RSVP (L941); Panel › Eventos con cursor (L952); quién tiene licencia en el
equipo (L158: sin diseño en el panel ni en el admin; pasa a «después de abrir» salvo que el fundador lo pida); acciones del 360° que faltan (L136); «Resolver» con el borrador del copiloto
(L1075).
**Guardianes:** **`entregaConPrueba`** (una entrega con prueba exige foto o código válido), **`sinTelefonoAlRepartidor`** (el repartidor nunca recibe el
número del cliente), `configDesdeUnLugar` (ningún plazo en el código), `colaConVista`; punta a punta **`neg9n`** (cada pieza a 390 y 1360; entrega con
foto y código; oferta que vence; ADM-DLV con una incidencia; editar un plazo antes en solo lectura y verlo en su texto).
**Ayuda:** `panel-horario`, `panel-avisos`, `repartidor-prueba-de-entrega`, `admin-repartidores`, `admin-colas` al día.

### 9o · Producción como código y ensayada: `infra/produccion/`, sobre sellado, respaldos con restauración probada, vuelta atrás, monitoreo y manual de incidentes — **Opus/high**
**Necesita:** nada para construir y **ensayar** (el ensayo es en máquinas desechables del proyecto de pruebas, por horas, §6 #2); el proveedor y la
cuenta de producción son del Paquete 9-3 y se usan en 9t.
**Datos:** migración **0145** (`deploy_releases`, `incident_log`).
**Infra:** §3.2–§3.5 completos: `infra/comun/`, `infra/produccion/` (cloud-init, compose de tres máquinas, nginx con el dominio y la página de
mantenimiento, `deploy.sh` del entorno, azul/verde con la puerta de salud), `infra/pruebas/` adaptado al paquete común sin cambiar su comportamiento;
**sobre sellado** (`age`) en los dos entornos; pgBackRest + almacén de objetos + sincronización de Garage + sobre de recuperación; restauración de prueba
semanal; Uptime Kuma + Prometheus + el segundo testigo de GitHub Actions; `scripts/produccion/` (crear y reconstruir máquinas por la API del proveedor,
reglas de Cloudflare, firewall con los rangos de Cloudflare); **Cloudflare por la API** (también lo que espera 8-0 para el sandbox); la llave del QR y
`DATOS_SECRET` nacen en el servidor y viajan solo en el sobre de recuperación (L458, L775); Garage borra de verdad en el servidor real (L468);
límite por IP en Cloudflare para la traducción sin cuenta (L683); pausa del lanzamiento por fases desde la vuelta atrás (L1237, con 9u).
**Ensayo completo («producción de mentira»):** se crea un entorno `ensayo` idéntico a producción (tres máquinas pequeñas, por horas) con un subdominio
de prueba (o la IP si 8-0 no está) y **sin datos reales**; se despliega desde una rama `ensayo` como sería `produccion`; se corren **los simulacros** del
manual (§3.4) y se miden RPO, RTO, tiempo de vuelta atrás y de reconstrucción; se destruye todo; las cifras van a PROGRESS y a
`docs/incidentes/simulacros.md`.
**Super Admin:** Sistema › Salud y Respaldos leen lo real (9j); Sistema › **Despliegues** (cada versión, su salud, vueltas atrás, el OK que la dejó pasar).
**Guardianes:** **`mismoPaquete`**, **`produccionSoloAvanza`**, **`migracionReversible`**, **`selladoSoloSuServidor`**, **`secretoConDueño`**,
**`respaldoRestaurado`**, `semilla` ampliado a `infra/produccion` (ni un archivo de `infra/pruebas/semilla` alcanzable desde producción), `modoPruebas`
ampliado (ni `TOLATINO_SMS_MODO=pruebas` ni simuladores en el compose de producción); punta a punta **`prod9o`** (en el ensayo: desplegar → salud →
desplegar una versión que rompe `/api/salud` → vuelta atrás sola en ≤ 10 min y anotada; migración expandir→contraer; borrar un dato → PITR a otra base y
recuperarlo; perder la máquina de la app → reconstruir con cloud-init + sobre en ≤ 1 h; restauración semanal con su consulta de control; sobre
sellado para otro servidor → no abre).
**Ayuda:** `admin-despliegues-y-respaldos` (equipo) y el manual `docs/incidentes/` (no es ayuda de El Compa: es interno).

### Grupo B · espera un paquete del fundador (lo construible ya quedó hecho en el grupo A)

### 9p · Lo que espera el dominio (Paquete 8-0): 8b enlaces universales y lo de la Fase 8 que necesita HTTPS — **Opus/high**
**Necesita:** **Paquete 8-0** (Cloudflare y los servidores de nombres de `tolatino.com`; el token de la API por el formulario seguro).
**Datos:** la siguiente migración libre = la de 8b (`apps_enlaces`, fase8 §2).
**Qué:** `pruebas.tolatino.com` con HTTPS completo detrás de Cloudflare (por la API, con lo de 9o; L1153, L1327); **8b completo tal como lo describe
`fase8-apps.md` §3.2 y §4 8b** (AASA, assetlinks, `matcher`, regla de Cloudflare, `hrefDeAviso`, volver de Stripe, «Abrir en la web» sin volver a la misma
app L1182; la huella de la firma de Google a assetlinks y a `PASSKEY_ORIGENES` L1342); **TLLlave encendido** en las cuatro apps (L1313) y las llaves de
acceso en el sandbox (L26, L1310); **Web Push en el iPhone del fundador** (L1191); el pase de Apple Wallet desde el sandbox (L1276); el Repartidor web con
ubicación (L1252); `nat8a` completo en emulador y simulador (L1173); App-Bound Domains después de probar la hoja de Stripe (L1176); la llave de subida de
Android creada por el primer job por OIDC (L1334); capturas con el dominio y teselas (L1263, L1357); Face ID en las fichas (L1374); Analítica › Apps
con los enlaces (L1383).
**Guardianes:** los de 8b (`aasaYAssetlinks`, `enlaceUnUsoSinGet`, `enlacesPorApp`), contra lo servido por HTTPS; punta a punta **`enl8b`** (fase8 §4 8b) +
`llave8d` y `push8c` otra vez con el dominio.
**Ayuda:** la de 8b (`apps-de-to-latino`, `panel-cobros` al día).

### 9q · Proveedores reales en el sandbox (Paquete 9-1): Stripe en modo prueba y Connect, Telnyx con 10DLC, WhatsApp, SES y Anthropic — **Opus/high**
**Necesita:** **Paquete 9-1** (cuentas y llaves por el formulario seguro).
**Qué:** las llaves llegan al sandbox por el **sobre sellado** (9o); **Stripe en modo prueba** con Connect Express de verdad (onboarding, webhook,
disputas, payouts en prueba; L351, L829), `stripe-mock` sigue en el CI; **Telnyx**: número, 10DLC (marca + campañas: códigos, avisos, respuestas de El
Compa con STOP/HELP), SMS de verdad para códigos, reclamos, avisos y respaldo del push (L23, L151, L166, L336, L440, L537, L791, L881, L921, L1201),
una sola confirmación de STOP (L1104); **Meta WhatsApp** (cuenta verificada, número, plantillas de 9l enviadas a aprobación; L1097); **SES** fuera del
«sandbox» de SES, dominio con DKIM/SPF/DMARC en Cloudflare por la API (L388); **Anthropic**: primera llamada real, formato de la respuesta, batería ≥ 150
preguntas ES/EN ≥ 95 % (también las del panel, las respuestas automáticas y el copiloto), presupuesto de velocidad (L994, L998, L1000, L1038, L1056,
L1071, L1133), pedido de **retención cero** (L997, el fundador lo pide; si no la dan, Privacidad lo dice); los hosts de salida del sandbox (L1101).
**Guardianes:** los contratos de siempre **y** una corrida contra el proveedor real en modo prueba (`contratoReal`, solo en el sandbox, a pedido); punta a
punta **`prov9q`** (un pedido con tarjeta de prueba de Stripe real y Connect; un código por SMS al teléfono del fundador; un WhatsApp; un correo a un
buzón de prueba con DKIM válido; El Compa contesta con el modelo real).
**Ayuda:** ninguna nueva; las de Pagos, Avisos y El Compa al día si algo cambia.

### 9r · Las tiendas de verdad (Paquetes 8-1, 8-2, 8-3): TestFlight y Play interno reales, fichas, declaraciones, Wallet — **Opus/high**
**Necesita:** **Paquetes 8-1, 8-2 y 8-3** (fase8 §10) y 8-0 (9p).
**Qué:** el **primer TestFlight real** en el iPhone del fundador y el primer build en Play interno (L1218, L1337); APNs y FCM de verdad (L1193) con
Firebase en la cáscara (L1196, L1344) y `aps-environment` de producción (L1199); retroalimentación de TestFlight a Soporte (L1221); lista de Play interno
(L1223, decisión con el fundador); APK propio firmado de verdad (L1225); lo nativo en teléfonos reales: agitar, cierres, la ruta del Repartidor con la
pantalla apagada, el aviso fijo, la linterna, fijar la Puerta, el boleto sin señal (L893, L1230, L1249, L1254, L1256, L1258); **fichas y capturas subidas
como borrador** (L1355); declaraciones de privacidad de cada tienda (L1233, L1269, L1366; Data safety por la API con el OK del fundador, L1363); certificado
del Pass Type ID y cuenta de emisor de Google Wallet (L1280, L1283, L1289), arte oficial de los botones (L1292), Wallet dentro de la app iOS (L1299); el
entorno `tiendas` de GitHub con sus reglas (L1346); tamaño real de los builds frente al tope de Cloudflare (L1348).
**Guardianes:** los de 8h e 8i contra lo real (`tiendaSoloProduccion` sigue cerrando la revisión pública hasta 9u); punta a punta **`tien9r`** (= `tien8h`
y `fich8i` contra las API reales en modo interno: build → TestFlight → el iPhone del fundador lo abre; fichas como borrador; nada a revisión).
**Ayuda:** `apps-de-to-latino` al día (cómo instalar desde TestFlight y Play interno), `boletos-en-wallet` al día.

### 9s · Lo que dicen el abogado y el contador (Paquete 9-2) — **Opus/high**
**Necesita:** **Paquete 9-2** (contratar abogado de Pennsylvania y contador; su costo **no está en PLAN §8**: decisión del fundador, §6 #13).
**Qué:** Claude arma **`docs/legal/para-el-abogado.md`** y **`docs/legal/para-el-contador.md`** (cada pregunta con su línea de LAUNCH, lo que hace hoy el
código y el default que se construyó) y aplica las respuestas: los textos de 9e pasan de BORRADOR a `revisado` con `reviewed_by_counsel`; las reglas que
cambian van al código con su prueba. **Abogado (38 líneas del Anexo A, grupo 9s):** Términos y Privacidad; Sección 230, Términos de la Comunidad,
DMCA §512 con **agente designado** en la Copyright Office (tiene costo), NCMEC, acoso y difamación (L571, L609, L625); COPPA y 18+ (L607); HIPAA y «business
associate» (L461), términos de salud (L466, con alguien de salud); honorarios de Profesionales, IOLTA, CROA (L460); ley HIC de PA (L405); layaway por
estado (L478); PLCB y vida nocturna (L486); ChildLine y protocolo de Cuidado de niños (L493, L499); funerarias, EOIR, 501(c)(3) (L502); vivienda justa,
depósitos y licencias de Bienes Raíces, Regulation Z, HOPA (L505, L508, L510, L512, L533, L564); dealers, Buyers Guide, cargo del dealer, prueba de manejo
(L515, L519, L521, L526, L540); reventa de boletos y política de devoluciones (L777, L812, L832); monedas y cupones (L662); licencias de LibreTranslate,
Argos y NudeNet (L612, L678); IA en Términos y Privacidad (L1006, L1067, L1082); TCPA, 10DLC y WhatsApp (L1122). **Contador:** impuesto de PA en
Auto y Hogar (L402, L418), comida preparada y local (L915), impuesto de Pro y recibos (L381), impuesto de diversiones por ciudad (L777, con el abogado).
**Guardianes:** `legalRevisado` (9e) en verde en producción; punta a punta **`leg9s`** (`leg9e` con las páginas ya revisadas; cada regla cambiada con su
prueba).
**Ayuda:** las que toque cada cambio; `terminos-y-privacidad` final.

### Grupo C · producción, con el OK explícito del fundador

### 9t · Producción encendida en acceso anticipado (Paquete 9-3 + **OK-1**) — **Opus/high**
**Necesita:** **Paquete 9-3** (proveedor de producción y almacén de respaldos), **8-0** (dominio), **9-1** (al menos Telnyx para el código de entrada y
SES para el correo; Stripe en vivo si se quiere Connect en el acceso anticipado) y el **OK-1** escrito del fundador.
**Qué:** se crea producción con `scripts/produccion/` (§3.2) en el proveedor elegido ese día por precio real (C2); `tolatino.com` en Cloudflare;
**rama `produccion`** nace de `pruebas` y se despliega el mismo paquete (sin semilla; teselas, calles TIGER L273, barrios y catálogo); secretos que
nacen allá + sobres sellados de terceros; **primer Admin** con su código de arranque nuevo y su segundo factor (L37); **modo acceso anticipado** (§3.1:
landing, lista, Publica tu negocio y panel; lo demás apagado); el reporte diario empieza; **los simulacros del manual se repiten en producción** antes de
abrir; Vercel y los proyectos viejos de Supabase se borran el día que `tolatino.com` apunta aquí (L7, L12, decisión D); el servidor de Hetzner de
producción solo con este OK (L14).
**Guardianes:** **todos** en el CI de `produccion` y como paso del despliegue; `semilla`, `modoPruebas`, `mismoPaquete`, `legalRevisado` (las páginas que
se publiquen); punta a punta **`aa9t`** contra producción **sin escribir datos** (solo lectura: salud, landing, páginas legales, cabeceras, AASA si 9p)
y una cuenta de prueba de producción que el equipo crea y borra (anotada).
**Ayuda:** `acceso-anticipado` publicada; la Ayuda completa indexada en producción.

### 9u · Beta cerrada en Hazleton y las apps a revisión pública (**OK-2**) — **Opus/high**
**Necesita:** 9t, 9r (cuentas y llaves de las tiendas) y el **OK-2** del fundador (enviar a revisión y empezar la beta).
**Qué:** Hazleton a **`beta`** (§3.1): vecinos y negocios invitados (el fundador elige quiénes, Paquete 9-4); TestFlight externo y Play prueba cerrada
contra producción (fase8 §6 #9, L1148); build y sabor de **producción** con su AASA y assetlinks de `tolatino.com`, llave de APNs y Firebase de
producción aparte de los del sandbox (L1145); **cuentas de revisión de producción** creadas a mano por el admin con el OK (número reservado, negocio de
revisión oculto, portero invitado desde ese negocio, evento de revisión; L1146, L1369, L1372); `app.tiendas.publico` encendido con el OK (L1351);
releer el día del envío las reglas de compras externas en EE. UU. y el SDK mínimo (L1150, L1377), los tamaños de captura (L1362) y la clasificación de
Apple (L1367); purga de 30 días corriendo y ninguna pantalla «En construcción» (L1147); **enviar a revisión las cuatro**; lanzamiento por fases
preparado (no se publica hasta OK-3, §6 #19).
**Guardianes:** `tiendaSoloProduccion` (ahora abre con `founder_ok_ref`), `revisionAcotada`, `revisionVeCiudadAbierta`; punta a punta **`rev9u`** (cada
cuenta de revisión entra en producción a Hazleton `beta`, no paga, no ve a nadie; un invitado de la beta pide y paga con tarjeta real; un no invitado ve
«próximamente»).
**Ayuda:** `beta-hazleton` (vecino y negocio invitados).

### 9v · Apertura en las cinco ciudades y la guardia de 72 horas (**OK-3**) — **Opus/high**
**Necesita:** todo lo anterior, la **revisión por lista** del fundador terminada (`docs/REVISION.md`, AA), las cuatro apps aprobadas y el **OK-3**.
**Qué:** el CI de `produccion` con `TOLATINO_FASE=9`: **`launchConDestino` sin una sola línea pendiente**, `sinEnConstruccion`, `legalRevisado` y todos los
guardianes en verde; asistente de apertura (9i) en las cinco ciudades a la vez (A, X); lista de espera avisada; **El Compa encendido**
(`TOLATINO_COMPA=encendido`, L1002) con **WhatsApp encendido y el SMS de El Compa en pausa** (fase7 §6 #14, L1102); pagos a clientes, Comunidad,
Eventos y campañas encendidos por interruptor (no se despliega nada nuevo ese día, §1c); apps publicadas por fases; **guardia de 72 h**: reporte cada 4 h
al fundador, umbrales de vuelta atrás más estrictos, nadie despliega nada que no sea un arreglo; las revisiones que necesitan datos reales (umbral de
plantones L543 y las que 9a marque así) quedan programadas en `docs/DESPUES-DE-ABRIR.md` con su fecha.
**Guardianes:** todos; punta a punta **`abre9v`** de solo lectura contra producción en las cinco ciudades (Inicio, categoría, ficha, Eventos, Comunidad
visibles; ninguna «próximamente»).
**Ayuda:** El Compa lee la ayuda de producción; `bienvenida` (vecino) y `primeros-pasos-del-negocio` al día.

---
## 5. Notas de interfaz (lo específico)
- **Landing (hueco #1):** móvil primero, fondo claro como la v2/v3, una sola acción arriba (código postal + teléfono) y la barra fija abajo en el móvil
  cuando el formulario no se ve; sin cuenta regresiva ni fecha por defecto (v3). En escritorio, 100 % escritorio (columna de la vitrina a la derecha).
- **Aceptar términos nuevos (hueco #5):** hoja, nunca pantalla completa; «Lo que cambió» en tres líneas como máximo, «Leer completo», «Acepto»; no
  aparece encima de una operación en curso: espera a la próxima pantalla de inicio.
- **Descargar mis datos (hueco #4):** `rows` con el estado («Armando tu archivo · unos minutos», «Listo · vence en 23 h», «Vencido»), un botón, la línea de
  §1c; el correo avisa cuando está listo.
- **Super Admin › Sistema** suma pestañas **Flags, Salud, Respaldos, Estados, Despliegues** a `Pestanas.tsx`; Salud con `kpis` + filas por servicio;
  Respaldos con la última restauración de prueba arriba (lo que importa es que restaura).
- **Super Admin › Crecimiento** y **Ciudades** como el prototipo (`secMkt`, `secCiud`); el asistente con un paso por pantalla en el móvil y la lista de los
  7 en escritorio.
- **Segundo factor (hueco #7):** el QR del TOTP una sola vez; los 10 códigos de recuperación se muestran una vez con «Ya los guardé»; nunca se vuelven a
  mostrar.
- **Mantenimiento (hueco #8):** la sirve nginx (la app puede estar caída); logo, la frase de §1c y la hora estimada; ES/EN por el idioma del navegador.
- **Estados (9) por pantalla:** landing sin señal, lista ya anotada, código vencido, ciudad de fuera; exportación armando / lista / vencida / fallida;
  términos por aceptar; ciudad `soon` / `beta` (invitado y no invitado) / `on`; flag apagado / por porcentaje; respaldo atrasado; restauración fallida;
  despliegue en vuelta atrás; mantenimiento; segundo factor no dado de alta.
- Todo texto en el CMS ES/EN (9f); sin emoji; horas en la zona de la ciudad.

---

## 6. Preguntas abiertas (default más seguro y reversible; anotar en `docs/REVISION.md` como «decidí X; si prefieres Y, se cambia»)
1. **Producción en dos tiempos.** La landing junta datos reales y no puede vivir en el sandbox (M, I). Default: **producción en acceso anticipado
   (OK-1) → beta cerrada en Hazleton con las cuentas de revisión (OK-2) → apertura de las cinco el mismo día (OK-3)**. Alternativa: la landing en una
   máquina mínima aparte (otro servidor, otro costo) y producción entera solo el día de la apertura.
2. **Proveedor de producción** (C2). Default: **el más barato ese día entre Hetzner Ashburn, DigitalOcean NY y Vultr NJ por la misma capacidad; empate
   = Hetzner** (misma API y cloud-init que el sandbox). El ensayo de 9o usa máquinas por horas del proyecto de pruebas (centavos).
3. **Máquinas.** Default: **tres** (app; base con disco propio; réplica de lectura que también vigila y hace la restauración de prueba). Alternativa
   más barata: dos (sin réplica: análisis y vigilancia en la app) — contradice T#33 y PLAN §3.2.
4. **Dónde van los respaldos.** Default: **almacén de objetos del mismo proveedor en otra región** (unos dólares al mes; entra en «servidores» de §8).
   Alternativa: otro proveedor (más resistente a perder la cuenta entera; otro contrato).
5. **Secretos de terceros.** Default: **sobre sellado con `age` para la llave pública de cada servidor, en el repo** (§3.3). Alternativa: endpoint con
   OIDC de GitHub si el fundador no quiere ni texto cifrado en un repo público.
6. **Llave de recuperación** (abre el sobre de recuperación de un servidor perdido). Default: **solo en los secretos del entorno de Claude Code de
   producción** (formulario seguro). Alternativa: una segunda copia en el gestor de contraseñas del fundador (paso en el teléfono, sin copiar ni pegar:
   «Guardar» desde la pantalla de Respaldos, una vez).
7. **Monitoreo.** Default: **Uptime Kuma + Prometheus propios y Sistema › Salud como tablero; segundo testigo con GitHub Actions**. Grafana y Loki no
   entran hasta que el volumen lo pida (HERRAMIENTAS #4–#5 los nombran; se anota).
8. **Segundo factor del equipo** (T#30). Default: **obligatorio en los dos entornos; llave de acceso o TOTP propio; el SMS solo no alcanza**. En el
   sandbox sin dominio, TOTP.
9. **Exportar mis datos.** Default: **ZIP con JSON y CSV + LEEME, en segundo plano, enlace de un uso de 24 h, una cada 7 días**; el negocio exporta solo lo
   que su panel ya muestra.
10. **Borrado a los 30 días** (D5). Default: **borrar lo de la persona; seudonimizar operaciones, cobros y auditoría («Cuenta borrada»); sus negocios
    sin otro dueño quedan «sin reclamar»** (L188); Stripe guarda lo suyo.
11. **Legales por estado.** Default: **general de EE. UU. + adenda de PA; borradores de Claude marcados; en producción nada se publica sin el abogado**
    (guardián). NJ y NY cuando haya ciudad allá.
12. **Cookies.** Default: **solo propias y necesarias, sin banner**; la página lo explica. A confirmar con el abogado por las leyes estatales del día.
13. **Abogado y contador.** Su costo **no está en PLAN §8** (ni el agente DMCA de la Copyright Office). Default: **un abogado de PA para todo el paquete
    (una consulta con la lista generada) y un contador para los impuestos**; sin ellos la apertura no pasa (`legalRevisado`). Decisión del fundador:
    contratarlos y con qué presupuesto.
14. **Landing.** Default: **Coming Soon v3** (memoria L2211: sin ciudad ni fecha, código postal + teléfono, «Tengo un negocio»), compuesta con el sistema;
    **el teléfono se verifica con el código de entrada** (la persona queda con cuenta, E); fecha de apertura **oculta** por defecto.
15. **Fundadores.** Default: **solo insignia** (`pantallas-iniciales.md`: sin Pro extendido) para los **primeros 500 vecinos y 100 negocios de cada
    ciudad** (memoria v3: «los primeros 100 de cada zona»); el código `HZL30` (60 días de prueba Pro) sigue como está.
16. **Enlaces y QR de calle.** Default: **`tolatino.com/q/{código}` propio** (no `tolatino.app` como dice el modelo), escaneos sin IP ni dispositivo,
    PDF de volante y cartel para imprimir; la imprenta la paga y la elige el fundador.
17. **Regla de apertura por ciudad vs. «todo junto» (A).** El prototipo pide «300 en lista o 30 negocios listos» por ciudad; A abre las cinco el mismo
    día. Default: **el asistente comprueba la regla en cada ciudad (30 negocios listos y al menos uno en comida, belleza, hogar, fiestas e iglesias) y
    las cinco abren juntas**; si una no llega, el fundador decide: abrir igual o esperar a que llegue (se dice el choque con A).
18. **Beta cerrada en Hazleton.** Default: **dos semanas, unos 50 vecinos y 20 negocios invitados por el fundador, sobre producción en `beta`**, pagos reales
    pequeños; TestFlight externo y Play prueba cerrada.
19. **Revisión pública y lanzamiento.** Default: **las cuatro apps a revisión juntas; publicación por fases** (Apple: 7 días; Google: 10 % → 50 % →
    100 %) el día de OK-3; Puerta y Repartidor públicas (fase8 §6 #22).
20. **Llamar al cliente desde el Repartidor** (L368; hoy marca el número real). Default: **sin llamada directa ni enmascarada (no hay servicio de voz,
    R1): mensaje en la app y «Llamar al negocio»**. Llamada enmascarada por Telnyx Voice = servicio pagado nuevo, decisión del fundador.
21. **Prueba de entrega y ofertas.** Default: **foto + código del cliente y código de recogida, sí; oferta con cuenta regresiva a los repartidores del
    negocio, sí; lotes, después de abrir.**
22. **Mensajes en vivo.** Default: **SSE propio con `LISTEN/NOTIFY`** (como la Puerta y la ruta), sin servicio nuevo.
23. **Correo entrante de Soporte.** Default: **SES (recepción) del mismo proveedor que ya se paga**, firmado y tapado.
24. **Tapar en Mensajes** (L1063). Default: **sí**, como Soporte: número de seguro social y de tarjeta se tapan antes de llegar al negocio.
25. **Búsqueda por voz** (L95). Default: **se queda**, con el aviso en Privacidad («el audio lo procesa el sistema de tu teléfono o tu navegador») y un
    interruptor para apagarla.
26. **Las pruebas en el repo.** Default: **`pruebas/` en la raíz** (e2e, al revés, visual, servir); las de depuración no se suben.
27. **Matriz de 9 dispositivos y visuales en cada push.** Default: **sí, en grupos paralelos** (minutos gratis en repo público); las capturas aprobadas
    viven en el repo.
28. **Base de carga.** Default: **máquina desechable por horas en el proyecto de pruebas** cuando se mide (centavos); nunca en el sandbox vivo.
29. **Data safety por la API** (8i, L1363). Default: **la sube Claude con el OK del fundador** desde Declaraciones; alternativa: el CSV a mano.
30. **Reporte diario al fundador** (T#31). Default: **correo + push a las 7:30 AM**; por WhatsApp cuando Meta apruebe la plantilla.
31. **Vercel y Supabase de la v1** (L7, L12). Default: **se borran el día que `tolatino.com` apunta a producción** (dos toques en el Paquete 9-3).
32. **Stripe en el acceso anticipado.** Default: **el negocio puede conectar Connect en vivo (sin cobrar nada) si 9-1 está; si no, al abrir.**
33. **El Compa en la apertura** (fase7 §6 #14, L1102). Default: **encendido con WhatsApp; SMS de El Compa en pausa**.
34. **Lo que pasa a «después de abrir».** Default: la lista de §3.9 y lo que 9a cierre por decisión, en `docs/DESPUES-DE-ABRIR.md`, cada una con su
    motivo; cambiar cualquiera es decisión del fundador.

## 7. Orden, dependencias y pruebas
**Grupo A (ya, sin esperar a nadie): 9a → 9b → 9c → 9d → 9e → 9f → 9g → 9h → 9i → 9j → 9k → 9l → 9m → 9n → 9o.** 9a va primero (las pruebas al repo y la
LAUNCH con destino ordenan el resto); 9b segundo (con la matriz en CI, todo lo que sigue se prueba en 9 dispositivos); 9d antes de 9e (Privacidad sale
del mapa de datos); 9e antes de 9f (Páginas vive en el CMS); 9i antes de 9u; 9j antes de 9o (Salud y Respaldos leen lo que 9o produce); **9o al final del
grupo A** con el ensayo completo. 9c, 9g, 9k, 9l, 9m y 9n pueden ir en cualquier orden entre sí.
**Grupo B (cuando llega su paquete; cada uno se conecta en cuanto llega, sin parar el grupo A):** 8-0 → **9p**; 9-1 → **9q**; 8-1/8-2/8-3 → **9r** (necesita
9p); 9-2 → **9s**. **Los paquetes se piden al empezar 9a** (tardan días o semanas: D-U-N-S, verificación de Apple y Google, 10DLC, Meta, el abogado).
**Grupo C (con su OK):** **9t** (8-0, 9-1, 9-3, OK-1) → **9u** (9r, 9i, OK-2) → **9v** (todo, revisión por lista, OK-3).
**Cada bloque:** migración aplicada dos veces + semilla `is_test` + punta a punta en la matriz de 9 dispositivos (desde 9b; antes, 390 y 1360) con
`orden9a`, `tub9b`, `a11y9c`, `datos9d`, `leg9e`, `cms9f`, `ana9g`, `crec9h`, `ciu9i`, `sis9j`, `din9k`, `avi9l`, `vec9m`, `neg9n`, `prod9o`, `enl8b`
(9p), `prov9q`, `tien9r`, `leg9s`, `aa9t`, `rev9u`, `abre9v` + guardianes al revés (`alreves9a` … `alreves9o`, y los de B y C donde haya guardián nuevo) +
**toda la regresión** (`pruebas/correr.mjs --todas`) antes de cerrar cada bloque.
**Reloj movido:** purga a los 30 días; exportación que vence a las 24 h; retenciones (13 meses, 90 días, 400 días); restauración que no corrió en 8 días;
llave que vence en 30 días; código TOTP de la ventana anterior y la siguiente; ciudad que abre a una hora; reporte diario que no salió a las 8:00.
**Abuso (cada uno al revés):** pedir la exportación de otra cuenta; bajar el archivo dos veces o desde una vista previa; aceptar términos por otra cuenta;
`short_links.target` a otro origen; campaña a quien apagó `mkt`; abrir una ciudad sin el asistente o cerrarla sin segunda persona; entrar al Super Admin
sin segundo factor (por pantalla y por acción); código TOTP repetido; sobre sellado para otro servidor; desplegar en `produccion` un commit que no pasó por
`pruebas`; migración que borra lo que el código anterior lee; semilla alcanzable desde producción; página legal publicada sin revisión en producción;
fusionar cuentas con una sola persona; el repartidor pidiendo el teléfono del cliente; un enlace de un uso abierto por WhatsApp.
**Velocidad (presupuesto, guardián Velocidad):** landing ≤ 1 s al primer pintado en un teléfono de gama media con 4G simulado; `/q/{código}` ≤ 50 ms;
anotarse ≤ 300 ms sin contar el SMS; armar una exportación de una cuenta con 1 000 operaciones ≤ 60 s en el barrido; purga de 10 000 cuentas en ≤ 1 h
sin frenar la base (lotes); Analítica › Dinero ≤ 300 ms leyendo derivados; Salud ≤ 200 ms; vuelta atrás ≤ 10 min desde el despliegue malo; restauración
completa (RTO) ≤ 1 h; pérdida máxima (RPO) ≤ 5 min. Todo en la base de carga de 9b y en el ensayo de 9o; cifras en PROGRESS.
**Revisión de seguridad** (regla 5): 9b (Semgrep, dependencias), 9d, 9e, 9h (lista y teléfonos), 9i, 9j, 9k, 9l, 9n (Repartidor), **9o** y todo el grupo C.
**Capturas** teléfono + escritorio de cada pantalla compuesta (§1b) con su línea en `docs/REVISION.md`.

## 8. Lista de cierre de la fase (todo marcado antes de decir «Fase 9 completa» y antes de pedir el OK-3)
_Cada marca dice con qué se comprobó; lo que no se pudo comprobar queda sin marcar con el motivo._
- [ ] Las pruebas de punta a punta y al revés viven en `pruebas/`; `pruebas/correr.mjs --todas` en verde; ninguna prueba vieja falla por un texto viejo.
- [ ] CI con la matriz de 9 dispositivos, visuales, axe, Semgrep y dependencias, velocidad; cifras de la base de carga 1M en PROGRESS.
- [ ] `botonAccesible` en cero; axe sin violaciones serias; las rutas principales con teclado solo.
- [ ] Exportar mis datos (vecino y negocio); borrado definitivo a los 30 días comprobado tabla por tabla; retenciones corriendo; fusionar con dos personas.
- [ ] Páginas legales por estado (PA) con versión y aceptación; **revisadas por el abogado**; impuestos confirmados por el contador.
- [ ] Super Admin completo: Analítica (Dinero, retención, reportes), CMS (cadenas, rótulos, páginas, Home por ciudad, anuncios, inglés), Crecimiento,
      Ciudades (asistente, `beta`), Sistema (Flags, Salud, Respaldos, Estados, Despliegues, segundo factor obligatorio).
- [ ] Landing de acceso anticipado y QR de calle en `tolatino.com`, con negocios reales armando su página.
- [ ] Dinero: conciliación diaria en cero diferencias sin dueño; 3-D Secure; disputas con evidencia; pagos al banco los martes.
- [ ] Avisos, correo y canales de verdad (SMS con 10DLC, WhatsApp con plantillas, SES con DKIM, push APNs/FCM/Web Push).
- [ ] 8b y todo lo que esperaba el dominio; las cuatro apps en TestFlight y Play internos de verdad; fichas y declaraciones subidas.
- [ ] Producción como código: mismo paquete, sin semilla, secretos sellados, **restauración probada** (RPO/RTO medidos), vuelta atrás sola probada,
      monitoreo con dos testigos, manual de incidentes con sus simulacros hechos en el ensayo **y** en producción.
- [ ] Beta cerrada de Hazleton terminada; las cuatro apps aprobadas por Apple y Google.
- [ ] **`docs/LAUNCH-CHECKLIST.md` sin una sola línea pendiente** (`launchConDestino` con `TOLATINO_FASE=9`); `docs/DESPUES-DE-ABRIR.md` con cada decisión.
- [ ] Revisión por lista del fundador terminada (`docs/REVISION.md`); preguntas #1–#34 contestadas o aceptadas con su default.
- [ ] `docs/ayuda/` de cada bloque (ES/EN) publicada en producción; PROGRESS al día; **OK-3** escrito del fundador.
- [ ] Las cinco ciudades `on`; guardia de 72 h sin vuelta atrás abierta; reporte diario saliendo.

## 9. Decisiones del fundador pendientes (resumen para `docs/REVISION.md`; se construye con el default, regla AB)
| # | Qué decidir | Default que se construye (reversible) |
|---|---|---|
| 1 | Cómo se enciende producción | Dos tiempos: acceso anticipado (OK-1) → beta en Hazleton (OK-2) → apertura de las cinco (OK-3) |
| 2 | Proveedor | El más barato ese día por la misma capacidad; empate = Hetzner Ashburn |
| 3 | Máquinas | Tres: app, base, réplica (que vigila y restaura) |
| 4 | Respaldos | pgBackRest a un almacén del mismo proveedor en otra región; restauración probada cada semana |
| 5 | Llaves de terceros al servidor | Sobre sellado (`age`) para cada servidor, en el repo |
| 6 | Llave de recuperación | Solo en los secretos del entorno de producción |
| 8 | Segundo factor del equipo | Obligatorio; llave de acceso o TOTP propio |
| 10 | Borrado a 30 días | Borrar lo personal; seudonimizar dinero y auditoría; negocios sin dueño quedan «sin reclamar» |
| 11 | Legales | EE. UU. + adenda de PA; nada final sin el abogado |
| 13 | Abogado y contador | Contratarlos (costo fuera de §8: decisión del fundador) |
| 14 | Landing | Coming Soon v3; teléfono con código; fecha oculta |
| 15 | Fundadores | Solo insignia: 500 vecinos y 100 negocios por ciudad |
| 17 | Regla de apertura vs. «todo junto» | Se comprueba por ciudad; abren juntas; si una no llega, decide el fundador |
| 18 | Beta cerrada | 2 semanas en Hazleton, ~50 vecinos y ~20 negocios invitados |
| 19 | Lanzamiento en las tiendas | Las cuatro juntas, por fases |
| 20 | Llamar al cliente desde el Repartidor | Sin llamada; mensaje en la app y «Llamar al negocio» |
| 25 | Búsqueda por voz | Se queda con aviso en Privacidad e interruptor |
| 29 | Data safety por la API | La sube Claude con tu OK |
| 31 | Vercel y Supabase v1 | Se borran el día que `tolatino.com` apunta a producción |
| 34 | Lo que va «después de abrir» | La lista de §3.9 + lo que cierre 9a, en `docs/DESPUES-DE-ABRIR.md` |

## 10. Paquetes de pasos del fundador (en el teléfono; cada uno llega cuando toca, con su enlace y su estado en Sistema › Apps › «Lo que te toca», que 9j amplía a todos los paquetes)
_Nada se pide en el chat; ningún secreto se escribe en el chat: las llaves se guardan en el **formulario seguro** de los secretos del entorno y Claude
las sella para cada servidor (§3.3). Lo que un tercero exige al dueño en persona (crear la cuenta, aceptar términos, pagar, verificar identidad) es lo
único que queda aquí. **Se piden todos al empezar 9a**, porque tardan._

**Paquete 8-0 · Dominio (sigue pendiente de la Fase 8; desbloquea 9p, 9r, 9t).** Cuenta de Cloudflare (gratis); cambiar los servidores de nombres de
`tolatino.com` en el registrador (el único paso en otra página; la lista de toques llega con capturas); token de la API de Cloudflare (DNS y SSL de la
zona) en el formulario seguro. Claude hace lo demás.

**Paquetes 8-1, 8-2 y 8-3 · Tiendas (siguen pendientes; desbloquean 9r y 9u).** Tal como `fase8-apps.md` §10: D-U-N-S, Apple Developer y Google Play
como organización, Firebase (8-1); llaves de la API, APNs, cuentas de servicio, crear las cuatro apps en cada consola, testers, Pass Type ID y emisor de
Google Wallet (8-2) — y además el **token de GitHub con permiso de administración** para poner las reglas del entorno `tiendas` (L1346); declaraciones de
privacidad, IARC, público objetivo y el servicio de ubicación del Repartidor (8-3); aceptar las licencias de marketing de Apple Wallet y Google Wallet para
el arte oficial de los botones (L1292).

**Paquete 9-1 · Proveedores de pago y mensajes (desbloquea 9q y 9t).** (1) **Stripe**: cuenta de la empresa, verificación del negocio y del dueño,
banco para la plataforma, perfil de **Connect** (plataforma de mercado, Express) — primero en modo prueba, después en vivo; las tres llaves de cada modo al
formulario seguro. (2) **Telnyx**: cuenta, número de To'Latino, **registro 10DLC** de la marca y de las campañas (los textos y ejemplos los prepara Claude
en una pantalla para tocar «Enviar»); llave al formulario. (3) **Meta**: WhatsApp Business verificado con el número, la app y el token permanente; las
plantillas las manda Claude por la API. (4) **Amazon SES**: cuenta y pedir salir del «sandbox» de SES (el formulario de AWS pide describir el uso:
Claude deja el texto listo para tocar); el DNS lo pone Claude por Cloudflare. (5) **Anthropic**: cuenta, facturación y pedir **retención cero** para
producción. Costos: los de PLAN §8 (SMS, WhatsApp, correo, Stripe, IA con tope).

**Paquete 9-2 · Abogado y contador (desbloquea 9s y la apertura).** Elegir y contratar un abogado de Pennsylvania y un contador (costo **fuera de PLAN §8**,
decisión del fundador); mandarles `docs/legal/para-el-abogado.md` y `para-el-contador.md` (Claude los arma; el fundador solo los reenvía desde el teléfono);
registrar el **agente DMCA** en la Copyright Office (formulario en línea y pago). Las respuestas del abogado llegan como documento: Claude las aplica.

**Paquete 9-3 · Producción (desbloquea 9t).** (1) Cuenta y proyecto en el proveedor elegido (Hetzner: proyecto «tolatino-real» aparte del de pruebas,
decisión C) con forma de pago; token de la API del proyecto al formulario seguro. (2) El almacén de respaldos del mismo proveedor (se crea con el mismo
token si el proveedor lo permite; si no, un toque). (3) Correo y teléfono donde llegan las alertas críticas y el reporte diario. (4) Borrar el proyecto de
Vercel y los dos de Supabase de la v1 el día que `tolatino.com` apunte a producción (dos toques cada uno; L7, L12).

**Paquete 9-4 · Personas y contenido (va llegando durante el grupo A).** Quiénes entran al Super Admin y con qué rol (cada uno da de alta su segundo
factor); el equipo local de cada ciudad (city manager y verificador, paso 4 del asistente); la foto de portada del muro y la de la cuenta oficial de cada
ciudad (L580, L641); las listas de términos de moderación revisadas con vecinos de cada ciudad (L614); las plantillas de estimado de Auto y Hogar que se
quedan en producción (L410); los negocios reales que dan permiso para las capturas de las tiendas (fase8 §6 #23); los invitados de la beta de Hazleton; el
contacto para la revisión de Apple y Google.

**Paquete 9-5 · Revisión y los tres OK.** (1) **La revisión por lista** de `docs/REVISION.md` (AA), paso a paso, incluidas la cámara de la Puerta y el
boleto sin señal en su iPhone (L866, L890) y la web instalada con avisos. (2) **OK-1** «enciende producción en acceso anticipado». (3) **OK-2** «manda las
apps a revisión y empieza la beta de Hazleton». (4) **OK-3** «abre las cinco ciudades». Cada OK se escribe en el chat; Claude lo anota con su fecha en
`deploy_releases.founder_ok_ref` y en `docs/DECISIONES.md`.

---

## Anexo A · `LAUNCH-CHECKLIST.md` → bloque o paquete (por línea del archivo en el commit `eb386fd`, 11 nov)
_535 pendientes = 532 casillas + 3 viñetas abiertas (L385, L388, L393). Categorías: **(a)** se resuelve en el sandbox sin el fundador · **(b)** espera un
paquete del fundador o la cuenta de un tercero · **(c)** solo al encender producción. Las líneas se mueven cuando LAUNCH crece: 9a le pone a cada
pendiente su destino en el mismo archivo (`launchConDestino`) y desde ahí manda el destino escrito, no este número._

| Bloque | Cat. | N.º | Líneas de LAUNCH |
|---|---|---|---|
| 9a-V · verificar contra lo servido y marcar con evidencia | a | 89 | L18, L32, L39, L40, L47, L58, L72, L74, L82, L85, L89, L92, L97, L107, L112, L120, L122, L124, L133, L141, L155, L157, L159, L163, L183, L184, L219, L222, L231, L233, L236, L237, L244, L245, L253, L255, L257, L260, L265, L272, L279, L281, L283, L285, L286, L288, L290, L294, L295, L296, L307, L308, L319, L323, L331, L361, L366, L377, L379, L399, L412, L421, L425, L428, L431, L435, L438, L442, L443, L488, L495, L535, L561, L573, L584, L586, L595, L616, L672, L689, L762, L827, L908, L909, L930, L963, L987, L1023, L1065 |
| 9a-D · decisión ya tomada o nota: confirmar en REVISION y cerrar (o pasar a «después de abrir») | a | 63 | L119, L143, L160, L169, L173, L190, L201, L221, L225, L261, L270, L291, L372, L424, L433, L496, L542, L546, L550, L552, L597, L619, L656, L704, L729, L740, L766, L794, L796, L798, L820, L823, L842, L844, L846, L848, L850, L871, L873, L875, L877, L900, L904, L906, L913, L917, L925, L946, L949, L951, L1015, L1018, L1044, L1077, L1137, L1140, L1165, L1179, L1185, L1205, L1213, L1242, L1323 |
| 9a-P · pruebas y semillas viejas | a | 13 | L477, L491, L742, L768, L854, L885, L958, L1020, L1026, L1041, L1092, L1239, L1265 |
| 9b | a | 65 | L76, L176, L193, L207, L214, L566, L578, L588, L590, L592, L603, L605, L621, L627, L629, L631, L634, L636, L648, L652, L665, L668, L676, L685, L687, L699, L701, L706, L731, L747, L750, L787, L851, L853, L868, L869, L898, L944, L954, L974, L989, L1025, L1037, L1052, L1060, L1085, L1124, L1139, L1163, L1171, L1178, L1187, L1188, L1207, L1210, L1215, L1235, L1241, L1245, L1260, L1273, L1302, L1305, L1307, L1360 |
| 9c | a | 7 | L30, L129, L242, L373, L395, L483, L785 |
| 9d | a | 11 | L168, L186, L188, L189, L315, L321, L681, L879, L1004, L1127, L1321 |
| 9e | a | 3 | L215, L923, L1381 |
| 9f | a | 9 | L341, L708, L732, L751, L788, L945, L967, L973, L1080 |
| 9g | a | 8 | L127, L175, L203, L209, L212, L451, L942, L1135 |
| 9h | a | 2 | L749, L971 |
| 9i | a | 3 | L41, L64, L71 |
| 9j | a | 9 | L35, L464, L1149, L1184, L1228, L1319, L1340, L1349, L1379 |
| 9k | a | 18 | L327, L355, L357, L358, L360, L382, L393, L414, L416, L448, L455, L759, L760, L800, L817, L821, L918, L938 |
| 9l | a | 23 | L104, L223, L269, L304, L306, L318, L328, L342, L345, L347, L363, L969, L977, L980, L1106, L1111, L1113, L1115, L1118, L1120, L1131, L1203, L1297 |
| 9m | a | 25 | L28, L42, L45, L61, L79, L81, L95, L172, L240, L246, L280, L299, L309, L311, L324, L385, L524, L559, L599, L773, L896, L936, L1063, L1181, L1375 |
| 9n | a | 50 | L101, L114, L117, L136, L145, L147, L149, L158, L171, L180, L197, L199, L248, L259, L287, L297, L298, L301, L368, L369, L370, L371, L446, L453, L469, L473, L474, L475, L476, L489, L497, L539, L548, L555, L623, L653, L660, L691, L696, L831, L934, L939, L941, L952, L982, L990, L1048, L1075, L1108, L1267 |
| 9o | a | 5 | L458, L468, L683, L775, L1237 |
| 9p | b | 17 | L26, L1153, L1173, L1176, L1182, L1191, L1252, L1263, L1276, L1310, L1313, L1327, L1334, L1342, L1357, L1374, L1383 |
| 9q | b | 24 | L23, L151, L166, L336, L351, L388, L440, L537, L791, L829, L881, L921, L994, L997, L998, L1000, L1038, L1056, L1071, L1097, L1101, L1104, L1133, L1201 |
| 9r | b | 28 | L893, L1193, L1196, L1199, L1218, L1221, L1223, L1225, L1230, L1233, L1249, L1254, L1256, L1258, L1269, L1280, L1283, L1289, L1292, L1299, L1330, L1337, L1344, L1346, L1348, L1355, L1363, L1366 |
| 9s | b | 38 | L381, L402, L405, L418, L460, L461, L466, L478, L486, L493, L499, L502, L505, L508, L510, L512, L515, L519, L521, L526, L533, L540, L564, L571, L607, L609, L612, L625, L662, L678, L777, L812, L832, L915, L1006, L1067, L1082, L1122 |
| Paquete 9-4 | b | 4 | L410, L580, L614, L641 |
| Paquete 9-5 | b | 2 | L866, L890 |
| 9t | c | 5 | L7, L12, L14, L37, L273 |
| 9u | c | 11 | L1145, L1146, L1147, L1148, L1150, L1351, L1362, L1367, L1369, L1372, L1377 |
| 9v | c | 3 | L543, L1002, L1102 |

**Totales:** (a) **403** · (b) **113** · (c) **19** = **535**. Por paquete, las (b): 8-0 → 9p (17) · 9-1 → 9q (24) · 8-1/8-2/8-3 → 9r (28) · 9-2 → 9s (38) · 9-4 (4) · 9-5 (2).
