# To'Latino — Project Memory

> This file is the single source of truth for the project's vision, constraints,
> and standards. Read it before doing any work. Every decision must respect the
> **non-negotiables** below. When a rule here conflicts with a request, surface
> the conflict instead of silently breaking the rule.
>
> **Resuming a session? Read `docs/PROGRESS.md` first** — it's the live "where we
> are / how to resume" handoff (current state, deploy flow, what's built, the
> pending DB-migration blocker, and next steps). Then `docs/LAUNCH-CHECKLIST.md`
> for deferred decisions.

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
6. **Paste anything the founder must run — always, in the chat.** Whenever a task
   produces something the founder has to run or paste somewhere by hand (SQL
   migrations, seed scripts, one-off queries, `.env` values, shell/CLI commands,
   dashboard/config snippets, Supabase settings to toggle), **show the full,
   copy-pasteable content directly in the chat reply** — never just reference a
   file path or say "it's in the repo". The founder works by copy-paste (no CLI
   assumed). If it's long, still paste it in full; don't summarize or truncate.
7. **Record every deferred/"do-at-launch/at-scale" decision in
   `docs/LAUNCH-CHECKLIST.md`.** The founder can't hold these in his head. Any
   time a task yields a "we'll do X later / before public launch / when it's
   real / at scale" note (sandbox→prod gaps, scale migrations, moderation/
   security, stubbed features, infra swaps), **append it to that file** — don't
   just say it in chat. Read it before launch-related work; check items off only
   when truly done.
