// NEG-NINOS · 5 subcategorías principales: guardería, cuidado infantil en casa, preescolar, Pre-K y programas subsidiados.
// Sin datos sensibles de niños en ningún texto público: edades por rango, cupos y la capacidad autorizada por el DHS.
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, H, horario, s, n, j, addDays as ad, CIUDADES, fechasEnvio, uuidOf } from "./comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "./base.mjs";
import { sqlItems } from "./items.mjs";
import { matriculas, sqlGrupos, sqlGrupoDeMatricula, etiqueta } from "./grupos.mjs";

export const SUBS = [
  { id: "NEG-NINOS-01", es: "Guardería", en: "Daycare center", also: "NEG-NINOS-09", names: ["Guardería Mis Primeros Pasos", "Guardería Rayito de Sol", "Guardería Pequeños Gigantes", "Centro Infantil Semillita", "Guardería Abrazo Tierno", "Guardería Arco Iris", "Casa de los Angelitos Guardería", "Guardería Nubecita", "Guardería Cuna de Estrellas", "Guardería Alegría del Barrio"] },
  { id: "NEG-NINOS-02", es: "Cuidado infantil en casa", en: "Home child care", also: null, names: ["Cuidado en Casa Doña Lupe", "Hogar Infantil Tía Rosa", "Casita de Cuidado Manitas", "Cuidado Familiar Los Girasoles", "Hogar de Día Mariposa", "Cuidado en Casa Dulce Hogar", "Casa Cuna Doña Carmen", "Cuidado Familiar La Ceiba", "Hogar Infantil Pequeños Pasos", "Casita del Cuidado Lucero"] },
  { id: "NEG-NINOS-03", es: "Preescolar", en: "Preschool", also: "NEG-NINOS-13", names: ["Preescolar Pequeños Exploradores", "Preescolar Letras y Colores", "Preescolar Brotes de Esperanza", "Jardín de Niños Arco de Luz", "Preescolar Mundo Mágico", "Preescolar Semillas del Saber", "Preescolar Cielo Azul", "Jardín Infantil La Pradera", "Preescolar Pasitos Seguros", "Preescolar Alas de Mariposa"] },
  { id: "NEG-NINOS-04", es: "Programa Pre-K", en: "Pre-K program", also: "NEG-NINOS-03", names: ["Pre-K Listos para Kínder", "Pre-K Camino al Saber", "Pre-K Estrellitas del Valle", "Pre-K Primeras Letras", "Pre-K Horizonte Pequeño", "Pre-K Futuro Brillante", "Pre-K Cuatro Años Felices", "Pre-K Paso a Paso", "Pre-K Aula Abierta", "Pre-K Nido del Saber"] },
  { id: "NEG-NINOS-05", es: "Programas subsidiados", en: "Subsidized programs", also: "NEG-NINOS-01", names: ["Centro Infantil Familias Unidas", "Cuidado Accesible Esperanza", "Guardería Puerta Abierta", "Centro Niños Primero", "Cuidado para Todos Centro", "Centro Infantil Vecinos", "Guardería Mano Amiga", "Centro Infantil Buen Comienzo", "Cuidado Comunitario Raíces", "Centro Infantil Unidos Crecemos"] },
];

