/* Ronda 2 · Bienes Raíces: especificación de cada negocio y su plan (catálogo, propiedades, equipo, ficha, filtros, FAQ, novedades). Todo determinista. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Rng, q, J, TA, BI, slug, CIUDADES, ORDEN_CIUDADES, lugar, px, fotosDeSubs, dedupe, redondea, NOMBRES_H, NOMBRES_M, APELLIDOS } from "../c/base.mjs";
import { armarNovedades } from "../c/textos.mjs";
import { SUBS, PALABRAS, CAT } from "./catalogo.mjs";
import { genProp, dealDe, itemProp, usd } from "./propiedades.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FOTOS = JSON.parse(fs.readFileSync(path.join(AQUI, "../c/fotos.json"), "utf8"));
const NEGOCIOS_POR_SUB = 10;

/* ── Teléfonos de ficción: dueños +1 484 555 6600–6999 (reservado hasta 7199), clientes +1 717 555 3300–3599 ── */
export const telDueno = (i) => `+1484555${6600 + i}`;
export const CLIENTES = (() => {
  const r = new Rng("clientes-r2-inmueble"), out = [];
  for (let n = 3300; n <= 3599; n++) {
    const mujer = r.chance(0.5);
    out.push({ tel: `+1717555${n}`, nombre: mujer ? r.pick(NOMBRES_M) : r.pick(NOMBRES_H), ap: r.pick(APELLIDOS), ciudad: ORDEN_CIUDADES[(n - 3300) % 5], lang: r.chance(0.18) ? "en" : "es", mujer });
  }
  return out;
})();
const CLI_CIUDAD = Object.fromEntries(ORDEN_CIUDADES.map((c) => [c, CLIENTES.filter((x) => x.ciudad === c)]));
export function elegirClientes(B, r, n) {
  const pool = [...r.shuffle(CLI_CIUDAD[B.city]), ...r.shuffle(CLIENTES.filter((x) => x.ciudad !== B.city))], out = [];
  let nuevo = 0;
  for (let i = 0; i < n; i++) {
    if (i > 3 && (r.chance(0.28) || nuevo >= pool.length)) out.push(out[r.int(0, out.length - 1)]);
    else out.push(pool[nuevo++ % pool.length]);
  }
  return out;
}

/* ── Especificaciones: 40 subcategorías × 10 negocios, 2 por ciudad ── */
export function especificar(existentes) {
  const usados = new Set(existentes), out = [];
  let k = 0;
  for (const sub of SUBS) {
    const rn = new Rng(`nombres:${sub.n}`), pal = rn.shuffle(PALABRAS);
    for (let j = 0; j < NEGOCIOS_POR_SUB; j++) {
      const r = new Rng(`b2:${CAT}:${sub.id}:${j}`), ciudad = ORDEN_CIUDADES[j % 5], L = lugar(ciudad, r), cn = CIUDADES[ciudad].nombre, W = pal[j];
      const pats = [`${sub.noun} ${W}`, `${W} ${sub.noun}`, `${sub.noun} ${cn}`, `${W} ${sub.noun} ${cn}`, `${sub.noun} de ${W}`];
      const name = pats[(j * 2 + (j >> 1)) % 5].replace(/\s+/g, " ");
      const mujer = r.chance(0.28), nombre = mujer ? r.pick(NOMBRES_M) : r.pick(NOMBRES_H), ap = r.pick(APELLIDOS);
      const id = dedupe(usados, `${slug(name)}-${sub.n}`);
      out.push({
        cat: CAT, sub: sub.id, cfg: sub, j, idx: k, id, name, city: ciudad, ...L, founded: r.int(2008, 2018), owner: { tel: telDueno(k), nombre, ap, mujer },
        phone: `+1${CIUDADES[ciudad].area}55502${String(r.int(0, 99)).padStart(2, "0")}`, size: r.pick([0.55, 0.7, 0.85, 1, 1, 1.1, 1.25, 1.5, 1.9]), wa: r.chance(0.6), seed: `r2i:${id}`,
      });
      k++;
    }
  }
  return out;
}

