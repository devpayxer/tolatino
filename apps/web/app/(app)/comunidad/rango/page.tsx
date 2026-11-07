import { miRango } from "@/lib/puntos";
import { conCuenta } from "../sesion";
import { Rango } from "./Rango";

export const dynamic = "force-dynamic";

/* APP-GAM-RANGO · tu rango (prototipo rankV): los 10 rangos con lo que piden y lo que desbloquean, el tuyo marcado, cuánto falta, cómo se
   ganan los puntos (PTS con los valores vigentes) y sus reglas (PTS_RULES con el tope vigente), tus últimos movimientos y tus insignias.
   Solo con cuenta (comunidadSoloConCuenta). */
export default async function Page() {
  const s = await conCuenta("/comunidad/rango");
  const d = await miRango(s.u.id);
  return <Rango es={s.es} yo={{ ...s.me, rango: d.n, puntos: d.puntos }} d={d} />;
}
