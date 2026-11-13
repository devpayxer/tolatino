// 9b-2 · tub9b — la tubería completa de punta a punta. Dos mitades:
//  (1) LO QUE SE PUEDE PROBAR AQUÍ: la comparación de capturas es la misma que corre el CI. Una captura igual pasa; un reloj o un «hace 3 min»
//      (0,1 % de la pantalla) pasa; un botón movido, una tarjeta que cambia de tamaño o un color (8 %) y un tamaño distinto FRENAN. Y cada
//      pantalla × dispositivo tiene su captura aprobada, el CI tiene todas sus partes y el trabajo «tuberia» las exige.
//  (2) LO QUE SOLO PUEDE PROBAR EL CI: una corrida completa en verde y una corrida que falla por un cambio visual sin aprobar. Esas dos corridas
//      (sus ids) están en docs/PROGRESS.md «Fase 9 · 9b-2»; esta prueba comprueba que están anotadas.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const R = ENT.RAIZ, req = (m) => require(m);
const { PNG } = req('pngjs'), { compara, MAXIMO } = req(path.join(R, 'pruebas/visual/comparar.cjs'));
const lienzo = (w, h) => { const p = new PNG({ width: w, height: h }); for (let i = 0; i < w * h; i++) { p.data[i * 4] = 250; p.data[i * 4 + 1] = 246; p.data[i * 4 + 2] = 240; p.data[i * 4 + 3] = 255; } return p; };
const pinta = (p, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * p.width + x) * 4; p.data[i] = c[0]; p.data[i + 1] = c[1]; p.data[i + 2] = c[2]; } return p; };
(async () => {
  const W = 390, H = 844, base = PNG.sync.write(pinta(lienzo(W, H), 20, 100, 350, 120, [30, 90, 140]));
  const r0 = compara(PNG.sync.write(pinta(lienzo(W, H), 20, 100, 350, 120, [30, 90, 140])), base);
  ok(r0.ok && r0.ratio === 0, 'la misma pantalla pasa (0 % distinto)');
  const reloj = PNG.sync.write(pinta(pinta(lienzo(W, H), 20, 100, 350, 120, [30, 90, 140]), 300, 10, 30, 10, [0, 0, 0]));
  const r1 = compara(reloj, base);
  ok(r1.ok && r1.ratio > 0 && r1.ratio < MAXIMO, `un reloj que cambia (${(r1.ratio * 100).toFixed(2)} % de la pantalla) no frena el CI`);
  const boton = PNG.sync.write(pinta(pinta(lienzo(W, H), 20, 100, 350, 120, [30, 90, 140]), 20, 400, 350, 70, [200, 40, 40]));
  const r2 = compara(boton, base);
  ok(!r2.ok && /distinta/.test(r2.razon), `un cambio visual sin aprobar (un botón nuevo, ${(r2.ratio * 100).toFixed(1)} % de la pantalla) FRENA: ${r2.razon}`);
  const color = PNG.sync.write(pinta(lienzo(W, H), 20, 100, 350, 120, [30, 90, 200]));
  const r3 = compara(color, base);
  ok(!r3.ok, `el mismo botón en otro azul FRENA (${(r3.ratio * 100).toFixed(1)} %)`);
  const otro = compara(PNG.sync.write(lienzo(W, H + 40)), base);
  ok(!otro.ok && /tamaño/.test(otro.razon), 'una pantalla de otro tamaño FRENA: ' + otro.razon);
  // La cobertura: cada pantalla en cada dispositivo tiene su captura aprobada y el CI tiene todas sus partes.
  const IDS = require(path.join(R, 'pruebas/lib/dispositivos.cjs')).IDS, pan = JSON.parse(fs.readFileSync(path.join(R, 'pruebas/visual/pantallas.json'), 'utf8')).pantallas;
  ok(IDS.length === 9, '9 dispositivos');
  const falta = []; for (const x of pan) for (const id of IDS) if (!fs.existsSync(path.join(R, `pruebas/visual/${x.id}/${id}.png`))) falta.push(`${x.id}/${id}`);
  ok(falta.length === 0, `las ${pan.length} pantallas × 9 dispositivos tienen su captura aprobada (${pan.length * 9})` + (falta.length ? ' · faltan ' + falta.slice(0, 3).join(', ') : ''));
  const y = fs.readFileSync(path.join(R, '.github/workflows/ci.yml'), 'utf8');
  for (const j of ['verificar', 'seguridad', 'web', 'regresion', 'dispositivos', 'tuberia']) ok(new RegExp(`\\n  ${j}:\\n`).test(y), `el CI tiene el trabajo «${j}»`);
  const g = execSync('node guardianes/run.mjs --solo tuberiaNoSeSalta', { cwd: R, stdio: 'pipe' }).toString();
  ok(/sin fallos/.test(g), 'el guardián tuberiaNoSeSalta pasa: «tuberia» exige todo y la regresión corre en sus 8 trabajos');
  // (2) Las dos corridas del CI quedaron anotadas con su id.
  if (process.env.GITHUB_ACTIONS) { console.log('  · (2) no se comprueba dentro del propio CI (sería circular: las corridas se anotan DESPUÉS); se comprueba en la máquina y en la revisión'); return; }
  const pr = fs.readFileSync(path.join(R, 'docs/PROGRESS.md'), 'utf8'), sec = pr.slice(pr.indexOf('## Fase 9 · 9b-2'));
  ok(/corrida completa en verde[^\n]*\d{10,}/i.test(sec), 'PROGRESS anota la corrida completa en verde del CI con su id');
  ok(/frenada por un cambio visual[^\n]*\d{10,}/i.test(sec), 'PROGRESS anota la corrida del CI frenada por un cambio visual sin aprobar con su id');
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
