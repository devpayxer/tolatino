import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { enviarPendientes } from "@/lib/push/cola";

/* POST /api/interno/push — lo llama cada pocos segundos el servicio «push» del docker-compose (red interna), además del empujón que da cada
   aviso al encolarse y del barrido de cada minuto (reintentos, vencidos, tokens viejos). Mismo token del entorno que el barrido (BARRIDO_TOKEN);
   nginx no deja entrar a /api/interno desde fuera. Sin token configurado no corre. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenOk(dado: string | null): boolean {
  const t = process.env.BARRIDO_TOKEN ?? "";
  if (t.length < 32 || !dado) return false;
  const a = Buffer.from(t), b = Buffer.from(dado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenOk(req.headers.get("x-barrido-token"))) return NextResponse.json({ ok: false }, { status: 404 });
  const r = await enviarPendientes().catch((e) => ({ error: String((e as Error)?.message ?? e).slice(0, 200) }));
  return NextResponse.json({ ok: !("error" in r), ...r });
}
