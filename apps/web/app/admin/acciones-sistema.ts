"use server";
/* 9j · Acciones de Sistema › Flags y Salud (mantenimiento). Cada una: permiso en el servidor (requerir: del equipo, con el segundo factor de la
   sesión y sys:editar) → el cambio con motivo y auditoría en lib/sistema/. Las server actions de Next ya rechazan peticiones de otro origen. */
import { revalidatePath } from "next/cache";
import { requerir } from "@/lib/admin";
import { cambiarFlag, type Alcance } from "@/lib/sistema/flags";
import { cancelarMantenimiento, programarMantenimiento } from "@/lib/sistema/salud";
import { abrirVidrio } from "@/lib/sistema/vidrio";
import { cerrarIncidente } from "@/lib/sistema/despliegues";

type Res = { ok: true; msg: { es: string; en: string } } | { ok: false; msg: { es: string; en: string } };

export async function flagGuardar(key: string, enabled: boolean, scope: Alcance, cities: string[], percent: number, motivo: string): Promise<Res> {
  const s = await requerir("sys", "editar");
  const r = await cambiarFlag(s, String(key ?? "").slice(0, 80), { enabled: !!enabled, scope, cities, percent: Number(percent) }, motivo);
  if (r.ok) revalidatePath("/admin/sistema/flags");
  return r;
}

export async function mantenimientoProgramar(desde: string, hasta: string, es: string, en: string, motivo: string): Promise<Res> {
  const s = await requerir("sys", "editar");
  const r = await programarMantenimiento(s, { desde, hasta, es, en }, motivo);
  if (r.ok) revalidatePath("/admin/sistema/salud");
  return r;
}

export async function mantenimientoCancelar(id: string, motivo: string): Promise<Res> {
  const s = await requerir("sys", "editar");
  const r = await cancelarMantenimiento(s, String(id ?? ""), motivo);
  if (r.ok) revalidatePath("/admin/sistema/salud");
  return r;
}

/* 9j · «Vidrio roto»: ver las fotos de una ayuda de Salud con un motivo escrito (lib/sistema/vidrio.ts; 10 minutos; auditoría). */
export async function verFotosSalud(ayuda: string, motivo: string): Promise<{ ok: true; mensaje?: string } | { ok: false; mensaje: string }> {
  const s = await requerir("colas", "ver");
  const r = await abrirVidrio(s, { ayuda: String(ayuda ?? "") }, motivo);
  return r.ok ? { ok: true, mensaje: r.msg.es } : { ok: false, mensaje: r.msg.es };
}

/* 9o · Sistema › Despliegues: cerrar un incidente con lo que se hizo (una vez; incident_log solo anota el cierre; auditoría). */
export async function incidenteCerrar(id: string, hecho: string): Promise<Res> {
  const s = await requerir("sys", "editar");
  const r = await cerrarIncidente(s, String(id ?? ""), hecho);
  if (r.ok) revalidatePath("/admin/sistema/despliegues");
  return r;
}
