# To'Latino — Auditoría de lanzamiento (2026-07-21)

> Auditoría multi-agente contra los líderes de cada categoría (Yelp, DoorDash,
> Fresha, Turo, Eventbrite, Nextdoor, Shopify/Square). **8 de 14 superficies
> alcanzaron a auditarse** antes de tocar el límite de sesión; las 6 restantes
> quedan listadas al final para re-correr. Los **10 hallazgos más graves fueron
> re-verificados a mano en el código** (archivo:línea). Regla que rige todo:
> founder rule #8 — *"la confianza ES el producto; nada falso/roto se envía como
> final"*.

---

## Veredicto en una línea

**El motor es real y sorprendentemente bueno** — la mayoría de las superficies
están cableadas de verdad a Supabase/Stripe, no son maquetas. **Pero NO está
lista para lanzar con dinero real todavía**, por tres razones concretas y
arreglables: (1) hay **datos falsos** mostrándose sobre negocios reales en varias
pantallas, (2) **la ruta del dinero tiene huecos** (sin reembolsos, un redirect de
pago prohibido, y boletos que se emiten sin cobrar), y (3) **faltan piezas de
confianza/retención** (notificaciones de comunidad, moderación, recordatorios de
cita, mapa real).

Estimo el proyecto en **~75% funcional**. Lo que falta para "estelar y 100%" es
un sprint enfocado en **quitar lo falso + cerrar la ruta del dinero**, luego pulir.

---

## 🔴 BLOQUEANTES DE LANZAMIENTO (verificados a mano — arreglar SÍ o SÍ)

### Seguridad / dinero (lo más urgente)
1. **Boletos de evento se emiten SIN cobrar.** `buy_event_tickets_multi`
   (`0072_marketplace_checkout.sql`) valida capacidad, promo, fechas y visibilidad
   del tier… pero **nunca comprueba el pago**. Cualquier usuario autenticado puede
   llamar el RPC directo y emitirse boletos de pago **gratis**, saltándose Stripe.
   → El servidor debe rechazar tiers de pago cuando el organizador tiene
   `connect_charges_enabled` (mismo patrón que menú/renta ya usan).
2. **Redirect a Stripe hosted-Checkout prohibido, aún vivo en Eventos.**
   `Eventos.tsx:317-318` → `startMarketplaceCheckout(...)` + `window.location.href = url`.
   Es el patrón **explícitamente prohibido** por tu regla "checkout propio SIEMPRE".
   Todas las demás superficies ya cumplen; falta migrar esta a
   `startMarketplacePayment` + `CheckoutSheet`. (El de suscripciones del dueño en
   `Billing.tsx:79/93` es un caso aparte — ver "Decisiones tuyas".)
3. **No existe NINGÚN reembolso fuera del webhook.** Si la cocina rechaza un pedido
   pagado, o el cliente cancela un pedido/renta ya pagado, **el dinero se queda
   capturado**. El único refund que existe es cuando el webhook falla al cumplir.
   → Falta un flujo de reembolso (Stripe `refunds` con `reverse_transfer` +
   `refund_application_fee`, que ya se usa en `stripe-webhook:196`) para rechazo de
   cocina, cancelación temprana, y cancelación de renta.
4. **El cliente puede reescribir su propio pedido pagado** vía PostgREST (items,
   fulfillment) — el guard `tg_txn_customer_update_guard` no congela esas columnas.

### Datos falsos sobre negocios/usuarios reales (viola regla #8 = tu confianza)
5. **Teléfono y dirección FALSOS en listados reales.** `BizDetail.tsx:551-552`:
   `phone = b.phone || '(832) 555-4521'` y `address = b.address || '5821 Bellaire
   Blvd, Houston, TX'`. "Llamar" marca ese número y "Cómo llegar" navega ahí.
   → Ocultar Llamar/Cómo llegar/Ubicación cuando el dueño no configuró nada.
6. **Reseñas FALSAS cuando el negocio tiene cero.** `BizDetail.tsx:2836` inyecta
   `SEED_REVIEWS` (Ana M., Jonathan P., Roberto M.) con "útiles" inventados.
   → Mostrar estado honesto "Sé el primero en reseñar".
