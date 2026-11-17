/* Grupo A · MERC · 5 subcategorías principales (sort 1–5): Bodega de la esquina · Supermercado latino · Abarrotes · Carnicería · Pescadería.
   Productos por peso y por unidad con fotos, cortes y opciones, pedidos del mercado (retener el estimado, pesar con foto, cobrar el peso real). */
import { rng, q, j, arr, bi, photoUrl, money, horario, rango } from "./comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "./negocio.mjs";
import { PRODUCTOS, GRUPOS_M, DEF_SEC, DES_DEF, FOTO_STAND } from "./merc-cat.mjs";
import { genResenas as genRes, genNovedades as genNov } from "./textos.mjs";

const SUBS = ["NEG-MERC-01", "NEG-MERC-02", "NEG-MERC-03", "NEG-MERC-04", "NEG-MERC-05"];
const ORI = ["do", "mx", "ca", "sa", "car"];
const NOMBRES = [
  ["Bodega Don Rafael", "La Bodeguita de Doña Mery", "Bodega El Vecino", "Minimarket La Esquina Feliz", "Bodega Los Hermanos Peña", "Bodega Santa Lucía", "Bodega Mi Gente", "Bodega El Tamarindo", "Colmado La Fe", "Bodega Los Tres Reyes"],
  ["Supermercado La Hispana", "Supermercado El Sol Latino", "Super Mercado Quisqueya", "Supermercado Los Compadres", "Latino Fresh Market", "Supermercado Mi Tierra", "Supermercado El Gran Mercado", "Supermercado Costa Latina", "Supermercado Los Andes", "Supermercado La Familia Unida"],
  ["Abarrotes Doña Chuy", "Abarrotes El Granero", "Abarrotes y Víveres Don Toño", "Abarrotes Santa Cruz", "Abarrotes La Despensa", "Abarrotes Los Girasoles", "Abarrotes del Pueblo", "Abarrotes El Maizal", "Abarrotes Doña Maruca", "Abarrotes La Canasta"],
  ["Carnicería La Res Dorada", "Carnicería Los Hermanos Ortiz", "Carnicería El Corral", "Carnicería y Chicharrón Don Beto", "Carnicería La Fortuna", "Carnicería El Gaucho", "Carnicería Don Chema", "Carnicería La Tradición", "Carnicería San Judas", "Carnicería El Buen Corte"],
  ["Pescadería La Marina", "Mariscos del Atlántico", "Pescadería El Pargo Rojo", "Pescadería Costa Azul", "Pescadería Doña Tita", "Pescadería El Camarón Feliz", "Pescadería Puerto Rico", "Pescadería La Langosta", "Pescadería Mar y Tierra", "Pescadería Las Palmas"],
];
const GALERIA = [
  [31498834, 39375105, 31498833, 29831547, 14349176, 17039185], [2733918, 33975355, 9705821, 12199572, 36886535, 7292901], [10284048, 4487383, 4487364, 12263158, 35431352, 14238105],
  [1968748, 20722688, 33035426, 16276491, 2676932, 618775], [8352344, 30811283, 14593042, 19789770, 8352778, 21771249],
];
const SECS = [["desp", "beb", "lacteo", "viveres", "pan", "limp"], ["carne", "viveres", "desp", "lacteo", "pan", "cong", "beb", "limp"], ["desp", "viveres", "lacteo", "beb", "limp"], ["res", "cerdo", "pollo", "chivo", "emb", "menu"], ["pescado", "marisco", "congmar", "prep", "viveres"]];
const CARNE_KEYS = ["res", "cerdo", "pollo", "chivo", "emb"];
const ORIGEN_ES = { do: "dominicanos", mx: "mexicanos", ca: "centroamericanos", sa: "sudamericanos", car: "del Caribe" };
const ORIGEN_EN = { do: "Dominican", mx: "Mexican", ca: "Central American", sa: "South American", car: "Caribbean" };
const TAM = [[34, 42], [42, 56], [32, 44], [20, 26], [20, 26]];

