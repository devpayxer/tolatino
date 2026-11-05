# To'Latino v2 — Dónde estamos / cómo retomar

_Actualizado: 5 nov 2026._

## Ramas (léelo antes de nada)
- **`main`** = la rama de trabajo de la v2 y la que debe ser **rama por defecto** del
  repo (toda sesión nueva arranca de ahí). Si una sesión arranca y ve código de
  Next.js + Supabase de la v1 (`apps/web`, `supabase/migrations/0157…`), está en
  la rama equivocada: hacer `git checkout main` y seguir.
- **`pruebas`** = lo que corre en el sandbox; debe apuntar al mismo contenido que
  `main` (más `infra/pruebas/deploy.sh` cuando exista).
- **`produccion`** = no existe todavía (fase 9).
- `archivo/v1-*` = el código viejo, solo referencia. `archivo/v1-pruebas-sesion-5nov`
  = lo que una sesión hizo por error sobre la v1 el 5 nov (descartado).
- **Incidente 5 nov:** una sesión nueva arrancó desde la rama por defecto vieja
  (`claude/tolatino-repo-setup-1efdil` = v1), leyó el `CLAUDE.md` de la v1 e hizo
  una «Fase 0» de la v1 sobre `pruebas`. Causa: no se había cambiado la rama por
  defecto a la v2. Corregido el 5 nov: `main` creada y puesta como rama por defecto por el
  fundador; `pruebas` borrada y recreada desde `main` (5a47a56). Las ramas
  `claude/*` viejas siguen existiendo pero no se usan.

## Estado
- **Plan APROBADO (5 nov 2026). Sigue: Fase 0 — Cimientos.** Todas las decisiones
  (A–Z) están en `docs/DECISIONES.md`; `docs/PLAN.md` v2 y `CLAUDE.md` las integran.
  No hay código de la app todavía.
- **Fase 0 · bloque 1 HECHO (5 nov):** monorepo pnpm + Turborepo; `apps/web` (Next.js 15,
  App Router, Tailwind v4, `output: standalone`, fuentes self-hosted con next/font);
  `packages/ui` (tokens.css 1:1 del sistema + `Wordmark`); `/api/salud` (app + PostGIS +
  commit); `guardianes/run.mjs` (secretos · tokens · semilla · idioma; probados al revés);
  CI en GitHub Actions; `infra/pruebas/` (Dockerfile multi-etapa, compose con web + Postgres/
  PostGIS 16 + MinIO, `deploy.sh` idempotente, nginx con `/` → app y `/estado/`,
  `tolatino-sync` v2 con `flock`). Captura `capturas/fase0-bloque1-iphone15.png`
  (fondo Paper, Sora/Manrope/Mono comprobados por `getComputedStyle`).
  **Lección:** para probar el standalone en local hay que copiar `.next/static` y `public`
  dentro de `.next/standalone/apps/web/` (el Dockerfile ya lo hace).
- **Fase 0 · bloque 2 HECHO (5 nov):** `scripts/portar-sistema.mjs` porta los 49 módulos del
  sistema (**130 componentes**, no 132: el conteo anterior incluía funciones internas) a
  `packages/ui/src/ds/` como ESM ("use client", registro `scope.js`), cambia todo hex por
  `var(--tl-…)` (15 colores sin token → `--tl-ds-xxxxxx` en tokens.css) y quita lo del prototipo
  (`hours-pro.js` con hora fija, `icons.js` duplicado). Se re-ejecuta y da lo mismo.
  `/sistema` = catálogo por grupos (126 componentes + 4 constantes); 22 con ejemplos
  (`apps/web/app/sistema/ejemplos.tsx`), el resto dibuja con valores por defecto o se marca
  «sin ejemplo». Capturas `capturas/sistema-{base,tarjetas,pagina}.png`.
  **Pendiente honesto:** los componentes portados son JS sin tipos (`@ts-nocheck`); cada uno pasa
  a TSX tipado cuando una pantalla lo usa por primera vez. `ChangeProposal` necesita datos.
  Ejemplos de `ReviewCard`/`OwnerCard` con forma de datos incompleta (no muestran facts/trust).
