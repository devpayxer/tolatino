"use server";
/* «Esta noche» desde el panel (4na · fase4-noche.md §4na y §5): cada toque se guarda. Mismo sitio, miembro activo con acceso a
   «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/noche.ts, su fila en night_posts (lo hace guardarNoche en la misma
   transacción), una línea en la auditoría y la tarjeta y los filtros de Buscar recalculados. La fila también se cambia desde Hoy
   (la puerta): con acceso a «Hoy y pedidos» (parte ord) basta. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { guardarNoche, herramientaNoche, recalcularFiltrosNoche } from "@/lib/noche";
import { avisarCoverSube, cancelarNocheNegocio, marcarNoche, responderMesa, type MarcaMesa, type PasoMesa } from "@/lib/noche-reservas";
import type { NocheIn } from "@/lib/noche-comun";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

async function guardar(a: NonNullable<Awaited<ReturnType<typeof accesoPanel>>>, p: NocheIn, accion: string): Promise<Res> {
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== "NEG-NOCHE") return no("Esto es para Vida Nocturna.", "This is for nightlife businesses.");
    const r = await guardarNoche(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb)`,
      [a.yo.id, accion, a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosNoche(c, a.negocio.id);
    return { ok: true };
  });
}
export async function nocheGuardar(negocio: string, p: NocheIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  // Si sube el cover de esta noche con listas o mesas vivas, les llega un SMS (lo que ya mandaron no cambia; 4nc).
  const antes = p?.cover !== undefined || p?.byDow !== undefined || p?.igual ? (await herramientaNoche(a.negocio.id))?.prox : null;
  const r = await guardar(a, p, "noche.herramienta");
  if (r.ok && antes && antes.cuando === "hoy") await avisarCoverSube(a.negocio.id, antes.cover).catch(() => undefined);
  return r;
}
/* Atajo de Hoy: solo la fila (basta «Hoy y pedidos» o «Lo que vendes»). */
export async function nocheFila(negocio: string, min: number): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? (await accesoPanel(negocio, "ord")) ?? (await accesoPanel(negocio, "cat")) : null;
  if (!a) return SIN_ACCESO;
  return guardar(a, { fila: Number(min) }, "noche.fila");
}

/* ── Mesas y lista (4nc): Confirmar · Otra hora · No hay mesa; la puerta (entraron, llegaron, no llegaron, sin identificación); el local
   cancela con motivo (devolución completa). Miembro activo con acceso a «Hoy y pedidos» (parte ord). El servidor decide todo. ── */
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function entrar(id: unknown) { if (!(await mismoOrigen())) return null; return typeof id === "string" ? accesoPanel(id, "ord") : null; }
export async function nocheResponder(id: string, numero: string, paso: PasoMesa, alt?: number): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["confirmar", "otra", "nohay"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await responderMesa(a.negocio.id, String(numero ?? ""), paso, a.yo.id, alt == null ? undefined : Number(alt)));
}
export async function nocheMarcar(id: string, numero: string, que: MarcaMesa | "entraron", n?: number): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["llegaron", "nollegaron", "noid", "entraron"].includes(que)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await marcarNoche(a.negocio.id, String(numero ?? ""), que, a.yo.id, n == null ? undefined : Number(n)));
}
export async function nocheCancelarNeg(id: string, numero: string, motivo: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await cancelarNocheNegocio(a.negocio.id, String(numero ?? ""), String(motivo ?? ""), a.yo.id));
}
