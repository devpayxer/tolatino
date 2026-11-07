import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { barridoCentral } from "@/lib/barrido";

/* POST /api/interno/barrido — lo llama cada minuto el servicio «barrido» del docker-compose (red interna). Pide el token del
   entorno (BARRIDO_TOKEN, lo crea deploy.sh; nunca en el repo) y nginx no deja entrar a /api/interno desde fuera. Sin token
   configurado no corre (nunca abierto por accidente). */
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
  const r = await barridoCentral();
  return NextResponse.json({ ok: r.tareas.every((x) => x.ok), corrio: r.corrio, ms: r.ms, fallas: r.tareas.filter((x) => !x.ok).map((x) => ({ tarea: x.name, error: x.error })) });
}
