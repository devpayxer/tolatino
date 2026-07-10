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
  belongs to and work WITHIN it. Example that must never repeat: online food
  ordering lives inside the business single-page's **"Menú" tab** — an earlier
  session replaced the whole single-page with a new full-screen flow and the
  founder rejected it entirely. Rebuilding a page he likes = wasted credits + trust.
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
