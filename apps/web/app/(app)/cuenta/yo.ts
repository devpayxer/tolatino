import "server-only";
import type { Yo as YoCuenta } from "@/lib/cuenta";
import { numeroVecino } from "@/lib/direcciones";
import type { Yo } from "./Marco";

/* La tarjeta de arriba de la navegación de Mi cuenta: iniciales, nombre y número de vecino. */
export async function yoMarco(u: YoCuenta, es: boolean): Promise<Yo> {
  const n = await numeroVecino(u.id);
  const nombre = [u.nick || u.first_name, u.last_name ? `${u.last_name[0]}.` : ""].filter(Boolean).join(" ");
  const ini = [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "TL";
  const num = (n?.n ?? 1).toLocaleString("en-US");
  const badge = n?.founder ? `${es ? "FUNDADORES · #" : "FOUNDERS · #"}${num}` : `${es ? "N.º " : "NO. "}${num}${n?.ciudad ? `${es ? " EN " : " IN "}${n.ciudad.toUpperCase()}` : ""}`;
  return { nombre, ini, badge };
}
