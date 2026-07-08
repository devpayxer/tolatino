#!/usr/bin/env node
// sbsql.mjs — run SQL against the To'Latino Supabase project from a Claude Code
// cloud session, so migrations and verification can be applied autonomously.
//
// WHY THIS EXISTS
//   Supabase's Postgres port (5432/6543) is a raw TCP protocol that the cloud
//   sandbox's HTTP/HTTPS proxy can't tunnel, so a normal connection string won't
//   work here. The Supabase **Management API** speaks HTTPS, so it goes through
//   the proxy fine. This wraps its "run a query" endpoint, which executes
//   arbitrary SQL (including DDL migrations).
//
// TRANSPORT
//   Uses `curl` under the hood on purpose — Node's built-in fetch() does NOT
//   honor the sandbox's HTTPS_PROXY, but curl does.
//
// AUTH
//   Reads SUPABASE_ACCESS_TOKEN (a Supabase Personal Access Token, "sbp_...")
//   from the environment. Set it as an env var on the cloud environment
//   (Custom network access allowing api.supabase.com). Never commit the token.
//
// PROJECT
//   Ref is taken from SUPABASE_PROJECT_REF, else parsed from
//   apps/web/.env.production (NEXT_PUBLIC_SUPABASE_URL).
//
// USAGE
//   node scripts/sbsql.mjs "select now();"                     # inline SQL
//   node scripts/sbsql.mjs --file supabase/migrations/0067_*.sql   # a migration
//   echo "select 1;" | node scripts/sbsql.mjs -                # stdin
//   node scripts/sbsql.mjs --raw "select 1;"                   # raw JSON, no pretty
//
// EXIT CODES: 0 ok · 1 query/HTTP error · 2 usage/config error

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

function die(msg, code = 2) { console.error(`sbsql: ${msg}`); process.exit(code); }

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  die(
    'SUPABASE_ACCESS_TOKEN is not set.\n' +
    '  → Open a session in the cloud environment that has it configured\n' +
    '    (Settings dialog → Environment variables). This current session may\n' +
    '    predate the variable; env vars only inject into NEW sessions.',
  );
}

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  for (const rel of ['../apps/web/.env.production', '../apps/web/.env.local', '../apps/web/.env']) {
    try {
      const txt = readFileSync(resolve(HERE, rel), 'utf8');
      const m = txt.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
      if (m) return m[1];
    } catch { /* keep looking */ }
  }
  die('Cannot determine project ref. Set SUPABASE_PROJECT_REF, or ensure\n' +
      '  apps/web/.env.production has NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co');
}

// ---- parse args ----
const argv = process.argv.slice(2);
let raw = false;
const rest = [];
for (const a of argv) { if (a === '--raw') raw = true; else rest.push(a); }

let sql;
if (rest[0] === '--file' || rest[0] === '-f') {
  if (!rest[1]) die('--file needs a path');
  sql = readFileSync(rest[1], 'utf8');
} else if (rest[0] === '-' || rest.length === 0) {
  sql = readFileSync(0, 'utf8'); // stdin
} else {
  sql = rest.join(' ');
}
if (!sql || !sql.trim()) die('no SQL provided');

const ref = projectRef();
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;
const body = JSON.stringify({ query: sql });

const res = spawnSync('curl', [
  '-sS', '-X', 'POST', url,
  '-H', `Authorization: Bearer ${token}`,
  '-H', 'Content-Type: application/json',
  '--data-binary', '@-',
  '-w', '\n__HTTP__%{http_code}',
  '--max-time', '180',
], { input: body, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

if (res.error) die(`curl failed: ${res.error.message}`, 1);

const out = res.stdout || '';
const marker = out.lastIndexOf('\n__HTTP__');
const httpCode = marker >= 0 ? out.slice(marker + 9).trim() : '000';
const payload = marker >= 0 ? out.slice(0, marker) : out;

let parsed;
try { parsed = JSON.parse(payload); } catch { parsed = payload; }

const pretty = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, raw ? 0 : 2));

if (httpCode !== '200' && httpCode !== '201') {
  console.error(`HTTP ${httpCode}`);
  console.error(pretty(parsed));
  if (String(parsed).includes('JWT could not be decoded')) {
    console.error('\nHint: the token is invalid. Make sure SUPABASE_ACCESS_TOKEN is the\n' +
                  'exact Personal Access Token (sbp_...) from supabase.com/dashboard/account/tokens.');
  }
  process.exit(1);
}

console.log(pretty(parsed));
