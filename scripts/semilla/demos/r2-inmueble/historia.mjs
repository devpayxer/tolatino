/* Ronda 2 · Bienes Raíces: historia (visitas, citas, precalificaciones y ofertas), reseñas y seguidores. Más ligera que la ronda 1:
   40–120 operaciones, 15–40 reseñas (una por persona, verificadas por una visita terminada), 15–80 seguidores. */
import { Rng, CIUDADES, diaDeVida } from "../c/base.mjs";
import { textoReplica } from "../c/textos.mjs";
import { elegirClientes, CLIENTES } from "./plan.mjs";

const P = (...x) => x;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ok3 = (s) => (s >= 4 ? 1 : s === 3 ? 0 : -1), ok2 = (s) => (s >= 4 ? 1 : 0), okm = (s) => (s >= 4 ? 1 : -1);

/* ── Historia ── */
export function historia(B, plan, ctx) {
  const r = new Rng(B.seed + ":hist"), cfg = B.cfg, N = clamp(Math.round(75 * B.size), 40, 120), U = r.int(2, 5);
  const filas = [], eventos = [], clientes = elegirClientes(B, r, N + U + 12);
  const propBiz = plan.props.length > 0;
  const libres = plan.servs.filter((s) => cfg.kind === "hipo" || cfg.cash || s.price === 0);
  const what = cfg.kind === "hipo" ? "precal" : cfg.cash ? "oferta" : "cita";
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const todos = [...dias.map((d) => ({ d, up: false })), ...Array.from({ length: U }, () => ({ d: r.int(1, 12), up: true })).sort((a, b) => a.d - b.d)];
  const horasOk = [8, 9, 10, 11, 13, 14, 15, 16];
  let n = 0;
  for (const { d, up } of todos) {
    const c = clientes[n++ % clientes.length];
    // ¿propiedad o servicio? Las propiedades son la mayoría en los negocios que las publican.
    const aProp = propBiz && r.chance(0.82);
    let st = up ? r.weighted([["confirmed", 0.75], ["pending", 0.25]]) : r.weighted([["done", 0.62], ["done_noshow", 0.1], ["cancelled", 0.14], ["cancelled_gone", aProp ? 0.05 : 0], ["expired", 0.09]]);
    if (!aProp && st === "cancelled_gone") st = "cancelled";
    let p = null, s = null;
    if (aProp) {
      const vivas = plan.props.filter((x) => x.estado === "available" || x.estado === "pending");
      const cand = up ? vivas : st === "cancelled_gone" ? plan.props.filter((x) => x.d != null && x.d < d) : plan.props.filter((x) => x.d == null || x.d > d);
      if (!cand.length) { st = st === "cancelled_gone" ? "cancelled" : st; p = r.pick(up ? vivas : plan.props.filter((x) => x.d == null || x.d > d).length ? plan.props.filter((x) => x.d == null || x.d > d) : vivas); }
      else p = r.pick(cand);
    } else s = r.pick(libres);
    const num = `D-${32000000 + (ctx.n = (ctx.n ?? 0) + 1)}`;
    const vp = p ? r.pick(p.vis) : null, mm = p ? vp.min : r.pick(horasOk) * 60;
    const sentD = up ? -r.int(1, 3) : d - r.int(0, 3), sentM = r.int(8, 21) * 60 + r.pick([0, 20, 40]);
    const it = p ? { es: p.nm[0], en: p.nm[1] } : { es: s.es, en: s.en };
    const det = { demo: "r2i", cat: "NEG-INMUEBLE", rubro: "inm", what: p ? "visita" : what, min: mm, sms: true, kind: p ? p.kind : null, zip: p ? p.zip : null, ciudad: CIUDADES[B.city].nombre, item: it,
      sub: p ? { es: p.beds != null ? `${p.beds === 0 ? "Estudio" : `${p.beds} ${p.beds === 1 ? "recámara" : "recámaras"}`}${p.baths != null ? ` · ${p.baths} ${p.baths === 1 ? "baño" : "baños"}` : ""}` : p.sqft ? `${p.sqft.toLocaleString("en-US")} pies²` : "", en: p.beds != null ? `${p.beds === 0 ? "Studio" : `${p.beds} bed`}${p.baths != null ? ` · ${p.baths} bath` : ""}` : p.sqft ? `${p.sqft.toLocaleString("en-US")} sq ft` : "" } : { es: "Gratis", en: "Free" },
      fees: p ? p.fees : [], papers: p ? p.papers : null, ssn_req: p ? p.ssn : null, at_home: false, solo_zona: p ? p.zona : false, rent_cents: p?.rent ?? null, deposit_cents: p && p.rent != null ? p.deposit : 0, app_fee_cents: p?.appFee ?? 0,
      move_in_cents: p?.moveIn ?? null, price_cents: p?.price ?? null, est_cuota_cents: p?.cuota ?? null, est_down_pct: p?.pct ?? null, svc_cents: p ? null : 0, trade_in: null, puerta: null, bhph: null, est_payment: null };
    const o = { num, kind: "visit", city: B.city, biz: B.id, ph: c.tel, mem: null, st: st === "done_noshow" ? "done" : st === "cancelled_gone" ? "cancelled" : st, sd: st === "done" ? "done" : st === "done_noshow" ? "noshow" : st === "cancelled_gone" ? (p.deal === "renta" ? "rentada" : "vendida") : st === "expired" ? "sin_respuesta" : null,
      d, m: mm, dur: null, det, sub: 0, tot: 0, pm: "none", ps: null, party: 1, sentD, sentM, ansD: st === "pending" || st === "expired" ? null : sentD, ansM: sentM + r.int(1, 40), _p: p, _c: c, _it: it, _up: up, mode: null };
    if (st === "done" || st === "done_noshow") { o.doneD = d; o.doneM = mm + (st === "done" ? r.int(25, 60) : 20); }
    if (st === "cancelled" || st === "cancelled_gone") { o.cancD = d; o.cancM = Math.max(480, mm - r.int(60, 600)); o.cby = st === "cancelled_gone" ? "system" : "user"; o.creason = st === "cancelled_gone" ? null : r.pick(["Cambié de planes", "Ya encontré otra opción", "No me da el horario", "Prefiero esperar"]); }
    filas.push(o);
    eventos.push({ num, kind: "vis_sent", actor: "user", d: sentD, m: sentM });
    if (o.ansD != null) eventos.push({ num, kind: "vis_ok", actor: "member", d: o.ansD, m: o.ansM });
    if (st === "done") eventos.push({ num, kind: "vis_done", actor: "member", d, m: o.doneM });
    if (st === "done_noshow") eventos.push({ num, kind: "vis_noshow", actor: "member", d, m: o.doneM });
    if (st === "expired") eventos.push({ num, kind: "vis_exp", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") eventos.push({ num, kind: "cancelled", actor: "user", d, m: o.cancM });
    if (st === "cancelled_gone") eventos.push({ num, kind: "vis_listing_gone", actor: "member", d, m: o.cancM });
  }
  for (const f of filas) if (!f._up && f.d > -1) f.d = -1;
  return { filas, eventos, clientes };
}

/* ── Textos de reseñas por clase de negocio ── */
const ABRE = { 5: [P("Excelente atención.", "Excellent service."), P("Muy profesionales.", "Very professional."), P("Súper recomendados.", "Highly recommended."), P("Nos ayudaron muchísimo.", "They helped us a lot.")], 4: [P("Muy buen servicio.", "Very good service."), P("Todo bien.", "All good.")], 3: [P("Regular.", "So-so.")], 2: [P("No fue buena la experiencia.", "It was not a good experience.")], 1: [P("Mala experiencia.", "Bad experience.")] };
const CIERRA = { 5: [P("Los volveríamos a llamar.", "We would call them again."), P("Gracias por hacerlo tan fácil.", "Thanks for making it so easy."), P("Ya les mandé a dos amigos.", "I have already sent two friends.")], 4: [P("Recomendados.", "Recommended.")], 3: [P("Esperaba más.", "I expected more.")], 2: [P("Ojalá mejoren.", "I hope they improve.")], 1: [P("Ojalá avisen mejor.", "I hope they communicate better.")] };
const MEDIO = {
  venta: { 5: [P("Nos enseñaron la propiedad a la hora acordada y contestaron todas las preguntas.", "They showed us the property at the agreed time and answered every question."), P("Vimos la propiedad sin que nos cobraran nada y el precio era el publicado.", "We saw the property without being charged and the price was the one posted."), P("Nos explicaron la cuota estimada y los gastos del cierre antes de ofertar.", "They explained the estimated payment and closing costs before we made an offer."), P("Las fotos del anuncio eran fieles a la propiedad.", "The listing photos matched the property.")], 4: [P("La visita empezó unos minutos tarde pero avisaron.", "The showing started a few minutes late but they let us know."), P("El proceso tomó un poco más de lo esperado, aunque siempre supimos en qué íbamos.", "The process took a bit longer than expected, though we always knew where we stood.")], 3: [P("La propiedad no estaba del todo como en las fotos y tardaron en contestar.", "The property was not quite like the photos and they were slow to reply.")], 2: [P("Llegué a la visita y la propiedad ya estaba apartada; nadie me avisó.", "I got to the showing and the property was already on hold; nobody told me.")], 1: [P("Nadie contestó mis mensajes y la visita se cambió dos veces.", "Nobody answered my messages and the showing was moved twice.")] },
  rent: { 5: [P("Nos dijeron de entrada cuánto íbamos a pagar para mudarnos, sin sorpresas.", "They told us up front what we would pay to move in, no surprises."), P("Vimos la unidad sin pagar nada y todo era como en el anuncio.", "We saw the unit without paying anything and everything matched the listing."), P("Nos explicaron qué papeles pedían y no nos pidieron nada fuera de lo publicado.", "They explained which papers were needed and asked for nothing beyond what was posted."), P("Muy claros con las reglas y con lo que incluye la renta.", "Very clear about the rules and what the rent includes.")], 4: [P("La visita empezó unos minutos tarde pero avisaron.", "The viewing started a few minutes late but they let us know."), P("La unidad estaba bien aunque faltaba una limpieza.", "The unit was fine although it needed a cleaning.")], 3: [P("La unidad no estaba como en las fotos y tardaron en contestar.", "The unit was not quite like the photos and they were slow to reply.")], 2: [P("Llegué a la visita y la unidad ya estaba rentada; nadie me avisó.", "I got to the viewing and the unit was already rented; nobody told me.")], 1: [P("El total para mudarme no coincidía con lo publicado.", "The move-in total did not match what was posted.")] },
  comercial: { 5: [P("Nos enseñaron el espacio con las medidas y el costo al mes a la vista.", "They showed us the space with the measurements and monthly cost in view."), P("El contrato completo estaba disponible antes de firmar y nada cambió.", "The full lease was available before signing and nothing changed."), P("Nos orientaron con los permisos de la ciudad sin vueltas.", "They guided us through the city permits with no runaround."), P("El espacio estaba como en las fotos y listo para usar.", "The space looked like the photos and was ready to use.")], 4: [P("El espacio estaba bien; faltaba un arreglo menor que prometieron hacer.", "The space was fine; a minor repair was missing that they promised to do."), P("La visita empezó tarde pero avisaron.", "The visit started late but they let us know.")], 3: [P("El espacio era más pequeño de lo que esperaba por las fotos.", "The space was smaller than I expected from the photos.")], 2: [P("Fui a la visita y no había nadie con las llaves.", "I came for the visit and nobody had the keys.")], 1: [P("El costo mensual que me dijeron no coincidía con el publicado.", "The monthly cost I was told did not match the posted one.")] },
  alm: { 5: [P("Vimos la unidad sin costo y nos ayudaron a escoger el tamaño justo.", "We saw the unit at no cost and they helped us choose the right size."), P("El acceso es fácil y el precio es el que dijeron.", "Access is easy and the price is what they said."), P("Muy limpio, bien iluminado y con buena seguridad.", "Very clean, well lit and with good security.")], 4: [P("Todo bien; el código del portón tardó un día en llegar.", "All good; the gate code took a day to arrive.")], 3: [P("La unidad estaba bien pero el pasillo necesitaba limpieza.", "The unit was fine but the hallway needed cleaning.")], 2: [P("La unidad que reservé no era la que me enseñaron.", "The unit I booked was not the one they showed me.")], 1: [P("Nadie me atendió en la visita.", "Nobody attended me at the visit.")] },
  hipo: { 5: [P("Nos explicaron cada paso de la precalificación y qué papeles llevar.", "They explained every step of the pre-qualification and which papers to bring."), P("Nunca nos prometieron la aprobación y eso nos dio confianza.", "They never promised approval, which gave us confidence."), P("Nos dieron la cuota estimada por escrito y sin presión.", "They gave us the estimated payment in writing with no pressure."), P("Trabajaron con mi ITIN sin ponerme problema.", "They worked with my ITIN with no trouble.")], 4: [P("El proceso tomó un par de días más de lo dicho, pero avisaron.", "The process took a couple of days longer than said, but they kept us posted.")], 3: [P("Tardaron en pedirme un documento que faltaba.", "They were slow to ask me for a missing document.")], 2: [P("Tuve que mandar los papeles dos veces.", "I had to send the papers twice.")], 1: [P("Nadie me devolvió la llamada en una semana.", "Nobody returned my call for a week.")] },
  serv: { 5: [P("El precio fue el que me dieron por escrito y el reporte llegó a tiempo.", "The price was the one they gave me in writing and the report arrived on time."), P("Me explicaron todo en español y contestaron mis preguntas con paciencia.", "They explained everything in Spanish and answered my questions patiently."), P("Puntuales y claros; no hubo cargos fuera de lo cotizado.", "On time and clear; there were no charges beyond the quote."), P("La consulta fue gratis y de verdad me sirvió.", "The consultation was free and truly helped me.")], 4: [P("Llegaron unos minutos tarde pero avisaron.", "They arrived a few minutes late but let me know."), P("Todo bien, aunque el reporte tardó un día más de lo dicho.", "All good, although the report took a day longer than said.")], 3: [P("El trabajo estuvo bien pero la comunicación fue lenta.", "The work was fine but communication was slow.")], 2: [P("Tuve que insistir dos veces para recibir el reporte.", "I had to insist twice to get the report.")], 1: [P("No contestaron mis mensajes después de la cita.", "They did not answer my messages after the appointment.")] },
  derechos: { 5: [P("Nos explicaron qué dice la ley sin juzgarnos y sin preguntar por papeles.", "They explained what the law says without judging us and without asking about papers."), P("Salí sabiendo qué hacer y a dónde ir. Y fue gratis.", "I left knowing what to do and where to go. And it was free."), P("Me ayudaron con la carta para recuperar mi depósito.", "They helped me with the letter to get my deposit back."), P("Muy claros con lo que pueden y no pueden hacer.", "Very clear about what they can and cannot do.")], 4: [P("Muy útil, aunque tuve que esperar un rato.", "Very helpful, although I had to wait a while.")], 3: [P("Me orientaron, pero esperaba que hicieran más por mi caso.", "They guided me, but I expected them to do more for my case.")], 2: [P("Tuve que volver porque faltó información.", "I had to come back because information was missing.")], 1: [P("No pudieron atenderme el día de mi cita.", "They could not see me on the day of my appointment.")] },
};
const FLAVOR = { venta: "venta", rent: "rent", cuarto: "rent", hipo: "hipo", serv: "serv", derechos: "derechos", comercial: "comercial", alm: "alm" };
function textoRes(flavor, stars, lang, r, d) {
  const li = lang === "es" ? 0 : 1, T = MEDIO[flavor], a = r.pick(ABRE[stars]), m = r.pick(T[stars]), m2 = stars >= 4 && r.chance(0.4) ? r.pick(T[stars]) : null, c = r.chance(0.7) ? r.pick(CIERRA[stars]) : null;
  const s = [a[li], m[li].replace("{d}", d), m2 && m2 !== m ? m2[li] : null, c ? c[li] : null].filter(Boolean).join(" ");
  return (s.length < 24 ? s + (lang === "es" ? " Todo en orden." : " All in order.") : s).slice(0, 600);
}

const ESTRELLAS = [[5, 0.56], [4, 0.27], [3, 0.09], [2, 0.05], [1, 0.03]];
const HOY = Date.UTC(2026, 10, 17);
export function armarResenas2(B, filas) {
  const r = new Rng(B.seed + ":res"), flavor = FLAVOR[B.cfg.kind];
  const hechas = filas.filter((f) => f.kind === "visit" && f.st === "done" && f.sd === "done");
  const vistos = new Set(), unicos = [];
  for (const f of hechas) { if (vistos.has(f.ph)) continue; vistos.add(f.ph); unicos.push(f); }
  const objetivo = Math.min(unicos.length, clamp(Math.round(hechas.length * r.pick([0.4, 0.5, 0.6])), 15, 40));
  const out = [];
  for (const f of r.some(unicos, objetivo).sort((a, b) => a.d - b.d)) {
    const stars = r.weighted(ESTRELLAS), lang = f._c.lang === "en" || r.chance(0.1) ? "en" : "es";
    const cd = Math.min(-1, f.d + r.int(0, 6)), cm = r.int(9, 21) * 60 + r.int(0, 59);
    const reply = r.chance(stars <= 3 ? 1 : stars === 4 ? 0.5 : 0.4);
    const tot = f.det.move_in_cents ?? f.det.price_cents ?? null;
    out.push({
      biz: B.id, city: B.city, ph: f.ph, op: f.num, src: "cita", stars, body: textoRes(flavor, stars, lang, r, B.owner.nombre), lang,
      answers: { trato: ok3(stars), mudarOk: okm(stars), verGratis: ok2(stars), fotosOk: ok2(stars), llegaron: stars >= 4 ? "a" : stars === 3 ? "b" : "c", claro: okm(stars) },
      facts: { dia: new Date(HOY + f.d * 86400000).toISOString().slice(0, 10), que: f.det.what, ...(tot ? { tot } : {}) }, cd, cm,
      ...(reply ? { reply: textoReplica(stars, lang, f._c.nombre, r), rd: Math.min(-1, cd + r.int(0, 3)), rm: r.int(8, 20) * 60 + r.int(0, 59), rlang: lang } : {}),
    });
  }
  return out;
}

export function armarSeguidores2(B, clientes) {
  const r = new Rng(B.seed + ":seg"), n = clamp(Math.round((15 + (2026 - B.founded) * 3.5) * B.size * (0.7 + r.next() * 0.6)), 15, 80);
  const propios = r.shuffle([...new Set(clientes.map((c) => c.tel))]), otros = r.shuffle(CLIENTES.map((x) => x.tel));
  return [...propios, ...otros].filter((x, i, a) => a.indexOf(x) === i).slice(0, n).map((ph) => ({ ph, d: -r.int(3, Math.max(10, (2026 - B.founded) * 330)) }));
}
