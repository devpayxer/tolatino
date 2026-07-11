# To'Latino — Progress & Session Handoff

> **Purpose.** A living "where we are / how to resume" doc so a fresh session can
> pick up instantly. Read this + `CLAUDE.md` (vision/standards) +
> `docs/LAUNCH-CHECKLIST.md` (deferred decisions) before working.
> Last updated: 2026-07-10.

## Platform polish batch (2026-07-10) — all verified in a real browser
- **Business single-page restored** (founder correction): the food menu lives ONLY
  in the "Menú" tab of `BizDetail.tsx`; the full-page OrderFlow takeover was
  reverted/deleted. **Rule: menu work is ADDITIVE to the Menú tab — never rebuild
  the single-page.**
- **Menú tab, DoorDash-grade:** sticky category rail pinned under the tab bar +
  scroll-spy (active chip tracks the visible section, auto-centers; frozen during
  click-jumps and reset on tab entry so it never flashes); desktop hover arrows
  ◁▷ on the rail; product-card **quantity stepper** ( + → [🗑]1[+] → [−]N[+] ),
  no more "Pedir" one-tap button.
- **Site-wide modal scroll-lock:** `lib/scrollLock.ts` (ref-counted, iOS-safe)
  wired into the shared `<Overlay>` (≈84 modals) + bespoke overlays
  (ConfirmDialog, photo viewer, Billing cancel, Panel drawer, ModulePage).
- **No demo flash on load:** `useLiveData` gained `loading`; with a real backend
  it starts EMPTY + skeletons (`SkeletonList` in ui.tsx) in Negocios/Eventos/
  Comunidad — fixtures only when no backend or on query error.
- **Constant-layout sticky header on BizDetail:** the compact title's 50px is
  ALWAYS reserved in the sticky bar (Overview overlaps it via `-mt-[46px]`);
  pinning only FADES it (stuck boolean → opacity/transform). Zero layout writes
  on scroll = no jump/flicker; tab switches settle on their first frame.
