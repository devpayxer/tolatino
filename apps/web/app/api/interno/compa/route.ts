import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ENTORNO } from "@/lib/entorno";

/* POST /api/interno/compa — 7c · SOLO PARA LAS PRUEBAS del motor de El Compa mientras no existen sus pantallas (7d). Nunca existe en
   producción (404 siempre), pide el token del barrido (BARRIDO_TOKEN, mínimo 32) y nginx no deja entrar a /api/interno desde fuera.
   Además usa la SESIÓN de quien llama (cookie) y el mismo origen, como las acciones del servidor de verdad: la persona sale de yo(),
   nunca del cuerpo. op:
   - turno      { texto, conversacion?, lang? }   → lib/compa/conversacion.ts turno() (uso vecino, canal app)
   - confirmar  { accion }                        → lib/compa/acciones.ts confirmar() (otra petición, el id de un uso)
   - descartar  { accion }
   - simulador  {}                                → lo que recibió el simulador (para revisar que nada tapado ni ajeno sale)
   - olvidar    {}                                → vacía lo que guardó el simulador */
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
  if (op === "simulador" || op === "olvidar") {
    const s = await import("@/lib/compa/modelo-simulador");
    if (op === "olvidar") { s.olvidarRecibidos(); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ ok: true, recibidos: s.recibidos() });
  }
  if (!(await mismoOrigen())) return NextResponse.json({ ok: false, msg: "origen" }, { status: 403 });
  const u = await yo();
  if (!u) return NextResponse.json({ ok: false, msg: "sin_sesion" }, { status: 401 });
  if (op === "turno") {
    const { turno } = await import("@/lib/compa/conversacion");
    const r = await turno({ userId: u.id }, { texto: String(b.texto ?? ""), conversacion: b.conversacion ? String(b.conversacion) : null, uso: "neighbor", canal: "app",
      superficie: "support_page", lang: b.lang === "en" ? "en" : "es" });
    return NextResponse.json(r);
  }
  if (op === "confirmar" || op === "descartar") {
    const a = await import("@/lib/compa/acciones");
    return NextResponse.json(op === "confirmar" ? await a.confirmar({ userId: u.id }, String(b.accion ?? ""), "app") : await a.descartar({ userId: u.id }, String(b.accion ?? "")));
  }
  return NO();
}
