# To'Latino — Design System

Fuente única: `To'Latino App Design.dc.html` (master) + `To'Latino Barbería (silla).dc.html`. Nada más entra al sistema; todo se construye desde aquí. Si difieren, gana el master. Si algo no existe, se pregunta antes de crearlo.

## Producto
Marketplace "all in one" para la comunidad latina en USA: directorio + solicitudes de cita por categoría (belleza, comida, hogar, salud, trámites, fiestas, noche, mercados), eventos, comunidad. Lado cliente (móvil + desktop) y panel del negocio. Reglas de negocio en `CLAUDE.md`.

## Content fundamentals
- Español primero, tuteo ("tu cuadra", "llegas y esperas turno"). EN como toggle.
- Sobrio y profesional. Sin etiquetas que expliquen lo obvio ("SEGÚN LA SILLA" sobre "Desde $15" sobraba). Lo normal no se etiqueta ("sin cita" es default; solo se marca "SOLO CITA").
- Honestidad funcional: precios completos, lo que se retiene vs. se cobra, esperas reales. Una cita es "Solicitud enviada", nunca "confirmada" antes de tiempo.
- Frases cortas, sentence case. Mono en MAYÚSCULAS solo para meta/etiquetas (`★ 4.9 · 0.6 MI · HAZLETON`).
- Nombre escrito: `To'Latino` (sin espacio). Ciudad piloto y datos de ejemplo: Hazleton, PA (comunidad dominicana).
- CTA de cita/servicio: "Booking". Bilingüe ES/EN en todo texto de interfaz.
- Sin emoji. Unicode solo ★ y ·.

## Visual foundations
- **Color:** Ink `#0B0E12` para texto y botón primario. Action `#4B37F5` para todo lo interactivo (links, tab activa, botón secundario de acción, tintes). Brand `#7B61FF` solo identidad (logo, apóstrofe) — nunca botón. Signal/abierto `#00E5C4`/`#00A88F`/`#00695B`. Pro `#FFB020` (PRO, estrellas). Peligro `#C0392B`. Grises = ink con alfa (.75 / .6 / .5 / .42), nunca grises nuevos. Cada módulo tiene su tono (ver `tokens/colors.css`).
- **Fondos:** fichas y páginas blancas `#fff`; Paper `#F7F6F3` para listas/búsqueda; `#EDEBE6` detrás del dispositivo. Noche/conductor en superficie oscura `#0B0E12 / #14181F / #1C222B`. Sin gradientes decorativos; solo protección oscura sobre la foto hero.
- **Tipo:** Sora 800 (display, títulos, precios; tracking −.02 a −.045em). Manrope (cuerpo 13.5/1.62, UI 700). JetBrains Mono 600–800 (meta, etiquetas, tabs, tracking .06–.16em).
- **Radios:** tag 5 · chip cuadrado 8 · 12 · botón 15 · card 17 · card grande 22 · sheet 26 · pill 999. Intermedios usados en master y Barbería: 10, 11, 13, 14 (el más usado: inputs, filas, CTA de barra), 16, 18, 20, 24 — ver `tokens/shape.css`.
- **Neutros de imagen:** `--tl-photo-bg` #E4E1DA, `--tl-photo-bg-2` #DDD9D1. Texto sobre tinte Pro: `--tl-pro-ink` #8A5A00.
- **Bordes:** 1px `rgba(11,14,18,.08)`; secundarios 1.5px `.14`. Cards de ficha sin sombra; tarjetas de búsqueda con `--shadow-card`; tarjeta de booking flotante con `--shadow-float`.
- **Barras:** sticky con fondo blanco y línea inferior; barra inferior translúcida `rgba(247,246,243,.96)` + `blur(14px)`.
- **Tabs:** mono 800 12px, ícono 15px, subrayado 2.5px ink en la activa, scroll horizontal en móvil.
- **Estados:** hover de link → `#2E1FD1`; botones sin efectos de escala. Animaciones: fade .2s, sheet sube 64px, toast desde abajo, pop para confirmaciones.
- **Imágenes:** fotos reales, cálidas; placeholder con rayado diagonal `#E7E5E0/#EDEBE6`.
- **Layout móvil:** 375–393 de ancho, margen 20px, bloques separados 18–26px, CTA fijo abajo.
- **Desktop:** diseño 100% desktop (nunca el móvil estirado), revisado en 1440 · 1280 · 1024. Fichas: contenido + columna derecha de 372px con 48px de separación. Home/listados: ≥1200 tres columnas (categorías 240 · contenido · contexto 320); 960–1199 dos columnas (el contexto baja al final); <960 una columna (categorías en fila de chips). Grillas por ancho mínimo de tarjeta con `repeat(auto-fill, minmax(…))`: filas de negocio 320px, tarjetas 240px, bloques de contexto 300px; ningún componente móvil por debajo de su ancho mínimo.
- **Maquetado obligatorio:** grillas siempre `repeat(n, minmax(0,1fr))` (nunca `1fr` solo: una palabra larga descuadra las columnas). `Button block` siempre dentro de `<div style="display:flex">`. Etiquetas de tiles de 4 columnas en una palabra (Comida, Belleza, Hogar…); el nombre completo de la taxonomía va en listas y pantallas de categoría.

