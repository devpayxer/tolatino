"use client";
/* Lo que vendes › Servicios, Citas y Sillas y agenda (Panel v2 · svcBlocks / svcDet / citas / dash2-cat «Sillas y
   agenda»). Servicios: categorías, duración, tiempo entre citas, precio fijo o desde, quién lo hace (o el precio de
   cada silla), opciones que cambian precio y tiempo, extras. Citas: aprobar al instante, cuánto tardas en contestar,
   depósito, cancelar gratis hasta, el cliente elige con quién. Con sillas rentadas, cada silla decide lo suyo. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { sillaInvitarCobro } from "./acciones-servicios";
import { subirFoto } from "@/lib/subir-foto";
import type { Persona, Servicio, SvcPanel } from "@/lib/servicios";
import { citasGuardar, citasModulo, modeloGuardar, servicioGuardar, servicioMover, servicioQuitar, servicioVisible, sillaGuardar, type ServicioIn } from "./acciones-servicios";
import type { Ctx, Sec } from "./Panel";
import { filaHerramientaSP } from "./SaludPro";
import { filaHerramientaFiesta } from "./Fiestas";
import { filaHerramientaTrans } from "./Transporte";

const fp = (cents: number) => { const p = (Number(cents) || 0) / 100; return "$" + (p % 1 ? p.toFixed(2) : String(p)); };
const durL = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const minPositivo = (L: number[]) => { const P = L.filter((v) => v > 0); return P.length ? Math.min(...P) : 0; };
const first = (n: string) => n.split(" ")[0] ?? n;
const S = (c: Ctx): SvcPanel => c.svc ?? { rubro: null, sp: null, fiesta: null, trans: null, model: "emp", rent: null, comm: null, secciones: [], servicios: [], gente: [], pol: { auto: false, resp: 30, dep: 0, cxh: 2, tol: 15, pick: true, exp: 2 }, on: false, off: { svc: null, citas: null } };
const MODEL = (c: Ctx): Record<SvcPanel["model"], [string, string]> => ({
  chair: [c.E2("Rentan silla", "Rent chairs"), c.E2("Cada barbero pone su precio y su agenda. Tú cobras la renta.", "Each barber sets their price and schedule. You collect rent.")],
  comm: [c.E2("A comisión", "On commission"), c.E2("Un precio para todos; a cada uno le toca su porcentaje.", "One price for everyone; each gets their percentage.")],
  emp: [c.E2("Empleados", "Employees"), c.E2("Un precio para todos; tú manejas la agenda.", "One price for everyone; you run the schedule.")],
});
const resL = (c: Ctx, m: number) => (m >= 60 ? c.E2(`${m / 60} h`, `${m / 60} h`) : `${m} min`);

/* Las filas de Lo que vendes para un negocio de citas. */
export function vendesCitas(c: Ctx): Fila[] {
  const { E2 } = c, X = S(c), svc = X.servicios.filter((s) => !s.extra), ex = X.servicios.filter((s) => s.extra), vis = svc.filter((s) => !s.oculto && !s.adm).length;
  const herr = filaHerramientaSP(c) ?? filaHerramientaFiesta(c) ?? filaHerramientaTrans(c);
  return [
    { icon: "scissors", t: E2("Servicios", "Services"), s: svc.length ? E2(`${svc.length} servicios · ${vis} en tu página${ex.length ? ` · ${ex.length} extras` : ""}`, `${svc.length} services · ${vis} on your page${ex.length ? ` · ${ex.length} extras` : ""}`) : E2("Activado · no sale hasta que agregues algo", "On · hidden until you add something"),
      ...(X.off.svc != null ? { m: E2("PAUSADO POR TO’LATINO · NO SALE EN TU PÁGINA", "PAUSED BY TO’LATINO · NOT ON YOUR PAGE"), mFg: "var(--tl-danger)" } : {}), tag: vis && X.off.svc == null ? E2("EN TU PÁGINA", "LIVE") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "servicios") },
    ...(herr ? [herr] : []),
    { icon: "calendar", t: E2("Citas", "Bookings"), s: citasLine(c), ...(X.off.citas != null ? { m: E2("PAUSADAS POR TO’LATINO", "PAUSED BY TO’LATINO"), mFg: "var(--tl-danger)" } : {}),
      tag: X.on && X.off.citas == null ? E2("ENCENDIDO", "ON") : null, tone: "signal", chev: true, onClick: () => c.go("mod", "citas") },
    ...(X.model === "chair" ? [{ icon: "users", t: E2("Sillas y agenda", "Chairs and schedule"), s: E2(`${X.gente.length} sillas · cada una decide si confirma al instante y su depósito`, `${X.gente.length} chairs · each decides instant approval and deposit`), chev: true, onClick: () => c.go("mod", "sillas") } as Fila] : []),
  ];
}
function citasLine(c: Ctx) {
  const { E2 } = c, X = S(c), p = X.pol;
  if (!X.on) return E2("Apagado · tu página no recibe solicitudes en línea", "Off · your page takes no online requests");
  if (X.model === "chair") return E2(`Cada silla decide · cancelar gratis hasta ${p.cxh} h antes`, `Each chair decides · free cancellation up to ${p.cxh} h before`);
  return `${p.auto ? E2("Al instante", "Instant") : E2(`Tú confirmas · ~${resL(c, p.resp)}`, `You confirm · ~${resL(c, p.resp)}`)} · ${p.dep ? E2(`depósito ${fp(p.dep)}`, `${fp(p.dep)} deposit`) : E2("sin depósito", "no deposit")}`;
}

