"use client";
/* Lo que vendes › Tu herramienta de Educación («Grupos y cupos»). Diseño: Panel v2 · dash2-cat.js blocksE L449–464 (summary L306);
   plan fase4-edu-ninos-deporte.md §4ea y §5. GRUPOS ABIERTOS · CUPOS LIBRES · CLASE GRATIS; CÓMO DAS LAS CLASES (al menos una);
   por curso: precio, matrícula que aparta el cupo, plan de pagos (solo curso), primera clase gratis (nunca en un curso) y los cupos
   de cada grupo (0 = lleno, no sale en la página; «Deja al menos un grupo con cupo»); REGLAS · NO SE APAGAN. Abrir un grupo y la
   lista de grupos (hueco #1 del diseño) se componen con step, chips, field y acts. Cada toque se guarda en el servidor
   (acciones-edu.ts) con su línea en la auditoría. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { DIAS_INSC, dowDe, etiquetaGrupo, fechaCorta, FORMA, horaInsc, planTexto, PLANES, resumenEdu, sumarDiasI, tituloEdu, usdI, type CursoH, type GrupoH } from "@/lib/inscripciones-comun";
import { eduAbrirGrupo, eduGuardar, eduQuitarGrupo } from "./acciones-edu";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

export function filaHerramientaEdu(c: Ctx): Fila | null {
  const h = c.svc?.edu, { E2 } = c;
  if (!h) return null;
  return { icon: "calendar", t: tituloEdu(c.es), s: h.cursos.length ? resumenEdu(h, c.es) : E2("Primero agrega tus cursos en Servicios", "First add your courses in Services"), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

const nm = (c: Ctx, b: { es: string; en: string }) => (c.es ? b.es : b.en || b.es);
// «Lun y Mié 7 PM · empieza el 18 nov»; si la etiqueta ya dice la fecha («Empieza el 25 nov»), no se repite.
const grupoL = (c: Ctx, g: GrupoH) => (/^(empieza|starts)\b/i.test(nm(c, g.label)) ? nm(c, g.label) : `${nm(c, g.label)} · ${c.E2("empieza el", "starts")} ${fechaCorta(g.inicio, c.es)}`);

export function herramientaEduBloques(c: Ctx): Sec {
  const h = c.svc!.edu!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof eduGuardar>[1], m = ok) => c.run(() => eduGuardar(c.d.id, p), m);
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloEdu(es),
      s: E2("Lo que preguntan: ¿qué me llevo al final y cuánto cuesta en total? Aquí abres grupos, cuentas los cupos y dices qué va incluido.", "What people ask: what do I walk away with and what is the total? Open groups, count seats and say what is included.") },
    { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("GRUPOS ABIERTOS", "OPEN GROUPS"), v: String(h.abiertos) }, { k: E2("CUPOS LIBRES", "SEATS LEFT"), v: String(h.libres) }, { k: E2("CLASE GRATIS", "FREE CLASS"), v: String(h.gratis) }] },
  ];
  const HW: [keyof typeof h.how, string, string, string][] = [["presencial", "pin", E2("Presencial", "In person"), E2("En tu local.", "At your place.")], ["linea", "wifi", E2("En línea", "Online"), E2("En vivo, con el mismo maestro.", "Live, with the same teacher.")],
    ["hibrido", "calendar", E2("Híbrido", "Hybrid"), E2("Unas clases en el local y otras en línea.", "Some classes in person, some online.")], ["esp", "language", E2("Clases en español", "Classes in Spanish"), E2("Sale «En español» en tu página.", "Shows «In Spanish» on your page.")]];
  out.push({ type: "rows", k: E2("CÓMO DAS LAS CLASES", "HOW YOU TEACH"), cols: cols2, items: HW.map(([k, icon, t, s]): Fila => ({ icon, t, s, compact: true, tgOn: h.how[k],
    onTg: () => { const o = { ...h.how, [k]: !h.how[k] }; if (!o.presencial && !o.linea && !o.hibrido) { c.toast(E2("Deja al menos una forma de dar clases.", "Keep at least one way to teach.")); return; } save({ how: { [k]: !h.how[k] } }); } })) });
  if (!h.cursos.length) out.push({ type: "empty", icon: "calendar", t: E2("Todavía no tienes cursos", "No courses yet"), s: E2("Agrégalos en Servicios: el curso completo, por mes, por clase o por hora. Después abres sus grupos aquí.", "Add them in Services: full course, monthly, per class or per hour. Then open their groups here."),
    cta: E2("Ir a Servicios", "Go to Services"), onCta: () => c.go("mod", "servicios") } as Bloque);
  for (const x of h.cursos) out.push(...cursoBloques(c, x, save));
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("El precio es el total", "The price is the total"), E2("Libros y examen: incluidos o dichos aparte, antes de inscribirse.", "Books and exam: included or stated separately, before enrolling.")),
    lock(E2("Qué certificado te llevas", "Which certificate you earn"), E2("Y quién lo da: el estado, una junta o la escuela.", "And who issues it: the state, a board or the school."))] });
  return { blocks: out, ed: null };
}

/* Un curso con su precio, matrícula, plan, primera clase gratis y los cupos de sus grupos. Niños (nik, 4eb): «Inscripción · aparta el
   cupo», sin plan de pagos (NIK, L460) y $0 = «Gratis si calificas». */
