"use server";
/* 9m · Mi cuenta › Avisos › Tus alertas (L336): quitar una alerta («Avísame cuando haya» o «Avísame de nuevas vacantes»). Queda quitada (removed_at). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { quitarAlerta } from "@/lib/alertas";
import { soltarEspera } from "@/lib/mesa-espera";

export async function alertaQuitar(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  return { ok: await quitarAlerta(u.id, String(id ?? "")) };
}

/* 9t · Quitar una mesa que esperas («Avísame si se libera»): queda «left»; si ya se te guardó la mesa, se suelta para otra persona. Solo la propia. */
export async function mesaQuitar(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  return { ok: await soltarEspera(u.id, String(id ?? "")) };
}
