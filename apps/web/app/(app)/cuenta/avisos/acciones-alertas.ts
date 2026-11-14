"use server";
/* 9m · Mi cuenta › Avisos › Tus alertas (L336): quitar una alerta («Avísame cuando haya» o «Avísame de nuevas vacantes»). Queda quitada (removed_at). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { quitarAlerta } from "@/lib/alertas";

export async function alertaQuitar(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  return { ok: await quitarAlerta(u.id, String(id ?? "")) };
}
