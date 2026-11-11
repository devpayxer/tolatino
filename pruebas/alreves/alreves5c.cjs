// Prueba al revés de los guardianes de 5c: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const V = 'apps/web/lib/vecinos.ts', MV = 'apps/web/lib/mensajes-vecinos.ts', C = 'apps/web/lib/comunidad.ts', AV = 'apps/web/lib/avisos.ts', M = 'packages/db/migrations/0099_vecinos_mensajes.sql', AD = 'apps/web/lib/admin-dm.ts';
const G = 'bloqueoTodasLasSuperficies';
const casos = [
  // Bloqueo, una superficie por caso.
  [G, C, "or (ub.user_id = ${persona} and ub.target_user_id = ${viewer})))`;", "or (ub.user_id = ${viewer} and ub.target_user_id = ${persona})))`;"], // fragmento de un solo sentido
  [G, V, "  and ${sinBloqueo(`${u}.id`, viewer)}`;", "  and true`;"], // perfil · listas · sugerencias
  [G, V, "      where u.id = $2 and ${VISIBLE(\"u\", \"$1\")}`, [viewer, quien])).rows[0];", "      where u.id = $2`, [viewer, quien])).rows[0];"], // perfil
  [G, V, "      where f.follower_user_id = $1 and f.target_kind = 'user' and ${VISIBLE(\"u\", \"$1\")}", "      where f.follower_user_id = $1 and f.target_kind = 'user'"], // Siguiendo
  [G, V, "\"p.publish_at <= now()\", sinBloqueos(\"p.author_user_id\", \"$1\"),", "\"p.publish_at <= now()\","], // publicaciones del perfil
  [G, MV, "      where u.id = $2 and ${sinBloqueo(\"u.id\", \"$1\")}`, [viewer, otro])).rows[0] ?? null;", "      where u.id = $2`, [viewer, otro])).rows[0] ?? null;"], // mensajes: la otra persona
  [G, MV, "t.last_at is not null and t.closed_at is null and ${sinBloqueo(`t.${otro}_user_id`, \"$1\")}", "t.last_at is not null"], // lista de mensajes
  [G, MV, "  const o = await otraPersona(viewer, otroId);\n  if (!o) return null;\n  const t = await hiloDe(viewer, o.id);", "  const o = { id: otroId } as never as NonNullable<Awaited<ReturnType<typeof otraPersona>>>;\n  const t = await hiloDe(viewer, o.id);"], // abrir conversación
  [G, AV, "and ${SIN_BLOQUEO_AVISO}\n      order by n.id desc limit 31", "\n      order by n.id desc limit 31"], // bandeja
  [G, V, "{ href: `/comunidad/v/${userId}`, ref: [\"user\", userId], actor: userId });", "{ href: `/comunidad/v/${userId}`, ref: [\"user\", userId] });"], // aviso sin actor
  [G, M, "    if com_bloqueados(new.follower_user_id, new.target_id::uuid) then raise exception 'hay un bloqueo entre las dos personas'; end if;", ""], // base: seguir
  [G, M, "  if com_bloqueados(new.sender_user_id, otro) then raise exception 'hay un bloqueo entre las dos personas'; end if;", ""], // base: escribir
  [G, M, "    update dm_threads set closed_at = now() where a_user_id = x and b_user_id = y and closed_at is null;", ""], // base: cerrar conversación
  ['consultaConBloqueos', V, "export async function sugeridos(viewer: string, ciudad: string, n = 4, es = true) {", "export async function sugeridos(viewer: string, ciudad: string, n = 4, es = true) {\n  await db().query(`select id from users where home_city_id = $1`, [ciudad]);\n}\nexport async function sugeridos2(viewer: string, ciudad: string, n = 4, es = true) {"],
  ['dmSoloConReporte', 'apps/web/lib/admin-usuarios.ts', 'import "server-only";', 'import "server-only";\nconst Q = `select body from dm_messages where thread_id = $1`;'],
  ['dmSoloConReporte', AD, "         from dm_messages m where m.thread_id = $1::bigint and ${CON_REPORTE(\"m.thread_id\")} order by m.id desc limit 80`", "         from dm_messages m where m.thread_id = $1::bigint order by m.id desc limit 80`"],
  ['dmSoloConReporte', AD, "and q.status = 'open')\n  and exists", "and q.status in ('open', 'decided'))\n  and exists"],
  ['mensajesSinTelefonos', MV, "  const f = revisarMensaje(String(texto ?? \"\"));\n  if (f) return { ok: false, msg: f.msg, campo: f.campo };\n", ""],
  ['mensajesSinTelefonos', M, "alter table dm_messages add constraint dm_messages_body_datos check (com_sin_datos(body));", ""],
  ['mensajesSinTelefonos', V, "  const f = revisarPerfil({ bio: p.bio, apodo: p.apodo });\n  if (f) return { ok: false, msg: f.msg, campo: f.campo };\n", ""],
  ['mensajeSoloAQuienTeSigue', MV, "    if (!o.me_sigue && !t?.me_escribio) return { ok: false as const, msg: SOLO_SIGUE };\n", ""],
  ['mensajeSoloAQuienTeSigue', 'packages/db/migrations/0105_configuracion_comunidad.sql', "('com_lim_conversaciones', 1, 100, 10,", "('com_lim_conversaciones', 1, 100, 99,"], // 9a: el de fábrica vive en config_keys (0105)
  ['mensajeSoloAQuienTeSigue', M, "    raise exception 'solo le escribes a quien te sigue';", "    null;"],
  ['mensajeSoloAQuienTeSigue', 'apps/web/lib/mensajes-vecinos.ts', "  if (t && !cur) await db().query(`select dm_leido($1::bigint, $2::uuid)`, [t.id, viewer]);", "  if (t && !cur) await db().query(`update dm_threads set a_unread = 0 where id = $1`, [t.id]);"],
  ['sinFechaDeNacimiento', M, "alter table community_profiles add column if not exists adult boolean;", "alter table community_profiles add column if not exists adult boolean;\nalter table community_profiles add column if not exists birth_date date;"],
  ['sinFechaDeNacimiento', V, "  if (p.adulto !== true && p.adulto !== false) return no(", "  if (false) return no("],
  ['sinFechaDeNacimiento', C, "  const ok = !!r && r.adult === true && r.welcome && r.rules;", "  const ok = !!r && r.welcome && r.rules;"],
  ['reporteConLlave', MV, "                   on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', reason = excluded.reason, note = excluded.note, priority = excluded.priority,\n                     decided_by = null, decided_at = null, created_at = now(), device = excluded.device`", "`"],
  ['avisoComunidadSinSms', M, "('dm_message', 'tx', null, false,", "('dm_message', 'tx', null, true,"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`, orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 130) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
