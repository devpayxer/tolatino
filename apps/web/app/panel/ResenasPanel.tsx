"use client";
/* Reseñas en el panel (Panel v2 · sub 'resenas', det 'rev:' y «Reseñas sin responder» en Hoy). Las cifras y las listas
   llegan del servidor (reseñas visibles). Responder es de Pro; pedir revisión a To'Latino, de todos. Nada se borra ni se
   edita desde aquí. */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { FilaPanel, ResenaPanelDet, ResenasPanel } from "@/lib/resenas";
import { resenaResponder, resenaRevision } from "./acciones-resenas";
import type { Ctx, Editor } from "./Panel";

export type ResPanel = { lista?: ResenasPanel; f?: string; det?: ResenaPanelDet | null; hoy?: FilaPanel[] };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const estrellas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const cuando = (c: Ctx, d: number) => {
  const E2 = c.E2;
  return d <= 0 ? E2("hoy", "today") : d === 1 ? E2("ayer", "yesterday") : d < 7 ? E2(`hace ${d} días`, `${d} days ago`) : d < 30 ? E2(`hace ${Math.floor(d / 7)} sem.`, `${Math.floor(d / 7)} wk ago`) : E2(`hace ${Math.floor(d / 30)} meses`, `${Math.floor(d / 30)} mo ago`);
};
const VISITA = (c: Ctx): Record<FilaPanel["src"], string> => ({ dl: "Delivery", pk: "Pickup", rsv: c.E2("Reservó mesa", "Reserved a table"), cita: c.E2("Con cita", "Booked"), vis: c.E2("Visitante · sin pedido", "Visitor · no order") });

/* Fila de una reseña (lista y Hoy). */
function fila(c: Ctx, x: FilaPanel, compact = false): Fila {
  const { E2, es, d } = c, ext = x.extra ? (es ? x.extra.es : x.extra.en) : "";
  return {
    icon: "star", ibg: x.stars <= 2 ? "rgba(192,57,43,.1)" : "rgba(255,176,32,.14)", ifg: x.stars <= 2 ? "var(--tl-danger)" : "var(--tl-pro-ink)",
    t: `${compact ? "★".repeat(x.stars) : estrellas(x.stars)} · ${x.who}`, s: x.text, compact,
    m: compact ? undefined : `${ext ? `${ext} · ` : ""}${cuando(c, x.d)}`.toUpperCase(),
    tag: compact || !d.pro ? undefined : x.replied ? E2("RESPONDIDA", "REPLIED") : E2("RESPONDE", "REPLY"), tone: x.replied ? "signal" : "action",
    onClick: () => c.det(`rev:${x.id}`),
  };
}

export function resenasBloques(c: Ctx): Sec {
  const { E2, d } = c, L = c.res?.lista, f = c.res?.f ?? "all", out: (Bloque | null)[] = [];
  if (!L) return { blocks: out, ed: null };
  const k = L.k, pro = d.pro, pos = k.n ? Math.round((100 * k.pos) / k.n) : 0;
  out.push({ type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
    { k: E2("CALIFICACIÓN", "RATING"), v: `★ ${k.avg != null ? k.avg.toFixed(1) : "—"}`, s: `${k.n}${E2(" reseñas", " reviews")}` },
    { k: E2("SIN RESPONDER", "UNANSWERED"), v: pro ? String(k.norep) : "—", bg: pro && k.norep ? "var(--tl-ink)" : "var(--tl-white)", fg: pro && k.norep ? "var(--tl-white)" : "var(--tl-ink)", bd: pro && k.norep ? "none" : "1px solid rgba(11,14,18,.08)" },
    { k: E2("RECOMIENDAN", "RECOMMEND"), v: `${pos}%`, s: E2("4 o 5 estrellas", "4 or 5 stars") },
    { k: E2("VERIFICADAS", "VERIFIED"), v: `${k.ver}/${k.n}`, s: E2("por pedido o reserva", "from an order or reservation") },
  ] });
  const ir = (x: string) => c.nav(`/panel/${d.id}/pagina/resenas${x === "all" ? "" : `?f=${x}`}`);
  out.push({ type: "chips", items: ([["all", E2("Todas", "All")], ["norep", E2("Sin responder", "Unanswered")], ["5", "5 ★"], ["low", "≤ 2 ★"]] as [string, string][]).map(([x, l]) => ({ l, v: f === x ? "selected" : "filter", onClick: () => ir(x) })) });
  const cols2 = c.desk && c.w >= 1100 && !c.detCol ? "repeat(2,minmax(0,1fr))" : undefined;
  out.push(L.filas.length ? { type: "rows", cols: cols2, items: L.filas.map((x) => fila(c, x)) }
    : { type: "empty", icon: "star", t: k.n ? E2("Nada con ese filtro", "Nothing with that filter") : E2("Aún no tienes reseñas", "No reviews yet"), s: k.n ? "" : E2("Después de cada pedido, el cliente puede contar cómo le fue.", "After each order, the client can say how it went.") });
  if (!pro) out.push({ type: "note", tone: "warn", t: E2("Con Free tus reseñas se ven, pero no las respondes.", "On Free your reviews show, but you cannot reply."), ...ctaPro(c, "Pro") });
  out.push({ type: "note", tone: "info", icon: "help", t: E2("Las reseñas no se borran ni se editan desde aquí. Si una viola las reglas, pídele revisión a To'Latino desde la reseña.", "Reviews cannot be deleted or edited here. If one breaks the rules, ask To'Latino to review it from the review.") });
  return { blocks: out, ed: null };
}

