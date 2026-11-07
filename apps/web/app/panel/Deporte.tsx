"use client";
/* Lo que vendes › Tu herramienta de Deporte. Diseño: Panel v2 · dash2-cat.js L481–487 («Membresías y contrato»: contrato, lo que cuesta
   cancelar, mensualidad, cuota de inscripción, pase de un día o clase suelta, primera visita gratis, guardería) y L473–480 («Liga e
   inscripciones»: cuota de la temporada por equipo o jugador, depósito, inscripción hasta, lugares que quedan, cancha por hora, jugadores
   sueltos); plan fase4-edu-ninos-deporte.md §4ec y §5. Los precios son los del ítem (una sola fuente). Visita, club, tiro y nutrición
   van por contacto. Cada toque se guarda en el servidor (acciones-deporte.ts) con su línea en la auditoría. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { contratoTexto, resumenDep, tituloDep, usdD, type HerrDep } from "@/lib/deporte-comun";
import { fechaCorta, sumarDiasI } from "@/lib/inscripciones-comun";
import { deporteGuardar } from "./acciones-deporte";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

export function filaHerramientaDeporte(c: Ctx): Fila | null {
  const h = c.svc?.dep, { E2, es } = c;
  if (!h) return null;
  if (!h.memb && !h.liga) return { icon: "star", t: E2("Tu herramienta", "Your tool"), s: E2("Tu lugar va por contacto: la gente te llama o te escribe. Lo que cobras va en Servicios.", "Your place works by contact: people call or message you. What you charge goes in Services."), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action" };
  return { icon: h.liga ? "users" : "star", t: tituloDep(h, es), s: resumenDep(h, es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaDeporteBloques(c: Ctx): Sec {
  const h = c.svc!.dep!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof deporteGuardar>[1], m = ok) => c.run(() => deporteGuardar(c.d.id, p), m);
  const falta = (que: string) => ({ type: "note" as const, tone: "warn" as const, icon: "info", t: E2(`Primero agrega ${que} en Servicios.`, `First add ${que} in Services.`), cta: E2("Servicios", "Services"), onCta: () => c.go("mod", "servicios") });
  if (h.liga) return { blocks: ligaBloques(c, h, save, falta, cols2), ed: null };
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloDep(h, es),
    s: E2("Lo que más preguntan: ¿hay contrato y cuánto cuesta cancelar? Lo que pongas aquí es lo que sale en tu página.", "What people ask most: is there a contract and what does cancelling cost? What you set here is what shows on your page.") }];
  const gym = h.kind === "gym" || h.kind === "alberca";
  out.push({ type: "chips", k: E2("CONTRATO", "CONTRACT"), help: contratoTexto(h, es), items: ([[0, E2("Sin contrato", "No contract")], ...(h.contrato === 3 ? [[3, E2("3 meses", "3 months")]] : []), [6, E2("6 meses", "6 months")], [12, E2("12 meses", "12 months")]] as [number, string][])
    .map(([m, l]) => ({ l, v: h.contrato === m ? "selected" : "filter", onClick: () => save({ contrato: m }) })) });
  if (h.contrato) out.push({ type: "step", t: E2("Cancelar antes de tiempo cuesta", "Early cancellation costs"), s: E2("Se dice antes de firmar y sale en tu página, aunque sea $0.", "Said before signing and shown on your page, even if $0."),
    v: usdD(h.salir), onM: () => save({ salir: Math.max(0, h.salir - 1000) }), onP: () => save({ salir: Math.min(50000, h.salir + 1000) }) });
  if (h.mes) out.push({ type: "step", t: E2("Mensualidad", "Monthly fee"), s: E2("Lo que se cobra cada mes, sin cargos escondidos.", "What is charged each month, no hidden fees."), v: usdD(h.mes.cents),
    onM: () => save({ mes: Math.max(500, h.mes!.cents - 100) }), onP: () => save({ mes: Math.min(30000, h.mes!.cents + 100) }) });
  else out.push(falta(E2("la membresía (por mes)", "the membership (monthly)")));
  out.push({ type: "step", t: E2("Cuota de inscripción", "Signup fee"), s: h.inscripcion ? E2("Se cobra una vez al entrar.", "Charged once when joining.") : E2("Sin cuota de inscripción", "No signup fee"),
    v: h.inscripcion ? usdD(h.inscripcion) : E2("Sin cuota", "None"), onM: () => save({ inscripcion: Math.max(0, h.inscripcion - 500) }), onP: () => save({ inscripcion: Math.min(20000, h.inscripcion + 500) }) });
  if (h.dia) out.push({ type: "step", t: gym ? E2("Pase de un día", "Day pass") : E2("Clase suelta", "Drop-in class"), s: gym ? E2("Sin membresía.", "No membership.") : E2("Para quien paga solo el día que va.", "For those who pay only the day they go."),
    v: usdD(h.dia.cents), onM: () => save({ dia: Math.max(100, h.dia!.cents - 100) }), onP: () => save({ dia: Math.min(5000, h.dia!.cents + 100) }) });
  const R: Fila[] = [];
  if (h.mes) R.push({ icon: "star", t: gym ? E2("Primera visita gratis", "First visit free") : E2("Primera clase gratis", "First class free"), s: E2("Sin tarjeta y sin compromiso.", "No card and no commitment."), tgOn: h.mes.g1, onTg: () => save({ g1: !h.mes!.g1 }) });
  R.push({ icon: "users", t: gym ? E2("Guardería · 5 a 8 PM", "Childcare · 5 to 8 PM") : E2("Cuidan a los niños durante la clase", "Childcare during class"), tgOn: h.guarderia, onTg: () => save({ guarderia: !h.guarderia }) },
    { icon: "language", t: E2("Se habla español", "Spanish spoken"), s: E2("Sale «En español» en tu página.", "Shows «In Spanish» on your page."), tgOn: h.esp, onTg: () => save({ esp: !h.esp }) });
  out.push({ type: "rows", cols: cols2, items: R });
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("Lo que cuesta cancelar, antes de firmar", "Cancellation cost, before signing"), E2("Sin contrato = cancelas cuando quieras, sin penalidad.", "No contract = cancel anytime, no penalty.")),
    lock(E2("Solo se cobra la membresía", "Only the membership is charged"), E2("Nada que aparezca después en la tarjeta.", "Nothing showing up later on the card."))] });
  return { blocks: out, ed: null };
}

function ligaBloques(c: Ctx, h: HerrDep, save: (p: Parameters<typeof deporteGuardar>[1], m?: string) => void, falta: (q: string) => Bloque, cols2?: string): (Bloque | null)[] {
  const { E2, es } = c, t = h.temporada;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloDep(h, es),
    s: E2("Lo que más preguntan: cuánto es por equipo, qué incluye y hasta cuándo se inscriben. Lo que pongas aquí es lo que sale en tu página.", "What people ask most: how much per team, what it includes and the signup deadline. What you set here is what shows on your page.") }];
  if (!t) out.push(falta(E2("la temporada (curso con fecha de inicio)", "the season (course with a start date)")));
  else {
    out.push({ type: "step", t: t.team ? E2("Cuota del equipo · temporada", "Team fee · season") : E2("Cuota del jugador · temporada", "Player fee · season"),
      s: `${t.sem ? E2(`${t.sem} semanas. `, `${t.sem} weeks. `) : ""}${E2("Lo que se paga por toda la temporada, sin cargos por partido.", "What is paid for the whole season, no per-game charges.")}`, v: usdD(t.cents),
      onM: () => save({ cuota: Math.max(1000, t.cents - 1000) }), onP: () => save({ cuota: Math.min(200000, t.cents + 1000) }) });
    out.push({ type: "step", t: E2("Depósito que aparta el lugar", "Deposit that holds the spot"), s: t.dep ? E2("Se retiene al inscribirse y se descuenta. Si la liga no abre, se devuelve.", "Held at signup and taken off. If the league does not open, it is refunded.") : E2("Sin depósito: se paga todo antes del primer partido.", "No deposit: everything is paid before the first game."),
      v: t.dep ? usdD(t.dep) : E2("Sin depósito", "None"), onM: () => save({ deposito: Math.max(0, t.dep - 1000) }), onP: () => save({ deposito: Math.min(t.cents - 100, t.dep + 1000) }) });
    if (t.grupo) {
      // «INSCRIPCIÓN HASTA»: las 4 semanas antes de que empiece la temporada (nunca después).
      const D = [21, 14, 7, 3].map((n) => sumarDiasI(t.grupo!.inicio, -n)).filter((d) => d >= h.hoy);
      if (D.length) out.push({ type: "chips", k: E2("INSCRIPCIÓN HASTA", "SIGNUPS UNTIL"), help: E2(`la temporada empieza el ${fechaCorta(t.grupo.inicio, true)}`, `the season starts ${fechaCorta(t.grupo.inicio, false)}`),
        items: D.map((d) => ({ l: fechaCorta(d, es), v: h.hasta === d ? "selected" : "filter", onClick: () => save({ hasta: d }) })) });
      out.push({ type: "step", t: t.team ? E2("Equipos que faltan", "Team spots left") : E2("Lugares que quedan", "Spots left"),
        s: t.grupo.libres ? E2(`Tu página dice «Quedan ${t.grupo.libres}».`, `Your page says “${t.grupo.libres} left”.`) : E2("Liga llena: tu página dice «Lista de espera».", "League full: your page says “Waitlist”."),
        v: t.grupo.libres ? String(t.grupo.libres) : E2("Llena", "Full"), onM: () => save({ libres: Math.max(0, t.grupo!.libres - 1) }), onP: () => save({ libres: Math.min(40, t.grupo!.libres + 1) }) });
    } else out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("La temporada no tiene fecha de inicio: nadie se puede inscribir. Ábrela.", "The season has no start date: nobody can sign up. Open it."),
      cta: E2("Abrir la temporada", "Open the season"), onCta: () => c.det(`grp:new:${t.id}`) });
  }
  if (h.cancha) out.push({ type: "step", t: E2("Cancha por hora", "Field per hour"), s: E2("Lo que cobras por la cancha, no por persona.", "What you charge for the field, not per person."), v: usdD(h.cancha.cents),
    onM: () => save({ cancha: Math.max(1000, h.cancha!.cents - 500) }), onP: () => save({ cancha: Math.min(30000, h.cancha!.cents + 500) }) });
  out.push({ type: "rows", cols: cols2, items: [
    { icon: "users", t: E2("Aceptas jugadores sueltos", "You take free agents"), s: E2("Quien no tiene equipo se inscribe solo y tú lo pones en uno.", "Players with no team sign up alone and you place them."), tgOn: h.sueltos, onTg: () => save({ sueltos: !h.sueltos }) },
    { icon: "language", t: E2("Se habla español", "Spanish spoken"), tgOn: h.esp, onTg: () => save({ esp: !h.esp }) }] });
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("La cuota es de toda la temporada", "The fee covers the whole season"), E2("Nada se cobra por partido.", "Nothing is charged per game.")),
    lock(E2("Si la liga no abre, el depósito se devuelve", "If the league does not open, the deposit is refunded"), E2("Completo, a la misma tarjeta.", "In full, to the same card."))] });
  return out;
}
