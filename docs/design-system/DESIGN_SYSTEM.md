# ToLatino Design System

The complete spec for building on-brand ToLatino screens in **React + TypeScript + Tailwind**. Tokens live in `tailwind.config.ts`; primitives in `src/components/`. Always use named tokens and primitives.

---

## 1. Typography
- **Font:** `Plus Jakarta Sans`, weights 400/500/600/700/800. Load via Google Fonts or self-host.
- The system leans **heavy**: screen titles `font-extrabold` (800) ~16px, section headings 800 ~13px, body 500–600 13–14px, meta/caption 600 11px, micro nav labels 800 ~10px uppercase + letter-spacing.
- Headlines use tight tracking (`tracking-tight` / `-0.02em`).

## 2. Color tokens
| Token | Hex | Use |
|---|---|---|
| `primary` | `#7B61FF` | primary actions, brand accent |
| `primary-600/700/800` | `#6D4DF6 / #6743E2 / #5B3FD6` | gradients, pressed states |
| `ink` | `#1E1B2E` | primary text + dark surfaces (ticket pass, insights header) |
| `gold` | `#F4B740` | secondary accent, premium, wordmark option |
| `success` / `success-soft` | `#1F9D57 / #E3F5EA` | confirmed, positive deltas |
| `warn` / `warn-soft` | `#9A6A12 / #FCEFD6` | pending, caution |
| `rose` / `rose-soft` | `#D6336C / #FDE7EF` | live/active, alerts, badges |
| `muted` / `muted-soft` | `#8A86A0 / #9A96AE` | secondary / tertiary text |
| `surface` / `canvas` | `#FFFFFF / #F4F2F9` | cards / app background |
| `border-hair` / `border-line` | `rgba(30,27,46,.06 / .10)` | card hairline / dividers |

Never inline a hex. If you need a new value, add a token.

## 3. Shape & elevation
- Radii: `rounded-tile` 12 · `rounded-card` 18 · `rounded-sheet` 22 · `rounded-phone` 42 · `rounded-pill` 999.
- Shadows: `shadow-card` (resting), `shadow-sheet` (bottom sheet), `shadow-glow` (primary buttons).
- Cards = `bg-surface border border-hair rounded-card`. That's the workhorse container.

## 4. Imagery
Placeholder **gradient tiles**, never SVG illustrations. Use `categoryTile(seed)` for a deterministic per-business gradient. Real photos later drop into the same slots (same aspect/radius).

## 5. Iconography
`lucide-react`, stroke 2 (2.4 when active), 16–22px. Match a category to a lucide icon (food→`UtensilsCrossed`, beauty→`Scissors`, auto→`Car`, etc.).

---

## 6. Layout

### Mobile (source of truth — 392px)
`<PhoneFrame>` = status bar + scrollable content + optional `tabBar`. Content padding `px-4`, section rhythm ~22px. Bottom tabs are 5 items, active = purple filled.

### Desktop (responsive endpoint ~1320px)
No phone frame, no bottom tabs. Pattern:
- **Top nav** (sticky): wordmark left, search center, language switch + auth/account right.
- **Consumer screens** reflow to a centered `max-w-content` column with multi-column grids (search → sticky filter rail + results grid; profile → 2-col; events → 3-col grid; chat → 3-col Nextdoor layout).
- **Business dashboard** uses a **left sidebar** (grouped nav, lock icons on gated items) + main content, instead of bottom tabs.
Use Tailwind breakpoints (`md:`, `lg:`) to switch between the mobile and desktop layouts from the same component tree where practical.

---

## 7. Navigation pattern (important)
Each tab owns a **sub-view stack**:
```tsx
type View = "list" | "detail" | "track" | "rate" | "help";
const [view, setView] = useState<View>("list");
const [stack, setStack] = useState<View[]>([]);

const open = (v: View) => { setStack((s) => [...s, view]); setView(v); };
const back = () => setStack((s) => {
  const next = [...s]; const prev = next.pop(); if (prev) setView(prev); return next;
});
```
- The **parent tab stays active** while sub-views are open (the bottom tab highlight does not change).
- Sub-views render inside `<SubView title subtitle onBack={back}>`.
- **Flows end in a confirmation** (`<EmptyState>` style) with one primary "Listo/Done" that returns to the parent.
- Modals/edit forms use `<Sheet>` (bottom sheet), not full navigation.

## 8. Bilingual (Spanish-first)
Wrap **every** string in `L(es, en)` from `useI18n()`. Default `es`. The header language switch toggles and persists. Seed from `?lang=`. Never hardcode one language.

## 9. Tier & category awareness (business side)
- `useBiz()` gives `tier` (`free|verified|premium`) and `category`.
- Gate against `TIER_CAPS[tier]`: Free → 3 photos, no modules, no review replies, shows PRO upsell. Locked features show a PRO badge + an upsell `<Sheet>`, never a dead end.
- `category` changes labels and which modules/fields appear (16 categories in `CATEGORY_LABELS`).

## 10. Voice
Warm, community, concise. Neutral Latin-American Spanish. Confirmations celebratory but short ("¡Reserva confirmada!"). Empty states reassuring ("Todo al día", "No tienes notificaciones sin leer.").

---

## 11. Component inventory (`src/components/`)
| Primitive | Purpose |
|---|---|
| `<Wordmark>` | brand mark To·Latino + square |
| `<PhoneFrame tabBar>` | 392px mobile shell |
| `<Card onClick>` | hairline white surface |
| `<StatTile>` | tappable labelled metric |
| `<StatusPill tone dot>` | status / category badge |
| `<PrimaryButton> / <GhostButton>` | actions |
| `<SubView title onBack>` | sub-screen with back header |
| `<Sheet open onClose>` | bottom sheet |
| `<EmptyState>` | empty / success state |
| `<BottomTabs active onChange badges>` | consumer mobile nav |
| `categoryTile(seed)` | placeholder gradient |

See `src/screens/InicioExample.tsx` for a full screen assembled from these.

## 12. Reference
- `reference/screenshots/` — the visual target for every existing screen (build to match).
- `reference/dc/` — the original interactive HTML prototypes. Open in a browser (with `support.js`) to click through flows, wizards, and the ES/EN toggle. **Design source of truth for look/copy/interaction — do not copy their inline-styled HTML.**
