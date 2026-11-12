"use client";
/* Tu página · Equipo (Panel v2 stfBlocks / stfDet): quién sale en tu página. Solo sale quien aceptó; la foto, la bio y
   los idiomas los pone cada persona (el dueño, los suyos); el negocio pone rol, desde, especialidades y horario.
   Con Free sale 1 persona (el dueño); con Pro, todo el equipo. */
import { primerNombre } from "@/lib/nombre";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { Persona } from "@/lib/panel";
import { fmtHora, hoyPersona, semanaNegocio, type Semana } from "@/lib/panel-reglas";
import { subirFoto } from "@/lib/subir-foto";
import { equipoCancelar, equipoGuardar, equipoInvitar, equipoMostrar, equipoQuitar, equipoReenviar, equipoResponder } from "./acciones-equipo";
import { licenciaAgregar, licenciaQuitar } from "./acciones";
import type { Ctx, Editor, Sec } from "./Panel";

type Bi = [string, string];
const NO_RENTA = ["NEG-FOOD", "NEG-MERC", "NEG-TIENDA", "NEG-NOCHE", "NEG-BELL"];
const LANG: Record<string, string> = { es: "Español", en: "English", pt: "Português", qu: "Quechua" };
const SP: Record<string, Bi> = { "NEG-BELL": ["silla", "chair"], "NEG-AUTO": ["bahía", "bay"], "NEG-SALUD": ["consultorio", "office"] };
const first = (n: string) => primerNombre(n) || n;
const ahoraDec = (hm: string) => Number(hm.slice(0, 2)) + Number(hm.slice(3)) / 60;
const L = (c: Ctx, b: { es: string; en: string } | null | undefined) => (b ? (c.es ? b.es : b.en || b.es) : "");
function cuando(c: Ctx, iso: string | null, ahora: number) {
  if (!iso) return "";
  const dias = Math.floor((ahora - Date.parse(iso)) / 86_400_000);
  return dias <= 0 ? c.E2("hoy", "today") : dias === 1 ? c.E2("ayer", "yesterday") : c.E2(`hace ${dias} días`, `${dias} days ago`);
}
const semanaDe = (c: Ctx, m: Persona): Semana | null => (m.same || m.kind === "renter" && !m.wk ? semanaNegocio(c.d.horas) : m.wk);

