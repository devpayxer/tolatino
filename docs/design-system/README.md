# Handoff COMPLETO — To'Latino · Plataforma multicanal

> **Empieza por aquí.** Este es el paquete de handoff **completo** de To'Latino para construir la app real en Claude Code. Contiene **todos** los diseños (18 prototipos), los datos compartidos, la guía visual imprimible y la documentación detallada. Léelo entero, luego abre `PROMPT.md` para el mensaje que pegas en Claude Code.

---

## 0. Cómo usar este paquete (orden de lectura)

1. **`README.md`** (este archivo) — visión global, arquitectura, tokens compartidos, mapa de archivos, plan de implementación.
2. **`PROMPT.md`** — el primer mensaje listo para pegar en Claude Code.
3. **`01-plataforma.md`** — detalle a fondo del **Dominio A**: Bienvenida (landing), app Cliente (Comunidad/Negocios/Eventos/Muy pronto) y Panel de negocio + módulos.
4. **`02-pedidos.md`** — detalle a fondo del **Dominio B**: flujo de pedidos de comida (Cliente Ordenar · Cocina · Menú Builder) y el modelo de datos `tolatino-menu.js`.
5. **`Guia visual.html`** — contact sheet imprimible; ábrela en el navegador y usa **Cmd/Ctrl + P → Guardar como PDF** para tener todas las pantallas del flujo de pedidos en un PDF.
6. Los **`.dc.html`** — abre cualquiera en el navegador (requieren `support.js`, y los de pedidos también `tolatino-menu.js`, en la misma carpeta) para ver look & comportamiento reales.

---

## 1. Overview

**To'Latino** es una plataforma geolocalizada por ciudad, **mobile-first** y **bilingüe (español base, inglés secundario)** para la comunidad latina en EE. UU. Es un *"Yelp + Nextdoor + Eventbrite + DoorDash, de latinos para latinos"*: los emprendedores publican su negocio y la comunidad local descubre productos y servicios, interactúa, asiste a eventos y **ordena comida** con entrega/recogida.

El producto tiene **dos grandes dominios** que comparten marca, tokens y modelo de negocio:

- **Dominio A — Plataforma multicanal** (`01-plataforma.md`): la cara pública + la app del ciudadano + el panel de administración del negocio con sus módulos por rubro y plan.
- **Dominio B — Flujo de pedidos** (`02-pedidos.md`): el sub-sistema tipo DoorDash/Uber Eats que conecta al comensal, la cocina del restaurante y el builder de menú, todos sobre un mismo catálogo.

Ambos dominios son **la misma app**: el flujo de pedidos (B) es una capa vertical sobre la plataforma (A) — el Cliente-Ordenar vive dentro de la app del ciudadano, y Cocina/Menú viven dentro del panel de negocio.

---

## 2. About the Design Files (léelo)

Los archivos `.dc.html` de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran el look & feel y el comportamiento previsto — **NO** código de producción para copiar tal cual. Están escritos como "Design Components" (`.dc.html`): plantilla + clase de lógica que corren sobre `support.js` (un runtime de prototipo).

**La tarea es recrear estos diseños en el entorno del codebase destino** con sus patrones y librerías. Si el repo está vacío, la recomendación es:

- **React + TypeScript** (Vite o Next.js).
- **react-router** para rutas; **i18n** (react-i18next o similar) con **ES por defecto, EN secundario**.
- Estado con **Context/Zustand** (o Redux Toolkit si el equipo lo prefiere).
- Iconos **Lucide** (mismo estilo lineal redondeado que los SVG inline del prototipo).
- Estilos a elección del equipo (CSS Modules, Tailwind o styled-components) — el prototipo usa estilos inline, muy fáciles de portar.

**No copies el HTML a producción, ni portes `support.js`.** Úsalo como fuente de verdad visual/comportamental y reimpleméntalo con componentes reales, ruteo real y datos de una API.

