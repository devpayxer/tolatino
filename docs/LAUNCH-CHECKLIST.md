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
- [ ] **Supabase advisor: `rls_disabled_in_public` on `spatial_ref_sys`
  (known PostGIS exception — NOT a data risk).** The security-advisor email flags
  this table. Verified 2026-07-09: **every table holding user data already has RLS
  enabled with owner-scoped policies** (profiles/businesses/business_orders/
  payments/pending_purchases/user_addresses/notifications/… — checked the full
  `pg_class`/`pg_policies` list). The ONLY flagged table is **`spatial_ref_sys`**,
  a PostGIS system table of ~8,500 static EPSG map-projection rows — **no user
  data**. It's owned by `supabase_admin`, so we **cannot** self-remediate: enabling
  RLS fails (`must be owner of table spatial_ref_sys`) and revoking the `anon`
  INSERT/UPDATE/DELETE grant is a silent no-op (the grant was made by
  `supabase_admin`; our `postgres` role can't assume it — `pg_has_role` = false).
  Residual risk is low (an attacker with only the public key could delete/corrupt
  reference rows → break `ST_Transform`/geo, an availability nuisance, restorable;
  **no data leak**). **Do NOT click "Resolve issue" in the email** (act via the
  Supabase dashboard, not email links). Resolution options: (a) **dismiss** this
  finding in Supabase Security Advisor as a known PostGIS exception; (b) or open a
  Supabase support request to enable RLS / revoke on the extension table (needs
  their internal role); (c) heavier — move the PostGIS extension out of `public`
  into a `gis` schema (also needs elevated privileges; not worth it for reference
  data). Revisit if Supabase ships a way to lock it down.

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
- [x] **Renta — FULL admin (2026-07-06).** Same treatment as Servicios. Rental
  items live in `business_items` (kind='rental'); the structure (categories,
  reusable priced add-ons, rental mode) lives in `businesses.rental_config`
  (migration **0050**). New `lib/rentalConfig.ts` + `RentalEditors.tsx`
  (RentalCategoryEditor + RentalAddonEditor) mirror the service versions. Two
  top-level modes:
  - **Artículos** — sub-tabs **Catálogo** (item cards grouped by the owner's
    editable categories → shared **5-step wizard** Detalles → Tarifas → Extras →
    Políticas → Revisar, for create AND edit, with live preview, real **photo
    upload** → `business_items.image_url`, hour/day/week rates + deposit, tags,
    add-ons, waiver policies, duplicate, delete-confirmed; tapping a card opens
    the item detail with **Rentar** (walk-in rent-out flow) + **Devolver**
    (condition-check refund flow) + **Editar**), **Categorías** (create/edit/
    reorder/hide/delete-guarded), **Extras** (reusable priced add-ons: entrega,
    montaje, seguro…), **Políticas** (managed reusable rental terms — exención/
    depósito/cargo/seguro — full CRUD, each item toggles which apply; also
    creatable inline from the wizard), and **Precios** (rate overview). A **"Modo del listado"**
    toggle (Solo mostrar vs Aceptar rentas) persists `rental_config.renting`.
  - **Rentas** — operations: **Solicitudes** (real `business_rentals` requests
    with status progression), **Calendario**, **Depósitos**, **Daños**.
  - The public listing's **Renta tab renders real items** (`fetchBusinessRentals`
    → `business_rentals_by_slug`, migration 0050 — RPC includes `price`), with the
    Rentar sheet; display-only mode (renting off) hides Rentar and shows a "llama
    o visita para rentar" note. The item card tap → detail keeps the RentOut/Return
    ops (a superset of the Servicios tap→edit — Editar lives in the detail).
  - The consumer **Rentar sheet is a real month calendar** (2026-07-07): navigate
    months, pick a single day or a **start→end range** (day-count drives the fee;
    weekly rate auto-applies for 7+ day spans), or **by-hour** when the item has an
    hourly rate. Days are gated by the item's **availability config** (Siempre /
    Entre semana / Fines de semana / 48h aviso) + never past — carried to the
    consumer as `PubRental.avail`. Replaced the old hardcoded 5-chip date fixture. Deferred:
  - [ ] **Renting is not transactional.** "Aceptar rentas" surfaces the Rentar
    flow (requests insert via `business_rentals`) but there's no deposit charge /
    payment — wire real checkout + deposit holds with the payments phase (same
    status as Servicios bookings / online ordering).
  - [ ] **Ops panes (Calendario / Depósitos / Daños) are still sample data.**
    Solicitudes is real (`business_rentals`); the calendar, deposit ledger and
    damage log are illustrative fixtures — back them with real
    rentals/deposits/damage rows when the rental transaction loop is built.
  - [x] **Availability truth — no double-booking (2026-07-07).** The Rentar
    calendar now greys out (struck-through, non-selectable) days already booked to
    capacity: each rental request stores `item_id` (migration **0051**) and the
    consumer reads busy date-ranges via `rental_busy_by_item` (SECURITY DEFINER
    RPC → dates + qty only, no customer data; `business_rentals` RLS stays locked).
    A day is blocked when booked units ≥ stock. Plus the availability rule
    (weekday/weekend/48h) + past. Remaining refinements (deferred):
    - [ ] **Per-day-per-qty precision.** A day is blocked only when FULLY booked;
      it doesn't yet check that a multi-unit request fits every day of a range
      (e.g. 2 of 3 units taken, renter wants 2). Fine at low volume.
    - [x] **Productos: stock enforced on the consumer (2026-07-07).** The public
      shop reads each product's `stock` (business_items.attrs) → out-of-stock
      shows "Agotado" and blocks add/order/open; low stock (≤5) shows "Quedan N";
      the cart is capped at available units (simple + variant items). Product-level
      stock only — per-VARIANT (SKU) stock is still deferred. `stock` defaults to 0
      so sellers must set it (add an "untracked inventory" opt-out later).
    - [x] **Reservas: session capacity enforced (2026-07-07).** A bookable
      service's per-session capacity (from the `capacity` range, e.g. '8–16'→16)
      is now respected: each booking stores `service_id` (migration **0052**) and
      the booking sheet reads per-day seat load via `booking_load_by_service`
      (SECURITY DEFINER RPC → day + seats only, no PII). A full day shows "Lleno"
      + is disabled; ≤3 remaining shows "N libres". party_size counts toward the
      seat total. Deferred: real time-SLOT scheduling (the times are still fixture
      slots — capacity is enforced per DAY, not per time-slot) and per-variant SKU
      stock for products.
