"use client";
/* USR-RESENAS (diseño «To'Latino Mi cuenta» · revV): Escritas (estrellas, fecha, si es verificada, tu texto, la
   respuesta del negocio, «Útil» y si To'Latino la ocultó) y Por escribir (lo terminado en los últimos 30 días). Sin
   puntos de rango hasta que exista la gamificación. */
import { useRouter } from "next/navigation";
import type { MisResenas } from "@/lib/mi-cuenta";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { diaCorto } from "../fechas";

export function Resenas({ d, f, es, yo }: { d: MisResenas; f: "hechas" | "pend"; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const R = d.escritas, P = d.porEscribir;
  const B: Bloque[] = [{ type: "chips", items: [{ l: `${E2("Escritas", "Written")} · ${R.length}`, on: f === "hechas", onClick: () => router.push("/cuenta/resenas") }, { l: `${E2("Por escribir", "To write")} · ${P.length}`, on: f === "pend", onClick: () => router.push("/cuenta/resenas?f=pend") }] }];
  if (f === "hechas") B.push(R.length ? { type: "rows", rows: R.map((r) => ({
    key: r.id, ph: r.foto, ini: r.bname.slice(0, 1), al: "flex-start" as const, t: r.bname,
    tag: r.st === "hidden" ? [E2("OCULTA POR TO’LATINO", "HIDDEN BY TO’LATINO"), "danger"] as [string, string] : r.reply ? [E2("RESPONDIDA", "REPLIED"), "signal"] as [string, string] : null,
    s: `${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)} · ${diaCorto(r.at, r.tz, es).toUpperCase()}${r.verif ? E2(" · VERIFICADA", " · VERIFIED") : ""}`,
    x: [r.body ? `“${r.body}”` : "", r.reply ? `${E2("Respuesta: ", "Reply: ")}“${r.reply}”` : "", r.st === "hidden" && r.why ? `${E2("Motivo: ", "Reason: ")}${r.why}` : ""].filter(Boolean).join(" · "),
    v: `+${r.util}`, vs: E2("ÚTIL", "USEFUL"), on: () => router.push(`/n/${r.biz}/resena/tuya`),
    acts: [[E2("Ver mi reseña", "See my review"), "secondary", () => router.push(`/n/${r.biz}/resena/tuya`)]] as [string, string, () => void][],
  })) } : { type: "empty", ic: "star", t: E2("Todavía no escribes reseñas", "No reviews yet"), s: E2("Después de un pedido o una reservación, aquí te sale para que cuentes cómo te fue.", "After an order or booking, it shows here so you can tell how it went.") });
  else B.push(P.length ? { type: "rows", rows: P.map((p) => ({
    key: p.biz, ph: p.foto, ini: p.bname.slice(0, 1), t: p.bname, s: `${p.kind === "table" ? E2("RESERVACIÓN", "BOOKING") : E2("PEDIDO", "ORDER")} · ${diaCorto(p.at, p.tz, es).toUpperCase()}`,
    x: E2("Tu reseña sale como verificada: viene de algo que hiciste en To’Latino.", "Your review shows as verified: it comes from something you did on To’Latino."),
    acts: [[E2("Escribir reseña", "Write review"), "primary", () => router.push(`/n/${p.biz}/resena?pedido=${p.num}`)]] as [string, string, () => void][],
  })) } : { type: "empty", ic: "star", t: E2("Nada por reseñar", "Nothing to review"), s: E2("Estás al día.", "You are all caught up.") });
  return <Marco es={es} code="USR-RESENAS" t={E2("Reseñas", "Reviews")} s={`${R.length}${E2(" ESCRITAS · ", " WRITTEN · ")}${P.length}${E2(" POR ESCRIBIR", " TO WRITE")}`} blocks={B} yo={yo} ui={ui} />;
}
