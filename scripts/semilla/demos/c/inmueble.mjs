/* Bienes Raíces (NEG-INMUEBLE) · las 5 principales = las primeras 5 por orden del catálogo:
   01 Agente inmobiliario · 02 Agente bilingüe · 03 Agente del comprador · 04 Agente del vendedor · 05 Casas en venta.
   Todas son del tipo «venta» (lib/inmuebles-comun.ts › KS_INM) y además publican algún alquiler. Anuncios con precio, cuota ESTIMADA (misma fórmula de lib/inmuebles.ts),
   «Para mudarte» en las rentas, horas de visita y copy que pasa vivienda justa (se revisa aquí con la misma lista de frases). */
import { Rng, q, J, TA, BI, redondea, px, diaDeVida, money, CIUDADES, lugar, fotosDeSubs, frenada, PROT } from "./base.mjs";
import { elegirClientes } from "./nucleo.mjs";
import { armarNovedades } from "./textos.mjs";

export const CAT = "NEG-INMUEBLE";
export const RUBRO = "inm";
export const SUBS = [
  { id: "NEG-INMUEBLE-01", es: "Agente inmobiliario", en: "Real estate agent", otras: ["NEG-INMUEBLE-05", "NEG-INMUEBLE-03", "NEG-INMUEBLE-04"],
    negocios: ["Bienes Raíces Hazleton Hogar", "Allentown Realty Latino", "Agentes del Valle Wyoming", "Inmobiliaria Lackawanna", "Reading Bienes Raíces Plus", "Casa Segura Bienes Raíces", "Lehigh Valley Propiedades", "Agente Don Mario Realty", "Inmuebles del Norte Scranton", "Berks Propiedades Latinas"] },
  { id: "NEG-INMUEBLE-02", es: "Agente bilingüe", en: "Bilingual realtor", otras: ["NEG-INMUEBLE-01", "NEG-INMUEBLE-03", "NEG-INMUEBLE-05"],
    negocios: ["Realtor Bilingüe Hazleton", "Agente Bilingüe Allentown", "Bilingüe Realty Wilkes-Barre", "Su Casa Bilingüe Scranton", "Realtor en Español Reading", "Hablamos Su Idioma Realty", "Allentown en Español Propiedades", "Wyoming Bilingüe Inmuebles", "Casa Fácil Bilingüe", "Berks en Español Realty"] },
  { id: "NEG-INMUEBLE-03", es: "Agente del comprador", en: "Buyer's agent", otras: ["NEG-INMUEBLE-05", "NEG-INMUEBLE-01", "NEG-INMUEBLE-02"],
    negocios: ["Compradores Primero Hazleton", "Agente del Comprador Allentown", "Su Primera Casa Wilkes-Barre", "Compra con Confianza Scranton", "Comprador Seguro Reading", "Primera Casa ITIN Hazleton", "Lehigh Compradores Realty", "Wyoming Valley Compradores", "Casa Propia Scranton Compradores", "Berks Primer Hogar"] },
  { id: "NEG-INMUEBLE-04", es: "Agente del vendedor", en: "Seller's agent", otras: ["NEG-INMUEBLE-01", "NEG-INMUEBLE-05"],
    negocios: ["Vendedores del Valle Hazleton", "Vende Tu Casa Allentown", "Agente Vendedor Wilkes-Barre", "Listados Lackawanna", "Vendemos Su Casa Reading", "Vende Seguro Hazleton", "Lehigh Listados Realty", "Venta Rápida Wyoming", "Casa en Venta Scranton Agentes", "Berks Vendedores"] },
  { id: "NEG-INMUEBLE-05", es: "Casas en venta", en: "Homes for sale", otras: ["NEG-INMUEBLE-01", "NEG-INMUEBLE-06", "NEG-INMUEBLE-03"],
    negocios: ["Casas en Venta Hazleton Centro", "Casas Allentown Selectas", "Casas Wilkes-Barre Hoy", "Casas Scranton del Norte", "Casas en Venta Reading Sur", "Hogares en Venta Hazleton", "Casas del Lehigh", "Casas del Wyoming Valley", "Casas Lackawanna Selectas", "Casas Berks en Venta"] },
];

