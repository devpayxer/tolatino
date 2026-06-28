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
   the cheapest viable option.
4. **Scale target: 1M+ businesses / listings / users per month.** Make data-model,
   indexing, and architecture choices that hold at that scale (geo queries,
   search, pagination, caching) from day one — without over-engineering.
5. **Spanish-first.** Default language is Spanish (es-US); English (en-US) is
   secondary. All copy, errors, and content support i18n from the start.

## Tech stack (the agreed base — keep in sync)

> Decisions are made for a solo, bootstrapped founder building with AI assistance.
> TypeScript end-to-end to share types and reduce context-switching.

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm + Turborepo** | One repo, shared `packages/ui` + `packages/types` |
| Frontend | **Next.js (App Router) as a mobile-first PWA**, Tailwind CSS | One codebase → mobile/tablet/desktop; installable; **SEO = free customer acquisition** for listings (critical, bootstrapped). Wrap with **Capacitor** later for App Store / Play Store reusing the same code. |
| UI components | **`packages/ui`** implementing the design-system tokens | Single source; every app consumes it |
| Backend | **NestJS (TypeScript)** | Structured, scalable, testable; same language as web |
| Database | **PostgreSQL + PostGIS** | Free, scales to millions; PostGIS does geo/radius/"near me" natively — replaces paid geo APIs |
| Search | **Postgres full-text search** now → **Meilisearch** (self-hosted, OSS) at scale | Avoids paid Algolia |
| Maps | **MapLibre GL** + **OpenStreetMap** tiles | No Google Maps per-request billing |
| Geocoding / address autocomplete | **Nominatim / Photon** (OSM, self-hostable) | Address→coords + city autocomplete without Google billing |
| Cache / queues / jobs | **Redis** + **BullMQ** | Sessions, caching, background jobs, notifications |
| Realtime | **Socket.IO** (self-hosted) | Chat, live order/booking updates |
| Object storage (images) | **Cloudflare R2** (cheap, no egress) or self-hosted **MinIO** | Listing photos |
| Auth | **Own JWT + refresh tokens** (httpOnly cookies), OTP flows | Built from scratch, no paid auth vendor |
| Push notifications | **Web Push (VAPID)** for PWA; **FCM** (free) for native later | No paid push vendor |
| Hosting | **Hetzner VPS + Docker Compose** behind **Cloudflare** (free CDN/DDoS/cache) | Extreme value vs. AWS/Vercel at scale; vertical-scale first |
| i18n | **next-intl**, Spanish-first | es-US default, en-US secondary |

### Allowed external costs (only when unavoidable)
- **OTP / SMS:** carrier SMS always costs money. Order of preference:
  **email OTP (free)** → **WhatsApp OTP** (audience fits — Latinos use WhatsApp
  heavily) → cheapest SMS gateway only if required.
- **Transactional email:** self-hosting deliverability is hard. Start with
  **Amazon SES** (~$0.10 / 1,000 emails — cheapest at scale); consider self-hosted
  **Postal** later. This is the one "necessary external" we accept early.
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

The live implementation lives in **`apps/web`**:
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
