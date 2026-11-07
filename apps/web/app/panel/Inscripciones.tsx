"use client";
/* Inscripciones en el panel (4ee · hueco #2 del plan: compuesto con los bloques del panel). Hoy: «Inscripciones que esperan tu respuesta»
   (vencen a las `reply_h`) y «Cancelaciones de membresía pedidas». Lo que vendes › Inscripciones: Grupos (inscritos y cupos; Empezó ·
   Terminó con «¿Entregaste el certificado?» · Cancelar el grupo con motivo = devolución a todos), Lista de espera (Ofrecer el cupo, 48 h),
   Activas. El detalle: para quién, nivel, grupo, matrícula y lo que se copió al enviar; los datos del niño SOLO aquí (cada vista queda en
   la auditoría); Confirmar (cobra la matrícula) · Otro grupo · No hay cupo; el plan por escrito con «Marcar pagada»; Cancelar con motivo. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { fechaCorta, usdI, VOC, type Bi } from "@/lib/inscripciones-comun";
import { FRANJAS, diaVis } from "@/lib/visitas-inm-comun";
import type { FilaInsc, InscDetalle, InscPanel } from "@/lib/inscripciones";
import { inscCancelarGrupo, inscCancelarNeg, inscConfirmarBaja, inscCuota, inscMarcar, inscMarcarGrupo, inscOfrecer, inscResponder } from "./acciones-insc";
import { ayudaCita } from "./Citas";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
export type InsPanel = { panel?: InscPanel; det?: InscDetalle | null };
const nm = (c: Ctx, b: Bi | null | undefined) => (b ? (c.es ? b.es : b.en || b.es) : "");
const venceL = (c: Ctx, t: string | null) => {
  if (!t) return "";
  const h = Math.max(0, Math.round((Date.parse(t) - Date.now()) / 3600000));
  return h >= 1 ? c.E2(`RESPONDE EN ${h} H`, `REPLY IN ${h} H`) : c.E2("VENCE PRONTO", "EXPIRES SOON");
};
const paraL = (c: Ctx, p: string) => (p === "hijo" ? c.E2("para su hijo o hija", "for their child") : p === "otro" ? c.E2("para otra persona", "for someone else") : c.E2("para sí", "for themselves"));

function fila(c: Ctx, x: FilaInsc): Fila {
  const { E2 } = c;
  const [tag, tone] = x.estado === "pending" ? [venceL(c, x.vence), "action"] : x.estado === "change_proposed" ? [E2("ESPERA A LA PERSONA", "AWAITING CLIENT"), "ink"]
    : x.detalle === "cancel_req" ? [E2("PIDE LA BAJA", "WANTS TO CANCEL"), "action"] : x.detalle === "started" ? [E2("EN CURSO", "IN PROGRESS"), "signal"] : [E2("CONFIRMADA", "CONFIRMED"), "signal"];
  return { key: x.numero, icon: "calendar", t: `${x.cliente} · ${nm(c, x.svc)}`,
    s: [x.numero, x.grupo ? nm(c, x.grupo) : "", x.inicio ? `${E2("empieza", "starts")} ${fechaCorta(x.inicio, c.es)}` : "", paraL(c, x.para), x.mat ? `${E2("matrícula", "fee")} ${usdI(x.mat)}` : ""].filter(Boolean).join(" · "),
    tag, tone, chev: true, onClick: () => c.det(`insc:${x.numero}`) };
}

export function hoyInsc(c: Ctx): Bloque[] {
  const { E2 } = c, P = c.ins?.panel;
  if (!P) return [];
  const out: Bloque[] = [];
  if (P.esperan.length) out.push({ type: "rows", k: `${E2("INSCRIPCIONES QUE ESPERAN TU RESPUESTA", "ENROLLMENTS AWAITING YOUR REPLY")} · ${P.esperan.length}`, items: P.esperan.map((x) => fila(c, x)) });
  if (P.bajas.length) out.push({ type: "rows", k: `${E2("CANCELACIONES DE MEMBRESÍA PEDIDAS", "MEMBERSHIP CANCELLATIONS REQUESTED")} · ${P.bajas.length}`, items: P.bajas.map((x) => fila(c, x)) });
  return out;
}

/* La fila de Lo que vendes. */
export function filaInscripciones(c: Ctx): Fila | null {
  const { E2 } = c, X = c.svc;
  if (!X || !(X.edu || X.ninos || X.dep || X.rubro === "fe")) return null;
  // 4ie · Iglesias: «Pedir fecha», catecismo y consejería por el mismo motor, con su vocabulario («Tu lugar», «Fecha»). Nada se cobra.
  if (X.rubro === "fe") return { icon: "calendar", t: E2("Fechas e inscripciones", "Dates and sign-ups"), s: E2("Las fechas que piden (bautizos, bodas, consejería), el catecismo con sus grupos y lo confirmado. Nada se cobra.", "Requested dates (baptisms, weddings, counseling), catechism groups and what is confirmed. Nothing is charged."), chev: true, onClick: () => c.go("mod", "inscripciones") };
  return { icon: "users", t: E2("Inscripciones", "Enrollments"), s: E2("Las que esperan, los grupos con sus inscritos, la lista de espera y las membresías activas.", "Pending ones, groups with their students, the waitlist and active memberships."), chev: true, onClick: () => c.go("mod", "inscripciones") };
}

