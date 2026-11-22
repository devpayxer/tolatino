# Handoff: Tarjeta de negocio "Vitrina" (variante 1a)

## Overview
The business card for To'Latino result lists (Home, Categoría, Buscar, and the landing). The idea behind "Vitrina": **the photo sells**. A 3-photo gallery shows the live status on top, so people want it before they read. Save sits on the photo and the bottom bar is only for acting. It replaces the current `BusinessCard` (pattern 6a) and is already in use in this project's Landing, Buscar and Categorías screens.

Two plans:
- **Pro**: 3-photo gallery + status + save + photo count; name + verified; rating and meta; features or open slots; today's offer; main CTA + call.
- **Free**: compact row with a side photo, name, meta, rating and "Llamar". Compact and dignified, never broken.

Pro always lists before Free.

## About the design files
The files in this bundle are **design references built in HTML**: prototypes of the intended look and behavior, not production code to copy. Recreate the design in the target codebase's environment (React / React Native / SwiftUI…) with its own patterns, reusing the To'Latino design-system components it already has (Button, IconButton, Chip, Tag, Icon, Placeholder). If there is no environment yet, pick the one that best fits the product (the system's components are React).

- `TarjetaNegocio.dc.html` is the **component already extracted** (Pro + Free) that the screens use, with props. It is the main reference.
- `tarjeta-negocio-variantes.dc.html` shows 1a next to the variants that were not chosen (1b, 1c) and the current card, for context.

To open them in a browser, keep `support.js` and `_ds/` next to them.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy and interactions. Recreate it pixel-perfect.

---

## Component: Pro card

### Container
| Property | Value |
|---|---|
| Width | fluid, fills the grid cell; reference 372px; **min 320px** |
| Background | `#FFFFFF` |
| Border | `1px solid rgba(11,14,18,.08)` |
| Radius | `22px` (large card) |
| Shadow | `0 12px 26px -22px rgba(11,14,18,.45)` (`--shadow-card`) |
| Overflow | hidden (the gallery bleeds to the edge) |
| Cursor | pointer; the whole card opens the business page |

### 1. Gallery (187px tall)
- `display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); grid-template-rows:92px 92px; gap:3px`
- Photo 1 spans both rows (`grid-row:1 / 3`); photos 2 and 3 are stacked on the right.
- Fewer photos: **2** → two equal columns at 187px · **1** → a single photo at 187px · **0** → the system's striped placeholder `repeating-linear-gradient(135deg,#E7E5E0 0 10px,#EDEBE6 10px 20px)`.
- Loading: background `#E4E1DA` (`--tl-photo-bg`), `object-fit:cover`.
- **No dark protection layer**: the overlays are solid pills, so they read on any photo.

Overlays (all `position:absolute` over the gallery):

| Element | Position | Style |
|---|---|---|
| **Status** | top 12 · left 12 | pill bg `rgba(255,255,255,.96)`, radius 999, padding `6px 10px`, gap 6. 6px dot + text in Manrope 700 11.5px. Open: dot `#00A88F`, text `#00695B`. Closed: dot and text `#C0392B`. Copy `Abierto · cierra 9 PM` / `Cerrado · abre 10 AM` |
| **Save** | top 10 · right 10 | 34×34 circle, bg `rgba(255,255,255,.96)`, `heart` icon 17px, stroke 1.9, `#0B0E12`. Saved = fill `#0B0E12` |
| **Photo count** (optional) | right 10 · bottom 10 | bg `rgba(11,14,18,.72)`, radius 7, padding `4px 8px`, text `#fff` JetBrains Mono 800 9.5px, ls .1em. Copy `+24 FOTOS` (total − 3). Hidden if there are ≤3 photos |

### 2. Body
`padding:14px 16px 16px; display:flex; flex-direction:column; gap:10px`

**a. Identity** (`gap:6px`)
- Name row `gap:7px; align-items:center`
  - Name: Sora 800, 18px / 1.15, ls −0.03em, `#0B0E12`
  - Verified (only if verified): 17×17 circle `#4B37F5` with a white `check` icon at 10px, stroke 2.8
- Meta row: `gap:7px; white-space:nowrap; overflow:hidden`, base JetBrains Mono 600 10.5px, ls .04em, `rgba(11,14,18,.5)`
  - Rating: Manrope 700 12.5px `#0B0E12` (ls 0), `★` in `#FFB020`, `(212)` in Manrope 500 `rgba(11,14,18,.42)`
  - `·`
  - Meta in UPPERCASE, ellipsis: `DOMINICANA · CATERING · 0.3 MI`

**b. Features** (businesses without appointments): `display:flex; flex-wrap:wrap; gap:6px`
- System `Chip variant="feature"`: bg `rgba(11,14,18,.05)`, text `rgba(11,14,18,.7)`, Manrope 600 11.5px, radius 8, padding `6px 11px`
- 2–3 max. Copy: `Pickup 25 min`, `Delivery $3`, `Catering`. Only real exceptions or features (no "sin cita": that is the default and isn't labeled).

**c. Open slots** (Booking businesses, instead of features): same container
- Default: `Chip variant="slot"`: bg `rgba(0,229,196,.16)`, text `#00695B`, Manrope 700 11.5px, radius 8, padding `6px 11px`
- Selected: bg `#0B0E12`, white text. **Keep the slot's geometry** (radius 8, padding 6×11). The HTML reference uses `Chip selected`, which is a pill; in production keep the shape so the row doesn't jump.
- Up to 3. Copy `Hoy 4:30`, `Hoy 5:15`, `Mañana 10:00`

**d. Today's offer** (optional; only if the business published one in the last 24 h)
- Box: padding `10px 12px`, radius 13, bg `rgba(75,55,245,.06)`, flex `gap:10px; align-items:center`
- `Tag tone="action"` `HOY`: bg `rgba(75,55,245,.1)`, text `#4B37F5`, JetBrains Mono 800 9px, ls .08em, padding `3px 7px`, radius 5
- Text: Manrope 600 12.5px / 1.35, `#0B0E12`, at most 2 lines

**e. Actions** (`display:flex; gap:8px; padding-top:2px`)
- **Main CTA**: `Button variant="primary" size="md"` inside `<div style="flex:1; min-width:0; display:flex">` (system rule for `block`). Height 40, radius 13, padding `0 16px`, bg `#0B0E12`, white Manrope 700 12.5px, 16px icon (stroke 1.9), gap 9.
  - Food → `Ordenar` + `bag` · Appointment → `Booking` + `calendar` · Work → `Cotizar` + `edit`
- **Call**: `IconButton icon="phone" size=40`: radius 12, bg `#fff`, border `1px solid rgba(11,14,18,.09)`, 17px icon.

---

## Component: Free row
| Property | Value |
|---|---|
| Container | flex, bg `#fff`, border `1px solid rgba(11,14,18,.08)`, radius 18, overflow hidden |
| Photo | 96px wide, full card height (min 96), `object-fit:cover`, no radius of its own (the container clips it) |
| Body | `flex:1; min-width:0; padding:13px 14px; flex column; gap:5px` |
| Name | Manrope 700 14.5px / 1.25, `#0B0E12` |
| Meta | JetBrains Mono 600 10.5px, ls .04em, `rgba(11,14,18,.5)`, one line with ellipsis |
| Bottom row | `display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:2px` |
| Rating | Manrope 700 12px, `★` `#FFB020`, `(18)` at 500 `rgba(11,14,18,.42)` |
| Llamar | `Button variant="secondary" size="sm"` + `phone`: height 34, radius 11, padding `0 14px`, Manrope 700 11.5px, bg `#fff`, border `1.5px solid rgba(11,14,18,.14)` |

Free has no gallery, status pill, features, slots, offer or save.

---

## Interactions & behavior
- **Tap card** → business page.
- **Main CTA** (stopPropagation): Ordenar → Menu tab · Booking → booking flow, with the slot pre-selected if one is chosen · Cotizar → quote form.
- **Booking always ends as a "Solicitud enviada"**, never "confirmada", until the business accepts. A deposit is shown as **retenido**, not charged.
- **Call / Llamar** (stopPropagation) → `tel:`. On desktop, show the number or offer to copy it.
- **Save** (stopPropagation) → toggles saved. Without a session, opens the system `AuthSheet` ("Entra para guardar").
- **Slot** (stopPropagation) → selects it; tapping again deselects. Only one at a time.
- **Photo count** (stopPropagation) → opens the business gallery.
- **Hover (desktop)**: no scale or lift effects (system rule). Buttons keep their own hover. Links go to `#2E1FD1`.
- **Animation**: state changes fade .2s. Nothing else.
- **Loading**: skeleton with the same geometry. Gallery in `#E4E1DA`, bars in `rgba(11,14,18,.05)` for name and meta, a 40px gray button.
- **Status**: computed from today's hours in the business's time zone. Hide slots if there are none today or tomorrow.

## Responsive
- Desktop lists: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`, gap 16. At 1440 with 3 columns (categories 240 · content · context 320), the content holds 2 cards; on the landing, 3.
- Mobile: full width minus 20px side margins; 12px between cards. The gallery keeps 187px of height.
- Free rows: in a 2-column grid on desktop (gap 12), one column on mobile.

## State
```ts
saved: boolean            // per user; persisted on the server
selectedSlot: string|null // local to the card; passed to the booking flow
```

## Data (props of the component already extracted)
```ts
interface TarjetaNegocioProps {
  biz: {
    plan?: 'pro' | 'free';            // default 'pro'
    name: string;
    verified?: boolean;
    meta?: string;                    // 'DOMINICANA · CATERING · 0.3 MI'
    rating: number | string;
    reviews?: number | string;        // rendered as '(212)'
    status?: string;                  // 'Abierto · cierra 9 PM'
    open?: boolean;                   // default true → green; false → red
    photos?: string[];                // up to 3 in the gallery
    photoCount?: string;              // '+24 FOTOS'
    chips?: { label: string; variant?: 'slot' | 'feature' }[]; // slot = open time
    offer?: string; offerTag?: string; // default 'HOY'
    cta?: string; ctaIcon?: string;    // default 'Ordenar' / 'bag'
    contactLabel?: string; contactIcon?: string; // default 'Llamar' / 'phone'
    saved?: boolean;
    onOpen?(): void; onCta?(): void; onContact?(): void; onSave?(v: boolean): void;
  }
}
```

## Copy ES / EN
| ES | EN |
|---|---|
| Ordenar · Booking · Cotizar | Order · Booking · Quote |
| Llamar | Call |
| Abierto · cierra 9 PM | Open · closes 9 PM |
| Cerrado · abre 10 AM | Closed · opens 10 AM |
| HOY | TODAY |
| +24 FOTOS | +24 PHOTOS |
| Hoy 4:30 · Mañana 10:00 | Today 4:30 · Tomorrow 10:00 |
| Pickup 25 min · Delivery $3 | Pickup 25 min · Delivery $3 |

No emoji. The only Unicode allowed is ★ and ·.

## Design tokens used
- Ink `#0B0E12` · Action `#4B37F5` (hover `#2E1FD1`) · Pro/stars `#FFB020` · Open `#00695B` / dot `#00A88F` · Slot tint `rgba(0,229,196,.16)` · Danger `#C0392B`
- Text on light: `.75` / `.7` / `.5` / `.42` alpha of ink
- Line `rgba(11,14,18,.08)` · secondary border `1.5px rgba(11,14,18,.14)` · Photo bg `#E4E1DA` · overlay pills `rgba(255,255,255,.96)` · photo-count pill `rgba(11,14,18,.72)`
- Radii: tag 5 · count 7 · chip 8 · IconButton 12 · button md 13 / sm 11 · offer 13 · Free 18 · Pro 22 · pills 999
- Shadow: `--shadow-card` `0 12px 26px -22px rgba(11,14,18,.45)`
- Spacing: gallery gap 3 · body 14/16/16 · 10 between blocks · 6 between chips · 8 between buttons
- Type: Sora 800 (name) · Manrope 500–700 (body, UI) · JetBrains Mono 600–800 (meta, tags, count)

## Assets
- Icons from the To'Latino set (`Icon` component / `_ds/.../_ds_bundle.js`): `heart`, `check`, `phone`, `bag`, `calendar`, `edit`.
- No real photos in the reference (striped placeholder). Business photos come from the backend.

## Files
- `TarjetaNegocio.dc.html`: the extracted component (Pro + Free). Main reference.
- `tarjeta-negocio-variantes.dc.html`: **1a** next to 1b, 1c and the current card.
- `_ds/`: To'Latino tokens and component bundle.
- `support.js`: runtime for opening the references in a browser.
- `screenshots/`
  - `01-vitrina-pro-y-free.png`: Pro (food and Booking) + Free, default state (2x)
  - `02-vitrina-guardado-y-horario-elegido.png`: saved and slot selected (2x)
  - `03-en-contexto-categoria-desktop.png`: card in the Categoría page at 1440
  - `04-en-contexto-categoria-app.png`: card in the Categoría page at 390 (2x)

Screens that already use it in the project: `To'Latino Landing`, `To'Latino Buscar`, `To'Latino Categorías`.
