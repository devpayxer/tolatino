"use client";
/* Novedades en el panel (Panel v2 · sub 'nov', det 'nov:{id}', editor 'nov:new' / 'nov:edit:{id}'). Las publicaciones y
   sus cifras llegan del servidor; el estado (en vivo, programada, terminada, oculta) se deriva de sus fechas. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { NovPanel, NovPanelDet, Tipo } from "@/lib/novedades";
import { subirFoto } from "@/lib/subir-foto";
import { novGuardar, novModulo, novPaso, novResponder } from "./acciones-novedades";
import type { Ctx, Editor } from "./Panel";

export type NovData = { lista?: NovPanel; det?: NovPanelDet | null; items?: { id: string; name: string; cents: number; ph: string | null; sell: boolean }[]; eventos?: { id: string; t: { es: string; en: string }; dia: string; vivo: boolean }[] };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const NOVT = (c: Ctx): [Tipo, string, string][] => [
  ["oferta", c.E2("Oferta", "Deal"), "dollar"], ["hoy", c.E2("Hoy hay", "Today"), "hot"], ["aviso", c.E2("Aviso de horario", "Hours notice"), "clock"],
  ["encuesta", c.E2("Encuesta", "Poll"), "help"], ["novedad", c.E2("Novedad", "News"), "news"],
];
const verPro = (c: Ctx) => c.go("pay", "plan");
const horaL = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

/* «Cuándo»: ahora · quedan N h / programada para … / terminada. */
function cuando(c: Ctx, n: { st: string; publish: string; ends: string | null; tz: string; hoy?: number | null; hoyOff?: string | null }) {
  const { E2, es } = c, f = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: n.tz }).format(new Date(iso)).replace(/\./g, "");
  if (n.st === "prog") return E2(`Programada · ${f(n.publish)}`, `Scheduled · ${f(n.publish)}`);
  if (n.st === "done") return E2("Terminada", "Ended");
  if (n.st === "adm") return E2("Oculta por To’Latino", "Hidden by To’Latino");
  // 5e · lo que está en Hoy en el barrio lo dice (dash2-nov whenOf); lo que To'Latino retiró de Hoy, también.
  if (n.hoy) return E2(`En Hoy en el barrio · quedan ${n.hoy} h`, `In Today nearby · ${n.hoy} h left`);
  if (n.hoyOff) return E2("En vivo en tu página · To’Latino la retiró de Hoy en el barrio", "Live on your page · To’Latino took it out of Today nearby");
  if (!n.ends) return E2("En vivo · sin fecha de fin", "Live · no end date");
  const h = Math.max(1, Math.ceil((new Date(n.ends).getTime() - Date.now()) / 3_600_000));
  return E2(`En vivo · quedan ${h} h`, `Live · ${h} h left`);
}

