import { requerir } from "@/lib/admin";
import { datosCompaAdmin } from "@/lib/compa/admin-compa";
import { ElCompaAdmin } from "../ElCompaAdmin";

/* 7c · Super Admin › El Compa (ADM-COMPA; Super Admin.dc.html secCompa): «Interruptores y tope» (POR NIVEL, POR CANAL, por ciudad y por
   negocio, REGLAS FIJAS, el gasto del mes con el tope — hueco #3 — y el historial) y «Conversaciones» en solo lectura (cifras y lista con
   cursor; sin el texto). Resumen y Negocios llegan con el Super Admin completo de El Compa. ?tab=ctl|conv · ?uso= · ?res= · ?antes= cursor.
   Ver = compa:ver; cada cambio lo revisa el servidor (compa:aprobar). */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("compa", "ver");
  const sp = await searchParams;
  const tab = sp.tab === "conv" ? "conv" : "ctl";
  const d = await datosCompaAdmin({ uso: sp.uso ?? null, resultado: sp.res ?? null, antes: sp.antes ?? null });
  return <ElCompaAdmin d={d} tab={tab} uso={sp.uso ?? null} res={sp.res ?? null} antes={sp.antes ?? null} cambiar={s.puede("compa", "aprobar")} />;
}