const H = ["Edwin", "Jorge", "Víctor", "Ángel", "Samuel", "Gabriel", "Darío", "Efraín", "Ismael", "Rubén"], M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Carolina", "Evelyn", "Wendy", "Ivelisse", "Nancy", "Yaritza"];
const ROLES = {
  venta: [["Agente de bienes raíces y dueño", "Real estate agent and owner"], ["Agente", "Agent"], ["Coordinación de visitas", "Showing coordinator"]],
  rent: [["Administración y dueño", "Management and owner"], ["Encargado de unidades", "Unit manager"], ["Coordinación de visitas", "Showing coordinator"]],
  cuarto: [["Dueño de las casas", "House owner"], ["Encargada de la casa", "House manager"], ["Coordinación de visitas", "Showing coordinator"]],
  hipo: [["Oficial de préstamos y dueño", "Loan officer and owner"], ["Asesor de precalificación", "Pre-qualification advisor"], ["Atención al cliente", "Client support"]],
  serv: [["Profesional y dueño", "Professional and owner"], ["Asistente", "Assistant"], ["Coordinación de citas", "Scheduling"]],
  derechos: [["Coordinador y fundador", "Coordinator and founder"], ["Orientadora", "Guide"], ["Atención de casos", "Intake"]],
  comercial: [["Administración y dueño", "Management and owner"], ["Encargado del espacio", "Space manager"], ["Coordinación de visitas", "Showing coordinator"]],
  alm: [["Dueño y administración", "Owner and management"], ["Atención al cliente", "Customer service"], ["Encargado de las instalaciones", "Facilities"]],
};
const R5 = (a, b) => [[`${String(a).padStart(2, "0")}:00`, `${String(b).padStart(2, "0")}:00`]];