---

## 3. Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios, sombras, estados e interacciones son **finales** y deben reproducirse pixel-perfect con la librería de componentes del codebase. Los textos (ES; y ES/EN en la plataforma) son finales y sirven como base de i18n.

---

## 4. Arquitectura de la app real

> El prototipo usa **andamiaje de revisión** que **debes descartar**: el "Studio" con 3 marcos de dispositivo lado a lado (`To'Latino Studio.dc.html`) y el "switcher" Cliente/Cocina/Menú de los archivos de pedidos existen solo para revisar todo junto. En la app real hay **una sola app responsiva**, con rutas y estado global normales.

### Superficies → rutas sugeridas

```
PÚBLICO
  /                         Bienvenida (landing pública)                     [A]

CLIENTE (ciudadano autenticado, mobile-first, barra inferior con FAB +)
  /comunidad                Feed estilo Nextdoor (home de la app)            [A]
  /negocios                 Directorio estilo Yelp (filtros, mapa)           [A]
  /negocios/:slug           Ficha pública del negocio                        [A]
  /eventos                  Eventos con boletos                              [A]
  /transporte /inmuebles /autos /trabajos   "Muy pronto" + lista de espera   [A]
  /r/:slug                  Restaurante: ficha + menú (Ordenar)              [B]
  /carrito  /checkout       Carrito y pago                                   [B]
  /pedido/:id               Rastreo en vivo + post-pedido                    [B]

NEGOCIO (panel de administración, /negocio/*)
  /negocio                  Resumen (dashboard)                              [A]
  /negocio/listado/*        Info, fotos, horario, relacionados              [A]
  /negocio/menu             Menú Builder                                     [B]
  /negocio/pedidos          Cocina (recepción/gestión de pedidos)            [B]
  /negocio/servicios /reservas /productos /renta /eventos …  Módulos por rubro [A]
  /negocio/clientes /mensajes /resenas /novedades            Clientes        [A]
  /negocio/pagos /personal /empleos /facturacion /ajustes    Cuenta          [A]
```

### Estado global (mínimo)
`lang ('es'|'en')` · `city` · `session/user` · `activeCategory` · y para el panel `plan (free|verified|premium)` + `category (rubro)`. Todo lo demás (filtros, hojas/modales, drafts, carrito) es estado local por vista. En producción, datos vienen de una **API geolocalizada por ciudad**; el rastreo de pedido se alimenta por **eventos en tiempo real / websockets**.

### Responsive (breakpoints, iguales en toda la app)
- **Móvil ≤767px** — 1 columna, header compacto, chips deslizables, **barra de navegación inferior fija** con **FAB "+" central**; hojas (bottom sheets) suben desde abajo.
- **Tablet 768–1023px** — 2 columnas donde aplica; barra superior en vez de barra inferior.
- **Escritorio ≥1024px** — layout multi-columna completo (filtros laterales, rails de carrito, tableros en grid); las hojas se vuelven **modales centrados**.

El 99% de los usuarios son móviles → **prioriza la fidelidad en móvil.**

---

## 5. Design Tokens — fuente de verdad compartida

Ambos dominios comparten exactamente estos tokens. (Detalle ampliado por dominio en `01-plataforma.md` §Design Tokens y `02-pedidos.md` §Design Tokens.)

