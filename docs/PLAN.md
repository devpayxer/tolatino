# To'Latino v2 — Plan de construcción (versión 2)

> **Estado: APROBADO por el fundador el 5 nov 2026.** Integra las decisiones de
> `docs/DECISIONES.md` (A–Z). Fase 0 en marcha.
> Fuente de verdad del *producto y el diseño*: `docs/diseno/`. Fuente de verdad del
> *código*: este plan + `CLAUDE.md`.

---

## 0. En una página

**Qué:** To'Latino, plataforma *all in one* para latinos en EE. UU., por ciudad.
Tres módulos: **Negocios** (17 categorías, cada una con su flujo), **Comunidad** y
**Eventos**. Alrededor: Mi cuenta, Panel del negocio, Super Admin que maneja cada
píxel, El Compa (IA de soporte), Soporte, onboardings, Ciudad, Buscar.

**Dónde:** cinco ciudades de Pennsylvania desde el arranque: **Hazleton, Allentown,
Wilkes-Barre, Scranton y Reading** (X).

**Cómo se entrega:** **un solo código**, web + **Capacitor**, **cuatro apps** en las
tiendas —To'Latino (vecinos + sitio web), To'Latino Negocios, To'Latino Repartidor,
To'Latino Puerta— y el Super Admin solo web (B).

**Con qué:** **todo propio** sobre nuestros servidores y código abierto; se paga
solo lo irreplicable: SMS, WhatsApp, correo, Stripe, tiendas, IA de El Compa (O, S).

**Cómo se trabaja:** dos proyectos aislados, **sandbox** y **producción** (M); todo
automático, el fundador solo da el OK desde el teléfono (U); **guardianes**
permanentes que vigilan, reportan y corrigen (N); cada función que llega a
producción deja su documentación para El Compa (V).

**Cuándo abre:** **cuando esté todo**, salvo El Patio, que queda para el final (A, G).
Las fases de abajo son orden de construcción, no de lanzamiento.

**Vara:** competir con DoorDash, Instacart, Walmart, Uber; nada por debajo de su
altura; seguro siempre; la plataforma más rápida del mercado (P, Q, R).

---

## 1. Lo que entendí del diseño (resumen; detalle en `docs/diseno/`)

| Pieza | Qué incluye |
|---|---|
| **17 categorías** | Auto · Belleza · Comida · Hogar · Noche · Mercados · Fiestas · Doctores · Profesionales · Tiendas · Transporte · Educación · Niños · Deporte · Iglesias · Bienes Raíces · Venta de Autos. Subcategorías, familia de filtros, tesis, módulos permitidos (`ALLOW` del 3 nov) y flujo propio. **Comida es la categoría modelo.** |
| **Página del negocio** | Base: Resumen · Novedades · Eventos · Staff · Relacionados · Jobs · Reseñas. Por módulo: Menú · Reservaciones · Servicios · Tienda · Renta. Pestaña **solo si el módulo está activo y tiene contenido**. Pro = pestañas; Free = una página, 5 ítems, 3 fotos. |
| **Pro / Free** | Free: módulo principal + pedidos/citas hasta 10/mes pagando en el local. Pro **$14.99/mes solo mensual**, prueba 30 días sin tarjeta, `HZL30` = 60 días. Lo Pro que vence se duerme, no se borra. |
| **Transacción** | Una `Operation` (pedido · cita · reservación · cotización · renta · boleto). Nace PENDIENTE; depósito **retenido al enviar**. Stripe Connect para tarjeta; sin Stripe = pago en el local. Comisión solo sobre tarjeta. Retenido · Cobrado · Liberado · Devuelto. |
| **Panel del negocio v2** | Hoy · Clientes · Mensajes · Tu página · Lo que vendes (+ «Tu herramienta» por categoría) · Cobros y plan · Insights · Moderadores · Más · El Compa. Vive en el teléfono. |
| **Super Admin** | 17 secciones, 12+ colas con SLA, 7 roles, auditoría inmutable, acciones con motivo + aviso + apelación. Todo lo que nace en el producto nace con su fila aquí, en el mismo turno. |
| **Comunidad** | Muro simple (PostCard + VoteBar), votos ±, mejor respuesta, encuestas, Hoy en el barrio (24 h), rangos, monedas, Tabla del Barrio. (El Patio: después, G.) |
| **Eventos** | Publica tu evento → revisión → publicado; boletos, mesas, extras, cortesías, series; boleto QR; **modo puerta solo escanea** (D1). |
| **El Compa** | IA para vecinos, panel y equipo; respuestas automáticas solo Pro; prepara acciones que la persona confirma; nunca mueve dinero. |
| **Cuenta** | Una sola: teléfono verificado una vez; permisos por `BusinessMember` / `StaffMember`; cuenta borrada = 30 días y se borra todo salvo lo de Stripe (D5). |
| **Modelo de datos 1.2** | ~130 entidades en 13 áreas: la especificación de la base. |
| **Sistema de diseño** | Tokens, 73 íconos, **132 componentes** React (zip del 2 nov), 47 patrones aprobados. |

