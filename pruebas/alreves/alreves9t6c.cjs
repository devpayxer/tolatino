// Prueba al revés de 9t6c · Textos largos (guardián textosLargos). Cada caso rompe el código o el parche a propósito y el guardián tiene que fallar con SU
// mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   AdminRow sin el corte en el título · en el texto secundario · en el meta · las fichas de ChipGroup (plantillas y opciones de ReasonConfirm) que no
//   ocupan más de una línea · el envoltorio de la ficha que no puede encogerse · AdminNote · AuditRow · el parche del script (meta, fichas) · las filas
//   del panel (Bloques.tsx) sin el corte en el texto secundario · la nota del panel · din9t6b sin medir el ancho con la hoja abierta · ni el desborde en la lista · con un clic forzado ·
//   sin la alerta de cadena larga.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'textosLargos';
const AB = 'packages/ui/src/ds/admin/AdminBar.js', PS = 'scripts/portar-sistema.mjs', BL = 'packages/ui/src/panel/Bloques.tsx', E2E = 'pruebas/e2e/din9t6b.cjs';
const casos = [
  [AB, "      color: titleColor,\n      overflowWrap: 'anywhere'", "      color: titleColor", 'AdminRow: el título no parte una cadena larga'],
  [AB, "      color: 'rgba(11,14,18,.6)',\n      overflowWrap: 'anywhere'\n    }\n  }, sub)", "      color: 'rgba(11,14,18,.6)'\n    }\n  }, sub)", 'AdminRow: el texto secundario no parte una cadena larga'],
  [AB, "      color: metaColor,\n      overflowWrap: 'anywhere'", "      color: metaColor", 'AdminRow: el meta no parte una cadena larga'],
  [AB, "    whiteSpace: 'normal',\n    overflowWrap: 'anywhere',\n    textAlign: 'left',", "    textAlign: 'left',", 'no pueden ocupar más de una línea ni partir una cadena larga'],
  [AB, "    display: 'flex',\n    flex: '0 1 auto',\n    minWidth: 0,\n    maxWidth: '100%'\n  }\n}, /*#__PURE__*/React.createElement(__ds_scope.Chip", "    flex: 'none'\n  }\n}, /*#__PURE__*/React.createElement(__ds_scope.Chip", 'el envoltorio de cada ficha de ChipGroup no puede encogerse'],
  [AB, "      textWrap: 'pretty',\n      overflowWrap: 'anywhere'\n    }\n  }, children)", "      textWrap: 'pretty'\n    }\n  }, children)", 'AdminNote: el texto no parte una cadena larga'],
  [AB, "      font: '500 13px/1.4 Manrope,sans-serif',\n      overflowWrap: 'anywhere'", "      font: '500 13px/1.4 Manrope,sans-serif'", 'AuditRow: quién y qué'],
  [PS, "color: metaColor,\\n      overflowWrap: 'anywhere'\\n    }", "color: metaColor\\n    }", 'el parche «AdminRow (meta)»'],
  [PS, "whiteSpace: 'normal',\\n    overflowWrap: 'anywhere',\\n    textAlign: 'left',", "textAlign: 'left',", 'el parche «ChipGroup (fichas en varias líneas)»'],
  [BL, 'color: "rgba(11,14,18,.6)", overflowWrap: "anywhere" }}>{x.s}', 'color: "rgba(11,14,18,.6)" }}>{x.s}', 'las filas del panel (rows): el texto secundario'],
  [BL, 'font: "600 13px/1.45 Manrope,sans-serif", overflowWrap: "anywhere" }}>{b.t}', 'font: "600 13px/1.45 Manrope,sans-serif" }}>{b.t}', 'la nota del panel (note)'],
  [E2E, "ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la hoja abierta a ${w.inner}", "ok(true, `la hoja abierta a ${w.inner}", 'con la hoja abierta'],
  [E2E, "ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la lista de alertas a ${w.inner}", "ok(w.inner === m.viewportSize().width && w.scroll <= 9999 && w.body <= w.inner, `la lista de alertas a ${w.inner}", 'en la lista del teléfono'],
  [E2E, "await clic(opcion(m, L5.A)); await clic(m.getByText('Cobro duplicado", "await opcion(m, L5.A).click({ force: true }); await clic(m.getByText('Cobro duplicado", 'con clics de verdad'],
  [E2E, "const L5 = armar(X, 'm', { largo: true });", "const L5 = armar(X, 'm');", 'ya no arma una alerta con una cadena de 60 caracteres'],
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
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
