// Prueba al revés de los guardianes de 9t-2 (Buscar: servicios de las demás categorías, la razón de la fila, el plato en su hoja, la voz y la ciudad
// del desplegable; LAUNCH «Buscar · servicios de las demás categorías y lo que falta del desplegable»):
// - buscarPlatosComoLaFicha (lo de 9t-2): CURSO_INSC o SERVICIO_NOCHE sin una de sus partes (otros tipos, la Lista apagada, la noche especial sin
//   su evento en vivo o con el de otro negocio); una ficha de Fiestas, Transporte, Noche, Educación o Iglesias que copia el filtro en vez de leerlo o
//   cambia su puerta (la pausa de Servicios); Buscar sin la pausa, sin los tipos de Noche o sin los de Educación.
// - negocioPorLoQueVende: NEGOCIOS_POR_PLATO sin la regla, de otra ciudad, sin el índice o mirando lo quitado; negocios() sin sumarlo, con otra
//   ciudad o encajando por la descripción (no por el nombre de lo que vende); porQue sin la regla, con el precio de lista (sin la oferta) o un número para un servicio, sin la ciudad que se ve; la página con otros
//   negocios; la razón aunque el nombre explica el resultado o con un precio que la ficha no dice.
// - platoAbreSuHoja: el enlace sin ?plato=, la fila sin hrefPlato, la ficha sin comprobar el id o sin pasarlo a la ficha nueva, una ficha que no lo
//   abre o lo abre dos veces, abrir un plato agotado o sin pedidos.
// - vozDelDesplegable: la voz sin el aviso, sin guardar la respuesta en Mi cuenta, con micrófono aunque lo apagó, una segunda copia del reconocimiento,
//   el desplegable sin la lógica de la página, sin el aviso o sin dejar de escuchar al cerrar; el chip de la ciudad que no abre el selector; la ruta
//   sin lo que la persona eligió.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const VP = 'apps/web/lib/visible-publico.ts', BP = 'apps/web/lib/buscar-platos.ts', BU = 'apps/web/lib/buscar.ts', FP = 'apps/web/app/(app)/buscar/platos.ts';
const PG = 'apps/web/app/(app)/buscar/page.tsx', API = 'apps/web/app/api/buscar/route.ts', FPG = 'apps/web/app/(app)/n/[id]/page.tsx';
const FI = 'apps/web/app/(app)/n/[id]/Ficha.tsx', FN = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', MC = 'apps/web/app/(app)/n/[id]/MenuCliente.tsx';
const VZ = 'apps/web/app/(app)/buscar/voz.ts', DP = 'apps/web/app/(app)/buscar/Desplegable.tsx', AS = 'apps/web/app/(app)/AppShell.tsx';
const casos = [
  // buscarPlatosComoLaFicha · (1) las reglas de las demás categorías
  ['buscarPlatosComoLaFicha', VP, "export const CURSO_INSC = (i: string) => `${i}.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora')`;", "export const CURSO_INSC = (i: string) => `${i}.svc_kind is not null`;"],
  ['buscarPlatosComoLaFicha', VP, "`${i}.svc_kind in ('cover', 'lista', 'mesa', 'vip', 'fecha', 'evento')", "`${i}.svc_kind is not null"],
  ['buscarPlatosComoLaFicha', VP, "ns.business_id = ${i}.business_id and ns.list_on))", "ns.business_id = ${i}.business_id))"],
  ['buscarPlatosComoLaFicha', VP, "d.event_id = e.id and d.listable and d.ends_at > now()", "d.event_id = e.id"],
  ['buscarPlatosComoLaFicha', VP, "e.id::text = ${i}.svc_attrs->>'event_id' and e.business_id = ${i}.business_id", "e.id::text = ${i}.svc_attrs->>'event_id'"],
  // (2) las fichas leen de ahí y su puerta sigue
  ['buscarPlatosComoLaFicha', 'apps/web/lib/fiestas-publico.ts', 'from items i where i.business_id = $1 and ${SERVICIO_VIVO("i")} order by', "from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null order by"],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/trans-publico.ts', 'b.cat !== "NEG-TRANS" || (b.off ?? {}).svc) return null;', 'b.cat !== "NEG-TRANS") return null;'],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/fe-publico.ts', 'from items i where i.business_id = $1 and ${SERVICIO_VIVO("i")} order by', "from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell order by"],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/noche-publico.ts', '        and ${SERVICIO_NOCHE("i")} order by', "        and i.svc_kind in ('cover', 'lista', 'mesa', 'vip', 'fecha', 'evento') order by"],
  ['buscarPlatosComoLaFicha', 'apps/web/lib/inscripciones-publico.ts', 'const I = (b.off ?? {}).svc ? [] :', 'const I = false ? [] :'],
  // (3) Buscar con la regla de cada una
  ['buscarPlatosComoLaFicha', BP, "(n.cat in ('NEG-FIESTA', 'NEG-TRANS', 'NEG-FE') and ${OFF(\"svc\")} and", "(n.cat in ('NEG-FIESTA', 'NEG-TRANS', 'NEG-FE') and"],
  ['buscarPlatosComoLaFicha', BP, ' and ${SERVICIO_VIVO("i")} and ${SERVICIO_NOCHE("i")})', ' and ${SERVICIO_VIVO("i")})'],
  ['buscarPlatosComoLaFicha', BP, ' and ${SERVICIO_VIVO("i")} and ${CURSO_INSC("i")})', ' and ${SERVICIO_VIVO("i")})'],
  // negocioPorLoQueVende
  ['negocioPorLoQueVende', BP, "    where i.search_doc @@ to_tsquery('simple', ${q}) and i.removed_at is null and i.module in ('menu', 'svc') and ${REGLA}`;", "    where i.search_doc @@ to_tsquery('simple', ${q}) and i.removed_at is null and i.module in ('menu', 'svc')`;"],
  ['negocioPorLoQueVende', BP, "     join businesses nb on nb.id = i.business_id and nb.city_id = $1 and nb.status = 'active' and nb.category_id = any(${CATS_SQL})\n     join business_stats_cache nst", "     join businesses nb on nb.id = i.business_id and nb.status = 'active' and nb.category_id = any(${CATS_SQL})\n     join business_stats_cache nst"],
  ['negocioPorLoQueVende', BP, "    where i.search_doc @@ to_tsquery('simple', ${q}) and i.removed_at is null", "    where i.name->>'es' ilike '%' || ${q} || '%' and i.removed_at is null"],
  ['negocioPorLoQueVende', BU, "or b.id in (select id from pp))", "or true)"],
  ['negocioPorLoQueVende', BU, 'pp as (${NEGOCIOS_POR_PLATO(qn)}),', 'pp as (select id from businesses),'],
  ['negocioPorLoQueVende', BU, 'const qn = conTexto ? add(soloNombre(tsq(E.grupos, y, o.vivo))) : null;', 'const qn = conTexto ? add(tsq(E.grupos, y, o.vivo)) : null;'],
  ['negocioPorLoQueVende', BP, 'o.ids.slice(0, 20), soloNombre(tsq(E.grupos, true, o.vivo)),', 'o.ids.slice(0, 20), tsq(E.grupos, true, o.vivo),'],
  ['negocioPorLoQueVende', BP, "      where i.business_id = any($2::text[]) and i.search_doc @@ to_tsquery('simple', $3) and i.removed_at is null and i.module in ('menu', 'svc') and ${REGLA}", "      where i.business_id = any($2::text[]) and i.search_doc @@ to_tsquery('simple', $3) and i.removed_at is null and i.module in ('menu', 'svc')"],
  ['negocioPorLoQueVende', BP, 'case when i.module = \'menu\' then coalesce(oferta_precio(i.id, $4::uuid), i.price_cents) end as cents', 'i.price_cents as cents'],
  ['negocioPorLoQueVende', BP, '[o.punto.ciudad, o.ids.slice(0, 20),', '["hzl", o.ids,'],
  ['negocioPorLoQueVende', PG, 'porQue(E, { punto: loc, ids: r.items.map((x) => x.id)', 'porQue(E, { punto: loc, ids: [...r.items.map((x) => x.id), ...PL.items.map((x) => x.biz)]'],
  ['negocioPorLoQueVende', API, 'porQue(E, { punto: loc, ids: r.items.map((b) => b.id)', 'porQue(E, { punto: { ...loc, ciudad: req.nextUrl.searchParams.get("ciudad") ?? loc.ciudad }, ids: r.items.map((b) => b.id)'],
  ['negocioPorLoQueVende', FP, '  if (!r || E.grupos.every((g) => encaja(g, nombreNegocio, o.vivo))) return null;', '  if (!r) return null;'],
  ['negocioPorLoQueVende', FP, '!o.sinPrecio && r.cents ?', '!o.sinPrecio ?'],
  // platoAbreSuHoja
  ['platoAbreSuHoja', FP, 'plato=${encodeURIComponent(x.id)}`;', 'x=1`;'],
  ['platoAbreSuHoja', FP, 'abierto: x.open, precio, img: x.foto, href: hrefPlato(x), dist,', 'abierto: x.open, precio, img: x.foto, href: `/n/${x.biz}`, dist,'],
  ['platoAbreSuHoja', FPG, 'const platoInicial = sp.plato && /^\\d{1,19}$/.test(sp.plato) ? sp.plato : undefined;', 'const platoInicial = sp.plato || undefined;'],
  ['platoAbreSuHoja', FPG, 'tabInicial={sp.tab} platoInicial={platoInicial} rsvInicial={rsvInicial}', 'tabInicial={sp.tab} rsvInicial={rsvInicial}'],
  ['platoAbreSuHoja', FI, '      if (platoHecho.current) return;\n      platoHecho.current = true;\n', ''],
  ['platoAbreSuHoja', FN, 'mn.abrir(platoInicial, window.innerWidth >= 1024);', 'void 0;'],
  ['platoAbreSuHoja', MC, 'if (!it || offOf(it) || !canOrd) return false;', 'if (!it) return false;'],
  // vozDelDesplegable
  ['vozDelDesplegable', VZ, '    if (!ok) { setVoz("aviso"); return; }\n', ''],
  ['vozDelDesplegable', VZ, 'if (o.conSesion) void vozGuardar(true).catch(() => undefined); else', 'if (false) void vozGuardar(true).catch(() => undefined); else'],
  ['vozDelDesplegable', VZ, 'return { voz, mic: vozOk !== false, hablar', 'return { voz, mic: true, hablar'],
  ['vozDelDesplegable', DP, '{vz && V.mic && <button', '{vz && <button'],
  ['vozDelDesplegable', DP, '{V.voz === "aviso" && <span data-aviso-voz="1"', '{V.voz === "aviso" && <span'],
  ['vozDelDesplegable', DP, '  useEffect(() => () => cancelarVoz.current(), []);\n', ''],
  ['vozDelDesplegable', DP, 'onClick={(e) => onCiudad(e.currentTarget.getBoundingClientRect())}', 'onClick={() => undefined}'],
  ['vozDelDesplegable', AS, 'setSel({ pedir: false }); }} /> : null}', '}} /> : null}'],
  ['vozDelDesplegable', API, 'select voice_search as v from users where id = $1`, [u.id]', 'select true as v`, []'],
];
const crear = [
  ['vozDelDesplegable', 'apps/web/app/(app)/buscar/zz9tbus.tsx', '"use client";\nexport const x = () => { const W = window as unknown as { webkitSpeechRecognition?: new () => { start: () => void } }; if (W.webkitSpeechRecognition) new W.webkitSpeechRecognition().start(); };\n'],
];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(G, f.split('/').pop(), r);
}
for (const [G, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); }
  informe(G, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
