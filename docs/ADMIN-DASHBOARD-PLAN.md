# Super Admin Dashboard — Plan Maestro

> **Estado: FASE 1 CONSTRUIDA Y DESPLEGADA (2026-07-24).** Migraciones 0120+0121
> aplicadas; `/admin` en vivo con Inicio · Usuarios · Negocios · Licencias ·
> Bitácora. Fases 2 y 3 pendientes (§6).
> Este documento es la fuente de verdad del panel de control total de To'Latino.
> **REGLA PERMANENTE:** cada módulo/feature nuevo de la plataforma DEBE agregar su
> superficie de control aquí (ver §7 "Gobernanza"). Esa regla vive también en
> `CLAUDE.md` (Definition of done) y en el skill `tolatino-standards`.

## 0 · Qué existe hoy (inventario real, verificado en producción)

**59 tablas** agrupadas así:

| Dominio | Tablas |
|---|---|
| Identidad | `profiles`, `user_addresses`, `push_subscriptions`, `follows` |
| Negocios (core) | `businesses` (54 cols: tier, modules, 5 configs, Stripe Connect, licencias re/auto), `categories`, `cities`, `amenities`, `business_amenities`, `business_photos`, `business_relations`, `business_staff`, `business_jobs`, `business_customers`, `business_metric_daily`, `business_subscriptions` |
| Comercio | `business_items` (menú/tienda/servicios), `business_orders`, `business_bookings`, `business_rentals`, `business_rental_orders`, `business_conversations`, `business_messages`, `business_updates` (+likes) |
| Comunidad | `posts`, `post_comments`, `post_likes`, `comment_likes`, `poll_votes`, `saved_posts`, `saved_businesses`, `post_reports` (único moderation queue hoy), `reviews`, `business_endorsements` |
| Eventos | `events`, `event_tiers`, `event_tickets`, `event_seat_claims`, `event_promo_codes`, `event_waitlist`, `event_attendance`, `event_reviews` |
| Bienes Raíces | `properties`, `property_leads`, `property_tours`, `property_saves` |
| Autos | `vehicles`, `vehicle_leads`, `vehicle_tests`, `vehicle_saves` |
| Dinero | `payments` (ledger), `pending_purchases` (staging de Stripe), `market_rates` |
| Plataforma | `notifications`, `feature_suggestions`, `subcategory_suggestions`, `schema_migrations` |

**10 edge functions:** `marketplace-checkout`, `stripe-webhook`, `stripe-checkout`,
`stripe-portal`, `connect-onboard`, `connect-status`, `refund-purchase`,
`rental-deposit`, `send-push`, `fred-rates` (+ cron semanal `fred-rates-weekly`).

**Brechas descubiertas** (el plan las crea):
- ❌ **No hay rol de admin** — nadie puede moderar/intervenir hoy salvo por SQL.
- ❌ **No hay reclamos** (disputas comprador↔vendedor). Solo `post_reports`.
- ❌ **No hay audit log** de acciones administrativas.
- ❌ **No hay feature flags / kill-switches** ni config de plataforma editable.
- ❌ **No hay suspensión** de usuarios ni negocios.

---

## 1 · Arquitectura de seguridad (lo más crítico — construir PRIMERO)

Principio: **el admin nunca "salta" la seguridad desde el cliente**. Todo pasa por
RPCs `SECURITY DEFINER` que verifican rol y auditan. La app es estática (export),
así que el bundle de `/admin` no contiene nada sensible: sin rol válido, los RPCs
devuelven `forbidden` y la UI ni carga datos.

```
admins            (user_id PK → auth.users, role, created_by, created_at)
                  role: 'superadmin' | 'soporte' | 'moderador' | 'finanzas'
admin_audit       (id, actor_id, action, entity_type, entity_id, before jsonb,
                   after jsonb, reason text, created_at)  — INMUTABLE (solo insert)
platform_flags    (key PK, enabled bool, payload jsonb, updated_by, updated_at)
                  → kill-switch por vertical/módulo, banner global, maintenance
platform_config   (key PK, value jsonb, updated_by, updated_at)
                  → fees (5% servicio, 15% comisión), límites, textos legales
claims            (id, kind: orden|reserva|renta|boleto|otro, ref_id, business_id,
                   claimant_id, against, status: abierto|en_revision|resuelto|
                   rechazado, assigned_to, resolution, refund_payment_id,
                   messages jsonb[], created_at, resolved_at)
reports           (id, entity_type: post|comment|review|business|event|property|
                   vehicle|update|user|message, entity_id, reporter_id, reason,
                   status: pendiente|revisado|accionado|descartado, handled_by,
                   handled_at, created_at)  — generaliza post_reports
profiles          + suspended_until timestamptz, suspended_reason
businesses        + suspended bool, suspended_reason, verified_license bool
```

