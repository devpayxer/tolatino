// Prueba al revés de los guardianes de 8i: fichaEnLimites, mapaDeDatos (antes privacidadCoherente), sinCompraDigitalEnApp, borrarCuentaEnCadaApp y revisionAcotada
// (9a: sinProntoEnTienda se partió en dos; su al revés está en alreves9a). Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
// «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const FE = 'apps/mobile/tiendas/cliente/es.md', FEN = 'apps/mobile/tiendas/negocio/en.md', FM = 'apps/mobile/scripts/fichas.mjs', FJ = 'apps/mobile/tiendas/fichas.json', PL = 'apps/web/lib/tiendas/play.ts', AS = 'apps/web/lib/tiendas/asc.ts',
  FS = 'apps/web/lib/tiendas/fichas.ts', M = 'packages/db/migrations/0132_tiendas_fichas.sql', INV = 'apps/mobile/inventario-datos.json', GEN = 'apps/mobile/scripts/generar.mjs',
  XP = 'apps/mobile/ios/Targets/ToLatinoRepartidor/PrivacyInfo.xcprivacy', CSV = 'apps/mobile/tiendas/privacidad/data-safety-cliente.csv', PRIV = 'apps/web/app/(app)/privacidad/page.tsx',
  SEM = 'packages/db/seeds/inventario_datos.sql', CO = 'apps/web/app/panel/CuponesPanel.tsx', PRO = 'apps/web/app/panel/pro-cta.ts', PN = 'apps/web/app/panel/Panel.tsx', PLN = 'apps/web/app/panel/Plan.tsx',
  AC = 'apps/web/app/panel/acciones-cobros.ts', RG = 'apps/web/lib/tiendas/reglas.ts', PG = 'apps/web/app/panel/[id]/[[...r]]/page.tsx', AJ = 'apps/mobile/apps.json', PI = 'apps/web/app/(puerta)/puerta/Inicio.tsx',
  RP = 'apps/web/app/repartidor/Repartidor.tsx', RV = 'apps/web/lib/tiendas/revision.ts', CU = 'apps/web/lib/cuenta.ts', PA = 'apps/web/lib/pagos/pasarela.ts', PAGO = 'apps/web/app/(app)/pago/acciones.ts';