const HORAS = [
  () => horario({ 0: rango("08:00", "21:00"), 1: rango("07:00", "22:00"), 2: rango("07:00", "22:00"), 3: rango("07:00", "22:00"), 4: rango("07:00", "22:00"), 5: rango("07:00", "23:00"), 6: rango("07:00", "23:00") }),
  () => horario({ 0: rango("08:00", "20:00"), 1: rango("07:00", "21:00"), 2: rango("07:00", "21:00"), 3: rango("07:00", "21:00"), 4: rango("07:00", "21:00"), 5: rango("07:00", "21:30"), 6: rango("07:00", "21:30") }),
  () => horario({ 0: rango("09:00", "18:00"), 1: rango("08:00", "20:00"), 2: rango("08:00", "20:00"), 3: rango("08:00", "20:00"), 4: rango("08:00", "20:00"), 5: rango("08:00", "20:00"), 6: rango("08:00", "20:00") }),
  () => horario({ 0: rango("08:00", "15:00"), 1: rango("08:00", "19:00"), 2: rango("08:00", "19:00"), 3: rango("08:00", "19:00"), 4: rango("08:00", "19:00"), 5: rango("08:00", "19:30"), 6: rango("07:00", "19:30") }),
  () => horario({ 0: rango("09:00", "15:00"), 2: rango("08:00", "18:00"), 3: rango("08:00", "18:00"), 4: rango("08:00", "18:30"), 5: rango("08:00", "19:00"), 6: rango("07:00", "18:00") }),
];

const ABOUT = [
  (n, o, f, st, c) => bi(`${n} es la bodega del barrio en ${st} desde ${f}. ${o} atiende con lo de siempre: víveres, ${ORIGEN_ES[c]} de marca conocida, leche, pan y lo que se te olvidó para la cena. Abre todos los días.`,
    `${n} has been the neighborhood bodega on ${st} since ${f}. ${o} stocks the usual: produce, familiar ${ORIGEN_EN[c]} brands, milk, bread and whatever you forgot for dinner. Open every day.`),
  (n, o, f, st, c) => bi(`Supermercado latino en ${st} desde ${f}. ${o} y su familia surten carne fresca, frutas y víveres, panadería y productos ${ORIGEN_ES[c]}. Pesamos delante de ti y pagas el peso real; hacemos pickup y envío.`,
    `Latino supermarket on ${st} since ${f}. ${o} and family stock fresh meat, produce, bakery and ${ORIGEN_EN[c]} products. We weigh in front of you and you pay the real weight; pickup and delivery.`),
  (n, o, f, st, c) => bi(`Abarrotes en ${st} desde ${f}: granos, harinas, aceites, salsas, café y condimentos ${ORIGEN_ES[c]} al mejor precio. ${o} te los aparta si los pides por la app. Aceptamos EBT.`,
    `Grocery on ${st} since ${f}: grains, flours, oils, sauces, coffee and ${ORIGEN_EN[c]} spices at the best price. ${o} sets them aside if you order by the app. We accept EBT.`),
  (n, o, f, st, c) => bi(`Carnicería en ${st} desde ${f}. ${o} corta a tu pedido: res para bistec, cerdo, pollo y chivo; también longaniza, chorizo y chicharrón de la casa. La carne se pesa delante de ti y pagas el peso real.`,
    `Butcher shop on ${st} since ${f}. ${o} cuts to order: beef for steak, pork, chicken and goat; also house longaniza, chorizo and chicharrón. Meat is weighed in front of you and you pay the real weight.`),
  (n, o, f, st, c) => bi(`Pescadería en ${st} desde ${f}. ${o} recibe pescado y marisco fresco cada martes, jueves y sábado; lo limpiamos, escamamos o cortamos en filetes sin costo. Todo se pesa delante de ti.`,
    `Fish market on ${st} since ${f}. ${o} gets fresh fish and seafood every Tuesday, Thursday and Saturday; we clean, scale or fillet at no charge. Everything is weighed in front of you.`),
];