7. **Rating 4.9 hardcodeado** al etiquetar un negocio en Comunidad.
   `PublishModal.tsx:272` (`business_rating: taggedBiz ? 4.9 : null`) y
   `Comunidad.tsx:428`. Además solo deja etiquetar **4 negocios fixture** de Houston.
   → Etiquetar desde negocios reales cercanos con su rating real (el patrón correcto
   ya existe en `toggle_endorsement`, 0103).
8. **Histograma de rating 90/7/2 y estrellas siempre ★★★★★** hardcodeados para todo
   negocio (`BizDetail.tsx:2266`, `ui.tsx:228`).
9. **Fallback silencioso a 5 posts demo en Comunidad ante cualquier error.**
   `live.tsx:1011-1014`: si una query falla (o Supabase se cae en prod), el feed
   muestra vecinos ficticios (Carlos R., Doña Lucía) como reales, sin aviso.
   → Estado de error/vacío honesto, nunca personas inventadas.
10. **"Crear evento" desde el FAB Publicar es un stub de éxito falso.**
    `PublishModal.tsx:749-762`: los inputs no tienen estado y "Publicar" hace
    `setDone(true)` → "Tu evento ya está publicado" sin guardar nada.
11. **Renta: flujos walk-in "Rentar/Devolver" del panel son teatro.**
    `Rental.tsx:737/745` — `RentOutFlow`/`ReturnFlow` **no escriben nada a la DB**
    pero avisan "Rentado · depósito cobrado" / "Depósito devuelto".
12. **Tracking USPS falso** en pedidos de tienda reales. `Fulfillment.tsx:102`
    `genTracking()` inventa un número creíble `9400 1000 0000 ...`.
13. **Panel de negocio: `/negocio/publicar` tiene un formulario de tarjeta FALSO**
    ("Pago seguro", plan $4.99 que no existe) y no crea ningún negocio — y el panel
    real enlaza a él desde "Publicar otro negocio" y varios estados vacíos.
14. **Billing muestra dinero inventado a negocios que PAGAN** (renovación "14 Nov",
    Visa ••4421, historial de facturas y medidores de uso ficticios).
15. **Staff: nómina/horario/reloj 100% falsos** a dueños Verified/Premium reales,
    incluido un botón "Correr nómina · $6,404" que solo muestra un toast.

### Integridad de reservas (la barbería del sábado)
16. **Reservas "Cualquiera" (any professional) son invisibles a TODO chequeo de
    conflicto** → hueco de sobre-reserva en negocios con equipo.
17. **La capacidad por sesión NO se valida en el servidor** (solo cliente), y ni
    siquiera cuenta el grupo que entra. Un sábado doble-reservado mata la confianza.

---

## Por superficie — qué funciona / qué falla / qué falta para competir

### 🟢 Comunidad (vs Nextdoor) — motor real, falta capa social/seguridad
- **Real y sólido:** feed geo (30 mi), posts con fotos/encuestas/comentarios+respuestas,
  likes/guardados, realtime (píldora de nuevos, ediciones/borrados en vivo), follows,
  editar/borrar/reportar, auto-post "recomienda" desde endorsements, guest read-only.
- **Roto:** rieles Tendencias/Vecinos sugeridos son fixtures; sin filtro de barrio en
  móvil (¡99% de tus usuarios!); posts exponen coordenadas exactas del autor
  (riesgo de privacidad/doxxing); `posts_near` no usa el índice GIST y no pagina.
- **Falta para ganar:** notificaciones de actividad (comentario/respuesta/like/seguidor)
  — sin esto muere la retención; **moderación** (cola de reportes, auto-ocultar);
  DMs entre vecinos; perfiles de usuario; grupos/colonias; alertas de seguridad.

### 🟢 Negocios / Directorio (vs Yelp) — buscador real, datos demo contaminan
- **Real:** búsqueda FTS server-side con geo-ranking, filtros Yelp-grade, abierto/cerrado
  en vivo con excepciones, reseñas reales con foto+respuesta del dueño, endorsements,
  guardados, chat, métricas de descubrimiento.
- **Roto:** los datos falsos #5-#8 de arriba; 3 botones muertos ("Llamar" en tarjeta,
  "Compartir", "Reportar un problema"); **sin mapa real** (desktop dice "Mapa (demo)");
  navegación tope 50 negocios con paginación solo-cliente.
