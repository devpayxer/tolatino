// Prueba al revés de los guardianes de 7b (Soporte): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0117_soporte.sql', L = 'apps/web/lib/soporte.ts', E = 'apps/web/lib/soporte-equipo.ts', T = 'apps/web/lib/compa/tapar.ts',
  A = 'apps/web/app/(app)/soporte/acciones.ts', UI = 'apps/web/app/(app)/soporte/Soporte.tsx', C = 'apps/web/lib/colas.ts', F = 'apps/web/app/api/ayuda/foto/[id]/route.ts',
  CI = 'apps/web/lib/ayuda-cita.ts', AD = 'apps/web/app/admin/SoporteAdmin.tsx', SEM = 'infra/pruebas/semilla/0040_soporte.sql', PN = 'apps/web/lib/panel.ts';
const casos = [
  // soporteCasoConSla
  ['soporteCasoConSla', M, '  sla_due_at            timestamptz not null,', '  sla_due_at            timestamptz,'],
  ['soporteCasoConSla', M, 'create trigger support_cases_cola after insert or update on support_cases', 'create trigger support_cases_cola after update on support_cases'],
  ['soporteCasoConSla', M, "values ('ticket', 'support_case', new.id::text,", "values ('sop', 'support_case', new.id::text,"],
  ['soporteCasoConSla', M, "    new.sla_due_at := soporte_sla(new.city_id, now(), cfg_int('soporte_sla_h'));\n  end if;\n  new.updated_at", "    new.sla_due_at := now() + interval '8 hours';\n  end if;\n  new.updated_at"],
  ['soporteCasoConSla', M, "declare tz text; d0 int := cfg_int('soporte_desde_h');", "declare tz text; d0 int := 9;"],
  ['soporteCasoConSla', C, 'slaSql: "(select greatest(extract(epoch from sc.sla_due_at - q.opened_at)', 'slaSqlX: "(select greatest(extract(epoch from sc.sla_due_at - q.opened_at)'],
  ['soporteCasoConSla', E, 'export async function tomar(', "export async function colaAMano(id: string) { return db().query(`insert into queue_items (queue, subject_kind, subject_id) values ('ticket', 'support_case', $1)`, [id]); }\nexport async function tomar("],
  ['soporteCasoConSla', PN, 'export async function misNegocios(userId: string) {', "export async function casoAMano() { return db().query(`insert into support_cases (number) values ('TK-1')`); }\nexport async function misNegocios(userId: string) {"],
  // notaInternaNoSale
  ['notaInternaNoSale', L, ' where m.case_id = $1 and not m.internal order by m.at, m.id`;', ' where m.case_id = $1 order by m.at, m.id`;'],
  ['notaInternaNoSale', L, 'db().query<MsjVecino>(HILO_VECINO_SQL, [c.id, q.userId])', 'db().query<MsjVecino>(`select * from support_messages m where m.case_id = $1 and $2::uuid is not null`, [c.id, q.userId])'],
  ['notaInternaNoSale', L, "left join lateral (select m.* from support_messages m where m.case_id = c.id and not m.internal and m.sender <> 'system'", "left join lateral (select m.* from support_messages m where m.case_id = c.id and m.sender <> 'system'"],
  ['notaInternaNoSale', UI, 'import { subirFotoPrivada } from "@/lib/subir-foto";', 'import { subirFotoPrivada } from "@/lib/subir-foto";\nimport type { CasoEquipo } from "@/lib/soporte-equipo";'],
  ['notaInternaNoSale', UI, 'const yo = m.sender === "user" && m.mio;', 'const yo = m.sender === "user" && m.mio && !(m as { internal?: boolean }).internal;'],
  // soporteDevolverConTope
  ['soporteDevolverConTope', M, "when exists (select 1 from role_permissions where role = rol and section = 'sop' and action = 'editar' and allowed) then cfg_int('soporte_devolver_max_cents')", "when exists (select 1 from role_permissions where role = rol and section = 'sop' and action = 'editar' and allowed) then null"],
  ['soporteDevolverConTope', M, "    if ya + new.amount_cents > tope then raise exception 'devolucion_sobre_tope", "    if new.amount_cents > tope then raise exception 'devolucion_sobre_tope"],
  ['soporteDevolverConTope', M, "  select * into c from support_cases where id = new.case_id for update;   -- una decisión a la vez por caso", "  select * into c from support_cases where id = new.case_id;"],
  ['soporteDevolverConTope', M, "  select role into rol from staff_members where user_id = new.staff_id and status = 'active';", "  rol := new.staff_role;"],
  ['soporteDevolverConTope', M, 'p.operation_id <> c.operation_id or p.user_id <> c.user_id', 'p.operation_id <> c.operation_id'],
  ['soporteDevolverConTope', E, "  const idem = `tk-${clave}`;", "  const idem = `tk-${clave}-${Date.now()}`;"],
  ['soporteDevolverConTope', E, 'const d = await devolverPago({ paymentId: fila.pid, centavos: fila.amount,', 'const d = await devolverPago({ paymentId: fila.pid, centavos: cents,'],
  ['soporteDevolverConTope', E, 'const puedeDevolverRol = (s: Staff) =>', 'const TOPE_SOP = 5000; void TOPE_SOP;\nconst puedeDevolverRol = (s: Staff) =>'],
  // compaTapaSecretos
  ['compaTapaSecretos', T, 't = t.replace(/(?:\\d[ -]?){12,18}\\d/g, (m) => (luhn(m.replace(/\\D/g, "")) ? TAPADO : m));', ''],
  ['compaTapaSecretos', T, '  [/(^|[^\\d])(\\d{3}[- ]\\d{2}[- ]\\d{4})(?!\\d)/g, (_m, a: string) => `${a}${TAPADO}`],', ''],
  ['compaTapaSecretos', T, '[/\\b(contrase[ñn]a|password|passcode|clave)(\\s*(?:es|is|:|=)\\s*|\\s+)(\\S{3,})/gi', '[/\\b(contrase[ñn]a|passcode|clave)(\\s*(?:es|is|:|=)\\s*|\\s+)(\\S{3,})/gi'],
  ['compaTapaSecretos', 'packages/db/migrations/0122_compa_copiloto.sql', "  if texto_con_secretos(new.body) then raise exception 'support_sin_secretos", "  if false then raise exception 'support_sin_secretos"],
  ['compaTapaSecretos', L, "values ($1, $2, 'user', $3, $4, $5::uuid)`, [k.id, k.city_id, q.userId, t.texto || null, f]);", "values ($1, $2, 'user', $3, $4, $5::uuid)`, [k.id, k.city_id, q.userId, crudo || null, f]);"],
  ['compaTapaSecretos', E, "await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body, internal) values ($1, $2, 'staff', $3, $4, true)`, [k.id, k.city_id, s.id, tapar(t).texto]);", "await c.query(`insert into support_messages (case_id, city_id, sender, staff_id, body, internal) values ($1, $2, 'staff', $3, $4, true)`, [k.id, k.city_id, s.id, texto]);"],
  // soporteSoloSuyos
  ['soporteSoloSuyos', A, '  return escribirCaso({ userId: u.id, negocio: neg(negocio) },', '  return escribirCaso({ userId: String(negocio ?? u.id), negocio: neg(negocio) },'],
  ['soporteSoloSuyos', A, 'export async function casoResuelto(numero: string, negocio?: string | null): Promise<ResS> {\n  if (!(await mismoOrigen())) return SIN;', 'export async function casoResuelto(numero: string, negocio?: string | null): Promise<ResS> {'],
  ['soporteSoloSuyos', L, "and bm.status = 'active' and (bm.kind = 'owner' or 'all' = any(bm.panel_access))))))`;", "and bm.status = 'active'))))`;"],
  ['soporteSoloSuyos', L, "`select c.id::text, c.status, c.city_id, c.number from support_cases c where c.number = $1 and ${VISIBLE(\"$2\", \"$3\")} for update of c`", "`select c.id::text, c.status, c.city_id, c.number from support_cases c where c.number = $1 and $2::uuid is not null and $3::text is null for update of c`"],
  ['soporteSoloSuyos', L, "update media set owner_kind = 'support', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind = 'user' and status = 'visible' and private`, [k.id, foto, q.userId]", "update media set owner_kind = 'support', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind = 'user' and status = 'visible'`, [k.id, foto, q.userId]"],
  ['soporteSoloSuyos', F, 'if (s && s.puede("sop", "ver") && (!s.cities.length', 'if (s && (!s.cities.length'],
  // macroSinHtml
  ['macroSinHtml', M, "  check (((title->>'es') || (title->>'en') || (body->>'es') || (body->>'en')) !~ '<[A-Za-z!/?]'),\n", ''],
  ['macroSinHtml', E, '  if ([t.es, t.en, b.es, b.en].some((v) => SIN_HTML.test(v))) return no("Las macros son texto: sin etiquetas ni código.");\n', ''],
  ['macroSinHtml', E, '  if (!s.puede("sop", "aprobar")) return no("Solo quien aprueba en Soporte cambia las macros.");\n  const t = { es:', '  if (!s.puede("sop", "ver")) return no("Solo quien aprueba en Soporte cambia las macros.");\n  const t = { es:'],
  ['macroSinHtml', AD, '<Toast t={toast} desk={desk} />\n      </div>\n    );\n  }\n  if (conf)', '<Toast t={toast} desk={desk} /><div dangerouslySetInnerHTML={{ __html: edit.textoEs }} />\n      </div>\n    );\n  }\n  if (conf)'],
  // prefijoSoporte
  ['prefijoSoporte', CI, 'export const hrefAyuda = (numero: string) => (numero.startsWith("M-")', 'export const hrefAyuda = (numero: string) => (numero.startsWith("TK-") ? "/soporte" : numero.startsWith("M-")'],
  ['prefijoSoporte', SEM, "values ('TK-' || nextval('support_case_seq'), u.id,", "values ('TK-' || nextval('help_request_number_seq'), u.id,"],
  ['prefijoSoporte', E, 'export async function tomar(', 'export const numeroTk = (n: number) => `TK-${n}`;\nexport async function tomar('],
  // soporteSoloInsercion
  ['soporteSoloInsercion', M, 'create trigger support_messages_antes before insert or update or delete on support_messages', 'create trigger support_messages_antes before insert on support_messages'],
  ['soporteSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'un caso de soporte no se borra (estados)'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['soporteSoloInsercion', M, 'create trigger support_macros_no_borra before delete on support_macros', '-- sin trigger'],
  ['soporteSoloInsercion', E, 'export async function tomar(', 'export async function borrarNota(id: string) { return db().query(`delete from support_messages where id = $1`, [id]); }\nexport async function tomar('],
  ['soporteSoloInsercion', E, 'export async function tomar(', 'export async function editarNota(id: string, t: string) { return db().query(`update support_messages set body = $2 where id = $1`, [id, t]); }\nexport async function tomar('],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${casos.length} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
