import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ENTORNO, MODO_SMS } from "@/lib/entorno";

/* 9j · SOLO PRUEBAS: provoca un error del servidor (con un teléfono de ficción en el mensaje) para que la prueba de punta a punta sis9j vea que
   instrumentation.ts lo junta, lo tapa y lo agrupa. Dos candados (como el modo pruebas del código de entrada): el código de entrada en pantalla
   (TOLATINO_SMS_MODO=pruebas, que lib/entorno.ts no deja existir en producción) y un entorno que no es producción; además, el token del barrido
   (nginx no deja entrar a /api/interno desde fuera). Fuera de eso: 404, como si no existiera (guardián equipoConDosPasos). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenOk(dado: string | null): boolean {
  const t = process.env.BARRIDO_TOKEN ?? "";
  if (t.length < 32 || !dado) return false;
  const a = Buffer.from(t), b = Buffer.from(dado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!(MODO_SMS === "pruebas" && ENTORNO !== "produccion") || !tokenOk(req.headers.get("x-barrido-token"))) return NextResponse.json({ ok: false }, { status: 404 });
  throw new Error("Prueba 9j: no se pudo avisar al 570-555-0142 de su pedido");
}