export function planInm2(B) {
  const r = new Rng(B.seed + ":plan"), cfg = B.cfg, kind = cfg.kind, c = CIUDADES[B.city].nombre;
  const propBiz = !!cfg.pk;
  const subs = [B.sub, ...r.some(cfg.otras, r.int(1, 2))];
  const fotos = fotosDeSubs(subs, CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  const propias = (FOTOS.sub[B.sub] ?? []).length ? FOTOS.sub[B.sub] : fotos;
  const fotoPick = () => r.pick(propias);
  const props = [];
  if (propBiz) {
    const nombres = new Set();
    const mk = (deal, estado, d) => {
      for (let t = 0; t < 12; t++) {
        const k = r.weighted(cfg.pk), dl = dealDe(k, r, cfg.pVenta);
        if (deal && dl !== deal) continue;
        const p = genProp(B, cfg, r, k, dl, fotoPick);
        if (nombres.has(p.nm[0])) continue;
        nombres.add(p.nm[0]);
        return { ...p, estado, d };
      }
      // último recurso: forzar la clase y el trato
      const k = cfg.pk[0][0], p = genProp(B, cfg, r, k, deal ?? dealDe(k, r, cfg.pVenta), fotoPick);
      p.nm = [`${p.nm[0].slice(0, 52)} #${nombres.size + 1}`, `${p.nm[1].slice(0, 52)} #${nombres.size + 1}`];
      nombres.add(p.nm[0]);
      return { ...p, estado, d };
    };
    const nA = r.int(4, 8), nH = r.int(6, 14), hist = Math.max(30, (2026 - B.founded) * 330);
    for (let i = 0; i < nA; i++) props.push(mk(null, i === 2 && r.chance(0.4) ? "pending" : "available", null));
    for (let i = 0; i < nH; i++) {
      const p = mk(null, "x", -r.int(10, hist));
      p.estado = p.deal === "venta" ? "sold" : "rented";
      props.push(p);
    }
  }
  const sueltos = props.map((p, i) => itemProp(p, i, p.estado, p.d));
  const V = props.filter((p) => p.estado === "available" || p.estado === "pending"), R = V.filter((p) => p.deal === "renta"), S = V.filter((p) => p.deal === "venta");
  // Servicios: todos los de la subcategoría, con precio algo distinto por negocio; los gratis son los que se piden como cita/visita
  const fSrv = () => px(r.pick(propias));
  const servs = cfg.serv.map((s, i) => ({ m: "svc", es: s.es, en: s.en, des: s.des, den: s.den, price: s.usd ? redondea(s.usd * 100 * (0.9 + r.next() * 0.24), 500) : 0, dur: s.dur, attrs: {}, fotos: [fSrv()], sort: i + (propBiz ? 90 : 0), feat: i === 0 }));
  const secNom = kind === "hipo" ? ["Préstamos y requisitos", "Loans and requirements"] : kind === "derechos" ? ["Ayuda", "Help"] : ["Servicios", "Services"];
  const secciones = [{ es: secNom[0], en: secNom[1], sort: 0, items: servs }];
  // Herramienta (inm_settings)
  const itin = kind === "hipo" ? r.chance(cfg.n === "22" ? 0.95 : 0.7) : kind === "derechos" ? false : r.chance(cfg.itin ?? 0.5);
  const s8 = !!cfg.s8 || R.some((p) => p.s8), pets = R.some((p) => p.pets), sinCom = (kind === "venta" || cfg.cash) ? r.chance(cfg.sinCom ?? 0.25) : false;
  const minDown = r.pick([3.5, 10, 10, 15, 20]), prequal = r.pick([1, 2, 2, 3, 5]), util = R.some((p) => p.util.length > 2), mueble = R.some((p) => p.furnished);
  const settings = [`insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, soft_pull, buyer_no_commission, free_from, util, furnished) values (b, ${q(B.city)}, null, ${itin}, ${s8}, ${pets}, ${minDown}, ${prequal}, ${r.chance(0.4)}, ${sinCom}, null, ${util}, ${mueble}) on conflict (business_id) do nothing;`];
  // Filtros (los mismos que deriva lib/inmuebles.ts › recalcularFiltrosInm) + los de negocio
  const F = new Set(), Rv = R.filter((p) => ["apto", "casa", "cuarto", "compartida", "amueblado", "opcion", "s8", "mayores", "lote_movil"].includes(p.kind)), Cu = R.filter((p) => p.zona);
  if (R.length) F.add("rentar");
  if (S.length || kind === "venta" || kind === "hipo") F.add("comprar");
  if (Cu.length) F.add("cuarto");
  const sinSsn = Rv.length ? Rv.some((p) => !p.ssn) : (kind === "rent" || kind === "cuarto") && itin;
  if (sinSsn) F.add("sinssn");
  if (sinSsn || itin) F.add("itin");
  if (Rv.length ? Rv.some((p) => p.s8) : s8) F.add("s8");
  if (Rv.length ? Rv.some((p) => p.pets) : pets) F.add("mascotas");
  if (Rv.some((p) => p.util.length)) F.add("utilidades");
  if (V.some((p) => p.furnished)) F.add("amueblado");
  if (["21", "24"].includes(cfg.n)) F.add("primera");
  if (kind === "derechos") F.add("gratis");
  if (propBiz && V.length) F.add("visita");
  if (sinCom && (kind === "venta" || S.length)) F.add("nocom");
  F.add("esp"); if (B.founded <= 2016) F.add("y10");
  // Tarjeta
  const n1 = (x, a, b) => `${x} ${x === 1 ? a : b}`;
  const tj = {}, der = [];
  if (kind === "hipo") { tj.eta = BI(`Precalificación en ${n1(prequal, "día", "días")}`, `Pre-qualification in ${n1(prequal, "day", "days")}`); const pc = `${String(minDown).replace(/\.0$/, "")} %`; tj.fee = BI(`Precalificación gratis · enganche desde ${pc}${itin ? " con ITIN" : ""}`, `Free pre-qualification · ${pc.replace(" %", "%")} down${itin ? " with ITIN" : ""}`); der.push("eta", "fee"); }
  else if (kind === "venta") {
    tj.eta = BI(n1(S.length, "propiedad en venta", "propiedades en venta"), n1(S.length, "property for sale", "properties for sale")); der.push("eta");
    if (S.length) { const d = usd(Math.min(...S.map((p) => p.price))); tj.fee = BI(`Desde ${d}${sinCom ? " · comprador sin comisión" : ""}`, `From ${d}${sinCom ? " · no buyer commission" : ""}`); der.push("fee"); }
  } else if (kind === "cuarto") {
    tj.eta = Cu.length ? BI(n1(Cu.length, "cuarto libre", "cuartos libres"), n1(Cu.length, "room free", "rooms free")) : BI("Sin cuartos libres", "No rooms free"); der.push("eta");
    if (Cu.length) { const d = usd(Math.min(...Cu.map((p) => p.rent))); tj.fee = BI(`${d} al mes${util ? " con luz, agua e internet" : ""}`, `${d} a month${util ? " with power, water and internet" : ""}`); der.push("fee"); }
  } else if (kind === "rent" || kind === "comercial" || kind === "alm") {
    tj.eta = kind === "rent" ? BI(n1(R.length, "propiedad disponible", "propiedades disponibles"), n1(R.length, "property available", "properties available")) : BI(n1(V.length, "espacio disponible", "espacios disponibles"), n1(V.length, "space available", "spaces available")); der.push("eta");
    const mv = R.filter((p) => p.moveIn != null);
    if (mv.length) { tj.fee = mv.every((p) => !p.appFee && !p.fees.length) ? BI("Para mudarte: primer mes + depósito, sin cargos extra", "To move in: first month + deposit, no extra fees") : BI(`Para mudarte desde ${usd(Math.min(...mv.map((p) => p.moveIn)))}`, `Move in from ${usd(Math.min(...mv.map((p) => p.moveIn)))}`); der.push("fee"); }
  } else {
    const pagos = servs.filter((s) => s.price > 0);
    tj.eta = BI(cfg.eta[0], cfg.eta[1]);
    tj.fee = pagos.length ? BI(`Desde ${usd(Math.min(...pagos.map((s) => s.price)))} · precio total por escrito`, `From ${usd(Math.min(...pagos.map((s) => s.price)))} · total price in writing`) : BI("Gratis, sin compromiso", "Free, no commitment");
  }
  const attrs = { m: "shop", ...(kind === "hipo" ? { eng: minDown, nmls: String(1900000 + (B.idx * 7919) % 99000).slice(0, 7) } : {}), tarjeta: tj, ...(der.length ? { inm_der: der } : {}) };
  // Horario
  const lv = kind === "alm" ? r.pick([R5(7, 19), R5(8, 18)]) : kind === "derechos" ? r.pick([R5(9, 18), R5(10, 19)]) : r.pick([R5(9, 18), R5(9, 17), R5(10, 18)]), sab = r.pick([R5(9, 15), R5(10, 14), R5(9, 13)]);
  const semana = [kind === "alm" ? R5(10, 16) : r.chance(0.25) ? R5(12, 16) : null, lv, lv, lv, lv, lv, kind === "serv" && r.chance(0.4) ? null : sab];
  // Equipo
  const roles = ROLES[kind], ownerBio = r.pick([
    BI(`Llevo desde ${B.founded} trabajando con vecinos del valle. Mi trabajo es que entiendas cada paso y cada papel antes de decidir.`, `Since ${B.founded} I have worked with neighbors across the valley. My job is that you understand every step and every paper before you decide.`),
    BI(`Llegué de Santo Domingo y abrí en ${B.founded}. Todo se dice claro y por escrito desde la primera conversación.`, `I came from Santo Domingo and opened in ${B.founded}. Everything is stated clearly and in writing from the first conversation.`),
    BI(`Trabajo en español y en inglés. Ver, preguntar y pedir el costo total es gratis; nadie decide por ti.`, `I work in Spanish and English. Viewing, asking and requesting the total cost is free; no one decides for you.`),
  ]);
  const team = [{ name: `${B.owner.nombre} ${B.owner.ap}`, role: BI(...roles[0]), since: B.founded, langs: ["es", "en"], bio: ownerBio, bookings: true },
    { name: `${r.pick(H)} ${r.pick(APELLIDOS)}`, role: BI(...roles[1]), since: r.int(B.founded + 1, 2023), langs: ["es", "en"], bio: null, bookings: true },
    ...(r.chance(0.7) ? [{ name: `${r.pick(M)} ${r.pick(APELLIDOS)}`, role: BI(...roles[2]), since: r.int(B.founded + 1, 2024), langs: ["es"], bio: null, bookings: false }] : [])];
  const about = BI(`${cfg.blurb[0]} En ${c} desde ${B.founded}.${itin && kind !== "derechos" ? " Trabajamos con ITIN." : ""}${sinCom ? " El comprador no paga comisión." : ""} Hablamos español e inglés.`, `${cfg.blurb[1]} In ${c} since ${B.founded}.${itin && kind !== "derechos" ? " We work with ITIN." : ""}${sinCom ? " The buyer pays no commission." : ""} We speak Spanish and English.`);
  const amen = ["acepta-tarjeta"]; if (V.some((p) => p.parking) || ["alm", "comercial"].includes(kind)) amen.push("estacionamiento"); if (itin) amen.push("acepta-itin"); if (s8) amen.push("section-8"); if (pets) amen.push("mascotas"); if (["derechos", "serv", "hipo"].includes(kind) || r.chance(0.3)) amen.push("accesible"); if (cfg.n === "41" || cfg.n === "38" || cfg.n === "42") amen.push("wi-fi");
  const lic = cfg.lic ?? (kind === "hipo" ? ["nmls_inm"] : ["venta", "rent", "comercial"].includes(kind) ? ["pa_corredor"] : []);
  const plan = {
    subs, galeria: gal, secciones, sueltos, settings, about, attrs, filtros: [...F], amenities: [...new Set(amen)], langs: ["es", "en"], modulos: ["svc", "staff", "nov"], semana, team, deCasa: false, operation: "local", svcModel: "emp", stripe: false,
    faqs: faqs(B, cfg, { itin, sinCom, minDown, prequal, c, s8, pets, propBiz }), props, servs, ds: { itin, sinCom }, licencias: lic,
  };
  plan.posts = novedades(B, plan, r);
  return plan;
}

function faqs(B, cfg, x) {
  const k = cfg.kind, c = x.c, F = [];
  const si = (a, b) => [a, b];
  const gratisVer = ["¿Cobran por ver una propiedad?", "Do you charge to see a property?", "No. Ver una propiedad es gratis. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "No. Viewing a property is free. Never pay a deposit before seeing the property and signing the lease."];
  if (k === "venta") {
    F.push(gratisVer, ["¿Qué significa «cuota estimada»?", "What does “estimated payment” mean?", "Es el pago mensual aproximado con impuestos y seguro, según el enganche que elijas. La cuota real depende del préstamo que te aprueben.", "It is the approximate monthly payment with taxes and insurance, based on the down payment you choose. The real payment depends on the loan you are approved for."],
      ["¿Puedo comprar con ITIN?", "Can I buy with an ITIN?", x.itin ? `Sí. Trabajamos con prestamistas que aceptan ITIN; suelen pedir un enganche desde ${String(x.minDown).replace(/\.0$/, "")} %. Nadie garantiza la aprobación antes de revisar tus papeles.` : "Te orientamos con prestamistas que atienden a compradores con distintos papeles. Nadie garantiza la aprobación antes de revisar tus papeles.", x.itin ? `Yes. We work with lenders that accept ITIN; they usually ask for a down payment from ${x.minDown}%. No one guarantees approval before reviewing your papers.` : "We point you to lenders that serve buyers with different papers. No one guarantees approval before reviewing your papers."],
      ["¿Cómo reservo una visita?", "How do I book a showing?", "En cada propiedad eliges una hora libre y nos llega al instante. Si no puedes ir, cancela desde la app para liberar el horario.", "On each property you pick a free time and it reaches us instantly. If you cannot make it, cancel from the app to free up the slot."],
      [x.sinCom ? "¿El comprador paga comisión?" : "¿Quién paga la comisión?", x.sinCom ? "Does the buyer pay a commission?" : "Who pays the commission?", x.sinCom ? "En las propiedades que listamos nosotros, el comprador no paga comisión." : "Lo hablamos por escrito antes de firmar nada, para que sepas cuánto es y quién lo paga.", x.sinCom ? "On the properties we list, the buyer pays no commission." : "We discuss it in writing before you sign anything, so you know how much it is and who pays it."]);
  } else if (k === "rent" || k === "cuarto") {
    F.push(gratisVer, ["¿Cuánto cuesta mudarme?", "How much does it cost to move in?", "Cada anuncio dice la renta, el depósito, la cuota de solicitud si la hay y el total para mudarte. No hay cargos fuera de lo publicado.", "Each listing shows the rent, the deposit, the application fee if any and the total to move in. There are no charges beyond what is posted."],
      ["¿Qué papeles piden?", "Which papers do you ask for?", "Cada anuncio dice qué papeles piden. No escribas tu seguro social ni números de cuenta en la app.", "Each listing says which papers are asked. Do not type your Social Security or account numbers in the app."],
      ["¿Aceptan animales de servicio?", "Do you accept service animals?", "Sí, siempre. Los animales de servicio y de apoyo no son mascotas.", "Yes, always. Service and support animals are not pets."],
      ["¿Cómo reservo una visita?", "How do I book a viewing?", "Eliges una hora libre en el anuncio y nos llega al instante. Si no puedes ir, cancela desde la app.", "Pick a free time on the listing and it reaches us instantly. If you cannot make it, cancel from the app."]);
    if (cfg.n === "19") F.push(["¿Aceptan el voucher de Section 8?", "Do you accept Section 8 vouchers?", "Sí. Tú pagas tu parte y la autoridad de vivienda la suya. La inspección se coordina con ellos.", "Yes. You pay your share and the housing authority pays theirs. The inspection is coordinated with them."]);
    if (cfg.n === "20") F.push(["¿Cómo se verifica la edad?", "How is age verified?", "Pedimos un comprobante de edad y una ID; el equipo de To'Latino lo revisa. Se pide solo para estas unidades.", "We ask for proof of age and an ID; the To'Latino team reviews it. It is only asked for these units."]);
    if (cfg.n === "32") F.push(["¿Cómo funciona la opción a compra?", "How does the option to buy work?", "Las condiciones de la opción van por escrito y las leemos juntos antes de firmar. Nadie garantiza la aprobación de un préstamo.", "The option terms are in writing and we read them together before you sign. No one guarantees loan approval."]);
    if (cfg.n === "16" || cfg.n === "17") F.push(["¿Cuándo veo la dirección exacta?", "When do I see the exact address?", "Cuando confirmamos tu visita. Antes ves la zona, por la privacidad de quienes viven allí.", "When we confirm your visit. Before that you see the area, to protect the privacy of the people who live there."]);
  } else if (k === "hipo") {
    F.push(["¿La precalificación cuesta algo?", "Does pre-qualification cost anything?", "No. Es gratis y no te compromete. Nadie puede garantizar la aprobación antes de revisar tus papeles.", "No. It is free and does not commit you. No one can guarantee approval before reviewing your papers."],
      ["¿Puedo calificar con ITIN?", "Can I qualify with an ITIN?", x.itin ? `Trabajamos con prestamistas que aceptan ITIN. Suelen pedir un enganche desde ${String(x.minDown).replace(/\.0$/, "")} %. Cada caso se revisa por separado.` : "Depende del prestamista y del caso. Te decimos qué opciones hay sin prometer nada.", x.itin ? `We work with lenders that accept an ITIN. They usually ask for a down payment from ${x.minDown}%. Each case is reviewed separately.` : "It depends on the lender and the case. We tell you what options exist without promising anything."],
      ["¿Cuánto tarda?", "How long does it take?", `Normalmente ${x.prequal} ${x.prequal === 1 ? "día hábil" : "días hábiles"} desde que mandas los papeles.`, `Usually ${x.prequal} business ${x.prequal === 1 ? "day" : "days"} from when you send the papers.`],
      ["¿Qué papeles necesito?", "Which papers do I need?", "Una ID, comprobantes de ingreso y, si tienes, tu ITIN o número de seguro social. Nunca los escribas en un mensaje: se entregan en la cita.", "An ID, proof of income and, if you have it, your ITIN or Social Security number. Never type them in a message: they are handed over at the appointment."],
      ["¿Tienen licencia?", "Are you licensed?", "Sí. Nuestra licencia NMLS está en la ficha, con el enlace al registro para que la verifiques.", "Yes. Our NMLS license is on the profile, with the registry link so you can verify it."]);
  } else if (k === "derechos") {
    F.push(["¿Son abogados?", "Are you lawyers?", "No. Damos orientación gratis sobre lo que dice la ley y los pasos a seguir. Para representación legal te decimos a dónde ir.", "No. We give free guidance on what the law says and the steps to take. For legal representation we tell you where to go."],
      ["¿Me preguntan mi estatus migratorio?", "Do you ask about my immigration status?", "No. Nadie te pregunta tu estatus ni te pide papeles de inmigración para orientarte.", "No. Nobody asks your status or asks for immigration papers to guide you."],
      ["¿Cuesta algo?", "Does it cost anything?", "No. La orientación es gratis, con cita o sin cita.", "No. Guidance is free, with or without an appointment."],
      ["¿Qué debo llevar?", "What should I bring?", "Tu contrato, los avisos que recibiste y fotos o mensajes sobre el problema. Si no los tienes, igual vienes.", "Your lease, the notices you received and photos or messages about the problem. If you do not have them, come anyway."]);
  } else if (k === "comercial") {
    F.push(["¿Cobran por ver el espacio?", "Do you charge to see the space?", "No. Ver el espacio es gratis. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "No. Viewing the space is free. Never pay a deposit before seeing the property and signing the lease."],
      ["¿Qué incluye la renta?", "What does the rent include?", "Cada anuncio dice la renta, el depósito, el plazo y qué servicios incluye. Lo que pagas al mes y el contrato completo se ven antes de firmar.", "Each listing shows the rent, the deposit, the term and which utilities it includes. What you pay per month and the full contract are shown before you sign."],
      ["¿Qué permisos necesito?", "Which permits do I need?", `Depende de tu negocio y de la zona en ${c}. Te orientamos con la ciudad, pero cada permiso lo da la autoridad correspondiente.`, `It depends on your business and the zone in ${c}. We guide you with the city, but each permit is issued by the proper authority.`],
      ["¿Cómo reservo una visita?", "How do I book a visit?", "Eliges una hora libre en el anuncio y nos llega al instante.", "Pick a free time on the listing and it reaches us instantly."]);
  } else if (k === "alm") {
    F.push(["¿Cobran por ver el espacio?", "Do you charge to see the space?", "No. Ver el espacio es gratis.", "No. Viewing the space is free."],
      ["¿Es mes a mes?", "Is it month to month?", "Sí. Pagas por mes y avisas con tiempo cuando quieras salir. Lo que dice el contrato se ve antes de pagar.", "Yes. You pay by the month and give notice when you want to leave. What the agreement says is shown before you pay."],
      ["¿Cuándo puedo entrar?", "When can I get in?", "Según el horario publicado. Cada unidad dice su tipo de acceso.", "According to the posted hours. Each unit states its type of access."],
      ["¿Qué no se puede guardar?", "What can I not store?", "Materiales peligrosos, alimentos y animales. La lista completa está en el contrato.", "Hazardous materials, food and animals. The full list is in the agreement."]);
  } else {
    F.push(["¿Cuánto cuesta?", "How much does it cost?", cfg.serv.some((s) => s.usd) ? "Cada servicio muestra su precio. El precio es el total por escrito antes de empezar, sin cargos escondidos." : "La consulta es gratis. Si algo tiene costo, te lo decimos por escrito antes de empezar.", cfg.serv.some((s) => s.usd) ? "Each service shows its price. The price is the written total before work starts, with no hidden charges." : "The consultation is free. If something has a cost, we tell you in writing before we start."],
      ["¿Cómo pido una cita?", "How do I book?", "Elige el servicio gratis y una hora libre. Para los que llevan precio, llámanos o escríbenos y te damos la cotización por escrito.", "Pick the free service and an open time. For priced services, call or message us and we give you the quote in writing."],
      ["¿Atienden en español?", "Do you work in Spanish?", `Sí, todo el equipo atiende en español e inglés en ${c}.`, `Yes, the whole team works in Spanish and English in ${c}.`],
      ["¿Qué debo llevar?", "What should I bring?", "Tus documentos de la propiedad si los tienes. Si no, igual hablamos y te decimos qué conseguir.", "Your property documents if you have them. If not, we talk anyway and tell you what to get."]);
    if (cfg.cash) F.push(["¿La oferta es obligatoria?", "Is the offer binding?", "No. La oferta es por escrito y sin compromiso; compárala con la de un agente antes de aceptar.", "No. The offer is in writing with no commitment; compare it with an agent's before accepting."]);
  }
  F.push(["¿Atienden en español?", "Do you work in Spanish?", `Sí, todo el equipo atiende en español e inglés en ${c}.`, `Yes, the whole team works in Spanish and English in ${c}.`]);
  const vistos = new Set();
  return F.filter((f) => !vistos.has(f[0]) && vistos.add(f[0]));
}

function novedades(B, plan, r) {
  const k = B.cfg.kind, c = CIUDADES[B.city].nombre, p = plan.props.find((x) => x.estado === "available");
  const comunes = [
    { title: "Horario de feriados", body: "En los feriados atendemos solo por mensaje. Las citas y visitas vuelven al día siguiente." },
    { title: "Gracias por las reseñas", body: "Cada reseña verificada nos ayuda. Gracias a todos los que nos visitaron este año." },
    { title: "Ya puedes pedir cita por la app", body: `Elige el servicio y una hora libre en ${c}. Te confirmamos por mensaje.` },
  ];
  const por = {
    venta: [{ title: p ? `Nueva en venta: ${p.nm[0]}`.slice(0, 60) : "Nueva propiedad en venta", body: p ? `${p.desc[0]} Reserva tu visita en la ficha.` : "Salió una propiedad nueva. Reserva tu visita en la ficha." }, { title: "Visitas esta semana", body: `Abrimos horas de visita en ${c}. Elige la tuya en cada propiedad; ver es gratis.` }, { title: "Guía del comprador", body: "Qué papeles llevar, cuánto enganche piden y cómo se calcula la cuota estimada. Escríbenos y te la mandamos." }, { title: "Qué pasa al cerrar", body: "Los gastos del cierre se explican antes de ofertar: impuestos, título y seguro." }],
    rent: [{ title: p ? `Nueva en renta: ${p.nm[0]}`.slice(0, 60) : "Nueva unidad en renta", body: p ? `${p.desc[0]}` : "Tenemos una unidad nueva. Mira el total para mudarte en la ficha." }, { title: "Visitas esta semana", body: `Horas de visita abiertas en ${c}. Ver es gratis y el costo de mudarte está claro desde el principio.` }, { title: "Nunca pagues antes de ver", body: "Nadie cobra por ver una propiedad. Si te piden dinero antes de ver y firmar, repórtalo." }, { title: "Qué papeles piden", body: "Cada anuncio dice qué papeles piden. Pregúntanos antes de llevarlos todos." }],
    cuarto: [{ title: "Cuarto libre este mes", body: `Hay cuartos libres en ${c}. Mira lo que incluye la renta y las reglas de la casa en cada anuncio.` }, { title: "Reglas de la casa por escrito", body: "Antes de pagar nada te damos las reglas por escrito: limpieza, visitas y horarios." }, { title: "Conoce la casa", body: "La visita es gratis. La dirección exacta llega cuando confirmamos tu hora." }],
    hipo: [{ title: "Precalificación gratis", body: "Te decimos cuánto podrías pedir y la cuota estimada. Es gratis y nadie garantiza la aprobación antes de revisar tus papeles." }, { title: "Taller para compradores", body: `Clase corta sobre crédito, enganche y cierre en ${c}. Gratis y en español.` }, { title: "Qué papeles llevar", body: "Una ID, comprobantes de ingreso y tu ITIN o número de seguro social. Se entregan en la cita, nunca por mensaje." }, { title: "Tasas del mes", body: "Preguntamos a varios prestamistas y te damos las opciones lado a lado, por escrito." }],
    serv: [{ title: "Cotización por escrito", body: "Pídenos la cotización: te damos el precio total antes de empezar." }, { title: "Citas esta semana", body: `Tenemos espacios libres en ${c} esta semana. Reserva en la ficha.` }, { title: "Qué llevar a la cita", body: "Tus documentos de la propiedad, si los tienes. Si no, te decimos cómo conseguirlos." }, { title: "Atención en español", body: "Todo el trabajo y los reportes se entregan en español o en inglés, como prefieras." }],
    derechos: [{ title: "Orientación gratis", body: `Cada semana atendemos casos de vivienda en ${c}. La orientación es gratis y nadie te pregunta tu estatus.` }, { title: "Qué llevar", body: "Tu contrato, los avisos y fotos del problema. Si no los tienes, igual puedes venir." }, { title: "Taller de derechos del inquilino", body: "Charla abierta sobre depósitos, reparaciones y avisos. Gratis y en español." }, { title: "A dónde acudir", body: "Si necesitas un abogado, te decimos a dónde llamar. Nosotros no somos abogados." }],
    comercial: [{ title: p ? `Disponible: ${p.nm[0]}`.slice(0, 60) : "Espacio disponible", body: p ? `${p.desc[0]}` : "Tenemos un espacio nuevo disponible. Reserva tu visita en la ficha." }, { title: "Visitas esta semana", body: `Abrimos horas de visita en ${c}. Ver el espacio es gratis.` }, { title: "Contrato a la vista", body: "Lo que pagas al mes y el contrato completo se ven antes de firmar." }, { title: "Permisos para abrir", body: "Te orientamos con los permisos de la ciudad antes de que firmes." }],
    alm: [{ title: "Unidades libres", body: `Tenemos bodegas y espacios libres en ${c}. Ver es gratis.` }, { title: "Acceso todos los días", body: "Entras en el horario publicado, con código en tu unidad." }, { title: "Qué tamaño necesito", body: "Pregúntanos qué cabe en cada tamaño. Te ayudamos a escoger sin pagar de más." }, { title: "Pago mes a mes", body: "Pagas por mes y avisas con tiempo cuando quieras salir." }],
  }[k];
  return armarNovedades(B, [...por, ...comunes].map((x) => ({ ...x, kind: "novedad" })), r, r.int(3, 6));
}
