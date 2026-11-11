import { NextResponse } from "next/server";
import { staff } from "@/lib/admin";
import { ErrorCuenta, mismoOrigen, pedirCodigo } from "@/lib/cuenta";

/* 8a · Antes de subir una llave al llavero, el Super Admin vuelve a pedir el código al teléfono del Admin (fase8-apps.md §4 8a: «solo admin,
   vuelve a pedir el código o la llave antes de subir»). Mismo motor que entrar (huella, 10 min, intentos y límites); propósito «llavero».
   Cualquier otro rol (o sin sesión, o desde otro sitio): 403. En el sandbox el código se ve en pantalla (modo pruebas, como al entrar). */
export const dynamic = "force-dynamic";
export async function POST() {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("integ", "editar") || !(await mismoOrigen())) return NextResponse.json({ ok: false, msg: "Solo un Admin sube llaves." }, { status: 403 });
  try {
    const r = await pedirCodigo(s.phone, "llavero");
    return NextResponse.json({ ok: true, reenviarEn: r.reenviarEn, ...(r.codigoPrueba ? { codigoPrueba: r.codigoPrueba } : {}) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const c = e instanceof ErrorCuenta ? e.codigo : "error";
    const msg = c === "espera" ? `Espera ${(e as ErrorCuenta).espera ?? 30} s para pedir otro código.` : c === "demasiados" ? "Demasiados códigos en una hora. Prueba más tarde." : c === "sin_proveedor" ? "No hay proveedor de SMS en este entorno." : "No se pudo mandar el código.";
    return NextResponse.json({ ok: false, msg }, { status: c === "espera" || c === "demasiados" ? 429 : 503 });
  }
}
