import { NextResponse } from "next/server";
import { ErrorCuenta, mismoOrigen, salir } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";

export async function POST() {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    await salir();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
