# Live-DB whole-app audit — findings (2026-07-08)

Ran an 8-agent audit against the **live** Supabase DB (Postgres 17, 41 tables, 39
RPCs). Each surface read the real code AND queried production. **No P0 crash on a
currently-wired path** — the ticket-buy fix (0067) holds and all 39 RPCs exist.
What remains is one latent runtime bug, a cluster of "ships as final but is
fake/half-wired" integrity issues, i18n leaks, and mobile/token polish.

> One finder (business-dashboard) failed its structured output and is NOT covered
> here — re-run pending.

## Root-cause themes
1. **Frontend↔DB drift** — the dominant cause: a still-buggy `buy_event_tickets`,
   a promised trigger never created (chat `message` notif), a column the dashboard
   writes but RPCs never return (`businesses.modules`), a subscribed table absent
   from the realtime publication (`event_waitlist`).
2. **Fixture data leaking into real listings** — per-tab fixtures are intentional,
   but tab visibility isn't gated by module config, so real businesses show fake
   menus/staff/rentals.
3. **i18n leaks via server strings** — client trusts Spanish DB strings verbatim
   (promo, auth errors, raw buy error) → English users see Spanish.
4. **Temporary diagnostic scaffolding shipped as final** — the raw `⚠ <reason>`
   buy error was never reverted.
5. **State not synced across providers** — MyActivity/LiveData/Interactions
   refresh in isolation → stale RSVP + comment counts, dead realtime binding.
6. **Token discipline erosion in the business panel** — raw hex + sub-44px targets.

## Prioritized fix list

| # | Sev | Title | File |
|--|--|--|--|
| 1 | P1* | `buy_event_tickets` ambiguous `code` in RETURNING (latent ticketing crash) | supabase/migrations/0061:192 |
| 2 | P1* | BizDetail renders all 10 tabs ungated → real listings show fixture catalogs | apps/web/src/screens/BizDetail.tsx:703 |
| 3 | P2 | Chat messages never emit an in-app `message` notification (no trigger) | apps/web/src/lib/notifications.tsx:69 |
| 4 | P2 | buy error still surfaces raw `⚠ <reason>` English text | apps/web/src/screens/Eventos.tsx:76 |
| 5 | P2 | Featured banner ignores filters + duplicates first grid card | apps/web/src/screens/Eventos.tsx:213 |
| 6 | P2 | Auth error messages Spanish-only in English mode | apps/web/src/lib/auth.tsx:48 |
| 7 | P2 | Mobile search-suggestions dropdown anchored to desktop bar | apps/web/src/components/AppHeader.tsx:230 |
| 8 | P3 | Promo-code result messages Spanish-only in English mode | apps/web/src/screens/Eventos.tsx:318 |
| 9 | P3 | Legacy `category_id='food'` businesses silently filtered out | apps/web/src/lib/live.tsx:680 |
| 10 | P3 | `event_waitlist` realtime binding dead (table not in publication) | apps/web/src/lib/myActivity.tsx:113 |
| 11 | P3 | "Ver todos los resultados" always routes to Negocios | apps/web/src/components/AppHeader.tsx:163 |
| 12 | P3 | Signed-in user w/ no profile row gets fake post success | apps/web/src/components/PublishModal.tsx:241 |
| 13 | P3 | Comment count shows 0 on Saved/Following cards | apps/web/src/lib/interactions.tsx:57 |
| 14 | P3 | Live event "asisten" count off-by-one after "Voy" | apps/web/src/screens/Eventos.tsx:136 |
| 15 | P3 | Create-event "online event" path is dead code (no toggle) | apps/web/src/screens/negocio/modules/Events.tsx:1363 |
| 16 | P2 | Shared Switch toggle 23–25px (sub-44px) + raw hex | apps/web/src/screens/negocio/modules/Services.tsx:116 |
| 17 | P2 | Review star buttons ~30px (sub-44px) + raw hex | apps/web/src/screens/BizDetail.tsx:2087 |
| 18 | P2 | `accent-[#7B61FF]` raw hex instead of token | apps/web/src/screens/Negocios.tsx:388 |
| 19 | P3 | Like-heart fill hardcodes `#F0466E` | apps/web/src/screens/Negocios.tsx:603 |
| 20 | P3 | Off-palette gray hexes where tokens exist | apps/web/src/screens/Negocios.tsx:193 |

