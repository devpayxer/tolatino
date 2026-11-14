import { NextResponse, type NextRequest } from "next/server";
import { firmaSns, recibirCorreo, urlCertificadoValida } from "@/lib/correo/entrante";

/* 9l · POST /api/correo/entrada — el correo que entra a Soporte por Amazon SES → SNS (guardián correoEntranteFirmado). Orden fijo: tamaño → la FIRMA de
   SNS y el tema propio (sin firma buena: 401 y nada se guarda) → la confirmación de la suscripción (una vez, al conectar SES; solo a SNS) → el aviso de
   SES (sus veredictos, la persona, el caso; lib/correo/entrante.ts). Idempotente por el id del mensaje de SNS y el de SES. Nada de lo que entra va al
   registro del servidor. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX = 400 * 1024;
const no = (s: number) => new NextResponse(null, { status: s });

export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX) return no(413);
  const crudo = await req.text();
  if (crudo.length > MAX) return no(413);
  let m: Record<string, string | undefined>;
  try { m = JSON.parse(crudo) as Record<string, string | undefined>; } catch { return no(400); }
  if (!m || typeof m !== "object") return no(400);
  // ── La firma de SNS y el tema propio, antes de leer el mensaje ──
  const f = await firmaSns(m);
  if (!f.ok) return no(401);
  if (m.Type === "SubscriptionConfirmation") {
    const u = String(m.SubscribeURL ?? "");
    const ok = (() => { try { const x = new URL(u); return urlCertificadoValida(`${x.origin}/x.pem`) && x.searchParams.get("Action") === "ConfirmSubscription"; } catch { return false; } })();
    if (!ok) return no(400);
    await fetch(u, { redirect: "error", signal: AbortSignal.timeout(5000) }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }
  if (m.Type !== "Notification") return NextResponse.json({ ok: true });
  let aviso: unknown;
  try { aviso = JSON.parse(String(m.Message ?? "")); } catch { return no(400); }
  const r = await recibirCorreo(String(m.MessageId ?? ""), aviso).catch(() => null);
  return NextResponse.json({ ok: true, estado: r?.estado ?? "error", numero: r?.numero ?? null });
}