export function inscripcionesBloques(c: Ctx): Sec {
  const { E2, ui } = c, P = c.ins?.panel;
  const fe = c.svc?.rubro === "fe";
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: fe ? E2("Fechas e inscripciones", "Dates and sign-ups") : E2("Inscripciones", "Enrollments"), onBack: () => c.go("mod"),
    s: fe ? E2("Confirmas cada fecha o lugar en 48 horas, propones otra fecha o dices que no hay. Nada se cobra en la app: el donativo siempre es sugerido.", "You confirm each date or spot within 48 hours, propose another date or say there is none. Nothing is charged in the app: donations are always suggested.") : E2("Confirmas cada inscripción. La matrícula se cobra al confirmar; si un grupo no abre, se devuelve todo a todos.", "You confirm each enrollment. The fee is charged when you confirm; if a group does not open, everyone gets everything back.") }];
  if (!P) return { blocks: out, ed: null };
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ESPERAN", "PENDING"), v: String(P.esperan.length) }, { k: E2("ACTIVAS", "ACTIVE"), v: String(P.activas.length) }, { k: E2("EN ESPERA", "WAITLIST"), v: String(P.espera.length) }] });
  if (P.esperan.length) out.push({ type: "rows", k: E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY"), items: P.esperan.map((x) => fila(c, x)) });
  if (P.bajas.length) out.push({ type: "rows", k: E2("PIDEN LA BAJA", "WANT TO CANCEL"), items: P.bajas.map((x) => fila(c, x)) });
  // Grupos: inscritos y cupos; empezó / terminó / no abre.
  if (P.grupos.length) {
    out.push({ type: "group", k: E2("GRUPOS", "GROUPS") });
    for (const g of P.grupos) {
      const abierto = ui.igr === g.id, k = `igx:${g.id}`, mot = (ui[k] as string | undefined) ?? null, empezo = g.inicio <= P.hoy;
      out.push({ type: "rows", items: [{ key: g.id, icon: "users", t: `${nm(c, g.svc)} · ${nm(c, g.label)}`,
        s: E2(`Empieza el ${fechaCorta(g.inicio, true)} · ${g.inscritos} inscritos · ${g.libres} cupos libres de ${g.total}${g.fuera ? ` · ${g.fuera} fuera de la app` : ""}${g.espera ? ` · ${g.espera} en espera` : ""}`,
          `Starts ${fechaCorta(g.inicio, false)} · ${g.inscritos} enrolled · ${g.libres} of ${g.total} seats left${g.fuera ? ` · ${g.fuera} outside the app` : ""}${g.espera ? ` · ${g.espera} waiting` : ""}`),
        tag: g.estado === "started" ? E2("EMPEZÓ", "STARTED") : g.libres ? E2("ABIERTO", "OPEN") : E2("LLENO", "FULL"), tone: g.estado === "started" ? "signal" : g.libres ? "action" : "ink", chev: true, onClick: () => c.setUi({ igr: abierto ? null : g.id }) }] });
      if (!abierto) continue;
      if (mot == null) out.push({ type: "acts", items: [
        ...(g.estado === "open" && empezo ? [{ l: E2("Empezó", "It started"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => inscMarcarGrupo(c.d.id, g.id, "empezo"), E2("Listo: el grupo empezó.", "Done: the group started.")) }] : []),
        ...(g.estado === "started" ? [{ l: E2("Terminó · entregué el certificado", "Finished · certificate given"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => inscMarcarGrupo(c.d.id, g.id, "termino", true), E2("Listo: terminado, con certificado.", "Done: finished, with certificate.")) },
          { l: E2("Terminó · sin certificado", "Finished · no certificate"), v: "secondary", off: c.pending, onClick: () => c.run(() => inscMarcarGrupo(c.d.id, g.id, "termino", false), E2("Listo: terminado.", "Done: finished.")) }] : []),
        ...(g.estado === "open" ? [{ l: E2("El grupo no abre", "Group will not open"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] : [])] });
      else {
        out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`Se cancela el grupo y cada inscrito recibe TODO lo que pagó (${g.inscritos} personas). Escribe el motivo: cada uno lo ve.`, `The group is cancelled and every enrolled person gets ALL they paid back (${g.inscritos} people). Write the reason: everyone sees it.`) });
        out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: no se completó el mínimo de alumnos", "E.g. not enough students signed up"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
        out.push({ type: "acts", items: [
          { l: E2("Sí, cancelar y devolver a todos", "Yes, cancel and refund everyone"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => inscCancelarGrupo(c.d.id, g.id, mot), E2("Grupo cancelado: cada inscrito recibe todo lo que pagó.", "Group cancelled: everyone gets all they paid back."), () => c.setUi({ [k]: null, igr: null })) },
          { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
      }
    }
  }
  if (P.espera.length) out.push({ type: "rows", k: E2("LISTA DE ESPERA · POR ORDEN DE LLEGADA", "WAITLIST · IN ORDER OF ARRIVAL"), items: P.espera.map((w): Fila => ({ key: `w${w.id}`, icon: "clock", t: `${w.cliente} · ${nm(c, w.svc)}`,
    s: `${w.grupo ? nm(c, w.grupo) : E2("Sin grupo todavía", "No group yet")}${w.libres != null ? ` · ${E2(`${w.libres} cupos libres`, `${w.libres} seats left`)}` : ""}`,
    ...(w.estado === "offered" ? { tag: E2("CUPO OFRECIDO · 48 H", "SPOT OFFERED · 48 H"), tone: "action" } : { acts: [{ l: E2("Ofrecer el cupo", "Offer the spot"), v: "secondary", off: c.pending, onClick: () => c.run(() => inscOfrecer(c.d.id, w.id), E2("Le ofrecimos el cupo: tiene 48 horas para tomarlo.", "We offered the spot: they have 48 hours to take it.")) }] }) })) });
  if (P.activas.length) out.push({ type: "rows", k: E2("ACTIVAS", "ACTIVE"), items: P.activas.slice(0, 60).map((x) => fila(c, x)) });
  if (!P.esperan.length && !P.activas.length && !P.grupos.length && !P.espera.length) out.push({ type: "empty", icon: "users", t: E2("Todavía no hay inscripciones", "No enrollments yet"), s: E2("Cuando alguien se inscriba desde tu página, lo ves aquí y en Hoy.", "When someone enrolls from your page, you see it here and in Today.") });
  return { blocks: out, ed: null };
}

export function inscDetalleBloques(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.ins?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Inscripción no encontrada", "Enrollment not found"), onBack: c.closeDet }, { type: "empty", icon: "calendar", t: E2("Esa inscripción no existe", "That enrollment does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const V = VOC[x.rubro], matL = nm(c, V.mat), fe = x.rubro === "fe";
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: E2("PROPUSISTE OTRO GRUPO", "YOU PROPOSED ANOTHER GROUP"), confirmed: x.detalle === "cancel_req" ? E2("PIDE LA BAJA", "WANTS TO CANCEL") : x.detalle === "started" ? E2("EN CURSO", "IN PROGRESS") : E2("CONFIRMADA", "CONFIRMED"),
    declined: E2("NO HABÍA CUPO", "NO OPENING"), expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADA", "CANCELLED"), done: E2("TERMINADA", "FINISHED") } as Record<string, string>)[x.estado] ?? x.estado.toUpperCase();
  const pay = x.pago === "held" ? E2("retenida", "held") : x.pago === "captured" ? E2("cobrada", "charged") : x.pago === "released" ? E2("liberada", "released") : x.pago === "refunded" ? E2("devuelta", "refunded") : "—";
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${fe ? E2("TU LUGAR", "SPOT") : E2("INSCRIPCIÓN", "ENROLLMENT")} · ${stL}`, t: x.numero, s: `${x.cliente} · ${nm(c, x.svc)}`, onBack: c.closeDet },
    x.estado === "pending" && x.vence ? { type: "note", tone: "info", icon: "clock", t: (E2(`Responde antes de ${new Date(x.vence).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}. ${x.mat ? "Si no, vence y se libera la matrícula." : "Si no, vence."}`, `Reply before ${new Date(x.vence).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}. ${x.mat ? "Otherwise it expires and the fee is released." : "Otherwise it expires."}`)).replace(/\.\./g, ".") } : null,
    { type: "kv", items: [
      { k: fe ? E2("SERVICIO", "SERVICE") : E2("INSCRIPCIÓN", "ENROLLMENT"), v: nm(c, x.svc) }, ...(x.grupo ? [{ k: x.fecha ? E2("FECHA QUE PIDE", "REQUESTED DATE") : E2("GRUPO", "GROUP"), v: x.fecha ? nm(c, x.grupo) : `${nm(c, x.grupo)}${x.inicio ? ` · ${E2("empieza", "starts")} ${fechaCorta(x.inicio, es)}` : ""}` }] : []),
      { k: E2("PARA", "FOR"), v: paraL(c, x.para) }, ...(x.nivel ? [{ k: E2("NIVEL", "LEVEL"), v: { cero: E2("Desde cero", "From zero"), algo: E2("Sabe algo", "Knows some"), medio: E2("Intermedio", "Intermediate") }[x.nivel] }] : []),
      ...(x.equipo ? [{ k: E2("EQUIPO", "TEAM"), v: x.equipo }] : []),
      { k: E2("PRECIO", "PRICE"), v: fe ? (x.precio ? E2(`Donativo sugerido ${usdI(x.precio)} · si no puede, no se cobra`, `Suggested donation ${usdI(x.precio)} · no charge if they cannot`) : E2("Gratis", "Free")) : x.precio ? usdI(x.precio) : E2("Gratis", "Free") }, ...(x.mat ? [{ k: matL.toUpperCase(), v: `${usdI(x.mat)} · ${pay}` }] : x.matLocal ? [{ k: matL.toUpperCase(), v: `${usdI(x.matLocal)} · ${E2("en tu lugar", "at your place")}` }] : []),
      ...(x.g1 ? [{ k: E2("PRIMERA CLASE", "FIRST CLASS"), v: E2("Gratis (primera vez aquí)", "Free (first time here)") }] : []),
    ] },
    x.nota ? { type: "note", tone: "ink", icon: x.notaPrivada ? "shield" : "bubble", t: x.notaPrivada ? E2(`Nota privada (cifrada; tu vista queda registrada y se borra a los 30 días): «${x.nota}»`, `Private note (encrypted; your view is logged and it is deleted after 30 days): “${x.nota}”`) : `«${x.nota}»` } : null,
  ];
  // Los datos del niño: solo aquí, para tu negocio; quedan en la auditoría y se borran a los 30 días de terminar.
  if (x.ninoPanel) out.push({ type: "group", k: E2("SU NIÑO O NIÑA · PRIVADO", "THEIR CHILD · PRIVATE") }, { type: "kv", items: [
    { k: E2("NOMBRE", "NAME"), v: x.ninoPanel.nombre }, { k: E2("EDAD O GRADO", "AGE OR GRADE"), v: x.ninoPanel.edad != null ? E2(`${x.ninoPanel.edad} años`, `${x.ninoPanel.edad} years`) : x.ninoPanel.grado ?? "—" },
    ...(x.ninoPanel.escuela ? [{ k: E2("ESCUELA", "SCHOOL"), v: x.ninoPanel.escuela }] : []), ...(x.ninoPanel.nota ? [{ k: E2("NOTA", "NOTE"), v: x.ninoPanel.nota }] : [])] });
  if (x.ninoPanel) out.push({ type: "note", tone: "info", icon: "shield", t: E2("Solo tú y tu equipo lo ven. Cada vista queda registrada y se borra a los 30 días de terminar. El acta, las vacunas y quién puede recogerlo se entregan en persona.", "Only you and your team see this. Each view is logged and it is deleted 30 days after it ends. Birth certificate, vaccines and pickup list are handed in person.") });
  if (x.estado === "pending") {
    const otro = ui.iOtro === x.numero;
    out.push({ type: "acts", items: [
      { l: E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => inscResponder(c.d.id, x.numero, "confirmar"), x.mat ? E2(`Confirmada: se cobró la ${matL.toLowerCase()}.`, "Confirmed: the fee was charged.") : E2("Confirmada.", "Confirmed.")) },
      { l: x.fecha ? E2("Otra fecha", "Another date") : E2("Otro grupo", "Another group"), v: "secondary", icon: "calendar", off: c.pending || (x.fecha ? !x.fechas.length : !x.otros.length), onClick: () => c.setUi({ iOtro: otro ? null : x.numero, iFecha: null }) },
      { l: x.fecha ? E2("No hay fecha", "No date") : E2("No hay cupo", "No opening"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => inscResponder(c.d.id, x.numero, "nohay"), E2("Listo: la persona sabe y se liberó todo.", "Done: they know and everything was released.")) }] });
    // 4ie · Iglesias «Pedir fecha»: la otra fecha y la franja (la persona tiene hasta 48 h para aceptar).
    if (otro && x.fecha) {
      const f0 = (ui.iFecha as string | null) ?? null;
      out.push({ type: "chips", k: E2("¿QUÉ FECHA SÍ PUEDEN?", "WHICH DATE WORKS?"), items: x.fechas.map((d) => ({ l: diaVis(d, es), v: f0 === d ? "selected" : "filter", onClick: () => c.setUi({ iFecha: d }) })) });
      if (f0) out.push({ type: "chips", k: E2("¿EN QUÉ FRANJA?", "WHAT TIME OF DAY?"), help: E2("LA PERSONA TIENE HASTA 48 H PARA ACEPTAR", "THEY HAVE UP TO 48 H TO ACCEPT"),
        items: FRANJAS.map(([k, a, z]) => ({ l: es ? a : z, v: "filter", onClick: () => c.run(() => inscResponder(c.d.id, x.numero, "otro", `${f0}|${k}`), E2("Propusiste otra fecha.", "You proposed another date."), () => c.setUi({ iOtro: null, iFecha: null })) })) });
    }
    if (otro && !x.fecha) out.push({ type: "chips", k: E2("¿EN QUÉ GRUPO SÍ HAY CUPO?", "WHICH GROUP HAS ROOM?"), help: E2("LA PERSONA TIENE 48 H PARA ACEPTAR", "THEY HAVE 48 H TO ACCEPT"),
      items: x.otros.map((g) => ({ l: `${nm(c, g.label)} · ${fechaCorta(g.inicio, es)}`, v: "filter", onClick: () => c.run(() => inscResponder(c.d.id, x.numero, "otro", g.id), E2("Propusiste otro grupo.", "You proposed another group."), () => c.setUi({ iOtro: null })) })) });
  }
  if (x.estado === "confirmed" && x.detalle === "cancel_req") out.push({ type: "acts", items: [{ l: E2("Confirmar la cancelación", "Confirm the cancellation"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => inscConfirmarBaja(c.d.id, x.numero), E2("Cancelada: le llegó su constancia.", "Cancelled: they got their record.")) }] });
  if (x.estado === "confirmed" && x.detalle !== "cancel_req") {
    const k = `icx:${x.numero}`, mot = (ui[k] as string | undefined) ?? null;
    if (mot == null) out.push({ type: "acts", items: [
      ...(x.detalle !== "started" ? [{ l: E2("Empezó", "Started"), v: "secondary", icon: "check", off: c.pending, onClick: () => c.run(() => inscMarcar(c.d.id, x.numero, "empezo"), E2("Listo: en curso.", "Done: in progress.")) }] : []),
      ...(x.detalle === "started" && x.k !== "mes" && x.k !== "semana" ? [{ l: x.cert ? E2("Terminó · entregué el certificado", "Finished · certificate given") : E2("Terminó", "Finished"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => inscMarcar(c.d.id, x.numero, "termino", !!x.cert), E2("Listo: terminada.", "Done: finished.")) }] : []),
      { l: E2("Cancelar la inscripción", "Cancel the enrollment"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2("Si cancelas, la persona recibe todo lo que pagó en la app y queda en tu historial. Escribe el motivo: la persona lo ve.", "If you cancel, they get back everything paid in the app and it stays on your record. Write the reason: they see it.") });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: cambió el horario del maestro", "E.g. the teacher's schedule changed"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar y devolver", "Yes, cancel and refund"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => inscCancelarNeg(c.d.id, x.numero, mot), E2("Cancelada: recibe todo lo que pagó.", "Cancelled: they get everything back."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  if (x.plan) out.push({ type: "rows", k: E2("PLAN DE PAGOS · POR ESCRITO · SE PAGA EN TU LUGAR", "PAYMENT PLAN · IN WRITING · PAID AT YOUR PLACE"), items: x.plan.cal.map((p): Fila => ({ key: `p${p.n}`, icon: "dollar",
    t: `${E2("Pago", "Payment")} ${p.n} · ${usdI(p.cents)}`, s: fechaCorta(p.due, es),
    ...(x.plan!.pagadas.includes(p.n) ? { tag: E2("PAGADO", "PAID"), tone: "signal" } : { acts: [{ l: E2("Marcar pagado", "Mark paid"), v: "secondary", off: c.pending, onClick: () => c.run(() => inscCuota(c.d.id, x.numero, p.n), E2("Marcado: pagó en tu lugar.", "Marked: paid at your place.")) }] }) })) });
  if (x.motivoNeg) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`Cancelaste: «${x.motivoNeg}».`, `You cancelled: “${x.motivoNeg}”.`) });
  // 4ef: la ayuda con la inscripción (responder en 24 h: aceptar, proponer otra cosa o no aceptar).
  out.push(...ayudaCita(c, x.numero, x.cliente));
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.historial.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(c, e.note) : verbo(e.kind, es),
    s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { insc_sent: ["Pidió la inscripción", "Requested enrollment"], insc_ok: ["Confirmaste", "You confirmed"], insc_no: ["No había cupo", "No opening"], insc_alt: ["Propusiste otro grupo", "You proposed another group"],
    alt_accepted: ["Aceptó el otro grupo", "Accepted the other group"], alt_declined: ["No le sirvió el otro grupo", "The other group did not work"], insc_exp: ["Venció sin respuesta", "Expired without reply"],
    insc_cx: ["Canceló", "Cancelled"], insc_cx_kept: ["Canceló después de empezar", "Cancelled after starting"], insc_biz_cx: ["Cancelaste", "You cancelled"], insc_group_cx: ["El grupo no abrió", "The group did not open"],
    insc_start: ["Empezó", "Started"], insc_done: ["Terminó", "Finished"], insc_cert: ["Terminó con certificado", "Finished with certificate"], insc_remind: ["Le recordamos que empieza mañana", "Reminded them it starts tomorrow"],
    insc_g1: ["Primera clase gratis", "Free first class"], insc_cancel_req: ["Pidió la baja", "Asked to cancel"], insc_cancel_ok: ["Baja confirmada", "Cancellation confirmed"],
    payment_captured: ["Se cobró la matrícula", "Fee charged"], payment_released: ["Se liberó la matrícula", "Fee released"], refunded: ["Se devolvió la matrícula", "Fee refunded"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
