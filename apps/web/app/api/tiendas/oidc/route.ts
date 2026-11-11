import { NextResponse } from "next/server";
import { autenticar, llavesDelJob } from "@/lib/tiendas/tuberia";
import { leerCuerpo, NO_CACHE } from "../cuerpo";

/* 8h · Las llaves del job de las tiendas (fase8-apps.md §3.5): el job se identifica con su token OIDC de GitHub (autenticar(): HTTPS, firma de
   GitHub, repo, rama, entorno, evento, flujo, tiempos y jti de un uso) y recibe SOLO las llaves de su job (iOS: App Store Connect y, si existe,
   el certificado de distribución; Android: la llave de subida), cada lectura anotada. Nunca en caché. */
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const a = await autenticar(req, "llaves");
  if (!a.ok) return NextResponse.json({ ok: false, motivo: a.motivo }, { status: a.status, headers: NO_CACHE });
  const t = await leerCuerpo(req, 4096);
  let b: unknown = null;
  try { b = t ? JSON.parse(t.toString("utf8")) : null; } catch { b = null; }
  const r = await llavesDelJob(a.c, b);
  return NextResponse.json(r.json, { status: r.status, headers: NO_CACHE });
}