- **Falta:** mapa real; flujo "reclamar mi negocio"/verificación (sin esto ningún negocio
  puede volverse Verified — el ranking verified-first es una promesa sin camino);
  ordenar resultados; páginas por-negocio indexables (SEO).

### 🟢 Pedidos de comida (vs DoorDash) — la superficie MÁS real
- **Real end-to-end:** menú builder, carrito con re-precio server-side, checkout propio
  con Payment Element, COD, cocina aceptar/rechazar con ETA, tracking en vivo, propinas,
  promos %, 86/agotados, web push.
- **Roto:** sin reembolso (#3); redirect prohibido en eventos (#2); cliente edita pedido
  pagado (#4); tracking USPS falso (#12); **tarifa de zona nunca se cobra** (todos pagan
  zona 1); **sin cierre por horario** (pedidos entran con el negocio cerrado);
  Vender-vs-Catálogo no forzado en servidor; toggles decorativos (auto-asignar chofer,
  tracking en vivo, automatización de menú); **stock nunca se decrementa ni valida**.
- **Falta:** reembolso/soporte; GPS del repartidor; pedidos programados; modo pausa.

### 🟢 Tienda / Productos (vs Amazon/Shopify) — real, faltan fundamentos de comercio
- **Real:** CRUD dueño con variantes y stock por variante, storefront Instacart-grade,
  carrito, checkout propio, modelo canónico respetado, guardado-para-después, cross-sell.
- **Roto:** **inventario nunca decrementa ni se valida en servidor** (oversell posible);
  descuentos de tienda se crean pero **nunca se pueden canjear**; 3 de 4 tipos de descuento
  muertos; envío por-producto decorativo; sin impuestos; sin paginación server.
- **Falta:** reseñas por-producto; envío real con dirección+tarifas; impuestos; búsqueda
  global de productos.

### 🟢 Servicios / Reservas (vs Fresha/Booksy) — flujo real, huecos de sobre-reserva
- **Real:** catálogo, picker de profesional, slots por horario×duración, feed de ocupación
  por-staff, aprobación forzada en servidor (0095), anti-doble-reserva por profesional
  (0092), modelo de cobro canónico, agenda del dueño con walk-ins, cancelar/reagendar.
- **Roto:** #16 y #17 (sobre-reserva); Staff falso (#15); vende "Recordatorios SMS —
  Incluido en Premium" que **no existen**; slots pasados en negocios sin horario; sin
  lead-time mínimo (reservable "ahora mismo").
- **Falta:** **recordatorios de cita** (staple de Booksy); auto-asignar "Cualquiera";
  horarios/vacaciones por profesional; reagendar desde la agenda; política de cancelación.

### 🟢 Renta (vs Turo/Airbnb) — muy cableado, sin historia de reembolso
- **Real:** carrito multi-ítem por fechas, anti-doble-reserva server, checkout propio,
  **depósito como hold real de Stripe** (Turo-grade), aprobación forzada, ops en vivo.
- **Roto:** teatro walk-in (#11); **sin reembolso/cancelación de renta pagada** (#3);
  el hold de depósito se pone al reservar pero **caduca en ~7 días** (muerto al devolver);
  promos de renta no canjeables; reglas de disponibilidad por-ítem ni se muestran ni se
  aplican; KPIs del panel desconectados de órdenes reales; órdenes fixture parpadean.
- **Falta:** política de cancelación+reembolsos; re-autorizar el depósito al entregar;
  verificación de identidad del rentador; waiver; flujo de reclamo por daños con fotos.

### 🟢 Eventos (vs Eventbrite) — espina real, ruta de pago débil
- **Real:** venta atómica con capacidad, tiers con ventanas y acceso oculto, QR + check-in
  con cámara, waitlist, promos, KPIs organizador, descubrimiento geo+FTS, cancelar.
- **Roto:** #1, #2, #10 de arriba; descuento mostrado pero **precio completo cobrado**;
  tier oculto pagado → cobra y auto-reembolsa sin boletos; evento de pago sin Stripe
  promete "Reservar" que el código rechaza; multi-listing muestra eventos en cada tab.
- **Falta:** **reembolsos**; editar evento tras publicar; boleto por email; páginas por-evento
  con OG para compartir; exportar/mensajear asistentes.

### 🟢 Panel de negocio (vs Shopify/Square) — shell real, 3 superficies falsas
- **Real:** shell (nav/switcher/avisos), Inicio + Estadísticas (métricas reales), CRM
  (clientes/pedidos/reseñas), Mensajes, Novedades, Promos, Pagos/Connect, planes vía Stripe.
- **Roto:** `/negocio/publicar` falso (#13); Billing inventado (#14); Staff falso (#15);
  Candidatos/Jobs fixture; **precio de plan se contradice** ($4.99 en onboarding vs $19/$49
  en Billing); "Reportar" reseña es teatro local; botones muertos (Pausar, Exportar);
  gates de plan solo-cliente (sin enforcement server).
- **Falta:** estado real de suscripción en Billing; onboarding real de negocio;
  cuentas de staff con acceso; enforcement de tier en servidor; reportes/export.

---

## 🔧 Lo que te toca a TI (el fundador) — ningún código lo resuelve

1. **Stripe modo live:** claves live, Connect activado, comisión de plataforma confirmada
   (¿15%? cuadrar con `02-pedidos.md`), webhooks apuntando a prod.
2. **Supabase prod:** plantillas de email OTP + SMTP (Amazon SES), dominio propio,
   confirmar qué features de auth (¿solo email OTP? ¿WhatsApp? ¿password?).
3. **Decisión de pago del dueño:** ¿Stripe hosted-Checkout para **suscripciones del
   dueño** (Billing.tsx:79) es la excepción sancionada, o también va en hoja propia?
   Tu regla "checkout propio SIEMPRE / anything future" es ambigua aquí — decide y
   documenta en LAUNCH-CHECKLIST.
4. **Precio canónico de planes** (hay contradicción $4.99 vs $19/$49) — una sola lista.
5. **Impuestos:** confirmar posición (hoy no se cobra IVA/tax en ninguna superficie).
6. **Legales:** ¿existen Términos y Privacidad? (no los encontré) — obligatorio antes de
   cobrar y de exponer datos de vecinos.
7. **Plan de moderación y canal de soporte** (para reportes y reembolsos).
8. **Reembolsos:** definir la política (ventanas, quién puede) antes de mover tarjetas.

---

## ⏳ NO auditado (cortado por límite de sesión — re-correr tras el reset 2pm UTC)

Estas 6 áreas quedaron sin auditar; recomiendo re-correr el mismo workflow para
completarlas (son justo las de mayor riesgo de lanzamiento):

1. **Pagos / Stripe** — la ruta del dinero completa (Connect, comisiones, webhooks,
   ENV que debes configurar). *Parcialmente cubierto por los hallazgos de arriba.*
2. **Datos / escala / seguridad** — RLS en cada tabla, RPCs anon que filtren PII,
   índices geo/FTS, N+1, buckets de storage, datos demo que NO deben ir a prod.
3. **i18n + diseño** — strings sin `L('es','en')`, hex crudo en className, mobile-first.
4. **PWA / SEO** — manifest, service worker (¿el de push está en /public?), indexabilidad,
   JSON-LD LocalBusiness, OG tags, 404/500.
5. **Auth + Mi cuenta** — métodos de sesión, push VAPID end-to-end, historial, merges guest→user.
6. **LAUNCH-CHECKLIST vs realidad** — reconciliar qué ítems ya están hechos/desfasados.

---

## Plan sugerido (orden de ataque)

**Sprint 1 — "Cero mentiras + dinero seguro" (bloqueante de lanzamiento):**
quitar/ocultar TODOS los datos falsos (#5-#15), cerrar la ruta del dinero
(#1-#4: cobro de boletos server-side, matar el redirect prohibido, reembolsos,
guard de edición), y tapar la sobre-reserva de servicios (#16-#17).

**Sprint 2 — "Confianza y retención":** notificaciones de comunidad, moderación
mínima, recordatorios de cita, mapa real, cierre por horario, tarifa de zona real.

**Sprint 3 — "Competir de verdad":** reclamar-negocio/verificación, reseñas de
producto, SEO por-negocio/evento, envío real, y las 6 áreas no auditadas.

> Cuando digas, ataco el Sprint 1 superficie por superficie (cada arreglo con su
> verificación en browser antes de desplegar) y re-corro la auditoría de las 6
> áreas faltantes tras el reset de sesión.