### Colores
| Rol | Hex |
|---|---|
| **Primario (morado)** | `#7B61FF` · hover/press `#6D4DF6` / `#6743E2` / `#5A3FE0` |
| Tinta / texto principal | `#1E1B2E` |
| Texto secundario | `#6E6A85` / `#5A5570` / `#4A4660` |
| Texto terciario / muted | `#8A86A0` / `#9A96AE` / `#B7B3C6` |
| **Ámbar (diamante de marca · precio · estrella · oferta)** | `#F4B740` |
| Verde (éxito / abierto / payout) | `#1F9D57` / `#1F8A4C` · bg `#E3F5EA` |
| Rosa/rojo (like / alerta / rechazar / picante) | `#F0466E` / `#D6336C` · bg `#FDE7EF` |
| Ámbar de aviso (preparando / low-stock / muy pronto) | texto `#9A6A12` · bg `#FEF3C7` / `#FCEFD6` |
| Azul (info / "mi barrio" / local) | `#2F6FED` · bg `#E5EFFB` |
| Superficie lila (chips/avatares) | `#EFEBFF` / `#F1EFFA` / `#F7F5FF` |
| Fondo app | `#F4F2F9` · fondo dashboard `#E7E5EC` |
| Superficie tarjeta | `#FFFFFF` |
| Borde sutil | `rgba(30,27,46,.06–.10)` · input `#E2DEF4`, foco `#7B61FF` |

**Colores por categoría** (dots/tags de negocios y placeholders de comida) — ver tablas completas en cada doc de dominio. Se usan como placeholder de imagen: `repeating-linear-gradient(135deg, colorA 0 11px, colorB 11px 22px)`. **En producción, reemplazar por fotos subidas por el negocio** (con el degradado como skeleton/fallback).

### Tipografía
- **Familia única: `'Plus Jakarta Sans'`** (Google Fonts, pesos 400/500/600/700/800), fallback `system-ui, sans-serif`.
- Titulares en `800` con `letter-spacing` negativo (−.02 a −.03em) y `text-wrap:balance`; cuerpo en `500`, `line-height 1.4–1.55`, `text-wrap:pretty`; overlines en `800` uppercase con `letter-spacing .04–.06em`.
- Escala móvil: hero 30px · H1 20–23px · título tarjeta 14–16px · cuerpo 13.5–14px · meta 11–12px. Escala escritorio: hero 52px · H1 34px.

### Radios · Sombras · Espaciado
- **Radios:** chips/pills `999px`; botones `11–16px`; tarjetas `13–20px`; paneles/modales `18–24px`; bottom sheet `24px 24px 0 0`; marco teléfono (proto) `42px`; avatar `50%`.
- **Sombras:** tarjeta `0 4–10px 14–26px rgba(60,50,110,.05–.06)`; CTA morado `0 12–14px 24–28px rgba(123,97,255,.3–.4)`; modal `0 30px 70px rgba(30,27,46,.35)`; bottom sheet `0 -18–20px 50px rgba(28,24,46,.3)`.
- **Espaciado:** base **4px**. Padding de tarjeta 11–22px, gaps 7–16px. **Alturas táctiles ≥44px** en controles móviles.
- **Animaciones:** sheets `tlsheet` (translateY 100%→0, ~.24s); overlay `tlfade`; diálogos `tlpop` (con rebote); halos `tlpulse`; spinner `tlspin`. Transiciones de UI ~.18s ease.

### Logo
Wordmark tipográfico: **`To'`** (tinta `#1E1B2E`) + **`Latino`** (morado `#7B61FF`) + **diamante ámbar** `#F4B740` girado 45°. Reproducible en CSS, sin archivo de imagen.

---

## 6. Assets
- **Fuente:** Plus Jakarta Sans (Google Fonts).
- **Iconos:** SVG inline (stroke 2–2.4px, lineal redondeado). Reemplazar por **Lucide/Feather**.
- **Imágenes:** ninguna real; degradados a rayas por categoría como placeholder → reemplazar por fotos del negocio (degradado como skeleton).
- **Logo:** solo CSS (ver arriba).

---

## 7. Mapa de archivos

### Documentación
- `README.md` — este índice maestro.
- `PROMPT.md` — mensaje para pegar en Claude Code.
- `01-plataforma.md` — detalle del Dominio A (landing, app cliente, panel de negocio + módulos).
- `02-pedidos.md` — detalle del Dominio B (Ordenar, Cocina, Menú Builder) + modelo de datos.
- `Guia visual.html` — contact sheet imprimible del flujo de pedidos (→ PDF).