## Iconography
Set propio geométrico, trazo 1.7 (1.9–2 en tamaños chicos), grilla 24, `stroke-linecap: round`. 73 íconos: 29 del App Design + 24 de Barbería (chevrons, close, phone, like, bubble, news, warning, help, info, dollar, card, edit, coffee, lock, bag, image, wifi, smile, hash, parking, ban, verified) + 18 de categorías aprobados en Íconos propuestos (restaurant, hot, wrench, water, quote, medical, insurance, language, emergency, sign, folder, law, party, dateFree, drink, line, scale, cart). En `assets/icons/*.svg`, `assets/icons/icons.js` (`window.TLIcons`) y el componente `Icon`. Sin icon font, sin emoji. Verificado = círculo Action con check blanco.

## Components (reutilizables — React, sacados de las pantallas reales)
- `components/core/` — `Icon` (set propio, `ICON_NAMES`), `Button` (primary · action · secondary · soft · danger · ghost; lg/md/sm), `IconButton`, `Chip` (filter · selected · verified · pro · feature · slot), `Tag` (action · danger · signal · ink · neutral)
- `components/navigation/` — `Tabs` (tabs de ficha móvil), `DesktopTabs` (tabs de ficha desktop, patrón aprobado 4b; patrón 2c del master)
- `components/cards/` — `BusinessCard` (tarjeta de resultados Pro / Free, patrón aprobado 6a · master 2f), `StoryCard` ("Hoy en el barrio": historias por negocio, hasta 3 avisos de 24 h, en carrusel · patrón aprobado 8a · master 2g), `InfoCard` (bloque de ficha)
- `components/core/` (cont.) — `SearchBar`, `SectionHeader` + `Eyebrow`, `Placeholder`, `MODULES` (tonos e íconos por módulo)
- `components/layout/` — `SiteHeader` (header de la plataforma, patrón aprobado 5e: mobile · desktop; reemplaza a `AppHeader` en pantallas nuevas), `SiteFooter` (footer web: wide · stacked · accordion), `CategoryHero` (portada de página de categoría: foto, título, estadísticas, buscador y subcategorías con foto · patrón aprobado 10a · master 2h), `AppHeader` (legado del master: location · brand · dark)
- `components/navigation/` (cont.) — `BottomNav` (+ `NAV_HOME`), `ModuleSwitcher`, `FilterRail`
- `components/home/` — `ModuleGrid`, `ModuleTile`
- `components/cards/` (cont.) — `EventCard`, `EventPromo`, `BusinessRow`
- `components/community/` — `FeedPost` (con mejor respuesta)
- `components/rides/` — `RideSearch`, `RideCard`
- `components/booking/` — `StaffPicker`, `ServiceRow`, `DateStrip`, `TimeSlots`, `AddOnRow`, `DepositNote`, `StepHeader`, `TotalBar`; reservaciones de mesa (patrón aprobado 2o): `PartyPicker`, `ReservationCard`, `TableOffer`
- `components/patterns/` — patrones aprobados: `HoursPro` (datos: `hours-pro.js`)
- `components/menu/` — pestaña Menú (patrón aprobado 2i · Menú 13a): `MenuItemRow` (fila con foto 92 y +/cantidad; `card` en desktop), `MenuTile` (Populares), `OptionGroup` (radio/casillas, obligatorio → "Elige: …"), `QtyStepper`, `OrderBar` (barra flotante del pedido), `CartLine` (con instrucciones y "Editar") · botón + que se estira `AddPill` (patrón aprobado 2q · 16a: − cantidad +, papelera con 1, "Otra igual o con cambios", "¿Cuál quitas?", Deshacer)
- `components/order/` — pedido (patrones aprobados 2j–2n): `DeliveryPrefs` (2j cómo te lo entregamos), `OrderTracker` + `ChangeProposal` (2k seguimiento y cambio propuesto), `HelpReasonList` + `RequestCard` (2l ayuda y solicitud), `AuthSheet` (2m entra para pedir), `ReceiptCard` (2n recibo)
- `components/listing/` — Resumen del negocio (patrón aprobado 2p · variante 15b): `OwnerCard` (quién está detrás: persona, sus palabras, equipo y franja de lo verificado), `TodayCard` (hoy o el próximo día que abre, cómo pedir, Sin delivery). Orden y reglas de arranque en `Overview.prompt.md`
- `components/account/` — cuenta (patrón aprobado 2s): `NeighborCard`, `CompleteAccount`, `WeekAgenda`.
- `components/search/` — Buscar (patrones aprobados 2u–2x · pantalla `APP-BUSCAR`): `SearchResultRow` (2u fila con la coincidencia en negrita y la razón del resultado; `size` row | sug), `UnderstoodBar` (2v "Entendimos": palabras + filtros de la frase con ×), `SearchPanel` (2w desplegable desktop con lista + vista previa y atajos), `NotYetCard` (2x "Aún no hay" en la ciudad: Avísame + Recomiéndalo)
- `components/admin/` — Super Admin (patrones aprobados 2aj–2aq · pantalla `To'Latino Super Admin`): `AdminBar` + `AdminNav` (2ap barra con ciudad, campana con colas y cuenta con rol; lateral con grupos y contadores), `DenseTable` + `Pager` (2aj tabla densa; en móvil `AdminList` · `AdminRow`), `QueueCard` (2ak cola con SLA: ok · soon · late · done), `AuditLog` · `AuditRow` (2al, solo se agrega), `PermMatrix` (2am), `KpiRow` · `KpiCard`, `BarChart`, `HBars` (2an), `ReasonConfirm` (2ao, botón `danger` si es irreversible), `BatchProgress` (2aq), `AdminNote` (aviso warn · bad · ok · info · ink).
- `components/community/` (cont.) — 2ab `PostCard` (publicación, 29 oct: fijada; encabezado con nombre en Sora y debajo `rank` {label, shield gold | gray} · barrio · `solved` · `edited`, hora y menú ··· a la derecha; texto; children = fotos · negocio · encuesta · mejor respuesta con quién y qué, sobre Paper sin borde; y `VoteBar` en pastillas con borde: + y −, comentarios, guardar y compartir en círculos, `voted` = tinte morado; `translate` = «Ver traducción», D3), `PollOptions`; 2r `TopAnswer` (17d), `AlsoRecommended` (17c), `CommentCard` + `CommentActions` (17a), `ReplyThread` (18a) — `translate` en TopAnswer, CommentCard y cada respuesta (D3); 2ai `DominoTable` (`DominoTile`, `GameSeat`, `QuickReactions`, `GameEnd`); 2ar `ParchisTable` (tablero de parchís: jugadores con su color, `ParchisBoard` 19×19, fichas con anillo si se pueden mover, `DieFace`, jugadas posibles con COME / META).
- 2z `ReviewCard` (`components/listing/Review.jsx`: quién, estrellas, VERIFICADA · de qué pedido o cita, el dato que no se edita, texto, fotos, Recomienda, respuesta del negocio, Útil · Editar · Reportar; `summary` = forma corta del Resumen; `translate` = «Ver traducción» / «Ver original» bajo el texto si el original está en el otro idioma, D3) · 2aa `PaymentSummary` + `DepositOutcomes` (`components/booking/Payment.jsx`: precio, total, cómo se paga con barra hoy / en el local, depósito retenido, tarjeta con Cambiar; «Tu depósito» caso por caso) · 2ac `TicketQR` + `QrCode` (`components/cards/Ticket.jsx`: tipo, a nombre de, estado, QR, número y fecha).
- 2ad `OnbTopBar` · `OnbProgress` · `OnbPhases` · `OptionCard` · `OnbActionBar` (`components/onboarding/Onboarding.jsx`: fases arriba o en la columna, opción grande con círculo, Continuar inline o fijo) · 2ae `BusinessPreview` (`components/listing/BusinessPreview.jsx`: mode mini = tu negocio en una línea · card = tarjeta en resultados · page = página del negocio; view pro | free) + `PlanSwitch` · 2af `SelectionBar` + `SelectBox` (`components/panel/SelectionBar.jsx`: barra oscura fija con Todos, acciones y opciones; casilla de fila) · 2ag `RadiusMap` + 2ah `CitySoon` (`components/city/City.jsx`: radio real 2 · 5 · 10 · 30 mi con negocios y pueblos; ciudad próximamente con lista de espera, Avísame, Publica, Recomienda).
- 2as · 2at `CompaFrame` (`components/compa/Compa.jsx`: El Compa, el asistente de IA · mode sheet = 2as hoja de ayuda sobre el pedido, la cita o el boleto (88 % en móvil, panel de 420 en desktop) · mode page = 2at pasos guiados de Ayuda con «Con una persona» siempre a la vista) + `CompaAvatar`, `CompaSysLine`, `CompaUserMsg`, `CompaMsg` (EL COMPA · IA y de dónde sale), `CompaTyping`, `CompaSlot` (RequestCard · HelpReasonList · OptionCard), `CompaActionCard` («Así queda») + `CompaConfirmBar`, `CompaHandoffCard` («Tu caso pasó a Soporte»), `CompaChips`, `CompaComposer`.

