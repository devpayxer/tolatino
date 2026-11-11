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
  dispositivo_bloqueado: [403, "Desde este dispositivo no se puede entrar. Escríbele a Soporte.", "You can't sign in from this device. Contact Support."],
  sin_sesion: [401, "Tu sesión terminó. Entra otra vez.", "Your session ended. Sign in again."],
  nombre_requerido: [400, "Escribe tu nombre y tu apellido.", "Enter your first and last name."],
  sin_proveedor: [503, "No pudimos mandar el código ahora. Inténtalo en un rato.", "We couldn't send the code right now. Try again soon."],
  origen: [403, "Petición no permitida.", "Request not allowed."],
  // 8d · Llaves de acceso (Face ID / huella). Nunca dicen de quién es una llave ni por qué exactamente no sirvió.
  llave_no_disponible: [404, "Aquí no se puede entrar con llave de acceso. Entra con tu teléfono.", "Passkeys aren't available here. Sign in with your phone."],
  reto_vencido: [400, "Se acabó el tiempo. Inténtalo otra vez.", "Time ran out. Try again."],
  llave_desconocida: [400, "Esa llave ya no entra a To'Latino. Entra con tu teléfono y, si quieres, agrega otra.", "That passkey no longer signs in to To'Latino. Sign in with your phone and, if you want, add another."],
  llave_invalida: [400, "No pudimos comprobar tu llave. Inténtalo otra vez o entra con tu teléfono.", "We couldn't check your passkey. Try again or sign in with your phone."],
  llave_maximo: [400, "Ya tienes el máximo de llaves. Quita una en Mi cuenta › Privacidad.", "You already have the maximum number of passkeys. Remove one in My account › Privacy."],
  llave_repetida: [400, "Esa llave ya está guardada.", "That passkey is already saved."],
  verificar_sms: [403, "Por seguridad, esta vez entra con el código que te mandamos por texto.", "For your security, this time sign in with the code we text you."],
  sin_cuenta: [400, "Esa llave ya no entra a To'Latino. Entra con tu teléfono.", "That passkey no longer signs in to To'Latino. Sign in with your phone."],
};

export function respuestaError(e: unknown) {
  if (e instanceof ErrorCuenta) {
    const [status, es, en] = MENSAJES[e.codigo] ?? [400, "No se pudo completar.", "Couldn't complete."];
    return NextResponse.json({ ok: false, error: e.codigo, mensaje: e.detalle ?? { es, en }, espera: e.espera }, { status });
  }
  console.error("[cuenta]", e);
  return NextResponse.json({ ok: false, error: "interno", mensaje: { es: "Algo falló de nuestro lado. Inténtalo otra vez.", en: "Something failed on our side. Try again." } }, { status: 500 });
}
