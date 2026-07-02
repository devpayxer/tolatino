# To'Latino

An all-in-one local **super-app for Latinos living in the USA** — a single,
Spanish-first platform where Latino entrepreneurs of every level (new, hobbyist,
part-time, or established) can publish their business and **promote, sell, and
take bookings** for products and services from nearby local users.

Think **GoJek (Asia)**, adapted to the US Latino community — combining what's
today split across DoorDash, Amazon, Uber, Yelp, and Nextdoor, in our language
and culture.

> **Mobile-first.** ~99% of our users are on mobile. Everything is designed and
> built for mobile first, then made responsive for tablet and desktop without
> losing the core mobile experience.

## Project principles (read first)

This project has **non-negotiable standards**. Before contributing, read:

- **[`CLAUDE.md`](CLAUDE.md)** — vision, constraints, the agreed tech stack, the
  AI-model strategy, and the design-system handoff requirements.
- **[`.claude/skills/tolatino-standards`](.claude/skills/tolatino-standards/SKILL.md)**
  — the build standards enforced on every task (mobile-first, design-system
  adherence, Spanish-first, build-from-scratch, 1M+ scale).

The short version:
1. **Mobile-first**, always.
2. **Use the established design system — never invent UI.**
3. **Build from scratch; avoid paid services** unless truly unavoidable.
4. **Scale for 1M+** businesses / listings / users per month.
5. **Spanish-first** (English secondary).

## Status

🚧 **Foundation in place; app implementation restarting.**
- Project memory + build standards (`CLAUDE.md`, `tolatino-standards` skill).
- **Design system** committed under [`docs/design-system/`](docs/design-system/)
  (tokens, primitives, navigation patterns, reference screenshots).
- **Database schema** in [`supabase/`](supabase/) (Postgres + PostGIS,
  applied to the live Supabase project).
- **`apps/web`** — the first implementation was scrapped (2026-07-02) to start
  over; the next one will be rebuilt from the design system and `CLAUDE.md`.

## Architecture

TypeScript end-to-end. **Strategy (decided 2026-06-28): Supabase-first,
self-host-ready** — ship fast on managed Postgres now, migrate to self-hosted at
scale (it's plain Postgres underneath, so the move is a `pg_dump`, not a rewrite).

```
apps/
  web/   # Next.js (App Router) mobile-first PWA  — hosted on Cloudflare Pages
packages/
  ui/    # Design-system components (from the To'Latino handoff)
  types/ # Shared TypeScript types
docs/
  design-system/  # Tokens, component specs, mockups, handoff
```

Core building blocks: **Supabase** (managed **Postgres + PostGIS** for geo /
"near me", auth/OTP, storage, realtime), **Cloudflare Pages** (frontend host),
**MapLibre + OpenStreetMap** (maps without per-request billing), Postgres
full-text search → **Meilisearch** at scale. Migration target: self-hosted
Postgres + **NestJS** on Hetzner. Full rationale and the scale plan in
[`CLAUDE.md`](CLAUDE.md).

## License

[MIT](LICENSE)
