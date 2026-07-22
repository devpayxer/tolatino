# Test-seed tooling (Hazleton PA + The Bronx NY)

Realistic, login-ready test data to exercise the full app (discovery, filters,
listings, ordering, reviews, panel). **DEV/TEST ONLY — not for a real launch DB.**
All rows are removable by owner email / slug prefix (see Cleanup).

## Users
- Password for EVERY seeded account: **`123`** (inserted with bcrypt directly, so
  it works with `signInWithPassword` even below the normal min length).
- Regular users: `1@1.com`..`9@1.com` (Hazleton), `1@2.com`..`9@2.com` (Bronx).
- Business owners: `<letter>@<cattoken><city>.com` — e.g. FoodDrinks Hazleton =
  `a@food1.com`..`r@food1.com` (a–i paid/verified·premium, j–r free); Bronx = `…@food2.com`.
  City digit: `1`=Hazleton, `2`=Bronx.

## How it's built (service_role, via scripts/sbsql.mjs)
1. `00_helpers.sql` — installs `_seed_user(email,name,initials,color,city,lat,lng)`
   (creates auth.users + identity + profile, password '123', idempotent by email).
2. `01_users.sql` — the 18 regular users.
3. `gen-food.mjs` — prints SQL for the FoodDrinks category (18 businesses/city:
   9 paid + 9 free) with 12 menu items, reviews (by regular users → real ratings),
   staff + updates (paid). Run: `node gen-food.mjs > food.sql && node ../../scripts/sbsql.mjs --file food.sql`.

## Payments (hybrid)
Businesses are created `connect_charges_enabled=false` → **pay at establishment**
(fully functional cash/pickup ordering). Real online card payment needs Stripe
TEST connected accounts, which require a one-time **Stripe Dashboard** step
(Connect → Platform profile → declare responsibilities). After that, a temp
`seed-connect` edge function mints per-business test accounts and flips the flag.

## Cleanup (safe — only touches seeded rows)
```sql
delete from businesses where slug ~ '^(hz|bx)-';            -- cascades items/reviews/staff/orders
delete from posts    where author_id in (select id from auth.users where email ~ '@[12]\.com$');
delete from auth.users where email ~ '@([12]|[a-z]+[12])\.com$';  -- regular + business test users
```
⚠️ Do NOT widen the business regex — `^(hz|bx)-` is exact to seeded slugs.
