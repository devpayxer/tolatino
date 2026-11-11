import { NextResponse } from "next/server";
import { autenticar, registrarBuild } from "@/lib/tiendas/tuberia";
import { leerCuerpo, NO_CACHE } from "../cuerpo";

/* 8h · El CI registra y avanza SUS builds (compilando → subido, o fallo con motivo) con un token OIDC nuevo en cada pedido. El commit y el run
   salen del token, nunca del cuerpo; «procesando» y «disponible» los decide el servidor. La base pone lo demás (build creciente, estado que solo
   avanza, producción solo en la Fase 9). */
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const a = await autenticar(req, "build");
  if (!a.ok) return NextResponse.json({ ok: false, motivo: a.motivo }, { status: a.status, headers: NO_CACHE });
  const t = await leerCuerpo(req, 4096);
  let b: unknown = null;
  try { b = t ? JSON.parse(t.toString("utf8")) : null; } catch { b = null; }
  const r = await registrarBuild(a.c, b);
  return NextResponse.json(r.json, { status: r.status, headers: NO_CACHE });
}
