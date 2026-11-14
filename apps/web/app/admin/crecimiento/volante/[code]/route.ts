import { NextResponse, type NextRequest } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { CODIGO } from "@/lib/crecimiento/comun";
import { volantePdf, type Formato } from "@/lib/crecimiento/volante";
import { BASE_URL } from "@/lib/correo";
import { db, tx } from "@/lib/db";
import { FIJAS } from "@/lib/textos-fijas";

/* 9h · Super Admin › Crecimiento › Enlaces y QR › «Volante» / «Cartel»: el PDF para imprimir de un enlace vivo (carta o media carta). Permiso mkt:ver y la
   ciudad del enlace; queda en la auditoría quién lo imprimió. El QR lleva SOLO la dirección corta (tolatino.com/q/{código}). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const s = await staff();
  if (!s || !s.puede("mkt", "ver")) return new NextResponse("No", { status: 403 });
  const c = decodeURIComponent((await params).code ?? "").toUpperCase(), formato: Formato = req.nextUrl.searchParams.get("f") === "media" ? "media" : "carta";
  if (!CODIGO.test(c)) return new NextResponse("No existe", { status: 404 });
  const l = (await db().query<{ label: string; city: string; ciudad: string; estado: string; vivo: boolean }>(
    `select l.label, l.city_id as city, ci.name as ciudad, ci.state as estado, l.retired_at is null as vivo from short_links l join cities ci on ci.id = l.city_id where l.code = $1`, [c])).rows[0];
  if (!l || !l.vivo || (s.cities.length && !s.cities.includes(l.city))) return new NextResponse("No existe", { status: 404 });
  const url = `${BASE_URL()}/q/${c}`;
  const pdf = volantePdf({ url, corto: url.replace(/^https?:\/\//, ""), fraseEs: FIJAS.es.landing, fraseEn: FIJAS.en.landing, lugar: `${l.ciudad}, ${l.estado}`, formato });
  await tx((q) => auditar(q, { actor: s.id, action: "mkt.enlace.imprimir", targetKind: "short_link", targetId: c, city: l.city, after: { formato } }));
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="tolatino-${c}-${formato}.pdf"`, "cache-control": "no-store" } });
}