- **Verification harness:** `tools/mobile-audit/*.js` — Playwright + async curl
  relay for `*.supabase.co` (sandbox proxy can't MITM Chromium TLS; use `execFile`,
  not `execFileSync` — the sync form starves Playwright's event loop under load).
  Key scripts: `single-page`, `menu-sticky`, `menu-stepper`, `spy-click/noflash/
  tabentry`, `scroll-lock`, `sticky-collapse`, `tab-switch`, `no-demo-flash`,
  `desktop-arrows`, `pedidos-restored`. Serve `apps/web/out` with `npx serve out
  -l 4173 --no-clipboard` (NOT `-s` — SPA mode breaks the multi-page export).
  Mint sessions via GoTrue admin generate_link (scratchpad `mint-session.mjs`
  pattern; never echo keys).
- **Supabase security-advisor email:** verified false alarm for user data; the
  only flagged table is PostGIS `spatial_ref_sys` (can't self-remediate — see
  LAUNCH-CHECKLIST §2 for the analysis + options).

### Dashboard Pedidos restored + Cocina handoff grafted in additively (2026-07-10)
Second instance of the same lesson as the Menú-tab correction above, this time
on the business side: a session had fully replaced the dashboard's "Pedidos" tab
(`CustomersModule`'s orders mode — KPI cards, status chips, order-card grid, a
lightweight detail overlay) with a standalone rebuild of the handoff's
`ToLatino Cocina.dc.html` (full "EN VIVO" board). The founder rejected the
replacement and asked for the original screen back with only the NEW
capabilities Cocina brought layered in.
- **Reverted:** `Panel.tsx`'s `orders` tab routes back to `CustomersModule`
  (matches `customers`/`reviews`, as originally); deleted the standalone
  `modules/Cocina.tsx` + its `cocina-ui.js`/`cocina-accept.js` audits (orphaned).
- **Grafted in additively** (same cards/KPIs/overlay, smarter behind them — no
  schema change, `fulfillment` jsonb from 0049/0074 already covers it):
  - **Accept → prep time.** Tapping "Aceptar" on a new order opens a small sheet
    (10/15/20/30 min chips) before advancing to `preparing`; also doubles as the
    reject entry point.
  - **Real driver assignment.** A `ready` delivery order's action button becomes
    **"Asignar repartidor"** (own roster from `business.settings.drivers` +
    external Uber Direct/DoorDash Drive backup) until a driver is set
    (`fulfillment.dispatch='on_the_way'`), then becomes **"Marcar entregado."**
    Previously "Dar al repartidor" silently jumped straight to `completed` with
    no record of who delivered it — a real functional gap now closed.
  - **Reject with a reason** (Artículo agotado / Cocina saturada / Cerramos por
    hoy / Fuera de zona) — customer notified, not charged, same as `cancelOrder`
    under the hood.
  - **Pago y liquidación** in the order-detail overlay: subtotal, tip (100% to
    driver), 15% To'Latino commission, net payout — inserted between the
    existing Total row and the Cancelar/action buttons.
  - **Realtime "new order" toast** (Supabase channel on `business_orders`
    INSERT) — prepends the order + a toast; no modal takeover, accepting still
    happens by tapping the card like any other order.
- **Rule for future Domain-B work (skill §8):** a `.dc.html` filename existing in
  the handoff does NOT mean rebuild that screen from scratch — if an app screen
  already occupies that role, graft the new design's capabilities into it.
- Verified in the real browser as b@b.com (El Sabor): board matches the original
  screenshot-for-screenshot (KPI cards, Clientes/Pedidos/Reseñas toggle, status
  chips — no "EN VIVO"); accept→prep-sheet, reject→reason-sheet, assign-driver
  (own + external), and the payout math ($15.48 sub → -$2.32 commission →
  $13.16 net) all verified live against real orders, then reverted to baseline.

### Design handoff consolidated (2026-07-10)
The founder re-uploaded the **complete, canonical handoff** (`docs/design-
system/`), merging two prior partial uploads from different sessions (a
"Plataforma" handoff and a separate "Pedidos" handoff) into one package with a
proper index. New structure: `README.md` (master index) → `01-plataforma.md`
(Domain A) + `02-pedidos.md` (Domain B, incl. the charge/payout formulas) →
`reference/dc/*.dc.html` (18 prototypes, now including `Ordenar`/`Cocina`/`Menu
Builder`/`tolatino-menu.js`) → `Guia visual.html` (printable contact sheet). The
old `HANDOFF.md` was byte-identical to the new `01-plataforma.md` — removed to
avoid two competing sources of truth. `CLAUDE.md` § Design system rewritten to
point at the new structure.

### Menú tab: category rail jumping on item-sheet open — fixed (2026-07-10)
Founder-reported regression: opening a product's customize sheet snapped the
category rail to the LAST category, even mid-scroll in a middle category. Root
cause: `useScrollLock` pinned `<body>` (`position:fixed`) via a plain `useEffect`
— a frame after the DOM commits — and in that gap the browser's own scroll
anchoring could nudge `window.scrollY` before the lock captured it; once pinned,
the document's collapsed scroll height then fooled the Menú tab's scroll-spy
"near-bottom" clamp into forcing the last category active. Fixed in
`lib/scrollLock.ts` (engage via `useLayoutEffect` — pre-paint, no drift window)
and `BizDetail.tsx`'s spy (freeze recomputation outright while `body.position ===
'fixed'`, holding the already-correct category steady while any sheet is open).
Regression test: `tools/mobile-audit/spy-modal-open.js`. Swept the other spy/
sticky/scroll-lock scripts for regressions — all still pass (shared primitive,
~84 modals depend on it).

### Menú tab: "Ordenar de nuevo" (Order again) — new (2026-07-11)
DoorDash/Uber Eats-style: the Menú tab's category rail now leads with an
"Ordenar de nuevo" chip/section for a signed-in customer who has ordered from
this business before — the items they've ordered, most-recent first, deduped,
still on the current menu. Built additively onto the existing rail/scroll-spy
(same `_pop`/category-key pattern, new `_reorder` key first) and reuses
`itemCard` as-is, so add/customize/cart behaves identically to every other
occurrence of that item on the page.
- **Data:** `useMyActivity()`'s already-loaded `orders` (no new fetch/migration).
  Matched by item display name (either language) against `MyOrder.items`;
  matched by **`slug`**, not `business_id` — `Business.id` is just the feed's
  array index, not the real Supabase id, so id-matching would silently match
  nothing (or worse, the wrong business). Cancelled orders excluded (never
  reached the customer); capped at 8 like Populares.
- **Gating:** signed-out visitors, and signed-in customers with no matching
  order history at this business, never see it — falls back to Populares/first
  category exactly as before, zero behavior change for new customers.
- **Verified:** `tools/mobile-audit/reorder-section.js` (signed-in with real
  order history → chip first, tap "+" → normal add/customize flow, cart state
  stays in sync with the same item's other occurrences on the page; signed-out
  → hidden). Swept `spy-*`/`scroll-lock`/`addon-variant-prompts` for
  regressions from the new first rail entry — all pass (`spy-tabentry.js` and
  `spy-modal-open.js` needed small fixes: they'd hardcoded "Populares" as the
  first category / a fixed scroll pixel offset — now read the actual first
  chip and a document-height fraction instead, so they stay valid regardless
  of which chip legitimately leads).

### Menú tab: Entrega/Recoger promoted to a real toggle (2026-07-11)
Founder-requested, benchmarked against DoorDash's store-page delivery/pickup
module: the old info-only badge row ("🛵 Entrega $0 · 30-45 min" + "🥡 Recoger ·
20 min" + "Mínimo $12 en entrega" shown together, non-interactive) is now a
segmented pill toggle + a single contextual time/fee line for whichever mode is
selected — matching DoorDash's pattern but in our own tokens (lilac-2 track,
white active pill, no copied DoorDash styling). Not a new UI concept: it's the
SAME `orderChannel` state + toggle that already lived inside the cart sheet,
promoted to the top of the Menú tab as one source of truth — selecting here
also drives checkout, no separate selection to repeat later. Scoped to just
this module per the founder's screenshot ("esta parte"); DoorDash's "Group
order" (shared multi-person cart) and its "X min left to order" urgency banner
from the reference screenshots were NOT built — bigger, separate features not
literally requested; logged in `docs/LAUNCH-CHECKLIST.md` if wanted later.
Verified in a real browser, mobile (402px) + desktop (1440px): toggle switches
correctly, info line updates (fee+ETA for delivery, "sin costo"+ETA for
pickup, minimum-for-delivery notice only shows when relevant). Swept
`spy-*`/`desktop-arrows` — all still pass (this sits above the sticky rail,
doesn't affect its pin math).

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
  **#7 record every deferral in `docs/LAUNCH-CHECKLIST.md`**; **#8 benchmark every
  section vs. the category leader (Yelp/DoorDash/Amazon/Nextdoor/Uber/Eventbrite/…)
  and ship a feature-complete competitor — no stubbed/fake states as final.**
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
- **Food ordering lives in the business single-page "Menú" tab (2026-07-09).**
  The client ordering experience is the DoorDash-grade **Menú tab** inside
  `BizDetail.tsx` (delivery/pickup chips with fee+ETA, horizontal category tabs,
  ⭐ Populares, item cards → item sheet with addon groups + special instructions →
  cart with tip/fees/AMIGO10 → checkout → real Stripe). Wired to real
  business_by_slug + business_menu_by_slug + marketplace-checkout.
  **Scope correction (founder):** an earlier pass replaced the ENTIRE business
  single-page with a full-screen `OrderFlow` component for orderable restaurants —
  the founder wanted the original single-page design kept and only the **Menú** tab
  to carry the food menu, so that full-page takeover was reverted and
  `screens/order/OrderFlow.tsx` + `orderIcons.tsx` deleted. Rule going forward for
  the menu: **only ADD missing professional touches to the Menú tab; don't rebuild
  the single-page.** Verified in the real browser from the Negocios list: El Sabor
  opens as the single-page (hero · Overview/Menú/Tienda/Relacionados/Reseñas tabs ·
  Lo que ofrece · Horario · Fotos · Ubicación · Reseñas); the Menú tab orders
  (add → cart bar). Phase 2 **Cocina** is rebuilt pixel-perfect
  as `apps/web/src/screens/negocio/modules/Cocina.tsx` — the restaurant order-
  management board (today stats + EN VIVO · status tabs Nuevos/Preparando/Listos/
  En camino/Completados · order cards) → order detail (status banner, progress
  timeline, customer + address card, "Para preparar" items, assigned-driver card,
  Pago y liquidación showing the 15% To'Latino commission + net payout) → incoming-
  order dialog (prep-time chips, Aceptar/Rechazar) → assign-driver / reject /
  notifications bottom sheets. Wired to REAL `business_orders` for the owner's
  active business (RLS owner-updatable) with realtime; the `orders` panel tab now
  routes here (was CustomersModule). Verified in the real browser as the El Sabor
  owner (b@b.com): board + detail render pixel-faithful on real orders, and
  clicking **Aceptar** flips the order to `preparing` in the DB AND notifies the
  client (a@a.com) — the full Cliente·Negocio·Plataforma loop. **Phase 3 Menú
  (builder) is the next pass.**
- **Food ordering — DoorDash-grade (2026-07-09, migrations 0074+0075):** El Sabor
  de Quisqueya carries a REAL 150-dish menu (15 categories × 10, 9 reusable
  modifier groups, bilingual, seeded via `scripts/seed-menu-sabor.mjs` in the exact
  shape the Food module edits). Cart checkout: **Entrega/Recoger** toggle, saved-
  address picker (+ new address), delivery instructions, driver tip (10/15/20%/
  custom, 100% pass-through), full fee breakdown that EXACTLY matches the Stripe
  charge, minimum-order + address guards (server-side from the business's own
  `settings`). Client tracking in Mi cuenta: live status timeline (Ordenado →
  Aceptado → Listo → En camino → Entregado), receipt, cancel while new, "Reportar
  un problema" → real chat to the business. Owner side (Entregas board): accept →
  ready → assign driver (roster CRUD, empty-start for real businesses) → picked
  up → on the way → delivered; card shows address, instructions, tip; client is
  notified at EVERY transition (order_status incl. dispatch states). Verified E2E
  autonomously (paid $24.87 delivery order → fulfilled → 6 client notifications)
  then cleaned.
- **Marketplace payments (Stripe Connect, test mode — 2026-07-09):** real card
  checkout for **Pedidos** (cart / one-tap), **Boletos** (Eventos tier picker),
  **Reservas** (service deposit) and **Renta** (rental fee) via **destination
  charges** (migrations 0072 + 0073). Buyer pays `P + 5%`, To'Latino keeps
  `15% of P` (`application_fee`), the seller's connected account gets `≈P − 10%`.
  Flow: `startMarketplaceCheckout` → `marketplace-checkout` Edge Function stages the
  purchase in `pending_purchases` + builds a Stripe Checkout Session → buyer pays →
  `stripe-webhook` **fulfills** (`fulfill_order` / `fulfill_event_tickets_multi`) +
  records `payments`; failed fulfillment (e.g. tickets sold out) **auto-refunds**.
  Sellers without a connected account keep pay-on-pickup (orders) / free-issue (free
  tiers). Migration **0072**. Return toast via `?pay=success|cancel` (PurchaseReturnToast).

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
- ⏳ **Apply `0065_events_phase2.sql`** (idempotent) — Eventos Phase 2: individual
  admissions (`event_tickets.admitted` + redesigned `checkin_ticket`), waitlist
  (`event_waitlist` + join/leave/notify + seat-freed trigger), promo codes
  (`event_promo_codes` + `validate_promo` + `buy_event_tickets_multi` gains `in_promo`
  + closes the hidden-tier hole), and `event_by_slug` gains `organizer_slug` +
  `events_by_owner`. Full SQL pasted in chat.
- ✅ **`0064_events_multi_ticket_search.sql` applied** (2026-07-07) — Eventos Phase 1:
  `buy_event_tickets_multi` (atomic multi-tier order) + `search_events` (server FTS,
  category/free filters, paginated) + widened `search_tsv` trigger; retires the old
  generated `search_vector`. Full SQL pasted in chat.
- ✅ **`0063_events_discovery_integrity.sql` applied** (2026-07-07) — Eventos P0
  hardening: past/cancelled events dropped from discovery, drafts hidden, RSVP on
  cancelled blocked, `owner_events_summary()` + `cancel_event()`.
- ✅ **`0013`→`0018` applied** (2026-07-04, verified: single 16-arg `create_business`).
  The old "not unique / owner_id missing" blocker is resolved; publish + Hazleton
  ownership work.
- ⏳ **Apply `0019_business_photos.sql` + `0020_business_modules.sql`** (both
  idempotent) so the dashboard's **Fotos** and **Configurar módulos** persist. The
  combined SQL is pasted in chat.
- ⏳ **Apply `0031_profile_settings.sql` + `0032_consumer_transactions.sql`** (both
  idempotent) — power Mi cuenta (bio/settings) and the **two-sided transaction
  loop** (orders/bookings gain `user_id`; new `business_rentals`, `event_tickets`,
  `event_attendance`; dual customer↔owner RLS). Combined SQL pasted in chat.

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
- [x] **Pagos** — real revenue from completed orders **+ live Stripe Connect
  onboarding** (Express account → "Recibiendo pagos" state, charges_enabled synced
  via the `connect-status` fn). Sellers get bank payouts through destination charges.
- [x] **Plan y facturación** — reflects the business's real tier (via bizAdmin) and
  runs **real Stripe subscription Checkout + Billing Portal** (0070; `stripe-checkout`
  / `stripe-portal` / `stripe-webhook` Edge Functions flip the tier on payment).
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

## Consumer transaction loop — DONE (2026-07-05)
The two-sided loop is complete and live. A customer creates a transaction from a
listing (or Eventos) and the SAME row shows in BOTH Mi cuenta and the business
dashboard (dual customer↔owner RLS, migration 0032).
- **Create actions** (`lib/myActivity.tsx` — `MyActivityProvider`, signed-in only;
  guests routed to `/entrar`):
  - `BizDetail` — **Pedir** (menu/shop order), **Reservar** (Servicios booking),
    new **Renta** tab + modal (period/qty/date + refundable deposit), event RSVP.
  - `Eventos` — **Voy** RSVP + **Comprar boletos**.
- **Mi cuenta (`/cuenta`)** manages all five: Mis pedidos · Reservas · Rentas ·
  Boletos · Voy a asistir (status pills, live counts).
- **Business side** sees the same rows: orders → **Pedidos/Pagos**, bookings →
  **Servicios**, rentals → **Renta · Solicitudes** (confirm/hand-out/return),
  tickets → **Eventos · Boletos** (buyer + qty + code + total).
- Consumer objects carry the public `slug` (not the uuid); creators resolve
  slug→uuid internally. Verified: tsc, build, and mobile audits all green —
  dashboard 0, **consumer 0/20** (`tools/mobile-audit/consumer.js`), publish 0.
- Deferred (see LAUNCH-CHECKLIST §5): business-side RSVP **names** (attendance has
  no name column); rentals/tickets are request-stage, **not charged** yet.

## Professional-depth arc — DONE (2026-07-07)
A push to make the consumer + owner experience compete with any existing platform.
Each item is real-data backed and verified (tsc + build + RPC-intercepted Playwright,
0 pageerrors / 0 overflow at 392px). Migrations pasted in chat; founder applied
**0046–0057** (`0055`+`0056`+`0057` applied 2026-07-07).
- **Renta module** rebuilt to Servicios-level depth: categories, per-item config,
  add-ons, policies/availability, calendar day-picking + qty + deposit; consumer
  Renta tab with availability truth (no double-booking across Rentas/Productos/
  Reservas via SECURITY DEFINER busy-date / seat-load RPCs).
- **In-app chat** (`lib/chat.tsx`): realtime customer↔business threads
  (`business_conversations`/`business_messages`), "Enviar mensaje" from the contact
  sheet, inbox + thread subscribe.
- **Auto notifications** (`lib/notifications.tsx`, migration 0054): DB triggers
  generate a per-user feed on real events; realtime badge + panel when signed in,
  fixtures when logged out.
- **Scalable search** (migration **0055**): Postgres FTS (`search_tsv` trigger-
  maintained tsvector + GIN + trigram fuzzy) via `search_businesses` RPC; Negocios
  calls it debounced, falls back to client filter when empty. NOTE: `search_tsv` is
  trigger-maintained, not a GENERATED column (`to_tsvector` is STABLE → 42P17); 0055
  also drops the superseded 0001 `search_businesses` overload so the grant is
  unambiguous (42725).
- **Real reviews** (migration **0056**): one review per user per business, author
  RLS, `post_review` upsert, `reviews_by_slug`, trigger syncing `rating`+`reviews_count`.
- **Owner reply on the public listing** (migration **0057**): `reviews_by_slug`
  widened to return `reply_es`/`reply_en`/`replied_at`; BizDetail shows the business's
  response under each review.
- **Real time-slot booking** (no migration): the Servicios booking sheet generates
  time slots from the business's real open hours × the service duration
  (`bookingSlots` in `lib/hours.ts`), drops past slots for today, blocks closed days,
  auto-selects the first slot. Replaces the old fixed 9/12/3/6 list.
- **Photo reviews** (migration **0058**): `reviews.photos text[]`; `post_review`
  takes photo URLs (old 3-arg overload dropped); `reviews_by_slug` returns photos.
  Reviewers upload in the "Tu reseña" sheet (reuses `uploadPostImages` → `post-photos`
  bucket, no new policy); the reviews list shows a thumbnail row per review.
  NOTE both 0057 and 0058 **drop** `reviews_by_slug` before recreating — adding a
  return column can't be done via CREATE OR REPLACE (42P13).
- **Per-slot booking capacity** (migration **0059**): `booking_load_by_service`
  regrouped by exact slot timestamp; the booking sheet disables only full slots
  ("Lleno"), shows "N libres", auto-selects the first open slot, greys a day only
  when all its slots are full. Slot↔booking matched by epoch(ms) (timestamptz
  round-trip). Fixes the old over-blocking where any capMax bookings marked the
  whole day full.
- **Per-variant / SKU stock** (no migration): each sellable variant (cartesian over
  a product's single option sets) carries its own count in
  `business_items.attrs.variantStock` (shared `variantCombos` key in productConfig).
  Dashboard Products wizard shows a per-variant stock grid; the consumer item sheet
  marks out-of-stock variant values "Agotado"/disabled, opens on the first in-stock
  one, caps qty, and shows "Solo N disponibles". Falls back to product-level stock.
- **Customer self-service cancel** on Mi cuenta (early orders/bookings/rentals).
- **Realtime Mi cuenta** (migration **0060**): the customer's transaction rows update
  live when the owner advances a status. `MyActivityProvider` subscribes to the five
  transaction tables (user_id-filtered) → `refresh()`; 0060 publishes them to
  `supabase_realtime`. Reuses the notifications realtime pattern.
- **Global search suggestions → server FTS** (no migration): header business
  suggestions call `search_businesses` (debounced), so the preview surfaces the full
  catalog, not just the loaded geo slice. Closes the Handoff global-search rule.
- **Eventos y boletos → Eventbrite parity** (migration **0061**): `event_tiers`
  (price/capacity/sales-window per tier), `buy_event_tickets` (no overselling),
  `event_by_slug`, `checkin_ticket`, triggers for tier.sold + going_count + organizer
  notifications. Consumer: rich detail (full date, directions, organizer,
  add-to-calendar ICS, share) + real tier picker + entry-code ticket in Mi cuenta.
  Dashboard: real tier editor + code-based check-in + real KPIs. Deferred (honest):
  Stripe charging, SES email, QR-image + camera scanner, map tiles, recurring/drafts/
  promoters.
- **Professional event-creation wizard** (migration **0062**): rebuilt to Eventbrite
  standard — cover-photo upload + 13-category picker (step 1), native date + start/end
  time pickers + online toggle + **geo address autocomplete (searchAddress → real
  lat/lng)** (step 2), **multi-tier ticket builder** (step 3), review + per-step
  gating (step 4). Backed by an atomic `create_event_full` RPC (event + cover + geo +
  end-time + all tiers). Replaces the thin free-text wizard.
- **Eventos P0 — correctness & honesty pass** (migration **0063**): after a 10-agent
  ultracode audit, fixed the discovery + counting bugs and de-faked the organizer
  dashboard. `events_near` now returns only published + upcoming (index-accelerated
  `st_dwithin`); `event_by_slug` hides drafts (cancelled still resolves → "Cancelado"
  banner); a DB guard blocks RSVP on non-published events. New `owner_events_summary()`
  drives real KPIs + rail (was hardcoded 186/$14.2k/212); Pasados/Asistentes/sales-
  sparkline now built from real `event_tickets`. New `cancel_event()` **soft-cancels**
  (tickets preserved) + notifies every attendee (`event_cancelled` kind) — replaces the
  old hard-delete that cascaded away sold tickets. Removed unbacked controls (wizard
  online toggle + visibility chips, 5 fake Ajustes toggles) and the fixture Borradores/
  Recurrentes/Promotores tabs → honest "Muy pronto". Fixed the "asisten" double-count
  and the date-chip year collapse. Verified: tsc + build + `eventos-p0.js` audit (0
  overflow). Newly-deferred items (online events, visibility, drafts, recurring,
  promoters, Ajustes controls, `/eventos/[slug]` page) logged in LAUNCH-CHECKLIST.
- **Eventos Phase 1 — deep-link, atomic order, event search** (migration **0064**):
  designed via a 6-agent ultracode workflow (map → synthesize → adversarial critique).
  (1) **Shareable deep link** `/eventos/?e=<slug>` (query-param pattern; a static
  `/eventos/[slug]` route is impossible for UGC under `output:'export'`) — refactored the
  detail from an index to an OBJECT so deep-linked/server-search results open; share URL is
  basePath-safe; unresolved slug flashes a message. (2) **Atomic multi-tier purchase**
  `buy_event_tickets_multi` (locks all tiers deterministically, all-or-nothing, one
  aggregated organizer notice; success lists every code by tier) — replaces the per-tier
  loop that could leave a partial order. (3) **Server event search** `search_events` (FTS +
  trigram, published+upcoming, category/free filters in SQL, ranked+paginated) wired into
  `/eventos` (debounced + numbered pager) and the header dropdown; retired the narrow 0002
  generated `search_vector`. (4) **List-page static metadata** + per-event client title/meta
  (browser + Googlebot; NOT social unfurls — SSR deferred honestly). Verified: tsc + build
  (metadata baked) + audit 0 overflow + deep-link strips `?e=`.
- **Eventos Phase 2 — run-the-event core** (migration **0065**): designed via a 6-agent
  workflow. **Individual admissions** (`event_tickets.admitted` + a redesigned
  `checkin_ticket(code,qty)` that admits N of a group per scan, row-locked; dashboard
  `admitted/qty` + "admit remaining" + per-buyer +1; Mi cuenta live progress). **Real QR**
  (`qrcode-generator`, zero-dep MIT) — attendee's scannable ticket in Mi cuenta + an
  organizer `BarcodeDetector` camera scanner (Chromium/Android) with a clean code-entry
  fallback; the fake `QrGrid` is gone. **Waitlist** (`event_waitlist` + join/leave/notify +
  seat-freed trigger) — consumer "Avísame" on sold-out tiers (notifies, doesn't hold) +
  organizer tab/KPI/blast. **Promo codes** (`event_promo_codes` + `validate_promo` +
  `buy_event_tickets_multi` gains `in_promo`) — access codes unlock hidden tiers (real;
  closed a latent hidden-tier-purchase hole; tier editor gains an "Oculto" toggle); %/$
  discounts adjust the snapshotted total only. **Map embed** (zero-dep OSM iframe) +
  **organizer profile** (`events_by_owner` → their other upcoming events). Verified: tsc +
  build + QR structural check + 0 overflow.
- **Honestly deferred** (need the founder's external setup, in LAUNCH-CHECKLIST):
  payments (Stripe), push/email delivery (VAPID+Edge Function+SES), **per-event crawler/social
  SEO (needs SSR/ISR)**, single-ticket refund UI (activates the waitlist seat-freed path),
  iOS camera QR (jsQR/zxing), recurring events. Not shipped as fake/broken.

## Next steps (priority order)
1. **Founder E2E-tests marketplace checkout** with card `4242 4242 4242 4242` (any
   future date / any CVC / any ZIP): buy a Pedido from El Sabor (`hz-sabor-quisqueya`)
   and 2× "Salsa mix" tickets → confirm in Stripe the split (buyer `P+5%`, platform
   fee `15% of P`, seller transfer `P−10%`) + the order/tickets appear in "Mi cuenta".
2. **Before real-money launch:** rotate the `sk_test` key, re-price orders/bookings/
   rentals against their config server-side, wire `%`/`$` promos into paid ticket
   checkout, and add a real rental security-deposit hold (see
   `docs/LAUNCH-CHECKLIST.md` → "Payments — marketplace checkout").
4. Continue **`docs/LAUNCH-CHECKLIST.md`** deferrals: delivery logistics, saved-biz
   cross-city, claim/verify, moderation, push, next-intl.

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