- **Fase 0 · bloque 3a HECHO (5 nov) · base de datos:** migraciones en `packages/db/migrations/`
  aplicadas solas en cada despliegue por `packages/db/migrar.sh` (una vez cada una, con huella;
  si alguien edita una ya aplicada, el despliegue se detiene). 0001 base (PostGIS, pg_trgm,
  `audit_entries` solo inserción con trigger, `cms_strings`, `feature_flags`, `platform_config`) ·
  0002 ciudades/barrios/lista de espera · 0003 catálogo (categorías, subcategorías, módulos,
  filtros, sinónimos, comodidades) · 0004 datos del catálogo (generado por `scripts/taxonomia.mjs`
  desde la taxonomía: 17 categorías, **757 subcategorías**; corregidos los dos defectos que traía
  el diseño: «corner store» al revés y 5 reglas metidas como subcategorías en Venta de Autos) ·
  0005 las 5 ciudades (todas «próximamente», impuesto 6 %). Probado en PostGIS real: dos pasadas,
  auditoría inborrable, migración editada detenida. CI corre lo mismo en cada cambio.
  **Lección:** la imagen de PostGIS se reinicia en su primer arranque; esperar y migrar por TCP
  (`-h 127.0.0.1`), nunca por el socket.
  **Pendiente:** búsqueda trigram «barberia» también trae «Bar» (umbral 0.3): se afina con Buscar.
  Nombres cortos provisionales (no estaban en el prototipo): Tiendas, Transporte, Cursos, Niños,
  Deporte, Iglesias, Casas, Autos — editables en el Super Admin.
- **Fase 0 · bloque 3b HECHO (5 nov) · cuenta:** migración 0006 (users, otp_codes, sessions,
  account_changes); `apps/web/lib/cuenta.ts` (código de 6 números guardado como HMAC, 10 min,
  5 intentos, reenvío a los 30 s, 5 códigos/hora por teléfono y 20 por IP, comparación en tiempo
  constante; sesión = token aleatorio en cookie httpOnly/SameSite=Lax de 180 días, guardado como
  huella; defensa CSRF por Origin); rutas `/api/cuenta/{codigo,verificar,perfil,salir,yo}`;
  pantallas `/entrar` (ONB-USR-1 y -2, textos 1:1 del diseño 2au) y `/cuenta` mínima.
  **Modo pruebas (decisión E2):** el código sale en pantalla con «MODO PRUEBAS»; candado en
  `lib/entorno.ts` + guardián `modoPruebas` (probado al revés). Semilla del catálogo pasa a
  `packages/db/seeds/catalogo.sql` (repetible) con los nombres cortos del diseño de onboarding.
  Probado de punta a punta en iPhone 15 contra PostGIS real + 5 ataques (CSRF, número inválido,
  reenvío rápido, fuerza bruta, huellas). Ayuda para El Compa: `docs/ayuda/cuenta-entrar.md`.
  Pendientes en LAUNCH-CHECKLIST (proveedor SMS, passkeys con HTTPS, pasos 3–5, Button accesible).
