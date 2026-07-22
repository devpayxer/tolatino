# Test-seed: Hazleton PA + The Bronx NY (full 2-city dataset)

Login-ready test data to exercise the WHOLE app. **DEV/TEST ONLY.** All rows
removable by owner email / slug prefix (see Cleanup). Password for EVERY account: **`123`**.

## What's seeded
- **18 regular users** (clients/community): `1@1.com`..`9@1.com` (Hazleton),
  `1@2.com`..`9@2.com` (Bronx). Full list: `usuarios-regulares-login.csv`.
- **540 businesses** = 15 categories × (9 paid + 9 free) × 2 cities. Each has a real
  owner account, address, phone, hours, reviews (by regular users → real ratings),
  endorsements ("recomendados"), and category-appropriate content. Paid tiers also
  get staff, updates, promos, addons/variants, and (where transactional) online-ordering
  toggled on. Full list: `negocios-login.csv`.
- **Events** (with tiers + promo codes) and **community posts** per city.

## Business email scheme
`<letter>@<token><city>.com` — letters a–i = paid (verified/premium), j–r = free;
city digit `1`=Hazleton, `2`=Bronx. Category tokens:

| token | category | rubro/módulo |
|---|---|---|
| food | FoodDrinks | Menú (+delivery/tips) |
| night | NightLife | Menú (bar) |
| beauty | BeautyHealth | Servicios+Reservas (+Tienda) |
| health | HealthMedicine | Servicios+Reservas |
| auto | AutoServices | Servicios (+Tienda: refacciones) |
| home | HomeServices | Servicios |
| pro | ProServices | Servicios |
| trans | Transportation | Servicios |
| edu | Education | Servicios (clases) |
| kids | Children | Servicios (+Tienda) |
| sport | Sports | Servicios (+Renta cancha) |
| party | Party | Renta (+Servicios) |
| groc | Grocery | Tienda |
| shop | Shops | Tienda (con variantes) |
| church | Churches | Eventos/Novedades (display) |

Example: `a@beauty2.com` = a paid salon in the Bronx.

## Build (service_role via scripts/sbsql.mjs)
1. `node ../../scripts/sbsql.mjs --file 00_helpers.sql`
2. `node ../../scripts/sbsql.mjs --file 01_users.sql`
3. For each category: `node gen-all.mjs <CategoryId> > cat.sql && node ../../scripts/sbsql.mjs --file cat.sql`
4. `node gen-all.mjs EXTRAS > extras.sql && node ../../scripts/sbsql.mjs --file extras.sql`

## Payments (hybrid)
Businesses are created `connect_charges_enabled=false` → **pay at establishment**
(cash/pickup ordering works fully). Real online card payment needs Stripe TEST
connected accounts, which require a one-time **Stripe Dashboard** step:
Connect → Platform profile → declare responsibilities
(https://dashboard.stripe.com/settings/connect/platform-profile). After that, the
temp `seed-connect` edge function mints per-business test accounts and flips the flag.

## Cleanup (safe — only seeded rows)
```sql
delete from businesses where slug ~ '^(hz|bx)-';                  -- cascades items/reviews/staff/endorsements/orders
delete from events     where slug ~ '^(hz|bx)-ev-';
delete from posts      where author_id in (select id from auth.users where email ~ '@[12]\.com$');
delete from auth.users where email ~ '@([12]|[a-z]+[12])\.com$';  -- regular + business test users
```
⚠️ Keep the business regex exactly `^(hz|bx)-`. Widening it once deleted real owner-owned rows.
