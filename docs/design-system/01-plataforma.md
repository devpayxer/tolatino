# Handoff: To'Latino — Plataforma multicanal (Comunidad · Negocios · Eventos + Panel de negocio)

## Overview
**To'Latino** es una plataforma geolocalizada por ciudad, **mobile-first** y **bilingüe (español base, inglés secundario)** para la comunidad latina en EE. UU. Es un "Yelp + Nextdoor + Eventbrite de latinos para latinos": los emprendedores publican su negocio y la comunidad local descubre productos y servicios, interactúa y asiste a eventos.

Este paquete documenta un **prototipo interactivo de alta fidelidad** que muestra, en un mismo lienzo multi-dispositivo (Escritorio · Tablet · Móvil, sincronizados), tres superficies:

1. **Bienvenida (pre-home / landing)** — para usuarios no logueados o primera visita.
2. **Cliente (la app)** — Comunidad (estilo Nextdoor), Negocios (estilo Yelp), Eventos (con boletos), y 4 categorías en "Muy pronto" (Transporte, Bienes Raíces, Dealer de carros, Trabajos).
3. **Negocio (panel de administración)** — dashboard completo para que los negocios gestionen su listado, módulos, clientes y cuenta.

## About the Design Files
Los archivos de este paquete son **referencias de diseño creadas en HTML** (prototipos que muestran el look & feel y el comportamiento previsto), **no** código de producción para copiar tal cual. Están escritos como "Design Components" (`.dc.html`) — un formato de prototipado con plantilla + clase de lógica.

La tarea es **recrear estos diseños en el entorno del codebase destino** usando sus patrones y librerías establecidos. Si aún no existe un entorno, la recomendación es **React + TypeScript** (Vite o Next.js) con una librería de estilos a elección (CSS Modules, Tailwind o styled-components), ya que el prototipo es esencialmente un árbol de componentes con estado local y estilos inline.

> Nota de arquitectura: el prototipo mantiene TODO en un solo lienzo ("Studio") para poder revisar las 3 superficies × 3 dispositivos a la vez. **En la app real NO se necesita ese lienzo**: cada "superficie" es una app/ruta real y cada "dispositivo" es simplemente el mismo diseño responsivo en distintos breakpoints. Ver "Cómo mapear el prototipo a la app real".

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, estados e interacciones son finales. Recrear la UI de forma pixel-perfect con la librería de componentes del codebase. Los textos (ES/EN) son finales y pueden usarse como base de i18n.

---

## Cómo mapear el prototipo a la app real

- El archivo maestro **`To'Latino Studio.dc.html`** contiene un "Studio" con una barra superior (switch Bienvenida/Cliente/Negocio, ciudad, ES/EN, zoom) y **3 marcos de dispositivo**. **Todo eso es andamiaje de revisión** — descartarlo en la implementación.
- Lo que SÍ se implementa es el contenido dentro de cada marco:
  - **Bienvenida** → una landing pública responsiva (ruta `/`).
  - **Cliente** → la app autenticada responsiva con navegación por 7 categorías (rutas `/comunidad`, `/negocios`, `/eventos`, …).
  - **Negocio** → el panel de negocio responsivo (rutas `/negocio/*`), definido en `To'Latino Business Dashboard.dc.html` (escritorio) y `To'Latino Business Dashboard Mobile.dc.html` (móvil), que a su vez usa los módulos `ToLatino *Module*.dc.html`.
- **Responsive**: en el prototipo, "Escritorio" = ≥1024px, "Tablet" ≈ 768–1023px, "Móvil" = ≤767px. Un solo componente responsivo por pantalla reproduce los 3.
- **Sincronización**: en el prototipo, cambiar idioma/ciudad/categoría afecta los 3 marcos a la vez porque comparten estado. En la app real esto es simplemente estado global (contexto de idioma, ciudad y sesión).

---

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| Primario (morado) | `#7B61FF` | Marca, CTAs, activos, acentos |
| Primario oscuro (hover/press) | `#6D4DF6` / `#6743E2` | Estados de botón, texto sobre lila |
| Tinta / texto principal | `#1E1B2E` | Titulares, texto fuerte, botón oscuro |
| Texto secundario | `#6E6A85` / `#5A5570` | Párrafos, subtítulos |
| Texto terciario / muted | `#8A86A0` / `#9A96AE` | Metadatos, placeholders |
| Muted claro | `#B7B3C6` / `#B0ACC0` | Deshabilitado, contadores |
| Ámbar (diamante de marca / precios) | `#F4B740` | Diamante del logo, estrellas, badges de precio |
| Verde (éxito / abierto) | `#1F9D57` / `#1F8A4C` | "Abierto", verificado, confirmaciones |
| Rosa/rojo (like / alerta) | `#F0466E` / `#D6336C` | Corazón, badges de notificación, cerrar sesión |
| Azul (info / local) | `#2F6FED` | Tags "Mi barrio", enlaces info |
| Lila superficie | `#EFEBFF` / `#F1EFFA` | Chips, avatares, fondos suaves |
| Fondo app | `#F4F2F9` | Fondo de viewport de la app |
| Fondo landing hero | `linear-gradient(160deg,#F1ECFC,#ECE7FB,#F6EEF6)` | Hero del pre-home |
| Fondo dashboard | `#E7E5EC` | Fondo del panel (no-embed) |
| Superficie tarjeta | `#FFFFFF` | Tarjetas, paneles |
| Borde sutil | `rgba(30,27,46,.06–.10)` | Bordes de tarjetas y divisores |

