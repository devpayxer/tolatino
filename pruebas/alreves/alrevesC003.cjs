// Prueba al revés de C-003 (Patrocinados de Eventos). patrocinioEventoDelServidor: la vitrina muestra lo que no está activo, lo de otra ciudad, lo
// de un evento cancelado o no publicado, o más que los puestos; el precio sale de la pantalla o está escrito a mano; «hasta el evento» se renueva o
// existe para un evento que ya llegó; el barrido no termina lo de un evento cancelado o que pasó; comprar sin «Cobros» o sin «Eventos», sin mismo
// origen o desde la app; otra pieza escribe event_sponsorships; el Patrocinado del teléfono sin la palabra; la base deja pasar de los puestos,
// patrocina un evento sin fecha publicada o deja cambiar lo pagado. Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
// 0175 (17 nov): la vitrina, las vistas o «vencer» con lo que está en pausa; el barrido que no pausa, no sigue o no reintenta devoluciones; un
// evento cancelado sin devolver; el fin que se alarga más que la pausa o sin revisar los puestos; terminar con un monto de la pantalla; comprar
// sin 3-D Secure. Las reglas de la base que 0175 reescribe (patrocinio_evt_reglas) se miran en 0175.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/patrocinio-evento.ts', EP = 'apps/web/lib/evt-publico.ts', A = 'apps/web/app/panel/acciones-patrocinio-evento.ts', PG = 'apps/web/app/(app)/eventos/page.tsx',
  T = 'apps/web/app/(app)/eventos/PatrocinadosEventos.tsx', BR = 'apps/web/lib/barrido.ts', M = 'packages/db/migrations/0174_patrocinio_eventos.sql',
  M5 = 'packages/db/migrations/0175_patrocinio_devoluciones.sql', AC = 'apps/web/app/admin/acciones-crecimiento.ts';
