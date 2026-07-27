---
name: tolatino-standards
description: >-
  Enforces To'Latino's core build standards on every task. Use whenever
  creating, modifying, or reviewing UI, screens, components, layouts, styling,
  features, or architecture for the To'Latino super-app. Guarantees mobile-first
  design, strict adherence to the established design system (never improvised
  UI), Spanish-first copy, build-from-scratch / avoid-paid-services discipline,
  1M+ scale-aware choices, and benchmarking every section against the category
  leader to ship a feature-complete competitor (no stubbed/fake states as final).
---

# To'Latino Build Standards

Apply these rules to **every** piece of work on this repo. They encode the
project's non-negotiables. If a request conflicts with a rule, **stop and flag
it** rather than breaking the rule silently.

## 1. Mobile-first (hard rule)
- Start from the **mobile** layout/behavior. ~99% of users are on mobile.
- Derive tablet/desktop **responsively** from the mobile concept — never the
  reverse, and never at the cost of the mobile experience.
- Default to a single-column, thumb-reachable layout; bottom tab navigation;
  touch targets ≥ 44px; sheets/drawers over hover menus.
- Test the mobile viewport first. Desktop is an enhancement, not the baseline.

## 2. Use the design system — never invent UI
- All visuals come from the **To'Latino design system** (Claude design tool +
  Handoff), stored under `docs/design-system/` and implemented in
  `packages/ui`.
- Consume **design tokens** (color, type, spacing, radius, shadow, breakpoints)
  and existing **components** — do not hardcode hex values, font sizes, or
  bespoke spacing, and do not improvise new components or layouts.
- If a needed token/component/screen isn't in the design system, **ask the
  founder** before creating anything. Propose, get the design, then build.
- Match the established look exactly; generate responsive desktop variants that
  preserve the mobile design concept.
- **Checkout propio SIEMPRE (founder rule, 2026-07-15):** every online charge —
  orders, bookings, rentals, tickets, anything future — pays inside To'Latino's
  OWN branded sheet (`CheckoutSheet` + Stripe Payment Element via
  `startMarketplacePayment` → PaymentIntent `clientSecret`). **NEVER redirect
  the buyer to Stripe's hosted Checkout page** (`startMarketplaceCheckout` +
  `window.location.href = url` is the forbidden pattern). Stripe still renders
  the secure card iframes inside our sheet (PCI stays minimal), but the look,
  copy and flow are To'Latino's.
- **Vender vs Catálogo — MODELO CANÓNICO (founder rule, 2026-07-15).** Idéntico
  en TODA superficie transaccional (Menú, Tienda, Servicios, Renta, Eventos).
  No re-inventar por sección — se decidió con el Menú:
  1. El dueño elige a **nivel negocio** (por módulo, NUNCA por ítem): **Solo
     mostrar** (catálogo, sin comprar) **o Vender**.
  2. Si vende, cómo se cobra sale de **un solo hecho**: ¿tiene Stripe Connect
     (`acceptsPayments`/`payOnline`)? **Sí → paga en línea** en nuestra hoja;
     **No → paga en el establecimiento** (efectivo).
  3. **Nunca un flag por-ítem** que decida online-vs-presencial (fue el bug de
     Servicios: `deposit` por-servicio, eliminado). El cobro en línea es el
     **precio completo** del ítem. (La renta sí tiene depósito reembolsable de
     garantía — cosa distinta: se retiene y devuelve.)
