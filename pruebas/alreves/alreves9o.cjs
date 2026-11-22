// Prueba al revés de los guardianes de 9o (producción como código y ensayada: el mismo paquete, producción solo avanza, migraciones que permiten
// volver, el sobre sellado solo para su servidor, cada secreto con dueño, la restauración de prueba, la página de mantenimiento, y semilla y modoPruebas
// ampliados a producción). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre
// y se borra. Las llaves age de los casos se hacen al vuelo (nunca una llave escrita en el repo).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const DP = 'infra/pruebas/deploy.sh', DD = 'infra/produccion/deploy.sh', CA = 'infra/produccion/compose-app.yml', CF = 'infra/produccion/compose-app-fijos.yml',
  CB = 'infra/produccion/compose-base.yml', SY = 'infra/produccion/tolatino-sync', PR = 'scripts/produccion/promover.sh', M = 'packages/db/migrations/0145_despliegues.sql',
  SE = 'infra/comun/sellado.sh', LS = 'infra/comun/secretos.json', LB = 'infra/comun/lib.sh', RP = 'infra/comun/respaldos/restaurar-prueba.sh',
  RG = 'infra/comun/monitoreo/reglas.yml', RC = 'apps/web/lib/sistema/respaldos-comun.ts', BA = 'apps/web/lib/barrido.ts', MH = 'infra/comun/mantenimiento/index.html',
  NG = 'infra/produccion/nginx-produccion.conf';