- Helper SQL `_require_admin(min_role)` — todo RPC admin lo llama primero.
- **Roles:** `superadmin` (todo, único que gestiona admins y config), `finanzas`
  (dinero/reembolsos), `moderador` (contenido/reportes/reclamos), `soporte`
  (lectura + acciones suaves: reenviar notificación, responder reclamo).
- **Primer superadmin:** dev@payxer.com (seed en la migración).
- Toda mutación admin escribe `admin_audit` (dentro del mismo RPC, misma tx).
- Los RPCs de LECTURA admin también verifican rol (nada de "public read" amplio).
- Reglas founder aplican: Spanish-first, tokens del design system, mobile-first
  (el founder administra desde el teléfono), checkout propio no aplica aquí.

## 2 · Superficie: ruta y navegación

- **Ruta `/admin`** dentro de la misma PWA (guard: sesión + fila en `admins`;
  si no → 404 amable). Header propio "To'Latino · Admin" + nav lateral (desktop)
  / drawer (móvil), MISMO design system.
- **12 secciones** (abajo). Cada una: lista → detalle → acciones, con búsqueda,
  filtros y paginación keyset (escala 1M+), todo vía RPCs `admin_*`.

## 3 · Las 12 secciones y qué controla cada una

### 3.1 Inicio (mission control)
- KPIs: GMV hoy/7d/30d, usuarios totales/nuevos, negocios por tier, órdenes/
  reservas/boletos hoy, ingresos por comisión.
- **Alertas accionables**: `pending_purchases` atascadas en `fulfilling` (>15 min
  — el riesgo residual del webhook documentado), reportes pendientes, reclamos
  abiertos, licencias por verificar, webhooks fallidos, suscripciones impagas.
- Actividad en vivo (últimos pagos, registros, publicaciones).

### 3.2 Usuarios
- Buscar por email/nombre/ciudad; ficha 360°: perfil, direcciones, órdenes,
  reservas, boletos, posts, reseñas, reportes hechos/recibidos, dispositivos push.
- Acciones: **suspender/reactivar** (con razón → audit), editar perfil, forzar
  logout (revocar sesiones vía API admin de Supabase), exportar datos (GDPR),
  eliminar cuenta, enviar notificación directa.

### 3.3 Negocios
- Buscar/filtrar por categoría/ciudad/tier/estado Stripe; ficha 360°: listado,
  módulos, configs, staff, métricas, suscripción, pagos recibidos.
- Acciones: editar cualquier campo, **cambiar tier** (comp/castigo), **suspender**
  (oculta del cliente), transferir dueño, toggles de módulos, ver como cliente.
- **Cola de verificación de licencias** (re_config/auto_config): aprobar →
  `verified_license` + badge; rechazar con razón (notifica al dueño).

### 3.4 Moderación (reportes)
- Cola unificada `reports` (todas las entidades) + migrar `post_reports`.
- Ver contenido reportado en contexto → acciones: descartar, **ocultar**,
  **eliminar**, suspender autor, marcar accionado. Strikes por usuario.

