import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recibirAlertas, type AlertaAM } from "@/lib/sistema/alertas";

/* POST /api/interno/alerta — 9o · Alertmanager (en la réplica, por la red privada) manda aquí lo que enciende o resuelve el monitoreo
   (infra/comun/monitoreo/reglas.yml). Pide el token ALERTA_TOKEN (nace en la máquina de la app; la réplica lo recibe en su sobre privado; nunca en el
   repo) como «Authorization: Bearer». nginx no deja entrar a /api/interno desde fuera. Sin token configurado (el sandbox), 404 siempre. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenOk(h: string | null): boolean {
  const t = process.env.ALERTA_TOKEN ?? "";
  const dado = h?.startsWith("Bearer ") ? h.slice(7) : "";
  if (t.length < 32 || !dado) return false;
  const a = Buffer.from(t), b = Buffer.from(dado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenOk(req.headers.get("authorization"))) return NextResponse.json({ ok: false }, { status: 404 });
  const cuerpo = (await req.json().catch(() => null)) as { alerts?: AlertaAM[]; commonLabels?: { entorno?: string } } | null;
  if (!cuerpo || !Array.isArray(cuerpo.alerts)) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await recibirAlertas(cuerpo.alerts, (cuerpo.commonLabels?.entorno ?? "").slice(0, 20) || undefined);
  return NextResponse.json({ ok: true, ...r });
}
