import { NextResponse } from "next/server";
import { ErrorCuenta } from "@/lib/cuenta";

/* Errores de cuenta → mensaje claro ES/EN. Nunca se filtra el detalle interno. */
const MENSAJES: Record<string, [number, string, string]> = {
  telefono_invalido: [400, "Revisa el número: son 10 dígitos de EE. UU.", "Check the number: 10 US digits."],
  codigo_invalido: [400, "El código son 6 números.", "The code is 6 digits."],
  codigo_incorrecto: [400, "Ese código no es. Revísalo e inténtalo otra vez.", "That code isn't right. Check it and try again."],
  codigo_vencido: [400, "El código venció. Pide uno nuevo.", "The code expired. Ask for a new one."],
  espera: [429, "Espera unos segundos para pedir otro código.", "Wait a few seconds to ask for another code."],
  demasiados: [429, "Demasiados intentos. Prueba otra vez en una hora.", "Too many tries. Try again in an hour."],
  cuenta_bloqueada: [403, "Esta cuenta no puede entrar. Escríbele a Soporte.", "This account can't sign in. Contact Support."],
  sin_sesion: [401, "Tu sesión terminó. Entra otra vez.", "Your session ended. Sign in again."],
  nombre_requerido: [400, "Escribe tu nombre y tu apellido.", "Enter your first and last name."],
  sin_proveedor: [503, "No pudimos mandar el código ahora. Inténtalo en un rato.", "We couldn't send the code right now. Try again soon."],
  origen: [403, "Petición no permitida.", "Request not allowed."],
};

export function respuestaError(e: unknown) {
  if (e instanceof ErrorCuenta) {
    const [status, es, en] = MENSAJES[e.codigo] ?? [400, "No se pudo completar.", "Couldn't complete."];
    return NextResponse.json({ ok: false, error: e.codigo, mensaje: { es, en }, espera: e.espera }, { status });
  }
  console.error("[cuenta]", e);
  return NextResponse.json({ ok: false, error: "interno", mensaje: { es: "Algo falló de nuestro lado. Inténtalo otra vez.", en: "Something failed on our side. Try again." } }, { status: 500 });
}