Colores por categoría (usados en tags/dots de negocios y eventos):
`Comida #E8954A / bg #FCEBD6` · `Belleza #E0568F / bg #FBE9F0` · `Autos-Mecánica #7B61FF / bg #EFEBFF` · `Salud #1F9D57 / bg #E3F5EA` · `Legal #6D4DF6 / bg #E8E4FB` · `Hogar #D6A22A / bg #FCF1C7` · `Servicios #2F6FED / bg #E5EFFB`.

Estados de plan del negocio: **Free** (gris), **Verified** (morado `#7B61FF`), **Premium** (con acentos ámbar). Badge "Muy pronto": texto `#9A6A12` sobre `#FCEFD6`.

### Tipografía
- **Familia única:** `'Plus Jakarta Sans'` (Google Fonts, pesos 400/500/600/700/800). Fallback `system-ui, sans-serif`.
- **Escala móvil:** titular hero 30px/800; H1 de sección 20–23px/800; título tarjeta 14.5–16px/800; cuerpo 13.5–14px/500; meta 11–12px/600–700; overline 10–11px/800 uppercase con `letter-spacing:.04–.06em`.
- **Escala escritorio:** titular hero 52px/800; H1 34px/800; H1 de app 26px/800.
- **Rasgos:** titulares `letter-spacing:-.02 a -.03em`, `text-wrap:balance`; párrafos `line-height:1.5–1.55`, `text-wrap:pretty`.

### Radios, sombras, espaciado
- **Border-radius:** chips/pills `999px`; botones `11–16px`; tarjetas `18–20px`; paneles/modales `18–24px`; hoja inferior móvil `24px 24px 0 0`; tiles de imagen `13–15px`; avatar `50%`.
- **Sombras:** tarjeta `0 6–10px 20–26px rgba(60,50,110,.06)`; elevada/CTA `0 14px 28px rgba(123,97,255,.4)`; modal `0 30px 70px rgba(30,27,46,.35)`; hoja inferior `0 -20px 50px rgba(30,27,46,.3)`.
- **Espaciado:** base de 4px. Padding de tarjeta 14–22px. Gaps 8–16px. Padding de sección landing: móvil 32×16, tablet 40×24, escritorio 54×40.
- **Alturas mínimas táctiles:** ≥44px en controles móviles.

### Placeholders de imagen
No hay fotos reales. Se usan **degradados a rayas por categoría** como placeholder: `repeating-linear-gradient(135deg, <colorA> 0 11px, <colorB> 11px 22px)`. En la app real, reemplazar por fotos subidas por el negocio (con estos degradados como fallback/skeleton).

---

## Screens / Views

### 1) Bienvenida (Pre-home / Landing) — ruta pública `/`
**Propósito:** convertir a usuarios nuevos/no logueados; explicar el valor y llevar a explorar o registrarse.
**Layout (responsive):**
- **Nav sticky:** logo `To'Latino` (con diamante ámbar), selector de ciudad (oculto en móvil), toggle ES/EN, "Iniciar sesión" (oculto en móvil), botón oscuro "Comenzar gratis".
- **Hero** (2 columnas en ≥768px, apiladas en móvil, fondo degradado lila con círculos decorativos):
  - Izquierda: badge "De latinos para latinos"; titular *"Tu gente, tu barrio, tu idioma."* (última línea en morado); subtítulo con la ciudad; **barra de búsqueda** (oculta en móvil) con botón "Entrar"; fila de CTAs ("Comenzar gratis" morado + "Ya tengo cuenta" outline); prueba social (stack de avatares + "+9,000 vecinos… en {ciudad}"); fila de stats (+9k vecinos / 1,200 negocios / 340 eventos).
  - Derecha: **collage flotante** de 3 tarjetas rotadas (post de comunidad, tarjeta de negocio con ★4.9, tarjeta de evento con fecha) — datos de muestra reales del proyecto.
