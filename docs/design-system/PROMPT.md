# PROMPT — Pégalo en Claude Code

Copia y pega esto como **primer mensaje** en Claude Code, dentro del repo donde vas a construir To'Latino.

---

Eres el desarrollador principal de **To'Latino**, una plataforma geolocalizada por ciudad, **mobile-first** y **bilingüe (español base, inglés secundario)** para la comunidad latina en EE. UU. — un *"Yelp + Nextdoor + Eventbrite + DoorDash, de latinos para latinos"*.

En la carpeta `design_handoff_completo/` tienes el handoff completo:

- **`README.md`** — **léelo completo primero**. Es el índice maestro: visión global, arquitectura de rutas, estado global, tokens de diseño compartidos, mapa de archivos y plan por fases.
- **`01-plataforma.md`** — detalle del Dominio A: Bienvenida (landing) + app Cliente (Comunidad/Negocios/Eventos/Muy pronto) + Panel de negocio y sus módulos.
- **`02-pedidos.md`** — detalle del Dominio B: flujo de pedidos de comida (Cliente Ordenar · Cocina · Menú Builder) + el modelo de datos `tolatino-menu.js` y la lógica de cobros/liquidación.
- **`Guia visual.html`** — contact sheet imprimible del flujo de pedidos.
- Varios **`.dc.html`** — **referencias de diseño en HTML de alta fidelidad** (prototipos), NO código para copiar tal cual. Ábrelos en el navegador (requieren `support.js`, y los de pedidos también `tolatino-menu.js`, en la misma carpeta) para ver el look & feel exacto.

## Tu tarea
Recrea estos diseños como una **aplicación real** en este codebase, con sus patrones y librerías. Si el repo está vacío, inicializa **React + TypeScript (Vite)** con **react-router**, **i18n** (ES por defecto, EN secundario), estado con **Zustand/Context**, e iconos **Lucide**.

**Importante — arquitectura (descarta el andamiaje del prototipo):**
- `To'Latino Studio.dc.html` muestra 3 marcos de dispositivo lado a lado, y los archivos de pedidos tienen un switcher Cliente/Cocina/Menú. **Todo eso es solo para revisión — no lo construyas.** Haz **una sola app responsiva** con rutas y estado global normales.
- Son **dos dominios de la misma app**:
  1. **Plataforma** — Bienvenida pública (`/`); app del ciudadano con Comunidad (`/comunidad`, estilo Nextdoor), Negocios (`/negocios`, estilo Yelp), Eventos (`/eventos`, con boletos), y 4 categorías "Muy pronto" (Transporte, Inmuebles, Autos, Trabajos) con lista de espera; Panel de negocio (`/negocio/*`) con sidebar (Resumen, Listado, Módulos, Clientes, Cuenta) que **varía por plan (Free/Verified/Premium) y rubro**.
  2. **Pedidos** (capa tipo DoorDash sobre la plataforma) — Cliente Ordenar (`/r/:slug`, `/carrito`, `/checkout`, `/pedido/:id`), Cocina dentro del panel (`/negocio/pedidos`) y Menú Builder (`/negocio/menu`). Todo consume el catálogo de `tolatino-menu.js` (restaurante + 22 grupos de addons + 15 categorías × 10 platillos = 150 ítems); conserva esa forma para tu API.

## Requisitos transversales (no negociables)
- **Mobile-first y pixel-perfect:** el 99% de usuarios son móviles. Reproduce fielmente el móvil (incluida la **barra de navegación inferior con FAB "+" central**) y escala a tablet/escritorio con los breakpoints del README (≤767 / 768–1023 / ≥1024).
- **Bilingüe ES/EN** con toggle global; todo el texto de la plataforma tiene par ES/EN.
- **Geolocalizado por ciudad:** selector de ciudad (modal / hoja inferior) con "usar mi ubicación" y búsqueda; la ciudad se propaga a toda la app.
- **Fuente** Plus Jakarta Sans; **primario** `#7B61FF`; **diamante ámbar** `#F4B740`. Usa la tabla completa de tokens del README (colores, tipografía, radios, sombras, animaciones).
- **Búsqueda global** con sugerencias en vivo agrupadas y filtrado real por sección.
- **Estado real en todas las interacciones:** publicar (agrega al feed), ♥ guardar, "Voy" (eventos), seguir, recomendar, notificaciones, menú de usuario, onboarding de negocio → panel.
- **Pedidos con lógica real:** addons con precio en vivo, carrito, **cálculo de cobros** (subtotal, entrega, servicio 10%, impuestos 8.25%, propina, promo AMIGO10) y **liquidación en Cocina** (comisión To'Latino 15%, pago neto) exactamente como en `02-pedidos.md`. Máquina de estados del pedido: `nuevo → preparando → listo → (delivery) en camino → completado` / `→ (pickup) completado` / `→ rechazado`.

## Cómo trabajar
1. Lee `design_handoff_completo/README.md` completo, luego `01-plataforma.md` y `02-pedidos.md`.
2. Abre los `.dc.html` en el navegador y contrástalos con los docs (usa `?screen=` en los de pedidos para ir a una pantalla puntual — ver `02-pedidos.md`).
3. Propón estructura de carpetas, rutas, modelo de estado y un **plan por fases** (sigue el §8 del README: Fundaciones → Bienvenida → Comunidad → Negocios/Eventos → Pedidos-Cliente → Panel → Cocina/Menú → "Muy pronto").
4. Confírmame el plan y avanza. Prioriza **fidelidad visual en móvil** y **comportamiento real con estado** sobre cubrir todo de una vez.

Empieza leyendo el README y mostrándome el plan por fases.
