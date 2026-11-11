import { NextResponse } from "next/server";
import { ofrecerUnaVez } from "@/lib/llaves/llaves";
import { respuestaError } from "../../_respuesta";
import { conSesion, cuerpo } from "../_cuerpo";

/* 8d · ¿Sale la hoja «Entra la próxima vez con Face ID / tu huella»? Una vez por cuenta: la misma escritura la marca. */
export async function POST(req: Request) {
  try {
    await cuerpo(req);
    return NextResponse.json({ ok: true, ofrecer: await ofrecerUnaVez(await conSesion()) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