export function equipoBloques(c: Ctx): (Bloque | null)[] {
  const { d, E2 } = c, out: (Bloque | null)[] = [], list = d.equipo;
  const ok = list.filter((m) => m.st === "ok"), req = list.filter((m) => m.st === "req"), inv = list.filter((m) => m.st === "inv");
  const vis = ok.filter((m) => m.show && !m.hidden), shown = d.pro ? vis : vis.filter((m) => m.kind === "owner").slice(0, 1);
  const dow = d.hoy.dow, t = ahoraDec(d.hoy.hm);
  const work = shown.filter((m) => hoyPersona(semanaDe(c, m), dow, t, c.es).k < 2).length, pc = shown.length ? Math.round((work / shown.length) * 100) : 0;
  const nA = ok.filter((m) => m.hidden !== null).length;
  if (nA) out.push({ type: "note", tone: "danger", icon: "ban", t: nA === 1 ? E2("A 1 persona la quitó To’Latino de tu página. Sigue en tu equipo.", "To’Latino removed 1 person from your page. They stay on your team.") : E2(`A ${nA} personas las quitó To’Latino de tu página. Siguen en tu equipo.`, `To’Latino removed ${nA} people from your page. They stay on your team.`) });
  out.push({
    type: "rvsum", icon: "users", t: shown.length === 1 ? E2("1 persona en tu página", "1 person on your page") : E2(`${shown.length} personas en tu página`, `${shown.length} people on your page`),
    s: E2("Solo sale quien aceptó. Su foto y su bio las pone cada quien.", "Only people who accepted show. Each one adds their own photo and bio."),
    tag: d.pro ? E2("TODO TU EQUIPO", "WHOLE TEAM") : E2("FREE · 1 PERSONA", "FREE · 1 PERSON"), tone: "neutral",
    progT: `${work}${E2(" de ", " of ")}${shown.length}${E2(" trabajan hoy", " working today")}`, progR: `${pc} %`, pct: `${Math.max(work ? 3 : 0, pc)}%`, barC: "var(--tl-open)",
    stats: [
      { k: E2("EN TU EQUIPO", "ON YOUR TEAM"), v: String(ok.length), s: ok.length === 1 ? E2("persona", "person") : E2("personas", "people") },
      { k: E2("PIDEN UNIRSE", "ASK TO JOIN"), v: String(req.length), s: E2("por responder", "to answer"), fg: req.length ? "var(--tl-action)" : undefined },
      { k: E2("INVITADOS", "INVITED"), v: String(inv.length), s: E2("sin aceptar", "not accepted") },
    ],
    tools: [{ icon: "search", l: E2("Ver página", "View page"), onClick: () => window.open(`/n/${d.id}`, "_blank") }, { icon: "plus", l: E2("Invitar", "Invite"), onClick: () => c.det("stf:new") }],
  });
  const pic = (m: Persona): Partial<Fila> => (m.photo ? { img: `url("${m.photo}")` } : { imgIni: m.name.slice(0, 1) });
  if (req.length) out.push({ type: "rows", k: E2(`PIDEN UNIRSE A TU EQUIPO · ${req.length}`, `ASK TO JOIN YOUR TEAM · ${req.length}`), items: req.map((m): Fila => ({ ...pic(m), imgW: "44px", t: m.name, s: [L(c, m.role), cuando(c, m.invitedAt, c.ahora)].filter(Boolean).join(" · "), tag: E2("POR RESPONDER", "TO ANSWER"), tone: "action", onClick: () => c.det(`stf:${m.id}`) })) });
  out.push({ type: "rows", k: E2(`TU EQUIPO · ${ok.length}`, `YOUR TEAM · ${ok.length}`), link: E2("Invitar", "Invite"), onLink: () => c.det("stf:new"),
    items: ok.map((m): Fila => {
      const td = hoyPersona(semanaDe(c, m), dow, t, c.es), frX = !d.pro && m.kind !== "owner" && m.show;
      return { ...pic(m), imgW: "44px", t: m.name, s: [L(c, m.role), td.l].filter(Boolean).join(" · "),
        tag: m.hidden !== null ? E2("QUITADO POR TO’LATINO", "REMOVED BY TO’LATINO") : !m.show ? E2("NO SALE", "HIDDEN") : frX ? E2("NO SALE CON FREE", "NOT ON FREE") : null,
        tone: m.hidden !== null ? "danger" : "neutral", dim: !m.show || frX, onClick: () => c.det(`stf:${m.id}`) };
    }).concat(ok.length === 1 && !inv.length ? [{ icon: "plus", t: E2("Invita a quien trabaja contigo", "Invite who works with you"), s: E2("Le mandamos un SMS. Cuando acepte, sale en tu página con su foto.", "We text them. Once they accept, they show on your page with their photo."), onClick: () => c.det("stf:new") }] : []) });
  if (inv.length) out.push({ type: "rows", k: E2(`INVITACIONES SIN ACEPTAR · ${inv.length}`, `INVITES NOT ACCEPTED · ${inv.length}`), items: inv.map((m): Fila => ({ ...pic(m), imgW: "44px", t: m.name, s: `${E2("Enviada ", "Sent ")}${cuando(c, m.invitedAt, c.ahora)} · SMS · ${m.phone}`, dim: true, onClick: () => c.det(`stf:${m.id}`) })) });
  if (!d.pro && ok.length > 1) out.push({ type: "note", tone: "warn", t: E2("Con Free sale 1 persona en tu página: tú. Con Pro sale todo tu equipo, cada quien con su horario.", "On Free, 1 person shows on your page: you. On Pro, your whole team shows, each with a schedule.") });
  return out;
}

const smsToast = (c: Ctx, si: string) => (r: { sms?: boolean }) => (r.sms ? si : c.E2("Invitación guardada. El SMS de invitación todavía no sale: avísale tú a la persona.", "Invite saved. The invite text is not sent yet: let the person know yourself."));

