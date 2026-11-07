import { misMonedas } from "@/lib/monedas";
import { conCuenta } from "../sesion";
import { Monedas } from "./Monedas";

export const dynamic = "force-dynamic";

/* APP-GAM-MONEDAS · tus monedas (prototipo coinsV): el saldo con «Sin valor en dinero», cómo se ganan (las reglas vigentes), los cupones
   de los negocios de la ciudad que ves con su costo, «Canjear» → confirmación → tu código TL-CQ-xxxx con su vencimiento, tus cupones y los
   movimientos. Solo con cuenta (comunidadSoloConCuenta). Todo del servidor. */
export default async function Page() {
  const s = await conCuenta("/comunidad/monedas");
  const d = await misMonedas(s.u.id, s.loc.c.id, null);
  return <Monedas es={s.es} yo={s.me} d={d} />;
}
