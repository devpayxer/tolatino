"use client";
/* Jobs en el panel (Panel v2 · Lo que vendes › Jobs, prototipo jobBlocks / jobDet): las vacantes con su pago real por
   hora, las solicitudes de cada una (le vas a llamar, entrevista en un día que abres, no seleccionado), y el editor.
   Siempre igual: el pago se ve completo, se aplica sin CV y nunca se pide estatus, SSN ni pago para aplicar. */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { AppPanel, VacPanel, VacPanelDet } from "@/lib/jobs";
import { bi, DCORTO, diasL, EXP_L, haceL, horaL, horarioL, idiomasL, pagoLargo, PROHIBIDO, tipoL } from "@/lib/jobs-txt";
import { vacGuardarP, vacModulo, vacPaso, vacResponder } from "./acciones-jobs";
import { panelTraducir } from "./acciones-traducir";
import type { Ctx, Sec } from "./Panel";

export type JobsData = { lista?: VacPanel; det?: VacPanelDet | null; app?: string | null; hor?: { abre: number[]; a: number; z: number }; hoy?: { id: string; job: string; name: string; title: { es: string; en: string }; at: string }[] };
const pl = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;
const ST_V = (c: Ctx): Record<string, [string, string]> => ({
  draft: [c.E2("BORRADOR", "DRAFT"), "neutral"], live: [c.E2("ABIERTA", "LIVE"), "signal"], paused: [c.E2("PAUSADA", "PAUSED"), "neutral"], filled: [c.E2("CUBIERTA", "FILLED"), "neutral"], adm: [c.E2("OCULTA POR TO’LATINO", "HIDDEN BY TO’LATINO"), "danger"],
});
const ST_A = (c: Ctx, ivOk = false): Record<string, [string, string]> => ({
  sent: [c.E2("NUEVA", "NEW"), "action"], seen: [c.E2("VISTA", "SEEN"), "neutral"], contact: [c.E2("LE VAS A LLAMAR", "YOU WILL CALL"), "signal"],
  interview: [ivOk ? c.E2("ENTREVISTA CONFIRMADA", "INTERVIEW CONFIRMED") : c.E2("ENTREVISTA", "INTERVIEW"), "signal"], not_selected: [c.E2("NO SELECCIONADO", "NOT SELECTED"), "neutral"], withdrawn: [c.E2("LA RETIRÓ", "WITHDRAWN"), "neutral"],
});
const SIEMPRE = (c: Ctx): Bloque => ({ type: "note", tone: "ink", icon: "shield", t: c.E2("Siempre igual: el pago por hora se ve completo, la gente aplica sin CV y nunca se pide estatus migratorio, SSN ni pago para aplicar.", "Always the same: hourly pay is shown in full, people apply without a resume, and immigration status, SSN or a fee to apply are never asked.") });
const fechaL = (c: Ctx, iso: string, tz?: string) => new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { ...(tz ? { timeZone: tz } : {}), weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");
const ymdL = (c: Ctx, ymd: string) => new Intl.DateTimeFormat(c.es ? "es-US" : "en-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00Z`)).replace(/\./g, "");

/* Lo que vendes › Jobs: resumen, abiertas, cerradas y borradores. */
export function jobsBloques(c: Ctx): Sec {
  const { E2, es, d } = c, J = c.jobs?.lista, out: (Bloque | null)[] = [];
  out.push({ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: "Jobs", onBack: () => c.go("mod"), act: d.pro ? { l: E2("Publicar", "Post"), icon: "plus", onClick: () => c.det("vac:new") } : undefined });
  if (!d.pro) {
    out.push({ type: "lock", t: E2("Publica vacantes con pago real por hora", "Post jobs with real hourly pay"), s: E2("La gente aplica sin CV desde tu página y tú respondes aquí.", "People apply without a resume from your page and you reply here."), ...ctaPro(c, E2("Ver Pro", "See Pro")) });
    return { blocks: out, ed: null };
  }
  if (!J) return { blocks: out, ed: null };
  if (J.pausa) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Jobs: tus vacantes no salen en tu página. Motivo: ${J.pausa}`, `To’Latino paused your Jobs: your openings do not show on your page. Reason: ${J.pausa}`) });
  else if (!J.on && J.filas.length) out.push({ type: "note", tone: "info", icon: "brief", t: E2("Jobs está apagado: tus vacantes no salen en tu página. Se quedan guardadas.", "Jobs is off: your openings do not show on your page. They stay saved."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => vacModulo(d.id, true), E2("Jobs encendido.", "Jobs turned on.")) });
  const nA = J.filas.filter((j) => j.st === "adm").length;
  if (nA) out.push({ type: "note", tone: "danger", icon: "ban", t: nA === 1 ? E2("1 vacante la ocultó To’Latino: no sale en tu página.", "To’Latino hid 1 opening: it is not on your page.") : E2(`${nA} vacantes las ocultó To’Latino: no salen en tu página.`, `To’Latino hid ${nA} openings: they are not on your page.`) });
  const open = J.filas.filter((j) => j.st === "live"), closed = J.filas.filter((j) => j.st !== "live");
  const A = J.filas.reduce((n, j) => n + j.apps, 0), pend = J.filas.reduce((n, j) => n + j.pend, 0), done = A - pend, pc = A ? Math.round((done / A) * 100) : 0;
  out.push({ type: "rvsum", icon: "brief", t: pl(open.length, E2("vacante abierta", "opening live"), E2("vacantes abiertas", "openings live")), s: E2("Pago real por hora · la gente aplica sin CV", "Real hourly pay · people apply without a resume"),
    tag: J.pausa ? E2("PAUSADO", "PAUSED") : !J.on ? E2("APAGADO", "OFF") : pend ? E2("POR RESPONDER", "TO ANSWER") : E2("AL DÍA", "UP TO DATE"), tone: J.pausa ? "danger" : pend ? "action" : "neutral",
    progT: `${done}${E2(" de ", " of ")}${A}${E2(" solicitudes respondidas", " applications answered")}`, progR: `${pc} %`, pct: `${Math.max(done ? 3 : 0, pc)}%`, barC: "var(--tl-open-text)",
    stats: [{ k: E2("ABIERTAS", "LIVE"), v: String(open.length), s: E2("en tu página", "on your page") }, { k: E2("SOLICITUDES", "APPLICATIONS"), v: String(A), s: E2("en total", "in total") },
      { k: E2("POR RESPONDER", "TO ANSWER"), v: String(pend), s: E2("esperan tu respuesta", "waiting for your reply"), fg: pend ? "var(--tl-action)" : undefined }],
    tools: [{ icon: "search", l: E2("Ver página", "View page"), onClick: () => c.nav(`/n/${d.id}?tab=jobs`) }, { icon: "plus", l: E2("Publicar", "Post"), onClick: () => c.det("vac:new") }] });
  const ST = ST_V(c);
  const row = (j: (typeof J.filas)[number]): Fila => ({
    icon: "brief", t: bi(j.title, es), s: `${pagoLargo(j.payFrom, j.payTo, j.tips, es)} · ${diasL(j.days, es)} · ${horarioL(j.start, j.end)}`,
    m: j.apps ? `${pl(j.apps, E2("SOLICITUD", "APPLICATION"), E2("SOLICITUDES", "APPLICATIONS"))}${j.nuevas ? ` · ${pl(j.nuevas, E2("NUEVA", "NEW"), E2("NUEVAS", "NEW"))}` : ""}` : undefined,
    tag: j.st === "live" ? (j.pend ? E2("POR RESPONDER", "TO ANSWER") : null) : ST[j.st]![0], tone: j.st === "adm" ? "danger" : j.st === "live" && j.pend ? "action" : "neutral",
    dim: j.st !== "live", onClick: () => c.det(`vac:${j.id}`),
  });
  out.push({ type: "rows", k: `${E2("ABIERTAS · ", "LIVE · ")}${open.length}`, link: E2("Publicar", "Post"), onLink: () => c.det("vac:new"),
    items: open.length ? open.map(row) : [{ icon: "plus", t: E2("Publica tu primera vacante", "Post your first opening"), s: E2("Puesto, pago por hora, días y horario. Sale en la pestaña Jobs de tu página.", "Position, hourly pay, days and hours. It shows in the Jobs tab of your page."), onClick: () => c.det("vac:new") }] });
  if (closed.length) out.push({ type: "rows", k: `${E2("CERRADAS Y BORRADORES · ", "CLOSED AND DRAFTS · ")}${closed.length}`, items: closed.map(row) });
  out.push(SIEMPRE(c));
  return { blocks: out, ed: null };
}

/* Hoy · «Solicitudes de empleo nuevas». */
export function hoyJobs(c: Ctx): Bloque[] {
  const { E2, es, d } = c, L = c.jobs?.hoy ?? [];
  if (!d.pro || !L.length) return [];
  return [{ type: "rows", k: E2("SOLICITUDES DE EMPLEO NUEVAS", "NEW JOB APPLICATIONS"), link: E2("Ver Jobs", "See Jobs"), onLink: () => c.nav(`/panel/${d.id}/vendes/jobs`),
    items: L.map((x) => ({ imgIni: x.name.slice(0, 1), imgW: "40px", t: x.name, s: `${bi(x.title, es)} · ${fechaL(c, x.at, d.hoy.tz)}`, tag: E2("NUEVA", "NEW"), tone: "action", onClick: () => c.nav(`/panel/${d.id}/vendes/jobs?det=vap:${x.id}`) })) }];
}

export function jobsDetalle(c: Ctx): Sec {
  const id = c.ruta.det ?? "";
  if (id.startsWith("vap:")) return solicitud(c);
  const v = id.slice(4);
  if (v === "new" || v.startsWith("edit:") || v.startsWith("dup:")) return editor(c, v);
  return vacante(c);
}

function noEsta(c: Ctx): Sec {
  return { blocks: [{ type: "head", t: c.E2("Ya no está", "No longer here"), onBack: c.closeDet }, { type: "empty", icon: "brief", t: c.E2("Esa vacante ya no está", "That opening is gone"), s: "" }], ed: null };
}

/* Una vacante: datos, solicitudes con filtro y acciones. */
function vacante(c: Ctx): Sec {
  const { E2, es, d, ui } = c, j = c.jobs?.det;
  if (!j) return noEsta(c);
  const out: (Bloque | null)[] = [], ST = ST_V(c), ap = j.solicitudes;
  if (j.st === "adm") out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó esta vacante: no sale en tu página. Motivo: ${j.hidden ?? "—"}`, `To’Latino hid this opening: it is not on your page. Reason: ${j.hidden ?? "—"}`) });
  out.push({ type: "head", eye: `${tipoL(j.kind, es)} · ${ST[j.st]![0]}`.toUpperCase(), t: bi(j.title, es), s: pagoLargo(j.payFrom, j.payTo, j.tips, es), onBack: c.closeDet });
  if (j.st === "paused") out.push({ type: "note", tone: "info", icon: "clock", t: E2("Pausada: no sale en tu página y nadie nuevo puede aplicar. Las solicitudes que tienes se quedan.", "Paused: not on your page and nobody new can apply. Your applications stay.") });
  if (j.st === "filled") out.push({ type: "note", tone: "info", icon: "check", t: E2("Cubierta: ya no sale. A quien esperaba respuesta le salió «No seleccionado» en su solicitud.", "Filled: no longer shows. People waiting for an answer see “Not selected” in their application.") });
  if (j.st === "draft") out.push({ type: "note", tone: "info", icon: "edit", t: E2("Borrador: solo tú la ves. Publícala cuando esté lista.", "Draft: only you see it. Post it when ready.") });
  out.push({ type: "kv", items: [{ k: E2("DÍAS", "DAYS"), v: diasL(j.days, es) }, { k: E2("HORARIO", "HOURS"), v: horarioL(j.start, j.end) }, { k: E2("IDIOMAS", "LANGUAGES"), v: idiomasL(j.langEs, j.langEn, es) },
    { k: E2("BUSCAS", "LOOKING FOR"), v: pl(j.openings, E2("persona", "person"), E2("personas", "people")) }, { k: E2("PUBLICADA", "POSTED"), v: j.st === "draft" ? "—" : haceL(j.ago, es) }] });
  const F = ["all", "pend", "contact", "interview", "not_selected"], f = F.includes(ui.jbF) ? (ui.jbF as string) : "all";
  const ok = (a: AppPanel, k: string) => k === "all" || (k === "pend" ? a.st === "sent" || a.st === "seen" : a.st === k);
  out.push({ type: "chips", k: `${E2("SOLICITUDES · ", "APPLICATIONS · ")}${ap.length}`, items: ([["all", E2("Todas", "All")], ["pend", E2("Por responder", "To answer")], ["contact", E2("Le vas a llamar", "You will call")], ["interview", E2("Entrevista", "Interview")], ["not_selected", E2("No seleccionado", "Not selected")]] as [string, string][])
    .map(([k, l]) => ({ l: `${l} · ${ap.filter((a) => ok(a, k)).length}`, v: f === k ? "selected" : "filter", onClick: () => c.setUi({ jbF: k }) })) });
  const AL = ap.filter((a) => ok(a, f)), EX = EXP_L(es);
  out.push({ type: "rows", items: AL.length ? AL.map((a) => { const tg = ST_A(c, a.ivOk)[a.st]!; return {
    imgIni: a.name.slice(0, 1), imgW: "40px", t: a.name, s: `${EX[a.exp] ?? ""} · ${pl(a.days.length, E2("día", "day"), E2("días", "days"))} · ${fechaL(c, a.at, j.tz)}${a.st === "interview" && a.iv ? ` · ${fechaL(c, a.iv, j.tz)}` : ""}`,
    tag: tg[0], tone: tg[1], onClick: () => c.det(`vap:${a.id}`) }; })
    : [{ icon: "users", t: ap.length ? E2("Nadie en este filtro", "Nobody in this filter") : E2("Todavía nadie aplica", "Nobody has applied yet"), s: ap.length ? "" : E2("Las solicitudes llegan aquí y a Hoy.", "Applications arrive here and in Today."), chev: false }] });
  const del = ui.jbDel === j.id;
  out.push({ type: "acts", items: del ? [
    { l: E2("Sí, quitar vacante", "Yes, remove opening"), v: "danger", icon: "trash", onClick: () => { c.setUi({ jbDel: null }); c.run(() => vacPaso(d.id, j.id, "quitar"), E2("Vacante quitada.", "Opening removed."), () => c.closeDet()); } },
    { l: "No", v: "secondary", onClick: () => c.setUi({ jbDel: null }) },
  ] : [
    ...(j.st !== "adm" ? [{ l: E2("Editar", "Edit"), icon: "edit", v: "secondary", onClick: () => c.det(`vac:edit:${j.id}`) }] : []),
    ...(j.st === "live" ? [{ l: E2("Pausar", "Pause"), icon: "clock", v: "secondary", onClick: () => c.run(() => vacPaso(d.id, j.id, "pausar"), E2("Pausada: ya no sale en tu página.", "Paused: no longer on your page.")) }]
      : j.st !== "adm" ? [{ l: j.st === "draft" ? E2("Publicar", "Post") : E2("Volver a publicar", "Post again"), icon: "bolt", v: "primary", onClick: () => c.run(() => vacPaso(d.id, j.id, "publicar"), E2("Publicada en la pestaña Jobs de tu página.", "Posted in the Jobs tab of your page.")) }] : []),
    ...(j.st === "live" || j.st === "paused" ? [{ l: E2("Ya la cubrí", "I filled it"), icon: "check", v: "secondary", onClick: () => c.run(() => vacPaso(d.id, j.id, "cubrir"), E2("Cubierta. A quien esperaba respuesta le sale «No seleccionado».", "Filled. People waiting see “Not selected”.")) }] : []),
    ...(j.st !== "adm" ? [{ l: E2("Duplicar", "Duplicate"), icon: "plus", v: "secondary", onClick: () => c.det(`vac:dup:${j.id}`) }] : []),
    { l: E2("Quitar", "Remove"), icon: "trash", v: "secondary", onClick: () => c.setUi({ jbDel: j.id }) },
  ] });
  if (del) out.push({ type: "note", tone: "warn", icon: "warning", t: E2("Sale de tu página y de tu panel. A quien esperaba respuesta le sale «No seleccionado».", "It leaves your page and your panel. People waiting for an answer see “Not selected”.") });
  return { blocks: out, ed: null };
}

