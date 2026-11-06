"use server";
/* Mi vehículo y Mi casa desde la ficha (hojas «Tu vehículo» y «Tu casa» del diseño). Solo la persona con sesión; se
   guardan en su cuenta y el servidor los valida. Devuelven la lista al día para la hoja. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { elegirCasa, elegirVehiculo, guardarCasa, guardarVehiculo, misCasas, misVehiculos, type CasaIn, type VehiculoIn } from "@/lib/oficios-publico";

type Bi = { es: string; en: string };
const NO = { ok: false as const, msg: { es: "Entra para guardarlo en tu cuenta.", en: "Sign in to save it to your account." } };

export async function vehiculoGuardar(p: VehiculoIn) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo(); if (!u) return NO;
  const r = await guardarVehiculo(u.id, p);
  return r.ok ? { ok: true as const, lista: await misVehiculos(u.id) } : { ok: false as const, msg: r.msg as Bi };
}
export async function vehiculoElegir(id: string) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo(); if (!u) return NO;
  return (await elegirVehiculo(u.id, String(id ?? ""))) ? { ok: true as const, lista: await misVehiculos(u.id) } : { ok: false as const, msg: { es: "Ese vehículo ya no está.", en: "That vehicle is gone." } };
}
export async function casaGuardar(negocio: string, p: CasaIn) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo(); if (!u) return NO;
  const r = await guardarCasa(u.id, p);
  return r.ok ? { ok: true as const, lista: await misCasas(u.id, String(negocio ?? "")) } : { ok: false as const, msg: r.msg as Bi };
}
export async function casaElegir(negocio: string, id: string) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo(); if (!u) return NO;
  return (await elegirCasa(u.id, String(id ?? ""))) ? { ok: true as const, lista: await misCasas(u.id, String(negocio ?? "")) } : { ok: false as const, msg: { es: "Esa casa ya no está.", en: "That home is gone." } };
}