export function novBloques(c: Ctx): Sec {
  const { E2, d } = c, N = c.nov?.lista, out: (Bloque | null)[] = [];
  if (!d.pro) {
    out.push({ type: "lock", t: E2("Publica ofertas y avisos", "Post deals and notices"), s: E2("Salen en tu página: ofertas que se piden desde la novedad, «Hoy hay», avisos de horario y encuestas.", "They show on your page: deals ordered from the update, “Today”, hours notices and polls."), cta: E2("Ver Pro", "See Pro"), onCta: () => verPro(c) });
    return { blocks: out, ed: null };
  }
  if (!N) return { blocks: out, ed: null };
  if (N.pausa) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Novedades: no salen en tu página. Motivo: ${N.pausa}`, `To’Latino paused your Updates: they do not show on your page. Reason: ${N.pausa}`) });
  else if (!N.on && N.filas.length) out.push({ type: "note", tone: "info", icon: "news", t: E2("Novedades está apagado: tus publicaciones no salen en tu página. Se quedan guardadas.", "Updates is off: your posts do not show on your page. They stay saved."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => novModulo(d.id, true), E2("Novedades encendido.", "Updates turned on.")) });
  const nA = N.filas.filter((n) => n.st === "adm").length;
  if (nA) out.push({ type: "note", tone: "danger", icon: "ban", t: nA === 1 ? E2("1 publicación la ocultó To’Latino: no sale en tu página.", "To’Latino hid 1 post: it is not on your page.") : E2(`${nA} publicaciones las ocultó To’Latino: no salen en tu página.`, `To’Latino hid ${nA} posts: they are not on your page.`) });
  if (!N.filas.length) out.push({ type: "empty", icon: "news", t: E2("Aún no publicas novedades", "No updates yet"), s: E2("Una oferta de hoy sale en tu página y la pueden pedir desde ahí.", "A deal today shows on your page and can be ordered from there."), cta: E2("Publicar la primera", "Post the first one"), onCta: () => c.det("nov:new") });
  const TT = NOVT(c);
  for (const n of N.filas) {
    const T = TT.find((t) => t[0] === n.kind) ?? TT[4]!;
    const acts: Fila["acts"] = [];
    if (n.st === "live") acts.push({ l: E2("Editar", "Edit"), icon: "edit", onClick: () => c.det(`nov:edit:${n.id}`) },
      { l: n.pinned ? E2("Desfijar", "Unpin") : E2("Fijar arriba", "Pin to top"), icon: "pin", onClick: () => c.run(() => novPaso(d.id, n.id, n.pinned ? "desfijar" : "fijar"), n.pinned ? E2("Ya no está fijada.", "Unpinned.") : E2("Fijada arriba en tu página.", "Pinned to the top of your page.")) },
      { l: E2("Detener", "Stop"), icon: "ban", onClick: () => c.run(() => novPaso(d.id, n.id, "detener"), E2("Detenida. Ya no sale en tu página.", "Stopped. No longer on your page.")) });
    if (n.st === "prog") acts.push({ l: E2("Publicar ya", "Post now"), icon: "bolt", onClick: () => c.run(() => novPaso(d.id, n.id, "ya"), E2("Publicada. Ya sale en tu página.", "Posted. It is on your page now.")) },
      { l: E2("Reprogramar", "Reschedule"), icon: "calendar", onClick: () => c.det(`nov:edit:${n.id}`) });
    if (n.st === "done") acts.push({ l: E2("Publicar de nuevo · 24 h", "Post again · 24 h"), icon: "bolt", onClick: () => c.run(() => novPaso(d.id, n.id, "otravez"), E2("Publicada otra vez · 24 h.", "Posted again · 24 h.")) },
      { l: E2("Duplicar", "Duplicate"), icon: "plus", onClick: () => c.det(`nov:dup:${n.id}`) });
    acts.push(c.ui.nDel === n.id
      ? { l: E2("Sí, quitar", "Yes, remove"), v: "danger", icon: "trash", onClick: () => { c.setUi({ nDel: null }); c.run(() => novPaso(d.id, n.id, "quitar"), E2("Quitada de tu página.", "Removed from your page.")); } }
      : { l: E2("Quitar", "Remove"), icon: "trash", onClick: () => c.setUi({ nDel: n.id }) });
    out.push({ type: "rows", items: [{
      icon: T[2], t: n.title, s: `${T[1]} · ${cuando(c, n)}`,
      m: n.st === "prog" ? undefined : `${n.views}${E2(" VISTAS · ", " VIEWS · ")}${n.saves}${E2(" GUARDADOS", " SAVED")}${n.cm ? ` · ${n.cm}${n.cm === 1 ? E2(" COMENTARIO", " COMMENT") : E2(" COMENTARIOS", " COMMENTS")}` : ""}`,
      tag: n.st === "adm" ? E2("OCULTA POR TO’LATINO", "HIDDEN BY TO’LATINO") : n.pinned && n.st === "live" ? E2("FIJADA", "PINNED") : n.st === "live" ? E2("EN VIVO", "LIVE") : n.st === "prog" ? E2("PROGRAMADA", "SCHEDULED") : E2("TERMINADA", "ENDED"),
      tone: n.st === "adm" ? "danger" : n.pinned && n.st === "live" ? "ink" : n.st === "live" ? "signal" : n.st === "prog" ? "action" : "neutral",
      dim: n.st === "adm", acts, onClick: () => c.det(`nov:${n.id}`),
    }] });
  }
  if (N.filas.length) out.push({ type: "note", tone: "info", icon: "news", t: E2(`Cada novedad sale en tu página.${N.seguidores ? ` Te siguen ${N.seguidores} ${N.seguidores === 1 ? "vecino" : "vecinos"}: ven también las de «solo seguidores».` : ""}`, `Each update shows on your page.${N.seguidores ? ` ${N.seguidores} ${N.seguidores === 1 ? "neighbor follows" : "neighbors follow"} you: they also see follower-only ones.` : ""}`) });
  return { blocks: out, ed: null };
}

export function novDetalle(c: Ctx): Sec {
  const { E2, d } = c, id = (c.ruta.det ?? "").slice(4);
  if (id === "new" || id.startsWith("edit:") || id.startsWith("dup:")) return editor(c, id);
  const n = c.nov?.det;
  if (!n) return { blocks: [{ type: "head", t: E2("Publicación no encontrada", "Post not found"), onBack: c.closeDet }, { type: "empty", icon: "news", t: E2("Esa publicación ya no está", "That post is gone"), s: "" }], ed: null };
  const T = NOVT(c).find((t) => t[0] === n.kind) ?? NOVT(c)[4]!, out: (Bloque | null)[] = [];
  out.push({ type: "head", eye: `${T[1]} · ${n.st === "live" ? E2("EN VIVO", "LIVE") : n.st === "prog" ? E2("PROGRAMADA", "SCHEDULED") : n.st === "adm" ? E2("OCULTA", "HIDDEN") : E2("TERMINADA", "ENDED")}`.toUpperCase(), t: n.title, s: cuando(c, n), onBack: c.closeDet });
  if (n.st === "adm") out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó esta publicación: no sale en tu página. Motivo: ${n.hidden ?? "—"}`, `To’Latino hid this post: it does not show on your page. Reason: ${n.hidden ?? "—"}`) });
  if (n.hoyOff && n.st !== "adm") out.push({ type: "note", tone: "warn", icon: "news", t: E2(`To’Latino la retiró de Hoy en el barrio; sigue en tu página. Motivo: ${n.hoyOff}`, `To’Latino took it out of Today nearby; it stays on your page. Reason: ${n.hoyOff}`) });
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("VISTAS", "VIEWS"), v: String(n.views) }, { k: E2("GUARDADOS", "SAVED"), v: String(n.saves) }, { k: E2("COMENTARIOS", "COMMENTS"), v: String(n.cm) }] });
  if (n.cms.length) {
    const kR = c.ui.nRpK as string | undefined, tR = (c.ui.nRpT as string | undefined) ?? "";
    out.push({ type: "rows", k: `${E2("COMENTARIOS DE VECINOS · ", "NEIGHBOR COMMENTS · ")}${n.cms.length}`, items: n.cms.map((m) => ({
      imgIni: m.name.slice(0, 1), imgW: "36px", t: `${m.name} · ${m.body}`, s: m.reply ? `${E2("Tu respuesta: ", "Your reply: ")}${m.reply}` : E2("Sin respuesta", "No reply yet"),
      m: `${m.h < 24 ? E2(`HACE ${m.h} H`, `${m.h} H AGO`) : E2(`HACE ${Math.floor(m.h / 24)} DÍAS`, `${Math.floor(m.h / 24)} DAYS AGO`)} · +${m.up}`, chev: false,
      acts: [{ l: m.reply ? E2("Cambiar respuesta", "Edit reply") : E2("Responder", "Reply"), icon: "chat", onClick: () => c.setUi({ nRpK: m.id, nRpT: m.reply ?? "" }) }],
    })) });
    const m = n.cms.find((x) => x.id === kR);
    if (m) out.push(
      { type: "field", area: true, rows: 3, max: 280, k: `${E2("TU RESPUESTA A ", "YOUR REPLY TO ")}${m.name.toUpperCase()}${E2(" · SALE DEBAJO DE SU COMENTARIO", " · SHOWN UNDER THEIR COMMENT")}`, val: tR, count: `${tR.length}/280`,
        ph: E2("Ej. Sí, el precio es el mismo en delivery.", "e.g. Yes, same price for delivery."), onChange: (v) => c.setUi({ nRpT: v.slice(0, 280) }) },
      { type: "acts", items: [{ l: E2("Publicar respuesta", "Post reply"), v: "primary", icon: "check", off: !tR.trim() || c.pending, onClick: () => c.run(() => novResponder(d.id, m.id, tR), E2("Respuesta publicada. Sale como «Respuesta del negocio».", "Reply posted. Shows as “Business reply”."), () => c.setUi({ nRpK: null, nRpT: "" })) },
        { l: E2("Cancelar", "Cancel"), v: "ghost", onClick: () => c.setUi({ nRpK: null, nRpT: "" }) }] });
  }
  out.push({ type: "nprev", k: E2("ASÍ SE VE", "HOW IT LOOKS"), name: d.name, logo: d.logo ?? undefined, tags: [{ label: T[1].toUpperCase(), tone: n.kind === "oferta" ? "ink" : n.kind === "hoy" ? "signal" : n.kind === "aviso" ? "danger" : n.kind === "encuesta" ? "action" : "neutral" }],
    body: n.body ? `${n.title}. ${n.body}` : n.title, photos: n.fotos.map((f) => f.url), foot: n.kind === "oferta" && n.item && n.now ? `${n.item.name.es} · ${money(n.now)} (${E2("antes", "was")} ${money(n.was ?? n.item.cents)})` : undefined });
  if (n.st === "live" || n.st === "prog") out.push({ type: "rows", items: [{ icon: "pin", t: E2("Fijada arriba en tu página", "Pinned at the top of your page"), s: E2("Solo una a la vez.", "Only one at a time."), tgOn: n.pinned, onTg: () => c.run(() => novPaso(d.id, n.id, n.pinned ? "desfijar" : "fijar")) }] });
  out.push({ type: "acts", items: [
    ...(n.st !== "adm" ? [{ l: E2("Editar", "Edit"), icon: "edit", onClick: () => c.det(`nov:edit:${n.id}`) }] : []),
    ...(n.st === "live" || n.st === "prog" ? [{ l: n.st === "live" ? E2("Terminar ahora", "End now") : E2("Cancelar programación", "Cancel schedule"), onClick: () => c.run(() => novPaso(d.id, n.id, "detener"), E2("Terminada. Ya no sale en tu página.", "Ended. No longer on your page.")) }] : []),
    { l: E2("Quitar", "Remove"), icon: "trash", onClick: () => c.run(() => novPaso(d.id, n.id, "quitar"), E2("Quitada de tu página.", "Removed from your page."), () => c.closeDet()) },
  ] });
  return { blocks: out, ed: null };
}

