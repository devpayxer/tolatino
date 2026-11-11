import { NextResponse } from "next/server";
import { retoEntrar } from "@/lib/llaves/llaves";
import { respuestaError } from "../../../_respuesta";
import { cuerpo } from "../../_cuerpo";

/* 8d · Entrar con llave, paso 1: el reto (sin sesión; límite por dirección). */
export async function POST(req: Request) {
  try {
    await cuerpo(req);
    return NextResponse.json({ ok: true, opciones: await retoEntrar() }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
