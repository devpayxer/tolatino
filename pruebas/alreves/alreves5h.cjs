// Prueba al revés de los guardianes de 5h: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const TD = 'apps/web/lib/traductor.ts', TR = 'apps/web/lib/traduccion.ts', C = 'infra/pruebas/docker-compose.yml', D = 'infra/pruebas/deploy.sh',
  AM = 'apps/web/app/admin/AutoModeracion.tsx', AC = 'apps/web/lib/admin-contenido.ts', CO = 'apps/web/lib/comunidad.ts', HI = 'apps/web/lib/comunidad-hilo.ts',
  RE = 'apps/web/lib/resenas.ts', NO = 'apps/web/lib/novedades.ts', PK = 'apps/web/package.json', TA = 'apps/web/app/(app)/comunidad/Tarjeta.tsx', RS = 'apps/web/app/(app)/n/[id]/Resenas.tsx',
  MU = 'apps/web/app/(app)/comunidad/Muro.tsx';
const casos = [
  // traduccionPropia
  ['traduccionPropia', TD, 'export const MOTOR = "libretranslate";', 'export const MOTOR = "libretranslate";\nconst G = "https://translation.googleapis.com/language/translate/v2";'],
  ['traduccionPropia', TR, 'import "server-only";', 'import "server-only";\nconst DL = "https://api-free.deepl.com/v2/translate";'],
  ['traduccionPropia', TR, 'import "server-only";', 'import "server-only";\nconst X = "https://api.anthropic.com/v1/messages";'],
  ['traduccionPropia', PK, '"dependencies": {', '"dependencies": {\n    "deepl-node": "1.13.0",'],
  ['traduccionPropia', TD, 'const base = () => (process.env.TRADUCTOR_URL ?? "").replace(/\\/+$/, "");', 'const base = () => (process.env.TRADUCTOR_URL ?? "https://libre.example.org").replace(/\\/+$/, "");'],
  ['traduccionPropia', TD, 'const r = await fetch(b + ruta,', 'const r = await fetch(process.env.OTRO + ruta,'],
  ['traduccionPropia', TR, 'import "server-only";', 'import "server-only";\nexport const otro = () => fetch(`${process.env.TRADUCTOR_URL}/translate`);'],
  ['traduccionPropia', CO, 'import "server-only";', 'import "server-only";\nexport const det = () => fetch("http://x/detect");'],
  ['traduccionPropia', C, '      TRADUCTOR_URL: http://traductor:5000\n', '      TRADUCTOR_URL: https://libretranslate.example.net\n'],
  ['traduccionPropia', D, 'log() {', '# https://libretranslate.com/translate\nlog() {'],
  // traductorEnPerfil
  ['traductorEnPerfil', C, '    image: libretranslate/libretranslate:v1.9.6\n    profiles: ["traductor"]\n    restart: unless-stopped', '    image: libretranslate/libretranslate:v1.9.6\n    restart: unless-stopped'],
  ['traductorEnPerfil', C, '    image: libretranslate/libretranslate:v1.9.6\n    profiles: ["traductor"]\n    restart: unless-stopped', '    image: libretranslate/libretranslate:latest\n    profiles: ["traductor"]\n    restart: unless-stopped'],
  ['traductorEnPerfil', C, '    networks: [interna]\n    mem_limit: 1536m', '    networks: [interna]\n    ports:\n      - "127.0.0.1:5000:5000"\n    mem_limit: 1536m'],
  ['traductorEnPerfil', C, '    networks: [interna]\n    mem_limit: 1536m\n', '    networks: [interna]\n'],
  ['traductorEnPerfil', C, '    networks: [interna]\n    mem_limit: 1536m', '    networks: [default, interna]\n    mem_limit: 1536m'],
  ['traductorEnPerfil', C, '  interna:\n    internal: true\n', '  interna: {}\n'],
  ['traductorEnPerfil', C, '      LT_LOAD_ONLY: es,en\n', '      LT_LOAD_ONLY: es,en,pt\n'],
  ['traductorEnPerfil', C, '      LT_UPDATE_MODELS: "false"\n', '      LT_UPDATE_MODELS: "true"\n'],
  ['traductorEnPerfil', C, '    volumes:\n      - traductor-modelos:/home/libretranslate/.local\n    networks: [interna]', '    networks: [interna]'], // GUARDIAN-OK: ruta dentro del contenedor del traductor, no de una máquina
  ['traductorEnPerfil', C, '    networks: [default, interna]\n    depends_on:\n      db:\n        condition: service_healthy\n', '    networks: [default, interna]\n    depends_on:\n      db:\n        condition: service_healthy\n      traductor:\n        condition: service_healthy\n'],
  ['traductorEnPerfil', D, ' up -d traductor" || true', ' up -d traductor"'],
  ['traductorEnPerfil', D, 'up -d --build --remove-orphans', 'up -d --build --remove-orphans --profile traductor'],
  ['traductorEnPerfil', D, 'COMPOSE_TRAD=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile traductor)', 'COMPOSE_TRAD=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml")'],
  // adminVeOriginal
  ['adminVeOriginal', AM, 'import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";', 'import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";\nimport { useTraducir } from "../(app)/Traducir";'],
  ['adminVeOriginal', AC, 'import "server-only";', 'import "server-only";\nexport const tr = `select text from ugc_translations where target_id = $1`;'],
  ['adminVeOriginal', AC, 'import "server-only";', 'import "server-only";\nimport { traducir } from "./traduccion";'],
  ['adminVeOriginal', TA, 'body={t.body} translate={t.translate}', 'body={p.body}'],
  ['adminVeOriginal', RS, 'translate: tb.translate,', ''],
  // traductorFueraDeTx
  ['traductorFueraDeTx', NO, '  const det = await detectarIdioma(t); // 5h: antes de la transacción; si no se sabe, el idioma de la app de quien comenta\n  return tx(async (c) => {\n',
    '  return tx(async (c) => {\n    const det = await detectarIdioma(t);\n'],
  ['traductorFueraDeTx', HI, '  const det = await detectarIdioma(e.body.replace(/^@\\S+\\s*/, "")); // 5h: antes de abrir la transacción; si no se sabe, el de la app\n', '  const det = null;\n'],
  ['traductorFueraDeTx', RE, '  const lang = idiomaTexto(await detectarIdioma(body), p.lang);', '  const lang = idiomaTexto(null, p.lang);'],
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