const PERIODO = {
  "NEG-NINOS-01": { ages: [0, 5], cap: [24, 60], week: 23500, items: [["Guardería · tiempo completo", "Full-time daycare", "Lunes a viernes. Desayuno, almuerzo y merienda.", "Monday to Friday. Breakfast, lunch and snack.", 1.0], ["Guardería · medio tiempo", "Part-time daycare", "Medio día, con almuerzo.", "Half day, with lunch.", 0.62], ["Infantes (6 semanas a 2 años)", "Infants (6 weeks to 2 years)", "Cuidado con proporción reducida para los más pequeños.", "Care with a reduced ratio for the youngest.", 1.15]] },
  "NEG-NINOS-02": { ages: [0, 8], cap: [4, 6], week: 18000, home: true, items: [["Cuidado en casa · tiempo completo", "Full-time home care", "Grupo pequeño en un hogar familiar certificado. Comidas incluidas.", "Small group in a certified family home. Meals included.", 1.0], ["Cuidado en casa · medio tiempo", "Part-time home care", "Medio día, con almuerzo.", "Half day, with lunch.", 0.6], ["Cuidado de fin de semana", "Weekend care", "Sábados, por día, con aviso de dos días.", "Saturdays, by the day, with two days' notice.", 0.45]] },
  "NEG-NINOS-03": { ages: [2, 5], cap: [20, 45], week: 21000, school: true, items: [["Preescolar · 3 años", "Preschool · age 3", "Juego, letras y números. Lunes a viernes por la mañana.", "Play, letters and numbers. Monday to Friday mornings.", 2.0], ["Preescolar · 4 años", "Preschool · age 4", "Preparación para el kínder, con lectura y escritura inicial.", "Kindergarten readiness, with early reading and writing.", 2.1], ["Extensión de tarde", "Afternoon extension", "Cuidado y merienda hasta las 5:30 PM.", "Care and snack until 5:30 PM.", 0.5]] },
  "NEG-NINOS-04": { ages: [4, 5], cap: [16, 40], week: 19500, school: true, items: [["Pre-K (4 años)", "Pre-K (age 4)", "Programa de día completo para el año antes del kínder.", "Full-day program for the year before kindergarten.", 2.2], ["Pre-K medio día", "Half-day Pre-K", "Medio día, mañana o tarde.", "Half day, morning or afternoon.", 1.4], ["Cuidado de tarde para Pre-K", "Pre-K afternoon care", "Después del programa, hasta las 6 PM.", "After the program, until 6 PM.", 0.5]] },
  "NEG-NINOS-05": { ages: [0, 12], cap: [30, 70], week: 20500, ccis: true, items: [["Tiempo completo · acepta CCIS", "Full time · accepts CCIS", "Acepta el subsidio de cuidado infantil de Pensilvania (CCIS). Pregunta por tu copago.", "Accepts Pennsylvania's child care subsidy (CCIS). Ask about your copay.", 1.0], ["Después de la escuela", "After school", "Recogida en la escuela y tarea guiada hasta las 6 PM.", "School pickup and guided homework until 6 PM.", 0.5], ["Medio tiempo · acepta CCIS", "Part time · accepts CCIS", "Medio día, con el subsidio.", "Half day, with the subsidy.", 0.62]] },
};

