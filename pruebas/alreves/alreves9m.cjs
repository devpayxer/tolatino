// Prueba al revés de los guardianes de 9m (las direcciones sin terceros y rápidas, Mensajes en vivo y tapados, la guía del panel con Dirección y mapa).
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0143_vecino.sql', D = 'apps/web/lib/direcciones.ts', DC = 'apps/web/app/_dir/DireccionCampo.tsx', MP = 'apps/web/app/_dir/MapaPin.tsx',
  CL = 'apps/web/lib/como-llegar.ts', MA = 'apps/web/app/(app)/mapa/Mapa.tsx', GEN = 'infra/direcciones/generar.sh', CAR = 'scripts/carga/direcciones-1m.mjs', CO = 'scripts/carga/correr.mjs',
  T = 'pruebas/infra/direcciones.test.sh', CH = 'apps/web/app/(app)/cuenta/mensajes/[negocio]/Chat.tsx', DM = 'apps/web/app/(app)/comunidad/mensajes/[id]/Chat.tsx',
  LM = 'apps/web/app/(app)/cuenta/mensajes/Mensajes.tsx', PN = 'apps/web/app/panel/Panel.tsx', VC = 'apps/web/lib/vivo-cliente.ts', RV = 'apps/web/app/api/vivo/route.ts',
  MV = 'apps/web/lib/mensajes-vivo.ts', ME = 'apps/web/lib/mensajes.ts';