/* ── Servicios: la lista ── */
export function serviciosBloques(c: Ctx): Sec {
  const { E2, ui } = c, X = S(c), chair = X.model === "chair", v = ui.svT || "svc";
  const W = X.gente.length === 1 ? null : E2("Barberos", "Barbers");
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Servicios", "Services"), onBack: () => c.go("mod"),
    act: { l: E2("Agregar", "Add"), icon: "plus", onClick: () => c.det(v === "ext" ? "svc:new:extra" : "svc:new") } }];
  if (X.off.svc != null) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Servicios: no salen en tu página. Motivo: ${X.off.svc}`, `To’Latino paused your Services: they do not show on your page. Reason: ${X.off.svc}`) });
  const nAdm = X.servicios.filter((s) => s.adm != null).length;
  if (nAdm) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`${nAdm === 1 ? "1 servicio lo ocultó" : `${nAdm} servicios los ocultó`} To’Latino: no ${nAdm === 1 ? "sale" : "salen"} en tu página.`, `${nAdm} service${nAdm === 1 ? " was" : "s were"} hidden by To’Latino.`) });
  out.push({ type: "rows", k: E2("CÓMO TRABAJA TU NEGOCIO", "HOW YOUR BUSINESS WORKS"), items: [{ icon: "users", t: MODEL(c)[X.model][0], s: MODEL(c)[X.model][1], r: X.model === "chair" && X.rent ? E2(`${fp(X.rent)}/semana`, `${fp(X.rent)}/week`) : X.model === "comm" && X.comm != null ? `${X.comm} %` : undefined, chev: true, onClick: () => c.det("svm") }] });
  const svc = X.servicios.filter((s) => !s.extra), ex = X.servicios.filter((s) => s.extra);
  out.push({ type: "tabs", items: [{ l: E2("Servicios", "Services"), n: String(svc.length), on: v === "svc", onClick: () => c.setUi({ svT: "svc" }) }, { l: E2("Extras", "Extras"), n: String(ex.length), on: v === "ext", onClick: () => c.setUi({ svT: "ext" }) },
    ...(W ? [{ l: W, n: String(X.gente.length), on: v === "ppl", onClick: () => c.setUi({ svT: "ppl" }) }] : [])] });
  if (v === "ppl") {
    out.push({ type: "rows", items: X.gente.map((p) => { const L = X.servicios.filter((s) => !s.extra && s.hacen.some((h) => h.id === p.id)), cs = L.map((s) => s.hacen.find((h) => h.id === p.id)?.cents ?? s.cents);
      return { key: p.id, img: p.foto ? `url("${p.foto}")` : undefined, imgIni: p.foto ? undefined : p.nombre.slice(0, 1), t: `${p.nombre}${p.kind === "owner" ? E2(" · tú", " · you") : ""}`, s: `${chair && p.silla ? E2(`Silla ${p.silla} · `, `Chair ${p.silla} · `) : ""}${E2(`Hace ${L.length} de ${svc.length}`, `Does ${L.length} of ${svc.length}`)}`,
        r: cs.length ? (Math.min(...cs) === Math.max(...cs) ? fp(cs[0]!) : `${fp(Math.min(...cs))}–${fp(Math.max(...cs))}`) : "—", tag: !p.recibe ? E2("NO RECIBE CITAS", "NO BOOKINGS") : null, tone: "neutral", chev: chair, onClick: chair ? () => c.go("mod", "sillas") : undefined }; }) });
    out.push({ type: "note", tone: "info", icon: "info", t: chair ? E2("Quién hace qué y a qué precio se pone en cada servicio. Si confirma al instante y su depósito, en Sillas y agenda.", "Who does what and at what price is set on each service. Instant approval and deposit, in Chairs and schedule.") : E2("Quién hace cada servicio se pone en el servicio. Para invitar a alguien, Tu página › Equipo.", "Who does each service is set on the service. To invite someone, Your page › Team."), cta: chair ? undefined : E2("Equipo", "Team"), onCta: chair ? undefined : () => c.go("pag", "equipo") });
    return { blocks: out, ed: null };
  }
  const L = v === "ext" ? ex : svc;
  if (!L.length) { out.push({ type: "empty", icon: "scissors", t: v === "ext" ? E2("Sin extras", "No extras") : E2("Aún no tienes servicios", "No services yet"), s: v === "ext" ? E2("Lo que se suma a un servicio: diseño, cejas, toalla caliente…", "What adds to a service: design, brows, hot towel…") : E2("Con nombre, precio y duración ya se puede reservar.", "Name, price and length are enough to book."), cta: E2("Agregar", "Add"), onCta: () => c.det(v === "ext" ? "svc:new:extra" : "svc:new") }); return { blocks: out, ed: null }; }
  const grupos = v === "ext" ? [{ id: "x", name: { es: E2("EXTRAS · SE SUMAN AL TIEMPO", "EXTRAS · ADD TO THE TIME"), en: "" } }] : X.secciones.filter((s) => L.some((x) => x.sec === s.id));
  for (const g of grupos) {
    const G = v === "ext" ? L : L.filter((x) => x.sec === g.id);
    out.push({ type: "rows", k: v === "ext" ? g.name.es : g.name.es.toUpperCase(), cols: c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : undefined, items: G.map((s, j) => fila(c, X, s, j, G.length)) });
  }
  if (!c.d.pro) out.push({ type: "note", tone: "warn", t: E2("Con Free se ven 5 en la página y hasta 10 pedidos o citas al mes.", "On Free, 5 show on the page and up to 10 online orders or bookings a month."), cta: "Pro", onCta: () => c.go("pay", "plan") });
  return { blocks: out, ed: null };
}
function fila(c: Ctx, X: SvcPanel, s: Servicio, j: number, n: number): Fila {
  const { E2 } = c, chair = X.model === "chair", cs = s.hacen.map((h) => h.cents ?? s.cents), lo = cs.length ? Math.min(...cs) : s.cents, hi = cs.length ? Math.max(...cs) : s.cents;
  const precio = s.k === "pct" ? `${s.cents / 100} %` : s.k === "free" ? E2("Gratis con seguro", "Free with insurance") : s.k === "cotiza" ? E2("Se cotiza", "Quoted") : s.k === "cons" && !s.cents ? E2("Gratis", "Free")
    : s.k === "fijo" && s.a?.gov ? `${fp(s.cents + s.a.gov)}${E2(" total", " total")}` : s.k === "hora" ? `${fp(s.cents)}/h` : s.extra ? `+${fp(s.cents)}` : chair && cs.length && lo !== hi ? `${fp(lo)}–${fp(hi)}` : `${s.desde ? E2("desde ", "from ") : ""}${fp(chair && cs.length ? lo : s.cents)}`;
  return {
    key: s.id, img: s.foto ? `url("${s.foto}")` : undefined, imgIni: s.foto ? undefined : s.name.es.slice(0, 1), imgW: "52px", t: s.name.es, s: s.desc.es || undefined,
    m: `${durL(s.dur)}${s.buf ? E2(` + ${s.buf} de limpieza`, ` + ${s.buf} cleanup`) : ""}${s.extra ? "" : chair ? E2(" · PRECIO SEGÚN EL BARBERO", " · PRICE BY BARBER") : X.gente.length > 1 ? E2(` · LO HACEN ${s.hacen.length} DE ${X.gente.length}`, ` · ${s.hacen.length} OF ${X.gente.length} DO IT`) : ""}${s.opts.length ? E2(` · ${s.opts.length} ${s.opts.length === 1 ? "OPCIÓN" : "OPCIONES"}`, ` · ${s.opts.length} OPTION${s.opts.length === 1 ? "" : "S"}`) : ""}`,
    r: precio, tag: s.adm != null ? E2("OCULTO POR TO’LATINO", "HIDDEN BY TO’LATINO") : s.oculto ? E2("OCULTO", "HIDDEN") : null, tone: s.adm != null ? "danger" : "neutral", dim: s.oculto || s.adm != null,
    onClick: () => c.det(`svc:${s.id}`),
    acts: [...(j > 0 ? [{ l: E2("Subir", "Up"), v: "soft", onClick: () => c.run(() => servicioMover(c.d.id, s.id, -1)) }] : []), ...(j < n - 1 ? [{ l: E2("Bajar", "Down"), v: "soft", onClick: () => c.run(() => servicioMover(c.d.id, s.id, 1)) }] : [])],
  };
}

/* ── Servicio: el editor (svcDet) ── */
type FSvc = { k: string; esc: boolean; gov: string; cred: boolean; rem: boolean; hrs: string; mes: boolean; unit: string; no: string; noEn: string;
  // Fiestas (4t): horas del paquete, invitados, montaje, lo que incluye (una por línea), unidad, invitados por unidad, mínimo.
  fh: number; fcap: string; fmont: boolean; finc: string; fu: string; fper: string; fmin: number;
  // Transporte (4w): salidas, de dónde sale, a dónde va, cuánto dura, asientos o personas, precio de niño, espera.
  tsal: number[]; tfrom: string; tto: string; tdmin: number; tpax: number; tchild: string; twait: number;
  name: string; en: string; desc: string; descEn: string; sec: string; newSec: string; price: string; desde: boolean; dur: number; buf: number; foto: string | null; visible: boolean; hacen: Record<string, string | null>; opts: { t: string; tEn: string; o: { n: string; nEn: string; p: number; m: number }[] }[] };
export function servicioDetalle(c: Ctx, id: string): Sec {
  const { E2, ui } = c, X = S(c), chair = X.model === "chair", isNew = id === "new" || id === "new:extra", s0 = X.servicios.find((x) => x.id === id);
  const back = () => c.closeDet();
  if (!isNew && !s0) return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: back }], ed: null };
  const ex = s0 ? s0.extra : id === "new:extra";
  const secEx = X.secciones.find((s) => /^extras$/i.test(s.name.es));
  const sec0 = s0?.sec ?? (ex ? secEx?.id ?? "" : X.secciones.find((s) => !/^extras$/i.test(s.name.es))?.id ?? "");
  const rub = X.rubro, sp0 = { k: s0?.k ?? (rub === "salud" ? "cons" : rub === "pro" ? "cons" : rub === "fiesta" ? "pack" : rub === "trans" ? "asiento" : ""),
    tsal: s0?.a?.sal ?? [], tfrom: s0?.a?.from?.es ?? "", tto: s0?.a?.to?.es ?? "", tdmin: s0?.a?.dmin ?? 120, tpax: s0?.a?.pax ?? (s0?.k === "priv" ? 4 : 14), tchild: s0?.a?.child ? String(s0.a.child / 100) : "", twait: s0?.a?.wait ?? 0,
    fh: s0?.a?.h ?? 4, fcap: s0?.a?.cap ? String(s0.a.cap) : "", fmont: !!s0?.a?.mont, finc: (s0?.a?.inc ?? []).map((z) => z.es).join("\n"), fu: s0?.a?.u?.es ?? "", fper: s0?.a?.per ? String(s0.a.per) : "", fmin: s0?.a?.min ?? 1, esc: !!s0?.a?.esc, gov: s0?.a?.gov ? String(s0.a.gov / 100) : "", cred: !!s0?.a?.cred, rem: !!s0?.a?.rem, hrs: s0?.a?.hrs ?? "", mes: !!s0?.a?.mes,
    unit: s0?.a?.unit ?? "caso", no: s0?.a?.no?.[0]?.es ?? "", noEn: s0?.a?.no?.[0]?.en ?? "" };
  const base: FSvc = s0 ? { ...sp0, price: s0.k === "pct" ? String(s0.cents / 100) : String(s0.cents / 100), name: s0.name.es, en: s0.name.en, desc: s0.desc.es, descEn: s0.desc.en, sec: s0.sec ?? "", newSec: "", desde: s0.desde, dur: s0.dur, buf: s0.buf, foto: s0.foto, visible: !s0.oculto,
      hacen: Object.fromEntries(X.gente.map((p) => { const h = s0.hacen.find((z) => z.id === p.id); return [p.id, h ? (h.cents == null ? "" : String(h.cents / 100)) : null]; })),
      opts: s0.opts.map((g) => ({ t: g.t.es, tEn: g.t.en, o: g.o.map((o) => ({ n: o.n.es, nEn: o.n.en, p: o.p / 100, m: o.m })) })) }
    : { ...sp0, name: "", en: "", desc: "", descEn: "", sec: sec0, newSec: ex && !secEx ? "Extras" : "", price: ex ? "5" : "", desde: !ex, dur: ex ? 10 : 30, buf: 0, foto: null, visible: true, hacen: Object.fromEntries(X.gente.map((p) => [p.id, ""])), opts: [] };
  const F = c.form<FSvc>(`det:svc:${id}`, base), d = F.d, setF = F.set, out: (Bloque | null)[] = [];
  if (s0?.adm != null) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino ocultó este servicio: no sale en tu página. Motivo: ${s0.adm}`, `To’Latino hid this service: it is not on your page. Reason: ${s0.adm}`) });
  const secName = X.secciones.find((s) => s.id === d.sec)?.name.es ?? d.newSec;
  out.push({ type: "head", eye: `${ex ? "EXTRA" : E2("SERVICIO", "SERVICE")}${secName && !ex ? ` · ${secName.toUpperCase()}` : ""}`, t: isNew ? (ex ? E2("Nuevo extra", "New extra") : E2("Nuevo servicio", "New service")) : s0!.name.es, s: isNew ? E2("Con nombre, precio y duración ya se puede reservar.", "Name, price and length are enough to book.") : undefined, onBack: back });
  out.push({ type: "photos", k: E2("FOTO · LA VE EL CLIENTE EN SERVICIOS Y AL RESERVAR", "PHOTO · CLIENTS SEE IT IN SERVICES AND WHEN BOOKING"), count: `${d.foto ? 1 : 0}/1`, cols: 3, items: d.foto ? [{ key: d.foto, bg: `url("${d.foto}")`, onClick: () => setF({ foto: null }) }] : [],
    addL: E2("Subir foto", "Upload photo"), onAdd: d.foto ? undefined : () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!); if (r.ok && r.url) setF({ foto: r.url }); else c.toast(r.mensaje ? r.mensaje[c.es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
  const gal = c.d.fotos.map((x) => x.url);
  if (gal.length && !d.foto) { out.push({ type: "acts", items: [{ l: ui.svGal ? E2("Cerrar tu galería", "Close your gallery") : E2("Elegir de tu galería", "Pick from your gallery"), icon: "image", onClick: () => c.setUi({ svGal: !ui.svGal }) }] });
    if (ui.svGal) out.push({ type: "photos", cols: 4, items: gal.slice(0, 12).map((ph) => ({ key: ph, bg: `url("${ph}")`, onClick: () => { setF({ foto: ph }); c.setUi({ svGal: false }); } })) }); }
  if (d.foto) out.push({ type: "note", tone: "info", icon: "image", t: E2("Toca la foto para quitarla.", "Tap the photo to remove it.") });
  const fld = (k: string, prop: "name" | "en" | "desc" | "descEn", max: number, ph?: string, area?: boolean, help?: string): Bloque => ({ type: "field", k, val: d[prop], area, rows: 2, max, ph, help, count: `${d[prop].length}/${max}`, onChange: (v) => setF({ [prop]: v.slice(0, max) } as Partial<FSvc>) });
  out.push({ type: "group", k: E2("NOMBRE Y DESCRIPCIÓN", "NAME AND DESCRIPTION") }, fld(E2("NOMBRE", "NAME"), "name", 50, ex ? E2("Ej. Diseño", "e.g. Design") : rub === "trans" ? E2("Ej. Hazleton → Washington Heights", "e.g. Hazleton → Washington Heights") : rub === "fiesta" ? E2("Ej. Sábado · 6 horas", "e.g. Saturday · 6 hours") : rub === "salud" ? E2("Ej. Consulta general", "e.g. General visit") : rub === "pro" ? E2("Ej. Renovar green card", "e.g. Green card renewal") : E2("Ej. Fade", "e.g. Fade")),
    fld(E2("DESCRIPCIÓN · OPCIONAL", "DESCRIPTION · OPTIONAL"), "desc", 120, ex ? E2("Ej. Líneas o diseño en la nuca", "e.g. Lines or a design at the nape") : rub === "trans" ? E2("Ej. Salidas 5 AM, 1 PM y 7 PM desde 15 N Wyoming St.", "e.g. Departures 5 AM, 1 PM and 7 PM from 15 N Wyoming St.") : rub === "fiesta" ? E2("Ej. Salón para 250, mesas, sillas, manteles y pista.", "e.g. Hall for 250, tables, chairs, linens and dance floor.") : rub === "salud" ? E2("Ej. Fiebre, gripe, presión. Te ve un médico o una enfermera practicante.", "e.g. Fever, flu, blood pressure. A doctor or nurse practitioner sees you.") : rub === "pro" ? E2("Ej. Formulario I-90, revisión y envío a USCIS.", "e.g. Form I-90, review and filing with USCIS.") : E2("Ej. Low, mid o high, con navaja", "e.g. Low, mid or high, with razor"), true),
    { type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL") }, fld(E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), "en", 50, E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one.")));
  if (d.desc.trim()) out.push(fld(E2("DESCRIPCIÓN EN INGLÉS", "DESCRIPTION IN ENGLISH"), "descEn", 120, "", true));
  if (!ex) {
    const nueva = !X.secciones.some((s) => s.id === d.sec);
    out.push({ type: "group", k: E2("CATEGORÍA", "CATEGORY") }, { type: "chips", items: [...X.secciones.filter((s) => !/^extras$/i.test(s.name.es)).map((s) => ({ l: s.name.es, v: d.sec === s.id ? "selected" : "filter", onClick: () => setF({ sec: s.id, newSec: "" }) })),
      { l: `+ ${E2("Nueva", "New")}`, v: nueva ? "selected" : "filter", onClick: () => setF({ sec: "", newSec: d.newSec || "" }) }] });
    if (nueva) out.push({ type: "field", k: E2("NUEVA CATEGORÍA", "NEW CATEGORY"), val: d.newSec, max: 30, ph: E2("Ej. Tintes, Para niños", "e.g. Color, For kids"), onChange: (v) => setF({ newSec: v.slice(0, 30) }) });
  }
  const DUR = ex ? [5, 10, 15, 20] : [15, 20, 30, 40, 45, 60, 90];
  if (rub !== "trans") out.push({ type: "group", k: E2("TIEMPO", "TIME") }, { type: "chips", k: E2("DURA", "TAKES"), items: [...DUR.map((n) => ({ l: `${n} min`, v: d.dur === n ? "selected" : "filter", onClick: () => setF({ dur: n }) })), { l: E2("Otro", "Other"), v: DUR.includes(d.dur) ? "filter" : "selected", onClick: () => setF({ dur: DUR.includes(d.dur) ? Math.min(480, d.dur + 5) : d.dur }) }] });
  if (rub !== "trans" && !DUR.includes(d.dur)) out.push({ type: "step", t: E2("Minutos", "Minutes"), s: durL(d.dur), v: `${d.dur} min`, onM: () => setF({ dur: Math.max(5, d.dur - 5) }), onP: () => setF({ dur: Math.min(480, d.dur + 5) }) });
  if (!ex && rub !== "trans") out.push({ type: "chips", k: E2("TIEMPO ENTRE CITAS", "TIME BETWEEN BOOKINGS"), help: d.buf ? E2(`LA AGENDA DEJA ${d.buf} MIN LIBRES DESPUÉS DE CADA CITA`, `THE SCHEDULE KEEPS ${d.buf} MIN FREE AFTER EACH BOOKING`) : rub === "fiesta" ? E2("PARA MONTAR Y RECOGER · EL CLIENTE NO LO VE", "TO SET UP AND CLEAN UP · CLIENTS DO NOT SEE IT") : rub === "salud" ? E2("PARA PREPARAR EL CONSULTORIO · EL PACIENTE NO LO VE", "TO PREPARE THE ROOM · PATIENTS DO NOT SEE IT") : rub === "pro" ? E2("ENTRE UNA CONSULTA Y OTRA · EL CLIENTE NO LO VE", "BETWEEN CONSULTATIONS · CLIENTS DO NOT SEE IT") : E2("PARA LIMPIAR LA SILLA · EL CLIENTE NO LO VE", "TO CLEAN THE CHAIR · CLIENTS DO NOT SEE IT"),
    items: ([[0, E2("Nada", "None")], [5, "5 min"], [10, "10 min"], [15, "15 min"]] as [number, string][]).map(([n, l]) => ({ l, v: d.buf === n ? "selected" : "filter", onClick: () => setF({ buf: n }) })) });
  out.push({ type: "group", k: E2("PRECIO", "PRICE") });
  const num = (v: string) => v.replace(/[^0-9.]/g, "").slice(0, 7);
  // Doctores y Profesionales (4h): cómo lo cobras y lo propio de cada forma (neg-salud-listing / neg-pro-listing).
  if (rub === "fiesta" && !ex) {
    // Fiestas (neg-fiesta-listing.js k): paquete con horas e incluye, por hora con mínimo, por unidad, fijo, visita gratis, se cotiza.
    const KF: Record<string, [string, string]> = { pack: [E2("Paquete", "Package"), E2("SALE «PAQUETE · 6 HORAS · HASTA 250 INVITADOS»", "SHOWS “PACKAGE · 6 HOURS · UP TO 250 GUESTS”")], hora: [E2("Por hora", "Hourly"), E2("SALE «$200/HORA · MÍNIMO 1 H»", "SHOWS “$200/HOUR · 1 H MINIMUM”")],
      unid: [E2("Por unidad", "Per unit"), E2("SALE «$14 POR JUEGO» Y CUÁNTOS NECESITAS SEGÚN TUS INVITADOS", "SHOWS “$14 PER SET” AND HOW MANY YOU NEED FOR YOUR GUESTS")], fijo: [E2("Precio fijo", "Fixed price"), ""],
      visita: [E2("Visita gratis", "Free visit"), E2("SALE «GRATIS · VISITA · 30 MIN»", "SHOWS “FREE · VISIT · 30 MIN”")], cotiza: [E2("Se cotiza", "Quoted"), E2("SALE «DESDE $X · TOTAL POR ESCRITO»", "SHOWS “FROM $X · TOTAL IN WRITING”")] };
    out.push({ type: "chips", k: E2("CÓMO LO COBRAS", "HOW YOU CHARGE"), help: KF[d.k]?.[1] || undefined, items: Object.entries(KF).map(([k, l]) => ({ l: l[0], v: d.k === k ? "selected" : "filter", onClick: () => setF({ k }) })) });
    if (d.k === "pack") out.push({ type: "step", t: E2("Horas del paquete", "Package hours"), s: d.fh ? E2(`${d.fh} horas`, `${d.fh} hours`) : E2("Sin horas (todo el evento)", "No hours (whole event)"), v: d.fh ? `${d.fh} h` : "—", onM: () => setF({ fh: Math.max(0, d.fh - 1) }), onP: () => setF({ fh: Math.min(24, d.fh + 1) }) });
    if (d.k === "hora") out.push({ type: "step", t: E2("Mínimo de horas", "Minimum hours"), s: E2("Lo menos que se puede pedir.", "The least that can be booked."), v: `${d.fmin} h`, onM: () => setF({ fmin: Math.max(1, d.fmin - 1) }), onP: () => setF({ fmin: Math.min(12, d.fmin + 1) }) });
    if (d.k === "unid") out.push(
      { type: "field", k: E2("LA UNIDAD", "THE UNIT"), val: d.fu, max: 20, ph: E2("Ej. juego, mantel, porción, mesero", "e.g. set, linen, slice, server"), onChange: (v) => setF({ fu: v.slice(0, 20) }) },
      { type: "field", k: E2("INVITADOS POR UNIDAD · OPCIONAL", "GUESTS PER UNIT · OPTIONAL"), val: d.fper, im: "numeric", max: 3, ph: "8", help: E2("Con esto la página dice cuántas necesitas: 120 invitados = 15 juegos.", "With this the page says how many you need: 120 guests = 15 sets."), onChange: (v) => setF({ fper: v.replace(/\D/g, "").slice(0, 3) }) },
      { type: "step", t: E2("Mínimo de unidades", "Minimum units"), s: E2("1 = sin mínimo.", "1 = no minimum."), v: String(d.fmin), onM: () => setF({ fmin: Math.max(1, d.fmin - 1) }), onP: () => setF({ fmin: Math.min(1000, d.fmin + (d.fmin >= 10 ? 5 : 1)) }) });
    if (d.k === "pack" || d.k === "fijo" || d.k === "cotiza") out.push({ type: "field", k: E2("INVITADOS · OPCIONAL", "GUESTS · OPTIONAL"), val: d.fcap, im: "numeric", max: 4, ph: "250", help: E2("Sale «HASTA 250 INVITADOS».", "Shows “UP TO 250 GUESTS”."), onChange: (v) => setF({ fcap: v.replace(/\D/g, "").slice(0, 4) }) });
    if (d.k !== "visita") out.push({ type: "chips", items: [[false, E2("Sin montaje", "No setup")], [true, E2("Montaje incluido", "Setup included")]].map(([v, l]) => ({ l: l as string, v: d.fmont === v ? "selected" : "filter", onClick: () => setF({ fmont: v as boolean }) })) });
    if (d.k === "pack" || d.k === "cotiza" || d.k === "fijo") out.push({ type: "field", k: E2("LO QUE INCLUYE · UNO POR LÍNEA · OPCIONAL", "WHAT IS INCLUDED · ONE PER LINE · OPTIONAL"), val: d.finc, area: true, rows: 3, max: 360, ph: E2("Mesas, sillas y manteles\nPista y sonido básico", "Tables, chairs and linens\nDance floor and basic sound"),
      help: E2("Lo que no está escrito, no está incluido.", "What is not written is not included."), onChange: (v) => setF({ finc: v.slice(0, 360) }) });
  }
  if (rub === "trans" && !ex) {
    // Transporte (neg-trans-listing.js k): por asiento con salidas fijas, vehículo completo, caja o envío, precio cerrado con fotos.
    const KT: Record<string, [string, string]> = { asiento: [E2("Por asiento", "Per seat"), E2("SALE «$45 POR PERSONA · SALIDAS 5 AM · 1 PM · 7 PM»", "SHOWS “$45 PER PERSON · DEPARTS 5 AM · 1 PM · 7 PM”")],
      priv: [E2("Vehículo completo", "Whole vehicle"), E2("SALE «$220 · HASTA 4 PERSONAS»", "SHOWS “$220 · UP TO 4 PEOPLE”")], caja: [E2("Caja o envío", "Box or delivery"), E2("SALE «$85 POR CAJA»", "SHOWS “$85 PER BOX”")],
      cotiza: [E2("Precio cerrado con fotos", "Fixed price from photos"), E2("SALE «DESDE $X · CERRADO CON FOTOS»", "SHOWS “FROM $X · FIXED FROM PHOTOS”")] };
    out.push({ type: "chips", k: E2("CÓMO LO VENDES", "HOW YOU SELL IT"), help: KT[d.k]?.[1] || undefined, items: Object.entries(KT).map(([k, l]) => ({ l: l[0], v: d.k === k ? "selected" : "filter", onClick: () => setF({ k }) })) });
    if (d.k === "asiento") {
      const hL = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
      out.push({ type: "chips", k: E2("SALIDAS DE CADA DÍA · TOCA LAS HORAS", "DAILY DEPARTURES · TAP THE TIMES"), help: d.tsal.length ? d.tsal.map(hL).join(" · ") : E2("MARCA AL MENOS UNA", "PICK AT LEAST ONE"),
        items: Array.from({ length: 20 }, (_, i) => i + 4).map((h) => ({ l: hL(h), v: d.tsal.includes(h) ? "selected" : "filter", onClick: () => setF({ tsal: d.tsal.includes(h) ? d.tsal.filter((z) => z !== h) : [...d.tsal, h].sort((a, b) => a - b) }) })) });
      out.push({ type: "step", t: E2("Asientos", "Seats"), s: E2("Los que vendes en cada salida.", "Seats you sell on each departure."), v: String(d.tpax), onM: () => setF({ tpax: Math.max(1, d.tpax - 1) }), onP: () => setF({ tpax: Math.min(56, d.tpax + 1) }) });
      out.push({ type: "step", t: E2("Dura el viaje", "Trip length"), s: E2("Lo que dice la página.", "What your page says."), v: `${Math.floor(d.tdmin / 60)} h ${d.tdmin % 60 ? `${d.tdmin % 60} min` : ""}`.trim(), onM: () => setF({ tdmin: Math.max(15, d.tdmin - 15) }), onP: () => setF({ tdmin: Math.min(1440, d.tdmin + 15) }) });
      out.push({ type: "field", k: E2("PRECIO DE NIÑO · OPCIONAL", "CHILD PRICE · OPTIONAL"), val: d.tchild, pre: "$", im: "decimal", max: 7, ph: "30", onChange: (v) => setF({ tchild: v.replace(/[^0-9.]/g, "").slice(0, 7) }) });
    }
    if (d.k === "priv") {
      out.push({ type: "step", t: E2("Hasta cuántas personas", "Up to how many people"), s: E2("Caben en el vehículo.", "Fit in the vehicle."), v: String(d.tpax), onM: () => setF({ tpax: Math.max(1, d.tpax - 1) }), onP: () => setF({ tpax: Math.min(56, d.tpax + 1) }) });
      out.push({ type: "chips", k: E2("ESPERA INCLUIDA", "WAIT INCLUDED"), items: [0, 30, 60, 120].map((w) => ({ l: w ? (w < 60 ? `${w} min` : `${w / 60} h`) : E2("Sin espera", "No wait"), v: d.twait === w ? "selected" : "filter", onClick: () => setF({ twait: w }) })) });
    }
    if (d.k === "asiento" || d.k === "priv") out.push({ type: "field", k: E2("SALE DE · OPCIONAL", "DEPARTS FROM · OPTIONAL"), val: d.tfrom, max: 40, ph: E2("Ej. 15 N Wyoming St o tu casa", "e.g. 15 N Wyoming St or your home"), onChange: (v) => setF({ tfrom: v.slice(0, 40) }) });
    if (d.k !== "cotiza") out.push({ type: "field", k: d.k === "asiento" ? E2("VA A", "GOES TO") : E2("DESTINO · OPCIONAL", "DESTINATION · OPTIONAL"), val: d.tto, max: 40, ph: E2("Ej. Washington Heights, NY", "e.g. Washington Heights, NY"), onChange: (v) => setF({ tto: v.slice(0, 40) }) });
    out.push({ type: "field", k: E2("LO QUE INCLUYE EL PRECIO · UNO POR LÍNEA", "WHAT THE PRICE INCLUDES · ONE PER LINE"), val: d.finc, area: true, rows: 3, max: 360, ph: E2("Peajes\n2 maletas", "Tolls\n2 bags"),
      help: E2("El precio del viaje es cerrado antes de salir: lo que no está aquí, no se cobra después.", "The trip price is fixed before leaving: nothing outside this list is charged later."), onChange: (v) => setF({ finc: v.slice(0, 360) }) });
  }
  if ((rub === "salud" || rub === "pro") && !ex) {
    const KL: Record<string, [string, string]> = rub === "salud"
      ? { cons: [E2("Consulta", "Visit"), E2("PRECIO SIN SEGURO · CON SEGURO, LO QUE CUBRA", "PRICE WITHOUT INSURANCE · WITH IT, WHAT IT COVERS")], tele: [E2("Por video", "By video"), E2("CONSULTA POR VIDEO · EL ENLACE LE LLEGA ANTES", "VIDEO VISIT · THE LINK ARRIVES BEFORE")], walk: [E2("Sin cita", "Walk-in"), E2("LLEGA Y ESPERA TURNO", "COMES IN AND WAITS")], free: [E2("Gratis con tu seguro", "Free with your insurance"), E2("$0 CON SEGURO · SIN SEGURO, EL PRECIO DE LA CONSULTA", "$0 WITH INSURANCE · WITHOUT IT, THE VISIT PRICE")], proc: [E2("Precio fijo", "Fixed price"), E2("EL PRECIO COMPLETO, SIN SORPRESAS", "THE FULL PRICE, NO SURPRISES")] }
      : { cons: [E2("Consulta", "Consultation"), E2("GRATIS O CON PRECIO; PUEDE DESCONTARSE SI LO CONTRATA", "FREE OR PAID; CAN BE CREDITED IF HIRED")], fijo: [E2("Honorario fijo", "Flat fee"), E2("TU HONORARIO + LA TARIFA DEL GOBIERNO = EL TOTAL", "YOUR FEE + THE GOVERNMENT FEE = THE TOTAL")], hora: [E2("Por hora", "Hourly"), E2("CON LAS HORAS ESTIMADAS", "WITH THE ESTIMATED HOURS")], pct: [E2("% solo si ganas", "% only if you win"), E2("SI NO GANA, $0", "IF THEY DON'T WIN, $0")], walk: [E2("Sin cita", "Walk-in"), E2("LLEGA Y LO ATIENDEN", "COMES IN AND IS SEEN")], cotiza: [E2("Se cotiza", "Quoted"), E2("EL TOTAL POR ESCRITO EN LA CONSULTA", "THE TOTAL IN WRITING AT THE CONSULTATION")] };
    out.push({ type: "chips", k: E2("CÓMO LO COBRAS", "HOW YOU CHARGE"), help: KL[d.k]?.[1], items: Object.entries(KL).map(([k, l]) => ({ l: l[0], v: d.k === k ? "selected" : "filter", onClick: () => setF({ k }) })) });
    if (rub === "salud" && d.k !== "free") out.push({ type: "chips", items: [[false, E2("Precio fijo para todos", "Same price for all")], [true, E2("Según tus ingresos", "Sliding scale")]].map(([v, l]) => ({ l: l as string, v: d.esc === v ? "selected" : "filter", onClick: () => setF({ esc: v as boolean }) })), help: d.esc ? E2("SALE «DESDE $X · SEGÚN TUS INGRESOS»", "SHOWS “FROM $X · SLIDING SCALE”") : undefined });
    if (rub === "pro") {
      if (d.k === "cons") out.push({ type: "chips", items: [[false, E2("No se descuenta", "Not credited")], [true, E2("Se descuenta si lo contrata", "Credited if hired")]].map(([v, l]) => ({ l: l as string, v: d.cred === v ? "selected" : "filter", onClick: () => setF({ cred: v as boolean }) })) });
      if (d.k === "fijo") {
        out.push({ type: "field", k: E2("TARIFA DEL GOBIERNO · APARTE · OPCIONAL", "GOVERNMENT FEE · SEPARATE · OPTIONAL"), val: d.gov, pre: "$", im: "decimal", max: 6, ph: "0", help: d.gov ? E2(`Tu página dice el total: $${(parseFloat(d.price) || 0) + (parseFloat(d.gov) || 0)}.`, `Your page shows the total: $${(parseFloat(d.price) || 0) + (parseFloat(d.gov) || 0)}.`) : E2("Lo que se paga al gobierno (USCIS, la corte…), sin tu ganancia.", "What is paid to the government (USCIS, the court…), with no profit for you."), onChange: (v) => setF({ gov: v.replace(/[^0-9]/g, "").slice(0, 6) }) });
        out.push({ type: "chips", items: [[false, E2("Una vez", "One time")], [true, E2("Por mes", "Per month")]].map(([v, l]) => ({ l: l as string, v: d.mes === v ? "selected" : "filter", onClick: () => setF({ mes: v as boolean }) })) });
      }
      if (d.k === "hora") out.push({ type: "field", k: E2("HORAS ESTIMADAS · OPCIONAL", "ESTIMATED HOURS · OPTIONAL"), val: d.hrs, max: 7, ph: "8–15", help: E2("Sale «ESTIMADO 8–15 H».", "Shows “ESTIMATE 8–15 H”."), onChange: (v) => setF({ hrs: v.replace(/[^0-9–-]/g, "").slice(0, 7) }) });
      if (d.k === "pct") out.push({ type: "chips", k: E2("¿DE QUÉ?", "OF WHAT?"), items: ([["caso", E2("De lo que gane", "Of the award")], ["cheque", E2("Del cheque", "Of the check")], ["fianza", E2("De la fianza", "Of the bail")], ["carga", E2("Por carga", "Per load")]] as const).map(([u, l]) => ({ l, v: d.unit === u ? "selected" : "filter", onClick: () => setF({ unit: u }) })) });
      out.push({ type: "chips", items: [[false, E2("En la oficina", "In the office")], [true, E2("También por video o teléfono", "Also by video or phone")]].map(([v, l]) => ({ l: l as string, v: d.rem === v ? "selected" : "filter", onClick: () => setF({ rem: v as boolean }) })) });
    }
  }
  if (chair && !ex) {
    out.push({ type: "note", tone: "info", icon: "info", t: E2("Cada silla pone su precio. Déjalo vacío si esa silla no lo hace.", "Each chair sets its price. Leave it empty if that chair does not do it.") });
    for (const p of X.gente) out.push({ type: "field", k: `${E2("SILLA", "CHAIR")} ${p.silla ?? "—"} · ${first(p.nombre).toUpperCase()}${p.kind === "owner" ? E2(" · TÚ", " · YOU") : ""}`, val: d.hacen[p.id] ?? "", pre: "$", im: "decimal", ph: E2("No lo hace", "Doesn’t do it"), max: 7, onChange: (v) => setF({ hacen: { ...d.hacen, [p.id]: num(v) || null } }) });
  } else {
    if (!(rub && !ex && (d.k === "free" || (d.k === "cotiza" && rub !== "fiesta" && rub !== "trans") || d.k === "visita"))) out.push({ type: "field", k: ex ? E2("SE SUMA", "ADDS") : rub === "fiesta" ? (d.k === "hora" ? E2("PRECIO POR HORA", "PRICE PER HOUR") : d.k === "unid" ? E2("PRECIO POR UNIDAD", "PRICE PER UNIT") : d.k === "cotiza" ? E2("DESDE", "FROM") : d.k === "pack" ? E2("PRECIO DEL PAQUETE", "PACKAGE PRICE") : E2("PRECIO", "PRICE")) : rub === "trans" ? (d.k === "asiento" ? E2("PRECIO POR PERSONA", "PRICE PER PERSON") : d.k === "caja" ? E2("PRECIO POR CAJA O ENVÍO", "PRICE PER BOX OR DELIVERY") : d.k === "cotiza" ? E2("DESDE", "FROM") : E2("PRECIO DEL VIAJE", "TRIP PRICE")) : rub === "salud" ? E2("PRECIO SIN SEGURO", "PRICE WITHOUT INSURANCE") : rub === "pro" ? (d.k === "pct" ? E2("PORCENTAJE", "PERCENTAGE") : d.k === "hora" ? E2("PRECIO POR HORA", "PRICE PER HOUR") : d.k === "cons" ? E2("PRECIO DE LA CONSULTA · 0 = GRATIS", "CONSULTATION PRICE · 0 = FREE") : E2("TU HONORARIO", "YOUR FEE")) : E2("PRECIO EN LA BARBERÍA", "SHOP PRICE"), val: d.price, pre: rub === "pro" && d.k === "pct" ? "%" : "$", im: "decimal", max: 7, ph: "0", help: ex ? E2("Lo que cuesta además del servicio.", "What it costs on top of the service.") : X.gente.length > 1 ? E2("Es igual con cualquiera.", "Same with anyone.") : undefined, onChange: (v) => setF({ price: num(v) }) });
    if (!ex && !rub) out.push({ type: "chips", items: ([[false, E2("Precio fijo", "Fixed price")], [true, E2("Desde · varía", "From · varies")]] as [boolean, string][]).map(([n, l]) => ({ l, v: d.desde === n ? "selected" : "filter", onClick: () => setF({ desde: n }) })) });
    if (!ex && X.gente.length > 1) out.push({ type: "chips", k: E2("QUIÉN LO HACE", "WHO DOES IT"), help: X.model === "comm" ? E2("A CADA UNO LE TOCA SU PORCENTAJE", "EACH GETS THEIR PERCENTAGE") : undefined,
      items: X.gente.map((p) => { const on = d.hacen[p.id] != null; return { l: `${first(p.nombre)}${p.kind === "owner" ? E2(" · tú", " · you") : ""}`, v: on ? "selected" : "filter", onClick: () => setF({ hacen: { ...d.hacen, [p.id]: on ? null : "" } }) }; }) });
  }
  if (!ex) {
    const G = d.opts, setG = (g: FSvc["opts"]) => setF({ opts: g }), upG = (gi: number, o: Partial<FSvc["opts"][number]>) => setG(G.map((x, j) => (j === gi ? { ...x, ...o } : x)));
    const upO = (gi: number, oi: number, o: Partial<FSvc["opts"][number]["o"][number]>) => upG(gi, { o: G[gi]!.o.map((x, j) => (j === oi ? { ...x, ...o } : x)) }), sg = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
    out.push({ type: "group", k: E2("OPCIONES · EL CLIENTE ELIGE UNA", "OPTIONS · THE CLIENT PICKS ONE"), link: G.length < 3 ? E2("Agregar grupo", "Add group") : undefined, onLink: () => setG([...G, { t: "", tEn: "", o: [{ n: "", nEn: "", p: 0, m: 0 }, { n: "", nEn: "", p: 0, m: 0 }] }]) });
    if (!G.length) out.push({ type: "note", tone: "info", icon: "info", t: rub === "trans" ? E2("Para cuando el precio cambia: con o sin regreso, ida al aeropuerto o de vuelta, tamaño de la caja. El cliente elige una al reservar.", "For when the price changes: one way or round trip, to or from the airport, box size. The client picks one when booking.") : rub === "fiesta" ? E2("Para cuando el precio cambia: viernes o sábado, con o sin decoración, sabor del pastel. El cliente elige una al pedir la fecha.", "For when the price changes: Friday or Saturday, with or without décor, cake flavor. The client picks one when asking for the date.") : rub === "salud" ? E2("Para cuando el precio o el tiempo cambian: primera vez o seguimiento, un ojo o los dos. El paciente elige una al pedir la cita.", "For when price or time changes: first visit or follow-up, one eye or both. The patient picks one when booking.") : rub === "pro" ? E2("Para cuando el precio o el tiempo cambian: individual o en pareja, con o sin dependientes. El cliente elige una al pedir la cita.", "For when price or time changes: single or couple, with or without dependents. The client picks one when booking.") : E2("Para cuando el precio o el tiempo cambian: largo del pelo, tamaño, con o sin pelo incluido. El cliente elige una al pedir la cita.", "For when price or time changes: hair length, size, hair included or not. The client picks one when booking.") });
    G.forEach((g, gi) => {
      out.push({ type: "field", k: E2(`GRUPO ${gi + 1} · QUÉ ELIGE`, `GROUP ${gi + 1} · WHAT THEY PICK`), val: g.t, max: 30, ph: E2("Ej. Largo del pelo", "e.g. Hair length"), onChange: (v) => upG(gi, { t: v.slice(0, 30) }) });
      g.o.forEach((o, oi) => {
        out.push({ type: "field", k: E2(`OPCIÓN ${oi + 1}`, `OPTION ${oi + 1}`), val: o.n, max: 30, ph: oi === 0 ? E2("Ej. Corto", "e.g. Short") : E2("Ej. Largo", "e.g. Long"), onChange: (v) => upO(gi, oi, { n: v.slice(0, 30) }) },
          { type: "step", t: E2("Cambia el precio", "Price change"), s: o.p ? `${sg(o.p)}${fp(Math.abs(o.p) * 100)}` : E2("Igual", "Same"), v: o.p ? `${sg(o.p)}$${Math.abs(o.p)}` : "$0", onM: () => upO(gi, oi, { p: Math.max(-200, o.p - 5) }), onP: () => upO(gi, oi, { p: Math.min(500, o.p + 5) }) },
          { type: "step", t: E2("Cambia el tiempo", "Time change"), s: o.m ? `${sg(o.m)}${Math.abs(o.m)} min` : E2("Igual", "Same"), v: `${o.m > 0 ? "+" : ""}${o.m} min`, onM: () => upO(gi, oi, { m: Math.max(-120, o.m - 5) }), onP: () => upO(gi, oi, { m: Math.min(240, o.m + 5) }) });
        if (g.o.length > 2) out.push({ type: "acts", items: [{ l: E2(`Quitar opción ${oi + 1}`, `Remove option ${oi + 1}`), v: "ghost", icon: "trash", onClick: () => upG(gi, { o: g.o.filter((_x, j) => j !== oi) }) }] });
      });
      out.push({ type: "acts", items: [...(g.o.length < 5 ? [{ l: E2("Agregar opción", "Add option"), v: "secondary", icon: "plus", onClick: () => upG(gi, { o: [...g.o, { n: "", nEn: "", p: 0, m: 0 }] }) }] : []), { l: E2("Quitar grupo", "Remove group"), v: "ghost", icon: "trash", onClick: () => setG(G.filter((_x, j) => j !== gi)) }] });
    });
    const vis = G.filter((g) => g.t.trim());
    if (vis.length) out.push({ type: "note", tone: "info", icon: "info", t: E2("Así lo ve el cliente al reservar: ", "What clients see when booking: ") + vis.map((g) => `«${E2("Elige", "Choose")}: ${g.t}» — ${g.o.filter((o) => o.n.trim()).map((o) => `${o.n}${o.p ? ` ${sg(o.p)}$${Math.abs(o.p)}` : ""}${o.m ? ` ${sg(o.m)}${Math.abs(o.m)} min` : ""}`).join(" · ")}`).join(" / ") + "." });
  }
  if ((rub === "salud" || rub === "pro") && !ex) out.push({ type: "field", k: rub === "salud" ? E2("IMPORTANTE · OPCIONAL", "IMPORTANT · OPTIONAL") : E2("LO QUE NO INCLUYE · OPCIONAL", "WHAT IS NOT INCLUDED · OPTIONAL"), val: d.no, max: 90, area: true, rows: 2, count: `${d.no.length}/90`,
    ph: rub === "salud" ? E2("Ej.: Dolor de pecho, falta de aire o sangrado fuerte: llama al 911.", "E.g. Chest pain, shortness of breath or heavy bleeding: call 911.") : E2("Ej.: No incluye la representación en corte.", "E.g. Does not include court representation."), onChange: (v) => setF({ no: v.slice(0, 90) }) });
  out.push({ type: "group", k: E2("EN TU PÁGINA", "ON YOUR PAGE") }, { type: "rows", items: [{ icon: "search", t: E2("Se ve en tu página", "Shows on your page"), s: d.visible ? E2("Sale en Servicios y se puede reservar.", "Shows in Services and can be booked.") : E2("Apagado: no sale ni se reserva. Queda guardado.", "Off: not shown or booked. It stays saved."), tgOn: d.visible, onTg: () => setF({ visible: !d.visible }) }] });
  const pr = parseFloat(d.price) || 0, algunPrecio = rub && !ex ? (["free", "cotiza", "walk"].includes(d.k) || (d.k === "cons") || pr > 0) : chair && !ex ? Object.values(d.hacen).some((v) => (parseFloat(v ?? "") || 0) > 0) : pr > 0 || ex;
  const miss = [d.name.trim().length < 2 ? E2("nombre", "name") : null, algunPrecio ? null : E2("precio", "price"), ex || d.sec || d.newSec.trim() ? null : E2("categoría", "category")].filter(Boolean);
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${miss.join(" · ")}.`, `To save, add: ${miss.join(" · ")}.`) });
  const askDel = !isNew && ui.svDel === id;
  if (askDel) out.push({ type: "note", tone: "danger", icon: "trash", t: E2(`¿Quitar «${s0!.name.es}»? Las citas ya pedidas lo conservan. Si solo no lo ofreces por ahora, mejor apaga «Se ve en tu página».`, `Remove “${s0!.name.es}”? Booked appointments keep it. If you just don’t offer it for now, turn off “Shows on your page”.`) });
  const tail = isNew ? [] : askDel ? [{ l: E2("Sí, quitar", "Yes, remove"), v: "danger", icon: "trash", onClick: () => { c.setUi({ svDel: null }); c.run(() => servicioQuitar(c.d.id, id), E2("Quitado. Las citas ya pedidas lo conservan.", "Removed. Booked appointments keep it."), back); } }, { l: E2("Cancelar", "Cancel"), v: "ghost", onClick: () => c.setUi({ svDel: null }) }]
    : [{ l: E2("Quitar", "Remove"), v: "ghost", icon: "trash", onClick: () => c.setUi({ svDel: id }) }, ...(s0 && !s0.oculto ? [{ l: E2("Ocultar de tu página", "Hide from your page"), v: "ghost", icon: "ban", onClick: () => c.run(() => servicioVisible(c.d.id, id, false), E2("Oculto: no sale en tu página.", "Hidden: not on your page.")) }] : [])];
  const apply = (x: FSvc) => servicioGuardar(c.d.id, isNew ? "new" : id, {
    name: x.name, en: x.en, desc: x.desc, descEn: x.descEn, sec: x.sec, newSec: x.newSec, price: chair && !ex ? minPositivo(Object.values(x.hacen).map((v) => parseFloat(v ?? "") || 0)) : parseFloat(x.price) || 0,
    desde: x.desde, dur: x.dur, buf: x.buf, foto: x.foto, visible: x.visible, extra: ex,
    hacen: Object.fromEntries(Object.entries(x.hacen).map(([k, v]) => [k, chair && !ex ? (v ? parseFloat(v) : -1) : v == null ? -1 : null])) as ServicioIn["hacen"],
    opts: x.opts,
    ...(rub === "fiesta" && !ex ? { k: x.k, a: { h: x.fh, cap: parseInt(x.fcap) || undefined, mont: x.fmont, min: x.fmin, per: parseInt(x.fper) || undefined, u: x.fu.trim() ? { es: x.fu.trim(), en: x.fu.trim() } : undefined,
      inc: x.finc.split("\n").map((z) => z.trim()).filter(Boolean).slice(0, 6).map((z) => ({ es: z, en: z })) } }
      : rub === "trans" && !ex ? { k: x.k, a: { sal: x.tsal, pax: x.tpax, dmin: x.tdmin, wait: x.twait, child: Math.round((parseFloat(x.tchild) || 0) * 100) || undefined,
        from: x.tfrom.trim() ? { es: x.tfrom.trim(), en: x.tfrom.trim() } : undefined, to: x.tto.trim() ? { es: x.tto.trim(), en: x.tto.trim() } : undefined,
        inc: x.finc.split("\n").map((z) => z.trim()).filter(Boolean).slice(0, 6).map((z) => ({ es: z, en: z })) } } : rub && !ex ? { k: x.k, a: { esc: x.esc, gov: Math.round((parseFloat(x.gov) || 0) * 100), cred: x.cred, rem: x.rem, hrs: x.hrs, mes: x.mes, unit: x.unit as "caso", no: x.no.trim() ? [{ es: x.no.trim(), en: x.noEn.trim() || x.no.trim() }] : [] } } : {}),
  });
  return { blocks: out, tail: tail.length ? [{ type: "acts", items: tail }] : [], ed: { F, l: isNew ? E2("Agregar", "Add") : E2("Guardar", "Save"), valid: !miss.length, always: isNew, apply, onDone: back } };
}

/* ── Cómo trabaja tu negocio ── */
type FMod = { model: SvcPanel["model"]; rent: string; comm: number };
export function modeloDetalle(c: Ctx): Sec {
  const { E2 } = c, X = S(c), M = MODEL(c);
  const F = c.form<FMod>("det:svm", { model: X.model, rent: X.rent != null ? String(X.rent / 100) : "", comm: X.comm ?? 60 }), d = F.d;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("SERVICIOS", "SERVICES"), t: E2("Cómo trabaja tu negocio", "How your business works"), s: E2("Cambia cómo se ponen los precios y quién maneja la agenda.", "Changes how prices are set and who runs the schedule."), onBack: () => c.closeDet() },
    { type: "rows", items: (["chair", "comm", "emp"] as const).map((k) => ({ icon: k === "chair" ? "users" : k === "comm" ? "dollar" : "store", t: M[k][0], s: M[k][1], tag: d.model === k ? E2("ASÍ TRABAJAS", "CURRENT") : null, tone: "signal", chev: false, onClick: () => F.set({ model: k }) })) }];
  if (d.model === "chair") out.push({ type: "field", k: E2("RENTA DE LA SILLA · POR SEMANA · OPCIONAL", "CHAIR RENT · PER WEEK · OPTIONAL"), val: d.rent, pre: "$", im: "decimal", max: 6, onChange: (v) => F.set({ rent: v.replace(/[^0-9.]/g, "").slice(0, 6) }), help: E2("Solo para tus cuentas: el cliente no lo ve.", "Only for your records: clients don’t see it.") });
  if (d.model === "comm") out.push({ type: "step", t: E2("Le toca al barbero", "Barber gets"), s: E2("De cada servicio.", "Of each service."), v: `${d.comm} %`, onM: () => F.set({ comm: Math.max(0, d.comm - 5) }), onP: () => F.set({ comm: Math.min(100, d.comm + 5) }) });
  if (d.model !== X.model) out.push({ type: "note", tone: "warn", icon: "info", t: d.model === "chair" ? E2("Con sillas rentadas cada uno pone su precio en cada servicio y decide si confirma al instante y su depósito.", "With rented chairs each sets their price on each service and decides instant approval and deposit.") : E2("Todos cobran el precio de la barbería; las reglas de citas son las del negocio.", "Everyone charges the shop price; booking rules are the business’s.") });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: true, apply: (x: FMod) => modeloGuardar(c.d.id, x.model, x.model === "chair" && x.rent ? parseFloat(x.rent) : null, x.model === "comm" ? x.comm : null), onDone: () => c.closeDet() } };
}

/* ── Citas: las reglas (Panel v2 · k === 'citas') ── */
type FCit = { auto: boolean; resp: number; dep: number; cxh: number; pick: boolean };
export function citasBloques(c: Ctx): Sec {
  const { E2 } = c, X = S(c), chair = X.model === "chair", solo = X.gente.length <= 1;
  const F = c.form<FCit>("cit", { auto: X.pol.auto, resp: X.pol.resp, dep: X.pol.dep, cxh: X.pol.cxh, pick: X.pol.pick }), d = F.d;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Citas", "Bookings"), s: E2("Cómo te piden cita en tu página: si confirmas tú, el depósito y hasta cuándo se cancela gratis.", "How clients book on your page: whether you confirm, the deposit and the free cancellation window."), onBack: () => c.go("mod") }];
  if (X.off.citas != null) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Citas: tu página no recibe solicitudes en línea y dice «llama o pasa por el local». Motivo: ${X.off.citas}`, `To’Latino paused your Bookings: your page takes no online requests and says “call or stop by”. Reason: ${X.off.citas}`) });
  else if (!X.on) out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("Citas está apagado: tu página no recibe solicitudes en línea.", "Bookings is off: your page takes no online requests."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => citasModulo(c.d.id, true), E2("Citas encendido.", "Bookings on.")) });
  if (chair) out.push({ type: "rows", k: E2("CADA SILLA", "EACH CHAIR"), items: [{ icon: "users", t: E2("Sillas y agenda", "Chairs and schedule"), s: E2("Si confirma al instante, cuánto tarda en contestar y el depósito: lo decide cada silla.", "Instant approval, reply time and deposit: each chair decides."), chev: true, onClick: () => c.go("mod", "sillas") }] });
  if (!chair) out.push({ type: "rows", items: [{ icon: "check", t: E2("Aprobar citas al instante", "Approve bookings instantly"), s: E2("Apagado: tú confirmas cada una. Recomendado.", "Off: you confirm each one. Recommended."), tgOn: d.auto, onTg: () => F.set({ auto: !d.auto }) }] });
  if (!chair && !d.auto) out.push({ type: "chips", k: E2("TARDAS EN CONTESTAR", "YOU REPLY IN"), help: E2(`EL CLIENTE LO VE EN TU PÁGINA · SI NO CONTESTAS EN ${X.pol.exp} HORAS, LA SOLICITUD VENCE Y SE DEVUELVE EL DEPÓSITO`, `CLIENTS SEE IT ON YOUR PAGE · IF YOU DON’T REPLY IN ${X.pol.exp} HOURS, THE REQUEST EXPIRES AND THE DEPOSIT IS REFUNDED`),
    items: ([[15, "15 min"], [30, "30 min"], [60, "1 h"], [180, "3 h"]] as [number, string][]).map(([n, l]) => ({ l, v: d.resp === n ? "selected" : "filter", onClick: () => F.set({ resp: n }) })) });
  if (!chair) out.push({ type: "chips", k: E2("DEPÓSITO AL PEDIR LA CITA", "DEPOSIT WHEN BOOKING"), help: E2("SE RETIENE AL ENVIAR LA SOLICITUD Y SE COBRA CUANDO CONFIRMAS · SE DESCUENTA DEL TOTAL · SI NO CONFIRMAS, SE LIBERA", "HELD WHEN THE REQUEST IS SENT AND CHARGED WHEN YOU CONFIRM · TAKEN OFF THE TOTAL · RELEASED IF YOU DON’T CONFIRM"),
    items: ([[0, E2("Sin depósito", "No deposit")], [500, "$5"], [1000, "$10"], [2000, "$20"], [5000, "$50"]] as [number, string][]).map(([n, l]) => ({ l, v: d.dep === n ? "selected" : "filter", onClick: () => F.set({ dep: n }) })) });
  out.push({ type: "chips", k: chair ? E2("TU SILLA · CANCELAR GRATIS HASTA", "YOUR CHAIR · FREE CANCELLATION UP TO") : E2("CANCELAR GRATIS HASTA", "FREE CANCELLATION UP TO"), help: E2("SI CANCELAN MÁS TARDE O NO LLEGAN, EL DEPÓSITO SE QUEDA CONTIGO", "IF THEY CANCEL LATER OR DON’T SHOW, YOU KEEP THE DEPOSIT"),
    items: ([[2, E2("2 h antes", "2 h before")], [4, E2("4 h antes", "4 h before")], [24, E2("24 h antes", "24 h before")], [72, E2("3 días antes", "3 days before")]] as [number, string][]).map(([n, l]) => ({ l, v: d.cxh === n ? "selected" : "filter", onClick: () => F.set({ cxh: n }) })) });
  if (!chair && !solo) out.push({ type: "rows", items: [{ icon: "users", t: E2("El cliente elige con quién", "Client picks the person"), s: E2("Si lo apagas, se asigna a quien esté libre.", "If off, whoever is free is assigned."), tgOn: d.pick, onTg: () => F.set({ pick: !d.pick }) },
    { icon: "users", t: E2("Quién recibe citas", "Who takes bookings"), s: X.gente.filter((p) => p.recibe).map((p) => first(p.nombre)).join(" · ") || "—", chev: true, onClick: () => c.go("pag", "equipo") }] });
  if (!chair) {
    const prev = d.auto ? E2("Confirmas al instante: si ven la hora libre, es suya.", "You confirm instantly: if the time is open, it is theirs.") : E2(`Booking es una solicitud: el negocio confirma · responde en ~${resL(c, d.resp)}.`, `Booking is a request: the business confirms · replies in ~${resL(c, d.resp)}.`);
    out.push({ type: "note", tone: "info", icon: "info", t: `${E2("Así lo ve el cliente: ", "What clients see: ")}${prev}${d.dep ? E2(` Depósito ${fp(d.dep)}.`, ` ${fp(d.dep)} deposit.`) : ""}${E2(` Cancela gratis hasta ${d.cxh >= 24 ? `${d.cxh / 24} ${d.cxh === 24 ? "día" : "días"}` : `${d.cxh} h`} antes.`, ` Free cancellation up to ${d.cxh >= 24 ? `${d.cxh / 24} day(s)` : `${d.cxh} h`} before.`)}` });
  }
  if (X.on && X.off.citas == null) out.push({ type: "acts", items: [{ l: E2("Apagar Citas", "Turn off Bookings"), v: "ghost", icon: "ban", onClick: () => c.run(() => citasModulo(c.d.id, false), E2("Citas apagado: tu página no recibe solicitudes en línea.", "Bookings off: your page takes no online requests.")) }] });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: true, apply: (x: FCit) => citasGuardar(c.d.id, x), toast: E2("Guardado.", "Saved.") } };
}