- [x] **Real reviews — persisted + rating sync (2026-07-07).** "Escribir reseña"
  only added to local state before; now reviews persist and drive the rating.
  Migration **0056**: `reviews.user_id` + a unique (business_id, user_id), author
  self-service RLS (insert/update/delete own), a `post_review` RPC (upsert one
  review per user per business), a `reviews_by_slug` RPC for the listing, and a
  **trigger that keeps `businesses.rating` (avg) + `reviews_count` in sync** on
  every review change (so cards/search stay accurate). BizDetail loads the real
  reviews (fixtures fallback when none) and "Publicar reseña" persists via
  `post_review` (auth-gated → /entrar) with optimistic add + refetch. Verified:
  a persisted review not in the fixtures renders in the Reseñas tab, 0 pageerrors
  / 0 overflow. Deferred: photo reviews, helpful-vote persistence,
  verified-purchase badge, moderation.
- [x] **Owner reply shown on the public listing (2026-07-07).** The owner could
  already reply to a review from the dashboard (`reply_es`/`reply_en`/`replied_at`,
  migration **0023**), but `reviews_by_slug` never returned those columns so the
  response never reached the consumer. Migration **0057** widens `reviews_by_slug`
  to include the reply; BizDetail renders it under the review as a purple-accented
  "Respuesta de {negocio} · {fecha}" block (design tokens, ES/EN). Table-stakes for
  a trustworthy listing (Yelp/Google both show it). Verified with an RPC intercept:
  the reply block renders and no h-overflow at 392px.
- [x] **Real time-slot booking (2026-07-07).** The Servicios booking sheet offered a
  fixed 4-time list (9/12/3/6) regardless of when the business is open. Now the time
  slots are generated from the business's **real open hours for the chosen day ×
  the service's duration** (`bookingSlots` in `lib/hours.ts`, using the same
  `effectiveIntervals`/exception logic that drives the open/closed badge). Slots
  that fit fully before close; on "today", slots already in the past are dropped;
  a closed day shows "Cerrado ese día — elige otra fecha" and blocks submit; the
  first slot auto-selects and the picked minute flows into the booking's real
  start datetime. No hours configured → falls back to the old fixed list so booking
  still works. No migration (client-side off existing `businesses.hours`). Verified:
  26 real slots render off fixture hours, 0 pageerrors / 0 overflow at 392px; logic
  unit-checked (stepping, past-slot filter, closed-day). Deferred: **per-slot**
  capacity (today capacity is per-day via 0052) — disable an individual time once
  it's fully booked; staff/resource-aware scheduling.
- [x] **Photo reviews (2026-07-07).** The last piece to reach review parity with
  Yelp/Google/DoorDash and the strongest trust signal a listing carries. Migration
  **0058**: `reviews.photos text[]`; `post_review` gains an optional photo-URL array
  (caps at 6; the old 3-arg overload is dropped so a 3-arg call isn't ambiguous —
  42725); `reviews_by_slug` returns `photos` (dropped+recreated because adding a
  return column can't be done with CREATE OR REPLACE — 42P13). Reviewers upload in
  the "Tu reseña" sheet (compress→WebP→own uid folder via the existing `post-photos`
  bucket + `uploadPostImages`; **no new bucket/policy**), see thumbnail previews with
  remove, and the sheet shows a "Publicando…" busy state during upload. The reviews
  list renders a horizontal thumbnail row under each review body. Verified with an
  RPC intercept: 3–4 thumbnails render + the picker shows, 0 pageerrors / 0 overflow
  at 392px. Deferred: full-screen photo lightbox; per-photo moderation.
- [x] **Per-slot booking capacity (2026-07-07).** 0052 exposed seat load per DAY, but
  capacity is "seats per session" (a session = a time slot), so three bookings in
  different slots wrongly marked the whole day full. Migration **0059** regroups
  `booking_load_by_service` by the exact slot timestamp (drop+recreate — return type
  changed, 42P13). The booking sheet now disables only the slots actually at capacity
  ("Lleno"), shows "N libres" when ≤3 seats remain, auto-selects the first open slot,
  greys a date only when EVERY slot that day is full, and blocks a full-slot submit.
  Slot↔booking matching is by **epoch(ms)** (a timestamptz round-trips as a different
  string than toISOString) — unit-verified. Still SECURITY DEFINER, no customer data.
  Verified: mocked service (cap 2) + a full-slot load → 5 "Lleno" disabled slots,
  first open slot auto-selected, 0 pageerrors / 0 overflow at 392px; consumer audit
  0/20. Deferred: staff/resource-aware capacity (multiple providers per slot).
- [x] **Per-variant / SKU stock (2026-07-07).** A product with a size/color axis had
  ONE stock number for all variants — now each sellable variant (cartesian over the
  product's SINGLE option sets) carries its own count. **No migration** (stored in
  `business_items.attrs.variantStock`, keyed `setId:idx|…` — the SAME key the consumer
  builds from its selected options, via the shared `variantCombos` in productConfig).
  Dashboard (Products wizard → Inventario): when a product has ≥1 variant axis, the
  single stock field is replaced by a **per-variant stock grid** (each combo → a qty
  input), and the product-level `stock` becomes the sum (so catalog pills + product
  gating stay correct). Consumer (item sheet): a variant value that would make the
  selection out of stock shows "Agotado" + is disabled + struck through; the sheet
  opens on the first in-stock variant; qty is capped at the picked variant's stock;
  "Solo N disponibles" hint; Add blocks/greys when the variant is sold out. Falls
  back to product-level stock when a product isn't per-variant tracked. Verified:
  mocked shop (Talla S/M/L, M=0) → M disabled+"Agotado", S auto-selected, 0 overflow;
  dashboard audit + consumer audit green; tsc + build. Deferred: per-variant SKU codes
  + price overrides; low-stock alerts per variant; hide-out-of-stock automation.
- [x] **Header search suggestions → server FTS (2026-07-07).** The global header's
  live-suggestions dropdown filtered only the loaded ~50-business geo slice, so a
  business beyond the radius showed "no results" in the preview even though the
  committed Negocios search (server FTS) would find it. The Negocios suggestion group
  now calls the same `search_businesses` RPC (debounced 220ms, geo-scoped), falling
  back to the client substring filter when empty/offline. Eventos/Comunidad stay
  client-side (small datasets). Fully closes the Handoff "global search with grouped
  live suggestions" rule. Verified: an RPC-intercepted full-catalog business (not in
  the client slice) appears in the dropdown, 0 pageerrors / 0 overflow.
