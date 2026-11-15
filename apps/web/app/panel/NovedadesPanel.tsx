"use client";
/* Novedades en el panel (Panel v2 · sub 'nov', det 'nov:{id}', editor 'nov:new' / 'nov:edit:{id}'). Las publicaciones y
   sus cifras llegan del servidor; el estado (en vivo, programada, terminada, oculta) se deriva de sus fechas. */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { NovPanel, NovPanelDet, Tipo } from "@/lib/novedades";
import { subirFoto } from "@/lib/subir-foto";
import { novAvisar, novGuardar, novModulo, novPaso, novResponder } from "./acciones-novedades";
import type { Ctx, Editor } from "./Panel";

export type NovData = { lista?: NovPanel; det?: NovPanelDet | null; items?: { id: string; name: string; cents: number; ph: string | null; sell: boolean }[]; eventos?: { id: string; t: { es: string; en: string }; dia: string; vivo: boolean }[]; vacantes?: { id: string; t: { es: string; en: string } }[] };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const NOVT = (c: Ctx): [Tipo, string, string][] => [
  ["oferta", c.E2("Oferta", "Deal"), "dollar"], ["hoy", c.E2("Hoy hay", "Today"), "hot"], ["aviso", c.E2("Aviso de horario", "Hours notice"), "clock"],
  ["encuesta", c.E2("Encuesta", "Poll"), "help"], ["novedad", c.E2("Novedad", "News"), "news"], ["cupon", c.E2("Cupón para seguidores", "Follower coupon"), "dollar"],
];
const horaL = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