export function resenaDetalle(c: Ctx): Sec {
  const { E2, es, d } = c, x = c.res?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Reseña no encontrada", "Review not found"), onBack: c.closeDet }, { type: "empty", icon: "star", t: E2("Esa reseña ya no está", "That review is gone"), s: E2("Puede que To'Latino la haya ocultado o que el cliente la haya quitado.", "To'Latino may have hidden it or the client removed it.") }], ed: null };
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("RESEÑA · ", "REVIEW · ")}${cuando(c, x.d)}`.toUpperCase(), t: `${estrellas(x.stars)} · ${x.who}`, onBack: c.closeDet },
    { type: "thread", items: [{ t: x.text }, ...(x.reply ? [{ t: x.reply, mine: true }] : [])] },
    { type: "kv", items: [{ k: E2("VISITA", "VISIT"), v: VISITA(c)[x.src] }, { k: E2("DATO DEL PEDIDO · NO SE EDITA", "ORDER DATA · NOT EDITABLE"), v: x.extra ? (es ? x.extra.es : x.extra.en) : "—" }] },
  ];
  if (!d.pro) out.push({ type: "lock", t: E2("Responde tus reseñas", "Reply to your reviews"), s: E2("La respuesta se ve tanto como la reseña. Solo con Pro.", "The reply shows as much as the review. Pro only."), ...ctaPro(c, E2("Ver Pro", "See Pro")) });
  else if (!x.reply) {
    const key = `det:rev:${x.id}`, F = c.form(key, { txt: "" }), t = F.d.txt;
    out.push(
      { type: "chips", k: E2("EMPIEZA CON", "START WITH"), items: [E2("Gracias por venir. ", "Thanks for coming. "), E2("Tienes razón, lo vamos a mejorar. ", "You are right, we will improve it. "), E2("Te esperamos otra vez. ", "Hope to see you again. ")].map((s) => ({ l: s.trim(), v: "filter", onClick: () => F.set({ txt: (t + s).slice(0, 300) }) })) },
      { type: "field", k: E2("TU RESPUESTA · SE VE EN PÚBLICO", "YOUR REPLY · PUBLIC"), val: t, area: true, rows: 3, max: 300, count: `${t.length}/300`, ph: E2("Escribe como le hablarías en persona.", "Write as you would say it in person."), onChange: (v) => F.set({ txt: v.slice(0, 300) }) },
      { type: "acts", items: [{ l: E2("Publicar respuesta", "Post reply"), v: "primary", icon: "check", off: c.pending || t.trim().length < 5, onClick: () => c.run(() => resenaResponder(d.id, x.id, t), E2("Respuesta publicada debajo de la reseña.", "Reply posted under the review.")) }] },
    );
  } else out.push({ type: "note", tone: "ok", t: E2("Respondida. Se ve debajo de la reseña.", "Replied. It shows under the review.") });
  if (x.estado === "disp") out.push({ type: "note", tone: "info", icon: "shield", t: E2("Pediste revisarla. Sigue visible mientras To'Latino la revisa, hasta 48 h.", "You asked for a review. It stays visible while To'Latino reviews it, up to 48 h.") });
  else if (x.estado === "kept") out.push({ type: "note", tone: "info", icon: "shield", t: E2("To'Latino la revisó: cumple las reglas y sigue publicada.", "To'Latino reviewed it: it meets the rules and stays posted.") });
  else out.push({ type: "acts", items: [{ l: E2("Pedir revisión a To'Latino", "Ask To'Latino to review"), icon: "warning", off: c.pending, onClick: () => c.run(() => resenaRevision(d.id, x.id), E2("La reseña sigue visible; To'Latino la revisa en 48 h.", "The review stays visible; To'Latino reviews it in 48 h.")) }] });
  return { blocks: out, ed: null };
}

/* Hoy · «Reseñas sin responder» (solo Pro: Free no responde). */
export function hoyResenas(c: Ctx): Bloque[] {
  const { E2, d } = c, L = c.res?.hoy ?? [];
  if (!d.pro || !L.length) return [];
  return [{ type: "rows", k: E2("RESEÑAS SIN RESPONDER", "UNANSWERED REVIEWS"), link: E2("Ver Reseñas", "See Reviews"), onLink: () => c.go("pag", "resenas"),
    items: L.map((x) => ({ ...fila(c, x, true), onClick: () => c.nav(`/panel/${d.id}/pagina/resenas?det=rev:${x.id}`) })) }];
}
