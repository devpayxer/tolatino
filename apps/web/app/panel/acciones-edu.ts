"use server";
/* «Grupos y cupos» desde el panel (4ea · fase4-edu-ninos-deporte.md §4ea y §5): cada toque se guarda. Mismo sitio, miembro activo
   con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/edu.ts, una línea en la auditoría y la tarjeta y los
   filtros de Buscar recalculados en la misma transacción. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { abrirGrupo, guardarEdu, quitarGrupo, recalcularFiltrosEdu, type EduIn, type GrupoIn } from "@/lib/edu";
import { recalcularFiltrosNinos } from "@/lib/ninos";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(negocio: unknown) { if (!(await mismoOrigen())) return null; return typeof negocio === "string" ? accesoPanel(negocio, "cat") : null; }
const auditar = (c: import("pg").PoolClient, a: NonNullable<Awaited<ReturnType<typeof accesoPanel>>>, accion: string, after: unknown) =>
  c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb)`,
    [a.yo.id, accion, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? {})]);

export async function eduGuardar(negocio: string, p: EduIn): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarEdu(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await auditar(c, a, "edu.herramienta", p ?? {});
    await recalcularFiltrosEdu(c, a.negocio.id); await recalcularFiltrosNinos(c, a.negocio.id);
    return { ok: true };
  });
}
export async function eduAbrirGrupo(negocio: string, p: GrupoIn): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await abrirGrupo(c, a.negocio.id, p);
    if (!r.ok) return no(r.es, r.en);
    await auditar(c, a, "edu.grupo.abrir", { grupo: r.id, curso: p.item, empieza: p.inicio, cupos: p.libres, enLinea: !!p.url });
    await recalcularFiltrosEdu(c, a.negocio.id); await recalcularFiltrosNinos(c, a.negocio.id);
    return { ok: true };
  });
}
export async function eduQuitarGrupo(negocio: string, grupo: string): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await quitarGrupo(c, a.negocio.id, String(grupo ?? ""));
    if (!r.ok) return no(r.es, r.en);
    await auditar(c, a, "edu.grupo.quitar", { grupo });
    await recalcularFiltrosEdu(c, a.negocio.id); await recalcularFiltrosNinos(c, a.negocio.id);
    return { ok: true };
  });
}
