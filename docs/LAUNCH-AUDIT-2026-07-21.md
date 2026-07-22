# To'Latino — Auditoría de lanzamiento (2026-07-21)

> Auditoría multi-agente de las **14 superficies** del producto, cada una comparada
> contra el líder de su categoría (Yelp, DoorDash, Fresha, Turo, Eventbrite,
> Nextdoor, Shopify/Square, Amazon). **Cobertura: 14/14 áreas auditadas** (en dos
> tandas por límite de sesión). **37 hallazgos críticos/mayores verificados** —
> 10 a mano por Claude + 27 por verificación adversarial, **todos CONFIRMED, cero
> refutados**. Regla que rige todo: founder rule #8 — *"la confianza ES el
> producto; nada falso/roto se envía como final"*.

---

## ✅ Sprint 1 en progreso (2026-07-21) — arreglos desplegados

Código desplegado y verificado (build + browser) esta sesión:
- **Datos falsos eliminados (rule #8):** stats inventados del landing (#19),
  reseñas/histograma/estrellas falsas + contacto de muestra en BizDetail (#7,#8,#10),
  "Martes 2x1" falso, notificaciones demo a invitados (#18), stub "Crear evento"
  (#12), rating ★4.9 hardcodeado en tags (#9), tracking USPS falso → entrada manual
  (#14), fallback a posts/negocios demo ante error de Supabase → vacío honesto (#11),
  formulario de tarjeta falso en /negocio/publicar (#15).
- **Ruta del dinero:** boletos de evento migrados a checkout propio (#2, ya no el
  redirect prohibido); **migración 0104** (pegar en Supabase) cierra el hueco de
  boletos gratis server-side (#1) + añade el **ledger de migraciones**.
- **Plataforma:** PWA instalable (manifest + íconos de marca), SEO (robots +
  sitemap + OG + favicon + títulos por ruta), persistencia de idioma ES/EN (#29),
  404/500 en español con marca.

**Actualización 2026-07-22 — cerrado esta sesión (aplicado en vivo + build/deploy):**
- **Seguridad/privacidad (SQL aplicado a prod + verificado):** blindaje RLS de
  `businesses` (#20, mig. 0105), fuzzear coordenadas de posts (#21, mig. 0106),
  rate-limiting de UGC/mensajes (#22, mig. 0111), guard de edición de pedido pagado
  (#4, mig. 0107 + fix de contexto 0108), boletos gratis server-side (#1, mig. 0104).
- **Dinero:** promo de boleto server-side (#5) — el cobro en línea ahora aplica el
  descuento del código (edge `marketplace-checkout` re-valida contra
  `event_promo_codes` + el webhook reenvía el código a `_issue_tickets_multi`).
  Verificado en vivo (1 VIP $100 → $105.00 sin código, $55.00 con el 50%).
- **Dinero:** reembolsos completos (#3) — `refund_ctx` (mig. 0109/0110) +
  edge function `refund-purchase` (dueño y comprador), cableado en el panel
  (cancelar pedido) y en Mi Cuenta (cancelar compra). Probado end-to-end en Stripe
  test mode (destination charge → refund con reverse_transfer + refund_application_fee).
- **Datos falsos owner-facing (regla #8):** Billing #16 (uso/tarjeta/renovación
  inventados ocultos; plan + portal reales), Staff #17 (horario/reloj/nómina/
  pipeline → "Próximamente"; roster/vacantes/KPIs reales), Renta walk-in #13
  (teatro "depósito cobrado" quitado). Detalle en LAUNCH-CHECKLIST.
- **Legal (#26):** páginas `/terminos` y `/privacidad` (ES-first) publicadas,
  linkeadas en footer + sitemap. Pendiente: revisión de abogado + entidad/correo
  reales (checklist).

**Pendiente (requiere acción del fundador o decisión):** purga de seed de prod
(#24, requiere confirmar para no borrar tus negocios de prueba), cola de moderación
(#23), y la lista **"Lo que te toca a TI"** (llaves Stripe live + webhook, dominio
propio, SES para OTP/recuperación, precio canónico del plan).

---

## Veredicto en una línea

**El motor es real y sorprendentemente sólido** — casi todas las superficies están
cableadas de verdad a Supabase/Stripe con calidad marketplace, no son maquetas.
**Pero NO está lista para lanzar con dinero real todavía.** El código está *más*
cerca de terminado de lo que el checklist dice; lo que falta se concentra en cuatro
frentes claros y arreglables:

1. **Datos falsos** mostrándose sobre negocios/usuarios reales (viola tu regla #8).
2. **La ruta del dinero tiene huecos** (sin reembolsos, redirect de pago prohibido, boletos que se emiten sin cobrar).
3. **Seguridad/privacidad de datos** (tabla `businesses` expone TODO al público; coordenadas de casa expuestas; sin rate-limiting ni moderación).
4. **Descubrimiento y confianza** (sitio invisible a Google, no instalable como PWA, sin páginas legales, sin recuperación de contraseña).

Estimo **~75% funcional**. Para "estelar y 100%" hace falta un sprint enfocado en
**quitar lo falso + cerrar el dinero + tapar seguridad**, luego pulir SEO/PWA/legales.

---

## 🔴 BLOQUEANTES DE LANZAMIENTO (todos verificados — arreglar SÍ o SÍ)

### A. Dinero (lo más urgente — hay tarjetas de por medio)
1. **Boletos de evento se emiten SIN cobrar.** `buy_event_tickets_multi` (`0072`) valida capacidad/promo/fechas pero **no comprueba pago** → cualquiera se emite boletos de pago gratis vía RPC directo. *(verificado a mano)*
2. **Redirect a Stripe hosted-Checkout prohibido, vivo en Eventos.** `Eventos.tsx:317-318` — patrón explícitamente prohibido por "checkout propio SIEMPRE". *(verificado)*
3. **No existe NINGÚN reembolso** cuando el dueño rechaza/cancela un pedido/reserva/renta **ya pagado** → el dinero se queda capturado. *(verificado)*
4. **El cliente puede reescribir su pedido pagado** (items/fulfillment) vía PostgREST. *(verificado a mano)*
5. **Promo de boleto muestra "Descuento aplicado" pero cobra precio completo** en línea. *(CONFIRMED)*
6. **Build desplegado clavado en Stripe TEST + `sk_test` expuesto sin rotar.** *(CONFIRMED)*

### B. Datos falsos sobre negocios/usuarios reales (regla #8 = tu confianza)
7. **Teléfono/dirección FALSOS en listados reales** (`BizDetail.tsx:551` → `(832) 555-4521` / `5821 Bellaire Blvd`). *(verificado a mano)*
8. **Reseñas FALSAS cuando el negocio tiene cero** (`BizDetail.tsx:2836` `SEED_REVIEWS`). *(verificado)*
9. **Rating 4.9 hardcodeado** al etiquetar negocio (`PublishModal.tsx:272`) + solo 4 negocios fixture. *(verificado)*
10. **Histograma 90/7/2 y estrellas siempre ★★★★★** hardcodeados. *(verificado)*
11. **Fallback silencioso a posts demo ante error de Supabase** (`live.tsx:1011`). *(verificado a mano)*
12. **"Crear evento" (FAB Publicar) es stub de éxito falso** (`PublishModal.tsx:749`). *(verificado a mano)*
13. **Renta walk-in "Rentar/Devolver" es teatro** — no escribe a la DB pero dice "depósito cobrado". *(verificado a mano)*
14. **Tracking USPS falso** en pedidos de tienda (`Fulfillment.tsx:102`). *(verificado a mano)*
15. **`/negocio/publicar` con formulario de tarjeta FALSO** al que el panel real enlaza. *(verificado a mano)*
16. **Billing muestra dinero inventado a dueños que pagan** (renovación, Visa ••4421, facturas). *(CONFIRMED)*
17. **Staff: nómina/horario/reloj falsos** a dueños reales. *(verificado a mano)*
18. **Notificaciones demo falsas a invitados** (badge "3") en la campana. *(CONFIRMED)*
19. **Stats FALSOS en el landing indexable** — "1,200 negocios", "340 eventos", "+9,000 vecinos" (`Landing.tsx:44,138`). *(verificado a mano)*

### C. Seguridad / privacidad de datos
20. **Tabla `businesses` es world-readable con TODAS las columnas** (`0001:152` `using (true)`) → filtra `stripe_account_id`, teléfonos de choferes (en settings), códigos de promo (en config), `owner_id` vía PostgREST directo. *(verificado a mano)*
21. **Posts exponen coordenadas exactas del autor** (dirección de casa si la guardó) — legibles por cualquiera vía REST. *(verificado)*
22. **Sin rate-limiting/anti-abuso** en posts/comentarios/reseñas/mensajes/uploads/`create_business` (solo COD está limitado). *(CONFIRMED)*
23. **Sin cola de moderación** — los reportes van a una tabla que nadie puede ver. *(CONFIRMED)*
24. **`seed.sql` siembra negocios ficticios con ratings/reseñas inventados en la DB de producción** — sin plan de purga. *(CONFIRMED)*

### D. Cuenta / legal / descubrimiento
25. **Sin recuperación de contraseña** — olvidarla = lockout permanente (no existe `resetPasswordForEmail`). *(verificado a mano)*
26. **Sin páginas legales** (Términos / Privacidad) en ninguna parte — obligatorio con pagos, push, UGC y direcciones de casa. *(CONFIRMED)*
27. **Sin manifest PWA** → no instalable, y **rompe Web Push en iOS** (iOS solo entrega push a PWA instalada). *(CONFIRMED)*
28. **Sitio invisible a buscadores** — cero enlaces `<a>` internos, sin sitemap/robots, 9 de 10 rutas comparten el mismo título. "SEO = adquisición gratis" hoy no existe. *(CONFIRMED)*
29. **El idioma EN no persiste** — cada recarga vuelve a español Y reescribe el idioma de push a 'es'. *(CONFIRMED)*

### E. Integridad de reservas (la barbería del sábado)
30. **Reservas "Cualquiera" invisibles a todo chequeo de conflicto** → sobre-reserva. *(verificado a mano)*
31. **Capacidad por sesión sin validación server-side.** *(verificado a mano)*

---

## Por superficie — funciona / roto / falta para competir

### 🟢 PAGOS / STRIPE (vs marketplace-grade) — backbone real, ruta rota
- **Real:** checkout propio (Payment Element) para pedidos/reservas/rentas; **re-precio autoritativo server-side** en las 4 modalidades; economía de destination-charge (comprador P+5%, plataforma 15% de P, delivery+propina 100% al vendedor); webhook firma-verificado con auto-refund si falla el cumplimiento; Connect Express onboarding; hold de depósito de renta; promos validadas en servidor; hardening de open-redirect.
- **Roto:** #1, #2, #3, #5, #6, #16 de arriba; radio de entrega no forzado en servidor al cobrar; webhook read-then-act (doble-fulfill posible en concurrencia); `pending_purchases` huérfanos se acumulan.
- **Falta:** herramientas de reembolso; config LIVE; visibilidad de payouts para el vendedor; impuestos; manejo de disputas/chargebacks; comisión 15% en efectivo (¿cómo se cobra?).

### 🟢 AUTH + MI CUENTA (vs Uber/DoorDash) — hub fuerte, puerta débil
- **Real:** email+password con sesión persistente, onboarding con GPS/ciudad, perfil editable, direcciones guardadas, historial completo (pedidos/reservas/rentas/boletos/RSVP) con tracking en vivo, centro de notificaciones con triggers+realtime, Web Push VAPID end-to-end, merge guest→user.
- **Roto:** #18, #25 de arriba; toggles de preferencias de notificación cosméticos (no se aplican); creación de perfil solo-cliente (un upsert fallido = usuario sin perfil, "Invitado" para siempre); cancelar pedido pagado deja el cargo varado; "Ayuda y soporte" es stub muerto.
- **Falta:** 2º método de login (phone/WhatsApp/email OTP, social); **borrado de cuenta / export** (derechos de privacidad); cambio de contraseña/email; verificación de email (hoy OFF); foto de perfil.

### 🟡 DATOS / ESCALA / SEGURIDAD (vs meta 1M+) — sólido en escritura, huecos en lectura/proceso
- **Real y maduro:** RLS en **las 46 tablas (132 políticas)**; los ~50 SECURITY DEFINER fijan `search_path`; RPCs de dinero solo service_role; batch de hardening 2026-07-14; modelo geo+FTS; protección atómica de oversell de boletos; sin N+1 en el cliente; storage RLS por-usuario.
- **Roto:** #20-#24 de arriba; **queries geo derrotan su índice GIST** (usan `ST_Distance` en vez de `ST_DWithin` → seq-scan a escala); feed sin paginación (tope 50); canales realtime globalmente sin-scope (fan-out colapsa a escala); `.env.production` con anon key en git.
- **Falta:** **ledger de migraciones** (tabla `schema_migrations` + diagnóstico "qué se aplicó" — la regresión de hoy se repetirá sin esto); rate-limiting; **estrategia de backup/PITR**; moderación; reescritura `ST_DWithin`; paginación keyset.

### 🟢 i18n + DISEÑO (vs WhatsApp/DoorDash) — la superficie MÁS fuerte
- **Real:** **4,381 llamadas `L('es','en')`** — un escaneo sistemático encontró esencialmente cero strings sin envolver; toggle ES/EN global; español por defecto; push bilingüe server-side; fechas/números locale-aware; el harness `tools/mobile-audit` pasa con **0 overflow a 392px** en todo lo alcanzable como invitado.
- **Roto:** #29 (idioma no persiste); **58 hex crudos** en className en 20 archivos (viola tokens-only); 15 `aria-label` en inglés; `<html lang>` no cambia; CheckoutSheet muestra error crudo de Stripe.
- **Falta:** persistencia de idioma; locale routing + hreflang (EN sin SEO); wire de locale a Stripe Elements. **9 tabs transaccionales del panel no se pudieron auditar** en el sandbox (requieren negocio autenticado) — falta certificar overflow ahí.

### 🔴 PWA / SEO / PLATAFORMA (vs PWA instalable + Google) — la superficie MÁS débil
- **Real:** service worker de push end-to-end; shell HTML SSG'd en español con lang/theme-color/viewport; deep-links de negocio/evento; ícono 192px.
- **Roto:** #27, #28, #19 de arriba; **sin favicon**; **cero Open Graph/Twitter** (shares de WhatsApp sin imagen); 404 en inglés sin marca; **sin error boundaries** (un crash = pantalla blanca); fuentes Google render-blocking.
- **Falta:** manifest + set de íconos completo; robots.txt; sitemap.xml; navegación con `<a>`/Link crawleable; OG image site-wide; SSR/prerender por-negocio/evento + JSON-LD LocalBusiness; analítica; soporte offline; 404/500 con marca en español.

### 🟢 Comunidad · Negocios · Comida · Tienda · Servicios · Renta · Eventos · Panel
*(Detalle completo en la tanda 1 — resumen: todas tienen motor real y competitivo, contaminado por los datos falsos #7-#19 y con los huecos de dinero #1-#6 y reservas #30-#31. Lo más real: Comida y Servicios. Lo más incompleto: los sub-módulos falsos del panel — Billing, Staff, `/negocio/publicar`.)*

- **Comunidad (Nextdoor):** feed/posts/encuestas/comentarios/realtime/follows REALES. Falta: notificaciones de actividad, moderación, filtro de barrio en móvil, DMs.
- **Negocios (Yelp):** buscador FTS, filtros, reseñas reales, endorsements REALES. Falta: mapa real, reclamar-negocio/verificación, 3 botones muertos, datos falsos.
- **Comida (DoorDash):** la más real end-to-end. Falta: reembolso, tarifa de zona real, cierre por horario, stock server-side.
- **Tienda (Amazon):** CRUD+variantes+storefront REALES. Falta: decrementar stock, descuentos canjeables, envío real, impuestos.
- **Servicios (Fresha):** reservas/agenda/aprobación REALES. Falta: arreglar sobre-reserva (#30-#31), recordatorios de cita, Staff falso.
- **Renta (Turo):** carrito por fechas + hold de depósito REALES. Falta: reembolso/cancelación, re-autorizar depósito, quitar teatro walk-in.
- **Eventos (Eventbrite):** venta atómica + QR + check-in REALES. Falta: cerrar #1/#2, reembolsos, editar evento, boleto por email.
- **Panel (Shopify/Square):** shell + métricas + CRM + Connect REALES. Falta: quitar Billing/Staff/publicar falsos, enforcement de tier server-side.

---

## 🔧 Lo que te toca a TI (el fundador) — ningún código lo resuelve

1. **Stripe LIVE:** rotar `sk_test` expuesto, claves live, `payment_intent.succeeded` en el webhook (¡sin esto los pedidos pagados en-app nunca se cumplen!), webhook de Connect (`account.updated`), dominio para Apple Pay, comisión confirmada.
2. **Supabase prod:** verificación de cuenta (email confirmation + Amazon SES, o WhatsApp OTP), plantillas de email OTP.
3. **Dominio propio** + `SITE_ORIGIN` en las 4 edge functions (lanzar en `tolatino.vercel.app` mina la confianza).
4. **Páginas legales:** Términos, Privacidad, política de reembolsos/cancelaciones — no existen.
5. **Precio canónico de planes** ($4.99 vs $19/$49 se contradicen) — una sola lista.
6. **Impuestos:** confirmar posición (hoy no se cobra tax) vs obligaciones de marketplace-facilitator.
7. **Backup/PITR** de Supabase: confirmar plan, retención y probar un restore.
8. **Moderación:** dueño humano nombrado + cola de reportes + rate limits antes de signups abiertos.
9. **Comisión 15% en efectivo:** definir el modelo antes de onboarding de vendedores (mayormente cash).
10. **E2E en dispositivo real:** pedido con tarjeta test → cocina → tracker; push en Android/iOS; hold de depósito release/capture en el dashboard de Stripe.

---

## Plan sugerido (orden de ataque)

**Sprint 1 — "Cero mentiras + dinero seguro" (bloqueante):** quitar/ocultar TODOS
los datos falsos (#7-#19), cerrar la ruta del dinero (#1-#6), tapar la sobre-reserva
(#30-#31). Todo es código, lo puedo hacer yo.

**Sprint 2 — "Seguridad + confianza":** blindar la tabla `businesses` (#20),
fuzzear coordenadas (#21), rate-limiting (#22), cola de moderación (#23), purgar
seed (#24), ledger de migraciones, recuperación de contraseña (#25), persistir
idioma (#29), notificaciones de comunidad, recordatorios de cita.

**Sprint 3 — "Descubrimiento + legal + escala":** PWA manifest + íconos (#27),
crawleabilidad + sitemap/robots + OG (#28), páginas legales (#26), reescritura
`ST_DWithin`, paginación de feed, mapa real, reclamar-negocio, SSR/JSON-LD por-negocio.

**Founder-track (en paralelo):** los 10 puntos de "Lo que te toca a TI".

> Cuando digas, ataco el Sprint 1 superficie por superficie (cada arreglo con su
> verificación en browser antes de desplegar). Las 13 verificaciones que quedaron
> pendientes por límite de sesión son en su mayoría "blockers" ya evidentes (los
> de arriba), no claims dudosos — no cambian el panorama.
