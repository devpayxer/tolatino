import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { yo } from "@/lib/cuenta";
import { guardados } from "@/lib/categoria";
import { contexto, evento } from "@/lib/eventos";
import { ficha, registrarVista } from "@/lib/ficha";
import { menuPublico } from "@/lib/pedir";
import { rsvPublica } from "@/lib/reservas";
import { citasPublica } from "@/lib/citas";
import { oficiosPublico } from "@/lib/oficios-publico";
import { saludPublico } from "@/lib/salud-publico";
import { proPublico } from "@/lib/pro-publico";
import { tiendaPublica } from "@/lib/rentas";
import { horasApartado, tiendaMia, tiendaVenta } from "@/lib/apartados";
import { reglaPlan } from "@/lib/layaway";
import { mercPublico } from "@/lib/merc-publico";
import { fiestaPublico } from "@/lib/fiestas-publico";
import { transPublico } from "@/lib/trans-publico";
import { nochePublica } from "@/lib/noche-publico";
import { inscPublica } from "@/lib/inscripciones-publico";
import { faqFe, fePublica, hoyFe } from "@/lib/fe-publico";
import { faqInm, hoyInm, inmPublica } from "@/lib/inmuebles-publico";
import { autosPublica, faqAutos, hoyAutos } from "@/lib/autos-publico";
import { contratoTexto } from "@/lib/deporte-comun";
import { edadTexto } from "@/lib/ninos-comun";
import { coverTexto, filaCorta, filaCuando, hNoche, LINEA_NOCHE } from "@/lib/noche-comun";
import { diaFiesta } from "@/lib/fiestas-comun";
import { resumenResenas } from "@/lib/resenas";
import { novedadesFicha } from "@/lib/novedades";
import { vacantesFicha } from "@/lib/jobs";
import { eventosDelOrganizador } from "@/lib/evt-publico";
import { idioma } from "@/lib/idioma";
import { textosT } from "@/lib/cms";
import { PieWeb } from "../../_legal/PieWeb";
import { ubicacion } from "@/lib/ubicacion";
import { Ficha } from "./Ficha";
import { BASE_URL } from "@/lib/correo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, lang] = await Promise.all([params, idioma()]);
  const f = await ficha(id, lang);
  // 9h · SEO: canónico y Open Graph con la foto de portada (lo público de la ficha).
  if (!f) return { title: "To'Latino" };
  const url = `${BASE_URL()}/n/${encodeURIComponent(f.id)}`;
  return { title: `${f.nombre} · To'Latino`, description: f.subsLinea, alternates: { canonical: url },
    openGraph: { title: f.nombre, description: f.subsLinea, type: "website", url, ...(f.fotos[0] ? { images: [{ url: f.fotos[0] }] } : {}) } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; p?: string; d?: string; h?: string; editar?: string }> }) {
  const [{ id }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  const loc = await ubicacion(u);
  const f = await ficha(id, lang, loc);
  if (!f) notFound();
  const [ua, ctx] = [(await headers()).get("user-agent"), await contexto()];
  after(() => registrarVista(f.id, u?.id ?? null, ua, ctx.dev).catch(() => undefined));
  after(() => evento("ver_ficha", { ref: f.id, ciudad: loc.c.id, userId: u?.id ?? null }, ctx));
  const [evts, fav, menu, rsv, res, nov, jobs, svc, ofi, tienda, salud, prof, merc, fiesta, trans, noche, insc, fe, inm, dl] = await Promise.all([
    // 6b · Ficha › Eventos: solo réplica de sus fechas vivas, en Pro.
    f.pro ? eventosDelOrganizador(f.id, u?.id ?? null, lang === "es") : Promise.resolve([]),
    guardados(u?.id ?? null, [f.id]),
    f.cat === "NEG-FOOD" ? menuPublico(f.id, lang, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-FOOD" ? rsvPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    resumenResenas(f.id, u?.id ?? null),
    f.pro ? novedadesFicha(f.id, u?.id ?? null) : Promise.resolve(null),
    f.pro ? vacantesFicha(f.id, u?.id ?? null) : Promise.resolve([]),
    f.cat === "NEG-BELL" ? citasPublica(f.id, u?.id ?? null) : Promise.resolve(null),
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" ? oficiosPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Tiendas (4q): lo mismo que la Tienda de Auto y Hogar, con tallas y las horas que guarda la tienda (24/48/72).
    f.cat === "NEG-AUTO" || f.cat === "NEG-HOGAR" || f.cat === "NEG-TIENDA" || f.cat === "NEG-TRANS" ? Promise.all([tiendaPublica(f.id), tiendaVenta(f.id), tiendaMia(u?.id ?? null, f.id), horasApartado(f.id), f.cat === "NEG-TIENDA" ? reglaPlan(f.id) : null]).then(([L, V, mia, horas, plan]) => ({ L, V, mia, horas, plan })) : Promise.resolve(null),
    // Doctores (4i): servicios con el precio según tu seguro, quién atiende y «Tu seguro».
    f.cat === "NEG-SALUD" ? saludPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Profesionales (4k): el total (honorario + gobierno), la licencia y lo que no puede.
    f.cat === "NEG-PRO" ? proPublico(f.id) : Promise.resolve(null),
    // Mercados (4o): productos por libra, corte o punto, y si toma pedidos.
    f.cat === "NEG-MERC" ? mercPublico(f.id) : Promise.resolve(null),
    // Fiestas (4u): servicios con su forma de cobrar, el calendario real y «Tu fecha».
    f.cat === "NEG-FIESTA" ? fiestaPublico(f.id, u?.id ?? null) : Promise.resolve(null),
    // Transporte (4x): precio cerrado, la próxima salida con asientos y la licencia.
    f.cat === "NEG-TRANS" ? transPublico(f.id) : Promise.resolve(null),
    // Noche (4nb): el cover de esta noche, la fila con su hora, la lista y las mesas.
    f.cat === "NEG-NOCHE" ? nochePublica(f.id) : Promise.resolve(null),
    // Educación, Niños y Deporte (4ed): cursos, programas o membresías con sus grupos, la licencia del DHS y el contrato.
    f.cat === "NEG-EDU" || f.cat === "NEG-NINOS" || f.cat === "NEG-DEPORTE" ? inscPublica(f.id) : Promise.resolve(null),
    // Iglesias, Bienes Raíces y Venta de Autos (4id): horarios y servicios; propiedades con la zona (nunca la dirección); carros con el total en la puerta.
    f.cat === "NEG-FE" ? fePublica(f.id) : Promise.resolve(null),
    f.cat === "NEG-INMUEBLE" ? inmPublica(f.id) : Promise.resolve(null),
    f.cat === "NEG-DEALER" ? autosPublica(f.id) : Promise.resolve(null),
  ]);
  // 4id · La tarjeta de Hoy, la FAQ, el rótulo de las reseñas y la variante sin local de las tres (neg-fe-kind / neg-inm-kind /
  // neg-dealer-kind post). El servidor decide: columnas con datos reales; la FAQ de Tu página gana a la automática.
  if (fe || inm || dl) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), hoyTxt = f.semana.find((w) => w.hoy)?.v ?? "";
    const h = fe ? hoyFe(fe, es, hoyTxt) : inm ? hoyInm(inm, es, hoyTxt) : hoyAutos(dl!, es, hoyTxt);
    f.hoy = { ...f.hoy, sub: h.sub, cols: h.cols };
    if (fe) fe.td = h.cols; else if (inm) inm.td = h.cols; else if (dl) dl.td = h.cols;
    if (f.pro) {
      const auto = fe ? faqFe(fe, es) : inm ? faqInm(inm, es) : faqAutos(dl!, es);
      const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
      f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
    }
    // Reseñas (fe L114, inm L99, dealer L115; §6 #13: la funeraria no cuenta verificadas porque no tiene operación en la app).
    if (res) res.negocio.verL = fe ? (fe.kind === "fun" || fe.kind === "tienda" ? { ok: null, no: E2("RESEÑAS DE VECINOS", "NEIGHBOR REVIEWS") } : { ok: E2("VERIFICADAS POR FECHA O CATECISMO", "VERIFIED BY DATE OR CATECHISM"), no: E2("RESEÑAS DE VECINOS QUE VAN · AQUÍ NO SE COBRA NI SE RESERVA", "REVIEWS FROM NEIGHBORS WHO GO · NOTHING TO PAY OR BOOK HERE") })
      : inm ? { ok: E2("VERIFICADAS POR VISITA O CITA", "VERIFIED BY VISIT OR BOOKING"), no: E2("RESEÑAS DE VECINOS · AÚN SIN VISITAS VERIFICADAS", "NEIGHBOR REVIEWS · NO VERIFIED VISITS YET") }
      : { ok: E2("VERIFICADAS POR PRUEBA DE MANEJO O CITA", "VERIFIED BY TEST DRIVE OR BOOKING"), no: E2("RESEÑAS DE VECINOS · AÚN SIN PRUEBAS VERIFICADAS", "NEIGHBOR REVIEWS · NO VERIFIED TEST DRIVES YET") };
    // Sin local (fe L152–153, inm L137–138, dealer L156). Un cuarto vive en la casa de quien lo renta: la ficha NUNCA lleva la dirección ni
    // el punto del negocio (guardián direccionAlConfirmar); la dirección llega al confirmar la visita.
    const radio = fe?.negocio.radio ?? inm?.negocio.radio ?? dl?.negocio.radio ?? null;
    const sinLocal = inm?.kind === "cuarto" ? { zona: radio ? E2(`Zona donde trabaja · hasta ${radio} mi`, `Service area · up to ${radio} mi`) : E2(`Cuartos en ${f.ciudad.charAt(0)}${f.ciudad.slice(1).toLowerCase()}`, `Rooms in ${f.ciudad.charAt(0)}${f.ciudad.slice(1).toLowerCase()}`), meta: E2("LA DIRECCIÓN TE LLEGA AL ACEPTAR LA VISITA", "ADDRESS SENT WHEN THE VISIT IS ACCEPTED") }
      : fe?.kind === "oracion" && radio ? { zona: `${fe.negocio.whatsapp ? E2("Por teléfono y WhatsApp", "By phone and WhatsApp") : E2("Por teléfono", "By phone")}${E2(` · va a hospitales hasta ${radio} mi`, ` · visits hospitals up to ${radio} mi`)}`, meta: E2("NO TIENE LOCAL · ATIENDE POR TELÉFONO", "NO OFFICE · BY PHONE") }
      : dl && !f.direccion && radio ? { zona: E2(`Zona donde trabaja · hasta ${radio} mi`, `Service area · up to ${radio} mi`), meta: E2("VA A DONDE ESTÁ EL CARRO", "COMES TO WHERE THE CAR IS") }
      : null;
    if (sinLocal) Object.assign(f, { direccion: null, lat: null, lng: null, zona: sinLocal.zona, direccionMeta: sinLocal.meta, amenK: E2("CÓMO TRABAJA", "HOW THEY WORK"), dist: "—", metaD: f.metaD.replace(/ · [\d.—]+ MI · /, " · ") });
  }
  // FAQ de Educación, Niños y Deporte (neg-edu-kind faq, neg-ninos-kind faq L26–39, neg-deporte-kind faq L35–54): salen de los servicios
  // y de Tu herramienta; si el negocio escribió la misma pregunta en Tu página, gana la suya.
  if (insc && f.pro) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), ni = insc.ninos, dp = insc.dep;
    const auto = insc.rubro === "edu" ? [
      { q: E2("¿El precio incluye todo?", "Does the price include everything?"), a: E2("El precio del curso es el total: libros y examen incluidos o dichos aparte, antes de inscribirte.", "The course price is the total: books and exam included or listed separately, before you enroll.") },
      ...(insc.cursos.some((x) => x.k === "curso" && x.mat) ? [{ q: E2("¿Para qué es la matrícula?", "What is the registration fee for?"), a: E2("Aparta tu cupo y se descuenta del total. Si el grupo no abre, se devuelve completa.", "It holds your seat and comes off the total. If the group does not open, it is refunded in full.") }] : []),
      ...(insc.how.linea ? [{ q: E2("¿Hay clases en línea?", "Are there online classes?"), a: E2("Sí. El enlace les llega solo a los inscritos.", "Yes. Only enrolled students get the link.") }] : []),
      { q: E2("¿Me piden papeles o estatus?", "Do they ask for papers or status?"), a: E2("To’Latino no pide estatus ni seguro social para inscribirte.", "To’Latino does not ask for status or a social security number to enroll.") },
    ] : insc.rubro === "ninos" && ni ? [
      ...(ni.cuidado ? [{ q: E2("¿Tienen licencia del estado?", "Are you state licensed?"), a: ni.lic.estado === "valid" ? E2("Sí, de Pennsylvania (DHS). To’Latino la verificó y está a la vista en la página.", "Yes, from Pennsylvania (DHS). To’Latino verified it and it is shown on the page.") : E2("No hay una licencia del estado verificada en To’Latino: pregúntala antes de inscribir a tu niño.", "There is no verified state license on To’Latino: ask about it before enrolling your child.") },
        { q: E2("¿Aceptan el subsidio CCIS?", "Do you accept CCIS?"), a: ni.ccis ? E2("Sí. El estado paga una parte y te dicen lo que te toca antes de empezar.", "Yes. The state pays part and they tell you your share before you start.") : E2("No; pagas el precio de la semana.", "No; you pay the weekly price.") }] : []),
      { q: E2("¿Qué edades atienden?", "What ages do you serve?"), a: edadTexto(ni.edad, es) },
      { q: E2("¿Quién puede recoger al niño?", "Who can pick up my child?"), a: E2("Solo las personas autorizadas, siempre con identificación. La lista se entrega en persona.", "Only authorized people, always with ID. The list is handed in person.") },
      { q: E2("¿Qué datos de mi niño guarda To’Latino?", "What data about my child does To’Latino keep?"), a: E2("Solo su nombre de pila, la edad o el grado y una nota, cifrados; se borran a los 30 días. Nunca la fecha de nacimiento, fotos ni datos médicos.", "Only first name, age or grade and a note, encrypted; deleted after 30 days. Never birth date, photos or medical data.") },
    ] : dp ? [
      ...(dp.memb ? [{ q: E2("¿Hay contrato?", "Is there a contract?"), a: contratoTexto({ contrato: dp.contrato, salir: dp.salir }, es) + "." }, { q: E2("¿Hay cuota de inscripción?", "Is there a signup fee?"), a: dp.inscripcion ? E2(`Sí: $${dp.inscripcion / 100}, una sola vez.`, `Yes: $${dp.inscripcion / 100}, once.`) : E2("No.", "No.") }] : []),
      ...(dp.liga ? [{ q: E2("¿La cuota es por partido?", "Is the fee per game?"), a: E2("No: es de toda la temporada. Si la liga no abre, el depósito se devuelve completo.", "No: it covers the whole season. If the league does not open, the deposit is refunded in full.") },
        { q: E2("¿Aceptan jugadores sin equipo?", "Do you take players without a team?"), a: dp.sueltos ? E2("Sí: te inscribes solo y te ponen en un equipo.", "Yes: sign up alone and they place you on a team.") : E2("Solo equipos completos.", "Full teams only.") }] : []),
      { q: E2("¿Me pueden cobrar algo después?", "Can they charge me later?"), a: E2("No. Solo se cobra lo que ves aquí; nada que aparezca después en la tarjeta.", "No. Only what you see here; nothing showing up later on your card.") },
    ] : [];
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
  }
  // FAQ de Fiestas (neg-fiesta-kind.js faq): la de la fecha y la del depósito salen del calendario y del panel; si el negocio
  // escribió la misma pregunta en Tu página, gana la suya.
  if (fiesta && f.pro) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
    const libres = fiesta.cal.libres.map((d) => diaFiesta(d, es)).join(", ");
    const auto = [
      { q: E2("¿Está libre mi fecha?", "Is my date free?"), a: `${E2("Agrega tu fecha arriba y te lo decimos.", "Add your date above and we tell you.")}${libres ? E2(` Próximas libres: ${libres}.`, ` Next free: ${libres}.`) : ""}` },
      { q: E2("¿Qué pasa con el depósito?", "What about the deposit?"), a: fiesta.dep ? E2(`Se retienen ${usd(fiesta.dep)} al enviar la solicitud y se cobran cuando confirman; se descuentan del total. Si no confirman o proponen otra hora que no aceptas, se libera completo.`, `${usd(fiesta.dep)} is held when you send the request and charged once they confirm; credited to the total. If they do not confirm or propose another time you decline, it is fully released.`) : E2("No pide depósito.", "No deposit.") },
      { q: E2("¿Qué incluye el paquete?", "What does the package include?"), a: E2("Cada paquete dice lo que incluye. Lo que no está escrito, no está incluido.", "Each package lists what it includes. If it is not written, it is not included.") },
      { q: E2("¿Y si cancelo?", "What if I cancel?"), a: E2(`Gratis hasta ${fiesta.cancel} días antes de la fiesta. Después, el depósito se queda con el negocio.`, `Free up to ${fiesta.cancel} days before the party. After that, the business keeps the deposit.`) },
    ];
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
  }
  // FAQ de Transporte (neg-trans-kind.js faq): el precio cerrado, la cancelación y lo que dice su herramienta; gana la de Tu página.
  if (trans && f.pro) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), h = trans.h;
    const auto = [
      { q: E2("¿El precio puede cambiar?", "Can the price change?"), a: E2("No. El precio es cerrado antes de salir: lo que pagas al reservar es todo.", "No. The price is fixed before leaving: what you pay when booking is everything.") },
      { q: E2("¿Y si cancelo?", "What if I cancel?"), a: E2("Gratis hasta 24 horas antes. Después, se cobra la mitad. Si el negocio no sale, te devolvemos todo.", "Free up to 24 hours before. After that, half is charged. If the business does not run, you get everything back.") },
      ...(h?.bags && trans.servicios.some((x) => x.k === "asiento") ? [{ q: E2("¿Cuántas maletas puedo llevar?", "How many bags can I bring?"), a: `${E2(`${h.bags} maletas incluidas por persona.`, `${h.bags} bags included per person.`)}${h.extraBag != null ? E2(` La extra cuesta $${h.extraBag / 100} y se paga al reservar.`, ` An extra bag is $${h.extraBag / 100}, paid when booking.`) : E2(" No venden maleta extra.", " No extra bags sold.")}` }] : []),
      ...(h?.kind === "caja" && h.shipDay ? [{ q: E2("¿Cuánto tarda en llegar?", "How long does it take?"), a: E2(`Sale ${({ sab: "el sábado", mie: "el miércoles", "15d": "cada 15 días" } as Record<string, string>)[h.shipDay]}${h.shipWeeks ? ` y llega en ${h.shipWeeks.replace("-", " a ")} semanas` : ""}.`, `Ships ${({ sab: "on Saturday", mie: "on Wednesday", "15d": "every 2 weeks" } as Record<string, string>)[h.shipDay]}${h.shipWeeks ? ` and arrives in ${h.shipWeeks.replace("-", " to ")} weeks` : ""}.`) }] : []),
      ...(h?.nino ? [{ q: E2("¿Tienen asiento de niño?", "Do you have a child seat?"), a: E2("Sí, sin costo si lo pides al reservar.", "Yes, free if you ask when booking.") }] : []),
    ];
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
  }
  // FAQ de Noche (neg-noche-kind.js faq L22–47): el cover, la identificación, la lista, la fila, «¿y si me cobran más?» y el mínimo;
  // sale de «Esta noche» y de los servicios. Si el negocio escribió la misma pregunta en Tu página, gana la suya.
  if (noche && f.pro && !noche.porFecha) {
    const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b), e = noche.noche, lista = noche.servicios.find((s) => s.k === "lista");
    const auto = [
      { q: E2("¿Cuánto es el cover?", "How much is the cover?"), a: e ? `${coverTexto(e, es)}. ${LINEA_NOCHE[es ? "es" : "en"]}` : E2("Aún no lo publica en To’Latino: pregúntalo en la puerta.", "Not posted on To’Latino yet: ask at the door.") },
      { q: E2("¿Qué identificación piden?", "What ID do they ask for?"), a: E2(`Licencia, pasaporte o ID del estado vigente. Edad: ${e?.edad ?? 21}+. Sin identificación no entras, aunque estés en la lista.`, `A valid license, passport or state ID. Age: ${e?.edad ?? 21}+. No ID, no entry, even if you are on the list.`) },
      ...(lista && lista.until != null ? [{ q: E2("¿Hasta qué hora vale la lista?", "Until what time is the list valid?"), a: E2(`Hasta las ${hNoche(lista.until)}. Anotarte no cobra nada; después de esa hora pagas el cover normal.`, `Until ${hNoche(lista.until)}. Joining costs nothing; after that time you pay the regular cover.`) }] : []),
      ...(noche.fila ? [{ q: E2("¿Cómo está la fila?", "How is the line?"), a: `${filaCorta(noche.fila, es)}. ${filaCuando(noche.fila, es)}` }] : []),
      { q: E2("¿Y si en la puerta me cobran más?", "What if the door charges more?"), a: E2("Si te cobran más de lo publicado aquí, pide ayuda en To’Latino: miramos el cover que el local publicó esa noche y el local te devuelve la diferencia.", "If they charge more than posted here, ask for help on To’Latino: we check the cover the venue posted that night and the venue refunds the difference.") },
      ...(noche.mesas ? [{ q: E2("¿El mínimo de mesa es un cargo extra?", "Is the table minimum an extra fee?"), a: E2("No. El mínimo es lo que se consume en la noche; si dejaste depósito, se descuenta de tu cuenta.", "No. The minimum is what you spend during the night; any deposit comes off your bill.") }] : []),
    ];
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    f.faqs = [...auto.filter((x) => !f.faqs.some((y) => norm(y.q) === norm(x.q))), ...f.faqs];
  }
  // Al volver de «Entra» la pestaña conserva personas, día y hora; «Cambiar» trae la solicitud a editar.
  const num = (x?: string) => (x && /^\d{1,4}$/.test(x) ? Number(x) : undefined);
  const rsvInicial = { p: num(sp.p), i: num(sp.d), h: num(sp.h), editar: sp.editar && /^R-\d{1,10}$/.test(sp.editar) ? sp.editar : undefined };
  const t = (await textosT(lang)).ficha;
  // 9h · schema.org/LocalBusiness: lo que dice la ficha (nombre, teléfono público, dirección si tiene local, el punto público y la portada), sin datos de nadie.
  const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: f.nombre, url: `${BASE_URL()}/n/${encodeURIComponent(f.id)}`,
    ...(f.subsLinea ? { description: f.subsLinea } : {}), ...(f.telefono ? { telephone: f.telefono } : {}), ...(f.fotos[0] ? { image: f.fotos[0] } : {}),
    ...(f.direccion ? { address: { "@type": "PostalAddress", streetAddress: f.direccion, addressRegion: "PA", addressCountry: "US" } } : {}),
    ...(f.lat != null && f.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: f.lat, longitude: f.lng } } : {}) };
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    <Ficha
      f={{ ...f, guardado: fav.has(f.id) }}
      menu={menu}
      rsv={rsv}
      svc={svc}
      ofi={ofi}
      salud={salud}
      prof={prof}
      merc={merc}
      fiesta={fiesta}
      trans={trans}
      noche={noche}
      insc={insc}
      fe={fe}
      inm={inm}
      dl={dl}
      tienda={tienda}
      resenas={res}
      novedades={nov && nov.posts.length ? nov : null}
      jobs={jobs}
      eventos={evts}
      rsvInicial={rsvInicial}
      sesion={!!u}
      es={lang === "es"}
      tabInicial={sp.tab}
      t={{
        ...t,
        photosAll: f.nFotos === 1 ? t.photosOne : t.photosN.replace("{n}", String(f.nFotos)),
        photoCount: f.nFotos === 1 ? t.photoCountOne : t.photoCount.replace("{n}", String(f.nFotos)),
        relSub: t.relSub.replace("{n}", f.nombre),
      }}
    />
    <PieWeb />
    </>
  );
}
