// Prueba al revés de los guardianes de 7d (El Compa para vecinos): se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const V = 'apps/web/app/(app)/soporte/compa/CompaVecino.tsx', H = 'apps/web/app/(app)/soporte/compa/hoja-ayuda.tsx', L = 'apps/web/lib/compa/hoja.ts',
  AD = 'apps/web/lib/compa/admin-compa.ts', M = 'packages/db/migrations/0119_compa_vecinos.sql', C = 'apps/web/lib/compa/conversacion.ts', A = 'apps/web/lib/compa/acciones.ts',
  CITA = 'apps/web/app/(app)/cita/[num]/ayuda/page.tsx', PED = 'apps/web/app/(app)/pedido/[num]/ayuda/page.tsx', BOL = 'apps/web/app/(app)/eventos/orden/[num]/ayuda/page.tsx',
  CU = 'apps/web/app/(app)/cuenta/page.tsx', SOP = 'apps/web/app/(app)/soporte/page.tsx', EV = 'apps/web/lib/eventos.ts', PEDP = 'apps/web/app/(app)/pedido/[num]/Pedido.tsx',
  ADM = 'apps/web/app/admin/ElCompaAdmin.tsx', AC = 'apps/web/app/(app)/soporte/compa/acciones-compa.ts';
const casos = [
  // compaSiempreIA
  ['compaSiempreIA', V, '"EL COMPA ES UNA IA Y PUEDE EQUIVOCARSE. LO QUE MUEVE DINERO O CAMBIA TU CUENTA LO REVISA UNA PERSONA."', '"El Compa te ayuda."'],
  ['compaSiempreIA', V, '"EL COMPA IS AN AI AND CAN MAKE MISTAKES. ANYTHING THAT MOVES MONEY OR CHANGES YOUR ACCOUNT IS REVIEWED BY A PERSON."', '"El Compa helps you."'],
  ['compaSiempreIA', V, 'href="/ayuda/privacidad-de-el-compa"', 'href="/ayuda"'],
  ['compaSiempreIA', V, 'disclaimer={disc}', 'disclaimer={sheet ? disc : null}'],
  ['compaSiempreIA', V, 'personLabel={E2("Con una persona", "Talk to a person")}', 'personLabel={busy ? null : E2("Con una persona", "Talk to a person")}'],
  ['compaSiempreIA', V, 'person2Label={E2("Hablar con una persona", "Talk to a person")}', 'person2Label={null}'],
  ['compaSiempreIA', V, 'note: E2("EL COMPA LO PREPARÓ · CONFÍRMALO TÚ", "EL COMPA PREPARED IT · YOU CONFIRM")', 'note: E2("LISTO", "DONE")'],
  ['compaSiempreIA', ADM, 'const A = UI as unknown as Record<"AdminList" | "HBars", ComponentType<any>>;', 'const A = UI as unknown as Record<"AdminList" | "HBars", ComponentType<any>>;\nconst Otro = (UI as unknown as Record<string, ComponentType<any>>).CompaFrame; void Otro;'], // 9b-3 · la línea de hoy
  ['compaSiempreIA', C, "Eres una IA y lo dices si te preguntan; ", ''],
  // compaHojaSinRomper
  ['compaHojaSinRomper', CITA, '  if (hoja) return hoja;\n', ''],
  ['compaHojaSinRomper', PED, '["order"]', '["order", "appointment"]'],
  ['compaHojaSinRomper', BOL, 'import Operacion from "../page";', 'import Operacion from "../../../../cuenta/page";'],
  ['compaHojaSinRomper', CITA, '  if (!c || !a) notFound();\n  // 7d', '  // 7d'],
  ['compaHojaSinRomper', H, '  if (de === "compa") return null;\n', ''],
  ['compaHojaSinRomper', H, '  } catch (e) {\n    console.error("[compa] hoja de ayuda: sigue el camino de siempre", e instanceof Error ? e.message : e);\n    return null;\n  }', '  } finally { void 0; }'],
  ['compaHojaSinRomper', L, '  return e.encendido && !e.alTope;', '  return e.encendido;'],
  ['compaHojaSinRomper', L, '  if (!op || op.ayuda || !kinds.includes(op.kind)) return null;', '  if (!op) return null;'],
  ['compaHojaSinRomper', L, "     and not (o.kind = 'enrollment' and b.category_id = 'NEG-NINOS')\n", ''],
  ['compaHojaSinRomper', L, "   where o.user_id = $1 and o.kind <> 'plan'", "   where (o.user_id = $1 or true) and o.kind <> 'plan'"],
  // compaLecturaAnotada
  ['compaLecturaAnotada', AD, '    await q.query(`insert into compa_reads (conversation_id, staff_id, city_id) values ($1::bigint, $2, $3)`, [x.id, s.id, x.city_id]);\n', ''],
  ['compaLecturaAnotada', AD, '  if (!s.puede("compa", "editar")) return null;\n', ''],
  ['compaLecturaAnotada', 'apps/web/lib/soporte.ts', 'export async function casosAbiertos(', 'export async function hiloCompa(id: string) { return (await db().query(`select text from compa_messages where conversation_id = $1`, [id])).rows; }\nexport async function casosAbiertos('],
  // compaSinRutaCritica (7d)
  ['compaSinRutaCritica', CU, 'estadoVecino(u.id).then((e) => e.encendido).catch(() => false),', 'estadoVecino(u.id).then((e) => e.encendido),'],
  ['compaSinRutaCritica', SOP, '.then((e) => e.encendido).catch(() => false),', '.then((e) => e.encendido),'],
  ['compaSinRutaCritica', PEDP, '"use client";', '"use client";\nimport { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";\nvoid hojaAyuda;'],
  ['compaSinRutaCritica', CU, 'import { estadoVecino } from "@/lib/compa/hoja";', 'import { estadoVecino } from "@/lib/compa/hoja";\nimport { paso } from "@/lib/compa/conversacion";\nvoid paso;'],
  // compaAccionConfirmada (acciones del vecino)
  ['compaAccionConfirmada', AC, '  const r = await confirmar({ userId: u.id }, String(id ?? ""), "app");', '  const r = await confirmar({ userId: String(id).split(":")[1] ?? u.id }, String(id ?? ""), "app");'],
  ['compaAccionConfirmada', AC, 'export async function compaConfirmar(id: string): Promise<ResAccion> {\n  if (!(await mismoOrigen())) return { ok: false, estado: "no", msg: SIN };', 'export async function compaConfirmar(id: string): Promise<ResAccion> {'],
  // compaSinDinero (CANCELABLES con «compa»)
  ['compaSinDinero', A, '  table: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),', '  table: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),\n  private_event: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),'],
  // libroSoloInsercion (compa_reads)
  ['libroSoloInsercion', M, "  if tg_op <> 'INSERT' then raise exception 'compa_reads es solo de inserción'; end if;", "  if tg_op = 'DELETE' then return old; end if;"],
  ['libroSoloInsercion', AD, 'export async function fichaConversacion(', 'export async function olvidarLecturas() { return db().query(`delete from compa_reads where at < now()`); }\nexport async function fichaConversacion('],
  // eventosEnLista (la analítica nueva en el código y en la base)
  // 9b-3 · La lista siguió creciendo (8a: app_abrir…): el evento de más va tras compa_persona y la lista que manda es la de 0125 (la última).
  ['eventosEnLista', EV, ' | "compa_persona"\n', ' | "compa_persona" | "compa_otro"\n'],
  ['eventosEnLista', 'packages/db/migrations/0125_apps_base.sql', "'compa_accion', 'compa_persona', 'app_abrir'", "'compa_accion', 'app_abrir'"],
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
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== casos.length) process.exit(1);
