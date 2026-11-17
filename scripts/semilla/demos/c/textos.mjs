/* Textos de ficción para reseñas, respuestas y novedades del grupo C. Se arman combinando piezas (apertura + detalle + cierre) para que no se repitan. */
import { Rng } from "./base.mjs";

const P = (...x) => x;
/* ── Reseñas: [es, en] por rubro. Marcadores: {s} servicio, {d} dueño (nombre), {c} el carro/auto, {b} el negocio ── */
const RES = {
  oficio: {
    abre5: [P("Muy buen servicio.", "Great service."), P("Excelente trabajo.", "Excellent work."), P("Llegaron a la hora que dijeron.", "They showed up when they said they would."), P("Súper recomendados.", "Highly recommended."), P("Honestos y puntuales.", "Honest and on time."), P("Quedé muy contento.", "I am very happy."), P("De verdad que saben lo que hacen.", "They really know what they are doing.")],
    medio5: [P("Vinieron por {s} y dejaron todo limpio.", "They came for {s} and left everything clean."), P("Me explicaron el problema antes de tocar nada y el precio fue el que me dieron.", "They explained the problem before touching anything and the price was what they quoted."),
      P("{d} fue muy atento y me enseñó lo que había cambiado.", "{d} was very attentive and showed me what had been changed."), P("El precio que vi en la app fue el que pagué.", "The price I saw in the app is what I paid."), P("Resolvieron {s} en una sola visita.", "They fixed {s} in a single visit."),
      P("Me dieron el estimado con fotos y yo decidí qué hacer.", "They sent the estimate with photos and I decided what to do."), P("Trabajaron rápido y sin dejar desorden.", "They worked fast and left no mess."), P("Me avisaron cuando iban en camino.", "They told me when they were on the way.")],
    cierra5: [P("Los vuelvo a llamar sin pensarlo.", "I will call them again without thinking twice."), P("Se los recomiendo a mis vecinos.", "I recommend them to my neighbors."), P("Ya van tres veces que los llamo.", "That is the third time I call them."), P("Gracias por todo.", "Thanks for everything."), P("Cobraron justo.", "Fair price."), P("Ya los tengo guardados en el teléfono.", "They are saved in my phone now.")],
    abre4: [P("Buen trabajo en general.", "Good work overall."), P("Todo bien, con un detalle.", "All good, with one small thing."), P("Quedó bien el trabajo.", "The job came out well.")],
    medio4: [P("Llegaron un poco tarde pero avisaron.", "They arrived a little late but let me know."), P("Para {s} tuvieron que volver por una pieza, y lo arreglaron al día siguiente.", "For {s} they had to come back for a part and fixed it the next day."), P("El precio fue justo, aunque pensé que iba a tardar menos.", "The price was fair, although I thought it would take less time."), P("Me explicaron todo, solo faltó que me avisaran de la demora.", "They explained everything, they just should have warned me about the delay.")],
    cierra4: [P("Los volvería a llamar.", "I would call them again."), P("Cumplieron con lo prometido.", "They did what they promised."), P("Recomendado.", "Recommended.")],
    abre3: [P("Regular.", "So-so."), P("El trabajo quedó bien, el trato no tanto.", "The work was fine, the service not so much.")],
    medio3: [P("Se tardaron más de lo dicho en {s} y casi no me avisaron.", "{s} took longer than they said and they barely kept me posted."), P("El precio subió un poco al final y no me lo dijeron antes.", "The price went up a bit at the end and nobody told me beforehand."), P("Tuve que llamar dos veces para confirmar la hora.", "I had to call twice to confirm the time.")],
    cierra3: [P("Esperaba un poco más.", "I expected a little more."), P("Con mejor comunicación serían excelentes.", "With better communication they would be excellent.")],
    abre2: [P("No quedé conforme.", "I was not satisfied."), P("Mala experiencia.", "Bad experience.")],
    medio2: [P("Llegaron muy tarde a {s} y el problema volvió a la semana.", "They arrived very late for {s} and the problem came back within a week."), P("El trabajo no quedó como esperaba y tuve que pedir que lo corrigieran.", "The work was not what I expected and I had to ask them to redo it.")],
    cierra2: [P("Ojalá mejoren.", "I hope they improve."), P("Al menos respondieron cuando reclamé.", "At least they answered when I complained.")],
  },
  dealer: {
    abre5: [P("Excelente experiencia comprando mi carro.", "Excellent experience buying my car."), P("Nos trataron muy bien.", "They treated us very well."), P("Compra sin presión.", "No-pressure purchase."), P("Muy recomendados.", "Highly recommended.")],
    medio5: [P("El total en la puerta estaba claro desde la primera visita y no cambió al firmar.", "The out-the-door total was clear from the first visit and did not change at signing."), P("Hice la prueba de manejo a la hora que la reservé en la app y el carro estaba listo.", "I took the test drive at the time I booked in the app and the car was ready."),
      P("Me enseñaron el título y el historial antes de hablar de dinero.", "They showed me the title and history before talking money."), P("{d} me explicó el financiamiento con la tasa y los meses por escrito.", "{d} explained the financing with the rate and term in writing."), P("Mi mecánico lo revisó antes de firmar y no pusieron problema.", "My mechanic checked it before signing and they had no problem with that."),
      P("Me aceptaron mi carro viejo a un precio justo.", "They took my old car in trade at a fair price."), P("Con mi ITIN me explicaron qué enganche necesitaba, sin vueltas.", "With my ITIN they told me what down payment I needed, no runaround.")],
    cierra5: [P("Ya llevo meses con el carro y cero problemas.", "I have had the car for months with zero problems."), P("Volvería a comprar aquí.", "I would buy here again."), P("Se lo recomendé a mi cuñado y también compró.", "I told my brother-in-law and he bought too."), P("Salimos manejando el mismo día.", "We drove off the same day.")],
    abre4: [P("Buena compra.", "Good purchase."), P("Todo bien en general.", "All good overall.")],
    medio4: [P("La prueba de manejo empezó unos minutos tarde pero me avisaron.", "The test drive started a few minutes late but they let me know."), P("El papeleo tomó más de lo que pensé, aunque todo fue claro.", "The paperwork took longer than I thought, though everything was clear.")],
    cierra4: [P("El carro es como lo describieron.", "The car is as described."), P("Recomendado.", "Recommended.")],
    abre3: [P("Regular.", "So-so."), P("Esperaba más.", "I expected more.")],
    medio3: [P("El carro estaba bien pero tuve que preguntar dos veces por el cargo del dealer.", "The car was fine but I had to ask twice about the dealer fee."), P("Tardaron en tener los papeles listos.", "They took a while to have the paperwork ready.")],
    cierra3: [P("Con mejor comunicación sería excelente.", "With better communication it would be excellent.")],
    abre2: [P("No fue lo que esperaba.", "It was not what I expected.")],
    medio2: [P("Fui a la hora de la prueba y el carro no estaba listo.", "I came at the test drive time and the car was not ready."), P("Me costó entender el total y tuve que pedirlo por escrito.", "I had trouble understanding the total and had to ask for it in writing.")],
    cierra2: [P("Respondieron cuando reclamé.", "They answered when I complained.")],
  },
  inm: {
    abre5: [P("Excelente atención.", "Excellent service."), P("Nos ayudaron muchísimo.", "They helped us a lot."), P("Muy profesionales.", "Very professional."), P("Súper recomendados.", "Highly recommended.")],
    medio5: [P("{d} nos enseñó la casa a la hora acordada y contestó todas las preguntas.", "{d} showed us the house at the agreed time and answered every question."), P("Vimos la propiedad sin que nos cobraran nada y el precio era el publicado.", "We saw the property without being charged and the price was the one posted."),
      P("Nos explicó paso a paso la compra con ITIN y qué papeles llevar.", "She walked us through buying with an ITIN and which papers to bring."), P("Las fotos del anuncio eran fieles a la casa.", "The listing photos matched the home."), P("Nos dijeron de entrada cuánto íbamos a pagar para mudarnos, sin sorpresas.", "They told us up front what we would pay to move in, no surprises."),
      P("Vendieron mi casa en pocas semanas, con fotos buenas y buena comunicación.", "They sold my house in a few weeks, with good photos and good communication.")],
    cierra5: [P("Cerramos sin problemas.", "We closed with no problems."), P("Los volveríamos a llamar.", "We would call them again."), P("Gracias por hacerlo tan fácil.", "Thanks for making it so easy."), P("Ya les mandé a dos amigos.", "I have already sent two friends.")],
    abre4: [P("Muy buen servicio.", "Very good service."), P("Todo bien.", "All good.")],
    medio4: [P("La visita empezó unos minutos tarde pero avisaron.", "The showing started a few minutes late but they let us know."), P("El proceso tomó un poco más de lo esperado, aunque siempre supimos en qué íbamos.", "The process took a bit longer than expected, though we always knew where we stood.")],
    cierra4: [P("Recomendados.", "Recommended.")],
    abre3: [P("Regular.", "So-so.")],
    medio3: [P("La propiedad no estaba como en las fotos y tardaron en contestar.", "The property was not quite like the photos and they were slow to reply.")],
    cierra3: [P("Esperaba más.", "I expected more.")],
    abre2: [P("No fue buena la experiencia.", "It was not a good experience.")],
    medio2: [P("Llegué a la visita y la casa ya estaba apartada; nadie me avisó.", "I got to the showing and the home was already on hold; nobody told me.")],
    cierra2: [P("Ojalá avisen mejor.", "I hope they communicate better.")],
  },
};
/* Respuestas del dueño (≤ 300 caracteres) */
const REP = {
  pos: [P("Gracias, {n}. Fue un gusto atenderte; aquí estamos cuando nos necesites.", "Thank you, {n}. It was a pleasure to help; we are here whenever you need us."), P("Gracias por tu reseña, {n}. Le paso tus palabras a todo el equipo.", "Thanks for the review, {n}. I will pass your words on to the whole team."), P("{n}, gracias por confiar en nosotros. Nos vemos en la próxima.", "{n}, thank you for trusting us. See you next time."), P("Te agradecemos mucho, {n}. Ese es el trato que queremos dar siempre.", "We appreciate it, {n}. That is the service we always want to give.")],
  mid: [P("Gracias por decírnoslo, {n}. Tomamos nota de lo de la demora y ya lo estamos mejorando.", "Thanks for telling us, {n}. We noted the delay and are already improving it."), P("{n}, gracias por tu honestidad. Avísanos si quieres que lo revisemos de nuevo, sin costo.", "{n}, thanks for your honesty. Let us know if you want us to check it again at no charge.")],
  neg: [P("Lamentamos lo ocurrido, {n}. Te llamamos hoy para corregirlo y entender qué falló.", "We are sorry for what happened, {n}. We will call you today to fix it and understand what went wrong."), P("{n}, tienes razón en reclamar. Ya hablamos con el equipo y queremos darte una solución; escríbenos por la app.", "{n}, you are right to complain. We have spoken with the team and want to make it right; message us in the app.")],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function llenar(t, v) { return t.replace(/\{(\w)\}/g, (_, k) => v[k] ?? ""); }

export function textoResena(rubro, stars, lang, v, r) {
  const T = RES[rubro === "oficio" ? "oficio" : rubro], k = stars;
  const lvl = k >= 5 ? "5" : k <= 2 ? "2" : String(k), li = lang === "es" ? 0 : 1;
  const a = r.pick(T["abre" + lvl]), m = r.pick(T["medio" + lvl]), c = r.chance(0.75) ? r.pick(T["cierra" + lvl]) : null;
  const m2 = r.chance(0.45) && k >= 4 ? r.pick(T["medio" + lvl]) : null;
  let s = [a[li], llenar(m[li], v), m2 && m2 !== m ? llenar(m2[li], v) : null, c ? c[li] : null].filter(Boolean).join(" ");
  if (s.length < 24) s += lang === "es" ? " Todo en orden." : " All in order.";
  return s.slice(0, 600);
}
export function textoReplica(stars, lang, nombre, r) {
  const g = stars >= 4 ? REP.pos : stars === 3 ? REP.mid : REP.neg, t = r.pick(g), li = lang === "es" ? 0 : 1;
  return t[li].replace("{n}", nombre);
}

/* ── FAQ ── */
export const FAQ_COMUN = {
  pago: [["¿Cómo se paga?", "How do I pay?", "Con tarjeta en la app al terminar, o en efectivo o tarjeta en persona. Te damos el recibo en el momento.", "By card in the app when we finish, or cash or card in person. You get the receipt on the spot."]],
};

/* ── Novedades: generador común. cat → lista de [tipo, titulo, cuerpo] ── */
export function armarNovedades(B, lista, r, n) {
  const out = [], usados = new Set();
  // dos recientes (últimos 45 días), el resto repartido por los años (más reciente = más)
  const recientes = [r.int(-9, -2), r.int(-40, -12)];
  const fechas = [...recientes];
  for (let i = recientes.length; i < n; i++) { const dias = r.int(60, Math.max(120, (2026 - B.founded) * 365 - 120)); fechas.push(-dias); }
  fechas.sort((a, b) => b - a);
  const barajada = r.shuffle(lista);
  fechas.forEach((d, i) => {
    const t = barajada[i % barajada.length];
    if (usados.has(t.title)) return;
    usados.add(t.title);
    out.push({ kind: t.kind ?? "novedad", title: t.title.slice(0, 60), body: t.body.slice(0, 280), d, m: r.int(8, 18) * 60 + r.pick([0, 15, 30, 45]), was: t.was, now: t.now, pin: i === 0 && r.chance(0.35), endD: t.kind === "oferta" ? d + 14 : null });
  });
  return out;
}
export { Rng, cap };
