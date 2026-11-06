"use client";
/* USR-FAVORITOS (diseño «To'Latino Mi cuenta» · favV): Negocios (los que guardas con el corazón y los que sigues, con
   abierto o cerrado; «Editar» para quitarlos), Vacantes y Novedades guardadas. Platos y eventos guardados llegan cuando
   se puedan guardar. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MisGuardados } from "@/lib/mi-cuenta";
import { bi, pagoL, tipoL } from "@/lib/jobs-txt";
import { guardarNegocio } from "../../acciones";
import { vacGuardar } from "../../n/[id]/acciones-jobs";
import { novGuardar, seguir } from "../../n/[id]/acciones-novedades";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

export function Guardados({ d, f, es, yo }: { d: MisGuardados; f: "biz" | "vac" | "nov"; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const [ed, setEd] = useState(false), [busy, setBusy] = useState(false);
  const quitar = async (f2: () => Promise<{ ok: boolean }>, msg: string) => {
    if (busy) return; setBusy(true);
    const r = await f2().catch(() => null);
    setBusy(false);
    if (r?.ok) { ui.toast(msg); router.refresh(); } else ui.toast(E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  };
  const B: Bloque[] = [{ type: "chips", items: ([["biz", E2("Negocios", "Businesses"), d.negocios.length], ["vac", E2("Vacantes", "Jobs"), d.vacantes.length], ["nov", E2("Novedades", "Updates"), d.novedades.length]] as const)
    .map(([k, l, n]) => ({ l: `${l} · ${n}`, on: f === k, onClick: () => router.push(k === "biz" ? "/cuenta/guardados" : `/cuenta/guardados?f=${k}`) })) }];
  if (f === "biz") {
    if (!d.negocios.length) B.push({ type: "empty", ic: "heart", t: E2("Todavía no guardas negocios", "No saved businesses yet"), s: E2("Toca el corazón en un negocio, o síguelo desde sus novedades, y aquí lo tienes a mano.", "Tap the heart on a business, or follow it from its updates, and keep it handy here."), cta: E2("Explorar negocios", "Explore businesses"), onCta: () => router.push("/negocios") });
    else {
      B.push({ type: "sec", t: `${d.negocios.length} ${d.negocios.length === 1 ? E2("negocio", "business") : E2("negocios", "businesses")}`, fs: "15px", mt: "2px", a: ed ? E2("Listo", "Done") : E2("Editar", "Edit"), onA: () => setEd(!ed) });
      const meta = (x: MisGuardados["negocios"][number]) => [x.subs, x.rating ? `★ ${x.rating.toFixed(1)}` : null].filter(Boolean).join(" · ").toUpperCase();
      if (!ed) B.push({ type: "biz", items: d.negocios.map((x) => ({ name: x.name, meta: meta(x), ver: x.verified, slot: x.open == null ? "" : x.open ? E2("Abierto", "Open") : E2("Cerrado", "Closed"), img: x.foto ?? undefined, on: () => router.push(`/n/${x.id}`) })) });
      else B.push({ type: "rows", rows: d.negocios.map((x) => ({
        key: x.id, ph: x.foto, ini: x.name.slice(0, 1), t: x.name, tag: x.open == null ? null : x.open ? [E2("ABIERTO", "OPEN"), "signal"] : [E2("CERRADO", "CLOSED"), "neutral"],
        s: [meta(x), x.sigue ? E2("LO SIGUES", "FOLLOWING") : null].filter(Boolean).join(" · "), chev: true, on: () => router.push(`/n/${x.id}`),
        acts: [...(x.saved ? [[E2("Quitar", "Remove"), "secondary", () => quitar(() => guardarNegocio(x.id), E2(`Quitaste ${x.name} de guardados.`, `Removed ${x.name} from saved.`))] as [string, string, () => void]] : []),
          ...(x.sigue ? [[E2("Dejar de seguir", "Unfollow"), "secondary", () => quitar(() => seguir(x.id), E2(`Ya no sigues a ${x.name}.`, `You no longer follow ${x.name}.`))] as [string, string, () => void]] : [])],
      })) });
    }
  }
  if (f === "vac") B.push(d.vacantes.length ? { type: "rows", rows: d.vacantes.map((x) => ({
    key: x.id, ph: x.foto, ini: x.bname.slice(0, 1), t: bi(x.title, es), s: `${x.bname} · ${tipoL(x.kind, es)}`.toUpperCase(), v: pagoL(x.payFrom, x.payTo, es), vs: x.tips ? E2("+ PROPINAS", "+ TIPS") : undefined, chev: true,
    on: () => router.push(`/n/${x.biz}/empleo/${x.id}`), acts: [[E2("Quitar", "Remove"), "secondary", () => quitar(() => vacGuardar(x.id), E2("Vacante quitada de guardados.", "Job removed from saved."))]],
  })) } : { type: "empty", ic: "brief", t: E2("Sin vacantes guardadas", "No saved jobs"), s: E2("Guarda vacantes con el corazón en la pestaña Jobs de cada negocio.", "Save jobs with the heart in each business’s Jobs tab."), cta: E2("Explorar negocios", "Explore businesses"), onCta: () => router.push("/negocios") });
  if (f === "nov") B.push(d.novedades.length ? { type: "rows", rows: d.novedades.map((x) => ({
    key: x.id, ph: x.foto, ini: x.bname.slice(0, 1), t: x.title, s: x.bname.toUpperCase(), chev: true, on: () => router.push(`/n/${x.biz}?tab=nov`),
    acts: [[E2("Quitar", "Remove"), "secondary", () => quitar(() => novGuardar(x.id), E2("Novedad quitada de guardados.", "Update removed from saved."))]],
  })) } : { type: "empty", ic: "news", t: E2("Sin novedades guardadas", "No saved updates"), s: E2("Guarda las ofertas que te gustan en las novedades de cada negocio.", "Save the deals you like in each business’s updates.") });
  return <Marco es={es} code="USR-FAVORITOS" t={E2("Guardados", "Saved")} s={`${d.negocios.length}${E2(" NEGOCIOS · ", " BUSINESSES · ")}${d.vacantes.length}${E2(" VACANTES · ", " JOBS · ")}${d.novedades.length}${E2(" NOVEDADES", " UPDATES")}`} blocks={B} yo={yo} ui={ui} />;
}