const ENGANCHES = [3.5, 5, 10, 15, 20];
export const cuotaEstimada = (precio, pct) => { const prestamo = precio * (1 - pct / 100), r = 0.0675 / 12, pi = (prestamo * r) / (1 - Math.pow(1 + r, -360)); return Math.round((pi + (precio * 0.025) / 12) / 100) * 100; };
const usd = (c) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const PRECIO = { hzl: [115000, 235000], alw: [175000, 330000], wbr: [85000, 195000], scr: [95000, 235000], rdg: [105000, 225000] };
const FOTO = { casa: ["8469940", "7937330", "8963083", "27938317"], condo: ["33258708", "27938317"], apto: ["19239905", "31424880", "9308434", "7045354"], cuarto: ["37369025", "34574611"], terreno: ["8148346", "7489107"], rural: ["8583638"], movil: ["7937280"], multi: ["7937684", "7937733", "8963083"] };
const PAPELES = [BI("2 recibos de pago o carta del trabajo y una ID de cualquier país.", "2 pay stubs or a work letter and an ID from any country."), BI("Carta del trabajo y una ID de cualquier país.", "A work letter and an ID from any country."), BI("Recibos de pago de los últimos 2 meses y una ID.", "Pay stubs from the last 2 months and an ID.")];
const NOTAS_V = [
  ["Cocina con gabinetes nuevos, piso de madera y patio cercado.", "Kitchen with new cabinets, hardwood floors and a fenced yard."], ["Sótano seco y sin terminar; techo y calentador cambiados hace pocos años.", "Dry unfinished basement; roof and water heater replaced a few years ago."],
  ["Cerca del centro, del hospital y de las escuelas. Calle tranquila.", "Close to downtown, the hospital and the schools. Quiet street."], ["Baño remodelado, ventanas nuevas y parqueo para dos carros.", "Remodeled bath, new windows and parking for two cars."],
  ["Lista para mudarte: pintura reciente y electricidad al día.", "Move-in ready: recent paint and up-to-date electrical."], ["Porche al frente, jardín atrás y garaje de un carro.", "Front porch, back garden and a one-car garage."],
];
const NOTAS_R = [["Calefacción incluida y lavandería en el edificio.", "Heat included and laundry in the building."], ["Cerca de la parada del autobús y de tiendas.", "Close to the bus stop and shops."], ["Pintura nueva y pisos en buen estado.", "Fresh paint and floors in good condition."], ["Parqueo en la calle y entrada propia.", "Street parking and a private entrance."]];
const VIS = [[{ dow: 4, min: 1020 }, { dow: 5, min: 1080 }, { dow: 6, min: 660 }], [{ dow: 2, min: 1080 }, { dow: 4, min: 1080 }, { dow: 6, min: 600 }], [{ dow: 6, min: 600 }, { dow: 6, min: 840 }, { dow: 0, min: 780 }], [{ dow: 1, min: 1020 }, { dow: 3, min: 1020 }, { dow: 6, min: 660 }]];

