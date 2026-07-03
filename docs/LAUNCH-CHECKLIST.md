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
  so a client only subscribes to nearby events. Code is commented with this note
  in `apps/web/src/lib/interactions.tsx` and `screens/Comunidad.tsx`.
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
  GPS pin), business **photos**, amenities/hours capture, editing/deleting your
  own listing from the UI (RLS policies already exist), and the paid tiers
  (verified/premium). **Feature tags** (`businesses.features`, migration `0016`)
  now power the dynamic per-category Negocios filter and `create_business` accepts
  them, but the **publish form doesn't collect them yet** — the owner can't tick
  "Características" (delivery, full bar, licensed…) when creating a listing. Wire a
  feature-picker into `PublishModal` (options from `FEATURES_COMMON` +
  `FEATURES_BY_CAT[cat]`) so new listings are filterable.
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

---

_Last updated: 2026-07-03. Add to this file as new deferrals appear._
