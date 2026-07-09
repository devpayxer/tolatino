#!/usr/bin/env node
// deploy-fn.mjs — deploy a single-file Supabase Edge Function via the Management API.
// Usage: node scripts/deploy-fn.mjs <slug> <file> [verify_jwt(true|false)]
// Auth: SUPABASE_ACCESS_TOKEN. Project ref from SUPABASE_PROJECT_REF or .env.production.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('deploy-fn: SUPABASE_ACCESS_TOKEN not set'); process.exit(2); }

function projectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const txt = readFileSync(resolve(HERE, '../apps/web/.env.production'), 'utf8');
  const m = txt.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!m) throw new Error('cannot find project ref');
  return m[1];
}

const [, , slug, file, vj] = process.argv;
if (!slug || !file) { console.error('usage: deploy-fn.mjs <slug> <file> [verify_jwt]'); process.exit(2); }
const ref = projectRef();
const body = readFileSync(file, 'utf8');
const verify_jwt = vj === 'true';

function req(method, path, payload) {
  const res = spawnSync('curl', [
    '-sS', '-X', method, `https://api.supabase.com/v1/projects/${ref}${path}`,
    '-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json',
    '--data-binary', '@-', '-w', '\n__HTTP__%{http_code}', '--max-time', '120',
  ], { input: JSON.stringify(payload), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = res.stdout || '';
  const i = out.lastIndexOf('\n__HTTP__');
  return { code: i >= 0 ? out.slice(i + 9).trim() : '000', text: i >= 0 ? out.slice(0, i) : out };
}

// create; if it already exists, patch (idempotent redeploy)
let r = req('POST', `/functions?slug=${slug}`, { slug, name: slug, verify_jwt, body });
if (r.code === '409' || /already exists|duplicate/i.test(r.text)) {
  r = req('PATCH', `/functions/${slug}`, { verify_jwt, body });
}
console.log(`[HTTP ${r.code}] ${slug}`);
console.log(r.text.slice(0, 400));
process.exit(r.code.startsWith('2') ? 0 : 1);