- **Categorías:** título "Todo lo que tu comunidad necesita"; grid de 3 tarjetas (Comunidad/Negocios/Eventos) con icono, chip de estilo, título, descripción y "Entrar →" (cada una navega a su sección); fila "Muy pronto" con 4 chips (Transporte, Bienes Raíces, Autos, Trabajos).
- **Cómo funciona** (banda `#F7F5FC`): 3 pasos numerados + 3 señales de confianza (Bilingüe / Por ciudad / De confianza).
- **Banda de negocios** (degradado morado): "¿Tienes un negocio?" + botón "Publicar mi negocio" (abre onboarding).
- **Footer:** logo + tagline + idioma.

### 2) Cliente — Comunidad (`/comunidad`, home de la app autenticada)
**Estilo Nextdoor.** Header (logo, ciudad, búsqueda, ES/EN, campana de notificaciones, avatar, botón Publicar), barra horizontal de 7 categorías. Layout de 3 columnas en escritorio (barrios / feed / tendencias+vecinos), 1 columna en móvil con barra de navegación inferior.
- **Compositor:** avatar + input "¿Qué pasa en tu barrio?" + botón Publicar + chips (Pregunta/Recomienda/Evento).
- **Post:** avatar con color, nombre, tag (Pregunta/Recomienda/Mi barrio), barrio · tiempo, texto, negocio etiquetado opcional (con ★), acciones (♥ recomiendan, comentarios, compartir). ♥ es interactivo (incrementa/colorea).
- **Barra lateral izquierda:** lista de barrios con contador. **Derecha:** tendencias (#hashtags) y vecinos sugeridos (Seguir/Siguiendo).

### 3) Cliente — Negocios (`/negocios`)
**Estilo Yelp.** Encabezado con nº de resultados en {ciudad}, orden (Relevancia/Distancia/Calificación) y botón Mapa. Grid con barra de filtros (Categoría con dots+contadores, Precio $/$$/$$$, Calificación, Abierto ahora toggle, Limpiar) + resultados. Mapa placeholder con pines. Chips de filtros aplicados con ✕. En móvil, chips de categoría deslizables.
- **3 variantes de tarjeta de negocio** (elegibles por diseño — el equipo puede escoger la definitiva):
  - **A · Lista:** tile 78px + nombre + verificado + categoría/distancia + ♥ + ★rating(reviews)·precio·estado + endoso de vecinos + acciones Llamar/Ver perfil.
  - **B · Galería:** foto grande 118px con ♥ y pill de estado + nombre/verificado + categoría/distancia + rating.
  - **C · Detalle:** tile 88px + datos + especialidad + amenidades (chips) + reseña destacada + Llamar/Ver perfil.
- Verificado = check morado. Estado Abierto (verde) / Cerrado (gris). Paginación cuando aplica.

### 4) Cliente — Eventos (`/eventos`)
Header + **evento destacado** (banda morada con fecha en tarjeta, ubicación, nº asisten, botón "Comprar boleto/Voy"). Chips de filtro (Todos/Gratis/Vida Nocturna/Comida/Familia/Mercado). Grid de tarjetas de evento (tile por categoría, badge de fecha, pill de precio Gratis/$, título, ubicación, nº asisten, botón "Voy" interactivo).

### 5) Cliente — "Muy pronto" (Transporte, Bienes Raíces, Autos, Trabajos)
Placeholder elegante centrado: icono, badge "Muy pronto", título, descripción y **formulario "¡Avísame!"** (email + botón) con estado de éxito "Te avisamos cuando abra".

### 6) Negocio — Panel (`/negocio`)
Ver `To'Latino Business Dashboard.dc.html` (escritorio) y `…Mobile.dc.html` (móvil).
- **Sidebar / drawer** con tarjeta del negocio (estado de plan, rating, vistas/seguidores) y navegación agrupada: **Resumen · Listado** (info, fotos, horario, relacionados) · **Módulos** (menú, servicios, reservas, productos, envíos, repartidores, renta, eventos) · **Clientes** (clientes, pedidos, mensajes, reseñas, novedades) · **Cuenta** (pagos, personal, empleos, configurar módulos, facturación, ajustes).
- **Resumen:** ingresos del día, cola de pedidos, KPIs, gráficas, "Requiere tu atención", más vendidos, salud de módulos, actividad.
- Contenido y módulos disponibles **varían según plan (Free/Verified/Premium) y rubro (Restaurante/Belleza/Auto/Tienda/Renta)**. Los sub-módulos son pantallas propias (`ToLatino *Module*.dc.html`).

---

## Interactions & Behavior
- **Idioma ES/EN:** toggle global; todo el texto tiene par ES/EN. Implementar como i18n; ES por defecto.
- **Ciudad:** botón en header/nav abre modal (hoja inferior en móvil) con "Usar mi ubicación actual" (geolocalización → en el prototipo simulada con spinner) y campo de texto con lista filtrable de ciudades; la ciudad seleccionada se propaga a toda la app y a los textos ("negocios en {ciudad}").
- **Búsqueda global:** input en header (y fila propia en móvil) → panel de sugerencias en vivo agrupado por Negocios/Eventos/Comunidad con contadores; Enter o "Ver todos los resultados" navega a la sección con la búsqueda aplicada; cada sección filtra de verdad por nombre/categoría/especialidad, título/lugar, o texto/autor. Chip "«…»" con ✕ para limpiar.
- **Notificaciones:** campana con badge → panel/hoja con filtros y estados leído/no leído.
- **Publicar:** botón (header en escritorio/tablet; **FAB central "+" en la barra inferior móvil**) → modal selector (Publicación / Negocio / Evento) → formulario por tipo → éxito. Publicar una publicación la **agrega de verdad al feed** de Comunidad.
- **Menú de usuario:** avatar "TÚ" → dropdown (escritorio/tablet) u hoja inferior (móvil): Mi perfil, Guardados (con contador de ♥), Mis publicaciones, Mi negocio, Configuración, Ayuda, idioma y Cerrar sesión.
- **Onboarding "Publica tu negocio":** flujo multi-paso; la pantalla final "Ir a mi panel completo" lleva al panel de negocio con el plan y rubro elegidos.
- **Guardar (♥), Voy (eventos), Seguir (vecinos), Recomendar (posts):** todos con estado toggle y feedback visual.
- **Navegación móvil:** barra inferior fija con Comunidad · Negocios · **＋** (Publicar, FAB elevado morado) · Eventos · Alertas (con badge).
- **Transiciones:** chevrons y toggles con `transition ~.18s ease`; hover de tarjetas eleva sombra.

## Responsive behavior
- **Móvil (≤767px):** 1 columna, header compacto (sin barra lateral de filtros; chips deslizables), fila de búsqueda propia, **barra de navegación inferior**. Landing con hero apilado y sin barra de búsqueda del hero.
- **Tablet (768–1023px):** 2 columnas donde aplica; sin barra inferior (usa header).
- **Escritorio (≥1024px):** layout completo multi-columna, barra de filtros lateral fija, búsqueda en header.

## State Management
Estado global sugerido: `lang ('es'|'en')`, `city`, `session/user`, `surface (landing|app|business)`, `activeCategory`. Estado por vista: filtros de negocios (categoría, precio, rating, abierto, orden, paginación), filtro de eventos, filtro de comunidad (barrio), búsqueda (query + submitted), colecciones toggle (saved, going, followed, recommended), aperturas de modales (ciudad, notificaciones, publicar, usuario, onboarding), y para el panel: `plan (free|verified|premium)`, `category (rubro)`, sección activa. Datos: negocios, eventos, posts, notificaciones, ciudades (en el prototipo son fixtures; en real vienen de API geolocalizada por ciudad).

## Assets
- **Fuente:** Plus Jakarta Sans (Google Fonts).
- **Iconos:** SVG inline (stroke, 2–2.4px), estilo lineal redondeado. Reemplazables por la librería de iconos del codebase (p. ej. Lucide/Feather — mismo estilo).
- **Imágenes:** ninguna real; degradados a rayas por categoría como placeholder (reemplazar por uploads del negocio).
- **Logo:** wordmark tipográfico `To'` (tinta) + `Latino` (morado) + diamante ámbar 45° — reproducible en CSS, sin archivo de imagen.

## Files (en este paquete)
- `To'Latino Studio.dc.html` — **archivo maestro**: pre-home + app (Comunidad/Negocios/Eventos/Muy pronto) + panel de negocio embebido, en lienzo multi-dispositivo sincronizado. Es la referencia principal de Cliente y Bienvenida.
- `To'Latino Business Dashboard.dc.html` — panel de negocio (escritorio), autocontenido.
- `To'Latino Business Dashboard Mobile.dc.html` — panel de negocio (móvil), con drawer que abre los módulos.
- `ToLatino Food Module.dc.html`, `… Services Module`, `… Products Module`, `… Rental Module`, `… Events Module`, `… Updates Module`, `… Customers Module`, `… Staff Module`, `… Billing Module`, `… Business Detail`, `… Barbershop Services`, `… Carwash Services` — sub-módulos del panel (menú, servicios, productos, renta, eventos, novedades, clientes, personal, facturación, ficha pública, y ejemplos por rubro).

> Los `.dc.html` se abren directamente en un navegador para inspeccionar look & comportamiento. Úsalos como fuente de verdad visual; recréalos con los componentes y patrones del codebase destino.
