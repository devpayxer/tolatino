"use client";
/* Tu plan (Panel v2 · DASH-COBROS sub «plan», prototipo pro-trial.js): la prueba Pro (quedan N días, qué pasa el día 30,
   seguir con tarjeta o no seguir), Pro (próximo cobro, pasar a Free), Free (tu contenido Pro está guardado, volver a Pro),
   cortesía y recibos. El servidor decide el plan; aquí solo se muestra y se piden los cambios. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { Plan } from "@/lib/suscripcion";
import { dinero, PRECIO_PRO } from "@/lib/plan";
import { planDeshacer, planFree } from "./acciones-cobros";
import type { Ctx } from "./Panel";

export type PlanPanel = { plan: Plan; recibos: { at: string; monto: number }[]; modo: "stripe" | "simulador" | "apagado"; pk: string | null; tarjetas: { pm: string; marca: string; ultimos4: string; vence: string; def: boolean }[] };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const DIA: [string, string][] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
export const fechaPlan = (es: boolean, iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York" }));
  return es ? `${DIA[d.getDay()]![0]} ${d.getDate()} ${MES[d.getMonth()]![0]}` : `${DIA[d.getDay()]![1]} ${MES[d.getMonth()]![1]} ${d.getDate()}`;
};
const tarjL = (t: { marca: string; ultimos4: string } | null) => (t ? `${t.marca.toUpperCase()} ·· ${t.ultimos4}` : "—");

export function planBloques(c: Ctx, x: PlanPanel | undefined): Bloque[] {
  const { E2, es, d } = c;
  if (!x) return [];
  // 8i · Dentro de las apps de las tiendas (Apple 3.1.3(f), Pagos de Google): solo el estado del plan y los recibos; ni precio, ni botón, ni
  // enlace para comprar o cambiar Pro (guardián sinCompraDigitalEnApp). En la web, todo como siempre.
  if (!c.compraPro) return estadoPlan(c, x);
  const p = x.plan, fin = fechaPlan(es, p.fin), mes = dinero(PRECIO_PRO), anual = money(Math.round(PRECIO_PRO * 100) * 10);
  const seguir = (ciclo: "month" | "year" = p.ciclo) => c.setUi({ planHoja: { ciclo } });
  const out: Bloque[] = [];
  if (x.modo === "simulador") out.push({ type: "note", tone: "info", icon: "info", t: E2("Sandbox: el cobro de Pro va contra el simulador de To’Latino. Ninguna tarjeta real se cobra.", "Sandbox: Pro charges run against To’Latino’s simulator. No real card is charged.") });
  const duerme: Fila = { icon: "lock", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.55)", t: E2("Se duerme · queda guardado", "Goes to sleep · stays saved"), s: d.duerme, chev: false, compact: true };
  if (p.st === "trial") {
    out.push({ type: "rows", items: [{ icon: "star", t: E2(`Pro · prueba · quedan ${p.quedan} ${p.quedan === 1 ? "día" : "días"}`, `Pro · trial · ${p.quedan} ${p.quedan === 1 ? "day" : "days"} left`),
      s: E2(`Termina el ${fin}.`, `Ends ${fin}.`), tag: "PRO", tone: "action", chev: false }] });
    if (p.decision === "card") out.push({ type: "rows", k: E2("TU TARJETA", "YOUR CARD"), items: [{ icon: "card", t: tarjL(p.tarjeta),
      s: `${p.ciclo === "year" ? E2(`Anual · ${anual} al año`, `Yearly · ${anual} a year`) : E2(`Mensual · ${mes} al mes`, `Monthly · ${mes} a month`)}${E2(" · primer cobro el ", " · first charge ")}${fin}`, chev: false,
      acts: [{ l: p.ciclo === "year" ? E2("Cambiar a mensual", "Switch to monthly") : E2("Cambiar a anual · 2 meses gratis", "Switch to yearly · 2 months free"), v: "secondary", onClick: () => seguir(p.ciclo === "year" ? "month" : "year") },
        { l: E2("No seguir con Pro", "Don’t keep Pro"), v: "secondary", off: c.pending, onClick: () => c.run(() => planFree(d.id), E2(`Listo. El ${fin} pasas a Free; nada se borra.`, `Done. On ${fin} you switch to Free; nothing is deleted.`)) }] }] });
    else if (p.decision === "no_continue") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Decidiste no seguir. Puedes cambiar de idea hasta el ${fin}.`, `You chose not to continue. You can change your mind until ${fin}.`), cta: E2("Seguir con Pro", "Keep Pro"), onCta: () => c.run(() => planDeshacer(d.id), E2("Listo: sigues con la prueba. Elige tu tarjeta para seguir con Pro.", "Done: you keep the trial. Choose your card to keep Pro.")) });
    else {
      out.push({ type: "note", tone: "info", icon: "star", t: E2(`Todo esto sigue por ${mes} al mes (o ${anual} al año: 2 meses gratis). Hoy no se cobra nada: el primer cobro es el ${fin}.`, `All of this continues for ${mes} a month (or ${anual} a year: 2 months free). Nothing is charged today: the first charge is ${fin}.`) });
      out.push({ type: "acts", items: [{ l: E2("Seguir con Pro", "Keep Pro"), v: "primary", icon: "star", onClick: () => seguir("month") },
        { l: E2("No seguir con Pro", "Don’t keep Pro"), v: "secondary", off: c.pending, onClick: () => c.run(() => planFree(d.id), E2(`Listo. El ${fin} pasas a Free; nada se borra.`, `Done. On ${fin} you switch to Free; nothing is deleted.`)) }] });
    }
    out.push({ type: "timeline", k: E2("LO QUE PASA EN TU PRUEBA", "WHAT HAPPENS IN YOUR TRIAL"), items: [
      { t: E2("Día 0 · empezó con todo Pro", "Day 0 · started with everything Pro"), s: E2("HECHO", "DONE"), now: false },
      { t: E2("Día 20 · lo que pasó en tu prueba", "Day 20 · what happened in your trial"), s: p.dia >= 20 ? E2("HECHO", "DONE") : "", now: p.dia < 25 && p.dia >= 20, future: p.dia < 20 },
      { t: E2("Día 25 · te avisamos", "Day 25 · we remind you"), s: p.dia >= 25 ? E2("HECHO", "DONE") : "", now: p.phase === "d25", future: p.dia < 25 },
      { t: p.decision === "card" ? E2(`Día 30 · primer cobro · ${p.ciclo === "year" ? anual : mes}`, `Day 30 · first charge · ${p.ciclo === "year" ? anual : mes}`) : E2("Día 30 · pasa a Free · nada se borra", "Day 30 · switches to Free · nothing is deleted"), s: fin, now: p.phase === "last", future: p.phase !== "last" },
    ] as never });
    out.push({ type: "rows", k: p.decision === "card" ? E2("SI UN DÍA PASAS A FREE", "IF YOU EVER SWITCH TO FREE") : E2(`EL ${fin.toUpperCase()}, SI NO SIGUES`, `ON ${fin.toUpperCase()}, IF YOU STOP`), items: [duerme] });
  } else if (p.st === "pro" || p.st === "courtesy") {
    if (p.st === "courtesy") out.push({ type: "rows", items: [{ icon: "star", t: E2("Pro de cortesía", "Courtesy Pro"), s: E2(`Sin cobro hasta el ${fin}. Después vuelve a Free y tu contenido Pro se guarda.`, `No charge until ${fin}. Then it goes back to Free and your Pro content is saved.`), tag: "PRO", tone: "action", chev: false }] });
    else {
      const per = p.ciclo === "year" ? E2("/año", "/yr") : E2("/mes", "/mo");
      if (p.phase === "past_due") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`No pudimos cobrar Pro (intento ${p.intentos} de 3). Cambia la tarjeta o al tercer intento tu página pasa a Free; nada se borra.`, `We could not charge Pro (try ${p.intentos} of 3). Change the card or on the third try your page switches to Free; nothing is deleted.`), cta: E2("Cambiar tarjeta", "Change card"), onCta: () => seguir() });
      out.push({ type: "rows", items: [{ icon: "star", t: `Pro · ${money(p.cobro)}${per}`,
        s: p.phase === "leaving" ? E2(`Pasa a Free el ${fin}. No se cobra más.`, `Switches to Free on ${fin}. No more charges.`) : E2(`Próximo cobro: ${fechaPlan(es, p.proximo)} a ${tarjL(p.tarjeta)}.`, `Next charge: ${fechaPlan(es, p.proximo)} to ${tarjL(p.tarjeta)}.`),
        tag: "PRO", tone: "action", chev: false,
        acts: p.phase === "leaving" ? [{ l: E2("Seguir con Pro", "Keep Pro"), v: "primary", off: c.pending, onClick: () => c.run(() => planDeshacer(d.id), E2("Listo: sigues con Pro.", "Done: you keep Pro.")) }]
          : [{ l: E2("Cambiar tarjeta", "Change card"), v: "secondary", onClick: () => seguir() }, { l: E2("Pasar a Free", "Switch to Free"), v: "secondary", off: c.pending, onClick: () => c.run(() => planFree(d.id), E2(`Listo. Sigues con Pro hasta el ${fin}.`, `Done. You keep Pro until ${fin}.`)) }] }] });
      if (p.phase === "leaving") out.push({ type: "rows", k: E2(`EL ${fin.toUpperCase()} SE DUERME · QUEDA GUARDADO`, `ON ${fin.toUpperCase()} GOES TO SLEEP · STAYS SAVED`), items: [duerme] });
    }
  } else {
    out.push({ type: "rows", items: [{ icon: "star", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.55)", t: "Free", s: p.desde ? E2(`Desde el ${fechaPlan(es, p.desde)}.`, `Since ${fechaPlan(es, p.desde)}.`) : E2("Una sola página y hasta 10 pedidos o citas en línea al mes.", "Single page and up to 10 online orders or bookings a month."), tag: "FREE", tone: "neutral", chev: false }] });
    out.push({ type: "lock", t: E2("Tu contenido Pro está guardado", "Your Pro content is saved"), s: `${d.duerme.charAt(0).toUpperCase()}${d.duerme.slice(1)}. ${E2("Vuelve igual que lo dejaste, cuando quieras.", "It comes back as you left it, whenever you want.")}`,
      cta: p.pruebaUsada ? E2(`Volver a Pro · ${mes}/mes`, `Back to Pro · ${mes}/mo`) : E2(`Pro · ${mes}/mes`, `Pro · ${mes}/mo`), onCta: () => seguir("month") });
    if (p.pruebaUsada) out.push({ type: "note", tone: "ink", icon: "info", t: E2("Ya usaste tu prueba: al volver a Pro se cobra el primer mes ese día.", "You already used your trial: coming back to Pro charges the first month that day.") });
  }
  if (x.recibos.length) out.push({ type: "rows", k: E2("RECIBOS", "RECEIPTS"), items: x.recibos.map((r, i): Fila => ({ key: String(i), icon: "card", t: `Pro · ${money(r.monto)}`, s: fechaPlan(es, r.at), chev: false, compact: true })) });
  out.push({ type: "note", tone: "ink", icon: "shield", t: E2("Siempre igual: pasar a Free nunca borra nada; Pro se cobra al mes (o al año con 2 meses gratis) y lo cancelas cuando quieras.", "Always the same: switching to Free never deletes anything; Pro is charged monthly (or yearly with 2 months free) and you cancel anytime.") });
  return out;
}

/* 8i · El plan dentro de las apps: qué plan tienes y hasta cuándo, sin comprar ni cambiar nada aquí. */
function estadoPlan(c: Ctx, x: PlanPanel): Bloque[] {
  const { E2, es } = c, p = x.plan, fin = fechaPlan(es, p.fin);
  const fila: Fila = p.st === "trial" ? { icon: "star", t: E2(`Pro · prueba · quedan ${p.quedan} ${p.quedan === 1 ? "día" : "días"}`, `Pro · trial · ${p.quedan} ${p.quedan === 1 ? "day" : "days"} left`), s: E2(`Termina el ${fin}.`, `Ends ${fin}.`), tag: "PRO", tone: "action", chev: false }
    : p.st === "courtesy" ? { icon: "star", t: E2("Pro de cortesía", "Courtesy Pro"), s: E2(`Hasta el ${fin}.`, `Until ${fin}.`), tag: "PRO", tone: "action", chev: false }
    : p.st === "pro" ? { icon: "star", t: "Pro", s: p.phase === "leaving" ? E2(`Pasa a Free el ${fin}.`, `Switches to Free on ${fin}.`) : p.proximo ? E2(`Renueva el ${fechaPlan(es, p.proximo)}.`, `Renews ${fechaPlan(es, p.proximo)}.`) : E2("Activo.", "Active."), tag: "PRO", tone: "action", chev: false }
    : { icon: "star", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.55)", t: "Free", s: p.desde ? E2(`Desde el ${fechaPlan(es, p.desde)}.`, `Since ${fechaPlan(es, p.desde)}.`) : E2("Una sola página.", "A single page."), tag: "FREE", tone: "neutral", chev: false };
  const out: Bloque[] = [{ type: "rows", items: [fila] }];
  if (x.recibos.length) out.push({ type: "rows", k: E2("RECIBOS", "RECEIPTS"), items: x.recibos.map((r, i): Fila => ({ key: String(i), icon: "card", t: `Pro · ${money(r.monto)}`, s: fechaPlan(es, r.at), chev: false, compact: true })) });
  out.push({ type: "note", tone: "ink", icon: "shield", t: E2("Pasar a Free nunca borra nada: tu contenido Pro queda guardado.", "Switching to Free never deletes anything: your Pro content stays saved.") });
  return out;
}
