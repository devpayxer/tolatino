---
name: tolatino-standards
description: >-
  Enforces To'Latino's core build standards on every task. Use whenever
  creating, modifying, or reviewing UI, screens, components, layouts, styling,
  features, or architecture for the To'Latino super-app. Guarantees mobile-first
  design, strict adherence to the established design system (never improvised
  UI), Spanish-first copy, build-from-scratch / avoid-paid-services discipline,
  and 1M+ scale-aware choices.
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
- Opus 4.8 for architecture / data modeling / security / the design-system
  foundation; Sonnet 4.6 for everyday features; Haiku 4.5 for mechanical work.
- Rely on `CLAUDE.md` + this skill (prompt-cached) instead of re-explaining the
  project each task. Keep task prompts tight and scoped.

## Pre-flight checklist (run before finishing any UI/feature task)
- [ ] Mobile layout designed/built first; responsive up without breaking it.
- [ ] Only design-system tokens/components used; nothing improvised.
- [ ] Spanish copy present via i18n; no hardcoded English.
- [ ] Queries indexed/paginated; geo via PostGIS; scale considered.
- [ ] No unnecessary paid dependency added.
- [ ] If anything was missing from the design system or stack, the founder was
      asked rather than guessed.
