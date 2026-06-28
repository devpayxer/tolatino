# Recipe: generate a new ToLatino screen

Follow this every time you build a new page or section. It keeps output on-brand and consistent with the existing app.

## Before you write code
1. **Read `CLAUDE.md` and `DESIGN_SYSTEM.md`.** Confirm tokens, primitives, voice, and the navigation pattern.
2. **Find the closest existing screen** in `reference/screenshots/` and open its `reference/dc/*.dc.html` to see live behavior. Build in that screen's spirit.
3. **Identify the surface:** consumer or business? If business, what `tier` and `category` does it need to respect?

## Build steps
1. **Shell.** Mobile → wrap in `<PhoneFrame tabBar={<BottomTabs …/>}>`. Desktop → top-nav + `max-w-content` (business dashboard → sidebar). Add the header (wordmark + language switch).
2. **Bilingual from line one.** `const { L } = useI18n();` and wrap every string in `L('es','en')`. No exceptions.
3. **Compose from primitives.** Use `<Card>`, `<StatTile>`, `<StatusPill>`, `<PrimaryButton>`, `<Sheet>`, `<EmptyState>`. Don't hand-roll containers that duplicate these.
4. **Tokens only.** `bg-primary`, `text-ink`, `rounded-card`, `shadow-card`, `border-hair`. No raw hex, no arbitrary radii outside the scale.
5. **Imagery = `categoryTile(seed)`** gradient placeholders, never illustrations.
6. **Navigation.** If the screen has detail/edit flows, use the sub-view stack pattern (`open`/`back`) from `DESIGN_SYSTEM.md §7`. Parent tab stays active. End flows in a confirmation `<EmptyState>` with one primary button.
7. **Business gating.** `const { tier, category } = useBiz();` Gate features against `TIER_CAPS[tier]`; locked = PRO badge + upsell `<Sheet>`. Adapt labels/fields to `category`.
8. **Responsive.** Design mobile-first (392px), then add `md:`/`lg:` reflow per `DESIGN_SYSTEM.md §6`.

## Before you finish — checklist
- [ ] Every string is `L('es','en')` — toggle ES/EN and both read naturally.
- [ ] Only design tokens used (grep your diff for `#` hex and stray `rounded-[…]`).
- [ ] Built from primitives, not duplicated markup.
- [ ] Matches the closest reference screenshot in density, rhythm, and weight.
- [ ] Tappable things have a clear target; flows end in a confirmation and return.
- [ ] (Business) respects `tier` + `category`; nothing assumes premium.
- [ ] Mobile 392px is correct; desktop reflow is intentional, not stretched.
- [ ] No emoji except sanctioned brand copy. No SVG illustrations.

## Good prompt to give Claude Code
> "Build a `<Reservas>` consumer screen following `CLAUDE.md` and `DESIGN_SYSTEM.md`, in the spirit of `reference/screenshots/mobile-…`. Use the primitives in `src/components/`. Mobile-first 392px with a desktop reflow. Bilingual via `L()`. It needs a next-service hero, filter chips, a list of booking cards, and a booking-detail sub-view that ends in a reschedule confirmation. Match the existing density and voice."
