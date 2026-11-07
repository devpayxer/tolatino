"use client";
/* Lo que vendes › Tu herramienta de Niños. Diseño: Panel v2 · dash2-cat.js L465–471 (guardería y cuidado en casa: «Cupos y licencia»)
   y L449–463 con NIK (los demás: «Grupos y cupos» con LO QUE OFRECES y la espera de la evaluación, sin plan de pagos); plan
   fase4-edu-ninos-deporte.md §4eb y §5. La licencia del DHS no es un interruptor: sale de Tu página › Licencias y la verifica
   To'Latino; sin licencia vigente, la guardería y el cuidado en casa no reciben solicitudes por la app (§6 #9). Niñera y nana trabajan
   sin local: solo contacto (§6 #10). Cada toque se guarda en el servidor (acciones-ninos.ts y, para los grupos, acciones-edu.ts). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { fechaCorta, resumenEdu } from "@/lib/inscripciones-comun";
import { edadTexto, libresNinos, resumenNinos, tituloNinos, usdN0, type HerrNinos } from "@/lib/ninos-comun";
import { eduGuardar } from "./acciones-edu";
import { ninosGuardar } from "./acciones-ninos";
import { cursoBloques } from "./Edu";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

export function filaHerramientaNinos(c: Ctx): Fila | null {
  const h = c.svc?.ninos, { E2, es } = c;
  if (!h) return null;
  const s = h.kind === "ninera" ? E2("Trabajas sin local: te contactan por mensaje o teléfono", "You work without a place: people contact you by message or phone")
    : h.cuidado ? resumenNinos(h, es)! : h.edu && h.edu.cursos.length ? resumenEdu(h.edu, es) : E2("Primero agrega tus programas en Servicios", "First add your programs in Services");
  return { icon: h.cuidado ? "users" : "calendar", t: tituloNinos(h, es), s, tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

/* La licencia del DHS: lo que dice tu página y si recibes solicitudes por la app. */
function licBloque(c: Ctx, h: HerrNinos): Bloque {
  const { E2, es } = c, L = h.lic, vence = L.vence ? `${fechaCorta(L.vence, es)} ${L.vence.slice(0, 4)}` : null;
  if (L.estado === "valid") return { type: "note", tone: "ok", icon: "verified", t: E2(`Licencia del DHS verificada${L.numero ? ` · certificado ${L.numero}` : ""}${vence ? ` · la revisamos el ${vence}` : ""}. Tu página la muestra.`,
    `DHS license verified${L.numero ? ` · certificate ${L.numero}` : ""}${vence ? ` · next check ${vence}` : ""}. Your page shows it.`) };
  const t = L.estado === "review" ? E2("Tu licencia del DHS está en revisión: tu página dice «Licencia en trámite». Mientras tanto, las familias te llaman o te escriben; no se piden cupos por la app.",
    "Your DHS license is under review: your page says “License in process”. Meanwhile families call or message you; no spots are requested in the app.")
    : L.estado === "expired" ? E2("Tu licencia del DHS venció: tu página lo dice y no se piden cupos por la app. Sube la renovación.", "Your DHS license expired: your page says so and no spots are requested in the app. Upload the renewal.")
    : E2("Tu página dice «No tiene licencia del estado» y no se piden cupos por la app. Agrega tu certificado del DHS: lo verificamos con el registro público.", "Your page says “No state license” and no spots are requested in the app. Add your DHS certificate: we check it against the public registry.");
  return { type: "note", tone: "warn", icon: "law", t, cta: es ? (L.estado === "none" ? "Agregar licencia" : "Tus licencias") : (L.estado === "none" ? "Add license" : "Your licenses"), onCta: () => c.go("pag", "lic") };
}

