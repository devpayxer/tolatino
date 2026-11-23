// Prueba al revés de las llaves de los proveedores en el llavero (23 nov; docs/REVISION.md «Cómo llegan las llaves de terceros al servidor»): un solo
// lector (llaveProveedorUnSoloLector), el valor nunca sale (llaveProveedorSinFuga), la lista cerrada dice «llavero» (secretoConDueno) y la contraparte de «Probar»
// vive solo en las pruebas (proveedoresSimuladorAislado). Se inyecta el
// defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const LP = 'apps/web/lib/llaves-proveedores.ts', LV = 'apps/web/lib/tiendas/llavero.ts', ST = 'apps/web/lib/pagos/stripe.ts', CP = 'apps/web/lib/compa/canales-proveedor.ts',
  WH = 'apps/web/app/api/stripe/webhook/route.ts', MC = 'apps/web/lib/compa/modelo-claude.ts', SES = 'apps/web/lib/correo/ses.ts', RT = 'apps/web/app/api/admin/llavero/route.ts',
  UIF = 'apps/web/app/admin/IntegracionesProveedores.tsx', PG = 'apps/web/app/admin/sistema/integraciones/page.tsx', BQ = 'packages/ui/src/panel/Bloques.tsx',
  SV = 'pruebas/servir/servir.sh', PU = 'pruebas/lib/puertos.cjs', SIM = 'scripts/proveedores-sim/sim.cjs', E2E = 'pruebas/e2e/prov9v.cjs',
  INS = 'apps/web/instrumentation.ts', MIG = 'packages/db/migrations/0213_llavero_proveedores.sql', SJ = 'infra/comun/secretos.json';
