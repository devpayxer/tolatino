# Autonomous DB access & per-change verification

> How Claude Code (web sessions) reaches the **live** Supabase database to apply
> migrations and verify features end-to-end — so "built" always means "verified
> against production," not just "compiles."

## Why this exists

Most production bugs on this project were **frontend ↔ DB drift**: the app called
a function/column the database didn't have (or a migration was never run). The
only reliable cure is for the agent to check the **real database**, not just the
migration files. This wiring makes that possible.

## One-time setup (already done)

In the Claude Code cloud environment (**claude.ai/code → new session → cloud icon
→ edit environment**):

1. **Network access → Custom**, with **Allowed domains**:
   ```
   *.supabase.co
   api.supabase.com
   ```
   (keep "Also include default list of common package managers" checked)
2. **Environment variables**:
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...        # a Supabase Personal Access Token
   ```
   Get the token at **supabase.com/dashboard/account/tokens → Generate new token**.

Changes apply to **new** sessions (env vars inject at session start).

### Why a Personal Access Token, not a DB connection string
Supabase's Postgres port (5432/6543) is a raw TCP protocol the cloud sandbox's
HTTP/HTTPS proxy can't tunnel — a `postgresql://…` connection string won't work
here. The **Management API** speaks HTTPS, so it flows through the proxy. The PAT
is also revocable in one click and never exposes the DB password.

> **Security:** environment variables are visible to anyone who can edit the
> environment (there is no encrypted secret store yet). Use a token you can
> revoke, and rotate it if it's ever shown in a screenshot/chat.

## The tool: `scripts/sbsql.mjs`

Runs read-only queries **or** migrations against the live DB via the Management
API. Transport is `curl` on purpose (Node's `fetch` ignores the sandbox proxy).

```bash
# inline query
node scripts/sbsql.mjs "select count(*) from public.events;"

# run a migration file (DDL)
node scripts/sbsql.mjs --file supabase/migrations/0067_fix_buy_notify_and_promo_ambiguity.sql

# from stdin
echo "select now();" | node scripts/sbsql.mjs -
```

Project ref is read from `apps/web/.env.production` (`NEXT_PUBLIC_SUPABASE_URL`)
or `SUPABASE_PROJECT_REF`. Exit codes: `0` ok · `1` query/HTTP error · `2` config.

## Per-change verification routine (run after every feature / migration)

1. **Apply** any new migration: `node scripts/sbsql.mjs --file supabase/migrations/NNNN_*.sql`
2. **Parity** — confirm every RPC the frontend calls exists with matching args:
   grep `apps/web/src` for `.rpc('…'` and check each against
   `pg_get_function_identity_arguments`.
3. **Column check** — every `.from('t').select/insert/update` column exists
   (`information_schema.columns`).
4. **Exercise the path** — call the function / inspect the rows it should have
   written (e.g. after a ticket buy, `select … from event_tickets order by
   created_at desc limit 1`).
5. **tsc + build** the web app.
6. Only then report the feature as done.

A ready-made whole-app audit that automates steps 2–4 across every surface lives
in the workflow script used by the "live audit" run; see `docs/AUDIT.md` for the
manual smoke-test matrix.
