# To'Latino — Project Memory

> This file is the single source of truth for the project's vision, constraints,
> and standards. Read it before doing any work. Every decision must respect the
> **non-negotiables** below. When a rule here conflicts with a request, surface
> the conflict instead of silently breaking the rule.

## What we're building

**To'Latino** is an all-in-one local **super-app for Latinos living in the USA** —
think **GoJek (Asia)** adapted to the US Latino community. It combines, in one
native-feeling, Spanish-first platform, what today is fragmented across DoorDash
(food/delivery), Amazon (products), Uber (rides/services), Yelp (discovery/reviews),
and Nextdoor (local community).

**Who it serves:** Latino entrepreneurs of *every* level — brand new, hobbyist,
part-time (e.g. "3 days a week"), and established businesses — so they can
**publish their business or activity** and **promote / sell products, services,
and bookings** to nearby local users, in their own language and culture.

**Core loops:**
- **Sellers:** onboard → create a listing (product / service / booking) → get
  discovered locally → transact → build reputation.
- **Buyers:** discover nearby (geo + search) → browse → order / book / contact →
  review → return.

## Non-negotiables (apply to EVERY task)

1. **Mobile-first, always.** ~99% of users are on mobile. Design, build, and test
   for mobile first; derive tablet/desktop responsively from the mobile concept
   **without losing the core mobile experience**. Never design desktop-first.
2. **Follow the established design system — never invent UI.** All visual/UX work
   must come from the **To'Latino design system** (created in Claude's design
   tool, with a Handoff). Do not improvise colors, type, spacing, components, or
   layouts. If something isn't in the design system, ask before creating it.
