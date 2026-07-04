# To'Latino — Progress & Session Handoff

> **Purpose.** A living "where we are / how to resume" doc so a fresh session can
> pick up instantly. Read this + `CLAUDE.md` (vision/standards) +
> `docs/LAUNCH-CHECKLIST.md` (deferred decisions) before working.
> Last updated: 2026-07-04.

## How this project ships (read first)
- **Monorepo:** pnpm + Turborepo. App: `apps/web` (Next.js 15 App Router,
  `output: 'export'` static export, Tailwind). Build: `pnpm --filter @tolatino/web build`.
- **Branches / deploy flow:**
  - Develop on **`claude/new-prompt-xkubrd`**.
  - Release by **fast-forward-merging** into **`claude/tolatino-repo-setup-1efdil`**
    (the branch **Vercel** auto-deploys). Sequence every time:
    ```
    git add -A && git commit -m "…"
    git push -u origin claude/new-prompt-xkubrd
    git checkout claude/tolatino-repo-setup-1efdil
    git merge --ff-only claude/new-prompt-xkubrd
    git push -u origin claude/tolatino-repo-setup-1efdil
    git checkout claude/new-prompt-xkubrd
    ```
  - Git identity for commits: `user.email noreply@anthropic.com`, `user.name Claude`.
- **Live site:** `tolatino.vercel.app` (Vercel; Cloudflare Pages is the eventual target per `CLAUDE.md`).
- **Non-negotiables that bite every task:** design tokens only (no raw hex in
  `className`); Spanish-first `L('es','en')`; mobile-first; **#6 paste anything
  runnable (SQL/env/commands) in FULL in chat** (founder is copy-paste, no CLI);
  **#7 record every deferral in `docs/LAUNCH-CHECKLIST.md`**.
- **Sandbox limit:** Supabase / Photon / Vercel are network-blocked here — features
  are verified by **build + a Playwright mobile audit**, not live E2E.

## What's built and live

### Consumer app (`/comunidad`, `/negocios`, `/eventos`, …)
- **Comunidad** (Nextdoor-style home): real posts/comments/likes/saves/**polls**/
  **follows**, Supabase **Realtime** (live likes/comments + new-post pill),
  Instagram-style photo carousel, per-city barrios, post "…" menu (edit/delete/
  report), profile+feed nav card, follow system.
- **Negocios** (Yelp-style): full 15-category taxonomy + ~430 subcategories, real
  subcategory filtering, **dynamic per-category feature filters** (Sugeridos +
  Características), distance filter (5–50 mi), **Verified vs Sin-verificar card
  variants** (verified always on top), **Saved businesses** (♥ persists: localStorage
  guests + Supabase signed-in), **live open/closed status from business hours**
  ("Abierto · cierra en 30 min" / "Cerrado · abre mañana 9am"), real "Publicar
  negocio", **BizDetail** page with a focused-tab mode (hero collapses; tab bar
  pinned to the measured header height; seamless transitions; touch-pan-x).
- **Geo:** own city gazetteer (`cities` + `search_cities`/`nearest_city`) + free
  street-address pipeline (Photon + US Census + synthesized suggestions, US-only,
  locality-aware). Saved-addresses manager. **Migration target: Pelias (config flip).**
- **Eventos** + "Muy pronto" placeholders (Transporte/Bienes Raíces/Autos/Trabajos).

### Business dashboard (`/negocio`)
Reached via user menu → **"Panel de negocio"**. Plan- (free/verified/premium) and
rubro-aware. Built from a **mobile handoff** (`handoff_business_mobile/`, in chat
uploads, not committed).
- **Shell:** desktop sidebar + mobile drawer, **dark top bar on Inicio** (light
  elsewhere), business **identity card** on Inicio, **mobile bottom-tab bar**
  (Inicio · Pedidos · Mensajes · Reseñas · Más→drawer).
- **Inicio/Insights home:** dark live-revenue hero (+ pedidos/ticket/nuevos row),
  needs-attention, 7-day KPIs, metric-switch chart, channel mix, live order queue
  (horizontal on mobile), top sellers, pulse, module health, activity, Premium
  band; **Free variant** = verify checklist + plan compare.
