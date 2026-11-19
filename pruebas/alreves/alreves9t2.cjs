// Prueba al revés de los guardianes de 9t (19 nov): esperaMesaUnaVez («Avísame si se libera» de una mesa: una vez, solo a su dueña, con su mesa a su
// nombre y nunca en sus horas de silencio), otrosConMesaDeLaCiudad («Otros restaurantes con mesa»: misma ciudad, activos, Pro, con Reservaciones y sin
// pausa, el mismo motor y sin N+1) y medirDesdeTuDireccion (Mi ciudad › Casa / Trabajo: el punto lo pone el servidor con las direcciones de quien mira y
// nunca viaja a la pantalla ni a la cookie). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const ME = 'apps/web/lib/mesa-espera.ts', RS = 'apps/web/lib/reservas.ts', MIG = 'packages/db/migrations/0181_mesa_espera_9t.sql', BA = 'apps/web/lib/barrido.ts';
const UB = 'apps/web/lib/ubicacion.ts', DI = 'apps/web/lib/direcciones.ts', AC = 'apps/web/app/(app)/ciudad/acciones.ts', PG = 'apps/web/app/(app)/reserva/[num]/page.tsx';
const E = 'esperaMesaUnaVez', O = 'otrosConMesaDeLaCiudad', D = 'medirDesdeTuDireccion';
const casos = [
  // ── La lista de espera ──
  // dos entradas vivas de la misma persona para la misma mesa (se avisaría dos veces)
  [E, MIG, "create unique index if not exists reservation_waitlist_viva on reservation_waitlist (user_id, business_id, starts_at, party_size) where status in ('waiting', 'offered');", "create index if not exists reservation_waitlist_viva on reservation_waitlist (user_id, business_id, starts_at, party_size);"],
  // una mesa ofrecida vuelve a la fila (y se ofrece otra vez)
  [E, MIG, "  if old.status = 'offered' and new.status = 'waiting' then raise exception 'reservation_waitlist: una mesa ofrecida no vuelve a la fila'; end if;\n", ""],
  // la entrada cambia de dueña
  [E, MIG, "if new.user_id <> old.user_id or ", "if "],
  // el SMS sale siempre (no solo de respaldo del push)
  [E, MIG, "('rsv_libre', 'tx', 'cit', true, 'sin_push', true,", "('rsv_libre', 'tx', 'cit', true, 'siempre', true,"],
  // la solicitud se lee sin su dueño: cualquiera se anota en la mesa de otro
  [E, ME, "where o.number = $1 and o.user_id = $2::uuid and o.kind = 'table'", "where o.number = $1 and o.kind = 'table'"],
  // soltar la entrada de otra persona
  [E, ME, "where id = $1::bigint and user_id = $2::uuid and status in ('waiting', 'offered') returning", "where id = $1::bigint and status in ('waiting', 'offered') returning"],
  // soltar la retención de otra persona
  [E, ME, "delete from reservation_holds where id = $1::uuid and user_id = $2::uuid", "delete from reservation_holds where id = $1::uuid"],
  // la pantalla muestra la entrada de otra persona
  [E, ME, "from reservation_waitlist w where w.operation_id = $1::bigint and w.user_id = $2::uuid order by w.id desc limit 1", "from reservation_waitlist w where w.operation_id = $1::bigint order by w.id desc limit 1"],
  // el barrido no reclama la entrada en la misma escritura (dos barridos a la vez avisan dos veces)
  [E, ME, "hold_id = $2::uuid where id = $1::bigint and status = 'waiting'`", "hold_id = $2::uuid where id = $1::bigint`"],
  // la mesa se guarda a nombre de otra persona
  [E, ME, "select w.business_id, w.user_id, w.starts_at, w.party_size, $2,", "select w.business_id, (select user_id from reservation_waitlist order by id limit 1), w.starts_at, w.party_size, $2,"],
  // de noche también se ofrece
  [E, ME, "if (e.st !== \"libre\" || w.silencio) continue;", "if (e.st !== \"libre\") continue;"],
  // el aviso sin notif_once (se repite)
  [E, ME, "    if (!(await una(`rsv_libre:${w.id}`))) continue;\n", ""],
  // el aviso a otra persona
  [E, ME, 'await avisar(w.uid, "rsv_libre"', 'await avisar(r.out[0]!.uid, "rsv_libre"'],
  // rsvEnviar marca tomada la entrada de otra persona
  [E, RS, "where hold_id = $1::uuid and user_id = $2 and status = 'offered'`", "where hold_id = $1::uuid and status = 'offered'`"],
  // el barrido no corre la lista
  [E, BA, '["esperaMesas", async () => (await import("./mesa-espera")).barrerEsperaMesas()],', ''],
  // ── Otros restaurantes con mesa ──
  // de cualquier ciudad
  [O, RS, "join businesses b on b.city_id = o.city_id", "join businesses b on true"],
  // el mismo restaurante que no pudo
  [O, RS, "where b.id <> $1 and b.category_id = o.category_id and b.status = 'active'", "where b.category_id = o.category_id and b.status = 'active'"],
  [O, RS, "where b.id <> $1 and b.category_id = o.category_id and b.status", "where b.id <> $1 and b.status"],
  // cerrados o suspendidos
  [O, RS, "b.category_id = o.category_id and b.status = 'active' and st.plan", "b.category_id = o.category_id and st.plan"],
  // sin Pro
  [O, RS, "and st.plan = 'pro' and 'rsv'", "and 'rsv'"],
  // con Reservaciones en pausa de To'Latino
  [O, RS, " and not (coalesce(b.modules_off, '{}'::jsonb) ? 'rsv')\n      order by b.geo", "\n      order by b.geo"],
  // sin tope de candidatos
  [O, RS, "order by b.geo <-> o.g nulls last, b.id limit ${OTROS_CANDIDATOS}`", "order by b.geo <-> o.g nulls last, b.id`"],
  // N+1: una lectura por candidato
  [O, RS, "    if (!areasOn(x.s).length) continue;\n    const i = Math.round", "    if (!areasOn(x.s).length) continue;\n    await db().query(`select 1`);\n    const i = Math.round"],
  // otro motor (sin ocupación)
  [O, RS, 'if (areaLibre(x, d, t, p, "", O, B)) mejor = t;', 'if (enHorario(x, d, t)) mejor = t;'],
  // un día cerrado sale
  [O, RS, "if (i < 0 || !d.abierto || p > maxGrupo(x.s)) continue;", "if (i < 0) continue;"],
  // en cualquier estado de la reservación
  [O, PG, 'const lost = (r.st === "no" || r.st === "exp") && r.dia >= 0;', 'const lost = true;'],
  // ── Mi ciudad: Casa / Trabajo ──
  // el punto de la dirección lo trae la cookie (cualquier id cae en el primer punto)
  [D, UB, 'const d = p.z?.startsWith("dir:") ? dirs?.find((x) => `dir:${x.id}` === p.z) : undefined;', 'const d = p.z?.startsWith("dir:") ? dirs?.[0] : undefined;'],
  // las direcciones de otra persona
  [D, UB, '(await import("./direcciones")).puntosGuardados(usuario.id)', '(await import("./direcciones")).puntosGuardados(String(p.z).slice(4))'],
  // direcciones quitadas
  [D, DI, "where a.user_id = $1 and a.removed_at is null and a.geo is not null", "where a.user_id = $1 and a.geo is not null"],
  // la cookie guarda el punto de una dirección
  [D, AC, "g: u.gps ? [u.lat, u.lng] : null }),", "g: [u.lat, u.lng] }),"],
  // el selector mide con las direcciones de otro
  [D, AC, "const dirs = me && String(p.z ?? \"\").startsWith(\"dir:\") ? await puntosGuardados(me.id) : undefined;\n  const u = resolver(cs, { c: String(p.c ?? \"\"), z: String(p.z ?? \"\"), r: Number(p.r), g }, dirs);\n  const jar", "const dirs = String(p.z ?? \"\").startsWith(\"dir:\") ? await puntosGuardados(String(p.z).slice(4)) : undefined;\n  const u = resolver(cs, { c: String(p.c ?? \"\"), z: String(p.z ?? \"\"), r: Number(p.r), g }, dirs);\n  const jar"],
  // el punto viaja a la pantalla
  [D, AC, "dirs: puntos.map((d) => ({ k: `dir:${d.id}`, label: d.label,", "dirs: puntos.map((d) => ({ k: `dir:${d.id}`, lat: d.lat, lng: d.lng, label: d.label,"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