const G = 'patrocinioEventoDelServidor';
const casos = [
  // La vitrina: lo reservado sale; otra ciudad; un evento cancelado o no publicado; sin tope de puestos.
  [EP, "from event_sponsorships where city_id = $2 and status = 'activo' and starts_at <= now() and ends_at > now()", "from event_sponsorships where city_id = $2 and status in ('activo', 'reservado')"],
  [EP, "from event_sponsorships where city_id = $2 and status = 'activo'", "from event_sponsorships where status = 'activo'"],
  [EP, "where ${VIVO} and d.city_id = $2 and e.status <> 'cancelled'", "where d.city_id = $2"],
  [EP, 'limit ${cfgPuestosEvt}`', 'limit 50`'],
  // El precio: de la pantalla o escrito a mano; «hasta el evento» mal cobrado o para un evento que ya llegó.
  [L, 'export type CompraEvtIn = { dur: DurE;', 'export type CompraEvtIn = { centavos: number; dur: DurE;'],
  [L, 'const centavos = f.precio, idem', 'const centavos = 1500, idem'],
  [L, 'precio: P.week * semanas, semanas', 'precio: P.week, semanas'],
  [L, 'precio: dur === "week" ? P.week : P.month,', 'precio: dur === "week" ? 1500 : 4500,'],
  [L, 'return { week: v.patrocinio_evt_semana_cents, month: v.patrocinio_evt_mes_cents,', 'return { week: 1500, month: v.patrocinio_evt_mes_cents,'],
  [L, 'if (!e.dia || !e.fin || e.dia <= sd) return null;', 'if (!e.dia || !e.fin) return null;'],
  [L, 'const renovar = x.dur !== "until_event" && !!x.renovar;', 'const renovar = !!x.renovar;'],
  [L, 'const centavos = s.duration === "week" ? P.week : P.month, idem = `pat-evento-renov', 'const centavos = s.duration === "week" ? 1000 : P.month, idem = `pat-evento-renov'],
  // El barrido: no termina lo de un evento cancelado o que ya pasó; no corre.
  [L, "and e.status = 'cancelled' returning", "and e.status = 'done' returning"],
  [L, "not exists (select 1 from event_dates d where d.event_id = s.event_id and d.status = 'scheduled' and d.ends_at > now())", "false"],
  [BR, '["patrociniosEventos", async () => (await import("./patrocinio-evento")).barrerPatrociniosEventos()],', ''],
  // Comprar: sin «Cobros», sin «Eventos», sin mismo origen, desde la app.
  [A, 'const a = await accesoPanel(id, "pay");', 'const a = await accesoPanel(id);'],
  [A, 'return a && (a.partes.includes("all") || a.partes.includes("evt")) ? a : null;', 'return a;'],
  [A, '  if (!(await mismoOrigen())) return null;\n', ''],
  [A, '  if (!(await enLaWeb())) return EN_APP;\n  const dur', '  const dur'],
  [A, '  if (on === true && !(await enLaWeb())) return EN_APP;\n', ''],
  // La cartelera sin la vitrina del servidor o sin contar vistas; el Patrocinado del teléfono sin la palabra.
  [PG, 'contarVistas("evento", spon.map((x) => x.sid)', 'contarVistas("negocio", spon.map((x) => x.sid)'],
  [T, 'es ? "PATROCINADO" : "SPONSORED"', 'es ? "" : ""'],
  // La base: sin candado o sin tope; un evento sin fecha publicada; se puede cambiar lo pagado; «hasta el evento» con renovación.
  [M5, "if new.status in ('reservado', 'activo') then\n    perform pg_advisory_xact_lock(hashtextextended('patevt:' || new.city_id, 0));", "if new.status in ('reservado', 'activo') then\n    -- sin candado"],
  [M5, 'exists (select 1 from public.event_dates d where d.event_id = e.id and d.listable and d.ends_at > now())', 'true'],
  [M5, 'or new.duration <> old.duration or new.price_cents <> old.price_cents', 'or new.duration <> old.duration'],
  [M, "check (duration <> 'until_event' or not auto_renew)", "check (true)"],
  // 0175 · La pausa: la vitrina, las vistas y «vencer» con lo que está en pausa; el barrido no pausa ni sigue.
  [EP, 'and ends_at > now() and paused_at is null),', 'and ends_at > now()),'],
  [M5, "and s.status = 'activo' and s.paused_at is null),", "and s.status = 'activo'),"],
  [L, 'update event_sponsorships s set paused_at = now()', 'update event_sponsorships s set updated_at = now()'],
  [L, "where status = 'activo' and paused_at is null and ends_at <= now()", "where status = 'activo' and ends_at <= now()"],
  [L, 'await reanudarUno(id)', 'await (async () => null)()'],
  // Devolver: un evento cancelado sin devolver; el barrido sin reintentar; terminar con un monto de la pantalla; la reserva cancelada sin devolver.
  [L, `DEVOLUCION("'sin_usar'", "'evento_cancelado'", true, "s.")`, `DEVOLUCION("'nada'", "'evento_cancelado'", true, "s.")`],
  [L, '  await devolverPendientes("evento");\n', ''],
  [AC, 'terminarPorAdminEvento(s.id, s.cities, S(id, 18), S(motivo), devolver === true)', 'terminarPorAdminEvento(s.id, s.cities, S(id, 18), S(motivo), Number(devolver) > 0)'],
  [L, `"case when status = 'reservado' then 'todo' else 'nada' end", "'reserva_cancelada'", true)`, `"'nada'", "'reserva_cancelada'", true)`],
  // La base: el fin se alarga más que la pausa, o sin revisar los puestos.
  [M5, ' or new.extended_secs > new.paused_secs then', ' then'],
  [M5, "if public.patrocinio_evt_a_la_vez(new.city_id, old.ends_at, new.ends_at, new.id) >= public.cfg_int('patrocinio_evt_puestos') then", 'if false then'],
  // 3-D Secure al comprar el patrocinio de un evento.
  [L, 'meta: { business_id: negocio, event_id: evento, duration: x.dur }, enSesion: true };', 'meta: { business_id: negocio, event_id: evento, duration: x.dur } };'],
  [L, '    const sc = await soltarRetenido(retenido, er);\n', ''],
];
const crear = [
  // Otra pieza que escribe patrocinios de eventos por su cuenta.
  ['apps/web/lib/zz-alreves-patevt.ts', 'export const q = "update event_sponsorships set status = \'activo\' where id = $1";\n'],
  ['apps/web/app/zz-alreves-patevt.ts', 'export const q = "insert into event_sponsorships (event_id, price_cents) values ($1, $2)";\n'],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 200) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), correr()); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [f, contenido] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, contenido);
  try { informe(path.basename(f), correr()); } finally { fs.unlinkSync(ruta); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