const casos = [
  // mismoPaquete: el sandbox deja de cargar el registro común
  ['mismoPaquete', DP, '. "$REPO/infra/comun/registro.sh"\n', '\n'],
  // … producción construye la app con otra receta
  ['mismoPaquete', DD, '-f "$REPO/infra/pruebas/Dockerfile"', '-f "$REPO/infra/produccion/Dockerfile"'],
  // … un servicio de producción que el sandbox no tiene (fuera de la lista cerrada)
  ['mismoPaquete', CF, '  # Prometheus (en la réplica) mide esta máquina', '  redis:\n    image: redis:7.4.1\n    restart: unless-stopped\n\n  # Prometheus (en la réplica) mide esta máquina'],
  // … la app de producción lee una variable que la del sandbox no
  ['mismoPaquete', CA, '      TOLATINO_COLOR: ${TOLATINO_COLOR:-azul}\n', '      TOLATINO_COLOR: ${TOLATINO_COLOR:-azul}\n      MODO_RARO: "1"\n'],
  // … el barrido de producción no es el del sandbox
  ['mismoPaquete', CF, "setTimeout(go,30000);setInterval(go,60000)", "setTimeout(go,30000);setInterval(go,600000)"],
  // … el traductor de producción con otra versión
  ['mismoPaquete', CF, '  traductor:\n    image: libretranslate/libretranslate:v1.9.6', '  traductor:\n    image: libretranslate/libretranslate:v1.9.5'],
  // … las órdenes del ensayo corren en cualquier entorno
  ['mismoPaquete', DD, 'if [ "$TOLATINO_ENTORNO" = ensayo ]; then\n  if [ -f "$REPO/infra/ensayo/ordenes/', 'if true; then\n  if [ -f "$REPO/infra/ensayo/ordenes/'],
  // produccionSoloAvanza: el servidor acepta una rama que reescribe la historia
  ['produccionSoloAvanza', SY, 'if [ -f "$STATE/last-deploy" ] && ! git merge-base --is-ancestor "$LOCAL" "$REMOTE" 2>/dev/null; then', 'if false; then'],
  // … despliega sin la etiqueta del OK del fundador
  ['produccionSoloAvanza', SY, '    [ -n "$OK_TAG" ] || RECHAZO="${RECHAZO:-sin la etiqueta ok-produccion/* (el OK del fundador)}"\n', ''],
  // … despliega un commit que no pasó por pruebas
  ['produccionSoloAvanza', SY, '    git merge-base --is-ancestor "$REMOTE" origin/pruebas 2>/dev/null || RECHAZO="el commit no pasó por pruebas"\n', ''],
  // … promover.sh empuja a la fuerza
  ['produccionSoloAvanza', PR, 'git push -q origin "$C:refs/heads/produccion"', 'git push -q --force origin "$C:refs/heads/produccion"'],
  // 22 nov · … promover.sh vuelve a aceptar CUALQUIER corrida verde con ese commit, o no pregunta
  ['produccionSoloAvanza', PR, 'node "$(dirname "$0")/../ci/corrida.mjs" --produccion "$C" || { echo "✗ $C no tiene una corrida entera del CI en verde: no sube a produccion"; exit 1; }',
    'v=$(gh run list --workflow ci.yml --commit "$C" --json conclusion,status --jq \'[.[] | select(.status == "completed")] | (map(select(.conclusion == "success")) | length)\' 2>/dev/null || echo 0)\n[ "${v:-0}" -ge 1 ] || { echo "✗ $C no tiene una corrida del CI en verde"; exit 1; }'],
  ['produccionSoloAvanza', PR, 'node "$(dirname "$0")/../ci/corrida.mjs" --produccion "$C" || { echo', 'node "$(dirname "$0")/../ci/corrida.mjs" --produccion "$C" || true || { echo'],
  // … qué corrida vale: un segundo intento, un pull_request, una corrida a mano con «solo», la confirmación a medias, sin la nota de AD
  ['produccionSoloAvanza', 'scripts/ci/corrida.mjs', 'if (r.run_attempt !== 1) return no(', 'if (r.run_attempt === 0) return no('],
  ['produccionSoloAvanza', 'scripts/ci/corrida.mjs', '["push", "schedule", "workflow_dispatch"].includes(r.event)', '["push", "schedule", "workflow_dispatch", "pull_request"].includes(r.event)'],
  ['produccionSoloAvanza', 'scripts/ci/corrida.mjs', 'if (entradas.length !== 1 || !ENTRADAS_ENTERAS.test(entradas[0])) return no(', 'if (entradas.length > 9) return no('],
  ['produccionSoloAvanza', 'scripts/ci/corrida.mjs', 'if (!fases.ok && !conf.every((c) => c.ok)) return no(', 'if (!fases.ok && !conf.some((c) => c.ok)) return no('],
  ['produccionSoloAvanza', 'scripts/ci/corrida.mjs', 'PENDIENTE (lo decide el fundador): la «confirmación completa» de la decisión AD', 'la confirmación completa'],
  ['produccionSoloAvanza', '.github/workflows/ci.yml', ' · solo=«${{ inputs.solo }}» · aprobar=', ' · aprobar='],
  // … la base deja anotar un despliegue de producción sin el OK
  ['produccionSoloAvanza', M, "  check (entorno <> 'produccion' or founder_ok_ref is not null),\n", ''],
  // selladoSoloSuServidor: el servidor abre sobres fuera de la lista cerrada
  ['selladoSoloSuServidor', SE, `if ! [[ "$n" =~ ^[A-Z][A-Z0-9_]{2,60}$ ]] || ! sellado_permitido "$n" "$lista"; then`, `if ! [[ "$n" =~ ^[A-Z][A-Z0-9_]{2,60}$ ]]; then`],
  // … el valor de un sobre se imprime en el registro
  ['selladoSoloSuServidor', SE, '      echo "$n · abierto" >> "$estado.tmp"; bien=$((bien + 1))', '      echo "$n · abierto"; echo "$v"; bien=$((bien + 1))'],
  // secretoConDueno: una variable sin dueño en la app de producción
  ['secretoConDueno', CA, '      ALERTA_TOKEN: ${ALERTA_TOKEN}\n', '      ALERTA_TOKEN: ${ALERTA_TOKEN}\n      LLAVE_NUEVA: ${LLAVE_NUEVA}\n'],
  // … una prohibida (el simulador de pagos) en la base de producción
  ['secretoConDueno', CB, '      TZ: America/New_York\n', '      TZ: America/New_York\n      SIM: ${TOLATINO_PAGOS_SIMULADOR:-}\n'],
  // … DATOS_SECRET fuera del sobre de recuperación (una máquina reconstruida no leería op_private)
  ['secretoConDueno', LS, '"DATOS_SECRET": { "origen": "servidor", "maquina": "app", "recuperacion": true }', '"DATOS_SECRET": { "origen": "servidor", "maquina": "app", "recuperacion": false }'],
  // … una llave que nace en el servidor sin receta
  ['secretoConDueno', LB, '    VAPID_PRIVADA) openssl ecparam', '    VAPID_PRIVADA_X) openssl ecparam'],
  // respaldoRestaurado: la restauración de prueba deja de programarse cada semana
  ['respaldoRestaurado', DD, '  temporizador restauracion-prueba "Sun *-*-* 05:20:00" "bash $REPO/infra/comun/respaldos/restaurar-prueba.sh"\n', ''],
  // … la base restaurada no se destruye
  ['respaldoRestaurado', RP, 'docker volume rm -f "$C" >/dev/null 2>&1; }', ': ; }'],
  // … sin migrar.sh --verificar
  ['respaldoRestaurado', RP, 'bash "$REPO/packages/db/migrar.sh" --verificar', 'bash "$REPO/packages/db/migrar.sh"'],
  // … la alerta llega a los 30 días
  ['respaldoRestaurado', RG, 'expr: tolatino_restauracion_dias > 8 or', 'expr: tolatino_restauracion_dias > 30 or'],
  ['respaldoRestaurado', RC, 'export const SIN_RESTAURAR_DIAS = 8;', 'export const SIN_RESTAURAR_DIAS = 30;'],
  // … el barrido deja de vigilar los respaldos
  ['respaldoRestaurado', BA, ', ["respaldosVigilar", async () => (await import("./sistema/despliegues")).vigilarRespaldos()]', ''],
  // mantenimientoFijo: la página dice otra cosa que la línea fija
  ['mantenimientoFijo', MH, 'Estamos haciendo un cambio. Volvemos en unos minutos.', 'Estamos en mantenimiento.'],
  // … nginx deja de mostrarla con la app caída
  ['mantenimientoFijo', NG, '    error_page 502 503 504 /mantenimiento.html;\n', ''],
  // … la ventana corta también la API (los webhooks de Stripe)
  ['mantenimientoFijo', NG, 'if ($uri ~ ^/(api|admin|entrar|', 'if ($uri ~ ^/(admin|entrar|'],
  // semilla (ampliado): producción alcanza la semilla de pruebas
  ['semilla', DD, '  indexar_docs "$REPO" "${PSQL[@]}"\n', '  indexar_docs "$REPO" "${PSQL[@]}"\n  SEMILLA_DIR="$REPO/infra/pruebas/semilla" bash "$REPO/packages/db/migrar.sh" --semilla-pruebas bash "$REPO/infra/comun/psql-remoto.sh"\n'],
  // modoPruebas (ampliado): el código de entrada en modo pruebas en producción
  ['modoPruebas', CA, '      TOLATINO_SMS_MODO: telnyx\n', '      TOLATINO_SMS_MODO: pruebas\n'],
  // … el simulador de pagos encendido en producción
  ['modoPruebas', CA, '      TOLATINO_COMPA: ${TOLATINO_COMPA:-}\n', '      TOLATINO_COMPA: ${TOLATINO_COMPA:-}\n      TOLATINO_PAGOS_SIMULADOR: "1"\n'],
];
const llavePrivadaFalsa = 'AGE-SECRET-KEY-' + '1' + 'Q'.repeat(58);
const crear = [
  // mismoPaquete: las órdenes del ensayo en main
  ['mismoPaquete', 'infra/ensayo/ordenes/base.sh', 'echo hola\n'],
  // produccionSoloAvanza: un flujo de GitHub que empuja a produccion
  ['produccionSoloAvanza', '.github/workflows/zz9o.yml', 'name: zz\non: { workflow_dispatch: {} }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: git push origin HEAD:produccion\n'],
  // migracionReversible: se borra una columna que el código todavía lee
  ['migracionReversible', 'packages/db/migrations/0199_zz9o.sql', 'begin;\nalter table deploy_releases drop column if exists founder_ok_ref;\ncommit;\n'],
  // … se renombra una columna que el código todavía lee
  ['migracionReversible', 'packages/db/migrations/0199_zz9o.sql', 'begin;\nalter table incident_log rename column manual_ref to manual_x;\ncommit;\n'],
  // … se borra una tabla que el código todavía lee
  ['migracionReversible', 'packages/db/migrations/0199_zz9o.sql', 'begin;\ndrop table if exists maintenance_windows;\ncommit;\n'],
  // selladoSoloSuServidor: un sobre que no es age
  ['selladoSoloSuServidor', 'infra/produccion/sellado/app/STRIPE_SECRET_KEY.age', 'no es un sobre\n'],
  // … algo que no es una llave pública ni un sobre en sellado/
  ['selladoSoloSuServidor', 'infra/produccion/sellado/notas.txt', 'apuntes\n'],
  // … una llave PRIVADA age en el repo
  ['selladoSoloSuServidor', 'infra/comun/zz9o.txt', `${llavePrivadaFalsa}\n`],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dirs = [];
  for (let d = path.dirname(ruta); !fs.existsSync(d); d = path.dirname(d)) dirs.push(d);
  fs.mkdirSync(path.dirname(ruta), { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); for (const d of dirs) try { fs.rmdirSync(d); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').slice(-2).join('/')}`, r);
}
// selladoSoloSuServidor: un sobre age DE VERDAD, pero cifrado para OTRA llave que la publicada de su máquina (no abriría en su servidor).
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alreves9o-'));
  const L = path.join(R, 'infra/produccion/sellado/llaves.json'), S = path.join(R, 'infra/produccion/sellado/sobres.json'), A = path.join(R, 'infra/produccion/sellado/app/STRIPE_SECRET_KEY.age');
  const oL = fs.readFileSync(L, 'utf8'), oS = fs.readFileSync(S, 'utf8');
  try {
    execSync(`age-keygen -o ${tmp}/a.key 2>/dev/null; age-keygen -o ${tmp}/b.key 2>/dev/null`);
    const pa = execSync(`age-keygen -y ${tmp}/a.key`, { encoding: 'utf8' }).trim(), pb = execSync(`age-keygen -y ${tmp}/b.key`, { encoding: 'utf8' }).trim();
    const huella = (k) => crypto.createHash('sha256').update(k).digest('hex').slice(0, 32);
    fs.mkdirSync(path.dirname(A), { recursive: true });
    execSync(`printf x | age -r ${pb} -o ${A}`);
    fs.writeFileSync(L, JSON.stringify({ app: pa }, null, 2));
    fs.writeFileSync(S, JSON.stringify({ 'app/STRIPE_SECRET_KEY': { para: huella(pb), sellado: '2026-11-14', origen: 'prueba' } }, null, 2));
    informe('selladoSoloSuServidor', 'un sobre age de verdad cifrado para otra llave', correr('selladoSoloSuServidor'));
  } catch (e) { total++; console.log(`  ✗ selladoSoloSuServidor: no se pudo armar el caso (${e.message.slice(0, 80)})`); }
  finally { fs.writeFileSync(L, oL); fs.writeFileSync(S, oS); try { fs.unlinkSync(A); fs.rmdirSync(path.dirname(A)); } catch { /* */ } fs.rmSync(tmp, { recursive: true, force: true }); }
}
// 22 nov · promover.sh de verdad (en seco), en un repo de mentira con su «origin», y un «gh» de mentira que contesta la API de GitHub con las
// corridas de cada caso (aquí nunca se llama a GitHub). Solo con una corrida entera, en main, de primer intento y con todo en verde sale ✓.
if (!process.env.ALREVES_SOLO_TEXTOS) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alreves9o-promover-'));
  try {
    const sh = (c, cwd = tmp) => execSync(c, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'p', GIT_AUTHOR_EMAIL: 'p@ejemplo.invalid', GIT_COMMITTER_NAME: 'p', GIT_COMMITTER_EMAIL: 'p@ejemplo.invalid' } });
    sh('git init -q --bare origen.git && git init -q -b main repo');
    const repo = path.join(tmp, 'repo');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
    sh('git add -A && git -c commit.gpgsign=false commit -q -m a && git remote add origin ../origen.git && git push -q origin main main:pruebas', repo);
    const C = sh('git rev-parse HEAD', repo).trim();
    fs.mkdirSync(path.join(tmp, 'bin'));
    fs.writeFileSync(path.join(tmp, 'bin', 'gh'), `#!/usr/bin/env node
const m = JSON.parse(require('fs').readFileSync(process.env.GH_MUNDO, 'utf8')), a = process.argv.slice(2), ruta = a[a.length - 1];
if (m.cae) { console.error('gh: HTTP 503'); process.exit(1); }
if (a[0] !== 'api') { console.error('gh de mentira: solo api'); process.exit(1); }
let x = /actions\\/workflows\\/ci\\.yml\\/runs\\?head_sha=/.test(ruta) ? { workflow_runs: m.corridas } : null;
const t = /actions\\/runs\\/(\\d+)\\/attempts\\/1\\/jobs/.exec(ruta); if (t) { const js = m.trabajos[t[1]] ?? []; x = { total_count: js.length, jobs: js }; }
if (!x) { console.error('gh de mentira: ruta desconocida ' + ruta); process.exit(1); }
console.log(JSON.stringify(x));
`, { mode: 0o755 });
    const RPO = 'dueno/repo', DSP = ['iphone-se', 'iphone-15', 'iphone-15-pro-max', 'pixel', 'galaxy', 'ipad', 'escritorio-1024', 'escritorio-1280', 'escritorio-1440'];
    const j = (name, conclusion = 'success', steps) => ({ name, status: 'completed', conclusion, ...(steps ? { steps } : {}) });
    const ent = (t = 'entradas: alcance=todo · solo=«» · aprobar=no · medir=no') => [{ name: 'Run actions/checkout@v4' }, { name: t }];
    const trabajos = (e) => [j('alcance (todo o solo documentos)', 'success', ent(e)), j('tipos · build · guardianes'), j('seguridad · Semgrep (reglas propias) · dependencias'), j('web · build una vez para todos los grupos'),
      ...[1, 2, 3, 4].flatMap((i) => [j(`punta a punta · al revés · ${i}/4`), j(`punta a punta · todas las fases · ${i}/4`)]), ...DSP.map((d) => j(`dispositivo · ${d}`)),
      j('confirmación · ${{ matrix.nombre }}', 'skipped'), j('punta a punta · ancho ${{ matrix.id }}', 'skipped'), j('la tubería (verde si todo lo que esta corrida pide salió en verde; el resumen dice qué no corrió)')];
    const corrida = (x = {}) => ({ id: 41, head_sha: C, event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', repository: { full_name: RPO }, head_repository: { full_name: RPO }, run_attempt: 1, status: 'completed', conclusion: 'success', ...x });
    const DOCS = /^(web|punta a punta · (al revés|todas las fases)|dispositivo) /;
    const CP = [
      ['una corrida de push entera y en verde', { corridas: [corrida()], trabajos: { 41: trabajos() } }, true],
      ['sin corridas', { corridas: [], trabajos: {} }, false],
      ['la API cae', { cae: true }, false],
      ['solo una corrida de solo documentos (carriles saltados)', { corridas: [corrida()], trabajos: { 41: trabajos().map((x) => (DOCS.test(x.name) ? j(x.name, 'skipped') : x)) } }, false],
      ['solo una corrida a mano con «solo»', { corridas: [corrida({ event: 'workflow_dispatch' })], trabajos: { 41: trabajos('entradas: alcance=todo · solo=«sql9u» · aprobar=no · medir=no') } }, false],
      ['solo una corrida a mano de pantallas', { corridas: [corrida({ event: 'workflow_dispatch' })], trabajos: { 41: trabajos('entradas: alcance=pantallas · solo=«» · aprobar=no · medir=no').map((x) => (/^punta a punta · (al|todas)/.test(x.name) ? j(x.name, 'skipped') : x)) } }, false],
      ['solo una de pull_request', { corridas: [corrida({ event: 'pull_request', head_branch: 'trabajo' })], trabajos: { 41: trabajos() } }, false],
      ['solo una de otra rama', { corridas: [corrida({ head_branch: 'trabajo' })], trabajos: { 41: trabajos() } }, false],
      ['solo un segundo intento en verde', { corridas: [corrida({ run_attempt: 2 })], trabajos: { 41: trabajos() } }, false],
      ['un dispositivo que falta', { corridas: [corrida()], trabajos: { 41: trabajos().filter((x) => x.name !== 'dispositivo · galaxy') } }, false],
      ['una parte de «al revés» saltada', { corridas: [corrida()], trabajos: { 41: trabajos().map((x) => (x.name === 'punta a punta · al revés · 3/4' ? j(x.name, 'skipped') : x)) } }, false],
      ['la lista de trabajos llega incompleta', { corridas: [corrida()], trabajos: {} }, false],
      ['una parcial y después una entera', { corridas: [corrida({ id: 40, event: 'workflow_dispatch' }), corrida()], trabajos: { 40: trabajos('entradas: alcance=regresion · solo=«» · aprobar=no · medir=no'), 41: trabajos() } }, true],
    ];
    for (const [que, mundo, ok] of CP) {
      const M = path.join(tmp, 'mundo.json'); fs.writeFileSync(M, JSON.stringify(mundo));
      let sale = 0, out = '';
      try { out = execSync(`bash ${JSON.stringify(path.join(R, PR))} ${C} "OK de prueba" 2026-11-22`, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: `${path.join(tmp, 'bin')}:${process.env.PATH}`, GH_MUNDO: M, REPO: RPO, PROMOVER_SECO: '1', GIT_CONFIG_GLOBAL: '/dev/null' } }); }
      catch (e) { sale = e.status; out = String(e.stdout) + String(e.stderr); }
      const bien1 = ok ? sale === 0 && /✓ \(seco\)/.test(out) : sale !== 0 && !/✓ \(seco\)/.test(out);
      total++; if (bien1) bien++;
      console.log(`  ${bien1 ? '✓' : '✗'} promover.sh (seco): ${que} → ${ok ? 'pasa' : 'no pasa'}${bien1 ? '' : ` · salió ${sale}: ${out.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 200)}`}`);
    }
  } catch (e) { total++; console.log(`  ✗ promover.sh: no se pudo armar el repo de mentira (${String(e.message).slice(0, 160)})`); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