function mkProp(B, r, i, fotos, estadoForzado) {
  const ciudad = B.city, [lo, hi] = PRECIO[ciudad];
  const rentar = i >= 100;
  const L = lugar(ciudad, r), addr = `${L.num} ${L.calle}`;
  let kind, beds, baths, sqft, price = null, rent = null, deposit = 0, appFee = 0, fees = [], pct = null, name, nota, util = [], laundry = "no", parking = false, pets = false, furnished = false, s8 = false, ssn = false, papers = null, lease = null, avail = null, sold = false;
  if (!rentar) {
    kind = r.weighted([["venta_casa", 0.5], ["condo", 0.14], ["multi", 0.1], ["obra", 0.06], ["terreno", 0.07], ["rural", 0.05], ["movil", 0.08]]);
    beds = kind === "terreno" ? null : kind === "multi" ? r.int(4, 8) : kind === "movil" ? r.int(2, 3) : r.int(2, 5);
    baths = kind === "terreno" ? null : r.pick([1, 1.5, 2, 2.5, 3]);
    sqft = kind === "terreno" ? null : kind === "multi" ? r.int(2000, 3200) : kind === "movil" ? r.int(900, 1300) : r.int(900, 2300);
    const base = lo + (hi - lo) * r.next();
    price = redondea(kind === "terreno" ? base * 0.28 * 100 : kind === "movil" ? base * 0.32 * 100 : kind === "obra" ? (base * 1.35) * 100 : kind === "multi" ? base * 1.4 * 100 : kind === "rural" ? base * 1.5 * 100 : kind === "condo" ? base * 0.78 * 100 : base * 100, 100000) ;
    if (price < 100000) price = 100000;
    pct = ["venta_casa", "condo", "obra", "multi", "rural", "movil"].includes(kind) ? r.pick(ENGANCHES) : null;
    const T = { venta_casa: [`Casa ${beds} cuartos · ${addr}`, `${beds} bed home · ${addr}`], condo: [`Townhouse ${beds} cuartos · ${addr}`, `${beds} bed townhouse · ${addr}`], multi: [`Multifamiliar · ${addr}`, `Multifamily · ${addr}`], obra: [`Obra nueva ${beds} cuartos · ${addr}`, `New build ${beds} bed · ${addr}`], terreno: [`Terreno · ${addr}`, `Land · ${addr}`], rural: [`Propiedad rural · ${addr}`, `Rural property · ${addr}`], movil: [`Casa móvil ${beds} cuartos · ${addr}`, `${beds} bed mobile home · ${addr}`] }[kind];
    name = T; nota = r.pick(NOTAS_V);
  } else {
    kind = r.weighted([["apto", 0.5], ["casa", 0.28], ["cuarto", 0.22]]);
    beds = kind === "cuarto" ? 1 : kind === "apto" ? r.int(1, 3) : r.int(2, 4); baths = kind === "casa" ? r.pick([1, 1.5, 2]) : 1; sqft = kind === "cuarto" ? null : kind === "apto" ? r.int(550, 1050) : r.int(950, 1600);
    rent = kind === "cuarto" ? redondea(r.int(450, 650) * 100, 2500) : kind === "apto" ? redondea((600 + beds * 230 + r.int(-60, 120)) * 100, 2500) : redondea((900 + beds * 270 + r.int(-80, 150)) * 100, 2500);
    deposit = r.pick([rent, rent, Math.round(rent / 2 / 100) * 100, Math.min(rent * 2, rent + 20000)]);
    deposit = Math.min(deposit, rent * 2);
    appFee = r.pick([0, 0, 2500, 3500]); if (r.chance(0.2)) fees = [{ label: BI("Último mes", "Last month"), cents: rent }];
    util = r.some(["agua", "basura", "calefaccion", "luz", "internet"], r.int(0, 3));
    laundry = kind === "casa" ? "unidad" : r.pick(["no", "edificio", "edificio"]); parking = kind !== "cuarto" && r.chance(0.7); pets = r.chance(0.35); furnished = kind === "cuarto" && r.chance(0.7); s8 = kind !== "cuarto" && r.chance(0.4);
    papers = r.pick(PAPELES); lease = kind === "cuarto" ? BI("Mes a mes", "Month to month") : r.pick([BI("12 meses", "12 months"), BI("12 meses", "12 months"), BI("6 o 12 meses", "6 or 12 months")]);
    const T = { apto: [`${beds === 1 ? "Apartamento 1 cuarto" : `Apartamento ${beds} cuartos`} · ${addr}`, `${beds} bed apartment · ${addr}`], casa: [`Casa ${beds} cuartos en renta · ${addr}`, `${beds} bed house for rent · ${addr}`], cuarto: [furnished ? "Cuarto amueblado" : "Cuarto con baño compartido", furnished ? "Furnished room" : "Room with shared bath"] }[kind];
    name = T; nota = r.pick(NOTAS_R);
  }
  const ph = (FOTO[kind === "venta_casa" ? "casa" : kind === "obra" ? "casa" : kind] ?? FOTO.casa);
  const moveIn = rent != null && kind !== "salon" ? rent + deposit + appFee + fees.reduce((s, f) => s + f.cents, 0) : null;
  const cuota = price != null && pct ? cuotaEstimada(price, pct) : null;
  const solo = kind === "cuarto";
  const zip = L.zip;
  let desc;
  if (price != null) {
    desc = [`${usd(price)}. ${nota[0]}${cuota ? ` Cuota estimada con ${String(pct).replace(/\.0$/, "")} % de enganche: ${usd(cuota)} al mes con impuestos y seguro.` : ""}`, `${usd(price)}. ${nota[1]}${cuota ? ` Estimated payment with ${pct}% down: ${usd(cuota)} a month with taxes and insurance.` : ""}`];
  } else {
    desc = [`${usd(rent)} al mes. ${nota[0]} Para mudarte: ${usd(rent)} + depósito ${usd(deposit)}${appFee ? ` + solicitud ${usd(appFee)}` : ""}${fees.length ? ` + último mes ${usd(rent)}` : ""} = ${usd(moveIn)}.`, `${usd(rent)} a month. ${nota[1]} To move in: ${usd(rent)} + ${usd(deposit)} deposit${appFee ? ` + ${usd(appFee)} application` : ""}${fees.length ? ` + last month ${usd(rent)}` : ""} = ${usd(moveIn)}.`];
  }
  const nm = [name[0].slice(0, 60), name[1].slice(0, 60)];
  const bad = frenada(nm[0], nm[1], desc[0], desc[1], papers?.es, papers?.en, lease?.es, lease?.en);
  if (bad || PROT.test(desc.join(" ")) || PROT.test(nm.join(" "))) throw new Error(`copy no pasa vivienda justa: ${bad} :: ${desc[0]}`);
  return { kind, deal: rentar ? "renta" : "venta", beds, baths, sqft, price, rent, deposit, appFee, fees, moveIn, cuota, pct, nm, desc, papers, lease, util, laundry, parking, pets, furnished, s8, ssn, avail, addr, zip, lat: L.lat, lng: L.lng, soloZona: solo, foto: r.pick(ph), vis: r.pick(VIS), cupo: r.pick([1, 1, 2, 3]), estado: "available", sold };
}

