# To'Latino v2 — Herramientas de plataforma (lo que usan los grandes, hecho nuestro)

> Aprobado por el fundador el 5 nov 2026 (decisión S). Regla O aplicada: construimos
> lo nuestro; «propio sobre código abierto» = software libre corriendo en nuestros
> servidores con nuestros datos. Se paga solo lo irreplicable. Este documento crece
> conforme avanza el proyecto.

| # | Área | Qué hace | Lo usan los grandes | Nosotros |
|---|---|---|---|---|
| 1 | Analítica de producto | quién entra, qué toca, embudos, retención, origen | Amplitude, Mixpanel, GA; DoorDash/Uber propio | **Propio**: tabla de eventos (`SearchLog`, `ContactTap`, `BusinessDailyStats` + eventos de app) y paneles en `ADM-ANALIT`. Arranque posible con PostHog/Plausible autoalojado. |
| 2 | Grabación de sesiones | «película» de lo que hizo la persona, dónde se trabó | FullStory, Hotjar, LogRocket | **Propio sobre código abierto**: `rrweb`, almacenado en nuestro servidor, visor en el Super Admin. Con consentimiento; campos sensibles tapados. |
| 3 | Errores en vivo | cada error de cliente/servidor con pantalla, dispositivo, usuario y pasos previos | Sentry, Datadog, Bugsnag | **Propio sobre código abierto**: Sentry autoalojado o GlitchTip. Base de los guardianes (decisión N). |
| 4 | Salud y velocidad | Web Vitals por pantalla, latencia de consultas, caídas, alertas | Datadog, New Relic, Grafana | **Propio sobre código abierto**: Grafana + Prometheus, Uptime Kuma, Web Vitals a nuestra base. Presupuesto de velocidad por pantalla vigilado por guardián (decisión R). |
| 5 | Logs y auditoría | historial inmutable de acciones + logs técnicos buscables | Datadog Logs, Elastic | **Propio**: `AuditEntry` (negocio) + Loki (técnico). |
| 6 | Interruptores y A/B | encender por % o por ciudad sin desplegar; probar dos versiones | LaunchDarkly, Optimizely, Statsig | **Propio**: `FeatureFlag` + `PlatformConfig` con porcentaje y A/B; panel en `ADM-SYS`. |
| 7 | Comunicación | push, SMS, WhatsApp, correo | — | Push **propio** (Web Push/FCM) con `NotificationTemplate`. **Se paga:** SMS (Twilio), WhatsApp (Meta API), envío de correo (Amazon SES); plantillas e historial propios. |
| 8 | Soporte y chat | tickets, macros, chat | Intercom, Zendesk | **Propio**: Soporte + El Compa ya diseñados. |
| 9 | Pagos y fraude | cobros, retención, pagos al negocio; fraude | Stripe, Adyen | **Se paga** Stripe (Radar incluido). Reglas de fraude propias (cuentas repetidas, reseñas falsas, abuso de códigos) en `ADM-CONF`. |
| 10 | Mapas, geo, direcciones, rutas | mapa, «cerca de mí», autocompletar, ruta del repartidor | Google Maps; Uber/Apple propio | **Propio sobre código abierto**: MapLibre + OpenStreetMap servidos por nosotros; PostGIS; Nominatim/Photon; OSRM/Valhalla para rutas. |
| 11 | Búsqueda | texto, sinónimos, ranking | Algolia, Elasticsearch | **Propio**: Postgres full-text + `Synonym`; Meilisearch autoalojado a escala. |
| 12 | Imágenes y archivos | subir, redimensionar, servir rápido | Cloudinary, imgix | **Propio**: almacenamiento propio (MinIO/Supabase Storage), redimensión al subir, CDN gratuita de Cloudflare. |
| 13 | Seguridad | bots y ataques, límites de intentos, análisis del código, secretos | Cloudflare, Snyk | Cloudflare (gratis) delante; límites de intentos **propios**; Semgrep + auditoría de dependencias como guardián del build; secretos solo en variables de entorno (decisión Q). |
| 14 | Estado público y respaldos | «¿está funcionando?», respaldos diarios probados | Statuspage | **Propio**: Uptime Kuma genera la página; respaldos automáticos de la base, verificados. |
| 15 | Tablero del fundador | todo lo anterior en una pantalla: usuarios, pedidos, dinero, errores, velocidad, colas | interno en cada grande | **Propio** en el Super Admin, alimentado por los guardianes. |

## Lo que sí se paga (lista cerrada; crece solo con decisión del fundador)
SMS · WhatsApp API · envío de correo (SES) · Stripe · tiendas Apple ($99/año) y Google ($25) · IA de El Compa (Claude API).

## Por agregar conforme avancemos
_(vacío — aquí se anotan herramientas nuevas con fecha y decisión)_
