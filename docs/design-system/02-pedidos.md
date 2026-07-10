# Handoff: To'Latino — Flujo de Pedidos (Cliente · Cocina · Menú)

## Overview
Este paquete documenta el **flujo completo de pedidos de comida** de To'Latino, al estilo DoorDash / Uber Eats, en sus **3 fases conectadas**:

1. **Cliente (Ordenar)** — la app del comensal: descubrir el restaurante, armar el pedido con *addons*, carrito, checkout (dirección + pago + desglose de cobros), rastreo en vivo del pedido y post-entrega (calificar / reportar problema / volver a pedir).
2. **Cocina (Panel del restaurante)** — recepción y gestión del pedido: aceptar/rechazar, preparar, marcar listo, **asignar repartidor**, en camino, entregado; con línea de tiempo, datos del cliente, **pago y liquidación (payout)**, notificaciones y diálogos.
3. **Menú (Builder)** — el proceso de armar el menú que alimenta el listado: los platillos, categorías, la **biblioteca de grupos de addons reutilizables** y el flujo de **agregar/editar platillo con addons** que se publica al listado del cliente.

El restaurante de ejemplo es **"Burger Amigo"**, una cadena de comida rápida (estilo McDonald's) con un **menú real de 15 categorías × 10 platillos = 150 productos**, cada uno con sus grupos de addons. Las 3 fases comparten **el mismo modelo de datos de menú** (`tolatino-menu.js`).

Este flujo es un módulo dentro de la plataforma multicanal To'Latino ya documentada en `design_handoff_tolatino/`. Reutiliza sus mismos tokens de diseño (Plus Jakarta Sans, morado `#7B61FF`, diamante ámbar, etc.). **Lee también ese README** para el contexto de marca y del panel de negocio; este documento cubre solo el flujo de pedidos.

---

## About the Design Files
Los archivos de este paquete son **referencias de diseño creadas en HTML** (prototipos que muestran el look & feel y el comportamiento previsto), **NO** código de producción para copiar tal cual. Están escritos como "Design Components" (`.dc.html`) — un formato de prototipado con plantilla + clase de lógica que corre sobre `support.js`.

La tarea es **recrear estos diseños en el entorno del codebase destino** usando sus patrones y librerías establecidos. Si aún no existe entorno, la recomendación es **React + TypeScript** (Vite o Next.js), estado con Context/Zustand o Redux Toolkit, e iconos Lucide (mismo estilo lineal que los SVG inline del prototipo). Es esencialmente un árbol de componentes con estado local + estilos inline, fácil de portar.

**No copies el HTML a producción.** Úsalo como fuente de verdad visual y de comportamiento; reimpleméntalo con componentes reales, ruteo real, y datos de una API.

---

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios, sombras, estados e interacciones son finales y deben reproducirse pixel-perfect con la librería de componentes del codebase. Los textos (español) son finales y pueden usarse como base de i18n (español base; inglés secundario si se requiere, siguiendo el patrón bilingüe del resto de la plataforma).

---

## Arquitectura del flujo

```
                 ┌──────────────────────────────┐
                 │  tolatino-menu.js (DATOS)     │
                 │  restaurant · groups · 150 items │
                 └───────────────┬──────────────┘
        lee ▲            lee ▲   │            ▲ lee
            │                │   │            │
 ┌──────────┴───┐   ┌────────┴───┴───┐   ┌────┴───────────┐
 │ MENÚ Builder │──▶│  CLIENTE       │──▶│  COCINA        │
 │ (comercio)   │pub│  (Ordenar)     │ord│  (restaurante) │
 └──────────────┘   └────────────────┘   └────────────────┘
   define el menú    el cliente pide       el negocio cumple
```

- **Menú Builder** define/publica el menú → **Cliente** lo ve y ordena → **Cocina** recibe y cumple el pedido (acepta → prepara → asigna repartidor → entrega).
- En el prototipo, cada fase es un archivo independiente **responsive** con un **switcher** (Cliente / Cocina / Menú) que enlaza a los otros dos. **En la app real ese switcher es andamiaje de revisión — descártalo**; cada fase es una ruta/área real:
  - Cliente → app del comensal (`/r/:slug` ficha + menú, `/carrito`, `/checkout`, `/pedido/:id`).
  - Cocina → panel de negocio (`/negocio/pedidos`, dentro del dashboard ya documentado).
  - Menú → módulo del panel de negocio (`/negocio/menu`).
- **Responsive real (móvil ≤767 / tablet 768–1023 / escritorio ≥1024).** Cada `.dc.html` detecta el ancho de ventana (listener `resize` → estado `bp`) y cambia el layout — no hay archivos separados por dispositivo. Cómo responde cada fase:
  - **Móvil:** una columna a pantalla completa (sin bezel de teléfono); barra de estado tipo iOS; hojas (sheets) suben desde abajo; barra de carrito flotante (Cliente). El switcher va como píldora flotante centrada arriba.
  - **Tablet:** app centrada tipo tarjeta (~600px) sobre fondo gris; **barra superior web** (marca + switcher, y dirección/carrito en Cliente) en vez de barra de estado.
  - **Escritorio:** barra superior web + contenido ancho. Cliente = **2 columnas** (menú + **rail de carrito** fijo a la derecha); Cocina = **tablero en grid multi-columna** (auto-fill, mín 320px) y detalle centrado; Menú = **grid de platillos a 2 columnas**. Las hojas se vuelven **modales centrados** (no suben desde abajo).
- Implementación en el prototipo (portar al patrón del codebase): estilos calculados por `bp` en `renderVals` (`pageStyle`, `frameStyle`, `menuRootStyle`/`cardsGridStyle`/`itemsGridStyle`, `paneStyle`, `sheetWrapStyle`/`modalWrapStyle`, `showStatusBar`, `showTopBar`, `deskRail`). En React real: media queries / container queries + un hook `useBreakpoint`.

---

## Modelo de datos compartido (`tolatino-menu.js`)

Todo el catálogo vive en un objeto global `window.TOLATINO_MENU`. En producción esto viene de tu API; conserva la forma para que los tres módulos consuman lo mismo.

```ts
type Restaurant = {
  name: string; tagline: string;
  rating: number; reviews: number; priceLevel: '$'|'$$'|'$$$'; cuisine: string;
  distance: string; etaMin: number; etaMax: number;   // minutos de entrega
  deliveryFee: number;      // 1.99
  serviceRate: number;      // 0.10  (10% del subtotal)
  taxRate: number;          // 0.0825 (8.25%)
  smallOrderFee: number;    // 2.00  (si subtotal < minFree, solo delivery)
  minFree: number;          // 15    (umbral para evitar el fee de pedido pequeño)
  address: string; neighborhood: string; hours: string; open: boolean;
  tileA: string; tileB: string; accent: string;        // colores del placeholder de imagen
  dealText: string;         // "2×1 en Combos los martes"
};

type ModifierGroup = {          // "grupo de addons"
  name: string;                 // "Agrégale extras", "Tamaño", "Salsas"…
  type: 'single' | 'multi';     // single = radio (elige uno) · multi = checkbox
  required: boolean;
  max?: number;                 // solo multi: máximo de opciones seleccionables
  opts: [label: string, priceDelta: number][];   // ej. ["Tocino", 1.20]
};

type Item = {
  id: number; cat: string;      // cat = id de categoría
  name: string; desc: string;
  price: number;                // precio base
  kcal: number;                 // calorías
  badge: '' | 'Popular' | 'Nuevo' | 'Picante' | 'Vegano' | 'Vegetariano';
  mods: string[];               // ids de ModifierGroup adjuntos a este platillo
};

type Category = { id: string; name: string; icon: string; tileA: string; tileB: string; items: Item[] };

window.TOLATINO_MENU = { restaurant: Restaurant, groups: Record<string, ModifierGroup>, categories: Category[] };
```

### Las 15 categorías (id → nombre, iconKey, colores de tile)
`combos` Combos · `burgers` Hamburguesas · `chicken` Pollo · `breakfast` Desayuno · `sides` Papas y Sides · `kids` Cajita Amigo · `salads` Ensaladas · `wraps` Wraps · `desserts` Postres · `coffee` Café · `drinks` Bebidas · `shakes` Malteadas · `snacks` Snacks · `family` Para Compartir · `limited` Edición Limitada. **10 platillos cada una.**

### Los 22 grupos de addons (`groups`)
`size3` Tamaño · `coffeeSize` Tamaño (café) · `patty` La carne · `bread` Tipo de pan · `cheese` Queso extra · `addBurger` Agrégale extras (burger) · `addBreak` extras (desayuno) · `addSalad` extras (ensalada) · `sauce` Salsas · `remove` Quítale algo · `drink` Elige tu bebida · `friesType` Elige tu acompañamiento · `milk` Tipo de leche · `sweet` Nivel de dulce · `temp` Temperatura · `shots` Shots de espresso · `toppings` Toppings · `dressing` Aderezo · `protein` Proteína · `ice` Hielo · `kidsSide` Acompañamiento · `kidsDrink` Bebida.

Cada platillo referencia por id los grupos que le aplican (`mods`). Ejemplo real:
```json
{ "id":1, "cat":"combos", "name":"Combo Amigo Clásico",
  "desc":"Hamburguesa con queso, papas medianas y bebida.",
  "price":6.99, "kcal":1050, "badge":"Popular",
  "mods":["friesType","drink","addBurger","sauce","remove"] }
```
Mods por defecto por categoría: combos `friesType,drink,addBurger,sauce,remove` · burgers `patty,cheese,addBurger,sauce,remove,bread` · chicken `sauce,addBurger,remove` · breakfast `addBreak,sauce,remove` · sides `size3,sauce` · kids `kidsSide,kidsDrink,sauce` · salads `dressing,protein,addSalad` · wraps `sauce,addBurger,remove` · desserts `toppings` · coffee `coffeeSize,milk,sweet,temp,shots` · drinks `size3,ice` · shakes `size3,toppings` · snacks `sauce` · family `drink,friesType` · limited `size3,sauce`. Algunos ítems triviales (agua, leche, manzana, jarra) llevan `mods: []`.

---

## Design Tokens (hifi)

### Colores
| Rol | Hex |
|---|---|
| Primario (morado) | `#7B61FF` · hover/press `#6D4DF6` / `#5A3FE0` |
| Tinta / texto principal | `#1E1B2E` |
| Texto secundario | `#6E6A85` / `#4A4660` / `#56506E` |
| Texto terciario / muted | `#8A86A0` / `#9A96AE` / `#B7B3C6` |
| Ámbar (precio/estrella/oferta) | `#F4B740` · badge oferta bg `#F6E05E` |
| Verde (éxito / abierto / payout) | `#1F9D57` / `#1F8A4C` · bg `#E3F5EA` |
| Rosa/rojo (alerta / like / rechazar / picante) | `#F0466E` / `#D6336C` · bg `#FDE7EF` / `#FFF1F2` |
| Ámbar de aviso (preparando / low-stock) | `#9A6A12` · bg `#FEF3C7` / `#FCEFD6` / `#FFFBEB`, borde `#FDE68A` |
| Azul (info) | `#2F6FED` · bg `#E5EFFB` |
| Superficie lila (chips/avatares) | `#EFEBFF` / `#F1EFFA` / `#F7F5FF` / `#F7F6FC` |
| Fondo app (teléfono) | `#F4F2F9` · fondo desk `#E7E5EC` |
| Superficie tarjeta | `#FFFFFF` |
| Borde sutil | `rgba(30,27,46,.06–.10)` |
| Input borde | `#E2DEF4` · foco `#7B61FF` |

**Colores por categoría** (usados como `repeating-linear-gradient(135deg, tileA 0 Xpx, tileB Xpx 2Xpx)` como placeholder de imagen):
combos `#FCE7CF/#F7D6B4` · burgers `#FBE0CE/#F3C9AE` · chicken `#FCEFCF/#F4E0A6` · breakfast `#FEF0BE/#FBE39A` · sides `#FCE9C6/#F5D89E` · kids `#E3EEFB/#CFE0F5` · salads `#E1F3E7/#CFE6C9` · wraps `#EFE7D2/#E0D3B4` · desserts `#FBE6EF/#F4CFDF` · coffee `#EADCCC/#DAC3A9` · drinks `#E1ECFB/#CCDDF4` · shakes `#F3DEEB/#E7C3D8` · snacks `#FCE0D7/#F5C7B9` · family `#EBE6FB/#DBD1F3` · limited `#F7E7C2/#EED59B`. Restaurante (hero) `#F1E6FA/#E6D4F3`. En producción, reemplazar por fotos subidas (con estos degradados como skeleton/fallback).

### Tipografía
- Familia única **`'Plus Jakarta Sans'`** (Google Fonts, pesos 400/500/600/700/800), fallback `system-ui, sans-serif`.
- Titular de pantalla 19–23px/800 (`letter-spacing:-.01 a -.02em`); título de sección 15–17px/800; título de tarjeta/ítem 13.5–14px/800; cuerpo 12.5–13px/500; meta 11px/600–700; overline 10px/800 uppercase `letter-spacing:.05–.06em`; precio 13.5–18px/800.
- Párrafos `line-height:1.4–1.5`.

### Radios · Sombras · Espaciado
- **Radios:** teléfono `42px`; chips/pills `999px`; botones `11–16px`; tarjetas `13–16px`; hoja inferior (bottom sheet) `24px 24px 0 0`; diálogo centrado `24px`; toggle track `13px`; avatar `50%`.
- **Sombras:** tarjeta `0 4–14px 14–24px rgba(60,50,110,.05–.06)`; CTA morado `0 12px 24px rgba(123,97,255,.3)`; CTA verde `0 12px 24px rgba(31,157,87,.3)`; modal/hoja `0 -18px 50px rgba(28,24,46,.3)`; diálogo `0 30px 70px rgba(28,24,46,.4)`; teléfono `0 30px 70px rgba(60,50,110,.24)`.
- **Espaciado:** base 4px. Padding de tarjeta 11–16px. Gaps 7–14px. Padding de pantalla 14–18px horizontal. **Alturas táctiles ≥44px** en controles principales.
- **Toggle switch:** track 42×25px, knob 19px (`top:3px`), `left:3px`→`left:20px`, on `#7B61FF` / off `#D8D2E6`.

### Animaciones (keyframes)
- `tlsheet` (hoja inferior sube): `translateY(100%)→0`, `.24–.26s cubic-bezier(.4,0,.2,1)`.
- `tlfade` overlay `.2s`; `tlpop` (diálogo/toast) `scale(.94)→1` `.2–.28s` (diálogo usa `cubic-bezier(.34,1.4,.5,1)` con rebote).
- `tlpulse` (halo pulsante en dot activo / alerta nuevo pedido) `1.6–1.8s infinite`.
- `tlspin` (spinner de "realizando pedido") `.8s linear infinite`; `tlbob` (repartidor en el mapa) sube-baja `1.4s`; `tlblink` (punto "EN VIVO") `1.4s`.

---

## FASE 1 — Cliente (`ToLatino Ordenar.dc.html`)

App del comensal. Marco teléfono con status bar `9:41`. Estado `view` conmuta 5 vistas: `menu · cart · checkout · track · done`. Una **hoja de detalle de platillo** y **hojas secundarias** (dirección, instrucciones de entrega, ayuda, reportar) se superponen a cualquier vista.

### 1.1 Menú (`view: 'menu'`)
- **Hero** (186px): degradado del restaurante; botones flotantes redondos (atrás, compartir, favorito ♥ toggle `#F0466E`); badge de oferta ámbar (`🔥 2×1 en Combos los martes`).
- **Ficha** (tarjeta que solapa el hero, radio `24px 24px 0 0`): nombre + check verificado morado; fila `★ 4.8 · (2.1k+) · Comida rápida · $ · Abierto`; **3 mini-tarjetas** (Tiempo `20–35 min` · Entrega `$1.99`/`Gratis` · `4.8★ 2.1k reseñas`); **toggle segmentado Entrega/Recoger** (`#ECE8F6` track, segmento activo blanco con sombra); **barra de dirección** (icono pin lila, "Entregar a Casa" + dirección, chevron → abre hoja de dirección); **buscador** ("Buscar en Burger Amigo…", con botón limpiar ✕).
- **Los más pedidos** (carrusel horizontal): tarjetas 138px con tile+glifo, botón `+` (quick-add), nombre (2 líneas), precio.
- **Barra de categorías sticky** (`position:sticky; top:0`, fondo `rgba(244,242,249,.94)` + `backdrop-filter:blur(8px)`): chips `Todos`, `🔥 Populares`, y las 15 categorías. Chip activo `#1E1B2E`/blanco; inactivo blanco con borde. Tocar un chip **filtra** a esa sección (o `Todos` = todas las secciones, `Populares` = ítems con badge Popular).
- **Secciones de menú**: por categoría, con encabezado (tile+glifo, nombre, contador) y **filas de ítem**: nombre + badge (Popular ámbar / Nuevo lila / Picante rosa), descripción (2 líneas, `-webkit-line-clamp`), `precio · kcal · [tag dietético verde]`, y **thumbnail 92px** (tile+glifo) con botón `+` (quick-add) y **burbuja de cantidad** morada si ya está en el carrito. Tocar la fila abre la hoja de detalle.
- **Buscar**: filtra por nombre+desc en todas las categorías → sección "Resultados"; estado vacío "Sin resultados para «…»".
- **Barra de carrito flotante** (si hay ítems): botón morado fijo abajo `[N] Ver carrito … $subtotal` (`animation:tlpop`).

### 1.2 Hoja de detalle de platillo (bottom sheet, `max-height:92%`)
- Cabecera 150px (tile+glifo grande) con botón cerrar; nombre + precio; descripción; `kcal · [dietético] · [badge]`.
- **Grupos de addons** (uno por cada `item.mods`): encabezado con nombre, **pill Obligatorio/Opcional**, y "Elige uno" (single) o "Elige hasta N" (multi). Opciones como filas con **control** (radio circular para single / checkbox cuadrado para multi, `#7B61FF` al activar) + label + delta de precio (`+$1.20`, o negativo `-$1.00`). Multi respeta `max` (al exceder, descarta la más antigua).
- **Instrucciones especiales**: textarea ("¿Alguna preferencia? Ej. sin cebolla…").
- **Footer**: stepper de cantidad (± en `#F1EFFA`) + botón `Agregar N · $total` (total = (precio base + Σ deltas) × cantidad). En modo edición dice `Actualizar`.
- Al agregar: push de línea al carrito, cierra hoja, toast "Agregado al carrito ✓".

### 1.3 Carrito (`view: 'cart'`)
App-bar (atrás + "Tu carrito" + "N artículos"). Tira de modo (Entrega a Casa / Recoger, con ETA). **Líneas**: thumb, nombre, **resumen de addons** (labels seleccionados unidos por `·`, omitiendo defaults como "Mediano"/"Coca-Cola"), nota (📝), stepper (± ; el `–` en 1 se vuelve ✕ rojo = eliminar), total de línea, botón Editar (reabre hoja en modo edición). "Agregar más artículos" (vuelve al menú). **Upsell** horizontal (papas, postre, refresco, malteada con quick-add). **Código promocional** (`AMIGO10` = 10% off, tope $5; muestra ✓ verde). Aviso de mínimo si subtotal < `minFree` (delivery). **Footer**: `Ir a pagar · $subtotal`.

### 1.4 Checkout (`view: 'checkout'`)
- **Entregar en / Recoger en**: tarjeta con la dirección seleccionada (Casa/Trabajo) + "Cambiar" (abre hoja de dirección). En pickup muestra la dirección del restaurante.
- **Instrucciones de entrega** (solo delivery): abre hoja con opciones (Dejar en la puerta / En mano / Tocar timbre) + nota al repartidor.
- **Cuándo**: segmentos "Lo antes posible (ETA)" / "Programar".
- **Método de pago**: lista seleccionable — Visa ···· 4242, Mastercard ···· 8890, Apple Pay, Efectivo — + "Agregar tarjeta".
- **Propina** (solo delivery): chips `0 / 10 / 15 / 18 / 20 %` (default **18%**) calculados sobre el subtotal + "Otra"; nota "El 100% de la propina es para tu repartidor".
- **Resumen del cobro**: Subtotal, Descuento (si promo), Tarifa de entrega, Tarifa de pedido pequeño (si aplica), Tarifa de servicio, Impuestos, Propina; **Total** en grande. Nota de pago protegido.
- **Footer**: `Realizar pedido · $total` → overlay "Realizando tu pedido…" (spinner ~1.4s) → `view: 'track'`.

### 1.5 Rastreo (`view: 'track'`)
- **Mapa** (250px, degradado + calles + ruta SVG punteada morada): pin restaurante (ámbar), pin casa (morado), **repartidor** (verde, `animation:tlbob`) que se mueve por la ruta cuando el estado es "En camino" (`left/top` interpolados con `transition`). Botón "Ayuda" flotante.
- **Tarjeta de estado**: eyebrow ("Llegada estimada"/"Entregado") + título del paso actual + **ETA grande** (`~N min`, "llega 8:24 pm"). Barra de progreso (gradiente morado).
- **Stepper vertical**: `Recibido → Confirmado → Preparando → En camino → Entregado` (delivery) o `… → Casi listo → Listo para recoger` (pickup). Dots: hechos verde ✓, activo morado con `tlpulse`, pendientes gris; con horas y sub-textos.
- **Tarjeta del repartidor** (aparece en "En camino"): avatar, "Marco P. · tu repartidor", `★ 4.9 · Honda CBR roja · GHT-2481`, botones llamar / mensaje.
- **Resumen del pedido** (id `#A-…`, ítems, Total pagado, línea de pago + dirección).
- Botones **Reportar un problema** / **Ayuda**. Al entregar aparece **Calificar tu pedido** → `view: 'done'`.
- **Progresión temporal (demo)**: al hacer el pedido arranca un `setInterval` (~380ms, `tick += 0.5` hasta 30) que deriva el estado por umbrales (3/8/16/30) y anima al repartidor. En producción esto viene de eventos del backend / websockets.

### 1.6 Post-pedido (`view: 'done'`)
- Confirmación ✓ "¡Disfruta tu comida!". **Calificación**: 5 estrellas (ámbar al seleccionar) → al calificar aparecen **tags** (Comida deliciosa, Llegó a tiempo, Bien empacado, Repartidor amable, Buen precio, Pedido correcto) + "Enviar calificación".
- **Recibo** completo (ítems + desglose + Total).
- Acciones: **Volver a pedir**, **Reportar problema**, **Ayuda**.

### 1.7 Hojas secundarias (superpuestas)
- **Dirección** (`modal:'address'`): lista de direcciones guardadas (Casa `home`, Trabajo `work`) con radio; **Agregar dirección nueva** → formulario (calle, apto, CP, etiqueta Casa/Trabajo/Otro, "Guardar y usar"; queda seleccionada).
- **Instrucciones de entrega** (`dropoff`): radios + nota.
- **Ayuda** (`help`): Mensaje al repartidor · Llamar al restaurante · Contactar soporte (chat 24/7) · Reportar un problema (→ report).
- **Reportar** (`report`): Faltó un artículo · Artículo incorrecto · Llegó frío · Llegó tarde · Nunca llegó · Problema de cobro → **Resolución** (`reportDone`) con mensaje ("Te reembolsaremos…", "Aplicaremos un crédito…").

---

## FASE 2 — Cocina (`ToLatino Cocina.dc.html`)

Panel del restaurante. Estado `view`: `board · detail`. Diálogo de **pedido entrante** y hojas (asignar repartidor, rechazar, notificaciones) se superponen.

### 2.1 Diálogo de pedido entrante (al llegar un pedido nuevo)
Diálogo **centrado** (no hoja), cabecera roja `#F0466E` con campana pulsante (`tlpulse`), "¡Nuevo pedido!" + `#A-1091 · ENTREGA · hace 30 s`. Cliente + total + lista de ítems. **Selector de tiempo de preparación** (10/15/20/30 min). Botones **Rechazar** (outline rosa) / **Aceptar · N min** (verde). Aceptar → estado `preparando`; Rechazar → hoja de motivo.

### 2.2 Tablero (`view: 'board'`)
- Header: "Pedidos" + badge **EN VIVO** (punto verde `tlblink`) + campana de **notificaciones** con contador.
- **Stats de hoy** (chips horizontales): Ingresos `$842` ▲14% · Pedidos `63` (N nuevos) · Tiempo prom. `24 min` · Aceptación `98%`.
- **Tabs de estado**: `Nuevos · Preparando · Listos · En camino · Completados`, cada uno con contador (badge de "Nuevos" en rojo si hay).
- **Tarjetas de pedido** (del estado activo): avatar+iniciales del cliente, `#id` + chip de modo (ENTREGA lila / RECOGER ámbar), "cliente · hace Xmin", total + "N art.", resumen de ítems (`1× Combo… · 2× Malteada…`). En "En camino" muestra línea verde del repartidor; en "Completados" muestra `★★★★★ · calificado`. **Botón(es) de acción contextual** (ver máquina de estados) + tocar la tarjeta abre el detalle.

### 2.3 Detalle del pedido (`view: 'detail'`)
- **Banner de estado** (color por estado) con icono, título, subtítulo y chip de modo.
- **Progreso del pedido** (línea de tiempo vertical con horas): Recibido → Aceptado y en preparación → Listo → Repartidor en camino → Entregado (delivery) / Recogido (pickup).
- **Cliente**: avatar, nombre, teléfono, botones llamar/mensaje; **dirección** + instrucción de entrega (delivery); **nota del cliente** en tarjeta ámbar.
- **Para preparar · N artículos**: cada ítem con `N×`, nombre, addons (gris) y **nota crítica** en rojo (`⚠ Sin cebolla`), + precio.
- **Repartidor asignado** (si aplica): avatar, nombre, vehículo/placa, ETA.
- **Pago y liquidación**: Subtotal comida, Impuestos (recaudados), Propina (100% al repartidor), **Comisión To'Latino (15%)** en rojo; **Tu pago neto** en verde grande; chip "Visa ···· 4242 · Depósito estimado vie 11 jul".
- **Footer de acción contextual** (ver máquina de estados). En "nuevo" incluye Rechazar.

### 2.4 Máquina de estados del pedido
`nuevo → preparando → listo → (delivery) camino → completado` · `nuevo → preparando → listo → (pickup) completado` · cualquiera → `rechazado`.
Acciones: **Aceptar** (con prep_min) → `preparando` · **Marcar listo** → `listo` · **Asignar repartidor** (solo delivery) → `camino` · **Marcar entregado/recogido** → `completado` · **Rechazar** (con motivo) → `rechazado`.

### 2.5 Asignar repartidor (hoja)
- **Tus repartidores** (propios): Marco P. (Libre · en el local, ★4.9, "Sale ahora"), Luis G. (Libre · a 3 min), Sofía R. (En ruta · #A-1082, "Libre ~8 min"). Cada uno: avatar, nombre, dot de estado (verde libre / ámbar en ruta), rating, ETA. Tocar → asigna, estado `camino`, set `driver` con ETA.
- **Apps externas (respaldo)**: Uber Direct (`$8.50 · ~6 min`), DoorDash Drive (`$9.00 · ~9 min`). Tocar → asigna repartidor externo.

### 2.6 Otras hojas
- **Rechazar** (`reject`): motivos (Artículo agotado · Cocina saturada · Cerramos por hoy · Fuera de zona) → estado `rechazado`, vuelve al tablero.
- **Notificaciones** (`notif`): Nuevo pedido · Repartidor recogió · Nueva reseña ★★★★★ · Depósito programado · Bajo stock; con icono, texto, hora y punto de no-leído.

---

## FASE 3 — Menú (`ToLatino Menu Builder.dc.html`)

Módulo del comercio para armar el menú. Header "Menú de comida" + sub `Burger Amigo · 150 platillos · 15 categorías` + botón **Ver listado** (→ Cliente). 4 subtabs.

### 3.1 Platillos
Banner "Este menú alimenta tu listado". Buscador. **Filtro de categorías** (chips con contador). Lista de **tarjetas de ítem**: thumb (tile+glifo) con badge de esquina, nombre + precio, descripción (1 línea), chip de categoría, **chip "N addons"** (lila con +), kcal, chip "Oculto" si aplica; opacidad reducida si oculto. Tocar → hoja de **editar**. Footer: **Agregar platillo**.

### 3.2 Categorías
Lista de las 15 categorías: handle de arrastre (visual), tile+glifo, nombre, "N platillos", **toggle** de visibilidad. "+ Agregar categoría".

### 3.3 Addons
**Biblioteca de grupos reutilizables** (los 22 grupos): nombre, pill Obligatorio, "Elige uno/varios · usado en N platillos", y chips de opciones con su delta (`+$1.20`, `$0`) + "+N más". "+ Nuevo grupo de addons". Es el corazón del sistema de addons: se definen una vez y se adjuntan a cualquier platillo.

### 3.4 Publicación
Stats (Publicados 150 · Categorías 15 · Con addons 150). **Preview del listado** (mini-ficha del restaurante con oferta) + **Ver como cliente** (→ Cliente). Aviso verde "Tu menú está sincronizado…".

### 3.5 Hoja Agregar/Editar platillo (bottom sheet, `max-height:94%`)
- **Preview en vivo** (tarjeta que refleja lo que escribes: tile+glifo, nombre, precio, descripción, "N grupos de addons · Categoría").
- **Campos**: Nombre*, Descripción, Precio* ($), Calorías, **Categoría** (chips), **Etiqueta** (Popular/Nuevo/Picante/Vegano/Vegetariano, exclusiva-toggle).
- **Addons y opciones**: contador "N adjuntos"; **cada grupo de la biblioteca como checkbox card** (nombre, pill Oblig., "Elige uno/varios · N opciones") — tocar adjunta/quita. "+ Crear grupo de addons".
- **Footer**: Eliminar (solo edición) + **Publicar platillo / Guardar cambios** (deshabilitado sin nombre+precio). Al guardar: añade/actualiza el ítem, vuelve a Platillos filtrando su categoría, toast "Publicado en tu listado ✓".

---

## Interactions & Behavior (resumen transversal)
- **Bottom sheets** suben con `tlsheet`; overlay `rgba(28,24,46,.5)` con `tlfade`; cerrar por botón o tocando el overlay. **Diálogo centrado** (pedido entrante) con `tlpop` + rebote.
- **Toasts** aparecen ~1.8–1.9s abajo, tinta `#1E1B2E`, ✓ verde.
- **Toggles/steppers/chips** con feedback inmediato de estado (morado activo). Transiciones ~.18–.5s ease.
- **Quick-add** desde tarjetas/carruseles agrega con addons por defecto (single required = primera opción) sin abrir la hoja.
- **Precio en vivo** en la hoja de detalle recalcula al tocar opciones.
- **Cross-navegación** entre fases: en el prototipo el switcher superior; en la app real, ruteo normal + estado de sesión/negocio.

## State Management
- **Cliente**: `view`, `mode(delivery|pickup)`, `cat`, `query`, `fav`, `cart[]` (líneas `{key,itemId,qty,sel,note}` donde `sel` = por grupo: índice (single) o array de índices (multi)), `sheet` (detalle/edición de línea), `modal` (hojas secundarias), `addrId`, `payId`, `tipPct`, `asap`, `promo/promoOk`, `dropoff/dropoffNote`, direcciones extra, `tick` (rastreo), `rating/rateTags`.
- **Cocina**: `view`, `tab` (estado activo), `activeId`, `orders[]` (con `status`, `cust`, `items[]`, montos, `driver`, tiempos), `modal` (assign/reject/notif), `incoming`, `prep`.
- **Menú**: `subtab`, `cat`, `query`, `items[]` (copia editable del catálogo, con `visible`), `catState` (visibilidad por categoría), `sheet` (draft add/edit con `mods[]`).
- En producción: catálogo, pedidos, direcciones, métodos de pago y repartidores vienen de API; el rastreo se alimenta por eventos en tiempo real; el estado de UI (filtros, hojas, drafts) permanece local.

## Lógica de negocio — cálculo de cobros (Cliente) y liquidación (Cocina)
```
subtotal        = Σ (precioBase(item) + Σ deltasAddon(sel)) × qty
tarifaEntrega   = mode==='delivery' ? restaurant.deliveryFee : 0
feePedidoPequeño= (delivery && subtotal < minFree) ? smallOrderFee : 0
tarifaServicio  = round(subtotal × serviceRate, 2)         // 10%
impuestos       = round((subtotal + tarifaServicio) × taxRate, 2)   // 8.25%
descuento       = promoOk ? min(5, round(subtotal × 0.10, 2)) : 0   // AMIGO10
propina         = delivery ? round(subtotal × tipPct/100, 2) : 0
TOTAL (cliente) = subtotal − descuento + tarifaEntrega + feePedidoPequeño + tarifaServicio + impuestos + propina

// Cocina (payout al restaurante):
comisiónToLatino= round(subtotal × 0.15, 2)     // 15%
pagoNeto        = round(subtotal − comisiónToLatino, 2)   // la propina es 100% del repartidor
```
Todos los redondeos a 2 decimales. Ajustar tasas a las reales del negocio.

## Assets
- **Fuente:** Plus Jakarta Sans (Google Fonts).
- **Iconos:** SVG inline (stroke 2–2.4px, lineal redondeado) generados por helpers `IC(name,...)` en cada archivo. Reemplazables por **Lucide/Feather** (mismo estilo). Glifos de comida por categoría (burger, drumstick, fries, coffee, shake, icecream, etc.) — usar íconos equivalentes o ilustraciones.
- **Imágenes:** ninguna real; degradados a rayas por categoría como placeholder → reemplazar por fotos del negocio (con el degradado como skeleton).
- **Logo:** wordmark `To'`(tinta) + `Latino`(morado) + diamante ámbar 45° (CSS, sin archivo).

## Cómo ver los diseños (capturas / guía visual)
- **`Guia visual.html`** — abre este archivo para ver **las 15 pantallas de las 3 fases** en una sola página (contact sheet). Para exportar el set completo de **capturas en PDF**: ábrelo y usa **Cmd/Ctrl + P → Guardar como PDF**.
- Cada `.dc.html` es **deep-linkable** con `?screen=`, así puedes abrir/capturar una pantalla puntual:
  - Cliente: `?screen=menu | item | cart | checkout | track | done`
  - Cocina: `?screen=incoming | board | detail | assign`
  - Menú: `?screen=items | add | categories | addons | publish`
- También puedes abrir cualquier `.dc.html` directo en el navegador y **navegarlo interactivamente** (requiere `support.js` + `tolatino-menu.js` en la misma carpeta).

## Files (en este paquete)
- `README.md` — este documento (léelo completo primero).
- `Guia visual.html` — **guía visual imprimible** con las 15 pantallas (contact sheet → PDF de capturas).
- `ToLatino Ordenar.dc.html` — **Fase 1 · Cliente** (menú, detalle+addons, carrito, checkout, rastreo, post-pedido).
- `ToLatino Cocina.dc.html` — **Fase 2 · Cocina** (entrante, tablero, detalle, asignar repartidor, pago/payout, notificaciones).
- `ToLatino Menu Builder.dc.html` — **Fase 3 · Menú** (platillos, categorías, addons, publicación, add/edit con addons).
- `tolatino-menu.js` — **datos compartidos** (`window.TOLATINO_MENU`): restaurante, 22 grupos de addons, 15 categorías × 10 platillos = 150 ítems. Fuente de verdad del catálogo.
- `support.js` — runtime de los prototipos `.dc.html` (solo para abrirlos en el navegador; **no** portar a producción).

> Para ver el look & comportamiento: abre los `.dc.html` en un navegador (requieren `support.js` y `tolatino-menu.js` en la misma carpeta). Úsalos como fuente de verdad visual; recréalos con los componentes y el ruteo del codebase destino.