function itemProp(B, p, i, estado, statusD) {
  const attrs = { visit_pattern: p.vis.map((v) => ({ ...v, on: true })), cupo: p.cupo };
  const vals = ["it", "b", "x.city_id", q(p.kind), p.beds ?? "null", p.baths ?? "null", p.sqft ?? "null", p.rent ?? "null", p.price ?? "null", p.deposit, p.appFee, J(p.fees), p.moveIn ?? "null", p.cuota ?? "null", p.pct ?? "null", p.rent != null && estado === "available" ? "(now() at time zone 'America/New_York')::date" : "null", p.furnished, p.pets, TA(p.util), p.parking, q(p.laundry), p.s8, p.ssn, p.papers ? J(p.papers) : "null", p.lease ? J(p.lease) : "null", "false", q("none"), q(p.addr), q(p.zip), `st_setsrid(st_point(${p.lng}, ${p.lat}), 4326)::geography`, p.soloZona ? "false" : "true", q(estado), statusD == null ? "now()" : `pg_temp.c_ts(${statusD}, 800)`];
  return {
    m: "svc", es: p.nm[0], en: p.nm[1], des: p.desc[0], den: p.desc[1], price: p.rent ?? p.price, dur: 30, kind: p.deal, attrs, fotos: [px(p.foto)], sort: i, ret: true,
    after: `insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, app_fee_cents, fees, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status, status_at)
  select ${vals.join(", ")} from businesses x where x.id = b;`,
  };
}

