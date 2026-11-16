// Prueba al revés de los guardianes de 9c. contrasteTexto (texto gris por debajo de AA): el gris de una pestaña del sistema portado vuelve al 42 %,
// una etiqueta del Super Admin vuelve al 50 %, una clase text-ink/45 en Mi cuenta, un text-[rgba(…,.5)] nuevo y el token --tl-text-muted al 50 %.
// hojaAccesible: una hoja sin aria-modal, otra sin nombre, el layout sin <FocoHojas />, el gestor sin Escape y una capa nueva que se cierra al
// tocarla sin hoja con role="dialog". tuberiaNoSeSalta: el trabajo nocturno «anchos» sin sus tres anchos o fuera de «tuberia». iconoExiste: «undo» y «download» otra vez. anchoSinSalto: un ancho que arranca en 390 y mide, y el panel sin <AnchoInicial>. impuestoSoloNuevo: la firma de Autos con max(id), la acción sin permiso y un update de tax_rules. vitalesSinPersonas: la URL en el cuerpo, la puerta sin origen, el 429 otra vez, la base antes del tope, una columna ip y el layout sin <Vitales />.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([contrasteTexto]); se restaura. «crear»: se crea el archivo, se corre y se borra.
// También al derecho: una sombra o un borde con ink al 50 % no es texto (el guardián no debe saltar).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  ['contrasteTexto', 'packages/ui/src/ds/navigation/Tabs.js', "on ? 'var(--tl-ink)' : 'rgba(11,14,18,.6)';", "on ? 'var(--tl-ink)' : 'rgba(11,14,18,.42)';"],
  ['contrasteTexto', 'apps/web/app/admin/Colas.tsx', 'letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E("CASO", "CASE")}', 'letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E("CASO", "CASE")}'],
  ['contrasteTexto', 'apps/web/app/(app)/cuenta/boletos/[codigo]/Boleto.tsx', 'tracking-[0.16em] text-ink/60">{cuando}', 'tracking-[0.16em] text-ink/45">{cuando}'],
  ['contrasteTexto', 'packages/ui/src/tokens.css', '--tl-text-muted: rgba(11,14,18,.6);', '--tl-text-muted: rgba(11,14,18,.5);'],
  ['hojaAccesible', 'apps/web/app/(app)/cuenta/Marco.tsx', '<div role="dialog" aria-modal="true" aria-label={h.title}', '<div role="dialog" aria-label={h.title}'],
  ['hojaAccesible', 'apps/web/app/(app)/cuenta/Marco.tsx', '<div role="dialog" aria-modal="true" aria-label={h.title}', '<div role="dialog" aria-modal="true"'],
  ['hojaAccesible', 'apps/web/app/layout.tsx', '<FocoHojas />', ''],
  ['hojaAccesible', 'apps/web/app/FocoHojas.tsx', 'e.key === "Escape"', 'e.key === "Esc"'],
  ['tuberiaNoSeSalta', '.github/workflows/ci.yml', 'id: [iphone-se, ipad, escritorio-1024]', 'id: [iphone-15]'],
  ['iconoExiste', 'apps/web/app/admin/HoyAdmin.tsx', 'icon: "plus"', 'icon: "undo"'],
  ['vitalesSinPersonas', 'apps/web/app/_vitales/Vitales.tsx', 'const cuerpo = { ruta, perfil:', 'const cuerpo = { ruta, url: location.href, perfil:'],
  ['vitalesSinPersonas', 'apps/web/app/api/vitales/route.ts', '  if (!mio) return nada(403);\n', ''],
  ['vitalesSinPersonas', 'apps/web/app/api/vitales/route.ts', '  return nada(r.ok || r.por === "apagado" || r.por === "limite" ? 204 : 400);', '  if (!r.ok && r.por === "limite") return nada(429);\n  return nada(r.ok || r.por === "apagado" ? 204 : 400);'],
  ['vitalesSinPersonas', 'apps/web/lib/vitales.ts', '  const ok = await dentroDelTope("vitales_ip", e.ip ?? "?", 30) && await dentroDelTope("vitales", "todo", 20_000);', '  await db().query("select 1");\n  const ok = await dentroDelTope("vitales_ip", e.ip ?? "?", 30) && await dentroDelTope("vitales", "todo", 20_000);'],
  ['vitalesSinPersonas', 'packages/db/migrations/0167_web_vitals.sql', '  n int not null default 0 check (n >= 0),', '  ip text,\n  n int not null default 0 check (n >= 0),'],
  ['vitalesSinPersonas', 'apps/web/app/layout.tsx', '<FocoHojas /><Vitales />', '<FocoHojas />'],
  ['anchoSinSalto', 'apps/web/app/(app)/soporte/Soporte.tsx', '  return useAnchoComun(); // 9c · sin salto al cargar: app/_ancho/Ancho.tsx', '  const [w, setW] = useState(390);\n  useEffect(() => { const f = () => setW(window.innerWidth); f(); }, []);\n  return w;'],
  ['anchoSinSalto', 'apps/web/app/panel/layout.tsx', '<AnchoInicial w={w}>', '<>'],
  ['anchoSinSalto', 'apps/web/app/(app)/_legal/PieLegal.tsx', '  const d = useAnchoComun() >= 1024; // 9c · sin salto al cargar', '  const [d, setD] = useState(false);\n  useEffect(() => { const m = window.matchMedia("(min-width: 1024px)"); const f = () => setD(m.matches); f(); }, []);'],
  ['impuestoSoloNuevo', 'apps/web/lib/autos.ts', "and effective_from <= now() order by city_id, effective_from desc, id desc) v) as tax", "order by city_id, effective_from desc, id desc) v) as tax, (select max(id) from tax_rules) as x"],
  ['impuestoSoloNuevo', 'apps/web/app/admin/acciones-planes.ts', '  if (!s || !s.puede("plan", "aprobar")) return { ok: false, mensaje: "Tu rol no cambia impuestos." };', '  if (!s) return { ok: false, mensaje: "Tu rol no cambia impuestos." };'],
  ['iconoExiste', 'apps/web/app/admin/IntegracionesWallet.tsx', 'icon: "folder"', 'icon: "download"'],
  ['tuberiaNoSeSalta', '.github/workflows/ci.yml', 'needs: [verificar, seguridad, regresion, dispositivos, confirmacion, anchos]', 'needs: [verificar, seguridad, regresion, dispositivos, confirmacion]'],
];
const crear = [
  ['contrasteTexto', 'apps/web/app/admin/ContrasteAlReves.tsx', 'export const X = () => <span className="text-[rgba(11,14,18,.5)]">gris</span>;\n'],
  ['impuestoSoloNuevo', 'apps/web/lib/impuesto-al-reves.ts', 'export const x = "update tax_rules set parts_bp = 0";\n'],
  ['hojaAccesible', 'apps/web/app/admin/CapaAlReves.tsx', 'export const C = ({ c }: { c: () => void }) => <div onClick={c} className="fixed inset-0 bg-ink/50"><div>hoja</div></div>;\n'],
];
const derecho = [
  ['contrasteTexto', 'apps/web/app/admin/ContrasteAlDerecho.tsx', 'export const Y = () => <div className="shadow-[0_8px_20px_rgba(11,14,18,.5)]" style={{ boxShadow: "0 2px 6px rgba(11,14,18,.45)", border: "1px solid rgba(11,14,18,.4)" }} />;\n'],
];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out], esperaFalla = true) => { total++; const ok = falla === esperaFalla; console.log(`  ${ok ? '✓' : '✗'} ${G} ${esperaFalla ? 'al revés' : 'al derecho'} (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [lista, espera] of [[crear, true], [derecho, false]]) for (const [G, f, c] of lista) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); }
  informe(G, `crear ${f.split('/').slice(-2).join('/')}`, r, espera);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
