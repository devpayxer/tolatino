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

🚧 **Foundation stage.** The repository is being set up: project memory and
standards are in place. Next steps (see `CLAUDE.md`) are bringing in the design
system handoff and scaffolding the monorepo.

## Planned architecture

TypeScript end-to-end, bootstrapped-friendly, self-hostable:

```
apps/
  web/   # Next.js (App Router) mobile-first PWA  — later wrapped with Capacitor
  api/   # NestJS backend
packages/
  ui/    # Design-system components (from the To'Latino handoff)
  types/ # Shared TypeScript types
docs/
  design-system/  # Tokens, component specs, mockups, handoff
infra/   # Docker Compose / deployment (Hetzner + Cloudflare)
```

Core building blocks: **PostgreSQL + PostGIS** (geo / "near me"), **Redis +
BullMQ**, **MapLibre + OpenStreetMap** (maps without per-request billing),
**Meilisearch** (search at scale), self-hosted where possible. Full rationale in
[`CLAUDE.md`](CLAUDE.md).

## License

[MIT](LICENSE)
