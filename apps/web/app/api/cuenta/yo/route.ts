import { NextResponse } from "next/server";
import { yo } from "@/lib/cuenta";
import { respuestaError } from "../_respuesta";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const u = await yo();
    return NextResponse.json({ ok: true, yo: u ? { nombre: u.first_name, apellido: u.last_name, apodo: u.nick, telefono: u.phone, idioma: u.lang } : null }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