const FAQS = [
  (b, d) => [[bi("¿Hacen envío?", "Do you deliver?"), bi(`Sí, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}. Pedido mínimo $${(d.min / 100).toFixed(0)}. También puedes recoger.`, `Yes, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}. $${(d.min / 100).toFixed(0)} minimum. You can also pick up.`)],
    [bi("¿Aceptan EBT?", "Do you accept EBT?"), bi("Sí, en la caja del local, para los alimentos que cubre el programa.", "Yes, at the register in store, for items the program covers.")],
    [bi("¿Cómo se cobra lo que va por peso?", "How is by-weight pricing charged?"), bi("Retenemos el estimado más 10 %, pesamos tu pedido con foto y cobramos solo el peso real.", "We hold the estimate plus 10%, weigh your order with a photo and charge only the real weight.")],
    [bi("¿Qué pasa si algo no hay?", "What if something is out of stock?"), bi("Te llamamos antes de cambiarlo; si no lo quieres, se quita y no se cobra.", "We call you before swapping it; if you decline, it is removed and not charged.")],
    [bi("¿A qué hora abren?", "What time do you open?"), bi("Todos los días desde temprano; mira el horario en esta página.", "Every day from early morning; see the hours on this page.")]],
  (b, d) => [[bi("¿Tienen carnicería y panadería?", "Do you have a butcher and bakery?"), bi("Sí. La carne se corta a tu pedido y el pan sale del horno por la mañana.", "Yes. Meat is cut to order and bread comes out of the oven in the morning.")],
    [bi("¿Cuánto cuesta el envío?", "How much is delivery?"), bi(`$${(d.fee / 100).toFixed(2)} hasta ${d.zone} millas; gratis desde $${(d.free / 100).toFixed(0)}.`, `$${(d.fee / 100).toFixed(2)} up to ${d.zone} miles; free from $${(d.free / 100).toFixed(0)}.`)],
    [bi("¿Aceptan EBT?", "Do you accept EBT?"), bi("Sí, en el local.", "Yes, in store.")],
    [bi("¿Pesan delante de mí?", "Do you weigh in front of me?"), bi("Sí. Lo que va por peso se pesa con foto y pagas el peso real.", "Yes. By-weight items are weighed with a photo and you pay the real weight.")],
    [bi("¿Tienen estacionamiento?", "Do you have parking?"), bi("Sí, un lote propio frente a la tienda.", "Yes, our own lot in front of the store.")]],
  (b, d) => [[bi("¿Qué marcas manejan?", "What brands do you carry?"), bi("Las de siempre de cada país, y las pedimos si no las tenemos.", "The usual brands from each country, and we order them if we do not have them.")],
    [bi("¿Venden al por mayor?", "Do you sell wholesale?"), bi("Cajas y sacos con descuento; escríbenos con lo que necesitas.", "Cases and sacks at a discount; message us with what you need.")],
    [bi("¿Aceptan EBT?", "Do you accept EBT?"), bi("Sí, en el local.", "Yes, in store.")],
    [bi("¿Hacen envío?", "Do you deliver?"), bi(`Sí, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}.`, `Yes, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}.`)],
    [bi("¿Cómo pido?", "How do I order?"), bi("Armas el pedido en la app, lo preparamos y lo recoges o te lo llevamos.", "Build the order in the app, we prepare it and you pick up or we deliver.")]],
  (b, d) => [[bi("¿Cortan la carne a mi pedido?", "Will you cut the meat to order?"), bi("Sí: entera, en trozos, para guisar, fina para bistec o molida. Lo eliges al pedir.", "Yes: whole, in pieces, for stew, thin for steak or ground. You choose when ordering.")],
    [bi("¿Cómo pagan lo que pesa?", "How do I pay for by-weight cuts?"), bi("Retenemos el estimado más 10 %, la pesamos con foto y cobramos el peso real.", "We hold the estimate plus 10%, weigh it with a photo and charge the real weight.")],
    [bi("¿Tienen carne adobada?", "Do you have seasoned meat?"), bi("Sí, adobamos al estilo de la casa si lo pides.", "Yes, we season in the house style if you ask.")],
    [bi("¿Hacen envío?", "Do you deliver?"), bi(`Sí, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}; la carne va en hielo.`, `Yes, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}; meat travels on ice.`)],
    [bi("¿Aceptan EBT?", "Do you accept EBT?"), bi("Sí, en el local.", "Yes, in store.")]],
  (b, d) => [[bi("¿Qué días llega el pescado?", "What days does the fish arrive?"), bi("Martes, jueves y sábado por la mañana. Llámanos para saber qué llegó.", "Tuesday, Thursday and Saturday mornings. Call us to see what came in.")],
    [bi("¿Lo limpian?", "Do you clean it?"), bi("Sí, sin costo: escamado, limpio, en filetes o en postas.", "Yes, at no charge: scaled, cleaned, filleted or in steaks.")],
    [bi("¿Cómo pagan lo que pesa?", "How do I pay for by-weight items?"), bi("Retenemos el estimado más 10 %, lo pesamos con foto y cobramos el peso real.", "We hold the estimate plus 10%, weigh it with a photo and charge the real weight.")],
    [bi("¿Hacen envío?", "Do you deliver?"), bi(`Sí, hasta ${d.zone} millas por $${(d.fee / 100).toFixed(2)}; el pescado va en hielo.`, `Yes, up to ${d.zone} miles for $${(d.fee / 100).toFixed(2)}; fish travels on ice.`)],
    [bi("¿Aceptan EBT?", "Do you accept EBT?"), bi("Sí, para los alimentos que cubre el programa.", "Yes, for the items the program covers.")]],
];