const P = {
  pos: { es: ["Mi hijo llega contento cada mañana y las maestras nos avisan cómo estuvo su día.", "El lugar está limpio y se ve que cuidan la seguridad: puertas con llave y registro de entrada y salida.", "Nos explicaron la licencia del estado y cuántos niños hay por adulto, y eso nos dio confianza.", "Los horarios nos sirven porque trabajamos hasta tarde, y siempre hay alguien amable en la puerta.", "Las comidas son sanas y respetan las alergias que les informamos.", "Pude inscribirme desde la app y el precio fue el mismo que me dijeron.", "Las maestras hablan español y las familias nos sentimos en casa.", "Después de un año, volvería a elegirlos sin dudar."], en: ["My child arrives happy every morning and the teachers tell us how the day went.", "The place is clean and they clearly take safety seriously: locked doors and a sign-in and sign-out log.", "They explained the state license and how many children there are per adult, and that gave us confidence.", "The schedule works for us because we work late, and there is always someone kind at the door.", "Meals are healthy and they respect the allergies we told them about.", "I could enroll from the app and the price was the same they quoted.", "The teachers speak Spanish and the families feel at home.", "After a year, I would choose them again without a doubt."] },
  mid: { es: ["En general bien, aunque los cupos tardaron en abrirse.", "Buen cuidado; el precio subió un poco este año.", "Las maestras son cariñosas, pero el patio es pequeño."], en: ["Good overall, although openings took a while.", "Good care; the price went up a little this year.", "The teachers are warm, but the yard is small."] },
  neg: { es: ["Cambiaron el horario de salida y avisaron muy tarde.", "La comunicación con la oficina fue difícil y tardaron en responder.", "Esperaba más actividades durante la tarde."], en: ["They changed the pickup time and told us very late.", "Communication with the office was difficult and slow.", "I expected more activities in the afternoon."] },
  cierre: { es: ["Los recomiendo a otras familias.", "Gracias por el cuidado.", "Estamos muy agradecidos."], en: ["I recommend them to other families.", "Thank you for the care.", "We are very grateful."] },
  cierreNeg: { es: ["Espero que lo mejoren.", "", ""], en: ["I hope they improve this.", "", ""] },
  faqs: [
    { q: bi("¿Tienen licencia del estado?", "Are you licensed by the state?"), a: bi("Sí. Tenemos el certificado de cuidado infantil del DHS de Pennsylvania, con su capacidad autorizada. Pregunta por la proporción de niños por adulto.", "Yes. We hold the Pennsylvania DHS child care certificate, with its licensed capacity. Ask about the child-to-adult ratio.") },
    { q: bi("¿Cómo me inscribo y qué pasa con el cupo?", "How do I enroll and what happens with the opening?"), a: bi("Elige la fecha de inicio y envía la solicitud. El centro responde y, si hay cupo, queda confirmada. Si no hay, te anotas en la lista de espera.", "Pick the start date and send the request. The center replies and, if there is an opening, it is confirmed. If not, you join the waitlist.") },
    { q: bi("¿Aceptan el subsidio (CCIS)?", "Do you accept the subsidy (CCIS)?"), a: bi("Pregunta en la ficha: si aceptamos el subsidio, lo verás marcado. El copago depende de tu familia.", "Check the page: if we accept the subsidy, it is marked. Your copay depends on your family.") },
    { q: bi("¿Qué comidas dan?", "What meals do you serve?"), a: bi("Desayuno, almuerzo y merienda en el tiempo completo. Cuéntanos de alergias y las anotamos.", "Breakfast, lunch and snack on full time. Tell us about allergies and we note them.") },
    { q: bi("¿Cómo se recoge a los niños?", "How are children picked up?"), a: bi("Solo las personas que usted autorice por escrito, con identificación. La puerta siempre está con llave.", "Only people you authorize in writing, with ID. The door is always locked.") },
    { q: bi("¿Se cobra algo por la app?", "Is anything charged in the app?"), a: bi("Solo la matrícula, si el centro la pide. La semana o el mes se paga en el centro.", "Only the enrollment fee, if the center asks for it. Weekly or monthly tuition is paid at the center.") },
  ],
  team: [
    { role: bi("Directora", "Director"), bio: bi("Responsable de la licencia y las inscripciones.", "In charge of the license and enrollments."), spec: [] },
    { role: bi("Maestra de infantes", "Infant teacher"), bio: bi("Cuida a los más pequeños.", "Cares for the youngest."), spec: [bi("Primera infancia", "Early childhood")] },
    { role: bi("Maestra de preescolar", "Preschool teacher"), bio: bi("Enseña letras, números y juego.", "Teaches letters, numbers and play."), spec: [bi("Educación temprana", "Early education")] },
    { role: bi("Cocinera", "Cook"), bio: bi("Prepara las comidas y las meriendas.", "Prepares meals and snacks."), spec: [] },
  ],
  posts: [
    { kind: "novedad", title: "Hay cupos abiertos para el próximo mes", body: "Tenemos lugares en varias edades. Envía tu solicitud desde la ficha." },
    { kind: "novedad", title: "Aceptamos el subsidio de cuidado infantil", body: "Si tu familia tiene CCIS, pregúntanos por el copago." },
    { kind: "encuesta", title: "¿Qué horario te serviría más?", body: "Estamos pensando en ampliar el horario.", poll: ["Abrir a las 5:30 AM", "Cerrar a las 6:30 PM", "Sábados", "Está bien como está"] },
    { kind: "novedad", title: "Menú nuevo de temporada", body: "Estrenamos desayunos con avena y fruta, y almuerzos con verduras de la región." },
    { kind: "novedad", title: "Reunión de familias el primer sábado", body: "Platicamos sobre el calendario, las salidas y cómo ayudar en casa." },
    { kind: "novedad", title: "Cerramos por el feriado", body: "No habrá servicio ese día. Gracias por su comprensión." },
    { kind: "novedad", title: "Gracias por otro año juntos", body: "Gracias a las familias que nos confían su cuidado cada día." },
    { kind: "novedad", title: "Inspección del DHS aprobada", body: "Recibimos la visita de revisión del estado. Tienes nuestro certificado a la vista en la entrada." },
  ],
};

