"use server";
/* Buscar › Vecinos · la página siguiente. Solo con cuenta (guardián buscarVecinosConSesion): sin sesión no se lee nada. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { entender, tsq } from "@/lib/buscar";
import { buscarVecinos } from "@/lib/comunidad-portada";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import { avisameVacantes } from "@/lib/alertas";
import { filaVecino, type FilaVecino } from "./vecinos";

// solo lectura
export async function vecinosMas(q: string, cursor: string): Promise<{ items: FilaVecino[]; mas: string | null }> {
  const u = await yo();
  if (!u) return { items: [], mas: null };
  const [loc, lang, E] = await Promise.all([ubicacion(u), idioma(), entender(String(q ?? "").slice(0, 120))]);
  if (!E.grupos.length) return { items: [], mas: null };
  const r = await buscarVecinos(u.id, loc.ciudad, tsq(E.grupos, true), String(cursor ?? "").slice(0, 80) || null, 10);
  return { items: r.items.map((x) => filaVecino(x, E, lang === "es")), mas: r.mas };
}

/* 9m · «Avísame de nuevas vacantes» (L318) en la ciudad que la persona está viendo. */
export async function vacantesAvisame(): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  const loc = await ubicacion(u);
  return { ok: await avisameVacantes(u.id, loc.ciudad) };
}

/* 9m · Buscar con la voz (L95): la respuesta al aviso (y el interruptor de Mi cuenta › Ajustes › Privacidad). */
export async function vozGuardar(on: boolean): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  await (await import("@/lib/db")).db().query(`update users set voice_search = $2 where id = $1`, [u.id, !!on]);
  return { ok: true };
}