/* Editor (nov:new · nov:edit:{id} · nov:dup:{id}). */
type FN = {
  kind: Tipo; title: string; body: string; fotos: { id: string; url: string }[]; link: string; item: string | null; url: string; was: string; now: string;
  day: string; hrs: string; hrsT: string; o1: string; o2: string; o3: string; o4: string; audience: "all" | "fol"; ends: string; when: "now" | "once"; sD: number; sM: number; evento: string | null;
};
function editor(c: Ctx, id: string): Sec {
  const { E2, d } = c, ed = id.startsWith("edit:") ? c.nov?.det : id.startsWith("dup:") ? c.nov?.det : null, edita = id.startsWith("edit:") && !!ed;
  const items = c.nov?.items ?? [], evts = c.nov?.eventos ?? [];
  const b0: FN = {
    kind: ed?.kind ?? "oferta", title: ed?.title ?? "", body: ed?.body ?? "", fotos: ed && edita ? ed.fotos : [], link: ed?.link_kind ?? (items.length ? "item" : "none"), item: ed?.item_id ?? null,
    url: ed?.url ?? "", was: ed?.was ? String(ed.was / 100) : "", now: ed?.now ? String(ed.now / 100) : "", day: ed?.aviso?.day ?? "", hrs: ed?.aviso?.hrs ?? "closed", hrsT: ed?.aviso?.hrsT ?? "",
    o1: ed?.poll?.[0] ?? "", o2: ed?.poll?.[1] ?? "", o3: ed?.poll?.[2] ?? "", o4: ed?.poll?.[3] ?? "", audience: ed?.audience ?? "all", ends: "24h",
    when: edita && ed?.st === "prog" ? "once" : "now", sD: 1, sM: 660, evento: ed?.event_id ?? null,
  };
  const F = c.form<FN>(`det:nov:${id}`, b0), x = F.d, ty = x.kind, out: (Bloque | null)[] = [], TT = NOVT(c), T = TT.find((t) => t[0] === ty) ?? TT[0]!;
  const TD: Record<Tipo, string> = { oferta: E2("Un precio especial en algo que vendes. Lo piden desde la novedad, y se cobra ese precio.", "A special price on something you sell. They order it from the update, at that price."), hoy: E2("Lo que hay hoy: el plato del día, algo que acaba de llegar.", "What you have today: the daily special, something that just arrived."), aviso: E2("Cierres, feriados o cambios de horario.", "Closures, holidays or hours changes."), encuesta: E2("Una pregunta corta. Votan en tu página.", "A short question. They vote on your page."), novedad: E2("Cualquier otra cosa que quieras contar.", "Anything else you want to share.") };
  const PH: Record<Tipo, string> = { oferta: E2("Ej. Pernil + arroz $10 hasta las 3", "e.g. Pernil + rice $10 until 3"), hoy: E2("Ej. Hoy hay sancocho", "e.g. Sancocho today"), aviso: E2("Ej. Cerramos el jueves", "e.g. Closed Thursday"), encuesta: E2("Ej. ¿Qué sopa quieren el domingo?", "e.g. Which soup on Sunday?"), novedad: E2("Ej. Estrenamos terraza", "e.g. Our new patio is open") };
  out.push({ type: "head", eye: E2("NOVEDAD", "UPDATE"), t: edita ? E2("Editar novedad", "Edit update") : E2("Publicar novedad", "Post an update"), s: E2("Sale en tu página.", "Shows on your page."), onBack: c.closeDet });
  out.push({ type: "chips", k: E2("QUÉ PUBLICAS", "WHAT YOU POST"), items: TT.map(([k, l]) => ({ l, v: ty === k ? "selected" : "filter", onClick: () => F.set({ kind: k, link: k === "oferta" ? "item" : k === ty ? x.link : "none" }) })) },
    { type: "note", tone: "info", icon: T[2], t: TD[ty] });
  // Fotos (hasta 4; la primera es la portada).
  const sel = (c.ui.nSel as number | undefined) ?? -1;
  out.push({ type: "group", k: E2("FOTOS", "PHOTOS") }, { type: "photos", k: E2("HASTA 4 · LA PRIMERA ES LA PORTADA", "UP TO 4 · THE FIRST IS THE COVER"), count: `${x.fotos.length}/4`, cols: 4,
    items: x.fotos.map((f, i) => ({ bg: `url("${f.url}")`, on: sel === i, tag: i === 0 ? E2("PORTADA", "COVER") : "", onClick: () => c.setUi({ nSel: sel === i ? -1 : i }), key: f.id })),
    addL: E2("Subir fotos", "Upload photos"), onAdd: x.fotos.length < 4 ? () => c.pickFiles(true, async (files) => {
      const nuevas: { id: string; url: string }[] = [];
      for (const f of files.slice(0, 4 - x.fotos.length)) { const r = await subirFoto(f).catch(() => null); if (r?.ok && r.id && r.url) nuevas.push({ id: r.id, url: r.url }); else { c.toast(r?.mensaje ? (c.es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo.")); break; } }
      if (nuevas.length) F.set({ fotos: [...x.fotos, ...nuevas].slice(0, 4) });
    }) : undefined,
    selActs: sel >= 0 && sel < x.fotos.length ? [
      ...(sel > 0 ? [{ l: E2("Hacer portada", "Make cover"), icon: "star", v: "secondary", onClick: () => { const a = x.fotos.slice(), [f] = a.splice(sel, 1); F.set({ fotos: [f!, ...a] }); c.setUi({ nSel: 0 }); } }] : []),
      { l: E2("Quitar", "Remove"), icon: "trash", v: "secondary", onClick: () => { F.set({ fotos: x.fotos.filter((_, j) => j !== sel) }); c.setUi({ nSel: -1 }); } },
    ] : [] });
  out.push({ type: "group", k: E2("QUÉ DICES", "WHAT YOU SAY") },
    { type: "field", k: E2("TÍTULO", "TITLE"), val: x.title, max: 60, count: `${x.title.length}/60`, ph: PH[ty], onChange: (v) => F.set({ title: v.slice(0, 60) }) },
    { type: "field", k: E2("TEXTO · OPCIONAL", "TEXT · OPTIONAL"), val: x.body, area: true, rows: 3, max: 280, count: `${x.body.length}/280`, ph: E2("Lo que el cliente necesita saber, en una o dos frases.", "What the client needs to know, in a sentence or two."), onChange: (v) => F.set({ body: v.slice(0, 280) }) });
  if (ty === "encuesta") {
    out.push({ type: "group", k: E2("OPCIONES · DE 2 A 4", "OPTIONS · 2 TO 4") },
      { type: "field", k: E2("OPCIÓN 1", "OPTION 1"), val: x.o1, max: 40, ph: E2("Ej. Sancocho", "e.g. Sancocho"), onChange: (v) => F.set({ o1: v.slice(0, 40) }) },
      { type: "field", k: E2("OPCIÓN 2", "OPTION 2"), val: x.o2, max: 40, ph: E2("Ej. Mondongo", "e.g. Mondongo"), onChange: (v) => F.set({ o2: v.slice(0, 40) }) });
    if (x.o2.trim()) out.push({ type: "field", k: E2("OPCIÓN 3 · OPCIONAL", "OPTION 3 · OPTIONAL"), val: x.o3, max: 40, onChange: (v) => F.set({ o3: v.slice(0, 40) }) });
    if (x.o3.trim()) out.push({ type: "field", k: E2("OPCIÓN 4 · OPCIONAL", "OPTION 4 · OPTIONAL"), val: x.o4, max: 40, onChange: (v) => F.set({ o4: v.slice(0, 40) }) });
  }
  if (ty === "aviso") {
    const HRS: [string, string][] = [["closed", E2("Cerrado todo el día", "Closed all day")], ["late", E2("Abrimos más tarde", "Opening later")], ["early", E2("Cerramos más temprano", "Closing early")], ["ext", E2("Horario extendido", "Extended hours")]];
    out.push({ type: "group", k: E2("EL CAMBIO", "THE CHANGE") },
      { type: "field", k: E2("QUÉ DÍA", "WHICH DAY"), val: x.day, max: 30, ph: E2("Ej. Jue 26 nov", "e.g. Thu Nov 26"), onChange: (v) => F.set({ day: v.slice(0, 30) }) },
      { type: "chips", k: E2("QUÉ PASA", "WHAT HAPPENS"), items: HRS.map(([k, l]) => ({ l, v: x.hrs === k ? "selected" : "filter", onClick: () => F.set({ hrs: k }) })) });
    if (x.hrs !== "closed") out.push({ type: "field", k: E2("HORARIO DE ESE DÍA", "HOURS THAT DAY"), val: x.hrsT, max: 30, ph: "12 PM – 6 PM", onChange: (v) => F.set({ hrsT: v.slice(0, 30) }) });
    out.push({ type: "note", tone: "warn", icon: "clock", t: E2("El aviso no cambia tu horario. Para que ese día salga cerrado, márcalo en Horario · Feriados.", "The notice does not change your hours. To show that day as closed, set it in Hours · Holidays."), cta: E2("Ir a Horario", "Go to Hours"), onCta: () => c.go("pag", "hor") });
  }
  const lkOn = ty === "oferta" || ty === "hoy" || ty === "novedad", lk = ty === "oferta" ? "item" : x.link, it = items.find((i) => i.id === x.item);
  if (lkOn) {
    const LO: [string, string][] = [...(ty !== "oferta" ? [["none", E2("Sin botón", "No button")] as [string, string]] : []), ...(items.length ? [["item", E2("Algo que vendes", "Something you sell")] as [string, string]] : []),
      ...(ty !== "oferta" ? [["menu", E2("Menú", "Menu")], ["tel", E2("Llamar", "Call")], ["web", E2("Enlace web", "Web link")]] as [string, string][] : []),
      ...(ty !== "oferta" && evts.length ? [["event", E2("Evento", "Event")] as [string, string]] : [])];
    out.push({ type: "group", k: ty === "oferta" ? E2("QUÉ ESTÁ EN OFERTA", "WHAT IS ON SALE") : E2("EL BOTÓN · LO QUE TOCA EL CLIENTE", "THE BUTTON · WHAT THE CLIENT TAPS") });
    if (ty !== "oferta") out.push({ type: "chips", items: LO.map(([v, l]) => ({ l, v: lk === v ? "selected" : "filter", onClick: () => F.set({ link: v }) })) });
    if (lk === "item") {
      const q = ((c.ui.nQ as string | undefined) ?? "").trim().toLowerCase(), L = items.filter((i) => !q || i.name.toLowerCase().includes(q)), sh = L.slice(0, c.ui.nAll ? 60 : 6);
      if (items.length > 6) out.push({ type: "field", k: E2("BUSCAR", "SEARCH"), val: (c.ui.nQ as string | undefined) ?? "", ph: E2("Busca en tus platos", "Search your dishes"), onChange: (v) => c.setUi({ nQ: v, nAll: false }) });
      out.push(sh.length ? { type: "rows", k: `${L.length} ${E2("PLATOS", "DISHES")}`, link: L.length > sh.length ? E2(`Ver los ${L.length}`, `See all ${L.length}`) : undefined, onLink: () => c.setUi({ nAll: true }),
        items: sh.map((i) => ({ img: i.ph ? `url("${i.ph}")` : "", imgIni: i.ph ? "" : i.name.slice(0, 1), imgW: "44px", t: i.name, s: `${money(i.cents)}${i.sell ? "" : E2(" · solo en el local", " · in store only")}`, compact: true, chev: false, onClick: () => F.set({ item: i.id }), sel: { on: x.item === i.id, onClick: () => F.set({ item: i.id }) } })) }
        : { type: "empty", icon: "search", t: E2(`Nada con «${q}»`, `Nothing for “${q}”`), s: E2("Prueba con otra palabra.", "Try another word.") });
      if (it && !it.sell) out.push({ type: "note", tone: "warn", t: E2("Este no se pide en línea. El botón abre tu menú.", "This one is not ordered online. The button opens your menu.") });
      if (!it) out.push({ type: "note", tone: "warn", t: ty === "oferta" ? E2("Elige qué está en oferta.", "Pick what is on sale.") : E2("Elige el plato del botón.", "Pick the dish for the button.") });
    }
    if (lk === "web") out.push({ type: "field", k: E2("ENLACE", "LINK"), val: x.url, max: 200, ph: "https://", help: E2("Solo https.", "https only."), onChange: (v) => F.set({ url: v.trim().slice(0, 200) }) });
    if (lk === "tel") out.push({ type: "note", tone: "info", icon: "phone", t: E2("El botón llama al teléfono de tu página.", "The button calls the phone on your page.") });
    // 6b · «Ver evento»: la novedad lleva a la ficha de uno de tus eventos y sale en Hoy en el barrio solo mientras el evento esté publicado.
    if (lk === "event") {
      const ev = evts.find((e) => e.id === x.evento);
      out.push({ type: "rows", k: E2("TUS EVENTOS", "YOUR EVENTS"), items: evts.map((e) => ({ icon: "ticket", t: c.es ? e.t.es : e.t.en || e.t.es, s: `${e.dia}${e.vivo ? "" : E2(" · aún no publicado", " · not live yet")}`, compact: true, chev: false,
        onClick: () => F.set({ evento: e.id }), sel: { on: x.evento === e.id, onClick: () => F.set({ evento: e.id }) } })) });
      out.push({ type: "note", tone: ev && !ev.vivo ? "warn" : "info", icon: "ticket", t: !ev ? E2("Elige el evento del botón.", "Pick the event for the button.") : ev.vivo ? E2("El botón dice «Ver evento» y abre su ficha. Sale en Hoy en el barrio mientras el evento esté publicado.", "The button says “See event” and opens its page. It shows in Today nearby while the event is live.")
        : E2("Este evento aún no está publicado: la novedad sale cuando lo esté.", "This event is not live yet: the update shows once it is.") });
    }
  }
  const bf = it ? it.cents : 0, nw = Math.round(Number(x.now) * 100);
  if (ty === "oferta") {
    out.push({ type: "group", k: E2("EL PRECIO", "THE PRICE") },
      // El precio normal es el de tu menú (no se escribe): así el «antes» siempre es verdad.
      { type: "field", k: E2("PRECIO NORMAL", "REGULAR PRICE"), val: it ? (it.cents / 100).toFixed(2) : "", pre: "$", lock: true, help: E2("Es el de tu menú. Para cambiarlo, edita el plato.", "It is your menu price. To change it, edit the dish."), onChange: () => undefined },
      { type: "field", k: E2("PRECIO DE LA OFERTA", "DEAL PRICE"), val: x.now, pre: "$", im: "decimal", max: 6, onChange: (v) => F.set({ now: v.replace(/[^\d.]/g, "").slice(0, 6) }) });
    if (nw > 0 && bf > 0) out.push(nw < bf ? { type: "note", tone: "ok", icon: "dollar", t: E2(`Ahorran ${money(bf - nw)} · ${Math.round((1 - nw / bf) * 100)} % menos.`, `They save ${money(bf - nw)} · ${Math.round((1 - nw / bf) * 100)}% off.`) }
      : { type: "note", tone: "danger", t: E2("El precio de la oferta tiene que ser menor que el normal.", "The deal price must be lower than the regular one.") });
  }
  out.push({ type: "group", k: E2("QUIÉN LO VE Y CUÁNDO", "WHO SEES IT AND WHEN") },
    { type: "chips", k: E2("QUIÉN LO VE", "WHO SEES IT"), items: ([["all", E2("Todos", "Everyone")], ["fol", E2("Solo quienes te siguen", "Only your followers")]] as ["all" | "fol", string][]).map(([v, l]) => ({ l, v: x.audience === v ? "selected" : "filter", onClick: () => F.set({ audience: v }) })) },
    { type: "chips", k: E2("VENCE", "ENDS"), items: ([["3pm", E2("Hoy 3 PM", "Today 3 PM")], ["24h", E2("En 24 h", "In 24 h")], ["semana", E2("Esta semana", "This week")], ["no", E2("Sin fecha", "No end")]] as [string, string][]).map(([v, l]) => ({ l, v: x.ends === v ? "selected" : "filter", onClick: () => F.set({ ends: v }) })) });
  const W: ["now" | "once", string, string, string][] = [["now", "bolt", E2("Publicar ahora", "Post now"), E2("Sale en cuanto toques Publicar.", "Goes out as soon as you tap Post.")], ["once", "calendar", E2("Programar para otro día", "Schedule for another day"), E2("Elige el día y la hora.", "Pick the day and time.")]];
  out.push({ type: "group", k: E2("CUÁNDO SE PUBLICA", "WHEN IT GOES OUT") }, { type: "rows", items: W.map(([v, ic, t, s]) => ({ icon: ic, ibg: x.when === v ? "var(--tl-ink)" : "rgba(75,55,245,.08)", ifg: x.when === v ? "var(--tl-white)" : "var(--tl-action)", t, s, compact: true, bd: x.when === v ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.08)", chev: false, onClick: () => F.set({ when: v }), sel: { on: x.when === v, onClick: () => F.set({ when: v }) } })) });
  if (x.when === "once") {
    const dias = Array.from({ length: 7 }, (_, i) => { const t = new Date(Date.now() + i * 86_400_000); return [i, i === 0 ? E2("Hoy", "Today") : i === 1 ? E2("Mañana", "Tomorrow") : new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { weekday: "short", day: "numeric" }).format(t).replace(/\./g, "")] as [number, string]; });
    out.push({ type: "chips", k: E2("QUÉ DÍA", "WHICH DAY"), items: dias.map(([i, l]) => ({ l, v: x.sD === i ? "selected" : "filter", onClick: () => F.set({ sD: i }) })) },
      { type: "step", t: E2("A qué hora", "At what time"), v: horaL(x.sM), onM: () => F.set({ sM: Math.max(0, x.sM - 30) }), onP: () => F.set({ sM: Math.min(1410, x.sM + 30) }) });
  }
  out.push({ type: "nprev", k: E2("ASÍ SE VE", "HOW IT LOOKS"), name: d.name, logo: d.logo ?? undefined, tags: [{ label: T[1].toUpperCase(), tone: ty === "oferta" ? "ink" : ty === "hoy" ? "signal" : ty === "aviso" ? "danger" : ty === "encuesta" ? "action" : "neutral" }],
    body: x.title ? (x.body ? `${x.title}. ${x.body}` : x.title) : E2("Tu título sale aquí.", "Your title shows here."), photos: x.fotos.map((f) => f.url), foot: ty === "oferta" && it && nw > 0 ? `${it.name} · ${money(nw)}` : undefined });
  const poll = [x.o1, x.o2, x.o3, x.o4].map((o) => o.trim()).filter(Boolean);
  const valid = x.title.trim().length >= 3 && (ty !== "oferta" || (!!it && nw > 0 && nw < bf)) && (ty !== "encuesta" || poll.length >= 2) && (ty !== "aviso" || !!x.day.trim()) && (lk !== "item" || ty === "aviso" || ty === "encuesta" || !!x.item) && (lk !== "web" || /^https:\/\//.test(x.url)) && (lk !== "event" || !!x.evento);
  return { blocks: out, ed: {
    F, l: x.when === "once" ? E2("Programar", "Schedule") : edita ? E2("Guardar", "Save") : E2("Publicar", "Post"), valid, always: true,
    apply: (v: FN) => novGuardar(d.id, { id: edita ? ed!.id : null, kind: v.kind, title: v.title, body: v.body, link: v.kind === "oferta" ? "item" : v.kind === "aviso" || v.kind === "encuesta" ? "none" : v.link, item: v.item,
      url: v.url, was: v.was ? Number(v.was) : null, now: v.now ? Number(v.now) : null, aviso: v.kind === "aviso" ? { day: v.day, hrs: v.hrs, hrsT: v.hrsT } : null,
      poll: [v.o1, v.o2, v.o3, v.o4].map((o) => o.trim()).filter(Boolean), audience: v.audience, ends: v.ends, prog: v.when === "once" ? { d: v.sD, m: v.sM } : null, fotos: v.fotos.map((f) => f.id), evento: v.evento }),
    toast: x.when === "once" ? E2("Programada.", "Scheduled.") : E2("Publicada. Ya sale en tu página.", "Posted. It is on your page now."),
    onDone: () => c.go("pag", "nov"),
  } };
}