export function herramientaNinosBloques(c: Ctx): Sec {
  const h = c.svc!.ninos!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof ninosGuardar>[1], m = ok) => c.run(() => ninosGuardar(c.d.id, p), m);
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloNinos(h, es),
    s: h.cuidado ? E2("Cupos por edad, el subsidio y el precio por semana. Tu licencia de PA siempre está a la vista.", "Openings by age, the subsidy and the weekly price. Your PA license is always on display.")
      : E2("Tus programas, sus grupos y cupos, y lo que ofreces. Cada lugar dice las edades que atiende y el precio completo.", "Your programs, their groups and seats, and what you offer. Every place says the ages it serves and the full price.") }];
  if (h.kind === "ninera") {
    out.push({ type: "note", tone: "info", icon: "users", t: E2("Trabajas sin local (niñera o nana): las familias te contactan por mensaje o teléfono. No se reserva por la app: To'Latino no verifica antecedentes y tu página no lo promete.",
      "You work without a place (sitter or nanny): families contact you by message or phone. No booking in the app: To'Latino does not run background checks and your page does not promise it.") });
    return { blocks: out, ed: null };
  }
  if (h.cuidado || h.kind === "after") out.push(licBloque(c, h));
  // Las edades que atiende (la tarjeta y la ficha las dicen).
  const ed = h.edad ?? [0, 5];
  out.push({ type: "group", k: E2("EDADES QUE ATIENDES", "AGES YOU SERVE") },
    { type: "step", t: E2("Desde", "From"), s: edadTexto(h.edad, es), v: ed[0] === 0 ? E2("Bebés", "Babies") : E2(`${ed[0]} años`, `Age ${ed[0]}`), onM: () => save({ edad: [Math.max(0, ed[0] - 1), ed[1]] }), onP: () => save({ edad: [Math.min(ed[1], ed[0] + 1), ed[1]] }) },
    { type: "step", t: E2("Hasta", "To"), s: E2("La edad mayor que recibes.", "The oldest age you take."), v: E2(`${ed[1]} años`, `Age ${ed[1]}`), onM: () => save({ edad: [ed[0], Math.max(ed[0], ed[1] - 1)] }), onP: () => save({ edad: [ed[0], Math.min(18, ed[1] + 1)] }) });
  if (h.cuidado) {
    const tot = libresNinos(h);
    out.splice(1, 0, { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("CUPOS LIBRES", "OPENINGS"), v: String(tot) }, { k: "CCIS", v: h.ccis ? E2("Sí", "Yes") : "No" }, { k: E2("POR SEMANA", "PER WEEK"), v: h.semana ? usdN0(h.semana) : "—" }] });
    out.push({ type: "group", k: h.casa ? E2("CUPOS", "OPENINGS") : E2("CUPOS POR EDAD", "OPENINGS BY AGE") });
    for (const b of h.bandas) out.push({ type: "step", t: h.casa ? E2(`Cupos libres · ${es ? b.label.es : b.label.en} · hasta 6 niños`, `Openings · ${b.label.en} · up to 6 kids`) : es ? b.label.es : b.label.en,
      s: b.libres ? E2("Se puede pedir", "Can be requested") : E2("Lleno · lista de espera", "Full · waitlist"), v: String(b.libres),
      onM: () => save({ banda: b.id, libres: Math.max(0, b.libres - 1) }), onP: () => save({ banda: b.id, libres: Math.min(h.casa ? 6 : 20, b.libres + 1) }) });
    if (!h.bandas.length || (!h.casa && h.bandas.length < 6)) out.push({ type: "chips", k: h.bandas.length ? E2("AGREGAR UN GRUPO DE EDAD", "ADD AN AGE GROUP") : E2("¿QUÉ EDADES CUIDAS?", "WHAT AGES DO YOU CARE FOR?"),
      items: ([[0, 1, E2("Bebés", "Babies")], [2, 2, E2("2 años", "Age 2")], [3, 3, E2("3 años", "Age 3")], [4, 5, E2("4 y 5 años", "Ages 4 and 5")], [6, 12, E2("6 a 12 años", "Ages 6–12")]] as [number, number, string][])
        .filter(([mn, mx]) => !h.bandas.some((b) => b.min === mn && b.max === mx)).map(([mn, mx, l]) => ({ l, v: "filter", onClick: () => save({ nuevaBanda: { min: mn, max: mx } }, E2("Listo. Ponle cuántos cupos tienes.", "Done. Set how many openings you have.")) })) });
    const wk = h.semana ?? 23500;
    out.push({ type: "step", t: E2("Precio por semana sin subsidio", "Weekly price without subsidy"), s: E2("Con CCIS, el estado paga una parte; lo que te toca se dice antes.", "With CCIS the state pays part; your share is said upfront."),
      v: h.semana ? usdN0(h.semana) : "—", onM: () => save({ semana: Math.max(5000, wk - 500) }), onP: () => save({ semana: Math.min(60000, wk + 500) }) });
    out.push({ type: "rows", cols: cols2, items: [
      { icon: "dollar", t: E2("Aceptas el subsidio CCIS", "You take the CCIS subsidy"), s: E2("Sale en el filtro «Acepta subsidio».", "Shows under “Takes subsidy”."), tgOn: h.ccis, onTg: () => save({ ccis: !h.ccis }) },
      { icon: "clock", t: E2("Horario extendido · 6 AM a 6 PM", "Extended hours · 6 AM to 6 PM"), tgOn: h.ext, onTg: () => save({ ext: !h.ext }) },
      { icon: "restaurant", t: E2("Comidas incluidas", "Meals included"), tgOn: h.comidas, onTg: () => save({ comidas: !h.comidas }) },
      { icon: "clock", t: E2("Turno de noche", "Night shift"), s: E2("Para padres que trabajan de noche.", "For parents working nights."), tgOn: h.noche, onTg: () => save({ noche: !h.noche }) },
      { icon: "language", t: E2("Se habla español", "Spanish spoken"), s: E2("Sale «En español» en tu página.", "Shows «In Spanish» on your page."), tgOn: h.esp, onTg: () => save({ esp: !h.esp }) }] });
    out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
      lock(E2("Licencia de PA (DHS) a la vista", "PA (DHS) license on display"), E2("Verificada por To’Latino; si vence, tu página lo dice.", "Verified by To’Latino; if it expires, your page says so.")),
      lock(E2("Solo recogen las personas autorizadas", "Only authorized people pick up"), E2("Con identificación, siempre.", "With ID, always."))] });
    return { blocks: out, ed: null };
  }
  // Fuera del cuidado: lo que ofreces, la espera de la evaluación y los programas con sus grupos (motor de Educación, sin plan).
  const e = h.edu;
  if (e) out.splice(1, 0, { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("GRUPOS ABIERTOS", "OPEN GROUPS"), v: String(e.abiertos) }, { k: E2("CUPOS LIBRES", "SEATS LEFT"), v: String(e.libres) }, { k: E2("CLASE GRATIS", "FREE CLASS"), v: String(e.gratis) }] });
  const OF: Fila[] = [{ icon: "language", t: E2("Se habla español", "Spanish spoken"), s: E2("Sale «En español» en tu página.", "Shows «In Spanish» on your page."), tgOn: h.esp, compact: true, onTg: () => save({ esp: !h.esp }) }];
  if (h.kind === "after" || h.kind === "camp") OF.push({ icon: "truck", t: h.kind === "after" ? E2("Recoges a los niños en la escuela", "You pick kids up at school") : E2("Transporte desde paradas", "Bus from stops"), s: E2("Sale en el filtro «Transporte».", "Shows under “Transport”."), tgOn: h.transporte, compact: true, onTg: () => save({ transporte: !h.transporte }) });
  if (h.kind === "terapia" || h.kind === "familia") OF.push({ icon: "insurance", t: E2("Aceptas Medicaid y CHIP", "You take Medicaid and CHIP"), s: E2("No se pide el número aquí: lo ven en persona.", "No number is asked here: it is handled in person."), tgOn: h.medicaid, compact: true, onTg: () => save({ medicaid: !h.medicaid }) });
  out.push({ type: "rows", k: E2("LO QUE OFRECES", "WHAT YOU OFFER"), cols: cols2, items: OF });
  if (h.kind === "terapia") { const w = h.espera ?? 4; out.push({ type: "step", t: E2("Espera para la evaluación", "Wait for an evaluation"), s: E2("Sale en tu página: «Evaluación en N semanas».", "Shows on your page: «Evaluation within N weeks»."),
    v: E2(`${h.espera ?? "—"} sem`, `${h.espera ?? "—"} wk`), onM: () => save({ espera: Math.max(1, w - 1) }), onP: () => save({ espera: Math.min(12, w + 1) }) }); }
  if (!e?.cursos.length) out.push({ type: "empty", icon: "calendar", t: E2("Todavía no tienes programas", "No programs yet"), s: E2("Agrégalos en Servicios: por semana, por mes, por clase o una temporada con inscripción. Después abres sus grupos aquí.", "Add them in Services: weekly, monthly, per class or a season with a signup fee. Then open their groups here."),
    cta: E2("Ir a Servicios", "Go to Services"), onCta: () => c.go("mod", "servicios") });
  const saveEdu = (p: Parameters<typeof eduGuardar>[1], m = ok) => c.run(() => eduGuardar(c.d.id, p), m);
  for (const x of e?.cursos ?? []) out.push(...cursoBloques(c, x, saveEdu, true));
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("El precio es el total", "The price is the total"), E2("Uniforme o materiales: incluidos o dichos aparte.", "Uniform or materials: included or listed separately.")),
    lock(E2("Solo recogen las personas autorizadas", "Only authorized people pick up"), E2("Con identificación, siempre.", "With ID, always."))] });
  return { blocks: out, ed: null };
}