export function cursoBloques(c: Ctx, x: CursoH, save: (p: Parameters<typeof eduGuardar>[1], m?: string) => void, nik = false): (Bloque | null)[] {
  const { E2, es } = c, out: (Bloque | null)[] = [{ type: "group", k: `${nm(c, x.name).toUpperCase()}${x.vende ? "" : E2(" · OCULTO", " · HIDDEN")}` }];
  const stp = x.k === "curso" ? 1000 : 500;
  out.push({ type: "step", t: E2("Precio", "Price"), s: x.k === "curso" ? E2(`El curso completo · ${x.sem ?? 0} semanas`, `Whole course · ${x.sem ?? 0} weeks`) : es ? FORMA[x.k].t.es : FORMA[x.k].t.en,
    v: x.cents || !nik ? usdI(x.cents) : E2("Gratis", "Free"), onM: () => save({ item: x.id, precio: Math.max(x.k === "curso" ? x.mat + 100 : nik ? 0 : 100, x.cents - stp) }), onP: () => save({ item: x.id, precio: Math.min(5000000, x.cents + stp) }) });
  if (x.k === "curso") {
    out.push({ type: "step", t: nik ? E2("Inscripción · aparta el cupo", "Signup fee · holds the spot") : E2("Matrícula · aparta el cupo", "Registration · holds the seat"),
      s: x.mat ? E2(`Hoy se retienen ${usdI(x.mat)} · se descuenta del total; si el grupo no abre, se devuelve`, `${usdI(x.mat)} held today · comes off the total; refunded if the group does not open`) : E2("Sin matrícula: pagan el primer día", "No registration: they pay on day one"),
      v: usdI(x.mat), onM: () => save({ item: x.id, mat: Math.max(0, x.mat - 500) }), onP: () => save({ item: x.id, mat: Math.min(x.cents - 100, x.mat + 500) }) });
    if (!nik) out.push({ type: "chips", k: E2("PLAN DE PAGOS", "PAYMENT PLAN"), help: planTexto(x.cents, x.mat, x.plan, es),
      items: PLANES.map((n) => ({ l: n ? String(n) : E2("Sin plan", "None"), v: x.plan === n ? "selected" : "filter", onClick: () => save({ item: x.id, plan: n }) })) });
  } else out.push({ type: "rows", items: [{ icon: "star", t: E2("Primera clase gratis", "First class free"), s: x.g1 ? E2("Sin tarjeta y sin compromiso.", "No card and no commitment.") : E2("Apagado", "Off"), tgOn: x.g1, compact: true, onTg: () => save({ item: x.id, g1: !x.g1 }) }] });
  const abiertos = x.grupos.filter((g) => g.estado === "open");
  for (const g of abiertos) out.push({ type: "step", t: `${E2("Cupos", "Seats")} · ${grupoL(c, g)}`,
    s: g.libres ? (g.ocupados + g.fuera ? E2(`Se puede inscribir · ${g.ocupados + g.fuera} ya inscritos`, `Open for enrollment · ${g.ocupados + g.fuera} already enrolled`) : E2("Se puede inscribir", "Open for enrollment")) : E2("Lleno · no sale en tu página", "Full · hidden on your page"),
    v: String(g.libres), onM: () => save({ grupo: g.id, libres: Math.max(0, g.libres - 1) }), onP: () => save({ grupo: g.id, libres: Math.min(40, g.libres + 1) }) });
  if (!abiertos.length) out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("Este curso no tiene grupos abiertos: no se puede inscribir nadie. Abre un grupo.", "This course has no open groups: nobody can enroll. Open a group.") });
  out.push({ type: "acts", items: [{ l: E2("Abrir un grupo", "Open a group"), v: "secondary", icon: "plus", onClick: () => c.det(`grp:new:${x.id}`) },
    ...(abiertos.length ? [{ l: E2("Ver grupos", "See groups"), v: "ghost", icon: "grid", onClick: () => c.det(`grp:list:${x.id}`) }] : [])] });
  return out;
}