Todos los componentes salen del master (1b home, 1c feed, 1d rides, 1e barbería). Texto por defecto en español; el master en inglés es solo la vista EN.

## Reglas para cada pantalla nueva
1. Cargar el bundle del sistema y componer con estos componentes; no redibujar a mano lo que ya existe.
2. Si una pieza no existe, se pregunta antes de crearla. Si se aprueba, entra al master (turno "Patrones aprobados", al final) y aquí como componente.
3. Si un patrón aprobado cambia en cualquier pantalla, se actualiza en el master y en el sistema en el mismo turno.
4. Copy sobrio: lo normal no se etiqueta; solo excepciones.
5. Citas = solicitud: depósito retenido, "Solicitud enviada", nunca "confirmada" antes de tiempo.

Intentional additions: `Icon` envuelve el set de íconos para no redibujar SVG en cada pantalla.

Íconos añadidos con 2q: `minus`, `trash`. Con 2y (Íconos propuestos, turno 4): `more` (más opciones, 4a: tres puntos en línea) y `works` (trabajos hechos, 4d: galería; las vacantes siguen con `brief`).

## Index
- `styles.css` → `tokens/{fonts,colors,typography,shape}.css`
- `guidelines/` — cards de color, tipo, radios, sombras, espaciado, íconos, logo
- `components/core`, `components/navigation`, `components/cards`, `components/patterns` — ver sección Components
- `assets/` — logos (`logo-tolatino*.svg`), íconos
- UI de referencia: `To'Latino Barbería (silla).dc.html` (única pantalla fuente además del master)
- Fuentes: Google Fonts (Sora, Manrope, JetBrains Mono)