Fuentes, en orden: `docs/diseno/plan/` → `docs/diseno/entrega/modelo-datos.md` →
`solo-prototipo.md` (lo que NO se construye) → `docs/diseno/design-system/` → el
prototipo navegable (artifact `tolatino-master+`) → `memoria-del-diseno.md` (grep).
Si difieren: gana la decisión más reciente del fundador; luego el plan; el
prototipo manda en el comportamiento de pantalla.

---

## 2. Reglas que el código obedece (no se re-preguntan)

**Del diseño:** espejo de gestión · triángulo panel → página → admin · revisión
profunda con casos límite · mobile-first y desktop 100 % desktop · ciudad primero ·
nomenclatura `ÁREA-MÓDULO-PANTALLA[-ESTADO]` · una cuenta · bilingüe (UI en
`CmsString`; lo del negocio `{es,en}`; lo del vecino en su idioma con «Ver
traducción») · dinero en centavos, impuesto por ciudad · UTC + hora local · citas =
solicitud («Aprobar al instante» apagado por defecto) · nada se borra · derivado no
es dato · auditoría de toda acción del equipo · acciones sobre terceros con motivo
+ aviso + apelación · **nunca papeles** · Comida = categoría modelo; nada genérico
como respaldo · Pro primero con rotación diaria; 10 por página · reseña del
profesional, agregada en el local · negocios semilla solo desde recomendaciones ·
una línea que nunca se suaviza (911; «nadie te garantiza un resultado») · todo
sale del sistema de diseño; copy sobrio, español primero, sin emoji.

**Del fundador (hoy):** un código, cuatro apps (B) · el código es la fuente del
sistema de diseño (L) · sandbox y producción aislados (M) · guardianes permanentes
(N) · construir lo propio (O) · a la altura de los grandes (P) · seguro siempre (Q)
· la más rápida (R) · herramientas propias (S, T) · todo automático, el fundador
solo da el OK desde el teléfono (U) · documentar cada función para El Compa (V) ·
pruebas en dispositivos emulados + iPhone real (W) · cinco ciudades (X) · Pexels
para imágenes de catálogo (Y) · se abre cuando esté todo (A).

**Lo que no pasa a la app:** las 60 piezas de `solo-prototipo.md` (barras de
revisión, simulaciones, hora fija, «Entrar como», localStorage como base…), venta
de boletos en la puerta, negocios importados, Pro anual, la caja «línea fija», el
feed «aire», el código v1.

---

## 3. Arquitectura

