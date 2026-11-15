import { NextResponse, type NextRequest } from "next/server";
import { edicionesVivas } from "@/lib/compa/ayuda-indice";
import { dentroDelTope } from "@/lib/topes";

/* 9f-5 · Lo editado en vivo desde Super Admin › Textos y páginas › Ayuda, para llevarlo al repo (el repo es la fuente; fase7-compa.md §6 #12). Lo lee
   el trabajo «Ayuda editada» de GitHub (.github/workflows/ayuda-ediciones.yml) y Claude lo pasa a docs/ayuda/ en su siguiente commit. Sin sesión: de
   las audiencias públicas sale el texto nuevo (ya se ve en el Centro de ayuda); de lo del equipo o de una sección solo-equipo, solo qué sección y
   cuándo (texto: null). Nunca quién editó ni su motivo. Tope por conexión (lib/topes.ts). */
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!(await dentroDelTope("ayuda_ediciones", /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "?", 30))) return new NextResponse(null, { status: 429, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ediciones: await edicionesVivas() }, { headers: { "cache-control": "no-store" } });
}
