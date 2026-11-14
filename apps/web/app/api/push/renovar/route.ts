import { NextResponse } from "next/server";
import { mismoOrigen, sesionActual, yo } from "@/lib/cuenta";
import { renovarWeb } from "@/lib/push/tokens";

/* 9l · POST /api/push/renovar — el service worker de los avisos (/sw-push.js, `pushsubscriptionchange`, L1203): el navegador cambió la suscripción de Web
   Push por su cuenta. Las acciones del servidor no se llaman desde un service worker: por eso esta ruta. Mismo origen y la SESIÓN de la cookie (nunca un id
   que mande el navegador); lib/push/tokens.ts revisa la dirección (solo servicios de push conocidos) y las llaves. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await mismoOrigen())) return NextResponse.json({ ok: false }, { status: 403 });
  const [u, ses] = await Promise.all([yo(), sesionActual()]);
  if (!u || !ses) return NextResponse.json({ ok: false }, { status: 401 });
  const crudo = await req.text();
  if (crudo.length > 8192) return NextResponse.json({ ok: false }, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(crudo) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const s = (k: string, n: number) => (typeof b[k] === "string" && (b[k] as string).length <= n ? (b[k] as string) : "");
  const r = await renovarWeb(u.id, ses, s("viejo", 4096) || null, { endpoint: s("endpoint", 4096), p256dh: s("p256dh", 200), auth: s("auth", 60) });
  return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 400 });
}