/* ── Sillas y agenda (dash2-cat): cada silla decide ── */
export function sillasBloques(c: Ctx): Sec {
  const { E2 } = c, X = S(c), G = X.gente;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("CITAS", "BOOKINGS"), t: E2("Sillas y agenda", "Chairs and schedule"), s: E2("Quien renta silla maneja su agenda; tú ves sus citas pero no las cambias.", "Chair renters run their schedule; you see their bookings but don’t change them."), onBack: () => c.go("mod", "citas") },
    { type: "kpis", cols: c.desk ? "repeat(3,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [{ k: E2("SILLAS", "CHAIRS"), v: String(G.length) }, { k: E2("AL INSTANTE", "INSTANT"), v: String(G.filter((p) => p.auto).length) }, { k: E2("CON DEPÓSITO", "WITH DEPOSIT"), v: String(G.filter((p) => (p.dep ?? 0) > 0).length) }] }];
  const guardar = (p: Persona, o: Partial<{ auto: boolean; resp: number; dep: number; recibe: boolean }>) => c.run(() => sillaGuardar(c.d.id, p.id, { auto: p.auto, resp: p.resp ?? 30, dep: p.dep ?? 0, recibe: p.recibe, ...o }), E2("Guardado.", "Saved."));
  for (const p of G) {
    out.push({ type: "group", k: `${E2("SILLA", "CHAIR")} ${p.silla ?? "—"} · ${p.nombre.toUpperCase()}${p.kind === "owner" ? E2(" · TÚ", " · YOU") : ""}` },
      { type: "rows", items: [{ icon: "check", t: E2("Aprobar citas al instante", "Approve bookings instantly"), s: p.auto ? E2("Si ven la hora libre, es suya.", "If the time is open, it is theirs.") : E2("Confirma cada una.", "Confirms each one."), tgOn: p.auto, onTg: () => guardar(p, { auto: !p.auto }) },
        { icon: "calendar", t: E2("Recibe citas en línea", "Takes online bookings"), s: p.recibe ? E2("Sale en el Booking del local.", "Shows in the shop’s Booking.") : E2("No sale en el Booking.", "Not in Booking."), tgOn: p.recibe, onTg: () => guardar(p, { recibe: !p.recibe }) }] });
    if (!p.auto) out.push({ type: "chips", k: E2("RESPONDE EN", "REPLIES IN"), items: ([[15, "15 min"], [30, "30 min"], [60, "1 h"]] as [number, string][]).map(([n, l]) => ({ l, v: (p.resp ?? 30) === n ? "selected" : "filter", onClick: () => guardar(p, { resp: n }) })) });
    out.push({ type: "chips", k: E2("DEPÓSITO AL PEDIR", "DEPOSIT WHEN BOOKING"), items: ([[0, E2("Sin depósito", "No deposit")], [500, "$5"], [1000, "$10"], [1500, "$15"]] as [number, string][]).map(([n, l]) => ({ l, v: (p.dep ?? 0) === n ? "selected" : "filter", onClick: () => guardar(p, { dep: n }) })) });
    if (p.kind === "renter") {
      // Su propia cuenta de cobro (3d): el depósito llega a su banco, no al tuyo. La conecta él desde su cuenta.
      const n = p.nombre.split(" ")[0], on = p.cobro === "enabled";
      out.push({ type: "rows", items: [{ icon: "wallet", t: E2("Su cuenta de cobro", "Their payout account"),
        s: on ? E2(`Conectada · banco ·· ${p.banco ?? "····"}. Los depósitos de su silla llegan a su banco.`, `Connected · bank ·· ${p.banco ?? "····"}. Their chair's deposits go to their bank.`)
          : p.cobro === "pending" || p.cobro === "restricted" ? E2(`${n} empezó a conectarla; falta terminar en Stripe.`, `${n} started connecting it; Stripe signup not finished.`)
            : p.invitado ? E2(`Ya se lo pediste a ${n}. Mientras no la conecte, su silla no pide depósito en línea.`, `You already asked ${n}. Until it is connected, the chair takes no online deposit.`)
              : E2(`Sin conectar: su silla no pide depósito en línea.`, `Not connected: the chair takes no online deposit.`),
        tag: on ? E2("CONECTADA", "CONNECTED") : E2("SIN CONECTAR", "NOT CONNECTED"), tone: on ? "signal" : "neutral",
        acts: on ? undefined : [{ l: p.invitado ? E2("Pedírselo otra vez", "Ask again") : E2(`Pedirle a ${n} que la conecte`, `Ask ${n} to connect it`), v: "secondary", icon: "bell", off: c.pending,
          onClick: () => c.run(() => sillaInvitarCobro(c.d.id, p.id), E2(`Le avisamos a ${n}.`, `${n} was notified.`)) }] }] });
    }
    if (p.silla) out.push({ type: "acts", items: [{ l: E2("Ver su página", "See their page"), v: "ghost", icon: "store", onClick: () => window.open(`/n/${c.d.id}/silla/${p.silla}`, "_blank", "noopener") }] });
  }
  if (!G.length) out.push({ type: "empty", icon: "users", t: E2("Sin sillas", "No chairs"), s: E2("Invita a tus barberos en Tu página › Equipo.", "Invite your barbers in Your page › Team."), cta: E2("Equipo", "Team"), onCta: () => c.go("pag", "equipo") });
  return { blocks: out, ed: null };
}
