// Prueba al revés de los guardianes de 5i: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const K = 'packages/db/migrations/0105_configuracion_comunidad.sql', CF = 'apps/web/lib/config.ts', AC = 'apps/web/app/admin/acciones-config.ts', CO = 'apps/web/lib/comunidad.ts',
  MU = 'apps/web/app/(app)/comunidad/Muro.tsx', AP = 'apps/web/lib/apelaciones.ts', TR = 'apps/web/lib/traduccion.ts', AV = 'apps/web/app/(app)/cuenta/avisos/Avisos.tsx',
  NU = 'apps/web/app/(app)/comunidad/nuevo/Nuevo.tsx', CP = 'apps/web/app/panel/CuponesPanel.tsx', MC = 'apps/web/lib/moderacion-comun.ts', MO = 'apps/web/lib/moderacion.ts',
  AN = 'apps/web/lib/admin-analitica.ts', UI = 'apps/web/app/admin/Analitica.tsx', LO = 'apps/web/app/admin/acciones-contenido.ts', CT = 'apps/web/app/admin/Contenido.tsx', AU = 'apps/web/lib/autos.ts';
const casos = [
  // configDesdeUnLugar
  ['configDesdeUnLugar', CO, 'const EDITAR = cfgSql("com_editar_min");', 'const EDITAR = "30";\nexport const EDITAR_MIN = 30;'],
  ['configDesdeUnLugar', MU, 'E2("Ya pasó el tiempo para editarla: puedes borrarla y publicar otra."', 'E2("Ya pasaron 30 minutos: puedes borrarla y publicar otra."'],
  ['configDesdeUnLugar', AP, 'const DIAS = cfgSql("com_apelar_dias");', "const DIAS = `coalesce((select (value #>> '{}')::int from platform_config where key = 'com_apelar_dias'), 14)`;"],
  ['configDesdeUnLugar', TR, 'const TOPE = cfgSql("com_traduccion_hora");', "const TOPE = `(select (value #>> '{}')::int from platform_config where key = $9)`;"],
  ['configDesdeUnLugar', AV, 'E2(`A LAS ${hora12(horaResumen)}`, `AT ${hora12(horaResumen)}`)', 'E2("A LAS 7 PM", "AT 7 PM")'],
  ['configDesdeUnLugar', NU, '{diasEnc.map((d) =>', '{[1, 3, 7].map((d) =>'],
  ['configDesdeUnLugar', CP, 'dias: c.cup?.lista?.diasDef ?? 7 }', 'dias: 30 }'],
  ['configDesdeUnLugar', MC, '  votos: { key: "com_lim_votos", es: "votos", en: "votes" },', '  votos: { key: "com_lim_votos", def: 500, es: "votos", en: "votes" },'],
  ['configDesdeUnLugar', CF, '  | "pts_tope_dia"\n', '  | "pts_tope_dia" | "com_inventada"\n'],
  ['configDesdeUnLugar', AU, '${cfgSql(TOPE_KEY)} as tope,', "coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0) as tope,"],
  // configConLimites
  ['configConLimites', K, "('com_editar_min', 5, 1440, 30,", "('com_editar_min', 5, 1440, 3000,"],
  ['configConLimites', K, '  check (def >= min and def <= max),\n', ''],
  ['configConLimites', K, '  if v < c.min or v > c.max then raise exception', '  if v < c.min then raise exception'],
  ['configConLimites', K, "  return round(greatest(c.min, least(c.max, coalesce(v, c.def))))::integer;", "  return round(coalesce(v, c.def))::integer;"],
  ['configConLimites', CF, '    if (v < x.min || v > x.max) return { ok: false, msg: `Entre ${conUnidad(k, x.min, x.unit)} y ${conUnidad(k, x.max, x.unit)}.` };\n', ''],
  ['configConLimites', CF, '    if (!x.editable) return { ok: false, msg: `Todavía no se cambia aquí: ${x.bloqueo?.es ?? "un texto dice el número"}` };\n', ''],
  ['configConLimites', CF, '    await auditar(c, { actor, action: "config.cambiar"', '    void (c, { actor, action: "config.cambiar"'],
  ['configConLimites', AC, '  if (!s || s.role !== "admin" || !s.puede("sys", "editar")) return', '  if (!s || !s.puede("sys", "ver")) return'],
  // analiticaSinPersonas
  ['analiticaSinPersonas', AN, 'from com_analitica_dia_cache a where a.dia >= ${DESDE}', 'from com_analitica_dia_cache a join users u on u.home_city_id = a.city_id where a.dia >= ${DESDE}'],
  ['analiticaSinPersonas', AN, "`select k.negocio, ci.name as ciudad,", "`select k.negocio, (select author_user_id from com_posts limit 1) as autor, ci.name as ciudad,"],
  ['analiticaSinPersonas', AN, 'from com_activos_por_rango($1::text[],', 'from com_posts p, com_activos_por_rango($1::text[],'],
  ['analiticaSinPersonas', K, 'select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, x.business_id, b.name as negocio,', 'select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, x.business_id, x.user_id, b.name as negocio,'],
  ['analiticaSinPersonas', UI, '{ type: "note", tone: "info", icon: "lock", t: "Solo cifras por ciudad y día: nunca quién publicó, votó o canjeó." },', '{ type: "note", tone: "info", icon: "lock", t: "Solo cifras", cta: "Ver", onCta: () => router.push("/admin/usuarios") },'],
  // loteNoTocaOficial
  ['loteNoTocaOficial', LO, '    if (x.oficial || !x.autor) return "Es de la cuenta oficial: no se oculta en lote.";\n', ''],
  ['loteNoTocaOficial', LO, "${k === \"pub\" ? \"t.author_kind = 'official'\" : \"false\"} as oficial", 'false as oficial'],
  ['loteNoTocaOficial', CT, 'const r = await loteOcultarUno(x.k, x.id, motivo)', 'const r = await (x.k === "pub" ? pubOcultar(x.id, true, motivo) : loteOcultarUno(x.k, x.id, motivo))'],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