### 3.1 Un solo código, cuatro apps
```
tolatino/
  apps/web/            Next.js (App Router) · UNA app con cuatro entradas
    (app)/             APP-*  vecinos: /, /negocios, /c/[categoria], /n/[slug], /buscar, /comunidad, /eventos, /cuenta
    (negocio)/         DASH-* /negocio/… (Panel v2)
    (repartidor)/      DLV-*  /repartidor (pedidos asignados, ruta, entregado; sin conexión)
    (puerta)/          CHK-*  /puerta (escanear QR; sin conexión)
    (onb)/             ONB-*  /publica · /entrar · /recuperar
    (admin)/           ADM-*  /admin/… (17 secciones; solo web)
  apps/mobile/         4 cáscaras Capacitor (ícono, nombre, pantalla de inicio, enlaces universales)
  packages/ui/         sistema de diseño: tokens → Tailwind, 132 componentes, 73 íconos (fuente de verdad, L)
  packages/taxonomy/   17 categorías, subcategorías, filtros, ALLOW, tesis, rótulos (datos)
  packages/i18n/       CmsString ES/EN
  packages/types/      tipos generados de la base + DTOs
  packages/db/         migraciones SQL idempotentes, RLS, funciones, índices, semilla (solo pruebas)
  services/            tiempo real (WebSockets), trabajos programados, El Compa, geo (geocodificar, rutas), imágenes
  guardianes/          los guardianes (N) como código: qué vigilan, umbral, a quién avisan, qué corrigen
  infra/               pruebas/ y produccion/: compose, cloud-init, deploy.sh, respaldos, observabilidad
  docs/                PLAN · DECISIONES · HERRAMIENTAS · PROGRESS · LAUNCH-CHECKLIST · ayuda/ (El Compa) · diseno/
```
Cada pantalla declara su código (`APP-NEG-LISTING-PRO`), su patrón y su acceso.

### 3.2 Servidores propios (C, C2, D, M)
- **Sandbox:** Hetzner Falkenstein, `tolatino-pruebas-1` (cx33, 4c/8GB), ya creado.
  Se sincroniza solo con la rama **`pruebas`** cada 60 s y ejecuta
  `infra/pruebas/deploy.sh`. Página de estado, respaldos automáticos, firewall solo web.
