import { NextResponse } from "next/server";
import { retoRegistro } from "@/lib/llaves/llaves";
import { respuestaError } from "../../../_respuesta";
import { conSesion, cuerpo } from "../../_cuerpo";

/* 8d · Agregar una llave, paso 1: el reto (con sesión; atado a la cuenta y al dispositivo). */
export async function POST(req: Request) {
  try {
    await cuerpo(req);
    return NextResponse.json({ ok: true, opciones: await retoRegistro(await conSesion()) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
