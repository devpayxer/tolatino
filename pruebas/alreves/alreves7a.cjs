// Prueba al revés de los guardianes de 7a (la ayuda como base): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0116_ayuda_base.sql', L = 'apps/web/lib/compa/ayuda-indice.ts', X = 'scripts/ayuda/indexar.mjs', D = 'infra/pruebas/deploy.sh',
  CI = '.github/workflows/ci.yml', PG = 'apps/web/app/(app)/ayuda/page.tsx', AR = 'apps/web/app/(app)/ayuda/[slug]/page.tsx', CA = 'apps/web/app/(app)/ayuda/CentroAyuda.tsx',
  P1 = 'docs/ayuda/ayuda-con-el-pedido.md', P2 = 'docs/ayuda/cuenta-entrar.md', P3 = 'docs/ayuda/admin-equipo.md', P4 = 'docs/ayuda/panel-pedidos.md', EQ = 'apps/web/app/panel/Equipo.tsx';
const casos = [
  // ayudaConForma
  ['ayudaConForma', P1, '\n## English\n', '\n## In English\n'],
  ['ayudaConForma', P1, '# Ayuda con el pedido · Order help', '# Ayuda con el pedido'],
  ['ayudaConForma', P1, 'Audiencia: vecino. Tema: pedidos._', 'Tema: pedidos._'],
  ['ayudaConForma', P1, 'Audiencia: vecino. Tema: pedidos._', 'Audiencia: vecino. Tema: panel._'],
  ['ayudaConForma', P1, '## Qué hace\n', '# Qué hace\n'],
  ['ayudaConForma', P2, '## English\n\n### What it does', '## English\n\n## What it does'],
  ['ayudaConForma', M, "('puerta', 'portero',", "('puertas', 'portero',"],
  ['ayudaConForma', D, '|| log "ayuda: no se pudo indexar', '; log "ayuda: no se pudo indexar'],
  ['ayudaConForma', CI, 'node scripts/ayuda/indexar.mjs |', 'true |'],
  ['ayudaConForma', CI, 'echo "$out" | grep -q " 0 nuevos · 0 cambiados"', 'true'],
  // ayudaSinFaseInterna
  ['ayudaSinFaseInterna', 'docs/ayuda/cancelar-y-devoluciones-de-boletos.md', 'te devolvemos **todo**.', 'te devolvemos **todo** (llega con 6e).'],
  ['ayudaSinFaseInterna', P1, '| Devolución | Si pagaste con tarjeta', '| Devolución | Desde la Fase 2, si pagaste con tarjeta'],
  ['ayudaSinFaseInterna', P1, '| Devolución |', '| Devolución (2i) |'],
  ['ayudaSinFaseInterna', P1, 'and, if the order was paid by card, a refund to that card', 'Card refunds arrive with Stripe'],
  ['ayudaSinFaseInterna', P2, '## Para El Compa\n<!-- solo-equipo -->', '## Para El Compa (llega con el bloque 7d)'],
  ['ayudaSinFaseInterna', EQ, 'El SMS de invitación todavía no sale: avísale tú a la persona.', 'El SMS sale con la Fase 2.'],
  // compaAyudaPorAudiencia
  ['compaAyudaPorAudiencia', P3, 'Audiencia: equipo. Tema: equipo._', 'Audiencia: vecino. Tema: cuenta._'],
  ['compaAyudaPorAudiencia', P4, 'Audiencia: negocio. Tema: panel._', 'Audiencia: vecino. Tema: pedidos._'],
  ['compaAyudaPorAudiencia', M, "check (slug not like 'admin-%' or audience = 'equipo'),", ''],
  ['compaAyudaPorAudiencia', M, 'create trigger help_chunks_audiencia before insert or update on help_chunks', '-- sin trigger'],
  ['compaAyudaPorAudiencia', M, "case when coalesce((c->>'equipo')::boolean, false) then 'equipo' else a->>'audience' end", "a->>'audience'"],
  ['compaAyudaPorAudiencia', X, 'equipo: c.equipo', 'equipo: false'],
  ['compaAyudaPorAudiencia', L, 'where q.tq is not null and c.tsv @@ q.tq and c.lang = $2 and c.audience = any($3::text[]))', 'where q.tq is not null and c.tsv @@ q.tq and c.lang = $2)'],
  ['compaAyudaPorAudiencia', L, "where t.k = 1 and a.status = 'live' and a.audience = any($3::text[])", "where t.k = 1 and a.audience = any($3::text[])"],
  ['compaAyudaPorAudiencia', L, "where c.slug = $1 and c.audience = any($2::text[]) order by c.ord", "where c.slug = $1 order by c.ord"],
  ['compaAyudaPorAudiencia', L, 'if (a.status === "paused" && !equipo) return { ...a, paused_reason: null, secciones: { es: [], en: [] } };', ''],
  ['compaAyudaPorAudiencia', L, 'if (r?.staff) return [...TODAS];', 'if (r?.staff || r?.negocio) return [...TODAS];'],
  ['compaAyudaPorAudiencia', L, 'import "server-only";\n', ''],
  ['compaAyudaPorAudiencia', PG, 'const aud = await audienciasDe(u?.id ?? null);', 'const aud = ["vecino", "equipo"] as never;'],
  ['compaAyudaPorAudiencia', AR, 'const a = await articulo(slug, aud);', 'const a = await articulo(slug, ["equipo"]);'],
  ['compaAyudaPorAudiencia', CA, 'import type { FilaAyuda, Hallado, Tema } from "@/lib/compa/ayuda-indice";', 'import { buscarAyuda, type FilaAyuda, type Hallado, type Tema } from "@/lib/compa/ayuda-indice"; void buscarAyuda;'],
  ['compaAyudaPorAudiencia', 'apps/web/lib/panel.ts', 'export async function misNegocios(userId: string) {', 'export async function ayudaCruda() { return db().query(`select body from help_chunks`); }\nexport async function misNegocios(userId: string) {'],
  // libroSoloInsercion (help_article_log)
  ['libroSoloInsercion', M, 'create trigger help_article_log_no_cambia before update or delete on help_article_log', '-- sin trigger'],
  ['libroSoloInsercion', L, 'export async function pausarAyuda(', 'export async function borrarLibro() { return db().query(`delete from help_article_log where action = \'paused\'`); }\nexport async function pausarAyuda('],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
// Una ayuda nueva sin forma (archivo nuevo, sin git add) → ayudaConForma falla.
const nuevo = `${R}/docs/ayuda/zz-prueba-sin-forma.md`;
fs.writeFileSync(nuevo, '# Prueba\n\nTexto suelto sin metadatos ni inglés.\n');
let f2 = false; try { execSync('node guardianes/run.mjs --solo ayudaConForma', { cwd: R, stdio: 'pipe' }); } catch { f2 = true; }
fs.unlinkSync(nuevo); console.log(`  ${f2 ? '✓' : '✗'} ayudaConForma al revés (ayuda nueva sin forma)`); if (f2) bien++;
// El indexador se niega a escribir con una ayuda sin forma.
const p1 = `${R}/${P1}`, o1 = fs.readFileSync(p1, 'utf8'); fs.writeFileSync(p1, o1.replace('\n## English\n', '\n## Inglés\n'));
let f3 = false; try { execSync('node scripts/ayuda/indexar.mjs > /dev/null', { cwd: R, stdio: 'pipe' }); } catch { f3 = true; }
fs.writeFileSync(p1, o1); console.log(`  ${f3 ? '✓' : '✗'} indexar.mjs no escribe nada con una ayuda sin forma`); if (f3) bien++;
console.log(`\n${bien}/${casos.length + 2} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
