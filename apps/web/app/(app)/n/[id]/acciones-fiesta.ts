"use server";
/* «Tu fecha» desde la ficha de Fiestas (hoja Tu fecha del diseño). Con sesión se guarda en la cuenta y sirve en todos los
   negocios; sin sesión vive en el teléfono. El servidor la valida. Guardarla no aparta nada. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { guardarTuFecha } from "@/lib/fiestas-publico";

export async function tuFechaGuardar(f: unknown) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo guardar.", en: "Could not save." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para guardarla en tu cuenta.", en: "Sign in to save it to your account." } };
  return guardarTuFecha(u.id, f);
}
