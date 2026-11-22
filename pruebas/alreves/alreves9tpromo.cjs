// Prueba al revés del guardián codigoEscritoManda (21 nov): en «Publica tu negocio» el código de promotor ESCRITO lo valida el servidor al
// publicar, aplicado o no (antes solo contaba si la pantalla decía «aplicado»: escribirlo y tocar «Publicar» lo perdía callado; así falló cre9h
// una vez en el CI 44856657972), y un código que no vale no se ignora: no se publica y se dice.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([codigoEscritoManda]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const PG = 'apps/web/app/(app)/n/[id]/pagar/Pagar.tsx', BO = 'apps/web/app/(app)/eventos/[slug]/boletos/Boletos.tsx', TC = 'pruebas/e2e/cup9n21.cjs', TE = 'pruebas/e2e/evt6c.cjs';
const G = 'codigoEscritoManda', A = 'apps/web/app/(app)/publica/acciones.ts', F = 'apps/web/app/(app)/publica/PasosFH.tsx', P = 'apps/web/app/(app)/publica/Publica.tsx', N = 'pruebas/lib/negocio-nuevo.cjs', E = 'pruebas/e2e/cre9h.cjs';
const casos = [
  // El servidor vuelve a creerle a la bandera de la pantalla, o deja pasar callado un código que no vale
  [A, 'const promo = escrito ? await codigoVivo(escrito) : null;', 'const promo = d.promoOk ? await codigoVivo(escrito) : null;'],
  [A, 'const escrito = String(d.promo ?? "").trim();', 'const escrito = d.promoOk ? String(d.promo ?? "").trim() : "";'],
  [A, 'if (escrito && !promoOk) return no(', 'if (false) return no('],
  [A, '"F1", "promo");', '"F1");'],
  // La pantalla: lo escrito deja de ir al borrador, o el campo muestra una copia aparte
  [F, 'up({ promo: v, promoOk: false, promoDias: 0 }); }}', '}}'],
  [F, '<input value={escrito}', '<input value={promo.err ?? ""}'],
  [P, 'if (r.campo === "promo") { up({ promoOk: false, promoDias: 0 }); setPromoMal(true);', 'if (r.campo === "promo") {'],
  [P, 'if (d.promo && !d.promoOk) {', 'if (false) {'],
  [P, '        verPromo(); return;\n      }\n      setPublicando(true);', '        verPromo();\n      }\n      setPublicando(true);'],
  // Las pruebas: la carrera de antes (esperar un botón que ya existe) o dejar de probar lo escrito sin aplicar
  [N, "await p.getByText(new RegExp(`^Con ${promo} tienes", "await p.getByText(new RegExp(`^Publicar · "],
  [E, "publicarBarberia(b, { promo: PC, aplicar: false, promoAntes: 'NOEXISTE9'", "publicarBarberia(b, { promo: PC"],
  // La misma clase con dinero: el pago del pedido vuelve a ignorar el cupón escrito, o lo aplica y cobra en el mismo toque
  [PG, 'if (cupIn && !cup) { await aplicarCupon(true);', 'if (false) { await aplicarCupon(true);'],
  // …o lo revisa DESPUÉS de otra salida (el orden importa: va lo primero de «enviar»)
  [PG, '    if (cupIn && !cup) { await aplicarCupon(true);', '    if (sinDir) return;\n    if (cupIn && !cup) { await aplicarCupon(true);'],
  [PG, 'document.querySelector("[data-cupon]")?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }', 'document.querySelector("[data-cupon]")?.scrollIntoView({ block: "center", behavior: "smooth" }); }'],
  // Los boletos vuelven a apartar con lo «aplicado» y no con lo escrito, o apartan aunque el código no valga
  [BO, 'extras, codigo: cod }', 'extras, codigo: aplicado?.codigo ?? null }'],
  [BO, 'if (!a) { setOcupado(false);', 'if (false) { setOcupado(false);'],
  [TC, "'un cupón escrito que no vale: «Enviar pedido» no envía y lo dice junto al campo'", "'cupón'"],
  [TE, "'escrito y sin tocar «Aplicar»: se aparta CON el código (a pagar $12, no $15)'", "'código'"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