const DELIV = [{ zone: 3, fee: 399, min: 2000, free: 6000, prep: 25 }, { zone: 5, fee: 499, min: 3000, free: 8000, prep: 45 }, { zone: 5, fee: 499, min: 2500, free: 7500, prep: 30 }, { zone: 5, fee: 499, min: 2500, free: 7500, prep: 30 }, { zone: 5, fee: 599, min: 3000, free: 9000, prep: 30 }];

function armarCatalogo(si, origen, r, k) {
  const sel = [];
  for (const key of SECS[si]) {
    const claves = key === "carne" ? CARNE_KEYS : [key];
    let lista = PRODUCTOS.filter((x) => claves.includes(x.key) && x.inn.includes(String(si)) && (!x.o || x.o.includes(origen) || r.chance(0.15)));
    // Un recorte por sección para que no salgan los 60 productos en cada bodega.
    const tope = si === 3 ? 7 : si === 4 ? 9 : key === "desp" ? 16 : key === "viveres" ? 12 : key === "carne" ? 14 : 6;
    lista = r.shuffle(lista).slice(0, tope).sort((a, b) => PRODUCTOS.indexOf(a) - PRODUCTOS.indexOf(b));
    if (lista.length) sel.push({ key, items: lista });
  }
  return sel;
}