- **Visibilidad de tabs en el listado del cliente — REGLA GLOBAL (founder,
  2026-07-15).** En `BizDetail` un tab de contenido sale **SOLO si el módulo está
  ACTIVO _y_ tiene contenido real** (las dos). Aplica a Menú, Tienda, Servicios,
  Renta, Eventos, Novedades y todo lo futuro:
  1. **Activo** = `businesses.modules[k] === true` (el toggle guarda el objeto
     completo). Apagado (`false`) o sin prender → tab **oculto**, aunque queden
     filas viejas de contenido.
  2. **Con contenido** = el RPC devuelve filas (`realMenu`/`realShop`/
     `realServices`/`realRentals`/`realUpdates`/`realEvents`). Activo pero
     **vacío → oculto** (p. ej. `updates:true` con 0 posts).
  3. Mapeo tab→módulo: menú→`menu`, tienda→`products`, servicios→`services`,
     renta→`rental`, eventos→`events`, novedades→`updates`. `bookings` va DENTRO
     de Servicios; **no hay tab "Equipo"** (staff es interno del panel).
  4. Prohibido volver al gating "solo por contenido" (`realX != null` sin
     `modOn`) o "solo por módulo" (`modOn` sin contenido) — ambos rompen la regla.
     Resumen/Relacionados/Reseñas siempre salen. Datos sembrados sin flag →
     **backfill** el flag, no debilites la regla.

## 3. Spanish-first
- Default language **es-US**; English **en-US** is secondary.
- No hardcoded user-facing English. Route all copy through i18n (next-intl).
- Errors, empty states, and notifications must exist in Spanish.

## 4. Use the sanctioned stack; avoid unapproved paid services
- **Sanctioned managed services (decided 2026-06-28): Supabase** (DB = managed
  Postgres+PostGIS, auth/OTP, storage, realtime) and **Cloudflare Pages**
  (frontend host). Use these — don't flag them as violations.
- **Stay portable / self-host-ready:** Supabase is plain Postgres underneath.
  Design the schema for scale (indexes, PostGIS, pagination) and avoid
  proprietary features that can't be reproduced on vanilla Postgres — so the
  `pg_dump` migration to self-hosted Hetzner later stays a non-event.
- Otherwise prefer free / open-source / self-hostable. Don't add a *new* paid
  dependency without sign-off; if genuinely unavoidable, name it, justify it,
  pick the cheapest. Other allowed externals: SMS/WhatsApp OTP, transactional
  email (SES), payments later. See `CLAUDE.md` → Tech stack + Allowed services.

## 5. Build for 1M+/month scale (without over-engineering)
- Index every column used in filters/joins/sorts; no N+1 queries; paginate lists.
- Use **PostGIS** for all geo/"near me"/radius queries — not app-side distance math.
- Cache hot reads (Redis) and offload slow work to background jobs (BullMQ).
- Plan search via Postgres FTS now, Meilisearch when volume demands it.

## 6. Model & cost discipline (Claude Code)
- Opus-tier for architecture / data modeling / security / hard debugging;
  Sonnet-tier as the DEFAULT for everyday features; Haiku-tier for mechanical work.
- Rely on `CLAUDE.md` + this skill (prompt-cached) instead of re-explaining the
  project each task. Keep task prompts tight and scoped.
- **The founder is bootstrapped and credits are scarce — treat them like his
  money, because they are.** Don't burn tokens on redundant exploration: read
  `docs/PROGRESS.md` first, reuse the existing audit harness
  (`tools/mobile-audit/`), and reuse established patterns instead of rebuilding.
  Multi-agent orchestration (ultracode/workflows) only when the founder asks or
  the task genuinely needs it — it is many times the cost of a normal pass.

### Self-escalation protocol (so the founder never has to guess when to upgrade)
The founder is new to Claude Code and doesn't want to have to figure out when a
task needs a stronger model/effort — that decision is Claude's job, every time.
**Ground truth first: Claude cannot change the session's active model or Effort
tier itself.** Those are client-side settings (`/model`, `/effort`) only the
founder can set — never claim or imply an automatic session-wide switch that
doesn't exist; that's the kind of false claim that costs trust later.
What Claude actually does, in two tiers:
1. **Fully automatic, no founder action, works right now:** for one bounded hard
   sub-problem inside a task (root-causing a bug, a security-sensitive review, a
   tricky data-model question) — spawn a sub-agent at a stronger model via the
   `Agent` tool's `model` param. This doesn't touch the main session's tier at
   all; use it freely when a sub-step, not the whole task, is the hard part.
