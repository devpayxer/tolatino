import { NextResponse } from "next/server";
import { ErrorCuenta, mismoOrigen, pedirCodigo } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";

export async function POST(req: Request) {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    const { telefono } = (await req.json().catch(() => ({}))) as { telefono?: string };
    const r = await pedirCodigo(String(telefono ?? ""));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaError(e);
  }
}