export function generarMerc() {
  const negocios = [];
  let baseOps = 0;
  for (let si = 0; si < 5; si++) {
    for (let k = 0; k < 10; k++) {
      const name = NOMBRES[si][k];
      const city = ciudadDe(si, k);
      const r = rng(`merc:${name}`);
      const founded = anioFundado(r);
      const origen = ORI[(k + si) % 5];
      const disp = { ...DELIV[si] };
      const secs = armarCatalogo(si, origen, r, k);
      const n = (/* índice global */ 50 + si * 10 + k);
      const filter = ["pickup", "envio", "ebt", "efectivo", "pesa", `p:${origen}`, "estac"];
      if (r.chance(0.7)) filter.push("domingo");
      if (si === 0 || r.chance(0.3)) filter.push("noche");
      if (founded <= 2016) filter.push("y10");
      const g = GALERIA[si], fotoSet = [...g.slice(k % g.length), ...g.slice(0, k % g.length)].slice(0, 6);
      const hours = HORAS[si]();
      const bz = armar({ n, cat: "NEG-MERC", name, subs: [SUBS[si]].concat(si < 3 ? [["NEG-MERC-12", "NEG-MERC-13", "NEG-MERC-14", "NEG-MERC-15", "NEG-MERC-16"][(k + si) % 5]] : si === 3 ? ["NEG-MERC-10"].slice(0, k % 2) : ["NEG-MERC-06"].slice(0, k % 2)), city, founded,
        about: null, attrs: null, filter, mods: ["shop", "pedidos", "nov", "staff"], amenities: ["ebt-snap", "entrega-a-domicilio", ...(si === 3 ? ["carniceria"] : []), "estacionamiento", "acepta-tarjeta"], hours, photoIds: fotoSet, faqs: [],
        role: bi("Dueño", "Owner"), bio: null, team: [] });
      const own = bz.owner;
      bz.about = ABOUT[si](name, own.first, founded, bz.addr.street, origen);
      bz.owner.role = bi(["Dueño de la bodega", "Dueño del supermercado", "Dueño de abarrotes", "Dueño y carnicero", "Dueño y pescadero"][si], ["Bodega owner", "Supermarket owner", "Grocery owner", "Owner and butcher", "Owner and fishmonger"][si]);
      bz.owner.bio = bi(`${own.first} abrió el negocio en ${founded} y sigue detrás del mostrador.`, `${own.first} opened the business in ${founded} and is still behind the counter.`);
      bz.team = r.shuffle(["Marcos Peña", "Yaritza Soto", "Elvis Núñez", "Katherine Mejía", "Ramón Rosario", "Odalis Cruz"]).slice(0, r.int(1, 3)).map((nm, i) => ({ name: nm, role: bi(["Caja", "Carnicería", "Reparto", "Panadería"][i % 4], ["Register", "Butcher counter", "Delivery", "Bakery"][i % 4]), since: Math.min(2025, founded + r.int(1, 7)) }));
      bz.faqs = FAQS[si](bz, disp).map(([qq, a]) => ({ q: qq, a }));
      bz.disp = disp; bz.si = si; bz.origen = origen;
      bz.attrs = { m: "shop", weighs_in_front: true, hold_hours: 48, tarjeta: { eta: bi(`Pickup en ${disp.prep} min · envío hoy $${(disp.fee / 100).toFixed(2)}`, `Pickup in ${disp.prep} min · delivery today $${(disp.fee / 100).toFixed(2)}`) } };
      // ítems
      let sql = `  insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note)
  values (b, true, true, ${Math.min(120, disp.prep)}, true, false, true, true, false, ${disp.zone}, ${disp.fee}, ${disp.free}, ${disp.min}, ${disp.zone <= 3 ? 10 : 15}, 'team', ${j(bi("Pasa por el mostrador con tu número de pedido.", "Stop by the counter with your order number."))}) on conflict (business_id) do nothing;
  insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours) values (b, true, true, true, 'call', ${r.pick([4, 6, 8, 10])}, 48) on conflict (business_id) do nothing;
`;
      const flat = [];
      const usados = new Set();
      secs.forEach((s, ssi) => {
        const nm = s.key === "carne" ? DEF_SEC.carne : DEF_SEC[s.key];
        sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${j(bi(nm[0], nm[1]))}, ${ssi}) returning id into s;\n`;
        s.items.forEach((pr, ii) => {
          const gids = [];
          for (const gk of pr.g) {
            const gd = GRUPOS_M[gk];
            if (!usados.has(gk)) { usados.add(gk); sql += `  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${j(bi(gd.n[0], gd.n[1]))}, true, 1, ${j(gd.o.map((o) => ({ es: o[0], en: o[1], on: true, cents: o[2] })))}) returning id into gid;\n  gk := gk || jsonb_build_object(${q(gk)}, gid);\n`; }
            gids.push(gk);
          }
          const sec = DES_DEF[{ res: "carne", cerdo: "carne", pollo: "carne", chivo: "carne", emb: "carne", menu: "carne", pescado: "pesc", marisco: "pesc", congmar: "pesc", prep: "pesc", viveres: "viv", desp: "desp", lacteo: "lac", pan: "pan", cong: "cong", beb: "beb", limp: "limp" }[pr.key]] ?? ["", ""];
          const de = pr.de ?? sec[0], den = pr.den ?? sec[1];
          const price = Math.max(25, Math.round(pr.p * (0.92 + r() * 0.2) / (pr.p < 300 ? 1 : 5)) * (pr.p < 300 ? 1 : 5) - (pr.p >= 300 ? 1 : 0));
          const it = { ord: flat.length + 1, es: pr.es, en: pr.en, p: price, unit: pr.unit, g: gids, key: pr.key, ph: pr.ph, tax: pr.tax, peso: pr.unit === "lb" };
          flat.push(it);
          sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort, featured, stock_mode, sold_out)
    values (b, 'shop', s, ${j(bi(pr.es, pr.en))}, ${j(bi(de, den))}, ${price}, ${q(pr.unit)}, ${pr.tax}, array[${q(photoUrl(pr.ph))}]::text[], ${pr.unit === "lb" ? "'peso'" : "'unid'"}, ${pr.ebt}, 0, false, null, array[${gids.map((x) => `(gk->>${q(x)})::bigint`).join(", ")}]::bigint[], false, ${ii}, ${ii === 0 && r.chance(0.5)}, 'none', ${r.chance(0.03)});\n`;
        });
      });
      bz.flat = flat; bz.sqlExtra = sql;
      // novedades
      const posts = genNov(r, bz, flat, {
        oferta: "Hasta el domingo. Pídelo en la app y lo pesamos delante de ti.", hoy: (x) => `Hoy llegó ${x.es.toLowerCase()} fresco`, hoyB: "Llegó esta mañana. Hasta agotar.",
        encuesta: { t: "¿Qué quieres que traigamos?", b: "Vota y lo pedimos para la próxima semana.", o: ["Más productos de Honduras", "Más carne adobada", "Más frutas tropicales"] },
        avisoT: "cerramos temprano", cupon: { t: "Cupón de seguidores: $5 en tu pedido", b: "Para quien nos sigue: $5 de descuento en pedidos desde $30.", pref: "SEGUIR", off: 500, min: 3000 },
        nov2: [["Ya hacemos envío a tu casa", "Pide en la app y te lo llevamos el mismo día en pedidos antes del mediodía."], ["Aceptamos EBT en todo lo que cubre el programa", "Pasa por la caja con tu tarjeta."], ["Nuevo mostrador de frutas y víveres", "Más variedad cada semana."]],
        nov3: ["Gracias por 10 años juntos", "Entre nuestros clientes más fieles sorteamos una canasta de víveres."],
      });
      bz.attrs.tarjeta.offer = bi(`${posts[0].t.replace(/ hasta el domingo$/, "")} hasta el domingo`, `${flat.find((x) => x.ord === posts[0].it).en} ${money(posts[0].now)}${flat.find((x) => x.ord === posts[0].it).peso ? "/lb" : ""} through Sunday`);
      const fp = flat.find((x) => x.peso);
      if (fp) bz.attrs.tarjeta.fee = bi(`${fp.es} ${money(fp.p)}/lb · la pesan delante de ti`, `${fp.en} ${money(fp.p)}/lb · weighed in front of you`);
      // pedidos
      const nOps = r.int(...[[60, 150], [90, 220], [50, 130], [70, 170], [50, 120]][si]);
      const ops = genOrdenes(r, bz, flat, disp, nOps, baseOps);
      baseOps += ops.length + 5;
      const nRev = Math.min(80, Math.max(20, Math.round(ops.filter((o) => o.st === "done").length * r.pick([0.24, 0.3, 0.38]))));
      const reviews = genRes(r, ops, nRev, {
        vale: (o) => o.st === "done", srcDe: (o) => (o.mo === "d" ? "dl" : "pk"), recDe: (o) => o.L.slice(0, 2).map((x) => x[0]), nombreDe: (o) => { const x = flat[o.L[0][0] - 1]; return { es: x.es, en: x.en }; },
        resp: (rr, s) => (s >= 5 ? { trato: 1, fresco: 1, estante: 1, sust: rr.pick(["ok", "na"]) } : s === 4 ? { trato: 1, fresco: rr.pick([1, 0]), estante: 1, sust: "na" } : s === 3 ? { trato: 0, fresco: 0, estante: rr.pick([1, 0]), sust: rr.pick(["na", "ok"]) } : { trato: -1, fresco: -1, estante: 0, sust: rr.pick(["no", "na"]) }),
        hechos: (rr, s, o) => (o.mo === "d" ? { late: s >= 4 ? rr.int(-10, 5) : rr.int(10, 40) } : null),
        es: { 5: ["{d} siempre fresco y pesado delante de uno. {x}", "Buen precio en {d} y atención de confianza. {x}", "Pedí {d} por la app y estaba tal como lo pedí. {x}", "Aquí consigo {d} como en mi tierra. {x}", "Me pesaron {d} con foto y cobraron el peso real. {x}"],
          4: ["Buen {d}, aunque tardaron un poco en armar el pedido. {x}", "Todo bien con {d}; los precios están justos. {x}", "Fresco el {d} y buena atención. {x}"], 3: ["El {d} estaba bien pero la fila en la caja fue larga. {x}", "Faltó una parte del pedido y me avisaron tarde. {x}"], 2: ["El {d} no estaba tan fresco como esperaba. {x}", "Demoraron mucho el pedido y llegó incompleto. {x}"],
          x5: ["Los recomiendo.", "Ya somos clientes de años.", "Buena atención.", "Gracias por todo.", "Vuelvo cada semana."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
        en: { 5: ["Always fresh {d}, weighed right in front of you. {x}", "Great price on {d} and trusted service. {x}", "I ordered {d} in the app and it was exactly as asked. {x}", "I find {d} here just like back home. {x}"],
          4: ["Good {d}, though the order took a while to assemble. {x}", "Fresh {d} and friendly service. {x}"], 3: ["The {d} was fine but the register line was long. {x}", "Part of my order was missing and they told me late. {x}"], 2: ["The {d} was not as fresh as I expected. {x}", "The order took forever and arrived incomplete. {x}"],
          x5: ["Highly recommend.", "Customers for years.", "Friendly staff.", "Thank you for everything."], x3: ["Hope they improve.", "I will give them another chance."] },
        rEs5: ["Gracias por tu reseña. Aquí te esperamos.", "Un gusto atenderte. Vuelve pronto.", "Gracias por tu confianza; se la paso al equipo."], rEs3: ["Gracias por avisarnos. Ya lo estamos corrigiendo; escríbenos y lo arreglamos en tu próximo pedido.", "Lamentamos la demora. Tomamos nota para mejorar la caja y el armado de pedidos."],
        rEn5: ["Thank you for your review. See you soon.", "Our pleasure. Come back soon."], rEn3: ["Thank you for telling us. We are fixing it; message us and we will make it right on your next order."],
      });
      bz.hist = { ops, reviews, posts };
      negocios.push(bz);
    }
  }
  return negocios;
}

