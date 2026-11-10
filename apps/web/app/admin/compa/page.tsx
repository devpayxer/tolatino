import { requerir } from "@/lib/admin";
import { datosCompaAdmin, fichaConversacion } from "@/lib/compa/admin-compa";
import { ElCompaAdmin } from "../ElCompaAdmin";

/* 7c · Super Admin › El Compa (ADM-COMPA; Super Admin.dc.html secCompa): «Interruptores y tope» (POR NIVEL, POR CANAL, por ciudad y por
   negocio, REGLAS FIJAS, el gasto del mes con el tope — hueco #3 — y el historial) y «Conversaciones» (cifras y lista con cursor, sin el texto).
   7d · Conversaciones: filtros DÓNDE · RESULTADO · CANAL y el número CP-; ?cp=CP-… abre la ficha con el hilo (compaDetail) SOLO con compa:editar
   (Admin y Soporte), y cada apertura queda en compa_reads antes de leerlo. Resumen y Negocios llegan con el Super Admin completo de El Compa.
   ?tab=ctl|conv · ?uso= · ?res= · ?canal= · ?cp= · ?antes= cursor. Ver = compa:ver; cada cambio lo revisa el servidor (compa:aprobar). */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("compa", "ver");
  const sp = await searchParams;
  const tab = sp.tab === "conv" || sp.cp ? "conv" : "ctl";
  const [d, ficha] = await Promise.all([
    datosCompaAdmin({ uso: sp.uso ?? null, resultado: sp.res ?? null, antes: sp.antes ?? null, canal: sp.canal ?? null, numero: sp.buscar ?? null }),
    sp.cp ? fichaConversacion(s, sp.cp) : Promise.resolve(null),
  ]);
  return <ElCompaAdmin d={d} tab={tab} uso={sp.uso ?? null} res={sp.res ?? null} canal={sp.canal ?? null} buscar={sp.buscar ?? null} antes={sp.antes ?? null} cambiar={s.puede("compa", "aprobar")}
    cp={sp.cp ?? null} ficha={ficha} leer={s.puede("compa", "editar")} />;
}