const casos = [
  // direccionSinTerceros: un geocodificador o teselas de terceros, «Cómo llegar» fuera de su lugar, el enlace del teléfono quitado, una llamada en las direcciones,
  // la pantalla que no pregunta a nuestra API, el mapa sin teselas propias, la carga contra un servicio
  ['direccionSinTerceros', D, 'export async function sugerir(', 'export const GEO = "https://maps.googleapis.com/maps/api/geocode/json";\nexport async function sugerir('],
  ['direccionSinTerceros', MA, 'import { tec } from "@/lib/tec";', 'import { tec } from "@/lib/tec";\nexport const TESELA_MB = "https://api.mapbox.com/styles/v1/x/tiles/{z}/{x}/{y}";'],
  ['direccionSinTerceros', MA, 'void registrarToque(b.id, "directions", "mapa"); abrirComoLlegar(', 'void registrarToque(b.id, "directions", "mapa"); window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`); abrirComoLlegar('],
  ['direccionSinTerceros', CL, 'if (/iPhone|iPad|iPod/.test(ua)) return `maps://?daddr=', 'if (/iPhone|iPad|iPod/.test(ua)) return `https://maps.apple.com/?daddr='],
  ['direccionSinTerceros', D, '  return tx(async (c) => {\n    await c.query(`set local statement_timeout = ${TOPE_MS}`);\n    const r = await c.query<Sugerencia>(', '  void fetch("https://api.geoapify.com/v1/geocode/autocomplete");\n  return tx(async (c) => {\n    await c.query(`set local statement_timeout = ${TOPE_MS}`);\n    const r = await c.query<Sugerencia>('],
  ['direccionSinTerceros', DC, 'const r = await fetch(`/api/direcciones?${p}`', 'const r = await fetch(`https://photon.komoot.io/api/?${p}`'],
  ['direccionSinTerceros', MP, 'const tiles = teselas(centro, Z, W, H, 1)', 'const tiles = [] as ReturnType<typeof teselas>; void teselas; const _t = (centro, Z, W, H, 1)'],
  ['direccionSinTerceros', GEN, 'BASE="${DIRECCIONES_ESPEJO:-https://www2.census.gov/geo/tiger}"', 'BASE="${DIRECCIONES_ESPEJO:-https://nominatim.openstreetmap.org}"'],
  // autocompletarRapido: sin el índice por prefijo, sin el límite del CTE, sin recortar las sugerencias, sin tope de tiempo, sin la espera de la pantalla,
  // sin cancelar, con otro presupuesto o sin la medida nacional en la carga, sin la medida de la tubería
  ['autocompletarRapido', M, 'create index if not exists geo_names_prefijo_idx on geo_names (norm text_pattern_ops);', 'create index if not exists geo_names_prefijo_idx on geo_names (norm);'],
  ['autocompletarRapido', M, "create index if not exists geo_names_trgm_idx on geo_names using gin (norm gin_trgm_ops);", ''],
  ['autocompletarRapido', M, '             limit 4000)\n          select * from m order by m.geom <-> pt limit cuantos * 3', '             )\n          select * from m order by m.geom <-> pt limit cuantos * 3'],
  ['autocompletarRapido', M, 'cuantos := greatest(1, least(coalesce(cuantos, 6), 10));', 'cuantos := coalesce(cuantos, 6);'],
  ['autocompletarRapido', D, 'export const TOPE_MS = 250;', 'export const TOPE_MS = 5000;'],
  ['autocompletarRapido', DC, '    }, 140);\n  };\n  const elegir', '    }, 0);\n  };\n  const elegir'],
  ['autocompletarRapido', DC, '      ctl.current?.abort(); const c = new AbortController();', '      const c = new AbortController();'],
  ['autocompletarRapido', CAR, 'presupuesto: 100, veces: 20,', 'presupuesto: 400, veces: 20,'],
  ['autocompletarRapido', CO, ', "direcciones"]', ']'],
  ['autocompletarRapido', T, '[ "${ms:-999}" -le 100 ]', '[ "${ms:-999}" -le 1000 ]'],
  // mensajesEnVivo: volver a preguntar cada N segundos, una pantalla sin escuchar, la lista del panel sin vivo, el cliente con intervalo fijo, la ruta sin
  // sesión o sin acceso al negocio, el texto en el aviso (en la ruta o en la base), sin el disparador, sin LISTEN
  ['mensajesEnVivo', CH, '  useMensajesVivo({ apagado: !hilo,', '  useEffect(() => { const t = window.setInterval(() => traer.current(), 4000); return () => window.clearInterval(t); }, []);\n  useMensajesVivo({ apagado: !hilo,'],
  ['mensajesEnVivo', DM, '  useMensajesVivo({ apagado: !c, on:', '  void ({ apagado: !c, on:'],
  ['mensajesEnVivo', LM, '<RefrescoVivo k="chat" />', ''],
  ['mensajesEnVivo', PN, '<RefrescoVivo negocio={d.id} k="chat" />', '<RefrescoVivo k="chat" />'],
  ['mensajesEnVivo', VC, '        espera = Math.min(espera * 2, 30000);', '        espera = 5000;'],
  ['mensajesEnVivo', PN, '  const ed = (D?.ed ?? (desk || !ruta.det ? S.ed : null)) ?? null;', '  useEffect(() => { if (ruta.sec !== "msg") return; const t = window.setInterval(() => router.refresh(), 5000); return () => window.clearInterval(t); }, [ruta.sec, router]);\n  const ed = (D?.ed ?? (desk || !ruta.det ? S.ed : null)) ?? null;'],
  ['mensajesEnVivo', RV, '  const u = await yo();\n  if (!u) return NO();', '  const u = (await yo()) ?? { id: "anon" };'],
  ['mensajesEnVivo', RV, 'if (negocio && !(await accesoPanel(negocio, "msg"))) return NO();', 'if (negocio && !negocio) return NO();'],
  ['mensajesEnVivo', RV, 'JSON.stringify({ k: x.k, t: x.t, con, para })', 'JSON.stringify({ k: x.k, t: x.t, con, para, texto: "" })'],
  ['mensajesEnVivo', M, "perform pg_notify('mensajes', json_build_object('k', 'chat', 't', new.thread_id, 'u', t.user_id, 'b', t.business_id)::text);", "perform pg_notify('mensajes', json_build_object('k', 'chat', 't', new.thread_id, 'u', t.user_id, 'b', t.business_id, 'body', new.body)::text);"],
  ['mensajesEnVivo', M, 'create trigger dm_messages_vivo after insert or update of hidden_at on dm_messages for each row execute function dm_messages_vivo();', ''],
  ['mensajesEnVivo', MV, 'await c.query("listen mensajes");', 'await c.query("select 1");'],
  // mensajesTapados: limpiar() sin tapar, la base sin el disparador
  ['mensajesTapados', ME, '  const tp = tapar(String(texto ?? ""));', '  const tp = { texto: String(texto ?? ""), tapado: false }; void tapar;'],
  ['mensajesTapados', M, "  if texto_con_secretos(new.body) then raise exception 'mensajes_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;", '  null;'],
  // guiaDelPanelCompleta (ampliado en 9m: lee las filas de todas las migraciones): el apartado «Dirección y mapa» sin su fila en la guía
  ['guiaDelPanelCompleta', M, "  ('pagina/dir', 'pagina/dir', 'page', 'always', '{\"es\":\"Dirección y mapa\",\"en\":\"Address and map\"}',", "  ('pagina/xyz', 'pagina/xyz', 'page', 'always', '{\"es\":\"Dirección y mapa\",\"en\":\"Address and map\"}',"],
];
const crear = [
  // direccionSinTerceros: otro archivo con un geocodificador o un enlace a la app de mapas fuera de lib/como-llegar.ts
  ['direccionSinTerceros', 'apps/web/lib/zz9m.ts', 'import "server-only";\nexport const u = "https://api.opencagedata.com/geocode/v1/json";\n'],
  ['direccionSinTerceros', 'apps/web/app/zz9m.tsx', '"use client";\nexport const ir = (lat: number, lng: number) => { window.location.href = `geo:${lat},${lng}`; };\n'],
  ['direccionSinTerceros', 'apps/web/app/zz9m.tsx', '"use client";\nexport const t = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
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
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
