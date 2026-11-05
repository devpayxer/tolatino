import { NextResponse } from "next/server";
import { ErrorCuenta, guardarPerfil, mismoOrigen } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";

export async function POST(req: Request) {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    const b = (await req.json().catch(() => ({}))) as { nombre?: string; apellido?: string; apodo?: string };
    await guardarPerfil({ first: String(b.nombre ?? ""), last: String(b.apellido ?? ""), nick: b.apodo ? String(b.apodo) : undefined });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
