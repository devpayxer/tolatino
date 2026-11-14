import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ENTORNO } from "@/lib/entorno";

/* POST /api/interno/avisos — 9l · SOLO PARA LAS PRUEBAS de avisos y canales (avi9l). Nunca existe en producción (404 siempre), pide el token del barrido
   (BARRIDO_TOKEN, mínimo 32) y nginx no deja entrar a /api/interno desde fuera. op:
   - probar          { tpl, tel, en?, vars }  → lib/avisos.ts avisarTelefono(): la plantilla a un teléfono (con cuenta: su aviso; sin cuenta: el SMS cifrado), en ES o EN,
                                                por el único camino de los SMS (el simulador del sandbox).
   - recibo_boletos  { op }                   → el correo del recibo de esa orden de boletos tal como saldría (con los botones de Wallet si aplican), sin encolarlo. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenOk(dado: string | null): boolean {
  const t = process.env.BARRIDO_TOKEN ?? "";
  if (t.length < 32 || !dado) return false;
  const a = Buffer.from(t), b = Buffer.from(dado);
  return a.length === b.length && timingSafeEqual(a, b);
}
const NO = () => NextResponse.json({ ok: false }, { status: 404 });

export async function POST(req: Request) {
  if (ENTORNO === "produccion" || !tokenOk(req.headers.get("x-barrido-token"))) return NO();
  let b: Record<string, unknown> = {};
  try { b = (await req.json()) as Record<string, unknown>; } catch { return NO(); }
  const op = String(b.op ?? "");
  if (op === "probar") {
    const tel = String(b.tel ?? ""), tpl = String(b.tpl ?? "");
    if (!/^\+1570555\d{4}$/.test(tel) || !/^[a-z]+_[a-z0-9_]+$/.test(tpl)) return NO();
    const vars = Object.fromEntries(Object.entries((b.vars ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v).slice(0, 200)]));
    await (await import("@/lib/avisos")).avisarTelefono(tel, tpl, vars, { en: b.en === true, city: "hzl", ref: ["prueba", "avi9l"] });
    return NextResponse.json({ ok: true });
  }
  if (op === "recibo_boletos") {
    const r = await (await import("@/lib/correo/recibos")).armarReciboBoletos(String(b.op_id ?? ""));
    return NextResponse.json({ ok: !!r, html: r?.html ?? null, text: r?.text ?? null });
  }
  return NO();
}
