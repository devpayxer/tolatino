// AO · Prueba al revés de los guardianes de los anfitriones del barrio: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0215_anfitriones.sql', A = 'apps/web/lib/compa/anfitriones.ts', F = 'apps/web/lib/anfitriones-comun.ts';
const T = 'apps/web/app/(app)/comunidad/Tarjeta.tsx', H = 'apps/web/app/(app)/comunidad/p/[id]/Hilo.tsx', C = 'apps/web/lib/comunidad.ts';
const casos = [
  // anfitrionSiempreMarcado: la tarjeta, el hilo, el autor de la base, el aviso y un sitio NUEVO que pinta autores sin la marca.
  ['anfitrionSiempreMarcado', T, 'rk = anf ? { label: anf, shield: null } : a.oficial', 'rk = a.oficial'],
  ['anfitrionSiempreMarcado', 'apps/web/app/(app)/buscar/Buscar.tsx', '{x.anfitrion ? <span data-anfitrion="1"', '{false ? <span data-anfitrion="1"'],
  ['anfitrionSiempreMarcado', 'apps/web/app/admin/Contenido.tsx', ': x.anf ? marcaAnfitrion(x.anf, !EN)!.toUpperCase() : x.oficial', ': x.oficial'],
  ['anfitrionSiempreMarcado', H, 'rank: c.autor.anfitrion ? { label: marcaAnfitrion(c.autor.anfitrion, es)!.toUpperCase(), tone: "ink" } : c.autor.rango >= 4', 'rank: c.autor.rango >= 4'],
  ['anfitrionSiempreMarcado', C, "left join com_hosts h on h.user_id = u.id and u.kind = 'host'", "left join com_hosts h on false"],
  ['anfitrionSiempreMarcado', 'apps/web/lib/comunidad-hilo.ts', 'await avisar(a.id, a.tpl, { nombre: nombreConMarca(yo.nombre, yo.anfitrion), texto }', 'await avisar(a.id, a.tpl, { nombre: yo.nombre, texto }'],
  ['anfitrionSiempreMarcado', 'apps/web/app/(app)/comunidad/Linea988.tsx', '"use client";', '"use client";\nimport type { Pub } from "@/lib/comunidad-comun";\nexport const QuienEs = ({ p }: { p: Pub }) => <b>{p.autor.nombre}</b>;'],
  ['anfitrionSiempreMarcado', 'apps/web/app/(app)/comunidad/p/[id]/Publicacion.tsx', '${(marcaAnfitrion(a.anfitrion, es) ?? (es ? rango(a.rango).es : rango(a.rango).en)).toUpperCase()}', '${(es ? rango(a.rango).es : rango(a.rango).en).toUpperCase()}'],
  ['anfitrionSiempreMarcado', 'apps/web/app/(app)/comunidad/v/[id]/Vecino.tsx', '{!anf && <div style={{ display: "flex", flex: 1 }}><Button variant="secondary" size="md" block icon="chat"', '{<div style={{ display: "flex", flex: 1 }}><Button variant="secondary" size="md" block icon="chat"'],
  // anfitrionSinPuntosNiMensajes
  ['anfitrionSinPuntosNiMensajes', M, 'create trigger anf_points_entries_sin_anfitrion before insert on points_entries for each row execute function anf_no_aplica();', ''],
  ['anfitrionSinPuntosNiMensajes', M, 'create trigger anf_dm_threads_sin_anfitrion before insert on dm_threads for each row execute function anf_no_aplica();', ''],
  ['anfitrionSinPuntosNiMensajes', 'apps/web/lib/tabla.ts', "where u.kind = 'person' and ${w.join", "where ${w.join"],
  ['anfitrionSinPuntosNiMensajes', 'apps/web/lib/vecinos.ts', 'puedeEscribir: !yo && !r.anf && ', 'puedeEscribir: !yo && '],
  // anfitrionesNuncaProveedorEnPruebas
  ['anfitrionesNuncaProveedorEnPruebas', A, '  if (ENTORNO !== "produccion") return m === "reglas" ? "reglas" : "simulador";\n', ''],
  ['anfitrionesNuncaProveedorEnPruebas', A, 'const motor = motorAnfitriones(), m = await modelo(motor);', 'const motor = motorActivo(), m = await modelo(motor);'],
  // anfitrionesSoloBarrido
  ['anfitrionesSoloBarrido', 'apps/web/app/(app)/comunidad/acciones.ts', '"use server";', '"use server";\nexport async function anfAhora() { return (await import("@/lib/compa/anfitriones")).barrerAnfitriones(); }'],
  ['anfitrionesSoloBarrido', 'apps/web/lib/anfitriones.ts', 'import "server-only";', 'import "server-only";\nimport { modelo } from "./compa/modelo";\nvoid modelo;'],
  // anfitrionesApagadosDeFabrica
  ['anfitrionesApagadosDeFabrica', M, "  mode           text not null default 'off'", "  mode           text not null default 'auto'"],
  ['anfitrionesApagadosDeFabrica', M, "on conflict (key) do nothing;\n\n-- ── La pregunta", "on conflict (key) do nothing;\nupdate com_host_kinds set active = true;\n\n-- ── La pregunta"],
  // anfitrionFiltroPropio
  ['anfitrionFiltroPropio', A, '  const f = filtroAnfitrion(s.texto, { negocioDeLaApp: !!s.negocio });\n  if (f) return anotar({ ...base, ...caro, motivo: "filtro", detalle: f }).then(() => false);\n', ''],
  ['anfitrionFiltroPropio', A, '  if (ref && !refs.has(ref)) return null;', '  if (false) return null;'],
  ['anfitrionFiltroPropio', F, '  if (PRECIO.test(t)) return "precio";\n', ''],
  ['anfitrionFiltroPropio', F, '  if (LEGAL.test(t)) return "legal";\n', ''],
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
