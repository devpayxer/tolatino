import { NextResponse } from "next/server";
import { ErrorCuenta, mismoOrigen, verificarCodigo } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";
import { evento } from "@/lib/eventos";

export async function POST(req: Request) {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    const { telefono, codigo } = (await req.json().catch(() => ({}))) as { telefono?: string; codigo?: string };
    const { id, ...r } = await verificarCodigo(String(telefono ?? ""), String(codigo ?? ""));
    await evento(r.nuevo ? "registrarse" : "entrar", { userId: id });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaError(e);
  }
}