const casos = [
  // fichaEnLimites: un subtítulo largo, un emoji, un superlativo, una fuente que no existe, un tope aflojado, fichas.json viejo, Google a revisión, Apple fuera de la versión en preparación, enviar a revisión
  ['fichaEnLimites', FE, '# Subtítulo\nNegocios latinos de tu ciudad', '# Subtítulo\nNegocios latinos de tu ciudad y de tu barrio'],
  ['fichaEnLimites', FEN, 'is your business dashboard on To\'Latino', 'is your business dashboard on To\'Latino \u{1F680}'],
  ['fichaEnLimites', FE, 'reúne los negocios latinos de tu ciudad', 'reúne los mejores negocios latinos de tu ciudad'],
  ['fichaEnLimites', FE, 'fuentes: docs/ayuda/apps-de-to-latino.md,', 'fuentes: docs/ayuda/no-existe.md,'],
  ['fichaEnLimites', FM, 'google: { nombre: 30, corta: 80,', 'google: { nombre: 30, corta: 120,'],
  ['fichaEnLimites', FJ, '"name": "To\'Latino Negocios"', '"name": "To\'Latino Negocios Pro"'],
  ['fichaEnLimites', PL, '`${E}:commit?changesNotSentForReview=true`', '`${E}:commit`'],
  ['fichaEnLimites', AS, 'q("filter[appStoreState]", "PREPARE_FOR_SUBMISSION")', 'q("filter[appStoreState]", "READY_FOR_SALE")'],
  ['fichaEnLimites', FS, '  const detalle: ResSubir["detalle"] = [];', '  const detalle: ResSubir["detalle"] = []; void "/v1/reviewSubmissions";'],
  ['fichaEnLimites', M, 'subtitle    text check (char_length(subtitle) <= 30),', 'subtitle    text,'],
  // privacidadCoherente: rastreo, el xcprivacy a mano, el CSV viejo, /privacidad sin el inventario, la semilla vieja, una tabla que no existe, el patrón de columnas
  ['mapaDeDatos', INV, '"rastreo": false,', '"rastreo": true,'],
  ['mapaDeDatos', XP, '<string>NSPrivacyCollectedDataTypePreciseLocation</string>', '<string>NSPrivacyCollectedDataTypeCoarseLocation</string>'],
  ['mapaDeDatos', CSV, 'PSL_DATA_TYPES_PERSONAL,PSL_PHONE,true', 'PSL_DATA_TYPES_PERSONAL,PSL_PHONE,false'],
  ['mapaDeDatos', PRIV, '{I.categorias.map((c) => (', '{[].map((c: Cat) => ('],
  ['mapaDeDatos', SEM, "'telefono'", "'telefono2'"],
  ['mapaDeDatos', INV, '"search_logs.query"', '"search_logs.texto"'],
  ['mapaDeDatos', INV, '"users.email", ', ''],
  ['mapaDeDatos', GEN, 'poner(`${T}/PrivacyInfo.xcprivacy`, xcprivacy(a.key));', 'poner(`${T}/PrivacyInfo.xcprivacy`, xcprivacy("cliente"));'],
  ['mapaDeDatos', M, 'tracking        boolean not null default false check (tracking = false),', 'tracking        boolean not null default false,'],
  // sinCompraDigitalEnApp: un «Ver Pro» directo, ctaPro sin la compuerta, la hoja de compra sin compraPro, estadoPlan con un botón, planSeguir sin la compuerta, reglas que dan, el panel sin compraPro del servidor, otra puerta a seguirConPro
  ['sinCompraDigitalEnApp', CO, '...ctaPro(c, E2("Ver Pro", "See Pro")) });', 'cta: E2("Ver Pro", "See Pro"), onCta: () => c.go("pay", "plan") });'],
  ['sinCompraDigitalEnApp', PRO, 'return c.compraPro ? { cta: l, onCta: () => c.go("pay", "plan") } : {};', 'return { cta: l, onCta: () => c.go("pay", "plan") };'],
  ['sinCompraDigitalEnApp', PN, '{ui.planHoja && plan && plan.modo !== "apagado" && compraPro ? (', '{ui.planHoja && plan && plan.modo !== "apagado" ? ('],
  ['sinCompraDigitalEnApp', PN, 'plan = (l: string) => (c.compraPro ? { cta: l, onCta: () => c.go("pay", "plan") } : {});', 'plan = (l: string) => ({ cta: l, onCta: () => c.go("pay", "plan") });'],
  ['sinCompraDigitalEnApp', PLN, '  if (!c.compraPro) return estadoPlan(c, x);\n', ''],
  ['sinCompraDigitalEnApp', PLN, '  const out: Bloque[] = [{ type: "rows", items: [fila] }];', '  const out: Bloque[] = [{ type: "rows", items: [{ ...fila, acts: [{ l: "Volver a Pro", onClick: () => c.setUi({ planHoja: { ciclo: "month" } }) }] }] }];'],
  ['sinCompraDigitalEnApp', AC, '  if (!(await (await import("@/lib/tiendas/reglas")).compraDigitalAqui())) return no("Esto no está disponible en la app.", "This is not available in the app.");\n  const { seguirConPro }', '  const { seguirConPro }'],
  ['sinCompraDigitalEnApp', RG, '  return !(await deLaApp());', '  return true;'],
  ['sinCompraDigitalEnApp', PG, ' compraPro={await (await import("@/lib/tiendas/reglas")).compraDigitalAqui()}', ' compraPro={true}'],
  // borrarCuentaEnCadaApp: sacar /cuenta/ajustes del alcance común, el enlace de la Puerta, el de Negocios (Más y escritorio), el del Repartidor
  ['borrarCuentaEnCadaApp', AJ, '"comun": ["/entrar", "/recuperar", "/cuenta/ajustes", ', '"comun": ["/entrar", "/recuperar", '],
  ['borrarCuentaEnCadaApp', PI, 'chev: true, onClick: () => router.push("/cuenta/ajustes") }] });', 'chev: true, onClick: () => router.push("/soporte") }] });'],
  ['borrarCuentaEnCadaApp', PN, ', onClick: () => c.nav("/cuenta/ajustes") },', ', onClick: () => c.go("mas") },'],
  ['borrarCuentaEnCadaApp', PN, '{navIt(false, "shield", E2("Mi cuenta y ajustes", "My account and settings"), () => router.push("/cuenta/ajustes"))}', ''],
  ['borrarCuentaEnCadaApp', RP, 'onClick: () => router.push("/cuenta/ajustes") },', 'onClick: () => router.push("/repartidor") },'],
  // revisionAcotada: leer otra variable, sin la cuenta activa, sin el interruptor, sin la Fase 9 en producción, sin tope, mostrar el código, no revisar al verificar, un cobro sin la pregunta, guardar tarjeta, la base
  ['revisionAcotada', RV, 'export const CODE_REF = /^REVISION_CODIGO_(CLIENTE|NEGOCIO|REPARTIDOR|PUERTA)$/;', 'export const CODE_REF = /^[A-Z_]+$/;'],
  ['revisionAcotada', RV, '  if (!CODE_REF.test(codeRef)) return null;\n', ''],
  ['revisionAcotada', RV, '  if (!r.active) { await anotar(c, r.id, "rechazado", "cuenta desactivada", ip); return "normal"; }\n', ''],
  ['revisionAcotada', RV, '  if (!(await revisionEncendida(c))) { await anotar(c, r.id, "rechazado", "interruptor apagado", ip); return "normal"; }\n', ''],
  ['revisionAcotada', RV, '  if (ENTORNO === "produccion" && !on("app.tiendas.publico")) return false;\n', ''],
  ['revisionAcotada', RV, "cfg_int('revision_intentos_hora')", "cfg_int('fichas_subidas_dia')"],
  ['revisionAcotada', CU, '      return { reenviarEn: REENVIO_SEG };\n    }\n  }\n  const codigo', '      return { reenviarEn: REENVIO_SEG, codigoPrueba: rev.codigo };\n    }\n  }\n  const codigo'],
  ['revisionAcotada', CU, '    if (rev && !(await rev.codigoSigueValiendo(c, tel, ip))) {', '    if (rev && false) {'],
  ['revisionAcotada', PA, '  async cobrarFuera(x: { centavos: number; comision: number; destino: string; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> }): Promise<{ ok: true; id: string; marca: string | null; ultimos4: string | null } | { ok: false; codigo: string; mensaje: { es: string; en: string } }> {\n    { const rv = await pagoRevision(); if (rv) return { ok: false, codigo: "revision", mensaje: rv }; }\n', '  async cobrarFuera(x: { centavos: number; comision: number; destino: string; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> }): Promise<{ ok: true; id: string; marca: string | null; ultimos4: string | null } | { ok: false; codigo: string; mensaje: { es: string; en: string } }> {\n'],
  ['revisionAcotada', PAGO, '  if (await (await import("@/lib/tiendas/revision")).esCuentaRevision(u.id)) return no(', '  if (false) return no('],
  ['revisionAcotada', M, 'create trigger payment_methods_revision before insert on payment_methods', 'create trigger payment_methods_revision_x after update on payments'],
  ['revisionAcotada', M, "('app.revision.cuentas', false,", "('app.revision.cuentas', true,"],
];
const crear = [
  ['mapaDeDatos', 'packages/db/migrations/0999_prueba_alreves.sql', 'begin;\ncreate table if not exists vecinos_extra (\n  id bigint primary key,\n  contact_phone text\n);\ncommit;\n'],
  ['revisionAcotada', 'packages/db/seeds/zz_revision_prod.sql', "insert into review_accounts (app, user_id, purpose, code_ref) values ('cliente', '00000000-0000-0000-0000-000000000000', 'x', 'REVISION_CODIGO_CLIENTE');\n"],
  ['revisionAcotada', 'apps/web/lib/otro-revision.ts', 'export const x = () => process.env.REVISION_CODIGO_CLIENTE;\n'],
  ['sinCompraDigitalEnApp', 'apps/web/app/panel/OtraCompra.ts', 'import { seguirConPro } from "@/lib/suscripcion";\nexport const comprar = (n: string, u: string, pm: string) => seguirConPro(n, u, pm, "month");\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; } catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)); return [!!l, l || ('SE CAYÓ: ' + String(e.stderr).split('\n').find((x) => /Error/.test(x)))]; } };
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
// 9a · sinProntoEnTienda se partió en sinEnConstruccion y revisionVeCiudadAbierta: su prueba al revés vive en alreves9a.
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== total) process.exit(1);
