// AO 5b · Prueba al revés de los guardianes de las noticias de las voces de la casa (lector de fuentes RSS/Atom): se inyecta el defecto, el guardián
// debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/noticias-lector.ts', C = 'apps/web/lib/noticias-comun.ts', N = 'apps/web/lib/compa/noticias.ts', M = 'packages/db/migrations/0216_anfitriones_noticias.sql', AF = 'apps/web/lib/anfitriones-fuentes.ts';
const casos = [
  // noticiasLectorSoloBarrido: una pantalla que lee una fuente, el motor que lee fuera del barrido, el barrido sin su tarea, «Probar» sin permiso.
  ['noticiasLectorSoloBarrido', 'apps/web/app/(app)/comunidad/acciones.ts', '"use server";', '"use server";\nimport { leerFuente } from "@/lib/noticias-lector";\nexport async function leerYa(id: string) { return leerFuente(id); }'],
  ['noticiasLectorSoloBarrido', N, '/* ── 2 · Publicar una nota en una ciudad', 'export async function leerOtra(id: string) { return leerFuente(id); }\n/* ── 2 · Publicar una nota en una ciudad'],
  ['noticiasLectorSoloBarrido', 'apps/web/lib/barrido.ts', '        ["anfitrionesFuentes", async () => (await import("./compa/noticias")).barrerFuentes()],\n', ''],
  ['noticiasLectorSoloBarrido', 'apps/web/lib/anfitriones-fuentes.ts', '  if (!deTodas(s)) return no("Tu rol no puede probar fuentes.");\n', ''],
  // noticiasLectorSeguro: la guarda de IP (192.168.x, IPv6 local y mapeada), el servidor de la fila, el tope de tamaño, la IP fija y el socket.
  ['noticiasLectorSeguro', C, '      || (x === 192 && y === 168) || (x === 192 && y === 0', '      || (x === 192 && y === 0'],
  ['noticiasLectorSeguro', C, '  if ((g[0]! & 0xe000) !== 0x2000) return true;', '  if (g[0] === 0xffff) return true;'],
  ['noticiasLectorSeguro', C, '  if (ips.some((x) => ipPrivada(x))) return', '  if (ipPrivada(ips[0]!)) return'],
  // Una IP escrita como servidor: las dos capas (la IP escrita y la terminación numérica) a la vez; con una sola, la otra la sigue frenando.
  ['noticiasLectorSeguro', C, '  if (h.startsWith("[") || v4(h) || /^[0-9.]+$/.test(h) || /^0x/i.test(h)) return { ok: false, error: "El servidor tiene que ser un nombre, nunca una dirección IP." };\n  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(h) || h.length > 253) return { ok: false, error: "El nombre del servidor no es válido." };\n  if (LOCALES.test(h) || /^\\d+$/.test(h.split(".").pop()!)) return',
    '  if (h.startsWith("[")) return { ok: false, error: "El servidor tiene que ser un nombre, nunca una dirección IP." };\n  if (LOCALES.test(h)) return'],
  ['noticiasLectorSeguro', L, '  if (!v.ok || v.host !== f.host) return', '  if (!v.ok) return'],
  ['noticiasLectorSeguro', L, ' || u.hostname.toLowerCase() !== f.host || u.port', ' || u.port'],
  ['noticiasLectorSeguro', L, 'LECTOR_MAX_BYTES = 1024 * 1024,', 'LECTOR_MAX_BYTES = 1024 * 8192,'],
  ['noticiasLectorSeguro', L, ' : pedirReal(u, r.ip, quedan, corte.signal),', ' : pedirReal(u, u.hostname, quedan, corte.signal),'],
  ['noticiasLectorSeguro', L, 'const reloj = setTimeout(() => corte.abort(), quedan);', 'const reloj = setTimeout(() => {}, quedan);'],
  ['noticiasLectorSeguro', L, '    req.on("socket", (s) => s.once("connect", ', '    req.on("socket", (s) => s.once("lookup", '],
  // noticiasXmlSinEntidades: sin el rechazo de DOCTYPE/ENTITY, sin tope de elementos, enlace a otro medio.
  ['noticiasXmlSinEntidades', C, '  if (/<!DOCTYPE/i.test(s) || /<!ENTITY/i.test(s)) throw new XmlNoSirve("XML con DOCTYPE o entidades: no se lee");\n', ''],
  ['noticiasXmlSinEntidades', C, '    if (++cuenta > XML_MAX_ELEMENTOS) throw new XmlNoSirve("demasiados elementos");\n', '    ++cuenta;\n'],
  ['noticiasXmlSinEntidades', C, '  if (h !== base && !h.endsWith(`.${base}`)) return null;\n', ''],
  ['noticiasXmlSinEntidades', C, ' ["violencia", VIOLENCIA],', ''],
  // noticiasApagadasDeFabrica
  ['noticiasApagadasDeFabrica', M, "  status        text not null default 'off' check (status in ('on', 'off', 'retired')),", "  status        text not null default 'on' check (status in ('on', 'off', 'retired')),"],
  ['noticiasApagadasDeFabrica', M, '-- ── Los números (Configuración › Comunidad) ──', "insert into com_host_sources (name, url, host, country, topic, host_user_id) values ('X', 'https://x.com/rss', 'x.com', 'DO', 'noticias', '0a0f0000-0000-4000-8000-000000000003');\n-- ── Los números (Configuración › Comunidad) ──"],
  ['noticiasApagadasDeFabrica', M, "  if new.source_url is not null and (new.author_user_id is null or not anf_es(new.author_user_id)) then", "  if false then"],
  // noticiasRetryAfter: una descarga que no lee Retry-After, el lector que no lo devuelve, el barrido sin el mínimo ni el techo, «Probar» que no aplaza,
  // y la función pura sin tope de absurdo, sin techo de un día o aceptando cualquier número.
  ['noticiasRetryAfter', L, '      if (est === 429 || est === 503) { res.resume(); return ok(', '      if (false) { res.resume(); return ok('],
  ['noticiasRetryAfter', L, '        if (espera) x.esperarS = espera;\n', ''],
  ['noticiasRetryAfter', N, 'next_read_at = now() + greatest(make_interval(mins => least(1440, $3::int * power(2, least(fails + 1, 10))::int)), make_interval(secs => least(86400, $4::int)))', 'next_read_at = now() + make_interval(secs => $4::int)'],
  ['noticiasRetryAfter', AF, '    if (esperarS) await c.query(`update com_host_sources set next_read_at = greatest(next_read_at, now() + make_interval(secs => $2::int)) where id = $1::bigint`, [id, esperarS]);\n', ''],
  ['noticiasRetryAfter', C, '  if (!(s > 0) || s > RETRY_AFTER_ABSURDO_S) return null;', '  if (!(s > 0)) return null;'],
  ['noticiasRetryAfter', C, '  return Math.min(s, RETRY_AFTER_MAX_S);', '  return s;'],
  ['noticiasRetryAfter', C, '  if (/^\\d{1,9}$/.test(v)) s = Number(v);', '  if (Number.isFinite(Number(v))) s = Number(v);'],
  // noticiasAlojadorExacto: el enlace de otro cliente del mismo alojador, el repartidor de feeds aceptado, un alojador fuera de la lista, blogspot de
  // otro país y «Probar» sin el aviso del repartidor.
  ['noticiasAlojadorExacto', C, '  if (alojadorCompartido(hf) && h !== hf) return null;\n', ''],
  ['noticiasAlojadorExacto', C, '  if (alojadorSoloFeeds(hf)) return null;\n', ''],
  ['noticiasAlojadorExacto', C, '"medium.com", "github.io", ', '"medium.com", '],
  ['noticiasAlojadorExacto', C, ' ?? (/(^|\\.)blogspot\\.(com\\.)?[a-z]{2}$/.test(h) ? "blogspot" : null);', ' ?? null;'],
  ['noticiasAlojadorExacto', AF, 'const soloFeeds = f ? alojadorSoloFeeds(f.host) : null,', 'const soloFeeds = null as string | null,'],
  // noticiasProbarDesglose: «Probar» que guarda notas o ignora las palabras de la fuente, el barrido con su propia regla, un conteo mal hecho, un motivo
  // que se pierde, la pantalla o la acción sin el desglose.
  ['noticiasProbarDesglose', AF, '    // La fuente pidió esperar: el barrido', '    await c.query(`insert into com_host_news (source_id, fingerprint, status) values ($1::bigint, $2, \'nueva\')`, [id, "x"]);\n    // La fuente pidió esperar: el barrido'],
  ['noticiasProbarDesglose', AF, 'desgloseNotas(r.notas, f?.veto_words ?? [], ', 'desgloseNotas(r.notas, [], '],
  ['noticiasProbarDesglose', N, 'const m = motivoNota(n, f.veto_words, horas, Date.now(), delicado);', 'const m = motivoNota(n, [], horas, Date.now(), () => null);'],
  ['noticiasProbarDesglose', C, '    if (n.enlace) conEnlace++;', '    conEnlace++;'],
  ['noticiasProbarDesglose', C, '  if (d) return { motivo: "delicado", detalle: d };\n', ''],
  ['noticiasProbarDesglose', 'apps/web/app/admin/AnfitrionesAdmin.tsx', '...(prueba ? bloquesPrueba(prueba) : [])', '...([] as Bloque[])'],
  ['noticiasProbarDesglose', 'apps/web/app/admin/acciones-anfitriones.ts', 'const p = r.prueba ? { prueba: r.prueba } : {};', 'const p = {};'],
  // proveedoresSimuladorAislado: la variable de simulador de las noticias, permitida en producción o leída sin la regla.
  ['proveedoresSimuladorAislado', 'infra/comun/secretos.json', '  "NOTICIAS_RSS_BASE": { "origen": "prohibida" },\n', ''],
  ['proveedoresSimuladorAislado', L, 'export const resolverDeFuentes = (): Resolver => resolverDe(origenDePruebas(process.env.NOTICIAS_RSS_BASE));', 'export const resolverDeFuentes = (): Resolver => resolverDe(process.env.NOTICIAS_RSS_BASE ? new URL(process.env.NOTICIAS_RSS_BASE) : null);'],
  ['proveedoresSimuladorAislado', 'pruebas/servir/servir.sh', 'VARS+=(NOTICIAS_RSS_BASE=http://127.0.0.1:$P_PROVRSS)\n', ''],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { out = String(e.stderr).split('\n').find((l) => l.includes(`[${g}]`)) || ''; falla = !!out; }
  finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R);
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