/* Inicios de cuidado (fechas de cupo) o ciclos escolares. */
function gruposDe(r, b, items, objetivo) {
  const out = [];
  for (const it of items) {
    const ciclo = it.kind === "mes";
    if (ciclo) { // un grupo por año escolar: septiembre → junio, más uno que abre en enero
      for (let y = Math.max(2016, b.founded); y <= 2026; y++) { const st = addDays(new Date(Date.UTC(y, 8, 1)), r.i(0, 14)), en = new Date(Date.UTC(y + 1, 5, r.i(5, 20))); const estado = st > ANCHOR_D ? "open" : en >= ANCHOR_D ? "started" : "finished"; if (st > addDays(ANCHOR_D, 120)) continue; out.push({ item: it.name.es, starts: st, ends: en, dows: [1, 2, 3, 4, 5], min: 480, dur: 480, seats: r.i(4, 8), estado, label: etiqueta(st, estado), booked: 0, b: b.id }); }
      const ja = addDays(ANCHOR_D, r.i(8, 40)); out.push({ item: it.name.es, starts: ja, ends: addDays(ja, 150), dows: [1, 2, 3, 4, 5], min: 480, dur: 480, seats: r.i(3, 6), estado: "open", label: etiqueta(ja, "open"), booked: 0, b: b.id });
    } else {
      const k = Math.max(12, Math.round(objetivo * 0.45)), fechas = fechasEnvio(r, k, Math.max(2016, b.founded), -45); let last = null;
      for (const d0 of fechas) { const d = withTime(d0, 0); if (last && (d - last) / 86400000 < 12) continue; last = d; const estado = d > ANCHOR_D ? "open" : "finished"; out.push({ item: it.name.es, starts: d, ends: null, dows: [1, 2, 3, 4, 5], min: 360, dur: 480, seats: r.i(2, 4), estado, label: etiqueta(d, estado, "dia"), booked: 0, b: b.id }); }
      if (!out.some((g) => g.item === it.name.es && g.estado === "open")) { const d = addDays(ANCHOR_D, r.i(7, 28)); out.push({ item: it.name.es, starts: d, ends: null, dows: [1, 2, 3, 4, 5], min: 360, dur: 480, seats: r.i(1, 3), estado: "open", label: etiqueta(d, "open", "dia"), booked: 0, b: b.id }); }
    }
  }
  return out.sort((a, b) => a.starts - b.starts);
}