2. **Needs one paste from the founder, but Claude decides WHEN — proactively,
   not after visible struggling:** stop and name the exact command to run
   BEFORE burning further attempts, in every one of these cases:
   - The task centers on payments/Stripe, RLS/security policies, or data-model/
     migrations (matches §6's cost-of-being-wrong framework) — recommend
     escalating **before starting**, not after something breaks.
   - A fix attempt has already failed **twice** at the current tier — recommend
     escalating before a third attempt, never grind a 4th/5th try at the same tier.
   - The root cause is still unclear after real investigation (reading the actual
     code/logs, not guessing) — recommend escalating rather than guessing further.
   - The ask is always one plain line naming the exact command: *"Esto necesita
     más potencia — escribe `/effort high` (o `/model` y elige el nivel
     superior) y dime cuando esté listo, para continuar."* Never a vague "this
     is hard" with no actionable next step.

## 7. Benchmark against the best — build to compete and win (how the founder wants it built)
- Before building/revising **any** section or feature, name the successful apps that
  own that category and study what makes them work, then build the To'Latino version
  to **match or beat** them: professional, modern, **feature-complete**.
- Category reference points (compare every time): **Comunidad → Nextdoor / FB Groups;
  Negocios + reseñas → Yelp / Google Business; comida/delivery → DoorDash / Uber Eats /
  Instacart; tienda + variantes → Amazon / Shopify; servicios y reservas → Fresha /
  OpenTable / Booksy; renta → Turo / Airbnb; eventos + boletos → Eventbrite;
  transporte → Uber / Lyft / Busbud; bienes raíces → Zillow; dealer → CarGurus;
  trabajos → Indeed; mensajería → WhatsApp; búsqueda → Google.**
- **Why this bar exists (founder's words):** every flow must look and work at the
  category leader's level or better — complete, trustworthy, professional —
  because **if it doesn't inspire confianza, no customer has a reason to switch**
  from the app they already use. That trust is the product.
- The bar for done is **"would this compete with the leader in its category?"** Every
  feature a serious competitor has, done **fully** — **no stubs, no fake/broken states,
  no "good enough" placeholder shipped as final.**
- If a feature genuinely can't be finished now (needs the founder's external setup —
  payments, push/email, maps), say so honestly and log it in
  `docs/LAUNCH-CHECKLIST.md`. Never disguise an incomplete feature as complete.
- This competes **within** the other rules — it never overrides the design system (#2),
  Spanish-first (#3), or scale (#5). Beat the competitor using the Handoff's look.

## 8. Follow the EXISTING design & flow — additive-only UI (hard rule, learned the hard way)
The founder has ALREADY approved the app's current screens and flows. Your job on
any UI request is to **add what's missing, never replace what exists.**
- **Before touching any screen:** locate the existing screen/pattern/flow it
  belongs to and work WITHIN it. Two examples that must never repeat (same
  mistake, both sides of the same feature): (1) online food ordering lives
  inside the business single-page's **"Menú" tab** — a session replaced the
  whole single-page with a new full-screen flow and the founder rejected it
  entirely; (2) the restaurant's order-management screen (dashboard "Pedidos"
  tab, built on `ToLatino Customers Module.dc.html`) got fully swapped for the
  handoff's standalone `ToLatino Cocina.dc.html` design — same error, other
  side of the counter. **A design-file name existing in the handoff does NOT
  mean rebuild that screen from scratch in the app** — if the app already has a
  screen occupying that role, graft the new design's missing capabilities into
  it (new sheets/fields/actions), keep the existing KPIs/cards/layout. Rebuilding
  a page he likes = wasted credits + trust, whichever side of the app it's on.
- **"Mejora X" means:** open X, keep its structure, and add the missing
  professional touches (states, polish, edge cases) — not redesign X.
- **New screen genuinely needed?** Derive it from the closest existing screen +
  the design tokens, then send a **screenshot preview for approval BEFORE wiring
  data**. The founder should never have to leave for an external design tool for
  something derivable from what's already in the repo — offer the
  "mock → screenshot → approval → wire" loop instead. (Screens that already
  exist in the handoff/app skip the mock — build faithful, screenshot as PROOF.)
- **External mockups are FUNCTIONAL specs, never visual specs.** When the founder
  brings a flow via Banani.co screenshots, sketches, or captures from other apps
  (for features the reference apps don't have), extract the PROCESS and FEATURES
  from them — then re-express the UI entirely in To'Latino's design system
  (tokens, components, existing patterns). Never copy their look, spacing, or
  styling. Simple flows don't need a mockup at all: his text + one capture is
  a sufficient spec — don't ask him to produce artifacts he doesn't need to.
- **These rules bind every session and every model tier equally** (Sonnet, Opus,
  Haiku — switching models never changes how this project is built).

## 9. Proof, sweeps, and the 3-side rule (how work gets accepted here)
- **Every UI change ships with real-browser screenshot proof** (mobile 402px
  viewport first). Use `tools/mobile-audit/` (Playwright + async curl relay for
  Supabase; serve `apps/web/out` with `npx serve out -l 4173 --no-clipboard`,
  never `-s`). "It compiles" is not verified.
- **One report = a pattern.** When the founder reports a UX defect in one spot
  (background scrolls under a popup, demo data flashing, a janky transition),
  assume it exists platform-wide: fix it at the SHARED primitive (e.g.
  `<Overlay>`, `useLiveData`, `scrollLock`) and sweep every surface — he should
  never have to report the same bug twice in two places.
- **Transitions must be professional.** No flashes, blinks, jumps, layout
  shifts, or demo-content flashes. Never animate layout from scroll JS (it lags
  a frame and flickers) — reserve the space and fade opacity/transform on the
  compositor; measure pre-paint (`useLayoutEffect`). Verify with slow-scroll
  step audits, not by eye.
- **Every marketplace process has 3 sides:** Cliente (a@a.com) · Negocio
  (b@b.com — El Sabor de Quisqueya, his ONLY test business) · Plataforma
  (To'Latino fees/notifications). A process is done only when all three are
  correct — and all test artifacts are reverted (orders/notifications back to
  baseline, e2e users deleted).

## Pre-flight checklist (run before finishing any UI/feature task)
- [ ] **Benchmarked vs. the category leader; matches/beats it; feature-complete —
      nothing stubbed or faked shipped as final (unfinished → LAUNCH-CHECKLIST).**
- [ ] Mobile layout designed/built first; responsive up without breaking it.
- [ ] Only design-system tokens/components used; nothing improvised.
- [ ] Spanish copy present via i18n; no hardcoded English.
- [ ] Queries indexed/paginated; geo via PostGIS; scale considered.
- [ ] No unnecessary paid dependency added.
- [ ] Verified end-to-end (tsc + build + mobile audit / intercept), not just written.
- [ ] **Additive to the existing screen/flow — nothing the founder already
      approved was replaced or redesigned (#8).**
- [ ] **Real-browser screenshot proof sent; transitions flash/jump-free; if the
      task was a reported bug, the same pattern was swept platform-wide (#9).**
- [ ] **3 sides checked (Cliente · Negocio · Plataforma) and test artifacts
      reverted (#9).**
- [ ] If anything was missing from the design system or stack, the founder was
      asked rather than guessed.
- [ ] **Admin coverage: any new entity/flow added its Super Admin surface (or an
      explicit §3 entry + phase in `docs/ADMIN-DASHBOARD-PLAN.md`). Nothing ships
      that the founder can't control from `/admin`.**