function genOrdenes(r, b, flat, disp, nOps, base) {
  const maxD = maxDiasDe(b.founded);
  const wsum = flat.map((it) => ({ it, w: (it.key === "res" || it.key === "pollo" || it.key === "pescado" || it.key === "viveres" || it.key === "desp" ? 2 : 1) * (it.p < 800 ? 1.5 : 1) }));
  const tot = wsum.reduce((s, x) => s + x.w, 0);
  const pick = () => { let u = r() * tot; for (const x of wsum) { u -= x.w; if (u <= 0) return x.it; } return wsum[0].it; };
  const ops = [];
  const reg = Array.from({ length: 40 }, () => r.int(0, 246));
  const FOTO_PESO = { res: 618775, cerdo: 2676932, pollo: 13524831, chivo: 6733517, emb: 1927385, menu: 20722688, pescado: 8352778, marisco: 21771249, viveres: 30893342, congmar: 14593042, prep: 21771249, lacteo: 33815578 };
  const MALOS = [["cancelled", "user", "Cambié de planes."], ["cancelled", "business", "No teníamos lo principal del pedido."], ["declined", null, null], ["expired", null, null]];
  for (let k = 0; k < nOps; k++) {
    let d = k < 20 ? r.int(0, 29) : dias(r, maxD), h, t = 0;
    while (t++ < 14) { const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7; h = b.hours[wd]; if (h.open) break; d += 1; }
    const rg = h.ranges[0].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(rg[0] + 30, Math.max(rg[0] + 31, rg[1] - 90));
    const u = r.chance(0.5) ? r.pick(reg) : r.int(0, 246);
    const delivery = r.chance(0.4);
    const nL = r.int(2, 6), L = [], usados = new Set();
    let sub = 0, subEst = 0, pesoEst = 0;
    for (let l = 0; l < nL; l++) {
      const it = pick();
      if (usados.has(it.ord)) continue;
      usados.add(it.ord);
      const opts = it.g.map((gk) => ({ g: { es: "", en: "" }, o: { es: "", en: "" }, gk }));
      const ops2 = it.g.map((gk) => { const gd = flatG(gk); const o = r.pick(gd.o); return { g: { es: gd.n[0], en: gd.n[1] }, o: { es: o[0], en: o[1] } }; });
      void opts;
      if (it.peso) {
        const west = r.pick([1, 1.5, 2, 2, 2.5, 3, 4, 5]);
        const wfin = Math.round(west * (0.9 + r() * 0.2) * 100) / 100;
        const fin = Math.round(it.p * wfin), est = Math.round(it.p * west);
        L.push([it.ord, 1, it.p, it.tax, ops2, west, wfin, fin, "ok", photoUrl(FOTO_PESO[it.key] ?? 618775)]);
        sub += fin; subEst += est; pesoEst += est;
      } else {
        const qty = r.pick([1, 1, 1, 2, 2, 3, 4]);
        L.push([it.ord, qty, it.p, it.tax, ops2, null, null, qty * it.p, "ok", null]);
        sub += qty * it.p; subEst += qty * it.p;
      }
    }
    if (!L.length) continue;
    const dlv = delivery ? (sub >= disp.free ? 0 : disp.fee) : 0;
    const est = subEst + Math.round(pesoEst * 0.1) + dlv;
    const bad = r.chance(0.06) ? r.pick(MALOS) : null;
    const pm = r.chance(d < 500 ? 0.62 : 0.35) ? "a" : "l";
    const op = { q: base + k, n: `M-${5000000 + base + k}`, d, m, u, mo: delivery ? "d" : "p", pm: delivery ? "a" : pm, st: bad ? bad[0] : "done", sub, dlv, tot: sub + dlv, est, L };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (bad) { op.L = L.map((x) => [x[0], x[1], x[2], x[3], x[4], x[5], null, null, "ok", null]); op.tot = subEst + dlv; op.sub = subEst; }
    if (delivery) op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St", "Main St"])}`, apt: r.chance(0.3) ? `Apt ${r.int(1, 12)}` : null, zip: b.addr.zip, mi: +(r.int(3, disp.zone * 10) / 10).toFixed(1) }, window_end: "18:30" };
    else op.det = { address: b.addr.text, window_end: "17:30" };
    if (op.pm === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  for (let k = 0; k < r.int(1, 3); k++) {
    const it = pick(), idx = ops.length;
    const qty = it.peso ? 1 : r.int(1, 3), west = it.peso ? r.pick([2, 3]) : null;
    const subE = it.peso ? Math.round(it.p * west) : it.p * qty;
    ops.push({ q: base + idx, n: `M-${5000000 + base + idx}`, d: 0, m: 720, fut: r.int(120, 1800), u: r.int(0, 246), mo: "p", pm: "a", st: "confirmed", sub: subE, dlv: 0, tot: subE, est: Math.round(subE * 1.1), br: "visa", l4: "4242",
      L: [[it.ord, qty, it.p, it.tax, [], west, null, subE, "ok", null]], det: { address: b.addr.text, window_end: "17:30" } });
  }
  return ops;
}
const flatG = (gk) => GRUPOS_M[gk];
