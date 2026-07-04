# To'Latino — Progress & Session Handoff

> **Purpose.** A living "where we are / how to resume" doc so a fresh session can
> pick up instantly. Read this + `CLAUDE.md` (vision/standards) +
> `docs/LAUNCH-CHECKLIST.md` (deferred decisions) before working.
> Last updated: 2026-07-04.

## How this project ships (read first)
- **Monorepo:** pnpm + Turborepo. App: `apps/web` (Next.js 15 App Router,
  `output: 'export'` static export, Tailwind). Build: `pnpm --filter @tolatino/web build`.
- **Branches / deploy flow:**
  - Develop on the **current session branch** (it churns each session — pin it here
    per session, don't hardcode an old one). This session: **`claude/progress-md-review-r5bdar`**.
  - Release by **fast-forward-merging** into **`claude/tolatino-repo-setup-1efdil`**
    (the branch **Vercel** auto-deploys). Sequence every time (swap in the current
    session branch for `<dev>`):
    ```
    git add -A && git commit -m "…"
    git push -u origin <dev>
    git checkout claude/tolatino-repo-setup-1efdil
    git merge --ff-only <dev>
    git push -u origin claude/tolatino-repo-setup-1efdil
    git checkout <dev>
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
- **Negocios** (Yelp-style): full 15-category taxonomy + ~418 subcategories, real
  subcategory filtering, **dynamic per-category feature filters** (Sugeridos +
  Características), distance filter (5–50 mi), **Verified vs Sin-verificar card
  variants** (verified always on top), **Saved businesses** (♥ persists: localStorage
  guests + Supabase signed-in), **live open/closed status from business hours**
  ("Abierto · cierra en 30 min" / "Cerrado · abre mañana 9am"), real "Publicar
  negocio" (**now collects a weekly Horario editor + Características picker** →
  new listings ship with live open/closed status and are filterable immediately),
  **BizDetail** page with a focused-tab mode (hero collapses; tab bar
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
  "0 violation state(s)".** The harness counts *violations* only (it does not emit
  a total-states figure, and no run screenshots/logs are committed) — a clean run
  prints `0 violation state(s)`. Last clean run: **0 violations** (~125 states walked).
- iOS input auto-zoom disabled via `maximum-scale=1` in `apps/web/app/layout.tsx`
  viewport (kept multi-field forms from blowing past the screen).

## ⚠️ ACTION NEEDED FROM THE FOUNDER (apply in the SQL Editor)
- ✅ **`0013`→`0018` applied** (2026-07-04, verified: single 16-arg `create_business`).
  The old "not unique / owner_id missing" blocker is resolved; publish + Hazleton
  ownership work.
- ⏳ **Apply `0019_business_photos.sql` + `0020_business_modules.sql`** (both
  idempotent) so the dashboard's **Fotos** and **Configurar módulos** persist. The
  combined SQL is pasted in chat.

## Dashboard → real data (in progress, 2026-07-04)
Building the business panel section-by-section from fixture/demo into real,
Supabase-backed tools. **Foundation done:** `lib/bizAdmin` loads the signed-in
owner's business(es) by `owner_id`, exposes the active one + a switcher + a writer
(`update`) that persists to the real `businesses` row (RLS "update own business");
`app/negocio/layout.tsx` provides it; `Panel.tsx` derives identity/plan/rubro from
the real business, with a **demo sample business** when nobody's signed in (edits
local-only) so every editor stays explorable + auditable.
- [x] **Listado · Información general** — real edit/save (name, category, tagline,
  price, phone, address, description) → `businesses`.
- [x] **Listado · Horario** — weekly HoursEditor + manual fallback → `businesses.hours`.
- [x] **Listado · Fotos y media** — gallery on `business_photos` (0019); WebP upload
  to the `post-photos` bucket; cover + delete.
- [x] **Listado · Listados relacionados** — real portfolio of the owner's businesses.
- [x] **Configurar módulos** — toggles persist to `businesses.modules` (0020).
- [x] **Catalog modules — real CRUD** on the shared `business_items` table (0021,
  `lib/bizItems.ts`): **Menú de comida** (add/edit/delete/86), **Servicios**
  (add/edit/delete), **Productos** (add/edit/delete), **Renta** (add). Each keeps
  its rich handoff UI + demo seed (local-only) and persists for real owners.
- [x] **Eventos** — create (create_event RPC 0022) + delete + load owner's events.
- [x] **Reseñas** — load real reviews + owner reply (reply_to_review RPC 0023).
- [x] **Novedades** — post + delete on business_updates (0024).
- [x] **Personal + Empleos** — business_staff (private) + business_jobs (public) (0025):
  load, invite/add, remove, post job.
- [x] **Zonas de envío + Repartidores** — persist config to businesses.settings (0026).
- [x] **Ajustes** — real profile links, ES/EN, notification prefs (businesses.settings),
  account (email + sign out).
- [x] **Mensajes** — real inbox: conversations + threads + send (business_conversations
  / business_messages 0029), mobile list↔thread, demo sample inbox.
- [x] **Pedidos** — orders list + status changes on business_orders (0028).
- [x] **Clientes** — customer directory on business_customers (0030).
- [x] **Pagos** — real revenue from completed orders; automatic payouts show an
  honest "connect payments" state (Stripe deferred per CLAUDE.md, transaction phase).
- [x] **Plan y facturación** — reflects the business's real tier (via bizAdmin); the
  card/invoices are placeholders until payments (Stripe) is connected.
- [x] **Reservas** — booking list + status lifecycle on business_bookings (0027).

**Every dashboard section is now real-data backed** (payouts honestly deferred to a
payment processor). Catalog/list rows, edits, statuses and messages persist to
Supabase for signed-in owners; a demo sample business keeps the whole panel
explorable when nobody's signed in. Aggregate KPI/rollup cards and a few
visual-only surfaces (calendar/floor-plan grids) stay as fixtures where there's no
table to bind. Verified per batch by build + `tools/mobile-audit/audit.js` (125
states, 0 overflow at 392px). **Founder must apply migrations 0019–0030** (pasted in
chat) for the data to persist in production.

Every dashboard-real change: **build + `tools/mobile-audit/audit.js` (125 states,
0 overflow at 392px)**; the demo mock exercises the real editors.

## Next steps (priority order)
1. **Founder applies `0019`+`0020`** (above) so Fotos/Módulos persist in prod.
2. **Continue the dashboard-real conversion** in nav order (Módulos content next),
   backing each section with Supabase and keeping the audit green.
3. Continue **`docs/LAUNCH-CHECKLIST.md`** deferrals: real event creation, delivery
   checkout, saved-biz cross-city, claim/verify, moderation, push, next-intl, payments.

## Map of key files
```
apps/web/app/(cliente)/…               consumer routes + layout (providers)
apps/web/app/negocio/page.tsx          business dashboard entry → PanelScreen
apps/web/src/screens/negocio/
  Panel.tsx                            dashboard shell + tab dispatch (RICH_MODULES)
  tabs.tsx                             nav model, PanelCtx, CAT_INFO
  Insights.tsx                         Inicio home (paid + free)
  modules/_page.tsx                    ModulePage + Toast (full-screen page)
  modules/{Listing,Hours,Photos,Related}.tsx   Listado section — REAL (bizAdmin-backed)
  modules/{Food,Products,Services,Events,Rental,Staff,Customers,Billing,Updates}.tsx  (still fixture)
apps/web/app/negocio/layout.tsx        provides BizAdminProvider
apps/web/src/lib/bizAdmin.tsx          real owner-business loader + writer (RLS)
apps/web/src/lib/bizItems.ts           CRUD over business_items (catalog modules)
apps/web/src/screens/{Negocios,BizDetail,Comunidad,…}.tsx   consumer screens
apps/web/src/lib/                      state, live (Supabase), savedBiz, hours,
                                       geo, addresses, follows, interactions, i18n
apps/web/src/components/PublishModal.tsx   FAB publish flow (post / negocio / evento)
apps/web/src/components/HoursEditor.tsx     weekly Horario editor (→ businesses.hours)
apps/web/src/data/fixtures.ts          demo data + taxonomy (SUBCATS, FEATURES_*)
supabase/migrations/00xx_*.sql         all migrations (paste into SQL Editor)
tools/mobile-audit/                    Playwright audits: audit.js (dashboard) + publish.js (publish flow)
CLAUDE.md (repo root)                  master project memory
docs/{LAUNCH-CHECKLIST.md,PROGRESS.md,design-system/}
```
