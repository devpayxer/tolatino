import { NextResponse } from "next/server";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";

/* 8c · Tocar un push (fase8-apps.md §3.3 «Abrir»): el push solo lleva «/app/aviso/{id}» (nunca la ruta con datos, ni el texto si es privado).
   Aquí, CON la sesión de la dueña del aviso: se marca abierto (opened_at, opened_via 'push') y leído, y se va a la pantalla del aviso. Sin
   sesión, a entrar y de vuelta aquí. Un aviso de otra persona no abre nada (va a la campana). /app es común a las cuatro apps (apps.json): el
   middleware no lo saca de la cáscara; la pantalla de destino, si es de otra app, sí (como siempre). Abrirlo no gasta nada (ver no es usar). */
export const dynamic = "force-dynamic";

const seguro = (h: string | null | undefined) => (h && /^\/(?![/\\])[^\s\\]{0,400}$/.test(h) ? h : null);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, u = new URL(req.url), via = u.searchParams.get("v") === "push" ? "push" : null;
  const base = `${(req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() === "https" ? "https" : u.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host}`;
  const ir = (r: string) => { const x = NextResponse.redirect(new URL(r, base), 303); x.headers.set("cache-control", "no-store"); return x; };
  if (!/^\d{1,18}$/.test(id)) return ir("/avisos");
  const yoU = await yo().catch(() => null);
  if (!yoU) return ir(`/entrar?volver=${encodeURIComponent(`/app/aviso/${id}${via ? "?v=push" : ""}`)}`);
  const r = (await db().query<{ href: string | null }>(
    `update notifications set opened_at = coalesce(opened_at, now()), opened_via = coalesce(opened_via, $3), read_at = coalesce(read_at, now())
      where id = $1::bigint and user_id = $2 returning href`, [id, yoU.id, via])).rows[0];
  return ir(seguro(r?.href) ?? "/avisos");
}
