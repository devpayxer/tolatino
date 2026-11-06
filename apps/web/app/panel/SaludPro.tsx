"use client";
/* Lo que vendes › Tu herramienta de Doctores («Seguros e idiomas») y de Profesionales («Licencias y el total por escrito»).
   Diseño: Panel v2 · dash2-cat.js (TOOLS NEG-SALUD / NEG-PRO, blocks NEG-SALUD y NEG-PRO); plan fase4-salud-pro.md §6.
   Cada toque se guarda en el servidor (acciones-salud-pro.ts) y la página y Buscar lo dicen al momento. Las licencias de un
   profesional son las de Tu página › Licencias (el mismo bloque, las mismas acciones). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { aceptaTexto, LANGS_SALUD, resumenSP, type HerrPro, type HerrSalud } from "@/lib/salud-pro-comun";
import { govGuardar, proGuardar, saludGuardar, type ProIn, type SaludIn } from "./acciones-salud-pro";
import type { Ctx, Sec } from "./Panel";

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
const lic = (c: Ctx) => { const L = c.d.lic?.filas ?? []; return { ok: L.filter((x) => x.status === "valid").length, rev: L.filter((x) => x.status === "review").length }; };

/* La fila de Lo que vendes (entre Servicios y Citas). */
export function filaHerramientaSP(c: Ctx): Fila | null {
  const h = c.svc?.sp, { E2 } = c;
  if (!h) return null;
  return { icon: h.rubro === "salud" ? "insurance" : "law", t: h.rubro === "salud" ? E2("Seguros e idiomas", "Insurance and languages") : E2("Licencias y el total por escrito", "Licenses and the total in writing"),
    s: resumenSP(h, c.es, lic(c)), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaSPBloques(c: Ctx, licencias: (c: Ctx) => Sec): Sec {
  const h = c.svc!.sp!, { E2 } = c;
  const head: Bloque = { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"),
    t: h.rubro === "salud" ? E2("Seguros e idiomas", "Insurance and languages") : E2("Licencias y el total por escrito", "Licenses and the total in writing"),
    s: h.rubro === "salud" ? E2("Lo que más preguntan: ¿aceptan mi seguro y me entienden? Lo que marques aquí sale en tu página y en Buscar.", "What people ask most: do you take my insurance and do you speak my language? What you mark shows on your page and in Search.")
      : h.legal ? E2("Lo que puedes hacer por ley, lo que no haces y el total de cada trámite: honorario más lo que cobra el gobierno.", "What you may do by law, what you do not do and the total of each service: your fee plus the government fee.")
        : E2("Cuándo entregas, la garantía y si das el precio antes de empezar. Lo que marques aquí sale en tu página.", "When you deliver, the warranty and whether you price it before starting. What you mark shows on your page.") };
  return h.rubro === "salud" ? salud(c, h, head) : pro(c, h, head, licencias);
}

function salud(c: Ctx, S: HerrSalud, head: Bloque): Sec {
  const { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const save = (p: SaludIn) => c.run(() => saludGuardar(c.d.id, p), E2("Guardado · tu página ya lo dice.", "Saved · your page says so now."));
  const tg = (k: string) => { const L = S.ins.includes(k) ? S.ins.filter((x) => x !== k) : [...S.ins, k]; if (!L.length && !S.sin) { c.toast(E2("Deja al menos un seguro o marca «Sin seguro».", "Keep at least one insurer or mark “No insurance”.")); return; } save({ ins: L }); };
  const grp = (k: string, kind: "pub" | "priv"): Bloque => ({ type: "rows", k, cols: cols2, items: S.cat.filter((x) => x.kind === kind).map((x): Fila => ({ key: x.key, icon: "insurance", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.6)", t: es ? x.name.es : x.name.en, tgOn: S.ins.includes(x.key), onTg: () => tg(x.key), compact: true })) });
  const out: (Bloque | null)[] = [head,
    { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("SEGUROS", "INSURERS"), v: String(S.ins.length) }, { k: E2("SIN SEGURO", "UNINSURED"), v: S.sin ? `$${S.cash / 100}` : "—" }, { k: E2("IDIOMAS", "LANGUAGES"), v: S.langs.map((l) => l.toUpperCase()).join(" · ") }] },
    grp(E2("PÚBLICOS", "PUBLIC"), "pub"), grp(E2("PRIVADOS", "PRIVATE"), "priv"),
    { type: "rows", k: E2("SIN SEGURO", "NO INSURANCE"), items: [{ icon: "dollar", t: E2("Atiendes sin seguro", "You see uninsured patients"), s: E2("Tu página dice el precio de la consulta.", "Your page shows the visit price."), tgOn: S.sin,
      onTg: () => { if (S.sin && !S.ins.length) { c.toast(E2("Deja al menos un seguro o marca «Sin seguro».", "Keep at least one insurer or mark “No insurance”.")); return; } save({ sin: !S.sin }); } }] },
    S.sin ? { type: "step", t: E2("Consulta sin seguro", "Uninsured visit"), s: E2("El precio completo, sin cargos escondidos.", "The full price, no hidden fees."), v: `$${S.cash / 100}`, onM: () => save({ cash: Math.max(2000, S.cash - 500) }), onP: () => save({ cash: Math.min(40000, S.cash + 500) }) } : null,
    { type: "chips", k: E2("IDIOMAS EN LA CONSULTA", "LANGUAGES IN THE VISIT"), items: LANGS_SALUD.map(([v, l]) => ({ l, v: S.langs.includes(v) ? "selected" : "filter", onClick: () => { const L = S.langs.includes(v) ? S.langs.filter((x) => x !== v) : [...S.langs, v]; if (L.length) save({ langs: L }); else c.toast(E2("Deja al menos un idioma.", "Keep at least one language.")); } })) },
    { type: "rows", items: [
      { icon: "phone", t: E2("Consulta por video", "Video visits"), s: E2("Sale el filtro «Telemedicina» en Buscar.", "Shows under “Telehealth” in Search."), tgOn: S.tele, onTg: () => save({ tele: !S.tele }) },
      { icon: "language", t: E2("Intérprete en la consulta", "Interpreter in the visit"), s: E2("Para el idioma que no hablen ustedes. Sale el filtro «Intérprete» en Buscar.", "For a language your team does not speak. Shows under “Interpreter” in Search."), tgOn: S.interp, onTg: () => save({ interp: !S.interp }) },
      { icon: "users", t: E2("Aceptas pacientes nuevos", "You take new patients"), s: S.nuevos ? E2("Cualquiera puede pedir cita.", "Anyone can request a visit.") : E2("Solo tus pacientes piden cita.", "Only your patients can book."), tgOn: S.nuevos, onTg: () => save({ nuevos: !S.nuevos }) }] },
    S.walk ? { type: "step", t: E2("Espera ahora sin cita", "Walk-in wait right now"), s: E2("Cámbiala cuando se llene; sale en tu página y en Buscar.", "Change it when it fills up; it shows on your page and in Search."), v: `~${S.wait} min`, onM: () => save({ wait: Math.max(0, S.wait - 5) }), onP: () => save({ wait: Math.min(180, S.wait + 5) }) } : null,
    { type: "rows", k: E2("QUIÉN PUEDE VENIR", "WHO CAN COME"), items: [
      { icon: "dollar", t: E2("Precio según tus ingresos", "Income-based price"), s: E2("Sale «Según tus ingresos» en tu página y en Buscar.", "Shows “Income-based” on your page and in Search."), tgOn: S.escala, onTg: () => save({ escala: !S.escala }) },
      { icon: "shield", t: E2("Sin papeles ni seguro social", "No papers or SSN"), s: E2("Solo nombre y una forma de contactar.", "Just a name and a way to reach them."), tgOn: S.sinid, onTg: () => save({ sinid: !S.sinid }) }] },
    S.ins.length ? { type: "note", tone: "ok", icon: "check", t: E2(`En Buscar y en tu página: «${aceptaTexto(S, true)}».`, `In Search and on your page: “${aceptaTexto(S, false)}”.`) } : null,
    { type: "note", tone: "info", icon: "lock", t: E2("To’Latino no ve el historial médico de nadie. El seguro del paciente solo se usa para decirle si lo aceptas y cuánto paga.", "To’Latino never sees anyone’s medical history. The patient’s insurance is only used to tell them whether you take it and what they pay.") },
  ];
  return { blocks: out, ed: null };
}

function pro(c: Ctx, S: HerrPro, head: Bloque, licencias: (c: Ctx) => Sec): Sec {
  const { E2 } = c;
  const save = (p: ProIn) => c.run(() => proGuardar(c.d.id, p), E2("Guardado · tu página ya lo dice.", "Saved · your page says so now."));
  const dl = (n: number) => (n <= 1 ? E2("El mismo día", "Same day") : E2(`${n} días`, `${n} days`));
  const out: (Bloque | null)[] = [head];
  if (!S.legal) {
    if (S.kind === "seg") out.push({ type: "step", t: E2("Compañías con las que trabajas", "Insurers you work with"), s: E2(`Sale en tu página: «Comparamos ${S.cos} compañías».`, `Shows on your page: “We compare ${S.cos} insurers”.`), v: String(S.cos), onM: () => save({ cos: Math.max(1, S.cos - 1) }), onP: () => save({ cos: Math.min(30, S.cos + 1) }) },
      { type: "rows", items: [{ icon: "check", t: E2("Comparas precios por el cliente", "You compare prices for the client"), s: E2("Tu página dice que das el precio de cada compañía.", "Your page says you give each insurer’s price."), tgOn: S.cmp, onTg: () => save({ cmp: !S.cmp }) }] });
    else {
      out.push({ type: "step", t: S.kind === "repair" || S.kind === "print" ? E2("Listo en", "Ready in") : E2("Entregas en", "You deliver in"), s: E2("Lo ve el cliente en la tarjeta de Hoy y en las preguntas.", "Clients see it on the Today card and in the FAQ."), v: dl(S.days), onM: () => save({ days: Math.max(1, S.days - 1) }), onP: () => save({ days: Math.min(90, S.days + 1) }) });
      if (S.kind === "repair" || S.kind === "digital") out.push({ type: "step", t: E2("Garantía", "Warranty"), s: E2("En la pieza y el trabajo. 0 = sin garantía.", "On parts and labor. 0 = no warranty."), v: E2(`${S.warr} días`, `${S.warr} days`), onM: () => save({ warr: Math.max(0, S.warr - 15) }), onP: () => save({ warr: Math.min(365, S.warr + 15) }) });
      out.push({ type: "rows", items: [{ icon: "dollar", t: E2("Presupuesto antes de empezar", "Estimate before starting"), s: E2("Nada se cobra sin el OK del cliente.", "Nothing is charged without the client’s OK."), tgOn: S.est, onTg: () => save({ est: !S.est }) }] });
    }
  }
  // Las licencias (las de Tu página › Licencias): un profesional sin licencias y sin oficio legal no las ve aquí.
  const L = licencias(c), conLic = (c.d.lic?.filas.length ?? 0) > 0;
  if (S.legal || conLic) out.push(...L.blocks.filter((b) => !(b && b.type === "note")));
  out.push({ type: "rows", k: E2("CÓMO ATIENDES", "HOW YOU WORK"), items: [
    { icon: "calendar", t: E2("Plan de pagos", "Payment plan"), s: E2("Sale el filtro «Plan de pagos» en Buscar. Lo acuerdas por escrito con cada cliente.", "Shows under “Payment plan” in Search. You agree on it in writing with each client."), tgOn: S.plan, onTg: () => save({ plan: !S.plan }) },
    { icon: "clock", t: E2("Casos urgentes", "Urgent cases"), s: E2("Sale el filtro «Urgente» en Buscar: alguien te contesta el mismo día.", "Shows under “Urgent” in Search: someone answers the same day."), tgOn: S.urgente, onTg: () => save({ urgente: !S.urgente }) }] });
  if (!S.legal) {
    if (!conLic) out.push({ type: "note", tone: "ink", icon: "check", t: E2("Tu página dice el precio total y lo que no haces. Nada se cobra sin el OK del cliente.", "Your page shows the total price and what you do not do. Nothing is charged without the client’s OK.") });
    return { blocks: out, ed: conLic ? L.ed : null };
  }
  out.push({ type: "group", k: E2("EL TOTAL, POR ESCRITO", "THE TOTAL, IN WRITING") });
  if (!S.gov.length) out.push({ type: "note", tone: "info", icon: "info", t: E2("Cuando tengas un servicio de honorario fijo, aquí le pones lo que cobra el gobierno y tu página dice el total.", "When you have a flat-fee service, set the government fee here and your page shows the total.") });
  for (const i of S.gov) {
    const st = (d: number) => c.run(() => govGuardar(c.d.id, i.id, Math.max(0, i.gov + d)), E2("Guardado · tu página ya dice el total.", "Saved · your page shows the total now."));
    out.push({ type: "step", t: c.es ? i.name.es : i.name.en || i.name.es, s: E2(`Honorario ${usd(i.cents)} + gobierno ${usd(i.gov)} = total ${usd(i.cents + i.gov)}`, `Fee ${usd(i.cents)} + government ${usd(i.gov)} = total ${usd(i.cents + i.gov)}`),
      v: E2(`gob. ${usd(i.gov)}`, `gov. ${usd(i.gov)}`), onM: () => st(-500), onP: () => st(500) });
  }
  out.push({ type: "note", tone: "ink", icon: "law", t: E2("Nadie te garantiza un resultado. En EE. UU. un notario no es abogado: tu página lo dice.", "No one can guarantee a result. In the U.S. a notary is not a lawyer: your page says so.") });
  return { blocks: out, ed: L.ed };
}
