# ToLatino — project memory (read first, every session)

ToLatino is a **bilingual (Spanish-first) Latino community marketplace + business platform** — "Yelp + Nextdoor + a business operations dashboard." Mobile-first. Two sides: **consumer** (discover/search/review businesses, community events, neighborhood feed) and **business** (tiered listing + onboarding + a 9-module operations dashboard). Commercial model is a **tier upsell**: Free listings are intentionally basic to push owners to **Verified ($19/mo)** or **Premium ($49/mo)**.

When you build a new page or section, follow this file and `DESIGN_SYSTEM.md`. Match the screenshots in `reference/screenshots/`. Read `NEW_SCREEN_RECIPE.md` before generating a screen.

## Stack
- **React + TypeScript + Tailwind**, mobile-first. Functional components + hooks.
- Tokens live in `tailwind.config.ts` — **always use the named tokens** (`bg-primary`, `text-ink`, `rounded-card`), never raw hex.
- Bilingual via the `L(es, en)` helper from `src/lib/i18n.ts` (see below). **Every user-facing string is bilingual** — never hardcode a single-language string.
- Icons: `lucide-react`, stroke width 2, sized 16–22px.
- No emoji in UI unless it's part of brand copy (the greeting "Hola, Ana 👋" is the one sanctioned spot).

## Non-negotiable rules
1. **Spanish first.** Default language is `es`; `en` is the toggle. Wrap copy in `L('…', '…')`.
2. **Tier-aware.** Every business surface respects `tier: 'free' | 'verified' | 'premium'`. Free gates modules/photos/review-replies and shows a PRO upsell. Read `tier` from context; never assume premium.
3. **Category-aware.** Business UX adapts to one of 16 categories (food, beauty, services, retail, events, etc.) — labels and module sets change. Read `category` from context.
4. **Use the design tokens & primitives.** Reach for `<PhoneFrame>`, `<Card>`, `<StatTile>`, `<BottomTabs>`, `<SubView>`, `<Sheet>`, `<StatusPill>`, `<EmptyState>` from `src/components/` before writing new markup. Extend them; don't fork the styling.
5. **Mobile frame = 392px**, radius 42, status bar + scroll area + bottom tabs. Desktop reflows per `DESIGN_SYSTEM.md` (top nav, no bottom tabs).
6. **Imagery = placeholder gradient tiles** per category (`repeating-linear-gradient`), not SVG illustrations. Real photos drop into the same slots later.
7. **Brand mark:** `To`(ink) + `Latino`(purple) + a small 45°-rotated square. Use `<Wordmark>`.

## Voice
Warm, community-driven, concise. Spanish is natural/neutral Latin American (not Castilian). Confirmation screens are celebratory but short ("¡Reserva confirmada!"). Empty states are reassuring ("Todo al día").

## Architecture patterns (match these)
- **Global state early:** `lang`, `tier`, `category` in a context provider; they gate everything.
- **Tab + sub-view router:** each tab (Inicio/Pedidos/Reservas/Boletos/Perfil) hosts a stack of sub-views routed by a `view` string; a back button pops the stack and the parent tab stays active. See `DESIGN_SYSTEM.md → Navigation`.
- **Flows end in a confirmation screen** with a single primary "Listo/Done" that returns to the parent.
- **Gating UI:** locked features show a PRO badge + upsell sheet, not a dead end.

## Where things are
- `DESIGN_SYSTEM.md` — full token + component + pattern spec with code.
- `NEW_SCREEN_RECIPE.md` — step-by-step for generating a new screen on-brand.
- `src/` — starter tokens, i18n helper, and primitive components (copy into the app).
- `reference/screenshots/` — the visual target for every existing screen.
- `reference/dc/` — the original interactive HTML prototypes (design source of truth for look/copy/interaction; **not** production code — don't copy their inline styles).