/* «Cuándo»: ahora · quedan N h / programada para … / terminada. */
function cuando(c: Ctx, n: { st: string; publish: string; ends: string | null; tz: string; hoy?: number | null; hoyOff?: string | null; rep?: { dias: number[]; m: number } | null }) {
  const { E2, es } = c, f = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: n.tz }).format(new Date(iso)).replace(/\./g, "");
  // 9n-11 · La que se repite dice sus días y la hora, y la próxima vez (o que está en vivo ahora).
  if (n.rep && (n.st === "prog" || n.st === "live")) {
    const LET = es ? ["D", "L", "M", "X", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"], ORD = [1, 2, 3, 4, 5, 6, 0];
    const dias = n.rep.dias.length === 7 ? E2("todos los días", "every day") : [...n.rep.dias].sort((a, b) => ORD.indexOf(a) - ORD.indexOf(b)).map((d) => LET[d]).join(" · ");
    return `${E2("Se repite", "Repeats")} · ${dias} · ${horaL(n.rep.m)}${n.st === "prog" ? ` · ${E2("próxima", "next")} ${f(n.publish)}` : ` · ${E2("en vivo ahora", "live now")}`}`;
  }
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
    out.push({ type: "lock", t: E2("Publica ofertas y avisos", "Post deals and notices"), s: E2("Salen en tu página: ofertas que se piden desde la novedad, «Hoy hay», avisos de horario y encuestas.", "They show on your page: deals ordered from the update, “Today”, hours notices and polls."), ...ctaPro(c, E2("Ver Pro", "See Pro")) });
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
  // 9n-2 · PEDIDOS que salieron de esta oferta (L310): los pedidos con ese plato al precio de la oferta mientras estuvo en vivo.
  if (n.pedidos) out.push({ type: "kv", items: [{ k: E2("PEDIDOS DESDE LA OFERTA", "ORDERS FROM THE DEAL"), v: String(n.pedidos.n) }, { k: E2("UNIDADES", "UNITS"), v: String(n.pedidos.uds) }, { k: E2("VENDIDO", "SOLD"), v: money(n.pedidos.cents) }] });
  if (n.st === "live" && !n.avisada) out.push({ type: "acts", items: [{ l: E2("Avisar a tus seguidores", "Tell your followers"), icon: "bell", v: "secondary", off: c.pending, onClick: () => c.run(() => novAvisar(d.id, n.id), (r: { avisados?: number }) => E2(`Listo: les avisamos a ${r.avisados ?? 0} seguidores.`, `Done: we told ${r.avisados ?? 0} followers.`)) }] });
  else if (n.avisada) out.push({ type: "note", tone: "ok", icon: "bell", t: E2("Ya les avisaste a tus seguidores de esta novedad.", "You already told your followers about this update.") });
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
  day: string; hrs: string; hrsT: string; o1: string; o2: string; o3: string; o4: string; audience: "all" | "fol"; ends: string; when: "now" | "once" | "rep"; sD: number; sM: number; evento: string | null; job: string | null; avisar: boolean;
  rDias: number[]; rDur: string; rHasta: string;
  cCode: string; cOff: string; cMin: string; cUses: string; // 9n-21 · cupón para seguidores
};
function editor(c: Ctx, id: string): Sec {
  const { E2, d } = c, ed = id.startsWith("edit:") ? c.nov?.det : id.startsWith("dup:") ? c.nov?.det : null, edita = id.startsWith("edit:") && !!ed;
  const items = c.nov?.items ?? [], evts = c.nov?.eventos ?? [], vacs = c.nov?.vacantes ?? [];
  const b0: FN = {
    kind: ed?.kind ?? "oferta", title: ed?.title ?? "", body: ed?.body ?? "", fotos: ed && edita ? ed.fotos : [], link: ed?.link_kind ?? (items.length ? "item" : "none"), item: ed?.item_id ?? null,
    url: ed?.url ?? "", was: ed?.was ? String(ed.was / 100) : "", now: ed?.now ? String(ed.now / 100) : "", day: ed?.aviso?.day ?? "", hrs: ed?.aviso?.hrs ?? "closed", hrsT: ed?.aviso?.hrsT ?? "",
    o1: ed?.poll?.[0] ?? "", o2: ed?.poll?.[1] ?? "", o3: ed?.poll?.[2] ?? "", o4: ed?.poll?.[3] ?? "", audience: ed?.audience ?? "all", ends: "24h",
    when: edita && ed?.rep ? "rep" : edita && ed?.st === "prog" ? "once" : "now", sD: 1, sM: ed?.rep?.m ?? 660, evento: ed?.event_id ?? null, job: ed?.job_id ?? null, avisar: false,
    rDias: ed?.rep?.dias ?? [], rDur: ed?.rep?.dur ?? "close", rHasta: "no",
    cCode: ed?.coupon_code ?? "", cOff: ed?.coupon_off_cents ? String(ed.coupon_off_cents / 100) : "", cMin: ed?.coupon_min_cents ? String(ed.coupon_min_cents / 100) : "", cUses: ed?.coupon_uses ? String(ed.coupon_uses) : "",
  };
  const F = c.form<FN>(`det:nov:${id}`, b0), x = F.d, ty = x.kind, out: (Bloque | null)[] = [], TT = NOVT(c), T = TT.find((t) => t[0] === ty) ?? TT[0]!;
  const TD: Record<Tipo, string> = { oferta: E2("Un precio especial en algo que vendes. Lo piden desde la novedad, y se cobra ese precio.", "A special price on something you sell. They order it from the update, at that price."), hoy: E2("Lo que hay hoy: el plato del día, algo que acaba de llegar.", "What you have today: the daily special, something that just arrived."), aviso: E2("Cierres, feriados o cambios de horario.", "Closures, holidays or hours changes."), encuesta: E2("Una pregunta corta. Votan en tu página.", "A short question. They vote on your page."), novedad: E2("Cualquier otra cosa que quieras contar.", "Anything else you want to share."), cupon: E2("Un descuento solo para quienes te siguen: ven el código y lo usan una vez en un pedido en línea. El descuento lo pones tú.", "A discount only for your followers: they see the code and use it once on an online order. You give the discount.") };
  const PH: Record<Tipo, string> = { oferta: E2("Ej. Pernil + arroz $10 hasta las 3", "e.g. Pernil + rice $10 until 3"), hoy: E2("Ej. Hoy hay sancocho", "e.g. Sancocho today"), aviso: E2("Ej. Cerramos el jueves", "e.g. Closed Thursday"), encuesta: E2("Ej. ¿Qué sopa quieren el domingo?", "e.g. Which soup on Sunday?"), novedad: E2("Ej. Estrenamos terraza", "e.g. Our new patio is open"), cupon: E2("Ej. $3 menos en pedidos de $15 o más", "e.g. $3 off orders of $15 or more") };
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
    // 9n-2 · Elegir fotos de TU GALERÍA (L301): se copian a la novedad; la galería de tu página no cambia.
    selActs: sel >= 0 && sel < x.fotos.length ? [
      ...(sel > 0 ? [{ l: E2("Hacer portada", "Make cover"), icon: "star", v: "secondary", onClick: () => { const a = x.fotos.slice(), [f] = a.splice(sel, 1); F.set({ fotos: [f!, ...a] }); c.setUi({ nSel: 0 }); } }] : []),
      { l: E2("Quitar", "Remove"), icon: "trash", v: "secondary", onClick: () => { F.set({ fotos: x.fotos.filter((_, j) => j !== sel) }); c.setUi({ nSel: -1 }); } },
    ] : [] });
  const galeria = d.fotos.filter((f) => !x.fotos.some((y) => y.id === f.id));
  if (x.fotos.length < 4 && galeria.length) out.push({ type: "photos", k: E2("O ELIGE DE TU GALERÍA", "OR PICK FROM YOUR GALLERY"), count: `${galeria.length}`, cols: 4,
    items: galeria.slice(0, 12).map((f) => ({ bg: `url("${f.url}")`, key: f.id, onClick: () => F.set({ fotos: [...x.fotos, { id: f.id, url: f.url }].slice(0, 4) }) })) });
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
      ...(ty !== "oferta" ? [["menu", E2("Menú", "Menu")], ["tel", E2("Llamar", "Call")], ["msg", E2("Escribir", "Message")], ["web", E2("Enlace web", "Web link")]] as [string, string][] : []),
      ...(ty !== "oferta" && evts.length ? [["event", E2("Evento", "Event")] as [string, string]] : []),
      ...(ty !== "oferta" && vacs.length ? [["job", E2("Vacante", "Opening")] as [string, string]] : [])];
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
    // 9n-2 · «Ver vacante»: la novedad lleva a una de tus vacantes abiertas y solo sale mientras esté abierta.
    if (lk === "job") {
      const vj = vacs.find((e) => e.id === x.job);
      out.push({ type: "rows", k: E2("TUS VACANTES ABIERTAS", "YOUR OPEN POSITIONS"), items: vacs.map((e) => ({ icon: "brief", t: c.es ? e.t.es : e.t.en || e.t.es, compact: true, chev: false,
        onClick: () => F.set({ job: e.id }), sel: { on: x.job === e.id, onClick: () => F.set({ job: e.id }) } })) });
      out.push({ type: "note", tone: "info", icon: "brief", t: !vj ? E2("Elige la vacante del botón.", "Pick the opening for the button.") : E2("El botón dice «Ver vacante» y abre su página. La novedad deja de salir cuando la vacante se cierra.", "The button says “See opening” and opens its page. The update stops showing when the opening closes.") });
    }
    if (lk === "event") {
      const ev = evts.find((e) => e.id === x.evento);
      out.push({ type: "rows", k: E2("TUS EVENTOS", "YOUR EVENTS"), items: evts.map((e) => ({ icon: "ticket", t: c.es ? e.t.es : e.t.en || e.t.es, s: `${e.dia}${e.vivo ? "" : E2(" · aún no publicado", " · not live yet")}`, compact: true, chev: false,
        onClick: () => F.set({ evento: e.id }), sel: { on: x.evento === e.id, onClick: () => F.set({ evento: e.id }) } })) });
      out.push({ type: "note", tone: ev && !ev.vivo ? "warn" : "info", icon: "ticket", t: !ev ? E2("Elige el evento del botón.", "Pick the event for the button.") : ev.vivo ? E2("El botón dice «Ver evento» y abre su ficha. Sale en Hoy en el barrio mientras el evento esté publicado.", "The button says “See event” and opens its page. It shows in Today nearby while the event is live.")
        : E2("Este evento aún no está publicado: la novedad sale cuando lo esté.", "This event is not live yet: the update shows once it is.") });
    }
  }
  const bf = it ? it.cents : 0, nw = Math.round(Number(x.now) * 100);
  // 9n-21 · Cupón para seguidores (diseño Novedades: código visible solo si sigues; demo SABOR3 −$3 desde $15). Lo revisa el servidor al guardar y al pedir.
  const cOff = Math.round(Number(x.cOff) * 100), cMin = Math.round(Number(x.cMin) * 100), cUses = Math.floor(Number(x.cUses));
  const cupOk = /^[A-Z0-9]{4,12}$/.test(x.cCode) && cOff >= 100 && cOff <= 5000 && cMin >= cOff + 100 && cMin <= 20000 && cUses >= 1 && cUses <= 500 && x.ends !== "no";
  if (ty === "cupon") {
    const usados = edita ? ed?.coupon_usados ?? 0 : 0;
    out.push({ type: "group", k: E2("EL CUPÓN", "THE COUPON") },
      { type: "field", k: E2("CÓDIGO", "CODE"), val: x.cCode, ph: "SABOR3", max: 12, lock: usados > 0, help: E2("De 4 a 12 letras o números. Solo lo ven quienes te siguen.", "4 to 12 letters or numbers. Only your followers see it."), onChange: (v) => F.set({ cCode: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) }) },
      { type: "field", k: E2("DESCUENTO", "DISCOUNT"), val: x.cOff, pre: "$", im: "decimal", max: 5, lock: usados > 0, help: E2("De $1 a $50. Lo pones tú: sale de lo que cobras.", "$1 to $50. You give it: it comes out of what you charge."), onChange: (v) => F.set({ cOff: v.replace(/[^\d.]/g, "").slice(0, 5) }) },
      { type: "field", k: E2("COMPRA MÍNIMA", "MINIMUM ORDER"), val: x.cMin, pre: "$", im: "decimal", max: 6, lock: usados > 0, help: E2("Al menos $1 más que el descuento.", "At least $1 more than the discount."), onChange: (v) => F.set({ cMin: v.replace(/[^\d.]/g, "").slice(0, 6) }) },
      { type: "field", k: E2("CUÁNTOS USOS EN TOTAL", "HOW MANY USES IN TOTAL"), val: x.cUses, im: "numeric", max: 3, help: E2("Cada persona lo usa una vez. Si un pedido no sigue, el uso vuelve.", "Each person uses it once. If an order does not go through, the use comes back."), onChange: (v) => F.set({ cUses: v.replace(/\D/g, "").slice(0, 3) }) },
      { type: "note", tone: usados > 0 ? "warn" : "info", icon: "dollar", t: usados > 0
        ? E2(`Ya se usó ${usados} ${usados === 1 ? "vez" : "veces"}: el código, el descuento y el mínimo no cambian. Para otro, termínalo y crea uno nuevo.`, `Already used ${usados} ${usados === 1 ? "time" : "times"}: the code, discount and minimum do not change. For another, end it and create a new one.`)
        : E2("Vale en pedidos en línea de tu negocio, una vez por persona, mientras la novedad esté en vivo. Siempre vence.", "It works on your online orders, once per person, while the update is live. It always expires.") });
    if (x.ends === "no") out.push({ type: "note", tone: "warn", t: E2("Un cupón siempre vence: elige cuándo en VENCE.", "A coupon always expires: pick when under ENDS.") });
  }
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
    // 9n-11 · Con «Repetir», cuánto se ve lo dice CADA VEZ SE VE (abajo); VENCE no aplica.
    ...(x.when === "rep" ? [] : [{ type: "chips" as const, k: E2("VENCE", "ENDS"), items: ([["3pm", E2("Hoy 3 PM", "Today 3 PM")], ["24h", E2("En 24 h", "In 24 h")], ["semana", E2("Esta semana", "This week")], ["no", E2("Sin fecha", "No end")]] as [string, string][]).map(([v, l]) => ({ l, v: x.ends === v ? "selected" : "filter", onClick: () => F.set({ ends: v }) })) }]));
  const W: ["now" | "once" | "rep", string, string, string][] = [["now", "bolt", E2("Publicar ahora", "Post now"), E2("Sale en cuanto toques Publicar.", "Goes out as soon as you tap Post.")], ["once", "calendar", E2("Programar para otro día", "Schedule for another day"), E2("Elige el día y la hora.", "Pick the day and time.")], ["rep", "clock", E2("Repetir", "Repeat"), E2("Todos los días, solo los viernes, lun · mié · vie…", "Every day, Fridays only, Mon · Wed · Fri…")]];
  out.push({ type: "group", k: E2("CUÁNDO SE PUBLICA", "WHEN IT GOES OUT") }, { type: "rows", items: W.map(([v, ic, t, s]) => ({ icon: ic, ibg: x.when === v ? "var(--tl-ink)" : "rgba(75,55,245,.08)", ifg: x.when === v ? "var(--tl-white)" : "var(--tl-action)", t, s, compact: true, bd: x.when === v ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.08)", chev: false, onClick: () => F.set({ when: v }), sel: { on: x.when === v, onClick: () => F.set({ when: v }) } })) });
  if (x.when === "now") out.push({ type: "rows", items: [{ icon: "bell", t: E2("Avisar a tus seguidores", "Tell your followers"), s: E2("Les llega a su campana a quienes te guardan y tienen encendido «Lo que traen hoy». Una vez por novedad; hasta 2 al día.", "It reaches the bell of people who saved you and have “What they have today” on. Once per update; up to 2 a day."), compact: true, chev: false,
    tgOn: x.avisar, onTg: () => F.set({ avisar: !x.avisar }) }] });
  // 9n-11 · «Repetir» (diseño schedBlocks): QUÉ DÍAS (atajos), O ELIGE LOS DÍAS, Sale a las, CADA VEZ SE VE, HASTA CUÁNDO y lo que va a pasar.
  if (x.when === "rep") {
    const PRE: Record<string, number[]> = { all: [0, 1, 2, 3, 4, 5, 6], lv: [1, 2, 3, 4, 5], lmv: [1, 3, 5], fds: [0, 6] }, ORD = [1, 2, 3, 4, 5, 6, 0];
    const LET = c.es ? ["D", "L", "M", "X", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"], DN = c.es ? ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dias = x.rDias, es = (k: string) => PRE[k]!.length === dias.length && PRE[k]!.every((d) => dias.includes(d));
    out.push({ type: "chips", k: E2("QUÉ DÍAS", "WHICH DAYS"), items: ([["all", E2("Todos los días", "Every day")], ["lv", E2("Lunes a viernes", "Mon to Fri")], ["lmv", E2("Lun · Mié · Vie", "Mon · Wed · Fri")], ["fds", E2("Fines de semana", "Weekends")]] as [string, string][])
        .map(([k, l]) => ({ l, v: es(k) ? "selected" : "filter", onClick: () => F.set({ rDias: PRE[k]!.slice() }) })) },
      { type: "chips", k: E2("O ELIGE LOS DÍAS", "OR PICK THE DAYS"), help: `${dias.length}${E2(" DE 7", " OF 7")}`, items: ORD.map((d) => ({ l: LET[d]!, v: dias.includes(d) ? "selected" : "filter", onClick: () => F.set({ rDias: dias.includes(d) ? dias.filter((y) => y !== d) : [...dias, d] }) })) },
      { type: "step", t: E2("Sale a las", "Goes out at"), s: E2("Cada día que toca.", "Each day it runs."), v: horaL(x.sM), onM: () => F.set({ sM: Math.max(360, x.sM - 30) }), onP: () => F.set({ sM: Math.min(1320, x.sM + 30) }) },
      { type: "chips", k: E2("CADA VEZ SE VE", "EACH TIME IT SHOWS"), items: ([["close", E2("Hasta que cierras", "Until you close")], ["3h", "3 h"], ["6h", "6 h"], ["24h", "24 h"]] as [string, string][]).map(([v, l]) => ({ l, v: x.rDur === v ? "selected" : "filter", onClick: () => F.set({ rDur: v }) })) },
      { type: "chips", k: E2("HASTA CUÁNDO", "UNTIL WHEN"), items: ([["no", E2("Hasta que la detengas", "Until you stop it")], ["2w", E2("2 semanas", "2 weeks")], ["1m", E2("1 mes", "1 month")], ["3m", E2("3 meses", "3 months")]] as [string, string][]).map(([v, l]) => ({ l, v: x.rHasta === v ? "selected" : "filter", onClick: () => F.set({ rHasta: v }) })) });
    if (!dias.length) out.push({ type: "note", tone: "warn", t: E2("Elige al menos un día.", "Pick at least one day.") });
    else {
      const ord = [...dias].sort((a, b) => ORD.indexOf(a) - ORD.indexOf(b)), junta = (a: string[]) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")}${E2(" y ", " and ")}${a[a.length - 1]}`);
      const dt = es("all") ? E2("todos los días", "every day") : es("lv") ? E2("de lunes a viernes", "Monday to Friday") : es("fds") ? E2("los fines de semana", "on weekends") : ord.length === 1 ? E2(`solo los ${DN[ord[0]!]}`, `only on ${DN[ord[0]!]}s`) : E2(`los ${junta(ord.map((d) => DN[d]!))}`, `on ${junta(ord.map((d) => DN[d]!))}`);
      const du = ({ close: E2("hasta que cierras", "until you close"), "3h": E2("por 3 h", "for 3 h"), "6h": E2("por 6 h", "for 6 h"), "24h": E2("por 24 h", "for 24 h") } as Record<string, string>)[x.rDur] ?? "";
      const un = ({ no: "", "2w": E2(", durante 2 semanas", ", for 2 weeks"), "1m": E2(", durante 1 mes", ", for 1 month"), "3m": E2(", durante 3 meses", ", for 3 months") } as Record<string, string>)[x.rHasta] ?? "";
      out.push({ type: "note", tone: "ok", icon: "calendar", t: `${E2("Sale ", "Goes out ")}${dt}${E2(" a las ", " at ")}${horaL(x.sM)}${E2(" y se ve ", " and shows ")}${du}${un}. ${E2("Los días que cierras no sale.", "It skips the days you are closed.")}` });
    }
    out.push({ type: "note", tone: "info", icon: "bell", t: E2("A tus seguidores les avisamos solo la primera vez, para no cansarlos. Cada vez sale en tu página y en Hoy en el barrio.", "Followers are notified only the first time, so they do not tire of it. Each time it shows on your page and in Today nearby.") });
  }
  if (x.when === "once") {
    const dias = Array.from({ length: 7 }, (_, i) => { const t = new Date(Date.now() + i * 86_400_000); return [i, i === 0 ? E2("Hoy", "Today") : i === 1 ? E2("Mañana", "Tomorrow") : new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { weekday: "short", day: "numeric" }).format(t).replace(/\./g, "")] as [number, string]; });
    out.push({ type: "chips", k: E2("QUÉ DÍA", "WHICH DAY"), items: dias.map(([i, l]) => ({ l, v: x.sD === i ? "selected" : "filter", onClick: () => F.set({ sD: i }) })) },
      { type: "step", t: E2("A qué hora", "At what time"), v: horaL(x.sM), onM: () => F.set({ sM: Math.max(0, x.sM - 30) }), onP: () => F.set({ sM: Math.min(1410, x.sM + 30) }) });
  }
  out.push({ type: "nprev", k: E2("ASÍ SE VE", "HOW IT LOOKS"), name: d.name, logo: d.logo ?? undefined, tags: [{ label: T[1].toUpperCase(), tone: ty === "oferta" ? "ink" : ty === "hoy" ? "signal" : ty === "aviso" ? "danger" : ty === "encuesta" ? "action" : ty === "cupon" ? "pro" : "neutral" }],
    body: x.title ? (x.body ? `${x.title}. ${x.body}` : x.title) : E2("Tu título sale aquí.", "Your title shows here."), photos: x.fotos.map((f) => f.url), foot: ty === "oferta" && it && nw > 0 ? `${it.name} · ${money(nw)}` : ty === "cupon" && cupOk ? `${x.cCode} · −${money(cOff)} ${E2("desde", "from")} ${money(cMin)}` : undefined });
  const poll = [x.o1, x.o2, x.o3, x.o4].map((o) => o.trim()).filter(Boolean);
  const valid = x.title.trim().length >= 3 && (ty !== "cupon" || cupOk) && (ty !== "oferta" || (!!it && nw > 0 && nw < bf)) && (ty !== "encuesta" || poll.length >= 2) && (ty !== "aviso" || !!x.day.trim()) && (lk !== "item" || ty === "aviso" || ty === "encuesta" || !!x.item) && (lk !== "job" || !!x.job) && (lk !== "web" || /^https:\/\//.test(x.url)) && (lk !== "event" || !!x.evento);
  return { blocks: out, ed: {
    F, l: x.when === "once" || x.when === "rep" ? E2("Programar", "Schedule") : edita ? E2("Guardar", "Save") : E2("Publicar", "Post"), valid: valid && (x.when !== "rep" || x.rDias.length > 0), always: true,
    apply: (v: FN) => novGuardar(d.id, { id: edita ? ed!.id : null, kind: v.kind, title: v.title, body: v.body, cupon: v.kind === "cupon" ? { code: v.cCode, off: Number(v.cOff), min: Number(v.cMin), uses: Number(v.cUses) } : null, link: v.kind === "oferta" ? "item" : v.kind === "aviso" || v.kind === "encuesta" || v.kind === "cupon" ? "none" : v.link, item: v.item,
      url: v.url, was: v.was ? Number(v.was) : null, now: v.now ? Number(v.now) : null, aviso: v.kind === "aviso" ? { day: v.day, hrs: v.hrs, hrsT: v.hrsT } : null,
      poll: [v.o1, v.o2, v.o3, v.o4].map((o) => o.trim()).filter(Boolean), audience: v.audience, ends: v.ends, prog: v.when === "once" ? { d: v.sD, m: v.sM } : null, rep: v.when === "rep" ? { dias: v.rDias, m: v.sM, dur: v.rDur, hasta: v.rHasta } : null, fotos: v.fotos.map((f) => f.id), evento: v.evento, job: v.job, avisar: v.when === "now" && v.avisar }),
    toast: x.when === "rep" ? E2("Programada: se repite los días que elegiste.", "Scheduled: it repeats on the days you picked.") : x.when === "once" ? E2("Programada.", "Scheduled.") : E2("Publicada. Ya sale en tu página.", "Posted. It is on your page now."),
    onDone: () => c.go("pag", "nov"),
  } };
}
