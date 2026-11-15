import { NextResponse } from "next/server";
import { ErrorCuenta, leerFichaApelacion, mismoOrigen } from "@/lib/cuenta";
import { apelar } from "@/lib/apelaciones";
import { respuestaError } from "../_respuesta";

/* 9n-7 · Apelar una suspensión o un baneo desde «Entrar», sin sesión: solo con la ficha firmada que dio verificarCodigo a quien probó su
   teléfono (30 min; lib/cuenta.ts fichaApelacion). Apela esa sanción y nada más: la ficha dice la persona y la sanción, el cuerpo solo trae
   el texto. Una vez por sanción y en sus 14 días (lib/apelaciones.ts apelar). Guardián apelarSinSesionConFicha. */
export async function POST(req: Request) {
  try {
    if (!(await mismoOrigen())) throw new ErrorCuenta("origen");
    const { ficha, texto } = (await req.json().catch(() => ({}))) as { ficha?: string; texto?: string };
    const f = leerFichaApelacion(String(ficha ?? ""));
    if (!f) return NextResponse.json({ ok: false, mensaje: { es: "Se acabó el tiempo para apelar desde aquí. Pide otro código y vuelve a intentarlo.", en: "Time ran out to appeal from here. Ask for a new code and try again." } }, { status: 400 });
    const r = await apelar(f.uid, "sanction", f.sancion, String(texto ?? ""));
    if (!r.ok) return NextResponse.json({ ok: false, mensaje: r.msg }, { status: 400 });
    return NextResponse.json({ ok: true, numero: r.numero });
  } catch (e) {
    return respuestaError(e);
  }
}