*Ranks 1–2 re-rated P1: #1 is the exact class of the production bug (fix now to
prevent recurrence); #2 violates the "no fake state as final" non-negotiable.

## Status
- [x] **Batch A (integrity)** — DONE + verified (migration 0068 applied live; tsc + build clean)
  - [x] #1 `buy_event_tickets` ambiguous `code` — fixed in 0068, live-verified
  - [x] #2 BizDetail fixture tabs — `modules` exposed (0068) + mapped (live.tsx) + tabs gated (BizDetail.tsx: catalog tabs by real data, events/staff/updates by module config)
  - [x] #3 chat `message` notification — `tg_notify_message` trigger added in 0068, live-verified
  - [x] #4 raw `⚠ <reason>` buy error — reverted to friendly ES/EN copy
  - [x] #5 featured banner ignores filters / duplicates — filter-aware + excluded from grid
  - [x] #10 `event_waitlist` realtime — added to publication in 0068, live-verified
- [x] **Batch B (i18n + functional)** — DONE + verified (tsc + build clean)
  - [x] #6 auth errors i18n — `auth.tsx` returns stable codes + `authErrorText(code,L)`; Onboarding localizes
  - [x] #7 mobile search dropdown — now anchored under the mobile input (second `SearchDropdown` in a `relative` mobile row; desktop one gated `md:block`)
  - [x] #8 promo result i18n — localized client-side from the result, not the server's Spanish `msg`
  - [x] #11 "Ver todos los resultados" — routes to the section with the most hits
  - [x] #12 fake post success — signed-in user w/ no profile now gets an error, not a fake "¡Publicado!"
  - [x] #13 comment count — falls back to the loaded thread count on Saved/Following posts
  - [x] #14 RSVP "asisten" count — live-data refresh after RSVP so the number updates
  - [ ] #9 legacy `category_id='food'` — DEFERRED (3 old superseded seeds only; `create_business` writes canonical keys) → LAUNCH-CHECKLIST
  - [ ] #15 online-event dead code — DEFERRED (unreachable, not a live bug) → LAUNCH-CHECKLIST
- [x] **Batch C (design tokens + touch targets)** — DONE + verified (tsc + build clean)
  - [x] #16 shared `Switch` extracted to `components/ui.tsx` with a ≥44px hit area + tokens; migrated Services, Products, Settings, Listing, Cuenta, ModulesSetup (killed the 6 hand-rolled copies + raw `#7B61FF`/`#D8D2E6`)
  - [x] #17 review stars now h-11 w-11 (44px) + `text-amber`/`text-muted-faint` tokens
  - [x] #18 `accent-[#7B61FF]` → `accent-primary` (Negocios, Hours)
  - [x] #19 heart fill `#F0466E` → `fill="currentColor"` (Negocios, BizDetail ×2, Updates)
  - [x] #20 gray hexes → tokens (Negocios `border-lilac-line`/`text-muted`/`bg-muted-faint`; BizDetail `text-muted`/`bg-lilac-line`)
- [~] Re-run business-dashboard finder (re-running now for full coverage)

### Deferred (logged, not user-facing bugs)
- #9 legacy `category_id='food'` (3 old superseded seeds) · #15 online-event dead code · BizDetail events/staff/updates real-data wiring — all in LAUNCH-CHECKLIST.

### Deferred (logged in LAUNCH-CHECKLIST)
- BizDetail public **events / staff / updates** tabs still render prototype fixture
  content on businesses that enabled those modules (only `hz-barberia-primera`
  today). They now show ONLY when the owner enabled the module, so real
  unconfigured listings never show them — but wiring their real public data
  (owner events / business_staff / business_updates) is pending.