export function equipoDetalle(c: Ctx, mid: string): Sec {
  const { d, E2 } = c, out: (Bloque | null)[] = [], H = (o: { eye?: string; t: string; s?: string }): Bloque => ({ type: "head", onBack: c.closeDet, ...o });
  const DN = c.es ? ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], ORD = [1, 2, 3, 4, 5, 6, 0];
  const wkL = (wk: Semana | null, js: number) => (wk && wk[js] ? `${fmtHora(wk[js]![0])} – ${fmtHora(wk[js]![1])}` : E2("Libre", "Off"));
  const sp = SP[d.cat] ?? ["espacio", "space"];
  const txt = (k: string, val: string, set: (v: string) => void, ph: string, max: number, o?: { area?: boolean; im?: string }): Bloque =>
    ({ type: "field", k, val, onChange: set, ph, max, area: o?.area, rows: 3, im: o?.im, count: `${val.length}/${max}` });

  if (mid === "new") {
    const canRent = !NO_RENTA.includes(d.cat), bell = d.cat === "NEG-BELL";
    const F = c.form(`det:stf:new:${d.id}`, { kind: "emp", name: "", phone: "", r0: "" }), x = F.d, ph = x.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    out.push(H({ eye: "STAFF", t: E2("Invitar a alguien", "Invite someone"), s: E2("Le mandamos un SMS. Cuando acepte, pone su foto y su bio, y sale en tu página.", "We text them. Once they accept, they add their photo and bio and show on your page.") }));
    if (canRent) out.push({ type: "chips", k: E2("QUIÉN ES", "WHO IS IT"), items: ([["emp", E2("Trabaja para ti", "Works for you")], ["renta", E2(`Renta ${sp[0]} · su propio negocio`, `Rents a ${sp[1]} · own business`)]] as const).map(([k, l]) => ({ l, v: x.kind === k ? "selected" : "filter", onClick: () => F.set({ kind: k }) })) });
    out.push(txt(E2("NOMBRE", "NAME"), x.name, (v) => F.set({ name: v }), E2("Ej. Yahaira Cruz", "e.g. Yahaira Cruz"), 40));
    out.push(txt(E2("TELÉFONO · LE LLEGA EL SMS", "PHONE · GETS THE TEXT"), x.phone, (v) => F.set({ phone: v.replace(/[^0-9()\-\s+]/g, "") }), "(570) 555-0123", 16, { im: "tel" }));
    if (!bell) out.push(txt(E2("QUÉ HACE · LO VE EL CLIENTE", "WHAT THEY DO · CLIENTS SEE IT"), x.r0, (v) => F.set({ r0: v }), E2("Ej. Cocina, Delivery, Caja", "e.g. Kitchen, Delivery, Register"), 40));
    const dueño = first(d.owner ?? d.name), host = typeof location !== "undefined" ? location.host : "tolatino.app";
    out.push({ type: "note", tone: "ink", icon: "chat", t: E2(`Le llega: «${dueño} te invitó al equipo de ${d.name} en To’Latino. Acepta y pon tu foto aquí: ${host}/e/…». Vence en 7 días.`, `They get: “${dueño} invited you to the ${d.name} team on To’Latino. Accept and add your photo here: ${host}/e/…”. Expires in 7 days.`) });
    const dup = ph.length === 10 && d.equipo.some((m) => m.st !== "gone" && m.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") === ph);
    const miss = [x.name.trim().length < 2 ? E2("nombre", "name") : null, ph.length !== 10 ? E2("teléfono de 10 números", "10-digit phone") : null, !bell && !x.r0.trim() ? E2("qué hace", "what they do") : null].filter(Boolean);
    if (dup) out.push({ type: "note", tone: "warn", t: E2("Ese teléfono ya está en tu equipo.", "That phone is already on your team.") });
    else if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: `${E2("Para enviar falta: ", "To send, add: ")}${miss.join(" · ")}.` });
    return { blocks: out, ed: { F, l: E2("Mandar invitación", "Send invite"), always: true, valid: !miss.length && !dup, apply: (z) => equipoInvitar(d.id, { kind: z.kind, name: z.name, phone: z.phone, role: z.r0 }), toast: smsToast(c, E2("Invitación enviada por SMS.", "Invite sent by SMS.")), onDone: c.closeDet } };
  }

  const m = d.equipo.find((x) => x.id === mid);
  if (!m || m.st === "gone") return { blocks: [H({ t: E2("Ya no está en tu equipo", "No longer on your team") })], ed: null };
  const fn = first(m.name), pic: Partial<Fila> = m.photo ? { img: `url("${m.photo}")` } : { imgIni: fn.slice(0, 1) };

  if (m.st === "inv") {
    const cx = c.ui.stfCx === m.id;
    out.push(H({ eye: E2("INVITACIÓN SIN ACEPTAR", "INVITE NOT ACCEPTED"), t: m.name, s: L(c, m.role) }));
    out.push({ type: "kv", items: [{ k: E2("TELÉFONO", "PHONE"), v: m.phone || "—" }, { k: E2("ENVIADA", "SENT"), v: `${cuando(c, m.invitedAt, c.ahora)} · SMS` }, { k: E2("VENCE", "EXPIRES"), v: E2("A los 7 días · la puedes reenviar", "After 7 days · you can resend it") }] });
    out.push({ type: "note", tone: "info", icon: "users", t: E2("No sale en tu página hasta que acepte. Cuando acepte, pone su foto y su bio, y te avisamos.", "Not on your page until they accept. Then they add their photo and bio, and we let you know.") });
    out.push({ type: "acts", items: cx
      ? [{ l: E2("Sí, cancelar invitación", "Yes, cancel invite"), v: "danger", icon: "trash", onClick: () => c.run(() => equipoCancelar(d.id, m.id), E2("Invitación cancelada.", "Invite canceled."), () => { c.setUi({ stfCx: null }); c.closeDet(); }) }, { l: "No", v: "secondary", onClick: () => c.setUi({ stfCx: null }) }]
      : [{ l: E2("Reenviar SMS", "Resend SMS"), icon: "chat", v: "secondary", off: c.pending, onClick: () => c.run(() => equipoReenviar(d.id, m.id), smsToast(c, E2(`Le volvimos a mandar el SMS a ${fn}.`, `We texted ${fn} again.`))) }, { l: E2("Cancelar invitación", "Cancel invite"), icon: "trash", v: "secondary", onClick: () => c.setUi({ stfCx: m.id }) }] });
    return { blocks: out, ed: null };
  }
  if (m.st === "req") {
    const nn = c.ui.stfNo === m.id;
    out.push(H({ eye: E2("PIDE UNIRSE A TU EQUIPO", "ASKS TO JOIN YOUR TEAM"), t: m.name, s: cuando(c, m.invitedAt, c.ahora) }));
    if (m.msg) out.push({ type: "note", tone: "ink", icon: "chat", t: `«${L(c, m.msg)}»` });
    out.push({ type: "kv", items: [{ k: E2("TELÉFONO", "PHONE"), v: m.phone || "—" }, { k: E2("ENTRA COMO", "JOINS AS"), v: L(c, m.role) || (m.kind === "renter" ? E2(`Renta ${sp[0]}`, `Rents a ${sp[1]}`) : "—") }] });
    out.push({ type: "note", tone: "info", icon: "users", t: E2("Si aceptas, sale en tu página con su foto y su bio. Tú pones lo que hace y su horario.", "If you accept, they show on your page with their photo and bio. You set what they do and their schedule.") });
    out.push({ type: "acts", items: nn
      ? [{ l: E2("Sí, no aceptar", "Yes, decline"), v: "danger", icon: "close", onClick: () => c.run(() => equipoResponder(d.id, m.id, false), E2(`${fn} no entra a tu equipo por ahora.`, `${fn} won’t join your team for now.`), () => { c.setUi({ stfNo: null }); c.closeDet(); }) }, { l: "No", v: "secondary", onClick: () => c.setUi({ stfNo: null }) }]
      : [{ l: E2("Aceptar", "Accept"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => equipoResponder(d.id, m.id, true), E2(`${fn} ya está en tu equipo y sale en tu página.`, `${fn} is on your team and shows on your page.`)) }, { l: E2("No aceptar", "Decline"), v: "secondary", onClick: () => c.setUi({ stfNo: m.id }) }] });
    return { blocks: out, ed: null };
  }

  // Persona del equipo (aceptada).
  const own = m.kind === "owner", propio = own && m.me, rent = m.kind === "renter", frX = !d.pro && !own, biz = semanaNegocio(d.horas);
  const F = c.form(`det:stf:${m.id}`, {
    role: [m.role?.es ?? "", m.role?.en ?? ""] as Bi, y: m.since ?? new Date().getFullYear(), sp: m.sp.map((x) => [x.es, x.en] as Bi), spN: "",
    same: m.same, wk: (m.wk ?? biz).map((x) => (x ? [x[0], x[1]] as [number, number] : null)) as Semana,
    photo: m.photo as string | null, photoUrl: m.photo as string | null, bio: [m.bio?.es ?? "", m.bio?.en ?? ""] as Bi, langs: m.langs,
  }), x = F.d;
  const dow = d.hoy.dow, t = ahoraDec(d.hoy.hm), tdy = hoyPersona(semanaDe(c, m), dow, t, c.es);
  if (m.hidden !== null) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino quitó a ${fn} de tu página${m.hidden ? `: ${m.hidden}` : ""}. Sigue en tu equipo.`, `To’Latino removed ${fn} from your page${m.hidden ? `: ${m.hidden}` : ""}. They stay on your team.`) });
  out.push(H({ eye: (L(c, m.role) || (own ? E2("Dueño", "Owner") : "")).toUpperCase(), t: m.name, s: tdy.l }));
  if (frX) out.push({ type: "note", tone: "warn", t: E2(`Con Free sale 1 persona en tu página: tú. ${fn} sale cuando tengas Pro.`, `On Free, 1 person shows on your page: you. ${fn} shows once you have Pro.`) });
  if (!own) out.push({ type: "rows", items: [{ icon: "store", t: E2("Sale en tu página", "Shows on your page"), s: m.show ? E2("En la pestaña Staff y en «Quién está detrás».", "In the Staff tab and “Who is behind it”.") : E2("Apagado: sigue en tu equipo, pero no sale.", "Off: still on your team, but hidden."), tgOn: m.show,
    onTg: () => c.run(() => equipoMostrar(d.id, m.id, !m.show), m.show ? E2(`${fn} ya no sale en tu página.`, `${fn} no longer shows on your page.`) : E2(`${fn} ya sale en tu página.`, `${fn} now shows on your page.`)) }] });
  if (propio) {
    out.push({ type: "group", k: E2("TU PERFIL · LO VE EL CLIENTE", "YOUR PROFILE · CLIENTS SEE IT") });
    out.push({ type: "photos", k: E2("TU FOTO", "YOUR PHOTO"), count: `${x.photoUrl ? 1 : 0}/1`, cols: 3, items: x.photoUrl ? [{ bg: `url("${x.photoUrl}")`, onClick: () => F.set({ photo: null, photoUrl: null }) }] : [],
      onAdd: x.photoUrl ? undefined : () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.id && r.url) F.set({ photo: r.id, photoUrl: r.url }); else c.toast(r.mensaje ? (c.es ? r.mensaje.es : r.mensaje.en) : E2("Una foto no se pudo abrir.", "A photo could not be opened.")); }),
      addL: E2("Subir foto", "Upload photo") });
    if (x.photoUrl) out.push({ type: "note", tone: "info", icon: "image", t: E2("Toca la foto para cambiarla.", "Tap the photo to change it.") });
    out.push(txt(E2("TUS PALABRAS · SALEN EN «QUIÉN ESTÁ DETRÁS»", "YOUR WORDS · SHOWN IN “WHO IS BEHIND IT”"), x.bio[0], (v) => F.set({ bio: [v, x.bio[1]] }), E2("Cuenta cómo empezaste y qué haces mejor.", "Say how you started and what you do best."), 280, { area: true }));
    out.push({ type: "chips", k: E2("IDIOMAS", "LANGUAGES"), items: (["es", "en", "pt"] as const).map((k) => { const on = x.langs.includes(k); return { l: LANG[k]!, v: on ? "selected" : "filter", onClick: () => F.set({ langs: on ? x.langs.filter((z) => z !== k) : x.langs.concat(k) }) }; }) });
  } else if (!own) {
    out.push({ type: "rows", k: `${E2("LO PONE ", "SET BY ")}${fn.toUpperCase()}`, items: [{ ...pic, imgW: "44px", t: E2("Su foto y sus palabras", "Photo and words"), s: L(c, m.bio) || E2("Todavía no escribe nada.", "Nothing written yet."), chev: false }, { icon: "language", t: E2("Idiomas", "Languages"), s: m.langs.map((k) => LANG[k] ?? k).join(" · "), chev: false, compact: true }] });
  }
  out.push({ type: "group", k: E2("LO QUE PONES TÚ", "WHAT YOU SET") });
  out.push(txt(E2("ROL · LO VE EL CLIENTE", "ROLE · CLIENTS SEE IT"), x.role[0], (v) => F.set({ role: [v, x.role[1]] }), E2("Ej. Cocina y parrilla", "e.g. Kitchen and grill"), 40));
  const yMax = Number(d.hoy.fecha.slice(0, 4));
  out.push({ type: "step", t: E2(`En ${d.name} desde`, `At ${d.name} since`), v: String(x.y), onM: () => F.set({ y: Math.max(1970, x.y - 1) }), onP: () => F.set({ y: Math.min(yMax, x.y + 1) }) });
  out.push({ type: "chips", k: E2("ESPECIALIDADES · HASTA 4", "SPECIALTIES · UP TO 4"), help: x.sp.length ? E2("TOCA UNA PARA QUITARLA", "TAP ONE TO REMOVE IT") : E2("LO QUE MEJOR HACE", "WHAT THEY DO BEST"), items: x.sp.map((s, i) => ({ l: `${s[0]}  ×`, v: "selected", onClick: () => F.set({ sp: x.sp.filter((_, j) => j !== i) }) })) });
  if (x.sp.length < 4) {
    out.push(txt(E2("AGREGAR ESPECIALIDAD", "ADD A SPECIALTY"), x.spN, (v) => F.set({ spN: v }), d.cat === "NEG-FOOD" ? E2("Ej. Catering", "e.g. Catering") : E2("Ej. Diseños", "e.g. Designs"), 24));
    out.push({ type: "acts", items: [{ l: E2("Agregar", "Add"), icon: "plus", v: "secondary", off: !x.spN.trim(), onClick: () => { if (x.spN.trim()) F.set({ sp: x.sp.concat([[x.spN.trim(), ""]]), spN: "" }); } }] });
  }
  out.push({ type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL") });
  out.push(txt(E2("ROL EN INGLÉS", "ROLE IN ENGLISH"), x.role[1], (v) => F.set({ role: [x.role[0], v] }), E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one."), 40));
  x.sp.forEach((s, i) => out.push(txt(`${E2("ESPECIALIDAD EN INGLÉS · ", "SPECIALTY IN ENGLISH · ")}${s[0].toUpperCase()}`, s[1], (v) => F.set({ sp: x.sp.map((y, j) => (j === i ? [y[0], v] as Bi : y)) }), "", 24)));
  if (propio && x.bio[0].trim()) out.push(txt(E2("TUS PALABRAS EN INGLÉS", "YOUR WORDS IN ENGLISH"), x.bio[1], (v) => F.set({ bio: [x.bio[0], v] }), "", 280, { area: true }));
  out.push(...licenciaPersona(c, m));
  out.push({ type: "group", k: E2("HORARIO", "SCHEDULE") });
  if (rent) {
    out.push({ type: "note", tone: "info", icon: "key", t: E2(`Renta ${sp[0]} contigo: su agenda es suya y la maneja en su página. Así sale hoy.`, `Rents a ${sp[1]} from you: the schedule is theirs, managed on their page. This is how it shows today.`) });
    out.push({ type: "rows", items: ORD.map((js): Fila => ({ icon: "clock", t: DN[js]!, r: wkL(semanaDe(c, m), js), compact: true, chev: false, dim: !(semanaDe(c, m) ?? [])[js] })) });
  } else {
    out.push({ type: "chips", items: ([[true, E2("Igual que el negocio", "Same as the business")], [false, E2("Su propio horario", "Their own schedule")]] as const).map(([v, l]) => ({ l, v: x.same === v ? "selected" : "filter", onClick: () => F.set({ same: v }) })) });
    if (x.same) out.push({ type: "rows", items: ORD.map((js): Fila => ({ icon: "clock", t: DN[js]!, r: wkL(biz, js), compact: true, chev: false, dim: !biz[js] })) });
    else {
      const sel: number = c.ui.stfDay != null && c.ui.stfDay >= 0 ? c.ui.stfDay : ORD.find((js) => x.wk[js]) ?? 1, setD = (js: number, v: [number, number] | null) => F.set({ wk: x.wk.map((z, j) => (j === js ? v : z)) });
      out.push({ type: "rows", items: ORD.map((js): Fila => ({ icon: "clock", t: DN[js]!, s: wkL(x.wk, js), tgOn: !!x.wk[js], onTg: () => { setD(js, x.wk[js] ? null : biz[js] ? [biz[js]![0], Math.min(24, biz[js]![1])] : [9, 17]); c.setUi({ stfDay: js }); }, onClick: () => c.setUi({ stfDay: js }), ...(sel === js && x.wk[js] ? { bd: "1.5px solid var(--tl-ink)" } : {}) })) });
      const w = x.wk[sel];
      if (w) out.push(
        { type: "step", t: `${DN[sel]}${E2(" · entra", " · starts")}`, v: fmtHora(w[0]), onM: () => setD(sel, [Math.max(5, w[0] - 0.5), w[1]]), onP: () => setD(sel, [Math.min(w[1] - 0.5, w[0] + 0.5), w[1]]) },
        { type: "step", t: `${DN[sel]}${E2(" · sale", " · ends")}`, v: fmtHora(w[1]), onM: () => setD(sel, [w[0], Math.max(w[0] + 0.5, w[1] - 0.5)]), onP: () => setD(sel, [w[0], Math.min(24, w[1] + 0.5)]) });
      const shut = ORD.filter((js) => x.wk[js] && !biz[js]);
      if (shut.length) out.push({ type: "note", tone: "warn", icon: "warning", t: E2(`Trabaja el ${shut.map((js) => DN[js]!.toLowerCase()).join(", ")} y ese día tu negocio está cerrado. Así sale en su perfil.`, `Works on ${shut.map((js) => DN[js]).join(", ")} and your business is closed that day. It shows like that on their profile.`) });
    }
  }
  { // Así lo ve el cliente
    const wkP = rent ? semanaDe(c, m) : x.same ? biz : x.wk, tP = hoyPersona(wkP, dow, t, c.es), spP = x.sp.map((s) => (c.es ? s[0] : s[1] || s[0])).filter(Boolean);
    const why = m.hidden !== null ? E2("To’Latino lo quitó de tu página.", "To’Latino removed them from your page.") : !own && !m.show ? E2("Apagaste «Sale en tu página».", "You turned off “Shows on your page”.") : frX ? E2("Con Free solo sales tú.", "On Free only you show.") : "";
    const fotoP = propio ? (x.photoUrl ? { img: `url("${x.photoUrl}")` } : { imgIni: fn.slice(0, 1) }) : pic;
    out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW CLIENTS SEE IT"), items: why ? [{ icon: "ban", t: E2("Hoy no sale en tu página", "Not on your page today"), s: why, compact: true, chev: false }]
      : ([{ ...fotoP, imgW: "36px", t: m.name, s: `${c.es ? x.role[0] : x.role[1] || x.role[0]}${E2(" · desde ", " · since ")}${x.y}`, compact: true, chev: false }, { icon: "clock", t: tP.l, compact: true, chev: false }] as Fila[]).concat(spP.length ? [{ icon: "star", t: spP.join(" · "), compact: true, chev: false }] : []) });
  }
  const miss = [!x.role[0].trim() ? E2("rol", "role") : null, !rent && !x.same && !x.wk.some(Boolean) ? E2("al menos un día de trabajo", "at least one work day") : null].filter(Boolean);
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: `${E2("Para guardar falta: ", "To save, add: ")}${miss.join(" · ")}.` });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !miss.length, apply: (z) => equipoGuardar(d.id, m.id, { role: z.role, y: z.y, sp: z.sp, same: z.same, wk: z.wk, ...(propio ? { photo: z.photo, bio: z.bio, langs: z.langs } : {}) }) };
  const tail: (Bloque | null)[] = [];
  if (!own) {
    const del = c.ui.stfDel === m.id;
    if (del) tail.push({ type: "note", tone: "warn", icon: "warning", t: E2(`${fn} sale de tu página y de tu equipo.${rent ? " Su página propia sigue igual." : ""}`, `${fn} leaves your page and your team.${rent ? " Their own page stays the same." : ""}`) });
    tail.push({ type: "acts", items: del
      ? [{ l: E2("Sí, quitar del equipo", "Yes, remove from team"), v: "danger", icon: "trash", onClick: () => c.run(() => equipoQuitar(d.id, m.id), E2(`${fn} ya no está en tu equipo.`, `${fn} is no longer on your team.`), () => { c.setUi({ stfDel: null }); c.closeDet(); }) }, { l: "No", v: "secondary", onClick: () => c.setUi({ stfDel: null }) }]
      : [{ l: E2("Quitar del equipo", "Remove from team"), icon: "trash", v: "secondary", onClick: () => c.setUi({ stfDel: m.id }) }] });
  }
  return { blocks: out, ed, tail };
}

/* SU LICENCIA (Doctores y Profesionales, 4h-3 · fase4-salud-pro.md §4h «Equipo / Staff»): cada profesional con su licencia
   y su número; To’Latino la verifica en el registro oficial antes de que salga. Solo quien la tiene VERIFICADA sale para
   elegir en «¿Con quién?»; recepción sale en el equipo pero no se elige. Quitarla no pide nada: es de la persona. */
function licenciaPersona(c: Ctx, m: Persona): Bloque[] {
  const { d, E2 } = c, L0 = d.licEq;
  if (!L0 || m.st !== "ok") return [];
  const mias = L0.filas.filter((x) => x.member === m.id), fn = first(m.name);
  const F = c.form<{ k: string; n: string }>(`licp:${m.id}`, { k: "", n: "" });
  const out: Bloque[] = [{ type: "group", k: E2("SU LICENCIA", "THEIR LICENSE") }];
  const ST = (st: string) => st === "valid" ? { s: E2("Verificada por To’Latino · sale en tu página", "Verified by To’Latino · shows on your page"), tag: E2("VERIFICADA", "VERIFIED"), tone: "signal", ibg: "rgba(0,229,196,.14)", ifg: "var(--tl-open-text)" }
    : st === "review" ? { s: E2("En revisión · To’Latino la verifica en 72 h", "In review · To’Latino verifies it within 72 h"), tag: E2("EN REVISIÓN", "IN REVIEW"), tone: "action", ibg: "rgba(255,176,32,.14)", ifg: "var(--tl-pro-ink)" }
      : { s: E2("No se pudo verificar · revisa el número", "Could not be verified · check the number"), tag: E2("NO VERIFICADA", "NOT VERIFIED"), tone: "danger", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)" };
  if (mias.length) out.push({ type: "rows", items: mias.map((x): Fila => { const st = ST(x.status); return { key: x.id, icon: "law", ibg: st.ibg, ifg: st.ifg, t: c.es ? x.title.es : x.title.en || x.title.es, s: `${st.s} · ${x.label} ${x.number ?? "—"}`, tag: st.tag, tone: st.tone,
    acts: [{ l: E2("Quitar", "Remove"), v: "secondary", off: c.pending, onClick: () => c.run(() => licenciaQuitar(d.id, x.id), E2("Licencia quitada.", "License removed.")) }] }; }) });
  if (!mias.some((x) => x.status === "valid")) out.push({ type: "note", tone: "info", icon: "law", t: E2(`${fn} sale en tu equipo, pero no para elegir en «¿Con quién?» hasta que su licencia esté verificada.`, `${fn} shows on your team, but cannot be picked in “With whom?” until their license is verified.`) });
  const libres = L0.catalogo.filter((k) => !mias.some((x) => x.kind === k.key));
  if (!libres.length) return out;
  out.push({ type: "chips", k: E2("AGREGAR SU LICENCIA", "ADD THEIR LICENSE"), help: E2("se verifica antes de salir", "verified before it shows"), items: libres.map((k) => ({ l: k.l, v: F.d.k === k.key ? "selected" : "filter", onClick: () => F.set({ k: F.d.k === k.key ? "" : k.key }) })) });
  if (F.d.k) {
    out.push({ type: "field", k: E2("NÚMERO DE LICENCIA", "LICENSE NUMBER"), val: F.d.n, max: 40, ph: E2("Como sale en su licencia", "As it appears on their license"), onChange: (v) => F.set({ n: v.replace(/[^A-Za-z0-9 #./-]/g, "") }), help: E2("Con el número, el equipo la busca en el registro oficial del estado.", "With the number, the team looks it up in the state’s official registry.") });
    out.push({ type: "acts", items: [{ l: E2("Mandar a verificar", "Send for verification"), v: "primary", icon: "law", off: c.pending || !F.d.n.trim(), onClick: () => c.run(() => licenciaAgregar(d.id, F.d.k, m.id, F.d.n), E2("Enviada. To’Latino la verifica en 72 h.", "Sent. To’Latino verifies it within 72 h."), () => F.set({ k: "", n: "" })) }] });
  }
  return out;
}
