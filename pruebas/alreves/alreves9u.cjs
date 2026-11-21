// Prueba al revés de 9u · La hoja de confirmar dice a quién le llega la nota y no repite el título (guardián notaDiceAQuien). Cada caso rompe el código a
// propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   el tipo Confirmar sin `nota` obligatorio · una confirmación sin `nota:` · una nota con un valor que no es persona/interna/banco · ConfirmarMotivo con el
//   mismo texto de ayuda para todas (el de siempre) · ConfirmarMotivo sin el texto de la nota interna · la cabecera de Planes con `conf.titulo` y la hoja con
//   el mismo título · lo mismo en Colas (ajustes) y en Liquidaciones.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'notaDiceAQuien';
const CM = 'apps/web/app/admin/Colas.tsx', CAT = 'apps/web/app/admin/Catalogo.tsx', PL = 'apps/web/app/admin/Planes.tsx', LQ = 'apps/web/app/admin/Liquidaciones.tsx';
const casos = [
  [CM, 'nota: NotaPara; sub?: string;', 'nota?: NotaPara; sub?: string;', 'el tipo Confirmar no pide `nota: NotaPara`'],
  [CAT, 'nota: "interna", hacer: (m) => hacerlo(false, m)', 'hacer: (m) => hacerlo(false, m)', 'una confirmación sin `nota:`'],
  [CAT, 'nota: "interna", hacer: (m) => hacerlo(true, m)', 'nota: "nadie", hacer: (m) => hacerlo(true, m)', 'no es persona, interna ni banco'],
  [CM, 'placeholder={c.nota === "persona" ? E("Escríbelo como se lo dirías a la persona.", "Write it the way you would say it to the person.")', 'placeholder={E("Escríbelo como se lo dirías a la persona.", "Write it.")} data-x={c.nota === "persona" ? E("Escríbelo como se lo dirías a la persona.", "Write it the way you would say it to the person.")', 'no pasa el texto de ayuda de la nota según a quién le llega'],
  [CM, 'E("Queda en la auditoría con tu nombre.", "It stays in the audit log under your name.")', 'E("Escribe el motivo.", "Write the reason.")', 'no pasa el texto de ayuda de la nota según a quién le llega'],
  [PL, 't: E("Planes y suscripciones", "Plans and subscriptions"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />\n      <ConfirmarMotivo', 't: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />\n      <ConfirmarMotivo', 'sale dos veces'],
  [CM, 'eye: E("COLAS", "QUEUES"), t: E("Colas", "Queues"), onBack', 'eye: E("COLAS", "QUEUES"), t: conf.titulo, onBack', 'sale dos veces'],
  [LQ, '{ ...head, onBack: () => setConf(null), act: undefined }', '{ ...head, t: conf.titulo, onBack: () => setConf(null), act: undefined }', 'sale dos veces'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
const informe = (que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), msg, correr()); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
