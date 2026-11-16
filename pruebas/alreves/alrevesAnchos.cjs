// Prueba al revés del bloque de anchos. anchoContraLaVentana: una prueba que mide «sin scroll de lado» contra 390 (no contra la ventana)
// (o un «ancho > w + 1» contra el ancho pedido) tiene que caer: con --dispositivo el contexto no es el que pidió la prueba.
// funcionConEsquema: biz_norm_name y ayuda_tsv llaman a sus funciones sin «public.» (el autovacuum las evalúa con search_path vacío).
// cookieSegura: la ciudad del Super Admin con NODE_ENV, la ciudad que miras y la invitación sin la marca.
// redireccionRelativa: /i/[code] con req.url, correo/baja con req.nextUrl.origin, irA sin el freno de «solo rutas propias».
// panelFondoInerte: el fondo sin inert, o la ventana del detalle metida dentro del fondo inerte.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  ['anchoContraLaVentana', 'pruebas/e2e/din2o.cjs', 'document.documentElement.scrollWidth - window.innerWidth); ok(w <= 0', 'document.documentElement.scrollWidth); ok(w <= 390'],
  ['anchoContraLaVentana', 'pruebas/e2e/vec9m.cjs', 'if (ancho > 1) malas.push', 'if (ancho > w + 1) malas.push'],
  ['redireccionRelativa', 'apps/web/app/i/[code]/route.ts', 'const r = irA("/entrar?volver=%2F", 307);', 'const r = NextResponse.redirect(new URL("/entrar?volver=%2F", req.url));'],
  ['redireccionRelativa', 'apps/web/app/api/correo/baja/route.ts', 'return irA("/cuenta/avisos");', 'return NextResponse.redirect(new URL("/cuenta/avisos", req.nextUrl.origin), 303);'],
  ['funcionConEsquema', 'packages/db/migrations/0171_funciones_con_esquema.sql', 'lower(public.tl_unaccent(coalesce(t, \'\')))', 'lower(tl_unaccent(coalesce(t, \'\')))'],
  ['funcionConEsquema', 'packages/db/migrations/0171_funciones_con_esquema.sql', "'english'::regconfig else 'spanish'::regconfig end, public.ayuda_sin_acentos(body)), 'C')", "'english'::regconfig else 'spanish'::regconfig end, ayuda_sin_acentos(body)), 'C')"],
  ['cookieSegura', 'apps/web/app/admin/acciones.ts', 'secure: await cookieSegura(), maxAge: 60 * 60 * 24 * 30', 'secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30'],
  ['cookieSegura', 'apps/web/app/(app)/ciudad/acciones.ts', ', httpOnly: true, secure: await cookieSegura() });', ', httpOnly: true });'],
  ['cookieSegura', 'apps/web/app/i/[code]/route.ts', ', httpOnly: true, secure: esHttps(req.headers) });', ', httpOnly: true });'],
  ['redireccionRelativa', 'apps/web/lib/ir-a.ts', '  if (!/^\\/(?![/\\\\])/.test(ruta)) throw new Error(`irA: solo rutas de To\'Latino («${ruta.slice(0, 40)}»)`);\n', ''],
  ['panelFondoInerte', 'apps/web/app/panel/Panel.tsx', '<div inert={modalOpen} aria-hidden={modalOpen || undefined} style={{ display: "contents" }}>', '<div style={{ display: "contents" }}>'],
  ['panelFondoInerte', 'apps/web/app/panel/Panel.tsx', '      ) : null}\n      </div>\n      {modalOpen ? (', '      ) : null}\n      {modalOpen ? ('],
];
const crear = [];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f, c] of crear) { const ruta = path.join(R, f); fs.writeFileSync(ruta, c); let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); } informe(G, `crear ${f.split('/').pop()}`, r); }
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