### 3.5 Reclamos (disputas)
- `claims`: comprador abre desde Mi Cuenta (orden/reserva/renta/boleto) — hilo
  de mensajes 3-bandas (cliente·negocio·To'Latino).
- Admin: asignar, pedir evidencia, resolver con **reembolso directo** (invoca
  `refund-purchase` desde el RPC/función con audit), o rechazar con razón.
  SLA visible (tiempo abierto).

### 3.6 Dinero
- Ledger `payments` filtrable (negocio, kind, estado, rango) + export CSV.
- Monitor `pending_purchases`: atascadas → **reintentar fulfill / reembolsar**.
- Reembolsos manuales (cualquier pago) con razón → audit.
- Suscripciones de negocios (estado, impagas, cancelar/comp).
- Config de fees en `platform_config` (5%/15% dejan de estar hardcodeados en la
  edge function: la lee de config con fallback).
- `market_rates` (ver/forzar refresh). Link directo al dashboard de Stripe.

### 3.7 Pedidos y transacciones (cross-negocio)
- Vista global de `business_orders` + `bookings` + `rental_orders` +
  `event_tickets` — buscar por código, cliente o negocio.
- Intervenir: cambiar estado, cancelar, reembolsar, reasignar — todo auditado.

### 3.8 Contenido (todas las verticales)
- Tabs: Comunidad (posts/comentarios), Eventos, Propiedades, Vehículos,
  Novedades, Reseñas (negocio y evento), Empleos.
- Acciones: buscar, editar, **ocultar/restaurar**, eliminar, **destacar**
  (featured en descubrimiento), corregir categoría/geo.

### 3.9 Catálogo de plataforma
- `categories` (orden, nombres), `subcategory_suggestions` y
  `feature_suggestions` (aprobar → merge al catálogo), `cities`, `amenities`.

### 3.10 Notificaciones y anuncios
- Broadcast segmentado (ciudad/rol/vertical) → `notifications` + `send-push`.
- Historial de envíos; plantillas ES/EN.

### 3.11 Analíticas
- Crecimiento semanal (usuarios, negocios, GMV), por vertical y por ciudad;
  `business_metric_daily` agregado; funnel de compra; top negocios.

### 3.12 Sistema y equipo
- Salud: edge functions (última ejecución/error), cron jobs, últimas entregas
  de webhook, migraciones aplicadas.
- **Feature flags** (`platform_flags`): apagar una vertical/módulo con un
  toggle (kill-switch), banner global, modo mantenimiento.
- **Equipo admin** (solo superadmin): invitar/quitar admins, cambiar roles,
  ver el audit log completo con filtros.

## 4 · Cambios en el lado del usuario que este plan requiere
- Botón **"Reportar"** en: reseñas, negocios, eventos, propiedades, vehículos,
  novedades, mensajes (hoy solo posts lo tienen) → `reports`.
- **"Abrir reclamo"** en Mi Cuenta sobre cada orden/reserva/renta/boleto →
  `claims` + hilo de mensajes.
- Gating de suspensión: usuario suspendido no puede escribir; negocio suspendido
  desaparece del cliente (RLS + RPCs de lectura filtran `suspended`).
- Flags: el cliente lee `platform_flags` (público-lectura) para kill-switches.

## 5 · Nuevos objetos de BD (migración 0120, con Opus)
Tablas: `admins`, `admin_audit`, `claims`, `reports`, `platform_flags`,
`platform_config`. Columnas: `profiles.suspended_until/reason`,
`businesses.suspended/reason/verified_license`. Helper `_require_admin()`.
~40 RPCs `admin_*` (lista completa la deriva Opus de §3, uno por acción).
RLS: `admins`/`admin_audit`/`platform_config` sin acceso de cliente;
`platform_flags` lectura pública; `claims`/`reports` insert por dueño del
recurso, lectura por partes + admin.

## 6 · Fases de construcción (con Opus — seguridad = tier alto)
1. **Fase 1 — Fundación: ✅ HECHA** (2026-07-27) — migración 0120 + 0121, guard
   `/admin`, shell, Inicio + Usuarios + Negocios (incl. licencias) + Bitácora.
2. **Fase 2 — Confianza: ✅ HECHA** (2026-07-27) — migraciones 0122–0125,
   Moderación + Reclamos + Dinero + Pedidos en `/admin`, y el lado usuario:
   botón **Reportar** en las 9 entidades reportables + **Mis reclamos** en Mi
   cuenta. Detalle abajo.
3. **Fase 3 — Operación + rediseño v2: ✅ HECHA** (2026-07-28) — se rediseñó
   TODA la consola al handoff `06-super-admin` **v2** (14 secciones, escritorio-
   primero con drawer en móvil, sidebar oscuro agrupado con badges de pendientes,
   nav por rol) y se construyeron las 6 secciones nuevas con su backend
   (migraciones 0126–0129). Detalle abajo.

### Fase 3 — qué quedó construido (referencia)
- **Rediseño v2:** `Admin.tsx` reconstruido + `screens/admin/ui.tsx` (primitivas).
  Sidebar `#1E1B2E` con grupos (Centro de mando · Personas · Confianza ·
  Operación · Plataforma · Módulos), header sticky con búsqueda contextual +
  badge de rol, hoja de acción **unificada con razón obligatoria** (todo lo
  destructivo pasa por ahí). SOLO tokens (`ink`/`primary`/`dash`/`lilac`/…); se
  añadió `primary.soft` para el logo sobre el sidebar oscuro.
- **Nav por rol (server + UI):** superadmin ve todo; finanzas/moderador/soporte
  ven solo lo suyo (secciones ajenas atenuadas → "Sin acceso"). El servidor lo
  vuelve a exigir: verificado que un moderador recibe `forbidden` en Dinero,
  kill-switches y reembolsos.
- **6 secciones nuevas** (migraciones 0126–0128):
  - **Zonas activas** — agregados por ciudad (negocios/usuarios/GMV/tendencia),
    estado hot/growing/cooling/dormant/uncovered, ratio usuarios·negocio, bloque
    "Mayor oportunidad", saltos a Negocios/Campaña.
  - **Stream** — feed de Comunidad con stats, marcado por **palabras clave**
    (IA real diferida), destacar/fijar/ocultar/eliminar por post.
  - **Contenido** — 6 verticales en una lista: destacar en descubrimiento
    (columna `featured` nueva), ocultar, eliminar.
  - **Catálogo** — categorías (reordenar/renombrar), amenidades, ciudades
    (6,978, buscadas en servidor), sugerencias de negocios (aprobar/rechazar).
  - **Notificaciones** — broadcast segmentado con alcance en vivo + historial
    con tasa de apertura real (via `notifications.read`).
  - **Analíticas + Sistema** — crecimiento por vertical/ciudad, embudo real
    (vistas→contacto→pago), salud del sistema, **kill-switches** con efecto real
    (platform_flags), equipo admin (invitar/rol/quitar), bitácora inmutable.
- **Módulos** — Eventos/Bienes Raíces/Autos con KPIs + filas reales por pestaña;
  Trabajos/Transporte como **piloto** (aviso ámbar, sin filas) hasta que esas
  verticales existan como producto.
- **Bug corregido en verificación (0129):** `admin_funnel` tenía una columna de
  salida `count` que ensombrecía la función agregada `count(*)` → embudo vacío;
  renombrada a `cnt`.

### Fase 2 — qué quedó construido (referencia)
- **Migraciones:** `0122` (columna `hidden` en posts/comentarios/reseñas/reseñas
  de evento + RLS `using (not hidden)`, 15 RPCs de moderación/reclamos/dinero/
  pedidos), `0123` (`create_report` resuelve slug→uuid para negocio y evento;
  `event_reviews_by_slug` devuelve `id`), `0124` (`create_claim` deduce el
  negocio de la compra y valida que sea del que reclama), `0125` (evento →
  negocio vía `event_business_id`; arregla boletos en Pedidos, en reclamos y en
  el reembolso).
- **Edge function:** `refund-purchase` acepta `kind:'payment'` (reembolso manual
  del admin). La autorización la exige Postgres dentro de `admin_refund_ctx` /
  `admin_refund_finalize` bajo el JWT del que llama — la función no decide.
- **Una sola cola de reportes:** `post_reports` (0009) quedó **obsoleta**; el
  cliente escribe siempre en `reports` vía `create_report`. No reintroducir
  escrituras a `post_reports`.
- **Escalada de 2 pasos en un reclamo** (patrón Amazon/DoorDash): primero el
  cliente le escribe al negocio desde el detalle del pedido; si eso no resuelve,
  "El negocio no responde — abrir reclamo" abre el caso con To'Latino. El hilo
  es el mismo objeto para los 3 lados (cliente · negocio · admin).
- **La bitácora es inmutable de verdad:** su FK al actor impide borrar un usuario
  admin que ya actuó (el `ON DELETE SET NULL` choca con el trigger). Para retirar
  a un admin: borra su fila de `admins` y bloquéalo en `auth.users`; **no** lo
  borres.

## 7 · GOBERNANZA (regla permanente)
**Todo lo nuevo nace con su control de admin.** A partir de ahora, la Definition
of done de CUALQUIER feature incluye: *"la entidad/flujo nuevo tiene su
superficie en el Super Admin (lista/detalle/acciones/audit) o una entrada
explícita en este documento §3 con su fase"*. Un módulo sin control de admin NO
está terminado. (Regla replicada en `CLAUDE.md` y en el skill
`tolatino-standards` para que obligue a toda sesión futura.)
