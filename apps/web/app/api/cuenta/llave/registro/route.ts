import { NextResponse } from "next/server";
import { registrar } from "@/lib/llaves/llaves";
import { respuestaError } from "../../_respuesta";
import { conSesion, cuerpo } from "../_cuerpo";

/* 8d · Agregar una llave, paso 2: la respuesta del teléfono → la llave (aviso crit a la persona). */
export async function POST(req: Request) {
  try {
    const b = (await cuerpo(req)) as { respuesta?: unknown };
    const r = await registrar(await conSesion(), b?.respuesta);
    return NextResponse.json({ ok: true, nombre: r.nombre }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
