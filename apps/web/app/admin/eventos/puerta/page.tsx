import { requerir } from "@/lib/admin";
import { puertaAdmin, puertasAdmin } from "@/lib/puerta-admin";
import { PuertaAdmin } from "../../PuertaAdmin";

/* 6g · Super Admin › Eventos y boletos › Modo puerta (solo lectura): ?fecha= abre una puerta. Permiso evt:ver; las ciudades del equipo. */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("evt", "ver");
  const sp = await searchParams, f = typeof sp.fecha === "string" && /^\d{1,18}$/.test(sp.fecha) ? sp.fecha : null;
  const [L, d] = await Promise.all([puertasAdmin(s), f ? puertaAdmin(s, f) : Promise.resolve(null)]);
  return <PuertaAdmin lista={L} d={d} />;
}
