import { NextResponse } from "next/server";
import { evento } from "@/lib/eventos";
import { entrar } from "@/lib/llaves/llaves";
import { respuestaError } from "../../_respuesta";
import { cuerpo } from "../_cuerpo";

/* 8d · Entrar con llave, paso 2: la firma del teléfono → la misma sesión que el código por SMS (lib/cuenta.ts abrirSesionEn). */
export async function POST(req: Request) {
  try {
    const b = (await cuerpo(req)) as { respuesta?: unknown };
    const { id, ...r } = await entrar(b?.respuesta);
    await evento("entrar", { userId: id });
    return NextResponse.json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