### Diseños — Dominio A · Plataforma (12)
- `To'Latino Studio.dc.html` — **archivo maestro de revisión**: pre-home + app (Comunidad/Negocios/Eventos/Muy pronto) + panel embebido, en lienzo multi-dispositivo sincronizado. Referencia principal de Bienvenida y Cliente. *(Descartar el andamiaje del Studio al implementar.)*
- `To'Latino Business Dashboard.dc.html` — panel de negocio (escritorio).
- `To'Latino Business Dashboard Mobile.dc.html` — panel de negocio (móvil, con drawer).
- `ToLatino Business Detail.dc.html` — ficha pública del negocio.
- `ToLatino Food Module.dc.html` · `ToLatino Services Module.dc.html` · `ToLatino Products Module.dc.html` · `ToLatino Rental Module.dc.html` · `ToLatino Events Module.dc.html` — módulos del panel por rubro.
- `ToLatino Updates Module.dc.html` · `ToLatino Customers Module.dc.html` · `ToLatino Staff Module.dc.html` · `ToLatino Billing Module.dc.html` — módulos de Clientes/Cuenta.
- `ToLatino Barbershop Services.dc.html` · `ToLatino Carwash Services.dc.html` — ejemplos de módulo de servicios por rubro.

### Diseños — Dominio B · Pedidos (3 + datos)
- `ToLatino Ordenar.dc.html` — **Cliente**: menú, detalle+addons, carrito, checkout, rastreo en vivo, post-pedido.
- `ToLatino Cocina.dc.html` — **Cocina**: pedido entrante, tablero, detalle, asignar repartidor, pago/payout, notificaciones.
- `ToLatino Menu Builder.dc.html` — **Menú**: platillos, categorías, addons (biblioteca reutilizable), publicación, add/edit.
- `tolatino-menu.js` — **datos compartidos** `window.TOLATINO_MENU`: restaurante "Burger Amigo", 22 grupos de addons, 15 categorías × 10 platillos = **150 ítems**. Fuente de verdad del catálogo (en producción, tu API con la misma forma).

### Runtime del prototipo (NO portar)
- `support.js` — runtime de los `.dc.html`. Solo para abrirlos en el navegador.

---

## 8. Plan de implementación sugerido (por fases)

1. **Fundaciones** — proyecto React+TS, router, i18n (ES/EN), tema con los tokens de §5, layout responsivo base (header + barra inferior móvil con FAB), contexto de idioma/ciudad/sesión.
2. **Bienvenida** — landing pública `/` (ver `01-plataforma.md` §1).
3. **Cliente / Comunidad** — feed Nextdoor `/comunidad` con compositor y posts interactivos.
4. **Cliente / Negocios + Eventos** — directorio Yelp con filtros reales y mapa; eventos con boletos.
5. **Pedidos / Cliente** — `/r/:slug` → carrito → checkout → rastreo (ver `02-pedidos.md` Fase 1 + §Lógica de cobros).
6. **Panel de negocio** — Resumen + Listado + navegación por plan/rubro (ver `01-plataforma.md` §6).
7. **Pedidos / Cocina + Menú** — `/negocio/pedidos` (máquina de estados del pedido) y `/negocio/menu` (builder + biblioteca de addons).
8. **"Muy pronto"** — placeholders con lista de espera para Transporte/Inmuebles/Autos/Trabajos.

Prioriza **fidelidad visual en móvil** y **comportamiento real con estado** sobre cubrir todo de una vez.

---

> Cada `.dc.html` se abre directo en el navegador (requiere `support.js`; los de pedidos también `tolatino-menu.js`, en la misma carpeta). Son la **fuente de verdad visual y de comportamiento** — recréalos con los componentes, el ruteo y los datos del codebase destino.
