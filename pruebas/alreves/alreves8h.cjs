// Prueba al revés de los guardianes de 8h (la tubería de las tiendas): oidcEstricto, versionCoherente, tiendaSoloProduccion (nuevos) y
// llavesFueraDelRepo, tiendasSimuladorAislado, libroSoloInsercion (ampliados) y flujosBienFormados (nuevo, lo cazó el CI). Se inyecta el defecto, el guardián debe fallar con SU mensaje;
// se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const O = 'apps/web/lib/tiendas/oidc.ts', T = 'apps/web/lib/tiendas/tuberia.ts', D = 'apps/web/lib/tiendas/direcciones.ts', M = 'packages/db/migrations/0131_tiendas_tuberia.sql',
  Y = '.github/workflows/tiendas.yml', CI = 'scripts/tiendas/ci.mjs', RO = 'apps/web/app/api/tiendas/oidc/route.ts', RB = 'apps/web/app/api/tiendas/build/route.ts',
  V = 'apps/mobile/versiones.json', AJ = 'apps/mobile/apps.json', PL = 'apps/mobile/plugins/tl-llave/ios/TLLlavePlugin.swift', G = 'apps/mobile/scripts/generar.mjs', BT = 'apps/web/lib/beta.ts';
const casos = [
  // oidcEstricto
  ['oidcEstricto', O, 'if (h.alg !== "RS256") return { ok: false, motivo: "alg" };', 'if (h.alg !== "RS256" && h.alg !== "HS256") return { ok: false, motivo: "alg" };'],
  ['oidcEstricto', O, 'if ("crit" in h || "jku" in h || "jwk" in h || "x5u" in h || "x5c" in h) return', 'if ("crit" in h) return'],
  ['oidcEstricto', O, 'if (c.repository !== REPO.nombre || String(c.repository_id) !== REPO.id) return', 'if (c.repository !== REPO.nombre) return'],
  ['oidcEstricto', O, 'if (c.environment !== REPO.entorno) return { ok: false, motivo: "entorno", c };', ''],
  ['oidcEstricto', O, 'if (c.ref_type !== "branch" || !esperado.ramas.includes(c.ref)) return', 'if (!c.ref.startsWith("refs/heads/")) return'],
  ['oidcEstricto', O, 'if (ahora > exp + HOLGURA_S) return { ok: false, motivo: "vencido", c };', 'if (ahora > exp + 86400) return { ok: false, motivo: "vencido", c };'],
  ['oidcEstricto', O, 'export const HOLGURA_S = 60;', 'export const HOLGURA_S = 3600;'],
  ['oidcEstricto', O, 'if (c.runner_environment !== "github-hosted") return { ok: false, motivo: "runner", c };', ''],
  ['oidcEstricto', O, 'llave.asymmetricKeyType !== "rsa" || bits < 2048) return', 'llave.asymmetricKeyType !== "rsa" || bits < 1024) return'],
  ['oidcEstricto', T, 'on conflict (jti) do nothing returning jti`', 'on conflict (jti) do update set at = now() returning jti`'],
  ['oidcEstricto', T, '  if (!nuevo) return no("jti_repetido", c);\n', ''],
  ['oidcEstricto', T, '  if (!llegoPorHttps(req)) return no("sin_https");\n', '  if (!llegoPorHttps(req) && !process.env.TIENDAS_HTTP_LOCAL) return no("sin_https");\n'],
  ['oidcEstricto', T, '  if (!PROD) return ["refs/heads/pruebas"];', '  if (!PROD) return ["refs/heads/pruebas", "refs/heads/produccion"];'],
  ['oidcEstricto', RB, '  const a = await autenticar(req, "build");\n  if (!a.ok) return NextResponse.json({ ok: false, motivo: a.motivo }, { status: a.status, headers: NO_CACHE });\n', '  const a = { ok: true as const, c: {} as never };\n'],
  ['oidcEstricto', M, "  if tg_op = 'UPDATE' then raise exception 'ci_oidc_jti: un jti usado no cambia'; end if;\n", ''],
  // versionCoherente: lo nativo cambia sin subir la versión; re-sellar; bajar la versión; el CI no la revisa
  ['versionCoherente', PL, 'CAPPluginMethod(name: "obtener", returnType: CAPPluginReturnPromise),', 'CAPPluginMethod(name: "obtener", returnType: CAPPluginReturnPromise), // cambio nativo'],
  ['versionCoherente', AJ, '"version": "1.0.0"', '"version": "1.0.1"'],
  ['versionCoherente', V, '"version": "1.0.0"', '"version": "0.9.0"'],
  ['versionCoherente', Y, '        run: node apps/mobile/scripts/version.mjs --verificar\n', '        run: echo nada\n'],
  // tiendaSoloProduccion
  ['tiendaSoloProduccion', M, "('app.tiendas.publico', false, ", "('app.tiendas.publico', true, "],
  ['tiendaSoloProduccion', M, "    if new.founder_ok_ref is null then raise exception 'tienda_solo_produccion: % pide la referencia del OK del fundador', new.kind; end if;\n", ''],
  ['tiendaSoloProduccion', M, "    if (new.flavor = 'produccion' or new.channel = 'tienda') and not coalesce((select enabled from feature_flags where key = 'app.tiendas.publico'), false) then", "    if false then"],
  ['tiendaSoloProduccion', Y, '    branches: [pruebas]\n', '    branches: [pruebas, produccion]\n'],
  ['tiendaSoloProduccion', G, 'if (SABOR === "produccion" && process.env.TL_PRODUCCION !== "fase9")', 'if (false)'],
  // llavesFueraDelRepo (ampliado: el flujo de las tiendas y el CI)
  ['llavesFueraDelRepo', Y, '  workflow_dispatch:\n    inputs:', '  pull_request_target:\n  workflow_dispatch:\n    inputs:'],
  ['llavesFueraDelRepo', Y, '  workflow_dispatch:\n    inputs:', '  pull_request:\n  workflow_dispatch:\n    inputs:'],
  ['llavesFueraDelRepo', Y, '          PEDIDO: ${{ inputs.pedido }}\n', '          PEDIDO: ${{ inputs.pedido }}\n          LLAVE: ${{ secrets.ASC_KEY }}\n'],
  ['llavesFueraDelRepo', Y, 'permissions:\n  contents: read\n\nconcurrency', 'permissions:\n  contents: read\n  id-token: write\n\nconcurrency'],
  ['llavesFueraDelRepo', Y, '    timeout-minutes: 10\n    environment: tiendas\n', '    timeout-minutes: 10\n'],
  ['llavesFueraDelRepo', Y, '      - name: Borrar las llaves\n        if: always()\n', '      - name: Borrar las llaves\n        if: success()\n'],
  ['llavesFueraDelRepo', CI, '  if (!BASE.startsWith("https://")) falla(`la tubería solo habla por HTTPS y la dirección es ${BASE}`);\n', ''],
  ['llavesFueraDelRepo', CI, '  console.log(`::add-mask::${j.value}`);\n', ''],
  ['llavesFueraDelRepo', CI, '    console.log(`  ✓ ${l.tipo} · huella ${String(l.huella).slice(0, 12)}…`);', '    console.log(`  ✓ ${l.tipo} · ${l.archivo}`);'],
  // tiendasSimuladorAislado
  ['tiendasSimuladorAislado', D, 'export const URL_JWKS = () => (!PROD && process.env.TIENDAS_OIDC_JWKS_URL ? process.env.TIENDAS_OIDC_JWKS_URL : JWKS_GITHUB);', 'export const URL_JWKS = () => (process.env.TIENDAS_OIDC_JWKS_URL ? process.env.TIENDAS_OIDC_JWKS_URL : JWKS_GITHUB);'],
  ['tiendasSimuladorAislado', D, 'export const URL_PLAY = () => (!PROD && process.env.PLAY_API_URL ? process.env.PLAY_API_URL : "https://androidpublisher.googleapis.com");', 'export const URL_PLAY = () => (process.env.PLAY_API_URL ?? "https://androidpublisher.googleapis.com");'],
  ['tiendasSimuladorAislado', BT, 'import { URL_ASC } from "./tiendas/direcciones";', 'const URL_ASC = () => process.env.ASC_API_URL ?? "https://api.appstoreconnect.apple.com";'],
  // flujosBienFormados (lo cazó el CI: corridas 43074283366 y 43072031036)
  ['flujosBienFormados', Y, '      ios: ${{ steps.p.outputs.ios }}\n', '      ios: ${{ steps.p.outputs.ios }}\n      ios: ${{ steps.p.outputs.ios }}\n'],
  ['flujosBienFormados', Y, '      VARIANTE: ${{ matrix.app.sabor }}\n', '      SABOR: ${{ matrix.app.sabor }}\n'],
  // libroSoloInsercion (8h)
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'ci_oidc_log es solo de inserción'; end if;\n", ''],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'un pedido de build no se borra'; end if;\n", ''],
];
const crear = [
  ['llavesFueraDelRepo', 'scripts/tiendas/AuthKey_ZX9Y8W7V6U.txt', 'no es una llave, pero se llama como una\n'],
  ['llavesFueraDelRepo', 'apps/mobile/android/app/upload-keystore.b64', 'MIIK\n'],
  ['llavesFueraDelRepo', 'scripts/tiendas/cuenta.json', '{"type":"service_account","private_key":"' + 'A'.repeat(240) + '"}\n'],
  ['llavesFueraDelRepo', 'apps/web/app/api/tiendas/leer.ts', 'import "server-only";\nimport { leer } from "../../../lib/tiendas/llavero";\nexport const x = () => leer("asc_api_key", "atajo");\n'],
  ['oidcEstricto', 'apps/web/app/api/tiendas/atajo/route.ts', 'import { NextResponse } from "next/server";\nexport const dynamic = "force-dynamic";\nexport async function POST(req: Request) {\n  const b = await req.json();\n  return NextResponse.json(b);\n}\n'],
  ['oidcEstricto', 'apps/web/lib/tiendas/otro-oidc.ts', 'import "server-only";\nimport { verificar, llavesDe } from "./oidc";\nexport const v = (t: string) => verificar(t, llavesDe("https://token.actions.githubusercontent.com/.well-known/jwks"), { ramas: ["refs/heads/main"] });\n'],
  ['oidcEstricto', 'apps/web/lib/tiendas/jti.ts', 'import "server-only";\nimport { db } from "../db";\nexport const usar = (j: string) => db().query(`insert into ci_oidc_jti (jti, exp, para) values ($1, now(), \'llaves\')`, [j]);\n'],
  ['tiendaSoloProduccion', 'apps/web/lib/tiendas/publicar.ts', 'import "server-only";\nimport { db } from "../db";\nexport const enviar = (b: string) => db().query(`insert into store_submissions (build_id, kind, by_kind, result) values ($1, \'revision_publica\', \'servidor\', \'enviado\')`, [b]);\n'],
  ['tiendaSoloProduccion', 'packages/db/migrations/0199_publico.sql', "begin;\nupdate feature_flags set enabled = true where key = 'app.tiendas.publico';\ncommit;\n"],
  ['libroSoloInsercion', 'apps/web/lib/tiendas/limpiar.ts', 'import "server-only";\nimport { db } from "../db";\nexport const limpiar = () => db().query(`delete from ci_oidc_log where ok`);\n'],
  // versionCoherente: un archivo nativo nuevo sin subir la versión
  ['versionCoherente', 'apps/mobile/plugins/tl-llave/ios/Nuevo.swift', 'import Foundation\n'],
];
let bien = 0, total = 0;
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)); return [!!l, l || ('SE CAYÓ: ' + String(e.stderr).split('\n').find((x) => /Error/.test(x)))]; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 160) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`, dir = require('path').dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 160) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== total) process.exit(1);