/* Una solicitud: lo que mandó la persona y las respuestas. */
function solicitud(c: Ctx): Sec {
  const { E2, es, d, ui } = c, j = c.jobs?.det, a = j?.solicitudes.find((x) => x.id === c.jobs?.app);
  if (!j || !a) return noEsta(c);
  const out: (Bloque | null)[] = [], fn = a.name.split(" ")[0] ?? a.name, tg = ST_A(c, a.ivOk)[a.st]!, DL = DCORTO(es), EX = EXP_L(es);
  const LG: Record<string, string> = { es: E2("Español", "Spanish"), en: E2("Inglés", "English") };
  out.push({ type: "head", eye: `${E2("SOLICITUD · ", "APPLICATION · ")}${tg[0]}`, t: a.name, s: `${bi(j.title, es)} · ${fechaL(c, a.at, j.tz)}`, onBack: () => c.det(`vac:${j.id}`) });
  out.push({ type: "kv", items: [{ k: E2("TELÉFONO", "PHONE"), v: a.phone }, { k: E2("EXPERIENCIA EN ESTO", "EXPERIENCE"), v: EX[a.exp] ?? "—" },
    { k: E2("PUEDE TRABAJAR", "CAN WORK"), v: a.days.length ? [...a.days].sort((x, y) => x - y).map((x) => DL[x]).join(" · ") : "—" }, { k: E2("IDIOMAS", "LANGUAGES"), v: a.langs.map((k) => LG[k]).join(" · ") || "—" },
    ...(a.note ? [{ k: E2("SU NOTA", "THEIR NOTE"), v: a.note }] : [])] });
  const fit = a.days.filter((x) => j.days.includes(x)).length;
  if (j.days.length && fit < j.days.length) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Puede ${fit} de los ${j.days.length} días que pides.`, `Can work ${fit} of the ${j.days.length} days you need.`) });
  if (a.st === "interview" && a.iv) out.push({ type: "note", tone: a.ivOk ? "ok" : "info", icon: "calendar", t: `${E2("Entrevista: ", "Interview: ")}${fechaL(c, a.iv, j.tz)}${a.ivOk ? E2(`. ${fn} la confirmó.`, `. ${fn} confirmed it.`) : E2(`. Falta que ${fn} la confirme en su solicitud.`, `. Waiting for ${fn} to confirm in their application.`)}` });
  if (a.st === "withdrawn") out.push({ type: "note", tone: "info", t: E2(`${fn} retiró su solicitud.`, `${fn} withdrew the application.`) });
  const pick = ui.jbIv === a.id, no = ui.jbNo === a.id, tel = a.phone.replace(/\D/g, "");
  if (pick) {
    const D = j.ivDias, sd = D.find((x) => x.d === ui.jbIvD) ?? D[0], sh = sd && sd.horas.includes(ui.jbIvH) ? (ui.jbIvH as number) : sd?.horas[0];
    if (!D.length) out.push({ type: "note", tone: "warn", icon: "clock", t: E2("No abres en los próximos 10 días según tu horario. Revisa tu horario o llámale.", "You are not open in the next 10 days per your hours. Check your hours or call them."), cta: E2("Ir a Horario", "Go to Hours"), onCta: () => c.go("pag", "hor") });
    else out.push({ type: "chips", k: E2("DÍA DE LA ENTREVISTA · DÍAS QUE ABRES", "INTERVIEW DAY · DAYS YOU ARE OPEN"), items: D.map((x) => ({ l: ymdL(c, x.ymd), v: sd?.d === x.d ? "selected" : "filter", onClick: () => c.setUi({ jbIvD: x.d }) })) },
      { type: "chips", k: E2("HORA", "TIME"), items: (sd?.horas ?? []).map((h) => ({ l: horaL(h * 60), v: sh === h ? "selected" : "filter", onClick: () => c.setUi({ jbIvH: h }) })) });
    out.push({ type: "acts", items: [
      { l: E2("Mandar invitación", "Send invite"), v: "primary", icon: "check", off: !sd || sh == null || c.pending, onClick: () => { if (!sd || sh == null) return; c.run(() => vacResponder(d.id, a.id, "interview", { d: sd.d, h: sh }), E2(`Invitación lista: ${fn} la ve en su solicitud y la confirma ahí.`, `Invite sent: ${fn} sees it in their application and confirms there.`), () => c.setUi({ jbIv: null })); } },
      { l: E2("Cancelar", "Cancel"), v: "ghost", onClick: () => c.setUi({ jbIv: null }) },
    ] });
  } else if (no) {
    out.push({ type: "note", tone: "warn", icon: "warning", t: E2(`${fn} verá con respeto que eligieron a otra persona, y vacantes parecidas.`, `${fn} will kindly see you chose someone else, and similar jobs.`) },
      { type: "acts", items: [{ l: E2("Sí, no seleccionado", "Yes, not selected"), v: "danger", icon: "close", onClick: () => c.run(() => vacResponder(d.id, a.id, "not_selected"), E2(`Listo. ${fn} lo ve en su solicitud.`, `Done. ${fn} sees it in their application.`), () => c.setUi({ jbNo: null })) }, { l: "No", v: "secondary", onClick: () => c.setUi({ jbNo: null }) }] });
  } else if (a.st !== "withdrawn") {
    out.push({ type: "acts", items: [
      ...(tel ? [{ l: E2("Llamar", "Call"), icon: "phone", v: "secondary", onClick: () => { location.href = `tel:+1${tel.slice(-10)}`; } }] : []),
      ...(a.st !== "contact" ? [{ l: E2("Le voy a llamar", "I will call"), icon: "chat", v: "secondary", onClick: () => c.run(() => vacResponder(d.id, a.id, "contact"), E2(`${fn} ve en su solicitud que lo vas a llamar.`, `${fn} sees in their application that you will call.`)) }] : []),
      { l: a.st === "interview" ? E2("Cambiar la entrevista", "Change the interview") : E2("Invitar a entrevista", "Invite to interview"), icon: "calendar", v: a.st === "interview" ? "secondary" : "primary", onClick: () => c.setUi({ jbIv: a.id, jbNo: null }) },
      ...(a.st !== "not_selected" ? [{ l: E2("No seleccionado", "Not selected"), icon: "close", v: "secondary", onClick: () => c.setUi({ jbNo: a.id, jbIv: null }) }] : []),
    ] });
  }
  out.push({ type: "note", tone: "info", icon: "shield", t: E2("Cada respuesta la ve en su solicitud. No le pidas papeles, SSN ni pago: To’Latino no lo permite.", "They see each reply in their application. Do not ask for papers, SSN or payment: To’Latino does not allow it.") });
  return { blocks: out, ed: null };
}

/* Editor (vac:new · vac:edit:{id} · vac:dup:{id}). */
type FV = { t0: string; t1: string; kind: string; lo: string; hi: string; tips: boolean; dd: number[]; h0: number; h1: number; left: number; les: string; len: string; d0: string; d1: string; req: [string, string][]; ben: [string, string][]; reqN: string; benN: string; pub: boolean };
const RQ: [string, string][] = [["Mayor de 18 años", "18 or older"], ["Poder estar de pie todo el turno", "Able to stand the whole shift"], ["Carro propio", "Own car"], ["Licencia de Pensilvania", "Pennsylvania license"], ["Experiencia en lo mismo", "Experience in the same work"], ["Puntual y responsable", "On time and reliable"]];
const BN: [string, string][] = [["Comida del turno gratis", "Free shift meal"], ["Pago cada semana", "Paid weekly"], ["Propinas completas para ti", "You keep all tips"], ["Te enseñamos", "We train you"], ["Horario fijo", "Set schedule"], ["Aumento a los 90 días", "Raise after 90 days"]];
function editor(c: Ctx, v: string): Sec {
  const { E2, es, d } = c, edita = v.startsWith("edit:"), j0 = edita || v.startsWith("dup:") ? c.jobs?.det ?? null : null;
  if ((edita || v.startsWith("dup:")) && !j0) return noEsta(c);
  if (!d.pro) return { blocks: [{ type: "head", t: "Jobs", onBack: c.closeDet }, { type: "lock", t: E2("Jobs es de Pro", "Jobs is Pro"), s: E2("Con Pro publicas vacantes en tu página.", "With Pro you post openings on your page."), ...ctaPro(c, E2("Ver Pro", "See Pro")) }], ed: null };
  const H = c.jobs?.hor ?? { abre: [0, 1, 2, 3, 4], a: 540, z: 1020 };
  const b0: FV = j0 ? {
    t0: j0.title.es, t1: j0.title.en && j0.title.en !== j0.title.es ? j0.title.en : "", kind: j0.kind, lo: String(j0.payFrom / 100), hi: j0.payTo && j0.payTo !== j0.payFrom ? String(j0.payTo / 100) : "", tips: j0.tips,
    dd: [...j0.days], h0: j0.start, h1: j0.end, left: j0.openings, les: j0.langEs, len: j0.langEn, d0: j0.descr.es, d1: j0.descr.en && j0.descr.en !== j0.descr.es ? j0.descr.en : "",
    req: j0.req.map((x) => [x[0], x[1]] as [string, string]), ben: j0.ben.map((x) => [x[0], x[1]] as [string, string]), reqN: "", benN: "", pub: true,
  } : { t0: "", t1: "", kind: "ft", lo: "", hi: "", tips: false, dd: H.abre.length ? [...H.abre] : [0, 1, 2, 3, 4], h0: H.a, h1: H.z, left: 1, les: "need", len: "no", d0: "", d1: "", req: [["Mayor de 18 años", "18 or older"]], ben: [], reqN: "", benN: "", pub: true };
  const F = c.form<FV>(`det:vac:${v}`, b0), x = F.d, out: (Bloque | null)[] = [], DL = DCORTO(es);
  out.push({ type: "head", eye: E2("VACANTE", "OPENING"), t: edita ? E2("Editar vacante", "Edit opening") : E2("Publicar vacante", "Post an opening"), s: edita && j0 ? bi(j0.title, es) : E2("Con puesto, pago, días y horario ya se puede aplicar.", "Position, pay, days and hours are enough for people to apply."), onBack: edita && j0 ? () => c.det(`vac:${j0.id}`) : c.closeDet });
  out.push({ type: "group", k: E2("EL PUESTO", "THE POSITION") },
    { type: "field", k: E2("PUESTO", "POSITION"), val: x.t0, max: 50, count: `${x.t0.length}/50`, ph: E2("Ej. Ayudante de cocina", "e.g. Kitchen helper"), onChange: (t) => F.set({ t0: t.slice(0, 50) }) },
    { type: "chips", k: E2("TIPO", "TYPE"), items: ["ft", "pt", "fds"].map((k) => ({ l: tipoL(k, es), v: x.kind === k ? "selected" : "filter", onClick: () => F.set({ kind: k }) })) },
    { type: "step", t: E2("Cuántas personas buscas", "How many people you need"), v: String(x.left), onM: () => F.set({ left: Math.max(1, x.left - 1) }), onP: () => F.set({ left: Math.min(20, x.left + 1) }) });
  out.push({ type: "group", k: E2("PAGO · SE VE COMPLETO", "PAY · SHOWN IN FULL") },
    { type: "field", k: E2("POR HORA · DESDE", "PER HOUR · FROM"), val: x.lo, pre: "$", im: "decimal", max: 6, ph: "15", onChange: (t) => F.set({ lo: t.replace(/[^\d.]/g, "").slice(0, 6) }) },
    { type: "field", k: E2("HASTA · OPCIONAL", "UP TO · OPTIONAL"), val: x.hi, pre: "$", im: "decimal", max: 6, ph: "17", onChange: (t) => F.set({ hi: t.replace(/[^\d.]/g, "").slice(0, 6) }) },
    { type: "rows", items: [{ icon: "dollar", t: E2("Lleva propinas", "Includes tips"), s: E2("Sale «+ propinas» junto al pago.", "Shows “+ tips” next to the pay."), tgOn: x.tips, onTg: () => F.set({ tips: !x.tips }) }] });
  out.push({ type: "group", k: E2("DÍAS Y HORARIO", "DAYS AND HOURS") },
    { type: "chips", k: E2("DÍAS", "DAYS"), items: DL.map((l, i) => ({ l, v: x.dd.includes(i) ? "selected" : "filter", onClick: () => F.set({ dd: x.dd.includes(i) ? x.dd.filter((y) => y !== i) : [...x.dd, i].sort((a, b) => a - b) }) })) },
    { type: "step", t: E2("Entra", "Starts"), v: horaL(x.h0), onM: () => F.set({ h0: Math.max(240, x.h0 - 30) }), onP: () => F.set({ h0: Math.min(x.h1 - 30, x.h0 + 30) }) },
    { type: "step", t: E2("Sale", "Ends"), v: horaL(x.h1), onM: () => F.set({ h1: Math.max(x.h0 + 30, x.h1 - 30) }), onP: () => F.set({ h1: Math.min(1440, x.h1 + 30) }) });
  const shut = x.dd.filter((i) => !H.abre.includes(i));
  if (shut.length && H.abre.length) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Tu negocio cierra el ${shut.map((i) => DL[i]).join(", ")}. Si es para otro trabajo ese día, déjalo; si no, quítalo.`, `Your business is closed on ${shut.map((i) => DL[i]).join(", ")}. Keep it if the job is done that day anyway; if not, remove it.`) });
  const LGO: [string, string][] = [["need", E2("Obligatorio", "Required")], ["plus", E2("Suma", "A plus")], ["no", E2("No hace falta", "Not needed")]];
  out.push({ type: "group", k: E2("IDIOMAS", "LANGUAGES") },
    { type: "chips", k: E2("ESPAÑOL", "SPANISH"), items: LGO.map(([k, l]) => ({ l, v: x.les === k ? "selected" : "filter", onClick: () => F.set({ les: k }) })) },
    { type: "chips", k: E2("INGLÉS", "ENGLISH"), items: LGO.map(([k, l]) => ({ l, v: x.len === k ? "selected" : "filter", onClick: () => F.set({ len: k }) })) });
  out.push({ type: "group", k: E2("QUÉ VAS A HACER", "WHAT YOU WILL DO") },
    { type: "field", k: E2("DESCRIPCIÓN · OPCIONAL", "DESCRIPTION · OPTIONAL"), val: x.d0, area: true, rows: 3, max: 300, count: `${x.d0.length}/300`, ph: E2("Lo que hace en el día, con quién trabaja, si le enseñan.", "What the day looks like, who they work with, whether you train them."), onChange: (t) => F.set({ d0: t.slice(0, 300) }) });
  const lista = (k: string, prop: "req" | "ben", PRE: [string, string][], N: "reqN" | "benN") => {
    const cur = x[prop], uni = [...PRE, ...cur.filter((y) => !PRE.some((p) => p[0] === y[0]))];
    out.push({ type: "group", k }, { type: "chips", help: cur.length ? `${cur.length}${E2(" DE 5", " OF 5")}` : "", items: uni.map((y) => { const on = cur.some((z) => z[0] === y[0]); return { l: es ? y[0] : y[1] || y[0], v: on ? "selected" : "filter",
      onClick: () => { if (on) return F.set({ [prop]: cur.filter((z) => z[0] !== y[0]) } as Partial<FV>); if (cur.length >= 5) { c.toast(E2("Máximo 5. Quita uno para cambiarlo.", "Up to 5. Remove one to swap it.")); return; } F.set({ [prop]: [...cur, [y[0], y[1]]] } as Partial<FV>); } }; }) });
    if (cur.length < 5) out.push({ type: "field", k: E2("AGREGAR OTRO", "ADD ANOTHER"), val: x[N], max: 40, onChange: (t) => F.set({ [N]: t.slice(0, 40) } as Partial<FV>) },
      { type: "acts", items: [{ l: E2("Agregar", "Add"), icon: "plus", v: "secondary", off: !x[N].trim(), onClick: () => { if (!x[N].trim()) return; F.set({ [prop]: [...cur, [x[N].trim(), ""]], [N]: "" } as Partial<FV>); } }] });
  };
  lista(E2("LO QUE PIDES · HASTA 5", "WHAT YOU ASK · UP TO 5"), "req", RQ, "reqN");
  lista(E2("LO QUE OFRECES · HASTA 5", "WHAT YOU OFFER · UP TO 5"), "ben", BN, "benN");
  // 9n-2 · «Traducir con El Compa» (L319): el puesto y la descripción con el traductor propio; la persona lo revisa antes de guardar.
  const traducir = () => {
    if (!x.t0.trim()) { c.toast(E2("Escribe primero el puesto en español.", "Write the Spanish position first.")); return; }
    c.run(() => panelTraducir(d.id, [x.t0, x.d0]), E2("Traducido. Revísalo antes de guardar.", "Translated. Check it before saving."), (r) => {
      const en = (r.en ?? []) as string[]; if (!en.length) return;
      F.set({ t1: (en[0] ?? "").slice(0, 50), d1: (en[1] ?? "").slice(0, 300) });
    });
  };
  out.push({ type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL"), link: E2("Traducir con El Compa", "Translate with El Compa"), onLink: traducir },
    { type: "field", k: E2("PUESTO EN INGLÉS", "POSITION IN ENGLISH"), val: x.t1, max: 50, count: `${x.t1.length}/50`, ph: E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one."), onChange: (t) => F.set({ t1: t.slice(0, 50) }) });
  if (x.d0.trim()) out.push({ type: "field", k: E2("DESCRIPCIÓN EN INGLÉS", "DESCRIPTION IN ENGLISH"), val: x.d1, area: true, rows: 3, max: 300, count: `${x.d1.length}/300`, onChange: (t) => F.set({ d1: t.slice(0, 300) }) });
  const lo = Number(x.lo) || 0, hi = Number(x.hi) || 0, loC = Math.round(lo * 100), hiC = hi > lo ? Math.round(hi * 100) : null;
  out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW CLIENTS SEE IT"), items: [
    { icon: "brief", t: (es ? x.t0.trim() : x.t1.trim() || x.t0.trim()) || E2("Puesto", "Position"), s: `${tipoL(x.kind, es)} · ${lo ? pagoLargo(loC, hiC, x.tips, es) : E2("Falta el pago", "Pay missing")}`, compact: true, chev: false },
    { icon: "clock", t: `${diasL(x.dd, es)} · ${horarioL(x.h0, x.h1)}`, compact: true, chev: false },
    { icon: "language", t: idiomasL(x.les, x.len, es), compact: true, chev: false },
    { icon: "check", t: E2("Aplica sin CV: nombre, teléfono, experiencia y días que puede", "Applies without a resume: name, phone, experience and days available"), compact: true, chev: false },
  ] });
  out.push(SIEMPRE(c));
  const borrador = !j0 || !edita || j0.st === "draft";
  if (borrador) out.push({ type: "rows", items: [{ icon: "bolt", t: E2("Publicar al guardar", "Post on save"), s: x.pub ? E2("Sale en la pestaña Jobs de tu página.", "Shows in the Jobs tab of your page.") : E2("Apagado: queda como borrador. Solo tú la ves.", "Off: saved as a draft. Only you see it."), tgOn: x.pub, onTg: () => F.set({ pub: !x.pub }) }] });
  const todo = [x.t0, x.d0, x.t1, x.d1, ...x.req.flat(), ...x.ben.flat()].join(" "), hit = todo.match(PROHIBIDO)?.[0];
  const miss = [x.t0.trim().length < 3 ? E2("puesto", "position") : null, lo < 7.25 ? E2("pago por hora desde $7.25 (el mínimo de Pensilvania)", "hourly pay from $7.25 (the Pennsylvania minimum)") : null,
    x.hi && hi < lo ? E2("«hasta» mayor que «desde»", "“up to” above “from”") : null, !x.dd.length ? E2("al menos un día", "at least one day") : null].filter(Boolean);
  if (hit) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`Quita «${hit}»: To’Latino no deja pedir CV, papeles, estatus, SSN ni pago para aplicar.`, `Remove “${hit}”: To’Latino does not allow asking for a resume, papers, status, SSN or a fee to apply.`) });
  else if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: `${E2("Para publicar falta: ", "To post, add: ")}${miss.join(" · ")}.` });
  return { blocks: out, ed: {
    F, l: !edita || j0?.st === "draft" ? (x.pub ? E2("Publicar", "Post") : E2("Guardar borrador", "Save draft")) : E2("Guardar", "Save"), valid: !miss.length && !hit, always: !edita,
    apply: (y: FV) => vacGuardarP(d.id, { id: edita ? j0!.id : null, t0: y.t0, t1: y.t1, kind: y.kind, lo: Number(y.lo), hi: y.hi ? Number(y.hi) : null, tips: y.tips, days: y.dd, start: y.h0, end: y.h1, openings: y.left,
      les: y.les, len: y.len, d0: y.d0, d1: y.d1, req: y.req, ben: y.ben, pub: borrador ? y.pub : true }),
    toast: borrador && !x.pub ? E2("Guardada como borrador.", "Saved as a draft.") : edita && j0?.st !== "draft" ? E2("Guardado · ya se ve en la pestaña Jobs de tu página", "Saved · it shows in the Jobs tab of your page") : E2("Publicada en la pestaña Jobs de tu página.", "Posted in the Jobs tab of your page."),
    onDone: edita && j0 ? () => c.det(`vac:${j0.id}`) : () => c.go("mod", "jobs"),
  } };
}
