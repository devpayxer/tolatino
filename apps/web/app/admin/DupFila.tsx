"use client";
/* 9n-8 · Una fila de «Posibles duplicados» (prototipo dupRow): los dos negocios (o, desde el 360° de uno, el otro), por qué salen, su estado y, si
   está por revisar y la persona puede editar Negocios, «Fusionar» (elige cuál queda → Cambios sensibles) y «No es duplicado» (con motivo, para siempre). */
import type { ParDup } from "@/lib/admin-negocios-dup";
import type { Confirmar } from "./Colas";
import { noEsDuplicado, pedirFusion } from "./acciones-negocios";

type EF = (es: string, en: string) => string;
const ES: EF = (es) => es;
const T = (E2: EF): Record<ParDup["st"], [string, string]> => ({
  open: [E2("POR REVISAR", "TO REVIEW"), "action"], linked: [E2("VINCULADOS · SUCURSAL", "LINKED · BRANCH"), "signal"], no: [E2("NO ES DUPLICADO", "NOT A DUPLICATE"), "neutral"],
  merged: [E2("FUSIONADOS", "MERGED"), "neutral"], pend: [E2("FUSIÓN EN LA COLA", "MERGE IN QUEUE"), "action"],
});
/* `E2` (de useE2() en quien llama) da el inglés; sin él, español. */
export function filasDup(pares: ParDup[], o: { desde?: string; puede: boolean; setConf: (c: Confirmar) => void; ir: (href: string) => void; E2?: EF }) {
  const E2 = o.E2 ?? ES, TT = T(E2);
  return pares.map((x) => {
    const otro = o.desde ? (x.a.id === o.desde ? x.b : x.a) : null;
    const [tag, tone] = TT[x.st];
    const por = E2(`Nombre casi igual${x.addr ? " · misma dirección" : ""}${x.st === "linked" ? " · los dos negocios confirmaron la relación" : ""}${x.st === "no" && x.motivo ? ` · «${x.motivo}»` : ""}`,
      `Nearly the same name${x.addr ? " · same address" : ""}${x.st === "linked" ? " · both businesses confirmed the link" : ""}${x.st === "no" && x.motivo ? ` · “${x.motivo}”` : ""}`);
    return {
      key: `${x.a.id}|${x.b.id}`, icon: "store", title: otro ? otro.name : `${x.a.name} · ${x.b.name}`, sub: por, tag, tone,
      chevron: !!otro, onClick: otro ? () => o.ir(`/admin/negocios/${otro.id}`) : () => o.ir(`/admin/negocios/${x.a.id}?tab=confianza`),
      actions: o.puede && x.st === "open" ? [
        { label: E2("Fusionar", "Merge"), variant: "secondary", icon: "users", onClick: () => o.setConf({ titulo: E2("Fusionar negocios", "Merge businesses"), cta: E2("Enviar a la cola", "Send to queue"),
          sub: E2("Elige cuál queda. Reseñas, seguidores y guardados del otro pasan a ese; el otro se cierra y su página lleva al que queda. Entra a Cambios sensibles y otra persona lo aprueba.",
            "Choose which one stays. Reviews, followers and saves from the other move to it; the other closes and its page points to the one that stays. It goes to Sensitive changes and someone else approves it."),
          elegir: { label: E2("QUEDA", "KEEP"), items: [{ k: x.a.id, l: E2(`${x.a.name} queda`, `Keep ${x.a.name}`) }, { k: x.b.id, l: E2(`${x.b.name} queda`, `Keep ${x.b.name}`) }] },
          plantillas: [E2("El dueño publicó dos veces", "The owner posted it twice"), E2("Lo agregó un vecino y luego el dueño", "A neighbor added it, then the owner"), E2("Es el mismo local con otro nombre", "Same place under another name")],
          nota: "interna", hacer: (m, e) => pedirFusion(e ?? "", e === x.a.id ? x.b.id : x.a.id, m) }) },
        { label: E2("No es duplicado", "Not a duplicate"), variant: "secondary", icon: "check", onClick: () => o.setConf({ titulo: E2("¿Por qué no es duplicado?", "Why isn’t it a duplicate?"), cta: E2("Guardar", "Save"),
          sub: E2("El par sale de «por revisar» para siempre. Queda en la auditoría.", "The pair leaves “to review” for good. It stays in the audit log."),
          plantillas: [E2("Son negocios distintos", "They are different businesses"), E2("Misma familia, otro negocio", "Same family, different business"), E2("Otra dirección y otro dueño", "Different address and owner")],
          nota: "interna", hacer: (m) => noEsDuplicado(x.a.id, x.b.id, m) }) },
      ] : undefined,
    };
  });
}
