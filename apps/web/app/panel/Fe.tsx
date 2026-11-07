"use client";
/* Lo que vendes › Tu herramienta de Iglesias. Diseño: Panel v2 · dash2-cat.js HEAD L447 y blocksE L488–507: misa → MISA EN ESPAÑOL y
   culto → TUS CULTOS DE LA SEMANA (atajos que se prenden y apagan; al menos uno), También en inglés, AYUDA GRATIS · SALE EN BUSCAR,
   Catecismo · inscripciones abiertas; despensa → «La ayuda de hoy» (Se acabó por hoy, Sin papeles, ropa, CADA CUÁNTO PUEDE VENIR UNA
   FAMILIA); funeraria → «Precios y repatriación» (Las 24 horas, PRECIO TOTAL por servicio, plan de pagos como texto, REPATRIACIÓN A RD ·
   DÍAS); REGLAS · NO SE APAGAN. Plan fase4-iglesias-inmuebles-autos.md §4ia y §5. La hora libre fuera de los atajos va en «Otro horario».
   Cada toque se guarda en el servidor (acciones-fe.ts) con su línea en la auditoría. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { AYUDA, DIA_FE, FREQ, LANG_FE, QUE_FE, REGLAS_FE, REGLAS_FUN, REP, atajosDe, cortoFe, horaFe, pideUnHorario, resumenFe, tituloFe, type HerrFe } from "@/lib/fe-comun";
import { feGuardar } from "./acciones-fe";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;

export function filaHerramientaFe(c: Ctx): Fila | null {
  const h = c.svc?.fe, { E2, es } = c;
  if (!h) return null;
  if (h.kind === "tienda") return { icon: "bell", t: E2("Tu herramienta", "Your tool"), s: E2("Tu tienda va por contacto: la gente te llama o te escribe. Lo que vendes va en Servicios.", "Your store works by contact: people call or message you. What you sell goes in Services."), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action" };
  return { icon: "bell", t: tituloFe(h, es), s: resumenFe(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaFeBloques(c: Ctx): Sec {
  const h = c.svc!.fe!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof feGuardar>[1], m = ok) => c.run(() => feGuardar(c.d.id, p), m);
  const HEAD = h.kind === "fun" ? E2("Cuándo atiendes, el precio total de cada servicio y cuánto tarda la repatriación. Lo que pongas aquí es lo que sale en tu página.", "When you answer, the total price of each service and how long repatriation takes. What you set here shows on your page.")
    : h.kind === "ayuda" ? E2("Si hoy queda comida, si pides papeles y cada cuánto puede venir una familia. La ayuda no pregunta estatus.", "Whether there is food left today, whether you ask for papers and how often a family can come. Help never asks about status.")
    : h.kind === "misa" ? E2("A qué hora es la misa en español y qué ayuda das gratis. La ayuda no pregunta estatus.", "When the Spanish mass is and what free help you give. Help never asks about status.")
    : E2("A qué hora son tus cultos, en qué idioma y qué ayuda das gratis. La ayuda no pregunta estatus.", "When your services are, in which language and what free help you give. Help never asks about status.");
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloFe(h, es), s: HEAD }];
  const reglas = (R: typeof REGLAS_FE) => out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: R.map(([t, s]) => lock(es ? t.es : t.en, es ? s.es : s.en)) });

  if (h.kind === "ayuda") {
    const fq = FREQ.find((f) => f[0] === h.freq) ?? FREQ[0]!;
    out.push({ type: "rows", k: E2("HOY", "TODAY"), items: [{ icon: "bag", t: E2("Se acabó por hoy", "Out for today"),
      s: h.agotado ? E2("Tu página dice «Se acabó por hoy». Mañana se apaga solo.", "Your page says «Out for today». It turns off by itself tomorrow.") : E2("Préndelo si ya no queda comida; así nadie viene de balde.", "Turn it on when food runs out, so nobody comes for nothing."),
      tgOn: h.agotado, onTg: () => save({ agotado: !h.agotado }) }] });
    out.push({ type: "rows", k: E2("CÓMO AYUDAS", "HOW YOU HELP"), cols: cols2, items: [
      { icon: "verified", t: E2("Sin papeles ni seguro social", "No papers or SSN"), s: h.sinid ? E2("Solo el nombre y cuántos son en casa.", "Just the name and household size.") : E2("Piden una ID de cualquier país.", "They ask for any country ID."), tgOn: h.sinid, onTg: () => save({ sinid: !h.sinid }), compact: true },
      { icon: "heart", t: E2("También das ropa", "You also give clothing"), tgOn: h.help.includes("ropa"), onTg: () => save({ ayuda: { k: "ropa", on: !h.help.includes("ropa") } }), compact: true }] });
    out.push({ type: "chips", k: E2("CADA CUÁNTO PUEDE VENIR UNA FAMILIA", "HOW OFTEN A FAMILY CAN COME"), help: es ? fq[3] : fq[4], items: FREQ.map((f) => ({ l: es ? f[1] : f[2], v: f[0] === fq[0] ? "selected" : "filter", onClick: () => save({ freq: f[0] }) })) });
    reglas(REGLAS_FE);
    return { blocks: out, ed: null };
  }

  if (h.kind === "fun") {
    out.push({ type: "rows", k: E2("CUÁNDO ATIENDES", "WHEN YOU ANSWER"), items: [{ icon: "clock", t: E2("Las 24 horas", "24 hours"),
      s: h.h24 ? E2("Tu página dice «Atiende las 24 horas», también domingos.", "Your page says «Open 24 hours», Sundays too.") : E2("Tu página dice tu horario; fuera de horario dejan mensaje.", "Your page shows your hours; after hours they leave a message."),
      tgOn: h.h24, onTg: () => save({ h24: !h.h24 }) }] });
    out.push({ type: "group", k: E2("PRECIO TOTAL · SALE EN TU PÁGINA", "TOTAL PRICE · SHOWS ON YOUR PAGE") });
    if (!h.totales.length) out.push({ type: "note", tone: "warn", icon: "info", t: E2("Primero agrega tus servicios con «Precio total por escrito» en Servicios.", "First add your services with “Written total price” in Services."), cta: E2("Servicios", "Services"), onCta: () => c.go("mod", "servicios") });
    for (const it of h.totales) out.push({ type: "step", t: es ? it.name.es : it.name.en || it.name.es, s: E2("El total por escrito; lo que va aparte se dice.", "The written total; anything extra is stated."), v: usd(it.cents),
      onM: () => save({ precio: { item: it.id, cents: Math.max(50000, Math.ceil(it.cents / 10000) * 10000 - 10000) } }), onP: () => save({ precio: { item: it.id, cents: Math.min(3000000, Math.floor(it.cents / 10000) * 10000 + 10000) } }) });
    out.push({ type: "rows", items: [{ icon: "dollar", t: E2("Plan de pagos · hasta 12 pagos", "Payment plan · up to 12 payments"), s: h.plan ? E2("Sale en el servicio completo. Lo acuerdas con la familia; To’Latino no lo cobra.", "Shows on the full service. You agree on it with the family; To’Latino does not charge it.") : E2("Apagado: se paga al contratar.", "Off: paid when you sign."), tgOn: h.plan, onTg: () => save({ plan: !h.plan }) }] });
    if (h.repatria) out.push({ type: "chips", k: E2("REPATRIACIÓN A RD · DÍAS", "REPATRIATION TO THE DR · DAYS"), items: REP.map((r) => ({ l: `${r}${E2(" días", " days")}`, v: h.rep === r ? "selected" : "filter", onClick: () => save({ rep: r }) })) });
    reglas(REGLAS_FUN);
    return { blocks: out, ed: null };
  }

  // Misa, culto y los demás con horarios (grupo, sacramentos, consejería, oración): los atajos son los del prototipo.
  const SL = atajosDe(h.kind), mi = h.kind === "misa", unoMin = pideUnHorario(h.kind);
  const at = (dow: number, min: number) => h.horarios.some((x) => x.dow === dow && x.min === min);
  out.push({ type: "chips", k: mi ? E2("MISA EN ESPAÑOL", "SPANISH MASS") : h.kind === "culto" ? E2("TUS CULTOS DE LA SEMANA", "YOUR WEEKLY SERVICES") : E2("TUS HORARIOS DE LA SEMANA", "YOUR WEEKLY SCHEDULE"), help: E2("toca para prender o apagar", "tap to turn on or off"),
    items: SL.map((m) => { const on = at(m[2], m[3]); return { l: es ? m[0] : m[1], v: on ? "selected" : "filter", onClick: () => {
      if (on && unoMin && h.horarios.every((x) => x.dow === m[2] && x.min === m[3])) { c.toast(mi ? E2("Deja al menos una misa.", "Keep at least one mass.") : E2("Deja al menos un culto.", "Keep at least one service.")); return; }
      save({ atajo: { dow: m[2], min: m[3], on: !on } }); } }; }) });
  const otros = h.horarios.filter((x) => !SL.some((m) => m[2] === x.dow && m[3] === x.min));
  out.push({ type: "group", k: E2("OTROS HORARIOS", "OTHER TIMES"), link: E2("Agregar", "Add"), onLink: () => c.det("fe:hor:new") });
  if (otros.length) out.push({ type: "rows", cols: cols2, items: otros.map((x) => ({ key: x.id, icon: "calendar", t: `${es ? x.label.es : x.label.en || x.label.es} · ${cortoFe(x.dow, x.min, es)}`, s: `${es ? QUE_FE[x.kind].es : QUE_FE[x.kind].en} · ${es ? LANG_FE[x.lang].es : LANG_FE[x.lang].en}`, compact: true,
    acts: [{ l: E2("Quitar", "Remove"), v: "soft", off: c.pending, onClick: () => { if (unoMin && h.horarios.length <= 1) { c.toast(mi ? E2("Deja al menos una misa.", "Keep at least one mass.") : E2("Deja al menos un culto.", "Keep at least one service.")); return; } save({ quitar: x.id }, E2("Quitado · ya no sale en tu página.", "Removed · no longer on your page.")); } }] })) });
  else out.push({ type: "note", tone: "info", icon: "calendar", t: E2("¿Una hora que no está arriba, un grupo de jóvenes o una oración? Agrégala aquí.", "A time not listed above, a youth group or a prayer? Add it here.") });
  out.push({ type: "rows", items: [{ icon: "language", t: E2("También en inglés", "Also in English"), s: h.bil ? E2("Tu página dice «Español e inglés».", "Your page says «Spanish and English».") : E2("Tu página dice «Español».", "Your page says «Spanish»."), tgOn: h.bil, onTg: () => save({ bil: !h.bil }) }] });
  out.push({ type: "rows", k: E2("AYUDA GRATIS · SALE EN BUSCAR", "FREE HELP · SHOWS IN SEARCH"), cols: cols2, items: AYUDA.map(([k, le, ln]) => ({ key: k, icon: k === "despensa" ? "restaurant" : k === "jovenes" || k === "ninos" ? "users" : k === "transporte" ? "pin" : "heart",
    t: es ? le : ln, tgOn: h.help.includes(k), onTg: () => save({ ayuda: { k, on: !h.help.includes(k) } }), compact: true })) });
  if (mi) out.push({ type: "rows", items: [{ icon: "calendar", t: E2("Catecismo · inscripciones abiertas", "Catechism · registration open"),
    s: !h.hayCurso ? E2("Agrega el catecismo en Servicios (curso con grupos) para que salga.", "Add catechism in Services (course with groups) so it shows.") : h.catequesis ? E2("Las familias se inscriben en la app.", "Families register in the app.") : E2("Cerradas: no sale para inscribirse.", "Closed: not open for registration."),
    tgOn: h.catequesis, onTg: () => save({ catequesis: !h.catequesis }) }] });
  reglas(REGLAS_FE);
  return { blocks: out, ed: null };
}

/* Detalle «Otro horario» (fe:hor:new): día, hora, nombre, idioma y qué es. */
export function feDetalle(c: Ctx, id: string): Sec {
  const { E2, es } = c, h = c.svc?.fe;
  if (!h || id !== "fe:hor:new") return { blocks: [{ type: "head", t: E2("Ya no está", "No longer here"), onBack: c.closeDet }], ed: null };
  const k0 = h.kind === "misa" ? "misa" : h.kind === "oracion" ? "oracion" : h.kind === "grupo" ? "grupo" : "culto";
  const F = c.form("det:fe:hor:new", { dow: 0, min: 600, label: "", en: "", lang: "es" as keyof typeof LANG_FE, kind: k0 as keyof typeof QUE_FE }), z = F.d;
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("HORARIOS Y AYUDA", "SCHEDULE AND HELP"), t: E2("Otro horario", "Other time"), s: E2("Sale en tu página con su nombre, el día y la hora.", "Shows on your page with its name, day and time."), onBack: c.closeDet },
    { type: "chips", k: E2("DÍA", "DAY"), items: DIA_FE.map((d, i) => ({ l: es ? d[0] : d[1], v: z.dow === i ? "selected" : "filter", onClick: () => F.set({ dow: i }) })) },
    { type: "step", t: E2("Hora", "Time"), s: cortoFe(z.dow, z.min, es), v: horaFe(z.min), onM: () => F.set({ min: Math.max(0, z.min - 15) }), onP: () => F.set({ min: Math.min(1425, z.min + 15) }) },
    { type: "field", k: E2("NOMBRE · LO VE LA GENTE", "NAME · PEOPLE SEE IT"), val: z.label, max: 40, count: `${z.label.length}/40`, ph: E2("Ej. Jóvenes, Estudio bíblico", "e.g. Youth, Bible study"), onChange: (v) => F.set({ label: v.slice(0, 40) }) },
    { type: "field", k: E2("NOMBRE EN INGLÉS · OPCIONAL", "NAME IN ENGLISH · OPTIONAL"), val: z.en, max: 40, ph: E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one."), onChange: (v) => F.set({ en: v.slice(0, 40) }) },
    { type: "chips", k: E2("QUÉ ES", "WHAT IT IS"), items: (Object.keys(QUE_FE) as (keyof typeof QUE_FE)[]).map((q) => ({ l: es ? QUE_FE[q].es : QUE_FE[q].en, v: z.kind === q ? "selected" : "filter", onClick: () => F.set({ kind: q }) })) },
    { type: "chips", k: E2("IDIOMA", "LANGUAGE"), items: (["es", "bil", "en", "otro"] as const).map((l) => ({ l: es ? LANG_FE[l].es : LANG_FE[l].en, v: z.lang === l ? "selected" : "filter", onClick: () => F.set({ lang: l }) })) },
  ];
  return { blocks: out, ed: { F, l: E2("Agregar", "Add"), always: true, valid: z.label.trim().length >= 2,
    apply: (d) => feGuardar(c.d.id, { nuevo: { dow: d.dow, min: d.min, label: { es: d.label, en: d.en }, lang: d.lang, kind: d.kind } }),
    toast: E2("Agregado · ya sale en tu página.", "Added · it shows on your page now."), onDone: () => c.closeDet() } };
}

export type { HerrFe };