8. **Benchmark against the best in class — build to compete and win.** This is how
   the founder wants the whole project built. Before building or revising ANY
   section or feature, first identify the successful, established apps that own that
   category and study what makes them work, then build the To'Latino version to
   **match or beat** them — professional, modern, and **feature-complete**. Reference
   points per surface (compare to these every time; add others as needed):
   **Comunidad → Nextdoor / Facebook Groups; Negocios + reseñas → Yelp / Google
   Business; comida y delivery → DoorDash / Uber Eats / Instacart; tienda / productos
   + variantes → Amazon / Shopify; servicios y reservas → Fresha / OpenTable / Booksy;
   renta → Turo / Airbnb; eventos y boletos → Eventbrite; transporte → Uber / Lyft /
   Busbud; bienes raíces → Zillow; dealer de carros → CarGurus / Facebook Marketplace;
   trabajos → Indeed; mensajería → WhatsApp; búsqueda / descubrimiento → Google.**
   Why the bar exists (founder): a flow that doesn't inspire **confianza** gives no
   customer a reason to switch from the app they already use — trust IS the product. The bar for
   every task is **"would this compete with the leader in its category?"** — every
   feature a serious competitor has, done **fully** (no stubs, no fake/broken states,
   no "good enough" placeholder shipped as final). If a feature genuinely can't be
   finished now (needs the founder's external setup, e.g. payments/push/maps), say so
   honestly and log it in `docs/LAUNCH-CHECKLIST.md` — never disguise an incomplete
   feature as done. This does NOT override the design system (#2) or the paste/scale/
   Spanish rules — compete **within** those constraints, using the Handoff's look.

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

**Founder's quick guide (how to spend less per task):**
- **Default the session to a Sonnet-tier model** (`/model` → Sonnet). Don't
  default to the top tier "to avoid redoing work" — most rework this project has
  hit came from **scope violations** (redesigning an approved screen) and
  **missing verification**, not raw model capability; both are now hard rules
  (skill §8–§9: additive-only UI, mandatory real-browser screenshot proof) that
  bind every model tier equally. **Escalate by cost-of-being-wrong, not task
  size:** go to the top tier specifically for payments/Stripe logic, RLS/security
  policies, data-model/migrations, or a bug Sonnet already failed once on — being
  wrong there is expensive or hard to spot by eye, so the premium is cheap
  insurance. Everything else (UI, features, most bugs) stays on Sonnet; the
  verification harness catches issues before they ship regardless of tier. Try
  bumping Sonnet's Effort to `high` on one hard task before jumping models — it's
  often enough and costs far less. Switch back to Sonnet after any escalation.
- **Effort is a SEPARATE dial from the model** (`/effort` → low/medium/high/
  xhigh/max) — it controls how much the model reasons before acting, on top of
  whatever model is active, and higher effort costs several times more per turn
  regardless of model. **Default to medium** for everyday feature work; reserve
  **high** for security-sensitive code (payments/RLS) or a bug medium couldn't
  crack; avoid **xhigh/max** except the hardest architecture problems — rarely
  needed for this app. Model tier × effort level compound, so an expensive model
  AND high effort together is the fastest way to burn a week's credits on one
  session.
- **One task per message.** A screenshot + one line ("aquí, el botón X no hace Y")
  beats a long explanation — cheaper and clearer.
- **Don't re-explain the project or the design** — the skill + `docs/PROGRESS.md`
  carry it between sessions. If Claude seems lost, say "lee PROGRESS.md".
- **"ultracode" = heavy multi-agent mode, many times the cost.** Use it only for
  big audits/verifications, not day-to-day fixes.
- **For new UI, ask for a preview first:** "hazme un mock y mándame screenshot
  antes de conectar datos" — approving a screenshot is far cheaper than rebuilding
  a wired screen twice. No external design tool needed for derivable screens;
  Claude must offer the mock → screenshot → approval → wire loop (skill §8).

## Design system — in the repo (source of truth)

**Handoff v2 (2026-07-02, "Plataforma multicanal") supersedes the first design
system.** The founder scrapped the first app and delivered a new handoff from
Claude's design tool. It is committed under **`docs/design-system/`**. Read it
before building any UI; never improvise. Key files:
- **`docs/design-system/HANDOFF.md`** — the full spec: every screen, design
  tokens (colors/type/radii/shadows/spacing), interactions, state, responsive
  behavior, and how to map the "Studio" prototype to the real app. **This is
  the design half of project memory;** this root `CLAUDE.md` is the master.
- **`docs/design-system/PROMPT.md`** — the founder's build brief for the handoff.
- **`docs/design-system/reference/dc/`** — high-fidelity interactive HTML
  prototypes (look/copy/interaction source of truth; do NOT copy their
  inline-styled HTML). `To'Latino Studio.dc.html` is the **master file**
  (landing + client app + embedded business panel, 3 synced device frames —
  the multi-device canvas itself is review scaffolding, discard it). The
  business panel lives in `To'Latino Business Dashboard[.Mobile].dc.html` and
  the `ToLatino *Module*.dc.html` sub-modules.

### Product architecture (from Handoff v2)
One responsive app, three surfaces:
1. **Bienvenida** → public landing (`/`).
2. **Cliente** → the app with a **horizontal 7-category bar** under the header:
   **Comunidad** (`/comunidad`, Nextdoor-style — the app's home), **Negocios**
   (`/negocios`, Yelp-style), **Eventos** (`/eventos`, with tickets), plus
   **Transporte, Bienes Raíces, Dealer de carros, Trabajos** in "Muy pronto"
   (elegant placeholder + waitlist form) for a second phase.
3. **Negocio** → business admin panel (`/negocio/*`), sidebar/drawer varying by
   plan (Free/Verified/Premium) and rubro (Restaurante/Belleza/Auto/Tienda/Renta).

### Design hard-rules (from Handoff v2 — enforce on every UI task)
- **Spanish-first:** every user-facing string is `L('es','en')` (global ES/EN
  toggle). Never hardcode one language.
- **Tokens only:** primary `#7B61FF` (as `primary` token), ink `#1E1B2E`, amber
  diamond `#F4B740`, app bg `#F4F2F9`; Plus Jakarta Sans (400–800). Consume
  named Tailwind tokens — never raw hex in components. Full table in
  `HANDOFF.md` → Design Tokens.
- **Mobile-first, pixel-perfect** (≤767px = 1 column, own search row, **bottom
  nav: Comunidad · Negocios · ＋ FAB (Publicar) · Eventos · Alertas**); tablet
  768–1023 (2 cols, no bottom bar); desktop ≥1024 (multi-column, sidebar
  filters). Touch targets ≥44px.
- **Geo by city:** city selector (modal / bottom sheet on mobile) with "use my
  location" + searchable list; the chosen city propagates app-wide.
- **Global search** with grouped live suggestions (Negocios/Eventos/Comunidad)
  and real filtering per section.
- **Real interaction state:** posting adds to the feed; ♥ save, "Voy", follow,
  recommend, notifications read/unread, business onboarding → panel.
- **Imagery = striped category-gradient placeholders**
  (`repeating-linear-gradient(135deg, A 0 11px, B 11px 22px)`) until real
  photos exist. Logo = CSS wordmark `To'`(ink)+`Latino`(purple)+amber diamond.
- **Business card variant:** the handoff offers A·Lista / B·Galería / C·Detalle;
  prototype default is **A (Lista)** — build A unless the founder picks another.

## Database & migrations (Supabase)

- Every database change is a **versioned SQL migration** in
  `supabase/migrations/NNNN_*.sql` (seed data in `supabase/seed.sql`). Keep them
  **idempotent** (`create … if not exists`, `on conflict`, `drop policy if
  exists`) so they can be re-run safely.
- **ALWAYS paste the full migration SQL into the chat** whenever a migration is
  created or required — the founder runs it by pasting into the **Supabase SQL
  Editor** (no CLI assumed). Don't just reference the file; show the SQL. This is
  the specific case of the global **"paste anything the founder must run" rule**
  — see non-negotiable #6.
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
- **Competitive bar met (#8):** benchmarked against the category leader; matches or
  beats it; feature-complete with no stubbed/fake/broken states shipped as final
  (anything unfinished is honestly logged in `docs/LAUNCH-CHECKLIST.md`).
- Mobile layout correct first; responsive up to tablet/desktop without breaking it.
- Uses only design-system tokens/components.
- Spanish copy present (English secondary); no hardcoded user-facing English.
- Considers scale (indexed queries, pagination, no N+1, caching where it matters).
- No unnecessary paid dependency introduced.
- Verified end-to-end (tsc + build + the relevant mobile audit / intercept), not just
  written.