- **Fase 0 · bloque 3c HECHO (5 nov) · Super Admin:** migración 0007 (staff_roles 7, staff_members,
  admin_sections 18, role_permissions con la matriz del plan §5); `lib/admin.ts` (permiso SIEMPRE en el
  servidor; sin permiso → redirige con aviso; `auditar` en cada acción); acciones con motivo
  (`app/admin/acciones.ts`: arranque, cerrar/bloquear sesión, cambiar permiso, agregar/quitar miembro);
  pantallas `/admin` (KPIs reales, últimas acciones), `/admin/usuarios` (+ 360° con sesiones),
  `/admin/ciudades`, `/admin/catalogo`, `/admin/sistema` (equipo, matriz 2am, auditoría 2al) y
  `/admin/pendiente/[sección]` (lo que no existe dice su fase; nada de botones muertos).
  **Primer Admin:** código de arranque de un solo uso (huella en `lib/admin.ts`), entregado al fundador por
  el chat. Probado de punta a punta (10 comprobaciones: código malo rechazado, arranque, sin acceso, agregar
  rol Solo lectura, lectura sin botones de editar ni Sistema, cerrar sesión con motivo, expulsión real,
  auditoría de las 3 acciones). Guardián nuevo `servidorCliente` (error React #130 del 5 nov).
  Logo real del sistema (antes era un círculo inventado) en `Wordmark` y `public/assets/`.
- **Fase 0 cerrada (5 nov).** El fundador pidió seguir con la Fase 1.
- **Fase 1 · bloque 1a (5 nov) · modelo de negocios:** migración 0008 (businesses con búsqueda ES/EN sin
  acentos por trigger y GIST geo; caché de derivados `business_stats_cache`; horarios, feriados, enlaces,
  equipo, licencias, sello, media, FAQ, reclamos, borrador de onboarding, toques de contacto, guardados,
  seguir, búsquedas, avísame, recomendaciones). Probado: «barberia» encuentra «Barbería»; radio 5 mi.
- **Fase 1 · bloque 1b HECHO (5 nov) · semilla del sandbox:** el fundador subió `prototype.zip` (Export →
  Project HTML, solo la carpeta `prototype`). `scripts/semilla/extraer-prototipo.cjs` carga los 46 scripts del
  prototipo en un `vm` aislado y saca los negocios de los 17 `TL<Cat>.B` → `infra/pruebas/semilla/negocios.json`
  (**446 negocios**, no 276: la memoria era de una versión vieja; 289 Pro, 278 verificados, todos con
  coordenadas y subcategoría). `scripts/semilla/generar-sql.mjs` → `0001_negocios.sql` (negocios, caché de
  derivados, horarios, 1 091 fotos de Pexels). Teléfonos cambiados al rango de ficción 555-01xx (los del
  prototipo parecían reales de Hazleton). La aplica solo `infra/pruebas/deploy.sh` (`migrar.sh
  --semilla-pruebas`); guardián `semilla` impide llamarla desde fuera del sandbox (probado al revés).
  **Inconsistencia del diseño:** 5 subcategorías de las demos no existen en la taxonomía (Comida criolla,
  Calefacción y aire, Quitar nieve, Optometrista, Psicólogo y terapia). Pendiente: las 17 demos ricas
  (`TLDemo`: menú, staff, reseñas…) entran con su bloque.
- **El kit `tolatino-app-kit.zip`** (Claude Design) asume Expo + Supabase: queda sustituido por las decisiones
  B, C y D; sus documentos ya estaban en `docs/diseno/`.
- **Fase 1 · bloque 1c ✓ (5 nov, espera OK del fundador):** shell `app/(app)/` (SiteHeader móvil/escritorio,
  pestañas, BottomNav, idioma ES/EN por cookie `tl_lang`) + Inicio (APP-HOME) 1:1 con el prototipo: móvil =
  7 categorías + «Todas (17)» + Abierto ahora (3) + Para negocios; escritorio = columnas del prototipo
  (`deskCols`: 220 | centro desde 1024; 240 | centro | 320 desde 1200, corte `xl` = 75rem en globals.css).
  «Abierto ahora» es real: Pro con foto, abierto según `business_hours` en la zona de la ciudad, el más
  cercano por categoría. **Ocultas hasta tener datos reales:** Hoy en el barrio, Esta semana (eventos),
  Comunidad y el mini mapa (no hay mapa todavía). Rutas aún no construidas muestran `Pronto` con su bloque
  (c/[slug], n/[id], negocios, buscar, ciudad, publica, comunidad, eventos) — fase 9 exige 0.
  Nota de verificación: este contenedor no llega a images.pexels.com (proxy 403), así que las fotos solo se
  ven en el sandbox; la página sí pide las URLs correctas.
- **Fase 1 · bloque 1d ✓ (5 nov, espera OK del fundador):** página de categoría `/c/[slug]` (APP-NEG-CAT) y
  `/negocios` (APP-NEG-HOME), 1:1 con el prototipo.
  - Configuración de cada página (portada, filas de mosaicos, «Qué se te antoja», banda, filtros rápidos, línea de la
    tarjeta) sacada del prototipo con `scripts/catalogo/extraer-paginas.cjs` → `packages/taxonomy/paginas.json` →
    `packages/db/seeds/paginas.sql` (configuración real: va también a producción). Migración 0009: `categories.page`
    (semilla) + `page_admin` (lo que edite el Super Admin, la semilla no lo toca), `filter_options.sort/icon`
    (251 filtros, `active` lo controla el admin) y la función `negocio_abierto(id, hora_local)` (incluye rangos que
    cruzan medianoche y 24 h). Cada mosaico es una REGLA ({subs} · {tag} · {attr,value} · {cap_gte}); el extractor
    prueba candidatas contra la función `inSub` del prototipo sobre todos sus negocios y se detiene si una no casa.
    Conteos verificados contra el prototipo (comida 44, belleza 34, Toyota 27, fiestas 200 invitados 24, fiebre 6,
    dominicana+delivery 4).
  - Servidor decide: sub/filtros/orden/página vienen en la URL y se validan contra lo que la categoría ofrece; Pro
    primero; en Relevancia los Pro rotan por día (como el prototipo); radio = `cities.default_radius` (5 mi).
  - Tarjetas: `lib/tarjeta.ts` (estado del horario «Abierto · hasta 8 PM / Cerrado · abre vie 8 AM», botón por
    categoría, chips verificados, «Nuevo · en To'Latino» con < 5 reseñas — parche en `portar-sistema.mjs` a
    BusinessCard) + `lib/tarjetas.ts` (3 consultas fijas por lista, sin N+1) + `TarjetaNegocio.tsx` (llamar →
    `contact_taps`, cómo llegar → mapas del teléfono, corazón → `favorites`; sin sesión → `/entrar?volver=`).
  - `Avísame cuando haya` guarda `search_alerts` (el aviso se envía en la Fase 2, con las notificaciones). `/entrar` acepta `?volver=` (solo
    rutas del mismo sitio).
  - Semilla del sandbox: ahora lleva `service_radius_mi`, `works_from_home` y el texto de estado de los 4 negocios
    sin horario.
  - Guardián nuevo `rutasVivas`: ningún enlace a una pantalla que no existe (probado al revés).
  - Arreglo de 1c: el buscador del encabezado en el teléfono dice «Buscar en Hazleton» (como el prototipo).
  - **Fuentes alojadas en el repo** (`apps/web/public/fuentes`, OFL, Fontsource 5.3.0) con `@font-face` y el nombre
    exacto del sistema (Sora, Manrope, JetBrains Mono). Motivo: el CI del 1d falló porque Google Fonts no respondió
    bien durante el build, y además los componentes del sistema piden las fuentes por nombre y `next/font` las
    registraba con nombres generados: JetBrains Mono nunca cargaba (las líneas en mono salían con la fuente del
    sistema). Guardián nuevo `buildSinRed` (nada de Google Fonts en el build; probado al revés). `rutasVivas` ahora
    acepta archivos de `public/`.
- **Fase 1 · bloque 1e ✓ (5 nov, espera OK del fundador):** ficha base `/n/[id]` (APP-NEG-LISTING) Pro y Free,
  teléfono y escritorio, como dice PLAN §6: Resumen, horario Pro, fotos, Relacionados, Llamar / Cómo llegar /
  Compartir / Guardar. `lib/ficha.ts` (6 consultas fijas): estado y «Hoy» con la hora de la ciudad (TodayCard con
  datos reales: tiempos y envío que el negocio puso, «Pagas en el local»), HoursPro con los rangos reales del día,
  cuenta regresiva, `special_hours` y la semana; Relacionados = `business_links` confirmados por los dos, con su nota.
  Parche a HoursPro en `portar-sistema.mjs`: etiquetas ES/EN (AHORA, PRÓXIMOS CAMBIOS, Esta semana) y color del
  estado (Cerrado en rojo). Semilla del sandbox: «sobre nosotros» (111), preguntas frecuentes (31 negocios, 112) y 3
  relaciones del prototipo. **Fuera a propósito** (datos inventados en el prototipo o módulo de otra fase): reseñas,
  menú/servicios, «N vecinos lo recomiendan», tarjeta del dueño (llega con Equipo, 1h), mini mapa (mapa propio),
  galería (falta su archivo de diseño). Ver LAUNCH-CHECKLIST.
- **Corrección:** las notificaciones y las reseñas entran en la **Fase 2** (PLAN §6), no en la 8.
- **Archivos de diseño en el repo (5 nov):** `docs/diseno/pantallas/` tiene los `.dc.html` de Claude Design que la Fase 1
  necesita (Prototipo, Galería, Buscar, Ciudad, Mapa, Recomendar, Publica tu negocio v2, Licencia, Recuperar negocio,
  Página, Teléfono, Super Admin, Panel negocio v2, Mi cuenta) y `datos/` los 140 scripts de datos del prototipo +
  `orden.txt`. Salen del artifact de diseño del fundador (`Artifact read` con `paths: ["project/To'Latino X.dc.html"]`;
  la carpeta `project/prototype/` no se puede leer por nombre reservado, por eso los datos vinieron del zip).
  Extractores, desde el repo: `node scripts/catalogo/extraer-paginas.cjs docs/diseno/pantallas/datos
  docs/diseno/pantallas/datos/orden.txt "docs/diseno/pantallas/To'Latino Prototipo.dc.html"
  packages/taxonomy/categorias.json packages/taxonomy/paginas.json` (verificado: salida idéntica).
- **Cierre del 1d y 1e:** banderas de «Por país» (`public/assets/flags`, 14, del diseño) y **Galería** `/n/[id]/fotos`
  (diseño «Galería»): cuadrícula, visor a pantalla completa (flechas, deslizar, teclado ← → Esc), `?at=N`, y
  «Reportar foto» → `photo_reports` (migración 0010, una vez por persona y foto; sin sesión → entrar y volver).
  Free muestra hasta 6 fotos (modelo de datos), Pro hasta 60.
- **Fase 1 · bloque 1f-1 Buscar ✓ (5 nov):** `/buscar` (diseño «Buscar»: explorar, sugerencias en vivo, resultados,
  sin resultados, voz) + `/api/buscar` (sugerencias). Motor del prototipo (`search-engine.js`) llevado al servidor en
  `lib/buscar.ts`: frases → intenciones (filtros), palabras vacías, singular, sinónimos (tabla `synonyms`, semilla
  repetible `seeds/busqueda.sql` desde `scripts/catalogo/extraer-busqueda.cjs` → `packages/taxonomy/busqueda.json`),
  errores de escritura con el vocabulario `search_vocab` (vista materializada + trigramas, `refrescar_busqueda()` tras
  cada semilla), búsqueda en `search_doc` (migración 0011: suma categoría y texto de la tarjeta), parcial si nada
  encaja con todas las palabras, sugerencias de subcategorías con conteo, «Aún no hay», «¿Quisiste decir…?», categoría
  dominante → filtros rápidos. Cada búsqueda queda en `search_logs`; «Lo más buscado» sale de ahí (se ve con 3+).
  «Avísame» → `search_alerts`. En el teléfono Buscar es pantalla completa (sin encabezado ni barra, como el prototipo).
  Probado: «barbería sin cita abierta ahora» (6, con 2 filtros), «dentist that takes Medicaid», «barveria» → 10.
- **Fase 1 · bloque 1f-2 Ciudad ✓ (5 nov):** selector «¿Dónde buscas?» (diseño «Ciudad»: hoja en el teléfono, ventana
  bajo el botón de ciudad en escritorio; `/ciudad` y `?ciudad` lo abren) y APP-CIUDAD-PRONTO (pieza CitySoon) en
  Inicio, Negocios, categorías y Buscar cuando la ciudad no abre. «Ciudad que estoy viendo» = ciudad + punto (centro,
  barrio o GPS) + radio: cookie `tl_loc` del dispositivo y, con cuenta, `users.viewing_*` (el punto GPS nunca se guarda
  en el servidor). `lib/ubicacion.ts` la valida siempre; `lib/punto.ts` (`centroSQL`, `DENTRO`) la lleva a TODAS las
  listas: distancias desde el punto elegido y dentro del radio (más los que van a domicilio y llegan). Cifras reales
  (`lib/ciudad.ts`): negocios en el radio, pueblos, puntos del mapa, lista de espera, listos/meta (`open_rule.goal`,
  50 por defecto). «Avísame cuando llegue a mi zona» → `city_waitlist` (con cuenta o con teléfono + dispositivo;
  quitar = `removed_at`; tope 10/hora por IP). Super Admin › Ciudades: lista de espera real y «Pide tu ciudad».
  Migración 0012 + semilla `zonas.sql` (6 barrios y 18 pueblos de Hazleton, de `city-data.js`). Sandbox: Hazleton
  abierta (`infra/pruebas/semilla/0002_ciudad.sql`). Ayuda: `docs/ayuda/ciudad.md`.
- **Mapa propio (infra):** `infra/mapa/generar.sh` (OpenStreetMap de Pensilvania → Planetiler → `.mbtiles`;
  fuentes auxiliares bajadas aparte; océanos vacíos si osmdata.openstreetmap.de no responde: `agua-vacia.py`),
  servicio `mapa` (tileserver-gl v5.6.0) en el compose del sandbox, `/teselas/` en nginx, paso 3d de `deploy.sh`
  (genera en segundo plano la primera vez). Prueba de punta a punta: `.github/workflows/mapa.yml`. Matemática del
  prototipo en `lib/mapa-geo.ts`. Hasta que el sandbox sirva teselas, los mapas se ven en gris (sin calles).
- **Fase 1 · orden:** 1a modelo ✓ · 1b semilla de pruebas desde el prototipo ✓ · 1c shell + Inicio ✓ · 1d página de categoría ✓ · 1e ficha base ✓ ·
  1f Buscar ✓ · Ciudad ✓ · Mapa (sigue) · 1g Publica tu negocio v2 · 1h panel base · 1i admin Negocios + colas.
- **Cómo arrancar la Fase 0 (plan original; sesión nueva, `/model opus`, `/effort high`):**
  1. Leer `CLAUDE.md`, este archivo y `docs/PLAN.md` §3, §5 y la fila «Fase 0» de §6.
  2. Primer bloque: monorepo (pnpm + Turborepo, Next.js, `packages/ui`), rama
     `pruebas` nueva con `infra/pruebas/deploy.sh` (que además reemplaza
     `tolatino-sync` con `flock`), compose del sandbox (Postgres+PostGIS, MinIO,
     tiempo real, observabilidad), tubería CI, primeros guardianes.
  3. Segundo bloque: puerto del sistema de diseño desde
     `docs/diseno/design-system/components-web/` + tokens → `packages/ui`, página de
     catálogo de componentes, **primera captura en el teléfono** para el OK.
  4. Después: cuenta (teléfono una vez + passkeys), ciudad (5 ciudades), taxonomía,
     Super Admin esqueleto, `docs/ayuda/` inicial.
- El fundador trabaja desde el teléfono y solo da el OK (decisión U).

## Infraestructura de PRUEBAS (sandbox) — creada el 5 nov
- Hetzner Cloud, proyecto `tolatino-pruebas`, servidor **`tolatino-pruebas-1`**
  (id 174559637), tipo `cx33` (4 núcleos / 8 GB / 80 GB), Falkenstein (DE),
  Ubuntu 24.04. IP `2.31.196.167`. Respaldos automáticos activos. Firewall
  `tolatino-pruebas-web` (id 11974241): solo 80/443 + ICMP de entrada.
- **Cómo se administra (sin SSH, regla U):** el servidor **se sincroniza solo** con
  la rama **`pruebas`** del repo (público) cada 60 s (`/usr/local/bin/tolatino-sync`,
  timer systemd). Si hay un commit nuevo, hace `git reset --hard origin/pruebas` y
  ejecuta `infra/pruebas/deploy.sh` si existe. Log en `/var/log/tolatino-sync.log`.
  Página de estado en `http://2.31.196.167/` (commit, hora, últimas líneas del log).
- Instalado por cloud-init: git, nginx, docker + compose, fail2ban,
  actualizaciones automáticas (reinicio 04:30 si hace falta). Usuario `deploy`.
- Emergencia: se reconstruye desde la API de Hetzner con el mismo cloud-init
  (`rebuild`), sin tocar nada a mano. La llave SSH de arranque
  (`tolatino-bootstrap`, id 132214722) existe en Hetzner pero su parte privada no se
  conserva: el acceso es por el repo y por la API.
- El token de la API vive en los secretos del entorno de Claude Code (solo pruebas).

## Pendiente inmediato
1. ~~Verificado por el fundador (5 nov 00:08 EST): la página de estado carga, sync en commit 430e46a.~~ **Defecto conocido:** en el primer arranque `tolatino-sync` corrió dos veces a la vez (runcmd + timer) y chocó el clone; se autocorrigió al minuto. **Corregir en Fase 0:** `deploy.sh` reemplaza `/usr/local/bin/tolatino-sync` con una versión con `flock`.
2. ~~OK del fundador al plan~~ dado el 5 nov.
3. ~~Pexels~~ hecho (5 nov): clave nueva en los secretos del entorno, probada (HTTP 200).
4. Crear la rama `pruebas` nueva (hoy apunta al código v1) con `infra/pruebas/deploy.sh`
   cuando empiece la Fase 0.