- **All 9 modules** (files in `apps/web/src/screens/negocio/modules/`):
  Updates, Billing, Customers/Orders/Reviews, Staff/Jobs, Rental, Events,
  Products/Shipping, Services/Bookings, Food menu. Each mobile-first → desktop,
  tier+category aware, **real interactive state (fixture/demo data, local
  `useState`)**: mode toggles, sub-tabs, filters, wizards, edit flows, toasts.
- **Full-page flows (no cramped popups):** every edit/create/detail/wizard was
  converted from bottom-sheet popups to a shared **`ModulePage`** full-screen page
  (`modules/_page.tsx`): own header (back/title/action), natural scroll, sticky
  footer actions, safe-area + keyboard friendly.
- **Wiring:** `screens/negocio/Panel.tsx` routes each tab to its module via
  `RICH_MODULES`. `screens/negocio/tabs.tsx` = nav model + `PanelCtx`
  (`{ L, es, tier, rubro, ci, isFree, isPremium, mods, go }`).

### Quality tooling
- **`tools/mobile-audit/`** — Playwright harness: at 392px it visits every dashboard
  tab, clicks every chip row, opens every sheet/wizard (first *visible* opener) and
  steps wizards, flagging any horizontal overflow / off-screen element / overlay
  hscroll, with screenshots. **Run after any dashboard UI change; must report
  "0 violation state(s)".** Last run: **125 states, 0 violations.**
- iOS input auto-zoom disabled via `maximum-scale=1` in `apps/web/app/layout.tsx`
  viewport (kept multi-field forms from blowing past the screen).

## ⚠️ ACTION NEEDED FROM THE FOUNDER (blocking)
The founder's Supabase is **missing migrations** — `alter … owner_id` failed with
"column owner_id does not exist", so **0013 onward were not applied**. Before the
dashboard/data work continues:
1. In the Supabase SQL Editor, check which migrations ran, then **apply the missing
   ones in order: `0013` → `0018`** (all are in `supabase/migrations/`, idempotent).
2. Then run the **Hazleton → `b@b.com` ownership** script (already pasted in chat:
   ensures `owner_id` column exists, then `update businesses set owner_id = (b@b.com)
   where city = 'Hazleton, PA'`). `b@b.com` must have signed up first.

## Next steps (priority order)
1. **Founder applies missing migrations + ownership SQL** (above).
2. **Wire the dashboard to REAL data.** Everything in the 9 modules is fixture/local
   state today. Load the signed-in owner's business(es) by `owner_id`, add a business
   switcher, and back each module with Supabase tables/RPCs as features go live.
   (So `b@b.com` sees the real Hazleton businesses, not the demo restaurant.)
3. Continue **`docs/LAUNCH-CHECKLIST.md`** deferrals: real event creation, business
   photos/reviews/map, delivery checkout using saved address, saved-biz cross-city
   fetch, claim/verify flow, moderation dashboard, push, next-intl, payments, Pelias.

## Map of key files
```
apps/web/app/(cliente)/…               consumer routes + layout (providers)
apps/web/app/negocio/page.tsx          business dashboard entry → PanelScreen
apps/web/src/screens/negocio/
  Panel.tsx                            dashboard shell + tab dispatch (RICH_MODULES)
  tabs.tsx                             nav model, PanelCtx, CAT_INFO
  Insights.tsx                         Inicio home (paid + free)
  modules/_page.tsx                    ModulePage + Toast (full-screen page)
  modules/{Food,Products,Services,Events,Rental,Staff,Customers,Billing,Updates}.tsx
apps/web/src/screens/{Negocios,BizDetail,Comunidad,…}.tsx   consumer screens
apps/web/src/lib/                      state, live (Supabase), savedBiz, hours,
                                       geo, addresses, follows, interactions, i18n
apps/web/src/data/fixtures.ts          demo data + taxonomy (SUBCATS, FEATURES_*)
supabase/migrations/00xx_*.sql         all migrations (paste into SQL Editor)
tools/mobile-audit/                    Playwright screen-by-screen audit
docs/{CLAUDE.md,LAUNCH-CHECKLIST.md,PROGRESS.md,design-system/}
```