export function planInm(B) {
  const r = new Rng(B.seed + ":plan"), sub = SUBS.find((s) => s.id === B.sub), ciudad = CIUDADES[B.city];
  const subs = [B.sub, ...r.some(sub.otras, r.int(1, 2))];
  const fotos = fotosDeSubs(subs, CAT), gal = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  const props = [];
  const nVenta = r.int(4, 8), nRenta = r.int(1, 3), nVend = r.int(8, 22), nRent = r.int(3, 9);
  for (let i = 0; i < nVenta; i++) props.push({ ...mkProp(B, r, i, fotos), estado: i === 2 && r.chance(0.4) ? "pending" : "available", d: null });
  for (let i = 0; i < nRenta; i++) props.push({ ...mkProp(B, r, 100 + i, fotos), estado: "available", d: null });
  for (let i = 0; i < nVend; i++) props.push({ ...mkProp(B, r, 200 + i, fotos), estado: "sold", d: -r.int(10, Math.max(30, (2026 - B.founded) * 330)) });
  for (let i = 0; i < nRent; i++) props.push({ ...mkProp(B, r, 300 + i, fotos), estado: "rented", d: -r.int(10, Math.max(30, (2026 - B.founded) * 330)) });
  // los vendidos son ventas y los rentados son rentas
  for (const p of props.filter((x) => x.estado === "sold")) if (p.deal !== "venta") { const q2 = mkProp(B, r, 0, fotos); Object.assign(p, q2, { estado: "sold", d: p.d }); }
  for (const p of props.filter((x) => x.estado === "rented")) if (p.deal !== "renta") { const q2 = mkProp(B, r, 100, fotos); Object.assign(p, q2, { estado: "rented", d: p.d }); }
  const sueltos = props.map((p, i) => itemProp(B, p, i, p.estado, p.d));
  const V = props.filter((p) => p.estado === "available" || p.estado === "pending"), R = V.filter((p) => p.deal === "renta"), S = V.filter((p) => p.deal === "venta");
  const itin = sub.id !== "NEG-INMUEBLE-04" ? r.chance(0.75) : r.chance(0.4), sinCom = ["NEG-INMUEBLE-02", "NEG-INMUEBLE-03", "NEG-INMUEBLE-05"].includes(B.sub) && r.chance(0.5);
  const minDown = r.pick([3.5, 10, 10, 15, 20]), prequal = r.pick([1, 2, 2, 3, 5]), s8 = R.some((p) => p.s8), pets = R.some((p) => p.pets);
  const servs = [];
  const fSrv = px(fotos[0] ?? "7642122");
  servs.push({ m: "svc", es: "Consulta gratis para primer comprador", en: "Free first-time buyer consultation", des: "Te explicamos paso a paso cómo comprar, qué papeles llevar y qué programas ayudan con el enganche.", den: "We explain step by step how to buy, which papers to bring and which programs help with the down payment.", price: 0, dur: 60, attrs: {}, fotos: [fSrv], sort: 90 });
  if (["NEG-INMUEBLE-04", "NEG-INMUEBLE-01", "NEG-INMUEBLE-05"].includes(B.sub) || r.chance(0.4)) servs.push({ m: "svc", es: "Vende tu casa · análisis de precio", en: "Sell your home · price analysis", des: "Análisis de precio por escrito, gratis y sin compromiso. Te decimos en cuánto se vende y en cuánto tiempo.", den: "A written price analysis, free and with no commitment. We tell you what it should sell for and how long it takes.", price: 0, dur: 60, attrs: {}, fotos: [fSrv], sort: 91 });
  if (itin || r.chance(0.5)) servs.push({ m: "svc", es: "Precalificación con ITIN", en: "ITIN pre-qualification", des: "Gratis. Te ponemos con un prestamista que trabaje con ITIN. Nadie puede garantizar la aprobación antes de revisar tus papeles.", den: "Free. We connect you with a lender who works with ITIN. No one can guarantee approval before reviewing your papers.", price: 0, dur: 45, attrs: {}, fotos: [fSrv], sort: 92 });
  const secciones = [{ es: "Servicios", en: "Services", sort: 0, items: servs }];
  const settings = [`insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, soft_pull, buyer_no_commission, free_from, util, furnished) values (b, ${q(B.city)}, null, ${itin}, ${s8}, ${pets}, ${minDown}, ${prequal}, ${r.chance(0.4)}, ${sinCom}, null, false, ${R.some((p) => p.furnished)}) on conflict (business_id) do nothing;`];
  const F = new Set();
  if (R.length) F.add("rentar"); if (S.length || true) F.add("comprar");
  const Rv = R.filter((p) => p.kind !== "local");
  const sinSsn = Rv.length ? Rv.some((p) => !p.ssn) : false;
  if (sinSsn) F.add("sinssn"); if (sinSsn || itin) F.add("itin");
  if (Rv.length ? Rv.some((p) => p.s8) : s8) F.add("s8"); if (Rv.length ? Rv.some((p) => p.pets) : pets) F.add("mascotas");
  if (Rv.some((p) => p.util.length)) F.add("utilidades"); if (V.some((p) => p.furnished)) F.add("amueblado");
  if (R.some((p) => p.kind === "cuarto")) F.add("cuarto");
  if (sinCom) F.add("nocom");
  F.add("visita"); F.add("esp"); if (B.founded <= 2016) F.add("y10");
  const eta = BI(`${S.length} ${S.length === 1 ? "casa en venta" : "casas en venta"}`, `${S.length} ${S.length === 1 ? "home for sale" : "homes for sale"}`);
  const minP = Math.min(...S.map((p) => p.price ?? Infinity));
  const feeT = S.length ? BI(`Desde ${usd(minP)}${sinCom ? " · comprador sin comisión" : ""}`, `From ${usd(minP)}${sinCom ? " · no buyer commission" : ""}`) : null;
  const tarjeta = { eta, ...(feeT ? { fee: feeT } : {}) };
  const R5 = (a, b) => [[`${String(a).padStart(2, "0")}:00`, `${String(b).padStart(2, "0")}:00`]];
  const lv = r.pick([R5(9, 18), R5(9, 17), R5(10, 18)]), sab = r.pick([R5(9, 15), R5(10, 14), R5(9, 13)]);
  const semana = [r.chance(0.25) ? R5(12, 16) : null, lv, lv, lv, lv, lv, sab];
  const H = ["Edwin", "Jorge", "Víctor", "Ángel", "Samuel", "Gabriel", "Darío"], M = ["Yanira", "Sonia", "Lourdes", "Idalia", "Carolina", "Evelyn", "Wendy", "Ivelisse"], AP = ["Rodríguez", "Martínez", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Núñez", "Vargas", "Méndez", "Ortiz", "Rosario", "Mejía"];
  const bio = r.pick([BI(`Compré mi primera casa con ITIN en 2009 y por eso sé qué preguntas hacer. Ver una casa contigo es gratis y el costo de mudarte, claro desde el principio.`, `I bought my first home with an ITIN in 2009, so I know which questions to ask. Viewing a home with me is free and the cost to move in is clear from the start.`), BI(`Trabajo en español y en inglés. Te enseño la casa, te explico la cuota estimada y los gastos del cierre antes de que ofertes.`, `I work in Spanish and English. I show you the home and explain the estimated payment and closing costs before you make an offer.`), BI(`Llevo desde ${B.founded} ayudando a vecinos del valle a comprar y a vender. Mi trabajo es que entiendas cada papel que firmas.`, `Since ${B.founded} I have helped neighbors across the valley buy and sell. My job is that you understand every paper you sign.`)]);
  const team = [{ name: `${B.owner.nombre} ${B.owner.ap}`, role: BI("Agente de bienes raíces y dueño", "Real estate agent and owner"), since: B.founded, langs: ["es", "en"], bio, bookings: true },
    { name: `${r.pick(H)} ${r.pick(AP)}`, role: BI("Agente", "Agent"), since: r.int(B.founded + 1, 2023), langs: ["es", "en"], bio: null, bookings: true },
    { name: `${r.pick(M)} ${r.pick(AP)}`, role: BI("Coordinación de visitas", "Showing coordinator"), since: r.int(B.founded + 1, 2024), langs: ["es"], bio: null, bookings: false }];
  const c = ciudad.nombre;
  const about = BI(`${sub.es === "Casas en venta" ? "Casas en venta" : sub.es} en ${c} desde ${B.founded}. Ver una casa es gratis; el precio, la cuota estimada y lo que pagas al cerrar se dicen antes de firmar.${itin ? " Trabajamos con compradores con ITIN." : ""}${sinCom ? " El comprador no paga comisión." : ""} Hablamos español e inglés.`,
    `${sub.en} in ${c} since ${B.founded}. Viewing a home is free; the price, estimated payment and closing costs are stated before you sign.${itin ? " We work with ITIN buyers." : ""}${sinCom ? " The buyer pays no commission." : ""} We speak Spanish and English.`);
  const plan = {
    subs, galeria: gal, secciones, sueltos, settings, about, attrs: { m: "shop", inm_der: ["eta", ...(feeT ? ["fee"] : [])], tarjeta }, filtros: [...F], amenities: ["sin-cita", "acepta-tarjeta", "estacionamiento", ...(itin ? ["acepta-itin"] : []), ...(s8 ? ["section-8"] : []), ...(pets ? ["mascotas"] : [])],
    langs: ["es", "en"], modulos: ["svc", "staff", "nov"], semana, team, deCasa: false, operation: "local", svcModel: "emp", stripe: false,
    faqs: faqsInm(B, itin, sinCom, minDown, prequal, c), props, ds: { itin, sinCom }, tienda: [], renta: [], licencias: ["pa_corredor"],
  };
  plan.posts = novedadesInm(B, plan, r);
  return plan;
}
function faqsInm(B, itin, sinCom, minDown, prequal, c) {
  return [
    ["¿Cobran por ver una propiedad?", "Do you charge to see a property?", "No. Ver una propiedad es gratis. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "No. Viewing a property is free. Never pay a deposit before seeing the property and signing the lease."],
    ["¿Puedo comprar con ITIN?", "Can I buy with an ITIN?", itin ? `Sí. Trabajamos con prestamistas que aceptan ITIN. Suelen pedir un enganche desde ${String(minDown).replace(/\.0$/, "")} %. Nadie garantiza la aprobación antes de revisar tus papeles.` : "Te orientamos con prestamistas que atienden a compradores con distintos papeles. Nadie garantiza la aprobación antes de revisar tus papeles.", itin ? `Yes. We work with lenders that accept ITIN. They usually ask for a down payment from ${minDown}%. No one guarantees approval before reviewing your papers.` : "We point you to lenders that serve buyers with different papers. No one guarantees approval before reviewing your papers."],
    ["¿Qué significa «cuota estimada»?", "What does “estimated payment” mean?", "Es el pago mensual aproximado con impuestos y seguro, según el enganche que elijas. La cuota real depende del préstamo que te aprueben.", "It is the approximate monthly payment with taxes and insurance, based on the down payment you choose. The real payment depends on the loan you are approved for."],
    ["¿Cuánto tiempo tarda la precalificación?", "How long does pre-qualification take?", `Normalmente ${prequal} ${prequal === 1 ? "día" : "días"} hábiles. Es gratis.`, `Usually ${prequal} business ${prequal === 1 ? "day" : "days"}. It is free.`],
    ["¿Cómo reservo una visita?", "How do I book a showing?", "En cada propiedad eliges una hora libre y nos llega al instante. Si no puedes ir, cancela desde la app para liberar el horario.", "On each property you pick a free time and it reaches us instantly. If you cannot make it, cancel from the app to free up the slot."],
    [sinCom ? "¿El comprador paga comisión?" : "¿Quién paga la comisión?", sinCom ? "Does the buyer pay a commission?" : "Who pays the commission?", sinCom ? "En las casas que listamos nosotros, el comprador no paga comisión." : "Lo hablamos por escrito antes de firmar nada, para que sepas exactamente cuánto es y quién lo paga.", sinCom ? "On the homes we list, the buyer pays no commission." : "We discuss it in writing before you sign anything, so you know exactly how much it is and who pays it."],
    ["¿Atienden en español?", "Do you work in Spanish?", `Sí, todo el equipo atiende en español e inglés en ${c}.`, `Yes, the whole team works in Spanish and English in ${c}.`],
  ];
}
function novedadesInm(B, plan, r) {
  const p = plan.props.find((x) => x.estado === "available" && x.deal === "venta"), c = CIUDADES[B.city].nombre;
  const L = [
    { title: p ? `Nueva en venta: ${p.nm[0]}`.slice(0, 60) : "Nueva casa en venta", body: p ? `${p.desc[0]} Reserva tu visita en la ficha.` : "Salió una casa nueva a la venta. Reserva tu visita en la ficha." },
    { title: "Visitas esta semana", body: `Abrimos horas de visita jueves, viernes y sábado en ${c}. Elige la tuya en la ficha de cada propiedad; ver una casa es gratis.` },
    { title: "Guía del primer comprador", body: "Qué papeles llevar, cuánto enganche piden y cómo se calcula la cuota estimada. Escríbenos y te mandamos la guía en español." },
    { title: "Vendida en pocas semanas", body: "Gracias a la familia que confió en nosotros para vender su casa. Fotos buenas, precio claro y buena comunicación." },
    { title: "Precio al día", body: "¿Quieres saber en cuánto se vende tu casa? Te hacemos el análisis de precio por escrito, gratis y sin compromiso." },
    { title: "Qué pasa al cerrar", body: "Los gastos del cierre se explican antes de ofertar: impuestos, título y seguro. Nada fuera de lo que te dijimos." },
    { title: "Rentas disponibles", body: "Tenemos apartamentos y casas en renta. Cada anuncio dice renta, depósito y qué papeles piden. Nunca pagues antes de ver y firmar." },
    { title: "Horario de feriados", body: "En los feriados atendemos solo por mensaje. Las visitas vuelven al día siguiente." },
    { title: "Gracias por las reseñas", body: "Cada reseña verificada nos ayuda. Gracias a todos los que visitaron una casa con nosotros este año." },
    { title: "Mercado del mes", body: `En ${c} hay más casas listadas que el mes pasado. Si estás pensando en comprar, es buen momento para precalificar.` },
  ];
  return armarNovedades(B, L.map((x) => ({ ...x, kind: "novedad" })), r, r.int(5, 9));
}

/* ── Historia: visitas a propiedades ── */
export function historiaInm(B, plan, ctx) {
  const r = new Rng(B.seed + ":hist"), N = Math.max(40, Math.round(80 * B.size)), U = r.int(3, 7);
  const filas = [], eventos = [], clientes = elegirClientes(B, r, N + U + 15);
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const todos = [...dias.map((d) => ({ d, up: false })), ...Array.from({ length: U }, () => ({ d: r.int(1, 12), up: true })).sort((a, b) => a.d - b.d)];
  let n = 0;
  for (const { d, up } of todos) {
    const c = clientes[n++ % clientes.length], p = r.pick(up ? plan.props.filter((x) => x.estado === "available" || x.estado === "pending") : plan.props);
    const st = up ? r.weighted([["confirmed", 0.75], ["pending", 0.25]]) : r.weighted([["done", 0.62], ["done_noshow", 0.1], ["cancelled", 0.14], ["cancelled_gone", 0.05], ["expired", 0.09]]);
    const num = `D-34${String(ctx.contador.d = (ctx.contador.d ?? 0) + 1).padStart(5, "0")}`, vp = p.vis[r.int(0, p.vis.length - 1)], mm = vp.min;
    const sentD = up ? -r.int(1, 3) : d - r.int(0, 3), sentM = r.int(8, 21) * 60 + r.pick([0, 20, 40]);
    const det = { demo: "c", cat: CAT, rubro: "inm", what: "visita", min: mm, sms: true, kind: p.kind, zip: p.zip, ciudad: CIUDADES[B.city].nombre, item: { es: p.nm[0], en: p.nm[1] }, sub: { es: p.beds != null ? `${p.beds} ${p.beds === 1 ? "recámara" : "recámaras"} · ${p.baths} ${p.baths === 1 ? "baño" : "baños"}` : "Terreno", en: p.beds != null ? `${p.beds} bed · ${p.baths} bath` : "Land" }, fees: p.fees, papers: p.papers, ssn_req: p.ssn, at_home: false, solo_zona: p.soloZona, rent_cents: p.rent, deposit_cents: p.rent != null ? p.deposit : 0, app_fee_cents: p.appFee, move_in_cents: p.moveIn, price_cents: p.price, est_cuota_cents: p.cuota, est_down_pct: p.pct, trade_in: null, puerta: null, bhph: null, est_payment: null };
    const o = { num, kind: "visit", city: B.city, biz: B.id, ph: c.tel, mem: null, st: st === "done_noshow" ? "done" : st === "cancelled_gone" ? "cancelled" : st, sd: st === "done" ? "done" : st === "done_noshow" ? "noshow" : st === "cancelled_gone" ? (p.deal === "renta" ? "rentada" : "vendida") : st === "expired" ? "sin_respuesta" : null,
      d, m: mm, dur: null, det, sub: 0, tot: 0, pm: "none", ps: null, party: 1, sentD, sentM, ansD: st === "pending" || st === "expired" ? null : sentD, ansM: sentM + r.int(1, 40), _p: p, _c: c, _it: { es: p.nm[0], en: p.nm[1] }, _up: up, mode: null };
    if (st === "done" || st === "done_noshow") { o.doneD = d; o.doneM = mm + (st === "done" ? r.int(25, 60) : 20); }
    if (st === "cancelled" || st === "cancelled_gone") { o.cancD = d; o.cancM = Math.max(480, mm - r.int(60, 600)); o.cby = st === "cancelled_gone" ? "system" : "user"; o.creason = st === "cancelled_gone" ? null : r.pick(["Cambié de planes", "Ya encontré otra", "No me da el horario", "Prefiero esperar"]); }
    filas.push(o);
    eventos.push({ num, kind: "vis_sent", actor: "user", d: sentD, m: sentM });
    if (o.ansD != null) eventos.push({ num, kind: "vis_ok", actor: "member", d: o.ansD, m: o.ansM });
    if (st === "done") eventos.push({ num, kind: "vis_done", actor: "member", d, m: o.doneM });
    if (st === "done_noshow") eventos.push({ num, kind: "vis_noshow", actor: "member", d, m: o.doneM });
    if (st === "expired") eventos.push({ num, kind: "vis_exp", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") eventos.push({ num, kind: "cancelled", actor: "user", d, m: o.cancM });
    if (st === "cancelled_gone") eventos.push({ num, kind: "vis_listing_gone", actor: "member", d, m: o.cancM });
  }
  return { filas, eventos, clientes };
}

const ok3 = (s) => (s >= 4 ? 1 : s === 3 ? 0 : -1), ok2 = (s) => (s >= 4 ? 1 : 0), okm = (s) => (s >= 4 ? 1 : -1);
export const CONFIG = {
  archivo: "demo-c-inmueble.sql", titulo: "Inmueble (10 negocios en cada una de: Agente inmobiliario, Agente bilingüe, Agente del comprador, Agente del vendedor, Casas en venta)",
  mod: { CAT, SUBS, RUBRO }, idx: 150, tipo: "inm", plan: planInm, hist: historiaInm,
  resenas: () => ({
    src: "cita", terminada: (f) => f.kind === "visit" && f.st === "done" && f.sd === "done",
    respuestas: (f, s) => ({ trato: ok3(s), mudarOk: okm(s), verGratis: ok2(s), fotosOk: ok2(s), llegaron: s >= 4 ? "a" : s === 3 ? "b" : "c", claro: okm(s) }),
    hechos: (f) => ({ dia: new Date(Date.UTC(2026, 10, 17) + f.d * 86400000).toISOString().slice(0, 10), que: "visita", tot: f.det.move_in_cents ?? f.det.price_cents ?? 0 }),
  }),
  extras: (B, plan) => ({
    sql: [`insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral unnest(${TA(plan.licencias)}) with ordinality o(k, n) join license_kinds k on k.key = o.k
 where b.id = ${q(B.id)} and not exists (select 1 from licenses l where l.business_id = b.id and l.kind = k.key);`],
    cuenta: { propiedades: plan.props.length, vendidas: plan.props.filter((p) => p.estado === "sold").length, rentadas: plan.props.filter((p) => p.estado === "rented").length },
  }),
  final: (ids) => `update operations o set details = o.details || jsonb_build_object('dia', (o.scheduled_at at time zone 'America/New_York')::date::text)
 where o.details->>'demo' = 'c' and o.details->>'cat' = 'NEG-INMUEBLE' and not (o.details ? 'dia');
update operations o set details = o.details || jsonb_build_object('item_id', i.id::text)
  from items i where o.details->>'demo' = 'c' and o.details->>'cat' = 'NEG-INMUEBLE' and not (o.details ? 'item_id') and i.business_id = o.business_id and i.module = 'svc' and i.name->>'es' = o.details#>>'{item,es}';
select licencias_refrescar(id) from unnest(${TA(ids)}) id;`,
};