/* Detalle: abrir un grupo (grp:new:ITEM) o ver los grupos de un curso (grp:list:ITEM). */
export function grupoEduDetalle(c: Ctx, id: string): Sec {
  const { E2, es } = c, h = c.svc?.edu ?? c.svc?.ninos?.edu, [, modo, item] = id.split(":"), x = h?.cursos.find((z) => z.id === item);
  if (!h || !x) return { blocks: [{ type: "head", t: E2("Curso no encontrado", "Course not found"), onBack: c.closeDet }, { type: "empty", icon: "calendar", t: E2("Ese curso ya no existe", "That course no longer exists"), s: E2("Puede que lo quitaste en Servicios.", "You may have removed it in Services.") }], ed: null };
  if (modo === "list") {
    const out: (Bloque | null)[] = [{ type: "head", eye: E2("GRUPOS", "GROUPS"), t: nm(c, x.name), s: E2("Los que están abiertos o en curso.", "Open or in progress."), onBack: c.closeDet }];
    for (const g of x.grupos) {
      out.push({ type: "group", k: grupoL(c, g).toUpperCase() });
      out.push({ type: "kv", items: [{ k: E2("CUPOS", "SEATS"), v: String(g.total) }, { k: E2("EN LA APP", "IN THE APP"), v: String(g.ocupados) }, { k: E2("INSCRITOS FUERA", "ENROLLED OUTSIDE"), v: String(g.fuera) }, { k: E2("LIBRES", "LEFT"), v: String(g.libres) },
        ...(g.fin ? [{ k: E2("TERMINA", "ENDS"), v: fechaCorta(g.fin, es) }] : []), ...(g.enLinea ? [{ k: E2("EN LÍNEA", "ONLINE"), v: E2("Enlace solo para inscritos", "Link for enrolled only") }] : [])] });
      if (g.estado === "open" && g.ocupados === 0) out.push({ type: "acts", items: [{ l: E2("Quitar este grupo", "Remove this group"), v: "ghost", icon: "trash", off: c.pending,
        onClick: () => c.run(() => eduQuitarGrupo(c.d.id, g.id), E2("Grupo quitado. Ya no sale en tu página.", "Group removed. It no longer shows on your page.")) }] });
    }
    return { blocks: out, ed: null };
  }
  const dow0 = dowDe(h.hoy), lunes = sumarDiasI(h.hoy, ((8 - dow0) % 7) || 7);
  const F = c.form(`det:grp:new:${x.id}`, { inicio: lunes, dows: [1, 3] as number[], min: 1140 as number | null, libres: 10, label: "", url: "" }), z = F.d;
  const sug = etiquetaGrupo(z.dows, z.min, es) || E2(`Empieza el ${fechaCorta(z.inicio, true)}`, `Starts ${fechaCorta(z.inicio, false)}`);
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("ABRIR UN GRUPO", "OPEN A GROUP"), t: nm(c, x.name), s: x.k === "curso" ? E2(`${x.sem ?? 0} semanas · termina sola la fecha`, `${x.sem ?? 0} weeks · the end date is set for you`) : es ? FORMA[x.k].t.es : FORMA[x.k].t.en, onBack: c.closeDet },
    { type: "step", t: E2("Empieza", "Starts"), s: z.inicio === h.hoy ? E2("Hoy", "Today") : E2(`Faltan ${Math.round((Date.parse(`${z.inicio}T12:00:00Z`) - Date.parse(`${h.hoy}T12:00:00Z`)) / 864e5)} días`, `In ${Math.round((Date.parse(`${z.inicio}T12:00:00Z`) - Date.parse(`${h.hoy}T12:00:00Z`)) / 864e5)} days`),
      v: fechaCorta(z.inicio, es), onM: () => F.set({ inicio: z.inicio > h.hoy ? sumarDiasI(z.inicio, -1) : z.inicio }), onP: () => F.set({ inicio: sumarDiasI(z.inicio, 1) }) },
    { type: "chips", k: E2("DÍAS DE CLASE", "CLASS DAYS"), items: DIAS_INSC.map(([d, a, b]) => ({ l: es ? a : b, v: z.dows.includes(d) ? "selected" : "filter", onClick: () => F.set({ dows: z.dows.includes(d) ? z.dows.filter((y) => y !== d) : [...z.dows, d] }) })) },
    z.min == null ? { type: "acts", items: [{ l: E2("Poner la hora", "Set the time"), v: "ghost", icon: "clock", onClick: () => F.set({ min: 1140 }) }] }
      : { type: "step", t: E2("Hora", "Time"), s: E2("A qué hora empieza la clase", "When class starts"), v: horaInsc(z.min), onM: () => F.set({ min: Math.max(360, z.min! - 30) }), onP: () => F.set({ min: Math.min(1320, z.min! + 30) }) },
    { type: "step", t: E2("Cupos", "Seats"), s: E2("Cuántos se pueden inscribir", "How many can enroll"), v: String(z.libres), onM: () => F.set({ libres: Math.max(1, z.libres - 1) }), onP: () => F.set({ libres: Math.min(40, z.libres + 1) }) },
    { type: "field", k: E2("NOMBRE DEL GRUPO · LO VE EL CLIENTE", "GROUP NAME · CLIENTS SEE IT"), val: z.label, ph: sug, max: 40, count: `${z.label.length}/40`, onChange: (v) => F.set({ label: v }) },
  ];
  if (h.how.linea || h.how.hibrido) out.push({ type: "field", k: E2("ENLACE DE LA CLASE EN LÍNEA · OPCIONAL", "ONLINE CLASS LINK · OPTIONAL"), val: z.url, ph: "https://", max: 300, im: "url",
    help: E2("Solo lo ven los inscritos confirmados; nunca sale en tu página.", "Only confirmed students see it; never on your page."), onChange: (v) => F.set({ url: v.trim() }) });
  const badUrl = !!z.url && !/^https:\/\/\S{4,}$/.test(z.url);
  if (badUrl) out.push({ type: "note", tone: "warn", t: E2("El enlace empieza con https://", "The link starts with https://") });
  return { blocks: out, ed: { F, l: E2("Abrir el grupo", "Open the group"), always: true, valid: !badUrl,
    apply: (d) => eduAbrirGrupo(c.d.id, { item: x.id, inicio: d.inicio, dows: d.dows, min: d.min, libres: d.libres, label: d.label || undefined, url: d.url || null }),
    toast: E2("Grupo abierto. Ya sale en tu página.", "Group open. It now shows on your page."), onDone: () => c.closeDet() } };
}
