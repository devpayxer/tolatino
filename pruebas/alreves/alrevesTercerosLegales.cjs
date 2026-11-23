// Prueba al revés del guardián tercerosDeclarados (23 nov): «un texto dice que un dato no sale y el código lo manda». La lista cerrada de las empresas
// que reciben datos (docs/legal/terceros.json) contra el código (hosts y señales) y contra lo que el producto dice (Privacidad, Inteligencia artificial,
// ayuda y cadenas). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([tercerosDeclarados]); se restaura. «crear»: se crea el archivo, se corre y
// se borra. Los textos viejos que dijeron «no sale» de las fotos (los de antes de la decisión AJ) son los casos 1 a 4.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'tercerosDeclarados', J = 'docs/legal/terceros.json', PE = 'docs/legal/us/privacidad.es.md', PN = 'docs/legal/us/privacidad.en.md', IE = 'docs/legal/us/ia.es.md',
  FR = 'docs/ayuda/fotos-en-revision.md', AF = 'docs/ayuda/admin-fotos-revision-automatica.md', CE = 'docs/ayuda/privacidad-de-el-compa.md';
const casos = [
  // 1-3 · El texto de antes: «lo que no sale de To'Latino: las fotos…» (Privacidad ES y EN) y «ninguna manda tus fotos a otra empresa» (IA)
  [PE, "**Lo que no se manda a otra empresa:** el traductor de «Ver traducción», la primera revisión de las fotos,", "**Lo que no sale de To'Latino:** las fotos, el traductor de «Ver traducción», la revisión de fotos,", 'Privacidad ES: «no sale de To\'Latino: las fotos»'],
  [PN, "**What is not sent to another company:** the «See translation» translator, the first photo review,", "**What never leaves To'Latino:** photos, the «See translation» translator, photo review,", 'Privacidad EN: «never leaves To\'Latino: photos»'],
  [IE, "## La segunda opinión sobre las fotos públicas\n", "## La segunda opinión sobre las fotos públicas\n- Las fotos nunca salen de los servidores de To'Latino ni van a otra empresa.\n", 'IA ES: las fotos nunca van a otra empresa'],
  // 4 · La ficha de ayuda de las fotos privadas que dice «a ningún otro servicio» sin la excepción
  [FR, "no van a la segunda opinión. (Si un banco disputa un cobro, la foto de la entrega puede ir a Stripe como evidencia.)", "no salen a ningún otro servicio.", 'ayuda: «no salen a ningún otro servicio»'],
  // 5 · La foto de la entrega que «nunca sale de casa» y sí va a Stripe en una disputa
  [AF, "La foto de la entrega sí puede ir a Stripe como evidencia de una disputa.", "La foto de la entrega nunca sale de casa.", 'ayuda admin: la foto de la entrega nunca sale de casa'],
  // 6 · Prometer retención cero sin tenerla contratada
  [CE, "To'Latino no lo usa para anuncios.", "To'Latino no lo usa para anuncios y el proveedor tiene retención cero.", 'ayuda: retención cero prometida'],
  // 7-8 · Privacidad deja de nombrar a una empresa / de decir lo que sale de la foto
  [PE, "  - Cloudflare: [pendiente: el sitio de producción irá detrás de Cloudflare,", "  - Red: [pendiente: el sitio de producción irá detrás de un proveedor de red,", 'Privacidad ES sin nombrar a Cloudflare (aunque «Lo que cambió» lo diga)'],
  [PN, "Faces and text are not\n  blurred. If Anthropic", "Faces and text are blurred. If Anthropic", 'Privacidad EN sin «not blurred»'],
  // 9 · IA ES sin la versión reducida
  [IE, "una\n  versión reducida de la foto (hasta 640 píxeles por lado", "una\n  versión de la foto (hasta 640 píxeles por lado", 'IA ES sin «reducida»'],
  // 10-12 · La lista: una señal que ya no encuentra nada (guardián ciego), una empresa sin su host, una empresa repetida
  [J, '"senales": ["api\\\\.anthropic\\\\.com", "ANTHROPIC_API_KEY"]', '"senales": ["zzNoExisteEnElCodigo"]', 'lista: señal de Anthropic que no existe'],
  [J, '"hosts": ["pexels.com"]', '"hosts": []', 'lista: Pexels sin su host (la portada de next.config.ts)'],
  [J, '"id": "telnyx",', '"id": "stripe",', 'lista: una empresa repetida'],
];
const crear = [
  // 13 · Un cliente nuevo de otra empresa que nadie declaró
  ['apps/web/lib/zzTerceros.ts', 'import "server-only";\nexport const ir = () => fetch("https://api.otra-empresa-nueva.net/v1/enviar", { method: "POST" });\n', 'código: un host nuevo sin declarar'],
  // 14 · Una cadena del producto que dice que las fotos nunca salen de nuestros servidores
  ['apps/web/app/zzTerceros.tsx', 'export const T = "Tus fotos nunca salen de nuestros servidores.";\n', 'cadena del producto: «tus fotos nunca salen de nuestros servidores»'],
  // 15 · Una ficha de ayuda nueva con el texto viejo en inglés
  ['docs/ayuda/zz-terceros.md', '# Prueba\n\n## Qué hace\n- Photos never go to any other company: our own model reviews them on To\'Latino\'s servers.\n', 'ayuda nueva: «photos never go to any other company»'],
];
let bien = 0, total = 0;
const correr = (g = G) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
// Antes de inyectar nada, el árbol tiene que estar limpio para este guardián (si no, todo «caería» por otra cosa).
total++; { const [f] = correr(); if (!f) { bien++; console.log(`  ✓ ${G} en verde sobre el árbol de hoy`); } else console.log(`  ✗ ${G} ya falla sin defecto inyectado: los casos de abajo no dicen nada`); }
for (const [f, a, b, que] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe(que, r);
}
for (const [f, c, que] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(); } finally { fs.unlinkSync(ruta); }
  informe(que, r);
}
// Y la lista de verdad: el guardián no se queda ciego si alguien la vacía.
{ const ruta = path.join(R, J), orig = fs.readFileSync(ruta, 'utf8');
  fs.writeFileSync(ruta, JSON.stringify({ ...JSON.parse(orig), terceros: [] }, null, 2));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  informe('lista vaciada', r); }
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
