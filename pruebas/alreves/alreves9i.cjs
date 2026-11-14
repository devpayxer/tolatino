// Prueba al revés de los guardianes de 9i (Ciudades: una ciudad solo abre con el asistente y cierra con otra persona, el cambio se nota al instante en
// todos los procesos, la beta es solo para invitados y la lista de espera recibe UN aviso de día) y de revisionVeCiudadAbierta con el estado «beta».
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0139_ciudades.sql', A = 'apps/web/lib/ciudades/apertura.ts', AV = 'apps/web/lib/ciudades/aviso.ts', CO = 'apps/web/lib/ciudades/comun.ts',
  CC = 'apps/web/lib/cambios-config.ts', U = 'apps/web/lib/ubicacion.ts', S = 'apps/web/app/(app)/ciudad/acciones.ts', PF = 'apps/web/lib/perfil.ts', VE = 'apps/web/lib/vecinos.ts',
  CM = 'apps/web/lib/comunidad.ts', PA = 'apps/web/lib/panel.ts', BA = 'apps/web/lib/barrido.ts';
const casos = [
  // ciudadConAsistente · la base: abrir sin asistente fuera del sandbox, un asistente de otra ciudad o sin sus pasos, cerrar sin otra persona, los pasos que se cambian o saltan
  ['ciudadConAsistente', M, "    elsif not ciudades_sandbox() then\n      raise exception 'ciudad_apertura: una ciudad solo abre con el asistente", "    elsif false then\n      raise exception 'ciudad_apertura: una ciudad solo abre con el asistente"],
  ['ciudadConAsistente', M, "if not found or l.city_id <> new.id or l.status <> 'en_curso' then", "if not found then"],
  ['ciudadConAsistente', M, "step between 1 and 6;\n      if n < 6 then raise exception", "step between 1 and 6;\n      if n < 1 then raise exception"],
  ['ciudadConAsistente', M, " or r.decided_by is null or r.decided_by = r.requested_by then", " then"],
  ['ciudadConAsistente', M, "check (decided_by is null or decided_by <> requested_by),", ""],
  ['ciudadConAsistente', M, "if tg_op <> 'INSERT' then raise exception 'ciudad_paso: un paso del asistente no se cambia ni se borra", "if tg_op = 'DELETE' then raise exception 'ciudad_paso: un paso del asistente no se cambia ni se borra"],
  ['ciudadConAsistente', M, "if new.step <> m + 1 then raise exception", "if new.step <= m then raise exception"],
  ['ciudadConAsistente', M, "if (select count(*) from city_launch_steps where launch_id = new.id) < 7 then raise exception", "if (select count(*) from city_launch_steps where launch_id = new.id) < 1 then raise exception"],
  ['ciudadConAsistente', M, "if legal_entorno() = 'pruebas' then return true; end if;", "if legal_entorno() <> 'produccion' then return true; end if;"],
  // ciudadConAsistente · el servidor: abrir sin tl.apertura, sin ser Admin, un paso que no toca, sin evidencia, aprobar el cierre uno mismo o sin tl.cierre
  ['ciudadConAsistente', A, '      await rastro(c, s, m, { "tl.apertura": l });\n', '      await rastro(c, s, m);\n'],
  ['ciudadConAsistente', A, 'if ((paso === 7 || abrirIgual) && !esAdmin(s)) return mal(', 'if (false) return mal('],
  ['ciudadConAsistente', A, 'if (paso !== hecho + 1) return mal(', 'if (paso < hecho) return mal('],
  ['ciudadConAsistente', A, 'if (!ev.ok && !(paso === 6 && abrirIgual && ev.abrirIgual)) return', 'if (!ev.ok && !abrirIgual) return'],
  ['ciudadConAsistente', A, 'if (x.by === s.id) return mal(', 'if (false) return mal('],
  ['ciudadConAsistente', A, '      await rastro(c, s, m, { "tl.cierre": pedido });\n', '      await rastro(c, s, m);\n'],
  ['ciudadConAsistente', A, 'const frena = !LA.leida || (!sandbox && LA.deLaCiudad.length > 0)', 'const frena = !LA.leida'],
  ['ciudadConAsistente', A, 'abrirIgual: !R.cumple && !frena,', 'abrirIgual: !R.cumple,'],
  // ciudadAlInstante: sin NOTIFY 'ciudades' (o sin barrios), el proceso que no escucha, la copia que dura más de 60 s, la beta guardada en memoria
  ['ciudadAlInstante', M, "perform pg_notify('ciudades', tg_table_name);", "perform 1;"],
  ['ciudadAlInstante', M, "create trigger zones_avisa_ciudades after insert or update or delete on zones for each statement execute function ciudades_avisar();", ""],
  ['ciudadAlInstante', CC, 'listen tl_config; listen ciudades', 'listen tl_config'],
  ['ciudadAlInstante', U, 'Date.now() - cache.at < 60_000', 'Date.now() - cache.at < 600_000'],
  ['ciudadAlInstante', U, '  if (!cs.some((c) => c.status === "beta")) return cs;', '  if (!cs.some((c) => c.status === "beta")) return cs;\n  const cache = 1; void cache;'],
  // betaSoloInvitados: la base deja entrar a cualquiera o a una invitación quitada, ubicacion sin vista, la beta abierta para todos, el selector sin vista,
  // y las acciones del servidor con «status = 'on'» a secas
  ['betaSoloInvitados', M, "i.user_id = p_user and i.revoked_at is null", "i.user_id = p_user"],
  ['betaSoloInvitados', M, "c.status = 'on' or (c.status = 'beta' and p_user is not null and (", "c.status in ('on', 'beta') or (c.status = 'beta' and p_user is not null and ("],
  ['betaSoloInvitados', U, '  const cs = await vista(cs0, usuario?.id);', '  const cs = cs0;'],
  ['betaSoloInvitados', U, 'c.status === "beta" ? { ...c, status: dentro.has(c.id) ? "on" : "soon" } : c', 'c.status === "beta" ? { ...c, status: "on" } : c'],
  ['betaSoloInvitados', S, '  const cs = await vista(await ciudades(), me?.id);', '  const cs = await ciudades();'],
  ['betaSoloInvitados', PF, 'where ciudad_abierta_para(c.id, $1::uuid) order by c.name`, [userId]),', "where c.status = 'on' order by c.name`),"],
  ['betaSoloInvitados', VE, 'select 1 from cities where id = $1 and ciudad_abierta_para(id, $2::uuid)`, [String(p.ciudad), userId]', "select 1 from cities where id = $1 and status = 'on'`, [String(p.ciudad)]"],
  ['betaSoloInvitados', CM, 'ciudad_abierta_para($2::text, u.id) as "ciudadOn"', `coalesce((select status = 'on' from cities where id = $2), false) as "ciudadOn"`],
  ['betaSoloInvitados', PA, 'ciudad_abierta_para(c.id, b.owner_user_id) as ciudad_on', "c.status = 'on' as ciudad_on"],
  // listaAvisadaUnaVez: dos avisos a la misma persona, la tabla que se cambia, el SMS sin esperar al push, sin reclamar, de noche, la red dentro de la
  // transacción, un SMS a un teléfono sin cuenta, la ventana de noche, sin barrido
  ['listaAvisadaUnaVez', M, "  at         timestamptz not null default now(),\n  unique (city_id, user_id)\n);", "  at         timestamptz not null default now()\n);"],
  ['listaAvisadaUnaVez', M, "create trigger city_notices_reglas before update or delete on city_notices", "create trigger city_notices_reglas before delete on city_notices"],
  ['listaAvisadaUnaVez', M, "('ciudad_abierta', 'tx', null, true, 'sin_push', true,", "('ciudad_abierta', 'crit', null, true, 'siempre', true,"],
  ['listaAvisadaUnaVez', AV, 'on conflict (city_id, user_id) do nothing returning user_id::text as uid', 'returning user_id::text as uid'],
  ['listaAvisadaUnaVez', AV, 'extract(hour from now() at time zone c.timezone) between ${AVISO_DESDE} and ${AVISO_HASTA}', 'true'],
  ['listaAvisadaUnaVez', AV, '    if (E.length) await q.query(', '    for (const u of reclamados) await avisar(u.uid, "ciudad_abierta", { ciudad: c.name });\n    if (E.length) await q.query('],
  ['listaAvisadaUnaVez', AV, '  const base = BASE_URL();', '  const base = BASE_URL();\n  await (await import("../avisos")).avisarTelefono("+15705550000", "ciudad_abierta", { ciudad: c.name });'],
  ['listaAvisadaUnaVez', CO, 'export const AVISO_DESDE = 9, AVISO_HASTA = 20;', 'export const AVISO_DESDE = 6, AVISO_HASTA = 23;'],
  ['listaAvisadaUnaVez', BA, '        ["avisoApertura", async () => (await import("./ciudades/aviso")).avisarAperturas()],\n', ''],
  // parametroDeMas: el defecto que cazó ciu9i (la ciudad como $1 en un update que no la usa)
  ['parametroDeMas', AV, 'where w.id = x.id`, [c.launch, avisados,', 'where w.id = x.id`, [c.id, c.launch, avisados,'],
  // revisionVeCiudadAbierta (9a) con «beta»: la semilla ya no abre Hazleton (las cuentas de revisión verían «próximamente»)
  ['revisionVeCiudadAbierta', 'infra/pruebas/semilla/0002_ciudad.sql', "update cities set status = 'on'", "update cities set status = 'soon'"],
];
const crear = [
  // ciudadConAsistente: otro archivo que abre una ciudad a mano; una semilla nueva que la abre
  ['ciudadConAsistente', 'apps/web/lib/zz9i.ts', 'import "server-only";\nexport const q = `update cities set status = \'on\', opened_at = now() where id = $1`;\n'],
  ['ciudadConAsistente', 'infra/pruebas/semilla/0099_zz9i.sql', "begin;\nupdate cities set status = 'on' where id = 'alw';\ncommit;\n"],
  // ciudadAlInstante: una copia con hora de los barrios que no se olvida con el NOTIFY
  ['ciudadAlInstante', 'apps/web/lib/zz9i.ts', 'import "server-only";\nimport { db } from "./db";\nlet cache: { at: number; z: unknown[] } | null = null;\nexport async function barrios() { if (cache && Date.now() - cache.at < 300_000) return cache.z; cache = { at: Date.now(), z: (await db().query(`select id from zones`)).rows }; return cache.z; }\n'],
  // betaSoloInvitados: una acción nueva que decide «abierta» con status = 'on'
  ['betaSoloInvitados', 'apps/web/lib/zz9i.ts', 'import "server-only";\nexport const q = `select 1 from cities where id = $1 and status = \'on\'`;\n'],
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
