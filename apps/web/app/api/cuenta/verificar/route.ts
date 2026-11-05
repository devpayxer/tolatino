import { NextResponse } from "next/server";
import { ErrorCuenta, mismoOrigen, verificarCodigo } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";

export async function POST(req: Request) {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    const { telefono, codigo } = (await req.json().catch(() => ({}))) as { telefono?: string; codigo?: string };
    const r = await verificarCodigo(String(telefono ?? ""), String(codigo ?? ""));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaError(e);
  }
}