3. **Build from scratch; avoid paid external services unless truly necessary.**
   The founder is bootstrapped (no investor). Prefer free / open-source /
   self-hostable building blocks. When an external paid service is genuinely
   unavoidable (see "Allowed external costs"), call it out explicitly and choose
   the cheapest viable option. **One deliberate, documented exception is in
   place for launch velocity — Supabase + Cloudflare Pages (see "Architecture
   decision" below) — both portable, with a migration path to self-hosted.**
   Beyond the sanctioned services list, still avoid new paid dependencies and
   surface conflicts.
4. **Scale target: 1M+ businesses / listings / users per month.** Make data-model,
   indexing, and architecture choices that hold at that scale (geo queries,
   search, pagination, caching) from day one — without over-engineering.
5. **Spanish-first.** Default language is Spanish (es-US); English (en-US) is
   secondary. All copy, errors, and content support i18n from the start.

## Tech stack (the agreed base — keep in sync)

> Decisions are for a solo, bootstrapped founder building with AI assistance.
> TypeScript end-to-end. **Strategy (decided 2026-06-28): ship fast on a managed
> Postgres backend (Supabase) now, with a clean migration path to self-hosted at
> scale.** See "Architecture decision" below.

| Layer | MVP (now) | At scale (migration target) | Why |
|---|---|---|---|
| Monorepo | **pnpm + Turborepo** | same | Shared `packages/ui` + `packages/types` |
| Frontend | **Next.js (App Router) mobile-first PWA**, Tailwind | same | One codebase → mobile/tablet/desktop; **SEO = free acquisition**; Capacitor later for app stores |
| Frontend host | **Cloudflare Pages** | same (or self-host behind Cloudflare) | Free, cheap bandwidth at scale; fits bootstrapped budget |
| UI components | **`packages/ui`** (design-system tokens) | same | Single source; every app consumes it |
| Database + geo | **Supabase** (managed **Postgres + PostGIS**) | **self-hosted Postgres + PostGIS** on Hetzner | Same DB either way → migrate via `pg_dump`. PostGIS does "near me"/radius natively |
| Auth + OTP | **Supabase Auth** (email/phone OTP, RLS) | keep Supabase Auth, or own JWT if self-hosting | Skips building auth from scratch; RLS enforces access at the DB |
| Object storage (images) | **Supabase Storage** (S3-compatible) | **Cloudflare R2** / self-hosted MinIO | Cheap, portable |
| Realtime | **Supabase Realtime** | Socket.IO (self-hosted) if needed | Chat, live order/booking updates |
| Backend logic | **Supabase** auto REST + **RLS** + **Edge Functions**; add **NestJS** when business logic grows | **NestJS** on Hetzner against the same Postgres | Start with managed APIs; introduce a real backend as complexity grows |
| Search | **Postgres full-text search** | **Meilisearch** (self-hosted, OSS) | Works on Supabase Postgres; avoids paid Algolia |
| Maps | **MapLibre GL + OpenStreetMap** tiles | same | No Google Maps per-request billing |
| Geocoding / autocomplete | **Nominatim / Photon** (OSM) | self-host at scale | Address→coords + city autocomplete without Google billing |
| Cache / jobs | defer (Edge Functions early) | **Redis + BullMQ** | Add when caching / background jobs matter |
| Push notifications | **Web Push (VAPID)** for PWA | + **FCM** (free) for native later | No paid push vendor |
| i18n | **next-intl**, Spanish-first | same | es-US default, en-US secondary |

### Architecture decision (2026-06-28): Supabase-first, self-host-ready
Chosen by the founder (option **A + Cloudflare Pages**). Rationale: a bootstrapped
solo founder needs **speed to launch and validate** more than infra purity at a
scale (1M+/mo) they don't have yet. Supabase **is** managed Postgres + PostGIS —
the exact database we wanted — so:
- **Scale-readiness lives in the data model** (indexes, PostGIS, pagination), which
  is identical on Supabase or self-hosted. Design every table for scale regardless
  of where Postgres runs.
- **Low lock-in:** Supabase is standard Postgres → migrating to a self-hosted
  Hetzner box later is a `pg_dump`/restore, not a rewrite. Don't use proprietary
  features that can't be reproduced on vanilla Postgres without a wrapper.
- **Migration trigger:** when Supabase/Cloudflare bills approach what a Hetzner box
  + ops time would cost (revisit at real traffic), move the DB to self-hosted
  Postgres + NestJS; the frontend and schema stay the same.

### Allowed external / managed services (sanctioned)
Deliberate, documented exceptions to "build from scratch" — chosen for velocity,
all portable:
- **Supabase** (DB, auth, storage, realtime) — managed Postgres; migrate to
  self-hosted at scale.
- **Cloudflare Pages** — frontend hosting (free tier).
- **OTP / SMS:** carrier SMS always costs money. Order of preference:
  **email OTP (free)** → **WhatsApp OTP** (audience fits — Latinos use WhatsApp
  heavily) → cheapest SMS gateway only if required. (Supabase Auth covers email/
  phone OTP delivery wiring.)
- **Transactional email:** self-hosting deliverability is hard. Start with
  **Amazon SES** (~$0.10 / 1,000 emails — cheapest at scale); consider self-hosted
  **Postal** later.
- **Payments:** Stripe/etc. take a per-transaction cut by nature — evaluate when
  we reach the transaction phase; not needed for MVP discovery/listings.

## AI model strategy (best results per credit)

Use Claude Code with a **tiered model approach** + prompt caching:

- **Claude Opus 4.8 (`claude-opus-4-8`)** — architecture, data modeling, the
  design-system foundation, hard debugging, security-sensitive code. Highest
  quality where correctness compounds.
- **Claude Sonnet 4.6 (`claude-sonnet-4-6`)** — default for everyday feature work
  and most coding (best quality/cost balance).
- **Claude Haiku 4.5 (`claude-haiku-4-5`)** — mechanical/boilerplate, simple
  refactors, high-volume cheap tasks.

**Credit efficiency:** this `CLAUDE.md` + the `tolatino-standards` skill are loaded
once and **prompt-cached** (cached reads ≈ 0.1× input cost), so keeping standards
here — and giving each task a tight, well-scoped prompt — minimizes repeated token
spend. Don't re-explain the project per task; point at this file.

## Design system — in the repo (source of truth)

The design system was created in **Claude's design tool** (Mobile-First) with a
**Handoff** and is now committed under **`docs/design-system/`**. Read it before
building any UI; never improvise. Key files:
- **`docs/design-system/DESIGN_RULES.md`** — the binding design rules (Spanish-first,
  tokens-only, primitives, tier/category, navigation). This is the design half of
  project memory; this root `CLAUDE.md` is the master.
- **`docs/design-system/DESIGN_SYSTEM.md`** — full token + component + layout +
  navigation spec.
- **`docs/design-system/NEW_SCREEN_RECIPE.md`** — how to build a new screen on-brand
  + the pre-finish checklist. **Follow it for every new screen.**
- **`docs/design-system/reference/screenshots/`** — the visual target for every
  screen (build to match density, weight, voice).
- **`docs/design-system/reference/dc/`** — original interactive HTML prototypes
  (look/copy/interaction source of truth; do NOT copy their inline-styled HTML).
  Covers consumer screens + the business dashboard (mobile & desktop) and all
  9 business modules (Food, Services, Products, Events, Rental, Updates,
  Customers, Staff, Billing).
- **`docs/design-system/CORRECTION_PROMPT.md`** — course-correction checklist to
  run if a rendered screen drifts from the reference (type/color/radius/spacing/
  layout/primitives/copy/imagery audit). Use it before finishing any UI task.

### Reset (2026-07-02): first `apps/web` implementation scrapped
The founder decided to **start the app over**. The first `apps/web`
implementation (consumer tabs, business side, Supabase wiring, GitHub Pages
deploy workflow) was **removed from the repo**; the design system docs, this
memory file, the `tolatino-standards` skill, and `supabase/` (the schema
already applied to the live Supabase project) were kept. The next
implementation starts from a fresh prompt but must still recreate this
structure in **`apps/web`**:
- Tokens → `apps/web/tailwind.config.ts` (use named tokens: `bg-primary`,
  `text-ink`, `rounded-card`, `border-hair` — never raw hex).
- Primitives → `apps/web/src/components/` (`Wordmark`, `PhoneFrame`, `Card`,
  `StatTile`, `StatusPill`, buttons, `SubView`, `Sheet`, `EmptyState`,
  `BottomTabs`, `categoryTile`). Compose from these; don't fork their markup.
- Bilingual helper → `apps/web/src/lib/i18n.tsx` (`L('es','en')`, Spanish-first).
- Tier/category context → `apps/web/src/lib/biz.tsx` (`useBiz`, `TIER_CAPS`,
  16 categories). Extract to `packages/ui` / `packages/types` when a second app
  needs them.

### Design hard-rules (from the handoff — enforce on every UI task)
- **Spanish-first:** every user-facing string is `L('es','en')`. Never hardcode one language.
- **Tokens & primitives only:** no raw hex, no off-scale radii; compose from `src/components/`.
- **Mobile 392px is the source of truth** (`PhoneFrame`); reflow to desktop per
  `DESIGN_SYSTEM.md §6` (top nav / sidebar, no bottom tabs).
- **Tier + category aware** on business surfaces; locked features = PRO badge +
  upsell `Sheet`, never a dead end.
- **Imagery = `categoryTile()` gradient placeholders**, not illustrations. No emoji
  except sanctioned brand copy (the "Hola, Ana 👋" greeting).
- **Sub-flows use the sub-view stack pattern** (`DESIGN_SYSTEM.md §7`); flows end in
  a confirmation that returns to the parent.

### Product decision (2026-06-28): Inicio = discovery Home
The **Inicio** tab is the **discovery-first Home** (prominent search → `Buscar`,
category shortcuts, and live "Cerca de ti" businesses) — **not** the stat-tile
account dashboard shown in `reference/screenshots/consumer-dashboard-01-inicio.png`
("Panel del usuario"). A discovery app must lead with search. The account /
activity summary (orders, bookings, rewards, spend) belongs on **Perfil** (to be
added there). Don't "correct" Inicio back to the stat-tile dashboard per that one
reference — this deviation is intentional.

## Database & migrations (Supabase)

- Every database change is a **versioned SQL migration** in
  `supabase/migrations/NNNN_*.sql` (seed data in `supabase/seed.sql`). Keep them
  **idempotent** (`create … if not exists`, `on conflict`, `drop policy if
  exists`) so they can be re-run safely.
- **ALWAYS paste the full migration SQL into the chat** whenever a migration is
  created or required — the founder runs it by pasting into the **Supabase SQL
  Editor** (no CLI assumed). Don't just reference the file; show the SQL.
- Design every table for the 1M+ scale target: PostGIS `geography` + GIST index
  for geo, GIN (full-text / trigram) for search, btree on filtered columns,
  pagination, and **RLS** (public read where appropriate; writes locked down).
- Stay portable (vanilla Postgres) so the self-hosted migration later is a
  `pg_dump`/restore — avoid Supabase-proprietary features without a fallback.

## Repo layout (target)

```
apps/
  web/        # Next.js PWA (mobile-first)
  api/        # NestJS backend
packages/
  ui/         # Design-system components (tokens → components)
  types/      # Shared TypeScript types / DTOs
  config/     # Shared lint/ts/tailwind config
docs/
  design-system/   # Tokens, component specs, handoff, mockups
infra/        # Docker Compose, deployment
```

## Definition of done (per feature)
- Mobile layout correct first; responsive up to tablet/desktop without breaking it.
- Uses only design-system tokens/components.
- Spanish copy present (English secondary); no hardcoded user-facing English.
- Considers scale (indexed queries, pagination, no N+1, caching where it matters).
- No unnecessary paid dependency introduced.
