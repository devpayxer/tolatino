import { staff } from "@/lib/admin";
import SAL from "../../../../../../mobile/tiendas/privacidad/salidas.json";

/* 8i · El CSV de Data safety de una app (el que generó apps/mobile/scripts/privacidad.mjs desde el inventario real), para importarlo en Play
   Console (Paquete 8-3). Lo baja el equipo con apps:ver; no tiene nada personal (son las respuestas de la declaración). */
export const dynamic = "force-dynamic";
const CSV = (SAL as unknown as { csv: Record<string, string> }).csv;
export async function GET(req: Request) {
  const s = await staff();
  if (!s || !s.puede("apps", "ver")) return new Response("Solo el equipo.", { status: 403, headers: { "cache-control": "no-store" } });
  const app = new URL(req.url).searchParams.get("app") ?? "";
  const c = Object.hasOwn(CSV, app) ? CSV[app] : null;
  if (!c) return new Response("Esa app no existe.", { status: 404, headers: { "cache-control": "no-store" } });
  return new Response(c, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="data-safety-${app}.csv"`, "cache-control": "no-store" } });
}
