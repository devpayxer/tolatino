# ToLatino Design Kit

A drop-in kit so Claude Code (or any developer) can generate **new ToLatino pages and sections that match the existing app**. Target stack: **React + TypeScript + Tailwind**, mobile-first, bilingual (Spanish-first).

## How to use it
1. **Copy this folder into your repo root.** Keep `CLAUDE.md` at the repo root — Claude Code reads it automatically every session.
2. **Wire the tokens:** merge `tailwind.config.ts` into your Tailwind config; load `Plus Jakarta Sans`.
3. **Copy `src/`** (i18n + biz context + primitives) into your app. Wrap the app in `<I18nProvider>` and (for business surfaces) `<BizProvider>`.
4. **Kick off Claude Code:** paste the block in **`PASTE_TO_CLAUDE_CODE.md`** as your first message — it points Claude Code at all the rules, code, and visual targets. Then prompt it screen-by-screen.

## What's inside
```
CLAUDE.md              ← repo memory: rules, voice, stack, where things are (KEEP AT REPO ROOT)
DESIGN_SYSTEM.md       ← full spec: tokens, components, layout, navigation, tier/category
NEW_SCREEN_RECIPE.md   ← step-by-step + checklist + a good example prompt
tailwind.config.ts     ← all design tokens (colors, radii, shadows, fonts)
src/
  lib/i18n.ts          ← L(es,en) bilingual helper + provider
  lib/biz.tsx          ← tier + category context + TIER_CAPS + 16 categories
  components/primitives.tsx  ← Wordmark, PhoneFrame, Card, StatTile, StatusPill,
                               buttons, SubView, Sheet, EmptyState, categoryTile
  components/BottomTabs.tsx   ← consumer mobile nav
  screens/InicioExample.tsx   ← a full screen assembled from the primitives (copy this shape)
reference/
  screenshots/         ← the visual target for every existing screen (build to match)
  dc/                  ← the original interactive HTML prototypes + support.js
                         (open in a browser to click through flows; design source of
                          truth for look/copy/interaction — do NOT copy their inline HTML)
```

## The three layers (why this works)
- **`CLAUDE.md`** is the always-loaded memory — the rules Claude Code follows without being told.
- **`DESIGN_SYSTEM.md` + `src/`** are the reference + real code it builds against.
- **`reference/`** is the visual + behavioral target it matches.

Give it all three and "build a new X screen" stays on-brand.

## Golden rules (the short list)
1. Spanish-first; every string `L('es','en')`.
2. Tokens only — no raw hex, no off-scale radii.
3. Compose from `src/components/` primitives.
4. Mobile 392px is the source of truth; desktop reflows.
5. Business surfaces respect `tier` + `category`; locked = upsell, never a dead end.
6. Gradient placeholder imagery, no illustrations; no emoji outside brand copy.