export function generar() {
  const negocios = negociosBase("NINOS", "NEG-NINOS", SUBS, {
    ficha(b, S, r) {
      const pd = PERIODO[S.id], m = 0.9 + r.f() * 0.22, items = []; let k = 0;
      pd.items.forEach((it, ix) => {
        if (ix >= 2 && r.chance(0.35)) return;
        const kind = pd.school && ix < 2 ? "mes" : "semana", base = Math.round((pd.week * it[4]) / 500) * 500, cents = kind === "mes" ? Math.round((pd.week * it[4] * 2.1 * m) / 1000) * 1000 : Math.round((pd.week * it[4] * m) / 500) * 500;
        items.push({ sec: bi(kind === "mes" ? "Programas" : "Cuidado por semana", kind === "mes" ? "Programs" : "Weekly care"), secSort: kind === "mes" ? 0 : 1, name: bi(it[0], it[1]), descr: bi(it[2], it[3]), cents, dur: 60, kind, attrs: { inc: [bi("Comidas", "Meals"), bi("Pañales no", "Diapers not included")] }, pfrom: false, photo: b.pics[k % b.pics.length], sort: k++, dep: 0 });
      });
      b.items = items;
      const cap = Math.max(pd.home ? 4 : 12, r.i(pd.cap[0], pd.cap[1])), week = items.find((x) => x.kind === "semana") ? items.find((x) => x.kind === "semana").cents : Math.round(items[0].cents / 4.3 / 500) * 500;
      b.ninos = { cap, ageMin: pd.ages[0], ageMax: pd.ages[1], ccis: !!pd.ccis || r.chance(0.35), extended: r.chance(0.5), meals: true, transport: r.chance(0.2), home: !!pd.home, week: Math.max(5000, Math.min(60000, Math.round(week / 500) * 500)), signup: r.pick([0, 2500, 5000, 7500]), reply: r.pick([12, 24, 24]), bands: [] };
      const bandas = [[0, 1, "Bebés (0 a 1)", "Infants (0 to 1)"], [2, 2, "2 años", "Age 2"], [3, 3, "3 años", "Age 3"], [4, 5, "4 y 5 años", "Ages 4 and 5"], [6, 12, "6 a 12 años", "Ages 6 to 12"]].filter((x) => x[1] >= pd.ages[0] && x[0] <= pd.ages[1]);
      b.ninos.bands = bandas.map((x, i) => ({ min: Math.max(x[0], pd.ages[0]), max: Math.min(x[1], pd.ages[1]), es: x[2], en: x[3], open: r.i(0, 4), sort: i }));
      b.radius = null; b.fromHome = !!pd.home; b.languages = ["es", ...(r.chance(0.6) ? ["en"] : [])];
      b.about = bi(`${b.name} es ${S.es.toLowerCase().replace("programa ", "un programa ")} en ${CIUDADES[b.city].n} desde ${b.founded}. Tenemos el certificado del DHS de Pennsylvania con capacidad autorizada para ${cap} niños, de ${pd.ages[0] === 0 ? "bebés" : pd.ages[0] + " años"} a ${pd.ages[1]} años. Maestras que hablan español, comidas incluidas y un registro de entrada y salida para que sepas quién recoge a cada niño.`, `${b.name} is ${S.en.toLowerCase()} in ${CIUDADES[b.city].n} since ${b.founded}. We hold the Pennsylvania DHS certificate with a licensed capacity of ${cap} children, ages ${pd.ages[0] === 0 ? "infants" : pd.ages[0]} to ${pd.ages[1]}. Spanish-speaking teachers, meals included and a sign-in and sign-out log so you know who picks up each child.`);
      b.amenities = ["licencia-del-estado", "comidas-incluidas", ...(b.ninos.ccis ? ["acepta-subsidio"] : []), ...(b.ninos.transport ? ["transporte"] : []), "acepta-tarjeta", "estacionamiento"];
      const abre = b.ninos.extended ? ["05:30", "18:30"] : ["06:30", "18:00"];
      b.hours = horario(H.lunVie(...abre));
      const fv = ["lic", "esp", "comidas"]; if (b.ninos.ccis) fv.push("subsidio"); if (b.ninos.transport) fv.push("transporte"); if (b.ninos.extended) fv.push("extendido"); if (b.founded <= 2016) fv.push("y10"); b.filters = fv;
      b.modules = ["svc"];
      b.licenses = [{ kind: "pa_dhs_childcare", title: bi("Licencia de cuidado infantil (DHS)", "Child care certificate (DHS)"), num: `PRUEBA-${r.i(10000, 99999)}`, review: addDays(ANCHOR_D, r.i(60, 330)) }];
      b.attrs = { m: "shop", edad: [pd.ages[0], pd.ages[1]], cap, tarjeta: { fee: bi(`${usd(b.ninos.week)} la semana`, `${usd(b.ninos.week)} a week`) } };
      fichaComun(b, P);
    },
  });
  for (const b of negocios) novedades(b, P, b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));
  const ops = [], grupos = [], seq = { n: 0 };
  for (const b of negocios) {
    const r = rng(`ops:${b.id}`), next = cicloClientes(r), target = Math.round(22 + b.vol * b.vol * 56);
    const gs = gruposDe(r, b, b.items, target * 2);
    const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
    const os = matriculas(r, b, gs, next, seq, {
      num: 7400000 + 20000 * Math.floor(b.gi / 10), fill: [[0.4, 0.8], [0.2, 0.6]],
      item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs }; }, mat: () => 0,
      det: (g, c, it) => ({ rubro: "ninos", k: it.kind, item_id: null, svc: it.lname, group_id: null, band_id: null, group: g.label, starts_on: ymd(g.starts), ends_on: g.ends ? ymd(g.ends) : null, start_min: g.min, dows: g.dows, for: "hijo", guardian_ok: true, level: null, team_name: null, price_cents: it.cents, mat_cents: 0, mat_app: 0, plan_n: null, cert: null, cert_by: null, oficial: false, no: [], contract_m: 0, cancel_fee_cents: 0, g1: false, sms: true, neutro: false, cuidado: true }),
    });
    ops.push(...os); grupos.push(...gs);
    ponerResenas(r, P, (rr, st) => ({ totalOk: st >= 3 ? 1 : 0, horarioOk: st >= 3 ? 1 : 0, trato: st >= 4 ? 1 : st === 3 ? 0 : -1, licVista: st >= 3 ? 1 : 0, cuidaron: st >= 4 ? 1 : st === 3 ? 0 : -1, contaban: st >= 4 ? 1 : 0 }), os, target);
  }
  const extra = [...sqlItems(negocios)];
  extra.push(`create temp table _is (b text, amin int, amax int, ccis boolean, ext boolean, meals boolean, trans boolean, home boolean, week int, signup int, reply int) on commit drop;`);
  extra.push(`insert into _is values ${negocios.map((b) => `(${s(b.id)}, ${b.ninos.ageMin}, ${b.ninos.ageMax}, ${b.ninos.ccis}, ${b.ninos.extended}, ${b.ninos.meals}, ${b.ninos.transport}, ${b.ninos.home}, ${b.ninos.week}, ${b.ninos.signup}, ${b.ninos.reply})`).join(",\n")};`);
  extra.push(`insert into insc_settings (business_id, city_id, rubro, how_presencial, esp, reply_h, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, signup_cents)
select x.b, bz.city_id, 'ninos', true, true, x.reply, x.amin, x.amax, x.ccis, x.ext, x.meals, false, x.trans, false, x.home, x.week, x.signup from _is x join businesses bz on bz.id = x.b on conflict (business_id) do nothing;`);
  const bands = negocios.flatMap((b) => b.ninos.bands.map((x) => `(${s(b.id)}, ${x.min}, ${x.max}, ${j(bi(x.es, x.en))}, ${x.open}, ${x.sort})`));
  extra.push(`create temp table _cb (b text, mn int, mx int, label jsonb, op int, srt int) on commit drop;`, `insert into _cb values ${bands.join(",\n")};`);
  extra.push(`insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select x.b, bz.city_id, x.mn, x.mx, x.label, x.op, x.srt from _cb x join businesses bz on bz.id = x.b
 where not exists (select 1 from care_openings c where c.business_id = x.b and c.band_min = x.mn and c.band_max = x.mx and c.removed_at is null);`);
  extra.push(...sqlGrupos(negocios, grupos));
  return { negocios, ops, extra, after: sqlGrupoDeMatricula(ops), cat: "NEG-NINOS", file: "demo-d-ninos.sql" };
}