- **Producción:** EE. UU. (costa este); proveedor elegido con precios reales el día
  que se encienda (Hetzner Ashburn / DigitalOcean NY / Vultr NJ). Mínimo: app y base
  en máquinas separadas + réplica de lectura para análisis (T#33). Se sincroniza con
  la rama **`produccion`**, que solo avanza con el OK del fundador.
- **Cloudflare (gratis) delante de todo:** DNS de tolatino.com, CDN, protección,
  `pruebas.tolatino.com`.
- Todo por API y por el repo (GitOps): nadie entra a mano a un servidor. Emergencia
  = reconstruir desde cloud-init.

### 3.3 Piezas (todas propias o código abierto autoalojado)
| Pieza | Elección |
|---|---|
| Base de datos | **Postgres + PostGIS** (geo nativa, GIST), full-text + sinónimos, réplica de lectura. |
| Acceso | Propio: teléfono verificado una vez (SMS/WhatsApp), **sesión persistente + passkeys**, correo de recuperación (E). Permisos en la base (RLS) + servidor; el cliente nunca decide. |
| Archivos e imágenes | MinIO (S3 propio), redimensión al subir (960 px), WebP/AVIF, CDN de Cloudflare. Pexels para catálogo (Y). |
| Tiempo real | Servidor propio de WebSockets (pedidos/citas en vivo, chat, avisos). |
| Mapas y geo | MapLibre + teselas propias de OpenStreetMap (extracto de Pennsylvania), Nominatim/Photon propio para direcciones, OSRM propio para rutas del repartidor. |
| Búsqueda | Postgres full-text (ES/EN) + `Synonym` + trigram; `SearchLog` y «búsquedas sin oferta». Meilisearch propio si hace falta. |
| Pagos | Stripe Connect Express; PaymentIntent con captura manual (Retenido → Cobrado / Devuelto); **checkout en nuestra hoja**, nunca la página de Stripe. |
| Avisos | Web Push / FCM propios; SMS y WhatsApp pagados solo para lo crítico; plantillas en `NotificationTemplate`. |
| Correo | Plantillas e historial propios; envío por SES. |
| Observabilidad | Sentry/GlitchTip, Grafana + Prometheus + Loki, Uptime Kuma, rrweb (sesiones), Web Vitals propios, analítica propia (`ADM-ANALIT`). |
| Interruptores | `FeatureFlag` + `PlatformConfig` por ciudad, con porcentaje y A/B. |
| IA | Claude API para El Compa (Haiku; tope mensual desde el admin). |
| Seguridad | Cloudflare delante; límites de intentos propios; Semgrep + auditoría de dependencias en CI; 2FA del equipo; secretos solo en el entorno; cifrado en reposo. |

### 3.4 Tubería automática (T#16–18, U)
`commit` → CI (tipos, pruebas unitarias, **pruebas de punta a punta en dispositivos
emulados**, **pruebas visuales**, guardianes de seguridad, accesibilidad, velocidad,
build) → si todo pasa, avanza `pruebas` → el sandbox se actualiza solo → captura y
«qué mirar» al fundador → **OK desde el teléfono** → avanza `produccion` (mismo
paquete) → producción se actualiza; si suben los errores, **vuelve atrás sola**.

---

## 4. Base de datos
- Especificación: `docs/diseno/entrega/modelo-datos.md` 1.2. Se traduce a SQL por
  fases; no se re-diseña.
- Convenciones: `snake_case`; `money` = entero en centavos; `text·i18n` = `jsonb
  {es,en}`; `timestamptz`; horarios `time` local; `city_id` en toda tabla pública;
  derivados como vistas/caché con trigger, nunca columnas editables.
- `audit_entries` solo inserción (trigger). Estados, nunca `delete`.
- Índices para 1M+: GIST geo, GIN búsqueda, btree `(city_id, category_id, status)`,
  paginación por cursor.
- Migraciones idempotentes, aplicadas por la tubería: primero sandbox, producción
  solo con el OK. La semilla **nunca** corre contra producción (guardián).

---

## 5. Guardianes (N) — qué vigila cada uno
| Guardián | Vigila | Hace |
|---|---|---|
| Build | tipos, lint, tamaño del paquete, secretos en el código, datos inventados | rompe el build |
| Pruebas | unitarias + punta a punta en 9 dispositivos | bloquea el despliegue |
| Visual | capturas vs aprobadas | bloquea y pide aprobación |
| Triángulo | opción del panel ↔ página ↔ admin | bloquea; reporte |
| Seguridad | Semgrep, dependencias, cabeceras, RLS por tabla, permisos por ruta | bloquea; reporte |
| Accesibilidad | WCAG AA (axe) | bloquea |
| Velocidad | presupuesto por pantalla (Web Vitals) y por consulta | bloquea si excede; reporte |
| Errores en vivo | Sentry: nuevos errores, picos | agrupa, reporte, **propone la corrección**; vuelta atrás si es un despliegue |
| Dinero | Stripe ↔ libro propio, pagos al negocio fallidos | reporte inmediato |
| Costos | facturas de servidores, SMS, WhatsApp, IA | alerta por umbral |
| Datos | semilla nunca a producción; respaldo diario verificado; borrado a 30 días | bloquea; reporte |
| Documentación | toda función nueva trae su `docs/ayuda/` ES/EN (V) | bloquea el pase a producción |
| Salud | ¿está arriba?, latencia, disco, certificados | alerta; reinicia; reporte |
| Reporte diario | todo lo anterior | mensaje al fundador cada mañana (T#31) |

Los guardianes son código en `guardianes/`, con dueño, umbral y acción; crecen en
cada fase.

---

## 6. Orden de construcción (fases)

Reglas de toda fase: cliente + panel + Super Admin juntos · móvil primero y desktop
real · 9 estados por pantalla · ES/EN · pruebas automáticas + visuales · guardianes
nuevos cuando la fase los pide · `docs/ayuda/` de cada función (V) · captura real →
**OK del fundador en el sandbox**. Terminado = aprobado en pruebas y documentado.
**Nada se enciende en producción hasta la fase 9.**

| # | Fase | Qué se construye | Guardianes / herramientas que entran |
|---|---|---|---|
| 0 | **Cimientos** | Monorepo · sandbox terminado (deploy.sh, compose: Postgres+PostGIS, MinIO, tiempo real, observabilidad) · tubería CI/CD · **puerto del sistema de diseño** (`packages/ui`, 132 componentes, captura de catálogo) · shell (header, nav inferior, hojas, 9 estados) · i18n · **cuenta** (teléfono una vez, passkeys, sesiones, onboarding del vecino, Mi cuenta mínima) · **ciudad** (5 ciudades, radio con mapa, próximamente + lista de espera, teselas propias) · taxonomía como datos · **Super Admin esqueleto** (barra con ciudad, equipo y roles, matriz, auditoría, `CmsString`, flags, salud) · `docs/ayuda/` inicial | Build, Pruebas, Visual, Seguridad, Accesibilidad, Salud, Documentación, Datos |
| 1 | **Directorio** | Inicio · página de categoría (hero, subcategorías, filtros por familia, 10/página, Pro primero) · **ficha base Pro y Free** (Resumen, horario Pro, galería, Relacionados, Llamar / Cómo llegar / Compartir / Calendario) · Buscar (entendimos, sinónimos, Aún no hay) · Recomendar · **Publica tu negocio v2** · **Panel base** (Hoy, Tu página, Fotos, Horario, Equipo, fuerza del perfil) · Recuperar / reclamar · Licencia · **Admin:** Negocios 360°, Usuarios, colas sello · nuevos · recomendaciones · licencias, Catálogo · analítica propia (eventos) | Velocidad, Triángulo, analítica, grabación de sesiones |
| 2 | **Comida (modelo)** | Menú del cliente · pedido completo (entrega, carrito, impuesto por ciudad, **checkout propio con Stripe**, pago en el local, seguimiento, cambio propuesto, ayuda, recibo) · reservaciones · **Panel:** menú builder, pedidos + entrega (pickup · mi equipo · externa · envío), reservaciones, Clientes, Mensajes, **Cobros y plan** (Connect, Pro, prueba, día 20/25/29/30) · reseñas · novedades · Jobs · Mi cuenta completa · **Repartidor** (`/repartidor`, sin conexión) · **Admin:** Transacciones, Soporte, devoluciones, disputas, Planes, Contenido, Notificaciones | Dinero, Costos, tiempo real, push, SMS/WhatsApp/correo |
| 3 | **Belleza (citas)** | Booking con depósito, solicitud → confirmar / otra hora / no puedo / vence, «Aprobar al instante», staff con silla propia (su página, su agenda, reseña «vía»), ayuda con la cita · **Panel:** Servicios, Citas, Staff, techo Free · **Admin:** citas, staff | — |
| 4 | **Las otras 14 categorías**, grupo por grupo | Hogar + Auto → Doctores + Profesionales → Mercados + Tiendas → Fiestas + Transporte → Noche → Educación + Niños + Deporte → Iglesias + Bienes Raíces + Venta de Autos. Cada una: tesis, módulos, campos, filtros, flujo y «Tu herramienta», cliente + panel + admin, completa | — |
| 5 | **Comunidad** | Muro, publicar, comentar, mejor respuesta, encuestas, votos ±, Hoy en el barrio, seguir, bloquear, reportar, traducción, rangos, puntos, monedas, Tabla del Barrio, cuenta oficial por ciudad · **Admin:** Contenido, sanciones, apelaciones, Gamification | moderación automática, antiabuso |
| 6 | **Eventos** | Publica tu evento → revisión · listado y detalle · boletos, mesas, extras, códigos, cortesías · compra en nuestra hoja · boleto QR · **Puerta** (`/puerta`, varios porteros, sin conexión) · series · evento privado · **Panel:** Eventos · **Admin:** Eventos y boletos | — |
| 7 | **El Compa** | hoja de ayuda y pasos guiados; asistente del panel; respuestas automáticas Pro; copiloto del equipo; interruptores y tope; WhatsApp/SMS con enlace | tope de IA (Costos) |
| 8 | **Las cuatro apps en las tiendas** | cáscaras Capacitor, enlaces universales, TestFlight / Play interno, programa beta con «Reportar un problema», fichas de tienda | Mac en la nube |
| 9 | **Cierre y apertura** | Super Admin completo (Analítica, CMS, Crecimiento, Ciudades, Sistema) · legales por estado · exportar mis datos · landing de acceso anticipado y QR de calle (puede ir antes) · **producción encendida** (servidores EE. UU., Cloudflare, dominio) · respaldos y manual de incidentes probados · `LAUNCH-CHECKLIST.md` en cero · **apertura en las 5 ciudades** | todos |
| — | **El Patio** | después de la apertura (G) | — |

---

## 7. Cómo trabajamos
1. **El fundador describe; Claude anota y construye.** Una tarea por mensaje; una
   captura + una línea bastan. Todo lo aclarado va a `docs/DECISIONES.md`.
2. **Pantalla nueva = componer con el sistema → captura real → OK → conectar.**
3. **Nada requiere copiar y pegar** (U): Claude ejecuta con las credenciales del
   entorno; el fundador aprueba desde el teléfono. Lo que un tercero exija en
   persona se agrupa en un solo paquete de pasos.
4. **Sandbox → OK → producción**, siempre; producción nunca se toca a mano.
5. **Cada fase se cierra** con el triángulo, los casos límite, las pruebas, la
   documentación de ayuda y la captura aprobada.
6. **Lo diferido** → `docs/LAUNCH-CHECKLIST.md` en el momento. **Dónde estamos** →
   `docs/PROGRESS.md`. **Herramientas** → `docs/HERRAMIENTAS.md` (crece).
7. **Reporte diario** al fundador por los guardianes.
8. **Reportar con fidelidad:** lo que falla se dice; «listo» solo con la captura.
9. Modelo/esfuerzo (decisión Z): Opus 5.5/high para Fase 0, base, permisos, pagos,
   seguridad y bugs reincidentes; Sonnet 5.5/medium para pantallas y flujos; Haiku
   para lo mecánico; Fable 5.1 solo cuando Opus ya falló en algo caro. Nunca `max`.
   Una sesión por tarea; sesión nueva al terminar. Claude avisa cuándo cambiar.

---

## 8. Lo que se paga (lista cerrada)
SMS y WhatsApp (una vez por usuario + lo crítico) · envío de correo (SES) · Stripe ·
servidores (sandbox ≈ $12/mes hoy; producción al encenderla) · tiendas Apple
($99/año) y Google ($25) · IA de El Compa (con tope) · minutos de Mac en la nube
si se agotan los gratis. Nada más sin decisión del fundador.

## 9. Lo que el fundador hará en persona (una vez, cuando toque)
Cuentas y aceptación de términos que un tercero exige al dueño: Cloudflare (y
apuntar el dominio), proveedor de producción, Stripe (y Connect), Telnyx/Twilio con
registro 10DLC, Meta WhatsApp Business, Amazon SES, Apple Developer, Google Play,
Pexels (clave nueva). Cada una llega como un paquete de pasos para el teléfono, en
su fase, nunca antes.

## 10. Siguiente paso
Con el OK a este plan: `CLAUDE.md` definitivo queda en vigor y empieza la **Fase 0**
por el sandbox completo y el puerto del sistema de diseño, con la primera captura
en el teléfono.
