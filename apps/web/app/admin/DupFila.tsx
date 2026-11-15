"use client";
/* 9n-8 · Una fila de «Posibles duplicados» (prototipo dupRow): los dos negocios (o, desde el 360° de uno, el otro), por qué salen, su estado y, si
   está por revisar y la persona puede editar Negocios, «Fusionar» (elige cuál queda → Cambios sensibles) y «No es duplicado» (con motivo, para siempre). */
import type { ParDup } from "@/lib/admin-negocios-dup";
import type { Confirmar } from "./Colas";
import { noEsDuplicado, pedirFusion } from "./acciones-negocios";

const T: Record<ParDup["st"], [string, string]> = {
  open: ["POR REVISAR", "action"], linked: ["VINCULADOS · SUCURSAL", "signal"], no: ["NO ES DUPLICADO", "neutral"], merged: ["FUSIONADOS", "neutral"], pend: ["FUSIÓN EN LA COLA", "action"],
};
export function filasDup(pares: ParDup[], o: { desde?: string; puede: boolean; setConf: (c: Confirmar) => void; ir: (href: string) => void }) {
  return pares.map((x) => {
    const otro = o.desde ? (x.a.id === o.desde ? x.b : x.a) : null;
    const [tag, tone] = T[x.st];
    const por = `Nombre casi igual${x.addr ? " · misma dirección" : ""}${x.st === "linked" ? " · los dos negocios confirmaron la relación" : ""}${x.st === "no" && x.motivo ? ` · «${x.motivo}»` : ""}`;
    return {
      key: `${x.a.id}|${x.b.id}`, icon: "store", title: otro ? otro.name : `${x.a.name} · ${x.b.name}`, sub: por, tag, tone,
      chevron: !!otro, onClick: otro ? () => o.ir(`/admin/negocios/${otro.id}`) : () => o.ir(`/admin/negocios/${x.a.id}?tab=confianza`),
      actions: o.puede && x.st === "open" ? [
        { label: "Fusionar", variant: "secondary", icon: "users", onClick: () => o.setConf({ titulo: "Fusionar negocios", cta: "Enviar a la cola",
          sub: "Elige cuál queda. Reseñas, seguidores y guardados del otro pasan a ese; el otro se cierra y su página lleva al que queda. Entra a Cambios sensibles y otra persona lo aprueba.",
          elegir: { label: "QUEDA", items: [{ k: x.a.id, l: `${x.a.name} queda` }, { k: x.b.id, l: `${x.b.name} queda` }] },
          plantillas: ["El dueño publicó dos veces", "Lo agregó un vecino y luego el dueño", "Es el mismo local con otro nombre"],
          hacer: (m, e) => pedirFusion(e ?? "", e === x.a.id ? x.b.id : x.a.id, m) }) },
        { label: "No es duplicado", variant: "secondary", icon: "check", onClick: () => o.setConf({ titulo: "¿Por qué no es duplicado?", cta: "Guardar",
          sub: "El par sale de «por revisar» para siempre. Queda en la auditoría.", plantillas: ["Son negocios distintos", "Misma familia, otro negocio", "Otra dirección y otro dueño"],
          hacer: (m) => noEsDuplicado(x.a.id, x.b.id, m) }) },
      ] : undefined,
    };
  });
}
