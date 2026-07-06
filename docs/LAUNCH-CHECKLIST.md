# To'Latino — Launch & Scale Checklist (deferred decisions)

> **Purpose.** A running list of everything we deliberately deferred while
> building fast in the **sandbox**, to revisit **before/at public launch** and
> **at scale (1M+/mo)**. The founder won't remember these by heart, and neither
> should we from memory — this file is the source of truth. `CLAUDE.md` points
> here.
>
> **Rule for the AI:** whenever a task produces a "we'll do X later / at scale /
> before launch / when it's real" decision, **append it here** in the right
> section (don't just say it in chat). Keep items accurate to what the code
> actually does today. Check items off (`[x]`) only when truly done.
>
> **Context:** today everything runs against a sandbox where Supabase, Photon/
> Nominatim and Vercel are network-blocked, so features are verified by build +
> code review, **not** real end-to-end runs. Production is a separate, real
> environment.

---

## 0. Sandbox → real environment (the big one)

- [ ] **Real end-to-end testing.** Nothing here has been exercised against a
  live backend or real devices. Before launch, test on real phones:
  geolocation/GPS, iOS input auto-zoom, Supabase Realtime websockets (live
  likes/comments/new-post pill), the native Share sheet, and **photo upload**
  (compression + Storage). The sandbox cannot do any of these.
- [ ] **Rotate/secure secrets.** The Vercel token shared in chat during setup
  should be **revoked/rotated**. Never expose the Supabase DB connection string
  or service-role key. Keep only `NEXT_PUBLIC_*` (publishable) keys in the
  client build.
- [ ] **Self-hosting migration trigger** (from `CLAUDE.md` architecture
  decision): when Supabase + Cloudflare bills approach a Hetzner box + ops cost,
  move DB to **self-hosted Postgres + PostGIS** and introduce **NestJS**. Schema
  and frontend stay the same (`pg_dump`/restore). Avoid Supabase-proprietary
  features so this stays a restore, not a rewrite.

## 1. Scale (1M+ businesses / posts / users per month)

- [ ] **Realtime fan-out → per-city channels.** Today the community live layer
  uses **one global Supabase Realtime channel** (`tl-social` for likes/comment
  counts, `tl-comunidad-feed` for new-post INSERTs). Every client receives every
  event — fine for MVP, not for 1M+. Partition by **city/region** (or geohash)
  so a client only subscribes to nearby events. The scale note lives in
  `apps/web/src/lib/interactions.tsx` (lines 166-170); `screens/Comunidad.tsx`'s
  `tl-comunidad-feed` channel carries no such note yet.
- [ ] **Images → Cloudflare R2.** Photos upload to **Supabase Storage** now;
  move object storage to **Cloudflare R2** (free egress) at scale. Client-side
  compression stays identical; only the upload destination changes
  (`apps/web/src/lib/image.ts`).
- [ ] **Feed thumbnails.** We currently generate **one ~1600px WebP** per photo
  and use it everywhere. Add a **~400px thumbnail** (also client-side) for the
  feed so lists load lighter; keep the 1600px for the detail view.
- [ ] **Compression in a Web Worker.** `compressImage` runs on the main thread
  (fine for a few photos). Move to a Web Worker for posts with many images so the
  UI never janks.
- [ ] **Search → Meilisearch.** Postgres full-text search now → self-hosted
  **Meilisearch** (OSS) at scale. Avoid paid Algolia.
- [ ] **Street-address geocoding — Pelias at/near launch (decided 2026-07-03).**
  The **city gazetteer is already owned** (Supabase `cities` +
  `search_cities`/`nearest_city`). Street addresses currently use a free 3-layer
  pipeline: **Photon** (streets/POIs, biased+fenced to the metro, US-only) +
  **synthesized house-number+street suggestions** + the **US Census Bureau
  geocoder** (official TIGER data — exact house-number match, "verified" badge,
  snap-on-pick, via JSONP since it has no CORS; free, no key) with graceful
  fallbacks; locality-aware (a typed city outside the metro → national search).
  **Nominatim** for GPS→address.
  - **Decision:** the free pipeline is good enough for dev + early testing;
    **don't pay for infra with no users yet.** The production answer is
    **self-hosted Pelias** (OpenAddresses + TIGER + OSM + WhosOnFirst, US-only
    build) — Google-class `/v1/autocomplete`, ours, no rate limits.
  - **Migration is a config flip, not a rewrite:** the app geocodes over HTTP.
    When we build it, put a **`NEXT_PUBLIC_GEOCODER_URL`** abstraction in
    `geo.ts` (Pelias adapter when set, current pipeline when empty) so launch =
    stand up the box + set one env var.
  - **Ops when we do it:** Hetzner ~16–32 GB box (**~€30–60/mo**, US-only fits),
    Docker Compose, a few hours to import, refresh data periodically, HTTPS +
    CORS behind Cloudflare. First "real server" of the project — not copy-paste.

## 2. Security, moderation & abuse (launch blockers)

- [ ] **Content moderation.** Post **reporting** now exists (per-post "…" menu →
  Report, stored in `post_reports`; authors can edit/delete their own posts —
  migration `0009`). Still missing before public launch: an **admin review
  dashboard/queue** for reports, **block user**, auto-hide on N reports,
  reporting for **comments**, profanity/abuse handling, and **image moderation**
  (photos are public). Still a launch blocker until the review side exists.
- [ ] **Rate limiting / anti-spam.** Posting, commenting, likes and uploads have
  no rate limits. Add throttling (Edge Function / DB) before opening signups.
- [ ] **Account verification.** Auth is **email + password with "Confirm email"
  turned OFF** for instant signup (chosen for velocity, no email deliverability
  dependency). Before launch decide the anti-fake-account path: enable email
  confirmation (needs **Amazon SES** for deliverability), and/or **WhatsApp OTP**
  (audience fits — Latinos use WhatsApp heavily).
- [ ] **Transactional email.** None wired yet. Start with **Amazon SES**
  (~$0.10/1k) for confirmations/notifications; consider self-hosted Postal later.

## 3. Incomplete / stubbed features

- [ ] **"Crear evento" form is a stub.** In `PublishModal.tsx` the event branch
  still just calls `setDone(true)` — it does **not** insert into `events`. Build
  real event creation (insert, geo, tickets, images). (Business publish is now
  real via `create_business`; community posts are real. The full multi-plan
  business onboarding at `/negocio/publicar` is still a separate stub flow.)
- [ ] **Precise address — delivery integration.** Phases 1 & 2 shipped: optional
  precise address (GPS / Photon), and a saved-addresses manager (`user_addresses`
  table, labels, default, add/rename/delete) that syncs for signed-in users and
  drives the geo origin; guests keep one address locally. Remaining: use the
  active address as the **delivery destination** at checkout (fees / ETA / "does
  this business deliver to me"), when the ordering flow exists.
- [ ] **Business publish — follow-ups.** `create_business` inserts a Free-tier
  listing with the category-gradient tile and the picked subcategories. Still
  TODO: real **address geocoding** (today it uses the city center or the owner's
  GPS pin), business **photos**, amenities capture, editing/deleting your
  own listing from the UI (RLS policies already exist), and the paid tiers
  (verified/premium).
  - [x] **Hours editor (2026-07-04).** `PublishModal` now has a mobile-first
    weekly **Horario** editor (`components/HoursEditor.tsx`): per-day Abierto/Cerrado,
    open/close selects, split slots ("Otra franja"), "Aplicar a toda la semana". It
    emits the exact `WeekHours` shape (`businesses.hours`, migration `0018`) and
    submits it as `p_hours`, so new listings get a real live open/closed status
    instead of `hours = null`. Optional — skipping it still falls back to `is_open`.
  - [x] **Feature picker (2026-07-04).** The publish form now collects **Características**
    (Sugeridos = `FEATURES_COMMON` + per-rubro `FEATURES_BY_CAT[cat]`, deduped) and
    submits the canonical es-labels as `p_features` (migration `0016`), so new
    listings are filterable in the Negocios directory the moment they're created.
  - ⚠️ **Both ride on the same blocking `0013`→`0018` batch** (see the blocking
    item below). `p_features`/`p_hours` only exist on the **16-arg `create_business`
    from `0018`**; the form now always sends them. Publish is already blocked until
    that batch is applied (`0013` is what creates `create_business` in the first
    place), so apply `0013`→`0018` **in full and in order** — a partial subset that
    stops before `0018` would make the publish RPC call fail to resolve (PostgREST
    can't match extra named args), not silently drop the fields.
- [ ] **Verified vs unverified listing tiers — claim/upgrade flow.** The Negocios
  directory now renders two card variants (`BizCardVerified` rich vs `BizCardBasic`
  simple + "Sin verificar" badge) and always ranks verified businesses on top
  (`vkey` sort in `Negocios.tsx`). "Verified" today just means `tier !== 'free'`.
  Still needed before launch: a **self-serve "¿Es tu negocio? Reclámalo / verifícate"
  flow** (claim an unverified listing, prove ownership, upgrade to Verified/Premium),
  and the paid-tier billing that gates it. Until then no owner can move their own
  listing from the basic card to the rich one.
- [ ] **Saved businesses — cross-city list.** The ♥ on a business now persists
  (`saved_businesses` table for signed-in users, migration `0017`; localStorage
  for guests; keyed by slug; guest saves merge up on login) and there's a
  "Guardados" toggle in Negocios. Limitation: that toggle **filters the current
  geo-scoped results**, so a saved business in another metro won't show while
  you're viewing a different city. Before launch, add a real saved list that
  **fetches the saved businesses by slug regardless of the active city** (a
  `businesses_by_slugs` RPC) so Guardados is truly global.
- [ ] **Push notifications.** Not built. Plan: **Web Push (VAPID)** for the PWA,
  **+ FCM** (free) for native later. Drives the "Alertas" tab and new-activity
  pings.
  - [ ] **Horario "Feriados y más" — day-before push reminder.** Holidays /
    vacations / special days are programmed in advance, so the owner should get a
    push **the day before** each one starts (and optionally the day of). Built
    **client-side today**: the dashboard **home** shows a `HoursReminders` banner
    for any `businesses.hours_exceptions` starting today/tomorrow (helper
    `upcomingExceptionReminders` in `lib/hours.ts`), dismissible via
    `localStorage`. That only fires **while the dashboard is open** — when Web
    Push lands, add a **scheduled server push** (Supabase Edge Function on a daily
    cron, or `pg_cron`) that scans `hours_exceptions` for start dates = tomorrow
    and pushes the owner, honoring the owner's notification prefs in
    `businesses.settings`. Reuse the same today/tomorrow window + copy as the
    banner. Also feed these into the header `Bell` count (currently a demo stub).
  - [ ] **Listados relacionados — cross-owner request notifications.** When a
    cross-owner link is requested (`business_relations` status `pending`,
    migration 0044), the TARGET owner only sees it in the Related module's
    "Solicitudes por aprobar" today — no push. When Web Push lands, notify the
    target owner on a new pending request, and notify the requester when it's
    approved/rejected. Feed both into the header `Bell` count.
- [ ] **i18n via next-intl.** Copy is bilingual today via inline `L('es','en')`
  + a global ES/EN toggle (works). `CLAUDE.md` targets **next-intl** — migrate
  when it's worth it (SEO/locale routing).
- [ ] **Payments.** Deferred to the transaction phase (event tickets, paid
  listings). Evaluate **Stripe** then; not needed for MVP discovery/listings.
- [ ] **Photo aspect ratio (cosmetic).** Feed photos are cropped **square**
  (Instagram-style). Optional: offer 4:5 or original-aspect. One-line change in
  `PostCard.tsx`.
- [ ] **Video in posts — DO NOT self-host raw.** Decision (2026-07-03): video is
  the #1 budget killer for a bootstrap — the cost is **egress**, not storage
  (each view streams the file; 1M short clips ≈ multi-TB storage + hundreds of TB
  egress). There is **no browser-side compression** equivalent to the photo
  pipeline (client transcoding via ffmpeg.wasm is heavy/unreliable on mobile).
  Plan, in order:
  1. **MVP/launch:** no native video upload.
  2. **Cheap, culturally-fit path (buildable now):** let users paste a
     **TikTok / YouTube / Instagram Reels** link → render the embed/thumbnail in
     the post. Hosting cost ≈ $0 (video stays on the source platform).
  3. **At traction, for native short video (≤30–60s):** use **Cloudflare Stream**
     (fits the Cloudflare stack — transcoding + adaptive bitrate + CDN +
     thumbnails, priced per delivered minute = predictable). Never DIY transcode
     on Supabase Storage.
  Also: video moderation is harder/costlier than images — another reason to
  defer past the moderation work.

## 3b. Business dashboard modules (new mobile handoff, 2026-07-03)

The founder delivered a **mobile business-dashboard handoff** (shell + 9 modules,
`handoff_business_mobile/`). The shell + Inicio/Insights home already exist at
`/negocio` (plan- & rubro-aware, responsive to desktop). Now replacing the
uniform `GenericTab` with each module's **rich** screen, one at a time, in the
handoff's build order. Each is mobile-first and expanded to desktop.

All 9 module screens are **built, wired into `/negocio`, and pass the production
build** (each mobile-first + expanded to desktop, Spanish-first, tokens only,
real interactive state). Content is demo/fixture data — the remaining work is
backing them with real Supabase tables/RPCs when each feature goes live.
- [x] **Updates / Novedades** — composer (type chips + photo/video/offer +
  Borrador/Programar/Publicar), sub-tabs with live counts, post cards
  (live stats / per-status actions), perf + recent-followers rail.
- [x] **Billing** — Plan / Comparar / Pagos / Facturas; upgrade + cancel sheets; tier-aware.
- [x] **Customers / Orders / Reviews** — mode toggle + segments + order pipeline (advance) + AI-draft reply.
- [x] **Staff / Jobs** — roster, schedule (gantt), attendance, payroll, roles matrix; job pipeline. Free gates Horario/Asistencia/Nómina + 2-member cap.
- [x] **Rental** — items/availability, calendar, deposits, damages, pricing; rent-out + return/refund flows; add-item wizard.
- [x] **Events & Tickets** — upcoming/drafts/past/recurring/promoters, manage detail (check-in QR), 4-step add-event wizard.
- [x] **Products** — catalog/inventory/variants/collections/discounts; 4-step add-product wizard. (Delivery/shipping moved to the shared **Entregas y envíos** module — see below.)
- [x] **Services & Bookings** — catalog + bookable/inquiry toggle, reservations (calendar/tables/list/rules); 4-step add-service wizard.
- [x] **Food menu** — 7 sub-tabs (Platillos/Categorías/Modificadores/Horarios/Promociones/Alérgenos/Stock-86) + 6-step add-item wizard with live preview.
- [x] **Food menu — FULL admin (2026-07-06).** Every sub-tab is now real CRUD:
  items (create/edit/duplicate/delete → `business_items` kind='menu'), categories
  (create/edit/reorder/hide/delete-guarded), reusable modifier groups
  (single/multi, required, priced options, duplicate), dayparts, promotions
  (4 types + pause/activate/schedule), allergen matrix (tap-to-cycle, persisted
  per item), stock automation — structure persisted in `businesses.menu_config`
  (migration 0045). The public listing's **Menú tab renders the real menu**
  (grouped by the owner's categories, per-item option pickers from their
  modifier groups, active promo on the hero). Deferred:
  - [ ] **Promo redemption analytics** (canjes/ingresos per promo) — display &
    management only; wire real counts when the transaction phase lands, and
    APPLY promos to cart pricing at checkout.
  - [x] **Item photos (2026-07-06)** — real uploads via the shared image
    pipeline (client WebP + EXIF strip, 1200px edge) → `business_items.
    image_url`; wizard uploader with drag&drop/change/remove, edit-page
    change/remove, thumbnails on admin cards + the public menu card & modal.
  - [x] **Menu mode: display-only vs online orders (2026-07-06)** —
    `menu_config.ordering` (default FALSE = showcase). Dashboard toggle on the
    Platillos tab; the public Menú tab hides the +/Pedir buttons + cart and
    shows a "Menú informativo · Llamar" note when ordering is off. NOTE: online
    ordering itself is still not transactional (no payments/delivery) — turning
    it on today only surfaces the order buttons (orders create a record via
    myActivity). Wire real checkout/payments before promoting "Online orders".
  - [ ] **Daypart/schedule enforcement on the public menu** — per-item
    sched/days + dayparts are stored but the public Menú shows all published
    items regardless of the hour; filter by active daypart when it matters.
  - [ ] **Wizard "Programar" publish option** publishes immediately (only
    "Guardar borrador" hides); add real scheduled publishing later.
- [x] **Servicios — FULL admin (2026-07-06).** Replicated the Food treatment for
  bookable services (peluquería, carwash, tastings, classes, catering, etc.).
  Two top-level modes: **Servicios** (catalog + Categorías + Add-ons sub-tabs)
  and **Reservas** (manage bookings). Real CRUD: services (create/edit/duplicate/
  delete-confirmed → `business_items` kind='service'), categories (create/edit/
  reorder/hide/delete-guarded), reusable **add-ons** (priced extras, used across
  services). Shared **5-step wizard** (Detalles → Precio → Add-ons → Reserva →
  Revisar) for create AND edit, with live preview, service photos (shared image
  pipeline → `business_items.image_url`), price type (fijo/por persona/cotizar),
  duration, deposit toggle, bookable-vs-inquiry, capacity + available days.
  Structure persisted in `businesses.service_config` (migration **0046**). The
  **Reservas** mode reads real `business_bookings` (0027) with KPIs, a status
  filter and per-booking actions (confirmar → iniciar → completar / cancelar).
  The public listing's **Servicios tab renders the real services** (grouped by
  the owner's categories, add-on picker + per-person party size + deposit summary
  in the booking sheet). Deferred:
  - [x] **Service mode: display-only vs online bookings (2026-07-06)** —
    `service_config.booking` (default FALSE = showcase). Dashboard toggle on the
    Catálogo tab; the public Servicios tab hides the Reservar button and shows a
    "Servicios informativos · Llamar" note when booking is off. Per-service
    `bookable` still distinguishes Reservar (appointment + time slot) from
    Consultar (inquiry lead, no time slot) when booking mode is ON.
  - [ ] **Reservations pass — do it when Stripe/payments land (founder decision,
    2026-07-06).** The booking flow works end-to-end (create/manage bookings,
    deposit toggle, estimated total + deposit summary) but **no money moves**:
    the computed deposit is stored on the booking, not charged. When the payment
    system (Stripe or chosen gateway) is in place, do a proper refinement pass on
    reservations — actually charge/hold deposits, partial-deposit %, refunds/
    cancellation policy, and confirm-on-payment. Do NOT promote "paid deposits"
    until then.
  - [ ] **Availability/day enforcement.** Per-service available days + capacity
    are stored and shown, but the public date/time picker offers fixed sample
    slots (`SVC_DATES`/`SVC_TIMES`) regardless — generate real slots from the
    business hours + service days/capacity when scheduling matters.
  - [ ] **SMS reminders & auto-deposits** (Premium teaser in the module) — build
    when the notifications + payments phases land.
- [x] **Productos — FULL admin (2026-07-06).** Same treatment as the Food menu.
  Products live in `business_items` (kind='product'); the structure (categories,
  reusable option sets/variants, curated collections, discounts, sell mode) lives
  in `businesses.product_config` (migration **0048**). Sub-tabs, all real CRUD:
  **Catálogo** (product cards → shared **5-step wizard** Detalles → Precio →
  Variantes → Inventario → Revisar, for create AND edit, with live preview, real
  **photo upload** → `business_items.image_url`, compare-at/sale price, duplicate,
  delete-confirmed), **Categorías** (create/edit/reorder/hide/delete-guarded),
  **Variantes** (reusable option sets → sellable-variant count), **Colecciones**
  (curated groups with a featured flag + member picker), **Descuentos** (code/
  %/$/free-ship/BOGO, auto-apply, active/paused), and **Inventario** (real KPIs +
  stock from the catalog). A **"Modo de la tienda"** toggle (Solo catálogo vs
  Vender en línea) persists `product_config.selling`. The public listing's
  **Tienda tab renders the real shop** (grouped by the owner's categories, per-
  item option/variant picker, featured collections as a strip); display-only mode
  hides the +/cart and shows a "Catálogo informativo · Llamar" note. Delivery/
  shipping stays in the shared Entregas module. Deferred:
  - [ ] **Selling is not transactional.** "Vender en línea" surfaces the cart/+
    buttons (orders record via myActivity) but there's no payment/checkout — wire
    real checkout + payments before promoting online selling. Same status as the
    Food menu's online-ordering.
  - [ ] **Variant-level stock/price.** Option sets define sellable variants and
    per-value price deltas, but per-variant inventory (stock by SKU combination)
    is not tracked yet — product-level stock only. Add a variant matrix when
    inventory-by-variant matters.
  - [ ] **Discount redemption + cart application.** Discounts are managed (code/
    type/auto/status) and shown, but redemption analytics and applying them to
    cart pricing at checkout land with the transaction phase.
  - [ ] **Collections on membership sync.** A collection stores member product
    ids; if a product is deleted its id can linger in a collection (harmless —
    the public strip only shows the collection name). Prune on delete later.
- [x] **Entregas y envíos — SHARED fulfillment module (2026-07-06).** Pulled
  delivery/shipping OUT of Products into a standalone module
  (`modules/Fulfillment.tsx`) shared by BOTH the Food menu (local delivery) and
  Products (delivery + national shipping) — a restaurant and a shop configure
  fulfillment ONCE. Two sections matching the owner's model: **Delivery (entrega
  local)** = Zonas + Repartidores (propios / apps externas: Uber Direct, DoorDash
  Drive, Rappi/Uber Eats); **Shipping (envío)** = Recoger en tienda + Envío
  nacional (**Tarifa propia** / **Transportistas** USPS·UPS·FedEx). No migration
  — the data was already business-scoped in `businesses.settings` { shipping,
  drivers } (jsonb); this was a UI extraction + nav rewire. Sidebar shows the
  module whenever Menú **or** Productos is on; the legacy `shipping`/`drivers`
  tab ids deep-link into it; Products & Food each carry a shortcut card to it.
  Verified: tsc + build clean; 0 overflow at 392px across both sections,
  sub-tabs and own/external toggles. Deferred:
  - [ ] **External delivery/shipping integrations are display-only stubs.** The
    provider cards (Uber Direct, DoorDash Drive, Rappi; USPS/UPS/FedEx) toggle +
    persist a preference but call no real API. Wire the actual dispatch/label
    APIs (e.g. Shippo/EasyPost for carrier rates+labels; Uber Direct/DoorDash
    Drive APIs for on-demand couriers) when the logistics/payments phase lands.
  - [ ] **Own delivery zones are still editable-lite.** "Nueva zona" appends a
    placeholder zone; a full zone editor (draw radius on the map, per-zone fee/
    ETA/min-order) comes with the real MapLibre integration.
- [x] **Shell polish (mobile chrome, 2026-07-04)** — the dashboard now mirrors the
  handoff on mobile: dark top bar on Inicio (light elsewhere), business identity
  card at the top of Inicio, and the fixed bottom-tab bar
  (Inicio·Pedidos·Mensajes·Reseñas·Más→drawer). Verified via Playwright at 392px:
  0 horizontal overflow on all 12 dashboard views (fixed min-w-0 on module grid
  columns and scroll rows); desktop unchanged (light topbar + sidebar).
- [x] **Popups → full-screen pages (2026-07-04)** — every module edit/create/detail/
  wizard converted from cramped bottom-sheets to the shared `ModulePage`
  (`modules/_page.tsx`: own header, natural scroll, sticky footer actions). Verified
  by `tools/mobile-audit/` — **125 states / 0 overflow** at 392px.
- [ ] **Apply the missing DB migrations (BLOCKING).** The founder's Supabase is
  missing `0013`→`0018` (the `owner_id` ownership SQL failed: "column owner_id does
  not exist"). Apply `0013`→`0018` in order in the SQL Editor, then run the
  Hazleton→`b@b.com` ownership script (pasted in chat). Until then `create_business`
  (publish), features, hours and saved-businesses tables are absent in prod.
- [ ] **Wire modules to real data** — today all module content is fixture/demo state
  (local `useState`). Load the owner's business(es) by `owner_id`, add a business
  switcher, and back each module with Supabase tables/RPCs as features launch (so
  `b@b.com` sees the real Hazleton businesses, not the demo restaurant).

## 4. Infra & hosting

- [ ] **Frontend host: Vercel → Cloudflare Pages.** Currently auto-deploys on
  **Vercel** (Git integration). `CLAUDE.md` target is **Cloudflare Pages** (free,
  cheap bandwidth). Revisit before scale.
- [ ] **PWA / app stores.** Wrap with **Capacitor** for native app-store
  presence later; add offline/install polish.
- [ ] **Deploy process note.** Work is developed on `claude/new-prompt-xkubrd`
  and released by fast-forward-merging into `claude/tolatino-repo-setup-1efdil`
  (the branch Vercel auto-deploys). Keep DB migrations (`supabase/migrations/`)
  applied in order in the Supabase SQL Editor — they are pasted into chat when
  created (non-negotiable #6).

## 5. Consumer transaction loop (deferred pieces)

- [ ] **Business-side RSVP attendee names.** The two-sided loop is live: a
  customer's order / booking / rental / ticket / "Voy" is created from the
  listing (or Eventos) and shows in BOTH Mi cuenta and the business dashboard
  (orders → Pedidos/Pagos, bookings → Servicios, rentals → Renta·Solicitudes,
  tickets → Eventos·Boletos). `event_attendance` stores only `user_id` (no
  name) and profiles are self-read under RLS, so the business can show a **count**
  of "Voy" RSVPs but not the attendees **by name**. To surface names later,
  either denormalize `customer_name` onto `event_attendance` (like tickets) or
  add a scoped profiles-read policy for event owners. Non-transactional, low
  priority.
- [ ] **Rentals/tickets are request-stage, not paid.** Rentals insert as
  `pending` (business confirms → hand-out → returned); tickets/deposits are
  recorded but **not charged** — payments come in the transaction phase
  (Stripe/etc., see §2). No real money moves yet.

## 6. Moderation & admin

- [ ] **Server-side enforcement of Pro-gated listing fields.** Información
  general gates Subcategorías / Lo que ofrece / Destacar en la tarjeta /
  Contacto por mensaje / Sitio web behind the paid tier — but only in the UI
  (the client also stops sending those columns for free accounts). The RLS
  "update own business" policy does NOT check tier, so a technically savvy free
  owner could still write those columns via the API. Before real launch, add a
  DB-side guard (e.g. a BEFORE UPDATE trigger that rejects changes to gated
  columns when `tier = 'free'`). Same applies to the **photo cap** (Free 1 /
  Pro 20, enforced only in the Photos UI) — add a trigger/policy on
  `business_photos` insert that counts existing rows against the owner's tier.
  Same applies to the **Horario Pro-gate** (Free: one slot per day, no
  `hours_exceptions`): the "+ Otra franja" and "Feriados y más" limits are
  UI-only, so the trigger should also reject `hours` with >1 interval on any day
  and any non-empty `hours_exceptions` when `tier = 'free'`.

- [ ] **Subcategory suggestions — admin approval UI.** Owners can propose a new
  subcategory from Información general; it's stored `pending` in
  `subcategory_suggestions` (0038) and only publishes when approved. Approval is
  **currently manual**: set `status = 'approved'` in the Supabase Table Editor
  and a trigger appends the label to that business's `subcategories`. Before
  scale, build a proper **admin moderation queue** (review/approve/reject with
  `label_en`), and consider promoting popular approved labels into the shared
  `SUBCATS` taxonomy (today it's a hardcoded fixture — approved customs only go
  live on the proposing business, not as a standard chip for everyone).

---

_Last updated: 2026-07-05. Add to this file as new deferrals appear._
