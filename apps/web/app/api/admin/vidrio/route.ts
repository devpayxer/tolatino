import { NextResponse } from "next/server";
import { staff } from "@/lib/admin";
import { mismoOrigen } from "@/lib/cuenta";
import { abrirVidrio } from "@/lib/sistema/vidrio";

/* 9j · «Vidrio roto» por la API: abre las fotos de Salud de una ayuda a esta persona del equipo con su motivo escrito (lo mismo que «Ver con motivo»
   en Colas). Solo del equipo con el segundo factor de esta sesión (staff()), del mismo sitio, con motivo. Lo demás: 404 o el motivo del rechazo. */
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const s = await staff();
  if (!s || !(await mismoOrigen())) return NextResponse.json({ ok: false }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { foto?: unknown; ayuda?: unknown; motivo?: unknown };
  const r = await abrirVidrio(s, { foto: typeof b.foto === "string" ? b.foto : undefined, ayuda: typeof b.ayuda === "string" ? b.ayuda : undefined }, String(b.motivo ?? ""));
  return NextResponse.json(r.ok ? { ok: true, mensaje: r.msg } : { ok: false, mensaje: r.msg }, { status: r.ok ? 200 : 400 });
}