// [guardián, archivo, [[buscar, poner], …]]
const casos = [
  // llaveProveedorUnSoloLector: process.env a mano; el entorno ya no manda; la copia sin releer; el arranque no las carga; store_secrets sin aviso; el
  // lector consulta la base por su cuenta; el estado en una variable del módulo
  ['llaveProveedorUnSoloLector', ST, [['  const key = await llave("STRIPE_SECRET_KEY");\n  if (!key) throw new ErrorStripe("config", null, null, "Falta STRIPE_SECRET_KEY", 0);\n  const base = (process.env.STRIPE_API_BASE || "https://api.stripe.com")', '  const key = process.env.STRIPE_SECRET_KEY;\n  if (!key) throw new ErrorStripe("config", null, null, "Falta STRIPE_SECRET_KEY", 0);\n  const base = (process.env.STRIPE_API_BASE || "https://api.stripe.com")']]],
  ['llaveProveedorUnSoloLector', CP, [['  const n = llaveYa("TELNYX_FROM") ?? "";', '  const n = process.env["TELNYX_FROM"] ?? "";']]],
  ['llaveProveedorUnSoloLector', LP, [['  const v = delEntorno(n);\n  if (v) return v;\n  if (!sinBase() && (E.cargada', '  if (!sinBase() && (E.cargada']]],
  ['llaveProveedorUnSoloLector', LP, [['    releer: true,\n', '']]],
  ['llaveProveedorUnSoloLector', LP, [['const E: Estado = (G.__tlLlavesProveedor ??= {', 'let E: Estado = (G.__tlLlavesProveedor ??= {']]],
  ['llaveProveedorUnSoloLector', LP, [['const sinBase = () =>', 'import { db } from "./db";\nconst sinBase = () =>']]],
  ['llaveProveedorUnSoloLector', INS, [['Promise.all([edicionesE2(), prepararLlaves()])', 'Promise.all([edicionesE2()])']]],
  ['llaveProveedorUnSoloLector', MIG, [['create trigger store_secrets_avisa after insert or update on store_secrets for each statement execute function config_avisar();', '-- sin aviso']]],
  // llaveProveedorSinFuga: al registro, a un error, a un mensaje, a la respuesta; meta con algo de la llave; un mensaje que la repite; el lector que escribe;
  // origenes() con el valor; el campo que se ve; lo pegado que se queda; la página que pasa todo; el campo «oculto» que no es de contraseña
  ['llaveProveedorSinFuga', CP, [['      const key = await llaveDe("TELNYX_API_KEY");\n      if (!key) return { ok: false, error: "sin_llave" };', '      const key = await llaveDe("TELNYX_API_KEY");\n      console.log("telnyx", key);\n      if (!key) return { ok: false, error: "sin_llave" };']]],
  ['llaveProveedorSinFuga', MC, [['    if (!clave) throw new ErrorModelo("error", false, "sin clave");', '    if (!clave || clave.length < 20) throw new ErrorModelo("error", false, `clave rara ${clave}`);']]],
  ['llaveProveedorSinFuga', SES, [['  if (!key || !secret) return { ok: false, error: "sin_llave" };\n  const f = firmarV4({ method: "POST"', '  if (!key || !secret) return { ok: false, error: `sin_llave ${secret}` };\n  const f = firmarV4({ method: "POST"']]],
  ['llaveProveedorSinFuga', WH, [['  if (!secreto || !firmaValida(cuerpo, req.headers.get("stripe-signature"), secreto)) return new NextResponse("firma", { status: 400 });', '  if (!secreto || !firmaValida(cuerpo, req.headers.get("stripe-signature"), secreto)) return NextResponse.json({ ok: false, esperado: secreto }, { status: 400 });']]],
  ['llaveProveedorSinFuga', RT, [['  return NextResponse.json({ ok: true, huella: r.huella, version: r.version, msg: `${TIPOS[tipo].es}: versión ${r.version} guardada.`, en:', '  return NextResponse.json({ ok: true, valor: rev.valor, huella: r.huella, version: r.version, msg: `${TIPOS[tipo].es}: versión ${r.version} guardada.`, en:']]],
  ['llaveProveedorSinFuga', LV, [['    meta.modo = m[2] === "live" ? "real" : "prueba";', '    meta.modo = m[2] === "live" ? "real" : "prueba";\n    meta.ultimos = v.slice(-4);']]],
  ['llaveProveedorSinFuga', LV, [['e = mal("No es un token de Meta (empieza con EA).",', 'e = mal(`No es un token de Meta: ${v}`,']]],
  ['llaveProveedorSinFuga', LP, [['export function olvidarLlaves(): void {', 'export function olvidarLlaves(): void { console.info("llaves olvidadas");']]],
  ['llaveProveedorSinFuga', LP, [['      huella: env ? createHash', '      valor: env ?? ll?.valor ?? null,\n      huella: env ? createHash']]],
  ['llaveProveedorSinFuga', UIF, [['max: 4096, oculto: true,', 'max: 4096,']]],
  ['llaveProveedorSinFuga', UIF, [['    setValor("");\n', '']]],
  ['llaveProveedorSinFuga', PG, [['origenes={orig.map((o) => ({ tipo: o.tipo, origen: o.origen, huella: o.huella, sombra: o.sombra }))}', 'origenes={orig}']]],
  ['llaveProveedorSinFuga', BQ, [['b.oculto ? { type: "password", autoComplete: "off"', 'b.oculto ? { type: "text", autoComplete: "off"']]],
  // secretoConDueno (ampliado): una llave que el lector busca en el llavero y la lista no lo dice; «llavero» fuera de «sellado»; el tipo equivocado; la base
  // que no acepta un tipo
  ['secretoConDueno', SJ, [[', "llavero": "telnyx_api_key" }', ' }']]],
  ['secretoConDueno', SJ, [['"WHATSAPP_WABA_ID": { "origen": "sellado", "maquina": "app", "recuperacion": false, "llavero": "whatsapp_waba_id" }', '"WHATSAPP_WABA_ID": { "origen": "config", "llavero": "whatsapp_waba_id" }']]],
  ['secretoConDueno', SJ, [['"llavero": "ses_secret_access_key"', '"llavero": "ses_secret_key"']]],
  ['secretoConDueno', MIG, [["'correo_sns_tema', 'anthropic_api_key'));", "'correo_sns_tema'));"]]],
  // proveedoresSimuladorAislado (la contraparte de «Probar»): servir.sh sin una de las tres direcciones; una dirección que ya no está «prohibida» en producción; un puerto que
  // falta en la tabla; el simulador que escucha en todas las interfaces, que lee el entorno o que anota el valor de la llave en vez de su huella; prov9v que ya no lo usa
  ['proveedoresSimuladorAislado', SV, [['TELNYX_API_BASE=http://127.0.0.1:$P_PROVTELNYX ', '']]],
  ['proveedoresSimuladorAislado', SV, [[' WHATSAPP_API_BASE=http://127.0.0.1:$P_PROVMETA', '']]],
  ['proveedoresSimuladorAislado', SV, [['STRIPE_API_BASE=http://127.0.0.1:$P_PROVSTRIPE', 'STRIPE_API_BASE=http://127.0.0.1:$PUERTO_FIJO']]],
  ['proveedoresSimuladorAislado', SJ, [['"WHATSAPP_API_BASE": { "origen": "prohibida" }', '"WHATSAPP_API_BASE": { "origen": "config" }']]],
  ['proveedoresSimuladorAislado', SJ, [['"STRIPE_API_BASE": { "origen": "prohibida" },\n', '']]],
  ['proveedoresSimuladorAislado', PU, [['provTelnyx: 4411, ', '']]],
  ['proveedoresSimuladorAislado', SIM, [["host = '127.0.0.1'", "host = '0.0.0.0'"]]],
  ['proveedoresSimuladorAislado', SIM, [["async function iniciar(puertos, host", "const raiz = process.env.HOME;\nasync function iniciar(puertos, host"]]],
  ['proveedoresSimuladorAislado', SIM, [['huella: h ? huella(h) : null, estado }', 'huella: h, estado }']]],
  ['proveedoresSimuladorAislado', E2E, [["require('../../scripts/proveedores-sim/sim.cjs')", "require('../../scripts/contrato-tiendas/prueba.cjs')"]]],
];
const crear = [
  // proveedoresSimuladorAislado: la app nombrando el simulador de las pruebas
  ['proveedoresSimuladorAislado', 'apps/web/lib/zzsim1.ts', 'import "server-only";\n// ver scripts/proveedores-sim/sim.cjs\nexport const s = 1;\n', /proveedores-sim/],
  // llaveProveedorUnSoloLector: desestructurar de process.env; un alias de process.env; abrir las llaves fuera del lector
  ['llaveProveedorUnSoloLector', 'apps/web/lib/zzllaves1.ts', 'import "server-only";\nconst { TELNYX_API_KEY } = process.env;\nexport const x = TELNYX_API_KEY ?? "";\n', /desestructura/],
  ['llaveProveedorUnSoloLector', 'apps/web/lib/zzllaves2.ts', 'import "server-only";\nconst e = process.env;\nexport const y = () => e.SES_SECRET_ACCESS_KEY ?? "";\n', /alias de process\.env/],
  ['llaveProveedorUnSoloLector', 'apps/web/lib/zzllaves3.ts', 'import "server-only";\nimport { leerProveedores } from "./tiendas/llavero";\nexport const z = () => leerProveedores(new Set());\n', /leerProveedores/],
  // llaveProveedorSinFuga: una llave a la auditoría, desde un archivo nuevo
  ['llaveProveedorSinFuga', 'apps/web/lib/zzllaves4.ts', 'import "server-only";\nimport { llave } from "./llaves-proveedores";\nimport { auditar } from "./admin";\nexport async function w(c: never) { const k = await llave("WHATSAPP_TOKEN"); await auditar(c, { actor: "x", action: "y", targetKind: "z", after: { k } }); }\n', /\(k\)/],
];
let bien = 0, total = 0;
const correr = (g, debe = null) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`) && (!debe || debe.test(x))) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
const ok = (x, m) => { total++; if (x) bien++; console.log(`  ${x ? '✓' : '✗'} ${m}`); };

// Antes de inyectar: los tres guardianes pasan limpios (si no, «falla» no probaría nada).
for (const g of ['llaveProveedorUnSoloLector', 'llaveProveedorSinFuga', 'secretoConDueno', 'proveedoresSimuladorAislado']) ok(!correr(g)[0], `${g} pasa limpio antes de inyectar`);

for (const [g, f, cambios] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  const falta = cambios.find(([a]) => !orig.includes(a));
  if (falta) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${falta[0].slice(0, 70)}`); continue; }
  let t = orig; for (const [a, b] of cambios) t = t.replace(a, () => b);
  fs.writeFileSync(ruta, t);
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c, debe] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g, debe); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}

console.log(`\nalrevesllaves: ${bien}/${total}`);
if (bien !== total) process.exit(1);
