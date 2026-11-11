// Prueba al revés de los guardianes de 6a: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M6 = 'packages/db/migrations/0106_eventos_base.sql', EV = 'apps/web/lib/evt.ts', ER = 'apps/web/lib/evt-revision.ts', EC = 'apps/web/lib/evt-comun.ts', ED = 'apps/web/app/panel/EventosPanel.tsx',
  CE = 'apps/web/app/admin/ColasEventos.tsx', CO = 'apps/web/lib/colas.ts', AC = 'apps/web/lib/admin-colas.ts', AA = 'apps/web/app/admin/acciones-colas.ts', AP = 'apps/web/lib/apelaciones.ts',
  MC = 'apps/web/lib/moderacion-comun.ts', CF = 'apps/web/lib/config.ts', PA = 'apps/web/app/panel/acciones-eventos.ts';
const casos = [
  // revisionAntesDePublicar (nuevo)
  // 6b: evt_listable vive ahora en 0107 (la última definición manda): el defecto se inyecta ahí.
  ['revisionAntesDePublicar', 'packages/db/migrations/0107_eventos_publico.sql', "e.status in ('live', 'paused') and e.approved_at is not null and e.hidden_at is null", "e.status in ('live', 'paused') and e.hidden_at is null"],
  ['revisionAntesDePublicar', M6, "  check (status not in ('live', 'paused', 'done') or approved_at is not null),\n", ''],
  ['revisionAntesDePublicar', M6, "    if new.approved_by is null and o.verified_at is null then raise exception 'sin revisión solo publica un organizador verificado'; end if;\n", ''],
  ['revisionAntesDePublicar', M6, "    raise exception 'el organizador está bloqueado: no puede publicar eventos';\n  end if;\n  if new.pending_status", "    null;\n  end if;\n  if new.pending_status"],
  ['revisionAntesDePublicar', EV, '  if (verificado) {\n    await c.query(`update events set status = \'live\', submitted_at = now(), approved_at = now(), approved_by = null', '  {\n    await c.query(`update events set status = \'live\', submitted_at = now(), approved_at = now(), approved_by = null'],
  ['revisionAntesDePublicar', PA, 'export async function evtEnviar(', 'export async function evtPublicarYa(negocio: string, id: string) { const a = await entrar(negocio); if (!a) return SIN_ACCESO; await db().query(`update events set status = \'live\' where id = $1`, [id]); return { ok: true } as Res; }\nexport async function evtEnviar('],
  ['revisionAntesDePublicar', ER, 'await auditar(c as PoolClient, { actor: s.id, action: ocultar', 'await c.query(`update event_dates set listable = true where event_id = $1::bigint`, [id]);\n    await auditar(c as PoolClient, { actor: s.id, action: ocultar'],
  ['revisionAntesDePublicar', ER, "status = 'live', approved_at = now(), approved_by = $2", "status = 'live', approved_at = now(), approved_by = null"],
  // alcoholNoSeVende (ampliado a los extras de eventos)
  ['alcoholNoSeVende', EC, 'export const EXTRA_KINDS: ExtraKind[] = ["detalle", "material", "servicio", "otro"];', 'export const EXTRA_KINDS: ExtraKind[] = ["detalle", "material", "servicio", "otro", "bebida" as ExtraKind];'],
  ['alcoholNoSeVende', EC, 'botell|bottle|hookah|', 'bottle|'],
  ['alcoholNoSeVende', EV, '  if (extras.some(esAlcohol)) return no(', '  if (false && extras.some(esAlcohol)) return no('],
  ['alcoholNoSeVende', M6, "addons_cfg         jsonb not null default '[]' check (evt_extras_ok(addons_cfg)),", "addons_cfg         jsonb not null default '[]',"],
  ['alcoholNoSeVende', ED, 'ph: F.f.mesas ? E2("Ej. Detalle de cumpleaños", "e.g. Birthday setup")', 'ph: F.f.mesas ? E2("Ej. Botella premium", "e.g. Premium bottle")'],
  // colaConVista (ampliado: ColasEventos y el plazo de Configuración)
  ['colaConVista', CE, 'if (k.queue === "evt" && "evt" in k) return', 'if (k.queue === ("ev" + "t") && "evt" in k) return'],
  ['colaConVista', AC, 'export const SLA_SQL = slaCase(cfgSql);', 'export const SLA_SQL = `case q.queue ${Object.entries(COLAS).map(([k, v]) => `when \'${k}\' then ${v.sla}`).join(" ")} else 24 end`;'],
  ['colaConVista', AA, 'const sla = (await import("@/lib/admin-colas")).SLA_SQL;', 'const { COLAS } = await import("@/lib/colas");\n  const sla = `case q.queue ${Object.entries(COLAS).map(([k, v]) => `when \'${k}\' then ${v.sla}`).join(" ")} else 24 end`;'],
  ['colaConVista', AC, 'const e = espera(x.opened_at, x.sla_h);', 'const e = espera(x.opened_at, COLAS[x.queue].sla);'],
  ['colaConVista', CO, 'slaCfg: "evt_revision_h", roles', 'slaCfg: "evt_revision_horas" as "evt_revision_h", roles'],
  // ocultarAvisaYApela (ampliado a eventos y organizadores)
  ['ocultarAvisaYApela', ER, '  if (ocultar) await avisarEvtOculto(r.neg, id, r.t!, m);\n', ''],
  ['ocultarAvisaYApela', ER, '  if (paso === "bloquear") await avisarOrgBloqueado(negocio, r.nombre, m);\n', ''],
  ['ocultarAvisaYApela', ER, '{ href: RUTA_AVISO("event", id), ref: ["event", id] }).catch(() => undefined);\n}\nexport async function avisarOrgBloqueado', '{ href: `/panel/${negocio}/eventos`, ref: ["event", id] }).catch(() => undefined);\n}\nexport async function avisarOrgBloqueado'],
  ['ocultarAvisaYApela', MC, '| "sanction" | "event" | "evt_org";', '| "sanction" | "event";'],
  ['ocultarAvisaYApela', AP, '    } else if (a.k === "evt_org") {', '    } else if (a.k === ("evt" + "_org")) {'],
  ['ocultarAvisaYApela', M6, "  elsif new.target_kind = 'evt_org' then", "  elsif new.target_kind = 'otro_org' then"],
  // configDesdeUnLugar (lee el catálogo de 0106)
  ['configDesdeUnLugar', CF, '| "evt_fotos_max" ', ''],
  ['configConLimites', M6, "('evt_revision_h', 1, 168, 24,", "('evt_revision_h', 1, 168, 240,"],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