- [x] **Realtime status on Mi cuenta (2026-07-07).** The customer's orders/bookings/
  rentals/tickets/RSVPs now update the instant the owner advances a status — not on
  the next reload. `MyActivityProvider` subscribes (one channel, `user_id`-filtered)
  to the five transaction tables and calls `refresh()` on any change, reusing the
  proven realtime pattern from notifications.tsx. Migration **0060** publishes the
  five tables to `supabase_realtime` (idempotent, guarded like 0007/0053/0054); dual
  customer↔owner RLS (0032) means each side only receives its own rows. Verified:
  tsc + build + consumer audit (/cuenta) green. (Realtime delivery itself needs a live
  Supabase session — can't be exercised in the sandbox; logic mirrors the working
  notifications subscription.)
- [x] **Eventos y boletos → Eventbrite parity (2026-07-07).** Benchmarked vs
  Eventbrite; rebuilt the whole events + ticketing spine. Migration **0061**:
  `event_tiers` (General/VIP/… each its own price, capacity, sold, sales window);
  `event_tickets` gains `tier_id` + `unit_price` snapshot + `used_at`; events gain
  `ends_at`/`cover_url`/`status`; **`buy_event_tickets`** (locks the tier, verifies
  availability + sales window, no overselling); **`event_by_slug`** (event + live
  tiers + organizer + geo); **`checkin_ticket`** (organizer validates a code → used,
  once); triggers keep `event_tiers.sold` + `events.going_count` accurate (the "N
  asisten" counter was dead) and notify the organizer on ticket sale + RSVP.
  - **Consumer:** rich event detail — full date, venue + OSM directions,
    organizer, attendee count, **add-to-calendar (ICS, no dependency)**, native
    share, and real **ticket tiers** (per-tier price + availability + "Agotado" +
    qty steppers, running total). Free events keep RSVP. Success shows the entry
    code. Mi cuenta "Mis boletos" is a ticket stub with the prominent code.
  - **Dashboard:** real **tier editor** (add/edit/delete on `event_tiers`),
    real **check-in** (code-entry → `checkin_ticket` → admitido/ya usado/no válido,
    with a live buyer list), real per-tier "Ventas por nivel" + hero KPIs from real
    tickets; the create wizard now collects a real price + capacity and seeds a real
    "Entrada general" tier (fixing the old always-$85 bug).
  - Verified: tsc + build + RPC-intercepted Playwright (3 tiers, VIP sold-out,
    running total $30, 0 overflow); dashboard + consumer audits green.
  - **Deferred (honest, need external setup / later):** real charging (Stripe —
    tickets are reserved, `unit_price` snapshotted); ticket **email** delivery (SES);
    **QR image + camera scanner** for check-in (code-entry validates now — no QR
    dependency); **map embed** (tiles — directions link works now); per-event **deep
    link** (`?e=slug`); recurring-series generation, saved drafts, promoter/affiliate
    (still fixture in the dashboard); waitlist capture; event notification **kinds**
    added client-side (`ticket_new`/`ticket_status`/`rsvp_new`).
- [x] **Professional event-creation wizard (2026-07-07).** The first wizard was too
  thin (4 fixed types, one flat ticket, free-text date/place, no coordinates). Fully
  rebuilt to Eventbrite standard. Migration **0062**: widened `events.cat` to 13 pro
  categories + a single atomic **`create_event_full`** RPC (event + cover + start/end
  time + real lat/lng + status + an ARRAY of tiers, returns slug).
  - **Step 1 Detalles:** cover-photo upload (`uploadImage` → `cover_url`), name,
    description, **13-category picker** (shared `EVENT_CATS` taxonomy — consumer
    filters read it too).
  - **Step 2 Fecha y lugar:** native **date picker** + **start/end time** pickers,
    online-event toggle, and **geo address autocomplete** (reuses `searchAddress` +
    `censusGeocode` — the same free pipeline as the business flow) capturing real
    **lat/lng** → drives the map/directions + geo radius. Replaces the old free-text
    date + plain location field.
  - **Step 3 Boletos:** **multi-tier builder** — add/remove multiple tiers, each
    name/price/capacity (was a single flat price).
  - **Step 4 Revisar:** live summary + per-step gating (can't advance without the
    essentials) + visibility.
  Verified: tsc + build + a Playwright walkthrough of all 4 steps (category chips,
  cover upload, date + 2 time pickers, address field, tier add 1→2, review) — 0
  overflow at 392px. Deferred: recurring-series generation, saved drafts, promoter/
  affiliate; address autocomplete needs live Photon/Census (sandbox-blocked; mirrors
  the working business address flow); cover persists once Supabase Storage is live.
- [x] **Eventos P0 — correctness & honesty pass (2026-07-07).** After a 10-agent
  ultracode audit of the whole Eventos flow, fixed the correctness bugs and removed
  every fixture that rendered as real. Migration **0063**:
  - **Discovery integrity:** `events_near` now returns only **published + still-upcoming**
    events (was: every event forever, incl. past/draft/cancelled), geo-filtered with
    **`st_dwithin`** (GIST-index-accelerated) + a partial `events_discovery_idx`.
    `event_by_slug` hides **drafts** (cancelled still resolve so the detail page can
    show a "Cancelado" banner). A **BEFORE-INSERT guard** blocks RSVP on non-published
    events at the DB (covers every client path).
  - **Real organizer dashboard:** `owner_events_summary()` RPC (owner-scoped, indexed)
    powers the top KPIs + "Tus totales" rail with **live** boletos/ingresos/asistentes
    (replaced hardcoded 186 / $14.2k / 212). Upcoming vs. **Pasados** split by real
    start time; **Asistentes** roster + **Resumen** 14-day sales sparkline built from
    real `event_tickets` (were fixtures); manage hero badge reflects real lifecycle.
  - **Proper cancel:** `cancel_event()` RPC **soft-cancels** (status→cancelled, tickets
    preserved) and **notifies every ticket holder + RSVP** (new `event_cancelled`
    notification kind) — the old button hard-deleted the row, cascading away all sold
    tickets. Consumer shows a Cancelado/terminado banner and disables buy/RSVP.
  - **No fake controls shipped as final:** the wizard's unbacked **online toggle** +
    **visibility chips** removed; the 5 fake Ajustes toggles replaced with an honest
    "Muy pronto" list; the fixture **Borradores / Recurrentes / Promotores** tabs
    replaced with honest "Muy pronto" placeholders; card/featured/detail "asisten"
    double-count fixed; date-chip year-collapse fixed (keys on real ISO date).
  - Verified: tsc + build clean; `tools/mobile-audit/eventos-p0.js` — 0 overflow at
    392px across consumer list/detail + dashboard tabs + manage/Ajustes.
  - **Deferred here → build in later phases (honest, logged):**
    - [ ] **Online events** — hidden until there's an `online_url` column + a join/link
      flow (a "share the link later" toggle with nowhere to store the link is a broken
      promise). Build with the event-detail phase.
    - [ ] **Event visibility** (public / followers-first / unlisted) — hidden until the
      access-control (RLS scoping + follower graph) exists; today all events are public.
    - [ ] **Saved drafts** — the wizard publishes in one pass; `events.status='draft'`
      exists but there's no save-draft/resume flow yet. Borradores tab is "Muy pronto".
    - [ ] **Recurring series** — auto-repeat generation not built. Tab is "Muy pronto".
    - [ ] **Promoters / affiliates** — promo codes + per-ticket commission need payments
      first. Tab is "Muy pronto"; the desktop tip is future-tense.
    - [ ] **Ajustes controls** — waitlist, ticket transfers, 24h reminders, refunds all
      need payments/notifications; listed as "Muy pronto", not faked.
    - [x] **Deep-link share** — DONE (Phase 1, 2026-07-07): `/eventos/?e=<slug>` opens the
      event detail (mirrors `?b=`), share button builds that URL basePath-correctly. The
      SEO half is the real deferral below (SSR).
- [x] **Eventos Phase 1 — deep-link, atomic order, event search (2026-07-07).** Migration
  **0064** + client wiring. (1) **Shareable deep link** `/eventos/?e=<slug>` (query-param
  pattern — a static `/eventos/[slug]` route is impossible for user-generated events under
  `output:'export'`); refactored the detail from an index into an OBJECT (`detailEv`) so
  deep-linked + server-only search results open correctly; share builds the slug URL from
  the current pathname (basePath-safe); a slug that no longer resolves flashes a message
  instead of failing silently. (2) **Atomic multi-tier purchase** `buy_event_tickets_multi`
  — locks every requested tier in deterministic id order (deadlock-free), validates all
  capacities/windows before issuing any ticket, all-or-nothing (fixes the old per-tier loop
  that could leave a partial order); ONE aggregated organizer notice per order via a
  txn-local flag; success screen lists every code labeled by tier. (3) **Server event
  search** `search_events` (FTS over a widened `search_tsv` trigger doc — title+venue+desc+
  cat — + trigram fuzzy, published+upcoming, geo-scoped, **category/free filters pushed
  into SQL** so a filtered search can't under-return, ranked+paginated); `/eventos` list
  gets debounced server search + a numbered pager (9/page); header dropdown Eventos group
  upgraded to the same server FTS. Retired the narrow 0002 generated `search_vector`.
  (4) **List-page static metadata** (crawler-visible in `out/eventos/index.html`) + a client
  effect that sets `document.title`/`meta description` per open event (browser tab/history +
  Googlebot JS render — honestly NOT social unfurls). Verified: tsc + build (metadata baked)
  + `eventos-p0.js` audit 0 overflow + deep-link renders & strips `?e=`.
  - **Deferred (honest, logged):**
    - [ ] **Per-event crawler + SOCIAL-share SEO needs SSR/ISR (infra decision).** Under
      `output:'export'` every `?e=` link serves the same shell HTML; social scrapers
      (WhatsApp/Facebook/iMessage/X/Slack/Discord) don't run JS → shared links preview the
      generic site card; Googlebot renders JS so the client title/meta are indexable but JS-
      render crawl budget doesn't scale to 1M+ UGC events. Real fix: `@cloudflare/next-on-pages`
      or OpenNext (edge SSR on Workers + `generateMetadata` per event = crawler- AND unfurl-
      safe, keeps Cloudflare) OR Next ISR on a Node host. Decide at the traffic/SEO-matters
      point; coordinate with the hosting item. **Must not claim the client metadata "fixes SEO".**
    - [ ] **Bounded events sitemap** — a build-time `app/sitemap.ts` emitting a BOUNDED
      featured/upcoming set of `/eventos/?e=<slug>` URLs (top N per active city), never 1M
      UGC URLs. Pairs with, doesn't replace, the SSR fix.
    - [ ] **Server-side event search: date filter + load-more** — `search_events` takes
      `in_cat`/`in_free` but not a date param, and the client fetches 60 relevance rows then
      paginates client-side (date chip applies over those 60). Add `in_date` + `in_offset`-
      driven "Cargar más" when event search volume grows so a date-filtered search can't
      under-return past the first 60 matches.
    - [ ] **Comunidad/posts server-FTS parity** — header + Comunidad post suggestions stay
      client-substring; `posts` already have a generated `search_vector` + GIN (0002), so a
      `search_posts` RPC mirroring `search_events` is a small add for full grouped-search parity.
- [x] **Eventos Phase 2 — run-the-event core (2026-07-07).** Designed via a 6-agent workflow
  (5 mappers → synthesis → critique); the QR encoder was pre-verified (`qrcode-generator`, MIT,
  zero-dep) before building. Migration **0065** + a large client pass. Ships, all real:
  - **Individual admissions** — `event_tickets.admitted` (0..qty) + redesigned `checkin_ticket(code,qty)`
    that admits N guests of a group ticket per scan (row-locked, no over-admit; flips `used` only on the
    last guest, so `tier.sold` + the one buyer notice stay correct). Dashboard shows `admitted/qty`, an
    "admit remaining" button + per-buyer +1; Mi cuenta shows a live `2/4 ingresaron`.
  - **Real QR** — `Qr` component renders a genuinely scannable SVG from `qrcode-generator` (structurally
    verified: dark-module count == path rects, quiet zone, `fill:#fff`/`fill:#1E1B2E` in CSS). Attendee
    sees it in Mi cuenta; organizer scans via `BarcodeDetector` (`QrScanner`, Chromium/Android) with a
    clean fallback to the existing code-entry on iOS/Firefox. The fake decorative `QrGrid` is deleted.
  - **Waitlist** — `event_waitlist` + RLS + `join/leave_waitlist` + `notify_waitlist` (organizer blast) +
    a seat-freed trigger (real, dormant until a ticket-refund flow exists). Consumer "Avísame" toggle on
    sold-out tiers (honest: notifies, doesn't hold — first to buy wins); organizer waitlist tab + KPI.
  - **Promo codes** — `event_promo_codes` + owner RLS + `validate_promo` + `buy_event_tickets_multi(…,in_promo)`.
    **Access codes unlock hidden tiers = fully real now**, and this closed a latent hole (the buy RPC never
    checked `tier.visible` — a hidden-tier UUID was buyable by anyone). The tier editor gains an **"Oculto"**
    toggle so organizers can create the hidden tier. %/$ discounts adjust the **snapshotted** total only
    (never "ahorraste $X"; inside the "el cobro se habilita al conectar pagos" frame).
  - **Map embed** — zero-dep OSM `export/embed.html` iframe with a pin (no MapLibre bundle/billing).
  - **Organizer profile** — `event_by_slug` gains `organizer_slug`; `events_by_owner` RPC; tap the organizer
    → a sheet of their other upcoming events (+ optional link to their `/negocios?b=` listing).
  - Verified: tsc + build clean; QR render structurally correct + CSS fills present; `/eventos` + dashboard
    Próximos 0 overflow at 392px.
  - **Deferred (honest, logged):**
    - [ ] **Single-ticket refund UI** — a `refunded` ticket is read-only at check-in today; building refund
      also **activates** the waitlist seat-freed trigger (already keyed on `→refunded`). Natural next step.
    - [ ] **Discount ACTUAL charging** — %/$ only shrink the reserved `unit_price`/`total`; no money until
      Stripe. `max_uses` counts reservations, not paid redemptions; amount-discount per-line cent rounding
      resolves at payments. Access codes are fully real now (a reservation IS the grant).
    - [ ] **No seat held for a notified waitlister** — first to re-buy wins (needs a payments/checkout hold).
    - [ ] **iOS/Firefox camera scan** — no `BarcodeDetector`; camera button hidden, manual code entry is the
      honest fallback. Add jsQR / zxing-wasm for iOS camera parity later.
    - [ ] **On-device QR scan confirmation** — render is structurally correct + battle-tested encoder; a
      real phone-camera scan of a live ticket is the final sign-off (sandbox has no camera).
    - [ ] **OSM public tile rate limits** — `export/embed.html` uses openstreetmap.org's shared tiles; self-host
      or move to MapLibre/MapTiler when event-detail traffic grows.
    - [ ] **Recurring events** — still "Muy pronto" (own phase).
    - [ ] At 1M+ rows, add the `event_tickets.admitted` CHECK as `NOT VALID` then `VALIDATE CONSTRAINT` to
      avoid a long ACCESS EXCLUSIVE lock (the inline CHECK is fine at current volume).
- [x] **Customer self-service cancel (2026-07-07).** "Mi cuenta" already showed the
  customer's real orders/bookings/rentals/tickets (`useMyActivity`); added a
  **Cancelar** action (with confirm) on still-early items (order `new`; booking /
  rental `pending`|`confirmed`) → `myActivity.cancel` updates status to `cancelled`
  under RLS (own rows) + refreshes; the owner sees it in their dashboard and the
  status-change notification fires (migration 0054). Verified: /cuenta renders 0
  pageerrors / 0 overflow (the action itself is auth-gated → needs a live session).
  Deferred: live realtime status on Mi cuenta; owner-notified-on-customer-cancel.
- [x] **Server-side search — scalable FTS (2026-07-07).** Consumer text search was
  a client-side substring match over the ~50-business geo slice (misses matches
  beyond the radius, no ranking). Now real Postgres full-text search (migration
  **0055**): a `businesses.search_tsv` (name + specialty + subcategories
  + category) maintained by a BEFORE INSERT/UPDATE trigger + backfill (a GENERATED
  column can't call `to_tsvector`, which is STABLE not IMMUTABLE — Postgres 42P17),
  with a GIN index, a `businesses_name` trigram index for fuzzy/typo
  matches, and a `search_businesses` RPC (FTS + `websearch_to_tsquery` + `similarity`
  fallback, geo-scoped, category/price/rating filters, ranked by relevance then
  distance, paginated) returning the same shape as `businesses_v2` (client reuses
  `mapBusinessRow`). `Negocios` calls it (debounced 250ms) when there's a query and
  falls back to the client substring filter when empty/offline. Scales to the 1M+
  target (non-negotiable #4). Verified: a query with no fixture substring match
  still returns the server row, 0 pageerrors / 0 overflow. Deferred: Meilisearch
  swap only if FTS volume demands it; search-as-you-type suggestions off the RPC.
- [x] **In-app notifications (2026-07-07).** A per-user feed auto-generated by DB
  triggers on the real events — no manual wiring. Migration **0054**:
  - `notifications` table (user_id, kind, data jsonb, link, read) + RLS (user reads/
    marks their own; only triggers insert) + realtime. Language-neutral rows —
    `lib/notifications.tsx` renders the localized (es/en) title/sub from kind+data,
    so it stays Spanish-first.
  - Triggers fan out on `business_orders` / `business_bookings` / `business_rentals`
    (new → owner, status change → customer) and `business_messages` (→ the
    recipient). This table is also the queue a future Edge Function reads for Web
    Push / email.
  - `NotificationsProvider` (real rows + realtime when signed in; demo fixtures when
    logged out) feeds the bell **badge** (AppHeader + BottomNav "Alertas") and the
    **NotifPanel** (Todas/No-leídas, Hoy/Esta semana/Anteriores, mark read / mark
    all read, tap → deep link). Verified: badge count + grouped list + filters +
    mark-all render in demo; 0 pageerrors / 0 overflow.
  - Deferred: **Web Push (VAPID)** + **email (SES)** delivery — needs a service
    worker + push-subscription table + an Edge Function reading `notifications`
    (+ keys). This in-app layer is the foundation they plug into. Also: notification
    preferences (per-type mute), batching/digest.
- [x] **In-app chat — buyer ↔ seller (2026-07-07).** Real two-way messaging, not
  just an external WhatsApp/SMS link. The owner inbox (`modules/Messages.tsx`,
  business_conversations + business_messages, migration 0029) already existed;
  this adds the CUSTOMER side + realtime (migration **0053**):
  - Customer participation: `business_conversations.customer_user_id` +
    `customer_unread`, one conversation per (business, customer), with RLS letting
    the customer read/update their own conversation and read/send its messages
    (owner policies unchanged — RLS combines with OR). A `start_conversation` RPC
    (SECURITY DEFINER) get-or-creates the conversation by slug; a trigger keeps
    `last_at` + per-side unread fresh on every insert.
  - Realtime: `business_messages` added to the `supabase_realtime` publication;
    both sides subscribe (`lib/chat.tsx` — startConversation / fetchChatMessages /
    sendChatMessage / markConversationRead / subscribeChat / subscribeInbox).
  - Consumer: BizDetail contact sheet → "Enviar mensaje" opens an in-app chat
    panel (auth-gated → /entrar); loads history, sends, live-updates. Dashboard
    Messages now subscribes to inbound messages (live thread + inbox refresh).
  - Deferred: attachments/images in chat, typing indicators, read receipts,
    push/email notification on a new message (see Notifications track), blocking/
    spam controls.
- [x] **Wizard UX across Menú / Servicios / Productos (2026-07-06).** Three
  shared improvements to all three create/edit wizards:
  - **Draft recovery.** The CREATE draft autosaves to `localStorage`
    (`lib/draftStore.ts`, keyed per business+module); if the owner leaves
    mid-creation, reopening the wizard restores it with a "Borrador recuperado"
    toast. Cleared on publish. (Client-only; not synced across devices — that
    would need a server drafts table, deferred.)
  - **Inline "+ Agregar" categoría.** A dashed chip in the wizard's Categoría row
    opens the module's existing category editor as a popup and auto-selects the
    new category on the draft — no need to leave the wizard.
  - **Inline "+ Agregar" etiqueta.** A shared popup (`components/QuickTagSheet.tsx`)
    creates a custom tag, stored in a reusable `tags: string[]` on each config
    (menu/service/product) and selected on the draft. Menú items gained a `tags`
    field (business_items.attrs) shown on the admin card. No migration (tags live
    in the existing config + attrs jsonb). Deferred: custom tags aren't yet shown
    on the PUBLIC listing (dashboard-only for now).
- [x] **Entregas y envíos — OPERATIONAL flow (DoorDash/Instacart-style, 2026-07-06).**
  Turned the fulfillment settings panel into a real ops experience on top of the
  config. Two sides, each with an operational board + setup tabs:
  - **Delivery · Despacho** — a live dispatch board over real `business_orders`
    (channel='delivery'): KPIs + status filter + order cards that advance through
    Nuevo → Aceptar → Preparando → Listo → **Asignar repartidor** (sheet: own
    drivers or external apps) → Recogido → **En camino** (live-tracking mini map +
    ETA) → Entregado, plus cancel. Setup tabs: Zonas, Repartidores (propios · apps
    externas), **Ajustes** (pedido mínimo, tiempo de prep, auto-asignar, live
    tracking).
  - **Shipping · Envíos** — a shipment queue (channel='ship'): Empacar → **Crear
    etiqueta** (sheet: transportista + paquete → tracking #) → Enviado → En
    tránsito → Entregado. Setup: Recoger, Transportistas (propio · USPS/UPS/FedEx),
    **Ajustes** (envío gratis, manejo, paquete, origen).
  - **Setup tabs are full CRUD (2026-07-06).** Zonas and Repartidores are no
    longer read-only: tap any card to edit, "+ Nueva zona" / "+ Agregar repartidor"
    to create, trash + confirm to delete — real editor sheets
    (`modules/FulfillmentEditors.tsx`: `ZoneEditor` edits name es/en · radio · ETA ·
    tarifa es/en · color; `DriverEditor` edits nombre · teléfono · estado · color,
    deriving initials/dot/status labels). Both persist to `businesses.settings`
    (`shipping.delivery.zones` + `drivers` jsonb). Ajustes (delivery + shipping)
    persist via "Guardar ajustes". No migration — flexible jsonb.
  - Per-order operational state persists to `business_orders.fulfillment` jsonb +
    a `ship` channel (migration **0049**); core `status` still writes the existing
    enum so the Pedidos tab keeps working. Best-effort persistence — the board is
    fully interactive in-session even before 0049 is applied; demo is fully
    interactive on sample orders. Setup persists to `businesses.settings`. Deferred:
  - [ ] **External couriers/carriers are stubs.** Uber Direct / DoorDash Drive /
    Rappi (dispatch) and USPS/UPS/FedEx via Shippo/EasyPost (labels+rates) toggle
    and are selectable, but call no real API — the tracking number on "Crear
    etiqueta" is a demo. Wire the real dispatch/label APIs from the **Admin
    dashboard** (founder's plan) in the logistics phase.
  - [ ] **No live GPS / real ETA.** The on-the-way mini map is a styled placeholder
    with a static ETA — real driver GPS + ETA needs the courier API or a driver
    app + MapLibre.
  - [ ] **Consumer doesn't create `ship` orders yet.** The channel + queue exist,
    but the public checkout still only places dinein/pickup/delivery orders — wire
    a "shipping" option at checkout (with the shipping address) when payments land.
  - [ ] **Order has no address column.** Delivery/ship destination is shown from a
    denormalized string in `fulfillment.address`; link real `user_addresses`
    (0014, has PostGIS geo) to the order at checkout for routing/zone assignment.
  - [ ] **Zone fee is NOT calculated by distance yet — DEFERRED to the payments
    phase (founder's call, 2026-07-06).** Today a zone's "Tarifa" (`Gratis +$25`,
    `$5`, `$12`) is descriptive config text, and the consumer cart uses a FIXED
    placeholder delivery fee (`deliveryFee = 2.99` in `BizDetail.tsx`) + a 10%
    service fee — it does not measure distance, match the customer to a zone, or
    read the zone tarifa. The founder decided to leave it as-is until the payment
    method is linked, then decide which pricing options actually work. When we wire
    it: the real design is **server-side PostGIS** (non-negotiable #5, never
    app-side math) — at checkout take the customer's `user_addresses.location`
    (0014, geo ready) + the `businesses.location` point (0001/0002, geo ready),
    compute distance with `ST_Distance`/`ST_DWithin` in an RPC/Edge Function, match
    it to the first zone whose radius covers it → add that zone's fee as a cart
    line; beyond the last zone → offer shipping/pickup. Prereqs still missing: a
    **numeric radius per zone** (today `zone.rad` is free text like "0–1.2 mi", not
    comparable) and the **address-on-order** item above. Model choice (radius bands
    vs. base + per-mile) to be decided with the founder at that time; current build
    uses radius bands, matching the map rings.
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

- [ ] **BizDetail public events / staff / updates — wire real data (2026-07-08 audit).**
  Detail tabs are now gated: catalog tabs (Menú/Tienda/Servicios/Renta) show only
  when the owner published real items, and the fixture-only tabs (Updates/Eventos/
  Equipo) show only when the owner enabled that module in `businesses.modules` — so
  real unconfigured listings no longer render placeholder tacos/staff. But the
  **content** of those three tabs is still the prototype fixtures (DETAIL_EVENTS /
  STAFF / UPDATE_POSTS), even for a configured business (today only
  `hz-barberia-primera`). Before launch, wire real public data: owner events via
  `events_by_owner` (exists), plus new `business_staff`-by-slug and
  `business_updates`-by-slug RPCs, and render real rows instead of fixtures.

- [ ] **Business panel: signed-in user with NO business → uniform empty state
  (2026-07-08 audit, D3).** When a user is signed in but owns no business
  (`admin.active == null && !admin.demo`), the catalog/customer modules (Food,
  Products, Services, Rental, Events, Customers, Staff, Updates) currently fall
  back to their DEMO seed data (e.g. 9 sample dishes, fixture orders), while
  Listing/Photos/Hours/Messages/Payments/Related correctly show a "Conecta tu
  negocio" empty state — so the same panel looks half-real. Before launch, treat
  `active == null && !demo` as the empty state uniformly across all modules
  (show "Conecta tu negocio" instead of demo seeds). Edge state (most users reach
  the panel via onboarding which creates the business first), so deferred.

## Payments — marketplace checkout (Stripe Connect, 2026-07-09)

Real card checkout via **destination charges** is now live for **Pedidos (orders)**
and **Boletos (event tickets)**: the buyer pays `P + 5%`, To'Latino keeps `15% of P`
as the Stripe `application_fee`, and the seller's connected account receives `≈P − 10%`.
Purchases are staged in `pending_purchases`, charged on Stripe's hosted page, and
**fulfilled by `stripe-webhook`** (creates the order / issues the tickets + records
`payments`). Everything below is a deliberate follow-up:

- [ ] **Rotate the exposed `sk_test` key.** The test secret key was pasted in chat
  earlier; it's stored only in the Supabase secret store now, but still rotate it:
  Stripe → Developers → API keys → **Roll** the secret key, then update the
  `STRIPE_SECRET_KEY` secret. (Test mode → no real money, but do it before touching
  live keys.)
- [x] **Bookings + Rentals paid checkout — DONE (0073, 2026-07-09).** Same pattern
  as orders/tickets: `kind = 'booking' | 'rental'`, `fulfill_booking` /
  `fulfill_rental` service RPCs, BizDetail booking/rental buttons route through
  `startMarketplaceCheckout`. Booking charges the **deposit** (when the service has
  a deposit + price); rental charges the **rental fee** (`rentSubtotal`). Residual
  deferrals below.
- [ ] **Rental security-deposit hold at pickup.** Paid rentals charge only the
  rental FEE online; the refundable security deposit is shown as "collected at
  pickup" (not charged/held). For a Turo-grade flow, add a real deposit
  authorization hold (PaymentIntent `capture_method=manual` on the deposit,
  captured on damage / released on return).
- [ ] **Re-price bookings/rentals server-side.** Like orders, the booking deposit /
  rental fee is computed client-side and validated (`> 0`, `< 100000`) server-side,
  not re-derived from the service/rental config. Recompute from
  `service_config`/`rental_config` before real-money launch (tickets are already
  server-priced).
- [ ] **Re-price orders against the catalog before real-money launch.** For orders
  the checkout function totals the **submitted** line items (qty × unit, validated
  `> 0`), not a re-price against the live menu/product prices. A tampered client
  could submit a lower unit price. Tickets are already priced server-side from
  `event_tiers` (safe). Before going live, recompute order line prices from
  `business_items`/`menu_config` server-side (match variant/option modifiers).
- [ ] **Enforce the delivery radius server-side at charge time.** The radius gate
  (migration 0076, 2026-07-11) is enforced in the cart UI: `delivery_range_check`
  (PostGIS) marks the chosen address out-of-range → warning + Pagar disabled. A
  tampered client could still call the checkout function with an out-of-range
  address. When doing the re-price pass above, have the marketplace-checkout
  edge function geocode/verify the submitted delivery address against the same
  RPC and reject out-of-range orders — same "server stays authoritative at
  charge time" pattern.
- [ ] **Percent / amount promo codes on PAID ticket checkout.** Access-code
  unlocked tiers work on the paid path (priced from the DB), but `%`/`$` discount
  codes are **ignored** when paying online (the buyer is charged full tier price +
  5%). Wire discounts into the Stripe amount + `fulfill_event_tickets_multi` promo
  arg so paid checkout honors them.
- [ ] **Delivery logistics + delivery fee.** The old cart's fake `$2.99 Envío` +
  `10% Servicio` rows were removed (the only real fee now is the 5% buyer service
  fee that matches the Stripe charge). Real delivery (driver assignment, delivery
  fee that pays the courier, delivery vs pickup channel picker) is a separate
  feature — build when the delivery phase starts (benchmark: DoorDash/Uber Eats).
- [ ] **Paid tickets require the organizer to have connected Stripe.** Events link
  by `owner_id`; paid-ticket checkout routes payout to the **first connected
  business** owned by that user. If the organizer has no connected business, paid
  tiers show "Venta de boletos no disponible por ahora" (free tiers still issue).
  Consider an explicit per-event payout account + an organizer onboarding nudge.
- [ ] **Connect `account.updated` webhook (optional).** Seller charge-status is
  synced **on demand** (connect-status runs when the Payments tab loads / on return
  from onboarding), which is enough. For instant updates, add a Stripe **Connect**
  webhook endpoint listening to `account.updated` (the handler already exists in
  `stripe-webhook`; a normal account webhook won't receive connected-account events).
- [ ] **Buyer-paid amount vs order total.** `business_orders.total` stores the goods
  subtotal `P` (the seller-facing order value); the buyer actually paid `P + 5%`
  (visible on the Stripe receipt + in `payments.amount`). If "Mi cuenta" should show
  the exact amount charged, read it from `payments` instead of the order total.
- [ ] **Abandoned `pending_purchases` cleanup.** Rows left `pending` (buyer never
  finished Stripe checkout) accumulate. Add a periodic cleanup (e.g. delete/expire
  `pending` older than 24h). Harmless (nothing was charged/fulfilled), just hygiene.

### Ordering flow — design handoff "Ordenar" (2026-07-09)
**Correction (2026-07-10):** the Cliente ordering experience does NOT live in a
standalone `OrderFlow.tsx` full-screen takeover anymore — the founder rejected
that (it replaced the whole business single-page). Online ordering lives inside
`BizDetail.tsx`'s **"Menú" tab**, additive to the existing single-page design.
`OrderFlow.tsx`/`orderIcons.tsx` were deleted. **Cocina + Menú Builder are also
resolved:** Cocina's new capabilities (accept w/ prep time, real driver
assignment, reject w/ reason, payout breakdown) were grafted additively into the
dashboard's existing Pedidos screen (`Customers.tsx`), not a standalone rebuild;
the existing Food module already matches/exceeds the Menú Builder spec (see
PROGRESS.md 2026-07-10 entries for both). Remaining follow-ups:
- [ ] **Fee rates: design uses 10% service + 8.25% tax + 15% commission; we kept
  the founder's tested economics (5% buyer service fee, 15% platform commission,
  no separate tax line).** The handoff README says "ajustar tasas a las reales del
  negocio", so the STRUCTURE is faithful and the RATES are the real ones. If the
  founder wants the literal 10% + tax, wire real tax collection/remittance first
  (per-jurisdiction) — do NOT charge tax without remittance set up.
- [ ] **AMIGO10 promo** is wired end-to-end (client summary + server discount,
  platform-absorbed). Make promo codes real/configurable per business later.
- [ ] **Payment method list is display-only** (Visa/MC/Apple Pay chips) — the real
  charge always goes through Stripe Checkout on "Realizar pedido". Wire saved
  cards / Payment Element when moving off Stripe-hosted Checkout.

### Menú tab / carrito — add-to-cart stepper for items WITH addons (2026-07-10)
- [x] **Menú tab card stepper — DONE (2026-07-10, `BizDetail.tsx`).** The
  founder asked for this sooner than originally deferred. Built exactly as
  specified: tapping `+` on a customizable item that already has a line in the
  cart opens **"¿Lo deseas igual o quieres cambiar algo?"** (shows the last
  selection; *Sí, igual* increments that line; *Cambiar algo* opens the item
  sheet fresh — default selections, not pre-filled — as a new distinct line).
  Tapping `−`/trash with **2+ different customized lines** of that item opens
  **"¿Cuál deseas eliminar?"**, listing each variant (qty × its addon summary
  + note) so the customer picks by reading the difference, not "line 1/2". No
  prompt when there's only one line (direct inc/dec, as before). Verified live
  (a@a.com, El Sabor, Mangú con los tres golpes): same→qty 2/1 line, cambiar→
  qty 3/2 lines (Aguacate + Queso frito), remove-picker showed both and removed
  the picked one, back-to-1-line reverted to direct decrement. `tools/mobile-
  audit/addon-variant-prompts.js`. Resolved the 3 open design questions inline:
  small centered `Overlay` dialogs (not a full sheet) for the binary choice;
  "difference" shown as each variant's full addon summary side-by-side (not a
  word-level diff — simple and sufficient, revisit only if items commonly carry
  5+ addons and summaries get long); no default-select on removal, always an
  explicit pick.
- [x] **Cart sheet per-line stepper — DONE (2026-07-11, `BizDetail.tsx`).** The
  founder asked to extend the same flow to the cart (and to the customize
  sheet's own stepper). Tapping `+` on a **customized** cart line now opens the
  same **"¿Lo deseas igual o quieres cambiar algo?"** dialog: *Sí, igual* bumps
  that exact line (`incLine(key)`); *Cambiar algo* opens the item sheet for a
  new variant (`openItem`). Simple (no-addon) lines increment directly. Also
  added to the **customize-sheet footer stepper**: `+` on an addon item prompts;
  *Cambiar algo* adds the current combo and resets the sheet in place so you can
  build another variant without leaving. Reused the existing `addPrompt` overlay
  (extended with an optional `key` to target a specific cart line). Fixed a real
  stacking bug found while building: overlays all shared `z-[70]`, so the cart
  (later in DOM) hid a prompt opened from within it — added an optional `zIndex`
  prop to the shared `<Overlay>` (sheet=80, its prompt=90, add/remove
  prompts=80). Verified live: `tools/mobile-audit/stepper-igual-cambiar.js`.
  Still open only if/when the cart becomes its OWN dedicated route (`/carrito`):
  the logic will carry over unchanged since it's all in shared helpers.

### Food delivery (2026-07-09) — polish deferrals
- [ ] **Dish photos.** The 150-dish menu uses the design-system striped tiles;
  the owner can upload a real photo per dish from the Food module (imageUrl is
  wired) — content task, not code.
- [ ] **Driver GPS / live map.** The "En camino" mini-map is illustrative; real
  courier GPS tracking needs a driver app (post-launch phase).
- [ ] **Owner-set ETA.** Advancing to "En camino" stamps a fixed 10-min ETA;
  let the owner pick the ETA when dispatching (small UI).
- [ ] **Double notification at delivery.** Marking delivered fires dispatch
  `delivered` + status `completed` (two client pushes ~1s apart). Debounce in
  the trigger later.
- [ ] **Tips on pickup orders.** Tips are delivery-only today; DoorDash also
  allows pickup tips — add if wanted.

---

_Last updated: 2026-07-09. Add to this file as new deferrals appear._
